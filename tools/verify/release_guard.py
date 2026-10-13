"""Release guard: the built atlas still carries the original legal data and runtime.

1. The editable source under src/ reassembles to the exact original bytes.
2. Every executable and data block in the built HTML matches the approved
   v2.5 block, apart from the reviewed replacements listed in
   tools/performance/approved-runtime.json, the presentation module
   tools/v26/typography.js, and the version/build/changelog metadata.
3. The embedded font still carries its licence.

Content files are covered by tools/verify/content.py. Run after `pnpm build`.
"""
import base64
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from source import read_source

# SHA-256 of the approved v2.5 application and of the original source it was built from.
APP_SHA = '185dcdbbb78113a5a7ed95c702f819d59eb687417f76534e1e6807cff8001f91'
SOURCE_SHA = 'bffd3d4469836a19eaafbd2e29eff443b08b87d496147c887f5d2589d3cb45c1'

def script_identity(raw):
    records = []
    for attributes, body in re.findall(rb'<script\b([^>]*)>(.*?)</script\s*>', raw, re.I | re.S):
        ident = re.search(rb'\bid="([^"]+)"', attributes)
        ident = ident[1].decode() if ident else None
        if ident == 'dklaR19Briefs':
            approved = json.loads((ROOT / 'tools/performance/approved-runtime.json').read_bytes())
            assert approved['artifactSha256'] == APP_SHA
            # Restore only explicitly reviewed module replacements before comparing
            # the complete earlier runtime. Every other script/data byte stays pinned.
            for record in approved['replacements']:
                current = (ROOT / record['path']).read_text(encoding='utf-8')
                assert hashlib.sha256(current.encode()).hexdigest() == record['approvedSha256'], 'Unreviewed runtime change: ' + record['path']
                marker = '/* ===== ' + record['path'] + ' ===== */\n'
                chunk = (marker + current + '\n').encode()
                assert body.count(chunk) == 1, 'Missing/duplicate reviewed module: ' + record['path']
                baseline = ((marker + record['baseline'] + '\n').encode() if record['baseline'] is not None else b'')
                body = body.replace(chunk, baseline, 1)
            # One reviewed presentation module is inserted immediately before
            # final boot. Do not mask or exempt any existing runtime byte.
            module = (ROOT / 'tools/v26/typography.js').read_text(encoding='utf-8')
            suffix = ('/* ===== tools/v26/typography.js ===== */\n' + module + '\n').encode()
            boundary = b'/* ===== tools/v25/boot.js ===== */\n'
            assert body.count(suffix) == 1 and suffix + boundary in body, 'Typography must appear exactly once before final boot'
            body = body.replace(suffix, b'', 1)
        if ident == 'dklaR19Data':
            parsed = json.loads(body)
            assert parsed['version'] == 'v2.6' and re.fullmatch(r'v2\.6-[0-9a-f]{10}', parsed['build'])
            entry = {"v": "v2.6", "date": "2026-10-12", "text": "The legal dictionary has a spine in the authorities header. Cold Call adds restrained ice and vapor detail, and technical typography improves atlas and Supreme Court readability. Hosted full briefs load when opened; complete portable HTML retains every brief. Analytics recognizes a browser only through its first-party cookie, without recovering cleared identifiers from browser storage or ratings sync."}
            assert parsed['changelog'][0] == entry, 'Unreviewed release-history entry'
            token = b'"changelog":[' + json.dumps(entry, ensure_ascii=False, separators=(',', ':')).encode() + b','
            assert body.count(token) == 1
            body = body.replace(token, b'"changelog":[', 1)
            # Replace exactly the first serialized scalar token, not legal text
            # containing version/build words. All remaining bytes stay pinned.
            for key in [b'version', b'build']:
                token = json.dumps(parsed[key.decode()]).encode()
                body, count = re.subn(rb'("' + key + rb'"\s*:\s*)' + re.escape(token),
                    lambda match: match[1] + b'"<release-metadata>"', body, count=1)
                assert count == 1
        records.append(dict(id=ident, attributes=attributes.decode(), sha256=hashlib.sha256(body).hexdigest()))
    return records


def main():
    assert hashlib.sha256(read_source()).hexdigest() == SOURCE_SHA, 'Original legal/source bytes changed'
    frozen = json.loads((ROOT / 'tools/v26/approved-v25-scripts.json').read_bytes())
    assert frozen['artifactSha256'] == APP_SHA
    current = (ROOT / 'work/build/DKLA-v2.6.html').read_bytes()
    assert script_identity(current) == frozen['scripts'], 'Executable/data bytes changed beyond the pinned runtime and release metadata exceptions'
    body = (ROOT / 'tools/v26/release-font.css').read_bytes()
    assert base64.b64encode((ROOT / 'tools/v26/assets/Orbitron-wght.ttf').read_bytes()) in body
    assert (ROOT / 'tools/v26/assets/OFL.txt').read_text(encoding='utf-8').strip() in body.decode().replace('\r\n', '\n'), 'Font license missing'
    print(json.dumps({'pass': True, 'originalSourceSha256': SOURCE_SHA, 'pinnedScripts': len(frozen['scripts']),
                      'builtSha256': hashlib.sha256(current).hexdigest()}))


if __name__ == '__main__':
    main()