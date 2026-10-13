"""One-time extraction. Refuses to overwrite an existing source tree."""
from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from source.json_parts import split_json
from source.tree import source_hash, read_source

EXPECTED = 'bffd3d4469836a19eaafbd2e29eff443b08b87d496147c887f5d2589d3cb45c1'

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=ROOT / 'DKLA-r18.html')
    args = parser.parse_args()
    destination = ROOT / 'src'
    if any(destination.iterdir()): raise ValueError('src/ already contains files; extraction is never a rebuild step')
    raw = args.input.read_bytes()
    if source_hash(raw) != EXPECTED: raise ValueError('Input is not the approved exact r18 artifact')
    parts, blocks, cursor = [], [], 0
    for number, match in enumerate(re.finditer(rb'<(script|style)\b([^>]*)>(.*?)</\1\s*>', raw, re.I | re.S)):
        start, end = match.span(3)
        relative = f'markup/{number:02d}.html'
        (destination / 'markup').mkdir(exist_ok=True)
        (destination / relative).write_bytes(raw[cursor:start])
        parts.append({'path': relative})
        ident = re.search(rb'\bid=["\x27]([^"\x27]+)', match[2])
        name = ident[1].decode() if ident else f'base-{number:02d}'
        body = match[3]
        if b'application/json' in match[2]:
            tree = split_json(body, name, destination)
            # Preserve outer whitespace outside the root JSON container.
            relative = 'data/' + name + '/block.json'
            (destination / relative).parent.mkdir(parents=True, exist_ok=True)
            (destination / relative).write_bytes((json.dumps(tree, ensure_ascii=False, indent=2) + '\n').encode())
            parts.append({'manifest': relative})
            kind = 'data'
        else:
            kind = 'styles' if match[1].lower() == b'style' else ('assets' if b'application/octet-stream' in match[2] else 'runtime')
            relative = kind + '/' + name + ('.css' if kind == 'styles' else '.txt' if kind == 'assets' else '.js')
            (destination / kind).mkdir(exist_ok=True)
            (destination / relative).write_bytes(body)
            parts.append({'path': relative})
        blocks.append({'id': name, 'kind': kind, 'source': relative, 'bytes': len(body), 'sha256': source_hash(body)})
        cursor = end
    relative = 'markup/closing.html'
    (destination / relative).write_bytes(raw[cursor:])
    parts.append({'path': relative})
    manifest = {'schemaVersion': 1, 'origin': 'DKLA-r18.html', 'originSha256': EXPECTED, 'originBytes': len(raw), 'blocks': blocks, 'parts': parts}
    (destination / 'manifest.json').write_bytes((json.dumps(manifest, indent=2) + '\n').encode())
    if read_source() != raw: raise ValueError('Extraction did not reproduce exact original bytes')
    print('Extracted exact source:', len(raw), 'bytes;', len(blocks), 'named blocks')

if __name__ == '__main__': main()
