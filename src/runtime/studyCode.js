/* Legal Atlas r5. A single persistent map over the unchanged source records.
   All source text stays in nodes/edges/bookArchive. This module owns presentation only. */
'use strict';
const E = escapeHTML,
  svg = $('geoCanvas');
const geoNav = () => data.geography || base.geography;
function geoPlacement(id) {
  return (
    geoNav().placements[id] || {
      region: 'workbench-region',
      district: 'inbox',
      role: 'Unfiled entry',
      tier: 'supporting',
      displayLabel: nodeById(id)?.shortTitle || id,
    }
  );
}
function geoRegion(id) {
  return geoNav().regions.find((r) => r.id === id);
}
function geoDistrict(id) {
  return geoNav()
    .regions.flatMap((r) => r.districts)
    .find((d) => d.id === id);
}
function geoMembers(id) {
  return data.nodes.filter((n) => geoPlacement(n.id).district === id);
}
function geoRoleOrder(n, d) {
  return n.id === d?.lead
    ? -1
    : ({
        'Core concept': 0,
        'Subtopic': 1,
        'Provision account': 2,
        'Principal case': 3,
        'Earlier case': 4,
        'Earlier overview': 5,
        'Shorter authority': 6,
        'Partial excerpt': 7,
        'Editorial companion': 8,
        'Problem': 9,
        'Study lens': 10,
        'Reading index': 11,
        'Source gap': 12,
      }[geoPlacement(n.id).role] ?? 13);
}
const S = {
  x: 0,
  y: 0,
  z: 0.12,
  scope: 'Contracts',
  region: null,
  district: null,
  history: [],
  panelOpen: false,
  connectionsExpanded: false,
  connectionOverview: false,
  paintEdges: [],
  paintNodes: [],
  bookReturn: null,
  animation: 0,
  frame: 0,
  drag: null,
  pointers: new Map(),
  pinch: null,
  searchOpen: false,
};
let nodesById = new Map(),
  edgesById = new Map(),
  adj = new Map(),
  persistTimer = null,
  searchTimer = null,
  menuOpen = false,
  dirtySession = false,
  initializing = true;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function rebuildIndex() {
  nodesById = new Map(data.nodes.map((n) => [n.id, n]));
  edgesById = new Map(data.edges.map((e) => [e.id, e]));
  adj = new Map(data.nodes.map((n) => [n.id, []]));
  for (const e of data.edges) {
    adj.get(e.source)?.push(e);
    adj.get(e.target)?.push(e);
  }
}
function mapData() {
  return data.studyMap;
}
function validateMap(m) {
  if (!m || m.version !== 1 || !Array.isArray(m.regions) || !m.districts || !m.homes)
    throw Error('Invalid study map.');
  if (m.regions.length > 100 || Object.keys(m.homes).length > 15000)
    throw Error('Study map exceeds size limits.');
  for (const r of m.regions) {
    if (typeof r.id !== 'string' || typeof r.title !== 'string' || !/^#[a-f0-9]{6}$/i.test(r.color))
      throw Error('Invalid map area.');
    for (const k of ['x', 'y', 'w', 'h'])
      if (!Number.isFinite(r[k]) || Math.abs(r[k]) > 1e7) throw Error('Invalid area coordinates.');
  }
  for (const [id, c] of Object.entries(m.homes)) {
    for (const k of ['x', 'y', 'w', 'h'])
      if (!Number.isFinite(c[k]) || Math.abs(c[k]) > 1e7) throw Error('Invalid map home: ' + id);
    if (c.w <= 0 || c.h <= 0) throw Error('Invalid map card size.');
  }
  for (const d of Object.values(m.districts)) {
    if (typeof d.id !== 'string' || typeof d.title !== 'string') throw Error('Invalid subtopic.');
    for (const k of ['x', 'y', 'w', 'h'])
      if (!Number.isFinite(d[k])) throw Error('Invalid subtopic coordinates.');
  }
  return m;
}
const studyNormalizeSource = normalize;
normalize = function (g) {
  const out = studyNormalizeSource(g);
  if (out.studyMap) validateMap(out.studyMap);
  return out;
};
const studyPatchSource = applyPatch;
applyPatch = function (g, p) {
  const out = studyPatchSource(g, p);
  if (p.geography) out.geography = clone(p.geography);
  if (p.studyMap) out.studyMap = clone(p.studyMap);
  return normalize(out);
};
function ensureMap() {
  if (!data.geography) data.geography = clone(base.geography);
  if (!data.studyMap) data.studyMap = clone(base.studyMap);
  validateMap(data.studyMap);
  const m = mapData();
  m.connectionPins ||= {};
  m.guides ||= {};
  const unplaced = data.nodes.filter((n) => !m.homes[n.id]);
  // New arrivals receive unused slots outside the existing map. Existing homes never reflow.
  for (const n of unplaced) {
    let slot = 0,
      c;
    do {
      c = {
        id: n.id,
        x: 10650 + (slot % 3) * 390,
        y: 100 + Math.floor(slot / 3) * 112,
        w: 365,
        h: 88,
        region: 'workbench-region',
        district: 'inbox',
        core: true,
        support: false,
        added: true,
      };
      slot++;
    } while (Object.entries(m.homes).some(([id, h]) => id !== n.id && overlap(c, h, 10)));
    m.homes[n.id] = c;
  }
}
function displayName(n) {
  return n.kind === 'Case'
    ? n.shortTitle || n.title
    : geoPlacement(n.id).displayLabel || n.shortTitle || n.title;
}
function roleLabel(n) {
  const role = geoPlacement(n.id).role;
  return (
    {
      'Core concept': 'Concept',
      'Subtopic': 'Concept',
      'Provision account': 'Provision',
      'Principal case': 'Case',
      'Shorter authority': 'Related authority',
      'Editorial companion': 'Book discussion',
      'Earlier overview': 'Earlier overview',
      'Earlier case': 'Earlier case',
      'Reading index': 'Reading plan',
      'Study lens': 'Comparison',
      'Source gap': 'Source missing',
      'Partial excerpt': 'Partial excerpt',
      'Unfiled entry': 'New entry',
    }[role] || (n.kind === 'Hypothetical' ? 'Question' : role || n.kind)
  );
}
function regionFor(id) {
  return mapData().regions.find((r) => r.id === id);
}
function districtFor(id) {
  return mapData().districts[id];
}
function homeFor(id) {
  return S.drag?.node === id && S.drag.preview ? S.drag.preview : mapData().homes[id];
}
function overlap(a, b, p = 0) {
  return a.x + a.w + p > b.x && a.x < b.x + b.w + p && a.y + a.h + p > b.y && a.y < b.y + b.h + p;
}
function intersects(a, b, p = 0) {
  return a.x + a.w >= b.x - p && a.x <= b.x + b.w + p && a.y + a.h >= b.y - p && a.y <= b.y + b.h + p;
}
function bounds(items) {
  const a = items.filter(Boolean);
  if (!a.length) return { x: 0, y: 0, w: 1000, h: 1000 };
  const x = Math.min(...a.map((b) => b.x)),
    y = Math.min(...a.map((b) => b.y));
  return { x, y, w: Math.max(...a.map((b) => b.x + b.w)) - x, h: Math.max(...a.map((b) => b.y + b.h)) - y };
}
function rect() {
  const r = svg.getBoundingClientRect();
  return { x: r.x, y: r.y, w: Math.max(1, r.width), h: Math.max(1, r.height) };
}
function visibleBox() {
  const v = rect();
  return { x: S.x - v.w / (2 * S.z), y: S.y - v.h / (2 * S.z), w: v.w / S.z, h: v.h / S.z };
}
function readerWidth() {
  return S.panelOpen && !$('inspector').hidden ? $('inspector').getBoundingClientRect().width : 0;
}
function safeArea() {
  const v = rect(),
    w = $('mapWelcome');
  let top = 78,
    left = 35;
  if (w && !w.hidden) {
    const b = w.getBoundingClientRect();
    if (b.height) {
      if (v.w < 760) top = Math.max(78, Math.round(b.bottom - v.y) + 14);
      else if (b.width < v.w * 0.35) left = Math.max(35, Math.round(b.right - v.x) + 24);
      else top = Math.max(78, Math.round(b.bottom - v.y) + 14);
    }
  }
  return {
    x: left,
    y: top,
    w: Math.max(230, v.w - left - readerWidth() - 35),
    h: Math.max(240, v.h - top - 70),
  };
}
function pointOnScreen(c) {
  const v = rect();
  return { x: v.x + v.w / 2 + (c.x + c.w / 2 - S.x) * S.z, y: v.y + v.h / 2 + (c.y + c.h / 2 - S.y) * S.z };
}
function screenToWorld(x, y) {
  const v = rect();
  return { x: S.x + (x - v.x - v.w / 2) / S.z, y: S.y + (y - v.y - v.h / 2) / S.z };
}
function mapCenterVisible() {
  const v = rect(),
    a = safeArea();
  return { x: S.x + (a.x + a.w / 2 - v.w / 2) / S.z, y: S.y + (a.y + a.h / 2 - v.h / 2) / S.z };
}
// r9: the camera stays with the content. The floor zoom shows the whole scope; the centre of the safe area stays inside the content box.
// r11: zoomFloor and clampCamera live in the renderer section below.
// r9: tapered ribbons encode direction (wide at the source, narrow at the target) instead of arrowheads.
function taperedRibbon(x0, y0, x1, y1, x2, y2, x3, y3, w0, w1, n = 28, tEnd = 1) {
  const L = [],
    R = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * tEnd,
      u = 1 - t,
      x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
      y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      dx = 3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2),
      dy = 3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2),
      len = Math.hypot(dx, dy) || 1,
      nx = -dy / len,
      ny = dx / len,
      w = (w0 + (w1 - w0) * t) / 2;
    L.push((x + nx * w).toFixed(1) + ',' + (y + ny * w).toFixed(1));
    R.push((x - nx * w).toFixed(1) + ',' + (y - ny * w).toFixed(1));
  }
  return 'M' + L.join('L') + 'L' + R.reverse().join('L') + 'Z';
}
// r9: how much each subject holds, for visual weight at the overview level.
let tallyCache = new Map(),
  tallyKey = '';
function regionTally(id) {
  const key = data.nodes.length + ':' + Object.keys(mapData().homes).length;
  if (tallyKey !== key) {
    tallyKey = key;
    tallyCache = new Map();
    for (const [nid, h] of Object.entries(mapData().homes)) {
      const n = nodesById.get(nid);
      if (!n) continue;
      const t = tallyCache.get(h.region) || { cases: 0, concepts: 0, notes: 0, total: 0 };
      t.total++;
      if (n.kind === 'Case') t.cases++;
      else if (n.kind === 'Concept' || n.kind === 'Rule') t.concepts++;
      else t.notes++;
      tallyCache.set(h.region, t);
    }
  }
  return tallyCache.get(id) || { cases: 0, concepts: 0, notes: 0, total: 0 };
}
function regionWeight(id) {
  const max = Math.max(1, ...scopeRegions().map((r) => regionTally(r.id).total));
  return Math.sqrt(regionTally(id).total / max);
}
// r9: entries and subtopics grow into place when they first appear at a zoom level.
const appear = new Map(),
  edgeAppear = new Map();
let appearSeq = 0,
  settling = false,
  seenNow = new Set(),
  pulseId = null,
  pulseAt = 0;
