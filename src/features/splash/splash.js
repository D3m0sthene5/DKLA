/* Minecraft-style splash text: a short line in warm yellow, tilted and gently pulsing, attached to the
 * DKLA wordmark in the top bar on Home (v3.2; before the Home prototypes it sat on the corner of the big
 * logo on the map, and that placement is kept below for a Home that still draws the logo).
 * One line per visit, chosen from window.DKLASplashLines by `choose` below (never the line just
 * shown, and very rarely one of the last 100); clicking or tapping it shows another.
 *
 * In the top bar it is placed and tilted by the stylesheets (src/features/v32/chrome.css);
 * this file only decides whether it shows: on Home (the whole atlas at its resting size), with no
 * reader, dialog, Study or SCOTUS History open. It is looked at after each map draw and after anything
 * a visitor does, never on a timer.
 *
 * On the map (no top-bar placement): it is one element laid over the map (after #geoCanvas in
 * #studyMain) and placed from the logo's on-screen box after each map draw; it shows only on the Home
 * map with the logo on screen, large enough and not covered, and only where it touches no tile, course
 * name or control (drawn a little smaller, down to 12 px, 11 on a phone, where that clears one).
 * Decorative: hidden from screen readers. Reduced motion: no pulse, no pop. */
(() => {
  'use strict';

  /* Which line comes next (owner, 18 November 2026: "when you see a certain one you're much less likely
   * to get that one again for 100 times that you click through them"). Pure functions, tested by
   * tools/splash/pick.test.mjs. The history is { recent, seen }: `recent` the texts of the last 100 lines
   * shown, oldest first; `seen` how many times each text has ever been shown. Both go by text, so editing
   * the list keeps the history of every line that stays, and a new line starts unseen.
   *
   * A line's weight is its recency weight times its rarity weight:
   * - recency, from its age (1 = the line just shown): 0 at age 1, so never twice in a row; below the
   *   gap (the fewest picks before a line is welcome again) it climbs smoothly from 0 to RARE (one
   *   ten-thousandth of normal); at the gap it is normal (1), and it grows by 1 for every further pick
   *   it waits, so the least recent is preferred. The gap is 100 picks. A list too short for that keeps
   *   a pool of a quarter of its lines (2 to 16) outside the gap, so every line still comes round: close
   *   to a shuffled cycle, with no line twice in a row across the reshuffle either.
   * - rarity, from how many more times it has been shown than the least-shown line: 1, 1/4, 1/9, and
   *   1/16 from three on. New lines therefore come up first; the cap keeps old lines coming up (about a
   *   fifth of the clicks after the list doubles, in the test) while the new ones catch up. */
  const WINDOW = 100,
    RARE = 1e-4,
    SEEN_CAP = 600; // at most this many texts keep counts; counts of lines no longer listed go first
  function gapFor(n) {
    const pool = Math.min(16, Math.max(2, Math.round(n / 4)));
    return Math.max(2, Math.min(WINDOW, n - pool + 1));
  }
  function weights(list, history) {
    const recent = history?.recent || [],
      seen = history?.seen || {},
      age = new Map();
    for (let i = recent.length - 1; i >= 0; i--)
      if (!age.has(recent[i])) age.set(recent[i], recent.length - i);
    const gap = gapFor(list.length),
      // A line not in the memory was last shown longer ago than everything in it (or never).
      unknown = Math.max(recent.length, gap - 1) + 1,
      count = (line) => (Object.hasOwn(seen, line) ? seen[line] : 0),
      least = Math.min(...list.map(count));
    return list.map((line) => {
      const a = age.get(line) ?? unknown,
        recency = a === 1 ? 0 : a < gap ? RARE * ((a - 1) / (gap - 1)) ** 2 : a - gap + 1;
      return recency / (1 + Math.min(3, count(line) - least)) ** 2;
    });
  }
  // The index in `list` of the next line; `random` returns a number in [0, 1).
  function choose(list, history, random = Math.random) {
    if (list.length < 2) return 0;
    const w = weights(list, history),
      total = w.reduce((a, b) => a + b, 0);
    let r = random() * total;
    for (let i = 0; i < w.length; i++) {
      r -= w[i];
      if (r < 0 && w[i] > 0) return i;
    }
    return w.indexOf(Math.max(...w)); // rounding left nothing: the heaviest
  }
  const isCount = (v) => Number.isFinite(v) && v >= 0;
  // The history after `line` is shown, as a new object.
  function record(history, line, list = []) {
    const recent = [...(history?.recent || []), line].slice(-WINDOW),
      seen = { ...(history?.seen || {}) };
    seen[line] = (Object.hasOwn(seen, line) ? seen[line] : 0) + 1;
    let texts = Object.keys(seen);
    if (texts.length > SEEN_CAP) {
      const keep = new Set([...list, ...recent]);
      texts.sort((a, b) => keep.has(b) - keep.has(a) || seen[b] - seen[a]);
      for (const text of texts.slice(SEEN_CAP)) delete seen[text];
    }
    return { recent, seen };
  }
  // A history from whatever was stored: this format, the first one ({ last: index, seen: counts }), or
  // nothing. The first format keeps every count, and the line it showed last becomes the memory's one entry.
  function migrate(saved, list = []) {
    const seen = {};
    if (saved && typeof saved.seen === 'object' && saved.seen)
      for (const [text, n] of Object.entries(saved.seen)) if (isCount(n)) seen[text] = Math.floor(n);
    let recent = [];
    if (Array.isArray(saved?.recent))
      recent = saved.recent.filter((line) => typeof line === 'string').slice(-WINDOW);
    else if (Number.isInteger(saved?.last) && typeof list[saved.last] === 'string')
      recent = [list[saved.last]];
    return { recent, seen };
  }
  window.DKLASplashPicker = { choose, record, migrate, weights, gapFor, WINDOW };

  if (window.DKLASplash) return;
  const KEY = 'dkla.splash.v1';
  const TILT = -18; // degrees, rising to the right like Minecraft's
  const RAD = (TILT * Math.PI) / 180,
    COS = Math.cos(RAD),
    SIN = Math.sin(RAD);
  const PULSE = 1.06; // largest scale of the pulse (splash.css)
  const FOOTPRINT = 13; // longest line, in ems of the base size; longer lines are drawn smaller
  const ANCHOR = 0.08; // the share of the line that lies over the logo's corner
  const SHADOW = 0.12; // the hard shadow's reach, in ems (splash.css)
  const along = 0.5 - ANCHOR; // from the anchor to the line's centre, in line lengths
  const LEAST = 12, // px: the smallest size it is drawn at on a desktop, to clear a tile; below that it hides
    LEAST_PHONE = 11;
  const MIN_LOGO = 24; // px: a smaller logo is too far away to carry a splash
  const CHROME =
    '.study-header, .map-nav, .study-zoom, #saveStatus, #mapHint, #mapWelcome, #inspector, .ask-bar-dottie';
  const DRAWN =
    'path[data-map-region], .r19-tile, text.course-label, .authority-volume-cover, [data-dictionary-spine]';
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const main = document.getElementById('studyMain');
  const canvas = document.getElementById('geoCanvas');
  if (!main || !canvas) return;

  const lines = () =>
    Array.isArray(window.DKLASplashLines)
      ? window.DKLASplashLines.filter((line) => typeof line === 'string' && line.trim())
      : [];
  // The history lives in localStorage, read afresh each time (another tab may have shown lines). Where
  // storage is blocked or a write fails, it is kept in memory for this page instead.
  let memory = { recent: [], seen: {} },
    stored = true;
  function history() {
    if (stored)
      try {
        return migrate(JSON.parse(localStorage.getItem(KEY)), lines());
      } catch {
        stored = false;
      }
    return memory;
  }
  function remember(index) {
    const list = lines(),
      line = list[index];
    if (typeof line !== 'string') return;
    memory = record(history(), line, list);
    try {
      // `last` (the index shown) stays for the first format's readers.
      localStorage.setItem(KEY, JSON.stringify({ last: index, ...memory }));
      stored = true;
    } catch {
      stored = false;
    }
  }
  const pick = () => choose(lines(), history());

  const root = document.createElement('div');
  root.className = 'dkla-splash';
  root.setAttribute('aria-hidden', 'true');
  root.dataset.shown = 'false';
  root.innerHTML = '<span class="dkla-splash-pop"><span class="dkla-splash-text"></span></span>';
  const pop = root.firstChild,
    text = pop.firstChild;
  // Home prototypes (v25/home-variants.js) have no mark on the map: the splash
  // sits in the top bar instead, on the upper-right corner of the DKLA wordmark,
  // smaller (13 px, down to 10 for a long line), clear of every button.
  const header = window.DKLAHomeVariant?.active ? document.querySelector('.study-header') : null;
  if (header) {
    root.classList.add('dkla-splash-brand');
    header.appendChild(root);
  } else canvas.after(root);

  let index = -1,
    perEm = 0, // the line's natural width and height per px of font size
    perH = 0,
    font = 0,
    placed = '', // where the splash was last put; nothing is written while it holds
    clear = 'unchecked', // what the last placement touches ('' for nothing)
    checked = false, // `clear` belongs to the current placement
    cleared = { largest: 0, size: 0 }, // the size the last check found clear, for that largest size
    lastCheck = 0,
    frame = 0,
    later = 0;

  function show(i) {
    const list = lines();
    if (!list.length) return false;
    index = ((i % list.length) + list.length) % list.length;
    text.textContent = list[index];
    root.dataset.line = String(index);
    perEm = 0;
    placed = '';
    remember(index);
    return true;
  }

  function onHome() {
    if (typeof S === 'undefined' || !S) return false;
    if (S.scope !== 'Atlas' || S.region || S.district || S.panelOpen) return false;
    if (typeof selected !== 'undefined' && selected) return false;
    return document.documentElement.classList.contains('dkla-boot-ready') && !document.hidden;
  }
  // The drawn letters' box; the logo's own box is its whole (mostly empty) drawing area.
  function logoBox(mark) {
    let left = Infinity,
      top = Infinity,
      right = -Infinity,
      bottom = -Infinity;
    for (const part of mark.children) {
      if (part.localName === 'defs' || part.localName === 'clipPath' || part.localName === 'title') continue;
      const q = part.getBoundingClientRect();
      if (!q.width || !q.height) continue;
      left = Math.min(left, q.left);
      top = Math.min(top, q.top);
      right = Math.max(right, q.right);
      bottom = Math.max(bottom, q.bottom);
    }
    if (left === Infinity) return mark.getBoundingClientRect();
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }
  function opacity(el) {
    let o = 1;
    for (; el && el !== canvas; el = el.parentNode) {
      const value = el.getAttribute('opacity');
      if (value !== null) o *= Number(value);
    }
    return o;
  }
  // Does the tilted box (centre cx, cy; half-lengths a along the text, b across it) touch rect q?
  function touches(cx, cy, a, b, q) {
    const qx = (q.left + q.right) / 2,
      qy = (q.top + q.bottom) / 2,
      qw = q.width / 2,
      qh = q.height / 2,
      dx = qx - cx,
      dy = qy - cy,
      c = Math.abs(COS),
      s = Math.abs(SIN);
    return (
      Math.abs(dx) <= a * c + b * s + qw &&
      Math.abs(dy) <= a * s + b * c + qh &&
      Math.abs(dx * COS + dy * SIN) <= a + qw * c + qh * s &&
      Math.abs(-dx * SIN + dy * COS) <= b + qw * s + qh * c
    );
  }
  function blocker(cx, cy, a, b, area) {
    // Inside the map area, with room for the pulse.
    const ex = a * Math.abs(COS) + b * Math.abs(SIN),
      ey = a * Math.abs(SIN) + b * Math.abs(COS);
    if (
      cx - ex < area.left + 4 ||
      cx + ex > area.right - 4 ||
      cy - ey < area.top + 4 ||
      cy + ey > area.bottom - 4
    )
      return 'edge';
    for (const el of document.querySelectorAll(CHROME)) {
      const q = el.getBoundingClientRect();
      if (!q.width || !q.height) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
      if (touches(cx, cy, a, b, q)) return 'control';
    }
    for (const el of canvas.querySelectorAll(DRAWN)) {
      const q = el.getBoundingClientRect();
      if (q.width && q.height && touches(cx, cy, a, b, q)) return 'map';
    }
    return '';
  }

  // Hidden: the next showing is placed and checked afresh.
  function off(why) {
    placed = '';
    return why;
  }
  // In the top bar (v3.2 "Instrument") the line is attached to the wordmark, the way a title-screen
  // splash is: src/features/v32/chrome.js hangs it just after the wordmark and chrome.css places and
  // tilts it, so nothing is positioned or measured from here. This only decides whether it
  // shows: on Home, with nothing open over the page (a reader, a dialog, Study, SCOTUS History). Where
  // the bar has too little room beside the wordmark the stylesheet leaves it out (chrome.css).
  function placeInBar() {
    if (index < 0 && !show(pick())) return off('no lines');
    const page = document.documentElement;
    if (!page.classList.contains('dkla-boot-ready') || document.hidden) return off('not ready');
    if (!onHome() || page.classList.contains('dkla-off-home')) return off('not home');
    if (window.DKLACalm?.state().dialogs) return off('dialog');
    const word = header.querySelector('.study-brand'),
      q = word?.getBoundingClientRect();
    if (!q || !q.width) return off('no logo');
    // Anything drawn over the bar covers the wordmark the line is attached to.
    const hit = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
    if (!hit || !header.contains(hit)) return off('covered');
    if (text.style.fontSize) text.style.fontSize = '';
    if (root.style.transform) root.style.transform = '';
    return '';
  }
  function place() {
    if (header) return placeInBar();
    if (index < 0 && !show(pick())) return off('no lines');
    if (!onHome()) return off('not home');
    const mark = canvas.querySelector('.dkla-map-monogram');
    if (!mark) return off('no logo');
    const logo = logoBox(mark);
    if (
      logo.width < MIN_LOGO ||
      logo.right < 0 ||
      logo.bottom < 0 ||
      logo.left > innerWidth ||
      logo.top > innerHeight
    )
      return off('logo small or away');
    const look = getComputedStyle(mark);
    if (look.visibility === 'hidden' || look.display === 'none' || opacity(mark) < 0.6)
      return off('logo faded');
    // Anything drawn over the map (a panel, a dialog, Study, SCOTUS History) covers the logo's centre.
    const hit = document.elementFromPoint(logo.left + logo.width / 2, logo.top + logo.height / 2);
    if (!hit || !(canvas.contains(hit) || root.contains(hit))) return off('covered');

    if (!perEm) {
      text.style.fontSize = '20px';
      perEm = text.offsetWidth / 20;
      perH = text.offsetHeight / 20;
      font = 0;
      if (!perEm) return off('unmeasured');
    }
    const area = main.getBoundingClientRect();
    const phone = Math.min(innerWidth, innerHeight) < 560;
    const base = Math.min(phone ? 14 : 18, Math.max(phone ? 11 : 13, logo.height * 0.19));
    // The anchor sits just inside the logo's upper-right corner; the start of the line lies
    // over the logo and the rest rises to the right from it.
    const sx = logo.right - logo.width * 0.04,
      sy = logo.top + logo.height * 0.2;
    // Every line fits the same footprint, and the room above and to the right of the logo.
    const sin = Math.abs(SIN),
      up = along * perEm * sin + (PULSE * (perEm * sin + perH * COS)) / 2 + SHADOW,
      out = along * perEm * COS + (PULSE * (perEm * COS + perH * sin)) / 2 + SHADOW,
      room = Math.min((sy - area.top - 6) / up, (area.right - 6 - sx) / out);
    const fitted = Math.min(base, (base * FOOTPRINT) / perEm, room);
    const largest = Math.max(base * 0.6, Math.floor(fitted * 4) / 4);
    // Where a tile or control is in the way at the largest size, a smaller size that clears it
    // is used, down to `least`; below that the splash hides.
    const least = Math.min(largest, phone ? LEAST_PHONE : LEAST);
    const at = (size) => {
      const w = perEm * size,
        h = perH * size;
      return { size, w, h, cx: sx + along * w * COS, cy: sy + along * w * SIN };
    };
    const put = (g) => {
      const where = `${g.cx.toFixed(1)},${g.cy.toFixed(1)},${g.size.toFixed(2)},${area.left},${area.top},${area.width},${area.height}`;
      if (where === placed) return;
      placed = where;
      if (g.size !== font) {
        font = g.size;
        text.style.fontSize = g.size.toFixed(2) + 'px';
      }
      const x = g.cx - area.left - g.w / 2,
        y = g.cy - area.top - g.h / 2;
      root.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${TILT}deg)`;
      checked = false;
    };
    const step = (size) => Math.max(least, Math.floor(size * 0.9 * 4) / 4);
    put(at(cleared.largest === largest ? cleared.size : largest));
    const now = performance.now();
    // Checking every tile is the costly part: at most every 120 ms while the map moves and
    // once more after it stops, and every half second in case something else moved (the
    // tiles' entrance, a panel opening).
    if (!checked || now - lastCheck > 450) {
      if (now - lastCheck < 120) {
        if (!later) later = setTimeout(() => ((later = 0), schedule()), 130);
      } else {
        lastCheck = now;
        let size = largest,
          why;
        for (;;) {
          const g = at(size),
            pad = SHADOW * size;
          why = blocker(g.cx, g.cy, (g.w * PULSE) / 2 + pad, (g.h * PULSE) / 2 + pad, area);
          if (!why || size <= least) break;
          size = step(size);
        }
        cleared = { largest, size: why ? largest : size };
        put(at(cleared.size));
        checked = true;
        clear = why;
      }
    }
    return clear;
  }

  function update() {
    frame = 0;
    const why = place(),
      visible = why ? 'false' : 'true';
    if (root.dataset.shown !== visible) root.dataset.shown = visible;
    // Why it is hidden, for anyone checking the page.
    if ((root.dataset.hiddenBy || '') !== why) root.dataset.hiddenBy = why;
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  text.addEventListener('pointerdown', (event) => event.stopPropagation());
  // Scrolling over the text still zooms the map underneath.
  text.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      canvas.dispatchEvent(new WheelEvent('wheel', event));
    },
    { passive: false },
  );
  text.addEventListener('click', (event) => {
    event.stopPropagation();
    if (root.dataset.shown !== 'true' || !show(pick())) return;
    if (!calm.matches && pop.animate)
      pop.animate(
        [{ transform: 'scale(0.6)' }, { transform: 'scale(1.14)', offset: 0.6 }, { transform: 'scale(1)' }],
        { duration: 260, easing: 'ease-out' },
      );
    schedule();
  });

  window.DKLASplash = { ready: false, refresh: schedule };
  function install() {
    if (!window.LegalAtlas?.ready || !window.R18?.afterDraw) {
      setTimeout(install, 80);
      return;
    }
    R18.afterDraw.push(schedule);
    addEventListener('resize', schedule);
    document.addEventListener('visibilitychange', schedule);
    document.fonts?.addEventListener?.('loadingdone', () => {
      perEm = 0;
      schedule();
    });
    // Panels and dialogs can open without a map draw: looked at again after anything a visitor does
    // and when a dialog opens or closes (src/features/calm/calm.js), not on a timer.
    window.DKLACalm?.after(schedule);
    document.addEventListener('dkla:ambient', schedule);
    window.DKLASplash.ready = true;
    schedule();
  }
  install();
})();
