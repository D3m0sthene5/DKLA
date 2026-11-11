/* DKLA offline worker. The build id below changes whenever the atlas changes (tools/r19/assemble.py
   stamps it), which installs a new worker beside the old one.

   Updates are quiet. The atlas page always comes from the network when there is one, so a visit after a
   release already runs the new page. The new worker copies the shell into its own cache (without
   downloading the atlas a second time), takes over at once (it never waits for a click) and only then
   deletes the copy the previous worker used, so the device always keeps one complete offline atlas. Taking over never reloads an open tab: the page decides, and
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

// The atlas entry of one release cache, or null. Any atlas file name counts: the page that was just
// opened was stored by the previous worker, possibly under the previous release's file name.
async function atlasIn(cache) {
  for (const request of await cache.keys()) {
    if (!ATLAS_FILE.test(new URL(request.url).pathname)) continue;
    const response = await cache.match(request);
    if (response?.status === 200) return response;
  }
  return null;
}

// Earlier releases' copies of one shell file that carry an ETag.
async function earlierCopies(path) {
  const found = [];
  for (const name of await caches.keys()) {
    if (name === CACHE || !RELEASE_CACHE.test(name)) continue;
    const cache = await caches.open(name);
    const response = path === ATLAS ? await atlasIn(cache) : await cache.match(at(path));
    if (response?.status === 200 && tag(response)) found.push(response);
  }
  return found;
}

// Room for this release's copy. Until v2.9 every release's copy was kept (up to four of 65 MB each), and
// an install that runs out of room would fail the same way every time. So before downloading anything,
// delete every earlier release's copy except the newest complete one: that is the copy the worker now in
// charge serves offline (it rewrites its atlas entry on every visit, so its atlas has the newest date). A
// copy counts as complete when it holds an atlas: v2.9 and earlier stored the shell all at once, and this
// worker stores the atlas last.
async function makeRoom() {
  const earlier = (await caches.keys()).filter((name) => name !== CACHE && RELEASE_CACHE.test(name));
  let keep = null,
    newest = -Infinity;
  for (const name of earlier) {
    const atlas = await atlasIn(await caches.open(name));
    if (!atlas) continue;
    const date = Date.parse(atlas.headers.get('date')) || 0;
    // Equal dates (no Date header): the cache created later belongs to the later release.
    if (date >= newest) [keep, newest] = [name, date];
  }
  for (const name of earlier) if (name !== keep) await caches.delete(name);
}

// One shell file for this release, downloaded at most once.
// - A copy already on the device is used when the server's file has the same ETag (asked with a HEAD,
//   which carries no body).
// - Otherwise the file is requested with 'no-cache': the browser revalidates its own HTTP-cache copy.
//   The atlas page the reader just opened is normally there, so the server answers 304 and that copy is
//   used, even when the release renamed the file. Nothing is taken from the HTTP cache without asking the
//   server first, so a stale build can never be stored under the current file name.
async function shellFile(path) {
  const copies = await earlierCopies(path);
  if (copies.length) {
    try {
      const head = await fetch(at(path), { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' });
      const current = head.ok && tag(head);
      const same = current && copies.find((copy) => tag(copy) === current);
      if (same) return same;
    } catch {
      /* ask with the request below */
    }
  }
  const response = await fetch(at(path), { cache: 'no-cache', credentials: 'same-origin' });
  if (!response.ok) throw Error('Offline copy incomplete: ' + path + ' ' + response.status);
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await makeRoom();
      const cache = await caches.open(CACHE);
      const files = await Promise.all(SHELL.map(async (path) => [path, await shellFile(path)]));
      // The atlas goes in last, so a release cache that holds an atlas holds the whole shell.
      for (const [path, response] of files) if (path !== ATLAS) await cache.put(path, response);
      await cache.put(ATLAS, files[SHELL.indexOf(ATLAS)][1]);
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
          // The atlas file itself is asked for against the copy on the device: when the server still has
          // that file (same ETag) it answers 304 and the copy is shown, so an unchanged atlas is not
          // downloaded again even when the browser's HTTP cache no longer holds it (phones keep little).
          const own = path === ATLAS ? await cache.match(ATLAS) : null;
          const response =
            own && tag(own)
              ? await fetch(request.url, {
                  cache: 'no-store',
                  credentials: 'same-origin',
                  redirect: 'manual',
                  headers: { 'If-None-Match': own.headers.get('etag') },
                })
              : await fetch(request);
          if (response.status === 304 && own) return own;
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
