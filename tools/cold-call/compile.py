"""Compile individually authored Cold Call narratives.

The legacy index_brief helper is retained solely for historical regression tests.
It must not be used as a production narrative generator.

Legacy index description:

Line ranges refer to dklaR19Full, already embedded in the atlas. Facts precede
procedure; analysis and separate opinions precede the final disposition. Within
each passage the author's order and qualifications remain intact. Unknown
headings stay with the surrounding passage rather than being interpreted as events.
"""
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
import hashlib
import re
import json
from pathlib import Path

COURSES = ['Contracts', 'Civil Procedure', 'Legislation and the Regulatory State']
HEADING = re.compile(r'^(#{1,4})\s+(.+?)\s*$')
PHASES = {0: 'People and context', 10: 'Events', 20: 'Proceedings', 30: 'Questions',
          40: 'Holding and arguments', 50: 'Reasoning', 60: 'Separate opinions',
          70: 'Disposition', 80: 'Study notes', 90: 'Sources and limits'}
CUES = {
    0: 'Introduce the case using the identifying details provided in this section.',
    10: 'Tell these events in order. Who did what, and what happened as a result?',
    20: 'Trace the proceedings. Who asked each court for what relief, and what did that court do?',
    30: 'State the precise question and the competing positions.',
    40: 'State the holding, its conditions, and the arguments it resolves.',
    50: 'Explain each step of the court’s reasoning and connect it to the facts.',
    60: 'Identify each separate opinion, its position, and its disagreement with the other opinions.',
    70: 'Name the judgment under review and state exactly what the reviewing court did.',
    80: 'Explain these qualifications and how they affect your account of the decision.',
    90: 'Identify what the assigned materials establish and what they leave unresolved.',
}


def clean_heading(text):
    return re.sub(r'^(?:\d+[.)]|[IVX]+[.)])\s*', '', text).strip().strip('*')


def normalize(text):
    text = re.sub(r'\([^)]*\)|\bcontinued\b', '', text.lower())
    return re.sub(r'[^a-z0-9]+', '', text)


def phase_for(title, previous, substantive):
    t = title.lower().replace('’', "'")
    if re.search(r'^(citation|case orientation|court[, ]|decision and (?:setting|posture|procedural|assigned)|participation and source)', t):
        return 0
    if re.search(r'\b(?:facts?|factual|background|chronology|transaction|contract and dispute|settlement chronology)\b', t):
        return 20 if 'procedural chronology' in t and 'facts' not in t else 10
    if re.search(r'procedur|proceedings?|litigation|posture', t):
        return 20
    if re.search(r'^(?:parties|participants|people)', t):
        return 0
    if re.search(r'\b(?:dissent|concurrence|concurring|separate (?:opinion|writing))', t):
        return 60
    if re.search(r'\b(?:reasoning|analysis|rationale|application)\b', t):
        return 50
    if re.search(r'\b(?:issue|issues|question|questions)\b', t) and not re.search(r'exam|study', t):
        return 30
    if re.search(r'\b(?:holding|holdings|rules?|arguments?|positions)\b', t):
        return 40
    if re.search(r'\b(?:judgment|disposition|result)\b', t):
        return 70
    if re.search(r'\b(?:source|sources|scope|coverage|limits|status|verification|identity|assigned passage)\b', t):
        return 90 if substantive else 0
    if re.search(r'\b(?:notes|study|exam|significance|synthesis|use)\b', t):
        return 80
    return previous


