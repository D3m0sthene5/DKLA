#!/usr/bin/env python3
"""Check curated geography or print a bounded placement audit inventory."""
import argparse
import itertools
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/v25'))
import geography_build as builder


def absolute(o,g):
    out=dict(o);a=g['anchors'][o['anchor']]
    out['x']+=a['x'];out['y']+=a['y']
    return out


def overlap(a,b,gap=0):
    return a['x']<b['x']+b['w']+gap and b['x']<a['x']+a['w']+gap and a['y']<b['y']+b['h']+gap and b['y']<a['y']+a['h']+gap


def check(g):
    issues=[]
    homes={k:absolute(v,g) for k,v in g['homes'].items()}
    districts={k:absolute(v,g) for k,v in g['districts'].items()}
    regions={r['id']:absolute(r,g) for r in g['regions']}
    graph,nodes=builder.baseline()
    expected=set(nodes)-set(g['excludedPracticeIds'])
    if set(homes)!=expected:issues.append('Visible node/home coverage mismatch: '+str(sorted(set(homes)^expected)))
    if set(homes)!=set(g['placements']):issues.append('Placement/home coverage mismatch')
    if len(g['audit']['nodeReviews'])!=len(homes) or {x['id'] for x in g['audit']['nodeReviews']}!=set(homes):issues.append('Node audit coverage mismatch')
    for nid,h in homes.items():
        d=districts[h['district']];r=regions[h['region']];p=g['placements'][nid]
        if p['district']!=h['district'] or p['region']!=h['region'] or d['region']!=h['region']:issues.append(nid+': inconsistent topic classification')
        if h['x']<d['x'] or h['y']<d['y']+d.get('headerH',91) or h['x']+h['w']>d['x']+d['w']+1 or h['y']+h['h']>d['y']+d['h']+1:issues.append(nid+': card leaves district or overlaps its header')
        if h['x']<r['x'] or h['y']<r['y']+155 or h['x']+h['w']>r['x']+r['w']+1 or h['y']+h['h']>r['y']+r['h']+1:issues.append(nid+': card leaves subject or overlaps subject heading')
    for (aid,a),(bid,b) in itertools.combinations(homes.items(),2):
        if overlap(a,b,4):issues.append(aid+' overlaps '+bid)
    for (aid,a),(bid,b) in itertools.combinations(districts.items(),2):
        if overlap(a,b):issues.append('District overlap: '+aid+' / '+bid)
    for (aid,a),(bid,b) in itertools.combinations(regions.items(),2):
        if overlap(a,b):issues.append('Region overlap: '+aid+' / '+bid)
    for did,d in districts.items():
        r=regions[d['region']]
        if d['x']<r['x'] or d['y']<r['y']+145 or d['x']+d['w']>r['x']+r['w']+1 or d['y']+d['h']>r['y']+r['h']+1:issues.append('District outside region: '+did)
    if issues:raise ValueError('\n'.join(issues))
    return dict(ok=True,**g['audit']['counts'],scope='Visible effective graph coverage, containment, four-unit card clearance, region/district overlaps; no legal-truth claim.')


if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--inventory',choices=['regions','districts','nodes','revisions']);ap.add_argument('--course');ap.add_argument('--district');ap.add_argument('--offset',type=int,default=0);ap.add_argument('--limit',type=int,default=30);ap.add_argument('--check',action='store_true');args=ap.parse_args()
    g=json.loads((ROOT/'tools/v25/geography.json').read_text(encoding='utf-8'))
    if args.check or not args.inventory:
        if g!=builder.build():raise ValueError('Geography source/data drift; regenerate and review the changed placements.')
        print(json.dumps(check(g),ensure_ascii=False))
    else:
        key={'regions':'regionReviews','districts':'districtReviews','nodes':'nodeReviews'}.get(args.inventory)
        rows=g['audit'][key] if key else g['revisions']
        if args.course:
            region_ids={r['id'] for r in g['regions'] if r['anchor']==args.course}
            rows=[r for r in rows if r.get('region',r.get('id')) in region_ids or r.get('course')==args.course]
        if args.district:rows=[r for r in rows if r.get('district',r.get('id'))==args.district]
        offset=max(0,args.offset);limit=max(1,min(100,args.limit))
        print(json.dumps(dict(total=len(rows),offset=offset,limit=limit,records=rows[offset:offset+limit]),ensure_ascii=False,indent=2))
