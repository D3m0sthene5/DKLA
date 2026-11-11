/* Cold Call definitions: Wikipedia-style links on legal jargon in the Cold Call reader.
   The term table (tools/cold-call/glossary-terms.json, embedded as the dklaColdCallGlossary block)
   says which words link and what they mean. Narrative text is never changed: matched words are
   wrapped at render time, so a narrative revision never breaks a link.

   The matcher (compile, annotate) is pure and deterministic; tools/cold-call/glossary.test.mjs and
   check_reader.cjs run this same file. Rules:
   - each surface form matches case-insensitively as a whole word; the longest form wins; no overlaps;
   - a capitalised match in mid-sentence is skipped unless the term allows it (caps: true), so names
     such as "Federal Rules" stay plain; a capital at the start of a sentence is fine;
   - a term's context pattern must occur in the same sentence, and its except phrases never link;
   - only the first occurrence of each term per section links, at most maxPerParagraph links per
     paragraph, and never two links back to back. */
(() => {
  'use strict';
  const root = typeof window === 'object' ? window : globalThis;
  if (root.DKLAColdCallGloss) return;
  const WORD = '\\p{L}\\p{N}_\\-';
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // A surface form as a pattern: any run of spaces matches any whitespace, and ' matches ’.
  const formPattern = (form) => escapeRe(form).replace(/ +/g, '\\s+').replace(/['’]/g, "['’]");
  const firstWord = (s) => s.split(/\s+/)[0].toLowerCase().replace(/’/g, "'");
  const ABBREVIATIONS = new Set(
    (
      'v vs Inc Co Corp Ltd No Nos Mr Mrs Ms Dr St Jr Sr Id Cir App Supp Ct Stat Fed Civ Proc Art Sec Ch Cl ' +
      'Gen Gov Rep Sen Hon Ry R P F Cal Mass Ill Pa Ga Va Ky Tenn Wis Mich Minn Conn Del Md Tex Fla Ala Ark ' +
      'Colo Kan Neb Nev Okla Ore Wash Wyo Mo Miss La Me Vt Ariz Ind Jan Feb Mar Apr Aug Sept Sep Oct Nov Dec ' +
      "Dept Bros Mfg Assn Ass’n Ass'n Am Nat Int Rev Ed Eng Ann Comp Pub Res Reg Bd Comm Comm’n Dist Div " +
      'cf e.g i.e n nn p pp ch cl art sec'
    ).split(' '),
  );
  /** Sentence spans [start, end) of a paragraph. Deterministic; approximate around abbreviations. */
  function sentences(text) {
    const spans = [];
    let start = 0;
    const end = /[.!?]+["'”’)\]]*(?=\s+(\S)|$)/g;
    let m;
    while ((m = end.exec(text))) {
      const next = m[1];
      if (next && /\p{Ll}/u.test(next)) continue; // "e.g. the court": no new sentence
      const before = text.slice(start, m.index).match(/(\S+)$/);
      const token = before ? before[1].replace(/^["'“‘(\[]+/, '') : '';
      if (m[0][0] === '.' && token) {
        // U.S., N.Y., S.Ct., a single initial, or a listed abbreviation before the full stop.
        if (/^(?:\p{L}{1,4}\.)+\p{L}{0,3}$/u.test(token + '.') && /\./.test(token)) continue;
        if (/^\p{Lu}$/u.test(token) || ABBREVIATIONS.has(token)) continue;
        if (/^\d+$/.test(token) && next && /\d/.test(next)) continue;
      }
      const stop = m.index + m[0].length;
      spans.push([start, stop]);
      start = stop;
    }
    if (start < text.length) spans.push([start, text.length]);
    return spans;
  }
  function compile(table) {
    if (!table || table.version !== 1 || !Array.isArray(table.terms)) throw Error('Unknown glossary table');
    const density = Object.assign({ perSection: 1, maxPerParagraph: 3 }, table.density);
    if (density.perSection !== 1) throw Error('Only perSection: 1 is supported');
    const terms = new Map(),
      forms = [],
      owner = new Map();
    for (const raw of table.terms) {
      if (!raw || typeof raw.key !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.key))
        throw Error('Bad term key: ' + JSON.stringify(raw?.key));
      if (terms.has(raw.key)) throw Error('Duplicate term key: ' + raw.key);
      if (typeof raw.label !== 'string' || !raw.label.trim()) throw Error(raw.key + ': no label');
      if (typeof raw.gloss !== 'string' || !raw.gloss.trim()) throw Error(raw.key + ': no gloss');
      if (raw.wex != null && (typeof raw.wex !== 'string' || !/^[\w().,'-]+$/.test(raw.wex)))
        throw Error(raw.key + ': bad wex slug');
      if (!Array.isArray(raw.match) || !raw.match.length) throw Error(raw.key + ': no match forms');
      const term = {
        key: raw.key,
        label: raw.label,
        gloss: raw.gloss,
        wex: raw.wex || null,
        caps: raw.caps === true,
        context: raw.context ? new RegExp(raw.context, 'i') : null,
        except: (raw.except || []).map((phrase) => {
          if (typeof phrase !== 'string' || phrase !== phrase.toLowerCase() || !phrase.trim())
            throw Error(raw.key + ': except phrases are lowercase text');
          return new RegExp(`(?<![${WORD}])${formPattern(phrase.trim())}(?![${WORD}])`, 'giu');
        }),
      };
      for (const form of raw.match) {
        if (typeof form !== 'string' || form !== form.toLowerCase() || form !== form.trim() || !form)
          throw Error(raw.key + ': match forms are lowercase and trimmed: ' + JSON.stringify(form));
        if (owner.has(form)) throw Error(`"${form}" belongs to both ${owner.get(form)} and ${raw.key}`);
        owner.set(form, raw.key);
        forms.push({
          form,
          term,
          first: firstWord(form),
          re: new RegExp(`${formPattern(form)}(?![${WORD}])`, 'iuy'),
        });
      }
      terms.set(term.key, term);
    }
    forms.sort((a, b) => b.form.length - a.form.length || (a.form < b.form ? -1 : 1));
    const byFirst = new Map();
    for (const f of forms) {
      if (!byFirst.has(f.first)) byFirst.set(f.first, []);
      byFirst.get(f.first).push(f);
    }
    const any = forms.length
      ? new RegExp(`(?<![${WORD}])(?:${forms.map((f) => formPattern(f.form)).join('|')})(?![${WORD}])`, 'giu')
      : null;
    return { terms, forms, byFirst, any, density, source: table.source || '' };
  }
  /** The links in one paragraph: [{ start, end, key }]. `seen` holds the keys already linked in this section. */
  function annotate(compiled, text, seen = new Set()) {
    const links = [];
    if (!compiled.any || !text) return links;
    const max = compiled.density.maxPerParagraph;
    let spans = null,
      excepts = null;
    const sentenceAt = (i) => {
      spans ||= sentences(text);
      return spans.find(([a, b]) => i >= a && i < b) || [0, text.length];
    };
    const excluded = (term, s, e) => {
      if (!term.except.length) return false;
      excepts ||= new Map();
      if (!excepts.has(term.key)) {
        const found = [];
        for (const re of term.except) {
          re.lastIndex = 0;
          for (const m of text.matchAll(re)) found.push([m.index, m.index + m[0].length]);
        }
        excepts.set(term.key, found);
      }
      return excepts.get(term.key).some(([a, b]) => a <= s && e <= b);
    };
    const fits = (term, s, e) => {
      const [a, b] = sentenceAt(s);
      const matched = text.slice(s, e);
      if (!term.caps && /\p{Lu}/u.test(matched)) {
        const initial = /^[\s"'“‘(\[—–-]*$/.test(text.slice(a, s));
        if (!initial || /\p{Lu}/u.test(matched.slice(1))) return false;
      }
      if (term.context && !term.context.test(text.slice(a, b))) return false;
      return !excluded(term, s, e);
    };
    const any = compiled.any;
    any.lastIndex = 0;
    let m;
    while (links.length < max && (m = any.exec(text))) {
      const s = m.index;
      let chosen = null;
      for (const f of compiled.byFirst.get(firstWord(m[0])) || []) {
        f.re.lastIndex = s;
        const hit = f.re.exec(text);
        if (hit && fits(f.term, s, s + hit[0].length)) {
          chosen = { term: f.term, end: s + hit[0].length };
          break;
        }
      }
      if (!chosen) {
        any.lastIndex = s + 1;
        continue;
      }
      any.lastIndex = chosen.end;
      const previous = links[links.length - 1];
      if (seen.has(chosen.term.key)) continue;
      if (previous && /^[\s\p{P}\p{S}]*$/u.test(text.slice(previous.end, s))) continue;
      links.push({ start: s, end: chosen.end, key: chosen.term.key });
      seen.add(chosen.term.key);
    }
    return links;
  }
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  /** Escaped HTML of one paragraph with its links wrapped. */
  function markup(text, links) {
    let out = '',
      at = 0;
    for (const { start, end, key } of links) {
      out +=
        esc(text.slice(at, start)) +
        `<span class="cc-term" role="button" tabindex="0" data-cc-term="${esc(key)}" aria-haspopup="dialog" aria-expanded="false" aria-describedby="ccGlossDesc-${esc(key)}">${esc(text.slice(start, end))}</span>`;
      at = end;
    }
    return out + esc(text.slice(at));
  }
  const LII = (slug) => 'https://www.law.cornell.edu/wex/' + encodeURIComponent(slug);

  // ---- the table embedded in the page, compiled once on first use
  let table = null;
  function compiled() {
    if (table !== null) return table;
    table = false;
    try {
      const block = typeof document === 'object' && document.getElementById('dklaColdCallGlossary');
      if (block) table = compile(JSON.parse(block.textContent));
    } catch (error) {
      console.warn('Cold Call definitions are unavailable:', error);
    }
    return table;
  }
  /** One rendering of one account: section() per episode, then descriptions() once. */
  function begin() {
    const g = compiled();
    if (!g) return null;
    const used = new Set();
    return {
      section() {
        const seen = new Set();
        return (text) => {
          const links = annotate(g, text, seen);
          for (const l of links) used.add(l.key);
          return markup(text, links);
        };
      },
      descriptions: () =>
        used.size
          ? `<div class="cc-gloss-descs" hidden>${[...used].map((key) => `<span id="ccGlossDesc-${esc(key)}">${esc(g.terms.get(key).gloss)}</span>`).join('')}</div>`
          : '',
    };
  }

  // ---- the card: one at a time, hover (after a short delay), focus, tap or click
  let dialog = null,
    card = null,
    trigger = null,
    pinned = false,
    showTimer = 0,
    hideTimer = 0,
    frame = 0,
    keyboard = false,
    lastPointer = null,
    swallowCancel = false,
    restoring = false;
  const SHOW_DELAY = 250,
    HIDE_DELAY = 300;
  const termOf = (node) => {
    const term = typeof node?.closest === 'function' ? node.closest('.cc-term') : null;
    return term?.dataset?.ccTerm ? term : null;
  };
  const inCard = (node) => !!(card && node && card.contains(node));
  const clearTimers = () => {
    if (showTimer) clearTimeout(showTimer);
    if (hideTimer) clearTimeout(hideTimer);
    showTimer = hideTimer = 0;
  };
  function cardHTML(term) {
    const dictionary = term.wex && root.DKLA?.hasTerm?.(term.wex) && typeof root.DKLA.openTerm === 'function';
    const links = [
      term.wex
        ? `<a href="${esc(LII(term.wex))}" target="_blank" rel="noopener noreferrer">Cornell LII Wex <span aria-hidden="true">↗</span><span class="cc-sr"> (opens a new tab)</span></a>`
        : '',
      dictionary
        ? `<button type="button" data-cc-gloss-dictionary="${esc(term.wex)}">In the DKLA dictionary</button>`
        : '',
    ].join('');
    return `<span class="cc-gloss-head" id="ccGlossHead">${esc(term.label)}</span><span class="cc-gloss-text">${esc(term.gloss)}</span>${links ? `<span class="cc-gloss-links">${links}</span>` : ''}`;
  }
  function open(target, how) {
    const g = compiled(),
      term = g && g.terms.get(target.dataset.ccTerm);
    if (!term) return;
    clearTimers();
    if (trigger === target && card?.isConnected) {
      if (how === 'pin') pinned = true;
      return;
    }
    close(false);
    trigger = target;
    pinned = how === 'pin';
    card = document.createElement('span');
    card.className = 'cc-gloss-card';
    card.id = 'ccGlossCard';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-labelledby', 'ccGlossHead');
    // Focusable by a click or tap only: a click on the card's text keeps focus inside the card, so the card
    // stays open (focus would otherwise fall to the reader and close it). Tab still goes word, then links.
    card.tabIndex = -1;
    card.dataset.ccGlossFor = term.key;
    card.innerHTML = cardHTML(term);
    // Directly after its word, so Tab moves from the word into the card's links.
    target.after(card);
    target.setAttribute('aria-expanded', 'true');
    target.setAttribute('aria-controls', 'ccGlossCard');
    const rects = [...target.getClientRects()];
    let line = 0;
    if (lastPointer && how !== 'focus')
      line = Math.max(
        0,
        rects.findIndex((r) => lastPointer.y >= r.top - 2 && lastPointer.y <= r.bottom + 2),
      );
    card.dataset.line = String(line);
    place();
    requestAnimationFrame(() => card?.classList.add('is-in'));
  }
  function close(restoreFocus) {
    clearTimers();
    if (!card) return false;
    const was = trigger,
      old = card,
      hadFocus = inCard(document.activeElement);
    card = null;
    trigger = null;
    pinned = false;
    if (was) {
      was.setAttribute('aria-expanded', 'false');
      was.removeAttribute('aria-controls');
      // Return focus before the card goes, so focus never falls back to the page.
      if ((restoreFocus || hadFocus) && was.isConnected) {
        restoring = true;
        was.focus({ preventScroll: true });
        restoring = false;
      }
    }
    old.remove();
    return true;
  }
  /** Fixed position below the word (above when there is no room), inside the visible screen. A phrase
      that wraps onto two lines is cleared as a whole: below its last line or above its first. */
  function place() {
    if (!card || !trigger) return;
    const rects = [...trigger.getClientRects()].filter((r) => r.width || r.height);
    const rect = rects[Math.min(+card.dataset.line || 0, rects.length - 1)];
    const scroller = trigger.closest('#ccScroll');
    const box = scroller?.getBoundingClientRect();
    if (!rect || (box && (rect.bottom < box.top || rect.top > box.bottom))) {
      close(false);
      return;
    }
    const first = Math.min(...rects.map((r) => r.top)),
      last = Math.max(...rects.map((r) => r.bottom));
    const vv = root.visualViewport;
    const left0 = vv ? vv.offsetLeft : 0,
      top0 = vv ? vv.offsetTop : 0,
      width = vv ? vv.width : document.documentElement.clientWidth,
      height = vv ? vv.height : innerHeight;
    const gap = 8,
      margin = 10;
    const w = Math.min(340, width - 2 * margin);
    card.style.width = w + 'px';
    card.style.maxHeight = '';
    const h = card.offsetHeight;
    const below = top0 + height - margin - (last + gap),
      above = first - gap - (top0 + margin),
      room = Math.max(0, height - 2 * margin);
    let top;
    if (h <= below || below >= above) {
      top = last + gap;
      if (h > below) card.style.maxHeight = Math.max(Math.min(80, room), below) + 'px';
    } else {
      const fit = Math.min(h, above);
      if (h > above) card.style.maxHeight = Math.max(Math.min(80, room), above) + 'px';
      top = first - gap - fit;
    }
    // However short the visible screen (a phone on its side with the keyboard up, a pinch-zoomed page),
    // the card stays inside it, even if it then has to cover part of its word.
    top = Math.max(top0 + margin, Math.min(top, top0 + height - margin - card.offsetHeight));
    const left = Math.min(Math.max(rect.left, left0 + margin), left0 + width - margin - w);
    card.style.left = Math.round(left) + 'px';
    card.style.top = Math.round(top) + 'px';
    card.dataset.side = top >= last ? 'below' : 'above';
  }
  const follow = () => {
    if (frame || !card) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      place();
    });
  };
  function attach(target) {
    if (dialog) return;
    dialog = target;
    document.addEventListener('keydown', () => (keyboard = true), true);
    document.addEventListener(
      'pointerdown',
      (event) => {
        keyboard = false;
        lastPointer = { x: event.clientX, y: event.clientY };
        if (card && !inCard(event.target) && termOf(event.target) !== trigger) close(false);
      },
      true,
    );
    dialog.addEventListener('pointerover', (event) => {
      if (event.pointerType === 'touch') return;
      lastPointer = { x: event.clientX, y: event.clientY };
      const term = termOf(event.target);
      if (term || inCard(event.target)) clearTimeout(hideTimer);
      if (term && term !== trigger) {
        clearTimeout(showTimer);
        showTimer = setTimeout(() => open(term, 'hover'), SHOW_DELAY);
      }
    });
    dialog.addEventListener('pointerout', (event) => {
      if (event.pointerType === 'touch') return;
      const from = termOf(event.target) || (inCard(event.target) ? card : null);
      if (!from) return;
      const to = event.relatedTarget;
      if (to && (inCard(to) || (termOf(to) && termOf(to) === termOf(event.target)))) return;
      clearTimeout(showTimer);
      if (card && !pinned && !inCard(document.activeElement) && document.activeElement !== trigger)
        hideTimer = setTimeout(() => close(false), HIDE_DELAY);
    });
    dialog.addEventListener('click', (event) => {
      const term = termOf(event.target);
      const dictionary = event.target.closest?.('[data-cc-gloss-dictionary]');
      if (dictionary?.dataset?.ccGlossDictionary) {
        const slug = dictionary.dataset.ccGlossDictionary;
        close(true);
        root.DKLA?.openTerm?.(slug);
        return;
      }
      if (!term) return;
      if (trigger === term && card && pinned) close(false);
      else open(term, 'pin');
    });
    dialog.addEventListener('keydown', (event) => {
      const term = termOf(event.target);
      if (event.key === 'Escape' && card) {
        event.preventDefault();
        // Focus goes back to the word only if it was on the word or in its card (a card opened by hovering
        // must not pull focus from wherever the reader had it).
        close(inCard(document.activeElement) || document.activeElement === trigger);
        swallowCancel = true;
        setTimeout(() => (swallowCancel = false), 0);
        return;
      }
      if (term && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        if (trigger === term && card && pinned) close(false);
        else open(term, 'pin');
      }
    });
    dialog.addEventListener('focusin', (event) => {
      const term = termOf(event.target);
      if (term && keyboard && !restoring && term !== trigger) open(term, 'focus');
    });
    dialog.addEventListener('focusout', (event) => {
      if (!card) return;
      const from = event.target;
      if (from !== trigger && !inCard(from)) return;
      const to = event.relatedTarget;
      if (to && (to === trigger || inCard(to))) return;
      // Focus left the word and its card (Tab onward, or a click elsewhere).
      if (to || keyboard) close(false);
    });
    dialog.addEventListener('scroll', follow, { capture: true, passive: true });
    root.addEventListener?.('resize', follow);
    root.visualViewport?.addEventListener('resize', follow);
    root.visualViewport?.addEventListener('scroll', follow);
  }
  root.DKLAColdCallGloss = {
    compile,
    annotate,
    sentences,
    markup,
    begin,
    attach,
    /** Close the open card; true when there was one. The reader calls this on Escape and on close. */
    close: () => close(false),
    /** True right after Escape closed a card, so the reader does not also close. */
    tookEscape: () => swallowCancel || !!card,
    table: () => compiled() || null,
  };
  if (typeof module === 'object' && module.exports) module.exports = root.DKLAColdCallGloss;
})();
