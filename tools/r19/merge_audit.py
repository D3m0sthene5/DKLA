"""Collect Claude's audit of the briefs Codex left unreviewed.

usage: python3 tools/r19/merge_audit.py <dir with out/aNN.json and briefs/<id>.md>
Writes data/audit.json (one report per audited brief) and data/audited/<id>.md (the corrected brief,
where corrections were made). The Codex originals in data/briefs/ are never changed.
"""
import json, shutil, sys
from pathlib import Path
DATA = Path(__file__).resolve().parent / 'data'; src = Path(sys.argv[1])
meta = {m['id'] for m in json.loads((DATA / 'meta.json').read_text())['entries']}
audit = {}; (DATA / 'audited').mkdir(exist_ok=True)
for out in sorted((src / 'out').glob('a*.json')):
    for cid, rep in json.loads(out.read_text()).items():
        if cid not in meta or rep.get('verdict') not in ('clean', 'corrected', 'could-not-audit'): print('skip', out.name, cid); continue
        fixed = src / 'briefs' / (cid + '.md')
        if rep['verdict'] == 'corrected':
            if not fixed.is_file(): print('corrected but no corrected brief:', cid); continue
            shutil.copy(fixed, DATA / 'audited' / (cid + '.md'))
        audit[cid] = {k: rep.get(k) for k in ('verdict', 'sources_read', 'coverage', 'findings', 'notes')}
        audit[cid]['findings'] = audit[cid]['findings'] or []
(DATA / 'audit.json').write_text(json.dumps({k: audit[k] for k in sorted(audit)}, ensure_ascii=False, indent=1) + '\n')
import collections
print(len(audit), 'audited', dict(collections.Counter(a['verdict'] for a in audit.values())), sum(len(a['findings']) for a in audit.values()), 'findings')
