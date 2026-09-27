const {chromium} = require('playwright-core');
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--no-sandbox']});
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  page.on('pageerror', e => console.log('PAGEERROR', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  await page.goto('file://' + require('path').resolve(__dirname, '../../../DKLA-r8.html'), {waitUntil: 'load'});
  await page.waitForTimeout(4000);
  console.log('children', await page.evaluate(() => document.querySelector('#geoCanvas').children.length));
  await browser.close();
})();
