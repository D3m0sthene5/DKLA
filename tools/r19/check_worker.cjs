/* Isolated service-worker regression checks. No browser, HTTP or database. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const template = fs
  .readFileSync(path.join(__dirname, '../../src/features/r19/sw.template.js'), 'utf8')
  .replaceAll('__DKLA_BUILD__', 'worker-test')
  .replaceAll('__DKLA_ATLAS__', 'DKLA-v2.6.html');
const sources = [['template', template]];
if (fs.existsSync(path.join(root, 'work/build/sw.js')))
  sources.push(['generated', fs.readFileSync(path.join(root, 'work/build/sw.js'), 'utf8')]);

function harness(
  source,
  {
    origin = 'https://atlas.test',
    scope = '/',
    online = () => new Response('fresh atlas'),
    // Called on each pause the worker takes (time passes at once here), with the pause number.
    paused = () => {},
  } = {},
) {
  const listeners = {},
    stores = new Map(),
    calls = { fetch: [], requests: [], log: [], put: [], deleted: [], claim: 0, skip: 0, waited: 0 };
  let pauses = 0;
  function store(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const data = stores.get(name);
    return {
      // Keys are stored as given (the worker uses shell paths); a full URL or a request from keys()
      // is matched by its path.
      match: async (key) => {
        const name = typeof key === 'string' ? key : key.url;
        return data.get(name.startsWith(origin) ? new URL(name).pathname.slice(scope.length) : name)?.clone();
      },
      put: async (key, response) => {
        calls.put.push(key);
        data.set(key, response);
      },
      keys: async () => [...data.keys()].map((key) => ({ url: new URL(key, origin + scope).href })),
    };
  }
  const self = {
    location: { origin },
    registration: { scope: origin + scope },
    clients: {
      claim: async () => {
        calls.claim++;
      },
    },
    skipWaiting: () => {
      calls.skip++;
    },
    addEventListener: (kind, fn) => {
      listeners[kind] = fn;
    },
  };
  const caches = {
    open: async (name) => store(name),
    keys: async () => [...stores.keys()],
    delete: async (name) => {
      calls.deleted.push(name);
      calls.log.push('delete ' + name);
      return stores.delete(name);
    },
  };
  vm.runInNewContext(
    source,
    {
      self,
      caches,
      URL,
      setTimeout: (fn, ms = 0) => {
        calls.waited += ms;
        paused(++pauses);
        setImmediate(fn);
      },
      fetch: async (input, init = {}) => {
        const request =
          typeof input === 'string'
            ? {
                url: input,
                method: init.method || 'GET',
                cache: init.cache || 'default',
                headers: new Headers(init.headers),
                init,
              }
            : input;
        calls.fetch.push(request.url);
        const asked = {
          path: new URL(request.url).pathname.slice(scope.length),
          method: request.method,
          cache: request.cache,
        };
        calls.requests.push(asked);
        calls.log.push(asked.method + ' ' + asked.path);
        const response = await online(request);
        if (!response.url)
          Object.defineProperty(response, 'url', {
            value: new URL(source.match(/const ATLAS = '([^']+)'/)[1], self.registration.scope).href,
          });
        return response;
      },
    },
    { timeout: 1000 },
  );
  const atlas = source.match(/const ATLAS = '([^']+)'/)[1],
    cache = 'dkla-' + source.match(/const BUILD = '([^']+)'/)[1];
  return {
    calls,
    stores,
    atlas,
    cache,
    listeners,
    seed: (key, body = 'cached atlas', name = cache, headers = {}) => {
      store(name);
      stores.get(name).set(key, new Response(body, { headers }));
    },
    cached: async (key) => stores.get(cache)?.get(key)?.clone().text(),
    // Resolves once the response is ready and the work the worker kept running after it is done.
    fetch: async (pathname) => {
      let response;
      const later = [];
      const request = { url: new URL(pathname, origin).href, method: 'GET' };
      listeners.fetch({
        request,
        respondWith: (value) => {
          response = Promise.resolve(value);
        },
        waitUntil: (value) => later.push(value),
      });
      const result = await response;
      await Promise.all(later);
      return result;
    },
    bypass: (request) => {
      let responded = false;
      listeners.fetch({
        request,
        respondWith: () => {
          responded = true;
        },
        waitUntil: () => {},
      });
      assert.equal(responded, false);
    },
    lifecycle: async (kind) => {
      let work;
      listeners[kind]({
        waitUntil: (value) => {
          work = value;
        },
      });
      await work;
    },
  };
}

async function check(source) {
  // Root, index and canonical atlas URLs must all refresh a stale cached release.
  for (const pathname of [
    '/',
    '/index.html',
    '/DKLA-v2.5.html',
    '/DKLA-r18.html',
    '/' + harness(source).atlas,
  ]) {
    const h = harness(source);
    h.seed(h.atlas, 'old release');
    assert.equal(await (await h.fetch(pathname)).text(), 'fresh atlas');
    assert.equal(await h.cached(h.atlas), 'fresh atlas');
    assert.deepEqual(h.calls.put, [h.atlas]);
    assert.equal(h.calls.fetch.length, 1);
  }
  // The atlas file is asked for against the copy on the device: an unchanged file (304) is shown from
  // the device without a download; a changed one replaces the copy.
  for (const [server, shown] of [
    ['"same"', 'copy on the device'],
    ['"changed"', 'changed atlas'],
  ]) {
    const h = harness(source, {
      online: (request) =>
        request.headers?.get?.('if-none-match') === server
          ? new Response(null, { status: 304, headers: { etag: server } })
          : new Response('changed atlas', { headers: { etag: server } }),
    });
    h.seed(h.atlas, 'copy on the device', h.cache, { etag: '"same"' });
    assert.equal(await (await h.fetch('/' + h.atlas)).text(), shown);
    assert.equal(await h.cached(h.atlas), shown);
    assert.deepEqual(
      h.calls.requests.map((r) => r.cache),
      ['no-store'],
      'one conditional request, past the HTTP cache',
    );
  }
  const failure = new Error('fixture network offline');
  let oldOnline = true;
  const historical = harness(source, {
    online: (request) => {
      if (!oldOnline) throw Error('offline');
      const response = new Response('historical r8 body');
      Object.defineProperty(response, 'url', { value: request.url });
      return response;
    },
  });
  historical.seed(historical.atlas, 'current v2.6 shell');
  assert.equal(await (await historical.fetch('/DKLA-r8.html')).text(), 'historical r8 body');
  assert.equal(await historical.cached(historical.atlas), 'current v2.6 shell');
  assert.equal(historical.calls.put.length, 0);
  oldOnline = false;
  assert.equal(await (await historical.fetch('/' + historical.atlas)).text(), 'current v2.6 shell');
  const offline = harness(source, {
    online: () => {
      throw failure;
    },
  });
  offline.seed(offline.atlas, 'offline release');
  for (const route of ['/', '/DKLA-v2.5.html', '/DKLA-r18.html'])
    assert.equal(await (await offline.fetch(route)).text(), 'offline release');
  assert.equal(offline.calls.put.length, 0);
  const emptyOffline = harness(source, {
    online: () => {
      throw failure;
    },
  });
  await assert.rejects(emptyOffline.fetch('/'), (error) => error === failure);

  for (const status of [404, 503]) {
    const bad = harness(source, { online: () => new Response('network error', { status }) });
    bad.seed(bad.atlas, 'fallback release');
    assert.equal(await (await bad.fetch('/index.html')).text(), 'fallback release');
    assert.equal(await bad.cached(bad.atlas), 'fallback release');
    assert.equal(bad.calls.put.length, 0);
    const empty = harness(source, { online: () => new Response('network error', { status }) });
    const response = await empty.fetch('/');
    assert.equal(response.status, status);
    assert.equal(await response.text(), 'network error');
    assert.equal(empty.calls.put.length, 0);
  }

  const privateHost = harness(source, { origin: 'https://dkla.dev' });
  for (const pathname of [
    '/',
    '/index.html',
    '/admin',
    '/assets/admin/app.js',
    '/assets/admin/us-map.js',
    '/api/admin?action=locations',
    '/api/analytics',
  ]) {
    privateHost.bypass({ url: 'https://dkla.dev' + pathname, method: 'GET' });
  }
  assert.equal(privateHost.calls.fetch.length, 0);
  assert.equal(privateHost.stores.size, 0);
  const excluded = harness(source);
  for (const pathname of [
    '/admin',
    '/api/sync',
    '/assets/admin/styles.css',
    '/__analytics_identity',
    '/version.json',
    '/sw.js',
    '/added-sources/opinion.pdf',
    '/DKLA-sources/page.webp',
    '/unrelated',
  ]) {
    excluded.bypass({ url: 'https://atlas.test' + pathname, method: 'GET' });
  }
  excluded.bypass({ url: 'https://atlas.test/', method: 'POST' });
  excluded.bypass({ url: 'https://external.test/', method: 'GET' });
  const nested = harness(source, { scope: '/course/' });
  nested.seed(nested.atlas, 'old nested atlas');
  nested.bypass({ url: 'https://atlas.test/', method: 'GET' });
  assert.equal(await (await nested.fetch('/course/index.html')).text(), 'fresh atlas');

  // The site root answers with a small page that forwards to the atlas file (the address does not
  // change), and an old address answers with a redirect the browser follows. Neither may replace the
  // offline atlas: a forwarding page stored as the atlas loops when the device is offline.
  const forward = harness(source, {
    online: (request) => {
      const response = new Response('<script>location.replace(atlas)</script>');
      Object.defineProperty(response, 'url', { value: request.url });
      return response;
    },
  });
  forward.seed(forward.atlas, 'offline atlas');
  assert.equal(await (await forward.fetch('/')).text(), '<script>location.replace(atlas)</script>');
  assert.equal(await forward.cached(forward.atlas), 'offline atlas');
  const redirect = harness(source, { online: () => ({ type: 'opaqueredirect', ok: false, status: 0 }) });
  redirect.seed(redirect.atlas, 'offline atlas');
  assert.equal((await redirect.fetch('/DKLA-r18.html')).type, 'opaqueredirect');
  assert.equal(await redirect.cached(redirect.atlas), 'offline atlas');

  // Install copies the whole shell into this release's cache and takes over without waiting.
  const named = (request) => new URL(request.url).pathname.slice(1);
  const shell = harness(source, { online: (request) => new Response('shell ' + named(request)) });
  await shell.lifecycle('install');
  const keys = shell.calls.put;
  assert.equal(keys.length, 8);
  assert.ok(keys.includes(shell.atlas));
  assert.ok(keys.includes('assets/pdfjs/pdf.min.mjs'));
  assert.ok(keys.includes('assets/pdfjs/pdf.worker.min.mjs'));
  assert.ok(keys.includes('manifest.webmanifest'));
  assert.ok(keys.includes('icons/icon.svg'));
  assert.ok(!keys.some((key) => key.includes('admin') || key.startsWith('api/')));
  assert.equal(await shell.cached(shell.atlas), 'shell ' + shell.atlas);
  assert.equal(shell.calls.skip, 1, 'a complete copy takes over at once');
  const fetched = shell.calls.fetch.length;
  assert.equal(await (await shell.fetch('/icons/icon.svg')).text(), 'shell icons/icon.svg');
  assert.equal(shell.calls.fetch.length, fetched);
  shell.stores.get(shell.cache).delete('icons/icon.svg');
  assert.equal(await (await shell.fetch('/icons/icon.svg')).text(), 'shell icons/icon.svg');
  assert.equal(shell.calls.fetch.length, fetched + 1);

  // Activation keeps the page's own caches, deletes every earlier release's copy and claims the tabs.
  shell.seed('DKLA-v2.8.html', 'older build', 'dkla-v2.8-0123456789');
  shell.seed('DKLA-r19.html', 'much older build', 'dkla-r19-abcdef0123');
  shell.seed('proof', 'own-origin proof', 'atlas-analytics-identity-v1');
  shell.seed('assets/briefs/x.json', 'a brief', 'dkla-briefs-v1');
  await shell.lifecycle('activate');
  assert.deepEqual(shell.calls.deleted.sort(), ['dkla-r19-abcdef0123', 'dkla-v2.8-0123456789']);
  assert.ok(shell.stores.has(shell.cache));
  assert.ok(shell.stores.has('atlas-analytics-identity-v1'));
  assert.ok(shell.stores.has('dkla-briefs-v1'));
  assert.equal(await shell.cached(shell.atlas), 'shell ' + shell.atlas);
  assert.equal(shell.calls.claim, 1);

  // Without its own atlas a release never deletes the last offline copy on the device.
  const unready = harness(source);
  unready.seed('DKLA-v2.8.html', 'the only offline copy', 'dkla-v2.8-0123456789');
  await unready.lifecycle('activate');
  assert.deepEqual(unready.calls.deleted, []);
  assert.ok(unready.stores.has('dkla-v2.8-0123456789'));

  // A failed download leaves the older worker in charge: install fails, nothing is stored and nothing
  // takes over.
  const failing = harness(source, { online: () => new Response('gone', { status: 503 }) });
  await assert.rejects(failing.lifecycle('install'));
  assert.equal(failing.calls.skip, 0);
  const partly = harness(source, {
    online: (request) =>
      named(request) === 'icons/icon-512.png'
        ? new Response('gone', { status: 503 })
        : new Response('shell ' + named(request)),
  });
  await assert.rejects(partly.lifecycle('install'));
  assert.equal(await partly.cached(partly.atlas), undefined, 'an incomplete copy never holds the atlas');
  assert.equal(partly.calls.skip, 0);

  // The atlas is never downloaded twice. GETs revalidate the browser's HTTP cache ('no-cache'), which
  // normally holds the page the reader just opened, so the server answers 304 even after a rename; a
  // 'no-store' GET would download it again.
  const atlasName = shell.atlas;
  const gets = (h, file) => h.calls.requests.filter((r) => r.method === 'GET' && r.path === file);
  const heads = (h, file) => h.calls.requests.filter((r) => r.method === 'HEAD' && r.path === file);
  for (const h of [shell, partly])
    for (const r of h.calls.requests.filter((r) => r.method === 'GET' && r.cache))
      assert.equal(r.cache, 'no-cache', 'install GET ' + r.path + ' must revalidate, not re-download');
  assert.equal(
    shell.calls.requests.filter((r) => r.method === 'HEAD').length,
    0,
    'nothing earlier to compare on a first install',
  );
  assert.equal(shell.calls.put[7], shell.atlas, 'the atlas is stored last');

  // A copy already on the device with the server's ETag (asked with a HEAD) is used as is.
  const server = (etag) => (request) => {
    if (named(request) !== atlasName) return new Response('shell ' + named(request));
    return new Response(request.method === 'HEAD' ? null : 'downloaded atlas', { headers: { etag } });
  };
  const reuse = harness(source, { online: server('W/"new-atlas"') });
  reuse.seed('DKLA-v2.8.html', 'the page just opened', 'dkla-v2.8-0123456789', {
    etag: '"new-atlas"',
    date: 'Wed, 11 Nov 2026 18:00:00 GMT',
  });
  reuse.seed('DKLA-v2.8.html', 'an older page', 'dkla-v2.7-0123456789', {
    etag: '"old-atlas"',
    date: 'Wed, 11 Nov 2026 10:00:00 GMT',
  });
  await reuse.lifecycle('install');
  assert.equal(await reuse.cached(reuse.atlas), 'the page just opened');
  assert.equal(heads(reuse, atlasName).length, 1);
  assert.equal(gets(reuse, atlasName).length, 0, 'the same file is not downloaded again');
  assert.equal(reuse.calls.skip, 1);
  // A different file on the server (a new release, or the file was renamed) is fetched with
  // 'no-cache', never with 'no-store', and never replaced by the copy on the device.
  // Under the same name the install first gives the worker in charge 15 s to store the page it is
  // fetching; after a rename that worker never stores the new name, so there is nothing to wait for.
  for (const [earlierName, waits] of [
    [atlasName, 15000],
    ['DKLA-v2.8.html', 0],
  ]) {
    const changed = harness(source, { online: server('"newer"') });
    changed.seed(earlierName, 'stale page', 'dkla-v2.8-0123456789', { etag: '"new-atlas"' });
    await changed.lifecycle('install');
    assert.equal(await changed.cached(changed.atlas), 'downloaded atlas');
    assert.equal(heads(changed, atlasName).length, 1);
    assert.deepEqual(
      gets(changed, atlasName).map((r) => r.cache),
      ['no-cache'],
      'one request, answered from the HTTP cache when it holds the page',
    );
    assert.equal(changed.calls.waited, waits, earlierName + ': waited ' + changed.calls.waited + ' ms');
  }
  // The worker in charge is still storing the page the reader is opening (same name; it writes after
  // the last byte): the install waits for that copy instead of downloading the atlas a second time.
  let storing = null;
  storing = harness(source, {
    online: server('"newer"'),
    paused: (n) =>
      n === 3 &&
      storing.seed(atlasName, 'the page just stored', 'dkla-v2.8-0123456789', { etag: 'W/"newer"' }),
  });
  storing.seed(atlasName, 'the previous build', 'dkla-v2.8-0123456789', { etag: '"new-atlas"' });
  await storing.lifecycle('install');
  assert.equal(await storing.cached(storing.atlas), 'the page just stored');
  assert.equal(gets(storing, atlasName).length, 0, 'the page being stored is not downloaded again');
  assert.equal(storing.calls.waited, 1500, 'it looked every half second until the copy was there');
  assert.equal(storing.calls.skip, 1);
  // Offline (the HEAD fails), the install does not wait.
  const unreachable = harness(source, {
    online: () => {
      throw Error('offline');
    },
  });
  unreachable.seed(atlasName, 'the previous build', 'dkla-v2.8-0123456789', { etag: '"new-atlas"' });
  await assert.rejects(unreachable.lifecycle('install'));
  assert.equal(unreachable.calls.waited, 0);
  // A server that cannot answer the HEAD still gets one revalidating GET.
  const headless = harness(source, {
    online: (request) => {
      if (request.method === 'HEAD') throw Error('no HEAD here');
      return new Response('shell ' + named(request), { headers: { etag: '"x"' } });
    },
  });
  headless.seed(atlasName, 'earlier', 'dkla-v2.8-0123456789', { etag: '"x"' });
  await headless.lifecycle('install');
  assert.deepEqual(
    gets(headless, atlasName).map((r) => r.cache),
    ['no-cache'],
  );

  // Room before the download: install deletes every earlier release's copy except the two newest
  // complete ones (the worker in charge serves one of them offline; under v2.9 a newer build's worker
  // could be waiting beside it), and does so before it fetches anything. Those copies go only once this
  // release's atlas is stored (activate). The page's own caches stay.
  const room = harness(source, { online: (request) => new Response('shell ' + named(request)) });
  const dated = (day) => ({ date: `Wed, ${day} Nov 2026 12:00:00 GMT` });
  room.seed('DKLA-v2.6.html', 'v2.6', 'dkla-v2.6-0123456789', dated(2));
  room.seed('DKLA-v2.8.html', 'v2.8, in charge', 'dkla-v2.8-0123456789', dated(9));
  room.seed('DKLA-v2.7.html', 'v2.7', 'dkla-v2.7-0123456789', dated(5));
  room.seed('icons/icon.svg', 'no atlas: never complete', 'dkla-v2.9-feedface00', dated(10));
  room.seed('proof', 'own-origin proof', 'atlas-analytics-identity-v1');
  room.seed('assets/briefs/x.json', 'a brief', 'dkla-briefs-v1');
  room.seed('DKLA-v2.5.html', 'v2.5', 'dkla-v2.5-0123456789', dated(1));
  await room.lifecycle('install');
  assert.deepEqual(room.calls.deleted.sort(), [
    'dkla-v2.5-0123456789',
    'dkla-v2.6-0123456789',
    'dkla-v2.9-feedface00',
  ]);
  const firstFetch = room.calls.log.findIndex((entry) => !entry.startsWith('delete '));
  assert.ok(firstFetch > 0);
  assert.ok(
    room.calls.log.slice(firstFetch).every((entry) => !entry.startsWith('delete ')),
    'the old copies go before anything is downloaded',
  );
  for (const kept of [
    'dkla-v2.8-0123456789',
    'dkla-v2.7-0123456789',
    'atlas-analytics-identity-v1',
    'dkla-briefs-v1',
  ])
    assert.ok(room.stores.has(kept), kept + ' kept during install');
  await room.lifecycle('activate');
  for (const gone of ['dkla-v2.8-0123456789', 'dkla-v2.7-0123456789'])
    assert.ok(!room.stores.has(gone), gone + ' goes once this copy is complete');
  assert.ok(room.stores.has('dkla-briefs-v1') && room.stores.has('atlas-analytics-identity-v1'));
  // Without Date headers the cache created last is the newest release.
  const undated = harness(source, { online: (request) => new Response('shell ' + named(request)) });
  undated.seed('DKLA-v2.6.html', 'v2.6', 'dkla-v2.6-0123456789');
  undated.seed('DKLA-v2.7.html', 'v2.7', 'dkla-v2.7-0123456789');
  undated.seed('DKLA-v2.8.html', 'v2.8', 'dkla-v2.8-0123456789');
  await undated.lifecycle('install');
  assert.deepEqual(undated.calls.deleted, ['dkla-v2.6-0123456789']);

  // The page asks for PDF.js with its build in the query; the worker matches the file without it.
  const before = shell.calls.fetch.length;
  for (const file of ['assets/pdfjs/pdf.min.mjs', 'assets/pdfjs/pdf.worker.min.mjs'])
    assert.equal(await (await shell.fetch('/' + file + '?v=v9.9-0123456789')).text(), 'shell ' + file);
  assert.equal(shell.calls.fetch.length, before, 'served from the offline copy');

  // Pages from v2.9 and earlier still ask a waiting worker to take over.
  shell.listeners.message({ data: 'unrelated' });
  assert.equal(shell.calls.skip, 1);
  shell.listeners.message({ data: 'skip-waiting' });
  assert.equal(shell.calls.skip, 2);
}

(async () => {
  for (const [name, source] of sources) {
    await check(source);
    console.log(
      `Offline worker ${name}: fresh online atlas, offline/status fallbacks, private-route bypass and shell lifecycle passed.`,
    );
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
