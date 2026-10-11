/* Cold Call Mode: appended to the immutable atlas; no graph or brief mutations. */
(() => {
  'use strict';
  const block = document.getElementById('dklaColdCallData');
  if (!block || window.DKLAColdCall) return;
  const cases = new Map(JSON.parse(block.textContent).cases.map(c => [c.id, c]));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key = 'dkla.coldCall.v1', grades = ['Clean', 'Patchy', 'Blank'];
  const memory = new Map(), wide = matchMedia('(min-width: 800px)');
  let current = null, active = 0, practice = false, readingTop = 0, bookmark = null, returnTo = null, frame = 0;
  let ratings = readRatings();
  function readRatings() {
    try { const r = JSON.parse(localStorage.getItem(key)); return r && typeof r === 'object' && !Array.isArray(r) ? r : {}; }
    catch { return {}; }
  }
  const ratingKey = s => `${current.id}@${current.revision}:${s.id}`;
  const grade = s => grades.includes(ratings[ratingKey(s)]?.grade) ? ratings[ratingKey(s)].grade : '';
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
  function hydrate(c) {
    if (!c || c.origin !== 'brief' || c.hydrated) return c;
    const lines = window.DKLABriefs.text(c.briefId).split('\n');
    for (const s of c.sections) {
      s.markdown = s.spans.map(([start,end]) => lines.slice(start,end).join('\n')).join('\n');
      s.paragraphs = [s.markdown]; // Search the full account, not only its headings.
    }
    c.hydrated = true;
    return c;
  }
  function citations(refs) {
    return '<div class="cc-citations">' + refs.map(ref => {
      const s = current.sources.find(s => s.id === ref.id);
      return sourceLink(s, `${s.briefId ? 'Source brief' : s.path ? s.label : current.origin === 'narrative' ? 'Opinion' : 'Assigned source'} · ${ref.pinpoint}`);
    }).join('') + '</div>';
  }
  function paragraphs(section) { if (section.markdown) return window.DKLABriefs.render(section.markdown); return section.paragraphs.map(p => `<p>${esc(p)}</p>`).join(''); }
  function open(id, trigger) {
    const c = hydrate(cases.get(id));
    if (!c || dialog.open) return;
    current = c; active = 0; practice = false; bookmark = null;
    ratings = readRatings();
    returnTo = {focus: trigger || document.activeElement, inspector: document.getElementById('inspector')?.scrollTop || 0, supporting: document.getElementById('r19Body')?.scrollTop || 0};
    readingTop = memory.get(id)?.top || 0;
    dialog.dataset.course = c.course;
    dialog.innerHTML = `<header class="cc-header">
      <div><span class="cc-kicker">${esc(c.course)} / Cold call</span><h2 id="ccTitle">${esc(c.title)}</h2>${c.citation ? `<p class="cc-cite">${esc(c.citation)}</p>` : ''}</div>
      <button type="button" id="ccClose" autofocus>← Back to case</button>
      </header>
      <div class="cc-toolbar"><button type="button" id="ccPractice" aria-pressed="false">Practice aloud</button><button type="button" id="ccReturn" disabled>Return to where I was</button><span id="ccProgress" aria-live="polite"></span></div>
      <div class="cc-layout"><details id="ccSections" ${wide.matches ? 'open' : ''}>
        <summary>Sections <span aria-hidden="true">⌄</span></summary><div class="cc-index-inner">
        <label for="ccFind">Find a section</label><input type="search" id="ccFind" placeholder="e.g. trust, dissent" autocomplete="off">
        <p id="ccMatches" role="status" class="cc-small"></p><nav aria-label="Case sections">${c.sections.map((s,i) => `<button type="button" data-cc-jump="${i}"><span class="cc-number">${String(i+1).padStart(2,'0')}</span><span>${esc(s.title)}</span><span class="cc-grade" data-cc-grade="${i}">${esc(grade(s))}</span></button>`).join('')}</nav>
        <p class="cc-small">${c.sections.length} sections · Read in order, or jump to a question.</p></div></details>
      <div id="ccScroll" tabindex="0" role="region" aria-label="Cold call reading area">
        <article id="ccNarrative"><div class="cc-intro">${c.notice ? `<p class="cc-notice">${esc(c.notice)}</p>` : ''}${c.lead ? `<p class="cc-lead">${esc(c.lead)}</p>` : ''}
          ${c.actors.length ? `<details class="cc-orientation"><summary>People &amp; path through the courts</summary><dl>${c.actors.map(a=>`<dt>${esc(a.name)}</dt><dd>${esc(a.role)}</dd>`).join('')}</dl><ol>${c.proceedings.map(p=>`<li>${esc(p)}</li>`).join('')}</ol></details>` : ''}</div>
          ${c.sections.map((s,i)=>`<section class="cc-section" id="cc-section-${s.id}" data-cc-section="${i}" aria-labelledby="cc-heading-${s.id}"><p class="cc-kicker">${String(i+1).padStart(2,'0')} / ${c.sections.length}</p><h3 id="cc-heading-${s.id}" tabindex="-1">${esc(s.title)}</h3>${paragraphs(s)}${citations(s.sources)}</section>`).join('')}
          <footer class="cc-end">${c.limits ? `<h3>At the edge of the record</h3><p>${esc(c.limits)}</p>` : '<h3>Sources</h3>'}${c.sources.map(s => sourceLink(s,s.label)).join(' ')}<p class="cc-small">The account and full brief work offline with your saved atlas. External source links need a connection.</p></footer>
        </article><section id="ccRehearsal" hidden aria-label="Oral practice"></section>
      </div></div><div id="ccStatus" class="cc-sr" role="status"></div>`;
    $('ccClose').onclick = close;
    $('ccPractice').onclick = togglePractice;
    $('ccReturn').onclick = restoreBookmark;
    $('ccFind').oninput = filterIndex;
    $('ccScroll').addEventListener('scroll', () => {
      if (practice || frame) return;
      frame = requestAnimationFrame(() => { frame = 0; if (dialog.open && !practice) track(); });
    }, {passive:true});
    dialog.showModal();
    $('ccScroll').scrollTop = readingTop;
    track();
  }
  function close() {
    if (!dialog.open) return;
    memory.set(current.id, {top: practice ? readingTop : $('ccScroll').scrollTop});
    dialog.close();
    // Native dialogs retain DOM when closed; no background text should remain searchable.
    dialog.replaceChildren();
    if (returnTo?.focus?.isConnected) returnTo.focus.focus({preventScroll:true});
    const inspector = document.getElementById('inspector');
    if (inspector && returnTo) inspector.scrollTop = returnTo.inspector;
    const supporting = document.getElementById('r19Body');
    if (supporting && returnTo) supporting.scrollTop = returnTo.supporting;
    returnTo = null;
  }
  function progress() {
    const rated = current.sections.filter(s => grade(s)).length;
    $('ccProgress').textContent = practice ? `${active+1} / ${current.sections.length} · ${rated} rated` : `${active+1} / ${current.sections.length}`;
    dialog.querySelectorAll('[data-cc-jump]').forEach((b,i) => {
      if (i === active) b.setAttribute('aria-current', 'location'); else b.removeAttribute('aria-current');
    });
  }
  function track() {
    const top = $('ccScroll').getBoundingClientRect().top + 70;
    let next = 0;
    dialog.querySelectorAll('[data-cc-section]').forEach((s,i) => { if (s.getBoundingClientRect().top <= top) next = i; });
    active = next; progress();
  }
  function jump(index) {
    if (index < 0 || index >= current.sections.length) return;
    if (!practice && !bookmark) {
      bookmark = {top:$('ccScroll').scrollTop, section:active};
      $('ccReturn').disabled = false;
    }
    active = index;
    if (!wide.matches) $('ccSections').open = false;
    if (practice) { renderPractice(); return; }
    const heading = $('cc-heading-' + current.sections[index].id), scroller = $('ccScroll');
    scroller.scrollTop += heading.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 24;
    heading.focus({preventScroll:true});
    progress();
  }
  function restoreBookmark() {
    if (!bookmark) return;
    if (practice) togglePractice();
    const saved = bookmark; bookmark = null;
    $('ccReturn').disabled = true;
    $('ccScroll').scrollTop = saved.top;
    $('cc-heading-' + current.sections[saved.section].id).focus({preventScroll:true});
    track();
    $('ccStatus').textContent = 'Returned to your previous reading position.';
  }
  function filterIndex() {
    const query = $('ccFind').value.trim().toLocaleLowerCase();
    let count = 0;
    dialog.querySelectorAll('[data-cc-jump]').forEach((b,i) => {
      const s = current.sections[i];
      b.hidden = !!query && ![s.title,s.cue,...s.paragraphs].join(' ').toLocaleLowerCase().includes(query);
      if (!b.hidden) count++;
    });
    $('ccMatches').textContent = query ? `${count} matching section${count === 1 ? '' : 's'}` : '';
  }
  function togglePractice() {
    if (!practice) { readingTop = $('ccScroll').scrollTop; track(); }
    practice = !practice;
    $('ccNarrative').hidden = practice;
    $('ccRehearsal').hidden = !practice;
    $('ccPractice').setAttribute('aria-pressed', String(practice));
    $('ccPractice').textContent = practice ? 'Return to narrative' : 'Practice aloud';
    if (practice) renderPractice();
    else { $('ccRehearsal').replaceChildren(); $('ccScroll').scrollTop = readingTop; track(); $('ccPractice').focus({preventScroll:true}); }
  }
  function renderPractice() {
    const s = current.sections[active];
    $('ccRehearsal').innerHTML = `<p class="cc-kicker">Say it in your own words · ${active+1} / ${current.sections.length}</p>
      <h3 id="ccPromptTitle" tabindex="-1">${esc(s.title)}</h3><p class="cc-cue">${esc(s.cue)}</p>
      <p class="cc-small">Explain this part aloud, then compare it with the account.</p>
      <button type="button" id="ccReveal" class="cc-primary" aria-expanded="false" aria-controls="ccAnswer">Reveal account</button><div id="ccAnswer" hidden></div>
      <div class="cc-practice-nav"><button type="button" data-cc-prev ${active === 0 ? 'disabled' : ''}>← Previous</button><button type="button" data-cc-next ${active === current.sections.length-1 ? 'disabled' : ''}>Next →</button></div>
      <p class="cc-small">${grade(s) ? `Last rating: ${esc(grade(s))}. ` : ''}Ratings stay on this device and are separate from your rule recall.</p>`;
    $('ccReveal').onclick = reveal;
    $('ccScroll').scrollTop = 0;
    $('ccPromptTitle').focus({preventScroll:true});
    progress();
  }
  function reveal() {
    if (!$('ccAnswer').hidden) {
      $('ccAnswer').hidden = true;
      $('ccReveal').setAttribute('aria-expanded','false');
      $('ccReveal').textContent = 'Reveal account';
      return;
    }
    const s = current.sections[active];
    $('ccAnswer').innerHTML = `${paragraphs(s)}${citations(s.sources)}${s.followUp ? `<details class="cc-followup"><summary>Follow-up: ${esc(s.followUp.question)}</summary><p>${esc(s.followUp.answer)}</p>${citations(s.followUp.sources)}</details>` : ''}
      <fieldset class="cc-ratings"><legend>How did that account come out?</legend>${grades.map(g=>`<button type="button" data-cc-rate="${g}" aria-pressed="${grade(s) === g}">${g}</button>`).join('')}</fieldset><p id="ccRatingStatus" role="status" class="cc-small"></p>`;
    $('ccAnswer').hidden = false;
    $('ccReveal').setAttribute('aria-expanded','true');
    $('ccReveal').textContent = 'Hide account';
  }
  function rate(g) {
    if (!grades.includes(g)) return;
    const s = current.sections[active];
    ratings = {...ratings, ...readRatings(), [ratingKey(s)]: {grade:g, at:Date.now()}};
    let saved = true;
    try { localStorage.setItem(key, JSON.stringify(ratings)); } catch { saved = false; }
    dialog.querySelectorAll('[data-cc-rate]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.ccRate === g)));
    dialog.querySelector(`[data-cc-grade="${active}"]`).textContent = g;
    $('ccRatingStatus').textContent = `${g}${saved ? ' · saved on this device.' : ' · kept for this session; browser storage is unavailable.'}`;
    progress();
  }
  dialog.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-cc-jump')) jump(+b.dataset.ccJump);
    if (b.hasAttribute('data-cc-prev')) jump(active-1);
    if (b.hasAttribute('data-cc-next')) jump(active+1);
    if (b.hasAttribute('data-cc-rate')) rate(b.dataset.ccRate);
    if (b.hasAttribute('data-cc-source-brief')) openSourceBrief(b.dataset.ccSourceBrief, b);
  });
  dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
  // Do not send typing, arrows or Escape to the atlas's global map shortcuts.
  dialog.addEventListener('keydown', e => e.stopPropagation());
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
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cc-launch'; b.dataset.coldCall = id;
    b.textContent = 'Cold call'; b.setAttribute('aria-haspopup','dialog');
    b.title = 'Read the full narrative and practice aloud';
    heading.after(b);
  }
  function ready() {
    if (!window.LegalAtlas?.ready) { setTimeout(ready,120); return; }
    const panel = document.getElementById('inspector');
    if (panel) new MutationObserver(paint).observe(panel, {childList:true, subtree:true});
    paint();
  }
  document.addEventListener('click', e => {
    const launch = e.target.closest('[data-cold-call]');
    if (!launch || !cases.has(launch.dataset.coldCall)) return;
    e.preventDefault(); open(launch.dataset.coldCall, launch);
  });
  const sourceDialog = document.createElement('dialog');
  sourceDialog.id = 'ccBriefDialog'; sourceDialog.setAttribute('aria-labelledby','ccBriefTitle');
  document.body.appendChild(sourceDialog);
  let sourceReturn = null;
  function openSourceBrief(id, trigger) {
    const text = window.DKLABriefs.text(id); if (!text) return;
    sourceReturn = trigger;
    sourceDialog.innerHTML = `<header><h2 id="ccBriefTitle">${esc(current.title)} · Full case brief</h2><button type="button" id="ccBriefClose" autofocus>← Back to cold call</button></header><div class="cc-brief-body" tabindex="0">${window.DKLABriefs.render(text)}</div>`;
    sourceDialog.querySelector('#ccBriefClose').onclick = closeSourceBrief;
    sourceDialog.showModal();
  }
  function closeSourceBrief() {
    sourceDialog.close(); sourceDialog.replaceChildren();
    if (sourceReturn?.isConnected) sourceReturn.focus({preventScroll:true});
    sourceReturn = null;
  }
  sourceDialog.addEventListener('cancel', e=>{e.preventDefault();closeSourceBrief();});
  sourceDialog.addEventListener('keydown', e=>e.stopPropagation());
  window.DKLAColdCall = {open, close, has: id => cases.has(id), cases: () => [...cases.keys()]};
  ready();
})();
