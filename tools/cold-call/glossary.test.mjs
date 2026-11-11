/* The Cold Call definition matcher (src/features/cold-call/glossary.js), the same file the reader runs.
   node --test tools/cold-call/glossary.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const context = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'src/features/cold-call/glossary.js'), 'utf8'), context);
const { compile, annotate, sentences, markup } = context.DKLAColdCallGloss;

const term = (key, match, extra = {}) => ({
  key,
  label: key,
  wex: null,
  match,
  gloss: key + ' means something.',
  ...extra,
});
const table = (terms, density) => ({ version: 1, source: 'test', density, terms });
// The linked words of one paragraph, in order.
// (Array.from: the matcher runs in its own realm, and deepEqual compares prototypes.)
const words = (g, text, seen) => Array.from(annotate(g, text, seen), (l) => text.slice(l.start, l.end));
const keys = (g, text, seen) => Array.from(annotate(g, text, seen), (l) => l.key);

test('whole words, case-insensitive, longest form wins', () => {
  const g = compile(
    table([
      term('motion', ['motion', 'motions']),
      term('motion-to-dismiss', ['motion to dismiss', 'moved to dismiss']),
      term('remove', ['remove', 'removed']),
    ]),
  );
  assert.deepEqual(words(g, 'The motion to dismiss failed.'), ['motion to dismiss']);
  assert.deepEqual(keys(g, 'The motion to dismiss failed.'), ['motion-to-dismiss']);
  assert.deepEqual(words(g, 'It moved to   dismiss\nat once.'), ['moved to   dismiss']);
  assert.deepEqual(words(g, 'A removable, post-removed, unremoved promotion.'), []);
  assert.deepEqual(words(g, 'Motions were filed.'), ['Motions'], 'sentence-initial capital is fine');
});

test('a capitalised match in mid-sentence is skipped unless caps is set', () => {
  const g = compile(
    table([
      term('federal-rule', ['federal rules']),
      term('remand', ['remand']),
      term('erie', ['erie'], { caps: true }),
    ]),
  );
  assert.deepEqual(words(g, 'Under the Federal Rules of Civil Procedure, pleading is easy.'), []);
  assert.deepEqual(words(g, 'Federal rules govern.'), ['Federal rules']);
  assert.deepEqual(words(g, 'The federal rules govern.'), ['federal rules']);
  assert.deepEqual(words(g, 'Under the Federal rules here.'), [], 'any capital in mid-sentence');
  assert.deepEqual(words(g, 'The judge said Remand was proper.'), []);
  assert.deepEqual(words(g, 'It was over. Remand followed.'), ['Remand'], 'start of a later sentence');
  assert.deepEqual(words(g, 'It cited “Remand” as a heading.'), []);
  assert.deepEqual(words(g, 'It followed Erie closely.'), ['Erie']);
  // An abbreviation does not end a sentence, so the capital after it is still mid-sentence.
  assert.deepEqual(words(g, 'See Hanna v. Remand Corp. for the point.'), []);
  assert.deepEqual(words(g, 'Under the U.S. Remand statute it failed.'), []);
});

test('overlapping forms: the earlier, longer match takes the words', () => {
  const g = compile(
    table([
      term('cause-of-action', ['cause of action', 'causes of action']),
      term('action', ['action']),
      term('in-rem', ['in rem'], { except: ['quasi in rem'] }),
      term('quasi-in-rem', ['quasi in rem']),
    ]),
  );
  assert.deepEqual(keys(g, 'Two causes of action remained.'), ['cause-of-action']);
  assert.deepEqual(keys(g, 'The action stated one cause of action.'), ['action', 'cause-of-action']);
  assert.deepEqual(keys(g, 'It proceeded quasi in rem against land.'), ['quasi-in-rem']);
  assert.deepEqual(keys(g, 'It proceeded in rem against land.'), ['in-rem']);
});

test('a context pattern must occur in the same sentence', () => {
  const g = compile(
    table([
      term('removal', ['removal', 'removed'], { context: '\\bfederal\\s+court\\b|\\bremand\\w*' }),
      term('strike', ['strike', 'struck'], {
        context: '\\b(?:pleading|paragraphs?|defen[cs]es?|motion)\\b',
        except: ['struck down', 'strike down'],
      }),
    ]),
  );
  assert.deepEqual(words(g, 'Hilton removed the action to federal court.'), ['removed']);
  assert.deepEqual(words(g, 'The President removed the commissioner.'), []);
  assert.deepEqual(
    words(g, 'The President removed the commissioner. He later sued in federal court.'),
    [],
    'context in the next sentence does not count',
  );
  assert.deepEqual(words(g, 'After removal, the court ordered a remand.'), ['removal']);
  assert.deepEqual(words(g, 'The train struck him on the platform.'), []);
  assert.deepEqual(words(g, 'Roberts struck paragraphs 5–8 as redundant.'), ['struck']);
  assert.deepEqual(words(g, 'The Court struck down the statute and its defenses.'), [], 'except phrase');
  assert.deepEqual(
    words(g, 'The Court struck down one law but struck the defense from the pleading.'),
    ['struck'],
    'an except phrase covers only its own words',
  );
});

test('first occurrence per section, at most maxPerParagraph, never back to back', () => {
  const g = compile(
    table(
      [
        term('defamation', ['defamation']),
        term('slander', ['slander']),
        term('libel', ['libel']),
        term('damages', ['damages']),
        term('motion', ['motion']),
        term('motion-to-dismiss', ['motion to dismiss']),
      ],
      { perSection: 1, maxPerParagraph: 2 },
    ),
  );
  const seen = new Set();
  assert.deepEqual(words(g, 'He sued for defamation and later for slander.', seen), [
    'defamation',
    'slander',
  ]);
  assert.deepEqual(
    words(g, 'The defamation claim and the slander claim and the libel claim.', seen),
    ['libel'],
    'already linked in this section',
  );
  assert.deepEqual(
    words(g, 'Libel and damages and defamation.', new Set()),
    ['Libel', 'damages'],
    'per-paragraph cap',
  );
  assert.deepEqual(
    words(g, 'It alleged defamation, slander and libel.', new Set()),
    ['defamation', 'libel'],
    'back to back',
  );
  assert.deepEqual(words(g, 'It alleged defamation slander.', new Set()), ['defamation']);
  // A form that is already linked keeps its words: a shorter term inside it does not link instead.
  const once = new Set(['motion-to-dismiss']);
  assert.deepEqual(words(g, 'A second motion to dismiss followed.', once), []);
});

test('sentences: abbreviations, initials and citations do not split', () => {
  const text =
    'Hanna v. Plumer, 380 U.S. 460 (1965), applied Rule 4(d)(1). Judge J. Smith agreed. e.g. this. Done!';
  const parts = Array.from(sentences(text), ([a, b]) => text.slice(a, b).trim());
  assert.deepEqual(parts, [
    'Hanna v. Plumer, 380 U.S. 460 (1965), applied Rule 4(d)(1).',
    'Judge J. Smith agreed. e.g. this.',
    'Done!',
  ]);
});

test('markup escapes the text and wraps only the matched words', () => {
  const g = compile(table([term('relief', ['relief'])]));
  const text = 'A & B sought <relief> "now".';
  const html = markup(text, annotate(g, text));
  assert.equal(
    html,
    'A &amp; B sought &lt;<span class="cc-term" role="button" tabindex="0" data-cc-term="relief" aria-haspopup="dialog" aria-expanded="false" aria-describedby="ccGlossDesc-relief">relief</span>&gt; &quot;now&quot;.',
  );
  assert.equal(
    html
      .replace(/<span[^>]*>([^<]*)<\/span>/g, '$1')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&'),
    text,
  );
});

test('apostrophes match either way', () => {
  const g = compile(table([term('courts-power', ["court's power"])]));
  assert.deepEqual(words(g, 'It doubted the court’s power.'), ['court’s power']);
});

test('a malformed table is refused', () => {
  assert.throws(() => compile(table([term('a', ['Motion'])])), /lowercase/);
  assert.throws(() => compile(table([term('a', ['motion']), term('b', ['motion'])])), /both a and b/);
  assert.throws(() => compile(table([term('a', ['x']), term('a', ['y'])])), /Duplicate/);
  assert.throws(() => compile(table([term('a', ['x'], { context: '(' })])), /Invalid regular expression/);
  assert.throws(() => compile({ version: 2, terms: [] }), /Unknown/);
});

test('the committed term table compiles, links to real dictionary entries and stays short', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'tools/cold-call/glossary-terms.json'), 'utf8'));
  const g = compile(raw);
  assert.ok(g.terms.size >= 1);
  const slugs = new Set(
    fs
      .readdirSync(path.join(root, 'src/data/dklaGlossary'))
      .filter((d) => d.startsWith('terms-'))
      .flatMap((d) => fs.readdirSync(path.join(root, 'src/data/dklaGlossary', d)))
      .map((f) => f.replace(/^\d+-(.*)-[0-9a-f]{10}\.json$/, '$1')),
  );
  for (const t of g.terms.values()) {
    if (t.wex) assert.ok(slugs.has(t.wex), `${t.key}: Wex slug ${t.wex} is not in the DKLA dictionary`);
    assert.ok(t.gloss.length <= 420, `${t.key}: the definition is too long for a card`);
  }
});

test('a 2,400-word narrative annotates in a few milliseconds', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'tools/cold-call/glossary-terms.json'), 'utf8'));
  const g = compile(raw);
  const garcia = JSON.parse(
    fs.readFileSync(path.join(root, 'tools/cold-call/narratives/cp-garcia.json'), 'utf8'),
  );
  const paragraphs = garcia.sections.flatMap((s) => s.paragraphs);
  const text = [];
  let count = 0;
  while (count < 2400) for (const p of paragraphs) (text.push(p), (count += p.split(/\s+/).length));
  const run = () => {
    let seen = new Set();
    text.forEach((p, i) => {
      if (i % 3 === 0) seen = new Set();
      annotate(g, p, seen);
    });
  };
  for (let i = 0; i < 20; i++) run();
  const began = performance.now();
  for (let i = 0; i < 20; i++) run();
  const ms = (performance.now() - began) / 20;
  console.log(`annotate: ${count} words in ${ms.toFixed(2)} ms`);
  assert.ok(ms < 20, `annotating ${count} words took ${ms.toFixed(1)} ms`);
});
