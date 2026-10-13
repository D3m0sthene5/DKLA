/* Reuse the current owner mark for history/analytics consumers. The immutable
   history layer still contains its old cube; no historical source is edited. */
(() => {
  'use strict';
  if (window.DKLAIdentity) return;
  let serial = 0;
  const identity = (window.DKLAIdentity = { ready: false, mark, refresh });
  function headerMark() {
    const svg = document.querySelector('#atlasHome .dkla-header-monogram');
    return svg?.querySelector('.dkla-letter-d[data-r21-shaped]') ? svg : null;
  }
  function mark() {
    const source = headerMark();
    if (!source) return '';
    const svg = source.cloneNode(true),
      prefix = 'dklaIdentity' + ++serial + '-';
    const ids = new Map();
    for (const el of svg.querySelectorAll('[id]')) {
      ids.set(el.id, prefix + el.id);
      el.id = prefix + el.id;
    }
    for (const el of svg.querySelectorAll('[clip-path]')) {
      const original = el.getAttribute('clip-path').match(/^url\(#(.+)\)$/)?.[1];
      if (ids.has(original)) el.setAttribute('clip-path', 'url(#' + ids.get(original) + ')');
    }
    svg.setAttribute('class', 'dkla-monogram dkla-current-identity');
    svg.removeAttribute('aria-hidden');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'DKLA — Danny Kind Legal Atlas');
    svg.setAttribute('width', '78');
    svg.setAttribute('height', '78');
    return svg.outerHTML;
  }
  function refresh() {
    if (!identity.ready) return;
    const shell = document.getElementById('shShell');
    if (!shell) return;
    for (const old of shell.querySelectorAll('svg[viewBox="0 0 244 78"]')) {
      const markup = mark();
      if (markup) old.outerHTML = markup;
    }
  }
  function install() {
    if (!window.SCOTUSHistory || !headerMark()) {
      setTimeout(install, 80);
      return;
    }
    // A getter supplies distinct clipping IDs for each dynamic insertion.
    Object.defineProperty(window.SCOTUSHistory, 'logo', { configurable: true, enumerable: true, get: mark });
    identity.ready = true;
    const shell = document.getElementById('shShell');
    if (shell) new MutationObserver(refresh).observe(shell, { childList: true, subtree: true });
    refresh();
  }
  install();
})();
