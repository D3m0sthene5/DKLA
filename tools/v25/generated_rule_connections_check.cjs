/* Exercise the actual r21 adapter's exact-value guards on generated links. */
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const review = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'generated-rule-connections-review.json'), 'utf8'),
);
const audit = JSON.parse(fs.readFileSync(path.join(root, 'tools/r19/data/r21-audit.json'), 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));
const originals = review.reviewedEdges.map((record) => ({
  id: record.id,
  source: record.sourceId,
  target: record.targetId,
  label: record.label,
  explanation: record.explanation,
}));
const context = {
  window: { LegalAtlas: { ready: true } },
  document: {
    getElementById() {
      return { textContent: JSON.stringify(audit) };
    },
  },
  data: { nodes: [], edges: clone(originals) },
  nodesById: new Map(),
  mapData() {
    return { districts: {}, regions: [], homes: {} };
  },
  setTimeout() {},
  rebuildIndex() {},
  saveCache() {},
  renderInspector() {},
  schedule() {},
};
vm.runInNewContext(fs.readFileSync(path.join(root, 'tools/r19/audit.js'), 'utf8'), context);
const apply = context.window.DKLAAudit.apply;
for (const proposal of review.proposals) {
  assert.equal(context.data.edges.find((edge) => edge.id === proposal.id)[proposal.field], proposal.new);
}
const stable = JSON.stringify(context.data.edges);
apply();
assert.equal(JSON.stringify(context.data.edges), stable, 'Repeated audit application changed settled links.');
// A cache may contain owner-authored labels and explanations. Only the exact
// recorded old values are eligible; none of these owner fields may be replaced.
context.data.edges = clone(originals);
for (const proposal of review.proposals)
  context.data.edges.find((edge) => edge.id === proposal.id)[proposal.field] =
    'Owner revised ' + proposal.field + ' for ' + proposal.id;
const owner = JSON.stringify(context.data.edges);
apply();
assert.equal(JSON.stringify(context.data.edges), owner, 'Audit overwrote owner-authored connection prose.');
// Rule links can arrive after the initial audit. Its later reapplication must
// update legacy defaults without changing the independently edited field.
context.data.edges = [];
apply();
context.data.edges = clone(originals);
context.data.edges.find((edge) => edge.id === 'r22-rest205--wood-lucy').label = 'My own label';
apply();
assert.equal(context.data.edges.find((edge) => edge.id === 'r22-rest205--wood-lucy').label, 'My own label');
for (const proposal of review.proposals.filter((proposal) => proposal.field === 'explanation'))
  assert.equal(context.data.edges.find((edge) => edge.id === proposal.id).explanation, proposal.new);
console.log(
  'PASS: five generated-rule fields, exact old-text guards, owner-field preservation, idempotence and late rule-link correction.',
);
