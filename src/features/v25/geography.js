/* v2.5: one curated geography and no entry-position editing. Legal records,
   study notes and connection priorities remain editable. Dragging a graph card
   pans the camera; native authority/history/dictionary navigation stays intact.
   Geometry is relative to r20's two responsive course arrangements. */
(() => {
  'use strict';
  const block = document.getElementById('dklaGeographyData');
  if (!block) return;
  let G;
  try {
    G = JSON.parse(block.textContent);
  } catch (error) {
    console.error('DKLA geography data', error);
    return;
  }
  if (G.schemaVersion !== 1) return;
  /* v3.2 "Instrument": what is inside a subject is laid out here, on one grid, from the curated data.
     The dataset still says which subject and group an entry belongs to and the order of the groups and
     of the entries in them. This pass only decides
     the rectangles: a subject is two columns of groups, balanced in height; a group is its heading, its
     question and two columns of rows of one height; a group's notes and questions share one last row. Subjects keep
     their place and size on the map (Home is drawn from those), and each gets `panelH`, the height
     its contents need, which is what is drawn and framed once a subject is open.
     Sizes are map units. A subject is 2400 wide and, opened in a 1440 px window, is drawn at 0.5625 px
     a unit, so 64 units is a 36 px row there (docs/DESIGN.md rule 7). */
  const CARD = {
    padX: 40, // subject edge to a row's edge (the label starts `inset` further in)
    inset: 14, // a row's edge to its glyph: headings share that left edge
    top: 148, // subject top to the first group (the title's band)
    bottom: 40,
    colGap: 40,
    groupGap: 54,
    head: 44, // a group's name
    question: 30, // its question, when it has one worth showing
    headGap: 14,
    row: 64,
    cellGap: 14,
  };
  const plainQuestion = (d) => {
    const q = String(d.question || '').trim();
    return (
      !!q &&
      !/^Explore the (assigned|questions)/i.test(q) &&
      q.toLowerCase() !== String(d.title || '').toLowerCase()
    );
  };
  function layoutCards(G) {
    const inGroup = new Map();
    for (const [id, h] of Object.entries(G.homes)) {
      if (!inGroup.has(h.district)) inGroup.set(h.district, []);
      inGroup.get(h.district).push([id, h]);
    }
    for (const r of G.regions) {
      const groups = (r.districtIds || []).map((id) => G.districts[id]).filter(Boolean);
      if (!groups.length) continue;
      const inner = r.w - 2 * CARD.padX,
        colW = (inner - CARD.colGap) / 2,
        cellW = (colW - CARD.cellGap) / 2,
        x0 = r.x + CARD.padX,
        // the four places a row can start: two in each column of groups
        cellX = [0, cellW + CARD.cellGap, colW + CARD.colGap, colW + CARD.colGap + cellW + CARD.cellGap];
      // Groups keep their curated order (top to bottom as they stood) within a column, and are dealt into
      // the two columns so that the columns come out nearest in height; a group that spans the subject
      // stands between such runs.
      const order = groups
        .map((d) => ({ d, wide: d.w > r.w * 0.6, x: d.x, y: d.y }))
        .sort((a, b) => a.y - b.y || a.x - b.x);
      for (const o of order) {
        const members = (inGroup.get(o.d.id) || []).sort((a, b) => a[1].y - b[1].y || a[1].x - b[1].x);
        o.main = members.filter(([, h]) => !h.support);
        o.notes = members.filter(([, h]) => h.support);
        o.cols = o.wide ? 4 : 2;
        o.rows = Math.ceil((o.main.length + (o.notes.length ? 1 : 0)) / o.cols);
        o.head = CARD.head + (plainQuestion(o.d) ? CARD.question : 0) + CARD.headGap;
        o.h = o.head + o.rows * CARD.row;
      }
      const place = (o, first, y) => {
        const d = o.d,
          rows = Math.max(1, o.rows);
        d.x = x0 + cellX[first];
        d.y = y;
        d.w = o.wide ? inner : colW;
        d.h = o.h;
        d.headerH = o.head;
        delete d.headScale;
        // entries run down the first column of rows, then the next
        const cell = (i) => ({
          x: x0 + cellX[first + Math.floor(i / rows)],
          y: y + o.head + (i % rows) * CARD.row,
          w: cellW,
          h: CARD.row,
        });
        o.main.forEach(([, h], i) => Object.assign(h, cell(i)));
        const last = cell(o.main.length);
        for (const [, h] of o.notes) Object.assign(h, last);
        d.supportStart = o.notes.length ? last.y : y + d.h;
        d.notesCell = o.notes.length ? last : null;
        return y + d.h;
      };
      let y = r.y + CARD.top;
      for (let i = 0; i < order.length; ) {
        if (order[i].wide) {
          y = place(order[i++], 0, y) + CARD.groupGap;
          continue;
        }
        let end = i;
        while (end < order.length && !order[end].wide) end++;
        const run = order.slice(i, end);
        // Every way of dealing the run into two columns is tried (a subject has at most 14 groups): the
        // lowest pair of columns wins and, among equals, the one that reads most nearly straight down
        // the left column and then down the right.
        let side = 0,
          best = [Infinity, Infinity];
        const deal = (n, hL, hR, right, back, mask) => {
          // a column only grows, so a hand already worse than the best one is dropped
          const height = Math.max(hL, hR);
          if (height > best[0] || (height === best[0] && back >= best[1] && n < run.length)) return;
          if (n === run.length) {
            if (height < best[0] || back < best[1]) {
              best = [height, back];
              side = mask;
            }
            return;
          }
          const h = run[n].h + CARD.groupGap;
          deal(n + 1, hL + h, hR, right, back + right, mask); // left
          deal(n + 1, hL, hR + h, right + 1, back, mask | (1 << n)); // right
        };
        deal(0, -CARD.groupGap, -CARD.groupGap, 0, 0, 0);
        let yL = y,
          yR = y;
        run.forEach((o, n) => {
          if ((side >> n) & 1) yR = place(o, 2, yR) + CARD.groupGap;
          else yL = place(o, 0, yL) + CARD.groupGap;
        });
        y = Math.max(yL, yR);
        i = end;
      }
      r.panelH = y - CARD.groupGap + CARD.bottom - r.y;
    }
  }
  layoutCards(G);
  const LRS = 'Legislation and the Regulatory State';
  const targets = {
    tall: {
      Contracts: [-7370, -13364],
      'Civil Procedure': [-16440, -360],
      [LRS]: [1500, -360],
      'workbench-region': [-1700, 900],
      'dictionary-region': [-1700, 2700],
    },
    wide: {
      Contracts: [-7370, 700],
      'Civil Procedure': [-23310, 700],
      [LRS]: [8370, 700],
      // v3.0: Notes at the bottom-right of the LRS row (matches r20's arrangement).
      'workbench-region': [20660, 9321],
      'dictionary-region': [15500, 9650],
    },
  };
  // Home prototypes (v25/home-variants.js) bring their own targets, and may move
  // subject tiles inside a course (each tile's subtopics and cards move with it).
  const V = window.DKLAHomeVariant?.active ? window.DKLAHomeVariant : null;
  if (V) for (const mode of ['wide', 'tall']) targets[mode] = V.targets(mode);
  const sourceRegion = new Map(G.regions.map((r) => [r.id, r]));
  let mode0 = 'wide';
  function shiftOf(regionId) {
    const to = V && V.regionPos(mode0, regionId),
      from = sourceRegion.get(regionId);
    return to && from ? [to[0] - from.x, to[1] - from.y] : null;
  }
  const retiredRegions = {
    'civil-region': 'cp-personal-region',
    'extension-iekfaa-1': 'cp-governing-region',
    'extension-cjl74v-1': 'lrs-region-legislative-process-and-statutory-interpretation',
  };
  const retiredDistricts = {
    'civil-contacts': 'cp-specific',
    'civil-jurisdiction': 'cp-consent',
    'extension-iekfaa-1-area': 'cp-erie-rules',
    'extension-cjl74v-1-area':
      'lrs-topic-legislative-process-and-statutory-interpretation-statutory-applications',
    'reading-index': 'semester-readings',
    'source-gaps': 'semester-sources',
    'lrs-topic-rulemaking-reasoned-decisionmaking': 'lrs-topic-judicial-review-reasoned-decisionmaking',
    'lrs-topic-judicial-review-and-standing-substantial-note-authorities':
      'lrs-topic-judicial-review-and-standing-constitutional-standing',
  };
  const excluded = new Set(G.excludedPracticeIds);
  const isExcluded = (id, node) =>
    window.DKLAPracticeFilter?.isExcluded
      ? window.DKLAPracticeFilter.isExcluded(id, node)
      : excluded.has(id) && (!node || node.kind === 'Hypothetical');
  const members = new Map();
  for (const [id, h] of Object.entries(G.homes)) {
    if (!members.has(h.district)) members.set(h.district, []);
    members.get(h.district).push(id);
  }
  const personalSlots = new Map();
  const copy = (o) => JSON.parse(JSON.stringify(o));
  let applying = false,
    installed = false,
    settled = null;

  function stable(graph, mode) {
    if (
      !settled ||
      settled.graph !== graph ||
      settled.mode !== mode ||
      graph.nodes.length !== settled.nodeCount
    )
      return false;
    const M = graph.studyMap;
    if (
      M.layoutId !== G.layoutId ||
      M.regions.length !== settled.regions.length ||
      Object.keys(M.districts).length !== settled.districts.length ||
      Object.keys(M.homes).length !== settled.homes.length
    )
      return false;
    for (const [key, want] of settled.blocks) {
      const have = M.courseBlocks[key];
      if (!have || have.x !== want.x || have.y !== want.y || have.w !== want.w || have.h !== want.h)
        return false;
    }
    for (const [id, want] of settled.regions) {
      const have = M.regions.find((r) => r.id === id);
      if (!have || have.x !== want.x || have.y !== want.y || have.w !== want.w || have.h !== want.h)
        return false;
    }
    for (const [id, want] of settled.districts) {
      const have = M.districts[id];
      if (
        !have ||
        have.x !== want.x ||
        have.y !== want.y ||
        have.w !== want.w ||
        have.h !== want.h ||
        have.supportStart !== want.supportStart
      )
        return false;
    }
    for (const [id, want] of settled.homes) {
      const have = M.homes[id],
        p = graph.geography.placements[id];
      if (
        !have ||
        have.custom ||
        have.x !== want.x ||
        have.y !== want.y ||
        have.w !== want.w ||
        have.h !== want.h ||
        have.district !== want.district ||
        have.region !== want.region ||
        have.core !== want.core ||
        have.support !== want.support ||
        !p ||
        p.district !== want.district ||
        p.region !== want.region
      )
        return false;
    }
    for (const n of graph.nodes) {
      const h = M.homes[n.id];
      if (h && (n.position?.x !== h.x || n.position?.y !== h.y || n.learning?.district !== h.district))
        return false;
    }
    return true;
  }
  function rememberGeometry(graph, mode) {
    const M = graph.studyMap,
      snap = (o) => ({
        x: o.x,
        y: o.y,
        w: o.w,
        h: o.h,
        supportStart: o.supportStart,
        region: o.region,
        district: o.district,
        core: o.core,
        support: o.support,
      });
    settled = {
      graph,
      mode,
      nodeCount: graph.nodes.length,
      blocks: Object.entries(M.courseBlocks).map(([id, v]) => [id, snap(v)]),
      regions: M.regions.map((r) => [r.id, snap(r)]),
      districts: Object.entries(M.districts).map(([id, v]) => [id, snap(v)]),
      homes: Object.entries(M.homes).map(([id, v]) => [id, snap(v)]),
    };
  }

  function arrangement() {
    const v = typeof rect === 'function' ? rect() : { w: window.innerWidth, h: window.innerHeight };
    return v.w >= 600 && v.w / Math.max(1, v.h) >= 1.25 ? 'wide' : 'tall';
  }
  function absolute(o, T) {
    const out = copy(o),
      a = T[o.anchor],
      d = shiftOf(o.region || o.id) || [0, 0];
    out.x += a[0] + d[0];
    out.y += a[1] + d[1];
    if (typeof out.supportStart === 'number') out.supportStart += a[1] + d[1];
    delete out.anchor;
    delete out.custom;
    return out;
  }
  function assign(target, source) {
    let changed = false;
    for (const [k, v] of Object.entries(source)) {
      if (typeof v === 'object' && v !== null) {
        if (JSON.stringify(target[k]) !== JSON.stringify(v)) {
          target[k] = copy(v);
          changed = true;
        }
      } else if (target[k] !== v) {
        target[k] = v;
        changed = true;
      }
    }
    if ('custom' in target) {
      delete target.custom;
      changed = true;
    }
    return changed;
  }
  function fixView(v) {
    if (!v) return;
    if (retiredRegions[v.region]) v.region = retiredRegions[v.region];
    if (retiredDistricts[v.district]) v.district = retiredDistricts[v.district];
  }
  function applyTo(graph) {
    if (applying || !graph?.studyMap || !graph?.nodes) return false;
    const mode = arrangement();
    if (stable(graph, mode)) return false;
    mode0 = mode;
    applying = true;
    let changed = false;
    try {
      const M = graph.studyMap,
        T = targets[mode],
        byNode = new Map(graph.nodes.map((n) => [n.id, n]));
      M.courseBlocks ||= {};
      M.districts ||= {};
      M.homes ||= {};
      M.courseDesign ||= {};
      graph.geography ||= { regions: [], placements: {} };
      graph.geography.placements ||= {};
      const oldRegions = new Map((M.regions || []).map((r) => [r.id, r]));
      const nextRegions = G.regions.map((source) => {
        const r = oldRegions.get(source.id) || {};
        changed = assign(r, absolute(source, T)) || changed;
        return r;
      });
      if ((M.regions || []).map((r) => r.id).join('|') !== nextRegions.map((r) => r.id).join('|')) {
        M.regions = nextRegions;
        changed = true;
      }
      for (const [course, a] of Object.entries(G.anchors)) {
        if (!['Contracts', 'Civil Procedure', LRS].includes(course)) continue;
        const c = (M.courseBlocks[course] ||= {}),
          size = (V && V.blockSize(mode, course)) || a;
        changed = assign(c, { x: T[course][0], y: T[course][1], w: size.w, h: size.h }) || changed;
      }
      for (const did of Object.keys(M.districts))
        if (!G.districts[did]) {
          delete M.districts[did];
          changed = true;
        }
      for (const [did, d] of Object.entries(G.districts)) {
        M.districts[did] ||= {};
        changed = assign(M.districts[did], absolute(d, T)) || changed;
      }
      for (const id of excluded) {
        if (!isExcluded(id, byNode.get(id))) continue;
        if (M.homes[id]) {
          delete M.homes[id];
          changed = true;
        }
        if (graph.geography.placements[id]) {
          delete graph.geography.placements[id];
          changed = true;
        }
      }
      for (const [nid, source] of Object.entries(G.homes)) {
        const n = byNode.get(nid);
        if (!n) continue;
        const h = absolute(source, T);
        M.homes[nid] ||= {};
        changed = assign(M.homes[nid], h) || changed;
        graph.geography.placements[nid] ||= {};
        changed = assign(graph.geography.placements[nid], G.placements[nid]) || changed;
        if (n.position?.x !== h.x || n.position?.y !== h.y) {
          n.position = { x: h.x, y: h.y };
          changed = true;
        }
        if (n.learning?.district !== h.district) {
          n.learning = { ...n.learning, district: h.district };
          changed = true;
        }
      }
      // User-created entries receive deterministic locked homes in the personal
      // inbox. Imported custom coordinates do not become a new curated layout.
      const added = graph.nodes
        .filter((n) => !G.homes[n.id] && !isExcluded(n.id, n))
        .sort((a, b) => a.id.localeCompare(b.id));
      const d = M.districts.inbox;
      if (d && added.length) {
        const cellW = (d.w - CARD.cellGap) / 2;
        for (const n of added) {
          if (!personalSlots.has(n.id)) personalSlots.set(n.id, personalSlots.size);
          const i = personalSlots.get(n.id),
            h = {
              id: n.id,
              x: d.x + (i % 2) * (cellW + CARD.cellGap),
              y: d.y + G.districts.inbox.h + Math.floor(i / 2) * CARD.row,
              w: cellW,
              h: CARD.row,
              region: d.region,
              district: d.id,
              core: true,
              support: false,
              added: true,
            };
          M.homes[n.id] ||= {};
          changed = assign(M.homes[n.id], h) || changed;
          const p = {
            region: d.region,
            district: d.id,
            role: 'User note',
            tier: 'main',
            displayLabel: n.shortTitle || n.title,
            placementBasis: 'Personal entry: deterministic locked inbox home.',
          };
          graph.geography.placements[n.id] ||= {};
          changed = assign(graph.geography.placements[n.id], p) || changed;
          n.position = { x: h.x, y: h.y };
          n.learning = { ...n.learning, district: d.id };
        }
        d.h = Math.max(d.h, G.districts.inbox.h + Math.ceil(personalSlots.size / 2) * CARD.row);
        const r = M.regions.find((r) => r.id === d.region);
        r.panelH = Math.max(r.panelH || 0, d.y + d.h - r.y + CARD.bottom);
        r.h = Math.max(r.h, r.panelH);
      }
      for (const [course, source] of Object.entries(G.courseDesign)) {
        const design = copy(source),
          a = T[course];
        // v3.2: a tree line that names a subject not on the map is left out. The dataset had three (they
        // named subjects retired when the map was curated) and they have been removed from it with the
        // owner's approval; this stays as the guard, so such a line can never be drawn to nowhere.
        if (design.spine)
          design.spine = design.spine.filter((sp) => sourceRegion.has(sp.a) && sourceRegion.has(sp.b));
        for (const item of [...(design.zones || []), ...(design.labels || [])]) {
          item.x += a[0];
          item.y += a[1];
        }
        const zones =
          V && V.zones(mode, course, design.zones || [], (rid) => M.regions.find((r) => r.id === rid));
        if (zones) {
          design.zones = zones;
          design.labels = [];
        }
        if (JSON.stringify(M.courseDesign[course]) !== JSON.stringify(design)) {
          M.courseDesign[course] = design;
          changed = true;
        }
      }
      M.layoutId = G.layoutId;
      // The older source tree is used by search and membership views. Mirror
      // the curated district lists without touching any node or edge prose.
      const geoRegions = M.regions.map((r) => ({
        ...r,
        districts: r.districtIds.map((did) => ({
          ...M.districts[did],
          nodeIds: [
            ...(members.get(did) || []).filter((id) => byNode.has(id)),
            ...(did === 'inbox' ? added.map((n) => n.id) : []),
          ],
        })),
      }));
      if (JSON.stringify(graph.geography.regions) !== JSON.stringify(geoRegions)) {
        graph.geography.regions = geoRegions;
        changed = true;
      }
      fixView(M.view);
      // Supporting-case tiles follow the new actual course bottom; their
      // internal source-case geometry is private and is never repositioned.
      if (typeof D !== 'undefined' && D?.tiles)
        for (const [course, b] of Object.entries(M.courseBlocks)) {
          const tile = D.tiles[course];
          if (!tile) continue;
          const pill = V && V.pill(mode, course);
          if (pill) {
            Object.assign(tile, pill);
            continue;
          }
          const zones = M.courseDesign[course]?.zones || [];
          tile.x = Math.min(b.x, ...zones.map((z) => z.x));
          tile.y = Math.max(b.y + b.h, ...zones.map((z) => z.y + z.h)) + 120;
          tile.w = 4300;
          tile.h = 620;
        }
      if (changed && typeof R11 !== 'undefined') {
        R11.galaxyKey = null;
        R11.galaxy = null;
      }
      rememberGeometry(graph, mode);
      return changed;
    } finally {
      applying = false;
    }
  }
  // v3.2: bounds() is asked for dozens of times inside one draw (the rules-and-authorities block is placed
  // from it), and each call compared every home with the fixed geography. A call that follows a verification
  // by under a tenth of a second, on the same graph and window shape, uses that one. Drawing, saving,
  // storing a view and opening an entry still verify every time.
  let verified = { graph: null, mode: '', at: 0 };
  function applyOnce() {
    if (typeof data === 'undefined') return false;
    if (verified.graph === data && verified.mode === arrangement() && performance.now() - verified.at < 100)
      return false;
    return apply();
  }
  function apply() {
    if (typeof data === 'undefined') return false;
    const changed = applyTo(data);
    verified = { graph: data, mode: arrangement(), at: performance.now() };
    if (typeof S !== 'undefined') fixView(S);
    return changed;
  }
  function cleanControls(root = document) {
    for (const el of root.querySelectorAll('[data-place],#layoutBtn')) el.remove();
    for (const select of root.querySelectorAll('select[name="r6district"],select[name="district"]')) {
      // Only placement forms use these names. Sources and reading selectors
      // use distinct IDs/names and remain available.
      select.disabled = true;
      select.closest('.form-field')?.setAttribute('hidden', '');
    }
    const hint = document.getElementById('mapHint');
    if (hint?.textContent?.includes('Drag an entry')) hint.textContent = 'Click to read · Drag to pan';
  }
  function install() {
    if (installed) return;
    if (typeof S === 'undefined' || typeof draw !== 'function' || !window.LegalAtlas) {
      setTimeout(install, 80);
      return;
    }
    installed = true;
    // Baseline pointerdown builds the drag record after capture handlers run.
    // Sanitize at the state boundary, so mouse, touch, pen and capture paths
    // all become camera drags; preserve target for an unmoved normal click.
    let drag = S.drag;
    const sanitize = (value) => (value ? { ...value, node: null, home: null, preview: null } : null);
    Object.defineProperty(S, 'drag', {
      configurable: true,
      enumerable: true,
      get: () => drag,
      set: (value) => {
        drag = sanitize(value);
      },
    });
    drag = sanitize(drag);
    commitMove = () => false;
    placeForm = () => {};
    const placeOriginal = typeof r6Place === 'function' ? r6Place : null;
    if (placeOriginal)
      r6Place = function (id) {
        apply();
        // Existing homes cannot be reclassified through a direct legacy API.
        if (mapData().homes[id]) return mapData().homes[id];
        applyTo(data);
        return mapData().homes[id] || null;
      };
    window.LegalAtlas.placeEntry = () => false;
    homeFor = function (id) {
      return mapData().homes[id];
    };
    const normalizeOriginal = normalize;
    normalize = function (...args) {
      const out = normalizeOriginal.apply(this, args);
      applyTo(out);
      return out;
    };
    const saveOriginal = saveCache;
    saveCache = function (...args) {
      apply();
      return saveOriginal.apply(this, args);
    };
    const storeOriginal = storeView;
    storeView = function (...args) {
      apply();
      return storeOriginal.apply(this, args);
    };
    const drawOriginal = draw;
    draw = function (...args) {
      apply();
      const out = drawOriginal.apply(this, args);
      cleanControls();
      return out;
    };
    const renderOriginal = renderInspector;
    renderInspector = function (...args) {
      apply();
      const out = renderOriginal.apply(this, args);
      cleanControls();
      return out;
    };
    const goRegionOriginal = goRegion,
      goDistrictOriginal = goDistrict;
    goRegion = function (id, ...args) {
      apply();
      return goRegionOriginal.call(this, retiredRegions[id] || id, ...args);
    };
    goDistrict = function (id, ...args) {
      apply();
      return goDistrictOriginal.call(this, retiredDistricts[id] || id, ...args);
    };
    const helpOriginal = help;
    help = function (...args) {
      const out = helpOriginal.apply(this, args);
      const body = document.getElementById('modalBody');
      if (body)
        for (const p of body.querySelectorAll('p'))
          if (/manual drag|Changing placement moves|New entries are allocated/.test(p.textContent))
            p.textContent =
              'Entries have curated, fixed homes. Drag the map or a card to pan; click an entry to read it. Your notes and study priorities remain editable, and new personal entries receive a fixed home in the study inbox.';
      return out;
    };
    new MutationObserver(() => cleanControls()).observe(document.getElementById('modal') || document.body, {
      childList: true,
      subtree: true,
    });
    document.addEventListener(
      'click',
      (event) => {
        if (event.target.closest('[data-place],#layoutBtn')) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
    apply();
    cleanControls();
    schedule();
    // A fresh overview can retain the seed's old pre-library camera. Reframe
    // once after the enlarged native precinct is available. An open entry,
    // district, subject or navigation history keeps its reading position.
    if (
      typeof home === 'function' &&
      !S.region &&
      !S.district &&
      !(typeof selected !== 'undefined' && selected) &&
      !S.history?.length
    )
      home('Atlas', false, false);
    document.documentElement.classList.add('geography-locked');
  }
  window.DKLAGeography = {
    version: '2.5',
    locked: true,
    card: CARD,
    apply,
    bounds() {
      applyOnce();
      const rs = typeof data !== 'undefined' ? data.studyMap.regions : [];
      if (!rs.length) return { x: 0, y: 0, w: 0, h: 0 };
      const x = Math.min(...rs.map((r) => r.x)),
        y = Math.min(...rs.map((r) => r.y));
      return {
        x,
        y,
        w: Math.max(...rs.map((r) => r.x + r.w)) - x,
        h: Math.max(...rs.map((r) => r.y + r.h)) - y,
      };
    },
    audit() {
      return copy(G.audit);
    },
  };
  install();
})();
