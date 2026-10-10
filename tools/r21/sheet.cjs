// Contact sheet of candidate icons, numbered, no captions: node sheet.cjs out.png dir1 dir2 ...
// Each dir holds cand.svg (or current.svg when there is no candidate yet) and color.txt.
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const [out, ...dirs] = process.argv.slice(2);
const wrap = (svg, px, c) => `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" style="color:${c}">${svg}</svg>`;
(async () => {
  const cells = dirs.map((d, i) => {
    const f = fs.existsSync(path.join(d, 'cand.svg')) ? 'cand.svg' : 'current.svg';
    const svg = fs.readFileSync(path.join(d, f), 'utf8'), c = fs.existsSync(path.join(d, 'color.txt')) ? fs.readFileSync(path.join(d, 'color.txt'), 'utf8').trim() : '#ee9138';
    return `<div class="c"><div class="n">${i + 1}</div><div class="r">${wrap(svg, 150, c)}<div class="s">${wrap(svg, 48, c)}${wrap(svg, 34, c)}</div></div></div>`;
  }).join('');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 800 } });
  await p.setContent(`<body style="margin:0;background:#141c24"><style>.g{display:grid;grid-template-columns:repeat(3,auto);gap:14px;padding:14px;width:max-content}.c{background:#1a242d;border:1px solid #2a3742;border-radius:10px;padding:10px 12px;font:600 15px sans-serif;color:#9fb0bd}.r{display:flex;align-items:flex-end;gap:14px}.s{display:flex;flex-direction:column;gap:10px;align-items:center}.n{margin-bottom:6px}</style><div class="g">${cells}</div></body>`);
  await (await p.$('.g')).screenshot({ path: out }); await b.close();
})();
