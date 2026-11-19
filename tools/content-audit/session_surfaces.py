#!/usr/bin/env python3
"""Print every authored surface that serves one Contracts class session, as a reader sees it.

Read-only. For audit workers: one file per session instead of searching thirty data files.

    python -I tools/content-audit/session_surfaces.py 11 > work/ct11-surfaces.md

Covers, for each principal case of the session (src/data/seedData corpus principalCases):
the map entry (with the October r21 run-time corrections applied), the effective brief (rule
line and six sections, after every assembler overlay), the takeaway, the Cold Call account
and its plain-English sentences, doctrine-timeline steps and their timeline summaries, case
chronology steps, flowchart nodes citing the case, rules-and-authorities entries, and the
class's lecture-note topics. Prints field paths so a correction can name its target.
"""
import importlib.util
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def one_file(folder, stem):
    hits = sorted((ROOT / folder).glob(f"*-{stem}-*.json")) or sorted((ROOT / folder).glob(f"{stem}-*.json"))
    return json.loads(hits[0].read_text(encoding="utf-8")) if hits else None


def cites(obj, cid):
    if isinstance(obj, dict):
        return any(cites(v, cid) for v in obj.values())
    if isinstance(obj, list):
        return any(cites(v, cid) for v in obj)
    return obj == cid


def show(label, value):
    if value in (None, "", [], {}):
        return
    if not isinstance(value, str):
        value = json.dumps(value, ensure_ascii=False, indent=1)
    print(f"\n**{label}**\n\n{value}")


def main():
    number = sys.argv[1]
    corpus = next((ROOT / "src/data/seedData").glob("corpus-*.json"))
    corpus = json.loads(corpus.read_text(encoding="utf-8"))
    cases = corpus["principalCases"].get(number, [])
    spec = importlib.util.spec_from_file_location("audit_assemble", ROOT / "tools/r19/assemble.py")
    assemble = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(assemble)
    data, full = assemble.build_data()
    r21 = read("tools/r19/data/r21-audit.json")
    takeaways = read("tools/r19/data/takeaways.json")
    timelines = read("tools/r19/data/timelines.json")["timelines"]
    flows = read("tools/flowcharts/data/contracts.json")
    authorities = read("tools/v25/authorities.json")
    plain = read("tools/cold-call/plain-sentences.json").get("sentences", {})
    lectures = read("tools/canons/data/lectures.json")

    print(f"# Contracts class {number}: {corpus['assignmentTitles'].get(number)}")
    print(f"\nC&M {corpus['assignedRanges'].get(number)}; supplement {corpus['supplementalRanges'].get(number)}; "
          f"other: {corpus.get('additionalAssignedMaterials', {}).get(number)}")
    for lecture in lectures:
        if str(lecture.get("course", "")).lower().startswith("contracts") and str(lecture.get("number", lecture.get("class"))) == number:
            show(f"Lecture notes record ({lecture.get('id')})", lecture)

    shown = set()
    for cid in cases:
        print(f"\n\n## {cid}")
        node = one_file("src/data/seedData/nodes-45978ecb29", cid)
        if node:
            for path, old, new in r21.get("nodes", {}).get(cid, []):
                keys, target = path.split("."), node
                for key in keys[:-1]:
                    target = target.get(key, {}) if isinstance(target, dict) else {}
                if isinstance(target, dict) and target.get(keys[-1]) == old:
                    target[keys[-1]] = new
            show("Map entry: title", node.get("title"))
            show("Map entry: summary", node.get("summary"))
            show("Map entry: notes", node.get("notes"))
            for name, text in (node.get("sections") or {}).items():
                show(f"Map entry: sections.{name}", text)
            show("Map entry: learning.topics", (node.get("learning") or {}).get("topics"))
        bid = data["map"].get(cid)
        if bid and bid in data["sections"]:
            brief = data["sections"][bid]
            show(f"Effective brief {bid}: rule", brief.get("rule"))
            for name, text in brief["sections"].items():
                show(f"Effective brief {bid}: {name}", text)
        show("Takeaway (tools/r19/data/takeaways.json)", takeaways.get(cid))
        narrative = ROOT / "tools/cold-call/narratives" / f"{cid}.json"
        if narrative.is_file():
            show("Cold Call (tools/cold-call/narratives)", json.loads(narrative.read_text(encoding="utf-8")))
        show("Cold Call plain-English sentences", plain.get(cid))
        for line in timelines:
            for index, step in enumerate(line.get("steps", [])):
                if step.get("id") == cid:
                    show(f"Timeline '{line['id']}' summary fields",
                         {k: v for k, v in line.items() if k != "steps"})
                    show(f"Timeline '{line['id']}' step {index}", step)
        for chronology in data["chronologies"]:
            for index, step in enumerate(chronology.get("steps", [])):
                if step.get("id") == cid:
                    show(f"Chronology '{chronology.get('id')}' step {index}", step)
        for chart in flows:
            for node_ in chart.get("nodes", []):
                if cites(node_, cid):
                    show(f"Flowchart {chart.get('id')} ({chart.get('title')}) node {node_.get('id')}", node_)
        for entry in authorities.get("entries", []):
            if any(link.get("id") == cid for link in entry.get("links", [])):
                if entry.get("id") in shown:
                    print(f"\n(Rules & authorities entry {entry.get('id')}: shown above.)")
                    continue
                shown.add(entry.get("id"))
                show(f"Rules & authorities entry {entry.get('id')}",
                     {k: v for k, v in entry.items() if k != "links"})


if __name__ == "__main__":
    main()
