/* DKLA sessions: Civil Procedure follows the syllabus of October 1, 2026.

   The graph seed in src/data was written from the September 3 syllabus and is never edited. A visitor who has
   opened the atlas before also has a saved copy of the whole graph in this browser, and that copy is what opens,
   so a change made only to the seed would not reach them. The October 1 revision (weeks 6 to 9 re-divided, one
   reading added) is therefore a list of edits in the dklaCivilSyllabus block (tools/sessions/civil-syllabus.json),
   applied at run time over whichever graph is open, in the manner of r19/audit.js: each edit names a field with
   its September value and its October value and applies only while the field still holds the September value.
   An entry the owner has rewritten is left alone, and running it again changes nothing. */
(() => {
  'use strict';
  let R;
  try {
    R = JSON.parse(document.getElementById('dklaCivilSyllabus').textContent);
  } catch {
    return;
  }
  if (!R?.weeks || !R.entries) return;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function swap(obj, path, from, to) {
    const keys = path.split('.');
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      o = o?.[keys[i]];
      if (!o || typeof o !== 'object') return 0;
    }
    const k = keys[keys.length - 1];
    if (!same(o[k], from)) return 0;
    o[k] = JSON.parse(JSON.stringify(to));
    return 1;
  }
  function apply() {
    if (typeof data === 'undefined' || !data?.nodes || !Array.isArray(data.civilCorpus?.weeks)) return 0;
    let changed = 0;
    for (const [number, edits] of Object.entries(R.weeks)) {
      const w = data.civilCorpus.weeks.find((w) => w.number === +number);
      if (w) for (const [p, a, b] of edits) changed += swap(w, p, a, b);
    }
    for (const [id, edits] of Object.entries(R.entries)) {
      const n = nodesById.get(id);
      if (n) for (const [p, a, b] of edits) changed += swap(n, p, a, b);
    }
    if (changed) {
      try {
        if (typeof rebuildIndex === 'function') rebuildIndex();
      } catch {
        /* the search index rebuilds on the next edit */
      }
      try {
        if (typeof saveCache === 'function') saveCache();
      } catch {
        /* storage unavailable */
      }
      try {
        renderInspector();
        schedule();
      } catch {
        /* not ready to draw */
      }
    }
    return changed;
  }
  // True when the open graph shows the October division (used by the checks).
  function current() {
    if (typeof data === 'undefined' || !Array.isArray(data?.civilCorpus?.weeks)) return false;
    return Object.entries(R.weeks).every(([number, edits]) => {
      const w = data.civilCorpus.weeks.find((w) => w.number === +number);
      return !!w && edits.every(([p, , b]) => same(w[p], b));
    });
  }
  (function whenReady() {
    if (!window.LegalAtlas?.ready || typeof nodesById === 'undefined') {
      setTimeout(whenReady, 120);
      return;
    }
    apply();
    // A saved copy restored by sync or import arrives a little later.
    setTimeout(apply, 3400);
  })();
  window.DKLACivilSyllabus = { apply, current, revision: R.revision, data: R };
})();
