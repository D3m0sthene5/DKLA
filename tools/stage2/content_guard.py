"""Fixed stage 2 preservation gate; no legal-content exceptions or rewrites."""
import argparse
import contextlib
import hashlib
import io
import json
import sys
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/stage1'))
import content_guard as stage1
sys.path.insert(0, str(ROOT / 'tools'))
from source import read_source

APP_SHA = '185dcdbbb78113a5a7ed95c702f819d59eb687417f76534e1e6807cff8001f91'
SOURCE_SHA = 'bffd3d4469836a19eaafbd2e29eff443b08b87d496147c887f5d2589d3cb45c1'
# Exact code/configuration/doc paths authorized by this extraction stage.
# Never add a legal JSON, Markdown brief, PDF, image or archive to this list.
BUILD_PATHS = [
    '.gitignore', 'AGENTS.md', 'README.md', 'tools/v25/ARCHITECTURE.md',
    'tools/r19/assemble.py', 'tools/r19/check.py', 'tools/r19/audit24.py', 'tools/r19/plain.py', 'tools/v25/runtime-manifest.json',
    'tools/atlas.py', 'tools/build.mjs', 'tools/analytics/prepare.mjs',
    'tools/cold-call/check_main_audit.py', 'tools/cold-call/check_narratives.py', 'tools/cold-call/check_reader.cjs',
    'tools/v25/authorities_build.py', 'tools/v25/authorities_check.cjs', 'tools/v25/check_timeline_audit.py',
    'tools/v25/explanation_inventory.py', 'tools/v25/generated_rule_connections_check.py',
    'tools/v25/geography_check.cjs', 'tools/v25/practice_filter_check.cjs',
]
VISUAL_PATHS = ['api/analytics.js','api/sync.js','tools/analytics/tracker.js',
    'tools/cold-call/frost.js','tools/cold-call/frost.css','tools/v25/authorities.js',
    'tools/v25/authorities.css','tools/v25/home-audit.js']

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, default=ROOT / 'work/stage2-content-guard.json')
    args=parser.parse_args()
    manifest=ROOT / 'tools/stage1/baseline/content-manifest.json'
    records=json.loads(manifest.read_bytes())['files']
    archived=[]
    for original, archive in [('AGENTS.md','AGENTS-through-stage1.md'),('README.md','README-through-stage1.md'),('tools/v25/ARCHITECTURE.md','ARCHITECTURE-through-stage1.md')]:
        digest=hashlib.sha256((ROOT/'tools/history'/archive).read_bytes()).hexdigest()
        record=next(r for r in records if r['path']==original)
        if digest not in (record['checkoutSha256'],record['gitSha256']): raise ValueError('History archive differs: '+original)
        archived.append(dict(path=archive,sha256=digest))
    raw=read_source()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA: raise ValueError('Stage 2 changed original source bytes')
    candidate=ROOT/'work/build/DKLA-v2.5.html'
    if hashlib.sha256(candidate.read_bytes()).hexdigest()!=APP_SHA: raise ValueError('Stage 2 changed approved app bytes')
    stream=io.StringIO()
    with contextlib.redirect_stdout(stream):
        try:
            stage1.verify(SimpleNamespace(manifest=manifest,allow=VISUAL_PATHS,canonical=['DKLA-r18.html'],
                allow_config=['package.json','vercel.json'],allow_build_source=BUILD_PATHS,
                allow_build_outputs=False,allow_module=[],allow_release_build=False,allow_saved_work=False,report=None))
        except SystemExit as result:
            if result.code: raise ValueError(stream.getvalue())
    report=json.loads(stream.getvalue())
    report.update(exactApprovedAppSha256=APP_SHA,exactOriginalSourceSha256=SOURCE_SHA,verbatimArchives=archived)
    args.report.parent.mkdir(parents=True,exist_ok=True)
    args.report.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(passCheck=report['pass'],checked=report['checked'],sourceSha256=SOURCE_SHA,appSha256=APP_SHA)))

if __name__=='__main__': main()
