// What the search list holds for a query, in the order it is drawn: every row any module adds (the ranked
// entries, subjects and topics, then the dictionary, supporting cases, timelines, rules and authorities,
// sources on file and the U.S. Code), read from the page. Used by check-chrome.mjs to hold the v3.2 command
// palette to the rule it was built under: the frame may be redrawn, the results may not change.
//
//   node tools/v32/search-rows.mjs <page> --write    record tools/v32/search-baseline.json from that page
//
// Record again only when search itself is meant to change (ranking, or which results appear), and say so.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const QUERIES = [
  'consideration',
  'erie',
  'hamer',
  '12(b)(6)',
  'LRS Class 22',
  'civ pro 12',
  'promissory estoppel',
  'chevron deference',
  'battle of the forms',
  '20 USC 1001',
  'known by its associates',
  'redundant, imperti',
  'mailbox rule',
  'summary judgment',
  'personal jurisdiction',
  'zzqqxv',
];
export const BASELINE = new URL('./search-baseline.json', import.meta.url);

// Everything the page needs before a search is the same twice: the index, and the data that arrives late
// (the dictionary's rows join the list only once its block is in).
export async function ready(page) {
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 180_000 });
  await page.waitForFunction(
    () =>
      window.DKLA?.searchIndexStats?.extras > 0 &&
      window.DKLAData &&
      !window.DKLAData.state().lazy.length &&
      window.DKLA.glossaryCount() > 0,
    null,
    { timeout: 240_000 },
  );
}

export async function rowsFor(page, text) {
  // The box is focused in a turn of its own: the modules that add rows mark a list as done for the words in
  // the box, and focusing and filling in one turn marks the empty box's list as done for the new words.
  await page.locator('#search').focus();
  await page.evaluate((text) => {
    const box = document.getElementById('search');
    box.value = text;
    box.dispatchEvent(new Event('input', { bubbles: true }));
  }, text);
  await page.waitForFunction(
    (text) =>
      typeof query !== 'undefined' && query === text && !document.getElementById('searchResults').hidden,
    text,
    { timeout: 20_000 },
  );
  // Rows that other modules add arrive in the same turn or the next; two quiet frames and a pause settle it.
  let last = '';
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150);
    const now = await page.evaluate(
      () =>
        document.getElementById('searchResults').querySelectorAll('button').length +
        ':' +
        document.getElementById('searchResults').textContent.length,
    );
    if (now === last && i > 2) break;
    last = now;
  }
  return page.evaluate(() => {
    const list = document.getElementById('searchResults');
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const rows = [...list.querySelectorAll('button')]
      .filter((b) => !b.classList.contains('ask-search') && !b.classList.contains('v32-row'))
      .map((b) => {
        const d = b.dataset;
        return [
          d.resultType || b.className.split(' ')[0] || 'row',
          d.searchKey ||
            d.searchId ||
            d.searchRef ||
            d.dklaTerm ||
            d.r19Open ||
            d.r21Tl ||
            d.authorityOpen ||
            d.authorityGroup ||
            d.uscodeCite ||
            d.dklaFile ||
            d.file ||
            '',
          text(b.querySelector('strong')),
        ].join(' | ');
      });
    return {
      heading: text(list.querySelector('.search-label')),
      empty: text(list.querySelector('.search-empty')),
      rows,
    };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { chromium } = await import('@playwright/test');
  const address = new URL(process.argv[2]);
  if (!['127.0.0.1', 'localhost'].includes(address.hostname)) throw Error('local preview only');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
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
  await page.goto(address.href, { waitUntil: 'commit', timeout: 180_000 });
  await ready(page);
  const out = {};
  for (const q of QUERIES) out[q] = await rowsFor(page, q);
  await browser.close();
  if (process.argv.includes('--write')) {
    await writeFile(BASELINE, JSON.stringify(out, null, 1) + '\n');
    console.log(
      'wrote ' + fileURLToPath(BASELINE) + ': ' + QUERIES.map((q) => `${q} ${out[q].rows.length}`).join(', '),
    );
  } else console.log(JSON.stringify(out, null, 1));
}
