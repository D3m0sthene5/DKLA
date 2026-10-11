#!/usr/bin/env python3
"""Deduplicate effective connection prose for bounded, human accuracy screening.

Every grouped edge retains its endpoints and default effective text hash. This
inventory is not itself a review or a finding of legal correctness.
"""
import argparse
import collections
import json
from pathlib import Path
import explanation_inventory as e


def grouped():
    graph, nodes, data, full, origins, applied = e.effective()
    groups = {}
    for edge in graph['edges']:
        prose = edge.get('explanation')
        if not prose:
            continue
        item = groups.setdefault(prose, dict(text=prose, textSha256=e.sha(prose), edges=[]))
        endpoints = []
        for name in ('source', 'target'):
            nid = edge[name]
            node = nodes.get(nid, {})
            endpoints.append(dict(id=nid, title=node.get('title', nid), kind=node.get('kind'), courses=node.get('courses', []), briefId=data['map'].get(nid)))
        item['edges'].append(dict(id=edge['id'], label=edge.get('label'), source=endpoints[0], target=endpoints[1]))
    result = []
    for index, item in enumerate(groups.values()):
        item['index'] = index
        # Every LRS-connected edge is assigned to the independent LRS reviewer;
        # duplicates in other courses retain their endpoints in the same group.
        item['reviewPartition'] = 'lrs' if any('Legislation and the Regulatory State' in endpoint['courses'] for edge in item['edges'] for endpoint in (edge['source'], edge['target'])) else 'contracts-civil-other'
        result.append(item)
    return dict(schemaVersion=1, generatedAt='2026-10-11', scope='Effective connection explanation inventory; grouping is mechanical, substantive screening is recorded separately.',
                counts=dict(edges=sum(len(r['edges']) for r in result), distinctExplanations=len(result), words=sum(len(r['text'].split()) for r in result), partitions=dict(collections.Counter(r['reviewPartition'] for r in result))), records=result)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--pack', choices=['lrs', 'contracts-civil-other'])
    parser.add_argument('--compact', action='store_true', help='Print grouped endpoints once, retaining each edge ID.')
    parser.add_argument('start', nargs='?', type=int, default=0)
    parser.add_argument('end', nargs='?', type=int, default=30)
    args = parser.parse_args()
    inventory = grouped()
    if args.write:
        (e.ROOT / 'tools/v25/connection-inventory.json').write_bytes((json.dumps(inventory, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    if args.pack:
        records = [r for r in inventory['records'] if r['reviewPartition'] == args.pack]
        for local, r in enumerate(records[args.start:args.end], args.start):
            print(f"\n{local} [global {r['index']} / {r['textSha256'][:10]}] {r['text']}")
            if args.compact:
                pairs = {}
                for edge in r['edges']:
                    pair = (edge['source']['id'], edge['target']['id'])
                    pairs.setdefault(pair, []).append(edge['id'])
                for pair, ids in pairs.items():
                    print('  ' + ','.join(ids) + ' | ' + ' -> '.join(pair))
                continue
            for edge in r['edges']:
                print(f"  {edge['id']} | {edge['label']} | {edge['source']['id']} ({edge['source']['title']}) -> {edge['target']['id']} ({edge['target']['title']})")
    else:
        print(json.dumps(inventory['counts'], indent=2))
