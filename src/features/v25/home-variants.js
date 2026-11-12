/* Home arrangement prototypes (November 2026). A prototype switch, off for
   every visitor: localStorage 'dkla.homeVariant' = '1'..'5' picks one, any
   other value (or none) keeps today's Home exactly as it is.

     1 Today without the D   today's courses; Rules & authorities and SCOTUS
                             History move up into the band the mark left
     2 Building as anchor    the SCOTUS building larger and centred below the
                             courses, the books split left and right of it
     3 Side rail             the courses side by side in two columns each, the
                             building and the books stacked in a right column
     4 Bookshelf base        the books standing in one row along the bottom,
                             the building at the left end of the shelf
     5 Tighter trees         as 1, with the holes inside each course closed

   Every variant drops the big DKLA mark from the map (the top bar keeps its
   logo and carries the splash text). Only positions change: each subject tile
   keeps its size, its subtopics and cards move with it, and every connection
   line is still drawn between the same tiles. On a wide window the lower
   blocks grow to the room the window leaves (fit), so the Home fit fills the
   screen instead of leaving an empty band. Nothing here is saved.

   Read by r20.js (course targets, the mark, SCOTUS History's box),
   geography.js (course, tile and subtopic positions), authorities.js (the
   Rules & authorities block) and home-fit.js (calls fit() before framing). */
