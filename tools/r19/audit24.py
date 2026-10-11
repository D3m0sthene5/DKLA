"""Reproducible inventory and consistency audit; not a legal-accuracy certificate."""
import hashlib
import json
from pathlib import Path
import re
import runpy
import sys
from collections import Counter

from assemble import build_data, script_blocks, SOURCE, ROOT, DATA

data, full = build_data()
graph = json.loads(script_blocks(SOURCE.read_text())["seedData"])
compiler = runpy.run_path(str(ROOT / 'tools/cold-call/compile.py'))
cold = compiler['compile_cases'](json.loads((ROOT / 'tools/cold-call/cases.json').read_text()), graph, data, full)
runpy.run_path(str(ROOT / 'tools/cold-call/validate.py'))['validate'](cold, graph, full, data)
reviewed, fixes = {}, []
for folder in ['review', 'review-supporting']:
    for path in sorted((DATA / folder).glob('*.json')):
        for key, review in json.loads(path.read_text()).items():
            bid = data['map'].get(key, key)
            reviewed[bid] = bool(review.get('checked'))
            for fix in review.get('fixes', []):
                fixes.append((bid, fix))
                current = data['sections'].get(bid, {})
                field = fix.get('section')
                text = current.get('rule', '') if field == 'rule' else current.get('sections', {}).get(field, '')
                old, new = fix.get('was', ''), fix.get('now', '')
                assert not (old and old != new and old in text and new not in text), f'{bid}: a recorded conversion correction regressed'

corrections = json.loads((DATA / 'accuracy24.json').read_text())
for change in corrections['changes']:
    bid, field = change['id'], change['field']
    text = full[bid] if field == 'full' else data['sections'][bid]['rule'] if field == 'rule' else data['sections'][bid]['sections'][field]
    assert change['to'] in text and change['from'] not in text, f'{bid}: correction not propagated'

# Literal mismatch screening produces candidates, never automatic legal repairs.
number_resolutions = {
    ('CP-COMP-CB-CAP-194', '$240'): 'The full brief gives the same $145–240 million range.',
    ('CP-COMP-CB-LOWER-051', '1979'): 'The full brief says suit was filed in 1980 and death occurred the preceding year.',
}
number_flags = []
for bid, brief in data['sections'].items():
    original = re.sub(r'[,\s]', '', full[bid])
    for field, text in [('rule', brief['rule']), *brief['sections'].items()]:
        for match in re.finditer(r'(?<![\w§])(?:\$[\d,]+(?:\.\d+)?|\b(?:18|19|20)\d{2}\b)', text):
            value = match[0]
            if re.sub(r'[,\s]', '', value) not in original:
                assert (bid, value) in number_resolutions, f'{bid}: unresolved literal date/currency candidate {value}'
                number_flags.append(dict(id=bid, field=field, value=value, resolution=number_resolutions[bid, value]))

fresh = {
    'CP-ATLAS-CALDER': 'Targeted primary-source check of Calder’s first name; not a fresh complete brief review.',
    'CP-038': 'Targeted primary-source check of the filing district and 1991 filing date.',
    'CP-ATLAS-PIMENTEL': 'Agency-name clarification, including the differing name in the Supreme Court opinion.',
    'LRS-ATLAS-N-OHIO-EPA': 'Proposed-disapproval counts and the distinction between interim relief and final invalidation.',
    'CP-DKLA-HURN': 'Complete Hurn opinion compared; later-history claims checked in Gibbs and §§ 1338(b), 1367.',
    'CP-SUP-BERK': 'Rule 8 holding and Jackson’s different Rule 3/12 rationale checked in the official January 2026 opinion.',
    'LRS-SUP-0011-SLAUGHTER': 'June 2026 merits holding, vote alignment, Humphrey’s overruling and reserved questions checked against the official opinion.',
    'LRS-CLOSURE-063': 'The quoted policymaking-appointee language checked against 29 U.S.C. § 630(f).',
}
meta = {e['id']:e for e in json.loads((DATA / 'meta.json').read_text())['entries']}
records = []
stories = {c.get('briefId'):c for c in cold['cases'] if c.get('briefId')}
for entry in data['entries']:
    bid = entry[0]
    records.append(dict(id=bid, title=entry[1], course=entry[2], main=entry[6],
        fullSha256=hashlib.sha256(full[bid].encode()).hexdigest(), words=len(full[bid].split()),
        inheritedStatus=meta[bid]['status'], sourceLimited=entry[3]=='limited',
        conversionReviewRecord=bool(reviewed.get(bid)),
        sourceReviewSupplement=data['audit'].get(bid, {}).get('v'),
        freshSourceCheck=fresh.get(bid),
        checks=['nonempty-text', 'unique-case-mapping'] + (['narrative-source-fingerprint', 'authored-narrative-schema'] if bid in stories else []),
        coldCallNarrative='authored' if bid in stories else 'pending',
        newClaimByClaimCertification=False))

report = dict(date='2026-10-11', release='v2.4',
    scope='Full-inventory mechanical consistency checks plus specified fresh source comparisons. Existing review records are inherited evidence, not newly repeated reviews. No corpus-wide claim-by-claim certification or citator check.',
    counts=dict(briefs=len(full), words=sum(len(t.split()) for t in full.values()), coldCalls=len(cold['cases']), pendingNarratives=len(cold['pending']),
                converted=len(data['sections']), conversionReviews=sum(r['conversionReviewRecord'] for r in records),
                recordedConversionFixes=len(fixes), sourceLimited=sum(r['sourceLimited'] for r in records),
                freshSourceChecks=len(fresh), completeFreshBriefComparisons=1, documentedChanges=len(corrections['changes'])),
    resolvedNumberFlags=number_flags,
    coldCallFix='The earlier nested-heading repair did not create narratives. Current Cold Call accepts only individually authored narrative accounts; availability and pending work are counted separately. Original full briefs remain available unchanged.',
    outstanding=['A fresh claim-by-claim primary-source review of the remaining full corpus has not been performed.',
                 '44 source-limited briefs retain their documented gaps.',
                 '38 compact accounts lack a separate conversion-review record in the repository; absence of a record is not a finding of error.',
                 'Archived compilation PDFs and user-edited browser copies are not rewritten by these canonical-text corrections.'],
    records=records)
target = DATA / 'accuracy24-inventory.json'
encoded = json.dumps(report, ensure_ascii=False, indent=2)+'\n'
if '--check' in sys.argv:
    assert target.read_text() == encoded, 'Audit inventory is stale; run tools/r19/audit24.py'
else:
    target.write_text(encoded)
print(json.dumps(report['counts']))
