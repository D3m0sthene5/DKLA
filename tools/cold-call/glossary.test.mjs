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

test('first occurrence per section, at most maxPerParagraph, two plain words between links', () => {
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
    words(g, 'Libel came first, then damages, and finally defamation.', new Set()),
    ['Libel', 'damages'],
    'per-paragraph cap',
  );
  // At least two plain words between links: "removed the action" links only the first term.
  assert.deepEqual(words(g, 'It sought damages and libel.', new Set()), ['damages']);
  assert.deepEqual(words(g, 'It sought damages and also libel.', new Set()), ['damages', 'libel']);
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
      .flatMap((d) =>
        fs
          .readdirSync(path.join(root, 'src/data/dklaGlossary', d))
          .map((f) => path.join(root, 'src/data/dklaGlossary', d, f)),
      )
      // The slug inside the record: file names drop characters such as the brackets in "(alj)".
      .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')).slug),
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

// ---- plain-English versions of whole sentences (the same file; tools/cold-call/plain-sentences.json)
const { compilePlain, placeSentences } = context.DKLAColdCallGloss;
const plainTable = (sentences) => ({ version: 1, source: 'test', sentences });
const entriesOf = (list, caseId = 'c', at = '0.0') =>
  compilePlain(plainTable({ [caseId]: list }))
    .cases.get(caseId)
    .get(at);
const MARKER = /<span class="cc-plain"[^>]*data-cc-plain-from="(\d+)"[^>]*><\/span>/g;
// What the reader would show, with links unwrapped and markers removed: it must be the text, unchanged.
const unwrap = (html) =>
  html
    .replace(MARKER, '')
    .replace(/<span class="cc-term"[^>]*>([^<]*)<\/span>/g, '$1')
    .replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[e]);
// Markup for one paragraph, as begin() draws it: links first, then markers placed around them.
function draw(g, text, list) {
  const links = g ? annotate(g, text) : [];
  const marks = placeSentences(text, entriesOf(list), links).map((m, i) => ({ ...m, id: 'p' + i }));
  return markup(text, links, marks);
}

test('plain English: a sentence at the end of its paragraph gets its marker after the full stop', () => {
  const text =
    'Erie lost below. Tompkins claimed longstanding open use made him a licensee entitled to ordinary care.';
  const html = draw(null, text, [
    { at: '0.0', sentence: text.slice(17), plain: 'He said he was allowed there.' },
  ]);
  assert.ok(
    html.endsWith(
      'ordinary care.<span class="cc-plain" role="button" tabindex="0" data-cc-plain="p0" data-cc-plain-from="17" aria-label="In plain English" aria-haspopup="dialog" aria-expanded="false" aria-describedby="ccPlainDesc-p0"></span>',
    ),
  );
  assert.equal(unwrap(html), text);
  // In the middle: right after the full stop, before the space.
  const mid = draw(null, text, [{ at: '0.0', sentence: 'Erie lost below.', plain: 'x' }]);
  assert.match(mid, /^Erie lost below\.<span class="cc-plain"[^>]*><\/span> Tompkins/);
  // Listed without its full stop: the marker still goes after the punctuation.
  const bare = draw(null, text, [{ at: '0.0', sentence: 'Erie lost below', plain: 'x' }]);
  assert.match(bare, /^Erie lost below\.<span class="cc-plain"/);
});

test('plain English: a sentence containing definition links keeps them whole, marker outside', () => {
  const g = compile(
    table([
      term('motion-to-dismiss', ['moved to dismiss']),
      term('privilege', ['privileged', 'conditionally privileged']),
    ]),
  );
  const text =
    'Hilton moved to dismiss because the accusation was conditionally privileged. Roberts disagreed.';
  const html = draw(g, text, [{ at: '0.0', sentence: text.slice(0, 77), plain: 'x' }]);
  assert.match(
    html,
    /<span class="cc-term"[^>]*data-cc-term="motion-to-dismiss"[^>]*>moved to dismiss<\/span>/,
  );
  assert.match(
    html,
    /data-cc-term="privilege"[^>]*>conditionally privileged<\/span>\.<span class="cc-plain"[^>]*data-cc-plain-from="0"[^>]*><\/span> Roberts/,
  );
  assert.equal(unwrap(html), text);
  // A marker that would fall inside a link (a sentence listed as ending inside "U.S.") moves to its end.
  const g2 = compile(table([term('us', ['u.s.'], { caps: true })]));
  const t2 = 'Garcia sued in the U.S. court system today.';
  const links = annotate(g2, t2);
  assert.equal(t2.slice(links[0].start, links[0].end), 'U.S.');
  const marks = placeSentences(
    t2,
    entriesOf([{ at: '0.0', sentence: 'Garcia sued in the U', plain: 'x' }]),
    links,
  );
  assert.equal(marks[0].end, links[0].end);
  const h2 = markup(
    t2,
    links,
    marks.map((m) => ({ ...m, id: 'p0' })),
  );
  assert.match(h2, /U\.S\.<\/span><span class="cc-plain"/);
  assert.equal(unwrap(h2), t2);
});

