#!/usr/bin/env python3
"""Revision 14b: the Cornell LII Wex articles about cases the atlas teaches become sources on those case entries
(added-sources/glossary/wex-cases.json, written by tools/r14/wex_dictionary.py): a source chip linking to the
Wex article and a paragraph in the entry's notes with the article text. Safe to re-run."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'DKLA-r8.html'); WC = os.path.join(ROOT, 'added-sources', 'glossary', 'wex-cases.json')
if not os.path.exists(WC):
    print('no wex-cases.json; skipping'); raise SystemExit(0)
wc = json.load(open(WC, encoding='utf-8'))
html = open(HTML, encoding='utf-8').read()
m = re.search(r'<script id="seedData"[^>]*>', html); s0, e0 = m.end(), html.find('</script>', m.end())
data = json.loads(html[s0:e0]); byId = {n['id']: n for n in data['nodes']}
done = 0
for nid, w in wc.items():
    n = byId.get(nid)
    if not n: continue
    label = 'Cornell LII Wex · ' + w['term']
    n.setdefault('sources', [])
    if not any(s.get('url') == w['url'] for s in n['sources']):
        n['sources'].append({'label': label, 'url': w['url']})
    para = 'Cornell LII Wex on this case (' + w['url'] + '): ' + w['text']
    if 'Cornell LII Wex on this case' not in (n.get('notes') or ''):
        n['notes'] = ((n.get('notes') or '').rstrip() + '\n\n' + para).strip()
    tags = n.setdefault('tags', [])
    if 'r14-wex' not in tags: tags.append('r14-wex')
    done += 1
out = json.dumps(data, ensure_ascii=False, separators=(',', ':')); assert '</' not in out
open(HTML, 'w', encoding='utf-8').write(html[:s0] + out + html[e0:])
print('Wex case articles attached to', done, 'entries')
