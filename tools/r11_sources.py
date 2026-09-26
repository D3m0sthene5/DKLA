#!/usr/bin/env python3
"""Revision 11 content: every source the atlas refers to opens from inside the atlas.

1. Merges the full-opinion briefs written from the opinion texts in added-sources/opinions/ (scratchpad
   full-*.json) into the entries that were written from short excerpts; the opinion text becomes a source.
2. Links every rule and statute entry to the exact page of the Civil Procedure supplement or the Contracts
   Selections (added-sources/index/*.json) and embeds a compact index of both books as `sourceIndex`.
3. Rewrites the notes, districts and coverage labels that still said a source was missing or an account
   was limited by the excerpt, now that the files are on hand.
4. Converts the Slaughter supplement (Word) to HTML so it opens in the in-app viewer.
Idempotent per brief (tag `r11-full`); the wording changes are plain replacements.
"""
import glob, html as htmlmod, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'DKLA-r8.html')
SCRATCH = '/tmp/claude-0/-home-user-DKLA/6d49cb8d-a244-599f-bf37-d555e02eb31f/scratchpad/src'
TODAY = '2026-09-26T00:00:00Z'
CIV_PDF = 'added-sources/Civ Pro Supplement FULL OCR 26-27.pdf'
SEL_PDF = 'added-sources/Contracts- Selections.pdf'

html = open(HTML, encoding='utf-8').read()
m = re.search(r'<script id="seedData"[^>]*>', html); s0, e0 = m.end(), html.find('</script>', m.end())
data = json.loads(html[s0:e0])
nodes = {n['id']: n for n in data['nodes']}
existing = {(e['source'], e['target']) for e in data['edges']}
edges_added = 0
log = []


def link(nid, topics, sources):
    global edges_added
    n = nodes[nid]
    for cid, why in (topics or {}).items():
        if cid not in nodes or cid == nid:
            continue
        n.setdefault('learning', {}).setdefault('topics', {})[cid] = why
        if (nid, cid) in existing:
            continue
        data['edges'].append({'id': f'r11-{nid}--{cid}', 'source': nid, 'target': cid, 'label': 'Bears on', 'kind': 'Doctrine', 'explanation': why,
                              'status': 'Proposed', 'supports': [], 'sources': sources[:1], 'createdAt': TODAY, 'updatedAt': TODAY})
        existing.add((nid, cid)); edges_added += 1


# ---- 1. full-opinion briefs
merged = 0; unobtained = []
for path in sorted(glob.glob(os.path.join(SCRATCH, 'full-*.json'))):
    pack = json.load(open(path, encoding='utf-8'))
    unobtained += pack.get('unobtained', [])
    for b in pack['briefs']:
        n = nodes.get(b['id'])
        if not n or 'r11-full' in n.get('tags', []):
            continue
        txt = f"added-sources/opinions/{b['id']}.txt"
        if not os.path.exists(os.path.join(ROOT, txt)):
            log.append(f"no opinion file for {b['id']}"); continue
        cite = (b.get('citation') or '').strip()
        sources = [{'label': f"{b['title']}, full opinion text{(' · ' + cite) if cite else ''}", 'url': txt}]
        notes = ''
        if b.get('keyQuote'):
            notes = 'Key line: ' + b['keyQuote'].strip()
        if cite:
            notes = (notes + '\n\n' if notes else '') + 'Citation: ' + cite + '.'
        n.update({'title': b['title'], 'shortTitle': b.get('shortTitle') or n.get('shortTitle') or b['title'], 'summary': b['summary'], 'sections': b['sections'],
                  'notes': notes, 'status': 'Source-grounded study account', 'updatedAt': TODAY})
        if cite:
            n['citation'] = cite
        n['sources'] = sources + [s for s in n.get('sources', []) if s.get('url') and s['url'] != txt]
        n.setdefault('learning', {}).update({'separateOpinions': b.get('separateOpinions', ''), 'why': b.get('why', n.get('learning', {}).get('why', '')), 'coverage': 'full-account'})
        if n.get('lrsImport'):
            n['lrsImport'].update({'coverageLevel': 'full-account', 'limitations': ''})
        n['tags'] = sorted(set(n.get('tags', []) + ['r11-full']))
        link(b['id'], b.get('topics', {}), sources)
        merged += 1
# entries whose opinion could not be fetched: keep the account, drop the meta suffix from the title
for u in unobtained:
    n = nodes.get(u['id'])
    if not n:
        continue
    for k in ('title', 'shortTitle'):
        n[k] = re.sub(r'\s+—\s+assigned (?:note|excerpt|chapter)?\s*account$', '', n.get(k, ''))
    n.setdefault('learning', {})['coverage'] = 'assigned-reading'
    if n.get('lrsImport'):
        n['lrsImport']['coverageLevel'] = 'assigned-reading'
