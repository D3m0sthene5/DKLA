/* v2.5 reading layout. Explicit DOM adapters retain original nodes and delegated handlers.
 * The introduction is one explanation; legal analysis and source text remain farther down.
 * Case headers only: rule/concept panels keep their provision-placement contract.
 * No source, graph, case prose, saved edits or map geometry is changed here.
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
      footer.forEach((node) => moveToEnd(node, body));
  }
  function moveToEnd(node, parent) {
    parent.appendChild(node);
  }
  function mainIntro() {
    if (!inspector || inspector.hidden) return;
    const body = inspector.querySelector('.reader-body');
    if (body) polishIntro(body);
  }
  function mainCase() {
    if (!inspector || inspector.hidden) return;
    const body = inspector.querySelector('.reader-body');
    if (!body || !body.querySelector(':scope > .case-box')) return;
    const title = body.querySelector('.dkla-record-title');
    if (!title) return;
    body.classList.add('v25-case-reader');
    let header = body.querySelector(':scope > .v25-record-header');
    if (!header) {
      header = element('header', 'v25-record-header');
      title.before(header);
    }
    move(title, header);
    // The factual icon caption belongs with the title, before the action row.
    const caption = body.querySelector('.dkla-icon-caption');
    let actions = header.querySelector('.v25-record-actions');
    if (!actions) {
      actions = element('div', 'v25-record-actions');
      header.appendChild(actions);
    }
    if (caption && caption.parentElement !== header) header.insertBefore(caption, actions);
    move(body.querySelector('[data-cold-call]'), actions);
    const original = body.querySelector('.r28-original-sources [data-dkla-file]');
    const selectedId = typeof selected !== 'undefined' && selected?.type === 'node' ? selected.id : null;
    const registry = window.DKLABriefs?.data;
    const registered = registry?.sourceLinks?.[registry?.map?.[selectedId] || selectedId]?.find(
      (s) => s.path,
    );
    if ((original || registered) && !actions.querySelector('[data-v28-source]')) {
      const button = element('button', 'v28-source', 'Original source');
      button.type = 'button';
      button.dataset.v28Source = '';
      button.dataset.dklaFile = original?.dataset.dklaFile || registered.path + '#page=' + registered.page;
      button.title = original?.title || registered.label;
      actions.appendChild(button);
    }
    if (
      body.querySelector('.r19-brief .r19-full:not(.r19-auditbox)') &&
      !actions.querySelector('[data-v25-full-brief]')
    ) {
      const button = element('button', 'v25-full-brief', 'Full brief');
      button.type = 'button';
      button.dataset.v25FullBrief = '';
      actions.appendChild(button);
    }
    polishIntro(body);
    // Timelines are the main reading feature, directly after the short summary.
    // Keep every timeline and its controls in their original order.
    const timelines = [...body.querySelectorAll(':scope > .dkla-timeline')];
    let group = body.querySelector(':scope > .v28-case-timelines');
    if (timelines.length) {
      if (!group) {
        group = element('section', 'v28-case-timelines');
        body.appendChild(group);
      }
      timelines.forEach((timeline) => move(timeline, group));
    }
    // caseOrder() places the timelines under "Where this case sits".
    const sourceRows = [
      ...body.querySelectorAll(
        ':scope > .dkla-file-chips,:scope > .source-strip,:scope > .r19-chiprow,:scope > .civil-source-scope:not(.source-caution)',
      ),
    ];
    let sources = body.querySelector(':scope > .v25-source-details');
    if (sourceRows.length) {
      sources ||= disclosure(body, 'v25-source-details', 'Sources and assigned reading');
      sourceRows.forEach((row) => move(row, sources));
    }
    unwrap(body.querySelector(':scope > .v25-study-tools'));
    unwrap(body.querySelector(':scope > .v25-term-details'));
    const recall = body.querySelector('.r18-recall');
    const terms = body.querySelector('.dkla-terms');
    caseOrder(body, header, group, sources, recall, terms);
  }
  /* v3.1 case page (owner-approved audit, 18 November 2026). One order, owned here, so no two
     modules move the same blocks: the header, the rule, "Where this case sits" (timelines and the
     flowchart steps flowcharts.js draws), the brief, connections, then every source and record
     drawer, then study. Nothing is removed: the separate Notes block moves into a drawer, and the
     section links give way to the rail. Blocks this list does not know stay between connections
     and sources. The order is applied only when it differs, so the observers settle. */
  function heading(body, key, text) {
    let h = body.querySelector(`:scope > h3.v31-h[data-v31-h="${key}"]`);
    if (!h) {
      h = element('h3', 'v31-h', text);
      h.dataset.v31H = key;
      h.tabIndex = -1;
    }
    return h;
  }
  function notesDrawer(body) {
    let drawer = body.querySelector(':scope > .v31-notes');
    const label = [...body.querySelectorAll(':scope > h3')].find((h) =>
      /^Notes$/i.test(h.textContent.trim()),
    );
    const text = label?.nextElementSibling?.classList.contains('note-text') ? label.nextElementSibling : null;
    if (!text) return drawer;
    drawer ||= element('details', 'v25-disclosure v31-notes');
    if (!drawer.querySelector(':scope > summary')) drawer.appendChild(element('summary', '', 'Case notes'));
    drawer.appendChild(text);
    label.remove();
    return drawer;
  }
  let reorders = 0;
  function caseOrder(body, header, group, sources, recall, terms) {
    body.classList.add('v31-case');
    const one = (selector) => body.querySelector(':scope > ' + selector);
    const quiet = [...body.querySelectorAll(':scope > details.quiet-details')];
    const record = quiet.find((d) => d.querySelector('.metadata-grid'));
    const editing = quiet.find((d) => d.querySelector('.reading-actions'));
    const charts = one('.v31-chart-steps') || one('.fc-entry-links');
    // Sol's canon index (canons.js) and lecture notes (lectures.js) draw their own blocks; the canons
    // a case illustrates belong with where it sits, the lecture notes with its sources.
    const canons = one('.canons-related');
    const lectures = one('.lecture-related');
    const where = group || charts || canons ? heading(body, 'where', 'Where this case sits') : null;
    const head = [
      one('.v31-rail'),
      header,
      one('.takeaway'),
      where,
      group,
      charts,
      canons,
      heading(body, 'brief', 'The brief'),
      one('.brief-jump'),
      one('.case-box'),
      one('.r6-connections'),
      one('.case-topics'),
    ].filter(Boolean);
    const tail = [
      heading(body, 'sources', 'Sources'),
      lectures,
      record,
      notesDrawer(body),
      one('.r19-brief'),
      one('.authority-context'),
      editing,
      sources,
      recall,
      terms,
    ].filter(Boolean);
    const known = new Set([...head, ...tail]);
    const rest = [...body.children].filter((child) => !known.has(child));
    const wanted = [...head, ...rest, ...tail];
    const now = [...body.children];
    if (wanted.length !== now.length || wanted.some((node, i) => node !== now[i])) {
      // A guard against two modules fighting over one block: at most a few reorders per frame.
      if (++reorders > 8) return;
      if (reorders === 1) {
        const later = globalThis.requestAnimationFrame || globalThis.setTimeout;
        if (later) later(() => (reorders = 0));
        else reorders = 0;
      }
      body.append(...wanted);
    }
    rail(body);
  }
  // "On this page": the rule, timeline, flowchart steps, the six brief parts, connections,
  // sources and study. Rebuilt only when the list of places changes.
  const BRIEF_SHORT = { 'Procedural History': 'Procedure', 'Material Facts': 'Facts' };
  function places(body) {
    const list = [];
    const add = (label, target) => target && list.push([label, target]);
    add('The rule', body.querySelector(':scope > .takeaway'));
    add('Timeline', body.querySelector(':scope > .v28-case-timelines'));
    add('Flowchart steps', body.querySelector(':scope > .v31-chart-steps'));
    add('Canons', body.querySelector(':scope > .canons-related'));
    body.querySelectorAll(':scope > .case-box > section > h3').forEach((h, i) => {
      const text = h.textContent.trim();
      add(`${i + 1} ${BRIEF_SHORT[text] || text}`, h);
    });
    add('Connections', body.querySelector(':scope > .r6-connections'));
    add('Sources', body.querySelector(':scope > h3.v31-h[data-v31-h="sources"]'));
    add('Study', body.querySelector(':scope > .r18-recall'));
    return list;
  }
  function rail(body) {
    watchBody(body);
    const list = places(body);
    const signature = list.map(([label]) => label).join('|');
    let nav = body.querySelector(':scope > .v31-rail');
    if (nav && nav.dataset.v31Places === signature) {
      nav.v31Targets = list.map(([, target]) => target);
      return;
    }
    if (!nav) {
      nav = element('nav', 'v31-rail');
      nav.setAttribute('aria-label', 'On this page');
      body.prepend(nav);
    }
    nav.dataset.v31Places = signature;
    nav.v31Targets = list.map(([, target]) => target);
    const inner = element('div', 'v31-rail-inner');
    inner.appendChild(element('p', 'v31-rail-label', 'On this page'));
    list.forEach(([label], i) => {
      const button = element('button', '', label);
      button.type = 'button';
      button.dataset.v31Place = String(i);
      if (/^\d/.test(label)) button.classList.add('v31-rail-brief');
      inner.appendChild(button);
    });
    nav.replaceChildren(inner);
    markPlace();
  }
  /* Which place the rail marks: the one a reader is at. That is the first heading in the top
     third of the reading area (below the sticky strip); when no heading is there, the part whose
     text fills the top of the area; and at the very end of the page, the last heading in view.
     (Before v3.2 it was the last heading above a line 120 px down, which stayed on the part
     before until the next heading had almost left the screen.) */
  let pinned = -1,
    pinTimer = 0,
    markFrame = 0;
  function placeNow(nav) {
    const box = inspector.getBoundingClientRect();
    const top = box.top + (inspector.querySelector('.reader-top')?.offsetHeight || 0),
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
    if (!nav?.v31Targets) return;
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
  // The page under the rail can change height without scrolling (a drawer, a late brief): the
  // reader's body is watched for its size, the one that is open now.
  const sizes = typeof ResizeObserver === 'function' ? new ResizeObserver(markSoon) : null;
  let watched = null;
  function watchBody(body) {
    if (!sizes || body === watched) return;
    sizes.disconnect();
    sizes.observe((watched = body));
  }
  if (inspector?.addEventListener)
    inspector.addEventListener('click', (event) => {
      const button = event.target.closest('.v31-rail [data-v31-place]');
      if (!button) return;
      const target = button.closest('.v31-rail').v31Targets?.[Number(button.dataset.v31Place)];
      if (!target?.isConnected) return;
      const offset = (inspector.querySelector('.reader-top')?.offsetHeight || 0) + 16;
      const top =
        inspector.scrollTop +
        target.getBoundingClientRect().top -
        inspector.getBoundingClientRect().top -
        offset;
      // The clicked place is marked at once and stays marked while the page travels to it (about a
      // quarter of a second; src/features/calm/calm.js stops the travel if the visitor scrolls).
      pinned = Number(button.dataset.v31Place);
      markPlace();
      clearTimeout(pinTimer);
      pinTimer = setTimeout(unpin, 320);
      if (window.DKLACalm?.scrollTo) window.DKLACalm.scrollTo(inspector, top, 250);
      else inspector.scrollTo({ top });
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
    mainCase();
    supportingCase();
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
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-v25-full-brief]');
    if (!button || !inspector?.contains(button)) return;
    const details = inspector.querySelector('.r19-brief .r19-full:not(.r19-auditbox)');
    if (!details) return;
    details.open = true;
    details.scrollIntoView({ block: 'start', behavior: 'instant' });
    details.querySelector('summary')?.focus({ preventScroll: true });
  });
  window.DKLAReading = { paint };
  paint();
})();