function entrance(key, cx, cy, now) {
  seenNow.add(key);
  if (reducedMotion) return { o: 1, tr: '' };
  let t0 = appear.get(key);
  if (t0 === undefined) {
    t0 = now + Math.min(200, appearSeq++ * 12);
    appear.set(key, t0);
  }
  const f = Math.min(1, Math.max(0, (now - t0) / 280));
  if (f < 1) settling = true;
  const u = 1 - Math.pow(1 - f, 3),
    s = 0.88 + 0.12 * u;
  return {
    o: u,
    tr: f < 1 ? ` transform="translate(${cx} ${cy}) scale(${s.toFixed(3)}) translate(${-cx} ${-cy})"` : '',
  };
}
function storeView() {
  const openDetails = [...$('inspector').querySelectorAll('details[open]')]
    .map((el) => el.id)
    .filter(Boolean);
  mapData().view = {
    x: S.x,
    y: S.y,
    z: S.z,
    scope: S.scope,
    region: S.region,
    district: S.district,
    selected: selected ? clone(selected) : null,
    panelOpen: S.panelOpen,
    query: $('search').value,
    scroll: $('inspector').scrollTop,
    openDetails,
    connectionsExpanded: S.connectionsExpanded,
    connectionOverview: S.connectionOverview,
  };
}
function deferPersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    storeView();
    saveCache();
  }, 500);
}
function remember() {
  storeView();
  S.history.push(clone(mapData().view));
  if (S.history.length > 70) S.history.shift();
  $('studyBack').disabled = false;
}
function setCamera(x, y, z, animate = true) {
  cancelAnimationFrame(S.animation);
  z = Math.min(1.25, Math.max(zoomFloor(), z));
  const from = { x: S.x, y: S.y, z: S.z },
    start = performance.now();
  if (!animate || reducedMotion) {
    R11.anim = false;
    Object.assign(S, { x, y, z });
    schedule();
    deferPersist();
    return;
  }
  // r11: van Wijk and Nuij (2003) smooth zoom-and-pan: one path through (position, width) space, rho = 1.42, so a long flight zooms out, crosses, and zooms back in instead of sliding.
  const rho = 1.42,
    rho2 = rho * rho,
    W = Math.max(1, safeArea().w),
    w0 = W / from.z,
    w1 = W / z,
    dx = x - from.x,
    dy = y - from.y,
    d = Math.hypot(dx, dy);
  let Sp, at;
  if (d < 1e-6) {
    Sp = Math.abs(Math.log(w1 / w0)) / rho;
    const k = w1 > w0 ? 1 : -1;
    at = (s) => ({ x: from.x, y: from.y, w: w0 * Math.exp(k * rho * s) });
  } else {
    const b0 = (w1 * w1 - w0 * w0 + rho2 * rho2 * d * d) / (2 * w0 * rho2 * d),
      b1 = (w1 * w1 - w0 * w0 - rho2 * rho2 * d * d) / (2 * w1 * rho2 * d),
      r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0),
      r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
    Sp = (r1 - r0) / rho;
    const ch0 = Math.cosh(r0),
      sh0 = Math.sinh(r0);
    at = (s) => {
      const u = (w0 / (rho2 * d)) * (ch0 * Math.tanh(rho * s + r0) - sh0);
      return { x: from.x + u * dx, y: from.y + u * dy, w: (w0 * ch0) / Math.cosh(rho * s + r0) };
    };
  }
  const dur = Math.min(1200, Math.max(340, Math.abs(Sp) * 260));
  function step(t) {
    const f = Math.min(1, (t - start) / dur),
      u = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
    if (f < 1) {
      const p = at(Sp * u);
      if (Number.isFinite(p.x) && Number.isFinite(p.w) && p.w > 0) {
        S.x = p.x;
        S.y = p.y;
        S.z = Math.min(1.25, Math.max(zoomFloor(), W / p.w));
      }
      schedule();
      S.animation = requestAnimationFrame(step);
    } else {
      Object.assign(S, { x, y, z });
      schedule();
      R11.anim = false;
      deferPersist();
    }
  }
  R11.anim = true;
  S.animation = requestAnimationFrame(step);
}
function fitBox(b, animate = true, pad = 16, maxZoom = 1.4) {
  const v = rect(),
    a = safeArea(),
    z = Math.min((a.w - pad * 2) / Math.max(1, b.w), (a.h - pad * 2) / Math.max(1, b.h), maxZoom);
  setCamera(
    b.x + b.w / 2 - (a.x + a.w / 2 - v.w / 2) / z,
    b.y + b.h / 2 - (a.y + a.h / 2 - v.h / 2) / z,
    z,
    animate,
  );
}
function scopeRegions(scope = S.scope) {
  return mapData().regions.filter(
    (r) =>
      scope === 'Atlas' ||
      (regionCourse(r) === scope && r.id !== 'workbench-region') ||
      (scope === 'Study notes' && r.id === 'workbench-region'),
  );
}
function scopeBox() {
  if (S.scope === 'Atlas') return galaxy().box;
  const b = bounds(scopeRegions());
  return galaxy().blocks[S.scope] ? { x: b.x, y: b.y - 1100, w: b.w, h: b.h + 1100 } : b;
}
function closeSearch() {
  S.searchOpen = false;
  $('searchResults').hidden = true;
  $('search').setAttribute('aria-expanded', 'false');
}
function setReader(open) {
  S.panelOpen = open;
  $('inspector').hidden = !open;
  document.body.classList.toggle('has-reader', open);
}
function setScopeFor(n) {
  const r = regionFor(homeFor(n.id)?.region);
  S.scope = r
    ? r.id === 'workbench-region'
      ? 'Study notes'
      : regionCourse(r)
    : n.courses.includes('Contracts')
      ? 'Contracts'
      : n.courses.includes('Civil Procedure')
        ? 'Civil Procedure'
        : 'Study notes';
}
function home(scope = 'Contracts', animate = true, save = true) {
  if (save) remember();
  S.scope = scope;
  S.region = null;
  S.district = null;
  selected = null;
  S.connectionsExpanded = false;
  S.connectionOverview = false;
  setReader(false);
  closeSearch();
  renderHeading();
  fitBox(scopeBox(), animate, 20, 0.7);
  renderInspector();
}
function goRegion(id, animate = true) {
  const r = regionFor(id);
  if (!r) return;
  remember();
  S.region = id;
  S.district = null;
  S.scope = ['workbench-region', 'semester-workbench'].includes(r.id) ? 'Study notes' : regionCourse(r);
  selected = null;
  setReader(false);
  closeSearch();
  renderHeading();
  fitBox(r, animate, R18.subjectPad(), 0.95);
  renderInspector();
}
function goDistrict(id, animate = true) {
  const d = districtFor(id);
  if (!d) return;
  remember();
  S.region = d.region;
  S.district = id;
  selected = { type: 'district', id };
  S.scope = ['workbench-region', 'semester-workbench'].includes(d.region)
    ? 'Study notes'
    : regionCourse(regionFor(d.region)) || 'Study notes';
  setReader(true);
  S.connectionsExpanded = false;
  S.connectionOverview = false;
  closeSearch();
  renderInspector();
  renderHeading();
  const members = geoMembers(id).map((n) => homeFor(n.id));
  const main = members.filter((c) => c?.core),
    b = bounds(main.length ? main : members);
  fitBox(
    { x: d.x, y: d.y, w: d.w, h: Math.min(d.h, Math.max(330, b.y + b.h - d.y + 50)) },
    animate,
    16,
    1.05,
  );
}
function goNode(id, center = false, save = true) {
  const n = nodesById.get(id);
  if (!n) return;
  if (save) remember();
  selected = { type: 'node', id };
  const p = geoPlacement(id);
  S.region = p.region;
  S.district = p.district;
  setScopeFor(n);
  S.connectionsExpanded = false;
  S.connectionOverview = false;
  setReader(true);
  closeSearch();
  renderInspector();
  renderHeading();
  if (center) {
    const c = homeFor(id),
      d = districtFor(c.district),
      b = { x: c.x - 45, y: c.y - 140, w: c.w + 90, h: 370 };
    if (d && c.w < d.w * 0.7) {
      b.x = Math.min(c.x - 45, d.x);
      b.w = Math.max(c.w + 90, d.w);
    }
    fitBox(b, true, 22, 1.25);
  } else {
    schedule();
    deferPersist();
  }
}
function goEdge(id, showMap = false, save = true) {
  const e = edgesById.get(id);
  if (!e) return;
  if (save) remember();
  selected = { type: 'edge', id };
  S.connectionsExpanded = false;
  S.connectionOverview = false;
  setReader(true);
  closeSearch();
  renderInspector();
  renderHeading();
  if (showMap) fitBox(bounds([homeFor(e.source), homeFor(e.target)]), true, 60, 1.15);
  else {
    schedule();
    deferPersist();
  }
}
function back() {
  if ($('bookDialog').open) {
    closeBookReader();
    return;
  }
  const v = S.history.pop();
  if (!v) return;
  cancelAnimationFrame(S.animation);
  R11.anim = false;
  R11.lastT = null;
  restoreView(v);
  $('studyBack').disabled = !S.history.length;
  deferPersist();
}
function restoreView(v) {
  S.x = v.x;
  S.y = v.y;
  S.z = v.z;
  S.scope = v.scope || 'Contracts';
  S.region = v.region || null;
  S.district = v.district || null;
  S.connectionsExpanded = !!v.connectionsExpanded;
  S.connectionOverview = !!v.connectionOverview;
  selected = v.selected || null;
  if (
    (selected?.type === 'node' && !nodesById.has(selected.id)) ||
    (selected?.type === 'edge' && !edgesById.has(selected.id))
  )
    selected = null;
  query = v.query || '';
  $('search').value = query;
  setReader(!!v.panelOpen);
  renderInspector();
  renderHeading();
  schedule();
  requestAnimationFrame(() => {
    for (const id of v.openDetails || []) {
      const e = $(id);
      if (e && e.closest('#inspector')) e.open = true;
    }
    $('inspector').scrollTop = v.scroll || 0;
  });
}
function renderHeading() {
  const r = regionFor(S.region),
    d = districtFor(S.district);
  $('courseHome').textContent = S.scope;
  let s = '<button data-study-scope="Atlas">Atlas</button>';
  if (S.scope !== 'Atlas')
    s += '<span>›</span><button data-study-scope="' + E(S.scope) + '">' + E(S.scope) + '</button>';
  if (r)
    s += '<span>›</span><button data-study-region="' + E(r.id) + '">' + E(shortRegionTitle(r)) + '</button>';
  if (d) s += '<span>›</span><button data-study-district="' + E(d.id) + '">' + E(d.title) + '</button>';
  $('geoBreadcrumb').innerHTML = s;
  $('studyBack').disabled = !S.history.length;
  $('mapWelcome').hidden = !!(S.region || S.district || selected || S.scope !== 'Contracts');
}
function shortRegionTitle(r) {
  return r.id === 'foundations'
    ? 'Promises & governing law'
    : r.id === 'terms-region'
      ? 'Article 2 · Battle of the forms'
      : r.title;
}
function guide(n) {
  const a = mapData().guides[n.id];
  return a && a.sourceUpdatedAt === n.updatedAt && a.sourceSummary === n.summary ? a.text : null;
}
function incident(id) {
  return adj.get(id) || [];
}
function relationRank(e, id) {
  const other = e.source === id ? e.target : e.source,
    p = geoPlacement(other),
    n = nodesById.get(other),
    pins = mapData().connectionPins[id] || [],
    j = pins.indexOf(other);
  return (
    (j >= 0 ? 1000 - j * 15 : 0) +
    (e.kind === 'Doctrine' ? 50 : e.kind === 'Tension' ? 40 : 15) +
    (p.tier === 'main' ? 35 : 0) +
    (n?.kind === 'Rule' ? 8 : 0) +
    (n?.kind === 'Case' ? 8 : 0) +
    (p.district === geoPlacement(id).district ? 8 : 0) -
    (navigationEdge(e) ? 400 : 0) -
    (e.status === 'Disputed' ? 4 : 0)
  );
}
function orderedEdges(id) {
  return incident(id)
    .slice()
    .sort((a, b) => relationRank(b, id) - relationRank(a, id) || a.id.localeCompare(b.id));
}
function focusEdges(id, limit = 6) {
  const seen = new Set(),
    out = [];
  for (const e of orderedEdges(id)) {
    const other = e.source === id ? e.target : e.source;
    if (seen.has(other) || navigationEdge(e)) continue;
    seen.add(other);
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}
function shownEdges() {
  if (selected?.type === 'edge') return [edgesById.get(selected.id)].filter(Boolean);
  if (selected?.type !== 'node') return [];
  if (S.connectionOverview) {
    const paths = mapData().focusPaths?.[selected.id];
    if (paths?.length) return paths.map((id) => edgesById.get(id)).filter((e) => e && !navigationEdge(e));
    const reg = homeFor(selected.id)?.region;
    const local = focusEdges(selected.id, 50).filter(
      (e) => homeFor(e.source === selected.id ? e.target : e.source)?.region === reg,
    );
    return local.slice(0, S.connectionsExpanded ? 12 : 8);
  }
  return focusEdges(selected.id, S.connectionsExpanded ? 14 : selected.id === 'ucc207' ? 8 : 6);
}
function wrap(text, maxChars, maxLines = 3) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let l = '';
  for (const w of words) {
    if (l && (l + ' ' + w).length > maxChars) {
      lines.push(l);
      l = w;
    } else l += (l ? ' ' : '') + w;
  }
  if (l) lines.push(l);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].slice(0, maxChars - 1).replace(/\s+\S*$/, '') + '…';
  }
  return lines;
}
// r11: text() is redefined next to the renderer, with measured wrapping.
function regionPath(r) {
  const c = 56;
  return `M ${r.x + c} ${r.y} H ${r.x + r.w - c * 1.4} Q ${r.x + r.w} ${r.y} ${r.x + r.w} ${r.y + c * 1.4} V ${r.y + r.h - c} Q ${r.x + r.w} ${r.y + r.h} ${r.x + r.w - c} ${r.y + r.h} H ${r.x + c} Q ${r.x} ${r.y + r.h} ${r.x} ${r.y + r.h - c} V ${r.y + c} Q ${r.x} ${r.y} ${r.x + c} ${r.y} Z`;
}
function schedule() {
  if (S.frame) return;
  S.frame = requestAnimationFrame(() => {
    S.frame = 0;
    draw();
  });
}
function nearestRegion(x, y) {
  return mapData().regions.filter((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)[0];
}
// ---- r11: one continuous scene. At the floor zoom the atlas is a spiral galaxy, one arm per course; as the reader zooms in,
// every entry slides from its star to its saved home while the course blocks, subjects and subtopics fade in around it,
// and cards take over from stars when they are wide enough to read. Labels are measured with a canvas, placed in priority
// order on a screen-space grid, and faded rather than popped (after Been et al. 2006 and the Mapbox label engine).
const R11 = {
  headroom: new Map(),
  galaxyKey: '',
  galaxy: null,
  labelState: new Map(),
  fades: new Map(),
  measure: new Map(),
  ctx: document.createElement('canvas').getContext('2d'),
  lastT: null,
  focus: null,
  anim: false,
  frame: 0,
  dt: 16,
  lastFrame: 0,
  districtCards: new Set(),
  starIndex: [],
  dragMoved: false,
};
function lighten(hex, k) {
  const n = parseInt(String(hex).slice(1), 16);
  if (!/^#[0-9a-f]{6}$/i.test(hex) || isNaN(n)) return hex;
  const f = (v) =>
    Math.round(v + (255 - v) * k)
      .toString(16)
      .padStart(2, '0');
  return '#' + f((n >> 16) & 255) + f((n >> 8) & 255) + f(n & 255);
}
// ---- r15: one typeface and one colour system. Every map text uses the same sans stack (the HTML chrome too, via dklaR11Styles).
// Colours come from three OKLCH hue families, one per course (orange 60°, blue 252°, green 152°), each with seven steps of lightness
// at constant hue: [0] deep wash, [1] focus wash, [2][3][4] the three tile shades A B C (L .42–.57, fill .8 over the dark ground keeps
// #f7f5f0 text above 5.4:1 and #e3e8ee above 4.8:1), [5] the accent (L .72–.74, 7.1:1 on the ground; dark badge text 7.4:1) and
// [6] the text tint (L .92). A subject tile is its course hue at the shade its step picks (1→B, 2→A, 3→C, repeating; no step → B), so
// neighbours differ in lightness and never in hue. The study workbench is a grey-blue, the dictionary a muted violet. r.color from the
// data is overwritten with these values on load (applyPalette), so the code outside this file that reads r.color agrees with the map.
const R11_FONT =
  '-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif';
const R11_FAMILY = { sans: R11_FONT, serif: R11_FONT };
const COURSE_SCALE = {
  'Contracts': ['#402712', '#61370d', '#834600', '#9b5400', '#af6100', '#ee9138', '#fedec4'],
  'Civil Procedure': ['#1a2f46', '#1f446b', '#1c548d', '#2765a5', '#3a77b8', '#67acf7', '#d3e7fe'],
  'Legislation and the Regulatory State': [
    '#162f1e',
    '#1c472a',
    '#135c30',
    '#296d40',
    '#34814e',
    '#5ebc7b',
    '#c8f1d1',
  ],
  'Study notes': ['#272f35', '#39444c', '#46555f', '#576570', '#687782', '#9aaebc', '#dfe6eb'],
  'Dictionary': ['#312a3a', '#473d54', '#594c69', '#6a5c7b', '#7b6d8c', '#b5a0cf', '#e7e1f0'],
};
const TILE_STEPS = [3, 2, 4];
function courseScale(c) {
  return COURSE_SCALE[c] || COURSE_SCALE['Study notes'];
}
function regionScale(r) {
  return r?.special === 'glossary' ? COURSE_SCALE.Dictionary : courseScale(regionCourse(r));
}
function regionColor(r) {
  if (!r) return COURSE_SCALE['Study notes'][3];
  return regionScale(r)[r.step ? TILE_STEPS[(r.step - 1) % 3] : 3];
}
function regionAccent(r) {
  return r ? regionScale(r)[5] : COURSE_SCALE['Study notes'][5];
}
function regionTint(r) {
  return r ? regionScale(r)[6] : COURSE_SCALE['Study notes'][6];
}
const ARM_COLORS = Object.fromEntries(Object.keys(COURSE_SCALE).map((c) => [c, COURSE_SCALE[c][5]]));
function applyPalette(M) {
  const key = M.layoutId + ':' + M.regions.length + ':' + M.regions.map((r) => r.id).join(',');
  if (R11.paletteKey === key) return;
  R11.paletteKey = key;
  for (const r of M.regions) r.color = regionColor(r);
}
// Short names for the Atlas floor, where a tile is 60–90 px wide: one or two words, centred, hyphenated at the soft hyphen only when a word will not fit.
const SHORT_NAMES = {
  'foundations': 'Promises',
  'consideration': 'Consider\u00ADation',
  'reliance-region': 'Reliance',
  'assent-region': 'Assent',
  'offer-region': 'Offer',
  'acceptance-region': 'Accept\u00ADance',
  'formalities-region': 'Formal\u00ADities',
  'terms-region': 'Battle of forms',
  'remedies-region': 'Remedies',
  'civil-region': 'Land\u00ADmarks',
  'workbench-region': 'Notes',
  'negotiation-region': 'Negoti\u00ADations',
  'bargaining-region': 'Modifi\u00ADcation',
  'interpretation-region': 'Interpre\u00ADtation',
  'limits-region': 'Limits',
  'performance-region': 'Perfor\u00ADmance',
  'remedy-depth-region': 'Relief',
  'excuses-region': 'Mistake',
  'third-parties-region': 'Third parties',
  'semester-workbench': 'Readings',
  'cp-orientation-region': 'Civil action',
  'cp-personal-region': 'Personal jur.',
  'cp-notice-region': 'Notice',
  'cp-subject-region': 'Subject matter',
  'cp-venue-region': 'Venue',
  'cp-governing-region': 'Erie',
  'cp-pleading-region': 'Pleading',
  'cp-joinder-region': 'Joinder',
  'cp-class-region': 'Class actions',
  'cp-summary-region': 'Summary judgment',
  'extension-iekfaa-1': 'Federal rules',
  'lrs-region-legislative-process-and-statutory-interpretation': 'Legis\u00ADlation',
  'lrs-region-delegation-and-statutory-authority': 'Dele\u00ADgation',
  'lrs-region-appointments-and-executive-structure': 'Appoint\u00ADments',
  'lrs-region-removal-and-agency-independence': 'Removal',
  'lrs-region-presidential-control': 'Presi\u00ADdent',
  'lrs-region-rulemaking': 'Rule\u00ADmaking',
  'lrs-region-administrative-rulemaking': 'Admin. rules',
  'lrs-region-administrative-adjudication': 'Adjudi\u00ADcation',
  'lrs-region-judicial-review': 'Judicial review',
  'lrs-region-judicial-review-of-agency-interpretation': 'Defer\u00ADence',
  'lrs-region-judicial-review-and-standing': 'Standing',
  'lrs-region-reading-plans-and-source-gaps': 'Reading plans',
  'extension-cjl74v-1': 'Katzmann',
  'dictionary-region': 'Dictio\u00ADnary',
};
// The floor name: the largest size from 12.5 px down to 10 px at which the short name fits the tile in at most two lines, centred both ways.
function floorLabel(r, pw, ph, z) {
  const name = SHORT_NAMES[r.id] || shortRegionTitle(r),
    maxW = (pw - 10) / z,
    maxH = ph - 6;
  for (let px = Math.min(12.5, pw * 0.16); px >= 10; px -= 0.5) {
    const fs = px / z,
      rows = wrapM(name, maxW, fs, 600, 2, 'region-title');
    if (rows.some((l) => l.endsWith('…'))) continue;
    if (px * 1.23 * (rows.length - 1) + px > maxH) continue;
    return { rows, fs, y: r.y + r.h / 2 - (fs * 1.23 * (rows.length - 1)) / 2 + fs * 0.36 };
  }
  return null;
}
const courseKey12 = (c) => (c === 'Contracts' ? 'k' : c === 'Civil Procedure' ? 'cp' : 'lrs');
function regionCourse(r) {
  if (!r) return null;
  if (r.courseKey) return r.courseKey;
  if (r.col < 3) return 'Contracts';
  if (r.course) return r.course;
  return r.id.startsWith('cp-') || r.id === 'civil-region' ? 'Civil Procedure' : 'Study notes';
}
function courseBlocks() {
  const M = mapData();
  if (M.courseBlocks) return M.courseBlocks;
  const out = {};
  for (const r of M.regions) {
    const k = regionCourse(r);
    if (k === 'Study notes') continue;
    const b = out[k] || (out[k] = { x: r.x, y: r.y, x2: r.x + r.w, y2: r.y + r.h });
    b.x = Math.min(b.x, r.x);
    b.y = Math.min(b.y, r.y);
    b.x2 = Math.max(b.x2, r.x + r.w);
    b.y2 = Math.max(b.y2, r.y + r.h);
  }
  for (const b of Object.values(out)) {
    b.w = b.x2 - b.x;
    b.h = b.y2 - b.y;
  }
  return (M.courseBlocks = out);
}
function galaxy() {
  const M = mapData(),
    key = data.nodes.length + ':' + M.layoutId + ':' + M.regions.length + ':' + data.edges.length;
  if (R11.galaxyKey === key && R11.galaxy) return R11.galaxy;
  R11.galaxyKey = key;
  const blocks = courseBlocks(),
    all = bounds(M.regions.filter((r) => regionCourse(r) !== 'Study notes')),
    cx = all.x + all.w / 2,
    cy = all.y + all.h / 2;
  const courseLabels = [],
    centroid = {},
    design = M.courseDesign || {};
  for (const c of Object.keys(blocks)) {
    courseLabels.push({
      course: c,
      count: data.nodes.filter((n) => regionCourse(regionFor(M.homes[n.id]?.region)) === c).length,
    });
    centroid[c] = { x: blocks[c].x + blocks[c].w / 2, y: blocks[c].y + blocks[c].h / 2 };
  }
  // how strongly each pair of subjects is connected (case-to-concept edges), for the faint constellation threads
  const regOf = new Map(Object.entries(M.homes).map(([id, h]) => [id, h.region])),
    pair = new Map();
  for (const e of data.edges) {
    const a = regOf.get(e.source),
      b = regOf.get(e.target);
    if (!a || !b || a === b) continue;
    const k = a < b ? a + '|' + b : b + '|' + a;
    pair.set(k, (pair.get(k) || 0) + 1);
  }
  const threads = [];
  for (const [k, n] of pair) {
    if (n < 3) continue;
    const [a, b] = k.split('|'),
      ra = regionFor(a),
      rb = regionFor(b);
    if (!ra || !rb || regionCourse(ra) === 'Study notes' || regionCourse(rb) === 'Study notes') continue;
    threads.push({ a: ra, b: rb, n, cross: regionCourse(ra) !== regionCourse(rb) });
  }
  const pad = Math.max(all.w, all.h) * 0.03;
  return (R11.galaxy = {
    cx,
    cy,
    R0: 0,
    R1: all.w / 2,
    pts: new Map(),
    regionLabels: [],
    courseLabels,
    centroid,
    cross: [],
    dust: [],
    blocks,
    arms: {},
    design,
    threads,
    box: { x: all.x - pad, y: all.y - pad * 1.25, w: all.w + pad * 2, h: all.h + pad * 2.25 },
  });
}
function edgePoint(a, b) {
  const ax = a.x + a.w / 2,
    ay = a.y + a.h / 2,
    bx = b.x + b.w / 2,
    by = b.y + b.h / 2,
    dx = bx - ax,
    dy = by - ay;
  const s = Math.min(
    Math.abs(dx) > 0.001 ? a.w / 2 / Math.abs(dx) : Infinity,
    Math.abs(dy) > 0.001 ? a.h / 2 / Math.abs(dy) : Infinity,
  );
  return { x: ax + dx * s, y: ay + dy * s };
}
// The morph band: below z0 the scene is the galaxy, above z1 it is the map. z0 fits the galaxy; z1 fits the smallest course block.
function morphBand() {
  const g = galaxy(),
    a = safeArea();
  const z0 = Math.min(a.w / g.box.w, a.h / g.box.h);
  let z1 = Infinity;
  for (const b of Object.values(g.blocks)) z1 = Math.min(z1, Math.min((a.w - 40) / b.w, (a.h - 40) / b.h));
  return { z0, z1: z0 * 1.15 };
}
function morphT() {
  return 1;
}
function nodePos(id, t) {
  const h = homeFor(id);
  if (!h) return null;
  const hx = h.x + h.w / 2,
    hy = h.y + h.h / 2,
    c = regionCourse(regionFor(h.region));
  if (t >= 1) return { x: hx, y: hy, c };
  const g = galaxy().pts.get(id);
  if (!g) return { x: hx, y: hy, c };
  return { x: g.x + (hx - g.x) * t, y: g.y + (hy - g.y) * t, c: g.c };
}
function headroom(r) {
  const M = mapData(),
    key = M.layoutId + ':' + r.id;
  let v = R11.headroom.get(key);
  if (v === undefined) {
    v = Infinity;
    for (const id of r.districtIds || []) {
      const d = M.districts[id];
      if (d) v = Math.min(v, d.y - r.y);
    }
    R11.headroom.set(key, v);
  }
  return v;
}
function coursePoint(c, t) {
  const g = galaxy(),
    b = g.blocks[c],
    a = g.centroid[c];
  if (!b || !a) return null;
  return { x: a.x + (b.x + b.w / 2 - a.x) * t, y: a.y + (b.y + b.h / 2 - a.y) * t };
}
function nearestEntryAt(p, t) {
  let best = null,
    bd = Infinity;
  for (const [id] of galaxy().pts) {
    const q = nodePos(id, t);
    if (!q) continue;
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bd) {
      bd = d;
      best = id;
    }
  }
  return best;
}
// While the reader zooms through the band, the camera rides with the entry under the pointer, so the point being zoomed on
// stays put while its star becomes its home (or the reverse), the way a fractal zoom keeps its focus.
function morphFollow(t) {
  const prev = R11.lastT;
  R11.lastT = t;
  if (prev === null || prev === t || R11.anim) return;
  if (!R11.focus) R11.focus = nearestEntryAt(S.zoomAnchor || mapCenterVisible(), prev);
  if (!R11.focus) return;
  const a = nodePos(R11.focus, prev),
    b = nodePos(R11.focus, t);
  if (a && b) {
    S.x += b.x - a.x;
    S.y += b.y - a.y;
  }
  if (t <= 0 || t >= 1) R11.focus = null;
}
function autoScope() {
  if (R11.anim) return;
  const band = morphBand();
  if (S.z < band.z1) {
    if (S.scope !== 'Atlas') {
      S.scope = 'Atlas';
      S.region = null;
      S.district = null;
      renderHeading();
    }
  } else if (S.scope === 'Atlas') {
    const c = mapCenterVisible();
    let best = null,
      bd = Infinity;
    for (const [name, b] of Object.entries(galaxy().blocks)) {
      const d = Math.hypot(Math.max(b.x - c.x, 0, c.x - b.x - b.w), Math.max(b.y - c.y, 0, c.y - b.y - b.h));
      if (d < bd) {
        bd = d;
        best = name;
      }
    }
    if (best) {
      S.scope = best;
      renderHeading();
    }
  }
}
function zoomFloor() {
  return morphBand().z0;
}
function clampCamera(active) {
  if (!data.studyMap) return;
  const band = morphBand();
  if (S.z < band.z0) S.z = band.z0;
  const t = morphT(S.z, band);
  const a = safeArea(),
    aw = a.w / S.z,
    ah = a.h / S.z,
    c = mapCenterVisible();
  let b;
  if (t < 1 || S.scope === 'Atlas') b = galaxy().box;
  else b = bounds([scopeBox(), ...scopeRegions(), ...[...(active || [])].map((id) => homeFor(id))]);
  let lo = b.x + aw / 2 - aw * 0.3,
    hi = b.x + b.w - aw / 2 + aw * 0.3;
  const cx = lo > hi ? b.x + b.w / 2 : Math.min(hi, Math.max(lo, c.x));
  lo = b.y + ah / 2 - ah * 0.3;
  hi = b.y + b.h - ah / 2 + ah * 0.3;
  const cy = lo > hi ? b.y + b.h / 2 : Math.min(hi, Math.max(lo, c.y));
  S.x += cx - c.x;
  S.y += cy - c.y;
}
// ---- Measured text. Widths come from a canvas at 100 px and scale linearly, so wrapping never overflows its box.
function fam(cls) {
  return R11_FONT;
}
function measure(s, fs, weight = 400, cls = '') {
  const k = weight + '|' + fam(cls) + '|' + s;
  let w = R11.measure.get(k);
  if (w === undefined) {
    R11.ctx.font = `${weight} 100px ${fam(cls)}`;
    w = R11.ctx.measureText(s).width;
    if (R11.measure.size > 20000) R11.measure.clear();
    R11.measure.set(k, w);
  }
  return (w * fs) / 100;
}
function ellipsize(s, maxW, fs, weight, cls) {
  if (measure(s, fs, weight, cls) <= maxW) return s;
  let t = s;
  while (t.length > 1 && measure(t + '…', fs, weight, cls) > maxW) t = t.slice(0, -1).replace(/\s+$/, '');
  return t + '…';
}
function wrapM(t, maxW, fs, weight = 400, maxLines = 3, cls = '') {
  const words = String(t || '')
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];
  let l = '';
  for (const w0 of words) {
    const w = w0.replace(/\u00AD/g, ''),
      cand = l ? l + ' ' + w : w;
    if (l && measure(cand, fs, weight, cls) > maxW) {
      lines.push(l);
      l = w;
    } else l = cand;
    if (w0.includes('\u00AD') && l === w && measure(w, fs, weight, cls) > maxW) {
      const parts = w0.split('\u00AD');
      for (let k = parts.length - 1; k >= 1; k--) {
        const head = parts.slice(0, k).join('') + '-';
        if (measure(head, fs, weight, cls) <= maxW) {
          lines.push(head);
          l = parts.slice(k).join('');
          break;
        }
      }
    }
  }
  if (l) lines.push(l);
  if (!lines.length) return [''];
  if (lines.length > maxLines) {
    const rest = lines.slice(maxLines - 1).join(' ');
    lines.length = maxLines;
    lines[maxLines - 1] = rest;
  }
  return lines.map((line) => ellipsize(line, maxW, fs, weight, cls));
}
function textLines(rows, x, y, fs, fill, weight, cls, anchor, halo, attrs) {
  return `<text x="${x}" y="${y}" font-size="${fs}" font-weight="${weight}" fill="${fill}" class="${cls}"${anchor && anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}${halo ? ` stroke="#101820" stroke-opacity=".85" stroke-width="${halo}" paint-order="stroke" stroke-linejoin="round"` : ''}${attrs ? ' ' + attrs : ''}>${rows.map((l, i) => `<tspan x="${x}" dy="${i ? fs * 1.23 : 0}">${E(l)}</tspan>`).join('')}</text>`;
}
function text(t, x, y, width, fs, fill = '#dce4eb', lines = 2, weight = 400, cls = '') {
  return textLines(wrapM(t, width, fs, weight, lines, cls), x, y, fs, fill, weight, cls);
}
// ---- Labels compete for screen space in priority order (course > subject > subtopic > detail); losers fade out over 300 ms.
let frameLabels = [],
  frameZ = 1,
  frameB = { x: 0, y: 0, w: 1, h: 1 },
  frameObstacles = [],
  frameChrome = [];
