#!/usr/bin/env python3
"""Inventory effective authored explanations and print bounded review packs.

This models the default unedited graph after canonical briefs, rule additions,
plain-text overlays and audit overlays. It does not replace the user's saved
edits and does not mark text legally reviewed. Exact source locators distinguish
inventory coverage from a source comparison.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/r19'))
import assemble


def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def seed_account(node):
    return json.dumps({k: node.get(k) for k in ('summary', 'notes', 'sections', 'sources', 'textbookImport')}, ensure_ascii=False, sort_keys=True)


def check(inv):
    """Verify inventory/recorded review drift; do not perform legal review."""
    problems = []
    path = ROOT / 'tools/v25/explanation-inventory.json'
    if not path.exists() or json.loads(path.read_text(encoding='utf-8')) != inv:
        problems.append('Effective explanation inventory is stale; regenerate the inventory after changes. This does not refresh source-review claims.')
    audit_path = ROOT / 'tools/v25/explanation-audit.json'
    if not audit_path.exists():
        problems.append('Takeaway review ledger is missing.')
    else:
        audit = json.loads(audit_path.read_text(encoding='utf-8'))
        _, nodes, data, full, _, _ = effective()
        current = {r['id']: r for r in inv['records'] if r['kind'] == 'takeaway'}
        reviews = {r['id']: r for r in audit.get('takeawayReviews', [])}
        if len(reviews) != len(audit.get('takeawayReviews', [])) or set(reviews) != set(current):
            problems.append('Takeaway review coverage contains duplicate, missing or extra records.')
        primary = {r['id'] for r in audit.get('primaryChecks', [])}
        for nid, record in reviews.items():
            if nid not in current:
                continue
            if record.get('takeawaySha256') != current[nid]['textSha256']:
                problems.append(nid + ': reviewed takeaway changed; review and update its evidence deliberately.')
            basis = record.get('basis', {})
            bid = data['map'].get(nid)
            if bid:
                canonical = data['sections'][bid]
                if basis.get('briefId') != bid or basis.get('ruleSha256') != sha(canonical['rule']):
                    problems.append(nid + ': compared canonical rule changed.')
                for section, digest in basis.get('comparedSections', {}).items():
                    if digest != sha(canonical['sections'].get(section, '')):
                        problems.append(nid + ': compared ' + section + ' changed.')
                if 'Holding' not in basis.get('comparedSections', {}):
                    problems.append(nid + ': complete Holding comparison absent from ledger.')
                if basis.get('effectiveFullBriefSha256') != sha(full[bid]):
                    problems.append(nid + ': canonical brief provenance changed; inspect affected review scope.')
            elif basis.get('savedAccountSha256') != sha(seed_account(nodes[nid])):
                problems.append(nid + ': reviewed assigned seed account changed.')
            for pid in record.get('independentPrimaryChecks', []):
                if pid not in primary:
                    problems.append(nid + ': missing independent primary check ' + pid)
            if record.get('freshCompleteOpinionReview') is not False:
                problems.append(nid + ': unsupported complete fresh opinion-review claim.')
        blocks = assemble.script_blocks(assemble.SOURCE.read_text(encoding='utf-8'))
        supplement = json.loads(blocks['suppArchive'])
        supplement = supplement.get('pages', supplement)
        for page in audit.get('assignedSourcePages', []):
            item = supplement[str(page['printedPage'])]
            text = item if isinstance(item, str) else item.get('text', '')
            if sha(text) != page.get('textSha256'):
                problems.append('Assigned Swiss supplement page changed: ' + str(page['printedPage']))
    if problems:
        raise ValueError('\n'.join(problems))
    return dict(ok=True, checkScope='Inventory and recorded source-review drift; not legal truth.', counts=inv['counts'], totalRecords=len(inv['records']))


def effective():
    blocks = assemble.script_blocks(assemble.SOURCE.read_text(encoding='utf-8'))
    graph = json.loads(blocks['seedData'])
    nodes = {n['id']: n for n in graph['nodes']}
    data, full = assemble.build_data()
    for nid, bid in data['map'].items():
        if nid in nodes and bid in data['sections']:
            nodes[nid]['summary'] = data['sections'][bid]['rule']
            nodes[nid]['sections'] = copy.deepcopy(data['sections'][bid]['sections'])
    origins = {k: 'DKLA-r18.html :: seedData.nodes' for k in nodes}
    for source in ['tools/r19/data/rlcc.json', 'tools/r19/data/rules22.json']:
        addition = read(source)
        for rule in addition['rules']:
            nodes[rule['id']] = copy.deepcopy(rule)
            origins[rule['id']] = source + ' :: rules'
        if 'hub' in addition and addition['hub']['id'] in nodes:
            hub = addition['hub']
            nodes[hub['id']].update({k: copy.deepcopy(v) for k, v in hub.items() if k in ('title', 'shortTitle', 'summary', 'notes', 'sources')})
            origins[hub['id']] = source + ' :: hub'
    graph['nodes'] = list(nodes.values())
    # Mirrors the runtime exact-value edits. Apply repeatedly to settle chains.
    applied = []
    for iteration in range(3):
        for source in ['tools/r19/data/plain.json', 'tools/r19/data/r21-audit.json']:
            overlay = read(source)
            for nid, edits in overlay.get('nodes', {}).items():
                obj = nodes.get(nid)
                if not obj:
                    continue
                for field, before, after in edits:
                    parts = field.split('.')
                    parent = obj
                    for part in parts[:-1]:
                        parent = parent.get(part, {}) if isinstance(parent, dict) else {}
                    if parent.get(parts[-1]) != before:
                        continue
                    if after is None:
                        parent.pop(parts[-1], None)
                    else:
                        parent[parts[-1]] = after
                    applied.append(dict(id=nid, field=field, source=source, iteration=iteration))
            edges = {e['id']: e for e in graph['edges']}
            for eid, edits in overlay.get('edges', {}).items():
                obj = edges.get(eid)
                if obj:
                    for field, before, after in edits:
                        if obj.get(field) == before:
                            obj[field] = after
            if iteration == 0:
                drop = set(overlay.get('removeEdges', []))
                graph['edges'] = [e for e in graph['edges'] if e['id'] not in drop]
                have = {e['id'] for e in graph['edges']}
                graph['edges'] += [e for e in overlay.get('addEdges', []) if e['id'] not in have]
    return graph, nodes, data, full, origins, applied


def inventory():
    graph, nodes, data, full, origins, applied = effective()
    takeaways = read('tools/r19/data/takeaways.json')
    records = []
    for nid, node in nodes.items():
        bid = data['map'].get(nid)
        loc = f'tools/r19/data/sections.json :: {bid}.rule (effective assembler overlays)' if bid else origins[nid] + ' :: ' + nid
        source = dict(briefId=bid, canonicalLocator=loc, atlasSources=node.get('sources', []), effectiveFullBriefSha256=sha(full[bid]) if bid else None)
        if nid in takeaways:
            records.append(dict(kind='takeaway', id=nid, title=node['title'], field='takeaway', text=takeaways[nid], textSha256=sha(takeaways[nid]), source=source, reviewStatus='Inventory only; see explanation-audit.json for actual review.'))
        for field in ('summary', 'notes'):
            text = node.get(field)
            if isinstance(text, str) and text.strip():
                records.append(dict(kind='case-rule' if bid and field == 'summary' else ('case-note' if bid else 'noncase'), nodeKind=node.get('kind'), id=nid, title=node['title'], field=field, text=text, textSha256=sha(text), source=source, reviewStatus='Inventory only.'))
        if not bid:
            for field, text in node.get('sections', {}).items():
                if isinstance(text, str) and text.strip():
                    records.append(dict(kind='noncase', nodeKind=node.get('kind'), id=nid, title=node['title'], field='sections.' + field, text=text, textSha256=sha(text), source=source, reviewStatus='Inventory only.'))
        for course, treatment in node.get('courseTreatments', {}).items():
            for field in ('summary', 'notes'):
                text = treatment.get(field)
                if isinstance(text, str) and text.strip():
                    records.append(dict(kind='course-treatment', nodeKind=treatment.get('kind'), id=nid, title=treatment.get('title', node['title']), field='courseTreatments.' + course + '.' + field, text=text, textSha256=sha(text), source=dict(canonicalLocator=origins[nid] + ' :: ' + nid + '.courseTreatments.' + course + '.' + field, atlasSources=treatment.get('sources', [])), reviewStatus='Inventory only.'))
    for e in graph['edges']:
        if e.get('explanation'):
            text = e['explanation']
            records.append(dict(kind='connection', id=e['id'], title=e.get('label', ''), field='explanation', text=text, textSha256=sha(text), source=dict(source=e['source'], target=e['target']), reviewStatus='Inventory only.'))
    timelines = read('tools/r19/data/timelines.json')['timelines']
    for t in timelines:
        for field in ['guide', 'now']:
            records.append(dict(kind='timeline-context', id=t['id'], title=t['title'], field=field, text=t[field], textSha256=sha(t[field]), source=dict(auditPath='tools/v25/timeline-audit.json'), reviewStatus='Reviewed in timeline pass; scope recorded in its audit.'))
        for i, s in enumerate(t['steps'], 1):
            records.append(dict(kind='timeline-step', id=f"{t['id']}:{i}", title=t['title'], field='note', text=s['note'], textSha256=sha(s['note']), source=dict(auditPath='tools/v25/timeline-audit.json', timeline=t['id'], step=i), reviewStatus='Reviewed in timeline pass; scope recorded in its audit.'))
    counts = {}
    for r in records:
        counts[r['kind']] = counts.get(r['kind'], 0) + 1
    return dict(schemaVersion=1, generatedAt='2026-10-11', scope='Default authored explanations after effective runtime text overlays. Inventory is not legal review. User-authored saved changes, dictionary definitions and authority-library source texts are separate surfaces.', counts=counts, nodeCount=len(nodes), appliedNodeOverlays=applied, records=records)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--check', action='store_true', help='Fail stale effective inventory or reviewed takeaway/source fingerprints; does not certify accuracy.')
    parser.add_argument('--pack', choices=['noncase', 'takeaway', 'course-treatment'])
    parser.add_argument('start', nargs='?', type=int, default=0)
    parser.add_argument('end', nargs='?', type=int, default=20)
    parser.add_argument('--source', choices=['rule', 'Holding', 'Reasoning', 'Material Facts', 'full'], default='Holding')
    parser.add_argument('--node-kind', help='Restrict a non-case pack to Rule, Concept, Note, etc.')
    args = parser.parse_args()
    inv = inventory()
    if args.write:
        (ROOT / 'tools/v25/explanation-inventory.json').write_bytes((json.dumps(inv, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    if args.check:
        print(json.dumps(check(inv), indent=2))
    elif args.pack:
        if args.pack == 'takeaway':
            _, _, data, full, _, _ = effective()
            pack = [r for r in inv['records'] if r['kind'] == 'takeaway']
            for index, r in enumerate(pack[args.start:args.end], args.start):
                bid = r['source']['briefId']
                print(f"\n{index}. {r['id']} | {r['title']}\nTAKEAWAY: {r['text']}")
                if bid:
                    print('CANONICAL RULE: ' + data['sections'][bid]['rule'])
                    print('SOURCE ' + args.source + ': ' + (full[bid] if args.source == 'full' else data['sections'][bid]['sections'][args.source] if args.source != 'rule' else data['sections'][bid]['rule']))
                else:
                    print('SOURCE: complete assigned seed account (no separate canonical brief)\n' + seed_account(effective()[1][r['id']]))
        else:
            pack = [r for r in inv['records'] if r['kind'] == args.pack and (not args.node_kind or r.get('nodeKind') == args.node_kind)]
            for index, r in enumerate(pack[args.start:args.end], args.start):
                print(f"\n{index}. {r['id']} | {r['title']} | {r['field']}\n{r['text']}\nSOURCE: {json.dumps(r['source'], ensure_ascii=False)}")
    else:
        print(json.dumps(dict(nodeCount=inv['nodeCount'], counts=inv['counts'], totalRecords=len(inv['records'])), indent=2))
