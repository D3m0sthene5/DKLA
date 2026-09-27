// Stepped zoom: wheel notches over the map should land on the four levels and nowhere else.
const {chromium} = require('playwright-core');
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--no-sandbox']});
  const page = await browser.newPage({viewport: {width: 2000, height: 1084}});
  await page.goto('file://' + require('path').resolve(__dirname, '../../../DKLA-r8.html'), {waitUntil: 'load'});
  await page.waitForFunction(() => window.LegalAtlas && document.querySelector('#geoCanvas').children.length > 0, null, {timeout: 120000}); await page.waitForTimeout(1500);
  const state = async () => page.evaluate(() => { const v = window.LegalAtlas.geography().view; return `z=${v.z.toFixed(3)} scope=${v.scope} region=${v.region || '-'} district=${v.district || '-'} level=${R11.level().lvl}`; });
  console.log('start      ', await state());
  // wheel over the Contracts cluster: one notch = one level
  const at = await page.evaluate(() => { const r = document.querySelector('#geoCanvas path[data-map-region="consideration"]').getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; });
  await page.mouse.move(at.x, at.y);
  for (let i = 1; i <= 4; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(1300); const c = await page.evaluate(() => { const r = document.querySelector('#geoCanvas path[data-map-region="consideration"]')?.getBoundingClientRect(); return r ? {x: r.x + r.width / 2, y: r.y + r.height / 2} : null; }); if (c) await page.mouse.move(Math.max(80, Math.min(1900, c.x)), Math.max(120, Math.min(1000, c.y))); console.log('in notch', i, await state()); await page.screenshot({path: `qa/steps-in${i}.png`}); }
  // a trackpad flick of many small deltas is still one step
  await page.evaluate(() => window.LegalAtlas.navigate('scope', 'Contracts')); await page.waitForTimeout(1200); await page.mouse.move(at.x, at.y);
  for (let k = 0; k < 12; k++) { await page.mouse.wheel(0, -15); await page.waitForTimeout(20); } await page.waitForTimeout(1300); console.log('flick      ', await state());
  for (let i = 1; i <= 3; i++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(1300); console.log('out notch', i, await state()); }
  await page.evaluate(() => zoom(1.6)); await page.waitForTimeout(1300); console.log('+ button   ', await state());
  await page.keyboard.down('Alt'); await page.mouse.move(at.x, at.y); await page.mouse.wheel(0, -100); await page.keyboard.up('Alt'); await page.waitForTimeout(600); console.log('alt+wheel  ', await state());
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
