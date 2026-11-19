/* Calm (v3.2), in a real browser: the page is at rest when nothing is happening, panels arrive and
   leave with a short motion that can be interrupted, and controls answer a press.

     node tools/feel/check-calm.mjs http://127.0.0.1:8766/DKLA-v3.1.html

   1. Rest. On Home, and with a case open, the browser lays nothing out for 2 s (Chromium's own
      counter). The decorations that keep moving (the fuel gauge's and the version label's bright band,
      the splash pulse, the Cold Call vapour) animate only transform and opacity, there is no SMIL,
      and no timer in the page runs more often than once a second.
   2. While a dialog is open nothing ambient is running, and it starts again when the dialog closes;
      the same while the map is being moved.
   3. Every dialog fades and scales in and out (a transition of opacity and scale, on the dialog and
      its backdrop), all on one flat scrim with no blur; Esc in the middle of the way in closes it at
      once and the closing dialog takes no clicks. The menu, the search panel and the reader have a
      way in and a way out; typing in search does not replay it; a second click reverses the menu.
   4. Reduced motion: no transition on any of them, and nothing ambient runs.
   5. A sample of controls change on pointer-down (smaller and darker), and a map tile darkens.
   6. The "On this page" rail marks the part being read.
   7. A "Loading…" line shows nothing for 150 ms, then a skeleton; a failure message is plain text. */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const browser = await chromium.launch();
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function open({ reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    colorScheme: 'dark',
    reducedMotion,
  });
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    // A calibrated fuel gauge, so its bright band is on screen.
    if (url.origin === address.origin && url.pathname === '/api/fuel')
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ fraction: 0.6, calibrated: true, updatedAt: '2026-11-18T12:00:00.000Z' }),
      });
    return url.origin !== address.origin || url.pathname.startsWith('/api/')
      ? route.fulfill({ status: 204, body: '' })
      : route.continue();
  });
  await context.addInitScript(() => {
    localStorage.setItem('dkla.guide.v1', 'seen');
    // Every repeating timer the page starts, with its period.
    window.__intervals = [];
    const original = window.setInterval;
    window.setInterval = function (fn, ms, ...rest) {
      window.__intervals.push(Number(ms) || 0);
      return original.call(this, fn, ms, ...rest);
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.goto(address.href, { waitUntil: 'commit', timeout: 180_000 });
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 180_000 });
  await page.waitForFunction(() => window.DKLACalm && !window.DKLAData.state().lazy.length, null, {
    timeout: 240_000,
  });
  const layouts = async () =>
    (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'LayoutCount').value;
  // Lay-outs in a quiet stretch. Start-up work can still be finishing, so up to five stretches are
  // tried; a page that never rests fails all of them (before v3.2 it laid out 65 times a second).
  async function idleLayouts(ms = 2000) {
    let count = Infinity;
    for (let i = 0; i < 5 && count > 0; i++) {
      await sleep(1500);
      const before = await layouts();
      await sleep(ms);
      count = (await layouts()) - before;
    }
    return count;
  }
  return { context, page, errors, idleLayouts };
}

// What is animating without end, and on which properties.
const ambient = (page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.effect?.getTiming().iterations === Infinity && !a.effect.target?.closest?.('dialog'))
      .map((a) => ({
        name: a.animationName,
        state: a.playState,
        on: a.effect.target.className?.baseVal ?? a.effect.target.className,
        properties: [
          ...new Set(
            a.effect
              .getKeyframes()
              .flatMap((frame) => Object.keys(frame))
              .filter((key) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key)),
          ),
        ],
      })),
  );
// The transitions running on an element (or its backdrop) right now.
const moving = (page, selector, pseudo = null) =>
  page.evaluate(
    ({ selector, pseudo }) => {
      const el = document.querySelector(selector);
      return el
        ? el
            .getAnimations({ subtree: !!pseudo })
            .filter(
              (a) =>
                a.transitionProperty && (a.effect.pseudoElement || null) === pseudo && a.effect.target === el,
            )
            .map((a) => a.transitionProperty)
            .sort()
        : null;
    },
    { selector, pseudo },
  );
