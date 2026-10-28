"""Release source and chronology integrity. Does not certify legal accuracy."""
import hashlib
import json
from pathlib import Path
import sys
from concurrent.futures import ThreadPoolExecutor
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/r19'))
from assemble import build_data, read_source, script_blocks

def check():
    data, _ = build_data()
    graph = json.loads(script_blocks(read_source().decode())['seedData'])
    sources = json.loads((ROOT / 'tools/v28/source-links.json').read_text())
    audit = json.loads((ROOT / 'tools/v28/source-audit.json').read_text())
    timeline_data = json.loads((ROOT / 'tools/r19/data/timelines.json').read_text())
    assert not any(timeline_data['left_out'].values()), 'Obsolete omitted-case records remain'
    timelines = timeline_data['timelines']
    chronologies = json.loads((ROOT / 'tools/v28/case-chronologies.json').read_text())
    entries = {e[0] for e in data['entries']}
    assert set(sources) == entries | {'swiss-2024'}, 'An original source is missing or orphaned'
    assert len(chronologies) == 3
    paths = {s['path'] for ls in sources.values() for s in ls if 'path' in s}
    def inspect(path):
        original = ROOT / path
        raw = original.read_bytes()
        assert raw.startswith(b'%PDF-'), f'Not an original PDF: {path}'
        doc = audit['sourceDocuments'][path]
        assert hashlib.sha256(raw).hexdigest() == doc['sha256'], f'Source changed: {path}'
        return path, doc['pages']
    counts = dict(ThreadPoolExecutor(8).map(inspect, paths))
    for bid, links in sources.items():
        assert links, f'No source for {bid}'
        for source in links:
            if 'path' in source:
                assert 1 <= source['page'] <= counts[source['path']], f'Invalid PDF page: {bid}'
            else:
                assert source['url'].startswith('https://'), f'Invalid opinion URL: {bid}'
    map_cases = {n['id'] for n in graph['nodes'] if n['kind'] == 'Case'}
    covered = {s.get('id') for t in timelines for s in t['steps']}
    assert map_cases <= covered, 'A map case disappeared from the doctrine timelines'
    for tid in ('erie', 'erie-rules'):
        line = next(t for t in timelines if t['id'] == tid)
        assert {'cp-ragan', 'cp-walker'} <= {s.get('id') for s in line['steps']}
    wanted = {e[6] or e[0] for e in data['entries']} | {'swiss-2024'}
    actual = []
    for line in chronologies:
        known_years = [s['year'] for s in line['steps'] if s['year'] is not None]
        assert known_years == sorted(known_years), 'Chronology out of order'
        actual += [s.get('id') or s['sup'] for s in line['steps']]
    assert set(actual) == wanted and len(actual) == len(wanted), 'Chronology is incomplete or duplicated'
    return dict(passCheck=True, sourceCaseAccounts=len(sources), originalPDFs=len(paths),
                mapCases=len(map_cases), doctrineTimelines=len(timelines),
                doctrineSteps=sum(len(t['steps']) for t in timelines), chronologyCases=len(actual),
                scope='Source bytes, PDF bounds, case coverage and chronology structure; not a legal-truth test.')

if __name__ == '__main__':
    print(json.dumps(check(), indent=2))
