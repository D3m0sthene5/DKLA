/* r22: rule entries behind the doctrine timelines. Six statute and rule steps in the timelines (Restatement §§ 205
   and 302, UCC §§ 2-209, 2-302, 1-303/2-202 and 2-716) had no entry on the map, so they could not be opened.
   tools/r19/data/rules22.json holds the entries, each in a free card slot of the subtopic whose doctrine it states
   (slots relative to the subtopic corner, as in r21-audit.json, because r20.js shifts whole courses on a wide
   window), plus the one layout change that made room: "Changing an existing agreement" grows by a row, its two
   notes move down a row and "Disclosure" below it moves down the same amount. Runs after audit.js; safe to run
   again on saved data; an entry the owner has edited keeps the owner's text. */
(function () {
  'use strict';
  const R = window.DKLABriefs && window.DKLABriefs.data && window.DKLABriefs.data.rules22;
  if (!R) return;
  function apply() {
    const M = mapData();
    if (!M || !M.districts || !M.homes) return 0;
    const now = R.updatedAt;
    let changed = 0;
    const placements = data.geography && data.geography.placements;
    const moveHome = (id, dy) => {
      const h = M.homes[id];
      if (!h) return;
      h.y += dy;
      const n = nodesById.get(id);
      if (n && n.position) n.position.y = h.y;
      changed++;
    };
    // layout: each change is stamped on the subtopic so it happens once per saved map
    for (const [id, s] of Object.entries(R.districtShift || {})) {
      const d = M.districts[id];
      if (!d || d.r22 === R.stamp) continue;
      d.y += s.dy;
      if (typeof d.supportStart === 'number') d.supportStart += s.dy;
      for (const h of Object.values(M.homes)) if (h.district === id) moveHome(h.id, s.dy);
      d.r22 = R.stamp;
      changed++;
    }
    for (const [id, g] of Object.entries(R.districtGrow || {})) {
      const d = M.districts[id];
      if (!d || d.r22 === R.stamp) continue;
      if (g.h && d.h < g.h) d.h = g.h;
      if (typeof g.supportStart === 'number') d.supportStart = g.supportStart;
      for (const [hid, s] of Object.entries(R.homeShift || {}))
        if (M.homes[hid] && M.homes[hid].district === id) moveHome(hid, s.dy);
      d.r22 = R.stamp;
      changed++;
    }
    // entries
    const edgeIds = new Set(data.edges.map((e) => e.id));
    const link = (source, target, label, explanation) => {
      const id = `r22-${source}--${target}`;
      if (edgeIds.has(id) || !nodesById.get(source) || !nodesById.get(target)) return;
      data.edges.push({
        id,
        source,
        target,
        label,
        kind: 'Study link',
        explanation,
        status: 'Reviewed',
        supports: [],
        sources: [],
        createdAt: now,
        updatedAt: now,
        provenance: {
          basis: 'Black-letter text in the Contracts Selections; added with the doctrine timelines (r22).',
        },
      });
      edgeIds.add(id);
      changed++;
    };
    for (const r of R.rules) {
      const d = M.districts[r.home.district];
      if (!d) continue;
      const x = d.x + r.home.dx,
        y = d.y + r.home.dy;
      let n = nodesById.get(r.id);
      if (!n || (n.r22 !== R.stamp && n.updatedAt === now)) {
        const fresh = {
          id: r.id,
          title: r.title,
          shortTitle: r.shortTitle,
          kind: r.kind,
          courses: r.courses,
          summary: r.summary,
          notes: r.notes,
          sections: {},
          tags: r.tags,
          status: r.status,
          sources: r.sources,
          createdAt: now,
          updatedAt: now,
          provenance: { priorVersions: [] },
          position: { x, y },
          learning: { district: r.home.district, coverage: 'Assigned supplemental source on file' },
          r22: R.stamp,
        };
        if (n) Object.assign(n, fresh);
        else {
          data.nodes.push(fresh);
          nodesById.set(r.id, fresh);
        }
        changed++;
      }
      const home = {
        id: r.id,
        x,
        y,
        w: r.home.w,
        h: r.home.h,
        region: d.region,
        district: r.home.district,
        core: !!r.home.core,
        support: !r.home.core,
      };
      if (JSON.stringify(M.homes[r.id]) !== JSON.stringify(home)) {
        M.homes[r.id] = home;
        changed++;
      }
      if (placements && !placements[r.id]) {
        placements[r.id] = Object.assign({ region: d.region, district: r.home.district }, r.placement);
        changed++;
      }
    }
    for (const r of R.rules) for (const [target, label, why] of r.links) link(r.id, target, label, why);
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
  window.DKLABriefs.rules22 = apply;
})();