function putLabel(o) {
  const fs = o.fs,
    weight = o.weight || 400,
    cls = o.cls || '';
  let box = o.box,
    html = o.html;
  if (html == null) {
    const rows = o.rows || wrapM(o.text, o.width ?? 1e9, fs, weight, o.lines || 1, cls);
    const wMax = Math.max(...rows.map((r) => measure(r, fs, weight, cls)));
    const anchor = o.anchor || 'start';
    const x0 = anchor === 'middle' ? o.x - wMax / 2 : anchor === 'end' ? o.x - wMax : o.x;
    box = {
      x: (x0 - frameB.x) * frameZ,
      y: (o.y - fs * 0.85 - frameB.y) * frameZ,
      w: wMax * frameZ,
      h: (fs * 1.2 + fs * 1.23 * (rows.length - 1)) * frameZ,
    };
    html = textLines(
      rows,
      o.x,
      o.y,
      fs,
      o.fill || '#dce4eb',
      weight,
      'map-label ' + cls,
      anchor,
      o.halo === false ? 0 : Math.min(2.4, Math.max(1.1, fs * frameZ * 0.13)) / frameZ,
      o.attrs,
    );
    o.rows = rows;
  }
  frameLabels.push({ ...o, box, html });
  return o;
}
function resolveLabels(V) {
  const out = [],
    seen = new Set(),
    grid = new Map(),
    cell = 48,
    dt = R11.dt;
  const put = (b) => {
    for (let gx = Math.floor(b.x / cell); gx <= Math.floor((b.x + b.w) / cell); gx++)
      for (let gy = Math.floor(b.y / cell); gy <= Math.floor((b.y + b.h) / cell); gy++) {
        const k = gx + ',' + gy;
        let l = grid.get(k);
        if (!l) grid.set(k, (l = []));
        l.push(b);
      }
  };
  const hit = (b, pad) => {
    for (let gx = Math.floor((b.x - pad) / cell); gx <= Math.floor((b.x + b.w + pad) / cell); gx++)
      for (let gy = Math.floor((b.y - pad) / cell); gy <= Math.floor((b.y + b.h + pad) / cell); gy++) {
        const list = grid.get(gx + ',' + gy);
        if (!list) continue;
        for (const o of list)
          if (
            b.x - pad < o.x + o.w &&
            b.x + b.w + pad > o.x &&
            b.y - pad < o.y + o.h &&
            b.y + b.h + pad > o.y
          )
            return o.k || true;
      }
    return false;
  };
  frameLabels.sort((a, b) => a.pri - b.pri || String(a.key).localeCompare(String(b.key)));
  R11.blockedBy = new Map();
  for (const b of frameChrome) put(b);
  for (const l of frameLabels) {
    if (seen.has(l.key)) continue;
    seen.add(l.key);
    let st = R11.labelState.get(l.key);
    if (!st) {
      st = { o: reducedMotion ? 1 : 0, target: 1, html: null };
      R11.labelState.set(l.key, st);
    }
    if (l.box.x > V.w + 120 || l.box.y > V.h + 120 || l.box.x + l.box.w < -120 || l.box.y + l.box.h < -120) {
      st.html = null;
      continue;
    }
    const blk = l.nocollide ? false : hit(l.box, st.o > 0.5 ? 0 : 2);
    let ok = !blk;
    if (blk) R11.blockedBy.set(l.key, blk);
    if (ok && l.avoidBoxes) {
      for (const o of frameObstacles) {
        if (
          l.box.x - 4 < o.x + o.w &&
          l.box.x + l.box.w + 4 > o.x &&
          l.box.y - 4 < o.y + o.h &&
          l.box.y + l.box.h + 4 > o.y
        ) {
          ok = false;
          R11.blockedBy.set(l.key, 'box');
          break;
        }
      }
    }
    if (ok) {
      l.box.k = l.key;
      put(l.box);
    }
    st.target = ok ? 1 : 0;
    st.html = l.sticky === false ? null : l.html;
    st.box = l.box;
    st.fast = !!l.fast;
    st.o = st.target > st.o ? Math.min(st.target, st.o + dt / 300) : Math.max(st.target, st.o - dt / 300);
    if (st.o !== st.target) settling = true;
    const op = st.o * (l.op ?? 1);
    if (op > 0.004)
      out.push(`<g opacity="${op.toFixed(3)}"${l.clickable ? '' : ' pointer-events="none"'}>${l.html}</g>`);
  }
  for (const [k, st] of R11.labelState) {
    if (seen.has(k)) continue;
    if (!st.html || st.o <= 0.004 || st.fast) {
      R11.labelState.delete(k);
      continue;
    }
    st.o = Math.max(0, st.o - dt / 300);
    settling = true;
    if (st.o > 0.004) out.push(`<g opacity="${st.o.toFixed(3)}" pointer-events="none">${st.html}</g>`);
    else R11.labelState.delete(k);
  }
  frameLabels = [];
  return out.join('');
}
// Whole groups (subtopics, cards) fade in when they first qualify and fade out from their last drawing when they stop.
function fadeIn(key, html, sticky = true) {
  let st = R11.fades.get(key);
  if (!st) {
    st = { o: reducedMotion ? 1 : 0 };
    R11.fades.set(key, st);
  }
  st.seen = R11.frame;
  st.html = sticky ? html : null;
  if (st.o < 1) {
    st.o = Math.min(1, st.o + R11.dt / 300);
    settling = true;
  }
  return { o: st.o, html: st.o < 1 ? `<g opacity="${st.o.toFixed(3)}">${html}</g>` : html };
}
function fadeOuts() {
  const out = [];
  for (const [k, st] of R11.fades) {
    if (st.seen === R11.frame) continue;
    if (!st.html) {
      R11.fades.delete(k);
      continue;
    }
    st.o -= R11.dt / 300;
    if (st.o <= 0.004) {
      R11.fades.delete(k);
      continue;
    }
    settling = true;
    out.push(`<g opacity="${st.o.toFixed(3)}" pointer-events="none">${st.html}</g>`);
  }
  return out.join('');
}
function nearestStar(clientX, clientY, maxPx = 9) {
  const v = rect(),
    x = S.x + (clientX - v.x - v.w / 2) / S.z,
    y = S.y + (clientY - v.y - v.h / 2) / S.z;
  let best = null,
    bd = maxPx / S.z;
  for (const s of R11.starIndex) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) {
      bd = d;
      best = s.id;
    }
  }
  return best;
}
function draw() {
  if (!data.studyMap) return;
  applyPalette(mapData());
  const now = performance.now();
  R11.dt = reducedMotion ? 1e9 : Math.min(100, Math.max(1, now - (R11.lastFrame || now - 16)));
  R11.lastFrame = now;
  R11.frame++;
  const activeEdges = shownEdges(),
    active = new Set();
  for (const e of activeEdges) {
    active.add(e.source);
    active.add(e.target);
  }
  if (selected?.type === 'node') active.add(selected.id);
  const band = morphBand();
  if (S.z < band.z0) S.z = band.z0;
  const t = 1;
  autoScope();
  clampCamera(active);
  const B = visibleBox(),
    z = S.z,
    V = rect();
  frameB = B;
  frameZ = z;
  svg.setAttribute('viewBox', `${B.x} ${B.y} ${B.w} ${B.h}`);
  settling = false;
  appearSeq = 0;
  seenNow = new Set();
  const G = galaxy(),
    M = mapData(),
    regions = M.regions,
    inScope = new Set(scopeRegions().map((r) => r.id)),
    wasVisible = new Set(S.paintNodes || []);
  const activeRegions = new Set([...active].map((id) => homeFor(id)?.region));
  const parts = [],
    starParts = [],
    cardParts = [],
    edgeParts = [],
    visible = new Set(),
    cardO = new Map();
  R11.modes = new Map();
  let anyClose = false;
  frameObstacles = regions
    .filter((r) => intersects(r, B, 0))
    .map((r) => ({ x: (r.x - B.x) * z, y: (r.y - B.y) * z, w: r.w * z, h: r.h * z }));
  frameChrome = [
    ...document.querySelectorAll('.map-nav,#mapWelcome,#mapHint,#saveStatus,#inspector,.zoom-controls'),
  ]
    .filter((el) => !el.hidden && el.offsetParent !== null)
    .map((el) => {
      const b = el.getBoundingClientRect();
      return {
        x: b.left - (V.x || 0) - 6,
        y: b.top - (V.y || 0) - 6,
        w: b.width + 12,
        h: b.height + 12,
        k: 'chrome',
      };
    });
  const defs = `<defs><pattern id="mapDots" width="${26 / z}" height="${26 / z}" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="${0.7 / z}" fill="#879cab" opacity=".07"/></pattern><radialGradient id="galaxyCore"><stop offset="0" stop-color="#e8d9b8" stop-opacity=".5"/><stop offset=".35" stop-color="#7a6a4a" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient><marker id="arrowHead" viewBox="0 0 9 9" refX="8" refY="4.5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1 L8 4.5 L1 8" fill="none" stroke="#b9bec0" stroke-width="1.3"/></marker></defs>`;
  if (t < 1) {
    parts.push(
      `<g opacity="${(1 - t).toFixed(3)}" pointer-events="none"><circle cx="${G.cx}" cy="${G.cy}" r="${G.R1 * 0.42}" fill="url(#galaxyCore)"/>`,
    );
    for (const d of G.dust)
      parts.push(
        `<circle cx="${d.x.toFixed(0)}" cy="${d.y.toFixed(0)}" r="${(d.r / z).toFixed(1)}" fill="#9fb3c4" opacity="${d.o}"/>`,
      );
    for (const e of G.cross) {
      const a = nodePos(e.source, t),
        b = nodePos(e.target, t);
      if (!a || !b) continue;
      parts.push(
        `<path d="M${a.x.toFixed(0)},${a.y.toFixed(0)} Q${G.cx.toFixed(0)},${G.cy.toFixed(0)} ${b.x.toFixed(0)},${b.y.toFixed(0)}" fill="none" stroke="#c9d3dc" stroke-opacity=".1" stroke-width="${1 / z}"/>`,
      );
    }
    parts.push('</g>');
  }
  const defs2 = Object.entries(G.blocks)
    .map(
      ([c]) =>
        `<radialGradient id="glow-${courseKey12(c)}"><stop offset="0" stop-color="${ARM_COLORS[c] || '#9fb3c4'}" stop-opacity=".16"/><stop offset=".55" stop-color="${ARM_COLORS[c] || '#9fb3c4'}" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`,
    )
    .join('');
  parts.push(`<defs>${defs2}</defs>`);
  const glowOp = Math.min(1, Math.max(0, (band.z1 * 4 - z) / (band.z1 * 3)));
  for (const [c, b] of Object.entries(G.blocks)) {
    const dimc = S.scope !== 'Atlas' && S.scope !== c ? 0.5 : 1;
    if (glowOp > 0)
      parts.push(
        `<ellipse cx="${b.x + b.w / 2}" cy="${b.y + b.h / 2}" rx="${b.w * 0.75}" ry="${b.h * 0.85}" fill="url(#glow-${courseKey12(c)})" opacity="${(glowOp * dimc).toFixed(3)}" pointer-events="none"/>`,
      );
    const dz = G.design[c];
    if (!dz) continue;
    const col = ARM_COLORS[c] || '#9fb3c4';
    for (const zn of dz.zones || []) {
      if (!intersects(zn, B, 200) || zn.w * z <= 150) continue;
      const head = 360 * z,
        zfs = Math.min(15, Math.max(11, zn.w * z * 0.018)) / z,
        zpx = zfs * z;
      if (head < zpx * 1.6) continue;
      parts.push(
        `<rect x="${zn.x}" y="${zn.y}" width="${zn.w}" height="${zn.h}" rx="220" fill="${col}" fill-opacity="${(0.07 * dimc).toFixed(3)}" stroke="${col}" stroke-opacity="${(0.32 * dimc).toFixed(3)}" stroke-width="${1.2 / z}" stroke-dasharray="${14 / z} ${10 / z}" pointer-events="none"/>`,
      );
      const rows = wrapM(
          zn.title.toUpperCase(),
          zn.w - 68 / z,
          zfs,
          600,
          head >= zpx * 2.6 ? 2 : 1,
          'zone-title',
        ),
        x0 = zn.x + 34 / z,
        y0 = zn.y + 14 / z + zfs,
        zs = 10.5 / z,
        subRows =
          zn.subtitle && head >= zpx * 1.6 * rows.length + 15
            ? wrapM(zn.subtitle, zn.w - 68 / z, zs, 400, 1)
            : [],
        ys = y0 + zfs * 1.23 * (rows.length - 1) + zs * 1.55,
        wz = Math.max(
          ...rows.map((r) => measure(r, zfs, 600, 'zone-title')),
          ...subRows.map((r) => measure(r, zs, 400)),
        ),
        hz =
          (subRows.length ? ys + zs * 0.3 : y0 + zfs * 1.23 * (rows.length - 1) + zfs * 0.35) -
          (y0 - zfs * 0.85);
      putLabel({
        key: 'zone:' + zn.id,
        pri: 0.8,
        box: { x: (x0 - B.x) * z, y: (y0 - zfs * 0.85 - B.y) * z, w: wz * z, h: hz * z },
        html:
          textLines(
            rows,
            x0,
            y0,
            zfs,
            col,
            600,
            'map-label zone-title',
            null,
            Math.min(2.4, Math.max(1.1, zpx * 0.13)) / z,
          ) +
          (subRows.length ? textLines(subRows, x0, ys, zs, '#c9d4de', 400, 'map-label', null, 1.2 / z) : ''),
        op: 0.9 * dimc,
        avoidBoxes: true,
      });
    }
    for (const sp of dz.spine || []) {
      if (S.scope === 'Atlas') break;
      const ra = regionFor(sp.a),
        rb = regionFor(sp.b);
      if (!ra || !rb) continue;
      const p = edgePoint(ra, rb),
        q = edgePoint(rb, ra);
      const dash =
        sp.kind === 'contrast'
          ? ` stroke-dasharray="${8 / z} ${8 / z}"`
          : sp.kind === 'depends'
            ? ` stroke-dasharray="${2 / z} ${7 / z}" stroke-linecap="round"`
            : '';
      parts.push(
        `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${col}" stroke-opacity="${(0.32 * dimc).toFixed(3)}" stroke-width="${Math.min(2.2 / z, 90)}"${dash} pointer-events="none"/>`,
      );
      if (sp.label && Math.hypot(q.x - p.x, q.y - p.y) * z > 260 && z > band.z1 * 2.5)
        putLabel({
          key: 'spine:' + sp.a + sp.b,
          pri: 3.5,
          x: (p.x + q.x) / 2,
          y: (p.y + q.y) / 2 - 5 / z,
          fs: 11 / z,
          anchor: 'middle',
          text: sp.label,
          fill: courseScale(c)[6],
          weight: 500,
          op: 0.9 * dimc,
          avoidBoxes: true,
        });
    }
    for (const [i, lb] of (dz.labels || []).entries()) {
      const big = lb.size === 'large';
      if (!big || S.scope === 'Atlas') continue;
      putLabel({
        key: 'note:' + c + i,
        pri: big ? 2.2 : 3.4,
        x: lb.x,
        y: lb.y,
        fs: (big ? 17 : 11.5) / z,
        text: lb.text,
        fill: big ? col : '#a9b8c6',
        weight: big ? 500 : 400,
        cls: big ? 'region-title' : '',
        op: (big ? 0.8 : 0.9) * dimc,
        avoidBoxes: true,
      });
    }
  }
  // constellation threads: the subjects that share the most cases, faint and curved, fading out once cards are readable
  const thOp = Math.min(1, Math.max(0, (0.42 - z) / 0.18));
  if (thOp > 0)
    for (const th of G.threads) {
      if (!intersects(bounds([th.a, th.b]), B, 100)) continue;
      const p = edgePoint(th.a, th.b),
        q = edgePoint(th.b, th.a),
        mx = (p.x + q.x) / 2,
        my = (p.y + q.y) / 2,
        nx = -(q.y - p.y),
        ny = q.x - p.x,
        len = Math.hypot(nx, ny) || 1,
        bow = Math.min(500, Math.hypot(q.x - p.x, q.y - p.y) * 0.07);
      const col = th.cross ? '#c9d3dc' : ARM_COLORS[regionCourse(th.a)] || '#9fb3c4';
      const sc =
        S.scope !== 'Atlas' && (S.scope !== regionCourse(th.a) || S.scope !== regionCourse(th.b)) ? 0.45 : 1;
      parts.push(
        `<path d="M${p.x.toFixed(0)},${p.y.toFixed(0)} Q${(mx + (nx / len) * bow).toFixed(0)},${(my + (ny / len) * bow).toFixed(0)} ${q.x.toFixed(0)},${q.y.toFixed(0)}" fill="none" stroke="${col}" stroke-opacity="${(Math.min(0.16, 0.04 + th.n * 0.012) * thOp * sc).toFixed(3)}" stroke-width="${Math.min(1.2 / z, 50) * (1 + Math.min(1.5, th.n / 8))}" pointer-events="none"/>`,
      );
    }
  for (const cl of G.courseLabels) {
    const b = G.blocks[cl.course],
      col = ARM_COLORS[cl.course] || '#dce4eb';
    const fs = R18.courseTitlePx(z) / z,
      x = b.x + b.w / 2,
      topY = Math.min(b.y, ...(G.design[cl.course]?.zones || []).map((zn) => zn.y)),
      y = topY - fs * 0.9,
      crow = R18.courseTitleRows(cl.course);
    const subjects = regions.filter((r) => regionCourse(r) === cl.course && r.step).length,
      dimc = S.scope !== 'Atlas' && S.scope !== cl.course ? 0.5 : 1;
    putLabel({
      key: 'course:' + cl.course,
      pri: 0,
      x,
      y: y - (crow.length - 1) * fs * 1.23,
      fs,
      anchor: 'middle',
      rows: crow,
      fill: col,
      weight: 600,
      cls: 'course-label',
      op: dimc,
      clickable: true,
      attrs: `data-study-scope="${E(cl.course)}" role="button" tabindex="0"`,
    });
    putLabel({
      key: 'coursen:' + cl.course,
      pri: 0.5,
      x,
      y: y + fs * 0.62,
      fs: fs * 0.42,
      anchor: 'middle',
      text: `${cl.count} entries · ${subjects} subjects`,
      fill: '#93a7b7',
      weight: 500,
      op: dimc,
    });
  }
  const armLabel = new Map(G.regionLabels.map((l) => [l.id, l]));
  for (const r of regions) {
    const course = regionCourse(r),
      isCourse = course !== 'Study notes',
      scoped = inScope.has(r.id) || activeRegions.has(r.id);
    const pw = r.w * z,
      hr0 = headroom(r),
      fullOn = isFinite(hr0) ? hr0 * z >= 17 : pw >= 470,
      mode = pw < 200 ? 'star' : fullOn ? 'full' : 'mid',
      fullT = isFinite(hr0) ? Math.min(1, Math.max(0, (hr0 * z - 17) / 14)) : 1,
      focusHere = S.region === r.id,
      weight = isCourse ? regionWeight(r.id) : 0.5,
      col = regionColor(r),
      acc = regionAccent(r),
      tint = regionTint(r);
    const al = armLabel.get(r.id),
      near = intersects(r, B, 200);
    if (!al && !near) continue;
    const dim =
      (selected && S.region && S.region !== r.id && !activeRegions.has(r.id) ? 0.54 : 1) * (scoped ? 1 : 0.3);
    const armCol = ARM_COLORS[course] || col;
    let tpx = Math.min(30, 9 + 5 * weight + pw * 0.022);
    const hr = hr0;
    if (mode === 'full' && isFinite(hr)) tpx = Math.min(tpx, Math.max(10.5, (hr * z - 8) / 1.2));
    let tfs = tpx / z;
    const badgeOn = !!r.step && pw >= 120 && !(mode === 'full' && isFinite(hr) && hr * z < 26),
      tx0 = r.x + 40 + (badgeOn ? 30 / z : 0);
    let ty0 =
      isFinite(hr) && mode === 'full'
        ? Math.min(r.y + 22 / z + tfs, r.y + hr - 6 / z - tfs * 0.35)
        : r.y + 22 / z + tfs;
    let lx = al ? al.x + (tx0 - al.x) * t : tx0,
      ly = al ? al.y + (ty0 - al.y) * t : ty0;
    R11.modes.set(r.id, mode);
    const tile = mode === 'full' ? fullT : 0,
      fillO = focusHere ? 0.55 : 0.8 + (0.24 + 0.08 * weight - 0.8) * tile,
      strokeO = focusHere ? 0.6 : 0.95 + (0.5 + 0.2 * weight - 0.95) * tile,
      fillCol = focusHere ? regionScale(r)[0] : col,
      strokeCol = focusHere ? acc : col;
    const badgeW = badgeOn ? 30 / z : 0,
      titleW = Math.max(r.w - 80 - badgeW, 60 / z);
    const availPx = (mode === 'full' && isFinite(hr) ? hr : r.h) * z - (mode === 'full' ? 4 : 22);
    let titleLines = Math.max(0, Math.min(mode === 'star' ? 3 : 2, Math.floor(availPx / (tfs * z * 1.23))));
    if (titleLines < 1) {
      const fit = availPx / 1.23;
      if (fit >= 10.5) {
        tfs = Math.min(tfs, fit / z);
        titleLines = 1;
        ty0 = r.y + 22 / z + tfs;
        ly = al ? al.y + (ty0 - al.y) * t : ty0;
      }
    }
    let titleRows = [],
      floor = null;
    if (pw < 120) {
      floor = floorLabel(r, pw, r.h * z, z);
      if (floor) {
        titleRows = floor.rows;
        tfs = floor.fs;
        lx = r.x + r.w / 2;
        ly = floor.y;
      }
    } else {
      titleRows = titleLines ? wrapM(shortRegionTitle(r), titleW, tfs, 600, titleLines, 'region-title') : [];
      if (titleRows.some((l) => l.endsWith('…')) && SHORT_NAMES[r.id]) {
        const alt = wrapM(
          SHORT_NAMES[r.id].replace(/\u00ad/g, ''),
          titleW,
          tfs,
          600,
          titleLines,
          'region-title',
        );
        if (alt.length && !alt.some((l) => l.endsWith('…'))) titleRows = alt;
      }
    }
    const showTitle = floor ? pw >= 36 : pw >= 72;
    if (intersects(r, B, 80)) {
      parts.push(
        `<g class="map-region" opacity="${dim.toFixed(3)}"><path d="${regionPath(r)}" fill="${fillCol}" fill-opacity="${fillO.toFixed(3)}" stroke="${strokeCol}" stroke-opacity="${strokeO.toFixed(3)}" stroke-width="${Math.max(1.4 / z, tile < 1 ? 50 * (1 - tile) : 0)}" data-map-region="${E(r.id)}" class="territory-hit" role="button" tabindex="0" aria-label="Explore ${E(shortRegionTitle(r))}"${t < 0.5 ? ' pointer-events="none"' : ''}><title>${E(shortRegionTitle(r))}</title></path>`,
      );
      const titleSt = R11.labelState.get('rt:' + r.id);
      if (badgeOn && showTitle && titleRows.length && (!titleSt || titleSt.o > 0.3))
        parts.push(
          `<g opacity="${(Math.min(1, (pw - 72) / 30) * (titleSt ? titleSt.o : 1)).toFixed(3)}" pointer-events="none"><circle cx="${r.x + 40 + 9.5 / z}" cy="${ty0 - tfs * 0.34}" r="${9.5 / z}" fill="${acc}" fill-opacity=".95"/><text x="${r.x + 40 + 9.5 / z}" y="${ty0 - tfs * 0.34 + 3.7 / z}" font-size="${10.5 / z}" font-weight="600" fill="#101820" text-anchor="middle">${r.step}</text></g>`,
        );
      parts.push('</g>');
    }
    const labelOp = showTitle && titleRows.length ? (floor ? 1 : Math.min(1, (pw - 72) / 30)) * dim : 0;
    if (labelOp > 0.02)
      putLabel({
        key: 'rt:' + r.id,
        pri: 1 + (1 - weight) * 0.5,
        x: lx,
        y: ly,
        fs: tfs,
        rows: titleRows,
        fill: '#f7f5f0',
        weight: 600,
        cls: 'region-title',
        anchor: floor ? 'middle' : 'start',
        op: labelOp,
        halo: tile >= 0.5,
        clickable: t >= 0.5,
        attrs: `data-map-region="${E(r.id)}" role="button" tabindex="0"`,
      });
    if (t < 1 || !near) continue;
    let yy = ty0 + (titleRows.length - 1) * tfs * 1.23 + tfs * 1.55;
    const bottom = r.y + r.h - 12 / z;
    if (r.special === 'glossary') {
      const cnt = window.DKLA?.glossaryCount?.() || 0;
      if (mode !== 'star' && cnt)
        putLabel({
          key: 'rk:' + r.id,
          pri: 3,
          x: r.x + 40,
          y: yy,
          fs: 11 / z,
          text: `${cnt.toLocaleString()} terms · click to browse`,
          fill: tint,
          weight: 500,
          width: r.w - 100,
          lines: 1,
          op: dim,
        });
      continue;
    }
    const sfs = Math.min(14, Math.max(10.5, 9 + pw * 0.006)) / z,
      sfs2 = Math.max(10.5 / z, sfs * 0.93),
      lh = sfs * 1.45,
      lcol = tint;
    if (mode === 'full' && r.routeLabel) {
      const tw = Math.max(...titleRows.map((l) => measure(l, tfs, 600, 'region-title')));
      const room = r.x + r.w - 40 - (tx0 + tw + 18 / z);
      if (room > 120 / z)
        putLabel({
          key: 'rk:' + r.id,
          pri: 3,
          x: tx0 + tw + 18 / z,
          y: ty0,
          fs: sfs,
          text: r.routeLabel,
          fill: lcol,
          weight: 600,
          width: room,
          lines: 1,
          op: dim,
          halo: false,
        });
    }
    if (mode === 'mid') {
      // The summary admits its lines in a fixed order (question, tally, principal cases, subtopics, description) and each line, once admitted, keeps its place as the zoom grows: nothing appears and then vanishes.
      const avail = bottom - yy,
        tally = regionTally(r.id),
        tallyText = tally.total
          ? `${tally.cases} case${tally.cases === 1 ? '' : 's'} · ${tally.concepts} concept${tally.concepts === 1 ? '' : 's'}${tally.notes ? ` · ${tally.notes} note${tally.notes === 1 ? '' : 's'}` : ''}`
          : '';
      const localFocus = [...active]
        .filter((id) => homeFor(id)?.region === r.id)
        .map((id) => nodesById.get(id))
        .filter(Boolean);
      const description = localFocus.length
        ? localFocus.slice(0, 4).map(displayName).join(' · ')
        : /^Explore the questions| in the assigned readings\.?$/.test(r.description || '')
          ? ''
          : r.description || '';
      const namesAll = data.nodes
          .filter((n) => homeFor(n.id)?.region === r.id && geoPlacement(n.id).role === 'Principal case')
          .slice(0, 4)
          .map((n) => displayName(n)),
        nameRows = namesAll.length ? wrapM(namesAll.join(' · '), r.w - 100, sfs2, 500, 2) : [],
        hN = nameRows.length ? lh * nameRows.length + lh * 0.7 : 0;
      const subs = (r.districtIds || []).map(districtFor).filter(Boolean),
        hS = subs.length ? lh * (1 + subs.length) : 0;
      const dRows = description ? wrapM(description, r.w - 100, sfs, 400, 3) : [],
        hD = dRows.length ? lh * dRows.length + lh * 0.5 : 0;
      const hT = tallyText ? lh * 1.15 : 0;
      const q1 = r.routeLabel ? wrapM(r.routeLabel, r.w - 100, sfs, 600, 1) : [],
        q2 = r.routeLabel ? wrapM(r.routeLabel, r.w - 100, sfs, 600, 2) : [];
      const qRows = q2.length > 1 && avail >= lh * 2 + lh * 0.6 + hT ? q2 : q1,
        hQ = qRows.length ? lh * qRows.length + lh * 0.6 : 0;
      const showT = avail >= hQ + hT,
        showN = hN > 0 && avail >= hQ + hT + hN,
        subRows = subs.length
          ? Math.max(0, Math.min(subs.length, Math.floor((avail - hQ - hT - hN - lh) / lh)))
          : 0,
        showD = hD > 0 && avail >= hQ + hT + hN + hS + hD;
      if (qRows.length && avail >= hQ - lh * 0.6) {
        putLabel({
          key: 'rk:' + r.id,
          pri: 3,
          x: r.x + 40,
          y: yy,
          fs: sfs,
          rows: qRows,
          fill: lcol,
          weight: 600,
          op: dim,
          halo: false,
        });
        yy += hQ;
      }
      if (showT) {
        putLabel({
          key: 'rc:' + r.id,
          pri: 3,
          x: r.x + 40,
          y: yy,
          fs: sfs2,
          text: tallyText,
          fill: '#e3e8ee',
          weight: 500,
          op: dim,
          halo: false,
        });
        yy += hT;
      }
      if (showD) {
        putLabel({
          key: 'rd:' + r.id,
          pri: 3.5,
          x: r.x + 40,
          y: yy,
          fs: sfs,
          rows: dRows,
          fill: localFocus.length ? lcol : '#e3e8ee',
          op: dim,
          halo: false,
        });
        yy += hD;
      }
      if (showN) {
        putLabel({
          key: 'rn:' + r.id,
          pri: 4,
          x: r.x + 40,
          y: yy,
          fs: sfs2,
          rows: nameRows,
          fill: lcol,
          weight: 500,
          op: dim,
          halo: false,
        });
        yy += hN;
      }
      if (subRows >= 1) {
        putLabel({
          key: 'rs:' + r.id,
          pri: 4.3,
          x: r.x + 40,
          y: yy,
          fs: sfs2,
          text: `${subs.length} subtopic${subs.length === 1 ? '' : 's'}`,
          fill: '#e3e8ee',
          weight: 600,
          op: dim,
          halo: false,
        });
        yy += lh;
        const shown = subRows < subs.length ? Math.max(0, subRows - 1) : subRows;
      }
    } else if (mode === 'full') {
      for (const id of r.districtIds) {
        const d = districtFor(id);
        if (!d || !intersects(d, B, 45)) continue;
        const sample = Object.values(M.homes).find((c) => c.district === d.id && c.core);
        const was = R11.districtCards.has(d.id),
          hy = was ? 0.85 : 1;
        const showCards = d.w * z >= 310 * hy && (!sample || sample.h * z >= 30 * hy),
          full = d.w * z >= 560 * hy && (!sample || sample.h * z >= 36 * hy);
        anyClose ||= full;
        if (showCards) R11.districtCards.add(d.id);
        else R11.districtCards.delete(d.id);
        const dIn = entrance('d:' + d.id, d.x + d.w / 2, d.y + d.h / 2, now);
        const g = [];
        g.push(
          `<g class="map-district" opacity="${(dIn.o * dim).toFixed(3)}"${dIn.tr}><rect x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" rx="16" fill="#17232d" fill-opacity=".76" stroke="${acc}" stroke-opacity="${S.district === d.id ? 0.38 : 0.15}" stroke-width="${0.8 / z}" class="district-hit" data-map-district="${E(d.id)}" role="button" tabindex="0" aria-label="Explore ${E(d.title)}"><title>${E(d.question)}</title></rect>`,
        );
        const tfs2 = Math.min(Math.max((d.headerH || 91) * 0.9, 10.5 / z), 14 / z),
          tRows =
            tfs2 * z >= 10
              ? wrapM(d.title, d.w - 48, tfs2, 550, (d.headerH || 91) >= tfs2 * 2.3 ? 2 : 1)
              : [],
          tY = d.y + Math.max(Math.min(48, (d.headerH || 91) * 0.55), tfs2 * 0.95 + 4 / z);
        if (tRows.length)
          putLabel({
            key: 'dt:' + d.id,
            pri: 2,
            x: d.x + 24,
            y: tY,
            fs: tfs2,
            rows: tRows,
            fill: acc,
            weight: 600,
            op: dIn.o * dim,
            clickable: true,
            attrs: `data-map-district="${E(d.id)}" role="button" tabindex="0"`,
          });
        if (!showCards && !S.connectionOverview) {
          const qy = Math.max(d.y + (d.headerH || 91) + 36, tY + tRows.length * tfs2 * 1.23 + 14 / z);
          const dqRows = R18.showQuestion(d, z, (d.y + d.h - qy) * z)
            ? wrapM(d.question, d.w - 52, 13 / z, 400, d.h * z >= 150 ? 2 : 1)
            : [];
          if (dqRows.length)
            putLabel({
              key: 'dq:' + d.id,
              pri: 2.4,
              fast: true,
              x: d.x + 26,
              y: qy,
              fs: 13 / z,
              rows: dqRows,
              fill: '#dbe4ec',
              op: dIn.o * dim,
            });
          let yy2 = qy + (dqRows.length ? (dqRows.length * 17 + 15) / z : 2 / z);
          const ns = R18.districtRows(id, d),
            pitch = 22 / z,
            max = Math.max(0, Math.floor((d.y + d.h - 14 / z - yy2) / pitch) + 1),
            cut = ns.length > max ? Math.max(1, max - 1) : ns.length;
          for (const n of ns.slice(0, max >= 1 ? cut : 0)) {
            putLabel({
              key: 'dr:' + d.id + ':' + n.id,
              pri: 2.6,
              fast: true,
              x: d.x + 33,
              y: yy2,
              fs: 12 / z,
              text: displayName(n),
              width: d.w - 67,
              lines: 1,
              fill: n.kind === 'Case' ? acc : '#b9c7d4',
              op: dIn.o * dim,
              clickable: true,
              attrs: `data-map-jump="${E(n.id)}" role="button" tabindex="0" style="cursor:pointer" aria-label="Read ${E(n.title)}"`,
            });
            yy2 += pitch;
          }
          if (cut < ns.length && max >= 2)
            putLabel({
              key: 'dr:' + d.id + ':more',
              pri: 2.7,
              fast: true,
              x: d.x + 33,
              y: yy2,
              fs: 11 / z,
              text: `+ ${ns.length - cut} more`,
              width: d.w - 67,
              lines: 1,
              fill: '#93a7b7',
              op: dIn.o * dim,
              clickable: true,
              attrs: `data-map-district="${E(d.id)}" role="button" tabindex="0"`,
            });
        } else {
          const sub = Object.entries(M.homes).filter(
              ([nid, c]) => nodesById.has(nid) && c.district === id && c.support,
            ),
            count = sub.length;
          if (count && !full) {
            const fs = 13 / z,
              ss =
                d.supportStart >= d.y && d.supportStart <= d.y + d.h
                  ? d.supportStart
                  : Math.max(
                      d.y + (d.headerH || 91),
                      ...Object.values(M.homes)
                        .filter((c) => c.district === id && !c.support)
                        .map((c) => c.y + c.h),
                    );
            putLabel({
              key: 'dn:' + d.id,
              pri: 3.6,
              x: d.x + 25,
              y: ss + fs * 1.5,
              fs,
              text: `${count} related notes & questions`,
              width: d.w - 50,
              lines: 1,
              fill: '#99adbf',
              op: dIn.o * dim,
            });
            putLabel({
              key: 'dn2:' + d.id,
              pri: 3.7,
              x: d.x + 25,
              y: ss + fs * 3.1,
              fs: 11 / z,
              text: 'Zoom in to read them.',
              width: d.w - 50,
              lines: 1,
              fill: '#6f879e',
              op: dIn.o * dim,
            });
          }
        }
        g.push('</g>');
        parts.push(fadeIn('dg:' + d.id, g.join('')).html);
      }
    }
  }
  // Cards at their homes. Thresholds relax by 15% for cards already on screen, so nothing flickers at the boundary.
  if (t >= 1)
    for (const [id] of Object.entries(M.homes)) {
      const c = homeFor(id),
        n = nodesById.get(id);
      if (!n || !intersects(c, B, 40)) continue;
      const d = districtFor(c.district),
        r = regionFor(c.region),
        isActive = active.has(id),
        chosen = selected?.type === 'node' && selected.id === id,
        force = chosen || (selected?.type === 'edge' && isActive) || (S.connectionOverview && isActive);
      const hy = wasVisible.has(id) ? 0.85 : 1,
        standard = (d?.w || 750) * z >= 310 * hy && c.h * z >= 30 * hy,
        full = (d?.w || 750) * z >= 560 * hy && c.h * z >= 36 * hy;
      if (!inScope.has(c.region) && !isActive) continue;
      if ((!standard || R11.modes.get(c.region) !== 'full') && !force) continue;
      if (force && (c.w * z < 110 || c.h * z < 26)) continue;
      if (c.support && !full && !force && !isActive) continue;
      if (c.support && !full && isActive && !force && c.w * z < 185) continue;
      visible.add(id);
      const col = regionAccent(r),
        dimc = selected && active.size && !isActive ? 0.24 : 1,
        fs = Math.min(c.h / 2.4, Math.min(17, Math.max(12, 6 + c.h * z * 0.16)) / z),
        x = c.x + 17;
      const label = displayName(n),
        lineLimit = c.h < fs * 2.9 ? 1 : 2,
        rows = wrapM(label, c.w - 34, fs, c.core ? 500 : 400, lineLimit);
      const titleY = c.y + c.h / 2 - fs * (rows.length > 1 ? 0.28 : -0.16);
      const cIn = entrance('n:' + id, c.x + c.w / 2, c.y + c.h / 2, now);
      if (chosen) {
        if (pulseId !== id) {
          pulseId = id;
          pulseAt = now;
        }
        const pf = Math.min(1, (now - pulseAt) / 720);
        if (pf < 1 && !reducedMotion) {
          settling = true;
          const gf = 1 + pf * 0.16,
            cx = c.x + c.w / 2,
            cy = c.y + c.h / 2;
          cardParts.push(
            `<rect x="${cx - (c.w / 2) * gf}" y="${cy - (c.h / 2) * gf}" width="${c.w * gf}" height="${c.h * gf}" rx="${9 * gf}" fill="none" stroke="#eed6b4" stroke-width="${2 / z}" stroke-opacity="${(0.85 * (1 - pf)).toFixed(3)}" pointer-events="none"/>`,
          );
        }
      }
      let card = `<g class="node-card" opacity="${(dimc * cIn.o).toFixed(3)}"${cIn.tr} data-map-node="${E(id)}" role="button" tabindex="0" aria-label="${E(n.title)}. ${E(roleLabel(n))}. Click to read; drag to move."><title>${E(n.title)} — ${E(n.summary)}</title><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="7" fill="${chosen ? '#303c45' : isActive ? '#24313d' : c.core ? '#1e2c37' : '#18242f'}" stroke="${chosen ? '#eed6b4' : col}" stroke-width="${(chosen ? 2 : 1) / z}" stroke-opacity="${chosen ? 1 : isActive ? 0.8 : c.core ? 0.4 : 0.25}"/>`;
      if (n.kind === 'Case')
        card += `<path d="M${c.x + 7} ${c.y + 15} V${c.y + c.h - 15}" stroke="${col}" stroke-width="${2 / z}" opacity=".8"/>`;
      card +=
        textLines(
          rows,
          x,
          titleY,
          fs,
          chosen ? '#f7e7cb' : c.core ? '#dce5ec' : '#abbccb',
          c.core ? 500 : 400,
          '',
        ) + '</g>';
      const f = fadeIn('n:' + id, card);
      cardO.set(id, f.o);
      cardParts.push(f.html);
      putLabel({
        key: 'cb:' + id,
        pri: 0.6,
        box: { x: (c.x - B.x) * z, y: (c.y - B.y) * z, w: c.w * z, h: c.h * z },
        html: '',
        nocollide: true,
        sticky: false,
      });
    }
  // Stars: the galaxy at the floor and the entries in flight through the band; once the map is in place only selected or connected entries keep a star.
  R11.starIndex = [];
  const pad = 60 / z,
    selDim = selected && active.size;
  for (const [id] of G.pts) {
    const n = nodesById.get(id);
    if (!n) continue;
    const co = cardO.get(id) || 0;
    if (co >= 0.98) continue;
    const p = nodePos(id, t);
    if (!p || p.x < B.x - pad || p.x > B.x + B.w + pad || p.y < B.y - pad || p.y > B.y + B.h + pad) continue;
    const isCase = n.kind === 'Case',
      isConcept = n.kind === 'Concept' || n.kind === 'Rule',
      isActive = active.has(id),
      chosen = selected?.type === 'node' && selected.id === id;
    if (t >= 1 && !isActive) continue;
    let op = (isCase ? 0.95 : isConcept ? 0.7 : 0.3) * (1 - co);
    if (selDim && !isActive) op *= 0.4;
    if (!isActive) op *= Math.min(1, (1 - t) * 4);
    if (op < 0.02) continue;
    const rad = ((isCase ? 2.1 : isConcept ? 1.5 : 0.9) * (1 + 0.35 * (1 - t)) + (isActive ? 1.6 : 0)) / z,
      col = chosen ? '#f4dfb8' : isActive ? '#eed6b4' : ARM_COLORS[p.c] || '#9fb3c4';
    R11.starIndex.push({ id, x: p.x, y: p.y });
    if (chosen && !reducedMotion)
      starParts.push(
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(rad * 2.2).toFixed(2)}" fill="none" stroke="#eed6b4" stroke-width="${1.2 / z}" class="star-pulse" pointer-events="none"/>`,
      );
    starParts.push(
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${rad.toFixed(2)}" fill="${col}" opacity="${op.toFixed(3)}" class="dkla-star${isCase ? ' is-case' : ''}" data-map-node="${E(id)}" data-star="1"/>`,
    );
  }
  const painted = [],
    pillGroups = new Map();
  for (const e of activeEdges) {
    const a0 = homeFor(e.source),
      b0 = homeFor(e.target);
    if (!a0 || !b0) continue;
    const pa = nodePos(e.source, t),
      pb = nodePos(e.target, t);
    const bw = (w) => w * t + (14 / z) * (1 - t);
    const a = { x: pa.x - bw(a0.w) / 2, y: pa.y - bw(a0.h) / 2, w: bw(a0.w), h: bw(a0.h) },
      b = { x: pb.x - bw(b0.w) / 2, y: pb.y - bw(b0.h) / 2, w: bw(b0.w), h: bw(b0.h) };
    const fullA = (R11.modes.get(a0.region) === 'full' && a0.w * z >= 70) || visible.has(e.source),
      fullB = (R11.modes.get(b0.region) === 'full' && b0.w * z >= 70) || visible.has(e.target);
    if (!fullA) {
      const rr = regionFor(a0.region);
      if (rr) {
        a.x = rr.x;
        a.y = rr.y;
        a.w = rr.w;
        a.h = rr.h;
      }
    }
    if (!fullB) {
      const rr = regionFor(b0.region);
      if (rr) {
        b.x = rr.x;
        b.y = rr.y;
        b.w = rr.w;
        b.h = rr.h;
      }
    }
    if (!fullA && !fullB && a0.region === b0.region) continue;
    const ax = a.x + a.w / 2,
      ay = a.y + a.h / 2,
      bx = b.x + b.w / 2,
      by = b.y + b.h / 2;
    const lineB = { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(ax - bx), h: Math.abs(ay - by) };
    if (!intersects(lineB, B)) continue;
    const dx = bx - ax,
      dy = by - ay,
      len = Math.hypot(dx, dy);
    if (len < 0.001) continue;
    const toBoundary = (r) =>
        Math.min(
          Math.abs(dx) > 0.001 ? r.w / 2 / Math.abs(dx) : Infinity,
          Math.abs(dy) > 0.001 ? r.h / 2 / Math.abs(dy) : Infinity,
        ) *
          len +
        4 / z,
      offset = toBoundary(a),
      offsetb = toBoundary(b);
    const sx = ax + (dx / len) * offset,
      sy = ay + (dy / len) * offset,
      tx = bx - (dx / len) * offsetb,
      ty = by - (dy / len) * offsetb;
    const cc = Math.min(180 / Math.max(0.2, z * 3), Math.max(30, Math.abs(dy) * 0.25)),
      cs = tx >= sx ? cc : -cc,
      path = `M${sx},${sy} C${sx + cs},${sy} ${tx - cs},${ty} ${tx},${ty}`,
      color = e.status === 'Disputed' ? '#d895a3' : e.status === 'Reviewed' ? '#e6d2ab' : '#c3cbcc',
      w = Math.min(3.4, 1.2 + strength(e).width * 0.42) / z;
    let t0 = edgeAppear.get(e.id);
    if (t0 === undefined) {
      t0 = now + painted.length * 70;
      edgeAppear.set(e.id, t0);
    }
    const ep = reducedMotion ? 1 : Math.min(1, Math.max(0, (now - t0) / 480));
    if (ep < 1) settling = true;
    const eu = 1 - Math.pow(1 - ep, 3);
    for (const [end, box, ex, ey, isFull, cx0, cy0] of [
      [e.source, a, sx, sy, fullA, ax, ay],
      [e.target, b, tx, ty, fullB, bx, by],
    ]) {
      if (visible.has(end)) continue;
      const en = nodesById.get(end);
      if (!en) continue;
      if (!isFull) {
        const rid = homeFor(end).region;
        let g = pillGroups.get(rid);
        if (!g) {
          g = { rid, names: [], ids: new Set(), x: ex, y: ey, ox: ex - cx0, oy: ey - cy0, color };
          pillGroups.set(rid, g);
        }
        if (!g.ids.has(end)) {
          g.ids.add(end);
          g.names.push(displayName(en));
        }
        continue;
      }
      if (box.w * z < 70) continue;
      const fs = Math.max(11 / z, Math.min(14 / z, box.h * 0.5)),
        lbl = ellipsize(displayName(en), box.w - 16 / z, fs, 500),
        pw = Math.min(box.w - 4 / z, measure(lbl, fs, 500) + 20 / z),
        ph = Math.min(box.h - 2 / z, fs * 1.9),
        px = box.x + box.w / 2 - pw / 2,
        py = box.y + box.h / 2 - ph / 2;
      putLabel({
        key: 're:' + e.id + ':' + end,
        pri: 1.5,
        box: { x: (px - B.x) * z, y: (py - B.y) * z, w: pw * z, h: ph * z },
        html: `<g class="ribbon-end" data-map-node="${E(end)}" role="button" tabindex="0" aria-label="${E(en.title)}"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="${ph / 2}" fill="#1b2731" stroke="${color}" stroke-opacity=".7" stroke-width="${1 / z}"/>${textLines([lbl], px + 10 / z, py + ph * 0.68, fs, '#dbe3ea', 500, '', null, 0)}</g>`,
        clickable: true,
        sticky: false,
      });
    }
    edgeParts.push(
      `<path d="${taperedRibbon(sx, sy, sx + cs, sy, tx - cs, ty, tx, ty, w * 2.3, w * 0.35, 28, Math.max(0.02, eu))}" fill="${color}" fill-opacity="${e.status === 'Disputed' ? 0.62 : 0.74}" pointer-events="none"/><circle cx="${sx}" cy="${sy}" r="${w * 1.15}" fill="${color}" fill-opacity=".6" pointer-events="none"/><path d="${path}" stroke="transparent" stroke-width="${12 / z}" fill="none" data-map-edge="${E(e.id)}" role="button" tabindex="0" aria-label="${E(e.label)}: ${E(e.explanation)}"><title>${E(e.explanation || e.label)}</title></path>`,
    );
    painted.push(e.id);
  }
  for (const g of pillGroups.values()) {
    const fs = 12 / z,
      n = g.names.length,
      lbl = ellipsize(g.names.slice(0, 2).join(' · ') + (n > 2 ? ` +${n - 2}` : ''), 300 / z, fs, 500),
      pw = measure(lbl, fs, 500) + 20 / z,
      ph = fs * 1.9,
      d = Math.hypot(g.ox, g.oy) || 1,
      ux = g.ox / d,
      uy = g.oy / d,
      off = (Math.abs(ux) * pw) / 2 + (Math.abs(uy) * ph) / 2 + 8 / z,
      px = g.x + ux * off - pw / 2,
      py = g.y + uy * off - ph / 2,
      rr = regionFor(g.rid);
    putLabel({
      key: 'reg:' + g.rid,
      pri: 1.5,
      box: { x: (px - B.x) * z, y: (py - B.y) * z, w: pw * z, h: ph * z },
      html: `<g class="ribbon-end" data-map-region="${E(g.rid)}" role="button" tabindex="0" aria-label="${E(n + ' connected in ' + (rr ? shortRegionTitle(rr) : ''))}"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="${ph / 2}" fill="#1b2731" stroke="${g.color}" stroke-opacity=".7" stroke-width="${1 / z}"/>${textLines([lbl], px + 10 / z, py + ph * 0.68, fs, '#dbe3ea', 500, '', null, 0)}</g>`,
      clickable: true,
      sticky: false,
    });
  }
  svg.innerHTML =
    defs +
    parts.join('') +
    starParts.join('') +
    edgeParts.join('') +
    cardParts.join('') +
    fadeOuts() +
    resolveLabels(V);
  S.paintNodes = [...visible];
  S.paintEdges = painted;
  for (const k of appear.keys()) if (!seenNow.has(k)) appear.delete(k);
  for (const k of edgeAppear.keys()) if (!painted.includes(k)) edgeAppear.delete(k);
  if (settling) schedule();
  const center = mapCenterVisible(),
    nr = nearestRegion(center.x, center.y);
  const zoomOverview = (!nr || nr.w * z < 470) && !selected && t >= 1;
  if (!S.region && S.scope === 'Contracts' && !selected) $('mapWelcome').hidden = !zoomOverview;
  if (t < 1) $('mapWelcome').hidden = true;
  if (!mapTip.hidden) {
    const tid = String(mapTip.dataset.id);
    if (tid.startsWith('region:')) {
      const rr = regionFor(tid.slice(7));
      if (!rr || rr.w * z >= 200) mapTip.hidden = true;
    } else if (!R11.starIndex.some((s) => s.id === tid)) mapTip.hidden = true;
  }
  $('mapHint').textContent =
    S.scope === 'Atlas'
      ? 'Three courses · Scroll in on one, or click a subject'
      : selected?.type === 'node'
        ? 'Drag an entry to save a new map position'
        : anyClose
          ? 'All nearby notes are visible · Click to read'
          : 'Scroll to explore · Drag the map to pan';
}
// Hover names for stars, and a forgiving click target: the nearest star within nine pixels.
// Stepped zoom (revision 14c): the camera stops only at four levels, atlas, course, subject, subtopic, so every view is
// one of the four the renderer is designed for. Wheel, pinch and the +/- buttons move one level toward what is under the pointer;
// clicking a subject or a subtopic goes straight to its level; panning stays free; Alt + wheel still zooms continuously.
function levelTargets(p) {
  const a = safeArea(),
    fit = (b, pad, mx) =>
      Math.min((a.w - pad * 2) / Math.max(1, b.w), (a.h - pad * 2) / Math.max(1, b.h), mx);
  const M = mapData(),
    G = galaxy(),
    inside = (b, q) => q.x >= b.x && q.x <= b.x + b.w && q.y >= b.y && q.y <= b.y + b.h,
    near = (list, q) =>
      list.reduce(
        (best, b) => {
          const d = Math.hypot(b.x + b.w / 2 - q.x, b.y + b.h / 2 - q.y);
          return d < best.d ? { d, b } : best;
        },
        { d: Infinity, b: null },
      ).b;
  const courses = Object.entries(G.blocks).map(([c, b]) => ({ c, ...b }));
  let course = courses.find((b) => inside(b, p)) || near(courses, p);
  let subject =
    M.regions.find((r) => inside(r, p)) ||
    near(
      M.regions.filter((r) => regionCourse(r) === course.c),
      p,
    );
  if (subject && regionCourse(subject) !== course.c && courses.some((b) => b.c === regionCourse(subject)))
    course = courses.find((b) => b.c === regionCourse(subject));
  const districts = (subject?.districtIds || []).map(districtFor).filter(Boolean),
    district = districts.find((d) => inside(d, p)) || near(districts, p);
  const prev = S.scope;
  S.scope = course.c;
  const cb = scopeBox();
  S.scope = prev;
  const zA = fit(G.box, 20, 0.7),
    zC = fit(cb, 20, 0.7),
    zS = subject ? fit(subject, R18.subjectPad(), 0.95) : zC * 3,
    zD = district ? fit(district, 16, 1.05) : zS * 1.5;
  return { course, subject, district, z: [zA, zC, zS, zD] };
}
R11.level = function (p) {
  const t = levelTargets(p || mapCenterVisible());
  let lvl = 0,
    bd = Infinity;
  t.z.forEach((z, i) => {
    const d = Math.abs(Math.log(S.z / z));
    if (d < bd) {
      bd = d;
      lvl = i;
    }
  });
  return { lvl, ...t };
};
R11.step = function (dir, p) {
  if (R11.stepping) return false;
  p = p || mapCenterVisible();
  const t = R11.level(p),
    target = Math.max(0, Math.min(3, t.lvl + dir));
  if (target === t.lvl) return false;
  R11.stepping = true;
  setTimeout(() => {
    R11.stepping = false;
  }, 650);
  if (target === 0) home('Atlas');
  else if (target === 1) home(t.course.c);
  else if (target === 2 && t.subject) goRegion(t.subject.id);
  else if (target === 3 && t.district) goDistrict(t.district.id);
  else if (target === 3 && t.subject) goRegion(t.subject.id);
  else {
    R11.stepping = false;
    return false;
  }
  return true;
};
let wheelAcc = 0,
  wheelAt = 0,
  wheelLock = false;
