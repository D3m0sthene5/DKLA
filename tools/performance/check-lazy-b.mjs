/* Sources, archives and search when their data blocks arrive after start-up, in a real browser.

     node tools/performance/check-lazy-b.mjs http://127.0.0.1:8766/DKLA-v3.2.html

   The hosted page may move large data blocks into files fetched on first use (window.DKLAData,
   src/features/performance/data-loader.js). This check does not need that loader: it serves the page with the
   source texts, the Civil Procedure, LRS, casebook and supplement archives and the textbook update emptied
   (marked data-dkla-lazy), and puts a stand-in DKLAData in front of it that hands each block over three seconds
   after it is first asked for. The block text comes from the served page, or from the portable copy in
   work/build when the served page has already been split.

   Late arrival:
   - nothing is fetched at start-up, and the map draws with the Rules & authorities books;
   - a PDF source opens and renders without waiting for the source texts; a source link in an entry opens its PDF;
   - a text source says it is loading, then shows its text;
   - the LRS coverage guide, an LRS page, a Civil Procedure page (after one failed load and Retry), a casebook page
     and a supplement page each say they are loading, then show the page asked for;
   - Rules & authorities opens and reads FRCP 4 and 28 U.S.C. § 1332;
   - search works before the dictionary has arrived, asks for it when the box is focused, and draws the open list
     again for the same words when it arrives, with every kind of row (dictionary, sources) still there.
   The whole page (nothing emptied, no stand-in): the same sources open at once, in the same call. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { unsplit } from './unsplit.mjs';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LATE = ['sourceTexts', 'civilArchive', 'lrsArchive', 'bookArchive', 'suppArchive', 'textbookUpdate'];
// Kept in the page here (its reader belongs to the dictionary module) but reported as not yet loaded until asked for.
const PRETEND = ['dklaGlossary'];
const DELAY = 3000;
const TXT = 'added-sources/opinions/lrs-i-benzene.txt';

const tag = (id) =>
  new RegExp(`(<script id="${id}" type="application/(?:json|octet-stream)")([^>]*)>([\\s\\S]*?)</script>`);
let shell = null;
let whole = null;
const wholePage = async () => (whole ??= await unsplit(await (await fetch(address.href)).text(), address));
const raw = {};
async function servedShell() {
  if (shell) return shell;
  const response = await fetch(address.href);
  assert.ok(response.ok, 'the page is served');
  let html = await unsplit(await response.text(), address);
  let portable = null;
  for (const id of LATE) {
    const m = tag(id).exec(html);
    assert.ok(m, `the page has the block ${id}`);
    if (m[3]) raw[id] = m[3];
    else {
      portable ??= await readFile(path.join(root, 'work/build', path.basename(address.pathname)), 'utf8');
      raw[id] = tag(id).exec(portable)?.[3];
      assert.ok(raw[id], `${id} is in the portable copy`);
    }
    html = html.replace(tag(id), (_, open) => `${open} data-dkla-lazy></script>`);
  }
  return (shell = html);
}

const browser = await chromium.launch();
async function open({ late }) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: 'block',
  });
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== address.origin || url.pathname.startsWith('/api/'))
      return route.fulfill({ status: 204, body: '' });
    // The late run serves the page with this check's blocks emptied; the whole-page run serves every block filled in.
    if (url.pathname === address.pathname)
      return route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: late ? await servedShell() : await wholePage(),
      });
    if (late && url.pathname.startsWith('/__late/')) {
      const id = url.pathname.slice(8);
      return raw[id] !== undefined
        ? route.fulfill({ status: 200, contentType: 'application/json', body: raw[id] })
        : route.fulfill({ status: 404, body: '' });
    }
    return route.continue();
  });
  await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
  if (late)
    await context.addInitScript(
      ({ pretend, delay }) => {
        // A stand-in for src/features/performance/data-loader.js, with the same API and event. failNext makes the
        // next load of that block fail once.
        const done = new Set(),
          pending = new Map(),
          requests = [],
          failNext = new Set(),
          held = new Map();
        const el = (id) => document.getElementById(id);
        const isLazy = (id) =>
          !done.has(id) &&
          (pretend.includes(id) || (!!el(id)?.hasAttribute('data-dkla-lazy') && !el(id).textContent));
        function text(id) {
          if (!isLazy(id)) return Promise.resolve(el(id)?.textContent || '');
          if (!pending.has(id)) {
            requests.push(id);
            const failing = failNext.delete(id);
            const load = new Promise((resolve) =>
              held.has(id) ? held.set(id, resolve) : setTimeout(resolve, delay),
            )
              .then(() =>
                failing
                  ? Promise.reject(new Error('offline'))
                  : el(id).textContent || // a block kept in the page
                    fetch('/__late/' + id).then((r) =>
                      r.ok ? r.text() : Promise.reject(new Error('missing ' + id)),
                    ),
              )
              .then((body) => {
                if (!el(id).textContent) el(id).textContent = body;
                done.add(id);
                document.dispatchEvent(new CustomEvent('dkla:data', { detail: { id } }));
                return body;
              })
              .finally(() => pending.delete(id));
            pending.set(id, load);
          }
          return pending.get(id);
        }
        const parsed = new Map();
        const api = {
          isLazy,
          loaded: (id) => !isLazy(id),
          text,
          json: async (id) => {
            if (!parsed.has(id)) parsed.set(id, JSON.parse(await text(id)));
            return parsed.get(id);
          },
          whenLoaded: (id) =>
            isLazy(id)
              ? new Promise((resolve) =>
                  document.addEventListener('dkla:data', function on(e) {
                    if (e.detail.id !== id) return;
                    document.removeEventListener('dkla:data', on);
                    resolve();
                  }),
                )
              : Promise.resolve(),
          // hold(id): the next load of that block waits for release(id) instead of the usual delay.
          test: {
            requests,
            failNext,
            hold: (id) => held.set(id, null),
            release: (id) => {
              const go = held.get(id);
              held.delete(id);
              go?.();
            },
          },
        };
        // The real loader, if this page has one, does not replace the stand-in.
        Object.defineProperty(window, 'DKLAData', { get: () => api, set: () => {}, configurable: false });
      },
      { pretend: PRETEND, delay: DELAY },
    );
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(address.href, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 120_000 });
  await page.waitForFunction(() => window.LegalAtlas?.ready, null, { timeout: 60_000 });
  return { context, page, errors };
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
const closeDialogs = (page) =>
  page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
const requests = (page) => page.evaluate(() => window.DKLAData.test.requests.slice());

/* ---------- late arrival ---------- */
{
  const { context, page, errors } = await open({ late: true });
  await check('start-up asks for no late block and still draws the map and its books', async () => {
    assert.deepEqual(
      await page.evaluate((ids) => ids.filter((id) => !window.DKLAData.isLazy(id)), LATE),
      [],
      'every emptied block is still waiting',
    );
    await page.waitForTimeout(500);
    assert.deepEqual(await requests(page), []);
    await page.locator('#geoCanvas .authority-map-entrance').first().waitFor();
    assert.ok(await page.locator('#geoCanvas .authority-map-tile').count(), 'the Rules & authorities books');
  });
  await check('a PDF source renders without waiting for the source texts', async () => {
    const pdf = await page.evaluate(() => DKLA.pdfRoute('#book=1'));
    assert.ok(pdf?.path, 'a PDF route for #book=1');
    await page.evaluate(({ path, page }) => LegalAtlas.openFile(path, page), pdf);
    await page.locator(`#fileDialog[open] [data-pdf-rendered="${pdf.page}"]`).waitFor({ timeout: 45_000 });
    assert.equal(await page.locator('#fileDialog .file-loading').count(), 0);
    assert.ok(!(await requests(page)).includes('sourceTexts'), 'the texts were not asked for');
    await closeDialogs(page);
  });
  await check("an entry's source link opens its PDF", async () => {
    await page.evaluate(() => (location.hash = 'node=cp-pennoyer'));
    // A source button in the reader, routed to the original PDF (dklaR17PdfSources.js).
    const link = page.locator('#inspector [data-dkla-file*=".pdf"]:visible').first();
    await link.waitFor();
    await link.click();
    await page.locator('#fileDialog[open] [data-pdf-rendered]').waitFor({ timeout: 45_000 });
    await closeDialogs(page);
  });
  await check('a text source says it is loading, then shows its text', async () => {
    await page.evaluate((path) => LegalAtlas.openFile(path, 1), TXT);
    await page.locator('#fileDialog[open] .file-loading').waitFor();
    assert.match(await page.locator('#fileDialog .file-loading').innerText(), /Loading the source text/);
    await page.locator('#fileDialog[open] .file-text.file-scroll p:not(.file-loading)').first().waitFor();
    assert.ok(
      (await page.locator('#fileDialog .file-text').innerText()).length > 2000,
      'the whole opinion text',
    );
    assert.equal(await page.locator('#fileDialog .file-loading').count(), 0);
    await closeDialogs(page);
  });
  await check('the LRS coverage guide waits for the LRS sources, then counts them', async () => {
    await page.evaluate(() => DKLA.coverage());
    await page.locator('#modal[open] #modalBody [data-lrs-loading]').waitFor();
    // The nine source files, as buttons or, once dklaR17PdfSources.js has routed them, as links to their PDFs.
    const files = '#modal[open] #modalBody :is([data-lrs-source], [data-original-source^="#lrs="])';
    await page.locator(files).first().waitFor({ timeout: 10_000 });
    assert.equal(await page.locator('#modalBody [data-lrs-loading]').count(), 0);
    assert.equal(await page.locator(files).count(), 9, 'the nine LRS source files');
    await closeDialogs(page);
  });
  await check('an LRS page opens at once once the archive is in', async () => {
    await page.evaluate(() => LegalAtlas.openLRS('lrs-september', 2));
    assert.match(
      await page.locator('#lrsSourceDialog[open] .lrs-source-header').innerText(),
      /page 2 of 137/,
    );
    await closeDialogs(page);
  });
  await check('a Civil Procedure page: loading, a failed load with Retry, then the page text', async () => {
    await page.evaluate(() => window.DKLAData.test.failNext.add('civilArchive'));
    await page.evaluate(() => LegalAtlas.openCivil(5));
    await page.locator('#civilSourceDialog[open] [data-civil-loading]').waitFor();
    assert.match(await page.locator('#civilSourceDialog').innerText(), /Loading the Civil Procedure sources/);
    await page.locator('#civilSourceDialog [data-civil-retry]').waitFor({ timeout: 10_000 });
    assert.match(await page.locator('#civilSourceDialog').innerText(), /could not be loaded/);
    await page.locator('#civilSourceDialog [data-civil-retry]').click();
    await page.locator('#civilSourceDialog[open] .civil-page-text').waitFor({ timeout: 10_000 });
    assert.match(await page.locator('#civilSourceDialog .civil-source-header').innerText(), /Printed page 5/);
    await closeDialogs(page);
  });
  await check('a casebook page and a supplement page wait for their pages, then open', async () => {
    await page.evaluate(() => openBook(284));
    await page.waitForFunction(() => /Loading the casebook pages/.test($('toast').textContent));
    assert.equal(await page.locator('#bookDialog[open]').count(), 0, 'the reader waits');
    await page.locator('#bookDialog[open]').waitFor({ timeout: 10_000 });
    assert.equal(await page.locator('#bookHeading').innerText(), 'C&M · printed page 284');
    assert.ok(await page.evaluate(() => LegalAtlas.sourcePages().length > 600), 'the page list is filled in');
    await page.evaluate(() => openSupplement(1));
    await page.waitForFunction(() => /Loading the supplement pages/.test($('toast').textContent));
    await page.waitForFunction(() => $('bookHeading').textContent === 'Course supplement · page 1', null, {
      timeout: 10_000,
    });
    await closeDialogs(page);
  });
  await check('Rules & authorities reads FRCP 4 and 28 U.S.C. § 1332', async () => {
    await page.evaluate(() => DKLAAuthorities.open('frcp-4'));
    await page.waitForFunction(() => /Summons/.test($('inspector').innerText));
    await page.evaluate(() => DKLAAuthorities.open('usc-28-1332'));
    await page.waitForFunction(
      () => /1332/.test($('inspector').innerText) && /citizens/i.test($('inspector').innerText),
    );
    await page.evaluate(() => LegalAtlas.navigate('scope', 'Atlas'));
  });
  await check(
    'search works before the dictionary arrives and redraws the same list when it does',
    async () => {
      // Opening a case page earlier in this check legitimately asks for the dictionary ("Terms in this
      // entry"), so start this step from a fresh visit to Home (no route, so no reader is open).
      await page.goto(address.href.split('#')[0], { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await page.locator('html.dkla-boot-ready').waitFor({ timeout: 120_000 });
      await page.waitForFunction(() => window.LegalAtlas?.ready, null, { timeout: 60_000 });
      assert.ok(!(await requests(page)).includes('dklaGlossary'), 'not asked for before the box is used');
      await page.evaluate(() => window.DKLAData.test.hold('dklaGlossary'));
      await page.locator('#search').focus();
      assert.ok((await requests(page)).includes('dklaGlossary'), 'asked for when the box is focused');
      await page.keyboard.type('summons');
      await page.waitForFunction(() => query === 'summons');
      await page.locator('#searchResults button[data-search-type="node"]').first().waitFor();
      await page.locator('#searchResults .search-sources').waitFor();
      const before = await page.evaluate(() => {
        const list = $('searchResults');
        list.firstElementChild.dataset.lateMark = '1';
        return {
          rows: list.querySelectorAll('button').length,
          sources: list.querySelectorAll('.search-sources button').length,
          dictionary: list.querySelectorAll('.search-glossary button').length,
        };
      });
      assert.ok(
        before.rows > 3 && before.sources > 0,
        'results and source rows before the dictionary arrives',
      );
      await page.evaluate(() => window.DKLAData.test.release('dklaGlossary'));
      await page.waitForFunction(() => !document.querySelector('#searchResults [data-late-mark]'), null, {
        timeout: 10_000,
      });
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => ({
        value: $('search').value,
        hidden: $('searchResults').hidden,
        rows: $('searchResults').querySelectorAll('button').length,
        sources: $('searchResults').querySelectorAll('.search-sources button').length,
        dictionary: $('searchResults').querySelectorAll('.search-glossary button').length,
      }));
      assert.equal(after.value, 'summons');
      assert.equal(after.hidden, false);
      assert.equal(after.sources, before.sources, 'source rows drawn again');
      assert.ok(after.dictionary >= 1, 'dictionary rows in the redrawn list');
      assert.ok(after.rows >= before.rows, `no rows lost (${before.rows} before, ${after.rows} after)`);
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'search', 'focus stays in the box');
    },
  );
  await check('no page errors (late arrival)', async () => assert.deepEqual(errors, []));
  await context.close();
}

