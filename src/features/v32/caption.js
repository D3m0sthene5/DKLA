/* Case captions, composed (docs/DESIGN.md, "Editorial standard": compose the lines).

   A caption breaks only between its parties, before "v.", never inside a party name the measure can hold and
   never leaving "v." at the end of a line; consolidated cases sit one per line with the second subordinate;
   a stage or source note ("— settlement appeal", "(Chenery II)") is a line of its own under the caption.
   Nothing here is a hard-coded break: the title is split into its parts and the styles (.cap-* in
   src/features/cold-call/reader.css) let each party stay whole. The text is never changed: the words of the
   composed caption, read in order, are the title.

     DKLACaption.parse(title)  { cases: [{ first, v, second }], joins: ['; '], note: { sep, text } | null }
     DKLACaption.html(title)   the caption for a heading: one block per case, each party kept whole
     DKLACaption.inline(title) the caption for one line of a list: "v." and the note are marked, nothing else
     DKLACaption.year(cite)    the year a citation gives ("552 F.2d 1228 (7th Cir. 1977)" gives "1977"), or ''

   Pure and deterministic; tools/v32/caption.test.mjs runs this same file over every Cold Call title. */
(() => {
  'use strict';
  const root = typeof window === 'object' ? window : globalThis;
  if (root.DKLACaption) return;
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  // "v." between two parties (lowercase only: "Mark V Corp." is a name).
  const VERSUS = /\s+(v\.?|vs\.?)\s+/;
  const split = (text) => {
    const m = VERSUS.exec(text);
    return m
      ? { first: text.slice(0, m.index), v: m[1], second: text.slice(m.index + m[0].length) }
      : { first: text, v: '', second: '' };
  };
  function parse(title) {
    let text = String(title ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    // A note set off by a dash ("Marrese v. American Academy — Seventh Circuit stage"), or one in brackets
    // after the whole caption ("SEC v. Chenery Corp. (Chenery II)"). Brackets inside a name stay in the name.
    let note = null,
      m = /^(.+?)(\s[—–]\s)(.+)$/.exec(text);
    if (!m) m = /^(.+\S)(\s)(\([^()]+\))$/.exec(text);
    if (m) {
      note = { sep: m[2], text: m[3] };
      text = m[1];
    }
    // Consolidated cases: "A v. B; C v. D" and "A v. B, with C v. D", when what stands on each side is a caption.
    const cases = [],
      joins = [];
    for (;;) {
      const j = /;\s+|,\s+with\s+/.exec(text);
      if (!j) break;
      const head = text.slice(0, j.index),
        tail = text.slice(j.index + j[0].length);
      if (!VERSUS.test(head) || !VERSUS.test(tail)) break;
      cases.push(split(head));
      joins.push(j[0]);
      text = tail;
    }
    cases.push(split(text));
    return { cases, joins, note };
  }
  // "v." never ends a line: it is tied to the first word of the party it introduces.
  const versus = (c) => {
    const gap = c.second.indexOf(' '),
      word = gap < 0 ? c.second : c.second.slice(0, gap),
      rest = gap < 0 ? '' : c.second.slice(gap);
    return `<span class="cap-tie"><span class="cap-v">${esc(c.v)}</span> ${esc(word)}</span>${esc(rest)}`;
  };
  function html(title) {
    const { cases, joins, note } = parse(title);
    let out = '';
    cases.forEach((c, i) => {
      // A join is read (by a screen reader, by a copy) but not drawn: the line break says it. "with" is drawn.
      if (i) {
        const join = joins[i - 1],
          word = /with/.test(join);
        out += `<span class="cap-read">${esc(word ? join.replace(/with\s+$/, '') : join)}</span>`;
        out += `<span class="cap-case cap-sub">${word ? '<span class="cap-with">with </span>' : ''}`;
      } else out += '<span class="cap-case">';
      out += `<span class="cap-party">${esc(c.first)}</span>`;
      if (c.v) out += ` <span class="cap-party">${versus(c)}</span>`;
      out += '</span>';
    });
    if (note)
      out += `<span class="cap-read">${esc(note.sep)}</span><span class="cap-note">${esc(note.text)}</span>`;
    return out;
  }
  function inline(title) {
    const { cases, joins, note } = parse(title);
    let out = '';
    cases.forEach((c, i) => {
      if (i) out += esc(joins[i - 1]);
      out += esc(c.first);
      if (c.v) out += ` <span class="cap-v">${esc(c.v)}</span> ${esc(c.second)}`;
    });
    if (note) out += `<span class="cap-note">${esc(note.sep + note.text)}</span>`;
    return out;
  }
  const YEAR = '(1[5-9]\\d\\d|20\\d\\d)';
  const BARE = new RegExp('(?<![\\d-])' + YEAR + '(?![\\d-])');
  const CLOSING = new RegExp('(?<![\\d-])' + YEAR + '\\s*[)\\]]');
  const DATED = new RegExp(
    '(?:January|February|March|April|May|June|July|August|September|October|November|December|' +
      'Jan\\.|Feb\\.|Mar\\.|Apr\\.|Aug\\.|Sept?\\.|Oct\\.|Nov\\.|Dec\\.)\\s*\\d{1,2},\\s*' +
      YEAR,
  );
  const NEUTRAL = new RegExp('^' + YEAR + '\\s+[A-Z]|(?<![\\d-])' + YEAR + '-Ohio-');
  function year(citation) {
    const text = String(citation ?? '');
    // The year a reporter citation gives in brackets: "(7th Cir. 1977)", "[1919] 2 K.B. 571", "(1884) 9 App. Cas.".
    for (const group of text.matchAll(/[(\[]([^()\[\]]*)[)\]]/g)) {
      const y = BARE.exec(group[1]);
      if (y) return y[1];
    }
    // "(Tex. App.—Houston [1st Dist.] 1987)"; a dated decision, "July 18, 1616"; a citation that begins with
    // its year, "2022 WY 54", or carries it as Ohio's does, "2004-Ohio-786".
    const y = CLOSING.exec(text) || DATED.exec(text) || NEUTRAL.exec(text);
    return y ? y[1] || y[2] : '';
  }
  root.DKLACaption = { parse, html, inline, year };
  if (typeof module === 'object' && module.exports) module.exports = root.DKLACaption;
})();
