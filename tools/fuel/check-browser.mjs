/* Ask Dottie's fuel gauge round the top-bar clock, in a real browser (src/features/fuel/).

     node tools/fuel/check-browser.mjs http://127.0.0.1:8766/DKLA-v3.1.html [--shots work/fuel]

   /api/fuel is mocked (the preview has no server functions). For each share left (1, 0.5, 0.25,
   0.2, 0.05, 0) and for "uncalibrated", the page fetches it and the check reads the rendered
   pixels along the clock's frame: the lit share of the outline must match the share left to
   within 4%, starting at the top centre and running clockwise, and its colour must be the HUD
   cyan, amber below 25% or red-orange below 10%. Uncalibrated shows a dim dashed frame and no lit
   line. It also checks the screen-reader label, that an Ask Dottie answer ('dkla:ask-answered')
   fetches the gauge again, that reduced motion stops the sweep, and that the gauge goes with the
   clock below 1360 px. --shots writes a picture of the clock for each state. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const shotsAt = process.argv.indexOf('--shots');
const shots = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
if (shots) fs.mkdirSync(shots, { recursive: true });

const browser = await chromium.launch();
let reply = { fraction: null, calibrated: false, updatedAt: '2026-11-18T12:00:00.000Z' };
let fuelRequests = 0;

async function open({ width = 1440, reducedMotion = 'reduce' } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    reducedMotion,
  });
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin === address.origin && url.pathname === '/api/fuel') {
      fuelRequests++;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reply) });
    }
    return url.origin !== address.origin || url.pathname.startsWith('/api/')
      ? route.fulfill({ status: 204, body: '' })
      : route.continue();
  });
  await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(address.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
  await page.waitForFunction(() => window.DKLAFuel, null, { timeout: 20_000 });
  return { context, page, errors };
}

// Sets what /api/fuel answers, has the page fetch it, and waits until it is drawn.
async function show(page, data) {
  reply = { updatedAt: '2026-11-18T12:00:00.000Z', ...data };
  await page.evaluate(() => window.DKLAFuel.refresh());
  await page.waitForFunction(
    ({ calibrated, fraction }) => {
      const s = window.DKLAFuel.state();
      return s.calibrated === calibrated && (!calibrated || Math.abs(s.fraction - fraction) < 1e-9);
    },
    reply,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(150);
}

// The rendered pixels along the middle of the frame's outline, in order from the top centre.
async function sampleOutline(page, count = 240) {
  const points = await page.evaluate((n) => {
    const path = document.querySelector('.ny-clock .ny-fuel-lit');
    const matrix = path.getScreenCTM();
    const total = path.getTotalLength();
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = path.getPointAtLength(((i + 0.5) / n) * total).matrixTransform(matrix);
      out.push([p.x, p.y]);
    }
    return out;
  }, count);
  const box = await page.locator('.study-header .ny-clock').boundingBox();
  const pad = 8;
  const clip = { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad };
  const png = await page.screenshot({ clip });
  const pixels = await page.evaluate(
    async ({ data, points, clip }) => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + data;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const g = canvas.getContext('2d', { willReadFrequently: true });
      g.drawImage(image, 0, 0);
      return points.map(([x, y]) => [
        ...g.getImageData(Math.floor(x - clip.x), Math.floor(y - clip.y), 1, 1).data,
      ]);
    },
    { data: png.toString('base64'), points, clip },
  );
  return { points, pixels, png, box };
}

const bright = ([r, g, b]) => Math.max(r, g, b) > 150;
function measure({ pixels }) {
  const lit = pixels.map(bright);
  const share = lit.filter(Boolean).length / lit.length;
  // The lit part is one unbroken run from the start of the outline.
  const firstDark = lit.indexOf(false);
  const contiguous = firstDark < 0 || lit.slice(firstDark).every((on) => !on);
  const on = pixels.filter(bright);
  const mean = [0, 1, 2].map((c) => (on.length ? on.reduce((sum, p) => sum + p[c], 0) / on.length : 0));
  return { share, contiguous, mean };
}
const hue = ([r, g, b]) =>
  b > r && g > r ? 'cyan' : r > b && g / r > 0.6 ? 'amber' : r > b && g / r <= 0.6 ? 'red-orange' : 'other';

const { context, page, errors } = await open();
const states = [
  { name: '100', data: { calibrated: true, fraction: 1 }, colour: 'cyan', level: 'ok' },
  { name: '50', data: { calibrated: true, fraction: 0.5 }, colour: 'cyan', level: 'ok' },
  { name: '25', data: { calibrated: true, fraction: 0.25 }, colour: 'cyan', level: 'ok' },
  { name: '20', data: { calibrated: true, fraction: 0.2 }, colour: 'amber', level: 'low' },
  { name: '5', data: { calibrated: true, fraction: 0.05 }, colour: 'red-orange', level: 'empty' },
  { name: '0', data: { calibrated: true, fraction: 0 }, colour: null, level: 'empty' },
  { name: 'uncalibrated', data: { calibrated: false, fraction: null }, colour: null, level: 'uncalibrated' },
];
const report = [];
for (const state of states) {
  await show(page, state.data);
  const sample = await sampleOutline(page);
  const { share, contiguous, mean } = measure(sample);
  const expected = state.data.calibrated ? state.data.fraction : 0;
  assert.ok(
    Math.abs(share - expected) <= 0.04,
    `${state.name}: ${Math.round(share * 100)}% of the frame is lit`,
  );
  assert.ok(contiguous, `${state.name}: the lit part is one run from the top centre`);
  if (state.colour) assert.equal(hue(mean), state.colour, `${state.name}: colour ${mean.map(Math.round)}`);
  const level = await page.locator('.ny-clock .ny-fuel').getAttribute('data-level');
  assert.equal(level, state.level);
  const label = await page.locator('.study-header .ny-fuel-label').getAttribute('aria-label');
  if (state.data.calibrated)
    assert.equal(label, `Ask Dottie credit about ${Math.round(expected * 100)}% left`);
  else assert.equal(label, 'Ask Dottie credit gauge not set up yet');
  if (shots) fs.writeFileSync(path.join(shots, `fuel-${state.name}.png`), sample.png);
  report.push(`${state.name}: ${Math.round(share * 100)}% lit${state.colour ? ' ' + state.colour : ''}`);
}

// Geometry: the outline is the clock's frame; it starts at the top centre and runs clockwise.
const geometry = await page.evaluate(() => {
  const clock = document.querySelector('.study-header .ny-clock');
  const path = document.querySelector('.ny-clock .ny-fuel-lit');
  const c = clock.getBoundingClientRect(),
    b = path.getBoundingClientRect();
  const total = path.getTotalLength();
  const at = (share) => path.getPointAtLength(share * total);
  const track = getComputedStyle(document.querySelector('.ny-clock .ny-fuel-track'));
  return {
    clock: [c.left, c.top, c.width, c.height],
    path: [b.left, b.top, b.width, b.height],
    start: [at(0).x, at(0).y],
    soon: [at(0.05).x, at(0.05).y],
    quarter: [at(0.25).x, at(0.25).y],
    width: clock.offsetWidth,
    height: clock.offsetHeight,
    dash: track.strokeDasharray,
    litVisible: getComputedStyle(path).visibility,
    role: document.querySelector('.study-header .ny-fuel-label').getAttribute('role'),
  };
});
for (let i = 0; i < 4; i++)
  assert.ok(
    Math.abs(geometry.path[i] - geometry.clock[i]) <= 1.5,
    `outline matches the frame ${geometry.path} ${geometry.clock}`,
  );
assert.ok(
  Math.abs(geometry.start[0] - geometry.width / 2) < 0.6 && geometry.start[1] < 1,
  'starts at the top centre',
);
assert.ok(
  geometry.soon[0] > geometry.start[0] && geometry.soon[1] < 1,
  'runs clockwise (right along the top)',
);
assert.ok(geometry.quarter[0] > geometry.width - 2, 'a quarter of the way round is on the right side');
// The last state shown was uncalibrated: a dim dashed track, no lit line.
assert.match(geometry.dash, /^3px,\s*4px$/);
assert.equal(geometry.litVisible, 'hidden');
assert.equal(geometry.role, 'img');

// Reduced motion: no sweep. An Ask Dottie answer fetches the gauge again.
assert.equal(
  await page.evaluate(() => getComputedStyle(document.querySelector('.ny-clock .ny-fuel-shine')).display),
  'none',
  'no sweep with reduced motion',
);
const before = fuelRequests;
await page.evaluate(() => document.dispatchEvent(new CustomEvent('dkla:ask-answered')));
await page.waitForFunction(() => true, null, { timeout: 100 });
const deadline = Date.now() + 5000;
while (fuelRequests === before && Date.now() < deadline) await page.waitForTimeout(100);
assert.ok(fuelRequests > before, 'an Ask Dottie answer fetches the gauge again');
assert.deepEqual(errors, []);
await context.close();

// With motion: the bright sweep runs across the line, as on the version label.
reply = { calibrated: true, fraction: 0.5, updatedAt: '2026-11-18T12:00:00.000Z' };
const moving = await open({ reducedMotion: 'no-preference' });
await moving.page.waitForFunction(() => window.DKLAFuel.state().calibrated, null, { timeout: 10_000 });
// The sweep is a window sliding across a copy of the lit line that slides back by the same amount:
// two transform animations (run by the compositor, so the page is not laid out for them), no SMIL,
// and the copy stays on the frame while the window moves.
const sweep = async () =>
  moving.page.evaluate(() => {
    const shine = document.querySelector('.ny-clock .ny-fuel-shine'),
      view = shine.querySelector('.ny-fuel-window'),
      copy = shine.querySelector('.ny-fuel-copy'),
      lit = document.querySelector('.ny-clock .ny-fuel-lit');
    const names = (el) => el.getAnimations().map((a) => a.animationName + ':' + a.playState);
    return {
      smil: document.querySelectorAll('.ny-clock animateTransform, .ny-clock animate').length,
      window: names(view),
      copy: names(copy),
      windowAt: view.getBoundingClientRect().left,
      drift: copy.querySelector('path').getBoundingClientRect().left - lit.getBoundingClientRect().left,
      dash: copy.querySelector('path').style.strokeDasharray === lit.style.strokeDasharray,
      level: shine.dataset.level,
    };
  });
// The band crosses in the first 2.8 s of every 5 s and waits off the frame for the rest: sample
// until two looks half a second apart catch it moving.
let first = await sweep(),
  second = first;
for (let i = 0; i < 14; i++) {
  await moving.page.waitForTimeout(500);
  second = await sweep();
  if (second.windowAt - first.windowAt > 20) break;
  first = second;
}
assert.equal(first.smil, 0, 'no SMIL animation in the clock');
assert.deepEqual(first.window, ['ny-fuel-window:running'], 'the sweep runs');
assert.deepEqual(first.copy, ['ny-fuel-copy:running']);
assert.ok(
  second.windowAt - first.windowAt > 20,
  `the band moves right (${first.windowAt} → ${second.windowAt})`,
);
for (const at of [first, second])
  assert.ok(Math.abs(at.drift) < 1.5, `the bright copy stays on the lit line (off by ${at.drift})`);
assert.ok(first.dash && first.level === 'ok', 'the bright copy is as long as the lit line');
if (shots) {
  await moving.page.waitForTimeout(2000);
  const box = await moving.page.locator('.study-header .ny-clock').boundingBox();
  const bar = await moving.page.locator('header.study-header').boundingBox();
  fs.writeFileSync(
    path.join(shots, 'fuel-50-topbar.png'),
    await moving.page.screenshot({
      clip: { x: Math.max(0, box.x - 420), y: bar.y, width: 840, height: bar.height },
    }),
  );
}
assert.deepEqual(moving.errors, []);
await moving.context.close();

// Below 1360 px the clock is hidden, and the gauge and its label with it.
const narrow = await open({ width: 1280 });
const hidden = await narrow.page.evaluate(() => ({
  clock: getComputedStyle(document.querySelector('.study-header .ny-clock')).display,
  label: getComputedStyle(document.querySelector('.study-header .ny-fuel-label')).display,
}));
assert.deepEqual(hidden, { clock: 'none', label: 'none' });
assert.deepEqual(narrow.errors, []);
await narrow.context.close();

await browser.close();
console.log(
  `Fuel gauge: ${report.join('; ')}; clockwise from the top centre; sweep only with motion; hidden below 1360 px.`,
);
