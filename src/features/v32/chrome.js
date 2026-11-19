/* DKLA v3.2 "Instrument": the frame round everything (docs/DESIGN.md; styles in chrome.css).

   The top bar becomes three groups. Left, where you are: the mark and wordmark (the way Home), then
   the way back and the breadcrumb, which used to float over the map in a card of their own; on Home
   the splash line takes their place. Centre, the command field. Right, the instrument cluster (the
   clock with its fuel ring, the version readout), Ask Dottie and the Library.

   Nothing here draws the map or reads a saved file. It moves existing elements (every id and every
   handler stays), draws the Library's rows and the empty command palette, and keeps the keyboard's
   place in the search list. Nothing runs on a timer: everything follows something a visitor did, or
   a map draw.

     DKLAChrome.library(menu)   draw the Library's rows into the menu (studyCode.js moreMenu calls it)
     DKLAChrome.palette()       draw the empty command palette under the field (studyCode.js showPalette)
     DKLAChrome.rows()          the Library's rows with their counts, for the checks
     DKLAChrome.selected()      the row the keyboard is on in the search list (or null)

   An exported copy of the page carries the built bar with it; building again moves the same
   elements into the same places, so this is safe to run twice. */
(() => {
  'use strict';
  const header = document.querySelector('header.study-header');
  const field = header?.querySelector('.study-search');
  const brand = document.getElementById('atlasHome');
  const more = document.getElementById('moreBtn');
  if (!header || !field || !brand || !more || window.DKLAChrome) return;
  const root = document.documentElement;
  const $ = (id) => document.getElementById(id);
  const E = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const make = (tag, className) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  };
  const count = (n) => (Number.isFinite(n) && n > 0 ? n.toLocaleString('en-US') : '');

  /* ---------- glyphs: one drawing each, 20 px grid, 1.5 px stroke ---------- */
  // A glyph says what kind of thing a row is. The same drawings serve the rows drawn here (inline SVG)
  // and the result rows other modules draw (a CSS mask chosen by the row's data-result-type).
  const GLYPH = {
    chevron: '<path d="M7.5 5l5 5-5 5"/>',
    close: '<path d="M5 5l10 10M15 5L5 15"/>',
    case: '<path d="M10 4v12M6.5 16h7M4 6.5h12M4.6 6.5L2.8 11h3.6zM15.4 6.5L13.6 11h3.6z"/>',
    concept: '<path d="M7.5 13.6a5.2 5.2 0 115 0V15h-5zM8 17.5h4"/>',
    rule: '<path d="M5 4.5v11M8.5 6h7M8.5 10h7M8.5 14h4.5"/>',
    note: '<path d="M5.5 3.5H11L14.5 7v9.5h-9zM11 3.5V7h3.5"/>',
    hypothetical:
      '<circle cx="10" cy="10" r="6.5"/><path d="M8.2 8.2a1.9 1.9 0 112.7 1.7c-.6.3-.9.7-.9 1.4M10 13.7v.1"/>',
    subject: '<path d="M3.5 5.5L8 4l4 1.5L16.5 4v10.5L12 16l-4-1.5-4.5 1.5zM8 4v10.5M12 5.5V16"/>',
    topic:
      '<path d="M10 17s5-4.4 5-8.3a5 5 0 00-10 0C5 12.6 10 17 10 17z"/><circle cx="10" cy="8.7" r="1.7"/>',
    flowchart: '<path d="M7 3.5h6v4H7zM3.5 12.5h5v4h-5zM11.5 12.5h5v4h-5zM10 7.5V10M6 12.5V10h8v2.5"/>',
    timeline:
      '<path d="M3 10h1.5M7.5 10h1M11.5 10h1M15.5 10H17"/><circle cx="6" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="14" cy="10" r="1.5"/>',
    canon:
      '<path d="M10 5.5c-1.6-1-3.6-1.4-6-1.3v10.6c2.4-.1 4.4.3 6 1.3 1.6-1 3.6-1.4 6-1.3V4.2c-2.4-.1-4.4.3-6 1.3zM10 5.5v10.6"/>',
    dictionary:
      '<path d="M5 3.5h10v13H6.2A1.2 1.2 0 015 15.3zM5 14.2c0-.7.5-1.2 1.2-1.2H15M8.3 10.2L10 6l1.7 4.2M8.8 9h2.4"/>',
    lecture: '<path d="M3.5 4.5h13V13h-13zM10 13v3.5M7 16.5h6"/>',
    session: '<path d="M4 5.5h12v11H4zM4 8.5h12M7 3.5v3M13 3.5v3"/>',
    authority: '<path d="M3.5 7.5L10 3.5l6.5 4zM5.5 7.5v7M10 7.5v7M14.5 7.5v7M3.5 16.5h13M4.5 14.5h11"/>',
    scotus: '<path d="M3 16.5h14M4.5 16.5v-6M8 16.5v-6M12 16.5v-6M15.5 16.5v-6M3 10.5h14L10 4z"/>',
    book: '<path d="M5 3.5h10v13H6.2A1.2 1.2 0 015 15.3zM5 14.2c0-.7.5-1.2 1.2-1.2H15"/>',
    cold: '<path d="M10 3v14M4 6.5l12 7M16 6.5l-12 7M8 4l2 1.6L12 4M8 16l2-1.6 2 1.6"/>',
    drill: '<circle cx="10" cy="10" r="6.5"/><circle cx="10" cy="10" r="3"/><path d="M10 10v.1"/>',
    pairs: '<path d="M3.5 3.5h8v8h-8zM8.5 8.5h8v8h-8z"/>',
    sheets: '<path d="M6.5 3.5h9v11h-9zM4.5 6v10.5H13"/>',
    progress: '<path d="M4.5 16.5v-5M10 16.5V4M15.5 16.5V8.5"/>',
    add: '<path d="M4 4h12v12H4zM10 7v6M7 10h6"/>',
    connect: '<circle cx="5.5" cy="10" r="2"/><circle cx="14.5" cy="10" r="2"/><path d="M7.5 10h5"/>',
    path: '<circle cx="5" cy="14" r="2"/><circle cx="15" cy="6" r="2"/><path d="M7 14c4 0 2-8 6-8"/>',
    undo: '<path d="M7 5L3.5 8.5 7 12M3.5 8.5h8a4 4 0 010 8H9"/>',
    save: '<path d="M10 3.5v9M6.5 9l3.5 3.5L13.5 9M4 16h12"/>',
    guide: '<circle cx="10" cy="10" r="6.5"/><path d="M12.6 7.4L11 11l-3.6 1.6L9 9z"/>',
    patch: '<path d="M3.5 10.5V4H10l6.5 6.5-6 6z"/><path d="M7 7.4v.1"/>',
    recent: '<circle cx="10" cy="10" r="6.5"/><path d="M10 6.5V10l2.5 1.5"/>',
    brief: '<path d="M5.5 3.5h9v13h-9zM8 7h4M8 10h4M8 13h2.5"/>',
    dot: '<circle cx="10" cy="10" r="2"/>',
    up: '<path d="M10 15V5M6 9l4-4 4 4"/>',
    down: '<path d="M10 5v10M6 11l4 4 4-4"/>',
    enter: '<path d="M15 5v6H5M8 8l-3 3 3 3"/>',
  };
  const glyph = (name, className = 'v32-glyph') =>
    `<svg class="${className}" viewBox="0 0 20 20" aria-hidden="true" focusable="false">${GLYPH[name] || GLYPH.dot}</svg>`;
  const mask = (name) =>
    'url("data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'>${GLYPH[name].replace(/"/g, "'")}</svg>`,
    ) +
    '")';
  // What each kind of search result is drawn with (the words are the rows' own data-result-type).
  const KIND = {
    Case: 'case',
    Concept: 'concept',
    Rule: 'rule',
    Hypothetical: 'hypothetical',
    Note: 'note',
    Assignment: 'session',
    Subject: 'subject',
    Topic: 'topic',
    Flowchart: 'flowchart',
    Lecture: 'lecture',
    Canon: 'canon',
    Dictionary: 'dictionary',
    Timeline: 'timeline',
    Source: 'book',
  };
  {
    const style = $('v32ChromeGlyphs') || make('style');
    style.id = 'v32ChromeGlyphs';
    style.textContent =
      `:root{--v32-g-chevron:${mask('chevron')};--v32-g-close:${mask('close')};--v32-g-note:${mask('note')}}` +
      Object.entries(KIND)
        .map(
          ([kind, name]) => `#searchResults button[data-result-type="${kind}"]{--v32c-glyph:${mask(name)}}`,
        )
        .join('') +
      `#searchResults .authority-search button{--v32c-glyph:${mask('authority')}}` +
      `#searchResults .uscode-search button{--v32c-glyph:${mask('authority')}}`;
    document.head.appendChild(style);
  }

  /* ---------- the bar: three groups ---------- */
  const group = (className) => header.querySelector(':scope > .' + className) || make('div', className);
  const left = group('v32-bar-left'),
    right = group('v32-bar-right'),
    cluster = right.querySelector('.v32-cluster') || make('div', 'v32-cluster');
  cluster.setAttribute('role', 'group');
  cluster.setAttribute('aria-label', 'New York time, Ask Dottie credit and version');
  header.prepend(left);
  left.prepend(brand);
  // Where the splash line hangs: a point just after the wordmark that takes no room of its own, so the
  // line arriving or leaving never moves the breadcrumb beside it.
  const hook = left.querySelector(':scope > .v32-splash-hook') || make('span', 'v32-splash-hook');
  brand.after(hook);
  field.after(right);
  right.prepend(cluster);
  right.append(more);
  brand.title = 'Danny Kind Legal Atlas: the whole atlas';
  more.setAttribute('aria-label', 'Library');
  // The shortcut the field answers to, as this machine writes it.
  const mac = /Mac|iPhone|iPad/i.test(navigator.userAgentData?.platform || navigator.platform || '');
  const key = $('searchKey');
  if (key) key.textContent = mac ? '⌘K' : 'Ctrl K';
  $('search').title = `Search or jump to a view (${mac ? '⌘K' : 'Ctrl+K'}, or /)`;

  // The pieces other modules made: the clock (clock.js) with its gauge's label (fuel.js), the version
  // readout (r20.js, which may still be waiting for the mark), Ask Dottie's button (ask.js) and the
  // splash line (splash.js). Each is moved once it exists.
  // A module makes its piece as a child of the bar (the version readout, inside the brand); a copy already
  // in a group can only have come in with an exported page, and gives way to the live one.
  function take(selector, into, place) {
    const live = header.querySelector(selector);
    if (!live) return null;
    for (const stale of into.querySelectorAll(':scope > .' + live.classList[0]))
      if (stale !== live) stale.remove();
    place(live);
    return live;
  }
  function adopt() {
    const clock =
      take(':scope > .ny-clock', cluster, (el) => cluster.prepend(el)) || cluster.querySelector('.ny-clock');
    take(':scope > .ny-fuel-label', cluster, (el) => (clock ? clock.after(el) : cluster.append(el)));
    const release =
      take('#atlasHome .dkla-release', cluster, (el) => {
        cluster.append(el);
        el.title = 'DKLA ' + el.textContent.trim();
      }) || cluster.querySelector('.dkla-release');
    take(':scope > .ask-bar', right, (ask) => {
      cluster.after(ask);
      if (window.DKLADottie && !ask.querySelector('.v32-ask-face')) {
        const face = make('span', 'v32-ask-face');
        face.setAttribute('aria-hidden', 'true');
        face.innerHTML = window.DKLADottie.svg('face');
        ask.querySelector('.ask-bar-label')?.before(face);
      }
    });
    take(':scope > .dkla-splash', hook, (el) => hook.append(el));
    return !!release;
  }
  (function adoptSoon(tries) {
    if (!adopt() && tries < 100) setTimeout(() => adoptSoon(tries + 1), 100);
  })(0);

  // The way back and the breadcrumb live in the bar; on a window too narrow for three groups they
  // stay on the map, where they were. The same element either way, so everything that writes the
  // trail or asks where it is (the map's label engine, the Home fit) needs no change.
  const nav = document.querySelector('nav.map-nav'),
    main = $('studyMain'),
    canvas = $('geoCanvas'),
    trail = $('geoBreadcrumb');
  const roomy = matchMedia('(min-width: 851px)');
  function placeNav() {
    if (!nav) return;
    if (roomy.matches) {
      if (nav.parentElement !== left) hook.after(nav);
    } else if (nav.parentElement !== main) canvas.after(nav);
  }
  roomy.addEventListener?.('change', () => {
    placeNav();
    if (typeof schedule === 'function') schedule();
  });
  placeNav();
  // A trail longer than its room in the bar: the first crumbs step out (the wordmark is still the way
  // Home, and Back still goes back) until the rest fits; the last two always stay, shortened if they must
  // be. Worked out when the trail is rewritten and when the bar changes width, never on a timer. A crumb
  // says its whole name on hover.
  function fitTrail() {
    if (!trail) return;
    const parts = [...trail.children];
    for (const part of parts) part.classList.remove('v32-crumb-off');
    trail.classList.remove('v32-trail-cut');
    for (const crumb of trail.querySelectorAll('button')) {
      const name = crumb.textContent.trim();
      if (crumb.title !== name) crumb.title = name;
    }
    if (nav.parentElement !== left || !nav.getClientRects().length) return;
    const crumbs = parts.filter((part) => part.localName === 'button');
    // Measured at full length (no name shortened), so what does not fit is known before anything shrinks.
    trail.classList.add('v32-trail-measure');
    for (let i = 0; i < crumbs.length - 2 && trail.scrollWidth > trail.clientWidth + 1; i++) {
      trail.classList.add('v32-trail-cut');
      crumbs[i].classList.add('v32-crumb-off');
      // The separator before it goes too; the one after it stays, after the ellipsis.
      if (crumbs[i].previousElementSibling?.localName === 'span')
        crumbs[i].previousElementSibling.classList.add('v32-crumb-off');
    }
    trail.classList.remove('v32-trail-measure');
  }
  if (trail) {
    new MutationObserver(fitTrail).observe(trail, { childList: true });
    if (typeof ResizeObserver === 'function') new ResizeObserver(fitTrail).observe(left);
  }
  root.classList.add('v32-chrome');

  // Home is the whole atlas at its resting size with nothing open. Anywhere else (zoomed in from it, a
  // course or subject, a reader or a panel) the breadcrumb shows, the splash line steps aside, and the
  // hanging Dottie steps away so she never covers the map (ask.css). Looked at after every map draw
  // and after anything a visitor does (DKLACalm.after), not on a timer.
  function offHome() {
    if (typeof S === 'undefined' || !S) return;
    const home =
      S.scope === 'Atlas' &&
      !S.region &&
      !S.district &&
      !S.panelOpen &&
      !(typeof selected !== 'undefined' && selected);
    const z = window.DKLAHomeFit?.homeZoom?.() || 0;
    const off = !home || (z > 0 && S.z > z * 1.04);
    if (root.classList.contains('dkla-off-home') !== off) {
      root.classList.toggle('dkla-off-home', off);
      // The trail has just come into the bar: its room is known only now.
      if (off) fitTrail();
    }
  }
  (function install(tries) {
    if (!window.R18?.afterDraw) {
      if (tries < 400) setTimeout(() => install(tries + 1), 80);
      return;
    }
    R18.afterDraw.push(offHome, noteOpened);
    window.DKLACalm?.after(offHome);
    offHome();
  })(0);

  /* ---------- the map's own controls ---------- */
  // The hint is for someone who has not touched the map yet. The first press, wheel turn or key on
  // the map fades it, and it does not come back in this tab.
  const HINT = 'dkla.hint.v1';
  const session = {
    get(name) {
      try {
        return sessionStorage.getItem(name);
      } catch {
        return null;
      }
    },
    set(name, value) {
      try {
        sessionStorage.setItem(name, value);
      } catch {
        /* a private window: the page's own memory is enough */
      }
    },
  };
  if (session.get(HINT)) root.classList.add('v32-hint-off');
  else if (main) {
    const used = () => {
      for (const type of ['pointerdown', 'wheel', 'keydown']) main.removeEventListener(type, used);
      session.set(HINT, '1');
      root.classList.add('v32-hint-fading');
      setTimeout(() => root.classList.add('v32-hint-off'), 400);
    };
    for (const type of ['pointerdown', 'wheel', 'keydown'])
      main.addEventListener(type, used, { passive: true });
  }
  // The save readout shows only when the work is not being kept ("Session only ..."). The routine
  // "Saved locally" line stays out of sight (owner, 12 November 2026).
  const saved = $('saveStatus');
  if (saved) {
    const read = () =>
      root.classList.toggle('v32-save-note', /^Session only/i.test(saved.textContent.trim()));
    new MutationObserver(read).observe(saved, { childList: true, characterData: true, subtree: true });
    read();
  }

  /* ---------- the Library ---------- */
  // Data blocks in the page never change, so each is counted once.
  const counted = new Map();
  function blockCount(id, measure = (value) => value.length) {
    if (counted.has(id)) return counted.get(id);
    let n = null;
    try {
      const value = JSON.parse($(id)?.textContent || 'null');
      if (value) n = measure(value);
    } catch {
      n = null;
    }
    if (n != null) counted.set(id, n);
    return n;
  }
  const safe = (read) => {
    try {
      const n = read();
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  };
  const graph = () => (typeof data === 'object' && data ? data : {});
  const COURSES = ['Contracts', 'Civil Procedure', 'Legislation and the Regulatory State'];
  // Every row: what it is called, one line for a newcomer where the name alone would not say, the
  // attribute its own feature listens for (so a click is handled exactly as it always was), and how
  // many things are behind it. A count that is not known yet (data still arriving) shows nothing.
  const COLLECTIONS = [
    {
      id: 'timelines',
      label: 'Doctrine timelines',
      note: 'How a rule developed',
      glyph: 'timeline',
      attrs: 'data-r21-menu="1"',
      count: () => safe(() => window.DKLATimelines.list().length),
    },
    {
      id: 'flowcharts',
      label: 'Flowcharts',
      note: 'The steps of a test, in order',
      glyph: 'flowchart',
      attrs: 'data-flowcharts-menu',
      count: () => blockCount('dklaFlowchartsData'),
    },
    {
      id: 'canons',
      label: 'Canons of construction',
      glyph: 'canon',
      attrs: 'data-canons-menu',
      count: () => blockCount('dklaCanonsData'),
    },
    {
      id: 'dictionary',
      label: 'Dictionary',
      glyph: 'dictionary',
      attrs: 'data-v32-open="dictionary"',
      count: () => safe(() => window.DKLA.glossaryCount()),
    },
    {
      id: 'lectures',
      label: 'Lecture notes',
      glyph: 'lecture',
      attrs: 'data-v32-open="lectures"',
      count: () => blockCount('dklaLecturesData'),
    },
    {
      id: 'sessions',
      label: 'Class sessions',
      note: 'The reading for each class',
      glyph: 'session',
      attrs: 'data-action="class"',
      count: () =>
        safe(() => {
          const g = graph();
          return (
            Object.keys(g.corpus?.assignmentTitles || {}).length +
            (g.lrsCorpus?.classes?.length || 0) +
            (g.nodes || []).filter((n) => /^cp-week-\d+$/.test(n.id)).length
          );
        }),
    },
    {
      id: 'authorities',
      label: 'Rules & authorities',
      note: 'Constitution, rules, codes',
      glyph: 'authority',
      attrs: 'data-authority-menu="1"',
      count: () => safe(() => window.DKLAAuthorities.data.entries.length),
    },
    {
      id: 'scotus',
      label: 'SCOTUS History',
      note: 'Every justice since 1789',
      glyph: 'scotus',
      attrs: 'data-sh-open="1"',
      count: () => safe(() => Object.keys(window.SCOTUSHistory.data.people).length),
    },
    {
      id: 'supporting',
      label: 'Supporting cases',
      note: 'Cited in the readings',
      glyph: 'case',
      attrs: () => `data-r19-list="${Math.max(0, COURSES.indexOf(typeof S === 'object' ? S.scope : ''))}"`,
      count: () =>
        safe(() => {
          const d = window.DKLABriefs.data;
          return d.entries.length - Object.keys(d.map).length;
        }),
      library: true,
    },
    {
      id: 'textbook',
      label: 'Textbook',
      glyph: 'book',
      attrs: 'data-action="book"',
      count: () => safe(() => Number(graph().corpus?.sourcePageCount)),
      library: true,
    },
    {
      // Another pass adds the Cold Call index; the row appears with it.
      id: 'coldcalls',
      label: 'Cold Calls',
      note: 'Every case as a story you can retell',
      glyph: 'cold',
      attrs: 'data-v32-open="coldcalls"',
      when: () => !!window.DKLAColdCallIndex,
      count: () =>
        safe(() => {
          const index = window.DKLAColdCallIndex;
          if (Number.isFinite(index.count)) return index.count;
          if (typeof index.count === 'function') return index.count();
          return window.DKLAColdCall.cases().length;
        }),
    },
  ];
  const STUDY = [
    {
      id: 'drill',
      label: 'Drill',
      note: 'Recall each rule from memory',
      glyph: 'drill',
      attrs: 'data-r18-open="drill"',
      count: () => safe(() => window.DKLAStudy.entries().length),
    },
    {
      id: 'pairs',
      label: 'Pairs',
      note: 'Rules that are easy to confuse',
      glyph: 'pairs',
      attrs: 'data-r18-open="pairs"',
      count: () => safe(() => window.DKLAStudy.pairs().length),
    },
    {
      id: 'sheets',
      label: 'Sheets',
      note: 'One-page reference sheets',
      glyph: 'sheets',
      attrs: 'data-r18-open="sheets"',
    },
    {
      id: 'progress',
      label: 'Progress',
      note: 'Ratings, sync and updates',
      glyph: 'progress',
      attrs: 'data-r18-open="progress"',
    },
  ];
  const YOURS = [
    { id: 'add', label: 'Add an entry', glyph: 'add', attrs: 'data-action="add"' },
    { id: 'connect', label: 'Add a connection', glyph: 'connect', attrs: 'data-action="connect"' },
    {
      id: 'path',
      label: 'Find a connection path',
      glyph: 'path',
      attrs: 'data-action="path"',
    },
    {
      id: 'undo',
      label: 'Undo last edit',
      glyph: 'undo',
      attrs: 'data-action="undo"',
      when: () => typeof undoStack !== 'undefined' && undoStack.length > 0,
    },
    {
      id: 'save',
      label: 'Save and back up',
      glyph: 'save',
      attrs: 'data-action="save"',
    },
    { id: 'guide', label: 'Guide', note: 'A short walkthrough', glyph: 'guide', attrs: 'data-r20-guide="1"' },
    {
      id: 'patch',
      label: 'Patch notes',
      glyph: 'patch',
      attrs: 'data-dkla-patch="1"',
      meta: () => header.querySelector('.dkla-release')?.textContent.trim() || '',
    },
  ];
  const shown = (list, where) =>
    list.filter((row) => (!row.when || row.when()) && (where === 'library' || !row.library));
  function rowHTML(row, role) {
    const attrs = typeof row.attrs === 'function' ? row.attrs() : row.attrs;
    const meta = row.meta ? row.meta() : count(row.count ? row.count() : null);
    return (
      `<button type="button" class="v32-row"${role ? ` role="${role}"` : ''} data-v32-row="${row.id}" ${attrs}>` +
      glyph(row.glyph) +
      `<span class="v32-row-label">${E(row.label)}</span>` +
      `<span class="v32-row-note">${E(row.note || '')}</span>` +
      `<span class="v32-row-meta">${E(meta)}</span></button>`
    );
  }
  const groupHTML = (name, list) =>
    `<section class="v32-lib-group" role="group" aria-label="${E(name)}"><h3>${E(name)}</h3>` +
    list.map((row) => rowHTML(row, 'menuitem')).join('') +
    '</section>';
  function library(menu) {
    menu.innerHTML =
      groupHTML('Collections', shown(COLLECTIONS, 'library')) +
      '<div class="v32-lib-side">' +
      groupHTML('Study', shown(STUDY, 'library')) +
      groupHTML('Yours', shown(YOURS, 'library')) +
      '</div>' +
      '<footer class="v32-lib-foot">' +
      '<button type="button" class="v32-quiet" role="menuitem" data-action="help">How to use this map</button>' +
      '<button type="button" class="v32-quiet" role="menuitem" data-action="scope">Sources and coverage</button>' +
      '<a class="v32-quiet" role="menuitem" href="/privacy.html" target="_blank" rel="noopener">Privacy</a>' +
      '<span class="v32-lib-name">Danny Kind Legal Atlas</span>' +
      '</footer>';
  }
  // A count that arrives after the Library or the palette was drawn (the dictionary loads late).
  function recount() {
    for (const el of document.querySelectorAll('[data-v32-row]')) {
      const row = [...COLLECTIONS, ...STUDY].find((r) => r.id === el.dataset.v32Row);
      const meta = el.querySelector('.v32-row-meta');
      if (!row?.count || !meta) continue;
      const text = count(row.count());
      if (meta.textContent !== text) meta.textContent = text;
    }
  }
  document.addEventListener('dkla:data', () => setTimeout(recount, 120));

  // The lecture notes had no list of their own: one row per class deck, opening the deck.
  function lectureIndex() {
    let decks = [];
    try {
      decks = JSON.parse($('dklaLecturesData')?.textContent || '[]');
    } catch {
      decks = [];
    }
    const names = {
      contracts: 'Contracts',
      lrs: 'Legislation and the Regulatory State',
      civil: 'Civil Procedure',
    };
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = (iso) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
      return m ? MONTHS[+m[2] - 1] + ' ' + +m[3] : '';
    };
    const courses = [...new Set(decks.map((deck) => deck.course))];
    const body = courses
      .map((course) => {
        const list = decks.filter((deck) => deck.course === course).sort((a, b) => a.number - b.number);
        return (
          `<section aria-label="${E(names[course] || course)}"><h3>${E(names[course] || course)} · ${list.length} classes</h3>` +
          list
            .map(
              (deck) =>
                `<a class="v32-row" data-lecture-jump href="#lecture=${E(deck.course)}-${deck.number}">` +
                glyph('lecture') +
                `<span class="v32-row-label">Class ${deck.number}</span>` +
                `<span class="v32-row-note">${E(deck.title || '')}</span>` +
                `<span class="v32-row-meta">${E([day(deck.date), deck.topics.length + ' notes'].filter(Boolean).join(' · '))}</span></a>`,
            )
            .join('') +
          '</section>'
        );
      })
      .join('');
    if (typeof modal === 'function')
      modal(
        'Lecture notes',
        `<div class="v32-index">${body || '<p>No lecture slides are on file.</p>'}</div>`,
      );
  }
  // Rows whose feature has no listener of its own.
  function open(what) {
    if (what === 'dictionary') window.DKLA?.openTerm?.();
    else if (what === 'lectures') lectureIndex();
    else if (what === 'coldcalls') window.DKLAColdCallIndex?.open?.();
    else if (what === 'ask') window.DKLAAsk?.dialog && header.querySelector('.ask-bar')?.click();
  }

  const dialog = $('libraryDialog');
  if (dialog) {
    // A row closes the Library before its feature opens, so two dialogs are never stacked. Listened for on
    // the window, in the capture phase: ahead of every feature's own listener, some of which stop the click
    // from travelling any further.
    window.addEventListener(
      'click',
      (event) => {
        if (!dialog.open || !dialog.contains(event.target)) return;
        if (event.target === dialog || event.target.closest('[data-library-close]')) {
          if (typeof dismissMenu === 'function') dismissMenu();
          return;
        }
        const row = event.target.closest('[role="menuitem"]');
        if (!row || row.disabled) return;
        if (typeof dismissMenu === 'function') dismissMenu();
        if (row.dataset.v32Open) open(row.dataset.v32Open);
      },
      true,
    );
    // Up and Down walk the rows, as in any menu.
    dialog.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const rows = [...dialog.querySelectorAll('[role="menuitem"]:not(:disabled)')];
      if (!rows.length) return;
      const at = rows.indexOf(document.activeElement);
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? rows.length - 1
            : event.key === 'ArrowDown'
              ? (at + 1) % rows.length
              : (at - 1 + rows.length) % rows.length;
      event.preventDefault();
      rows[next].focus();
    });
  }

  /* ---------- the command palette ---------- */
  const input = $('search'),
    results = $('searchResults');
  // The last entries opened in this tab, newest first.
  const RECENT = 'dkla.recent.v1';
  let recent = [];
  try {
    recent = JSON.parse(session.get(RECENT) || '[]').filter((id) => typeof id === 'string');
  } catch {
    recent = [];
  }
  let lastOpened = null;
  function noteOpened() {
    const id = typeof selected !== 'undefined' && selected?.type === 'node' ? selected.id : null;
    if (!id || id === lastOpened) {
      if (!id) lastOpened = null;
      return;
    }
    lastOpened = id;
    recent = [id, ...recent.filter((other) => other !== id)].slice(0, 8);
    session.set(RECENT, JSON.stringify(recent));
  }
  // (Looked at after each map draw: opening an entry always draws. See the install above.)
  const NODE_GLYPH = { Case: 'case', Concept: 'concept', Rule: 'rule', Hypothetical: 'hypothetical' };
  const section = (name, rows, note = '') =>
    rows.length
      ? `<div class="v32-section" role="group" aria-label="${E(name)}"><div class="v32-label">${E(name)}${note ? `<span class="v32-row-note">${E(note)}</span>` : ''}</div>${rows.join('')}</div>`
      : '';
  // What the open entry offers, if the reader says (window.DKLAReader.facets, added by the reader's
  // own pass): rows such as Cold Call, Brief, Timeline 6. Each facet is { id, label, count?, glyph?,
  // open() }; anything else it returns is left out rather than guessed at.
  let facets = [];
  function entryRows() {
    facets = [];
    let list = [];
    try {
      list = window.DKLAReader?.facets?.() || [];
    } catch {
      list = [];
    }
    if (!Array.isArray(list)) return [];
    facets = list.filter((f) => f && typeof f.label === 'string' && typeof f.open === 'function').slice(0, 8);
    return facets.map(
      (f, i) =>
        `<button type="button" class="v32-row" data-v32-facet="${i}">` +
        glyph(GLYPH[f.glyph] ? f.glyph : GLYPH[f.id] ? f.id : 'dot') +
        `<span class="v32-row-label">${E(f.label)}</span><span class="v32-row-note">${E(f.note || '')}</span>` +
        `<span class="v32-row-meta">${E(count(Number(f.count)))}</span></button>`,
    );
  }
  function recentRows() {
    if (typeof nodesById === 'undefined') return [];
    const here = typeof selected !== 'undefined' && selected?.type === 'node' ? selected.id : null;
    return recent
      .filter((id) => id !== here && nodesById.has(id))
      .slice(0, 5)
      .map((id) => {
        const n = nodesById.get(id);
        return (
          `<button type="button" class="v32-row" data-study-node="${E(id)}">` +
          glyph(NODE_GLYPH[n.kind] || 'note') +
          `<span class="v32-row-label">${E(n.title)}</span>` +
          `<span class="v32-row-note">${E((n.courses || []).join(', '))}</span>` +
          '<span class="v32-row-meta"></span></button>'
        );
      });
  }
  const KEYS =
    '<div class="v32-keys" aria-hidden="true">' +
    `<span><kbd>${glyph('up', '')}</kbd><kbd>${glyph('down', '')}</kbd>move</span>` +
    `<span><kbd>${glyph('enter', '')}</kbd>open</span>` +
    '<span><kbd>esc</kbd>close</span></div>';
  let mode = 'closed'; // 'palette' (the empty box), 'results' (a search), or 'closed'
  function palette() {
    // Ask Dottie's own row (ask.js keeps the button and its handler): it is put into the list first,
    // then the sections are drawn round it.
    let ask = null;
    if (window.DKLAAsk?.showInSearch) {
      window.DKLAAsk.showInSearch();
      ask = results.querySelector('.ask-search');
    }
    const title =
      typeof selected !== 'undefined' && selected?.type === 'node' && typeof nodesById !== 'undefined'
        ? nodesById.get(selected.id)?.title || ''
        : '';
    const head = make('div');
    head.innerHTML =
      section('On this entry', title ? entryRows() : [], title) +
      section(
        'Go to',
        shown(COLLECTIONS, 'palette').map((row) => rowHTML(row)),
      ) +
      section('Recent', recentRows());
    const foot = make('div');
    foot.innerHTML = KEYS;
    const parts = [...head.children];
    if (ask) {
      const wrap = make('div', 'v32-section');
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', 'Ask');
      wrap.append(ask);
      parts.push(wrap);
    }
    results.replaceChildren(...parts, foot.firstChild);
    mode = 'palette';
    if (typeof S === 'object' && S) S.searchOpen = true;
    results.hidden = false;
    results.scrollTop = 0;
    input.setAttribute('aria-expanded', 'true');
    select(null);
  }

  // The keyboard's place in the list. The keyboard itself stays in the box (so typing and moving never
  // fight); the row it is on carries the highlight and aria-current, and Enter opens it.
  let chosen = null;
  const rowsNow = () =>
    [...results.querySelectorAll('button, a.v32-row')].filter(
      (row) => !row.disabled && row.offsetParent !== null,
    );
  function select(row, reveal = false) {
    if (chosen === row) return;
    if (chosen) {
      chosen.classList.remove('v32-selected');
      chosen.removeAttribute('aria-current');
    }
    chosen = row && row.isConnected ? row : null;
    if (chosen) {
      chosen.classList.add('v32-selected');
      chosen.setAttribute('aria-current', 'true');
      if (reveal) chosen.scrollIntoView({ block: 'nearest' });
    }
  }
  // After a search is drawn (or rows join it late): the footer stays last, and the first result is
  // the keyboard's row, which is what Enter has always opened.
  const tidy = () => {
    if (results.hidden) {
      mode = 'closed';
      select(null);
      return;
    }
    if (chosen && !chosen.isConnected) chosen = null;
    if (!input.value.trim()) return;
    mode = 'results';
    if (!results.children.length) return;
    let keys = results.querySelector(':scope > .v32-keys');
    if (!keys) {
      const holder = make('div');
      holder.innerHTML = KEYS;
      keys = holder.firstChild;
    }
    if (results.lastElementChild !== keys) results.append(keys);
    if (!chosen) select(results.querySelector('button:not(.ask-search):not(:disabled)'));
  };
  new MutationObserver(tidy).observe(results, {
    childList: true,
    attributes: true,
    attributeFilter: ['hidden'],
  });

  // Where the keyboard was before it came to the box: Escape gives it back.
  let cameFrom = null;
  input.addEventListener('focus', (event) => {
    const from = event.relatedTarget;
    if (from && from !== document.body && !field.contains(from)) cameFrom = from;
  });
  function leave() {
    if (typeof closeSearch === 'function') closeSearch();
    const to = cameFrom;
    cameFrom = null;
    if (to?.isConnected && to.offsetParent !== null) to.focus({ preventScroll: true });
    else document.activeElement?.blur?.();
  }
  field.addEventListener('keydown', (event) => {
    if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    const inList = results.contains(document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (results.hidden) {
        if (event.key === 'ArrowDown' && typeof showPalette === 'function' && !input.value.trim())
          showPalette();
        return;
      }
      const rows = rowsNow();
      if (!rows.length) return;
      event.preventDefault();
      const at = rows.indexOf(inList ? document.activeElement : chosen);
      const next = event.key === 'ArrowDown' ? (at + 1) % rows.length : at <= 0 ? rows.length - 1 : at - 1;
      select(rows[next], true);
      if (inList) rows[next].focus({ preventScroll: true });
    } else if (event.key === 'Enter' && event.target === input) {
      event.preventDefault();
      if (results.hidden) return;
      const row = chosen?.isConnected
        ? chosen
        : mode === 'results'
          ? results.querySelector('button:not(.ask-search):not(:disabled)')
          : null;
      row?.click();
    } else if (event.key === 'Escape') {
      // The page's own Escape handlers close the list (and the phone panel); this hands the keyboard back.
      leave();
    }
  });
  // The pointer moves the same highlight, so there is only ever one.
  results.addEventListener(
    'pointermove',
    (event) => {
      const row = event.target.closest('button, a.v32-row');
      if (row && results.contains(row) && !row.disabled) select(row);
    },
    { passive: true },
  );
  // A row cut short says the rest on hover (made when first pointed at, not for every row drawn).
  results.addEventListener(
    'pointerover',
    (event) => {
      const row = event.target.closest('button');
      if (!row || row.title || !results.contains(row)) return;
      const name = row.querySelector('strong, .v32-row-label')?.textContent.trim() || '',
        where = row.querySelector('.search-sub, .v32-row-note')?.textContent.trim() || '';
      row.title = [name, where].filter(Boolean).join(' · ');
    },
    { passive: true },
  );
  // A palette row: the list closes and the keyboard leaves the box before the row's feature opens,
  // so a dialog that closes later does not hand the keyboard back to the box and reopen the list.
  // (On the window, in the capture phase, for the same reason as the Library's rows.)
  window.addEventListener(
    'click',
    (event) => {
      const row = event.target.closest?.('.v32-row');
      if (!row || row.disabled || !results.contains(row)) return;
      if (typeof closeSearch === 'function') closeSearch();
      if (document.activeElement === input || results.contains(document.activeElement))
        document.activeElement.blur();
      cameFrom = null;
      if (row.dataset.v32Open) open(row.dataset.v32Open);
      else if (row.dataset.v32Facet) {
        try {
          facets[+row.dataset.v32Facet]?.open();
        } catch (error) {
          console.error(error);
        }
      }
    },
    true,
  );

  window.DKLAChrome = Object.freeze({
    library,
    palette,
    rows: () =>
      [
        ...shown(COLLECTIONS, 'library').map((row) => ({ ...row, group: 'Collections' })),
        ...shown(STUDY, 'library').map((row) => ({ ...row, group: 'Study' })),
        ...shown(YOURS, 'library').map((row) => ({ ...row, group: 'Yours' })),
      ].map((row) => ({
        id: row.id,
        group: row.group,
        label: row.label,
        count: row.count ? row.count() : null,
      })),
    selected: () => chosen,
    mode: () => mode,
    recent: () => recent.slice(),
  });
})();
