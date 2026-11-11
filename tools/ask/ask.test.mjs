import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { mock, test } from 'node:test';
import { makeAskHandler } from '../../api/ask.js';
import { checkAnswer, citeAnswer, generateAnswer } from '../../lib/ask/answer.js';
import { indexCorpus } from '../../lib/ask/retrieve.js';
import { answerWithSearch, citationTable, route, shouldSearch, webSources } from '../../lib/ask/web.js';

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
    asks: 'What Corner Post held about the deadline',
    answers: 'exact',
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
      assert.equal(request.max_tool_calls, 4);
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
    assert.equal(request.reasoning.effort, 'low');
    assert.deepEqual(request.text.format.schema.required, ['asks', 'answers', 'needsWeb', 'paragraphs']);
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
            content: [
              {
                type: 'output_text',
                text: '{"asks":"why","answers":"none","needsWeb":false,"paragraphs":[]}',
              },
            ],
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

// The owner's question (November 2026). The answer is the Private Securities Litigation Reform
// Act of 1995, enacted over President Clinton's veto; the Atlas only has Gustafson v. Alloyd (1995).
const pslra = 'what statute in 1995 was a vicotry for corporate itnerest that overrode a clinton veto';

// Realistic questions and the route each should take: 'atlas' (the Atlas alone, then the model's
// own check) or 'research' (web search, with the top Atlas excerpts attached). Retrieval is real.
const routes = [
  ['atlas', 'what is the rule for diversity jurisdiction amount in controversy'],
  ['atlas', 'explain International Shoe'],
  ['atlas', 'how does Rule 12(b)(6) work'],
  ['atlas', 'What is promissory estoppel?'],
  ['atlas', 'How did International Shoe change Pennoyer?'],
  ['atlas', 'Compare Hamer v Sidway and Kirksey v Kirksey'],
  ['atlas', 'What does UCC 2-207 say about additional terms?'],
  ['atlas', 'Which justices joined the majority in Loper Bright?'],
  ['atlas', 'Why did the court rule that way in this case?', 'shoe'],
  ['atlas', 'what was the holding in this case', 'lrs-k-gustafson'],
  ['atlas', 'What did Iqbal hold?'],
  // The Erie entry says Justice Butler dissented, joined by Justice McReynolds.
  ['atlas', 'who wrote the dissent in Erie'],
  ['atlas', 'which justice wrote International Shoe'],
  ['atlas', 'what year was Pennoyer decided'],
  ['atlas', 'what did the Supreme Court decide in 1938 in Erie'],
  ['atlas', 'what is the mailbox rule'],
  ['atlas', 'what is consideration'],
  ['atlas', 'what are the three parts of the rules enabling act'],
  ['atlas', 'What is the difference between general and specific jurisdiction?'],
  ['atlas', 'explain the plausibility standard from Twombly'],
  ['atlas', 'what is the battle of the forms'],
  ['atlas', 'when can a defendant remove a case to federal court'],
  ['atlas', 'What is supplemental jurisdiction under 1367?'],
  ['atlas', 'What did the Court hold in Gustafson v. Alloyd?'],
  ['atlas', 'what is the Erie doctrine'],
  ['atlas', 'What is the holding of Hadley v. Baxendale?'],
  ['atlas', 'explain Chevron deference'],
  ['atlas', 'how does claim preclusion work'],
  ['atlas', 'What does Rule 56 require for summary judgment?'],
  ['atlas', 'what is the strong inference standard under the PSLRA'],
  ['atlas', 'What is the pre-existing duty rule?'],
  ['atlas', 'what is unconscionability'],
  ['atlas', 'How does Daimler change general jurisdiction?'],
  ['atlas', 'what is the CAFA amount in controversy'],
  // Veto doctrine is in the Atlas; a particular veto, as an event, goes to research.
  ['atlas', 'what is a veto'],
  ['atlas', 'how does the line-item veto work'],
  ['atlas', 'what did the court hold in Clinton v. City of New York'],
  ['atlas', 'what does 28 U.S.C. 2072 say'],
  ['atlas', 'what does the APA say about notice and comment rulemaking'],
  ['atlas', 'what is the Rules Enabling Act'],
  ['atlas', 'how has pleading changed since Conley'],
  ['atlas', 'tell me about the Securities Act of 1933'],
  ['atlas', "what's the deadline to answer a complaint"],
  ['atlas', 'what is the parol evidence rule'],
  ['atlas', 'how does the statute of frauds work'],
  ['atlas', 'explain the major questions doctrine'],
  ['atlas', 'what are the requirements for a class action under Rule 23'],
  ['research', pslra],
  ['research', 'which act did Congress pass in 1996 to limit habeas'],
  ['research', 'what happened in the Dobbs leak'],
  ['research', 'Is Iqbal still good law?'],
  ['research', 'Is Iqbal one of the 5 most cited cases ever?'],
  ['research', 'How does Corner Post compare with Loper Bright?'],
  ['research', 'What did the majority hold in Anderson v. OpenAI, 999 U.S. 999 (2025)?'],
  ['research', 'Who is the current Chief Justice?'],
  ['research', 'when did Congress pass the Class Action Fairness Act'],
  ['research', 'what did president clinton veto in 1995'],
  ['research', 'did clinton veto the PSLRA'],
  ['research', 'what statute did Congress pass in response to this case', 'lrs-k-gustafson'],
  ['research', 'which president signed the Administrative Procedure Act'],
  ['research', 'what statute did congress pass after Gustafson'],
  ['research', 'did congress respond to Gustafson'],
  ['research', 'who was Louis Brandeis before he joined the court'],
  ['research', 'who is Ruth Bader Ginsburg'],
  ['research', 'what happened to Justice Fortas'],
  ['research', 'how did the Senate vote on the Kavanaugh nomination'],
  ['research', 'what was the vote on the Senate override of the PSLRA veto'],
  ['research', 'what securities law did Congress enact over a presidential veto'],
  ['research', 'what case in 1995 narrowed securities fraud liability for corporations'],
  ['research', 'what is the latest Supreme Court decision on personal jurisdiction'],
  ['research', 'what did the court hold in Mallory v. Norfolk Southern last year'],
  ['research', 'who won the 2024 presidential election'],
  ['research', 'what is the statute of limitations for securities fraud in New York'],
  // Palsgraf is a torts case, outside the three courses.
  ['research', 'what did palsgraf hold'],
  ['research', 'what are the best bar prep courses'],
  ['research', 'how many law schools use this casebook'],
  // Statutory interpretation is Atlas doctrine, but no Atlas title matches this wording, so the
  // safe default (research, with the Atlas excerpts attached) applies.
  ['research', 'How do courts decide what Congress meant in a statute?'],
];

