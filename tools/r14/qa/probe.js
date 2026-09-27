// probe.js WxH node:<id>|scope:<name> <wheel ticks, +in/-out> <label key regex>: prints label states, blockers and drawn cards
const {chromium} = require('playwright-core');
const [vp, target, ticks, re] = process.argv.slice(2); const [W, H] = vp.split('x').map(Number); const rx = new RegExp(re || '.');
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--no-sandbox']});
  const page = await browser.newPage({viewport: {width: W, height: H}});
  await page.goto('file://' + require('path').resolve(__dirname, '../../../DKLA-r8.html'), {waitUntil: 'load'});
  await page.waitForFunction(() => window.LegalAtlas && document.querySelector('#geoCanvas').children.length > 0, null, {timeout: 120000});
  const box = await page.locator('#geoCanvas').boundingBox(); const cx = box.x + box.width * .5, cy = box.y + box.height * .5;
  const [kind, id] = target.split(':'); if (kind === 'node') await page.evaluate(i => window.LegalAtlas.navigate('node', i), id); else if (id !== 'Atlas') await page.evaluate(s => window.LegalAtlas.navigate('scope', s), id);
  await page.waitForTimeout(1600);
  const n = +ticks || 0; for (let i = 0; i < Math.abs(n); i++) { await page.mouse.move(cx, cy); await page.mouse.wheel(0, n > 0 ? -120 : 120); await page.waitForTimeout(150); }
  await page.waitForTimeout(800);
  const r = await page.evaluate(src => { const rx = new RegExp(src); const z = window.LegalAtlas.geography().view.z; const out = {z, labels: [], cards: 0};
    for (const [k, s] of R11.labelState) if (rx.test(k) && s.o > .01) out.labels.push([k, +s.o.toFixed(2), R11.blockedBy.get(k) || '', s.box && [s.box.x|0, s.box.y|0, s.box.w|0, s.box.h|0]]);
    out.cards = document.querySelectorAll('#geoCanvas .node-card').length; out.modes = [...R11.modes].filter(([k]) => rx.test(k));
    return out; }, re || '.');
  console.log(JSON.stringify(r).slice(0, 2500));
  await page.screenshot({path: `qa/probe-${vp}.png`});
  await browser.close();
})();