// Do something in the page and, in the same breath, read the transitions it started on an element
// (and on its backdrop). Reading from outside can arrive before the first frame or after a short
// transition is over.
const act = (page, selector, action) =>
  page.evaluate(
    ({ selector, action }) => {
      (0, eval)('(' + action + ')')();
      const el = document.querySelector(selector),
        style = getComputedStyle(el);
      const all = el
        .getAnimations({ subtree: true })
        .filter((a) => a.transitionProperty && a.effect.target === el);
      const of = (pseudo) =>
        all
          .filter((a) => (a.effect.pseudoElement || null) === pseudo)
          .map((a) => a.transitionProperty)
          .sort();
      return {
        own: of(null),
        backdrop: of('::backdrop'),
        display: style.display,
        pointer: style.pointerEvents,
        duration: style.transitionDuration,
        hidden: el.hidden,
      };
    },
    { selector, action: action.toString() },
  );
const settled = (page, selector) =>
  page.waitForFunction(
    (selector) => {
      const el = document.querySelector(selector);
      return el && el.getAnimations().filter((a) => a.transitionProperty).length === 0;
    },
    selector,
    { timeout: 5000 },
  );
const goHome = (page) =>
  page.evaluate(() => {
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    document.getElementById('closeInspector')?.click();
    home('Atlas', false, false);
  });

const { context, page, errors, idleLayouts } = await open();
const report = [];

/* ---------- 1. rest ---------- */
await page.waitForFunction(() => window.DKLAFuel?.state().calibrated, null, { timeout: 20_000 });
assert.equal(await idleLayouts(), 0, 'Home: no layout in 2 s of doing nothing');
let running = await ambient(page);
const names = running.map((a) => a.name).sort();
for (const expected of [
  'dkla-hud-copy',
  'dkla-hud-window',
  'dkla-splash-pulse',
  'ny-fuel-copy',
  'ny-fuel-window',
])
  assert.ok(names.includes(expected), `${expected} runs on Home (running: ${names})`);
for (const a of running) {
  assert.equal(a.state, 'running', `${a.name} is running`);
  assert.ok(
    a.properties.every((p) => p === 'transform' || p === 'opacity'),
    `${a.name} animates only transform and opacity, so the compositor runs it (${a.properties})`,
  );
}
assert.equal(
  await page.locator('animate, animateTransform, animateMotion, set').count(),
  0,
  'no SMIL animation',
);
const fast = await page.evaluate(() => window.__intervals.filter((ms) => ms < 1000));
assert.deepEqual(fast, [], 'no timer in the page repeats more often than once a second');
// The clock shows the time through sliding strips, and its text is never rewritten.
const readClock = () =>
  page.evaluate(() => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
        .formatToParts(new Date())
        .map((p) => [p.type, p.value]),
    );
    const cards = [...document.querySelectorAll('.ny-clock .ny-time .flip.big')];
    const shown = cards.map((card) => {
      const strip = card.querySelector('.half.top .ny-strip');
      return strip.textContent.split('\n')[Number(getComputedStyle(strip).getPropertyValue('--at'))];
    });
    const strip = cards[0].querySelector('.half.top .ny-strip'),
      one = strip.getBoundingClientRect().height / strip.textContent.split('\n').length;
    return {
      shown: shown.join(''),
      expected: parts.hour + parts.minute,
      line: one,
      card: cards[0].offsetHeight,
    };
  });
let clock = await readClock();
// A minute may turn over between the page's tick and this reading: look again.
for (let i = 0; i < 3 && clock.shown !== clock.expected; i++) {
  await sleep(1100);
  clock = await readClock();
}
assert.equal(clock.shown, clock.expected, "the clock's strips show the New York time");
assert.ok(
  Math.abs(clock.line - clock.card) < 0.6,
  `one character per card height (${clock.line} / ${clock.card})`,
);
report.push('Home lays nothing out at rest');

