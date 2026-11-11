/* Atlas search says where each result matched, and the opened entry can show it.

     node tools/verify/search_why.mjs http://127.0.0.1:8766/DKLA-v2.9.html [--shots DIR]

   On a desktop and a phone page: the index holds only text a reader can see (no
   JSON keys, ids, addresses or build tags); "redundant, imperti" lists Garcia
   with the passage and its place ("in Holding") and says the other word is not
   in that entry; opening Garcia from the results shows the strip, and Show me
   scrolls the reader to the passage and highlights the word; opening Garcia
   from the map, and a title search, show no strip. --shots saves pictures. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const url = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'local pages only');
const shotsAt = process.argv.indexOf('--shots'),
  shots = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
if (shots) await mkdir(shots, { recursive: true });
const browser = await chromium.launch();
const STRIP = '#inspector .search-why-strip';

async function search(page, text) {
  await page.evaluate(() => {
    const box = document.getElementById('search');
    box.value = '';
    box.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#search').focus();
  await page.keyboard.type(text);
  await page.locator('#searchResults button[data-search-type="node"]').first().waitFor({ timeout: 10_000 });
}
async function readerShows(page, id) {
  await page.waitForFunction(
    (id) => selected?.id === id && document.querySelector('#inspector .reader-body h2'),
    id,
    { timeout: 10_000 },
  );
  // The strip, when it comes, is decided once the reader has settled (well under two seconds).
  await page.waitForTimeout(1800);
}
async function snap(page, name) {
  if (shots) await page.screenshot({ path: path.join(shots, name + '.png') });
}

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
  for (const [label, viewport] of [
    ['desktop', { width: 1440, height: 900 }],
    ['phone', { width: 390, height: 844 }],
  ]) {
    const phone = label === 'phone';
    const context = await browser.newContext({
      viewport,
      isMobile: phone,
      hasTouch: phone,
      serviceWorkers: 'block',
    });
    await context.route('**/*', (route) => {
      const target = new URL(route.request().url());
      if (target.origin !== url.origin || target.pathname.startsWith('/api/'))
        return route.fulfill({ status: 204 });
      return route.continue();
    });
    await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
    await page.waitForFunction(() => window.DKLA?.searchIndex?.(), null, { timeout: 30_000 });

    if (!phone)
      await check('the index holds only text a reader can see', async () => {
        const report = await page.evaluate(() => {
          const bad = [];
          const fields = ['title', 'shortTitle', 'summary', 'notes', 'body', 'tags'];
          for (const n of data.nodes) {
            const doc = DKLA.searchDocument(n);
            for (const f of fields) {
              const v = doc[f];
              if (typeof v !== 'string') bad.push(`${n.id}.${f} is not text`);
              // JSON shapes ({" "} "key": "," ":"), web addresses: none of it is reading text.
              else if (/\{\s*"|"\s*\}|"[\w$-]+"\s*:|"\s*,\s*"|https?:\/\/|www\./.test(v))
                bad.push(`${n.id}.${f}: ${v.slice(0, 80)}`);
            }
            if (/\b(?:class-\d+|lrs-r\d+|r\d+-[a-z]+|lrs-[a-z-]+)\b/.test(doc.tags))
              bad.push(`${n.id}.tags: ${doc.tags}`);
          }
          // An older saved graph can hold objects in a section: their words count, their keys never do.
          const odd = DKLA.searchDocument({
            id: 'probe',
            title: 'Probe',
            notes: 'See https://example.com/a?b=1 for more.',
            sections: {
              Holding: {
                text: 'Visible holding words',
                id: 'cp-probe',
                url: 'https://example.com',
                sha: 'e3d16bca22697f38',
                more: [{ label: 'Further visible words' }],
              },
            },
            tags: ['class-07', 'lrs-r8', 'r14-brief', 'my own tag'],
          });
          return {
            bad: bad.slice(0, 10),
            count: bad.length,
            odd,
            stats: DKLA.searchIndexStats,
            nodes: data.nodes.length,
            garcia: DKLA.searchDocument(data.nodes.find((n) => n.id === 'cp-garcia')),
            takeaway: window.DKLATakeaways?.for('cp-garcia'),
          };
        });
        assert.equal(
          report.count,
          0,
          'indexed fields with JSON, addresses or build tags:\n' + report.bad.join('\n'),
        );
        assert.equal(report.odd.body, 'Visible holding words\n\nFurther visible words');
        assert.equal(report.odd.notes, 'See for more.');
        assert.equal(report.odd.tags, 'my own tag');
        assert.equal(report.stats.documents, report.nodes, 'every entry is indexed');
        // A case reader shows its plain-English introduction, not the stored summary.
        assert.ok(report.takeaway && report.garcia.summary === report.takeaway);
        assert.match(report.garcia.body, /struck paragraphs 5 through 8 as redundant/);
        console.log(`     index: ${report.stats.documents} entries in ${report.stats.ms} ms`);
      });

    await check(label + ': a result shows the passage and where it is', async () => {
      await search(page, 'redundant, imperti');
      const row = page.locator('#searchResults button[data-search-id="cp-garcia"]');
      await row.waitFor();
      await page.locator('#searchResults button[data-search-id="cp-hall"]').waitFor();
      assert.match(
        await page.locator('#searchResults .search-label').innerText(),
        /with some of your words/i,
      );
      const snippet = row.locator('.search-snippet');
      await snippet.waitFor({ timeout: 3000 });
      assert.equal(await snippet.locator('mark').first().innerText(), 'redundant');
      assert.match(await snippet.innerText(), /struck paragraphs 5 through 8 as redundant because/);
      const where = await row.locator('.search-where').innerText();
      assert.match(where, /^in Holding\b/);
      assert.match(where, /“imperti” not in this entry/);
      // The snippet is one short passage: at most two lines under the subtitle.
      const box = await snippet.boundingBox();
      assert.ok(box.height < 44, 'snippet is ' + box.height + 'px tall');
      await snap(page, label + '-1-results');
      // A word begun in the search box marks the whole word it matched.
      await search(page, 'redundan');
      await page
        .locator('#searchResults button[data-search-id="cp-garcia"] .search-snippet mark')
        .first()
        .waitFor();
      assert.equal(
        await page
          .locator('#searchResults button[data-search-id="cp-garcia"] .search-snippet mark')
          .first()
          .innerText(),
        'redundant',
      );
    });

    await check(label + ': the opened entry offers to show the match', async () => {
      await search(page, 'redundant, imperti');
      await page.locator('#searchResults button[data-search-id="cp-garcia"]').click();
      await readerShows(page, 'cp-garcia');
      const strip = page.locator(STRIP);
      await strip.waitFor({ timeout: 2000 });
      assert.match(await strip.innerText(), /Your search matched “redundant” in\s+Holding/);
      assert.match(await page.locator('.search-why-announce').innerText(), /matched “redundant” in Holding/);
      // The main view is as before: the strip sits above the entry, which starts with its title.
      assert.match(await page.locator('#inspector .reader-body h2').innerText(), /^Garcia v\. Hilton Hotels/);
      await snap(page, label + '-2-strip');
      const show = page.getByRole('button', { name: 'Show me' });
      await show.focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => CSS.highlights?.get('dkla-hit-focus')?.size > 0, null, {
        timeout: 3000,
      });
      await page.waitForTimeout(900);
      const seen = await page.evaluate(() => {
        const [range] = CSS.highlights.get('dkla-hit-focus');
        const r = range.getBoundingClientRect();
        const target = document.querySelector('#inspector .search-why-target');
        return {
          word: range.toString(),
          inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
          inHolding: target?.closest('section')?.querySelector('h3')?.textContent,
          focused: document.activeElement === target,
        };
      });
      assert.deepEqual(seen, { word: 'redundant', inView: true, inHolding: 'Holding', focused: true });
      await snap(page, label + '-3-shown');
      await page.locator(STRIP + ' .search-why-close').click();
      assert.equal(await page.locator(STRIP).count(), 0, 'the × removes the strip');
    });

    await check(label + ': the strip leaves with the entry', async () => {
      await search(page, 'redundant, imperti');
      await page.locator('#searchResults button[data-search-id="cp-garcia"]').click();
      await readerShows(page, 'cp-garcia');
      await page.locator(STRIP).waitFor({ timeout: 2000 });
      await page.evaluate(() => goNode('cp-conley', true));
      await readerShows(page, 'cp-conley');
      assert.equal(await page.locator(STRIP).count(), 0);
    });

    await check(label + ': an entry opened from the map has no strip', async () => {
      // Chosen from search first, then closed: opening it again from the map is a plain open.
      await search(page, 'redundant, imperti');
      await page.locator('#searchResults button[data-search-id="cp-garcia"]').click();
      await readerShows(page, 'cp-garcia');
      await page.locator(STRIP).waitFor({ timeout: 2000 });
      await page.locator('#closeInspector').click();
      await page.waitForFunction(() => selected === null && document.getElementById('inspector').hidden);
      if (phone) {
        // The phone map is zoomed out to the course here and draws no case cards; this is the call a card makes.
        await page.evaluate(() => goNode('cp-garcia', false));
      } else {
        // The map redraws its cards, so focus the card and press Enter until the reader opens.
        for (let i = 0; ; i++) {
          try {
            await page.locator('#geoCanvas [data-map-node="cp-garcia"]').first().focus({ timeout: 1500 });
            await page.keyboard.press('Enter');
            await page.waitForFunction(() => selected?.id === 'cp-garcia', null, { timeout: 1500 });
            break;
          } catch (error) {
            if (i >= 5) throw error;
          }
        }
      }
      await readerShows(page, 'cp-garcia');
      assert.equal(await page.locator(STRIP).count(), 0);
    });

    await check(label + ': a title search has no snippet and no strip', async () => {
      await search(page, 'Pennoyer');
      const row = page.locator('#searchResults button[data-search-id="cp-pennoyer"]');
      await row.waitFor();
      assert.equal(await row.locator('.search-why').count(), 0, 'the title already shows the match');
      await row.click();
      await readerShows(page, 'cp-pennoyer');
      assert.equal(await page.locator(STRIP).count(), 0);
    });

    if (errors.length) {
      failures++;
      console.log('FAIL ' + label + ': page errors\n     ' + errors.join('\n     '));
    }
    await context.close();
  }
} finally {
  await browser.close();
}
if (failures) {
  console.log(`${failures} search check(s) failed.`);
  process.exit(1);
}
console.log('Search explains every match it shows.');
