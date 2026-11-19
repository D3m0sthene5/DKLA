/* The Doctrine view of a case, composition B: a plate and an account (a comparison prototype).
 *
 * On when localStorage 'dkla.v32.doctrine' is 'b' or the address carries doctrine=b. With it on, a case's
 * Doctrine tab takes the whole width of the reader (the map strip and the margin give way; the case's
 * header becomes one line in the top strip) and opens with the doctrinal history itself:
 *
 *   - the plate: one drawing of the timeline, time left to right on a true scale. A long empty stretch
 *     is a marked break. A rule that a later entry overrules or replaces by name is drawn as a span from
 *     the entry that set it to the entry that ended it; an entry between the two whose stored account
 *     names that rule is drawn on the span (a widening above it, anything else hanging below). Every
 *     other entry stands on the line. Each carries its date, its name and, in words, its kind of move;
 *   - the account: the selected entry (the open case at first) with its date, name, what it changed
 *     and the stored note, and beside it its neighbours on the line and the entry it overrules, is
 *     ended by or is drawn under. A click on the plate, or Left and Right, changes it in place;
 *   - the list: every entry in order, in full (note, context, later development, sources).
 *
 * Every word of substance is stored text: tools/r19/data/timelines.json through window.DKLATimelines
 * (title, question, guide, now, and per entry effect, note, context, fate, object) and the words
 * src/features/r19/timelines.js already uses for the twelve kinds of move. Nothing here states law.
 *
 * Nothing runs at rest: the plate is laid out when it is drawn and when the reader's width changes.
 */
