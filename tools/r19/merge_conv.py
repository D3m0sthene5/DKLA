"""Merge converted batches into data/sections.json, keyed by Codex id and stamped with the brief's hash.

usage: python3 tools/r19/merge_conv.py <dir with out/*.json> [--rev TAG]
Batches for cases on the map are keyed by atlas id and carry "codex_id"; batches for supporting cases are
keyed by Codex id directly and may hold {"skip": "..."} for a source that is not a decision.
Entries already in sections.json are kept unless a batch supplies a newer one. --rev marks the merged
entries as a re-conversion so the atlas replaces text it applied earlier.
"""
import json, sys
from pathlib import Path
DATA = Path(__file__).resolve().parent / 'data'
conv = Path(sys.argv[1]); REV = sys.argv[sys.argv.index('--rev') + 1] if '--rev' in sys.argv else None
meta = {m['id']: m for m in json.loads((DATA / 'meta.json').read_text())['entries']}
path = DATA / 'sections.json'
sections = json.loads(path.read_text()) if path.is_file() else {}
KEYS = ['Parties', 'Procedural History', 'Material Facts', 'Issue', 'Holding', 'Reasoning']
# The converters wrote "the source brief"; in the atlas that text sits directly below as the Full brief.
def wording(t): return t.replace('The source brief', 'The full brief').replace('the source brief', 'the full brief')
# Hand corrections from the review of the verifiers' close calls: [codex id, section or "rule", was, now].
PATCHES = json.loads((DATA / 'patches.json').read_text()) if (DATA / 'patches.json').is_file() else []
added = 0
for out in sorted((conv / 'out').glob('*.json')):
    for key, e in json.loads(out.read_text()).items():
        cid = e.get('codex_id', key)
        if cid in meta and 'skip' in e: sections[cid] = {'sha': meta[cid]['sha'], 'skip': e['skip'].strip()}; added += 1; continue
        if cid not in meta or list(e.get('sections', {}).keys()) != KEYS: print('skip', out.name, key); continue
        sections[cid] = {'sha': meta[cid]['sha'], 'rule': wording(e['rule'].strip()), 'sections': {k: wording(e['sections'][k].strip()) for k in KEYS}}; added += 1
        if REV: sections[cid]['rev'] = REV
for cid, key, was, now, *rev in PATCHES:
    e = sections[cid]; text = e['rule'] if key == 'rule' else e['sections'][key]
    if rev: e['rev'] = rev[0]  # the atlas re-applies an entry whose revision tag changed
    if was not in text and now in text: continue
    assert text.count(was) == 1, (cid, key, was)
    if key == 'rule': e['rule'] = text.replace(was, now)
    else: e['sections'][key] = text.replace(was, now)
path.write_text(json.dumps({k: sections[k] for k in sorted(sections)}, ensure_ascii=False, indent=0) + '\n')
print(added, 'merged;', len(sections), 'total')
