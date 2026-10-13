import test from 'node:test';
import assert from 'node:assert/strict';
import analytics from '../../api/analytics.js';

test('preview collector stops before reading visitor identity or connecting to storage', async () => {
  const old = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = 'preview';
  try {
    let result;
    const request = new Proxy(
      {},
      {
        get() {
          throw new Error('Preview must not inspect visitor request');
        },
      },
    );
    const response = {
      setHeader() {},
      end(value) {
        result = JSON.parse(value);
      },
    };
    await analytics(request, response);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(result, { tier: 'none', scoring: false, configured: false, accepted: 0 });
  } finally {
    if (old === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = old;
  }
});
