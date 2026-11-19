/* The splash text (src/features/splash): one of DKLASplashLines, small, slightly tilted and
   gently pulsing, attached to the DKLA wordmark in the top bar the way a title-screen splash is
   (v3.2, src/features/v32/). It shows on Home only: not zoomed in, not on a course, not with an
   entry, a dialog, Study or SCOTUS History open. It is never over a control, and is still under
   reduced motion.

     node tools/splash/browser.mjs http://127.0.0.1:8766/DKLA-v3.1.html */
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
        // It is in the top bar: only the bar's controls count as being under it.
        if (
          el.closest('.study-header button, .study-header a, .study-header input, .ny-clock, .ask-bar-dottie')
        )
          under.push('top bar control');
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
      logo: plain(document.getElementById('atlasHome')?.getBoundingClientRect()),
      group: plain(document.querySelector('.study-header .v32-bar-left')?.getBoundingClientRect()),
      bar: plain(document.querySelector('.study-header')?.getBoundingClientRect()),
      box: plain(box),
      under: [...new Set(under)],
      rootEvents: getComputedStyle(splash).pointerEvents,
      textEvents: getComputedStyle(text).pointerEvents,
      animations: [...text.getAnimations(), ...pop.getAnimations()].map((x) => x.animationName || 'pop'),
      playing: text.getAnimations().filter((x) => x.playState === 'running').length,
    };
  });

