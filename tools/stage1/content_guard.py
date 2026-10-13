"""Byte inventories of every original tracked file and every embedded script.

No assembler, network access, content rewriting, or visitor-data access.
"""
import argparse
import hashlib
import json
import re
import subprocess
import contextlib
import io
from types import SimpleNamespace
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PRODUCTION = "abb6aa459d66abef07104883d5d38d77fe7496e8"
SCRIPT = re.compile(rb"<script\b([^>]*)>(.*?)</script\s*>", re.I | re.S)
MODULE = re.compile(rb"/\* ===== ([^\r\n]+?) ===== \*/\r?\n")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def scripts(data):
    result = []
    for index, match in enumerate(SCRIPT.finditer(data)):
        attrs, body = match.groups()
        ident = re.search(rb'\bid\s*=\s*[\"\x27]([^\"\x27]+)', attrs, re.I)
        kind = re.search(rb'\btype\s*=\s*[\"\x27]([^\"\x27]+)', attrs, re.I)
        result.append({"index": index, "id": ident[1].decode() if ident else None,
                       "type": kind[1].decode() if kind else "javascript",
                       "bytes": len(body), "sha256": sha(body)})
    return result


def snapshot(args):
    commit = subprocess.check_output(["git", "rev-parse", args.commit], cwd=ROOT, text=True).strip()
    tree = subprocess.check_output(["git", "ls-tree", "-rz", commit], cwd=ROOT)
    records = []
    process = subprocess.Popen(["git", "cat-file", "--batch"], cwd=ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    try:
        for item in tree.split(b"\0"):
            if not item:
                continue
            header, filename = item.split(b"\t", 1)
            mode, kind, oid = header.split()
            if kind != b"blob":
                raise ValueError("Non-blob tracked path requires explicit handling: " + filename.decode())
            name = filename.decode("utf8")
            process.stdin.write(oid + b"\n")
            process.stdin.flush()
            response = process.stdout.readline().split()
            data = process.stdout.read(int(response[2]))
            assert process.stdout.read(1) == b"\n"
            path = ROOT / name
            current = path.read_bytes() if path.is_file() else None
            record = {"path": name, "gitBlob": oid.decode(), "gitBytes": len(data), "gitSha256": sha(data),
                      "checkoutSha256": sha(current) if current is not None else None,
                      "checkoutBytes": len(current) if current is not None else None}
            if name.lower().endswith(".html"):
                record["gitScripts"] = scripts(data)
                record["checkoutScripts"] = scripts(current) if current is not None else []
            records.append(record)
    finally:
        process.stdin.close()
        process.wait()
    output = {"schema": 1, "commit": commit, "scope": "Every Git-tracked original blob, including all content and datasets; SHA-256 of exact Git and checkout bytes.", "files": records}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + "\n", encoding="utf8")
    print(json.dumps({"manifest": str(args.output), "commit": commit, "files": len(records),
                      "embeddedScripts": sum(len(r.get("gitScripts", [])) for r in records)}))


