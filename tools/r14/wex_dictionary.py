#!/usr/bin/env python3
"""Revision 14b: the legal dictionary is Cornell LII Wex and nothing else.

Reads the page text and link annotations extracted from added-sources/Cornell_Wex_Dictionary_2026-09-26.pdf
(wex_pages.json, made by tools/r14/wex_extract.py), parses the 5,654 articles, and writes:
  added-sources/glossary/glossary.json   every Wex article that is not a case, plus the case articles that are not
                                         in the atlas and are substantive enough to keep (see KEEP_CASE);
  added-sources/glossary/wex-cases.json  the Wex articles about cases the atlas already teaches, keyed by node id,
                                         applied to the case entries by tools/r14_wex_cases.py.
Black's (1910), Bouvier, the court glossaries and the editorial entries of revision 12 are dropped: Wex is the source."""
import json, re, os, sys, collections, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SC = os.environ.get('DKLA_SCRATCH', os.path.dirname(os.path.abspath(__file__)))
pages = json.load(open(os.path.join(SC, 'wex_pages.json')))
HDR = re.compile(r'^CORNELL LII WEX\s*$|^Dictionary compilation\s*$|^26 September 2026\s*$|^\d{1,4}\s*$')
lines = []
for p in pages[2:]:  # pages 1-2: cover and the register of 19 pages Cornell returned 404 for
    for ln in p['text'].split('\n'):
        s = ln.strip()
        if s and not HDR.match(s): lines.append((p['n'], s))
entries = []; i = 0; N = len(lines)
while i < N:
    pg, s = lines[i]
    if i + 1 < N and lines[i + 1][1] == 'Source on Cornell Wex':
        j = i + 2; body = []
        while j < N and not (j + 1 < N and lines[j + 1][1] == 'Source on Cornell Wex'):
            body.append(lines[j][1]); j += 1
        entries.append({'term': s, 'page': pg, 'body': body}); i = j
    else: i += 1
key = lambda s: re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower())
urls_by_page = collections.defaultdict(dict)
for p in pages:
    for l in p['links']:
        u = l['uri']
        if 'law.cornell.edu/wex/' in u:
            slug = u.rstrip('/').split('/wex/')[-1].split('#')[0]
            urls_by_page[p['n']].setdefault(key(slug), 'https://www.law.cornell.edu/wex/' + slug)
matched = wrapped = 0
for idx, e in enumerate(entries):
    us = urls_by_page.get(e['page'], {})
    if key(e['term']) in us: e['url'] = us[key(e['term'])]; matched += 1; continue
    pb = entries[idx - 1]['body'] if idx else []
    for k in (1, 2, 3):  # headings that wrapped onto several lines
        if len(pb) >= k and key(''.join(pb[-k:]) + e['term']) in us:
            e['url'] = us[key(''.join(pb[-k:]) + e['term'])]; e['term'] = ' '.join(pb[-k:] + [e['term']]); del pb[-k:]; matched += 1; wrapped += 1; break