// The line is attached to the wordmark (state.logo is the mark and wordmark's box): it starts just after it,
// stays inside the bar's left group and the bar, and rises a little to the right (about 3 degrees; the owner's
// level line of 12 November 2026 sat in a slot of its own, which the v3.2 bar no longer has).
function onCorner(state, at) {
  const { logo, group, bar, box } = state;
  const round = (q) => ['left', 'top', 'right', 'bottom'].map((k) => Math.round(q[k])).join(',');
  const where = `${at} (wordmark ${round(logo)}, line ${round(box)})`;
  assert.ok(logo.width > 0, `${where}: the top bar has its wordmark`);
  assert.ok(box.left >= logo.right - 2 && box.left <= logo.right + 32, `${where}: attached to the wordmark`);
  assert.ok(box.right <= group.right + 2, `${where}: inside the bar's left group`);
  assert.ok(box.top >= bar.top - 2 && box.bottom <= bar.bottom + 2, `${where}: inside the top bar`);
  assert.ok(
    state.angle < -2 && state.angle > -4,
    `${where}: tilted a little (${state.angle.toFixed(1)} degrees)`,
  );
  const middle = (box.top + box.bottom) / 2 - (bar.top + bar.bottom) / 2;
  assert.ok(Math.abs(middle) <= 8, `${where}: on the bar's centre line (${middle.toFixed(1)} px off)`);
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
  // The wordmark is the way Home (on Home the breadcrumb steps aside for this line).
  await page.locator('#atlasHome').click();
  await page.locator('#studyFit').click();
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
    assert.equal(state.font, 13, `small (${state.font}px)`);
    assert.equal(state.rootEvents, 'none');
    assert.equal(state.textEvents, 'auto', 'only the text takes clicks');
    assert.ok(state.animations.includes('dkla-splash-pulse-bar') && state.playing, 'it pulses');

    // Clicking shows another line.
    const before = state.line;
    await tap(page);
    state = await look(page);
    assert.notEqual(state.line, before, 'a click shows another line');
    assert.ok(state.lines.includes(state.line));
    assert.ok(state.animations.includes('pop'), 'with a pop');
    assert.equal(JSON.parse(state.saved).last, state.lines.indexOf(state.line));

    // Clicking on through 30 lines never brings one back (owner, 18 November 2026: a line just seen should
    // not come up again for about 100 clicks), and the browser remembers them in order.
    const run = [before, state.line];
    for (let i = 0; i < 28; i++) {
      await tap(page);
      run.push((await look(page)).line);
    }
    const twice = run.filter((line, i) => run.indexOf(line) !== i);
    assert.deepEqual(twice, [], `30 clicks through, no line came back: ${run.length} lines`);
    state = await look(page);
    const memory = JSON.parse(state.saved);
    assert.deepEqual(memory.recent.slice(-run.length), run, 'the last lines shown are remembered by text');
    for (const line of run) assert.ok(memory.seen[line] >= 1, `"${line}" counted`);

    // A narrower window: still attached to the wordmark (a long line takes two rows there).
    await page.setViewportSize({ width: 1200, height: 820 });
    await shown(page);
    await expect
      .poll(async () => {
        try {
          onCorner(await look(page), '1200 x 820');
          return 'attached';
        } catch (error) {
          return error.message;
        }
      })
      .toBe('attached');
    await page.setViewportSize({ width: 1440, height: 900 });
    await home(page);
    await shown(page);

    // Home only (v3.2): an entry, SCOTUS History, Study, a dialog and a closer look at the map each send it
    // away, and it says why; Home brings it back.
    const why = async () => (await look(page)).hiddenBy;
    await page.evaluate(() => (location.hash = 'node=cp-pennoyer'));
    await page.locator('#inspector').waitFor();
    await hidden(page, 'an open entry hides it');
    assert.equal(await why(), 'not home');
    await home(page);
    await shown(page);
    await page.locator('[data-sh-open]').first().dispatchEvent('click');
    await page.waitForFunction(() => window.SCOTUSHistory.state().open);
    await hidden(page, 'SCOTUS History hides it');
    await page.evaluate(() => SCOTUSHistory.close());
    await home(page);
    await shown(page);
    await page.evaluate(() => DKLAStudy.open('drill'));
    await hidden(page, 'Study hides it');
    assert.equal(await why(), 'dialog');
    await page.evaluate(() => DKLAStudy.close());
    await home(page);
    await shown(page);
    await page.evaluate(() => document.getElementById('glossaryDialog').showModal());
    await hidden(page, 'a dialog hides it');
    await home(page);
    await shown(page);
    // Zoomed into the map: gone; the whole atlas again: back.
    for (let i = 0; i < 3; i++) await page.locator('#studyZoomIn').click();
    await hidden(page, 'a closer look at the map hides it');
    await home(page);
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

  // Storage blocked (some private windows): the splash still shows and still never repeats a line.
  {
    const { context, page } = await open({ width: 1440, height: 900 });
    await context.addInitScript(() => {
      for (const name of ['getItem', 'setItem'])
        Storage.prototype[name] = function () {
          throw new DOMException('blocked', 'SecurityError');
        };
    });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
    await shown(page);
    const text = () => page.locator('.dkla-splash-text').textContent();
    const run = [await text()];
    for (let i = 0; i < 15; i++) {
      await tap(page);
      run.push(await text());
    }
    assert.equal(new Set(run).size, run.length, `storage blocked: 16 lines, none twice (${run.join(' | ')})`);
    await context.close();
  }

  // A small landscape screen: never over a tile or a control (portrait screens are not designed for).
  for (const viewport of [{ width: 844, height: 390 }]) {
    const { context, page, errors } = await open(viewport);
    await expect(splash(page)).toHaveCount(1);
    await page.waitForTimeout(1500);
    const state = await look(page);
    if (state.shown === 'true') {
      assert.deepEqual(state.under, [], `${viewport.width} x ${viewport.height}: nothing under the line`);
      assert.ok(state.font <= 16, `${viewport.width} x ${viewport.height}: small`);
      onCorner(state, `${viewport.width} x ${viewport.height}`);
    } else assert.ok(state.hiddenBy, 'hidden for a reason');
    console.log(
      `${viewport.width} x ${viewport.height}: ${state.shown === 'true' ? 'shown' : 'hidden (' + state.hiddenBy + ')'}`,
    );
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(
    'Splash text: attached to the wordmark on Home only, away for an entry, a dialog, Study, SCOTUS History and a closer look at the map, calm under reduced motion.',
  );
} finally {
  await browser.close();
}
