"""Data guard: the built atlas still carries exactly the approved data.

Every data block in the built page (the atlas graph, the archives, the
dictionary, the briefs, the authorities, the SCOTUS records and so on: every
<script> that is not executable JavaScript) must be byte-for-byte the approved
block, in the approved order. The only parts allowed to differ are the
release's version, build tag and first changelog entry.

Executable code and styles are NOT pinned here. They are free to change and
are judged by what they do: the feature checks and the browser checks.

    python tools/verify/data_guard.py            check (run after `pnpm build`)
    python tools/verify/data_guard.py --update   record the current data blocks as approved,
                                                 after a deliberate, reviewed data change
"""
import argparse
import base64
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APPROVED = Path(__file__).with_name('data-blocks.json')
BUILT = ROOT / 'work/build/DKLA-v2.8.html'
# The first changelog entry of the current release; any other change to the release record is a data change.
sys.path.insert(0, str(ROOT / 'tools/r19'))
from assemble import CHANGELOG_V28
RELEASE_ENTRY = CHANGELOG_V28


def executable(attributes: str) -> bool:
    kind = re.search(r'\btype\s*=\s*["\']([^"\']+)', attributes, re.I)
    return kind is None or kind[1].lower() in ('module', 'text/javascript', 'application/javascript')


def data_blocks(raw: bytes) -> list[dict]:
    records = []
    for attributes, body in re.findall(rb'<script\b([^>]*)>(.*?)</script\s*>', raw, re.I | re.S):
        attributes = attributes.decode()
        if executable(attributes):
            continue
        ident = re.search(r'\bid="([^"]+)"', attributes)
        ident = ident[1] if ident else None
        if ident == 'dklaR19Data':
            parsed = json.loads(body)
            assert parsed['version'] == 'v2.8' and re.fullmatch(r'v2\.8-[0-9a-f]{10}', parsed['build'])
            assert parsed['changelog'][0] == RELEASE_ENTRY, 'Unreviewed release-history entry'
            token = b'"changelog":[' + json.dumps(RELEASE_ENTRY, ensure_ascii=False, separators=(',', ':')).encode() + b','
            assert body.count(token) == 1
            body = body.replace(token, b'"changelog":[', 1)
            # Replace exactly the first serialized scalar token, not legal text
            # containing version/build words. All remaining bytes stay pinned.
            for key in [b'version', b'build']:
                token = json.dumps(parsed[key.decode()]).encode()
                body, count = re.subn(rb'("' + key + rb'"\s*:\s*)' + re.escape(token),
                                      lambda match: match[1] + b'"<release-metadata>"', body, count=1)
                assert count == 1
        records.append(dict(id=ident, attributes=attributes, sha256=hashlib.sha256(body).hexdigest()))
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--update', action='store_true')
    args = parser.parse_args()
    current = data_blocks(BUILT.read_bytes())
    if args.update:
        APPROVED.write_text(json.dumps({'blocks': current}, indent=1) + '\n', encoding='utf-8', newline='\n')
        print(f'Recorded {len(current)} data blocks.')
        return
    approved = json.loads(APPROVED.read_text(encoding='utf-8'))['blocks']
    if current != approved:
        want, have = {b['id']: b for b in approved}, {b['id']: b for b in current}
        for ident in sorted(set(want) | set(have), key=str):
            if want.get(ident) != have.get(ident):
                print(f'DATA BLOCK CHANGED: {ident}\n  approved {want.get(ident)}\n  built    {have.get(ident)}')
        if [b['id'] for b in current] != [b['id'] for b in approved]:
            print('The order or set of data blocks changed.')
        sys.exit(1)
    # The embedded font must still carry its licence.
    body = (ROOT / 'src/features/v26/release-font.css').read_bytes()
    assert base64.b64encode((ROOT / 'tools/v26/assets/Orbitron-wght.ttf').read_bytes()) in body
    assert (ROOT / 'tools/v26/assets/OFL.txt').read_text(encoding='utf-8').strip() in body.decode().replace('\r\n', '\n'), 'Font license missing'
    print(json.dumps({'pass': True, 'dataBlocks': len(current)}))


if __name__ == '__main__':
    main()
