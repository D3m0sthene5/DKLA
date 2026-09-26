#!/usr/bin/env python3
"""Revision 11: add the source viewer script block (tools/r11/sources.js) after dklaUI, its styles, and the coverage wording."""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'DKLA-r8.html')
html = open(HTML, encoding='utf-8').read()
JS = open(os.path.join(ROOT, 'tools', 'r11', 'sources.js'), encoding='utf-8').read()
assert '</script>' not in JS
block = '<script id="dklaR11Sources">\n' + JS + '</script>\n'
if 'id="dklaR11Sources"' in html:
    html = re.sub(r'<script id="dklaR11Sources">.*?</script>\n', lambda _: block, html, count=1, flags=re.S)
else:
    m = re.search(r'<script id="dklaUI"[^>]*>', html); e = html.find('</script>', m.end()) + len('</script>\n')
    html = html[:e] + block + html[e:]
old = "'source-limited':'From the assigned excerpt only','missing-source':'Source missing'}"
if old in html:
    html = html.replace(old, "'source-limited':'From the assigned reading','assigned-reading':'From the assigned reading','missing-source':'Source missing'}")
    html = html.replace("return /^(Full brief|From the assigned excerpt only|Source missing|Partial excerpt|Early brief|Brief|Short note|Assigned case|Account from the published opinion)$/.test(raw)?raw:/note|excerpt|limited|partial/i.test(raw)?'From the assigned excerpt only':'Brief';}",
                        "return /^(Full brief|From the assigned reading|Source missing|Partial excerpt|Early brief|Brief|Short note|Assigned case|Account from the published opinion)$/.test(raw)?raw:/^Assigned|excerpt|Casebook discussion/i.test(raw)?raw.replace(/\\s*\\(casebook excerpt\\)$/,''):/note|limited|partial/i.test(raw)?'From the assigned reading':'Brief';}")
    html = html.replace("if(n.status==='Assigned source gap')return 'Source missing';", "if(n.status==='Assigned source gap'||n.status==='Not among the supplied files')return 'Not on file';")
old2 = "${E({'full-account':'Detailed account of the supplied reading','source-limited':'Short account limited by the supplied excerpt','missing-source':'Assigned source missing'}[x.coverageLevel]||x.coverageLevel||'Assigned excerpt account')}"
if old2 in html:
    html = html.replace(old2, "${E({'full-account':(n.tags||[]).includes('r11-full')?'Brief written from the full opinion, on file':'Detailed account of the assigned reading','source-limited':'Brief from the assigned excerpt','assigned-reading':'Brief from the assigned excerpt','missing-source':'Assigned source not on file'}[x.coverageLevel]||x.coverageLevel||'Brief from the assigned excerpt')}")
CSS = """<style id="dklaR11SourceStyles">
#fileDialog{width:min(1200px,96vw);height:min(92vh,1100px);max-width:none;max-height:none;padding:0;border:1px solid #3a4a58;border-radius:12px;background:#111a22;color:#e4ebf1;display:flex;flex-direction:column;overflow:hidden}
#fileDialog:not([open]){display:none}#fileDialog::backdrop{background:#05090dcc}
#fileDialog .file-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-bottom:1px solid #26333f;background:#141e27;flex-wrap:wrap}
#fileDialog .file-title{display:flex;flex-direction:column;min-width:0}#fileDialog .file-title strong{font-size:15px}#fileDialog .file-title span{font-size:12px;color:#93a7b7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70vw}
#fileDialog .file-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}#fileDialog .file-tools button,#fileDialog .file-tools a{background:#1f2a35;color:#dabd94;border:1px solid #435466;border-radius:16px;font-size:12.5px;padding:6px 12px;text-decoration:none;cursor:pointer}
#fileDialog .file-page{font-size:12.5px;color:#aeb9c6;display:flex;align-items:center;gap:6px}#fileDialog .file-page input{width:64px;background:#0f171e;color:#e4ebf1;border:1px solid #435466;border-radius:6px;padding:5px 6px;font-size:13px}
#fileDialog #fileFind{background:#0f171e;color:#e4ebf1;border:1px solid #435466;border-radius:16px;padding:6px 12px;font-size:12.5px;min-width:220px}
#fileDialog iframe{flex:1;width:100%;border:0;background:#fff}#fileDialog iframe.is-text{background:#fbfaf7}
#fileDialog .file-object{display:block;flex:1;width:100%;min-height:0;background:#fbfaf7}
#fileDialog .file-fallback,#fileDialog .file-scroll{height:100%;overflow:auto;background:#fbfaf7;color:#1c2128}
#fileDialog .file-notice{margin:0;padding:14px 22px;background:#f1e9d6;color:#4a3d22;font-size:14px;line-height:1.5;border-bottom:1px solid #e0d3b4}#fileDialog .file-notice code{font-size:13px}#fileDialog .file-notice button{background:none;border:0;color:#7a4b12;text-decoration:underline;cursor:pointer;font:inherit}
#fileDialog .file-gh{display:inline-block;margin:6px 10px 0 0;background:#1f2a35;color:#dabd94;border:1px solid #435466;border-radius:16px;font-size:12.5px;padding:5px 12px;text-decoration:none}
#fileDialog .file-text,#fileDialog .file-pagetext{max-width:780px;margin:0 auto;padding:28px 24px 80px;font:17px/1.6 Georgia,serif}#fileDialog .file-text p,#fileDialog .file-pagetext p{margin:0 0 1em}#fileDialog .file-pagetext h4{margin:0 0 14px;font:600 13px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#7a6b4e;letter-spacing:.06em;text-transform:uppercase}#fileDialog .file-empty{padding:28px 24px;color:#5b6570}
.dkla-missing-image{padding:18px 20px;margin:8px 0;background:#f1e9d6;color:#4a3d22;border-radius:8px;font-size:14px;line-height:1.5;max-width:640px}.dkla-missing-image code{font-size:13px}
#fileDialog #fileFindResults{position:absolute;top:58px;right:14px;z-index:2;background:#141e27;border:1px solid #3a4a58;border-radius:10px;max-width:420px;max-height:50vh;overflow:auto;box-shadow:0 10px 30px #0009}
#fileDialog #fileFindResults button{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid #26333f;color:#e4ebf1;padding:8px 12px;cursor:pointer}#fileDialog #fileFindResults button:hover{background:#1f2a35}#fileDialog #fileFindResults small{display:block;color:#93a7b7;font-size:11.5px}
#fileDialog .file-note{padding:24px;font-size:15px}#fileDialog .file-note button{background:none;border:0;color:#dabd94;text-decoration:underline;cursor:pointer;font:inherit}
.search-sources{border-top:1px solid #26333f;margin-top:4px}
.dkla-file-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}.dkla-file-chips button{background:#1f2a35b8;color:#dabd94;border:1px solid #435466;border-radius:16px;font-size:12px;padding:5px 11px;cursor:pointer}.dkla-file-chips button:hover{background:#26333f}
.source-link.file-link small::after{content:" · opens inside the atlas"}
@media(min-width:760px){body.study-mode #mapWelcome h1,body.study-mode #mapWelcome p{display:none}#mapWelcome{top:66px}}
@media(max-width:700px){#fileDialog{width:100vw;height:100vh;border-radius:0}#fileDialog .file-title span{max-width:90vw}}
</style>
"""
if 'id="dklaR11SourceStyles"' not in html:
    anchor = '</head><body class="study-mode">'
    assert html.count(anchor) == 1
    html = html.replace(anchor, CSS + anchor)
