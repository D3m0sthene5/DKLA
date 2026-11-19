/* The reader, one facet at a time, in a real browser (v3.2 "Instrument": docs/DESIGN.md).

     node tools/v31/check-case.mjs http://127.0.0.1:8766/DKLA-v3.1.html

   C. Itoh v. Jordan (Contracts), then Loper Bright (LRS), a concept and a rule page:
   - the reading area is wider than the old 560 px panel and leaves a strip of map;
   - under the header sits one facet bar: a tablist with a tab per facet that has something in it, each
     with its count (Timeline 6, Flowchart 2, Lecture 1, Connections 9, Sources 7), and the Cold Call
     button in its own place; Brief is open and starts on the first screen;
   - one facet at a time: opening a facet shows its blocks and no other facet's; nothing is lost and
     nothing repeats (one full brief behind Short | Full, one list of sources with no reading twice);
   - the header: the entry's name, its citation line once the brief has arrived, the line under its
     picture; the top strip names where it sits, then the entry once the name has scrolled away;
   - the close button is 36 px, in the same place for a case, a concept and a rule page, which share
     one left edge;
   - the rail (the rule and the six parts) exists only beside the short brief, moves the page and marks
     the part being read;
   - the bar stays where it is while the page scrolls and when the facet changes; each facet remembers
     where it was read to;
   - arrow keys move along the tabs, 1 to 9 open a facet, a link can name a facet (#node=…&facet=…), and
     coming back from a flowchart or a timeline lands on the facet it was opened from;
   - a block that arrives late adds its tab and count without moving what is being read;
   - the timeline puts every entry on its axis and marks this case; the flowchart names K-16 steps 3
     and 8 and opens the chart at step 3 with the path walked and a way back;
   - the page settles (no two layers moving the same block back and forth).
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
// Every facet change the page announces, for the checks below.
await page.evaluate(() => {
  window.facetEvents = [];
  document.addEventListener('dkla:facet', (event) => window.facetEvents.push(event.detail));
});
const open = (hash) =>
  page.evaluate((h) => {
    location.hash = h;
  }, hash);
const body = page.locator('#inspector .reader-body.v32');
const tab = (id) => page.locator(`#inspector .v32-tabs [data-v32-tab="${id}"]`);
// Open a facet and wait for its short fade to end (a block that is fading in is still moving 8 px).
const show = (id) =>
  page.evaluate(async (facet) => {
    window.DKLAReader.show(facet);
    const moving = document
      .querySelector('#inspector .reader-body')
      .getAnimations({ subtree: true })
      .filter((animation) => /^v32-in/.test(animation.animationName));
    await Promise.all(moving.map((animation) => animation.finished.catch(() => {})));
  }, id);
// What is on show: the facet that is open and every block of the body that is drawn.
const shown = () =>
  page.evaluate(() => {
    const host = document.querySelector('#inspector .reader-body.v32');
    return {
      open: window.DKLAReader.current(),
      facets: [
        ...new Set(
          [...host.children]
            .filter((el) => el.dataset.v32Facet && el.getClientRects().length)
            .map((el) => el.dataset.v32Facet),
        ),
      ],
    };
  });

await open('node=citoh');
await body.locator('.v31-chart-steps').waitFor({ state: 'attached' });
// On the hosted page the dictionary and the Cold Call accounts arrive after start-up
// (src/features/performance/data-loader.js); their parts join the page when they do.
await page.evaluate(() => window.DKLA?.whenGlossary?.());
await body.locator('.dkla-terms').waitFor();
await page.evaluate(() => window.DKLAColdCall?.whenLoaded?.());
await page.locator('#inspector .v32-cc [data-cold-call="citoh"]').waitFor();
await page.waitForFunction(() =>
  document.querySelector('#inspector .v32-head .v32-meta')?.textContent.includes('F.2d'),
);

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

/* ---------- the first screen ---------- */
const layout = await page.evaluate(() => {
  const reader = document.getElementById('inspector'),
    box = reader.getBoundingClientRect(),
    host = reader.querySelector('.reader-body'),
    at = (selector) => reader.querySelector(selector)?.getBoundingClientRect(),
    style = (selector) => getComputedStyle(reader.querySelector(selector));
  const tabs = [...reader.querySelectorAll('.v32-tabs > [role="tab"]')];
  const close = at('#closeInspector');
  return {
    width: box.width,
    left: box.left,
    tablist: reader.querySelector('.v32-tabs').getAttribute('role'),
    tabs: tabs.map((t) => t.textContent.trim().replace(/\s+/g, ' ')),
    selected: tabs.filter((t) => t.getAttribute('aria-selected') === 'true').map((t) => t.dataset.v32Tab),
    focusable: tabs.filter((t) => t.tabIndex === 0).length,
    api: window.DKLAReader.facets(),
    current: window.DKLAReader.current(),
    coldCall: at('.v32-cc [data-cold-call]'),
    firstTab: at('.v32-tabs > [role="tab"]'),
    title: at('.v32-head h2'),
    titleFont: style('.v32-head h2').fontFamily,
    meta: reader.querySelector('.v32-head .v32-meta').textContent,
    tagline: reader.querySelector('.v32-head .v32-tag').textContent.trim(),
    strip: reader.querySelector('.reader-top .v32-ident').textContent,
    rule: at('.reader-body > .takeaway'),
    ruleSize: style('.reader-body > .takeaway').fontSize,
    part: at('.case-box > section > h3'),
    partSize: style('.case-box > section p').fontSize,
    close: {
      width: close.width,
      height: close.height,
      right: box.right - close.right,
      top: close.top - box.top,
    },
    closeIcon: !!reader.querySelector('#closeInspector svg'),
    briefs: host.querySelectorAll('[data-r19-fill]').length,
    looseNotes: [...host.querySelectorAll(':scope > h3:not(.v32-fh)')].filter((h) =>
      /^Notes$/.test(h.textContent.trim()),
    ).length,
    fonts: [
      ...new Set(
        [...host.querySelectorAll('h2,h3,p,strong,button')]
          .filter((el) => el.getClientRects().length)
          .map((el) => getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g, '')),
      ),
    ],
    bottom: innerHeight,
  };
});
assert.ok(
  layout.width > 800 && layout.left >= 230,
  `wider reader with a map strip (${layout.width} at ${layout.left})`,
);
assert.equal(layout.tablist, 'tablist');
assert.deepEqual(layout.tabs, ['Brief', 'Doctrine', 'Class notes 1', 'Sources 7', 'Notes']);
assert.deepEqual(
  layout.api.map((f) => [f.id, f.label, f.count]),
  [
    ['brief', 'Brief', ''],
    ['doctrine', 'Doctrine', ''],
    ['lecture', 'Class notes', '1'],
    ['sources', 'Sources', '7'],
    ['study', 'Notes', ''],
  ],
  'window.DKLAReader.facets() lists the same facets',
);
assert.deepEqual(layout.selected, ['brief'], 'Brief is open');
assert.equal(layout.current, 'brief');
assert.equal(layout.focusable, 1, 'one tab is in the tab order');
assert.deepEqual(await shown(), { open: 'brief', facets: ['brief'] }, 'only the Brief facet is drawn');
assert.ok(
  layout.rule.top < layout.bottom * 0.6 && layout.part.top < layout.bottom,
  `the rule (${Math.round(layout.rule.top)}) and the first part (${Math.round(layout.part.top)}) are on the first screen`,
);
assert.equal(layout.ruleSize, '22px', 'the rule is the hero');
assert.equal(layout.partSize, '17px', 'the parts are set in the reading size');
assert.equal(layout.meta, '552 F.2d 1228 (7th Cir. 1977)', 'the citation line');
assert.equal(layout.tagline, 'Steel coils, delivered without a deal');
assert.match(layout.strip, /^Contracts.*Battle of the forms.*Formation by conduct/);
assert.match(layout.titleFont, /Exo 2/);
assert.ok(
  Math.abs(layout.title.left - layout.firstTab.left - 12) <= 1 &&
    Math.abs(layout.title.left - layout.rule.left) <= 1,
  'the name, the first tab and the rule share one left edge',
);
assert.ok(
  layout.coldCall.height === 36 && layout.coldCall.right < layout.title.left,
  'the Cold Call button is 36 px high, in the margin beside the tabs',
);
assert.ok(
  layout.close.width === 36 && layout.close.height === 36 && layout.close.right <= 24 && layout.closeIcon,
  `the close button is 36 px with an icon (${JSON.stringify(layout.close)})`,
);
assert.equal(layout.briefs, 1, 'one full brief');
assert.equal(layout.looseNotes, 0, 'no loose Notes block');
assert.ok(
  !layout.fonts.some((f) => /Georgia|apple-system|system-ui|Segoe/i.test(f)),
  `reader fonts: ${layout.fonts}`,
);
assert.equal(await page.locator('#inspector [data-v25-full-brief], #inspector [data-v28-source]').count(), 0);
assert.deepEqual(
  await page.evaluate(
    () => window.facetEvents.at(-1) && [window.facetEvents[0].reason, window.facetEvents[0].entry],
  ),
  ['open', 'node:citoh'],
  'opening an entry is announced',
);

