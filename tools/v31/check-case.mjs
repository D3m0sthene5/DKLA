/* v3.1 case page, in a real browser (owner-approved design audit, 18 November 2026).

     node tools/v31/check-case.mjs http://127.0.0.1:8766/DKLA-v3.1.html

   C. Itoh v. Jordan, the case in the audit:
   - the reading area is wider than the old 560 px panel and leaves a strip of map;
   - one order: header, the rule, "Where this case sits" (timeline, then flowchart steps), the brief,
     connections, sources, study; the rail lists those places and moves the page to them;
   - nothing is lost and nothing repeats: one full brief, one notes drawer and no loose Notes block;
   - the timeline preview puts every entry on its axis and marks this case;
   - the flowchart card names K-16 steps 3 and 8, and opens the chart at step 3 with the path to it
     walked and a way back to the case;
   - the full timeline marks the case it was opened from;
   - the page settles (no two modules moving the same block back and forth).
   Then the consideration dictionary entry: its " - " examples are a list. */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
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
await page.goto(address.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
await page.waitForFunction(() => window.LegalAtlas?.ready);
await page.evaluate(() => {
  location.hash = 'node=citoh';
});
const body = page.locator('#inspector .reader-body.v31-case');
await body.locator('.v31-chart-steps').waitFor();
// On the hosted page the dictionary arrives after start-up (src/features/performance/data-loader.js); its
// "Terms in this entry" block joins the case page when it does.
await page.evaluate(() => window.DKLA?.whenGlossary?.());
await body.locator('.dkla-terms').waitFor();

// The page settles: count child-list changes in the reader over one second.
const changes = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let n = 0;
      const watch = new MutationObserver((list) => (n += list.length));
      watch.observe(document.getElementById('inspector'), { childList: true, subtree: true });
      setTimeout(() => {
        watch.disconnect();
        resolve(n);
      }, 1000);
    }),
);
assert.ok(changes < 5, `the case page settles (${changes} changes in a second)`);

const layout = await page.evaluate(() => {
  const inspector = document.getElementById('inspector').getBoundingClientRect();
  const body = document.querySelector('#inspector .reader-body');
  const kind = (el) =>
    el.matches('.v31-rail')
      ? 'rail'
      : el.matches('.v25-record-header')
        ? 'header'
        : el.matches('.takeaway')
          ? 'rule'
          : el.matches('h3.v31-h')
            ? 'h:' + el.dataset.v31H
            : el.matches('.v28-case-timelines')
              ? 'timeline'
              : el.matches('.v31-chart-steps')
                ? 'charts'
                : el.matches('.case-box')
                  ? 'brief'
                  : el.matches('.r6-connections')
                    ? 'connections'
                    : el.matches('.r18-recall')
                      ? 'recall'
                      : el.matches('.dkla-terms')
                        ? 'terms'
                        : null;
  return {
    width: inspector.width,
    left: inspector.left,
    order: [...body.children].map(kind).filter(Boolean),
    briefs: body.querySelectorAll('.r19-brief').length,
    notesDrawers: body.querySelectorAll(':scope > .v31-notes').length,
    looseNotes: [...body.querySelectorAll(':scope > h3')].filter((h) => /^Notes$/.test(h.textContent.trim()))
      .length,
    rail: [...body.querySelectorAll('.v31-rail [data-v31-place]')].map((b) => b.textContent),
    dots: body.querySelectorAll('.v31-tl .v31-dot').length,
    here: body.querySelectorAll('.v31-tl .v31-dot.v31-here').length,
    chartMeta: body.querySelector('.v31-chart .v31-meta')?.textContent,
    fonts: [
      ...new Set(
        [...body.querySelectorAll('h2,h3,p,strong,button')].map((el) =>
          getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g, ''),
        ),
      ),
    ],
  };
});
assert.ok(
  layout.width > 800 && layout.left >= 230,
  `wider reader with a map strip (${layout.width} at ${layout.left})`,
);
assert.deepEqual(layout.order, [
  'rail',
  'header',
  'rule',
  'h:where',
  'timeline',
  'charts',
  'h:brief',
  'brief',
  'connections',
  'h:sources',
  'recall',
  'terms',
]);
assert.equal(layout.briefs, 1, 'one full brief');
assert.equal(layout.notesDrawers, 1, 'the notes are in one drawer');
assert.equal(layout.looseNotes, 0, 'no loose Notes block');
assert.deepEqual(layout.rail, [
  'The rule',
  'Timeline',
  'Flowchart steps',
  '1 Parties',
  '2 Procedure',
  '3 Facts',
  '4 Issue',
  '5 Holding',
  '6 Reasoning',
  'Connections',
  'Sources',
  'Study',
]);
assert.equal(layout.dots, 6, 'all six timeline entries on the axis');
assert.equal(layout.here, 1, 'this case marked on the axis');
// K-16 gained node n (one form arriving after payment; OP-CT-08), so it has 14 steps.
assert.match(layout.chartMeta, /K-16 · steps 3, 8 of 14/);
assert.ok(
  !layout.fonts.some((f) => /Georgia|apple-system|system-ui/i.test(f)),
  `reader fonts: ${layout.fonts}`,
);