(() => {
  'use strict';
  if (window.DKLAHomeVariant) return;
  const KEY = 'dkla.homeVariant';
  let id = 0;
  try {
    const v = Number(localStorage.getItem(KEY));
    if ([1, 2, 3, 4, 5].includes(v)) id = v;
  } catch {
    /* storage blocked: today's Home */
  }
  const CP = 'Civil Procedure',
    K = 'Contracts',
    LRS = 'Legislation and the Regulatory State',
    COURSES = [CP, K, LRS];
  const NAMES = {
    1: 'Today without the D',
    2: 'Building as anchor',
    3: 'Side rail',
    4: 'Bookshelf base',
    5: 'Tighter trees',
  };
  // Today's targets (the same numbers as r20.js ARR and geography.js).
  const TODAY = {
    tall: {
      [K]: [-7370, -13364],
      [CP]: [-16440, -360],
      [LRS]: [1500, -360],
      'workbench-region': [-1700, 900],
      'dictionary-region': [-1700, 2700],
    },
    wide: {
      [K]: [-7370, 700],
      [CP]: [-23310, 700],
      [LRS]: [8370, 700],
      'workbench-region': [20660, 9321],
      'dictionary-region': [15500, 9650],
    },
  };
  const TILE = 2400, // every subject tile is 2400 wide
    GX = 300, // between tile columns
    GY = 300, // between tiles in a column
    TOP = 450, // from the top of a course's block to its first tile
    EDGE = 250, // a block's margin round its tiles
    COURSE_GAP = 700, // between neighbouring course blocks
    BAND = 700, // between the courses' bottom row and the lower blocks
    BLOCK_GAP = 900; // between two lower blocks side by side

  let G = null;
  function geo() {
    if (G) return G;
    try {
      G = JSON.parse(document.getElementById('dklaGeographyData').textContent);
    } catch {
      G = { regions: [] };
    }
    return G;
  }
  const regionsOf = (course) => geo().regions.filter((r) => r.anchor === course);
  // Rows as the curated design reads them: tiles whose tops are within 1300 of
  // the row's first tile.
  function bands(rs) {
    const out = [];
    for (const r of [...rs].sort((a, b) => a.y - b.y || a.x - b.x))
      if (out.length && r.y - out[out.length - 1][0].y < 1300) out[out.length - 1].push(r);
      else out.push([r]);
    return out;
  }
  // Variant 5: each tile keeps its column (the curated design has five) and
  // its order in the column; the gaps between tiles close. Rows listed in
  // `groups` start together (Civ Pro's two bands, Contracts' bottom row), so
  // the design's bands survive.
  function compact(course, groups) {
    const rows = bands(regionsOf(course)),
      // A row no group names joins the last group.
      named = new Set((groups || []).flat()),
      sets = groups
        ? groups.map((g, gi) =>
            g
              .flatMap((i) => rows[i] || [])
              .concat(gi === groups.length - 1 ? rows.filter((_, i) => !named.has(i)).flat() : []),
          )
        : [rows.flat()],
      pos = {};
    let top = TOP,
      bottom = TOP;
    for (const set of sets) {
      const cols = Array(5).fill(top);
      for (const r of [...set].sort((a, b) => a.y - b.y)) {
        const c = Math.max(0, Math.min(4, Math.round((r.x - 250) / 2960)));
        pos[r.id] = [EDGE + c * (TILE + GX), cols[c]];
        cols[c] += r.h + GY;
      }
      bottom = Math.max(...cols) - GY;
      top = bottom + GY * 2;
    }
    return { pos, w: EDGE * 2 + 5 * TILE + 4 * GX, h: bottom + EDGE, cols: 5 };
  }
  // Variant 3: the tiles in reading order (row by row, left to right), each
  // into the shortest of k columns.
  function masonry(course, k) {
    const order = bands(regionsOf(course)).flatMap((row) => row.sort((a, b) => a.x - b.x)),
      cols = Array(k).fill(TOP),
      pos = {};
    for (const r of order) {
      const c = cols.indexOf(Math.min(...cols));
      pos[r.id] = [EDGE + c * (TILE + GX), cols[c]];
      cols[c] += r.h + GY;
    }
    return { pos, w: EDGE * 2 + k * TILE + (k - 1) * GX, h: Math.max(...cols) - GY + EDGE, cols: k };
  }

  // The wide layout of the upper part (courses, Notes), per variant; built once.
  let wideLayout = null;
  function layout() {
    if (wideLayout) return wideLayout;
    const L = { targets: { ...TODAY.wide }, packs: null, pills: {} };
    if (id === 3 || id === 5) {
      const packs =
        id === 5
          ? { [CP]: compact(CP, [[0, 1], [2]]), [K]: compact(K, [[0, 1, 2], [3]]), [LRS]: compact(LRS) }
          : { [CP]: masonry(CP, 2), [K]: masonry(K, 2), [LRS]: masonry(LRS, 2) };
      const total = COURSES.reduce((s, c) => s + packs[c].w, 0) + COURSE_GAP * 2;
      let x = id === 5 ? -total / 2 : 0;
      for (const c of COURSES) {
        L.targets[c] = [Math.round(x), 700];
        x += packs[c].w + COURSE_GAP;
      }
      L.packs = packs;
      // Supporting-cases pills sit under each course's left edge; Notes stands at
      // the right end of LRS's pill row (5), or under Civ Pro's pill (3, where
      // Civ Pro is the shortest course).
      for (const c of COURSES)
        L.pills[c] = { x: L.targets[c][0], y: 700 + packs[c].h + 120, w: 4300, h: 620 };
      if (id === 5) {
        const p = L.pills[LRS];
        L.targets['workbench-region'] = [L.targets[LRS][0] + packs[LRS].w - EDGE - TILE, p.y + 310 - 397];
      } else {
        const p = L.pills[CP];
        L.targets['workbench-region'] = [L.targets[CP][0] + EDGE, p.y + p.h + 300];
      }
      // The dictionary is drawn as a spine in the authorities frame; its own
      // region is never shown on Home and is left out of the Home fit.
      L.targets['dictionary-region'] = [L.targets[K][0] + EDGE, 700 + TOP];
    }
    return (wideLayout = L);
  }

  const wideNow = () => {
    const v = typeof rect === 'function' ? rect() : { w: innerWidth, h: innerHeight };
    return v.w >= 600 && v.w / Math.max(1, v.h) >= 1.25;
  };

  // ---- the lower blocks, sized to the window (wide only) ----
  let state = null; // { key, scotus, auth }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // Natural height (map units) of the authorities block laid out in `cols`
  // columns at width w; `split` = one column of three books per panel.
  function natural(cols, w, colW = 480) {
    const A = window.DKLAAuthorities;
    const v = A?.natural ? A.natural(cols, colW) : { 1: 552, 2: 447, 3: 447, 6: 270 }[cols] || 447;
    return (v * w) / (cols * colW);
  }
  function upper() {
    const M = typeof mapData === 'function' ? mapData() : null;
    if (!M) return null;
    const boxes = [
      ...M.regions.filter((r) => r.id !== 'dictionary-region'),
      ...Object.values(M.courseBlocks || {}),
      ...Object.values(window.DKLABriefs?.data?.tiles || {}),
    ];
    const x0 = Math.min(...boxes.map((b) => b.x)),
      x1 = Math.max(...boxes.map((b) => b.x + b.w)),
      top = Math.min(...Object.values(M.courseBlocks || {}).map((b) => b.y)),
      bottom = Math.max(...boxes.map((b) => b.y + b.h));
    return { x0, x1, top, bottom, w: x1 - x0 };
  }
  // How far above the courses' top the Home fit puts the frame (home-fit.js).
  const titleRoom = (z) =>
    typeof R18 !== 'undefined' && R18.courseTitlePx ? (R18.courseTitlePx(z) / z) * 1.9 : 1600;

  // `top`: where the Home fit last put the frame's top (map units), when known.
  function solve(a, top) {
    const U = upper();
    if (!U || !isFinite(U.w)) return null;
    const A = a.w / a.h,
      PAD = 150,
      frameTop = (z) => (top == null ? U.top - titleRoom(z) : top);
    // The room left under the courses when the frame is as wide as W (map units).
    const room = (W, lowerTop) => {
      const z = a.w / W;
      return frameTop(z) + a.h / z - PAD - lowerTop;
    };
    const lowerTop = U.bottom + BAND;
    if (id === 1 || id === 5) {
      const W = U.w,
        w = (W - BLOCK_GAP) / 2,
        hn = natural(3, w),
        h = Math.max(hn, Math.min(room(W, lowerTop), w / 2.3, hn * 1.9));
      return {
        auth: { x: U.x0, y: lowerTop, w, h, cols: 3 },
        scotus: { x: U.x0 + w + BLOCK_GAP, y: lowerTop, w, h },
      };
    }
    if (id === 2) {
      const W = U.w,
        k1 = natural(1, 1),
        inner = W - BLOCK_GAP * 2;
      // The panels need k1 * width of height; the building is about 2.6 times as wide as it is tall.
      let h = Math.max(room(W, lowerTop), (k1 * inner) / (2 + 2.6 * k1));
      let wp = Math.max(6200, (inner - 2.6 * h) / 2),
        wb = inner - 2 * wp;
      if (wb / h < 2.2) h = wb / 2.2;
      h = Math.max(h, k1 * wp, wb / 3.4);
      return {
        auth: {
          x: U.x0,
          y: lowerTop,
          w: W,
          h,
          cols: 1,
          split: { left: { x: U.x0, w: wp }, right: { x: U.x0 + wp + wb + BLOCK_GAP * 2, w: wp } },
        },
        scotus: { x: U.x0 + wp + BLOCK_GAP, y: lowerTop, w: wb, h },
      };
    }
    if (id === 3) {
      // The rail runs from the top of the frame (beside the course names and the
      // room kept for Dottie) to the bottom of the courses.
      const k2 = natural(2, 1),
        GAP = 1200,
        railTop = top == null ? U.top : Math.min(U.top, top + 200),
        Hr = U.bottom - railTop;
      let wr = Hr;
      for (let i = 0; i < 4; i++) {
        const W = U.w + GAP + wr,
          z = a.w / W,
          H = U.bottom + PAD - frameTop(z);
        wr = Math.max(6000, A * H - U.w - GAP);
      }
      let ha = k2 * wr,
        hb = Hr - BAND - ha;
      if (wr / hb < 2.1) {
        hb = wr / 2.1;
        ha = Hr - BAND - hb;
      } else if (wr / hb > 3.3) {
        wr = (Hr - BAND) / (1 / 3.3 + k2);
        hb = wr / 3.3;
        ha = Hr - BAND - hb;
      }
      const x = U.x1 + GAP;
      return {
        scotus: { x, y: railTop, w: wr, h: hb },
        auth: { x, y: railTop + hb + BAND, w: wr, h: ha, cols: 2 },
      };
    }
    if (id === 4) {
      // Narrow books (340 px of the block's own pixels each) keep their titles large.
      const W = U.w,
        colW = 340,
        k6 = natural(6, 1, colW),
        least = 26000; // six books, each wide enough for its title
      let h = room(W, lowerTop),
        wb = Math.max(14000, 2.7 * h), // the building never shrinks below a third of the row
        ws = W - BLOCK_GAP - wb;
      if (ws < least) {
        ws = least;
        wb = W - BLOCK_GAP - ws;
        h = Math.min(h, wb / 2.1);
      }
      h = Math.max(h, k6 * ws, wb / 3.4);
      return {
        auth: { x: U.x0, y: lowerTop, w: ws, h, cols: 6, colW },
        scotus: { x: U.x0 + ws + BLOCK_GAP, y: lowerTop, w: wb, h },
      };
    }
    return null;
  }
  // The frame top found for each window size. Sizing the blocks moves the frame
  // a little, which could move the blocks again: the top is settled once it
  // moves by less than 100 units, or after four tries, and then kept.
  const topFor = new Map();
  function fit(a, top) {
    if (!id || !wideNow() || !a) return state;
    const size = a.w + 'x' + a.h,
      known = topFor.get(size);
    if (top == null || known?.settled) top = known?.top;
    else if (known && Math.abs(top - known.top) < 100) {
      known.settled = true;
      top = known.top;
    } else {
      top = Math.round(top / 50) * 50;
      topFor.set(size, { top, tries: (known?.tries || 0) + 1, settled: (known?.tries || 0) >= 3 });
    }
    const U = upper(),
      key = [a.w, a.h, top, U && U.x0, U && U.x1, U && U.top, U && U.bottom].join();
    if (state?.key === key) return state;
    const s = solve(a, top);
    if (!s) return state;
    const r = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v) : v]));
    s.scotus = r(s.scotus);
    s.auth = r(s.auth);
    if (s.auth.split) s.auth.split = { left: r(s.auth.split.left), right: r(s.auth.split.right) };
    state = { key, ...s };
    const box = window.DKLAScotusBox;
    if (box) Object.assign(box, state.scotus);
    return state;
  }
  // Before the first Home fit (a deep link, a course view) the window's own size stands in.
  function ensure() {
    if (state || !id || !wideNow()) return state;
    const v = typeof rect === 'function' ? rect() : { w: innerWidth, h: innerHeight };
    return fit({ w: Math.max(1, v.w - 28), h: Math.max(1, v.h - 84) });
  }

  window.DKLAHomeVariant = {
    id,
    name: NAMES[id] || 'Today',
    active: id > 0,
    // Course, Notes and dictionary targets for 'wide' or 'tall'.
    targets: (mode) => (id && mode === 'wide' ? layout().targets : TODAY[mode]),
    // Map from region id to its position inside its course's block, or null.
    regionPos(mode, regionId) {
      if (!id || mode !== 'wide') return null;
      const L = layout();
      if (!L.packs) return null;
      for (const c of COURSES) if (L.packs[c].pos[regionId]) return L.packs[c].pos[regionId];
      return null;
    },
    blockSize(mode, course) {
      if (!id || mode !== 'wide') return null;
      const p = layout().packs?.[course];
      return p ? { w: p.w, h: p.h } : null;
    },
    pill(mode, course) {
      if (!id || mode !== 'wide') return null;
      const p = layout().pills[course];
      return p ? { ...p } : null;
    },
    // Variant 5 keeps each course's zones, redrawn round their tiles; 3 has none.
    zones(mode, course, zones, place) {
      if (!id || mode !== 'wide' || !layout().packs) return null;
      if (id === 3) return [];
      return zones.map((zn) => {
        const boxes = (zn.regionIds || []).map(place).filter(Boolean);
        if (!boxes.length) return zn;
        const x = Math.min(...boxes.map((b) => b.x)) - EDGE,
          y = Math.min(...boxes.map((b) => b.y)) - 200,
          r = Math.max(...boxes.map((b) => b.x + b.w)) + EDGE,
          b = Math.max(...boxes.map((b) => b.y + b.h)) + 120;
        return { ...zn, x, y, w: r - x, h: b - y };
      });
    },
    // SCOTUS History's top on a tall window, where the mark stood.
    tallLower: 10300,
    fit,
    authority() {
      if (!id || !wideNow()) return null;
      return ensure()?.auth || null;
    },
    scotus() {
      if (!id || !wideNow()) return null;
      return ensure()?.scotus || null;
    },
    key: () => (id && state ? id + ':' + state.key : String(id)),
  };
})();