/* ---------- the rail: only beside the short brief ---------- */
const rail = page.locator('#inspector .v31-rail [data-v31-place]');
assert.deepEqual(
  await rail.allTextContents(),
  ['The rule', '1 Parties', '2 Procedure', '3 Facts', '4 Issue', '5 Holding', '6 Reasoning'],
  'the rail lists the rule and the six parts',
);
const before = await page.evaluate(() => document.getElementById('inspector').scrollTop);
await rail.filter({ hasText: '5 Holding' }).click();
await page.waitForFunction((y) => document.getElementById('inspector').scrollTop > y + 400, before);
// The rail marks the part being read. A click marks its place at once and the page settles with that
// heading at the top of the reading area (under the strip and the facet bar); scrolling by hand, the mark
// moves to a part as soon as its heading is in the top third of the reading area.
const marked = () =>
  page.evaluate(() => {
    const reader = document.getElementById('inspector'),
      nav = reader.querySelector('.v31-rail'),
      now = [...nav.querySelectorAll('[aria-current="location"]')].map((b) => b.textContent),
      top = window.DKLAReading.readingTop();
    const at = (label) => {
      const i = [...nav.querySelectorAll('[data-v31-place]')].findIndex((b) => b.textContent === label);
      return Math.round(nav.v31Targets[i].getBoundingClientRect().top - top);
    };
    return { now, holding: at('5 Holding'), parties: at('1 Parties') };
  });
