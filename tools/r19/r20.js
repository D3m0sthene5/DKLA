/* r20: map and panel clean-ups, and two-way links between the dictionary and the briefs.
   Loaded last. Nothing here changes stored entries. */
(function () {
  'use strict';
  const svg = document.getElementById('geoCanvas');
  const D = window.DKLABriefs && window.DKLABriefs.data;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- 1. a course view shows that course ----------
     Zoomed in on one course, the other courses' titles, tallies, tiles and blocks used to hang in at the edges
     ("…edure", "324 entries · 11 subjects"). They now fade out as the camera moves from the atlas to a course,
     continuously with the zoom, so the animation still reads as one map. */
  function fadeOthers() {
    if (!svg || typeof galaxy !== 'function') return;
    const blocks = galaxy().blocks || {}, mine = blocks[S.scope];
    if (!mine) return;
    // 0 at the atlas, 1 by the time this course fills the screen (courses differ in how far that zoom is)
    const zf = zoomFloor() * 1.12; let zc = zf * 1.6;
    try { const a = safeArea(), sb0 = scopeBox(); zc = Math.min((a.w - 40) / sb0.w, (a.h - 40) / sb0.h, .7) * 0.88; } catch { /* default span */ }
    const f = zc <= zf * 1.05 ? (S.z >= zc ? 1 : 0) : Math.max(0, Math.min(1, (S.z - zf) / (zc - zf)));
    if (f <= 0) return;
    // this course's own frame: its block plus its own supporting-cases tile, with a small margin
    const pad = Math.max(mine.w, mine.h) * 0.03;
    const box = { x0: mine.x - pad, y0: mine.y - pad, x1: mine.x + mine.w + pad, y1: mine.y + mine.h + pad };
    for (const tile of svg.querySelectorAll('.r19-tile')) {
      let tb; try { tb = tile.getBBox(); } catch { continue; }
      const cx = tb.x + tb.width / 2;
      if (cx > mine.x && cx < mine.x + mine.w && tb.y > mine.y && tb.y < mine.y + mine.h * 1.3) box.y1 = Math.max(box.y1, tb.y + tb.height + pad);
    }
    for (const label of svg.querySelectorAll('text.course-label')) {
      let lb; try { lb = label.getBBox(); } catch { continue; }
      const cx = lb.x + lb.width / 2;
      if (cx > mine.x && cx < mine.x + mine.w && lb.y + lb.height > mine.y - mine.h * 0.6 && lb.y < mine.y + mine.h) { box.y0 = Math.min(box.y0, lb.y - pad); box.x0 = Math.min(box.x0, lb.x - pad); box.x1 = Math.max(box.x1, lb.x + lb.width + pad); }
    }
    const keep = String(1 - f);
    const visit = (el, depth) => {
      if (el.tagName === 'defs' || el.tagName === 'title') return;
      let b; try { b = el.getBBox(); } catch { return; }
      if (!b || (!b.width && !b.height)) return;
      const out = b.x > box.x1 || b.x + b.width < box.x0 || b.y > box.y1 || b.y + b.height < box.y0;
      if (out) { el.style.opacity = keep; if (f > .97) el.style.pointerEvents = 'none'; return; }
      const inside = b.x >= box.x0 && b.x + b.width <= box.x1 && b.y >= box.y0 && b.y + b.height <= box.y1;
      if (!inside && depth < 2 && el.tagName === 'g' && el.children.length && !el.classList.contains('map-region') && !el.classList.contains('node-card')) for (const c of el.children) visit(c, depth + 1);
      else if (!inside) {
        // straddling the frame: it belongs to whichever side its centre is on
        const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
        if (cx < box.x0 || cx > box.x1 || cy < box.y0 || cy > box.y1) { el.style.opacity = keep; if (f > .97) el.style.pointerEvents = 'none'; }
      }
    };
    for (const el of svg.children) visit(el, 0);
  }

  /* ---------- 2. no unreadably small text ----------
     Text that would draw under about 8px on screen fades out; it returns as you zoom in. */
  function hideTinyText() {
    if (!svg) return;
    const z = S.z;
    for (const t of svg.querySelectorAll('text:not([data-r20]):not(.r20-tile)')) {
      const fs = parseFloat(t.getAttribute('font-size')); if (!fs) continue;
      // a count line never lists a zero ("0 cases · 0 concepts · 22 notes" reads as "22 notes")
      if (!t.children.length && /(^|· )0 [a-z]+/.test(t.textContent)) { const kept = t.textContent.split(' · ').filter(part => !/^0 [a-z]+$/.test(part.trim())); t.textContent = kept.join(' · '); }
      const px = fs * z; if (px >= 8) continue;
      const o = Math.max(0, (px - 7.2) / .8), had = t.style.opacity === '' ? 1 : parseFloat(t.style.opacity);
      t.style.opacity = String(Math.min(had, o));
    }
  }
  /* ---------- 2b. subject tiles at course zoom: one size, centred ----------
     While a subject is only a tile (no subtopics shown inside it yet) its name is drawn here: centred both
     ways, the same size in every tile on screen, the full name if it fits and the short name if not. The
     renderer drew these top-left beside a number badge, at sizes that varied tile to tile. */
  function wrapPlain(text, maxW, fs, weight) {
    const out = []; let line = '';
    for (const w of String(text).split(/\s+/).filter(Boolean)) {
      const cand = line ? line + ' ' + w : w;
      if (line && measure(cand, fs, weight) > maxW) { out.push(line); line = w; } else line = cand;
      if (measure(line, fs, weight) > maxW) return null;
    }
    if (line) out.push(line);
    return out;
  }
  function tileLabels() {
    if (!svg || typeof R11 === 'undefined' || !R11.modes) return;
    const z = S.z, M = mapData(), tiles = [];
    for (const g of svg.querySelectorAll('g.map-region')) {
      const path = g.querySelector('path[data-map-region]'); if (!path) continue;
      const id = path.getAttribute('data-map-region'), r = regionFor(id); if (!r) continue;
      const mode = R11.modes.get(id), pw = r.w * z, ph = r.h * z; if (pw < 30 || ph < 14) continue;
      // a block in the in-between mode is treated as a tile while it is still too small to show anything else
      if (mode !== 'star' && !(mode === 'mid' && pw < 130)) continue;
      tiles.push({ g, id, r, pw, ph });
    }
    if (!tiles.length) return;
    const names = t => { const full = shortRegionTitle(t.r), short = (typeof SHORT_NAMES !== 'undefined' && SHORT_NAMES[t.id] || '').replace(/­/g, ''); return short && short !== full ? [full, short] : [full]; };
    const fit = (t, px) => {
      const fs = px / z, maxW = (t.pw - (t.pw < 70 ? 6 : 14)) / z, maxLines = Math.max(1, Math.min(3, Math.floor((t.ph - 8) / (px * 1.22))));
      for (const name of names(t)) { const rows = wrapPlain(name, maxW, fs, 600); if (rows && rows.length <= maxLines) return rows; }
      return null;
    };
    let px = 15; const smallest = Math.min(...tiles.map(t => t.pw));
    px = Math.min(15, Math.max(9.5, smallest * 0.1));
    for (; px >= 9.5; px -= .5) if (tiles.every(t => fit(t, px))) break;
    px = Math.max(9.5, px);
    const parts = [];
    for (const t of tiles) {
      let size = px, rows = fit(t, size);
      while (!rows && size > 5.5) { size -= .5; rows = fit(t, size); }
      if (!rows) continue;
      for (const old of svg.querySelectorAll('text.region-title[data-map-region="' + t.id + '"]')) old.remove();
      for (const badge of t.g.querySelectorAll(':scope > g')) badge.remove();
      const fs = size / z, lh = fs * 1.22, cx = t.r.x + t.r.w / 2, y0 = t.r.y + t.r.h / 2 - (rows.length - 1) * lh / 2 + fs * .35;
      parts.push(`<text class="map-label region-title r20-tile" x="${cx}" y="${y0}" font-size="${fs}" font-weight="600" fill="#f7f5f0" text-anchor="middle" opacity="${t.g.getAttribute('opacity') || 1}" data-map-region="${esc(t.id)}" role="button" tabindex="0" style="cursor:pointer">${rows.map((row, i) => `<tspan x="${cx}" dy="${i ? lh : 0}">${esc(row)}</tspan>`).join('')}</text>`);
    }
    if (parts.length) svg.insertAdjacentHTML('beforeend', parts.join(''));
  }

  /* ---------- 2b'. subtopic tiles between the course view and the card view ----------
     Rule: a tile shows either content you can read or a clean summary, never a partial one. While a
     subtopic is under 190 px wide its entry names cannot fit on a line, so the renderer's rows (which came
     out as unreadable specks, or were dropped one by one where they collided) are replaced by the subtopic's
     name at one size for the whole subject and a count line. From 190 px the rows return as cards. */
  function districtTiles() {
    if (!svg || typeof R18 === 'undefined' || !R18.districtRows) return;
    const z = S.z, M = mapData(), V = visibleBox(), carded = new Set();
    for (const c of svg.querySelectorAll('.node-card[data-map-node]')) { const h = homeFor(c.dataset.mapNode); if (h && h.district) carded.add(h.district); }
    const byRegion = new Map();
    for (const d of Object.values(M.districts)) {
      const dw = d.w * z, dh = d.h * z; if (dw < 54 || dw >= 190 || dh < 26 || carded.has(d.id)) continue;
      if (d.x > V.x + V.w || d.x + d.w < V.x || d.y > V.y + V.h || d.y + d.h < V.y) continue;
      const titles = [...svg.querySelectorAll('text[data-map-district="' + d.id + '"]')], rows = [...svg.querySelectorAll('text[data-map-jump]')].filter(t => { const h = homeFor(t.getAttribute('data-map-jump')); return h && h.district === d.id; });
      const drawn = titles.find(t => !/^\+ \d/.test(t.textContent.trim()));
      // every tile the renderer has drawn, including those whose name and rows its label engine dropped
      const any = drawn || rows[0] || titles[0] || svg.querySelector('[data-map-district="' + d.id + '"]'); if (!any) continue;
      (byRegion.get(d.region) || byRegion.set(d.region, []).get(d.region)).push({ d, dw, dh, titles, rows, op: any.getAttribute('opacity') || 1 });
    }
    const parts = [];
    for (const [rid, list] of byRegion) {
      const region = regionFor(rid), acc = region ? regionAccent(region) : '#93a7b7';
      const fit = (t, px) => { const rows = wrapPlain(t.d.title || '', (t.dw - 16) / z, px / z, 600); return rows && rows.length * px * 1.2 <= t.dh - 10 && rows.length <= 3 ? rows : null; };
      // two sizes only across the whole view, so neighbouring subjects match
      const px = list.every(t => fit(t, 12)) ? 12 : 10;
      for (const t of list) {
        let size = px, rows = fit(t, size); while (!rows && size > 8.5) { size -= .5; rows = fit(t, size); }
        for (const old of t.titles) old.remove();
        for (const old of t.rows) { const pv = old.previousElementSibling; if (pv && pv.classList.contains('r20-mini')) pv.remove(); old.remove(); }
        // last resort for a very long name in a very small tile: set it at 9 px and condense it to the tile
        let squeeze = false; if (!rows) { size = 9; rows = wrapPlain(t.d.title || '', (t.dw - 16) / z * 1.3, size / z, 600); squeeze = true; }
        if (!rows || rows.length * size * 1.2 > t.dh - 6) continue;
        const d = t.d, fs = size / z, lh = fs * 1.2, x = d.x + 8 / z, y0 = d.y + 7 / z + fs * .82;
        parts.push(`<text class="map-label r20-tile" x="${x}" y="${y0}" font-size="${fs}" font-weight="600" fill="${acc}" opacity="${t.op}" data-map-district="${esc(d.id)}" role="button" tabindex="0" style="cursor:pointer">${rows.map((row, i) => `<tspan x="${x}" dy="${i ? lh : 0}"${squeeze && measure(row, fs, 600) > d.w - 16 / z ? ` textLength="${d.w - 16 / z}" lengthAdjust="spacingAndGlyphs"` : ''}>${esc(row)}</tspan>`).join('')}</text>`);
        const ns = R18.districtRows(d.id, d) || [], cases = ns.filter(n => n.kind === 'Case').length, rest = ns.length - cases;
        const note = [cases ? cases + (cases === 1 ? ' case' : ' cases') : '', rest ? rest + (rest === 1 ? ' concept' : ' concepts') : ''].filter(Boolean).join(' · ');
        const ny = y0 + (rows.length - 1) * lh + 15 / z;
        if (note && t.dw >= 96 && ny + 6 / z <= d.y + d.h && measure(note, 10 / z, 400, 'region-title') <= d.w - 16 / z) parts.push(`<text class="map-label r20-tile" x="${x}" y="${ny}" font-size="${10 / z}" font-weight="400" fill="#9fb0bf" opacity="${t.op}" pointer-events="none">${esc(note)}</text>`);
      }
    }
    if (parts.length) svg.insertAdjacentHTML('beforeend', parts.join(''));
  }

  /* ---------- 2c. one design for entries: cards with icons ----------
     When a subject is too small on screen for full cards, its entries were listed as bare lines of text.
     Each line is now a compact card with the entry's icon, so a subject looks the same kind of thing at
     every size. */
  let ICONS = null;
  const iconData = () => { if (!ICONS) { try { ICONS = JSON.parse(document.getElementById('dklaIcons').textContent); } catch { ICONS = { paths: {}, records: {} }; } } return ICONS; };
  function miniCards() {
    if (!svg) return;
    const z = S.z, rows = svg.querySelectorAll('text[data-map-jump]'); if (!rows.length) return;
    const I = iconData();
    for (const t of rows) {
      if (t.dataset.r20) continue;
      const id = t.getAttribute('data-map-jump'), h = homeFor(id), d = h && districtFor(h.district); if (!d) continue;
      // every row card is built on the renderer's 12 px row size, whatever the text was shrunk to
      const fs = 12 / z, base = parseFloat(t.getAttribute('y')); if (!isFinite(base)) continue;
      const x0 = d.x + 24, w = d.w - 48, ch = fs * 1.62, cy = base - fs * .34, top = cy - ch / 2;
      const region = regionFor(d.region), acc = region ? regionAccent(region) : '#93a7b7', n = nodesById.get(id);
      const rec = I.records && I.records[id], path = I.paths && I.paths[(rec && rec.motif) || (n && n.kind === 'Case' ? 'case' : n && n.kind === 'Rule' ? 'rule' : 'concept')] || (I.paths && I.paths.case) || '';
      const size = fs * 1.08, ix = x0 + fs * .5, op = t.getAttribute('opacity') || 1;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('opacity', op); g.setAttribute('pointer-events', 'none'); g.setAttribute('class', 'r20-mini');
      g.innerHTML = `<rect x="${x0}" y="${top}" width="${w}" height="${ch}" rx="${fs * .32}" fill="#1e2c37" stroke="${acc}" stroke-opacity=".3" stroke-width="${1 / z}"/>` +
        (n && n.kind === 'Case' ? `<path d="M${x0 + fs * .22} ${top + ch * .2}V${top + ch * .8}" stroke="${acc}" stroke-width="${1.6 / z}" opacity=".8"/>` : '') +
        (path ? `<g transform="translate(${ix},${cy - size / 2}) scale(${size / 24})" fill="none" stroke="${acc}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:${acc}">${path}</g>` : '');
      t.parentNode.insertBefore(g, t);
      const tx = ix + size + fs * .5;
      t.setAttribute('x', tx); for (const sp of t.querySelectorAll('tspan')) sp.setAttribute('x', tx);
      t.setAttribute('fill', '#dce5ec'); t.dataset.r20 = '1';
      // a long name is set slightly smaller, then condensed, so the whole name stays on its card
      for (const sp of [t, ...t.querySelectorAll('tspan')]) { sp.removeAttribute('textLength'); sp.removeAttribute('lengthAdjust'); }
      t.setAttribute('font-size', fs);
      let len = 0; try { len = t.getComputedTextLength(); } catch { /* not laid out */ }
      const room = x0 + w - fs * .5 - tx;
      if (len > room && room > 0) {
        // one smaller step only, so a view never mixes a dozen type sizes
        const k = .88; t.setAttribute('font-size', fs * k);
        if (len * k > room) for (const sp of t.querySelectorAll('tspan').length ? t.querySelectorAll('tspan') : [t]) { sp.setAttribute('textLength', room); sp.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
      }
      // a name too small to read is not drawn; the card and its icon stay
      const shown = parseFloat(t.getAttribute('font-size')) * z;
      if (shown < 8.2) t.style.opacity = shown < 7.4 ? 0 : ((shown - 7.4) / .8).toFixed(2);
    }
  }

  /* ---------- 2d. small cards keep their icon and their whole name ----------
     Below a certain size the icon layer left cards bare, and a long name could shrink to nothing. A small
     card now carries a small icon, and its name is set slightly smaller or condensed to stay on the card. */
  function smallCards() {
    if (!svg) return;
    const z = S.z, I = iconData();
    for (const card of svg.querySelectorAll('.node-card[data-map-node]')) {
      if (card.querySelector(':scope > g[transform]') || card.dataset.r20) continue;
      const id = card.dataset.mapNode, c = homeFor(id), t = card.querySelector('text'); if (!c || !t) continue;
      if (c.w * z < 70 || c.h * z < 13) continue;
      card.dataset.r20 = '1';
      const n = nodesById.get(id), region = regionFor(c.region), acc = region ? regionAccent(region) : '#93a7b7';
      const rec = I.records && I.records[id], path = I.paths && I.paths[(rec && rec.motif) || (n && n.kind === 'Case' ? 'case' : n && n.kind === 'Rule' ? 'rule' : 'concept')] || '';
      const size = Math.min(c.h * .6, 15 / z), ix = c.x + 9 / z + (n && n.kind === 'Case' ? 3 / z : 0), tx = ix + size + 5 / z, room = c.x + c.w - 6 / z - tx;
      if (path) card.insertAdjacentHTML('beforeend', `<g transform="translate(${ix},${c.y + (c.h - size) / 2}) scale(${size / 24})" fill="none" stroke="${acc}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" pointer-events="none" style="color:${acc}">${path}</g>`);
      // the name, whole: one line if it fits, otherwise two; a slightly smaller size before any squeeze
      const label = (n && (typeof displayName === 'function' ? displayName(n) : n.title)) || t.textContent, wt = t.getAttribute('font-weight') || 500;
      const two = c.h * z >= 25, words = String(label).split(/\s+/);
      let px = Math.min(12, c.h * z * (two ? .36 : .58)), rows = [label];
      const wide = (row, p) => measure(row, p / z, wt, 'node-card');
      if (wide(label, px) > room && two && words.length > 1) {
        let best = null;
        for (let i = 1; i < words.length; i++) { const r = [words.slice(0, i).join(' '), words.slice(i).join(' ')], m = Math.max(wide(r[0], px), wide(r[1], px)); if (!best || m < best.m) best = { r, m }; }
        rows = best.r;
      }
      const longest = Math.max(...rows.map(r => wide(r, px)));
      if (longest > room) px *= .88;
      const fs = px / z, cy = c.y + c.h / 2, y0 = rows.length === 1 ? cy + fs * .35 : cy - fs * .22;
      t.setAttribute('font-size', fs); t.setAttribute('x', tx); t.removeAttribute('textLength'); t.textContent = '';
      rows.forEach((row, i) => {
        const sp = document.createElementNS('http://www.w3.org/2000/svg', 'tspan'); sp.setAttribute('x', tx); sp.setAttribute('y', y0 + i * fs * 1.16); sp.textContent = row; t.appendChild(sp);
        let len = 0; try { len = sp.getComputedTextLength(); } catch { /* not laid out */ }
        if (len > room && room > 0) { sp.setAttribute('textLength', room); sp.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
      });
      t.style.opacity = px < 7.4 ? 0 : px < 8.2 ? ((px - 7.4) / .8).toFixed(2) : '';
    }
  }

  // run after every other layer has painted (the r18 hook runs last; the tiles are painted in it)
  const tidy = () => { try { tileLabels(); districtTiles(); miniCards(); smallCards(); fadeOthers(); hideTinyText(); } catch (e) { console.error('DKLA r20 map', e); } };
  if (window.R18 && Array.isArray(R18.afterDraw)) R18.afterDraw.push(tidy);
  else if (typeof draw === 'function') { const draw0 = draw; draw = function () { const v = draw0.apply(this, arguments); tidy(); return v; }; }

  /* ---------- 3. a course sits in the middle of the screen ----------
     The two small buttons at the top left reserved a whole column, pushing each course to the right. */
  const wideScreen = () => { const v = rect(); return v.w >= 900 && v.w / Math.max(1, v.h) >= 1.7; };
  if (typeof safeArea === 'function') {
    const safe0 = safeArea;
    safeArea = function () {
      let a = safe0.apply(this, arguments); const w = document.getElementById('mapWelcome'), v = rect();
      if (w && !w.hidden && a.x > 36 && v.w >= 760) { const b = w.getBoundingClientRect(); if (b.height && b.height <= 190) a = { x: 35, y: a.y, w: Math.max(230, a.w + (a.x - 35)), h: a.h }; }
      // On a wide, short window the map is limited by height. The breadcrumb and the zoom box sit in the
      // corners, clear of a centred course or subject, so the map may use the rows they are in.
      if (wideScreen() && !S.region && !S.district && !(typeof selected !== 'undefined' && selected) && a.y <= 80) { const top = 58, cut = a.y - top; a = { x: a.x, y: top, w: a.w, h: a.h + cut + 34 }; }
      return a;
    };
  }

  /* A subject opened from the map was capped at 95% zoom, which on a large window left it small in the
     middle of the screen. It may now grow to fill the window. */
  if (typeof fitBox === 'function') {
    const fit0 = fitBox;
    fitBox = function (b, animate, pad, maxZoom) { return fit0.call(this, b, animate, pad, maxZoom === .95 ? 1.7 : maxZoom); };
  }

  if (typeof R18 !== 'undefined' && R18.subjectPad) { const pad0 = R18.subjectPad; R18.subjectPad = function () { return wideScreen() ? 10 : pad0.apply(this, arguments); }; }

  /* ---------- 3b. the three courses sit side by side on a wide window ----------
     The atlas was laid out as a triangle (Contracts above, the other two below), which is about square and
     left half of a wide window empty. On a wide window the courses now stand in a row. Each course is moved
     as a whole (subjects, subtopics, cards, zones), so nothing inside a course changes. A tall or narrow
     window keeps the triangle. Positions are set from fixed targets, so applying this twice changes nothing. */
  const LRS = 'Legislation and the Regulatory State';
  const ARR = {
    tall: { 'Contracts': [-7370, -13364], 'Civil Procedure': [-16440, -360], [LRS]: [1500, -360], 'workbench-region': [-1700, 900], 'dictionary-region': [-1700, 2700] },
    wide: { 'Contracts': [-7370, 700], 'Civil Procedure': [-23310, 700], [LRS]: [8370, 700], 'workbench-region': [12700, 13500], 'dictionary-region': [15500, 13500] },
  };
  let arranged = null;
  function arrange(mode) {
    const M = mapData(), T = ARR[mode]; let moved = false;
    const shift = (regionIds, dx, dy) => {
      const ids = new Set(regionIds);
      for (const r of M.regions) if (ids.has(r.id)) { r.x += dx; r.y += dy; }
      for (const d of Object.values(M.districts)) if (ids.has(d.region)) { d.x += dx; d.y += dy; if (typeof d.supportStart === 'number') d.supportStart += dy; }
      for (const h of Object.values(M.homes)) if (ids.has(h.region)) { h.x += dx; h.y += dy; }
    };
    for (const [course, block] of Object.entries(M.courseBlocks || {})) {
      const t = T[course]; if (!t) continue;
      const dx = t[0] - block.x, dy = t[1] - block.y; if (!dx && !dy) continue;
      shift(M.regions.filter(r => regionCourse(r) === course).map(r => r.id), dx, dy);
      block.x += dx; block.y += dy;
      const design = (M.courseDesign || {})[course] || {};
      for (const zn of design.zones || []) { zn.x += dx; zn.y += dy; }
      for (const lb of design.labels || []) { lb.x += dx; lb.y += dy; }
      moved = true;
    }
    // SCOTUS History stands clear below the courses and their supporting-cases tiles
    if (window.DKLAScotusBox) { const y = mode === 'wide' ? 12300 : 11200; if (window.DKLAScotusBox.y !== y) { window.DKLAScotusBox.y = y; moved = true; } }
    for (const id of ['workbench-region', 'dictionary-region']) {
      const r = M.regions.find(x => x.id === id), t = T[id]; if (!r || !t) continue;
      const dx = t[0] - r.x, dy = t[1] - r.y; if (dx || dy) { shift([id], dx, dy); moved = true; }
    }
    // each course's supporting-cases tile sits close under its bottom-left corner
    if (D && D.tiles) for (const [course, block] of Object.entries(M.courseBlocks || {})) {
      const t = D.tiles[course]; if (!t) continue;
      const zones = ((M.courseDesign || {})[course] || {}).zones || [];
      const bottom = Math.max(block.y + block.h, ...zones.map(zn => zn.y + zn.h)), left = Math.min(block.x, ...zones.map(zn => zn.x));
      t.w = 4300; t.h = 620; t.x = left; t.y = bottom + 120;
    }
    if (typeof R11 !== 'undefined') { R11.galaxyKey = null; R11.galaxy = null; }
    arranged = mode;
    return moved;
  }
  function applyArrangement(refit) {
    if (typeof mapData !== 'function' || !mapData() || !mapData().courseBlocks) return;
    const mode = wideScreen() ? 'wide' : 'tall'; if (mode === arranged) return;
    const moved = arrange(mode);
    if (moved || refit) { try { if (S.scope === 'Atlas' || !S.region) home(S.scope, false, false); else if (window.R18 && R18.refit) R18.refit(); } catch { /* next draw */ } }
    try { schedule(); } catch { /* next frame */ }
  }
  (function whenReady() { if (!window.LegalAtlas?.ready || typeof nodesById === 'undefined') { setTimeout(whenReady, 100); return; } applyArrangement(true); requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('r20-ready'))); })();
  setTimeout(() => document.documentElement.classList.add('r20-ready'), 6000); // the curtain never stays down
  // On a wide window a course is fitted to its subjects and tile; its name sits in the top margin above them
  // (it is centred, the breadcrumb is in the corner), so the name no longer costs the map a sixth of its height.
  if (typeof scopeBox === 'function') {
    const box0 = scopeBox;
    scopeBox = function () {
      const b = box0.apply(this, arguments);
      try {
        if (arranged !== 'wide' || S.scope === 'Atlas') return b;
        const M = mapData(), block = (M.courseBlocks || {})[S.scope]; if (!block) return b;
        const zones = ((M.courseDesign || {})[S.scope] || {}).zones || [], tile = D && D.tiles && D.tiles[S.scope];
        return bounds([block, ...zones, ...(tile ? [tile] : [])]);
      } catch { return b; }
    };
  }
  let arrangeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(arrangeTimer); arrangeTimer = setTimeout(() => applyArrangement(false), 260); });

  /* ---------- 4. no repeated source chips ---------- */
  const panel = document.getElementById('inspector');
  function tidyChips() {
    const row = panel && panel.querySelector('.dkla-file-chips'); if (!row) return;
    const seen = new Map();
    for (const chip of [...row.querySelectorAll('button[data-dkla-file]')]) {
      const file = chip.dataset.dklaFile, m = file.match(/^(.*?)#page=(\d+)$/), base = m ? m[1] : file, page = m ? m[2] : '';
      if (seen.has(file)) { chip.remove(); continue; }
      seen.set(file, chip);
      const twins = [...seen.entries()].filter(([f, c]) => c !== chip && (f.match(/^(.*?)#page=/) || [0, f])[1] === base);
      if (twins.length && page && !chip.dataset.r20Paged) {
        for (const [f, c] of twins.concat([[file, chip]])) {
          const p = (f.match(/#page=(\d+)$/) || [])[1];
          if (p && !c.dataset.r20Paged && !/\bp\. ?\d/.test(c.textContent)) { c.dataset.r20Paged = '1'; c.textContent = c.textContent.replace(/\s*↗\s*$/, '') + ' p. ' + p + ' ↗'; }
        }
      }
    }
  }
  if (panel) new MutationObserver(tidyChips).observe(panel, { childList: true, subtree: true });

  /* ---------- 5. dictionary <-> supporting cases ----------
     Cases on the map are linked inside the dictionary block itself (tools/r19/terms.py). Supporting cases are
     not map entries, so the dictionary lists them here, and each supporting brief lists its terms. */
  const TL = D && D.terms;
  if (TL) {
    const title = new Map(D.entries.map(e => [e[0], e[1]])), course = new Map(D.entries.map(e => [e[0], e[2]]));
    const bySlug = new Map();
    for (const [cid, slugs] of Object.entries(TL.supporting)) for (const s of slugs) { if (!bySlug.has(s)) bySlug.set(s, []); bySlug.get(s).push(cid); }
    for (const list of bySlug.values()) list.sort((a, b) => String(title.get(a)).localeCompare(String(title.get(b))));
    const nodeOf = new Map(Object.entries(D.map || {}).map(([nid, cid]) => [cid, nid]));
    document.addEventListener('click', e => { const b = e.target.closest('[data-r20-node]'); if (!b) return; const dlg = document.getElementById('glossaryDialog'); try { dlg && dlg.close && dlg.close(); } catch { /* not a dialog */ } try { goNode(b.dataset.r20Node, true); } catch { /* entry gone */ } });
    let names = null;
    const termName = slug => { if (!names) { names = new Map(); try { for (const t of JSON.parse(document.getElementById('dklaGlossary').textContent).terms) names.set(t.slug, t.term); } catch { /* slugs are shown */ } } return names.get(slug) || slug.replace(/_/g, ' '); };
    const COURSES = ['Contracts', 'Civil Procedure', 'Legislation'];
    const gloss = () => document.getElementById('glossaryDialog');
    function paintGlossary() {
      const dlg = gloss(), det = dlg && dlg.querySelector('.gl-detail'); if (!det) return;
      const h2 = det.querySelector('h2'), old = det.querySelector('.r20-sup');
      termName(''); let slug = null;
      if (h2) { const shown = (h2.firstChild && h2.firstChild.nodeType === 3 ? h2.firstChild.textContent : h2.textContent).trim(); for (const [k, v] of names) if (v === shown) { slug = k; break; } }
      if (!slug) { old && old.remove(); return; }
      if (old && old.dataset.slug === slug) return;
      old && old.remove();
      // every brief that uses the term, map cases and supporting cases together, most use first
      const full = TL.index && TL.index[slug], ids = full ? full[1] : (bySlug.get(slug) || []), total = full ? full[0] : ids.length;
      const box = document.createElement('div'); box.className = 'gl-group r20-sup'; box.dataset.slug = slug;
      if (!ids.length) { box.innerHTML = '<h3>Cases that use this term <span class="gl-count">0</span></h3><p class="gl-empty">No brief in the atlas uses this term.</p>'; det.appendChild(box); return; }
      const many = ids.length > 24;
      const btn = (id, i) => { const nid = nodeOf.get(id), hide = many && i >= 24 ? ' hidden' : ''; return nid && typeof nodesById !== 'undefined' && nodesById.has(nid) ? `<button type="button" class="r20-on-map" data-r20-node="${esc(nid)}"${hide}>${esc(title.get(id))}<small> ${esc(COURSES[course.get(id)] || '')} · on the map</small></button>` : `<button type="button" data-r19-open="${esc(id)}"${hide}>${esc(title.get(id))}<small> ${esc(COURSES[course.get(id)] || '')}</small></button>`; };
      box.innerHTML = `<h3>Cases that use this term <span class="gl-count">${total}</span></h3>${total > ids.length ? `<p class="gl-empty">${total} briefs use it. These are the ${ids.length} that use it most.</p>` : ''}<div class="gl-used">${ids.map(btn).join('')}</div>${many ? `<button class="gl-showall" type="button" data-r20-all>Show all ${ids.length}</button>` : ''}`;
      det.appendChild(box);
    }
    const hook = () => { const dlg = gloss(); if (!dlg || dlg.dataset.r20) return !!dlg; dlg.dataset.r20 = '1'; new MutationObserver(paintGlossary).observe(dlg, { childList: true, subtree: true }); paintGlossary(); return true; };
    if (!hook()) { const t = setInterval(() => { if (hook()) clearInterval(t); }, 400); }
    document.addEventListener('click', e => { const b = e.target.closest('[data-r20-all]'); if (!b) return; for (const x of b.parentNode.querySelectorAll('.gl-used [hidden]')) x.hidden = false; b.remove(); });
    // the supporting brief lists its terms
    const sup = document.getElementById('r19Dialog');
    function paintBrief() {
      if (!sup) return;
      const fill = sup.querySelector('[data-r19-fill]'), cid = fill && fill.dataset.r19Fill, old = sup.querySelector('.r20-terms');
      const slugs = cid && TL.supporting[cid];
      if (!slugs || !slugs.length) { old && old.remove(); return; }
      if (old && old.dataset.cid === cid) return;
      old && old.remove();
      const line = sup.querySelector('.r19-line'); if (!line) return;
      const box = document.createElement('div'); box.className = 'r20-terms dkla-term-chips'; box.dataset.cid = cid;
      box.innerHTML = `<span>Terms in this brief</span>` + slugs.map(s => `<button type="button" data-dkla-term="${esc(s)}">${esc(termName(s))}</button>`).join('');
      line.after(box);
    }
    if (sup) new MutationObserver(paintBrief).observe(sup, { childList: true, subtree: true });
  }
  try { schedule(); } catch { /* next frame */ }
})();

/* ===== r20.3: a first-visit note, the guided walkthrough in the More menu, and room in the centre mark ===== */
(function () {
  'use strict';
  const KEY = 'dkla.guide.v1', PAGE = 'how-to-use.html';
  const seen = () => { try { return localStorage.getItem(KEY) === 'seen'; } catch { return true; } };
  const markSeen = () => { try { localStorage.setItem(KEY, 'seen'); } catch { /* storage unavailable */ } };

  /* The note sits over the map on the three-course view the first time the atlas opens. It goes once either
     button is pressed (or Esc), and is not shown when the atlas was opened at a term, file or page route. */
  function showNote() {
    if (seen() || location.hash || document.getElementById('r20Guide')) return;
    const host = document.getElementById('studyMain') || document.body;
    const box = document.createElement('section');
    box.id = 'r20Guide'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-labelledby', 'r20GuideH');
    box.innerHTML = '<h2 id="r20GuideH">New here? There is a short guide.</h2>' +
      '<div class="r20-guide-actions"><a class="r20-guide-go" href="' + PAGE + '">Open the guide</a><button type="button" data-r20-guide-close>Not now</button></div>';
    host.appendChild(box);
    const close = () => { markSeen(); box.remove(); document.removeEventListener('keydown', onKey, true); };
    const onKey = e => { if (e.key === 'Escape') { close(); } };
    box.querySelector('[data-r20-guide-close]').addEventListener('click', close);
    box.querySelector('.r20-guide-go').addEventListener('click', markSeen);
    document.addEventListener('keydown', onKey, true);
  }
  setTimeout(showNote, 900);

  /* More menu: the walkthrough sits beside the existing "How to use this map" dialog. */
  if (typeof moreMenu === 'function') {
    const prior = moreMenu;
    moreMenu = function (...a) {
      const out = prior.apply(this, a), menu = document.getElementById('moreMenu');
      if (menu && !menu.hidden && !menu.querySelector('[data-r20-guide]')) {
        const help = [...menu.querySelectorAll('button')].find(b => b.dataset.action === 'help');
        const b = document.createElement('button'); b.setAttribute('role', 'menuitem'); b.dataset.r20Guide = '1'; b.textContent = 'Guided walkthrough';
        (help || menu.lastElementChild).after(b);
      }
      return out;
    };
    const more = document.getElementById('moreBtn'); if (more) more.onclick = () => moreMenu();
    document.addEventListener('click', e => { if (e.target.closest('[data-r20-guide]')) { markSeen(); location.href = PAGE; } }, true);
  }

  /* The mark: the A is turned on its side. Its crossbar is the vertical line joining the two points where the
     K's arms meet the D, and its legs run from those points to an apex on the inside of the bowl, so K, bar
     and A read as one figure inside the D. The same letterforms go into the header mark; the map mark is
     drawn larger on the three-course view. r17 redraws the map mark on every draw, so this runs after each. */
  const K = 'M22 52 57 17M22 52 57 86', L = 'M22 85H54', A = 'M57 17V86M57 17 83 51.5 57 86';
  function fixHeader() {
    const h = document.querySelector('#atlasHome .dkla-header-monogram'); if (!h) return false;
    const k = h.querySelector('.dkla-letter-k'), l = h.querySelector('.dkla-letter-l'), a = h.querySelector('.dkla-letter-a');
    if (k) k.setAttribute('d', K); if (l) l.setAttribute('d', L); if (a) a.setAttribute('d', A);
    return true;
  }
  (function headerSoon(n) { if (!fixHeader() && n < 100) setTimeout(() => headerSoon(n + 1), 100); })(0);
  /* Nothing from the first half-second of boot is shown: the Contracts welcome block (the atlas's HTML starts
     with it visible, in Contracts scope, and the floor fit hides it only once the camera lands), r16's wordmark
     and r17's mark before this painter has reshaped it. r20.css keeps them invisible until `r20-settled` is on
     the body and the mark carries `data-r20`. */
  const settle = () => document.body.classList.add('r20-settled');
  setTimeout(settle, 3000);
  function fixMark() {
    const mark = document.querySelector('#geoCanvas .dkla-map-monogram');
    if (!mark) return;
    mark.setAttribute('x', '-3100'); mark.setAttribute('y', '-5300'); mark.setAttribute('width', '6200'); mark.setAttribute('height', '4300');
    const k = mark.querySelector('.dkla-letter-k'), l = mark.querySelector('.dkla-letter-l'), a = mark.querySelector('.dkla-letter-a');
    if (k) k.setAttribute('d', K); if (l) l.setAttribute('d', L); if (a) a.setAttribute('d', A);
    mark.dataset.r20 = '1';
  }
  if (window.R18 && Array.isArray(R18.afterDraw)) R18.afterDraw.push(() => {
    if (typeof S === 'object' && S && S.scope !== 'Contracts') settle();
    fixMark();
  });
  // r17's wrapper installs on its own timer and can end up outside r18's, redrawing the old letterforms after
  // this painter; the observer's callback runs after both, before the frame is painted.
  const canvas = document.getElementById('geoCanvas');
  if (canvas) new MutationObserver(fixMark).observe(canvas, { childList: true, subtree: true });
})();
