/* Reveal the atlas only after the current runtime has painted its first view.
   The head curtain uses dkla-boot-ready, independently of legacy r20 timers. */
(() => {
  'use strict';
  if (window.DKLABoot) return;
  const root = document.documentElement;
  const boot = (window.DKLABoot = { ready: false });
  let parsed = document.readyState !== 'loading',
    prepared = false,
    waitingFrame = false,
    painted = false,
    retryTimer = 0;
  if (window.R18?.afterDraw)
    R18.afterDraw.push(() => {
      if (!boot.ready) painted = true;
    });

  function available() {
    const release = document.querySelector('#atlasHome .dkla-release');
    return (
      parsed &&
      window.LegalAtlas?.ready &&
      root.classList.contains('r20-ready') &&
      root.classList.contains('geography-locked') &&
      window.DKLAHomeFit?.ready &&
      window.DKLANativeHome?.ready &&
      release?.textContent === window.DKLABriefs?.data.version &&
      typeof draw === 'function'
    );
  }
  function currentMark() {
    if (document.querySelector('#geoCanvas svg[viewBox="0 0 244 78"]')) return false;
    const mark = document.querySelector('#geoCanvas .dkla-map-monogram');
    return !mark || mark.dataset.r20 === '1';
  }
  function retry() {
    if (!retryTimer)
      retryTimer = setTimeout(() => {
        retryTimer = 0;
        check();
      }, 80);
  }
  function check() {
    if (boot.ready || waitingFrame) return;
    if (!available()) {
      retry();
      return;
    }
    if (!prepared) {
      // These exposed layers are idempotent and preserve the owner's prose,
      // notes, ratings and current route. Do not rerun import/layout installers.
      for (const layer of [
        window.DKLABriefs,
        window.DKLAPlain,
        window.DKLAAudit,
        window.DKLAPracticeFilter,
        window.DKLAGeography,
      ])
        layer?.apply?.();
      // v2.7: the other content layers register their second pass here instead of running it on a fixed
      // timer after the atlas is visible, so nothing rewrites text the reader has started on.
      for (const fn of window.DKLALayers || [])
        try {
          fn();
        } catch {
          /* a layer that cannot run again changes nothing */
        }
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
        if (!available() || !painted || !currentMark()) {
          retry();
          return;
        }
        window.DKLANativeHome.refresh();
        boot.ready = true;
        root.classList.add('dkla-boot-ready');
        document.getElementById('dklaBootNotice')?.remove();
        openDeepLink();
      });
    });
  }
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      parsed = true;
      check();
    },
    { once: true },
  );
  // v2.7: a link to an entry (#node=…) opened the course but not the entry, because the home
  // layers that run during boot reset the selection after the runtime had opened it.
  function openDeepLink() {
    const h = decodeURIComponent(location.hash || '');
    if (!h.startsWith('#node=')) return;
    const id = h.slice(6);
    if (typeof nodesById === 'undefined' || !nodesById.has(id)) return;
    if (typeof selected !== 'undefined' && selected && selected.type === 'node' && selected.id === id) return;
    try {
      goNode(id, true);
    } catch {
      /* the entry stays closed; the course is still shown */
    }
  }
  // Slow storage or a failed layer must not expose an older interface just
  // because six seconds elapsed. Offer a reload while retaining the curtain.
  // v2.7: the notice waits for a stall, not for a fixed twelve seconds, because a phone or an older
  // laptop can take longer than that on an ordinary load and was being told to reload a page that was
  // about to finish. Progress is any of the readiness conditions becoming true.
  const progress = { count: -1, stalledFor: 0 };
  function readinessCount() {
    return [
      parsed,
      !!window.LegalAtlas?.ready,
      root.classList.contains('r20-ready'),
      root.classList.contains('geography-locked'),
      !!window.DKLAHomeFit?.ready,
      !!window.DKLANativeHome?.ready,
      document.querySelector('#atlasHome .dkla-release')?.textContent === window.DKLABriefs?.data.version,
      typeof draw === 'function',
    ].filter(Boolean).length;
  }
  const TICK = 2000,
    STALL = 12000;
  function delayedNotice() {
    if (boot.ready) return;
    const n = readinessCount();
    progress.stalledFor = n === progress.count ? progress.stalledFor + TICK : 0;
    progress.count = n;
    if (document.hidden || progress.stalledFor < STALL) {
      setTimeout(delayedNotice, TICK);
      return;
    }
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
  progress.count = readinessCount();
  setTimeout(delayedNotice, TICK);
  check();
})();
