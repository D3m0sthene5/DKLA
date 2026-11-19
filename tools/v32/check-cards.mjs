/* What the map draws, in a real browser (v3.2 "Instrument", docs/DESIGN.md).

     node tools/v32/check-cards.mjs http://127.0.0.1:8766/DKLA-v3.1.html

   An open subject is one panel: its title, its groups on a grid, each group a heading and rows of one
   height. The layout is made by one pass (src/features/v25/geography.js) and painted by draw()
   (src/runtime/studyCode.js). This check holds that to what a reader sees at 1440 x 900:

   - a subject: one panel with one hairline; nothing inside it has a border of its own (no box in a box);
     rows are one height, start on the four columns of the grid, lie inside the panel and are exactly the
     entries' fixed places (so a press, a connection line and the camera agree with the picture); labels
     stay inside their rows; glyphs are one size; the header says what is inside ("5 cases · 4 rules");
     a group's notes and questions are one row with their number, and pressing it opens them;
   - the open subject is framed whole in the window, and every subject's contents fit the place it has
     on the map;
   - the entry that is open is marked on its row, in the "you are here" colour, and nothing else is;
   - at every level (Home, the three course views, a subject, a tall subject, the strip beside the
     reader, close in) no text is drawn under 9 px;
   - a course view names every subject of the course and says what is in it, and the controls under the
     location bar do not cover a tile;
   - Home's tiles keep the map's fixed outlines as their press targets, with one hairline each;
   - the three territories keep their colour (rule 15): every subject's tile is filled in its course's own
     fill, the three fills are told apart, and a tile's name is 7:1 or better on it; under each course the
     ground is stippled in the course's colour, with no gradient; each course's first subject carries its
     number;
   - the principal paths read at rest: each course's tree in the course's colour, at a weight and strength
     that can be followed, "leads to" with an arrowhead; no tree line passes behind a third subject, and
     the trees cross at most twice on Home; the curves of association appear only for the tile under the
     pointer, with the other lines stepped back;
   - beside the reader a tile that steps back stays solid, so no line shows through its name. */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  serviceWorkers: 'block',
  reducedMotion: 'reduce',
});
await context.route('**/*', (route) => {
  const url = new URL(route.request().url());
  return url.origin !== address.origin || url.pathname.startsWith('/api/')
    ? route.fulfill({ status: 204, body: '' })
    : route.continue();
});
await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
const page = await context.newPage();
page.setDefaultTimeout(30_000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (m) => m.type() === 'error' && /^DKLA /.test(m.text()) && errors.push(m.text()));
await page.goto(address.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
await page.waitForFunction(() => window.LegalAtlas?.ready && window.DKLAMapMotion && window.DKLAGeography);
await page.evaluate(() => document.fonts.ready);

// The camera has stopped and the map has stopped redrawing (fades made at rest have finished).
const rest = async () => {
  let last = -1;
  for (let quiet = 0, turns = 0; quiet < 4 && turns < 100; turns++) {
    await sleep(120);
    const now = await page.evaluate(() => {
      const st = window.DKLAMapMotion.state(),
        svg = document.getElementById('geoCanvas');
      return !st.moving && !st.flying && !st.gliding && !st.shifted && !st.dirty && !svg.style.transform
        ? st.draws
        : -2;
    });
    quiet = now === last && now !== -2 ? quiet + 1 : 0;
    last = now;
  }
};
const go = async (fn, arg) => {
  await page.evaluate(fn, arg);
  await rest();
};
// Every piece of text the map shows, with its size on screen.
const smallText = (limit) =>
  page.evaluate((limit) => {
    const canvas = document.getElementById('geoCanvas'),
      frame = canvas.getBoundingClientRect(),
      out = [];
    for (const e of canvas.querySelectorAll('text')) {
      if (e.closest('defs,clipPath,mask,.dkla-splash,[data-dkla-splash]') || !e.textContent.trim()) continue;
      let o = 1;
      for (let n = e; n && n !== canvas.parentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden') o = 0;
        o *= Number(cs.opacity);
      }
      const b = e.getBoundingClientRect();
      if (o < 0.25 || b.width < 2 || b.bottom < frame.top || b.top > frame.bottom) continue;
      if (b.right < frame.left || b.left > frame.right) continue;
      const m = e.getScreenCTM(),
        size = parseFloat(getComputedStyle(e).fontSize) * Math.hypot(m.a, m.b);
      if (size < limit) out.push(`${size.toFixed(1)} px "${e.textContent.trim().slice(0, 40)}"`);
    }
    return out;
  }, limit);
const report = [];
const legible = async (where) => {
  const small = await smallText(9);
  assert.deepEqual(small.slice(0, 6), [], `${where}: no text under 9 px (${small.length} found)`);
};

/* ---- 1. open subjects ---- */
const subjects = [
  'consideration',
  'terms-region',
  'cp-pleading-region',
  'cp-subject-region',
  'lrs-region-administrative-rulemaking',
  'lrs-region-judicial-review',
  'cp-personal-region', // the tallest
];
let rowUnits = null;
for (const id of subjects) {
  await go((id) => goRegion(id, false), id);
  const card = await page.evaluate((id) => {
    const canvas = document.getElementById('geoCanvas'),
      el = canvas.querySelector(`.v32-card[data-card="${id}"]`);
    if (!el) return null;
    const r = regionFor(id),
      z = S.z,
      box = (e) => {
        const b = e.getBoundingClientRect();
        return { x: b.left, y: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height };
      },
      panel = box(el.querySelector('.v32-card-bg')),
      frame = box(canvas),
      mine = (h) => h && h.region === id,
      groups = [...canvas.querySelectorAll('.v32-group')].filter((g) =>
        r.districtIds.includes(g.querySelector('[data-map-district]').dataset.mapDistrict),
      ),
      rows = [...canvas.querySelectorAll('.v32-row[data-map-node]')].filter((g) =>
        mine(homeFor(g.dataset.mapNode)),
      ),
      notes = [...canvas.querySelectorAll('.v32-row.v32-notes')].filter((g) =>
        r.districtIds.includes(g.dataset.mapDistrict),
      ),
      drawn = (e) => {
        const cs = getComputedStyle(e);
        return cs.stroke !== 'none' && parseFloat(cs.strokeOpacity) > 0 && parseFloat(cs.strokeWidth) > 0;
      };
    // shapes inside the panel that carry an outline: the panel itself may; a glyph is a drawing, not a box
    const boxed = [];
    for (const g of [...groups, ...rows, ...notes])
      for (const e of g.querySelectorAll('rect, path, circle'))
        if (!e.closest('.v32-glyph') && drawn(e)) boxed.push(e.getAttribute('class') || e.tagName);
    const off = [],
      cut = [],
      wrong = [];
    for (const g of rows) {
      const bg = g.querySelector('.v32-row-bg'),
        b = box(bg),
        h = homeFor(g.dataset.mapNode);
      if (b.x < panel.x - 0.5 || b.r > panel.r + 0.5 || b.y < panel.y - 0.5 || b.b > panel.b + 0.5)
        off.push(g.dataset.mapNode);
      for (const t of g.querySelectorAll('text')) {
        const tb = box(t);
        if (tb.x < b.x - 1 || tb.r > b.r + 1 || tb.y < b.y - 2 || tb.b > b.b + 2)
          cut.push(t.textContent.trim().slice(0, 30));
      }
      if (
        Math.abs(Number(bg.getAttribute('x')) - h.x) > 0.01 ||
        Math.abs(Number(bg.getAttribute('y')) - 1 / z - h.y) > 0.01 ||
        Math.abs(Number(bg.getAttribute('width')) - h.w) > 0.01
      )
        wrong.push(g.dataset.mapNode);
    }
    const round = (n) => Math.round(n * 10) / 10;
    return {
      z,
      panels: el.querySelectorAll('.v32-card-bg').length,
      panelOutline: drawn(el.querySelector('.v32-card-bg')),
      panel,
      frame,
      top: document.querySelector('.study-header')?.getBoundingClientRect().bottom || 0,
      groups: groups.length,
      expectedGroups: r.districtIds.length,
      rows: rows.length,
      expectedRows: Object.values(mapData().homes).filter((h) => h.region === id && !h.support).length,
      heights: [...new Set([...rows, ...notes].map((g) => round(box(g.querySelector('.v32-row-bg')).h)))],
      units: [
        ...new Set(
          [...rows, ...notes].map((g) =>
            round(Number(g.querySelector('.v32-row-bg').getAttribute('height')) + 2 / z),
          ),
        ),
      ],
      columns: [
        ...new Set([...rows, ...notes].map((g) => round(box(g.querySelector('.v32-row-bg')).x - panel.x))),
      ].sort((a, b) => a - b),
      glyphs: [
        ...new Set(
          [...rows, ...notes].map((g) => {
            const e = g.querySelector('.v32-glyph');
            return e
              ? round(
                  e.getBoundingClientRect().width > 0
                    ? Number(/scale\(([\d.]+)\)/.exec(e.getAttribute('transform'))[1]) *
                        (e.classList.contains('v32-pict') ? 24 : 16) *
                        z
                    : 0,
                )
              : -1;
          }),
        ),
      ],
      kinds: [...new Set(rows.map((g) => g.dataset.kind))],
      boxed,
      off,
      cut,
      wrong,
      readout: [...el.querySelectorAll('text.v32-count')].map((t) => t.textContent).join(' | '),
      // counts: their size on screen and their colour
      counts: [
        ...el.querySelectorAll('text.v32-count'),
        ...notes.map((g) => g.querySelector('.v32-num')),
      ].map((t) => {
        const m = t.getScreenCTM(),
          cs = getComputedStyle(t.tagName === 'tspan' ? t.parentNode : t);
        return { px: Math.round(parseFloat(cs.fontSize) * Math.hypot(m.a, m.b) * 10) / 10, fill: cs.fill };
      }),
      muted: getComputedStyle(document.documentElement).getPropertyValue('--v31-muted').trim(),
      // gaps: between one group and the next below it, and inside a group (its heading band to its first row)
      gaps: (() => {
        const rects = groups.map((g) => {
          const d = districtFor(g.querySelector('[data-map-district]').dataset.mapDistrict);
          return { x: d.x, y: d.y, b: d.y + d.h, inside: window.DKLAGeography.card.headGap || 0 };
        });
        let between = Infinity;
        for (const a of rects)
          for (const b of rects)
            if (a !== b && a.x === b.x && b.y >= a.b) between = Math.min(between, b.y - a.b);
        return {
          between: between * z,
          inside: (rects[0]?.inside || 0) * z,
          columns: window.DKLAGeography.card.colGap / window.DKLAGeography.card.cellGap,
        };
      })(),
      // composition: a caption never ends a line on "v.", and no word is left alone on a second line
      dangling: rows
        .map((g) => [...g.querySelectorAll('text.v32-label tspan')].map((t) => t.textContent.trim()))
        .filter((lines) => lines.length > 1 && /(^|\s)v\.?$/.test(lines[0]))
        .map((lines) => lines.join(' / ')),
      stranded: rows
        .map((g) => [...g.querySelectorAll('text.v32-label tspan')])
        .filter(
          (lines) =>
            lines.length > 1 &&
            !/\s/.test(lines[1].textContent.trim()) &&
            lines[1].getComputedTextLength() < lines[0].getComputedTextLength() * 0.34,
        )
        .map((lines) => lines.map((t) => t.textContent).join(' / ')),
      title: el.querySelector('text.v32-title')?.textContent || '',
      titleFace: getComputedStyle(el.querySelector('text.v32-title'))
        .fontFamily.split(',')[0]
        .replace(/"/g, ''),
      headFaces: [
        ...new Set(
          groups.map((g) => {
            const cs = getComputedStyle(g.querySelector('text.v32-head'));
            return cs.fontFamily.split(',')[0].replace(/"/g, '') + ' ' + cs.fontWeight;
          }),
        ),
      ],
      notes: notes.map((g) => ({
        count: g.querySelector('.v32-num')?.textContent,
        label: g.querySelector('text.v32-label').textContent,
        want: String(
          Object.values(mapData().homes).filter((h) => h.district === g.dataset.mapDistrict && h.support)
            .length,
        ),
      })),
      fits: r.panelH <= r.h + 0.01,
      legacy: canvas.querySelectorAll('.node-card, .r20-mini, .district-hit').length,
    };
  }, id);
  assert.ok(card, `${id}: the open subject is drawn as a panel`);
  assert.equal(card.panels, 1, `${id}: one panel`);
  assert.ok(card.panelOutline, `${id}: the panel has its hairline`);
  assert.deepEqual(card.boxed, [], `${id}: nothing inside the panel has a border of its own`);
  assert.equal(card.legacy, 0, `${id}: no card, pill or boxed group of the old design is drawn`);
  assert.equal(card.groups, card.expectedGroups, `${id}: every group is drawn`);
  assert.equal(
    card.rows,
    card.expectedRows,
    `${id}: every entry has its row (${card.rows} of ${card.expectedRows})`,
  );
  assert.equal(card.heights.length, 1, `${id}: rows are one height (${card.heights.join(', ')} px)`);
  assert.equal(card.units.length, 1, `${id}: rows are one height on the map`);
  rowUnits ??= card.units[0];
  assert.equal(card.units[0], rowUnits, `${id}: the same row height as every other subject`);
  assert.ok(card.columns.length <= 4, `${id}: rows start on four columns (${card.columns.join(', ')})`);
  assert.equal(card.glyphs.length, 1, `${id}: glyphs are one size (${card.glyphs.join(', ')} px)`);
  assert.ok(card.glyphs[0] >= 11, `${id}: glyphs are large enough to read (${card.glyphs[0]} px)`);
  assert.deepEqual(card.off, [], `${id}: every row lies inside the panel`);
  assert.deepEqual(card.cut.slice(0, 5), [], `${id}: every label stays inside its row`);
  assert.deepEqual(card.wrong.slice(0, 5), [], `${id}: a row is drawn exactly where its entry lives`);
  assert.match(
    card.readout,
    /\d+ (case|rule|concept)/,
    `${id}: the header says what is inside (${card.readout})`,
  );
  assert.ok(card.title.length > 2, `${id}: the panel has its title`);
  assert.match(card.titleFace, /Exo 2/, `${id}: the title is in the display face (${card.titleFace})`);
  assert.deepEqual(
    card.headFaces,
    ['DKLA Inter 600'],
    `${id}: group names are Inter 600 (${card.headFaces})`,
  );
  for (const n of card.notes) {
    assert.equal(n.count, n.want, `${id}: a notes row shows how many it holds`);
    assert.match(n.label, /^\d+ notes? (and|or) questions?$/, `${id}: and says what it counts (${n.label})`);
  }
  const rgbOf = (hex) =>
    `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
  for (const c of card.counts) {
    assert.equal(c.fill, rgbOf(card.muted), `${id}: counts are in the muted colour`);
    if (card.z >= 0.56) assert.ok(c.px >= 12.2, `${id}: counts are 13 px at reading zoom (${c.px})`);
  }
  assert.ok(
    card.groups < 2 || !isFinite(card.gaps.between) || card.gaps.between >= card.gaps.inside * 2,
    `${id}: the gap between groups (${card.gaps.between.toFixed(1)} px) is at least twice the gap inside one (${card.gaps.inside.toFixed(1)} px)`,
  );
  assert.ok(card.gaps.columns >= 2, `${id}: and so is the gap between the two columns of groups`);
  assert.deepEqual(card.dangling, [], `${id}: no caption ends a line on "v."`);
  assert.deepEqual(card.stranded, [], `${id}: no word is left alone on a second line`);
  assert.ok(card.fits, `${id}: the contents fit the place the subject has on the map`);
  assert.ok(
    card.panel.x >= card.frame.x - 1 &&
      card.panel.r <= card.frame.r + 1 &&
      card.panel.y >= card.top - 1 &&
      card.panel.b <= card.frame.b + 1,
    `${id}: the open subject is framed whole in the window`,
  );
  await legible(id);
  report.push(
    `${id}: ${card.groups} groups, ${card.rows} rows of ${card.heights[0]} px, glyphs ${card.glyphs[0]} px, "${card.readout.split(' | ')[0]}"`,
  );
}
// every subject's contents fit its place, and no two rows of a subject share a place
const layout = await page.evaluate(() => {
  const M = mapData(),
    bad = [];
  for (const r of M.regions) {
    if (!(r.districtIds || []).length) continue;
    if (!(r.panelH > 0 && r.panelH <= r.h + 0.01)) bad.push(r.id + ' does not fit');
    const seen = new Map();
    for (const [id, h] of Object.entries(M.homes)) {
      if (h.region !== r.id || h.support) continue;
      const k = h.x + ',' + h.y;
      if (seen.has(k)) bad.push(id + ' shares a row with ' + seen.get(k));
      seen.set(k, id);
      if (h.x < r.x || h.y < r.y || h.x + h.w > r.x + r.w || h.y + h.h > r.y + r.panelH)
        bad.push(id + ' outside its subject');
    }
  }
  return bad;
});
assert.deepEqual(layout.slice(0, 5), [], 'every subject is laid out inside its place, one entry to a row');

/* ---- 2. the open entry is marked, and only it ---- */
await go(() => goRegion('consideration', false));
const hit = await page.evaluate(() => {
  const g = document.querySelector('#geoCanvas .v32-row[data-map-node="hamer"] .v32-row-bg'),
    b = g.getBoundingClientRect();
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
});
await page.mouse.click(hit.x, hit.y);
await page.waitForFunction(() => selected?.type === 'node' && selected.id === 'hamer' && S.panelOpen);
await rest();
const here = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#geoCanvas .v32-row[aria-current="true"]')],
    row = rows[0],
    mark = row?.querySelector('.v32-here');
  return {
    marked: rows.map((g) => g.dataset.mapNode),
    lit: document.querySelectorAll('#geoCanvas .v32-row.is-here').length,
    mark: mark ? getComputedStyle(mark).fill : '',
    amber: getComputedStyle(document.documentElement).getPropertyValue('--v31-here').trim(),
    fill: row ? getComputedStyle(row.querySelector('.v32-row-bg')).fillOpacity : '',
    rows: document.querySelectorAll('#geoCanvas .v32-row[data-map-node]').length,
  };
});
assert.deepEqual(
  here.marked,
  ['hamer'],
  'a press on a row opens that entry, and its row is marked as the one that is open',
);
assert.equal(here.lit, 1, 'one row is lit');
const rgb = (hex) =>
  `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
assert.equal(here.mark, rgb(here.amber), 'the mark is the "you are here" colour');
assert.equal(here.fill, '1', 'the open row is filled');
assert.ok(here.rows > 3, `beside the reader the group still shows its rows (${here.rows})`);
await legible('the strip beside the reader');
report.push(`the open entry: one row marked in ${here.amber}; ${here.rows} rows drawn beside the reader`);

/* ---- 3. notes and questions: one row that opens them ---- */
await go(() => goRegion('consideration', false));
const notes = await page.evaluate(() => {
  const g = document.querySelector('#geoCanvas .v32-row.v32-notes[data-map-district="exchange"]'),
    b = g.querySelector('.v32-row-bg').getBoundingClientRect();
  return {
    x: b.left + b.width / 2,
    y: b.top + b.height / 2,
    label: g.querySelector('text.v32-label').textContent,
  };
});
assert.match(
  notes.label,
  /^\d+ notes and questions$/,
  'a group’s notes and questions are one row that says how many',
);
await page.mouse.click(notes.x, notes.y);
await page.waitForFunction(() => selected?.type === 'district' && selected.id === 'exchange');
await page.waitForFunction(() =>
  [...document.querySelectorAll('#inspector details.quiet-details')].some(
    (el) => el.open && /^Book discussions/.test(el.querySelector('summary').textContent),
  ),
);
await rest();
const group = await page.evaluate(() => ({
  here: [...document.querySelectorAll('#geoCanvas .v32-group.is-here [aria-current="true"]')].map(
    (e) => e.dataset.mapDistrict,
  ),
}));
assert.deepEqual(group.here, ['exchange'], 'the open group is marked on its heading');
report.push('notes and questions: one row with its number; a press opens the group with that list unfolded');

/* ---- 4. close in: the row says more ---- */
await go(() => {
  goRegion('consideration', false);
});
await go(() => {
  const d = districtFor('real-obligation');
  setCamera(d.x + d.w / 2, d.y + d.h / 2, 1, false);
});
const close = await page.evaluate(() => ({
  summaries: document.querySelectorAll('#geoCanvas .v32-row[data-map-node] text.v32-muted').length,
  heights: [
    ...new Set(
      [...document.querySelectorAll('#geoCanvas .v32-row-bg')].map((e) =>
        Math.round(e.getBoundingClientRect().height),
      ),
    ),
  ],
}));
assert.ok(close.summaries >= 5, `close in, a row carries its entry's summary (${close.summaries})`);
assert.equal(close.heights.length, 1, 'rows are still one height close in');
await legible('close in');

/* ---- 5. the course views ---- */
for (const course of ['Contracts', 'Civil Procedure', 'Legislation and the Regulatory State']) {
  await page.mouse.move(5, 5); // off the map: nothing is under the pointer
  await go((course) => home(course, false), course);
  const view = await page.evaluate((course) => {
    const canvas = document.getElementById('geoCanvas'),
      box = (e) => e.getBoundingClientRect(),
      tiles = [...canvas.querySelectorAll('.v32-tile')].filter(
        (g) => regionCourse(regionFor(g.dataset.tile)) === course,
      ),
      over = [];
    for (const b of document.querySelectorAll('#mapWelcome button')) {
      const q = box(b);
      if (!q.width) continue;
      for (const t of canvas.querySelectorAll('.v32-tile-bg')) {
        const p = box(t);
        if (
          Math.min(q.right, p.right) - Math.max(q.left, p.left) > 1 &&
          Math.min(q.bottom, p.bottom) - Math.max(q.top, p.top) > 1
        )
          over.push(b.textContent.trim());
      }
    }
    const named = (id) => !!canvas.querySelector(`text.region-title[data-map-region="${id}"]`),
      stepped = tiles.filter((g) => regionFor(g.dataset.tile).step);
    return {
      tiles: tiles.length,
      unnamed: tiles.filter((g) => !named(g.dataset.tile)).map((g) => g.dataset.tile),
      counted: [...canvas.querySelectorAll('text.v32-count')].filter((t) =>
        /^\d+ (case|rule|concept)/.test(t.textContent),
      ).length,
      // lines at rest: the course's tree only
      tree: [...canvas.querySelectorAll('.v32-link:not(.v32-thread)')].filter(
        (e) =>
          parseFloat(getComputedStyle(e).strokeOpacity) > 0.01 &&
          regionCourse(regionFor(e.dataset.link.split(' ')[0])) === course,
      ).length,
      curves: [...canvas.querySelectorAll('.v32-thread')].filter(
        (e) => parseFloat(getComputedStyle(e).strokeOpacity) > 0.01,
      ).length,
      stepped: stepped.length,
      over,
      outlines: [...new Set(tiles.map((g) => getComputedStyle(g.querySelector('.v32-tile-bg')).strokeWidth))],
      hits: tiles.filter(
        (g) =>
          g.querySelector('path[data-map-region]')?.getAttribute('d') ===
          regionPath(regionFor(g.dataset.tile)),
      ).length,
      title: [...canvas.querySelectorAll('text.course-label')]
        .filter((t) => t.dataset.studyScope === course)
        .map((t) => {
          const b = box(t);
          return b.top >= (document.querySelector('.study-header')?.getBoundingClientRect().bottom || 0) - 1;
        }),
      dashed: [...canvas.querySelectorAll('.v32-zone')].filter((e) => getComputedStyle(e).stroke !== 'none')
        .length,
      // the band of controls at the foot of the map, and what the map draws there
      under: (() => {
        const hit = (a, b) =>
            Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1,
          controls = [...document.querySelectorAll('#dklaSessions, #mapHint, .study-zoom')].filter(
            (e) => !e.hidden && e.getClientRects().length,
          ),
          shown = (e) => {
            for (let n = e; n && n !== canvas; n = n.parentNode)
              if (Number(getComputedStyle(n).opacity) < 0.1) return false;
            return true;
          },
          drawn = [
            ...canvas.querySelectorAll(
              '.v32-tile-bg, .r19-tile > rect, .authority-map-entrance > rect, .dictionary-spine-cover',
            ),
          ].filter(shown),
          out = [];
        for (const c of controls)
          for (const d of drawn)
            if (hit(box(c), box(d)))
              out.push(
                (c.id || c.className) +
                  ' over ' +
                  (d.parentNode.dataset.tile || d.getAttribute('class') || 'supporting cases'),
              );
        return out;
      })(),
      strip: !document.getElementById('dklaSessions').hidden,
      capitals: [...document.querySelectorAll('#dklaSessions *')].filter(
        (e) =>
          e.children.length === 0 &&
          e.textContent.trim() &&
          getComputedStyle(e).textTransform === 'uppercase',
      ).length,
      boxedCards: [...document.querySelectorAll('#dklaSessions .dkla-session-card')].filter(
        (e) => parseFloat(getComputedStyle(e).borderTopWidth) > 0,
      ).length,
    };
  }, course);
  assert.ok(view.tiles >= 10, `${course}: its subjects are tiles (${view.tiles})`);
  assert.deepEqual(view.unnamed, [], `${course}: every tile is named`);
  assert.equal(
    view.counted,
    view.stepped,
    `${course}: every subject says what is in it (${view.counted} of ${view.stepped})`,
  );
  assert.deepEqual(view.over, [], `${course}: the controls under the location bar do not cover a tile`);
  assert.equal(view.hits, view.tiles, `${course}: a tile's press target is the map's fixed outline`);
  assert.ok(
    view.title.length && view.title.every(Boolean),
    `${course}: the course's name is not under the top bar`,
  );
  assert.equal(view.dashed, 0, `${course}: the course's parts have no outline`);
  assert.equal(view.curves, 0, `${course}: at rest no curve of association is drawn (${view.curves})`);
  assert.ok(
    view.tree >= 8 && view.tree <= 14,
    `${course}: at rest the course's tree is drawn (${view.tree} lines)`,
  );
  assert.ok(view.strip, `${course}: the strip of sessions is shown`);
  assert.deepEqual(view.under, [], `${course}: nothing the map draws lies under the controls at its foot`);
  assert.equal(view.capitals, 0, `${course}: the strip has no capitals-only label`);
  assert.equal(view.boxedCards, 0, `${course}: a session card has no outline of its own inside the strip`);
  await legible(course);
  report.push(
    `${course}: ${view.tiles} tiles, ${view.counted} with counts, nothing under the note's controls`,
  );
}

/* ---- 6. Home ---- */
await go(() => home('Atlas', false));
const homeView = await page.evaluate(() => {
  const canvas = document.getElementById('geoCanvas');
  return {
    tiles: canvas.querySelectorAll('g.map-region.v32-tile path[data-map-region]').length,
    support: [...canvas.querySelectorAll('.r19-tile')].map((g) => ({
      count: g.querySelector('.v32-num')?.textContent || '',
      label: g.querySelector('text')?.textContent || '',
      dash: getComputedStyle(g.querySelector('rect')).strokeDasharray,
    })),
    dictionary: canvas.querySelector('.v32-dictionary text.v32-count')?.textContent || '',
    curves: [...canvas.querySelectorAll('.v32-thread')].filter(
      (e) => parseFloat(getComputedStyle(e).strokeOpacity) > 0.01,
    ).length,
    tree: [...canvas.querySelectorAll('.v32-link:not(.v32-thread)')].filter(
      (e) => parseFloat(getComputedStyle(e).strokeOpacity) > 0.01,
    ).length,
    ground: getComputedStyle(canvas).backgroundImage,
    books: [
      ...new Set(
        [...canvas.querySelectorAll('.authority-volume-cover .authority-cover-bg')].map(
          (e) => getComputedStyle(e).stroke,
        ),
      ),
    ],
    covers: canvas.querySelectorAll('.authority-volume-cover').length,
  };
});
assert.ok(homeView.tiles >= 40, `Home: every subject is a tile (${homeView.tiles})`);
assert.equal(homeView.support.length, 3, 'Home: three supporting-cases controls');
for (const s of homeView.support) {
  assert.match(
    s.label,
    /^\d+ supporting cases$/,
    `Home: a supporting-cases control says how many (${s.label})`,
  );
  assert.equal(s.dash, 'none', 'Home: a supporting-cases control has a plain outline');
}
assert.match(
  homeView.dictionary,
  /^\d[\d,]* terms$/,
  `Home: the dictionary shows its number of terms (${homeView.dictionary})`,
);
assert.equal(homeView.curves, 0, `Home: at rest no curve of association is drawn (${homeView.curves})`);
assert.ok(homeView.tree >= 25, `Home: at rest the three course trees are drawn (${homeView.tree} lines)`);
assert.equal(homeView.covers, 6, 'Home: six books');
assert.equal(homeView.books.length, 1, 'Home: the six books share one outline');
await legible('Home');
// The territories (rule 15): three coloured regions, and their trees drawn to be followed.
const territory = await page.evaluate(() => {
  const canvas = document.getElementById('geoCanvas'),
    lum = (rgb) => {
      const [r, g, b] = rgb
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map((v) => {
          const c = Number(v) / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    },
    ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05),
    hex = (h) =>
      `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`,
    courses = Object.keys(galaxy().blocks),
    ground = getComputedStyle(document.documentElement).getPropertyValue('--v31-ground').trim(),
    out = { courses: {}, wrongFill: [], lowContrast: [], weak: [], outlines: new Set() };
  for (const c of courses) out.courses[c] = { fills: new Set(), subjects: 0 };
  for (const g of canvas.querySelectorAll('.v32-tile')) {
    const r = regionFor(g.dataset.tile),
      c = regionCourse(r);
    if (!r.step || !out.courses[c]) continue;
    const bg = getComputedStyle(g.querySelector('.v32-tile-bg')),
      name = canvas.querySelector(`text.region-title[data-map-region="${g.dataset.tile}"]`);
    out.courses[c].subjects++;
    out.courses[c].fills.add(bg.fill);
    out.outlines.add(bg.strokeWidth);
    if (bg.fill !== hex(TILE_FILL[c]) || Number(bg.fillOpacity) !== 1) out.wrongFill.push(g.dataset.tile);
    if (bg.stroke !== hex(ARM_COLORS[c]) || Number(bg.strokeOpacity) < 0.6) out.weak.push(g.dataset.tile);
    if (name && ratio(getComputedStyle(name).fill, bg.fill) < 7)
      out.lowContrast.push(g.dataset.tile + ' ' + ratio(getComputedStyle(name).fill, bg.fill).toFixed(2));
  }
  const fills = courses.map((c) => [...out.courses[c].fills]);
  // the tree lines, as drawn: sampled every two pixels along the line itself (not its arrowhead)
  const m = canvas.getScreenCTM(),
    tiles = [...canvas.querySelectorAll('.v32-tile')].map((g) => ({
      id: g.dataset.tile,
      b: g.querySelector('.v32-tile-bg').getBoundingClientRect(),
    })),
    lines = [...canvas.querySelectorAll('.v32-link:not(.v32-thread)')].map((e) => {
      const cs = getComputedStyle(e),
        probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      probe.setAttribute('d', e.getAttribute('d').split(' M')[0]);
      canvas.appendChild(probe);
      const L = probe.getTotalLength(),
        n = Math.max(2, Math.ceil((L * m.a) / 2)),
        pts = [];
      for (let i = 0; i <= n; i++) {
        const p = probe.getPointAtLength((L * i) / n);
        pts.push({ x: p.x * m.a + m.e, y: p.y * m.d + m.f });
      }
      probe.remove();
      const ids = e.dataset.link.split(' ');
      return {
        ids,
        pts,
        flow: e.classList.contains('v32-flow'),
        head: e.getAttribute('d').split(' M').length === 2,
        px: parseFloat(cs.strokeWidth) * m.a,
        strength: Number(cs.strokeOpacity) * Number(e.getAttribute('opacity') || 1),
        own: cs.stroke === hex(ARM_COLORS[regionCourse(regionFor(ids[0]))]),
      };
    }),
    behind = [],
    crossings = [],
    turn = (a, b, c) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x),
    cut = (a, b, c, d) => turn(a, c, d) !== turn(b, c, d) && turn(a, b, c) !== turn(a, b, d);
  for (const l of lines)
    for (const t of tiles) {
      if (l.ids.includes(t.id)) continue;
      const inside = l.pts.filter(
        (p) => p.x > t.b.left + 1.5 && p.x < t.b.right - 1.5 && p.y > t.b.top + 1.5 && p.y < t.b.bottom - 1.5,
      ).length;
      if (inside > 1) behind.push(`${l.ids.join(' to ')} behind ${t.id}`);
    }
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length; j++) {
      const A = lines[i].pts,
        B = lines[j].pts;
      let hit = false;
      for (let a = 2; a < A.length - 3 && !hit; a++)
        for (let b = 2; b < B.length - 3 && !hit; b++) hit = cut(A[a], A[a + 1], B[b], B[b + 1]);
      if (hit) crossings.push(lines[i].ids.join('>') + ' x ' + lines[j].ids.join('>'));
    }
  const land = [...canvas.querySelectorAll('.v32-land')];
  return {
    subjects: courses.map((c) => out.courses[c].subjects),
    fills,
    apart: fills.flat().map((f) => ratio(f, hex(ground))),
    wrongFill: out.wrongFill,
    weak: out.weak,
    lowContrast: out.lowContrast,
    outlines: [...out.outlines],
    lines: lines.length,
    thin: lines.filter((l) => l.px < 1.4 || l.strength < 0.6 || !l.own).length,
    headless: lines.filter((l) => l.flow !== l.head).length,
    flows: lines.filter((l) => l.flow).length,
    behind,
    crossings,
    land: land.map((e) => e.dataset.land),
    landFill: land.filter((e) => /^url\(/.test(e.getAttribute('fill') || '')).length,
    gradients: [...canvas.querySelectorAll('[fill^="url(#glow"]')].length,
    starts: [...canvas.querySelectorAll('.v32-start')].map((e) => regionFor(e.parentNode.dataset.tile)?.step),
    startText: [...canvas.querySelectorAll('.v32-start text')].map((e) => e.textContent),
  };
});
assert.ok(
  territory.subjects.every((n) => n >= 9),
  `Home: each course's subjects are tiles (${territory.subjects})`,
);
assert.ok(
  territory.fills.every((f) => f.length === 1) && new Set(territory.fills.flat()).size === 3,
  `Home: one fill a course, three in all (${JSON.stringify(territory.fills)})`,
);
assert.deepEqual(territory.wrongFill, [], "Home: a subject's tile is filled in its course's colour");
assert.deepEqual(territory.weak, [], "Home: and edged in the course's accent, clearly");
assert.ok(
  territory.apart.every((r) => r >= 1.7),
  `Home: a territory's fill stands off the ground (${territory.apart.map((r) => r.toFixed(2))})`,
);
assert.deepEqual(territory.lowContrast, [], "Home: a tile's name is 7:1 or better on its fill");
assert.equal(territory.outlines.length, 1, `Home: tiles have one outline weight (${territory.outlines})`);
assert.equal(
  territory.thin,
  0,
  'Home: every tree line is in its course colour at a weight that can be followed',
);
assert.ok(territory.flows >= 12, `Home: the trees have their "leads to" lines (${territory.flows})`);
assert.equal(territory.headless, 0, 'Home: a "leads to" line ends in an arrowhead, and only those do');
assert.deepEqual(territory.behind, [], 'Home: no tree line passes behind a third subject');
assert.ok(
  territory.crossings.length <= 2,
  `Home: the trees cross at most twice (${territory.crossings.join('; ')})`,
);
assert.equal(territory.land.length, 3, 'Home: each course stands on its land');
assert.equal(territory.landFill, 3, "Home: the land is the ground's dots in the course's colour");
assert.equal(territory.gradients, 0, 'Home: no gradient under a course');
assert.deepEqual(territory.starts, [1, 1, 1], "Home: each course's first subject is marked");
assert.deepEqual(territory.startText, ['1', '1', '1'], 'Home: with its number');
report.push(
  `Home: ${territory.lines} tree lines, ${territory.crossings.length} crossings, none behind a subject; fills ${territory.fills.flat().join(' ')}`,
);
// a tile under the pointer shows its own links, and only those
const over = await page.evaluate(() => {
  const g = document.querySelector('#geoCanvas .v32-tile[data-tile="consideration"] .v32-tile-hit'),
    b = g.getBoundingClientRect();
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
});
await page.mouse.move(over.x, over.y);
await page.waitForFunction(() => document.querySelector('#geoCanvas .v32-link.is-hover'));
const lit = await page.evaluate(() => {
  const shown = [...document.querySelectorAll('#geoCanvas .v32-thread')].filter(
    (e) => parseFloat(getComputedStyle(e).strokeOpacity) > 0.5,
  );
  return {
    shown: shown.length,
    own: shown.filter((e) => e.dataset.link.split(' ').includes('consideration')).length,
    // the lines of the other subjects step back while this one's are shown
    loud: [...document.querySelectorAll('#geoCanvas .v32-link:not(.v32-thread, .is-hover, .is-lit)')].filter(
      (e) => parseFloat(getComputedStyle(e).strokeOpacity) > 0.3,
    ).length,
  };
});
assert.equal(lit.loud, 0, `Home: while a tile's links show, the other lines step back (${lit.loud} do not)`);
assert.ok(
  lit.shown >= 1 && lit.shown === lit.own,
  `Home: a tile under the pointer shows its own links only (${lit.own} of ${lit.shown})`,
);
await page.mouse.move(5, 5);
// A case opened from Home: beside the reader the other subjects step back, and the open subject's lines
// pass behind them, never through their names: a dimmed tile stands on a solid piece of ground.
await go(() => goNode('hamer'));
await page.waitForFunction(() => selected?.type === 'node' && selected.id === 'hamer' && S.panelOpen);
await rest();
const strip = await page.evaluate(() => {
  const dimmed = [...document.querySelectorAll('#geoCanvas .v32-tile')].filter(
    // (a subject of another course fades out with its course; it is not in the picture)
    (g) => Number(g.getAttribute('opacity')) < 1 && Number(getComputedStyle(g).opacity) > 0.1,
  );
  return {
    dimmed: dimmed.length,
    solid: dimmed.filter((g) => {
      const under = g.previousElementSibling;
      if (!under?.classList.contains('v32-tile-under')) return false;
      const cs = getComputedStyle(under),
        a = under.getBoundingClientRect(),
        b = g.querySelector('.v32-tile-bg').getBoundingClientRect();
      return (
        Number(cs.fillOpacity) === 1 &&
        Number(cs.opacity) === 1 &&
        cs.fill !== 'none' &&
        Math.abs(a.left - b.left) < 1.5 &&
        Math.abs(a.width - b.width) < 3
      );
    }).length,
    lit: document.querySelectorAll('#geoCanvas .v32-link.is-lit').length,
  };
});
assert.ok(strip.dimmed >= 3, `beside the reader the other subjects step back (${strip.dimmed})`);
assert.equal(
  strip.solid,
  strip.dimmed,
  `a tile that steps back stays solid, so no line shows through its name (${strip.solid} of ${strip.dimmed})`,
);
assert.ok(strip.lit >= 1, 'the open subject keeps its lines lit beside the reader');
await legible('the strip beside a case opened from Home');
report.push(
  `Home: ${homeView.tiles} tiles; supporting cases ${homeView.support.map((s) => s.count).join(', ')}; dictionary ${homeView.dictionary} terms`,
);

assert.deepEqual(errors, [], 'no page errors');
await browser.close();
console.log('cards: ok\n  ' + report.join('\n  '));
