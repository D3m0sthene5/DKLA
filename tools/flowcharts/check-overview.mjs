/* The chart at a glance (Fit, where a chart is recomposed for the window): does the picture teach
   the chart's own relationships, and can every word on it be read?

   On every chart, at 1440 × 900 and at 1280 × 800, measured from what is drawn in `.fc-ov`:
     through   a line passes through a step it does not enter (a skip then reads as a chain)
     words     two labels lie over each other
     name      a label lies over a region's name
     outside   a mark, a label or a region's name is outside what can be seen
     onMark    a label lies over a mark
     struck    a line runs through a label for 30 px or more
     crossed   a line runs through a region's name for 30 px or more
     twin      two lines that leave one step for different steps run within 3 px of each other for
               60 px or more
     hollow    a framed region that runs on more than 120 px past its name and everything in it
   The first four fail the check. The others are reported, and fail it once they are at zero so
   they stay there (see ALLOWED).

   Usage: node tools/flowcharts/check-overview.mjs http://127.0.0.1:PORT/ [--json out.json] [--only K-31,CP-30] */
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
const ROWS = ['through', 'words', 'name', 'outside', 'onMark', 'struck', 'crossed', 'twin', 'hollow'];
// How many charts may still show each fault (at either size). Lower these, never raise them.
const ALLOWED = {
  through: 0,
  words: 0,
  name: 0,
  outside: 0,
  onMark: 0,
  struck: 5,
  crossed: 0,
  twin: 0,
  hollow: 0,
};

