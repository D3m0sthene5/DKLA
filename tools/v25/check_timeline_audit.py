#!/usr/bin/env python3
"""Check review coverage, source drift and timeline structure; not legal truth.

Run from any directory with the repository's Python runtime. The audit is a
human-authored review record: this checker must never mark unread sources read
or silently regenerate the ledger when the source hashes change.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/r19'))
import assemble


def digest(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def check():
    timeline_path = ROOT / 'tools/r19/data/timelines.json'
    raw = json.loads(timeline_path.read_text(encoding='utf-8'))
    audit = json.loads((ROOT / 'tools/v25/timeline-audit.json').read_text(encoding='utf-8'))
    problems = []
    if hashlib.sha256(timeline_path.read_bytes()).hexdigest() != audit.get('timelinesSha256'):
        problems.append('Timeline data changed after the recorded review; review the change and update its ledger deliberately.')
    data, full = assemble.build_data()
    baseline = (ROOT / 'DKLA-r18.html').read_text(encoding='utf-8')
    seed = json.loads(re.search(r'<script[^>]*id="seedData"[^>]*>(.*?)</script>', baseline, re.S).group(1))
    nodes = {n['id']: n for n in seed['nodes']}
    nodes.update({n['id']: n for n in json.loads((ROOT / 'tools/r19/data/rules22.json').read_text(encoding='utf-8'))['rules']})
    provisions = json.loads((ROOT / 'tools/r19/data/provisions.json').read_text(encoding='utf-8'))
    # The assembler checks dates, order, origin position, objects and clickable destinations.
    assemble.load_timelines(nodes, {e[0] for e in data['entries'] if not e[6]})
    records = {(r['timelineId'], r['step']): r for r in audit['stepReviews']}
    contexts = {r['id']: r for r in audit['timelineReviews']}
    if len(records) != len(audit['stepReviews']):
        problems.append('Duplicate per-step review records.')
    if len(contexts) != len(audit['timelineReviews']):
        problems.append('Duplicate timeline context review records.')
    expected = set()
    allowed_kinds = {'Court decision', 'Restatement', 'Model UCC text', 'Federal rule', 'Federal statute', 'State statute', 'Foreign statute'}
    primary = {p['id']: p for p in audit['primaryChecks']}
    for p in primary.values():
        if not p.get('url', '').startswith('https://') or not p.get('pinpoints') or not p.get('basis') or not p.get('checkedIssues'):
            problems.append(f"Incomplete primary source record: {p.get('id')}")
    for t in raw['timelines']:
        context = contexts.get(t['id'], {})
        if not t.get('guide') or t.get('summaryLabel') != 'What these sources establish':
            problems.append(f"{t['id']}: missing guide or scoped synthesis label.")
        if not context.get('reviewedInCompleteContext') or context.get('stepCount') != len(t['steps']):
            problems.append(f"{t['id']}: context record no longer matches.")
        for index, step in enumerate(t['steps'], 1):
            address = (t['id'], index)
            expected.add(address)
            record = records.get(address)
            k = step.get('id') or step.get('sup') or step.get('event')
            if not record or record.get('key') != k:
                problems.append(f'{address}: absent or mismatched review record.')
                continue
            if step.get('authorityKind') not in allowed_kinds or record.get('authorityKind') != step.get('authorityKind'):
                problems.append(f'{address}: absent or mismatched authority kind.')
            if record.get('freshCompleteOpinionReview') is not False:
                problems.append(f'{address}: unexpected claim of complete fresh opinion review.')
            if step['turn'] == 'divided' and not step.get('effect'):
                problems.append(f'{address}: divided reasoning needs a precise visible effect label.')
            for p in record.get('independentPrimaryChecks', []):
                if p not in primary:
                    problems.append(f'{address}: unknown primary check {p}.')
            basis = record.get('basis', {})
            cid = data['map'].get(step.get('id'), step.get('sup'))
            if cid:
                canonical = data['sections'].get(cid)
                if basis.get('briefId') != cid or not canonical:
                    problems.append(f'{address}: inherited canonical source is missing or changed.')
                elif basis.get('comparedRuleSha256') != digest(canonical['rule']):
                    problems.append(f'{address}: canonical rule changed after review.')
                if cid in full and basis.get('effectiveFullBriefSha256') != digest(full[cid]):
                    problems.append(f'{address}: saved full brief changed after review.')
                if not (ROOT / basis.get('savedBriefPath', '')).is_file():
                    problems.append(f'{address}: saved brief path is missing.')
            else:
                node_key = step.get('id') or step.get('link')
                body = json.dumps({'node': nodes.get(node_key, {}), 'provision': provisions.get(node_key, {})}, ensure_ascii=False, sort_keys=True)
                if basis.get('nodeId') != node_key or basis.get('savedAccountSha256') != digest(body):
                    problems.append(f'{address}: saved provision/account changed after review.')
    if set(records) != expected:
        problems.append('Review inventory contains missing or extra steps.')
    if set(contexts) != {t['id'] for t in raw['timelines']}:
        problems.append('Context inventory contains missing or extra timelines.')
    counts = audit['coverage']
    actual_primary_steps = sum(bool(r['independentPrimaryChecks']) for r in records.values())
    if counts['timelines'] != len(raw['timelines']) or counts['steps'] != len(expected) or counts['freshPrimaryDocuments'] != len(primary) or counts['stepsWithFreshPrimaryComparison'] != actual_primary_steps:
        problems.append('Reported coverage counts do not match the ledger.')
    if problems:
        raise ValueError('\n'.join(problems))
    return dict(status='pass', timelines=len(raw['timelines']), steps=len(expected),
                freshPrimaryDocuments=len(primary), stepsWithFreshPrimaryComparison=actual_primary_steps,
                scope='Integrity and recorded coverage checks only; not a proof of legal accuracy.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--json', action='store_true', help='Print structured verification result.')
    args = parser.parse_args()
    try:
        result = check()
    except (ValueError, KeyError, OSError) as e:
        print(f'Timeline audit check failed: {e}', file=sys.stderr)
        sys.exit(1)
    print(json.dumps(result, indent=2) if args.json else f"PASS: {result['timelines']} timelines, {result['steps']} review records, {result['freshPrimaryDocuments']} targeted primary documents. Coverage/structure/source-drift checks only.")