assert.deepEqual((await marked()).now, ['5 Holding'], 'the clicked place is marked at once');
await page.waitForFunction(() => {
  const reader = document.getElementById('inspector');
  const y = reader.scrollTop;
  return new Promise((done) => setTimeout(() => done(reader.scrollTop === y), 500));
});
let place = await marked();
assert.deepEqual(place.now, ['5 Holding']);
assert.ok(
  place.holding >= 0 && place.holding <= 32,
  `"5 Holding" is at the top of the reading area (${place.holding} px)`,
);
// By hand: "1 Parties" 100 px below the top of the reading area is the part being read.
await page.evaluate(() => {
  const reader = document.getElementById('inspector'),
    nav = reader.querySelector('.v31-rail'),
    i = [...nav.querySelectorAll('[data-v31-place]')].findIndex((b) => b.textContent === '1 Parties');
  reader.scrollTop += nav.v31Targets[i].getBoundingClientRect().top - window.DKLAReading.readingTop() - 100;
});
await page.waitForFunction(
  () => document.querySelector('#inspector .v31-rail [aria-current="location"]')?.textContent === '1 Parties',
  null,
  { timeout: 5000 },
);
place = await marked();
assert.ok(Math.abs(place.parties - 100) <= 2, `"1 Parties" is 100 px down (${place.parties})`);

/* ---------- the bar stays put; the strip names the entry once its name has scrolled away ---------- */
const bar = () =>
  page.evaluate(() => {
    const reader = document.getElementById('inspector'),
      strip = reader.querySelector('.reader-top');
    return {
      top: Math.round(
        reader.querySelector('.v32-bar').getBoundingClientRect().top - strip.getBoundingClientRect().bottom,
      ),
      titled: strip.classList.contains('v32-titled'),
      now: getComputedStyle(strip.querySelector('.v32-now')).opacity,
      name: strip.querySelector('.v32-now').textContent,
      scroll: reader.scrollTop,
    };
  });
