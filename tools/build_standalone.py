#!/usr/bin/env python3
"""Build a single self-contained DKLA HTML file from the small working HTML.

Usage (from the DKLA folder):
    python3 tools/build_standalone.py                       # DKLA-r8.html -> DKLA-standalone.html
    python3 tools/build_standalone.py IN.html OUT.html

Every "DKLA-sources/..." path listed in DKLA-sources/manifest.json is replaced by the file's
bytes, encoded exactly as the original file stored them (a data: URI for page images, bare
base64 for the three Civil Procedure PDFs). The two small code edits made for the folder
version are reversed. Built from the unedited DKLA-r8.html, the output is byte-identical to
the original DKLA-r8-rebuilt.html (the script reports the SHA-256 check).
Only the Python standard library is used.
"""
import base64, hashlib, json, os, re, sys

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'DKLA-r8.html')
dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, 'DKLA-standalone.html')
base = os.path.dirname(os.path.abspath(src))
manifest = json.load(open(os.path.join(base, 'DKLA-sources', 'manifest.json')))

html = open(src, 'rb').read()
by_path = {f['path']: f for f in manifest['files']}
used, bad = set(), []


def inline(m):
    path = m.group(1).decode()
    f = by_path.get(path)
    if f is None:
        return m.group(0)
    used.add(path)
    blob = open(os.path.join(base, path), 'rb').read()
    if hashlib.sha256(blob).hexdigest() != f['sha256']:
        bad.append(path)
    b64 = base64.b64encode(blob).decode()
    value = b64 if f['encoding'] == 'base64' else 'data:' + f['mime'] + ';base64,' + b64
    return b'"' + value.encode() + b'"'


html = re.sub(rb'"(DKLA-sources/[^"]+)"', inline, html)
missing = [p for p in by_path if p not in used]

for p in manifest['codePatches']:
    n = p['patched'].encode()
    if html.count(n) == 1:
        html = html.replace(n, p['original'].encode())
    else:
        print('note: code edit in', p['block'], 'was changed since the split; left as is')

open(dst, 'wb').write(html)
sha = hashlib.sha256(html).hexdigest()
print(f'wrote {dst} ({len(html):,} bytes)')
if missing:
    print(f'warning: {len(missing)} source paths no longer appear in the HTML, e.g. {missing[:3]}')
if bad:
    print(f'WARNING: {len(bad)} source files differ from the manifest checksums, e.g. {bad[:3]}')
if sha == manifest['originalSha256']:
    print('identical to the original', manifest['originalFile'], '(SHA-256 match)')
else:
    print('differs from the original file (expected once the atlas has been edited)')
