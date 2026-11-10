import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { mock, test } from 'node:test';
import { makeAskHandler } from '../../api/ask.js';
import { citeAnswer, generateAnswer } from '../../lib/ask/answer.js';
import { indexCorpus } from '../../lib/ask/retrieve.js';
import { answerWithSearch, citationTable, shouldSearch, webSources } from '../../lib/ask/web.js';

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
  const keys = ['DKLA_OPENAI_API_KEY', 'DKLA_ASK_GATEWAY_API_KEY', 'DKLA_ASK_GATEWAY_OIDC', 'VERCEL_ENV'];
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
    process.env.DKLA_OPENAI_API_KEY = 'fake-key-for-mock';
    const noAnswer = await request({ body: { question: 'quantum zucchini neutrino' } });
    assert.deepEqual(noAnswer.json, { paragraphs: [], sources: [], search: 'not-needed' });
    assert.equal(credentials.length, 0);
    const answer = await request();
    assert.equal(answer.statusCode, 200);
    assert.equal(answer.json.sources[0].id, 'shoe');
    assert.deepEqual(credentials, ['fake-key-for-mock']);

    delete process.env.DKLA_OPENAI_API_KEY;
    process.env.DKLA_ASK_GATEWAY_API_KEY = 'legacy-gateway-key';
    process.env.DKLA_ASK_GATEWAY_OIDC = 'true';
    process.env.VERCEL_ENV = 'production';
    assert.equal((await request()).statusCode, 503);
    assert.deepEqual(credentials, ['fake-key-for-mock']);
    process.env.DKLA_OPENAI_API_KEY = 'fake-key-for-mock';
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

test('the case-citation ranking parser selects the cases table instead of the articles table', () => {
  const rows = Array.from({ length: 25 }, (_, i) => `<li>Case ${i + 1}: <b>Cited by 1,234 cases</b>!</li>`);
  const html =
    '<p>Top 25 most-cited (by articles)</p><ol><li>Article</li></ol>' +
    '<p>Top 25 most-cited (by cases) U.S. Supreme Court cases:</p><ol>' +
    rows.join('') +
    '</ol>';
  const evidence = citationTable(html);
  assert.match(evidence, /2018/);
  assert.match(evidence, /5\. Case 5: Cited by 1,234 cases/);
  assert.doesNotMatch(evidence, /Article/);
  assert.equal(citationTable(html.replace(rows[0], '')), null);
});

test('web citations come from bounded provider results and preserve mixed source numbering', () => {
  const url = 'https://example.edu/study';
  const sources = webSources([
    { url: 'javascript:alert(1)', excerpts: ['Unsafe'] },
    { url: 'https://reader:secret@example.edu', excerpts: ['Unsafe'] },
    { url: 'https://127.0.0.1/page', excerpts: ['Unsafe'] },
    { url: 'https://host.test/page', excerpts: ['Unsafe'] },
    { url, excerpts: [' ', null] },
    { url, title: ' Citation study ', excerpts: ['Iqbal ranked fourth in 2015.'] },
    { url, title: 'Duplicate', excerpts: ['Duplicate'] },
  ]);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].text, 'Iqbal ranked fourth in 2015.');
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
  const key = process.env.DKLA_OPENAI_API_KEY;
  process.env.DKLA_OPENAI_API_KEY = 'fake-key-for-mock';
  const calls = [];
  let unavailable = false;
  const ask = makeAskHandler(
    async ({ question, sources, search }) => {
      calls.push(search);
      return {
        paragraphs: [{ text: 'Study answer.', citations: [1] }],
        needsWeb: question.includes('outside the Atlas') && search === 'not-needed',
      };
    },
    async ({ question, sources }) => {
      calls.push('research');
      if (unavailable) throw Error('Provider failure');
      const web = webSources([
        { url: 'https://example.edu/study', title: 'Source for ' + question, excerpts: ['Evidence'] },
      ]);
      return citeAnswer(
        { paragraphs: [{ text: 'Study answer.', citations: sources.length ? [1, 2] : [1] }] },
        [...web, ...sources],
      );
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
    assert.deepEqual(calls.splice(0), ['research']);

    const outside = await run('How does Corner Post compare with Loper Bright?');
    assert.equal(outside.search, 'searched');
    assert.deepEqual(calls.splice(0), ['research']);

    const unknownCitation = await run(
      'What did the majority hold in Anderson v. OpenAI, 999 U.S. 999 (2025)?',
    );
    assert.equal(unknownCitation.search, 'searched');
    assert.deepEqual(calls.splice(0), ['research']);

    const webOnly = await run('Zygomorph v. Quadrastelian');
    assert.equal(webOnly.search, 'searched');
    assert.deepEqual(
      webOnly.sources.map(({ type }) => type),
      ['web'],
    );
    assert.deepEqual(calls.splice(0), ['research']);

    unavailable = true;
    const fallback = await run('Is Iqbal still good law?', 'cp-iqbal');
    assert.equal(fallback.search, 'unavailable');
    assert.deepEqual(
      fallback.sources.map(({ id }) => id),
      ['cp-iqbal'],
    );
    assert.deepEqual(calls.splice(0), ['research', 'unavailable']);
    const partial = await run('How does this case compare with cases outside the Atlas?', 'shoe');
    assert.equal(partial.search, 'unavailable');
    assert.ok(partial.paragraphs.length);
    assert.deepEqual(calls, ['not-needed', 'research']);
  } finally {
    if (key === undefined) delete process.env.DKLA_OPENAI_API_KEY;
    else process.env.DKLA_OPENAI_API_KEY = key;
  }
});

