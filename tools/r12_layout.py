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
LAYOUT_ID = 'r14-packed-clusters'  # r12-designed-clusters plus the revision-14d packing; a new id so that a browser's cached copy of the old layout is not restored over it
if M.get('layoutId') in ('r12-designed-clusters', LAYOUT_ID):
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
GAP = 4000  # between Civil Procedure and LRS; the workbench and dictionary sit in it
GAP_Y = 3600  # between Contracts and the row beneath: room for a course name at the phone floor zoom
bc, bcp, bl = designs['Contracts']['_box'], designs['Civil Procedure']['_box'], designs['Legislation and the Regulatory State']['_box']
row_w = bcp['w'] + GAP + bl['w']
boxes = {'Civil Procedure': {'x': -row_w / 2, 'y': 0, 'w': bcp['w'], 'h': bcp['h']},
         'Legislation and the Regulatory State': {'x': -row_w / 2 + bcp['w'] + GAP, 'y': 0, 'w': bl['w'], 'h': bl['h']},
         'Contracts': {'x': -bc['w'] / 2, 'y': -bc['h'] - GAP_Y, 'w': bc['w'], 'h': bc['h']}}
radius = 0
M['courseDesign'] = {}
for course, d in designs.items():
    b = d['_box']; t = boxes[course]
    ox, oy = t['x'] - b['x'], t['y'] - b['y']
    for x in d['regions']:
        r = R[x['id']]; move(r, round(x['x'] + ox), round(x['y'] + oy)); r['why'] = x.get('why', ''); r.pop('arm', None)
    M['courseDesign'][course] = {
        'concept': d.get('concept', ''),
        # zones get 360 units of headroom above their first row of boxes so the zone title and subtitle never sit on a box
        'zones': [{**z, 'x': round(z['x'] + ox), 'y': round(z['y'] + oy) - 360, 'h': z['h'] + 360} for z in d.get('zones', [])],
        'spine': d.get('spine', []),
        'labels': [{**l, 'x': round(l['x'] + ox), 'y': round(l['y'] + oy)} for l in d.get('labels', [])],
    }
# the study workbench and the legal dictionary sit at the centre of the triangle, in the gap between Civil Procedure and LRS
gap_x = (boxes['Civil Procedure']['x'] + bcp['w'] + boxes['Legislation and the Regulatory State']['x']) / 2
wb = R['workbench-region']; move(wb, round(gap_x - wb['w'] / 2), round(boxes['Civil Procedure']['y'] + 900)); wb['courseKey'] = 'Study notes'
if 'dictionary-region' not in R:
    M['regions'].append({'id': 'dictionary-region', 'title': 'Legal dictionary', 'kicker': 'Reference', 'description': 'Every legal term with a definition. Search a term from the search bar, or open the box to browse.',
                         'x': wb['x'], 'y': wb['y'] + wb['h'] + 500, 'w': 2400, 'h': 1300, 'col': 3, 'row': 1, 'color': '#b7a6d6', 'courseKey': 'Study notes', 'special': 'glossary', 'districtIds': [], 'step': None, 'routeLabel': ''})
    R['dictionary-region'] = M['regions'][-1]
CP_HUES = {'cp-orientation-region': '#8fb4d8', 'civil-region': '#a899ee', 'cp-personal-region': '#6f9fd2', 'cp-notice-region': '#7fb8c9', 'cp-subject-region': '#8aa6dc', 'cp-venue-region': '#9ec2cf',
           'cp-governing-region': '#7c93cc', 'extension-iekfaa-1': '#93a8d4', 'cp-pleading-region': '#6fb0c0', 'cp-joinder-region': '#89a9e0', 'cp-class-region': '#9db6d1', 'cp-summary-region': '#7a9fc4'}
for r in M['regions']:
    if r['id'] in CP_HUES:
        r['color'] = CP_HUES[r['id']]
