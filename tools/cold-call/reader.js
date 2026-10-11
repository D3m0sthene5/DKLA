/* Authored Cold Call narratives. Display only: graph, briefs and source prose stay untouched. */
(() => {
  'use strict';
  const block = document.getElementById('dklaColdCallData');
  if (!block || window.DKLAColdCall) return;
  const dataset = JSON.parse(block.textContent);
  const cases = new Map(dataset.cases.filter(c => c.origin === 'narrative').map(c => [c.id, c]));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lines = value => Array.isArray(value) ? value : [value];
  const memory = new Map(), wide = matchMedia('(min-width: 900px)');
  let current = null, active = 0, returnTo = null, frame = 0;
  const dialog = document.createElement('dialog');
  dialog.id = 'coldCallDialog';
  dialog.setAttribute('aria-labelledby', 'ccTitle');
  document.body.appendChild(dialog);
  const $ = id => dialog.querySelector('#' + id);
  function sourceLink(source, label) {
    if (source.briefId) return `<button type="button" data-cc-source-brief="${esc(source.briefId)}">${esc(label)}</button>`;
    if (source.path) return `<button type="button" data-dkla-file="${esc(source.path)}">${esc(label)} ↗</button>`;
    if (source.url?.startsWith('#')) return `<a href="${esc(source.url)}">${esc(label)} ↗</a>`;
    return `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span><span class="cc-sr"> (opens a new tab)</span></a>`;
  }
  function citations(refs) {
    return '<div class="cc-citations">' + refs.map(ref => {
      const source = current.sources.find(s => s.id === ref.id);
      return sourceLink(source, `${source.briefId ? 'Full brief' : source.label || 'Opinion'} · ${ref.pinpoint}`);
    }).join('') + '</div>';
  }
  const paragraphs = section => section.paragraphs.map(p => `<p>${esc(p)}</p>`).join('');
  function open(id, trigger) {
    const c = cases.get(id);
    if (!c || dialog.open) return;
    current = c; active = 0;
    returnTo = {focus: trigger || document.activeElement, inspector: document.getElementById('inspector')?.scrollTop || 0, supporting: document.getElementById('r19Body')?.scrollTop || 0};
    dialog.dataset.course = c.course;
    const brief = c.sources.find(s => s.briefId === c.briefId && s.briefId) || c.sources.find(s => s.briefId);
    dialog.innerHTML = `<header class="cc-header">
      <div class="cc-heading"><span class="cc-kicker">${esc(c.course)} / Cold call</span><h2 id="ccTitle">${esc(c.title)}</h2>${c.citation ? `<p class="cc-cite">${esc(c.citation)}</p>` : ''}</div>
      <div class="cc-actions">${brief ? sourceLink(brief, 'Full brief') : ''}<button type="button" id="ccClose" autofocus>← Back to case</button></div>
      </header>
      <div class="cc-layout"><details id="ccSections" ${wide.matches ? 'open' : ''}>
        <summary>In this case <span id="ccProgressMobile" aria-hidden="true"></span><span aria-hidden="true">⌄</span></summary><div class="cc-index-inner">
        <p class="cc-index-label">In this case <span id="ccProgress" aria-live="polite"></span></p>
        <nav aria-label="Case episodes">${c.sections.map((s,i) => `<button type="button" data-cc-jump="${i}"><span class="cc-number">${String(i+1).padStart(2,'0')}</span><span>${esc(s.title)}</span></button>`).join('')}</nav>
        </div></details>
      <div id="ccScroll" tabindex="0" role="region" aria-label="Cold call reading area">
        <article id="ccNarrative">${c.notice ? `<p class="cc-notice">${esc(c.notice)}</p>` : ''}
          ${c.sections.map((s,i)=>`<section class="cc-section" id="cc-section-${esc(s.id)}" data-cc-section="${i}" aria-labelledby="cc-heading-${esc(s.id)}"><p class="cc-kicker">${String(i+1).padStart(2,'0')} / ${c.sections.length}</p><h3 id="cc-heading-${esc(s.id)}" tabindex="-1">${esc(s.title)}</h3>${paragraphs(s)}${s.followUp ? `<details class="cc-followup"><summary>${esc(s.followUp.question)}</summary><p>${esc(s.followUp.answer)}</p>${citations(s.followUp.sources)}</details>` : ''}${citations(s.sources)}</section>`).join('')}
          <footer class="cc-end">${c.limits ? `<details class="cc-scope"><summary>Scope of this decision</summary>${lines(c.limits).map(p=>`<p>${esc(p)}</p>`).join('')}</details>` : ''}<div class="cc-source-list">${c.sources.map(s => sourceLink(s, s.briefId ? 'Full source brief' : s.label)).join('')}</div></footer>
        </article>
      </div></div>`;
    $('ccClose').onclick = close;
    $('ccScroll').addEventListener('scroll', () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; if (dialog.open) track(); });
    }, {passive:true});
    dialog.showModal();
    $('ccScroll').scrollTop = memory.get(id)?.top || 0;
    track();
  }
  function close() {
    if (!dialog.open) return;
    memory.set(current.id, {top: $('ccScroll').scrollTop});
    dialog.close();
    dialog.replaceChildren();
    if (returnTo?.focus?.isConnected) returnTo.focus.focus({preventScroll:true});
    const inspector = document.getElementById('inspector');
    if (inspector && returnTo) inspector.scrollTop = returnTo.inspector;
    const supporting = document.getElementById('r19Body');
    if (supporting && returnTo) supporting.scrollTop = returnTo.supporting;
    returnTo = null;
  }
  function progress() {
    const text = `${active+1} / ${current.sections.length}`;
    $('ccProgress').textContent = text;
    $('ccProgressMobile').textContent = text;
    dialog.querySelectorAll('[data-cc-jump]').forEach((button,i) => {
      if (i === active) button.setAttribute('aria-current', 'location'); else button.removeAttribute('aria-current');
    });
  }
  function track() {
    const top = $('ccScroll').getBoundingClientRect().top + 70;
    let next = 0;
    dialog.querySelectorAll('[data-cc-section]').forEach((section,i) => { if (section.getBoundingClientRect().top <= top) next = i; });
    active = next; progress();
  }
  function jump(index) {
    if (index < 0 || index >= current.sections.length) return;
    active = index;
    if (!wide.matches) $('ccSections').open = false;
    const heading = $('cc-heading-' + current.sections[index].id), scroller = $('ccScroll');
    scroller.scrollTop += heading.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 24;
    heading.focus({preventScroll:true}); progress();
  }
  dialog.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.hasAttribute('data-cc-jump')) jump(+button.dataset.ccJump);
    if (button.hasAttribute('data-cc-source-brief')) openSourceBrief(button.dataset.ccSourceBrief, button);
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  // Typing, arrows and Escape must not reach global map shortcuts while a reader is open.
  dialog.addEventListener('keydown', event => event.stopPropagation());
  wide.addEventListener('change', () => { if (dialog.open) $('ccSections').open = wide.matches; });
  function paint() {
    const panel = document.getElementById('inspector');
    if (!panel || panel.hidden || typeof selected === 'undefined') return;
    const id = selected?.type === 'node' ? selected.id : null;
    const old = panel.querySelector('[data-cold-call]');
    if (old?.dataset.coldCall === id) return;
    old?.remove();
    if (!cases.has(id)) return;
    const heading = panel.querySelector('.dkla-record-title') || panel.querySelector('h1,h2'); if (!heading) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'cc-launch'; button.dataset.coldCall = id;
    button.textContent = 'Cold call'; button.setAttribute('aria-haspopup','dialog');
    button.title = 'Read the case as a chronological narrative';
    const actions = panel.querySelector('.v25-record-actions');
    if (actions) actions.appendChild(button); else heading.after(button);
  }
  function ready() {
    if (!window.LegalAtlas?.ready) { setTimeout(ready,120); return; }
    const panel = document.getElementById('inspector');
    if (panel) new MutationObserver(paint).observe(panel, {childList:true, subtree:true});
    paint();
  }
  document.addEventListener('click', event => {
    const launch = event.target.closest('[data-cold-call]');
    if (!launch || !cases.has(launch.dataset.coldCall)) return;
    event.preventDefault(); open(launch.dataset.coldCall, launch);
  });
  const sourceDialog = document.createElement('dialog');
  sourceDialog.id = 'ccBriefDialog'; sourceDialog.setAttribute('aria-labelledby','ccBriefTitle');
  document.body.appendChild(sourceDialog);
  let sourceReturn = null;
  function openSourceBrief(id, trigger) {
    const text = window.DKLABriefs.text(id); if (!text) return;
    const title = window.DKLABriefs.data.entries.find(entry => entry[0] === id)?.[1] || current.title;
    sourceReturn = trigger;
    sourceDialog.innerHTML = `<header><div><span class="cc-kicker">Full source brief</span><h2 id="ccBriefTitle">${esc(title)}</h2></div><button type="button" id="ccBriefClose" autofocus>← Back to cold call</button></header><div class="cc-brief-body" tabindex="0">${window.DKLABriefs.render(text)}</div>`;
    sourceDialog.querySelector('#ccBriefClose').onclick = closeSourceBrief;
    sourceDialog.showModal();
  }
  function closeSourceBrief() {
    sourceDialog.close(); sourceDialog.replaceChildren();
    if (sourceReturn?.isConnected) sourceReturn.focus({preventScroll:true});
    sourceReturn = null;
  }
  sourceDialog.addEventListener('cancel', event=>{event.preventDefault();closeSourceBrief();});
  sourceDialog.addEventListener('keydown', event=>event.stopPropagation());
  window.DKLAColdCall = {open, close, has: id => cases.has(id), cases: () => [...cases.keys()], coverage: () => ({...dataset.coverage})};
  ready();
})();
