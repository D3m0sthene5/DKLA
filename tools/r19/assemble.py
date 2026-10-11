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

import base64
import hashlib
import json
import re
import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARTS = Path(__file__).resolve().parent
DATA = PARTS / "data"
SOURCE = ROOT / "DKLA-r18.html"
TARGET = ROOT / "DKLA-v2.5.html"
EXPECTED_R18 = "bffd3d4469836a19eaafbd2e29eff443b08b87d496147c887f5d2589d3cb45c1"
VERSION = "v2.5"
LABEL = "v2.5"
COURSES = ["Contracts", "Civil Procedure", "Legislation and the Regulatory State"]
KEYS = ["Parties", "Procedural History", "Material Facts", "Issue", "Holding", "Reasoning"]
# v22.1: every version is written v"number" (v22.1, v19.13), retconned through the whole history.
VREF = re.compile(r"(?<![\w/#.-])r(\d{1,2}(?:\.\d+)?[a-z]?)(?![\w-]|\.(?:js|css|html|json|py)\b)")


def vform_log(entries: list[dict]) -> list[dict]:
    return [dict(e, v=VREF.sub(r"v\1", e["v"]), text=VREF.sub(r"v\1", e["text"])) for e in entries]


CHANGELOG_V25_READING = {
    "v": "v2.5", "date": "2026-10-11",
    "text": "Case reading panels open with one plain-English explanation and retain their full legal analysis. Timelines are visible immediately, with one synthesis and no repeated synopsis, step-count caption or expand control. Cold Call reads directly as a narrative without practice controls or a repeated introduction. Rules & authorities uses nested atlas rectangles and ribbons for the Constitution, Federal Rules, U.S. Code and assigned Contracts authorities. Recorded source comparisons, bounded source lookups and an explicit runtime-module manifest support later audits without editing generated HTML.",
}
CHANGELOG_V25_AUTHORITY_DESIGN = {
    "v": "v2.5", "date": "2026-10-11",
    "text": "The authority atlas has distinct Constitution, federal-rule, U.S. Code and Contracts volumes, with populated nested contents and a large centered Constitution masthead based on the owner's We the People reference. Covers and nested contents fit the available screen, with naturally wrapped labels and detail appropriate to the zoom level. Ribbons connect provisions to supported case references; broader doctrinal context is separated in the reader. Curated entry positions are fixed while the camera still pans and zooms. A recorded geography review organizes doctrinal neighbors and removes prompt-only practice exercises from the map while retaining their source archives.",
}
CHANGELOG_V24_NARRATIVE = {
    "v": "v2.4", "date": "2026-10-11",
    "text": "Cold Call accounts are individually written narratives: people are introduced, events lead into litigation, and each court's reasoning and separate opinions follow in sequence. Case-specific episodes support reading and oral practice. Original full briefs remain available. The earlier brief-section fallback has been removed; only authored narratives receive a Cold Call button.",
}
CHANGELOG_V24_AUDIT = {
    "v": "v2.4", "date": "2026-10-11",
    "text": "Release label changed to v2.4, shown beside the DKLA logo. The content audit corrects errors that survived in full briefs after their compact summaries were fixed. Cold Call now keeps nested reasoning and separate-opinion headings with their parent accounts. Source limitations remain visible; the audit records distinguish full-inventory checks from fresh source comparisons.",
}
CHANGELOG_V25 = {
    "v": "v25", "date": "2026-10-11",
    "text": "Cold Call Mode now opens from every illustrated case on the map and every supporting case. The full existing briefs supply the remaining accounts, with facts before proceedings, complete reasoning and separate opinions, and source limitations retained. The three individually written narratives remain available. Open the full source brief without leaving your place. Source text is reused rather than duplicated or shortened, and coverage is checked against the entire case inventory on every build.",
}
CHANGELOG_V24 = {
    "v": "v24", "date": "2026-10-11",
    "text": "Cold Call Mode for Hamer, Pennoyer and Chadha: complete sourced narratives, case-specific section jumps with return to your place, searchable sections, and oral practice with revealable accounts and follow-up questions. Practice ratings stay separate from rule recall. Open Cold call beside a pilot case title. The existing map, briefs and personal edits are preserved.",
}
CHANGELOG_V23 = {
    "v": "v23",
    "date": "2026-10-11",
    "text": "Every doctrine-timeline step now carries a label that says in plain words what the step did and to what (\"Overrules Chevron\", \"Narrows removal power\", \"Harder to survive dismissal\", \"Replaces Finley\", \"Singapore disagrees\") in place of the bare one-word bucket (\"Expands\", \"Narrows\", \"Refines\"). The buckets had no fixed reference point, so in several timelines the same word marked opposite moves: in the removal-power line Wiener and Free Enterprise Fund were both \"narrows\"; in the parol-evidence line Bollinger was \"narrows\" and Masterson \"expands\" for the same move. Each timeline now states what wider and narrower mean for it, and each step is one of twelve kinds (starts the line, widens, narrows, extends, refines, reaffirms, applies, overrules, replaces, codified, no majority, counterpoint), shown as the colour and explained on hover. All 505 steps were relabelled and checked against the briefs.",
}
CHANGELOG_V221 = {
    "v": "v22.1",
    "date": "2026-10-11",
    "text": "The \"Why it matters\" section is gone from every entry. A legal accuracy pass checked every case entry (rule line, issue, holding, plain-English takeaway, notes) and every doctrine-timeline step against its brief, and resolved each doubt against the opinion, the casebooks and the supplements: 86 statements corrected or cut (among them Bremen's tow company, Shamrock's Justice Stone, Dioguardi's bid, the Pan American bond, Walden's office, the Little Sisters majority, Nicastro and Weiss stated no more broadly than the Court held, Myers's own suit, the West Covina and Granfinanciera dates), and 44 flagged statements confirmed with a source. Version numbers are now written v22.1, back through the whole history, and the atlas is served as DKLA-v22.1.html; old addresses still open it. The orange foot of the L in the DKLA mark now runs to the D's bowl.",
}
CHANGELOG_R22 = {
    "v": "r22",
    "date": "2026-10-11",
    "text": "Every step of every doctrine timeline now opens something. Ten statute and rule steps (Restatement §§ 90, 205 and 302, UCC §§ 2-209, 2-302, 1-303 with 2-202, and 2-716, Rule 11 of 1983, Rule 15(c) of 1991 and the 2011 venue act) were shown but could not be clicked and six of them had no entry anywhere; they now open rule entries, six of them new, each with the black-letter text from the Contracts Selections and placed with its subtopic (the modification subtopic grew a row to make room). Under the rule line, each Contracts case now carries an \"In plain English\" takeaway: one or two sentences, written from the audited brief, on what the case means and what to take from it.",
}
CHANGELOG_R21 = {
    "v": "r21",
    "date": "2026-10-10",
    "text": "Content audit. Every entry and connection was checked, and the corrections are applied over the saved graph without touching an entry the owner has edited: wrong votes, judges, dates, districts and citations fixed (Szukhent 5-4, Raila by Judge Katzmann, Chenery II line-up, Lujan Part IV, Hancock and Rule 22, Sun Printing 139 N.E. 470, Exxon in the Southern District of Florida, Iain Calder); the Byrd connection no longer inverts the rule; connections filed under the wrong doctrine are removed (Bristol-Myers and aggregation, Piper and supplemental jurisdiction, Krupski and Hadges and constitutional notice, Taylor v. Caldwell and promissory estoppel); missing connections are added (Peevyhouse and Groves, Klein and specific performance, Lucia and Freytag, Strawbridge and the diversity statute, Swierkiewicz and Twombly, the Katzmann notes, every LRS source record to its case); sentences about how an entry was written are gone; every subtopic has a real question; and entries filed under the wrong subtopic move where a slot was free (the disclosure cases, the preliminary-agreement notes, Cosby, the remedies overview, the stipulated-remedies notes).",
}
CHANGELOG_R2012 = {
    "v": "r20.12",
    "date": "2026-10-10",
    "text": "Twenty-one of the weakest case icons are redrawn, each checked blind at card size: among them the Cosby sweater, a bull for Gustafson's stock sale, the Leaning Tower for LASA's Italian marble, Montana with a railroad crossbuck for BNSF, lemonade for Arnett's bitter with the sweet, a struck-through jury for Jarkesy, a house key with a clock face for Perez, the Texas Capitol for Perry and a high-stepping horse in chains for American Horse Protection. Captions are unchanged.",
}
CHANGELOG_R2011 = {
    "v": "r20.11",
    "date": "2026-10-10",
    "text": "The DKLA mark is now whole on the three-course view from the first load, not only after zooming. The view that includes the mark was set up a moment after the atlas had already fitted the screen, so the first view still cut its top off.",
}
CHANGELOG_R2010 = {
    "v": "r20.10",
    "date": "2026-10-10",
    "text": "The three-course view now shows the whole DKLA mark; its top had been cut off under the header. The L in the mark has its own stem: the lower part of the D's left bar is orange, so the L reads as an L (map, header and tab icon).",
}
CHANGELOG_R209 = {
    "v": "r20.9",
    "date": "2026-10-10",
    "text": "Doctrine timelines rebuilt. Every timeline was checked course by course, and the set grew from 22 timelines with 164 steps to 66 with 505; 376 of the 392 cases now sit in at least one (161 before). Order errors are fixed (Mead before Brand X; Matsushita before Anderson and Celotex), timelines that ran two doctrines together are split (personal jurisdiction, standing, due process, rulemaking, damages), and new ones cover removal, venue and transfer, forum clauses, joinder, required parties, presidential power, guidance documents, substantial-evidence review, conditions, excuse and more. Each step says what it did to the doctrine and, where a later case undid it, by whom; a step can also be a supporting case or a statute or rule change; each timeline ends with where the doctrine stands now. Doctrine timelines in the More menu lists them all by course, and search finds them by name, question or case.",
}
CHANGELOG_R208 = {
    "v": "r20.8",
    "date": "2026-10-08",
    "text": "The Exxon icon on Exxon Mobil v. Allapattah is now just the interlocking double X from the Exxon logo, bold and solid, in place of the old sign with lettering.",
}
CHANGELOG_R207 = {
    "v": "r20.7",
    "date": "2026-10-08",
    "text": "The A in the DKLA mark is a proper A rotated a quarter turn counter-clockwise and inscribed in the D: apex toward the K, legs opening to the right, feet on the bowl, crossbar vertical. Map, header and tab icon match.",
}
CHANGELOG_R206 = {
    "v": "r20.6",
    "date": "2026-10-08",
    "text": "The old atlas no longer shows for the first half-second of loading: the page stays dark with a small DKLA label until the current code has arranged the map. The DKLA mark, on the map and in the header, has the A turned on its side: its crossbar is the vertical line joining the K's two arm tips and its legs meet at the inside of the D, so the letters read as one figure. The browser-tab icon matches. Greenfield's portrait is cropped to the head, so the face fills the icon. The first-visit note is one line, and the guide page is shorter: numbered steps with no labels, and a key table.",
}
CHANGELOG_R205 = {
    "v": "r20.5",
    "date": "2026-10-08",
    "text": "A guide. how-to-use.html walks through the atlas in six steps (the map, a case, search, connections, sources, the study tools); a note on the three-course view points to it the first time the atlas opens, and the More menu lists it as Guided walkthrough. Greenfield v. Philles Records carries Ronnie Spector's portrait, traced from the owner's drawing. The DKLA mark on the three-course view is larger and its letters have room: the A stands wholly inside the D like the K and the L, its right foot joined to the bowl, and the K's arms stop short of the bowl. The old Contracts welcome block and the older marks no longer flash during the first half-second of loading.",
}
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
    corrections_path = DATA / "accuracy24.json"
    if corrections_path.is_file():
        corrections = json.loads(corrections_path.read_text(encoding="utf-8"))
        audit.update(corrections.get("reviews", {}))
        for correction in corrections["changes"]:
            cid, field = correction["id"], correction["field"]
            old, new = correction["from"], correction["to"]
            if field == "full":
                current = full[cid]
            elif field == "rule":
                current = sections[cid]["rule"]
            else:
                current = sections[cid]["sections"][field]
            if not old or current.count(old) != 1:
                raise ValueError(f"{cid}/{field}: accuracy correction no longer matches exactly once")
            corrected = current.replace(old, new, 1)
            if field == "full":
                full[cid] = corrected
            else:
                if field == "rule":
                    sections[cid]["rule"] = corrected
                else:
                    sections[cid]["sections"][field] = corrected
                sections[cid]["rev"] = sections[cid].get("rev", "") + ".audit24"
    for entry in entries:
        review = audit.get(entry[0], {})
        if entry[3] == "pending" and review.get("v") in ("clean", "corrected"):
            entry[3] = "repaired" if review["v"] == "corrected" else "pass"
            entry[4] = "SOURCE_REVIEW_COMPLETED"
    return dict(pdf=pdf["file"], pages=pdf["pages"], version=LABEL, taken=meta["taken"], map=mapping, related=related_auto, entries=entries, sections=sections, skips=skips, audit=audit, changelog=vform_log([CHANGELOG_V25_AUTHORITY_DESIGN, CHANGELOG_V25_READING, CHANGELOG_V24_NARRATIVE, CHANGELOG_V24_AUDIT, CHANGELOG_V25, CHANGELOG_V24, CHANGELOG_V23, CHANGELOG_V221, CHANGELOG_R22, CHANGELOG_R21, CHANGELOG_R2012, CHANGELOG_R2011, CHANGELOG_R2010, CHANGELOG_R209, CHANGELOG_R208, CHANGELOG_R207, CHANGELOG_R206, CHANGELOG_R205, CHANGELOG_R204, CHANGELOG_R203, CHANGELOG_R202, CHANGELOG_R201, CHANGELOG_R20, CHANGELOG_R1919, CHANGELOG_R1918, CHANGELOG_R1917, CHANGELOG_R1916, CHANGELOG_R1915, CHANGELOG_R1914, CHANGELOG_R1913, CHANGELOG_R1912, CHANGELOG_R1911, CHANGELOG_R1910, CHANGELOG_R199, CHANGELOG_R198, CHANGELOG_R197, CHANGELOG_R196, CHANGELOG_R195, CHANGELOG_R194, CHANGELOG_R193, CHANGELOG_R192, CHANGELOG_R191, CHANGELOG])), full


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