# Revision 14d: the cards and subtopics are packed tight so that the subject and subtopic views look dense.
# Inside every subtopic the cards go into a grid: core cards first, in the author's reading order (rows top to bottom,
# left to right), then a gap, then the support notes; as many columns as fit the box with 24-unit margins and
# gutters (two in a normal 1,100-unit subtopic, four in the two wide extension areas), each card dropping into the
# lowest column, a card wider than one column taking a row of its own. Inside every subject the subtopics go into
# two columns (each into the lower one, in their existing order, 40-unit gutters); the subject keeps its designed
# x, y and width and takes the height of its taller column. Card sizes and every membership are unchanged, and the
# pass is deterministic, so a card the owner moves by hand keeps meaning the same thing on every rebuild.
CARD_MIN, CARD_TOP, CARD_BOTTOM = 18, 12, 24  # least side spacing (shared evenly, 23–32 in practice), pad under the header, bottom margin


def row_gap(cards):
    """Row gap in proportion to the cards' height (10–20 units: 15 for the 84-unit Civil Procedure cards, 18 for the 100-unit
    LRS cards, 10 for the low Contracts notes), so every subtopic reads as one tight block."""
    hs = sorted(h['h'] for h in cards)
    return round(min(20, max(10, .18 * hs[len(hs) // 2]))) if hs else 20
DIST_TOP, DIST_G, DIST_BOTTOM = 150, 40, 48  # first subtopic row below the subject top (the renderer's headroom), gutters, bottom margin
homes_by_district = {}
for h in M['homes'].values():
    homes_by_district.setdefault(h['district'], []).append(h)


def order(items, ox, oy):
    """Reading order: by row, then by column, rounded so that float noise cannot reorder a row."""
    return sorted(items, key=lambda b: (round((b['y'] - oy) / 4), round((b['x'] - ox) / 4), b.get('id', '')))


def pack_columns(items, x0, y0, width, colw, gutter, rowgap, even=False):
    """Drop each box into the lowest of the columns that fit `width`; a box wider than a column spans a full row.
    With `even`, the horizontal room left over is shared equally between margins and gutters (cards in a subtopic);
    otherwise the gutter is fixed and the columns are centred (subtopics in a subject).
    Returns the bottom edge of the content (y0 when there is nothing)."""
    if even:  # `gutter` is the least spacing allowed; margins count as gutters
        ncol = max(1, int((width - gutter) // (colw + gutter)))
        gutter = (width - ncol * colw) / (ncol + 1); left = x0 + gutter
    else:
        ncol = max(1, int((width + gutter) // (colw + gutter)))
        left = x0 + (width - (ncol * colw + (ncol - 1) * gutter)) / 2
    cols = [y0] * ncol
    for b in items:
        if b['w'] > colw + 1e-6 or ncol == 1:  # full row (or a single column)
            y = max(cols); b['x'], b['y'] = round(left), round(y)
            for i in range(ncol): cols[i] = y + b['h'] + rowgap
        else:
            i = min(range(ncol), key=lambda i: (cols[i], i))
            b['x'], b['y'] = round(left + i * (colw + gutter)), round(cols[i])
            cols[i] = cols[i] + b['h'] + rowgap
    return max(cols) - rowgap if items else y0


for d in M['districts'].values():
    hh = homes_by_district.get(d['id'], [])
    head = d.get('headerH', 91)
    core = order([h for h in hh if not h.get('support')], d['x'], d['y'])
    supp = order([h for h in hh if h.get('support')], d['x'], d['y'])
    inner = d['w'] - 2 * CARD_MIN
    for h in hh:
        assert h['w'] <= inner + 1e-6, f"card {h['id']} ({h['w']}) wider than its subtopic {d['id']} ({d['w']})"
    colw = max([h['w'] for h in hh if h['w'] * 2 + CARD_MIN <= inner] or [h['w'] for h in hh] or [inner])
    gap = row_gap(core or supp)
    bottom = pack_columns(core, d['x'], d['y'] + head + CARD_TOP, d['w'], colw, CARD_MIN, gap, even=True)
    d['supportStart'] = round(bottom + gap + 16 if core else d['y'] + head + CARD_TOP)  # the notes sit a little apart from the entries
    if supp:
        bottom = pack_columns(supp, d['x'], d['supportStart'], d['w'], colw, CARD_MIN, gap, even=True)
    d['h'] = round(max(head + 150, bottom + CARD_BOTTOM - d['y'])) if hh else max(head + 150, min(d['h'], 250))
for r in M['regions']:
    ds = [M['districts'][i] for i in r.get('districtIds', []) if i in M['districts']]
    if not ds:
        continue
    for d in ds:
        assert d['w'] <= r['w'], f"subtopic {d['id']} wider than its subject {r['id']}"
    ordered = order(ds, r['x'], r['y'])
    for d in ordered:  # remember where the cards sit relative to the subtopic before it moves
        d['_cards'] = [(h, h['x'] - d['x'], h['y'] - d['y']) for h in homes_by_district.get(d['id'], [])]
    colw = max([d['w'] for d in ds if d['w'] * 2 + DIST_G <= r['w']] or [d['w'] for d in ds])
    bottom = pack_columns(ordered, r['x'], r['y'] + DIST_TOP, r['w'], colw, DIST_G, DIST_G)
    for d in ordered:
        for h, dx, dy in d.pop('_cards'):
            h['x'], h['y'] = round(d['x'] + dx), round(d['y'] + dy)
        # the subtopic moved, so its supportStart is read back from the cards: the top of the first note, else where notes would begin
        hh = homes_by_district.get(d['id'], [])
        supp = [h['y'] for h in hh if h.get('support')]; core = [h for h in hh if not h.get('support')]
        d['supportStart'] = min(supp) if supp else round(max(h['y'] + h['h'] for h in core) + row_gap(core) + 16) if core else d['y'] + d.get('headerH', 91) + CARD_TOP
    r['h'] = round(max(1000, bottom + DIST_BOTTOM - r['y']))
    # every subtopic inside its subject, every card inside its subtopic (with its region and district memberships intact)
    for d in ds:
        assert r['x'] <= d['x'] and d['x'] + d['w'] <= r['x'] + r['w'] + 1e-6 and r['y'] <= d['y'] and d['y'] + d['h'] <= r['y'] + r['h'] + 1e-6, f"subtopic {d['id']} outside {r['id']}"
        for h in homes_by_district.get(d['id'], []):
            assert h['region'] == r['id'] and h['district'] == d['id'], f"card {h['id']} membership"
            assert d['x'] <= h['x'] and h['x'] + h['w'] <= d['x'] + d['w'] + 1e-6 and d['y'] + d.get('headerH', 91) <= h['y'] and h['y'] + h['h'] <= d['y'] + d['h'] + 1e-6, f"card {h['id']} outside {d['id']}"
            assert (not h.get('support')) or h['y'] >= d['supportStart'], f"support card {h['id']} above supportStart"
for course, cd in M['courseDesign'].items():
    for z in cd['zones']:
        inside = [r for r in M['regions'] if r.get('courseKey') == course and z['x'] <= r['x'] + r['w'] / 2 <= z['x'] + z['w'] and z['y'] <= r['y'] + r['h'] / 2 <= z['y'] + z['h']]
        if inside:
            z['h'] = max(300, min(z['h'], max(r['y'] + r['h'] for r in inside) + 70 - z['y']))
for course in boxes:
    rs = [r for r in M['regions'] if r.get('courseKey') == course]
    zs = M['courseDesign'][course]['zones']
    x1 = min([r['x'] for r in rs] + [z['x'] for z in zs]); y1 = min([r['y'] for r in rs] + [z['y'] for z in zs])
    x2 = max([r['x'] + r['w'] for r in rs] + [z['x'] + z['w'] for z in zs]); y2 = max([r['y'] + r['h'] for r in rs] + [z['y'] + z['h'] for z in zs])
    boxes[course] = {'x': x1, 'y': y1, 'w': x2 - x1, 'h': y2 - y1}
for r in M['regions']:
    assert not any(overlaps(r, q) for q in M['regions'] if q is not r), f"overlap at {r['id']}"
M['courseBlocks'] = {c: {k: round(v) for k, v in t.items()} for c, t in boxes.items()}
M['layoutId'] = LAYOUT_ID
M['view'] = None
data['history'].append({'at': '2026-09-26T00:00:00Z', 'action': 'Revision 12: courses laid out by design (formation core, court-access threshold, separation of powers); legal dictionary added', 'revision': 12})
out = json.dumps(data, ensure_ascii=False, separators=(',', ':')); assert '</' not in out
open(HTML, 'w', encoding='utf-8').write(html[:s0] + out + html[e0:])
for c, t in boxes.items():
    print(c, {k: round(v) for k, v in t.items()})
print('radius', radius, '| workbench', wb['x'], wb['y'])
