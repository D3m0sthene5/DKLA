import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

// Exercise the actual handler with isolated in-memory dependencies. This never imports the
// Blob/analytics SDKs, reads deployment credentials, makes network requests or opens a database.
const source = readFileSync(new URL('../../api/sync.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replaceAll('export function ', 'function ')
  .replace('export default async function handler', 'async function handler');
const rating = (r = 1, t = 1000) => ({ r, t, n: 1 });
function harness(options = {}) {
  const blobs = new Map(), calls = { list: [], put: [], del: [], get: [], limit: [], identity: [] };
  let sequence = 0, waiting = 0, release, intercepted = false;
  const gate = new Promise(resolve => { release = resolve; });
  function seed(ratings, raw) {
    const id = String(++sequence).padStart(6, '0');
    const blob = { pathname: 'sync/synthetic/' + id + '.json', url: 'https://synthetic.private.invalid/' + id,
      uploadedAt: new Date(1700000000000 + sequence * 1000).toISOString(), text: raw ?? JSON.stringify({ v: 1, ratings }) };
    blobs.set(blob.url, blob); return blob;
  }
  const context = {
    createHash, Buffer, Response, Date,
    process: { env: { BLOB_READ_WRITE_TOKEN: 'synthetic-only', VERCEL_ENV: options.environment } },
    list: async input => {
      calls.list.push(input);
      const offset = Number(input.cursor || 0), all = [...blobs.values()];
      const page = { blobs: all.slice(offset, offset + input.limit).map(({ text, ...meta }) => meta),
        hasMore: offset + input.limit < all.length, cursor: String(offset + input.limit) };
      if (options.overlap && waiting < options.overlap && !input.cursor) {
        if (++waiting === options.overlap) release();
        await gate;
      }
      return options.listPage ? options.listPage(page, input) : page;
    },
    get: async url => {
      calls.get.push(url);
      if (options.beforeRead && !intercepted) { intercepted = true; await options.beforeRead({ url, blobs, call, seed }); }
      const blob = blobs.get(url);
      return blob ? { stream: new Response(blob.text).body } : null;
    },
    put: async (path, text, opts) => { calls.put.push({ path, text, opts }); return seed(null, text); },
    del: async urls => { calls.del.push([...urls]); for (const url of urls) blobs.delete(url); },
    sameOrigin: () => {}, readBody: async req => req.body, ip: () => '127.0.0.1',
    limit: async (...args) => { calls.limit.push(args); }, configured: () => Boolean(options.configured),
    verifiedSync: async (...args) => { calls.identity.push(args); },
    fail: (status, message) => Object.assign(new Error(message), { status })
  };
  vm.createContext(context); vm.runInContext(source + '\nglobalThis.handler = handler;', context);
  async function call(action, ratings = {}) {
    let status, data;
    const res = { setHeader() {}, set statusCode(value) { status = value; }, end(value) { data = JSON.parse(value); } };
    await context.handler({ method: 'POST', body: { code: 'TEST-ONLY-0000', action, data: { ratings } } }, res);
    return { status, data };
  }
  return { seed, call, blobs, calls };
}

test('seven overlapping uploads retain every acknowledged rating after read and pruning', async () => {
  const h = harness({ overlap: 7 });
  const responses = await Promise.all(Array.from({ length: 7 }, (_, i) => h.call('write', { ['item-' + i]: rating(i % 4, 1000 + i) })));
  assert.ok(responses.every(r => r.status === 200));
  assert.equal(h.blobs.size, 7);
  const read = await h.call('read'); assert.equal(read.status, 200);
  assert.equal(Object.keys(read.data.data.ratings).length, 7);
  const write = await h.call('write', { 'item-0': rating(3, 2000) }); assert.equal(write.status, 200);
  assert.equal(h.blobs.size, 2);
  const final = await h.call('read'); assert.equal(final.status, 200);
  assert.equal(Object.keys(final.data.data.ratings).length, 7);
  assert.deepEqual(final.data.data.ratings['item-0'], rating(3, 2000));
  assert.deepEqual(Object.keys(write.data).sort(), ['data', 'id', 'updatedAt']);
});

test('all listing pages are merged before pruning more than fifty snapshots', async () => {
  const h = harness();
  for (let i = 0; i < 73; i++) h.seed({ ['item-' + i]: rating() });
  const write = await h.call('write', { extra: rating() }); assert.equal(write.status, 200);
  assert.equal(h.calls.list.length, 2); assert.equal(h.calls.list[1].cursor, '50');
  assert.equal(Object.keys(write.data.data.ratings).length, 74);
  assert.equal(h.calls.get.length, 73); assert.equal(h.calls.del[0].length, 72);
  const read = await h.call('read'); assert.equal(Object.keys(read.data.data.ratings).length, 74);
});

for (const raw of ['{broken', '{"v":1}', '{"ratings":null}', '{"ratings":[]}', '{"ratings":{"broken":{"r":9,"t":1000}}}']) {
  test('malformed stored snapshot fails closed: ' + raw, async () => {
    const h = harness(); h.seed(null, raw);
    for (let i = 0; i < 5; i++) h.seed({ ['valid-' + i]: rating() });
    assert.equal((await h.call('read')).status, 500);
    assert.equal((await h.call('write', { incoming: rating() })).status, 500);
    assert.equal(h.calls.put.length, 0); assert.equal(h.calls.del.length, 0); assert.equal(h.blobs.size, 6);
  });
}

test('unreadable listed snapshot prevents acknowledgment, replacement and pruning', async () => {
  const h = harness({ beforeRead: ({ url, blobs }) => blobs.delete(url) });
  h.seed({ prior: rating() });
  assert.equal((await h.call('write', { incoming: rating() })).status, 500);
  assert.equal(h.calls.put.length, 0); assert.equal(h.calls.del.length, 0);
});

test('concurrent pruning fails the stale reader safely; fresh read recovers all ratings', async () => {
  let concurrent;
  const h = harness({ beforeRead: async ({ call }) => { concurrent = await call('write', { concurrent: rating() }); } });
  for (let i = 0; i < 3; i++) h.seed({ ['prior-' + i]: rating() });
  assert.equal((await h.call('write', { stale: rating() })).status, 500);
  assert.equal(concurrent.status, 200); assert.equal(h.calls.put.length, 1); assert.equal(h.calls.del.length, 1);
  const recovered = await h.call('read'); assert.equal(recovered.status, 200);
  assert.equal(Object.keys(recovered.data.data.ratings).length, 4);
  assert.equal((await h.call('write', { stale: rating() })).status, 200);
  assert.equal(Object.keys((await h.call('read')).data.data.ratings).length, 5);
});

test('uploads arriving after the listing are not pruning candidates', async () => {
  let late;
  const h = harness({ beforeRead: ({ seed }) => { late = seed({ late: rating() }); } });
  for (let i = 0; i < 3; i++) h.seed({ ['prior-' + i]: rating() });
  assert.equal((await h.call('write', { incoming: rating() })).status, 200);
  assert.ok(h.blobs.has(late.url)); assert.ok(!h.calls.del[0].includes(late.url));
  assert.equal(Object.keys((await h.call('read')).data.data.ratings).length, 5);
});

test('a broken pagination cursor fails before reading, writing or pruning', async () => {
  const h = harness({ listPage: page => ({ ...page, hasMore: true, cursor: 'repeated' }) });
  h.seed({ prior: rating() });
  assert.equal((await h.call('write')).status, 500);
  assert.equal(h.calls.get.length, 0); assert.equal(h.calls.put.length, 0); assert.equal(h.calls.del.length, 0);
});

test('configured preview reads and writes ratings without identity linkage, keeping rate limits', async () => {
  const h = harness({ configured: true, environment: 'preview' });
  const written = await h.call('write', { preview: rating() }); assert.equal(written.status, 200);
  const read = await h.call('read'); assert.equal(read.status, 200);
  assert.deepEqual(read.data.data.ratings, { preview: rating() });
  assert.equal(h.calls.identity.length, 0);
  assert.equal(h.calls.limit.length, 2);
  assert.ok(h.calls.limit.every(([key, count]) => key === 'sync:127.0.0.1' && count === 120));
});

test('configured production keeps identity linkage for successful reads and writes', async () => {
  const h = harness({ configured: true, environment: 'production' });
  assert.equal((await h.call('write', { production: rating() })).status, 200);
  assert.equal((await h.call('read')).status, 200);
  assert.equal(h.calls.identity.length, 2); assert.equal(h.calls.limit.length, 2);
});
