#!/usr/bin/env python3
"""Check supplemental review drift and guarded integration, not legal truth."""
import copy
import json
from types import SimpleNamespace
from unittest.mock import patch

import explanation_inventory as inventory


class InMemoryCatalogues:
    """Supply negative-test inputs without mutating live source files."""
    def __init__(self, values):
        self.values = values

    def __truediv__(self, name):
        return SimpleNamespace(read_text=lambda **kwargs: json.dumps(self.values[name]))


def check():
    review = inventory.read('tools/v25/generated-rule-connections-review.json')
    audit = inventory.read('tools/r19/data/r21-audit.json')
    graph, nodes, data, _, _, _ = inventory.effective()
    effective_edges = {edge['id']: edge for edge in graph['edges']}
    catalogues = {}
    originals = {}
    for name, prefix, separator in [('rlcc.json', 'r19-rlcc-', '-'), ('rules22.json', 'r22-', '--')]:
        catalogue = inventory.read('tools/r19/data/' + name)
        catalogues[name] = catalogue
        for record in catalogue['rules'] + ([catalogue['hub']] if 'hub' in catalogue else []):
            for target, label, explanation in record.get('links', []):
                eid = prefix + record['id'] + separator + target
                assert eid not in originals, 'Duplicate generated ID: ' + eid
                assert record['id'] in nodes and target in nodes, 'Missing generated endpoint: ' + eid
                originals[eid] = dict(source=record['id'], target=target, label=label, explanation=explanation)
    records = {record['id']: record for record in review['reviewedEdges']}
    assert len(records) == len(review['reviewedEdges']) == 35
    assert set(records) == set(originals), 'Supplemental review coverage differs from the actual rule adapters.'
    proposals = review['proposals']
    assert len(proposals) == 5 and len({p['id'] for p in proposals}) == 4
    expected = copy.deepcopy(originals)
    for proposal in proposals:
        eid, field, old, new = (proposal[key] for key in ('id', 'field', 'old', 'new'))
        assert field in ('label', 'explanation') and expected[eid][field] == old
        assert inventory.sha(old) == proposal['oldSha256'], 'Original correction fingerprint drift: ' + eid
        assert [field, old, new] in audit['edges'].get(eid, []), 'Missing exact-value guard: ' + eid
        assert proposal['status'].startswith('integrated '), 'Integration status is stale: ' + eid
        expected[eid][field] = new
    for eid, record in records.items():
        original, current = originals[eid], effective_edges[eid]
        assert record['sourceId'] == original['source'] and record['targetId'] == original['target']
        assert record['label'] == original['label'] and record['explanation'] == original['explanation'], 'Reviewed source tuple changed: ' + eid
        assert record['textSha256'] == inventory.sha(original['explanation'])
        for field, value in expected[eid].items():
            assert current[field] == value, 'Effective guarded output differs: ' + eid + '.' + field
    authorities = {entry['id']: entry for entry in inventory.read('tools/v25/authorities.json')['entries']}
    for source in review['savedBlackLetterComparisons']:
        text = '\n'.join(line[1] for line in authorities[source['authorityId']]['lines'])
        assert inventory.sha(text) == source['textSha256'], 'Compared saved black-letter text changed: ' + source['authorityId']
    for source in review['canonicalCaseComparisons']:
        assert data['map'][source['nodeId']] == source['briefId']
        brief = data['sections'][source['briefId']]
        for key, text in [('ruleSha256', brief['rule']), ('holdingSha256', brief['sections']['Holding'])]:
            assert inventory.sha(text) == source[key], 'Compared canonical source changed: ' + source['nodeId'] + '.' + key
        if 'reasoningSha256' in source:
            assert inventory.sha(brief['sections']['Reasoning']) == source['reasoningSha256']
    for path, digest in review['integration']['canonicalCatalogueSha256'].items():
        # read_text applies universal-newline normalization, so a Windows
        # checkout and Linux CI compare the same UTF-8 source text.
        assert inventory.sha((inventory.ROOT / path).read_text(encoding='utf-8')) == digest, 'Canonical rule catalogue changed after guarded integration: ' + path
    # Exercise the actual assembler validator with its baseline node set. An
    # arbitrary generated-looking ID and a nonexistent endpoint must fail.
    baseline = json.loads(inventory.assemble.script_blocks(inventory.assemble.SOURCE.read_text(encoding='utf-8'))['seedData'])
    baseline_nodes = {node['id']: node for node in baseline['nodes']}
    baseline_nodes.update({rule['id']: rule for rule in catalogues['rules22.json']['rules']})
    baseline_ids = {edge['id'] for edge in baseline['edges']}
    inventory.assemble.load_audit(baseline, baseline_nodes, baseline_ids)
    invalid = copy.deepcopy(audit)
    invalid['edges']['r22-rest205--invented-target'] = [['explanation', 'old', 'new']]
    with patch.object(inventory.assemble, 'DATA', InMemoryCatalogues(dict(catalogues, **{'r21-audit.json': invalid}))):
        try:
            inventory.assemble.load_audit(baseline, baseline_nodes, baseline_ids)
        except ValueError as error:
            assert 'r22-rest205--invented-target' in str(error)
        else:
            raise AssertionError('Assembler accepted an arbitrary generated-looking ID.')
    bad_catalogue = copy.deepcopy(catalogues['rules22.json'])
    bad_catalogue['rules'][0]['links'].append(['invented-target', 'invalid', 'Invalid endpoint'])
    inputs = dict(catalogues, **{'r21-audit.json': audit, 'rules22.json': bad_catalogue})
    with patch.object(inventory.assemble, 'DATA', InMemoryCatalogues(inputs)):
        try:
            inventory.assemble.load_audit(baseline, baseline_nodes, baseline_ids)
        except ValueError as error:
            assert 'unknown endpoint' in str(error)
        else:
            raise AssertionError('Assembler accepted a catalogue link with an unknown endpoint.')
    saved = inventory.read('tools/v25/connection-inventory.json')
    import connection_inventory
    assert saved == connection_inventory.grouped(), 'Effective connection inventory is stale.'
    return dict(ok=True, reviewedGeneratedEdges=35, guardedFields=5, guardedEdges=4,
                scope='Recorded review drift, effective guarded output and exact generated-ID validation; not legal truth.')


if __name__ == '__main__':
    print(json.dumps(check(), ensure_ascii=False, indent=2))
