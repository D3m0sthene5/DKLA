/* Makeover on 3.1: the doctrine timeline and the flowchart steps (owner, 24 November 2026: "difficult
   to read and difficult to navigate").

     node tools/makeover/check-lines.mjs http://127.0.0.1:8766/DKLA-v3.1.html

   At 1512 x 789, on C. Itoh's page:
   - the timeline card shows the stored sentence on how the entries connect, then every entry as one
     row (year, mark, name, how it moved the rule), this case marked once with its note, a marked
     break where twenty years or more pass, and the stored "Now" statement closing the rail;
   - names are at least 15 px, nothing scrolls sideways, the old dot strip is gone, and the marks
     have a key in words;
   - the flowchart card shows the path from the chart's first step downward, each answer in full
     (3.1 cut "Expressly conditional or writings fail" to a few letters), and the steps this case
     decides opened with their explanation; a step on the path opens the chart at that step;
   - the full timeline shows the same sentence without a click and at least three entries on the
     first screen (3.1 showed two), and ends at "Now";
   - the flowchart window lists every step of the chart beside the walkthrough, marks the steps
     walked, and opens any step from the list.
   A long timeline (Personal jurisdiction, 16 entries, on International Shoe's page) shows all 16.
   Type (owner, 24 November 2026: fonts "inconsistent across the main DKLA and the timelines and
   flowcharts"): in the timeline window (one timeline, the list) and the flowchart window (walkthrough,
   map, library) every visible word is in a bundled face ("DKLA Inter", or "DKLA Exo 2" for the
   window's title), at 12, 14, 16, 19 or 30 px, in weight 400, 500 or 600. */
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

// Every visible text style in a window: the first face named, the size and the weight.
const typeIn = (selector) =>
  page.evaluate((selector) => {
    const root = document.querySelector(selector);
    const styles = new Map();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent.trim();
      const el = node.parentElement;
      const box = el.getBoundingClientRect();
      if (!text || !box.width || !box.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || el.closest('[data-flowcharts-close],[data-r21-close]')) continue;
      const face = cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      const key = `${face} ${parseFloat(cs.fontSize)}/${cs.fontWeight}`;
      if (!styles.has(key)) styles.set(key, text.slice(0, 30));
    }
    return [...styles];
  }, selector);
