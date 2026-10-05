#!/usr/bin/env python3
"""Validate a converted batch: python3 check_conv.py conv/out/bNN.json"""
import json, sys, re
from pathlib import Path
out = Path(sys.argv[1]); batch = json.loads((out.parent.parent / 'batches' / out.name).read_text())
KEYS = ['Parties', 'Procedural History', 'Material Facts', 'Issue', 'Holding', 'Reasoning']
RANGE = {'Parties': (20, 130), 'Procedural History': (25, 190), 'Material Facts': (60, 260), 'Issue': (12, 110), 'Holding': (30, 180), 'Reasoning': (90, 340)}
try: data = json.loads(out.read_text())
except Exception as e: print('NOT VALID JSON:', e); sys.exit(1)
bad = 0
for it in batch:
    e = data.get(it['atlas_id'])
    if not isinstance(e, dict): print('MISSING', it['atlas_id']); bad += 1; continue
    probs = []
    if e.get('codex_id') != it['codex_id']: probs.append('codex_id must be ' + it['codex_id'])
    r = e.get('rule', '')
    if not isinstance(r, str) or not (8 <= len(r.split()) <= 48): probs.append(f"rule must be one sentence of 8-48 words (has {len(str(r).split())})")
    s = e.get('sections')
    if not isinstance(s, dict) or list(s.keys()) != KEYS: probs.append('sections must have exactly these keys in this order: ' + ', '.join(KEYS))
    else:
        for k in KEYS:
            v = s[k]; n = len(v.split()) if isinstance(v, str) else 0
            lo, hi = RANGE[k]
            if not (lo <= n <= hi): probs.append(f'{k}: {n} words, want {lo}-{hi}')
            if isinstance(v, str) and re.search(r'[#*_`]{2}|^#|^\s*[-*] ', v, re.M): probs.append(f'{k}: plain prose only, no markdown')
    if probs: bad += 1; print(it['atlas_id'] + ': ' + '; '.join(probs))
extra = set(data) - {it['atlas_id'] for it in batch}
if extra: print('UNEXPECTED KEYS', sorted(extra)); bad += 1
print(f'{len(batch)} expected, {bad} with problems'); sys.exit(1 if bad else 0)
