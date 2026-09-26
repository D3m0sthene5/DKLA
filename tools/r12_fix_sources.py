#!/usr/bin/env python3
"""Revision 12 content: every claim in seedData that a source is missing is checked against added-sources/.

The atlas still said that readings were "missing", "not supplied", "not located" or "source gaps" although the files
sit in added-sources/ (77 opinions, the two big books, the Brightspace cases, the Slaughter supplement, Mead, Berk,
Cross, and, since today, the U.S. Constitution). This script rewrites each claim so that it is true:

* gap notes whose file is on hand get status "Source received", a `sources` link to the file (with #page=N where the
  page is known), coverage "Source file on hand", role "Supplied source" and an "on file" tag;
* the U.S. Constitution note (lrs-gap-01-02) links to added-sources/US Constitution.pdf (Article I p. 2, Article II
  p. 6, Article III p. 8, amendments p. 12) and the three Article entries get the same links;
* the Wood–Lucy agreement and the Peevyhouse lease, which the Contracts Selections reprint (PDF pp. 697 and 699),
  and the Restatement of Consumer Contracts (PDF p. 474) stop being "not among the supplied files";
* lrsCorpus.assignments (what the LRS coverage dialog and the class dialogs list as "Missing or incomplete assigned
  readings") are marked source-on-file with the file named, so only the three readings that are really absent are
  listed; lrsCorpus.sourceGaps, corpus.standaloneSourcesMissing, corpus.coverageStatement, civilCorpus.scopeLimits,
  scopeNotes, district titles, region descriptions, placement review notes and edge labels are made truthful;
* readings that are genuinely absent keep a precise "not among the supplied files" wording that names what is missing.

Edits only the seedData block. Idempotent: a second run reports 0 changes. Usage: r12_fix_sources.py [path-to-html]
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARGS = [a for a in sys.argv[1:] if not a.startswith('-')]
HTML = ARGS[0] if ARGS else os.path.join(ROOT, 'DKLA-r8.html')
TODAY = '2026-09-26T00:00:00Z'
BUILD = 'r12-sources-2026-09-26'

CONST = 'added-sources/US Constitution.pdf'
CIV_PDF = 'added-sources/Civ Pro Supplement FULL OCR 26-27.pdf'
SEL_PDF = 'added-sources/Contracts- Selections.pdf'
BERK = 'added-sources/Berk v Choy.pdf'
CROSS = 'added-sources/Cross v. United States, 336 F.2d 431 (2d Cir. 1964) __ Justia.pdf'
SLAUGHTER = 'added-sources/Class 11 - Slaughter Supplement.html'
MEAD = 'added-sources/USVMEAD.pdf'
OPINIONS = 'added-sources/opinions'


def on_file(rel):
    return bool(rel) and os.path.exists(os.path.join(ROOT, rel.split('#')[0]))


for f in (CIV_PDF, SEL_PDF, BERK, CROSS, SLAUGHTER, MEAD):
    assert on_file(f), f'expected file missing: {f}'
HAVE_CONST = on_file(CONST)
if not HAVE_CONST:
    print(f'WARNING: {CONST} is not on file; the Constitution stays a gap')

html = open(HTML, encoding='utf-8').read()
m = re.search(r'<script id="seedData"[^>]*>', html); s0, e0 = m.end(), html.find('</script>', m.end())
data = json.loads(html[s0:e0])
nodes = {n['id']: n for n in data['nodes']}
changes = []   # (category, where)


def put(obj, key, val, where, cat='claim'):
    if obj.get(key) != val:
        obj[key] = val; changes.append((cat, f'{where}.{key}'))


def sub(obj, key, old, new, where, cat='claim'):
    v = obj.get(key)
    if isinstance(v, str) and old in v:
        obj[key] = v.replace(old, new); changes.append((cat, f'{where}.{key}'))


def add_source(n, label, url, first=True):
    srcs = n.setdefault('sources', [])
    if any((s.get('url') or '') == url for s in srcs):
        return
    src = {'label': label, 'url': url}
    srcs.insert(0, src) if first else srcs.append(src)
    changes.append(('claim', f'nodes[{n["id"]}].sources+{url.split("/")[-1]}'))


def drop_source(n, pred, where):
    before = len(n.get('sources', []))
    n['sources'] = [s for s in n.get('sources', []) if not pred(s)]
    if len(n['sources']) != before:
        changes.append(('claim', f'{where}.sources-'))


def swap_tag(n, old, new):
    tags = n.get('tags') or []
    if old in tags:
        n['tags'] = sorted({new if t == old else t for t in tags}); changes.append(('claim', f'nodes[{n["id"]}].tags'))


def touch(n):
    n['updatedAt'] = TODAY


placements = data['geography']['placements']


def received(nid, title, summary, notes, sources, role='Supplied source', review='The file is on hand and opens from the entry.'):
    """Turn a gap note into a received-source note: status, summary, notes, sources, coverage, role, tag."""
    n = nodes[nid]; w = f'nodes[{nid}]'
    put(n, 'status', 'Source received', w)
    if title:
        put(n, 'title', title, w); put(n, 'shortTitle', title[:60], w)
    put(n, 'summary', summary, w); put(n, 'notes', notes, w)
    for label, url in reversed(sources):
        add_source(n, label, url)
    L = n.setdefault('learning', {})
    put(L, 'coverage', 'Source file on hand', w + '.learning')
    if n.get('lrsImport'):
        put(n['lrsImport'], 'coverageLevel', 'Source file on hand', w + '.lrsImport')
        put(n['lrsImport'], 'limitations', '', w + '.lrsImport')
    if n.get('civilImport'):
        put(n['civilImport'], 'coverageLevel', 'Source file on hand', w + '.civilImport')
    pl = placements.get(nid)
    if isinstance(pl, dict):
        put(pl, 'role', role, f'placements[{nid}]')
        if pl.get('reviewNote'):
            put(pl, 'reviewNote', review, f'placements[{nid}]')
    swap_tag(n, 'source-gap', 'source-on-file'); swap_tag(n, 'lrs-source-gap', 'lrs-source-on-file')
    touch(n)


def still_missing(nid, summary, notes, reason):
    n = nodes[nid]; w = f'nodes[{nid}]'
    put(n, 'status', 'Not among the supplied files', w)
    put(n, 'summary', summary, w); put(n, 'notes', notes, w)
    pl = placements.get(nid)
    if isinstance(pl, dict):
        put(pl, 'role', 'Source gap', f'placements[{nid}]')
        put(pl, 'reviewNote', 'Not among the supplied files; a tracking record, not an account of the material.', f'placements[{nid}]')
    MISSING.append((nodes[nid]['title'], reason))


MISSING = []   # (reading, where it is assigned)

# ---------------------------------------------------------------- 1. the Constitution (new file today)
if HAVE_CONST:
    const_src = [('U.S. Constitution, Article I · National Constitution Center text, PDF page 2 of 19', f'{CONST}#page=2'),
                 ('U.S. Constitution, Article II · PDF page 6 of 19', f'{CONST}#page=6'),
                 ('U.S. Constitution, Article III · PDF page 8 of 19', f'{CONST}#page=8'),
                 ('Amendments · PDF page 12 of 19', f'{CONST}#page=12'),
                 ('Constitution excerpts (Art. I § 8, III, IV, VI, selected amendments) · Civil Procedure supplement 2026–27, PDF pages 136–137', f'{CIV_PDF}#page=136')]
    g = nodes['lrs-gap-01-02']
    drop_source(g, lambda s: (s.get('url') or '').startswith(CIV_PDF) and '#page=136' in s['url'] and 'excerpts' not in s['label'], 'nodes[lrs-gap-01-02]')
    received('lrs-gap-01-02', 'U.S. Constitution, Articles I–III',
             'On file: the U.S. Constitution (National Constitution Center text, 19 pages). Article I begins at PDF page 2, Article II at page 6, Article III at page 8 and the amendments at page 12. The Civil Procedure supplement also reprints Article I § 8, Articles III, IV and VI and selected amendments at PDF pages 136–137.',
             'The corrected syllabus assigns Articles I–III for class 1 (Mashaw reprints them at printed pages 1293–1301, which are not in the packets; the text itself is on file). Open the file from the source button; it is stored beside the atlas in added-sources.',
             const_src)
    for nid, page, art in (('lrs-s-article-i-vesting', 2, 'Article I'), ('lrs-s-article-ii-appointments', 6, 'Article II'), ('cp-article-iii', 8, 'Article III')):
        if nid in nodes:
            add_source(nodes[nid], f'U.S. Constitution, {art} · National Constitution Center text, PDF page {page} of 19', f'{CONST}#page={page}')
            touch(nodes[nid])

# ---------------------------------------------------------------- 2. Contracts: Selected Contracts and the Restatement of Consumer Contracts
received('gap-wood-contract', 'Agreement in Wood v. Lucy (Selections)',
         'On file: the complete Wood–Lucy agreement is reprinted in the Contracts Selections, "Selected Contracts", PDF page 697 (printed page 690).',
         'Open the file from the source button; it is stored beside the atlas in added-sources. The casebook excerpt quotes the provisions the court relied on; the full agreement shows the whole exclusive arrangement.',
         [('Contract in Wood v. Lucy · Contracts Selections (Farnsworth et al., 2021), PDF page 697 of 713', f'{SEL_PDF}#page=697')],
         review='On file: the agreement is reprinted in the Contracts Selections (PDF page 697).')
received('gap-peevyhouse-contract', 'Agreement in Peevyhouse (Selections)',
         'On file: the complete Peevyhouse–Garland Coal lease is reprinted in the Contracts Selections, "Selected Contracts", PDF page 699 (facsimile) and page 703 (retyped).',
         'Open the file from the source button; it is stored beside the atlas in added-sources. The casebook reproduces and describes the remedial provisions; the lease shows the whole bargain.',
         [('Contract in Peevyhouse v. Garland Coal · Contracts Selections (Farnsworth et al., 2021), PDF page 699 of 713 (retyped at page 703)', f'{SEL_PDF}#page=699')],
         review='On file: the lease is reprinted in the Contracts Selections (PDF page 699).')
received('gap-rlcc', 'Restatement of the Law, Consumer Contracts',
         'On file: the complete Official Text (2024) of the Restatement of the Law, Consumer Contracts (197 pages, "Complete Restatement.pdf", §§ 1–10 with comments and reporters\' notes), and the 2019 Tentative Draft reprinted in the Contracts Selections from PDF page 474 (§ 1 at page 480, § 2 at page 484).',
         'Open either file from the source buttons; both are stored beside the atlas in added-sources. The 2024 official text supersedes the draft.',
         [('Restatement of the Law, Consumer Contracts, Official Text (2024), complete · PDF page 1 of 197', 'added-sources/Complete Restatement.pdf#page=1'),
          ('Restatement of the Law, Consumer Contracts, Tentative Draft (2019) · Contracts Selections, PDF page 474 of 713', f'{SEL_PDF}#page=474')])
drop_source(nodes['gap-rlcc'], lambda s: 'check whether' in (s.get('label') or ''), 'nodes[gap-rlcc]')
sub(nodes['gap-balfour'], 'notes', 'The earlier source-gap notice is retained in provenance.', 'The earlier notice that the opinion had not arrived is kept in provenance.', 'nodes[gap-balfour]')
swap_tag(nodes['gap-balfour'], 'source-gap', 'source-on-file'); swap_tag(nodes['gap-sel'], 'source-gap', 'source-on-file')

wl = nodes['wood-lucy']
sub(wl, 'notes', 'The separately assigned full contract in SEL has not been located.', 'The separately assigned full contract is in the Contracts Selections (PDF page 697), linked below.', 'nodes[wood-lucy]')
add_source(wl, 'Contract in Wood v. Lucy · Contracts Selections, PDF page 697 of 713', f'{SEL_PDF}#page=697', first=False)
pv = nodes['peevyhouse']
sub(pv, 'notes', 'The separate contract assigned in the syllabus has not been replaced by the excerpts quoted in this casebook.', 'The separately assigned lease is in the Contracts Selections (PDF page 699; retyped at page 703), linked below.', 'nodes[peevyhouse]')
add_source(pv, 'Contract in Peevyhouse v. Garland Coal · Contracts Selections, PDF page 699 of 713', f'{SEL_PDF}#page=699', first=False)
sub(nodes['ucc206'], 'notes', 'The full statutory text and comments remain a SEL source gap.', 'The full statutory text and comments are in the Contracts Selections (PDF page 341), linked above.', 'nodes[ucc206]')
du = nodes['duress']
sub(du, 'notes', 'but their complete Selections text and illustrations remain a source gap.', 'and their complete text and illustrations are in the Contracts Selections (PDF pages 93–94), linked below.', 'nodes[duress]')
add_source(du, 'Restatement (Second) of Contracts § 176 · Contracts Selections, PDF page 94 of 713', f'{SEL_PDF}#page=94', first=False)
add_source(du, 'Restatement (Second) of Contracts § 175 · Contracts Selections, PDF page 93 of 713', f'{SEL_PDF}#page=93', first=False)
sub(nodes['note-procd'], 'notes', 'The standalone ProCD opinion is not supplied as an assigned principal case here;', 'The standalone ProCD opinion is not an assigned principal case here;', 'nodes[note-procd]')
sub(nodes['force-majeure'], 'notes', 'Any separately distributed classroom clause not contained in the uploaded materials remains a source gap.', 'The force majeure clause the syllabus lists for assignment 21 was distributed in class and is not among the supplied files.', 'nodes[force-majeure]')
sub(nodes['social-intent'], 'notes', 'The Balfour supplement is missing, so the casebook’s references support only its placement here.', 'The Balfour opinion is in the course supplement (pp. 11–20) and briefed in its own entry; the casebook’s references place it here.', 'nodes[social-intent]')
sub(nodes['rest79'], 'notes', 'The full SEL provision and illustrations are missing.', 'The full provision and its illustrations are in the Contracts Selections (PDF page 47), linked above.', 'nodes[rest79]')
u306 = nodes['ucc306']
sub(u306, 'notes', 'The actual standalone section, comments, and the Wood contract in SEL are missing from this source set.', 'The standalone section and comments (PDF page 351) and the Wood–Lucy contract (PDF page 697) are in the Contracts Selections on file, linked below.', 'nodes[ucc306]')
add_source(u306, 'Contract in Wood v. Lucy · Contracts Selections, PDF page 697 of 713', f'{SEL_PDF}#page=697', first=False)
sub(nodes['parol-evidence'], 'notes', 'The complete assigned Selections provisions remain separately identified where unavailable.', 'The complete assigned Selections provisions are on file and open from their own entries (Restatement §§ 209–216, UCC § 2-202, CISG Article 8).', 'nodes[parol-evidence]')
sub(nodes['vesting-beneficiary'], 'notes', 'The source coverage and any missing complete Restatement text remain visible here;', 'The complete Restatement text is in the Contracts Selections on file;', 'nodes[vesting-beneficiary]')
sub(nodes['lrs-s-article-i-vesting'], 'notes', 'It does not substitute for the missing separately assigned text of Articles I–III.', 'The separately assigned text of Articles I–III is on file (added-sources/US Constitution.pdf), linked above.', 'nodes[lrs-s-article-i-vesting]')
sub(nodes['lrs-k-implied-repeal'], 'notes', 'Epic Systems and Trump v. Illinois require their missing readings for a source-grounded course treatment.', 'Epic Systems and Trump v. Illinois are on file (added-sources) and briefed in their own entries.', 'nodes[lrs-k-implied-repeal]')
MISSING.append(('Force majeure clause distributed in class', 'Contracts assignment 21'))
sw = nodes['swiss-2024']
if sw.get('textbookImport'):
    put(sw['textbookImport'], 'scope', 'Assigned translated excerpt', 'nodes[swiss-2024].textbookImport')
for topic, rows in (data.get('courseIndex', {}).get('topics') or {}).items():
    for r in rows:
        if isinstance(r, dict) and r.get('coverage') == 'Assigned translated reasoning; complete caption, docket, and formal disposition not supplied':
            put(r, 'coverage', 'Assigned translated excerpt', f'courseIndex.topics.{topic}[{r.get("id")}]')
ci = data.get('courseIndex', {})
sub(ci, 'scope', 'reference-only citations and source gaps are separate', 'reference-only citations and source-tracking notes are separate', 'courseIndex', 'wording')

# genuinely absent Contracts items, worded precisely
still_missing('gap-classroom',
              'Classroom-only problems, lecture notes and Brightspace problem sheets were not among the supplied files. Add them to added-sources to link them here.',
              'This entry tracks material that is not on file; it is not a substitute for it. Assignment membership is not proof of classroom discussion. The user identifies September 22, 2026 as class 9, focused on Bayway and Northrop.',
              'Contracts (all classes)')
still_missing('gap-eu-directive',
              'The full text of the EU Directive and the associated Notifications (assignment 17) is not among the supplied files; the casebook quotes and discusses parts of the Directive, and the course supplement (p. 71) only cites the UK Unfair Terms Regulations in passing.',
              'This entry tracks a reading that is not on file; it is not a substitute for the assigned material. Add the file to added-sources to link it here.',
              'Contracts assignment 17')
still_missing('gap-remedies-video',
              'The assigned video lecture on the economics of remedies (assignment 22) is not a file and is not linked; the casebook economics reading is on file.',
              'This entry tracks an assigned item that is not on file; it is not a substitute for it.',
              'Contracts assignment 22')
for nid in ('gap-classroom', 'gap-eu-directive', 'gap-remedies-video'):
    put(nodes[nid].setdefault('learning', {}), 'coverage', 'Not among the supplied files', f'nodes[{nid}].learning')

C = data['corpus']
put(C, 'standaloneSourcesMissing', ['gap-classroom', 'gap-eu-directive', 'gap-remedies-video'], 'corpus')
put(C, 'coverageStatement', 'All 26 syllabus assignments have their C&M source ranges and principal case entries indexed. All 691 distinct assigned C&M pages and all 138 pages of the supplied supplement are preserved, and the complete Selections for Contracts (713 pages, including the Wood–Lucy and Peevyhouse agreements and the Restatement of Consumer Contracts) are on file. Detailed briefs concern the assigned excerpts; not every authority mentioned in a footnote has its own full brief. Not among the supplied files: the full EU Directive and Notifications, the force majeure clause distributed in class, the video lecture, and classroom-only materials.', 'corpus')

# the twelve "remains missing" edges point at Selections items that are on file
for e in data['edges']:
    if e.get('label') == 'separate assigned source remains missing':
        put(e, 'label', 'separate assigned source on file', f'edges[{e["id"]}]')
        put(e, 'explanation', 'The separately assigned version is on file: open it from the linked source entry, which names the page of the Selections.', f'edges[{e["id"]}]')
    sub(e, 'explanation', 'an editorial discussion, a question, or a source gap.', 'an editorial discussion, a question, or a separately assigned source.', f'edges[{e["id"]}]', 'wording')

# ---------------------------------------------------------------- 3. Civil Procedure
OLD_BERK = 'The Berk PDF was not located; no identity or holding has been supplied by inference.'
NEW_BERK = 'Berk v. Choy is on file (added-sources/Berk v Choy.pdf) and has its own entry.'
w10 = nodes['cp-week-10']
sub(w10, 'summary', OLD_BERK, NEW_BERK, 'nodes[cp-week-10]')
sub(w10.get('sections') or {}, 'Reading plan', OLD_BERK, NEW_BERK, 'nodes[cp-week-10].sections')
sub(w10.get('learning') or {}, 'why', OLD_BERK, NEW_BERK, 'nodes[cp-week-10].learning')
add_source(w10, 'Berk v. Choy, slip opinion (27 pages)', BERK, first=False); touch(w10)
for wk in data['civilCorpus']['weeks']:
    sub(wk, 'instructions', OLD_BERK, NEW_BERK, f'civilCorpus.weeks[{wk.get("number")}]')
si = nodes['cp-statutory-interpleader']
sub(si, 'notes', 'The full statutory supplement remains missing.', 'The full text of § 1335 is in the Civil Procedure supplement on file (PDF page 150), linked below.', 'nodes[cp-statutory-interpleader]')
add_source(si, '28 U.S.C. § 1335. Interpleader · Civil Procedure supplement 2026–27, PDF page 150 of 354', f'{CIV_PDF}#page=150', first=False)
tu = ((nodes['cp-transunion'].get('courseTreatments') or {}).get('LRS') or {}).get('lrsImport')
if tu:
    put(tu, 'limitations', 'This treatment follows the assigned casebook note, which omits the full opinion and the procedural stages.', 'nodes[cp-transunion].courseTreatments.LRS.lrsImport')
CV = data['civilCorpus']
SL = CV.get('scopeLimits') or []
for i, s in enumerate(SL):
    if s == 'All named readings are linked to a case account or a visible source gap.':
        SL[i] = 'All named readings are linked to a case account or a source file on hand.'; changes.append(('claim', f'civilCorpus.scopeLimits[{i}]'))
    if s.startswith('Berk and Cross remain unidentified source gaps.'):
        SL[i] = 'Berk v. Choy and Cross v. United States are full entries with the opinions on file (added-sources); the 2026–2027 supplement (354 pages) is on file and every provision guide opens its page.'; changes.append(('claim', f'civilCorpus.scopeLimits[{i}]'))
sub(CV, 'review', 'identify the details not supplied by the note.', 'identify the details the note omits.', 'civilCorpus', 'wording')
put(CV, 'sourceGaps', [], 'civilCorpus')
# concept notes that still said the Rules / statutory supplement was missing: it is on file, page by page
CIV_NOTES = {
    'cp-service': ('The full assigned 2026–2027 Rules supplement is missing. It does not supply every clause, exception, deadline, or current amendment to Rule 4.',
                   'The full text of Rule 4 is in the 2026–2027 Rules supplement on file (PDF page 13), linked below; the casebook discussion does not reproduce every clause, exception, deadline or current amendment.',
                   [('Rule 4. Summons · Civil Procedure supplement 2026–27, PDF page 13 of 354', 13)]),
    'cp-safe-harbor': ('The missing supplement contains the full rule and exceptions;', 'The full rule and its exceptions are in the supplement on file (Rule 11, PDF page 31), linked below;',
                       [('Rule 11. Signing Pleadings, Motions, and Other Papers; Sanctions · Civil Procedure supplement 2026–27, PDF page 31 of 354', 31)]),
    'cp-cafa': ('The casebook overview is available, but the full assigned statutory supplement is missing.', 'The casebook overview is available, and the statutory text (28 U.S.C. § 1332(d), PDF page 147; § 1453, PDF page 158) is in the supplement on file, linked below.',
                [('28 U.S.C. § 1453. Removal of class actions · Civil Procedure supplement 2026–27, PDF page 158 of 354', 158), ('28 U.S.C. § 1332. Diversity of citizenship (CAFA at subsection (d)) · Civil Procedure supplement 2026–27, PDF page 147 of 354', 147)]),
    'cp-summary-judgment': ('The full assigned Rule 56 supplement is missing, although the casebook supplies extensive discussion.', 'The full text of Rule 56 is in the supplement on file (PDF page 90), linked below, and the casebook supplies extensive discussion.',
                            [('Rule 56. Summary Judgment · Civil Procedure supplement 2026–27, PDF page 90 of 354', 90)]),
    'cp-fraud-pleading': ('The full rule text is in the missing assigned supplement.', 'The full rule text (Rule 9) is in the supplement on file, PDF page 29, linked below.',
                          [('Rule 9. Pleading Special Matters · Civil Procedure supplement 2026–27, PDF page 29 of 354', 29)]),
    'cp-pleading-motions': ('The full assigned Rule 12 is missing.', 'The full text of Rule 12 is in the supplement on file (PDF page 33), linked below.',
                            [('Rule 12. Defenses and Objections · Civil Procedure supplement 2026–27, PDF page 33 of 354', 33)]),
}
for nid, (old, new, srcs) in CIV_NOTES.items():
    n = nodes.get(nid)
    if not n:
        continue
    sub(n, 'notes', old, new, f'nodes[{nid}]')
    for label, page in srcs:
        add_source(n, label, f'{CIV_PDF}#page={page}', first=False)
for pid, label in (('cp-supplement-gap', 'Civil Procedure supplement 2026–27 (on file)'), ('cp-berk-gap', 'Berk v. Choy (on file)')):
    pl = placements.get(pid)
    if isinstance(pl, dict):
        put(pl, 'displayLabel', label, f'placements[{pid}]')

# ---------------------------------------------------------------- 4. LRS
sl = nodes['lrs-s-slaughter']
sub(sl, 'notes', 'Written from the slip opinion and the Congressional Research Service analysis; the assigned Brightspace supplement was not among the supplied files, so check its excerpt and editorial questions before class 11.',
    'Written from the slip opinion and the Congressional Research Service analysis; the assigned Shane & Bruff supplement is on file (added-sources/Class 11 - Slaughter Supplement.html) and its notes and questions are carried below.', 'nodes[lrs-s-slaughter]')
drop_source(sl, lambda s: '(file not supplied)' in (s.get('label') or ''), 'nodes[lrs-s-slaughter]')
put(sl.setdefault('learning', {}), 'coverage', 'Supplement on file; brief from the published opinion', 'nodes[lrs-s-slaughter].learning')
sub(nodes['lrs-s-schechter'].get('sections') or {}, 'Procedural History', 'other grounds of the full decision are not supplied here.', 'the excerpt omits the other grounds of the full decision.', 'nodes[lrs-s-schechter].sections', 'wording')
bn = nodes['lrs-i-biden-nebraska']
for t in (bn.get('lrsImport') or {}).get('additionalTreatments') or []:
    li = t.get('lrsImport') or {}
    if 'not supplied' in (li.get('limitations') or ''):
        put(li, 'limitations', 'This treatment follows the assigned casebook note on standing; the full opinion is on file in the main entry (added-sources/opinions/lrs-i-biden-nebraska.txt).', 'nodes[lrs-i-biden-nebraska].additionalTreatments.lrsImport')
sub(nodes['lrs-framework'], 'notes', 'Source gaps remain visible.', 'The three readings not on file are listed by name in the reading-plans subject.', 'nodes[lrs-framework]')
for e in data['edges']:
    if e.get('source') == 'lrs-gap-11-01' and e.get('target') == 'lrs-s-slaughter':
        put(e, 'label', 'Supplement on file; decision briefed', f'edges[{e["id"]}]')
        put(e, 'explanation', 'The class 11 supplement is on file (added-sources/Class 11 - Slaughter Supplement.html); the Slaughter entry carries its notes and questions and is briefed from the published opinion.', f'edges[{e["id"]}]')
    sub(e, 'explanation', 'The earlier missing-source notice is retained in the relationship history.', 'The earlier notice that the source had not arrived is kept in the relationship history.', f'edges[{e["id"]}]', 'wording')

for n in data['nodes']:
    li = n.get('lrsImport')
    if li and li.get('topic') == 'Reading plans and source gaps':
        put(li, 'topic', 'Reading plans and sources on file', f'nodes[{n["id"]}].lrsImport', 'wording')
    if li and li.get('subtopic') == 'Missing assigned readings':
        put(li, 'subtopic', 'Assigned readings on file', f'nodes[{n["id"]}].lrsImport', 'wording')

# received LRS gap notes already carry their files; make the tag and role consistent
for n in data['nodes']:
    if n['id'].startswith('lrs-gap-') and n.get('status') == 'Source received':
        swap_tag(n, 'lrs-source-gap', 'lrs-source-on-file')
        pl = placements.get(n['id'])
        if isinstance(pl, dict):
            put(pl, 'role', 'Supplied source', f'placements[{n["id"]}]')

# genuinely absent LRS readings
still_missing('lrs-gap-01-03', 'The "First Day Questions" handout (class 1) is not among the supplied files. Add it to added-sources to link it here.',
              'The corrected syllabus assigns it for class 1. This entry tracks the handout; it is not a substitute for it.', 'LRS class 1')
still_missing('lrs-gap-02-01', 'Mashaw, "Introduction to Regulation and the Administrative State", printed pages 1–41 (class 2), is not among the supplied files: the September packet begins at printed page 43. Add the pages to added-sources to link them here.',
              'The corrected syllabus assigns pages 1–41 for class 2. This entry tracks the reading; it is not a substitute for it.', 'LRS class 2')
still_missing('lrs-gap-07-01', 'Printed pages 68–69 of the nondelegation reading (class 7, pages 43–76) are not in the September packet; pages 43–67 and 70–106 are on file and briefed.',
              'The corrected syllabus assigns pages 43–76 for class 7. Only pages 68–69 are absent; the Amalgamated Meat Cutters discussion around them is briefed from the pages on hand.', 'LRS class 7')
for nid in ('lrs-gap-01-03', 'lrs-gap-02-01', 'lrs-gap-07-01'):
    n = nodes[nid]
    put(n['learning'], 'coverage', 'missing-source', f'nodes[{nid}].learning')
    put(n['lrsImport'], 'coverageLevel', 'missing-source', f'nodes[{nid}].lrsImport')

LC = data['lrsCorpus']
put(LC, 'sourceGaps', ['lrs-gap-01-03', 'lrs-gap-02-01', 'lrs-gap-07-01'], 'lrsCorpus')
ACCT = {'full-account': 'full brief in the atlas', 'source-on-file': 'the file opens from the atlas', 'missing-source': 'the file opens from the atlas'}
for a in LC['assignments']:
    w = f'lrsCorpus.assignments[{a["id"]}]'
    g = nodes.get(a.get('gapRecordId') or '')
    if not g:
        continue
    file_urls = [s['url'] for s in g.get('sources', []) if (s.get('url') or '').startswith('added-sources/') and on_file(s['url'])]
    if g.get('status') == 'Source received' and file_urls:
        f = file_urls[0]
        put(a, 'status', 'source-on-file', w); put(a, 'sourceStatus', 'source-on-file', w)
        if a.get('accountStatus') == 'missing-source':
            put(a, 'accountStatus', 'source-on-file', w)
        put(a, 'sourceFile', f, w)
        extra = ' (Articles I–III at PDF pages 2–10; the Mashaw reprint at printed pages 1293–1301 is not in the packets)' if a['id'] == 'lrs-assignment-01-02' else ''
        put(a, 'coverageStatus', f'source on file: {f.split("/")[-1].split("#")[0]}{extra}; {ACCT.get(a.get("accountStatus"), a.get("accountStatus"))}', w)
        put(a, 'gapReason', '', w)
        put(a, 'missingPrintedPages', [], w); put(a, 'missingPages', [], w)
        if 'notes' in a and 'absent' in a['notes']:
            put(a, 'notes', 'The separately assigned opinion is on file (added-sources/USVMEAD.pdf) and the Mead entry is a full brief; the textbook discussion of Mead is also indexed.', w)
    elif a['id'] == 'lrs-assignment-01-03':
        put(a, 'gapReason', 'Not among the supplied files: the "First Day Questions" handout.', w)
        put(a, 'coverageStatus', 'missing-source: handout not among the supplied files', w)
    elif a['id'] == 'lrs-assignment-02-01':
        put(a, 'gapReason', 'Not among the supplied files: Mashaw printed pages 1–41 (the September packet begins at printed page 43).', w)
        put(a, 'coverageStatus', 'missing-source: pages 1–41 not among the supplied files', w)
    elif a['id'] == 'lrs-assignment-07-01':
        put(a, 'gapReason', 'Printed pages 68–69 are not in the September packet; pages 43–67 and 70–76 are on file and briefed.', w)
        put(a, 'coverageStatus', 'partly-available: pages 68–69 not among the supplied files; authored accounts linked for the rest', w)
SLL = LC.get('scopeLimits') or []
for i, s in enumerate(SLL):
    if s == 'Missing Brightspace readings and absent textbook pages remain gaps.':
        SLL[i] = 'Every Brightspace reading, the Constitution, the Parrillo–Shane supplement and the Slaughter supplement are on file in added-sources. Not among the supplied files: the First Day Questions handout (class 1), Mashaw pages 1–41 (class 2) and Mashaw pages 68–69 (class 7).'; changes.append(('claim', f'lrsCorpus.scopeLimits[{i}]'))

# ---------------------------------------------------------------- 5. scope notes, districts, regions
SN = data.get('scopeNotes') or {}
put(SN, 'Legislation and the Regulatory State', 'LRS entries are grounded in the supplied course packets and the readings on file in added-sources: the Constitution, the Parrillo–Shane supplement, the Brightspace cases, the Slaughter supplement, Mead and 77 full opinions. Three readings are not among the supplied files and are listed by name (the First Day Questions handout, Mashaw pages 1–41 and pages 68–69); nothing is reconstructed in their place.', 'scopeNotes')
sub(SN, 'Civil Procedure', 'Provision guides are casebook-based, not the full 2026–2027 statutory supplement; historical opinions may quote earlier numbering.', 'Provision guides are casebook-based and each opens its page of the 2026–2027 statutory supplement on file; historical opinions may quote earlier numbering.', 'scopeNotes')
sub(SN, 'Contracts', 'Contracts entries paraphrase the supplied tenth-edition casebook and the Fall 2026 supplement,', 'Contracts entries paraphrase the supplied tenth-edition casebook, the Fall 2026 supplement and the Selections on file,', 'scopeNotes', 'wording')

DISTRICTS = {
    'source-gaps': ('Separately assigned Contracts sources', 'Items the syllabus assigns outside the casebook. The Apple agreement and Balfour are in the course supplement; the Selections, the Wood–Lucy agreement, N.Y. Gen. Oblig. Law § 5-1105 and the Restatement of Consumer Contracts are in the Selections PDF on file. Only classroom-only notes and problems are not among the supplied files.'),
    'semester-sources': ('Supplemental documents', 'The complete Selections for Contracts (713 pages, including the Peevyhouse lease) and the course supplement are on file; every provision entry opens its page. Not among the supplied files: the EU Directive and Notifications and the remedies video lecture.'),
    'cp-source-gaps': ('Separately supplied sources', 'Berk v. Choy and Cross v. United States came as separate files; both are full entries with the opinion on file, and the 354-page supplement opens page by page.'),
    'lrs-topic-reading-plans-and-source-gaps-missing-assigned-readings': ('Assigned readings on file', 'Readings the syllabus assigns outside the packets, including the Constitution. Each opens from a file beside the atlas. Three items are not among the supplied files: the First Day Questions handout (class 1), Mashaw pages 1–41 (class 2) and Mashaw pages 68–69 (class 7).'),
}
D = data['studyMap']['districts']
for did, (title, q) in DISTRICTS.items():
    if did in D:
        put(D[did], 'title', title, f'studyMap.districts[{did}]'); put(D[did], 'question', q, f'studyMap.districts[{did}]')
for r in data.get('geography', {}).get('regions', []) or []:
    ds = r.get('districts') or []
    for d in (ds if isinstance(ds, list) else ds.values()):
        if d.get('id') in DISTRICTS:
            put(d, 'title', DISTRICTS[d['id']][0], f'geography.regions[{r.get("id")}].districts[{d["id"]}]'); put(d, 'question', DISTRICTS[d['id']][1], f'geography.regions[{r.get("id")}].districts[{d["id"]}]')
REGION_DESC = {
    'Keep broad lenses, reading records, and source gaps out of the doctrinal route.': 'Keep broad lenses, reading records, and source-tracking notes out of the doctrinal route.',
    'Reading plans and source gaps in the assigned readings.': 'Reading plans and the sources on file for the assigned readings.',
}
for coll, name in ((data['studyMap']['regions'], 'studyMap.regions'), (data.get('geography', {}).get('regions', []) or [], 'geography.regions')):
    for r in coll:
        if r.get('description') in REGION_DESC:
            put(r, 'description', REGION_DESC[r['description']], f'{name}[{r.get("id")}]', 'wording')
bal = placements.get('balfour')
if isinstance(bal, dict):
    put(bal, 'reviewNote', 'The casebook’s contextual references are retained; the separately assigned supplemental opinion is in the course supplement, pp. 11–20.', 'placements[balfour]')

# ---------------------------------------------------------------- bookkeeping
HISTORY = ('Revision 12: source claims checked against added-sources; the Constitution, the Wood–Lucy and Peevyhouse agreements, the Restatement of Consumer Contracts and the '
           'supplement pages of Rules 4, 9, 11, 12, 56 and §§ 1332, 1335, 1453 linked; the LRS coverage dialog lists only the three readings that are not on file; '
           f'{len(MISSING)} assigned items remain unsupplied: ' + '; '.join(r for r, _ in MISSING))
hist = [h for h in data['history'] if h.get('revision') == 12 and h.get('action', '').startswith('Revision 12: source claims')]
if not hist or hist[-1]['action'] != HISTORY:
    changes.append(('wording', 'history'))
n_claims = sum(1 for c, _ in changes if c == 'claim'); n_wording = sum(1 for c, _ in changes if c == 'wording')
if changes:
    data['revision'] = max(int(data.get('revision') or 0), 12)
    data.setdefault('dklaRelease', {})['contentBuild'] = BUILD
    data['updatedAt'] = TODAY
    data['description'] = 'Revision 12: every source claim checked against added-sources; the Constitution, the Wood–Lucy and Peevyhouse agreements and the Restatement of Consumer Contracts linked; only three LRS readings and four Contracts items remain unsupplied.'
    data['history'] = [h for h in data['history'] if not (h.get('revision') == 12 and h.get('action', '').startswith('Revision 12: source claims'))]
    data['history'].append({'at': TODAY, 'action': HISTORY, 'revision': 12})
    out = json.dumps(data, ensure_ascii=False, separators=(',', ':')); assert '</' not in out
    html = html[:s0] + out + html[e0:]
    open(HTML, 'w', encoding='utf-8').write(html)

# ---------------------------------------------------------------- summary
print(f'{HTML}')
print(f'{"claims corrected":<40}{n_claims:>6}')
print(f'{"generic wording changes":<40}{n_wording:>6}')
print(f'{"readings genuinely not on file":<40}{len(MISSING):>6}')
for reading, where in MISSING:
    print(f'   - {reading}  ({where})')
if '-v' in sys.argv:
    for c, w in changes:
        print(f'  [{c}] {w}')