await page.waitForFunction(() => document.querySelector('#inspector .reader-top.v32-titled'));
let stuck = await bar();
assert.equal(stuck.top, 0, 'the facet bar sits under the strip while the brief scrolls');
assert.match(stuck.name, /^C\. Itoh/);
const readTo = stuck.scroll;
await tab('sources').click();
assert.deepEqual(await shown(), { open: 'sources', facets: ['sources'] });
stuck = await bar();
assert.equal(stuck.top, 0, 'the bar does not move when a short facet opens');
assert.equal(await rail.first().isVisible(), false, 'no rail beside another facet');
await tab('brief').click();
assert.equal((await bar()).scroll, readTo, 'the brief is where it was read to');

/* ---------- every facet shows its own content ---------- */
await page.evaluate(() => (document.getElementById('inspector').scrollTop = 0));
// Doctrine holds, in full, what the sheet's side column summarises. The old names open their part.
await show('timeline');
assert.deepEqual(await shown(), { open: 'doctrine', facets: ['doctrine'] });
const timeline = body.locator('.v31-tl');
assert.equal(await timeline.locator('.v31-dot').count(), 6, 'all six timeline entries on the axis');
assert.equal(await timeline.locator('.v31-dot.v31-here').count(), 1, 'this case marked on the axis');
assert.equal(await timeline.locator('.v31-tl-rows > li').count(), 6, 'every entry is a row');
assert.match(await timeline.locator('li[aria-current="step"]').innerText(), /C\. Itoh[\s\S]*You are here/);
// The full timeline marks this case, and closing it comes back to the Timeline facet.
await timeline.locator('[data-r21-open]').click();
await page.locator('#r21Timelines[open] .r21-v > li.v31-here[aria-current="step"]').waitFor();
await page.keyboard.press('Escape');
await page.locator('#r21Timelines[open]').waitFor({ state: 'detached' });
assert.equal((await shown()).open, 'doctrine');

await show('flowchart');
assert.deepEqual(await shown(), { open: 'doctrine', facets: ['doctrine'] });
const chart = body.locator('.v31-chart').first();
assert.match(await chart.locator('.v31-meta').innerText(), /K-16\s+steps 3, 8 of 13/);
assert.deepEqual(
  await chart.locator('.v32-path').first().locator('.v32-step-n').allTextContents(),
  ['1', '2', '3', '8'],
  'the path to the steps this case decides',
);
assert.equal(await chart.locator('.v32-step.v31-own').count(), 2, 'its two steps are marked');
assert.deepEqual(
  await chart.locator('.v32-step.v31-own .v32-step-why').allTextContents(),
  [
    'C. Itoh (America) v. Jordan is a source for this step',
    'C. Itoh (America) v. Jordan is a source for this step',
  ],
  'each of its steps says why the case is there',
);
assert.equal(await chart.locator('.v32-step.v31-own .v32-step-detail').count(), 2, 'with the explanation');
// The flowchart opens at step 3 with the path walked, and its way back lands on the Flowchart facet.
await chart.locator('.v31-open').click();
await page.locator('dialog#dklaFlowcharts[open]').waitFor();
await page
  .locator('#flowchartDetail h3', { hasText: 'Did the offeror assent or did both sides perform?' })
  .waitFor();
assert.equal(await page.locator('.fc-trail li').count(), 3, 'steps 1, 2 and 3 in the path');
assert.equal(await page.locator('#flowchartDetail .fc-own').count(), 1, 'the branch Itoh takes is marked');
assert.match(await page.locator('.fc-side .fc-sources').innerText(), /Case\s*C\. Itoh/);
await page.locator('.fc-back-entry').click();
await page.locator('dialog#dklaFlowcharts[open]').waitFor({ state: 'detached' });
await body.locator('.v31-chart-steps').waitFor();
assert.equal((await shown()).open, 'doctrine', 'back from the chart, Doctrine is still open');

await show('lecture');
assert.deepEqual(await shown(), { open: 'lecture', facets: ['lecture'] });
assert.equal(await body.locator('.lecture-related .lecture-note').count(), 1);

await show('connections');
assert.deepEqual(await shown(), { open: 'doctrine', facets: ['doctrine'] });
assert.equal(
  await body.locator('.r6-connections .study-connection:visible').count(),
  9,
  'all nine, no drawer',
);
assert.equal(await body.locator('#remainingConnections').count(), 0);

