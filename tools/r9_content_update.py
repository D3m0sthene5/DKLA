#!/usr/bin/env python3
"""Revision 9 content update for DKLA-r8.html.

Applies the factual corrections and the boilerplate clean-up from the September 2026
design and content audit directly to the `seedData` and `dklaIcons` JSON blocks.
Run once from the DKLA folder:

    python3 tools/r9_content_update.py            # edits DKLA-r8.html in place
    python3 tools/r9_content_update.py --check    # report only, change nothing

The script refuses to run twice (it looks for the Trump v. Slaughter account).
Only the Python standard library is used.
"""
import json, os, re, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'DKLA-r8.html')
CHECK = '--check' in sys.argv
TODAY = '2026-09-23T00:00:00Z'


def load_block(html, block_id):
    m = re.search(r'<script id="' + block_id + r'"[^>]*>', html)
    start, end = m.end(), html.find('</script>', m.end())
    return start, end, json.loads(html[start:end])


def dump(obj):
    s = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    assert '</' not in s, 'unexpected closing tag inside JSON'
    return s


html = open(HTML, encoding='utf-8').read()
s0, e0, data = load_block(html, 'seedData')
s1, e1, icons = load_block(html, 'dklaIcons')
assert dump(data) == html[s0:e0], 'seedData would not round-trip byte-for-byte'
if dump(icons) != html[s1:e1]:
    print('note: dklaIcons is re-serialized with compact separators (content unchanged apart from the edits below)')

nodes = {n['id']: n for n in data['nodes']}
if 'lrs-s-slaughter' in nodes:
    sys.exit('Revision 9 content update already applied.')

changed = []


def touch(node_id, note):
    nodes[node_id]['updatedAt'] = TODAY
    changed.append((node_id, note))


def replace_in(node_id, field, old, new, section=None):
    n = nodes[node_id]
    holder = n['sections'] if section else n
    key = section or field
    assert old in holder[key], f'{node_id}.{key}: expected text not found'
    holder[key] = holder[key].replace(old, new)
    touch(node_id, f'{key}: corrected')


# ---------------------------------------------------------------- 1. Humphrey's Executor / Trump v. Slaughter
h = nodes['lrs-s-humphrey']
h['summary'] += ' Overruled by Trump v. Slaughter (2026).'
h['notes'] = ('Current-law update (not from the assigned September packet): in Trump v. Slaughter, '
              'decided June 29, 2026, the Supreme Court held 6–3 that the FTC Act’s for-cause removal '
              'restriction violates Article II and overruled Humphrey’s Executor: “If anything more is left '
              'of Humphrey’s, we overrule it.” Read this account as the 1935 holding and as the historical '
              'framework the later removal cases argued about, not as current law. The class 11 Slaughter '
              'supplement is assigned reading; open the Trump v. Slaughter entry for the decision.')
replace_in('lrs-s-humphrey', None,
           'Later assigned cases revise the functional vocabulary and debate the decision’s scope; this account reports the 1935 holding without asserting a current-law audit.',
           'Later assigned cases revised the functional vocabulary and debated the decision’s scope. This account reports the 1935 holding; Trump v. Slaughter (2026) has since overruled it.',
           section='Reasoning')
h['learning']['topics']['lrs-s-removal'] = ('For-cause protection was upheld for the commission as characterized by the Court; '
                                            'Trump v. Slaughter (2026) overruled that holding.')

nodes['lrs-s-ftc-tenure']['notes'] = nodes['lrs-s-ftc-tenure']['notes'].replace(
    'This historical statutory treatment must be kept separate from later removal cases and any unsupplied course update.',
    'This is the historical statutory treatment. Trump v. Slaughter (2026) held the removal restriction unconstitutional, so the provision no longer limits presidential removal of commissioners.')
touch('lrs-s-ftc-tenure', 'notes: Slaughter update')

replace_in('lrs-s-removal', 'notes',
           'The September materials end at the transition to Roberts Court doctrine; later assigned materials and the missing Slaughter supplement must be consulted before stating the semester’s complete treatment or current law.',
           'The September materials end at the transition to Roberts Court doctrine. Trump v. Slaughter (2026) then overruled Humphrey’s Executor for the FTC and rejected a multimember-expert-agency exception; read the Slaughter account before stating current law.')

