#!/usr/bin/env python3
"""Build the whole-Code browse index: one structure-only file per U.S. Code title.

    python tools/uscode/build_index.py --hierarchy us-federal-law.sqlite --release-119-118 us-congress-code/
    python tools/uscode/build_index.py --check

Writes uscode/title-N.json (headings and structure, no statutory text) for titles 1 to 54 and
src/features/v31/uscode-titles.js (title names, section counts and the SHA-256 of each file, so the
page can verify what it fetches). tools/uscode/README.md says where the inputs come from.

Two derived copies of the official OLRC USLM XML are read, because the official download host is not
reachable from the machine that built this (see the README):
  * the hierarchy (subtitles, chapters, subchapters, parts, subparts), document order and headings come
    from the Baja Labs us-federal-law database v1.0.0, built from OLRC release point 119-138;
  * the list of sections comes from junxit/us-congress-code at tag pl-119-118, built from OLRC release
    point 119-118, the release DKLA's full-text statutes (tools/v25/uscode.json) are pinned to. A section
    that is not in that release is left out, so every citation agrees with the pinned statutes.
Nothing is written by hand. Where the two copies disagree about a heading, the difference must be an
editorial footnote marker; any other disagreement stops the build. The result is checked against every
official heading in tools/v25/uscode.json.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'uscode'
MANIFEST = ROOT / 'src/features/v31/uscode-titles.js'
OFFICIAL = ROOT / 'tools/v25/uscode.json'
RELEASE = '119-118'
EDITION = 'Current through Public Law 119-118 (September 30, 2026)'
HIERARCHY_SHA256 = '318ea8e0150e9bc08e510bf6a195fa6e18b1d68f32b68b12fbc2461d2e00046a'  # the .sqlite.zst asset
JUNXIT_COMMIT = '039b5566188fbec8d8460b4b7d70bc8b103a6e26'
SOURCE = {
    'release': RELEASE,
    'edition': EDITION,
    'official': 'Office of the Law Revision Counsel, United States Code, USLM XML release point 119-118 '
    '(https://uscode.house.gov/download/releasepoints/us/pl/119/118/xml_uscAll@119-118.zip)',
    'sections': 'junxit/us-congress-code, tag pl-119-118, commit ' + JUNXIT_COMMIT
    + ' (generated from the official 119-118 XML; https://github.com/junxit/us-congress-code)',
    'hierarchy': 'Baja Labs us-federal-law v1.0.0 database, built from the official OLRC USLM XML release '
    'point 119-138 (https://github.com/bajalabs/us-federal-law/releases/tag/v1.0.0, us-federal-law.sqlite.zst '
    'sha256 ' + HIERARCHY_SHA256 + '); only sections present in release 119-118 are kept',
    'note': 'Headings and structure only, no statutory text. Repealed, transferred, omitted, renumbered and '
    'reserved sections are listed with the status line the official table gives them.',
}
STATUS = re.compile(r'^\[?\s*(Repealed|Transferred|Omitted|Renumbered|Reserved)\b', re.I)
LABEL = re.compile(r'^\[?\s*§§?\s*(.+?)\.(?=\s|\d|$)\s*(.*)$', re.S)
# Editorial footnote text, as OLRC writes it, that may be glued into a heading by a converter.
FOOTNOTE_TEXT = re.compile(
    r'\b1\s?1 ?(?:So in original|Another section|See |Section catchline|There is no|No section)', re.I
)


def split(label):
    m = LABEL.match(label.strip())
    if not m:
        return None, label.strip()
    return m.group(1).replace('–', '-').strip(), m.group(2).strip()


def key(num):
    return re.sub(r'\s+', ' ', num.replace(' to ', '...').replace('–', '-')).strip()


def clean_tail(h):
    return re.sub(r'\s+', ' ', h).strip().rstrip(']').strip()


def junxit_sections(folder):
    """{(title, key): [heading, ...]} for release 119-118, appendices excluded."""
    out = defaultdict(list)
    for t in sorted(os.listdir(folder)):
        m = re.fullmatch(r'title-(\d\d)', t)
        if not m:
            continue
        tn = str(int(m.group(1)))
        for base, _, files in os.walk(os.path.join(folder, t)):
            for f in sorted(files):
                with open(os.path.join(base, f), encoding='utf-8') as fh:
                    head = fh.read(4000)
                fm = dict(
                    line.split(': ', 1)
                    for line in re.match(r'---\n(.*?)\n---\n', head, re.S).group(1).split('\n')
                    if ': ' in line
                )
                h = re.search(r'^# (.*)$', head, re.M).group(1)
                num, heading = split(h)
                out[(tn, key(num or fm['section']))].append(clean_tail(heading))
    return out


def unmark(b, candidates):
    """Remove an editorial footnote marker from heading b, given the other copy's readings of the same
    section. Returns (heading, footnote or ''). Raises when the difference is anything else."""
    norm = lambda s: re.sub(r'\W+', ' ', s).strip().lower()
    for j in candidates:
        if norm(j) == norm(b):
            return b, ''
    # A footnote attached to the section number: "11 <footnote>. <heading>".
    if re.match(r'^1\s?1 ', b):
        for j in candidates:
            jj = re.sub(r'\s*\b1\s?1 .*$', '', j).strip() if FOOTNOTE_TEXT.search(j) else j
            bb = b.rstrip('.')
            if jj and bb.endswith(jj.rstrip('.')):
                return jj, bb[: len(bb) - len(jj.rstrip('.'))].strip()[2:].strip()
    # A footnote marker inside or at the end of the heading: b has "1" where j has "11 <footnote>".
    for j in candidates:
        i = 0
        while i < min(len(b), len(j)) and b[i] == j[i]:
            i += 1
        if i == 0 or b[i - 1] != '1' or j[i - 1 : i + 1] != '11':
            continue
        prefix, suffix = b[: i - 1], b[i:]
        if not j.endswith(suffix):
            continue
        note = j[i + 1 : len(j) - len(suffix)].strip()
        heading = re.sub(r'\s+', ' ', prefix + suffix).strip()
        # A second marker with no footnote text of its own ("... project 1").
        heading = re.sub(r'(?<=[A-Za-z]) 1$', '', heading)
        return heading, note
    raise ValueError(f'unexplained heading difference: {b!r} vs {candidates!r}')


def build(sqlite_path, junxit_dir):
    J = junxit_sections(junxit_dir)
    c = sqlite3.connect(f'file:{sqlite_path}?mode=ro', uri=True)
    titles, report = [], Counter()
    used = set()
    fixes = []
    for n in range(1, 55):
        law = c.execute("select id, nombre from laws where slug = ?", (f'usc-{n}',)).fetchone()
        if not law:
            titles.append(dict(title=n, name='Reserved', reserved=True, tree=[], sections=0))
            continue
        law_id, nombre = law
        version = c.execute(
            'select id, ultima_reforma, resolved_url, source_sha256 from law_versions where law_id = ?', (law_id,)
        ).fetchall()
        assert len(version) == 1, f'title {n}: one edition expected'
        vid, _, _, source_sha = version[0]
        name = re.sub(r'^Title \d+\s*[—–-]\s*', '', nombre).strip()
        divs = {
            r[0]: dict(id=r[0], parent=r[1], kind=r[2], label=r[3], heading=r[4], rubric=r[5], seq=r[6], kids=[], secs=[])
            for r in c.execute(
                'select id, parent_id, kind, ordinal_label, heading, rubric, seq from divisions where law_version_id = ? order by seq',
                (vid,),
            )
        }
        top = dict(kids=[], secs=[])
        for d in divs.values():
            (divs[d['parent']] if d['parent'] else top)['kids'].append(d)
        total = 0
        for div_id, label, seq in c.execute(
            'select division_id, label, seq from articles where law_version_id = ? order by seq', (vid,)
        ):
            num, heading = split(label)
            heading = clean_tail(heading)
            k = (str(n), key(num))
            if k not in J:
                report['dropped: not in release 119-118'] += 1
                fixes.append(('dropped', n, num, heading))
                (divs[div_id] if div_id else top).setdefault('dropped', 0)
                (divs[div_id] if div_id else top)['dropped'] += 1
                continue
            used.add(k)
            note = ''
            if heading not in J[k]:
                heading, note = unmark(heading, J[k])
                fixes.append(('footnote', n, num, heading, note))
            if FOOTNOTE_TEXT.search(heading):
                raise ValueError(f'{n} U.S.C. § {num}: footnote text left in heading {heading!r}')
            m = STATUS.match(heading)
            row = [num, heading]
            if m or note:
                row.append(m.group(1).lower() if m else '')
            if note:
                row.append(note)
            (divs[div_id] if div_id else top)['secs'].append((seq, row))
            total += 1

        def node(d):
            """(division dict, first section seq or None, kept sections, dropped sections)."""
            items = [(s, 0, r) for s, r in d['secs']]
            kept, dropped = len(d['secs']), d.get('dropped', 0)
            firsts = [s for s, _ in d['secs']]
            last = -1.0
            for k in d['kids']:
                kn, first, kk, kd = node(k)
                kept += kk
                dropped += kd
                # A division left empty only because its sections came after release 119-118 is
                # dropped; one empty in the official structure itself (a reserved chapter) stays.
                if kk == 0 and kd > 0:
                    continue
                if first is None:
                    first = last + 0.5  # an empty division keeps its place after its previous sibling
                else:
                    firsts.append(first)
                last = first
                items.append((first, 1, kn))
            items.sort(key=lambda x: (x[0], x[1]))
            out = dict(k=d.get('kind'), n=d.get('label') or '', h=(d.get('rubric') or d.get('heading') or '').strip(), c=[x[2] for x in items])
            return out, (min(firsts) if firsts else None), kept, dropped

        tree = node(dict(kind=None, label='', rubric='', secs=top['secs'], kids=top['kids'], dropped=top.get('dropped', 0)))[0]['c']
        titles.append(dict(title=n, name=name, tree=tree, sections=total, officialFile=f'xml_usc{n:02d}@119-138.zip', officialSha256=source_sha))
    missing = sorted(k for k in J if k not in used)
    assert not missing, f'sections of release 119-118 missing from the hierarchy: {missing[:20]}'
    return titles, fixes, report


def write(titles):
    OUT.mkdir(exist_ok=True)
    entries = []
    for t in titles:
        body = dict(schema=1, title=t['title'], name=t['name'], sections=t['sections'], source=SOURCE, tree=t['tree'])
        if t.get('reserved'):
            body['reserved'] = True
        raw = (json.dumps(body, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')
        (OUT / f'title-{t["title"]}.json').write_bytes(raw)
        entries.append([t['title'], t['name'], t['sections'], hashlib.sha256(raw).hexdigest(), len(raw)])
    js = (
        '/* Generated by tools/uscode/build_index.py: do not edit. The 54 titles of the United States Code\n'
        '   (release ' + RELEASE + '), with each title\'s section count and the SHA-256 of its browse file\n'
        '   uscode/title-N.json, which src/features/v31/uscode.js fetches when the title is opened. */\n'
        'window.DKLAUSCodeTitles = ' + json.dumps(dict(release=RELEASE, edition=EDITION, titles=entries), ensure_ascii=False) + ';\n'
    )
    MANIFEST.write_text(js, encoding='utf-8', newline='\n')
    return entries


def check():
    """Offline: the files match the manifest, and every official heading in uscode.json agrees."""
    text = MANIFEST.read_text(encoding='utf-8')
    manifest = json.loads(text[text.index('= ') + 2 : text.rindex(';')])
    assert manifest['release'] == RELEASE and len(manifest['titles']) == 54
    index = {}
    for n, name, count, sha, size in manifest['titles']:
        raw = (OUT / f'title-{n}.json').read_bytes()
        assert hashlib.sha256(raw).hexdigest() == sha and len(raw) == size, f'title {n}: file differs from manifest'
        data = json.loads(raw)
        assert data['title'] == n and data['source']['release'] == RELEASE
        seen = 0

        def walk(nodes, path):
            nonlocal seen
            for x in nodes:
                if isinstance(x, list):
                    seen += 1
                    assert x[1] and not FOOTNOTE_TEXT.search(x[1]), (n, x)
                    index.setdefault((n, x[0]), []).append((x, path))
                else:
                    walk(x['c'], path + [x])

        walk(data['tree'], [])
        assert seen == count, f'title {n}: {seen} sections, manifest says {count}'
    official = json.loads(OFFICIAL.read_text(encoding='utf-8'))
    bad = []
    for e in official['entries']:
        rows = index.get((e['titleNumber'], e['section'].replace('–', '-')))
        if not rows:
            bad.append(('missing', e['cite']))
            continue
        status = 'text' if len(rows[0][0]) < 3 or not rows[0][0][2] else rows[0][0][2]
        if not any(r[0][1] == e['title'] for r in rows):
            bad.append(('heading', e['cite'], e['title'], [r[0][1] for r in rows]))
        if status != e['status']:
            bad.append(('status', e['cite'], e['status'], status))
    return manifest, bad


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--hierarchy', help='us-federal-law.sqlite (decompressed release asset)')
    p.add_argument('--release-119-118', dest='junxit', help='checkout of junxit/us-congress-code at pl-119-118')
    p.add_argument('--check', action='store_true')
    a = p.parse_args()
    if not a.check:
        if not (a.hierarchy and a.junxit):
            p.error('--hierarchy and --release-119-118 are required to build')
        titles, fixes, report = build(a.hierarchy, a.junxit)
        write(titles)
        print(json.dumps(dict(report), indent=1))
        for f in fixes:
            print('  ', *f)
    manifest, bad = check()
    total = sum(t[2] for t in manifest['titles'])
    size = sum(t[4] for t in manifest['titles'])
    print(f'{len(manifest["titles"])} titles, {total} sections, {size} bytes; official disagreements: {len(bad)}')
    for b in bad:
        print('  ', b)
    sys.exit(1 if bad else 0)
