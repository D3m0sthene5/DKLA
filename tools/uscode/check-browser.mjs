/* The whole United States Code in Rules & authorities, in a real browser.

     node tools/uscode/check-browser.mjs http://127.0.0.1:8766/DKLA-v3.2.html [--shots DIR]

   - All 54 titles are listed under "All 54 titles", and every title's file loads, verifies and
     builds (Title 53 is reserved and holds no sections).
   - Title 20 opens to its chapters; Chapter 28 leads, level by level, to § 1001, whose card opens a
     page with its citation, heading, place in the title and the official link.
   - "20 USC 1001" in the search box puts that section first, labelled "U.S. Code", and Enter opens
     it; the other citation forms name the same section.
   - "jurisdiction" and "contract" list no whole-Code entry and fetch no title file.
   - 28 U.S.C. § 1332, held in full, still opens its full text, from the search and from Title 28.
   - The page carries no whole-Code data: the code that browses and searches it is under 50 KB.
   - Offline, a title already opened comes from the page's cache; one never opened says it needs a
     connection.
   --shots saves pictures of the title list, a title's chapters, a section page and the search result. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const shotsAt = process.argv.indexOf('--shots'),
  shots = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
if (shots) await mkdir(shots, { recursive: true });
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
const errors = [],
  fetched = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (r) => {
  const p = new URL(r.url()).pathname;
  if (p.startsWith('/uscode/')) fetched.push(p);
});
await page.goto(address.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
await page.waitForFunction(() => window.LegalAtlas?.ready && window.DKLAAuthorities?.uscode);

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
        String(error?.message || error)
          .split('\n')
          .join('\n     '),
    );
  }
}
async function snap(name) {
  if (!shots) return;
  await page.waitForFunction(() => !R11.anim, null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(shots, name + '.png') });
}
// Open a card in the current view, turning pages (Next →) until it is drawn.
async function openCard(pattern) {
  const target = (await view()).children.find((c) => pattern.test(c.title));
  assert.ok(target, 'no card ' + pattern);
  for (let i = 0; i < 40; i++) {
    const drawn = (await view()).layout.cards.some((c) => c.id === target.id);
    if (drawn) break;
    const next = (await view()).layout.pages[(await view()).layout.page + 1];
    assert.ok(next, 'card never drawn: ' + target.title);
    await pressUntil(
      page.locator(`[data-authority-page="${next.start}"]`),
      'Enter',
      `DKLAAuthorities.geography().layout.page > ${(await view()).layout.page}`,
    );
  }
  await pressUntil(
    page.locator(`.authority-title-control[data-map-region="${target.id}"]`),
    'Enter',
    `DKLAAuthorities.geography().route.at(-1).id === ${JSON.stringify(target.id)}`,
  );
  return target;
}
const view = () => page.evaluate(() => DKLAAuthorities.geography());
// The map redraws itself, replacing its elements: find a card again on every try (AGENTS.md).
async function pressUntil(locator, key, done, attempts = 6) {
  for (let i = 0; ; i++) {
    try {
      await locator.first().focus({ timeout: 1500 });
      await page.keyboard.press(key);
      await page.waitForFunction(done, null, { timeout: 2500 });
      return;
    } catch (error) {
      if (i + 1 >= attempts) throw error;
    }
  }
}
async function search(text) {
  await page.evaluate(() => {
    const box = document.getElementById('search');
    box.value = '';
    box.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#search').focus();
  await page.keyboard.type(text);
  await page.waitForFunction(
    (text) =>
      typeof query !== 'undefined' && query === text && !document.getElementById('searchResults').hidden,
    text,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(400);
}
const WHOLE = 'authority:uscode/all';

await check('all 54 titles are listed and every title loads', async () => {
  await page.evaluate((k) => DKLAAuthorities.group(k), WHOLE);
  await page.locator(`[data-authority-view="${WHOLE}"]`).waitFor();
  const v = await view();
  assert.deepEqual(
    v.route.map((r) => r.title),
    ['Rules & authorities', 'United States Code', 'All 54 titles'],
  );
  assert.equal(v.children.length, 54, 'titles listed');
  assert.deepEqual(
    v.children.map((c) => Number(c.title.match(/^Title (\d+) · /)?.[1])),
    Array.from({ length: 54 }, (_, i) => i + 1),
  );
  assert.match(v.children[52].title, /^Title 53 · Reserved$/);
  // The first page of title cards is drawn, and pages lead through the rest.
  assert.ok(v.layout.cards.length >= 8, 'title cards drawn: ' + v.layout.cards.length);
  assert.ok(v.layout.pages.length >= 1);
  await snap('uscode-titles');
  await openCard(/^Title 20 · /);
  await page.waitForFunction(() =>
    DKLAAuthorities.geography().children.some((c) => /^Chapter 1 — /.test(c.title)),
  );
  await page.evaluate((k) => DKLAAuthorities.group(k), WHOLE);
  const loaded = await page.evaluate(async () => {
    const out = [];
    for (let t = 1; t <= 54; t++) {
      const data = await DKLAAuthorities.uscode.load(t);
      out.push([t, data.title, data.sections, data.source.release]);
    }
    return out;
  });
  for (const [t, title, sections, release] of loaded) {
    assert.equal(title, t);
    assert.equal(release, '119-118');
    if (t === 53) assert.equal(sections, 0, 'Title 53 is reserved');
    else assert.ok(sections > 0, 'title ' + t + ' has sections');
  }
  const total = loaded.reduce((s, r) => s + r[2], 0);
  assert.ok(total > 60000, 'sections in the whole Code: ' + total);
  // Each loaded title shows its own structure, not a waiting card.
  const empty = await page.evaluate(async () => {
    const bad = [];
    for (let t = 1; t <= 54; t++) {
      DKLAAuthorities.group(DKLAAuthorities.uscode.title(t));
      const v = DKLAAuthorities.geography();
      if (t !== 53 && (!v.children.length || v.children.some((c) => /\/status$/.test(c.id)))) bad.push(t);
    }
    return bad;
  });
  assert.deepEqual(empty, [], 'titles without their structure');
});

await check('Title 20 opens to its chapters and § 1001 appears', async () => {
  await page.evaluate(() => DKLAAuthorities.group(DKLAAuthorities.uscode.title(20)));
  await page.waitForFunction(() =>
    DKLAAuthorities.geography().children.some((c) => /^Chapter 28 — /.test(c.title)),
  );
  const v = await view();
  assert.ok(
    v.children.every((c) => /^Chapter \w+ — /.test(c.title)),
    'Title 20 lists chapters',
  );
  assert.ok(v.children.length >= 70, 'chapters of Title 20: ' + v.children.length);
  await snap('uscode-title-20');
  // Down the official levels with the keyboard, turning pages where needed: Chapter 28,
  // Subchapter I, Part A.
  for (const [pattern, next] of [
    [/^Chapter 28 — /, /^Subchapter I — /],
    [/^Subchapter I — /, /^Part A — /],
  ]) {
    await openCard(pattern);
    assert.ok(
      (await view()).children.some((c) => next.test(c.title)),
      'next level under ' + pattern,
    );
  }
  const hit = await page.evaluate(() => DKLAAuthorities.uscode.find(20, '1001'));
  assert.equal(hit.entry.cite, '20 U.S.C. § 1001');
  assert.equal(hit.entry.title, 'General definition of institution of higher education');
  assert.deepEqual(hit.trail.slice(0, 4), ['Title 20', 'Chapter 28', 'Subchapter I', 'Part A']);
  await page.evaluate((k) => DKLAAuthorities.group(k), hit.group);
  const card = page.locator(`[data-map-jump="authority:${hit.entry.id}"]`);
  await card.first().waitFor();
  await pressUntil(card, 'Enter', `selected?.id === ${JSON.stringify(hit.entry.id)}`);
  const stub = page.locator('#inspector .uscode-stub');
  await stub.waitFor();
  assert.match(
    await stub.locator('h2').innerText(),
    /20 U\.S\.C\. § 1001\s*General definition of institution of higher education/,
  );
  const where = await stub.locator('.uscode-place button').allInnerTexts();
  assert.match(where[0], /^Title 20 · Education$/);
  assert.match(where[1], /^Chapter 28 — /);
  const link = await stub.locator('a.uscode-official').getAttribute('href');
  assert.equal(
    link,
    'https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title20-section1001&num=0&edition=prelim',
  );
  assert.match(await stub.innerText(), /Current through Public Law 119-118/);
  await snap('uscode-section-20-1001');
  // Its place in the title is a way back up.
  await stub.locator('.uscode-place button').nth(1).click();
  await page.waitForFunction(() => /^Chapter 28 — /.test(DKLAAuthorities.geography().route.at(-1).title));
});

await check('"20 USC 1001" in search returns that section first', async () => {
  await search('20 USC 1001');
  const first = page.locator('#searchResults button').first();
  await page.waitForFunction(() =>
    /General definition/.test(document.querySelector('#searchResults button')?.textContent || ''),
  );
  assert.equal(await first.getAttribute('data-uscode-cite'), '20|1001');
  assert.match(
    await first.innerText(),
    /^20 U\.S\.C\. § 1001 · General definition of institution of higher education\nU\.S\. Code · Title 20 › Chapter 28 › Subchapter I › Part A$/,
  );
  assert.equal(await page.locator('#searchResults .uscode-search .search-label').textContent(), 'U.S. Code');
  assert.equal(await page.locator('#searchResults [data-uscode-cite]').count(), 1, 'one citation result');
  await snap('uscode-search-20-usc-1001');
  await page.locator('#search').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => selected?.id === 'uscx-20-1001' && document.querySelector('#inspector .uscode-stub'),
  );
  const forms = await page.evaluate(() =>
    [
      '20 USC 1001',
      '20 U.S.C. 1001',
      '20 U.S.C. § 1001',
      '20 usc §1001',
      'title 20 section 1001',
      '§ 1001 of title 20',
      'section 1001 of title 20, United States Code',
      '20 U.S.C. § 1001(a)(1)',
    ].map((q) => DKLAUSCode.parse(q)),
  );
  for (const f of forms) assert.deepEqual(f, { title: 20, section: '1001' });
  const others = await page.evaluate(() =>
    [
      '42 U.S.C. § 2000e–2',
      '15 usc 78u-4',
      '28 USC 599A',
      'contract',
      '1001',
      'title 20',
      '55 USC 1',
      'rule 12(b)(6)',
    ].map((q) => DKLAUSCode.parse(q)),
  );
  assert.deepEqual(others, [
    { title: 42, section: '2000e-2' },
    { title: 15, section: '78u-4' },
    { title: 28, section: '599A' },
    null,
    null,
    null,
    null,
    null,
  ]);
  // A form typed differently finds the same section.
  await search('§ 1001 of title 20');
  await page.waitForFunction(() =>
    /General definition/.test(document.querySelector('#searchResults button')?.textContent || ''),
  );
});

await check('a word search lists no whole-Code entry and fetches nothing', async () => {
  await page.evaluate(() => DKLAAuthorities.group('authority-root'));
  const before = fetched.length;
  for (const word of ['jurisdiction', 'contract']) {
    await search(word);
    await page.locator('#searchResults button').first().waitFor();
    const found = await page.evaluate(() => ({
      cite: document.querySelectorAll('#searchResults [data-uscode-cite], #searchResults .uscode-search')
        .length,
      ids: [
        ...document.querySelectorAll('#searchResults [data-search-id], #searchResults [data-authority-open]'),
      ]
        .map((b) => b.dataset.searchId || b.dataset.authorityOpen)
        .filter((id) => /uscx-|uscode\/all/.test(id)),
      rows: document.querySelectorAll('#searchResults button').length,
    }));
    assert.ok(found.rows > 0, word + ' finds something');
    assert.equal(found.cite, 0, word + ': no citation result');
    assert.deepEqual(found.ids, [], word + ': no whole-Code entries');
  }
  assert.equal(fetched.length, before, 'word searches fetched a title file');
});

await check('28 U.S.C. § 1332, held in full, still opens its full text', async () => {
  await search('28 USC 1332');
  await page.waitForFunction(() =>
    /full text in DKLA/.test(document.querySelector('#searchResults button')?.textContent || ''),
  );
  assert.equal(
    await page.locator('#searchResults button').first().getAttribute('data-uscode-cite'),
    '28|1332',
  );
  await page.locator('#searchResults button').first().click();
  await page.waitForFunction(() => selected?.id === 'usc-28-1332');
  const text = await page.locator('#inspector .authority-reading .authority-text').innerText();
  assert.match(text, /\$75,000/);
  assert.equal(await page.locator('#inspector .uscode-stub').count(), 0);
  // From the whole-Code tree too: its card there is the full-text entry.
  const hit = await page.evaluate(() => DKLAAuthorities.uscode.find(28, '1332'));
  assert.equal(hit.held, true);
  assert.equal(hit.entry.id, 'usc-28-1332');
  await page.evaluate((k) => DKLAAuthorities.group(k), hit.group);
  const card = page.locator('[data-map-jump="authority:usc-28-1332"]');
  await card.first().waitFor();
  await pressUntil(
    card,
    'Enter',
    `selected?.id === 'usc-28-1332' && !!document.querySelector('#inspector .authority-text')`,
  );
});

await check('the page carries no whole-Code data; its code is under 50 KB', async () => {
  const html = await (await fetch(address.href)).text();
  // Headings of sections DKLA does not hold are only in uscode/title-N.json.
  for (const heading of [
    'General definition of institution of higher education',
    'Romance scam prevention',
    'Federal interagency council on outdoor recreation',
  ])
    assert.equal(html.includes(heading), false, 'in the page: ' + heading);
  const module = (name) => {
    const at = html.indexOf(`/* ===== ${name} ===== */`);
    assert.ok(at >= 0, 'module in page: ' + name);
    const next = html.indexOf('/* ===== ', at + 10),
      end = Math.min(
        ...[next, html.indexOf('</script>', at), html.indexOf('</style>', at)].filter((x) => x > at),
      );
    return Buffer.byteLength(html.slice(at, end));
  };
  const block = (() => {
    const a = html.indexOf('/* ---------- the whole United States Code (v3.1) ----------'),
      b = html.indexOf('const root = branch(ROOT, TITLE, null);', a);
    assert.ok(a > 0 && b > a, 'whole-Code block in authorities.js');
    return Buffer.byteLength(html.slice(a, b));
  })();
  const sizes = {
    titles: module('src/features/v31/uscode-titles.js'),
    search: module('src/features/v31/uscode.js'),
    styles: module('src/features/v31/uscode.css'),
    browse: block,
  };
  const total = Object.values(sizes).reduce((a, b) => a + b, 0);
  console.log('     whole-Code code in the page: ' + JSON.stringify(sizes) + ' = ' + total + ' bytes');
  assert.ok(total < 50_000, 'whole-Code code in the page: ' + total + ' bytes');
});

await check('offline: an opened title comes from the cache; an unopened one says why', async () => {
  // Every title was opened above, so start one afresh: forget Title 7 in memory and in the cache.
  const cached = await page.evaluate(async () => {
    const cache = await caches.open('dkla-uscode-v1');
    return (await cache.keys()).map((r) => new URL(r.url).pathname).filter((p) => p.startsWith('/uscode/'))
      .length;
  });
  assert.equal(cached, 54, 'titles kept in the page cache');
  const page2 = await context.newPage();
  page2.on('pageerror', (error) => errors.push(error.message));
  await page2.goto(address.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page2.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
  await page2.waitForFunction(() => window.LegalAtlas?.ready && window.DKLAAuthorities?.uscode);
  await page2.evaluate(async () =>
    (await caches.open('dkla-uscode-v1')).delete(new URL('uscode/title-7.json', document.baseURI).href),
  );
  await context.setOffline(true);
  try {
    const result = await page2.evaluate(async () => {
      const ok = await DKLAAuthorities.uscode.load(20).then((d) => d.sections);
      const fail = await DKLAAuthorities.uscode.load(7).then(
        () => 'loaded',
        () => DKLAAuthorities.uscode.failed(7),
      );
      return { ok, fail };
    });
    assert.ok(result.ok > 2000, 'Title 20 from the cache');
    assert.match(
      result.fail,
      /Title 7 has not been opened on this device yet\. It needs a connection the first time\./,
    );
  } finally {
    await context.setOffline(false);
    await page2.close();
  }
});

await check('no page errors', async () => {
  assert.deepEqual(errors, []);
});
await browser.close();
if (failures) {
  console.log(`${failures} whole-Code check(s) failed`);
  process.exit(1);
}
console.log('whole U.S. Code: all checks passed');