slaughter = {
    'id': 'lrs-s-slaughter',
    'title': 'Trump v. Slaughter (2026)',
    'shortTitle': 'Trump v. Slaughter',
    'kind': 'Case',
    'courses': ['Legislation and the Regulatory State'],
    'summary': 'The Court held 6–3 that the FTC Act’s for-cause limit on removing commissioners violates Article II and overruled Humphrey’s Executor; the President may remove FTC commissioners at will.',
    'notes': 'Written from the published opinion and public reporting, not from the assigned Brightspace supplement, which is still absent from the supplied files. Check the supplement’s excerpt and editorial questions before class 11. The same day, in Trump v. Cook, the Court treated the Federal Reserve as a distinct case and left its governors’ protection in place.',
    'sections': {
        'Parties': 'President Trump removed Rebecca Kelly Slaughter, a Federal Trade Commissioner, without asserting any of the statutory causes (inefficiency, neglect of duty, or malfeasance in office). Slaughter sued to keep her seat. The United States defended the removal as an exercise of the President’s Article II authority.',
        'Material Facts': 'The FTC Act has limited presidential removal of commissioners to the three listed causes since 1914, and Humphrey’s Executor (1935) upheld that limit. In March 2025 the President removed Slaughter for policy reasons rather than any listed cause, relying on the view that the restriction is unconstitutional. The modern Commission investigates, brings enforcement actions, adjudicates, and issues binding rules.',
        'Procedural History': 'Slaughter sued in the District of Columbia. The district court held the removal unlawful under Humphrey’s Executor and ordered her reinstated; the D.C. Circuit declined to stay that order. In September 2025 the Supreme Court stayed the reinstatement and granted certiorari before judgment. On June 29, 2026, it ruled for the President.',
        'Issue': 'Does the FTC Act’s for-cause removal restriction violate Article II’s vesting of the executive power in the President, and should Humphrey’s Executor be overruled?',
        'Holding': 'Yes, 6–3. The removal restriction is unconstitutional. The Chief Justice’s majority opinion held that the FTC exercises substantial executive power, that Seila Law and Collins had already reduced Humphrey’s Executor to a narrow exception, and that “if anything more is left of Humphrey’s, we overrule it.” The President may remove FTC commissioners at will.',
        'Reasoning': 'The majority built on Myers, Free Enterprise Fund, Seila Law, and Collins: Article II vests the executive power in the President alone, and removal is the ordinary means of supervising the officers who exercise it. Humphrey’s Executor rested on a 1935 description of the FTC as “quasi-legislative” and “quasi-judicial”; the Court treated the modern Commission’s investigation, prosecution, adjudication, and rulemaking as executive power and declined to preserve an exception for multimember expert agencies. Justice Sotomayor’s dissent, joined by Justices Kagan and Jackson, argued that the Court had discarded ninety years of precedent and congressional design, and asked why monetary policy alone should keep its insulation.\n\nFor the course: the case ends the line that runs Myers → Humphrey’s Executor → Wiener → Morrison → Free Enterprise Fund → Seila Law, and it reframes the inferior-officer and adjudicator cases as questions about what for-cause protection, if any, survives below the principal-officer level.',
    },
    'sources': [
        {'label': 'Trump v. Slaughter, No. 25-332 (U.S. June 29, 2026), slip opinion', 'url': 'https://www.supremecourt.gov/opinions/25pdf/25-332_qn12.pdf'},
        {'label': 'Congressional Research Service, Trump v. Slaughter and the Future of For-Cause Removal Protections (LSB11448)', 'url': 'https://www.congress.gov/crs-product/LSB11448'},
        {'label': 'Shane, corrected Fall 2026 LRS syllabus, class 11: Trump v. Slaughter Supplement (file not supplied)', 'url': ''},
    ],
    'tags': ['lrs-r9'],
    'status': 'Source-limited account',
    'learning': {
        'topics': {
            'lrs-s-removal': 'Overrules Humphrey’s Executor: for-cause protection for FTC commissioners is unconstitutional.',
            'lrs-s-agency-independence': 'Removal protection for a multimember expert commission no longer insulates the agency from at-will removal.',
        },
        'coverage': 'outside-primary-source',
        'separateOpinions': 'Chief Justice Roberts wrote for the Court. Justice Sotomayor dissented, joined by Justices Kagan and Jackson.',
        'district': 'lrs-topic-removal-and-agency-independence-for-cause-protection-and-agency-functions',
        'why': 'Slaughter is the current rule on presidential removal of FTC commissioners and the reason Humphrey’s Executor is now history rather than doctrine.',
    },
    'lrsImport': {
        'sourceRefs': [],
        'coverageLevel': 'Account from the published opinion',
        'limitations': 'The assigned supplement is absent from the supplied files; this account is written from the slip opinion and the CRS analysis.',
        'assignmentId': 'lrs-assignment-11-01',
        'topic': 'Removal and agency independence',
        'subtopic': 'For-cause protection and agency functions',
        'basis': 'Published opinion and Congressional Research Service analysis, identified as outside the supplied course packet.',
    },
    'mnemonic': {'key': 'gavel', 'rationale': 'The decision overrules a ninety-year-old precedent.'},
    'position': {'x': 23788, 'y': 3018},
    'createdAt': TODAY,
    'updatedAt': TODAY,
}
data['nodes'].insert(data['nodes'].index(nodes['lrs-s-humphrey']) + 1, slaughter)
nodes['lrs-s-slaughter'] = slaughter
changed.append(('lrs-s-slaughter', 'new case account'))

# map home, placement, district membership, corpus links
m = data['studyMap']
m['homes']['lrs-s-slaughter'] = {'id': 'lrs-s-slaughter', 'x': 23788, 'y': 3018, 'w': 525, 'h': 92,
                                 'region': 'lrs-region-removal-and-agency-independence',
                                 'district': 'lrs-topic-removal-and-agency-independence-for-cause-protection-and-agency-functions',
                                 'core': True, 'support': False}
