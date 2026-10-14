/* Civil Procedure follows the syllabus of October 1, 2026.

   The readings below were copied by hand from page 3 of
   added-sources/Syllabus 10_1_2026.docx.pdf, independently of the dataset, so
   that neither the dataset (tools/sessions/civil-syllabus.json) nor the code
   that applies it (src/features/sessions/civil-syllabus.js) can drift back to
   the September 3 division without this failing. The real module is run here
   against the real graph seed; no browser and no build output are needed.

     node tools/sessions/civil_syllabus_check.mjs */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const json = (path) => JSON.parse(read(path));

// The cases the October 1 syllabus names in each re-divided week, in its order.
// Eliscu (week 6, after Mottley) is printed too, but has no map entry yet.
const PRINTED = {
  6: 'lacks strawbridge mas-perry afa mottley american-well shoshone smith grable gunn',
  7: 'gibbs aldinger kroger finley exxon shamrock home-depot bechtel wild-oats dart reasor bates livingston hoffman piper',
  8: 'erie-decision swift taxicab',
  9: 'york ragan woods cohen-beneficial byrd hanna-decision sibbach',
};
const named = (week) => PRINTED[week].split(' ').map((id) => 'cp-' + id);

const revision = json('tools/sessions/civil-syllabus.json');
const folder = 'src/data/seedData/nodes-45978ecb29/';
const parts = json(folder + 'manifest.json')
  .parts.filter((p) => p.path)
  .map((p) => p.path);
const seedNodes = (await Promise.all(parts.map((p) => readFile(new URL('src/' + p, root), 'utf8')))).map(
  (text) => JSON.parse(text),
);
const seedCorpus = json('src/data/seedData/civilCorpus-6c92c392a0.json');
const clone = (v) => JSON.parse(JSON.stringify(v));

// Run the shipped module over a graph, the way the page does.
function open(graph) {
  const calls = { index: 0, save: 0 };
  const sandbox = {
    document: {
      getElementById: (id) => (id === 'dklaCivilSyllabus' ? { textContent: JSON.stringify(revision) } : null),
    },
    data: graph,
    nodesById: new Map(graph.nodes.map((n) => [n.id, n])),
    rebuildIndex: () => calls.index++,
    saveCache: () => calls.save++,
    renderInspector() {},
    schedule() {},
    setTimeout() {},
    JSON,
  };
  sandbox.window = sandbox;
  sandbox.LegalAtlas = { ready: true };
  vm.runInNewContext(read('src/features/sessions/civil-syllabus.js'), sandbox);
  assert.ok(sandbox.DKLACivilSyllabus, 'the module did not install');
  return { api: sandbox.DKLACivilSyllabus, calls };
}
const fresh = () => ({ nodes: clone(seedNodes), civilCorpus: clone(seedCorpus) });

// 1. Every edit starts from what the seed actually holds, so none is silently skipped.
const at = (object, path) => path.split('.').reduce((o, k) => o?.[k], object);
const seedById = new Map(seedNodes.map((n) => [n.id, n]));
let edits = 0;
for (const [number, list] of Object.entries(revision.weeks)) {
  const week = seedCorpus.weeks.find((w) => w.number === +number);
  for (const [path, from, to] of list) {
    assert.deepEqual(
      at(week, path),
      from,
      `week ${number} ${path}: the seed no longer holds the September value`,
    );
    assert.notDeepEqual(from, to);
    edits++;
  }
}
for (const [id, list] of Object.entries(revision.entries)) {
  assert.ok(seedById.has(id), 'unknown entry ' + id);
  for (const [path, from, to] of list) {
    assert.deepEqual(
      at(seedById.get(id), path),
      from,
      `${id} ${path}: the seed no longer holds the September value`,
    );
    assert.notDeepEqual(from, to);
    edits++;
  }
}
assert.deepEqual(Object.keys(revision.weeks), ['6', '7', '8', '9'], 'only weeks 6 to 9 changed on October 1');

// 2. The shipped module applies every edit once, and nothing on a second run.
const graph = fresh();
const { api, calls } = open(graph);
assert.equal(api.current(), true, 'the module did not apply the revision when the page became ready');
assert.equal(api.apply(), 0, 'applying twice must change nothing');
assert.deepEqual(calls, { index: 1, save: 1 });
assert.equal(open({ nodes: [], civilCorpus: { weeks: [] } }).api.current(), false);