SUFFIX = re.compile(r'\s+—\s+(?:assigned (?:note|excerpt|chapter)?\s*account|(?:[\w-]+\s+)?note account|publication-time account|(?:incomplete|noncontiguous) assigned excerpt|partial assigned problem|excerpted framework)$')
for n in data['nodes']:
    for k in ('title', 'shortTitle'):
        if isinstance(n.get(k), str):
            n[k] = SUFFIX.sub('', n[k])

# ---- 2. page-precise links into the two big books, and a compact embedded index
civ = json.load(open(os.path.join(ROOT, 'added-sources/index/civ-supplement.json'), encoding='utf-8'))
sel = json.load(open(os.path.join(ROOT, 'added-sources/index/contracts-selections.json'), encoding='utf-8'))
civ_idx = {e['key']: e for e in civ['index']}
sel_idx = {e['key']: e for e in sel['index']}


def book_key(n):
    i = n['id']; t = n.get('title', '')
    mm = re.match(r'cp-frcp-(\d+)$', i)
    if mm: return ('civ', f'Rule {mm.group(1)}')
    mm = re.match(r'cp-usc-(\d+)$', i)
    if mm: return ('civ', f'§ {mm.group(1)}')
    if i == 'cp-article-iii': return ('civ', 'Article III')
    if i == 'lrs-s-article-i-vesting': return ('civ', 'Article I')
    mm = re.match(r'ucc(\d{3})$', i)
    if mm: return ('sel', f'UCC § 2-{mm.group(1)}')
    mm = re.match(r'rest(\d+)$', i)
    if mm: return ('sel', f'Restatement § {mm.group(1)}')
    mm = re.match(r'cISG(\d+)$', i, re.I)
    if mm: return ('sel', f'CISG Art. {mm.group(1)}')
    mm = re.search(r'UCC § (\d-\d{3})', t)
    if mm: return ('sel', f'UCC § {mm.group(1)}')
    mm = re.search(r'Restatement(?: \(Second\))? § (\d+)', t)
    if mm: return ('sel', f'Restatement § {mm.group(1)}')
    mm = re.search(r'CISG Article (\d+)', t)
    if mm: return ('sel', f'CISG Art. {mm.group(1)}')
    return None


linked = 0
for n in data['nodes']:
    bk = book_key(n)
    if not bk:
        continue
    book, key = bk
    idx = civ_idx if book == 'civ' else sel_idx
    e = idx.get(key)
    if not e:
        log.append(f'no index entry for {n["id"]} ({key})'); continue
    pdf = CIV_PDF if book == 'civ' else SEL_PDF
    total = civ['pages'] if book == 'civ' else sel['pages']
    bookname = 'Civil Procedure supplement 2026–27' if book == 'civ' else 'Contracts Selections (Farnsworth et al., 2021)'
    url = f'{pdf}#page={e["page"]}'
    src = {'label': f'{e["label"][:90].rstrip(".")} · {bookname}, PDF page {e["page"]} of {total}', 'url': url}
    n['sources'] = [src] + [s for s in n.get('sources', []) if s.get('url') and not s['url'].startswith(pdf)]
    if (n.get('learning') or {}).get('coverage') == 'Casebook discussion only; complete assigned supplement provision not supplied.':
        n['learning']['coverage'] = 'Casebook discussion; full provision text in the Selections'
    n['updatedAt'] = TODAY
    linked += 1

# a compact index: every heading with its page, plus the first 220 characters of each page for search snippets
def compact(book):
    return {'file': book['file'], 'pages': book['pages'], 'index': [{'key': e['key'], 'label': e['label'][:120], 'page': e['page']} for e in book['index']],
            'snippets': {str(i + 1): re.sub(r'\s+', ' ', (t or ''))[:220] for i, t in enumerate(book['pageText'])}}
source_index = {'civ': compact(civ), 'sel': compact(sel),
                'opinions': [{'id': n['id'], 'title': n['title'], 'citation': n.get('citation', ''), 'file': f"added-sources/opinions/{n['id']}.txt"}
                             for n in data['nodes'] if 'r11-full' in n.get('tags', [])],
                'files': sorted({s['url'].split('#')[0] for n in data['nodes'] for s in n.get('sources', []) if (s.get('url') or '').startswith('added-sources/')})}

