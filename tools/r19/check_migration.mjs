/* The move from v2.9 to this release on a visitor's device, in a real browser, when the release renames
   the atlas file (v3.0 serves DKLA-v3.0.html; v2.9 served DKLA-v2.9.html).

     node tools/r19/check_migration.mjs [--port 8779] [--same-name] [--disk]

   Before the release: the v2.9 offline worker, the v2.9 site-root page and the v2.9 page's update code
   (tools/r19/fixtures/v2.9, from commit 598d58fd). After it: this build's dist/ (run `pnpm build`
   first). If dist/ still holds DKLA-v2.9.html, it is served as DKLA-v3.0.html, with index.html, sw.js
   and version.json naming that file and the old name redirecting to it; nothing in the repository
   changes. --same-name serves it under its own name instead.

   The server answers as Vercel does for this site: the site root is the small forwarding index.html
   (files come before rewrites), old addresses answer 307, text files are compressed, every file has an
   ETag and If-None-Match gets 304. Each part runs in a fresh browser context. --disk gives each a
   profile on disk instead, as on a device; Chromium refuses to put the 65 MB atlas into Cache Storage
   in such a profile when the machine's disk is nearly full, so it is not the default.

   A. A v2.9 tab is open when the release ships. Its browser checks the worker: the new worker installs
      and takes the open tabs without reloading them. The old page's own Reload opens the new page under
      the new name, with no loop. The atlas is downloaded once. Offline, the site root and the new file
      name open the atlas.
   B. A v2.9 app is reopened after the release. The v2.9 worker stores the site root's forwarding page
      as its offline atlas (it cannot know the new name). Until the new worker is in, an offline launch
      shows a calm "still being updated" page instead of reloading forever. Once online again, the new
      worker installs without downloading the atlas a second time, the old copy is deleted, there is no
      "new version" prompt on the new page, and offline launches open the atlas. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'dist');
const fixtures = path.join(root, 'tools/r19/fixtures/v2.9');
const arg = (name) => process.argv.indexOf(name);
const port = arg('--port') < 0 ? 0 : Number(process.argv[arg('--port') + 1]);
const sameName = arg('--same-name') >= 0;
const onDisk = arg('--disk') >= 0;

const built = JSON.parse(fs.readFileSync(path.join(dist, 'version.json'), 'utf8'));
const OLD = { version: 'v2.9', build: 'v2.9-a77ee9d823', file: 'DKLA-v2.9.html' }; // the live v2.9 build
const NEW = {
  ...built,
  file: sameName || built.file !== OLD.file ? built.file : 'DKLA-v3.0.html',
};
assert.notEqual(NEW.build, OLD.build);
const routes = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const read = (file) => fs.readFileSync(file);
const text = (file) => fs.readFileSync(file, 'utf8');
const atlasName = /DKLA-[rv][0-9.]+\.html/g;

// What each release serves where it differs from dist/. Everything else comes from dist/.
const releases = {
  old: {
    '/index.html': () => text(path.join(fixtures, 'index.template.html')).replace(atlasName, OLD.file),
    '/sw.js': () =>
      text(path.join(fixtures, 'sw.template.js'))
        .replaceAll('__DKLA_BUILD__', OLD.build)
        .replaceAll('__DKLA_ATLAS__', OLD.file),
    '/version.json': () => JSON.stringify(OLD) + '\n',
    ['/' + OLD.file]: () => text(path.join(fixtures, 'page.html')).replaceAll('__DKLA_BUILD__', OLD.build),
    redirects: redirectsTo(OLD.file),
  },
  new: {
    '/index.html': () => text(path.join(dist, 'index.html')).replaceAll(built.file, NEW.file),
    '/sw.js': () => text(path.join(dist, 'sw.js')).replaceAll(built.file, NEW.file),
    '/version.json': () => JSON.stringify(NEW) + '\n',
    ['/' + NEW.file]: () => read(path.join(dist, built.file)),
    redirects: redirectsTo(NEW.file, OLD.file),
  },
};
// The site's redirects (vercel.json, those for every host), pointing at one release's file. A rename
// adds a redirect from the previous name, as tools/r19/assemble.py does.
function redirectsTo(file, previous) {
  const map = new Map();
  for (const r of routes.redirects || [])
    if (!r.has && !r.missing && /^\/DKLA-[rv][0-9.]+\.html$/.test(r.destination))
      map.set(r.source, '/' + file);
  if (previous && previous !== file) map.set('/' + previous, '/' + file);
  map.delete('/' + file);
  return map;
}

const state = { release: 'old', down: false, blockWorker: false };
const log = [];
const memo = new Map();
const gzip = promisify(zlib.gzip);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
// The body, its ETag and its compressed form, computed once per release and path.
async function body(release, pathname) {
  const key = release + ' ' + pathname;
  if (!memo.has(key))
    memo.set(
      key,
      (async () => {
        const own = releases[release][pathname];
        let raw;
        if (own) raw = Buffer.from(await own());
        else {
          const file = path.resolve(dist, '.' + pathname);
          if (!file.startsWith(dist + path.sep) || pathname === '/' + built.file) return null;
          try {
            if (!fs.statSync(file).isFile()) return null;
          } catch {
            return null;
          }
          raw = read(file);
        }
        const type = types[path.extname(pathname)] || 'application/octet-stream';
        const squeeze = /text|json|javascript|svg|manifest/.test(type) && raw.length > 1024;
        return {
          raw,
          type,
          tag: '"' + crypto.createHash('md5').update(raw).digest('hex') + '"',
          gz: squeeze ? await gzip(raw, { level: 6 }) : null,
        };
      })(),
    );
  return memo.get(key);
}
const server = http.createServer(async (req, res) => {
  if (state.down) return req.socket.destroy(); // no connection at all
  let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const entry = { method: req.method, path: pathname, release: state.release, status: 0, bytes: 0 };
  log.push(entry);
  const end = (status, headers = {}, payload) => {
    entry.status = status;
    entry.bytes = payload && req.method !== 'HEAD' ? payload.length : 0;
    res.writeHead(status, headers);
    res.end(req.method === 'HEAD' ? undefined : payload);
  };
  if (pathname.startsWith('/api/')) return end(503, {}, 'no API in this check');
  if (!['GET', 'HEAD'].includes(req.method)) return end(405);
  const release = releases[state.release];
  const to = release.redirects.get(pathname);
  if (to) return end(307, { Location: to });
  if (pathname === '/') pathname = '/index.html'; // a file at the root comes before the rewrite
  if (pathname === '/sw.js' && state.blockWorker) return end(503, {}, 'worker update held back');
  const found = await body(state.release, pathname);
  if (!found) return end(404, {}, 'not found');
  const squeezed = found.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  const etag = (squeezed ? 'W/' : '') + found.tag;
  const headers = {
    'Content-Type': found.type,
    ETag: etag,
    'Cache-Control': pathname === '/version.json' ? 'no-store' : 'public, max-age=0, must-revalidate',
    Vary: 'Accept-Encoding',
    ...(squeezed ? { 'Content-Encoding': 'gzip' } : {}),
    ...(pathname === '/sw.js' ? { 'Service-Worker-Allowed': '/' } : {}),
  };
  const asked = (req.headers['if-none-match'] || '').split(/\s*,\s*/).map((t) => t.replace(/^W\//, ''));
  if (asked.includes(found.tag)) return end(304, headers);
  const payload = squeezed ? found.gz : found.raw;
  end(200, { ...headers, 'Content-Length': payload.length }, payload);
});
await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
// Warm the big file before timing anything.
await body('new', '/' + NEW.file);

