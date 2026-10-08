#!/usr/bin/env python3
"""Build the r21 working set in a scratch directory: manifest.json, current/<id>.svg, triage sheets, reference sheets.
usage: manifest.py SCRATCH_DIR"""
import json, re, random, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
out = Path(sys.argv[1]); (out/'current').mkdir(parents=True, exist_ok=True)
h = (ROOT/'DKLA-r20.html').read_text(encoding='utf-8')
seed = json.loads(re.search(r'<script[^>]*id="seedData"[^>]*>(.*?)</script>', h, re.S).group(1))
icons = json.loads((ROOT/'tools/r18/icons.json').read_text(encoding='utf-8'))
states = json.loads((ROOT/'tools/r18/state-icons.json').read_text(encoding='utf-8'))['picked']
state_of = {v: k for k, v in states.items()}
ACC = {'Contracts': '#ee9138', 'Civil Procedure': '#67acf7', 'Legislation and the Regulatory State': '#5ebc7b'}
ni = {n['id']: n for n in seed['nodes']}
man = {}
for i, d in sorted(icons.items()):
    n = ni[i]; course = (n.get('courses') or ['Contracts'])[0]
    sec = n.get('sections') or {}
    lock = None
    if i in state_of and i != 'shoe': lock = f"state outline of {state_of[i]} (must stay a recognisable {state_of[i]} outline)"
    if i == 'lrs-n-standing-sffa': lock = 'Harvard: a bold H on a shield (not the three-book arms)'
    if i == 'lrs-k-dolan': lock = 'the only case allowed the USPS eagle'
    man[i] = dict(id=i, title=n['title'], short=n.get('shortTitle') or n['title'], course=course, color=ACC.get(course, '#ee9138'),
                  hook=d['hook'], object=d['object'], lock=lock,
                  facts=(sec.get('Material Facts') or n.get('summary') or '')[:700], holding=(sec.get('Holding') or '')[:350],
                  summary=n.get('summary') or '')
    (out/'current'/f'{i}.svg').write_text(d['svg'], encoding='utf-8')
(out/'manifest.json').write_text(json.dumps(man, indent=1, ensure_ascii=False), encoding='utf-8')
# triage sheets: shuffled, 8 per sheet, numbered
ids = sorted(man); random.Random(21).shuffle(ids)
(out/'triage').mkdir(exist_ok=True)
sheets = []
for k in range(0, len(ids), 8):
    chunk = ids[k:k+8]; name = f's{k//8:02d}'
    spec = dict(out=str(out/'triage'/f'{name}.png'), cols=4, items=[dict(svgFile=str(out/'current'/f'{i}.svg'), color=man[i]['color'], label=j+1) for j, i in enumerate(chunk)])
    (out/'triage'/f'{name}.json').write_text(json.dumps(spec))
    subprocess.run(['node', str(Path(__file__).with_name('render.cjs')), str(out/'triage'/f'{name}.json')], check=True)
    sheets.append(dict(name=name, png=spec['out'], ids=chunk))
(out/'triage'/'sheets.json').write_text(json.dumps(sheets, indent=1))
# reference sheet
ref = ['hamer', 'wwvw', 'burger', 'cp-byrd', 'greenfield', 'cp-zippo', 'alaska-packers', 'shoe']
spec = dict(out=str(out/'ref-great.png'), cols=4, items=[dict(svgFile=str(out/'current'/f'{i}.svg'), color=man[i]['color'], label=man[i]['short'][:22]) for i in ref])
(out/'ref.json').write_text(json.dumps(spec)); subprocess.run(['node', str(Path(__file__).with_name('render.cjs')), str(out/'ref.json')], check=True)
print(len(man), 'icons;', len(sheets), 'sheets')
