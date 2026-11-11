import assert from 'node:assert/strict';

// Opt-in smoke test against an explicitly chosen deployment. Each case can use OpenAI API credits.
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
            /(?:^|\.)(?:supremecourt\.gov|govinfo\.gov|loc\.gov|supreme\.justia\.com)$/.test(hostname) &&
            !/^\/(?:docket|docketpdf)(?:\/|$)/i.test(pathname) &&
            /corner\s+post|22-1008|603[-/]799/i.test(title + ' ' + url)
          );
        }),
        'Cite the Corner Post opinion text from the court or an opinion library',
      );
      assert.match(answer, /(?:injur|harmed)/i);
      assert.match(answer, /final agency action/i);
      assert.match(answer, /six[- ]year|6[- ]year|2401/i);
      assert.match(answer, /Chevron|statutory interpretation|deference/i);
    },
  },
  {
    // The owner's question (November 2026), typos and all. Asked with progress, as the browser
    // asks, so this also checks the relayed OpenAI stream.
    label: 'Owner’s 1995 statute question, with progress',
    question: 'what statute in 1995 was a vicotry for corporate itnerest that overrode a clinton veto',
    progress: true,
    check({ answer, search, web, steps }) {
      assert.equal(search, 'searched');
      assert.match(answer, /Private Securities Litigation Reform Act|PSLRA|H\.?\s?R\.?\s?1058|104-67/i);
      assert.doesNotMatch(answer, /probably asking|did you mean/i);
      assert.ok(web.length, 'Cite web evidence for the statute');
      assert.ok(steps.includes('searching') && steps.includes('checking'), 'Report real progress');
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

// A reply with progress: one JSON object per line, the last the answer (or an error).
async function readLines(response) {
  const lines = (await response.text())
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
  const last = lines.at(-1);
  if (!last?.answer) throw Error(`Stream ended with ${JSON.stringify(last)}`);
  return {
    reply: last.answer,
    steps: lines.filter((line) => line.progress).map(({ progress }) => progress.step),
  };
}

for (const { label, question, check, progress } of scenarios) {
  try {
    const start = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        origin: deployment.origin,
        'content-type': 'application/json',
        ...(progress && { accept: 'application/x-ndjson' }),
      },
      body: JSON.stringify({ question }),
      redirect: 'error',
      signal: AbortSignal.timeout(50_000),
    });
    if (response.status !== 200) {
      const problem = await response.json().catch(() => null);
      throw Error(`HTTP ${response.status} ${problem?.error ?? ''}`.trim());
    }
    assert.match(response.headers.get('cache-control') ?? '', /\bno-store\b/i);
    const { reply, steps = [] } = progress ? await readLines(response) : { reply: await response.json() };
    const { paragraphs, sources, search } = reply;
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
    if (progress) console.log('  progress: ' + steps.join(', '));
    check({ answer, search, web, atlas, steps });
    console.log('PASS');
  } catch (error) {
    process.exitCode = 1;
    console.error('FAIL ' + label + ': ' + error.message);
  }
}
