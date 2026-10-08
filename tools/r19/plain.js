/* DKLA r19.17: plain text. The owner asked for the AI-isms to go: labels about how an entry was written
   ("Detailed account of the assigned reading", "Source-grounded editorial classification"), disclaimers
   ("not legal authority or independent proof") and sentences in which an entry talks about itself.
   - Text in the graph: each edit in the dklaR19Plain block names a field and its exact old and new value, and applies
     only while the field still holds the old value, so an entry the owner has rewritten is left alone.
   - Interface text: the reading panel keeps only warnings a reader can act on (source missing, only part
     of the case assigned); provenance labels and disclaimers are dropped as the panel is built. */
(() => {
  'use strict';
  let D; try { D = JSON.parse(document.getElementById('dklaR19Plain').textContent); } catch { return; }
  if (!D) return;

  /* ---------- text in the graph ---------- */
  function swap(obj, path, from, to) {
    const keys = path.split('.'); let o = obj;
    for (let i = 0; i < keys.length - 1; i++) { o = o?.[keys[i]]; if (!o || typeof o !== 'object') return 0; }
    const k = keys[keys.length - 1];
    if (o[k] !== from) return 0;
    if (to === null) delete o[k]; else o[k] = to;
    return 1;
  }
  function applyPlain() {
    if (typeof data === 'undefined' || !data?.nodes) return 0;
    const map = mapData() || {}; let changed = 0;
    for (const [id, edits] of Object.entries(D.nodes || {})) { const n = nodesById.get(id); if (n) for (const [p, a, b] of edits) changed += swap(n, p, a, b); }
    const edges = new Map(data.edges.map(e => [e.id, e]));
    for (const [id, edits] of Object.entries(D.edges || {})) { const e = edges.get(id); if (e) for (const [p, a, b] of edits) changed += swap(e, p, a, b); }
    for (const [id, edits] of Object.entries(D.guides || {})) { const g = map.guides?.[id]; if (g) for (const [p, a, b] of edits) changed += swap(g, p, a, b); }
    for (const [id, edits] of Object.entries(D.districts || {})) { const d = map.districts?.[id]; if (d) for (const [p, a, b] of edits) changed += swap(d, p, a, b); }
    for (const [id, edits] of Object.entries(D.regions || {})) { const r = (map.regions || []).find(x => x.id === id); if (r) for (const [p, a, b] of edits) changed += swap(r, p, a, b); }
    for (const [key, edits] of Object.entries(D.cindex || {})) { const [topic, id] = key.split('|'); const row = (data.courseIndex?.topics?.[topic] || []).find(r => r.id === id); if (row) for (const [p, a, b] of edits) changed += swap(row, p, a, b); }
    for (const [course, edits] of Object.entries(D.scopeNotes || {})) for (const [, a, b] of edits) if (data.scopeNotes?.[course] === a) { data.scopeNotes[course] = b; changed++; }
    if (changed) {
      try { if (typeof rebuildIndex === 'function') rebuildIndex(); } catch { /* the search index rebuilds on the next edit */ }
      try { if (typeof saveCache === 'function') saveCache(); } catch { /* storage unavailable */ }
      try { renderInspector(); } catch { /* not ready to draw */ }
    }
    return changed;
  }
  (function whenReady() { if (!window.LegalAtlas?.ready || typeof nodesById === 'undefined') { setTimeout(whenReady, 120); return; } applyPlain(); setTimeout(applyPlain, 3200); })();

  /* ---------- interface text ---------- */
  // Only warnings a reader can act on.
  if (typeof sourceCaution === 'function') sourceCaution = function (n) {
    const p = geoPlacement(n.id) || {}, status = n.status || '', parts = [];
    if (status === 'Assigned source gap' || status === 'Not among the supplied files' || n.lrsImport?.coverageLevel === 'missing-source') parts.push('The assigned source is missing.');
    if (p.role === 'Partial excerpt' || n.id.endsWith('-boundary')) parts.push('Only part of the case was assigned.');
    if (/needs review|disputed/i.test(status)) parts.push('Marked ' + status.toLowerCase() + '.');
    return parts.length ? `<div class="source-caution">${parts.map(E).join('<br>')}</div>` : '';
  };
  // Labels that describe how a record was made rather than what it says.
  const NOISE = [
    '<div class="dkla-index-scope"><p>Every case in the course linked to this question.</p></div>',
    '<p class="context-text">These connected areas hold newer entries. The earlier map locations remain unchanged.</p>',
    ' This is recorded connectivity, not legal authority or independent proof.',
    '<br>The placement guide is hidden because this entry has changed since it was written.',
  ];
  const JUNK_NOTE = /imported|verified|invented|answer key|Editorial discussion|Navigation record|Only the assigned portion|study lens|tracking record|starter overview|now supplied|on hand|retain|remains? (distinct|separate)|Keep (that|the)|label alone|This entry concerns/;
  function clean(html) {
    let s = String(html);
    for (const x of NOISE) s = s.split(x).join('');
    s = s.replace('<h3>Qualifications and further discussion</h3>', '<h3>Notes</h3>')
      .replace('>Open the separate source-reference inventory<', '>Other authorities the readings cite<')
      // index rows: drop the coverage tag after a case name and the record-basis label, keep "Through …"
      .replace(/(<button data-study-node="[^"]*"><strong>[^<]*<\/strong>)<span>[^<]*<\/span>/g, '$1')
      .replace(/<span class="dkla-index-kind">[^<]*?(?: · Through ([^<]*))?<\/span>/g, (m, via) => via ? `<span class="dkla-index-kind">Through ${via}</span>` : '')
      // record details: the source list without a note on how it was written
      .replace(/<h4>Source scope<\/h4><p>[^<]*<\/p>/, '<h4>Sources</h4>');
    return s;
  }
  if (typeof readerChrome === 'function') { const base = readerChrome; readerChrome = function (body, ...rest) { return base(clean(body), ...rest); }; }
  if (typeof auditDetails === 'function') {
    const base = auditDetails;
    auditDetails = function (n) {
      let h = base(n); const note = (geoPlacement(n.id) || {}).reviewNote;
      if (note && JUNK_NOTE.test(note)) h = h.replace(`<p>${E(note)}`, '<p>');
      return h.replace('<p></p>', '');
    };
  }
  if (typeof toast === 'function') { const base = toast; toast = function (msg, ...rest) { return base(typeof msg === 'string' ? msg.replace(' This records your review, not automated legal verification.', '') : msg, ...rest); }; }
  // The LRS coverage dialog: drop the self-description above the list of missing readings.
  if (typeof modal === 'function') {
    const base = modal;
    modal = function (title, html, ...rest) {
      if (typeof html === 'string' && /^LRS · coverage/.test(title)) html = html.replace(/<div class="modal-copy"><p>\d+ authored LRS accounts[^<]*<\/p><p>Full briefs, note-only accounts[^<]*<\/p>/, '<div class="modal-copy">').replace('<p>Earlier Contracts and Civil Procedure gaps are listed in their own coverage guides.</p>', '');
      return base(title, html, ...rest);
    };
  }
  window.DKLAPlain = { apply: applyPlain, clean };
})();
