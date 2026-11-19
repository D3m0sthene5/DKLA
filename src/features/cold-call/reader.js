/* Authored Cold Call narratives. Display only: graph, briefs and source prose stay untouched. */
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
  const lines = (value) => (Array.isArray(value) ? value : [value]);
  const memory = new Map(),
    wide = matchMedia('(min-width: 900px)');
  let current = null,
    active = 0,
    returnTo = null,
    frame = 0;
  const dialog = document.createElement('dialog');
  dialog.id = 'coldCallDialog';
  dialog.setAttribute('aria-labelledby', 'ccTitle');
  document.body.appendChild(dialog);
  const $ = (id) => dialog.querySelector('#' + id);
  function sourceLink(source, label) {
    if (source.briefId)
      return `<button type="button" data-cc-source-brief="${esc(source.briefId)}">${esc(label)}</button>`;
    if (source.path)
      return `<button type="button" data-dkla-file="${esc(source.path)}">${esc(label)} ↗</button>`;
    if (source.url?.startsWith('#')) return `<a href="${esc(source.url)}">${esc(label)} ↗</a>`;
    return `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span><span class="cc-sr"> (opens a new tab)</span></a>`;
  }
  function citations(refs) {
    return (
      '<div class="cc-citations">' +
      refs
        .map((ref) => {
          const source = current.sources.find((s) => s.id === ref.id);
          return sourceLink(
            source,
            `${source.briefId ? 'Full brief' : source.label || 'Opinion'} · ${ref.pinpoint}`,
          );
        })
        .join('') +
      '</div>'
    );
  }
  // Definitions and plain-English sentences (glossary.js): jargon in episode paragraphs and follow-up
  // answers is wrapped, and listed sentences get their marker, at render time; headings, citations and
  // the source brief stay plain. Paragraphs are named "<section>.<paragraph>" as in the plain table.
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
  // `plain` draws the episode without definitions or markers (see show(): the later episodes of a long account
  // are drawn plain first and marked a moment later).
  function sectionHTML(s, i, plain = false) {
    const term = plain ? null : glossing?.section();
    return `<section class="cc-section" id="cc-section-${esc(s.id)}" data-cc-section="${i}" aria-labelledby="cc-heading-${esc(s.id)}"><p class="cc-kicker">${String(i + 1).padStart(2, '0')} / ${current.sections.length}</p><h3 id="cc-heading-${esc(s.id)}" tabindex="-1">${esc(s.title)}</h3>${paragraphs(s, i, term)}${s.followUp ? `<details class="cc-followup"><summary>${esc(s.followUp.question)}</summary><p>${term ? term.text(s.followUp.answer, `${i}.followUp-answer`) : esc(s.followUp.answer)}</p>${citations(s.followUp.sources)}</details>` : ''}${citations(s.sources)}</section>`;
  }
  // Opened before the narratives or the definition tables have arrived: a calm loading state, then the account.
  let waiting = 0;
  const tablesReady = () => !gloss?.ready || gloss.ready();
  function open(id, trigger) {
    if (dialog.open) return;
    if (dataset && tablesReady()) {
      show(id, trigger);
      return;
    }
    const ticket = ++waiting;
    returnTo = remember(trigger);
    current = null;
    delete dialog.dataset.course;
    dialog.innerHTML = `<header class="cc-header"><div class="cc-heading"><span class="cc-kicker">Cold call</span><h2 id="ccTitle">Cold Call</h2></div><div class="cc-actions"><button type="button" id="ccClose" autofocus>← Back to case</button></div></header><p class="cc-loading" role="status">Loading Cold Call…</p>`;
    $('ccClose').onclick = close;
    dialog.showModal();
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
  function show(id, trigger, already) {
    const c = cases.get(id);
    if (!c || (dialog.open && !already)) return;
    current = c;
    active = 0;
    if (!already) returnTo = remember(trigger);
    dialog.dataset.course = c.course;
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
    const brief =
      c.sources.find((s) => s.briefId === c.briefId && s.briefId) || c.sources.find((s) => s.briefId);
    dialog.innerHTML = `<header class="cc-header">
      <div class="cc-heading"><span class="cc-kicker">${esc(c.course)} / Cold call</span><h2 id="ccTitle">${esc(c.title)}</h2>${c.citation ? `<p class="cc-cite">${esc(c.citation)}</p>` : ''}</div>
      <div class="cc-actions">${brief ? sourceLink(brief, 'Full brief') : ''}<button type="button" id="ccClose" autofocus>← Back to case</button></div>
      </header>
      <div class="cc-layout"><details id="ccSections" ${wide.matches ? 'open' : ''}>
        <summary>In this case <span id="ccProgressMobile" aria-hidden="true"></span><span aria-hidden="true">⌄</span></summary><div class="cc-index-inner">
        <p class="cc-index-label">In this case <span id="ccProgress" aria-live="polite"></span></p>
        <nav aria-label="Case episodes">${c.sections.map((s, i) => `<button type="button" data-cc-jump="${i}"><span class="cc-number">${String(i + 1).padStart(2, '0')}</span><span>${esc(s.title)}</span></button>`).join('')}</nav>
        </div></details>
      <div id="ccScroll" tabindex="0" role="region" aria-label="Cold call reading area">
        <article id="ccNarrative">${c.notice ? `<p class="cc-notice">${esc(c.notice)}</p>` : ''}
          ${episodes}
          <footer class="cc-end">${
            c.limits
              ? `<details class="cc-scope"><summary>Scope of this decision</summary>${lines(c.limits)
                  .map((p) => `<p>${esc(p)}</p>`)
                  .join('')}</details>`
              : ''
          }<div class="cc-source-list">${c.sources.map((s) => sourceLink(s, s.briefId ? 'Full source brief' : s.label)).join('')}</div></footer>
        ${glossing ? glossing.descriptions() : ''}</article>
      </div></div>`;
    $('ccClose').onclick = close;
    $('ccScroll').addEventListener(
      'scroll',
      () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (dialog.open) track();
        });
      },
      { passive: true },
    );
    if (!dialog.open) dialog.showModal();
    else $('ccClose').focus();
    $('ccScroll').scrollTop = memory.get(id)?.top || 0;
    track();
    if (unmarked < c.sections.length) {
      dialog.dataset.ccMarked = 'pending';
      markRest(c, unmarked, ticket);
    } else markDone(ticket);
  }
  // The episodes still drawn as plain text get their definitions and markers, in reading order, a few
  // milliseconds at a time; then the hidden descriptions the links point to are written again, complete.
  // The finished account is the same as one marked in a single pass.
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
        const section = dialog.querySelector(`[data-cc-section="${i}"]`);
        // A definition card open on this episode keeps its word: wait until it is closed.
        if (section?.querySelector('[aria-expanded="true"]')) {
          setTimeout(step, 200);
          return;
        }
        if (section) {
          const open = !!section.querySelector('details.cc-followup')?.open,
            focused = section.contains(document.activeElement) ? document.activeElement.id : '';
          section.outerHTML = sectionHTML(c.sections[i], i);
          const fresh = dialog.querySelector(`[data-cc-section="${i}"]`),
            followUp = fresh.querySelector('details.cc-followup');
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
    else if (current) memory.set(current.id, { top: $('ccScroll').scrollTop });
    dialog.close();
    dialog.replaceChildren();
    if (returnTo?.focus?.isConnected) returnTo.focus.focus({ preventScroll: true });
    const inspector = document.getElementById('inspector');
    if (inspector && returnTo) inspector.scrollTop = returnTo.inspector;
    const supporting = document.getElementById('r19Body');
    if (supporting && returnTo) supporting.scrollTop = returnTo.supporting;
    returnTo = null;
  }
  function progress() {
    const text = `${active + 1} / ${current.sections.length}`;
    $('ccProgress').textContent = text;
    $('ccProgressMobile').textContent = text;
    dialog.querySelectorAll('[data-cc-jump]').forEach((button, i) => {
      if (i === active) button.setAttribute('aria-current', 'location');
      else button.removeAttribute('aria-current');
    });
  }
  function track() {
    const top = $('ccScroll').getBoundingClientRect().top + 70;
    let next = 0;
    dialog.querySelectorAll('[data-cc-section]').forEach((section, i) => {
      if (section.getBoundingClientRect().top <= top) next = i;
    });
    active = next;
    progress();
  }
  function jump(index) {
    if (index < 0 || index >= current.sections.length) return;
    active = index;
    if (!wide.matches) $('ccSections').open = false;
    const heading = $('cc-heading-' + current.sections[index].id),
      scroller = $('ccScroll');
    scroller.scrollTop += heading.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 24;
    heading.focus({ preventScroll: true });
    progress();
  }
  dialog.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-cc-jump')) jump(+button.dataset.ccJump);
    if (button.hasAttribute('data-cc-source-brief')) openSourceBrief(button.dataset.ccSourceBrief, button);
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
  // Typing, arrows and Escape must not reach global map shortcuts while a reader is open.
  dialog.addEventListener('keydown', (event) => event.stopPropagation());
  wide.addEventListener('change', () => {
    if (dialog.open) $('ccSections').open = wide.matches;
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
    button.textContent = 'Cold Call';
    button.setAttribute('aria-haspopup', 'dialog');
    button.title = 'The case told as a story, for when you are called on';
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
    button.textContent = 'Cold Call';
    // First in its row, where entryHTML puts it (v25/reading.js moves that row's buttons into the actions).
    (body.querySelector('.v25-support-actions') || body.querySelector('.r19-line'))?.prepend(button);
  }
  document.addEventListener('click', (event) => {
    const launch = event.target.closest('[data-cold-call]');
    if (!launch || !cases.has(launch.dataset.coldCall)) return;
    event.preventDefault();
    open(launch.dataset.coldCall, launch);
  });
  const sourceDialog = document.createElement('dialog');
  sourceDialog.id = 'ccBriefDialog';
  sourceDialog.setAttribute('aria-labelledby', 'ccBriefTitle');
  document.body.appendChild(sourceDialog);
  let sourceReturn = null;
  function openSourceBrief(id, trigger) {
    const title = window.DKLABriefs.data.entries.find((entry) => entry[0] === id)?.[1] || current.title;
    sourceReturn = trigger;
    sourceDialog.innerHTML = `<header><div><span class="cc-kicker">Full source brief</span><h2 id="ccBriefTitle">${esc(title)}</h2></div><button type="button" id="ccBriefClose" autofocus>← Back to cold call</button></header><div class="cc-brief-body" tabindex="0"></div>`;
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
    coverage: () => ({ ...dataset?.coverage }),
    loaded: () => !!dataset,
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
