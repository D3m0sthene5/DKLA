// Overlap and overflow audit: for several viewports and a zoom sweep per course, measure every visible text element on the map
// and report text-on-text overlaps and text that escapes its own box. Usage: node audit.js [out-dir] [quick]
const {chromium} = require('playwright-core'); const path = require('path'); const fs = require('fs');
const out = process.argv[2] || path.join(__dirname, 'shots-audit'); fs.mkdirSync(out, {recursive: true});
const quick = process.argv[3] === 'quick';
const VIEWPORTS = quick ? [[2000, 1084]] : [[1440, 900], [2000, 1084], [2560, 1300], [1280, 720], [400, 800]];
const COURSES = ['Contracts', 'Civil Procedure', 'Legislation and the Regulatory State'];
const MEASURE = () => {
  const svg = document.getElementById('geoCanvas'); const vb = svg.getBoundingClientRect();
  const texts = []; const boxes = [];
  const opacityOf = el => { let o = 1; for (let e = el; e && e !== svg; e = e.parentElement) { const a = e.getAttribute('opacity'); if (a != null) o *= +a; const s = e.style && e.style.opacity; if (s) o *= +s; } return o; };
  for (const t of svg.querySelectorAll('text')) { const op = opacityOf(t); if (op < .35) continue; const r = t.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < vb.top || r.top > vb.bottom || r.right < vb.left || r.left > vb.right) continue;
    let owner = null; const g = t.closest('[data-map-region],[data-map-district],[data-map-node]'); if (g) owner = g.dataset.mapRegion || g.dataset.mapDistrict || g.dataset.mapNode;
    const key = t.closest('g[data-map-region]') ? 'region' : t.className.baseVal.includes('region-title') ? 'title' : t.className.baseVal.includes('zone-title') ? 'zone' : 'text';
    texts.push({text: t.textContent.trim().slice(0, 40), x: r.left, y: r.top, w: r.width, h: r.height, fs: +t.getAttribute('font-size') * (window.LegalAtlas.geography().view.z), cls: key, op}); }
  for (const p of svg.querySelectorAll('path[data-map-region]')) { const r = p.getBoundingClientRect(); boxes.push({id: p.dataset.mapRegion, x: r.left, y: r.top, w: r.width, h: r.height, kind: 'region'}); }
  for (const p of svg.querySelectorAll('rect[data-map-district]')) { const r = p.getBoundingClientRect(); boxes.push({id: p.dataset.mapDistrict, x: r.left, y: r.top, w: r.width, h: r.height, kind: 'district'}); }
  return {texts, boxes, z: window.LegalAtlas.geography().view.z, scope: window.LegalAtlas.geography().view.scope};
};
const inter = (a, b, pad = 0) => a.x + a.w - pad > b.x && a.x + pad < b.x + b.w && a.y + a.h - pad > b.y && a.y + pad < b.y + b.h;
const inside = (t, b, slack = 2) => t.x >= b.x - slack && t.y >= b.y - slack && t.x + t.w <= b.x + b.w + slack && t.y + t.h <= b.y + b.h + slack;
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--no-sandbox']});
  const report = []; let totalOverlaps = 0, totalOverflow = 0, totalTiny = 0;
  for (const [W, H] of VIEWPORTS) {
    const page = await browser.newPage({viewport: {width: W, height: H}});
    await page.goto('file://' + require('path').resolve(__dirname, '../../../DKLA-r8.html'), {waitUntil: 'load'});
    await page.waitForFunction(() => window.LegalAtlas && document.querySelector('#geoCanvas').children.length > 0, null, {timeout: 90000});
    const states = [['Atlas', null]]; for (const c of COURSES) states.push([c, c]);
    for (const [label, scope] of states) {
      if (scope) await page.evaluate(s => window.LegalAtlas.navigate('scope', s), scope); else await page.evaluate(() => window.DKLA.overview());
      await page.waitForTimeout(1300);
      const steps = scope ? (quick ? [0, 2, 4, 6, 8] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 10]) : [0];
      const box = await page.locator('#geoCanvas').boundingBox();
      for (const step of steps) {
        if (step) { await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5); await page.mouse.wheel(0, -120); await page.waitForTimeout(120); if (step % 2 === 0) await page.waitForTimeout(500); if (step % 2) continue; }
        await page.waitForTimeout(450);
        const m = await page.evaluate(MEASURE);
        const overlaps = [], overflow = [], tiny = [];
        for (let i = 0; i < m.texts.length; i++) { const a = m.texts[i]; if (a.fs < 9.5 && a.fs > 0) tiny.push(a.text + ' @' + a.fs.toFixed(1) + 'px');
          for (let j = i + 1; j < m.texts.length; j++) { const b = m.texts[j]; if (inter(a, b, 1)) overlaps.push([a.text, b.text]); } }
        // text belonging to a region must stay inside that region's box; any text inside a region box that belongs to another region is an overflow
        for (const t of m.texts) { const hosts = m.boxes.filter(b => b.kind === 'region' && inter(t, b, 0)); for (const b of hosts) if (!inside(t, b, 3) && (t.cls !== 'zone') && !(t.cls === 'title' && t.y < b.y)) { /* partially inside */ overflow.push([t.text, b.id]); } }
        const tag = `${W}x${H} ${label} step${step} z=${m.z.toFixed(3)}`;
        report.push({tag, texts: m.texts.length, overlaps, overflow, tiny});
        totalOverlaps += overlaps.length; totalOverflow += overflow.length; totalTiny += tiny.length;
        console.log(tag.padEnd(62), 'texts', String(m.texts.length).padStart(3), 'overlaps', String(overlaps.length).padStart(3), 'overflow', String(overflow.length).padStart(3), 'tiny', tiny.length, overlaps.length ? JSON.stringify(overlaps.slice(0, 2)) : '');
        if (overlaps.length || overflow.length) await page.screenshot({path: path.join(out, `${W}x${H}-${label.replace(/\s+/g, '_')}-${step}.png`)});
      }
    }
    await page.close();
  }
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
  console.log('TOTAL overlaps', totalOverlaps, 'overflow', totalOverflow, 'tiny', totalTiny);
  await browser.close();
})();
