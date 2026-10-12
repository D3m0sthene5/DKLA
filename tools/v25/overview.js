/* Atlas home is a compact navigation surface. The real course geography,
   source routes, owner text and native navigation history remain untouched. */
(() => {
  'use strict';
  const LRS = 'Legislation and the Regulatory State';
  const destinations = [
    { key: 'contracts', title: 'Contracts', course: 'Contracts', type: 'course' },
    { key: 'civil', title: 'Civil Procedure', course: 'Civil Procedure', type: 'course' },
    { key: 'lrs', title: LRS, course: LRS, type: 'course' },
    { key: 'authorities', title: 'Rules & authorities', detail: 'Constitution, rules and codes', type: 'reference' },
    { key: 'history', title: 'SCOTUS history', detail: 'Justices and decisions', type: 'reference' },
    { key: 'notes', title: 'Study notes', detail: 'Your workbench', type: 'reference' },
    { key: 'dictionary', title: 'Dictionary', detail: 'Legal terms from A to Z', type: 'dictionary' },
  ];
  const byKey = new Map(destinations.map(d => [d.key, d]));
  let surface = null, installed = false, markSignature = '', lastDestination = 'contracts', dragStart = null, dragged = false;
  let previousHint = null, previousActive = false, markSerial = 0;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = key => {
    const paths = {
      contracts: '<path d="M5 6h22v22H5zM11 12h10M11 17h10M11 22h6"/><path d="m23 23 4-4 3 3-4 4z"/>',
      civil: '<path d="M5 6h8v7H5zM19 6h8v7h-8zM12 22h8v7h-8zM9 13v4h14v-4M16 17v5"/>',
      lrs: '<path d="M4 8h24M7 8v16M16 8v16M25 8v16M4 25h24M8 4h16"/>',
      authorities: '<path d="M5 5h7v24H5zM14 3h7v26h-7zM23 8h5v21h-5zM7 10h3M16 9h3M25 13h1"/>',
      history: '<path d="m3 10 13-7 13 7H3zM5 27h22M8 12v12M16 12v12M24 12v12M4 30h24"/>',
      notes: '<path d="M6 4h18v25H6zM10 10h10M10 15h6M10 20h4"/><path d="m18 25 10-10 3 3-10 10-4 1z"/>',
    };
    return `<svg class="atlas-overview-icon" viewBox="0 0 34 34" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${paths[key] || ''}</svg>`;
  };
  function active() {
    return typeof S !== 'undefined' && S.scope === 'Atlas' && !S.region && !S.district &&
      !(typeof selected !== 'undefined' && selected) && !S.panelOpen && !window.SCOTUSHistory?.state?.().open;
  }
  function modalOpen() { return !!document.querySelector('dialog[open]'); }
  function currentDestination() {
    const button = document.activeElement?.closest?.('[data-atlas-destination]');
    return button?.dataset.atlasDestination || lastDestination;
  }
  function navigate(key) {
    const d = byKey.get(key); if (!d) return false;
    lastDestination = key;
    if (d.course) home(d.course);
    else if (key === 'dictionary') goRegion('dictionary-region');
    else if (key === 'authorities') window.DKLAAuthorities?.open();
    else if (key === 'history') window.SCOTUSHistory?.open();
    else if (key === 'notes') goRegion('workbench-region');
    refresh();
    return true;
  }
  function cloneCurrentMark() {
    if (!surface) return false;
    const source = document.querySelector('#atlasHome .dkla-header-monogram');
    if (!source?.querySelector('.dkla-letter-d[data-r21-shaped]')) return false;
    const signature = source.outerHTML;
    if (signature === markSignature) return true;
    const copy = source.cloneNode(true), prefix = 'atlas-overview-mark-' + (++markSerial) + '-';
    const ids = new Map([...copy.querySelectorAll('[id]')].map(el => [el.id, prefix + el.id]));
    for (const el of copy.querySelectorAll('*')) {
      if (el.id && ids.has(el.id)) el.id = ids.get(el.id);
      for (const attr of [...el.attributes]) {
        let value = attr.value;
        for (const [oldId, nextId] of ids) {
          value = value.split('url(#' + oldId + ')').join('url(#' + nextId + ')');
          if ((attr.name === 'href' || attr.name === 'xlink:href') && value === '#' + oldId) value = '#' + nextId;
        }
        if (value !== attr.value) el.setAttribute(attr.name, value);
      }
    }
    copy.removeAttribute('id'); copy.removeAttribute('width'); copy.removeAttribute('height'); copy.removeAttribute('style');
    copy.setAttribute('class', 'dkla-monogram atlas-overview-monogram');
    copy.setAttribute('aria-hidden', 'true'); copy.setAttribute('focusable', 'false');
    surface.querySelector('.atlas-overview-mark').replaceChildren(copy);
    markSignature = signature;
    return true;
  }
  function refresh() {
    if (!surface) return false;
    const on = active(), wasHidden = surface.hidden;
    surface.hidden = !on;
    document.body.classList.toggle('atlas-overview-active', on);
    if (on && wasHidden) {
      const focus = document.activeElement;
      if (focus && document.getElementById('geoCanvas')?.contains(focus)) surface.querySelector('[data-atlas-destination]')?.focus({ preventScroll: true });
    }
    const hint = document.getElementById('mapHint');
    if (hint) {
      if (on) {
        if (!previousActive) previousHint = hint.textContent;
        if (hint.textContent !== 'Choose a destination') hint.textContent = 'Choose a destination';
      } else if (previousActive && previousHint !== null && hint.textContent !== previousHint) hint.textContent = previousHint;
    }
    previousActive = on;
    const count = window.DKLA?.glossaryCount?.(), description = surface.querySelector('[data-dictionary-count]');
    if (description) description.textContent = Number.isFinite(count) && count > 0 ? count.toLocaleString() + ' legal terms · A–Z' : 'Legal terms from A to Z';
    const shaped = cloneCurrentMark();
    window.DKLAOverview.ready = shaped;
    return on;
  }
  function moveFocus(event) {
    const button = event.target.closest?.('[data-atlas-destination]');
    if (!button || !/^Arrow(Left|Right|Up|Down)$/.test(event.key)) return false;
    const r = button.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight', positive = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const choices = [...surface.querySelectorAll('[data-atlas-destination]')].filter(b => b !== button).map(b => {
      const box = b.getBoundingClientRect(), dx = box.x + box.width / 2 - x, dy = box.y + box.height / 2 - y;
      const along = horizontal ? dx : dy, across = horizontal ? dy : dx;
      return { b, along, score: Math.abs(along) + Math.abs(across) * 2 };
    }).filter(c => positive ? c.along > 2 : c.along < -2).sort((a, b) => a.score - b.score);
    if (choices.length) choices[0].b.focus({ preventScroll: true });
    event.preventDefault(); event.stopImmediatePropagation(); return true;
  }
  function install() {
    if (installed) return;
    const host = document.getElementById('studyMain');
    if (!host || !window.LegalAtlas?.ready || !window.DKLAAuthorities?.open || !window.SCOTUSHistory?.open || typeof home !== 'function' || typeof draw !== 'function' || typeof S === 'undefined' || typeof window.DKLADictionaryPortal !== 'function') { setTimeout(install, 80); return; }
    installed = true;
    surface = document.createElement('section'); surface.id = 'atlasOverview'; surface.className = 'atlas-overview';
    surface.setAttribute('aria-label', 'Danny Kind Legal Atlas destinations'); surface.hidden = true;
    surface.innerHTML = `<nav class="atlas-overview-composition" aria-label="Atlas destinations">${destinations.map(d => `<button type="button" class="atlas-overview-portal atlas-overview-${d.key}" data-atlas-destination="${d.key}">${d.type === 'dictionary' ? `<span class="atlas-overview-book">${window.DKLADictionaryPortal()}</span>` : icon(d.key)}<span class="atlas-overview-copy"><strong>${esc(d.title)}</strong>${d.detail ? `<span class="atlas-overview-detail"${d.type === 'dictionary' ? ' data-dictionary-count' : ''}>${esc(d.detail)}</span>` : ''}</span><span class="atlas-overview-arrow" aria-hidden="true">↗</span></button>`).join('')}<div class="atlas-overview-brand" role="img" aria-label="DKLA — Danny Kind Legal Atlas"><span class="atlas-overview-mark"></span><span class="atlas-overview-name">Danny Kind<br>Legal Atlas</span></div></nav>`;
    host.appendChild(surface);
    surface.addEventListener('click', event => {
      const b = event.target.closest('[data-atlas-destination]'); if (!b) return;
      event.preventDefault(); event.stopPropagation();
      if (dragged) { dragged = false; return; }
      navigate(b.dataset.atlasDestination);
    });
    surface.addEventListener('pointerdown', event => { dragStart = { x: event.clientX, y: event.clientY }; dragged = false; });
    surface.addEventListener('pointermove', event => { if (dragStart && Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 12) dragged = true; });
    surface.addEventListener('pointerup', () => { dragStart = null; setTimeout(() => { dragged = false; }, 0); });
    surface.addEventListener('pointercancel', () => { dragStart = null; dragged = false; });
    surface.addEventListener('focusin', event => { const b = event.target.closest('[data-atlas-destination]'); if (b) lastDestination = b.dataset.atlasDestination; });
    surface.addEventListener('pointerover', event => { const b = event.target.closest('[data-atlas-destination]'); if (b) lastDestination = b.dataset.atlasDestination; });
    surface.addEventListener('wheel', event => {
      if (!active() || modalOpen()) return;
      if (event.ctrlKey || event.metaKey) { event.stopImmediatePropagation(); return; }
      event.preventDefault(); event.stopImmediatePropagation();
      const destination = event.target.closest('[data-atlas-destination]')?.dataset.atlasDestination;
      if (event.deltaY < -12 && destination) navigate(destination);
    }, { passive: false });
    document.addEventListener('click', event => {
      if (!active() || modalOpen()) return;
      const id = event.target.closest('button')?.id;
      if (!['studyZoomIn', 'studyZoomOut', 'studyFit'].includes(id)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (id === 'studyZoomIn') navigate(currentDestination()); else refresh();
    }, true);
    document.addEventListener('keydown', event => {
      // Browser zoom shortcuts must not fall through to the older map layer,
      // which interprets these keys without checking their modifiers.
      if (active() && (event.ctrlKey || event.metaKey) && ['+','=','-','0'].includes(event.key)) {
        event.stopImmediatePropagation(); return;
      }
      if (!active() || modalOpen() || event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      if (moveFocus(event)) return;
      if (event.key === '+' || event.key === '=') {
        event.preventDefault(); event.stopImmediatePropagation();
        const destination = event.target.closest?.('[data-atlas-destination]')?.dataset.atlasDestination;
        if (destination) navigate(destination);
      }
      else if (event.key === '-' || event.key === '0') { event.preventDefault(); event.stopImmediatePropagation(); refresh(); }
    }, true);
    // Only presentation is refreshed at native state boundaries. Each original
    // route still owns its camera, history, source lookup and reading behavior.
    // The hidden map's old camera zoom can cross its course-picking threshold
    // on resize. The compact home owns that view; detailed maps still use it.
    const previousAutoScope = autoScope;
    autoScope = function (...args) { if (active()) return; return previousAutoScope.apply(this, args); };
    const wrap = original => function (...args) { const result = original.apply(this, args); refresh(); return result; };
    home = wrap(home); goRegion = wrap(goRegion); goDistrict = wrap(goDistrict); goNode = wrap(goNode);
    back = wrap(back); restoreView = wrap(restoreView); renderInspector = wrap(renderInspector); draw = wrap(draw);
    const header = document.getElementById('atlasHome');
    if (header) new MutationObserver(() => refresh()).observe(header, { childList: true, subtree: true, attributes: true });
    new ResizeObserver(() => refresh()).observe(host);
    refresh();
    if (!window.DKLAOverview.ready) {
      const waitForMark = () => { refresh(); if (!window.DKLAOverview.ready) setTimeout(waitForMark, 80); };
      setTimeout(waitForMark, 80);
    }
  }
  window.DKLAOverview = {
    ready: false, active, refresh, navigate,
    destinations: () => destinations.map(({ key, title, type }) => ({ key, title, type })),
    layout: () => ({ active: active(), ready: window.DKLAOverview.ready, container: surface?.getBoundingClientRect().toJSON(),
      portals: surface ? [...surface.querySelectorAll('[data-atlas-destination]')].map(b => ({ key: b.dataset.atlasDestination, label: b.innerText, box: b.getBoundingClientRect().toJSON() })) : [] }),
  };
  install();
})();
