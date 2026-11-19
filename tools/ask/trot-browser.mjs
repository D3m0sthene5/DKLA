/* The Ask Dottie thinking spinner's running opossums, in a real browser (v3.2).

     node tools/ask/trot-browser.mjs http://127.0.0.1:8766/DKLA-v3.1.html     the built app
     node tools/ask/trot-browser.mjs --source                                 the two source files in a
                                                                              bare page: no build needed

   The spinner is a rig moved by the browser's animation engine (dottie.js, tools/ask/run-cycle.mjs).
   This check measures what the browser does with it, at 96 px and 1x:

   1. Smooth. With the spinner running there is one endless animation per part, every one of them on
      transform alone with 24 poses a stride, and the main thread does nothing for it: no style
      recalculation and no layout in 1.5 s (Chromium's own counters), no timer and no animation-frame
      callback. That is what "runs on the compositor at the screen's refresh rate" means.
   2. No skating. Every paw is followed through a stride at 96 instants (and through the start, where
      the opossums speed up from a standstill): while it is on the ground it stays within 0.3 px of
      its spot on the screen, though the ring carries its owner 28 px on.
   3. It is a trot with weight: diagonal pairs land together, half a stride apart, each foot down for
      about three eighths of the stride, all four off the ground for a moment in each half; the body
      rises and falls and is squashed and stretched without changing volume; the head bobs less than
      the body.
   4. It starts gently (a third of a stride in the first half of the start) and the laps follow the
      start without a jump.
   5. It rests: paused in a hidden tab and in step when the tab returns; nothing at all running when
      its dialog is closed, when it is taken off the page (bar a copy that slows, fades and removes
      itself within half a second), or under reduced motion, where the three stand on all four paws
      and the spinner only pulses. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { mount, openBare } from './spinner-page.mjs';

// The table of poses in dottie.js is exactly what the generator makes from the rig and the gait.
{
  const { block } = await import('./run-cycle.mjs');
  const artwork = await readFile(new URL('../../src/features/ask/dottie.js', import.meta.url), 'utf8');
  assert.ok(
    artwork.includes(block()),
    'src/features/ask/dottie.js does not hold the run cycle tools/ask/run-cycle.mjs makes: run it, do not edit the table by hand',
  );
}

const source = process.argv.includes('--source');
const address = source ? null : new URL(process.argv[2]);
if (address) assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const browser = await chromium.launch();
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function open({ reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    colorScheme: 'dark',
    reducedMotion,
  });
  if (address)
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      // The question is never answered, so she stays researching until the check cancels.
      if (url.origin === address.origin && url.pathname === '/api/ask') return;
      return url.origin !== address.origin || url.pathname.startsWith('/api/')
        ? route.fulfill({ status: 204, body: '' })
        : route.continue();
    });
  await context.addInitScript(() => {
    localStorage.setItem('dkla.guide.v1', 'seen');
    // Every timer and animation-frame callback the page asks for, with the time it was asked.
    window.__asked = [];
    for (const name of ['setInterval', 'setTimeout', 'requestAnimationFrame']) {
      const original = window[name];
      window[name] = function (fn, ms, ...rest) {
        window.__asked.push({ name, ms: Number(ms) || 0, at: performance.now() });
        return original.call(this, fn, ms, ...rest);
      };
    }
    // A tab that can be "hidden" from the check.
    let hidden = false;
    Object.defineProperty(Document.prototype, 'hidden', { get: () => hidden });
    Object.defineProperty(Document.prototype, 'visibilityState', {
      get: () => (hidden ? 'hidden' : 'visible'),
    });
    window.__hide = (to) => {
      hidden = to;
      document.dispatchEvent(new Event('visibilitychange'));
    };
    /* What the check reads. Every position comes from the browser's computed transforms: the
       ring's, the opossum's and the part's, multiplied. A part's joint is at the centre of the
       spinner before any transform, so the product's translation is where the joint is drawn. */
    window.__spinner = () => document.querySelector('#dklaAskDialog .ask-dottie .dottie-spinner');
    window.__moving = (scope = window.__spinner()) =>
      document.getAnimations().filter((a) => scope && scope.contains(a.effect?.target));
    window.__seek = (ms) => {
      for (const animation of window.__moving()) {
        animation.pause();
        animation.currentTime = ms;
      }
    };
    window.__read = () => {
      const spinner = window.__spinner();
      const matrix = (element) => new DOMMatrix(getComputedStyle(element).transform);
      const ring = matrix(spinner.querySelector('.dottie-ring'));
      return {
        ring: (Math.atan2(ring.b, ring.a) * 180) / Math.PI,
        runners: [...spinner.querySelectorAll('.dottie-runner')].map((runner) => {
          const carried = ring.multiply(matrix(runner));
          const parts = {};
          for (const part of runner.children) {
            const own = matrix(part);
            const drawn = carried.multiply(own);
            parts[part.dataset.part] = {
              x: drawn.e,
              y: drawn.f,
              out: Math.hypot(own.e, own.f), // its distance from the centre of the ring
              long: Math.hypot(own.a, own.b),
              tall: Math.hypot(own.c, own.d),
            };
          }
          return parts;
        }),
      };
    };
  });
  // The bare page (spinner-page.mjs) or the built app.
  const page = source ? await openBare(context) : await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const counters = async () =>
    Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  if (!source) {
    await page.goto(address.href, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.locator('html.dkla-boot-ready').waitFor({ timeout: 120_000 });
  }
  // Put her to work, and send her away, the way the dialog does.
  const research = async () => {
    if (source) await mount(page);
    else {
      await page.evaluate(() => {
        const dialog = document.getElementById('dklaAskDialog');
        if (!dialog.open) dialog.showModal();
      });
      await page.locator('#dklaAskQuestion').fill('Is the spinner smooth?');
      await page.locator('#dklaAskQuestion').press('Enter');
    }
    await page.locator('#dklaAskDialog .ask-progress .ask-dottie .dottie-spinner').waitFor();
  };
  const dismiss = () =>
    source
      ? page.evaluate(() => document.querySelector('#dklaAskDialog .ask-dottie').remove())
      : page.locator('#dklaAskDialog .ask-cancel').click();
  const shut = (closed) =>
    page.evaluate(
      ({ closed, source }) => {
        const dialog = document.getElementById('dklaAskDialog');
        if (source) dialog.style.display = closed ? 'none' : 'block';
        else if (closed) dialog.close();
        else dialog.showModal();
      },
      { closed, source },
    );
  return { context, page, errors, counters, research, dismiss, shut };
}

