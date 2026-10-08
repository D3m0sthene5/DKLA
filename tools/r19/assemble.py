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
TARGET = ROOT / "DKLA-r20.html"
EXPECTED_R18 = "af725ca0d371ca3f96efbefd522b5dae96d195bd6f978bd4509a469691f7aecc"
VERSION = "r20"
LABEL = "r20.4"
COURSES = ["Contracts", "Civil Procedure", "Legislation and the Regulatory State"]
KEYS = ["Parties", "Procedural History", "Material Facts", "Issue", "Holding", "Reasoning"]
CHANGELOG_R204 = {
    "v": "r20.4",
    "date": "2026-10-08",
    "text": "Every dictionary term now lists the cases that use it. Before, each case was linked only to its 14 most distinctive terms and ordinary single words were left out, so most Wex entries showed no cases. Now every term is checked against every brief, map cases and supporting cases alike: 2,868 terms list their cases, the cases that use the term most come first, and a term used by more than 40 shows the 40 and the total. A term no brief uses says so.",
}
CHANGELOG_R203 = {
    "v": "r20.3",
    "date": "2026-10-08",
    "text": "SCOTUS History now stands well clear of the courses. The frames between the course view and the card view are cleaned up: a subtopic too small to list its entries shows its name and a count (\"3 cases \u00b7 2 concepts\") instead of specks of text, stray bars and empty boxes; entry rows no longer go missing one by one; text is never set below 88% of its size or under 8 px on screen; and names stay inside their cards. The Supporting cases label is readable from the atlas view, count lines no longer list zeros, and a subject's title can no longer slide under the breadcrumb.",
}
CHANGELOG_R202 = {
    "v": "r20.2",
    "date": "2026-10-08",
    "text": "The map uses the window. On a wide window the three courses stand in a row instead of a triangle, a course opens to the full height of the window, and a subject opens larger with thinner margins. Subject names sit centred in their blocks at one size. Entries are drawn as cards with their icons at every size: the plain lines of text that used to stand in for cards on small subjects are gone, small cards keep their icon, and a long name wraps onto a second line instead of shrinking.",
}
CHANGELOG_R201 = {
    "v": "r20.1",
    "date": "2026-10-08",
    "text": "Subject titles at in-between zoom levels are even again and stay inside their blocks. A change in r19.15 had been shrinking long titles and wrapping them onto extra lines, so sizes were uneven, some titles spilled out of their blocks and a few faded almost to nothing. A title that does not fit now falls back to the subject's short name at full size, as it did before.",
}
CHANGELOG_R20 = {
    "v": "r20",
    "date": "2026-10-08",
    "text": "Version 20. The dictionary and the briefs are linked both ways: 18 interpretive canons and doctrines Wex lacks are added (noscitur a sociis, expressio unius, in pari materia, the plain meaning rule, Skidmore and Auer deference, the well-pleaded complaint rule and others), every term lists the map entries and the supporting cases whose briefs use it, and every case and supporting brief lists its terms. On the map, a course view now shows only that course (other courses fade out as you zoom in), each course sits in the middle of the screen, and text too small to read fades until you zoom in. In the reading panel, repeated source chips are gone and chips, labels and the entry icon are consistent. Save and More match the other header buttons, and a chosen option in the Study dialog is plainly marked.",
}
CHANGELOG_R1919 = {
    "v": "r19.19",
    "date": "2026-10-08",
    "text": "130 more case icons redrawn as bold solid drawings in place of the older thin outlines, for the cases an audit scored lowest. Several take a clearer subject (a crocodile for Lujan, a slot machine for Patchak, a broken heart for Lacks, a steam locomotive for Erie). Captions are unchanged.",
}
CHANGELOG_R1918 = {
    "v": "r19.18",
    "date": "2026-10-08",
    "text": "Opening \"Semester source and reading records\" in Contracts, or either of its subtopics (Assignments 10-26, Supplemental documents), now stays in Contracts instead of jumping to the Study workbench.",
}
CHANGELOG_R1917 = {
    "v": "r19.17",
    "date": "2026-10-08",
    "text": "Plain text throughout. Labels about how an entry was written are gone (\"Detailed account of the assigned reading\", \"Source-grounded editorial classification\", \"Passed independent review\", \"Sections and rule line are from the audited brief\"), and so are the disclaimers (\"not legal authority or independent proof\", \"inspect the cases for qualifications\"). In the briefs and entries, about 660 sentences that talked about the brief, the excerpt or what was on file were cut or rewritten to state the fact directly; 411 connection explanations that were boilerplate now say what the connection is. The reading panel still warns when a source is missing or only part of a case was assigned, and still flags briefs awaiting review or limited by their source.",
}
CHANGELOG_R1916 = {
    "v": "r19.16",
    "date": "2026-10-07",
    "text": "39 case icons redrawn from scratch to a higher standard, including the Greyhound running dog, the Goodyear wingfoot, the Mercedes star, the B-2, Exxon, the classic Burger King mark, the TransUnion, Hilton and Walgreens marks, a Piper Cub, Borat for Psenicska, the hairy hand, and clearer subjects where the old drawing could not be read (Sniadach, Standard Fire, Gray v. Powell, Loper Bright, Swierkiewicz). Captions are unchanged.",
}
CHANGELOG_R1915 = {
    "v": "r19.15",
    "date": "2026-10-07",
    "text": "No more cut-off labels on the map. Titles that used to end in an ellipsis at some zoom levels (\"At the edge of…\", \"What the barg…\") now show in full: the text steps down slightly in size or takes another line instead of being cut. Nineteen entry labels that had been stored already cut have their full titles back.",
}
CHANGELOG_R1914 = {
    "v": "r19.14",
    "date": "2026-10-07",
    "text": "Hurn v. Oursler (1933) added to the Civil Procedure supporting cases, with the six sections and a full brief written from the opinion. It is marked as awaiting independent review.",
}
CHANGELOG_R1913 = {
    "v": "r19.13",
    "date": "2026-10-06",
    "text": "A visual tune-up across the atlas, with nothing removed or moved: matching header buttons and a cleaner search box; one style for menus and search results; crisper subject blocks and subtopic panels on the map; matching chips and buttons, uniform labels and dividers in the reading panel; a steadier timeline rail; one shell for the Study, Supporting cases and file dialogs; a tidier Supreme Court view; and phone fixes (search results on screen, larger tap targets, no overlapping breadcrumb).",
}
CHANGELOG_R1912 = {
    "v": "r19.12",
    "date": "2026-10-06",
    "text": "61 more case icons redrawn as bold emblems and stronger images, among them: a bold H on a shield for Students for Fair Admissions v. Harvard, the GE monogram, Mack bulldog, Mobil Pegasus, Bacardi bat, Wells Fargo stagecoach, the postal eagle on Dolan, a shamrock, Australia for A.F.A. Tours, a wolf for Morrison v. Olson, and International Shoe's shoe back in place of the Washington outline. Hill v. Gateway returns to its cardboard box. Captions are unchanged.",
}
CHANGELOG_R1911 = {
    "v": "r19.11",
    "date": "2026-10-06",
    "text": "Burger King v. Rudzewicz now uses the classic round mark: tilted buns with BK inside a crescent swoosh.",
}
CHANGELOG_R1910 = {
    "v": "r19.10",
    "date": "2026-10-06",
    "text": "The brand icons are redrawn as bold solid marks: Chevron, Ford, Burger King, Daimler, Wal-Mart, AT&T, Shell, Exxon, Pepsi, State Farm, Bell Atlantic, Binance, HSBC, CBS (now a solid disc with the eye cut out), Citibank, General Motors and Phillips 66, plus new ones for Gateway, Goodyear and Home Depot. Captions are unchanged.",
}
CHANGELOG_R199 = {
    "v": "r19.9",
    "date": "2026-10-06",
    "text": "Burger King v. Rudzewicz now shows BK lettering between the two bun halves instead of a plain bar.",
}
CHANGELOG_R198 = {
    "v": "r19.8",
    "date": "2026-10-06",
    "text": "Cases named for a well-known company now carry an icon drawn after its mark: Chevron, Ford, World-Wide Volkswagen, Burger King, Daimler, Wal-Mart, AT&T Mobility, Shell Oil, Exxon Mobil, PepsiCo, State Farm, Bell Atlantic, Binance, HSBC, CBS, Citibank, General Motors and Phillips Petroleum. Captions are unchanged. Ford takes the badge in place of the Montana outline.",
}
CHANGELOG_R197 = {
    "v": "r19.7",
    "date": "2026-10-06",
    "text": "The 19 cases that took a state outline have their own captions back (for example, Biden v. Nebraska again reads \"$430 billion in student debt not waived\"); r19.6 had replaced them with \"<State>, named in the case\".",
}
CHANGELOG_R196 = {
    "v": "r19.6",
    "date": "2026-10-06",
    "text": "Cases named for a state now carry that state's outline as their icon: Alabama, Alaska, California, Colorado, Connecticut, Florida, Illinois, Massachusetts, Missouri, Montana, Nebraska, New York, Ohio, Pennsylvania, Texas, Utah, Vermont, Washington and West Virginia. One case per state, so every icon is still unique.",
}
CHANGELOG_R195 = {
    "v": "r19.5",
    "date": "2026-10-06",
    "text": "Rule entries now show the text of the provision itself, at the top of the entry. The 28 U.S.C. sections (1331, 1332, 1367, 1441 and the rest), the Federal Rules, and the APA and other statutes in Legislation carry the current text from the Legal Information Institute; Restatement, UCC and Consumer Contracts sections carry the black letter from the supplements on file; the constitutional clauses come from the Constitution on file. 59 of 69 rule entries have text.",
}
CHANGELOG_R194 = {
    "v": "r19.4",
    "date": "2026-10-06",
    "text": "The Restatement of Consumer Contracts is now on the Contracts map. RLCC §§ 4, 6, 8 and 9 have their own rule entries in the subtopics whose assignments list them (good faith, unconscionability, standard forms, parol evidence), each opening the official 2024 text at its page. The old study-note entry is now a §§ 1–10 hub with § 2 and § 3 summarised, and Assignments 6, 9, 11, 13, 16, 17 and 18 link to their sections.",
}
CHANGELOG_R193 = {
    "v": "r19.3",
    "date": "2026-10-06",
    "text": "Search results now open over the Supreme Court view instead of being hidden behind it, and choosing one leaves that view for the map. Zooming out from a course always returns to the full atlas, including when the course view was sitting slightly zoomed out.",
}
CHANGELOG_R192 = {
    "v": "r19.2",
    "date": "2026-10-06",
    "text": "The combined PDF of all 1,467 briefs is in added-sources, and every case links to its own pages in it: a source chip beside the casebook chip on cases on the map, and a button on each supporting case.",
}
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
    plain = json.loads((DATA / "plain-sections.json").read_text(encoding="utf-8")) if (DATA / "plain-sections.json").is_file() else {}
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
        if codex_id in plain:
            # r19.17 plain-text edits (plain.py); the rev tag makes the atlas re-apply an entry it already holds.
            conv_now = sections[codex_id]
            for field, old, new in plain[codex_id]:
                key = field.split(".", 1)[1] if field.startswith("sections.") else None
                cur = conv_now["sections"][key] if key else conv_now["rule"]
                if cur != old:
                    raise ValueError(f"{codex_id} {field}: plain-text edit was made against different text; re-run plain.py")
                if key:
                    conv_now["sections"][key] = new
                else:
                    conv_now["rule"] = new
            conv_now["rev"] = conv_now.get("rev", "") + ".p1"
    pdf = json.loads((DATA / "pages.json").read_text(encoding="utf-8")) if (DATA / "pages.json").is_file() else {"file": "", "pages": {}}
    return dict(pdf=pdf["file"], pages=pdf["pages"], version=LABEL, taken=meta["taken"], map=mapping, related=related_auto, entries=entries, sections=sections, skips=skips, audit=audit, changelog=[CHANGELOG_R204, CHANGELOG_R203, CHANGELOG_R202, CHANGELOG_R201, CHANGELOG_R20, CHANGELOG_R1919, CHANGELOG_R1918, CHANGELOG_R1917, CHANGELOG_R1916, CHANGELOG_R1915, CHANGELOG_R1914, CHANGELOG_R1913, CHANGELOG_R1912, CHANGELOG_R1911, CHANGELOG_R1910, CHANGELOG_R199, CHANGELOG_R198, CHANGELOG_R197, CHANGELOG_R196, CHANGELOG_R195, CHANGELOG_R194, CHANGELOG_R193, CHANGELOG_R192, CHANGELOG_R191, CHANGELOG]), full


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
    rlcc = json.loads((DATA / "rlcc.json").read_text(encoding="utf-8"))
    homes, taken = graph["studyMap"]["homes"], {}
    for r in rlcc["rules"]:
        h = r["home"]
        if r["id"] in nodes or h["district"] not in graph["studyMap"]["districts"]:
            raise ValueError(f"{r['id']}: id already in the graph, or unknown subtopic")
        clash = [o["id"] for o in list(homes.values()) + list(taken.values()) if o["x"] < h["x"] + h["w"] and h["x"] < o["x"] + o["w"] and o["y"] < h["y"] + h["h"] and h["y"] < o["y"] + o["h"]]
        if clash:
            raise ValueError(f"{r['id']}: card slot overlaps {clash}")
        taken[r["id"]] = dict(h, id=r["id"])
        missing_links = [t for t, *_ in r["links"] if t not in nodes and t not in {x["id"] for x in rlcc["rules"]}]
        if missing_links:
            raise ValueError(f"{r['id']}: links to unknown entries {missing_links}")
    unknown = [k for k in rlcc["cite"] if k not in nodes]
    if unknown:
        raise ValueError(f"rlcc cite targets not in the graph: {unknown}")
    rlcc["hubSeedUpdated"] = nodes[rlcc["hub"]["id"]].get("updatedAt")
    data["rlcc"] = rlcc
    term_links = json.loads((DATA / "term-links.json").read_text(encoding="utf-8"))
    known_ids = {e[0] for e in data["entries"]}
    data["terms"] = dict(supporting={k: v for k, v in term_links["supporting"].items() if k in known_ids})
    # term -> [number of briefs that use it, the 40 that use it most] (tools/r19/terms.py)
    data["terms"]["index"] = {slug: [n, [c for c in ids if c in known_ids]] for slug, (n, ids) in term_links.get("index", {}).items()}
    provisions = json.loads((DATA / "provisions.json").read_text(encoding="utf-8"))
    known = set(nodes) | {r["id"] for r in rlcc["rules"]}
    stray = [k for k in provisions if k not in known]
    if stray:
        raise ValueError(f"provision text for unknown entries: {stray}")
    data["provisions"] = provisions
    plain = json.loads((DATA / "plain.json").read_text(encoding="utf-8"))
    edge_ids = {e["id"] for e in graph["edges"]}
    stray = [k for k in plain["nodes"] if k not in nodes] + [k for k in plain["edges"] if k not in edge_ids]
    if stray:
        raise ValueError(f"plain-text edits for unknown entries: {stray[:5]}")
    js = (PARTS / "briefs.js").read_text(encoding="utf-8") + "\n" + (PARTS / "rlcc.js").read_text(encoding="utf-8") + "\n" + (PARTS / "provisions.js").read_text(encoding="utf-8") + "\n" + (PARTS / "fit.js").read_text(encoding="utf-8") + "\n" + (PARTS / "plain.js").read_text(encoding="utf-8") + "\n" + (PARTS / "r20.js").read_text(encoding="utf-8")
    css = (PARTS / "briefs.css").read_text(encoding="utf-8") + "\n/* ===== r19.13 visual tune-up (polish.css) ===== */\n" + (PARTS / "polish.css").read_text(encoding="utf-8") + "\n" + (PARTS / "r20.css").read_text(encoding="utf-8")
    if "</style" in css.lower():
        raise ValueError("a stylesheet would close its style tag")
    if "</script" in js.lower():
        raise ValueError("briefs.js would close its script tag")
    sw_template = (PARTS / "sw.template.js").read_text(encoding="utf-8")
    build = VERSION + "-" + digest("\n".join([EXPECTED_R18, json.dumps(data, sort_keys=True), json.dumps(plain, sort_keys=True), json.dumps(full, sort_keys=True), js, css, sw_template]).encode("utf-8"))[:10]
    data["build"] = build

    addition = "\n<!-- DKLA r19: audited briefs, full briefs, supporting cases. -->\n"
    addition += embed_json("dklaR19Data", data) + embed_json("dklaR19Plain", plain) + embed_json("dklaR19Full", full)
    addition += f'<style id="dklaR19Styles">{css}</style>\n<script id="dklaR19Briefs">{js}</script>\n'
    position = source.lower().rfind("</body>")
    output = source[:position] + addition + source[position:]
    title = "<title>DKLA · r18.1 · Danny Kind Legal Atlas</title>"
    if output.count(title) != 1:
        raise ValueError("expected the r18.1 <title>")
    output = output.replace(title, "<title>DKLA · r20 · Danny Kind Legal Atlas</title>")
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
