/* DKLA offline worker. The build id below changes whenever the atlas changes (tools/r18/assemble.py
   stamps it), which installs a new worker beside the old one. The new copy waits until the reader
   accepts the reload prompt, so the page is never swapped mid-session. */
const BUILD = '__DKLA_BUILD__';
const CACHE = 'dkla-' + BUILD;
const ATLAS = 'DKLA-r19.html';
const SHELL = [ATLAS, 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('dkla-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scope)) return;
  const path = url.pathname.slice(scope.length);
  // Sync, version checks, source PDFs and page scans always go to the network: they are large, they are
  // fetched in byte ranges, and the atlas already shows their text when they cannot be reached.
  if (path.startsWith('api/') || path === 'version.json' || path === 'sw.js' || path.startsWith('added-sources/') || path.startsWith('DKLA-sources/')) return;
  const isAtlas = path === '' || path === 'index.html' || path === ATLAS;
  if (!isAtlas && !SHELL.includes(path)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(isAtlas ? ATLAS : path);
    if (hit) return hit;
    return fetch(request);
  })());
});
