"""v2.6 gate: exact original legal data, narrowly pinned runtime and release metadata changes."""
import contextlib
import base64
import hashlib
import io
import importlib.util
import json
import re
import sys
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('stage2_guard', ROOT / 'tools/stage2/content_guard.py')
previous = importlib.util.module_from_spec(spec)
spec.loader.exec_module(previous)


def script_identity(raw):
    records = []
    for attributes, body in re.findall(rb'<script\b([^>]*)>(.*?)</script\s*>', raw, re.I | re.S):
        ident = re.search(rb'\bid="([^"]+)"', attributes)
        ident = ident[1].decode() if ident else None
        if ident == 'dklaR19Briefs':
            approved = json.loads((ROOT / 'tools/performance/approved-runtime.json').read_bytes())
            assert approved['artifactSha256'] == previous.APP_SHA
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
    source = previous.read_source()
    assert hashlib.sha256(source).hexdigest() == previous.SOURCE_SHA, 'Original legal/source bytes changed'
    frozen = json.loads((ROOT / 'tools/v26/approved-v25-scripts.json').read_bytes())
    assert frozen['artifactSha256'] == previous.APP_SHA
    current = (ROOT / 'work/build/DKLA-v2.6.html').read_bytes()
    assert script_identity(current) == frozen['scripts'], 'Executable/data bytes changed beyond the pinned runtime and release metadata exceptions'
    for css, font, license in [('release-font.css', 'Orbitron-wght.ttf', 'OFL.txt')]:
        body = (ROOT / 'tools/v26' / css).read_bytes()
        assert base64.b64encode((ROOT / 'tools/v26/assets' / font).read_bytes()) in body
        assert (ROOT / 'tools/v26/assets' / license).read_text(encoding='utf-8').strip() in body.decode().replace('\r\n', '\n'), 'Font license missing'
    stream = io.StringIO()
    with contextlib.redirect_stdout(stream):
        try:
            previous.stage1.verify(SimpleNamespace(
                manifest=ROOT / 'tools/stage1/baseline/content-manifest.json',
                allow=previous.VISUAL_PATHS + ['api/admin.js', 'assets/admin/app.js',
                    'assets/admin/us-map.js', 'assets/admin/management.css',
                    'lib/analytics/collect.js', 'lib/analytics/identity.js',
                    'lib/analytics/reports.js', 'lib/analytics/security.js'], canonical=['DKLA-r18.html'],
                allow_config=['package.json', 'vercel.json'],
                allow_build_source=previous.BUILD_PATHS + ['tools/r19/sw.template.js', 'tools/r19/check_worker.cjs',
                    'tools/r19/briefs.js', 'tools/cold-call/reader.js',
                    'assets/admin/index.html', 'how-to-use.html', 'privacy.html', 'tools/analytics/README.md',
                    'tools/analytics/analytics.test.mjs',
                    'tools/analytics/check.mjs', '.github/workflows/cold-call.yml',
                    'tools/v25/home-fit.spec.mjs'],
                allow_build_outputs=False, allow_module=[], allow_release_build=False,
                allow_saved_work=False, report=None))
        except SystemExit as result:
            if result.code:
                raise ValueError(stream.getvalue())
    report = json.loads(stream.getvalue())
    report.update(originalSourceSha256=previous.SOURCE_SHA, frozenV25Sha256=previous.APP_SHA,
                  v26Sha256=hashlib.sha256(current).hexdigest(), pinnedScripts=len(frozen['scripts']),
                  allowedDataChange='Only dklaR19Data top-level version/build and the exact first v2.6 changelog entry')
    output = ROOT / 'work/v26-content-guard.json'
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: report[k] for k in ['pass', 'checked', 'pinnedScripts', 'originalSourceSha256', 'v26Sha256']}))


if __name__ == '__main__':
    main()