def load_runtime_modules() -> tuple[str, str, list[dict]]:
    """One explicit load order replaces the growing concatenation chain.

    Named boundary comments point a generated script error back to its source;
    integrity records preserve hashes and line ranges for each source module.
    """
    manifest = json.loads((ROOT / 'tools/v25/runtime-manifest.json').read_text(encoding='utf-8'))
    records, outputs = [], []
    for kind in ('javascript', 'stylesheets'):
        chunks, offset, seen = [], 1, set()
        for relative in manifest[kind]:
            path = (ROOT / relative).resolve()
            if not path.is_relative_to(ROOT) or relative in seen:
                raise ValueError(f'Invalid or duplicate runtime module: {relative}')
            seen.add(relative)
            text = path.read_text(encoding='utf-8')
            chunk = f'/* ===== {relative} ===== */\n{text}\n'
            line_count = chunk.count('\n')
            records.append(dict(path=relative,kind=kind,sha256=digest(text.encode('utf-8')),startLine=offset,sourceStartLine=offset+1,endLine=offset+line_count-1))
            chunks.append(chunk); offset += line_count
        outputs.append(''.join(chunks))
    return outputs[0], outputs[1], records



# v23: twelve moves. The relationship to earlier law, measured (for widens and limits) against the timeline's anchor.
TURNS = {"origin", "widens", "limits", "extends", "sharpens", "reaffirms", "applies", "overrules", "displaces", "codifies", "divided", "counterpoint"}


