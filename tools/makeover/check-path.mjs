/* Makeover on 3.1, first proof: the path Home > Contracts > Offer > a group > a concept, in a real
   browser at the owner's window size (1512 x 789).

     node tools/makeover/check-path.mjs http://127.0.0.1:8766/DKLA-v3.1.html

   On the Offer subject:
   - every group shows at least one entry (the short "Was there an offer?" group drew an empty box);
   - a long entry name takes a second line at the row size instead of shrinking: no name is drawn
     under 8.5 px, at least one name is on two lines, and a two-line name is 10.5 px or larger;
   - no name runs past its row, no row runs past the bottom of its group, and rows do not overlap;
   - a section sign is never the last thing on a line, and no name ends in an ellipsis where the
     entry's whole title fits on two lines (N.Y. General Obligations Law § 5-1109).
   On Delegation and statutory authority (thirteen short groups): at least twelve groups show an
   entry, and no row is blank or under 9 px.
   With the group's page open:
   - the trail keeps every step, puts the place on its own line, and leaves no separator hanging;
   - each "Explore the questions" row has a 16 px title and a 14 px answer.
   On the concept "Termination of the power of acceptance":
   - "Lecture context" counts "1 note", and the source chip shows whole words. */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1512, height: 789 }, serviceWorkers: 'block' });
