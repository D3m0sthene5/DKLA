"""Check the r16 vote catalogue against the atlas's case entries.

This flags direct Supreme Court opinion sources on unlinked entries. A reporter
citation in commentary is deliberately insufficient: several circuit cases
mention later Supreme Court proceedings, including denials of certiorari.
Run from the repository root: python3 tools/r17/scotus-coverage.py
"""
import collections
import json
import re
from pathlib import Path


html = Path('DKLA-r16.html').read_text()
seed = re.search(r'<script id="seedData" type="application/json">(.*?)</script>', html, re.S)
assert seed, 'seedData missing'
nodes = json.loads(seed.group(1))['nodes']
records = json.loads(Path('scotus-r16/history-data.json').read_text())['cases']
by_id = {n['id']: n for n in nodes}
assert records.keys() <= by_id.keys(), 'SCOTUS record without an atlas entry'
for id_, c in records.items():
    assert c['decisions'] and c['sources'], id_
    for d in c['decisions']:
        assert d['votes'] and all(v.get('source') for v in d['votes']), id_

unlinked = [n for n in nodes if n['kind'] == 'Case' and n['id'] not in records]
direct = []
for n in unlinked:
    title = n['title'].lower()
    notes = n.get('notes', '')
    urls = [s.get('url', '').lower() for s in n.get('sources', [])]
    if ('supreme court of the united states' in title
            or re.search(r'\bCourt:\s*(?:U\.S\.|United States) Supreme Court\b', notes, re.I)
            or any(re.search(r'(?:supreme\.justia\.com/cases/federal/us/|oyez\.org/cases/|supremecourt\.gov/opinions/)', u)
                   for u in urls)):
        direct.append((n['id'], n['title']))
assert not direct, f'Potential unlinked SCOTUS opinions; verify these: {direct}'

legacy_aliases = {
    'lrs-gap-04-03': 'lrs-k-train',
    'lrs-gap-06-01': 'lrs-k-epic',
    'lrs-gap-11-01': 'lrs-s-slaughter',
}
assert all(by_id[k]['kind'] == 'Note' and v in records for k, v in legacy_aliases.items())

print(json.dumps({
    'case_entries': sum(n['kind'] == 'Case' for n in nodes),
    'case_entries_with_sourced_SCOTUS_votes': sum(n['kind'] == 'Case' and n['id'] in records for n in nodes),
    'additional_case_titled_notes_with_SCOTUS_votes': sum(n['kind'] != 'Case' and n['id'] in records for n in nodes),
    'unlinked_case_entries_by_course': dict(sorted(collections.Counter(n['courses'][0] for n in unlinked).items())),
    'unlinked_entries_with_direct_SCOTUS_opinion_sources': len(direct),
    'legacy_SCOTUS_source_notes_linked_to_their_case_records': legacy_aliases,
}, indent=2))
