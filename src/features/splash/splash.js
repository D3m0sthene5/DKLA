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
 * and only where it touches no tile, course name or control. Decorative:
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
  function remember(index) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ last: index }));
    } catch {
      /* private window or storage blocked: the next visit may repeat a line */
    }
  }
  // A random line other than `avoid`.
  function pick(avoid) {
    const n = lines().length;
    if (n < 2) return 0;
    if (avoid < 0 || avoid >= n) return Math.floor(Math.random() * n);
    const i = Math.floor(Math.random() * (n - 1));
    return i >= avoid ? i + 1 : i;
  }

  const root = document.createElement('div');
  root.className = 'dkla-splash';
  root.setAttribute('aria-hidden', 'true');
  root.dataset.shown = 'false';
  root.innerHTML = '<span class="dkla-splash-pop"><span class="dkla-splash-text"></span></span>';
  const pop = root.firstChild,
    text = pop.firstChild;
  canvas.after(root);

  let index = -1,
    perEm = 0, // the line's natural width and height per px of font size
    perH = 0,
    font = 0,
    placed = '', // where the splash was last put; nothing is written while it holds
    clear = 'unchecked', // what the last placement touches ('' for nothing)
    checked = false, // `clear` belongs to the current placement
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
  function place() {
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
    const along = 0.5 - ANCHOR,
      sin = Math.abs(SIN),
      up = along * perEm * sin + (PULSE * (perEm * sin + perH * COS)) / 2 + SHADOW,
      out = along * perEm * COS + (PULSE * (perEm * COS + perH * sin)) / 2 + SHADOW,
      room = Math.min((sy - area.top - 6) / up, (area.right - 6 - sx) / out);
    const fitted = Math.min(base, (base * FOOTPRINT) / perEm, room);
    const size = Math.max(base * 0.6, Math.floor(fitted * 4) / 4);
    const w = perEm * size,
      h = perH * size;
    const cx = sx + along * w * COS,
      cy = sy + along * w * SIN;
    const where = `${cx.toFixed(1)},${cy.toFixed(1)},${size.toFixed(2)},${area.left},${area.top},${area.width},${area.height}`;
    if (where !== placed) {
      placed = where;
      if (size !== font) {
        font = size;
        text.style.fontSize = size.toFixed(2) + 'px';
      }
      const x = cx - area.left - w / 2,
        y = cy - area.top - h / 2;
      root.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${TILT}deg)`;
      checked = false;
    }
    const now = performance.now();
    // Checking every tile is the costly part: at most every 120 ms while the map moves and
    // once more after it stops, and every half second in case something else moved (the
    // tiles' entrance, a panel opening).
    if (!checked || now - lastCheck > 450) {
      if (now - lastCheck < 120) {
        if (!later) later = setTimeout(() => ((later = 0), schedule()), 130);
      } else {
        lastCheck = now;
        checked = true;
        const pad = SHADOW * size;
        clear = blocker(cx, cy, (w * PULSE) / 2 + pad, (h * PULSE) / 2 + pad, area);
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
