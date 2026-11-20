#!/usr/bin/env python3
"""Check that every run-time map-entry edit actually applies on the saved graph.

The browser applies text edits to map entries in a fixed order: the saved graph (seedData), then the
plain-text edits (tools/r19/data/plain.json, src/features/r19/plain.js), then the content-audit
corrections (tools/r19/data/r21-audit.json, src/features/r19/audit.js). Each edit names a field and its
exact old and new value and applies only while the field still holds the old value. An edit whose old
value no longer matches at its turn is skipped without any message, so a correction can be committed,
pass every other check, and never reach a reader. This script replays that order and lists such edits.

Run from the repository root: python3 -I tools/content-audit/runtime_edits_check.py [--json]
Exit status 1 if any r21-audit node edit is skipped.
"""
import copy
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/r19"))
sys.dont_write_bytecode = True
import assemble  # noqa: E402


def swap(obj, path, old, new):
    keys = path.split(".")
    o = obj
    for k in keys[:-1]:
        o = o.get(k) if isinstance(o, dict) else None
        if not isinstance(o, dict):
            return False
    if o.get(keys[-1]) != old:
        return False
    if new is None:
        o.pop(keys[-1], None)
    else:
        o[keys[-1]] = new
    return True


def _get(obj, path):
    for k in path.split("."):
        obj = obj.get(k) if isinstance(obj, dict) else None
    return obj


def replay():
    source = assemble.read_source().decode("utf-8")
    seed = json.loads(re.search(r'<script[^>]*id="seedData"[^>]*>(.*?)</script>', source, re.S).group(1))
    nodes = {n["id"]: copy.deepcopy(n) for n in seed["nodes"]}
    # Rule entries are added to the graph before the corrections run (rules22.js, rlcc.js).
    for rel in ("tools/r19/data/rules22.json", "tools/r19/data/rlcc.json"):
        for r in json.loads((ROOT / rel).read_text(encoding="utf-8"))["rules"]:
            nodes.setdefault(r["id"], copy.deepcopy(r))
    plain = json.loads((ROOT / "tools/r19/data/plain.json").read_text(encoding="utf-8"))
    audit = json.loads((ROOT / "tools/r19/data/r21-audit.json").read_text(encoding="utf-8"))
    plain_skipped, skipped, applied = [], [], 0
    for nid, edits in plain.get("nodes", {}).items():
        for i, (p, a, b) in enumerate(edits):
            if nid in nodes and not swap(nodes[nid], p, a, b):
                plain_skipped.append((nid, i, p))
    for nid, edits in audit.get("nodes", {}).items():
        for i, (p, a, b) in enumerate(edits):
            if nid not in nodes:
                skipped.append({"id": nid, "index": i, "path": p, "why": "no such entry"})
            elif swap(nodes[nid], p, a, b):
                applied += 1
            elif _get(nodes[nid], p) == b:
                applied += 1   # the field already holds the corrected text
            else:
                cur = nodes[nid]
                for k in p.split("."):
                    cur = cur.get(k) if isinstance(cur, dict) else None
                same_old = [j for j, (q, x, _) in enumerate(edits[:i]) if q == p and x == a]
                why = ("an earlier edit to the same field starts from the same old value (edit " + str(same_old[0]) + ")"
                       if same_old else "old value does not match the field at this point (plain.json or an earlier edit changed it)")
                skipped.append({"id": nid, "index": i, "path": p, "why": why, "current": cur, "old": a, "new": b})
    return {"applied": applied, "skipped": skipped, "plainSkipped": len(plain_skipped)}


if __name__ == "__main__":
    r = replay()
    if "--json" in sys.argv:
        print(json.dumps(r, ensure_ascii=False, indent=1))
    else:
        print(f"{r['applied']} r21-audit map-entry edits apply; {len(r['skipped'])} would be skipped in the browser.")
        for s in r["skipped"]:
            print(f"  {s['id']} [{s['index']}] {s['path']}: {s['why']}")
    sys.exit(1 if r["skipped"] else 0)