g = data['geography']
g['placements']['lrs-s-slaughter'] = dict(g['placements']['lrs-s-humphrey'], displayLabel='Trump v. Slaughter (2026)', landmark=True)
for r in g['regions']:
    for d in r['districts']:
        if d['id'] == 'lrs-topic-removal-and-agency-independence-for-cause-protection-and-agency-functions':
            d['nodeIds'].append('lrs-s-slaughter')
for a in data['lrsCorpus']['assignments']:
    if a.get('id') == 'lrs-assignment-11-01':
        a['authoredRecordIds'] = ['lrs-s-slaughter', 'lrs-gap-11-01']
        a['atlasRecordIds'] = ['lrs-s-slaughter', 'lrs-gap-11-01']
        a['accountStatus'] = 'account-from-published-opinion'
        a['coverageStatus'] = 'missing-source; account written from the published opinion'
data['lrsCorpus']['accountIds'].append('lrs-s-slaughter')

gap = nodes['lrs-gap-11-01']
gap['summary'] = 'The supplement file is absent from the supplied files; the decision itself is briefed in the Trump v. Slaughter (2026) entry.'
gap['notes'] = ('The corrected syllabus assigns this material in class 11 and it is required reading. The supplement file itself '
                'was not supplied, so its excerpt and editorial questions are unknown. An account of the decision written from the '
                'published opinion is filed under Removal and agency independence.')
touch('lrs-gap-11-01', 'points to the new account')


def edge(eid, src, tgt, kind, label, explanation, sources):
    return {'id': eid, 'source': src, 'target': tgt, 'label': label, 'kind': kind, 'explanation': explanation,
            'status': 'Proposed', 'supports': [], 'sources': sources, 'createdAt': TODAY, 'updatedAt': TODAY}


src_sl = [{'label': 'Trump v. Slaughter slip opinion', 'url': 'https://www.supremecourt.gov/opinions/25pdf/25-332_qn12.pdf'}]
data['edges'] += [
    edge('r9-slaughter-overrules-humphrey', 'lrs-s-slaughter', 'lrs-s-humphrey', 'Tension', 'Overrules',
         'Slaughter overrules Humphrey’s Executor: the FTC’s for-cause removal protection is unconstitutional, and the 1935 functional categories no longer control.', src_sl),
    edge('r9-slaughter-removal', 'lrs-s-slaughter', 'lrs-s-removal', 'Doctrine', 'States the current rule on presidential removal',
         'The President may remove FTC commissioners at will; statutory for-cause limits on principal officers who exercise executive power are invalid.', src_sl),
    edge('r9-slaughter-independence', 'lrs-s-slaughter', 'lrs-s-agency-independence', 'Doctrine', 'Limits structural independence',
         'Multimember leadership, staggered terms, and political balance no longer support for-cause removal protection for an agency that exercises executive power.', src_sl),
    edge('r9-slaughter-gap', 'lrs-gap-11-01', 'lrs-s-slaughter', 'Study link', 'Account of the missing supplement’s decision',
         'The class 11 supplement was not supplied; this entry briefs the decision from the published opinion.', src_sl),
]

# ---------------------------------------------------------------- 2. Mallory: majority vs plurality
nodes['cp-mallory']['sections']['Reasoning'] = (
    'Only Parts I and III‑B of Justice Gorsuch’s opinion commanded five votes (Gorsuch, Thomas, Sotomayor, Jackson, and Alito) and are the opinion of the Court. '
    'Those parts hold that Pennsylvania Fire controls: a corporation that registers under a statute giving express notice that registration means consent to suit in the state’s courts has consented to general jurisdiction, and International Shoe did not overrule Pennsylvania Fire. '
    'The remaining parts (II, III‑A, and IV) are a plurality of four. The plurality’s broader reasoning — that International Shoe supplied an additional road to jurisdiction over nonconsenting defendants and left the consent road untouched, and that jurisdiction by consent is fully consistent with due process — is not binding precedent.\n\n'
    'Justice Alito’s concurrence supplied the fifth vote on the narrow Pennsylvania Fire ground while flagging that the dormant Commerce Clause may forbid the scheme. Justice Jackson’s concurrence framed the result as waiver under Insurance Corp. of Ireland. The four dissenters (Barrett, joined by Roberts, Kagan, and Kavanaugh) argued that compelled registration cannot evade the modern limits on all-purpose jurisdiction in Goodyear and Daimler.\n\n'
    'On a cold call, separate the narrow majority holding from the plurality’s theory. A question about what International Shoe “left in place” is a question about the plurality, and a statutory question about what another state’s registration law actually requires remains distinct.')
nodes['cp-mallory']['learning']['topics']['cp-precedent'] = 'Only Parts I and III‑B (the Pennsylvania Fire ground) had five votes; the broader consent-and-International-Shoe reasoning is a four-Justice plurality.'
touch('cp-mallory', 'Reasoning: majority and plurality parts labeled')

# ---------------------------------------------------------------- 3. Capron: attribute the quoted reasoning to counsel
nodes['cp-capron']['sections']['Holding'] = (
    'Yes. The Supreme Court reversed the judgment. The reported decision gives no reasons: the familiar statement that “it was the duty of the Court to see that they had jurisdiction, for the consent of parties could not give it” comes from Harper’s argument for the plaintiff in error, which the Court accepted by reversing.')
