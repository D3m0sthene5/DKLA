// Validate and render a candidate icon.  usage: node cand.cjs <dir>
// <dir> holds cand.svg (inner SVG markup for a 24x24 viewBox) and color.txt (hex). Writes <dir>/view.png and <dir>/check.json.
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const dir = process.argv[2];
const svg = fs.readFileSync(path.join(dir, 'cand.svg'), 'utf8').trim();
const color = fs.existsSync(path.join(dir, 'color.txt')) ? fs.readFileSync(path.join(dir, 'color.txt'), 'utf8').trim() : '#ee9138';
const problems = [];
if (/<\s*(text|tspan|image|script|style|foreignObject|use|defs|linearGradient|radialGradient|filter|mask|clipPath)\b/i.test(svg)) problems.push('forbidden element (text/image/use/defs/gradient/mask/clipPath/style/script)');
if (/\bid\s*=/.test(svg)) problems.push('no id attributes allowed');
if (/(href|xlink)/i.test(svg)) problems.push('no links');
if (/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/.test(svg)) problems.push('one colour only: use currentColor, never hex/rgb');
if (/<\s*svg\b/i.test(svg)) problems.push('give the inner markup only, not an <svg> wrapper');
const els = (svg.match(/<\s*(path|circle|ellipse|rect|line|polyline|polygon)\b/gi) || []).length;
if (els > 14) problems.push(`too many shapes (${els} > 14)`);
if (svg.length > 4500) problems.push(`markup too long (${svg.length} > 4500 chars)`);
if (!els) problems.push('no shapes');
const wrap = (px) => `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" style="color:${color}">${svg}</svg>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 520, height: 260 } });
  await p.setContent(`<body style="margin:0;background:#141c24"><div style="display:flex;align-items:flex-end;gap:18px;padding:16px;width:max-content;background:#1a242d;border:1px solid #2a3742;border-radius:10px;margin:8px" id="t">${wrap(200)}<div style="display:flex;flex-direction:column;gap:12px;align-items:center">${wrap(48)}${wrap(34)}</div></div>`);
  const info = await p.evaluate(() => { const s = document.querySelector('svg'); const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); while (s.firstChild) g.appendChild(s.firstChild); s.appendChild(g); const bb = g.getBBox(); return { x: bb.x, y: bb.y, w: bb.width, h: bb.height }; });
  if (info.x < -1 || info.y < -1 || info.x + info.w > 25 || info.y + info.h > 25) problems.push(`drawing leaves the 24x24 box (bbox ${JSON.stringify(info)})`);
  if (info.w < 11 && info.h < 11) problems.push('icon is tiny inside the box: fill the 24x24 space');
  await (await p.$('#t')).screenshot({ path: path.join(dir, 'view.png') });
  await b.close();
  const jury = path.join(dir, '..', '..', 'jury'); if (fs.existsSync(jury)) fs.copyFileSync(path.join(dir, 'view.png'), path.join(jury, path.basename(path.resolve(dir)) + '.png'));
  fs.writeFileSync(path.join(dir, 'check.json'), JSON.stringify({ ok: !problems.length, problems, shapes: els, bbox: info }));
  console.log(problems.length ? 'PROBLEMS: ' + problems.join('; ') : `OK (${els} shapes). View: ${path.join(dir, 'view.png')}`);
})();
