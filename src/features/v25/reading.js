/* The reader's structure (v3.2 "Instrument": docs/DESIGN.md).
 *
 * Every layer of the atlas draws its own block into the reader (the brief, timelines, flowchart steps,
 * canons, lecture notes, connections, sources, study). This file owns where each block goes. An entry
 * is read one facet at a time: Brief, Timeline, Flowchart, Canons, Lecture, Court, Cases, Connections,
 * Sources, Study. Each block is a direct child of .reader-body, marked with the facet it belongs to
 * (data-v32-facet) and kept in one order; src/features/v32/case.css shows the blocks of the facet that
 * is open and src/features/v32/case.js runs the facet bar (window.DKLAReader).
 *
 * The blocks stay direct children on purpose: the layers that draw them find and place them there, and
 * a wrapper per facet would make several of them draw their block again. Nothing is removed from an
 * entry, no source, graph, case prose, saved edit or map geometry is changed here, and the order is
 * applied only when it differs, so the layers' observers settle.
 */
(() => {
  'use strict';
  if (window.DKLAReading) return;
  const inspector = document.getElementById('inspector');
  const supporting = document.getElementById('r19Body');
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function disclosure(host, className, title, anchor) {
    let details = host.querySelector(':scope > .' + className);
    if (details) return details;
    details = element('details', 'v25-disclosure ' + className);
    details.appendChild(element('summary', '', title));
    if (anchor) anchor.after(details);
    else host.appendChild(details);
    return details;
  }
  function move(node, parent) {
    if (node && node.parentElement !== parent) parent.appendChild(node);
  }
  function sameText(a, b) {
    const normalized = (value) => value.trim().replace(/\s+/g, ' ');
    return normalized(a) === normalized(b);
  }
  function trimRepeatedDefinition(body, intro) {
    // Only the opening definition in the native noncase reader can be redundant.
    // Source provisions, case analysis and differently worded explanations are untouched.
    if (body.querySelector(':scope > .case-box')) return;
    const explanation = intro.querySelector('.r22-plain-text') || intro;
    const text = explanation.textContent;
    if (!text.trim()) return;
    const sections = body.querySelector(':scope > .entry-sections');
    const opening = sections?.children[0];
    const heading = opening?.querySelector(':scope > h3');
    const paragraph = opening?.querySelector(':scope > p');
    if (
      heading &&
      /^(Meaning|Explanation|Role in the course|Reading plan)$/i.test(heading.textContent.trim()) &&
      paragraph &&
      sameText(paragraph.textContent, text)
    ) {
      paragraph.remove();
      if ([...opening.children].every((child) => child === heading)) opening.remove();
      if (!sections.children.length) sections.remove();
    }
    for (const label of body.querySelectorAll(':scope > h3')) {
      if (!/^(Meaning|Explanation|Role in the course|Reading plan)$/i.test(label.textContent.trim()))
        continue;
      const notes = label.nextElementSibling;
      if (!notes?.classList.contains('note-text')) continue;
      const first = notes.children[0];
      if (first?.tagName !== 'P' || !sameText(first.textContent, text)) continue;
      first.remove();
      if (!notes.textContent.trim()) {
        notes.remove();
        label.remove();
      }
    }
  }
  function polishIntro(body) {
    // takeaways.js marks its own insertion, so removing the duplicate does not make it reinsert it.
    // Nothing here changes the graph summary, case sections or the full source brief.
    body.querySelectorAll(':scope > .dkla-rule-label').forEach((label) => label.remove());
    const intro = body.querySelector(':scope > .takeaway');
    if (!intro) return;
    intro.classList.add('v25-explanation');
    if (intro.querySelector('.r22-plain-text'))
      intro.querySelectorAll('.r22-rule-sub,.v25-legal-rule').forEach((duplicate) => duplicate.remove());
    trimRepeatedDefinition(body, intro);
  }
  function unwrap(details) {
    if (!details) return;
    for (const child of [...details.children]) if (child.tagName !== 'SUMMARY') details.before(child);
    details.remove();
  }
  function referenceFooter(body, sources, recall, terms) {
    const footer = [sources, recall, terms].filter(Boolean);
    const tail = [...body.children].slice(-footer.length);
    // Keep this idempotent: observers also watch the original source and term controls.
    if (footer.length && !footer.every((node, i) => tail[i] === node))
      footer.forEach((node) => body.appendChild(node));
  }
  function mainIntro() {
    if (!inspector || inspector.hidden) return;
    const body = inspector.querySelector('.reader-body');
    if (body) polishIntro(body);
  }

  /* ---------- the facets ---------- */
  // The order of the facet bar and of the page when it is printed.
  const FACETS = [
    'brief',
    'timeline',
    'flowchart',
    'canons',
    'lecture',
    'court',
    'cases',
    'connections',
    'sources',
    'study',
  ];
  // What each facet is called when the whole entry is printed (case.css shows these only in print).
  const PRINT = {
    timeline: 'Timeline',
    flowchart: 'Flowchart',
    canons: 'Canons',
    lecture: 'Lecture',
    court: 'The Court',
    cases: 'Cases',
    connections: 'Connections',
    sources: 'Sources',
    study: 'Study',
  };
  // Parts of the page that belong to no facet: the rail, the header and the facet bar.
  const HEAD = ['v32-head', 'dkla-course-tabs', 'v32-bar', 'v32-panel', 'v31-rail'];
  // [class, facet, place within the facet]. A block no rule names is part of the brief, after the six
  // parts, in the order its layer drew it, so nothing a later layer adds is ever lost.
  const RULES = [
    ['source-caution', 'brief', 0],
    ['v32-brief-head', 'brief', 1],
    ['takeaway', 'brief', 2],
    ['jump-note', 'brief', 3],
    ['study-roadmap', 'brief', 4],
    ['r19-prov', 'brief', 4],
    ['entry-sections', 'brief', 5],
    ['case-box', 'brief', 5],
    ['r19-brief', 'brief', 8],
    ['dkla-terms', 'brief', 9],
    ['v28-case-timelines', 'timeline', 0],
    ['dkla-timeline', 'timeline', 0],
    ['r21-also', 'timeline', 1],
    ['v31-chart-steps', 'flowchart', 0],
    ['fc-entry-links', 'flowchart', 0],
    ['canons-related', 'canons', 0],
    ['lecture-related', 'lecture', 0],
    ['sh-case-panel', 'court', 0],
    ['course-case-index', 'cases', 0],
    ['r6-connections', 'connections', 0],
    ['v32-sources', 'sources', 0],
    ['v25-source-details', 'sources', 2],
    ['dkla-file-chips', 'sources', 2],
    ['source-strip', 'sources', 2],
    ['r19-chiprow', 'sources', 2],
    ['civil-source-scope', 'sources', 2],
    ['authority-context', 'sources', 3],
    ['r18-recall', 'study', 0],
    ['v32-notes', 'study', 1],
    ['reading-actions', 'study', 2],
  ];
  function place(el, isCase) {
    const classes = el.classList;
    if (HEAD.some((name) => classes.contains(name))) return null;
    if (classes.contains('v32-fh')) return [el.dataset.v32Facet, -1];
    // "Questions this case helps answer" belongs with a case's connections; on a concept the same block
    // lists the further subjects, which belong with its cases.
    if (classes.contains('case-topics')) return [isCase ? 'connections' : 'cases', 1];
    if (classes.contains('quiet-details'))
      return el.querySelector('.metadata-grid') ? ['sources', 4] : ['study', 2];
    // The warning that a source is missing or partial stays at the top of the brief.
    if (classes.contains('civil-source-scope') && classes.contains('source-caution')) return ['brief', 0];
    // The section links gave way to the rail (case.css hides them); they stay with the brief.
    if (classes.contains('brief-jump')) return ['brief', 5];
    for (const [name, facet, rank] of RULES) if (classes.contains(name)) return [facet, rank];
    return ['brief', 6];
  }
  function printHeading(body, facet) {
    let h = body.querySelector(`:scope > h3.v32-fh[data-v32-facet="${facet}"]`);
    if (!h) {
      h = element('h3', 'v32-fh', PRINT[facet]);
      h.dataset.v32Facet = facet;
    }
    return h;
  }
  // A case's notes ("Qualifications and further discussion") are one section of the Study facet.
  function notesSection(body) {
    let section = body.querySelector(':scope > .v32-notes');
    const label = [...body.querySelectorAll(':scope > h3')].find((h) =>
      /^Notes$/i.test(h.textContent.trim()),
    );
    const text = label?.nextElementSibling?.classList.contains('note-text') ? label.nextElementSibling : null;
    if (!text) return section;
    section ||= element('section', 'v32-notes');
    section.appendChild(label);
    section.appendChild(text);
    if (section.parentElement !== body) body.appendChild(section);
    return section;
  }
  // The header of every entry that is a record of the map: its name, then (case.js) the citation line,
  // then the line that says what its picture shows. The rule and concept readers share it with cases.
  function header(body) {
    const title = body.querySelector('.dkla-record-title');
    if (!title) return null;
    let head = body.querySelector(':scope > .v32-head');
    if (!head) {
      head = element('header', 'v25-record-header v32-head');
      title.before(head);
    }
    move(title, head);
    if (!head.querySelector(':scope > .v32-meta')) head.appendChild(element('p', 'v32-meta'));
    // The entry's picture and the line that says what it shows are one row. An entry whose picture
    // only says what kind of entry it is (a concept, a rule) gets that word beside it.
    const symbol = title.querySelector(':scope > svg') || head.querySelector(':scope > .v32-tag > svg');
    const caption = body.querySelector('.dkla-icon-caption');
    let tag = head.querySelector(':scope > .v32-tag');
    if (symbol || caption) {
      if (!tag) {
        tag = element('div', 'v32-tag');
        head.appendChild(tag);
      }
      if (symbol && symbol.parentElement !== tag) tag.prepend(symbol);
      if (caption && caption.parentElement !== tag) tag.appendChild(caption);
      const kind = tag.querySelector(':scope > .v32-kind');
      const word = caption ? '' : kindWord();
      if (word && !kind) tag.appendChild(element('span', 'v32-kind', word));
      else if (kind && kind.textContent !== word) kind.remove();
    }
    return head;
  }
  function kindWord() {
    try {
      const kind = selected?.type === 'node' ? nodesById.get(selected.id)?.kind : '';
      return { Hypothetical: 'Problem', Case: '' }[kind] ?? (kind || '');
    } catch {
      return '';
    }
  }
  // The facet bar: the Cold Call button's place, then the tabs (case.js fills and runs them).
  function facetBar(body) {
    let bar = body.querySelector(':scope > .v32-bar');
    if (!bar) {
      bar = element('div', 'v32-bar');
      bar.appendChild(element('div', 'v32-cc'));
      const tabs = element('div', 'v32-tabs');
      tabs.setAttribute('role', 'tablist');
      tabs.setAttribute('aria-label', 'Parts of this entry');
      bar.appendChild(tabs);
      body.appendChild(bar);
    }
    let panel = body.querySelector(':scope > .v32-panel');
    if (!panel) {
      panel = element('div', 'v32-panel');
      panel.setAttribute('role', 'tabpanel');
      panel.id = 'v32Panel';
      body.appendChild(panel);
    }
    return [bar, panel];
  }
  // The Brief facet's first line: what the hero is ("The rule in plain English") and, where an audited
  // full brief exists, the one switch between the short brief and the full one.
  function briefHead(body, isCase) {
    let row = body.querySelector(':scope > .v32-brief-head');
    const rule = body.querySelector(':scope > .takeaway');
    const full = body.querySelector(':scope > .r19-brief [data-r19-fill]');
    if (!isCase || (!rule && !full)) {
      row?.remove();
      return;
    }
    if (!row) {
      row = element('div', 'v32-brief-head');
      row.appendChild(element('p', 'v32-label', 'The rule in plain English'));
      body.appendChild(row);
    }
    let pick = row.querySelector('.v32-seg');
    if (full && !pick) {
      pick = element('div', 'v32-seg');
      pick.setAttribute('role', 'group');
      pick.setAttribute('aria-label', 'Which brief to read');
      for (const [mode, text, title] of [
        ['short', 'Short', 'The rule and the six parts'],
        ['full', 'Full', 'The complete audited brief'],
      ]) {
        const button = element('button', '', text);
        button.type = 'button';
        button.title = title;
        button.dataset.v32Mode = mode;
        button.setAttribute('aria-pressed', String(mode === 'short'));
        pick.appendChild(button);
      }
      row.appendChild(pick);
    } else if (!full && pick) pick.remove();
  }

  /* One order, owned here, so no two layers move the same block: the rail, the header, the facet bar,
     then every facet's blocks in the order of the bar. It is applied only when it differs, and at
     most a few times a frame (a guard against two layers fighting over one block). */
  let reorders = 0;
  function arrange(body, isCase) {
    const [bar, panel] = facetBar(body);
    const rank = new Map();
    const used = new Set();
    [...body.children].forEach((el, i) => {
      const at = place(el, isCase);
      if (!at) {
        const head = HEAD.findIndex((name) => el.classList.contains(name));
        rank.set(el, [-1, head, i]);
        return;
      }
      const [facet, order] = at;
      if (el.dataset.v32Facet !== facet) el.dataset.v32Facet = facet;
      if (order >= 0) used.add(facet);
      rank.set(el, [FACETS.indexOf(facet), order, i]);
    });
    // A heading per facet for the printed page (never one for a facet with nothing in it).
    for (const facet of FACETS) {
      if (!PRINT[facet]) continue;
      const h = printHeading(body, facet);
      if (used.has(facet)) rank.set(h, [FACETS.indexOf(facet), -1, 0]);
      else {
        rank.delete(h);
        h.remove();
      }
    }
    const wanted = [...rank.keys()].sort((a, b) => {
      const x = rank.get(a),
        y = rank.get(b);
      return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
    });
    const now = [...body.children];
    if (wanted.length !== now.length || wanted.some((node, i) => node !== now[i])) {
      if (++reorders > 8) return;
      if (reorders === 1) {
        const later = globalThis.requestAnimationFrame || globalThis.setTimeout;
        if (later) later(() => (reorders = 0));
        else reorders = 0;
      }
      body.append(...wanted);
    }
    return [bar, panel];
  }
  function entryKind() {
    if (typeof selected === 'undefined' || !selected) return null;
    return selected.type;
  }
  function mainEntry() {
    if (!inspector || inspector.hidden) return;
    const body = inspector.querySelector('.reader-body');
    if (!body) return;
    const isCase = !!body.querySelector(':scope > .case-box');
    // Rule and authority pages, a connection and a subject's reader have one facet and no record header.
    const head = header(body);
    if (!head) {
      body.classList.add('v32-plain');
      return;
    }
    // Only an entry of the map has facets (in the page; a test page has no selection and is a case).
    if (!isCase && entryKind() !== 'node' && entryKind() !== null) {
      body.classList.add('v32-plain');
      return;
    }
    body.classList.add('v32');
    if (isCase) body.classList.add('v25-case-reader', 'v31-case', 'v32-case');
    polishIntro(body);
    // Timelines keep their own order inside one group.
    const timelines = [...body.querySelectorAll(':scope > .dkla-timeline')];
    if (isCase && timelines.length) {
      let group = body.querySelector(':scope > .v28-case-timelines');
      if (!group) {
        group = element('section', 'v28-case-timelines');
        body.appendChild(group);
      }
      timelines.forEach((timeline) => move(timeline, group));
    }
    // Every source row an earlier layer drew stays in one place; case.js lists them once.
    if (isCase) {
      const sourceRows = [
        ...body.querySelectorAll(
          ':scope > .dkla-file-chips,:scope > .source-strip,:scope > .r19-chiprow,:scope > .civil-source-scope:not(.source-caution)',
        ),
      ];
      if (sourceRows.length) {
        const sources = disclosure(body, 'v25-source-details', 'Sources and assigned reading');
        sourceRows.forEach((row) => move(row, sources));
      }
      notesSection(body);
    }
    unwrap(body.querySelector(':scope > .v25-study-tools'));
    unwrap(body.querySelector(':scope > .v25-term-details'));
    briefHead(body, isCase);
    rail(body, isCase);
    const made = arrange(body, isCase);
    if (made) move(body.querySelector('[data-cold-call]'), made[0].querySelector('.v32-cc'));
    markPlace();
  }

  /* The rail: the rule and the six parts of the brief, in the margin beside it. It exists only while
     the Brief facet shows the short brief (case.css). Rebuilt only when the list of places changes. */
  const BRIEF_SHORT = { 'Procedural History': 'Procedure', 'Material Facts': 'Facts' };
  function places(body) {
    const list = [];
    const add = (label, target, number) => target && list.push([label, target, number]);
    add('The rule', body.querySelector(':scope > .takeaway'));
    body.querySelectorAll(':scope > .case-box > section > h3').forEach((h, i) => {
      const text = h.textContent.trim();
      add(BRIEF_SHORT[text] || text, h, i + 1);
    });
    return list;
  }
  function rail(body, isCase) {
    let nav = body.querySelector(':scope > .v31-rail');
    const list = isCase ? places(body) : [];
    if (list.length < 2) {
      nav?.remove();
      return;
    }
    watchBody(body);
    const signature = list.map(([label]) => label).join('|');
    if (nav && nav.dataset.v31Places === signature) {
      nav.v31Targets = list.map(([, target]) => target);
      return;
    }
    if (!nav) {
      nav = element('nav', 'v31-rail');
      nav.setAttribute('aria-label', 'Parts of the brief');
      body.appendChild(nav);
    }
    nav.dataset.v31Places = signature;
    nav.v31Targets = list.map(([, target]) => target);
    const inner = element('div', 'v31-rail-inner');
    list.forEach(([label, , number], i) => {
      const button = element('button', '');
      button.type = 'button';
      button.dataset.v31Place = String(i);
      // The number is its own element so the names line up; together they read "5 Holding".
      button.appendChild(element('span', 'v32-n', number ? String(number) + ' ' : ''));
      button.appendChild(element('span', '', label));
      inner.appendChild(button);
    });
    nav.replaceChildren(inner);
  }
  /* Which place the rail marks: the one a reader is at. That is the first heading in the top third of
     the reading area (below the sticky strip and facet bar); when no heading is there, the part whose
     text fills the top of the area; and at the very end of the page, the last heading in view. */
  let pinned = -1,
    pinTimer = 0,
    markFrame = 0;
  // Where the reading area starts: under the top strip and, on an entry with facets, the facet bar.
  function readingTop() {
    const box = inspector.getBoundingClientRect();
    let top = box.top + (inspector.querySelector('.reader-top')?.offsetHeight || 0);
    const bar = inspector.querySelector('.reader-body > .v32-bar');
    if (bar?.getClientRects().length) top += bar.offsetHeight;
    return top;
  }
  function placeNow(nav) {
    const box = inspector.getBoundingClientRect();
    const top = readingTop(),
      height = box.bottom - top,
      band = top + Math.max(96, height * 0.3);
    const tops = nav.v31Targets.map((target) =>
      target.isConnected && target.getClientRects().length ? target.getBoundingClientRect().top : null,
    );
    let current = 0,
      inBand = -1,
      lastInView = -1;
    tops.forEach((y, i) => {
      if (y === null) return;
      if (y <= top + 24) current = i;
      else if (inBand < 0 && y <= band) inBand = i;
      if (y < box.bottom - 24) lastInView = i;
    });
    const atEnd =
      inspector.scrollTop > 0 && inspector.scrollTop >= inspector.scrollHeight - inspector.clientHeight - 2;
    if (atEnd && lastInView >= 0) return lastInView;
    // A heading sitting exactly where a rail click puts it wins over one further down the band.
    const landed = tops[current] !== null && tops[current] > top - 4;
    return inBand >= 0 && !landed ? inBand : current;
  }
  function markPlace() {
    markFrame = 0;
    const nav = inspector?.querySelector('.reader-body > .v31-rail');
    if (!nav?.v31Targets || !nav.getClientRects().length) return;
    const current = pinned >= 0 && pinned < nav.v31Targets.length ? pinned : placeNow(nav);
    nav.querySelectorAll('[data-v31-place]').forEach((button, i) => {
      if (i === current) {
        if (button.getAttribute('aria-current') !== 'location')
          button.setAttribute('aria-current', 'location');
      } else if (button.hasAttribute('aria-current')) button.removeAttribute('aria-current');
    });
  }
  // At most once a frame, however many scroll events arrive.
  function markSoon() {
    if (!markFrame) markFrame = (globalThis.requestAnimationFrame || setTimeout)(markPlace);
  }
  function unpin() {
    if (pinned < 0) return;
    pinned = -1;
    clearTimeout(pinTimer);
    markSoon();
  }
  if (inspector?.addEventListener) {
    inspector.addEventListener('scroll', markSoon, { passive: true });
    // The visitor takes over: the mark follows the page again at once.
    for (const type of ['wheel', 'touchstart', 'keydown'])
      inspector.addEventListener(type, unpin, { passive: true });
  }
  // The page under the rail can change height without scrolling (a late brief, another facet): the
  // reader's body is watched for its size, the one that is open now.
  const sizes = typeof ResizeObserver === 'function' ? new ResizeObserver(markSoon) : null;
  let watched = null;
  function watchBody(body) {
    if (!sizes || body === watched) return;
    sizes.disconnect();
    sizes.observe((watched = body));
  }
  /* Bring a block of the reader to the top of the reading area: used by the rail, and by anything that
     used to scroll the one long page to a part (case.js switches to the block's facet first). */
  function scrollToBlock(target, pin) {
    if (!target?.isConnected) return;
    // Asked again on every frame of the scroll, so it lands on the block even if the page above it
    // changes height on the way.
    const top = () =>
      inspector.scrollTop +
      target.getBoundingClientRect().top -
      readingTop() -
      (inspector.querySelector('.reader-body > .v32-bar') ? 24 : 16);
    if (pin >= 0) {
      // The clicked place is marked at once and stays marked while the page travels to it (about a
      // quarter of a second; src/features/calm/calm.js stops the travel if the visitor scrolls).
      pinned = pin;
      markPlace();
      clearTimeout(pinTimer);
      pinTimer = setTimeout(unpin, 320);
    }
    if (window.DKLACalm?.scrollTo) window.DKLACalm.scrollTo(inspector, top, 250);
    else inspector.scrollTo({ top: top() });
  }
  if (inspector?.addEventListener)
    inspector.addEventListener('click', (event) => {
      const button = event.target.closest('.v31-rail [data-v31-place]');
      if (!button) return;
      const target = button.closest('.v31-rail').v31Targets?.[Number(button.dataset.v31Place)];
      scrollToBlock(target, Number(button.dataset.v31Place));
    });
  function supportingCase() {
    if (!supporting) return;
    const line = supporting.querySelector('.r19-line');
    if (!line || !supporting.querySelector(':scope > .r19-rule,:scope > .r19-sec,:scope > .r19-text')) {
      supporting.classList.remove('v25-support-reader');
      return;
    }
    supporting.classList.add('v25-support-reader');
    let actions = supporting.querySelector(':scope > .v25-support-actions');
    if (!actions) {
      actions = element('div', 'v25-support-actions');
      line.before(actions);
    }
    for (const button of line.querySelectorAll('[data-cold-call],[data-r19-back],[data-r19-node]'))
      move(button, actions);
    let sources = supporting.querySelector(':scope > .v25-support-sources');
    if (line.children.length) {
      sources ||= disclosure(supporting, 'v25-support-sources', 'Sources and review');
      move(line, sources);
    }
    // Supporting briefs already contain their holding and full legal account.
    // The introductory one-line rule repeats that content without adding an explanation.
    if (supporting.querySelector(':scope > .r19-sec'))
      supporting.querySelector(':scope > .r19-rule')?.remove();
    unwrap(supporting.querySelector(':scope > .v25-term-details'));
    const terms = supporting.querySelector('.r20-terms');
    referenceFooter(supporting, sources, null, terms);
  }
  function paint() {
    mainIntro();
    mainEntry();
    supportingCase();
    // The facet bar, the header's lines and the one list of sources (src/features/v32/case.js).
    window.DKLAReader?.sync?.();
  }
  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      paint();
    });
  }
  for (const panel of [inspector, supporting])
    if (panel) {
      new MutationObserver(schedule).observe(panel, { childList: true, subtree: true });
    }
  window.DKLAReading = { paint, FACETS, scrollToBlock, readingTop };
  paint();
})();
