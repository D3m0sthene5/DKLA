"""Fail closed on unmapped cases, unsourced episodes, or changed source briefs."""
import hashlib
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]


def validate(data, graph, full, briefs=None):
    assert data['schemaVersion'] in (1, 2), 'Unsupported cold-call schema'
    nodes = {n['id']: n for n in graph['nodes']}
    known_paths = {s.get('url','').split('#')[0] for n in nodes.values() for s in n.get('sources', [])}
    ids = set()
    for case in data['cases']:
        cid = case['id']
        assert cid not in ids, f'Duplicate cold-call case: {cid}'
        ids.add(cid)
        origin = case.get('origin', 'narrative')
        assert origin in ('narrative', 'brief', 'atlas'), f'{cid}: unknown content origin'
        if not cid.startswith('brief-'):
            assert nodes[cid]['kind'] == 'Case' and nodes[cid].get('mnemonic'), f'{cid}: requires an illustrated case'
        if case.get('briefId'):
            assert case['briefSha256'] == hashlib.sha256(full[case['briefId']].encode()).hexdigest(), f'{cid}: source brief changed; recheck the narrative and update its fingerprint'
        if origin == 'narrative':
            assert case['revision'] >= 1 and case['actors'] and case['proceedings'] and case['limits'], f'{cid}: incomplete orientation'
        sources = {s['id']: s for s in case['sources']}
        assert len(sources) == len(case['sources']), f'{cid}: duplicate source'
        for source in sources.values():
            if 'briefId' in source:
                assert source['briefId'] == case['briefId'] and source['briefId'] in full, f'{cid}: wrong source brief'
            elif 'url' in source:
                url = urlparse(source['url'])
                assert (url.scheme == 'https' and url.hostname) or re.fullmatch(r'#(?:book|civ|lrs|supp)=[\w:.-]+', source['url']), f'{cid}: invalid source link'
            else:
                path = source['path'].split('#')[0]
                assert path.startswith(('added-sources/','DKLA-sources/')) and '..' not in Path(path).parts and ((ROOT / path).is_file() or path in known_paths), f'{cid}: missing source on file'
        section_ids = set()
        source_lines = full[case['briefId']].split('\n') if origin == 'brief' else []
        covered = []
        for section in case['sections']:
            sid = section['id']
            assert re.fullmatch(r'[a-z][a-z0-9-]*', sid) and sid not in section_ids, f'{cid}: invalid or duplicate section id'
            section_ids.add(sid)
            assert section['title'] and section['cue'], f'{cid}/{sid}: incomplete narrative'
            if origin == 'brief':
                assert section['spans'], f'{cid}/{sid}: no text'
                for start,end in section['spans']:
                    assert 0 <= start < end <= len(source_lines), f'{cid}/{sid}: invalid source span'
                    covered.extend(range(start,end))
            else:
                assert section['paragraphs'] and all(isinstance(p,str) and p.strip() for p in section['paragraphs']), f'{cid}/{sid}: empty paragraph'
            follow = section.get('followUp')
            if follow:
                assert follow['question'] and follow['answer'], f'{cid}/{sid}: incomplete rehearsal'
            for obj in (section, *([follow] if follow else [])):
                assert obj['sources'], f'{cid}/{sid}: no citations'
                for ref in obj['sources']:
                    assert ref['id'] in sources and ref['pinpoint'].strip(), f'{cid}/{sid}: invalid source reference'
        assert len(section_ids) >= (4 if origin == 'narrative' else 1), f'{cid}: incomplete case account'
        if origin == 'brief':
            substantive = {i for i,line in enumerate(source_lines) if line.strip() and not re.match(r'^#{1,4}\s|^\*\*(?:Course|ID):\*\*\s',line)}
            assert substantive <= set(covered), f'{cid}: source prose omitted'
            assert len(covered) == len(set(covered)), f'{cid}: source prose duplicated'
            phases = [s['phase'] for s in case['sections']]
            assert phases == sorted(phases), f'{cid}: events and proceedings are out of order'
    assert ids, 'No cold-call narratives'
    if briefs:
        expected = {n['id'] for n in graph['nodes'] if n['kind'] == 'Case'} | {'brief-'+e[0] for e in briefs['entries'] if not e[6]}
        assert ids == expected, f'Cold-call coverage mismatch: missing {sorted(expected-ids)}, extra {sorted(ids-expected)}'
        assert data['coverage']['total'] == len(ids), 'Incorrect coverage count'
    return data
