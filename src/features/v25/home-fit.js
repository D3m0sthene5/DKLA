/* Approved native Home B: shared framing, existing lower sections side by
   side, and readable native court-seat labels. Courses keep their geometry. */
(() => {
  'use strict';
  const neutral = () => S.scope === 'Atlas' && !S.region && !S.district && !selected && !S.panelOpen;
  const wide = () => {
    const v = rect();
    return v.w >= 600 && v.w / Math.max(1, v.h) >= 1.25;
  };
  const compact = () => neutral() && wide() && rect().h < 480;
  const fullLabels = () => neutral() && wide() && !compact();
  // v3.0: on Home, Civil Procedure is named "Civ Pro" and LRS by its initials.
  // Display only: course keys, data, links and saved graphs keep the full names.
  const shortNames = { 'Legislation and the Regulatory State': 'LRS', 'Civil Procedure': 'Civ Pro' };
  const state = (window.DKLAHomeFit = { ready: false, refresh, wide, compact, fullLabels, shortNames });
  let gestureUntil = 0,
    resizeTimer;
  function refresh() {
    if (state.ready && neutral()) home('Atlas', false, false);
  }
  function seats() {
    if (!neutral() || !wide()) return;
    const b = window.DKLAScotusBox;
    if (!b) return;
    const height = (b.h - 1730 - 330 - 190) / 2;
    document.querySelectorAll('#geoCanvas [data-sh-seat]').forEach((seat, index) => {
      const row = Math.floor(index / 6),
        r = seat.querySelector('rect');
      if (!r) return;
      const oldY = Number(r.getAttribute('y')),
        oldH = Number(r.getAttribute('height')),
        y = b.y + 1730 + row * (height + 190),
        dy = y - oldY + (height - oldH) * 0.56;
      r.setAttribute('y', y);
      r.setAttribute('height', height);
      for (const text of seat.querySelectorAll('text')) text.setAttribute('transform', `translate(0 ${dy})`);
    });
  }
  // v3.0: the course names are the top of Home. Nothing that hangs over the
  // map's top edge may cover one: the Atlas breadcrumb (the label engine would
  // hide the name) and Dottie, who hangs from the Ask Dottie button. Boxes are
  // layout boxes in map pixels, so Dottie's swing while hovered (a rotation)
  // never moves the map.
  function covers() {
    const canvas = document.getElementById('geoCanvas');
    if (!canvas) return [];
    const c = canvas.getBoundingClientRect(),
      list = [];
    for (const el of [
      document.querySelector('.map-nav'),
      document.getElementById('mapWelcome'),
      document.querySelector('.study-header .ask-bar-dottie'),
    ]) {
      if (!el || el.hidden || !el.getClientRects().length) continue;
      const p = el.offsetParent,
        b = p ? p.getBoundingClientRect() : null,
        r = b
          ? { left: b.left + p.clientLeft + el.offsetLeft, top: b.top + p.clientTop + el.offsetTop }
          : el.getBoundingClientRect(),
        w = p ? el.offsetWidth : r.width,
        h = p ? el.offsetHeight : r.height;
      // The label engine pads controls by 6 px and labels by 2 px.
      list.push({
        x: Math.round(r.left - c.left - 9),
        right: Math.round(r.left + w - c.left + 9),
        bottom: Math.round(r.top + h - c.top + 9),
      });
    }
    return list;
  }
  // A drawn name's width per unit of font size: the label engine's measure()
  // can differ from the font the name is really drawn in.
  function nameWidths() {
    const out = {};
    for (const label of document.querySelectorAll('#geoCanvas text.course-label')) {
      const size = Number(label.getAttribute('font-size'));
      let width = 0;
      try {
        width = label.getBBox().width;
      } catch {
        /* not rendered */
      }
      if (size > 0 && width > 0)
        out[label.dataset.studyScope + '|' + label.textContent.trim()] = Math.round((width / size) * 20) / 20;
    }
    return out;
  }
  // What covers the top of the map and how wide the names are drawn, read at
  // most four times a second after a draw: galaxy() runs many times per draw
  // and must not read the page each time.
  let coverState = null,
    coverRead = 0,
    roomCache = null,
    fitted = null,
    refits = { size: '', count: 0 };
  function readCovers() {
    const list = covers(),
      drawn = nameWidths();
    coverRead = performance.now();
    return {
      key: [innerWidth, innerHeight, JSON.stringify(list), JSON.stringify(drawn)].join(),
      list,
      drawn,
    };
  }
  // Dottie and the header can settle after Home was first fitted (the Ask
  // Dottie button is added later, fonts change widths). Fit Home again then,
  // but only while the camera is still exactly where that fit left it.
  function settleCovers() {
    if (!state.ready || !neutral() || !wide() || performance.now() - coverRead < 250) return;
    const next = readCovers();
    if (next.key !== coverState?.key) coverState = next;
    if (!fitted || fitted.key === coverState.key || performance.now() < gestureUntil) return;
    if (S.x !== fitted.x || S.y !== fitted.y || S.z !== fitted.z) return;
    // A few refits per window size at most, so a name width that rounds
    // differently at the new zoom can never set off a loop.
    const size = innerWidth + 'x' + innerHeight;
    if (refits.size !== size) refits = { size, count: 0 };
    if (refits.count++ < 3) refresh();
  }
  // How far (in pixels) the course names and the top row of subject tiles
  // would have to come down to clear those covers when `box` is fitted into
  // the safe area `a`.
  function namesCovered(box, a, m, { list, drawn }) {
    if (typeof measure !== 'function') return 0;
    const z = Math.min(a.w / box.w, a.h / box.h),
      fs = R18.courseTitlePx(z) / z;
    let need = 0;
    for (const [course, block] of Object.entries(m.courseBlocks || {})) {
      const zones = m.courseDesign?.[course]?.zones || [],
        rows = R18.courseTitleRows(course),
        w = Math.max(
          ...rows.map((row) =>
            Math.max(measure(row, fs, 600, 'course-label'), (drawn[course + '|' + row] || 0) * fs),
          ),
        ),
        top = Math.min(block.y, ...zones.map((zn) => zn.y)) - fs * (1.75 + 1.23 * (rows.length - 1)),
        x0 = (block.x + block.w / 2 - w / 2 - (box.x + box.w / 2)) * z + a.x + a.w / 2,
        y0 = (top - (box.y + box.h / 2)) * z + a.y + a.h / 2;
      for (const r of list)
        if (x0 < r.right && x0 + w * z > r.x && y0 < r.bottom) need = Math.max(need, r.bottom - y0);
    }
    // The dictionary's region is drawn as a spine inside the authorities frame.
    for (const region of m.regions || []) {
      if (region.id === 'dictionary-region') continue;
      const x0 = (region.x - (box.x + box.w / 2)) * z + a.x + a.w / 2,
        y0 = (region.y - (box.y + box.h / 2)) * z + a.y + a.h / 2;
      for (const r of list)
        if (x0 < r.right && x0 + region.w * z > r.x && y0 < r.bottom) need = Math.max(need, r.bottom - y0);
    }
    return need;
  }
  function install() {
    if (!window.LegalAtlas?.ready || !document.documentElement.classList.contains('geography-locked')) {
      setTimeout(install, 80);
      return;
    }
    const previousGalaxy = galaxy,
      previousBand = morphBand,
      previousSafe = safeArea,
      previousFit = fitBox,
      previousAuto = autoScope,
      previousDraw = draw,
      previousText = textLines,
      previousRows = R18.courseTitleRows;
    // The label engine measures and places the short name, so it is kept clear
    // of the controls at its real width.
    R18.courseTitleRows = function (course) {
      return neutral() && shortNames[course] ? [shortNames[course]] : previousRows.call(this, course);
    };
    textLines = function (rows, x, y, fs, ...rest) {
      if (fullLabels() && ['sh-map-label', 'sh-root-label'].includes(rest[2])) {
        fs = Math.max(fs, (rest[2] === 'sh-map-label' ? 9.5 : 8.5) / S.z);
        if (rest[2] === 'sh-root-label' && rows.join(' ').startsWith('Court membership')) y += 260;
      }
      return previousText.call(this, rows, x, y, fs, ...rest);
    };
    safeArea = function (...args) {
      const a = previousSafe.apply(this, args);
      if (!neutral() || !wide()) return a;
      const v = rect();
      return { x: 14, y: 14, w: Math.max(1, v.w - 28), h: Math.max(1, v.h - 14 - 70) };
    };
    fitBox = function (b, animate, pad, maxZoom) {
      if (!neutral() || !wide()) return previousFit.call(this, b, animate, pad, maxZoom);
      const result = previousFit.call(this, b, animate, 0, maxZoom);
      fitted = animate ? null : { key: (coverState ||= readCovers()).key, x: S.x, y: S.y, z: S.z };
      return result;
    };
    galaxy = function (...args) {
      const g = previousGalaxy.apply(this, args);
      if (!neutral() || !wide()) return g;
      const m = mapData(),
        authority = window.DKLAAuthorities.geography().entrance,
        c = window.DKLAScotusBox,
        tiles = Object.values(window.DKLABriefs.data.tiles || {}),
        mark = window.DKLAMapMark?.box('wide') || { x: -3100, y: -5300, w: 6200, h: 4300 };
      // Fit the actual Home sections, not legacy padding for hidden case cards.
      // Course and case geometry remains intact when the reader zooms closer.
      // v3.0: courses on top, the centre mark in the middle, Rules & authorities
      // and SCOTUS History below. The course names are the top of Home; their
      // size depends on the zoom, so the band they need is found in a few
      // passes, with room added above them until nothing covers a name.
      const core = bounds([
          ...m.regions,
          ...Object.values(m.courseBlocks || {}),
          ...tiles,
          authority,
          c,
          mark,
        ]),
        courseTop = Math.min(
          ...Object.entries(m.courseBlocks || {}).map(([course, block]) =>
            Math.min(block.y, ...(m.courseDesign?.[course]?.zones || []).map((zn) => zn.y)),
          ),
        ),
        a = safeArea();
      const covered = (coverState ||= readCovers()),
        key = [core.x, core.y, core.w, core.h, courseTop, a.x, a.y, a.w, a.h, covered.key].join();
      if (roomCache?.key !== key) {
        let box = core,
          room = 0;
        for (let round = 0; round < 8; round++) {
          box = core;
          for (let pass = 0; pass < 3; pass++) {
            const z = Math.min(a.w / box.w, a.h / box.h),
              top = Math.min(core.y, courseTop - (R18.courseTitlePx(z) / z) * 1.9) - room / z;
            box = { x: core.x, y: top, w: core.w, h: core.y + core.h - top };
          }
          const need = namesCovered(box, a, m, covered);
          if (need < 0.5) break;
          room += need;
        }
        roomCache = { key, box };
      }
      return { ...g, box: { ...roomCache.box } };
    };
    morphBand = function (...args) {
      const b = previousBand.apply(this, args);
      if (!neutral() || !wide()) return b;
      const g = galaxy(),
        a = safeArea(),
        z0 = Math.min(a.w / g.box.w, a.h / g.box.h);
      return { z0, z1: z0 * 1.15 };
    };
    autoScope = function (...args) {
      if (neutral() && performance.now() > gestureUntil) return;
      return previousAuto.apply(this, args);
    };
    draw = function (...args) {
      const result = previousDraw.apply(this, args);
      seats();
      settleCovers();
      return result;
    };
    const canvas = document.getElementById('geoCanvas'),
      arm = () => (gestureUntil = performance.now() + 900);
    canvas.addEventListener('wheel', arm, { capture: true, passive: true });
    canvas.addEventListener('pointerdown', arm, { capture: true, passive: true });
    canvas.addEventListener(
      'pointermove',
      () => {
        if (S.drag) arm();
      },
      { capture: true, passive: true },
    );
    document.querySelector('.zoom-controls')?.addEventListener('click', arm, { capture: true });
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      coverState = null; // read again at the new size
      if (neutral()) {
        gestureUntil = 0;
        resizeTimer = setTimeout(refresh, 340);
      }
    });
    state.ready = true;
    refresh();
  }
  install();
})();
