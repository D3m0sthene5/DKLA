#!/usr/bin/env python3
"""Validate the r18 build without changing any release files.

Run after assemble.py: python3 tools/r18/check.py
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARTS = Path(__file__).resolve().parent
sys.path.insert(0, str(PARTS))
from assemble import PATCHES, EXPECTED_R17, patch_icons  # noqa: E402

errors: list[str] = []


def require(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)


def blocks(html: str) -> list[tuple[str, str, str]]:
    out = []
    for match in re.finditer(r'<script\b([^>]*)>(.*?)</script>', html, re.S):
        ident = re.search(r'\bid="([^"]+)"', match.group(1))
        kind = 'json' if 'application/json' in match.group(1) else 'js'
        if ident:
            out.append((ident.group(1), kind, match.group(2)))
    return out


r17_bytes = (ROOT / 'DKLA-r17.html').read_bytes()
require(hashlib.sha256(r17_bytes).hexdigest() == EXPECTED_R17, 'DKLA-r17.html is not the published r17 file')
r17 = {i: c for i, _, c in blocks(r17_bytes.decode('utf-8'))}
r18_html = (ROOT / 'DKLA-r18.html').read_text(encoding='utf-8')
r18_list = blocks(r18_html)
r18 = {i: c for i, _, c in r18_list}

changed = sorted(k for k, v in r17.items() if r18.get(k) != v)
require(changed == ['dklaIcons', 'studyCode'], f'only dklaIcons and studyCode may differ from r17, found {changed}')
require(r18.get('dklaIcons') == patch_icons(r17['dklaIcons']), 'dklaIcons is not r17 plus tools/r18/icons.json')
expected = r17['studyCode']
for description, before, after in PATCHES:
    require(expected.count(before) == 1, f'patch no longer matches once: {description}')
    expected = expected.replace(before, after)
require(r18.get('studyCode') == expected, 'studyCode is not r17 plus the listed patches')
for ident in ('dklaR18Pre', 'dklaR18Map', 'dklaR18Study', 'dklaR18Changelog'):
    require(ident in r18, f'missing block {ident}')
order = [i for i, _, _ in r18_list]
require(order.index('dklaR18Pre') < order.index('studyCode'), 'dklaR18Pre must load before studyCode')
require(order.index('dklaR18Map') > order.index('dklaR17Logo'), 'dklaR18Map must load after the r17 blocks')
require('<style id="dklaR18Styles">' in r18_html, 'missing dklaR18Styles')

for ident, kind, content in r18_list:
    if kind == 'json':
        try:
            json.loads(content)
        except json.JSONDecodeError as exc:
            errors.append(f'invalid JSON in {ident}: {exc}')

node = shutil.which('node')
if node:
    with tempfile.TemporaryDirectory() as tmp:
        for ident, kind, content in r18_list:
            if kind != 'js' or ident == 'scotusSprite':
                continue
            path = Path(tmp) / f'{ident}.js'
            path.write_text(content, encoding='utf-8')
            result = subprocess.run([node, '--check', str(path)], capture_output=True, text=True)
            require(result.returncode == 0, f'{ident} does not parse: {result.stderr.strip()[:300]}')
        for name in ('sw.js', 'api/sync.js'):
            result = subprocess.run([node, '--check', str(ROOT / name)], capture_output=True, text=True)
            require(result.returncode == 0, f'{name} does not parse: {result.stderr.strip()[:300]}')
else:
    print('note: node not found, JavaScript syntax not checked')

version = json.loads((ROOT / 'version.json').read_text(encoding='utf-8'))
build = version.get('build', '')
require(re.fullmatch(r'r18-[0-9a-f]{10}', build) is not None, 'version.json build id is malformed')

# every case has its own glyph, none shared, none borrowed from the r10 library
graph = json.loads(r17['seedData'])
icon_data = json.loads(r18['dklaIcons'])
case_ids = [n['id'] for n in graph['nodes'] if n['kind'] == 'Case']
motifs = [icon_data['records'].get(i, {}).get('motif') for i in case_ids]
require(all(m == 'r18-' + i for m, i in zip(motifs, case_ids)), 'a case is missing its own r18 glyph')
glyphs = [icon_data['paths'].get(m, '') for m in motifs]
require(len(set(glyphs)) == len(glyphs), 'two cases share identical glyph markup')
require(all(icon_data['records'][i].get('modifier') is None for i in case_ids), 'a case glyph still carries a modifier badge')
require(all(0 < len(icon_data['records'][i].get('label', '')) <= 48 for i in case_ids), 'a case caption is missing or too long')
require(f"build: '{build}'" in r18['dklaR18Pre'], 'the atlas and version.json disagree on the build id')
require(f"const BUILD = '{build}';" in (ROOT / 'sw.js').read_text(encoding='utf-8'), 'sw.js and version.json disagree on the build id')
require('__DKLA_BUILD__' not in r18_html, 'unstamped build placeholder in the atlas')

manifest = json.loads((ROOT / 'manifest.webmanifest').read_text(encoding='utf-8'))
for icon in manifest['icons']:
    require((ROOT / icon['src']).is_file(), f"manifest icon missing: {icon['src']}")
for name in ('icons/icon-180.png', 'index.html', 'vercel.json', 'package.json'):
    require((ROOT / name).is_file(), f'missing {name}')
require('DKLA-r18.html' in (ROOT / 'index.html').read_text(encoding='utf-8'), 'index.html does not open r18')
vercel = json.loads((ROOT / 'vercel.json').read_text(encoding='utf-8'))
require(any(r.get('destination') == '/DKLA-r18.html' for r in vercel.get('rewrites', [])), 'vercel.json does not serve r18 at the root')
integrity = json.loads((PARTS / 'integrity.json').read_text(encoding='utf-8'))
require(integrity.get('r18_sha256') == hashlib.sha256((ROOT / 'DKLA-r18.html').read_bytes()).hexdigest(), 'integrity.json does not describe this DKLA-r18.html')

if errors:
    print('\n'.join('FAIL: ' + e for e in errors))
    sys.exit(1)
print(f'r18 ok: build {build}, {len(r17) - 2} blocks preserved, studyCode carries {len(PATCHES)} patches, {len(case_ids)} case glyphs')