const profiles = [];
let browser = null;
async function profile() {
  const options = { viewport: { width: 1280, height: 800 } };
  let ctx;
  if (onDisk) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dkla-migration-'));
    ctx = await chromium.launchPersistentContext(dir, options);
    profiles.push([ctx, dir]);
  } else {
    browser ||= await chromium.launch();
    ctx = await browser.newContext(options);
    profiles.push([ctx, null]);
  }
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('dkla.guide.v1', 'seen');
    } catch {
      /* no storage */
    }
    // Every update notice the page ever shows, even one a later check takes away again.
    const shown = (window.__notices = []);
    const look = () => {
      const notice = document.getElementById('r18Update');
      if (notice && !notice.dataset.seen) {
        notice.dataset.seen = '1';
        shown.push(notice.textContent || 'notice');
      }
    };
    const watch = () => new MutationObserver(look).observe(document.body, { childList: true });
    if (document.body) watch();
    else
      new MutationObserver((_, observer) => {
        if (!document.body) return;
        observer.disconnect();
        watch();
      }).observe(document, { childList: true, subtree: true });
  });
  return ctx;
}
const ok = (message) => console.log('  ok  ' + message);
const T = Number(process.env.MIGRATION_TIMEOUT) || 180000;
const booted = (page) =>
  page.waitForFunction(() => document.documentElement.classList.contains('dkla-boot-ready'), null, {
    timeout: T,
  });
const isNewAtlas = (page) =>
  page.waitForFunction((build) => window.R18?.build === build, NEW.build, { timeout: T });