def verify(args):
    manifest = json.loads(args.manifest.read_text(encoding="utf8"))
    allowed = set(args.allow)
    if any(not p.endswith((".js", ".css")) for p in allowed):
        raise ValueError("Only explicitly approved JS/CSS visual source files may be exempted")
    canonical = set(args.canonical)
    configs = set(args.allow_config) | set(args.allow_build_source)
    generated = {"DKLA-v2.5.html", "index.html", "sw.js", "version.json", "tools/r19/integrity.json", "assets/admin/catalog.js"} if args.allow_build_outputs else set()
    script_check = None
    if generated:
        stream = io.StringIO()
        with contextlib.redirect_stdout(stream):
            try:
                compare_html(SimpleNamespace(manifest=args.manifest, original="DKLA-v2.5.html", baseline_source="git", baseline_html=None,
                                             candidate=ROOT / "DKLA-v2.5.html", allow_module=args.allow_module, allow_release_build=args.allow_release_build, allow_saved_work=args.allow_saved_work))
            except SystemExit:
                pass
        script_check = json.loads(stream.getvalue())
    changes, approved, canonical_restored, build_changes, config_changes = [], [], [], [], []
    for record in manifest["files"]:
        path = ROOT / record["path"]
        digest = sha(path.read_bytes()) if path.is_file() else None
        if digest != record["checkoutSha256"]:
            # A fresh LF checkout may differ from the first Windows checkout.
            # Accept exact original Git bytes, never normalized approximations.
            if digest == record["gitSha256"]:
                canonical_restored.append(record["path"])
                continue
            if record["path"] in generated:
                build_changes.append({"path": record["path"], "sha256": digest})
                continue
            if record["path"] in configs:
                config_changes.append({"path": record["path"], "sha256": digest})
                continue
            (approved if record["path"] in allowed else changes).append(record["path"])
    result = {"pass": not changes and (script_check is None or script_check["pass"]), "productionCommit": manifest["commit"], "checked": len(manifest["files"]),
              "unexpectedChanges": changes, "approvedVisualSourceChanges": approved,
              "originalGitByteMatchesInsteadOfCheckout": canonical_restored,
              "approvedGeneratedOutputs": build_changes, "approvedBuildConfiguration": config_changes, "mandatoryEmbeddedScriptCheck": script_check,
              "note": "New files are outside the original inventory; review git status separately."}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(result, indent=2) + "\n", encoding="utf8")
    print(json.dumps(result))
    raise SystemExit(0 if result["pass"] else 1)