(() => {
  'use strict';
  window.DKLADoctrineB?.destroy?.();
  const inspector = document.getElementById('inspector');
  const P = window.DKLATimelines?.parts;
  if (!inspector || !P) return;

  /* ---------- the switch ---------- */
  let inAddress = false;
  function flagged() {
    if (/(?:^|[#&?])doctrine=b(?:&|$)/.test(location.hash)) inAddress = true;
    if (inAddress) return true;
    try {
      return localStorage.getItem('dkla.v32.doctrine') === 'b';
    } catch {
      return false;
    }
  }

  /* ---------- small tools ---------- */
  const esc = (text) =>
    String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reEsc = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dated = (s) => /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.date || '');
  // Where an entry falls in time, in years: its date where the record gives one, or the middle of its year.
  function when(s) {
    const d = dated(s);
    if (d) {
      const year = Number(d[1]);
      return year + (Date.UTC(year, Number(d[2]) - 1, Number(d[3])) - Date.UTC(year, 0, 1)) / 864e5 / 366;
    }
    return Number.isFinite(s.year) ? s.year + 0.5 : null;
  }
  const yearOf = (s) => (dated(s) ? dated(s)[1] : Number.isFinite(s.year) ? String(s.year) : 'Undated');
  const dayOf = (s) => (dated(s) ? `${MONTH[Number(dated(s)[2]) - 1]} ${Number(dated(s)[3])}` : '');
  const timeHTML = (s, cls) =>
    dated(s)
      ? `<time class="${cls}" datetime="${esc(s.date)}">${yearOf(s)}</time>`
      : `<span class="${cls}">${esc(yearOf(s))}</span>`;

  /* ---------- the twelve moves: four classes, a shape each ---------- */
  // What a move does to the rule decides its class, and its class its weight on the plate. The words
  // beside each shape are timelines.js's own (TURN), or the timeline's words for wider and narrower.
  const CLASS = {
    origin: 'rule',
    codifies: 'rule',
    displaces: 'rule',
    overrules: 'rule',
    widens: 'reach',
    limits: 'reach',
    extends: 'reach',
    sharpens: 'steady',
    applies: 'steady',
    reaffirms: 'steady',
    counterpoint: 'aside',
    divided: 'aside',
  };
  const CLASS_WORDS = {
    rule: 'Sets, restates or ends the rule',
    reach: 'Moves its reach',
    steady: 'Applies or clarifies it',
    aside: 'Stands beside it',
  };
  const GLYPH = {
    origin: '<path d="M8 1.2 14.8 8 8 14.8 1.2 8Z" fill="currentColor"/>',
    codifies: '<rect x="2.5" y="2.5" width="11" height="11" rx="1.5" fill="currentColor"/>',
    displaces:
      '<rect x="2.75" y="2.75" width="10.5" height="10.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M13.25 2.75v10.5H2.75Z" fill="currentColor"/>',
    overrules:
      '<circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M5.3 5.3l5.4 5.4M10.7 5.3l-5.4 5.4" fill="none" stroke="var(--v32db-cut, #15212b)" stroke-width="1.8" stroke-linecap="round"/>',
    widens: '<path d="M8 2 14.5 13.5h-13Z" fill="currentColor"/>',
    limits: '<path d="M8 14 1.5 2.5h13Z" fill="currentColor"/>',
    extends: '<path d="M14 8 2.5 14.5v-13Z" fill="currentColor"/>',
    sharpens:
      '<circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2" fill="currentColor"/>',
    applies: '<circle cx="8" cy="8" r="4" fill="currentColor"/>',
    reaffirms: '<circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    counterpoint:
      '<circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.4 2.1"/>',
    divided:
      '<circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 2.75a5.25 5.25 0 0 1 0 10.5Z" fill="currentColor"/>',
  };
  const glyph = (turn, size = 16) =>
    `<svg class="v32db-glyph" viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true">${GLYPH[turn] || GLYPH.applies}</svg>`;

  /* ---------- pictures ---------- */
  let ICONS = null;
  function icons() {
    if (!ICONS) {
      try {
        ICONS = JSON.parse(document.getElementById('dklaIcons')?.textContent || '{}');
      } catch {
        ICONS = {};
      }
    }
    return ICONS;
  }
  // A case's own drawing (only a drawing made for that case; a symbol that says "a provision" is not shown).
  function art(id, cls = '') {
    const meta = id && icons().records?.[id];
    const path = meta?.status === 'unique' && icons().paths?.[meta.motif];
    if (!path) return '';
    const mod = meta.modifier && icons().modifiers?.[meta.modifier];
    const badge = mod
      ? `<g transform="translate(14.5 14.5) scale(.42)"><circle cx="12" cy="12" r="13" fill="var(--badge-bg,#1a242d)" stroke="none"/>${mod}</g>`
      : '';
    return `<span class="v32db-art ${cls}" title="${esc(meta.label)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}${badge}</svg></span>`;
  }
  const artCaption = (id) => {
    const meta = id && icons().records?.[id];
    return meta?.status === 'unique' ? meta.label || '' : '';
  };
  // Drawings were made at different sizes inside the same square: each is fitted to its box.
  function fitArt(root) {
    for (const svg of root.querySelectorAll('.v32db-art > svg:not([data-fit])')) {
      let box;
      try {
        box = svg.getBBox();
      } catch {
        continue;
      }
      if (!box.width || !box.height) continue;
      const side = Math.max(box.width, box.height) + 2;
      svg.setAttribute(
        'viewBox',
        [box.x + box.width / 2 - side / 2, box.y + box.height / 2 - side / 2, side, side]
          .map((n) => Math.round(n * 100) / 100)
          .join(' '),
      );
      svg.dataset.fit = '1';
    }
  }

  /* ---------- names ---------- */
  // "A v. B; C v. D" is two cases; each is its parties.
  function casesOf(full) {
    const split = full.split('; ');
    const list = split.length > 1 && split.every((one) => / v\. /.test(one)) ? split : [full];
    return list.map((one) => {
      const at = one.indexOf(' v. ');
      return at < 0 ? [one] : [one.slice(0, at), one.slice(at + 4)];
    });
  }
  // A caption breaks between parties and nowhere else it need not; "v." keeps the word after it.
  const captionHTML = (pair) =>
    pair
      .map((party, i) => {
        if (!i) return `<span class="v32db-party">${esc(party)}</span>`;
        const words = party.split(' ');
        return `<span class="v32db-party"><span class="v32db-nb">v. ${esc(words.shift())}</span>${words.length ? ' ' + esc(words.join(' ')) : ''}</span>`;
      })
      .join(' ');
  const plain = (pair) => pair.join(' v. ');
  const words = (text) => text.split(/\s+/).filter(Boolean);
  const bare = (word) => word.replace(/[,;:]$/, '');
  // The words an object ("Chevron", "Pennoyer's territorial test") opens with, if they open a party's name.
  function namedBy(item, object) {
    const said = words(object);
    let best = '';
    for (const party of item.cases.flat()) {
      const own = words(party);
      let k = 0;
      while (
        k < own.length &&
        k < said.length &&
        (bare(said[k]) === bare(own[k]) || bare(said[k]).replace(/['’]s$/, '') === bare(own[k]))
      )
        k++;
      const run = own.slice(0, k).map(bare).join(' ');
      if (k && /^[A-Z]/.test(run) && run.length > 3 && run.length > best.length) best = run;
    }
    return best;
  }
  // A short name another entry's stored words give an entry: "Overruled by Loper Bright (2024)".
  function shortFrom(text, item) {
    const year = yearOf(item.s);
    const found = [...String(text || '').matchAll(/((?:[A-Z][\w.'’&-]*)(?: [A-Z&][\w.'’&-]*)*) \((\d{4})\)/g)];
    for (const [, run, y] of found) {
      if (y !== year) continue;
      const list = words(run);
      for (let from = 0; from < list.length; from++) {
        const tail = list.slice(from).join(' ');
        if (tail.length < 4) break;
        if (item.cases.flat().some((party) => new RegExp('(^|\\s)' + reEsc(tail) + '(\\s|[,.]|$)').test(party)))
          return tail;
      }
    }
    return '';
  }

  // Everything the timeline says in prose, apart from one entry's own account.
  const prose = (t, items, except, more) =>
    [t.guide, t.now, more, ...items.filter((o) => o !== except).flatMap((o) => [o.s.note, o.s.fate, o.s.context, o.s.object])]
      .filter(Boolean)
      .join(' \n ');
  // Words that open a party's name and are not a name a case goes by.
  const COMMON = /^(United States|United|State|States|People|Commonwealth|City|County|Town|Board|Department|National|American|International|In re|Ex parte|The)$/;
  function calledBy(item, text) {
    let best = '';
    for (const party of item.first) {
      const own = words(party);
      for (let k = Math.min(3, own.length - 1); k >= 1; k--) {
        const run = own.slice(0, k).map(bare).join(' ');
        if (run.length < 4 || !/^[A-Z]/.test(run) || COMMON.test(run)) continue;
        if (new RegExp('(^|[^\\w])' + reEsc(run) + '([^\\w]|$)').test(text)) {
          if (!best) best = run;
          break;
        }
      }
    }
    return best;
  }

  /* ---------- the model of one timeline ---------- */
  function opener(s) {
    if (s.event) return s.link ? `data-study-node="${esc(s.link)}"` : '';
    if (s.sup) return `data-r19-open="${esc(s.sup)}"`;
    return `data-study-node="${esc(s.id)}"`;
  }
  // The line the open case's subject is introduced with (the reader shows it under the history).
  function subjectLine(id) {
    try {
      return geoDistrict(geoPlacement(id).district)?.question || '';
    } catch {
      return '';
    }
  }
  function build(t, current) {
    const subject = subjectLine(current);
    const items = t.steps.filter(P.live).map((s, i) => {
      const full = P.name(s);
      const cases = casesOf(full);
      return {
        i,
        s,
        full,
        cases,
        first: cases[0],
        t: when(s),
        turn: s.turn,
        cls: CLASS[s.turn] || 'steady',
        fam: P.family(s),
        here: !!s.id && s.id === current,
        // The move in the fewest stored words: "Overrules Chevron", "Less deference", "Starting point".
        kind: P.label({ ...s, effect: '' }, t) || P.TURN[s.turn] || '',
        short: '',
        artId: s.id || s.link || null,
        span: null,
        hung: null,
        ends: null,
      };
    });
    // A rule's span: an entry that overrules or replaces, by name, an earlier entry of this timeline.
    const spans = [];
    for (const b of items) {
      if (!['overrules', 'displaces'].includes(b.turn) || !b.s.object) continue;
      let found = null;
      for (let k = b.i - 1; k >= 0; k--) {
        const short = namedBy(items[k], b.s.object);
        if (short && (!found || short.length > found.short.length)) found = { a: items[k], short };
      }
      if (!found || found.a.span) continue;
      const span = { a: found.a, b, short: found.short, hung: [] };
      found.a.span = span;
      found.a.short = found.short;
      b.ends = span;
      spans.push(span);
    }
    // On a span: an entry between its ends whose stored account names the rule.
    for (const span of spans) {
      const named = new RegExp('(^|[^\\w])' + reEsc(span.short) + '([^\\w]|$)');
      for (const item of items) {
        if (item.i <= span.a.i || item.i >= span.b.i || item.hung || item.span) continue;
        if (named.test([item.s.effect, item.s.note, item.s.fate, item.s.context].join(' '))) {
          item.hung = span;
          span.hung.push(item);
        }
      }
    }
    for (const item of items) {
      if (item.short) continue;
      for (const other of items) {
        if (other === item || !other.s.fate) continue;
        const short = shortFrom(other.s.fate, item);
        if (short && short.length < plain(item.first).length) {
          item.short = short;
          break;
        }
      }
      // A long caption takes the name the timeline's own prose calls the case by ("Brand X").
      if (!item.short && plain(item.first).length > 34) item.short = calledBy(item, prose(t, items, item, subject));
    }
    return { t, items, spans, here: items.findIndex((item) => item.here) };
  }

  /* ---------- the plate ---------- */
  const PAD = 8, // above and below the drawing
    X0 = 20, // the first entry's place from the plate's left edge
    DECK = 50, // a span's height
    STEM = 12, // from the line (or a span's edge) to the nearest label
    TIER = 6, // between two labels of a stack
    MINGAP = 16, // the least distance between two marks
    BREAK = 136; // the width of a marked break

  // The label of an entry: its year and kind of move, then its name. Applications and comparisons are one
  // line; an entry on a span carries its shape (it has no mark on the line).
  function tagHTML(item) {
    const small = (item.cls === 'steady' || item.cls === 'aside') && !item.here;
    const big = item.cls === 'rule' || item.here;
    const here = item.here ? '<span class="v32db-here">You are here</span>' : '';
    const year = timeHTML(item.s, 'v32db-yr');
    const mark = item.hung ? glyph(item.turn, 12) : '';
    const title = `${item.full} (${yearOf(item.s)}). ${item.kind}. ${item.s.effect || ''}`;
    // A turn of the rule is named as a caption, a party to a line; every other name is one line, and
    // gives way party by party where it is too long (layout()).
    const name = item.short
      ? `<span class="v32db-tag-name">${esc(item.short)}</span>`
      : big && item.first.length === 2 && plain(item.first).length > 30
        ? `<span class="v32db-tag-name v32db-tag-caption"><span class="v32db-line">${esc(item.first[0])}</span><span class="v32db-line">v. ${esc(item.first[1])}</span></span>`
        : `<span class="v32db-tag-name" data-a="${esc(item.first[0])}"${item.first[1] ? ` data-b="${esc(item.first[1])}"` : ''}>${esc(plain(item.first))}</span>`;
    const picture = item.here ? art(item.artId, 'v32db-art-tag') : '';
    return `<button type="button" class="v32db-tag v32db-c-${item.cls} v32db-f-${item.fam}${big ? ' v32db-big' : ''}${small ? ' v32db-small' : ''}${item.here ? ' v32db-is-here' : ''}${item.hung ? ' v32db-hung' : ''}" data-v32db-i="${item.i}" title="${esc(title)}">${picture}<span class="v32db-tag-words"><span class="v32db-tag-top">${mark}${year}${name}${small ? here : ''}</span>${small ? '' : `<span class="v32db-tag-kind">${esc(item.kind)}${here}</span>`}</span></button>`;
  }
  // A name too long for its label gives way party by party: the longer one first, never the "v.".
  function fitName(el) {
    if (!el.dataset.a) return;
    el.textContent = el.dataset.b ? `${el.dataset.a} v. ${el.dataset.b}` : el.dataset.a;
    if (!el.dataset.b || el.scrollWidth <= el.clientWidth + 1) return;
    let a = el.dataset.a,
      b = el.dataset.b;
    // By whole words while there are words to give; then by letters.
    const trim = (text) =>
      (/\s/.test(text.trim()) ? text.replace(/\s+\S*$/, '') : text.slice(0, -1)).replace(/[\s,.&(-]+$/, '');
    for (let n = 0; n < 80 && el.scrollWidth > el.clientWidth + 1; n++) {
      if (a.length >= b.length && a.length > 6) a = trim(a);
      else if (b.length > 6) b = trim(b);
      else break;
      el.textContent = `${a}${a === el.dataset.a ? '' : '…'} v. ${b}${b === el.dataset.b ? '' : '…'}`;
    }
  }
  // A span: the rule's name as the lettering of a beam, the years it ran, and what the entry that set it did.
  function deckHTML(span) {
    const a = span.a,
      b = span.b;
    const title = `${a.full} (${yearOf(a.s)}). ${a.s.effect || ''}`;
    return `<button type="button" class="v32db-deck v32db-f-${a.fam}${a.here ? ' v32db-is-here' : ''}" data-v32db-i="${a.i}" title="${esc(title)}">${art(a.artId)}<span class="v32db-deck-words"><span class="v32db-deck-top"><span class="v32db-deck-name">${esc(span.short)}</span><span class="v32db-yr">${esc(yearOf(a.s))}–${esc(yearOf(b.s))}</span>${a.here ? '<span class="v32db-here">You are here</span>' : ''}</span><span class="v32db-deck-fx">${glyph(a.turn, 12)}${esc(a.s.effect || a.kind)}</span></span>${a.s.fate ? `<span class="v32db-deck-end">${esc(a.s.fate)}</span>` : ''}</button>`;
  }

  // Each entry's place along the line. Time is true to scale inside a stretch; a gap longer than three
  // tenths of the whole (and fifteen years) is a break of fixed width; two marks never touch.
  function placeX(model, x0, x1, deckNeed) {
    const items = model.items,
      n = items.length;
    const ts = items.map((item) => item.t);
    // An undated entry sits between its neighbours.
    for (let i = 0; i < n; i++) {
      if (ts[i] !== null) continue;
      let j = i;
      while (j < n && ts[j] === null) j++;
      const lo = i ? ts[i - 1] : j < n ? ts[j] : 0,
        hi = j < n ? ts[j] : lo;
      for (let k = i; k < j; k++) ts[k] = lo + ((hi - lo) * (k - i + 1)) / (j - i + 1);
    }
    for (let i = 1; i < n; i++) ts[i] = Math.max(ts[i], ts[i - 1]);
    const whole = n ? ts[n - 1] - ts[0] : 0;
    const isBreak = (i) => n >= 4 && ts[i] - ts[i - 1] > 0.3 * whole && ts[i] - ts[i - 1] >= 15;
    const widthOf = (i) =>
      model.spans.some((span) => span.a.i <= i - 1 && span.b.i >= i)
        ? Math.max(BREAK, Math.min(deckNeed + 48, (x1 - x0) * 0.36))
        : BREAK;
    let room = x1 - x0;
    let xs = [];
    for (let pass = 0; pass < 4; pass++) {
      let broken = 0,
        years = 0;
      for (let i = 1; i < n; i++) {
        if (isBreak(i)) broken += widthOf(i);
        else years += ts[i] - ts[i - 1];
      }
      const perYear = years > 0 ? Math.max(0, room - broken) / years : 0;
      xs = [x0];
      for (let i = 1; i < n; i++) {
        const step = isBreak(i) ? widthOf(i) : whole > 0 ? (ts[i] - ts[i - 1]) * perYear : room / (n - 1);
        xs.push(xs[i - 1] + Math.max(MINGAP, step));
      }
      const over = xs[n - 1] - x1;
      if (over <= 0.5) break;
      room -= over;
    }
    const breaks = [];
    for (let i = 1; i < n; i++)
      if (isBreak(i))
        breaks.push({ from: xs[i - 1], to: xs[i], years: Math.round(ts[i] - ts[i - 1]), i });
    // Decade marks inside each true stretch.
    const ticks = [];
    for (let i = 1; i < n; i++) {
      if (isBreak(i) || ts[i] - ts[i - 1] <= 0) continue;
      const perYear = (xs[i] - xs[i - 1]) / (ts[i] - ts[i - 1]);
      const every = perYear * 10 >= 20 ? 10 : perYear * 50 >= 20 ? 50 : 100;
      for (let y = Math.ceil(ts[i - 1] / every) * every; y < ts[i]; y += every) {
        const x = xs[i - 1] + (y - ts[i - 1]) * perYear;
        if (x - xs[i - 1] > 7 && xs[i] - x > 7) ticks.push({ x, year: y });
      }
    }
    return { xs, breaks, ticks };
  }

  const hits = (a, b, gap = 0) =>
    a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

  function layout(root, model) {
    const plate = root.querySelector('.v32db-plate');
    if (!plate) return;
    const W = plate.clientWidth;
    if (!W) return;
    const items = model.items;
    const tagOf = new Map([...plate.querySelectorAll('.v32db-tag')].map((el) => [Number(el.dataset.v32dbI), el]));
    const deckOf = new Map([...plate.querySelectorAll('.v32db-deck')].map((el) => [Number(el.dataset.v32dbI), el]));
    for (const el of [...tagOf.values(), ...deckOf.values()]) el.style.cssText = '';
    // A long timeline keeps each label to one line (its shape on the line says its kind of move).
    plate.classList.toggle('v32db-dense', items.length > 12);
    for (const el of plate.querySelectorAll('.v32db-tag-name[data-a]')) fitName(el);
    const size = new Map();
    for (const [i, el] of tagOf) size.set(i, { w: Math.ceil(el.getBoundingClientRect().width), h: el.offsetHeight });
    let deckNeed = 0;
    for (const el of deckOf.values()) {
      const end = el.querySelector('.v32db-deck-end');
      if (end) end.hidden = true;
      el.v32dbNeed = Math.ceil(el.getBoundingClientRect().width);
      deckNeed = Math.max(deckNeed, el.v32dbNeed);
      if (end) {
        end.hidden = false;
        el.v32dbEnd = Math.ceil(end.getBoundingClientRect().width);
      }
    }

    // The line ends where the last labels still fit to the right of their marks.
    let x1 = W - 24;
    let geo = placeX(model, X0, x1, deckNeed);
    for (let pass = 0; pass < 4; pass++) {
      const last = items[items.length - 1];
      const sz = size.get(last.i);
      const over = sz ? geo.xs[last.i] + sz.w + 4 - W : 0;
      if (over <= 0.5) break;
      x1 = Math.max(X0 + (items.length - 1) * MINGAP, x1 - over);
      geo = placeX(model, X0, x1, deckNeed);
    }
    const xs = geo.xs.map((x) => Math.round(x));

    // Spans, in lanes from the top; on each, the entries drawn on it: a widening stands above the beam,
    // anything else hangs below, each stack stepping away from the beam toward the earlier entry.
    const lanes = [];
    const spans = model.spans.map((span) => ({ span, x: xs[span.a.i], w: Math.max(40, xs[span.b.i] - xs[span.a.i]) }));
    const rects = []; // everything placed so far that a label must not touch
    const piers = [];
    const placed = new Map(); // entry -> its label's box and where its stem starts
    function stack(list, x0lim, x1lim) {
      // Right to left: a label sits at its mark; one whose reach covers later marks steps past their labels.
      let height = 0;
      const done = [];
      for (const item of [...list].sort((p, q) => q.i - p.i)) {
        const sz = size.get(item.i);
        const x = Math.min(xs[item.i], x1lim - sz.w);
        let level = 0;
        for (const other of done)
          if (other.x0 < x + sz.w + 8 && other.level + other.h + TIER > level) level = other.level + other.h + TIER;
        done.push({ item, x: Math.max(x0lim, x), x0: xs[item.i], w: sz.w, h: sz.h, level });
        height = Math.max(height, level + sz.h);
      }
      return { done, height };
    }
    let top = PAD;
    for (const one of spans) {
      const up = stack(
          one.span.hung.filter((item) => item.fam === 'wide'),
          one.x,
          W - 4,
        ),
        down = stack(
          one.span.hung.filter((item) => item.fam !== 'wide'),
          one.x,
          W - 4,
        );
      const upRoom = up.height ? up.height + STEM : 0;
      one.y = top + upRoom;
      one.h = DECK;
      for (const d of up.done) {
        const box = { x: d.x, y: one.y - STEM - d.level - d.h, w: d.w, h: d.h };
        placed.set(d.item.i, { box, from: one.y, side: 'up', stemX: d.x0 });
        rects.push(box);
      }
      for (const d of down.done) {
        const box = { x: d.x, y: one.y + one.h + STEM + d.level, w: d.w, h: d.h };
        placed.set(d.item.i, { box, from: one.y + one.h, side: 'down', stemX: d.x0 });
        rects.push(box);
      }
      rects.push({ x: one.x, y: one.y - upRoom, w: one.w, h: upRoom + one.h, ends: one.span.b.i });
      piers.push(one);
      one.bottom = one.y + one.h + (down.height ? down.height + STEM : 0);
      top = one.bottom + 12;
      lanes.push(one);
    }
    const lanesBottom = lanes.length ? Math.max(...lanes.map((one) => one.bottom)) : 0;
    // A span's piers run down to the line: no label crosses one.
    for (const one of piers) {
      rects.push({ x: one.x - 1, y: one.y, w: 2, h: 10000 });
      rects.push({ x: one.x + one.w - 2, y: one.y, w: 4, h: 10000, ends: one.span.b.i, pier: true });
    }

    // Entries on the line. A label starts at its entry's stem and runs right, or ends at it and runs
    // left; it sits as near the line as it can without covering another entry's stem or label. The
    // entries at the edges of a cluster are placed first, so a cluster opens like a fan: the outer
    // labels nearest the line, the inner ones stepping away from it. A widening and a turn of the rule
    // would sooner stand above the line, a narrowing below it.
    const free = items.filter((item) => !item.span && !item.hung);
    function onLine(spineY) {
      const sides = { up: [], down: [] };
      const out = new Map();
      let upMost = 0,
        downMost = 0,
        missed = 0;
      const left = new Set(free);
      const boxOn = (side, x, sz, level) => ({
        x,
        y: side === 'up' ? spineY - STEM - level - sz.h : spineY + STEM + level,
        w: sz.w,
        h: sz.h,
      });
      const clear = (box, item) =>
        box.y >= PAD - 0.5 &&
        !rects.some((r) => r.y < spineY && hits(box, r, r.ends === item.i ? (r.pier ? -100 : -2) : 6));
      // The entry that ends a span is labelled first, past the span's end and above the line if it can be.
      for (const item of free) {
        if (!item.ends) continue;
        const sz = size.get(item.i);
        const x = xs[item.i];
        if (x + sz.w > W) continue;
        const up = boxOn('up', x, sz, 0);
        const side = clear(up, item) ? 'up' : 'down';
        left.delete(item);
        sides[side].push({ left: x, w: sz.w, level: 0, h: sz.h, x });
        out.set(item.i, { box: boxOn(side, x, sz, 0), from: spineY, side, stemX: x, flip: false });
        if (side === 'up') upMost = Math.max(upMost, sz.h);
        else downMost = Math.max(downMost, sz.h);
      }
      while (left.size) {
        let pick = null;
        // strict: not over the stem of an entry that has no label yet. loose: its own stem may run
        // through a label (the last resort; nothing is left without a place).
        const consider = (strict, loose) => {
          for (const item of left) {
            const sz = size.get(item.i);
            const x = xs[item.i];
            const prefers =
              item.fam === 'narrow' ? 'down' : item.cls === 'rule' || item.fam === 'wide' ? 'up' : '';
            for (const flip of [false, true]) {
              const from = flip ? x - sz.w : x;
              if (from < 0 || (from + sz.w > W && !loose)) continue;
              // The entry that ends a span is labelled past the span's end, not under its beam.
              if (flip && item.ends && !loose) continue;
              if (strict && [...left].some((o) => o !== item && xs[o.i] > from - 6 && xs[o.i] < from + sz.w + 6))
                continue;
              for (const side of ['up', 'down']) {
                let level = 0;
                for (const o of sides[side]) {
                  const over = o.left < from + sz.w + 8 && from < o.left + o.w + 8;
                  const stem = o.x > from - 6 && o.x < from + sz.w + 6;
                  if ((over || stem) && o.level + o.h + TIER > level) level = o.level + o.h + TIER;
                }
                if (
                  !loose &&
                  sides[side].some(
                    (o) => o.x !== x && x > o.left - 6 && x < o.left + o.w + 6 && level + sz.h + TIER > o.level,
                  )
                )
                  continue;
                const box = boxOn(side, from, sz, level);
                if (side === 'up' && !clear(box, item)) continue;
                const miss = prefers && side !== prefers ? 1 : 0;
                const cost = level + miss * 34 + (flip ? 3 : 0) + (side === 'up' ? 1 : 0);
                // The cheapest place first; between equals, the later entry.
                if (!pick || cost < pick.cost - 0.01 || (Math.abs(cost - pick.cost) <= 0.01 && item.i > pick.item.i))
                  pick = { item, side, flip, from, level, box, sz, cost, x, miss };
              }
            }
          }
        };
        consider(true, false);
        if (!pick) consider(false, false);
        if (!pick) consider(false, true);
        if (!pick) break;
        missed += pick.miss;
        left.delete(pick.item);
        sides[pick.side].push({ left: pick.from, w: pick.sz.w, level: pick.level, h: pick.sz.h, x: pick.x });
        out.set(pick.item.i, { box: pick.box, from: spineY, side: pick.side, stemX: pick.x, flip: pick.flip });
        if (pick.side === 'up') upMost = Math.max(upMost, pick.level + pick.sz.h);
        else downMost = Math.max(downMost, pick.level + pick.sz.h);
      }
      return { out, upMost, downMost, missed };
    }
    // Where the line sits: under the spans, and as far under them as makes the whole plate shortest
    // (room above the line lets labels stand there that would otherwise stack below it).
    const least = lanes.length ? lanesBottom + 20 : PAD + 12;
    let spineY = least,
      line = null,
      best = Infinity;
    for (let y = least; y <= least + 240; y += 12) {
      const tried = onLine(y);
      if (tried.upMost && y < PAD + tried.upMost + STEM) continue;
      // The shortest plate, give or take a row for each label kept off the side its move prefers.
      const total = y + (tried.downMost ? STEM + tried.downMost : 16) + tried.missed * 26;
      if (total < best - 0.5) {
        best = total;
        spineY = y;
        line = tried;
      }
    }
    if (!line) {
      line = onLine(10000);
      spineY = Math.max(least, PAD + line.upMost + STEM);
      line = onLine(spineY);
    }
    for (const [i, at] of line.out) placed.set(i, at);
    const height = Math.round(spineY + (line.downMost ? STEM + line.downMost : 16) + PAD);

    // Put everything where it goes.
    plate.style.height = height + 'px';
    for (const [i, at] of placed) {
      const el = tagOf.get(i);
      el.style.left = at.box.x + 'px';
      el.style.top = Math.round(at.box.y) + 'px';
      el.dataset.v32dbSide = at.side;
      el.classList.toggle('v32db-flip', !!at.flip);
    }
    for (const one of lanes) {
      const el = deckOf.get(one.span.a.i);
      el.style.left = one.x + 'px';
      el.style.top = one.y + 'px';
      el.style.width = one.w + 'px';
      el.style.height = one.h + 'px';
      // The later development is lettered at the beam's far end where the beam is long enough for it.
      const end = el.querySelector('.v32db-deck-end');
      if (end) end.hidden = one.w < el.v32dbNeed + el.v32dbEnd + 40;
    }

    // The ink: the line, its breaks and decade marks, the spans' piers, each label's stem, each mark.
    const ink = [];
    const line1 = xs[xs.length - 1];
    // A break is a gap in the line with the years it leaves out set in it.
    const cut = geo.breaks.map((b) => [(b.from + b.to) / 2 - 40, (b.from + b.to) / 2 + 40]);
    let from = Math.max(0, X0 - 20);
    const parts = [];
    for (const [a, b] of cut) {
      parts.push([from, a]);
      from = b;
    }
    parts.push([from, Math.min(W, line1 + 20)]);
    for (const [a, b] of parts) ink.push(`<path class="v32db-spine" d="M${a} ${spineY}H${b}"/>`);
    for (const b of geo.breaks) {
      const mid = (b.from + b.to) / 2;
      ink.push(
        `<path class="v32db-break" d="M${mid - 43} ${spineY + 6}l5 -12M${mid + 38} ${spineY + 6}l5 -12"/>`,
        `<text class="v32db-break-words" x="${mid}" y="${spineY + 4}" text-anchor="middle">${b.years} years</text>`,
      );
    }
    for (const tick of geo.ticks)
      ink.push(`<path class="v32db-tick" d="M${Math.round(tick.x) + 0.5} ${spineY - 3}v6"/>`);
    for (const one of lanes) {
      const a = one.span.a,
        b = one.span.b;
      // The pier a span rests on at each end: from the beam to the line, at the entry's own date.
      ink.push(
        `<path class="v32db-pier v32db-f-${a.fam}${a.here ? ' v32db-is-here' : ''}" data-v32db-i="${a.i}" d="M${one.x + 0.5} ${one.y + one.h}V${spineY}"/>`,
        `<path class="v32db-pier v32db-pier-end${b.here ? ' v32db-is-here' : ''}" data-v32db-i="${b.i}" d="M${one.x + one.w} ${one.y - 6}V${spineY}"/>`,
        `<g class="v32db-mark v32db-c-rule v32db-f-${a.fam}${a.here ? ' v32db-is-here' : ''}" data-v32db-i="${a.i}" transform="translate(${one.x - 9} ${spineY - 9})"><circle class="v32db-mark-bed" cx="9" cy="9" r="11"/><svg viewBox="0 0 16 16" width="18" height="18">${GLYPH[a.turn] || GLYPH.applies}</svg></g>`,
      );
    }
    for (const [i, at] of placed) {
      const item = items[i];
      const x = at.stemX + 0.5;
      const end = at.side === 'up' ? at.box.y + at.box.h : at.box.y;
      const far = at.side === 'up' ? at.box.y : at.box.y + at.box.h;
      // The stem runs from the line (or the beam) along the label's edge.
      const bent = !at.flip && Math.abs(at.box.x - at.stemX) > 1;
      const d = bent
        ? `M${x} ${at.from}V${(at.from + end) / 2}H${at.box.x + 0.5}V${far}`
        : `M${x} ${at.from}V${far}`;
      ink.push(
        `<path class="v32db-stem v32db-f-${item.fam}${item.here ? ' v32db-is-here' : ''}${item.hung ? ' v32db-hung' : ''}" data-v32db-i="${i}" d="${d}"/>`,
      );
      if (item.hung)
        ink.push(
          `<circle class="v32db-knot v32db-f-${item.fam}" data-v32db-i="${i}" cx="${x}" cy="${at.from}" r="3"/>`,
        );
      else {
        const r = { rule: 9, reach: 7, steady: 5.5, aside: 6 }[item.cls];
        ink.push(
          `<g class="v32db-mark v32db-c-${item.cls} v32db-f-${item.fam}${item.here ? ' v32db-is-here' : ''}" data-v32db-i="${i}" transform="translate(${at.stemX - r} ${spineY - r})"><circle class="v32db-mark-bed" cx="${r}" cy="${r}" r="${r + 2.5}"/><svg viewBox="0 0 16 16" width="${2 * r}" height="${2 * r}">${GLYPH[item.turn] || GLYPH.applies}</svg></g>`,
        );
      }
    }
    const svg = plate.querySelector('.v32db-ink');
    svg.setAttribute('viewBox', `0 0 ${W} ${height}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', height);
    svg.innerHTML = ink.join('');
    plate.dataset.v32dbLaid = String(W);
    mark(root);
  }

  /* ---------- the account of the selected entry ---------- */
  const CHEVRON =
    '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 5l5 5-5 5"/></svg>';
  const kindLine = (item, extra = '') =>
    `<p class="v32db-kind v32db-f-${item.fam}">${glyph(item.turn, 14)}<span>${esc(item.kind)}</span>${item.s.authorityKind && item.s.authorityKind !== 'Court decision' ? `<span class="v32db-authority">${esc(item.s.authorityKind)}</span>` : ''}${extra}</p>`;
  const dateLine = (item) =>
    `<span class="v32db-date">${timeHTML(item.s, 'v32db-yr')}${dayOf(item.s) ? `<span class="v32db-day">${esc(dayOf(item.s))}</span>` : ''}</span>`;
  function nameHTML(item, tag, cls, linked) {
    const also = item.cases
      .slice(1)
      .map((pair) => `<span class="v32db-also">${captionHTML(pair)}</span>`)
      .join('');
    const to = linked && !item.here ? opener(item.s) : '';
    const inner = `<span class="v32db-caption">${captionHTML(item.first)}</span>`;
    return `<${tag} class="${cls}">${to ? `<a class="v32db-open" role="link" tabindex="0" ${to} title="Open this entry">${inner}</a>` : inner}${also}</${tag}>`;
  }
  function nearHTML(item, relation) {
    return `<button type="button" class="v32db-near v32db-f-${item.fam}${item.here ? ' v32db-is-here' : ''}" data-v32db-i="${item.i}" title="Show this entry"><span class="v32db-near-rel">${esc(relation)}</span><span class="v32db-near-top">${glyph(item.turn, 12)}${timeHTML(item.s, 'v32db-yr')}<span class="v32db-near-name"><span class="v32db-caption">${captionHTML(item.first)}</span></span>${item.here ? '<span class="v32db-here">You are here</span>' : ''}</span><span class="v32db-near-fx">${esc(item.s.effect || item.kind)}</span>${item.s.fate ? `<span class="v32db-near-later"><b>Later development</b>${esc(item.s.fate)}</span>` : ''}</button>`;
  }
  function accountHTML(model, index) {
    const items = model.items,
      item = items[index];
    if (!item) return '';
    // Its neighbours: the entry it overrules or replaces, the rule it is drawn on, the entry that ended
    // it; then the entries just before and after it on the line. Each is named once.
    const near = [];
    const add = (other, relation) => {
      if (other && other !== item && !near.some((n) => n[0] === other)) near.push([other, relation]);
    };
    if (item.ends) add(item.ends.a, P.TURN[item.turn] === 'Replaces' ? 'It replaces' : 'It overrules');
    if (item.hung) add(item.hung.a, 'Drawn on the span of');
    add(items[index - 1], 'Before it');
    add(items[index + 1], 'After it');
    if (item.span) add(item.span.b, P.TURN[item.span.b.turn] === 'Replaces' ? 'Replaced by' : 'Overruled by');
    if (item.hung) add(item.hung.b, 'That span ends with');
    const picture = art(item.artId, 'v32db-art-lg');
    const note = artCaption(item.artId);
    return `<article class="v32db-sel v32db-f-${item.fam}${item.here ? ' v32db-is-here' : ''}" data-v32db-i="${item.i}">
        <div class="v32db-sel-art">${picture}${note ? `<p class="v32db-art-note">${esc(note)}</p>` : ''}</div>
        <div class="v32db-sel-main">
          <p class="v32db-sel-top">${dateLine(item)}${kindLine(item).replace(/^<p /, '<span ').replace(/<\/p>$/, '</span>')}${item.here ? '<span class="v32db-here">You are here</span>' : ''}<span class="v32db-step"><button type="button" data-v32db-go="${index - 1}" aria-label="The entry before" title="The entry before (Left)"${index ? '' : ' disabled'}>${CHEVRON.replace('<svg', '<svg class="v32db-back"')}</button><span class="v32db-place">${index + 1} of ${items.length}</span><button type="button" data-v32db-go="${index + 1}" aria-label="The entry after" title="The entry after (Right)"${index < items.length - 1 ? '' : ' disabled'}>${CHEVRON}</button></span></p>
          ${nameHTML(item, 'h3', 'v32db-sel-name', true)}
          <p class="v32db-sel-fx">${esc(item.s.effect || '')}</p>
          <p class="v32db-sel-note">${esc(item.s.note || '')}</p>
          ${item.s.fate ? `<p class="v32db-later"><b>Later development</b> ${esc(item.s.fate)}</p>` : ''}
        </div>
      </article>
      <div class="v32db-nears" data-v32db-n="${near.length}">${near.map(([other, relation]) => nearHTML(other, relation)).join('')}</div>`;
  }

  /* ---------- every entry, in order ---------- */
  function unitHTML(item, model) {
    const s = item.s;
    const inSpan = model.spans.find((span) => item.i >= span.a.i && item.i <= span.b.i);
    const flags = [
      `v32db-c-${item.cls}`,
      `v32db-f-${item.fam}`,
      item.here ? 'v32db-is-here' : '',
      inSpan ? 'v32db-in-span' : '',
      item.span ? 'v32db-span-a' : '',
      item.ends ? 'v32db-span-b' : '',
      item.hung ? 'v32db-hung' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const sources = P.source(s);
    return `<li class="v32db-unit ${flags}" data-v32db-i="${item.i}"${item.here ? ' aria-current="step"' : ''}>
        <div class="v32db-unit-date">${timeHTML(s, 'v32db-yr')}${dayOf(s) ? `<span class="v32db-day">${esc(dayOf(s))}</span>` : ''}</div>
        <div class="v32db-unit-mark">${glyph(item.turn, { rule: 18, reach: 14, steady: 11, aside: 12 }[item.cls])}</div>
        <div class="v32db-unit-main">
          ${kindLine(item, item.here ? '<span class="v32db-here">You are here</span>' : '')}
          ${nameHTML(item, 'h4', 'v32db-unit-name', true)}
          <p class="v32db-unit-fx">${esc(s.effect || '')}</p>
          <p class="v32db-unit-note">${esc(s.note || '')}</p>
          ${s.context ? `<p class="v32db-unit-context">${esc(s.context)}</p>` : ''}
          ${s.fate ? `<p class="v32db-later"><b>Later development</b> ${esc(s.fate)}</p>` : ''}
          ${sources ? `<p class="v32db-unit-sources">${sources}</p>` : ''}
        </div>
        <div class="v32db-unit-art">${art(item.artId, 'v32db-art-md')}</div>
      </li>`;
  }

  /* ---------- drawing ---------- */
  const state = { entry: null, line: 0, sel: -1, model: null, key: '' };
  let root = null;
  const host = () => inspector.querySelector('.reader-body.v32.v32-case');
  const current = () => {
    try {
      return typeof selected !== 'undefined' && selected?.type === 'node' ? selected.id : null;
    } catch {
      return null;
    }
  };
  function legendHTML(model) {
    const seen = new Map();
    for (const item of model.items)
      if (!seen.has(item.turn))
        seen.set(item.turn, ['overrules', 'displaces', 'extends', 'codifies', 'counterpoint'].includes(item.turn) ? P.TURN[item.turn] : item.kind);
    const order = Object.keys(CLASS).filter((turn) => seen.has(turn));
    const groups = ['rule', 'reach', 'steady', 'aside']
      .map((cls) => {
        const list = order.filter((turn) => CLASS[turn] === cls);
        return list.length
          ? `<span class="v32db-key-group" title="${CLASS_WORDS[cls]}">${list.map((turn) => `<span class="v32db-key v32db-c-${cls} v32db-f-${P.FAMILY[turn] || 'steady'}" title="${esc(P.MEANS[turn] || '')}">${glyph(turn, { rule: 14, reach: 12, steady: 10, aside: 11 }[cls])}${esc(seen.get(turn))}</span>`).join('')}</span>`
          : '';
      })
      .join('');
    const span = model.spans.length
      ? `<span class="v32db-key-group"><span class="v32db-key v32db-key-span" title="Drawn where a later entry overrules or replaces an earlier one by name. An entry between the two whose account names that rule is drawn on the span."><i></i>A rule, from the entry that set it to the entry that ended it</span></span>`
      : '';
    return groups + span;
  }
  function html(model, lines) {
    const t = model.t;
    const years = model.items.map((item) => item.s.year).filter((y) => Number.isFinite(y));
    const range = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '';
    const pick =
      lines.length > 1
        ? `<div class="v32db-switch" role="group" aria-label="Which timeline to show">${lines.map((line, i) => `<button type="button" data-v32db-line="${i}" aria-pressed="${i === state.line}">${esc(line.title)}</button>`).join('')}</div>`
        : '';
    return `${pick}
      <header class="v32db-head">
        <h3 class="v32db-title">${esc(t.title)}</h3>
        <p class="v32db-q">${esc(t.question)}</p>
      </header>
      <div class="v32db-plate" role="group" aria-label="${esc(t.title)}: the timeline, drawn" tabindex="0" aria-describedby="v32dbHint">
        <svg class="v32db-ink" aria-hidden="true"></svg>
        ${model.spans.map(deckHTML).join('')}
        ${model.items
          .filter((item) => !item.span)
          .map(tagHTML)
          .join('')}
      </div>
      <div class="v32db-under">
        <p class="v32db-legend">${legendHTML(model)}</p>
        <p class="v32db-vh" id="v32dbHint">${model.items.length} entries${range ? `, ${range}` : ''}. Select an entry on the drawing, or press the Left and Right keys.</p>
      </div>
      <section class="v32db-account" aria-live="polite" aria-label="The selected entry and its neighbours"></section>
      <section class="v32db-all" aria-label="Every entry, in order">
        <header class="v32db-all-head">
          <h3>Every entry, in order</h3>
          ${t.guide ? `<p class="v32db-guide"><b>How these entries connect</b> ${esc(t.guide)}</p>` : ''}
        </header>
        <ol class="v32db-list">${model.items.map((item) => unitHTML(item, model)).join('')}</ol>
        ${t.now ? `<section class="v32db-now"><h3>${esc(t.summaryLabel || 'Main takeaway')}</h3><p>${esc(t.now)}</p>${P.reviewSources(t) ? `<p class="v32db-unit-sources">${P.reviewSources(t)}</p>` : ''}</section>` : ''}
      </section>`;
  }
  // Which entry is selected, on the plate, in the account and in the list.
  function mark(scope) {
    if (!scope) return;
    for (const el of scope.querySelectorAll('.v32db-plate [data-v32db-i]')) {
      const on = Number(el.dataset.v32dbI) === state.sel;
      if (el.classList.contains('v32db-is-sel') !== on) el.classList.toggle('v32db-is-sel', on);
      if (el.matches('button')) el.setAttribute('aria-pressed', String(on));
    }
    for (const el of scope.querySelectorAll('.v32db-list > li')) {
      const on = Number(el.dataset.v32dbI) === state.sel;
      if (el.classList.contains('v32db-is-sel') !== on) el.classList.toggle('v32db-is-sel', on);
    }
  }
  function select(index, focus) {
    const model = state.model;
    if (!model || !root || index < 0 || index >= model.items.length) return;
    state.sel = index;
    const account = root.querySelector('.v32db-account');
    account.innerHTML = accountHTML(model, index);
    fitArt(account);
    mark(root);
    if (focus) root.querySelector(`.v32db-plate button[data-v32db-i="${index}"]`)?.focus({ preventScroll: true });
  }
  // The case's header as one line of the top strip: its picture, its name, where it sits.
  function masthead(node) {
    const top = inspector.querySelector('.reader-top');
    if (!top) return;
    let mast = top.querySelector(':scope > .v32db-mast');
    if (!node) {
      mast?.remove();
      return;
    }
    const full = String(node.title || '')
      .replace(/\s*\((?:1[5-9]|20)\d{2}\)\s*$/, '')
      .trim();
    const cases = casesOf(full);
    const where = top.querySelector(':scope > .v32-ident');
    const key = node.id + '|' + (where?.title || '');
    if (mast?.dataset.v32dbKey === key) return;
    mast?.remove();
    mast = document.createElement('div');
    mast.className = 'v32db-mast';
    mast.dataset.v32dbKey = key;
    mast.innerHTML = `${art(node.id, 'v32db-art-sm')}<strong title="${esc(full)}">${captionHTML(cases[0])}</strong>`;
    if (where) {
      const crumbs = where.cloneNode(true);
      crumbs.className = 'v32db-crumbs';
      crumbs.removeAttribute('data-v32-strip');
      mast.appendChild(crumbs);
    }
    if (where) mast.style.setProperty('--v32-dot', where.style.getPropertyValue('--v32-dot'));
    top.prepend(mast);
    fitArt(mast);
  }
  let sizes = null;
  function draw() {
    const body = host();
    const id = current();
    const on = flagged() && !!body && !!id && window.DKLAReader?.current?.() === 'doctrine';
    const lines = on
      ? window.DKLATimelines.list().filter((t) => t.steps.some((s) => s.id === id) && t.steps.filter(P.live).length > 1)
      : [];
    const active = on && lines.length > 0;
    if (document.body.classList.contains('v32db-on') !== active) {
      document.body.classList.toggle('v32db-on', active);
      // The reader changed width: the map behind it is not asked to fit itself again.
    }
    if (!active) {
      masthead(null);
      if (!flagged() || !body) root = null;
      body?.querySelector(':scope > .v32db')?.remove();
      return;
    }
    if (state.entry !== id) {
      state.entry = id;
      state.line = 0;
      state.sel = -1;
    }
    state.line = Math.min(state.line, lines.length - 1);
    const t = lines[state.line];
    const key = id + '|' + t.id + '|' + window.DKLATimelines.rev;
    root = body.querySelector(':scope > .v32db');
    if (!root || state.key !== key || !root.firstElementChild) {
      state.model = build(t, id);
      state.key = key;
      if (!root) {
        root = document.createElement('section');
        root.className = 'v32db';
        root.dataset.v32Facet = 'doctrine';
        root.setAttribute('aria-label', 'Doctrinal history');
        const before = body.querySelector(':scope > [data-v32-facet="doctrine"]:not(.v32-fh)');
        if (before) body.insertBefore(root, before);
        else body.appendChild(root);
      }
      root.innerHTML = html(state.model, lines);
      fitArt(root);
      if (state.sel < 0 || state.sel >= state.model.items.length)
        state.sel = state.model.here >= 0 ? state.model.here : state.model.items.length - 1;
      select(state.sel);
      layout(root, state.model);
      sizes?.disconnect();
      if (typeof ResizeObserver === 'function') {
        sizes = new ResizeObserver(() => {
          const plate = root?.querySelector('.v32db-plate');
          if (plate && plate.clientWidth && plate.dataset.v32dbLaid !== String(plate.clientWidth))
            layout(root, state.model);
        });
        sizes.observe(root.querySelector('.v32db-plate'));
      }
      document.fonts?.ready?.then(() => root?.isConnected && layout(root, state.model));
    }
    masthead(nodesById.get(id));
  }

  /* ---------- pointer and keyboard ---------- */
  function onClick(event) {
    if (!root || !root.contains(event.target)) return;
    const line = event.target.closest('[data-v32db-line]');
    if (line) {
      state.line = Number(line.dataset.v32dbLine);
      state.sel = -1;
      state.key = '';
      draw();
      return;
    }
    if (event.target.closest('.v32db-open, .r28-step-source, a[href]')) return;
    const go = event.target.closest('[data-v32db-go]');
    if (go) {
      select(Number(go.dataset.v32dbGo));
      root.querySelector('.v32db-step > button:not(:disabled)')?.focus({ preventScroll: true });
      return;
    }
    const pick = event.target.closest('.v32db-plate [data-v32db-i], .v32db-near[data-v32db-i]');
    if (pick) select(Number(pick.dataset.v32dbI));
  }
  function onKey(event) {
    if (!root || !root.isConnected || !document.body.classList.contains('v32db-on')) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const at = document.activeElement;
    if (at && (at.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(at.tagName))) return;
    if (at?.closest?.('.v32-tab') || document.querySelector('dialog[open]')) return;
    // Left and Right belong to the plate while it, or nothing in particular, has the keyboard.
    if (at && at !== document.body && !root.contains(at) && !inspector.contains(at)) return;
    if ((event.key === 'Home' || event.key === 'End') && !at?.closest?.('.v32db-plate')) return;
    const n = state.model.items.length;
    const to =
      event.key === 'ArrowLeft'
        ? state.sel - 1
        : event.key === 'ArrowRight'
          ? state.sel + 1
          : event.key === 'Home'
            ? 0
            : n - 1;
    if (to < 0 || to >= n) return;
    event.preventDefault();
    select(to, !!at?.closest?.('.v32db-plate'));
  }
  inspector.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  const onFacet = () => draw();
  document.addEventListener('dkla:facet', onFacet);
  window.addEventListener('hashchange', onFacet);

  // The reader is drawn again whenever the entry is (src/features/v25/reading.js puts the blocks in
  // their tabs inside the same call): the plate is drawn after it.
  let wrapped = null;
  if (typeof renderInspector === 'function') {
    const prior = renderInspector;
    wrapped = function (...args) {
      const out = prior.apply(this, args);
      try {
        draw();
      } catch (error) {
        console.error('doctrine-b', error);
      }
      return out;
    };
    wrapped.v32dbPrior = prior;
    renderInspector = wrapped;
  }
  window.DKLADoctrineB = {
    draw,
    select,
    model: () => state.model,
    destroy() {
      inspector.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('dkla:facet', onFacet);
      window.removeEventListener('hashchange', onFacet);
      sizes?.disconnect();
      if (wrapped && renderInspector === wrapped) renderInspector = wrapped.v32dbPrior;
      document.body.classList.remove('v32db-on');
      inspector.querySelectorAll('.v32db, .v32db-mast').forEach((el) => el.remove());
    },
  };
  try {
    draw();
  } catch (error) {
    console.error('doctrine-b', error);
  }
})();
