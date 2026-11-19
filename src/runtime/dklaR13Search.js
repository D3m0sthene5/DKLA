/* DKLA r13: ranked, typo-tolerant search (MiniSearch, MIT) in place of the substring scan; matched terms highlighted in results and in the opened entry; Ctrl/Cmd+K focuses the bar.
   Only text a reader can see is indexed, so every result can say where it matched: one short passage under each
   result, and a slim note at the top of the opened entry when that passage is not on screen ("Show me").
   v3.1: the same index also holds the flowcharts, the lecture decks, the canons of construction and the LRS
   syllabus classes, read from the data blocks their own modules show; every result is labelled with its type.
   A course plus a class, week or assignment number ("LRS Class 22", "civ pro 12") lists that session's material
   first. Exact titles, names and aliases come before other matches. On a window 850 px wide or less the box
   becomes a Search button that opens a full-width search panel. */
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
    fields: ['title', 'shortTitle', 'aliases', 'summary', 'rule', 'notes', 'body', 'tags'],
    storeFields: ['title'],
    tokenize,
    processTerm,
    searchOptions: {
      boost: { title: 6, shortTitle: 6, aliases: 5, summary: 2, rule: 2 },
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
  function documentFrom(id, list) {
    const doc = {
      id,
      title: '',
      shortTitle: '',
      aliases: '',
      summary: '',
      rule: '',
      notes: '',
      body: '',
      tags: '',
    };
    for (const p of list) doc[p.field] += (doc[p.field] ? '\n\n' : '') + p.text;
    return doc;
  }
  const searchDocument = (n) => documentFrom(n.id, parts(n));

  /* ---------- flowcharts, lectures, canons and LRS classes ---------- */
  // Each is one record: {key, label, course, number, title, sub, names, parts, open, ref}. The key never looks like
  // an entry id ("flowchart:K-16"); open and ref say how a result opens it.
  const COURSES = {
    contracts: { name: 'Contracts', short: 'Contracts', unit: 'Assignment' },
    civil: { name: 'Civil Procedure', short: 'Civ Pro', unit: 'Week' },
    lrs: { name: 'Legislation and the Regulatory State', short: 'LRS', unit: 'Class' },
  };
  const courseOf = (name) => Object.keys(COURSES).find((k) => COURSES[k].name === name) || null;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // "2026-11-16" is shown as "Nov 16". The day is read from the text, never from a clock or a time zone.
  const day = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? MONTHS[+m[2] - 1] + ' ' + +m[3] : '';
  };
  // Replaced whole when the records are collected again, so a reader never sees a half-filled list.
  let extra = new Map();
  // These blocks are in the page and never change, so each is parsed once (an empty or missing one is asked again).
  const blocks = new Map();
  function block(id) {
    if (blocks.has(id)) return blocks.get(id);
    try {
      const value = JSON.parse(document.getElementById(id)?.textContent || 'null');
      if (value) blocks.set(id, value);
      return value;
    } catch {
      return null;
    }
  }
  // A generator, so the index can pause between records (each yield) and let the page respond.
  function* collectExtras() {
    const next = new Map();
    const record = (x) => {
      x.parts = x.parts.map((p) => ({ place: 'elsewhere', ...p, text: prose(p.text) })).filter((p) => p.text);
      next.set(x.key, x);
    };
    const title = (id) => nodesById.get(id)?.title || '';
    for (const chart of block('dklaFlowchartsData') || []) {
      const course = { K: 'contracts', CP: 'civil', LRS: 'lrs' }[chart.id.split('-')[0]] || null;
      const cited = [...new Set(chart.nodes.flatMap((step) => step.sources || []))];
      // The subjects and topics on the map that hold the entries the chart cites ("Battle of the forms"). A place
      // holding at least a third of them is what the chart is about; the others it only touches.
      const places = new Map();
      for (const id of cited) {
        try {
          const at = geoPlacement(id);
          const region = at?.region && regionFor(at.region);
          const district = at?.district && geoDistrict(at.district);
          for (const name of [region && shortRegionTitle(region), district?.title])
            if (name) places.set(name, (places.get(name) || 0) + 1);
        } catch {
          /* an entry with no place on the map */
        }
      }
      const most = Math.max(0, ...places.values()),
        main = [...places]
          .filter(([, count]) => count === most || count * 3 >= cited.length)
          .map(([name]) => name),
        touched = [...places.keys()].filter((name) => !main.includes(name));
      record({
        key: 'flowchart:' + chart.id,
        label: 'Flowchart',
        course,
        title: chart.title,
        sub: `${course ? COURSES[course].name : 'Cross-course'} · Flowchart ${chart.id} · ${chart.nodes.length} steps`,
        names: [chart.title, chart.id, 'flowchart ' + chart.id],
        open: 'flowchart',
        ref: chart.id,
        parts: [
          { field: 'title', label: 'Title', text: chart.title },
          { field: 'shortTitle', label: 'Title', text: 'Flowchart ' + chart.id },
          { field: 'summary', label: 'Subjects on the map', text: main.join('; ') },
          ...chart.nodes.map((step, i) => ({
            field: 'body',
            label: 'Step ' + (i + 1),
            text: [step.label, step.detail, (step.edges || []).map((e) => e.label).join(' · ')]
              .filter(Boolean)
              .join('\n'),
          })),
          { field: 'notes', label: 'Entries it cites', text: cited.map(title).filter(Boolean).join('; ') },
          { field: 'tags', label: 'Other subjects it touches', text: touched.join('; ') },
        ],
      });
      yield;
    }
    for (const deck of block('dklaLecturesData') || []) {
      const course = COURSES[deck.course] ? deck.course : null;
      if (!course) continue;
      const short = COURSES[course].short;
      record({
        key: `lecture:${course}-${deck.number}`,
        label: 'Lecture',
        course,
        number: deck.number,
        title: `Class ${deck.number} lecture · ${deck.title}`,
        sub: [short, day(deck.date), deck.topics.length + ' topics'].filter(Boolean).join(' · '),
        names: [deck.title, `${short} class ${deck.number}`, `${short} class ${deck.number} lecture`],
        open: 'lecture',
        ref: `${course}-${deck.number}`,
        parts: [
          { field: 'title', label: 'Title', text: deck.title },
          { field: 'shortTitle', label: 'Title', text: `${short} Class ${deck.number} lecture` },
          ...[...deck.topics, ...deck.conflicts].map((t) => ({
            field: 'body',
            label: t.heading,
            text: t.body,
          })),
          { field: 'tags', label: 'Course', text: COURSES[course].name },
        ],
      });
      yield;
    }
    for (const c of block('dklaCanonsData') || []) {
      record({
        key: 'canon:' + c.id,
        label: 'Canon',
        course: 'lrs',
        title: c.name,
        sub: 'LRS · Canons of construction · ' + c.category,
        names: [c.name, ...c.aliases],
        open: 'canon',
        ref: c.id,
        parts: [
          { field: 'title', label: 'Title', text: c.name },
          { field: 'aliases', label: 'Also called', text: c.aliases.join('; ') },
          { field: 'summary', label: 'the definition', text: c.definition },
          { field: 'body', label: 'When to use it', text: c.use },
          { field: 'body', label: 'Limits and competing readings', text: c.limits },
          { field: 'notes', label: 'In the course', text: c.sources.map((s) => s.label).join('; ') },
          { field: 'tags', label: 'Topic', text: c.category },
        ],
      });
      yield;
    }
    // LRS classes have no entry of their own on the map (Contracts assignments and Civil Procedure weeks do).
    const classes = (typeof data !== 'undefined' && data.lrsCorpus?.classes) || [];
    for (const k of classes) {
      const before = classes.find((x) => x.number === k.number - 1),
        topic =
          /^cont[’']d$/i.test((k.topic || '').trim()) && before ? 'Continued: ' + before.topic : k.topic,
        assigned = (data.lrsCorpus.assignments || []).filter((a) => a.classNumber === k.number);
      record({
        key: 'session:lrs-' + k.number,
        label: 'Assignment',
        course: 'lrs',
        number: k.number,
        title: `Class ${k.number} · ${topic}`,
        sub: ['LRS', day(k.date) || k.syllabusDateLabel, String(k.readingVerbatim || '').split('\n')[0]]
          .filter(Boolean)
          .join(' · '),
        names: [topic, `LRS class ${k.number}`],
        open: 'lrs-class',
        ref: String(k.number),
        parts: [
          { field: 'title', label: 'Title', text: topic },
          { field: 'shortTitle', label: 'Title', text: `LRS Class ${k.number}` },
          {
            field: 'body',
            label: 'Reading',
            text: [k.readingVerbatim, ...assigned.map((a) => a.title)].filter(Boolean).join('\n'),
          },
        ],
      });
      yield;
    }
    extra = next;
  }

  /* ---------- the index: built once, in short slices, then kept up to date ---------- */
  // Until v3.2 every rebuildIndex() from a start-up script queued a whole build (half a second in one task, three
  // or four times over). Now a change only marks the index stale. The first build starts when the atlas is shown
  // and runs in slices of a few milliseconds that give way to typing, clicks and drawing; later changes replace
  // only the documents whose text changed. A search never sees an unfinished or stale index: it finishes the
  // remaining work first (ensure()).
  const FIELDS = OPTS.fields;
  const SLICE = 6; // milliseconds of indexing before giving the page a turn
  let ms = null, // the finished index searches read
    draft = null, // the first index while it is being filled
    docs = new Map(), // id → the document the index holds for it
    stale = true, // the content may have changed since the index was last brought up to date
    job = null, // the work in progress (a generator), or null
    queued = false,
    started = false;
  // documents counts the map's entries; extras the flowcharts, lectures, canons and LRS classes beside them.
  // builds counts whole builds (one per page, unless a check asks for another); updates counts the later passes
  // that changed some documents; longestSlice is the longest single stretch of indexing, in milliseconds.
  const stats = {
    ms: 0,
    documents: 0,
    extras: 0,
    builds: 0,
    updates: 0,
    changed: 0,
    slices: 0,
    longestSlice: 0,
    finishedInOneGo: 0,
    ready: false,
  };
  const sameDocument = (a, b) => FIELDS.every((f) => a[f] === b[f]);
  // What the index should hold now: one document per entry, then one per flowchart, lecture, canon and class.
  function* wanted(out) {
    for (const n of data.nodes.slice()) {
      out.set(n.id, searchDocument(n));
      yield;
    }
    try {
      yield* collectExtras();
    } catch (err) {
      console.warn('search extras', err);
      extra = new Map();
    }
    for (const x of extra.values()) out.set(x.key, documentFrom(x.key, x.parts));
  }
  // The work, as steps: each yield is a point where it may pause. Run to the end it leaves `ms` matching the
  // content. A change that arrives while it runs sets `stale` again and is picked up by another pass.
  function* work() {
    while (stale) {
      stale = false;
      const want = new Map();
      yield* wanted(want);
      yield;
      if (!ms) {
        // First build: documents go in, in the order the old one-task build used.
        const m = (draft = new MiniSearch(OPTS)),
          held = new Map();
        for (const [id, doc] of want) {
          m.add(doc);
          held.set(id, doc);
          yield;
        }
        draft = null;
        ms = m;
        docs = held;
        stats.builds++;
      } else {
        // Later: only what changed. The old version is taken out whole (remove() is given the document the
        // index holds, so no trace of it is left to skew the ranking) and the new one is added.
        let changed = 0;
        for (const [id, old] of [...docs])
          if (!want.has(id)) {
            ms.remove(old);
            docs.delete(id);
            changed++;
            yield;
          }
        for (const [id, doc] of want) {
          const old = docs.get(id);
          if (old && sameDocument(old, doc)) continue;
          if (old) ms.remove(old);
          ms.add(doc);
          docs.set(id, doc);
          changed++;
          yield;
        }
        if (changed) {
          stats.updates++;
          stats.changed += changed;
        }
      }
      partsCache.clear();
      stats.documents = data.nodes.length;
      stats.extras = extra.size;
    }
  }
  function failed(err) {
    console.warn('search index', err);
    // Start again from nothing at the next use; the plain scan answers meanwhile.
    job = draft = ms = null;
    docs = new Map();
    stats.ready = false;
  }
  // Run the work for one slice (or, with `whole`, to its end). True when nothing is left to do.
  function advance(whole) {
    const began = performance.now();
    try {
      if (!job) job = work();
      for (;;) {
        if (job.next().done) {
          job = null;
          if (!stale) break;
          job = work();
        }
        if (!whole && performance.now() - began >= SLICE) break;
      }
    } catch (err) {
      failed(err);
      stale = false; // do not spin on a failing build; the next change or search tries again
      return true;
    }
    const took = performance.now() - began;
    stats.ms += took;
    if (whole) stats.finishedInOneGo++;
    else {
      stats.slices++;
      if (took > stats.longestSlice) stats.longestSlice = Math.round(took * 10) / 10;
    }
    if (!job) {
      stats.ms = Math.round(stats.ms);
      stats.ready = !!ms;
    }
    return !job;
  }
  // The next slice is an ordinary task: typing, clicks and drawing come before it, and it never waits for the
  // page to fall idle (on a slow machine a busy page is never idle, and the index would not be ready when the
  // search box is first used).
  function later(fn) {
    if (window.scheduler?.postTask) scheduler.postTask(fn, { priority: 'user-visible' }).catch(() => {});
    else setTimeout(fn, 0);
  }
  function pump() {
    if (queued || !started || (!stale && !job)) return;
    queued = true;
    later(() => {
      queued = false;
      if (!stale && !job) return;
      if (!advance(false)) pump();
    });
  }
  // Bring the index up to date now (a search is about to read it).
  function ensure() {
    if (stale || job || !ms) {
      if (!ms && !job) stale = true;
      advance(true);
    }
    return ms;
  }
  function begin() {
    if (started) return;
    started = true;
    pump();
  }
  // Start-up scripts change the content until the atlas is shown, so the build waits for that moment
  // (html.dkla-boot-ready). A page that never gets there still builds, a few seconds after it has loaded.
  {
    const root = document.documentElement;
    if (root.classList.contains('dkla-boot-ready')) begin();
    else {
      const watch = new MutationObserver(() => {
        if (!root.classList.contains('dkla-boot-ready')) return;
        watch.disconnect();
        begin();
      });
      watch.observe(root, { attributes: true, attributeFilter: ['class'] });
      const fallback = () => setTimeout(begin, 8000);
      if (document.readyState === 'complete') fallback();
      else addEventListener('load', fallback, { once: true });
    }
  }
  $('search')?.addEventListener('focus', begin);
  $('search')?.addEventListener('pointerdown', begin);
  const priorRebuild = typeof rebuildIndex === 'function' ? rebuildIndex : null;
  if (priorRebuild)
    rebuildIndex = function (...a) {
      const r = priorRebuild.apply(this, a);
      stale = true;
      stats.ready = false;
      pump();
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
      const n = extra.has(id) ? null : nodesById.get(id);
      p = (extra.get(id)?.parts || (n ? parts(n) : [])).map((part) => ({ ...part, folded: fold(part.text) }));
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
  let shown = new Map(); // key -> {hit, q, why, reason}
  function fill(button) {
    const row = shown.get(button.dataset.searchKey);
    const slot = button.querySelector('.search-why');
    if (!row || !slot || slot.dataset.filled) return;
    slot.dataset.filled = '1';
    if (row.why === undefined) row.why = row.hit ? explain(row.hit, row.q) : null;
    const why = row.why;
    // A session's material says why it is listed ("Assigned for LRS class 22"), with the passage if there is one.
    if (row.reason) {
      slot.innerHTML =
        (why?.html ? `<span class="search-snippet">${why.html}</span>` : '') +
        `<span class="search-where">${E(row.reason)}</span>`;
      return;
    }
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
    const buttons = [...$('searchResults').querySelectorAll('button[data-search-key]')];
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

  /* ---------- a course plus a session number ---------- */
  // "LRS Class 22", "Contracts class 16", "civ pro 12", "class 22 lrs": the course, the number and the words left.
  // A number counts only right after the course (with or without "class", "week", ...) or right after one of
  // those words, and only if the course has that session: "civ pro rule 12" and "contracts 2-207" are not one.
  const COURSE_WORDS = [
    ['contracts', /(?:^|\s)(contracts?)(?=\s|$)/],
    ['civil', /(?:^|\s)(civ(?:il)?\.?\s*pro(?:cedure)?\.?|civpro|civil|cp)(?=\s|$)/],
    [
      'lrs',
      /(?:^|\s)(lrs|leg\.?\s*reg\.?|legreg|legislation(?:\s+and\s+(?:the\s+)?regulatory\s+state)?|regulatory\s+state)(?=\s|$)/,
    ],
  ];
  const UNIT = '(?:class(?:es)?|session|week|wk|assignment|asst|lecture|lec|reading|no\\.?|number)';
  const NUMBER = '#?\\s*(\\d{1,2})(?![\\w\\-.(\\u00a7])';
  function sessionExists(course, n) {
    if (course === 'contracts') return !!data.corpus?.assignmentTitles?.[n];
    if (course === 'civil') return (data.civilCorpus?.weeks || []).some((w) => w.number === n);
    return (data.lrsCorpus?.classes || []).some((k) => k.number === n);
  }
  function courseIntent(q) {
    const s = String(q)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    for (const [course, pattern] of COURSE_WORDS) {
      const c = pattern.exec(s);
      if (!c) continue;
      const cFrom = c.index + c[0].length - c[1].length,
        cTo = c.index + c[0].length;
      let n = null,
        from = 0,
        to = 0;
      const right = new RegExp('^\\s*(?:' + UNIT + '\\s*)?' + NUMBER).exec(s.slice(cTo));
      if (right) {
        n = +right[1];
        from = cTo;
        to = cTo + right[0].length;
      } else {
        const unit = new RegExp('(?:^|\\s)(' + UNIT + '\\s*' + NUMBER + ')').exec(s);
        if (unit) {
          n = +unit[2];
          from = unit.index + unit[0].length - unit[1].length;
          to = unit.index + unit[0].length;
          if (from < cTo && to > cFrom) n = null;
        }
      }
      if (n === null || !sessionExists(course, n)) continue;
      const cut = [
        [cFrom, cTo],
        [from, to],
      ].sort((a, b) => b[0] - a[0]);
      let rest = s;
      for (const [a, b] of cut) rest = rest.slice(0, a) + ' ' + rest.slice(b);
      rest = rest.replace(/\s+/g, ' ').trim();
      const info = COURSES[course];
      return { course, number: n, rest, label: `${info.short} ${info.unit.toLowerCase()} ${n}` };
    }
    return null;
  }
  // That session's material, in order: its lecture and the session itself, then what it assigns, what its
  // lecture discusses, and the flowcharts and canons its lecture uses. Only entries and records that exist.
  function sessionMaterial({ course, number: n }) {
    const out = [],
      seen = new Set(),
      info = COURSES[course],
      name = `${info.short} ${course === 'contracts' ? 'assignment' : info.unit.toLowerCase()} ${n}`;
    const add = (key, reason, tier) => {
      if (!key || seen.has(key) || !(extra.has(key) || nodesById.has(key))) return;
      seen.add(key);
      out.push({ key, reason, tier });
    };
    const lecture = extra.get(`lecture:${course}-${n}`);
    add(lecture?.key, `The slides for ${info.short} class ${n}`, 0);
    const pad = String(n).padStart(2, '0');
    if (course === 'contracts') {
      add('contracts-class-' + pad, `The reading assignment for ${name}`, 0);
      for (const id of data.corpus?.principalCases?.[n] || []) add(id, `Principal case for ${name}`, 1);
      for (const node of data.nodes)
        if ((node.courses || []).includes(info.name) && (node.tags || []).includes('class-' + pad))
          add(node.id, `Assigned for ${name}`, 1);
    } else if (course === 'civil') {
      add('cp-week-' + n, `The syllabus week for ${name}`, 0);
      const week = (data.civilCorpus?.weeks || []).find((w) => w.number === n);
      for (const id of week?.caseAccounts || []) add(id, `A case in ${name}`, 1);
    } else {
      add('session:lrs-' + n, `The syllabus class for ${name}`, 0);
      for (const a of data.lrsCorpus?.assignments || [])
        if (a.classNumber === n) for (const id of a.atlasRecordIds || []) add(id, `Assigned for ${name}`, 1);
    }
    if (lecture) {
      const deck = (block('dklaLecturesData') || []).find((d) => d.course === course && d.number === n);
      const topics = deck ? [...deck.topics, ...deck.conflicts] : [];
      for (const t of topics) for (const id of t.nodes || []) add(id, `Discussed in the ${name} lecture`, 1);
      for (const t of topics)
        for (const id of t.charts || []) add('flowchart:' + id, `Used in the ${name} lecture`, 1);
    }
    if (course === 'lrs') {
      const said = new RegExp('^Class ' + n + ' lecture\\b');
      for (const c of block('dklaCanonsData') || [])
        if (c.sources.some((s) => s.lecture === `lrs-${n}` || said.test(s.label || '')))
          add('canon:' + c.id, `Taught in the ${name} lecture`, 1);
    }
    if (course === 'civil') {
      const week = (data.civilCorpus?.weeks || []).find((w) => w.number === n);
      for (const id of week?.concepts || []) add(id, `A topic in ${name}`, 1);
    }
    return out;
  }

  /* ---------- result rows ---------- */
  const NODE_LABEL = { Case: 'Case', Concept: 'Concept', Rule: 'Rule', Hypothetical: 'Hypothetical' };
  // The Contracts reading assignments and Civil Procedure weeks are entries on the map; they are labelled as
  // assignments like the LRS classes.
  const nodeLabel = (n) =>
    n.kind === 'Note' && ((n.tags || []).includes('class-hub') || /^cp-week-\d+$/.test(n.id))
      ? 'Assignment'
      : NODE_LABEL[n.kind] || 'Note';
  function rowFor(key, hit, q, reason) {
    const x = extra.get(key);
    if (x)
      return {
        key,
        type: x.open,
        ref: x.ref,
        title: x.title,
        sub: x.sub,
        label: x.label,
        course: x.course,
        names: x.names,
        terms: hit?.terms || [],
        hit,
        q,
        reason,
      };
    const n = nodesById.get(key);
    if (!n) return null;
    let sub = '';
    try {
      sub = `${(n.courses || []).join(', ')} · ${geoDistrict(geoPlacement(n.id).district)?.title || roleLabel(n)}`;
    } catch {
      sub = (n.courses || []).join(', ');
    }
    let display = '';
    try {
      display = displayName(n);
    } catch {
      /* the title is enough */
    }
    return {
      key,
      type: 'node',
      id: n.id,
      title: n.title,
      sub,
      label: nodeLabel(n),
      courses: n.courses || [],
      names: [n.title, n.shortTitle, display],
      terms: hit?.terms || [],
      hit,
      q,
      reason,
    };
  }
  const inCourse = (row, course) =>
    row.course === course || (row.courses || []).includes(COURSES[course].name);
  function hitsFor(q) {
    let hits = ms.search(q, searchOptions(q)),
      some = false;
    if (!hits.length && tokenize(q).length > 1) {
      hits = ms.search(q, searchOptions(q, { combineWith: 'OR' }));
      some = hits.length > 0;
    }
    return { hits, some };
  }
  const hitsFor2 = (index, q) => {
    const strict = index.search(q, searchOptions(q));
    return strict.length || tokenize(q).length < 2
      ? strict
      : index.search(q, searchOptions(q, { combineWith: 'OR' }));
  };
  function rowHTML(r) {
    const opens = r.type === 'node' || r.type === 'region' || r.type === 'district',
      keyed = r.type !== 'region' && r.type !== 'district';
    return (
      `<button ${opens ? `data-search-type="${r.type}" data-search-id="${E(r.id)}"` : `data-search-open="${r.type}" data-search-ref="${E(r.ref)}"`}` +
      `${keyed ? ` data-search-key="${E(r.key)}"` : ''} data-result-type="${r.label}" data-terms="${E(r.terms.join(' '))}">` +
      `<strong>${mark(r.title, r.terms)}</strong><small><span class="search-type">${r.label}</span>${E(r.sub)}</small>` +
      `${keyed ? '<span class="search-why"></span>' : ''}</button>`
    );
  }
  const SHOW = 45;

  const prior = searchEntries;
  searchEntries = function () {
    const q = $('search').value.trim();
    if (typeof query !== 'undefined') query = q;
    if (!q) {
      closeSearch();
      return;
    }
    // The index is finished and brought up to date before it is read. Only if it cannot be built does the plain
    // scan answer.
    if (!ensure()) {
      prior();
      return;
    }
    const nq = norm(q),
      tokens = nq.split(' ').filter(Boolean),
      rows = [],
      seen = new Set(),
      push = (row) => {
        if (!row || seen.has(row.key)) return;
        seen.add(row.key);
        rows.push(row);
      };
    let heading = '',
      total = 0,
      some = false;
    const intent = courseIntent(q);
    if (intent) {
      // The named session's material first; nothing from another course comes before any of it.
      const material = sessionMaterial(intent),
        rest = intent.rest;
      const found = rest ? hitsFor(rest).hits : [],
        byKey = new Map(found.map((h) => [h.id, h]));
      for (const m of material) if (m.tier === 0) push(rowFor(m.key, byKey.get(m.key), rest, m.reason));
      const later = material.filter((m) => m.tier > 0 && (!rest || byKey.has(m.key)));
      if (rest) later.sort((a, b) => found.indexOf(byKey.get(a.key)) - found.indexOf(byKey.get(b.key)));
      for (const m of later) push(rowFor(m.key, byKey.get(m.key), rest, m.reason));
      if (rest) {
        const others = found.map((h) => rowFor(h.id, h, rest)).filter(Boolean);
        for (const r of others) if (inCourse(r, intent.course)) push(r);
        for (const r of others) push(r);
      }
      total = rows.length;
      heading = `${total} result${total === 1 ? '' : 's'} for ${E(intent.label)}${rest ? ' and “' + E(rest) + '”' : ''}`;
    } else {
      const places = [];
      for (const r of mapData().regions) {
        const t = norm(r.title + ' ' + shortRegionTitle(r));
        if (tokens.every((w) => t.includes(w)))
          places.push({
            key: 'region:' + r.id,
            type: 'region',
            id: r.id,
            title: shortRegionTitle(r),
            sub: 'Subject',
            label: 'Subject',
            names: [r.title, shortRegionTitle(r)],
            terms: tokens,
          });
      }
      for (const d of Object.values(mapData().districts)) {
        const t = norm(d.title + ' ' + d.question);
        if (tokens.every((w) => t.includes(w)))
          places.push({
            key: 'district:' + d.id,
            type: 'district',
            id: d.id,
            title: d.title,
            sub: shortRegionTitle(regionFor(d.region)),
            label: 'Topic',
            names: [d.title],
            terms: tokens,
          });
      }
      const result = hitsFor(q);
      some = result.some;
      total = places.length + result.hits.length;
      const found = [];
      for (const h of result.hits) {
        const r = rowFor(h.id, h, q);
        if (r) found.push(r);
      }
      // An exact title, name or alias comes first, then the subjects and topics, then the ranked matches.
      const exact = (r) => r.names.some((name) => name && norm(name) === nq);
      for (const r of [...places, ...found]) if (exact(r)) push(r);
      for (const r of places) push(r);
      for (const r of found) push(r);
      heading = `${total} result${total === 1 ? '' : 's'} ${some ? 'with some of your words' : 'across your atlas'}`;
    }
    const visible = rows.slice(
      0,
      SHOW + rows.filter((r) => r.type === 'region' || r.type === 'district').length,
    );
    shown = new Map(visible.filter((r) => r.hit || r.reason).map((r) => [r.key, r]));
    $('searchResults').innerHTML =
      `<div class="search-label">${heading}</div>` +
      visible.map(rowHTML).join('') +
      (!rows.length
        ? '<p class="search-empty">No matches. Try a case name, a rule number or a shorter phrase.</p>'
        : rows.length > visible.length
          ? `<p class="search-empty">Showing the closest ${SHOW} matches. Add a word to narrow them.</p>`
          : '');
    // v3.1 whole U.S. Code: an exact citation ("20 USC 1001") adds one "U.S. Code" result above the
    // list; any other query adds nothing. Whole-Code sections are in no index (src/features/v31/uscode.js).
    window.DKLAUSCode?.addCitationResult(q, $('searchResults'));
    fillVisible();
    S.searchOpen = true;
    $('searchResults').hidden = false;
    $('search').setAttribute('aria-expanded', 'true');
  };

  /* ---------- opening a flowchart, lecture, canon or LRS class ---------- */
  // Through the routes their own modules answer (#flowchart=, #lecture=, #canon=) and the LRS class view.
  function route(hash) {
    if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
    else location.hash = hash;
  }
  function openResult(kind, ref) {
    if (kind === 'flowchart') route('#flowchart=' + encodeURIComponent(ref));
    else if (kind === 'lecture') route('#lecture=' + ref);
    else if (kind === 'canon') route('#canon=' + ref);
    else if (kind === 'lrs-class') window.DKLA?.reading?.(+ref);
  }
  document.addEventListener(
    'click',
    (e) => {
      const b = e.target.closest('#searchResults button[data-search-open]');
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      closeSearch();
      if ($('modal')?.open && b.dataset.searchOpen !== 'lrs-class') closeModal();
      openResult(b.dataset.searchOpen, b.dataset.searchRef);
    },
    true,
  );

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

  /* ---------- phones: a Search button and a full-width panel ---------- */
  // At 850 px wide or less the top bar has no room for the box (at 390 px it was 0 px wide). A labelled Search
  // button takes its place and opens the same box as a panel over the whole window, with the keyboard in it;
  // × and Escape close it, and so does choosing a result. Focusing the box by any other means opens it too.
  // Wider windows never see the button or the panel (dklaR13Styles.css keeps both inside the same media query).
  const narrow = matchMedia('(max-width: 850px)'),
    box = document.querySelector('.study-header .study-search'),
    input = $('search'),
    root = document.documentElement;
  if (box && input) {
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.id = 'searchOpen';
    opener.className = 'search-open';
    opener.setAttribute('aria-expanded', 'false');
    opener.innerHTML = '<span aria-hidden="true">⌕</span>Search';
    box.before(opener);
    const closer = document.createElement('button');
    closer.type = 'button';
    closer.className = 'search-close';
    closer.setAttribute('aria-label', 'Close search');
    closer.textContent = '×';
    input.after(closer);
    const isOpen = () => root.classList.contains('dkla-search-panel');
    const openPanel = () => {
      if (!narrow.matches) return;
      if (!isOpen()) {
        root.classList.add('dkla-search-panel');
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        box.setAttribute('aria-label', 'Search the atlas');
        opener.setAttribute('aria-expanded', 'true');
      }
      if (document.activeElement !== input) input.focus({ preventScroll: true });
    };
    const closePanel = (restore) => {
      if (!isOpen()) return;
      root.classList.remove('dkla-search-panel');
      for (const name of ['role', 'aria-modal', 'aria-label']) box.removeAttribute(name);
      opener.setAttribute('aria-expanded', 'false');
      closeSearch();
      if (box.contains(document.activeElement)) document.activeElement.blur();
      if (restore) opener.focus({ preventScroll: true });
    };
    opener.addEventListener('click', openPanel);
    closer.addEventListener('click', () => closePanel(true));
    input.addEventListener('focus', openPanel);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) closePanel(true);
    });
    // Choosing a result: its own handler runs first (some stop the click), then the panel steps aside.
    window.addEventListener(
      'click',
      (e) => {
        if (isOpen() && e.target.closest('#searchResults button, #searchResults a'))
          setTimeout(() => closePanel(false), 0);
      },
      true,
    );
    narrow.addEventListener?.('change', () => {
      if (!narrow.matches) closePanel(false);
    });
  }

  /* ---------- rows whose data arrives after start-up ---------- */
  // The hosted page may fetch large data blocks after start-up (window.DKLAData,
  // src/features/performance/data-loader.js). Search itself never waits for one: its index holds the map's entries,
  // flowcharts, lectures, canons and classes, all in the page. The dictionary rows (dklaR12Glossary.js) join each
  // list from the dictionary block, so the box asks for that block as soon as it is focused, and when the block
  // arrives the open list is drawn again for the same words, with those rows in it. The source rows
  // (dklaR11Sources.js) come from the source index, which stays in the page, and never from the source texts.
  const LATE = ['dklaGlossary'];
  function fetchLate() {
    const api = window.DKLAData;
    if (api) for (const id of LATE) if (api.isLazy(id)) (api.request || api.text)(id).catch(() => {});
  }
  // The modules that add rows to a list (dictionary, sources, briefs, timelines, authorities) each skip a list they
  // have already seen for the box's words. Forgetting those marks lets them add their rows to the redrawn list.
  function refreshSearch() {
    const box = $('search'),
      list = $('searchResults');
    if (!box || !list || list.hidden || !box.value.trim()) return false;
    // Someone moving through the results with the keyboard keeps their place: the rows join at the next keystroke.
    if (list.contains(document.activeElement)) return false;
    for (const key of Object.keys(list.dataset))
      if (list.dataset[key] === box.value) delete list.dataset[key];
    searchEntries();
    return true;
  }
  $('search')?.addEventListener('focus', fetchLate);
  $('search')?.addEventListener('input', fetchLate);
  // Another module may parse the block a moment after it arrives, so the redraw waits a little.
  document.addEventListener('dkla:data', (e) => {
    if (LATE.includes(e.detail?.id)) setTimeout(refreshSearch, 80);
  });

  window.DKLA = Object.assign(window.DKLA || {}, {
    // Draw the open results again for the same words (for a module whose rows have just become available).
    refreshSearch,
    searchIndex: () => ensure(),
    // The course, number and remaining words a query names, or null ("LRS Class 22").
    searchCourseIntent: (q) => courseIntent(q),
    searchIndexStats: stats,
    searchDocument,
    // Where each indexed part of an entry is shown: {field, label, place}.
    searchParts: (id) => readable(id).map(({ field, label, place }) => ({ field, label, place })),
    searchExplain: (id, q) => {
      const index = ensure();
      const hit =
        index?.search(q, searchOptions(q)).find((h) => h.id === id) ||
        index?.search(q, searchOptions(q, { combineWith: 'OR' })).find((h) => h.id === id);
      return hit ? explain(hit, q) : null;
    },
    // For the checks. The ranked ids and scores of a query from the index in use, and from an index built the
    // old way (every document added in one go) from the same content.
    searchHits: (q) =>
      hitsFor2(ensure(), q).map((h) => ({ id: h.id, score: h.score, terms: h.terms, match: h.match })),
    searchReference: () => {
      const m = new MiniSearch(OPTS);
      const want = new Map();
      for (const step of wanted(want)) void step;
      m.addAll([...want.values()]);
      return (q) => hitsFor2(m, q).map((h) => ({ id: h.id, score: h.score, terms: h.terms, match: h.match }));
    },
    // Throw the index away and build it again in one go; returns the milliseconds it took.
    rebuildSearchIndex: () => {
      const began = performance.now();
      job = draft = ms = null;
      docs = new Map();
      stale = true;
      started = true;
      advance(true);
      return Math.round(performance.now() - began);
    },
  });
})();
