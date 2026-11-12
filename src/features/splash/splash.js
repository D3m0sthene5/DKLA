/* Minecraft-style splash text on the Home map: a short line in warm yellow,
 * tilted on the upper-right corner of the big DKLA logo, gently pulsing.
 * One line per visit, chosen at random from window.DKLASplashLines (never the
 * line the previous visit showed); clicking or tapping it shows another.
 *
 * The map redraws by replacing its contents, so the splash is not drawn into
 * the map. It is one element laid over the map (after #geoCanvas in
 * #studyMain) and placed from the logo's on-screen box after each map draw,
 * on resize and on a slow timer. It writes only when the logo has moved.
 *
 * It shows only on the Home map with the logo on screen, large enough and
 * not covered (a reading panel, Study, SCOTUS History or a dialog hides it),
 * and only where it touches no tile, course name or control (drawn a little
 * smaller, down to 12 px, 11 on a phone, where that clears one). Decorative:
 * hidden from screen readers. Reduced motion: no pulse, no pop. */
(() => {
  'use strict';
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
  function lastShown() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      return Number.isInteger(saved?.last) ? saved.last : -1;
    } catch {
      return -1;
    }
  }
  // How many times each line has been shown in this browser, by its text (so editing the list keeps
  // the counts of lines that stay).
  function seenCounts() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      return saved && typeof saved.seen === 'object' && saved.seen ? saved.seen : {};
    } catch {
      return {};
    }
  }
  function remember(index) {
    try {
      const seen = seenCounts(),
        line = lines()[index];
      if (typeof line === 'string') seen[line] = (seen[line] || 0) + 1;
      localStorage.setItem(KEY, JSON.stringify({ last: index, seen }));
    } catch {
      /* private window or storage blocked: the next visit may repeat a line */
    }
  }
  // A random line other than `avoid`, weighted towards lines seen less often (owner, 12 November 2026:
  // each time a line comes up, the odds of seeing it again go down, so people keep seeing new ones).
  // A line seen k times weighs 1 / (1 + k)^2.
  function pick(avoid) {
    const list = lines(),
      n = list.length;
    if (n < 2) return 0;
    const seen = seenCounts(),
      weights = list.map((line, i) => (i === avoid ? 0 : 1 / (1 + (seen[line] || 0)) ** 2)),
      total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < n; i++) {
      r -= weights[i];
      if (r < 0 && weights[i] > 0) return i;
    }
    return avoid === 0 ? 1 : 0;
  }

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
  const BAR_CLEAR =
    '.study-header button:not(.study-brand), .study-header a, .study-header input, .ask-bar-dottie, .map-nav, #mapWelcome';
  function placeInBar() {
    if (index < 0 && !show(pick(lastShown()))) return off('no lines');
    if (!onHome()) return off('not home');
    // The calm top bar (src/features/topbar/) gives the line its own slot beside the clock.
    const slotEl = header.querySelector('.dkla-splash-slot');
    if (slotEl && slotEl.getClientRects().length) {
      // A panel, Study, SCOTUS History or a dialog drawn over the map hides it, as on the map.
      const map = document.getElementById('geoCanvas')?.getBoundingClientRect();
      const hit = map && document.elementFromPoint(map.left + map.width / 2, map.top + map.height / 2);
      if (!hit || !hit.closest('#geoCanvas')) return off('covered');
      return placeInSlot(slotEl);
    }
    const word = header.querySelector('.study-brand .dkla-wordmark');
    if (!word || !word.getClientRects().length) return off('no logo');
    // The big DKLA letters, not the small line under them.
    const letters = [...word.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    let q = word.getBoundingClientRect();
    if (letters) {
      const range = document.createRange();
      range.selectNodeContents(letters);
      const r = range.getBoundingClientRect();
      if (r.width) q = r;
    }
    if (!perEm) {
      text.style.fontSize = '20px';
      perEm = text.offsetWidth / 20;
      perH = text.offsetHeight / 20;
      font = 0;
      if (!perEm) return off('unmeasured');
    }
    const bar = header.getBoundingClientRect();
    const at = (size) => {
      const w = perEm * size,
        h = perH * size,
        ey = (PULSE * (w * Math.abs(SIN) + h * COS)) / 2 + SHADOW * size;
      // A quarter of the line lies over the wordmark; the rest rises to the right of it.
      const cx = q.right + w * 0.25 * COS,
        cy = Math.max(q.top + q.height * 0.3, bar.top + 3 + ey);
      return { size, w, h, cx, cy };
    };
    const blocked = (g) => {
      const a = (g.w * PULSE) / 2 + SHADOW * g.size,
        b = (g.h * PULSE) / 2 + SHADOW * g.size;
      if (g.cx - a * COS < 2) return 'edge';
      for (const el of document.querySelectorAll(BAR_CLEAR)) {
        const r = el.getBoundingClientRect();
        if (
          r.width &&
          r.height &&
          getComputedStyle(el).visibility !== 'hidden' &&
          touches(g.cx, g.cy, a, b, r)
        )
          return 'control';
      }
      return '';
    };
    let size = Math.min(13, Math.max(10, 170 / perEm)),
      why = '';
    for (;;) {
      why = blocked(at(size));
      if (!why || size <= 9) break;
      size = Math.max(9, size - 0.5);
    }
    const g = at(size),
      where = `${g.cx.toFixed(1)},${g.cy.toFixed(1)},${size}`;
    if (where !== placed) {
      placed = where;
      if (size !== font) {
        font = size;
        text.style.fontSize = size.toFixed(2) + 'px';
      }
      const x = g.cx - bar.left - g.w / 2,
        y = g.cy - bar.top - g.h / 2;
      root.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${TILT}deg)`;
    }
    return why;
  }
  // Centred in the top bar's slot, as large as fits (11-16px), tilted and pulsing as on the map.
  function placeInSlot(slotEl) {
    if (!perEm) {
      text.style.fontSize = '20px';
      perEm = text.offsetWidth / 20;
      perH = text.offsetHeight / 20;
      font = 0;
      if (!perEm) return off('unmeasured');
    }
    const bar = header.getBoundingClientRect(),
      q = slotEl.getBoundingClientRect(),
      // A gentler tilt than on the map, so a whole line fits in the bar's height.
      tilt = -6,
      c = Math.cos((tilt * Math.PI) / 180),
      sn = Math.abs(Math.sin((tilt * Math.PI) / 180));
    // The tilted, pulsing line must stay inside the slot's width and the bar's height.
    const fits = (size) => {
      const w = perEm * size,
        h = perH * size,
        across = PULSE * (w * c + h * sn) + 2 * SHADOW * size,
        up = PULSE * (w * sn + h * c) + 2 * SHADOW * size;
      return across <= q.width - 8 && up <= bar.height - 6;
    };
    let size = 16;
    while (size > 11 && !fits(size)) size -= 0.5;
    if (!fits(size)) return off('edge');
    const w = perEm * size,
      h = perH * size,
      cx = q.left + q.width / 2,
      cy = bar.top + bar.height / 2,
      where = `${cx.toFixed(1)},${cy.toFixed(1)},${size}`;
    // Compare with the size actually set, not a cache: measuring sets 20px for a moment.
    const px = size.toFixed(2) + 'px';
    if (text.style.fontSize !== px) {
      text.style.fontSize = px;
      font = size;
      placed = '';
    }
    if (where !== placed) {
      placed = where;
      root.style.transform = `translate(${(cx - bar.left - w / 2).toFixed(1)}px, ${(cy - bar.top - h / 2).toFixed(1)}px) rotate(${tilt}deg)`;
    }
    return '';
  }
  function place() {
    if (header) return placeInBar();
    if (index < 0 && !show(pick(lastShown()))) return off('no lines');
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
    if (root.dataset.shown !== 'true' || !show(pick(index))) return;
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
    // Panels and dialogs can open without a map draw.
    setInterval(() => document.hidden || schedule(), 500);
    window.DKLASplash.ready = true;
    schedule();
  }
  install();
})();
