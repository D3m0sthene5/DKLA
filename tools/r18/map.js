/* DKLA r18 map behaviour: a course view that always holds the whole course, a centre mark and course
   names that keep their proportions on every screen, and a refit when the window changes size. */
(() => {
  'use strict';

  // The whole course: its subjects, the design zones around them, the large annotations beside them and
  // the course name above. r17 fitted the subject boxes only, so zones and annotations ran off the edge.
  scopeBox = function () {
    const G = galaxy();
    if (S.scope === 'Atlas') return G.box;
    const regions = bounds(scopeRegions());
    if (!G.blocks[S.scope]) return regions;
    const design = G.design[S.scope] || {};
    const core = bounds([regions, G.blocks[S.scope], ...(design.zones || [])]);
    const area = safeArea();
    const rows = R18.courseTitleRows(S.scope);
    let box = core;
    let z = Math.min((area.w - 40) / core.w, (area.h - 40) / core.h, .7);
    for (let pass = 0; pass < 3; pass++) {
      const fs = R18.courseTitlePx(z) / z;
      const head = fs * (.9 + 1.23 * (rows.length - 1) + 1.1);
      const titleW = Math.max(...rows.map(row => measure(row, fs, 600, 'course-label')));
      const items = [
        { x: core.x, y: core.y - head, w: core.w, h: core.h + head },
        { x: core.x + core.w / 2 - titleW / 2, y: core.y - head, w: titleW, h: head },
      ];
      for (const label of design.labels || []) {
        if (label.size !== 'large') continue;
        // An annotation is framed only where it is a margin note; on a small screen it is as wide as
        // the course itself, would shrink everything else, and the label engine hides it anyway.
        const lfs = 17 / z, lw = measure(label.text, lfs, 500, 'region-title');
        if (lw > core.w * .22) continue;
        items.push({ x: label.x, y: label.y - lfs, w: lw, h: lfs * 1.4 });
      }
      box = bounds(items);
      z = Math.min((area.w - 40) / box.w, (area.h - 40) / box.h, .7);
    }
    return box;
  };

  // The centre mark is drawn in map units by r16/r17. r17 faded it by a zoom ratio that differed from
  // screen to screen, which left a cropped half-mark over some course views. It now belongs to the
  // three-course view only and is gone by the time a course has opened.
  function settleMark() {
    const mark = document.querySelector('#geoCanvas .dkla-map-monogram, #geoCanvas svg[viewBox="0 0 244 78"]');
    if (!mark || !mark.parentNode) return;
    const floor = zoomFloor();
    const o = Math.min(1, Math.max(0, (floor * 1.7 - S.z) / (floor * .5)));
    mark.parentNode.setAttribute('opacity', o.toFixed(3));
  }

  function install() {
    if (!window.SCOTUSHistory || typeof draw !== 'function' || !document.getElementById('dklaR17Logo')) { setTimeout(install, 80); return; }
    document.title = 'DKLA · ' + R18.version; // r16 sets its own title during boot, which has finished by now
    const previousDraw = draw;
    draw = function (...args) {
      const result = previousDraw.apply(this, args);
      settleMark();
      for (const fn of R18.afterDraw) { try { fn(); } catch (error) { console.error('DKLA r18 overlay', error); } }
      return result;
    };
    schedule();
  }
  // r17's logo wrapper installs itself on a timer; wait a beat so this wrapper sits outside it.
  setTimeout(install, 200);

  // Case and concept glyphs on the cards take the course's accent (orange, blue, green) rather than the
  // darker tile shade r10 used, so the drawings read clearly against the card.
  R18.afterDraw.push(() => {
    for (const mark of svg.querySelectorAll('.node-card[data-map-node] > g[stroke][transform]')) {
      const home = homeFor(mark.parentNode.dataset.mapNode), region = home && regionFor(home.region);
      if (region) mark.setAttribute('stroke', regionAccent(region));
    }
  });

  // Keep the current level framed when the window or the device orientation changes.
  let last = null, timer = 0;
  function refit() {
    if (window.SCOTUSHistory && window.SCOTUSHistory.state().open) return;
    if (R11.anim || S.drag || (S.pointers && S.pointers.size)) return;
    if (selected || S.district) return;
    if (S.scope !== 'Atlas' && S.region) { const r = regionFor(S.region); if (r) fitBox(r, false, R18.subjectPad(), .95); return; }
    fitBox(scopeBox(), false, 20, .7);
  }
  new ResizeObserver(() => {
    const v = rect();
    if (!last) { last = { w: v.w, h: v.h }; return; }
    if (Math.abs(v.w - last.w) < 2 && Math.abs(v.h - last.h) < 80) return;
    last = { w: v.w, h: v.h };
    clearTimeout(timer);
    timer = setTimeout(refit, 180);
  }).observe(svg);
  R18.refit = refit;
})();
