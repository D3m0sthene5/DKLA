/* DKLA r18 study layer: recall drill with staged reveal, ratings and progress, confusable pairs,
   printable reference sheets, keyboard-only sessions, offline install, a version panel and sync.
   Everything here is additive: it reads the atlas graph and writes only its own localStorage key. */
(() => {
  'use strict';

  const KEY = 'dkla.study.v1';
  const KINDS = ['Case', 'Concept', 'Rule'];
  const COURSES = ['Contracts', 'Civil Procedure', 'Legislation and the Regulatory State'];
  const COLORS = { 3: '#7fd6a2', 2: '#f0c36a', 1: '#ef8f8f' };
  const LABEL_SETS = [['Clean', 'Patchy', 'Blank'], ['Verbatim', 'Gist', 'Blank'], ['Solid', 'Wobbly', 'Gone']];
  const hosted = location.protocol === 'http:' || location.protocol === 'https:';
  const el = id => document.getElementById(id);
  const esc = s => E(String(s ?? ''));

  /* ---------- store ---------- */
  let store = { ratings: {}, prefs: {}, sync: null, session: null };
  try { const raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw && typeof raw === 'object') store = { ...store, ...raw, ratings: raw.ratings || {}, prefs: raw.prefs || {} }; } catch { /* a private window: ratings last for the visit */ }
  let storeRev = 0;
  function save(push = true) {
    storeRev++;
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* storage unavailable */ }
    schedule();
    if (push) queueSync();
  }
  const prefs = () => store.prefs;
  const labels = () => LABEL_SETS[prefs().labels || 0] || LABEL_SETS[0];
  const ratingOf = id => { const r = store.ratings[id]; return r && r.r ? r.r : 0; };
  function rate(id, r) {
    const old = store.ratings[id];
    store.ratings[id] = { r, t: Date.now(), n: (old?.n || 0) + (r ? 1 : 0) };
    save();
  }

  /* ---------- entries ---------- */
  const homeOf = id => mapData().homes[id];
  function courseOf(n) { const h = homeOf(n.id); return h ? regionCourse(regionFor(h.region)) : null; }
  function drillable(n) { return KINDS.includes(n.kind) && COURSES.includes(courseOf(n)); }
  let poolCache = null, poolKey = '';
  function allEntries() {
    const key = data.nodes.length + ':' + Object.keys(mapData().homes).length + ':' + mapData().layoutId;
    if (poolKey !== key) {
      poolKey = key;
      const order = new Map(mapData().regions.map((r, i) => [r.id, (COURSES.indexOf(regionCourse(r)) + 1) * 1000 + (r.step || 99) * 10 + i / 1000]));
      const sub = new Map(); for (const r of mapData().regions) (r.districtIds || []).forEach((id, i) => sub.set(id, i));
      poolCache = data.nodes.filter(drillable).sort((a, b) => {
        const ha = homeOf(a.id), hb = homeOf(b.id);
        return (order.get(ha.region) - order.get(hb.region)) || ((sub.get(ha.district) ?? 99) - (sub.get(hb.district) ?? 99)) || (!!ha.support - !!hb.support) || (ha.y - hb.y) || (ha.x - hb.x);
      });
    }
    return poolCache;
  }
  function placeOf(n) {
    const h = homeOf(n.id), r = h && regionFor(h.region), d = h && districtFor(h.district);
    return { course: r ? regionCourse(r) : '', region: r, district: d };
  }
  function paras(text) { return String(text || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join(''); }
  function stagesFor(n) {
    const s = n.sections || {}, out = [];
    if (n.kind === 'Case') {
      if (s.Issue) out.push({ label: 'Issue', html: paras(s.Issue) });
      const hold = (s.Holding ? `<h4>Holding</h4>${paras(s.Holding)}` : '') + (n.summary ? `<h4>Rule in one line</h4>${paras(n.summary)}` : '');
      if (hold) out.push({ label: 'Holding and rule', html: hold });
      const why = (s.Reasoning ? `<h4>Reasoning</h4>${paras(s.Reasoning)}` : '') + (s['Material Facts'] ? `<h4>Material facts</h4>${paras(s['Material Facts'])}` : '');
      if (why) out.push({ label: 'Reasoning and facts', html: why });
    } else {
      if (n.summary) out.push({ label: n.kind === 'Rule' ? 'What it provides' : 'Rule', html: paras(n.summary) });
      const body = Object.entries(s).filter(([, v]) => v && v !== n.summary).map(([k, v]) => `<h4>${esc(k)}</h4>${paras(v)}`).join('');
      if (body) out.push({ label: 'In full', html: body });
      const cases = [...new Set(incident(n.id).map(e => e.source === n.id ? e.target : e.source))].map(id => nodesById.get(id)).filter(x => x && x.kind === 'Case').slice(0, 8);
      if (cases.length) out.push({ label: 'Cases that carry it', html: '<ul class="r18-caselist">' + cases.map(c => `<li><strong>${esc(displayName(c))}</strong>${c.summary ? ' — ' + esc(c.summary) : ''}</li>`).join('') + '</ul>' });
    }
    if (!out.length) out.push({ label: 'Entry', html: paras(n.notes || 'No summary yet.') });
    return out.slice(0, 3);
  }
  function hookFor(n) { return n.mnemonic?.rationale || ''; }
  function iconFor(n) { try { return typeof symbol === 'function' ? symbol(n) : ''; } catch { return ''; } }
  function dot(r, title) { return `<span class="r18-dot r18-r${r || 0}" title="${esc(title || (r ? labels()[3 - r] : 'Unrated'))}"></span>`; }

  /* ---------- dialog shell ---------- */
  const TABS = [['drill', 'Drill'], ['pairs', 'Pairs'], ['sheets', 'Sheets'], ['progress', 'Progress']];
  let tab = 'drill';
  const dialog = document.createElement('dialog');
  dialog.id = 'r18Dialog';
  dialog.setAttribute('aria-label', 'Study');
  dialog.innerHTML = `<div class="r18-head"><div class="r18-tabs" role="tablist">${TABS.map(([k, t]) => `<button role="tab" data-r18-tab="${k}">${t}</button>`).join('')}</div><button class="r18-close" data-r18-close aria-label="Close study">×</button></div><div class="r18-body" id="r18Body" tabindex="-1"></div>`;
  document.body.appendChild(dialog);
  const body = dialog.querySelector('#r18Body');
  function open(which) {
    if (which) tab = which;
    if (typeof dismissMenu === 'function') dismissMenu();
    if (!dialog.open) dialog.showModal();
    render();
  }
  function close() { if (dialog.open) dialog.close(); }
  function render() {
    dialog.querySelectorAll('[data-r18-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.r18Tab === tab));
    dialog.dataset.tab = tab;
    body.innerHTML = tab === 'drill' ? drillHTML() : tab === 'pairs' ? pairsHTML() : tab === 'sheets' ? sheetsHTML() : progressHTML();
    body.scrollTop = 0;
    if (tab === 'progress') refreshDiagnostics();
  }
  const pill = (group, value, text, on, extra = '') => `<button class="r18-pill" data-r18-set="${group}" data-value="${esc(value)}" aria-pressed="${on}"${extra}>${text}</button>`;

  /* ---------- drill ---------- */
  const D = { view: 'setup', revealed: 0, hint: false };
  const dp = () => (prefs().drill ||= { courses: [...COURSES], kinds: ['Case', 'Concept', 'Rule'], which: 'all', order: 'reading', length: 20, staged: true, cram: false, scope: 'courses' });
  function scopeRegion() { return S.region && COURSES.includes(regionCourse(regionFor(S.region))) ? regionFor(S.region) : null; }
  function pool(p = dp(), only = null) {
    const reg = p.scope === 'subject' ? scopeRegion() : null;
    let list = allEntries().filter(n => only ? only.has(n.id) : (reg ? homeOf(n.id).region === reg.id : p.courses.includes(courseOf(n))) && p.kinds.includes(n.kind));
    if (!only) {
      if (p.which === 'needs') list = list.filter(n => { const r = ratingOf(n.id); return r && r < 3; });
      if (p.which === 'unrated') list = list.filter(n => !ratingOf(n.id));
    }
    if (p.order === 'shuffle') { list = list.slice(); for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } }
    if (p.order === 'weakest') list = list.slice().sort((a, b) => (ratingOf(a.id) || 1.5) - (ratingOf(b.id) || 1.5));
    return list;
  }
  function startSession(only = null, title = '') {
    const p = dp(), list = pool(p, only), cap = only || !p.length ? list.length : p.length;
    const queue = list.slice(0, cap).map(n => n.id);
    if (!queue.length) { toast('No entries match those choices.'); return; }
    store.session = { queue, i: 0, total: queue.length, tally: { 3: 0, 2: 0, 1: 0 }, missed: [], cram: !!p.cram, staged: p.staged !== false, title };
    D.view = 'card'; D.revealed = store.session.staged ? 0 : 99; D.hint = false;
    save(false); tab = 'drill';
    if (!dialog.open) dialog.showModal();
    render();
  }
  function current() { const s = store.session; return s && nodesById.get(s.queue[s.i]); }
  function advance() {
    const s = store.session; s.i++;
    while (s.i < s.queue.length && !nodesById.get(s.queue[s.i])) s.i++;
    D.revealed = s.staged ? 0 : 99; D.hint = false;
    if (s.i >= s.queue.length) D.view = 'summary';
    save(false); render();
  }
  function rateCurrent(r) {
    const s = store.session, n = current(); if (!s || !n) return;
    rate(n.id, r); s.tally[r]++;
    if (r < 3) { if (!s.missed.includes(n.id)) s.missed.push(n.id); if (s.cram) s.queue.push(n.id); }
    advance();
  }
  function reveal(i) { const n = current(); if (!n) return; const max = stagesFor(n).length; D.revealed = Math.max(D.revealed, Math.min(max, i)); render(); }
  function drillHTML() {
    const s = store.session;
    if (D.view === 'card' && s && s.i < s.queue.length && current()) return cardHTML();
    if (D.view === 'summary' && s) return summaryHTML();
    return setupHTML();
  }
  function setupHTML() {
    const p = dp(), all = allEntries(), reg = scopeRegion(), n = pool(p).length, s = store.session, left = s ? s.queue.length - s.i : 0;
    const count = c => all.filter(x => courseOf(x) === c).length;
    return `<div class="r18-kicker">RECITATION</div><h2>Drill</h2><p class="r18-lead">Say the answer out loud, reveal it in stages, then mark how it went. Ratings colour the map and feed Progress.</p>
    ${s && left > 0 ? `<div class="r18-resume"><span>${s.title ? esc(s.title) + ' · ' : ''}${left} of ${s.queue.length} left in your last session.</span><button class="r18-primary" data-r18-do="resume">Resume <kbd>Enter</kbd></button><button data-r18-do="discard">Discard</button></div>` : ''}
    <div class="r18-field"><span>Courses</span><div>${COURSES.map(c => pill('course', c, `${esc(c)} <small>${count(c)}</small>`, p.courses.includes(c) && p.scope !== 'subject')).join('')}${reg ? pill('scope', 'subject', `Only ${esc(shortRegionTitle(reg))}`, p.scope === 'subject') : ''}</div></div>
    <div class="r18-field"><span>Entries</span><div>${pill('kind', 'Case', 'Cases', p.kinds.includes('Case'))}${pill('kind', 'Concept', 'Concepts', p.kinds.includes('Concept'))}${pill('kind', 'Rule', 'Rules and provisions', p.kinds.includes('Rule'))}</div></div>
    <div class="r18-field"><span>Which cards</span><div>${pill('which', 'all', 'All', p.which === 'all')}${pill('which', 'needs', 'Needs work', p.which === 'needs')}${pill('which', 'unrated', 'Unrated', p.which === 'unrated')}</div></div>
    <div class="r18-field"><span>Order</span><div>${pill('order', 'reading', 'Reading order', p.order === 'reading')}${pill('order', 'shuffle', 'Shuffled', p.order === 'shuffle')}${pill('order', 'weakest', 'Weakest first', p.order === 'weakest')}</div></div>
    <div class="r18-field"><span>Session length</span><div>${[10, 20, 30].map(v => pill('length', v, v, p.length === v)).join('')}${pill('length', 0, 'No cap', !p.length)}</div></div>
    <div class="r18-field"><span>Reveal</span><div>${pill('staged', 1, 'In stages', p.staged !== false)}${pill('staged', 0, 'All at once', p.staged === false)}</div></div>
    <div class="r18-field"><span>Session type</span><div>${pill('cram', 0, 'Standard', !p.cram)}${pill('cram', 1, 'Cram to mastery', !!p.cram)}</div></div>
    <div class="r18-actions"><button class="r18-primary" data-r18-do="start"${n ? '' : ' disabled'}>Start <kbd>Enter</kbd></button><span class="r18-muted">${p.length && n > p.length ? p.length : n} card${(p.length && n > p.length ? p.length : n) === 1 ? '' : 's'} from a pool of ${n}.${p.cram ? ' Anything short of ' + labels()[0] + ' comes back until it is.' : ''}</span></div>
    ${keysHTML()}`;
  }
  function keysHTML() {
    const L = labels();
    return `<details class="r18-keys"><summary>Keyboard</summary><p><kbd>Space</kbd> or <kbd>Enter</kbd> reveal the next stage · <kbd>I</kbd> <kbd>O</kbd> <kbd>P</kbd> (or <kbd>8</kbd> <kbd>9</kbd> <kbd>0</kbd>) reveal a stage directly · <kbd>1</kbd>/<kbd>Q</kbd> ${L[0]} · <kbd>2</kbd>/<kbd>W</kbd> ${L[1]} · <kbd>3</kbd>/<kbd>E</kbd> ${L[2]} · <kbd>H</kbd> memory hook · <kbd>S</kbd> skip · <kbd>A</kbd> open in the atlas · <kbd>Esc</kbd> close (the session is kept). From the map, <kbd>Shift</kbd>+<kbd>D</kbd> opens Drill.</p></details>`;
  }
  function cardHTML() {
    const s = store.session, n = current(), st = stagesFor(n), pl = placeOf(n), L = labels(), prev = ratingOf(n.id), hook = hookFor(n);
    const keys = ['I', 'O', 'P'];
    const next = st.findIndex((_, i) => i >= D.revealed);
    return `<div class="r18-cardtop"><button data-r18-do="end">End session</button><span class="r18-count">${Math.min(s.i + 1, s.queue.length)} / ${s.queue.length}</span><span class="r18-tally">${dot(3)}${s.tally[3]} ${dot(2)}${s.tally[2]} ${dot(1)}${s.tally[1]}</span></div>
    <div class="r18-bar"><i style="width:${(s.i / s.queue.length * 100).toFixed(1)}%"></i></div>
    <article class="r18-card" data-course="${esc(pl.course)}">
      <div class="r18-meta">${esc(pl.course)}${pl.region ? ' · ' + esc(shortRegionTitle(pl.region)) : ''}${pl.district ? ' › ' + esc(pl.district.title) : ''}</div>
      <div class="r18-title"><span class="r18-icon">${iconFor(n)}</span><div><h2>${esc(n.title)}</h2><div class="r18-kind">${esc(n.kind)}${prev ? ` · last time ${dot(prev)} ${L[3 - prev]}` : ' · not yet rated'}</div></div></div>
      <p class="r18-prompt">${n.kind === 'Case' ? 'Say the issue, the holding and the rule out loud.' : 'State it out loud, then name the cases that carry it.'}</p>
      ${hook ? (D.hint ? `<p class="r18-hook"><strong>Memory hook</strong> ${esc(hook)}</p>` : `<button class="r18-linkbtn" data-r18-do="hint">Show the memory hook <kbd>H</kbd></button>`) : ''}
      ${st.map((x, i) => i < D.revealed ? `<section class="r18-stage"><h3>${esc(x.label)}</h3>${x.html}</section>` : `<button class="r18-reveal${i === next ? ' is-next' : ''}" data-r18-reveal="${i + 1}">Reveal ${esc(x.label.toLowerCase())} <kbd>${keys[i]}</kbd></button>`).join('')}
    </article>
    <div class="r18-rate"><button class="r18-rb r18-b3" data-r18-rate="3">${L[0]} <kbd>1 · Q</kbd></button><button class="r18-rb r18-b2" data-r18-rate="2">${L[1]} <kbd>2 · W</kbd></button><button class="r18-rb r18-b1" data-r18-rate="1">${L[2]} <kbd>3 · E</kbd></button></div>
    <div class="r18-cardfoot"><button class="r18-linkbtn" data-r18-do="skip">Skip <kbd>S</kbd></button><button class="r18-linkbtn" data-r18-do="atlas">Open in the atlas <kbd>A</kbd></button></div>`;
  }
  function summaryHTML() {
    const s = store.session, L = labels(), done = s.tally[3] + s.tally[2] + s.tally[1];
    return `<div class="r18-kicker">SESSION COMPLETE</div><h2>${done} card${done === 1 ? '' : 's'} rated</h2>
    <div class="r18-stats"><div class="r18-stat r18-s3"><b>${s.tally[3]}</b><span>${L[0]}</span></div><div class="r18-stat r18-s2"><b>${s.tally[2]}</b><span>${L[1]}</span></div><div class="r18-stat r18-s1"><b>${s.tally[1]}</b><span>${L[2]}</span></div></div>
    ${s.missed.length ? `<h3>Worth another pass</h3><ul class="r18-list">${s.missed.map(id => nodesById.get(id)).filter(Boolean).map(n => `<li>${dot(ratingOf(n.id))}<button class="r18-linkbtn" data-r18-node="${esc(n.id)}">${esc(displayName(n))}</button></li>`).join('')}</ul>` : '<p class="r18-lead">Nothing missed.</p>'}
    <div class="r18-actions"><button class="r18-primary" data-r18-do="new">New session <kbd>Enter</kbd></button>${s.missed.length ? '<button data-r18-do="missed">Drill the ones I missed</button>' : ''}<button data-r18-tab="progress">See progress</button></div>`;
  }

  /* ---------- confusable pairs ---------- */
  // A pair is a connection the notebook itself frames as a contrast: type Tension or Analogy, a label that
  // compares or distinguishes, or a generic "explained relationship" whose explanation draws the contrast.
  const PAIR_LABEL = /\b(contrast\w*|distinguish\w*|differ\w*|unlike|versus|compare\w*|rather than|as opposed to|separate\w*|not the same)\b/i;
  const PAIR_TEXT = /\b(by contrast|in contrast|distinguish\w*|unlike|whereas|rather than)\b/i;
  const PAIR_GENERIC = /^explained relationship/i;
  let pairCache = null, pairKey = '';
  function pairs() {
    const key = data.edges.length + ':' + data.nodes.length;
    if (pairKey === key) return pairCache;
    pairKey = key;
    const seen = new Set(), out = [];
    for (const e of data.edges) {
      const a = nodesById.get(e.source), b = nodesById.get(e.target);
      if (!a || !b || a === b || !drillable(a) || !drillable(b)) continue;
      const marked = e.kind === 'Tension' || e.kind === 'Analogy';
      if (!marked && !PAIR_LABEL.test(e.label || '') && !(PAIR_GENERIC.test(e.label || '') && PAIR_TEXT.test(e.explanation || ''))) continue;
      if (!marked && (a.kind === 'Case') !== (b.kind === 'Case')) continue;
      const k = [a.id, b.id].sort().join('|'); if (seen.has(k)) continue; seen.add(k);
      out.push({ e, a, b, course: courseOf(a), cross: courseOf(a) !== courseOf(b) });
    }
    out.sort((x, y) => COURSES.indexOf(x.course) - COURSES.indexOf(y.course) || displayName(x.a).localeCompare(displayName(y.a)));
    return pairCache = out;
  }
  const cap = s => { s = String(s || '').trim(); return s ? s[0].toUpperCase() + s.slice(1) : ''; };
  function pairsHTML() {
    const all = pairs(), f = prefs().pairCourse || 'all', list = all.filter(p => f === 'all' || p.course === f || courseOf(p.b) === f);
    return `<div class="r18-kicker">${all.length} PAIRS</div><h2>Confusable pairs</h2><p class="r18-lead">Neighbouring cases and doctrines that bleed into each other, with the distinguishing line first. They come from your own connections: any connection of type Tension or Analogy, and any whose note contrasts or distinguishes the two. Add a Tension connection (More → Add a connection) and it appears here.</p>
    <div class="r18-field"><span>Course</span><div>${pill('pairCourse', 'all', 'All', f === 'all')}${COURSES.map(c => pill('pairCourse', c, esc(c), f === c)).join('')}</div></div>
    <div class="r18-actions"><button data-r18-do="drillpairs"${list.length ? '' : ' disabled'}>Drill these ${new Set(list.flatMap(p => [p.a.id, p.b.id])).size} entries</button></div>
    <div class="r18-pairs">${list.map(p => `<article class="r18-pair" data-course="${esc(p.course)}"><header><button class="r18-linkbtn" data-r18-node="${esc(p.a.id)}">${dot(ratingOf(p.a.id))}${esc(displayName(p.a))}</button><em>vs</em><button class="r18-linkbtn" data-r18-node="${esc(p.b.id)}">${dot(ratingOf(p.b.id))}${esc(displayName(p.b))}</button><small>${esc(p.cross ? 'Across courses' : p.course)}</small></header>
      <p class="r18-line"><strong>${esc(cap(p.e.label))}.</strong> ${esc(p.e.explanation || '')}</p>
      <div class="r18-sides"><div><h4>${esc(displayName(p.a))}</h4><p>${esc(p.a.summary || '')}</p></div><div><h4>${esc(displayName(p.b))}</h4><p>${esc(p.b.summary || '')}</p></div></div></article>`).join('') || '<p class="r18-lead">No pairs for this course yet.</p>'}</div>`;
  }

  /* ---------- reference sheets ---------- */
  const sp = () => (prefs().sheet ||= { course: 'Contracts', region: 'all', kinds: 'all', holdings: false });
  function sheetHTML() {
    const p = sp(), regions = mapData().regions.filter(r => regionCourse(r) === p.course && r.id !== 'workbench-region' && r.special !== 'glossary').sort((a, b) => (a.step || 99) - (b.step || 99));
    const chosen = regions.filter(r => p.region === 'all' || r.id === p.region), L = labels();
    const want = n => drillable(n) && (p.kinds === 'all' || (p.kinds === 'cases') === (n.kind === 'Case'));
    let rows = 0;
    const blocks = chosen.map(r => {
      const subs = (r.districtIds || []).map(districtFor).filter(Boolean).map(d => {
        const ns = geoMembers(d.id).filter(want).sort((a, b) => geoRoleOrder(a, d) - geoRoleOrder(b, d) || homeOf(a.id).y - homeOf(b.id).y);
        if (!ns.length) return '';
        rows += ns.length;
        return `<h3>${esc(d.title)}</h3><table><thead><tr><th>Entry</th><th>Rule in one line</th><th></th></tr></thead><tbody>${ns.map(n => `<tr><th scope="row">${esc(displayName(n))}<small>${esc(n.kind)}${n.kind === 'Case' && /\((\d{4})\)/.test(n.title) ? ' · ' + n.title.match(/\((\d{4})\)/)[1] : ''}</small></th><td>${esc(n.summary || '')}${p.holdings && n.sections?.Holding ? `<p class="r18-hold"><b>Holding.</b> ${esc(n.sections.Holding)}</p>` : ''}</td><td class="r18-mark">${ratingOf(n.id) ? `<span class="r18-m${ratingOf(n.id)}" title="${L[3 - ratingOf(n.id)]}">${['', '○', '◐', '●'][ratingOf(n.id)]}</span>` : ''}</td></tr>`).join('')}</tbody></table>`;
      }).join('');
      return subs ? `<section><h2>${r.step ? r.step + '. ' : ''}${esc(shortRegionTitle(r))}</h2>${r.routeLabel ? `<p class="r18-route">${esc(r.routeLabel)}</p>` : ''}${subs}</section>` : '';
    }).join('');
    const ps = pairs().filter(x => (x.course === p.course || courseOf(x.b) === p.course) && (p.region === 'all' || homeOf(x.a.id).region === p.region || homeOf(x.b.id).region === p.region));
    const pairBlock = ps.length ? `<section><h2>Confusable pairs</h2><table class="r18-cmp"><thead><tr><th>This</th><th>That</th><th>The distinguishing line</th></tr></thead><tbody>${ps.map(x => `<tr><th scope="row">${esc(displayName(x.a))}</th><th scope="row">${esc(displayName(x.b))}</th><td><b>${esc(cap(x.e.label))}.</b> ${esc(x.e.explanation || '')}</td></tr>`).join('')}</tbody></table></section>` : '';
    return { html: `<div class="r18-sheet"><header><h1>${esc(p.course)}${p.region !== 'all' && chosen[0] ? ' — ' + esc(shortRegionTitle(chosen[0])) : ''}</h1><p>Reference sheet · ${rows} entries · DKLA ${R18.version} · ● ${L[0]} ◐ ${L[1]} ○ ${L[2]}</p></header>${blocks || '<p>No entries match.</p>'}${pairBlock}</div>`, regions };
  }
  function sheetsHTML() {
    const p = sp(), s = sheetHTML();
    return `<div class="r18-kicker">CHEAT SHEET</div><h2>Reference sheets</h2><p class="r18-lead">Every rule line in a course or a subject, in reading order, with the confusable pairs as a comparison chart. Built from your entries as they are now.</p>
    <div class="r18-field"><span>Course</span><div>${COURSES.map(c => pill('sheetCourse', c, esc(c), p.course === c)).join('')}</div></div>
    <div class="r18-field"><span>Subject</span><div><select data-r18-select="sheetRegion"><option value="all">All subjects</option>${s.regions.map(r => `<option value="${esc(r.id)}"${p.region === r.id ? ' selected' : ''}>${r.step ? r.step + '. ' : ''}${esc(shortRegionTitle(r))}</option>`).join('')}</select></div></div>
    <div class="r18-field"><span>Include</span><div>${pill('sheetKinds', 'all', 'Everything', p.kinds === 'all')}${pill('sheetKinds', 'cases', 'Cases only', p.kinds === 'cases')}${pill('sheetKinds', 'rules', 'Concepts and rules only', p.kinds === 'rules')}${pill('sheetHoldings', p.holdings ? 0 : 1, 'Add holdings', !!p.holdings)}</div></div>
    <div class="r18-actions"><button class="r18-primary" data-r18-do="print">Print / Save PDF</button></div>
    <div id="r18Sheet">${s.html}</div>`;
  }
  function printSheet() {
    let root = el('r18PrintRoot');
    if (!root) { root = document.createElement('div'); root.id = 'r18PrintRoot'; document.body.appendChild(root); }
    root.innerHTML = sheetHTML().html;
    document.body.classList.add('r18-print');
    const done = () => { document.body.classList.remove('r18-print'); root.innerHTML = ''; removeEventListener('afterprint', done); };
    addEventListener('afterprint', done);
    window.print();
  }

  /* ---------- progress ---------- */
  function tallyOf(list) { const t = { 3: 0, 2: 0, 1: 0, 0: 0 }; for (const n of list) t[ratingOf(n.id)]++; t.total = list.length; return t; }
  function barHTML(t) { const w = k => (t.total ? t[k] / t.total * 100 : 0).toFixed(2); return `<span class="r18-pbar" title="${t[3]} ${labels()[0]} · ${t[2]} ${labels()[1]} · ${t[1]} ${labels()[2]} · ${t[0]} unrated"><i class="r18-s3" style="width:${w(3)}%"></i><i class="r18-s2" style="width:${w(2)}%"></i><i class="r18-s1" style="width:${w(1)}%"></i></span>`; }
  function progressHTML() {
    const all = allEntries(), t = tallyOf(all), L = labels(), sy = store.sync, log = changelog();
    const courses = COURSES.map(c => {
      const list = all.filter(n => courseOf(n) === c), ct = tallyOf(list);
      const regs = mapData().regions.filter(r => regionCourse(r) === c && r.id !== 'workbench-region' && r.special !== 'glossary').sort((a, b) => (a.step || 99) - (b.step || 99));
      return `<details class="r18-course" data-course="${esc(c)}"><summary><strong>${esc(c)}</strong>${barHTML(ct)}<small>${ct.total - ct[0]} of ${ct.total} rated</small></summary>${regs.map(r => { const rl = list.filter(n => homeOf(n.id).region === r.id), rt = tallyOf(rl); return rl.length ? `<div class="r18-row"><button class="r18-linkbtn" data-r18-region="${esc(r.id)}">${esc(shortRegionTitle(r))}</button>${barHTML(rt)}<small>${rt.total - rt[0]}/${rt.total}</small><button data-r18-drill-region="${esc(r.id)}">Drill</button></div>` : ''; }).join('')}</details>`;
    }).join('');
    return `<div class="r18-kicker">RATINGS</div><h2>Progress</h2>
    <div class="r18-stats"><div class="r18-stat r18-s3"><b>${t[3]}</b><span>${L[0]}</span></div><div class="r18-stat r18-s2"><b>${t[2]}</b><span>${L[1]}</span></div><div class="r18-stat r18-s1"><b>${t[1]}</b><span>${L[2]}</span></div><div class="r18-stat"><b>${t[0]}</b><span>Unrated</span></div></div>
    ${courses}
    <div class="r18-actions"><button data-r18-do="needs"${t[2] + t[1] ? '' : ' disabled'}>Drill what needs work (${t[2] + t[1]})</button></div>
    <h3>Display</h3>
    <div class="r18-field"><span>Rating labels</span><div>${LABEL_SETS.map((s, i) => pill('labels', i, s.join(' · '), (prefs().labels || 0) === i)).join('')}</div></div>
    <div class="r18-field"><span>On the map</span><div>${pill('mapMarks', 1, 'Show ratings', prefs().mapMarks !== false)}${pill('mapMarks', 0, 'Hide', prefs().mapMarks === false)}</div></div>
    <h3>Sync across devices</h3>
    ${!hosted ? '<p class="r18-lead">Sync needs the hosted atlas. This copy was opened as a file, so ratings stay in this browser; use Export below to move them.</p>' : sy?.code ? `<p class="r18-lead">This device is linked. Enter the same code on another device to link it. The code is the key: anyone who has it can read and change these ratings.</p><div class="r18-code"><code>${esc(sy.code)}</code><button data-r18-do="copycode">Copy</button><button data-r18-do="syncnow">Sync now</button><button data-r18-do="unlink">Unlink</button></div>` : `<p class="r18-lead">Create a code to keep ratings in step across devices, or enter one you already have. Sync carries your ratings; notebook edits still travel by Save → export.</p><div class="r18-code"><button class="r18-primary" data-r18-do="createcode">Create a sync code</button><input id="r18CodeInput" placeholder="XXXX-XXXX-XXXX" autocomplete="off" spellcheck="false" aria-label="Sync code"><button data-r18-do="linkcode">Link</button></div>`}
    <p class="r18-muted" id="r18SyncStatus">${esc(syncStatusText())}</p>
    <h3>Your ratings</h3>
    <div class="r18-actions"><button data-r18-do="export">Export</button><button data-r18-do="import">Import</button><button data-r18-do="clear"${t.total - t[0] ? '' : ' disabled'}>Clear all</button><input type="file" id="r18Import" accept="application/json,.json" hidden></div>
    <h3>This app</h3>
    <p class="r18-lead">${hosted ? 'Install it and it opens in its own window and loads without a connection; the atlas file is kept on the device. It checks for a new version when opened and offers a reload rather than swapping mid-session. Source PDFs still load from the network when you open them.' : 'Opened as a file. Offline install is available from the hosted atlas.'}</p>
    <div class="r18-actions"><button data-r18-do="install" id="r18Install"${installEvent ? '' : ' disabled'}>Install app</button><button data-r18-do="update"${hosted ? '' : ' disabled'}>Check for updates</button></div>
    <dl class="r18-diag" id="r18Diag"></dl>
    <h3>What’s changed</h3>
    <div class="r18-log">${log.map(x => `<div><b>${esc(x.v)}</b><time>${esc(x.date)}</time><p>${esc(x.text)}</p></div>`).join('')}</div>`;
  }
  function changelog() { try { return JSON.parse(el('dklaR18Changelog').textContent); } catch { return []; } }
  async function refreshDiagnostics() {
    const dl = el('r18Diag'); if (!dl) return;
    const rows = [['Version', R18.version], ['Build', R18.build], ['Address', hosted ? location.host : 'local file'], ['Secure (https)', location.protocol === 'https:' ? 'yes' : location.hostname === 'localhost' ? 'localhost' : 'no']];
    if (hosted && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
      rows.push(['Offline copy', reg?.active ? (navigator.serviceWorker.controller ? 'ready' : 'installed, active after a reload') : reg?.installing ? 'downloading' : 'not installed']);
      rows.push(['Update waiting', reg?.waiting ? 'yes' : 'no']);
    } else rows.push(['Offline copy', hosted ? 'not supported by this browser' : 'hosted atlas only']);
    rows.push(['Running as', matchMedia('(display-mode: standalone)').matches ? 'installed app' : 'browser tab']);
    rows.push(['Entries rated', String(Object.values(store.ratings).filter(r => r.r).length)]);
    if (el('r18Diag')) el('r18Diag').innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  }

  /* ---------- sync ---------- */
  let syncTimer = 0, syncBusy = false, syncNote = '';
  function syncStatusText() {
    if (!hosted) return '';
    if (syncNote) return syncNote;
    const sy = store.sync;
    return sy?.code ? (sy.at ? 'Last synced ' + new Date(sy.at).toLocaleString() + '.' : 'Linked; not synced yet.') : '';
  }
  function setSyncNote(text) { syncNote = text; const s = el('r18SyncStatus'); if (s) s.textContent = syncStatusText(); }
  function mergeRatings(remote) {
    let changed = false;
    for (const [id, r] of Object.entries(remote || {})) {
      if (!r || typeof r.t !== 'number') continue;
      const mine = store.ratings[id];
      if (!mine || r.t > mine.t) { store.ratings[id] = { r: r.r | 0, t: r.t, n: r.n | 0 }; changed = true; }
    }
    return changed;
  }
  function newCode() {
    const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', a = new Uint32Array(12);
    crypto.getRandomValues(a);
    return [...a].map((v, i) => (i && i % 4 === 0 ? '-' : '') + abc[v % abc.length]).join('');
  }
  const normCode = s => { const c = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return c.length === 12 ? c.replace(/(.{4})(?=.)/g, '$1-') : ''; };
  async function api(method, code, payload) {
    const res = await fetch(method === 'GET' ? 'api/sync?code=' + encodeURIComponent(code) : 'api/sync', { method, cache: 'no-store', headers: payload ? { 'content-type': 'application/json' } : undefined, body: payload ? JSON.stringify({ code, data: payload }) : undefined });
    let json = null; try { json = await res.json(); } catch { /* not JSON: no sync service at this address */ }
    if (!res.ok || !json) { const err = new Error(json?.error || 'HTTP ' + res.status); err.status = res.status; err.code = json?.error; throw err; }
    return json;
  }
  function syncProblem(err) {
    if (err.code === 'not-configured') return 'Sync storage is not set up on the server yet.';
    if (err.status === 404 && err.code === 'unknown-code') return 'No ratings are stored under that code.';
    if (err.status === 404 || err.status === 405) return 'This address has no sync service.';
    if (!navigator.onLine) return 'Offline. Ratings are saved here and will sync when you are back online.';
    return 'Sync did not go through (' + err.message + '). Ratings are still saved in this browser.';
  }
  async function syncNow(quiet = true) {
    const code = store.sync?.code; if (!hosted || !code || syncBusy) return false;
    syncBusy = true; if (!quiet) setSyncNote('Syncing…');
    try {
      const out = await api('POST', code, { ratings: store.ratings });
      const changed = mergeRatings(out.data?.ratings);
      store.sync = { code, at: Date.now() };
      save(false); setSyncNote('');
      if (changed && dialog.open && tab === 'progress') render();
      return true;
    } catch (err) { setSyncNote(syncProblem(err)); return false; } finally { syncBusy = false; }
  }
  function queueSync() { if (!hosted || !store.sync?.code) return; clearTimeout(syncTimer); syncTimer = setTimeout(() => syncNow(true), 4000); }
  async function createCode() {
    const code = newCode(); setSyncNote('Creating…');
    try { await api('POST', code, { ratings: store.ratings }); store.sync = { code, at: Date.now() }; save(false); setSyncNote(''); render(); }
    catch (err) { setSyncNote(syncProblem(err)); }
  }
  async function linkCode() {
    const code = normCode(el('r18CodeInput')?.value);
    if (!code) { setSyncNote('A sync code is twelve letters and digits, like ABCD-EFGH-JKMN.'); return; }
    setSyncNote('Linking…');
    try { const out = await api('GET', code); mergeRatings(out.data?.ratings); store.sync = { code, at: Date.now() }; save(false); setSyncNote(''); render(); syncNow(true); }
    catch (err) { setSyncNote(syncProblem(err)); }
  }

  /* ---------- offline install and updates ---------- */
  let installEvent = null, swReg = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; const b = el('r18Install'); if (b) b.disabled = false; });
  addEventListener('appinstalled', () => { installEvent = null; });
  function offerReload(reg) {
    if (el('r18Update')) return;
    const bar = document.createElement('div'); bar.id = 'r18Update'; bar.setAttribute('role', 'status');
    bar.innerHTML = '<span>A new version of the atlas is ready.</span><button class="r18-primary" data-r18-do="reload">Reload</button><button data-r18-do="later" aria-label="Not now">Later</button>';
    document.body.appendChild(bar); swReg = reg;
  }
  if (hosted && 'serviceWorker' in navigator) {
    addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        swReg = reg;
        const watch = w => w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offerReload(reg); });
        if (reg.waiting && navigator.serviceWorker.controller) offerReload(reg);
        watch(reg.installing);
        reg.addEventListener('updatefound', () => watch(reg.installing));
      }).catch(() => { /* offline copy unavailable; the atlas still works */ });
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading || !window.__r18Reload) return; reloading = true; location.reload(); });
    });
  }
  async function checkUpdates() {
    if (!hosted) return;
    try {
      const v = await (await fetch('version.json', { cache: 'no-store' })).json();
      if (v.build === R18.build) { toast('This is the current version (' + R18.build + ').'); return; }
      if (swReg) { await swReg.update(); toast('A newer version exists. It is downloading; a reload prompt will appear when it is ready.'); }
      else if (confirm('A newer version exists. Reload now?')) location.reload();
    } catch { toast('Could not check for updates while offline.'); }
  }

  /* ---------- events ---------- */
  function setPref(group, value) {
    const p = dp(), toggle = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) { if (arr.length > 1) arr.splice(i, 1); } else arr.push(v); };
    if (group === 'course') { if (p.scope === 'subject') { p.scope = 'courses'; p.courses = [value]; } else toggle(p.courses, value); }
    else if (group === 'scope') p.scope = p.scope === 'subject' ? 'courses' : 'subject';
    else if (group === 'kind') toggle(p.kinds, value);
    else if (group === 'which' || group === 'order') p[group] = value;
    else if (group === 'length') p.length = Number(value);
    else if (group === 'staged') p.staged = value === '1';
    else if (group === 'cram') p.cram = value === '1';
    else if (group === 'pairCourse') prefs().pairCourse = value;
    else if (group === 'sheetCourse') { sp().course = value; sp().region = 'all'; }
    else if (group === 'sheetKinds') sp().kinds = value;
    else if (group === 'sheetHoldings') sp().holdings = value === '1';
    else if (group === 'labels') prefs().labels = Number(value);
    else if (group === 'mapMarks') prefs().mapMarks = value === '1';
    save(false); render();
  }
  function act(name) {
    const s = store.session;
    if (name === 'start') startSession();
    else if (name === 'resume') { D.view = 'card'; D.revealed = s.staged ? 0 : 99; render(); }
    else if (name === 'discard') { store.session = null; save(false); render(); }
    else if (name === 'end') { D.view = s && s.tally[3] + s.tally[2] + s.tally[1] ? 'summary' : 'setup'; render(); }
    else if (name === 'new') { store.session = null; D.view = 'setup'; save(false); startSession(); }
    else if (name === 'missed') startSession(new Set(s.missed), 'Missed cards');
    else if (name === 'needs') { const ids = new Set(allEntries().filter(n => { const r = ratingOf(n.id); return r && r < 3; }).map(n => n.id)); startSession(ids, 'Needs work'); }
    else if (name === 'hint') { D.hint = true; render(); }
    else if (name === 'skip') advance();
    else if (name === 'atlas') { const n = current(); if (n) { close(); goNode(n.id, true); } }
    else if (name === 'drillpairs') { const f = prefs().pairCourse || 'all'; startSession(new Set(pairs().filter(p => f === 'all' || p.course === f || courseOf(p.b) === f).flatMap(p => [p.a.id, p.b.id])), 'Confusable pairs'); }
    else if (name === 'print') printSheet();
    else if (name === 'createcode') createCode();
    else if (name === 'linkcode') linkCode();
    else if (name === 'syncnow') syncNow(false);
    else if (name === 'unlink') { if (confirm('Unlink this device? Ratings stay here; they stop syncing.')) { store.sync = null; save(false); render(); } }
    else if (name === 'copycode') navigator.clipboard?.writeText(store.sync.code).then(() => toast('Sync code copied.'), () => toast(store.sync.code));
    else if (name === 'export') { const blob = new Blob([JSON.stringify({ format: 'dkla-ratings', version: 1, exportedAt: new Date().toISOString(), ratings: store.ratings }, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dkla-ratings-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
    else if (name === 'import') el('r18Import').click();
    else if (name === 'clear') { if (confirm('Clear every rating on this device' + (store.sync?.code ? ' and on linked devices' : '') + '? This cannot be undone.')) { const t = Date.now(); for (const id of Object.keys(store.ratings)) store.ratings[id] = { r: 0, t, n: 0 }; store.session = null; save(); render(); } }
    else if (name === 'install') { if (installEvent) { installEvent.prompt(); installEvent = null; } }
    else if (name === 'update') checkUpdates();
    else if (name === 'reload') { window.__r18Reload = true; if (swReg?.waiting) swReg.waiting.postMessage('skip-waiting'); else location.reload(); }
    else if (name === 'later') el('r18Update')?.remove();
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-r18-open],[data-r18-close],[data-r18-tab],[data-r18-set],[data-r18-do],[data-r18-reveal],[data-r18-rate],[data-r18-node],[data-r18-region],[data-r18-drill-region],[data-r18-rate-node]');
    if (!t) return;
    const d = t.dataset;
    if (d.r18Open) { e.stopPropagation(); open(d.r18Open); }
    else if ('r18Close' in d) close();
    else if (d.r18Tab) { tab = d.r18Tab; if (tab === 'drill' && D.view === 'summary') D.view = 'setup'; render(); }
    else if (d.r18Set) setPref(d.r18Set, d.value);
    else if (d.r18Do) act(d.r18Do);
    else if (d.r18Reveal) reveal(Number(d.r18Reveal));
    else if (d.r18Rate) rateCurrent(Number(d.r18Rate));
    else if (d.r18Node) { close(); goNode(d.r18Node, true); }
    else if (d.r18Region) { close(); goRegion(d.r18Region); }
    else if (d.r18DrillRegion) { const ids = new Set(allEntries().filter(n => homeOf(n.id).region === d.r18DrillRegion).map(n => n.id)); startSession(ids, shortRegionTitle(regionFor(d.r18DrillRegion))); }
    else if (d.r18RateNode) { const [id, r] = d.r18RateNode.split('|'); rate(id, ratingOf(id) === Number(r) ? 0 : Number(r)); paintReader(); }
  });
  document.addEventListener('change', e => {
    if (e.target.dataset?.r18Select === 'sheetRegion') { sp().region = e.target.value; save(false); render(); }
    if (e.target.id === 'r18Import' && e.target.files[0]) {
      e.target.files[0].text().then(text => { const j = JSON.parse(text); if (j.format !== 'dkla-ratings' || typeof j.ratings !== 'object') throw new Error('not a ratings file'); mergeRatings(j.ratings); save(); render(); toast('Ratings imported.'); }).catch(() => toast('That file is not a DKLA ratings export.'));
    }
  });
  dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
  document.addEventListener('keydown', e => {
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (!dialog.open) {
      if (!typing && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && e.key === 'D' && !document.querySelector('dialog[open]')) { e.preventDefault(); open('drill'); }
      return;
    }
    if (e.key === 'Escape') return;
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (tab !== 'drill') return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const stop = () => { e.preventDefault(); e.stopPropagation(); };
    const inCard = D.view === 'card' && current();
    if (!inCard) {
      if (k === 'Enter' && !e.target.closest?.('button')) { stop(); const s = store.session; if (D.view === 'summary') act('new'); else if (s && s.queue.length - s.i > 0) act('resume'); else act('start'); }
      return;
    }
    const n = current(), max = stagesFor(n).length;
    if (k === ' ' || k === 'Enter') { stop(); if (D.revealed < max) reveal(D.revealed + 1); }
    else if (k === 'i' || k === '8') { stop(); reveal(1); }
    else if (k === 'o' || k === '9') { stop(); reveal(2); }
    else if (k === 'p' || k === '0') { stop(); reveal(3); }
    else if (k === '1' || k === 'q') { stop(); rateCurrent(3); }
    else if (k === '2' || k === 'w') { stop(); rateCurrent(2); }
    else if (k === '3' || k === 'e') { stop(); rateCurrent(1); }
    else if (k === 'h') { stop(); act('hint'); }
    else if (k === 's') { stop(); act('skip'); }
    else if (k === 'a') { stop(); act('atlas'); }
  }, true);

  /* ---------- entry points in the existing chrome ---------- */
  const launch = document.createElement('button');
  launch.id = 'r18Launch'; launch.className = 'r18-launcher'; launch.title = 'Drill, pairs, reference sheets and progress (Shift + D)'; launch.dataset.r18Open = 'drill'; launch.textContent = 'STUDY';
  const header = document.querySelector('header.study-header');
  if (header) header.insertBefore(launch, el('shLaunch') || null);
  if (typeof moreMenu === 'function') {
    const prior = moreMenu;
    moreMenu = function (...args) {
      const out = prior.apply(this, args), menu = el('moreMenu');
      if (menu && !menu.hidden && !menu.querySelector('[data-r18-open]')) menu.insertAdjacentHTML('afterbegin', '<small>Study</small><button role="menuitem" data-r18-open="drill">Recall drill</button><button role="menuitem" data-r18-open="pairs">Confusable pairs</button><button role="menuitem" data-r18-open="sheets">Reference sheets</button><button role="menuitem" data-r18-open="progress">Progress, sync and version</button><hr>');
      return out;
    };
  }

  /* ---------- rating control in the reading panel ---------- */
  function paintReader() {
    const panel = el('inspector'); if (!panel || panel.hidden) return;
    const old = panel.querySelector('.r18-recall');
    const n = selected?.type === 'node' ? nodesById.get(selected.id) : null;
    if (!n || !drillable(n)) { old?.remove(); return; }
    const L = labels(), r = ratingOf(n.id);
    const html = `<span>Recall</span>${[3, 2, 1].map(v => `<button class="r18-chip r18-c${v}" data-r18-rate-node="${esc(n.id)}|${v}" aria-pressed="${r === v}">${L[3 - v]}</button>`).join('')}`;
    if (old && old.dataset.id === n.id) { if (old.dataset.r !== String(r)) { old.innerHTML = html; old.dataset.r = r; } return; }
    old?.remove();
    const anchor = panel.querySelector('.reader-body .takeaway') || panel.querySelector('.takeaway');
    if (!anchor) return;
    const bar = document.createElement('div'); bar.className = 'r18-recall'; bar.dataset.id = n.id; bar.dataset.r = r; bar.innerHTML = html;
    anchor.after(bar);
  }
  if (el('inspector')) new MutationObserver(() => paintReader()).observe(el('inspector'), { childList: true, subtree: true });

  /* ---------- ratings on the map ---------- */
  let regionCache = new Map(), regionRev = -1;
  function regionTallies() {
    const entries = allEntries();
    if (regionRev === storeRev + ':' + poolKey) return regionCache;
    regionRev = storeRev + ':' + poolKey; regionCache = new Map();
    for (const n of entries) { const id = homeOf(n.id).region; let t = regionCache.get(id); if (!t) regionCache.set(id, t = { 3: 0, 2: 0, 1: 0, total: 0 }); t.total++; const r = ratingOf(n.id); if (r) t[r]++; }
    return regionCache;
  }
  R18.afterDraw.push(() => {
    if (prefs().mapMarks === false || !Object.keys(store.ratings).length) return;
    const z = S.z, B = visibleBox(), parts = [];
    for (const [id, t] of regionTallies()) {
      if (!(t[3] + t[2] + t[1])) continue;
      const r = regionFor(id); if (!r || !intersects(r, B, 0) || r.w * z < 36) continue;
      const w = r.w * .84, x0 = r.x + r.w * .08, h = Math.min(r.h * .06, 5 / z), y = r.y + r.h - h - Math.min(r.h * .05, 7 / z);
      let x = x0; parts.push(`<rect x="${x0}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#0b1219" fill-opacity=".55"/>`);
      for (const k of [3, 2, 1]) { const seg = w * t[k] / t.total; if (seg > 0) { parts.push(`<rect x="${x}" y="${y}" width="${seg}" height="${h}" rx="${h / 2}" fill="${COLORS[k]}"/>`); x += seg; } }
    }
    for (const card of svg.querySelectorAll('.node-card[data-map-node]')) {
      const id = card.dataset.mapNode, r = ratingOf(id); if (!r) continue;
      const h = homeFor(id); if (!h) continue;
      const rad = Math.min(h.h * .17, 6.5 / z);
      parts.push(`<circle cx="${h.x + h.w - rad * .3}" cy="${h.y + rad * .3}" r="${rad}" fill="${COLORS[r]}" stroke="#0b1219" stroke-width="${rad * .28}"/>`);
    }
    if (parts.length) svg.insertAdjacentHTML('beforeend', `<g class="r18-marks" pointer-events="none">${parts.join('')}</g>`);
  });

  /* ---------- start ---------- */
  document.title = 'DKLA · ' + R18.version;
  setTimeout(() => { document.title = 'DKLA · ' + R18.version; }, 1500);
  if (hosted && store.sync?.code) { setTimeout(() => syncNow(true), 2500); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(true); }); addEventListener('online', () => syncNow(true)); }
  window.DKLAStudy = { open, close, pairs, entries: allEntries, ratings: () => store.ratings, rate, sync: syncNow, startSession, state: () => ({ tab, view: D.view, revealed: D.revealed, session: store.session }) };
})();
