/* Atlas search says where each result matched, and the opened entry can show it.

     node tools/verify/search_why.mjs http://127.0.0.1:8766/DKLA-v2.9.html [--shots DIR]

   On a desktop and a phone page: the index holds only text a reader can see (no
   JSON keys, ids, addresses or build tags); "redundant, imperti" lists Garcia
   with the passage and its place ("in Holding") and says the other word is not
   in that entry; opening Garcia from the results shows the strip, and Show me
   scrolls the reader to the passage and highlights the word; the strip is
   there from the entry's first frame (nothing moves down), and its × by
   keyboard leaves no outline and puts focus on the title; opening Garcia
   from the map, and a title search, show no strip; "traditional notions"
   still finds International Shoe through its one-line rule. On the desktop
   page also: a "similar word" is always in the passage shown, every place
   named is a heading the reader shows, and one- or two-letter words are
   matched as typed ("12(b)(6)", "de novo"). The search code itself must hold
   no invisible characters. --shots saves pictures. */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const url = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'local pages only');
const shotsAt = process.argv.indexOf('--shots'),
  shots = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
if (shots) await mkdir(shots, { recursive: true });
// The search code spells its accent and punctuation ranges as \u escapes: combining marks and other
// invisible characters in source are easy to lose to an editor.
{
  const source = await readFile(new URL('../../src/runtime/dklaR13Search.js', import.meta.url), 'utf8');
  const hidden = [...source.matchAll(/[\u0300-\u036f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g)];
  assert.equal(hidden.length, 0, 'invisible characters in dklaR13Search.js at ' + hidden.map((m) => m.index));
}
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
          const fields = ['title', 'shortTitle', 'summary', 'rule', 'notes', 'body', 'tags'];
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
            tags: [
              'class-07',
              'class-hub',
              'lrs-r8',
              'r14-brief',
              'shorter-authority',
              'my own tag',
              'must-know',
            ],
          });
          return {
            bad: bad.slice(0, 10),
            count: bad.length,
            odd,
            stats: DKLA.searchIndexStats,
            nodes: data.nodes.length,
            garcia: DKLA.searchDocument(data.nodes.find((n) => n.id === 'cp-garcia')),
            garciaRule: data.nodes.find((n) => n.id === 'cp-garcia').summary,
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
        // Only the known build flags are left out; a hyphenated tag a reader typed stays.
        assert.equal(report.odd.tags, 'my own tag, must-know');
        assert.equal(report.stats.documents, report.nodes, 'every entry is indexed');
        // A case reader shows its plain-English introduction, not the stored summary.
        assert.ok(report.takeaway && report.garcia.summary === report.takeaway);
        // The stored one-line rule is still shown elsewhere (Study's "Rule in one line"), so it stays indexed.
        assert.ok(
          report.garcia.rule && report.garcia.rule === report.garciaRule,
          'Garcia keeps its one-line rule',
        );
        assert.match(report.garcia.body, /struck paragraphs 5 through 8 as redundant/);
        console.log(`     index: ${report.stats.documents} entries in ${report.stats.ms} ms`);
      });

    await check(label + ': the hidden announcer does not make the page scroll', async () => {
      // It sits at the end of the page; in the flow it made the page 1px taller than the window.
      const size = await page.evaluate(() => ({
        page: document.documentElement.scrollHeight,
        window: innerHeight,
        announcer: !!document.querySelector('.search-why-announce'),
      }));
      assert.ok(size.announcer, 'no announcer');
      assert.ok(size.page <= size.window, `the page is ${size.page}px tall in a ${size.window}px window`);
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
      // Every frame drawn from the click on: the strip is there from the entry's first frame, so the entry
      // never moves down under the reader.
      await page.evaluate(() => {
        const frames = (window.__whyFrames = []);
        const tick = () => {
          const title = document.querySelector('#inspector .reader-body h2');
          if (title && selected?.id === 'cp-garcia')
            frames.push({
              top: Math.round(title.getBoundingClientRect().top),
              strip: !!document.querySelector('#inspector .search-why-strip'),
            });
          if (frames.length < 40) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await page.locator('#searchResults button[data-search-id="cp-garcia"]').click();
      await readerShows(page, 'cp-garcia');
      const strip = page.locator(STRIP);
      await strip.waitFor({ timeout: 2000 });
      const frames = await page.evaluate(() => window.__whyFrames);
      assert.ok(frames.length >= 5, 'frames recorded: ' + frames.length);
      // (On a phone the reader slides up a few pixels as it opens; nothing may push the entry down.)
      assert.ok(
        frames.every((f, i) => f.strip && (i === 0 || f.top <= frames[i - 1].top + 1)),
        'the entry moved down or the strip came late: ' + JSON.stringify(frames.slice(0, 12)),
      );
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
      // The × by keyboard: the strip and the passage's outline go, and the keyboard lands on the entry's title.
      await page.locator(STRIP + ' .search-why-close').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator(STRIP).count(), 0, 'the × removes the strip');
      const after = await page.evaluate(() => ({
        focus: document.activeElement?.matches('#inspector .reader-body h2'),
        outlines: document.querySelectorAll('#inspector .search-why-target').length,
        focusable: document.querySelectorAll('#inspector [data-search-why-focus]').length,
      }));
      assert.deepEqual(after, { focus: true, outlines: 0, focusable: 0 });
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

    await check(label + ': a match in the one-line rule is found and explained', async () => {
      // International Shoe's reader shows its plain-English introduction; "traditional notions" is in the
      // stored one-line rule, which Study shows. It must still be found, and say where it is.
      await search(page, 'traditional notions');
      const row = page.locator('#searchResults button[data-search-id="shoe"]');
      await row.waitFor();
      await row.locator('.search-where').waitFor({ timeout: 3000 });
      assert.match(await row.locator('.search-where').innerText(), /^in the one-line rule\b/);
      assert.match(await row.locator('.search-snippet').innerText(), /traditional notions of fair play/);
      await row.click();
      await readerShows(page, 'shoe');
      const strip = page.locator(STRIP);
      await strip.waitFor({ timeout: 2000 });
      assert.match(
        await strip.innerText(),
        /Your search matched “traditional”, “notions” in\s+the one-line rule, which this case’s Study card shows\b/,
      );
      assert.equal(await strip.locator('.search-why-show').count(), 0, 'nothing in the reader to show');
      await snap(page, label + '-4-rule-strip');
      await strip.locator('.search-why-close').click();
      assert.equal(await page.locator(STRIP).count(), 0);
    });

    if (!phone)
      await check('similar words, labels and short words', async () => {
        const report = await page.evaluate(async () => {
          const out = { similar: [], labels: {}, ranks: {} };
          const rows = (q) => {
            const box = document.getElementById('search');
            box.value = q;
            searchEntries();
            return [...document.querySelectorAll('#searchResults button[data-search-type="node"]')];
          };
          // A "similar word" is one the reader can find in the passage shown under it.
          for (const q of ['quasi in rem', 'redundancy', 'jurisdicton', 'consideraton']) {
            for (const b of rows(q)) {
              const why = DKLA.searchExplain(b.dataset.searchId, q);
              if (!why) continue;
              const shown = why.html.replace(/<[^>]+>/g, '').toLowerCase();
              for (const t of why.similar) if (!shown.includes(t)) out.similar.push(`${q}: ${why.id} "${t}"`);
            }
          }
          // Every place a result can name in the reader is a heading the reader shows.
          const concept = data.nodes.find(
            (n) => n.kind === 'Concept' && n.notes && Object.values(n.sections || {}).some(Boolean),
          );
          for (const id of ['cp-garcia', concept.id]) {
            goNode(id, true);
            for (
              let i = 0;
              i < 40 && !(selected?.id === id && document.querySelector('#inspector .reader-body h2'));
              i++
            )
              await new Promise((r) => setTimeout(r, 100));
            const headings = [...document.querySelectorAll('#inspector .reader-body h3')].map((h) =>
              h.textContent.trim(),
            );
            out.labels[id] = DKLA.searchParts(id)
              .filter((p) => p.place === 'main' && (p.field === 'body' || p.field === 'notes'))
              .filter((p) => !headings.includes(p.label))
              .map((p) => p.field + ': ' + p.label);
            out.labels[id + ' introduction'] = DKLA.searchParts(id).find((p) => p.field === 'summary')?.label;
          }
          // One- and two-letter words are matched as typed: no "brand" for b, no "denied" for de.
          out.ranks.rule = rows('12(b)(6)')[0]?.dataset.searchId;
          out.ranks.deNovo = rows('de novo')
            .slice(0, 5)
            .flatMap((b) =>
              [
                ...(DKLA.searchExplain(b.dataset.searchId, 'de novo')?.html.matchAll(
                  /<mark>([^<]*)<\/mark>/g,
                ) || []),
              ].map((m) => m[1].toLowerCase()),
            )
            .filter((w) => !['de', 'novo'].includes(w));
          // Still a prefix while it is being typed at the end of the box.
          out.ranks.typing = rows('personal ju')[0]?.dataset.searchId;
          closeSearch();
          return out;
        });
        // Every problem at once, so one run shows all that is wrong.
        const problems = report.similar.map((s) => 'similar word not in its snippet: ' + s);
        for (const [key, value] of Object.entries(report.labels))
          if (key.endsWith('introduction')) {
            if (value !== 'the introduction') problems.push(`${key} is labelled "${value}"`);
          } else for (const v of value) problems.push(`${key}: no heading "${v}" in the reader`);
        if (!['cp-frcp-12', 'cp-pleading-motions'].includes(report.ranks.rule))
          problems.push('12(b)(6) leads to ' + report.ranks.rule);
        if (report.ranks.deNovo.length) problems.push('"de novo" marks ' + report.ranks.deNovo.join(', '));
        if (report.ranks.typing !== 'cp-personal-jurisdiction')
          problems.push('"personal ju" leads to ' + report.ranks.typing);
        assert.deepEqual(problems, []);
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