const downloads = (since, file) =>
  log.slice(since).filter((e) => e.path === '/' + file && e.method === 'GET' && e.status === 200).length;
const cacheKeys = (page) => page.evaluate(() => caches.keys());
const holds = (page, cache, file) =>
  page.evaluate(
    async ([cache, file]) => {
      if (!(await caches.has(cache))) return null;
      const hit = await (await caches.open(cache)).match(file);
      // The start of the file is enough to tell the atlas from the forwarding page.
      return hit ? await (await hit.blob()).slice(0, 4000).text() : null;
    },
    [cache, file],
  );
async function until(page, what, test, ms = T) {
  for (let waited = 0; ; waited += 250) {
    const value = await test();
    if (value) return value;
    if (waited >= ms) {
      console.error('caches:', await cacheKeys(page).catch(() => '?'));
      console.error('last requests:', JSON.stringify(log.slice(-20)));
      assert.fail('timed out: ' + what);
    }
    await page.waitForTimeout(250);
  }
}
// The page's document requests (a redirect counts as a second one). A reload loop shows up as many.
function navigations(page) {
  const seen = [];
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) seen.push(request.url());
  });
  return seen;
}
async function offline(ctx, on) {
  state.down = on;
  await ctx.setOffline(on);
}
const NEW_CACHE = 'dkla-' + NEW.build,
  OLD_CACHE = 'dkla-' + OLD.build;
// An offline launch at `address` opens the new atlas, with no loop.
async function opensOffline(ctx, address) {
  const page = await ctx.newPage();
  const seen = navigations(page);
  const response = await page.goto(base + address, { waitUntil: 'domcontentloaded', timeout: T });
  assert.ok(response?.fromServiceWorker(), address + ' came from the offline copy');
  await isNewAtlas(page);
  await booted(page);
  assert.equal(new URL(page.url()).pathname, '/' + address);
  assert.equal(seen.length, 1, 'one navigation: ' + seen.join(' → '));
  await page.close();
}

