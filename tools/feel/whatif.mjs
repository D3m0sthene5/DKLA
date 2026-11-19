/* What-if experiments for drawing cost: the same view measured as built, then with one kind of styling
   switched off by a style rule added in the test browser only (no source file is touched). The difference
   says how much of the frame time that styling costs here.

     node tools/feel/whatif.mjs http://127.0.0.1:8791/DKLA-v3.1.html [--cpu 4] [--out work/feel/whatif.json]

   Headless Chromium draws without a graphics card, so blur and large shadows cost more here than on a
   laptop with one. Read the result as "this is what the page asks the machine to do", not as laptop frame
   rates. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const argv = process.argv.slice(2);
const flag = (name, fallback) => (argv.indexOf(name) < 0 ? fallback : argv[argv.indexOf(name) + 1]);
const target = new URL(argv.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8791/DKLA-v3.1.html');
assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname), 'local preview only');
const cpu = Number(flag('--cpu', 1));
const outFile = path.resolve(root, flag('--out', `work/feel/whatif${cpu > 1 ? '-' + cpu + 'x' : ''}.json`));
const instrument = fs.readFileSync(path.join(here, 'instrument.js'), 'utf8').trim().replace(/;$/, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VARIANTS = {
  'as built': '',
  'no backdrop blur':
    '*,*::before,*::after,::backdrop{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
  'no blur, no filters':
    '*,*::before,*::after,::backdrop{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;filter:none!important}',
  'no blur, filters or shadows':
    '*,*::before,*::after,::backdrop{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;filter:none!important;box-shadow:none!important;text-shadow:none!important}',
  'no CSS animations': '*,*::before,*::after{animation:none!important}',
  'no splash pulse': '.dkla-splash-text{animation:none!important}',
  'no version-badge sweep':
    '.dkla-release,.dkla-release::before,.dkla-release::after{animation:none!important}',
  'no Cold Call vapour (button hidden)': 'button[data-cold-call]{display:none!important}',
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  serviceWorkers: 'block',
  colorScheme: 'dark',
});
await context.route('**/*', (route) => {
  const u = new URL(route.request().url());
  return u.origin !== target.origin || u.pathname.startsWith('/api/')
    ? route.fulfill({ status: 204, body: '' })
    : route.continue();
});
await context.addInitScript(`(${instrument})({})`);
const page = await context.newPage();
page.setDefaultTimeout(60_000);
const cdp = await context.newCDPSession(page);
await cdp.send('Performance.enable');
await page.goto(target.href, { waitUntil: 'commit', timeout: 180_000 });
await page.locator('html.dkla-boot-ready').waitFor({ timeout: 180_000 });
await page.waitForFunction(() => __feel.marks.dataDone && __feel.marks.searchIndex, null, {
  timeout: 240_000,
});
await sleep(2500);
await page.evaluate(() => __feel.wrapDraw());
if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });

const metrics = async () =>
  Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