test('plain English: curly and straight quotes, spacing, closing quotes and brackets', () => {
  const text = 'The court said “the State’s law governs.” Then\nit   reversed (on Erie’s view.) Done.';
  // Straight quotes and single spaces in the table still find the curly, oddly spaced text.
  const html = draw(null, text, [
    { at: '0.0', sentence: 'The court said "the State\'s law governs."', plain: 'a' },
    { at: '0.0', sentence: "Then it reversed (on Erie's view.", plain: 'b' },
  ]);
  assert.match(html, /governs\.”<span class="cc-plain"[^>]*data-cc-plain-from="0"[^>]*><\/span> Then/);
  assert.match(html, /view\.\)<span class="cc-plain"[^>]*><\/span> Done\./);
  assert.equal(unwrap(html), text);
});

test('plain English: a sentence not in its paragraph is skipped; two ending at one place keep the first', () => {
  const text = 'One. Two three.';
  assert.equal(placeSentences(text, entriesOf([{ at: '0.0', sentence: 'Four.', plain: 'x' }])).length, 0);
  const both = placeSentences(
    text,
    entriesOf([
      { at: '0.0', sentence: 'Two three.', plain: 'x' },
      { at: '0.0', sentence: 'three.', plain: 'y' },
    ]),
  );
  assert.equal(both.length, 1);
  assert.equal(both[0].entry.plain, 'x');
  assert.equal(draw(null, text, [{ at: '0.0', sentence: 'Absent.', plain: 'x' }]), 'One. Two three.');
});

test('plain English: a malformed table is refused', () => {
  assert.throws(() => compilePlain({ version: 2, sentences: {} }), /Unknown/);
  assert.throws(() => compilePlain(plainTable({ c: {} })), /list/);
  assert.throws(() => compilePlain(plainTable({ c: [{ at: '1', sentence: 's', plain: 'p' }] })), /bad "at"/);
  assert.throws(
    () => compilePlain(plainTable({ c: [{ at: '01.2', sentence: 's', plain: 'p' }] })),
    /bad "at"/,
  );
  assert.throws(
    () => compilePlain(plainTable({ c: [{ at: '1.2', sentence: ' ', plain: 'p' }] })),
    /sentence/,
  );
  assert.throws(() => compilePlain(plainTable({ c: [{ at: '1.2', sentence: 's' }] })), /plain/);
  assert.ok(compilePlain(plainTable({ c: [{ at: '2.followUp-answer', sentence: 's', plain: 'p' }] })));
});

// begin() in a page with both tables: the reader's chunks, follow-up answers and screen-reader descriptions.
function page(glossaryTable, plain) {
  const blocks = { dklaColdCallGlossary: glossaryTable, dklaColdCallPlain: plain };
  const ctx = vm.createContext({
    console,
    document: {
      getElementById: (id) => (blocks[id] ? { textContent: JSON.stringify(blocks[id]) } : null),
    },
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'src/features/cold-call/glossary.js'), 'utf8'), ctx);
  return ctx.DKLAColdCallGloss;
}

test('plain English: begin() puts each marker in the chunk where its sentence ends', () => {
  const gl = page(
    table([term('licensee', ['licensee'])]),
    plainTable({
      erie: [
        { at: '0.1', sentence: 'Second part starts here.', plain: 'The second.' },
        { at: '0.1', sentence: 'Missing sentence.', plain: 'Never drawn.' },
        { at: '2.followUp-answer', sentence: 'He was a licensee.', plain: 'Allowed <there> & "safe".' },
      ],
      other: [{ at: '0.1', sentence: 'First part.', plain: 'Not this account.' }],
    }),
  );
  const run = gl.begin('erie');
  const section = run.section();
  const text = 'First part.  Second part starts here.';
  const [a, b] = section.chunks(text, '0.1', ['First part.', 'Second part starts here.']);
  assert.equal(a, 'First part.');
  assert.match(
    b,
    /^Second part starts here\.<span class="cc-plain"[^>]*data-cc-plain="p0" data-cc-plain-from="0"/,
  );
  // The same paragraph under another name gets no marker.
  assert.equal(section.text('Second part starts here.', '0.0'), 'Second part starts here.');
  const follow = run.section().text('He was a licensee.', '2.followUp-answer');
  assert.match(
    follow,
    /data-cc-term="licensee"[^>]*>licensee<\/span>\.<span class="cc-plain"[^>]*data-cc-plain="p1"/,
  );
  assert.deepEqual(
    Array.from(gl.plainShown(), (e) => [e.id, e.at, e.n]),
    [
      ['p0', '0.1', 0],
      ['p1', '2.followUp-answer', 2],
    ],
  );
  const descriptions = run.descriptions();
  assert.ok(descriptions.includes('<span id="ccPlainDesc-p0">The second.</span>'));
  assert.ok(
    descriptions.includes('<span id="ccPlainDesc-p1">Allowed &lt;there&gt; &amp; &quot;safe&quot;.</span>'),
  );
  assert.ok(!descriptions.includes('Never drawn'));
  // A new rendering starts afresh, and an account with no entries draws no markers.
  const none = gl.begin('nobody');
  assert.equal(none.section().text('First part.', '0.1'), 'First part.');
  assert.equal(gl.plainShown().length, 0);
});

