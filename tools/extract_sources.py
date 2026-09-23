#!/usr/bin/env python3
"""Create the DKLA-sources folder from the original self-contained DKLA-r8-rebuilt.html.

Usage (from the DKLA folder):
    python3 tools/extract_sources.py /path/to/DKLA-r8-rebuilt.html

Reads each image and PDF listed in DKLA-sources/manifest.json out of the original file's
embedded archives, decodes it, checks it against the manifest's SHA-256 checksum, and writes
it to DKLA-sources/. The original file is only read, never changed.
Only the Python standard library is used.
"""
import base64, hashlib, json, os, re, sys

if len(sys.argv) != 2:
    sys.exit('usage: python3 tools/extract_sources.py /path/to/DKLA-r8-rebuilt.html')
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
manifest = json.load(open(os.path.join(root, 'DKLA-sources', 'manifest.json')))
data = open(sys.argv[1], 'rb').read()
print(f'read {len(data):,} bytes')

archives = {}
for name in sorted({f['archive'] for f in manifest['files']}):
    m = re.search(rb'<script id="' + name.encode() + rb'"[^>]*>', data)
    if not m:
        sys.exit(f'{name} block not found; is this the original DKLA-r8-rebuilt.html?')
    archives[name] = json.loads(data[m.end():data.find(b'</script>', m.end())])
del data

bad = 0
for f in manifest['files']:
    v = archives[f['archive']]
    for k in f['jsonPath']:
        v = v[k]
    if f['encoding'] == 'datauri':
        v = v.split(';base64,', 1)[1]
    blob = base64.b64decode(v)
    if hashlib.sha256(blob).hexdigest() != f['sha256']:
        bad += 1
        print('checksum mismatch:', f['path'])
        continue
    out = os.path.join(root, f['path'])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'wb') as fh:
        fh.write(blob)

print(f'wrote {len(manifest["files"]) - bad} of {len(manifest["files"])} files to DKLA-sources/')
if bad:
    sys.exit(f'{bad} files did not match; the input is not the same DKLA-r8-rebuilt.html')
print('all checksums match')
