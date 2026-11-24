/* Can a line on the whole map be followed by eye from its answer to the step it leads to?

   On every chart, at reading size, this reads the lines as they are drawn (the path data of each
   wire, and of each bar where routes meet) and reports every pair of lines that lead to DIFFERENT
   steps and
     - lie on top of each other for any length (a shared stretch), or
     - run side by side, or end to end, closer than 16 px (a near stretch).
   Lines to the same step may join; lines that cross at a right angle are counted but are not a
   fault: a crossing is not a place where one line can be taken for another.

   Why 16 px. A wire turns with a 7 px radius. Two wires closer than twice that turn inside one
   another's corner and read as one band that turns (the picture the reviewer was misled by had them
   10 px apart). At 16 px each turn is finished before the next line's begins, and the space between
   two lines is the height of a line of the map's small text, at the smallest size the wired map is
   shown with its words (half size) still five times the line's own thickness.

   Usage: node tools/flowcharts/check-wires.mjs http://127.0.0.1:PORT/ [--json out.json] [--only LRS-15,K-18]
   Exit code 1 if any pair is reported. */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const option = (name) => {
  const at = process.argv.indexOf(name);
  return at < 0 ? null : process.argv[at + 1];
};
const only = option('--only')?.split(',');
export const APART = 16;

/* Runs in the page, on the chart being shown. */
export const measure = (apart) => {
  const dialog = document.querySelector('dialog#dklaFlowcharts');
  const map = dialog.querySelector('.fc-map');
  const number = new Map(
    [...map.querySelectorAll('[data-fc-cell]')].map((cell) => [
      cell.dataset.fcCell,
      cell.querySelector('.fc-number b')?.textContent,
    ]),
  );
  // A wire as the straight stretches it is made of (a rounded turn is taken as its corner).
  const stretches = (d) => {
    const n = d.match(/[MLQHV]|-?\d+(?:\.\d+)?(?:e-?\d+)?/g);
    const points = [];
    let i = 0,
      x = 0,
      y = 0;
    while (i < n.length) {
      const c = n[i++];
      if (c === 'M' || c === 'L') points.push([(x = +n[i++]), (y = +n[i++])]);
      else if (c === 'H') points.push([(x = +n[i++]), y]);
      else if (c === 'V') points.push([x, (y = +n[i++])]);
      else if (c === 'Q') {
        points.push([+n[i++], +n[i++]]);
        points.push([(x = +n[i++]), (y = +n[i++])]);
      }
    }
    const out = [];
    for (let k = 1; k < points.length; k++) {
      const [x1, y1] = points[k - 1],
        [x2, y2] = points[k];
      if (Math.abs(x1 - x2) < 0.01 && Math.abs(y1 - y2) < 0.01) continue;
      const upright = Math.abs(x1 - x2) < 0.01;
      if (!upright && Math.abs(y1 - y2) > 0.01) {
        out.push({ slant: true });
        continue;
      }
      const s = upright
        ? { upright, at: x1, lo: Math.min(y1, y2), hi: Math.max(y1, y2) }
        : { upright, at: y1, lo: Math.min(x1, x2), hi: Math.max(x1, x2) };
      const last = out[out.length - 1];
      if (last && !last.slant && last.upright === upright && Math.abs(last.at - s.at) < 0.01) {
        last.lo = Math.min(last.lo, s.lo);
        last.hi = Math.max(last.hi, s.hi);
      } else out.push(s);
    }
    return out;
  };
  const lines = [];
  for (const wire of map.querySelectorAll('.fc-graph .fc-wire')) {
    const d = wire.dataset;
    lines.push({
      name: `step ${number.get(d.fcFrom)} answer ${+d.fcEdge + 1} → ${number.get(d.fcTo)}`,
      to: d.fcTo,
      parts: stretches(wire.getAttribute('d')),
    });
  }
  for (const join of map.querySelectorAll('.fc-graph .fc-join'))
    lines.push({
      name: `the bar over step ${number.get(join.dataset.fcTo)}`,
      to: join.dataset.fcTo,
      parts: [...join.querySelectorAll('path')].flatMap((path) => stretches(path.getAttribute('d'))),
    });
  const slanted = lines.filter((line) => line.parts.some((part) => part.slant)).map((line) => line.name);
  const pairs = [];
  let crossings = 0;
  for (let a = 0; a < lines.length; a++)
    for (let b = a + 1; b < lines.length; b++) {
      if (lines[a].to === lines[b].to) continue;
      let worst = null;
      for (const p of lines[a].parts)
        for (const q of lines[b].parts) {
          if (p.slant || q.slant) continue;
          if (p.upright !== q.upright) {
            if (q.at > p.lo + 0.5 && q.at < p.hi - 0.5 && p.at > q.lo + 0.5 && p.at < q.hi - 0.5) crossings++;
            continue;
          }
          const side = Math.abs(p.at - q.at);
          const along = Math.max(0, Math.max(p.lo, q.lo) - Math.min(p.hi, q.hi));
          const gap = Math.hypot(side, along);
          if (gap >= apart - 0.5) continue;
          const length = Math.max(0, Math.min(p.hi, q.hi) - Math.max(p.lo, q.lo));
          const kind = side < 1 && length > 0 ? 'shared' : 'near';
          if (
            !worst ||
            (kind === 'shared' && worst.kind !== 'shared') ||
            (kind === worst.kind && gap < worst.gap)
          )
            worst = { kind, gap: Math.round(gap * 10) / 10, length: Math.round(length), upright: p.upright };
        }
      if (worst) pairs.push({ a: lines[a].name, b: lines[b].name, ...worst });
    }
  const graph = map.querySelector('.fc-graph');
  return {
    wires: map.querySelectorAll('.fc-graph .fc-wire').length,
    pairs,
    crossings,
    slanted,
    width: graph.offsetWidth,
    height: graph.offsetHeight,
  };
};

