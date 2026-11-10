import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { test } from 'node:test';
import { makeAskHandler } from '../../api/ask.js';
import { citeAnswer } from '../../lib/ask/answer.js';
import { indexCorpus } from '../../lib/ask/retrieve.js';
import { shouldSearch, webSources } from '../../lib/ask/web.js';

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
  assert.ok(ids('Is Iqbal one of the 5 most cited cases ever?').includes('node:cp-iqbal'));
  const statute = retrieve('what are the three parts of the rules enabling act').find(
    ({ id }) => id === 'cp-usc-2072',
  );
  assert.match(statute?.text, /\(a\) The Supreme Court/);
  assert.match(statute?.text, /\(b\) Such rules shall not abridge/);
  assert.match(statute?.text, /\(c\) Such rules may define/);
  assert.deepEqual(ids('quantum zucchini neutrino'), []);
});

test('answers use only server-owned citations and reject unknown or missing references', () => {
  const sources = retrieve('How did International Shoe change Pennoyer?');
  const answer = citeAnswer(
    { paragraphs: [{ text: 'Two decisions. (See excerpts 3 and 1.)', citations: [3, 1, 3] }] },
    sources,
  );
  assert.equal(answer.paragraphs[0].text, 'Two decisions.');
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
    assert.deepEqual(noAnswer.json, { paragraphs: [], sources: [], search: 'not-needed' });
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

test('web citations come from bounded provider results and preserve mixed source numbering', () => {
  const url = 'https://example.edu/study';
  const sources = webSources([
    { url: 'javascript:alert(1)', excerpts: ['Unsafe'] },
    { url: 'https://reader:secret@example.edu', excerpts: ['Unsafe'] },
    { url: 'https://127.0.0.1/page', excerpts: ['Unsafe'] },
    { url: 'https://host.test/page', excerpts: ['Unsafe'] },
    { url, excerpts: [' ', null] },
    { url, title: ' Citation study ', publish_date: '2015-09-09', excerpts: ['Iqbal ranked fourth.'] },
    { url, title: 'Duplicate', excerpts: ['Duplicate'] },
  ]);
  assert.equal(sources.length, 1);
  assert.equal(
    webSources([{ url, publishedDate: '2015-09-09T00:00:00Z', highlights: ['An excerpt.'] }])[0].text,
    'Page publication date: 2015-09-09\nAn excerpt.',
  );
  assert.equal(sources[0].text, 'Page publication date: 2015-09-09\nIqbal ranked fourth.');
  const atlas = retrieve('What did Iqbal hold?')[0];
  const answer = citeAnswer(
    {
      paragraphs: [
        { text: 'Ranking.', citations: [2] },
        { text: 'Atlas context.', citations: [1] },
      ],
    },
    [atlas, ...sources],
  );
  assert.deepEqual(answer.sources[0], {
    type: 'web',
    id: 'web-1',
    title: 'Citation study',
    category: 'example.edu',
    url,
  });
  assert.equal(answer.sources[1].id, atlas.id);
  assert.deepEqual(
    answer.paragraphs.map((p) => p.citations),
    [[1], [2]],
  );
  assert.equal(shouldSearch('Is Iqbal one of the 5 most cited cases ever?', [atlas]), true);
  assert.equal(shouldSearch('How did Iqbal change pleading?', [atlas]), false);
});

test('hybrid research covers a ranking, an Atlas gap, and search failure', async () => {
  const key = process.env.DKLA_ASK_GATEWAY_API_KEY;
  process.env.DKLA_ASK_GATEWAY_API_KEY = 'fake-key-for-mock';
  const calls = [];
  let unavailable = false;
  const ask = makeAskHandler(
    async ({ question, sources, search }) => {
      calls.push(search);
      if (question.includes('Corner Post') && search === 'not-needed')
        return { paragraphs: [], needsWeb: true };
      const web = sources.findIndex(({ type }) => type === 'web');
      return {
        paragraphs: [{ text: 'Study answer.', citations: web < 0 ? [1] : [web + 1, 1] }],
        needsWeb: false,
      };
    },
    async ({ question }) => {
      calls.push('research');
      if (unavailable) throw Error('Provider failure');
      return webSources([
        { url: 'https://example.edu/study', title: 'Source for ' + question, excerpts: ['Evidence'] },
      ]);
    },
  );
  const run = async (question, node) => {
    const req = {
      method: 'POST',
      headers: { host: 'dkla.test', origin: 'https://dkla.test', 'content-type': 'application/json' },
      body: { question, node },
    };
    const res = { setHeader() {}, end: (json) => (res.json = JSON.parse(json)) };
    await ask(req, res);
    assert.equal(res.statusCode, 200);
    return res.json;
  };
  try {
    const ranking = await run('Is Iqbal one of the 5 most cited cases ever?', 'cp-iqbal');
    assert.equal(ranking.search, 'searched');
    assert.deepEqual(
      ranking.sources.map(({ id }) => id),
      ['web-1', 'cp-iqbal'],
    );
    assert.deepEqual(calls.splice(0), ['research', 'searched']);

    const outside = await run('How does Corner Post compare with Loper Bright?');
    assert.equal(outside.search, 'searched');
    assert.deepEqual(calls.splice(0), ['not-needed', 'research', 'searched']);

    const webOnly = await run('Zygomorph v. Quadrastelian');
    assert.equal(webOnly.search, 'searched');
    assert.deepEqual(
      webOnly.sources.map(({ type }) => type),
      ['web'],
    );
    assert.deepEqual(calls.splice(0), ['research', 'searched']);

    unavailable = true;
    const fallback = await run('Is Iqbal still good law?', 'cp-iqbal');
    assert.equal(fallback.search, 'unavailable');
    assert.deepEqual(
      fallback.sources.map(({ id }) => id),
      ['cp-iqbal'],
    );
    assert.deepEqual(calls, ['research', 'unavailable']);
  } finally {
    if (key === undefined) delete process.env.DKLA_ASK_GATEWAY_API_KEY;
    else process.env.DKLA_ASK_GATEWAY_API_KEY = key;
  }
});