# ---- 3. wording: sources are on hand now
COVERAGE = {
    'Assigned case; account of the supplied excerpt. Omitted facts and later developments have not been supplied from outside sources.': 'Assigned case (casebook excerpt)',
    'Assigned note case; account of the supplied excerpt. Omitted facts and later developments have not been supplied from outside sources.': 'Assigned note case (casebook excerpt)',
    'Additional assigned-chapter case; account of the supplied excerpt. Omitted facts and later developments have not been supplied from outside sources.': 'Additional chapter case (casebook excerpt)',
    'Assigned chapter note; account of the supplied excerpt. Omitted facts and later developments have not been supplied from outside sources.': 'Assigned chapter note (casebook excerpt)',
    'Casebook discussion only; complete assigned supplement provision not supplied.': 'Casebook discussion; full provision text in the Selections',
    'Assigned edited supplemental excerpt; narrower implied-term analysis and final appellate disposition omitted': 'Assigned supplemental excerpt',
    'Assigned edited supplemental excerpt; full application, separate opinions, and formal remedial disposition omitted': 'Assigned supplemental excerpt',
    'Assigned translated reasoning; complete caption, docket, and formal disposition not supplied': 'Assigned translated excerpt',
    'Assigned supplemental source now supplied': 'Assigned supplemental source on file',
}
for n in data['nodes']:
    L = n.get('learning') or {}
    if L.get('coverage') in COVERAGE:
        L['coverage'] = COVERAGE[L['coverage']]
    ci = n.get('civilImport') or {}
    if ci.get('coverageLevel') in COVERAGE:
        ci['coverageLevel'] = COVERAGE[ci['coverageLevel']]

# the Constitution is in the Civil Procedure supplement (pp. 136–137)
g = nodes.get('lrs-gap-01-02')
if g:
    e = civ_idx['Article I']
    g.update({'title': 'U.S. Constitution, Articles I–III', 'shortTitle': 'Constitution, Arts. I–III', 'status': 'Source received',
              'summary': 'Source on file: the Civil Procedure supplement reprints the Constitution (Articles I, III, IV and VI and the amendments) at PDF pages 136–137; Article II is quoted where the appointments and removal entries need it.',
              'sources': [{'label': 'U.S. Constitution · Civil Procedure supplement 2026–27, PDF page 136 of 354', 'url': f'{CIV_PDF}#page={e["page"]}'}], 'updatedAt': TODAY})
GAP_TEXT = {
    'gap-wood-contract': ('Full agreement in Wood v. Lucy', 'The complete Wood–Lucy agreement was assigned separately and is not among the supplied files; the casebook excerpt quotes the provisions the court relied on. Add the file to added-sources to link it here.'),
    'gap-classroom': ('Classroom notes and Brightspace problems', 'Classroom-only problems and notes were not among the supplied files. Add them to added-sources to link them here.'),
    'gap-peevyhouse-contract': ('Complete agreement in Peevyhouse', 'The casebook reproduces and describes the relevant provisions. The separately assigned complete agreement is not among the supplied files.'),
    'gap-eu-directive': ('EU Directive and associated Notifications', 'The casebook quotes and discusses parts of the Directive. The full Directive and Notifications are not among the supplied files.'),
    'gap-remedies-video': ('Assigned video lecture on remedies', 'The casebook economics reading is included. The video lecture is not a file and is not linked.'),
    'lrs-gap-01-03': ('First Day Questions handout', 'The handout is not among the supplied files. Add it to added-sources to link it here.'),
    'lrs-gap-02-01': ('Introduction to Regulation and the Administrative State', 'Printed pages 1–23 of this reading are not among the supplied files. Add them to added-sources to link them here.'),
    'lrs-gap-07-01': ('Agency dependence on statutes: pages 68–69', 'Printed pages 68–69 of the nondelegation reading are not among the supplied files; the surrounding pages are in the packet.'),
}
for gid, (title, summary) in GAP_TEXT.items():
    n = nodes.get(gid)
    if n:
        n.update({'title': title, 'shortTitle': title, 'summary': summary, 'status': 'Not among the supplied files', 'updatedAt': TODAY})
for n in data['nodes']:
    if n.get('status') == 'Source received':
        n['summary'] = re.sub(r'^Source on file: ', 'On file: ', n.get('summary', ''))
D = data['studyMap']['districts']
DISTRICTS = {
    'source-gaps': ('Sources not among the supplied files', 'Assigned items that were not in the files supplied to the atlas. Each names what is missing so it can be added later.'),
    'semester-sources': ('Supplemental documents', 'The complete Selections for Contracts (713 pages) and the course supplement are on file; every provision entry opens its page.'),
    'cp-source-gaps': ('Separately supplied sources', 'Berk v. Choy and Cross v. United States came as separate files; both are full entries with the opinion on file, and the 354-page supplement opens page by page.'),
    'lrs-topic-reading-plans-and-source-gaps-missing-assigned-readings': ('Assigned readings on file', 'Readings the syllabus assigns outside the packets. Each opens from a file beside the atlas; three handout pages remain unsupplied.'),
}
for did, (title, q) in DISTRICTS.items():
    if did in D:
        D[did]['title'] = title; D[did]['question'] = q
