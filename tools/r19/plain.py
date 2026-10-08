"""r19.17: write data/plain.json and data/plain-sections.json, the plain-text edits.

Inputs:
  data/plain-decisions.json  sentence-level decisions made by the editing agents (PLAIN.md has their brief):
                             {kind, id, field, sentence, action: keep|delete|rewrite, text}
  RULES below                templated boilerplate that recurs hundreds of times, rewritten by rule.
Outputs (read by assemble.py):
  data/plain.json            {nodes|edges|guides|districts|regions|cindex|scopeNotes: {id: [[path, old, new]]}}
                             applied at run time by plain.js, field by field, only while the field still holds `old`
  data/plain-sections.json   {codex id: [[field, old, new]]} applied to the converted brief sections at build time

Run from the revision-19 inputs: python3 tools/r19/plain.py (reads seedData from DKLA-r18.html).
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = Path(__file__).resolve().parent / "data"


def script_block(html: str, ident: str) -> str:
    m = re.search(r'<script[^>]*\bid="' + ident + r'"[^>]*>(.*?)</script>', html, re.S)
    return m.group(1)


def drop(text: str, sentence: str, new: str) -> str:
    """Replace one sentence inside a field; a deletion takes one neighbouring space with it."""
    if new:
        return text.replace(sentence, new, 1)
    for cand in (" " + sentence, sentence + " ", sentence):
        if cand in text:
            text = text.replace(cand, "", 1)
            break
    return re.sub(r"\n{3,}", "\n\n", text).strip()


# Templated boilerplate, each a (regex, replacement) over a whole field value.
EDGE_RULES = [
    (re.compile(r"^Assignment (\d+) includes this reading or source item\. Its source note records whether the account is a complete assigned principal excerpt, an editorial discussion, a question, or a separately assigned source\.$"),
     lambda m, e: f"Part of assignment {m.group(1)}."),
    (re.compile(r"^(The syllabus lists .+ in assignment \d+\.) This connection records an assignment, not a legal proposition\.$"),
     lambda m, e: m.group(1)),
    (re.compile(r"^This problem asks the reader to test .+\. The edge identifies the issue; it does not resolve the problem\.$"),
     lambda m, e: e["label"][:1].upper() + e["label"][1:].rstrip(".") + "."),
    (re.compile(r"^The syllabus identifies this numbered assignment\. Assignment number is not an inferred class date\.$"),
     lambda m, e: re.sub(r"^opens assignment (\d+)$", r"Assignment \1 on the syllabus.", e["label"]) if re.match(r"^opens assignment \d+$", e["label"]) else "On the syllabus."),
    (re.compile(r"^The separately assigned version is on file: open it from the linked source entry, which names the page of the Selections\.$"),
     lambda m, e: "The assigned version is in the Selections; the linked entry gives the page."),
]
NODE_RULES = {
    "learning.why": [("Open the linked concept and its cases for the operation and limits described in the supplied casebook.", None)],
    "summary": [("Read the surrounding notes and questions alongside the principal cases. The complete assigned pages are preserved here.",
                 "The casebook's notes and questions around the principal cases.")],
}


def get(obj, path):
    for k in path.split("."):
        if not isinstance(obj, dict) or k not in obj:
            return None
        obj = obj[k]
    return obj


def main() -> None:
    html = (ROOT / "DKLA-r18.html").read_text(encoding="utf-8")
    graph = json.loads(script_block(html, "seedData"))
    conv = json.loads((DATA / "sections.json").read_text(encoding="utf-8"))
    decisions = json.loads((DATA / "plain-decisions.json").read_text(encoding="utf-8"))
    nodes = {n["id"]: n for n in graph["nodes"]}
    edges = {e["id"]: e for e in graph["edges"]}
    study = graph["studyMap"]
    regions = {r["id"]: r for r in study["regions"]}

    # The current value of every field an edit touches, keyed by (kind, id, path).
    current: dict[tuple, str] = {}
    original: dict[tuple, str] = {}

    def value(kind, ident, path):
        key = (kind, ident, path)
        if key not in current:
            if kind == "node":
                v = get(nodes[ident], path)
            elif kind == "edge":
                v = get(edges[ident], path)
            elif kind == "guide":
                v = get(study["guides"][ident], path)
            elif kind == "district":
                v = get(study["districts"][ident], path)
            elif kind == "region":
                v = get(regions[ident], path)
            elif kind == "cindex":
                topic, rid = ident.split("|")
                v = next(r for r in graph["courseIndex"]["topics"][topic] if r["id"] == rid).get(path)
            elif kind == "scope":
                v = graph["scopeNotes"][ident]
            elif kind == "r19":
                c = conv[ident]
                v = c["rule"] if path == "rule" else c["sections"][path.split(".", 1)[1]]
            else:
                raise ValueError(kind)
            if not isinstance(v, str):
                raise ValueError(f"{kind} {ident} {path}: not a string")
            current[key] = original[key] = v
        return current[key]

    for e in graph["edges"]:
        x = e.get("explanation") or ""
        for rx, fn in EDGE_RULES:
            m = rx.match(x)
            if m:
                value("edge", e["id"], "explanation")
                current[("edge", e["id"], "explanation")] = fn(m, e)
                break
    for n in graph["nodes"]:
        for path, rules in NODE_RULES.items():
            v = get(n, path)
            for old, new in rules:
                if v == old:
                    value("node", n["id"], path)
                    current[("node", n["id"], path)] = new

    misses = []
    for d in decisions:
        if d["action"] == "keep":
            continue
        kind = "scope" if d["kind"] == "scope" else d["kind"]
        path = d["field"]
        if kind == "scope":
            path = "text"
        if kind == "timeline":
            continue
        v = value(kind, d["id"], path)
        if d["sentence"] not in v:
            misses.append((d["kind"], d["id"], d["field"], d["sentence"][:80]))
            continue
        current[(kind, d["id"], path)] = drop(v, d["sentence"], d.get("text", "").strip() if d["action"] == "rewrite" else "")

    # Reading-list entries: "On file: Riggs v. Palmer (N.Y. 1889), class 3 reading." -> "Riggs v. Palmer (N.Y. 1889), class 3 reading."
    for n in graph["nodes"]:
        paths = ["summary", "notes"] + ["sections." + k for k in (n.get("sections") or {})]
        for path in paths:
            v = get(n, path)
            if not isinstance(v, str) or not re.search(r"(^|\n)On file: ", value("node", n["id"], path) if "On file: " in v else ""):
                continue
            current[("node", n["id"], path)] = re.sub(r"(^|\n)On file: (.)", lambda m: m.group(1) + m.group(2).upper(), current[("node", n["id"], path)])
    for did, d in study["districts"].items():
        if d.get("title") == "Assigned readings on file":
            value("district", did, "title")
            current[("district", did, "title")] = "Assigned readings"

    plain: dict = {k: {} for k in ("nodes", "edges", "guides", "districts", "regions", "cindex", "scopeNotes")}
    sections: dict = {}
    bucket = {"node": "nodes", "edge": "edges", "guide": "guides", "district": "districts", "region": "regions", "cindex": "cindex", "scope": "scopeNotes"}
    for (kind, ident, path), new in sorted(current.items()):
        old = original[(kind, ident, path)]
        if new == old:
            continue
        if kind == "r19":
            if not new:
                raise ValueError(f"{ident} {path}: an edit would empty a brief section")
            sections.setdefault(ident, []).append([path, old, new])
        else:
            plain[bucket[kind]].setdefault(ident, []).append([path, old, new])
    (DATA / "plain.json").write_text(json.dumps(plain, ensure_ascii=False, indent=0, sort_keys=True) + "\n", encoding="utf-8")
    (DATA / "plain-sections.json").write_text(json.dumps(sections, ensure_ascii=False, indent=0, sort_keys=True) + "\n", encoding="utf-8")
    counts = {k: sum(len(v) for v in plain[k].values()) for k in plain}
    print(json.dumps({"graph_fields": counts, "brief_fields": sum(len(v) for v in sections.values()), "briefs": len(sections), "misses": len(misses)}, indent=1))
    for m in misses[:20]:
        print("miss", m)


if __name__ == "__main__":
    main()
