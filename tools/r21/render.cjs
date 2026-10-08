// Render icon SVG inner markup the way the atlas draws it (24x24 viewBox, stroke currentColor 1.35, round caps)
// usage: node render.js spec.json   spec = {out, cols, bg, items:[{svg|svgFile, color, label}], small, big}
const fs = require('fs');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const small = spec.small || 36, big = spec.big || 150, cols = spec.cols || 5, bg = spec.bg || '#141c24';
const wrap = (inner, px, color) => `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" style="color:${color}">${inner}</svg>`;
(async () => {
  const cells = spec.items.map((it, i) => {
    const inner = it.svg !== undefined ? it.svg : fs.readFileSync(it.svgFile, 'utf8');
    const col = it.color || '#ee9138';
    const num = it.label !== undefined ? `<div class="n">${it.label}</div>` : '';
    return `<div class="c">${num}<div class="r"><div class="b">${wrap(inner, big, col)}</div><div class="s">${wrap(inner, small, col)}</div></div></div>`;
  }).join('');
  const html = `<html><body style="margin:0;background:${bg}"><style>
  .g{display:grid;grid-template-columns:repeat(${cols},auto);gap:14px;padding:14px;width:max-content}
  .c{background:#1a242d;border:1px solid #2a3742;border-radius:10px;padding:10px 12px;font:600 15px sans-serif;color:#9fb0bd}
  .r{display:flex;align-items:flex-end;gap:14px}.n{margin-bottom:6px}
  </style><div class="g">${cells}</div></body></html>`;
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const p = await b.newPage({ viewport: { width: 1600, height: 800 }, deviceScaleFactor: 1 });
  await p.setContent(html);
  const el = await p.$('.g');
  await el.screenshot({ path: spec.out });
  await b.close();
})();
