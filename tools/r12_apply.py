#!/usr/bin/env python3
"""Revision 12: add the dictionary script block (tools/r12/glossary.js) after the source viewer, plus its styles."""
import os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'DKLA-r8.html')
html = open(HTML, encoding='utf-8').read()
JS = open(os.path.join(ROOT, 'tools', 'r12', 'glossary.js'), encoding='utf-8').read()
assert '</script>' not in JS
block = '<script id="dklaR12Glossary">\n' + JS + '</script>\n'
if 'id="dklaR12Glossary"' in html:
    html = re.sub(r'<script id="dklaR12Glossary">.*?</script>\n', lambda _: block, html, count=1, flags=re.S)
else:
    m = re.search(r'<script id="dklaR11Sources">', html); e = html.find('</script>\n', m.end()) + len('</script>\n')
    html = html[:e] + block + html[e:]
CSS = """<style id="dklaR12Styles">
#glossaryDialog{width:min(1180px,96vw);height:min(90vh,980px);max-width:none;max-height:none;padding:0;border:1px solid #3a4a58;border-radius:12px;background:#111a22;color:#e4ebf1;display:flex;flex-direction:column;overflow:hidden}
#glossaryDialog:not([open]){display:none}#glossaryDialog::backdrop{background:#05090dcc}
#glossaryDialog .gl-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:1px solid #26333f;background:#141e27;flex-wrap:wrap}#glossaryDialog .gl-header strong{font-size:16px;display:block}#glossaryDialog .gl-header span{font-size:12px;color:#93a7b7}
#glossaryDialog .gl-tools{display:flex;gap:8px;align-items:center}#glossaryDialog #glFind{background:#0f171e;color:#e4ebf1;border:1px solid #435466;border-radius:16px;padding:7px 14px;font-size:14px;min-width:260px}#glossaryDialog #glClose{background:#1f2a35;color:#dabd94;border:1px solid #435466;border-radius:16px;font-size:12.5px;padding:6px 12px;cursor:pointer}
#glossaryDialog .gl-letters{display:flex;flex-wrap:wrap;gap:2px;padding:6px 12px;border-bottom:1px solid #26333f}#glossaryDialog .gl-letters button{background:none;border:0;color:#93a7b7;font-size:12px;padding:4px 7px;border-radius:6px;cursor:pointer}#glossaryDialog .gl-letters button[aria-pressed=true]{background:#26333f;color:#e4ebf1}
#glossaryDialog .gl-body{display:grid;grid-template-columns:minmax(260px,34%) 1fr;flex:1;min-height:0}
#glossaryDialog .gl-list{list-style:none;margin:0;padding:0;overflow:auto;border-right:1px solid #26333f}#glossaryDialog .gl-list button{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid #1c2731;color:#e4ebf1;padding:9px 14px;cursor:pointer}#glossaryDialog .gl-list button:hover,#glossaryDialog .gl-list button[aria-pressed=true]{background:#1f2a35}#glossaryDialog .gl-list strong{display:block;font-size:13.5px}#glossaryDialog .gl-list small{display:block;color:#93a7b7;font-size:11.5px;margin-top:2px}#glossaryDialog .gl-more{padding:10px 14px;color:#6f879e;font-size:12px}
#glossaryDialog .gl-detail{overflow:auto;padding:26px 30px 60px;font:16px/1.6 Georgia,serif}#glossaryDialog .gl-detail h2{margin:0 0 12px;font:400 30px/1.2 Georgia,serif;color:#eef0f2}#glossaryDialog .gl-def{font-size:17px}#glossaryDialog .gl-meta{color:#93a7b7;font:13px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}#glossaryDialog .gl-meta a{color:#dabd94}#glossaryDialog .gl-detail h3{margin:26px 0 8px;font:600 12px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#93a7b7}#glossaryDialog .gl-used{display:flex;flex-wrap:wrap;gap:6px}#glossaryDialog .gl-used button,#glossaryDialog .gl-empty{font:13px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}#glossaryDialog .gl-used button{background:#1f2a35b8;color:#dabd94;border:1px solid #435466;border-radius:16px;padding:5px 11px;cursor:pointer}#glossaryDialog .gl-empty{color:#93a7b7}
.search-glossary{border-top:1px solid #26333f;margin-top:4px}
.dkla-terms{margin:18px 0 6px}.dkla-terms h3{margin:0 0 8px;font:600 12px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#93a7b7}.dkla-terms h3 span{background:#26333f;border-radius:10px;padding:1px 7px;margin-left:6px;color:#c9d3dc}.dkla-term-chips{display:flex;flex-wrap:wrap;gap:6px}.dkla-term-chips button{background:#1a2530;color:#c4b7e0;border:1px solid #3d3f5c;border-radius:14px;font-size:12px;padding:4px 10px;cursor:pointer}.dkla-term-chips button:hover{background:#26333f;color:#e4ebf1}
#geoCanvas .zone-title{letter-spacing:.12em}
@media(max-width:760px){#glossaryDialog{width:100vw;height:100vh;border-radius:0}#glossaryDialog .gl-body{grid-template-columns:1fr}#glossaryDialog .gl-list{max-height:40%;border-right:0;border-bottom:1px solid #26333f}}
</style>
"""
if 'id="dklaR12Styles"' not in html:
    anchor = '</head><body class="study-mode">'
    assert html.count(anchor) == 1
    html = html.replace(anchor, CSS + anchor)
open(HTML, 'w', encoding='utf-8').write(html)
print('r12 glossary applied')
