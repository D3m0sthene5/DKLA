/* Preserve the native Atlas renderer. Only the existing center mark links to
   private analytics; no replacement home, label system or geography is added. */
(() => {
  'use strict';
  if (window.DKLANativeHome) return;
  const state = (window.DKLANativeHome = { ready: false, refresh });
  function refresh() {
    const canvas = document.getElementById('geoCanvas');
    if (!canvas || typeof S === 'undefined') return;
    canvas.dataset.dklaHomeView = JSON.stringify({
      scope: S.scope,
      region: S.region,
      district: S.district,
      selected: !!selected,
      x: S.x,
      y: S.y,
      z: S.z,
    });
    if (S.scope !== 'Atlas' || S.region || S.district || selected || S.panelOpen) return;
    const mark = canvas.querySelector('.dkla-map-monogram');
    if (!mark) return;
    let link = mark.closest('a[data-dkla-analytics]');
    if (!link) {
      link = document.createElementNS('http://www.w3.org/2000/svg', 'a');
      link.setAttribute('href', 'https://dkla.dev/admin?reauth=1');
      link.setAttribute('data-dkla-analytics', '');
      link.setAttribute('aria-label', 'Open private DKLA analytics');
      link.setAttribute('tabindex', '0');
      link.style.cursor = 'pointer';
      link.addEventListener('click', (event) => event.stopPropagation());
      link.addEventListener('pointerdown', (event) => event.stopPropagation());
      // The original SVG deliberately ignores pointer events. A transparent
      // rectangle in its existing slot makes the link work without restyling it.
      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      hit.setAttribute('data-native-logo-hit', '');
      hit.setAttribute('fill', 'transparent');
      hit.setAttribute('stroke', 'none');
      hit.setAttribute('pointer-events', 'all');
      hit.setAttribute('aria-hidden', 'true');
      mark.replaceWith(link);
      link.append(hit, mark);
    }
    const hit = link.querySelector('[data-native-logo-hit]');
    for (const name of ['x', 'y', 'width', 'height'])
      if (hit.getAttribute(name) !== mark.getAttribute(name)) hit.setAttribute(name, mark.getAttribute(name));
  }
  function install() {
    if (!window.LegalAtlas?.ready || !window.R18?.afterDraw) {
      setTimeout(install, 80);
      return;
    }
    R18.afterDraw.push(refresh);
    state.ready = true;
    refresh();
  }
  install();
})();
