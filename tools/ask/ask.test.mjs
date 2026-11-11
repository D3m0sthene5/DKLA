import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { mock, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { makeAskHandler } from '../../api/ask.js';
import { query, ready, setTestDatabase } from '../../lib/analytics/db.js';
import { citeAnswer, generateAnswer } from '../../lib/ask/answer.js';
import { ASK_MAX_AGE_DAYS, housekeeping } from '../../lib/analytics/reports.js';
import {
  answerVersion,
  findAnswer,
  MAX_AGE_DAYS,
  normalise,
  storable,
  storeAnswer,
  SWEEP_MINUTES,
} from '../../lib/ask/library.js';
import { indexCorpus } from '../../lib/ask/retrieve.js';
import { answerWithSearch, citationTable, shouldSearch, webSources } from '../../lib/ask/web.js';

// The shared answer library needs a database. These tests never reach a real
// one: by default the database is "not configured", and the library tests
// below use an in-memory Postgres (PGlite), as the analytics tests do.
process.env.NODE_ENV = 'test';
const notConfigured = async () => {
  throw Object.assign(new Error('not-configured'), { status: 503 });
};
const noDatabase = { query: notConfigured, transaction: notConfigured };
setTestDatabase(noDatabase);

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

test('follow-ups carry earlier turns to the model, use them for lookup, and reject bad history', async () => {
  const original = process.env.DKLA_OPENAI_API_KEY;
  process.env.DKLA_OPENAI_API_KEY = 'fake-key-for-mock';
  const calls = [];
  const ask = makeAskHandler(async (args) => {
    calls.push(args);
    return { paragraphs: [{ text: 'Follow-up answer.', citations: [1] }], needsWeb: false };
  });
  const request = async (body) => {
    const res = { setHeader() {}, end: (json) => (res.json = JSON.parse(json)) };
    await ask(
      {
        method: 'POST',
        headers: { host: 'dkla.test', origin: 'https://dkla.test', 'content-type': 'application/json' },
        body,
      },
      res,
    );
    return res;
  };
  const earlier = [
    {
      question: 'How did International Shoe change Pennoyer?',
      answer: 'It replaced territorial power with minimum contacts.',
    },
  ];
  try {
    // Alone, "that test" finds unrelated tests; with the earlier question it finds both cases.
    const followUp = await request({ question: 'Who first applied that test?', history: earlier });
    assert.equal(followUp.statusCode, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].question, 'Who first applied that test?');
    assert.deepEqual(calls[0].earlier, earlier);
    assert.ok(calls[0].sources.some(({ id }) => id === 'shoe'));

    const bad = [
      'not a list',
      [{ question: 'q' }],
      [{ question: 'q', answer: 'a', note: 'extra' }],
      [{ question: 'q', answer: 'a'.repeat(2001) }],
      Array.from({ length: 4 }, () => earlier[0]),
    ];
    for (const history of bad)
      assert.equal(
        (await request({ question: 'And then?', history })).statusCode,
        400,
        JSON.stringify(history),
      );
    assert.equal(calls.length, 1);
  } finally {
    if (original === undefined) delete process.env.DKLA_OPENAI_API_KEY;
    else process.env.DKLA_OPENAI_API_KEY = original;
  }
});

test('the model request includes earlier turns only when there are some', async () => {
  const bodies = [];
  const fetchMock = mock.method(globalThis, 'fetch', async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    return new Response(
      JSON.stringify({
        status: 'completed',
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: '{"needsWeb":false,"paragraphs":[]}' }],
          },
        ],
      }),
    );
  });
  try {
    const base = {
      apiKey: 'k',
      question: 'Why?',
      sources: [],
      search: 'not-needed',
      signal: AbortSignal.timeout(5000),
    };
    await generateAnswer(base);
    await generateAnswer({ ...base, earlier: [{ question: 'Q1', answer: 'A1' }] });
    assert.equal('earlier' in JSON.parse(bodies[0].input), false);
    assert.deepEqual(JSON.parse(bodies[1].input).earlier, [{ question: 'Q1', answer: 'A1' }]);
    assert.match(bodies[1].instructions, /not evidence/);
  } finally {
    fetchMock.mock.restore();
  }
});

