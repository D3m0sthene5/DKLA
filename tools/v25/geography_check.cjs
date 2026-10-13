'use strict';
// The pointer handlers below are extracted from the immutable artifact. This
// checks the actual event paths; it does not mirror their implementation.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  assert = require('assert');
const root = path.resolve(__dirname, '../..');
const G = JSON.parse(fs.readFileSync(path.join(__dirname, 'geography.json'), 'utf8'));
const study = fs.readFileSync(path.join(root, 'src/runtime/studyCode.js'), 'utf8');
// The same four top-level statements, found by parsing rather than by how the
// file happens to be laid out: spacing and optional parentheses do not matter.
const acorn = require('acorn');
const squash = (text) => text.replace(/\s+/g, '').replace(/\((\w+)\)=>/g, '$1=>');
const wanted = [
  "svg.addEventListener('pointerdown',e=>{if(e.button",
  "svg.addEventListener('pointermove',e=>{if(!S.pointers",
  'functionpointerEnd(',
  "svg.addEventListener('pointerup',pointerEnd)",
  "svg.addEventListener('pointercancel',pointerEnd)",
];
const pointerLines = acorn
  .parse(study, { ecmaVersion: 'latest', sourceType: 'script' })
  .body.map((statement) => study.slice(statement.start, statement.end))
  .filter((text) => wanted.some((start) => squash(text).startsWith(start)));
assert.equal(pointerLines.length, wanted.length, 'Baseline pointer-handler extraction drift');
const handlers = new Map(),
  removed = [];
let clicked = null,
  scheduled = 0,
  steps = 0,
  size = { w: 900, h: 1200, x: 0, y: 0 };