const { context, page, errors, counters, research, dismiss, shut } = await open();
const run = await page.evaluate(() => {
  const { ms, keys, strides, ground, feet, lap, start } = window.DKLADottie.run;
  return { ms, keys, strides, ground, feet, lap, start };
});
const SIZE = 96;
const groundPx = (run.ground / 100) * SIZE;
const PAWS = ['nhPaw', 'ffPaw', 'fhPaw', 'nfPaw'];
const seek = (ms) => page.evaluate((ms) => window.__seek(ms), ms);
const read = () => page.evaluate(() => window.__read());
const moving = () =>
  page.evaluate(() =>
    window.__moving().map((a) => ({
      state: a.playState,
      part: a.effect.target.dataset.part ?? a.effect.target.className,
      endless: a.effect.getTiming().iterations === Infinity,
      duration: a.effect.getTiming().duration,
      poses: a.effect.getKeyframes().length,
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

/* Follow every paw through `count` instants from `from` to `to` (ms on the animations' own clock).
   A paw is on the ground when it is as far from the centre as the ground is; each unbroken run of
   such instants is one stance, and its drift is how far apart its drawn positions get. `whole`
   marks a stance seen from landing to leaving. */
async function stances(from, to, count) {
  const samples = [];
  for (let i = 0; i < count; i++) {
    await seek(from + ((to - from) * i) / count);
    samples.push(await read());
  }
  const found = [];
  samples[0].runners.forEach((_, r) => {
    for (const paw of PAWS) {
      let current = null;
      for (let i = 0; i <= count; i++) {
        const at = i < count ? samples[i].runners[r][paw] : null;
        if (at && at.out >= groundPx - 0.02) {
          current ??= { runner: r, paw, first: i, length: 0, xs: [], ys: [] };
          current.length++;
          current.xs.push(at.x);
          current.ys.push(at.y);
        } else if (current) {
          current.drift = Math.hypot(
            Math.max(...current.xs) - Math.min(...current.xs),
            Math.max(...current.ys) - Math.min(...current.ys),
          );
          current.whole = current.first > 0 && i < count;
          found.push(current);
          current = null;
        }
      }
    }
  });
  return { samples, found };
}

// ---------- 4a. the start: from a standstill, and no skating on the way ----------
await research();
// Hold it at once; the start lasts three quarters of a second.
await seek(0);
let now = await moving();
assert.equal(now.length, 55, 'the start: one animation for the ring and one for each of 54 parts');
assert.ok(
  now.every((a) => a.properties.join() === 'transform'),
  'the start animates transform alone',
);
const turnAt = async (ms) => {
  await seek(ms);
  return -(await read()).ring;
};
const stride = 360 / run.strides;
const early = await turnAt(run.start * 0.05);
const half = await turnAt(run.start / 2);
const late = await turnAt(run.start - 0.01);
assert.ok(early < stride * 0.01, `she starts from a standstill (${early.toFixed(2)}° in the first 5%)`);
assert.ok(
  half > stride * 0.2 && half < stride * 0.4,
  `half way through the start she has run a third of a stride, not half (${(half / stride).toFixed(2)})`,
);
assert.ok(Math.abs(late - stride) < 0.05, `the start covers one stride (${late.toFixed(2)}° of ${stride}°)`);
const starting = await stances(0, run.start - 0.01, 72);
const startDrift = Math.max(...starting.found.map((s) => s.drift));
assert.ok(starting.found.length >= 12, 'every paw is on the ground at some time in the start');
assert.ok(startDrift < 0.3, `planted paws do not slide while she speeds up (${startDrift.toFixed(3)} px)`);

// ---------- 4b. the laps take over without a jump ----------
const before = await (async () => {
  await seek(run.start - 0.01);
  return read();
})();
await page.evaluate(() => {
  for (const animation of window.__moving()) animation.finish();
});
await page.waitForFunction(() => window.__moving().some((a) => a.effect.getTiming().iterations === Infinity));
await seek(0);
const after = await read();
let jump = 0;
before.runners.forEach((runner, r) => {
  for (const [name, part] of Object.entries(runner))
    jump = Math.max(jump, Math.hypot(part.x - after.runners[r][name].x, part.y - after.runners[r][name].y));
});
assert.ok(
  jump < 0.1,
  `the first pose of the laps is the last pose of the start (${jump.toFixed(3)} px apart)`,
);

// ---------- 1. smooth: endless, transform only, and no work on the main thread ----------
now = await moving();
assert.equal(now.length, 55, 'the laps: one animation for the ring and one for each of 54 parts');
for (const a of now) {
  assert.ok(a.endless, `${a.part} runs without end`);
  assert.deepEqual(a.properties, ['transform'], `${a.part} animates transform alone`);
}
const ring = now.find((a) => /dottie-ring/.test(a.part));
const parts = now.filter((a) => a !== ring);
assert.ok(
  parts.every((a) => a.poses === run.keys + 1 && a.duration === run.ms),
  `every part has ${run.keys} poses a stride of ${run.ms} ms`,
);
assert.equal(ring.duration, run.strides * run.ms, 'the ring turns once in a whole number of strides');
assert.equal(
  await page
    .locator('#dklaAskDialog .dottie-spinner')
    .locator('animate, animateTransform, animateMotion, set')
    .count(),
  0,
  'no SMIL',
);
// Let it run, wait for it to settle on the compositor, then count what the main thread does.
await page.evaluate(() => {
  const at = document.timeline.currentTime;
  for (const animation of window.__moving()) animation.startTime = at;
});
await sleep(600);
const idle = async (ms) => {
  // The dialog changes its line of words every 2 s; up to three tries find a stretch without it.
  let best = null;
  for (let attempt = 0; attempt < 3 && !(best && best.styles === 0 && best.layouts === 0); attempt++) {
    await page.evaluate(() => (window.__asked.length = 0));
    const a = await counters();
    await sleep(ms);
    const b = await counters();
    const asked = await page.evaluate(() =>
      window.__asked.filter((t) => t.name === 'requestAnimationFrame' || t.ms < 1000),
    );
    const here = {
      styles: b.RecalcStyleCount - a.RecalcStyleCount,
      layouts: b.LayoutCount - a.LayoutCount,
      busy: b.TaskDuration - a.TaskDuration,
      asked,
    };
    if (!best || here.styles < best.styles) best = here;
  }
  return best;
};
const quiet = await idle(1500);
assert.equal(
  quiet.styles,
  0,
  `no style recalculation in 1.5 s of running (${quiet.styles}): the compositor runs it`,
);
assert.equal(quiet.layouts, 0, 'no layout in 1.5 s of running');
assert.deepEqual(
  quiet.asked.filter((t) => t.name === 'requestAnimationFrame'),
  [],
  'no animation-frame callback while it runs',
);
assert.deepEqual(
  quiet.asked.filter((t) => t.name !== 'requestAnimationFrame'),
  [],
  'no timer faster than once a second while it runs',
);
assert.ok(
  (await moving()).every((a) => a.state === 'running'),
  'all 55 are running',
);

// ---------- 2 and 3. one stride, instant by instant ----------
const base = run.lap; // one lap in: any time will do
const PER = 96; // instants a stride
const twoStrides = await stances(base, base + 2 * run.ms, 2 * PER);
const drift = Math.max(...twoStrides.found.map((s) => s.drift));
const whole = twoStrides.found.filter((s) => s.whole);
// The first whole stance of each paw; in two strides every paw has one.
const stridePass = {
  samples: twoStrides.samples.slice(0, PER),
  found: [0, 1, 2].flatMap((r) => PAWS.map((paw) => whole.find((s) => s.runner === r && s.paw === paw))),
};
assert.ok(stridePass.found.every(Boolean), 'each of the twelve paws lands and leaves within two strides');
assert.ok(
  drift < 0.3,
  `a planted paw stays on its spot (worst drift ${drift.toFixed(3)} px; the limit is 0.3)`,
);
// The same paw's owner has meanwhile been carried on: the lock is real, not a still picture.
const carried = (run.ms / run.lap) * 2 * Math.PI * groundPx;
assert.ok(carried > 25, `the ring carries her ${carried.toFixed(1)} px a stride`);
const reach = Math.max(
  ...PAWS.map((paw) => {
    const xs = stridePass.samples.map((s) => s.runners[0][paw].out);
    return Math.max(...xs) - Math.min(...xs);
  }),
);
assert.ok(reach > 3, `paws are lifted clear of the ground in the air (${reach.toFixed(1)} px)`);
for (const stance of stridePass.found) {
  const share = stance.length / PER;
  assert.ok(
    share > 0.33 && share < 0.42,
    `${stance.paw} is down for about 3/8 of the stride (${share.toFixed(2)})`,
  );
}
const landedAt = (r, paw) => (stridePass.found.find((s) => s.runner === r && s.paw === paw).first / PER) % 1;
for (let r = 0; r < 3; r++) {
  const gap = (a, b) => (((landedAt(r, b) - landedAt(r, a)) % 1) + 1) % 1;
  assert.ok(
    gap('nhPaw', 'ffPaw') < 0.09,
    `near hind and far fore land together (${gap('nhPaw', 'ffPaw').toFixed(2)})`,
  );
  assert.ok(
    gap('fhPaw', 'nfPaw') < 0.09,
    `far hind and near fore land together (${gap('fhPaw', 'nfPaw').toFixed(2)})`,
  );
  assert.ok(
    Math.abs(gap('nhPaw', 'fhPaw') - 0.5) < 0.03,
    `the two pairs are half a stride apart (${gap('nhPaw', 'fhPaw').toFixed(2)})`,
  );
  const airborne = stridePass.samples.filter((s) =>
    PAWS.every((paw) => s.runners[r][paw].out < groundPx - 0.02),
  );
  const air = airborne.length / PER;
  assert.ok(
    air > 0.08 && air < 0.25,
    `all four feet are off the ground for a moment in each half (${air.toFixed(2)} of the stride)`,
  );
}
const range = (pick) => {
  const values = stridePass.samples.map((s) => pick(s.runners[0]));
  return Math.max(...values) - Math.min(...values);
};
const bob = range((runner) => runner.body.out);
const headBob = range((runner) => runner.head.out);
assert.ok(bob > 1.8, `the body rises and falls (${bob.toFixed(2)} px)`);
assert.ok(
  headBob < bob * 0.75,
  `the head is steadier than the body (${headBob.toFixed(2)} px against ${bob.toFixed(2)})`,
);
const tall = range((runner) => runner.body.tall);
assert.ok(tall > 0.06 && tall < 0.16, `squash and stretch, a few percent (${(tall * 100).toFixed(1)}%)`);
for (const sample of stridePass.samples) {
  const volume = sample.runners[0].body.long * sample.runners[0].body.tall;
  assert.ok(Math.abs(volume - 1) < 0.012, `squash keeps her volume (${volume.toFixed(3)})`);
}
// The three are a third of a stride apart, so they step in the same places.
for (let r = 1; r < 3; r++) {
  const on = (((landedAt(0, 'nhPaw') - landedAt(r, 'nhPaw')) % 1) + 1) % 1;
  assert.ok(Math.abs(on - r / 3) < 0.03, `opossum ${r + 1} is ${r}/3 of a stride on (${on.toFixed(2)})`);
}

// ---------- 5a. a hidden tab pauses it; it comes back in step ----------
await page.evaluate(() => {
  const at = document.timeline.currentTime;
  for (const animation of window.__moving()) animation.startTime = at;
});
await sleep(150);
await page.evaluate(() => window.__hide(true));
const held = await page.evaluate(() => window.__moving().map((a) => [a.playState, a.currentTime]));
assert.ok(held.length === 55 && held.every(([state]) => state === 'paused'), 'hidden tab: all 55 paused');
assert.equal(new Set(held.map(([, at]) => at)).size, 1, 'hidden tab: all paused at the same instant');
await sleep(300);
assert.deepEqual(
  await page.evaluate(() => window.__moving().map((a) => [a.playState, a.currentTime])),
  held,
  'hidden tab: nothing moves',
);
await page.evaluate(() => window.__hide(false));
const back = await page.evaluate(() => window.__moving().map((a) => [a.playState, a.currentTime]));
assert.ok(
  back.every(([state]) => state === 'running'),
  'the tab is back: all running',
);
assert.ok(
  Math.max(...back.map(([, at]) => at)) - Math.min(...back.map(([, at]) => at)) < 0.001,
  'the tab is back: all still on one clock',
);

// ---------- 5b. a closed dialog: nothing running; open again: running ----------
await shut(true);
await page.waitForFunction(() => window.__moving().length === 0, null, { timeout: 5000 });
assert.equal(
  await page.evaluate(
    () => document.getAnimations().filter((a) => a.effect?.target?.closest?.('.dottie-spinner')).length,
  ),
  0,
  'dialog closed: no animation is left running',
);
await shut(false);
await page.waitForFunction(() => window.__moving().length === 55, null, { timeout: 5000 });

// ---------- 5c. taken off the page: a copy slows, fades and removes itself ----------
await page.waitForFunction(() => window.__moving().some((a) => a.effect.getTiming().iterations === Infinity));
await sleep(200);
const copy = await page.evaluate((source) => {
  // Note exactly where she is and how she stands, then send her away in the same breath.
  const spinner = window.__spinner();
  const was = spinner.getBoundingClientRect().toJSON();
  const at = window.__moving()[0].currentTime;
  window.__seek(at);
  const pose = window.__read();
  const now = document.timeline.currentTime;
  for (const animation of window.__moving()) animation.startTime = now - at;
  if (source) document.querySelector('#dklaAskDialog .ask-dottie').remove();
  else document.querySelector('#dklaAskDialog .ask-cancel').click();
  const copy = document.querySelector('#dklaAskDialog .ask-progress > .dottie-leaving');
  if (!copy) return null;
  const moving = document.getAnimations().filter((a) => copy.contains(a.effect.target));
  const box = copy.getBoundingClientRect().toJSON();
  // Where its parts are drawn at its first instant, against where hers were.
  for (const animation of moving) {
    animation.pause();
    animation.currentTime = 0;
  }
  const matrix = (element) => new DOMMatrix(getComputedStyle(element).transform);
  const ring = matrix(copy.querySelector('.dottie-ring'));
  let apart = 0;
  [...copy.querySelectorAll('.dottie-runner')].forEach((runner, r) => {
    const carried = ring.multiply(matrix(runner));
    for (const part of runner.children) {
      const drawn = carried.multiply(matrix(part));
      const before = pose.runners[r][part.dataset.part];
      apart = Math.max(apart, Math.hypot(drawn.e - before.x, drawn.f - before.y));
    }
  });
  // And where they are at its last: she has run on, and slowed to nothing.
  const turn = () =>
    (Math.atan2(matrix(copy.querySelector('.dottie-ring')).b, matrix(copy.querySelector('.dottie-ring')).a) *
      180) /
    Math.PI;
  const turns = [0, 0.5, 0.9, 1].map((share) => {
    for (const animation of moving) animation.currentTime = share * animation.effect.getTiming().duration;
    return turn();
  });
  const fade = moving.find((a) => a.effect.target === copy);
  const out = {
    was,
    box,
    apart,
    turns,
    count: moving.length,
    longest: Math.max(...moving.map((a) => a.effect.getTiming().duration)),
    properties: [
      ...new Set(moving.flatMap((a) => a.effect.getKeyframes().flatMap((f) => Object.keys(f)))),
    ].filter((key) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key)),
    fades: fade?.effect.getKeyframes().map((f) => f.opacity),
    hidden: copy.getAttribute('aria-hidden'),
    clicks: getComputedStyle(copy).pointerEvents,
  };
  const again = document.timeline.currentTime;
  for (const animation of moving) animation.startTime = again;
  return out;
}, source);
assert.ok(copy, 'a copy of the spinner stays for a moment when she is sent away');
assert.ok(
  Math.abs(copy.box.x - copy.was.x) < 0.5 &&
    Math.abs(copy.box.y - copy.was.y) < 0.5 &&
    copy.box.width === copy.was.width,
  `the copy is exactly where she was (${JSON.stringify(copy.box)} against ${JSON.stringify(copy.was)})`,
);
assert.ok(copy.apart < 0.05, `and in the pose she was in (${copy.apart.toFixed(3)} px apart)`);
{
  // The ring's turn at the start, half way, nine tenths and the end of the copy's life.
  const [t0, t1, t2, t3] = copy.turns.map((turn) => (((copy.turns[0] - turn) % 360) + 360) % 360);
  assert.ok(
    t0 === 0 && t1 > t3 * 0.6 && t3 > t2 && t3 - t2 < t3 * 0.05,
    `the copy runs on and slows to nothing (${[t1, t2, t3].map((n) => n.toFixed(2))}°)`,
  );
}
assert.equal(copy.count, 56, 'the copy: ring, 54 parts and its fade');
assert.deepEqual(
  copy.properties.sort(),
  ['opacity', 'transform'],
  'the copy animates transform and opacity alone',
);
assert.deepEqual(copy.fades, ['1', '0'], 'the copy fades out');
assert.ok(copy.longest <= 400, `the copy lasts ${copy.longest} ms`);
assert.equal(copy.hidden, 'true', 'the copy is hidden from screen readers');
assert.equal(copy.clicks, 'none', 'the copy takes no clicks');
await page.waitForFunction(() => !document.querySelector('.dottie-leaving'), null, { timeout: 3000 });
assert.equal(
  await page.evaluate(
    () => document.getAnimations().filter((a) => a.effect?.target?.closest?.('.dottie-spinner')).length,
  ),
  0,
  'gone: no animation is left',
);
assert.equal(await page.locator('#dklaAskDialog .dottie-spinner').count(), 0, 'gone: no spinner is left');
assert.deepEqual(errors, []);
await context.close();

// ---------- 5d. reduced motion: standing, pulsing, nothing else ----------
const still = await open({ reducedMotion: 'reduce' });
await still.research();
await sleep(400);
const calm = await still.page.evaluate(() => {
  const spinner = window.__spinner();
  const all = document.getAnimations().filter((a) => spinner.contains(a.effect?.target));
  return {
    animations: all.map((a) => ({
      name: a.animationName ?? null,
      on: a.effect.target === spinner ? 'spinner' : 'part',
      properties: [...new Set(a.effect.getKeyframes().flatMap((f) => Object.keys(f)))].filter(
        (key) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key),
      ),
    })),
    pose: window.__read(),
  };
});
assert.deepEqual(
  calm.animations,
  [{ name: 'dottie-pulse', on: 'spinner', properties: ['opacity'] }],
  'reduced motion: the only animation is the spinner pulsing its opacity',
);
for (const runner of calm.pose.runners)
  for (const paw of PAWS)
    assert.ok(Math.abs(runner[paw].out - groundPx) < 0.02, `reduced motion: ${paw} stands on the ground`);
await sleep(300);
assert.deepEqual(
  (await still.page.evaluate(() => window.__read())).runners,
  calm.pose.runners,
  'reduced motion: nothing moves',
);
await still.dismiss();
assert.equal(await still.page.locator('.dottie-leaving').count(), 0, 'reduced motion: she leaves at once');
assert.deepEqual(still.errors, []);
await still.context.close();

await browser.close();
console.log(
  `Running opossums (${source ? 'source files' : 'built app'}): 55 animations on transform alone, ${run.keys} poses a stride; ` +
    `main thread idle while it runs (0 style recalculations, 0 layouts in 1.5 s); planted paws drift ${drift.toFixed(3)} px in the laps ` +
    `and ${startDrift.toFixed(3)} px in the start (limit 0.3) while the ring carries her ${carried.toFixed(1)} px a stride; ` +
    `diagonal pairs, body bob ${bob.toFixed(1)} px, head ${headBob.toFixed(1)} px; pauses when hidden, stops when closed, ` +
    `leaves in ${copy.longest} ms; reduced motion stands and pulses.`,
);
