#!/usr/bin/env python3
"""Write restore-page-images.html (repo root) from tools/restore_page_template.html with DKLA-sources/manifest.json embedded."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
man = json.load(open(os.path.join(ROOT, 'DKLA-sources', 'manifest.json')))
slim = {'originalFile': man.get('originalFile'), 'files': [{k: f[k] for k in ('path', 'archive', 'jsonPath', 'encoding', 'bytes', 'sha256')} for f in man['files']]}
tpl = open(os.path.join(ROOT, 'tools', 'restore_page_template.html'), encoding='utf-8').read()
out = tpl.replace('__MANIFEST__', json.dumps(slim, separators=(',', ':')).replace('</', '<\\/'))
open(os.path.join(ROOT, 'restore-page-images.html'), 'w', encoding='utf-8').write(out)
print('restore-page-images.html', len(out) // 1024, 'KB', len(slim['files']), 'files')
