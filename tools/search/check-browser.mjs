/* Atlas search on phones and across every kind of material, in a real browser (v3.1).

     node tools/search/check-browser.mjs http://127.0.0.1:8766/DKLA-v3.2.html [--shots DIR]

   At 390 px: the top bar has a labelled Search button (the box itself was 0 px wide there); tapping it opens a
   full-width panel with the keyboard in the box; "LRS Class 22" lists the LRS Class 22 lecture first (the
   lecture decks run from LRS class 13 to 22, so it exists); Escape and × close the panel; tapping the lecture
   opens it and closes the panel. At 430 px the same panel fills the width. At 1440 px: "battle of the forms"
   lists flowchart K-16 labelled Flowchart, and it opens; "LRS Class 22", "Contracts class 16" and "civ pro 12"
   list that course's session first and nothing from another course above any of its material; the alias
   "known by its associates" finds and opens the canon Noscitur a sociis; the top-bar box is exactly as wide as
   before the change, at 1440 px and at 1024 px (iPad landscape), with no Search button. --shots saves
   pictures. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const shotsAt = process.argv.indexOf('--shots'),
  shots = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
if (shots) await mkdir(shots, { recursive: true });
// The top-bar box measured before the phone change (18 November 2026): box and input, left edge and width.
// v3.2: the version label beside the wordmark is 9 to 10 px wider ("v3.2" for "v3.1"), so the box starts that
// much further right; its widths are as they were.
const DESKTOP = {
  1440: { box: [445, 430], input: [481, 351] },
  1024: { box: [298, 410], input: [334, 331] },
};

const browser = await chromium.launch();
async function open(viewport) {
  const phone = viewport.width <= 850;
  const context = await browser.newContext({
    viewport,
    isMobile: phone,
    hasTouch: phone,
    serviceWorkers: 'block',
  });
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
  await page.waitForFunction(() => window.DKLA?.searchIndexStats?.extras > 0, null, { timeout: 30_000 });
  return { context, page, errors };
}
async function snap(page, name) {
  if (shots) await page.screenshot({ path: path.join(shots, name + '.png') });
}
// Types into whatever has the keyboard and waits until the list was drawn for exactly that text.
async function type(page, text) {
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(text);
  await page.waitForFunction(
    (text) =>
      typeof query !== 'undefined' && query === text && !document.getElementById('searchResults').hidden,
    text,
    { timeout: 10_000 },
  );
  await page.locator('#searchResults [data-search-key]').first().waitFor({ timeout: 10_000 });
  // The first search on a page fetches the dictionary block, and the list is drawn again 80 ms after it
  // arrives (about a second later). A row measured across that redraw is no longer in the page, so wait
  // for the block and its redraw before reading the list (the same wait as tools/verify/search_why.mjs).
  await page.waitForFunction(
    () => !window.DKLAData || !DKLAData.isLazy('dklaGlossary') || DKLAData.loaded('dklaGlossary'),
    null,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(250);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
}
async function desktopSearch(page, text) {
  await page.locator('#search').focus();
  await type(page, text);
}
const rows = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#searchResults [data-search-key]')].map((b) => ({
      key: b.dataset.searchKey,
      type: b.dataset.resultType,
      label: b.querySelector('.search-type')?.textContent,
      title: b.querySelector('strong')?.textContent,
      sub: b
        .querySelector('small')
        ?.textContent.replace(b.querySelector('.search-type')?.textContent || '', ''),
      where: b.querySelector('.search-where')?.textContent || '',
    })),
  );
const panelOpen = (page) =>
  page.evaluate(() => document.documentElement.classList.contains('dkla-search-panel'));
const COURSE_OF = {
  contracts: /^Contracts\b/,
  civil: /^Civil Procedure\b|^Civ Pro\b/,
  lrs: /^LRS\b|^Legislation\b/,
};

let failures = 0;
async function check(name, run) {
  try {
    await run();
    console.log('ok   ' + name);
  } catch (error) {
    failures++;
    console.log(
      'FAIL ' +
        name +
        '\n     ' +
        String(error.message || error)
          .split('\n')
          .join('\n     '),
    );
  }
}

try {
  /* ---------- phones ---------- */
  for (const width of [390, 430]) {
    const { context, page, errors } = await open({ width, height: width === 390 ? 844 : 932 });
    const opener = page.locator('#searchOpen');
    await check(`${width} px: a labelled Search button opens a full-width panel`, async () => {
      await opener.waitFor({ state: 'visible' });
      assert.equal((await opener.innerText()).trim().replace(/^\W+/, ''), 'Search');
      const button = await opener.boundingBox();
      assert.ok(
        button.width >= 60 && button.height >= 36,
        'the button is tappable: ' + JSON.stringify(button),
      );
      assert.ok(button.x >= 0 && button.x + button.width <= width, 'the button is on screen');
      if (width === 390) await snap(page, 'phone-1-top-bar');
      await opener.tap();
      await page.waitForFunction(() => document.activeElement?.id === 'search', null, { timeout: 5000 });
      assert.ok(await panelOpen(page), 'the panel is open');
      const box = await page.locator('.study-header .study-search').boundingBox();
      assert.ok(box.x <= 0.5 && box.width >= width - 1, `the panel is full width: ${JSON.stringify(box)}`);
      const input = await page.locator('#search').boundingBox();
      assert.ok(input.width >= width - 90, `the box is wide: ${input.width}px`);
    });
    await check(
      `${width} px: "LRS Class 22" lists the LRS Class 22 lecture first, and it can be tapped`,
      async () => {
        await type(page, 'LRS Class 22');
        const list = await rows(page);
        assert.equal(list[0]?.key, 'lecture:lrs-22', 'first result: ' + JSON.stringify(list[0]));
        assert.equal(list[0].label, 'Lecture');
        assert.match(list[0].title, /^Class 22 lecture/);
        // The row is on screen and nothing covers it.
        const first = page.locator('#searchResults [data-search-key]').first();
        const tappable = await first.evaluate((b) => {
          const r = b.getBoundingClientRect(),
            hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return (
            r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && b.contains(hit)
          );
        });
        assert.ok(tappable, 'the first result is on screen and uncovered');
        if (width === 390) await snap(page, 'phone-2-results');
      },
    );
    await check(`${width} px: Escape and × close the panel`, async () => {
      await page.keyboard.press('Escape');
      assert.equal(await panelOpen(page), false, 'Escape closes the panel');
      assert.ok(await page.locator('#searchResults').isHidden(), 'and the results');
      await opener.tap();
      await page.waitForFunction(() => document.activeElement?.id === 'search', null, { timeout: 5000 });
      assert.ok(await panelOpen(page), 'the panel opens again');
      await page.locator('.study-search .search-close').tap();
      assert.equal(await panelOpen(page), false, '× closes the panel');
    });
    if (width === 390)
      await check('390 px: tapping the lecture opens it and closes the panel', async () => {
        await opener.tap();
        await page.waitForFunction(() => document.activeElement?.id === 'search', null, { timeout: 5000 });
        await type(page, 'LRS Class 22');
        await page.locator('#searchResults [data-search-key="lecture:lrs-22"]').tap();
        await page.locator('#modal[open]').waitFor({ timeout: 5000 });
        assert.equal(await page.locator('#modalTitle').innerText(), 'LRS · Class 22');
        await page.locator('#modalBody .lecture-deck').waitFor();
        assert.equal(await panelOpen(page), false, 'choosing a result closes the panel');
        await snap(page, 'phone-3-lecture');
      });
    if (errors.length) {
      failures++;
      console.log(`FAIL ${width} px: page errors\n     ` + errors.join('\n     '));
    }
    await context.close();
  }

  /* ---------- desktop ---------- */
  const { context, page, errors } = await open({ width: 1440, height: 900 });
  await check('1440 px: the top-bar box is unchanged and there is no Search button', async () => {
    const measure = await page.evaluate(() => {
      const at = (el) => {
        const r = el.getBoundingClientRect();
        return [Math.round(r.x), Math.round(r.width)];
      };
      return {
        box: at(document.querySelector('.study-header .study-search')),
        input: at(document.getElementById('search')),
        button: getComputedStyle(document.getElementById('searchOpen')).display,
      };
    });
    assert.deepEqual(measure, { ...DESKTOP[1440], button: 'none' });
    await page.locator('#search').focus();
    assert.equal(await panelOpen(page), false, 'focusing the box opens no panel');
  });
  await check(
    '1440 px: "battle of the forms" lists flowchart K-16, labelled Flowchart, and it opens',
    async () => {
      await desktopSearch(page, 'battle of the forms');
      const list = await rows(page);
      const chart = list.find((r) => r.key === 'flowchart:K-16');
      assert.ok(chart, 'K-16 is listed: ' + list.map((r) => r.key).join(', '));
      assert.equal(chart.type, 'Flowchart');
      assert.equal(chart.label, 'Flowchart');
      assert.equal(chart.title, 'Whose terms govern under UCC § 2-207?');
      // The subject's cases are still there.
      assert.ok(
        list.some((r) => r.type === 'Case' || r.type === 'Concept'),
        'cases and concepts too',
      );
      await snap(page, 'desktop-1-battle-of-the-forms');
      await page.locator('#searchResults [data-search-key="flowchart:K-16"]').click();
      await page.locator('dialog#dklaFlowcharts[open]').waitFor({ timeout: 5000 });
      assert.equal(new URL(page.url()).hash, '#flowchart=K-16');
      assert.ok(await page.locator('#searchResults').isHidden(), 'the results close');
      await page.locator('dialog#dklaFlowcharts [data-flowcharts-close]').click();
      await page.locator('dialog#dklaFlowcharts').waitFor({ state: 'hidden', timeout: 5000 });
    },
  );
  for (const [text, course, first] of [
    ['LRS Class 22', 'lrs', 'lecture:lrs-22'],
    ['Contracts class 16', 'contracts', 'lecture:contracts-16'],
    ['civ pro 12', 'civil', 'cp-week-12'],
  ])
    await check(
      `1440 px: "${text}" lists that session first and no other course above its material`,
      async () => {
        await desktopSearch(page, text);
        const list = await rows(page);
        assert.equal(list[0]?.key, first, 'first result: ' + JSON.stringify(list[0]));
        const matched = list
          .map((r, i) => (/ (class|assignment|week) \d+/.test(r.where) ? i : -1))
          .filter((i) => i >= 0);
        assert.ok(matched.length >= 3, 'the session material says why it is listed');
        const lastMatched = Math.max(...matched);
        // A row's courses are the start of its subtitle ("Civil Procedure, Legislation and the Regulatory State · ...").
        const ours = (r) =>
          r.sub
            .split(' · ')[0]
            .split(', ')
            .some((c) => COURSE_OF[course].test(c.trim()));
        const stranger = list.findIndex((r) => !ours(r));
        assert.ok(
          stranger < 0 || stranger > lastMatched,
          `another course's item at ${stranger}, above material at ${lastMatched}: ${JSON.stringify(list[stranger])}`,
        );
        if (course === 'lrs') {
          assert.ok(!COURSE_OF.contracts.test(list[0].sub.trim()), 'no Contracts item first');
          assert.ok(
            list.some((r) => r.key === 'session:lrs-22' && r.type === 'Assignment'),
            'the class itself',
          );
          await snap(page, 'desktop-2-lrs-class-22');
        }
      },
    );
  await check('1440 px: a canon alias finds its canon, and it opens', async () => {
    await desktopSearch(page, 'known by its associates');
    const list = await rows(page);
    assert.equal(list[0]?.key, 'canon:noscitur-a-sociis', 'first result: ' + JSON.stringify(list[0]));
    assert.equal(list[0].label, 'Canon');
    await snap(page, 'desktop-3-canon-alias');
    await page.locator('#searchResults [data-search-key="canon:noscitur-a-sociis"]').click();
    await page.locator('dialog#dklaCanons[open]').waitFor({ timeout: 5000 });
    assert.equal(await page.locator('#dklaCanonTitle').innerText(), 'Noscitur a sociis');
  });
  if (errors.length) {
    failures++;
    console.log('FAIL 1440 px: page errors\n     ' + errors.join('\n     '));
  }
  await context.close();

  /* ---------- iPad landscape ---------- */
  const tablet = await open({ width: 1024, height: 768 });
  await check('1024 px: the top-bar box is unchanged and there is no Search button', async () => {
    const measure = await tablet.page.evaluate(() => {
      const at = (el) => {
        const r = el.getBoundingClientRect();
        return [Math.round(r.x), Math.round(r.width)];
      };
      return {
        box: at(document.querySelector('.study-header .study-search')),
        input: at(document.getElementById('search')),
        button: getComputedStyle(document.getElementById('searchOpen')).display,
      };
    });
    assert.deepEqual(measure, { ...DESKTOP[1024], button: 'none' });
  });
  await tablet.context.close();
} finally {
  await browser.close();
}
if (failures) {
  console.log(`${failures} search check(s) failed.`);
  process.exit(1);
}
console.log(
  'Atlas search: Search button and full-width panel at 390 and 430 px; flowcharts, lectures, canons and classes found and labelled; course and class numbers honoured; desktop box unchanged.',
);
