"""Copy Codex's current briefs into a stable snapshot (text + metadata). Reads Codex's folders only."""
import json, re, sys, hashlib, datetime, collections
from pathlib import Path
from pypdf import PdfReader
R = Path('/private/tmp/dkla_complete'); OUT = Path(sys.argv[1])
roots = {'original_handoff': Path('/private/tmp/DKLA_Work_Handoff/DKLA_Work_Handoff'), 'continuation': Path('/private/tmp/dkla_continue'), 'swarm': Path('/private/tmp/dkla_swarm'), 'max': Path('/private/tmp/dkla_max'), 'next': Path('/private/tmp/dkla_next'), 'round4': Path('/private/tmp/dkla_round4')}
progress = json.loads((R / 'review/current_progress.json').read_text()); audit = {x['id']: x for x in progress['entries']}
baseline = json.loads((R / 'review/baseline_comprehensive_audit_queue.json').read_text())['entries']
render = json.loads((R / 'review/current_render_register.json').read_text())['rows']
def course(c): return 'Civil Procedure' if c.startswith('Civil Procedure') else ('Legislation and the Regulatory State' if c.startswith('Legislation') or c == 'LRS' else c)
def klass(st): return 'pending' if 'PENDING' in st else ('limited' if any(k in st for k in ('LIMIT', 'GAP', 'BLOCKED', 'UNAVAILABLE')) else ('repaired' if ('AFTER' in st or 'REPAIR' in st) else 'pass'))
def pdf_text(p):
    out = []
    for page in PdfReader(p).pages:
        lines = [l.rstrip() for l in (page.extract_text() or '').splitlines()]
        # drop running header/footer furniture
        lines = [l for l in lines if not re.match(r'^(DKLA \||Whole corpus and comprehensive|\d{1,4}$)', l.strip()) and 'Review status in accompanying register' not in l]
        out.append('\n'.join(lines))
    return '\n\n'.join(out)
meta = []; src = collections.Counter()
for x in baseline:
    stage, rest = x['individual_pdf'].split('/', 1)
    pdf = Path(x['corrected_individual_pdf']) if x.get('corrected_individual_pdf') else roots[stage] / rest
    md = Path(x['current_brief_path']) if str(x.get('current_brief_path', '')).endswith('.md') else None
    if md and md.is_file(): text = md.read_text(); kind = 'md'
    else: text = pdf_text(pdf); kind = 'pdf'
    src[kind] += 1; st = x.get('new_comprehensive_audit_status', 'PENDING')
    meta.append(dict(id=x['id'], title=x['title'], course=course(x['course']), status=st, k=klass(st), new=False, fmt=kind, order=int(x.get('first', 10**6))))
    (OUT / 'text' / (x['id'] + '.md')).write_text(text)
for x in render:
    a = audit.get(x['id'], {}); st = a.get('independent_status', 'INDEPENDENT REVIEW PENDING') if a.get('sha256') == x['md_sha256'] else 'INDEPENDENT REVIEW PENDING'
    text = Path(x['md_path']).read_text(); src['md'] += 1
    meta.append(dict(id=x['id'], title=x['title'], course=course(x['course']), status=st, k=klass(st), new=True, fmt='md', order=10**6))
    (OUT / 'text' / (x['id'] + '.md')).write_text(text)
for m in meta: m['sha'] = hashlib.sha256((OUT / 'text' / (m['id'] + '.md')).read_bytes()).hexdigest()[:16]; m['words'] = len((OUT / 'text' / (m['id'] + '.md')).read_text().split())
(OUT / 'meta.json').write_text(json.dumps(dict(taken=datetime.datetime.now().astimezone().isoformat(timespec='minutes'), entries=meta), indent=0))
print(len(meta), src, collections.Counter(m['k'] for m in meta), collections.Counter(m['course'] for m in meta), 'words', sum(m['words'] for m in meta))