test('the answer library matches only the exact normalised question', () => {
  const key = (question) => normalise(question).key;
  const same = (a, b) => key(a) === key(b);
  const base = 'How did International Shoe change Pennoyer?';
  // Only case, accents, spacing, punctuation and opening or closing politeness are ignored.
  for (const variant of [
    'how did international shoe change pennoyer',
    '  How did   International Shoe change Pennoyer??  ',
    'Please, how did International Shoe change Pennoyer?',
    'How did International Shoe change Pennoyer? Thanks!',
    'how did international shoe change pennoyer, please',
    'How did Internátional Shoe change “Pennoyer”?',
  ])
    assert.equal(key(variant), key(base), variant);
  assert.equal(key('Hamer v. Sidway'), key('Hamer vs Sidway'));
  assert.equal(key('Diversity under 28 USC § 1332?'), key('Diversity under 28 USC section 1332'));
  assert.equal(key('Rule 12 (b)(6)'), key('Rule 12(b)(6)'));
  assert.equal(key("Can't a state be sued?"), key('Cannot a state be sued?'));

  // The pairs from the review: one word apart, so different questions with
  // different answers. None of them may share an answer.
  const different = [
    [
      'Is a contract for the sale of goods over $500 enforceable?',
      'Is an oral contract for the sale of goods over $500 enforceable?',
    ],
    [
      'What are the elements of a claim for infliction of emotional distress?',
      'What are the elements of a claim for negligent infliction of emotional distress?',
    ],
    [
      'Does the mailbox rule apply to acceptance of an offer?',
      'Does the mailbox rule apply to acceptance of an option offer?',
    ],
    ['Can a minor void a contract for necessaries?', 'Can a minor void a contract for non-necessaries?'],
    ['Can a minor void a contract for necessaries?', 'Can a minor void a contract for non necessaries?'],
    [
      'What are the elements of a valid contract under common law?',
      'What are the elements of a valid contract under common law incorrectly?',
    ],
    [
      'What are the elements of a valid contract under common law?',
      'What are the elements of a valid contract under common law jokingly?',
    ],
    [
      'my landlord evicted me without notice in ohio is that legal',
      'my landlord john evicted me without notice in ohio is that legal',
    ],
    // Filler that is not politeness is a real part of the question.
    ['Can you appeal a denial of summary judgment?', 'Appeal a denial of summary judgment'],
    ['What is the Erie doctrine?', 'Explain the Erie doctrine.'],
    ['What is the Erie doctrine?', 'What is Erie doctrine'],
    ["Can't a state be sued?", 'Can a state be sued?'],
    ['Does a contract need the word please', 'Does a contract need the word'],
    // Numbers, rule citations, symbols, names, roles, negation and order.
    ['What does Rule 12(b)(6) require?', 'What does Rule 12(b)(7) require?'],
    ['Is diversity under § 1332 complete?', 'Is diversity under § 1331 complete?'],
    ['What does Rule 1.5 say?', 'What does Rule 15 say?'],
    ['Is a sale of goods > $500 covered?', 'Is a sale of goods < $500 covered?'],
    ['Is a 1,000 dollar promise binding?', 'Is a 1 000 dollar promise binding?'],
    ['What did the majority in Loper Bright hold?', 'What did the dissent in Loper Bright hold?'],
    ['Is a promise enforceable with consideration?', 'Is a promise not enforceable with consideration?'],
    ['Does Iqbal overrule Twombly?', 'Does Twombly overrule Iqbal?'],
    ["Were we're liable?", 'Were were liable?'],
    ['Is U.S. law clear?', 'Is us law clear?'],
  ];
  for (const [a, b] of different) assert.ok(!same(a, b), `${a} | ${b}`);

  // Questions about the present or about later changes to the law are never kept.
  for (const question of [
    'Is Iqbal still good law?',
    'Has Roe been overruled?',
    'Was Roe overturned?',
    'Is Roe still the law?',
    'Is Chevron deference still followed?',
    'Is Lochner still valid?',
    'Is the Erie doctrine still binding?',
    'Does Erie still apply?',
    'Which cases has Loper Bright abrogated?',
    'Was the rule superseded by statute?',
    'What is the rule as of 2026?',
    'What did the Court decide in 2024?',
    'What is the current test for standing?',
    'What is the latest Supreme Court case on standing?',
    'What is the rule now?',
    'What is the standard today?',
    'What are recent cases on standing?',
    'Is Pennoyer good law?',
    'Is Iqbal still-good-law?',
    'Is Roe  still   the law?',
    'Is Roe still the law in 2026?',
  ])
    assert.equal(storable(question), false, question);
  for (const question of [
    base,
    'What does § 1983 require?',
    'What does 42 USC section 1983 require?',
    'What does UCC 2-207 say?',
    'Can a plaintiff recover for negligent infliction of emotional distress?',
  ])
    assert.equal(storable(question), true, question);
  assert.equal(MAX_AGE_DAYS, ASK_MAX_AGE_DAYS, 'the dashboard deletes answers at the same age');
});