test('direct OpenAI transport keeps provider annotations and distinguishes credit exhaustion', async () => {
  const url = 'https://example.edu/opinion';
  const link = '[opinion](' + url + ')';
  const otherUrl = 'https://example.edu/statute';
  const text =
    'The deadline runs from injury. ' +
    link +
    '\nThe Atlas covers deference. [A1]\nUncited claim.\nInvalid reference. [A9]' +
    '\nThe statute sets a six-year limit. [Statute](' +
    otherUrl +
    ')' +
    '\nInvented source. [Fake](https://example.edu/fake) [A1]';
  const start = text.indexOf(link);
  const output = {
    needsWeb: false,
    paragraphs: [{ text: 'The deadline runs from injury.', citations: [1] }],
  };
  const reply = (text, annotations = []) => ({
    type: 'message',
    role: 'assistant',
    content: [{ type: 'output_text', text, annotations }],
  });
  let errorCode;
  const transport = mock.method(globalThis, 'fetch', async (endpoint, options) => {
    assert.equal(endpoint, 'https://api.openai.com/v1/responses');
    assert.equal(options.headers.authorization, 'Bearer mock-openai-key');
    assert.equal(options.redirect, 'error');
    const request = JSON.parse(options.body);
    assert.equal(request.store, false);
    if (errorCode)
      return Response.json({ error: { code: errorCode, message: 'Sensitive details' } }, { status: 429 });
    if (request.tools) {
      assert.deepEqual(request.tools, [{ type: 'web_search' }]);
      assert.equal(request.max_tool_calls, 3);
      return Response.json({
        status: 'completed',
        output: [
          { type: 'web_search_call', status: 'completed', action: { sources: [{ url: otherUrl }] } },
          reply(text, [
            {
              type: 'url_citation',
              url,
              title: 'Opinion',
              start_index: start,
              end_index: start,
            },
          ]),
        ],
      });
    }
    assert.equal(request.text.format.strict, true);
    assert.equal(request.reasoning.effort, 'none');
    assert.equal(JSON.parse(request.input).excerpts[0].origin, 'Atlas excerpt');
    return Response.json({ status: 'completed', output: [reply(JSON.stringify(output))] });
  });
  try {
    const input = {
      apiKey: 'mock-openai-key',
      question: 'What did Corner Post hold?',
      signal: AbortSignal.timeout(1000),
    };
    const sources = [{ type: 'node', id: 'lrs-i-loper-bright', title: 'Loper Bright', text: 'Atlas text.' }];
    const answer = { ...input, sources, search: 'searched' };
    const researched = await answerWithSearch(answer);
    assert.equal(transport.mock.callCount(), 1);
    assert.deepEqual(
      researched.sources.map((source) => source.url ?? source.id),
      [url, 'lrs-i-loper-bright', otherUrl],
    );
    assert.deepEqual(researched.paragraphs, [
      { text: 'The deadline runs from injury.', citations: [1] },
      { text: 'The Atlas covers deference.', citations: [2] },
      { text: 'The statute sets a six-year limit.', citations: [3] },
    ]);
    assert.deepEqual(await generateAnswer(answer), output);
    assert.equal(transport.mock.callCount(), 2);
    errorCode = 'credit_balance_exhausted';
    await assert.rejects(generateAnswer(answer), { statusCode: 402, message: 'OpenAI request failed' });
    errorCode = 'rate_limit_exceeded';
    await assert.rejects(generateAnswer(answer), { statusCode: 429 });
  } finally {
    transport.mock.restore();
  }
});