nodes['cp-capron']['sections']['Reasoning'] = (
    'The report consists of Harper’s argument and a one-line disposition (“Judgment reversed”), so the reasoning later cases attribute to Capron is inferred from what the Court did. '
    'The principle the case stands for: a federal court’s subject-matter authority must appear on the record and exists independently of the parties’ willingness to litigate, so even the plaintiff who chose the forum may assign its want of jurisdiction as error. '
    'The decision separates the validity of the adjudicative process from the merits of the underlying wrong: a defendant’s favorable verdict cannot sustain a judgment when the record fails to establish federal jurisdiction. Rule 12(h)(3) states the modern form of the same rule.')
touch('cp-capron', 'Holding and Reasoning: counsel’s argument no longer credited to the Court')

# ---------------------------------------------------------------- 4. Klein v. PepsiCo: the jet was withdrawn, not kept available
replace_in('klein-pepsico', None,
           'PepsiCo then withdrew the aircraft after its chairman requested that it remain available.',
           'PepsiCo then withdrew the aircraft after its chairman, Donald Kendall, asked that it be withdrawn from the market.',
           section='Material Facts')

# ---------------------------------------------------------------- 5. Lucy v. Zehmer: one court name
nodes['lucy']['notes'] = ('Court: Supreme Court of Appeals of Virginia (1954), the name Virginia’s highest court used until 1971. '
                          'Casebooks and citators often call it the Supreme Court of Virginia.')
touch('lucy', 'notes: court name made consistent')

# ---------------------------------------------------------------- 6. Jarkesy: Fifth Circuit relied on three grounds
replace_in('lrs-o-jarkesy', None,
           'A divided Fifth Circuit panel granted respondents’ petition for review and vacated the order on Seventh Amendment grounds. The Supreme Court affirmed and remanded.',
           'A divided Fifth Circuit panel granted respondents’ petition for review and vacated the order on three grounds: the proceeding violated the Seventh Amendment; Congress had unconstitutionally delegated legislative power by letting the SEC choose its forum without an intelligible principle; and the administrative law judges’ two layers of removal protection violated Article II. The Supreme Court affirmed on the Seventh Amendment ground alone and did not reach the other two.',
           section='Procedural History')

# ---------------------------------------------------------------- 7. § 2-207(3): the statute's wording
replace_in('ucc207-conduct', 'notes',
           'The subsection then identifies terms on which the writings agree together with applicable supplementary terms.',
           'The subsection then supplies the terms: “those terms on which the writings of the parties agree, together with any supplementary terms incorporated under any other provisions of this Act.” Conflicting terms in the two forms therefore drop out (the knock-out rule) and the Code’s gap-fillers take their place.')

# ---------------------------------------------------------------- 8. Biden v. Nebraska: the account does describe standing
replace_in('lrs-i-biden-nebraska', None,
           'The note summarizes the Supreme Court decision and separate opinions. It omits the lower-court proceedings, standing analysis, and formal disposition. Those issues therefore are outside this source-limited account.',
           'The note summarizes the Supreme Court decision and separate opinions and omits the lower-court proceedings and the formal disposition. A second assigned note (printed p. 1243) reports the standing ruling, summarized below; the full standing analysis and the program’s mechanics are outside this source-limited account.',
           section='Procedural History')

# ---------------------------------------------------------------- 9. § 1332: state the thresholds
nodes['cp-usc-1332']['sections']['What to examine'] += (
    '\n\nUnder § 1332(a) the amount in controversy must exceed $75,000, exclusive of interest and costs, and diversity must be complete: no plaintiff may share a state of citizenship with any defendant (Strawbridge). '
    'A corporation is a citizen of its state of incorporation and of the state of its principal place of business (§ 1332(c)(1)). '
    'The Class Action Fairness Act, § 1332(d), gives original jurisdiction over class actions with at least 100 proposed class members, more than $5,000,000 in controversy in the aggregate, and minimal diversity (any class member diverse from any defendant), subject to the local-controversy and home-state exceptions.')
touch('cp-usc-1332', 'thresholds added')

# ---------------------------------------------------------------- 10. Sentences addressed to the writer
replace_in('peevyhouse', None,
           'A detailed account must retain this disagreement rather than describe restoration’s unimportance as an uncontested fact.',
           'Whether restoration was central or incidental is therefore a contested characterization, not an uncontested fact.',
           section='Material Facts')