test('routing researches the web unless the Atlas clearly covers the question', (t) => {
  const { sources, signals } = retrieve.explain(pslra);
  assert.ok(
    sources.some(({ id }) => id === 'lrs-k-gustafson'),
    'the trap is real: the Atlas retrieves Gustafson for the owner’s question',
  );
  assert.deepEqual(route(pslra, sources, { signals }), { research: true, reason: 'legislation or events' });
  // explain() returns exactly what retrieve() returns, plus the signals.
  assert.deepEqual(sources, retrieve(pslra));

  const wrong = routes.flatMap(([want, question, node]) => {
    const { sources, signals } = retrieve.explain(question, node);
    const got = route(question, sources, { node, signals });
    return (got.research ? 'research' : 'atlas') === want ? [] : [[want, question, got.reason]];
  });
  assert.deepEqual(wrong, []);
  assert.ok(routes.length >= 40);
  const researched = routes.filter(([want]) => want === 'research').length;
  t.diagnostic(`${researched} of ${routes.length} questions research the web`);

  // Without retrieval signals (older callers), the Gustafson excerpt alone still does not count.
  assert.equal(
    shouldSearch(
      pslra,
      sources.filter(({ id }) => id === 'lrs-k-gustafson'),
    ),
    true,
  );
});

test('the server rejects an Atlas answer that substitutes another question or kind of authority', () => {
  const sources = retrieve(pslra);
  const gustafson = sources.findIndex(({ id }) => id === 'lrs-k-gustafson') + 1;
  const veto = sources.findIndex(({ id }) => id === 'veto') + 1;
  assert.ok(gustafson > 0 && veto > 0);
  const draft = (answers, text, citations = [gustafson]) => ({
    asks: 'a 1995 statute enacted over a Clinton veto',
    answers,
    needsWeb: false,
    paragraphs: [{ text, citations }],
  });
  const atlasOnly = { question: pslra, sources, search: 'not-needed' };
  // The answer the owner saw: hedged, a case for a statute question, and called exact.
  const seen = checkAnswer(
    draft('exact', 'You are probably asking about Gustafson v. Alloyd Co., Inc. (1995).'),
    atlasOnly,
  );
  assert.deepEqual([seen.needsWeb, seen.paragraphs], [true, []]);
  // Without the hedge, a case still does not answer "what statute".
  const unhedged = checkAnswer(
    draft('exact', 'Gustafson v. Alloyd narrowed the statute in 1995.'),
    atlasOnly,
  );
  assert.deepEqual([unhedged.needsWeb, unhedged.paragraphs], [true, []]);
  // Nor does a dictionary entry on vetoes, even as part of an answer after search failed.
  const unavailable = { ...atlasOnly, search: 'unavailable' };
  const part = checkAnswer(draft('part', 'A veto is a refusal to sign a bill.', [veto]), unavailable);
  assert.deepEqual([part.needsWeb, part.paragraphs], [false, []]);
  assert.deepEqual(checkAnswer(draft('none', 'Related background.'), unavailable).paragraphs, []);

  // A real Atlas answer passes, and a model that is unsure still triggers research.
  const shoe = { question: 'explain International Shoe', sources: retrieve('explain International Shoe') };
  const answer = {
    asks: 'an explanation of International Shoe',
    answers: 'exact',
    needsWeb: false,
    paragraphs: [{ text: 'Minimum contacts.', citations: [1] }],
  };
  assert.deepEqual(checkAnswer(answer, { ...shoe, search: 'not-needed' }), answer);
  assert.equal(checkAnswer({ ...answer, answers: 'part' }, { ...shoe, search: 'not-needed' }).needsWeb, true);
});

