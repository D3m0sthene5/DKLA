/* The Doctrine view of a case: a plate and an account.
 *
 * A case's Doctrine tab takes the whole width of the reader (the map strip and the margin give way; the
 * case's header becomes one line in the top strip) and opens with the doctrinal history itself:
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

  /* ---------- small tools ---------- */
  const esc = (text) =>
    String(text ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
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

  // What a decision held is said in the past tense. A stored line that opens "Historically accepts ..."
  // is the same holding with a word that leaves the reader guessing which part still matters: here it
  // reads "Accepted ...", and what later changed is named beside it from the entry's stored later
  // development. Only the opening verb (and a verb that depends on it) changes; a verb this table does
  // not know leaves the stored line whole.
  const PAST = {
    accepts: 'Accepted',
    requires: 'Required',
    permits: 'Permitted',
    limits: 'Limited',
    lets: 'Let',
    applies: 'Applied',
    recognizes: 'Recognized',
    excludes: 'Excluded',
  };
  function held(text) {
    const said = String(text || '');
    const found = /^Historically,?\s+([a-z]+)\b/.exec(said);
    if (!found || !PAST[found[1]]) return said;
    return PAST[found[1]] + said.slice(found[0].length).replace(/\b(which \w+) receive\b/, '$1 received');
  }
  // A stored note that opens "Historically, clear statutory text controlled ..." is already in the past.
  const onPlate = (text) =>
    String(text || '').replace(/^Historically,\s+(\S)/, (all, first) => first.toUpperCase());
  // The sentences of a stored note. A full stop ends one only before a capital, and not after an
  // initial or an abbreviation of a case name.
  function sentences(text) {
    const out = [];
    let from = 0;
    const ends = /[.!?]["’”')]*\s+(?=["“‘(]?[A-Z§])/g;
    for (let m; (m = ends.exec(text)); ) {
      const before = text.slice(from, m.index + 1);
      if (
        /(?:^|[\s(])(?:[A-Z]|v|vs|U\.S|Inc|Co|Corp|Ltd|No|Mr|Ms|Dr|St|e\.g|i\.e|cf|Cf|Bros|Ass’n|Ass'n)\.$/.test(
          before,
        )
      )
        continue;
      out.push(text.slice(from, m.index + m[0].length).trim());
      from = m.index + m[0].length;
    }
    if (from < text.length) out.push(text.slice(from).trim());
    return out.filter(Boolean);
  }

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
  const bare = (word) => word.replace(/[,;:]$/, '').replace(/’/g, "'");
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
    const found = [
      ...String(text || '').matchAll(/((?:[A-Z][\w.'’&-]*)(?: [A-Z&][\w.'’&-]*)*) \((\d{4})\)/g),
    ];
    for (const [, run, y] of found) {
      if (y !== year) continue;
      const list = words(run);
      for (let from = 0; from < list.length; from++) {
        const tail = list.slice(from).join(' ');
        if (tail.length < 4) break;
        if (
          item.cases.flat().some((party) => new RegExp('(^|\\s)' + reEsc(tail) + '(\\s|[,.]|$)').test(party))
        )
          return tail;
      }
    }
    return '';
  }

  // Everything the timeline says in prose, apart from one entry's own account.
  const prose = (t, items, except, more) =>
    [
      t.guide,
      t.now,
      more,
      ...items.filter((o) => o !== except).flatMap((o) => [o.s.note, o.s.fate, o.s.context, o.s.object]),
    ]
      .filter(Boolean)
      .join(' \n ');
  // Words that open a party's name and are not a name a case goes by.
  const COMMON =
    /^(United States|United|State|States|People|Commonwealth|City|County|Town|Board|Department|National|American|International|In re|Ex parte|The)$/;
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
  // Does a stored "later development" name this entry ("Overruled by Loper Bright (2024)")?
  const namesEntry = (text, item) => !!text && !!shortFrom(text, item);
  function build(t, current) {
    const subject = subjectLine(current);
    // A timeline whose entries each carry a stored, sourced relationship to the rule they bear on
    // (tools/r19/data/timelines.json: `lines` on the timeline, `bears` on each step).
    const settled = Array.isArray(t.lines) && t.lines.length > 0;
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
        // What its label says under the name: the entry's own stored words for what it did (its
        // shape on the line already says which kind of move that is).
        words: '',
        short: '',
        artId: s.id || s.link || null,
        bears: settled ? s.bears || null : null,
        span: null, // the rule this entry set
        ends: null, // the rule this entry ended
        hung: null, // the rule this entry was decided under and acted on
        rail: null, // the named line this entry is drawn on, where that is not a rule set on this timeline
        rails: [],
      };
    });
    const spans = [],
      rails = [];
    if (settled) {
      const byLine = new Map();
      for (const line of t.lines) {
        const on = items.filter((item) => [].concat(item.bears?.on ?? []).includes(line.id));
        const a = on.find((item) => item.bears.as === 'sets'),
          b = on.find((item) => item.bears.as === 'ends') || null;
        if (a) {
          // A rule set on this timeline: a span from the entry that set it to the entry that ended it,
          // or running on where nothing here ended it.
          const span = { a, b, short: line.name, line, hung: [], rails: [] };
          a.span = span;
          a.short = line.name;
          if (b) b.ends = span;
          for (const item of on) {
            if (item === a || item === b) continue;
            item.hung = span;
            span.hung.push(item);
          }
          spans.push(span);
          byLine.set(line.id, span);
        } else {
          // A named line with no entry here that set it: a question under a rule (`of`), a standing
          // alternative, or a different rule this timeline only touches.
          const rail = { line, items: on, of: null };
          for (const item of on) item.rails.push(rail);
          rails.push(rail);
          byLine.set(line.id, rail);
        }
      }
      for (const rail of rails) {
        const parent = rail.line.of && byLine.get(rail.line.of);
        if (parent?.a) {
          rail.of = parent;
          parent.rails.push(rail);
        }
      }
      // An entry on two lines is labelled on the lower one and marked on both.
      for (const item of items) item.rail = item.rails[item.rails.length - 1] || null;
    } else {
      // No stored relationships yet. A rule's span is still drawn where a later entry overrules or
      // replaces an earlier one by name (its stored `object`), but no entry between the two is placed
      // on it: where each belongs is a sourced fact, not something to infer from a word.
      for (const b of items) {
        if (!['overrules', 'displaces'].includes(b.turn) || !b.s.object) continue;
        let found = null;
        for (let k = b.i - 1; k >= 0; k--) {
          const short = namedBy(items[k], b.s.object);
          if (short && (!found || short.length > found.short.length)) found = { a: items[k], short };
        }
        if (!found || found.a.span) continue;
        const span = { a: found.a, b, short: found.short, line: null, hung: [], rails: [] };
        found.a.span = span;
        found.a.short = found.short;
        b.ends = span;
        spans.push(span);
      }
      // An entry stored as a comparison from another jurisdiction or legal regime stands on a line of
      // its own, lettered with that jurisdiction (its stored `object`: "Swiss law", "Singapore"),
      // unless the object only repeats the entry's own name.
      for (const item of items) {
        const own = namedBy(item, item.s.object || '');
        if (item.turn !== 'counterpoint' || !item.s.object || item.span) continue;
        if (own && words(own).length === words(item.s.object).length) continue;
        const rail = { line: { id: 'apart-' + item.i, name: item.s.object }, items: [item], of: null };
        item.rail = rail;
        item.rails = [rail];
        rails.push(rail);
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
      // A long name that is not a caption takes the entry's own stored short title; a long caption
      // takes the name the timeline's own prose calls the case by ("Brand X").
      if (!item.short && plain(item.first).length > 34) {
        const own = item.cases.length === 1 && item.first.length === 1 && item.s.id;
        const title = own ? String(nodesById.get(item.s.id)?.shortTitle || '') : '';
        item.short =
          title.replace(/\s*\((?:1[5-9]|20)\d{2}\)\s*$/, '').trim() || calledBy(item, prose(t, items, item, subject));
      }
    }
    for (const item of items) item.words = held(item.s.effect || item.kind);
    // What became of entries: an entry's stored later development that names another entry of this
    // timeline ties the two; one that names none of them is said on the entry's own label.
    for (const item of items) {
      item.became = items.filter((x) => x.i < item.i && namesEntry(x.s.fate, item));
      item.later = item.s.fate ? items.find((x) => x.i > item.i && namesEntry(item.s.fate, x)) || null : null;
    }
    // Every entry on a named line and none on the axis: the lines are the chart (a comparison).
    const free = rails.filter((rail) => !rail.of);
    const form =
      free.length && !spans.length && items.every((item) => item.rail && !item.rail.of) ? 'lanes' : 'axis';
    return { t, items, spans, rails, form, settled, here: items.findIndex((item) => item.here) };
  }

  /* ---------- the plate ---------- */
  const PAD = 8, // above and below the drawing
    X_FIRST = 20, // the first entry's place from the plate's left edge
    DECK = 50, // a span's height
    STEM = 12, // from the line (or a span's edge) to the nearest label
    TIER = 10, // between two labels of a stack
    HGAP = 18, // between two labels side by side
    SGAP = 8, // between a label and another entry's stem
    MINGAP = 16, // the least distance between two marks
    BREAK = 136, // the least width of a marked break
    NAME = 22, // a named line's lettering above its rail
    DROP = 34, // from the axis down to a line that stands apart from it
    SIDE = DROP - STEM - 11; // what that adds above such an entry's label
  // An entry on a line that stands apart from the axis (a different rule the timeline only touches).
  const aside = (model, item) => !!item.rail && !item.rail.of && model.form !== 'lanes';

  // The label of an entry: its year and kind of move, then its name. Applications and comparisons are one
  // line; an entry on a span carries its shape (it has no mark on the line).
  function tagHTML(item, model) {
    const apart = aside(model, item);
    const small = (item.cls === 'steady' || item.cls === 'aside') && !item.here && !apart;
    const big = item.cls === 'rule' || item.here;
    const here = item.here ? '<span class="v32db-here">You are here</span>' : '';
    const year = timeHTML(item.s, 'v32db-yr');
    const mark = item.hung ? glyph(item.turn, 12) : '';
    const title = `${item.full} (${yearOf(item.s)}). ${item.kind}. ${held(item.s.effect || '')}`;
    // The line it stands on, lettered where it stands: its name, and what the line concerns where the
    // label has no room for the entry's own words.
    const line = apart
      ? `<span class="v32db-rail-title"><b>${esc(item.rail.line.name)}</b>${item.rail.line.concerns ? `<i>${esc(item.rail.line.concerns)}</i>` : ''}</span>`
      : '';
    // A later change that no entry of this timeline made is named on the label itself.
    const fate =
      item.s.fate && !item.later && !item.hung ? `<span class="v32db-tag-fate">${esc(item.s.fate)}</span>` : '';
    // A turn of the rule with a long caption is named a party to a line; every other name is one line,
    // and gives way party by party where it is too long (fitName).
    const name = item.short
      ? `<span class="v32db-tag-name">${esc(item.short)}</span>`
      : big && item.first.length === 2 && plain(item.first).length > 30
        ? `<span class="v32db-tag-name v32db-tag-caption"><span class="v32db-line">${esc(item.first[0])}</span><span class="v32db-line">v. ${esc(item.first[1])}</span></span>`
        : `<span class="v32db-tag-name" data-a="${esc(item.first[0])}"${item.first[1] ? ` data-b="${esc(item.first[1])}"` : ''}>${esc(plain(item.first))}</span>`;
    return `<button type="button" class="v32db-tag v32db-c-${item.cls} v32db-f-${item.fam}${big ? ' v32db-big' : ''}${small ? ' v32db-small' : ''}${item.here ? ' v32db-is-here' : ''}${item.hung ? ' v32db-hung' : ''}${apart ? ' v32db-apart' : ''}" data-v32db-i="${item.i}" title="${esc(title)}">${line}<span class="v32db-tag-top">${mark}${year}${name}${here}</span><span class="v32db-tag-fx">${esc(item.words)}</span>${fate}</button>`;
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
    const title = `${a.full} (${yearOf(a.s)}). ${held(a.s.effect || '')}`;
    // A rule nothing on this timeline ended runs on: its years are open and so is its far end.
    return `<button type="button" class="v32db-deck v32db-f-${a.fam}${a.here ? ' v32db-is-here' : ''}${b ? '' : ' v32db-open-end'}" data-v32db-i="${a.i}" title="${esc(title)}">${art(a.artId)}<span class="v32db-deck-words"><span class="v32db-deck-top"><span class="v32db-deck-name">${esc(span.short)}</span><span class="v32db-yr">${esc(yearOf(a.s))}–${b ? esc(yearOf(b.s)) : ''}</span>${a.here ? '<span class="v32db-here">You are here</span>' : ''}</span><span class="v32db-deck-fx">${glyph(a.turn, 12)}<span class="v32db-deck-said" data-rule="${esc(onPlate(sentences(a.s.note || '')[0] || ''))}" data-did="${esc(a.words)}">${esc(a.words)}</span></span></span></button>`;
  }

  // Each entry's place along the line. Time is true to scale inside a stretch; a gap longer than three
  // tenths of the whole (and fifteen years) is a break of fixed width; two marks never touch.
  function placeX(model, x0, x1, deckNeed, gap = BREAK) {
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
    // (Two fifths of the whole, so a short timeline is not all breaks.)
    const isBreak = (i) => n >= 4 && ts[i] - ts[i - 1] > 0.4 * whole && ts[i] - ts[i - 1] >= 15;
    const widthOf = (i) =>
      model.spans.some((span) => span.a.i <= i - 1 && (span.b ? span.b.i : n - 1) >= i)
        ? Math.max(gap, Math.min(deckNeed + 48, (x1 - x0) * 0.36))
        : gap;
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
      if (isBreak(i)) breaks.push({ from: xs[i - 1], to: xs[i], years: Math.round(ts[i] - ts[i - 1]), i });
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

  // Labels round a baseline. Each starts at its entry's stem and runs right, or ends at it and runs
  // left, as near the baseline as it can sit without covering another entry's stem or label. The
  // entries at the edges of a cluster are placed first, so a cluster opens like a fan: the outer
  // labels nearest the baseline, the inner ones stepping away from it.
  //   list: the entries; x(item), size(item) -> {w, h}; prefers(item) -> 'up' | 'down' | '';
  //   only(item) -> a side it must take, or ''; ok(side, left, sz, level, item) -> may it sit there;
  //   first: entries labelled before the rest, to the right of their stems; min, max: the room.
  function fan(list, opt) {
    // (posts: upright lines already drawn below the baseline, which no label there may cross.)
    const sides = { up: [], down: (opt.posts || []).map((x) => ({ left: x, w: 0, level: 0, h: 4000, x })) };
    const out = new Map();
    let upMost = 0,
      downMost = 0,
      missed = 0;
    const left = new Set(list);
    const put = (item, side, flip, from, level, sz, x) => {
      left.delete(item);
      sides[side].push({ left: from, w: sz.w, level, h: sz.h, x });
      out.set(item.i, { side, flip, left: from, level, w: sz.w, h: sz.h, x });
      if (side === 'up') upMost = Math.max(upMost, level + sz.h);
      else downMost = Math.max(downMost, level + sz.h);
    };
    for (const item of opt.first || []) {
      if (!left.has(item)) continue;
      const sz = opt.size(item),
        x = opt.x(item);
      if (x + sz.w > opt.max) continue;
      put(item, opt.ok('up', x, sz, 0, item) ? 'up' : 'down', false, x, 0, sz, x);
    }
    while (left.size) {
      let pick = null;
      // strict: not over the stem of an entry that has no label yet. loose: its own stem may run
      // through a label (the last resort; nothing is left without a place).
      const consider = (strict, loose, last) => {
        for (const item of left) {
          const forms = opt.forms?.(item) || [opt.size(item)];
          for (const [form, sz] of forms.entries()) {
            const x = opt.x(item);
            const prefers = opt.prefers(item),
              only = opt.only(item);
            for (const flip of [false, true]) {
              const from = flip ? x - sz.w : x;
              if (!loose && (from < opt.min || from + sz.w > opt.max)) continue;
              if (loose && flip && from < (last ? 0 : opt.min)) continue;
              if (flip && opt.noFlip?.(item) && !loose) continue;
              for (const side of only ? [only] : ['up', 'down']) {
                // (An entry that can only be labelled on the other side has no stem on this one.)
                if (
                  strict &&
                  [...left].some(
                    (o) =>
                      o !== item &&
                      (!opt.only(o) || opt.only(o) === side) &&
                      opt.x(o) > from - SGAP &&
                      opt.x(o) < from + sz.w + SGAP,
                  )
                )
                  continue;
                let level = 0;
                for (const o of sides[side]) {
                  const over = o.left < from + sz.w + HGAP && from < o.left + o.w + HGAP;
                  const stem = o.x > from - SGAP && o.x < from + sz.w + SGAP;
                  if ((over || stem) && o.level + o.h + TIER > level) level = o.level + o.h + TIER;
                }
                // Its own stem must not run through a label already there.
                if (
                  !loose &&
                  sides[side].some(
                    (o) =>
                      o.x !== x &&
                      x > o.left - SGAP &&
                      x < o.left + o.w + SGAP &&
                      level + sz.h + TIER > o.level,
                  )
                )
                  continue;
                if (!opt.ok(side, from, sz, level, item)) continue;
                const miss = prefers && side !== prefers ? 1 : 0;
                const cost =
                  level +
                  miss * 34 +
                  (flip ? 3 : 0) +
                  (side === 'up' ? 1 : 0) +
                  form * (opt.formCost?.(item) ?? 8);
                // The cheapest place first; between entries whose places cost about the same, the later one.
                const better = !pick
                  ? true
                  : pick.item === item
                    ? cost < pick.cost - 0.01
                    : Math.abs(cost - pick.cost) <= 4
                      ? item.i > pick.item.i
                      : cost < pick.cost;
                if (better) pick = { item, side, flip, from, level, sz, cost, x, miss, form };
              }
            }
          }
        }
      };
      consider(true, false);
      if (!pick) consider(false, false);
      if (!pick) consider(false, true);
      if (!pick) consider(false, true, true);
      if (!pick) break;
      missed += pick.miss;
      put(pick.item, pick.side, pick.flip, pick.from, pick.level, pick.sz, pick.x);
      out.get(pick.item.i).form = pick.form;
    }
    return { out, upMost, downMost, missed };
  }

  // One arrangement of the plate at a level of detail: 3, every label says what its entry did; 2, the
  // applications and comparisons are named only; 1, only the turns of the rule and the open case say more.
  function arrange(plate, model, level, W) {
    const items = model.items;
    const tagOf = new Map(
      [...plate.querySelectorAll('.v32db-tag')].map((el) => [Number(el.dataset.v32dbI), el]),
    );
    const deckOf = new Map(
      [...plate.querySelectorAll('.v32db-deck')].map((el) => [Number(el.dataset.v32dbI), el]),
    );
    for (const el of [...tagOf.values(), ...deckOf.values()]) {
      el.style.left = '';
      el.style.top = '';
      el.style.width = '';
      el.style.height = '';
      el.classList.remove('v32db-flip');
    }
    plate.dataset.v32dbLevel = String(level);
    for (const el of plate.querySelectorAll('.v32db-tag-name[data-a]')) fitName(el);
    // What an entry did is set to the width of its date and name (and no narrower than a short line).
    for (const el of tagOf.values()) {
      const said = el.querySelector('.v32db-tag-fx');
      if (!said || el.classList.contains('v32db-small')) continue;
      said.style.maxWidth = '';
      const row = el.querySelector('.v32db-tag-top').getBoundingClientRect().width;
      said.style.maxWidth = Math.round(Math.min(300, Math.max(row, 196))) + 'px';
    }
    const size = new Map(),
      forms = new Map();
    const box = (el) => ({ w: Math.ceil(el.getBoundingClientRect().width), h: el.offsetHeight });
    for (const el of deckOf.values()) {
      const said = el.querySelector('.v32db-deck-said');
      if (said) said.textContent = said.dataset.did;
    }
    for (const [i, el] of tagOf) {
      el.classList.remove('v32db-two', 'v32db-bare');
      size.set(i, box(el));
      // An application's label is one line, or, where that line would be in the way, its words go under its name.
      const said = el.querySelector('.v32db-tag-fx');
      if (!said || !said.getClientRects().length) continue;
      // Any other label gives up its words (they are in the account and the list) where, with them,
      // it would have to stand far from the line.
      const other = el.classList.contains('v32db-small') ? 'v32db-two' : 'v32db-bare';
      el.classList.add(other);
      forms.set(i, [size.get(i), box(el)]);
      el.classList.remove(other);
    }
    let deckNeed = 0;
    for (const el of deckOf.values())
      deckNeed = Math.max(deckNeed, Math.ceil(el.getBoundingClientRect().width));
    const sizeOf = (item) => size.get(item.i);
    const formsOf = (item) => forms.get(item.i) || null;
    // Words under a name cost little; going without them costs two rows.
    const formCost = (item) => ((item.cls === 'steady' || item.cls === 'aside') && !item.here ? 8 : 56);

    // A named line's name is lettered at its start. Where the lines are the chart, the names stand in a
    // column and every entry lies to the right of it.
    const nameOf = new Map(
      [...plate.querySelectorAll('.v32db-lane-name')].map((el) => [el.dataset.v32dbLine, el]),
    );
    const nameW = (rail) => Math.ceil(nameOf.get(rail.line.id)?.getBoundingClientRect().width || 0);
    const column =
      model.form === 'lanes' ? Math.max(0, ...model.rails.filter((rail) => !rail.of).map(nameW)) + 12 : 0;
    const X0 = column ? column + 28 : X_FIRST;
    // The line ends where the last entry's label still fits to the right of its mark.
    const gap = Math.round(Math.min(190, Math.max(BREAK, W * 0.13)));
    let x1 = W - 24;
    let geo = placeX(model, X0, x1, deckNeed, gap);
    for (let pass = 0; pass < 4; pass++) {
      const last = items[items.length - 1];
      const sz = size.get(last.i);
      const over = sz ? geo.xs[last.i] + sz.w + 4 - W : 0;
      if (over <= 0.5) break;
      x1 = Math.max(X0 + (items.length - 1) * MINGAP, x1 - over);
      geo = placeX(model, X0, x1, deckNeed, gap);
    }
    const xs = geo.xs.map((x) => Math.round(x));
    const xOf = (item) => xs[item.i];

    // Spans, in lanes from the top. On each, the entries drawn on it: a widening stands on the beam,
    // anything else hangs under it; then the named lines that belong to the rule (the questions it
    // divides into), each with its own entries.
    const lanes = [];
    const rects = []; // everything placed so far that a label on the line must not touch
    const placed = new Map(); // entry -> its label's box, where its stem starts, which way it runs
    const railsAt = []; // each named line drawn as a rail: where it runs
    const placeRails = (list, from, left, right) => {
      let y = from;
      // A line's name is lettered on the line itself, the rail running on from it, unless an entry of
      // one of these lines falls where its name would be: then every name stands above its rail.
      const startOf = (rail) => (column ? column : left + 10 + nameW(rail) + 10);
      const inline = list.every((rail) => rail.items.every((item) => xs[item.i] >= startOf(rail) + 24));
      for (const rail of list) {
        const own = rail.items.filter((item) => item.rail === rail);
        const start = startOf(rail);
        const at = y + (inline ? 11 : NAME);
        const on = fan(own, {
          x: xOf,
          size: sizeOf,
          prefers: () => '',
          only: () => 'down',
          forms: formsOf,
          formCost,
          ok: () => true,
          // An entry also marked on a line further down is joined to that mark: no label crosses the join.
          posts: rail.items.filter((item) => item.rail !== rail).map(xOf),
          min: left + 4,
          max: W - 4,
        });
        for (const [i, a] of on.out) {
          const box = { x: a.left, y: at + STEM + a.level, w: a.w, h: a.h };
          placed.set(i, { box, from: at, side: 'down', stemX: a.x, flip: a.flip, form: a.form, markY: at });
        }
        railsAt.push({
          rail,
          y: at,
          x0: inline ? start : left,
          x1: right,
          nameX: column ? 0 : left + 10,
          nameY: inline ? at - 10 : at - NAME,
        });
        y = at + (on.downMost ? STEM + on.downMost : 10) + 10;
      }
      return y;
    };
    let top = PAD;
    if (model.form === 'lanes') {
      const bottom = placeRails(
        model.rails.filter((rail) => !rail.of),
        top,
        0,
        W,
      );
      rects.push({ x: 0, y: top, w: W, h: bottom - top });
      top = bottom + 4;
    }
    for (const span of model.spans) {
      const x = xs[span.a.i];
      const one = { span, x, w: Math.max(40, (span.b ? xs[span.b.i] : W) - x), h: DECK };
      const on = fan(span.hung, {
        x: xOf,
        size: sizeOf,
        prefers: () => '',
        only: (item) => (item.fam === 'wide' ? 'up' : 'down'),
        forms: formsOf,
        formCost,
        ok: (side, left, sz) => side === 'up' || left + sz.w <= one.x + one.w - 2,
        min: one.x + 6,
        max: W - 4,
      });
      const upRoom = on.upMost ? on.upMost + STEM : 0;
      one.y = top + upRoom;
      for (const [i, at] of on.out) {
        const box = {
          x: at.left,
          y: at.side === 'up' ? one.y - STEM - at.level - at.h : one.y + one.h + STEM + at.level,
          w: at.w,
          h: at.h,
        };
        placed.set(i, {
          box,
          from: at.side === 'up' ? one.y : one.y + one.h,
          side: at.side,
          stemX: at.x,
          flip: at.flip,
          form: at.form,
        });
        rects.push(box);
      }
      rects.push({ x: one.x, y: one.y - upRoom, w: one.w, h: upRoom + one.h, ends: span.b?.i });
      one.bottom = one.y + one.h + (on.downMost ? on.downMost + STEM : 0);
      if (span.rails.length) {
        const under = one.bottom;
        one.bottom = placeRails(span.rails, under + 6, one.x, one.x + one.w - (span.b ? 0 : 28));
        rects.push({ x: one.x, y: under, w: one.w, h: one.bottom - under });
      }
      top = one.bottom + 12;
      lanes.push(one);
    }
    const lanesBottom = Math.max(model.form === 'lanes' ? top - 16 : 0, ...lanes.map((one) => one.bottom));
    // A span's piers run down to the line: no label crosses one.
    for (const one of lanes) {
      rects.push({ x: one.x - 1, y: one.y, w: 2, h: 10000 });
      if (one.span.b)
        rects.push({ x: one.x + one.w - 2, y: one.y, w: 4, h: 10000, ends: one.span.b.i, pier: true });
    }

    // Entries on the line. A widening and a turn of the rule would sooner stand above it, a narrowing
    // hang below; the entry that ends a span is labelled first, past the span's end. An entry on a
    // line of its own hangs below the axis, on that line.
    const free = items.filter((item) => !item.span && !item.hung && (!item.rail || aside(model, item)));
    const sizeOnLine = (item) =>
      aside(model, item) ? { w: sizeOf(item).w, h: sizeOf(item).h + SIDE } : sizeOf(item);
    const onLine = (spineY) =>
      fan(free, {
        x: xOf,
        size: sizeOnLine,
        prefers: (item) =>
          item.fam === 'narrow' ? 'down' : item.cls === 'rule' || item.fam === 'wide' ? 'up' : '',
        only: (item) =>
          aside(model, item) || lanes.some((one) => xs[item.i] > one.x && xs[item.i] < one.x + one.w)
            ? 'down'
            : '',
        forms: (item) => (aside(model, item) ? null : formsOf(item)),
        formCost,
        noFlip: (item) => !!item.ends,
        first: free.filter((item) => item.ends),
        min: 0,
        max: W,
        ok(side, left, sz, lvl, item) {
          if (side !== 'up') return true;
          const box = { x: left, y: spineY - STEM - lvl - sz.h, w: sz.w, h: sz.h };
          return (
            box.y >= PAD - 0.5 &&
            !rects.some((r) => r.y < spineY && hits(box, r, r.ends === item.i ? (r.pier ? -100 : -2) : 12))
          );
        },
      });
    // Where the line sits: under the spans, and as far under them as makes the whole plate shortest
    // (room above the line lets labels stand there that would otherwise stack below it), give or
    // take a row for each label kept off the side its move prefers.
    const least = lanes.length || model.form === 'lanes' ? lanesBottom + 20 : PAD + 12;
    let spineY = least,
      line = null,
      best = Infinity;
    for (let y = least; y <= least + 264; y += 12) {
      const tried = onLine(y);
      const total = y + (tried.downMost ? STEM + tried.downMost : 16) + tried.missed * 26;
      if (total < best - 0.5) {
        best = total;
        spineY = y;
        line = tried;
      }
    }
    for (const [i, at] of line.out) {
      const apart = aside(model, items[i]);
      const box = {
        x: at.left,
        y: (at.side === 'up' ? spineY - STEM - at.level - at.h : spineY + STEM + at.level) + (apart ? SIDE : 0),
        w: at.w,
        h: at.h - (apart ? SIDE : 0),
      };
      placed.set(i, {
        box,
        from: apart ? box.y + 11 : spineY,
        side: at.side,
        stemX: at.x,
        flip: at.flip,
        form: at.form,
        markY: apart ? box.y + 11 : undefined,
        apart,
      });
    }
    const height = Math.round(spineY + (line.downMost ? STEM + line.downMost : 20) + PAD);
    return { level, W, height, xs, geo, lanes, placed, spineY, tagOf, deckOf, railsAt, nameOf, X0 };
  }

  function layout(root, model) {
    const plate = root.querySelector('.v32db-plate');
    if (!plate) return;
    const W = plate.clientWidth;
    if (!W) return;
    const items = model.items;
    // As much as the plate can say while the account under it still opens in view: its date, its name
    // and the first lines of its note.
    const above =
      plate.getBoundingClientRect().top - inspector.getBoundingClientRect().top + inspector.scrollTop;
    const room = inspector.clientHeight - above;
    // Every label with its words may squeeze the account to its opening lines; a plate that has
    // already given words up leaves the account more. Where nothing fits, the fullest of the shortest.
    const heights = new Map();
    let level = 0;
    for (const one of [3, 2, 1]) {
      heights.set(one, arrange(plate, model, one, W).height);
      if (heights.get(one) <= Math.max(260, room - (one === 3 ? 176 : 240))) {
        level = one;
        break;
      }
    }
    if (!level) {
      const least = Math.min(...heights.values());
      level = [3, 2, 1].find((one) => heights.get(one) <= least + 24);
    }
    const plan = arrange(plate, model, level, W);
    const { height, xs, geo, lanes, placed, spineY, tagOf, deckOf, railsAt, nameOf, X0 } = plan;

    // Put everything where it goes.
    plate.style.height = height + 'px';
    for (const [i, at] of placed) {
      const el = tagOf.get(i);
      el.style.left = at.box.x + 'px';
      el.style.top = Math.round(at.box.y) + 'px';
      el.dataset.v32dbSide = at.side;
      el.classList.toggle('v32db-flip', !!at.flip);
      const small = el.classList.contains('v32db-small');
      el.classList.toggle('v32db-two', !!at.form && small);
      el.classList.toggle('v32db-bare', !!at.form && !small);
    }
    for (const one of lanes) {
      const el = deckOf.get(one.span.a.i);
      el.style.left = one.x + 'px';
      el.style.top = one.y + 'px';
      el.style.width = one.w + 'px';
      el.style.height = one.h + 'px';
      const said = el.querySelector('.v32db-deck-said');
      if (said?.dataset.rule) {
        said.textContent = said.dataset.rule;
        const line = said.parentElement;
        if (line.scrollWidth > line.clientWidth + 1) said.textContent = said.dataset.did;
      }
    }
    for (const one of railsAt) {
      const el = nameOf.get(one.rail.line.id);
      if (!el) continue;
      el.style.left = one.nameX + 'px';
      el.style.top = one.nameY + 'px';
    }

    // The ink: the line, its breaks and decade marks, the spans' piers, the named lines, each label's
    // stem, each mark.
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
    // With every entry on a named line the axis is the scale alone: its decades are numbered.
    if (model.form === 'lanes')
      for (const tick of geo.ticks)
        ink.push(
          `<text class="v32db-tick-year" x="${Math.round(tick.x)}" y="${spineY + 18}" text-anchor="middle">${tick.year}</text>`,
        );
    for (const one of railsAt)
      ink.push(
        `<path class="v32db-rail${one.rail.of ? ' v32db-rail-of' : ''}" d="M${one.x0} ${one.y}H${one.x1}"/>`,
      );
    for (const one of lanes) {
      const a = one.span.a,
        b = one.span.b;
      // The pier a span rests on at each end: from the beam to the line, at the entry's own date.
      ink.push(
        `<path class="v32db-pier v32db-f-${a.fam}${a.here ? ' v32db-is-here' : ''}" data-v32db-i="${a.i}" d="M${one.x + 0.5} ${one.y + one.h}V${spineY}"/>`,
        b
          ? `<path class="v32db-pier v32db-pier-end${b.here ? ' v32db-is-here' : ''}" data-v32db-i="${b.i}" d="M${one.x + one.w} ${one.y - 6}V${spineY}"/>`
          : '',
        `<g class="v32db-mark v32db-c-rule v32db-f-${a.fam}${a.here ? ' v32db-is-here' : ''}" data-v32db-i="${a.i}" transform="translate(${one.x - 9} ${spineY - 9})"><circle class="v32db-mark-bed" cx="9" cy="9" r="11"/><svg viewBox="0 0 16 16" width="18" height="18">${GLYPH[a.turn] || GLYPH.applies}</svg></g>`,
      );
    }
    const railY = new Map(railsAt.map((one) => [one.rail, one.y]));
    const markAt = (item, x, y) => {
      const r = { rule: 9, reach: 7, steady: 5.5, aside: 6 }[item.cls];
      return `<g class="v32db-mark v32db-c-${item.cls} v32db-f-${item.fam}${item.here ? ' v32db-is-here' : ''}" data-v32db-i="${item.i}" transform="translate(${x - r} ${y - r})"><circle class="v32db-mark-bed" cx="${r}" cy="${r}" r="${r + 2.5}"/><svg viewBox="0 0 16 16" width="${2 * r}" height="${2 * r}">${GLYPH[item.turn] || GLYPH.applies}</svg></g>`;
    };
    const plateBox = plate.getBoundingClientRect();
    for (const [i, at] of placed) {
      const item = items[i];
      const x = at.stemX + 0.5;
      const far = at.side === 'up' ? at.box.y : at.box.y + at.box.h;
      if (at.apart) {
        // A line of its own beside the axis: a short dashed rail through the entry's mark, open at both
        // ends, with the line's name lettered on it.
        const name = tagOf.get(i).querySelector('.v32db-rail-title > b')?.getBoundingClientRect();
        const y = at.markY;
        const a = name ? name.left - plateBox.left : at.stemX,
          b = name ? name.right - plateBox.left : at.stemX;
        // (It runs the width of the entry's label, a little past each end.)
        const l = Math.min(at.stemX, at.box.x) - 36,
          r = Math.max(at.stemX, at.box.x + at.box.w) + 12;
        const gaps = [
          [at.stemX - 11, at.stemX + 11],
          [a - 8, b + 8],
        ].sort((p, q) => p[0] - q[0]);
        let d = '',
          x0 = l;
        for (const [g0, g1] of gaps) {
          if (g0 > x0) d += `M${x0} ${y}H${g0}`;
          x0 = Math.max(x0, g1);
        }
        if (r > x0) d += `M${x0} ${y}H${r}`;
        ink.push(`<path class="v32db-siding" d="${d}"/>`, markAt(item, at.stemX, y));
        continue;
      }
      // The stem runs from the line (or the beam, or the entry's rail) along the label's edge.
      ink.push(
        `<path class="v32db-stem v32db-f-${item.fam}${item.here ? ' v32db-is-here' : ''}${item.hung ? ' v32db-hung' : ''}" data-v32db-i="${i}" d="M${x} ${at.from}V${far}"/>`,
      );
      if (item.hung)
        ink.push(
          `<circle class="v32db-knot v32db-f-${item.fam}" data-v32db-i="${i}" cx="${x}" cy="${at.from}" r="3"/>`,
        );
      else {
        const y = at.markY ?? spineY;
        // An entry on two lines is marked on both, the two marks joined.
        const also = item.rails.filter((rail) => rail !== item.rail && railY.has(rail));
        for (const rail of also)
          ink.push(
            `<path class="v32db-link" d="M${x} ${railY.get(rail)}V${y}"/>`,
            markAt(item, at.stemX, railY.get(rail)),
          );
        ink.push(markAt(item, at.stemX, y));
      }
    }
    const svg = plate.querySelector('.v32db-ink');
    svg.setAttribute('viewBox', `0 0 ${W} ${height}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', height);
    svg.innerHTML = ink.join('');
    plate.dataset.v32dbLaid = String(W);
    // The account does not say again what the selected entry's label says: it follows the plate's detail.
    state.shown = plan.level;
    if (state.sel >= 0 && root.querySelector('.v32db-account')?.firstElementChild) select(state.sel);
    else mark(root);
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
  // Another entry of the timeline, named beside the selected one: when, who, and one stored line about it.
  // (It goes by the name its label has on the plate, so the eye can find it there.)
  function rowHTML(item, words) {
    const name = item.short ? esc(item.short) : `<span class="v32db-caption">${captionHTML(item.first)}</span>`;
    return `<button type="button" class="v32db-row v32db-f-${item.fam}${item.here ? ' v32db-is-here' : ''}" data-v32db-i="${item.i}" title="Show ${esc(item.full)} (${esc(yearOf(item.s))})"><span class="v32db-row-top">${glyph(item.turn, 12)}${timeHTML(item.s, 'v32db-yr')}<span class="v32db-row-name">${name}</span></span><span class="v32db-row-words">${esc(words)}</span></button>`;
  }
  // Does the plate already say, on this entry's label, what the entry did?
  function saidOnPlate(item) {
    if (item.span) {
      const said = root?.querySelector(`.v32db-deck[data-v32db-i="${item.i}"] .v32db-deck-said`);
      return !!said && said.textContent === said.dataset.did;
    }
    const said = root?.querySelector(`.v32db-tag[data-v32db-i="${item.i}"] > .v32db-tag-fx`);
    return !!said && said.getClientRects().length > 0;
  }
  // What stands beside the selected entry. The space is used only for something worth learning that
  // the stored material supports, under a heading that names it:
  //   - what became of earlier entries: each earlier entry whose stored later development names this one;
  //   - what became of it: this entry's own later development, and the entry that made it if it is here;
  //   - a distinction, consequence or comparison stored with the entry (`bears.beside`: a heading, the
  //     Atlas's own sentences, where they come from, and sometimes another entry to compare).
  // Nothing is there because it is next in time, and the chart is not explained again in words. With
  // nothing to say the account is set on its own at full width.
  function besideHTML(model, item) {
    const parts = [];
    if (item.became.length)
      parts.push(
        `<section class="v32db-rel"><h4>What became of earlier entries</h4><div class="v32db-rows">${item.became.map((x) => rowHTML(x, x.s.fate)).join('')}</div></section>`,
      );
    if (item.s.fate)
      parts.push(
        `<section class="v32db-rel"><h4>What became of it</h4><p class="v32db-rel-said">${esc(item.s.fate)}</p>${item.later ? `<div class="v32db-rows">${rowHTML(item.later, item.later.words)}</div>` : ''}</section>`,
      );
    const beside = item.bears?.beside;
    if (beside?.text) {
      // A line whose name on the chart is not the source's own term gives both.
      const line = item.rail?.line;
      const term = line?.term
        ? `<p class="v32db-rel-line"><b>${esc(line.name)}</b> on the chart; the brief’s term is <b>${esc(line.term)}</b>.</p>`
        : '';
      parts.push(
        `<section class="v32db-rel"><h4>${esc(beside.heading)}</h4>${term}<p class="v32db-rel-said">${esc(beside.text)}</p>${beside.source ? `<p class="v32db-rel-source">${esc(beside.source)}</p>` : ''}</section>`,
      );
    }
    const other = beside?.compare && model.items.find((x) => (x.s.id || x.s.sup) === beside.compare.to);
    if (other)
      parts.push(
        `<section class="v32db-rel"><h4>${esc(beside.compare.heading)}</h4><p class="v32db-rel-said">${esc(beside.compare.why)}</p><div class="v32db-rows v32db-rows-note">${rowHTML(other, other.s.note || other.words)}</div></section>`,
      );
    return parts.join('');
  }
  // Where the entry's place on the chart comes from: kept within reach, never the headline.
  function sourceHTML(model, item) {
    const bears = item.bears;
    if (!bears?.basis) return '';
    const where = item.span
      ? `Sets ${item.span.short}`
      : item.ends
        ? `Ends ${item.ends.short}`
        : item.hung
          ? `Drawn on ${item.hung.short}`
          : item.rail
            ? `Drawn on ${item.rails.map((rail) => `“${rail.line.name}”`).join(' and ')}`
            : 'Drawn on the line';
    return `<details class="v32db-src"><summary>Source</summary><p><b>${esc(where)}.</b> ${esc(bears.basis)}</p><p class="v32db-rel-source">${esc(bears.source || '')}</p></details>`;
  }
  function accountHTML(model, index) {
    const items = model.items,
      item = items[index];
    if (!item) return '';
    const beside = besideHTML(model, item);
    const picture = art(item.artId, 'v32db-art-lg');
    const fx = saidOnPlate(item) ? '' : `<p class="v32db-sel-fx">${esc(item.words)}</p>`;
    return `<article class="v32db-sel v32db-f-${item.fam}${item.here ? ' v32db-is-here' : ''}${beside ? '' : ' v32db-sel-wide'}" data-v32db-i="${item.i}">
        <div class="v32db-sel-art">${picture}</div>
        <div class="v32db-sel-main">
          <p class="v32db-sel-top">${dateLine(item)}${item.here ? '<span class="v32db-here">You are here</span>' : ''}<span class="v32db-step"><button type="button" data-v32db-go="${index - 1}" aria-label="The entry before" title="The entry before (Left)"${index ? '' : ' disabled'}>${CHEVRON.replace('<svg', '<svg class="v32db-back"')}</button><span class="v32db-place">${index + 1} of ${items.length}</span><button type="button" data-v32db-go="${index + 1}" aria-label="The entry after" title="The entry after (Right)"${index < items.length - 1 ? '' : ' disabled'}>${CHEVRON}</button></span></p>
          ${nameHTML(item, 'h3', 'v32db-sel-name', true)}
          <div class="v32db-sel-text">
            <div>${fx}<p class="v32db-sel-note">${esc(item.s.note || '')}</p></div>
            ${item.s.context ? `<p class="v32db-sel-context">${esc(item.s.context)}</p>` : ''}
          </div>
          ${sourceHTML(model, item)}
        </div>
      </article>
      ${beside ? `<aside class="v32db-side" aria-label="How this entry relates to the others">${beside}</aside>` : ''}`;
  }

  /* ---------- every entry, in order ---------- */
  function unitHTML(item, model) {
    const s = item.s;
    const inSpan = model.spans.find(
      (span) => item.i >= span.a.i && item.i <= (span.b ? span.b.i : model.items.length - 1),
    );
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
          ${kindLine(item, (item.rail ? `<span class="v32db-authority">On ${esc(item.rails.map((rail) => rail.line.name + (rail.line.term ? ` (the brief’s term: ${rail.line.term})` : '')).join(' and '))}</span>` : '') + (item.here ? '<span class="v32db-here">You are here</span>' : ''))}
          ${nameHTML(item, 'h4', 'v32db-unit-name', true)}
          <p class="v32db-unit-fx">${esc(item.words)}</p>
          <p class="v32db-unit-note">${esc(s.note || '')}</p>
          ${s.context ? `<p class="v32db-unit-context">${esc(s.context)}</p>` : ''}
          ${s.fate ? `<p class="v32db-later"><b>Later development</b>${esc(s.fate)}</p>` : ''}
          ${sources ? `<p class="v32db-unit-sources">${sources}</p>` : ''}
        </div>
        <div class="v32db-unit-art">${art(item.artId, 'v32db-art-md')}</div>
      </li>`;
  }

  /* ---------- drawing ---------- */
  const state = { entry: null, line: 0, sel: -1, model: null, key: '', shown: 0 };
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
        seen.set(
          item.turn,
          ['overrules', 'displaces', 'extends', 'codifies', 'counterpoint'].includes(item.turn)
            ? P.TURN[item.turn]
            : item.kind,
        );
    const order = Object.keys(CLASS).filter((turn) => seen.has(turn));
    const groups = ['rule', 'reach', 'steady', 'aside']
      .map((cls) => {
        const list = order.filter((turn) => CLASS[turn] === cls);
        return list.length
          ? `<span class="v32db-key-group" title="${CLASS_WORDS[cls]}">${list.map((turn) => `<span class="v32db-key v32db-c-${cls} v32db-f-${P.FAMILY[turn] || 'steady'}" title="${esc(P.MEANS[turn] || '')}">${glyph(turn, { rule: 14, reach: 12, steady: 10, aside: 11 }[cls])}${esc(seen.get(turn))}</span>`).join('')}</span>`
          : '';
      })
      .join('');
    const closed = model.spans.some((one) => one.b),
      open = model.spans.some((one) => !one.b);
    const span = model.spans.length
      ? `<span class="v32db-key-group"><span class="v32db-key v32db-key-span" title="Drawn from the entry that set a rule to the entry that overruled or replaced it. An entry decided under the rule is drawn on it."><i></i>${closed ? 'A rule, from the entry that set it to the entry that ended it' : 'A rule, running on from the entry that set it'}${closed && open ? ', or running on' : ''}</span></span>`
      : '';
    // Named lines say what they are where they stand; only a case on two of them needs a word.
    const joined = model.items.some((item) => item.rails.length > 1)
      ? `<span class="v32db-key-group"><span class="v32db-key v32db-key-join"><svg viewBox="0 0 12 22" width="12" height="22" aria-hidden="true"><path d="M6 6v10"/><circle cx="6" cy="4" r="2.6"/><circle cx="6" cy="18" r="2.6"/></svg>One entry, marked on both lines it bears on</span></span>`
      : '';
    return groups + span + joined;
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
      </header>
      <div class="v32db-plate" role="group" aria-label="${esc(t.title)}: the timeline, drawn" tabindex="0" aria-describedby="v32dbHint">
        <svg class="v32db-ink" aria-hidden="true"></svg>
        ${model.spans.map(deckHTML).join('')}
        ${model.items
          .filter((item) => !item.span)
          .map((item) => tagHTML(item, model))
          .join('')}
        ${model.rails
          .filter((rail) => rail.of || model.form === 'lanes')
          .map(
            (rail) =>
              `<span class="v32db-lane-name${rail.of ? ' v32db-lane-of' : ''}" data-v32db-line="${esc(rail.line.id)}">${esc(rail.line.name)}</span>`,
          )
          .join('')}
      </div>
      <div class="v32db-under">
        <p class="v32db-legend">${legendHTML(model)}</p>
        <p class="v32db-vh" id="v32dbHint">${model.items.length} entries${range ? `, ${range}` : ''}. Select an entry on the drawing, or press the Left and Right keys.</p>
      </div>
      <section class="v32db-account" aria-live="polite" aria-label="The selected entry and how it relates to the others"></section>
      <section class="v32db-all" aria-label="Every entry, in order">
        <header class="v32db-all-head">
          <h3>Every entry, in order</h3>
          ${t.question ? `<p class="v32db-guide"><b>The question</b>${esc(t.question)}</p>` : ''}
          ${t.guide ? `<p class="v32db-guide"><b>How these entries connect</b>${esc(t.guide)}</p>` : ''}
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
    account.dataset.v32dbSide = account.querySelector('.v32db-side') ? '1' : '0';
    fitArt(account);
    mark(root);
    if (focus)
      root.querySelector(`.v32db-plate button[data-v32db-i="${index}"]`)?.focus({ preventScroll: true });
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
    const on = !inspector.hidden && !!body && !!id && window.DKLAReader?.current?.() === 'doctrine';
    const lines = on
      ? window.DKLATimelines.list().filter(
          (t) => t.steps.some((s) => s.id === id) && t.steps.filter(P.live).length > 1,
        )
      : [];
    const active = on && lines.length > 0;
    // (The reader's width changes with this class; the map behind it is not asked to fit itself again.)
    if (document.body.classList.contains('v32db-on') !== active)
      document.body.classList.toggle('v32db-on', active);
    if (!active) {
      masthead(null);
      if (!body) root = null;
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
      state.shown = 0;
      layout(root, state.model);
      select(state.sel);
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
    const pick = event.target.closest('.v32db-plate [data-v32db-i], .v32db-row[data-v32db-i]');
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
  const onFacet = () => redraw();
  document.addEventListener('dkla:facet', onFacet);
  window.addEventListener('hashchange', onFacet);

  // The reader is drawn again whenever the entry is, by layers before and after this one. The plate is
  // drawn once they have all finished: when the reader's own children have changed.
  const redraw = () => {
    try {
      draw();
    } catch (error) {
      console.error('doctrine-b', error);
    }
  };
  // (src/features/v25/reading.js puts the blocks in their tabs in a microtask of its own: this one follows it.)
  const renders = new MutationObserver(() => queueMicrotask(redraw));
  renders.observe(inspector, { childList: true, attributes: true, attributeFilter: ['hidden'] });
  window.DKLADoctrineB = {
    draw,
    select,
    model: () => state.model,
    held,
    destroy() {
      inspector.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('dkla:facet', onFacet);
      window.removeEventListener('hashchange', onFacet);
      sizes?.disconnect();
      renders.disconnect();
      document.body.classList.remove('v32db-on');
      inspector.querySelectorAll('.v32db, .v32db-mast').forEach((el) => el.remove());
    },
  };
  redraw();
})();