/* ---------- 6 (with a case open). the rail; rest with a case open ---------- */
await page.evaluate(() => (location.hash = 'node=citoh'));
await page.locator('#inspector .reader-body.v31-case .v31-chart-steps').waitFor({ timeout: 30_000 });
await page.locator('#inspector button[data-cold-call] .cc-cold-vapor.cc-on').waitFor({ timeout: 10_000 });
await settled(page, '#inspector');
assert.equal(await idleLayouts(), 0, 'a case open: no layout in 2 s of doing nothing');
running = await ambient(page);
const vapour = running.filter((a) => a.name === 'cc-vapor');
assert.ok(vapour.length >= 12, `the Cold Call vapour is ${vapour.length} drifting puffs`);
for (const a of running)
  assert.ok(
    a.properties.every((p) => p === 'transform' || p === 'opacity'),
    `${a.name}: ${a.properties}`,
  );
assert.equal(
  await page.locator('button[data-cold-call] canvas').count(),
  0,
  'no canvas is redrawn for the vapour',
);
report.push('a case open lays nothing out at rest');

await page.evaluate(() => {
  const reader = document.getElementById('inspector'),
    nav = reader.querySelector('.v31-rail'),
    i = [...nav.querySelectorAll('[data-v31-place]')].findIndex((b) => b.textContent === '3 Facts'),
    top = reader.getBoundingClientRect().top + reader.querySelector('.reader-top').offsetHeight;
  reader.scrollTop += nav.v31Targets[i].getBoundingClientRect().top - top - 120;
});
await page.waitForFunction(
  () => document.querySelector('#inspector .v31-rail [aria-current="location"]')?.textContent === '3 Facts',
  null,
  { timeout: 5000 },
);
// A rail click travels for about a quarter of a second, marks its place at once, and a wheel stops it.
const travel = await page.evaluate(
  () =>
    new Promise((done) => {
      const reader = document.getElementById('inspector'),
        start = reader.scrollTop,
        row = [...reader.querySelectorAll('.v31-rail [data-v31-place]')].find(
          (b) => b.textContent === 'Study',
        );
      row.click();
      const marked = reader.querySelector('.v31-rail [aria-current="location"]').textContent;
      // Three frames in, the visitor turns the wheel.
      let frames = 0;
      const frame = () => {
        if (++frames < 3) return requestAnimationFrame(frame);
        const partway = reader.scrollTop;
        reader.dispatchEvent(new WheelEvent('wheel', { deltaY: -40, bubbles: true }));
        setTimeout(
          () =>
            done({
              start,
              marked,
              partway,
              after: reader.scrollTop,
              end: reader.scrollHeight - reader.clientHeight,
            }),
          400,
        );
      };
      requestAnimationFrame(frame);
    }),
);
assert.equal(travel.marked, 'Study', 'the clicked place is marked at once');
assert.ok(
  travel.partway > travel.start,
  `the rail scroll is under way (${travel.start} → ${travel.partway})`,
);
assert.ok(
  travel.partway < travel.end - 200,
  `and takes more than three frames (${travel.partway} of ${travel.end})`,
);
assert.ok(
  Math.abs(travel.after - travel.partway) < 60,
  `a wheel during the rail scroll stops it (${travel.partway} → ${travel.after})`,
);
await page.locator('#inspector .v31-rail [data-v31-place]', { hasText: 'Study' }).click();
await page.waitForFunction(
  () => {
    const reader = document.getElementById('inspector');
    return reader.scrollTop >= reader.scrollHeight - reader.clientHeight - 2;
  },
  null,
  { timeout: 1500 },
);
await sleep(350);
report.push('the rail marks the part being read and scrolls briefly');

