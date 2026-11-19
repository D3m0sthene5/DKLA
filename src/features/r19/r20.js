/* r20: map and panel clean-ups, and two-way links between the dictionary and the briefs.
   Loaded last. Nothing here changes stored entries. */
(function () {
  'use strict';
  const svg = document.getElementById('geoCanvas');
  const D = window.DKLABriefs && window.DKLABriefs.data;
  const esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );

  /* ---------- 1. a course view shows that course ----------
     Zoomed in on one course, the other courses' titles, tallies, tiles and blocks used to hang in at the edges
     ("…edure", "324 entries · 11 subjects"). They now fade out as the camera moves from the atlas to a course,
     continuously with the zoom, so the animation still reads as one map. */
  function fadeOthers() {
    if (!svg || typeof galaxy !== 'function') return;
    const blocks = galaxy().blocks || {},
      mine = blocks[S.scope];
    // v3.2: how far the view has gone from the atlas (0) to this course alone (1): the layers that paint
    // after this one (Rules & authorities, the Court's figures) fade by the same amount
    if (typeof R18 !== 'undefined') R18.courseFade = 0;
    if (!mine) return;
    // 0 at the atlas, 1 by the time this course fills the screen (courses differ in how far that zoom is)
    const zf = zoomFloor() * 1.12;
    let zc = zf * 1.6;
    try {
      const a = safeArea(),
        sb0 = scopeBox();
      zc = Math.min((a.w - 40) / sb0.w, (a.h - 40) / sb0.h, 0.7) * 0.88;
    } catch {
      /* default span */
    }
    const f = zc <= zf * 1.05 ? (S.z >= zc ? 1 : 0) : Math.max(0, Math.min(1, (S.z - zf) / (zc - zf)));
    if (typeof R18 !== 'undefined') R18.courseFade = f;
    if (f <= 0) return;
    // this course's own frame: its block plus its own supporting-cases tile, with a small margin
    const pad = Math.max(mine.w, mine.h) * 0.03;
    const box = { x0: mine.x - pad, y0: mine.y - pad, x1: mine.x + mine.w + pad, y1: mine.y + mine.h + pad };
    for (const tile of svg.querySelectorAll('.r19-tile')) {
      let tb;
      try {
        tb = tile.getBBox();
      } catch {
        continue;
      }
      const cx = tb.x + tb.width / 2;
      if (cx > mine.x && cx < mine.x + mine.w && tb.y > mine.y && tb.y < mine.y + mine.h * 1.3)
        box.y1 = Math.max(box.y1, tb.y + tb.height + pad);
    }
    for (const label of svg.querySelectorAll('text.course-label')) {
      let lb;
      try {
        lb = label.getBBox();
      } catch {
        continue;
      }
      const cx = lb.x + lb.width / 2;
      if (
        cx > mine.x &&
        cx < mine.x + mine.w &&
        lb.y + lb.height > mine.y - mine.h * 0.6 &&
        lb.y < mine.y + mine.h
      ) {
        box.y0 = Math.min(box.y0, lb.y - pad);
        box.x0 = Math.min(box.x0, lb.x - pad);
        box.x1 = Math.max(box.x1, lb.x + lb.width + pad);
      }
    }
    const keep = String(1 - f);
    // v3.2: every box is read first and the fading is written afterwards. Writing between the readings made
    // the browser work the page out again for each element.
    const fade = [];
    const visit = (el, depth) => {
      if (el.tagName === 'defs' || el.tagName === 'title') return;
      // v3.2: a subject of another course (or the notes tile, which stands inside a course's frame) and its
      // name fade whatever the frame says; the ground belongs to every view
      if (el.classList.contains('v32-ground')) return;
      const other = depth === 0 && (el.dataset.tile || el.dataset.card || el.dataset.mapRegion);
      if (other) {
        const region = regionFor(other);
        if (region && regionCourse(region) !== S.scope) {
          fade.push(el);
          return;
        }
      }
      let b;
      try {
        b = el.getBBox();
      } catch {
        return;
      }
      if (!b || (!b.width && !b.height)) return;
      const out = b.x > box.x1 || b.x + b.width < box.x0 || b.y > box.y1 || b.y + b.height < box.y0;
      if (out) {
        fade.push(el);
        return;
      }
      const inside = b.x >= box.x0 && b.x + b.width <= box.x1 && b.y >= box.y0 && b.y + b.height <= box.y1;
      if (
        !inside &&
        depth < 2 &&
        el.tagName === 'g' &&
        el.children.length &&
        !el.classList.contains('map-region') &&
        !el.classList.contains('node-card')
      )
        for (const c of el.children) visit(c, depth + 1);
      else if (!inside) {
        // straddling the frame: it belongs to whichever side its centre is on
        const cx = b.x + b.width / 2,
          cy = b.y + b.height / 2;
        if (cx < box.x0 || cx > box.x1 || cy < box.y0 || cy > box.y1) fade.push(el);
      }
    };
    for (const el of svg.children) visit(el, 0);
    for (const el of fade) {
      el.style.opacity = keep;
      if (f > 0.97) el.style.pointerEvents = 'none';
    }
  }

  /* ---------- 2. no unreadably small text ----------
     Text that would draw under about 8px on screen fades out; it returns as you zoom in. */
  function hideTinyText() {
    if (!svg) return;
    const z = S.z;
    for (const t of svg.querySelectorAll('text:not([data-r20]):not(.r20-tile)')) {
      const fs = parseFloat(t.getAttribute('font-size'));
      if (!fs) continue;
      // a count line never lists a zero ("0 cases · 0 concepts · 22 notes" reads as "22 notes")
      if (!t.children.length && /(^|· )0 [a-z]+/.test(t.textContent)) {
        const kept = t.textContent.split(' · ').filter((part) => !/^0 [a-z]+$/.test(part.trim()));
        t.textContent = kept.join(' · ');
      }
      const px = fs * z;
      if (px >= 8) continue;
      const o = Math.max(0, (px - 7.2) / 0.8),
        had = t.style.opacity === '' ? 1 : parseFloat(t.style.opacity);
      t.style.opacity = String(Math.min(had, o));
    }
  }
  /* ---------- 2b. subject tiles at course zoom: one size, centred ----------
     While a subject is only a tile (no subtopics shown inside it yet) its name is drawn here: centred both
     ways, the same size in every tile on screen, the full name if it fits and the short name if not. The
     renderer drew these top-left beside a number badge, at sizes that varied tile to tile. */
  function wrapPlain(text, maxW, fs, weight) {
    const out = [];
    let line = '';
    for (const w of String(text).split(/\s+/).filter(Boolean)) {
      const cand = line ? line + ' ' + w : w;
      if (line && measure(cand, fs, weight) > maxW) {
        out.push(line);
        line = w;
      } else line = cand;
      if (measure(line, fs, weight) > maxW) return null;
    }
    if (line) out.push(line);
    return out;
  }
  function tileLabels() {
    if (!svg || typeof R11 === 'undefined' || !R11.modes) return;
    const z = S.z,
      M = mapData(),
      tiles = [];
    for (const g of svg.querySelectorAll('g.map-region')) {
      const path = g.querySelector('path[data-map-region]');
      if (!path) continue;
      const id = path.getAttribute('data-map-region'),
        r = regionFor(id);
      if (!r) continue;
      const mode = R11.modes.get(id),
        pw = r.w * z,
        ph = r.h * z;
      if (pw < 30 || ph < 14) continue;
      // a block in the in-between mode is treated as a tile while it is still too small to show anything else
      if (mode !== 'star' && !(mode === 'mid' && pw < 130)) continue;
      tiles.push({ g, id, r, pw, ph });
    }
    if (!tiles.length) return;
    const names = (t) => {
      const full = shortRegionTitle(t.r),
        short = ((typeof SHORT_NAMES !== 'undefined' && SHORT_NAMES[t.id]) || '').replace(/­/g, '');
      return short && short !== full ? [full, short] : [full];
    };
    // v3.2: on a course view (tiles from 130 px wide) each subject of the course also says what is inside
    // it, its cases and rules as a readout under its name; its name is fitted in the room that leaves.
    const cfs = 10.5 / z,
      part = (n, one) => (n ? n + ' ' + one + (n === 1 ? '' : 's') : '');
    for (const t of tiles) {
      t.line = '';
      if (t.pw < 130 || !t.r.step || regionCourse(t.r) !== S.scope || typeof cardCounts !== 'function')
        continue;
      const c = cardCounts('r:' + t.id),
        line =
          [part(c.cases, 'case'), part(c.rules, 'rule')].filter(Boolean).join(' · ') ||
          part(c.concepts, 'concept');
      if (line && t.ph >= 44 && textWidth(line, cfs, 700, V32_MONO) <= t.r.w - 16 / z) t.line = line;
    }
    const fit = (t, px) => {
      const fs = px / z,
        // v3.2: a tile from 70 to 90 px wide keeps 4 px a side (it kept 7, which set the longest names at 8.5 px)
        maxW = (t.pw - (t.pw < 70 ? 6 : t.pw < 90 ? 8 : 14)) / z,
        maxLines = Math.max(1, Math.min(3, Math.floor((t.ph - 8 - (t.line ? 20 : 0)) / (px * 1.22))));
      for (const name of names(t)) {
        const rows = wrapPlain(name, maxW, fs, 600);
        if (rows && rows.length <= maxLines) return rows;
      }
      return null;
    };
    let px = 15;
    const smallest = Math.min(...tiles.map((t) => t.pw));
    px = Math.min(15, Math.max(9.5, smallest * 0.1));
    for (; px >= 9.5; px -= 0.5) if (tiles.every((t) => fit(t, px))) break;
    px = Math.max(9.5, px);
    const parts = [];
    for (const t of tiles) {
      let size = px,
        rows = fit(t, size);
      while (!rows && size > 5.5) {
        size -= 0.5;
        rows = fit(t, size);
      }
      if (!rows) continue;
      t.rows = rows;
      t.size = size;
    }
    const shown = tiles.filter((t) => t.rows);
    for (const t of shown) {
      const rows = t.rows,
        fs = t.size / z,
        lh = fs * 1.22,
        counted = !!t.line,
        up = counted ? 9 / z : 0,
        cx = t.r.x + t.r.w / 2,
        y0 = t.r.y + t.r.h / 2 - ((rows.length - 1) * lh) / 2 + fs * 0.35 - up;
      for (const old of svg.querySelectorAll('text.region-title[data-map-region="' + t.id + '"]'))
        old.remove();
      for (const badge of t.g.querySelectorAll(':scope > g')) badge.remove();
      parts.push(
        `<text class="map-label region-title r20-tile${t.pw >= 130 ? ' is-course' : ''}" x="${cx}" y="${y0}" font-size="${fs}" font-weight="600" fill="#f7f5f0" text-anchor="middle" opacity="${t.g.getAttribute('opacity') || 1}" data-map-region="${esc(t.id)}" role="button" tabindex="0" style="cursor:pointer">${rows.map((row, i) => `<tspan x="${cx}" dy="${i ? lh : 0}">${esc(row)}</tspan>`).join('')}</text>`,
      );
      if (counted)
        parts.push(
          `<text class="v32-mono v32-faint" x="${cx}" y="${y0 + (rows.length - 1) * lh + 19 / z}" font-size="${cfs}" text-anchor="middle" opacity="${t.g.getAttribute('opacity') || 1}">${esc(t.line)}</text>`,
        );
    }
    if (parts.length) svg.insertAdjacentHTML('beforeend', parts.join(''));
  }

  // run after every other layer has painted (the r18 hook runs last; the tiles are painted in it)
  // Every label with a width limit (data-fit, in map units) is measured as actually drawn, in the font
  // actually loaded, and set smaller if it runs past its card. Width estimates made before drawing can
  // fall short, and letters are never stretched to fit (owner, 12 November 2026). Reads first, then
  // writes, so the browser lays the page out once.
  function fitDrawn() {
    const canvas = document.getElementById('geoCanvas');
    if (!canvas) return;
    const fix = [];
    for (const el of canvas.querySelectorAll('[data-fit]')) {
      const room = parseFloat(el.getAttribute('data-fit'));
      if (!(room > 0)) continue;
      let len = 0;
      try {
        len = el.getComputedTextLength();
      } catch {
        continue;
      }
      if (len > room * 1.005) {
        const size = parseFloat(el.getAttribute('font-size') || getComputedStyle(el).fontSize);
        if (size > 0) fix.push([el, (size * room) / len]);
      }
    }
    for (const [el, size] of fix) el.setAttribute('font-size', size);
    // A line made too small to read by fitting is not drawn (the same 8 px rule as hideTinyText); it
    // returns as you zoom in.
    for (const el of canvas.querySelectorAll('[data-fit]')) {
      const size = parseFloat(el.getAttribute('font-size') || getComputedStyle(el).fontSize);
      el.style.visibility = size > 0 && size * S.z < 7.4 ? 'hidden' : '';
    }
  }
  const tidy = () => {
    try {
      tileLabels();
      fadeOthers();
      hideTinyText();
      fitDrawn();
    } catch (e) {
      console.error('DKLA r20 map', e);
    }
  };
  if (window.R18 && Array.isArray(R18.afterDraw)) R18.afterDraw.push(tidy);
  else if (typeof draw === 'function') {
    const draw0 = draw;
    draw = function () {
      const v = draw0.apply(this, arguments);
      tidy();
      return v;
    };
  }

  /* ---------- 3. a course sits in the middle of the screen ----------
     The two small buttons at the top left reserved a whole column, pushing each course to the right. */
  const wideScreen = () => {
    const v = rect();
    return v.w >= 600 && v.w / Math.max(1, v.h) >= 1.25;
  };
  if (typeof safeArea === 'function') {
    const safe0 = safeArea;
    safeArea = function () {
      let a = safe0.apply(this, arguments);
      const v = rect();
      if (a.x > 36 && v.w >= 760) {
        // the same reading of the note that the base safeArea used (v3.2: one reading per draw)
        const b = welcomeBox();
        if (b && b.height && b.height <= 190)
          a = { x: 35, y: a.y, w: Math.max(230, a.w + (a.x - 35)), h: a.h };
      }
      // On a wide, short window the map is limited by height. The breadcrumb and the zoom box sit in the
      // corners, clear of a centred course or subject, so the map may use the rows they are in.
      if (
        wideScreen() &&
        !S.region &&
        !S.district &&
        !(typeof selected !== 'undefined' && selected) &&
        a.y <= 80
      ) {
        const top = 58,
          cut = a.y - top;
        // v3.2: on a course view the foot of the map is a band of controls (the zoom buttons, the hint and
        // the strip of sessions). The course, with its supporting-cases control, stops above that band, so
        // nothing on the map lies under a control. Home keeps the rows it had (v25/home-fit.js frames it).
        const band = S.scope === 'Atlas' ? -34 : Math.max(0, (window.DKLASessions?.band?.() || 0) + 8 - 70);
        a = { x: a.x, y: top, w: a.w, h: a.h + cut - band };
      }
      return a;
    };
  }

  /* A subject opened from the map was capped at 95% zoom, which on a large window left it small in the
     middle of the screen. It may now grow to fill the window. */
  if (typeof fitBox === 'function') {
    const fit0 = fitBox;
    fitBox = function (b, animate, pad, maxZoom) {
      return fit0.call(this, b, animate, pad, maxZoom === 0.95 ? 1.7 : maxZoom);
    };
  }

  if (typeof R18 !== 'undefined' && R18.subjectPad) {
    const pad0 = R18.subjectPad;
    R18.subjectPad = function () {
      return wideScreen() ? 10 : pad0.apply(this, arguments);
    };
  }

  /* ---------- 3b. the three courses sit side by side on a wide window ----------
     The atlas was laid out as a triangle (Contracts above, the other two below), which is about square and
     left half of a wide window empty. On a wide window the courses now stand in a row. Each course is moved
     as a whole (subjects, subtopics, cards, zones), so nothing inside a course changes. A tall or narrow
     window keeps the triangle. Positions are set from fixed targets, so applying this twice changes nothing. */
  const LRS = 'Legislation and the Regulatory State';
  const ARR = {
    tall: {
      'Contracts': [-7370, -13364],
      'Civil Procedure': [-16440, -360],
      [LRS]: [1500, -360],
      'workbench-region': [-1700, 900],
      'dictionary-region': [-1700, 2700],
    },
    wide: {
      'Contracts': [-7370, 700],
      'Civil Procedure': [-23310, 700],
      [LRS]: [8370, 700],
      // v3.0: Notes stands at the bottom-right of the LRS row, 300 under the right column (20660..23060, bottom 9021),
      // across the row from LRS's "Supporting cases" tile and far from the centre mark's upper-right corner, where
      // the splash text sits. (Right of that tile would collide with it: the tile is drawn wider on smaller windows,
      // out to x 14520 at 1000 x 700.)
      'workbench-region': [20660, 9321],
      'dictionary-region': [15500, 9650],
    },
  };
  /* v3.0 "heliocentric" Home: the three courses form the top band, the DKLA centre mark sits alone in the
     middle, and Rules & authorities and SCOTUS History form the bottom band. MARK is where the centre mark is
     drawn (fixMark below) and LOWER is where SCOTUS History, and with it Rules & authorities, starts. The Home
     fit (here and in v25/home-fit.js, which also keeps the course names in frame) reads the mark through
     window.DKLAMapMark. Nothing here is saved in the graph, so saved copies get it too. */
  // The drawn letters fill only y+471 .. y+3597 of the mark's 4300-unit box. On a wide window they are centred
  // between the bottom of Contracts' "Supporting cases" tile (10332) and LOWER.wide, about 870 units clear on each
  // side, and the whole box (y + h = 15030) stays above the lower band. LOWER.wide cannot go much lower: 1366 x 768
  // fits Home by its height, and from about 15400 its tile text drops below the recorded sizes.
  const MARK = {
      wide: { x: -3100, y: 10730, w: 6200, h: 4300 },
      tall: { x: -3100, y: 10300, w: 6200, h: 4300 },
    },
    LOWER = { wide: 15200, tall: 15400 };
  // Home prototypes (v25/home-variants.js): no mark on the map, and their own targets and lower blocks.
  const V = window.DKLAHomeVariant?.active ? window.DKLAHomeVariant : null;
  if (V) for (const mode of ['wide', 'tall']) ARR[mode] = V.targets(mode);
  window.DKLAMapMark = {
    box: (mode = arranged || (wideScreen() ? 'wide' : 'tall')) => (V ? null : { ...MARK[mode] }),
  };
  let arranged = null;
  function arrange(mode) {
    const M = mapData(),
      T = ARR[mode];
    let moved = false;
    const shift = (regionIds, dx, dy) => {
      const ids = new Set(regionIds);
      for (const r of M.regions)
        if (ids.has(r.id)) {
          r.x += dx;
          r.y += dy;
        }
      for (const d of Object.values(M.districts))
        if (ids.has(d.region)) {
          d.x += dx;
          d.y += dy;
          if (typeof d.supportStart === 'number') d.supportStart += dy;
        }
      for (const h of Object.values(M.homes))
        if (ids.has(h.region)) {
          h.x += dx;
          h.y += dy;
        }
    };
    for (const [course, block] of Object.entries(M.courseBlocks || {})) {
      const t = T[course];
      if (!t) continue;
      const dx = t[0] - block.x,
        dy = t[1] - block.y;
      if (!dx && !dy) continue;
      shift(
        M.regions.filter((r) => regionCourse(r) === course).map((r) => r.id),
        dx,
        dy,
      );
      block.x += dx;
      block.y += dy;
      const design = (M.courseDesign || {})[course] || {};
      for (const zn of design.zones || []) {
        zn.x += dx;
        zn.y += dy;
      }
      for (const lb of design.labels || []) {
        lb.x += dx;
        lb.y += dy;
      }
      moved = true;
    }
    // SCOTUS History stands clear below the courses and their supporting-cases tiles
    if (window.DKLAScotusBox) {
      const p = V
        ? mode === 'wide'
          ? V.scotus() || {}
          : { x: -11400, y: V.tallLower, h: 4200 }
        : mode === 'wide'
          ? { x: 200, y: LOWER.wide }
          : { x: -11400, y: LOWER.tall, h: 4200 };
      for (const [key, value] of Object.entries(p))
        if (window.DKLAScotusBox[key] !== value) {
          window.DKLAScotusBox[key] = value;
          moved = true;
        }
    }
    for (const id of ['workbench-region', 'dictionary-region']) {
      const r = M.regions.find((x) => x.id === id),
        t = T[id];
      if (!r || !t) continue;
      const dx = t[0] - r.x,
        dy = t[1] - r.y;
      if (dx || dy) {
        shift([id], dx, dy);
        moved = true;
      }
    }
    // each course's supporting-cases tile sits close under its bottom-left corner
    if (D && D.tiles)
      for (const [course, block] of Object.entries(M.courseBlocks || {})) {
        const t = D.tiles[course];
        if (!t) continue;
        const pill = V && V.pill(mode, course);
        if (pill) {
          Object.assign(t, pill);
          continue;
        }
        const zones = ((M.courseDesign || {})[course] || {}).zones || [];
        const bottom = Math.max(block.y + block.h, ...zones.map((zn) => zn.y + zn.h)),
          left = Math.min(block.x, ...zones.map((zn) => zn.x));
        t.w = 4300;
        t.h = 620;
        t.x = left;
        t.y = bottom + 120;
      }
    if (typeof R11 !== 'undefined') {
      R11.galaxyKey = null;
      R11.galaxy = null;
    }
    arranged = mode;
    return moved;
  }
  function applyArrangement(refit) {
    if (typeof mapData !== 'function' || !mapData() || !mapData().courseBlocks) return;
    const mode = wideScreen() ? 'wide' : 'tall';
    if (mode === arranged) return;
    const moved = arrange(mode);
    if (moved || refit) {
      try {
        if (S.scope === 'Atlas' || !S.region) home(S.scope, false, false);
        else if (window.R18 && R18.refit) R18.refit();
      } catch {
        /* next draw */
      }
    }
    try {
      schedule();
    } catch {
      /* next frame */
    }
  }
  // r20.11: these wrappers are installed before the first fit below. The atlas is usually ready by the time
  // this script runs, so whenReady fits the camera at once; a wrapper installed after it missed that first fit
  // (the centre mark was cut off on every fresh load until the view was refitted).
  // On a wide window a course is fitted to its subjects and tile; its name sits in the top margin above them
  // (it is centred, the breadcrumb is in the corner), so the name no longer costs the map a sixth of its height.
  if (typeof scopeBox === 'function') {
    const box0 = scopeBox;
    scopeBox = function () {
      const b = box0.apply(this, arguments);
      try {
        // r20.10: the three-course view also holds the whole centre mark (drawn by fixMark below). v3.0: the
        // mark sits between the courses and the lower band.
        if (S.scope === 'Atlas') return V ? b : bounds([b, window.DKLAMapMark.box()]);
        if (arranged !== 'wide') return b;
        const M = mapData(),
          block = (M.courseBlocks || {})[S.scope];
        if (!block) return b;
        const zones = ((M.courseDesign || {})[S.scope] || {}).zones || [],
          tile = D && D.tiles && D.tiles[S.scope];
        const fitted = bounds([block, ...zones, ...(tile ? [tile] : [])]);
        // v3.2: a course name on two rows ("Legislation and the / Regulatory State") needs the second row's
        // height above the subjects, or its first row is drawn under the top bar.
        const extra = R18.courseTitleRows(S.scope).length - 1;
        if (extra > 0) {
          const a = safeArea(),
            zf = Math.min((a.w - 40) / fitted.w, (a.h - 40) / fitted.h, 0.7),
            up = (extra * 1.23 * R18.courseTitlePx(zf)) / zf;
          fitted.y -= up;
          fitted.h += up;
        }
        return fitted;
      } catch {
        return b;
      }
    };
  }
  (function whenReady() {
    if (!window.LegalAtlas?.ready || typeof nodesById === 'undefined') {
      setTimeout(whenReady, 100);
      return;
    }
    applyArrangement(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => document.documentElement.classList.add('r20-ready')),
    );
  })();
  setTimeout(() => document.documentElement.classList.add('r20-ready'), 6000); // the curtain never stays down
  let arrangeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(arrangeTimer);
    arrangeTimer = setTimeout(() => applyArrangement(false), 260);
  });

  /* ---------- 4. no repeated source chips ---------- */
  const panel = document.getElementById('inspector');
  function tidyChips() {
    const row = panel && panel.querySelector('.dkla-file-chips');
    if (!row) return;
    const seen = new Map();
    for (const chip of [...row.querySelectorAll('button[data-dkla-file]')]) {
      const file = chip.dataset.dklaFile,
        m = file.match(/^(.*?)#page=(\d+)$/),
        base = m ? m[1] : file,
        page = m ? m[2] : '';
      if (seen.has(file)) {
        chip.remove();
        continue;
      }
      seen.set(file, chip);
      const twins = [...seen.entries()].filter(
        ([f, c]) => c !== chip && (f.match(/^(.*?)#page=/) || [0, f])[1] === base,
      );
      if (twins.length && page && !chip.dataset.r20Paged) {
        for (const [f, c] of twins.concat([[file, chip]])) {
          const p = (f.match(/#page=(\d+)$/) || [])[1];
          if (p && !c.dataset.r20Paged && !/\bp\. ?\d/.test(c.textContent)) {
            c.dataset.r20Paged = '1';
            c.textContent = c.textContent.replace(/\s*↗\s*$/, '') + ' p. ' + p + ' ↗';
          }
        }
      }
    }
  }
  if (panel) new MutationObserver(tidyChips).observe(panel, { childList: true, subtree: true });

  /* ---------- 5. dictionary <-> supporting cases ----------
     Cases on the map are linked inside the dictionary block itself (tools/r19/terms.py). Supporting cases are
     not map entries, so the dictionary lists them here, and each supporting brief lists its terms. */
  const TL = D && D.terms;
  if (TL) {
    const title = new Map(D.entries.map((e) => [e[0], e[1]])),
      course = new Map(D.entries.map((e) => [e[0], e[2]]));
    const bySlug = new Map();
    for (const [cid, slugs] of Object.entries(TL.supporting))
      for (const s of slugs) {
        if (!bySlug.has(s)) bySlug.set(s, []);
        bySlug.get(s).push(cid);
      }
    for (const list of bySlug.values())
      list.sort((a, b) => String(title.get(a)).localeCompare(String(title.get(b))));
    const nodeOf = new Map(Object.entries(D.map || {}).map(([nid, cid]) => [cid, nid]));
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r20-node]');
      if (!b) return;
      const dlg = document.getElementById('glossaryDialog');
      try {
        dlg && dlg.close && dlg.close();
      } catch {
        /* not a dialog */
      }
      try {
        goNode(b.dataset.r20Node, true);
      } catch {
        /* entry gone */
      }
    });
    // Term names from the dictionary module (src/runtime/dklaR12Glossary.js), which reads the dklaGlossary
    // block. In the hosted page that block can arrive after this runs: until it does, slugs are shown and
    // nothing is remembered; when it arrives ('dkla:glossary') the open brief's term list is redrawn.
    let names = null;
    const termName = (slug) => {
      if (!names) {
        const terms = window.DKLA?.glossaryTerms?.() || [];
        if (terms.length) {
          names = new Map();
          for (const t of terms) names.set(t.slug, t.term);
        } else if (window.DKLA?.glossaryLoaded?.() === false) window.DKLA.whenGlossary().catch(() => {});
      }
      return names?.get(slug) || slug.replace(/_/g, ' ');
    };
    const COURSES = ['Contracts', 'Civil Procedure', 'Legislation'];
    const gloss = () => document.getElementById('glossaryDialog');
    function paintGlossary() {
      const dlg = gloss(),
        det = dlg && dlg.querySelector('.gl-detail');
      if (!det) return;
      const h2 = det.querySelector('h2'),
        old = det.querySelector('.r20-sup');
      termName('');
      let slug = null;
      if (h2) {
        const shown = (
          h2.firstChild && h2.firstChild.nodeType === 3 ? h2.firstChild.textContent : h2.textContent
        ).trim();
        for (const [k, v] of names || [])
          if (v === shown) {
            slug = k;
            break;
          }
      }
      if (!slug) {
        old && old.remove();
        return;
      }
      if (old && old.dataset.slug === slug) return;
      old && old.remove();
      // every brief that uses the term, map cases and supporting cases together, most use first
      const full = TL.index && TL.index[slug],
        ids = full ? full[1] : bySlug.get(slug) || [],
        total = full ? full[0] : ids.length;
      const box = document.createElement('div');
      box.className = 'gl-group r20-sup';
      box.dataset.slug = slug;
      if (!ids.length) {
        box.innerHTML =
          '<h3>Cases that use this term <span class="gl-count">0</span></h3><p class="gl-empty">No brief in the atlas uses this term.</p>';
        det.appendChild(box);
        return;
      }
      const many = ids.length > 24;
      const btn = (id, i) => {
        const nid = nodeOf.get(id),
          hide = many && i >= 24 ? ' hidden' : '';
        return nid && typeof nodesById !== 'undefined' && nodesById.has(nid)
          ? `<button type="button" class="r20-on-map" data-r20-node="${esc(nid)}"${hide}>${esc(title.get(id))}<small> ${esc(COURSES[course.get(id)] || '')} · on the map</small></button>`
          : `<button type="button" data-r19-open="${esc(id)}"${hide}>${esc(title.get(id))}<small> ${esc(COURSES[course.get(id)] || '')}</small></button>`;
      };
      box.innerHTML = `<h3>Cases that use this term <span class="gl-count">${total}</span></h3>${total > ids.length ? `<p class="gl-empty">${total} briefs use it. These are the ${ids.length} that use it most.</p>` : ''}<div class="gl-used">${ids.map(btn).join('')}</div>${many ? `<button class="gl-showall" type="button" data-r20-all>Show all ${ids.length}</button>` : ''}`;
      det.appendChild(box);
    }
    const hook = () => {
      const dlg = gloss();
      if (!dlg || dlg.dataset.r20) return !!dlg;
      dlg.dataset.r20 = '1';
      new MutationObserver(paintGlossary).observe(dlg, { childList: true, subtree: true });
      paintGlossary();
      return true;
    };
    if (!hook()) {
      const t = setInterval(() => {
        if (hook()) clearInterval(t);
      }, 400);
    }
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r20-all]');
      if (!b) return;
      for (const x of b.parentNode.querySelectorAll('.gl-used [hidden]')) x.hidden = false;
      b.remove();
    });
    // the supporting brief lists its terms
    const sup = document.getElementById('r19Dialog');
    function paintBrief() {
      if (!sup) return;
      const fill = sup.querySelector('[data-r19-fill]'),
        cid = fill && fill.dataset.r19Fill,
        old = sup.querySelector('.r20-terms');
      const slugs = cid && TL.supporting[cid];
      if (!slugs || !slugs.length) {
        old && old.remove();
        return;
      }
      if (old && old.dataset.cid === cid) return;
      old && old.remove();
      const line = sup.querySelector('.r19-line');
      if (!line) return;
      const box = document.createElement('div');
      box.className = 'r20-terms dkla-term-chips';
      box.dataset.cid = cid;
      box.innerHTML =
        `<span>Terms in this brief</span>` +
        slugs
          .map((s) => `<button type="button" data-dkla-term="${esc(s)}">${esc(termName(s))}</button>`)
          .join('');
      line.after(box);
    }
    if (sup) new MutationObserver(paintBrief).observe(sup, { childList: true, subtree: true });
    document.addEventListener('dkla:glossary', () => {
      names = null;
      sup?.querySelector('.r20-terms')?.remove();
      paintBrief();
      paintGlossary();
    });
  }
  try {
    schedule();
  } catch {
    /* next frame */
  }
})();

