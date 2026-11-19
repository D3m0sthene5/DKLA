/* DKLA r12/r14c: the legal dictionary. A browsable box on the map, dictionary rows in search, the terms each entry uses (ranked, from tools/r12_glossary.py) and the entries each term is used by (grouped: cases, concepts and rules, notes). */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const E = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  // The data loader (src/features/performance/data-loader.js). Until it is in the page, this stand-in reads
  // the embedded block, exactly as before.
  const DKLAData = window.DKLAData || {
    isLazy: () => false,
    loaded: () => true,
    json: async (id) => JSON.parse(document.getElementById(id)?.textContent || 'null'),
    text: async (id) => document.getElementById(id)?.textContent || '',
    whenLoaded: async () => {},
  };
  const ID = 'dklaGlossary';
  // The dictionary. In the single-file copy it is in the page and is read now, as before. In the hosted page
  // the block may be split out: it is then read on first use (the dictionary opened, a search typed, a case
  // page with terms, a Cold Call definition card) or when the background download brings it. Until then G is
  // empty and every feature below draws nothing (or "Loading the dictionary…" in the dialog); when it
  // arrives, refresh() redraws what is on screen and 'dkla:glossary' is dispatched on document.
  let G = { terms: [], byNode: {} },
    bySlug = new Map(),
    usedBy = new Map(),
    KIND = {},
    loaded = false,
    loading = null,
    failed = false,
    // v3.2: the normalised form of every term and definition, made once (see keys()), not at every keystroke.
    termKeys = null,
    definitionKeys = null,
    keyed = 0;
  function install(data) {
    G = data && Array.isArray(data.terms) ? data : { terms: [], byNode: {} };
    bySlug = new Map(G.terms.map((t) => [t.slug, t]));
    // usedBy is the exact inverse of byNode, precomputed by tools/r12_glossary.py in reading order (cases, then concepts and rules, then notes; each group by how central the term is); older blocks carry only byNode
    usedBy = new Map(Object.entries(G.usedBy || {}));
    if (!usedBy.size)
      for (const [nid, slugs] of Object.entries(G.byNode || {}))
        for (const s of slugs) {
          if (!usedBy.has(s)) usedBy.set(s, []);
          usedBy.get(s).push(nid);
        }
    KIND = G.kinds || {};
    loaded = true;
    termKeys = definitionKeys = null;
  }
  if (!DKLAData.isLazy(ID)) {
    let data = null;
    try {
      data = JSON.parse($(ID)?.textContent || '{"terms":[],"byNode":{}}');
    } catch {}
    install(data);
  }
  /** The dictionary, fetched if it is still to come. Resolves once it is installed and redrawn. */
  function load() {
    if (loaded) return Promise.resolve();
    loading ||= DKLAData.json(ID).then(
      (data) => {
        if (loaded) return;
        install(data);
        refresh();
      },
      (error) => {
        loading = null;
        failed = true;
        if (dlg.open) render();
        throw error;
      },
    );
    return loading;
  }
  // First use: start the download and draw what can be drawn now.
  const use = () => {
    if (!loaded) load().catch(() => {});
    return loaded;
  };
  const GROUPS = [
    ['Cases', (k) => k === 'Case'],
    ['Concepts and rules', (k) => k === 'Concept' || k === 'Rule'],
    ['Notes and study problems', () => true],
  ];
  /* v3.1: a definition reads as a lead sentence, then paragraphs, with its " - " examples as a list.
   Every word of the source text is kept; only the layout changes. */
  function defHTML(text) {
    const clean = String(text || '').replace(/([a-z)])\.([A-Z])/g, '$1. $2');
    const parts = clean.split(/(?<=[:;])\s+-\s+(?=\S)/);
    const sentences = (value) => value.match(/[^.!?]+(?:[.!?]+(?=\s+[A-Z(“"]|$)|$)/g) || [value];
    let intro = parts.shift();
    let after = '';
    if (parts.length) {
      const last = parts.pop();
      const [first, ...rest] = sentences(last);
      parts.push(first.trim());
      after = rest.join('').trim();
    }
    const lead = sentences(intro);
    const head = lead.shift().trim();
    // At most two sentences to a paragraph.
    const paragraphs = [];
    for (let i = 0; i < lead.length; i += 2)
      paragraphs.push(
        lead
          .slice(i, i + 2)
          .join('')
          .trim(),
      );
    return `<p class="gl-def gl-lead">${E(head)}</p>${paragraphs
      .filter(Boolean)
      .map((p) => `<p class="gl-def">${E(p)}</p>`)
      .join(
        '',
      )}${parts.length ? `<ul class="gl-examples">${parts.map((item) => `<li>${E(item.replace(/[;]\s*$/, ''))}</li>`).join('')}</ul>` : ''}${after ? `<p class="gl-def">${E(after)}</p>` : ''}`;
  }
  function usedByHTML(slug) {
    const ids = usedBy.get(slug) || [];
    if (!ids.length) return '';
    const own = (G.titled || {})[slug] || [];
    const title = (id) => (G.titles || {})[id] || id;
    const btn = (id) => `<button data-study-node="${E(id)}">${E(title(id))}</button>`;
    const groups = [];
    const left = ids.slice();
    for (const [label, test] of GROUPS) {
      const mine = left.filter((id) => test(KIND[id]));
      if (!mine.length) continue;
      for (const id of mine) left.splice(left.indexOf(id), 1);
      groups.push([label, mine]);
    }
    const many = ids.length > 40;
    return `${own.length ? `<h3>The atlas's own entry</h3><div class="gl-used gl-own">${own.map(btn).join('')}</div>` : ''}<h3>Entries that use this term <span class="gl-count">${ids.length}</span></h3>${groups.map(([label, mine], gi) => `<div class="gl-group"><h4>${label} <span class="gl-count">${mine.length}</span></h4><div class="gl-used"${many && gi > 0 ? ' hidden' : ''}>${mine.map(btn).join('')}</div></div>`).join('')}${many ? '<button class="gl-showall" type="button">Show all groups</button>' : ''}`;
  }
  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const LII = (s) => 'https://www.law.cornell.edu/wex/' + encodeURIComponent(s);
  window.DKLA = Object.assign(window.DKLA || {}, {
    /** 0 until the dictionary is in the page (the Home label is drawn from the next frame after it arrives). */
    glossaryCount: () => G.terms.length,
    /** False until the dictionary is in the page; asking is a first use. */
    hasTerm: (slug) => (use(), bySlug.has(slug)),
    openTerm: (slug) => openGlossary(slug),
    glossaryLoaded: () => loaded,
    /** Resolves when the dictionary is in the page (fetching it if it is still to come). */
    whenGlossary: () => load(),
    /** Every term, [{ slug, term, definition, ... }]; [] until the dictionary is in the page. Do not mutate. */
    glossaryTerms: () => G.terms,
  });
  // ---- the dialog
  {
    const st = document.createElement('style');
    st.id = 'dklaR14GlossaryStyles';
    st.textContent = `#glossaryDialog .gl-group{margin:8px 0 10px}#glossaryDialog .gl-group h4{margin:0 0 6px;font:600 11px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6f879e}#glossaryDialog .gl-count{background:#26333f;border-radius:10px;padding:1px 7px;margin-left:6px;color:#c9d3dc;font-size:11px}#glossaryDialog .gl-own button{color:#e4ebf1;border-color:#dabd94}#glossaryDialog .gl-showall{margin-top:6px;background:none;border:1px dashed #435466;border-radius:16px;color:#93a7b7;font:12.5px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:5px 11px;cursor:pointer}.dkla-term-chips .dkla-term-more{background:none;border:1px dashed #3d3f5c;color:#93a7b7}#glossaryDialog .gl-loading{grid-column:1/-1;margin:0;padding:28px 24px;font-size:15px}`;
    document.head.appendChild(st);
  }
  const dlg = document.createElement('dialog');
  dlg.id = 'glossaryDialog';
  dlg.setAttribute('aria-label', 'Legal dictionary');
  document.body.appendChild(dlg);
  let cur = null,
    q = '',
    letter = '',
    ret = null,
    wanted = null;
  /* v3.2: filtering used to normalise every term and every definition again at each keystroke (a tenth of a
     second, more on a slow machine) and then redraw the whole dialog. The normalised forms are now made once:
     the terms when first needed (cheap), the definitions in the background as soon as the dialog opens, a few
     milliseconds at a time; a keystroke that arrives before that is finished completes it first. */
  const KEY_SLICE = 6;
  function keys(all) {
    if (!termKeys) {
      termKeys = G.terms.map((t) => norm(t.term));
      definitionKeys = new Array(G.terms.length);
      keyed = 0;
    }
    if (all) for (; keyed < G.terms.length; keyed++) definitionKeys[keyed] = norm(G.terms[keyed].definition);
    return termKeys;
  }
  let warming = false;
  function warmKeys() {
    if (warming || !loaded) return;
    keys(false);
    if (keyed >= G.terms.length) return;
    warming = true;
    const mine = definitionKeys;
    const step = () => {
      const began = performance.now(),
        terms = G.terms;
      // install() replaced the dictionary meanwhile: the next use starts again on the new one.
      if (mine !== definitionKeys) {
        warming = false;
        return;
      }
      while (keyed < terms.length && performance.now() - began < KEY_SLICE) {
        definitionKeys[keyed] = norm(terms[keyed].definition);
        keyed++;
      }
      if (keyed < terms.length) later(step);
      else warming = false;
    };
    later(step);
  }
  const later = (fn) => {
    if (window.scheduler?.postTask) scheduler.postTask(fn, { priority: 'user-visible' }).catch(() => {});
    else setTimeout(fn, 0);
  };
  function matches() {
    const nq = norm(q);
    if (!letter && !nq) return G.terms;
    const terms = G.terms,
      starts = [],
      has = [];
    const k = nq ? keys(true) : null;
    for (let i = 0; i < terms.length; i++) {
      const t = terms[i];
      if (letter && t.term[0].toUpperCase() !== letter) continue;
      if (!nq || k[i].startsWith(nq)) starts.push(t);
      else if (k[i].includes(nq) || definitionKeys[i].includes(nq)) has.push(t);
    }
    return nq ? [...starts, ...has] : starts;
  }
  // Opened before the dictionary has arrived: the same header (the search box keeps what is typed) over a
  // calm loading line.
  function renderLoading() {
    const status = failed
      ? 'The dictionary could not be loaded. Check the connection, then close this and try again.'
      : 'Loading the dictionary…';
    dlg.innerHTML = `<header class="gl-header"><div><strong>Legal dictionary</strong></div><div class="gl-tools"><input id="glFind" type="search" placeholder="Find a term" value="${E(q)}" aria-label="Find a term"><button id="glClose">← Back</button></div></header>
 <div class="gl-body"><p class="gl-empty gl-loading" role="status">${status}</p></div>`;
    $('glClose').onclick = close;
    const f = $('glFind');
    f.oninput = () => (q = f.value);
  }
  // The three parts of the dialog. A keystroke in the filter redraws only the list, and picking a term only the
  // term's article and the list's marks, so the filter box is never replaced and keeps its focus and caret.
  // Up to 400 rows are listed. Laying out 400 rows takes far longer than finding them, so a redraw of the list
  // alone (a keystroke) draws the first rows at once and adds the rest in the frames that follow, unless the
  // next keystroke comes first; the finished list is the same.
  const FIRST_ROWS = 40,
    ROWS_A_FRAME = 60;
  let listing = 0;
  function drawList(list) {
    const ticket = ++listing,
      all = rowsHTML(matches());
    list.innerHTML = all.slice(0, FIRST_ROWS).join('');
    list.scrollTop = 0;
    if (all.length <= FIRST_ROWS) {
      delete list.dataset.filling;
      return;
    }
    list.dataset.filling = '1';
    let at = FIRST_ROWS;
    const more = () => {
      if (ticket !== listing || !list.isConnected) return;
      list.insertAdjacentHTML('beforeend', all.slice(at, at + ROWS_A_FRAME).join(''));
      at += ROWS_A_FRAME;
      if (at < all.length) requestAnimationFrame(() => setTimeout(more, 0));
      else delete list.dataset.filling;
    };
    requestAnimationFrame(() => setTimeout(more, 0));
  }
  const listHTML = () => rowsHTML(matches()).join('');
  // One string per row of the list, the closing line ("N more", "No term matches.") included.
  function rowsHTML(list) {
    const shown = list.slice(0, 400);
    const rows = shown.map(
      (x) =>
        `<li><button data-term="${E(x.slug)}" aria-pressed="${x.slug === cur}"><strong>${E(x.term)}${x.kind === 'case' ? ' <em class="gl-case">case</em>' : ''}</strong><small>${E(x.definition.slice(0, 80))}${x.definition.length > 80 ? '…' : ''}</small></button></li>`,
    );
    if (list.length > 400)
      rows.push(`<li class="gl-more">${(list.length - 400).toLocaleString()} more · narrow the search</li>`);
    if (!list.length) rows.push('<li class="gl-more">No term matches.</li>');
    return rows;
  }
  function detailHTML() {
    const t = cur && bySlug.get(cur);
    return `${t ? `<h2>${E(t.term)}${t.kind === 'case' ? ' <em class="gl-case">landmark case</em>' : ''}</h2>${defHTML(t.definition)}<p class="gl-meta">${E(t.source || '')}${t.source ? ' · ' : ''}<a href="${E(t.url || LII(t.slug))}" target="_blank" rel="noopener">Read on Cornell LII ↗</a></p>${usedByHTML(t.slug)}` : `<p class="gl-empty">Pick a term on the left, or type to search. Each term links to its Cornell Legal Information Institute page.</p>`}`;
  }
  function render() {
    if (!loaded) {
      renderLoading();
      return;
    }
    dlg.innerHTML = `<header class="gl-header"><div><strong>Legal dictionary</strong><span>${G.terms.length.toLocaleString()} terms · Cornell LII Wex, the legal dictionary and encyclopedia of Cornell Law School's Legal Information Institute, complete as of 26 September 2026 · every term links to its Cornell page</span></div><div class="gl-tools"><input id="glFind" type="search" placeholder="Find a term" value="${E(q)}" aria-label="Find a term"><button id="glClose">← Back</button></div></header>
 <nav class="gl-letters" aria-label="Browse by letter"><button data-letter="" aria-pressed="${!letter}">All</button>${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
   .split('')
   .map((l) => `<button data-letter="${l}" aria-pressed="${letter === l}">${l}</button>`)
   .join('')}</nav>
 <div class="gl-body"><ul class="gl-list" role="listbox">${listHTML()}</ul>
 <article class="gl-detail">${detailHTML()}</article></div>`;
    $('glClose').onclick = close;
    const f = $('glFind');
    f.oninput = () => {
      q = f.value;
      const list = dlg.querySelector('.gl-list');
      if (list) drawList(list);
      else render();
    };
    warmKeys();
  }
  function pick(slug) {
    cur = slug;
    const detail = dlg.querySelector('.gl-detail');
    if (!detail) {
      render();
      return;
    }
    const list = dlg.querySelector('.gl-list');
    if (list?.dataset.filling) {
      // Picked while the rest of the list was still being added: draw it whole, with the new mark.
      listing++;
      delete list.dataset.filling;
      list.innerHTML = listHTML();
    } else
      for (const b of dlg.querySelectorAll('.gl-list [data-term]'))
        b.setAttribute('aria-pressed', String(b.dataset.term === cur));
    detail.innerHTML = detailHTML();
    detail.scrollTop = 0;
  }
  // One listener for every button the dialog draws (they used to be wired one by one after each redraw).
  dlg.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-letter],[data-term],[data-study-node],.gl-showall');
    if (!b || !dlg.contains(b)) return;
    if (b.hasAttribute('data-letter')) {
      letter = b.dataset.letter;
      render();
    } else if (b.hasAttribute('data-term')) {
      pick(b.dataset.term);
      history.replaceState(null, '', `#term=${encodeURIComponent(cur)}`);
    } else if (b.hasAttribute('data-study-node')) {
      close();
      window.LegalAtlas?.navigate?.('node', b.dataset.studyNode);
    } else {
      dlg.querySelectorAll('.gl-group .gl-used[hidden]').forEach((d) => (d.hidden = false));
      b.remove();
    }
  });
  function openGlossary(slug) {
    failed = false;
    if (!use()) wanted = slug || null;
    else if (slug && bySlug.has(slug)) {
      cur = slug;
      q = '';
      letter = '';
    }
    if (!dlg.open) {
      ret = { active: document.activeElement };
      for (const id of ['modal', 'fileDialog']) {
        const d = $(id);
        if (d?.open) d.close();
      }
      dlg.showModal();
    }
    render();
    if (!slug) setTimeout(() => $('glFind')?.focus(), 30);
  }
  function close() {
    wanted = null;
    if (dlg.open) dlg.close();
    try {
      ret?.active?.focus?.();
    } catch {}
    ret = null;
    if (location.hash.startsWith('#term=')) history.replaceState(null, '', location.pathname);
  }
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  window.addEventListener('hashchange', () => {
    const m = location.hash.match(/^#term=(.+)$/);
    if (m) openGlossary(decodeURIComponent(m[1]));
  });
  {
    const m = location.hash.match(/^#term=(.+)$/);
    if (m) setTimeout(() => openGlossary(decodeURIComponent(m[1])), 500);
  }
  // the dictionary box on the map opens the browser instead of zooming
  document.addEventListener(
    'click',
    (e) => {
      const t = e.target.closest('[data-dkla-term]');
      if (t) {
        e.preventDefault();
        e.stopPropagation();
        openGlossary(t.dataset.dklaTerm);
        return;
      }
      const r = e.target.closest(
        '[data-map-region="dictionary-region"],[data-study-region="dictionary-region"]',
      );
      if (r) {
        e.preventDefault();
        e.stopPropagation();
        openGlossary();
      }
    },
    true,
  );
  if (typeof goRegion === 'function') {
    const priorRegion = goRegion;
    goRegion = function (id, ...a) {
      if (id === 'dictionary-region') {
        openGlossary();
        return;
      }
      return priorRegion(id, ...a);
    };
  }
  // ---- search bar: dictionary rows
  const results = $('searchResults'),
    input = $('search');
  function searchRows() {
    if (!results || !input) return;
    if (results.hidden || results.dataset.glossed === input.value || !use() || !G.terms.length) return;
    results.dataset.glossed = input.value;
    const nq = norm(input.value);
    if (nq.length < 2) return;
    const hits = (() => {
      const starts = [],
        has = [];
      const k = keys(false);
      for (let i = 0; i < G.terms.length; i++) {
        if (k[i].startsWith(nq)) starts.push(G.terms[i]);
        else if (k[i].includes(nq)) has.push(G.terms[i]);
        if (starts.length >= 6) break;
      }
      return [...starts, ...has].slice(0, 3);
    })();
    if (!hits.length) return;
    const frag = document.createElement('div');
    frag.className = 'search-glossary';
    frag.innerHTML =
      `<div class="search-label">Dictionary</div>` +
      hits
        .map(
          (t) =>
            `<button data-search-type="term" data-dkla-term="${E(t.slug)}" data-result-type="Dictionary"><strong>${E(t.term)}</strong><small><span class="search-type">Dictionary</span>${E(t.definition.slice(0, 90))}${t.definition.length > 90 ? '…' : ''}</small></button>`,
        )
        .join('');
    const nodes = results.querySelectorAll(':scope>button');
    const after = nodes[Math.min(2, nodes.length - 1)];
    if (after) after.after(frag);
    else results.appendChild(frag);
  }
  if (results && input) new MutationObserver(searchRows).observe(results, { childList: true });
  // ---- reading panel: the terms an entry uses
  const insp = $('inspector');
  function termChips() {
    if (!insp || insp.hidden || insp.querySelector('.dkla-terms')) return;
    const id = currentNodeId();
    if (!id || !use()) return;
    const slugs = G.byNode[id];
    if (!slugs?.length) return;
    const sec = document.createElement('section');
    sec.className = 'dkla-terms';
    const SHOW = 18;
    sec.innerHTML = `<h3>Terms in this entry <span>${slugs.length}</span></h3><div class="dkla-term-chips">${slugs
      .map((s, i) => {
        const t = bySlug.get(s);
        return t
          ? `<button type="button" data-dkla-term="${E(s)}" title="${E(t.definition.slice(0, 140))}"${i >= SHOW ? ' hidden' : ''}>${E(t.term)}</button>`
          : '';
      })
      .join(
        '',
      )}${slugs.length > SHOW ? `<button type="button" class="dkla-term-more">Show all ${slugs.length} terms</button>` : ''}</div>`;
    const more = sec.querySelector('.dkla-term-more');
    if (more)
      more.onclick = (e) => {
        e.stopPropagation();
        sec.querySelectorAll('.dkla-term-chips [hidden]').forEach((b) => (b.hidden = false));
        more.remove();
      };
    const anchor =
      insp.querySelector('.dkla-timeline') ||
      insp.querySelector('.dkla-rule') ||
      insp.querySelector('.takeaway');
    if (anchor) anchor.after(sec);
    else insp.querySelector('.reader-body')?.appendChild(sec);
  }
  function currentNodeId() {
    try {
      const v = window.LegalAtlas.geography().view;
      return v.selected?.type === 'node' ? v.selected.id : null;
    } catch {
      return null;
    }
  }
  if (insp)
    new MutationObserver(() => {
      termChips();
    }).observe(insp, { childList: true, subtree: true });
  // The dictionary arrived after the page was drawn: redraw what shows it.
  function refresh() {
    if (dlg.open) {
      // Opened at a term: show it, as openGlossary would have (anything typed meanwhile is kept).
      if (wanted && bySlug.has(wanted)) {
        cur = wanted;
        letter = '';
      }
      const typing = document.activeElement?.id === 'glFind';
      render();
      if (typing || !wanted) {
        const f = $('glFind');
        f?.focus();
        f?.setSelectionRange(q.length, q.length);
      }
    }
    wanted = null;
    if (results) delete results.dataset.glossed;
    searchRows();
    termChips();
    // The Home map's dictionary label ("N terms · click to browse").
    if (typeof schedule === 'function') schedule();
    document.dispatchEvent(new CustomEvent('dkla:glossary'));
  }
  if (!loaded) DKLAData.whenLoaded(ID).then(() => load().catch(() => {}));
})();