async function typeIsOneSystem(selector, where) {
  const styles = await typeIn(selector);
  assert.ok(styles.length >= 4, `${where}: text found`);
  for (const [style, sample] of styles) {
    const [, face, size, weight] = style.match(/^(.*) ([\d.]+)\/(\d+)$/);
    assert.ok(['DKLA Inter', 'DKLA Exo 2'].includes(face), `${where}: "${sample}" is set in ${face}`);
    assert.ok([12, 14, 16, 19, 30].includes(Number(size)), `${where}: "${sample}" is ${size}px`);
    assert.ok(['400', '500', '600'].includes(weight), `${where}: "${sample}" is weight ${weight}`);
    if (face === 'DKLA Exo 2') assert.equal(Number(size), 30, `${where}: the display face is the title only`);
  }
  assert.equal(styles.filter(([style]) => style.startsWith('DKLA Exo 2')).length, 1, `${where}: one title`);
}
try {
  await page.goto(address.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
  await page.waitForFunction(() => window.LegalAtlas?.ready);
  await page.evaluate(() => (location.hash = 'node=citoh'));
  const card = page.locator('#inspector .dkla-timeline.mk-tl');
  await card.waitFor();
  const stored = await page.evaluate(() => {
    const id = document.querySelector('#inspector .dkla-timeline.mk-tl').dataset.r21;
    return DKLATimelines.list().find((t) => t.id === id);
  });

  // ---- the timeline card ----
  const tl = await card.evaluate((el) => {
    const rows = [...el.querySelectorAll('li.mk-tl-row:not(.mk-tl-now)')];
    return {
      guide: el.querySelector('.mk-tl-guide')?.textContent,
      rows: rows.map((r) => ({
        name: r.querySelector('strong')?.childNodes[0]?.textContent.trim(),
        nameSize: parseFloat(getComputedStyle(r.querySelector('strong')).fontSize),
        year: r.querySelector('.v31-tl-year')?.textContent.slice(0, 4),
        mark: !!r.querySelector('.mk-tl-node'),
        moved: r.querySelector('.v31-tl-turn')?.textContent || '',
        symbol: getComputedStyle(r.querySelector('.v31-tl-turn'), '::before').content,
        note: r.querySelector('.v31-tl-note')?.textContent || '',
        here: r.matches('.mk-here[aria-current="step"]'),
      })),
      gaps: [...el.querySelectorAll('li.mk-tl-gap')].map((g) => g.textContent),
      now: el.querySelector('li.mk-tl-now .v31-tl-note')?.textContent,
      nowTinted: getComputedStyle(el.querySelector('li.mk-tl-now .v31-tl-step')).backgroundColor,
      last: el.querySelector('.mk-tl-rows > li:last-child').className,
      axis: el.querySelectorAll('.v31-axis, .v31-dot').length,
      key: [...el.querySelectorAll('.mk-tl-key > span')].map((s) => s.textContent),
      sideways: el.scrollWidth > el.clientWidth + 1,
      railWidth: getComputedStyle(el.querySelector('li.mk-tl-row'), '::before').width,
    };
  });
  assert.equal(tl.guide, stored.guide, 'the sentence on how the entries connect is on the page');
  assert.equal(tl.rows.length, stored.steps.length, 'every entry has a row');
  assert.equal(tl.rows.length, 6);
  for (const row of tl.rows) {
    assert.ok(row.name && row.year && row.mark, `row is named, dated and marked: ${JSON.stringify(row)}`);
    assert.ok(row.nameSize >= 15, `${row.name} is drawn at ${row.nameSize}px`);
    assert.ok(row.moved.length > 3, `${row.name} says how it moved the rule`);
    assert.equal(row.symbol, 'none', 'the mark is on the rail, not repeated in the words');
  }
  assert.deepEqual(
    tl.rows.map((r) => r.year),
    stored.steps.map((s) => String(s.year)),
    'rows are in the stored order',
  );
  const here = tl.rows.filter((r) => r.here);
  assert.equal(here.length, 1, 'this case is marked once');
  assert.match(here[0].name, /C\. Itoh/);
  assert.equal(here[0].note, stored.steps.find((s) => s.id === 'citoh').note, "this case's note is open");
  assert.equal(tl.rows.filter((r) => r.note).length, 3, 'this case and its two neighbours carry notes');
  assert.deepEqual(tl.gaps, ['66 years', '20 years'], 'long gaps between entries are marked');
  assert.equal(tl.now, stored.now, 'the rail ends at the stored statement of where the law stands');
  assert.match(tl.last, /mk-tl-now/);
  assert.equal(tl.nowTinted, 'rgba(0, 0, 0, 0)', '"Now" is not tinted like the case being read');
  assert.equal(tl.axis, 0, 'the unnamed dot strip is gone');
  assert.ok(tl.key.length >= 2 && tl.key.includes('Applies or clarifies'), `key to the marks: ${tl.key}`);
  assert.equal(tl.sideways, false, 'the card does not scroll sideways');
  assert.equal(tl.railWidth, '2px', 'the rows share one rail');

  // ---- the flowchart card ----
  const chart = page.locator('#inspector .v31-chart.mk-fc').first();
  const fc = await chart.evaluate((el) => ({
    steps: [...el.querySelectorAll('.mk-fc-route:not(.mk-fc-loose) > li.mk-fc-step')].map((li) => ({
      n: li.querySelector('.mk-fc-n').textContent,
      label: li.querySelector('.mk-fc-label').textContent,
      own: li.matches('.mk-own'),
      detail: li.querySelector('.mk-fc-detail')?.textContent || '',
      top: li.getBoundingClientRect().top,
    })),
    answers: [...el.querySelectorAll('li.mk-fc-answer')].map((li) => ({
      text: li.textContent,
      cut: li.scrollWidth > li.clientWidth + 1 || getComputedStyle(li).textOverflow === 'ellipsis',
      size: parseFloat(getComputedStyle(li).fontSize),
    })),
    others: [...el.querySelectorAll('.mk-fc-others a')].map((a) => a.textContent),
    old: el.querySelectorAll('.v31-route, .v31-route-step, .v31-steps').length,
    sideways: el.scrollWidth > el.clientWidth + 1,
  }));
  assert.deepEqual(
    fc.steps.map((s) => s.n),
    ['1', '2', '3', '8'],
    'the whole path from the first step',
  );
  assert.ok(
    fc.steps.every((s, i) => i === 0 || s.top > fc.steps[i - 1].top),
    'the path reads downward',
  );
  assert.deepEqual(
    fc.answers.map((a) => a.text),
    ['Article 2', 'Expressly conditional or writings fail', 'Mutual recognition by conduct'],
    'each answer is written in full',
  );
  assert.ok(
    fc.answers.every((a) => !a.cut && a.size >= 13),
    'answers are not cut and are readable',
  );
  assert.deepEqual(
    fc.steps.map((s) => s.own),
    [false, false, true, true],
  );
  assert.ok(
    fc.steps.filter((s) => s.own).every((s) => s.detail.length > 40),
    "this case's steps are explained",
  );
  assert.ok(
    fc.steps.filter((s) => !s.own).every((s) => !s.detail),
    'the steps before them are one line each',
  );
  assert.ok(fc.others.length >= 2, `the other answers at step 3 are named: ${fc.others}`);
  assert.equal(fc.old, 0, 'the row of boxes is gone');
  assert.equal(fc.sideways, false);

  // ---- the full timeline ----
  await card.locator('[data-r21-open]').click();
  const full = page.locator('#r21Timelines[open] #r21Body');
  await full.locator('.r21-v > li').first().waitFor();
  await page.waitForTimeout(200);
  const whole = await full.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const guide = el.querySelector('.r31-guide > p');
    return {
      guide: guide?.textContent,
      guideSeen: !!guide && guide.getBoundingClientRect().bottom < box.bottom && guide.offsetHeight > 0,
      firstScreen: [...el.querySelectorAll('.r21-v > li')].filter(
        (li) => li.querySelector('.r21-name').getBoundingClientRect().bottom < box.bottom,
      ).length,
      nameSize: parseFloat(getComputedStyle(el.querySelector('.r21-name')).fontSize),
      marks: el.querySelectorAll('.r21-v > li > .mk-tl-node').length,
      now: el.querySelector('.mk-tl-end .r25-timeline-synthesis')?.textContent || '',
      nowLabel: el.querySelector('.mk-tl-end > h3')?.textContent,
      key: el.querySelectorAll('.mk-tl-key > span').length,
    };
  });
  assert.equal(whole.guide, stored.guide);
  assert.ok(whole.guideSeen, 'the sentence on how the entries connect needs no click');
  assert.ok(whole.firstScreen >= 3, `${whole.firstScreen} entries begin on the first screen`);
  assert.ok(whole.nameSize >= 16 && whole.nameSize <= 19, `entry names at ${whole.nameSize}px`);
  assert.equal(whole.marks, stored.steps.length, 'every entry has its mark on the rail');
  assert.ok(whole.now.startsWith(stored.now) && whole.nowLabel === 'Now', 'the full view ends at "Now"');
  assert.ok(whole.key >= 2);
  await typeIsOneSystem('#r21Timelines', 'one timeline');
  await page.locator('#r21Timelines [data-r21-back]').click();
  await page.locator('#r21Timelines .r21-card').first().waitFor();
  await typeIsOneSystem('#r21Timelines', 'the list of timelines');
  await page.keyboard.press('Escape');
  await page.locator('#r21Timelines[open]').waitFor({ state: 'detached' });

  // ---- a step on the card opens the chart there; the window lists every step ----
  await chart.locator('.mk-fc-q', { hasText: 'Do the writings establish an agreement?' }).click();
  await page.locator('dialog#dklaFlowcharts[open]').waitFor();
  await page.locator('#flowchartDetail h3', { hasText: 'Do the writings establish an agreement?' }).waitFor();
  const list = page.locator('#dklaFlowcharts .fc-trail li');
  await expect13(list);
  assert.equal(
    await page.locator('#dklaFlowcharts .fc-trail li.fc-on-path').count(),
    2,
    'steps 1 and 2 walked',
  );
  assert.match(
    await page.locator('#dklaFlowcharts .fc-trail li.fc-on-path').first().innerText(),
    /Article 2/,
    'a walked step carries the answer taken',
  );
  await list.filter({ hasText: 'Are both parties merchants?' }).locator('button').click();
  await page.locator('#flowchartDetail h3', { hasText: 'Are both parties merchants?' }).waitFor();
  await expect13(list);
  const column = await page.locator('#dklaFlowcharts .fc-trail').evaluate((el) => {
    const now = el.querySelector('[aria-current="step"]').getBoundingClientRect(),
      box = el.getBoundingClientRect();
    return {
      inView: now.top >= box.top - 1 && now.bottom <= box.bottom + 1,
      fits: box.bottom <= innerHeight,
      size: parseFloat(getComputedStyle(el.querySelector('.fc-trail-q')).fontSize),
    };
  });
  assert.ok(column.inView, 'the step being read is in sight in the list');
  assert.ok(column.size >= 14, 'the list is readable');
  await typeIsOneSystem('#dklaFlowcharts', 'flowchart walkthrough');
  await page.locator('#dklaFlowcharts [data-flowcharts-view="map"]').click();
  await page.locator('#dklaFlowcharts .fc-map:not([hidden]) .fc-map-node').first().waitFor();
  await typeIsOneSystem('#dklaFlowcharts', 'flowchart map');
  await page.locator('#dklaFlowcharts [data-flowcharts-library]').click();
  await page.locator('#dklaFlowcharts .fc-card').first().waitFor();
  await typeIsOneSystem('#dklaFlowcharts', 'flowchart library');
  await page.keyboard.press('Escape');

  // ---- a long timeline shows every entry ----
  await page.evaluate(() => (location.hash = 'node=shoe'));
  const long = page.locator('#inspector .dkla-timeline.mk-tl[data-r21="pj"]');
  await long.waitFor();
  assert.equal(await long.locator('li.mk-tl-row:not(.mk-tl-now)').count(), 16, 'all 16 entries');
  assert.equal(await long.locator('li.mk-tl-row.mk-here').count(), 1);
  const height = await long.evaluate((el) => el.offsetHeight);
  assert.ok(height < 1900, `16 entries in ${height}px`);

  assert.deepEqual(errors, []);
  console.log(
    'PASS timeline card (every entry, connection sentence, gaps, Now, key), flowchart card (full path and answers), full timeline (3+ entries a screen), chart window (all steps listed), 16-entry timeline, one set of type in both windows',
  );
} finally {
  await browser.close();
}
async function expect13(list) {
  assert.equal(await list.count(), 13, 'all 13 steps of K-16 are listed');
}
