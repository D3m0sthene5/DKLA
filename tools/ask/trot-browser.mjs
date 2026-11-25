/* The Ask Dottie thinking spinner's trotting opossums, in a real browser (v3.1).

     node tools/ask/trot-browser.mjs http://127.0.0.1:8766/DKLA-v3.2.html

   Each of the three opossums is drawn in 8 frames (dottie.js TROT; gait spec: a running trot,
   diagonal pairs, flight in frames 4 and 8, 90 ms a frame). With motion, exactly one frame of each
   shows at any moment and the frame changes over time. With reduced motion, nothing animates and
   each opossum holds frame 1. */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const browser = await chromium.launch();

async function sample(reducedMotion) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: 'block',
    reducedMotion,
  });
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
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
  // The spinner as ask.js shows it: inside the Ask dialog's progress line.
  await page.evaluate(() => {
    const dialog = document.getElementById('dklaAskDialog');
    dialog.show();
    const holder = document.createElement('div');
    holder.className = 'ask-progress';
    holder.innerHTML = `<span class="ask-dottie" data-pose="spinner">${window.DKLADottie.spinner()}</span>`;
    dialog.append(holder);
  });
  const frames = [];
  for (let i = 0; i < 10; i++) {
    frames.push(
      await page.evaluate(() =>
        [...document.querySelectorAll('#dklaAskDialog .dottie-spinner .dottie-runner')].map((runner) =>
          [...runner.querySelectorAll(':scope > .dottie-trot')]
            .map((frame, i) => (Number(getComputedStyle(frame).opacity) > 0.5 ? i : -1))
            .filter((i) => i >= 0),
        ),
      ),
    );
    await page.waitForTimeout(37);
  }
  const ring = await page.evaluate(
    () =>
      getComputedStyle(document.querySelector('#dklaAskDialog .dottie-spinner .dottie-ring')).animationName,
  );
  const counts = await page.evaluate(() =>
    [...document.querySelectorAll('#dklaAskDialog .dottie-spinner .dottie-runner')].map(
      (runner) => runner.querySelectorAll(':scope > .dottie-trot').length,
    ),
  );
  assert.deepEqual(errors, []);
  await context.close();
  return { frames, ring, counts };
}

const moving = await sample('no-preference');
assert.deepEqual(moving.counts, [8, 8, 8], 'three opossums, eight frames each');
for (const moment of moving.frames)
  for (const shown of moment)
    assert.equal(shown.length, 1, `one frame at a time (${JSON.stringify(moment)})`);
const seen = new Set(moving.frames.map((moment) => moment[0][0]));
assert.ok(seen.size >= 3, `the frames change over time (saw ${[...seen]})`);
assert.equal(moving.ring, 'dottie-spin');

const still = await sample('reduce');
assert.equal(still.ring, 'none', 'the ring stands still with reduced motion');
for (const moment of still.frames) assert.deepEqual(moment, [[0], [0], [0]], 'each opossum holds frame 1');

await browser.close();
console.log(
  `Trotting opossums: 3 × 8 frames, one shown at a time (${seen.size} frames seen in 370 ms); reduced motion holds frame 1.`,
);