// One gesture, one level: after a step the wheel must fall silent for 250 ms (inertial trackpad scrolling keeps the lock) before it can step again.
R11.wheel = function (e) {
  const now = Date.now(),
    gap = now - wheelAt;
  wheelAt = now;
  if (wheelLock) {
    if (gap < 250) return;
    wheelLock = false;
    wheelAcc = 0;
  }
  if (gap > 300) wheelAcc = 0;
  if (R11.stepping) {
    wheelLock = true;
    return;
  }
  wheelAcc += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
  if (Math.abs(wheelAcc) < 40) return;
  const dir = wheelAcc < 0 ? 1 : -1;
  wheelAcc = 0;
  wheelLock = true;
  R11.step(dir, screenToWorld(e.clientX, e.clientY));
};
const mapTip = document.createElement('div');
mapTip.id = 'mapTip';
mapTip.hidden = true;
svg.parentElement.appendChild(mapTip);
svg.addEventListener('pointermove', (e) => {
  if (S.pointers.size || e.pointerType === 'touch') {
    mapTip.hidden = true;
    return;
  }
  const rg = e.target.closest?.('[data-map-region]');
  if (rg && !e.target.closest('.node-card,.map-district')) {
    const r = regionFor(rg.dataset.mapRegion);
    if (r && r.w * S.z < 200) {
      const tl = regionTally(r.id);
      mapTip.hidden = false;
      mapTip.dataset.id = 'region:' + r.id;
      mapTip.style.setProperty('--tip', regionAccent(r));
      mapTip.innerHTML = `<strong>${E(shortRegionTitle(r))}</strong><span>${E(r.routeLabel || r.kicker || '')}${tl.total ? ' · ' + tl.cases + ' cases · ' + tl.concepts + ' concepts' : ''}</span>`;
      const w = svg.parentElement.getBoundingClientRect();
      mapTip.style.left = Math.min(w.width - 270, e.clientX - w.left + 14) + 'px';
      mapTip.style.top = e.clientY - w.top + 16 + 'px';
      return;
    }
  }
  const id = e.target.dataset?.star ? e.target.dataset.mapNode : nearestStar(e.clientX, e.clientY, 9);
  const n = id && nodesById.get(id);
  if (!n) {
    mapTip.hidden = true;
    return;
  }
  const h = mapData().homes[n.id],
    d = h && districtFor(h.district),
    r = h && regionFor(h.region);
  mapTip.hidden = false;
  mapTip.dataset.id = n.id;
  mapTip.style.setProperty('--tip', regionAccent(r));
  mapTip.innerHTML = `<strong>${E(n.title)}</strong><span>${E(n.kind)}${d ? ' · ' + E(d.title) : r ? ' · ' + E(shortRegionTitle(r)) : ''}</span>`;
  const w = svg.parentElement.getBoundingClientRect();
  mapTip.style.left = Math.min(w.width - 270, e.clientX - w.left + 14) + 'px';
  mapTip.style.top = e.clientY - w.top + 16 + 'px';
});
svg.addEventListener('pointerleave', () => {
  mapTip.hidden = true;
});
svg.addEventListener(
  'pointerdown',
  () => {
    mapTip.hidden = true;
  },
  { capture: true },
);
svg.addEventListener('click', (e) => {
  if (
    R11.dragMoved ||
    e.target.closest(
      '[data-map-node],[data-map-district],[data-map-region],[data-map-edge],[data-map-jump],[data-study-scope]',
    )
  )
    return;
  const id = nearestStar(e.clientX, e.clientY, 10);
  if (id) goNode(id, false);
});
function briefSourceStrip(n) {
  const ranges = n.textbookImport?.printedRanges || [];
  let s = ranges
    .map(([a, b]) => `<button data-book="${a}">C&amp;M ${a}${a === b ? '' : '–' + b} ↗</button>`)
    .join('');
  if (!s) {
    s = (n.sources || [])
      .filter((a) => a.url)
      .slice(0, 2)
      .map((a) => {
        const u = safeURL(a.url);
        return u?.startsWith('#book=')
          ? `<button data-book="${u.slice(6)}">${E(a.label)} ↗</button>`
          : u
            ? `<a href="${E(u)}" target="_blank" rel="noopener noreferrer">${E(a.label || 'Source')} ↗</a>`
            : '';
      })
      .join('');
  }
  return s ? `<div class="source-strip">${s}</div>` : '';
}
function sourceCaution(n) {
  const role = geoPlacement(n.id).role,
    status = n.status || '',
    parts = [];
  if (role === 'Partial excerpt' || n.id.endsWith('-boundary'))
    parts.push('Only part of the case was assigned.');
  if (role === 'Source gap' || status === 'Assigned source gap')
    parts.push('The assigned source is missing.');
  if (status === 'Starter' || role === 'Earlier overview' || role === 'Earlier case')
    parts.push('Early brief, not yet checked against the casebook.');
  if (/needs review|disputed/i.test(status)) parts.push('This entry is marked ' + status + '.');
  return parts.length ? `<div class="source-caution">${parts.map(E).join('<br>')}</div>` : '';
}
function readerChrome(body, label = 'Reading') {
  return `<div class="reader-top"><span>${E(label)}</span><button id="closeInspector" aria-label="Close reading panel">×</button></div><div class="reader-body">${body}</div>`;
}
function auditDetails(n) {
  const p = geoPlacement(n.id),
    guideInfo = mapData().guides[n.id];
  const extra = Object.fromEntries(
    Object.entries(n).filter(
      ([k]) =>
        ![
          'id',
          'title',
          'shortTitle',
          'kind',
          'courses',
          'summary',
          'notes',
          'sections',
          'tags',
          'status',
          'sources',
        ].includes(k),
    ),
  );
  return `<details class="quiet-details" id="entryAudit"><summary>Sources & record details</summary><h4>Source scope</h4><p>${E(n.textbookImport?.basis || 'Earlier entry.')}</p>${sourceHTML(n.sources)}<p>${E(p.reviewNote || '')}${guideInfo && !guide(n) ? '<br>The placement guide is hidden because this entry has changed since it was written.' : ''}</p><dl class="metadata-grid"><dt>Record ID</dt><dd>${E(n.id)}</dd><dt>Review status</dt><dd>${E(n.status)}</dd><dt>Original title</dt><dd>${E(n.title)}</dd><dt>Original label</dt><dd>${E(n.shortTitle)}</dd><dt>Reading role</dt><dd>${E(p.role)}</dd><dt>Courses</dt><dd>${E(n.courses.join(', '))}</dd><dt>Tags</dt><dd>${E(n.tags.join(', ')) || 'None'}</dd></dl><details id="originalMetadata"><summary>Full provenance and original metadata</summary><pre>${E(JSON.stringify(extra, null, 2))}</pre></details><p><button class="text-button" data-place="${E(n.id)}">Change subject placement</button></p><button class="text-button danger" data-delete-node="${E(n.id)}">Delete entry</button></details>`;
}
function connectionCard(e, id) {
  const otherId = e.source === id ? e.target : e.source,
    other = nodesById.get(otherId);
  if (!other) return '';
  const source = nodesById.get(e.source),
    target = nodesById.get(e.target),
    p = geoPlacement(otherId),
    pins = mapData().connectionPins[id] || [];
  return `<article class="study-connection ${e.status === 'Disputed' ? 'disputed' : ''}" data-connection-record="${E(e.id)}"><button class="connection-destination" data-study-node="${E(otherId)}">${E(displayName(other))}<small>${E(geoDistrict(p.district)?.title || 'Elsewhere in the atlas')}</small></button><button class="connection-explanation" data-study-edge="${E(e.id)}"><span class="direction">${E(displayName(source))} → ${E(displayName(target))} · ${E(e.label)}</span><p>${E(e.explanation || e.label)}</p><span class="connection-review">${e.status === 'Disputed' ? 'Disputed relationship — read the qualification' : e.status === 'Reviewed' ? 'Marked reviewed' : 'Suggested relationship'} · Open explanation and sources</span></button><div class="connection-foot"><button data-pin="${E(otherId)}" data-pin-from="${E(id)}" class="${pins.includes(otherId) ? 'active' : ''}">${pins.includes(otherId) ? 'Prioritized for study' : 'Prioritize for study'}</button></div></article>`;
}
function connectionsSection(n) {
  const all = incident(n.id),
    top = focusEdges(n.id, n.id === 'ucc207' ? 8 : 6),
    used = new Set(top.map((e) => e.id)),
    rest = orderedEdges(n.id).filter((e) => !used.has(e.id));
  return `<div class="related-heading"><h3>Connections</h3>${top.length ? '<button id="showNeighborhood">See on map</button>' : ''}</div><p class="tiny-help">${all.length} recorded relationships. Suggested links retain their original review status.</p>${n.id === 'ucc207' ? '<p class="tiny-help">The local map also follows existing links through conditional acceptance to <button class="text-button" data-study-node="dorton">Dorton</button> and <button class="text-button" data-study-node="citoh">C. Itoh</button>. These are indirect paths.</p>' : ''}<div class="connection-list">${top.map((e) => connectionCard(e, n.id)).join('')}</div>${rest.length ? `<details id="remainingConnections" class="quiet-details" ${S.connectionsExpanded ? 'open' : ''}><summary>All remaining connections (${rest.length})</summary><div class="connection-list" style="margin-top:13px">${rest.map((e) => connectionCard(e, n.id)).join('')}</div></details>` : ''}`;
}
renderInspector = function () {
  if (!S.panelOpen || !selected) {
    $('inspector').innerHTML = '';
    return;
  }
  if (selected.type === 'edge') {
    renderEdge(edgesById.get(selected.id));
    return;
  }
  if (selected.type === 'district') {
    renderDistrictReader(selected.id);
    return;
  }
  const n = nodesById.get(selected.id);
  if (!n) {
    setReader(false);
    return;
  }
  const p = geoPlacement(n.id),
    guideText = guide(n),
    isCase = n.kind === 'Case',
    sections = isCase ? CASE_HEADINGS : Object.keys(n.sections || {});
  const parent = geoDistrict(p.district)?.title || roleLabel(n);
  let body = `<h2>${E(n.title)}</h2>${sourceCaution(n)}<p class="takeaway">${E(n.summary || 'No summary yet.')}</p>${briefSourceStrip(n)}`;
  if (p.primaryId && nodesById.has(p.primaryId))
    body += `<p class="jump-note">A fuller account is available: <button class="text-button" data-study-node="${E(p.primaryId)}">${E(nodesById.get(p.primaryId).title)} →</button></p>`;
  if (sections.length)
    body += `<div class="${isCase ? 'case-box' : 'entry-sections'}">${sections.map((h) => `<h3>${E(h)}</h3><p>${E(n.sections?.[h] || 'No material is recorded in this section.')}</p>`).join('')}</div>`;
  if (n.notes)
    body += `<h3>${isCase ? 'Notes & qualifications' : 'The concept in detail'}</h3><div class="note-text">${E(n.notes)}</div>`;
  body +=
    `<div class="reading-actions"><button data-edit-node="${E(n.id)}">Edit this entry</button><button data-connect-node="${E(n.id)}">Add a connection</button></div>` +
    connectionsSection(n) +
    auditDetails(n);
  $('inspector').innerHTML = readerChrome(body, parent);
  $('inspector').scrollTop = 0;
  wireReader();
};
renderWelcome = function () {
  setReader(false);
};
function renderDistrictReader(id) {
  const d = districtFor(id);
  if (!d) return;
  const ns = geoMembers(id).sort((a, b) => geoRoleOrder(a, d) - geoRoleOrder(b, d)),
    main = ns.filter((n) => geoPlacement(n.id).tier === 'main'),
    sup = ns.filter((n) => geoPlacement(n.id).tier !== 'main');
  const link = (n) =>
    `<button class="study-entry-link" data-study-node="${E(n.id)}"><strong>${E(displayName(n))}</strong><small>${E(roleLabel(n))}</small><p>${E(n.summary)}</p></button>`;
  const lead = nodesById.get(d.lead);
  $('inspector').innerHTML = readerChrome(
    `<h2>${E(d.title)}</h2><p class="takeaway">${E(d.question)}</p>${lead ? `<p>${E(lead.summary)}</p>${briefSourceStrip(lead)}` : ''}<h3>Ideas & cases</h3>${main.map(link).join('') || '<p>Nothing filed here yet.</p>'}${sup.length ? `<details class="quiet-details" id="topicFurther"><summary>Related notes & questions (${sup.length})</summary>${sup.map(link).join('')}</details>` : ''}<p class="context-text">Zoom in on the map to see the related notes.</p>`,
    shortRegionTitle(regionFor(d.region)),
  );
  $('inspector').scrollTop = 0;
  wireReader();
}
renderEdge = function (e) {
  if (!e) {
    setReader(false);
    return;
  }
  const a = nodesById.get(e.source),
    b = nodesById.get(e.target),
    count = strength(e);
  const status =
    e.status === 'Disputed'
      ? 'This relationship is disputed.'
      : e.status === 'Reviewed'
        ? 'Reviewed.'
        : 'Not yet reviewed.';
  $('inspector').innerHTML = readerChrome(
    `<h2>${E(e.label)}</h2><p class="context-text">${E(status)}</p><button class="study-entry-link" data-study-node="${E(e.source)}"><strong>${E(a.title)}</strong><small>From this entry ↓</small></button><button class="study-entry-link" data-study-node="${E(e.target)}"><strong>${E(b.title)}</strong><small>To this entry</small></button><p class="takeaway">${E(e.explanation || 'No explanation recorded.')}</p><div class="reading-actions"><button id="traceEdge">See both on map</button><button data-edit-edge="${E(e.id)}">Edit connection</button><button data-support-edge="${E(e.id)}">Add supporting note</button></div><h3>Sources</h3>${e.sources.length ? sourceHTML(e.sources) : '<p class="context-text">No separate source for this connection.</p>'}${e.supports.length ? `<h3>Supporting notes</h3>${e.supports.map((s) => `<div class="support-card"><p>${E(s.text)}</p><small>${E(s.source || 'No source recorded')}</small><div class="reading-actions"><button data-edit-support="${E(s.id)}" data-support-edge="${E(e.id)}">Edit</button><button data-remove-support="${E(s.id)}" data-edge-id="${E(e.id)}">Remove</button></div></div>`).join('')}` : ''}<details class="quiet-details" id="edgeAudit"><summary>Relationship details</summary><dl class="metadata-grid"><dt>Classification</dt><dd>${E(e.kind)}</dd><dt>Review status</dt><dd>${E(e.status)}</dd><dt>Record ID</dt><dd>${E(e.id)}</dd></dl><p>Line width reflects ${count.relations} distinct labeled relationships between these entries and ${count.supports} supporting notes on this relationship. This is recorded connectivity, not legal authority or independent proof.</p><button class="text-button" data-review-edge="${E(e.id)}">${e.status === 'Reviewed' ? 'Mark as proposed' : 'Mark as reviewed'}</button><details><summary>Original record</summary><pre>${E(JSON.stringify(e, null, 2))}</pre></details><p><button class="text-button danger" data-delete-edge="${E(e.id)}">Delete this connection</button></p></details>`,
    'Connection',
  );
  $('inspector').scrollTop = 0;
  wireReader();
};
function wireReader() {
  $('closeInspector').onclick = () => {
    remember();
    selected = null;
    setReader(false);
    renderHeading();
    schedule();
    deferPersist();
  };
  if ($('showNeighborhood')) $('showNeighborhood').onclick = () => seeNeighborhood();
  if ($('traceEdge'))
    $('traceEdge').onclick = () => {
      remember();
      const e = edgesById.get(selected.id);
      fitBox(bounds([homeFor(e.source), homeFor(e.target)]), true, 70, 1.15);
    };
  $('remainingConnections')?.addEventListener('toggle', (e) => {
    S.connectionsExpanded = e.target.open;
    schedule();
    deferPersist();
  });
  $('inspector')
    .querySelectorAll('details')
    .forEach((el) => el.addEventListener('toggle', deferPersist));
}
function seeNeighborhood() {
  if (selected?.type !== 'node') return;
  remember();
  S.connectionOverview = true;
  const es = shownEdges(),
    ids = uniq([selected.id, ...es.flatMap((e) => [e.source, e.target])]);
  const b = bounds(ids.map(homeFor));
  fitBox({ x: b.x - 25, y: b.y - 95, w: b.w + 50, h: b.h + 130 }, true, 35, 1.2);
  if (!es.length) toast('Cross-subject connections remain in the reading panel.');
}
// Navigation never resets the search or rewrites record positions.
selectNode = function (id, center = false) {
  goNode(id, center);
};
selectEdge = function (id) {
  goEdge(id, false);
};
focusNode = function (id) {
  goNode(id, true);
};
openEntry = function (id) {
  if ($('bookDialog').open) closeBookReader();
  goNode(id, true);
};
resetView = function () {
  home('Contracts');
};
chooseAssignment = function (v) {
  closeModal();
  classDialog(v);
};
fit = function () {
  remember();
  const b = S.district
    ? bounds(geoMembers(S.district).map((n) => homeFor(n.id)))
    : S.region
      ? regionFor(S.region)
      : scopeBox();
  fitBox(b, true, 35, 1.15);
};
zoom = function (factor) {
  R11.step(factor > 1 ? 1 : -1, null);
};
applyView = function () {
  schedule();
};
renderGraph = function () {
  ensureMap();
  rebuildIndex();
  if (
    (selected?.type === 'node' && !nodesById.has(selected.id)) ||
    (selected?.type === 'edge' && !edgesById.has(selected.id))
  )
    selected = null;
  renderInspector();
  renderHeading();
  schedule();
  deferPersist();
};
const oldWarning = warning;
warning = function (msg) {
  $('storageWarning').hidden = false;
  $('storageWarning').innerHTML =
    '<span>' + E(msg.replace(/Files → /g, '')) + '</span><button id="dismissStorage">Dismiss</button>';
  $('dismissStorage').onclick = () => ($('storageWarning').hidden = true);
};
const originalSaveCache = saveCache;
saveCache = function () {
  if (cacheAvailable) {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(data));
    } catch (err) {
      cacheAvailable = false;
      warning('Browser saving is unavailable. Use Save to keep a portable copy of your work.');
    }
  }
  $('saveStatus').textContent = cacheAvailable
    ? 'Saved locally · keep an exported backup'
    : 'Session only · use Save to keep edits';
  $('undoBtn').disabled = !undoStack.length;
};
function searchEntries() {
  const q = $('search').value.trim();
  query = q;
  if (!q) {
    closeSearch();
    return;
  }
  const norm = (s) =>
      String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[§.,’']/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    nq = norm(q);
  const tokens = nq.split(' ');
  const scored = [];
  for (const r of mapData().regions) {
    const t = norm(r.title + ' ' + shortRegionTitle(r));
    if (tokens.every((w) => t.includes(w)))
      scored.push({ score: 95, type: 'region', id: r.id, title: shortRegionTitle(r), sub: 'Subject' });
  }
  for (const d of Object.values(mapData().districts)) {
    const t = norm(d.title + ' ' + d.question);
    if (tokens.every((w) => t.includes(w)))
      scored.push({
        score: 80,
        type: 'district',
        id: d.id,
        title: d.title,
        sub: shortRegionTitle(regionFor(d.region)),
      });
  }
  for (const n of data.nodes) {
    const title = norm(n.title + ' ' + n.shortTitle + ' ' + displayName(n)),
      body = norm([n.summary, n.notes, ...Object.values(n.sections || {}), ...n.tags].join(' '));
    if (tokens.every((w) => (title + ' ' + body).includes(w))) {
      const score =
        (norm(n.shortTitle) === nq || norm(n.title) === nq
          ? 200
          : title.includes(nq)
            ? 120
            : tokens.every((w) => title.includes(w))
              ? 105
              : 20) + (geoPlacement(n.id).tier === 'main' ? 10 : 0);
      scored.push({
        score,
        type: 'node',
        id: n.id,
        title: n.title,
        sub: `${n.courses.join(', ')} · ${geoDistrict(geoPlacement(n.id).district)?.title || roleLabel(n)}`,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  const results = scored.slice(0, 45);
  $('searchResults').innerHTML =
    `<div class="search-label">${scored.length} results across your atlas</div>` +
    results
      .map(
        (r) =>
          `<button data-search-type="${r.type}" data-search-id="${E(r.id)}"><strong>${E(r.title)}</strong><small>${E(r.sub)}</small></button>`,
      )
      .join('') +
    (!results.length
      ? '<p class="search-empty">No matches. Try a case name or a shorter phrase.</p>'
      : scored.length > 45
        ? '<p class="search-empty">Showing the closest 45 matches. Refine the phrase to narrow the result.</p>'
        : '');
  S.searchOpen = true;
  $('searchResults').hidden = false;
  $('search').setAttribute('aria-expanded', 'true');
}
$('search').oninput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(searchEntries, 75);
};
$('search').onfocus = () => {
  if ($('search').value) searchEntries();
};
$('search').onkeydown = (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    $('searchResults').querySelector('button')?.focus();
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    $('searchResults').querySelector('button')?.click();
  }
  if (e.key === 'Escape') closeSearch();
};
$('searchResults').onkeydown = (e) => {
  const a = [...$('searchResults').querySelectorAll('button')],
    i = a.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    a[(i + 1) % a.length]?.focus();
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (i === 0) $('search').focus();
    else a[i - 1]?.focus();
  }
};
function moreMenu() {
  menuOpen = !menuOpen;
  $('moreBtn').setAttribute('aria-expanded', menuOpen);
  $('moreMenu').hidden = !menuOpen;
  if (!menuOpen) return;
  $('moreMenu').innerHTML =
    `<small>Your notebook</small><button role="menuitem" data-action="courses">Choose a course</button><button role="menuitem" data-action="outline">Browse subjects</button><button role="menuitem" data-action="class">Reading assignments</button><button role="menuitem" data-action="book">Open textbook</button><hr><small>Add & organize</small><button role="menuitem" data-action="add">Add an entry</button><button role="menuitem" data-action="connect">Add a connection</button><button role="menuitem" data-action="path">Find a connection path</button><button role="menuitem" data-action="undo" ${undoStack.length ? '' : 'disabled'}>Undo last edit</button><hr><button role="menuitem" data-action="save">Save & import</button><button role="menuitem" data-action="scope">Sources and coverage</button><button role="menuitem" data-action="help">How to use this map</button>`;
}
function dismissMenu() {
  menuOpen = false;
  $('moreMenu').hidden = true;
  $('moreBtn').setAttribute('aria-expanded', 'false');
}
function coursesDialog() {
  modal(
    'Your atlas',
    `<div class="course-options"><button data-study-scope="Contracts"><strong>Contracts</strong><small>All 26 syllabus assignments · casebook and course supplement</small></button><button data-study-scope="Civil Procedure"><strong>Civil Procedure</strong><small>Earlier starter material · not re-audited in the Contracts import</small></button><button data-study-scope="Study notes"><strong>Study notes & new entries</strong><small>Cross-course comparisons, reading indexes, source gaps, and new material</small></button><button data-study-scope="Atlas"><strong>Whole atlas</strong><small>All subjects at their saved locations</small></button></div>`,
  );
}
function outlineDialog() {
  modal(
    'Browse subjects',
    `<div class="modal-copy">${scopeRegions(S.scope === 'Atlas' ? 'Atlas' : S.scope)
      .map(
        (r) =>
          `<details><summary>${E(shortRegionTitle(r))}</summary><p>${E(r.description)}</p>${r.districtIds.map((id) => `<button class="study-entry-link" data-study-district="${E(id)}">${E(districtFor(id).title)}</button>`).join('')}</details>`,
      )
      .join('')}</div>`,
  );
}
function classDialog(v = '9') {
  const c = Number(v) || 9,
    ns = data.nodes.filter((n) => classNumbers(n).includes(c)),
    main = ns.filter((n) => geoPlacement(n.id).tier === 'main'),
    sup = ns.filter((n) => geoPlacement(n.id).tier !== 'main'),
    ranges = (data.corpus || base.corpus).assignedRanges[c] || [];
  modal(
    'Reading assignment ' + c,
    `<label class="form-field"><span>Assignment</span><select id="readingClass">${Array.from({ length: 9 }, (_, i) => `<option value="${i + 1}" ${i + 1 === c ? 'selected' : ''}>Class ${i + 1}</option>`).join('')}</select></label><p class="modal-copy">The reading list for this class.</p><div class="source-strip">${ranges.map(([a, b]) => `<button data-book="${a}">C&amp;M ${a}–${b}</button>`).join('')}</div>${main.map((n) => `<button class="study-entry-link" data-study-node="${E(n.id)}">${E(n.title)}</button>`).join('')}<details class="quiet-details"><summary>Related notes and source records (${sup.length})</summary>${sup.map((n) => `<button class="study-entry-link" data-study-node="${E(n.id)}">${E(n.title)}</button>`).join('')}</details>`,
  );
  $('readingClass').onchange = (e) => classDialog(e.target.value);
}
function saveDialog() {
  modal(
    'Keep your atlas',
    `<div class="modal-copy"><p>Save a portable copy to keep this application, your notes, saved map positions, and all embedded textbook pages together. The JSON is the smaller master file to bring back for later updates.</p></div><div class="save-options"><button id="portableSave" class="primary">Save complete atlas <small>Portable HTML · works offline · includes all source-page images</small></button><button id="jsonSave">Export master JSON <small>Notes, relationships, sources, and map homes · no embedded page images</small></button></div><details class="quiet-details"><summary>Import, Obsidian & recovery</summary><div class="save-options"><button id="importSave">Import a graph or revision-checked update</button><button id="markdownSave">Export Obsidian notes</button><button id="rawRecovery">Download raw browser recovery copy</button></div><p class="modal-copy">Before importing a replacement, export your current master. Merge keeps existing IDs; Replace uses the imported records. Patches require the matching graph ID and revision. Browser edits do not automatically sync to ChatGPT.</p></details><p class="tiny-help">${cacheAvailable ? 'A local browser copy is available; exported files remain your backup.' : 'Browser storage is unavailable here. Save before closing this page.'}</p>`,
  );
  $('portableSave').onclick = exportHTML;
  $('jsonSave').onclick = exportJSON;
  $('importSave').onclick = () => {
    closeModal();
    $('importFile').click();
  };
  $('markdownSave').onclick = exportMarkdown;
  $('rawRecovery').onclick = () => {
    try {
      const raw = localStorage.getItem(storageKey()) || JSON.stringify(data);
      download('Legal-Atlas-recovery.json', raw, 'application/json');
    } catch {
      download('Legal-Atlas-session-recovery.json', JSON.stringify(data), 'application/json');
    }
  };
}
filesMenu = saveDialog;
const oldExportJSON = exportJSON;
exportJSON = function () {
  storeView();
  download('legal-atlas-r' + data.revision + '.json', JSON.stringify(data, null, 2), 'application/json');
  exported = true;
  saveCache();
  toast('Master JSON saved, including your map positions.');
};
exportHTML = function () {
  storeView();
  const root = document.documentElement.cloneNode(true);
  root.querySelector('#seedData').textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  for (const id of [
    'geoCanvas',
    'inspector',
    'searchResults',
    'moreMenu',
    'modalBody',
    'bookSearchResults',
    'bookRelated',
    'rawPageText',
    'civilSourceDialog',
    'relationshipLens',
    'fileDialog',
    'mapTip',
  ]) {
    const el = root.querySelector('#' + id);
    if (el) el.innerHTML = '';
  }
  for (const id of ['modal', 'bookDialog', 'civilSourceDialog'])
    root.querySelector('#' + id)?.removeAttribute('open');
  root.querySelector('#bookDialog').classList.remove('page-tools');
  root.querySelector('#sourceImage').removeAttribute('src');
  root.querySelector('#toast').style.display = 'none';
  root.querySelector('#storageWarning').hidden = true;
  root.querySelector('#searchResults').hidden = true;
  root.querySelector('#moreMenu').hidden = true;
  download('Legal-Atlas-r' + data.revision + '.html', '<!doctype html>\n' + root.outerHTML, 'text/html');
  exported = true;
  saveCache();
  toast('Complete atlas saved with all embedded source pages and your saved map positions.');
};
exportMarkdown = function () {
  storeView();
  const files = geoMarkdownFiles();
  files.push(['Legal Atlas/Maps/Saved-map-layout.json', JSON.stringify(mapData(), null, 2)]);
  download('Legal-Atlas-Obsidian-r' + data.revision + '.zip', zipBlob(files));
  toast('Obsidian notes saved with all relationships and the master JSON.');
};
pathForm = function () {
  modal(
    'Find a connection path',
    formWrap(
      nodeSelect('Start from', 'from', selected?.type === 'node' ? selected.id : '') +
        nodeSelect('Explore toward', 'to', '') +
        '<p class="modal-copy">This follows recorded relationships in either direction. A graph path is an invitation to compare the explanations, not a claim that the endpoint doctrines are legally equivalent.</p>',
      'Find path',
    ),
  );
  $('cancelForm').onclick = closeModal;
  $('editForm').onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target),
      start = f.get('from'),
      end = f.get('to');
    if (!start || !end) {
      $('formError').textContent = 'Choose both entries.';
      return;
    }
    const queue = [start],
      prev = new Map([[start, null]]);
    while (queue.length && !prev.has(end)) {
      const a = queue.shift();
      for (const edge of incident(a)) {
        if (navigationEdge(edge)) continue;
        const b = edge.source === a ? edge.target : edge.source;
        if (!prev.has(b)) {
          prev.set(b, { id: a, edge: edge.id });
          queue.push(b);
        }
      }
    }
    if (!prev.has(end)) {
      modal(
        'No recorded path',
        '<p class="modal-copy">There is no recorded non-administrative path between these entries. No new connection has been inferred.</p>',
      );
      return;
    }
    const steps = [];
    let k = end;
    while (k !== start) {
      const p = prev.get(k);
      steps.unshift({ from: p.id, to: k, edge: p.edge });
      k = p.id;
    }
    modal(
      'A path through the atlas',
      `<p class="modal-copy">Read each relationship in its original direction and context.</p><button class="study-entry-link" data-study-node="${E(start)}">${E(nodesById.get(start).title)}</button>${steps.map((s) => `<div class="path-result"><button class="text-button" data-study-edge="${E(s.edge)}">${E(edgesById.get(s.edge).label)}</button><p class="modal-copy">${E(edgesById.get(s.edge).explanation)}</p><button class="study-entry-link" data-study-node="${E(s.to)}">${E(nodesById.get(s.to).title)}</button></div>`).join('')}`,
    );
  };
};
help = function () {
  modal(
    'Explore, read, and keep your place',
    `<div class="modal-copy"><h3>Search and print</h3><p>The search bar forgives typos and word order ("promisory estopel" finds Promissory estoppel) and ranks titles first; press <code>/</code> or Ctrl+K (Cmd+K on a Mac) to jump to it. Reporter citations in any brief are links: to the opinion on file, or to Justia and CourtListener. Print (Ctrl+P) while an entry is open to get a clean one-page handout of that entry; "Save as PDF" keeps it.</p><h3>Original files</h3><p>The atlas reads its sources from two folders beside <code>DKLA-r8.html</code>: <code>added-sources/</code> (opinions, the Civil Procedure supplement, the Contracts Selections) and <code>DKLA-sources/</code> (the scanned casebook and packet pages). Download the repository as a ZIP and open the HTML from inside it. When a folder is missing, every source still opens as text inside the atlas, with a link to the original on GitHub. The scanned pages were never part of the download: open <code>restore-page-images.html</code> beside the atlas, point it at your original <code>DKLA-r8-rebuilt.html</code>, and it copies all 1,643 pages into <code>DKLA-sources/</code>.</p><h3>One map</h3><p>Click a subject to approach it. Its subtopics emerge first, then the concepts and cases. Zoom closer to see related authorities, book discussions, and questions at their own locations. Search reaches every entry at every zoom level.</p><h3>Follow an idea</h3><p>Select an entry to read it and highlight a small set of its existing connections. “See on map” frames those connections without moving their endpoints. Each connection keeps its explanation, direction, sources, and review status. “All remaining connections” reveals the rest. You can prioritize a connection for your own study without marking it legally reviewed.</p><h3>Stable homes</h3><p>Ordinary navigation changes only the camera and selection. Drag an entry to give it a new saved home. A drop overlapping another card or a heading is rejected, leaving both in place. The move changes map metadata, not the entry’s legal content or subject classification. Use “Change subject placement” in the entry details to change its category. New entries are placed inside their selected subject; earlier entries remain fixed.</p><h3>Sources and qualifications</h3><p>The C&M buttons open the original assigned-page image. Close the page to return to the same entry and reading position. Page tools contain text search, assignment sets, zoom, connected entries, and the imperfect extracted text. Missing sources and partial excerpts remain visible in the study reader. No source accuracy or current-law audit was added in this revision.</p><h3>Navigation and saving</h3><p>Use Back or Alt+Left to return to the preceding map and reading position. Click a breadcrumb to return to a larger subject. Use / to search, + and − to zoom, and 0 to frame the current area. Escape closes a page, dialog, or search. Save preserves the complete application; Export master JSON preserves the smaller structured notebook for future updates. Browser edits do not automatically reach ChatGPT.</p><h3>Reading structure</h3><p>Prominence reflects the existing syllabus/casebook organization, not an exam prediction. The Martin outline supplied a structural example only. This version retains the 276 source entries, 688 relationship records, and 231-page assigned archive from the supplied r4 checkpoint; later user edits can change those counts.</p></div>`,
  );
};
const originalNodeForm = nodeForm;
nodeForm = function (id = null) {
  originalNodeForm(id);
  if (!id)
    $('editForm').elements.courses.value =
      S.scope === 'Contracts'
        ? 'Contracts'
        : S.scope === 'Civil Procedure'
          ? 'Civil Procedure'
          : 'Cross-course';
};
function setPin(from, to) {
  const wasOpen = S.connectionsExpanded,
    sc = $('inspector').scrollTop;
  transact('Changed study priority of a connection', () => {
    const a = mapData().connectionPins[from] || [];
    mapData().connectionPins[from] = a.includes(to) ? a.filter((x) => x !== to) : [to, ...a];
  });
  S.connectionsExpanded = wasOpen;
  renderInspector();
  $('inspector').scrollTop = sc;
  toast('Study display priority saved. The relationship and review status are unchanged.');
}
function placeForm(id) {
  const n = nodesById.get(id),
    p = geoPlacement(id);
  modal(
    'Place this entry',
    formWrap(
      `<p class="modal-copy">This changes the topic reference, not the entry’s legal content. The saved map home stays where you placed it until you drag it.</p><label class="form-field"><span>Subject and subtopic</span><select name="district">${mapData()
        .regions.map(
          (r) =>
            `<optgroup label="${E(shortRegionTitle(r))}">${r.districtIds.map((id) => `<option value="${E(id)}" ${p.district === id ? 'selected' : ''}>${E(districtFor(id).title)}</option>`).join('')}</optgroup>`,
        )
        .join('')}</select></label>`,
    ),
  );
  wireForm((f) => {
    const d = districtFor(f.get('district'));
    transact('Changed subject placement: ' + n.title, () => {
      data.geography.placements[id] = { ...p, region: d.region, district: d.id };
      mapData().homes[id].region = d.region;
      mapData().homes[id].district = d.id;
    });
  });
}
function collisionAt(id, c) {
  for (const [other, h] of Object.entries(mapData().homes))
    if (other !== id && nodesById.has(other) && overlap(c, h, 9)) return true;
  for (const r of mapData().regions) if (overlap(c, { x: r.x, y: r.y, w: r.w, h: 155 }, 5)) return true;
  for (const d of Object.values(mapData().districts))
    if (overlap(c, { x: d.x, y: d.y, w: d.w, h: d.headerH || 91 }, 5)) return true;
  return false;
}
function commitMove(id, newX, newY) {
  const c = homeFor(id);
  if (!c || !Number.isFinite(newX) || !Number.isFinite(newY)) return false;
  const target = { ...c, x: newX, y: newY };
  if (collisionAt(id, target)) {
    toast('That position overlaps another entry or heading. The entry kept its previous home.');
    schedule();
    return false;
  }
  transact('Moved map home: ' + nodesById.get(id).title, () => {
    mapData().homes[id] = { ...target, custom: true };
  });
  toast('New map position saved.');
  return true;
}
// Keep source reading in the same return path; the map and inspector stay mounted underneath.
const originalOpenBook = openBook;
openBook = function (p = bookPage) {
  if (!BOOK[p]) {
    toast('That printed page is outside the assigned archive.');
    return;
  }
  if (!$('bookDialog').open) {
    S.bookReturn = {
      scroll: $('inspector').scrollTop,
      active: document.activeElement,
      modalWasOpen: $('modal').open,
    };
    $('bookDialog').classList.remove('page-tools');
    $('pageToolsBtn').setAttribute('aria-expanded', 'false');
  }
  originalOpenBook(p);
  $('closeBook').textContent = S.bookReturn?.modalWasOpen
    ? '← Back'
    : selected?.type === 'node'
      ? '← Back to ' + (nodesById.get(selected.id)?.shortTitle || 'entry')
      : '← Back to map';
};
function closeBookReader() {
  if (!$('bookDialog').open) return;
  $('bookDialog').close();
  if (S.bookReturn) {
    $('inspector').scrollTop = S.bookReturn.scroll;
    try {
      S.bookReturn.active?.focus({ preventScroll: true });
    } catch {}
  }
  S.bookReturn = null;
}
$('closeBook').onclick = closeBookReader;
$('pageToolsBtn').onclick = () => {
  const open = $('bookDialog').classList.toggle('page-tools');
  $('pageToolsBtn').setAttribute('aria-expanded', open);
};
$('bookDialog').addEventListener('cancel', (e) => {
  e.preventDefault();
  closeBookReader();
});
$('bookDialog').addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  if (e.key === 'ArrowRight') {
    $('bookNext').click();
  }
  if (e.key === 'ArrowLeft' && !e.altKey) {
    $('bookPrev').click();
  }
});
// Central delegation is deliberately small: navigate, read, edit, save.
document.addEventListener('click', (e) => {
  const b = e.target.closest('button,a');
  if (!b) return;
  if (b.dataset.searchType) {
    if ($('modal').open) closeModal();
    if (b.dataset.searchType === 'node') goNode(b.dataset.searchId, true);
    else if (b.dataset.searchType === 'region') goRegion(b.dataset.searchId);
    else goDistrict(b.dataset.searchId);
    return;
  }
  if (b.dataset.studyNode) {
    if ($('modal').open) closeModal();
    goNode(b.dataset.studyNode, true);
    return;
  }
  if (b.dataset.studyEdge) {
    if ($('modal').open) closeModal();
    goEdge(b.dataset.studyEdge, false);
    return;
  }
  if (b.dataset.studyRegion) {
    if ($('modal').open) closeModal();
    goRegion(b.dataset.studyRegion);
    return;
  }
  if (b.dataset.studyDistrict) {
    if ($('modal').open) closeModal();
    goDistrict(b.dataset.studyDistrict);
    return;
  }
  if (b.dataset.studyScope) {
    if ($('modal').open) closeModal();
    home(b.dataset.studyScope);
    return;
  }
  if (b.dataset.editNode) {
    nodeForm(b.dataset.editNode);
    return;
  }
  if (b.dataset.connectNode) {
    edgeForm(null, b.dataset.connectNode);
    return;
  }
  if (b.dataset.editEdge) {
    edgeForm(b.dataset.editEdge);
    return;
  }
  if (b.dataset.supportEdge) {
    supportForm(b.dataset.supportEdge, b.dataset.editSupport || null);
    return;
  }
  if (b.dataset.pin) {
    setPin(b.dataset.pinFrom, b.dataset.pin);
    return;
  }
  if (b.dataset.place) {
    placeForm(b.dataset.place);
    return;
  }
  if (b.dataset.reviewEdge) {
    const id = b.dataset.reviewEdge;
    transact('Changed relationship review status', () => {
      const e = edgeById(id);
      e.status = e.status === 'Reviewed' ? 'Proposed' : 'Reviewed';
      e.updatedAt = now();
    });
    return;
  }
  if (b.dataset.deleteNode) {
    const id = b.dataset.deleteNode;
    confirmDialog(
      'Delete entry?',
      'This deletes the entry and its relationships. Undo is available during this session.',
      () =>
        transact('Deleted entry', () => {
          data.nodes = data.nodes.filter((n) => n.id !== id);
          data.edges = data.edges.filter((e) => e.source !== id && e.target !== id);
        }),
    );
    return;
  }
  if (b.dataset.deleteEdge) {
    const id = b.dataset.deleteEdge;
    confirmDialog(
      'Delete connection?',
      'This deletes the relationship and its supporting notes. Undo is available during this session.',
      () =>
        transact('Deleted connection', () => {
          data.edges = data.edges.filter((e) => e.id !== id);
        }),
    );
    return;
  }
  if (b.dataset.removeSupport) {
    const id = b.dataset.edgeId,
      s = b.dataset.removeSupport;
    confirmDialog('Remove supporting note?', 'The connection will remain. Undo is available.', () =>
      transact('Removed supporting note', () => {
        edgeById(id).supports = edgeById(id).supports.filter((x) => x.id !== s);
      }),
    );
    return;
  }
  if (b.dataset.action) {
    const a = b.dataset.action;
    dismissMenu();
    if (a === 'courses') coursesDialog();
    else if (a === 'outline') outlineDialog();
    else if (a === 'class') classDialog();
    else if (a === 'book') openBook();
    else if (a === 'add') nodeForm();
    else if (a === 'connect') edgeForm();
    else if (a === 'path') pathForm();
    else if (a === 'undo') $('undoBtn').click();
    else if (a === 'save') saveDialog();
    else if (a === 'scope') coverageDialog();
    else if (a === 'help') help();
    return;
  }
});
document.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('.study-search')) closeSearch();
  if (!e.target.closest('#moreBtn,#moreMenu')) dismissMenu();
});
$('atlasHome').onclick = coursesDialog;
$('courseHome').onclick = () => home(S.scope);
$('saveBtn').onclick = saveDialog;
$('moreBtn').onclick = moreMenu;
if ($('todayBtn')) $('todayBtn').onclick = () => goRegion('terms-region');
$('studyBack').onclick = back;
$('studyZoomIn').onclick = () => zoom(1.35);
$('studyZoomOut').onclick = () => zoom(1 / 1.35);
$('studyFit').onclick = fit;
$('inspector').addEventListener('scroll', deferPersist, { passive: true });
function activateMap(t) {
  if (t.dataset.mapJump) goNode(t.dataset.mapJump, true);
  else if (t.dataset.mapNode) goNode(t.dataset.mapNode, false);
  else if (t.dataset.mapDistrict) goDistrict(t.dataset.mapDistrict);
  else if (t.dataset.mapRegion) goRegion(t.dataset.mapRegion);
  else if (t.dataset.mapEdge) goEdge(t.dataset.mapEdge, false);
}
svg.addEventListener('keydown', (e) => {
  const t = e.target.closest('[role=button]');
  if (t && ['Enter', ' '].includes(e.key)) {
    e.preventDefault();
    activateMap(t);
  }
});
let lastWheel = 0,
  floorHits = 0;
