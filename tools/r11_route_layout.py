#!/usr/bin/env python3
"""Revision 11: lay each course's subject regions out in the order the course runs.

Each course becomes a three-column block read left to right, top to bottom, in the order the casebook and
syllabus teach it (Civil Procedure: the life of a lawsuit from choosing the court to judgment; Contracts:
from the promise to remedies; LRS: from how statutes are made to judicial review). Every region gets a step
number and a one-line route label. Regions, their subtopics and every saved entry home move together, so
nothing inside a subject changes. The study workbench sits to the right of all three courses.
Run once from the DKLA folder (refuses to run twice: it looks for `step` on the regions).
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'DKLA-r8.html')
html = open(HTML, encoding='utf-8').read()
m = re.search(r'<script id="seedData"[^>]*>', html); s0, e0 = m.end(), html.find('</script>', m.end())
data = json.loads(html[s0:e0]); M = data['studyMap']
R = {r['id']: r for r in M['regions']}
if any('step' in r for r in M['regions']):
    sys.exit('route layout already applied')

ROUTES = {
 'Contracts': [
  ('foundations', 'What was promised, and which law applies?'),
  ('consideration', 'Was the promise bargained for?'),
  ('reliance-region', 'If not, did someone rely on it, or get enriched?'),
  ('assent-region', 'Did the parties actually agree?'),
  ('offer-region', 'Was there an offer, and is it still open?'),
  ('acceptance-region', 'Was it accepted, how, and when?'),
  ('formalities-region', 'Does a writing or a seal matter?'),
  ('terms-region', 'Which terms made it in when forms clash?'),
  ('negotiation-region', 'Is an unfinished deal a deal?'),
  ('interpretation-region', 'What do the words mean, and what evidence counts?'),
  ('bargaining-region', 'Can the deal be changed, and was it fairly made?'),
  ('limits-region', 'Which terms will the law refuse to enforce?'),
  ('performance-region', 'Who had to perform first, and did they?'),
  ('excuses-region', 'Does mistake or a changed world excuse performance?'),
  ('remedies-region', 'What can the injured party get?'),
  ('remedy-depth-region', 'How is that measured, and where does it stop?'),
  ('third-parties-region', 'Who else can enforce or take over the deal?'),
  ('semester-workbench', None),
 ],
 'Civil Procedure': [
  ('cp-orientation-region', 'What is a civil action, and what governs it?'),
  ('civil-region', 'Where the jurisdiction doctrine began'),
  ('cp-personal-region', 'Can this court reach the defendant?'),
  ('cp-notice-region', 'Was the defendant told, and heard?'),
  ('cp-subject-region', 'Can a federal court hear this kind of case?'),
  ('cp-venue-region', 'Which district, and can the case move?'),
  ('cp-governing-region', 'Whose law applies in federal court?'),
  ('extension-iekfaa-1', None),
  ('cp-pleading-region', 'What must the complaint and answer say?'),
  ('cp-joinder-region', 'Who and what can be joined in one action?'),
  ('cp-class-region', 'When can one suit bind a class?'),
  ('cp-summary-region', 'Can the case end before trial?'),
 ],
 'Legislation and the Regulatory State': [
  ('lrs-region-legislative-process-and-statutory-interpretation', 'How statutes are made and read'),
  ('extension-cjl74v-1', None),
  ('lrs-region-delegation-and-statutory-authority', 'How much power can Congress hand over?'),
  ('lrs-region-appointments-and-executive-structure', 'Who may hold federal office, and who appoints them?'),
  ('lrs-region-removal-and-agency-independence', 'Who can fire them?'),
  ('lrs-region-presidential-control', 'How does the President direct the agencies?'),
  ('lrs-region-rulemaking', 'How agencies make rules'),
  ('lrs-region-administrative-rulemaking', 'Notice, comment and the record'),
  ('lrs-region-administrative-adjudication', 'How agencies decide individual cases'),
  ('lrs-region-judicial-review', 'When courts review agency action'),
  ('lrs-region-judicial-review-of-agency-interpretation', 'How much deference agencies get'),
  ('lrs-region-judicial-review-and-standing', 'Who may bring the challenge?'),
  ('lrs-region-reading-plans-and-source-gaps', None),
 ],
}
listed = {rid for rs in ROUTES.values() for rid, _ in rs}
missing = [r['id'] for r in M['regions'] if r['id'] not in listed and r['id'] != 'workbench-region']
assert not missing, f'regions not in a route: {missing}'

import math

homes_by_region = {}
for hid, h in M['homes'].items():
    homes_by_region.setdefault(h['region'], []).append(h)
districts_by_region = {}
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


def overlaps(a, b, gap):
    return a['x'] - gap < b['x'] + b['w'] and a['x'] + a['w'] + gap > b['x'] and a['y'] - gap < b['y'] + b['h'] and a['y'] + a['h'] + gap > b['y']


# Three spiral arms, one per course. Each arm is an Archimedean spiral r = A + B*theta; the subjects sit along it in
# route order, innermost first, as axis-aligned boxes spaced by their half-diagonals and checked against every box
# already placed (all arms), so nothing overlaps. The spiral itself is what the reader sees at the floor zoom.
CX, CY = 0, 0
A, PITCH, GAP = 5200, 15600, 420
B = PITCH / (2 * math.pi)


def spiral_point(theta, base):
    r = A + B * theta
    return CX + r * math.cos(theta + base), CY + r * math.sin(theta + base)


def theta_at_arc(s):
    # numeric inverse of arc length along r = A + B*theta
    th, acc, step = 0.0, 0.0, 0.002
    while acc < s:
        r = A + B * th
        acc += math.hypot(B, r) * step
        th += step
    return th


placed = []
blocks = {}
for bi, (course, route) in enumerate(ROUTES.items()):
    base = bi * 2 * math.pi / 3 - math.pi / 2
    step = 0; s = 0.0; prev = None
    for k, (rid, label) in enumerate(route):
        r = R[rid]
        if label:
            step += 1; r['step'] = step; r['routeLabel'] = label
        else:
            r['step'] = None; r['routeLabel'] = ''
        r['courseKey'] = course
        half = math.hypot(r['w'], r['h']) / 2
        if prev is not None:
            s += math.hypot(prev['w'], prev['h']) / 2 + half + GAP
        while True:
            th = theta_at_arc(s)
            px, py = spiral_point(th, base)
            nx, ny = round(px - r['w'] / 2), round(py - r['h'] / 2)
            cand = {'x': nx, 'y': ny, 'w': r['w'], 'h': r['h']}
            if not any(overlaps(cand, q, GAP) for q in placed):
                break
            s += 150
        move(r, nx, ny)
        r['col'] = bi * 4 + k % 3; r['row'] = k // 3; r['arm'] = {'theta': round(th, 4), 'order': k}
        placed.append(cand); prev = r
    xs = [R[rid]['x'] for rid, _ in route]; ys = [R[rid]['y'] for rid, _ in route]
    x2 = [R[rid]['x'] + R[rid]['w'] for rid, _ in route]; y2 = [R[rid]['y'] + R[rid]['h'] for rid, _ in route]
    blocks[course] = {'x': min(xs), 'y': min(ys), 'w': max(x2) - min(xs), 'h': max(y2) - min(ys), 'base': round(base, 4)}
allx = min(b['x'] for b in blocks.values()); ally = min(b['y'] for b in blocks.values())
allx2 = max(b['x'] + b['w'] for b in blocks.values())
wb = R['workbench-region']; move(wb, allx2 + 2600, ally); wb['col'] = 3; wb['row'] = 0; wb['courseKey'] = 'Study notes'; wb['step'] = None; wb['routeLabel'] = ''
for r in M['regions']:
    assert not any(overlaps(r, q, 0) for q in M['regions'] if q is not r), f"overlap at {r['id']}"
M['courseBlocks'] = blocks
M['layoutId'] = 'r11-spiral-arms'
M['view'] = None
data['history'].append({'at': '2026-09-26T00:00:00Z', 'action': 'Revision 11: subject regions laid along three spiral arms in course order with numbered routes', 'revision': 11})
out = json.dumps(data, ensure_ascii=False, separators=(',', ':')); assert '</' not in out
open(HTML, 'w', encoding='utf-8').write(html[:s0] + out + html[e0:])
for c, b in blocks.items():
    print(c, b)
print('workbench at', wb['x'])
