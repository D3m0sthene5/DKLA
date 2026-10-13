import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { splitBriefs, sha } from './package.mjs';
const source = fs.readFileSync(new URL('./brief-loader.js', import.meta.url), 'utf8');
const raw = '{"alpha":"Exact \\u003cquote> \\/ café\\nnext","beta":"Second brief"}';
const split = splitBriefs('<script type="application/json" id="dklaR19Full">' + raw + '</script>');
function fixture(options = {}) {
  const requests = [],
    cached = options.cached || new Map(),
    block = { textContent: options.portable ? raw : '{}' },
    messages = [];
  const payloads = new Map(split.files.map((f) => [new URL(f.path, 'https://atlas.test/').href, f.bytes]));
  let offline = false,
    corrupt = false,
    exports = 0;
  const cache = {
    match: async (url) => cached.get(url)?.clone(),
    delete: async (url) => cached.delete(url),
    put: async (url, r) => cached.set(url, r.clone()),
  };
  const context = {
    URL,
    TextDecoder,
    crypto: webcrypto,
    Response,
    document: {
      baseURI: 'https://atlas.test/DKLA-v2.6.html',
      getElementById: (id) =>
        id === 'dklaR19Full'
          ? block
          : id === 'dklaBriefManifest'
            ? { textContent: JSON.stringify(split.manifest) }
            : null,
    },
    caches: {
      open: async () => {
        if (options.denyCache) throw Error('denied');
        return cache;
      },
    },
    fetch: async (url) => {
      requests.push(url);
      if (options.wait) await options.wait;
      if (offline) throw Error('offline');
      return new Response(corrupt ? '"broken"' : payloads.get(url), {
        status: payloads.has(url) ? 200 : 404,
      });
    },
    toast: (s) => messages.push(s),
    exportHTML: () => {
      exports++;
      return block.textContent;
    },
    DKLA: { portableBlob: () => new Blob([block.textContent]) },
  };
  context.window = context;
  vm.runInNewContext(source, context);
  return {
    loader: context.DKLABriefLoader,
    context,
    requests,
    block,
    cached,
    messages,
    offline: (v) => (offline = v),
    corrupt: (v) => (corrupt = v),
    exports: () => exports,
  };
}
function target() {
  const button = {};
  return { dataset: {}, innerHTML: '', isConnected: true, querySelector: () => button, button };
}
test('split preserves raw legal JSON tokens and complete aggregate', () => {
  assert.equal(split.raw, raw);
  assert.equal(split.files.find((f) => f.path.includes(split.manifest.aggregate)).bytes.toString(), raw);
  assert.equal(
    split.files.find((f) => f.path.includes(split.manifest.records.alpha)).bytes.toString(),
    '"Exact \\u003cquote> \\/ café\\nnext"',
  );
  for (const f of split.files) assert.ok(f.path.includes(sha(f.bytes)));
});
test('no startup fetch; concurrent per-brief requests deduplicate and loaded values work offline', async () => {
  const f = fixture();
  assert.equal(f.requests.length, 0);
  assert.deepEqual(await Promise.all([f.loader.text('alpha'), f.loader.text('alpha')]), [
    JSON.parse(raw).alpha,
    JSON.parse(raw).alpha,
  ]);
  assert.equal(f.requests.length, 1);
  f.offline(true);
  assert.equal(await f.loader.text('alpha'), JSON.parse(raw).alpha);
  await assert.rejects(f.loader.text('beta'));
  f.offline(false);
  assert.equal(await f.loader.text('beta'), 'Second brief');
});
test('cached brief survives a fresh offline session; uncached failure can retry', async () => {
  const first = fixture();
  await first.loader.text('alpha');
  const next = fixture({ cached: first.cached });
  next.offline(true);
  assert.equal(await next.loader.text('alpha'), JSON.parse(raw).alpha);
  const t = target();
  await next.loader.fill(t, 'beta', (x) => '<p>' + x + '</p>');
  assert.match(t.innerHTML, /Retry full brief/);
  assert.equal(t.dataset.done, undefined);
  next.offline(false);
  await t.button.onclick();
  assert.equal(t.innerHTML, '<p>Second brief</p>');
  assert.equal(t.dataset.done, '1');
});
test('corrupt network/cache data never render and failed request does not poison retries', async () => {
  const f = fixture();
  f.corrupt(true);
  await assert.rejects(f.loader.text('alpha'), /verification/);
  f.corrupt(false);
  assert.equal(await f.loader.text('alpha'), JSON.parse(raw).alpha);
  const key = f.requests[0];
  f.cached.set(key, new Response('"corrupt"'));
  const next = fixture({ cached: f.cached });
  assert.equal(await next.loader.text('alpha'), JSON.parse(raw).alpha);
  assert.equal(next.requests.length, 1);
});
test('detached stale reader is never populated after a slow response', async () => {
  let release;
  const f = fixture({ wait: new Promise((r) => (release = r)) }),
    t = target();
  const filling = f.loader.fill(t, 'alpha', (x) => x);
  t.isConnected = false;
  release();
  await filling;
  assert.match(t.innerHTML, /Loading full brief/);
  assert.equal(t.dataset.done, undefined);
});
test('all HTML export entry points hydrate exact aggregate and portable reopening needs no network', async () => {
  const f = fixture();
  await f.loader.text('alpha');
  assert.equal(await f.context.exportHTML(), raw);
  assert.equal(f.block.textContent, raw);
  assert.equal(f.exports(), 1);
  assert.equal(await (await f.context.DKLA.portableBlob()).text(), raw);
  const portable = fixture({ portable: true });
  portable.offline(true);
  assert.equal(await portable.loader.text('beta'), 'Second brief');
  assert.equal(portable.requests.length, 0);
});
test('failed hydration never calls serializer; retry recovers; denied caches allow online reads', async () => {
  const f = fixture();
  f.offline(true);
  await f.context.exportHTML();
  assert.equal(f.exports(), 0);
  assert.equal(f.block.textContent, '{}');
  assert.match(f.messages.at(-1), /Export failed/);
  await assert.rejects(f.context.DKLA.portableBlob());
  f.offline(false);
  assert.equal(await f.context.exportHTML(), raw);
  assert.equal(f.exports(), 1);
  const denied = fixture({ denyCache: true });
  assert.equal(await denied.loader.text('beta'), 'Second brief');
});
