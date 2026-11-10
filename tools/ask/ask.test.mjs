import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { test } from 'node:test';
import { makeAskHandler } from '../../api/ask.js';
import { citeAnswer } from '../../lib/ask/answer.js';
import { indexCorpus } from '../../lib/ask/retrieve.js';

const corpus = new URL('../../work/build/ask-corpus.json.gz', import.meta.url);
const records = JSON.parse(gunzipSync(await readFile(corpus)));
const retrieve = indexCorpus(records);

test('the published corpus retrieves both sides of a comparison and specialized sources', () => {
  const ids = (query, node) => retrieve(query, node).map((s) => s.type + ':' + s.id);
  for (const id of ['node:shoe', 'node:cp-pennoyer'])
    assert.ok(ids('How did International Shoe change Pennoyer?').includes(id));
  assert.ok(ids('Compare Hamer v Sidway and Kirksey v Kirksey').includes('brief:CT-CB-0081'));
  assert.ok(ids('What does UCC 2-207 say about additional terms?').includes('authority:ucc-2-207'));
  assert.ok(ids('What is promissory estoppel?').includes('term:promissory_estoppel'));
  assert.ok(ids('Which justices joined the majority in Loper Bright?').includes('scotus:lrs-i-loper-bright'));
  assert.equal(ids('Why did the court rule that way in this case?', 'shoe')[0], 'node:shoe');
  assert.deepEqual(ids('quantum zucchini neutrino'), []);
});

test('answers use only server-owned citations and reject unknown or missing references', () => {
  const sources = retrieve('How did International Shoe change Pennoyer?');
  const answer = citeAnswer({ paragraphs: [{ text: 'Two decisions.', citations: [3, 1, 3] }] }, sources);
  assert.deepEqual(answer.paragraphs[0].citations, [1, 2]);
  assert.deepEqual(
    answer.sources.map((source) => source.id),
    ['cp-pennoyer', 'shoe'],
  );
  assert.equal('text' in answer.sources[0], false);
  for (const citations of [[99], [], ['1']])
    assert.throws(() => citeAnswer({ paragraphs: [{ text: 'Unverified.', citations }] }, sources));
});

test('the API validates requests, stays disabled without a key and abstains on missing sources', async () => {
  const keys = ['DKLA_ASK_GATEWAY_API_KEY', 'DKLA_ASK_GATEWAY_OIDC', 'VERCEL_ENV', 'AI_GATEWAY_API_KEY'];
  const original = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  const credentials = [];
  let limited = false;
  const ask = makeAskHandler(async ({ apiKey, sources, question }) => {
    credentials.push(apiKey);
    if (limited) throw Object.assign(new Error('budget exceeded'), { statusCode: 402 });
    assert.equal(question, 'How did International Shoe change Pennoyer?');
    assert.ok(sources.some((source) => source.id === 'cp-pennoyer'));
    return { paragraphs: [{ text: 'Example answer.', citations: [1] }] };
  });
  async function request(options = {}) {
    const req = {
      method: 'POST',
      headers: { host: 'dkla.test', origin: 'https://dkla.test', 'content-type': 'application/json' },
      body: { question: 'How did International Shoe change Pennoyer?' },
      ...options,
    };
    const headers = {};
    const res = {
      setHeader: (key, value) => (headers[key] = value),
      end: (json) => (res.json = JSON.parse(json)),
    };
    await ask(req, res);
    assert.match(headers['cache-control'], /no-store/);
    return res;
  }
  try {
    assert.equal((await request({ method: 'GET' })).statusCode, 405);
    assert.equal(
      (await request({ headers: { host: 'dkla.test', origin: 'https://other.test' } })).statusCode,
      403,
    );
    assert.equal((await request({ body: { question: 'x'.repeat(601) } })).statusCode, 400);
    assert.equal(
      (await request({ body: { question: 'hi', node: { text: 'private note' } } })).statusCode,
      400,
    );
    assert.equal((await request()).statusCode, 503);
    assert.equal(credentials.length, 0);
    process.env.DKLA_ASK_GATEWAY_API_KEY = 'fake-key-for-mock';
    const noAnswer = await request({ body: { question: 'quantum zucchini neutrino' } });
    assert.deepEqual(noAnswer.json, { paragraphs: [], sources: [] });
    assert.equal(credentials.length, 0);
    const answer = await request();
    assert.equal(answer.statusCode, 200);
    assert.equal(answer.json.sources[0].id, 'shoe');
    assert.deepEqual(credentials, ['fake-key-for-mock']);

    delete process.env.DKLA_ASK_GATEWAY_API_KEY;
    process.env.DKLA_ASK_GATEWAY_OIDC = 'true';
    process.env.VERCEL_ENV = 'preview';
    assert.equal((await request()).statusCode, 503);
    process.env.VERCEL_ENV = 'production';
    process.env.AI_GATEWAY_API_KEY = 'unbudgeted-default';
    assert.equal((await request()).statusCode, 503);
    delete process.env.AI_GATEWAY_API_KEY;
    assert.equal((await request()).statusCode, 200);
    assert.deepEqual(credentials, ['fake-key-for-mock', undefined]);
    limited = true;
    const exhausted = await request();
    assert.equal(exhausted.statusCode, 429);
    assert.deepEqual(exhausted.json, { error: 'usage-limit' });
  } finally {
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
