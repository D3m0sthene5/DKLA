import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { runInNewContext } from 'node:vm';

const tracker = readFileSync(new URL('./tracker.js', import.meta.url), 'utf8');
const attention = readFileSync(new URL('./attention.js', import.meta.url), 'utf8');
const settle = async () => {
  for (let i = 0; i < 8; i++) await new Promise((resolve) => setImmediate(resolve));
};
async function browser(options = {}) {
  const calls = [],
    listeners = new Map();
  let storageTouches = 0,
    recognition = true,
    unauthorized = 0;
  const location = new URL(
    options.preview ? 'https://fictional-preview.vercel.app/' : 'https://www.dannykind.wiki/',
  );
  const window = {
    fetch: async (url, opts = {}) => {
      const input = opts.body ? JSON.parse(opts.body) : {};
      calls.push({ url: String(url), input, opts });
      if (String(url).includes('action=policy'))
        return { ok: true, status: 200, json: async () => ({ tier: 'full' }) };
      if (String(url).includes('action=bootstrap')) {
        const recognized = options.cookieJar ? Boolean(options.cookieJar.current) : recognition;
        if (options.cookieJar && !options.cookieJar.current) options.cookieJar.current = randomUUID();
        return { ok: true, status: 200, json: async () => ({ tier: 'full', recognized, scoring: false }) };
      }
      if (String(url) === '/api/analytics' && unauthorized > 0) {
        unauthorized--;
        return { ok: false, status: 401, json: async () => ({ error: 'bootstrap-required' }) };
      }
      if (String(url) === '/api/analytics' && options.cookieJar) {
        const jar = options.cookieJar,
          owner = jar.sessions.get(input.session.id);
        if (!jar.current)
          return { ok: false, status: 401, json: async () => ({ error: 'bootstrap-required' }) };
        if (owner && owner !== jar.current)
          return { ok: false, status: 409, json: async () => ({ error: 'session-owner-conflict' }) };
        jar.sessions.set(input.session.id, jar.current);
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ tier: 'full', accepted: input.events?.length || 0 }),
      };
    },
  };
  const context = {
    window,
    location,
    URL,
    URLSearchParams,
    Date,
    Intl,
    Map,
    Set,
    Promise,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    crypto: { randomUUID },
    navigator: {
      userAgent: 'Mozilla/5.0 Chrome/130.0',
      platform: 'test',
      language: 'en-US',
      onLine: true,
      maxTouchPoints: 0,
      sendBeacon: (url, payload) => {
        calls.push({ url, beacon: payload });
        return true;
      },
    },
    document: {
      visibilityState: 'visible',
      activeElement: null,
      referrer: '',
      addEventListener: (name, fn) => listeners.set(name, fn),
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    addEventListener: (name, fn) => listeners.set(name, fn),
    setInterval: () => 1,
    clearInterval() {},
    setTimeout: () => 1,
    clearTimeout() {},
    innerWidth: 1200,
    innerHeight: 800,
    screen: { width: 1200, height: 800 },
    devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }),
    Blob,
    Response,
    Element: class {},
    HTMLImageElement: class {},
    getSelection: () => null,
  };
  for (const name of ['localStorage', 'indexedDB', 'caches'])
    Object.defineProperty(context, name, {
      get() {
        storageTouches++;
        throw Error('Persistent analytics storage forbidden');
      },
    });
  runInNewContext(attention, context);
  runInNewContext(tracker, context);
  await window.DKLAAnalytics.ready;
  await settle();
  return {
    window,
    calls,
    listeners,
    storageTouches: () => storageTouches,
    setRecognition: (value) => {
      recognition = value;
    },
    rejectNext: (count) => {
      unauthorized = count;
    },
  };
}

