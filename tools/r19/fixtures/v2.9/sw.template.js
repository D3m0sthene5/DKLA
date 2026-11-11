/* DKLA offline worker. The build id below changes whenever the atlas changes (tools/r19/assemble.py
   stamps it), which installs a new worker beside the old one. The new copy waits until the reader
   accepts the reload prompt, so the page is never swapped mid-session. */
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

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Retain prior installed shells during the v2.6 migration. A reviewed cache
      // retention policy belongs to the later demand-loading stage. Never delete
      // the last offline copy while another release or tab may still need it.
      await self.clients.claim();
    })(),
  );
});

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
          if (response.ok) {
            // Historical public HTML may still return its original body. Only the
            // canonical route (including a verified redirect) may replace this shell.
            const canonical = new URL(ATLAS, self.registration.scope).pathname;
            const finalPath = new URL(response.url || request.url).pathname;
            if (path === '' || path === 'index.html' || path === ATLAS || finalPath === canonical)
              await cache.put(ATLAS, response.clone());
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
      const hit = await cache.match(isAtlas ? ATLAS : path);
      if (hit) return hit;
      return fetch(request);
    })(),
  );
});
