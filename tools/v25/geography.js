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
      'workbench-region': [0, 9650],
      'dictionary-region': [15500, 9650],
    },
  };
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
      a = T[o.anchor];
    out.x += a[0];
    out.y += a[1];
    if (typeof out.supportStart === 'number') out.supportStart += a[1];
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
        const c = (M.courseBlocks[course] ||= {});
        changed = assign(c, { x: T[course][0], y: T[course][1], w: a.w, h: a.h }) || changed;
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
        for (const n of added) {
          if (!personalSlots.has(n.id)) personalSlots.set(n.id, personalSlots.size);
          const i = personalSlots.get(n.id),
            h = {
              id: n.id,
              x: d.x + 28 + (i % 2) * 528,
              y: d.y + 126 + Math.floor(i / 2) * 110,
              w: 500,
              h: 88,
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
        d.h = Math.max(d.h, 126 + Math.ceil(personalSlots.size / 2) * 110 + 28);
        const r = M.regions.find((r) => r.id === d.region);
        r.h = Math.max(r.h, d.y + d.h - r.y + 40);
      }
      for (const [course, source] of Object.entries(G.courseDesign)) {
        const design = copy(source),
          a = T[course];
        for (const item of [...(design.zones || []), ...(design.labels || [])]) {
          item.x += a[0];
          item.y += a[1];
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
  function apply() {
    if (typeof data === 'undefined') return false;
    const changed = applyTo(data);
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
    apply,
    bounds() {
      apply();
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