// The real handler and OpenAI request code, with fetch answered by reply(request, input).
async function askWithFetch(reply, body) {
  const original = process.env.DKLA_OPENAI_API_KEY;
  process.env.DKLA_OPENAI_API_KEY = 'fake-key-for-mock';
  const requests = [];
  const transport = mock.method(globalThis, 'fetch', async (endpoint, options) => {
    assert.equal(endpoint, 'https://api.openai.com/v1/responses');
    const request = JSON.parse(options.body);
    requests.push(request);
    return reply(request, JSON.parse(request.input));
  });
  try {
    const res = { setHeader() {}, end: (json) => (res.json = JSON.parse(json)) };
    await makeAskHandler()(
      {
        method: 'POST',
        headers: { host: 'dkla.test', origin: 'https://dkla.test', 'content-type': 'application/json' },
        body,
      },
      res,
    );
    assert.equal(res.statusCode, 200);
    return { json: res.json, requests };
  } finally {
    transport.mock.restore();
    if (original === undefined) delete process.env.DKLA_OPENAI_API_KEY;
    else process.env.DKLA_OPENAI_API_KEY = original;
  }
}
const congress = 'https://www.congress.gov/bill/104th-congress/house-bill/1058';
const message = (text) => ({
  type: 'message',
  role: 'assistant',
  content: [{ type: 'output_text', text, annotations: [] }],
});
const researched = (text) =>
  Response.json({
    status: 'completed',
    output: [
      {
        type: 'web_search_call',
        status: 'completed',
        action: {
          sources: [{ url: congress, title: 'H.R.1058 - Private Securities Litigation Reform Act of 1995' }],
        },
      },
      message(text),
    ],
  });
const pslraAnswer =
  "The Private Securities Litigation Reform Act of 1995 (H.R. 1058) became law on December 22, 1995, when Congress overrode President Clinton's veto. [H.R.1058](" +
  congress +
  ')';
const atlasReply = (output) =>
  Response.json({ status: 'completed', output: [message(JSON.stringify(output))] });
const excerptNumber = (input, pattern) => input.excerpts.find(({ title }) => pattern.test(title))?.number;