def compare_html(args):
    manifest = json.loads(args.manifest.read_text(encoding="utf8"))
    original = next(r for r in manifest["files"] if r["path"] == args.original)
    if args.baseline_source == "git":
        baseline = subprocess.check_output(["git", "cat-file", "blob", original["gitBlob"]], cwd=ROOT)
        assert sha(baseline) == original["gitSha256"]
    else:
        if not args.baseline_html:
            raise ValueError("Checkout comparison requires --baseline-html with the frozen original HTML")
        baseline = args.baseline_html.read_bytes()
        assert sha(baseline) == original["checkoutSha256"], "Baseline file does not match frozen original bytes"
    candidate = args.candidate.read_bytes()
    before, after = scripts(baseline), scripts(candidate)
    candidate_script_count = len(after)
    before_bodies = [m[2] for m in SCRIPT.finditer(baseline)]
    after_bodies = [m[2] for m in SCRIPT.finditer(candidate)]
    additive_script = None
    if getattr(args, 'allow_saved_work', False):
        added = [i for i, s in enumerate(after) if s['id'] == 'dklaSavedWork']
        expected = (ROOT / 'tools/v25/saved-work.js').read_text(encoding='utf-8').encode('utf-8')
        app_index = next((i for i, s in enumerate(after) if s['id'] == 'appCode'), -1)
        if len(added) != 1 or added[0] + 1 != app_index or after_bodies[added[0]] != expected:
            raise ValueError('Expected exactly the approved saved-work source immediately before appCode')
        i = added[0]
        additive_script = {'id': after[i]['id'], 'sha256': after[i]['sha256'], 'source': 'tools/v25/saved-work.js'}
        after.pop(i); after_bodies.pop(i)
    allowed = set(args.allow_module)
    if any(not p.endswith(".js") for p in allowed):
        raise ValueError("Script exemptions must name exact approved JavaScript module paths")
    def redact(body):
        markers = list(MODULE.finditer(body))
        chunks, previous = [], 0
        for i, marker in enumerate(markers):
            if marker[1].decode() not in allowed:
                continue
            end = markers[i + 1].start() if i + 1 < len(markers) else len(body)
            chunks.extend([body[previous:marker.end()], b"<explicitly approved module body>\n"])
            previous = end
        return b"".join(chunks) + body[previous:]
    missing, approved_changes, build_metadata = [], [], []
    if [(s["id"], s["type"]) for s in before] != [(s["id"], s["type"]) for s in after]:
        missing.append({"error": "Script identity, type, order, or count changed"})
    else:
        for a, b, body_a, body_b in zip(before, after, before_bodies, after_bodies):
            if a["sha256"] == b["sha256"]:
                continue
            if args.allow_release_build and a["id"] == "dklaR19Data":
                # An explicit metadata-only exception; do not reserialize the
                # dataset or normalize whitespace anywhere in it.
                data_a, data_b = json.loads(body_a), json.loads(body_b)
                old, new = data_a.get("build"), data_b.get("build")
                old_token = json.dumps(old).encode()
                new_token = json.dumps(new).encode()
                pattern = rb'("build"\s*:\s*)' + re.escape(old_token)
                changed, count = re.subn(pattern, lambda m: m[1] + new_token, body_a)
                if count == 1 and changed == body_b and isinstance(old, str) and isinstance(new, str):
                    build_metadata.append({"id": a["id"], "before": old, "after": new})
                    continue
            if a["type"] == "javascript" and redact(body_a) == redact(body_b):
                approved_changes.append(a["id"])
            else:
                missing.append({"id": a["id"], "index": a["index"], "originalSha256": a["sha256"], "candidateSha256": b["sha256"]})
    result = {"pass": not missing, "original": args.original, "candidate": str(args.candidate),
              "baselineSource": args.baseline_source, "originalScripts": len(before), "candidateScripts": candidate_script_count,
              "approvedModules": sorted(allowed), "scriptsWithOnlyApprovedModuleChanges": approved_changes, "missingOrChanged": missing}
    result["explicitReleaseBuildMetadataChanges"] = build_metadata
    result["explicitAdditiveSavedWorkScript"] = additive_script
    print(json.dumps(result))
    raise SystemExit(0 if result["pass"] else 1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    snap = commands.add_parser("snapshot")
    snap.add_argument("--commit", default=PRODUCTION)
    snap.add_argument("--output", required=True, type=Path)
    snap.set_defaults(run=snapshot)
    check = commands.add_parser("verify")
    check.add_argument("--manifest", required=True, type=Path)
    check.add_argument("--allow", action="append", default=[], help="Exact approved visual JS/CSS source path; repeat as needed")
    check.add_argument("--report", type=Path)
    check.add_argument("--canonical", action="append", default=[], help="Exact path explicitly restored to its original canonical Git bytes")
    check.add_argument("--allow-config", choices=["package.json", "vercel.json"], action="append", default=[])
    check.add_argument("--allow-build-source", choices=["tools/r19/assemble.py", "tools/r19/check.py", "tools/v25/runtime-manifest.json"], action="append", default=[])
    check.add_argument("--allow-build-outputs", action="store_true", help="Permit only the fixed generated release outputs, with mandatory embedded script comparison")
    check.add_argument("--allow-module", action="append", default=[])
    check.add_argument("--allow-release-build", action="store_true")
    check.add_argument("--allow-saved-work", action="store_true")
    check.set_defaults(run=verify)
    html = commands.add_parser("compare-html")
    html.add_argument("--manifest", required=True, type=Path)
    html.add_argument("--original", default="DKLA-v2.5.html")
    html.add_argument("--candidate", required=True, type=Path)
    html.add_argument("--baseline-source", choices=["git", "checkout"], default="git")
    html.add_argument("--baseline-html", type=Path)
    html.add_argument("--allow-module", action="append", default=[])
    html.add_argument("--allow-release-build", action="store_true", help="Explicitly permit only the dklaR19Data top-level build metadata token to change")
    html.add_argument("--allow-saved-work", action="store_true", help="Explicitly permit the exact saved-work adapter source immediately before appCode")
    html.set_defaults(run=compare_html)
    options = parser.parse_args()
    options.run(options)