def load_timelines(nodes: dict, supporting: set) -> dict:
    """The audited doctrine timelines (data/timelines.json), checked: every step is a map Case or Rule, a supporting
    case or a dated event; steps run in date order; every field the panel shows is present."""
    raw = json.loads((DATA / "timelines.json").read_text(encoding="utf-8"))
    seen, problems = set(), []
    for t in raw["timelines"]:
        tid = t.get("id")
        if not tid or tid in seen:
            problems.append(f"timeline id missing or repeated: {tid}")
        seen.add(tid)
        for key in ("course", "title", "question", "now", "steps", "anchor", "up", "down"):
            if not t.get(key):
                problems.append(f"{tid}: no {key}")
        if t.get("course") not in ("Contracts", "Civil Procedure", "Legislation and the Regulatory State"):
            problems.append(f"{tid}: unknown course {t.get('course')}")
        if len(t.get("steps", [])) < 3:
            problems.append(f"{tid}: fewer than three steps")
        prev, keys = ("0000", 0), set()
        for s in t.get("steps", []):
            kinds = [k for k in ("id", "sup", "event") if s.get(k)]
            if len(kinds) != 1:
                problems.append(f"{tid}: a step needs exactly one of id, sup, event: {s}")
                continue
            key = s.get("id") or s.get("sup") or s.get("event")
            if key in keys:
                problems.append(f"{tid}: {key} appears twice")
            keys.add(key)
            if s.get("id") and (s["id"] not in nodes or nodes[s["id"]]["kind"] not in ("Case", "Rule")):
                problems.append(f"{tid}: {s['id']} is not a case or rule on the map")
            if s.get("sup") and s["sup"] not in supporting:
                problems.append(f"{tid}: {s['sup']} is not a supporting case")
            if s.get("link") and (not s.get("event") or s["link"] not in nodes or nodes[s["link"]]["kind"] not in ("Case", "Rule")):
                problems.append(f"{tid}: link {s.get('link')} must sit on an event and name a case or rule on the map")
            if s.get("turn") not in TURNS:
                problems.append(f"{tid}: {key} has turn {s.get('turn')!r}")
            if s.get("turn") in ("extends", "overrules", "displaces", "codifies", "counterpoint") and not s.get("object"):
                problems.append(f"{tid}: {key} ({s.get('turn')}) needs an object for its label")
            if s.get("turn") == "origin" and s is not t["steps"][0] or s.get("turn") != "origin" and s is t["steps"][0]:
                problems.append(f"{tid}: {key}: origin must be the first step and only the first")
            if not s.get("note") or not isinstance(s.get("year"), int):
                problems.append(f"{tid}: {key} lacks a note or a year")
                continue
            date = s.get("date") or ""
            if date and not (re.fullmatch(r"\d{4}-\d{2}-\d{2}", date) and date[:4] == str(s["year"])):
                problems.append(f"{tid}: {key} date {date} does not match its year")
            order = (date or f"{s['year']:04d}", s["year"])
            if (order[1], order[0]) < (prev[1], prev[0]):
                problems.append(f"{tid}: {key} ({date or s['year']}) is out of order")
            prev = order
    if problems:
        raise ValueError("timelines.json:\n  " + "\n  ".join(problems))
    rev = "r20.9-" + digest(json.dumps(raw["timelines"], sort_keys=True).encode("utf-8"))[:10]
    return dict(rev=rev, list=raw["timelines"])

