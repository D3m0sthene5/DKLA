/* The map in motion, in a real browser (v3.2).

     node tools/feel/check-map.mjs http://127.0.0.1:8766/DKLA-v3.1.html

   Until v3.1 every frame of a drag, a zoom or a flight drew the whole map again. Now a frame of motion moves
   the picture already on the page with one transform, and the map is drawn again when the camera rests
   (src/runtime/studyCode.js, "the camera in motion"). This check holds that to what a reader would notice:

   - a drag: on every frame the map is exactly under the pointer (the point that was grabbed stays under it,
     and a subject drawn on the map is on screen where the camera says it is), and the map's elements are
     not rebuilt while it moves;
   - when the camera rests, the map on the page is the map a fresh draw makes at that camera: the same
     elements at the same positions, with no transform left on the canvas;
   - a released drag keeps its speed and slows to a stop; pressing on the map stops it at once, and that
     press is not also a click;
   - with reduced motion there is no glide, and a flight arrives at once;
   - a trackpad pinch (Ctrl + wheel) moves the map by the frame after the first wheel event, follows the
     fingers continuously, and comes to rest on one of the map's levels;
   - a flight that is given a new destination on the way ends exactly where a jump to that destination ends,
     and draws the map a handful of times, not once a frame.

   Timings on a busy machine vary, so the assertions count frames and positions; the milliseconds are printed. */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = await chromium.launch();