await show('sources');
const sources = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#inspector .v32-sources [data-v32-source]')];
  return {
    kinds: rows.map((r) => r.dataset.v32Source),
    targets: rows.map((r) => r.dataset.dklaFile || r.dataset.authorityOpen || r.getAttribute('href')),
    original: rows.findIndex((r) => 'v32Original' in r.dataset),
    small: rows.filter((r) => r.getBoundingClientRect().height !== 36).length,
    chips: [
      ...document.querySelectorAll(
        '#inspector .dkla-file-chips button, #inspector .source-strip a, #inspector .r28-original-sources button, #inspector .authority-context button',
      ),
    ].filter((el) => el.getClientRects().length).length,
    record: document.querySelector('#inspector #entryAudit > summary')?.textContent,
  };
});
assert.deepEqual(sources.kinds, ['reading', 'file', 'file', 'rule', 'rule', 'rule', 'rule']);
assert.equal(new Set(sources.targets).size, 7, `no source is listed twice (${sources.targets})`);
assert.equal(sources.original, 0, 'the original source leads the list');
assert.equal(sources.small, 0, 'rows are 36 px');
assert.equal(sources.chips, 0, 'the old source chips are not shown beside the list');
assert.equal(sources.record, 'Record');

await show('study');
assert.deepEqual(await shown(), { open: 'study', facets: ['study'] });
for (const part of ['.r18-recall .r18-chip', '.v32-notes .note-text', '.reading-actions [data-edit-node]'])
  assert.ok(await body.locator(part).first().isVisible(), `Study shows ${part}`);

/* ---------- Short | Full ---------- */
await show('brief');
await body.locator('.v32-brief-head [data-v32-mode="full"]').click();
await body.locator('.r19-brief [data-r19-fill][data-done="1"]').waitFor();
assert.equal(
  await body.locator(':scope > .case-box').isVisible(),
  false,
  'the full brief takes the place of the six parts',
);
assert.equal(await rail.first().isVisible(), false, 'no rail beside the full brief');
assert.equal(await page.evaluate(() => window.DKLAReader.mode()), 'full');
await body.locator('.v32-brief-head [data-v32-mode="short"]').click();
assert.ok(await body.locator(':scope > .case-box').isVisible());

/* ---------- keyboard ---------- */
await tab('brief').focus();
await page.keyboard.press('ArrowRight');
assert.equal((await shown()).open, 'doctrine', 'Arrow Right opens the next facet');
assert.equal(await page.evaluate(() => document.activeElement.dataset.v32Tab), 'doctrine');
await page.keyboard.press('End');
assert.equal((await shown()).open, 'study');
await page.keyboard.press('Home');
assert.equal((await shown()).open, 'brief');
await page.evaluate(() => document.activeElement.blur());
await page.keyboard.press('3');
assert.equal((await shown()).open, 'lecture', '3 opens the third facet');
await page.locator('#search').focus();
await page.keyboard.press('2');
assert.equal((await shown()).open, 'lecture', 'a number typed into a field is not a shortcut');
await page.locator('#search').fill('');
await page.evaluate(() => document.activeElement.blur());
await page.keyboard.press('Escape');
assert.ok(
  await page.evaluate(() => window.facetEvents.some((e) => e.reason === 'change' && e.facet === 'lecture')),
  'a change of facet is announced',
);

/* ---------- a block that arrives late ---------- */
await show('brief');
await page.evaluate(() => (document.getElementById('inspector').scrollTop = 600));
const late = await page.evaluate(async () => {
  const reader = document.getElementById('inspector'),
    host = reader.querySelector('.reader-body'),
    part = host.querySelector('.case-box > section > h3'),
    y = () => part.getBoundingClientRect().top;
  const beforeY = y();
  host.insertAdjacentHTML(
    'beforeend',
    '<nav class="canons-related"><ul class="v32-rows"><li><a class="v32-row" href="#canons">One</a></li><li><a class="v32-row" href="#canons">Two</a></li></ul></nav>',
  );
  await new Promise((done) => setTimeout(done, 100));
  const out = {
    tabs: [...reader.querySelectorAll('.v32-tabs > [role="tab"]')].map((t) =>
      t.textContent.trim().replace(/\s+/g, ' '),
    ),
    open: window.DKLAReader.current(),
    moved: y() - beforeY,
    drawn: host.querySelector(':scope > .canons-related').getClientRects().length,
    told: window.facetEvents.at(-1).reason,
  };
  host.querySelector(':scope > .canons-related').remove();
  await new Promise((done) => setTimeout(done, 100));
  out.after = reader.querySelectorAll('.v32-tabs > [role="tab"]').length;
  return out;
});
assert.deepEqual(
  late.tabs.slice(0, 4),
  ['Brief', 'Doctrine', 'Canons 2', 'Class notes 1'],
  'the late block has its tab and count',
);
assert.equal(late.open, 'brief');
assert.ok(Math.abs(late.moved) < 0.5, `what is being read does not move (${late.moved} px)`);
assert.equal(late.drawn, 0, 'a late block of another facet is not drawn into the open one');
assert.equal(late.told, 'update');
assert.equal(late.after, 5, 'and its tab goes when it goes');

