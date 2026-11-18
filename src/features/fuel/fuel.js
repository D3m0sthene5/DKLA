/* Ask Dottie's fuel gauge: a glowing line around the frame of the top-bar clock that runs out as
 * her OpenAI credit runs out, like a usage ring. It starts at the top centre and runs clockwise;
 * its length is the share of the credit left (half left, half the frame lit), drawn in the
 * version label's HUD glow (src/features/v26/hud-font.css) over a faint full-frame track.
 * Below a quarter it turns amber, below a tenth red-orange. Before the owner has calibrated it,
 * the frame shows a dim dashed track and no number at all.
 *
 * The share comes from GET /api/fuel (api/fuel.js, lib/ask/fuel.js): on load, every 5 minutes
 * while the tab is visible, and after each Ask Dottie answer (the 'dkla:ask-answered' event
 * from src/features/ask/ask.js; again a minute later, when the server's 60 s cache has
 * turned over). Nothing is printed; screen readers get "Ask Dottie credit about N% left".
 * The clock shows from 1360 px wide; the gauge is part of it and follows it.
 * window.DKLAFuel.refresh() fetches now and .state() reports what is drawn (used by the tests). */
(() => {
  'use strict';
  const clock = document.querySelector('.study-header .ny-clock');
  if (!clock || typeof fetch !== 'function') return;

  const NS = 'http://www.w3.org/2000/svg';
  const EVERY = 5 * 60_000,
    AFTER_CACHE = 65_000;
  // Thresholds: below these shares the line turns amber, then red-orange.
  const LOW = 0.25,
    EMPTYING = 0.1;
  const calm = matchMedia('(prefers-reduced-motion: reduce)');

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ny-fuel');
  // The clock is role="img", so anything inside it is hidden from screen readers; the label
  // they hear is the element after the clock (below). The ring itself is decoration.
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const id = 'nyFuelSweep';
  svg.innerHTML =
    `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="0">` +
    '<stop class="ny-fuel-a" offset="0"/><stop class="ny-fuel-a" offset="0.38"/>' +
    '<stop class="ny-fuel-b" offset="0.48"/><stop class="ny-fuel-a" offset="0.58"/>' +
    '<stop class="ny-fuel-c" offset="1"/></linearGradient></defs>' +
    '<path class="ny-fuel-track"/><path class="ny-fuel-lit"/>';
  clock.append(svg);
  clock.classList.add('has-fuel');
  const gradient = svg.querySelector('linearGradient');
  const track = svg.querySelector('.ny-fuel-track');
  const lit = svg.querySelector('.ny-fuel-lit');
  lit.setAttribute('stroke', `url(#${id})`);

  const label = document.createElement('span');
  label.className = 'ny-fuel-label';
  label.setAttribute('role', 'img');
  clock.after(label);

  let state = { calibrated: false, fraction: null, updatedAt: null, level: 'uncalibrated' },
    length = 0,
    width = 0;

  // The frame's outline, through the middle of the clock's 1 px border, from the top centre clockwise.
  function outline(w, h) {
    const e = 0.5,
      r = Math.max(0, Math.min(parseFloat(getComputedStyle(clock).borderTopLeftRadius) || 8, h / 2) - e),
      right = w - e,
      bottom = h - e,
      mid = w / 2;
    return (
      `M ${mid} ${e} H ${right - r} A ${r} ${r} 0 0 1 ${right} ${e + r} V ${bottom - r} ` +
      `A ${r} ${r} 0 0 1 ${right - r} ${bottom} H ${e + r} A ${r} ${r} 0 0 1 ${e} ${bottom - r} ` +
      `V ${e + r} A ${r} ${r} 0 0 1 ${e + r} ${e} H ${mid}`
    );
  }

  // The bright sweep that runs across the line, as on the version label (5 s a pass).
  let sweep;
  function motion() {
    sweep?.remove();
    sweep = null;
    // Still (reduced motion): the face fading to the deep end across the frame, without the white
    // band, which would wash out the amber and red-orange of a short line at the top.
    gradient.setAttribute('gradientTransform', `translate(${-1.81 * width} 0)`);
    if (calm.matches || !width) return;
    sweep = document.createElementNS(NS, 'animateTransform');
    sweep.setAttribute('attributeName', 'gradientTransform');
    sweep.setAttribute('type', 'translate');
    sweep.setAttribute('from', `${-1.6 * width} 0`);
    sweep.setAttribute('to', `${1.1 * width} 0`);
    sweep.setAttribute('dur', '5s');
    sweep.setAttribute('repeatCount', 'indefinite');
    gradient.append(sweep);
    try {
      svg.setCurrentTime?.(0);
    } catch {}
  }

  function layout() {
    const w = clock.offsetWidth,
      h = clock.offsetHeight;
    if (!w || !h) return;
    const d = outline(w, h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    track.setAttribute('d', d);
    lit.setAttribute('d', d);
    length = lit.getTotalLength();
    // The sweep's gradient spans the frame twice over so the bright band crosses it.
    gradient.setAttribute('x1', String(w * 0.25));
    gradient.setAttribute('x2', String(w * 2.85));
    if (w !== width) {
      width = w;
      motion();
    }
    draw();
  }

  function draw() {
    const { calibrated, fraction } = state;
    const level = !calibrated
      ? 'uncalibrated'
      : fraction < EMPTYING
        ? 'empty'
        : fraction < LOW
          ? 'low'
          : 'ok';
    state.level = level;
    svg.dataset.level = level;
    const shown = calibrated ? Math.min(1, Math.max(0, fraction)) : 0;
    // A gap longer than the outline, so nothing wraps round to the start.
    lit.style.strokeDasharray = length ? `${shown * length} ${length + 1}` : '0 1';
    const percent = Math.round(shown * 100);
    const words = calibrated
      ? `Ask Dottie credit about ${percent}% left`
      : 'Ask Dottie credit gauge not set up yet';
    label.setAttribute('aria-label', words);
    clock.title = calibrated ? `Ask Dottie credit: about ${percent}% left` : '';
  }

  let lastFetch = 0,
    inflight = null,
    later;
  function refresh() {
    lastFetch = Date.now();
    inflight ??= fetch('/api/fuel', { credentials: 'omit', cache: 'no-cache' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data || typeof data.calibrated !== 'boolean') return;
        const fraction = Number(data.fraction);
        state = {
          calibrated: data.calibrated && data.fraction !== null && Number.isFinite(fraction),
          fraction: data.calibrated && Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : null,
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
          level: state.level,
        };
        draw();
      })
      .catch(() => {})
      .finally(() => (inflight = null));
    return inflight;
  }

  new ResizeObserver(layout).observe(clock);
  calm.addEventListener?.('change', motion);
  setInterval(() => {
    if (!document.hidden) refresh();
  }, EVERY);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastFetch >= EVERY) refresh();
  });
  document.addEventListener('dkla:ask-answered', () => {
    setTimeout(refresh, 1500);
    clearTimeout(later);
    later = setTimeout(refresh, AFTER_CACHE);
  });
  layout();
  draw();
  refresh();
  window.DKLAFuel = Object.freeze({
    refresh,
    state: () => ({ ...state, length, lit: length ? parseFloat(lit.style.strokeDasharray) || 0 : 0 }),
  });
})();
