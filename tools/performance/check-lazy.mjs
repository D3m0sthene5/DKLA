/* Lazy data blocks in a real browser (v3.1): the hosted page fetches its split blocks, verifies them,
   keeps them for offline use and never accepts altered bytes.

     node tools/performance/check-lazy.mjs http://127.0.0.1:8781/DKLA-v3.2.html

   Needs `pnpm build` (it compares with work/build, the portable atlas) and the preview server.
   1. The split is in the page as served: each listed block is empty and marked, the manifest and the
      early loader come before the first app code, and window.DKLAData exists before that code runs.
   2. A first visit, with the offline worker: each block is fetched once, verified, stored in Cache Storage
      'dkla-data-v1' and written into its element; its text equals the portable atlas's block exactly. The
      audit corrections (dklaR21Audit, when it is lazy) are applied to the graph.
   3. Offline after that: a reload opens the atlas from the device and every block comes from Cache Storage.
   4. Prefetch: when every block's first request fails, the blocks still arrive after boot, from the
      background prefetch, without anyone asking for them, and the audit corrections are applied then.
   5. A portable copy saved before a block has arrived (DKLA.portableBlob, and exportHTML, the Save
      download) waits for it and contains it exactly.
   6. Tampering: a file with one byte changed is rejected (the block stays empty, nothing is cached, the
      audit corrections are not applied); a tampered copy in Cache Storage is thrown away and fetched again. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const address = new URL(process.argv[2] || 'http://127.0.0.1:8781/DKLA-v3.2.html');
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const release = JSON.parse(fs.readFileSync(path.join(root, 'work/build/version.json'), 'utf8'));
const portable = fs.readFileSync(path.join(root, 'work/build', release.file), 'utf8');
const bodyOf = (html, id) => {
  const tag = html.match(new RegExp('<script\\b[^>]*\\bid="' + id + '"[^>]*>'));
  const start = tag.index + tag[0].length;
  return html.slice(start, html.indexOf('</script>', start));
};
const sha = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const served = await (await fetch(address)).text();
const marker = served.match(/<script type="application\/json" id="dklaDataManifest">([^<]*)<\/script>/);
assert.ok(marker, 'the hosted page has a lazy data manifest (is tools/performance/lazy-blocks.json empty?)');
const manifest = JSON.parse(marker[1]).blocks;
const ids = Object.keys(manifest);
assert.ok(ids.length, 'at least one lazy block');
const want = Object.fromEntries(ids.map((id) => [id, sha(bodyOf(portable, id))]));
const AUDIT = 'dklaR21Audit';
const audit = ids.includes(AUDIT) ? JSON.parse(bodyOf(portable, AUDIT)) : null;
// One recorded text edit to look for: [entry id, field, old value, new value].
const sample = audit
  ? Object.entries(audit.nodes)
      .flatMap(([id, edits]) => edits.map(([field, from, to]) => [id, field, from, to]))
      .find(([, field, , to]) => !field.includes('.') && typeof to === 'string')
  : null;
const ok = (message) => console.log('  ok  ' + message);
// Background downloads may still be in flight when a context closes; their handlers then have nothing to answer.
const quietly = (handler) => async (route) => {
  try {
    await handler(route);
  } catch {
    /* the context closed */
  }
};
const errors = [];
const browser = await chromium.launch();

async function context(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...options });
  await ctx.route('**/api/**', (route) => route.fulfill({ status: 503, body: 'no API in this check' }));
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('dkla.guide.v1', 'seen');
    } catch {
      /* private window */
    }
    // When the curtain lifts, by the page's own clock (resource timings use the same one).
    new MutationObserver((_, watch) => {
      if (document.documentElement?.classList.contains('dkla-boot-ready')) {
        window.__bootReadyAt = performance.now();
        watch.disconnect();
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  return ctx;
}
async function open(ctx) {
  const page = await ctx.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const dataRequests = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.includes('/assets/data/')) dataRequests.push(request.url());
  });
  await page.goto(address.href, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 120000 });
  return { page, dataRequests };
}
const allLoaded = (page) =>
  page.waitForFunction((ids) => ids.every((id) => DKLAData.loaded(id)), ids, { timeout: 60000 });
