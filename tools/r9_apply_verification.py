#!/usr/bin/env python3
"""Apply the September 2026 case-brief verification (tools/verification-2026-09.json) to seedData.

The verification compared 193 of the 379 case entries with Quimbee, Studicata, Casebriefs,
Oyez, Justia and Wikipedia snippets. This script:
  - rewrites the fields the reviewers found wrong (corrections listed in CORRECTIONS below,
    each checked by hand before being applied),
  - appends the useful additions (votes, opinion authors, citations, facts) to the entry notes,
  - links each case to the additional concepts the reviewers identified, both as a topic on the
    case (so it appears in the concept's case index) and as a connection.
Run once from the DKLA folder; it refuses to run twice. Only the standard library is used.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'DKLA-r8.html')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'tools', 'verification-2026-09.json')
TODAY = '2026-09-23T00:00:00Z'

html = open(HTML, encoding='utf-8').read()
m = re.search(r'<script id="seedData"[^>]*>', html)
s0, e0 = m.end(), html.find('</script>', m.end())
data = json.loads(html[s0:e0])
nodes = {n['id']: n for n in data['nodes']}
if any(e['id'].startswith('r9v-') for e in data['edges']):
    sys.exit('Verification already applied.')
V = json.load(open(SRC, encoding='utf-8'))
errors = {(e['id'], e['field']): e for e in V['errors'] if e.get('correction')}


def sec(nid, name):
    return nodes[nid]['sections'][name]


def set_sec(nid, name, text):
    nodes[nid]['sections'][name] = text
    nodes[nid]['updatedAt'] = TODAY


def set_so(nid, text):
    nodes[nid].setdefault('learning', {})['separateOpinions'] = text
    nodes[nid]['updatedAt'] = TODAY


def corr(nid, field):
    return errors[(nid, field)]['correction']


# ---- corrections checked by hand -------------------------------------------------------------
for nid in ['cp-anderson-liberty', 'cp-eisen', 'cp-conley', 'cp-provident', 'cp-woods', 'cp-ziervogel',
            'lrs-o-chenery-i', 'lrs-n-standing-raines', 'lrs-o-arnett', 'taylor-caldwell']:
    set_sec(nid, 'Procedural History', corr(nid, 'procedure'))
for nid in ['cp-smith', 'cp-burnham', 'cp-piper', 'cp-lasa', 'cosby', 'cp-transunion', 'cp-woods', 'cp-eisen']:
    set_so(nid, corr(nid, 'separateOpinions'))
f = sec('graham', 'Material Facts')
assert 'for a 1978 concert tour' in f
set_sec('graham', 'Material Facts', f.replace('four contracts for a 1978 concert tour', 'four contracts in 1973 for concerts by Leon Russell'))
f = sec('lrs-o-midwest-oil', 'Material Facts')
assert 'President Taft’s 1910 order' in f
set_sec('lrs-o-midwest-oil', 'Material Facts', f.replace('President Taft’s 1910 order', 'President Taft’s September 1909 order')
        .replace('He acted to prevent depletion of reserves during international tension while Congress reconsidered its policy.',
                 'He acted to keep the Navy’s future fuel supply from being sold off while Congress reconsidered its policy; Midwest Oil entered the land in 1910, after the withdrawal.'))
set_sec('lrs-o-little', 'Material Facts', corr('lrs-o-little', 'facts'))
applied_errors = 13 + 8

# ---- additions -------------------------------------------------------------------------------
added = 0
for a in V['additions']:
    n = nodes.get(a['id'])
    if not n or not a.get('what'):
        continue
    what = a['what'].strip()
    if not what.endswith(('.', '”', '"', ')')):
        what += '.'
    n['notes'] = ((n.get('notes') or '').rstrip() + '\n\n' + what).strip()
    n['updatedAt'] = TODAY
    added += 1
# reviewer notes that came without a fetched source but match the record
for u in V['errors']:
    if u.get('unverified') and u.get('what') and u['id'] in nodes:
        n = nodes[u['id']]
        n['notes'] = ((n.get('notes') or '').rstrip() + '\n\n' + u['what'].strip()).strip()
        n['updatedAt'] = TODAY
        added += 1

# ---- extra concept links ---------------------------------------------------------------------
linked = 0
per_case = {}
existing = {(e['source'], e['target']) for e in data['edges']} | {(e['target'], e['source']) for e in data['edges']}
for x in V['extra']:
    cid, kid = x['id'], x['conceptId']
    if cid not in nodes or kid not in nodes or per_case.get(cid, 0) >= 3:
        continue
    n = nodes[cid]
    topics = n.setdefault('learning', {}).setdefault('topics', {})
    if kid in topics:
        continue
    why = x.get('why', '').strip() or 'Bears on this question.'
    topics[kid] = why
    if (cid, kid) not in existing:
        data['edges'].append({'id': f'r9v-{cid}--{kid}', 'source': cid, 'target': kid, 'label': 'Bears on',
                              'kind': 'Doctrine', 'explanation': why, 'status': 'Proposed', 'supports': [],
                              'sources': (n.get('sources') or [])[:1], 'createdAt': TODAY, 'updatedAt': TODAY})
        existing.add((cid, kid))
    per_case[cid] = per_case.get(cid, 0) + 1
    n['updatedAt'] = TODAY
    linked += 1

data['history'].append({'at': TODAY, 'action': f'Verification applied: {applied_errors} fields corrected, {added} additions, {linked} concept links', 'revision': data['revision']})
print(f'{applied_errors} fields corrected, {added} additions appended, {linked} concept links added ({sum(1 for e in data["edges"] if e["id"].startswith("r9v-"))} new connections)')
out = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
assert '</' not in out
open(HTML, 'w', encoding='utf-8').write(html[:s0] + out + html[e0:])
print('wrote', HTML)
