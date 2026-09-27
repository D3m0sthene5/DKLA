// Which label blocked which: replays the continuity sweep and, for every label that is present, absent, present across three samples, prints the blocker at the absent sample.
const {chromium} = require('playwright-core');
const COURSES = [['Contracts', 'K'], ['Civil Procedure', 'CP'], ['Legislation and the Regulatory State', 'LRS']];
const only = process.argv[2];
const MEASURE = () => { const z = window.LegalAtlas.geography().view.z; const st = {}; for (const [k, s] of R11.labelState) st[k] = +s.o.toFixed(2); const bb = {}; for (const [k, v] of R11.blockedBy) bb[k] = v; return {z, st, bb}; };
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--no-sandbox']});
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  await page.goto('file://' + require('path').resolve(__dirname, '../../../DKLA-r8.html'), {waitUntil: 'load'});
  await page.waitForFunction(() => window.LegalAtlas && document.querySelector('#geoCanvas').children.length > 0, null, {timeout: 120000});
  for (const [course, tag] of COURSES) {
    if (only && tag !== only) continue;
    await page.evaluate(s => window.LegalAtlas.navigate('scope', s), course); await page.waitForTimeout(1400);
    const anchor = await page.evaluate(() => { const els = [...document.querySelectorAll('#geoCanvas path[data-map-region]')].map(p => p.getBoundingClientRect()).filter(r => r.width > 20); const r = els[Math.floor(els.length / 2)]; return {x: r.x + r.width / 2, y: r.y + r.height / 2}; });
    await page.mouse.move(anchor.x, anchor.y);
    const seq = [];
    for (let i = 0; i <= 33; i++) { if (i) { await page.mouse.wheel(0, -40); await page.waitForTimeout(120); } await page.waitForTimeout(450); seq.push(await page.evaluate(MEASURE)); }
    const keys = new Set(); seq.forEach(s => Object.keys(s.st).forEach(k => keys.add(k)));
    const flick = [];
    for (const k of keys) { const pres = seq.map(s => (s.st[k] || 0) >= .3); for (let i = 0; i + 2 < pres.length; i++) if (pres[i] && !pres[i + 1] && pres[i + 2]) flick.push([k, i, seq[i].z.toFixed(3), 'o=' + [seq[i].st[k], seq[i + 1].st[k], seq[i + 2].st[k]].join('/'), 'blocked by ' + (seq[i + 1].bb[k] || (k in seq[i + 1].st ? 'nothing (not offered?)' : 'not offered'))]); }
    console.log(tag, 'flicker', flick.length); flick.slice(0, 14).forEach(f => console.log('  ', JSON.stringify(f)));
    // also: labels that were offered but blocked at each sample, counted
    console.log(tag, 'blocked counts per sample:', seq.map(s => Object.keys(s.bb).length).join(' '));
  }
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
