/* Authored Cold Call narratives. Display only: graph, briefs and source prose stay untouched.

   v3.2 (docs/PHILOSOPHY.md, principle 5: recall before reveal). An account is shown as what a student needs
   when called on, in order:

   - the setup: the composed caption, the citation, the case's pictogram, the two-sentence `lead`, the cast
     (`actors`) and how the case reached this court (`proceedings`);
   - the episodes, each under its `cue`, the question or prompt a professor would open with;
   - the end: what the case does not decide (`limits`), the sources, and the ways out.

   Two ways through it, one switch (remembered in this browser under MODE_KEY, which is not saved work):
   Read shows everything, each prompt above its episode; Rehearse shows one prompt at a time with the
   narration under a pane of frost until asked for. DEFAULT_MODE is the one line that says which a first
   visit gets.

   The foot of the reader is its one deck of controls, the same place at every step: the switch, the one
   action that comes next (start, show the answer, next question, back), where you are, and the keys. */
(() => {
  'use strict';
  // The data loader (src/features/performance/data-loader.js). Until it is in the page, this stand-in reads
  // the embedded block, exactly as before.
  const DKLAData = window.DKLAData || {
    isLazy: () => false,
    loaded: () => true,
    json: async (id) => JSON.parse(document.getElementById(id)?.textContent || 'null'),
    text: async (id) => document.getElementById(id)?.textContent || '',
    whenLoaded: async () => {},
  };
  const ID = 'dklaColdCallData';
  const block = document.getElementById(ID);
  if (!block || window.DKLAColdCall) return;
  /* The owner has not yet decided whether an account opens to be read or to be rehearsed. Until he does it
     opens to be read, as it always has. To make rehearsal the default, change 'read' to 'rehearse' here. */
  const DEFAULT_MODE = 'read';
  const MODES = ['read', 'rehearse'],
    MODE_KEY = 'dkla.coldCallMode.v1';
  // The narratives. In the single-file copy they are in the page and are read now, as before. In the hosted
  // page the block may be split out: it is then read on first use (a case page with a Cold Call, or the reader
  // opened) or when the background download brings it, and the "Cold call" buttons appear when it arrives.
  let dataset = null,
    cases = new Map(),
    loading = null;
  const install = (data) => {
    if (dataset || !data) return;
    dataset = data;
    cases = new Map(dataset.cases.filter((c) => c.origin === 'narrative').map((c) => [c.id, c]));
  };
  if (!DKLAData.isLazy(ID)) install(JSON.parse(block.textContent));
  function load() {
    if (dataset) return Promise.resolve(dataset);
    loading ||= DKLAData.json(ID).then(
      (data) => {
        install(data);
        arrived();
        return dataset;
      },
      (error) => {
        loading = null;
        throw error;
      },
    );
    return loading;
  }
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const lines = (value) => (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);
  // Captions are composed by src/features/v32/caption.js; without it a title is plain text.
  const caption = (title) => window.DKLACaption?.html(title) ?? esc(title);
  const captionLine = (title) => window.DKLACaption?.inline(title) ?? esc(title);
  // One family of icons: 20 px, a 1.5 px stroke in the text colour (reader.css .cc-icon).
  const icon = (d) => `<svg class="cc-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="${d}"/></svg>`;
  const ICON = {
    close: icon('M5.5 5.5l9 9M14.5 5.5l-9 9'),
    next: icon('M4 10h12M11.5 5.5 16 10l-4.5 4.5'),
    back: icon('M16 10H4M8.5 5.5 4 10l4.5 4.5'),
    out: icon('M8.5 5.5h-3v9h9v-3M11.5 4.5h4v4M15.5 4.5l-6 6'),
    brief: icon('M6 3.5h5.5l3 3v10H6zM11.5 3.5v3h3M8.5 10.5H12M8.5 13.5H12'),
    page: icon('M4.5 4.5h11v11h-11zM4.5 8h11M8 8v7.5'),
    list: icon('M4 6h12M4 10h12M4 14h8'),
    more: icon('M5.5 8 10 12.5 14.5 8'),
    case: icon(
      'M10 3.5v13M6.5 16.5h7M4 7h12M4 7l-1.8 4.6a2.4 2.4 0 0 0 3.6 0ZM16 7l-1.8 4.6a2.4 2.4 0 0 0 3.6 0Z',
    ),
    left: '<svg class="cc-key-icon" viewBox="0 0 12 12" role="img" aria-label="Left arrow"><path d="M10 6H2M5 3 2 6l3 3"/></svg>',
    right:
      '<svg class="cc-key-icon" viewBox="0 0 12 12" role="img" aria-label="Right arrow"><path d="M2 6h8M7 3l3 3-3 3"/></svg>',
  };
  const memory = new Map(),
    wide = matchMedia('(min-width: 900px)');
  let current = null,
    mode = DEFAULT_MODE,
    step = 0, // 0 the setup, 1..n the episodes, n + 1 the end
    revealed = new Set(), // the episodes whose narration has been asked for, this opening
    origin = '', // where the reader was opened from: 'case', 'brief', 'index' or ''
    returnTo = null,
    frame = 0;
  const dialog = document.createElement('dialog');
  dialog.id = 'coldCallDialog';
  dialog.className = 'cc-shell';
  dialog.setAttribute('aria-labelledby', 'ccKind ccTitle');
  document.body.appendChild(dialog);
  const $ = (id) => dialog.querySelector('#' + id);
  const all = (selector) => dialog.querySelectorAll(selector);
  const count = () => current.sections.length;
  function savedMode() {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      return MODES.includes(saved) ? saved : DEFAULT_MODE;
    } catch {
      return DEFAULT_MODE;
    }
  }
  /* ---------- sources ---------- */
  function sourceLink(source, label, extra = '') {
    if (source.briefId)
      return `<button type="button" class="cc-link" data-cc-source-brief="${esc(source.briefId)}"${extra}>${esc(label)}</button>`;
    if (source.path)
      return `<button type="button" class="cc-link" data-dkla-file="${esc(source.path)}"${extra}>${esc(label)}</button>`;
    if (source.url?.startsWith('#'))
      return `<a class="cc-link" href="${esc(source.url)}"${extra}>${esc(label)}</a>`;
    return `<a class="cc-link" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer"${extra}>${esc(label)}${ICON.out}<span class="cc-sr"> (opens a new tab)</span></a>`;
  }
  const sourceName = (source) => (source.briefId ? 'Full brief' : source.label || 'Opinion');
  // Where an episode's account comes from: the source, then the pinpoint as a readout.
  function citations(refs) {
    return (
      '<div class="cc-refs">' +
      (refs || [])
        .map((ref) => {
          const source = current.sources.find((s) => s.id === ref.id);
          if (!source) return '';
          return `<p class="cc-ref">${sourceLink(source, sourceName(source))}<span class="cc-pin">${esc(ref.pinpoint)}</span></p>`;
        })
        .join('') +
      '</div>'
    );
  }
  /* ---------- the case's pictogram (the dklaIcons block: 24-unit drawings, one per map case) ---------- */
  let icons = null;
  function pictogram(id) {
    if (!icons) {
      try {
        icons = JSON.parse(document.getElementById('dklaIcons')?.textContent || 'null') || {};
      } catch {
        icons = {};
      }
    }
    const record = icons.records?.[id],
      art = record && icons.paths?.[record.motif];
    if (!art) return null;
    const badge = record.modifier && icons.modifiers?.[record.modifier];
    return {
      label: record.label || '',
      svg: `<svg class="cc-pict" data-art viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${art}${badge ? `<g transform="translate(14.5 14.5) scale(.42)"><circle cx="12" cy="12" r="13" class="cc-pict-badge"/>${badge}</g>` : ''}</svg>`,
    };
  }
  /* ---------- the setup: the answer to "tell us about this case" ---------- */
  function setupHTML(c) {
    const art = pictogram(c.id),
      cast = (Array.isArray(c.actors) ? c.actors : []).filter((a) => a && (a.name || a.role)),
      path = lines(c.proceedings);
    // A caption whose longest line (a party, with its "v.") would not fit the measure at the title's full
    // size is set at the title's smaller size, where almost all of them do: fewer names broken in two.
    const parts = window.DKLACaption?.parse(c.title).cases || [],
      longest = Math.max(0, ...parts.flatMap((p) => [p.first.length, p.second ? p.second.length + 3 : 0])),
      long = longest > (art ? 40 : 48);
    // The plate: the case's own drawing on a tile of clear ice, the one place the setup wears the frost.
    // With nothing to brief (no lead, cast or path) the setup is its head alone and the first episode follows.
    return `<header class="cc-setup" id="cc-step-setup" data-cc-step="0"${c.lead || cast.length || path.length ? '' : ' data-cc-bare'} aria-labelledby="ccCaption">
      <div class="cc-head"${art ? ' data-cc-art' : ''}>
        ${art ? `<figure class="cc-plate"${art.label ? ` title="${esc(art.label)}"` : ''}>${art.svg}</figure>` : ''}
        <div class="cc-head-text">
          ${art?.label ? `<p class="cc-hook">${esc(art.label)}</p>` : ''}
          <h2 class="cc-caption" id="ccCaption"${long ? ' data-cc-long' : ''} tabindex="-1">${caption(c.title)}</h2>
          <p class="cc-facts">${c.citation ? `<span class="cc-cite">${esc(c.citation)}</span>` : ''}<span class="cc-course"><i class="cc-dot" aria-hidden="true"></i>${esc(c.course)}</span></p>
        </div>
      </div>
      ${c.lead ? `<p class="cc-lead">${esc(c.lead)}</p>` : ''}
      ${
        cast.length || path.length
          ? `<div class="cc-briefing" data-cc-cast="${cast.length}">${
              cast.length
                ? `<section class="cc-cast" aria-labelledby="ccCastLabel"><h3 class="cc-label" id="ccCastLabel">Who is involved</h3><dl>${cast
                    .map((a) => `<div><dt>${esc(a.name)}</dt><dd>${esc(a.role)}</dd></div>`)
                    .join('')}</dl></section>`
                : ''
            }${
              path.length
                ? `<section class="cc-path" aria-labelledby="ccPathLabel"><h3 class="cc-label" id="ccPathLabel">How it got here</h3>${
                    path.length > 1
                      ? `<ol>${path.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>`
                      : `<p class="cc-path-one">${esc(path[0])}</p>`
                  }</section>`
                : ''
            }</div>`
          : ''
      }
    </header>`;
  }
  /* ---------- the episodes ---------- */
  // Definitions and plain-English sentences (glossary.js): jargon in episode paragraphs and follow-up
  // answers is wrapped, and listed sentences get their marker, at render time; headings, prompts, citations
  // and the source brief stay plain. Paragraphs are named "<section>.<paragraph>" as in the plain table.
  const gloss = window.DKLAColdCallGloss || null;
  let glossing = null;
  const paragraphs = (section, i, term) =>
    section.paragraphs
      .flatMap((p, j) => {
        const parts = r6ReadingChunks(p);
        return term ? term.chunks(p, `${i}.${j}`, parts) : parts.map(esc);
      })
      .map((html) => `<p>${html}</p>`)
      .join('');
  /* What a `cue` is. Of the 4,097 written, 2,417 are questions; the rest are an instruction ("Explain why the
     Court could not simply decide that Ohio must hear the suit."), a headline or a date ("1968–1969"). A
     question is answered; anything else is told from memory. An episode with no cue is told from its number. */
  const cueKind = (cue) => (!cue ? 'none' : /\?["”’')\]]*\s*$/.test(cue) ? 'question' : 'prompt');
  // The narration of one episode: its title, its paragraphs, a follow-up where one was written, its sources.
  // `plain` draws it without definitions or markers (see show(): the later episodes of a long account are
  // drawn plain first and marked a moment later).
  function answerHTML(s, i, plain = false) {
    const term = plain ? null : glossing?.section();
    return `<h4 class="cc-title" id="cc-heading-${esc(s.id)}" tabindex="-1">${esc(s.title)}</h4>${paragraphs(s, i, term)}${s.followUp ? `<details class="cc-followup"><summary>${esc(s.followUp.question)}</summary><p>${term ? term.text(s.followUp.answer, `${i}.followUp-answer`) : esc(s.followUp.answer)}</p>${citations(s.followUp.sources)}</details>` : ''}${citations(s.sources)}`;
  }
  // While rehearsing a prompt is set large, on two lines at most; one too long for that (some eighty of the
  // 4,097) keeps the size it has when read, rather than standing three lines tall beside empty space.
  const LONG_CUE = 80;
  function sectionHTML(s, i, plain = false) {
    const n = current.sections.length,
      id = esc(s.id),
      kind = cueKind(s.cue);
    // The cover is the frost over a narration not yet asked for. Pressing it shows the narration, as the
    // action at the foot does; it is not a second control for the keyboard or a screen reader.
    return `<section class="cc-section" id="cc-section-${id}" data-cc-section="${i}" data-cc-step="${i + 1}" data-cc-cue="${kind}" aria-labelledby="cc-cue-${id}"><p class="cc-count"><span class="cc-sr">${kind === 'question' ? 'Question' : 'Episode'} </span>${i + 1} of ${n}</p><h3 class="cc-cue" id="cc-cue-${id}"${(s.cue || '').length > LONG_CUE ? ' data-cc-long' : ''} tabindex="-1">${kind === 'none' ? `Episode ${i + 1}` : esc(s.cue)}</h3><div class="cc-cover" data-cc-reveal="${i}" aria-hidden="true"><span class="cc-cover-hint" id="cc-hint-${id}">${kind === 'question' ? 'Answer from memory, then check.' : 'Tell this part from memory, then check.'}</span></div><div class="cc-answer" id="cc-answer-${id}">${answerHTML(s, i, plain)}</div></section>`;
  }
  /* ---------- the end: what the case leaves open, the sources, the ways out ---------- */
  // The next case with an account in the same topic group of the map, or in the groups after it in the same
  // subject. A supporting case has no place on the map, so it has none.
  function nextCase(id) {
    try {
      const home = mapData().homes[id],
        region = home && regionFor(home.region);
      if (!region) return null;
      const groups = region.districtIds || [home.district];
      for (let g = groups.indexOf(home.district); g >= 0 && g < groups.length; g++) {
        const members = cardMembers(groups[g]).main.filter((n) => n.kind === 'Case' && cases.has(n.id)),
          at = members.findIndex((n) => n.id === id),
          next = groups[g] === home.district ? (at < 0 ? null : members[at + 1]) : members[0];
        if (next) return { id: next.id, group: districtFor(groups[g])?.title || '' };
      }
    } catch {
      /* the map is not in this page (a check): no next case */
    }
    return null;
  }
  const onMap = (id) => {
    try {
      return !!nodesById.get(id);
    } catch {
      return false;
    }
  };
  const row = (attributes, glyph, label, meta = '', tag = 'button type="button"') =>
    `<${tag} class="cc-row" ${attributes}>${glyph}<span class="cc-row-label">${label}</span>${meta ? `<span class="cc-row-meta">${meta}</span>` : ''}</${tag.split(' ')[0]}>`;
  const backLabel = () =>
    origin === 'index'
      ? 'All Cold Calls'
      : origin === 'brief'
        ? 'Back to the brief'
        : origin === 'case'
          ? 'Back to the case'
          : 'Close Cold Call';
  function endHTML(c) {
    const limits = lines(c.limits),
      n = c.sections.length,
      next = nextCase(c.id),
      nextAccount = next && cases.get(next.id),
      casePage = origin !== 'case' && onMap(c.id);
    const sources = c.sources
      .map((s) =>
        s.briefId
          ? row(
              `data-cc-source-brief="${esc(s.briefId)}"`,
              ICON.brief,
              s.briefId === c.briefId ? 'Full brief' : esc(s.label || 'Full brief'),
              s.briefId === c.briefId ? '' : esc(s.briefId),
            )
          : s.path
            ? row(`data-dkla-file="${esc(s.path)}"`, ICON.brief, esc(s.label || 'Opinion'))
            : `<a class="cc-row" href="${esc(s.url)}"${s.url?.startsWith('#') ? '' : ' target="_blank" rel="noopener noreferrer"'}>${ICON.out}<span class="cc-row-label">${esc(s.label || 'Opinion')}</span>${s.url?.startsWith('#') ? '' : '<span class="cc-sr"> (opens a new tab)</span>'}</a>`,
      )
      .join('');
    return `<footer class="cc-finish" id="cc-step-end" data-cc-step="${n + 1}">
      ${
        limits.length
          ? `<section class="cc-limits" aria-labelledby="ccLimitsLabel"><h3 class="cc-finish-title" id="ccLimitsLabel" tabindex="-1">What this case does not decide</h3>${limits
              .map((p) => `<p>${esc(p)}</p>`)
              .join('')}</section>`
          : '<h3 class="cc-finish-title cc-sr" id="ccLimitsLabel" tabindex="-1">The end of this account</h3>'
      }
      <div class="cc-exits">
        <section aria-labelledby="ccSourcesLabel"><h3 class="cc-label" id="ccSourcesLabel">Sources</h3><div class="cc-rows cc-source-list">${sources}</div></section>
        ${
          nextAccount || casePage
            ? `<nav aria-labelledby="ccWaysLabel"><h3 class="cc-label" id="ccWaysLabel">From here</h3><div class="cc-rows">${
                nextAccount
                  ? // data-cold-call is what the analytics layer counts as a Cold Call opened; a span, not a
                    // button, so the frosted style of the entry control (frost.css) stays off it.
                    row(
                      `role="button" tabindex="0" data-cold-call="${esc(next.id)}" data-cc-open="${esc(next.id)}" title="${esc(nextAccount.title)}"`,
                      ICON.next,
                      `<span class="cc-row-kind">Next Cold Call</span>${captionLine(nextAccount.title)}`,
                      esc(next.group),
                      'span',
                    )
                  : ''
              }${casePage ? row(`data-cc-case-page="${esc(c.id)}"`, ICON.page, 'Case page') : ''}</div></nav>`
            : ''
        }
      </div>
    </footer>`;
  }
  /* ---------- the list at the side: the setup, each episode, the end ---------- */
  // An episode's row shows its title; while rehearsing it shows the prompt until the narration is asked for,
  // because the title gives the answer away.
  function listHTML(c) {
    const n = c.sections.length;
    return `<details id="ccList" ${wide.matches ? 'open' : ''}>
      <summary><span>In this account</span><span class="cc-readout" id="ccProgressSmall"></span>${ICON.more}</summary>
      <nav aria-label="In this account"><ol class="cc-nav">
        <li class="cc-nav-row cc-nav-plain" data-cc-nav="0"><button type="button" class="cc-nav-go" data-cc-go="0">The setup</button></li>
        ${c.sections
          .map(
            (s, i) =>
              `<li class="cc-nav-row" data-cc-nav="${i + 1}"><button type="button" class="cc-nav-go" id="ccNavGo${i}" data-cc-go="${i + 1}" aria-labelledby="ccNavGo${i} ccNavText${i}">${i + 1}</button><span class="cc-nav-text" id="ccNavText${i}"><span class="cc-nav-cue">${esc(s.cue || 'Episode ' + (i + 1))}</span><span class="cc-nav-title">${esc(s.title)}</span></span></li>`,
          )
          .join('')}
        <li class="cc-nav-row cc-nav-plain" data-cc-nav="${n + 1}"><button type="button" class="cc-nav-go" data-cc-go="${n + 1}">What it does not decide</button></li>
      </ol></nav>
    </details>`;
  }
  const modeHTML = `<div class="cc-mode" role="group" aria-label="Read or rehearse"><button type="button" class="cc-seg" data-cc-mode-set="read" title="Every episode open, each question above its answer">Read</button><button type="button" class="cc-seg" data-cc-mode-set="rehearse" title="One question at a time; answer from memory before you see the narration">Rehearse</button></div>`;
  const barHTML = (c) =>
    `<header class="cc-bar"><div class="cc-bar-title"><span class="cc-bar-kind" id="ccKind">Cold Call</span>${c ? `<span class="cc-bar-case"><i class="cc-dot" aria-hidden="true"></i><span id="ccTitle" title="${esc(c.title)}">${captionLine(c.title)}</span></span>` : ''}</div><button type="button" class="cc-x" id="ccClose" aria-label="Close Cold Call" title="Close (Esc)">${ICON.close}</button></header>`;
  const KEYS = `<kbd>${ICON.left}</kbd><kbd>${ICON.right}</kbd>`;
  const footHTML = `<footer class="cc-foot">${modeHTML}<button type="button" class="cc-button cc-primary" id="ccAct" data-cc-act><span id="ccActLabel"></span><kbd class="cc-act-key" id="ccActKey" aria-hidden="true">Space</kbd></button><span class="cc-foot-status"><span class="cc-readout" id="ccProgress"></span><span class="cc-keys cc-keys-read">${KEYS} episode<i></i><kbd>Esc</kbd> close</span><span class="cc-keys cc-keys-rehearse">${KEYS} question<i></i><kbd>Esc</kbd> close</span></span></footer>`;
  // Opened before the narratives or the definition tables have arrived: a calm loading state, then the account.
  let waiting = 0;
  const tablesReady = () => !gloss?.ready || gloss.ready();
  function open(id, trigger) {
    if (dialog.open) return;
    origin = originOf(trigger || document.activeElement, id);
    if (dataset && tablesReady()) {
      show(id, trigger);
      return;
    }
    const ticket = ++waiting;
    returnTo = remember(trigger);
    current = null;
    delete dialog.dataset.course;
    delete dialog.dataset.ccMode;
    dialog.innerHTML = `${barHTML(null)}<p class="cc-loading" role="status">Loading Cold Call…</p>`;
    $('ccClose').onclick = close;
    dialog.showModal();
    $('ccClose').focus?.();
    Promise.all([load(), gloss?.load?.()]).then(
      () => {
        if (ticket !== waiting || !dialog.open) return;
        waiting = 0;
        if (cases.has(id)) show(id, trigger, true);
        else close();
      },
      () => {
        if (ticket !== waiting || !dialog.open) return;
        const status = dialog.querySelector('.cc-loading');
        if (status)
          status.textContent =
            'Cold Call could not be loaded. Check the connection, then close this and try again.';
      },
    );
  }
  const remember = (trigger) => ({
    focus: trigger || document.activeElement,
    inspector: document.getElementById('inspector')?.scrollTop || 0,
    supporting: document.getElementById('r19Body')?.scrollTop || 0,
  });
  // Where the reader was opened from, which is where "back" leads.
  function originOf(trigger, id) {
    if (trigger?.closest?.('#coldCallIndexDialog')) return 'index';
    if (trigger?.closest?.('#r19Dialog')) return 'brief';
    try {
      if (selected?.type === 'node' && selected.id === id && !document.getElementById('inspector')?.hidden)
        return 'case';
    } catch {
      /* no atlas in this page */
    }
    return '';
  }
  function show(id, trigger, already) {
    const c = cases.get(id);
    if (!c || (dialog.open && !already)) return;
    current = c;
    step = 0;
    revealed = new Set();
    mode = savedMode();
    if (!already) returnTo = remember(trigger);
    dialog.dataset.course = c.course;
    dialog.removeAttribute('data-cc-scrolled');
    // Opened over the index of accounts: that dialog's scrim is already behind this one.
    dialog.toggleAttribute('data-cc-over', origin === 'index');
    glossing = gloss?.begin(c.id, c.title) || null;
    // v3.2: marking the defined words is the slow part of drawing an account. The first episode is marked
    // now, and further ones for as long as that has taken under MARK_FIRST milliseconds; the rest are drawn
    // as plain text, so the reader is on screen at once, and marked right after it (markRest), in order.
    // (Where nothing can be put off, or a check asks through DKLAColdCall.markAtOnce, all are marked now.)
    const later =
      typeof performance === 'object' &&
      typeof requestAnimationFrame === 'function' &&
      !window.DKLAColdCall?.markAtOnce;
    const began = later ? performance.now() : 0;
    let unmarked = c.sections.length;
    const episodes = c.sections
      .map((s, i) => {
        if (later && glossing && i && i < unmarked && performance.now() - began > MARK_FIRST) unmarked = i;
        return sectionHTML(s, i, i >= unmarked);
      })
      .join('');
    const ticket = ++marking;
    dialog.innerHTML = `${barHTML(c)}
      <div class="cc-layout">${listHTML(c)}
        <div class="cc-main">
          <div id="ccScroll" tabindex="0" role="region" aria-label="Cold Call account">
            <article id="ccNarrative">${c.notice ? `<p class="cc-notice">${esc(c.notice)}</p>` : ''}
              ${setupHTML(c)}
              ${episodes}
              ${endHTML(c)}
            ${glossing ? glossing.descriptions() : ''}</article>
          </div>
          ${footHTML}
        </div>
      </div>
      <p class="cc-sr" id="ccLive" role="status"></p>`;
    $('ccClose').onclick = close;
    aim = null;
    // A wheel, a touch, a press or a key takes the scroll over (DKLACalm.scrollTo stops for the same four).
    for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown'])
      $('ccScroll').addEventListener(type, () => (aim = null), { passive: true });
    $('ccScroll').addEventListener(
      'scroll',
      () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (dialog.open && current) track();
        });
      },
      { passive: true },
    );
    sync(true);
    if (!dialog.open) dialog.showModal();
    // Reopened in this session: back where the reading stopped (rehearsal starts again from the setup).
    const kept = memory.get(id);
    $('ccScroll').scrollTop = mode === 'read' ? kept?.top || 0 : 0;
    if (mode === 'read' && kept?.top) track();
    $('ccAct').focus?.({ preventScroll: true });
    if (unmarked < c.sections.length) {
      dialog.dataset.ccMarked = 'pending';
      markRest(c, unmarked, ticket);
    } else markDone(ticket);
  }
  // The episodes still drawn as plain text get their definitions and markers, in reading order, a few
  // milliseconds at a time; then the hidden descriptions the links point to are written again, complete.
  // The finished account is the same as one marked in a single pass, covered or shown.
  const MARK_FIRST = 8,
    MARK_SLICE = 6;
  let marking = 0,
    markWaiters = [];
  const soon = (fn) => {
    if (window.scheduler?.postTask) scheduler.postTask(fn, { priority: 'user-visible' }).catch(() => {});
    else setTimeout(fn, 0);
  };
  function markDone(ticket) {
    if (ticket !== marking) return;
    dialog.dataset.ccMarked = 'done';
    for (const resolve of markWaiters.splice(0)) resolve();
  }
  function markRest(c, from, ticket) {
    let i = from;
    const step = () => {
      if (ticket !== marking || current !== c || !dialog.open) return;
      const startedAt = performance.now();
      do {
        const answer = $('cc-answer-' + c.sections[i].id);
        // A definition card open on this episode keeps its word: wait until it is closed.
        if (answer?.querySelector('[aria-expanded="true"]')) {
          setTimeout(step, 200);
          return;
        }
        if (answer) {
          const open = !!answer.querySelector('details.cc-followup')?.open,
            focused = answer.contains(document.activeElement) ? document.activeElement.id : '';
          answer.innerHTML = answerHTML(c.sections[i], i);
          const followUp = answer.querySelector('details.cc-followup');
          if (open && followUp) followUp.open = true;
          if (focused) document.getElementById(focused)?.focus({ preventScroll: true });
        }
        i++;
      } while (i < c.sections.length && performance.now() - startedAt < MARK_SLICE);
      if (i < c.sections.length) {
        soon(step);
        return;
      }
      const article = $('ccNarrative');
      article
        .querySelectorAll(':scope > .cc-gloss-descs, :scope > .cc-plain-descs')
        .forEach((el) => el.remove());
      article.insertAdjacentHTML('beforeend', glossing.descriptions());
      markDone(ticket);
    };
    // After the reader's first frame has been drawn.
    requestAnimationFrame(() => soon(step));
  }
  function close() {
    if (!dialog.open) return;
    gloss?.close();
    marking++;
    delete dialog.dataset.ccMarked;
    for (const resolve of markWaiters.splice(0)) resolve();
    if (waiting) waiting = 0;
    // Where the reading stopped, for the next opening in this session; an account read to its end, or
    // rehearsed, opens again at the setup.
    else if (current)
      memory.set(current.id, { top: mode === 'read' && step <= count() ? $('ccScroll').scrollTop : 0 });
    current = null;
    dialog.close();
    dialog.replaceChildren();
    const focus = returnTo?.focus?.isConnected
      ? returnTo.focus
      : document.querySelector('#inspector [data-cold-call]');
    focus?.focus?.({ preventScroll: true });
    const inspector = document.getElementById('inspector');
    if (inspector && returnTo) inspector.scrollTop = returnTo.inspector;
    const supporting = document.getElementById('r19Body');
    if (supporting && returnTo) supporting.scrollTop = returnTo.supporting;
    returnTo = null;
  }
  /* ---------- where the reader is, and what shows ---------- */
  // Everything that depends on the mode, the step and what has been revealed is said here, with attributes;
  // reader.css does the showing and covering. Nothing is added to or taken from the account's text.
  let shownMode = '';
  function sync(fresh) {
    const n = count();
    dialog.dataset.ccMode = mode;
    dialog.dataset.ccAt = step < 1 ? 'setup' : step > n ? 'end' : 'episode';
    for (const el of all('[data-cc-step]')) {
      const k = +el.dataset.ccStep;
      el.toggleAttribute('data-cc-current', k === step);
      if (k >= 1 && k <= n) el.toggleAttribute('data-cc-revealed', revealed.has(k - 1));
    }
    for (const el of all('[data-cc-nav]')) {
      const k = +el.dataset.ccNav;
      el.toggleAttribute('data-cc-revealed', revealed.has(k - 1));
      const go = el.querySelector('.cc-nav-go');
      if (k === step) go.setAttribute('aria-current', 'step');
      else go.removeAttribute('aria-current');
      // A row cut short says the rest when pointed at: the prompt while its narration is covered, then the title.
      const s = current.sections[k - 1];
      if (s) {
        const full = mode === 'rehearse' && !revealed.has(k - 1) ? s.cue || '' : s.title;
        if (go.title !== full) go.title = full;
      }
    }
    if (fresh || shownMode !== mode) {
      shownMode = mode;
      for (const button of all('[data-cc-mode-set]'))
        button.setAttribute('aria-pressed', String(button.dataset.ccModeSet === mode));
    }
    // The one action that comes next. Filled where it is the way forward; a plain button while reading,
    // where the way forward is the text itself.
    const act = action();
    if ($('ccActLabel').textContent !== act.label) $('ccActLabel').textContent = act.label;
    $('ccAct').classList.toggle('cc-primary', act.primary);
    $('ccAct').dataset.ccAct = act.does;
    $('ccActKey').hidden = !act.space;
    if (act.describedBy) $('ccAct').setAttribute('aria-describedby', act.describedBy);
    else $('ccAct').removeAttribute('aria-describedby');
    const unit = mode === 'rehearse' ? 'Question' : 'Episode',
      text =
        step < 1 ? `${n} episode${n === 1 ? '' : 's'}` : step > n ? 'The end' : `${unit} ${step} of ${n}`;
    if ($('ccProgress').textContent !== text) {
      $('ccProgress').textContent = text;
      $('ccProgressSmall').textContent = text;
    }
  }
  function action() {
    const n = count(),
      rehearsing = mode === 'rehearse';
    if (step === 0)
      return { does: 'next', label: rehearsing ? 'Start rehearsing' : 'Start reading', primary: true };
    if (step > n) return { does: 'close', label: backLabel(), primary: true };
    const s = current.sections[step - 1];
    if (rehearsing && !revealed.has(step - 1))
      return {
        does: 'reveal',
        label: cueKind(s.cue) === 'question' ? 'Show the answer' : 'Show the episode',
        primary: true,
        space: true,
        describedBy: 'cc-hint-' + s.id,
      };
    return {
      does: 'next',
      label: step === n ? 'What it does not decide' : rehearsing ? 'Next question' : 'Next episode',
      primary: rehearsing,
      space: rehearsing,
    };
  }
  const scroller = () => $('ccScroll');
  const stepElement = (k) => dialog.querySelector(`[data-cc-step="${k}"]`);
  // Read: the step is wherever the reading has been scrolled to.
  function track() {
    const box = scroller();
    dialog.toggleAttribute('data-cc-scrolled', box.scrollTop > 4);
    if (mode !== 'read') return;
    // On the way to a step that was asked for, the steps passed on the way are not where the reader is.
    if (aim !== null) {
      if (Math.abs(box.scrollTop - aim) > 2) return;
      aim = null;
    }
    const top = box.getBoundingClientRect().top + 96;
    let next = 0;
    for (const el of all('[data-cc-step]'))
      if (el.getBoundingClientRect().top <= top) next = +el.dataset.ccStep;
    // The end counts once it has come into view, however short it is.
    if (box.scrollTop + box.clientHeight >= box.scrollHeight - 2 && box.scrollTop > 4) next = count() + 1;
    if (next !== step) {
      step = next;
      sync();
    }
  }
  let aim = null; // where a scroll that go() began is heading, until it arrives or the reader takes over
  function glide(box, top) {
    aim = Math.max(0, Math.min(box.scrollHeight - box.clientHeight, top));
    if (window.DKLACalm?.scrollTo) DKLACalm.scrollTo(box, top);
    else box.scrollTop = top;
  }
  function go(k) {
    if (!current) return;
    const n = count();
    k = Math.max(0, Math.min(n + 1, k));
    step = k;
    sync();
    if (!wide.matches) $('ccList').open = false;
    const box = scroller(),
      el = stepElement(k);
    if (mode === 'rehearse') box.scrollTop = 0;
    else {
      // An episode's own space above it is twice this: the text before it ends out of sight.
      const top =
        k === 0 ? 0 : box.scrollTop + el.getBoundingClientRect().top - box.getBoundingClientRect().top + 32;
      glide(box, top);
    }
    dialog.toggleAttribute('data-cc-scrolled', mode === 'read' && k > 0);
    // Focus goes to what is to be read or pressed next, so a screen reader says it and Tab starts there.
    // (While rehearsing that is the question: Space and Enter then show its narration, see the keys below.)
    const target = k === 0 ? $('ccAct') : k > n ? $('ccLimitsLabel') : el.querySelector('.cc-cue');
    target?.focus({ preventScroll: true });
  }
  function reveal(i) {
    if (!current || revealed.has(i) || !current.sections[i]) return;
    revealed.add(i);
    sync();
    const s = current.sections[i];
    // Said to a screen reader, and focus moves to the narration's first line so reading continues from there.
    $('ccLive').textContent = `${cueKind(s.cue) === 'question' ? 'The answer' : 'The episode'}: ${s.title}`;
    $('cc-heading-' + s.id)?.focus({ preventScroll: true });
  }
  // Space and Enter while rehearsing: begin, then show, then move on. Space first pages through a narration
  // longer than the screen, so the habit of paging with it never skips the rest of an answer.
  function onward(paging) {
    const n = count();
    if (step === 0) return go(1);
    if (step > n) return;
    if (!revealed.has(step - 1)) return reveal(step - 1);
    const box = scroller();
    if (paging && box.scrollTop + box.clientHeight < box.scrollHeight - 24)
      return glide(box, box.scrollTop + box.clientHeight * 0.85);
    go(step + 1);
  }
  function setMode(next) {
    if (!MODES.includes(next) || next === mode) return;
    mode = next;
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* private browsing: the choice lasts as long as the page */
    }
    if (!current || !dialog.open) return;
    sync();
    // The same place in the account, shown the other way.
    const box = scroller();
    if (mode === 'rehearse' || step === 0) box.scrollTop = 0;
    else {
      const el = stepElement(step);
      box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top + 32;
    }
    dialog.toggleAttribute('data-cc-scrolled', box.scrollTop > 4);
  }
  dialog.addEventListener('click', (event) => {
    const control = event.target.closest('button, a, [role="button"], [data-cc-reveal]');
    if (!control) return;
    const d = control.dataset;
    if (d.ccGo !== undefined) go(+d.ccGo);
    else if (d.ccReveal !== undefined) reveal(+d.ccReveal);
    else if (d.ccAct === 'reveal') reveal(step - 1);
    else if (d.ccAct === 'next') go(step + 1);
    else if (d.ccAct === 'close') close();
    else if (d.ccModeSet) {
      setMode(d.ccModeSet);
      // Chosen with the pointer: the keys go on from here (Space begins, or shows the answer), so focus
      // moves to what they act on. Chosen from the keyboard, focus stays on the switch.
      if (event.detail && step <= count())
        (step ? stepElement(step).querySelector('.cc-cue') : $('ccAct')).focus({ preventScroll: true });
    } else if (d.ccSourceBrief) openSourceBrief(d.ccSourceBrief, control);
    else if (d.ccClose !== undefined) close();
    else if (d.ccOpen && cases.has(d.ccOpen)) {
      // The next account, in the same reader; "back" still leads where this one was opened from.
      gloss?.close();
      memory.delete(d.ccOpen);
      if (origin === 'case') origin = '';
      show(d.ccOpen, undefined, true);
    } else if (d.ccCasePage) {
      const id = d.ccCasePage;
      close();
      document.getElementById('coldCallIndexDialog')?.close?.();
      document.getElementById('r19Dialog')?.close?.();
      window.LegalAtlas?.navigate?.('node', id);
    }
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    // Escape first closes an open definition card, then the reader.
    if (gloss?.tookEscape()) {
      gloss.close();
      return;
    }
    close();
  });
  gloss?.attach?.(dialog);
  // A dictionary entry opened from a definition card can lead to an atlas entry: leave the reader too.
  document.addEventListener(
    'click',
    (event) => {
      if (dialog.open && event.target.closest?.('#glossaryDialog [data-study-node]')) close();
    },
    true,
  );
  // Keys. Typing, arrows and Escape must not reach global map shortcuts while a reader is open. Left and
  // Right move between the setup, the episodes and the end; Up, Down and the page keys scroll as they always
  // do. While rehearsing, Space and Enter are the next step unless a control or a defined word has focus.
  dialog.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (!current || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target?.closest?.('input, textarea, select, .cc-gloss-card')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      go(step + (event.key === 'ArrowRight' ? 1 : -1));
      return;
    }
    if (event.key !== ' ' && event.key !== 'Enter') return;
    // A row that is not a <button> (the next account) is pressed with the same two keys.
    if (target?.matches?.('.cc-row[role="button"]')) {
      event.preventDefault();
      target.click();
      return;
    }
    if (mode !== 'rehearse') return;
    if (target?.closest?.('button, a[href], summary, [role="button"]')) return;
    event.preventDefault();
    onward(event.key === ' ');
  });
  wide.addEventListener('change', () => {
    if (dialog.open && current) $('ccList').open = wide.matches;
  });
  function paint() {
    const panel = document.getElementById('inspector');
    if (!panel || panel.hidden || typeof selected === 'undefined') return;
    const id = selected?.type === 'node' ? selected.id : null;
    // A case page is the first use: fetch the narratives if they are still to come.
    if (!dataset && id) load().catch(() => {});
    const old = panel.querySelector('[data-cold-call]');
    if (old?.dataset.coldCall === id) return;
    old?.remove();
    if (!cases.has(id)) return;
    // The reader will want its definitions: fetch them now if they are still to come.
    gloss?.load?.()?.catch?.(() => {});
    const heading = panel.querySelector('.dkla-record-title') || panel.querySelector('h1,h2');
    if (!heading) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cc-launch';
    button.dataset.coldCall = id;
    button.textContent = 'Cold call';
    button.setAttribute('aria-haspopup', 'dialog');
    button.title = 'Read the case as a chronological narrative';
    const actions = panel.querySelector('.v25-record-actions');
    if (actions) actions.appendChild(button);
    else heading.after(button);
  }
  function ready() {
    if (!window.LegalAtlas?.ready) {
      setTimeout(ready, 120);
      return;
    }
    const panel = document.getElementById('inspector');
    if (panel) new MutationObserver(paint).observe(panel, { childList: true, subtree: true });
    // A supporting brief opened in its dialog is also a first use.
    const supporting = document.getElementById('r19Body');
    if (supporting && !dataset)
      new MutationObserver((records, observer) => {
        if (dataset) observer.disconnect();
        else if (supporting.querySelector('[data-r19-fill],[data-r19-immediate]')) load().catch(() => {});
      }).observe(supporting, { childList: true, subtree: true });
    paint();
  }
  // The narratives arrived after the page was drawn: add the "Cold call" button to the open case page and
  // to the open supporting brief (src/features/r19/briefs.js entryHTML draws it there when the data is in).
  function arrived() {
    // For anything that lists the accounts (the index, the Library's row): they are in.
    document.dispatchEvent(new CustomEvent('dkla:coldcall'));
    if (!window.LegalAtlas?.ready) return; // ready() paints when the atlas is up
    paint();
    const body = document.getElementById('r19Body');
    if (!body || body.querySelector('[data-cold-call]')) return;
    const fill = body.querySelector('[data-r19-fill],[data-r19-immediate]'),
      briefId = fill?.dataset.r19Fill || fill?.dataset.r19Immediate,
      entry = briefId && window.DKLABriefs?.data?.entries?.find((e) => e[0] === briefId);
    if (!entry) return;
    const id = entry[6] || 'brief-' + briefId;
    if (!cases.has(id)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.coldCall = id;
    button.setAttribute('aria-haspopup', 'dialog');
    button.textContent = 'Cold call';
    // First in its row, where entryHTML puts it (v25/reading.js moves that row's buttons into the actions).
    (body.querySelector('.v25-support-actions') || body.querySelector('.r19-line'))?.prepend(button);
  }
  document.addEventListener('click', (event) => {
    const launch = event.target.closest('[data-cold-call]');
    if (!launch || !cases.has(launch.dataset.coldCall)) return;
    event.preventDefault();
    open(launch.dataset.coldCall, launch);
  });
  /* ---------- the full brief, over the reader ---------- */
  const sourceDialog = document.createElement('dialog');
  sourceDialog.id = 'ccBriefDialog';
  sourceDialog.className = 'cc-shell';
  sourceDialog.setAttribute('aria-labelledby', 'ccBriefKind ccBriefTitle');
  document.body.appendChild(sourceDialog);
  let sourceReturn = null;
  function openSourceBrief(id, trigger) {
    const title = window.DKLABriefs.data.entries.find((entry) => entry[0] === id)?.[1] || current.title;
    sourceReturn = trigger;
    sourceDialog.innerHTML = `<header class="cc-bar"><div class="cc-bar-title"><span class="cc-bar-kind" id="ccBriefKind">Full brief</span><span class="cc-bar-case"><span id="ccBriefTitle" title="${esc(title)}">${captionLine(title)}</span></span></div><button type="button" class="cc-x" id="ccBriefClose" aria-label="Back to Cold Call" title="Back to Cold Call (Esc)">${ICON.close}</button></header><div class="cc-brief-body" tabindex="0"></div>`;
    sourceDialog.querySelector('#ccBriefClose').onclick = closeSourceBrief;
    sourceDialog.showModal();
    window.DKLABriefLoader.fill(sourceDialog.querySelector('.cc-brief-body'), id, window.DKLABriefs.render);
  }
  function closeSourceBrief() {
    sourceDialog.close();
    sourceDialog.replaceChildren();
    if (sourceReturn?.isConnected) sourceReturn.focus({ preventScroll: true });
    sourceReturn = null;
  }
  sourceDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeSourceBrief();
  });
  sourceDialog.addEventListener('keydown', (event) => event.stopPropagation());
  window.DKLAColdCall = {
    open,
    close,
    /** False for every case until the narratives are in the page (see loaded and whenLoaded). */
    has: (id) => cases.has(id),
    cases: () => [...cases.keys()],
    /** What a list of accounts needs to show one: its caption, citation, course and number of episodes. */
    account: (id) => {
      const c = cases.get(id);
      return c
        ? {
            id: c.id,
            title: c.title,
            citation: c.citation || '',
            course: c.course,
            episodes: c.sections.length,
          }
        : null;
    },
    coverage: () => ({ ...dataset?.coverage }),
    loaded: () => !!dataset,
    /** 'read' or 'rehearse': how accounts open in this browser. setMode() changes and remembers it. */
    mode: () => (dialog.open && current ? mode : savedMode()),
    setMode,
    defaultMode: DEFAULT_MODE,
    /** For the checks: the open account, the step (0 the setup, then the episodes, then the end), what is revealed. */
    state: () =>
      dialog.open && current
        ? {
            id: current.id,
            mode,
            step,
            steps: count() + 2,
            revealed: [...revealed].sort((a, b) => a - b),
            origin,
          }
        : null,
    /** Resolves when every episode of the open account has its definitions (at once if none is open). */
    marked: () =>
      dialog.dataset.ccMarked === 'pending'
        ? new Promise((resolve) => markWaiters.push(resolve))
        : Promise.resolve(),
    /** Resolves when the narratives are in (fetching them if they are still to come). */
    whenLoaded: () => load().then(() => {}),
  };
  // Brought by the background download before any first use.
  if (!dataset) DKLAData.whenLoaded(ID).then(() => load().catch(() => {}));
  ready();
})();
