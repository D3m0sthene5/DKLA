/* Lazy data blocks (v3.1): window.DKLAData, the one way to read a data block that may not be in the page.

   The hosted page (dist/) carries some large data blocks empty, marked data-dkla-lazy, with a manifest
   (dklaDataManifest) naming each one's SHA-256 and size; the bytes are in assets/data/<sha256>.json
   (tools/performance/package.mjs splitBlocks, list in tools/performance/lazy-blocks.json). The portable
   single-file atlas keeps every block embedded, and so does a copy exported from the hosted page (the export
   waits for every block first), so there every call answers at once from the page.

   Where this runs: in the hosted page, packaging places this file right after the manifest and before the
   first app code (the saved-work adapter that precedes appCode), so it exists before any script reads a
   block. It is also the first module of the feature bundle (src/features/manifest.json), which defines it in
   the portable atlas, where nothing is lazy; in the hosted page that second copy finds it defined and stops.
   Base scripts (src/runtime/) run before the bundle in the portable atlas, so code there must not assume
   window.DKLAData exists while the page is still loading: keep the fallback in lazy-contract.md.

   - isLazy(id): the block is split in this page and has not arrived yet.
   - text(id): the raw text. Hosted: one verified fetch per id (Cache Storage 'dkla-data-v1' first), then the
     text is also written into the block element, so later synchronous readers see it.
   - json(id): parsed once and shared; do not mutate it.
   - loaded(id), whenLoaded(id); the event 'dkla:data' {detail: {id}} after each block arrives.
   - After boot (html.dkla-boot-ready) and in idle time, every lazy block is fetched, one at a time and at
     low priority, in manifest order; not when the browser asks to save data; failures are retried later.
   - Cache entries no longer in the manifest are deleted after boot.
   The offline worker never stores these files; once fetched, they come from Cache Storage, also offline. */
