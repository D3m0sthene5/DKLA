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
     block element's textContent gives the text too, so later synchronous readers see it.
   - json(id): parsed once and shared; do not mutate it.
   - loaded(id), whenLoaded(id); the event 'dkla:data' {detail: {id}} after each block arrives.
   - After boot (html.dkla-boot-ready) and in idle time, every lazy block is fetched, one at a time and at
     low priority, in manifest order; not when the browser asks to save data; failures are retried later.
   - Cache entries no longer in the manifest are deleted after boot.
   - v3.2: a block is up to 14 MB, and fetching, checking, decoding, parsing and writing one into the page
     each froze the page for a moment (up to a fifth of a second on a slow machine). Now a large block is
     fetched, checked and stored by a worker (a second thread, made from the code below) and decoded in the
     page a megabyte at a time; json(id) is parsed in the worker, which sends the value back in small pieces;
     and the text is held beside its element until the window is not in use (see keep()). Where a worker
     cannot be used, the page does the work as before.
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
  /* ---------- work off the main thread, and in short stretches on it ---------- */
  // A pause that lets typing, clicks and drawing go first; background work also lets every other task go first.
  // `low` is a function, asked at every pause: a block being fetched in the background stops waiting its turn
  // the moment something on the page asks for it (see text()).
  const pause = (low) =>
    new Promise((resolve) => {
      if (window.scheduler?.postTask)
        scheduler.postTask(resolve, { priority: low() ? 'background' : 'user-visible' }).catch(resolve);
      else setTimeout(resolve, 0);
    });
  const PIECE = 200000, // about this many characters of JSON to a piece of a parsed value
    STRETCH = 1 << 20; // characters or bytes handled between two pauses
  // Worker side: send `value` (fresh from JSON.parse) as a series of small messages. A box (array or object)
  // larger than `piece` is announced ({make}) and then filled in order ({add}), its own large boxes likewise.
  function takeApart(value, post, piece) {
    const size = (v) => JSON.stringify(v).length,
      isBox = (v) => v !== null && typeof v === 'object';
    if (!isBox(value) || size(value) <= piece) {
      post({ whole: value });
      return;
    }
    (function walk(box, path) {
      const array = Array.isArray(box),
        keys = array ? null : Object.keys(box),
        count = array ? box.length : keys.length;
      post({ path, make: array ? 'array' : 'object' });
      let batch = [],
        weight = 0;
      const flush = () => {
        if (batch.length) post({ path, add: batch });
        batch = [];
        weight = 0;
      };
      for (let i = 0; i < count; i++) {
        const key = array ? i : keys[i],
          child = box[key],
          s = size(child);
        if (isBox(child) && s > piece) {
          flush();
          walk(child, path.concat([key]));
        } else {
          batch.push(array ? child : [key, child]);
          weight += s;
          if (weight >= piece) flush();
        }
      }
      flush();
    })(value, []);
  }
  // Page side: put the messages of takeApart back together. The result equals JSON.parse of the same text:
  // same values, same order of keys and items.
  function putTogether() {
    let root;
    const set = (box, key, value) => {
      if (Array.isArray(box)) box[key] = value;
      else Object.defineProperty(box, key, { value, writable: true, enumerable: true, configurable: true });
    };
    const at = (path) => path.reduce((box, key) => box[key], root);
    return {
      take(m) {
        if ('whole' in m) root = m.whole;
        else if (m.make) {
          const box = m.make === 'array' ? [] : {};
          if (!m.path.length) root = box;
          else set(at(m.path.slice(0, -1)), m.path[m.path.length - 1], box);
        } else {
          const box = at(m.path);
          if (Array.isArray(box)) for (const item of m.add) box.push(item);
          else for (const [key, value] of m.add) set(box, key, value);
        }
      },
      value: () => root,
    };
  }
  // The worker's whole program. Every request carries the number `n` of its reply.
  // - read {address, hash, size, cache, low}: what read() below does in the page (Cache Storage first, else
  //   the network; size and fingerprint checked; kept in Cache Storage), with the same error messages. The
  //   reply hands the bytes over (moved, not copied).
  // - parse {address, hash, cache}: the block is read again from Cache Storage, checked against its
  //   fingerprint, decoded and parsed here, and the value sent in pieces ({part}), then {end}. {missing} when
  //   the cache does not hold it: the page then sends the text itself (parse {text}).
  function workerProgram(takeApart, piece) {
    const hex = async (bytes) =>
      [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    const checked = async (response, m) => {
      if (!response?.ok) throw Error('Data block unavailable (' + (response?.status ?? 'no response') + ')');
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength !== m.size) throw Error('Data block has the wrong size');
      if (!self.crypto?.subtle) throw Error('This browser cannot verify data blocks here');
      if ((await hex(bytes)) !== m.hash) throw Error('Data block verification failed');
      return bytes;
    };
    const read = async (m) => {
      let cache;
      try {
        cache = await caches.open(m.cache);
        const hit = await cache.match(m.address);
        if (hit)
          try {
            return await checked(hit, m);
          } catch {
            await cache.delete(m.address);
          }
      } catch {
        /* No Cache Storage: read from the network only. */
      }
      const response = await fetch(m.address, {
        credentials: 'same-origin',
        priority: m.low ? 'low' : 'auto',
      });
      const bytes = await checked(response.clone(), m);
      try {
        await cache?.put(m.address, response);
      } catch {
        /* Out of room: the block is still read, only not kept for offline use. */
      }
      return bytes;
    };
    self.onmessage = async (event) => {
      const m = event.data;
      try {
        if (m.op === 'read') {
          const bytes = await read(m);
          self.postMessage({ n: m.n, bytes }, [bytes]);
          return;
        }
        let text = m.text;
        if (text === undefined) {
          let bytes = null;
          try {
            const hit = await (await caches.open(m.cache)).match(m.address);
            if (hit?.ok) bytes = await hit.arrayBuffer();
          } catch {
            /* no Cache Storage here */
          }
          if (!bytes || (await hex(bytes)) !== m.hash) {
            self.postMessage({ n: m.n, missing: true });
            return;
          }
          text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        }
        takeApart(JSON.parse(text), (part) => self.postMessage({ n: m.n, part }), piece);
        self.postMessage({ n: m.n, end: true });
      } catch (error) {
        self.postMessage({ n: m.n, error: String(error?.message || error) });
      }
    };
  }
  const helper = { worker: null, broken: false, n: 0, waiting: new Map(), idle: 0, used: 0, fallbacks: 0 };
  function helperFailed(reason) {
    helper.broken = true;
    try {
      helper.worker?.terminate();
    } catch {
      /* already gone */
    }
    helper.worker = null;
    for (const request of helper.waiting.values()) request.reject({ helper: reason });
    helper.waiting.clear();
  }
  // Ask the worker; rejects with {helper: reason} when the worker itself is the problem (the caller then does
  // the work in the page) and with an Error when the worker reports one about the data.
  function ask(message, onPart) {
    return new Promise((resolve, reject) => {
      // Only on a web page: a worker made from in-page code is not reliable from a file on disk.
      if (helper.broken || typeof Worker !== 'function' || !/^https?:$/.test(location.protocol)) {
        reject({ helper: 'unavailable' });
        return;
      }
      try {
        if (!helper.worker) {
          const source = `(${workerProgram})(${takeApart}, ${PIECE})`;
          const address = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
          helper.worker = new Worker(address);
          URL.revokeObjectURL(address);
          helper.worker.onmessage = (event) => {
            const m = event.data,
              request = helper.waiting.get(m.n);
            if (!request) return;
            request.heard();
            if (m.part) {
              request.onPart?.(m.part);
              return;
            }
            helper.waiting.delete(m.n);
            if (m.error) request.reject(Error(m.error));
            else request.resolve(m);
          };
          helper.worker.onerror = () => helperFailed('error');
        }
        const n = ++helper.n;
        // A worker that says nothing for 20 seconds is given up on.
        let watchdog = 0;
        const heard = () => {
          clearTimeout(watchdog);
          watchdog = setTimeout(() => helper.waiting.has(n) && helperFailed('silent'), 20000);
        };
        const settle = (fn) => (value) => {
          clearTimeout(watchdog);
          clearTimeout(helper.idle);
          // Nothing asked for half a minute: let the worker go; the next request makes a new one.
          helper.idle = setTimeout(() => {
            if (helper.waiting.size || !helper.worker) return;
            helper.worker.terminate();
            helper.worker = null;
          }, 30000);
          fn(value);
        };
        helper.waiting.set(n, { resolve: settle(resolve), reject: settle(reject), onPart, heard });
        heard();
        helper.worker.postMessage({ ...message, n });
        helper.used++;
      } catch {
        helperFailed('cannot start');
        reject({ helper: 'cannot start' });
      }
    });
  }
  // The text of a block as a list of parts, in order (joining 14 MB into one string costs a pause of its own,
  // so that is left until the whole text is first asked for: see keep()).
  async function decode(bytes, low) {
    const decoder = new TextDecoder('utf-8', { fatal: true }),
      view = new Uint8Array(bytes);
    if (view.length <= STRETCH) return [decoder.decode(view)];
    const parts = [];
    for (let from = 0; from < view.length; from += STRETCH) {
      parts.push(decoder.decode(view.subarray(from, from + STRETCH), { stream: true }));
      await pause(low);
    }
    parts.push(decoder.decode());
    return parts;
  }
  // Page-side check of a block (used when the worker cannot be): the fingerprint is computed by the browser
  // off the main thread, and the text is decoded a megabyte at a time.
  async function verified(response, entry, low) {
    if (!response?.ok) throw Error('Data block unavailable (' + (response?.status ?? 'no response') + ')');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== entry.bytes) throw Error('Data block has the wrong size');
    if (!crypto?.subtle) throw Error('This browser cannot verify data blocks here');
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    if (digest !== entry.hash) throw Error('Data block verification failed');
    return decode(bytes, low);
  }
  // JSON.parse of a block. A large one is parsed in the worker, which reads the block from Cache Storage
  // itself when this page fetched it (sending 14 MB of text to the worker would cost a pause of its own); the
  // text is sent only when the cache does not hold the block.
  async function parse(id) {
    const entry = blocks()[id];
    try {
      if (held.has(id) && entry?.bytes > STRETCH && HASH.test(entry.hash || '')) {
        const built = putTogether();
        const reply = await ask(
          { op: 'parse', address: url(entry.hash), hash: entry.hash, cache: CACHE },
          (part) => built.take(part),
        );
        if (!reply.missing) return built.value();
      }
    } catch (error) {
      if (!error?.helper) throw error;
      helper.fallbacks++;
    }
    const raw = (element(id)?.textContent ?? '') || 'null';
    if (raw.length > STRETCH)
      try {
        const built = putTogether();
        await ask({ op: 'parse', text: raw }, (part) => built.take(part));
        return built.value();
      } catch (error) {
        if (!error?.helper) throw error;
        helper.fallbacks++;
      }
    return JSON.parse(raw);
  }
  /* Where a block's text is kept. A small one is written into its element at once. Writing a large one
     costs a pause of its own (a twentieth of a second for the largest, four times that on a slow machine), so
     it is held here instead and the element answers with it: reading the element's textContent gives the
     text, exactly as if it had been written. It is written for real (settle) when that matters: before the
     atlas is saved as a file (the Save menu, or the browser's own Ctrl/Cmd+S), and while the window is not in
     use (hidden or without focus), one block at a time. */
  const held = new Map(); // id → {parts, raw}: the text in parts as decoded, joined when first read
  const whole = (entry) => {
    if (entry.raw === null) {
      entry.raw = entry.parts.join('');
      entry.parts = null;
    }
    return entry.raw;
  };
  function keep(el, id, parts) {
    if (parts.length === 1) {
      el.textContent = parts[0];
      return;
    }
    const entry = { parts, raw: null };
    held.set(id, entry);
    try {
      const answer = {
        configurable: true,
        get: () => whole(entry),
        set(value) {
          held.delete(id);
          delete el.textContent;
          delete el.text;
          el.textContent = value;
        },
      };
      Object.defineProperty(el, 'textContent', answer);
      Object.defineProperty(el, 'text', answer);
    } catch {
      held.delete(id);
      el.textContent = whole(entry);
    }
  }
  function settle(id) {
    const entry = held.get(id),
      el = element(id);
    if (!entry) return;
    held.delete(id);
    if (!el) return;
    delete el.textContent;
    delete el.text;
    if (el.textContent === '') el.textContent = whole(entry);
  }
  const settleAll = () => [...held.keys()].forEach(settle);
  // While nobody is using the window: one block, then a pause, until none is left or the window is back.
  let settling = false;
  async function settleQuietly() {
    if (settling) return;
    settling = true;
    while (held.size && (document.hidden || !document.hasFocus())) {
      settle(held.keys().next().value);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    settling = false;
  }
  addEventListener('blur', settleQuietly);
  document.addEventListener('visibilitychange', () => document.hidden && settleQuietly());
  // The browser's own "save page": everything is in the page before it is written out.
  addEventListener(
    'keydown',
    (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key?.toLowerCase() === 's') settleAll();
    },
    true,
  );
  addEventListener('beforeprint', settleAll);
  async function read(entry, low) {
    if (!HASH.test(entry?.hash || '')) throw Error('Invalid data block identity');
    const address = url(entry.hash);
    // A large block is fetched, checked and stored by the worker; the page only decodes it.
    if (entry.bytes > STRETCH)
      try {
        const request = {
          op: 'read',
          address,
          hash: entry.hash,
          size: entry.bytes,
          cache: CACHE,
          low: low(),
        };
        return await decode((await ask(request)).bytes, low);
      } catch (error) {
        if (!error?.helper) throw error;
        helper.fallbacks++;
      }
    let cache;
    try {
      cache = await caches.open(CACHE);
      const hit = await cache.match(address);
      if (hit)
        try {
          return await verified(hit, entry, low);
        } catch {
          await cache.delete(address);
        }
    } catch {
      /* No Cache Storage (file://, private mode, denied): read from the network only. */
    }
    const response = await fetch(address, { credentials: 'same-origin', priority: low() ? 'low' : 'auto' });
    const raw = await verified(response.clone(), entry, low);
    try {
      await cache?.put(address, response);
    } catch {
      /* Out of room: the block is still read, only not kept for offline use. */
    }
    return raw;
  }
  function arrived(id, parts) {
    const el = element(id);
    if (el && el.textContent === '') keep(el, id, parts);
    done.add(id);
    failures.delete(id);
    for (const resolve of waiters.get(id) || []) resolve();
    waiters.delete(id);
    document.dispatchEvent(new CustomEvent('dkla:data', { detail: { id } }));
  }
  // Blocks something on the page has asked for (not only the background download).
  const wanted = new Set();
  // Bring a block into the page; resolves when it is there, without reading its text.
  function request(id, options = {}) {
    if (!isLazy(id)) return Promise.resolve();
    if (!options.low) wanted.add(id);
    const low = () => !wanted.has(id);
    if (!pending.has(id))
      pending.set(
        id,
        read(blocks()[id], low)
          .then((parts) => arrived(id, parts))
          .catch((error) => {
            failures.set(id, String(error?.message || error));
            throw error;
          })
          .finally(() => pending.delete(id)),
      );
    return pending.get(id);
  }
  const text = (id, options) => request(id, options).then(() => element(id)?.textContent ?? '');
  function json(id) {
    if (!parsed.has(id)) {
      const value = request(id).then(() => parse(id));
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
        await request(id, { low: true });
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
          settleAll();
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
        settleAll();
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
    /** Bring the block into the page without reading it (for a caller that only wants it to be there). */
    request: (id) => request(id),
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
      // How many requests the worker took, and how many fell back to the page.
      helper: { used: helper.used, fallbacks: helper.fallbacks, broken: helper.broken },
      // Blocks whose text is held beside the page, not yet written into their elements.
      held: [...held.keys()],
      prefetch: {
        started: prefetchState.started,
        retryIn: prefetchState.retryIn,
        skipped: prefetchState.skipped,
      },
    }),
  };
})();
