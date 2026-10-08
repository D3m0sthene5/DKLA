#!/usr/bin/env python3
"""Validate the r19 build without changing any release files. Run after tools/r19/assemble.py."""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARTS = Path(__file__).resolve().parent
sys.path.insert(0, str(PARTS))
from assemble import EXPECTED_R18, KEYS, script_blocks  # noqa: E402

errors: list[str] = []


def require(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)


r18_bytes = (ROOT / "DKLA-r18.html").read_bytes()
require(hashlib.sha256(r18_bytes).hexdigest() == EXPECTED_R18, "DKLA-r18.html is not the build r19 was made from")
r18 = script_blocks(r18_bytes.decode("utf-8"))
html = (ROOT / "DKLA-r20.html").read_text(encoding="utf-8")
r19 = script_blocks(html)
require(all(r19.get(k) == v for k, v in r18.items()), "an r18 block differs in r19")
for ident in ("dklaR19Data", "dklaR19Full", "dklaR19Briefs"):
    require(ident in r19, f"missing block {ident}")
require('<style id="dklaR19Styles">' in html, "missing dklaR19Styles")

data = json.loads(r19["dklaR19Data"])
full = json.loads(r19["dklaR19Full"])
graph = json.loads(r18["seedData"])
nodes = {n["id"]: n for n in graph["nodes"]}
ids = [e[0] for e in data["entries"]]
require(len(ids) == len(set(ids)), "duplicate brief ids")
require(all(full.get(i, "").strip() for i in ids), "a brief has no full text")
require(all(e[3] in ("pass", "repaired", "limited", "pending") for e in data["entries"]), "unknown review class")
require(all(a in nodes and nodes[a]["kind"] == "Case" for a in data["map"]), "a mapped id is not a case in the atlas")
require(len(set(data["map"].values())) == len(data["map"]), "two atlas cases share one brief")
require(set(data["map"].values()) <= set(ids), "a mapped brief is missing")
main = {e[0]: e[6] for e in data["entries"] if e[6]}
require(main == {c: a for a, c in data["map"].items()}, "entries and map disagree about mainline cases")
for cid, conv in data["sections"].items():
    require(cid in set(ids), f"sections for unknown brief {cid}")
    require(list(conv["sections"].keys()) == KEYS, f"{cid}: sections must be {KEYS}")
    require(all(isinstance(conv["sections"][k], str) and conv["sections"][k].strip() for k in KEYS), f"{cid}: empty section")
    require(8 <= len(conv["rule"].split()) <= 48, f"{cid}: rule line length")
unconverted = sorted(a for a, c in data["map"].items() if c not in data["sections"])
cases = [n["id"] for n in graph["nodes"] if n["kind"] == "Case"]
unmapped = sorted(set(cases) - set(data["map"]))
for course, t in data["tiles"].items():
    require(all(isinstance(t[k], (int, float)) for k in "xywh"), f"bad tile for {course}")

node = shutil.which("node")
if node:
    with tempfile.TemporaryDirectory() as tmp:
        for name, src in (("dklaR19Briefs.js", r19["dklaR19Briefs"]), ("sw.js", (ROOT / "sw.js").read_text(encoding="utf-8"))):
            p = Path(tmp) / name
            p.write_text(src, encoding="utf-8")
            res = subprocess.run([node, "--check", str(p)], capture_output=True, text=True)
            require(res.returncode == 0, f"{name} does not parse: {res.stderr.strip()[:200]}")

version = json.loads((ROOT / "version.json").read_text(encoding="utf-8"))
require(version.get("build") == data.get("build") and version.get("file") == "DKLA-r20.html", "version.json does not describe this build")
sw = (ROOT / "sw.js").read_text(encoding="utf-8")
require(f"const BUILD = '{data['build']}';" in sw and "DKLA-r20.html" in sw, "sw.js does not serve this build")
require("DKLA-r20.html" in (ROOT / "index.html").read_text(encoding="utf-8"), "index.html does not open r19")
vercel = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
require(any(r.get("destination") == "/DKLA-r20.html" for r in vercel.get("rewrites", [])), "vercel.json does not serve r19 at the root")
integrity = json.loads((PARTS / "integrity.json").read_text(encoding="utf-8"))
require(integrity.get("r19_sha256") == hashlib.sha256((ROOT / "DKLA-r20.html").read_bytes()).hexdigest(), "integrity.json does not describe this DKLA-r20.html")

if errors:
    print("\n".join("FAIL: " + e for e in errors))
    sys.exit(1)
print(f"r19 ok: build {data['build']}; {len(ids)} briefs; {len(data['map'])} mapped cases, {len(data['map']) - len(unconverted)} with six sections; "
      f"{sum(1 for e in data['entries'] if not e[6])} supporting; atlas cases with no brief: {unmapped}; mapped but not yet converted: {len(unconverted)}")
