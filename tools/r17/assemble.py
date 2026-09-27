"""Build the r17 offline atlas from the published r16 artifact and small add-ons.

The r16 HTML and all of its original script/data blocks are preserved byte for byte.
The output uses relative paths to the checked-in PDF folders, so distribute the
HTML beside ``added-sources/`` and ``DKLA-sources/`` (for example as a repo ZIP).
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PARTS = Path(__file__).resolve().parent
SOURCE = ROOT / "DKLA-r16.html"
TARGET = ROOT / "DKLA-r17.html"
EXPECTED_R16 = "a64278b45ff5d6c2210aec934ce58c54d6da6cc973a5c28462eb6288dc3b1a90"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def script_blocks(html: str) -> dict[str, str]:
    return dict(re.findall(r'<script[^>]*\bid="([^"]+)"[^>]*>(.*?)</script>', html, re.S))


def embed(kind: str, block_id: str, filename: str) -> str:
    content = (PARTS / filename).read_text(encoding="utf-8")
    if kind == "json":
        json.loads(content)
        return f'<script type="application/json" id="{block_id}">' + content.replace("</", "<\\/") + "</script>\n"
    if kind == "css":
        return f'<style id="{block_id}">' + content + "</style>\n"
    if "</script" in content.lower():
        raise ValueError(f"{filename} would prematurely close its script tag")
    return f'<script id="{block_id}">' + content + "</script>\n"


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    if digest(source_bytes) != EXPECTED_R16:
        raise ValueError("The r16 starting file changed; inspect its data before rebuilding")
    source = source_bytes.decode("utf-8")
    components = [
        ("css", "dklaR17LogoStyle", "logo.css"),
        ("css", "dklaR17ScotusLinksStyle", "scotus-links.css"),
        ("json", "dklaR17PdfRoutes", "pdf-routes.json"),
        ("js", "dklaR17PdfSources", "pdf-sources.js"),
        ("js", "dklaR17ScotusLinks", "scotus-links.js"),
        ("js", "dklaR17Logo", "logo.js"),
    ]
    addition = "\n<!-- DKLA r17: original PDF routes, SCOTUS case navigation, interlocking monogram. -->\n"
    for kind, block_id, filename in components:
        addition += embed(kind, block_id, filename)

    position = source.lower().rfind("</body>")
    if position < 0:
        raise ValueError("Missing closing body tag")
    output = source[:position] + addition + source[position:]
    old = script_blocks(source)
    new = script_blocks(output)
    if any(new.get(key) != value for key, value in old.items()):
        raise ValueError("An earlier script/data block changed during the r17 build")
    graph = json.loads(old["seedData"])
    history = json.loads(old["scotusHistoryData"])
    routes = json.loads((PARTS / "pdf-routes.json").read_text(encoding="utf-8"))
    TARGET.write_text(output, encoding="utf-8")
    audit = {
        "r16_sha256": digest(source_bytes),
        "r17_sha256": digest(TARGET.read_bytes()),
        "preserved_script_blocks": len(old),
        "nodes": len(graph["nodes"]),
        "edges": len(graph["edges"]),
        "scotus_cases_with_voting_data": len(history["cases"]),
        "pdf_route_records": len(routes["routes"]),
        "components": [filename for _, _, filename in components],
        "distribution": "Open DKLA-r17.html beside added-sources/ and DKLA-sources/",
    }
    (PARTS / "integrity.json").write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(audit, indent=2))


if __name__ == "__main__":
    main()
