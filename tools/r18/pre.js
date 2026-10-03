/* DKLA r18: helpers the patched map renderer (studyCode) calls while drawing. Loaded just before studyCode. */
var R18 = {
  version: 'r18',
  build: '__DKLA_BUILD__',
  // Course names are sized in map units, so the names, the course clusters and the centre mark keep the
  // same proportions on every screen. The pixel clamps only guard legibility on very small screens and
  // stop the name growing past a heading size once a course fills a large display.
  TITLE_UNITS: 900,
  courseTitlePx(z) { return Math.min(36, Math.max(11, R18.TITLE_UNITS * z)); },
  courseTitleRows(course) {
    return course === 'Legislation and the Regulatory State' ? ['Legislation and the', 'Regulatory State'] : [course];
  },
  // Main entries of a subtopic in reading order (lead, concepts, provisions, principal cases, then the rest).
  districtRows(id, d) {
    const homes = mapData().homes;
    return geoMembers(id)
      .filter(n => homes[n.id] && !homes[n.id].support)
      .sort((a, b) => geoRoleOrder(a, d) - geoRoleOrder(b, d) || (homes[a.id].y - homes[b.id].y) || (homes[a.id].x - homes[b.id].x));
  },
  // A subtopic's framing question is shown only when it says something and the tile has room for entries too.
  // roomPx is the height left under the tile's title; the question needs room for itself and three entries.
  showQuestion(d, z, roomPx) {
    const q = String(d.question || '').trim();
    if (!q || /^Explore the (assigned|questions)/i.test(q) || q.toLowerCase() === String(d.title || '').toLowerCase()) return false;
    return roomPx >= 100;
  },
  // Margin around a subject when it is fitted: a phone cannot spare 25 px a side.
  subjectPad() { return rect().w < 520 ? 4 : 25; },
  afterDraw: [],
};
