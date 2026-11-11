/* The splash text on the Home map (src/features/splash): one of
   DKLASplashLines, tilted on the upper-right corner of the DKLA logo, pulsing,
   following the logo, hidden whenever something covers the map, never over a
   tile or a control, and still under reduced motion.

     node tools/splash/browser.mjs http://127.0.0.1:8766/DKLA-v2.9.html */
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const url = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'local preview only');
const browser = await chromium.launch();

async function open(viewport, options = {}) {
  const phone = Math.min(viewport.width, viewport.height) < 560;
  const context = await browser.newContext({
    viewport,
    isMobile: phone,
    hasTouch: phone,
    serviceWorkers: 'block',
    ...options,
  });
  await context.route('**/*', (route) => {
    const target = new URL(route.request().url());
    if (target.origin !== url.origin || target.pathname.startsWith('/api/'))
      return route.fulfill({ status: 204 });
    return route.continue();
  });
  await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
  return { context, page, errors, phone };
}

// Everything is read in one go: the map replaces the logo several times a second.
const look = (page) =>
  page.evaluate(() => {
    const splash = document.querySelector('.dkla-splash'),
      text = splash.querySelector('.dkla-splash-text'),
      pop = splash.querySelector('.dkla-splash-pop'),
      mark = document.querySelector('#geoCanvas .dkla-map-monogram');
    const plain = (q) =>
      q && { left: q.left, top: q.top, right: q.right, bottom: q.bottom, width: q.width, height: q.height };
    const turn = new DOMMatrix(getComputedStyle(splash).transform);
    // Nine points along the middle of the tilted line, and what is under each.
    const box = text.getBoundingClientRect(),
      cx = box.left + box.width / 2,
      cy = box.top + box.height / 2,
      along = text.offsetWidth * 0.45,
      a = Math.atan2(turn.b, turn.a);
    const under = [];
    for (let i = -4; i <= 4; i++) {
      const x = cx + (along * i * Math.cos(a)) / 4,
        y = cy + (along * i * Math.sin(a)) / 4;
      for (const el of document.elementsFromPoint(x, y)) {
        if (el.closest('.study-header')) under.push('top bar');
        else if (el.closest('.study-zoom, .map-nav')) under.push('map controls');
        else if (el.closest('path[data-map-region], .r19-tile')) under.push('tile');
      }
    }
    return {
      shown: splash.dataset.shown,
      hiddenBy: splash.dataset.hiddenBy,
      line: text.textContent,
      lines: window.DKLASplashLines,
      saved: localStorage.getItem('dkla.splash.v1'),
      index: splash.dataset.line,
      angle: (a * 180) / Math.PI,
      font: parseFloat(getComputedStyle(text).fontSize),
      logo: plain(mark?.getBoundingClientRect()),
      box: plain(box),
      under: [...new Set(under)],
      rootEvents: getComputedStyle(splash).pointerEvents,
      textEvents: getComputedStyle(text).pointerEvents,
      animations: [...text.getAnimations(), ...pop.getAnimations()].map((x) => x.animationName || 'pop'),
      playing: text.getAnimations().filter((x) => x.playState === 'running').length,
    };
  });

// The line rises to the right from the logo's upper-right corner, overlapping it slightly.
function onCorner(state, at) {
  const { logo, box } = state;
  const round = (q) => ['left', 'top', 'right', 'bottom'].map((k) => Math.round(q[k])).join(',');
  const where = `${at} (logo ${round(logo)}, line ${round(box)})`;
  assert.ok(
    box.left < logo.right && box.left > logo.right - logo.width * 0.5,
    `${where}: starts on the corner`,
  );
  assert.ok(box.right > logo.right + 20, `${where}: runs out to the right of the logo`);
  assert.ok(box.top < logo.top, `${where}: rises above the logo`);
  assert.ok(
    box.bottom > logo.top && box.bottom < logo.top + logo.height * 0.6,
    `${where}: reaches down onto the corner`,
  );
  assert.ok(state.angle > -22 && state.angle < -13, `${where}: tilted (${state.angle.toFixed(1)} degrees)`);
}

