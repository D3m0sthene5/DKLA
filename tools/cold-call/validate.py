"""Fail closed on unmapped cases, unsourced episodes, or changed source briefs."""
import hashlib
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]


def validate(data, graph, full):
    assert data['schemaVersion'] == 1, 'Unsupported cold-call schema'
    nodes = {n['id']: n for n in graph['nodes']}
    ids = set()
    for case in data['cases']:
        cid = case['id']
        assert cid not in ids, f'Duplicate cold-call case: {cid}'
        ids.add(cid)
        assert nodes[cid]['kind'] == 'Case' and nodes[cid].get('mnemonic'), f'{cid}: requires an illustrated case'
        assert case['briefSha256'] == hashlib.sha256(full[case['briefId']].encode()).hexdigest(), f'{cid}: source brief changed; recheck the narrative and update its fingerprint'
        assert case['revision'] >= 1 and case['actors'] and case['proceedings'] and case['limits'], f'{cid}: incomplete orientation'
        sources = {s['id']: s for s in case['sources']}
        assert len(sources) == len(case['sources']), f'{cid}: duplicate source'
        for source in sources.values():
            if 'url' in source:
                url = urlparse(source['url'])
                assert url.scheme == 'https' and url.hostname in {'law.justia.com','supreme.justia.com','www.law.cornell.edu'}, f'{cid}: unreviewed primary-source host'
            else:
                path = source['path']
                assert path.startswith('added-sources/') and '..' not in Path(path).parts and (ROOT / path).is_file(), f'{cid}: missing source on file'
        section_ids = set()
        for section in case['sections']:
            sid = section['id']
            assert re.fullmatch(r'[a-z][a-z0-9-]*', sid) and sid not in section_ids, f'{cid}: invalid or duplicate section id'
            section_ids.add(sid)
            assert section['title'] and section['cue'] and section['paragraphs'], f'{cid}/{sid}: incomplete narrative'
            assert all(isinstance(p,str) and p.strip() for p in section['paragraphs']), f'{cid}/{sid}: empty paragraph'
            follow = section['followUp']
            assert follow['question'] and follow['answer'], f'{cid}/{sid}: incomplete rehearsal'
            for obj in (section, follow):
                assert obj['sources'], f'{cid}/{sid}: no citations'
                for ref in obj['sources']:
                    assert ref['id'] in sources and sources[ref['id']].get('url') and ref['pinpoint'].strip(), f'{cid}/{sid}: invalid source reference'
        assert len(section_ids) >= 4, f'{cid}: incomplete case account'
    assert ids, 'No cold-call narratives'
    return data
