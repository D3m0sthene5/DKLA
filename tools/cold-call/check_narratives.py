"""Check narrative identity/provenance and report coverage without inventing review.

Schema checks cannot establish semantic quality. Individual authoring reviews and
the original source text remain necessary; low-length flags require inspection.
"""
import argparse
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import re
import runpy
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/r19'))
from assemble import build_data, script_blocks, SOURCE

parser = argparse.ArgumentParser()
parser.add_argument('--require-complete', action='store_true')
parser.add_argument('--write', action='store_true')
args = parser.parse_args()
data, full = build_data()
graph = json.loads(script_blocks(SOURCE.read_text())['seedData'])
directory = ROOT / 'tools/cold-call'
compiler = runpy.run_path(str(directory / 'compile.py'))
stories = compiler['compile_cases'](json.loads((directory / 'cases.json').read_text()), graph, data, full)
validate = runpy.run_path(str(directory / 'validate.py'))['validate']
validate(stories, graph, full, data)
# Regression: availability must never be mistaken for authored narrative content.
# Check the rejection behavior as well as accepting the current corpus.
for mutation, message in (
    (lambda c: c.update(origin='brief'), 'indexed origin'),
    (lambda c: c['sections'][0].update(spans=[[0, 1]]), 'indexed source span'),
    (lambda c: c.update(briefSha256='0' * 64), 'stale source fingerprint'),
):
    example = deepcopy(stories['cases'][0])
    mutation(example)
    try:
        validate(dict(schemaVersion=3, cases=[example]), graph, full)
    except AssertionError:
        pass
    else:
        raise AssertionError(f'Validator accepted {message}')
records = []
number_resolutions = {
    ('lrs-o-dames-moore', '$1'): 'The source writes one billion dollars; the narrative writes $1 billion.',
    ('hamer', '1877'): 'The pilot cites the opinion directly: 124 N.Y. 549 records the March 1, 1877 assignment to Libbie. Rechecked in the linked Justia opinion on 2026-10-11.',
    ('cp-pennoyer', '1865'): 'The pilot cites the opinion directly: 95 U.S. 716–717 records the November 13, 1865 publication order. Rechecked in the linked Justia opinion on 2026-10-11.',
}
for story in stories['cases']:
    paragraphs = [p for section in story['sections'] for p in section['paragraphs']]
    text = '\n\n'.join(paragraphs)
    words = len(text.split())
    source_words = len(full[story['briefId']].split()) if story.get('briefId') else None
    flags = []
    if source_words and words < 0.6 * source_words:
        flags.append('Narrative is under 60% of full-brief length; inspect for omitted detail. Length alone is not a verdict.')
    if any(re.match(r'^#{1,4}\s|^(?:Parties|Material Facts|Procedural History|Issue|Holding|Reasoning):', p) for p in paragraphs):
        flags.append('Possible residual brief label in prose; inspect.')
    number_candidates = []
    if story.get('briefId'):
        source = re.sub(r'[,\s]', '', full[story['briefId']])
        for value in sorted(set(re.findall(r'(?<![\w§])(?:\$[\d,]+(?:\.\d+)?|\b(?:18|19|20)\d{2}\b)', text))):
            if re.sub(r'[,\s]', '', value) not in source:
                number_candidates.append(dict(value=value, resolution=number_resolutions.get((story['id'],value))))
    records.append(dict(id=story['id'], title=story['title'], briefId=story.get('briefId'),
        words=words, sourceWords=source_words, episodes=len(story['sections']),
        narrativeSha256=hashlib.sha256(text.encode()).hexdigest(),
        sourceSha256=story.get('briefSha256', story.get('atlasSha256')),
        basis=story.get('review', {}).get('basis', 'Original pilot with recorded opinion-source comparison.'),
        reviewFlags=flags, literalNumberCandidates=number_candidates))
report = dict(date='2026-10-11', version='v2.4', coverage=stories['coverage'], rejectionRegressions=3,
    method='Individually authored narrative prose. No brief-section fallback. Automated checks verify identity, source fingerprints and schema, not the truth of every sentence or absence of every ambiguous antecedent.',
    cases=sorted(records, key=lambda c:c['id']), pending=stories['pending'])
if args.write:
    (directory / 'coverage.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(dict(coverage=report['coverage'], flaggedForReading=sum(bool(c['reviewFlags']) for c in records), unresolvedLiteralNumbers=[dict(id=c['id'],candidates=[n for n in c['literalNumberCandidates'] if not n['resolution']]) for c in records if any(not n['resolution'] for n in c['literalNumberCandidates'])], rejectionRegressions=3), ensure_ascii=False))
if args.require_complete:
    assert not stories['pending'], f"{len(stories['pending'])} case narratives remain unwritten"