async function open(reducedMotion) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: 'block',
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  });
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.origin !== address.origin || url.pathname.startsWith('/api/')
      ? route.fulfill({ status: 204, body: '' })
      : route.continue();
  });
  await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(address.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
  await page.waitForFunction(() => window.LegalAtlas?.ready && window.DKLAMapMotion);
  const cdp = await context.newCDPSession(page);
  // What the checks read from the page. `watch` records one sample per frame.
  await page.evaluate(() => {
    const svg = document.getElementById('geoCanvas'),
      main = document.getElementById('studyMain');
    const T = (window.__map = { samples: [], pointer: null, wheel: { first: 0, sum: 0, n: 0 }, on: false });
    svg.addEventListener('pointermove', (e) => (T.pointer = { x: e.clientX, y: e.clientY }), true);
    svg.addEventListener('pointerdown', (e) => (T.pointer = { x: e.clientX, y: e.clientY }), true);
    svg.addEventListener(
      'wheel',
      (e) => {
        if (!T.wheel.first) T.wheel.first = performance.now();
        T.wheel.sum += e.deltaY;
        T.wheel.n++;
      },
      { capture: true, passive: true },
    );
    // Sampled at the start of each frame, before the camera's own update for that frame (this callback was
    // asked for first), so a sample is exactly what the frame before it showed; the pointer and the wheel
    // are taken as they stood when that frame began.
    let frame = 0,
      pointer = null,
      wheel = { ...T.wheel };
    const tick = () => {
      frame++;
      if (T.fresh) {
        // recording has just begun: nothing from before it counts
        T.fresh = false;
        wheel = { ...T.wheel };
      }
      if (T.on) {
        const m = main.getBoundingClientRect(),
          st = window.DKLAMapMotion.state(),
          cam = st.camera,
          sample = {
            t: performance.now(),
            frame,
            cam,
            draws: st.draws,
            moving: st.moving,
            gliding: st.gliding,
            flying: st.flying,
            snaps: st.snaps,
          };
        sample.transform = svg.style.transform || '';
        sample.wheel = wheel;
        if (pointer) {
          // the map point under the pointer, from the camera alone
          sample.under = {
            x: cam.x + (pointer.x - m.x - m.width / 2) / cam.z,
            y: cam.y + (pointer.y - m.y - m.height / 2) / cam.z,
          };
        }
        if (T.subject) {
          // where a drawn subject really is on screen, against where the camera puts it
          const el = svg.querySelector(
            `path[data-map-region="${T.subject}"], rect[data-map-region="${T.subject}"]`,
          );
          if (el) {
            const world = el.getBBox(),
              seen = el.getBoundingClientRect();
            sample.off = Math.hypot(
              seen.left + seen.width / 2 - (m.x + m.width / 2 + (world.x + world.width / 2 - cam.x) * cam.z),
              seen.top +
                seen.height / 2 -
                (m.y + m.height / 2 + (world.y + world.height / 2 - cam.y) * cam.z),
            );
          }
        }
        T.samples.push(sample);
      }
      pointer = T.pointer;
      wheel = { ...T.wheel };
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // Every element of the map with its place: what "the same picture" means below.
    T.signature = () =>
      [...svg.getElementsByTagName('*')].map(
        (el) =>
          el.tagName +
          [
            'x',
            'y',
            'width',
            'height',
            'cx',
            'cy',
            'r',
            'rx',
            'x1',
            'y1',
            'x2',
            'y2',
            'transform',
            'font-size',
            'd',
            'points',
            'opacity',
          ]
            .map((name) => (el.hasAttribute(name) ? ` ${name}=${el.getAttribute(name)}` : ''))
            .join('') +
          (el.tagName === 'text' || el.tagName === 'tspan' ? ' "' + el.textContent + '"' : ''),
      );
    T.atRest = () => {
      const st = window.DKLAMapMotion.state();
      return (
        !st.moving &&
        !st.flying &&
        !st.gliding &&
        !st.shifted &&
        !st.dirty &&
        !svg.style.transform &&
        !svg.classList.contains('is-moving')
      );
    };
  });
  const watch = (on, subject = null) =>
    page.evaluate(
      ([on, subject]) => {
        const T = window.__map;
        if (on) {
          T.samples = [];
          T.wheel = { first: 0, sum: 0, n: 0 };
          T.subject = subject;
          T.fresh = true;
        }
        T.on = on;
        return T.samples;
      },
      [on, subject],
    );
  // The camera has stopped and nothing more is being drawn (fades made at rest have finished).
  const rest = async () => {
    await page.waitForFunction(() => window.__map.atRest());
    let last = -1;
    for (let quiet = 0; quiet < 4; ) {
      await sleep(120);
      const now = await page.evaluate(() =>
        window.__map.atRest() ? window.DKLAMapMotion.state().draws : -2,
      );
      quiet = now === last ? quiet + 1 : 0;
      last = now;
    }
  };
  const camera = () => page.evaluate(() => window.DKLAMapMotion.state().camera);
  const frame = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
  // Mouse input with its own clock, so a speed is the speed that was meant however busy the machine is.
  let clock = Date.now() / 1000 + 1;
  const mouse = async (type, x, y, after = 0.008) => {
    clock += after;
    await cdp.send('Input.dispatchMouseEvent', {
      type,
      x,
      y,
      timestamp: clock,
      button: type === 'mouseMoved' ? 'none' : 'left',
      buttons: type === 'mouseReleased' ? 0 : type === 'mouseMoved' && !mouse.down ? 0 : 1,
      clickCount: type === 'mouseMoved' ? 0 : 1,
    });
    if (type === 'mousePressed') mouse.down = true;
    if (type === 'mouseReleased') mouse.down = false;
  };
  // A fresh draw at the same camera gives the picture that is on the page. After a motion this is asked the
  // moment the camera rests: half a second later the notebook is saved, the "Saved" note changes size and
  // the label engine, which keeps labels clear of that note, may hide one on the next draw (as it always has).
  const sameAsFresh = async (what, afterMotion = true) => {
    if (afterMotion) {
      await page.waitForFunction(() => window.__map.atRest());
      await frame();
    } else await rest();
    const result = await page.evaluate(() => {
      const T = window.__map,
        svg = document.getElementById('geoCanvas'),
        before = T.signature();
      draw();
      const after = T.signature();
      let differs = -1;
      for (let i = 0; i < Math.max(before.length, after.length); i++)
        if (before[i] !== after[i]) {
          differs = i;
          break;
        }
      return {
        count: [before.length, after.length],
        differs,
        was: before[differs] || '',
        fresh: after[differs] || '',
        transform: svg.style.transform || '',
        moving: svg.classList.contains('is-moving'),
        background: document.getElementById('studyMain').style.background,
      };
    });
    assert.equal(result.transform, '', `${what}: no transform is left on the map at rest`);
    assert.ok(!result.moving && !result.background, `${what}: the map is out of its moving state at rest`);
    assert.equal(result.count[0], result.count[1], `${what}: a fresh draw has the same number of elements`);
    assert.ok(result.count[0] > 50, `${what}: the map is drawn (${result.count[0]} elements)`);
    assert.equal(
      result.differs,
      -1,
      `${what}: a fresh draw puts every element where it is (first difference: ${result.was} | ${result.fresh})`,
    );
    return result.count[0];
  };
  return { context, page, cdp, errors, watch, rest, camera, frame, mouse, sameAsFresh };
}

const report = [];
{
  const { context, page, errors, watch, rest, camera, frame, mouse, sameAsFresh } = await open(false);
  const box = await page.evaluate(() => {
    const b = document.getElementById('studyMain').getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  const at = (fx, fy) => ({ x: Math.round(box.x + box.w * fx), y: Math.round(box.y + box.h * fy) });

  /* ---- 1. a drag ---- */
  await page.evaluate(() => goRegion('consideration', false));
  await rest();
  const elements = await sameAsFresh('before anything moves', false);
  const from = at(0.62, 0.6),
    to = at(0.36, 0.4);
  await mouse('mouseMoved', from.x, from.y);
  await watch(true, 'consideration');
  await mouse('mousePressed', from.x, from.y);
  // One step per frame, so a slow machine sees the same drag over more time.
  for (let i = 1; i <= 50; i++) {
    await mouse('mouseMoved', from.x + ((to.x - from.x) * i) / 50, from.y + ((to.y - from.y) * i) / 50);
    await frame();
  }
  await sleep(250); // held still: no speed to carry on release
  const dragged = await watch(false);
  await mouse('mouseReleased', to.x, to.y, 0.4);
  {
    const first = dragged[0],
      grabbed = first.under,
      moved = dragged.filter(
        (s, i) => i && (s.cam.x !== dragged[i - 1].cam.x || s.cam.y !== dragged[i - 1].cam.y),
      ),
      // the grabbed point, in screen px away from the pointer (the first 5 px of a press are not a drag)
      slip = Math.max(
        ...moved.map((s) => Math.hypot(s.under.x - grabbed.x, s.under.y - grabbed.y) * s.cam.z),
      ),
      off = Math.max(...dragged.filter((s) => s.off !== undefined).map((s) => s.off)),
      draws = dragged.at(-1).draws - first.draws,
      carried = dragged.filter((s) => s.transform).length;
    assert.ok(moved.length >= 30, `the drag moved the camera on ${moved.length} frames`);
    assert.ok(
      slip <= 6,
      `the grabbed point stays under the pointer on every frame (worst ${slip.toFixed(1)} px)`,
    );
    assert.ok(
      off <= 1.5,
      `the map is on screen where the camera says, on every frame (worst ${off.toFixed(2)} px)`,
    );
    assert.ok(carried >= moved.length * 0.8, `the drawn map is carried by a transform (${carried} frames)`);
    assert.ok(
      draws <= 3 && draws <= moved.length / 4,
      `the map is not rebuilt as it moves (${draws} draws in ${moved.length} frames of motion)`,
    );
    report.push(`drag: ${moved.length} frames of motion, ${draws} draws, worst slip ${slip.toFixed(1)} px`);
  }
  const after = await sameAsFresh('after the drag');
  report.push(`at rest: ${after} elements, equal to a fresh draw (${elements} before the drag)`);

  /* ---- 2. momentum, and a press that stops it ---- */
  await page.evaluate(() => goRegion('consideration', false));
  await rest();
  const a = at(0.6, 0.55),
    b = at(0.5, 0.5);
  const flick = async () => {
    await mouse('mouseMoved', a.x, a.y);
    await mouse('mousePressed', a.x, a.y);
    for (let i = 1; i <= 8; i++)
      await mouse('mouseMoved', a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8);
    await mouse('mouseReleased', b.x, b.y);
  };
  await watch(true);
  await flick();
  await page.waitForFunction(() => window.__map.samples.filter((s) => s.gliding).length >= 8);
  const selectedBefore = await page.evaluate(() => JSON.stringify(selected));
  await mouse('mousePressed', b.x, b.y, 0.3);
  for (let i = 0; i < 6; i++) await frame();
  const glide = await watch(false);
  {
    const gliding = glide.filter((s) => s.gliding),
      steps = gliding
        .slice(1)
        .map((s, i) => Math.hypot(s.cam.x - gliding[i].cam.x, s.cam.y - gliding[i].cam.y) * s.cam.z);
    assert.ok(gliding.length >= 8, 'a released drag glides on');
    assert.ok(
      steps.slice(0, 7).every((px) => px > 0),
      `the glide moves the map on every frame (${steps.slice(0, 7).map((px) => px.toFixed(1))} px)`,
    );
    const last = glide.at(-1),
      held = glide.filter((s) => !s.gliding && s.t > gliding.at(-1).t);
    assert.ok(!last.gliding && held.length >= 3, 'pressing on the map stops the glide');
    assert.ok(
      held.every((s) => s.cam.x === held[0].cam.x && s.cam.y === held[0].cam.y),
      'the map stays where the press caught it',
    );
    const reach =
      Math.hypot(held[0].cam.x - gliding[0].cam.x, held[0].cam.y - gliding[0].cam.y) * held[0].cam.z;
    report.push(`glide: ${gliding.length} frames, ${reach.toFixed(0)} px before the press stopped it`);
  }
  const caught = await camera();
  await mouse('mouseReleased', b.x, b.y, 0.3);
  await rest();
  assert.equal(
    await page.evaluate(() => JSON.stringify(selected)),
    selectedBefore,
    'the press that stops a glide opens nothing',
  );
  const settled = await camera();
  assert.ok(
    Math.hypot(settled.x - caught.x, settled.y - caught.y) * settled.z < 1 && settled.z === caught.z,
    'the map rests where it was stopped',
  );
  await sameAsFresh('after a glide was stopped');

  /* ---- 3. a trackpad pinch ---- */
  await page.evaluate(() => home('Contracts', false, false));
  await rest();
  const start = await camera(),
    c = at(0.42, 0.5);
  await mouse('mouseMoved', c.x, c.y);
  // A pinch settles when the wheel falls silent for a seventh of a second. If a frame takes longer than
  // that on a busy machine it settles in the middle, so the pinch is made again (three times at most).
  const steady = (samples) => {
    const settling = samples.findIndex((s) => s.flying || s.snaps !== samples[0].snaps);
    return samples
      .slice(0, settling < 0 ? samples.length : settling)
      .filter((s) => s.wheel.n >= 2 && s.cam.z < 1.2);
  };
  let pinched = [];
  for (let attempt = 0; attempt < 3 && steady(pinched).length < 5; attempt++) {
    await page.evaluate(() => home('Contracts', false, false));
    await rest();
    await watch(true);
    // One wheel event at the start of each frame, sent from inside the page so that none waits on this
    // script (the gap between them is one frame, however long a frame takes here).
    await page.evaluate(
      (c) =>
        new Promise((resolve) => {
          const svg = document.getElementById('geoCanvas');
          let sent = 0;
          const send = () => {
            svg.dispatchEvent(
              new WheelEvent('wheel', {
                deltaY: -4,
                ctrlKey: true,
                clientX: c.x,
                clientY: c.y,
                bubbles: true,
                cancelable: true,
              }),
            );
            if (++sent < 40) requestAnimationFrame(send);
            else resolve();
          };
          requestAnimationFrame(send);
        }),
      c,
    );
    pinched = await watch(false);
  }
  {
    const first = pinched.find((s) => s.wheel.n > 0),
      moved = pinched.find((s) => s.cam.z !== start.z);
    assert.ok(first && moved, 'the pinch zooms the map');
    const frames = moved.frame - first.frame,
      ms = moved.t - first.wheel.first;
    assert.ok(
      frames <= 1,
      `the map moves in the frame of the first wheel event or the next (${frames} later)`,
    );
    // The zoom follows the fingers: 1% per unit of wheel, about the pointer.
    const follow = steady(pinched);
    const worst = Math.max(...follow.map((s) => Math.abs(Math.log(s.cam.z / start.z) - -0.01 * s.wheel.sum)));
    assert.ok(follow.length >= 5, `the pinch is continuous (${follow.length} frames)`);
    assert.ok(
      worst < 0.12,
      `the zoom follows the wheel on every frame (worst ${worst.toFixed(3)} in log zoom)`,
    );
    report.push(
      `pinch: first movement ${ms.toFixed(0)} ms after the first wheel event, ${follow.length} frames followed`,
    );
  }
  await rest();
  {
    // It came to rest on a level: the camera a jump to that subject (or course) gives.
    const level = await page.evaluate(() => ({ scope: S.scope, region: S.region, district: S.district }));
    const pinchedTo = await camera();
    const jumped = await page.evaluate((level) => {
      if (level.district) goDistrict(level.district, false);
      else if (level.region) goRegion(level.region, false);
      else home(level.scope, false, false);
      return window.DKLAMapMotion.state().camera;
    }, level);
    assert.ok(pinchedTo.z > start.z * 1.05, 'pinching outwards zooms in');
    assert.ok(
      Math.abs(Math.log(pinchedTo.z / jumped.z)) < 1e-6 &&
        Math.hypot(pinchedTo.x - jumped.x, pinchedTo.y - jumped.y) * jumped.z < 0.5,
      `the pinch rests on a level (${level.district || level.region || level.scope}: ${JSON.stringify(pinchedTo)} against ${JSON.stringify(jumped)})`,
    );
    report.push(`pinch: rests on ${level.district || level.region || level.scope}`);
  }
  await sameAsFresh('after a pinch');

  /* ---- 4. a flight, redirected on the way ---- */
  await page.evaluate(() => home('Atlas', false, false));
  await rest();
  await watch(true);
  // Two frames into a flight to Contracts, send it to a subject instead.
  const midFlight = await page.evaluate(
    () =>
      new Promise((resolve) => {
        home('Contracts');
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const flying = window.DKLAMapMotion.state().flying;
            goRegion('consideration');
            resolve(flying);
          }),
        );
      }),
  );
  assert.ok(midFlight, 'a flight is under way');
  await rest();
  const flown = await watch(false);
  const landed = await camera();
  const direct = await page.evaluate(() => {
    home('Atlas', false, false);
    goRegion('consideration', false);
    return window.DKLAMapMotion.state().camera;
  });
  assert.ok(
    Math.abs(Math.log(landed.z / direct.z)) < 1e-9 &&
      Math.hypot(landed.x - direct.x, landed.y - direct.y) * direct.z < 0.01,
    'a redirected flight ends exactly where a jump to its destination ends',
  );
  {
    const inFlight = flown.filter((s) => s.moving),
      draws = flown.at(-1).draws - flown[0].draws;
    assert.ok(inFlight.length >= 4, `the flight is animated (${inFlight.length} frames)`);
    assert.ok(
      draws <= 8,
      `a flight draws the map a handful of times (${draws}), not on each of its ${inFlight.length} frames`,
    );
    report.push(`flight: ${inFlight.length} frames, ${draws} draws`);
  }
  await sameAsFresh('after a flight');
  assert.deepEqual(errors, [], 'no page errors');
  await context.close();
}

