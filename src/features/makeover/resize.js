/* Makeover on 3.1: the reading panel's edge can be dragged (owner, 24 November 2026).

   The panel that opens over the map had one width, set from the window (tokens.css: --reader).
   Its left edge is now a handle: drag it to make the panel wider or narrower, as you would the
   border between two window panes. The width is kept for next time (localStorage key
   dkla.readerWidth.v1, a number of CSS pixels; nothing else is stored). Double-click the handle,
   or press Enter on it, to go back to the usual width. Arrow keys move it 24 px, Home and End go to
   the narrowest and widest.

   Desktop and landscape tablet only (windows 1024 px wide or more, where the panel sits beside the
   map). On a phone the panel is the whole screen and there is no handle.

   The map under the panel does not move while or after you drag: the panel slides over it. The
   next thing you open is framed in whatever space is left, as always (studyCode.js readerWidth).

   A panel narrower than 860 px gets the class reader-narrow, which gives a case page the layout
   3.1 already uses on a narrow window (no "On this page" rail): see makeover.css. */
(function () {
  'use strict';
  const KEY = 'dkla.readerWidth.v1',
    MIN = 440,
    MAP_STRIP = 280, // always leave this much map, so the trail and the handle stay reachable
    NARROW = 860,
    STEP = 24;
  const panel = document.getElementById('inspector');
  if (!panel || !panel.parentNode) return;
  const root = document.documentElement,
    wide = window.matchMedia('(min-width: 1024px)');

  const handle = document.createElement('div');
  handle.id = 'readerResize';
  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-orientation', 'vertical');
  handle.setAttribute('aria-label', 'Reading panel width');
  handle.setAttribute('aria-controls', 'inspector');
  handle.tabIndex = 0;
  handle.title = 'Drag to resize the page · double-click to reset';
  handle.innerHTML = '<span aria-hidden="true"></span>';
  panel.parentNode.insertBefore(handle, panel);

  const frame = () => panel.parentNode.getBoundingClientRect(),
    max = () => Math.max(MIN, Math.round(frame().width - MAP_STRIP)),
    clamp = (px) => Math.min(max(), Math.max(MIN, Math.round(px)));
  const saved = () => {
    try {
      const n = parseFloat(localStorage.getItem(KEY));
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  };
  const store = (px) => {
    try {
      if (px == null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, String(Math.round(px)));
    } catch {
      /* private mode: the width simply lasts for this visit */
    }
  };
  let chosen = saved(); // the width the reader asked for, or null for the usual one

  function describe() {
    const w = panel.getBoundingClientRect().width;
    panel.classList.toggle('reader-narrow', wide.matches && w > 0 && w < NARROW);
    handle.setAttribute('aria-valuemin', MIN);
    handle.setAttribute('aria-valuemax', max());
    if (w > 0) handle.setAttribute('aria-valuenow', Math.round(w));
  }
  // Apply the chosen width, held inside what this window allows; with none chosen, or on a narrow
  // window, the stylesheet's own width applies.
  function apply() {
    if (chosen != null && wide.matches) root.style.setProperty('--reader', clamp(chosen) + 'px');
    else root.style.removeProperty('--reader');
    describe();
    // The map draws names only where they can be seen, so the strip the panel just uncovered (or
    // covered) is drawn again. The camera is not moved.
    if (typeof schedule === 'function') schedule();
  }
  function set(px, keep) {
    chosen = clamp(px);
    apply();
    if (keep) store(chosen);
  }
  function reset() {
    chosen = null;
    store(null);
    apply();
  }

  let drag = null;
  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !wide.matches) return;
    e.preventDefault();
    drag = { id: e.pointerId, right: frame().right, moved: false };
    handle.setPointerCapture(e.pointerId);
    document.body.classList.add('reader-resizing');
  });
  handle.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.moved = true;
    set(drag.right - e.clientX, false);
  });
  const finish = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    document.body.classList.remove('reader-resizing');
    if (moved && chosen != null) store(chosen);
  };
  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', finish);
  handle.addEventListener('dblclick', reset);
  handle.addEventListener('keydown', (e) => {
    const now = panel.getBoundingClientRect().width;
    if (e.key === 'ArrowLeft') set(now + STEP, true);
    else if (e.key === 'ArrowRight') set(now - STEP, true);
    else if (e.key === 'Home') set(MIN, true);
    else if (e.key === 'End') set(max(), true);
    else if (e.key === 'Enter') reset();
    else return;
    e.preventDefault();
  });

  // The window changed size, or the panel opened: hold the width inside the new limits.
  window.addEventListener('resize', apply);
  wide.addEventListener('change', apply);
  new MutationObserver(describe).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  apply();
})();
