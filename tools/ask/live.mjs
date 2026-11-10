import assert from 'node:assert/strict';

// Opt-in smoke test against an explicitly chosen deployment. Each case can use AI Gateway credits.
// Run with: node tools/ask/live.mjs https://dannykind.wiki
const deployment = URL.parse(process.argv[2] ?? '');
if (
  process.argv.length !== 3 ||
  deployment?.protocol !== 'https:' ||
  deployment.href !== deployment.origin + '/'
) {
  console.error('Usage: node tools/ask/live.mjs https://your-dkla-deployment.example');
  process.exit(2);
}

const endpoint = new URL('/api/ask', deployment);
const scenarios = [
  {
    label: 'Rules Enabling Act',
    question: 'what are the three parts of the rules enabling act',
    check({ answer, atlas, web }) {
      assert.match(answer, /2072/);
      assert.match(answer, /Supreme Court/);
      assert.match(answer, /substantive rights?/i);
      assert.match(answer, /(?:final|finality).{0,90}(?:appeal|1291)/i);
      assert.ok([...atlas, ...web].some(({ id, title, url }) => /2072/.test(id + title + (url ?? ''))));
    },
  },
  {
    label: 'Iqbal citation ranking',
    question: 'Is Iqbal one of the 5 most cited cases ever?',
    check({ answer, search, web, atlas }) {
      assert.equal(search, 'searched');
      assert.ok(
        atlas.some(({ id }) => id === 'cp-iqbal'),
        'Cite the Atlas Iqbal entry or record',
      );
      assert.ok(
        web.some(({ title, url }) =>
          /plausibility|twiqbal|jurisprudence|citations?|most.?cited/i.test(title + ' ' + url),
        ),
        'Cite a web source with citation data',
      );
      assert.match(answer, /top[- ](?:5|five)|rank|fifth|fourth|second|(?:#|\bNo\.\s*)[245]\b/i);
      assert.match(answer, /(?:Westlaw|HeinOnline|Shepard|CourtListener|\bfederal courts?\b|\bdatabase\b)/i);
      assert.match(answer, /\b20(?:1[0-9]|2[0-9])\b/, 'Date the supporting dataset or search');
    },
  },
  {
    label: 'Corner Post plus Loper Bright',
    question:
      'How does Corner Post change when a new business can sue over an old rule? Does Loper Bright answer the same question?',
    check({ answer, search, web, atlas }) {
      assert.equal(search, 'searched');
      assert.ok(
        atlas.some(({ id }) => id === 'lrs-i-loper-bright'),
        'Cite the Atlas Loper Bright entry or record',
      );
      assert.ok(
        web.some(({ title, url }) => {
          const { hostname, pathname } = new URL(url);
          return (
            /(^|\.)(?:supremecourt\.gov|govinfo\.gov|loc\.gov)$/.test(hostname) &&
            !/^\/(?:docket|docketpdf)(?:\/|$)/i.test(pathname) &&
            /corner\s+post|22-1008|603[-/]799/i.test(title + ' ' + url)
          );
        }),
        'Cite the official Corner Post opinion',
      );
      assert.match(answer, /(?:injur|harmed)/i);
      assert.match(answer, /final agency action/i);
      assert.match(answer, /six[- ]year|6[- ]year|2401/i);
      assert.match(answer, /Chevron|statutory interpretation|deference/i);
    },
  },
  {
    label: 'Fabricated case and reporter citation',
    question: 'What did the majority hold in Anderson v. OpenAI, 999 U.S. 999 (2025)?',
    check({ answer, search, web, atlas }) {
      assert.equal(search, 'searched', 'Verify the supplied case and citation on the web');
      if (answer) {
        assert.match(
          answer,
          /(?:can(?:not|'t|’t)|could(?: not|n't|n’t)|unable|does(?: not|n't|n’t)|no (?:such|reliable|matching)|not (?:verified|appear|find))/i,
        );
      } else {
        assert.equal(web.length + atlas.length, 0);
      }
      assert.ok(
        [...web, ...atlas].every(({ title }) => !/Anderson\s+v\.?\s+OpenAI|999\s+U\.S\.\s+999/i.test(title)),
        'Do not cite the fabricated case or reporter reference',
      );
    },
  },
];

for (const { label, question, check } of scenarios) {
  try {
    const start = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { origin: deployment.origin, 'content-type': 'application/json' },
      body: JSON.stringify({ question }),
      redirect: 'error',
      signal: AbortSignal.timeout(40_000),
    });
    if (response.status !== 200) {
      const problem = await response.json().catch(() => null);
      throw Error(`HTTP ${response.status} ${problem?.error ?? ''}`.trim());
    }
    assert.match(response.headers.get('cache-control') ?? '', /\bno-store\b/i);
    const { paragraphs, sources, search } = await response.json();
    assert.ok(Array.isArray(paragraphs));
    assert.ok(Array.isArray(sources));
    for (const { text, citations } of paragraphs) {
      assert.ok(typeof text === 'string' && text.trim());
      assert.ok(Array.isArray(citations) && citations.length);
      assert.ok(citations.every((id) => Number.isInteger(id) && id > 0 && id <= sources.length));
    }
    const web = sources.filter(({ type }) => type === 'web');
    assert.ok(web.every(({ url }) => URL.parse(url)?.protocol === 'https:'));
    const atlas = sources.filter(({ type }) => type !== 'web');
    const answer = paragraphs.map(({ text }) => text).join('\n');
    console.log(`\n${label} (${((Date.now() - start) / 1000).toFixed(1)} s)`);
    console.log(answer || '[No supported answer]');
    for (const { title, id, url } of sources) console.log('  - ' + title + ' · ' + (url ?? id));
    check({ answer, search, web, atlas });
    console.log('PASS');
  } catch (error) {
    process.exitCode = 1;
    console.error('FAIL ' + label + ': ' + error.message);
  }
}
