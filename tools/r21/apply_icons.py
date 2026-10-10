#!/usr/bin/env python3
"""Apply accepted icon redraws: python3 tools/r21/apply_icons.py accepted.json
accepted.json = {"<case id>": {"object": "...", "svgFile": "path/to/cand.svg"}, ...}
Writes the drawing and object into tools/r18/icons.json (the hook is never touched), keeps the replaced drawing under
`history` in tools/r18/brand-icons.json, then rebuilds DKLA-r18.html, points tools/r19/assemble.py at the new r18 hash
and rebuilds DKLA-r20.html."""
import json, re, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
acc = json.loads(Path(sys.argv[1]).read_text())
icons_p, brand_p = ROOT / 'tools/r18/icons.json', ROOT / 'tools/r18/brand-icons.json'
icons_raw, brand_raw = icons_p.read_text(encoding='utf-8'), brand_p.read_text(encoding='utf-8')
icons, brand = json.loads(icons_raw), json.loads(brand_raw)
for cid, a in acc.items():
    old = icons[cid]; svg = Path(a['svgFile']).read_text(encoding='utf-8').strip()
    assert svg and '<svg' not in svg and 'id=' not in svg, cid
    brand['history'].setdefault(cid, []).append({'object': old['object'], 'svg': old['svg']})
    icons[cid] = {'object': a['object'], 'hook': old['hook'], 'svg': svg}
svgs = [v['svg'] for v in icons.values()]
assert len(svgs) == len(set(svgs)), 'two cases would share a drawing'
icons_p.write_text(json.dumps(icons, ensure_ascii=False, indent=1) + ('\n' if icons_raw.endswith('\n') else ''), encoding='utf-8')
brand_p.write_text(json.dumps(brand, ensure_ascii=False, indent=1) + ('\n' if brand_raw.endswith('\n') else ''), encoding='utf-8')
subprocess.run([sys.executable, str(ROOT / 'tools/r18/assemble.py')], check=True, stdout=subprocess.DEVNULL)
sha = json.loads((ROOT / 'tools/r18/integrity.json').read_text())['r18_sha256']
a19 = ROOT / 'tools/r19/assemble.py'
a19.write_text(re.sub(r'EXPECTED_R18 = "[0-9a-f]+"', f'EXPECTED_R18 = "{sha}"', a19.read_text(encoding='utf-8')), encoding='utf-8')
subprocess.run([sys.executable, str(a19)], check=True, stdout=subprocess.DEVNULL)
print(f'{len(acc)} icons applied; r18 {sha[:12]}')