test('the owner’s 1995 statute question researches the web although the Atlas retrieves Gustafson', async () => {
  const { json, requests } = await askWithFetch(
    (request) => {
      if (!request.tools) assert.fail('This question must not get an Atlas-only answer.');
      return researched(pslraAnswer);
    },
    { question: pslra },
  );
  assert.equal(requests.length, 1);
  assert.equal(json.search, 'searched');
  assert.deepEqual(
    json.sources.map(({ type, url }) => [type, url]),
    [['web', congress]],
  );
  assert.match(json.paragraphs[0].text, /Private Securities Litigation Reform Act of 1995/);
  // The research request still carries the Atlas excerpts, and the prompt covers legislation.
  const [request] = requests;
  assert.ok(excerptNumber(JSON.parse(request.input), /Gustafson/));
  assert.match(request.instructions, /^You are Dottie, the Ask Dottie research assistant/);
  assert.match(request.instructions, /congress\.gov/);
  assert.match(request.instructions, /Public Papers\s+of the Presidents/);
  assert.equal(request.max_tool_calls, 4);
});

test('an Atlas-only answer to a substitute question goes on to research', async () => {
  // The model calls a hedged substitute answer exact; the server's check sends it to research.
  const hedged = await askWithFetch(
    (request) => {
      if (request.tools) return researched('Chevron set out deference. [Chevron](' + congress + ')');
      return atlasReply({
        asks: 'an explanation of Chevron deference',
        answers: 'exact',
        needsWeb: false,
        paragraphs: [{ text: 'You are probably asking about Gustafson v. Alloyd Co.', citations: [1] }],
      });
    },
    { question: 'explain Chevron deference' },
  );
  assert.deepEqual(
    hedged.requests.map((request) => Boolean(request.tools)),
    [false, true],
  );
  assert.equal(hedged.json.search, 'searched');
  assert.doesNotMatch(JSON.stringify(hedged.json), /probably asking/);

  // "What statute" answered with a concept entry, not a statute: research.
  const statute = await askWithFetch(
    (request, input) => {
      if (request.tools) return researched('28 U.S.C. § 1332 governs diversity. [1332](' + congress + ')');
      const concept = excerptNumber(input, /^Diversity jurisdiction$/);
      assert.ok(concept);
      return atlasReply({
        asks: 'the statute that governs diversity jurisdiction',
        answers: 'exact',
        needsWeb: false,
        paragraphs: [{ text: 'Diversity jurisdiction needs complete diversity.', citations: [concept] }],
      });
    },
    { question: 'what statute governs diversity jurisdiction' },
  );
  assert.deepEqual(
    statute.requests.map((request) => Boolean(request.tools)),
    [false, true],
  );

  // A slow Atlas answer also goes on to research instead of failing the question.
  const slow = await askWithFetch(
    (request) => {
      if (request.tools) return researched('Chevron set out deference. [Chevron](' + congress + ')');
      throw new DOMException('The operation timed out.', 'TimeoutError');
    },
    { question: 'explain Chevron deference' },
  );
  assert.equal(slow.json.search, 'searched');

  // A real Atlas answer is used without searching.
  const direct = await askWithFetch(
    (request) => {
      if (request.tools) assert.fail('An exact Atlas answer needs no search.');
      return atlasReply({
        asks: 'an explanation of Chevron deference',
        answers: 'exact',
        needsWeb: false,
        paragraphs: [{ text: 'Courts deferred to reasonable agency readings.', citations: [1] }],
      });
    },
    { question: 'explain Chevron deference' },
  );
  assert.equal(direct.requests.length, 1);
  assert.equal(direct.json.search, 'not-needed');
  assert.equal(direct.json.paragraphs.length, 1);
});

test('when research fails, the owner’s question gets an honest no-answer, not Gustafson', async () => {
  for (const [answers, text] of [
    [
      'part',
      'Gustafson v. Alloyd Co. (1995) narrowed the securities statute, a win for corporate interests.',
    ],
    ['exact', 'You are probably asking about Gustafson v. Alloyd Co., Inc., 513 U.S. 561 (1995).'],
  ]) {
    const { json, requests } = await askWithFetch(
      (request, input) => {
        if (request.tools) return Response.json({ error: { code: 'server_error' } }, { status: 500 });
        assert.equal(input.search, 'unavailable');
        return atlasReply({
          asks: 'a 1995 statute enacted over a Clinton veto',
          answers,
          needsWeb: false,
          paragraphs: [{ text, citations: [excerptNumber(input, /Gustafson/)] }],
        });
      },
      { question: pslra },
    );
    assert.deepEqual(
      requests.map((request) => Boolean(request.tools)),
      [true, false],
    );
    assert.deepEqual(json, { paragraphs: [], sources: [], search: 'unavailable' });
  }
});
