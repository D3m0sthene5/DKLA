/* DKLA r17: original, interlocked D K L A vector identity. */
(() => {
  'use strict';

  // The D is the outside contour; its stem doubles as K and L. K crosses the
  // center, the L resolves into the base, and the A occupies the right counter.
  // The four course-palette strokes remain discernible in the 28 px header mark.
  const paths = '<path class="dkla-letter-d" d="M22 13H44C71 13 86 29 86 50S71 87 44 87H22V13Z"/>' +
    '<path class="dkla-letter-k" d="M22 52 56 17M22 52 58 86"/>' +
    '<path class="dkla-letter-l" d="M22 85H54"/>' +
    '<path class="dkla-letter-a" d="M52 85 72 28 91 85M59 65H82"/>';

  const mark = (extraClass = '') =>
    `<svg class="dkla-mark dkla-monogram ${extraClass}" viewBox="0 0 104 104" aria-hidden="true" focusable="false">${paths}</svg>`;

  const header = document.getElementById('atlasHome');
  if (header) {
    header.innerHTML = `${mark('dkla-header-monogram')}<span class="dkla-wordmark">DKLA<small>DANNY KIND LEGAL ATLAS</small></span>`;
    header.setAttribute('aria-label', 'DKLA — Danny Kind Legal Atlas. Open the atlas.');
  }

  function replaceMapMark() {
    // r16 adds this SVG on every map draw. Replace only that large wordmark;
    // its parent group still handles the floor-zoom fade and pointer events.
    const oldMark = document.querySelector('#geoCanvas svg[viewBox="0 0 244 78"]');
    if (!oldMark) return;
    oldMark.setAttribute('viewBox', '0 0 104 104');
    oldMark.setAttribute('x', '-3100');
    oldMark.setAttribute('y', '-4200');
    oldMark.setAttribute('width', '6200');
    oldMark.setAttribute('height', '3400');
    oldMark.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    oldMark.setAttribute('class', 'dkla-monogram dkla-map-monogram');
    oldMark.setAttribute('aria-hidden', 'true');
    oldMark.innerHTML = paths;
  }

  function install() {
    if (!window.SCOTUSHistory || typeof draw !== 'function') {
      setTimeout(install, 80);
      return;
    }
    const previousDraw = draw;
    draw = function (...args) {
      const result = previousDraw.apply(this, args);
      replaceMapMark();
      return result;
    };
    replaceMapMark();
  }
  install();
})();