svg.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    if (!e.altKey) {
      R11.wheel(e);
      return;
    }
    if (Date.now() - lastWheel > 500) remember();
    lastWheel = Date.now();
    cancelAnimationFrame(S.animation);
    R11.anim = false;
    const p = screenToWorld(e.clientX, e.clientY),
      v = rect(),
      z = Math.max(
        zoomFloor(),
        Math.min(1.25, S.z * Math.exp(-Math.max(-120, Math.min(120, e.deltaY)) * 0.003)),
      );
    S.zoomAnchor = p;
    S.x = p.x - (e.clientX - v.x - v.w / 2) / z;
    S.y = p.y - (e.clientY - v.y - v.h / 2) / z;
    S.z = z;
    schedule();
    deferPersist();
  },
  { passive: false },
);
svg.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  cancelAnimationFrame(S.animation);
  R11.anim = false;
  const t = e.target.closest(
    '[data-map-node],[data-map-district],[data-map-region],[data-map-edge],[data-map-jump]',
  );
  S.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  S.drag = {
    x: e.clientX,
    y: e.clientY,
    cx: S.x,
    cy: S.y,
    z: S.z,
    target: t,
    hasMoved: false,
    node: t?.dataset.mapNode || null,
    home: t?.dataset.mapNode ? clone(homeFor(t.dataset.mapNode)) : null,
  };
  if (S.pointers.size === 2) {
    const [a, b] = [...S.pointers.values()];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    S.pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), z: S.z, world: screenToWorld(mid.x, mid.y) };
  }
  svg.setPointerCapture(e.pointerId);
});
svg.addEventListener('pointermove', (e) => {
  if (!S.pointers.has(e.pointerId)) return;
  S.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (S.pointers.size >= 2 && S.pinch) {
    const [a, b] = [...S.pointers.values()],
      v = rect(),
      dist = Math.hypot(a.x - b.x, a.y - b.y),
      ratio = dist / S.pinch.distance;
    if (ratio > 1.3 || ratio < 1 / 1.3) {
      S.pinch.distance = dist;
      S.drag.hasMoved = true;
      R11.step(ratio > 1 ? 1 : -1, S.pinch.world);
      return;
    }
    S.x = S.pinch.world.x - ((a.x + b.x) / 2 - v.x - v.w / 2) / S.z;
    S.y = S.pinch.world.y - ((a.y + b.y) / 2 - v.y - v.h / 2) / S.z;
    S.drag.hasMoved = true;
    schedule();
    return;
  }
  const d = S.drag;
  if (!d) return;
  const dx = e.clientX - d.x,
    dy = e.clientY - d.y;
  if (Math.hypot(dx, dy) > 5) {
    if (!d.hasMoved) remember();
    d.hasMoved = true;
  }
  if (!d.hasMoved) return;
  svg.classList.add('panning');
  if (d.node) {
    d.preview = { ...d.home, x: d.home.x + dx / d.z, y: d.home.y + dy / d.z };
  } else {
    S.x = d.cx - dx / d.z;
    S.y = d.cy - dy / d.z;
  }
  schedule();
});
function pointerEnd(e) {
  const d = S.drag,
    t = d?.target;
  R11.dragMoved = !!d?.hasMoved;
  if (S.pointers.size === 1 && d) {
    if (d.hasMoved && d.node && e.type === 'pointerup') {
      const moved = d.preview || d.home;
      S.drag = null;
      commitMove(d.node, moved.x, moved.y);
    } else if (!d.hasMoved && e.type === 'pointerup' && t) {
      activateMap(t);
    } else if (d.node && e.type === 'pointercancel') {
      S.drag = null;
      schedule();
    }
  }
  S.pointers.delete(e.pointerId);
  if (S.pointers.size < 2) S.pinch = null;
  if (!S.pointers.size) {
    S.drag = null;
    svg.classList.remove('panning');
    deferPersist();
  }
}
svg.addEventListener('pointerup', pointerEnd);
svg.addEventListener('pointercancel', pointerEnd);
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault();
    back();
    return;
  }
  if (e.key === 'Escape') {
    dismissMenu();
    closeSearch();
    return;
  }
  if (
    $('modal').open ||
    $('bookDialog').open ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
  )
    return;
  if (e.key === '+' || e.key === '=') {
    e.preventDefault();
    zoom(1.3);
  }
  if (e.key === '-') {
    e.preventDefault();
    zoom(1 / 1.3);
  }
  if (e.key === '0') {
    e.preventDefault();
    fit();
  }
});
const resize = new ResizeObserver(() => schedule());
resize.observe(svg);
// Initialize without starting or loading any force-directed graph layout.
data = normalize(data);
ensureMap();
rebuildIndex();
const cachedView = mapData().view;
const goodView =
  cachedView &&
  [cachedView.x, cachedView.y, cachedView.z].every(Number.isFinite) &&
  cachedView.z > 0.001 &&
  cachedView.z < 4;