UNAV = re.compile(r'^(Source page unavailable|Cornell returned HTTP 404|Definition text could not be retrieved)', re.I)
def clean(body):
    t = ' '.join(s for s in body if not re.match(r'^\[Last (reviewed|updated).*\]$', s, re.I))
    t = re.sub(r'\[Last (reviewed|updated)[^\]]*\]', '', t, flags=re.I)
    t = re.sub(r'(\w)- (\w)', r'\1\2', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return re.split(r'\s(?:See also|Categories?|Keywords|wex definitions|Wex Definitions Team):', t)[0].strip()
wex = []; unavailable = 0
for e in entries:
    d = clean(e['body'])
    if not d or UNAV.search(d[:120]) or len(d) < 40: unavailable += 1; continue
    if len(d) > 2200: d = d[:2200].rsplit('. ', 1)[0] + '.'
    slug = e['url'].rstrip('/').split('/wex/')[-1] if e.get('url') else re.sub(r'[^a-z0-9]+', '_', unicodedata.normalize('NFKD', e['term']).encode('ascii', 'ignore').decode().lower()).strip('_')
    wex.append({'term': e['term'], 'slug': slug, 'definition': d, 'source': 'LII Wex', 'url': e.get('url') or 'https://www.law.cornell.edu/wex/' + slug, 'liiVerified': True, 'urlVerified': bool(e.get('url'))})
print(f'{len(entries)} articles parsed, {len(wex)} with definitions, {unavailable} unavailable, {matched} links matched, {wrapped} wrapped headings repaired')

# ---- cases: Wex articles about a decided case
CASE = re.compile(r'^[A-Z][^()]*\sv\.?\s+[A-Z(]|^(In re|Ex parte)\s+[A-Z]')
html = open(os.path.join(ROOT, 'DKLA-r8.html'), encoding='utf-8').read()
m = re.search(r'<script id="seedData"[^>]*>', html); data = json.loads(html[m.end():html.find('</script>', m.end())])
cases = [n for n in data['nodes'] if n.get('kind') == 'Case']
def parties(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower().replace(' vs. ', ' v. ').replace(' vs ', ' v. ')
    s = re.sub(r'\(.*?\)|—.*$|\b(18|19|20)\d\d\b', '', s)
    s = re.sub(r"\b(inc|co|corp|ltd|llc|et al|the|of|and|company|corporation|city|state|united states)\b\.?", '', s)
    s = re.sub(r'[^a-z0-9 v.]', '', s)
    parts = [p.split() for p in re.split(r'\bv\.?\s', s, maxsplit=1)]
    return tuple(' '.join(p[:2]) for p in parts) if len(parts) == 2 and all(p for p in parts) else None
by_parties = {}; by_first = collections.defaultdict(list)
for n in cases:
    for t in (n.get('title'), n.get('shortTitle')):
        p = parties(t)
        if p: by_parties.setdefault(p, n['id']); by_first[p[0].split()[0]].append((n['id'], n.get('title')))
wex_cases = {}; kept_cases = []; dropped_cases = []; review = []
KEEP_CASE = lambda t: len(t['definition']) >= 500  # a substantive Wex article, not a stub
out = []
for t in wex:
    if not CASE.match(t['term']): out.append(t); continue
    p = parties(t['term'])
    nid = by_parties.get(p)
    if not nid and p:
        cand = [c for c in by_first.get(p[0].split()[0], []) if parties(c[1]) and parties(c[1])[1].split()[:1] == p[1].split()[:1]]
        if len(cand) == 1: nid = cand[0][0]
        elif cand: review.append((t['term'], cand))
    if nid:
        wex_cases[nid] = {'term': t['term'], 'url': t['url'], 'text': t['definition']}
    elif KEEP_CASE(t): kept_cases.append(t['term']); out.append({**t, 'kind': 'case'})
    else: dropped_cases.append(t['term'])
out.sort(key=lambda t: t['term'].lower())
G = {'source': 'Cornell LII Wex, complete catalogue as of 26 September 2026 (added-sources/Cornell_Wex_Dictionary_2026-09-26.pdf), parsed by tools/r14/wex_dictionary.py; CC BY-SA 4.0',
     'built': '2026-09-27', 'terms': out}
json.dump(G, open(os.path.join(ROOT, 'added-sources', 'glossary', 'glossary.json'), 'w', encoding='utf-8'), ensure_ascii=False)
json.dump(wex_cases, open(os.path.join(ROOT, 'added-sources', 'glossary', 'wex-cases.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'dictionary: {len(out)} Wex terms ({sum(1 for t in out if t.get("kind")=="case")} landmark cases kept) | atlas cases with a Wex article: {len(wex_cases)} | case stubs dropped: {len(dropped_cases)}')
print('atlas matches:', {k: v['term'] for k, v in wex_cases.items()})
print('dropped stubs:', dropped_cases)
print('review (ambiguous):', review)