console.log(`Migration from ${OLD.file} (${OLD.build}) to ${NEW.file} (${NEW.build}), ${base}`);
try {
  // A. A v2.9 tab is open when the release ships.
  console.log('A. a v2.9 tab is open when the release ships');
  const A = await profile();
  const a = await A.newPage();
  a.on('pageerror', (error) => console.error('page error:', error.message));
  await a.goto(base, { waitUntil: 'load', timeout: T });
  await a.waitForURL('**/' + OLD.file);
  await a.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: T });
  assert.equal(await a.evaluate(() => window.OLD_BUILD), OLD.build);
  const b = await A.newPage();
  await b.goto(base + OLD.file, { waitUntil: 'load', timeout: T });
  for (const page of [a, b]) await page.evaluate(() => (window.__stillHere = true));
  assert.deepEqual(await cacheKeys(a), [OLD_CACHE]);
  ok('the v2.9 site is installed (' + OLD_CACHE + ') and two v2.9 tabs are open');

  state.release = 'new';
  const sinceA = log.length;
  await a.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await until(a, 'the new copy replaces the v2.9 copy', async () => {
    const keys = await cacheKeys(a);
    return keys.includes(NEW_CACHE) && !keys.includes(OLD_CACHE);
  });
  assert.ok(await holds(a, NEW_CACHE, NEW.file), 'the new copy holds the atlas under its new name');
  await a.locator('#r18Update', { hasText: 'A new version of the atlas is ready' }).waitFor({ timeout: T });
  await a.waitForTimeout(1500);
  for (const page of [a, b])
    assert.equal(await page.evaluate(() => window.__stillHere), true, 'no v2.9 tab reloads by itself');
  ok('the new worker took the open v2.9 tabs without reloading them; the v2.9 copy is gone');

  const seenA = navigations(a);
  const loaded = a.waitForURL('**/' + NEW.file, { timeout: T });
  await a.locator('#r18Update button', { hasText: 'Reload' }).click();
  await loaded;
  await isNewAtlas(a);
  await booted(a);
  await a.waitForFunction(() => ['current', 'newer', 'offline'].includes(DKLAUpdates.state().status), null, {
    timeout: T,
  });
  await a.waitForTimeout(3000);
  assert.ok(seenA.length <= 2, 'Reload opened the new page once: ' + seenA.join(' → '));
  assert.equal(new URL(a.url()).pathname, '/' + NEW.file);
  assert.equal(await a.evaluate(() => DKLAUpdates.state().status), 'current');
  assert.deepEqual(await a.evaluate(() => window.__notices), [], 'no notice on the new page');
  assert.equal(downloads(sinceA, NEW.file), 1, 'the atlas was downloaded once');
  assert.equal(await b.evaluate(() => window.OLD_BUILD), OLD.build, 'the other v2.9 tab is untouched');
  ok(`the v2.9 page's Reload opened ${NEW.file} once, with no loop; the atlas was downloaded once`);

  await offline(A, true);
  await opensOffline(A, '');
  await opensOffline(A, NEW.file);
  await offline(A, false);
  ok('offline, the site root and ' + NEW.file + ' open the new atlas');
  await A.close();

  // B. A v2.9 app is reopened after the release.
  console.log('B. a v2.9 app is reopened after the release');
  state.release = 'old';
  const B = await profile();
  const p = await B.newPage();
  await p.goto(base, { waitUntil: 'load', timeout: T });
  await p.waitForURL('**/' + OLD.file);
  await p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: T });
  await p.close();

  state.release = 'new';
  state.blockWorker = true; // the new worker has not got in yet: the window this part is about
  const sinceB = log.length;
  const q = await B.newPage();
  await q.goto(base, { waitUntil: 'domcontentloaded', timeout: T });
  await q.waitForURL('**/' + NEW.file, { timeout: T });
  await isNewAtlas(q);
  const stored = await holds(q, OLD_CACHE, OLD.file);
  assert.match(stored || '', /Opening the atlas/, 'the v2.9 worker stored the forwarding page as its atlas');
  await q.close();
  ok('the v2.9 worker served the new page from the network and kept the forwarding page as its atlas');

  await offline(B, true);
  for (const address of ['', NEW.file]) {
    const r = await B.newPage();
    const seen = navigations(r);
    await r.goto(base + address, { waitUntil: 'domcontentloaded', timeout: T }).catch(() => {});
    await r.getByText('The offline copy on this device is still being updated').waitFor({ timeout: T });
    await r.waitForTimeout(3000);
    assert.ok(seen.length <= 2, 'no loop: ' + seen.join(' → '));
    assert.equal(new URL(r.url()).pathname, '/' + NEW.file);
    await r.close();
  }
  await offline(B, false);
  ok('offline before the new worker is in: a calm "still being updated" page, no loop');

  state.blockWorker = false;
  const s = await B.newPage();
  s.on('pageerror', (error) => console.error('page error:', error.message));
  const started = Date.now();
  await s.goto(base, { waitUntil: 'domcontentloaded', timeout: T });
  await s.waitForURL('**/' + NEW.file, { timeout: T });
  let installedAt = 0,
    bootedAt = 0;
  booted(s).then(() => (bootedAt = Date.now()));
  await until(s, 'the new copy replaces the v2.9 copy', async () => {
    const keys = await cacheKeys(s);
    return keys.includes(NEW_CACHE) && !keys.includes(OLD_CACHE);
  });
  installedAt = Date.now();
  assert.ok(await holds(s, NEW_CACHE, NEW.file), 'the new copy holds the atlas under its new name');
  await booted(s);
  await s.waitForFunction(() => ['current', 'newer', 'offline'].includes(DKLAUpdates.state().status), null, {
    timeout: T,
  });
  await s.waitForTimeout(1500);
  assert.deepEqual(await s.evaluate(() => window.__notices), [], 'no "new version" prompt on the new page');
  // The v2.9 worker leaves the page it fetched only in the browser's HTTP cache, which the next visit
  // and the install revalidate. A profile on disk keeps it there: one download in all. A fresh in-memory
  // context cannot (its HTTP cache refuses entries over a few MB), so there each of the two visits
  // through the v2.9 worker and the install download it: three.
  const expected = onDisk ? 1 : 3;
  assert.equal(downloads(sinceB, NEW.file), expected, 'atlas downloads in part B');
  ok(
    `the new worker installed ${((installedAt - started) / 1000).toFixed(1)} s after opening ` +
      `(the atlas was ready at ${((bootedAt - started) / 1000).toFixed(1)} s) with ${expected} download(s) of the atlas; no prompt`,
  );
  await s.close();
  await offline(B, true);
  await opensOffline(B, '');
  await opensOffline(B, NEW.file);
  await offline(B, false);
  ok('offline, the site root and ' + NEW.file + ' open the new atlas');
  console.log(
    `Migration to ${NEW.file}: no reload loop, the old Reload lands on the new page, no needless atlas download, offline intact.`,
  );
} finally {
  for (const [ctx, dir] of profiles) {
    await ctx.close().catch(() => {});
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
  await browser?.close();
  server.close();
}
