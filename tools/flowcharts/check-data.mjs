/* Validate every graph and confirm that the portable and hosted atlases carry the same data. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

const root = new URL('../../', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const dataFiles = ['contracts', 'civil', 'lrs'];
const charts = dataFiles.flatMap((name) => readJson(`tools/flowcharts/data/${name}.json`));
const expectedCounts = { K: 37, CP: 35, LRS: 39, X: 4 };
const expectedIds = Object.entries(expectedCounts).flatMap(([course, count]) =>
  Array.from({ length: count }, (_, index) => `${course}-${String(index + 1).padStart(2, '0')}`),
);
assert.deepEqual(
  charts.map((chart) => chart.id).sort(),
  expectedIds.sort(),
  'Each course has its complete chart sequence and unique chart IDs',
);

function block(html, id, file) {
  const found = html.match(new RegExp(`<script\\b[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)<\\/script>`));
  assert.ok(found, `${file} has no ${id} script`);
  return JSON.parse(found[1]);
}

const portable = 'work/build/DKLA-v3.2.html';
const hosted = 'dist/DKLA-v3.2.html';
const atlasHtml = read(portable);
const sourceIds = new Set(block(atlasHtml, 'seedData', portable).nodes.map(({ id }) => id));
const chartIds = new Set(expectedIds);
const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

function walk(start, targets) {
  const seen = new Set();
  const todo = [...start];
  while (todo.length) {
    const id = todo.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    todo.push(...targets(id));
  }
  return seen;
}

let decisions = 0;
let sequences = 0;
let sourceCount = 0;
let primaryCount = 0;
let relatedCount = 0;
for (const chart of charts) {
  assert.ok(hasText(chart.title), `${chart.id}: missing title`);
  assert.ok(Array.isArray(chart.nodes) && chart.nodes.length > 1, `${chart.id}: missing graph`);
  const byId = new Map(chart.nodes.map((node) => [node.id, node]));
  const parents = new Map(chart.nodes.map((node) => [node.id, []]));
  assert.equal(byId.size, chart.nodes.length, `${chart.id}: repeated node ID`);
  assert.ok(byId.has(chart.entry), `${chart.id}: missing entry node`);

  for (const node of chart.nodes) {
    const at = `${chart.id}/${node.id}`;
    assert.ok(typeof node.id === 'string' && /^[\w-]+$/.test(node.id), `${at}: invalid node ID`);
    assert.ok(hasText(node.label) && hasText(node.detail), `${at}: missing label or detail`);
    assert.ok(Array.isArray(node.sources) && node.sources.length, `${at}: no atlas source`);
    for (const source of node.sources) {
      assert.ok(sourceIds.has(source), `${at}: unknown atlas source "${source}"`);
      sourceCount++;
    }
    assert.ok(Array.isArray(node.edges), `${at}: expected edges array`);
    for (const edge of node.edges) {
      assert.ok(hasText(edge.label), `${at}: unlabeled edge`);
      assert.ok(byId.has(edge.to), `${at}: missing edge destination "${edge.to}"`);
      parents.get(edge.to).push(node.id);
    }
    assert.equal(
      new Set(node.edges.map((edge) => edge.label)).size,
      node.edges.length,
      `${at}: repeated branch label`,
    );

    for (const { label, url } of node.links ?? []) {
      assert.ok(hasText(label), `${at}: unlabeled primary source`);
      assert.ok(hasText(url), `${at}: missing primary URL`);
      const target = new URL(url);
      assert.ok(
        target.protocol === 'https:' &&
          target.hostname.includes('.') &&
          target.pathname.length > 1 &&
          !target.username &&
          !target.password,
        `${at}: invalid primary source URL ${url}`,
      );
      primaryCount++;
    }
    for (const { id, label } of node.related ?? []) {
      assert.ok(hasText(label), `${at}: unlabeled related chart`);
      assert.ok(chartIds.has(id), `${at}: unknown related chart "${id}"`);
      assert.notEqual(id, chart.id, `${at}: related chart links to itself`);
      relatedCount++;
    }

    if (node.edges.length > 1) decisions++;
    if (node.edges.length === 1) sequences++;
  }

  const endpoints = chart.nodes.filter((node) => !node.edges.length).map((node) => node.id);
  assert.ok(endpoints.length, `${chart.id}: no endpoint`);
  const reachable = walk([chart.entry], (id) => byId.get(id).edges.map((edge) => edge.to));
  const canFinish = walk(endpoints, (id) => parents.get(id));
  assert.deepEqual(
    [...byId.keys()].filter((id) => !reachable.has(id)),
    [],
    `${chart.id}: unreachable nodes`,
  );
  assert.deepEqual(
    [...byId.keys()].filter((id) => !canFinish.has(id)),
    [],
    `${chart.id}: nodes without a route to an endpoint`,
  );
}

assert.ok(
  decisions && sequences && primaryCount && relatedCount,
  'Expected branches, sequences, primary sources, and related charts',
);
for (const [file, html] of [
  [portable, atlasHtml],
  [hosted, read(hosted)],
]) {
  const embedded = block(html, 'dklaFlowchartsData', file);
  assert.deepEqual(
    embedded.map(({ id }) => id),
    charts.map(({ id }) => id),
    `${file}: missing or reordered chart IDs`,
  );
  const changed = embedded.filter((chart, index) => !isDeepStrictEqual(chart, charts[index]));
  assert.deepEqual(
    changed.map(({ id }) => id),
    [],
    `${file}: embedded graphs differ from authored data`,
  );
}
console.log(
  `${charts.length} graphs in both atlas builds. ${sourceCount} atlas references, ${primaryCount} primary URLs, and ${relatedCount} related charts validated.`,
);