/* ===== r20.3: a first-visit note, the guided walkthrough in the More menu, and room in the centre mark ===== */
(function () {
  'use strict';
  const KEY = 'dkla.guide.v1',
    PAGE = 'how-to-use.html';
  const seen = () => {
    try {
      return localStorage.getItem(KEY) === 'seen';
    } catch {
      return true;
    }
  };
  const markSeen = () => {
    try {
      localStorage.setItem(KEY, 'seen');
    } catch {
      /* storage unavailable */
    }
  };

  /* The note sits over the map on the three-course view the first time the atlas opens. It goes once either
     button is pressed (or Esc), and is not shown when the atlas was opened at a term, file or page route. */
  function showNote() {
    if (seen() || location.hash || document.getElementById('r20Guide')) return;
    const host = document.getElementById('studyMain') || document.body;
    const box = document.createElement('section');
    box.id = 'r20Guide';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-labelledby', 'r20GuideH');
    box.innerHTML =
      '<h2 id="r20GuideH">New here? There is a short guide.</h2>' +
      '<div class="r20-guide-actions"><a class="r20-guide-go" href="' +
      PAGE +
      '">Open the guide</a><button type="button" data-r20-guide-close>Not now</button></div>';
    host.appendChild(box);
    const close = () => {
      markSeen();
      box.remove();
      document.removeEventListener('keydown', onKey, true);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    box.querySelector('[data-r20-guide-close]').addEventListener('click', close);
    box.querySelector('.r20-guide-go').addEventListener('click', markSeen);
    document.addEventListener('keydown', onKey, true);
  }
  setTimeout(showNote, 900);

  /* More menu: the walkthrough sits beside the existing "How to use this map" dialog. */
  if (typeof moreMenu === 'function') {
    const prior = moreMenu;
    moreMenu = function (...a) {
      const out = prior.apply(this, a),
        menu = document.getElementById('moreMenu');
      if (menu && !menu.hidden && !menu.querySelector('[data-r20-guide]')) {
        const help = [...menu.querySelectorAll('button')].find((b) => b.dataset.action === 'help');
        const b = document.createElement('button');
        b.setAttribute('role', 'menuitem');
        b.dataset.r20Guide = '1';
        b.textContent = 'Guided walkthrough';
        (help || menu.lastElementChild).after(b);
      }
      return out;
    };
    const more = document.getElementById('moreBtn');
    if (more) more.onclick = () => moreMenu();
    document.addEventListener(
      'click',
      (e) => {
        if (e.target.closest('[data-r20-guide]')) {
          markSeen();
          location.href = PAGE;
        }
      },
      true,
    );
  }

  /* The mark: the A is rotated a quarter turn counter-clockwise and inscribed in the D. Its apex points at
     the K's vertex, its legs open to the right inside the K's arms, its feet stand on the inside of the bowl,
     and its crossbar is vertical at six-tenths of the way from apex to feet. The same letterforms go into the
     header mark; the map mark is drawn larger on the three-course view. r17 redraws the map mark on every
     draw, so this runs after each. */
  // r20.10: the L has its own stem, an orange sliver over the lower part of the D's bar, so it reads as an L.
  // r21 hotfix 2: the coloured strokes are circumscribed by the D. The K and the A are clipped to the D's
  // centreline and the D is drawn last, open on its left side, so every arm ends flush with the D's inner edge;
  // the K's lower arm ends under the L's foot, which sits inside the D; the L's stem is the D's left side.
  // v22.1: the L's foot runs on to the D's bowl, past the point where the K's lower leg meets the D. It is clipped
  // by L_CLIP (everything left of the bowl's start, plus the inside of the bowl), so its end follows the curve and
  // sits flush with the D's inner edge; the stem keeps its full width along the D's left side.
  // v22.1 hotfix: the D's top bar starts at the stem's right edge (x 25.75), so at the top-left corner the orange
  // stem shows over the white instead of under it. The bottom-left join is unchanged.
  const K = 'M25.5 52 62 11.4M25.5 52 52.5 81.1',
    L = 'M22.5 13.5V86.5M22.5 81H84',
    A = 'M92 22.6 36 52 92 81.4M60 42.5V61.5';
  const D_OPEN = 'M25.75 13H44C71 13 86 29 86 50S71 87 44 87H22',
    D_CLOSED = 'M22 13H44C71 13 86 29 86 50S71 87 44 87H22V13Z';
  const L_CLIP = 'M0 0H44V13C71 13 86 29 86 50S71 87 44 87V100H0Z';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function shapeMark(svg, clipId) {
    const d = svg.querySelector('.dkla-letter-d'),
      k = svg.querySelector('.dkla-letter-k'),
      l = svg.querySelector('.dkla-letter-l'),
      a = svg.querySelector('.dkla-letter-a');
    if (!(d && k && l && a) || d.dataset.r21Shaped) return;
    d.dataset.r21Shaped = '1'; // the map observer watches childList: shape each set of letters once
    let clip = svg.querySelector('#' + clipId);
    if (!clip) {
      const defs = document.createElementNS(SVG_NS, 'defs');
      clip = document.createElementNS(SVG_NS, 'clipPath');
      clip.id = clipId;
      const cp = document.createElementNS(SVG_NS, 'path');
      cp.setAttribute('d', D_CLOSED);
      clip.appendChild(cp);
      defs.appendChild(clip);
      svg.insertBefore(defs, svg.firstChild);
    }
    if (!svg.querySelector('#' + clipId + 'L')) {
      const lc = document.createElementNS(SVG_NS, 'clipPath');
      lc.id = clipId + 'L';
      const lp = document.createElementNS(SVG_NS, 'path');
      lp.setAttribute('d', L_CLIP);
      lc.appendChild(lp);
      clip.parentNode.appendChild(lc);
    }
    k.setAttribute('d', K);
    l.setAttribute('d', L);
    a.setAttribute('d', A);
    d.setAttribute('d', D_OPEN);
    for (const el of [k, a]) {
      el.setAttribute('clip-path', `url(#${clipId})`);
      el.style.strokeLinecap = 'butt';
    }
    d.style.strokeLinecap = 'butt';
    l.style.strokeLinecap = 'square';
    l.setAttribute('clip-path', `url(#${clipId}L)`);
    svg.append(a, k, l, d);
  }
  function fixHeader() {
    const h = document.querySelector('#atlasHome .dkla-header-monogram');
    if (!h) return false;
    shapeMark(h, 'dklaDclipHeader');
    const home = document.getElementById('atlasHome');
    if (!home.querySelector('.dkla-release')) {
      const release = document.createElement('span');
      release.className = 'dkla-release';
      const version = window.DKLABriefs.data.version;
      release.textContent = version;
      // v2.7 hotfix: a horizontal stroke through each 7, drawn by CSS on a span so the text
      // and the accessible name stay exactly "v2.7".
      release.replaceChildren(
        ...version
          .split(/(7)/)
          .filter(Boolean)
          .map((part) => {
            if (part !== '7') return document.createTextNode(part);
            const seven = document.createElement('span');
            seven.className = 'dkla-crossed-seven';
            seven.textContent = part;
            return seven;
          }),
      );
      // The bright band that crosses the label (hud-font.css): two empty spans, lettered by CSS from
      // data-label, so the label's text stays exactly the version.
      const shine = document.createElement('span');
      shine.className = 'dkla-release-shine';
      shine.setAttribute('aria-hidden', 'true');
      shine.innerHTML = '<span class="dkla-release-window"><span class="dkla-release-copy"></span></span>';
      shine.querySelector('.dkla-release-copy').dataset.label = version;
      release.appendChild(shine);
      home.appendChild(release);
      home.setAttribute('aria-label', `DKLA ${version} — Danny Kind Legal Atlas. Open the atlas.`);
    }
    return true;
  }
  (function headerSoon(n) {
    if (!fixHeader() && n < 100) setTimeout(() => headerSoon(n + 1), 100);
  })(0);
  /* Nothing from the first half-second of boot is shown: the Contracts welcome block (the atlas's HTML starts
     with it visible, in Contracts scope, and the floor fit hides it only once the camera lands), r16's wordmark
     and r17's mark before this painter has reshaped it. r20.css keeps them invisible until `r20-settled` is on
     the body and the mark carries `data-r20`. */
  const settle = () => document.body.classList.add('r20-settled');
  setTimeout(settle, 3000);
  function fixMark() {
    const mark = document.querySelector('#geoCanvas .dkla-map-monogram');
    if (!mark) return;
    // v3.0: the mark is the calm centre of Home, between the courses and the lower band (see DKLAMapMark).
    // Home prototypes have no mark on the map: it is hidden, with the analytics link round it.
    if (window.DKLAHomeVariant?.active) {
      const hide = mark.closest('a[data-dkla-analytics]') || mark;
      if (hide.getAttribute('display') !== 'none') hide.setAttribute('display', 'none');
      mark.dataset.r20 = '1';
      return;
    }
    const m = window.DKLAMapMark?.box() || { x: -3100, y: -5300, w: 6200, h: 4300 };
    for (const [name, value] of [
      ['x', m.x],
      ['y', m.y],
      ['width', m.w],
      ['height', m.h],
    ])
      if (mark.getAttribute(name) !== String(value)) mark.setAttribute(name, String(value));
    shapeMark(mark, 'dklaDclipMap');
    mark.dataset.r20 = '1';
  }
  if (window.R18 && Array.isArray(R18.afterDraw))
    R18.afterDraw.push(() => {
      if (typeof S === 'object' && S && S.scope !== 'Contracts') settle();
      fixMark();
    });
  // r17's wrapper installs on its own timer and can end up outside r18's, redrawing the old letterforms after
  // this painter; the observer's callback runs after both, before the frame is painted.
  const canvas = document.getElementById('geoCanvas');
  if (canvas) new MutationObserver(fixMark).observe(canvas, { childList: true, subtree: true });
})();
