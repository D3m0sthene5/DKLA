#!/usr/bin/env python3
"""Check correction integrity against effective content; never certify legal truth.

The assembler validates every exact-value brief overlay in order. This additional
check ties the review register to final rendered values, follows later replacements,
and validates review links. No source files or bytecode caches are written.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def key(step):
    return step.get("id") or step.get("sup") or step.get("event")


def one(items, description):
    if len(items) != 1:
        raise ValueError(f"{description}: expected one target, found {len(items)}")
    return items[0]


def pointer(document, path):
    if not isinstance(path, str) or not path.startswith("/"):
        raise ValueError("expected an absolute JSON pointer")
    for token in path[1:].split("/"):
        token = token.replace("~1", "/").replace("~0", "~")
        document = document[int(token)] if isinstance(document, list) else document[token]
    return document


def safe_https(url):
    if not isinstance(url, str) or re.search(r"[\s\\\x00-\x1f\x7f]", url):
        return False
    try:
        parts = urlsplit(url)
        return bool(parts.scheme == "https" and parts.hostname and not parts.username
                    and not parts.password and parts.port in (None, 443))
    except ValueError:
        return False


def metadata_checks(document, location, errors):
    if isinstance(document, dict):
        for name, value in document.items():
            where = f"{location}/{name}"
            # This integrity check must never silently add a full-reading claim.
            # Fresh primary/date metadata is not evidence of substantive or full review.
            if re.search(r"fresh.*(?:full|complete.*opinion)", name, re.I) and value is not False:
                errors.append(f"{where}: a fresh full-review flag needs a separate evidence review")
            if name in ("sources", "reviewSources"):
                if not isinstance(value, list):
                    errors.append(f"{where}: sources must be an array")
                else:
                    for index, source in enumerate(value):
                        if not isinstance(source, dict) or not safe_https(source.get("url")):
                            errors.append(f"{where}/{index}: unsafe or missing HTTPS source URL")
            metadata_checks(value, where, errors)
    elif isinstance(document, list):
        for index, value in enumerate(document):
            metadata_checks(value, f"{location}/{index}", errors)


def identity(edit):
    target = edit.get("target")
    if target == "effectiveBrief":
        return (target, edit["id"], edit["field"])
    if target == "takeaway":
        return (target, edit["id"], "text")
    if target == "chronology":
        return (target, edit.get("key", edit.get("id")), edit["field"])
    if edit.get("file") == "tools/r19/data/timelines.json":
        return ("timeline", edit["timelineId"], edit.get("stepKey"), edit["field"])
    if edit.get("file") == "tools/v28/case-chronologies.json" and "pointer" in edit:
        return ("pointer", edit["file"], edit["pointer"])
    raise ValueError(f"unknown correction target: {target or edit.get('file')}")


def run(ledger_path):
    register = read(ledger_path)
    edits = register.get("edits")
    if not isinstance(edits, list) or not edits:
        raise ValueError("correction register needs a nonempty edits array")
    spec = importlib.util.spec_from_file_location("audit_assemble", ROOT / "tools/r19/assemble.py")
    assemble = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(assemble)
    data, full = assemble.build_data()
    timelines = read("tools/r19/data/timelines.json")
    chronologies = data["chronologies"]
    overlay = read("tools/v28/plain-language.json")
    # Use the actual assembly path. takeawayEdits below is review metadata,
    # not a runtime overlay: simulating it would conceal an unchanged raw seed.
    source = assemble.read_source().decode("utf-8")
    graph = json.loads(assemble.script_blocks(source)["seedData"])
    takeaways = assemble.load_takeaways({node["id"]: node for node in graph["nodes"]})
    errors = []
    for name, document in ((str(ledger_path), register), ("timelines", timelines),
                           ("chronologies", chronologies), ("plain-language", overlay)):
        metadata_checks(document, name, errors)

    def resolve(edit, target):
        if target[0] == "effectiveBrief":
            _, cid, field = target
            if field == "full":
                return full[cid]
            if field == "rule":
                return data["sections"][cid]["rule"]
            return data["sections"][cid]["sections"][field]
        if target[0] == "takeaway":
            return takeaways[target[1]]
        if target[0] == "chronology":
            step = one([s for t in chronologies for s in t["steps"] if key(s) == target[1]], str(target))
            return step.get(target[2])
        if target[0] == "timeline":
            line = one([t for t in timelines["timelines"] if t["id"] == target[1]], str(target))
            item = line if target[2] is None else one([s for s in line["steps"] if key(s) == target[2]], str(target))
            return item.get(target[3])
        return pointer(chronologies, target[2])

    identities = [identity(e) for e in edits]
    for index, (edit, target) in enumerate(zip(edits, identities)):
        label = f"edit {index + 1} {target}"
        try:
            if "old" not in edit or "new" not in edit:
                raise ValueError("missing old/new values")
            current = resolve(edit, target)
            expected = edit["new"]
            if target[0] == "effectiveBrief":
                if not isinstance(expected, str) or not isinstance(edit["old"], str):
                    raise ValueError("brief replacements must contain text")
                # Follow later edits to this same field, including edits enclosing
                # the earlier insertion. Do not demand an obsolete intermediate value.
                later = [e for e, t in zip(edits[index + 1:], identities[index + 1:]) if t == target]
                for change in later:
                    old, new = change["old"], change["new"]
                    if expected and old:
                        if old in expected:
                            expected = expected.replace(old, new)
                        elif expected in old:
                            expected = new
                if expected and expected not in current:
                    raise ValueError("final replacement text is absent from effective content")
                # Match the complete removed substring, never fragments/words which
                # may legitimately occur elsewhere or within the replacement itself.
                old = edit["old"]
                reintroduced = old and any(old in e["new"] for e in later)
                if old and old not in edit["new"] and not reintroduced and old in current:
                    raise ValueError("complete removed text remains in effective content")
            else:
                # Exact fields can be superseded by subsequent reviewed corrections.
                for change, other in zip(edits[index + 1:], identities[index + 1:]):
                    if other == target:
                        expected = change["new"]
                if current != expected:
                    raise ValueError("final target differs from the registered correction")
        except (KeyError, IndexError, TypeError, ValueError) as error:
            errors.append(f"{label}: {error}")
    if errors:
        print("Content correction integrity FAILED:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1
    print(f"Content correction integrity passed: {len(edits)} corrections; effective briefs, "
          "takeaways, timelines, chronologies, and review-source URLs checked.")
    print("Integrity only: this does not certify legal accuracy, completeness, or fresh full-opinion review.")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ledger", default="tools/content-audit/2026-11-17-corrections.json")
    args = parser.parse_args()
    try:
        return run(Path(args.ledger))
    except (KeyError, IndexError, TypeError, ValueError, OSError) as error:
        print(f"Content correction integrity FAILED: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