test('tracker uses cookie credentials without persistent identity stores or body proofs', async () => {
  const b = await browser();
  await b.window.DKLAAnalytics.flush();
  await settle();
  assert.equal(b.storageTouches(), 0);
  assert.ok(b.calls.some((c) => c.url.includes('action=bootstrap')));
  assert.ok(b.calls.some((c) => c.url === '/api/analytics' && c.input.session));
  for (const c of b.calls) {
    assert.ok(!('token' in c.input));
    assert.ok(!('recoveryTokens' in c.input));
    assert.ok(!('analyticsToken' in c.input));
    assert.equal(c.opts.credentials, 'same-origin');
  }
  await b.window.fetch('/api/sync?code=TEST-ONLY-0000');
  const sync = b.calls.at(-1);
  assert.equal(sync.url, '/api/sync');
  assert.equal(sync.input.action, 'read');
  assert.equal(sync.input.code, 'TEST-ONLY-0000');
  assert.ok(!('analyticsToken' in sync.input));
});

test('preview collector touches neither storage nor collection endpoints', async () => {
  const b = await browser({ preview: true });
  await b.window.DKLAAnalytics.flush();
  assert.equal(b.storageTouches(), 0);
  assert.equal(b.calls.length, 0);
});

test('cookie loss during an open page drops its old pending session before reconnecting', async () => {
  const b = await browser(),
    before = b.calls.filter((c) => c.input.session).at(-1).input.session.id;
  b.rejectNext(1);
  b.setRecognition(false);
  await b.window.DKLAAnalytics.flush();
  await settle();
  await b.window.DKLAAnalytics.flush();
  await settle();
  const after = b.calls.filter((c) => c.input.session).at(-1).input.session.id;
  assert.notEqual(after, before);
  assert.equal(b.storageTouches(), 0);
});

test('reconnection after cookie deletion does not attach the old session to a new browser', async () => {
  const b = await browser(),
    before = b.calls.filter((c) => c.input.session).at(-1).input.session.id;
  b.setRecognition(false);
  await b.listeners.get('online')();
  await settle();
  const after = b.calls.filter((c) => c.input.session).at(-1).input.session.id;
  assert.notEqual(after, before);
});

test('blocked cookies stop repeated bootstrap attempts after a bounded retry', async () => {
  const b = await browser();
  b.rejectNext(10);
  await b.window.DKLAAnalytics.flush();
  await settle();
  await b.window.DKLAAnalytics.flush();
  await settle();
  const count = b.calls.length;
  await b.window.DKLAAnalytics.flush();
  await settle();
  assert.equal(b.calls.length, count);
});

test('another tab replacing a deleted cookie recovers from 409 without relinking its old session', async () => {
  const jar = { current: null, sessions: new Map() },
    tabA = await browser({ cookieJar: jar });
  const oldBrowser = jar.current,
    oldSession = tabA.calls.filter((c) => c.input.session).at(-1).input.session.id;
  jar.current = null;
  const tabB = await browser({ cookieJar: jar }),
    newBrowser = jar.current;
  assert.notEqual(newBrowser, oldBrowser);
  await tabA.window.DKLAAnalytics.flush();
  await settle(); // Existing session belongs to the prior cookie: 409.
  await tabA.window.DKLAAnalytics.flush();
  await settle(); // Fresh session succeeds under the current cookie.
  const recoveredSession = tabA.calls.filter((c) => c.input.session).at(-1).input.session.id;
  assert.notEqual(recoveredSession, oldSession);
  assert.equal(jar.sessions.get(oldSession), oldBrowser);
  assert.equal(jar.sessions.get(recoveredSession), newBrowser);
  assert.equal(
    jar.sessions.get(tabB.calls.filter((c) => c.input.session).at(-1).input.session.id),
    newBrowser,
  );
  const count = tabA.calls.length;
  await tabA.window.DKLAAnalytics.flush();
  await settle();
  assert.ok(tabA.calls.length > count);
  assert.equal(tabA.storageTouches() + tabB.storageTouches(), 0);
});
