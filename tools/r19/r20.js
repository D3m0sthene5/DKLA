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
    for (const t of svg.querySelectorAll('text.map-label, .node-card text, .map-region text')) {
      const fs = parseFloat(t.getAttribute('font-size')); if (!fs) continue;
      const px = fs * z; if (px >= 8.6) continue;
      const o = Math.max(0, (px - 7) / 1.6), had = t.style.opacity === '' ? 1 : parseFloat(t.style.opacity);
      t.style.opacity = String(Math.min(had, o));
    }
  }
  // run after every other layer has painted (the r18 hook runs last; the tiles are painted in it)
  const tidy = () => { try { fadeOthers(); hideTinyText(); } catch (e) { console.error('DKLA r20 map', e); } };
  if (window.R18 && Array.isArray(R18.afterDraw)) R18.afterDraw.push(tidy);
  else if (typeof draw === 'function') { const draw0 = draw; draw = function () { const v = draw0.apply(this, arguments); tidy(); return v; }; }

  /* ---------- 3. a course sits in the middle of the screen ----------
     The two small buttons at the top left reserved a whole column, pushing each course to the right. */
  if (typeof safeArea === 'function') {
    const safe0 = safeArea;
    safeArea = function () {
      const a = safe0.apply(this, arguments), w = document.getElementById('mapWelcome');
      if (!w || w.hidden || a.x <= 36) return a;
      const v = rect(), b = w.getBoundingClientRect();
      if (v.w < 760 || !b.height || b.height > 190) return a;
      const left = 35;
      return { x: left, y: a.y, w: Math.max(230, a.w + (a.x - left)), h: a.h };
    };
  }

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
      const ids = bySlug.get(slug) || []; if (!ids.length) return;
      const box = document.createElement('div'); box.className = 'gl-group r20-sup'; box.dataset.slug = slug;
      const many = ids.length > 30;
      box.innerHTML = `<h3>Supporting cases that use this term <span class="gl-count">${ids.length}</span></h3><div class="gl-used">${ids.map((id, i) => `<button type="button" data-r19-open="${esc(id)}"${many && i >= 30 ? ' hidden' : ''}>${esc(title.get(id))}<small> ${esc(COURSES[course.get(id)] || '')}</small></button>`).join('')}</div>${many ? `<button class="gl-showall" type="button" data-r20-all>Show all ${ids.length}</button>` : ''}`;
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
