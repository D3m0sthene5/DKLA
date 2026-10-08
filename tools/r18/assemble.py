"""Build DKLA-r18.html from the published r17 artifact.

r18 is an iterative release: every r17 data block is preserved byte for byte.
One code block, ``studyCode``, receives a short list of exact, asserted text
patches to the map renderer (see PATCHES); everything else is appended before
``</body>`` as new blocks, in the same way r17 was layered on r16.

Run from any directory: python3 tools/r18/assemble.py
Also stamps the build id into sw.js and version.json at the repository root.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARTS = Path(__file__).resolve().parent
SOURCE = ROOT / "DKLA-r17.html"
TARGET = ROOT / "DKLA-r18.html"
EXPECTED_R17 = "765d5e078cb845580b4c76458cdf6155a92a1ea571b99b35607367b8e1bfaa30"
VERSION = "r18"
LABEL = "r18.1"

# (description, old, new). Each ``old`` must occur exactly once inside studyCode.
PATCHES = [
    (
        "course names: one world-proportional size on every screen, long name on two lines",
        "const fs=Math.min(34,Math.max(V.w<760?14:19,16+b.w*z*.012))/z,x=b.x+b.w/2,topY=Math.min(b.y,...((G.design[cl.course]?.zones||[]).map(zn=>zn.y))),y=topY-fs*.9;",
        "const fs=R18.courseTitlePx(z)/z,x=b.x+b.w/2,topY=Math.min(b.y,...((G.design[cl.course]?.zones||[]).map(zn=>zn.y))),y=topY-fs*.9,crow=R18.courseTitleRows(cl.course);",
    ),
    (
        "course names: draw the wrapped rows",
        "putLabel({key:'course:'+cl.course,pri:0,x,y,fs,anchor:'middle',text:V.w<760&&cl.course.length>20?'Legislation & Reg. State':cl.course,fill:col,",
        "putLabel({key:'course:'+cl.course,pri:0,x,y:y-(crow.length-1)*fs*1.23,fs,anchor:'middle',rows:crow,fill:col,",
    ),
    (
        "subjects show their subtopics as tiles as soon as a subtopic title is legible",
        "fullOn=isFinite(hr0)?hr0*z>=52:pw>=470,mode=pw<200?'star':fullOn?'full':'mid',fullT=isFinite(hr0)?Math.min(1,Math.max(0,(hr0*z-52)/40)):1,",
        "fullOn=isFinite(hr0)?hr0*z>=17:pw>=470,mode=pw<200?'star':fullOn?'full':'mid',fullT=isFinite(hr0)?Math.min(1,Math.max(0,(hr0*z-17)/14)):1,",
    ),
    (
        "subject title fits the shallower headroom",
        "if(mode==='full'&&isFinite(hr))tpx=Math.min(tpx,Math.max(10.5,(hr*z-16)/1.25));",
        "if(mode==='full'&&isFinite(hr))tpx=Math.min(tpx,Math.max(10.5,(hr*z-8)/1.2));",
    ),
    (
        "subject title line budget for the shallower headroom",
        "const availPx=(mode==='full'&&isFinite(hr)?hr:r.h)*z-(mode==='full'?16:22);",
        "const availPx=(mode==='full'&&isFinite(hr)?hr:r.h)*z-(mode==='full'?4:22);",
    ),
    (
        "course-level tiles fall back to the short subject name instead of an ellipsis",
        "else titleRows=titleLines?wrapM(shortRegionTitle(r),titleW,tfs,600,titleLines,'region-title'):[];",
        "else{titleRows=titleLines?wrapM(shortRegionTitle(r),titleW,tfs,600,titleLines,'region-title'):[];if(titleRows.some(l=>l.endsWith('…'))&&SHORT_NAMES[r.id]){const alt=wrapM(SHORT_NAMES[r.id].replace(/\\u00ad/g,''),titleW,tfs,600,titleLines,'region-title');if(alt.length&&!alt.some(l=>l.endsWith('…')))titleRows=alt;}}",
    ),
    (
        "no bulleted subtopic list in the in-between summary: a single count line",
        "for(const [i,d] of subs.slice(0,shown).entries()){putLabel({key:'rs:'+r.id+':'+d.id,pri:4.4+i*.01,x:r.x+40,y:yy,fs:sfs,text:'· '+d.title,width:r.w-100,lines:1,fill:'#f7f5f0',weight:500,op:dim,halo:false,clickable:true,attrs:`data-map-district=\"${E(d.id)}\" role=\"button\" tabindex=\"0\"`});yy+=lh;}if(shown<subs.length){putLabel({key:'rs:'+r.id+':more',pri:4.4+shown*.01,x:r.x+40,y:yy,fs:sfs,text:`… and ${subs.length-shown} more`,fill:'#e3e8ee',weight:500,op:dim,halo:false,clickable:true,attrs:`data-map-region=\"${E(r.id)}\" role=\"button\" tabindex=\"0\"`});yy+=lh;}}",
        "}",
    ),
    (
        "subtopic tiles list every main entry that fits, in reading order, and drop boilerplate questions",
        "putLabel({key:'dq:'+d.id,pri:2.4,fast:true,x:d.x+26,y:qy,fs:13/z,text:d.question,width:d.w-52,lines:2,fill:'#dbe4ec',op:dIn.o*dim});let yy2=qy+49/z;const all=geoMembers(id),principal=all.filter(n=>geoPlacement(n.id).role==='Principal case'),lead=nodesById.get(d.lead);const ns=[...principal,...(lead&&!principal.includes(lead)?[lead]:[])];const max=Math.max(0,Math.min(3,Math.floor((d.y+d.h-20/z-yy2)/(28/z))+1));for(const n of ns.slice(0,max)){putLabel({key:'dr:'+d.id+':'+n.id,pri:2.6,fast:true,x:d.x+33,y:yy2,fs:12/z,text:displayName(n)+' →',width:d.w-67,lines:1,fill:n.kind==='Case'?acc:'#95a9bc',op:dIn.o*dim,clickable:true,attrs:`data-map-jump=\"${E(n.id)}\" role=\"button\" tabindex=\"0\" style=\"cursor:pointer\" aria-label=\"Read ${E(n.title)}\"`});yy2+=28/z;}",
        "const dqRows=R18.showQuestion(d,z,(d.y+d.h-qy)*z)?wrapM(d.question,d.w-52,13/z,400,d.h*z>=150?2:1):[];if(dqRows.length)putLabel({key:'dq:'+d.id,pri:2.4,fast:true,x:d.x+26,y:qy,fs:13/z,rows:dqRows,fill:'#dbe4ec',op:dIn.o*dim});let yy2=qy+(dqRows.length?(dqRows.length*17+15)/z:2/z);const ns=R18.districtRows(id,d),pitch=22/z,max=Math.max(0,Math.floor((d.y+d.h-14/z-yy2)/pitch)+1),cut=ns.length>max?Math.max(1,max-1):ns.length;for(const n of ns.slice(0,max>=1?cut:0)){putLabel({key:'dr:'+d.id+':'+n.id,pri:2.6,fast:true,x:d.x+33,y:yy2,fs:12/z,text:displayName(n),width:d.w-67,lines:1,fill:n.kind==='Case'?acc:'#b9c7d4',op:dIn.o*dim,clickable:true,attrs:`data-map-jump=\"${E(n.id)}\" role=\"button\" tabindex=\"0\" style=\"cursor:pointer\" aria-label=\"Read ${E(n.title)}\"`});yy2+=pitch;}if(cut<ns.length&&max>=2)putLabel({key:'dr:'+d.id+':more',pri:2.7,fast:true,x:d.x+33,y:yy2,fs:11/z,text:`+ ${ns.length-cut} more`,width:d.w-67,lines:1,fill:'#93a7b7',op:dIn.o*dim,clickable:true,attrs:`data-map-district=\"${E(d.id)}\" role=\"button\" tabindex=\"0\"`});",
    ),
    (
        "the camera is held to the same course frame the course view fits (subjects, zones, name)",
        "else b=bounds([...scopeRegions(),...[...(active||[])].map(id=>homeFor(id))]);",
        "else b=bounds([scopeBox(),...scopeRegions(),...[...(active||[])].map(id=>homeFor(id))]);",
    ),
    (
        "a subject fills a narrow screen edge to edge, so its subtopic tiles stay legible on a phone",
        "fitBox(r,animate,25,.95);renderInspector();}",
        "fitBox(r,animate,R18.subjectPad(),.95);renderInspector();}",
    ),
    (
        "level inference uses the same subject fit",
        "zS=subject?fit(subject,25,.95):zC*3",
        "zS=subject?fit(subject,R18.subjectPad(),.95):zC*3",
    ),
    (
        "a subtopic tile always carries its title: at least 10.5 px even where the header band is shallow",
        "const tfs2=Math.min((d.headerH||91)*.9,14/z),",
        "const tfs2=Math.min(Math.max((d.headerH||91)*.9,10.5/z),14/z),",
    ),
    (
        "ribbons end at a card only once cards are readable; below that they keep the grouped pill at the subject edge",
        "const fullA=R11.modes.get(a0.region)==='full'||visible.has(e.source),fullB=R11.modes.get(b0.region)==='full'||visible.has(e.target);",
        "const fullA=R11.modes.get(a0.region)==='full'&&a0.w*z>=70||visible.has(e.source),fullB=R11.modes.get(b0.region)==='full'&&b0.w*z>=70||visible.has(e.target);",
    ),
    (
        "no step badge while the headroom is too shallow to hold it",
        "const badgeOn=!!r.step&&pw>=120,",
        "const badgeOn=!!r.step&&pw>=120&&!(mode==='full'&&isFinite(hr)&&hr*z<26),",
    ),
]

# Appended after the r17 blocks, in this order. "pre" blocks must load before
# studyCode runs its first draw, so they are inserted ahead of studyCode instead.
PRE = [("js", "dklaR18Pre", "pre.js")]
COMPONENTS = [
    ("css", "dklaR18Styles", "study.css"),
    ("js", "dklaR18Map", "map.js"),
    ("js", "dklaR18Study", "study.js"),
]
HEAD = (
    '<link rel="manifest" href="manifest.webmanifest">'
    '<meta name="theme-color" content="#101820">'
    '<link rel="icon" href="icons/icon.svg" type="image/svg+xml">'
    '<link rel="apple-touch-icon" href="icons/icon-180.png">'
    '<meta name="apple-mobile-web-app-capable" content="yes">'
    '<meta name="mobile-web-app-capable" content="yes">'
)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def script_blocks(html: str) -> dict[str, str]:
    return dict(re.findall(r'<script[^>]*\bid="([^"]+)"[^>]*>(.*?)</script>', html, re.S))


def embed(kind: str, block_id: str, filename: str, build: str) -> str:
    content = (PARTS / filename).read_text(encoding="utf-8").replace("__DKLA_BUILD__", build).replace("__DKLA_LABEL__", LABEL)
    if kind == "css":
        return f'<style id="{block_id}">' + content + "</style>\n"
    if "</script" in content.lower():
        raise ValueError(f"{filename} would prematurely close its script tag")
    return f'<script id="{block_id}">' + content + "</script>\n"


def patch_icons(block: str) -> str:
    """Give every case its own glyph (tools/r18/icons.json), keyed r18-<case id>.

    The r10 library and every non-case record are left as they were; a case record keeps its
    sources and gains the new motif, caption and rationale, with no modifier badge.
    """
    icons = json.loads(block)
    designs = json.loads((PARTS / "icons.json").read_text(encoding="utf-8"))
    for case_id, design in sorted(designs.items()):
        if case_id not in icons["records"]:
            raise ValueError(f"icons.json names an entry with no icon record: {case_id}")
        key = "r18-" + case_id
        icons["paths"][key] = design["svg"]
        record = icons["records"][case_id]
        record.update({"motif": key, "modifier": None, "label": design["hook"], "rationale": design["hook"],
                       "object": design["object"], "basis": "hand-drawn", "status": "unique"})
    return json.dumps(icons, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def patch_glossary(block: str) -> str:
    """Add the terms and brief-derived links from tools/r19/terms.py (glossary-extra.json) to the dictionary.

    New terms join the list in alphabetical order. Each extra link is added in both directions: to the entry's
    ranked term list (byNode, capped at 32 as before) and to the term's list of entries (usedBy).
    """
    gloss = json.loads(block)
    extra = json.loads((PARTS / "glossary-extra.json").read_text(encoding="utf-8"))
    have = {t["slug"] for t in gloss["terms"]}
    gloss["terms"] += [t for t in extra["newTerms"] if t["slug"] not in have]
    gloss["terms"].sort(key=lambda t: t["term"].lower())
    known = {t["slug"] for t in gloss["terms"]}
    by_node, used_by = gloss.setdefault("byNode", {}), gloss.setdefault("usedBy", {})
    for node_id, slugs in sorted(extra["nodeLinks"].items()):
        if node_id not in gloss.get("titles", {}):
            continue
        mine = by_node.setdefault(node_id, [])
        for slug in slugs:
            if slug in known and slug not in mine and len(mine) < 32:
                mine.append(slug)
                used_by.setdefault(slug, []).append(node_id)
    return json.dumps(gloss, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    if digest(source_bytes) != EXPECTED_R17:
        raise ValueError("The r17 starting file changed; inspect it before rebuilding")
    source = source_bytes.decode("utf-8")
    old = script_blocks(source)

    # The build id covers every input, so the service worker cache turns over exactly when the atlas changes.
    inputs = [EXPECTED_R17, json.dumps(PATCHES), HEAD]
    for _, _, name in PRE + COMPONENTS:
        inputs.append((PARTS / name).read_text(encoding="utf-8"))
    for name in ("sw.template.js", "changelog.json", "icons.json", "glossary-extra.json"):
        inputs.append((PARTS / name).read_text(encoding="utf-8"))
    build = VERSION + "-" + digest("\n".join(inputs).encode("utf-8"))[:10]

    study = old["studyCode"]
    patched = study
    for description, before, after in PATCHES:
        if patched.count(before) != 1:
            raise ValueError(f"patch does not match exactly once: {description}")
        patched = patched.replace(before, after)
    start = source.index(study)
    if source.count(study) != 1:
        raise ValueError("studyCode text is not unique in the file")
    output = source[:start] + patched + source[start + len(study):]

    icon_block = old["dklaIcons"]
    if output.count(icon_block) != 1:
        raise ValueError("dklaIcons text is not unique in the file")
    output = output.replace(icon_block, patch_icons(icon_block))

    glossary_block = old["dklaGlossary"]
    if output.count(glossary_block) != 1:
        raise ValueError("dklaGlossary text is not unique in the file")
    output = output.replace(glossary_block, patch_glossary(glossary_block))

    marker = '<script id="studyCode">'
    if output.count(marker) != 1:
        raise ValueError("cannot place the pre-renderer block")
    pre = "".join(embed(k, i, f, build) for k, i, f in PRE)
    output = output.replace(marker, pre + marker)

    if output.count("</head>") != 1:
        raise ValueError("expected one </head>")
    output = output.replace("</head>", HEAD + "</head>")
    title = "<title>DKLA — Danny Kind Legal Atlas</title>"
    if output.count(title) != 1:
        raise ValueError("expected the r17 <title>")
    output = output.replace(title, "<title>DKLA · " + LABEL + " · Danny Kind Legal Atlas</title>")

    changelog = json.loads((PARTS / "changelog.json").read_text(encoding="utf-8"))
    addition = "\n<!-- DKLA r18: recall drill, ratings, confusable pairs, reference sheets, offline install, sync, consistent map scaling. -->\n"
    addition += '<script type="application/json" id="dklaR18Changelog">' + json.dumps(changelog, ensure_ascii=False).replace("</", "<\\/") + "</script>\n"
    for kind, block_id, filename in COMPONENTS:
        addition += embed(kind, block_id, filename, build)
    position = output.lower().rfind("</body>")
    if position < 0:
        raise ValueError("Missing closing body tag")
    output = output[:position] + addition + output[position:]

    new = script_blocks(output)
    changed = [key for key, value in old.items() if new.get(key) != value]
    if sorted(changed) != ["dklaGlossary", "dklaIcons", "studyCode"]:
        raise ValueError(f"unexpected block changes: {changed}")
    graph = json.loads(old["seedData"])
    TARGET.write_text(output, encoding="utf-8")

    sw = (PARTS / "sw.template.js").read_text(encoding="utf-8").replace("__DKLA_BUILD__", build)
    (ROOT / "sw.js").write_text(sw, encoding="utf-8")
    (ROOT / "version.json").write_text(json.dumps({"version": LABEL, "build": build, "file": TARGET.name}) + "\n", encoding="utf-8")

    audit = {
        "r17_sha256": digest(source_bytes),
        "r18_sha256": digest(TARGET.read_bytes()),
        "build": build,
        "preserved_script_blocks": len(old) - 3,
        "patched_blocks": {"studyCode": [d for d, _, _ in PATCHES], "dklaIcons": "one glyph per case from tools/r18/icons.json", "dklaGlossary": "terms and brief-derived links from tools/r18/glossary-extra.json"},
        "nodes": len(graph["nodes"]),
        "edges": len(graph["edges"]),
        "components": [f for _, _, f in PRE + COMPONENTS],
        "distribution": "Open DKLA-r18.html beside added-sources/ and DKLA-sources/, or serve the repository (Vercel) for offline install and sync",
    }
    (PARTS / "integrity.json").write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(audit, indent=2))


if __name__ == "__main__":
    main()
