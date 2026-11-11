/* How a reader moves to a new release, in a real browser with the real offline worker.

     node tools/r19/check_updates.mjs http://127.0.0.1:8766 [screenshot folder]

   1. A first visit to the current page: no notice, no toast, the worker installs and takes the tab.
   2. version.json names another build: the notice appears; closing it hides it for that build only;
      Check for updates (settings) says what it found.
   3. A page of an older build: Refresh saves an edit made a moment before, reopens the entry that was
      open, and the new page says "Updated to ..." once.
   4. A new worker takes over in two open tabs: neither reloads, and the older releases' offline copies
      are deleted only once the new copy holds the atlas.
   5. Offline: a reload still opens the atlas from the device, and the update check stays quiet.
   6. A page that never finishes starting still checks, a minute after 'load'.
   7. PDF.js: the library and its worker carry the page's build, and a worker of another version is
      replaced by a matching pair instead of breaking the source viewer.

   The move from the real v2.9 worker and page to this release is tools/r19/check_migration.mjs.

   The local preview sends no Cache-Control headers (the site's vercel.json does). Nothing here depends
   on them: version.json is read with cache: 'no-store' and the browser fetches sw.js past its HTTP cache. */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const base = new URL(process.argv[2] || 'http://127.0.0.1:8766/');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'local preview only');
const shots = process.argv[3] ? path.resolve(process.argv[3]) : null;
if (shots) await mkdir(shots, { recursive: true });
const real = await (await fetch(new URL('version.json', base))).json();
const pageUrl = new URL(real.file, base).href;
const OTHER = { version: 'v9.9', build: 'v9.9-0000000000', file: real.file };
const OLDER = real.build.replace(/-[0-9a-f]+$/, '-0ld0ld0ld0');
const browser = await chromium.launch();
const ok = (message) => console.log('  ok  ' + message);

// Playwright intercepts the worker script only when a context registers its first worker (later update
// checks go straight to the server), so the route exists from the start and passes sw.js through unless
// a test names another build for that first worker.
const release = { next: null, served: 0 };
async function context(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...options });
  await ctx.route('**/api/**', (route) => route.fulfill({ status: 503, body: 'no API in this check' }));
  await ctx.route('**/sw.js', async (route) => {
    if (!release.next) return route.continue();
    const response = await route.fetch();
    release.served++;
    route.fulfill({ response, body: (await response.text()).replace(real.build, release.next) });
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('dkla.guide.v1', 'seen');
    } catch {
      /* private window */
    }
  });
  return ctx;
}
const booted = (page) =>
  page.waitForFunction(() => document.documentElement.classList.contains('dkla-boot-ready'), null, {
    timeout: 90000,
  });
async function open(ctx, url = pageUrl) {
  const page = await ctx.newPage();
  page.on('pageerror', (error) => console.error('page error:', error.message));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await booted(page);
  return page;
}
const controlled = (page) =>
  page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated', null, {
    timeout: 90000,
  });
const cacheNames = (page) => page.evaluate(() => caches.keys());
const holdsAtlas = (page, name) =>
  page.evaluate(async ([name, file]) => !!(await (await caches.open(name)).match(file)), [name, real.file]);
const notice = (page) => page.locator('#r18Update');
const toastText = (page) =>
  page.evaluate(() => {
    const t = document.getElementById('toast');
    return t && getComputedStyle(t).display !== 'none' ? t.textContent : '';
  });
const versionRoute = (page, body) =>
  page.route('**/version.json', (route) =>
    route.fulfill({
      contentType: 'application/json',
      headers: { 'cache-control': 'no-store' },
      body: JSON.stringify(body),
    }),
  );

