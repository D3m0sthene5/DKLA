import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { setTestDatabase, ready, query, transaction } from '../../lib/analytics/db.js';
import { sign, verify, policy, geography, ADMIN_COOKIE } from '../../lib/analytics/security.js';
import { metadata, batch, catalog } from '../../lib/analytics/validate.js';
import { mergeProfiles, undoMerge, deleteProfile } from '../../lib/analytics/identity.js';
import {
  suggestions,
  compactOldest,
  dataPage,
  locations,
  housekeeping,
} from '../../lib/analytics/reports.js';
import { networkFor } from '../../lib/analytics/network.js';
import analytics from '../../api/analytics.js';
import adminHandler from '../../api/admin.js';
import sync, { cleanRatings, merge } from '../../api/sync.js';
process.env.NODE_ENV = 'test';
process.env.ANALYTICS_SECRET = 'local-test-only-secret-'.repeat(3);
process.env.ANALYTICS_ADMIN_PASSWORD = 'local-test-password-only';
const db = new PGlite();
before(async () => {
  setTestDatabase(db);
  await ready();
});
beforeEach(async () => {
  const tables = await query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'dkla_%'",
  );
  await query('TRUNCATE ' + tables.map((t) => t.tablename).join(',') + ' CASCADE');
});
after(async () => db.close());
function req(action = 'bootstrap', body = {}, region = 'AK', extra = {}) {
  return {
    url: '/api/analytics?action=' + action,
    method: 'POST',
    headers: {
      host: 'dkla.test',
      origin: 'https://dkla.test',
      'user-agent': 'Mozilla/5.0 Chrome/130.0',
      'x-vercel-ip-country': 'US',
      'x-vercel-ip-country-region': region,
      'x-vercel-ip-city': 'Anchorage',
      ...(body.token ? { cookie: '__Host-dkla_visitor=' + body.token } : {}),
      ...extra,
    },
    socket: { remoteAddress: '198.51.100.42' },
    body,
  };
}
async function call(handler, request) {
  const headers = {};
  let output;
  const res = {
    setHeader: (k, v) => (headers[k.toLowerCase()] = v),
    getHeader: (k) => headers[k.toLowerCase()],
    end: (value) => (output = value),
    statusCode: 0,
  };
  await handler(request, res);
  let data;
  try {
    data = JSON.parse(output);
  } catch {
    data = output;
  }
  return { status: res.statusCode, data, headers };
}
async function visitor(region = 'AK', token = '') {
  const out = await call(
    analytics,
    req(
      'bootstrap',
      {
        token,
        metadata: {
          browser: 'Safari',
          browserVersion: '18',
          os: 'macOS',
          osVersion: '15',
          screenWidth: 1440,
          screenHeight: 900,
          viewportWidth: 1440,
          viewportHeight: 900,
          timezone: 'America/Anchorage',
          language: 'en-US',
        },
      },
      region,
    ),
  );
  assert.equal(out.status, 200);
  const proof = out.headers['set-cookie'].split(';')[0].split('=')[1];
  assert.equal(out.data.token, undefined);
  return { token: proof, id: verify(proof, 'visitor').id, headers: out.headers };
}
function payload(token, entity = 'hamer') {
  const start = new Date(Date.now() - 600000).toISOString(),
    end = new Date().toISOString();
  return {
    token,
    batchId: randomUUID(),
    session: {
      id: randomUUID(),
      startedAt: start,
      endedAt: end,
      activeSeconds: 300,
      activeNow: true,
      build: 'v2.5',
      metadata: { browser: 'Safari', timezone: 'America/Anchorage' },
    },
    events: [
      { id: randomUUID(), at: start, kind: 'entry_open', entity, details: {} },
      { id: randomUUID(), at: end, kind: 'entry_close', entity, activeSeconds: 260, details: { depth: 90 } },
      {
        id: randomUUID(),
        at: end,
        kind: 'search',
        details: {
          query: 'consideration',
          results: 0,
          notes: 'do not collect',
          copiedText: 'do not collect',
          code: 'AAAA-BBBB-CCCC',
        },
      },
    ],
  };
}

