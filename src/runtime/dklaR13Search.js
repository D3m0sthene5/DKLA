/* DKLA r13: ranked, typo-tolerant search (MiniSearch, MIT) in place of the substring scan; matched terms highlighted in results and in the opened entry; Ctrl/Cmd+K focuses the bar.
   Only text a reader can see is indexed, so every result can say where it matched: one short passage under each
   result, and a slim note at the top of the opened entry when that passage is not on screen ("Show me"). */
(() => {
  'use strict';
  if (typeof MiniSearch !== 'function' || typeof searchEntries !== 'function') return;
  const $ = (id) => document.getElementById(id);
  const E = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const SPLIT = /[\s\u2013\u2014,;:()\[\]"\u201c\u201d'\u2019.?!/]+/;
  // A character that ends a word for the tokenizer (its split characters, plus the § that processTerm trims).
  const BOUNDARY = /[\s\u2013\u2014,;:()\[\]"\u201c\u201d'\u2019.?!/\u00a7]/;
  const tokenize = (s) =>
    String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(SPLIT)
      .filter((t) => t.length > 0);
  const processTerm = (t) => t.replace(/^[\u00a7'\u2019]+|[\u00a7'\u2019]+$/g, '') || null;
  const OPTS = {
    fields: ['title', 'shortTitle', 'summary', 'rule', 'notes', 'body', 'tags'],
    storeFields: ['title'],
    tokenize,
    processTerm,
    searchOptions: {
      boost: { title: 6, shortTitle: 6, summary: 2, rule: 2 },
      prefix: true,
      fuzzy: (t) => (t.length > 4 && !/\d/.test(t) ? 0.2 : 0),
      combineWith: 'AND',
    },
  };
  // A word of one or two characters ("b", "6", "de") is matched as typed, not as the start of longer words
  // ("brand", "63", "denied"), unless it is the word still being typed at the end of the box.
  const searchOptions = (q, extra) => {
    const typing = !/[\s\u2013\u2014,;:()\[\]"\u201c\u201d'\u2019.?!/\u00a7]$/.test(q);
    return {
      prefix: (t, i, terms) => t.length > 2 || (typing && i === terms.length - 1),
      ...extra,
    };
  };

  /* ---------- what a reader can see of an entry ---------- */
  // Tags such as "class-07", "lrs-r8" or "r14-brief" are build flags, shown nowhere but the raw record
  // details. Only those known flags are left out: a tag a reader typed in ("must-know") stays searchable.
  const INTERNAL_TAG =
    /^(?:class-(?:\d+|hub)|lrs-[a-z0-9-]+|r\d+(?:-[a-z]+)*|rlcc|course-hub|editorial-companion|partial-assigned-excerpt|shorter-authority|source-gap|source-on-file|unanswered-textbook-problem)$/i;
  // Text that is an address, an identifier or a fingerprint rather than prose.
  const NOT_PROSE = /^(?:https?:\/\/\S+|#\S*|[a-f0-9]{12,}|[a-z0-9]+(?:[-_][a-z0-9]+)+)$/i;
  const URL = /\b(?:https?:\/\/|www\.)[^\s)\]>"']+/gi;
  // Cheap on the common path: most texts hold no address, and the regular expression runs only when one might.
  const prose = (s) => {
    s = typeof s === 'string' ? s : String(s ?? '');
    if (s.includes('://') || s.includes('www.')) s = s.replace(URL, ' ').replace(/[ \t]{2,}/g, ' ');
    return s.trim();
  };
  // Section values are strings; an older saved graph may hold objects. Keep their text, never their keys.
  function leaves(value, out = [], nested = false) {
    if (typeof value === 'string') {
      if (value.trim() && !(nested && NOT_PROSE.test(value.trim()))) out.push(value);
    } else if (Array.isArray(value)) value.forEach((v) => leaves(v, out, true));
    else if (value && typeof value === 'object') Object.values(value).forEach((v) => leaves(v, out, true));
    return out;
  }
  // The parts of an entry, in reading order, with where each one is shown.
  function parts(n) {
    const out = [];
    const add = (field, label, text, place = 'main') => {
      text = prose(text);
      if (text) out.push({ field, label, text, place });
    };
    add('title', 'Title', n.title);
    add('shortTitle', 'Title', n.shortTitle);
    // A case reader shows its plain-English introduction where the summary would be (takeaways.js). The
    // stored one-line rule is still shown elsewhere (Drill's "Rule in one line", the subject lists), so it
    // stays searchable too, last, as a place the reader cannot be scrolled to.
    const plain = typeof window.DKLATakeaways?.for === 'function' ? window.DKLATakeaways.for(n.id) : null;
    add('summary', 'the introduction', plain || n.summary);
    for (const [label, value] of Object.entries(n.sections || {}))
      add('body', label, leaves(value).join('\n\n'));
    // The reader's own heading for the notes (semesterCode.js, renamed for cases by r19/plain.js).
    add('notes', n.kind === 'Case' ? 'Notes' : 'Explanation', n.notes);
    add(
      'tags',
      'Sources & record details',
      (n.tags || []).filter((t) => typeof t === 'string' && !INTERNAL_TAG.test(t)).join(', '),
      'details',
    );
    if (plain && n.summary) add('rule', 'the one-line rule', n.summary, 'elsewhere');
    return out;
  }
  function searchDocument(n) {
    const doc = { id: n.id, title: '', shortTitle: '', summary: '', rule: '', notes: '', body: '', tags: '' };
    for (const p of parts(n)) doc[p.field] += (doc[p.field] ? '\n\n' : '') + p.text;
    return doc;
  }

  let ms = null,
    building = false,
    pending = null,
    idle = null,
    generation = 0;
  const stats = { ms: 0, documents: 0, builds: 0 };
  function build() {
    pending = null;
    building = true;
    const began = performance.now();
    try {
      const m = new MiniSearch(OPTS);
      m.addAll(data.nodes.map(searchDocument));
      ms = m;
      generation++;
      partsCache.clear();
      stats.ms = Math.round(performance.now() - began);
      stats.documents = m.documentCount;
      stats.builds++;
    } catch (err) {
      console.warn('search index', err);
      ms = null;
    }
    building = false;
  }
  // One build, however many times the start-up scripts patch the content and call rebuildIndex: each call
  // pushes the same deferred build back, instead of queuing another second of indexing on the main thread.
  function schedule(delay) {
    if (pending) clearTimeout(pending);
    if (idle !== null && 'cancelIdleCallback' in window) {
      cancelIdleCallback(idle);
      idle = null;
    }
    pending = setTimeout(build, delay);
  }
  if ('requestIdleCallback' in window)
    idle = requestIdleCallback(
      () => {
        idle = null;
        if (!pending) build();
      },
      { timeout: 1500 },
    );
  else schedule(300);
  const priorRebuild = typeof rebuildIndex === 'function' ? rebuildIndex : null;
  if (priorRebuild)
    rebuildIndex = function (...a) {
      const r = priorRebuild.apply(this, a);
      schedule(400);
      return r;
    };
  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u00a7.,\u2019']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  function mark(text, terms) {
    let out = E(text);
    for (const t of terms) {
      if (t.length < 2) continue;
      out = out.replace(
        new RegExp('(^|[^\\w<])(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'),
        '$1<mark>$2</mark>',
      );
    }
    return out;
  }

  /* ---------- where a result matched ---------- */
  // Lower-cased, accent-free copy of a text, with a map back to the original positions when they differ.
  function fold(text) {
    const s = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (s.length === text.length) return { s, at: null };
    let out = '';
    const at = [];
    for (let i = 0; i < text.length; i++) {
      const f = text[i]
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      for (let k = 0; k < f.length; k++) {
        out += f[k];
        at.push(i);
      }
    }
    at.push(text.length);
    return { s: out, at };
  }
  const original = (folded, i) => (folded.at ? folded.at[Math.min(i, folded.at.length - 1)] : i);
  // Whole-word occurrences of an indexed term, the way the tokenizer would have cut the text.
  function occurrences(s, term, limit = 40) {
    const out = [];
    if (!term) return out;
    let i = 0;
    while ((i = s.indexOf(term, i)) >= 0 && out.length < limit) {
      const before = i ? s[i - 1] : ' ',
        after = i + term.length < s.length ? s[i + term.length] : ' ';
      if (BOUNDARY.test(before) && BOUNDARY.test(after)) out.push(i);
      i += term.length;
    }
    return out;
  }
  function distance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const row = [i];
      for (let j = 1; j <= b.length; j++)
        row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = row;
    }
    return prev[b.length];
  }
  const queryTerms = (q) => [...new Set(tokenize(q).map(processTerm).filter(Boolean))];
  // Which word of the query each matched word answers: the same word, a word it begins, or a near spelling.
  function relate(docTerm, qTerms) {
    let best = null;
    qTerms.forEach((q, index) => {
      const kind = docTerm === q ? 0 : docTerm.startsWith(q) ? 1 : 2;
      const d = kind === 2 ? distance(docTerm, q, 6) : 0;
      if (kind === 2 && d > 6) return;
      if (!best || kind < best.kind || (kind === best.kind && d < best.d)) best = { index, kind, d, q };
    });
    return best;
  }
  const partsCache = new Map();
  function readable(id) {
    let p = partsCache.get(id);
    if (!p) {
      const n = nodesById.get(id);
      p = n ? parts(n).map((part) => ({ ...part, folded: fold(part.text) })) : [];
      if (partsCache.size > 400) partsCache.clear();
      partsCache.set(id, p);
    }
    return p;
  }
  const WINDOW = 90,
    SNIPPET = 170,
    LEAD = 40;
  // The best passage for one result: the stretch of visible text holding the most of the query's words,
  // earliest in reading order. Null when the title alone explains the result.
  function explain(hit, q) {
    const qTerms = queryTerms(q),
      docTerms = Object.keys(hit.match || {}),
      related = new Map(),
      found = new Set(),
      inTitle = new Set(),
      fuzzy = [];
    for (const t of docTerms) {
      const r = relate(t, qTerms);
      if (!r) continue;
      related.set(t, r);
      found.add(r.index);
      if (hit.match[t].some((f) => f === 'title' || f === 'shortTitle')) inTitle.add(r.index);
      if (r.kind === 2) fuzzy.push(t);
    }
    const missing = qTerms.filter((_, i) => !found.has(i));
    // "similar" names only near spellings in the passage shown; any others matched elsewhere in the entry.
    const why = {
      id: hit.id,
      label: '',
      place: '',
      html: '',
      terms: [],
      missing,
      similar: [],
      also: fuzzy,
      excerpt: '',
    };
    if (found.size && [...found].every((i) => inTitle.has(i))) return missing.length ? why : null;
    let best = null;
    readable(hit.id).forEach((part, order) => {
      if (part.field === 'title' || part.field === 'shortTitle') return;
      const occ = [];
      for (const t of docTerms) {
        if (!related.has(t) || !hit.match[t].includes(part.field)) continue;
        for (const at of occurrences(part.folded.s, t))
          occ.push({ at, end: at + t.length, t, q: related.get(t).index });
      }
      occ.sort((a, b) => a.at - b.at);
      for (const anchor of occ) {
        const near = occ.filter((o) => o.at >= anchor.at && o.at - anchor.at <= WINDOW);
        const score = new Set(near.map((o) => o.q)).size * 1000 - order * 5 - anchor.at / 1e5;
        if (!best || score > best.score) best = { score, part, near };
      }
    });
    if (!best) return why;
    const { part, near } = best,
      f = part.folded,
      text = part.text;
    let from = original(f, near[0].at),
      to = original(f, near[near.length - 1].end);
    // Little context before the match, more after, so the marked word sits on the first line even on a phone.
    const before = Math.min(LEAD, Math.max(16, Math.round((SNIPPET - (to - from)) / 2)));
    let a = Math.max(0, from - before),
      b = Math.min(text.length, Math.max(to + 24, a + SNIPPET));
    if (a > 0) {
      const space = text.indexOf(' ', a);
      if (space >= 0 && space < from) a = space + 1;
    }
    if (b < text.length) {
      const space = text.lastIndexOf(' ', b);
      if (space > to) b = space;
    }
    let html = a > 0 ? '…' : '',
      cursor = a;
    for (const o of near) {
      const s = original(f, o.at),
        e = original(f, o.end);
      if (s < cursor) continue;
      html += E(text.slice(cursor, s).replace(/\s+/g, ' ')) + '<mark>' + E(text.slice(s, e)) + '</mark>';
      cursor = e;
    }
    html += E(text.slice(cursor, b).replace(/\s+/g, ' ')) + (b < text.length ? '…' : '');
    const terms = [...new Set(near.map((o) => o.t))],
      similar = terms.filter((t) => related.get(t).kind === 2);
    return Object.assign(why, {
      label: part.label,
      place: part.place,
      field: part.field,
      html,
      terms,
      similar,
      also: fuzzy.filter((t) => !similar.includes(t)),
      excerpt: text.slice(from, to),
    });
  }
  const quoted = (list) => list.map((t) => '“' + E(t) + '”').join(', ');
  function whereLine(why) {
    const bits = [];
    if (why.label) bits.push('in ' + E(why.label));
    if (why.similar.length) bits.push('similar word: ' + quoted(why.similar));
    if (why.also.length) bits.push('also matched ' + quoted(why.also));
    if (why.missing.length) bits.push(quoted(why.missing) + ' not in this entry');
    return bits.join(' · ');
  }
  let shown = new Map(); // id -> {hit, q, why}
  function fill(button) {
    const row = shown.get(button.dataset.searchId);
    const slot = button.querySelector('.search-why');
    if (!row || !slot || slot.dataset.filled) return;
    slot.dataset.filled = '1';
    if (row.why === undefined) row.why = explain(row.hit, row.q);
    const why = row.why;
    if (!why || (!why.html && !why.missing.length)) {
      slot.remove();
      return;
    }
    slot.innerHTML =
      (why.html ? `<span class="search-snippet">${why.html}</span>` : '') +
      `<span class="search-where">${whereLine(why)}</span>`;
  }
  // Snippets for the first rows at once; the rest only as they scroll into view.
  const EAGER = 8;
  let watcher = null;
  function fillVisible() {
    const buttons = [...$('searchResults').querySelectorAll('button[data-search-type="node"]')];
    watcher?.disconnect();
    watcher =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            (entries) => {
              for (const e of entries)
                if (e.isIntersecting) {
                  fill(e.target);
                  watcher.unobserve(e.target);
                }
            },
            { root: $('searchResults'), rootMargin: '240px 0px' },
          )
        : null;
    buttons.forEach((b, i) => (i < EAGER || !watcher ? fill(b) : watcher.observe(b)));
  }

  const prior = searchEntries;
  searchEntries = function () {
    const q = $('search').value.trim();
    if (typeof query !== 'undefined') query = q;
    if (!q) {
      closeSearch();
      return;
    }
    if (!ms) {
      prior();
      return;
    }
    const nq = norm(q),
      tokens = nq.split(' ').filter(Boolean),
      rows = [];
    for (const r of mapData().regions) {
      const t = norm(r.title + ' ' + shortRegionTitle(r));
      if (tokens.every((w) => t.includes(w)))
        rows.push({ type: 'region', id: r.id, title: shortRegionTitle(r), sub: 'Subject', terms: tokens });
    }
    for (const d of Object.values(mapData().districts)) {
      const t = norm(d.title + ' ' + d.question);
      if (tokens.every((w) => t.includes(w)))
        rows.push({
          type: 'district',
          id: d.id,
          title: d.title,
          sub: shortRegionTitle(regionFor(d.region)),
          terms: tokens,
        });
    }
    let hits = ms.search(q, searchOptions(q)),
      some = false;
    if (!hits.length && tokens.length > 1) {
      hits = ms.search(q, searchOptions(q, { combineWith: 'OR' }));
      some = hits.length > 0;
    }
    const total = rows.length + hits.length;
    shown = new Map();
    for (const h of hits.slice(0, 45)) {
      const n = nodesById.get(h.id);
      if (!n) continue;
      let sub = '';
      try {
        sub = `${(n.courses || []).join(', ')} · ${geoDistrict(geoPlacement(n.id).district)?.title || roleLabel(n)}`;
      } catch {
        sub = (n.courses || []).join(', ');
      }
      shown.set(n.id, { hit: h, q });
      rows.push({ type: 'node', id: n.id, title: n.title, sub, terms: h.terms });
    }
    $('searchResults').innerHTML =
      `<div class="search-label">${total} result${total === 1 ? '' : 's'} ${some ? 'with some of your words' : 'across your atlas'}</div>` +
      rows
        .map(
          (r) =>
            `<button data-search-type="${r.type}" data-search-id="${E(r.id)}" data-terms="${E(r.terms.join(' '))}"><strong>${mark(r.title, r.terms)}</strong><small>${E(r.sub)}</small>${r.type === 'node' ? '<span class="search-why"></span>' : ''}</button>`,
        )
        .join('') +
      (!rows.length
        ? '<p class="search-empty">No matches. Try a case name, a rule number or a shorter phrase.</p>'
        : total > 45
          ? '<p class="search-empty">Showing the closest 45 matches. Add a word to narrow them.</p>'
          : '');
    fillVisible();
    S.searchOpen = true;
    $('searchResults').hidden = false;
    $('search').setAttribute('aria-expanded', 'true');
  };

  /* ---------- the opened entry ---------- */
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const readerBody = () => $('inspector')?.querySelector('.reader-body');
  const selectedId = () =>
    typeof selected !== 'undefined' && selected && selected.type === 'node' ? selected.id : null;
  // highlight the matched terms in the opened entry without touching the DOM (CSS Custom Highlight API)
  function highlight(terms) {
    if (!('highlights' in CSS)) return;
    const body = readerBody();
    if (!body) return;
    const ranges = [],
      walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('.search-why-strip')) continue;
      const s = node.data.toLowerCase();
      for (const t of terms) {
        if (t.length < 3) continue;
        let i = 0;
        while ((i = s.indexOf(t, i)) >= 0) {
          const r = new Range();
          r.setStart(node, i);
          r.setEnd(node, i + t.length);
          ranges.push(r);
          i += t.length;
          if (ranges.length > 400) break;
        }
      }
    }
    CSS.highlights.set('dkla-hit', new Highlight(...ranges));
  }
  // The element of the reader that shows one part of the entry.
  function container(body, why) {
    if (why.field === 'summary') return body.querySelector('.takeaway') || body;
    if (why.field === 'tags') return body.querySelector('#entryAudit') || body;
    const want = norm(why.label);
    for (const h of body.querySelectorAll('h3,h4')) {
      if (norm(h.textContent) !== want) continue;
      if (h.parentElement !== body && h.parentElement.tagName === 'SECTION') return h.parentElement;
      const next = h.nextElementSibling;
      if (next && !/^H[1-6]$/.test(next.tagName)) return next;
    }
    if (why.field === 'notes') return body.querySelector('.note-text') || body;
    return body;
  }
  // The passage as live ranges in the reader: the whole stretch and each matched word in it.
  function locate(why) {
    const body = readerBody();
    if (!body || !why?.excerpt) return null;
    const box = container(body, why);
    const nodes = [],
      starts = [];
    let joined = '';
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('.search-why-strip,script,style')) continue;
      nodes.push(node);
      starts.push(joined.length);
      joined += node.data;
    }
    const folded = fold(joined),
      squash = (s) => s.replace(/\s+/g, ' ');
    // Compare with runs of white space made single, so paragraph breaks in the record still match.
    const spaced = [],
      flat = squash(folded.s).length === folded.s.length ? null : [];
    let plain = folded.s;
    if (flat) {
      plain = '';
      for (let i = 0; i < folded.s.length; i++) {
        if (/\s/.test(folded.s[i]) && /\s/.test(folded.s[i - 1] || '')) continue;
        plain += /\s/.test(folded.s[i]) ? ' ' : folded.s[i];
        spaced.push(i);
      }
      spaced.push(folded.s.length);
    }
    const back = (i) => original(folded, flat ? spaced[Math.min(i, spaced.length - 1)] : i);
    const want = squash(fold(why.excerpt).s);
    let at = plain.indexOf(want),
      len = want.length;
    if (at < 0) {
      const word = why.terms[0] || '';
      at = occurrences(plain, word, 1)[0] ?? -1;
      len = word.length;
    }
    if (at < 0) return null;
    const point = (offset) => {
      let k = starts.length - 1;
      while (k > 0 && starts[k] > offset) k--;
      return [nodes[k], Math.min(offset - starts[k], nodes[k].data.length)];
    };
    const range = (s, e) => {
      const r = new Range();
      r.setStart(...point(back(s)));
      r.setEnd(...point(back(e)));
      return r;
    };
    const words = [];
    for (const t of why.terms)
      for (const o of occurrences(plain.slice(at, at + len), t)) words.push(range(at + o, at + o + t.length));
    return { box, passage: range(at, at + len), words };
  }
  function scroller(el) {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowY;
      if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p;
    }
    return null;
  }
  // On screen means inside the reader's scrolling area, below its sticky top bar and the strip, and inside
  // the window.
  function onScreen(range) {
    const r = range.getBoundingClientRect();
    if (!r.width && !r.height) return false;
    const holder = scroller(range.startContainer.parentElement),
      view = holder ? holder.getBoundingClientRect() : { top: 0, bottom: innerHeight },
      bar = $('inspector')?.querySelector('.reader-top');
    const top = Math.max(view.top, 0, bar ? bar.getBoundingClientRect().bottom : 0, stripBottom()),
      bottom = Math.min(view.bottom, innerHeight);
    return r.top >= top - 2 && r.bottom <= bottom + 2;
  }
  const stripBottom = () => (strip?.isConnected ? strip.getBoundingClientRect().bottom : 0);

  let target = null, // {id, why, decided}: set only by choosing a search result
    strip = null;
  const announcer = document.createElement('div');
  announcer.className = 'search-why-announce';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  document.body.appendChild(announcer);
  const say = (text) => {
    announcer.textContent = '';
    setTimeout(() => (announcer.textContent = text), 60);
  };
  // Undo what Show me did to the passage: its outline and the tabindex it was given.
  function unmark() {
    for (const el of document.querySelectorAll('#inspector .search-why-target')) {
      el.classList.remove('search-why-target');
      if (el.dataset.searchWhyFocus) {
        el.removeAttribute('tabindex');
        delete el.dataset.searchWhyFocus;
      }
    }
  }
  function dropStrip() {
    target = null;
    strip?.remove();
    strip = null;
    unmark();
    if ('highlights' in CSS) CSS.highlights.delete('dkla-hit-focus');
  }
  function placeStrip() {
    if (!strip || !target) return;
    // Another entry, or the reader closed: the strip belonged to that one opening from search.
    if (selectedId() !== target.id || $('inspector').hidden) return dropStrip();
    const top = $('inspector')?.querySelector('.reader-top');
    if (top && top.nextElementSibling !== strip) top.after(strip);
  }
  const words = (why, html = true) =>
    why.terms
      .slice(0, 3)
      .map((t) => '“' + (html ? E(t) : t) + '”')
      .join(', ');
  // A match in the one-line rule: the reader does not show that text, so there is nothing to show there.
  const ELSEWHERE = ', which this case’s Study card shows';
  function showStrip(why) {
    const away = why.place === 'elsewhere';
    strip = document.createElement('div');
    strip.className = 'search-why-strip';
    strip.setAttribute('role', 'region');
    strip.setAttribute('aria-label', 'Where your search matched');
    strip.innerHTML =
      `<span class="search-why-text">Your search matched ${words(why)} in <b>${E(why.label)}</b>${away ? E(ELSEWHERE) : ''}</span>` +
      (away ? '' : '<button type="button" class="search-why-show">Show me</button>') +
      '<button type="button" class="search-why-close" aria-label="Dismiss where your search matched">×</button>';
    strip.querySelector('.search-why-show')?.addEventListener('click', showMe);
    strip.querySelector('.search-why-close').addEventListener('click', () => {
      dropStrip();
      // The entry's title takes the keyboard (it is not focusable by itself); the close button if none.
      const title = $('inspector')?.querySelector('.reader-body h2');
      if (title && !title.hasAttribute('tabindex')) title.setAttribute('tabindex', '-1');
      (title || $('closeInspector'))?.focus?.({ preventScroll: true });
    });
    placeStrip();
  }
  function announce(why) {
    say(
      why.place === 'elsewhere'
        ? `Your search matched ${words(why, false)} in ${why.label}${ELSEWHERE}.`
        : `Your search matched ${words(why, false)} in ${why.label}. Show me is at the top of the entry.`,
    );
  }
  function showMe() {
    if (!target) return;
    const body = readerBody();
    if (target.why.place === 'details') body?.querySelector('#entryAudit')?.setAttribute('open', '');
    const found = locate(target.why);
    if (!found) {
      say('That passage is not shown in this entry right now.');
      return;
    }
    unmark();
    const block = found.passage.startContainer.parentElement?.closest('p,li,dd,section,div') || found.box;
    block.classList.add('search-why-target');
    if (!block.hasAttribute('tabindex')) {
      block.setAttribute('tabindex', '-1');
      block.dataset.searchWhyFocus = '1';
    }
    // Scroll only the reader, so the page and its top bar stay where they are.
    const holder = scroller(block),
      spot = found.passage.getBoundingClientRect(),
      behavior = calm.matches ? 'auto' : 'smooth';
    if (holder) {
      const view = holder.getBoundingClientRect();
      holder.scrollTo({
        top: holder.scrollTop + spot.top - view.top - Math.max(48, (holder.clientHeight - spot.height) / 2),
        behavior,
      });
    } else block.scrollIntoView({ block: 'center', behavior });
    block.focus({ preventScroll: true });
    if ('highlights' in CSS && found.words.length)
      CSS.highlights.set('dkla-hit-focus', new Highlight(...found.words));
    say(`Showing the match in ${target.why.label}.`);
  }
  // Decide as soon as the chosen entry is in the reader, before it is first drawn, so the strip never pushes
  // the entry down while it is being read. The strip goes in first and the passage is measured below it and
  // the sticky top bar: a match already on screen keeps the plain highlight (the strip comes out again,
  // still undrawn); a match further down, in a closed part or outside the reader keeps the strip.
  function decide() {
    if (!target || target.decided) return;
    const body = readerBody();
    if (!body || selectedId() !== target.id || $('inspector').hidden || !body.querySelector('h2')) return;
    target.decided = true;
    const why = target.why;
    let found = null;
    if (why.place === 'main') {
      found = locate(why);
      // Not found in what the reader shows: today's highlight is all there is to do.
      if (!found) return dropStrip();
    }
    if (!strip) showStrip(why);
    if (found && onScreen(found.passage)) return dropStrip();
    announce(why);
  }
  // Fallback for a reader drawn before the choice was recorded, or not drawn by a direct re-render.
  function settle(tries = 0) {
    if (!target || target.decided) return;
    decide();
    if (target && !target.decided) {
      if (tries < 20) setTimeout(() => settle(tries + 1), 150);
      else dropStrip();
    }
  }
  new MutationObserver(() => {
    placeStrip();
    // After the other observers of this change have run (takeaways.js swaps in the introduction).
    if (target && !target.decided) queueMicrotask(decide);
  }).observe($('inspector'), {
    childList: true,
    attributes: true,
    attributeFilter: ['hidden'],
  });
  document.addEventListener(
    'click',
    (e) => {
      const b = e.target.closest('#searchResults [data-search-type="node"][data-terms]');
      if (!b) return;
      const terms = b.dataset.terms.split(' ').filter(Boolean);
      dropStrip();
      const row = shown.get(b.dataset.searchId);
      if (row) {
        if (row.why === undefined) row.why = explain(row.hit, row.q);
        if (row.why?.html) {
          target = { id: row.hit.id, why: row.why, decided: false };
          setTimeout(settle, 150);
        }
      }
      setTimeout(() => highlight(terms), 450);
      setTimeout(() => highlight(terms), 1200);
    },
    true,
  );
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const s = $('search');
      s.focus();
      s.select();
    }
  });
  window.DKLA = Object.assign(window.DKLA || {}, {
    searchIndex: () => ms,
    searchIndexStats: stats,
    searchDocument,
    // Where each indexed part of an entry is shown: {field, label, place}.
    searchParts: (id) => readable(id).map(({ field, label, place }) => ({ field, label, place })),
    searchExplain: (id, q) => {
      const hit =
        ms?.search(q, searchOptions(q)).find((h) => h.id === id) ||
        ms?.search(q, searchOptions(q, { combineWith: 'OR' })).find((h) => h.id === id);
      return hit ? explain(hit, q) : null;
    },
    rebuildSearchIndex: () => {
      build();
      return stats.ms;
    },
  });
})();