# ---------------------------------------------------------------- 11. Repeated boilerplate
BOILERPLATE = [
    'Casebook discussion of a shorter authority.',
    'Textbook problem / open questions.',
    'No answer key is supplied in the assigned passage.',
    'A cited case may suggest a line of thought; its citation is not treated as the answer.',
    'This is a casebook-based guide to the provision, not the full assigned 2026–2027 supplement text.',
    'Quotations in historical opinions may use earlier numbering or wording.',
    'The missing complete provision, commentary, and amendments remain listed as a source gap.',
    'Assignment numbering follows the supplied syllabus.',
    'It does not establish the calendar date on which each item was discussed.',
    'Only assignment 9 has the user-reported September 22, 2026 classroom focus.',
    'Full page images preserve the surrounding editorial notes, cited authorities, and questions.',
    'A source-page archive is broader than the individually written brief and concept index.',
    'Related textbook discussions, if present, do not establish possession of the separately assigned source.',
    'No source-grounded brief has been invented for the missing material.',
    'The page buttons open the exact assigned ranges, including editorial commentary, references, and unresolved problems.',
    'The following comparisons organize the principal readings; they do not supply an official answer key.',
    'Distinguish the court’s holding from an editor’s question, a cited illustration, a dissent, and this notebook’s explanatory synthesis.',
    'An authority mentioned only briefly in a footnote is available on the source page; this notebook does not claim to have independently briefed its entire opinion.',
    'The date is a weekly guide from the syllabus, not a claim about which cases were actually discussed on a particular day.',
    'Class announcements supersede the syllabus.',
    'Broad page spans here include surrounding casebook context; named readings and the instructions above control.',
]
SUMMARY_SWAPS = {
    'This reading index gathers the assigned sources and principal case accounts without restricting the rest of the map.': 'Assigned readings and principal cases for this class.',
}


def strip_boilerplate(text):
    if not text:
        return text, 0
    out, hits = text, 0
    for s in BOILERPLATE:
        while s in out:
            hits += 1
            out = out.replace(s, '', 1)
    out = re.sub(r'[ \t]{2,}', ' ', out)
    out = re.sub(r'\n{3,}', '\n\n', out)
    return out.strip(), hits


removed = 0
for n in data['nodes']:
    hit = 0
    for f in ('notes', 'summary'):
        if n.get(f):
            n[f], k = strip_boilerplate(n[f])
            hit += k
    for old, new in SUMMARY_SWAPS.items():
        if n.get('summary') and old in n['summary']:
            n['summary'] = n['summary'].replace(old, new).strip()
            hit += 1
    for t in (n.get('courseTreatments') or {}).values():
        if t.get('notes'):
            t['notes'], k = strip_boilerplate(t['notes'])
            hit += k
    if hit:
        removed += hit
        n['updatedAt'] = TODAY
changed.append(('*', f'{removed} repeated boilerplate sentences removed'))
data['scopeNotes'] = {
    'Contracts': 'Contracts entries paraphrase the supplied tenth-edition casebook and the Fall 2026 supplement, with no citator or current-law review. Assignment numbers follow the syllabus; class announcements supersede it. Problems and open questions carry no answer key, and a cited case suggests a line of thought rather than an answer. The page buttons open the exact assigned ranges, including editorial notes that no entry briefs separately.',
    'Civil Procedure': 'Civil Procedure entries are accounts of the supplied casebook excerpts and the Mallory supplement. Provision guides are casebook-based, not the full 2026–2027 statutory supplement; historical opinions may quote earlier numbering. Weekly dates are a guide from the syllabus, not a record of what was discussed on a given day.',
    'Legislation and the Regulatory State': 'LRS entries are grounded in the supplied course packets. Missing assigned readings are listed as source gaps rather than reconstructed; where a public opinion exists (Trump v. Slaughter) the account says it was written from that opinion instead of the supplement.',
}