def index_brief(text, title):
    lines = text.split('\n')
    # A heading inside Reasoning or a separate opinion belongs to that account.
    # Sorting every heading independently can turn a dissent into a holding or
    # move an analysis of procedural injury into the procedural history.
    section_depth = min((len(m[1]) for line in lines if (m := HEADING.match(line)) and len(m[1]) > 1), default=2)
    titles = Counter(clean_heading(m[2]) for line in lines if (m := HEADING.match(line)))
    caption = normalize(title)
    blocks, current = [], {'title': 'Case context', 'lines': []}
    ignored = set()
    previous, substantive = 0, False
    for index, line in enumerate(lines):
        match = HEADING.match(line)
        if match:
            heading = clean_heading(match[2])
            norm = normalize(heading)
            # PDF running captions are layout artifacts. Their continuation text
            # belongs to the preceding passage, including mid-sentence continuations.
            repeated_caption = ('v' in norm and titles[heading] > 1 and
                                (caption.startswith(norm) or norm.startswith(caption)))
            if match[1] == '#' or repeated_caption or norm == caption:
                ignored.add(index)
                continue
            if len(match[1]) > section_depth:
                current['lines'].append(index)
                continue
            if current['lines']:
                blocks.append(current)
            phase = phase_for(heading, previous, substantive)
            substantive |= phase in (10, 20, 30, 40, 50, 60, 70)
            previous = phase
            current = {'title': heading, 'phase': phase, 'lines': []}
            ignored.add(index)
        elif re.match(r'^\*\*(?:Course|ID):\*\*\s', line):
            ignored.add(index)
        elif line.strip():
            current['lines'].append(index)
        else:
            current['lines'].append(index)
    if current['lines']:
        blocks.append(current)
    blocks = [b for b in blocks if any(lines[i].strip() for i in b['lines'])]
    for ordinal, block in enumerate(blocks):
        block.setdefault('phase', 0)
        block['ordinal'] = ordinal
        # Compact consecutive lines. Store source positions, not a second copy of
        # the brief: all details and citations are rendered on demand from it.
        spans = []
        for i in block.pop('lines'):
            if spans and spans[-1][1] == i:
                spans[-1][1] += 1
            else:
                spans.append([i, i + 1])
        block['spans'] = spans
    used = {i for b in blocks for start, end in b['spans'] for i in range(start, end)}
    required = {i for i, line in enumerate(lines) if line.strip() and i not in ignored}
    assert required <= used, f'{title}: source text lost during indexing'
    assert sum(end-start for b in blocks for start,end in b['spans']) == len(used), f'{title}: duplicated source passage'
    blocks.sort(key=lambda b: (b['phase'], b['ordinal']))
    return [dict(id=f'passage-{b["ordinal"]+1}', title=b['title'], phase=b['phase'],
                 cue=CUES[b['phase']], spans=b['spans'],
                 sources=[{'id': 'brief', 'pinpoint': b['title']}]) for b in blocks]


def compile_cases(manual, graph, briefs, full):
    """Publish authored accounts only. A source brief is not a narrative fallback."""
    result = deepcopy(manual)
    result['schemaVersion'] = 3
    for account in result['cases']:
        account.setdefault('origin', 'narrative')
    directory = Path(__file__).resolve().parent / 'narratives'
    paths = sorted(directory.glob('*.json'))
    # Hundreds of small files: read a few at a time (see tools/source/tree.py).
    with ThreadPoolExecutor(16) as pool:
        texts = list(pool.map(lambda p: p.read_text(encoding='utf-8'), paths, chunksize=16))
    for path, text in zip(paths, texts):
        account = json.loads(text)
        assert path.stem == account['id'], f'{path.name}: file and case identities differ'
        assert account.get('origin') == 'narrative', f'{path.name}: only authored narratives may be compiled'
        result['cases'].append(account)
    ids = set()
    for account in result['cases']:
        assert account['id'] not in ids, f"Duplicate authored account: {account['id']}"
        ids.add(account['id'])
    inventory = {n['id']: dict(id=n['id'], title=n['title'], course=n['courses'][0])
                 for n in graph['nodes'] if n['kind'] == 'Case'}
    for bid, title, course, status, _, _, atlas_id in briefs['entries']:
        cid = atlas_id or 'brief-' + bid
        inventory[cid] = dict(id=cid, title=title, course=COURSES[course], briefId=bid)
    assert ids <= inventory.keys(), f'Unknown authored cases: {sorted(ids-inventory.keys())}'
    result['pending'] = [inventory[cid] for cid in sorted(inventory.keys()-ids)]
    result['coverage'] = dict(
        mapCases=sum(not cid.startswith('brief-') for cid in ids),
        supportingCases=sum(cid.startswith('brief-') for cid in ids),
        customNarratives=len(ids), total=len(ids), pending=len(result['pending']),
        pendingMapCases=sum(not c['id'].startswith('brief-') for c in result['pending']),
        pendingSupportingCases=sum(c['id'].startswith('brief-') for c in result['pending']),
        supportingColdCallsOptional=True,
        inventoryMapCases=sum(not cid.startswith('brief-') for cid in inventory),
        inventorySupportingCases=sum(cid.startswith('brief-') for cid in inventory),
        inventoryTotal=len(inventory))
    return result