/* ---------- a link to a facet ---------- */
await open('node=citoh&facet=timeline');
await page.waitForFunction(() => window.DKLAReader.current() === 'doctrine');
assert.deepEqual(await shown(), { open: 'doctrine', facets: ['doctrine'] });

/* ---------- Loper Bright: canons, lecture notes and the Court's vote ---------- */
await open('node=lrs-i-loper-bright');
await page.waitForFunction(() => window.facetEvents.at(-1)?.entry === 'node:lrs-i-loper-bright');
await body.locator('.canons-related').waitFor({ state: 'attached' });
await page.waitForFunction(() => window.DKLAReader.facets().some((f) => f.id === 'court'));
const loper = await page.evaluate(() => ({
  open: window.DKLAReader.current(),
  facets: window.DKLAReader.facets().map((f) => f.label + (f.count ? ' ' + f.count : '')),
}));
assert.equal(loper.open, 'brief', 'another entry opens on its brief');
assert.deepEqual(loper.facets, [
  'Brief',
  'Doctrine',
  'Canons 11',
  'Class notes 4',
  'Court 6–2',
  'Sources 5',
  'Notes',
]);
// The caption is composed from the title: one case to a line, the second smaller, the year in the
// citation line and the strip; the heading's text is still the title.
const caption = await page.evaluate(() => {
  const h = document.querySelector('#inspector .v32-head h2');
  const lines = [...h.querySelectorAll('.v32-case-line')];
  return {
    text: h.textContent,
    lines: lines.map((l) => l.textContent),
    tops: lines.map((l) => Math.round(l.getBoundingClientRect().top)),
    sizes: lines.map((l) => getComputedStyle(l).fontSize),
    yearDrawn: [...h.querySelectorAll('.v32-vh')].some((el) => el.getClientRects().length),
    court: document.querySelector('#inspector .reader-top .v32-court')?.textContent,
    art: (() => {
      const a = document.querySelector('#inspector .v32-head .v32-art').getBoundingClientRect();
      return [Math.round(a.width), Math.round(a.height)];
    })(),
  };
});
assert.equal(
  caption.text,
  'Loper Bright Enterprises v. Raimondo; Relentless, Inc. v. Department of Commerce (2024)',
);
assert.deepEqual(caption.lines, [
  'Loper Bright Enterprises v. Raimondo',
  'Relentless, Inc. v. Department of Commerce',
]);
assert.ok(caption.tops[1] > caption.tops[0], 'the second case is on its own line');
assert.deepEqual(caption.sizes, ['34px', '22px'], 'and one step down');
assert.equal(caption.yearDrawn, false, 'the year is not drawn in the name');
assert.equal(caption.court, 'Supreme Court · 2024');
assert.deepEqual(caption.art, [48, 48], 'the pictogram is an illustration');
// Where this case sits, beside the brief: its place on the timeline, its flowchart steps, connections.
const sits = await page.evaluate(() => {
  const aside = document.querySelector('#inspector .v32-sits');
  return {
    kinds: [...aside.querySelectorAll('.v32-sit-kind')].map((k) => k.textContent.replace(/\s+/g, ' ').trim()),
    steps: aside.querySelectorAll('.v32-sit-steps > li').length,
    more: aside.querySelector('.v32-sit-more')?.textContent,
    links: aside.querySelectorAll('.v32-sit-links > li').length,
    beside:
      aside.getBoundingClientRect().left >
      document.querySelector('#inspector .case-box').getBoundingClientRect().right,
  };
});
assert.deepEqual(sits.kinds, ['Timeline 10th of 10', 'Flowchart 14 steps in 4 charts', 'Connections 12']);
assert.equal(sits.steps, 3, 'at most three steps beside the brief');
assert.match(sits.more, /^\+ 11 more steps in \d charts$/);
assert.equal(sits.links, 3);
assert.ok(sits.beside, 'the column sits beside the brief');
await body.locator('.v32-sits [data-v32-go="flowchart"]').click();
assert.deepEqual(await shown(), { open: 'doctrine', facets: ['doctrine'] }, 'each part opens Doctrine');
await show('canons');
assert.deepEqual(await shown(), { open: 'canons', facets: ['canons'] });
assert.equal(await body.locator('.canons-related .v32-entry:visible').count(), 11, 'one row a canon');
assert.equal(
  await body.locator('.canons-related .v32-entry-does:visible').count(),
  11,
  'each says what the canon does',
);
assert.match(
  await body.locator('.canons-related .v32-entry-here').first().innerText(),
  /^(Applied|Discussed) in this case/,
  'and what the record says this case has to do with it',
);
await show('court');
assert.equal(await body.locator('.sh-case-panel .sh-vote:visible').count(), 9, 'the nine justices');
const loperClose = await page.evaluate(() => {
  const box = document.getElementById('inspector').getBoundingClientRect(),
    c = document.getElementById('closeInspector').getBoundingClientRect();
  return [
    Math.round(box.right - c.right),
    Math.round(c.top - box.top),
    Math.round(document.querySelector('#inspector h2').getBoundingClientRect().left),
  ];
});