# ---------------------------------------------------------------- 12. Icons: hand-chosen motifs, keyword matching retired
NEW_PATHS = {
    'crankshaft': '<path d="M2 12h3V8h3v8h3v-4h2v4h3V8h3v4h3"/><circle cx="6.5" cy="8" r="1"/><circle cx="17.5" cy="8" r="1"/>',
    'burger': '<path d="M4 10a8 5 0 0 1 16 0Z"/><path d="M3 13h18M4 16h16"/><path d="M5 16a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3"/>',
    'bridge': '<path d="M2 17h20M4 17V9M20 17V9M4 9q8-6 16 0M8 17v-6M12 17v-7M16 17v-6"/>',
    'crown': '<path d="M3 18h18l1-11-5 4-5-6-5 6-5-4Z"/><path d="M3 21h18"/>',
    'ballot': '<rect x="4" y="9" width="16" height="12" rx="1"/><path d="M9 9V4h6v5M11 13l1.5 1.5L15 11M4 15h16"/>',
    'badge': '<path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6Z"/><path d="m9 12 2 2 4-4"/>',
    'atom': '<circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-60 12 12)"/>',
    'radio': '<rect x="3" y="9" width="18" height="11" rx="2"/><path d="m7 9 9-5M7 14h5M15 14h2"/><circle cx="16" cy="16" r="1"/>',
}
icons['paths'].update(NEW_PATHS)
LABELS = {
    'shoe': 'Shoe company', 'burger': 'Fast-food franchise', 'crankshaft': 'Mill crankshaft', 'bridge': 'Bridge', 'crown': 'Coronation',
    'ballot': 'Election', 'badge': 'Officer', 'atom': 'Nuclear plant', 'radio': 'Broadcasting', 'chicken': 'Poultry', 'factory': 'Factory or mill',
    'gavel': 'Court', 'money': 'Money', 'cow': 'Livestock', 'scale': 'Adjudication', 'person': 'Individual', 'group': 'Group',
    'letter': 'Letter or notice', 'plane': 'Aircraft', 'ship': 'Ship', 'train': 'Railroad', 'car': 'Motor vehicle', 'phone': 'Telephone or fax',
    'home': 'House', 'land': 'Land', 'shop': 'Store', 'bank': 'Bank', 'shares': 'Securities', 'medical': 'Medical', 'medicine': 'Drugs',
    'school': 'School', 'book': 'Book', 'newspaper': 'Press', 'video': 'Film or television', 'music': 'Music', 'water': 'Water', 'gas': 'Fuel or emissions',
    'tree': 'Forest or park', 'fish': 'Fishing', 'mine': 'Mining', 'construction': 'Construction', 'gear': 'Machinery', 'pipe': 'Pipe', 'bottle': 'Bottle',
    'garment': 'Clothing', 'food': 'Food', 'horse': 'Horse', 'luggage': 'Travel', 'receipt': 'Receipt or record', 'hand': 'Hand', 'dancer': 'Dance',
    'software': 'Computer', 'download': 'Download', 'building': 'Building', 'case': 'Case account',
}
HAND = {
    # Contracts
    'shoe': 'shoe', 'burger': 'burger', 'hadley': 'crankshaft', 'krell': 'crown', 'taylor-caldwell': 'music', 'rockingham': 'bridge',
    'note-leonard': 'plane', 'lawrence-fox': 'money', 'ricketts': 'money', 'feinberg': 'money', 'balfour': 'money', 'kingston': 'garment',
    'wood-lucy': 'garment', 'white-corlies': 'construction', 'drennan': 'construction', 'dyer': 'medical', 'mattei': 'shop', 'structural-polymer': 'factory',
    'cohen-cowles': 'newspaper', 'speakers-sport': 'group', 'masterson': 'land', 'www-associates': 'land', 'trident': 'building', 'market-street': 'building',
    'columbia-nitrogen': 'factory', 'klar': 'luggage', 'doe-great-expectations': 'person', 'williams-walker-thomas': 'shop', 'blossom-farm': 'cow',
    'peacock': 'construction', 'gibson': 'person', 'mckenna': 'building', 'lake-river': 'factory', 'citoh': 'factory', 'bayway': 'gas', 'dorton': 'home',
    'hill-gateway': 'software', 'cyberchron': 'software', 'channel-home': 'shop', 'sun-printing': 'newspaper', 'oglebay': 'ship', 'swinton': 'home',
    'nanakuli': 'construction', 'northwest-ginsberg': 'plane', 'graham': 'music', 'gill': 'tree', 'stees': 'construction', 'renner': 'land',
    'algernon-blair': 'construction', 'parker': 'video', 'fera': 'shop', 'figgie': 'bottle', 'psenicska': 'video', 'gianni': 'shop', 'teevee-toons': 'music',
    'cosby': 'gavel', 'wucherpfennig': 'land', 'nelson-hazel': 'construction', 'xlo': 'construction',
    'wwvw': 'car', 'ford': 'car', 'carnival': 'ship', 'lucy': 'receipt', 'specht': 'download', 'hawkins': 'hand', 'bayliner': 'ship', 'sullivan': 'medical',
    'naval-institute': 'book', 'morris-sparrow': 'horse', 'white-benkowski': 'water', 'hamer': 'bottle', 'tolosa': 'bank', 'dg-stout': 'bottle',
    'lefkowitz': 'garment', 'international-filter': 'water', 'klocek': 'software', 'dixon': 'bank', 'alaska-packers': 'fish', 'watkins': 'construction',
    'austin': 'gear', 'kannavos': 'home', 'vokes': 'dancer', 'bollinger': 'construction', 'pacific-gas': 'construction', 'greenfield': 'music',
    'frigaliment': 'chicken', 'hurst': 'horse', 'dalton': 'school', 'bloor': 'bottle', 'stoll': 'land', 'luttinger': 'bank', 'jacob-youngs': 'pipe',
    'transatlantic': 'ship', 'walgreen': 'shop', 'plante': 'construction', 'groves': 'construction', 'peevyhouse': 'mine', 'kenford': 'construction',
    'dave-gustafson': 'construction', 'wassermans': 'shop', 'seaver': 'home', 'sisney-state': 'food', 'sisney-reisch': 'food', 'klein-pepsico': 'plane',
    'northrop': 'gear', 'hassler': 'home', 'swiss-2024': 'letter',
    # Civil Procedure
    'cp-mussat': 'phone', 'cp-home-depot': 'receipt', 'cp-keeton': 'newspaper', 'cp-calder': 'newspaper', 'cp-asahi': 'car', 'cp-nicastro': 'gear',
    'cp-walden': 'money', 'cp-goodyear': 'car', 'cp-daimler': 'car', 'cp-bristol-myers': 'medicine', 'cp-perkins': 'mine', 'cp-burnham': 'luggage',
    'cp-sniadach': 'money', 'cp-fuentes': 'shop', 'cp-grable': 'land', 'cp-gunn': 'gavel', 'cp-kroger': 'construction', 'cp-exxon': 'gas',
    'cp-swift': 'money', 'cp-hanna-decision': 'letter', 'cp-iqbal': 'person', 'cp-conley': 'train', 'cp-dioguardi': 'bottle', 'cp-hansberry': 'home',
    'cp-walmart': 'shop', 'cp-amchem': 'medical', 'cp-ortiz': 'medical', 'cp-shady-grove': 'medical', 'cp-gasperini': 'video', 'cp-byrd': 'construction',
    'cp-celotex': 'medical', 'cp-atlantic-marine': 'construction', 'cp-tashire': 'car', 'cp-matsushita': 'video', 'cp-concepcion': 'phone',
    'cp-anderson-liberty': 'newspaper', 'cp-strawbridge': 'case', 'cp-shutts': 'gas', 'cp-transunion': 'receipt', 'cp-pennoyer': 'land', 'cp-hess': 'car',
    'cp-mcgee': 'letter', 'cp-hanson': 'bank', 'cp-gray': 'water', 'cp-kulko': 'luggage', 'cp-bnsf': 'train', 'cp-shaffer': 'shares', 'cp-mallory': 'train',
    'cp-mullane': 'newspaper', 'cp-wyman': 'luggage', 'cp-doehr': 'home', 'cp-mottley': 'train', 'cp-shoshone': 'mine', 'cp-smith': 'shares',
    'cp-gibbs': 'mine', 'cp-finley': 'plane', 'cp-reasor': 'land', 'cp-bates': 'letter', 'cp-livingston': 'land', 'cp-piper': 'plane',
    'cp-erie-decision': 'train', 'cp-york': 'bank', 'cp-dice': 'train', 'cp-clearfield': 'bank', 'cp-boyle': 'plane', 'cp-twombly': 'phone',
    'cp-swanson': 'home', 'cp-krupski': 'ship', 'cp-harris-avery': 'horse', 'cp-heyward': 'construction', 'cp-lasa': 'construction', 'cp-provident': 'car',
    'cp-jeub': 'food', 'cp-smuck': 'school', 'cp-cooper': 'bank', 'cp-adickes': 'shop', 'cp-scott': 'car', 'cp-helicopteros': 'plane',
    # Legislation and the Regulatory State
    'lrs-s-schechter': 'chicken', 'lrs-o-youngstown': 'factory', 'lrs-s-whitman': 'gas', 'lrs-s-gundy': 'gavel', 'lrs-s-buckley': 'ballot',
    'lrs-s-morrison': 'badge', 'lrs-s-arthrex': 'medical', 'lrs-s-lucia': 'shares', 'lrs-s-myers': 'letter', 'lrs-s-wiener': 'scale',
    'lrs-s-bowsher': 'money', 'lrs-s-chadha': 'person', 'lrs-s-humphrey': 'group', 'lrs-s-slaughter': 'gavel', 'lrs-k-holy-trinity': 'building',
    'lrs-i-chevron': 'factory', 'lrs-i-loper-bright': 'fish', 'lrs-i-west-virginia': 'factory', 'lrs-i-kisor': 'medical', 'lrs-i-skidmore': 'factory',
    'lrs-i-mead-note': 'book', 'lrs-i-brand-x': 'phone', 'lrs-i-king-burwell': 'medical', 'lrs-i-biden-nebraska': 'school', 'lrs-i-nfib-osha': 'medical',
    'lrs-i-benzene': 'factory', 'lrs-i-gray-powell': 'mine', 'lrs-o-jarkesy': 'gavel', 'lrs-o-londoner': 'land', 'lrs-o-bi-metallic': 'land',
    'lrs-o-goldberg': 'money', 'lrs-o-mathews': 'medical', 'lrs-o-roth': 'school', 'lrs-o-perry': 'school', 'lrs-o-loudermill': 'person',
    'lrs-o-chenery-i': 'shares', 'lrs-o-chenery-ii': 'shares', 'lrs-o-vermont-yankee': 'atom', 'lrs-n-overton-park': 'tree', 'lrs-n-state-farm': 'car',
    'lrs-n-massachusetts-epa': 'car', 'lrs-n-heckler-chaney': 'medicine', 'lrs-n-standing-lujan': 'tree', 'lrs-n-standing-sierra': 'tree',
    'lrs-n-standing-laidlaw': 'water', 'lrs-n-standing-spokeo': 'software', 'lrs-o-marbury': 'letter', 'lrs-o-little': 'ship', 'lrs-o-neagle': 'badge',
    'lrs-o-debs': 'train', 'lrs-o-dames-moore': 'money', 'lrs-o-noel-canning': 'bottle', 'lrs-o-florida-east-coast': 'train', 'lrs-o-mobil-oil': 'gas',
    'lrs-o-nova-scotia': 'fish', 'lrs-n-universal-camera': 'video', 'lrs-n-commerce-new-york': 'group', 'lrs-n-regents': 'person', 'lrs-s-mistretta': 'scale',
    'lrs-s-hampton': 'money', 'lrs-s-field': 'money', 'lrs-s-brig-aurora': 'ship', 'lrs-s-grimaud': 'tree', 'lrs-s-yakus': 'money', 'lrs-s-amalgamated': 'cow',
    'lrs-o-tyson': 'medical', 'lrs-o-marathon-oil': 'water', 'lrs-o-perales': 'medical', 'lrs-o-national-petroleum': 'gas', 'lrs-o-greene': 'badge',
    'lrs-n-automotive-parts-boyd': 'car', 'lrs-n-national-tire-brinegar': 'car', 'lrs-n-nrdc-epa-1981': 'car', 'lrs-n-community-nutrition': 'food',
    'lrs-n-national-council-adoption': 'group', 'lrs-n-fcc-fox': 'radio', 'lrs-n-adapso-board': 'bank', 'lrs-n-standing-adapso': 'bank',
    'lrs-n-norton-suwa': 'tree', 'lrs-n-standing-havens': 'home', 'lrs-n-standing-bennett': 'water', 'lrs-n-standing-patchak': 'land',
    'lrs-n-standing-newport': 'ship', 'lrs-n-standing-maritime': 'ship', 'lrs-n-standing-sffa': 'school', 'lrs-n-standing-twin-rivers': 'factory',
    'lrs-n-standing-brown-group': 'factory', 'lrs-k-arlington-murphy': 'school', 'lrs-k-gayle': 'case', 'lrs-o-church-christ': 'radio',
    'lrs-o-ashbacker': 'radio', 'lrs-o-american-radio': 'radio', 'lrs-o-memphis-light': 'water', 'lrs-o-wyman-gordon': 'factory', 'lrs-o-bell-aerospace': 'plane',
}
missing = [k for k in HAND if k not in nodes]
assert not missing, f'hand icon list names unknown entries: {missing}'
bad_motifs = [v for v in HAND.values() if v not in icons['paths']]
assert not bad_motifs, f'unknown motifs: {sorted(set(bad_motifs))}'

