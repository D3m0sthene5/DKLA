/* Calm (v3.2): the page is at rest when nothing is happening.
 *
 * This file keeps one fact for everything decorative in the page: is it quiet time? Quiet means the tab
 * is hidden, a dialog is open over the page, or the map is being moved (a wheel turn or a drag on the
 * map, noticed here; the map's own code may also put the class `dkla-moving` on <html> for as long as
 * it animates, which counts the same). While it is quiet, <html> carries
 * `dkla-ambient-off` and the stylesheets pause every ambient animation (calm.css: the fuel gauge's and the
 * version label's sweep, the splash pulse, Dottie's blink, the Cold Call vapour); the clock changes its
 * digits without flipping. Nothing here polls: dialogs are noticed when they are opened (show and
 * showModal are wrapped once) and when their `open` attribute goes.
 *
 *   DKLACalm.quiet()             true while ambient motion should stand still
 *   DKLACalm.after(fn)           call fn after anything a visitor does that can change what is on screen
 *                                (a click, a key, a route change, a dialog opening or closing), once in
 *                                the next frame and once more when panels have settled; replaces timers
 *                                that looked every 200 or 500 ms
 *   DKLACalm.scrollTo(box, top)  (top: a number, or a function asked on every frame) a short eased scroll (about 250 ms) that stops the moment the visitor
 *                                scrolls, drags, or presses a key
 *   'dkla:ambient' on document   fired when quiet() changes (detail.off)
 *
 * It also turns the "Loading…" lines of the lazy readers into quiet skeletons (calm.css `.calm-wait`):
 * nothing for 150 ms, then grey bars where the text will be. The line's words stay for screen readers. */