test('the committed plain-English table compiles and every version is short', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'tools/cold-call/plain-sentences.json'), 'utf8'));
  const p = compilePlain(raw);
  assert.ok(p.source);
  // The three original accounts (Hamer, Pennoyer, Chadha) are in cases.json; every other one has its own file.
  const originals = new Set(
    JSON.parse(fs.readFileSync(path.join(root, 'tools/cold-call/cases.json'), 'utf8')).cases.map((c) => c.id),
  );
  for (const [caseId, byAt] of p.cases) {
    assert.ok(
      originals.has(caseId) || fs.existsSync(path.join(root, 'tools/cold-call/narratives', caseId + '.json')),
      `${caseId}: no such narrative`,
    );
    for (const entry of [...byAt.values()].flat()) {
      assert.ok(entry.plain.length <= 600, `${caseId} ${entry.at}: the plain version is too long for a card`);
      assert.ok(
        sentences(entry.plain).length <= 3,
        `${caseId} ${entry.at}: the plain version is more than three sentences`,
      );
    }
  }
});

test('a 2,400-word narrative with ten plain-English sentences draws in a few milliseconds', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'tools/cold-call/glossary-terms.json'), 'utf8'));
  const erie = JSON.parse(
    fs.readFileSync(path.join(root, 'tools/cold-call/narratives/cp-erie-decision.json'), 'utf8'),
  );
  const paragraphs = erie.sections.flatMap((s) => s.paragraphs);
  // Ten entries: the first sentence of ten paragraphs, all listed under one paragraph name.
  const list = paragraphs
    .slice(0, 10)
    .map((p) => ({ at: '0.0', sentence: p.split('. ')[0] + '.', plain: 'x' }));
  const gl = page(raw, plainTable({ erie: list }));
  const text = [];
  let count = 0;
  while (count < 2400) for (const p of paragraphs) (text.push(p), (count += p.split(/\s+/).length));
  const run = () => {
    const r = gl.begin('erie');
    let section = r.section();
    text.forEach((p, i) => {
      if (i % 3 === 0) section = r.section();
      section.chunks(p, '0.0', [p]);
    });
    return gl.plainShown().length;
  };
  for (let i = 0; i < 20; i++) run();
  assert.ok(run() >= 10, 'the ten sentences were not all found');
  const began = performance.now();
  for (let i = 0; i < 20; i++) run();
  const ms = (performance.now() - began) / 20;
  console.log(`definitions and plain English: ${count} words in ${ms.toFixed(2)} ms`);
  assert.ok(ms < 20, `drawing ${count} words took ${ms.toFixed(1)} ms`);
});

test('more terms than links: the less common terms get the links, in reading order', () => {
  const g = compile(
    table(
      [
        term('claim', ['claim'], { common: true }),
        term('appeal', ['appeal'], { common: true }),
        term('compromise', ['compromised']),
        term('severance-pay', ['severance pay']),
      ],
      { perSection: 1, maxPerParagraph: 3 },
    ),
  );
  const text = 'His claim went on appeal, he sought severance pay, and the claim was later compromised.';
  assert.deepEqual(words(g, text), ['claim', 'severance pay', 'compromised']);
  // With room for all of them, every term links.
  assert.deepEqual(words(g, 'The claim went on to appeal.'), ['claim', 'appeal']);
});

test("a one-word name in the account's own title never links there", () => {
  const gl = page(
    table([term('garcia', ['garcia'], { caps: true }), term('remand', ['remand'])]),
    plainTable({}),
  );
  const own = gl.begin('cp-garcia', 'Garcia v. Hilton Hotels International');
  const html = own.section().text('Garcia sued, and the court ordered a remand.', '0.0');
  assert.ok(!/data-cc-term="garcia"/.test(html) && /data-cc-term="remand"/.test(html), html);
  const other = gl.begin('cp-other', 'National League of Cities v. Usery');
  assert.match(other.section().text('Garcia later overruled it.', '0.0'), /data-cc-term="garcia"/);
});
