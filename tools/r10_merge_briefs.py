#!/usr/bin/env python3
"""Revision 10: merge the thirteen new case briefs (written from the files in added-sources/) into seedData.

Inputs (scratchpad, produced in the r10 session): briefs-A..E.json (the briefs) and placement.json (map homes,
subtopics and regions as allocated by the app's own placement routine). Also upgrades Mead to a full brief,
adds the Slaughter supplement digest, extends the timelines, and updates the LRS assignment ledger.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'DKLA-r8.html')
SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/-home-user-DKLA/6d49cb8d-a244-599f-bf37-d555e02eb31f/scratchpad/src/'
TODAY = '2026-09-24T00:00:00Z'

html = open(HTML, encoding='utf-8').read()
m = re.search(r'<script id="seedData"[^>]*>', html); s0, e0 = m.end(), html.find('</script>', m.end())
data = json.loads(html[s0:e0]); nodes = {n['id']: n for n in data['nodes']}
if 'lrs-k-rucho' in nodes:
    sys.exit('already merged')

briefs = []
for k in 'ABCD':
    briefs += json.load(open(SRC + f'briefs-{k}.json'))
E = json.load(open(SRC + 'briefs-E.json')); briefs += E['briefs']
place = json.load(open(SRC + 'placement.json'))

FILES = {
 'lrs-k-rucho': ('added-sources/Class 1 Reading - Rucho v Common Cause.pdf', 'Rucho v. Common Cause, class 1 reading (PDF, 15 pages)', 1),
 'lrs-k-riggs': ('added-sources/Class 3 Reading - Riggs v Palmer.pdf', 'Riggs v. Palmer, class 3 reading (PDF, 4 pages)', 3),
 'lrs-k-cargill': ('added-sources/Class 3 Reading -- Garland v Cargill.pdf', 'Garland v. Cargill, class 3 reading (PDF, 15 pages)', 3),
 'lrs-k-vanderstok': ('added-sources/Class 3 Reading - Bondi v VanDerStok -- Kit issue only.pdf', 'Bondi v. VanDerStok, kit issue only, class 3 reading (PDF, 8 pages)', 3),
 'lrs-k-train': ('added-sources/Class 4 Reading - Train v. CPIRG.pdf', 'Train v. CPIRG, class 4 reading (PDF, 7 pages)', 4),
 'lrs-k-mcboyle': ('added-sources/Class 5 Readings - Cases on the Canons.pdf', 'Cases on the Canons, class 5 reading (PDF, 14 pages)', 5),
 'lrs-k-gustafson': ('added-sources/Class 5 Readings - Cases on the Canons.pdf', 'Cases on the Canons, class 5 reading (PDF, 14 pages)', 5),
 'lrs-k-people-smith': ('added-sources/Class 5 Readings - Cases on the Canons.pdf', 'Cases on the Canons, class 5 reading (PDF, 14 pages)', 5),
 'lrs-k-public-citizen': ('added-sources/Public Citizen v. Department of Justice _ 491 U.S. 440 (1989) _ Justia U.S. Supreme Court Center.pdf', 'Public Citizen v. Department of Justice, full opinion (PDF, 28 pages)', 5),
 'lrs-k-epic': ('added-sources/Class 6 Reading - Epic Systems Corporation v Lewis - Copy.pdf', 'Epic Systems Corp. v. Lewis, class 6 reading (PDF, 24 pages)', 6),
 'lrs-k-trump-illinois': ('added-sources/Class 6 Reading - Trump v Illinois - Copy.pdf', 'Trump v. Illinois, class 6 reading (PDF, 12 pages)', 6),
 'lrs-i-mead': ('added-sources/USVMEAD.pdf', 'United States v. Mead Corp., 533 U.S. 218 (2001), U.S. Reports (PDF, 44 pages)', 22),
 'cp-berk': ('added-sources/Berk v Choy.pdf', 'Berk v. Choy, slip opinion (PDF, 27 pages)', None),
 'cp-cross': ('added-sources/Cross v. United States, 336 F.2d 431 (2d Cir. 1964) __ Justia.pdf', 'Cross v. United States, 336 F.2d 431 (2d Cir. 1964) (PDF, 6 pages)', None),
}
added, edges_added = 0, 0
existing = {(e['source'], e['target']) for e in data['edges']}


def link(nid, topics, sources):
    global edges_added
    n = nodes[nid]
    for cid, why in topics.items():
        if cid not in nodes or cid == nid:
            continue
        n.setdefault('learning', {}).setdefault('topics', {})[cid] = why
        if (nid, cid) in existing:
            continue
        data['edges'].append({'id': f'r10-{nid}--{cid}', 'source': nid, 'target': cid, 'label': 'Bears on', 'kind': 'Doctrine', 'explanation': why,
                              'status': 'Proposed', 'supports': [], 'sources': sources[:1], 'createdAt': TODAY, 'updatedAt': TODAY})
        existing.add((nid, cid)); edges_added += 1


for b in briefs:
    bid = 'lrs-i-mead-note' if b['id'] == 'lrs-i-mead' else b['id']
    path, label, cls = FILES[b['id']]
    sources = [{'label': label, 'url': path}]
    notes = ''
    if b.get('keyQuote'):
        notes = 'Key line: ' + b['keyQuote'].strip()
    if b.get('court'):
        notes = (f"{b['court']}, {b['year']}. " + notes).strip()
    if bid in nodes:  # Mead: upgrade in place
        n = nodes[bid]
        n.update({'title': b['title'], 'shortTitle': b['shortTitle'], 'summary': b['summary'], 'sections': b['sections'], 'notes': notes,
                  'status': 'Source-grounded study account', 'updatedAt': TODAY})
        n['sources'] = sources + [s for s in n.get('sources', []) if s.get('url')]
        n.setdefault('learning', {}).update({'separateOpinions': b.get('separateOpinions', ''), 'why': b.get('why', ''), 'coverage': 'full-account'})
        if n.get('lrsImport'):
            n['lrsImport'].update({'coverageLevel': 'full-account', 'limitations': ''})
        link(bid, b.get('topics', {}), sources)
        continue
    home = place['homes'].get(bid)
    if not home:
        print('no home for', bid); continue
    course = 'Civil Procedure' if bid.startswith('cp-') else 'Legislation and the Regulatory State'
    n = {'id': bid, 'title': b['title'], 'shortTitle': b['shortTitle'], 'kind': 'Case', 'courses': [course], 'summary': b['summary'], 'notes': notes,
         'sections': b['sections'], 'sources': sources, 'tags': ['r10'], 'status': 'Source-grounded study account', 'createdAt': TODAY, 'updatedAt': TODAY,
         'learning': {'topics': {}, 'coverage': 'full-account', 'separateOpinions': b.get('separateOpinions', ''), 'why': b.get('why', ''), 'district': home['district']}}
    if course == 'Civil Procedure':
        n['civilImport'] = {'printedRanges': [], 'supplementRanges': [], 'weeks': [], 'source': 'added', 'coverageLevel': 'Assigned case', 'pdfPages': []}
    else:
        n['lrsImport'] = {'sourceRefs': [], 'coverageLevel': 'full-account', 'limitations': '', 'topic': 'Legislative process and statutory interpretation',
                          'subtopic': 'Katzmann and interpretive methods', 'basis': 'Assigned reading supplied as a file in added-sources.', 'assignmentClass': cls}
    data['nodes'].append(n); nodes[bid] = n; added += 1
    data['studyMap']['homes'][bid] = home
    p = place['placements'].get(bid)
    if p:
        data['geography']['placements'][bid] = p
    link(bid, b.get('topics', {}), sources)
    # ledger
    if cls:
        for a in data['lrsCorpus']['assignments']:
            if a.get('classNumber') == cls and any(w.lower() in a.get('title', '').lower() for w in b['shortTitle'].split()[:1]):
                a.setdefault('authoredRecordIds', []).append(bid); a.setdefault('atlasRecordIds', []).append(bid); a['accountStatus'] = 'full-account'
        data['lrsCorpus'].setdefault('accountIds', []).append(bid)

# geometry from the in-page placement (continuation areas were created for full subtopics)
data['studyMap']['districts'] = place['districts']
data['studyMap']['regions'] = place['regions']
data['geography']['regions'] = place['geoRegions']

# Slaughter supplement digest
sl = E['slaughter']; s = nodes['lrs-s-slaughter']
s['sections']['What the supplement adds'] = sl['digest']
if sl.get('votes'):
    s['learning']['separateOpinions'] = sl['votes']
if sl.get('questions'):
    s['notes'] = (s.get('notes', '') + '\n\nQuestions the editors pose:\n' + '\n'.join('• ' + q for q in sl['questions'])).strip()
s['sources'] = [{'label': 'Shane & Bruff, Separation of Powers Law (5th ed. forthcoming), Trump v. Slaughter supplement (Word file)', 'url': 'added-sources/Class 11 - Slaughter Supplement.docx'}] + s['sources']
s['status'] = 'Source-grounded study account'
s['lrsImport'].update({'coverageLevel': 'full-account', 'limitations': ''})
s['updatedAt'] = TODAY

# timelines
T = {t['id']: t for t in data['timelines']}
T['erie']['steps'].append({'id': 'cp-berk', 'year': 2026, 'note': 'A Federal Rule that answers the question displaces a state affidavit-of-merit requirement.'})
T['sj']['steps'].insert(0, {'id': 'cp-cross', 'year': 1964, 'note': 'Motive and intent that rest on the movant’s own credibility are for trial, not summary judgment.'})
T['deference']['steps'] = [st for st in T['deference']['steps'] if st['id'] != 'lrs-i-mead-note'] + []
T['deference']['steps'].insert(5, {'id': 'lrs-i-mead-note', 'year': 2001, 'note': 'Step zero: Chevron applies only where Congress delegated authority to act with the force of law; ruling letters get Skidmore.'})
data['timelines'].append({'id': 'interpretation-statutes', 'title': 'Statutory interpretation: text, purpose and the canons', 'question': 'How do courts decide what a statute means?', 'steps': [
    {'id': 'lrs-k-riggs', 'year': 1889, 'note': 'A statute read against its purpose and the maxim that no one profits from his own wrong.'},
    {'id': 'lrs-k-holy-trinity', 'year': 1892, 'note': 'Letter versus spirit: the Court reads an exception into a clear text.'},
    {'id': 'lrs-k-mcboyle', 'year': 1931, 'note': 'Lenity and ordinary meaning: an airplane is not a “vehicle”.'},
    {'id': 'lrs-k-train', 'year': 1976, 'note': 'Legislative history used to narrow a broad statutory term.'},
    {'id': 'lrs-k-public-citizen', 'year': 1989, 'note': 'Avoidance and absurdity: “utilized” read narrowly to keep a statute constitutional.'},
    {'id': 'lrs-k-gustafson', 'year': 1995, 'note': 'Noscitur a sociis and reading a term consistently through the whole Act.'},
    {'id': 'lrs-k-small', 'year': 2005, 'note': 'The presumption that Congress legislates with domestic concerns in mind.'},
    {'id': 'lrs-k-epic', 'year': 2018, 'note': 'Harmonizing two statutes rather than finding a repeal by implication.'},
    {'id': 'lrs-k-cargill', 'year': 2024, 'note': 'Textualism with a diagram: a bump stock is not a machine gun.'},
    {'id': 'lrs-k-vanderstok', 'year': 2025, 'note': 'Ordinary meaning covers a weapon parts kit that is readily convertible.'},
]})
data['timelines'] = [t for t in data['timelines']]
data['revision'] = 10
data['updatedAt'] = TODAY
data['description'] = 'Revision 10: the missing readings arrived as files; thirteen new briefs written from them; galaxy overview; one icon per case.'
if data.get('dklaRelease'):
    data['dklaRelease']['contentBuild'] = 'r10-2026-09-24'; data['dklaRelease']['name'] = 'DKLA r10'
data['history'].append({'at': TODAY, 'action': f'Revision 10: {added} briefs written from the added sources; Mead and Slaughter upgraded; {edges_added} connections; timelines extended', 'revision': 10})
out = json.dumps(data, ensure_ascii=False, separators=(',', ':')); assert '</' not in out
open(HTML, 'w', encoding='utf-8').write(html[:s0] + out + html[e0:])
print(f'{added} briefs added, {edges_added} connections, nodes now {len(data["nodes"])}')
