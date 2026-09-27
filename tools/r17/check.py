#!/usr/bin/env python3
"""Validate the offline r17 build without changing any release files.

Run after assemble.py: python3 tools/r17/check.py [DKLA-r17.html]
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[2]
PARTS = Path(__file__).resolve().parent
OUTPUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / 'DKLA-r17.html'
BASE = ROOT / 'DKLA-r16.html'
errors: list[str] = []


def require(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)


def blocks(html: str, tag: str) -> list[tuple[str, str]]:
    result = []
    for match in re.finditer(r'<' + tag + r'\b([^>]*)>(.*?)</' + tag + r'>', html, re.S | re.I):
        ident = re.search(r'\bid="([^"]+)"', match.group(1))
        if ident:
            result.append((ident.group(1), match.group(2)))
    return result


def json_script(items: dict[str, str], ident: str):
    try:
        return json.loads(items[ident])
    except KeyError:
        errors.append(f'missing <script id="{ident}">')
    except json.JSONDecodeError as exc:
        errors.append(f'invalid JSON in {ident}: {exc}')
    return None


def validate_file(path: str, context: str) -> None:
    # Routes may carry #page= and URLs; only physical repository files are checked.
    if path.startswith(('https://', 'http://')):
        return
    base = unquote(path.split('#', 1)[0])
    if not base.lower().endswith('.pdf'):
        errors.append(f'{context}: PDF route is not a .pdf file: {path}')
        return
    if not base.startswith(('added-sources/', 'DKLA-sources/')):
        errors.append(f'{context}: route must point to a source beside the atlas: {path}')
        return
    resolved = (ROOT / base).resolve()
    if not resolved.is_relative_to(ROOT.resolve()):
        errors.append(f'{context}: source path escapes the repository: {path}')
        return
    if not resolved.is_file():
        errors.append(f'{context}: missing PDF: {path}')
        return
    with resolved.open('rb') as file:
        header = file.read(5)
    if header != b'%PDF-':
        errors.append(f'{context}: invalid or empty PDF: {path}')


def route_paths(value, context='pdf-routes.json'):
    """Collect physical PDF targets regardless of route nesting/key conventions."""
    if isinstance(value, str):
        if value.startswith(('added-sources/', 'DKLA-sources/', 'http://', 'https://')):
            if re.search(r'\.pdf(?:[#?]|$)', value, re.I):
                yield context, value
        elif re.search(r'\.pdf(?:#|$)', value, re.I):
            yield context, value
    elif isinstance(value, dict):
        for key, item in value.items():
            yield from route_paths(item, context + '.' + str(key))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from route_paths(item, context + f'[{index}]')


def main() -> int:
    if not BASE.is_file() or not OUTPUT.is_file():
        print('FAIL: Run python3 tools/r17/assemble.py before tools/r17/check.py; '
              'both DKLA-r16.html and DKLA-r17.html are required.')
        return 1
    baseline_bytes, output_bytes = BASE.read_bytes(), OUTPUT.read_bytes()
    baseline_sha = hashlib.sha256(baseline_bytes).hexdigest()
    require(baseline_sha == 'a64278b45ff5d6c2210aec934ce58c54d6da6cc973a5c28462eb6288dc3b1a90',
            f'r16 baseline changed ({baseline_sha}); inspect before shipping')
    base, built = baseline_bytes.decode('utf-8'), output_bytes.decode('utf-8')
    marker = '\n<!-- DKLA r17: original PDF routes, SCOTUS case navigation, interlocking monogram. -->\n'
    require(built.count(marker) == 1, 'r17 build marker absent or duplicated')
    if built.count(marker) == 1:
        start = built.index(marker)
        end = built.lower().rfind('</body>')
        require(end > start, 'r17 additions must precede the closing body tag')
        if end > start:
            require((built[:start] + built[end:]).encode('utf-8') == baseline_bytes,
                    'r17 build modified or removed bytes of the r16 baseline')
    original = dict(blocks(base, 'script'))
    scripts_list = blocks(built, 'script')
    scripts = dict(scripts_list)
    style = dict(blocks(built, 'style'))
    for name, old_value in original.items():
        require(scripts.get(name) == old_value, f'original r16 script changed or missing: {name}')

    chain = ('dklaR16HistoryCode', 'dklaR17PdfRoutes', 'dklaR17PdfSources',
             'dklaR17ScotusLinks', 'dklaR17Logo')
    order = [name for name, _ in scripts_list]
    for name in chain:
        require(order.count(name) == 1, f'expected one <script id="{name}">, got {order.count(name)}')
    if all(name in order for name in chain):
        require([order.index(name) for name in chain] == sorted(order.index(name) for name in chain),
                'r17 scripts out of order; see assembler.py component list')
    require('dklaR17LogoStyle' in style, 'missing dklaR17LogoStyle CSS')
    for name, filename in (('dklaR17PdfSources', 'pdf-sources.js'),
                           ('dklaR17ScotusLinks', 'scotus-links.js'),
                           ('dklaR17Logo', 'logo.js')):
        file = PARTS / filename
        require(file.is_file(), f'missing component {file}')
        if file.is_file():
            require(scripts.get(name) == file.read_text(encoding='utf-8'),
                    f'{name} differs from {filename}; re-run assemble.py')
    css_file = PARTS / 'logo.css'
    if css_file.is_file():
        require(style.get('dklaR17LogoStyle') == css_file.read_text(encoding='utf-8'),
                'embedded logo CSS differs from logo.css; re-run assemble.py')

    routes = json_script(scripts, 'dklaR17PdfRoutes')
    atlas = json_script(scripts, 'seedData')
    history = json_script(scripts, 'scotusHistoryData')
    source_index = json_script(scripts, 'sourceIndex')
    if routes is not None:
        manifest = PARTS / 'pdf-routes.json'
        require(manifest.is_file(), 'missing tools/r17/pdf-routes.json')
        if manifest.is_file():
            require(routes == json.loads(manifest.read_text(encoding='utf-8')),
                    'embedded PDF routes differ from pdf-routes.json; re-run assemble.py')
        require(routes.get('format') == 'dkla-r17-physical-pdf-routes-v1',
                'unexpected PDF route schema; PDF viewer will ignore these routes')
        mappings = routes.get('routes', {})
        require(isinstance(mappings, dict) and bool(mappings), 'PDF route map is empty or invalid')
        if isinstance(mappings, dict):
            require(routes.get('counts', {}).get('routes') == len(mappings),
                    'PDF route count does not equal route-map size')
            for key, item in mappings.items():
                require(isinstance(item, dict) and isinstance(item.get('page'), int)
                        and not isinstance(item.get('page'), bool) and item['page'] > 0,
                        f'PDF route {key} lacks a positive physical page number')
                require(isinstance(item, dict) and isinstance(item.get('path'), str),
                        f'PDF route {key} lacks a file path')
        physical = list(route_paths(routes))
        require(bool(physical), 'PDF routes contain no physical PDF paths')
        for context, path in physical:
            validate_file(path, context)
    else:
        physical = []

    if source_index is not None:
        for key, obj in source_index.items():
            if isinstance(obj, dict) and 'file' in obj:
                validate_file(obj['file'], f'sourceIndex.{key}.file')
    if atlas is not None and history is not None:
        nodes = {n['id']: n for n in atlas['nodes']}
        cases = history['cases']
        if routes is not None and isinstance(routes.get('routes'), dict):
            mappings = routes['routes']
            for entry in (*atlas['nodes'], *atlas['edges']):
                for source in entry.get('sources', []):
                    url = source.get('url', '')
                    if url.startswith('#') and url not in mappings:
                        errors.append(f'{entry["id"]}: embedded source has no PDF route: {url}')
                    if url.startswith(('added-sources/', 'DKLA-sources/')) and url.split('#', 1)[0].lower().endswith('.pdf'):
                        validate_file(url, f'{entry["id"]} direct citation')
                    if url.startswith('added-sources/opinions/') and url.lower().endswith('.txt') and url not in mappings:
                        errors.append(f'{entry["id"]}: opinion text lacks a PDF route: {url}')
        require(len(cases) == 230, f'SCOTUS vote dataset has {len(cases)} linked cases; expected 230 from r16')
        for ident, case in cases.items():
            require(ident in nodes, f'SCOTUS case {ident} no longer has an atlas entry')
            require(bool(case.get('decisions')), f'SCOTUS case {ident} has no recorded decision')
            for ix, decision in enumerate(case.get('decisions', [])):
                require(bool(decision.get('votes')),
                        f'SCOTUS case {ident}, question {ix + 1}: no individual votes')
        link_js = scripts.get('dklaR17ScotusLinks', '')
        require('dataset.shCase' in link_js or 'data-sh-case' in link_js,
                'SCOTUS case panels lack a case-section navigation action')
        print(f'{OUTPUT.name}: {len(nodes)} entries; {len(cases)} linked SCOTUS cases; '
              f'{len(physical)} PDF route references')

    if errors:
        for error in errors[:50]:
            print('FAIL:', error)
        if len(errors) > 50:
            print(f'FAIL: {len(errors) - 50} additional errors')
        return 1
    print('PASS: r16 baseline preserved; r17 components ordered and embedded; '
          'PDF route targets exist and have PDF headers; SCOTUS voting links retained.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
