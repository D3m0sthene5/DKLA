#!/usr/bin/env python3
"""Revision 12: each course is laid out by design, not by syllabus order.

Reads the three course designs (scratchpad/layout/{contracts,civil,legislation}.json, written by the layout
agents: region positions, background zones, spine links and annotation labels whose geometry encodes how the
course is organised), places the three clusters around a common centre so the atlas reads as one universe of
three worlds, moves every region with its subtopics and entry homes, and adds the legal-dictionary box beside
the study workbench. Runs after tools/r11_route_layout.py (which sets step, routeLabel and courseKey) and
refuses to run twice (layoutId).
"""
import json, math, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'DKLA-r8.html')
DESIGNS = os.environ.get('DKLA_LAYOUTS', os.path.join(ROOT, 'tools', 'r12'))
FILES = {'Contracts': 'contracts.json', 'Civil Procedure': 'civil.json', 'Legislation and the Regulatory State': 'legislation.json'}
ANGLES = {'Contracts': -90, 'Civil Procedure': 150, 'Legislation and the Regulatory State': 30}

html = open(HTML, encoding='utf-8').read()
m = re.search(r'<script id="seedData"[^>]*>', html); s0, e0 = m.end(), html.find('</script>', m.end())
data = json.loads(html[s0:e0]); M = data['studyMap']
if M.get('layoutId') == 'r12-designed-clusters':
    sys.exit('r12 layout already applied')
R = {r['id']: r for r in M['regions']}
homes_by_region, districts_by_region = {}, {}
for hid, h in M['homes'].items():
    homes_by_region.setdefault(h['region'], []).append(h)
for did, d in M['districts'].items():
    districts_by_region.setdefault(d['region'], []).append(d)


def move(r, nx, ny):
    dx, dy = nx - r['x'], ny - r['y']
    r['x'], r['y'] = nx, ny
    for d in districts_by_region.get(r['id'], []):
        d['x'] += dx; d['y'] += dy
        if 'supportStart' in d: d['supportStart'] += dy
    for h in homes_by_region.get(r['id'], []):
        h['x'] += dx; h['y'] += dy


def overlaps(a, b, gap=0):
    return a['x'] - gap < b['x'] + b['w'] and a['x'] + a['w'] + gap > b['x'] and a['y'] - gap < b['y'] + b['h'] and a['y'] + a['h'] + gap > b['y']


designs = {}
for course, fn in FILES.items():
    d = json.load(open(os.path.join(DESIGNS, fn), encoding='utf-8'))
    ids = [x['id'] for x in d['regions']]
    expected = sorted(r['id'] for r in M['regions'] if r.get('courseKey') == course)
    assert sorted(ids) == expected, f'{course}: design regions {sorted(set(ids) ^ set(expected))} differ from the atlas'
    # bounding box of the design in its own frame
    xs = [x['x'] for x in d['regions']] + [z['x'] for z in d.get('zones', [])]
    ys = [x['y'] for x in d['regions']] + [z['y'] for z in d.get('zones', [])]
    x2 = [x['x'] + R[x['id']]['w'] for x in d['regions']] + [z['x'] + z['w'] for z in d.get('zones', [])]
    y2 = [x['y'] + R[x['id']]['h'] for x in d['regions']] + [z['y'] + z['h'] for z in d.get('zones', [])]
    d['_box'] = {'x': min(xs), 'y': min(ys), 'w': max(x2) - min(xs), 'h': max(y2) - min(ys)}
    designs[course] = d

# place the three clusters as a tight triangle: Civil Procedure and LRS side by side, Contracts centred above them
GAP = 2600
bc, bcp, bl = designs['Contracts']['_box'], designs['Civil Procedure']['_box'], designs['Legislation and the Regulatory State']['_box']
row_w = bcp['w'] + GAP + bl['w']
boxes = {'Civil Procedure': {'x': -row_w / 2, 'y': 0, 'w': bcp['w'], 'h': bcp['h']},
         'Legislation and the Regulatory State': {'x': -row_w / 2 + bcp['w'] + GAP, 'y': 0, 'w': bl['w'], 'h': bl['h']},
         'Contracts': {'x': -bc['w'] / 2, 'y': -bc['h'] - GAP, 'w': bc['w'], 'h': bc['h']}}
radius = 0
M['courseDesign'] = {}
for course, d in designs.items():
    b = d['_box']; t = boxes[course]
    ox, oy = t['x'] - b['x'], t['y'] - b['y']
    for x in d['regions']:
        r = R[x['id']]; move(r, round(x['x'] + ox), round(x['y'] + oy)); r['why'] = x.get('why', ''); r.pop('arm', None)
    M['courseDesign'][course] = {
        'concept': d.get('concept', ''),
        'zones': [{**z, 'x': round(z['x'] + ox), 'y': round(z['y'] + oy)} for z in d.get('zones', [])],
        'spine': d.get('spine', []),
        'labels': [{**l, 'x': round(l['x'] + ox), 'y': round(l['y'] + oy)} for l in d.get('labels', [])],
    }
# the study workbench and the legal dictionary sit to the right of everything, apart from the courses
allx2 = max(t['x'] + t['w'] for t in boxes.values()); ally = min(t['y'] for t in boxes.values())
wb = R['workbench-region']; move(wb, round(allx2 + 4200), round(ally + 1200)); wb['courseKey'] = 'Study notes'
if 'dictionary-region' not in R:
    M['regions'].append({'id': 'dictionary-region', 'title': 'Legal dictionary', 'kicker': 'Reference', 'description': 'Every legal term with a definition. Search a term from the search bar, or open the box to browse.',
                         'x': wb['x'], 'y': wb['y'] + wb['h'] + 700, 'w': 2400, 'h': 1300, 'col': 3, 'row': 1, 'color': '#b7a6d6', 'courseKey': 'Study notes', 'special': 'glossary', 'districtIds': [], 'step': None, 'routeLabel': ''})
    R['dictionary-region'] = M['regions'][-1]
for r in M['regions']:
    assert not any(overlaps(r, q) for q in M['regions'] if q is not r), f"overlap at {r['id']}"
M['courseBlocks'] = {c: {k: round(v) for k, v in t.items()} for c, t in boxes.items()}
M['layoutId'] = 'r12-designed-clusters'
M['view'] = None
data['history'].append({'at': '2026-09-26T00:00:00Z', 'action': 'Revision 12: courses laid out by design (formation core, court-access threshold, separation of powers); legal dictionary added', 'revision': 12})
out = json.dumps(data, ensure_ascii=False, separators=(',', ':')); assert '</' not in out
open(HTML, 'w', encoding='utf-8').write(html[:s0] + out + html[e0:])
for c, t in boxes.items():
    print(c, {k: round(v) for k, v in t.items()})
print('radius', radius, '| workbench', wb['x'], wb['y'])