for (const authenticated of [true, false])
  test(`Atlas logo entry requires a fresh password with ${authenticated ? 'an existing' : 'no'} admin session`, async () => {
    const elements = new Map(),
      calls = [],
      replacements = [],
      listeners = new Map();
    const element = (id) => {
      if (!elements.has(id))
        elements.set(id, { hidden: id === 'dashboard', disabled: false, addEventListener() {} });
      return elements.get(id);
    };
    runInNewContext(readFileSync(new URL('../../assets/admin/app.js', import.meta.url), 'utf8'), {
      window: { DKLA_CATALOG: { nodes: [], regions: [] } },
      location: { href: 'https://dkla.test/admin?reauth=1#visitors', hash: '#visitors' },
      history: { replaceState: (_state, _title, path) => replacements.push(path) },
      URL,
      URLSearchParams,
      document: {
        getElementById: element,
        querySelector: () => element('submit'),
        addEventListener: (type, callback) => listeners.set(type, callback),
        visibilityState: 'visible',
      },
      addEventListener() {},
      setInterval() {
        return 1;
      },
      clearInterval() {},
      fetch: async (url, options) => {
        calls.push({ url, options });
        const action = new URL(url, 'https://dkla.test').searchParams.get('action');
        // A tab becoming visible while reauthentication is pending must not read
        // any private reports using the still-valid old session.
        if (action === 'status') listeners.get('visibilitychange')();
        const ok = action === 'logout' || authenticated;
        return {
          ok,
          status: ok ? 200 : 401,
          json: async () => (ok ? { csrf: 'test-csrf', ok: true } : { error: 'unauthorized' }),
        };
      },
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(
      calls.map((c) => new URL(c.url, 'https://dkla.test').searchParams.get('action')),
      authenticated ? ['status', 'logout'] : ['status'],
    );
    if (authenticated) {
      assert.equal(calls[1].options.method, 'POST');
      assert.equal(calls[1].options.headers['x-dkla-csrf'], 'test-csrf');
    }
    assert.equal(element('login').hidden, false);
    assert.equal(element('dashboard').hidden, true);
    assert.equal(element('submit').disabled, false);
    assert.deepEqual(replacements, ['/admin#visitors']);
  });

test('coordinates come from trusted runtime headers, are rounded, and reject missing or invalid pairs', () => {
  const request = req('', {}, 'NY', {
    'x-vercel-ip-latitude': '40.7128',
    'x-vercel-ip-longitude': '-74.0060',
  });
  assert.equal(geography(request).latitude, 40.71);
  assert.equal(geography(request).longitude, -74.01);
  for (const value of ['', 'NaN', 'Infinity', '91', '0x40', '40,41', '40junk']) {
    request.headers['x-vercel-ip-latitude'] = value;
    assert.equal(geography(request).latitude, null);
    assert.equal(geography(request).longitude, null);
  }
  request.headers['x-vercel-ip-latitude'] = '0';
  request.headers['x-vercel-ip-longitude'] = '0';
  assert.equal(geography(request).latitude, 0);
  const env = process.env.NODE_ENV,
    vercel = process.env.VERCEL;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.VERCEL;
    assert.equal(geography(request).latitude, null);
    assert.equal(geography(request).country, '');
  } finally {
    process.env.NODE_ENV = env;
    if (vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = vercel;
  }
});
test('ingestion stores approximate server coordinates and leaves historical sessions without them', async () => {
  const v = await visitor(),
    input = payload(v.token);
  input.session.latitude = 1;
  input.session.longitude = 1;
  await call(
    analytics,
    req('ingest', input, 'AK', { 'x-vercel-ip-latitude': '61.2181', 'x-vercel-ip-longitude': '-149.9003' }),
  );
  const [session] = await query('SELECT latitude,longitude FROM dkla_sessions');
  assert.equal(session.latitude, 61.22);
  assert.equal(session.longitude, -149.9);
  const legacy = payload(v.token);
  await call(analytics, req('ingest', legacy));
  assert.equal(
    (await query('SELECT latitude FROM dkla_sessions WHERE id=$1', [legacy.session.id]))[0].latitude,
    null,
  );
  // An offline retry cannot overwrite the session's original observed coordinates.
  await call(
    analytics,
    req('ingest', input, 'AK', { 'x-vercel-ip-latitude': '60', 'x-vercel-ip-longitude': '-150' }),
  );
  assert.equal(
    (await query('SELECT latitude FROM dkla_sessions WHERE id=$1', [input.session.id]))[0].latitude,
    61.22,
  );
});
test('coordinate migration is idempotent and preserves existing session data', async () => {
  const v = await visitor(),
    input = payload(v.token);
  await call(analytics, req('ingest', input));
  // Rerun exactly the initializer used by a fresh function instance.
  setTestDatabase(db);
  await ready();
  const [session] = await query(
    'SELECT ip,active_seconds,latitude,longitude FROM dkla_sessions WHERE id=$1',
    [input.session.id],
  );
  assert.equal(session.ip, '198.51.100.42');
  assert.equal(session.active_seconds, 300);
  assert.equal(session.latitude, null);
  assert.equal(session.longitude, null);
});
test('location report counts every profile once across session pages, linked devices and packed courses', async () => {
  const ids = [];
  const now = Date.now(),
    start = new Date(now - 3600000).toISOString();
  async function session(profile, country, region, latitude, longitude, at = start, course = 'Contracts') {
    const id = randomUUID();
    await query(
      "INSERT INTO dkla_sessions(id,device_id,started_at,ended_at,country,region,city,latitude,longitude,tier,compacted,summary) VALUES($1,$2,$3,$3,$4,$5,$6,$7,$8,'full',true,$9::jsonb)",
      [
        id,
        profile,
        at,
        country,
        region,
        region === 'AK' ? 'Anchorage' : 'New York',
        latitude,
        longitude,
        JSON.stringify({
          events: [
            {
              id: randomUUID(),
              at,
              kind: 'entry_open',
              entity: 'hamer',
              course,
              region_id: '',
              active_seconds: 0,
              details: {},
            },
          ],
        }),
      ],
    );
  }
  for (let i = 0; i < 55; i++) {
    const v = await visitor();
    ids.push(v.id);
    await session(v.id, 'US', 'NY', 40.71, -74.01);
    // Multiple same-profile visits do not increase distinct visitor counts.
    if (i === 0) await session(v.id, 'US', 'NY', 40.71, -74.01);
  }
  const linked = await visitor();
  await mergeProfiles(linked.id, ids[0]);
  await session(linked.id, 'US', 'AK', 61.22, -149.9, new Date(now - 1800000).toISOString());
  const foreign = await visitor();
  await session(foreign.id, 'JP', '13', 35.68, 139.69);
  const unknown = await visitor();
  await session(unknown.id, 'US', 'NY', 40.71, -74.01);
  await session(unknown.id, 'US', 'NY', null, null, new Date(now - 1000000).toISOString());
  const hawaii = await visitor();
  await session(hawaii.id, 'US', 'HI', 21.31, -157.86);
  const unrelated = await visitor();
  await session(unrelated.id, 'US', 'CA', 38.58, -121.49, start, 'Civil Procedure');
  const params = new URLSearchParams({
    start: new Date(now - 7200000).toISOString(),
    end: new Date(now + 1000).toISOString(),
    course: 'Contracts',
  });
  const report = await locations(params);
  assert.equal(report.summary.total, 58);
  assert.equal(report.summary.us, 56);
  assert.equal(report.summary.foreign, 1);
  assert.equal(report.summary.unavailable, 1);
  assert.equal(report.points.find((p) => p.region === 'NY').users, 54);
  assert.equal(report.points.find((p) => p.region === 'AK').users, 1);
  assert.equal(report.points.find((p) => p.region === 'HI').area, 'hawaii');
  params.set('start', new Date(now + 100).toISOString());
  assert.equal((await locations(params)).summary.total, 0);
});
test('location endpoint requires an admin session and rejects invalid date or course filters', async () => {
  const request = { ...req(), url: '/api/admin?action=locations', method: 'GET' };
  assert.equal((await call(adminHandler, request)).status, 401);
  const login = await call(adminHandler, {
    ...req('', { password: process.env.ANALYTICS_ADMIN_PASSWORD }),
    url: '/api/admin?action=login',
  });
  request.headers.cookie = login.headers['set-cookie'].split(';')[0];
  const response = await call(adminHandler, request);
  assert.equal(response.status, 200);
  assert.equal(response.headers['cache-control'], 'private, no-store, max-age=0');
  assert.equal(response.data.points.length, 0);
  request.url = '/api/admin?action=locations&start=invalid';
  assert.equal((await call(adminHandler, request)).status, 400);
  request.url = '/api/admin?action=locations&course=unknown';
  assert.equal((await call(adminHandler, request)).status, 400);
});
test('Census map includes 50 states and DC, places AK/HI in insets, and escapes location labels', () => {
  const context = { window: {} };
  for (const name of ['us-projection', 'us-boundaries', 'us-map'])
    runInNewContext(
      readFileSync(new URL('../../assets/admin/' + name + '.js', import.meta.url), 'utf8'),
      context,
    );
  const { states } = context.window.DKLA_US_BOUNDARIES,
    project = context.window.DKLA_US_PROJECTION.project;
  assert.equal(states.length, 51);
  assert.equal(new Set(states.map((s) => s.code)).size, 51);
  const ny = project(-74.01, 40.71),
    ak = project(-149.9, 61.22, 'alaska'),
    hi = project(-157.86, 21.31, 'hawaii');
  assert.ok(ny[0] > 650 && ny[1] < 230);
  assert.ok(ak[0] < 240 && ak[1] > 400 && ak[1] < 500);
  assert.ok(hi[0] > 247 && hi[0] < 425 && hi[1] > 400);
  const html = context.window.DKLA_LOCATION_MAP.markup({
    summary: { us: 2, foreign: 0, unavailable: 1 },
    points: [
      {
        city: '<img src=x onerror=alert(1)>',
        region: 'NY',
        latitude: 40.71,
        longitude: -74.01,
        area: 'main',
        users: 2,
      },
    ],
    anonymousVisits: 0,
  });
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
  assert.equal((html.match(/class="us-location-dot"/g) || []).length, 1);
  const empty = context.window.DKLA_LOCATION_MAP.markup({
    summary: { us: 0, foreign: 0, unavailable: 2 },
    points: [],
    anonymousVisits: 0,
  });
  assert.ok(!empty.includes('class="us-location-dot"'));
  assert.ok(empty.includes('No US coordinates'));
});
test('region policy: California is full with scoring off; unknown is full; EEA/UK are reduced', () => {
  assert.deepEqual([policy(req('', {}, 'CA')).tier, policy(req('', {}, 'CA')).scoring], ['full', false]);
  const unknown = req();
  delete unknown.headers['x-vercel-ip-country'];
  assert.equal(policy(unknown).tier, 'full');
  assert.equal(policy(unknown).geo.missing, true);
  assert.equal(policy(req('', {}, '', { 'x-vercel-ip-country': 'DE' })).tier, 'reduced');
  assert.equal(policy(req('', {}, '', { 'x-vercel-ip-country': 'GB' })).tier, 'reduced');
});
test('signed proofs reject tampering, expired proofs, and wrong token purpose', () => {
  const id = randomUUID(),
    proof = sign('visitor', id, 60);
  assert.equal(verify(proof, 'visitor').id, id);
  assert.equal(verify(proof + 'x', 'visitor'), null);
  assert.equal(verify(proof, 'admin'), null);
  assert.equal(verify(sign('visitor', id, -10), 'visitor'), null);
});
test('the existing signed cookie preserves browser continuity without a body token', async () => {
  const a = await visitor();
  assert.match(a.headers['set-cookie'], /HttpOnly; Secure; SameSite=Lax/);
  assert.match(a.headers['set-cookie'], /Max-Age=31622400/);
  const out = await call(
    analytics,
    req('bootstrap', { metadata: {} }, 'AK', { cookie: '__Host-dkla_visitor=' + a.token }),
  );
  assert.equal(out.status, 200);
  assert.equal(out.data.token, undefined);
  const proof = out.headers['set-cookie'].split(';')[0].split('=')[1];
  assert.equal(verify(proof, 'visitor').id, a.id);
  assert.equal((await query('SELECT * FROM dkla_devices')).length, 1);
});
test('cookie deletion creates a new browser and ignores every old recovery proof', async () => {
  const a = await visitor();
  const out = await call(
    analytics,
    req('bootstrap', { token: a.token, recoveryTokens: [a.token], metadata: {} }, 'AK', { cookie: '' }),
  );
  assert.equal(out.status, 200);
  const proof = out.headers['set-cookie'].split(';')[0].split('=')[1];
  assert.notEqual(verify(proof, 'visitor').id, a.id);
  assert.equal((await query('SELECT * FROM dkla_devices')).length, 2);
  const denied = await call(analytics, req('ingest', payload(a.token), 'AK', { cookie: '' }));
  assert.equal(denied.status, 401);
  assert.equal((await query('SELECT * FROM dkla_sessions')).length, 0);
});
test('a valid cookie wins over an obsolete conflicting body token', async () => {
  const a = await visitor(),
    b = await visitor();
  const out = await call(
    analytics,
    req('bootstrap', { token: b.token, recoveryTokens: [b.token], metadata: {} }, 'AK', {
      cookie: '__Host-dkla_visitor=' + a.token,
    }),
  );
  const proof = out.headers['set-cookie'].split(';')[0].split('=')[1];
  assert.equal(verify(proof, 'visitor').id, a.id);
});
test('ingest retains raw session IP and metadata, rejects unwanted fields, and deduplicates events', async () => {
  const a = await visitor(),
    input = payload(a.token);
  const first = await call(analytics, req('ingest', input));
  assert.equal(first.status, 200);
  assert.equal((await call(analytics, req('ingest', input))).status, 200);
  const [session] = await query('SELECT * FROM dkla_sessions');
  assert.equal(session.ip, '198.51.100.42');
  assert.equal(session.active_seconds, 300);
  assert.equal(session.active_now, true);
  const events = await query('SELECT * FROM dkla_events');
  assert.equal(events.length, 3);
  assert.ok(!JSON.stringify(events).includes('do not collect'));
  assert.ok(!JSON.stringify(events).includes('AAAA-BBBB-CCCC'));
});
test('foreign origins, malformed batches, unknown event kinds and bots are rejected or suppressed', async () => {
  const a = await visitor();
  assert.equal(
    (await call(analytics, req('ingest', payload(a.token), 'AK', { origin: 'https://elsewhere.test' })))
      .status,
    403,
  );
  const bad = payload(a.token);
  bad.events[0].kind = 'notes';
  assert.equal((await call(analytics, req('ingest', bad))).status, 400);
  assert.equal(
    (await call(analytics, req('ingest', payload(a.token), 'AK', { 'user-agent': 'Googlebot' }))).data.tier,
    'none',
  );
  assert.equal((await query('SELECT * FROM dkla_sessions')).length, 0);
});
test('a visitor cannot append events to another device’s session', async () => {
  const a = await visitor(),
    b = await visitor(),
    input = payload(a.token);
  await call(analytics, req('ingest', input));
  input.token = b.token;
  input.events[0].id = randomUUID();
  assert.equal((await call(analytics, req('ingest', input))).status, 409);
  assert.equal((await query('SELECT * FROM dkla_events')).length, 3);
});
test('reduced collection stores anonymous totals without cookies, profiles, IPs or search text', async () => {
  const request = req('bootstrap', {}, '', { 'x-vercel-ip-country': 'DE' }),
    out = await call(analytics, request);
  assert.equal(out.data.tier, 'reduced');
  assert.ok(!out.headers['set-cookie']);
  const input = payload('');
  input.visit = true;
  assert.equal(
    (await call(analytics, req('ingest', input, '', { 'x-vercel-ip-country': 'DE' }))).status,
    200,
  );
  await call(analytics, req('ingest', input, '', { 'x-vercel-ip-country': 'DE' }));
  assert.equal((await query('SELECT * FROM dkla_devices')).length, 0);
  assert.equal((await query('SELECT * FROM dkla_sessions')).length, 0);
  assert.equal(
    (await query('SELECT sum(visits)::int AS visits,sum(opens)::int AS opens FROM dkla_anonymous_totals'))[0]
      .visits,
    1,
  );
  assert.equal((await query('SELECT sum(opens)::int AS opens FROM dkla_anonymous_totals'))[0].opens, 1);
});
test('similar browser and network metadata never suggests or creates identity links', async () => {
  const a = await visitor(),
    b = await visitor();
  await call(analytics, req('ingest', payload(a.token)));
  await call(analytics, req('ingest', payload(b.token)));
  assert.deepEqual(await suggestions(), []);
  assert.equal(policy(req()).scoring, false);
  const devices = await query('SELECT profile_id FROM dkla_devices');
  assert.notEqual(devices[0].profile_id, devices[1].profile_id);
  assert.equal((await query('SELECT * FROM dkla_merges')).length, 0);
  assert.equal((await query('SELECT * FROM dkla_sync_links')).length, 0);
});
test('manual merge is reversible while original session device ids are retained', async () => {
  const a = await visitor(),
    b = await visitor();
  const input = payload(a.token);
  await call(analytics, req('ingest', input));
  const id = await mergeProfiles(a.id, b.id);
  assert.equal((await query('SELECT profile_id FROM dkla_devices WHERE id=$1', [a.id]))[0].profile_id, b.id);
  assert.equal((await query('SELECT device_id FROM dkla_sessions'))[0].device_id, a.id);
  await undoMerge(id);
  assert.equal((await query('SELECT profile_id FROM dkla_devices WHERE id=$1', [a.id]))[0].profile_id, a.id);
});
test('cookie recognition retains historical combined records without creating new links', async () => {
  const a = await visitor(),
    b = await visitor();
  const input = payload(a.token);
  await call(analytics, req('ingest', input));
  const prior = await mergeProfiles(a.id, b.id);
  await visitor('AK', a.token);
  const [device] = await query('SELECT profile_id FROM dkla_devices WHERE id=$1', [a.id]);
  assert.equal(device.profile_id, b.id);
  const merges = await query('SELECT id FROM dkla_merges');
  assert.deepEqual(
    merges.map((m) => m.id),
    [prior],
  );
  assert.equal((await query('SELECT * FROM dkla_sessions')).length, 1);
  assert.equal((await query('SELECT * FROM dkla_events')).length, 3);
});
test('authenticated dashboard refuses new browser merges but still serves private reports', async () => {
  const a = await visitor(),
    b = await visitor();
  await call(analytics, req('ingest', payload(a.token)));
  const login = await call(adminHandler, {
    ...req('', { password: process.env.ANALYTICS_ADMIN_PASSWORD }),
    url: '/api/admin?action=login',
  });
  const headers = {
    ...req().headers,
    cookie: login.headers['set-cookie'].split(';')[0],
    'x-dkla-csrf': login.data.csrf,
  };
  const denied = await call(adminHandler, {
    ...req('', { source: a.id, target: b.id }),
    url: '/api/admin?action=merge',
    headers,
  });
  assert.equal(denied.status, 410);
  const data = await call(adminHandler, { ...req(), url: '/api/admin?action=data', method: 'GET', headers });
  assert.equal(data.status, 200);
  assert.equal(data.data.sessions[0].ip, '198.51.100.42');
  assert.equal(data.data.sessions[0].active_seconds, 300);
  assert.equal(data.data.sessions[0].metadata.browser, 'Safari');
  assert.equal((await query('SELECT * FROM dkla_merges')).length, 0);
});
test('unconfigured or unauthenticated admin APIs are private, and authenticated mutations require CSRF', async () => {
  const request = req();
  request.url = '/api/admin?action=data';
  request.method = 'GET';
  const denied = await call(adminHandler, request);
  assert.equal(denied.status, 401);
  assert.match(denied.headers['cache-control'], /no-store/);
  const login = await call(adminHandler, {
    ...req('', { password: process.env.ANALYTICS_ADMIN_PASSWORD }),
    url: '/api/admin?action=login',
  });
  assert.equal(login.status, 200);
  const cookie = login.headers['set-cookie'].split(';')[0];
  const a = await visitor();
  const change = {
    ...req('', { id: a.id, label: 'Classmate' }),
    url: '/api/admin?action=label',
    headers: { ...req().headers, cookie },
  };
  assert.equal((await call(adminHandler, change)).status, 403);
  change.headers['x-dkla-csrf'] = login.data.csrf;
  assert.equal((await call(adminHandler, change)).status, 200);
  assert.equal((await query('SELECT label FROM dkla_profiles WHERE id=$1', [a.id]))[0].label, 'Classmate');
  const logout = await call(adminHandler, { ...change, url: '/api/admin?action=logout', body: {} });
  assert.equal(logout.status, 200);
  assert.equal(
    (await call(adminHandler, { ...change, method: 'GET', url: '/api/admin?action=data' })).status,
    401,
  );
});
test('login is rate limited and password failures never disclose the password', async () => {
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await call(adminHandler, { ...req('', { password: 'bad' }), url: '/api/admin?action=login' })).status,
      401,
    );
  const out = await call(adminHandler, { ...req('', { password: 'bad' }), url: '/api/admin?action=login' });
  assert.equal(out.status, 429);
  assert.ok(!JSON.stringify(out.data).includes('password:'));
});
test('privacy form creates a linked dashboard request without requiring email', async () => {
  const a = await visitor();
  const out = await call(
    analytics,
    req('request', { request: 'Please delete my records.' }, 'AK', {
      cookie: '__Host-dkla_visitor=' + a.token,
    }),
  );
  assert.equal(out.status, 201);
  const [r] = await query('SELECT * FROM dkla_privacy_requests');
  assert.equal(r.device_id, a.id);
  assert.equal(r.request, 'Please delete my records.');
});
test('watched returns generate a single alert on retry', async () => {
  const a = await visitor();
  await query("UPDATE dkla_profiles SET watched=true,last_seen=now()-interval '1 hour' WHERE id=$1", [a.id]);
  const input = payload(a.token);
  await call(analytics, req('ingest', input));
  await call(analytics, req('ingest', input));
  assert.equal((await query('SELECT * FROM dkla_alerts')).length, 1);
});
test('packing old sessions preserves semantic paths for replay and exports; bookkeeping expiry does not delete detail', async () => {
  const a = await visitor(),
    input = payload(a.token);
  await call(analytics, req('ingest', input));
  await query("UPDATE dkla_sessions SET received_at=now()-interval '2 days'");
  await housekeeping();
  assert.equal((await query('SELECT * FROM dkla_events')).length, 3);
  const result = await compactOldest();
  assert.equal(result.sessions, 1);
  assert.equal((await query('SELECT * FROM dkla_events')).length, 0);
  const data = await dataPage(new URLSearchParams());
  assert.equal(data.sessions[0].summary.events.length, 3);
  assert.equal(data.sessions[0].summary.events[0].entity, 'hamer');
});
test('a late offline batch restores packed events before adding new events', async () => {
  const a = await visitor(),
    input = payload(a.token);
  await call(analytics, req('ingest', input));
  await query("UPDATE dkla_sessions SET received_at=now()-interval '2 days'");
  await compactOldest();
  input.events = [
    {
      id: randomUUID(),
      at: input.session.endedAt,
      kind: 'copy',
      entity: 'hamer',
      details: { length: 123, section: 'reasoning' },
    },
  ];
  assert.equal((await call(analytics, req('ingest', input))).status, 200);
  assert.equal((await query('SELECT * FROM dkla_events')).length, 4);
  assert.equal((await query('SELECT compacted FROM dkla_sessions'))[0].compacted, false);
  assert.equal((await query('SELECT * FROM dkla_all_events')).length, 4);
});
test('deleting a profile removes its data and invalidates recovery; a new visit gets a new identity', async () => {
  const a = await visitor(),
    input = payload(a.token);
  await call(analytics, req('ingest', input));
  await deleteProfile(a.id);
  assert.equal((await query('SELECT * FROM dkla_sessions')).length, 0);
  assert.equal((await query('SELECT * FROM dkla_events')).length, 0);
  const fresh = await visitor('AK', a.token);
  assert.notEqual(fresh.id, a.id);
});
test('deletion removes merged aliases too, without removing a separate profile', async () => {
  const a = await visitor(),
    b = await visitor(),
    c = await visitor(),
    separate = await visitor();
  await mergeProfiles(a.id, b.id);
  await mergeProfiles(b.id, c.id);
  await deleteProfile(c.id);
  const profiles = await query('SELECT id FROM dkla_profiles');
  assert.deepEqual(
    profiles.map((p) => p.id),
    [separate.id],
  );
  assert.equal((await query('SELECT * FROM dkla_merges')).length, 0);
});
test('raw credentials are removed from URL metadata and oversized times are rejected', () => {
  const m = metadata({
    referrer: 'https://example.com/page?code=AAAA-BBBB-CCCC&token=secret&utm_source=course#AAAA-BBBB-CCCC',
    notes: 'private',
    timezone: 'invalid-zone',
  });
  assert.ok(!JSON.stringify(m).includes('AAAA-BBBB-CCCC'));
  assert.ok(!JSON.stringify(m).includes('secret'));
  assert.equal(m.timezone, '');
  assert.ok(!('notes' in m));
  const p = payload('');
  p.session.endedAt = '2099-01-01T00:00:00Z';
  assert.throws(() => batch(p));
});
test('ratings keep newer values without prototype pollution; legacy GET is rejected before Blob access', async () => {
  const old = { hamer: { r: 1, t: 100, n: 1 } },
    newer = { hamer: { r: 3, t: 200, n: 2 } };
  assert.equal(merge(old, newer).hamer.r, 3);
  assert.equal(Object.getPrototypeOf(cleanRatings(JSON.parse('{"__proto__":{"r":1,"t":100}}'))), null);
  assert.equal(
    (await call(sync, { ...req(), method: 'GET', url: '/api/sync?code=AAAA-BBBB-CCCC' })).status,
    410,
  );
});
test('current catalogue retains distinct responsive geometry; network lookup never calls a remote IP service', () => {
  assert.notEqual(catalog.layouts.wide.homes.hamer.y, catalog.layouts.tall.homes.hamer.y);
  assert.equal(networkFor('198.51.100.42').asn, '');
});
test('feature dwell intervals retain fractions on delivery and split when foreground views change', () => {
  const window = {},
    out = [];
  runInNewContext(
    readFileSync(new URL('../../src/features/analytics/attention.js', import.meta.url), 'utf8'),
    { window },
  );
  const dwell = new window.DKLAFeatureAttention((kind, entity, details, seconds) =>
    out.push({ kind, entity, details, seconds }),
  );
  const view = { kind: 'cold_call', entity: 'hamer', details: { feature: 'coldCallDialog' } };
  dwell.set('reader', view);
  dwell.tick(1.4);
  dwell.flush();
  dwell.set('reader', { ...view });
  dwell.tick(0.7);
  dwell.flush();
  assert.deepEqual(
    out.map((e) => e.seconds),
    [1, 1],
  );
  assert.equal(out[0].details.action, 'attention');
  dwell.tick(2);
  dwell.set('reader', { kind: 'source_open', entity: 'hamer', details: { source: 'contracts-selections' } });
  dwell.tick(3);
  dwell.set('reader', null);
  dwell.tick(50);
  dwell.flush();
  assert.deepEqual(
    out.map((e) => [e.kind, e.seconds]),
    [
      ['cold_call', 1],
      ['cold_call', 1],
      ['cold_call', 2],
      ['source_open', 3],
    ],
  );
});
test('supporting Cold Call ids canonicalize and authority metadata is retained without rejecting text feature names', async () => {
  const a = await visitor(),
    input = payload(a.token, 'brief-CP-010'),
    authority = catalog.nodes.find((n) => n.id.startsWith('authority:'));
  assert.ok(authority);
  input.events.push(
    { id: randomUUID(), at: input.session.endedAt, kind: 'entry_open', entity: authority.id, details: {} },
    {
      id: randomUUID(),
      at: input.session.endedAt,
      kind: 'dictionary',
      entity: '',
      activeSeconds: 15,
      details: { feature: 'standard of review', action: 'attention' },
    },
  );
  assert.equal((await call(analytics, req('ingest', input))).status, 200);
  const rows = await query('SELECT entity,course,details FROM dkla_events ORDER BY kind');
  assert.equal(rows.filter((e) => e.entity === 'CP-010').length, 2);
  assert.ok(rows.some((e) => e.entity === authority.id && e.course === authority.course));
  assert.ok(rows.some((e) => e.details.feature === 'standard of review'));
});