/* ---------- a concept and a rule page: the same header, close button and left edge ---------- */
await open('node=conditional-acceptance');
await page.waitForFunction(() => window.facetEvents.at(-1)?.entry === 'node:conditional-acceptance');
const concept = await page.evaluate(() => {
  const reader = document.getElementById('inspector'),
    box = reader.getBoundingClientRect(),
    c = document.getElementById('closeInspector').getBoundingClientRect();
  return {
    close: [
      Math.round(box.right - c.right),
      Math.round(c.top - box.top),
      Math.round(reader.querySelector('h2').getBoundingClientRect().left),
    ],
    first: window.DKLAReader.facets()[0].label,
    kind: reader.querySelector('.v32-head .v32-tag').textContent.trim(),
    coldCall: reader.querySelectorAll('[data-cold-call]').length,
    rail: reader.querySelectorAll('.v31-rail').length,
  };
});
assert.deepEqual(concept.close, loperClose, 'a concept: the same close button and left edge');
assert.equal(concept.first, 'Overview');
assert.equal(concept.kind, 'Concept');
assert.equal(
  concept.coldCall + concept.rail,
  0,
  'no Cold Call button and no rail where there is nothing behind them',
);
await page.evaluate(() => window.DKLAAuthorities.open('ucc-2-207'));
await page.locator('#inspector .reader-body.v32-plain .authority-reading').waitFor();
const rulePage = await page.evaluate(() => {
  const reader = document.getElementById('inspector'),
    box = reader.getBoundingClientRect(),
    c = document.getElementById('closeInspector').getBoundingClientRect();
  return {
    close: [
      Math.round(box.right - c.right),
      Math.round(c.top - box.top),
      Math.round(reader.querySelector('h2').getBoundingClientRect().left),
    ],
    bars: reader.querySelectorAll('.v32-bar').length,
    facets: window.DKLAReader.facets().length,
  };
});
assert.deepEqual(rulePage.close, loperClose, 'a rule page: the same close button and left edge');
assert.equal(rulePage.bars + rulePage.facets, 0, 'an entry with one facet has no bar');
await page.locator('#closeInspector').click();
await page.locator('#inspector').waitFor({ state: 'hidden' });

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
  `reader: ${Math.round(layout.width)} px, ${layout.tabs.length} facets with counts (${layout.tabs.join(', ')}), Brief first and on the first screen, one facet at a time, a rail of 7, late blocks counted, K-16 opens at step 3; Loper Bright ${loper.facets.length} facets; dictionary examples listed.`,
);
