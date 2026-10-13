/* Reveal the atlas only after the current runtime has painted its first view.
   The head curtain uses dkla-boot-ready, independently of legacy r20 timers. */
(() => {
  'use strict';
  if (window.DKLABoot) return;
  const root = document.documentElement;
  const boot = window.DKLABoot = { ready: false };
  let parsed = document.readyState !== 'loading', prepared = false, waitingFrame = false, painted = false, retryTimer = 0;
  if (window.R18?.afterDraw) R18.afterDraw.push(() => { if (!boot.ready) painted = true; });

  function available() {
    const release = document.querySelector('#atlasHome .dkla-release');
    return parsed && window.LegalAtlas?.ready && root.classList.contains('r20-ready') &&
      root.classList.contains('geography-locked') && window.DKLAHomeFit?.ready && window.DKLANativeHome?.ready &&
      release?.textContent === window.DKLABriefs?.data.version &&
      typeof draw === 'function';
  }
  function currentMark() {
    if (document.querySelector('#geoCanvas svg[viewBox="0 0 244 78"]')) return false;
    const mark = document.querySelector('#geoCanvas .dkla-map-monogram');
    return !mark || mark.dataset.r20 === '1';
  }
  function retry() {
    if (!retryTimer) retryTimer = setTimeout(() => { retryTimer = 0; check(); }, 80);
  }
  function check() {
    if (boot.ready || waitingFrame) return;
    if (!available()) { retry(); return; }
    if (!prepared) {
      // These exposed layers are idempotent and preserve the owner's prose,
      // notes, ratings and current route. Do not rerun import/layout installers.
      for (const layer of [window.DKLABriefs, window.DKLAPlain, window.DKLAAudit,
        window.DKLAPracticeFilter, window.DKLAGeography]) layer?.apply?.();
      renderHeading();
      renderInspector();
      window.DKLANativeHome.refresh();
      prepared = true;
    }
    waitingFrame = true;
    requestAnimationFrame(() => {
      painted = false;
      draw();
      // Let the native logo observer complete
      // before any content becomes visible, including on a hash/deep link.
      requestAnimationFrame(() => {
        waitingFrame = false;
        if (!available() || !painted || !currentMark()) { retry(); return; }
        window.DKLANativeHome.refresh();
        boot.ready = true;
        root.classList.add('dkla-boot-ready');
        document.getElementById('dklaBootNotice')?.remove();
      });
    });
  }
  document.addEventListener('DOMContentLoaded', () => { parsed = true; check(); }, { once: true });
  // Slow storage or a failed layer must not expose an older interface just
  // because six seconds elapsed. Offer a reload while retaining the curtain.
  function delayedNotice() {
    if (boot.ready) return;
    if (document.hidden) { setTimeout(delayedNotice, 2000); return; }
    if (document.getElementById('dklaBootNotice')) return;
    const notice = document.createElement('section');
    notice.id = 'dklaBootNotice';
    notice.setAttribute('role', 'status');
    notice.append('The atlas is taking longer to load. ');
    const reload = document.createElement('a');
    reload.textContent = 'Reload';
    reload.href = location.href;
    notice.append(reload);
    document.body.append(notice);
  }
  setTimeout(delayedNotice, 12000);
  check();
})();
