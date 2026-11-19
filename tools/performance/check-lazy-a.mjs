/* Cold Call, the dictionary and SCOTUS History when their data arrives late (v3.1 lazy data).

     node tools/performance/check-lazy-a.mjs http://127.0.0.1:8766/DKLA-v3.1.html

   The hosted page may leave large data blocks empty and fetch them on demand through window.DKLAData
   (src/features/performance/data-loader.js; the contract is in its header). This check serves the page
   with the Cold Call narratives (dklaColdCallData), the Cold Call definition tables (dklaColdCallGlossary,
   dklaColdCallPlain) and the dictionary (dklaGlossary) emptied, and puts a stand-in window.DKLAData in
   front of the page's own that holds each block back until the check releases it. Then:
   - Home: no held block is asked for at start-up, and the dictionary's Home count appears once the
     background download brings it;
   - a case page asks for the narratives and the dictionary; its "Cold call" button and "Terms in this
     entry" appear when they arrive;
   - the Cold Call reader opened first shows "Loading Cold Call…", waits for the narratives AND both
     definition tables, then draws the account; its definitions open on hover;
   - a supporting brief's "Cold call" button appears when the narratives arrive, and its "Terms in this
     brief" change from slugs to the dictionary's names when the dictionary does;
   - the dictionary opened first shows "Loading the dictionary…", then the term it was opened at, and
     searches; dictionary rows join search results already on screen;
   - SCOTUS History (its data stays in the page: the Home building draws its seats and portraits) opens.
   No page errors anywhere. Loopback only; /api/ and other origins answer 204. */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { unsplit } from './unsplit.mjs';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const HELD = ['dklaColdCallData', 'dklaColdCallGlossary', 'dklaColdCallPlain', 'dklaGlossary'];
const CASE = 'cp-garcia';

// ---- the page, with the held blocks emptied (their text is served from /__lazy-a/<id>)
const original = await unsplit(await (await fetch(address)).text(), address);
const raw = new Map();
let html = original;
const manifest = original.match(/<script\b[^>]*\bid="dklaDataManifest"[^>]*>([\s\S]*?)<\/script>/);
for (const id of HELD) {
  const re = new RegExp(`<script\\b([^>]*)\\bid="${id}"([^>]*)>([\\s\\S]*?)</script>`);
  const m = html.match(re);
  assert.ok(m, `${id} is not in the page`);
  let text = m[3];
  if (!text) {
    // Already split by the hosted packaging: the bytes are in assets/data/<sha256>.json.
    const entry = manifest && JSON.parse(manifest[1]).blocks?.[id];
    assert.ok(entry, `${id} is empty and not in dklaDataManifest`);
    text = await (await fetch(new URL(`assets/data/${entry.hash}.json`, address))).text();
  }
  raw.set(id, text);
  const attrs = (m[1] + 'id="' + id + '"' + m[2]).replace(/\s*data-dkla-lazy\b/, '');
  html = html.replace(re, () => `<script${attrs} data-dkla-lazy></script>`);
}
const data = Object.fromEntries([...raw].map(([id, text]) => [id, JSON.parse(text)]));
const r19 = JSON.parse(original.match(/<script\b[^>]*\bid="dklaR19Data"[^>]*>([\s\S]*?)<\/script>/)[1]);
// Fixtures from the data itself: a supporting brief with a Cold Call and a list of terms, and a term.
const supporting = data.dklaColdCallData.cases
  .map((c) => c.id)
  .find((id) => id.startsWith('brief-') && r19.terms?.supporting?.[id.slice(6)]?.length);
assert.ok(supporting, 'no supporting brief has both a Cold Call and terms');
const supportingSlugs = r19.terms.supporting[supporting.slice(6)];
const termName = new Map(data.dklaGlossary.terms.map((t) => [t.slug, t.term]));
const renamed = supportingSlugs.find((s) => termName.has(s) && termName.get(s) !== s.replace(/_/g, ' '));
const TERM = termName.has('negligence') ? 'negligence' : data.dklaGlossary.terms[0].slug;
const caseTitle = data.dklaColdCallData.cases.find((c) => c.id === CASE).title;

