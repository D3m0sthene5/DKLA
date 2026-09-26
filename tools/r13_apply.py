#!/usr/bin/env python3
"""Revision 13: MiniSearch (MIT) plus ranked, fuzzy search; reporter citations as links; a print stylesheet."""
import os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'DKLA-r8.html')
html = open(HTML, encoding='utf-8').read()
LIB = open(os.path.join(ROOT, 'tools', 'r13', 'minisearch.umd.js'), encoding='utf-8').read()
SEARCH = open(os.path.join(ROOT, 'tools', 'r13', 'search.js'), encoding='utf-8').read()
CITE = open(os.path.join(ROOT, 'tools', 'r13', 'cite.js'), encoding='utf-8').read()
for src in (LIB, SEARCH, CITE):
    assert '</script>' not in src
blocks = ('<script id="dklaMiniSearch">\n/* MiniSearch 7.2.0, MIT licence, https://github.com/lucaong/minisearch */\n' + LIB + '\n</script>\n'
          '<script id="dklaR13Search">\n' + SEARCH + '</script>\n'
          '<script id="dklaR13Cite">\n' + CITE + '</script>\n')
if 'id="dklaMiniSearch"' in html:
    html = re.sub(r'<script id="dklaMiniSearch">.*?</script>\n<script id="dklaR13Search">.*?</script>\n<script id="dklaR13Cite">.*?</script>\n', lambda _: blocks, html, count=1, flags=re.S)
else:
    m = re.search(r'<script id="dklaR12Glossary">', html); e = html.find('</script>\n', m.end()) + len('</script>\n')
    html = html[:e] + blocks + html[e:]
CSS = """<style id="dklaR13Styles">
#searchResults mark{background:none;color:#f2dcb4;font-weight:700}
::highlight(dkla-hit){background-color:#dabd9440;color:inherit}
#inspector a.cite-link{color:#c9b8e6;text-decoration:underline dotted;text-underline-offset:2px}#inspector a.cite-link.file-link{color:#dabd94;text-decoration-style:solid}#inspector a.cite-link.file-link::after{content:" ↗";font-size:.8em}
@media print{
 body{background:#fff!important;color:#000!important}
 body *{visibility:hidden}
 #inspector,#inspector *{visibility:visible}
 #inspector{position:absolute!important;left:0!important;top:0!important;right:auto!important;bottom:auto!important;width:100%!important;height:auto!important;overflow:visible!important;background:#fff!important;color:#000!important;border:0!important;box-shadow:none!important;font:11.5pt/1.5 Georgia,serif!important}
 #inspector .reader-body{padding:0 0 30px!important}
 #inspector *{background:none!important;background-color:transparent!important;box-shadow:none!important;border-color:#bbb!important}
 #inspector .dkla-terms,#inspector .dkla-file-chips,#inspector .source-strip,#inspector nav{display:none!important}
 #inspector h1,#inspector h2,#inspector h3,#inspector strong,#inspector .takeaway,#inspector p,#inspector li,#inspector small,#inspector span{color:#000!important}
 #inspector .takeaway,#inspector .dkla-rule{border-left:3px solid #000!important;padding-left:12px!important;background:none!important}
 #inspector button,#inspector .dkla-file-chips,#inspector .dkla-term-chips,#inspector .dkla-course-tabs,#inspector [aria-label="Close"],#inspector .reader-close{display:none!important}
 #inspector a{color:#000!important;text-decoration:none!important}
 #inspector a[href^="http"]::after{content:" (" attr(href) ")";font-size:.8em;color:#444}
 #inspector section,#inspector .dkla-timeline,#inspector details{break-inside:avoid}
 #inspector details{display:block}#inspector details>*{display:block}
 @page{margin:18mm 16mm}
}
</style>
"""
if 'id="dklaR13Styles"' not in html:
    anchor = '</head><body class="study-mode">'
    assert html.count(anchor) == 1
    html = html.replace(anchor, CSS + anchor)
# open every collapsed section before printing, and close the ones we opened afterwards
hook = "<script id=\"dklaR13Print\">window.addEventListener('beforeprint',()=>{document.querySelectorAll('#inspector details:not([open])').forEach(d=>{d.open=true;d.dataset.printOpened='1';});});window.addEventListener('afterprint',()=>{document.querySelectorAll('#inspector details[data-print-opened]').forEach(d=>{d.open=false;delete d.dataset.printOpened;});});</script>\n"
if 'id="dklaR13Print"' not in html:
    m = re.search(r'<script id="dklaR13Cite">', html); e = html.find('</script>\n', m.end()) + len('</script>\n')
    html = html[:e] + hook + html[e:]
h1 = "<h3>Original files</h3>"
if h1 in html and 'Ctrl+K (Cmd+K on a Mac)' not in html:
    html = html.replace(h1, "<h3>Search and print</h3><p>The search bar forgives typos and word order (\"promisory estopel\" finds Promissory estoppel) and ranks titles first; press <code>/</code> or Ctrl+K (Cmd+K on a Mac) to jump to it. Reporter citations in any brief are links: to the opinion on file, or to Justia and CourtListener. Print (Ctrl+P) while an entry is open to get a clean one-page handout of that entry; \"Save as PDF\" keeps it.</p>" + h1, 1)
open(HTML, 'w', encoding='utf-8').write(html)
print('r13 applied')
