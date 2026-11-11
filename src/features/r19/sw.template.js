/* DKLA offline worker. The build id below changes whenever the atlas changes (tools/r19/assemble.py
   stamps it), which installs a new worker beside the old one.

   Updates are quiet. The atlas page always comes from the network when there is one, so a visit after a
   release already runs the new page. The new worker copies the shell into its own cache, takes over at
   once (it never waits for a click) and only then deletes the older releases' copies, so the device
   always keeps one complete offline atlas. Taking over never reloads an open tab: the page decides, and
   it only reloads when the reader presses Refresh (see "offline install and updates" in
   src/runtime/dklaR18Study.js, which compares its own build with version.json). */
const BUILD = '__DKLA_BUILD__';
const CACHE = 'dkla-' + BUILD;
const ATLAS = '__DKLA_ATLAS__';
const SHELL = [
  ATLAS,
  'manifest.webmanifest',
  'icons/icon.svg',
  'assets/pdfjs/pdf.min.mjs',
  'assets/pdfjs/pdf.worker.min.mjs',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];
// The offline copy of each release is named dkla-<version>-<build hash>. Only those are ever deleted: the
// briefs cache (dkla-briefs-v1) and the analytics identity cache belong to the page and are kept.
const RELEASE_CACHE = /^dkla-[rv][0-9][0-9.]*-[0-9a-f]{6,64}$/;
const ATLAS_FILE = /\/(?:DKLA-[rv][0-9.]+\.html)$/;
const at = (path) => new URL(path, self.registration.scope).href;
const tag = (response) => (response?.headers?.get('etag') || '').replace(/^W\//, '');

// Earlier releases' copies of one shell file, newest first. For the atlas, any atlas file counts: the
// page that was just opened was stored by the previous worker, possibly under the previous file name.
async function earlierCopies(path) {
  const found = [];
  for (const name of await caches.keys()) {
    if (name === CACHE || !RELEASE_CACHE.test(name)) continue;
    const cache = await caches.open(name);
    const keys =
      path === ATLAS
        ? (await cache.keys()).filter((request) => ATLAS_FILE.test(new URL(request.url).pathname))
        : [at(path)];
    for (const key of keys) {
      const response = await cache.match(key);
      if (response?.status === 200 && tag(response)) found.push(response);
    }
  }
  return found.sort(
    (a, b) => (Date.parse(b.headers.get('date')) || 0) - (Date.parse(a.headers.get('date')) || 0),
  );
}

// One shell file for this release. When an earlier copy has the same ETag as the server's file, the
// server answers 304 and the copy already on the device is used: the 19 MB atlas is not downloaded a
// second time after the page itself was just downloaded. Otherwise the server's answer is the file.
// Nothing is taken from the HTTP cache without asking the server first ('no-cache'), so a stale build can
// never be stored under the current file name.
async function shellFile(path) {
  const copies = await earlierCopies(path);
  if (copies.length) {
    const sent = [...new Set(copies.map((copy) => copy.headers.get('etag')))].slice(0, 4);
    const response = await fetch(at(path), {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'If-None-Match': sent.join(', ') },
    });
    if (response.ok) return response;
    if (response.status === 304) {
      const matched =
        copies.find((copy) => tag(copy) === tag(response)) || (sent.length === 1 ? copies[0] : null);
      if (matched) return matched;
    }
    response.body?.cancel().catch(() => {});
  }
  const response = await fetch(at(path), { cache: 'no-cache', credentials: 'same-origin' });
  if (!response.ok) throw Error('Offline copy incomplete: ' + path + ' ' + response.status);
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(SHELL.map(async (path) => cache.put(path, await shellFile(path))));
      // The copy is complete: take over without waiting for every tab to close.
      self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Delete earlier releases only once this release's atlas is stored, so the device is never left
      // without an offline copy.
      const cache = await caches.open(CACHE);
      if (!(await cache.match(ATLAS))) return;
      for (const name of await caches.keys())
        if (name !== CACHE && RELEASE_CACHE.test(name)) await caches.delete(name);
    })(),
  );
});

// Pages from v2.9 and earlier ask a waiting worker to take over when the reader presses their Reload.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scope)) return;
  const path = url.pathname.slice(scope.length);
  // The owner's traffic dashboard uses the same project on its own hostname.
  if (url.hostname === 'dkla.dev' && (path === '' || path === 'index.html')) return;
  // Sync, version checks, source PDFs and page scans always go to the network: they are large, they are
  // fetched in byte ranges, and the atlas already shows their text when they cannot be reached.
  if (
    path.startsWith('api/') ||
    path === 'admin' ||
    path.startsWith('assets/admin/') ||
    path.startsWith('__analytics_identity') ||
    path === 'version.json' ||
    path === 'sw.js' ||
    path.startsWith('added-sources/') ||
    path.startsWith('DKLA-sources/')
  )
    return;
  const isAtlas =
    path === '' || path === 'index.html' || path === ATLAS || /^DKLA-[rv][0-9.]+\.html$/.test(path);
  if (!isAtlas && !SHELL.includes(path)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (isAtlas) {
        try {
          const response = await fetch(request);
          // An old address answers with a redirect: the browser follows it to the current file.
          if (response.type === 'opaqueredirect') return response;
          if (response.ok) {
            // Only the current file replaces the offline copy. The site root and index.html answer with
            // a small page that forwards to it, and historical addresses may return their original body.
            const canonical = new URL(ATLAS, self.registration.scope).pathname;
            const finalPath = new URL(response.url || request.url).pathname;
            if (finalPath === canonical && !response.redirected)
              event.waitUntil(cache.put(ATLAS, response.clone()).catch(() => {}));
            return response;
          }
          const offline = await cache.match(ATLAS);
          return offline || response;
        } catch (error) {
          const offline = await cache.match(ATLAS);
          if (offline) return offline;
          throw error;
        }
      }
      const hit = await cache.match(path);
      if (hit) return hit;
      return fetch(request);
    })(),
  );
});