for r in data.get('geography', {}).get('regions', []) or []:
    ds = r.get('districts') or []
    for d in (ds if isinstance(ds, list) else ds.values()):
        if d.get('id') in DISTRICTS:
            d['title'], d['question'] = DISTRICTS[d['id']]

# ---- 4. the Slaughter supplement as HTML
docx_path = os.path.join(ROOT, 'added-sources', 'Class 11 - Slaughter Supplement.docx')
html_path = os.path.join(ROOT, 'added-sources', 'Class 11 - Slaughter Supplement.html')
if os.path.exists(docx_path) and not os.path.exists(html_path):
    import docx
    doc = docx.Document(docx_path)
    out = ['<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trump v. Slaughter supplement (Shane &amp; Bruff)</title>',
           '<style>body{max-width:760px;margin:0 auto;padding:32px 20px 80px;font:17px/1.55 Georgia,serif;color:#1c2128;background:#fbfaf7}h1,h2,h3{font-family:Georgia,serif;line-height:1.25}p{margin:0 0 1em}blockquote{margin:0 0 1em 1.5em;color:#3a3f46}.small{font-size:14px;color:#5b6570}</style></head><body>',
           '<p class="small">Converted from the Word file "Class 11 - Slaughter Supplement.docx" for the DKLA viewer. Formatting is simplified; the original is beside this file.</p>']
    for p in doc.paragraphs:
        text = ''.join(('<strong>' + htmlmod.escape(r.text) + '</strong>') if r.bold else ('<em>' + htmlmod.escape(r.text) + '</em>') if r.italic else htmlmod.escape(r.text) for r in p.runs).strip()
        if not text:
            continue
        style = (p.style.name or '').lower()
        tag = 'h1' if style.startswith('heading 1') or style == 'title' else 'h2' if style.startswith('heading 2') else 'h3' if style.startswith('heading') else 'blockquote' if 'quote' in style else 'p'
        out.append(f'<{tag}>{text}</{tag}>')
    out.append('</body></html>')
    open(html_path, 'w', encoding='utf-8').write('\n'.join(out))
    log.append(f'wrote {html_path} ({len(doc.paragraphs)} paragraphs)')
sl = nodes.get('lrs-s-slaughter')
if sl and os.path.exists(html_path):
    sl['sources'] = [{'label': 'Shane & Bruff, Trump v. Slaughter supplement (readable copy)', 'url': 'added-sources/Class 11 - Slaughter Supplement.html'}] + [s for s in sl.get('sources', []) if not s.get('url', '').endswith('.html')]
g11 = nodes.get('lrs-gap-11-01')
if g11 and os.path.exists(html_path):
    g11['sources'] = [{'label': 'Trump v. Slaughter supplement (readable copy)', 'url': 'added-sources/Class 11 - Slaughter Supplement.html'}] + [s for s in g11.get('sources', []) if not s.get('url', '').endswith('.html')]

for n in data['nodes']:
    if n.get('status') == 'Source-limited account':
        n['status'] = 'Brief from the assigned excerpt' if n.get('kind') == 'Case' else 'Source-grounded study account'

for r in data['studyMap']['regions']:
    if r['id'] == 'lrs-region-reading-plans-and-source-gaps':
        r['title'] = 'Reading plans and sources on file'
for r in data.get('geography', {}).get('regions', []) or []:
    if r.get('id') == 'lrs-region-reading-plans-and-source-gaps':
        r['title'] = 'Reading plans and sources on file'

# ---- bookkeeping
data['revision'] = 11
data.setdefault('dklaRelease', {})['contentBuild'] = 'r11-2026-09-26'
data['updatedAt'] = TODAY
if data['history'] and data['history'][-1].get('revision') == 11 and 'Revision 11:' in data['history'][-1].get('action', '') and 'entries rewritten' in data['history'][-1]['action']:
    data['history'].pop()
data['history'].append({'at': TODAY, 'action': f'Revision 11: {merged} entries rewritten from full opinions; {linked} provisions linked to their supplement pages; {edges_added} connections; source wording updated', 'revision': 11})
out = json.dumps(data, ensure_ascii=False, separators=(',', ':')); assert '</' not in out
html = html[:s0] + out + html[e0:]
si = json.dumps(source_index, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
block = f'<script id="sourceIndex" type="application/json">{si}</script>\n'
if 'id="sourceIndex"' in html:
    html = re.sub(r'<script id="sourceIndex" type="application/json">.*?</script>\n', lambda _: block, html, count=1, flags=re.S)
else:
    anchor = '<script id="dklaIcons"'
    assert html.count(anchor) == 1
    html = html.replace(anchor, block + anchor)
open(HTML, 'w', encoding='utf-8').write(html)
print(f'merged {merged} full briefs, {len(unobtained)} unobtained, {linked} provisions linked, {edges_added} edges, sourceIndex {len(si)//1024} KB')
for l in log:
    print(' ', l)
