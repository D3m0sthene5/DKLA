#!/usr/bin/env python3
"""Build checked, page-precise PDF routes for legacy atlas source links.

The atlas historically linked to extracted page readers (#book, #civ, #lrs).
All routes open the original PDF files supplied by the owner, at the physical
PDF page recorded in the source archives. Source bytes are checked against the
old archive's checksums where the same PDF was previously embedded.

Usage: python3 tools/r17/pdf-routes.py [--check]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
HTML = ROOT / "DKLA-r16.html"
OUTPUT = ROOT / "tools/r17/pdf-routes.json"
CATALOG = ROOT / "r17/opinion-pdf-catalog.json"

# The filenames stored in lrsArchive refer to a previous copy of the very
# same PDF bytes, not to filenames in added-sources/. These explicit paths
# were checked against archive page counts and SHA-256s on 27 September 2026.
LRS_PDFS = {
    "lrs-september": "added-sources/lrs-september (1).pdf",
    "lrs-october-a": "added-sources/lrs-october-1-100 (1).pdf",
    "lrs-october-b": "added-sources/lrs-october-100-end (1).pdf",
    "lrs-november-a": "added-sources/LRS-november-1-165 (1).pdf",
    "lrs-november-b": "added-sources/lrs-november-165-end (1).pdf",
    "katzmann-11-22": "added-sources/Katzmann 11-22 (1).pdf",
    "katzmann-29-49": "added-sources/Katzmann 29-49 (1).pdf",
    "katzmann-50-70": "added-sources/Katzmann 50-70 (1).pdf",
    "katzmann-70-103": "added-sources/Katzmann 70-103 (1).pdf",
}
CIV_PDF = "added-sources/CivPro.pdf"
SUPP_PDF = "added-sources/FA26 Contracts Supplement.pdf"
MALLORY_PDF = "added-sources/Mallory.pdf"
SYLLABUS_PDF = "added-sources/Syllabus 9_3_26.pdf"
SLAUGHTER_PDF = "added-sources/Class 11 - Slaughter Supplement.pdf"


def block(html: str, name: str):
    match = re.search(rf'<script id="{re.escape(name)}"[^>]*>(.*?)</script>', html, re.S)
    assert match, f"Missing {name} in {HTML}"
    return json.loads(match.group(1))


def sha256(path: Path):
    sha = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            sha.update(chunk)
    return sha.hexdigest()


def build():
    html = HTML.read_text(encoding="utf-8")
    data = block(html, "seedData")
    book = block(html, "bookArchive")
    supplement = block(html, "suppArchive")
    civil = block(html, "civilArchive")
    lrs = block(html, "lrsArchive")["sources"]
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    nodes = {n["id"]: n for n in data["nodes"]}
    routes: dict[str, dict] = {}

    def put(url, path, page, kind):
        assert (ROOT / path).is_file(), f"PDF missing: {path} ({url})"
        assert path.lower().endswith(".pdf"), f"Not a PDF: {path}"
        assert isinstance(page, int) and page > 0, (url, page)
        routes[url] = {"path": path, "page": page, "kind": kind}

    # The archive records the exact split book filename and *physical* page
    # for each printed page. Simple offsets fail at split boundaries.
    for printed, page in book.items():
        if "filePage" in page and page["file"].lower().endswith(".pdf"):
            put(f"#book={printed}", "added-sources/" + page["file"], page["filePage"], "textbook")

    # This exact 138-page PDF was recovered from the owner's existing files.
    # Every supplement archive page records the original physical file page.
    assert (ROOT / SUPP_PDF).stat().st_size == 9014924
    assert sha256(ROOT / SUPP_PDF) == "0b43bb6b1e23ab6900c52319462631fcd9c82191071c6020fe99fa6f85e6912a"
    for printed, page in supplement.items():
        put(f"#supp={printed}", SUPP_PDF, page["filePage"], "supplement")

    # The owner supplied this supplement as Word, with an HTML reading copy.
    # LibreOffice rendered the original Word file to a 56-page PDF; it is a
    # rendition, never represented as an original PDF of the publication.
    assert (ROOT / SLAUGHTER_PDF).stat().st_size == 538362
    assert sha256(ROOT / SLAUGHTER_PDF) == "a78e11ee426d9ca28424fc6dd658e14deffa57410e3d3592ef99546b944c5978"
    for extension in ("docx", "html"):
        put(f"added-sources/Class 11 - Slaughter Supplement.{extension}", SLAUGHTER_PDF, 1, "pdf-rendering")

    # These three PDFs are byte-for-byte identical to the PDFs named in the
    # old manifest. Some casebook pages straddle two PDF pages; open the first.
    manifest = json.loads((ROOT / "DKLA-sources/manifest.json").read_text())
    for old_path, path in (
        ("DKLA-sources/civil-procedure/casebook.pdf", CIV_PDF),
        ("DKLA-sources/civil-procedure/mallory.pdf", MALLORY_PDF),
        ("DKLA-sources/civil-procedure/syllabus.pdf", SYLLABUS_PDF),
    ):
        original_pdf = next(entry for entry in manifest["files"] if entry["path"] == old_path)
        assert original_pdf["bytes"] == (ROOT / path).stat().st_size, path
        assert original_pdf["sha256"] == sha256(ROOT / path), path
    for printed, page in civil["pages"].items():
        if page.get("pdfPages"):
            put(f"#civ={printed}", CIV_PDF, page["pdfPages"][0], "casebook")
    for printed in civil["malloryImages"]:
        put(f"#mallory={printed}", MALLORY_PDF, int(printed) - 421, "assigned-excerpt")
    for physical in civil["syllabusImages"]:
        put(f"#civil-syllabus={physical}", SYLLABUS_PDF, int(physical), "syllabus")

    # The nine uploaded LRS and Katzmann PDFs are the exact originals in the
    # old archive, despite the changed filename suffix (1)/(2).
    for source_id, path in LRS_PDFS.items():
        source = lrs[source_id]
        assert source["pageCount"] == len(source["pages"])
        assert source["byteSize"] == (ROOT / path).stat().st_size
        assert source["sha256"] == sha256(ROOT / path), path
        for physical_page in range(1, source["pageCount"] + 1):
            put(f"#lrs={source_id}:{physical_page}", path, physical_page, "assigned-packet")

    # Original opinion PDFs come from publisher originals. The remaining
    # opinions have only an assigned packet PDF; label that explicitly and
    # retain the extracted full text in the existing data for reference.
    opinion_status = Counter()
    for text_path, entry in catalog.items():
        status = entry["status"]
        opinion_status[status] += 1
        if status == "original-pdf":
            path = entry["path"]
            assert entry["bytes"] == (ROOT / path).stat().st_size, path
            assert entry["sha256"] == sha256(ROOT / path), path
            put(text_path, path, entry["page"], "original-opinion")
        elif status == "assigned-PDF-route":
            node = nodes[entry["id"]]
            refs = node.get("lrsImport", {}).get("sourceRefs", [])
            assert refs, f"No original or assigned PDF for {entry['id']}"
            first = refs[0]
            packet = routes[f"#lrs={first['sourceId']}:{first['pdfStart']}"]
            put(text_path, packet["path"], packet["page"], "assigned-excerpt")
        else:
            raise AssertionError(f"Unrecognized catalog status: {status}")

    # Check every direct PDF cited by an atlas node. Already-direct PDFs do
    # not need a translation, but the browser still has to find the file.
    source_urls = [s.get("url", "") for n in data["nodes"] for s in n.get("sources", [])]
    direct_pdf = [u for u in source_urls if u.startswith("added-sources/") and u.split("#")[0].lower().endswith(".pdf")]
    for url in direct_pdf:
        assert (ROOT / url.split("#")[0]).is_file(), f"Cited PDF missing: {url}"
    missing = Counter(u.split("=")[0] for u in source_urls if u.startswith("#") and u not in routes)
    assert not [u for u in source_urls if u.startswith("#") and u not in routes], missing
    assert sum(opinion_status.values()) == len(catalog) == 77, opinion_status
    assert set(opinion_status) == {"original-pdf", "assigned-PDF-route"}, opinion_status

    result = {
        "format": "dkla-r17-physical-pdf-routes-v1",
        "counts": {"routes": len(routes), "directPdfSources": len(direct_pdf), "originalOpinions": opinion_status["original-pdf"],
                   "assignedExcerpts": opinion_status["assigned-PDF-route"], "legacyUnresolved": dict(missing)},
        "routes": dict(sorted(routes.items())),
    }
    assert routes["#book=284"]["page"] == 329
    assert routes["#book=350"]["page"] == 45
    assert routes["#supp=76"]["page"] == 76
    assert routes["#civ=95"]["page"] == 75
    assert routes["#mallory=422"]["page"] == 1
    assert routes["#civil-syllabus=4"]["page"] == 4
    assert routes["#lrs=katzmann-50-70:14"]["page"] == 14
    return result


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="Compare the checked route file to a fresh build")
    opts = ap.parse_args()
    result = build()
    output = json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n"
    if opts.check:
        assert OUTPUT.read_text(encoding="utf-8") == output, "Regenerate pdf-routes.json"
    else:
        OUTPUT.write_text(output, encoding="utf-8")
    print(json.dumps(result["counts"], indent=2))


if __name__ == "__main__":
    main()
