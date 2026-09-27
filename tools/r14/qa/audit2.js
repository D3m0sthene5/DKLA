// Finer overlap/overflow/tiny-text audit: every wheel tick, three viewports, plus selected-entry states zoomed out with ribbons.
const {chromium} = require('playwright-core'); const path = require('path'); const fs = require('fs');
const out = path.join(__dirname, 'audit-shots'); fs.mkdirSync(out, {recursive: true});
const VIEWPORTS = [[1440, 900], [2000, 1084], [400, 800]];
const COURSES = ['Contracts', 'Civil Procedure', 'Legislation and the Regulatory State'];
const NODES = ['hamer', 'cp-mallory', 'lrs-s-yakus'];
const MEASURE = () => {
  const svg = document.getElementById('geoCanvas'); const vb = svg.getBoundingClientRect();
  const texts = []; const boxes = [];
  const opacityOf = el => { let o = 1; for (let e = el; e && e !== svg; e = e.parentElement) { const a = e.getAttribute('opacity'); if (a != null) o *= +a; const s = e.style && e.style.opacity; if (s) o *= +s; const fo = e.getAttribute('fill-opacity'); if (fo != null && e.tagName === 'text') o *= +fo; } return o; };
  const z = window.LegalAtlas.geography().view.z;
  for (const t of svg.querySelectorAll('text')) { const op = opacityOf(t); if (op < .35) continue; const r = t.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < vb.top || r.top > vb.bottom || r.right < vb.left || r.left > vb.right) continue;
    const cls = t.className.baseVal || '';
    const key = t.closest('g[data-map-region]') ? 'region' : cls.includes('region-title') ? 'title' : cls.includes('zone-title') ? 'zone' : cls.includes('ribbon-end') ? 'ribbon' : 'text';
    const fs = +t.getAttribute('font-size') * z;
    texts.push({text: t.textContent.trim().slice(0, 48), x: r.left, y: r.top, w: r.width, h: r.height, fs, cls: key, op, fill: t.getAttribute('fill') || getComputedStyle(t).fill}); }
  for (const p of svg.querySelectorAll('path[data-map-region]')) { const r = p.getBoundingClientRect(); boxes.push({id: p.dataset.mapRegion, x: r.left, y: r.top, w: r.width, h: r.height, kind: 'region', fill: p.getAttribute('fill'), fo: p.getAttribute('fill-opacity')}); }
  for (const p of svg.querySelectorAll('rect[data-map-district]')) { const r = p.getBoundingClientRect(); boxes.push({id: p.dataset.mapDistrict, x: r.left, y: r.top, w: r.width, h: r.height, kind: 'district'}); }
  const v = window.LegalAtlas.geography().view;
  return {texts, boxes, z: v.z, scope: v.scope, ribbons: svg.querySelectorAll('.ribbon-end').length};
};
const inter = (a, b, pad = 0) => a.x + a.w - pad > b.x && a.x + pad < b.x + b.w && a.y + a.h - pad > b.y && a.y + pad < b.y + b.h;
const inside = (t, b, slack = 2) => t.x >= b.x - slack && t.y >= b.y - slack && t.x + t.w <= b.x + b.w + slack && t.y + t.h <= b.y + b.h + slack;
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--no-sandbox']});
  const report = []; let totalOverlaps = 0, totalOverflow = 0, totalTiny = 0;
  const analyse = (m, tag) => {
    const overlaps = [], overflow = [], tiny = [];
    for (let i = 0; i < m.texts.length; i++) { const a = m.texts[i]; if (a.fs < 9.5 && a.fs > 0) tiny.push(a.text + ' @' + a.fs.toFixed(1) + 'px');
      for (let j = i + 1; j < m.texts.length; j++) { const b = m.texts[j]; if (inter(a, b, 1)) overlaps.push([a.text, b.text]); } }
    for (const t of m.texts) { const hosts = m.boxes.filter(b => b.kind === 'region' && inter(t, b, 0)); for (const b of hosts) if (!inside(t, b, 3) && t.cls !== 'zone' && t.cls !== 'ribbon' && !(t.cls === 'title' && t.y < b.y)) overflow.push([t.text, b.id]); }
    const clipped = m.texts.filter(t => t.x < 0 || t.x + t.w > 1e9).length;
    report.push({tag, z: m.z, texts: m.texts.length, ribbons: m.ribbons, overlaps, overflow, tiny, names: m.texts.map(t => t.text), minFs: Math.min(...m.texts.map(t => t.fs).filter(f => f > 0)), fills: m.boxes.filter(b => b.kind === 'region').slice(0, 3).map(b => b.fill + '/' + b.fo)});
    totalOverlaps += overlaps.length; totalOverflow += overflow.length; totalTiny += tiny.length;
    console.log(tag.padEnd(58), 'texts', String(m.texts.length).padStart(3), 'ovl', String(overlaps.length).padStart(3), 'ovf', String(overflow.length).padStart(3), 'tiny', String(tiny.length).padStart(2), 'rib', m.ribbons, overlaps.length ? JSON.stringify(overlaps.slice(0, 2)) : '', tiny.length ? tiny.slice(0, 2).join('; ') : '');
    return overlaps.length || overflow.length || tiny.length;
  };
  for (const [W, H] of VIEWPORTS) {
    const page = await browser.newPage({viewport: {width: W, height: H}});
    await page.goto('file://' + require('path').resolve(__dirname, '../../../DKLA-r8.html'), {waitUntil: 'load'});
    await page.waitForFunction(() => window.LegalAtlas && document.querySelector('#geoCanvas').children.length > 0, null, {timeout: 120000});
    const box = await page.locator('#geoCanvas').boundingBox(); const cx = box.x + box.width * .5, cy = box.y + box.height * .5;
    const states = [['Atlas', null]]; for (const c of COURSES) states.push([c, c]);
    for (const [label, scope] of states) {
      if (scope) await page.evaluate(s => window.LegalAtlas.navigate('scope', s), scope); else await page.evaluate(() => window.DKLA.overview());
      await page.waitForTimeout(1400);
      const ticks = scope ? 12 : 3;
      for (let step = 0; step <= ticks; step++) {
        if (step) { await page.mouse.move(cx, cy); await page.mouse.wheel(0, -120); await page.waitForTimeout(150); }
        await page.waitForTimeout(600);
        const m = await page.evaluate(MEASURE);
        const tag = `${W}x${H} ${label.slice(0, 11)} t${String(step).padStart(2, '0')} z=${m.z.toFixed(3)}`;
        if (analyse(m, tag)) await page.screenshot({path: path.join(out, `${W}x${H}-${label.replace(/\s+/g, '_').slice(0, 11)}-t${step}.png`)});
      }
    }
    // selected entries with ribbons, zooming out tick by tick
    for (const id of NODES) {
      await page.evaluate(i => window.LegalAtlas.navigate('node', i), id); await page.waitForTimeout(1600);
      for (let step = 0; step <= 9; step++) {
        if (step) { await page.mouse.move(cx, cy); await page.mouse.wheel(0, 120); await page.waitForTimeout(150); }
        await page.waitForTimeout(600);
        const m = await page.evaluate(MEASURE);
        const tag = `${W}x${H} sel:${id} out${String(step).padStart(2, '0')} z=${m.z.toFixed(3)}`;
        if (analyse(m, tag)) await page.screenshot({path: path.join(out, `${W}x${H}-sel-${id}-out${step}.png`)});
      }
    }
    await page.close();
  }
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
  console.log('TOTAL overlaps', totalOverlaps, 'overflow', totalOverflow, 'tiny', totalTiny);
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
