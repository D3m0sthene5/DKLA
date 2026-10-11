#!/usr/bin/env python3
"""Collect pinned official OLRC USLM statutes for the offline authority library.

Refresh: python tools/v25/uscode_build.py --refresh (network; pinned release only)
Check:   python tools/v25/uscode_build.py --check (offline structural/provenance checks)
The atlas build consumes uscode.json through authorities_build.py; it never
downloads statutes at runtime. Raw ZIP/XML bytes stay in workspace scratch.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import io
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import quote

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
CACHE = ROOT.parent / 'uscode-cache'
OUTPUT = HERE / 'uscode.json'
DATE = '2026-10-11'
RELEASE = '119-118'
RELEASE_DATE = 'September 30, 2026'
EDITION = f'Current through Public Law {RELEASE} ({RELEASE_DATE})'
DOWNLOAD = 'https://uscode.house.gov/download/download.html'
BASE = 'https://uscode.house.gov/download/releasepoints/us/pl/119/118/'
NS = {'u': 'http://xml.house.gov/schemas/uslm/1.0'}
STRUCTURE = {'title', 'subtitle', 'part', 'subpart', 'chapter', 'subchapter', 'division'}
BODY = {'subsection', 'paragraph', 'subparagraph', 'clause', 'subclause', 'item', 'subitem'}
SKIP = {'notes', 'note', 'sourceCredit', 'toc', 'meta'}
CITATION = re.compile(r'\b(\d+)\s+U\.?\s*S\.?\s*C\.?\s*§+\s*([\d]+[a-zA-Z]*(?:[–-]\d+[a-zA-Z]*)?)')


def local(element):
    return element.tag.rsplit('}', 1)[-1]


def norm(text):
    return re.sub(r'\s+', ' ', text).strip()


def text(element):
    if element is None:
        return ''
    def inner(node, initial=False):
        if not initial and (node.get('type')=='footnote' or node.get('class')=='footnoteRef'):
            return ''
        return (node.text or '') + ''.join(inner(child) + (child.tail or '') for child in node)
    return norm(inner(element,True))


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def get(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'DKLA source collector; academic statutory study'})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def title_xml(number, refresh=False):
    CACHE.mkdir(parents=True, exist_ok=True)
    filename = f'usc{number:02d}.xml'
    path = CACHE / filename
    url = BASE + f'xml_usc{number:02d}@{RELEASE}.zip'
    if refresh or not path.exists():
        raw = get(url)
        archive = zipfile.ZipFile(io.BytesIO(raw))
        name = next(n for n in archive.namelist() if Path(n).name == filename)
        path.write_bytes(archive.read(name))
        (CACHE / f'usc{number:02d}.zip').write_bytes(raw)
    raw = path.read_bytes()
    root = ET.fromstring(raw)
    publication = root.find('u:meta/u:docPublicationName', NS)
    assert text(publication) == f'Online@{RELEASE}', f'Title {number}: unreviewed source release'
    return root, dict(url=url, sha256=sha(raw), format='Official OLRC USLM XML', xmlFile=filename,
                     edition=EDITION, read=DATE)


def source_citations():
    """Explicit main-map/main-brief citations select the other-title scope.

    The extra Title 5 groups are the APA/FOIA, judicial review, Congressional
    Review Act and FVRA. Title 9 is collected in full. A match is provenance for
    navigation, not a declaration that a historical case applied current text.
    """
    sys.path.insert(0, str(ROOT / 'tools'))
    from atlas import Atlas
    atlas = Atlas()
    references = defaultdict(set)
    origins = defaultdict(set)
    values = [(n['id'], json.dumps(n, ensure_ascii=False)) for n in atlas.nodes.values()]
    values += [(entry[6], atlas.full[entry[0]]) for entry in atlas.entries.values() if entry[6]]
    for origin, value in values:
        for number, token in CITATION.findall(value):
            title = int(number)
            if not 1 <= title <= 54:
                continue
            for section in expand(token):
                references[title].add(section)
                origins[(title, section)].add(origin)
    references[5].update(str(n) for n in [301, *range(551, 560), *range(701, 707), *range(801, 809), *range(3345, 3350)])
    references[5].update(['552a', '552b', '3349a', '3349b', '3349c', '3349d'])
    references[42].update(['1981', '1982', '1983', '1985', '1986', '1988', '2000e', '2000e-2', '2000e-3', '2000e-5'])
    # Canonical current SORNA location and the machinegun definition in Cargill.
    references[34].update(['20901', '20913'])
    references[26].add('5845')
    references[28] = set()
    references[9] = set()
    return references, origins


def expand(token):
    token = token.replace('–', '-')
    match = re.fullmatch(r'(\d+)-(\d+)([a-z]?)', token)
    if match and 0 <= int(match[2]) - int(match[1]) <= 100:
        values = [str(n) for n in range(int(match[1]), int(match[2]) + 1)]
        if match[3]:
            values += [match[2] + chr(c) for c in range(ord('a'), ord(match[3]) + 1)]
        return values
    return [token]


def codified_sections(root):
    """Walk codified hierarchy only; notes contain quoted Acts and old sections."""
    results = []
    def walk(element, chapter='', part=''):
        kind = local(element)
        if kind in SKIP:
            return
        if kind == 'chapter':
            chapter = norm(text(element.find('u:num', NS)).rstrip('—') + ' — ' + text(element.find('u:heading', NS)))
        elif kind == 'part':
            part = norm(text(element.find('u:num', NS)).rstrip('—') + ' — ' + text(element.find('u:heading', NS)))
        elif kind == 'section':
            assert element.get('identifier'), 'A quoted or anonymous section reached the codified hierarchy'
            results.append((element, chapter, part))
            return
        for child in element:
            if local(child) in STRUCTURE or local(child) in {'main', 'section'}:
                walk(child, chapter, part)
    walk(root)
    # Congress has sometimes enacted two different provisions with the same
    # section number (including the two actual Title28 §1932 provisions).
    # These are not duplicates to delete: retain their distinct headings/text.
    return results


def body_lines(section):
    output = []
    def add(depth, value, heading=False):
        if norm(value): output.append([min(depth, 8), norm(value)] + (['heading'] if heading else []))
    def walk(element, depth=0, prefix=''):
        kind = local(element)
        if kind=='note' and element.get('type')!='footnote':
            # USLM marks repealed subsection slots with a misc note inside the
            # codified body. This marker is distinct from section history notes.
            add(depth,norm(prefix+' '+text(element))); return
        if kind in SKIP:
            return
        if kind in BODY:
            number = text(element.find('u:num', NS))
            heading = text(element.find('u:heading', NS))
            prefix = norm(number + ' ' + heading)
            substantive = [c for c in element if local(c) not in {'num','heading'}|SKIP or (local(c)=='note' and c.get('type')!='footnote')]
            if not substantive:
                add(depth, prefix, bool(heading)); return
            first = True
            for child in substantive:
                child_kind = local(child)
                if first and child_kind in BODY:
                    add(depth, prefix, bool(heading)); prefix = ''
                walk(child, depth + (1 if child_kind in BODY else 0), prefix if first else '')
                first = False
            return
        if kind in {'content', 'chapeau', 'continuation', 'p', 'flush', 'proviso', 'heading'}:
            blocks = [c for c in element if local(c) in {'p', 'table', 'layout', 'list'} | BODY]
            if blocks:
                # Inline refs and their tails can precede a paragraph/table.
                # Preserve the entire mixed-content run, not just element.text.
                pending=prefix+' '+(element.text or '')
                for child in element:
                    if child in blocks:
                        if norm(pending): add(depth,pending)
                        pending=''
                        walk(child,depth)
                    elif local(child) not in SKIP and child.get('class')!='footnoteRef':
                        pending+=text(child)
                    pending+=child.tail or ''
                if norm(pending): add(depth,pending)
            else:
                add(depth, norm(prefix + ' ' + text(element)), kind == 'heading')
            return
        if kind in {'table', 'layout'}:
            # Retain row/cell boundaries rather than collapsing statutory tables.
            rows = [e for e in element.iter() if local(e) == 'tr']
            if rows:
                for row in rows:
                    cells = [text(cell) for cell in row if local(cell) in {'td', 'th'}]
                    if cells: add(depth, ' | '.join(cells))
            else: add(depth, text(element))
            return
        if kind == 'list':
            for child in element: walk(child, depth + 1)
            return
        add(depth, norm(prefix + ' ' + text(element)))
    for child in section:
        if local(child) not in {'num', 'heading'} | SKIP:
            walk(child)
    # Every body word must remain in source order. Extra row separators are
    # display punctuation; no numerical threshold or qualifier may disappear.
    expected=' '.join(text(child) for child in section if local(child) not in {'num','heading'}|SKIP)
    actual=' '.join(line[1] for line in output)
    assert re.sub(r'[^A-Za-z0-9]','',expected)==re.sub(r'[^A-Za-z0-9]','',actual), \
        f"{section.get('identifier')}: statutory body extraction lost/reordered words"
    return output


def effective_notes(section):
    notes = []
    for note in section.findall('u:notes/u:note', NS):
        topic = note.get('topic', '')
        if 'effective' in topic.lower() or topic in {'codification', 'referencesInText'}:
            dates = [date.get('date') for date in note.findall('.//u:date', NS) if date.get('date')]
            future_dates=[date for date in dates if date>DATE]
            if 'effective' in topic.lower() and future_dates:
                # The official §922 notes schedule repeal/restore events in
                # 2031/2032. Present subsection(p) remains in the current body;
                # future changes stay in a separately labelled annotation.
                reviewed={'/us/usc/t18/s922':{'2031-03-08','2032-09-30'},
                          '/us/usc/t42/s405':{'2026-12-27'}}
                assert set(future_dates)<=reviewed.get(section.get('identifier'),set()), \
                    f"{section.get('identifier')}: future-effective amendment requires individual review"
            title = text(note.find('u:heading', NS)) or topic
            paragraphs = [text(p) for p in note.findall('u:p', NS) if text(p)]
            if paragraphs:
                if future_dates: title+=' · Future scheduled dates are not effective on '+DATE
                notes.append(dict(title=title,lines=[[0,p] for p in paragraphs]))
    for note in section.iter():
        if local(note)=='note' and note.get('type')=='footnote':
            value=text(note)
            if value: notes.append(dict(title='OLRC editorial footnote',lines=[[0,value]]))
    return notes


def section_entries(number, root, source, wanted, origins):
    out, found, occurrences = [], set(), Counter()
    sections=codified_sections(root)
    duplicates=Counter(section.find('u:num',NS).get('value') for section,_,_ in sections)
    for section, chapter, part in sections:
        num = section.find('u:num', NS).get('value').replace('–','-')
        if number not in {28, 9} and num not in wanted:
            continue
        found.add(num)
        heading = text(section.find('u:heading', NS)).rstrip(']')
        status = section.get('status') or 'text'
        lines = body_lines(section)
        if status != 'text' and not lines:
            lines = [[0, norm(text(section.find('u:num', NS)) + ' ' + heading).strip('[]')]]
        assert lines, f'{number} USC {num}: empty statutory text'
        safe = re.sub(r'[^A-Za-z0-9.-]+', '-', num).strip('-')
        occurrences[num]+=1
        if occurrences[num]>1: safe+='-'+str(occurrences[num])
        first = re.search(r'\d+[A-Za-z]*(?:-\d+)?', num)[0]
        url = 'https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title' + str(number) + '-section' + quote(first) + '&num=0&edition=prelim'
        entry = dict(id=f'usc-{number}-{safe}', collection='uscode', cite=f'{number} U.S.C. § {num}',
                     title=heading or f'Section {num}', lines=lines,
                     source=dict(name='Office of the Law Revision Counsel · official USLM',url=url,official=source['url'],edition=EDITION,read=DATE),
                     status=status, links=sorted(origins.get((number, num), [])), chapter=chapter,
                     part=part, titleNumber=number, section=num,
                     note='Pinned codified text; later enactments may not be included. Historical cases may concern an earlier version. Editorial and statutory notes remain at the official source.',
                     textSha256=sha(json.dumps(lines,ensure_ascii=False).encode('utf-8')),
                     annotations=effective_notes(section),
                     relatedCitations=sorted(set(ref.get('href') for child in section if local(child) not in SKIP for ref in child.iter() if local(ref)=='ref' and (ref.get('href') or '').startswith('/us/usc/'))))
        if duplicates[num]>1:
            entry['note']+=' Congress enacted more than one provision with this section number; both distinct headings and texts are retained.'
        out.append(entry)
    return out, wanted - found


def build():
    index = get(DOWNLOAD)
    assert f'Public Law {RELEASE}' in index.decode('utf-8') and '09/30/2026' in index.decode('utf-8'), 'Release changed; audit and deliberately repin before refresh'
    CACHE.mkdir(parents=True,exist_ok=True); (CACHE/'download.html').write_bytes(index)
    references, origins = source_citations()
    titles = [28, 5, 9] + sorted(set(references) - {28, 5, 9})
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(title_xml, titles))
    entries, sources, absent = [], [dict(url=DOWNLOAD,sha256=sha(index),read=DATE)], []
    for number, (root, source) in zip(titles, results):
        produced, missing = section_entries(number,root,source,references[number],origins)
        entries.extend(produced); sources.append(source)
        absent.extend(dict(title=number,section=section,reason='No standalone current codified section at this citation; check historical transfer/repeal notes at the official title.',links=sorted(origins.get((number,section),[]))) for section in sorted(missing))
    ids = {e['id'] for e in entries}
    for entry in entries:
        entry['related'] = list(dict.fromkeys('usc-'+ref.split('/')[3][1:]+'-'+ref.split('/')[4][1:] for ref in entry.pop('relatedCitations') if len(ref.split('/'))>=5 and 'usc-'+ref.split('/')[3][1:]+'-'+ref.split('/')[4][1:] in ids))
    output = dict(schema=1,checked=DATE,edition=EDITION,releasePoint=RELEASE,
                  collections=[dict(id='uscode',title='United States Code',course=1,
                    description='Full Title 28, full Title 9 arbitration, APA/FOIA/FVRA and other expressly cited course statutes. Pinned official OLRC release through September 30, 2026; source notes distinguish historical versions and effective dates.')],
                  entries=entries,sources=sources,unresolvedHistoricalCitations=absent,
                  coverage=dict(title28Sections=sum(e['titleNumber']==28 for e in entries),title28Chapters=len({e['chapter'] for e in entries if e['titleNumber']==28}),title9Sections=sum(e['titleNumber']==9 for e in entries),otherTitleSections=sum(e['titleNumber'] not in {9,28} for e in entries),
                                byTitle=dict(Counter(str(e['titleNumber']) for e in entries)),statuses=dict(Counter(e['status'] for e in entries))),
                  method='Direct structural extraction of official OLRC codified hierarchy. Quoted statutes and superseded sections in editorial notes are excluded from codified section counts. Statutory tables and subsection markers are retained. This is an edition-specific source collection, not a current-law citator or new opinion audit.')
    validate(output)
    OUTPUT.write_text(json.dumps(output,ensure_ascii=False,indent=1)+'\n',encoding='utf-8',newline='\n')
    return output


def validate(value):
    assert value['releasePoint']==RELEASE and value['edition']==EDITION
    ids=[entry['id'] for entry in value['entries']]
    assert len(ids)==len(set(ids)), 'Duplicate statutory identity'
    by_id={entry['id']:entry for entry in value['entries']}
    for number in ['1251','1253','1254','1257','1291','1292','1331','1332','1335','1367','1391','1404','1406','1407','1441','1446','1447','1453','1651','1652','1738','2071','2072','2073','2074','2403']:
        assert 'usc-28-'+number in by_id, f'Missing Civ Pro provision {number}'
    for number in ['551','552','552a','552b','553','554','555','556','557','558','559','701','702','703','704','705','706','3345','3346','3347','3348','3349','3349a','3349b','3349c','3349d']:
        assert 'usc-5-'+number in by_id, f'Missing administrative-state provision {number}'
    for entry in value['entries']:
        assert entry['lines'] and all(len(line)>=2 and isinstance(line[0],int) and isinstance(line[1],str) for line in entry['lines'])
        assert entry['source']['edition']==EDITION
        assert entry['textSha256']==sha(json.dumps(entry['lines'],ensure_ascii=False).encode('utf-8'))
        assert set(entry.get('related',[]))<=by_id.keys()
    # Separating short codified §1331 from its long historical notes prevents a
    # superseded jurisdictional amount from appearing as current statutory text.
    federal_question=' '.join(line[1] for line in by_id['usc-28-1331']['lines'])
    assert '$10,000' not in federal_question and 'original jurisdiction' in federal_question
    assert '$75,000' in ' '.join(line[1] for line in by_id['usc-28-1332']['lines'])
    assert 'shall not abridge, enlarge or modify any substantive right' in ' '.join(line[1] for line in by_id['usc-28-2072']['lines'])
    social_security=' '.join(line[1] for line in by_id['usc-42-405']['lines'])
    assert 'During the 3-year period that begins on the effective date of this paragraph' in social_security
    assert 'may not record a death to a record' not in social_security, 'December27,2026 amendment imported before effectivity'
    assert value['coverage']['title28Sections']>700


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--refresh',action='store_true')
    mode.add_argument('--check',action='store_true')
    args=parser.parse_args()
    value=build() if args.refresh else json.loads(OUTPUT.read_text(encoding='utf-8'))
    validate(value)
    print(json.dumps(dict(edition=value['edition'],coverage=value['coverage'],unresolvedHistoricalCitations=value['unresolvedHistoricalCitations'],bytes=OUTPUT.stat().st_size),ensure_ascii=True))
