#!/usr/bin/env python3
"""Revision 14d: the owner's thirteen PDFs of detailed case briefs (added-sources/*Brief*.pdf) become sources on the
case entries they cover, and the detail in them is folded into the six sections of each matched case.

Two modes.

  python3 tools/r14_briefs.py --extract
      Reads every added-sources/*Brief*.pdf with pypdf, writes the plain text of each PDF to added-sources/text/<name>.txt
      (so the in-app viewer's lone-download fallback can show it), splits each PDF into its individual briefs (case
      briefs, provision summaries, reading guides) by their printed headings, records the page range, printed case name,
      citation and section texts of each in added-sources/briefs/briefs.json, and writes one added-sources/briefs/<slug>.txt
      per brief. Run once; the output is committed.

  python3 tools/r14_briefs.py
      Applies added-sources/briefs/briefs.json and the hand-written rewrites in added-sources/briefs/rewrites-*.json to
      seedData in DKLA-r8.html: a "Brief · …, pp. N–M" source chip on every matched entry, tag r14-brief, and the rewritten
      summary / sections / separate-opinions text on the matched cases. Records what changed per entry in
      added-sources/briefs/changelog.json. Safe to re-run (idempotent on the same input).

Runs in tools/rebuild.sh after r12_fix_sources.py and before r14_wex_cases.py.
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'DKLA-r8.html')
SRC = os.path.join(ROOT, 'added-sources')
BRIEFS = os.path.join(SRC, 'briefs')
TEXT = os.path.join(SRC, 'text')
MANIFEST = os.path.join(BRIEFS, 'briefs.json')
CHANGELOG = os.path.join(BRIEFS, 'changelog.json')
SECTION_ORDER = ['Parties', 'Material Facts', 'Procedural History', 'Issue', 'Holding', 'Reasoning']

# ------------------------------------------------------------------------------------------------ extraction
# Headings that open a section inside a brief (format A: "Case name / Citation / Parties …"; format B: numbered
# "1. Case name" then "Parties / Procedural History / Material Facts / Question Presented / Holding / Reasoning").
SECTION_HEADS = {
    'Citation': 'Citation', 'Parties': 'Parties', 'Material Facts': 'Material Facts', 'Material Terms': 'Material Facts',
    'Material Text and Rules': 'Material Facts', 'Material Rules': 'Material Facts', 'Material Text and Element Map': 'Material Facts',
    'Procedural History': 'Procedural History', 'Procedural History / Source Function': 'Procedural History',
    'Procedural History / Source Status': 'Procedural History', 'Procedural History / Historical Development': 'Procedural History',
    'Parties / Governing Actors': 'Parties',
    'Issue': 'Issue', 'Question Presented': 'Issue', 'Rule and Holding': 'Holding', 'Holding': 'Holding',
    'Holding / Operative Construction': 'Holding', 'Holding / Operative Effect': 'Holding', 'Holding / Operative Rule': 'Holding',
    'Holding / Operative Explanation': 'Holding', 'Judgment': 'Judgment', 'Reasoning': 'Reasoning',
    'Separate Opinions': 'Separate Opinions', 'Notes': 'Notes', 'Sources': 'Sources', 'Source': 'Sources', 'Rule': 'Rule',
    'Application': 'Application', 'Text and Structure': 'Text', 'Definitions and Baseline Rule': 'Text',
}
# Where the briefs start inside each PDF: (first page, printed title, kind). Kind: case | provision | guide.
# Pages are 1-based PDF pages; a brief runs to the page before the next one (or the end of the file).
FILES = {
    'Civil_Procedure_Personal_Jurisdiction_Case_Briefs.pdf': {'short': 'Personal jurisdiction briefs', 'briefs': [
        (1, 'Ford Motor Co. v. Montana Eighth Judicial District Court', 'case'), (11, 'Goodyear Dunlop Tires Operations, S.A. v. Brown', 'case'),
        (14, 'Perkins v. Benguet Consolidated Mining Co.', 'case'), (17, 'Helicopteros Nacionales de Colombia, S.A. v. Hall', 'case'),
        (20, 'Daimler AG v. Bauman', 'case'), (23, 'BNSF Railway Co. v. Tyrrell', 'case'),
        (26, 'Insurance Corp. of Ireland, Ltd. v. Compagnie des Bauxites de Guinée', 'case'), (29, 'The Bremen v. Zapata Off-Shore Co.', 'case'),
        (32, 'Carnival Cruise Lines, Inc. v. Shute', 'case'), (35, 'Zippo Manufacturing Co. v. Zippo Dot Com, Inc.', 'case'),
        (38, 'Shaffer v. Heitner', 'case'), (42, 'Burnham v. Superior Court of California, County of Marin', 'case'),
        (46, 'Mallory v. Norfolk Southern Railway Co.', 'case')]},
    'CivPro_Asahi_Nicastro_Burger_King_Case_Briefs (1).pdf': {'short': 'Asahi, Nicastro and Burger King briefs', 'briefs': [
        (1, 'Asahi Metal Industry Co. v. Superior Court', 'case'), (3, 'J. McIntyre Machinery, Ltd. v. Nicastro', 'case'),
        (5, 'Burger King Corp. v. Rudzewicz', 'case'), (7, 'Doctrinal synthesis: specific jurisdiction', 'guide')]},
    'CivPro_Notice_Service_and_Hearing_Briefs.pdf': {'short': 'Notice, service and hearing briefs', 'briefs': [
        (1, 'Mullane v. Central Hanover Bank & Trust Co.', 'case'), (6, 'Reasonable Notice After Mullane', 'guide'),
        (9, 'Federal Rule 4: Service of Process', 'provision'), (14, 'National Equipment Rental, Ltd. v. Szukhent', 'case'),
        (17, 'Wyman v. Newhouse', 'case'), (20, 'Federal Rule 12: Defenses, Objections, and Timing', 'provision'),
        (22, 'Opportunity to Be Heard', 'guide'), (25, 'Sniadach v. Family Finance Corp. of Bay View', 'case'),
        (27, 'Fuentes v. Shevin', 'case'), (30, 'Connecticut v. Doehr', 'case')]},
    'Civil_Procedure_Gray_World_Wide_Volkswagen_Case_Briefs.pdf': {'short': 'Gray and World-Wide Volkswagen briefs', 'briefs': [
        (1, 'Gray v. American Radiator & Standard Sanitary Corp.', 'case'), (3, 'World-Wide Volkswagen Corp. v. Woodson', 'case')]},
    'Civil_Procedure_World_Wide_Volkswagen_Burger_King_Asahi_Big_Brief.pdf': {'short': 'World-Wide Volkswagen, Burger King and Asahi big brief', 'briefs': [
        (1, 'World-Wide Volkswagen Corp. v. Woodson', 'case'), (4, 'Burger King Corp. v. Rudzewicz', 'case'),
        (7, 'Asahi Metal Industry Co. v. Superior Court', 'case')]},
    'Contracts_Battle_of_the_Forms_and_Rolling_Contracts_Briefs.pdf': {'short': 'Battle of the forms and rolling contracts briefs', 'briefs': [
        (1, 'Bayway Refining Co. v. Oxygenated Marketing & Trading A.G.', 'case'), (5, 'Northrop Corp. v. Litronic Industries', 'case'),
        (9, 'Hill v. Gateway 2000, Inc.', 'case'), (12, 'Klocek v. Gateway, Inc.', 'case'),
        (16, 'Restatement of the Law, Consumer Contracts § 2(b) and (c)', 'provision'), (18, 'UCC § 2-207: Additional and Different Terms', 'provision')]},
    'Contracts_Consideration_Interpretation_Big_Brief.pdf': {'short': 'Consideration and interpretation big brief', 'briefs': [
        (1, 'Mattei v. Hopper', 'case'), (3, 'Structural Polymer Group, Ltd. v. Zoltek Corp.', 'case'),
        (6, 'Wood v. Lucy, Lady Duff-Gordon', 'case'), (8, 'Contract in Wood v. Lucy, Lady Duff-Gordon (SEL)', 'provision'),
        (10, 'UCC Section 2-306 - Output, Requirements, and Exclusive Dealings', 'provision')]},
    'Contracts_Definiteness_and_Preliminary_Agreements_Briefs.pdf': {'short': 'Definiteness and preliminary agreements briefs', 'briefs': [
        (1, 'Definiteness and Preliminary Agreements: Supplement Provisions', 'provision'),
        (3, 'Teachers Insurance & Annuity Association v. Tribune Co.', 'case'), (6, 'Dixon v. Wells Fargo Bank, N.A.', 'case'),
        (9, 'Cyberchron Corp. v. Calldata Systems Development, Inc.', 'case'),
        (12, 'Channel Home Centers, Division of Grace Retail Corp. v. Grossman', 'case'),
        (15, "Sun Printing & Publishing Ass'n v. Remington Paper & Power Co.", 'case'), (18, 'Oglebay Norton Co. v. Armco, Inc.', 'case')]},
    'Contracts_Formation_Reliance_and_UCC_Briefs.pdf': {'short': 'Formation, reliance and UCC briefs', 'briefs': [
        (1, 'Scope of Article 2 and Firm Offers', 'provision'), (3, 'Restatement (Second) of Contracts §§ 45 and 90', 'provision'),
        (5, 'Drennan v. Star Paving Co.', 'case'), (8, 'UCC §§ 2-204 through 2-207', 'provision'),
        (11, 'Dorton v. Collins & Aikman Corp.', 'case'), (14, 'C. Itoh & Co. (America) Inc. v. Jordan International Co.', 'case'),
        (17, 'New York General Obligations Law § 5-1109', 'provision')]},
    'Contracts_Offer_and_Acceptance_Briefs.pdf': {'short': 'Offer and acceptance briefs', 'briefs': [
        (1, 'Offer and acceptance: reading guide', 'guide'), (2, 'Lefkowitz v. Great Minneapolis Surplus Store, Inc.', 'case'),
        (4, 'Wucherpfennig v. Dooley', 'case'), (6, 'International Filter Co. v. Conroe Gin, Ice & Light Co.', 'case'),
        (8, 'White v. Corlies & Tifft', 'case'), (10, 'Silence not ordinarily acceptance', 'guide'),
        (12, 'The significance of contract formation for antidiscrimination law', 'guide'),
        (14, 'Termination of the power of acceptance', 'guide'), (17, 'The mailbox rule', 'guide')]},
    'Contracts_Promissory_Estoppel_Restitution_Big_Brief.pdf': {'short': 'Promissory estoppel and restitution big brief', 'briefs': [
        (1, 'Ricketts v. Scothorn', 'case'), (3, 'Feinberg v. Pfeiffer Co.', 'case'), (5, 'Cohen v. Cowles Media Co.', 'case'),
        (8, 'D & G Stout, Inc. v. Bacardi Imports, Inc.', 'case'), (10, 'From Equitable Estoppel to Promissory Estoppel', 'guide'),
        (12, 'Restitution as an Alternative Basis for Recovery', 'guide'), (14, 'Restatement (Second) of Contracts Section 90', 'provision')]},
    'LRS_Whitman_Gundy_Chadha_Detailed_Briefs.pdf': {'short': 'Whitman, Gundy and Chadha detailed briefs', 'briefs': [
        (1, 'Whitman v. American Trucking Associations, Inc.', 'case'), (8, 'Gundy v. United States', 'case'),
        (15, 'Immigration and Naturalization Service v. Chadha', 'case')]},
    'Legislation_Regulatory_State_Class3_Case_Briefs.pdf': {'short': 'LRS class 3 case briefs', 'briefs': [
        (1, 'Riggs v. Palmer', 'case'), (3, 'Bondi v. Vanderstok - weapon-parts-kit issue', 'case'), (5, 'Garland v. Cargill', 'case')]},
}
# Which atlas entries each brief belongs to (case briefs → the case; provisions and guides → the rule or concept).
MATCHES = {
    'Ford Motor Co. v. Montana Eighth Judicial District Court': ['ford'], 'Goodyear Dunlop Tires Operations, S.A. v. Brown': ['cp-goodyear'],
    'Perkins v. Benguet Consolidated Mining Co.': ['cp-perkins'], 'Helicopteros Nacionales de Colombia, S.A. v. Hall': ['cp-helicopteros'],
    'Daimler AG v. Bauman': ['cp-daimler'], 'BNSF Railway Co. v. Tyrrell': ['cp-bnsf'],
    'Insurance Corp. of Ireland, Ltd. v. Compagnie des Bauxites de Guinée': ['cp-insurance-ireland'], 'The Bremen v. Zapata Off-Shore Co.': ['cp-bremen'],
    'Carnival Cruise Lines, Inc. v. Shute': ['carnival'], 'Zippo Manufacturing Co. v. Zippo Dot Com, Inc.': ['cp-zippo'], 'Shaffer v. Heitner': ['cp-shaffer'],
    'Burnham v. Superior Court of California, County of Marin': ['cp-burnham'], 'Mallory v. Norfolk Southern Railway Co.': ['cp-mallory'],
    'Asahi Metal Industry Co. v. Superior Court': ['cp-asahi'], 'J. McIntyre Machinery, Ltd. v. Nicastro': ['cp-nicastro'], 'Burger King Corp. v. Rudzewicz': ['burger'],
    'Doctrinal synthesis: specific jurisdiction': ['specific-jurisdiction'],
    'Mullane v. Central Hanover Bank & Trust Co.': ['cp-mullane'], 'Reasonable Notice After Mullane': ['cp-notice'],
    'Federal Rule 4: Service of Process': ['cp-frcp-4', 'cp-service'], 'National Equipment Rental, Ltd. v. Szukhent': ['cp-szukhent'],
    'Wyman v. Newhouse': ['cp-wyman'], 'Federal Rule 12: Defenses, Objections, and Timing': ['cp-frcp-12'],
    'Opportunity to Be Heard': ['cp-hearing', 'cp-prejudgment'], 'Sniadach v. Family Finance Corp. of Bay View': ['cp-sniadach'],
    'Fuentes v. Shevin': ['cp-fuentes'], 'Connecticut v. Doehr': ['cp-doehr'],
    'Gray v. American Radiator & Standard Sanitary Corp.': ['cp-gray'], 'World-Wide Volkswagen Corp. v. Woodson': ['wwvw'],
    'Bayway Refining Co. v. Oxygenated Marketing & Trading A.G.': ['bayway'], 'Northrop Corp. v. Litronic Industries': ['northrop'],
    'Hill v. Gateway 2000, Inc.': ['hill-gateway'], 'Klocek v. Gateway, Inc.': ['klocek'],
    'Restatement of the Law, Consumer Contracts § 2(b) and (c)': ['gap-rlcc'], 'UCC § 2-207: Additional and Different Terms': ['ucc207'],
    'Mattei v. Hopper': ['mattei'], 'Structural Polymer Group, Ltd. v. Zoltek Corp.': ['structural-polymer'], 'Wood v. Lucy, Lady Duff-Gordon': ['wood-lucy'],
    'Contract in Wood v. Lucy, Lady Duff-Gordon (SEL)': ['gap-wood-contract'], 'UCC Section 2-306 - Output, Requirements, and Exclusive Dealings': ['ucc306'],
    'Definiteness and Preliminary Agreements: Supplement Provisions': ['definiteness', 'preliminary-agreements'],
    'Teachers Insurance & Annuity Association v. Tribune Co.': ['note-tribune-types'], 'Dixon v. Wells Fargo Bank, N.A.': ['dixon'],
    'Cyberchron Corp. v. Calldata Systems Development, Inc.': ['cyberchron'], 'Channel Home Centers, Division of Grace Retail Corp. v. Grossman': ['channel-home'],
    "Sun Printing & Publishing Ass'n v. Remington Paper & Power Co.": ['sun-printing'], 'Oglebay Norton Co. v. Armco, Inc.': ['oglebay'],
    'Scope of Article 2 and Firm Offers': ['ucc205', 'merchant'], 'Restatement (Second) of Contracts §§ 45 and 90': ['rest45', 'rest90'],
    'Drennan v. Star Paving Co.': ['drennan'], 'UCC §§ 2-204 through 2-207': ['ucc204', 'ucc206', 'ucc207'],
    'Dorton v. Collins & Aikman Corp.': ['dorton'], 'C. Itoh & Co. (America) Inc. v. Jordan International Co.': ['citoh'],
    'New York General Obligations Law § 5-1109': ['ny51109'],
    'Offer and acceptance: reading guide': ['offer-acceptance'], 'Lefkowitz v. Great Minneapolis Surplus Store, Inc.': ['lefkowitz'],
    'Wucherpfennig v. Dooley': ['wucherpfennig'], 'International Filter Co. v. Conroe Gin, Ice & Light Co.': ['international-filter'],
    'White v. Corlies & Tifft': ['white-corlies'], 'Silence not ordinarily acceptance': ['silence'],
    'The significance of contract formation for antidiscrimination law': [], 'Termination of the power of acceptance': ['termination-offer'],
    'The mailbox rule': ['mailbox'],
    'Ricketts v. Scothorn': ['ricketts'], 'Feinberg v. Pfeiffer Co.': ['feinberg'], 'Cohen v. Cowles Media Co.': ['cohen-cowles'],
    'D & G Stout, Inc. v. Bacardi Imports, Inc.': ['dg-stout'], 'From Equitable Estoppel to Promissory Estoppel': ['equitable-estoppel'],
    'Restitution as an Alternative Basis for Recovery': ['unjust-enrichment', 'restitution-interest'], 'Restatement (Second) of Contracts Section 90': ['rest90'],
    'Whitman v. American Trucking Associations, Inc.': ['lrs-s-whitman'], 'Gundy v. United States': ['lrs-s-gundy'],
    'Immigration and Naturalization Service v. Chadha': ['lrs-s-chadha'],
    'Riggs v. Palmer': ['lrs-k-riggs'], 'Bondi v. Vanderstok - weapon-parts-kit issue': ['lrs-k-vanderstok'], 'Garland v. Cargill': ['lrs-k-cargill'],
}


def slugify(s):
    s = re.sub(r'[’\'"]', '', s)
    s = re.sub(r'[^A-Za-z0-9]+', '-', s).strip('-').lower()
    return s[:80]


def clean_pages(pages, title):
    """Strip running headers ("Short name (continued)"), running footers ("Short name" + "N / M") and page-count lines."""
    out = []
    for t in pages:
        lines = t.split('\n')
        keep = []
        for i, ln in enumerate(lines):
            s = ln.strip()
            if re.fullmatch(r'\d+ / \d+', s):
                # the line before a page counter is the running footer (short name); drop it
                if keep and not keep[-1].endswith('.') and len(keep[-1]) < 80 and (i + 1 == len(lines) or not lines[i + 1].strip()):
                    keep.pop()
                continue
            if s.endswith('(continued)') and len(s) < 90:
                continue
            if s.startswith('CONTRACTS: OFFER AND ACCEPTANCE') and len(s) < 40:
                continue
            keep.append(ln)
        out.append('\n'.join(keep))
    return '\n'.join(out)


CITATION_LIKE = re.compile(r'\(\d{4}\)|\d+ U\.S\. |N\.W\.2d|S\.W\.|F\.\dd|§|Casebook|casebook|Restatement|U\.S\.C\.')


def split_sections(text, kind='case'):
    """Split a brief's text at its section headings. Returns (citation, {section: text}).

    Format A briefs carry a "Citation" heading. In the other formats the citation is the first line after the title;
    it is taken as the citation (for a case always, for a provision or guide only when it looks like one) and removed
    from the preamble so it is not stored twice."""
    lines = text.split('\n')
    cur = 'Preamble'
    sections = {cur: []}
    for ln in lines:
        s = ln.strip()
        if s in SECTION_HEADS:
            cur = SECTION_HEADS[s]
            sections.setdefault(cur, [])
            continue
        sections[cur].append(ln)
    out = {}
    for k, v in sections.items():
        body = re.sub(r'[ \t]+', ' ', '\n'.join(v)).strip()
        body = re.sub(r'(?<![.:;\n])\n(?=[a-z(\'"“‘])', ' ', body)  # rejoin wrapped lines
        body = re.sub(r'\n{2,}', '\n', body)
        if body:
            out[k] = body
    citation = out.pop('Citation', None)
    if citation is None:
        pre_lines = out.get('Preamble', '').split('\n') if out.get('Preamble') else []
        first = pre_lines[0].strip() if pre_lines else ''
        if first and (kind == 'case' or CITATION_LIKE.search(first)):
            # the citation paragraph may wrap over several lines; it ends at the first line that ends in a period
            n = 1
            while n < min(len(pre_lines), 5) and not pre_lines[n - 1].rstrip().endswith('.'):
                n += 1
            citation = ' '.join(l.strip() for l in pre_lines[:n])
            rest = '\n'.join(pre_lines[n:]).strip()
            if rest:
                out['Preamble'] = rest
            else:
                out.pop('Preamble', None)
        else:
            citation = ''
    return citation, out


def extract():
    sys.modules['cryptography'] = None  # pypdf's optional import is broken in this sandbox
    from pypdf import PdfReader
    os.makedirs(BRIEFS, exist_ok=True); os.makedirs(TEXT, exist_ok=True)
    manifest = {'generated': '2026-09-27', 'files': [], 'briefs': []}
    for fname, spec in FILES.items():
        path = os.path.join(SRC, fname)
        r = PdfReader(path)
        pages = [(p.extract_text() or '') for p in r.pages]
        open(os.path.join(TEXT, fname[:-4] + '.txt'), 'w', encoding='utf-8').write(
            '\n\n'.join(f'--- page {i + 1} of {len(pages)} ---\n{t}' for i, t in enumerate(pages)))
        manifest['files'].append({'file': fname, 'short': spec['short'], 'pages': len(pages)})
        starts = spec['briefs']
        for i, (p0, title, kind) in enumerate(starts):
            p1 = starts[i + 1][0] - 1 if i + 1 < len(starts) else len(pages)
            body = clean_pages(pages[p0 - 1:p1], title)
            # drop the packet banner lines and the brief's own title line
            body_lines = [ln for ln in body.split('\n') if not re.fullmatch(r'\s*(CIVIL PROCEDURE|CONTRACTS|LEGISLATION).*', ln)
                          and not re.fullmatch(r'\s*(PART I+ - .*|Parties / Procedural History / .*)', ln)]
            # drop the brief's own title line and any packet banner or subtitle printed above it
            title_re = re.compile(r'\s*(\d+\.\s+)?' + re.escape(title) + r'\s*')
            for li, ln in enumerate(body_lines[:8]):
                if title_re.fullmatch(ln):
                    body_lines = body_lines[li + 1:]
                    break
            body = '\n'.join(body_lines)
            citation, sections = split_sections(body, kind)
            slug = slugify(title) + ('-' + slugify(spec['short'])[:20] if title in ('World-Wide Volkswagen Corp. v. Woodson', 'Burger King Corp. v. Rudzewicz', 'Asahi Metal Industry Co. v. Superior Court') else '')
            open(os.path.join(BRIEFS, slug + '.txt'), 'w', encoding='utf-8').write(
                f'{title}\n{citation}\nSource: added-sources/{fname}, pages {p0}–{p1}\n\n' +
                '\n\n'.join(f'== {k} ==\n{v}' for k, v in sections.items()))
            manifest['briefs'].append({
                'slug': slug, 'file': fname, 'pages': [p0, p1], 'title': title, 'kind': kind,
                'citation': re.sub(r'\s+', ' ', citation or '').strip()[:400], 'matches': MATCHES.get(title, []),
                'sections': sections, 'words': sum(len(v.split()) for v in sections.values())})
    json.dump(manifest, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    cases = [b for b in manifest['briefs'] if b['kind'] == 'case']
    print(f"{len(manifest['files'])} files, {len(manifest['briefs'])} briefs ({len(cases)} case briefs, "
          f"{len({b['title'] for b in cases})} distinct cases), {sum(b['words'] for b in manifest['briefs'])} words")
    unmatched = [b['title'] for b in manifest['briefs'] if not b['matches']]
    if unmatched:
        print('no atlas entry:', unmatched)


# ------------------------------------------------------------------------------------------------ apply
def apply():
    if not os.path.exists(MANIFEST):
        print('no briefs.json; run with --extract first'); return
    manifest = json.load(open(MANIFEST, encoding='utf-8'))
    rewrites = {}
    for f in sorted(glob.glob(os.path.join(BRIEFS, 'rewrites-*.json'))):
        rewrites.update(json.load(open(f, encoding='utf-8')))
    html = open(HTML, encoding='utf-8').read()
    m = re.search(r'<script id="seedData"[^>]*>', html); s0, e0 = m.end(), html.find('</script>', m.end())
    data = json.loads(html[s0:e0]); byId = {n['id']: n for n in data['nodes']}
    files = {f['file']: f for f in manifest['files']}
    log = {}
    linked = 0
    # 1. source chips, on every matched entry (cases, rules, concepts, notes)
    for b in manifest['briefs']:
        if b['kind'] == 'case' and not b['matches']:
            continue
        p0, p1 = b['pages']
        label = f"Brief · {files[b['file']]['short']}, " + (f'pp. {p0}–{p1}' if p1 > p0 else f'p. {p0}')
        url = f"added-sources/{b['file']}#page={p0}"
        for nid in b['matches']:
            n = byId.get(nid)
            if not n:
                print('missing node', nid); continue
            n.setdefault('sources', [])
            if not any(s.get('url') == url for s in n['sources']):
                n['sources'].append({'label': label, 'url': url}); linked += 1
                log.setdefault(nid, {'title': n['title'], 'changes': []})['changes'].append(f'source chip: {label}')
            tags = n.setdefault('tags', [])
            if 'r14-brief' not in tags:
                tags.append('r14-brief')
    # 2. the rewritten text on the cases
    before, after = {k: [] for k in SECTION_ORDER}, {k: [] for k in SECTION_ORDER}
    rewritten = 0
    for nid, rw in rewrites.items():
        n = byId.get(nid)
        if not n:
            print('rewrite for missing node', nid); continue
        entry = log.setdefault(nid, {'title': n['title'], 'changes': []})
        secs = n.setdefault('sections', {})
        for k in SECTION_ORDER:
            new = rw.get('sections', {}).get(k)
            if new is None:
                continue
            old = secs.get(k, '')
            before[k].append(len(old.split())); after[k].append(len(new.split()))
            if old != new:
                secs[k] = new
                entry['changes'].append(f'{k}: {len(old.split())}→{len(new.split())} words')
        if rw.get('summary') and rw['summary'] != n.get('summary'):
            n['summary'] = rw['summary']
            entry['changes'].append('summary sharpened')
        if rw.get('separateOpinions') is not None:
            learning = n['learning'] if isinstance(n.get('learning'), dict) else n.setdefault('learning', {})
            if learning.get('separateOpinions') != rw['separateOpinions']:
                learning['separateOpinions'] = rw['separateOpinions']
                entry['changes'].append('separate opinions updated')
        if rw.get('shortTitle') and rw['shortTitle'] != n.get('shortTitle'):
            n['shortTitle'] = rw['shortTitle']; entry['changes'].append('short title corrected')
        if rw.get('note'):
            entry['changes'].append('note: ' + rw['note'])
        n['updatedAt'] = '2026-09-27T00:00:00Z'
        rewritten += 1

    def med(xs):
        xs = sorted(xs); return xs[len(xs) // 2] if xs else 0
    stats = {k: {'before_median': med(before[k]), 'after_median': med(after[k]), 'n': len(before[k])} for k in SECTION_ORDER}
    json.dump({'generated': '2026-09-27', 'entries': log, 'wordCountMedians': stats}, open(CHANGELOG, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    hist = data.setdefault('history', [])
    action = f'Revision 14d: {len(manifest["briefs"])} briefs from the owner\'s thirteen PDFs linked as sources ({linked} chips); {rewritten} case entries rewritten from them'
    if not any(h.get('action', '').startswith('Revision 14d:') for h in hist):
        hist.append({'at': '2026-09-27', 'action': action, 'revision': 14})
    out = json.dumps(data, ensure_ascii=False, separators=(',', ':')); assert '</' not in out
    open(HTML, 'w', encoding='utf-8').write(html[:s0] + out + html[e0:])
    print(f'briefs: {linked} source chips added, {rewritten} case entries rewritten; medians ' +
          ', '.join(f"{k} {v['before_median']}→{v['after_median']}" for k, v in stats.items()))


if __name__ == '__main__':
    if '--extract' in sys.argv:
        extract()
    else:
        apply()