await context.route('**/*', (route) => {
  const url = new URL(route.request().url());
  return url.origin !== address.origin || url.pathname.startsWith('/api/')
    ? route.fulfill({ status: 204, body: '' })
    : route.continue();
});
await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
const page = await context.newPage();
page.setDefaultTimeout(20_000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
// The map's tidy-up step catches its own errors and logs them, and the steps after the failure are
// then skipped on every draw, so a logged map error is a failure here.
page.on('console', (message) => {
  if (message.type() === 'error' && /DKLA r20 map/.test(message.text()))
    errors.push(message.text().split('\n')[0]);
});
await page.goto(address.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
await page.waitForFunction(() => window.LegalAtlas?.ready);

// ---- the Offer subject, opened the way a reader opens it
await page.evaluate(() => goRegion('offer-region', false));
await page.waitForFunction(() => document.querySelectorAll('text[data-map-jump]').length > 8);
await page.waitForTimeout(900);
const offer = await page.evaluate(() => {
  const z = S.z,
    region = regionFor('offer-region'),
    px = (n) => Math.round(n * 10) / 10;
  const groups = region.districtIds.map((id) => {
    const d = districtFor(id),
      bottom = document
        .querySelector(`rect.district-hit[data-map-district="${id}"]`)
        .getBoundingClientRect().bottom;
    const rows = [...document.querySelectorAll('text[data-map-jump]')]
      .filter((t) => homeFor(t.getAttribute('data-map-jump'))?.district === id)
      .map((t) => {
        const card = t.previousElementSibling?.classList.contains('r20-mini')
            ? t.previousElementSibling.querySelector('rect').getBoundingClientRect()
            : null,
          box = t.getBoundingClientRect(),
          lines = [...t.querySelectorAll('tspan')].map((s) => s.textContent);
        return {
          id: t.getAttribute('data-map-jump'),
          text: t.textContent,
          lines: lines.length ? lines : [t.textContent],
          size: px(parseFloat(t.getAttribute('font-size')) * z),
          hidden: t.style.visibility === 'hidden' || t.style.opacity === '0',
          textRight: px(box.right),
          cardRight: card ? px(card.right) : null,
          cardTop: card ? px(card.top) : null,
          cardBottom: card ? px(card.bottom) : null,
          title: nodesById.get(t.getAttribute('data-map-jump'))?.title,
        };
      })
      .sort((a, b) => a.cardTop - b.cardTop);
    return { id, title: d.title, bottom: px(bottom), rows };
  });
  return { z, groups };
});
const rows = offer.groups.flatMap((g) => g.rows);
for (const g of offer.groups) {
  assert.ok(g.rows.length >= 1, `the group "${g.title}" shows no entry on the Offer subject`);
  for (const [i, r] of g.rows.entries()) {
    assert.ok(r.cardBottom !== null, `"${r.text}" has no row card`);
    assert.ok(r.cardBottom <= g.bottom + 0.5, `"${r.text}" runs past the bottom of "${g.title}"`);
    assert.ok(r.textRight <= r.cardRight + 0.5, `"${r.text}" runs past its row`);
    if (i) assert.ok(r.cardTop >= g.rows[i - 1].cardBottom - 0.5, `"${r.text}" overlaps the row above it`);
  }
}
const drawn = rows.filter((r) => !r.hidden);
assert.ok(
  drawn.every((r) => r.size >= 8.5),
  'a name is drawn under 8.5 px: ' +
    JSON.stringify(drawn.filter((r) => r.size < 8.5).map((r) => [r.text, r.size])),
);
const two = rows.filter((r) => r.lines.length === 2);
assert.ok(two.length >= 4, `long names take a second line (found ${two.length} two-line names)`);
assert.ok(
  two.every((r) => r.size >= 10.5),
  'a two-line name is under 10.5 px',
);
assert.ok(
  rows.every((r) => r.lines.every((line) => !/§+$/.test(line.trim()))),
  'a section sign ends a line',
);
const gol = rows.find((r) => r.id === 'ny51109');
assert.ok(gol, 'N.Y. General Obligations Law § 5-1109 is on the Offer subject');
assert.equal(gol.lines.join(' '), gol.title, 'the General Obligations Law entry shows its whole title');
assert.ok(
  rows.filter((r) => r.lines.length === 1 && r.size >= 11.9).length >= 6,
  'short names keep the 12 px row size',
);

// ---- a subject of short groups: Delegation and statutory authority showed eleven empty groups of
// thirteen, and row cards with an icon and no name
await page.evaluate(() => goRegion('lrs-region-delegation-and-statutory-authority', false));
await page.waitForTimeout(1200);
const delegation = await page.evaluate(() => {
  const z = S.z,
    region = regionFor('lrs-region-delegation-and-statutory-authority');
  const mine = [...document.querySelectorAll('text[data-map-jump]')].filter(
    (t) => homeFor(t.getAttribute('data-map-jump'))?.region === region.id,
  );
  return {
    groups: region.districtIds.length,
    shown: new Set(mine.map((t) => homeFor(t.getAttribute('data-map-jump')).district)).size,
    blank: mine
      .filter(
        (t) =>
          t.style.opacity === '0' ||
          t.style.visibility === 'hidden' ||
          parseFloat(t.getAttribute('font-size')) * z < 9,
      )
      .map((t) => t.getAttribute('data-map-jump')),
  };
});
assert.ok(
  delegation.shown >= 12,
  `Delegation and statutory authority shows an entry in ${delegation.shown} of ${delegation.groups} groups`,
);
assert.deepEqual(delegation.blank, [], 'a row is blank or its name is under 9 px');

// ---- the group's page: the trail and the list
await page.evaluate(() => goDistrict('offer-duration', false));
await page.locator('#inspector .study-entry-link').first().waitFor();
await page.waitForTimeout(600);
const group = await page.evaluate(() => {
  const crumb = document.querySelector('#geoBreadcrumb'),
    steps = [...crumb.querySelectorAll('button')],
    seps = [...crumb.querySelectorAll('span')],
    last = steps.at(-1),
    row = document.querySelector('#inspector .study-entry-link'),
    top = (el) => Math.round(el.getBoundingClientRect().top);
  return {
    steps: steps.map((b) => b.textContent),
    allShown: steps.every((b) => b.getBoundingClientRect().width > 0),
    lastAlone: steps.slice(0, -1).every((b) => top(b) < top(last)),
    othersOneLine: new Set(steps.slice(0, -1).map(top)).size === 1,
    hanging: seps.at(-1).getBoundingClientRect().width > 0,
    placeCut: last.scrollWidth > last.clientWidth + 1,
    titlePx: parseFloat(getComputedStyle(row.querySelector('strong')).fontSize),
    answerPx: parseFloat(getComputedStyle(row.querySelector('p')).fontSize),
    rows: document.querySelectorAll('#inspector .study-entry-link').length,
  };
});
assert.deepEqual(group.steps, ['Atlas', 'Contracts', 'Offer', 'Lapse, revocation & other endings']);
assert.ok(group.allShown, 'every step of the trail is still shown with a page open');
assert.ok(
  group.lastAlone && group.othersOneLine,
  'the place is on its own line under the steps that lead to it',
);
assert.ok(!group.hanging, 'a separator hangs at the end of the first line of the trail');
assert.ok(!group.placeCut, 'the place in the trail is cut short');
assert.equal(group.titlePx, 16, 'question titles are 16 px');
assert.equal(group.answerPx, 14, 'question answers are 14 px');
assert.ok(group.rows >= 4, 'the group lists its questions');

// ---- the concept
await page
  .locator('#inspector .study-entry-link', { hasText: 'Termination of the power of acceptance' })
  .click();
await page.locator('#inspector details.lecture-related summary').waitFor();
const concept = await page.evaluate(() => ({
  lecture: document.querySelector('#inspector details.lecture-related summary').textContent.trim(),
  chips: [...document.querySelectorAll('#inspector .dkla-file-chips button')].map((b) =>
    b.textContent.replace(/\s*↗\s*$/, '').trim(),
  ),
}));
assert.equal(concept.lecture, 'Lecture context · 1 note');
assert.ok(
  concept.chips.every((chip) => !chip.includes('_')),
  'a source chip shows a raw file name: ' + concept.chips.join(' | '),
);
assert.deepEqual(errors, [], 'page errors');
await browser.close();
console.log(
  `makeover path: ${rows.length} entry names on Offer, ${two.length} on two lines, smallest ${Math.min(...drawn.map((r) => r.size))} px; trail steps ${group.steps.length}; ok`,
);
