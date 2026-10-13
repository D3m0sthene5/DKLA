"""Verify the scope and fingerprints of the individually recorded main-case review.

This is a drift/coverage check. It cannot establish factual accuracy or replace
reading a case against its sources. Supplemental accounts are outside its scope.
"""
import hashlib
import json
from pathlib import Path
import runpy
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/r19'))
from assemble import SOURCE, build_data, script_blocks


def account_hash(account):
    return hashlib.sha256(json.dumps(account, ensure_ascii=False, sort_keys=True,
                                    separators=(',', ':')).encode('utf-8')).hexdigest()


def check():
    directory = ROOT / 'tools/cold-call'
    audit = json.loads((directory / 'main-audit.json').read_text(encoding='utf-8'))
    graph = json.loads(script_blocks(SOURCE.read_text(encoding='utf-8'))['seedData'])
    data, full = build_data()
    compiler = runpy.run_path(str(directory / 'compile.py'))['compile_cases']
    stories = compiler(json.loads((directory / 'cases.json').read_text(encoding='utf-8')),
                       graph, data, full)
    runpy.run_path(str(directory / 'validate.py'))['validate'](stories, graph, full, data)
    main = {n['id'] for n in graph['nodes'] if n['kind'] == 'Case'}
    accounts = {c['id']: c for c in stories['cases'] if c['id'] in main}
    records = audit['cases']
    reviewed = {r['id'] for r in records}
    assert len(reviewed) == len(records), 'Duplicate main-case audit record'
    assert reviewed == main == accounts.keys(), 'Main-case audit coverage differs from illustrated map cases'
    assert audit['scope']['mainCases'] == len(main), 'Incorrect recorded scope count'
    assert audit['scope']['supplementalCasesReviewed'] == 0, 'Supporting accounts are outside this audit'
    checks = ('facts', 'chronology', 'antecedents', 'litigation', 'reasoning',
              'separateOpinions', 'sourceLimits')
    for record in records:
        cid = record['id']
        account = accounts[cid]
        text = '\n\n'.join(p for s in account['sections'] for p in s['paragraphs'])
        assert record['narrativeSha256'] == hashlib.sha256(text.encode('utf-8')).hexdigest(), f'{cid}: reviewed narrative changed'
        assert record['accountSha256'] == account_hash(account), f'{cid}: reviewed account fields changed'
        assert record['sourceSha256'] == account.get('briefSha256', account.get('atlasSha256')), f'{cid}: reviewed source changed'
        assert record['checkedOn'] and record['basis'], f'{cid}: missing review provenance'
        assert all(record['checked'].get(k) is True for k in checks), f'{cid}: incomplete recorded comparison'
        assert record['verdict'] in ('revised', 'retained', 'source-limited'), f'{cid}: invalid review result'
        assert record['opening'] in ('events-first', 'filing-is-first-supported-event'), f'{cid}: missing opening assessment'
    spot_checks = audit['spotChecks']
    assert len(spot_checks) == len({r['id'] for r in spot_checks}) == 6, 'Focused second-review inventory changed'
    for record in spot_checks:
        cid = record['id']
        text = '\n\n'.join(p for s in accounts[cid]['sections'] for p in s['paragraphs'])
        assert record['verdict'] == 'confirmed', f'{cid}: unresolved second-review finding'
        assert record['narrativeSha256'] == hashlib.sha256(text.encode('utf-8')).hexdigest(), f'{cid}: second-review prose changed'
    print(json.dumps({'mainCasesReviewed': len(records),
                      'narrativesRevised': sum(r['changed'] for r in records),
                      'sourceLimitedRecords': sum(r['verdict'] == 'source-limited' for r in records),
                      'focusedSecondComparisons': len(spot_checks),
                      'scope': 'Full canonical-account comparison; targeted source checks recorded separately.',
                      'semanticAccuracyProvenByThisCheck': False}))


if __name__ == '__main__':
    check()
