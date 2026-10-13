/* Exercise the actual reversible visibility filter on old caches and imports. */
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const review = JSON.parse(fs.readFileSync(path.join(__dirname, 'practice-filter.json'), 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));
const release = JSON.parse(fs.readFileSync(path.join(root, 'work/build/version.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'work/build', release.file), 'utf8');
const seed = JSON.parse(html.match(/<script\b[^>]*\bid="seedData"[^>]*>([\s\S]*?)<\/script>/)[1]);
const originals = clone(seed),
  ids = new Set(review.excluded.map((record) => record.id));
const expectedEdges = seed.edges.filter((edge) => ids.has(edge.source) || ids.has(edge.target)).length;
const owner = seed.nodes.find((node) => node.id === 'problem-awesome');
owner.notes += '\nOwner note: keep my original work.';
owner.updatedAt = '2026-10-12T12:00:00Z';
let saved,
  indexed,
  searched,
  inspections = 0;
const context = {
  window: { LegalAtlas: { ready: true } },
  document: {
    getElementById(id) {
      return id === 'dklaPracticeFilter' ? { textContent: JSON.stringify(review) } : null;
    },
  },
  data: seed,
  selected: { type: 'node', id: 'problem-awesome' },
  focusId: 'problem-awesome',
  trail: { nodes: ['problem-awesome'], edges: [] },
  setTimeout,
  normalize(graph) {
    return clone(graph);
  },
  rebuildIndex() {
    indexed = context.data.nodes.map((node) => node.id);
  },
  saveCache() {
    saved = clone(context.data);
  },
  renderGraph() {
    context.rebuildIndex();
  },
  searchEntries() {
    searched = context.data.nodes.map((node) => node.id);
  },
  renderInspector() {
    inspections++;
  },
  schedule() {},
  mergeGraph(incoming) {
    context.data.nodes.push(...clone(incoming.nodes));
    context.data.edges.push(...clone(incoming.edges));
    return { merged: true };
  },
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'practice-filter.js'), 'utf8'), context);
const api = context.window.DKLAPracticeFilter;
assert.ok(api, 'Filter API missing');
assert.equal(context.data.nodes.length, originals.nodes.length - 27);
assert.equal(context.data.edges.length, originals.edges.length - expectedEdges);
assert.equal(context.data.practiceArchive.nodes.length, 27);
assert.equal(context.data.practiceArchive.edges.length, expectedEdges);
assert.ok(api.archived('problem-awesome').notes.includes('Owner note: keep my original work.'));
assert.equal(context.selected, null);
assert.equal(context.focusId, null);
assert.equal(context.trail, null);
assert.equal(
  indexed.some((id) => ids.has(id)),
  false,
);
assert.equal(
  saved.nodes.some((node) => ids.has(node.id)),
  false,
);
assert.equal(
  context.data.nodes.filter((node) => node.kind === 'Case').length,
  originals.nodes.filter((node) => node.kind === 'Case').length,
);
for (const record of review.retained)
  assert.ok(
    context.data.nodes.some((node) => node.id === record.id),
    record.id + ': useful example removed',
  );
for (const node of originals.nodes.filter((node) => node.kind !== 'Hypothetical'))
  assert.deepEqual(
    context.data.nodes.find((item) => item.id === node.id),
    node,
    node.id + ': nonpractice record altered',
  );
const stable = JSON.stringify(context.data);
api.apply();
context.rebuildIndex();
context.searchEntries();
assert.equal(JSON.stringify(context.data), stable, 'Repeated indexing duplicates archives');
assert.equal(
  searched.some((id) => ids.has(id)),
  false,
);
// Export/reload preserves the detached owner records and does not resurrect them.
context.data = context.normalize(JSON.parse(JSON.stringify(saved)));
context.renderGraph();
assert.ok(api.archived('problem-awesome').notes.includes('Owner note: keep my original work.'));
assert.equal(
  context.data.nodes.some((node) => ids.has(node.id)),
  false,
);
// A legacy cache import and a late new edge are filtered at the actual entry point.
context.data.nodes.push(clone(originals.nodes.find((node) => node.id === 'problem-awesome')));
context.data.edges.push({
  id: 'late-example-link',
  source: 'problem-awesome',
  target: 'offer',
  explanation: 'Legacy reintroduction',
  kind: 'Study link',
});
context.rebuildIndex();
assert.equal(indexed.includes('problem-awesome'), false);
assert.ok(api.archived('problem-awesome').notes.includes('Owner note: keep my original work.'));
assert.ok(context.data.practiceArchive.nodeVersions.some((item) => item.id === 'problem-awesome'));
assert.ok(context.data.practiceArchive.edges.some((edge) => edge.id === 'late-example-link'));
// A new owner edit on a hidden record remains in the recoverable version history.
const later = clone(owner);
later.notes = 'Owner revised this exercise later.';
later.updatedAt = '2026-10-13T12:00:00Z';
context.data.nodes.push(later);
context.saveCache();
assert.equal(api.archived('problem-awesome').notes, 'Owner revised this exercise later.');
assert.ok(
  context.data.practiceArchive.nodeVersions.some((item) =>
    item.record.notes?.includes('keep my original work.'),
  ),
);
// Normalization hides imported prompts before a merge, so preserve its archive
// explicitly even though the native merge only handles nodes and edges.
const importEdit = clone(owner);
importEdit.notes = 'My separately imported owner note.';
importEdit.updatedAt = '2026-10-14T12:00:00Z';
const imported = context.normalize({ nodes: [importEdit], edges: [] });
assert.equal(imported.nodes.length, 0);
context.mergeGraph(imported);
assert.equal(api.archived('problem-awesome').notes, 'My separately imported owner note.');
assert.ok(
  context.data.practiceArchive.nodeVersions.some(
    (item) => item.record.notes === 'Owner revised this exercise later.',
  ),
);
// Repurposing the ID into a real case is outside the reviewed exclusion scope.
const repurposed = clone(originals.nodes.find((node) => node.id === 'problem-awesome'));
repurposed.kind = 'Case';
repurposed.title = 'Owner-authored case';
const incoming = { nodes: [repurposed], edges: [] };
const converted = context.normalize(incoming);
assert.equal(converted.nodes.length, 1);
assert.equal(api.isExcluded(repurposed.id, repurposed), false);
assert.equal(
  JSON.stringify(originals.studyMap),
  JSON.stringify(context.data.studyMap),
  'Practice module changed map geometry',
);
console.log(
  'PASS: explicit filtering, idempotence, old-cache/import resilience, owner-note/version preservation, exports and repurposed-case protection.',
);
