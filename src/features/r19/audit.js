/* DKLA r21: corrections from the October 2026 content audit. Every change is in the dklaR21Audit block and is
   applied at run time over the saved graph, in the manner of plain.js: a text edit names a field and its exact old
   and new value and applies only while the field still holds the old value, so an entry the owner has rewritten is
   left alone; connections are removed by id or added with a fixed id; entries move to card slots that were free (or
   to one new row of a subtopic whose subject had room). Safe to run again on saved data. */
(() => {
  'use strict';
  let A;
  try {
    A = JSON.parse(document.getElementById('dklaR21Audit').textContent);
  } catch {
    return;
  }
  if (!A) return;
  function swap(obj, path, from, to) {
    const keys = path.split('.');
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      o = o?.[keys[i]];
      if (!o || typeof o !== 'object') return 0;
    }
    const k = keys[keys.length - 1];
    if (o[k] !== from) return 0;
    if (to === null) delete o[k];
    else o[k] = to;
    return 1;
  }
  function apply() {
    if (typeof data === 'undefined' || !data?.nodes) return 0;
    const M = mapData() || {};
    let changed = 0;
    const now = A.updatedAt;
    for (const [id, edits] of Object.entries(A.nodes || {})) {
      const n = nodesById.get(id);
      if (n) for (const [p, a, b] of edits) changed += swap(n, p, a, b);
    }
    const edges = new Map(data.edges.map((e) => [e.id, e]));
    for (const [id, edits] of Object.entries(A.edges || {})) {
      const e = edges.get(id);
      if (e) for (const [p, a, b] of edits) changed += swap(e, p, a, b);
    }
    for (const [id, edits] of Object.entries(A.districts || {})) {
      const d = M.districts?.[id];
      if (d) for (const [p, a, b] of edits) changed += swap(d, p, a, b);
    }
    for (const [id, edits] of Object.entries(A.regions || {})) {
      const r = (M.regions || []).find((x) => x.id === id);
      if (r) for (const [p, a, b] of edits) changed += swap(r, p, a, b);
    }
    const drop = new Set(A.removeEdges || []);
    if (drop.size) {
      const k = data.edges.length;
      data.edges = data.edges.filter((e) => !drop.has(e.id));
      changed += k - data.edges.length;
    }
    const have = new Set(data.edges.map((e) => e.id));
    for (const e of A.addEdges || []) {
      if (have.has(e.id) || !nodesById.get(e.source) || !nodesById.get(e.target)) continue;
      data.edges.push({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        kind: e.kind,
        explanation: e.explanation,
        status: 'Reviewed',
        supports: [],
        sources: [],
        createdAt: now,
        updatedAt: now,
        provenance: { basis: 'October 2026 content audit.' },
      });
      have.add(e.id);
      changed++;
    }
    for (const [id, g] of Object.entries(A.districtGrow || {})) {
      const d = M.districts?.[id];
      if (!d) continue;
      if (g.h && d.h < g.h) {
        d.h = g.h;
        changed++;
      }
      if (g.supportStart && d.supportStart !== g.supportStart) {
        d.supportStart = g.supportStart;
        changed++;
      }
    }
    for (const [id, home] of Object.entries(A.moves || {})) {
      const n = nodesById.get(id),
        d = M.districts?.[home.district];
      if (!n || !d || !M.homes) continue;
      // Slots are stored relative to the subtopic, because r20.js shifts whole courses on a wide window.
      const x = d.x + home.dx,
        y = d.y + home.dy,
        cur = M.homes[id];
      if (cur && cur.x === x && cur.y === y && cur.district === home.district) continue;
      M.homes[id] = {
        id,
        x,
        y,
        w: home.w,
        h: home.h,
        region: d.region,
        district: home.district,
        core: home.core,
        support: home.support,
      };
      n.position = { x, y };
      if (n.learning && typeof n.learning === 'object') n.learning.district = home.district;
      const place = data.geography?.placements?.[id];
      if (place) {
        place.region = d.region;
        place.district = home.district;
      }
      changed++;
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
  (function whenReady() {
    if (!window.LegalAtlas?.ready || typeof nodesById === 'undefined') {
      setTimeout(whenReady, 120);
      return;
    }
    apply();
    (window.DKLALayers = window.DKLALayers || []).push(apply);
  })();
  window.DKLAAudit = { apply, data: A };
})();