try {
  // 1. First visit to the current page.
  console.log('1. first visit, current page');
  const first = await context();
  const a = await open(first);
  await a.waitForFunction(
    // The automatic check a few seconds after the atlas is ready.
    () => ['current', 'newer', 'offline'].includes(window.DKLAUpdates?.state().status),
    null,
    {
      timeout: 30000,
    },
  );
  assert.equal((await a.evaluate(() => DKLAUpdates.state())).status, 'current');
  assert.equal(await notice(a).count(), 0, 'a current page is never prompted');
  assert.ok(!/Updated/.test(await toastText(a)), 'a first visit gets no toast');
  assert.deepEqual(await a.evaluate(() => JSON.parse(localStorage.getItem('dkla.lastBuild.v1'))), {
    build: real.build,
    version: real.version,
  });
  await controlled(a);
  assert.ok((await cacheNames(a)).includes('dkla-' + real.build));
  assert.ok(await holdsAtlas(a, 'dkla-' + real.build));
  // The worker finishing its install and taking the tab does not bring the old prompt back.
  await a.waitForTimeout(1500);
  assert.equal(await notice(a).count(), 0);
  ok('no notice and no toast on a current first visit; the worker installed and took the tab');
  // A tab sent to the background writes an edit still waiting on its save timer (phones often close a
  // background tab without any unload event).
  const hidden = await a.evaluate(async () => {
    const note = data.nodes.find((n) => n.kind === 'Note');
    note.notes = (note.notes || '') + ' hidden-tab marker';
    saveCache();
    const waiting = !!r7SaveTimer;
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    delete document.visibilityState;
    const written = !r7SaveTimer;
    await r7SavePending;
    return [waiting, written];
  });
  assert.deepEqual(hidden, [true, true], 'hiding the tab writes the waiting save at once');
  ok('hiding the tab writes an edit that was still waiting to be saved');

  // 2. Another build on the server.
  console.log('2. another build on the server');
  await versionRoute(a, OTHER);
  assert.equal(await a.evaluate(() => DKLAUpdates.check()), 'newer');
  await notice(a).waitFor();
  assert.match(await notice(a).innerText(), /DKLA v9\.9 is ready/);
  assert.equal(await notice(a).locator('button', { hasText: 'Refresh' }).count(), 1);
  if (shots) {
    const box = await notice(a).boundingBox();
    await a.screenshot({ path: path.join(shots, 'update-notice.png') });
    await a.screenshot({
      path: path.join(shots, 'update-notice-close.png'),
      clip: { x: box.x - 40, y: box.y - 30, width: box.width + 80, height: box.height + 60 },
    });
  }
  await notice(a).getByRole('button', { name: 'Not now' }).click();
  assert.equal(await notice(a).count(), 0);
  assert.equal(await a.evaluate(() => DKLAUpdates.check()), 'newer');
  assert.equal(await notice(a).count(), 0, 'closed stays closed for that build');
  await a.unroute('**/version.json');
  await versionRoute(a, { ...OTHER, build: 'v9.9-1111111111' });
  await a.evaluate(() => DKLAUpdates.check());
  await notice(a).waitFor();
  ok('the notice appears for another build, closes for that build, and returns for the next one');
  // Check for updates in settings uses the same check and says what it found.
  await a.evaluate(() => DKLAStudy.open('progress'));
  await a.locator('#r18Dialog button', { hasText: 'Check for updates' }).click();
  await a.locator('#r18UpdateStatus', { hasText: 'DKLA v9.9 is ready' }).waitFor();
  assert.equal(await a.locator('#r18UpdateStatus button', { hasText: 'Refresh now' }).count(), 1);
  await a.unroute('**/version.json');
  await a.locator('#r18Dialog button', { hasText: 'Check for updates' }).click();
  await a.locator('#r18UpdateStatus', { hasText: 'This is the newest version' }).waitFor();
  assert.equal(await notice(a).count(), 0, 'a current page drops the notice');
  await a.route('**/version.json', (route) => route.abort('internetdisconnected'));
  await a.locator('#r18Dialog button', { hasText: 'Check for updates' }).click();
  await a.locator('#r18UpdateStatus', { hasText: 'Could not reach the server' }).waitFor();
  assert.equal(await notice(a).count(), 0, 'a failed check stays quiet');
  await a.unroute('**/version.json');
  await a.evaluate(() => DKLAStudy.close());
  ok('Check for updates reports newer, current and unreachable');

  // 3. A page of an older build moves to the current one.
  console.log('3. Refresh from an older build');
  const third = await context();
  const older = await third.newPage();
  await older.route(pageUrl, async (route) => {
    const response = await route.fetch();
    route.fulfill({ response, body: (await response.text()).replaceAll(real.build, OLDER) });
  });
  await older.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await booted(older);
  assert.equal(await older.evaluate(() => R18.build), OLDER);
  await older.unroute(pageUrl);
  await notice(older).waitFor({ timeout: 30000 });
  assert.match(
    await notice(older).innerText(),
    new RegExp('An update to DKLA ' + real.version.replace('.', '\\.')),
  );
  // A save the browser aborts as it commits (no room left, for one) fires only 'abort'. Refresh must not
  // hang on "Saving…" and must not reload: it says the edits are not saved, saving is marked unavailable,
  // and later saves still run once the browser accepts them again.
  await older.evaluate(() => {
    window.__stillHere = true;
    const real = r7DB.transaction;
    r7DB.transaction = function (...args) {
      const tx = real.apply(this, args);
      const objectStore = tx.objectStore.bind(tx);
      tx.objectStore = (name) => {
        const store = objectStore(name);
        const put = store.put.bind(store);
        store.put = (...values) => {
          const request = put(...values);
          request.addEventListener('success', () => tx.abort());
          return request;
        };
        return store;
      };
      return tx;
    };
  });
  let refused;
  try {
    refused = await older.evaluate(async () => {
      const note = data.nodes.find((n) => n.kind === 'Note');
      note.notes = (note.notes || '') + ' aborted save';
      saveCache();
      document.querySelector('#r18Update .r18-update-go').click();
      for (let waited = 0; waited < 15000; waited += 100) {
        const button = document.querySelector('#r18Update .r18-update-go');
        if (!button.disabled && /Could not save/.test(document.getElementById('toast')?.textContent)) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const button = document.querySelector('#r18Update .r18-update-go');
      return {
        button: [button.textContent, button.disabled],
        toast: document.getElementById('toast').textContent,
        cacheAvailable,
        warned: !document.getElementById('storageWarning').hidden,
        stillHere: window.__stillHere,
      };
    });
  } catch (error) {
    assert.fail('Refresh reloaded although the save failed: ' + error.message);
  }
  assert.deepEqual(refused, {
    button: ['Refresh', false],
    toast: 'Could not save your latest edits. Export before refreshing.',
    cacheAvailable: false,
    warned: true,
    stillHere: true,
  });
  const recovered = await older.evaluate(async () => {
    delete r7DB.transaction;
    document.getElementById('storageWarning').hidden = true;
    saveCache();
    await r7FlushSave();
    return cacheAvailable;
  });
  assert.equal(recovered, true, 'a later save runs and succeeds');
  ok('an aborted save: Refresh stays on the page, says the edits are not saved, and later saves still run');
  const marker = 'update check marker ' + Date.now();
  await older.evaluate(() => LegalAtlas.navigate('node', 'cp-pennoyer'));
  await older.waitForTimeout(500);
  const reloaded = older.waitForEvent('load', { timeout: 90000 });
  // The edit and the press happen together, so the edit's save is still waiting on its timer (saveCache
  // defers it by a quarter second): Refresh itself must write it before the page goes.
  const noteId = await older.evaluate((marker) => {
    const note = data.nodes.find((n) => n.kind === 'Note');
    note.notes = (note.notes || '') + ' ' + marker;
    saveCache();
    document.querySelector('#r18Update .r18-update-go').click();
    return note.id;
  }, marker);
  await reloaded;
  await booted(older);
  assert.equal(await older.evaluate(() => R18.build), real.build);
  await older.waitForFunction(
    () => /Updated to/.test(document.getElementById('toast')?.textContent || ''),
    null,
    {
      timeout: 10000,
    },
  );
  const said = await toastText(older);
  assert.match(said, new RegExp('Updated to (the latest )?DKLA ' + real.version.replace('.', '\\.')));
  if (shots) await older.screenshot({ path: path.join(shots, 'updated-toast.png') });
  assert.equal(await older.evaluate(() => selected?.type + ':' + selected?.id), 'node:cp-pennoyer');
  assert.ok(
    await older.evaluate(
      ([id, marker]) => (nodesById.get(id).notes || '').includes(marker),
      [noteId, marker],
    ),
    'the edit made just before Refresh was saved',
  );
  await older.waitForTimeout(3500);
  assert.equal(await notice(older).count(), 0, 'the refreshed page is current');
  await older.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
  await booted(older);
  await older.waitForTimeout(1500);
  assert.ok(!/Updated/.test(await toastText(older)), 'the toast appears once');
  ok('Refresh saved the last edit, reopened the entry, and said "' + said + '" once');
  await third.close();

  // 4. A new worker takes over while two tabs are open.
  console.log('4. a new worker takes over');
  // The tabs start under a worker of an earlier build; then the server's real sw.js replaces it.
  const PREVIOUS = real.build.replace(/-[0-9a-f]+$/, '-feedface00');
  release.next = PREVIOUS;
  const fourth = await context();
  const c = await open(fourth);
  await controlled(c);
  release.next = null;
  assert.ok(release.served > 0, 'the earlier worker was installed');
  const d = await open(fourth);
  assert.deepEqual(await cacheNames(c), ['dkla-' + PREVIOUS]);
  for (const page of [c, d]) await page.evaluate(() => (window.__stillHere = true));
  await c.evaluate(async () => {
    await (await caches.open('dkla-v2.8-0123456789')).put('DKLA-v2.8.html', new Response('older release'));
    await (await caches.open('dkla-briefs-v1')).put('assets/briefs/marker.json', new Response('"a brief"'));
  });
  await c.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  // Until the new worker has activated, the earlier release's copy must still be there.
  for (let waited = 0; ; waited += 250) {
    const keys = await cacheNames(c);
    if (!keys.includes('dkla-' + PREVIOUS)) break;
    assert.ok(waited < 90000, 'the earlier release copy was never removed: ' + keys.join(', '));
    await c.waitForTimeout(250);
  }
  const keysNow = await cacheNames(c);
  assert.ok(keysNow.includes('dkla-' + real.build), 'the new release has its copy');
  assert.ok(!keysNow.includes('dkla-v2.8-0123456789'), 'every earlier release copy is removed');
  assert.ok(await holdsAtlas(c, 'dkla-' + real.build), 'the new copy holds the atlas');
  assert.equal(
    await c.evaluate(() => navigator.serviceWorker.controller?.state),
    'activated',
    'the new worker controls the tab',
  );
  const kept = await cacheNames(c);
  assert.ok(kept.includes('dkla-briefs-v1'), 'the briefs cache is kept');
  await c.waitForTimeout(1500);
  for (const page of [c, d]) {
    assert.equal(await page.evaluate(() => window.__stillHere), true, 'no tab was reloaded');
    assert.equal(await notice(page).count(), 0, 'no prompt in a current tab');
  }
  ok(
    'the new worker took both tabs without reloading them; older copies deleted, briefs kept: ' +
      kept.join(', '),
  );
  await fourth.close();

  // 5. Offline.
  console.log('5. offline');
  await first.setOffline(true);
  const response = await a.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
  await booted(a);
  assert.ok(response?.fromServiceWorker(), 'the atlas came from the offline copy');
  assert.equal(await a.evaluate(() => DKLAUpdates.check()), 'offline');
  assert.equal(await notice(a).count(), 0, 'offline stays quiet');
  await first.setOffline(false);
  ok('offline reload opened the atlas from the device; the check stayed quiet');
  await first.close();

  // 6. A release whose atlas never finishes starting still hears about the fix.
  console.log('6. a page that never finishes starting');
  const sixth = await context();
  const stuck = await sixth.newPage();
  await stuck.addInitScript(() => {
    const add = DOMTokenList.prototype.add;
    DOMTokenList.prototype.add = function (...names) {
      return add.apply(
        this,
        names.filter((name) => name !== 'dkla-boot-ready'),
      );
    };
  });
  await stuck.clock.install();
  await versionRoute(stuck, OTHER);
  await stuck.goto(pageUrl, { waitUntil: 'load', timeout: 90000 });
  await stuck.clock.fastForward(30000);
  assert.deepEqual(
    await stuck.evaluate(() => [DKLAUpdates.state().ready, DKLAUpdates.state().checks]),
    [false, 0],
    'no check before the minute is up',
  );
  await stuck.clock.fastForward(31000);
  await notice(stuck).waitFor({ timeout: 30000 });
  assert.equal(await stuck.evaluate(() => DKLAUpdates.state().ready), false);
  ok('a minute after load, a page that never became ready checked and shows the notice');
  await sixth.close();

  // 7. A tab whose PDF.js worker comes from another release (a newer offline worker took the tab after
  // the library loaded): the source viewer loads both again, together, and the page still renders.
  console.log('7. PDF.js worker from another release');
  // No offline worker here, so the route sees every request for the PDF.js worker.
  const seventh = await context({ serviceWorkers: 'block' });
  const PDFJS = JSON.parse(
    await readFile(new URL('../../node_modules/pdfjs-dist/package.json', import.meta.url), 'utf8'),
  ).version;
  const asked = [];
  await seventh.route('**/assets/pdfjs/pdf.worker.min.mjs*', async (route) => {
    asked.push(new URL(route.request().url()).search);
    const response = await route.fetch();
    const body = await response.text();
    // The first worker claims to be another PDF.js version, as a newer release's would.
    route.fulfill({ response, body: asked.length === 1 ? body.replaceAll(PDFJS, '0.0.1') : body });
  });
  const viewer = await open(seventh, pageUrl + '#node=cp-walker');
  await viewer.getByRole('button', { name: 'Original source', exact: true }).click();
  await viewer.locator('#fileDialog [data-pdf-rendered]').waitFor({ timeout: 60000 });
  assert.equal(await viewer.locator('#fileDialog canvas').count(), 1);
  assert.deepEqual(asked, ['?v=' + real.build, '?v=' + real.build + '.1']);
  ok('a mismatched PDF.js worker is replaced by a matching pair; the PDF page renders');
  await seventh.close();
  console.log(
    'Updates: quiet when current, notice for another build, Refresh with saved work, old copies removed, offline intact.',
  );
} finally {
  await browser.close();
}
