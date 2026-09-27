// Continuity: sample label sets every third of a wheel tick through each course; report labels that appear then vanish within one tick, and size jumps.
const {chromium} = require('playwright-core'); const path = require('path'); const fs = require('fs');
const out = path.join(__dirname, 'cont-shots'); fs.mkdirSync(out, {recursive: true});
const COURSES = [['Contracts', 'K'], ['Civil Procedure', 'CP'], ['Legislation and the Regulatory State', 'LRS']];
const MEASURE = () => { const svg = document.getElementById('geoCanvas'); const vb = svg.getBoundingClientRect(); const z = window.LegalAtlas.geography().view.z; const o = {};
  const opacityOf = el => { let v = 1; for (let e = el; e && e !== svg; e = e.parentElement) { const a = e.getAttribute('opacity'); if (a != null) v *= +a; if (e.style && e.style.opacity) v *= +e.style.opacity; } return v; };
  for (const t of svg.querySelectorAll('text')) { const r = t.getBoundingClientRect(); if (r.width < 2 || r.bottom < vb.top || r.top > vb.bottom || r.right < vb.left || r.left > vb.right) continue; const op = opacityOf(t); if (op < .3) continue; const k = t.textContent.trim().slice(0, 40); o[k] = +(+t.getAttribute('font-size') * z).toFixed(1); }
  return {z, labels: o}; };
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--no-sandbox']});
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  await page.goto('file://' + require('path').resolve(__dirname, '../../../DKLA-r8.html'), {waitUntil: 'load'});
  await page.waitForFunction(() => window.LegalAtlas && document.querySelector('#geoCanvas').children.length > 0, null, {timeout: 120000});
  const box = await page.locator('#geoCanvas').boundingBox(); const cx = box.x + box.width * .5, cy = box.y + box.height * .5;
  const all = {};
  for (const [course, tag] of COURSES) {
    await page.evaluate(s => window.LegalAtlas.navigate('scope', s), course); await page.waitForTimeout(1400);
    // anchor the cursor on a real subject so the sweep lands on content
    const anchor = await page.evaluate(() => { const els = [...document.querySelectorAll('#geoCanvas path[data-map-region]')].map(p => p.getBoundingClientRect()).filter(r => r.width > 20); const r = els[Math.floor(els.length / 2)]; return {x: r.x + r.width / 2, y: r.y + r.height / 2}; });
    await page.mouse.move(anchor.x, anchor.y);
    const seq = [];
    for (let i = 0; i <= 33; i++) { if (i) { await page.mouse.wheel(0, -40); await page.waitForTimeout(120); } await page.waitForTimeout(450); const m = await page.evaluate(MEASURE); seq.push(m); if (i % 3 === 0 || (i >= 9 && i <= 18)) await page.screenshot({path: path.join(out, `${tag}-s${String(i).padStart(2, '0')}-z${m.z.toFixed(3)}.png`)}); }
    // flicker: labels present at step i, absent at i+1, present again at i+2; pops: labels present for only 1-2 samples; jumps: font-size ratio > 1.8 between adjacent samples
    const flick = [], short = [], jumps = [];
    const names = new Set(); seq.forEach(s => Object.keys(s.labels).forEach(n => names.add(n)));
    for (const n of names) { const pres = seq.map(s => n in s.labels); for (let i = 0; i + 2 < pres.length; i++) if (pres[i] && !pres[i + 1] && pres[i + 2]) flick.push([n, i, seq[i].z.toFixed(3)]);
      const runs = []; let run = 0; for (let i = 0; i < pres.length; i++) { if (pres[i]) run++; else { if (run) runs.push(run); run = 0; } } if (run) runs.push(run); if (runs.some(r => r <= 1) && runs.length) short.push([n, runs.join('/')]);
      for (let i = 0; i + 1 < seq.length; i++) { const a = seq[i].labels[n], b = seq[i + 1].labels[n]; if (a && b && (b / a > 1.6 || a / b > 1.6)) jumps.push([n, i, a, b, seq[i].z.toFixed(3), seq[i + 1].z.toFixed(3)]); } }
    const counts = seq.map(s => Object.keys(s.labels).length);
    console.log(tag, 'z', seq[0].z.toFixed(3), '->', seq[seq.length - 1].z.toFixed(3), 'label counts per third-tick:', counts.join(' '));
    console.log(tag, 'flicker (present/absent/present within 2/3 tick):', flick.length, JSON.stringify(flick.slice(0, 8)));
    console.log(tag, 'one-sample labels:', short.length, JSON.stringify(short.slice(0, 8)));
    console.log(tag, 'font-size jumps >1.6x between adjacent samples:', jumps.length, JSON.stringify(jumps.slice(0, 8)));
    all[tag] = {seq: seq.map(s => ({z: s.z, n: Object.keys(s.labels).length})), flick, short, jumps};
  }
  fs.writeFileSync(path.join(out, 'continuity.json'), JSON.stringify(all, null, 1));
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