// sha256 of each block's element text, computed in the page.
const elementHashes = (page) =>
  page.evaluate(async (ids) => {
    const out = {};
    for (const id of ids) {
      const bytes = new TextEncoder().encode(document.getElementById(id).textContent);
      out[id] = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return out;
  }, ids);
const cached = (page) =>
  page.evaluate(
    async (hashes) => {
      const cache = await caches.open('dkla-data-v1');
      const keys = (await cache.keys()).map((r) => new URL(r.url).pathname.split('/').pop());
      return hashes.map((h) => keys.includes(h + '.json'));
    },
    ids.map((id) => manifest[id].hash),
  );
const corrected = (page) =>
  sample ? page.evaluate(([id, field]) => nodesById.get(id)?.[field], sample) : Promise.resolve(null);

try {
  // 1. The page as served.
  console.log('1. the split in the served page');
  for (const id of ids) {
    const tag = served.match(new RegExp('<script\\b[^>]*\\bid="' + id + '"[^>]*>'));
    assert.match(tag[0], /\sdata-dkla-lazy>$/, id + ' is marked lazy');
    assert.equal(bodyOf(served, id), '', id + ' is empty in the served page');
  }
  const at = (s) => served.indexOf(s);
  assert.ok(
    marker.index < at('<script id="dklaDataLoader">') &&
      at('<script id="dklaDataLoader">') < at('<script id="dklaSavedWork">') &&
      at('<script id="dklaSavedWork">') < at('<script id="appCode">'),
    'manifest, then the data loader, then the first app code',
  );
  ok(`${ids.length} block(s) empty and marked (${ids.join(', ')}); manifest and loader before the app code`);

  // 2. First visit with the offline worker.
  console.log('2. first visit');
  const first = await context();
  const a = await open(first);
  // The loader existed before the first app code: the saved-work adapter's script follows it.
  assert.equal(
    await a.page.evaluate(
      () =>
        typeof window.DKLAData?.json === 'function' &&
        document
          .getElementById('dklaDataLoader')
          .compareDocumentPosition(document.getElementById('dklaSavedWork')) ===
          Node.DOCUMENT_POSITION_FOLLOWING,
    ),
    true,
  );
  await allLoaded(a.page);
  await a.page.waitForFunction(() => !DKLAData.state().pending.length && DKLAData.state().prefetch.started);
  await a.page.waitForTimeout(1500); // let a second, mistaken request show itself
  assert.deepEqual(await elementHashes(a.page), want, 'each block equals the portable block');
  for (const id of ids)
    assert.equal(
      sha(await a.page.evaluate((id) => DKLAData.text(id), id)),
      want[id],
      id + ': DKLAData.text equals the portable block',
    );
  assert.equal(a.dataRequests.length, ids.length, 'one request per block: ' + a.dataRequests.join(', '));
  assert.deepEqual(
    await cached(a.page),
    ids.map(() => true),
    'every block is in Cache Storage',
  );
  if (sample) {
    assert.equal(
      await corrected(a.page),
      sample[3],
      `the audit correction to ${sample[0]}.${sample[1]} is applied`,
    );
    assert.equal(
      await a.page.evaluate(() => JSON.stringify(DKLAAudit.data)),
      JSON.stringify(audit),
      'the audit module holds the portable audit data',
    );
  }
  ok(
    `each block fetched once, verified, cached and equal to the portable block${sample ? '; audit corrections applied' : ''}`,
  );

  // 3. Offline after prefetch.
  console.log('3. offline');
  await a.page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated', null, {
    timeout: 120000,
  });
  await first.setOffline(true);
  const offlineRequests = a.dataRequests.length;
  const response = await a.page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await a.page.locator('html.dkla-boot-ready').waitFor({ timeout: 120000 });
  assert.ok(response?.fromServiceWorker(), 'the atlas came from the offline copy');
  await allLoaded(a.page);
  assert.deepEqual(await elementHashes(a.page), want, 'offline, each block equals the portable block');
  assert.deepEqual((await a.page.evaluate(() => DKLAData.state())).failures, {});
  assert.equal(a.dataRequests.length, offlineRequests, 'offline, no block went to the network');
  if (sample) assert.equal(await corrected(a.page), sample[3]);
  // The worker's activation keeps the page's data cache.
  assert.ok((await a.page.evaluate(() => caches.keys())).includes('dkla-data-v1'));
  await first.setOffline(false);
  ok('offline reload: the atlas from the device, every block from Cache Storage, nothing from the network');

  // 6b (same context, so the worker is there): a tampered copy in Cache Storage is replaced.
  console.log('6b. a tampered cached copy');
  await a.page.evaluate(
    async ([id, hash]) => {
      const cache = await caches.open('dkla-data-v1');
      const key = (await cache.keys()).find((r) => r.url.endsWith(hash + '.json'));
      const text = await (await cache.match(key)).text();
      const changed = text.slice(0, 10) + (text[10] === 'a' ? 'b' : 'a') + text.slice(11);
      await cache.put(key, new Response(changed, { headers: { 'content-type': 'application/json' } }));
    },
    [ids[0], manifest[ids[0]].hash],
  );
  const beforeTamper = a.dataRequests.length;
  await a.page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await a.page.locator('html.dkla-boot-ready').waitFor({ timeout: 120000 });
  await allLoaded(a.page);
  assert.equal((await elementHashes(a.page))[ids[0]], want[ids[0]], 'the block is the verified one');
  assert.equal(a.dataRequests.length, beforeTamper + 1, 'the tampered copy was fetched again, once');
  const recached = await a.page.evaluate(async (hash) => {
    const cache = await caches.open('dkla-data-v1');
    const key = (await cache.keys()).find((r) => r.url.endsWith(hash + '.json'));
    const bytes = await (await cache.match(key)).arrayBuffer();
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }, manifest[ids[0]].hash);
  assert.equal(recached, manifest[ids[0]].hash, 'the cache now holds the verified file');
  ok('a tampered copy in Cache Storage was thrown away, fetched again and verified');
  await first.close();

  // 4. Prefetch: every block's first request fails.
  console.log('4. background prefetch');
  const second = await context({ serviceWorkers: 'block' });
  const failed = new Set();
  await second.route(
    '**/assets/data/**',
    quietly((route) => {
      const url = route.request().url();
      if (failed.has(url)) return route.continue();
      failed.add(url);
      return route.fulfill({ status: 503, body: 'not yet' });
    }),
  );
  const b = await open(second);
  await allLoaded(b.page);
  const timing = await b.page.evaluate(() => ({
    ready: window.__bootReadyAt,
    starts: performance
      .getEntriesByType('resource')
      .filter((e) => e.name.includes('/assets/data/'))
      .map((e) => e.startTime),
  }));
  assert.equal(b.dataRequests.length, 2 * ids.length, 'one failed and one successful request per block');
  const late = timing.starts.filter((t) => t >= timing.ready);
  assert.ok(
    late.length >= ids.length,
    'the successful requests started after boot: ' + JSON.stringify(timing),
  );
  assert.deepEqual(await elementHashes(b.page), want);
  if (sample)
    assert.equal(await corrected(b.page), sample[3], 'late corrections are applied when they arrive');
  ok('after failed first requests, the background prefetch fetched every block after boot');
  await second.close();

  // 5. A portable copy saved before the blocks arrive.
  console.log('5. saving a portable copy');
  const third = await context({ serviceWorkers: 'block', acceptDownloads: true });
  const held = [];
  let hold = true;
  await third.route(
    '**/assets/data/**',
    quietly((route) => (hold ? held.push(route) : route.continue())),
  );
  const c = await open(third);
  assert.equal(await c.page.evaluate((id) => DKLAData.isLazy(id), ids[0]), true, 'the block has not arrived');
  const saving = c.page.evaluate(async (ids) => {
    const text = await (await DKLA.portableBlob()).text();
    const out = {};
    for (const id of ids) {
      const tag = text.match(new RegExp('<script\\b[^>]*\\bid="' + id + '"[^>]*>'));
      const start = tag.index + tag[0].length;
      const bytes = new TextEncoder().encode(text.slice(start, text.indexOf('</script>', start)));
      out[id] = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return out;
  }, ids);
  // The Save button's path too: exportHTML downloads the complete atlas.
  const download = c.page.waitForEvent('download', { timeout: 120000 });
  await c.page.evaluate(() => void LegalAtlas.exportHTML());
  await c.page.waitForTimeout(500);
  assert.equal(await c.page.evaluate((id) => DKLAData.isLazy(id), ids[0]), true, 'still held');
  hold = false;
  for (const route of held.splice(0)) await route.continue();
  assert.deepEqual(await saving, want, 'the saved copy holds every block, exactly');
  const file = fs.readFileSync(await (await download).path(), 'utf8');
  for (const id of ids)
    assert.equal(sha(bodyOf(file, id)), want[id], id + ' is complete in the downloaded atlas');
  ok(
    'a portable copy saved before the blocks arrived (DKLA.portableBlob and the Save download) holds them exactly',
  );
  await third.close();

  // 6. A tampered file from the server.
  console.log('6. a tampered file');
  const fourth = await context({ serviceWorkers: 'block' });
  await fourth.route(
    '**/assets/data/**',
    quietly(async (route) => {
      const response = await route.fetch();
      const bytes = Buffer.from(await response.body());
      bytes[bytes.length >> 1] ^= 1; // same size, one bit changed
      return route.fulfill({ response, body: bytes });
    }),
  );
  const d = await open(fourth);
  const refused = await d.page.evaluate(async (id) => {
    try {
      await DKLAData.text(id);
      return 'accepted';
    } catch (error) {
      return error.message;
    }
  }, ids[0]);
  assert.match(refused, /verification failed/, 'the altered file is refused');
  assert.equal(await d.page.evaluate((id) => document.getElementById(id).textContent, ids[0]), '');
  assert.equal(await d.page.evaluate((id) => DKLAData.isLazy(id), ids[0]), true);
  assert.deepEqual(
    await cached(d.page),
    ids.map(() => false),
    'nothing altered was cached',
  );
  if (sample) {
    assert.equal(await d.page.evaluate(() => DKLAAudit.data), null, 'the audit has no data');
    assert.equal(await corrected(d.page), sample[2], 'the uncorrected text stays');
  }
  ok('a file with one bit changed is refused: the block stays empty and nothing is cached');
  await fourth.close();

  assert.deepEqual(errors, [], 'no page errors');
  console.log(
    'Lazy data blocks: split, fetched once, verified, cached, prefetched, offline, exported, tamper-proof.',
  );
} finally {
  await browser.close();
}