records = icons['records']
hand_count = neutralised = 0
for nid, rec in list(records.items()):
    if nid in HAND:
        continue
    if rec.get('basis') == 'preserved-authored-facts':
        node = nodes.get(nid)
        records[nid] = {'motif': 'case', 'label': 'Case account', 'basis': 'neutral-fallback', 'status': 'neutral',
                        'rationale': 'Keyword-matched motifs were retired in revision 9; this account keeps the neutral case-file symbol until a motif is chosen by hand.',
                        'sources': rec.get('sources', [])}
        neutralised += 1
for nid, motif in HAND.items():
    node = nodes[nid]
    prior = records.get(nid, {})
    records[nid] = {'motif': motif, 'label': LABELS.get(motif, motif.title()), 'basis': 'hand-assigned', 'status': 'fact-based',
                    'rationale': f'Chosen by hand in revision 9 for the memorable fact of the case ({LABELS.get(motif, motif)}). The motif recalls the facts and does not indicate the holding.',
                    'sources': prior.get('sources') or node.get('sources', [])[:1]}
    node['mnemonic'] = {'key': motif, 'rationale': records[nid]['rationale']}
    hand_count += 1
icons['coverage'] = {'records': len(records), 'caseAccounts': sum(1 for n in data['nodes'] if n['kind'] == 'Case'),
                     'handAssignedMotifs': hand_count, 'keywordMotifsRetired': neutralised,
                     'factBasedCaseMotifs': sum(1 for n in data['nodes'] if n['kind'] == 'Case' and records.get(n['id'], {}).get('status') == 'fact-based'),
                     'neutralCaseSymbols': sum(1 for n in data['nodes'] if n['kind'] == 'Case' and records.get(n['id'], {}).get('status') != 'fact-based'),
                     'distinctMotifs': len(icons['paths']), 'assignmentMethod': 'hand-assigned; keyword matching retired in revision 9'}
