/* Ask Dottie's fuel gauge, server side (lib/ask/fuel.js, api/fuel.js, the ledger hook in
   lib/ask/openai.js and the admin calibration route). In-memory Postgres (PGlite), as the
   analytics tests use; no test reaches the network or OpenAI.

     node --test tools/ask/fuel.test.mjs */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

process.env.NODE_ENV = 'test';
process.env.ANALYTICS_SECRET = 'local-test-only-secret-'.repeat(3);
process.env.ANALYTICS_ADMIN_PASSWORD = 'local-test-password-only';
delete process.env.ANALYTICS_ADMIN_PASSWORD_HASH;

const { query, ready, setTestDatabase } = await import('../../lib/analytics/db.js');
const fuel = await import('../../lib/ask/fuel.js');
const { createResponse } = await import('../../lib/ask/openai.js');
const { makeFuelHandler } = await import('../../api/fuel.js');
const { default: adminHandler } = await import('../../api/admin.js');
const { costOf, PRICES, SEARCH_USD, calibrate, fuelStatus, publicFuel, recordSpend } = fuel;

let network = async (url) => {
  throw Error('Unexpected network request in a test: ' + url);
};
globalThis.fetch = (...args) => network(...args);

async function fresh({ schema = true } = {}) {
  const db = new PGlite();
  setTestDatabase(db);
  if (schema) await ready();
  return db;
}
const spendRows = () =>
  query(
    'SELECT model, input_tokens, cached_tokens, output_tokens, searches, usd::float8 AS usd FROM dkla_ask_spend ORDER BY id',
  );
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not ${b}`);

const usage = (input, cached, output) => ({
  input_tokens: input,
  input_tokens_details: { cached_tokens: cached },
  output_tokens: output,
  output_tokens_details: { reasoning_tokens: 40 },
});

test('cost: tokens at the model price, cached input at the cached price, each search at the search price', () => {
  const p = PRICES['gpt-5.4-mini'];
  assert.deepEqual(p, { input: 0.75, cached: 0.075, output: 4.5 });
  close(SEARCH_USD, 0.01);
  const research = {
    usage: usage(20_000, 4_000, 1_500),
    output: [
      { type: 'web_search_call' },
      { type: 'web_search_call' },
      { type: 'reasoning' },
      { type: 'message' },
    ],
  };
  const cost = costOf('gpt-5.4-mini', research);
  close(cost.usd, (16_000 * 0.75 + 4_000 * 0.075 + 1_500 * 4.5) / 1e6 + 2 * 0.01);
  assert.equal(cost.searches, 2);
  assert.equal(cost.input_tokens, 20_000);
  assert.equal(cost.cached_tokens, 4_000);
  assert.equal(cost.output_tokens, 1_500);
  // A dated snapshot has its family's price; a model not in the table costs the dearest rate.
  assert.equal(costOf('gpt-5.4-mini-2026-03-17', research).usd, cost.usd);
  assert.ok(costOf('some-new-model', research).usd >= cost.usd);
  // Cached tokens can never exceed input tokens; nonsense counts are zero.
  close(costOf('gpt-5.4-mini', { usage: usage(100, 900, -5) }).usd, (100 * 0.075) / 1e6);
  // Nothing billable reported: nothing to record.
  assert.equal(costOf('gpt-5.4-mini', { output: [] }), null);
  assert.equal(costOf('gpt-5.4-mini', null), null);
  // A stream cut off after two finished searches counts the searches alone.
  close(costOf('gpt-5.4-mini', null, 2).usd, 0.02);
});

test('every model Dottie calls has a price in the table', () => {
  const dir = new URL('../../lib/ask/', import.meta.url);
  const models = new Set();
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.js')))
    for (const [, model] of readFileSync(new URL(file, dir), 'utf8').matchAll(/\bmodel:\s*'([^']+)'/g))
      models.add(model);
  assert.ok(models.size >= 1, 'found the model names');
  for (const model of models) assert.ok(PRICES[model], `${model} is missing from PRICES in lib/ask/fuel.js`);
});

test('ledger: every OpenAI response is recorded, including failed and incomplete ones that report usage', async () => {
  const db = await fresh();
  const replies = [
    { status: 'completed', usage: usage(1_000, 0, 200), output: [{ type: 'message' }] },
    { status: 'incomplete', usage: usage(3_000, 1_000, 2_400), output: [{ type: 'web_search_call' }] },
    { status: 'failed', usage: usage(500, 0, 0), output: [] },
  ];
  network = async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(JSON.parse(init.body).store, false);
    return new Response(JSON.stringify(replies.shift()), { headers: { 'content-type': 'application/json' } });
  };
  for (let i = 0; i < 3; i++) await createResponse({ apiKey: 'test', model: 'gpt-5.4-mini', input: 'q' });
  const rows = await spendRows();
  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map(({ input_tokens, cached_tokens, output_tokens, searches }) => [
      input_tokens,
      cached_tokens,
      output_tokens,
      searches,
    ]),
    [
      [1000, 0, 200, 0],
      [3000, 1000, 2400, 1],
      [500, 0, 0, 0],
    ],
  );
  close(rows[1].usd, (2_000 * 0.75 + 1_000 * 0.075 + 2_400 * 4.5) / 1e6 + 0.01, 1e-8);
  // The ledger holds counts and costs only: no question, answer, IP or visitor.
  const columns = await query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='dkla_ask_spend' ORDER BY ordinal_position",
  );
  assert.deepEqual(
    columns.map(({ column_name }) => column_name),
    ['id', 'at', 'model', 'input_tokens', 'cached_tokens', 'output_tokens', 'searches', 'usd'],
  );
  // An error reply from OpenAI reports no usage: nothing recorded, the error still reaches the caller.
  network = async () =>
    new Response(JSON.stringify({ error: { code: 'insufficient_quota' } }), { status: 429 });
  await assert.rejects(createResponse({ apiKey: 'test', model: 'gpt-5.4-mini' }), { statusCode: 402 });
  assert.equal((await spendRows()).length, 3);
  await db.close();
});

test('ledger: a streamed research call is recorded once; one cut off counts its finished searches', async () => {
  const db = await fresh();
  const events = (list) =>
    new Response(list.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(''), {
      headers: { 'content-type': 'text/event-stream' },
    });
  const done = { type: 'response.output_item.done', item: { type: 'web_search_call', status: 'completed' } };
  network = async () =>
    events([
      done,
      done,
      {
        type: 'response.completed',
        response: {
          status: 'completed',
          usage: usage(9_000, 0, 800),
          output: [{ type: 'web_search_call' }, { type: 'web_search_call' }, { type: 'message' }],
        },
      },
    ]);
  const seen = [];
  await createResponse({ apiKey: 't', model: 'gpt-5.4-mini', onEvent: (e) => seen.push(e.type) });
  assert.equal(seen.length, 3);
  network = async () => events([done, done, done, { type: 'error', code: 'server_error' }]);
  await assert.rejects(createResponse({ apiKey: 't', model: 'gpt-5.4-mini', onEvent: () => {} }));
  const rows = await spendRows();
  assert.deepEqual(
    rows.map(({ searches, input_tokens }) => [searches, input_tokens]),
    [
      [2, 9000],
      [3, 0],
    ],
  );
  close(rows[1].usd, 0.03);
  await db.close();
});

test('ledger failure never breaks or holds up an answer', async () => {
  const reply = { status: 'completed', usage: usage(10, 0, 10), output: [] };
  network = async () =>
    new Response(JSON.stringify(reply), { headers: { 'content-type': 'application/json' } });
  const warn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    // A database that throws.
    const broken = async () => {
      throw Object.assign(Error('connection refused'), { code: 'ECONNREFUSED' });
    };
    setTestDatabase({ query: broken, transaction: broken });
    assert.deepEqual(await createResponse({ apiKey: 't', model: 'gpt-5.4-mini' }), reply);
    // A database that never answers: the answer comes back after the ledger's short wait.
    const hang = () => new Promise(() => {});
    setTestDatabase({ query: hang, transaction: hang });
    const started = Date.now();
    assert.deepEqual(await createResponse({ apiKey: 't', model: 'gpt-5.4-mini' }), reply);
    assert.ok(Date.now() - started < fuel.LEDGER_WAIT_MS + 500, 'waited no longer than the ledger allows');
    // No database configured (local preview, tests): silent.
    const missing = async () => {
      throw Object.assign(Error('not-configured'), { status: 503 });
    };
    setTestDatabase({ query: missing, transaction: missing });
    const before = warnings.length;
    assert.equal(await recordSpend(costOf('gpt-5.4-mini', reply)), false);
    assert.equal(warnings.length, before);
  } finally {
    console.warn = warn;
  }
});

test('calibration: balance minus spending since, over the starting credit, clamped, latest point wins', async () => {
  const db = await fresh();
  assert.deepEqual(await fuelStatus(), { calibrated: false, fraction: null });
  // Spending before the calibration point is already in the balance OpenAI showed.
  await recordSpend({
    model: 'gpt-5.4-mini',
    input_tokens: 0,
    cached_tokens: 0,
    output_tokens: 0,
    searches: 500,
    usd: 5,
  });
  await query("UPDATE dkla_ask_spend SET at = now() - interval '1 hour'");
  const point = await calibrate({ balance: 60, start: 79, note: 'billing page' });
  assert.equal(point.calibrated, true);
  assert.equal(point.fraction, Math.round((60 / 79) * 1000) / 1000);
  await recordSpend({
    model: 'gpt-5.4-mini',
    input_tokens: 0,
    cached_tokens: 0,
    output_tokens: 0,
    searches: 0,
    usd: 20.5,
  });
  let status = await fuelStatus();
  close(status.spentUsd, 20.5);
  close(status.remainingUsd, 39.5);
  assert.equal(status.fraction, 0.5);
  // Overspent: never below zero.
  await recordSpend({
    model: 'gpt-5.4-mini',
    input_tokens: 0,
    cached_tokens: 0,
    output_tokens: 0,
    searches: 0,
    usd: 50,
  });
  assert.equal((await fuelStatus()).fraction, 0);
  // A refill: a new point; the full amount may change. Above the full amount: never above one.
  await new Promise((resolve) => setTimeout(resolve, 5));
  status = await calibrate({ balance: 120, start: 100, note: 'refilled' });
  assert.equal(status.fraction, 1);
  status = await calibrate({ balance: 25, start: 100 });
  assert.equal(status.fraction, 0.25);
  // A point with an earlier time does not replace the latest one.
  await calibrate({ balance: 1, start: 100, at: new Date(Date.now() - 86_400_000).toISOString() });
  assert.equal((await fuelStatus()).fraction, 0.25);
  // Bad input is refused and stores nothing.
  const rows = async () => (await query('SELECT count(*)::int AS n FROM dkla_ask_fuel_calibration'))[0].n;
  const n = await rows();
  for (const bad of [
    { balance: -1, start: 79 },
    { balance: 10, start: 0 },
    { balance: 'ten', start: 79 },
    { balance: '', start: 79 },
    { balance: 10 },
    { balance: 10, start: 79, at: 'yesterday-ish' },
    { balance: 10, start: 79, at: new Date(Date.now() + 86_400_000).toISOString() },
  ])
    await assert.rejects(calibrate(bad), { status: 400 });
  assert.equal(await rows(), n);
  await db.close();
});

test('uncalibrated: no tables yet, or no calibration row, gives no number', async () => {
  let db = await fresh({ schema: false });
  assert.deepEqual(await fuelStatus(), { calibrated: false, fraction: null });
  // Reading the gauge created nothing.
  assert.equal(
    (await query("SELECT count(*)::int AS n FROM pg_tables WHERE tablename LIKE 'dkla_%'"))[0].n,
    0,
  );
  await db.close();
  db = await fresh();
  await recordSpend({
    model: 'gpt-5.4-mini',
    input_tokens: 1,
    cached_tokens: 0,
    output_tokens: 1,
    searches: 0,
    usd: 1,
  });
  assert.deepEqual(await fuelStatus(), { calibrated: false, fraction: null });
  const shown = publicFuel(await fuelStatus(), new Date('2026-11-18T12:00:00Z'));
  assert.deepEqual(shown, { fraction: null, calibrated: false, updatedAt: '2026-11-18T12:00:00.000Z' });
  await db.close();
});

function call(handler, request) {
  const headers = {};
  let output;
  const res = {
    statusCode: 0,
    setHeader: (key, value) => (headers[key.toLowerCase()] = value),
    getHeader: (key) => headers[key.toLowerCase()],
    end: (value) => (output = value),
  };
  return Promise.resolve(handler({ headers: {}, ...request }, res)).then(() => ({
    status: res.statusCode,
    headers,
    body: output,
    json: output ? JSON.parse(output) : undefined,
  }));
}

test('GET /api/fuel: only the share left, cached 60 s, read-only, no dollars', async () => {
  const db = await fresh();
  await calibrate({ balance: 61.37, start: 79.13 });
  await recordSpend({
    model: 'gpt-5.4-mini',
    input_tokens: 0,
    cached_tokens: 0,
    output_tokens: 0,
    searches: 0,
    usd: 2.41,
  });
  const handler = makeFuelHandler();
  const reply = await call(handler, { method: 'GET', url: '/api/fuel?fraction=1&balance=1' });
  assert.equal(reply.status, 200);
  assert.deepEqual(Object.keys(reply.json).sort(), ['calibrated', 'fraction', 'updatedAt']);
  assert.equal(reply.json.calibrated, true);
  assert.equal(reply.json.fraction, Math.round(((61.37 - 2.41) / 79.13) * 1000) / 1000);
  assert.ok(!Number.isNaN(Date.parse(reply.json.updatedAt)));
  // No dollar figure in any form.
  for (const figure of ['$', 'usd', 'balance', '61.37', '79.13', '2.41', '58.96'])
    assert.ok(!reply.body.toLowerCase().includes(figure), `the reply mentions ${figure}`);
  assert.equal(reply.headers['vercel-cdn-cache-control'], 'max-age=60');
  assert.match(reply.headers['cache-control'], /public/);
  assert.equal(reply.headers['content-type'], 'application/json; charset=utf-8');
  // Anything but GET or HEAD is refused before any work; nothing was written by any of it.
  const count = async () =>
    (
      await query(
        'SELECT (SELECT count(*) FROM dkla_ask_spend) + (SELECT count(*) FROM dkla_ask_fuel_calibration) AS n',
      )
    )[0].n;
  const before = await count();
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    const refused = await call(handler, { method, url: '/api/fuel', body: { balance: 1000, start: 1 } });
    assert.equal(refused.status, 405);
    assert.equal(refused.headers.allow, 'GET, HEAD');
  }
  const head = await call(handler, { method: 'HEAD', url: '/api/fuel' });
  assert.equal(head.status, 200);
  assert.equal(head.body, undefined);
  assert.equal(await count(), before);
  // The endpoint never loads anything that can call OpenAI: every module it imports, followed through.
  const loaded = new Set();
  const walk = (url) => {
    if (loaded.has(url.href)) return;
    loaded.add(url.href);
    for (const [, from] of readFileSync(url, 'utf8').matchAll(/\bfrom\s+'(\.{1,2}\/[^']+)'/g))
      walk(new URL(from, url));
  };
  walk(new URL('../../api/fuel.js', import.meta.url));
  const names = [...loaded].map((href) => href.split('/').slice(-2).join('/'));
  assert.deepEqual(names.sort(), ['analytics/db.js', 'api/fuel.js', 'ask/fuel.js']);
  assert.ok(!/fetch\(/.test(readFileSync(new URL('../../lib/ask/fuel.js', import.meta.url), 'utf8')));
  await db.close();
});

test('GET /api/fuel: reads the database at most every 30 s per instance, and fails closed', async () => {
  let reads = 0,
    now = Date.parse('2026-11-18T12:00:00Z');
  const handler = makeFuelHandler(
    async () => (reads++, { calibrated: true, fraction: 0.42, balanceUsd: 33 }),
    () => new Date(now),
  );
  for (let i = 0; i < 20; i++)
    assert.equal((await call(handler, { method: 'GET', url: '/api/fuel?x=' + i })).json.fraction, 0.42);
  assert.equal(reads, 1);
  now += 31_000;
  await call(handler, { method: 'GET', url: '/api/fuel' });
  assert.equal(reads, 2);
  const warn = console.warn;
  console.warn = () => {};
  try {
    const failing = makeFuelHandler(async () => {
      throw Error('database down');
    });
    const reply = await call(failing, { method: 'GET', url: '/api/fuel' });
    assert.equal(reply.status, 503);
    assert.equal(reply.headers['cache-control'], 'no-store');
    assert.deepEqual(reply.json, { error: 'unavailable' });
  } finally {
    console.warn = warn;
  }
});

test('admin: calibration needs a signed-in owner and the CSRF token; the owner sees dollars', async () => {
  const db = await fresh();
  const base = { host: 'dkla.test', origin: 'https://dkla.test', 'user-agent': 'Mozilla/5.0 Chrome/130.0' };
  const request = (url, method, body, headers = {}) => ({
    url,
    method,
    headers: { ...base, ...headers },
    socket: { remoteAddress: '198.51.100.42' },
    body,
  });
  const denied = await call(
    adminHandler,
    request('/api/admin?action=fuel-calibrate', 'POST', { balance: 60, start: 79 }),
  );
  assert.equal(denied.status, 401);
  assert.equal((await call(adminHandler, request('/api/admin?action=fuel', 'GET'))).status, 401);
  const login = await call(
    adminHandler,
    request('/api/admin?action=login', 'POST', { password: process.env.ANALYTICS_ADMIN_PASSWORD }),
  );
  assert.equal(login.status, 200);
  const cookie = login.headers['set-cookie'].split(';')[0];
  const noCsrf = await call(
    adminHandler,
    request('/api/admin?action=fuel-calibrate', 'POST', { balance: 60, start: 79 }, { cookie }),
  );
  assert.equal(noCsrf.status, 403);
  const headers = { cookie, 'x-dkla-csrf': login.json.csrf };
  const bad = await call(
    adminHandler,
    request('/api/admin?action=fuel-calibrate', 'POST', { balance: -3, start: 79 }, headers),
  );
  assert.equal(bad.status, 400);
  assert.equal(bad.json.error, 'invalid-balance');
  const ok = await call(
    adminHandler,
    request(
      '/api/admin?action=fuel-calibrate',
      'POST',
      { balance: 60, start: 79, note: 'billing page' },
      headers,
    ),
  );
  assert.equal(ok.status, 200);
  assert.equal(ok.json.calibrated, true);
  assert.equal(ok.json.balanceUsd, 60);
  const shown = await call(adminHandler, request('/api/admin?action=fuel', 'GET', undefined, headers));
  assert.equal(shown.status, 200);
  assert.equal(shown.json.startingUsd, 79);
  assert.equal(shown.json.fraction, Math.round((60 / 79) * 1000) / 1000);
  await db.close();
});
