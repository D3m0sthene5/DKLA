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

GAP_X, GAP_Y, COLS, BLOCK_GAP = 240, 240, 3, 3200
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
    return dx, dy


x0 = 0
blocks = {}
for bi, (course, route) in enumerate(ROUTES.items()):
    step = 0; y = 0; col = 0; row_h = 0; block_w = 0; row = 0
    for rid, label in route:
        r = R[rid]
        if label:
            step += 1; r['step'] = step; r['routeLabel'] = label
        else:
            r['step'] = None; r['routeLabel'] = ''
        r['courseKey'] = course
        if col == COLS:
            col = 0; y += row_h + GAP_Y; row_h = 0; row += 1
        move(r, x0 + col * (2400 + GAP_X), y)
        # `col` keeps its old meaning for the scope tests: 0-2 Contracts, 4-6 Civil Procedure, 8-10 LRS, 3 workbench
        r['col'] = bi * 4 + col; r['row'] = row
        row_h = max(row_h, r['h']); block_w = max(block_w, (col + 1) * 2400 + col * GAP_X)
        col += 1
    blocks[course] = {'x': x0, 'y': 0, 'w': block_w, 'h': y + row_h}
    x0 += block_w + BLOCK_GAP
wb = R['workbench-region']; move(wb, x0, 0); wb['col'] = 3; wb['row'] = 0; wb['courseKey'] = 'Study notes'; wb['step'] = None; wb['routeLabel'] = ''
M['courseBlocks'] = blocks
M['layoutId'] = 'r11-route-order'
M['view'] = None
data['history'].append({'at': '2026-09-26T00:00:00Z', 'action': 'Revision 11: subject regions laid out in course order with numbered routes', 'revision': 11})
out = json.dumps(data, ensure_ascii=False, separators=(',', ':')); assert '</' not in out
open(HTML, 'w', encoding='utf-8').write(html[:s0] + out + html[e0:])
for c, b in blocks.items():
    print(c, b)
print('workbench at', wb['x'])