/* ---------- the whole page ---------- */
{
  const { context, page, errors } = await open({ late: false });
  await check('with every block in the page, each source opens in the same call', async () => {
    const shown = await page.evaluate((txt) => {
      const out = {};
      LegalAtlas.openFile(txt, 1);
      out.text = document.querySelector('#fileDialog .file-text.file-scroll')?.textContent.length || 0;
      out.textLoading = !!document.querySelector('#fileDialog .file-loading');
      document.getElementById('fileDialog').close();
      LegalAtlas.openCivil(5);
      out.civil = !!document.querySelector('#civilSourceDialog[open] .civil-page-text');
      document.getElementById('civilSourceDialog').close();
      LegalAtlas.openLRS('lrs-september', 2);
      out.lrs = /page 2 of 137/.test(
        document.querySelector('#lrsSourceDialog .lrs-source-header')?.textContent,
      );
      document.getElementById('lrsSourceDialog').close();
      openBook(284);
      out.book = document.getElementById('bookDialog').open && $('bookHeading').textContent;
      openSupplement(1);
      out.supp = $('bookHeading').textContent;
      document.getElementById('bookDialog').close();
      out.pages = LegalAtlas.sourcePages().length;
      out.supplement = LegalAtlas.supplementPages().length;
      return out;
    }, TXT);
    assert.ok(shown.text > 2000 && !shown.textLoading, 'text source');
    assert.equal(shown.civil, true, 'Civil Procedure page');
    assert.equal(shown.lrs, true, 'LRS page');
    assert.equal(shown.book, 'C&M · printed page 284');
    assert.equal(shown.supp, 'Course supplement · page 1');
    assert.equal(shown.pages, 691);
    assert.equal(shown.supplement, 138);
  });
  await check('no page errors (whole page)', async () => assert.deepEqual(errors, []));
  await context.close();
}

await browser.close();
if (failures) {
  console.log(`${failures} check(s) failed`);
  process.exit(1);
}
console.log('late data blocks: sources, archives and search all passed');
