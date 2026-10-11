#!/usr/bin/env python3
"""Check explicit practice-filter coverage and reviewed-record drift, not law."""
import collections
import json
from pathlib import Path
import explanation_inventory as e


def fingerprint(node):
    return e.sha(json.dumps({k: node.get(k) for k in ('id', 'title', 'kind', 'courses', 'summary', 'notes', 'sections', 'tags', 'sources', 'textbookImport', 'lrsImport', 'topics')}, ensure_ascii=False, sort_keys=True))


def main():
    review = e.read('tools/v25/practice-filter.json')
    graph, nodes, *_ = e.effective()
    incident = collections.defaultdict(list)
    for edge in graph['edges']:
        incident[edge['source']].append(edge)
        incident[edge['target']].append(edge)
    records = review['excluded'] + review['retained']
    ids = [record['id'] for record in records]
    assert len(ids) == len(set(ids)), 'Duplicate reviewed practice record'
    expected = {node['id'] for node in graph['nodes'] if node['kind'] == 'Hypothetical'}
    assert set(ids) == expected, 'Practice classification coverage changed; inspect new or missing examples'
    assert len(review['excluded']) == 27 and len(review['retained']) == 17
    for record in records:
        node = nodes[record['id']]
        assert node['kind'] == 'Hypothetical', record['id'] + ': cannot filter a case or ordinary source record'
        assert fingerprint(node) == record['sourceFingerprint'], record['id'] + ': reviewed prose/source changed'
        assert len(incident[node['id']]) == record['rawDegree'], record['id'] + ': relationship degree changed'
        edges = {edge['id']: edge for edge in incident[node['id']]}
        assert set(edges) == {edge['id'] for edge in record['edges']}, record['id'] + ': reviewed edge coverage changed'
        for edge in record['edges']:
            assert all(edges[edge['id']].get(key) == edge.get(key) for key in ('source', 'target', 'label', 'explanation')), record['id'] + ': reviewed relation changed'
        if record['decision'] == 'hide from visible atlas':
            assert record['meaningfulDegree'] == 0 and record['reason'] and record['sources']
    excluded = {record['id'] for record in review['excluded']}
    removed = [edge for edge in graph['edges'] if edge['source'] in excluded or edge['target'] in excluded]
    assert len(removed) == review['counts']['incidentEdgesHidden'] == 78
    assert not any(node['id'] in excluded for node in graph['nodes'] if node['kind'] in ('Case', 'Concept', 'Rule', 'Note'))
    assert sum(node['kind'] == 'Case' for node in graph['nodes']) == 392
    assert all(not record['topicLinks'] for record in review['excluded']), 'Inspect meaningful node-topic links before hiding'
    print('PASS: 44 reviewed examples; 27 explicit exclusions, 17 retained; 78 incident links archived; all 392 cases preserved. Coverage/source-drift checks only.')


if __name__ == '__main__':
    main()
