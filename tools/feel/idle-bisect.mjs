/* Which part of the page makes the browser recompute style and layout on every frame while nothing is
   happening? Hides one part at a time (in the test browser only) and counts layouts per second.

     node tools/feel/idle-bisect.mjs http://127.0.0.1:8791/DKLA-v3.1.html */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const target = new URL(process.argv[2] || 'http://127.0.0.1:8791/DKLA-v3.1.html');
assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname), 'local preview only');
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', colorScheme: 'dark' });
await context.route('**/*', (route) => {
  const u = new URL(route.request().url());
  return u.origin !== target.origin || u.pathname.startsWith('/api/') ? route.fulfill({ status: 204, body: '' }) : route.continue();
});
await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Performance.enable');
await page.goto(target.href, { waitUntil: 'commit', timeout: 180_000 });
await page.locator('html.dkla-boot-ready').waitFor({ timeout: 180_000 });
await page.waitForFunction(() => !DKLAData.state().lazy.length, null, { timeout: 240_000 });
await page.waitForTimeout(4000);
const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
async function count(ms = 3000) {
  await page.waitForTimeout(500);
  const a = await metrics();
  await page.waitForTimeout(ms);
  const b = await metrics();
  const per = 1000 / ms;
  return {
    layoutsPerSecond: Math.round((b.LayoutCount - a.LayoutCount) * per),
    styleRecalcsPerSecond: Math.round((b.RecalcStyleCount - a.RecalcStyleCount) * per),
    layoutMsPerSecond: +((b.LayoutDuration - a.LayoutDuration) * 1000 * per).toFixed(1),
    styleMsPerSecond: +((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000 * per).toFixed(1),
    mainThreadMsPerSecond: +((b.TaskDuration - a.TaskDuration) * 1000 * per).toFixed(1),
  };
}
const info = await page.evaluate(() => ({
  smil: document.querySelectorAll('animate,animateTransform,animateMotion,set').length,
  canvases: document.querySelectorAll('canvas').length,
  animations: document.getAnimations().map((a) => (a.animationName || a.transitionProperty) + ' on ' + (a.effect?.target?.className?.baseVal ?? a.effect?.target?.className) + ' ' + a.playState),
}));
console.log(info);
const VARIANTS = {
  'as built': '',
  'CSS animations and transitions off': '*,*::before,*::after{animation:none!important;transition:none!important}',
  'splash line hidden': '.dkla-splash{display:none!important}',
  'clock hidden': '.ny-clock,[class*="ny-"]{display:none!important}',
  'version badge hidden': '.dkla-release{display:none!important}',
  'Ask Dottie button hidden': '.ask-bar{display:none!important}',
  'whole top bar hidden': 'header{display:none!important}',
  'map hidden': '#geoCanvas{display:none!important}',
  'everything hidden': 'body>*{display:none!important}',
};
const rows = {};
for (const [name, css] of Object.entries(VARIANTS)) {
  const tag = css ? await page.addStyleTag({ content: css }) : null;
  rows[name] = await count();
  if (tag) await tag.evaluate((el) => el.remove());
}
console.table(rows);
await browser.close();
