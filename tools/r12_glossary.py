#!/usr/bin/env python3
"""Revision 12: embed the legal dictionary (added-sources/glossary/glossary.json) as the `dklaGlossary` block and
index which terms each entry uses (`byNode`), so the reading panel can list them and search can find them.
Safe to re-run; skips with a warning when the glossary file is absent."""
import json, os, re, sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'DKLA-r8.html')
GLOSS = os.path.join(ROOT, 'added-sources', 'glossary', 'glossary.json')
if not os.path.exists(GLOSS):
    print('no glossary yet; skipping'); sys.exit(0)
html = open(HTML, encoding='utf-8').read()
g = json.load(open(GLOSS, encoding='utf-8'))
terms = g['terms']
m = re.search(r'<script id="seedData"[^>]*>', html); s0, e0 = m.end(), html.find('</script>', m.end())
data = json.loads(html[s0:e0])

STOP = {'law', 'court', 'case', 'state', 'act', 'rule', 'party', 'parties', 'right', 'rights', 'judge', 'trial', 'claim', 'order', 'opinion', 'issue',
        'holding', 'fact', 'facts', 'plaintiff', 'defendant', 'appeal', 'statute', 'contract', 'agreement', 'legal', 'federal', 'judgment', 'motion', 'question',
        'majority', 'dissent', 'evidence', 'notice', 'damages', 'term', 'terms', 'action', 'person', 'property', 'power', 'interest', 'test', 'standard', 'united states',
        'supreme court', 'district court', 'circuit', 'record', 'review', 'decision', 'time', 'year', 'money', 'good', 'goods', 'sale', 'offer', 'value', 'title', 'note'}
norm = lambda s: re.sub(r'\s+', ' ', re.sub(r"[^a-z0-9' ]+", ' ', s.lower())).strip()
try:
    from wordfreq import zipf_frequency
except ImportError:
    zipf_frequency = lambda w, l: 0
CURATED = lambda src: not re.search(r"Black's|Bouvier", src or '')
def legal_enough(t):
    # Only terms a law student would look up: curated glossary entries, or dictionary words that are rare in ordinary English.
    k = norm(t['term']); words = k.split()
    if len(k) < 4 or len(k) > 60 or k in STOP or '.' in t['term'] or any(len(w) == 1 for w in words):
        return False
    if re.match(r'(?i)(an? )?abbreviation', (t.get('definition') or '').split(':')[-1].strip()):
        return False
    if CURATED(t.get('source')):
        return len(words) > 1 or zipf_frequency(k, 'en') < 4.6
    if len(words) == 1:
        return zipf_frequency(k, 'en') < 3.8
    return min(zipf_frequency(w, 'en') for w in words) < 4.3 and any(len(w) > 3 for w in words)
curated_key = {}
by_key = {}
for t in sorted(terms, key=lambda t: (not CURATED(t.get('source')), t['term'])):
    k = norm(t['term'])
    if legal_enough(t) and k not in by_key:
        by_key[k] = t['slug']; curated_key[k] = CURATED(t.get('source'))
for t in terms:
    if t['term'].isupper() and len(t['term']) > 3:
        t['term'] = t['term'].lower()
print(len(terms), 'terms;', len(by_key), 'usable for matching')

def grams(text):
    w = norm(text).split(); out = set()
    for n in (1, 2, 3, 4):
        for i in range(len(w) - n + 1):
            out.add(' '.join(w[i:i + n]))
    return out

hits = {}
for n in data['nodes']:
    text = ' '.join([n.get('title', ''), n.get('summary', ''), n.get('notes', '') or '', *[str(v) for v in (n.get('sections') or {}).values()]])
    gs = grams(text)
    found = [k for k in by_key if k in gs]
    if found:
        hits[n['id']] = found
df = Counter(k for ks in hits.values() for k in ks)
N = max(1, len(data['nodes']))
by_node = {}
for nid, ks in hits.items():
    ranked = sorted((k for k in ks if df[k] <= N * .35), key=lambda k: (not curated_key[k], -(k.count(' ')), zipf_frequency(k.split()[0], 'en') if len(k.split()) == 1 else 0, df[k], k))
    by_node[nid] = [by_key[k] for k in ranked[:24]]
print(len(by_node), 'entries with terms;', sum(len(v) for v in by_node.values()), 'links')
block_obj = {'source': g.get('source', ''), 'built': g.get('built', ''), 'titles': {n['id']: n.get('shortTitle') or n['title'] for n in data['nodes'] if n['id'] in by_node}, 'terms': [{k: t[k] for k in ('term', 'slug', 'definition', 'source', 'url') if k in t} for t in terms], 'byNode': by_node}
sj = json.dumps(block_obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
block = f'<script id="dklaGlossary" type="application/json">{sj}</script>\n'
if 'id="dklaGlossary"' in html:
    html = re.sub(r'<script id="dklaGlossary" type="application/json">.*?</script>\n', lambda _: block, html, count=1, flags=re.S)
else:
    html = html.replace('<script id="dklaIcons"', block + '<script id="dklaIcons"', 1)
open(HTML, 'w', encoding='utf-8').write(html)
print('dklaGlossary block', len(sj) // 1024, 'KB')