const splash = (page) => page.locator('.dkla-splash');
async function shown(page) {
  await expect(splash(page)).toHaveAttribute('data-shown', 'true', { timeout: 8000 });
  await expect(page.locator('.dkla-splash-text')).toBeVisible();
}
async function hidden(page, why) {
  await expect(splash(page), why).toHaveAttribute('data-shown', 'false', { timeout: 8000 });
  await expect(page.locator('.dkla-splash-text'), why).toBeHidden();
}
// The pulsing text never holds still for Playwright's own click: press its middle.
async function tap(page) {
  const box = await page.locator('.dkla-splash-text').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
async function home(page) {
  await page.evaluate(() => {
    for (const d of document.querySelectorAll('dialog[open]')) d.close();
  });
  await page.locator('#geoBreadcrumb [data-study-scope="Atlas"]').click();
  await expect
    .poll(async () => JSON.parse(await page.locator('#geoCanvas').getAttribute('data-dkla-home-view')))
    .toMatchObject({ scope: 'Atlas', region: null, selected: false });
}

try {
  // Desktop.
  {
    const { context, page, errors } = await open({ width: 1440, height: 900 });
    await expect(splash(page)).toHaveCount(1);
    await expect(splash(page)).toHaveAttribute('aria-hidden', 'true');
    await shown(page);
    let state = await look(page);
    assert.ok(state.lines.length >= 2, 'a list of lines');
    assert.ok(state.lines.includes(state.line), `"${state.line}" is one of DKLASplashLines`);
    assert.equal(
      JSON.parse(state.saved).last,
      state.lines.indexOf(state.line),
      'the line shown is remembered',
    );
    onCorner(state, '1440 x 900');
    assert.deepEqual(state.under, [], 'nothing under the line');
    assert.ok(state.font >= 9 && state.font <= 18, `small (${state.font}px)`);
    assert.equal(state.rootEvents, 'none');
    assert.equal(state.textEvents, 'auto', 'only the text takes clicks');
    assert.ok(state.animations.includes('dkla-splash-pulse') && state.playing, 'it pulses');

    // Clicking shows another line.
    const before = state.line;
    await tap(page);
    state = await look(page);
    assert.notEqual(state.line, before, 'a click shows another line');
    assert.ok(state.lines.includes(state.line));
    assert.ok(state.animations.includes('pop'), 'with a pop');
    assert.equal(JSON.parse(state.saved).last, state.lines.indexOf(state.line));

    // It follows the logo when the window changes size.
    await page.setViewportSize({ width: 1200, height: 820 });
    await expect.poll(async () => (await look(page)).logo.right).not.toBe(state.logo.right);
    await shown(page);
    await expect
      .poll(async () => {
        try {
          onCorner(await look(page), '1200 x 820');
          return 'on the corner';
        } catch (error) {
          return error.message;
        }
      })
      .toBe('on the corner');
    await page.setViewportSize({ width: 1440, height: 900 });
    await shown(page);

    // Hidden whenever something covers the map, back on Home.
    await page.evaluate(() => (location.hash = 'node=cp-pennoyer'));
    await page.locator('#inspector').waitFor();
    await hidden(page, 'an open entry hides it');
    await home(page);
    await shown(page);
    await page.evaluate(() => SCOTUSHistory.open());
    await hidden(page, 'SCOTUS History hides it');
    await page.evaluate(() => SCOTUSHistory.close());
    await shown(page);
    await page.evaluate(() => DKLAStudy.open('drill'));
    await hidden(page, 'Study hides it');
    await page.evaluate(() => DKLAStudy.close());
    await home(page);
    await shown(page);
    await page.evaluate(() => document.getElementById('glossaryDialog').showModal());
    await hidden(page, 'a dialog hides it');
    await home(page);
    await shown(page);
    // Zoomed in until the logo fades: gone.
    for (let i = 0; i < 3; i++) await page.locator('#studyZoomIn').click();
    await hidden(page, 'zooming in hides it');
    await home(page);
    await page.locator('#studyFit').click();
    await shown(page);

    // The next visit shows a different line.
    const last = (await look(page)).line;
    await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
    await shown(page);
    assert.notEqual((await look(page)).line, last, 'a new visit does not repeat the last line');
    assert.deepEqual(errors, []);
    await context.close();
  }

  // Reduced motion: no pulse and no pop.
  {
    const { context, page, errors } = await open({ width: 1440, height: 900 }, { reducedMotion: 'reduce' });
    await shown(page);
    let state = await look(page);
    onCorner(state, 'reduced motion');
    assert.deepEqual(state.animations, [], 'no pulse under reduced motion');
    await tap(page);
    state = await look(page);
    assert.deepEqual(state.animations, [], 'no pop under reduced motion');
    assert.deepEqual(errors, []);
    await context.close();
  }

  // Phones: smaller, and never over a tile, the top bar or the controls.
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    const { context, page, errors } = await open(viewport);
    await expect(splash(page)).toHaveCount(1);
    await page.waitForTimeout(1500);
    const state = await look(page);
    if (state.shown === 'true') {
      assert.deepEqual(state.under, [], `${viewport.width} x ${viewport.height}: nothing under the line`);
      assert.ok(state.font <= 14, `${viewport.width} x ${viewport.height}: smaller on a phone`);
      onCorner(state, `${viewport.width} x ${viewport.height}`);
    } else assert.ok(state.hiddenBy, 'hidden for a reason');
    console.log(
      `${viewport.width} x ${viewport.height}: ${state.shown === 'true' ? 'shown' : 'hidden (' + state.hiddenBy + ')'}`,
    );
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(
    'Splash text: shown on Home, on the logo corner, hidden when covered, calm under reduced motion.',
  );
} finally {
  await browser.close();
}