const measure = () => {
  const dialog = document.querySelector('dialog#dklaFlowcharts');
  const scroll = dialog.querySelector('.fc-map-scroll');
  const ov = dialog.querySelector('.fc-ov');
  if (!ov) return null;
  const frame = scroll.getBoundingClientRect();
  const view = {
    l: frame.left,
    t: frame.top,
    r: frame.left + scroll.clientWidth,
    b: frame.top + scroll.clientHeight,
  };
  const box = (el) => {
    const at = el.getBoundingClientRect();
    return { l: at.left, t: at.top, r: at.right, b: at.bottom };
  };
  const over = (a, b) =>
    Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) *
    Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  const words = (el) => el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40);
  const labels = [...ov.querySelectorAll('.fc-ov-label')].map((el) => ({
    text: words(el),
    says: el.dataset.fcSays,
    ...box(el),
  }));
  // (A region's name is measured as its words, not as the strip it is set in.)
  const names = [...ov.querySelectorAll('.fc-ov-title')].map((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return { text: words(el), ...box(range) };
  });
  const marks = [...ov.querySelectorAll('.fc-ov-mark')].map((el) => {
    const at = box(el.querySelector('.fc-number'));
    return { id: el.dataset.fcMark, n: el.querySelector('b').textContent, ...at };
  });
  const regions = [...ov.querySelectorAll('.fc-ov-region')].map((el) => ({
    text: words(el.querySelector('.fc-ov-title')),
    ...box(el),
  }));
  const lines = [...ov.querySelectorAll('path.fc-ov-line')].map((path) => {
    const matrix = path.getScreenCTM();
    const length = path.getTotalLength();
    const points = [];
    for (let s = 0; s <= length; s += 3) {
      const p = path.getPointAtLength(s).matrixTransform(matrix);
      points.push([p.x, p.y]);
    }
    return { from: path.dataset.fcFrom, to: path.dataset.fcTo, points };
  });
  const n = (id) => marks.find((mark) => mark.id === id)?.n;
  const out = {
    through: [],
    words: [],
    name: [],
    outside: [],
    onMark: [],
    struck: [],
    crossed: [],
    twin: [],
    hollow: [],
  };
  for (const line of lines) {
    for (const mark of marks) {
      if (mark.id === line.from || mark.id === line.to) continue;
      if (line.points.some(([x, y]) => x > mark.l + 3 && x < mark.r - 3 && y > mark.t + 3 && y < mark.b - 3))
        out.through.push(`${n(line.from)}→${n(line.to)} through ${mark.n}`);
    }
    for (const label of labels) {
      const inside = line.points.filter(
        ([x, y]) => x > label.l + 3 && x < label.r - 3 && y > label.t + 3 && y < label.b - 3,
      ).length;
      if (inside * 3 >= 30) out.struck.push(`${n(line.from)}→${n(line.to)} through “${label.text}”`);
    }
    for (const name of names) {
      const inside = line.points.filter(
        ([x, y]) => x > name.l + 3 && x < name.r - 3 && y > name.t + 3 && y < name.b - 3,
      ).length;
      if (inside * 3 >= 30) out.crossed.push(`${n(line.from)}→${n(line.to)} through the name “${name.text}”`);
    }
  }
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[i].from !== lines[j].from || lines[i].to === lines[j].to) continue;
      const close = lines[i].points.filter(([x, y]) =>
        lines[j].points.some(([u, v]) => Math.hypot(x - u, y - v) < 3),
      ).length;
      if (close * 3 >= 60) out.twin.push(`${n(lines[i].from)}→${n(lines[i].to)} and →${n(lines[j].to)}`);
    }
  labels.forEach((a, i) => {
    labels.slice(i + 1).forEach((b) => over(a, b) > 20 && out.words.push(`“${a.text}” over “${b.text}”`));
    names.forEach((name) => over(a, name) > 20 && out.name.push(`“${a.text}” over the name “${name.text}”`));
    marks.forEach((mark) => over(a, mark) > 20 && out.onMark.push(`“${a.text}” over mark ${mark.n}`));
  });
  for (const one of [...labels, ...names, ...marks])
    if (one.l < view.l - 1 || one.r > view.r + 1 || one.t < view.t - 1 || one.b > view.b + 1)
      out.outside.push(one.text ? `“${one.text}”` : `mark ${one.n}`);
  for (const region of regions) {
    const held = [...marks, ...labels].filter(
      (one) =>
        (one.l + one.r) / 2 > region.l &&
        (one.l + one.r) / 2 < region.r &&
        (one.t + one.b) / 2 > region.t &&
        (one.t + one.b) / 2 < region.b,
    );
    const name = names.find((one) => one.text === region.text && one.l >= region.l && one.r <= region.r + 1);
    const end = Math.max(region.l, name ? name.r : region.l, ...held.map((one) => one.r));
    if (region.r - end > 120) out.hollow.push(`“${region.text}”`);
  }
  return out;
};

const browser = await chromium.launch();
try {
  const report = {};
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
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
    report[width] = {};
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
        dialog.querySelector('[data-flowcharts-zoom="fit"]').click();
      });
      const one = await page.evaluate(measure);
      if (one) report[width][id] = one;
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  let failed = false;
  console.log(
    `row       charts at 1440   charts at 1280   (overviews: ${Object.keys(report[1440]).length} at 1440, ${Object.keys(report[1280]).length} at 1280)`,
  );
  for (const row of ROWS) {
    const at = (width) => Object.entries(report[width]).filter(([, one]) => one[row].length);
    const worst = Math.max(at(1440).length, at(1280).length);
    if (worst > ALLOWED[row]) failed = true;
    console.log(
      `${row.padEnd(9)} ${String(at(1440).length).padStart(6)}           ${String(at(1280).length).padStart(6)}${worst > ALLOWED[row] ? `     more than the ${ALLOWED[row]} allowed` : ''}`,
    );
    for (const width of [1440, 1280])
      for (const [id, one] of at(width).slice(0, option('--all') ? 200 : 4))
        console.log(
          `            ${width} ${id}: ${one[row].slice(0, 3).join('; ')}${one[row].length > 3 ? ` … ${one[row].length} in all` : ''}`,
        );
  }
  if (option('--json')) await writeFile(option('--json'), JSON.stringify(report, null, 1));
  process.exitCode = failed ? 1 : 0;
} finally {
  await browser.close();
}
