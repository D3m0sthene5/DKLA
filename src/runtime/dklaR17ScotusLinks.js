/* DKLA r17: link each sourced case vote panel to that case in SCOTUS History. */
(() => {
  'use strict';
  // Source-gap notes from earlier releases remain clickable alongside their
  // later, fully briefed Case entries. These three refer to the *same* rulings.
  const caseAliases = {
    'lrs-gap-04-03': 'lrs-k-train',
    'lrs-gap-06-01': 'lrs-k-epic',
    'lrs-gap-11-01': 'lrs-s-slaughter',
  };

  function element(tag, text, className) {
    const item = document.createElement(tag);
    if (text != null) item.textContent = text;
    if (className) item.className = className;
    return item;
  }

  function voteLabel(v) {
    if (v.alignment === 'nonparticipation') return 'Did not participate';
    if (v.alignment === 'divided') return 'Participated; side not published';
    if (v.opinion === 'majority') return 'Opinion author';
    if (v.opinion === 'plurality') return 'Plurality author';
    if (v.opinion === 'special concurrence') return 'Concurred in judgment';
    if (v.opinion === 'concurrence') return 'Concurrence';
    if (v.alignment === 'dissent') return v.opinion === 'dissent' ? 'Dissenting opinion' : 'Dissent';
    return 'Joined judgment';
  }

  function addAliasPanel(inspector, cases) {
    const id = typeof selected !== 'undefined' && selected?.type === 'node' ? selected.id : null;
    const target = caseAliases[id];
    const record = cases[target];
    if (!record) return;
    const body = inspector.querySelector('.reader-body');
    if (!body || body.querySelector('.r17-scotus-alias')) return;

    const section = element('section', null, 'sh-case-panel r17-scotus-alias');
    section.setAttribute('aria-label', 'Supreme Court voting record');
    section.append(element('div', 'Supreme Court · voting record', 'sh-kicker'));
    section.append(element('h3', record.title));
    section.append(element('div', [record.date, record.citation].filter(Boolean).join(' · '), 'sh-case-meta'));
    for (const [index, decision] of record.decisions.entries()) {
      const title = record.decisions.length > 1 ? `Question ${index + 1}: ` : '';
      section.append(element('p', `${title}${decision.headline || `${decision.for}–${decision.against}`}${decision.description ? ` · ${decision.description}` : ''}`, 'r17-alias-tally'));
      const votes = element('div', null, 'r17-alias-votes');
      for (const vote of [...decision.votes].sort((a, b) => (a.seniority ?? Infinity) - (b.seniority ?? Infinity))) {
        const item = element('div', null, 'r17-alias-vote');
        item.dataset.align = vote.alignment;
        item.append(element('strong', window.SCOTUSHistory.data.people[vote.justice]?.name || vote.justice));
        item.append(element('span', voteLabel(vote)));
        votes.append(item);
      }
      section.append(votes);
      if (decision.note) section.append(element('p', decision.note, 'sh-note'));
    }
    const actions = element('div', null, 'sh-panel-actions');
    const history = element('button', 'Open this case in SCOTUS History →', 'r17-scotus-link');
    history.type = 'button';
    history.dataset.shCase = target;
    actions.append(history);
    const brief = element('button', 'Read the case brief →');
    brief.type = 'button';
    brief.dataset.shRead = target;
    actions.append(brief);
    section.append(actions);
    const sources = element('div', null, 'sh-source');
    for (const source of record.sources.filter(s => /^https:\/\//.test(s.url))) {
      const link = element('a', `${source.label} ↗`);
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      sources.append(link);
    }
    section.append(sources);
    const marker = body.querySelector('.reading-actions');
    if (marker) marker.before(section);
    else body.append(section);
  }

  function linkPanels() {
    const inspector = document.getElementById('inspector');
    const cases = window.SCOTUSHistory?.data?.cases;
    if (!inspector || !cases) return;

    // r16 already provides the sourced vote breakdown. Use its case identifier
    // and its delegated data-sh-case action rather than duplicating vote data.
    for (const panel of inspector.querySelectorAll('.sh-case-panel[data-sh-panel]')) {
      const id = panel.dataset.shPanel;
      if (!Object.prototype.hasOwnProperty.call(cases, id)) continue;
      const actions = panel.querySelector('.sh-panel-actions');
      if (!actions || actions.querySelector('.r17-scotus-link')) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'r17-scotus-link';
      button.dataset.shCase = id;
      button.textContent = 'Open this case in SCOTUS History →';
      button.setAttribute('aria-label', `Open ${cases[id].title} in SCOTUS History`);
      actions.prepend(button);
    }
    addAliasPanel(inspector, cases);
  }

  function install() {
    const inspector = document.getElementById('inspector');
    if (!inspector || !window.SCOTUSHistory || typeof window.renderInspector !== 'function') {
      setTimeout(install, 100);
      return;
    }

    const original = window.renderInspector;
    window.renderInspector = function (...args) {
      const result = original.apply(this, args);
      linkPanels();
      return result;
    };

    // r16 redraws a vote panel directly when the voting question or sort order
    // changes, without calling renderInspector. Reattach the link after that redraw.
    new MutationObserver(linkPanels).observe(inspector, {childList: true, subtree: true});
    linkPanels();
  }

  install();
})();