// The rail moves the page.
const before = await page.evaluate(() => document.getElementById('inspector').scrollTop);
await body.locator('.v31-rail [data-v31-place]', { hasText: '5 Holding' }).click();
await page.waitForFunction((y) => document.getElementById('inspector').scrollTop > y + 400, before);

// The full timeline marks this case.
await page.evaluate(() => (document.getElementById('inspector').scrollTop = 0));
await body.locator('.v31-tl [data-r21-open]').click();
await page.locator('#r21Timelines[open] .r21-v > li.v31-here[aria-current="step"]').waitFor();
await page.keyboard.press('Escape');
await page.locator('#r21Timelines[open]').waitFor({ state: 'detached' });

// The flowchart opens at step 3 with the path walked and a way back.
await body.locator('.v31-chart .v31-open').first().click();
await page.locator('dialog#dklaFlowcharts[open]').waitFor();
await page
  .locator('#flowchartDetail h3', { hasText: 'Did the offeror assent or did both sides perform?' })
  .waitFor();
assert.equal(await page.locator('.fc-trail li').count(), 3, 'steps 1, 2 and 3 in the path');
assert.equal(await page.locator('#flowchartDetail .fc-own').count(), 1, 'the branch Itoh takes is marked');
assert.match(await page.locator('.fc-side .fc-sources').innerText(), /Case\s*C\. Itoh/);
await page.locator('.fc-back-entry').click();
await page.locator('dialog#dklaFlowcharts[open]').waitFor({ state: 'detached' });
await page.locator('#inspector .reader-body.v31-case .v31-chart-steps').waitFor();

// Sol's canon index and lecture notes take their places in the order (Loper Bright has both).
await page.evaluate(() => {
  location.hash = 'node=lrs-i-loper-bright';
});
await page.locator('#inspector .reader-body.v31-case .canons-related').waitFor();
const loper = await page.evaluate(() => {
  const kids = [...document.querySelector('#inspector .reader-body').children];
  const at = (sel) => kids.findIndex((el) => el.matches(sel));
  return {
    canons: at('.canons-related'),
    where: at('[data-v31-h="where"]'),
    brief: at('[data-v31-h="brief"]'),
    sources: at('[data-v31-h="sources"]'),
    lectures: at('.lecture-related'),
    rail: [...document.querySelectorAll('#inspector .v31-rail [data-v31-place]')].map((b) => b.textContent),
  };
});
assert.ok(
  loper.where < loper.canons && loper.canons < loper.brief,
  'canons sit under "Where this case sits"',
);
assert.ok(loper.lectures < 0 || loper.lectures > loper.sources, 'lecture notes sit under Sources');
assert.ok(loper.rail.includes('Canons'), 'the rail lists the canons');

// The dictionary lists the examples.
await page.evaluate(() => {
  location.hash = 'term=consideration';
});
await page.locator('#glossaryDialog[open]').waitFor();
await page.locator('#glFind').fill('consideration');
await page.locator('#glossaryDialog [data-term="consideration"]').click();
await page.locator('.gl-detail .gl-lead').waitFor();
assert.equal(await page.locator('.gl-detail .gl-examples li').count(), 3, 'three listed examples');

assert.deepEqual(errors, []);
await browser.close();
console.log(
  `v3.1 case page: ${Math.round(layout.width)} px reader, ${layout.order.length} parts in order, rail of ${layout.rail.length}, timeline axis of ${layout.dots}, K-16 opens at step 3; dictionary examples listed.`,
);
