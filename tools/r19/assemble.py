"""Build DKLA-r19.html from the published r18 artifact.

r19 adds Codex's audited briefs. Every r18 block is preserved byte for byte; everything is appended:
  dklaR19Data   map of atlas cases to briefs, the converted six sections, review status, supporting cases
  dklaR19Full   the complete text of every audited brief
  dklaR19Styles, dklaR19Briefs

Inputs live in tools/r19/data (written by snapshot.py and merge_conv.py); the step is re-runnable:
take a new snapshot, convert what changed, rebuild.

Run after tools/r18/assemble.py: python3 tools/r19/assemble.py
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARTS = Path(__file__).resolve().parent
DATA = PARTS / "data"
SOURCE = ROOT / "DKLA-r18.html"
TARGET = ROOT / "DKLA-r19.html"
EXPECTED_R18 = "e7eef411223e0184c0dabff5ff57cf6854baba92e4992b701e085aaf00c94509"
VERSION = "r19"
LABEL = "r19.1"
COURSES = ["Contracts", "Civil Procedure", "Legislation and the Regulatory State"]
KEYS = ["Parties", "Procedural History", "Material Facts", "Issue", "Holding", "Reasoning"]
CHANGELOG_R191 = {
    "v": "r19.1",
    "date": "2026-10-05",
    "text": "Supporting cases now have the six sections too (1,072 of 1,076; four entries are not decisions and stay as full briefs). The 79 briefs Codex had not yet reviewed were audited here against the saved opinions and casebook pages: 19 needed nothing, 60 were corrected (138 corrections, mostly pinpoint pages and casebook page numbers), and each lists what changed.",
}
CHANGELOG = {
    "v": "r19",
    "date": "2026-10-05",
    "text": "Audited briefs throughout. Each mapped case now takes its six sections (Parties, Procedural History, Material Facts, Issue, Holding, Reasoning) and its rule line from the brief Codex checked against the full opinion, with the complete brief underneath as a collapsed Full brief and its review status shown. Cases the readings only mention are filed off the main route under Supporting cases in each course, searchable together.",
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def script_blocks(html: str) -> dict[str, str]:
    return dict(re.findall(r'<script[^>]*\bid="([^"]+)"[^>]*>(.*?)</script>', html, re.S))


def tidy_pdf_text(text: str) -> str:
    """Brief text recovered from a rendered PDF: rebuild headings and paragraphs from wrapped lines."""
    if re.search(r"^## ", text, re.M):
        return text  # the PDF carried the brief's own markdown; the reader joins wrapped lines
    lines = [l.strip() for l in text.splitlines()]
    furniture = re.compile(r"^(Compilation page \d+|\d+ / \d+|Page \d+|Corrected study brief.*|[A-Z][A-Z ()&.-]+ - CLASS \d+|[A-Z]+(-[A-Z0-9]+)+ · .*)$")
    lines = [l for l in lines if l and not l.startswith(("EXTRACTED FROM CURRENT PDF", "Running headers, footers")) and not furniture.match(l)]
    out: list[str] = []
    para: list[str] = []
    title = lines[0] if lines else ""

    def flush() -> None:
        if para:
            out.append(" ".join(para))
            para.clear()

    seen_title = False
    for i, line in enumerate(lines):
        if line == title:
            if not seen_title:
                seen_title = True
                out.append("# " + line)
            continue
        heading = (len(line) <= 60 and line[0].isupper() and line[-1] not in ".,;:)”\"" and not re.search(r"\d{2,}", line)
                   and len(line.split()) <= 8 and (not para or para[-1][-1:] in ".”\")"))
        if heading:
            flush()
            out.append("## " + line)
            continue
        para.append(line)
        if line[-1:] in ".”\")" and len(line) < 78:
            flush()
    flush()
    return "\n\n".join(out)


def build_data() -> tuple[dict, dict]:
    meta = json.loads((DATA / "meta.json").read_text(encoding="utf-8"))
    mapping = json.loads((DATA / "map.json").read_text(encoding="utf-8"))
    related_auto = json.loads((DATA / "related.json").read_text(encoding="utf-8"))
    conv = json.loads((DATA / "sections.json").read_text(encoding="utf-8")) if (DATA / "sections.json").is_file() else {}
    main_of = {codex: atlas for atlas, codex in mapping.items()}
    entries, full, sections = [], {}, {}
    audit_raw = json.loads((DATA / "audit.json").read_text(encoding="utf-8")) if (DATA / "audit.json").is_file() else {}
    audit, skips = {}, {}
    for m in meta["entries"]:
        corrected = DATA / "audited" / (m["id"] + ".md")
        a = audit_raw.get(m["id"])
        # A brief Claude audited and corrected is shown in its corrected form; the corrections are listed beside it.
        use_corrected = bool(a) and a.get("verdict") == "corrected" and corrected.is_file()
        text = (corrected if use_corrected else DATA / "briefs" / (m["id"] + ".md")).read_text(encoding="utf-8")
        if m["fmt"] == "pdf" and not use_corrected:
            text = tidy_pdf_text(text)
        if a:
            audit[m["id"]] = {"v": a["verdict"] if (a["verdict"] != "corrected" or use_corrected) else "clean", "c": a.get("coverage", ""), "n": a.get("notes", ""),
                              "f": [[f.get("kind", ""), f.get("where", ""), f.get("was", ""), f.get("now", "")] for f in a.get("findings", [])]}
        full[m["id"]] = text.strip()
        entries.append([m["id"], m["title"], COURSES.index(m["course"]), m["k"], m["status"], m["sha"], main_of.get(m["id"])])
    known = {m["id"]: m for m in meta["entries"]}
    for codex_id, item in conv.items():
        if codex_id not in known or item.get("sha") != known[codex_id]["sha"]:
            continue  # converted from an older version of the brief: wait for a fresh conversion
        if "skip" in item:
            skips[codex_id] = item["skip"]
            continue
        if sorted(item["sections"].keys()) != sorted(KEYS):
            raise ValueError(f"unexpected sections for {codex_id}")
        sections[codex_id] = {"rule": item["rule"], "sections": {k: item["sections"][k] for k in KEYS}}
        if item.get("rev"):
            sections[codex_id]["rev"] = item["rev"]
    return dict(version=LABEL, taken=meta["taken"], map=mapping, related=related_auto, entries=entries, sections=sections, skips=skips, audit=audit, changelog=[CHANGELOG_R191, CHANGELOG]), full


def tiles(graph: dict) -> dict:
    """A wide tile under each course cluster, clear of the centre mark and the SCOTUS History box."""
    study = graph["studyMap"]
    out = {}
    for course, block in study["courseBlocks"].items():
        zones = (study.get("courseDesign", {}).get(course, {}) or {}).get("zones", [])
        bottom = max([block["y"] + block["h"]] + [z["y"] + z["h"] for z in zones])
        left = min([block["x"]] + [z["x"] for z in zones])
        out[course] = {"x": left, "y": bottom + 320, "w": 5200, "h": 1000}
    return out


def embed_json(block_id: str, value) -> str:
    return f'<script type="application/json" id="{block_id}">' + json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + "</script>\n"


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    if digest(source_bytes) != EXPECTED_R18:
        raise ValueError("DKLA-r18.html is not the build r19 was made from; rebuild r18 or update EXPECTED_R18")
    source = source_bytes.decode("utf-8")
    old = script_blocks(source)
    graph = json.loads(old["seedData"])
    data, full = build_data()
    nodes = {n["id"]: n for n in graph["nodes"]}
    missing = [a for a in data["map"] if a not in nodes]
    if missing:
        raise ValueError(f"mapped atlas ids not in the graph: {missing[:5]}")
    data["seedUpdated"] = {a: nodes[a].get("updatedAt") for a in data["map"]}
    data["tiles"] = tiles(graph)
    js = (PARTS / "briefs.js").read_text(encoding="utf-8")
    css = (PARTS / "briefs.css").read_text(encoding="utf-8")
    if "</script" in js.lower():
        raise ValueError("briefs.js would close its script tag")
    sw_template = (PARTS / "sw.template.js").read_text(encoding="utf-8")
    build = VERSION + "-" + digest("\n".join([EXPECTED_R18, json.dumps(data, sort_keys=True), json.dumps(full, sort_keys=True), js, css, sw_template]).encode("utf-8"))[:10]
    data["build"] = build

    addition = "\n<!-- DKLA r19: audited briefs, full briefs, supporting cases. -->\n"
    addition += embed_json("dklaR19Data", data) + embed_json("dklaR19Full", full)
    addition += f'<style id="dklaR19Styles">{css}</style>\n<script id="dklaR19Briefs">{js}</script>\n'
    position = source.lower().rfind("</body>")
    output = source[:position] + addition + source[position:]
    title = "<title>DKLA · r18.1 · Danny Kind Legal Atlas</title>"
    if output.count(title) != 1:
        raise ValueError("expected the r18.1 <title>")
    output = output.replace(title, "<title>DKLA · r19 · Danny Kind Legal Atlas</title>")
    new = script_blocks(output)
    if any(new.get(k) != v for k, v in old.items()):
        raise ValueError("an r18 block changed during the r19 build")
    TARGET.write_text(output, encoding="utf-8")
    (ROOT / "sw.js").write_text(sw_template.replace("__DKLA_BUILD__", build), encoding="utf-8")
    (ROOT / "version.json").write_text(json.dumps({"version": LABEL, "build": build, "file": TARGET.name}) + "\n", encoding="utf-8")
    kinds = {}
    for e in data["entries"]:
        kinds[e[3]] = kinds.get(e[3], 0) + 1
    audit = {
        "r18_sha256": EXPECTED_R18, "r19_sha256": digest(TARGET.read_bytes()), "build": build, "snapshot": data["taken"],
        "briefs": len(data["entries"]), "mapped_cases": len(data["map"]), "converted": len(data["sections"]),
        "mapped_without_conversion": sorted(a for a, c in data["map"].items() if c not in data["sections"]),
        "supporting": sum(1 for e in data["entries"] if not e[6]), "review": kinds,
        "supporting_with_sections": sum(1 for e in data["entries"] if not e[6] and e[0] in data["sections"]),
        "audited_by_claude": {v: sum(1 for a in data["audit"].values() if a["v"] == v) for v in ("clean", "corrected", "could-not-audit")},
        "preserved_script_blocks": len(old),
    }
    (PARTS / "integrity.json").write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: (v if k != "mapped_without_conversion" else len(v)) for k, v in audit.items()}, indent=1))


if __name__ == "__main__":
    main()
