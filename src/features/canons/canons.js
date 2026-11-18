/* The LRS canon index links the assigned evidence to the rules it illustrates. */
(() => {
  'use strict';
  const embedded = document.getElementById('dklaCanonsData');
  if (!embedded) return;

  const entries = JSON.parse(embedded.textContent);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const bySource = new Map();
  for (const entry of entries) {
    for (const id of new Set(entry.sources.map((source) => source.id).filter(Boolean))) {
      if (!bySource.has(id)) bySource.set(id, []);
      bySource.get(id).push(entry);
    }
  }
  const groups = [...new Set(entries.map((entry) => entry.category))];
  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (char) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[char],
    );
  const normalize = (s) =>
    s
      .normalize('NFKD')
      .toLowerCase()
      .replace(/\p{M}/gu, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  const canonHash = (id) => '#canon=' + id;
  const searchable = new Map(
    entries.map((entry) => [
      entry.id,
      normalize(
        [
          entry.name,
          ...entry.aliases,
          entry.category,
          entry.definition,
          ...entry.sources.map((source) => source.label),
        ].join(' '),
      ),
    ]),
  );

  const dialog = document.createElement('dialog');
  dialog.id = 'dklaCanons';
  dialog.setAttribute('aria-labelledby', 'dklaCanonTitle');
  const old = document.getElementById(dialog.id);
  if (old) old.replaceWith(dialog);
  else document.body.append(dialog);
  dialog.innerHTML = `
    <header class="canons-head">
      <div><p>Legislation and the Regulatory State</p><h2 id="dklaCanonTitle">Canons of construction</h2></div>
      <button type="button" data-canons-close aria-label="Close canons of construction">×</button>
    </header>
    <div class="canons-body" tabindex="-1"></div>`;
  const heading = dialog.querySelector('h2');
  const body = dialog.querySelector('.canons-body');
  let showing = '';
  let query = '';
  let category = '';

  function updateLibrary() {
    const words = normalize(query).split(' ').filter(Boolean);
    const matches = entries.filter(
      (entry) =>
        (!category || entry.category === category) &&
        words.every((word) => searchable.get(entry.id).includes(word)),
    );
    body.querySelector('.canons-count').textContent = matches.length
      ? matches.length + (matches.length === 1 ? ' entry' : ' entries')
      : 'No matching entries.';
    body.querySelector('.canons-list').innerHTML = groups
      .map((name) => {
        const inGroup = matches.filter((entry) => entry.category === name);
        if (!inGroup.length) return '';
        return `<section class="canons-group"><h3>${esc(name)}</h3><ul>${inGroup
          .map(
            (entry) =>
              `<li><a data-canons-nav href="${canonHash(entry.id)}"><strong>${esc(entry.name)}</strong><span>${esc(entry.definition)}</span></a></li>`,
          )
          .join('')}</ul></section>`;
      })
      .join('');
  }

  function library() {
    heading.textContent = 'Canons of construction';
    body.innerHTML = `
      <div class="canons-library">
        <p class="canons-intro">Look up an interpretive rule, see when it matters, and open the cases and readings that illustrate it.</p>
        <div class="canons-filters">
          <label>Search canons<input data-canons-query type="search" placeholder="Name, alias, or case" value="${esc(query)}"></label>
          <label>Topic<select data-canons-category><option value="">All topics</option>${groups
            .map((name) => `<option value="${esc(name)}">${esc(name)}</option>`)
            .join('')}</select></label>
        </div>
        <p class="canons-count" role="status"></p>
        <div class="canons-list"></div>
        <details class="canons-scope"><summary>Course sources and coverage</summary><p>
          The index draws on the assigned LRS opinions, available Mashaw excerpts, Katzmann, the
          Parrillo–Shane supplement, and the available lectures for Classes 1–22. Entries identify
          express discussions and examples that use the reasoning. Mashaw pp. 1–41 and pp. 68–69,
          the first-day handout, and lecture decks for Classes 23–26 are missing from the collection.
        </p></details>
      </div>`;
    body.querySelector('[data-canons-category]').value = category;
    updateLibrary();
  }

  function detail(entry) {
    heading.textContent = entry?.name || 'Canon unavailable';
    if (!entry) {
      body.innerHTML = '<a href="#canons" data-canons-nav>← All canons</a>';
      return;
    }
    body.innerHTML = `
      <article class="canon-detail">
        <a href="#canons" data-canons-nav>← All canons</a>
        <p class="canon-category">${esc(entry.category)}</p>
        <p class="canon-definition">${esc(entry.definition)}</p>
        ${entry.aliases.length ? `<p class="canon-aliases">Also called ${entry.aliases.map(esc).join(' · ')}</p>` : ''}
        <div class="canon-notes">
          <section><h3>When to use it</h3><p>${esc(entry.use)}</p></section>
          <section><h3>Limits and competing readings</h3><p>${esc(entry.limits)}</p></section>
        </div>
        <section class="canon-evidence"><h3>In the course</h3><ul>${entry.sources
          .map(
            (source) =>
              `<li>${sourceLink(source)}
            ${source.pinpoint ? `<span>${esc(source.pinpoint)}</span>` : ''}
            <small>${source.kind === 'application' ? 'Application' : 'Discusses the rule'}</small></li>`,
          )
          .join('')}</ul></section>
      </article>`;
  }

  function sourceLink(source) {
    const label = esc(source.label);
    if (source.lecture) return `<a href="#lecture=${encodeURIComponent(source.lecture)}">${label}</a>`;
    if (source.brief)
      return `<button type="button" data-canon-brief="${esc(source.brief)}">${label}</button>`;
    if (source.id) return `<a href="#node=${encodeURIComponent(source.id)}">${label}</a>`;
    return `<strong>${label}</strong>`;
  }

  function sync() {
    const hash = location.hash;
    if (hash !== '#canons' && !hash.startsWith('#canon=')) {
      if (dialog.open) dialog.close();
      showing = '';
      return;
    }
    if (showing === hash && dialog.open) return;
    showing = hash;
    if (hash === '#canons') library();
    else detail(byId.get(hash.slice('#canon='.length)));
    if (!dialog.open) dialog.showModal();
    body.scrollTop = 0;
    body.focus({ preventScroll: true });
  }

  function navigate(hash) {
    if (location.hash === hash) return;
    const previous = history.state?.dklaCanonDepth || 0;
    const depth = showing ? (previous ? previous + 1 : 0) : 1;
    location.hash = hash;
    history.replaceState({ ...history.state, dklaCanonDepth: depth }, '');
  }

  function close() {
    const depth = history.state?.dklaCanonDepth || 0;
    if (depth) history.go(-depth);
    else {
      history.replaceState(history.state, '', location.pathname + location.search);
      sync();
    }
  }

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('input', (event) => {
    if (event.target.matches('[data-canons-query]')) {
      query = event.target.value;
      updateLibrary();
    }
  });
  dialog.addEventListener('change', (event) => {
    if (event.target.matches('[data-canons-category]')) {
      category = event.target.value;
      updateLibrary();
    }
  });
  dialog.querySelector('[data-canons-close]').addEventListener('click', close);
  dialog.addEventListener('click', (event) => {
    const id = event.target.closest('[data-canon-brief]')?.dataset.canonBrief;
    const briefDialog = id && document.getElementById('r19Dialog');
    if (!briefDialog || !window.DKLABriefs) return;
    const originalHash = location.hash;
    dialog.close();
    briefDialog.addEventListener(
      'close',
      () => {
        if (location.hash === originalHash) sync();
      },
      { once: true },
    );
    window.DKLABriefs.open(undefined, id);
  });

  const menu = document.getElementById('moreMenu');
  if (typeof moreMenu === 'function') {
    const prior = moreMenu;
    moreMenu = function (...args) {
      const result = prior.apply(this, args);
      if (menu && !menu.hidden && !menu.querySelector('[data-canons-menu]'))
        menu.insertAdjacentHTML(
          'beforeend',
          '<button type="button" role="menuitem" data-canons-menu>Canons of construction</button>',
        );
      return result;
    };
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-canons-menu],[data-canons-nav]');
    if (!target || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
      return;
    event.preventDefault();
    if (target.matches('[data-canons-menu]')) dismissMenu();
    const results = target.closest('#searchResults');
    if (results) results.hidden = true;
    navigate(target.getAttribute('href') || target.dataset.canonsNav || '#canons');
  });

  const inspector = document.getElementById('inspector');
  const priorInspector = renderInspector;
  renderInspector = function (...args) {
    const result = priorInspector.apply(this, args);
    const related = selected?.type === 'node' && bySource.get(selected.id);
    const reading = related && inspector?.querySelector('.reader-body');
    if (reading && !reading.querySelector('.canons-related')) {
      reading.insertAdjacentHTML(
        'beforeend',
        `<nav class="canons-related" aria-label="Canons of construction">
        <h3>Canons and interpretive tools</h3><ul>${related
          .map((entry) => `<li><a data-canons-nav href="${canonHash(entry.id)}">${esc(entry.name)}</a></li>`)
          .join('')}</ul></nav>`,
      );
    }
    return result;
  };

  // Atlas search lists the canons itself (src/runtime/dklaR13Search.js), with every name and alias indexed.

  window.addEventListener('hashchange', sync);
  sync();
})();