(() => {
  'use strict';
  if (window.DKLAData) return;
  const CACHE = 'dkla-data-v1';
  const HASH = /^[a-f0-9]{64}$/;
  let manifest;
  // The manifest precedes this script in the hosted page; elsewhere there is none.
  function blocks() {
    if (manifest === undefined) {
      const marker = document.getElementById('dklaDataManifest');
      if (!marker && document.readyState === 'loading') return {}; // not parsed yet: ask again later
      try {
        manifest = (marker && JSON.parse(marker.textContent).blocks) || {};
      } catch {
        manifest = {};
      }
    }
    return manifest;
  }
  const done = new Set(),
    pending = new Map(),
    parsed = new Map(),
    waiters = new Map(),
    failures = new Map();
  const element = (id) => document.getElementById(id);
  function isLazy(id) {
    if (done.has(id) || !blocks()[id]) return false;
    const el = element(id);
    // An element with content (an exported copy, or a block written by text()) is not lazy.
    return !!el && el.hasAttribute('data-dkla-lazy') && el.textContent === '';
  }
  const loaded = (id) => !isLazy(id);
  const url = (hash) => new URL('assets/data/' + hash + '.json', document.baseURI).href;
  async function verified(response, entry) {
    if (!response?.ok) throw Error('Data block unavailable (' + (response?.status ?? 'no response') + ')');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== entry.bytes) throw Error('Data block has the wrong size');
    if (!crypto?.subtle) throw Error('This browser cannot verify data blocks here');
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    if (digest !== entry.hash) throw Error('Data block verification failed');
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }
  async function read(entry, low) {
    if (!HASH.test(entry?.hash || '')) throw Error('Invalid data block identity');
    const address = url(entry.hash);
    let cache;
    try {
      cache = await caches.open(CACHE);
      const hit = await cache.match(address);
      if (hit)
        try {
          return await verified(hit, entry);
        } catch {
          await cache.delete(address);
        }
    } catch {
      /* No Cache Storage (file://, private mode, denied): read from the network only. */
    }
    const response = await fetch(address, { credentials: 'same-origin', priority: low ? 'low' : 'auto' });
    const raw = await verified(response.clone(), entry);
    try {
      await cache?.put(address, response);
    } catch {
      /* Out of room: the block is still read, only not kept for offline use. */
    }
    return raw;
  }
  function arrived(id, raw) {
    const el = element(id);
    if (el && el.textContent === '') el.textContent = raw;
    done.add(id);
    failures.delete(id);
    for (const resolve of waiters.get(id) || []) resolve();
    waiters.delete(id);
    document.dispatchEvent(new CustomEvent('dkla:data', { detail: { id } }));
  }
  function text(id, options = {}) {
    if (!isLazy(id)) return Promise.resolve(element(id)?.textContent ?? '');
    if (!pending.has(id))
      pending.set(
        id,
        read(blocks()[id], options.low)
          .then((raw) => {
            arrived(id, raw);
            return raw;
          })
          .catch((error) => {
            failures.set(id, String(error?.message || error));
            throw error;
          })
          .finally(() => pending.delete(id)),
      );
    return pending.get(id);
  }
  function json(id) {
    if (!parsed.has(id)) {
      const value = text(id).then((raw) => JSON.parse(raw || 'null'));
      parsed.set(id, value);
      value.catch(() => parsed.get(id) === value && parsed.delete(id)); // a failed read may be asked again
    }
    return parsed.get(id);
  }
  function whenLoaded(id) {
    if (loaded(id)) return Promise.resolve();
    return new Promise((resolve) => {
      if (!waiters.has(id)) waiters.set(id, []);
      waiters.get(id).push(resolve);
    });
  }

  // Background prefetch after boot, in idle time, one block at a time.
  const idle = () =>
    new Promise((resolve) =>
      window.requestIdleCallback
        ? requestIdleCallback(() => resolve(), { timeout: 5000 })
        : setTimeout(resolve, 200),
    );
  const prefetchState = { started: false, running: null, retryIn: 0, timer: 0, skipped: '' };
  async function prefetchOnce() {
    for (const id of Object.keys(blocks())) {
      if (!isLazy(id)) continue;
      await idle();
      try {
        await text(id, { low: true });
      } catch {
        /* recorded in failures; retried below */
      }
    }
  }
  function prefetch() {
    if (navigator.connection?.saveData) {
      prefetchState.skipped = 'saveData';
      return Promise.resolve();
    }
    if (!prefetchState.running)
      prefetchState.running = prefetchOnce().finally(() => {
        prefetchState.running = null;
        const left = Object.keys(blocks()).filter(isLazy);
        if (!left.length) return;
        // Retry later: 30 s, then doubling up to 10 minutes; at once when the browser comes back online.
        prefetchState.retryIn = Math.min(600000, prefetchState.retryIn ? prefetchState.retryIn * 2 : 30000);
        clearTimeout(prefetchState.timer);
        prefetchState.timer = setTimeout(prefetch, prefetchState.retryIn);
      });
    return prefetchState.running;
  }
  addEventListener('online', () => {
    if (prefetchState.started && Object.keys(blocks()).some(isLazy)) prefetch();
  });
  // Delete cached blocks the current manifest no longer names. Only a page with a manifest does this.
  async function prune() {
    if (!document.getElementById('dklaDataManifest')) return 0;
    const keep = new Set(Object.values(blocks()).map((entry) => url(entry.hash)));
    let removed = 0;
    try {
      const cache = await caches.open(CACHE);
      for (const request of await cache.keys())
        if (!keep.has(request.url) && (await cache.delete(request))) removed++;
    } catch {
      /* no Cache Storage */
    }
    return removed;
  }
  function afterBoot() {
    if (prefetchState.started) return;
    prefetchState.started = true;
    if (!Object.keys(blocks()).length) return;
    idle()
      .then(prune)
      .catch(() => {})
      .then(prefetch);
  }
  const root = document.documentElement;
  if (root.classList.contains('dkla-boot-ready')) afterBoot();
  else {
    const watch = new MutationObserver(() => {
      if (!root.classList.contains('dkla-boot-ready')) return;
      watch.disconnect();
      afterBoot();
    });
    watch.observe(root, { attributes: true, attributeFilter: ['class'] });
    // A page that never finishes starting still fetches its data, a minute after load.
    addEventListener('load', () => setTimeout(afterBoot, 60000), { once: true });
  }

  // A portable copy saved from the hosted page must be complete: the export waits for every lazy block.
  // Installed once the page is parsed, outside the briefs' export wrapper (brief-loader.js), whose
  // synchronous serialization must stay last.
  const all = () => Promise.all(Object.keys(blocks()).map((id) => text(id)));
  function guardExport() {
    if (!Object.keys(blocks()).length) return;
    if (typeof exportHTML === 'function') {
      const prior = exportHTML;
      exportHTML = async function (...args) {
        try {
          if (Object.keys(blocks()).some(isLazy) && typeof toast === 'function')
            toast('Preparing complete portable atlas…');
          await all();
        } catch {
          if (typeof toast === 'function')
            toast(
              'Export failed: part of the atlas could not be loaded. Reconnect and retry, or export master JSON to preserve your edits.',
            );
          return;
        }
        return prior.apply(this, args);
      };
    }
    const blob = window.DKLA?.portableBlob;
    if (typeof blob === 'function')
      window.DKLA.portableBlob = async function (...args) {
        await all();
        return blob.apply(this, args);
      };
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', guardExport, { once: true });
  else guardExport();

  window.DKLAData = {
    isLazy,
    loaded,
    text: (id) => text(id),
    json,
    whenLoaded,
    // For checks and diagnostics; not part of the consumer contract.
    ids: () => Object.keys(blocks()),
    prefetch,
    prune,
    state: () => ({
      lazy: Object.keys(blocks()).filter(isLazy),
      loaded: [...done],
      pending: [...pending.keys()],
      failures: Object.fromEntries(failures),
      prefetch: {
        started: prefetchState.started,
        retryIn: prefetchState.retryIn,
        skipped: prefetchState.skipped,
      },
    }),
  };
})();
