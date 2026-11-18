import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { caseLike, indexCorpus, statuteLike } from '../../lib/ask/retrieve.js';
import { route } from '../../lib/ask/web.js';

const read = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const block = (text, id) => {
  const start = text.indexOf('id="' + id + '"');
  assert.ok(start >= 0, id + ' is embedded');
  return JSON.parse(text.slice(text.indexOf('>', start) + 1, text.indexOf('</script>', start)));
};
const entries = JSON.parse(read('tools/canons/data/index.json'));
const hosted = read('dist/DKLA-v3.1.html');
assert.deepEqual(block(hosted, 'dklaCanonsData'), entries);
assert.deepEqual(block(read('work/build/DKLA-v3.1.html'), 'dklaCanonsData'), entries);
const seed = new Set(block(hosted, 'seedData').nodes.map(({ id }) => id));
const briefs = new Set(block(hosted, 'dklaR19Data').entries.map(([id]) => id));
const ids = new Set();
for (const entry of entries) {
  assert.match(entry.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(!ids.has(entry.id), entry.id + ' is unique');
  ids.add(entry.id);
  for (const key of ['name', 'category', 'definition', 'use', 'limits']) {
    assert.ok(typeof entry[key] === 'string' && entry[key].trim(), entry.id + ' has ' + key);
  }
  assert.ok(Array.isArray(entry.aliases), entry.id + ' aliases');
  assert.ok(entry.sources.length, entry.id + ' has sources');
  for (const source of entry.sources) {
    assert.ok(source.label && source.pinpoint, entry.id + ' has a pinpointed source');
    assert.ok(['explicit', 'application'].includes(source.kind), entry.id + ' has a source type');
    if (source.id) assert.ok(seed.has(source.id), entry.id + ' has a live Atlas source ' + source.id);
    if (source.brief) assert.ok(briefs.has(source.brief), entry.id + ' has a live supporting brief');
  }
}
for (const core of ['noscitur-a-sociis', 'ejusdem-generis', 'rule-of-lenity', 'constitutional-avoidance']) {
  assert.ok(ids.has(core), 'includes ' + core);
}
console.log(entries.length + ' source-checked canons in the hosted and portable Atlas.');

const decks = JSON.parse(read('tools/canons/data/lectures.json'));
assert.deepEqual(block(hosted, 'dklaLecturesData'), decks);
assert.deepEqual(block(read('work/build/DKLA-v3.1.html'), 'dklaLecturesData'), decks);
const charts = new Set(block(hosted, 'dklaFlowchartsData').map(({ id }) => id));
const ask = JSON.parse(
  gunzipSync(readFileSync(new URL('../../work/build/ask-corpus.json.gz', import.meta.url))),
);
const lectureIds = new Set(ask.filter(({ type }) => type === 'lecture').map(({ id }) => id));
const canonIds = new Set(ask.filter(({ type }) => type === 'canon').map(({ id }) => id));
assert.deepEqual(canonIds, ids, 'Ask Dottie indexes every canon');
const deckIds = new Set();
for (const deck of decks) {
  const id = deck.course + '-' + deck.number;
  assert.ok(!deckIds.has(id), id + ' is unique');
  deckIds.add(id);
  assert.ok(deck.file.endsWith('.pptx') && deck.title && deck.slideCount > 0 && deck.topics.length);
  assert.match(deck.sha256, /^[a-f0-9]{64}$/);
  for (const [offset, note] of [...deck.topics, ...deck.conflicts].entries()) {
    assert.ok(lectureIds.has(id + ':' + (offset + 1)), 'Ask Dottie indexes ' + id + ':' + (offset + 1));
    assert.ok(note.heading && note.body && note.slides.length);
    assert.ok(note.slides.every((n) => Number.isInteger(n) && n >= 1 && n <= deck.slideCount));
    if (note.authority) {
      const url = new URL(note.authority.url);
      assert.ok(url.protocol === 'https:' && !url.username && !url.password && note.authority.label);
    }
    assert.ok(
      note.nodes.every((node) => seed.has(node)),
      id + ' links to actual Atlas entries: ' + note.nodes,
    );
    assert.ok(
      (note.charts || []).every((chart) => charts.has(chart)),
      id + ' links to actual flowcharts',
    );
  }
}
for (const [course, first, last] of [
  ['lrs', 13, 22],
  ['contracts', 15, 24],
])
  for (let i = first; i <= last; i++) assert.ok(deckIds.has(course + '-' + i), 'lecture on file');
console.log(
  decks.length + ' lecture decks linked to the Atlas, with ' + lectureIds.size + ' notes in Ask Dottie.',
);
for (const entry of entries)
  for (const source of entry.sources)
    if (source.lecture) assert.ok(deckIds.has(source.lecture), 'canon lecture reference opens a known class');
const retrieve = indexCorpus(ask);
assert.equal(statuteLike({ type: 'lecture', title: 'LRS Class 19 · § 553' }), false);
assert.equal(caseLike({ type: 'lecture', title: 'Contracts Class 16 · Dalton v. ETS' }), false);
for (const lesson of ['LRS Class 22', 'Contracts Class 20']) {
  const question = 'What did we discuss in ' + lesson + '?';
  const { sources, signals } = retrieve.explain(question);
  assert.equal(sources[0].type, 'lecture');
  assert.ok(sources[0].title.startsWith(lesson), 'retrieves the lecture for the right course');
  assert.equal(route(question, sources, { signals }).research, false, 'uses the slides without web search');
}
