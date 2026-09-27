// Fresh screenshots at the owner's viewport: the Atlas floor, each course at its fit and after 3, 6 and 9 wheel ticks in, plus one selected entry.
const {chromium} = require('playwright-core'); const path = require('path'); const fs = require('fs');
const out = path.join(__dirname, process.argv[2] || 'look'); fs.rmSync(out, {recursive: true, force: true}); fs.mkdirSync(out, {recursive: true});
const [W, H] = (process.argv[3] || '2000x1084').split('x').map(Number);
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--no-sandbox']});
  const page = await browser.newPage({viewport: {width: W, height: H}});
  await page.goto('file://' + require('path').resolve(__dirname, '../../../DKLA-r8.html'), {waitUntil: 'load'});
  await page.waitForFunction(() => window.LegalAtlas && document.querySelector('#geoCanvas').children.length > 0, null, {timeout: 120000});
  await page.waitForTimeout(1500);
  const shot = async name => { await page.screenshot({path: path.join(out, name + '.png')}); console.log(name, (await page.evaluate(() => window.LegalAtlas.geography().view.z)).toFixed(3)); };
  await shot('00-atlas');
  for (const [course, tag] of [['Contracts', 'K'], ['Civil Procedure', 'CP'], ['Legislation and the Regulatory State', 'LRS']]) {
    await page.evaluate(s => window.LegalAtlas.navigate('scope', s), course); await page.waitForTimeout(1600);
    await shot(tag + '-fit');
    const anchor = await page.evaluate(() => { const els = [...document.querySelectorAll('#geoCanvas path[data-map-region]')].map(p => p.getBoundingClientRect()).filter(r => r.width > 20); const r = els[Math.floor(els.length / 2)]; return {x: r.x + r.width / 2, y: r.y + r.height / 2}; });
    await page.mouse.move(anchor.x, anchor.y);
    for (let i = 1; i <= 12; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(700); if (i % 3 === 0) await shot(`${tag}-in${i}`); }
  }
  await page.evaluate(() => window.LegalAtlas.navigate('node', 'hamer')); await page.waitForTimeout(1800); await shot('sel-hamer');
  for (let i = 1; i <= 4; i++) { await page.mouse.move(W * .35, H * .5); await page.mouse.wheel(0, 120); await page.waitForTimeout(700); } await shot('sel-hamer-out4');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