home('Atlas', false, false);
S.history = [];
if (!cacheAvailable)
  warning('Browser saving is unavailable in this window. Use Save to keep a portable copy after editing.');
else $('storageWarning').hidden = true;
requestAnimationFrame(() => {
  if (!goodView) {
    const v = rect(),
      b = scopeBox(),
      a = { x: 40, y: 210, w: v.w - 80, h: v.h - 287 },
      z = Math.min(a.w / b.w, a.h / b.h);
    setCamera(
      b.x + b.w / 2 - (a.x + a.w / 2 - v.w / 2) / z,
      b.y + b.h / 2 - (a.y + a.h / 2 - v.h / 2) / z,
      z,
      false,
    );
  }
  schedule();
});
saveCache();
initializing = false;
window.LegalAtlas = {
  version: '1.5-study-map',
  snapshot: () => clone(data),
  sourcePages: () => BOOK_PAGES.slice(),
  navigate: (type, id) => {
    if (type === 'node') goNode(id, true);
    else if (type === 'edge') goEdge(id);
    else if (type === 'district') goDistrict(id);
    else if (type === 'region') goRegion(id);
    else home(type === 'world' ? 'Atlas' : 'Contracts');
  },
  geography: () => ({
    regions: clone(mapData().regions),
    districts: clone(Object.values(mapData().districts)),
    nodes: clone(Object.values(mapData().homes)),
    view: {
      x: S.x,
      y: S.y,
      z: S.z,
      scope: S.scope,
      selected: clone(selected),
      visibleNodes: S.paintNodes.slice(),
      visibleEdges: S.paintEdges.slice(),
      panelOpen: S.panelOpen,
    },
  }),
  back,
  exportMaster: exportJSON,
};
