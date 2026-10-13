#!/usr/bin/env python3
"""Validate the r19 build without changing any release files. Run after tools/r19/assemble.py."""
from __future__ import annotations

import base64
import hashlib
import json
import re
import runpy
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARTS = Path(__file__).resolve().parent
sys.path.insert(0, str(PARTS))
from assemble import EXPECTED_R18, KEYS, TARGET, script_blocks, load_runtime_modules  # noqa: E402

errors: list[str] = []


def require(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)


r18_bytes = (ROOT / "DKLA-r18.html").read_bytes()
require(hashlib.sha256(r18_bytes).hexdigest() == EXPECTED_R18, "DKLA-r18.html is not the build r19 was made from")
r18 = script_blocks(r18_bytes.decode("utf-8"))
html = TARGET.read_text(encoding="utf-8")
r19 = script_blocks(html)
require(all(r19.get(k) == v for k, v in r18.items()), "an r18 block differs in r19")
for ident in ("dklaR19Data", "dklaR19Full", "dklaR19Briefs", "dklaColdCallData", "dklaAuthoritiesData", "dklaWeThePeopleAsset", "dklaPracticeFilter", "dklaGeographyData"):
    require(ident in r19, f"missing block {ident}")
require('<style id="dklaR19Styles">' in html, "missing dklaR19Styles")

data = json.loads(r19["dklaR19Data"])
full = json.loads(r19["dklaR19Full"])
graph = json.loads(r18["seedData"])
nodes = {n["id"]: n for n in graph["nodes"]}
cold = json.loads(r19["dklaColdCallData"])
authorities = json.loads(r19["dklaAuthoritiesData"])
require(authorities == json.loads((ROOT / 'tools/v25/authorities.json').read_text(encoding='utf-8')), 'authorities artifact differs from source')
masthead = json.loads(r19['dklaWeThePeopleAsset'])
masthead_bytes = (ROOT / 'tools/v25/assets/we-the-people.png').read_bytes()
require(masthead['uri'] == 'data:image/png;base64,' + base64.b64encode(masthead_bytes).decode('ascii'), 'Constitution title asset differs from source')
for block, source_file in [('dklaPracticeFilter', 'practice-filter.json'), ('dklaGeographyData', 'geography.json')]:
    require(json.loads(r19[block]) == json.loads((ROOT / 'tools/v25' / source_file).read_text(encoding='utf-8')), block + ' differs from source')
expected_js, expected_css, modules = load_runtime_modules()
require(r19['dklaR19Briefs'] == expected_js, 'generated runtime differs from the ordered source manifest')
require('<style id="dklaR19Styles">' + expected_css + '</style>' in html, 'generated styles differ from source manifest')
require(r19.get('dklaSavedWork') == (ROOT / 'tools/v25/saved-work.js').read_text(encoding='utf-8'), 'saved-work adapter differs from source')
require(html.index('<script id="dklaSavedWork">') < html.index('<script id="appCode">'), 'saved-work adapter must precede original storage startup')
runpy.run_path(str(ROOT / "tools/cold-call/validate.py"))["validate"](cold, graph, full, data)
expected_cold = runpy.run_path(str(ROOT / "tools/cold-call/compile.py"))["compile_cases"](json.loads((ROOT / "tools/cold-call/cases.json").read_text()), graph, data, full)
require(cold == expected_cold, "cold-call artifact differs from source")
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
require(all(k in data for k in ("rules22", "takeaways", "timelines")), "r22 data blocks missing")
require(len(data["rules22"]["rules"]) == 6 and all(r["id"] in {s.get("id") for t in data["timelines"]["list"] for s in t["steps"]} for r in data["rules22"]["rules"]), "a rules22 entry is not a timeline step")
require(not any(s.get("event") and not s.get("link") for t in data["timelines"]["list"] for s in t["steps"]), "a timeline step opens nothing")
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
require(version.get("build") == data.get("build") and version.get("file") == TARGET.name, "version.json does not describe this build")
sw = (ROOT / "sw.js").read_text(encoding="utf-8")
require(f"const BUILD = '{data['build']}';" in sw and TARGET.name in sw, "sw.js does not serve this build")
require(TARGET.name in (ROOT / "index.html").read_text(encoding="utf-8"), "index.html does not open r19")
vercel = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
require(any(r.get("destination") == "/" + TARGET.name for r in vercel.get("rewrites", [])), "vercel.json does not serve r19 at the root")
integrity = json.loads((PARTS / "integrity.json").read_text(encoding="utf-8"))
require(integrity.get("r19_sha256") == hashlib.sha256(TARGET.read_bytes()).hexdigest(), "integrity.json does not describe the current artifact")
require(integrity.get('runtime_modules') == modules, 'module provenance or line ranges differ')

print(f"Authored Cold Call narratives: {cold['coverage']['mapCases']} map cases, {cold['coverage']['supportingCases']} supporting cases; {cold['coverage']['pendingMapCases']} required main cases missing, {cold['coverage']['pendingSupportingCases']} optional supporting entries without Cold Call")

if errors:
    print("\n".join("FAIL: " + e for e in errors))
    sys.exit(1)
print(f"r19 ok: build {data['build']}; {len(ids)} briefs; {len(data['map'])} mapped cases, {len(data['map']) - len(unconverted)} with six sections; "
      f"{sum(1 for e in data['entries'] if not e[6])} supporting; atlas cases with no brief: {unmapped}; mapped but not yet converted: {len(unconverted)}")