const libraryRequest = (ask) => async (body) => {
  const res = { setHeader() {}, end: (json) => (res.json = JSON.parse(json)) };
  await ask(
    {
      method: 'POST',
      headers: { host: 'dkla.test', origin: 'https://dkla.test', 'content-type': 'application/json' },
      body,
    },
    res,
  );
  return res;
};

test('first questions are answered from the shared library without calling OpenAI', async () => {
  const key = process.env.DKLA_OPENAI_API_KEY;
  process.env.DKLA_OPENAI_API_KEY = 'fake-key-for-mock';
  const db = new PGlite();
  setTestDatabase(db);
  await ready(); // so a slow first schema set-up cannot hit the library's time limit
  let reply = 'Shoe replaced territorial power with minimum contacts.';
  let cite = [1];
  const transport = mock.method(globalThis, 'fetch', async (endpoint) => {
    assert.equal(endpoint, 'https://api.openai.com/v1/responses');
    const paragraphs = cite.length ? [{ text: reply, citations: cite }] : [];
    return Response.json({
      status: 'completed',
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: JSON.stringify({ needsWeb: false, paragraphs }) }],
        },
      ],
    });
  });
  const request = libraryRequest(makeAskHandler());
  const run = async (body) => {
    const res = await request(body);
    assert.equal(res.statusCode, 200, JSON.stringify(res.json));
    return res.json;
  };
  const question = 'How did International Shoe change Pennoyer?';
  const calls = () => transport.mock.callCount();
  try {
    const first = await run({ question });
    assert.equal(first.cached, undefined);
    assert.equal(first.paragraphs[0].text, reply);
    assert.equal(calls(), 1);
    // The library keeps no visitor identity, only the question and answer.
    const columns = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='dkla_ask_answers' ORDER BY ordinal_position",
    );
    assert.deepEqual(
      columns.map((c) => c.column_name),
      ['node', 'question_key', 'version', 'answer', 'created_at'],
    );
    // Expired rows are found by age through an index, not a scan of the table.
    const indexes = await query("SELECT indexdef FROM pg_indexes WHERE tablename='dkla_ask_answers'");
    assert.ok(indexes.some((row) => /\(created_at\)/.test(row.indexdef)));
    // Each answer is tied to this corpus and answer version.
    const [{ version }] = await query('SELECT version FROM dkla_ask_answers');
    assert.equal(version, await answerVersion());
    assert.match(version, /^[0-9a-f]{32}$/);

    // A hit: the same answer, flagged, without any request to OpenAI.
    for (const again of [question, 'Please, how did International Shoe change Pennoyer?? Thanks']) {
      const hit = await run({ question: again });
      assert.equal(hit.cached, true);
      assert.match(hit.savedAt, /^\d{4}-\d\d-\d\dT/);
      assert.deepEqual(hit.paragraphs, first.paragraphs);
      assert.deepEqual(hit.sources, first.sources);
    }
    assert.equal(calls(), 1);
    // Another open entry, one more word, or a follow-up: no hit.
    reply = 'A different answer.';
    assert.equal((await run({ question, node: 'shoe' })).cached, undefined);
    assert.equal((await run({ question: question.replace('?', ' jurisdiction?') })).cached, undefined);
    const followUp = await run({
      question,
      history: [{ question: 'What is personal jurisdiction?', answer: 'Power over a party.' }],
    });
    assert.equal(followUp.cached, undefined);
    assert.equal(followUp.paragraphs[0].text, 'A different answer.');
    assert.equal(calls(), 4);
    const kept = await query('SELECT node, question_key FROM dkla_ask_answers ORDER BY node, question_key');
    assert.deepEqual(
      kept.map((row) => row.node + '|' + row.question_key),
      [
        '|how did international shoe change pennoyer',
        '|how did international shoe change pennoyer jurisdiction',
        'shoe|how did international shoe change pennoyer',
      ],
      'follow-ups are never stored',
    );

    // fresh: true skips the library and replaces its entry.
    reply = 'A newer answer.';
    const fresh = await run({ question, fresh: true });
    assert.equal(fresh.cached, undefined);
    assert.equal(fresh.paragraphs[0].text, 'A newer answer.');
    assert.equal(calls(), 5);
    const after = await run({ question });
    assert.equal(after.cached, true);
    assert.equal(after.paragraphs[0].text, 'A newer answer.');
    assert.equal(calls(), 5);
    assert.equal((await request({ question, fresh: 'yes' })).statusCode, 400);

    // An answer from an older corpus or answer version (an earlier deploy) is never served.
    await query("UPDATE dkla_ask_answers SET version='an-earlier-deploy'");
    reply = 'Answered from the current corpus.';
    const redeployed = await run({ question });
    assert.equal(redeployed.cached, undefined);
    assert.equal(redeployed.paragraphs[0].text, 'Answered from the current corpus.');
    assert.equal(calls(), 6);
    assert.equal((await run({ question })).cached, true);
    assert.equal(calls(), 6);

    // Time-sensitive questions are neither served nor stored.
    const overruled = 'Has International Shoe been overruled?';
    for (let turn = 0; turn < 2; turn++) {
      const before = calls();
      assert.equal((await run({ question: overruled })).cached, undefined);
      assert.ok(calls() > before, 'asked OpenAI each time');
    }
    // From here on, count requests to OpenAI from this point.
    const base = calls();
    const spent = () => calls() - base;
    assert.equal(
      (
        await query('SELECT count(*)::int AS n FROM dkla_ask_answers WHERE question_key LIKE $1', [
          '%overruled%',
        ])
      )[0].n,
      0,
    );

    // Entries expire after 90 days, and lookups delete expired entries too
    // (at most every SWEEP_MINUTES per server instance), even when nothing new is stored.
    const count = async () => (await query('SELECT count(*)::int AS n FROM dkla_ask_answers'))[0].n;
    await query("UPDATE dkla_ask_answers SET created_at = now() - interval '91 days'");
    const later = Date.now() + (SWEEP_MINUTES + 1) * 60_000;
    const clock = mock.method(Date, 'now', () => later);
    cite = []; // an answer that abstains, so nothing new is stored
    try {
      const unanswered = await run({ question: 'What did Pennoyer say about service by mail?' });
      assert.deepEqual(unanswered.paragraphs, []);
    } finally {
      clock.mock.restore();
      cite = [1];
    }
    assert.equal(await count(), 0, 'a lookup deleted every expired entry');
    assert.equal(spent(), 1);
    reply = 'After expiry.';
    const expired = await run({ question });
    assert.equal(expired.cached, undefined);
    assert.equal(expired.paragraphs[0].text, 'After expiry.');
    assert.equal(spent(), 2);
    assert.equal(await count(), 1);
    // The dashboard's storage housekeeping deletes them as well.
    await query("UPDATE dkla_ask_answers SET created_at = now() - interval '91 days'");
    await housekeeping();
    assert.equal(await count(), 0);
    await run({ question });
    assert.equal(spent(), 3);

    // An answer that abstains is not kept.
    cite = [];
    const notice = 'What did Pennoyer say about notice?';
    assert.deepEqual((await run({ question: notice })).paragraphs, []);
    cite = [1];
    reply = 'Notice by publication.';
    assert.equal((await run({ question: notice })).cached, undefined);
    assert.equal(spent(), 5);

    // A database that fails: Ask answers normally.
    const down = async () => {
      throw new Error('database down');
    };
    setTestDatabase({ query: down, transaction: down });
    const warn = mock.method(console, 'warn', () => {});
    reply = 'Answered without the library.';
    const fallback = await run({ question });
    assert.ok(warn.mock.callCount() >= 1);
    warn.mock.restore();
    assert.equal(fallback.cached, undefined);
    assert.equal(fallback.paragraphs[0].text, 'Answered without the library.');
    assert.equal(spent(), 6);
  } finally {
    transport.mock.restore();
    setTestDatabase(noDatabase);
    await db.close();
    if (key === undefined) delete process.env.DKLA_OPENAI_API_KEY;
    else process.env.DKLA_OPENAI_API_KEY = key;
  }
});