const card = {
  dataset: { mapNode: 'cp-pennoyer' },
  closest() {
    return this;
  },
};
const controls = [
  {
    remove() {
      removed.push('place');
    },
  },
  {
    remove() {
      removed.push('layout');
    },
  },
];
const svg = {
  addEventListener(type, fn) {
    handlers.set(type, fn);
  },
  setPointerCapture() {},
  classList: { add() {}, remove() {} },
};
const hint = { textContent: 'Drag an entry to save a new map position' };
const document = {
  getElementById(id) {
    if (id === 'dklaGeographyData') return { textContent: JSON.stringify(G) };
    if (id === 'mapHint') return hint;
    if (id === 'modal') return {};
    return null;
  },
  querySelectorAll(selector) {
    return selector === '[data-place],#layoutBtn' ? controls : [];
  },
  addEventListener() {},
  documentElement: { classList: { add() {} } },
  body: {},
};
const data = {
  nodes: G.audit.nodeReviews.map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    notes: 'Preserve editable notes ' + r.id,
    summary: 'Preserve explanation ' + r.id,
    courses: [],
  })),
  edges: [
    { id: 'study-edge', source: 'cp-pennoyer', target: 'shoe', explanation: 'Preserve authored relation' },
  ],
  geography: { regions: [], placements: {} },
  studyMap: {
    regions: [],
    districts: {},
    homes: {},
    courseBlocks: {},
    courseDesign: {},
    connectionPins: { 'cp-pennoyer': ['shoe'] },
    view: { region: 'civil-region', district: 'civil-contacts' },
  },
};
const context = {
  window: {
    LegalAtlas: {
      placeEntry() {
        throw Error('Legacy placement API reached');
      },
    },
    innerWidth: 1200,
    innerHeight: 900,
  },
  document,
  svg,
  data,
  S: { x: 0, y: 0, z: 1, drag: null, pointers: new Map(), pinch: null, region: null, district: null },
  R11: {},
  D: { tiles: {} },
  MutationObserver: class {
    observe() {}
  },
  console,
  setTimeout,
  clearTimeout,
  JSON,
  Map,
  Set,
  performance,
  rect: () => size,
  clone: (o) => JSON.parse(JSON.stringify(o)),
  screenToWorld: (x, y) => ({ x, y }),
  cancelAnimationFrame() {},
  remember() {},
  schedule() {
    scheduled++;
  },
  deferPersist() {},
  activateMap(t) {
    clicked = t;
  },
  mapData: () => data.studyMap,
  commitMove() {
    throw Error('Legacy move commit reached');
  },
  placeForm() {
    throw Error('Legacy placement form reached');
  },
  r6Place() {
    throw Error('Legacy reclassification reached');
  },
  homeFor: (id) => data.studyMap.homes[id],
  draw() {
    return 'draw-ok';
  },
  renderInspector() {},
  normalize: (o) => o,
  saveCache() {},
  storeView() {},
  goRegion: (id) => id,
  goDistrict: (id) => id,
  help() {},
};
context.R11.step = () => {
  steps++;
};
vm.createContext(context);
vm.runInContext(pointerLines.join('\n'), context, { filename: 'immutable-pointer-handlers.js' });
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '../../src/features/v25/geography.js'), 'utf8'),
  context,
  {
    filename: 'geography.js',
  },
);
assert(context.window.DKLAGeography.locked);
const h = JSON.stringify(data.studyMap.homes['cp-pennoyer']);
function event(type, x, y, pointerType = 'mouse', id = 1) {
  return { type, clientX: x, clientY: y, pointerType, pointerId: id, button: 0, target: card, altKey: true };
}
for (const type of ['mouse', 'touch', 'pen']) {
  handlers.get('pointerdown')(event('pointerdown', 100, 100, type));
  assert.equal(context.S.drag.node, null);
  assert.equal(context.S.drag.target, card);
  const cx = context.S.x;
  handlers.get('pointermove')(event('pointermove', 140, 150, type));
  assert.equal(context.S.x, cx - 40, 'Card drag must pan camera');
  handlers.get('pointerup')(event('pointerup', 140, 150, type));
  assert.equal(JSON.stringify(data.studyMap.homes['cp-pennoyer']), h, 'Card drag changed curated home');
}
handlers.get('pointerdown')(event('pointerdown', 100, 100));
handlers.get('pointerup')(event('pointerup', 100, 100));
assert.equal(clicked, card, 'Normal click no longer opens card');
handlers.get('pointerdown')(event('pointerdown', 100, 100, 'touch', 1));
handlers.get('pointerdown')(event('pointerdown', 200, 100, 'touch', 2));
handlers.get('pointermove')(event('pointermove', 400, 100, 'touch', 2));
assert(steps > 0, 'Pinch zoom disabled');
handlers.get('pointercancel')(event('pointercancel', 100, 100, 'touch', 1));
handlers.get('pointercancel')(event('pointercancel', 400, 100, 'touch', 2));
assert.equal(context.commitMove('cp-pennoyer', 9999, 9999), false);
assert.equal(context.window.LegalAtlas.placeEntry('cp-pennoyer', 'cp-venue-area'), false);
context.r6Place('cp-pennoyer', 'cp-venue-area');
assert.equal(JSON.stringify(data.studyMap.homes['cp-pennoyer']), h);
data.studyMap.homes['cp-pennoyer'].x = 999999;
data.studyMap.homes['cp-pennoyer'].custom = true;
data.nodes[0].notes = 'Owner edit survives restoration';
context.draw();
assert.equal(JSON.stringify(data.studyMap.homes['cp-pennoyer']), h);
assert.equal(data.nodes[0].notes, 'Owner edit survives restoration');
assert.deepEqual(data.studyMap.connectionPins, { 'cp-pennoyer': ['shoe'] });
assert.equal(data.edges[0].explanation, 'Preserve authored relation');
assert.equal(data.studyMap.view.region, 'cp-personal-region');
assert.equal(data.studyMap.view.district, 'cp-specific');
const imported = JSON.parse(JSON.stringify(data));
imported.studyMap.homes['cp-pennoyer'].y = -99999;
imported.nodes[1].notes = 'Imported notes survive';
context.normalize(imported);
assert.equal(JSON.stringify(imported.studyMap.homes['cp-pennoyer']), h);
assert.equal(imported.nodes[1].notes, 'Imported notes survive');
assert.equal(context.window.DKLAGeography.apply(), false, 'A second curated application must be idempotent');
size = { w: 1800, h: 800, x: 0, y: 0 };
context.draw();
const wide = data.studyMap.homes['cp-pennoyer'];
assert.equal(wide.x, JSON.parse(h).x - 6870);
assert.equal(wide.y, JSON.parse(h).y + 1060);
size = { w: 900, h: 1200, x: 0, y: 0 };
context.draw();
assert.equal(
  JSON.stringify(data.studyMap.homes['cp-pennoyer']),
  h,
  'Responsive course translation failed round trip',
);
const personal = {
  id: 'owner-note',
  title: 'Owner note',
  kind: 'Note',
  summary: 'Owner content',
  notes: 'Personal notes',
  courses: [],
  position: { x: 800000, y: -700000 },
};
data.nodes.push(personal);
context.draw();
assert.equal(data.studyMap.homes[personal.id].district, 'inbox');
const personalHome = JSON.stringify(data.studyMap.homes[personal.id]);
data.studyMap.homes[personal.id].x = 999999;
context.r6Place(personal.id, 'cp-venue-area');
context.draw();
assert.equal(JSON.stringify(data.studyMap.homes[personal.id]), personalHome);
assert.equal(personal.notes, 'Personal notes');
const repurposed = {
  id: G.excludedPracticeIds[0],
  title: 'Repurposed substantive account',
  kind: 'Concept',
  summary: 'Owner substance',
  notes: 'Preserved',
};
data.nodes.push(repurposed);
context.draw();
assert.equal(
  data.studyMap.homes[repurposed.id].district,
  'inbox',
  'Repurposed substantive practice account lost its visible home',
);
assert(removed.includes('place') && removed.includes('layout'));
assert(!hint.textContent.includes('save a new map position'));
const start = performance.now();
for (let i = 0; i < 20; i++) context.window.DKLAGeography.apply();
const avg = (performance.now() - start) / 20;
console.log(
  JSON.stringify({
    ok: true,
    actualBaselinePointerHandlers: pointerLines.length,
    pointerModes: ['mouse', 'touch', 'pen'],
    normalClick: true,
    pinchZoom: true,
    customImportsIgnored: true,
    notesAndStudyPrioritiesPreserved: true,
    responsiveRoundTrip: true,
    repurposedPracticePreserved: true,
    curatedNodes: G.audit.counts.nodes,
    averageApplyMilliseconds: +avg.toFixed(2),
  }),
);
