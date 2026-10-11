"""Index existing full briefs for Cold Call without duplicating or summarizing their text.

Line ranges refer to dklaR19Full, already embedded in the atlas. Facts precede
procedure; analysis and separate opinions precede the final disposition. Within
each passage the author's order and qualifications remain intact. Unknown
headings stay with the surrounding passage rather than being interpreted as events.
"""
from collections import Counter
from copy import deepcopy
import hashlib
import re

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
    result = deepcopy(manual)
    result['schemaVersion'] = 2
    nodes = {n['id']: n for n in graph['nodes']}
    done = {c['id'] for c in result['cases']}
    for case in result['cases']:
        case['origin'] = 'narrative'
    for brief_id, title, course, status, _, _, atlas_id in briefs['entries']:
        case_id = atlas_id or 'brief-' + brief_id
        if case_id in done:
            continue
        text = full[brief_id]
        digest = hashlib.sha256(text.encode()).hexdigest()
        sections = index_brief(text, title)
        sources = [{'id': 'brief', 'label': 'Full case brief', 'briefId': brief_id}]
        node = nodes.get(atlas_id, {})
        for i, source in enumerate(node.get('sources', [])):
            url = source.get('url', '')
            if url and (url.startswith(('https://', '#book=', '#civ=', '#lrs=', '#supp=', 'added-sources/', 'DKLA-sources/'))):
                sources.append({'id': f'original-{i}', 'label': source.get('label') or 'Assigned source',
                                **({'path':url} if url.startswith(('added-sources/','DKLA-sources/')) else {'url':url})})
        result['cases'].append(dict(id=case_id, briefId=brief_id, title=node.get('title', title),
            course=COURSES[course], citation='', revision='brief-' + digest[:12],
            origin='brief', briefSha256=digest, sources=sources, sections=sections,
            notice='The existing brief identifies limits in the available source material.' if status == 'limited' else '',
            lead='', actors=[], proceedings=[], limits=''))
        done.add(case_id)
    # One main-map case has a detailed atlas account but no separate full brief.
    # Preserve that account and its precise source qualification instead of
    # manufacturing a fuller opinion or silently hiding its launch control.
    for node in graph['nodes']:
        if node['kind'] != 'Case' or node['id'] in done:
            continue
        sources = [{'id': f'original-{i}', 'label': s['label'], 'url': s['url']}
                   for i,s in enumerate(node.get('sources', [])) if s.get('url')]
        reference = [{'id': sources[0]['id'], 'pinpoint': 'Assigned account'}] if sources else []
        sections = []
        for i,(heading,body) in enumerate(node.get('sections', {}).items()):
            if not body.strip():
                continue
            phase = phase_for(heading,0,False)
            sections.append(dict(id=f'account-{i+1}', title=heading, phase=phase,
                cue=CUES[phase], paragraphs=body.split('\n\n'), sources=reference))
        sections.sort(key=lambda s:s['phase'])
        if node.get('notes'):
            sections.append(dict(id='record-limits', title='Source qualifications', phase=90,
                cue=CUES[90], paragraphs=node['notes'].split('\n\n'), sources=reference))
        digest = hashlib.sha256(str(node.get('sections', {})).encode()).hexdigest()
        result['cases'].append(dict(id=node['id'],title=node['title'],course=node['courses'][0],
            citation='',revision='atlas-'+digest[:12],origin='atlas',sources=sources,
            sections=sections,lead='',actors=[],proceedings=[],limits='',
            notice='This account follows the assigned translated excerpt; the source qualifications are included below.'))
        done.add(node['id'])
    result['coverage'] = {'mapCases': sum(n['kind']=='Case' for n in graph['nodes']),
        'supportingCases': sum(not e[6] for e in briefs['entries']),
        'customNarratives': len(manual['cases']), 'total': len(result['cases'])}
    return result
