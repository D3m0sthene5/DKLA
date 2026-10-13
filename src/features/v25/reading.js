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
    referenceFooter(body, sources, recall, terms);
  }
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
