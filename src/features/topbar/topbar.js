/* A calmer top bar (owner, 12 November 2026): "all the buttons on the right are so busy and so useless
   ... if you just replaced them with the flavor text that would be so much better".

   Save, Study, SCOTUS and Privacy leave the bar; their space becomes a slot for the splash line
   (src/features/splash/), beside the clock and Dottie. Nothing is lost: "More" becomes one small menu
   button at the right end, and its menu now starts with Save a backup, Study, SCOTUS History and
   Privacy. The original buttons stay in the page, hidden, so every existing handler keeps working. */
(() => {
  'use strict';
  const header = document.querySelector('header.study-header');
  const more = document.getElementById('moreBtn');
  if (!header || !more || header.dataset.calmBar) return;
  header.dataset.calmBar = '1';
  document.documentElement.classList.add('dkla-calm-bar');

  // The splash line's place in the bar: between the clock and the menu button.
  const slot = document.createElement('div');
  slot.className = 'dkla-splash-slot';
  slot.setAttribute('aria-hidden', 'true');
  header.insertBefore(slot, document.getElementById('saveBtn') || more);

  // "More" becomes a compact menu button; its id and handlers are unchanged.
  more.classList.add('dkla-menu-button');
  more.setAttribute('aria-label', 'Menu');
  more.title = 'Menu: save a backup, study, SCOTUS History, privacy and more';
  more.innerHTML = '<span class="dkla-menu-icon" aria-hidden="true"><i></i><i></i><i></i></span>';

  const items =
    '<small>DKLA</small>' +
    '<button role="menuitem" data-dkla-top="save">Save a backup</button>' +
    '<button role="menuitem" data-r18-open="drill">Study</button>' +
    '<button role="menuitem" data-sh-open="1">SCOTUS History</button>' +
    '<button role="menuitem" data-dkla-top="privacy">Privacy</button><hr>';
  if (typeof moreMenu === 'function') {
    const prior = moreMenu;
    moreMenu = function (...args) {
      const out = prior.apply(this, args);
      const menu = document.getElementById('moreMenu');
      if (menu && !menu.hidden && !menu.querySelector('[data-dkla-top]'))
        menu.insertAdjacentHTML('afterbegin', items);
      return out;
    };
  }
  // Off the main view (zoomed in from it, a course or subject, a reader or a panel): the hanging Dottie
  // steps away so she never covers the map (ask.css, .dkla-off-home).
  const root = document.documentElement;
  setInterval(() => {
    if (typeof S === 'undefined' || !S) return;
    const home =
      S.scope === 'Atlas' &&
      !S.region &&
      !S.district &&
      !S.panelOpen &&
      !(typeof selected !== 'undefined' && selected);
    const z = window.DKLAHomeFit?.homeZoom?.() || 0;
    const off = !home || (z > 0 && S.z > z * 1.04);
    if (root.classList.contains('dkla-off-home') !== off) root.classList.toggle('dkla-off-home', off);
  }, 200);
  document.addEventListener('click', (e) => {
    const item = e.target.closest('#moreMenu [data-dkla-top]');
    if (!item) return;
    if (typeof dismissMenu === 'function') dismissMenu();
    if (item.dataset.dklaTop === 'save') document.getElementById('saveBtn')?.click();
    else if (item.dataset.dklaTop === 'privacy') window.open('/privacy.html', '_blank', 'noopener');
  });
})();
