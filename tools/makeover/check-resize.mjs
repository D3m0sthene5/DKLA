/* Makeover on 3.1: the reading panel's edge can be dragged (src/features/makeover/resize.js).

     node tools/makeover/check-resize.mjs http://127.0.0.1:8766/DKLA-v3.1.html

   At 1512 x 789, with the group "Lapse, revocation & other endings" open:
   - a handle sits on the panel's left edge, the full height of the panel;
   - dragging it left makes the panel wider and dragging right makes it narrower, by the distance
     dragged; the panel stops at 440 px and stops 280 px short of the window's left edge;
   - the map's camera does not move, and the strip of map the panel uncovers is drawn with its names;
   - the width is kept after a reload; a double-click, or Enter on the handle, restores the usual
     width and forgets the kept one; the arrow keys move the edge 24 px;
   - a case page in a narrow panel drops its "On this page" rail and does not scroll sideways;
   - a 900 px window has no handle and takes its width from the stylesheet. */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1512, height: 789 }, serviceWorkers: 'block' });
await context.route('**/*', (route) => {
  const url = new URL(route.request().url());
  return url.origin !== address.origin || url.pathname.startsWith('/api/')
    ? route.fulfill({ status: 204, body: '' })
    : route.continue();
});
await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
const page = await context.newPage();
page.setDefaultTimeout(20_000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' && /DKLA r20 map/.test(message.text()))
    errors.push(message.text().split('\n')[0]);
});
const open = async () => {
  await page.goto(address.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
  await page.waitForFunction(() => window.LegalAtlas?.ready);
  await page.evaluate(() => goRegion('offer-region', false));
  await page.waitForTimeout(500);
  await page.evaluate(() => goDistrict('offer-duration', false));
  await page.locator('#inspector .study-entry-link').first().waitFor();
  await page.waitForTimeout(900);
};
const state = () =>
  page.evaluate(() => {
    const panel = document.querySelector('#inspector').getBoundingClientRect(),
      handle = document.querySelector('#readerResize').getBoundingClientRect();
    return {
      width: Math.round(panel.width),
      left: Math.round(panel.left),
      handleLeft: Math.round(handle.left),
      handleWidth: Math.round(handle.width),
      handleHeight: Math.round(handle.height),
      panelHeight: Math.round(panel.height),
      kept: localStorage.getItem('dkla.readerWidth.v1'),
      camera: [Math.round(S.x), Math.round(S.y), Math.round(S.z * 10000)],
      narrow: document.querySelector('#inspector').classList.contains('reader-narrow'),
      uncovered: ['public-offers', 'protected-offers'].map(
        (id) =>
          document.querySelectorAll(`text[data-map-district="${id}"]`).length +
          [...document.querySelectorAll('text[data-map-jump]')].filter(
            (t) => homeFor(t.getAttribute('data-map-jump'))?.district === id,
          ).length,
      ),
    };
  });
const drag = async (dx) => {
  const box = await page.locator('#readerResize').boundingBox();
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x + (dx * i) / 10, y + 2);
  await page.mouse.up();
  await page.waitForTimeout(350);
};

await open();
const start = await state();
assert.equal(start.width, 1152, 'the usual width at this window size');
assert.equal(start.kept, null);
assert.ok(
  Math.abs(start.handleLeft + start.handleWidth / 2 - start.left) <= 2,
  'the handle sits on the panel edge',
);
assert.equal(start.handleHeight, start.panelHeight, 'the handle is as tall as the panel');

await drag(-60);
const wider = await state();
assert.equal(wider.width, start.width + 60, 'dragging left by 60 px makes the panel 60 px wider');
assert.equal(wider.kept, String(wider.width), 'the width is kept');

await drag(500);
const narrower = await state();
assert.equal(narrower.width, wider.width - 500, 'dragging right by 500 px makes the panel 500 px narrower');
assert.deepEqual(narrower.camera, start.camera, 'the map does not move when the panel is resized');
assert.ok(
  narrower.uncovered.every((n) => n > 0),
  'the groups the panel uncovered are drawn with their names: ' + narrower.uncovered,
);
assert.ok(narrower.narrow, 'a panel under 860 px is marked narrow');

await drag(2000);
assert.equal((await state()).width, 440, 'the panel stops at 440 px');
await page.evaluate(() => {
  location.hash = 'node=citoh';
});
await page.locator('#inspector .reader-body.v31-case').waitFor();
await page.waitForTimeout(700);
const narrowCase = await page.evaluate(() => {
  const panel = document.querySelector('#inspector'),
    rail = panel.querySelector('.v31-rail');
  return {
    rail: rail ? getComputedStyle(rail).display : 'absent',
    sideways: panel.scrollWidth > panel.clientWidth + 1,
    title: Math.round(panel.querySelector('h2').getBoundingClientRect().width),
  };
});
assert.equal(narrowCase.rail, 'none', 'a narrow panel drops the case page rail');
assert.ok(!narrowCase.sideways, 'a case page in a narrow panel scrolls sideways');
assert.ok(narrowCase.title > 300, 'the case title has the width of the narrow panel');

await open();
assert.equal((await state()).width, 440, 'the kept width is used after a reload');
await drag(-3000);
assert.equal((await state()).width, 1512 - 280, 'the panel leaves 280 px of map');

await page.locator('#readerResize').dblclick();
await page.waitForTimeout(300);
const reset = await state();
assert.equal(reset.width, start.width, 'a double-click restores the usual width');
assert.equal(reset.kept, null, 'and forgets the kept one');

await page.locator('#readerResize').focus();
await page.keyboard.press('ArrowRight');
assert.equal((await state()).width, start.width - 24, 'Arrow Right moves the edge 24 px to the right');
await page.keyboard.press('ArrowLeft');
await page.keyboard.press('ArrowLeft');
assert.equal((await state()).width, start.width + 24, 'Arrow Left moves it to the left');
await page.keyboard.press('Enter');
assert.equal((await state()).width, start.width, 'Enter restores the usual width');

await drag(300);
await page.setViewportSize({ width: 900, height: 700 });
await page.waitForTimeout(400);
const small = await page.evaluate(() => ({
  handle: getComputedStyle(document.querySelector('#readerResize')).display,
  override: document.documentElement.style.getPropertyValue('--reader'),
}));
assert.equal(small.handle, 'none', 'a 900 px window has no handle');
assert.equal(small.override, '', 'and takes its panel width from the stylesheet');

assert.deepEqual(errors, [], 'page errors');
await browser.close();
console.log(
  `makeover resize: ${start.width} px usual, 440 to ${1512 - 280} px by dragging, kept across a reload; ok`,
);