// 3. Weeks 6 to 9 name the October 1 readings; the other ten weeks are as they were.
const weeks = graph.civilCorpus.weeks;
assert.equal(weeks.length, 14);
for (const week of weeks) {
  const before = seedCorpus.weeks.find((w) => w.number === week.number);
  assert.equal(week.dateLabel, before.dateLabel, 'no date label changed on October 1');
  assert.equal(week.syllabusPage, before.syllabusPage, 'the weeks stay on the same syllabus pages');
  if (PRINTED[week.number]) {
    assert.deepEqual(
      week.namedCases,
      named(week.number),
      `week ${week.number} does not name the October 1 cases`,
    );
    for (const id of week.namedCases)
      assert.ok(
        week.caseAccounts.includes(id),
        `week ${week.number} lists ${id} as named but not as an account`,
      );
  } else assert.deepEqual(week, before, `week ${week.number} must not change`);
}
assert.match(
  weeks[5].instructions,
  /Mottley, Eliscu, American Well Works/,
  'week 6 must name Eliscu where it is printed',
);
assert.match(weeks[7].instructions, /^Continuing venue/, 'week 8 opens with "Continuing venue", as printed');
for (const id of named(6).slice(4)) assert.ok(!weeks[6].namedCases.includes(id), id + ' moved out of week 7');
for (const id of named(8)) assert.ok(!weeks[8].namedCases.includes(id), id + ' moved out of week 9');
assert.deepEqual(
  revision.unmappedReadings.map((r) => [r.week, r.printed]),
  [[6, 'Eliscu']],
);
assert.ok(
  fs.existsSync(new URL('tools/r19/data/briefs/CP-034.md', root)),
  'the Eliscu brief is no longer on file',
);
assert.ok(
  !seedById.has('cp-eliscu'),
  'Eliscu now has a map entry: add it to week 6 and drop it from unmappedReadings',
);

// 4. Week lists and the week tags on entries agree, as they do in the seed.
const tagged = (number) =>
  graph.nodes
    .filter((n) => (n.civilImport?.weeks || []).includes(number) && !/^cp-week-\d+$/.test(n.id))
    .map((n) => n.id)
    .sort();
for (const week of weeks)
  assert.deepEqual(
    [...new Set([...week.caseAccounts, ...week.concepts, ...week.namedCases])].sort(),
    tagged(week.number),
    `week ${week.number}: the listed entries and the entries tagged with the week differ`,
  );
const byId = new Map(graph.nodes.map((n) => [n.id, n]));
assert.deepEqual(byId.get('cp-mottley').civilImport.weeks, [6]);
assert.deepEqual(byId.get('cp-gibbs').civilImport.weeks, [7]);
assert.deepEqual(byId.get('cp-piper').civilImport.weeks, [7, 8]);
assert.deepEqual(byId.get('cp-erie-decision').civilImport.weeks, [8]);
assert.deepEqual(byId.get('cp-york').civilImport.weeks, [9]);
// The four weekly reading-plan notes say what their week records say.
for (const week of weeks.filter((w) => PRINTED[w.number])) {
  const note = byId.get('cp-week-' + week.number);
  assert.equal(note.title, `Week ${week.number} — ${week.title}`);
  assert.equal(note.summary, week.instructions);
  assert.equal(note.sections['Reading plan'], week.instructions);
  assert.deepEqual(note.civilImport.printedRanges, week.readingRanges);
  assert.deepEqual(note.civilImport.weeks, [week.number]);
}

// 5. Work the owner has rewritten is left alone.
const edited = fresh();
edited.nodes.find((n) => n.id === 'cp-week-6').summary = 'My own note about week 6.';
open(edited);
assert.equal(edited.nodes.find((n) => n.id === 'cp-week-6').summary, 'My own note about week 6.');
assert.deepEqual(edited.civilCorpus.weeks[5].namedCases, named(6));

// 6. The page carries the dataset and the module, and says which syllabus it follows.
const manifest = json('src/features/manifest.json').javascript;
assert.ok(
  manifest.includes('src/features/sessions/civil-syllabus.js'),
  'the module is not in the load order',
);
assert.ok(read('tools/r19/assemble.py').includes('embed_json("dklaCivilSyllabus", civil_syllabus)'));
const civil = read('src/runtime/civilCode.js');
assert.ok(
  civil.includes('window.DKLACivilSyllabus?.apply();'),
  'the week view no longer applies the revision first',
);
assert.ok(
  civil.includes('as revised on October 1, 2026'),
  'the semester view no longer says which syllabus it follows',
);
assert.ok(
  civil.includes('Miller · syllabus of September 3, 2026'),
  'the page images are no longer labelled September 3',
);

console.log(
  JSON.stringify({ pass: true, revision: revision.revision, edits, weeks: Object.keys(PRINTED).map(Number) }),
);
