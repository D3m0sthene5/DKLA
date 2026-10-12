/* Preserve the native Atlas renderer. Only the existing center mark links to
   private analytics; no replacement home, label system or geography is added. */
(() => {
  'use strict';
  if (window.DKLANativeHome) return;
  const state = window.DKLANativeHome = { ready: false, refresh };
  function refresh() {
    const canvas = document.getElementById('geoCanvas');
    if (!canvas || typeof S === 'undefined') return;
    canvas.dataset.dklaHomeView = JSON.stringify({ scope:S.scope, region:S.region, district:S.district,
      selected:!!selected, x:S.x, y:S.y, z:S.z });
    const mark = canvas.querySelector('.dkla-map-monogram');
    if (!mark || mark.closest('a[data-dkla-analytics]')) return;
    const link = document.createElementNS('http://www.w3.org/2000/svg','a');
    link.setAttribute('href','https://dkla.dev');
    link.setAttribute('data-dkla-analytics','');
    link.setAttribute('aria-label','Open private DKLA analytics');
    link.setAttribute('tabindex','0');
    link.addEventListener('click',event=>event.stopPropagation());
    link.addEventListener('pointerdown',event=>event.stopPropagation());
    mark.replaceWith(link); link.append(mark);
  }
  function install() {
    if (!window.LegalAtlas?.ready || !window.R18?.afterDraw) { setTimeout(install,80); return; }
    R18.afterDraw.push(refresh);
    state.ready = true;
    refresh();
  }
  install();
})();