html = html.replace('Source coverage and gaps →', 'Sources on file →')
for a, b in [("The assigned Berk and Cross readings and full 2026–2027 Civil Procedure supplement remain source gaps.", "Berk v. Choy, Cross v. United States and the full 2026–2027 Civil Procedure supplement are on file in added-sources/."),
             ("Remaining separate-source gaps", "Separately assigned sources"),
             ("complete assigned chapters and source gaps", "complete assigned chapters and separately supplied sources"),
             ("Separate missing readings remain visible", "Separately supplied readings open from their files")]:
    html = html.replace(a, b)
h1 = "help=function(){modal('Explore, read, and keep your place',`<div class=\"modal-copy\">"
assert html.count(h1) == 1
html = html.replace(h1, h1 + "<h3>Original files</h3><p>The atlas reads its sources from two folders beside <code>DKLA-r8.html</code>: <code>added-sources/</code> (opinions, the Civil Procedure supplement, the Contracts Selections) and <code>DKLA-sources/</code> (the scanned casebook and packet pages). Download the repository as a ZIP and open the HTML from inside it. When a folder is missing, every source still opens as text inside the atlas, with a link to the original on GitHub.</p>")
# r11b: the atlas always opens on the universe; the last camera view is kept for Back but not restored on load
for a, b in [("if(data.studyMap.view)restoreView(data.studyMap.view);else home('Atlas',false,false);", "home('Atlas',false,false);S.history=[];"),
             ("if(goodView)restoreView(cachedView);else{home('Atlas',false,false);S.history=[];}", "home('Atlas',false,false);S.history=[];"),
             ("document.title='DKLA — Danny Kind Legal Atlas';", "document.title='DKLA — Danny Kind Legal Atlas · r11b';")]:
    assert html.count(a) == 1, a[:60]
    html = html.replace(a, b)
cond = "if(cached&&cached.dklaRelease?.contentBuild===base.dklaRelease?.contentBuild&&data.revision===r7InitialRevision"
assert html.count(cond) == 1
html = html.replace(cond, "if(cached&&cached.dklaRelease?.contentBuild===base.dklaRelease?.contentBuild&&cached.studyMap?.layoutId===base.studyMap?.layoutId&&data.revision===r7InitialRevision").replace('Source coverage & gaps', 'Sources and coverage')
html = html.replace("'relationshipLens','lrsSourceDialog','dklaOverview']", "'relationshipLens','lrsSourceDialog','dklaOverview','fileDialog','mapTip']").replace("'rawPageText','civilSourceDialog','relationshipLens']", "'rawPageText','civilSourceDialog','relationshipLens','fileDialog','mapTip']")
open(HTML, 'w', encoding='utf-8').write(html)
print('r11 sources applied')
