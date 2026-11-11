/* Pure DOM audit, shared by browser verification and the permanent browser test.
   It inspects rendered geometry, rather than trusting source layout constants. */
export default function auditNativeHome({
  expectedRegions = [],
  baselineFonts = {},
  tolerance = 1.5,
  allowZoomLabels = false,
  equalLowerHeights = false,
  heliocentric = false,
} = {}) {
  const canvas = document.getElementById('geoCanvas'),
    issues = [],
    labels = [],
    components = [];
  const box = (e) => {
    const b = e.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height, right: b.right, bottom: b.bottom };
  };
  const visible = (e) => {
    if (e.closest('defs,clipPath,mask')) return false;
    for (let p = e; p && p !== canvas.parentElement; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.02) return false;
    }
    const b = box(e);
    return b.w > 0 && b.h > 0;
  };
  const inside = (a, b) =>
    a.x >= b.x - tolerance &&
    a.y >= b.y - tolerance &&
    a.right <= b.right + tolerance &&
    a.bottom <= b.bottom + tolerance;
  const intersects = (a, b) =>
    Math.min(a.right, b.right) - Math.max(a.x, b.x) > tolerance &&
    Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > tolerance;
  if (!canvas) return { ok: false, issues: [{ type: 'missing-map' }] };
  if (document.querySelector('#r20Guide,dialog[open],#r18Update'))
    issues.push({ type: 'home-obscured-by-dialog' });
  const cb = box(canvas),
    frame = {
      x: Math.max(0, cb.x),
      y: Math.max(0, cb.y),
      right: Math.min(innerWidth, cb.right),
      bottom: Math.min(innerHeight, cb.bottom),
    };
  const view = canvas.dataset.dklaHomeView ? JSON.parse(canvas.dataset.dklaHomeView) : null;
  const breadcrumb = document.querySelector('#geoBreadcrumb')?.textContent?.trim();
  if (view ? view.scope !== 'Atlas' || view.region || view.district || view.selected : breadcrumb !== 'Atlas')
    issues.push({ type: 'not-home', breadcrumb });
  const paths = new Map(
    [...canvas.querySelectorAll('g.map-region path[data-map-region]')].map((e) => [
      e.getAttribute('data-map-region'),
      e,
    ]),
  );
  const textNodes = [...canvas.querySelectorAll('text')].filter(visible);
  for (const e of textNodes) {
    const b = box(e),
      ctm = typeof e.getScreenCTM === 'function' ? e.getScreenCTM() : null,
      scale = ctm ? Math.hypot(ctm.a, ctm.b) : cb.w / Number(canvas.getAttribute('viewBox').split(/\s+/)[2]),
      font = Number(getComputedStyle(e).fontSize.replace(/px$/, '')) * scale,
      region = e.getAttribute('data-map-region'),
      tile = e.classList.contains('region-title');
    const heading = e.closest('.authority-title-control'),
      cover = e.closest('.authority-volume-cover'),
      lineGroup = heading?.getAttribute('data-map-region') || heading?.getAttribute('aria-label') || null;
    const item = {
      text: e.textContent,
      region,
      tile,
      font: Number(font.toFixed(3)),
      box: b,
      class: e.getAttribute('class') || '',
      lineGroup,
      authority: cover?.getAttribute('data-authority-collection') || null,
    };
    labels.push(item);
    if (!inside(b, frame)) issues.push({ type: 'clipped-text', text: item.text, region, box: b });
    if (tile && paths.has(region) && !inside(b, box(paths.get(region))))
      issues.push({ type: 'tile-text-overflow', region, text: item.text, box: b });
    if (cover && !inside(b, box(cover.querySelector('.authority-cover-bg'))))
      issues.push({ type: 'authority-text-overflow', text: item.text, authority: item.authority });
    if (tile && baselineFonts[region] && font < baselineFonts[region] - 0.15)
      issues.push({ type: 'smaller-tile-text', region, font, baseline: baselineFonts[region] });
  }
  if (!allowZoomLabels)
    for (const id of expectedRegions)
      if (!labels.some((l) => l.tile && l.region === id)) issues.push({ type: 'unnamed-tile', region: id });
  // Native wrapped authority headings use sibling <text> elements, whereas
  // native course labels use <tspan>. Treat both as one semantic label: font
  // line boxes contain leading that is not painted ink. Still reject tight
  // row spacing, overflow, or collisions with any other label.
  for (let i = 0; i < labels.length; i++)
    for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i],
        b = labels[j],
        sameHeading = a.lineGroup && a.lineGroup === b.lineGroup;
      if (sameHeading) {
        if (Math.abs(a.box.y - b.box.y) < Math.max(a.font, b.font) * 1.1)
          issues.push({ type: 'crowded-heading-lines', a: a.text, b: b.text });
      } else if (intersects(a.box, b.box)) issues.push({ type: 'overlapping-text', a: a.text, b: b.text });
    }
  for (const [id, path] of paths) {
    const b = box(path);
    if (!visible(path)) continue;
    components.push({ id, box: b });
    if (!inside(b, frame)) issues.push({ type: 'clipped-tile', id, box: b });
  }
  for (const e of canvas.querySelectorAll('.r19-tile > rect')) {
    const b = box(e);
    components.push({ id: 'support-' + e.parentElement.getAttribute('data-r19-list'), box: b });
    if (!inside(b, frame)) issues.push({ type: 'clipped-supporting-tile', box: b });
  }
  for (const selector of ['.dkla-map-monogram', '.sh-block-bg', '.authority-map-entrance > rect']) {
    const e = canvas.querySelector(selector);
    if (!e || !visible(e)) {
      issues.push({ type: 'missing-section', selector });
      continue;
    }
    const b = box(e);
    components.push({ id: selector, box: b });
    if (!inside(b, frame)) issues.push({ type: 'clipped-section', selector, box: b });
  }
  const chrome = [...document.querySelectorAll('.map-nav,#mapWelcome,#mapHint,#saveStatus,.zoom-controls')]
    .filter((e) => !e.hidden && e.getClientRects().length)
    .map(box);
  for (const label of labels)
    if (chrome.some((b) => intersects(label.box, b)))
      issues.push({ type: 'text-under-controls', text: label.text, region: label.region });
  const covers = [...canvas.querySelectorAll('.authority-volume-cover')];
  if (equalLowerHeights) {
    const history = components.find((c) => c.id === '.sh-block-bg'),
      authority = components.find((c) => c.id === '.authority-map-entrance > rect');
    if (
      history &&
      authority &&
      (Math.abs(history.box.h - authority.box.h) > tolerance ||
        Math.abs(history.box.y - authority.box.y) > tolerance)
    )
      issues.push({ type: 'unequal-lower-blocks', history: history.box, authority: authority.box });
  }
  if (heliocentric) {
    // v3.0 "heliocentric" Home: the three courses on top, the DKLA mark alone
    // in the middle, Rules & authorities and SCOTUS History below it.
    const mark = components.find((c) => c.id === '.dkla-map-monogram')?.box,
      lower = components.filter((c) => ['.sh-block-bg', '.authority-map-entrance > rect'].includes(c.id));
    // The dictionary is a spine inside the authorities frame, so it belongs to the lower band.
    const upper = components.filter((c) => !c.id.startsWith('.') && c.id !== 'dictionary-region');
    if (mark && upper.length && lower.length) {
      for (const c of upper)
        if (c.box.bottom > mark.y + tolerance) issues.push({ type: 'course-tile-not-above-mark', id: c.id });
      for (const c of lower)
        if (c.box.y < mark.bottom - tolerance) issues.push({ type: 'lower-block-not-below-mark', id: c.id });
      const left = Math.min(...upper.map((c) => c.box.x)),
        right = Math.max(...upper.map((c) => c.box.right)),
        offset = mark.x + mark.w / 2 - (left + right) / 2;
      if (Math.abs(offset) > (right - left) * 0.03) issues.push({ type: 'mark-off-centre', offset });
      // Room is kept at the mark's upper-right corner for text attached there.
      const corner = {
        x: mark.right - mark.w * 0.25,
        y: mark.y - mark.h * 0.4,
        right: mark.right + mark.w * 0.75,
        bottom: mark.y + mark.h * 0.25,
      };
      for (const c of components)
        if (c.id !== '.dkla-map-monogram' && intersects(c.box, corner))
          issues.push({ type: 'mark-corner-crowded', id: c.id });
      for (const l of labels)
        if (intersects(l.box, corner)) issues.push({ type: 'mark-corner-crowded', text: l.text });
    } else issues.push({ type: 'heliocentric-sections-missing' });
    // Home names Civil Procedure "Civ Pro"; the three names stand on one line.
    const names = labels.filter((l) => l.class.split(/\s+/).includes('course-label'));
    for (const l of names)
      if (/Civil Procedure/.test(l.text)) issues.push({ type: 'long-course-name', text: l.text });
    // Dottie hangs from the Ask Dottie button over the top of the map; she
    // must not hang over a course name.
    const dottie = document.querySelector('.study-header .ask-bar-dottie');
    if (dottie && dottie.getClientRects().length && getComputedStyle(dottie).display !== 'none')
      for (const l of names)
        if (intersects(l.box, box(dottie))) issues.push({ type: 'course-name-under-dottie', text: l.text });
    // With the courses on top, no subject tile may sit under the Atlas breadcrumb.
    const nav = document.querySelector('.map-nav');
    if (nav && nav.getClientRects().length)
      for (const c of upper)
        if (intersects(c.box, box(nav))) issues.push({ type: 'tile-under-breadcrumb', id: c.id });
    if (!allowZoomLabels) {
      const want = ['Civ Pro', 'Contracts', 'LRS'],
        have = names.map((l) => l.text.trim()).sort();
      if (JSON.stringify(have) !== JSON.stringify(want)) issues.push({ type: 'course-names', have });
      else if (Math.max(...names.map((l) => l.box.bottom)) - Math.min(...names.map((l) => l.box.bottom)) > 2)
        issues.push({ type: 'course-names-not-aligned' });
    }
  }
  const featureBoxes = components.filter((c) => c.id.startsWith('.'));
  for (let i = 0; i < featureBoxes.length; i++)
    for (let j = i + 1; j < featureBoxes.length; j++)
      if (intersects(featureBoxes[i].box, featureBoxes[j].box))
        issues.push({ type: 'overlapping-sections', a: featureBoxes[i].id, b: featureBoxes[j].id });
  for (const tile of components.filter((c) => !c.id.startsWith('.')))
    for (const feature of featureBoxes)
      if (intersects(tile.box, feature.box)) {
        // The dictionary is now a book spine owned by the authorities frame. Its
        // entire hit target must fit that frame; other overlaps remain failures.
        if (
          tile.id === 'dictionary-region' &&
          feature.id === '.authority-map-entrance > rect' &&
          canvas.querySelector('.dictionary-spine') &&
          inside(tile.box, feature.box)
        )
          continue;
        issues.push({ type: 'tile-under-section', tile: tile.id, section: feature.id });
      }
  const tiles = components.filter((c) => !c.id.startsWith('.'));
  for (let i = 0; i < tiles.length; i++)
    for (let j = i + 1; j < tiles.length; j++)
      if (intersects(tiles[i].box, tiles[j].box))
        issues.push({ type: 'overlapping-tiles', a: tiles[i].id, b: tiles[j].id });
  if (covers.length !== 6) issues.push({ type: 'missing-authority-covers', count: covers.length });
  if (!allowZoomLabels)
    for (const cover of covers) {
      const id = cover.getAttribute('data-authority-collection');
      if (!labels.some((l) => l.authority === id)) issues.push({ type: 'unnamed-authority-cover', id });
    }
  if (!allowZoomLabels && !canvas.querySelector('.authority-people-mark,.authority-people-fallback'))
    issues.push({ type: 'missing-we-the-people' });
  const seats = [...canvas.querySelectorAll('[data-sh-seat]')];
  // Home shows the nine seats that still exist; History keeps all eleven lineages.
  if (seats.length !== 9) issues.push({ type: 'missing-court-seat-tiles', count: seats.length });
  for (const seat of seats) {
    const names = [...seat.querySelectorAll('text')].filter(visible);
    if (!allowZoomLabels && !names.length)
      issues.push({ type: 'unnamed-court-seat', id: seat.getAttribute('data-sh-seat') });
    for (const name of names)
      if (!inside(box(name), box(seat.querySelector('rect'))))
        issues.push({ type: 'court-seat-text-overflow', text: name.textContent });
  }
  return {
    ok: issues.length === 0,
    viewport: { w: innerWidth, h: innerHeight },
    frame,
    view,
    issues,
    labels,
    components,
  };
}