async function still(ms = 3000) {
  await sleep(600);
  await page.evaluate(() => __feel.begin(null, null, null));
  const a = await metrics();
  await sleep(ms);
  const b = await metrics();
  const r = await page.evaluate(() => __feel.end(null));
  const per = 1000 / ms;
  return {
    frameMedianMs: +r.frameMedian.toFixed(1),
    framesPerSecond: +(r.frames * per).toFixed(1),
    over20: +(r.over20 * 100).toFixed(0) + '%',
    over50: +(r.over50 * 100).toFixed(0) + '%',
    layoutsPerSecond: +((b.LayoutCount - a.LayoutCount) * per).toFixed(1),
    styleRecalcsPerSecond: +((b.RecalcStyleCount - a.RecalcStyleCount) * per).toFixed(1),
    mainThreadMsPerSecond: +((b.TaskDuration - a.TaskDuration) * 1000 * per).toFixed(1),
    scriptMsPerSecond: +((b.ScriptDuration - a.ScriptDuration) * 1000 * per).toFixed(1),
  };
}
async function pan(ms = 1500) {
  const box = await page.evaluate(() => {
    const b = document.getElementById('geoCanvas').getBoundingClientRect();
    return { x: b.left, y: b.top, w: b.width, h: b.height };
  });
  const from = { x: box.x + box.w * 0.7, y: box.y + box.h * 0.6 },
    to = { x: box.x + box.w * 0.25, y: box.y + box.h * 0.35 };
  await sleep(500);
  await page.evaluate(() => __feel.begin(null, null, null));
  const a = await metrics();
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const began = Date.now();
  for (;;) {
    const f = Math.min(1, (Date.now() - began) / ms);
    await page.mouse.move(from.x + (to.x - from.x) * f, from.y + (to.y - from.y) * f);
    if (f >= 1) break;
    await sleep(8);
  }
  const b = await metrics();
  const r = await page.evaluate(() => __feel.end(null));
  await page.mouse.up();
  await page.mouse.move(from.x, from.y);
  // Put the map back where it was.
  await page.mouse.move(to.x, to.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y, { steps: 3 });
  await page.mouse.up();
  return {
    frameMedianMs: +r.frameMedian.toFixed(1),
    framesPerSecond: +((r.frames / ms) * 1000).toFixed(1),
    over20: +(r.over20 * 100).toFixed(0) + '%',
    over50: +(r.over50 * 100).toFixed(0) + '%',
    mapDrawMsEach: r.draws ? +(r.drawMs / r.draws).toFixed(1) : null,
    scriptMsPerSecond: +(((b.ScriptDuration - a.ScriptDuration) * 1e6) / ms).toFixed(0),
    mainThreadMsPerSecond: +(((b.TaskDuration - a.TaskDuration) * 1e6) / ms).toFixed(0),
  };
}
let styleHandle = null;
async function variant(css) {
  if (styleHandle) await styleHandle.evaluate((el) => el.remove());
  styleHandle = css ? await page.addStyleTag({ content: css }) : null;
  await sleep(400);
}
const VIEWS = [
  [
    'Home, nothing happening',
    async () => page.evaluate(() => home('Atlas', false, false)),
    still,
    ['as built', 'no CSS animations', 'no splash pulse', 'no version-badge sweep', 'no backdrop blur'],
  ],
  [
    'Home: dragging the Contracts map',
    async () => page.evaluate(() => home('Contracts', false, false)),
    pan,
    ['as built', 'no backdrop blur', 'no blur, filters or shadows', 'no CSS animations'],
  ],
  [
    'a case open, nothing happening',
    async () => {
      await page.evaluate(() => (location.hash = 'node=citoh'));
      await page.locator('#inspector .reader-body.v31-case .v31-chart-steps').waitFor();
      await sleep(3000);
    },
    still,
    [
      'as built',
      'no Cold Call vapour (button hidden)',
      'no CSS animations',
      'no backdrop blur',
      'no blur, filters or shadows',
    ],
  ],
  [
    'Doctrine timelines dialog open, nothing happening',
    async () => page.evaluate(() => DKLATimelines.open(DKLATimelines.list()[0].id)),
    still,
    [
      'as built',
      'no backdrop blur',
      'no blur, no filters',
      'no blur, filters or shadows',
      'no CSS animations',
    ],
  ],
  [
    'dictionary dialog open, nothing happening',
    async () => {
      await page.evaluate(() => {
        for (const d of document.querySelectorAll('dialog[open]')) d.close();
        location.hash = 'term=consideration';
      });
      await page.locator('#glossaryDialog[open]').waitFor();
    },
    still,
    ['as built', 'no backdrop blur', 'no blur, filters or shadows'],
  ],
  [
    'menu open, nothing happening',
    async () => {
      await page.evaluate(() => {
        for (const d of document.querySelectorAll('dialog[open]')) d.close();
        document.getElementById('closeInspector')?.click();
        home('Atlas', false, false);
      });
      await sleep(800);
      await page.click('#moreBtn');
    },
    still,
    ['as built', 'no backdrop blur'],
  ],
];
const result = { page: target.href, when: new Date().toISOString(), cpuThrottle: cpu, views: {} };
for (const [name, setup, measure, variants] of VIEWS) {
  await variant('');
  await setup();
  await sleep(1200);
  const rows = (result.views[name] = {});
  for (const v of variants) {
    await variant(VARIANTS[v]);
    rows[v] = await measure();
  }
  await variant('');
  rows['as built, again'] = await measure();
  console.log('\n' + name);
  console.table(rows);
}
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(result, null, 1));
await browser.close();
console.log('→ ' + path.relative(root, outFile));
