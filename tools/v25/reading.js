/* v2.5 reading layout. Explicit DOM adapters retain original nodes, text and delegated handlers.
 * Case views only: rule/concept panels keep their provision-placement contract.
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
    if (anchor) anchor.after(details); else host.appendChild(details);
    return details;
  }
  function move(node, parent) { if (node && node.parentElement !== parent) parent.appendChild(node); }
  function polishTakeaway(body) {
    const rule = body.querySelector('.takeaway.r22-plain');
    if (!rule) return;
    const label = body.querySelector(':scope > .dkla-rule-label');
    if (label && label.textContent !== 'At a glance') label.textContent = 'At a glance';
    const formal = rule.querySelector('.r22-rule-sub');
    if (!formal || formal.closest('.v25-legal-rule')) return;
    const details = element('details', 'v25-legal-rule');
    details.appendChild(element('summary', '', 'Legal rule'));
    formal.before(details); details.appendChild(formal);
  }
  function mainCase() {
    if (!inspector || inspector.hidden) return;
    const body = inspector.querySelector('.reader-body');
    if (!body || !body.querySelector(':scope > .case-box')) return;
    const title = body.querySelector('.dkla-record-title');
    if (!title) return;
    body.classList.add('v25-case-reader');
    let header = body.querySelector(':scope > .v25-record-header');
    if (!header) { header = element('header', 'v25-record-header'); title.before(header); }
    move(title, header);
    // The factual icon caption belongs with the title, before the action row.
    const caption = body.querySelector('.dkla-icon-caption');
    let actions = header.querySelector('.v25-record-actions');
    if (!actions) { actions = element('div', 'v25-record-actions'); header.appendChild(actions); }
    if (caption && caption.parentElement !== header) header.insertBefore(caption, actions);
    move(body.querySelector('[data-cold-call]'), actions);
    if (body.querySelector('.r19-brief .r19-full:not(.r19-auditbox)') && !actions.querySelector('[data-v25-full-brief]')) {
      const button = element('button', 'v25-full-brief', 'Full brief');
      button.type = 'button'; button.dataset.v25FullBrief = ''; actions.appendChild(button);
    }
    polishTakeaway(body);
    const takeaway = body.querySelector(':scope > .takeaway');
    const sourceRows = [...body.querySelectorAll(':scope > .dkla-file-chips,:scope > .source-strip,:scope > .r19-chiprow,:scope > .civil-source-scope:not(.source-caution)')];
    if (sourceRows.length) {
      const sources = disclosure(body, 'v25-source-details', 'Sources and assigned reading', takeaway || header);
      sourceRows.forEach(row => move(row, sources));
    }
    const recall = body.querySelector('.r18-recall');
    if (recall) {
      const study = disclosure(body, 'v25-study-tools', 'Study tools', body.querySelector('.v25-source-details') || takeaway || header);
      move(recall, study);
    }
    const terms = body.querySelector('.dkla-terms');
    if (terms && !terms.closest('.v25-term-details')) {
      const name = terms.querySelector('h3')?.textContent || 'Legal terms';
      const details = element('details', 'v25-disclosure v25-term-details');
      details.appendChild(element('summary', '', name.replace('Terms in this entry', 'Legal terms')));
      terms.before(details); details.appendChild(terms);
    }
  }
  function supportingCase() {
    if (!supporting) return;
    const line = supporting.querySelector('.r19-line');
    if (!line || !supporting.querySelector(':scope > .r19-rule,:scope > .r19-text')) {
      supporting.classList.remove('v25-support-reader'); return;
    }
    supporting.classList.add('v25-support-reader');
    let actions = supporting.querySelector(':scope > .v25-support-actions');
    if (!actions) { actions = element('div', 'v25-support-actions'); line.before(actions); }
    for (const button of line.querySelectorAll('[data-cold-call],[data-r19-back],[data-r19-node]')) move(button, actions);
    if (line.children.length) {
      const sources = disclosure(supporting, 'v25-support-sources', 'Sources and review', actions);
      move(line, sources);
    }
    const terms = supporting.querySelector('.r20-terms');
    if (terms && !terms.closest('.v25-term-details')) {
      const details = disclosure(supporting, 'v25-term-details', 'Legal terms', supporting.querySelector(':scope > .r19-rule') || actions);
      move(terms, details);
    }
  }
  function paint() { mainCase(); supportingCase(); }
  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; paint(); });
  }
  for (const panel of [inspector, supporting]) if (panel) {
    new MutationObserver(schedule).observe(panel, {childList:true, subtree:true});
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-v25-full-brief]');
    if (!button || !inspector?.contains(button)) return;
    const details = inspector.querySelector('.r19-brief .r19-full:not(.r19-auditbox)');
    if (!details) return;
    details.open = true;
    details.scrollIntoView({block:'start', behavior:'instant'});
    details.querySelector('summary')?.focus({preventScroll:true});
  });
  window.DKLAReading = {paint};
  paint();
})();