changed.append(('icons', f'{hand_count} motifs chosen by hand, {neutralised} keyword motifs retired, {len(NEW_PATHS)} glyphs added'))

# ---------------------------------------------------------------- 13. Revision metadata
data['revision'] = 9
data['updatedAt'] = TODAY
data['description'] = ('Revision 9 corrects the entries flagged by the September 2026 audit (Humphrey’s Executor and Trump v. Slaughter, Mallory, Capron, '
                       'Klein, Lucy, Jarkesy, § 2-207(3), Biden v. Nebraska, § 1332), removes repeated disclaimers, and assigns case icons by hand.')
data['exportNotes'] = 'Keep this combined revision-9 master and export after browser edits. An older export is not a merge and must not overwrite this revision.'
data['history'].append({'at': TODAY, 'action': 'Revision 9: audit corrections, Trump v. Slaughter account, boilerplate removed, icons hand-assigned, map presentation redesigned', 'revision': 9})
if data.get('dklaRelease'):
    data['dklaRelease']['contentBuild'] = 'r9-2026-09-23'
    data['dklaRelease']['name'] = 'DKLA r9'

for nid, note in changed:
    print(f'{nid}: {note}')
if CHECK:
    sys.exit('check only; nothing written')
html = html[:s0] + dump(data) + html[e0:s1] + dump(icons) + html[e1:]
open(HTML, 'w', encoding='utf-8').write(html)
print(f'wrote {HTML} ({len(html.encode("utf-8")):,} bytes)')