// ---- a stand-in data loader that holds each block until __lazyA.release(id)
function fakeLoader(ids) {
  const lazy = new Set(ids),
    done = new Set(),
    requested = [],
    gates = new Map(),
    arrivals = new Map(),
    texts = new Map(),
    parsed = new Map();
  const slot = (map, id) => {
    if (!map.has(id)) {
      let resolve;
      const promise = new Promise((r) => (resolve = r));
      map.set(id, { promise, resolve });
    }
    return map.get(id);
  };
  const block = (id) => document.getElementById(id);
  const text = (id) => {
    if (!lazy.has(id) || done.has(id)) return Promise.resolve(block(id)?.textContent || '');
    if (!texts.has(id)) {
      requested.push(id);
      texts.set(
        id,
        slot(gates, id)
          .promise.then(() => fetch('/__lazy-a/' + id))
          .then((r) => {
            if (!r.ok) throw Error(id + ': ' + r.status);
            return r.text();
          })
          .then((t) => {
            block(id).textContent = t;
            done.add(id);
            slot(arrivals, id).resolve();
            document.dispatchEvent(new CustomEvent('dkla:data', { detail: { id } }));
            return t;
          }),
      );
    }
    return texts.get(id);
  };
  const api = {
    isLazy: (id) => lazy.has(id) && !done.has(id),
    loaded: (id) => !lazy.has(id) || done.has(id),
    text,
    json: (id) => {
      if (!parsed.has(id))
        parsed.set(
          id,
          text(id).then((t) => JSON.parse(t || 'null')),
        );
      return parsed.get(id);
    },
    whenLoaded: (id) => (api.loaded(id) ? Promise.resolve() : slot(arrivals, id).promise),
  };
  // The page's own loader, once it exists, cannot replace this one.
  Object.defineProperty(window, 'DKLAData', { get: () => api, set: () => {}, configurable: false });
  window.__lazyA = {
    requested: () => [...requested],
    release: (id) => slot(gates, id).resolve(),
    // The background download: the block arrives without any feature asking for it.
    prefetch: (id) => {
      slot(gates, id).resolve();
      return text(id).then(() => {});
    },
  };
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
await context.route('**/*', (route) => {
  const url = new URL(route.request().url());
  if (url.origin !== address.origin || url.pathname.startsWith('/api/'))
    return route.fulfill({ status: 204, body: '' });
  if (url.pathname === address.pathname)
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
  if (url.pathname.startsWith('/__lazy-a/')) {
    const id = url.pathname.slice('/__lazy-a/'.length);
    return raw.has(id)
      ? route.fulfill({ status: 200, contentType: 'application/json', body: raw.get(id) })
      : route.fulfill({ status: 404, body: '' });
  }
  // A real loader's own downloads would bypass the hold.
  if (url.pathname.includes('/assets/data/')) return route.fulfill({ status: 503, body: '' });
  return route.continue();
});
await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
await context.addInitScript(fakeLoader, HELD);
const errors = [];
const passed = [];
async function open(hash = '') {
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(address.href + hash, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
  await page.waitForFunction(() => window.LegalAtlas?.ready && window.DKLAColdCall && window.DKLA?.openTerm);
  return page;
}
const requested = (page) => page.evaluate(() => window.__lazyA.requested());
const release = (page, ...ids) =>
  page.evaluate((list) => list.forEach((id) => window.__lazyA.release(id)), ids);

// ---- 1. Home: nothing held is asked for; the dictionary count arrives with the background download
{
  const page = await open();
  await page.waitForTimeout(1500);
  assert.equal(
    await page.evaluate((ids) => ids.every((id) => !document.getElementById(id).textContent), HELD),
    true,
    'the held blocks are empty in the page',
  );
  assert.deepEqual(await requested(page), [], 'Home alone asks for none of the held blocks');
  assert.equal(await page.evaluate(() => window.DKLA.glossaryCount()), 0);
  await page.evaluate(() => window.__lazyA.prefetch('dklaGlossary'));
  await page.waitForFunction(() => window.DKLA.glossaryCount() > 0);
  assert.equal(await page.evaluate(() => window.DKLA.glossaryCount()), data.dklaGlossary.terms.length);
  assert.equal(await page.evaluate(() => window.DKLA.glossaryLoaded()), true);
  passed.push('Home asks for nothing held; the dictionary count fills in from the background download');

  // ---- 2. search typed before the dictionary: its rows join the results when it arrives
  await page.close();
}
{
  const page = await open();
  await page.locator('#search').fill(termName.get(TERM));
  await page.locator('#searchResults:not([hidden])').waitFor();
  await page.waitForFunction(() => window.__lazyA.requested().includes('dklaGlossary'));
  assert.equal(await page.locator('#searchResults .search-glossary').count(), 0);
  await release(page, 'dklaGlossary');
  await page.locator(`#searchResults .search-glossary [data-dkla-term="${TERM}"]`).waitFor();
  passed.push('search typed first: the dictionary rows join the results when the dictionary arrives');
  await page.locator('#search').fill('');
  await page.close();
}
{
  // ---- 3. the dictionary opened first
  const page = await open();
  await page.evaluate((slug) => window.DKLA.openTerm(slug), TERM);
  const dialog = page.locator('#glossaryDialog[open]');
  await dialog.locator('.gl-loading').waitFor();
  assert.match(await dialog.locator('.gl-loading').innerText(), /Loading the dictionary/);
  await page.waitForTimeout(400);
  assert.equal(await dialog.locator('.gl-loading').count(), 1, 'the loading line stays until the data');
  await release(page, 'dklaGlossary');
  await dialog.locator('.gl-detail h2').waitFor();
  assert.ok((await dialog.locator('.gl-detail h2').innerText()).startsWith(termName.get(TERM)));
  assert.equal(await page.evaluate(() => window.__lazyA.requested().length), 1, 'only the dictionary asked');
  await dialog.locator('#glFind').fill(termName.get(TERM));
  await dialog.locator(`.gl-list [data-term="${TERM}"]`).waitFor();
  assert.ok((await dialog.locator('.gl-list li').count()) >= 1);
  await dialog.locator('#glClose').click();
  passed.push('dictionary opened first: "Loading the dictionary…", then the term, then search');
  await page.close();
}
{
  // ---- 4. a case page, then the reader opened before the narratives and definitions
  const page = await open('#node=' + CASE);
  await page.locator('#inspector .reader-body').first().waitFor();
  await page.waitForFunction(() => {
    const asked = window.__lazyA.requested();
    return asked.includes('dklaColdCallData') && asked.includes('dklaGlossary');
  });
  assert.equal(await page.locator('#inspector [data-cold-call]').count(), 0, 'no Cold call button yet');
  assert.equal(await page.locator('#inspector .dkla-terms').count(), 0, 'no term chips yet');
  assert.equal(await page.evaluate(() => window.DKLAColdCall.loaded()), false);

  await page.evaluate((id) => window.DKLAColdCall.open(id), CASE);
  const reader = page.locator('#coldCallDialog[open]');
  await reader.locator('.cc-loading').waitFor();
  assert.match(await reader.locator('.cc-loading').innerText(), /Loading Cold Call/);
  await release(page, 'dklaColdCallData');
  await page.waitForFunction(() => window.DKLAColdCall.loaded());
  await page.waitForTimeout(400);
  assert.equal(await reader.locator('.cc-loading').count(), 1, 'the reader waits for its definitions too');
  await release(page, 'dklaColdCallGlossary', 'dklaColdCallPlain');
  await reader.locator('.cc-section').first().waitFor();
  // v3.2: the account arrives on its setup, with the caption as its heading and focus on the one action.
  assert.equal(
    await reader.locator('#ccCaption').evaluate((h) => h.textContent.replace(/\s+/g, ' ').trim()),
    caseTitle,
  );
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'ccAct');
  const word = reader.locator('.cc-term[data-cc-term="compromise"]').first();
  await word.hover();
  await reader.locator('#ccGlossCard.is-in').waitFor();
  assert.ok(await reader.locator('.cc-plain').count(), 'plain-English markers are drawn');
  await page.mouse.move(5, 5);
  await page.evaluate(() => window.DKLAColdCall.close());
  await page
    .locator('#coldCallDialog[open]')
    .waitFor({ state: 'detached' })
    .catch(() => {});
  assert.equal(await page.locator('#coldCallDialog[open]').count(), 0);
  passed.push(
    'reader opened first: "Loading Cold Call…" until the narratives and both tables, then the account',
  );

  // The case page gained its button when the narratives arrived; it opens the reader at once.
  const launch = page.locator(`#inspector [data-cold-call="${CASE}"]`);
  await launch.waitFor();
  await launch.click();
  await reader.locator('.cc-section').first().waitFor();
  assert.equal(await reader.locator('.cc-loading').count(), 0);
  await page.evaluate(() => window.DKLAColdCall.close());
  passed.push('case page: the "Cold call" button appears when the narratives arrive and opens the reader');

  // ---- 5. a supporting brief opened before the dictionary: slugs, then names
  await page.evaluate((id) => window.DKLABriefs.open(undefined, id), supporting.slice(6));
  const brief = page.locator('#r19Body');
  await brief.locator(`[data-cold-call="${supporting}"]`).waitFor();
  if (renamed) {
    const chip = brief.locator(`.r20-terms [data-dkla-term="${renamed}"]`);
    await chip.waitFor();
    assert.equal(await chip.innerText(), renamed.replace(/_/g, ' '), 'before the dictionary: the slug');
  }
  await release(page, 'dklaGlossary');
  await page.waitForFunction(() => window.DKLA.glossaryLoaded());
  if (renamed)
    await page.waitForFunction(
      ([slug, name]) =>
        document.querySelector(`#r19Body .r20-terms [data-dkla-term="${slug}"]`)?.textContent === name,
      [renamed, termName.get(renamed)],
    );
  await page.locator('#inspector .dkla-terms').waitFor({ state: 'attached' });
  passed.push('dictionary arriving late: the brief term names and the case page term chips fill in');
  await page.keyboard.press('Escape');

  // ---- 6. SCOTUS History opens (its data stays in the page)
  await page.evaluate(() => window.SCOTUSHistory.open());
  await page.locator('#shShell:not([hidden]) .sh-head').waitFor();
  await page.evaluate(() => window.SCOTUSHistory.close());
  passed.push('SCOTUS History opens');
  await page.close();
}
{
  // ---- 7. a supporting brief opened before the narratives: its button appears when they arrive
  const page = await open();
  await page.evaluate((id) => window.DKLABriefs.open(undefined, id), supporting.slice(6));
  const brief = page.locator('#r19Body');
  await brief.locator('[data-r19-fill],[data-r19-immediate]').first().waitFor({ state: 'attached' });
  await page.waitForFunction(() => window.__lazyA.requested().includes('dklaColdCallData'));
  assert.equal(await brief.locator('[data-cold-call]').count(), 0);
  await release(page, 'dklaColdCallData');
  const launch = brief.locator(`[data-cold-call="${supporting}"]`);
  await launch.waitFor();
  // In the same place as when the data was in the page: first among the brief's actions.
  assert.equal(
    await launch.evaluate((b) => b.parentElement.firstElementChild === b),
    true,
    'the late button is first in its row',
  );
  await launch.click();
  const reader = page.locator('#coldCallDialog[open]');
  await reader.locator('.cc-loading').waitFor();
  await release(page, 'dklaColdCallGlossary', 'dklaColdCallPlain');
  await reader.locator('.cc-section').first().waitFor();
  passed.push('supporting brief: the "Cold call" button appears when the narratives arrive');
  await page.close();
}
await browser.close();
assert.deepEqual(errors, [], 'page errors');
console.log(
  `Late data (Cold Call, dictionary, SCOTUS): ${passed.length} checks passed.\n- ${passed.join('\n- ')}`,
);
