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
     paragraph, and at least two plain words between two links.

   The same card also explains whole sentences in plain English (tools/cold-call/plain-sentences.json,
   embedded as the dklaColdCallPlain block): a listed sentence found in its paragraph gets a small
   marker right after its final punctuation, never inside a link. An entry whose sentence is not found
   is skipped here; tools/cold-call/check_reader.cjs reports it. */
(() => {
  'use strict';
  const root = typeof window === 'object' ? window : globalThis;
  if (root.DKLAColdCallGloss) return;
  const WORD = '\\p{L}\\p{N}_\\-';
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // A surface form as a pattern: any run of spaces matches any whitespace, and ' matches ’.
  const formPattern = (form) => escapeRe(form).replace(/ +/g, '\\s+').replace(/['’]/g, "['’]");
  const RUN = new RegExp(`^[${WORD}]+`, 'u');
  const WORD_CHAR = new RegExp(`^[${WORD}]$`, 'u');
  const firstRun = (s) => (s.match(RUN)?.[0] || '').toLowerCase();
  // Is the character starting at i, or the one ending just before i, part of a word?
  const wordStartsAt = (text, i) => {
    const c = text.codePointAt(i);
    return c !== undefined && WORD_CHAR.test(String.fromCodePoint(c));
  };
  const wordEndsAt = (text, i) => {
    const low = text.charCodeAt(i - 1),
      pair = low >= 0xdc00 && low <= 0xdfff && i > 1 ? text.codePointAt(i - 2) : undefined;
    return WORD_CHAR.test(String.fromCodePoint(pair !== undefined && pair > 0xffff ? pair : low));
  };
  /** The one-word capitalised terms whose name is a word of `title` (see begin()). */
  function titleTerms(g, title) {
    const own = new Set();
    if (!g || !title) return own;
    // The candidate names, listed once per table.
    g.names ||= g.forms.filter((f) => f.term.caps && !/\s/.test(f.form));
    // A plain ASCII name can only be in the title if the title's lowercase text holds it (no long s there,
    // as in annotate()), so no pattern is built for the thousands of names that are not in it.
    const lowered = title.toLowerCase(),
      quick = lowered.length === title.length && !lowered.includes('\u017f') ? lowered : null,
      // In a title of plain ASCII, any name must begin with its first word as lowercase text (`head`; a name
      // whose first word is not ASCII cannot be there at all).
      ascii = /^[\x00-\x7f]*$/.test(title) ? lowered : null;
    for (const f of g.names)
      if (
        !(quick !== null && f.simple && !quick.includes(f.form)) &&
        !(ascii !== null && !f.form.includes('\u017f') && !ascii.includes(f.head)) &&
        new RegExp(`(?<![${WORD}])${formPattern(f.form)}(?![${WORD}])`, 'iu').test(title)
      )
        own.add(f.term.key);
    return own;
  }
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
  // The table is compiled in steps (each yield is a place to pause), so the page can do it in the background
  // a few milliseconds at a time; compile() runs the same steps in one go.
  function compile(table) {
    const steps = compiling(table);
    for (;;) {
      const step = steps.next();
      if (step.done) return step.value;
    }
  }
  function* compiling(table) {
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
        // a term met in many accounts ("claim", "appeal"): it gives way when a paragraph has more terms than links
        common: raw.common === true,
        context: raw.context ? new RegExp(raw.context, 'i') : null,
        except: (raw.except || []).map((phrase) => {
          if (typeof phrase !== 'string' || phrase !== phrase.toLowerCase() || !phrase.trim())
            throw Error(raw.key + ': except phrases are lowercase text');
          // The pattern is built the first time it is needed: with thousands of terms, building every
          // Unicode pattern up front took over a second on the first account opened.
          return {
            re: null,
            // plain ASCII: found by comparing text where the paragraph has plain spacing (see excluded())
            simple: /^[a-z0-9 -]+$/.test(phrase.trim()) ? phrase.trim() : null,
            pattern: `(?<![${WORD}])${formPattern(phrase.trim())}(?![${WORD}])`,
            reach: phrase.trim().length + 8,
            head: phrase.trim().split(/[ '’]/)[0],
          };
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
          // the text up to the first space or apostrophe: a quick string test before the pattern
          head: form.split(/[ '’]/)[0],
          // the whole form, when it has no apostrophe: compared directly where the paragraph has plain spacing
          whole: /['’]/.test(form) ? null : form,
          // v3.2: a form of plain ASCII letters, digits, spaces and hyphens needs no pattern of its own where
          // the paragraph has plain spacing: the lowercase comparison already decides the letters, and one
          // shared test decides the character after it. Building a Unicode pattern per form (12,000 of them,
          // each on first use) was most of the wait when an account was opened.
          simple: /^[a-z0-9 -]+$/.test(form),
          run: firstRun(form),
          re: null, // built on first use, as for except phrases
          pattern: `${formPattern(form)}(?![${WORD}])`,
        });
      }
      terms.set(term.key, term);
      if (terms.size % 40 === 0) yield;
    }
    yield;
    // Longest form first, then alphabetically (no two forms are equal). Sorted one length at a time, so the
    // work can pause between lengths: the same order as one sort of the whole list.
    const byLength = new Map();
    for (const f of forms) {
      if (!byLength.has(f.form.length)) byLength.set(f.form.length, []);
      byLength.get(f.form.length).push(f);
    }
    forms.length = 0;
    for (const length of [...byLength.keys()].sort((a, b) => b - a)) {
      for (const f of byLength.get(length).sort((a, b) => (a.form < b.form ? -1 : 1))) forms.push(f);
      yield;
    }
    // Forms grouped by their first run of word characters. The text is scanned word by word and only
    // the forms that start with that word are tried, so the cost grows with the text, not the table
    // (one alternation of every form took a quarter of a second per long account with 700 terms).
    yield;
    const byRun = new Map();
    let grouped = 0;
    for (const f of forms) {
      if (!byRun.has(f.run)) byRun.set(f.run, []);
      byRun.get(f.run).push(f);
      if (++grouped % 500 === 0) yield;
    }
    yield;
    const words = forms.length ? new RegExp(`(?<![${WORD}])[${WORD}]+`, 'gu') : null;
    return { terms, forms, byRun, words, density, source: table.source || '' };
  }
  /** The links in one paragraph: [{ start, end, key }]. `seen` holds the keys already linked in this section. */
  function annotate(compiled, text, seen = new Set()) {
    const links = [];
    if (!compiled.words || !text) return links;
    const max = compiled.density.maxPerParagraph;
    let spans = null;
    // A lowercase copy for the quick string tests; not used if lowercasing changed the length.
    const lowered = text.toLowerCase(),
      lower = lowered.length === text.length ? lowered : null,
      // single plain spaces only: a form with spaces can then be compared as a string
      plainSpacing = lower !== null && !/\s\s|[^\S ]/.test(text),
      // An except phrase of plain ASCII is searched for as text when, besides, the paragraph has no long s
      // (ſ): the one character a case-blind pattern treats as an ASCII letter and lowercasing does not.
      foldSafe = plainSpacing && !lower.includes('\u017f');
    const sentenceAt = (i) => {
      spans ||= sentences(text);
      return spans.find(([a, b]) => i >= a && i < b) || [0, text.length];
    };
    // An except phrase that covers the match: only the few words around it are searched (with 6,000 terms,
    // searching the whole paragraph for each phrase made drawing several times slower).
    const excluded = (term, s, e) => {
      for (const x of term.except) {
        const { reach, head } = x;
        const from = Math.max(0, s - reach),
          to = Math.min(text.length, e + reach);
        if (lower && !lower.slice(from, to).includes(head)) continue;
        if (foldSafe && x.simple) {
          // v3.2: the same search as the pattern below, left to right over the same few words, without
          // building a pattern for the phrase (building them was most of the time spent marking an account).
          const phrase = x.simple;
          let covers = false;
          for (let i = from; ; ) {
            const a = lower.indexOf(phrase, i);
            if (a < 0 || a + phrase.length > to) break;
            const b = a + phrase.length;
            if ((a > from && wordEndsAt(text, a)) || (b < to && wordStartsAt(text, b))) {
              i = a + 1;
              continue;
            }
            if (a <= s && e <= b) {
              covers = true;
              break;
            }
            i = b;
          }
          if (covers) return true;
          continue;
        }
        const window = text.slice(from, to),
          re = (x.re ||= new RegExp(x.pattern, 'giu'));
        re.lastIndex = 0;
        for (const m of window.matchAll(re)) {
          const a = from + m.index;
          if (a <= s && e <= a + m[0].length) return true;
        }
      }
      return false;
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
    const words = compiled.words;
    words.lastIndex = 0;
    let m;
    const found = [],
      here = new Set();
    while ((m = words.exec(text))) {
      const s = m.index;
      const candidates = compiled.byRun.get(m[0].toLowerCase());
      if (!candidates) continue;
      let chosen = null;
      for (const f of candidates) {
        if (lower && !lower.startsWith(plainSpacing && f.whole ? f.whole : f.head, s)) continue;
        let end;
        if (plainSpacing && f.simple) {
          // The comparison above matched the whole form; only the character after it is left to check.
          end = s + f.form.length;
          const after = text.codePointAt(end);
          if (after !== undefined && WORD_CHAR.test(String.fromCodePoint(after))) continue;
        } else {
          f.re ||= new RegExp(f.pattern, 'iuy');
          f.re.lastIndex = s;
          const hit = f.re.exec(text);
          if (!hit) continue;
          end = s + hit[0].length;
        }
        if (fits(f.term, s, end)) {
          chosen = { term: f.term, end };
          break;
        }
      }
      if (!chosen) continue;
      words.lastIndex = chosen.end;
      const previous = found[found.length - 1];
      if (seen.has(chosen.term.key) || here.has(chosen.term.key)) continue;
      // Links never crowd each other: at least two plain words between two links ("removed the action"
      // links only "removed"; the next term gets the link instead).
      if (previous && (text.slice(previous.end, s).match(/[\p{L}\p{N}]+/gu) || []).length < 2) continue;
      found.push({ start: s, end: chosen.end, key: chosen.term.key, common: chosen.term.common });
      here.add(chosen.term.key);
    }
    // More terms than links: the less common terms first, then the common ones, each in reading order.
    const keep =
      found.length <= max
        ? found
        : [...found.filter((l) => !l.common), ...found.filter((l) => l.common)]
            .slice(0, max)
            .sort((a, b) => a.start - b.start);
    for (const l of keep) {
      links.push({ start: l.start, end: l.end, key: l.key });
      seen.add(l.key);
    }
    return links;
  }
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  /** Escaped HTML of one paragraph with its links wrapped and its plain-English markers inserted
      (marks: [{ start, end, id }] by position, from placeSentences()). A marker is never put inside a link. */
  function markup(text, links, marks = []) {
    let out = '',
      at = 0,
      k = 0;
    const upTo = (to) => {
      for (; k < marks.length && marks[k].end <= to; k++) {
        const { start, end, id } = marks[k];
        if (end > at) {
          out += esc(text.slice(at, end));
          at = end;
        }
        out += `<span class="cc-plain" role="button" tabindex="0" data-cc-plain="${esc(id)}" data-cc-plain-from="${start}" aria-label="In plain English" aria-haspopup="dialog" aria-expanded="false" aria-describedby="ccPlainDesc-${esc(id)}"></span>`;
      }
      if (to > at) out += esc(text.slice(at, to));
      at = Math.max(at, to);
    };
    for (const { start, end, key } of links) {
      upTo(start);
      out += `<span class="cc-term" role="button" tabindex="0" data-cc-term="${esc(key)}" aria-haspopup="dialog" aria-expanded="false" aria-describedby="ccGlossDesc-${esc(key)}">${esc(text.slice(start, end))}</span>`;
      at = end;
    }
    upTo(text.length);
    return out;
  }

  // ---- plain-English versions of whole sentences
  const AT = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*|followUp-answer)$/;
  // A listed sentence as a pattern: any run of whitespace matches any whitespace, and straight and curly
  // quotes match each other.
  const sentencePattern = (sentence) =>
    new RegExp(
      escapeRe(sentence).replace(/\s+/g, '\\s+').replace(/['‘’]/g, "['‘’]").replace(/["“”]/g, '["“”]'),
      'u',
    );
  function compilePlain(table) {
    const steps = compilingPlain(table);
    for (;;) {
      const step = steps.next();
      if (step.done) return step.value;
    }
  }
  function* compilingPlain(table) {
    if (!table || table.version !== 1 || !table.sentences || typeof table.sentences !== 'object')
      throw Error('Unknown plain-English table');
    const cases = new Map();
    for (const [caseId, list] of Object.entries(table.sentences)) {
      if (!Array.isArray(list)) throw Error(caseId + ': sentences are a list');
      const byAt = new Map();
      list.forEach((raw, n) => {
        const where = `${caseId} #${n + 1}`;
        if (!raw || typeof raw.at !== 'string' || !AT.test(raw.at)) throw Error(where + ': bad "at"');
        for (const field of ['sentence', 'plain'])
          if (typeof raw[field] !== 'string' || !raw[field].trim()) throw Error(`${where}: no ${field}`);
        const entry = { caseId, n, at: raw.at, sentence: raw.sentence.trim(), plain: raw.plain.trim() };
        if (!byAt.has(raw.at)) byAt.set(raw.at, []);
        byAt.get(raw.at).push(entry);
      });
      cases.set(caseId, byAt);
      if (cases.size % 20 === 0) yield;
    }
    return { cases, source: table.source || '' };
  }
  /** Where the listed sentences sit in one paragraph: [{ start, end, entry }] by position, `end` just after
      the sentence's final punctuation (and any closing quote or bracket). Entries whose sentence is not in
      the paragraph are left out; a marker that would fall inside one of `links` moves to that link's end. */
  function placeSentences(text, entries, links = []) {
    const marks = [];
    for (const entry of entries || []) {
      entry.re ||= sentencePattern(entry.sentence);
      const m = entry.re.exec(text);
      if (!m) continue;
      let end = m.index + m[0].length;
      end += text.slice(end).match(/^[.!?…]*["'”’)\]]*/)[0].length;
      for (const l of links) if (l.start < end && end < l.end) end = l.end;
      marks.push({ start: m.index, end, entry });
    }
    marks.sort((a, b) => a.end - b.end || a.start - b.start);
    return marks.filter((m, i) => !i || m.end !== marks[i - 1].end);
  }
  const LII = (slug) => 'https://www.law.cornell.edu/wex/' + encodeURIComponent(slug);

  // ---- the tables in the page, each compiled once on first use
  // The data loader (src/features/performance/data-loader.js). Until it is in the page, this stand-in reads
  // the embedded block, exactly as before.
  const DKLAData = root.DKLAData || {
    isLazy: () => false,
    loaded: () => true,
    json: async (id) =>
      JSON.parse((typeof document === 'object' && document.getElementById(id)?.textContent) || 'null'),
    text: async (id) => (typeof document === 'object' && document.getElementById(id)?.textContent) || '',
    whenLoaded: async () => {},
  };
  // get() is the compiled table, or false when it is unavailable. A block in the page is read on the first
  // get(). A block split out of the hosted page is false until load() has brought it (the reader awaits
  // load() before drawing an account), and a get() before then is not remembered as a failure.
  // v3.2: warm() compiles the table ahead of its first use, in the background and a few milliseconds at a time
  // (`steps` is the generator form of `read`). A get() that arrives while that is under way finishes it at once.
  const SLICE = 6;
  // An ordinary task each time: input and drawing come first, but it does not wait for an idle page (a slow
  // machine's page is never idle, and the tables would not be ready when the reader is first opened).
  const background = (fn) => {
    if (root.scheduler?.postTask) root.scheduler.postTask(fn, { priority: 'user-visible' }).catch(() => {});
    else setTimeout(fn, 0);
  };
  const stats = { slices: 0, longestSlice: 0, warmed: 0, finishedInOneGo: 0 };
  const embedded = (id, read, what, steps) => {
    let value = null,
      loading = null,
      job = null, // the compilation in progress
      waiting = []; // whoever waits for it to end
    const ended = () => {
      for (const resolve of waiting.splice(0)) resolve(value);
    };
    const finish = () => {
      if (!job) return;
      const steps = job;
      job = null;
      value = false;
      try {
        for (;;) {
          const step = steps.next();
          if (step.done) {
            value = step.value;
            break;
          }
        }
      } catch (error) {
        console.warn(what + ' are unavailable:', error);
      }
      stats.finishedInOneGo++;
      ended();
    };
    const pump = () =>
      background(() => {
        if (!job) return;
        const began = performance.now();
        try {
          for (;;) {
            const step = job.next();
            if (step.done) {
              value = step.value;
              job = null;
              stats.warmed++;
              break;
            }
            if (performance.now() - began >= SLICE) break;
          }
        } catch (error) {
          console.warn(what + ' are unavailable:', error);
          value = false;
          job = null;
        }
        stats.slices++;
        stats.longestSlice = Math.max(stats.longestSlice, Math.round((performance.now() - began) * 10) / 10);
        if (job) pump();
        else ended();
      });
    // Compile `data` in the background; resolves with the table (false when it cannot be compiled).
    const begin = (data) => {
      if (value !== null) return Promise.resolve(value);
      if (!job) {
        if (data == null || !steps || typeof performance !== 'object') return Promise.resolve(take(data));
        job = steps(data);
        pump();
      }
      return new Promise((resolve) => waiting.push(resolve));
    };
    const take = (data) => {
      if (job) finish();
      if (value !== null) return value;
      value = false;
      try {
        if (data != null) value = read(data);
      } catch (error) {
        console.warn(what + ' are unavailable:', error);
      }
      return value;
    };
    const get = () => {
      if (job) finish();
      if (value !== null) return value;
      if (DKLAData.isLazy(id)) return false;
      value = false;
      try {
        const block = typeof document === 'object' && document.getElementById(id);
        if (block) value = read(JSON.parse(block.textContent));
      } catch (error) {
        console.warn(what + ' are unavailable:', error);
      }
      return value;
    };
    get.ready = () => value !== null || !!job || !DKLAData.isLazy(id);
    // Resolves when the table is compiled, without ever compiling it in one go (a get() does that if it
    // arrives first).
    get.load = () => {
      if (value !== null) return Promise.resolve(value);
      loading ||= DKLAData.json(id).then(begin, (error) => {
        loading = null;
        throw error;
      });
      return loading;
    };
    // Compile ahead of use, when the table is in the page (or once it has arrived). Never fetches.
    get.warm = () => {
      if (value !== null || job || !steps || typeof document !== 'object' || DKLAData.isLazy(id)) return;
      background(() => {
        get.load().catch(() => {});
      });
    };
    return get;
  };
  const compiled = embedded('dklaColdCallGlossary', compile, 'Cold Call definitions', compiling);
  const plainTable = embedded('dklaColdCallPlain', compilePlain, 'Plain-English sentences', compilingPlain);
  // Both tables are compiled in the background once the atlas is shown, or when a table arrives after that.
  if (typeof document === 'object' && document.documentElement?.classList && root.MutationObserver) {
    const warm = () => {
      compiled.warm();
      plainTable.warm();
    };
    const html = document.documentElement;
    if (html.classList.contains('dkla-boot-ready')) warm();
    else {
      const watch = new root.MutationObserver(() => {
        if (!html.classList.contains('dkla-boot-ready')) return;
        watch.disconnect();
        warm();
      });
      watch.observe(html, { attributes: true, attributeFilter: ['class'] });
    }
    document.addEventListener('dkla:data', (event) => {
      if (!html.classList.contains('dkla-boot-ready')) return;
      if (event.detail?.id === 'dklaColdCallGlossary') compiled.warm();
      if (event.detail?.id === 'dklaColdCallPlain') plainTable.warm();
    });
  }
  // The plain-English entries drawn in the open account, by marker id.
  let shown = new Map();
  /** One rendering of one account: section() per episode, then descriptions() once. A section draws a
      paragraph with text(paragraph, at), or the parts the reader splits a long paragraph into with
      chunks(paragraph, at, parts) (each part has its own link budget). `at` names the paragraph as the
      plain-English table does: "<section>.<paragraph>" or "<section>.followUp-answer". */
  function begin(caseId, title = '') {
    const g = compiled(),
      plain = plainTable();
    if (!g && !plain) return null;
    // A name in the account's own title is a party here ("Garcia" in Garcia v. Hilton), not the other case
    // a one-word term of that name defines, so such terms never link in this account.
    const own = titleTerms(g, title);
    const used = new Set(),
      listed = (plain && plain.cases.get(caseId)) || null;
    shown = new Map();
    return {
      section() {
        const seen = new Set(own);
        const draw = (text, marks) => {
          const links = g ? annotate(g, text, seen) : [];
          for (const l of links) used.add(l.key);
          for (const m of marks) for (const l of links) if (l.start < m.end && m.end < l.end) m.end = l.end;
          return markup(text, links, marks);
        };
        const chunks = (text, at, parts = [text]) => {
          const found = listed ? placeSentences(text, listed.get(at)) : [];
          let cursor = 0;
          return parts.map((part) => {
            const from = found.length ? text.indexOf(part, cursor) : -1,
              marks = [];
            if (from >= 0) {
              cursor = from + part.length;
              // A sentence's marker goes in the part where the sentence ends.
              for (const m of found)
                if (m.end > from && m.end <= cursor) {
                  const id = 'p' + shown.size;
                  shown.set(id, m.entry);
                  marks.push({ start: Math.max(m.start, from) - from, end: m.end - from, id });
                }
            }
            return draw(part, marks);
          });
        };
        return { text: (text, at) => chunks(text, at)[0], chunks };
      },
      descriptions: () =>
        (used.size
          ? `<div class="cc-gloss-descs" hidden>${[...used].map((key) => `<span id="ccGlossDesc-${esc(key)}">${esc(g.terms.get(key).gloss)}</span>`).join('')}</div>`
          : '') +
        (shown.size
          ? `<div class="cc-plain-descs" hidden>${[...shown].map(([id, e]) => `<span id="ccPlainDesc-${esc(id)}">${esc(e.plain)}</span>`).join('')}</div>`
          : ''),
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
  const SHOW_DELAY = 120,
    HIDE_DELAY = 300;
  // What opens a card: a defined word (.cc-term) or a plain-English marker (.cc-plain).
  const termOf = (node) => {
    const term = typeof node?.closest === 'function' ? node.closest('.cc-term, .cc-plain') : null;
    return term?.dataset?.ccTerm || term?.dataset?.ccPlain ? term : null;
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
  const plainHTML = (entry) =>
    `<span class="cc-gloss-head" id="ccGlossHead">In plain English</span><span class="cc-gloss-text">${esc(entry.plain)}</span><span class="cc-gloss-note">Explains the narrative; not the court’s words.</span>`;
  /** The card for a trigger: { key, html } or null. */
  function contentOf(target) {
    if (target.dataset.ccPlain) {
      const entry = shown.get(target.dataset.ccPlain);
      return entry ? { key: 'plain-' + target.dataset.ccPlain, html: plainHTML(entry), plain: true } : null;
    }
    const g = compiled(),
      term = g && g.terms.get(target.dataset.ccTerm);
    return term ? { key: term.key, html: cardHTML(term) } : null;
  }
  // While a plain-English card is open, the sentence it explains is tinted (CSS Custom Highlight API; the
  // text and its links are not touched). Browsers without the API simply show no tint.
  const HIGHLIGHT = 'cc-plain';
  function tint(marker) {
    const highlights = root.CSS?.highlights;
    if (!highlights || typeof root.Highlight !== 'function') return;
    const paragraph = marker.closest('p'),
      from = +marker.dataset.ccPlainFrom;
    if (!paragraph || !(from >= 0)) return;
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.parentElement?.closest('.cc-gloss-card') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    const range = document.createRange();
    let seen = 0,
      node;
    while ((node = walker.nextNode())) {
      if (marker.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) break;
      if (seen + node.data.length > from) {
        range.setStart(node, from - seen);
        range.setEndBefore(marker);
        highlights.set(HIGHLIGHT, new root.Highlight(range));
        return;
      }
      seen += node.data.length;
    }
  }
  const untint = () => root.CSS?.highlights?.delete?.(HIGHLIGHT);
  function open(target, how) {
    const content = contentOf(target);
    if (!content) return;
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
    card.dataset.ccGlossFor = content.key;
    if (content.plain) card.classList.add('cc-plain-card');
    card.innerHTML = content.html;
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
    if (content.plain && card) tint(target);
    requestAnimationFrame(() => card?.classList.add('is-in'));
  }
  function close(restoreFocus) {
    clearTimers();
    if (!card) return false;
    untint();
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
    /** For the checks: how the background compilation went ({ slices, longestSlice, warmed }). */
    warmStats: stats,
    /** True when both tables can be read now (in the page, or already brought by load()). */
    ready: () => compiled.ready() && plainTable.ready(),
    /** Brings both tables if they were split out of the page; resolves when begin() can use them. */
    load: () => Promise.all([compiled.load(), plainTable.load()]).then(() => {}),
    compilePlain,
    placeSentences,
    titleTerms,
    plainTable: () => plainTable() || null,
    /** The plain-English entries drawn in the open account: [{ id, caseId, n (its place in the table), at, sentence, plain }]. */
    plainShown: () =>
      [...shown].map(([id, { caseId, n, at, sentence, plain }]) => ({ id, caseId, n, at, sentence, plain })),
  };
  if (typeof module === 'object' && module.exports) module.exports = root.DKLAColdCallGloss;
})();
