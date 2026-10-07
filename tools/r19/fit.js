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
    const tryAt = (scale, lines) => { const rows = greedy(t, maxW, fs * scale, weight, cls); return rows && rows.length <= lines ? rows : null; };
    let rows = tryAt(1, maxLines); if (rows) return rows;
    for (let s = .95; s >= .78; s -= .05) { rows = tryAt(s, maxLines); if (rows) { rows.scale = s; return rows; } }
    // one more line, sized so the block is no taller than maxLines lines were
    const cap = maxLines / (maxLines + 1);
    for (let s = Math.min(.95, cap); s >= .5; s -= .04) { rows = tryAt(s, maxLines + 1); if (rows) { rows.scale = s; return rows; } }
    for (let s = .76; s >= .5; s -= .04) { rows = tryAt(s, maxLines); if (rows) { rows.scale = s; return rows; } }
    for (let extra = 2; extra <= 4; extra++) { const top = maxLines / (maxLines + extra); for (let s = top; s >= .32; s -= .04) { rows = tryAt(s, maxLines + extra); if (rows) { rows.scale = s; return rows; } } }
    return wrap0(t, maxW, fs, weight, maxLines, cls);   // nothing reasonable fits: the old behaviour
  };
  textLines = function (rows, x, y, fs, ...rest) {
    return lines0(rows, x, y, rows && rows.scale ? fs * rows.scale : fs, ...rest);
  };
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
