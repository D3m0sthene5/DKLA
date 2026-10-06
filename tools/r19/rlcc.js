/* r19.4: the Restatement of the Law, Consumer Contracts. The full text was on file but only one study-note
   entry (labelled § 2) pointed at it. This adds rule entries for the assigned sections that had none, in free
   card slots of the subtopics whose assignments list them, turns the old entry into a §§ 1–10 hub, and adds
   page links to the assignment notes. Runs after briefs.js; safe to run again on saved data. */
(function () {
  'use strict';
  const R = window.DKLABriefs && window.DKLABriefs.data && window.DKLABriefs.data.rlcc;
  if (!R) return;
  function apply() {
    const M = mapData(), now = R.updatedAt; let changed = 0;
    const edgeIds = new Set(data.edges.map(e => e.id));
    const link = (source, target, label, explanation) => {
      const id = `r19-rlcc-${source}-${target}`;
      if (edgeIds.has(id) || !nodesById.get(source) || !nodesById.get(target)) return;
      data.edges.push({ id, source, target, label, kind: 'Study link', explanation, status: 'Proposed', supports: [], sources: [], createdAt: now, updatedAt: now, provenance: { basis: 'Black-letter text of the Official Text (2024) and the syllabus assignment list.' } });
      edgeIds.add(id); changed++;
    };
    for (const r of R.rules) {
      const d = M.districts[r.home.district]; if (!d) continue;
      let n = nodesById.get(r.id);
      // An entry the owner has edited keeps the owner's text.
      if (!n || (n.rlcc !== R.stamp && n.updatedAt === now)) {
        const fresh = { id: r.id, title: r.title, shortTitle: r.shortTitle, kind: r.kind, courses: r.courses, summary: r.summary, notes: r.notes, sections: {}, tags: r.tags, status: r.status, sources: r.sources, createdAt: now, updatedAt: now, provenance: { priorVersions: [] }, position: { x: r.home.x, y: r.home.y }, learning: { district: r.home.district, coverage: 'Assigned supplemental source on file' }, rlcc: R.stamp };
        if (n) Object.assign(n, fresh); else { data.nodes.push(fresh); nodesById.set(r.id, fresh); }
        changed++;
      }
      const home = { id: r.id, x: r.home.x, y: r.home.y, w: r.home.w, h: r.home.h, region: d.region, district: r.home.district, core: r.home.core, support: !r.home.core };
      if (JSON.stringify(M.homes[r.id]) !== JSON.stringify(home)) { M.homes[r.id] = home; changed++; }
      const places = data.geography && data.geography.placements;
      if (places && !places[r.id]) { places[r.id] = Object.assign({ region: d.region, district: r.home.district }, r.placement); changed++; }
    }
    for (const r of R.rules) for (const [target, label, why] of r.links) link(r.id, target, label, why);
    const hub = nodesById.get(R.hub.id);
    if (hub) {
      if (hub.rlcc !== R.stamp && (hub.rlcc || hub.updatedAt === R.hubSeedUpdated)) {
        const keep = (hub.sources || []).filter(s => !String(s.url || '').startsWith('added-sources/Complete Restatement.pdf'));
        Object.assign(hub, { title: R.hub.title, shortTitle: R.hub.shortTitle, summary: R.hub.summary, notes: R.hub.notes, sources: R.hub.sources.concat(keep), rlcc: R.stamp });
        const place = data.geography && data.geography.placements && data.geography.placements[hub.id]; if (place) place.displayLabel = R.hub.displayLabel;
        changed++;
      }
      for (const [target, label, why] of R.hub.links) link(hub.id, target, label, why);
    }
    for (const [id, list] of Object.entries(R.cite)) {
      const n = nodesById.get(id); if (!n) continue;
      if (!Array.isArray(n.sources)) n.sources = [];
      for (const s of list) if (!n.sources.some(x => x && x.url === s.url)) { n.sources.push({ label: s.label, url: s.url }); changed++; }
    }
    if (changed) {
      try { if (typeof rebuildIndex === 'function') rebuildIndex(); } catch { /* the search index rebuilds on the next edit */ }
      try { if (typeof saveCache === 'function') saveCache(); } catch { /* storage unavailable */ }
      try { renderInspector(); schedule(); } catch { /* not ready to draw */ }
    }
    return changed;
  }
  (function whenReady() { if (!window.LegalAtlas?.ready || typeof nodesById === 'undefined') { setTimeout(whenReady, 120); return; } apply(); setTimeout(apply, 3200); })();
  window.DKLABriefs.rlcc = apply;
})();
