/* Cold vapor settles under the rim of every Cold Call button.
 *
 * Eighteen soft puffs per button drift down and fade. Each puff is a small element showing one of
 * four textures painted once at start-up; its drift and fade are one CSS animation of transform and
 * opacity (frost.css), which the browser's compositor runs by itself. So the vapour costs no script,
 * no style work and no layout while it moves (before v3.2 a canvas was redrawn from
 * requestAnimationFrame, 60 callbacks a second for as long as a case was open). It moves only while
 * its button is on screen, and stands still while the tab is hidden, a dialog covers it or the map
 * is moving (calm.css).
 *
 * Buttons are found in the reader (one observer on #inspector's children) and in open dialogs
 * (looked at after anything a visitor does, DKLACalm.after); nothing watches the whole page. */
(() => {
  'use strict';
  const selector = 'button[data-cold-call]',
    motion = matchMedia('(prefers-reduced-motion: reduce), (update: slow), (forced-colors: active)'),
    states = new Map();
  const PAD_X = 6,
    PAD_TOP = 0,
    PAD_BOTTOM = 18,
    PARTICLES = 18;
  let installed = false,
    intersections,
    mutations;
  const rand = (a, b) => a + Math.random() * (b - a);

  // Soft, irregular vapor textures are painted once and reused. No image download or pixel readback.
  function textures() {
    return Array.from({ length: 4 }, (_, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const lobes = 6;
      for (let i = 0; i < lobes; i++) {
        const angle = (i / lobes) * Math.PI * 2 + index * 0.7,
          spread = rand(7, 17),
          x = 64 + Math.cos(angle) * spread,
          y = 64 + Math.sin(angle) * spread * 0.7,
          r = rand(26, 35);
        const mist = ctx.createRadialGradient(x, y, 0, x, y, r);
        mist.addColorStop(0, 'rgba(219,237,243,.14)');
        mist.addColorStop(0.3, 'rgba(205,228,238,.08)');
        mist.addColorStop(0.65, 'rgba(197,220,233,.025)');
        mist.addColorStop(1, 'rgba(197,220,233,0)');
        ctx.fillStyle = mist;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // A gradual circular envelope avoids visible puff outlines or polygon edges.
      ctx.globalCompositeOperation = 'destination-in';
      const envelope = ctx.createRadialGradient(64, 64, 8, 64, 64, 57);
      envelope.addColorStop(0, '#fff');
      envelope.addColorStop(0.5, '#ffffffb0');
      envelope.addColorStop(1, '#ffffff00');
      ctx.fillStyle = envelope;
      ctx.fillRect(0, 0, 128, 128);
      return canvas;
    }).filter(Boolean);
  }
  // The four textures become four background images, written into the page once.
  function publish(sprites) {
    const style = document.createElement('style');
    style.dataset.coldVapor = '';
    style.textContent = sprites
      .map((canvas, i) => `.cc-cold-vapor i[data-mist="${i}"]{background-image:url(${canvas.toDataURL()})}`)
      .join('');
    document.head.appendChild(style);
    return sprites.length;
  }
  let kinds = 0;
  // One puff: where it starts under the rim, how far it drifts and sinks, how big, how long it
  // lives. A negative delay starts each one part-way through its life, so they never arrive together.
  function particle(state) {
    const life = rand(4.2, 6.2),
      size = rand(30, 46),
      x = PAD_X + rand(6, Math.max(6, state.width - 6)),
      y = PAD_TOP + state.height + rand(-1, 1.5);
    const puff = document.createElement('i');
    puff.dataset.mist = Math.floor(rand(0, kinds));
    puff.style.cssText =
      `width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;` +
      `left:${(-size / 2).toFixed(1)}px;top:${(-size / 2).toFixed(1)}px;` +
      `--x:${x.toFixed(1)}px;--y:${y.toFixed(1)}px;` +
      // A shorter fall and a fainter puff than the old canvas drew, which dimmed its lower half
      // with a feathered mask: together they give the same thin mist under the rim.
      `--dx:${rand(-6, 6).toFixed(1)}px;--dy:${rand(3, 7).toFixed(1)}px;` +
      `--o:${rand(0.17, 0.26).toFixed(3)};` +
      `animation-duration:${life.toFixed(2)}s;animation-delay:${(-rand(0, life)).toFixed(2)}s`;
    return puff;
  }
  function fit(state, width, height) {
    state.width = width;
    state.height = height;
    const { box } = state;
    box.style.width = width + PAD_X * 2 + 'px';
    box.style.height = height + PAD_TOP + PAD_BOTTOM + 'px';
    box.replaceChildren(...Array.from({ length: PARTICLES }, () => particle(state)));
  }
  function initialize(state, rect) {
    if (state.box) return;
    const box = document.createElement('span');
    box.className = 'cc-cold-vapor';
    box.setAttribute('aria-hidden', 'true');
    state.box = box;
    state.button.appendChild(box);
    fit(state, rect.width, rect.height);
    if (typeof ResizeObserver === 'function') {
      state.resize = new ResizeObserver(() => {
        const rect = state.button.getBoundingClientRect();
        if (
          rect.width > 0 &&
          (Math.abs(rect.width - state.width) > 0.5 || Math.abs(rect.height - state.height) > 0.5)
        )
          fit(state, rect.width, rect.height);
      });
      state.resize.observe(state.button);
    }
  }
  function register(button) {
    if (states.has(button)) return;
    const state = { button };
    states.set(button, state);
    intersections.observe(button);
  }
  function forget() {
    for (const [button, state] of states)
      if (!button.isConnected) {
        intersections.unobserve(button);
        state.resize?.disconnect();
        states.delete(button);
      }
  }
  function scan() {
    for (const button of document.querySelectorAll(`#inspector ${selector}, dialog[open] ${selector}`))
      register(button);
    forget();
  }
  function install() {
    if (installed || motion.matches || typeof IntersectionObserver !== 'function') return;
    const sprites = textures();
    if (!sprites.length) return;
    kinds = publish(sprites);
    installed = true;
    intersections = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const state = states.get(entry.target);
        if (!state) continue;
        const on = entry.isIntersecting && entry.boundingClientRect.width > 0;
        if (on) initialize(state, entry.boundingClientRect);
        // Puffs move only while their button is on screen.
        state.box?.classList.toggle('cc-on', on);
      }
    });
    scan();
    const reader = document.getElementById('inspector');
    if (reader && typeof MutationObserver === 'function') {
      mutations = new MutationObserver(scan);
      mutations.observe(reader, { childList: true, subtree: true });
    }
    window.DKLACalm?.after(scan);
  }
  motion.addEventListener('change', install);
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