if (process.argv[1]?.endsWith('check-wires.mjs')) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      serviceWorkers: 'block',
      colorScheme: 'dark',
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
    await page.goto(new URL('#flowcharts', address).href, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await page.locator('html.dkla-boot-ready').waitFor({ timeout: 120_000 });
    let charts = await page.evaluate(() =>
      JSON.parse(document.getElementById('dklaFlowchartsData').textContent).map((chart) => chart.id),
    );
    if (only) charts = charts.filter((id) => only.includes(id));
    const report = {};
    for (const id of charts) {
      await page.evaluate((to) => (location.hash = '#flowchart=' + to), id);
      await page.waitForFunction(
        (to) => document.querySelector('dialog#dklaFlowcharts')?.dataset.printChart === to,
        id,
        { polling: 30 },
      );
      await page.evaluate(() => {
        const dialog = document.querySelector('dialog#dklaFlowcharts');
        dialog.querySelector('[data-flowcharts-view="map"]').click();
        dialog.querySelector('[data-flowcharts-zoom="reset"]').click();
      });
      report[id] = await page.evaluate(measure, APART);
    }
    const all = Object.entries(report);
    const sum = (pick) => all.reduce((total, [, one]) => total + pick(one), 0);
    const bad = all.filter(([, one]) => one.pairs.length || one.slanted.length);
    for (const [id, one] of bad) {
      console.log(
        `${id}: ${one.pairs.length} pair${one.pairs.length === 1 ? '' : 's'} of lines to different steps too close`,
      );
      for (const pair of one.pairs.slice(0, 6))
        console.log(
          `   ${pair.a}  |  ${pair.b}: ${pair.kind === 'shared' ? `on top of each other for ${pair.length} px` : `${pair.gap} px apart${pair.length ? ` for ${pair.length} px` : ', end to end'}`} (${pair.upright ? 'upright' : 'level'})`,
        );
      if (one.pairs.length > 6) console.log(`   … and ${one.pairs.length - 6} more`);
      for (const name of one.slanted) console.log(`   ${name}: not drawn in level and upright stretches`);
    }
    const shared = sum((one) => one.pairs.filter((pair) => pair.kind === 'shared').length);
    const near = sum((one) => one.pairs.filter((pair) => pair.kind === 'near').length);
    console.log(
      `${all.length} charts, ${sum((one) => one.wires)} lines: ${shared + near} pairs of lines to different steps closer than ${APART} px (${shared} on top of each other, ${near} near) on ${bad.length} charts; ${sum((one) => one.crossings)} right-angle crossings; widest chart ${Math.max(...all.map(([, one]) => one.width))} px, tallest ${Math.max(...all.map(([, one]) => one.height))} px.`,
    );
    if (option('--json')) await writeFile(option('--json'), JSON.stringify(report, null, 1));
    assert.deepEqual(errors, []);
    process.exitCode = bad.length ? 1 : 0;
  } finally {
    await browser.close();
  }
}