/* ---- 5. reduced motion ---- */
{
  const { context, page, errors, watch, rest, camera, mouse, sameAsFresh } = await open(true);
  assert.ok(
    await page.evaluate(() => window.DKLAMapMotion.state().reducedMotion),
    'the page sees reduced motion',
  );
  const box = await page.evaluate(() => {
    const b = document.getElementById('studyMain').getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  await page.evaluate(() => goRegion('consideration', false));
  await rest();
  const a = { x: Math.round(box.x + box.w * 0.6), y: Math.round(box.y + box.h * 0.55) },
    b = { x: Math.round(box.x + box.w * 0.5), y: Math.round(box.y + box.h * 0.5) };
  await mouse('mouseMoved', a.x, a.y);
  await watch(true);
  await mouse('mousePressed', a.x, a.y);
  for (let i = 1; i <= 8; i++)
    await mouse('mouseMoved', a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8);
  await mouse('mouseReleased', b.x, b.y);
  const released = await camera();
  await sleep(400);
  const calm = await watch(false);
  assert.ok(!calm.some((s) => s.gliding), 'reduced motion: a released drag does not glide');
  const stopped = await camera();
  assert.ok(
    stopped.x === released.x && stopped.y === released.y && stopped.z === released.z,
    'reduced motion: the map stops where it was released',
  );
  assert.ok(
    calm.some((s) => s.cam.x !== calm[0].cam.x || s.cam.y !== calm[0].cam.y),
    'reduced motion: the drag itself still moves the map',
  );
  // A flight arrives at once.
  const flight = await page.evaluate(() => {
    home('Contracts');
    return window.DKLAMapMotion.state();
  });
  assert.ok(!flight.flying, 'reduced motion: a flight arrives at once');
  await sameAsFresh('reduced motion, after a drag');
  assert.deepEqual(errors, [], 'no page errors (reduced motion)');
  report.push('reduced motion: no glide, no flight');
  await context.close();
}
await browser.close();
console.log('the map in motion: ' + report.join('; ') + '.');
