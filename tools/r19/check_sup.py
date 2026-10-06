#!/usr/bin/env python3
"""Validate a converted supporting-case batch: python3 check_sup.py sup/out/sNN.json"""
import json, sys, re
from pathlib import Path
out = Path(sys.argv[1]); batch = json.loads((out.parent.parent / 'batches' / out.name).read_text())
KEYS = ['Parties', 'Procedural History', 'Material Facts', 'Issue', 'Holding', 'Reasoning']
RANGE = {'Parties': (8, 130), 'Procedural History': (8, 190), 'Material Facts': (25, 260), 'Issue': (8, 110), 'Holding': (12, 180), 'Reasoning': (40, 340)}
NONE = 'Not given in the brief.'
try: data = json.loads(out.read_text())
except Exception as e: print('NOT VALID JSON:', e); sys.exit(1)
bad = 0
for it in batch:
    e = data.get(it['codex_id'])
    if not isinstance(e, dict): print('MISSING', it['codex_id']); bad += 1; continue
    if 'skip' in e:
        if not (isinstance(e['skip'], str) and 4 <= len(e['skip'].split()) <= 40) or set(e) != {'skip'}: print(it['codex_id'] + ': a skip entry is {"skip": "<one sentence>"} and nothing else'); bad += 1
        continue
    probs = []
    r = e.get('rule', '')
    if not isinstance(r, str) or not (8 <= len(r.split()) <= 48): probs.append(f"rule must be one sentence of 8-48 words (has {len(str(r).split())})")
    s = e.get('sections')
    if not isinstance(s, dict) or list(s.keys()) != KEYS: probs.append('sections must have exactly these keys in this order: ' + ', '.join(KEYS))
    else:
        if sum(1 for k in KEYS if s[k] == NONE) > 3: probs.append('more than three sections are "Not given in the brief." - use a skip entry or fill them from the brief')
        for k in KEYS:
            v = s[k]
            if v == NONE: continue
            n = len(v.split()) if isinstance(v, str) else 0; lo, hi = RANGE[k]
            if not (lo <= n <= hi): probs.append(f'{k}: {n} words, want {lo}-{hi}')
            if isinstance(v, str) and re.search(r'[#*_`]{2}|^#|^\s*[-*] ', v, re.M): probs.append(f'{k}: plain prose only, no markdown')
    if probs: bad += 1; print(it['codex_id'] + ': ' + '; '.join(probs))
extra = set(data) - {it['codex_id'] for it in batch}
if extra: print('UNEXPECTED KEYS', sorted(extra)); bad += 1
print(f'{len(batch)} expected, {bad} with problems'); sys.exit(1 if bad else 0)