def load_rules22(graph: dict, nodes: dict, taken: dict) -> dict:
    """Rule entries behind the timelines (data/rules22.json), checked: a new id, a known subtopic, links to known
    entries, and a card slot (relative to the subtopic corner) that overlaps no other card once the layout changes
    in the same file (r21 moves, the modification row, the disclosure shift) are applied."""
    r = json.loads((DATA / "rules22.json").read_text(encoding="utf-8"))
    sm = graph["studyMap"]
    districts = {k: dict(v) for k, v in sm["districts"].items()}
    homes = {k: dict(v) for k, v in sm["homes"].items()}
    homes.update({k: dict(v) for k, v in taken.items()})
    audit = json.loads((DATA / "r21-audit.json").read_text(encoding="utf-8"))
    for did, g in (audit.get("districtGrow") or {}).items():
        if did in districts and g.get("h"):
            districts[did]["h"] = max(districts[did]["h"], g["h"])
    for did, g in (r.get("districtGrow") or {}).items():
        if did not in districts:
            raise ValueError(f"rules22: unknown subtopic {did}")
        districts[did]["h"] = max(districts[did]["h"], g.get("h", 0))
    for did, sh in (r.get("districtShift") or {}).items():
        if did not in districts:
            raise ValueError(f"rules22: unknown subtopic {did}")
        districts[did]["y"] += sh["dy"]
        for h in homes.values():
            if h["district"] == did:
                h["y"] += sh["dy"]
    for hid, sh in (r.get("homeShift") or {}).items():
        if hid not in homes:
            raise ValueError(f"rules22: unknown card {hid}")
        homes[hid]["y"] += sh["dy"]
    for mid, mv in (audit.get("moves") or {}).items():
        d = districts[mv["district"]]
        homes[mid] = dict(id=mid, x=d["x"] + mv["dx"], y=d["y"] + mv["dy"], w=mv["w"], h=mv["h"], district=mv["district"])
    regions = {x["id"]: x for x in sm["regions"]}
    for did, d in districts.items():
        reg = regions.get(d["region"])
        if reg and d["y"] + d["h"] > reg["y"] + reg["h"] + 1:
            raise ValueError(f"rules22: subtopic {did} would end below its subject")
    for rule in r["rules"]:
        if rule["id"] in nodes:
            raise ValueError(f"rules22: {rule['id']} already in the graph")
        h = rule["home"]
        d = districts.get(h["district"])
        if not d:
            raise ValueError(f"rules22: {rule['id']} names unknown subtopic {h['district']}")
        box = dict(x=d["x"] + h["dx"], y=d["y"] + h["dy"], w=h["w"], h=h["h"])
        if box["x"] < d["x"] or box["y"] < d["y"] or box["x"] + box["w"] > d["x"] + d["w"] + 1 or box["y"] + box["h"] > d["y"] + d["h"] + 1:
            raise ValueError(f"rules22: {rule['id']} slot leaves its subtopic")
        clash = [o["id"] for o in homes.values() if o["x"] < box["x"] + box["w"] and box["x"] < o["x"] + o["w"] and o["y"] < box["y"] + box["h"] and box["y"] < o["y"] + o["h"]]
        if clash:
            raise ValueError(f"rules22: {rule['id']} slot overlaps {clash}")
        homes[rule["id"]] = dict(box, id=rule["id"], district=h["district"])
        ids = set(nodes) | {x["id"] for x in r["rules"]} | set(taken)
        bad = [t for t, *_ in rule["links"] if t not in ids]
        if bad:
            raise ValueError(f"rules22: {rule['id']} links to unknown entries {bad}")
    return r


