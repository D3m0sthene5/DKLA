/* r19.15: no cut-off labels on the map. The renderer wrapped every label with wrapM(), which ended any
   line that did not fit with "…" ("AT THE EDGE OF…", "What the barg…"). This version never cuts: it fits
   the whole text by stepping the size down a little and, only if that is not enough, by taking one more
   line at a size that keeps the same block height. textLines() applies the size the rows were fitted at. */
(function () {
  'use strict';
  if (typeof wrapM !== 'function' || typeof textLines !== 'function' || typeof measure !== 'function') return;
  const wrap0 = wrapM, lines0 = textLines;
  function greedy(text, maxW, fs, weight, cls) {
    const out = []; let line = '';
    for (const raw of String(text || '').split(/\s+/).filter(Boolean)) {
      const word = raw.replace(/­/g, ''), cand = line ? line + ' ' + word : word;
      if (line && measure(cand, fs, weight, cls) > maxW) { out.push(line); line = word; } else line = cand;
      if (measure(line, fs, weight, cls) > maxW) {
        // a single word wider than the box: break at a soft hyphen if it has one, else it does not fit
        const parts = raw.split('­'); let done = false;
        for (let k = parts.length - 1; k >= 1 && !done; k--) { const head = parts.slice(0, k).join('') + '-'; if (measure(head, fs, weight, cls) <= maxW) { out.push(head); line = parts.slice(k).join(''); done = true; } }
        if (!done) return null;
      }
    }
    if (line) out.push(line);
    return out.length ? out : [''];
  }
  wrapM = function (t, maxW, fs, weight = 400, maxLines = 3, cls = '') {
    if (!(maxW > 0) || !isFinite(maxW)) return wrap0(t, maxW, fs, weight, maxLines, cls);
    // Subject titles keep the renderer's own rule: the caller sizes them to the block, and when the full title
    // does not fit it swaps in the subject's short name ("Limits", "Readings") at the same size. Shrinking or
    // adding lines here made sizes uneven and pushed titles out of their blocks.
    if (cls === 'region-title') return wrap0(t, maxW, fs, weight, maxLines, cls);
    // r20.3: text is never set below 88% of its size. The earlier version went down to a third, which put
    // 5 px specks on the map and a dozen type sizes in one view. Order: full size; 94%; 88%; more lines at
    // 88% (not for one-line rows, which would run into the row below); last, 88% condensed to the width.
    const tryAt = (scale, lines, w = maxW) => { const rows = greedy(t, scale < 1 ? w * .97 : w, fs * scale, weight, cls); return rows && rows.length <= lines ? rows : null; };
    let rows = tryAt(1, maxLines); if (rows) return rows;
    for (const s of [.94, .88]) { rows = tryAt(s, maxLines); if (rows) { rows.scale = s; return rows; } }
    if (maxLines > 1) for (let extra = 1; extra <= 6; extra++) { rows = tryAt(.88, maxLines + extra); if (rows) { rows.scale = .88; return rows; } }
    for (const k of maxLines > 1 ? [1.18, 1.4] : [1.18, 1.4, 1.8, 2.6, 6]) { rows = tryAt(.88, maxLines, maxW * k); if (rows) { rows.scale = .88; rows.squeeze = maxW; return rows; } }
    return wrap0(t, maxW, fs, weight, maxLines, cls);   // nothing reasonable fits: the old behaviour
  };
  textLines = function (rows, x, y, fs, ...rest) {
    const size = rows && rows.scale ? fs * rows.scale : fs; let html = lines0(rows, x, y, size, ...rest);
    if (rows && rows.squeeze) {
      let i = 0;
      html = html.replace(/<tspan /g, m => { const row = rows[i++]; return row != null && measure(row, size, rest[1] || 400, rest[2] || '') > rows.squeeze ? `<tspan textLength="${rows.squeeze}" lengthAdjust="spacingAndGlyphs" ` : m; });
    }
    return html;
  };
  // The label engine drops a label whose box hits another. It measured the box at the unshrunk size and
  // unwrapped width, so a long name reached into the next subtopic and knocked labels out there: rows went
  // missing one by one and some tiles lost their titles. The box now matches what is drawn.
  if (typeof putLabel === 'function') {
    const put0 = putLabel;
    putLabel = function (o) {
      const r = put0.apply(this, arguments);
      try {
        const l = frameLabels[frameLabels.length - 1];
        if (l && l.box && o && o.html == null) {
          const rows = l.rows || o.rows, sc = rows && rows.scale || 1;
          if (sc !== 1) { l.box.w *= sc; l.box.h *= sc; }
          const lim = rows && rows.squeeze ? rows.squeeze : (o.width != null && o.width < 1e8 ? o.width : null);
          if (lim && l.box.w > lim * frameZ) l.box.w = lim * frameZ;
        }
      } catch { /* the engine's own box stands */ }
      return r;
    };
  }
  // Some short titles and map labels were stored already cut ("…and pensio…"). Put the full title back.
  const cut = v => typeof v === 'string' && /(…|\.\.\.)\s*$/.test(v);
  function mend() {
    let n = 0; const places = data.geography && data.geography.placements || {};
    for (const node of data.nodes) {
      if (cut(node.shortTitle) && node.title && !cut(node.title)) { node.shortTitle = node.title; n++; }
      const p = places[node.id]; if (p && cut(p.displayLabel) && node.title && !cut(node.title)) { p.displayLabel = node.title; n++; }
    }
    if (n) { try { if (typeof rebuildIndex === 'function') rebuildIndex(); } catch { /* next edit */ } try { if (typeof saveCache === 'function') saveCache(); } catch { /* storage unavailable */ } try { renderInspector(); } catch { /* not ready */ } }
    try { schedule(); } catch { /* drawn on the next frame anyway */ }
  }
  (function whenReady() { if (!window.LegalAtlas?.ready || typeof nodesById === 'undefined') { setTimeout(whenReady, 120); return; } mend(); setTimeout(mend, 3400); })();
})();

/* r19.18: a subject opens in its own course. The renderer hard-coded two region ids as "Study notes", but
   "Semester source and reading records" sits in Contracts (its courseKey says so), so opening it, or either
   of its subtopics, jumped the view to the Study workbench. The region's own courseKey now decides. */
(function () {
  'use strict';
  if (typeof goRegion !== 'function' || typeof goDistrict !== 'function') return;
  const region0 = goRegion, district0 = goDistrict;
  const courseOf = regionId => { const r = regionFor(regionId), c = r && r.courseKey; return c && c !== 'Study notes' ? c : null; };
  goRegion = function (id, animate = true) {
    const v = region0.apply(this, arguments), c = courseOf(id), r = regionFor(id);
    if (c && r && S.scope !== c && S.region === id) { S.scope = c; renderHeading(); fitBox(r, animate, R18.subjectPad(), .95); renderInspector(); }
    return v;
  };
  goDistrict = function (id, animate = true) {
    const v = district0.apply(this, arguments), d = districtFor(id), c = d && courseOf(d.region);
    if (c && S.scope !== c && S.district === id) {
      S.scope = c; renderHeading(); renderInspector();
      const members = geoMembers(id).map(n => homeFor(n.id)), main = members.filter(m => m && m.core), b = bounds(main.length ? main : members);
      fitBox({ x: d.x, y: d.y, w: d.w, h: Math.min(d.h, Math.max(330, b.y + b.h - d.y + 50)) }, animate, 16, 1.05);
    }
    return v;
  };
})();