// A drawer: its contents are there at once (code may read them in the same breath), and they fade
// and settle in; its height is not animated (that would lay the reader out on every frame).
const drawer = await page.evaluate(
  () =>
    new Promise((done) => {
      const details =
        document.querySelector('#inspector details.v31-notes') ||
        document.querySelector('#inspector details');
      const closed = details.innerText.length;
      details.open = true;
      const style = getComputedStyle(details, '::details-content');
      const atOnce = {
        text: details.innerText.length,
        visibility: style.contentVisibility,
        opacity: Number(style.opacity),
      };
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const mid = Number(getComputedStyle(details, '::details-content').opacity);
          const height = getComputedStyle(details, '::details-content').transitionProperty;
          details.open = false;
          const shut = getComputedStyle(details, '::details-content').contentVisibility;
          done({ closed, atOnce, mid, height, shut, supported: CSS.supports('selector(::details-content)') });
        }),
      );
    }),
);
assert.ok(drawer.atOnce.text > drawer.closed, 'an opened drawer has its contents at once');
if (drawer.supported) {
  assert.equal(drawer.atOnce.visibility, 'visible');
  assert.ok(drawer.atOnce.opacity < 0.2, `a drawer's contents start faded (${drawer.atOnce.opacity})`);
  assert.ok(drawer.mid > 0 && drawer.mid < 1, `and fade in (${drawer.mid} two frames on)`);
  assert.ok(!/height/.test(drawer.height), 'a drawer does not animate its height');
  assert.equal(drawer.shut, 'hidden', 'a drawer shuts at once');
}