def load_takeaways(nodes: dict) -> dict:
    """Plain-English takeaways (data/takeaways.json): one or two sentences per case, 12–70 words, cases only."""
    t = json.loads((DATA / "takeaways.json").read_text(encoding="utf-8"))
    problems = []
    for k, v in t.items():
        if k not in nodes or nodes[k].get("kind") != "Case":
            problems.append(f"{k}: not a case on the map")
        words = len(str(v).split())
        if not isinstance(v, str) or not (12 <= words <= 70):
            problems.append(f"{k}: {words} words")
    if problems:
        raise ValueError("takeaways.json:\n  " + "\n  ".join(problems))
    return t


def load_audit(graph: dict, nodes: dict, edge_ids: set) -> dict:
    """The r21 content-audit corrections (data/r21-audit.json), checked: every edited entry, connection, subtopic and
    subject exists; added connections join two entries and carry a label and explanation; removed connections exist;
    each moved entry lands in a known subtopic on a card slot that overlaps no other card."""
    a = json.loads((DATA / "r21-audit.json").read_text(encoding="utf-8"))
    sm = graph["studyMap"]
    districts, regions = sm["districts"], {r["id"]: r for r in sm["regions"]}
    problems = []
    problems += [f"node {k}" for k in a.get("nodes", {}) if k not in nodes]
    # An added connection can have a guarded correction for saved older copies.
    # Its endpoints and required fields are checked below like every addition.
    known_edges = edge_ids | {e.get("id") for e in a.get("addEdges", [])}
    # Rule adapters create these exact IDs at runtime. Admit only catalogued
    # links whose endpoints exist, rather than accepting an arbitrary prefix.
    rule_catalogues = [
        (json.loads((DATA / "rlcc.json").read_text(encoding="utf-8")), "r19-rlcc-", "-"),
        (json.loads((DATA / "rules22.json").read_text(encoding="utf-8")), "r22-", "--"),
    ]
    rule_nodes = set(nodes) | {r["id"] for catalogue, _, _ in rule_catalogues for r in catalogue["rules"]}
    for catalogue, prefix, separator in rule_catalogues:
        records = catalogue["rules"] + ([catalogue["hub"]] if "hub" in catalogue else [])
        for record in records:
            for target, label, explanation in record.get("links", []):
                eid = prefix + record["id"] + separator + target
                if record["id"] not in rule_nodes or target not in rule_nodes or not label or not explanation:
                    problems.append(f"generated rule edge {eid}: unknown endpoint or empty text")
                else:
                    known_edges.add(eid)
    problems += [f"edge {k}" for k in a.get("edges", {}) if k not in known_edges]
    problems += [f"district {k}" for k in a.get("districts", {}) if k not in districts]
    problems += [f"region {k}" for k in a.get("regions", {}) if k not in regions]
    problems += [f"remove {k}" for k in a.get("removeEdges", []) if k not in edge_ids]
    pairs = {(e["source"], e["target"]) for e in graph["edges"] if e["id"] not in set(a.get("removeEdges", []))}
    for e in a.get("addEdges", []):
        if e["source"] not in nodes or e["target"] not in nodes or not e.get("label") or not e.get("explanation") or not e.get("id"):
            problems.append(f"addEdge {e.get('id')}")
        if (e["source"], e["target"]) in pairs:
            problems.append(f"addEdge duplicates {e['source']} -> {e['target']}")
        pairs.add((e["source"], e["target"]))
    homes = dict(sm["homes"])
    for k, g in a.get("districtGrow", {}).items():
        d = districts.get(k)
        if not d:
            problems.append(f"grow {k}"); continue
        r = regions[d["region"]]
        box = dict(d, h=g["h"])
        if box["y"] + box["h"] > r["y"] + r["h"]:
            problems.append(f"grow {k} leaves its subject")
        for o in districts.values():
            if o["id"] != k and o["region"] == d["region"] and o["x"] < box["x"] + box["w"] and box["x"] < o["x"] + o["w"] and o["y"] < box["y"] + box["h"] and box["y"] < o["y"] + o["h"]:
                problems.append(f"grow {k} overlaps {o['id']}")
    for k, h in a.get("moves", {}).items():
        if k not in nodes or h["district"] not in districts:
            problems.append(f"move {k}"); continue
        homes.pop(k, None)
        d = districts[h["district"]]
        h = dict(h, x=d["x"] + h["dx"], y=d["y"] + h["dy"])
        grown = a.get("districtGrow", {}).get(d["id"], {}).get("h", d["h"])
        if not (d["x"] <= h["x"] and h["x"] + h["w"] <= d["x"] + d["w"] and d["y"] <= h["y"] and h["y"] + h["h"] <= d["y"] + grown):
            problems.append(f"move {k} lands outside {d['id']}")
        clash = [o["id"] for o in homes.values() if o["x"] < h["x"] + h["w"] and h["x"] < o["x"] + o["w"] and o["y"] < h["y"] + h["h"] and h["y"] < o["y"] + o["h"]]
        if clash:
            problems.append(f"move {k} overlaps {clash}")
        homes[k] = dict(h, id=k)
    if problems:
        raise ValueError("audit.json:\n  " + "\n  ".join(problems))
    return a


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    if digest(source_bytes) != EXPECTED_R18:
        raise ValueError("DKLA-r18.html is not the build r19 was made from; rebuild r18 or update EXPECTED_R18")
    source = source_bytes.decode("utf-8")
    old = script_blocks(source)
    graph = json.loads(old["seedData"])
    data, full = build_data()
    cold_dir = ROOT / "tools/cold-call"
    cold = json.loads((cold_dir / "cases.json").read_text(encoding="utf-8"))
    cold = runpy.run_path(str(cold_dir / "compile.py"))["compile_cases"](cold, graph, data, full)
    runpy.run_path(str(cold_dir / "validate.py"))["validate"](cold, graph, full, data)
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
    data["rules22"] = load_rules22(graph, nodes, taken)
    nodes.update({r["id"]: dict(r, kind="Rule") for r in data["rules22"]["rules"]})
    data["takeaways"] = load_takeaways(nodes)
    term_links = json.loads((DATA / "term-links.json").read_text(encoding="utf-8"))
    known_ids = {e[0] for e in data["entries"]}
    data["terms"] = dict(supporting={k: v for k, v in term_links["supporting"].items() if k in known_ids})
    # term -> [number of briefs that use it, the 40 that use it most] (tools/r19/terms.py)
    data["terms"]["index"] = {slug: [n, [c for c in ids if c in known_ids]] for slug, (n, ids) in term_links.get("index", {}).items()}
    provisions = json.loads((DATA / "provisions.json").read_text(encoding="utf-8"))
    known = set(nodes) | {r["id"] for r in rlcc["rules"]} | {r["id"] for r in data["rules22"]["rules"]}
    stray = [k for k in provisions if k not in known]
    if stray:
        raise ValueError(f"provision text for unknown entries: {stray}")
    data["provisions"] = provisions
    plain = json.loads((DATA / "plain.json").read_text(encoding="utf-8"))
    edge_ids = {e["id"] for e in graph["edges"]}
    stray = [k for k in plain["nodes"] if k not in nodes] + [k for k in plain["edges"] if k not in edge_ids]
    if stray:
        raise ValueError(f"plain-text edits for unknown entries: {stray[:5]}")
    data["timelines"] = load_timelines(nodes, {e[0] for e in data["entries"] if not e[6]})
    missing = [r["id"] for r in data["rules22"]["rules"] if not any(s.get("id") == r["id"] for t in data["timelines"]["list"] for s in t["steps"])]
    if missing:
        raise ValueError(f"rules22 entries that no timeline opens: {missing}")
    audit21 = load_audit(graph, nodes, edge_ids)
    authorities = json.loads((ROOT / 'tools/v25/authorities.json').read_text(encoding='utf-8'))
    masthead_path = ROOT / 'tools/v25/assets/we-the-people.png'
    masthead_meta = json.loads((masthead_path.with_suffix('.json')).read_text(encoding='utf-8'))
    masthead_bytes = masthead_path.read_bytes()
    masthead = dict(uri='data:image/png;base64,' + base64.b64encode(masthead_bytes).decode('ascii'),
                    width=masthead_meta['width'], height=masthead_meta['height'])
    practice_filter = json.loads((ROOT / 'tools/v25/practice-filter.json').read_text(encoding='utf-8'))
    geography = json.loads((ROOT / 'tools/v25/geography.json').read_text(encoding='utf-8'))
    js, css, modules = load_runtime_modules()
    if "</style" in css.lower():
        raise ValueError("a stylesheet would close its style tag")
    if "</script" in js.lower():
        raise ValueError("briefs.js would close its script tag")
    sw_template = (PARTS / "sw.template.js").read_text(encoding="utf-8")
    build = VERSION + "-" + digest("\n".join([EXPECTED_R18, json.dumps(data, sort_keys=True), json.dumps(plain, sort_keys=True), json.dumps(audit21, sort_keys=True), json.dumps(full, sort_keys=True), json.dumps(cold, sort_keys=True), json.dumps(authorities, sort_keys=True), json.dumps(masthead, sort_keys=True), json.dumps(practice_filter, sort_keys=True), json.dumps(geography, sort_keys=True), js, css, sw_template]).encode("utf-8"))[:10]
    data["build"] = build

    addition = "\n<!-- DKLA r19: audited briefs, full briefs, supporting cases. -->\n"
    addition += embed_json("dklaR19Data", data) + embed_json("dklaR19Plain", plain) + embed_json("dklaR21Audit", audit21) + embed_json("dklaR19Full", full)
    addition += embed_json("dklaColdCallData", cold)
    addition += embed_json("dklaAuthoritiesData", authorities)
    addition += embed_json("dklaWeThePeopleAsset", masthead)
    addition += embed_json("dklaPracticeFilter", practice_filter)
    addition += embed_json("dklaGeographyData", geography)
    addition += f'<style id="dklaR19Styles">{css}</style>\n<script id="dklaR19Briefs">{js}</script>\n'
    position = source.lower().rfind("</body>")
    output = source[:position] + addition + source[position:]
    # r20.6: the atlas boots from studyCode while the browser is still parsing the r19 blocks at the end of the file,
    # so for about half a second it ran as the old atlas (the "Legal Atlas" header, the triangle layout, no SCOTUS
    # block, the old centre mark, the Contracts welcome block). A head rule keeps everything invisible behind a dark
    # page with a small DKLA label until r20.js has arranged the map (html.r20-ready), and keeps the welcome block
    # and the unreshaped mark hidden after that.
    boot = ('<style id="dklaR20Boot">html{background:#101820}'
            'html:not(.r20-ready) body>*{visibility:hidden!important}'
            'html:not(.r20-ready) body::before{content:"DKLA";position:fixed;inset:0;display:grid;place-items:center;'
            'font:600 20px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.35em;color:#6f8294}'
            '#mapWelcome{visibility:hidden}body.r20-settled #mapWelcome{visibility:visible}'
            '#geoCanvas svg[viewBox="0 0 244 78"],#geoCanvas .dkla-map-monogram:not([data-r20]){visibility:hidden}</style>')
    if output.count("</head>") != 1:
        raise ValueError("expected one </head>")
    output = output.replace("</head>", boot + "</head>")
    title = "<title>DKLA · v18.1 · Danny Kind Legal Atlas</title>"
    if output.count(title) != 1:
        raise ValueError("expected the v18.1 <title>")
    output = output.replace(title, "<title>DKLA · " + LABEL + " · Danny Kind Legal Atlas</title>")
    new = script_blocks(output)
    if any(new.get(k) != v for k, v in old.items()):
        raise ValueError("an r18 block changed during the r19 build")
    TARGET.write_text(output, encoding="utf-8", newline="\n")
    (ROOT / "sw.js").write_text(sw_template.replace("__DKLA_BUILD__", build).replace("__DKLA_ATLAS__", TARGET.name), encoding="utf-8", newline="\n")
    (ROOT / "version.json").write_text(json.dumps({"version": LABEL, "build": build, "file": TARGET.name}) + "\n", encoding="utf-8", newline="\n")
    # Publish routing and metadata with the generated artifact, never a half-release.
    index = ROOT / "index.html"
    index.write_text(re.sub(r"DKLA-[rv][0-9.]+\.html", TARGET.name, index.read_text(encoding="utf-8")), encoding="utf-8", newline="\n")
    route_path = ROOT / "vercel.json"
    routes = json.loads(route_path.read_text(encoding="utf-8"))
    destination = "/" + TARGET.name
    previous = next(r["destination"] for r in routes["rewrites"] if r["source"] == "/")
    if previous != destination and not any(r["source"] == previous for r in routes.get("redirects", [])):
        routes.setdefault("redirects", []).append(dict(source=previous, destination=destination, permanent=False))
    for route in routes.get("redirects", []) + routes["rewrites"]:
        if re.fullmatch(r"/DKLA-[rv][0-9.]+\.html", route.get("destination", "")):
            route["destination"] = destination
    route_path.write_text(json.dumps(routes, indent=2) + "\n", encoding="utf-8", newline="\n")
    kinds = {}
    for e in data["entries"]:
        kinds[e[3]] = kinds.get(e[3], 0) + 1
    audit = {
        "r18_sha256": EXPECTED_R18, "r19_sha256": digest(TARGET.read_bytes()), "build": build, "snapshot": data["taken"],
        "briefs": len(data["entries"]), "mapped_cases": len(data["map"]), "converted": len(data["sections"]),
        "mapped_without_conversion": sorted(a for a, c in data["map"].items() if c not in data["sections"]),
        "supporting": sum(1 for e in data["entries"] if not e[6]), "review": kinds,
        "supporting_with_sections": sum(1 for e in data["entries"] if not e[6] and e[0] in data["sections"]),
        "additional_source_reviews": {v: sum(1 for a in data["audit"].values() if a["v"] == v) for v in ("clean", "corrected", "could-not-audit")},
        "preserved_script_blocks": len(old),
        "runtime_modules": modules,
        "design_assets": [{"path": 'tools/v25/assets/we-the-people.png', "sha256": digest(masthead_bytes), "bytes": len(masthead_bytes)}],
    }
    (PARTS / "integrity.json").write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({k: (v if k != "mapped_without_conversion" else len(v)) for k, v in audit.items()}, indent=1))


if __name__ == "__main__":
    main()