(() => {
  'use strict';
  if (window.DKLACalm) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const open = new Set(),
    known = new WeakSet(),
    listeners = [];
  let off = false,
    gesture = false,
    frame = 0,
    settle = 0;

  function update() {
    for (const dialog of open) if (!dialog.open || !dialog.isConnected) open.delete(dialog);
    const now = document.hidden || open.size > 0 || gesture;
    if (now !== off) {
      off = now;
      root.classList.toggle('dkla-ambient-off', off);
      document.dispatchEvent(new CustomEvent('dkla:ambient', { detail: { off } }));
    }
    root.classList.toggle('dkla-dialog-open', open.size > 0);
    changed();
  }

  /* Anything that may have changed what covers what: run the listeners in the next frame, and once more
     after panels and dialogs have finished arriving. */
  function run() {
    frame = 0;
    for (const fn of listeners) {
      try {
        fn();
      } catch (error) {
        console.error(error);
      }
    }
  }
  function changed() {
    if (!listeners.length) return;
    if (!frame) frame = requestAnimationFrame(run);
    clearTimeout(settle);
    settle = setTimeout(() => {
      if (!frame) frame = requestAnimationFrame(run);
    }, 380);
  }

  // ----- dialogs: noticed when shown, and when their `open` attribute changes -----
  const watcher = typeof MutationObserver === 'function' ? new MutationObserver(noticed) : null;
  function noticed(records) {
    const seen = new Set();
    let toggled = false;
    for (const record of records) {
      if (record.type === 'attributes') toggled = true;
      const at = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      const dialog = at?.closest('dialog');
      if (dialog?.open) seen.add(dialog);
    }
    for (const dialog of seen) waitLines(dialog);
    if (toggled) {
      for (const dialog of seen) open.add(dialog);
      update();
    }
  }
  function know(dialog) {
    if (known.has(dialog)) return;
    known.add(dialog);
    dialog.addEventListener('close', update);
    // `open` for dialogs closed by removing the attribute; the children for "Loading…" lines.
    watcher?.observe(dialog, {
      attributes: true,
      attributeFilter: ['open'],
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
  function shown(dialog) {
    know(dialog);
    open.add(dialog);
    waitLines(dialog);
    update();
  }
  if (typeof HTMLDialogElement === 'function') {
    for (const name of ['show', 'showModal']) {
      const original = HTMLDialogElement.prototype[name];
      if (typeof original !== 'function') continue;
      HTMLDialogElement.prototype[name] = function (...args) {
        const out = original.apply(this, args);
        shown(this);
        return out;
      };
    }
  }
  for (const dialog of document.querySelectorAll('dialog')) {
    know(dialog);
    if (dialog.open) open.add(dialog);
  }

  // ----- the map being moved: a wheel turn over it, or a drag on it -----
  // Only listened to here (passive listeners; the map's own handlers are untouched). Quiet time
  // lasts until 0.3 s after the last wheel turn or the end of the drag.
  const map = document.getElementById('geoCanvas');
  let pressed = false,
    gestureTimer = 0;
  function moved(on) {
    clearTimeout(gestureTimer);
    if (on) {
      if (!gesture) {
        gesture = true;
        update();
      }
    } else
      gestureTimer = setTimeout(() => {
        gesture = false;
        update();
      }, 300);
  }
  if (map) {
    map.addEventListener(
      'wheel',
      () => {
        moved(true);
        moved(false);
      },
      { passive: true },
    );
    map.addEventListener('pointerdown', () => (pressed = true), { passive: true });
    map.addEventListener('pointermove', (event) => pressed && event.buttons && !gesture && moved(true), {
      passive: true,
    });
    for (const type of ['pointerup', 'pointercancel'])
      addEventListener(
        type,
        () => {
          if (pressed && gesture) moved(false);
          pressed = false;
        },
        { capture: true, passive: true },
      );
  }

  // ----- "Loading…" lines become skeletons -----
  const WAITING = /^\s*Loading\b/;
  function waitLines(scope) {
    for (const line of scope.querySelectorAll('[role="status"]')) {
      const waiting = WAITING.test(line.textContent) && !line.children.length;
      if (waiting !== line.classList.contains('calm-wait')) line.classList.toggle('calm-wait', waiting);
    }
  }

  // ----- a short scroll that never fights the visitor -----
  let scrolling = null;
  function stopScroll() {
    if (!scrolling) return;
    cancelAnimationFrame(scrolling.frame);
    for (const type of STOPPERS) scrolling.box.removeEventListener(type, stopScroll);
    scrolling = null;
  }
  const STOPPERS = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
  function scrollTo(box, top, ms = 250) {
    stopScroll();
    // `top` may be a function: where to land is then asked again on every frame, so the scroll still
    // ends in the right place if the page above it changes height on the way (a late brief).
    const where = () => {
      const limit = Math.max(0, box.scrollHeight - box.clientHeight);
      return Math.max(0, Math.min(limit, typeof top === 'function' ? top() : top));
    };
    const from = box.scrollTop,
      to = where();
    if (reduced.matches || Math.abs(to - from) < 2 || !box.animate) {
      box.scrollTop = to;
      return;
    }
    const began = performance.now();
    const state = (scrolling = { box, frame: 0 });
    for (const type of STOPPERS) box.addEventListener(type, stopScroll, { passive: true });
    const step = (now) => {
      if (scrolling !== state) return;
      const t = Math.min(1, (now - began) / ms),
        eased = 1 - (1 - t) ** 3;
      box.scrollTop = from + (where() - from) * eased;
      if (t < 1) state.frame = requestAnimationFrame(step);
      else stopScroll();
    };
    state.frame = requestAnimationFrame(step);
  }

  document.addEventListener('visibilitychange', update);
  for (const type of ['click', 'keyup'])
    document.addEventListener(type, changed, { capture: true, passive: true });
  addEventListener('hashchange', changed);
  addEventListener('popstate', changed);
  // iOS only shows :active while a touch listener exists.
  document.addEventListener('touchstart', () => {}, { passive: true });

  window.DKLACalm = Object.freeze({
    quiet: () => off || root.classList.contains('dkla-moving'),
    after(fn) {
      if (typeof fn === 'function') listeners.push(fn);
    },
    changed,
    scrollTo,
    waitLines,
    state: () => ({ off, dialogs: open.size, listeners: listeners.length }),
  });
  update();
})();
