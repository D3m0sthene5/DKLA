/* Isolated service-worker regression checks. No browser, HTTP or database. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const template = fs
  .readFileSync(path.join(__dirname, 'sw.template.js'), 'utf8')
  .replaceAll('__DKLA_BUILD__', 'worker-test')
  .replaceAll('__DKLA_ATLAS__', 'DKLA-v2.6.html');
const sources = [['template', template]];
if (fs.existsSync(path.join(root, 'work/build/sw.js')))
  sources.push(['generated', fs.readFileSync(path.join(root, 'work/build/sw.js'), 'utf8')]);

function harness(
  source,
  { origin = 'https://atlas.test', scope = '/', online = () => new Response('fresh atlas') } = {},
) {
  const listeners = {},
    stores = new Map(),
    calls = { fetch: [], put: [], addAll: [], deleted: [], claim: 0, skip: 0 };
  function store(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const data = stores.get(name);
    return {
      match: async (key) => data.get(key)?.clone(),
      put: async (key, response) => {
        calls.put.push(key);
        data.set(key, response);
      },
      addAll: async (keys) => {
        calls.addAll.push([...keys]);
        for (const key of keys) data.set(key, new Response('shell ' + key));
      },
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
      return stores.delete(name);
    },
  };
  vm.runInNewContext(
    source,
    {
      self,
      caches,
      URL,
      fetch: async (request) => {
        calls.fetch.push(request.url);
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
    seed: (key, body = 'cached atlas', name = cache) => {
      store(name);
      stores.get(name).set(key, new Response(body));
    },
    cached: async (key) => stores.get(cache)?.get(key)?.clone().text(),
    fetch: (pathname) => {
      let response;
      const request = { url: new URL(pathname, origin).href, method: 'GET' };
      listeners.fetch({
        request,
        respondWith: (value) => {
          response = Promise.resolve(value);
        },
      });
      return response;
    },
    bypass: (request) => {
      let responded = false;
      listeners.fetch({
        request,
        respondWith: () => {
          responded = true;
        },
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

  const shell = harness(source);
  await shell.lifecycle('install');
  const keys = shell.calls.addAll[0];
  assert.equal(keys[0], shell.atlas);
  assert.equal(keys.length, 6);
  assert.ok(keys.includes('manifest.webmanifest'));
  assert.ok(keys.includes('icons/icon.svg'));
  assert.ok(!keys.some((key) => key.includes('admin') || key.startsWith('api/')));
  assert.equal(await (await shell.fetch('/icons/icon.svg')).text(), 'shell icons/icon.svg');
  assert.equal(shell.calls.fetch.length, 0);
  shell.stores.get(shell.cache).delete('icons/icon.svg');
  assert.equal(await (await shell.fetch('/icons/icon.svg')).text(), 'fresh atlas');
  assert.equal(shell.calls.fetch.length, 1);
  shell.seed('old', 'older build', 'dkla-older-build');
  shell.seed('proof', 'own-origin proof', 'atlas-analytics-identity-v1');
  await shell.lifecycle('activate');
  assert.deepEqual(shell.calls.deleted, []);
  assert.ok(shell.stores.has('dkla-older-build'));
  assert.ok(shell.stores.has(shell.cache));
  assert.ok(shell.stores.has('atlas-analytics-identity-v1'));
  assert.equal(shell.calls.claim, 1);
  shell.listeners.message({ data: 'unrelated' });
  assert.equal(shell.calls.skip, 0);
  shell.listeners.message({ data: 'skip-waiting' });
  assert.equal(shell.calls.skip, 1);
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
