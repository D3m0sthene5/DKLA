// Before/after sheet: node compare.cjs out.png manifest.json dir1 dir2 ...  (dir holds current.svg, cand.svg, color.txt, brief.json)
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const [out, , ...dirs] = process.argv.slice(2);
const wrap = (svg, px, c) => `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" style="color:${c}">${svg}</svg>`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
(async () => {
  const rows = dirs.map(d => {
    const b = JSON.parse(fs.readFileSync(path.join(d, 'brief.json'), 'utf8')), c = fs.readFileSync(path.join(d, 'color.txt'), 'utf8').trim();
    const old = fs.readFileSync(path.join(d, 'current.svg'), 'utf8'), nw = fs.existsSync(path.join(d, 'cand.svg')) ? fs.readFileSync(path.join(d, 'cand.svg'), 'utf8') : '';
    return `<div class="row"><div class="lab"><b>${esc(path.basename(d))} ${esc(b.short)}</b><span>${esc(b.hook_caption_do_not_change)}</span></div><div class="ic">${wrap(old, 96, c)}${wrap(old, 34, c)}</div><div class="arrow">→</div><div class="ic">${wrap(nw, 96, c)}${wrap(nw, 34, c)}</div></div>`;
  }).join('');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  await p.setContent(`<body style="margin:0;background:#141c24;font:13px sans-serif;color:#b9c6d1"><style>.g{display:grid;grid-template-columns:repeat(2,auto);gap:10px 26px;padding:12px;width:max-content}.row{display:flex;align-items:center;gap:12px;background:#1a242d;border:1px solid #2a3742;border-radius:8px;padding:6px 10px}.lab{width:230px;display:flex;flex-direction:column;gap:3px}.lab b{color:#e6ecf1}.ic{display:flex;align-items:flex-end;gap:8px}.arrow{color:#6b7c8a;font-size:18px}</style><div class="g">${rows}</div></body>`);
  await (await p.$('.g')).screenshot({ path: out }); await b.close();
})();
