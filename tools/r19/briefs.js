/* DKLA r19: Codex's audited briefs in the atlas.
   - Every mapped case takes its six sections (Parties, Procedural History, Material Facts, Issue, Holding,
     Reasoning) and its rule line from the audited brief, unless the owner has edited that entry.
   - The complete audited brief sits under each case as a collapsed "Full brief".
   - Cases the readings only mention are kept off the main route, in a "Supporting cases" list per course.
   Nothing here touches the stored graph beyond the sections and rule line of unedited case entries. */
(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const esc = s => E(String(s ?? ''));
  let D; try { D = JSON.parse(el('dklaR19Data').textContent); } catch { return; }
  const COURSES = ['Contracts', 'Civil Procedure', 'Legislation and the Regulatory State'], SHORT = ['Contracts', 'Civil Procedure', 'LRS'];
  const STATUS = { pass: 'Passed independent review', repaired: 'Passed review after a repair', limited: 'Passed with a source limitation', pending: 'Awaiting independent review' };
  const KEYS = ['Parties', 'Procedural History', 'Material Facts', 'Issue', 'Holding', 'Reasoning'];
  const byId = new Map(D.entries.map(e => [e[0], { id: e[0], title: e[1], course: e[2], k: e[3], status: e[4], sha: e[5], main: e[6] || null }]));
  const supporting = D.entries.filter(e => !e[6]).map(e => byId.get(e[0]));
  let full = null;
  function fullText(id) { try { full ||= JSON.parse(el('dklaR19Full').textContent); } catch { full = {}; } return full[id] || ''; }

  // The reader lists case sections in this fixed order everywhere (reading panel, edit form, exports).
  if (typeof CASE_HEADINGS !== 'undefined' && Array.isArray(CASE_HEADINGS)) CASE_HEADINGS.splice(0, CASE_HEADINGS.length, ...KEYS);

  /* ---------- apply audited sections to the mainline cases ---------- */
  const skipped = new Set();
  function applyBriefs(force) {
    if (typeof data === 'undefined' || !data?.nodes) return 0;
    let changed = 0; const guides = mapData()?.guides || {};
    for (const [atlasId, codexId] of Object.entries(D.map)) {
      const n = nodesById.get(atlasId), conv = D.sections[codexId], meta = byId.get(codexId);
      if (!n || !conv || !meta) continue;
      const stamp = meta.sha + (conv.rev || '');
      if (n.codex?.sha === stamp && n.codex?.id === codexId) continue;
      // An entry the owner has edited keeps the owner's text; the audited version is offered in the panel.
      if (force !== atlasId && n.updatedAt !== D.seedUpdated[atlasId]) { skipped.add(atlasId); continue; }
      const old = n.summary;
      n.sections = Object.fromEntries(KEYS.map(k => [k, conv.sections[k] || '']));
      n.summary = conv.rule;
      n.codex = { id: codexId, sha: stamp, k: meta.k };
      if (guides[atlasId] && guides[atlasId].sourceSummary === old) guides[atlasId].sourceSummary = conv.rule;
      skipped.delete(atlasId); changed++;
    }
    if (changed) {
      try { if (typeof rebuildIndex === 'function') rebuildIndex(); } catch { /* the search index rebuilds on the next edit */ }
      try { if (typeof saveCache === 'function') saveCache(); } catch { /* storage unavailable */ }
      try { renderInspector(); schedule(); } catch { /* not ready to draw */ }
    }
    return changed;
  }
  (function whenReady() { if (!window.LegalAtlas?.ready || typeof nodesById === 'undefined') { setTimeout(whenReady, 120); return; } applyBriefs(); setTimeout(applyBriefs, 3000); })();

  /* ---------- rendering the full brief ---------- */
  function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:]|$)/g, '$1<em>$2</em>'); }
  function renderBrief(text) {
    const out = []; let para = [], list = [];
    const flush = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } if (list.length) { out.push('<ul>' + list.map(i => '<li>' + inline(i) + '</li>').join('') + '</ul>'); list = []; } };
    for (const raw of String(text).split('\n')) {
      const line = raw.trimEnd();
      if (!line.trim()) { flush(); continue; }
      let m;
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { flush(); out.push(m[1].length === 1 ? '<h3>' + inline(m[2]) + '</h3>' : '<h4>' + inline(m[2]) + '</h4>'); }
      else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) { if (para.length) flush(); list.push(m[1]); }
      else if ((m = line.match(/^\s*\d+\.\s+(.*)$/)) && !para.length) { list.push(m[1]); }
      else { if (list.length) flush(); para.push(line.trim()); }
    }
    flush(); return out.join('');
  }
  // A brief Codex left unreviewed may have been audited here against the saved opinion; say so, and say what was found.
  const AUDIT = D.audit || {};
  const AUDIT_LABEL = a => a.v === 'clean' ? 'Audited by Claude: no errors found' : a.v === 'corrected' ? `Audited by Claude: ${a.f.length} correction${a.f.length === 1 ? '' : 's'} made` : 'Claude could not audit this from the saved sources';
  const chip = e => { const a = AUDIT[e.id]; return `<span class="r19-status r19-${e.k}" title="${esc(e.status.replace(/_/g, ' ').toLowerCase())}">${STATUS[e.k]}</span>` + (a ? `<span class="r19-status r19-audit-${a.v === 'could-not-audit' ? 'none' : a.v}">${AUDIT_LABEL(a)}</span>` : ''); };
  function auditHTML(id) {
    const a = AUDIT[id]; if (!a) return '';
    return `<details class="r19-full r19-auditbox"><summary>Claude's audit <small>${esc(AUDIT_LABEL(a).replace(/^Audited by Claude: /, ''))}</small></summary><div class="r19-text"><p>${esc(a.c)}</p>${a.f.length ? '<ul>' + a.f.map(f => `<li><strong>${esc(f[1])}</strong> (${esc(f[0])}): ${f[3] === 'removed' ? `removed “${esc(f[2])}”` : `“${esc(f[2])}” now reads “${esc(f[3])}”`}</li>`).join('') + '</ul>' : ''}${a.n ? `<p>${esc(a.n)}</p>` : ''}</div></details>`;
  }

  /* ---------- reading panel: status and full brief under a mainline case ---------- */
  function paintReader() {
    const panel = el('inspector'); if (!panel || panel.hidden) return;
    const n = selected?.type === 'node' ? nodesById.get(selected.id) : null;
    const codexId = n && D.map[n.id], e = codexId && byId.get(codexId), old = panel.querySelector('.r19-brief');
    if (!e) { old?.remove(); return; }
    const state = (n.codex?.sha === e.sha + (D.sections[codexId]?.rev || '') ? 'a' : skipped.has(n.id) ? 's' : 'w') + ':' + n.id;
    if (old && old.dataset.state === state) return;
    old?.remove();
    const bodyEl = panel.querySelector('.reader-body'); if (!bodyEl) return;
    const box = document.createElement('section'); box.className = 'r19-brief'; box.dataset.state = state;
    const others = D.related[n.id] || [];
    box.innerHTML = `<div class="r19-line">${chip(e)}<span>${n.codex?.id === codexId && !skipped.has(n.id) ? 'Sections and rule line are from the audited brief.' : skipped.has(n.id) ? 'You have edited this entry, so your text is kept.' : ''}</span>${skipped.has(n.id) ? `<button type="button" data-r19-apply="${esc(n.id)}">Use the audited brief</button>` : ''}</div>
      <details class="r19-full"><summary>Full brief <small>the complete audited account</small></summary><div class="r19-text" data-r19-fill="${esc(codexId)}"></div></details>
      ${auditHTML(codexId)}
      ${others.length ? `<div class="r19-related"><span>Other stages and related briefs</span>${others.map(id => byId.get(id)).filter(Boolean).map(o => `<button type="button" data-r19-open="${esc(o.id)}">${esc(o.title)}</button>`).join('')}</div>` : ''}`;
    bodyEl.appendChild(box);
  }
  if (el('inspector')) new MutationObserver(paintReader).observe(el('inspector'), { childList: true, subtree: true });
  document.addEventListener('toggle', ev => { const d = ev.target; if (!d.classList?.contains('r19-full') || !d.open) return; const t = d.querySelector('[data-r19-fill]'); if (t && !t.dataset.done) { t.innerHTML = renderBrief(fullText(t.dataset.r19Fill)) || '<p>The full text is not in this copy.</p>'; t.dataset.done = '1'; } }, true);

  /* ---------- supporting cases: one list per course ---------- */
  const dialog = document.createElement('dialog'); dialog.id = 'r19Dialog'; dialog.setAttribute('aria-label', 'Supporting cases');
  document.querySelectorAll('#r19Dialog').forEach(n => n.remove());
  dialog.innerHTML = '<div class="r19-head"><div id="r19Title"></div><button class="r19-close" data-r19-close aria-label="Close">×</button></div><div class="r19-body" id="r19Body" tabindex="-1"></div>';
  document.body.appendChild(dialog);
  const body = dialog.querySelector('#r19Body');
  const V = { course: 0, q: '', k: 'all', shown: 80, open: null };
  const counts = COURSES.map((_, i) => supporting.filter(e => e.course === i).length);
  function listHTML() {
    const q = V.q.trim().toLowerCase();
    const rows = supporting.filter(e => e.course === V.course && (V.k === 'all' || e.k === V.k) && (!q || e.title.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)));
    el('r19Title').innerHTML = '<span class="r18-kicker">NOT ON THE SYLLABUS</span><h2>Supporting cases</h2>';
    return `<p class="r19-lead">Cases the readings mention without assigning: note cases, cases cited in passing, and other stages of an assigned case. Each has the six sections and its full audited brief. They are kept off the main route of the map.</p>
      <div class="r19-tabs">${COURSES.map((c, i) => `<button data-r19-course="${i}" aria-pressed="${V.course === i}">${SHORT[i]} <small>${counts[i]}</small></button>`).join('')}</div>
      <input id="r19Search" type="search" placeholder="Search ${counts[V.course]} supporting cases in ${esc(SHORT[V.course])}" value="${esc(V.q)}" autocomplete="off" aria-label="Search supporting cases">
      <div class="r19-filter">${[['all', 'All'], ['pending', 'Awaiting review'], ['limited', 'Source limitation']].map(([k, t]) => `<button data-r19-k="${k}" aria-pressed="${V.k === k}">${t}</button>`).join('')}<span>${rows.length} case${rows.length === 1 ? '' : 's'}</span></div>
      <div class="r19-list">${rows.slice(0, V.shown).map(e => `<button class="r19-row" data-r19-open="${esc(e.id)}"><i class="r19-dot r19-${e.k}" title="${STATUS[e.k]}"></i><span>${esc(e.title)}</span></button>`).join('') || '<p class="r19-lead">No supporting case matches.</p>'}</div>
      ${rows.length > V.shown ? `<button class="r19-more" data-r19-more>Show more (${rows.length - V.shown} left)</button>` : ''}`;
  }
  function entryHTML(e) {
    const conv = D.sections[e.id], main = e.main && nodesById.get(e.main);
    el('r19Title').innerHTML = `<span class="r18-kicker">${esc(COURSES[e.course])} · ${e.main ? 'ON THE MAP' : 'SUPPORTING CASE'}</span><h2>${esc(e.title)}</h2>`;
    return `<div class="r19-line">${e.main ? '' : '<button type="button" data-r19-back>← Supporting cases</button>'}${chip(e)}${main ? `<button type="button" data-r19-node="${esc(main.id)}">Open on the map</button>` : ''}</div>
      ${conv ? `<div class="r19-rule"><span>Rule in one line</span><p>${esc(conv.rule)}</p></div>${KEYS.map(k => conv.sections[k] ? `<section class="r19-sec"><h3>${k}</h3>${String(conv.sections[k]).split(/\n{2,}/).map(p => '<p>' + esc(p) + '</p>').join('')}</section>` : '').join('')}<details class="r19-full"><summary>Full brief <small>the complete audited account</small></summary><div class="r19-text" data-r19-fill="${esc(e.id)}"></div></details>${auditHTML(e.id)}`
        : `${auditHTML(e.id)}<div class="r19-text">${renderBrief(fullText(e.id)) || '<p>The full text is not in this copy.</p>'}</div>`}`;
  }
  function render() { const e = V.open && byId.get(V.open); body.innerHTML = e ? entryHTML(e) : listHTML(); if (e) body.scrollTop = 0; }
  function open(course, id) {
    if (typeof dismissMenu === 'function') dismissMenu();
    if (typeof course === 'number') V.course = course;
    V.open = id || null; if (id && byId.get(id) && !byId.get(id).main) V.course = byId.get(id).course;
    if (!dialog.open) dialog.showModal();
    render(); if (!V.open) el('r19Search')?.focus({ preventScroll: true }); else body.focus({ preventScroll: true });
  }
  dialog.addEventListener('click', ev => { if (ev.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { body.innerHTML = ''; });
  dialog.addEventListener('input', ev => { if (ev.target.id !== 'r19Search') return; V.q = ev.target.value; V.shown = 80; const at = ev.target.selectionStart; render(); const s = el('r19Search'); s.focus(); try { s.setSelectionRange(at, at); } catch { /* not supported for this input type */ } });
  document.addEventListener('click', ev => {
    const t = ev.target.closest('[data-r19-open],[data-r19-close],[data-r19-course],[data-r19-k],[data-r19-more],[data-r19-back],[data-r19-node],[data-r19-apply],[data-r19-list]');
    if (!t) return; const d = t.dataset;
    if (d.r19Open) { ev.preventDefault(); ev.stopPropagation(); if (typeof closeSearch === 'function') closeSearch(); open(undefined, d.r19Open); }
    else if ('r19Close' in d) dialog.close();
    else if (d.r19Course && dialog.contains(t)) { V.course = Number(d.r19Course); V.shown = 80; render(); }
    else if (d.r19K) { V.k = d.r19K; V.shown = 80; render(); }
    else if ('r19More' in d) { V.shown += 200; render(); }
    else if ('r19Back' in d) { V.open = null; render(); }
    else if (d.r19Node) { dialog.close(); goNode(d.r19Node, true); }
    else if (d.r19Apply) { applyBriefs(d.r19Apply); paintReader(); }
    else if (d.r19List) { ev.preventDefault(); ev.stopPropagation(); open(Number(d.r19List)); }
  }, true);

  /* ---------- entry points: a tile beside each course, the More menu, and search ---------- */
  const TILES = D.tiles;
  if (typeof scopeBox === 'function') { const prior = scopeBox; scopeBox = function () { const b = prior(); const t = TILES[S.scope]; return t ? bounds([b, t]) : b; }; }
  const TILE_COL = { 'Contracts': '#ebad79', 'Civil Procedure': '#90bfef', 'Legislation and the Regulatory State': '#a4d3b8' };
  R18.afterDraw.push(() => {
    if (window.SCOTUSHistory?.state?.().open) return;
    const z = S.z, B = visibleBox(), parts = [];
    COURSES.forEach((c, i) => {
      const t = TILES[c]; if (!t || !intersects(t, B, 0)) return;
      const col = TILE_COL[c], dim = S.scope !== 'Atlas' && S.scope !== c ? .35 : 1, px = t.h * z;
      parts.push(`<g class="r19-tile" data-r19-list="${i}" role="button" tabindex="0" aria-label="Supporting cases in ${esc(c)}: ${counts[i]}" opacity="${dim}" style="cursor:pointer"><rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="${Math.min(260, t.h / 3)}" fill="${col}" fill-opacity=".08" stroke="${col}" stroke-opacity=".7" stroke-width="${1.3 / z}" stroke-dasharray="${7 / z} ${5 / z}"/>`);
      if (px >= 15) { const fs = Math.min(t.h * .36, 15 / z, Math.max(10.5 / z, t.h * .3)); parts.push(`<text x="${t.x + t.w / 2}" y="${t.y + t.h / 2 + fs * .35}" font-size="${fs}" font-weight="600" fill="${col}" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif">Supporting cases · ${counts[i]}</text>`); }
      parts.push('</g>');
    });
    if (parts.length) svg.insertAdjacentHTML('beforeend', parts.join(''));
  });
  svg.addEventListener('pointerdown', ev => { if (ev.target.closest?.('[data-r19-list]')) ev.stopImmediatePropagation(); }, true);
  svg.addEventListener('keydown', ev => { const t = ev.target.closest?.('[data-r19-list]'); if (t && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); open(Number(t.dataset.r19List)); } });
  if (typeof moreMenu === 'function') {
    const prior = moreMenu;
    moreMenu = function (...a) { const out = prior.apply(this, a), menu = el('moreMenu'); if (menu && !menu.hidden && !menu.querySelector('[data-r19-list]')) { const anchor = [...menu.querySelectorAll('button')].find(b => b.dataset.action === 'book'); const b = document.createElement('button'); b.setAttribute('role', 'menuitem'); b.dataset.r19List = String(Math.max(0, COURSES.indexOf(S.scope))); b.textContent = 'Supporting cases'; (anchor || menu.lastElementChild).after(b); } return out; };
    const more = el('moreBtn'); if (more) more.onclick = () => moreMenu();
  }
  const results = el('searchResults'), input = el('search');
  if (results && input) new MutationObserver(() => {
    if (results.hidden || results.dataset.r19 === input.value) return; results.dataset.r19 = input.value;
    const q = input.value.trim().toLowerCase(); if (q.length < 3) return;
    const hits = supporting.filter(e => e.title.toLowerCase().includes(q)).slice(0, 5); if (!hits.length) return;
    const box = document.createElement('div'); box.className = 'r19-search';
    box.innerHTML = '<div class="search-label">Supporting cases</div>' + hits.map(e => `<button data-r19-open="${esc(e.id)}"><strong>${esc(e.title)}</strong><small>${esc(SHORT[e.course])} · not on the syllabus</small></button>`).join('');
    results.querySelector('.search-empty')?.remove(); results.appendChild(box);
  }).observe(results, { childList: true });

  /* ---------- version ---------- */
  R18.version = D.version;
  document.title = 'DKLA · ' + D.version;
  try { const log = el('dklaR18Changelog'); if (log) log.textContent = JSON.stringify([].concat(D.changelog, JSON.parse(log.textContent))); } catch { /* changelog stays as it was */ }
  window.DKLABriefs = { open, apply: applyBriefs, entries: () => D.entries.length, supporting: () => supporting.length, skipped: () => [...skipped], data: D };
})();