/* ---------- 5. press feedback ---------- */
async function press(selector, name, { scale = true } = {}) {
  const target = page.locator(selector).first();
  // In the middle of its scroller, clear of the sticky strip, and at rest there.
  await target.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sleep(120);
  const read = () =>
    target.evaluate((el) => {
      const style = getComputedStyle(el);
      return { scale: style.scale, filter: style.filter, active: el.matches(':active') };
    });
  const rest = await read();
  const at = await target.boundingBox();
  await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
  await page.mouse.down();
  await sleep(160);
  const down = await read();
  // Released off the control, so nothing is clicked.
  await page.mouse.move(2, 898);
  await page.mouse.up();
  const under = await page.evaluate(
    ([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el ? `${el.tagName}#${el.id}.${el.className}` : 'nothing';
    },
    [at.x + at.width / 2, at.y + at.height / 2],
  );
  assert.ok(down.active, `${name} is pressed on pointer-down (under the pointer: ${under})`);
  if (scale)
    assert.ok(
      Number(down.scale) < 1 && Number(down.scale) >= 0.95,
      `${name} shrinks when pressed (${down.scale})`,
    );
  assert.match(down.filter, /brightness\(0\.8/, `${name} darkens when pressed (${down.filter})`);
  assert.notDeepEqual({ scale: down.scale, filter: down.filter }, { scale: rest.scale, filter: rest.filter });
}
await press('#inspector button[data-cold-call]', 'the Cold Call button');
await press('#inspector .v31-rail [data-v31-place]', 'a rail row');
await press('#inspector .r18-recall .r18-chip', 'a study chip');
await press('#inspector .v31-route a.v31-route-step', 'a flowchart step link');
await press('#closeInspector', 'the reader close button');
await press('#moreBtn', 'the menu button');
await press('.study-header .ask-bar', 'the Ask Dottie button');
// One focus ring: Tab to a control and it wears the ring's two box-shadows.
await page.locator('#moreBtn').focus();
await page.keyboard.press('Shift+Tab');
await page.keyboard.press('Tab');
const ring = await page.evaluate(() => {
  const el = document.activeElement;
  return { id: el.id, visible: el.matches(':focus-visible'), shadow: getComputedStyle(el).boxShadow };
});
assert.ok(ring.visible, 'Tab gives keyboard focus');
assert.match(
  ring.shadow,
  /0px 0px 0px 2px.*0px 0px 0px 4px/,
  `the focus ring is the two-ring token (${ring.shadow})`,
);
assert.equal(
  await page.evaluate(() => getComputedStyle(document.documentElement).touchAction),
  'manipulation',
  'no double-tap delay',
);
report.push('controls answer a press');

/* ---------- 3. the reader, the menu, the search panel ---------- */
const leaving = await act(page, '#inspector', () => document.getElementById('closeInspector').click());
assert.equal(leaving.hidden, true);
assert.deepEqual(leaving.own, ['display', 'opacity', 'translate'], 'the reader has a way out');
assert.equal(leaving.display, 'block', 'the reader is still drawn while it leaves');
assert.equal(leaving.pointer, 'none', 'the leaving reader takes no clicks');
assert.match(leaving.duration, /^0\.24s/, 'the reader leaves in three-quarters of the time it arrives in');
// Opened again before it has gone: it comes back from where it is.
await page.evaluate(() => (location.hash = 'node=cp-pennoyer'));
await page.waitForFunction(() => !document.getElementById('inspector').hidden);
await settled(page, '#inspector');
assert.deepEqual(
  await page.evaluate(() => {
    const style = getComputedStyle(document.getElementById('inspector'));
    return [style.opacity, style.translate, style.display];
  }),
  ['1', 'none', 'block'],
);
await goHome(page);
await page.waitForFunction(() => getComputedStyle(document.getElementById('inspector')).display === 'none');

const menuIn = await act(page, '#moreMenu', () => document.getElementById('moreBtn').click());
assert.equal(menuIn.hidden, false);
assert.deepEqual(menuIn.own, ['opacity', 'translate'], 'the menu drops in');
// A second click in the middle of the way in reverses it from where it is (a reversed transition
// lasts only as long as the way in had got, so it is read in the same breath as the click).
await page.waitForFunction(
  () => Number(getComputedStyle(document.getElementById('moreMenu')).opacity) > 0.6,
  null,
  {
    polling: 'raf',
  },
);
const menuOut = await page.evaluate(() => {
  const menu = document.getElementById('moreMenu');
  document.getElementById('moreBtn').click();
  const style = getComputedStyle(menu);
  return {
    hidden: menu.hidden,
    display: style.display,
    pointer: style.pointerEvents,
    moving: menu
      .getAnimations()
      .map((a) => a.transitionProperty)
      .filter(Boolean)
      .sort(),
  };
});
assert.equal(menuOut.hidden, true);
assert.deepEqual(menuOut.moving, ['display', 'opacity', 'translate'], 'the menu has a way out');
assert.notEqual(menuOut.display, 'none', 'the menu is still drawn while it leaves');
assert.equal(menuOut.pointer, 'none', 'the leaving menu takes no clicks');
await page.waitForFunction(() => getComputedStyle(document.getElementById('moreMenu')).display === 'none');

await page.click('#search');
await page.keyboard.type('per');
await page.waitForFunction(() => !document.getElementById('searchResults').hidden, null, { timeout: 10_000 });
await settled(page, '#searchResults');
await page.keyboard.type('sonal', { delay: 60 });
await sleep(60);
assert.deepEqual(await moving(page, '#searchResults'), [], 'typing more does not replay the search panel');
assert.deepEqual(
  await page.evaluate(() =>
    document
      .getElementById('searchResults')
      .getAnimations()
      .map((a) => a.animationName),
  ),
  [],
);
const searchOut = await act(page, '#searchResults', () => closeSearch());
assert.deepEqual(searchOut.own, ['display', 'opacity', 'translate'], 'the search panel has a way out');
assert.equal(searchOut.pointer, 'none', 'the leaving search panel takes no clicks');
await page.waitForFunction(
  () => getComputedStyle(document.getElementById('searchResults')).display === 'none',
);
await page.evaluate(() => document.activeElement?.blur());
report.push('reader, menu and search arrive and leave');

/* ---------- 2. ambient motion stands still under a dialog ---------- */
await page.evaluate(() => window.DKLATimelines.open(window.DKLATimelines.list()[0].id));
await page.locator('#r21Timelines[open]').waitFor();
assert.ok(await page.evaluate(() => document.documentElement.classList.contains('dkla-ambient-off')));
running = await ambient(page);
assert.ok(running.length >= 4, `the ambient animations are still there (${running.map((a) => a.name)})`);
assert.deepEqual(
  running.filter((a) => a.state !== 'paused').map((a) => a.name),
  [],
  'nothing ambient runs while a dialog is open',
);
assert.equal(
  await page.evaluate(() => document.querySelectorAll('.ny-clock .flip.flipping').length),
  0,
  'the clock does not flip under a dialog',
);
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.documentElement.classList.contains('dkla-ambient-off'));
running = await ambient(page);
assert.deepEqual(
  running.filter((a) => a.state !== 'running').map((a) => a.name),
  [],
  'ambient motion starts again when the dialog closes',
);
// The same while the map is being moved: a wheel turn over it, and for 0.3 s after.
const mapBox = await page.locator('#geoCanvas').boundingBox();
await page.mouse.move(mapBox.x + mapBox.width * 0.5, mapBox.y + mapBox.height * 0.2);
await page.mouse.wheel(0, -120);
await page.waitForFunction(() => document.documentElement.classList.contains('dkla-ambient-off'), null, {
  polling: 'raf',
  timeout: 3000,
});
await page.mouse.wheel(0, 120);
await page.waitForFunction(() => !document.documentElement.classList.contains('dkla-ambient-off'), null, {
  timeout: 5000,
});
await goHome(page);
report.push('ambient motion pauses under a dialog and while the map moves');

/* ---------- 3. every dialog ---------- */
// The dialogs the atlas builds on first use, opened once so that they exist.
const builders = [
  () => page.evaluate(() => (location.hash = 'term=consideration')),
  () => page.evaluate(() => (location.hash = 'flowchart=K-16&step=c&from=citoh')),
  () => page.click('.study-header .ask-bar'),
  async () => {
    await page.click('#moreBtn');
    await page.locator('#moreMenu [data-canons-menu]').click();
  },
];
for (const build of builders) {
  await build();
  await sleep(700);
  await page.evaluate(() => {
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  });
  await sleep(350);
}
await page.evaluate(() => {
  history.replaceState(null, '', location.pathname);
  document.querySelectorAll('dialog').forEach((dialog, i) => (dialog.dataset.calmCheck = String(i)));
});
const dialogs = await page.evaluate(() =>
  [...document.querySelectorAll('dialog')].map((dialog) => ({
    key: dialog.dataset.calmCheck,
    id: dialog.id || dialog.className,
  })),
);
assert.ok(dialogs.length >= 10, `the page has its dialogs (${dialogs.map((d) => d.id)})`);
for (const { key, id } of dialogs) {
  const selector = `dialog[data-calm-check="${key}"]`;
  await page.waitForFunction(
    (s) => getComputedStyle(document.querySelector(s)).display === 'none',
    selector,
    {
      timeout: 5000,
    },
  );
  const arriving = await act(page, selector, `() => document.querySelector('${selector}').showModal()`);
  for (const property of ['opacity', 'scale'])
    assert.ok(
      arriving.own.includes(property),
      `${id} arrives with a ${property} transition (${arriving.own})`,
    );
  assert.deepEqual(arriving.backdrop, ['opacity'], `${id}: its scrim fades in`);
  const scrim = await page.evaluate((s) => {
    const style = getComputedStyle(document.querySelector(s), '::backdrop');
    return { colour: style.backgroundColor, blur: style.backdropFilter };
  }, selector);
  assert.equal(scrim.colour, 'rgba(5, 11, 17, 0.72)', `${id} uses the one scrim`);
  assert.equal(scrim.blur, 'none', `${id}: no blur behind the dialog`);
  // Esc in the middle of the way in (once the dialog is more than half shown: a reversed
  // transition takes only as long as the way in had got, so an earlier Esc is over in a frame or two).
  await page.waitForFunction(
    (s) => Number(getComputedStyle(document.querySelector(s)).opacity) > 0.6,
    selector,
    {
      polling: 'raf',
      timeout: 5000,
    },
  );
  // What the dialog looks like at the moment it closes is read inside the page, on its close event:
  // a reversed transition is short, and a look from outside can arrive after it is over.
  await page.evaluate((s) => {
    const dialog = document.querySelector(s);
    window.__closing = new Promise((done) =>
      dialog.addEventListener(
        'close',
        () => {
          const style = getComputedStyle(dialog);
          done({
            open: dialog.open,
            display: style.display,
            pointer: style.pointerEvents,
            opacity: Number(style.opacity),
            ambientOff: document.documentElement.classList.contains('dkla-ambient-off'),
            leaving: dialog
              .getAnimations()
              .map((a) => a.transitionProperty)
              .filter(Boolean),
          });
        },
        { once: true },
      ),
    );
  }, selector);
  await page.keyboard.press('Escape');
  const closing = await page.evaluate(() => window.__closing);
  assert.equal(closing.open, false, `${id}: Esc during the way in closes it at once`);
  assert.equal(closing.pointer, 'none', `${id} takes no clicks once closed`);
  assert.equal(closing.ambientOff, false, `${id}: the page is live again at once`);
  // The way out, read in the same breath as the close (on a busy machine the key press above can
  // land after the way in is over, and a reversed transition is short).
  await page.waitForFunction(
    (s) => getComputedStyle(document.querySelector(s)).display === 'none',
    selector,
    {
      timeout: 5000,
    },
  );
  const out = await page.evaluate(
    (s) =>
      new Promise((done) => {
        const dialog = document.querySelector(s);
        dialog.showModal();
        const look = () => {
          if (Number(getComputedStyle(dialog).opacity) < 0.6) return requestAnimationFrame(look);
          dialog.close();
          const style = getComputedStyle(dialog);
          done({
            display: style.display,
            opacity: Number(style.opacity),
            leaving: dialog
              .getAnimations()
              .map((a) => a.transitionProperty)
              .filter(Boolean),
          });
        };
        requestAnimationFrame(look);
      }),
    selector,
  );
  assert.notEqual(out.display, 'none', `${id} is still drawn while it leaves`);
  assert.ok(out.opacity >= 0.6, `${id} leaves from where it had got to (${out.opacity})`);
  for (const property of ['opacity', 'scale', 'display', 'overlay'])
    assert.ok(out.leaving.includes(property), `${id} leaves with a ${property} transition (${out.leaving})`);
}
report.push(`${dialogs.length} dialogs fade and scale in and out on one scrim`);

/* ---------- 5. a map tile ---------- */
await goHome(page);
await sleep(1200);
const tile = await page.evaluate(() => {
  const candidates = [...document.querySelectorAll('#geoCanvas [data-map-region]')];
  for (const el of candidates) {
    const q = el.getBoundingClientRect(),
      x = q.left + q.width / 2,
      y = q.top + q.height / 2;
    if (q.width > 30 && document.elementFromPoint(x, y)?.closest('[data-map-region]') === el) {
      el.dataset.calmTile = '1';
      return { x, y };
    }
  }
  return null;
});
assert.ok(tile, 'a map tile to press');
await page.mouse.move(tile.x, tile.y);
await page.mouse.down();
await sleep(60);
const pressedTile = await page.evaluate(() => {
  const el = [...document.querySelectorAll('#geoCanvas :active')].at(-1);
  return el ? getComputedStyle(el).filter : 'nothing is :active';
});
await page.mouse.up();
assert.match(pressedTile, /brightness\(0\.86\)/, `a map tile darkens on pointer-down (${pressedTile})`);
await goHome(page);

/* ---------- 7. a "Loading…" line ---------- */
await page.evaluate(() => (location.hash = 'term=consideration'));
await page.locator('#glossaryDialog[open]').waitFor();
await sleep(400);
await page.evaluate(() => {
  const line = document.createElement('p');
  line.id = 'calmCheckLine';
  line.setAttribute('role', 'status');
  line.textContent = 'Loading the dictionary…';
  document.querySelector('#glossaryDialog .gl-body').prepend(line);
  window.__lineAt = performance.now();
});
await page.waitForFunction(() => document.getElementById('calmCheckLine').classList.contains('calm-wait'));
const early = await page.evaluate(() => ({
  ms: performance.now() - window.__lineAt,
  opacity: Number(getComputedStyle(document.getElementById('calmCheckLine')).opacity),
}));
if (early.ms < 140)
  assert.equal(early.opacity, 0, `nothing shows for the first 150 ms (at ${Math.round(early.ms)} ms)`);
await sleep(450);
const skeleton = await page.evaluate(() => {
  const line = document.getElementById('calmCheckLine'),
    style = getComputedStyle(line);
  return {
    opacity: style.opacity,
    words: line.textContent,
    textShown: style.fontSize !== '0px' && style.color !== 'rgba(0, 0, 0, 0)',
    bars: style.backgroundImage.split('gradient').length - 1,
    height: line.offsetHeight,
  };
});
assert.equal(skeleton.opacity, '1', 'then the skeleton shows');
assert.equal(skeleton.words, 'Loading the dictionary…', 'the words stay for screen readers');
assert.equal(skeleton.textShown, false, 'the words are not drawn');
assert.ok(skeleton.bars >= 3 && skeleton.height >= 60, 'three bars where the text will be');
await page.evaluate(
  () => (document.getElementById('calmCheckLine').textContent = 'The dictionary could not be loaded.'),
);
await page.waitForFunction(() => !document.getElementById('calmCheckLine').classList.contains('calm-wait'));
await page.evaluate(() => {
  document.getElementById('calmCheckLine').remove();
  document.getElementById('glossaryDialog').close();
});
report.push('a Loading line waits 150 ms, then is a skeleton');

assert.deepEqual(errors, []);
await context.close();

/* ---------- 4. reduced motion ---------- */
const calm = await open({ reducedMotion: 'reduce' });
running = await ambient(calm.page);
assert.deepEqual(
  running.filter((a) => a.state === 'running').map((a) => a.name),
  [],
  'reduced motion: nothing ambient runs',
);
await calm.page.evaluate(() => window.DKLATimelines.open(window.DKLATimelines.list()[0].id));
assert.deepEqual(await moving(calm.page, '#r21Timelines'), [], 'reduced motion: the dialog simply appears');
assert.deepEqual(await moving(calm.page, '#r21Timelines', '::backdrop'), []);
await calm.page.keyboard.press('Escape');
assert.equal(
  await calm.page.evaluate(() => getComputedStyle(document.getElementById('r21Timelines')).display),
  'none',
  'reduced motion: the dialog simply goes',
);
await calm.page.click('#moreBtn');
assert.deepEqual(await moving(calm.page, '#moreMenu'), []);
await calm.page.keyboard.press('Escape');
await calm.page.evaluate(() => (location.hash = 'node=citoh'));
await calm.page.waitForFunction(() => !document.getElementById('inspector').hidden);
assert.deepEqual(await moving(calm.page, '#inspector'), []);
await calm.page.locator('#inspector .v31-rail [data-v31-place]', { hasText: '5 Holding' }).waitFor();
const y0 = await calm.page.evaluate(() => document.getElementById('inspector').scrollTop);
await calm.page.locator('#inspector .v31-rail [data-v31-place]', { hasText: '5 Holding' }).click();
const y1 = await calm.page.evaluate(() => document.getElementById('inspector').scrollTop);
assert.ok(y1 > y0 + 400, 'reduced motion: a rail click jumps');
await calm.page.evaluate(() => document.getElementById('closeInspector').click());
assert.equal(
  await calm.page.evaluate(() => getComputedStyle(document.getElementById('inspector')).display),
  'none',
);
assert.deepEqual(calm.errors, []);
await calm.context.close();
report.push('reduced motion removes all of it');

await browser.close();
console.log('Calm: ' + report.join('; ') + '.');