test('answers written after web search failed are not kept in the library', async () => {
  const key = process.env.DKLA_OPENAI_API_KEY;
  process.env.DKLA_OPENAI_API_KEY = 'fake-key-for-mock';
  const db = new PGlite();
  setTestDatabase(db);
  await ready(); // so a slow first schema set-up cannot hit the library's time limit
  const request = libraryRequest(
    makeAskHandler(
      async () => ({ paragraphs: [{ text: 'Atlas only.', citations: [1] }], needsWeb: false }),
      async () => {
        throw Error('Provider failure');
      },
    ),
  );
  const warn = mock.method(console, 'warn', () => {});
  try {
    const res = await request({ question: 'Is Iqbal one of the 5 most cited cases ever?', node: 'cp-iqbal' });
    assert.equal(res.json.search, 'unavailable');
    assert.ok(res.json.paragraphs.length);
    assert.equal((await query('SELECT count(*)::int AS n FROM dkla_ask_answers'))[0].n, 0);
  } finally {
    warn.mock.restore();
    setTestDatabase(noDatabase);
    await db.close();
    if (key === undefined) delete process.env.DKLA_OPENAI_API_KEY;
    else process.env.DKLA_OPENAI_API_KEY = key;
  }
});

test('a library table from before answer versions is upgraded and its old answers are never served', async () => {
  const db = new PGlite();
  setTestDatabase(db);
  try {
    // The shape the table had while near matching existed (never released).
    await db.query(`CREATE TABLE dkla_ask_answers (
      node text NOT NULL DEFAULT '', question_key text NOT NULL, signature text NOT NULL, content jsonb NOT NULL,
      answer jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(node, question_key))`);
    await db.query(
      'CREATE INDEX dkla_ask_answers_near ON dkla_ask_answers(node, signature, created_at DESC)',
    );
    const old = { paragraphs: [{ text: 'An old answer.', citations: [1] }], sources: [{ id: 'shoe' }] };
    await db.query(
      `INSERT INTO dkla_ask_answers(node, question_key, signature, content, answer) VALUES('', $1, '[]', '[]', $2)`,
      [normalise('What is minimum contacts?').key, JSON.stringify(old)],
    );
    await ready();
    const columns = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='dkla_ask_answers' ORDER BY ordinal_position",
    );
    assert.deepEqual(
      columns.map((c) => c.column_name),
      ['node', 'question_key', 'answer', 'created_at', 'version'],
    );
    assert.equal(await findAnswer('What is minimum contacts?'), null);
    const fresh = { paragraphs: [{ text: 'A new answer.', citations: [1] }], sources: [{ id: 'shoe' }] };
    assert.equal(await storeAnswer('What is minimum contacts?', '', fresh), true);
    assert.deepEqual((await findAnswer('what is minimum contacts')).paragraphs, fresh.paragraphs);
  } finally {
    setTestDatabase(noDatabase);
    await db.close();
  }
});
