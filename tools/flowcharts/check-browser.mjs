/* Exercise the course library, two chart shapes, their sources and the print view. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const routeFor = (hash) => new URL(hash, address).href;
const output = process.env.DKLA_FLOWCHART_CAPTURES;
if (output) await mkdir(output, { recursive: true });

const browser = await chromium.launch();

async function open(viewport, hash = '') {
  const context = await browser.newContext({
    viewport,
    serviceWorkers: 'block',
    colorScheme: 'dark',
    hasTouch: viewport.width <= 390,
  });
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.origin !== address.origin || url.pathname.startsWith('/api/')
      ? route.fulfill({ status: 204, body: '' })
      : route.continue();
  });
  await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(routeFor(hash), { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
  return { context, page, errors };
}

const courseDialog = (page) => page.locator('dialog#dklaFlowcharts');
const activeHeading = (page) => page.locator('#flowchartDetail h3').first();
const branch = (page, id) => page.locator(`#flowchartDetail [data-flowchart-branch="${id}"]`);
const graphNode = (page, id) =>
  page.locator(`[data-flowchart-node="${id}"]`).filter({ visible: true }).first();

async function capture(page, name) {
  if (output) await page.screenshot({ path: path.join(output, `${name}.png`), animations: 'disabled' });
}

async function assertFits(page, control) {
  await expect(control).toBeVisible();
  const bounds = await control.boundingBox();
  assert.ok(
    bounds.x >= 0 && bounds.x + bounds.width <= page.viewportSize().width + 1,
    'control fits viewport',
  );
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    'page has no sideways overflow',
  );
}

async function verifyZoom(dialog) {
  const scale = dialog.locator('.fc-zoom-value');
  const area = dialog.locator('.fc-map-scroll');
  const measure = () =>
    area.evaluate((element) => {
      const view = element.getBoundingClientRect();
      return {
        overflow:
          element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2,
        contained: [...element.querySelectorAll('[data-fc-cell]')].every((node) => {
          const box = node.getBoundingClientRect();
          return (
            box.left >= view.left - 2 &&
            box.right <= view.right + 2 &&
            box.top >= view.top - 2 &&
            box.bottom <= view.bottom + 2
          );
        }),
      };
    });
  await expect(scale).toHaveText('100%');
  await dialog.locator('[data-flowcharts-zoom="fit"]').click();
  await expect(scale).not.toHaveText('100%');
  assert.deepEqual(await measure(), { overflow: false, contained: true }, 'Fit shows the complete chart');
  await dialog.locator('[data-flowcharts-zoom="reset"]').click();
  await expect(scale).toHaveText('100%');
  assert.ok((await measure()).overflow, '100% restores the full-size scrollable chart');
}

/* Every answer on the whole map: its one wire leaves the plate at that answer (or, for a step with a
   single way on, from the foot of the plate), arrives with an arrow on the step the chart's data
   names (or on the bar over that step, whose own arrow lands on it), and passes behind no other
   step on the way. Measured from what is drawn, not from the attributes the page wrote. */
const reach = () => {
  const dialog = document.querySelector('dialog#dklaFlowcharts');
  dialog.querySelector('[data-flowcharts-view="map"]').click();
  const chart = JSON.parse(document.getElementById('dklaFlowchartsData').textContent).find(
    (one) => one.id === dialog.dataset.printChart,
  );
  const map = dialog.querySelector('.fc-map');
  const cells = new Map(
    [...map.querySelectorAll('[data-fc-cell]')].map((cell) => [
      cell.dataset.fcCell,
      cell.getBoundingClientRect(),
    ]),
  );
  const point = (path, length) => path.getPointAtLength(length).matrixTransform(path.getScreenCTM());
  const near = (a, b, slack = 2.5) => Math.abs(a - b) <= slack;
  const within = (value, low, high, slack = 2.5) => value >= low - slack && value <= high + slack;
  const faults = [];
  const bars = new Map([...map.querySelectorAll('.fc-join')].map((join) => [join.dataset.fcTo, join]));
  for (const [to, join] of bars) {
    const stem = join.querySelector('.fc-join-in');
    const end = point(stem, stem.getTotalLength());
    const box = cells.get(to);
    if (
      !stem.hasAttribute('marker-end') ||
      !box ||
      !within(end.x, box.left, box.right) ||
      !near(end.y, box.top, 5)
    )
      faults.push(`the bar over ${to} has no arrow landing on ${to}`);
  }
  let answers = 0;
  for (const node of chart.nodes)
    (node.edges || []).forEach((edge, index) => {
      answers += 1;
      const name = `${node.id}, answer ${index + 1} (${edge.label}) to ${edge.to}`;
      const wires = map.querySelectorAll(
        `.fc-wire[data-fc-from="${CSS.escape(node.id)}"][data-fc-edge="${index}"]`,
      );
      if (wires.length !== 1) return faults.push(`${name}: ${wires.length} wires`);
      const wire = wires[0];
      const from = cells.get(node.id);
      const to = cells.get(edge.to);
      const button = map
        .querySelector(`[data-fc-cell="${CSS.escape(node.id)}"] [data-fc-map-branch="${index}"]`)
        .getBoundingClientRect();
      const length = wire.getTotalLength();
      const start = point(wire, 0);
      const end = point(wire, length);
      const side =
        (near(start.x, from.left) || near(start.x, from.right)) && within(start.y, button.top, button.bottom);
      const foot = near(start.y, from.bottom) && within(start.x, from.left, from.right);
      if (!side && !foot) faults.push(`${name}: the wire does not start at its answer`);
      if (wire.hasAttribute('marker-end')) {
        const top = near(end.y, to.top, 5) && within(end.x, to.left, to.right);
        const flank = near(end.x, to.left, 5) && within(end.y, to.top, to.bottom);
        if (!top && !flank) faults.push(`${name}: the arrow does not land on ${edge.to}`);
      } else {
        const join = bars.get(edge.to);
        if (!join) return faults.push(`${name}: ends on a bar, but ${edge.to} has none`);
        const bar = join.querySelector('.fc-join-bar').getBoundingClientRect();
        if (!within(end.x, bar.left, bar.right) || !within(end.y, bar.top, bar.bottom))
          faults.push(`${name}: does not end on the bar over ${edge.to}`);
      }
      for (let at = 0; at <= length; at += 4) {
        const p = point(wire, at);
        for (const [id, box] of cells) {
          if (id === node.id || id === edge.to) continue;
          if (p.x > box.left + 2 && p.x < box.right - 2 && p.y > box.top + 2 && p.y < box.bottom - 2)
            return faults.push(`${name}: passes behind ${id}`);
        }
      }
    });
  return {
    answers,
    wires: map.querySelectorAll('.fc-wire').length,
    cells: cells.size,
    faults,
  };
};

/* A trip to a cited case and back, from a step reached by a longer route than the shortest: the
   step, the whole walked path, the view, the zoom and the scroll positions come back as they were. */
async function trip(page, hash, tap) {
  const dialog = courseDialog(page);
  const act = (target) => (tap ? target.tap() : target.click());
  const place = () =>
    dialog.evaluate((box) => {
      const map = !box.querySelector('.fc-map').hidden;
      const scroll = box.querySelector('.fc-map-scroll');
      return {
        address: location.hash,
        step: box.querySelector('#flowchartDetail h3').textContent.trim(),
        path: [...box.querySelectorAll('.fc-trail li .fc-trail-q')].map((one) => one.textContent.trim()),
        map,
        page: Math.round(box.querySelector('.fc-body').scrollTop),
        // the zoom and the map's own position mean something only while the map is shown
        zoom: map ? box.querySelector('.fc-zoom-value').textContent : '',
        scroll: map ? [Math.round(scroll.scrollLeft), Math.round(scroll.scrollTop)] : [],
      };
    });
  await page.goto(routeFor(hash));
  await expect(dialog).toBeVisible();
  await act(dialog.locator('[data-flowcharts-view="walkthrough"]'));
  const walk = ['order', 'hearing', 'informal', 'interest', 'balance', 'goldberg'];
  for (const to of hash.includes('step=order') ? walk.slice(1) : walk) await act(branch(page, to));
  await expect(activeHeading(page)).toHaveText('Goldberg required an evidentiary hearing before cutoff');
  for (const view of ['walkthrough', 'map']) {
    await act(dialog.locator(`[data-flowcharts-view="${view}"]`));
    const source = dialog
      .locator('a[data-flowchart-source][href="#node=lrs-o-goldberg"]')
      .filter({ visible: true })
      .first();
    await source.scrollIntoViewIfNeeded();
    const left = await place();
    assert.equal(left.path.length, 7, 'the walked path has its seven steps');
    assert.ok(left.path.includes('What does hearing mean in this statute?'), 'the path is the one walked');
    await act(source);
    await expect(page).toHaveURL(routeFor('#node=lrs-o-goldberg'));
    await expect(dialog).toBeHidden();
    await page.goBack();
    await expect(dialog).toBeVisible();
    await expect.poll(place, { message: `${hash}, ${view}: back from a source` }).toEqual(left);
    // The app's own Back (the arrow in the top bar, where there is one) does the same.
    if (!tap) {
      // (Pressed where it stands: a pointer click would first scroll it to a place of its own choosing.)
      await source.evaluate((link) => link.click());
      await expect(dialog).toBeHidden();
      await expect(page.locator('#studyBack')).toHaveAttribute('title', /Back to the flowchart/);
      await page.locator('#studyBack').click();
      await expect(dialog).toBeVisible();
      await expect.poll(place, { message: `${hash}, ${view}: the app's Back` }).toEqual(left);
    }
  }
  // The address names the step, so a reload comes back to it; and a step arrived at by its address
  // is shown with one route to it, not as a path the reader walked.
  assert.match(page.url(), /#flowchart=LRS-15&step=goldberg/, 'the address follows the step');
  await page.reload();
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
  await expect(activeHeading(page)).toHaveText('Goldberg required an evidentiary hearing before cutoff');
  await expect(dialog.locator('.fc-step-label')).toHaveText(/^Outcome · chart step 20(?: · decided by .+)?$/);
  await expect(dialog.locator('.fc-trail-label')).toHaveText(['One route to this step']);
  await expect(dialog.locator('.fc-trail li[aria-current] .fc-trail-n')).toHaveText('chart step 20 · now');
  // Decisions are counted only where the reader decides: from the route's end, back one step to the
  // fork, which is then the reader's 1st decision, and on by an answer.
  await act(dialog.locator('.fc-walk-controls [data-flowcharts-back]'));
  await expect(dialog.locator('.fc-step-label')).toHaveText(/^Your 1st decision · chart step 19/);
  await act(branch(page, 'mathews'));
  await expect(dialog.locator('.fc-trail-label')).toHaveText([
    'One route to chart step 19',
    'Your path from chart step 19: 1 decision so far',
  ]);
}

/* Under an answer in the walkthrough: the opening sentence stored for where it leads, when that
   sentence states something; an instruction is not shown. (The same rule as
   tools/flowcharts/deciding-gaps.mjs, which lists the forks left with nothing.) */
async function decidingSentences(page) {
  const dialog = courseDialog(page);
  const { deciding } = await import('./deciding-gaps.mjs');
  const chart = JSON.parse(
    await page.evaluate(() => document.getElementById('dklaFlowchartsData').textContent),
  ).find((one) => one.id === 'LRS-15');
  const byId = new Map(chart.nodes.map((node) => [node.id, node]));
  for (const step of ['order', 'balance', 'interest']) {
    await page.goto(routeFor('#flowchart=LRS-15&step=' + step));
    await dialog.locator('[data-flowcharts-view="walkthrough"]').click();
    const expected = byId.get(step).edges.map((edge) => deciding(byId.get(edge.to)));
    const shown = await dialog
      .locator('#flowchartDetail .fc-choices > li')
      .evaluateAll((items) => items.map((item) => item.querySelector('.fc-leads')?.textContent || ''));
    assert.deepEqual(shown, expected, `LRS-15 ${step}: the sentences under the answers`);
  }
  // The model case: one answer has a stated example, the instruction-only answers have nothing.
  assert.deepEqual(
    byId.get('order').edges.map((edge) => deciding(byId.get(edge.to))),
    [
      '',
      'Marathon Oil read an opportunity for public hearing on individualized discharge permits to entail formal adjudication.',
      '',
      'The federal APA supplies no general state-agency process.',
    ],
  );
}

/* A drawing on the map, on the step being shown or on any other: pressed, it shows a card with its
   case's name; the reader stays on the step; the card opens the case; Back returns to the chart. */
async function drawings(page, tap) {
  const dialog = courseDialog(page);
  const act = (target) => (tap ? target.tap() : target.click());
  await page.goto(routeFor('#flowchart=LRS-15&step=order'));
  await expect(dialog).toBeVisible();
  await act(dialog.locator('[data-flowcharts-view="map"]'));
  // The line of help says "point" only where there is a pointer.
  await expect(dialog.locator('.fc-help-touch')).toBeVisible({ visible: !!tap });
  await expect(dialog.locator('.fc-help-point')).toBeVisible({ visible: !tap });
  // (On a phone the map is the list of steps; on a wider window, the wired chart.)
  const at = (step) =>
    dialog.locator(tap ? `.fc-outline [data-fc-line="${step}"]` : `.fc-map [data-fc-cell="${step}"]`);
  for (const step of ['hearing', 'state']) {
    const item = at(step).locator('.fc-art-item').first();
    const card = item.locator('.fc-art-card');
    await expect(card).toBeHidden();
    await act(item.locator('[data-fc-art]'));
    await expect(card).toBeVisible();
    await expect(card.locator('.fc-art-title')).not.toBeEmpty();
    await expect(card.locator('.fc-art-open')).toHaveText(/^Open (case|rule|concept|statute|note|entry) →$/);
    await expect(activeHeading(page)).toHaveText('Which adjudication statute applies?');
  }
  // What the card says of the case is the step's own stored sentence that names it, word for word.
  const marathon = at('hearing').locator('.fc-art-item', {
    has: page.locator('.fc-art-title', { hasText: 'Marathon Oil' }),
  });
  await act(marathon.locator('[data-fc-art]'));
  await expect(marathon.locator('.fc-art-said')).toHaveText(
    'Marathon Oil read an opportunity for public hearing on individualized discharge permits to entail formal adjudication.',
  );
  // By the keyboard too: Enter on the drawing shows the card, Escape shuts the card and not the chart.
  const keyed = at('state').locator('.fc-art-item').first();
  if (!tap) {
    await keyed.locator('[data-fc-art]').focus();
    await page.keyboard.press('Enter');
    await expect(keyed.locator('[data-fc-art]')).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(keyed.locator('[data-fc-art]')).toHaveAttribute('aria-expanded', 'false');
    await expect(dialog).toBeVisible();
  }
  await act(keyed.locator('[data-fc-art]'));
  const card = keyed.locator('.fc-art-open');
  const href = await card.getAttribute('href');
  await act(card);
  await expect(page).toHaveURL(routeFor(href));
  await expect(dialog).toBeHidden();
  await page.goBack();
  await expect(dialog).toBeVisible();
  await expect(activeHeading(page)).toHaveText('Which adjudication statute applies?');
}

/* Fitted to the window, the chart's words are too small to read: every step is listed in the room the
   chart leaves, beside it on a wide window, with its number and its words in full. */
async function fitted(page, tap) {
  const dialog = courseDialog(page);
  const act = (target) => (tap ? target.tap() : target.click());
  await page.goto(routeFor('#flowchart=LRS-15'));
  await act(dialog.locator('[data-flowcharts-view="map"]'));
  await expect(dialog.locator('.fc-index')).toBeHidden();
  await act(dialog.locator('[data-flowcharts-zoom="fit"]'));
  const rows = dialog.locator('.fc-index [data-fc-row]');
  await expect(rows).toHaveCount(23);
  await expect(rows.first()).toBeVisible();
  const state = await dialog.locator('.fc-map').evaluate((map) => {
    const scroll = map.querySelector('.fc-map-scroll').getBoundingClientRect();
    const index = map.querySelector('.fc-index').getBoundingClientRect();
    return {
      beside: index.left >= scroll.right - 1,
      below: index.top >= scroll.bottom - 1,
      cut: [...map.querySelectorAll('.fc-index-q')].filter((q) => q.scrollWidth > q.clientWidth + 1).length,
      labels: [...map.querySelectorAll('.fc-overview .fc-over')].every((label) => {
        const at = label.getBoundingClientRect();
        return !at.width || (at.left >= scroll.left - 1 && at.right <= scroll.right + 1);
      }),
    };
  });
  assert.equal(state.beside, !tap, 'on a wide window the steps are listed beside the fitted chart');
  assert.equal(state.below, !!tap, 'on a phone they are listed under it');
  assert.equal(state.cut, 0, 'no step in the list is cut short');
  assert.ok(state.labels, "the first fork's answers are whole beside the fitted chart");
  // Selecting a step in the overview goes into the detailed map there, at full size, with that step
  // in view and ringed; the reader's own step is not changed.
  const before = await activeHeading(page).textContent();
  await act(rows.nth(0).locator('button'));
  await expect(dialog.locator('.fc-zoom-value')).toHaveText('100%');
  await expect(dialog.locator('.fc-index')).toBeHidden();
  await expect(dialog.locator('[data-fc-cell="start"].fc-looked')).toBeInViewport();
  await expect(activeHeading(page)).toHaveText(before);
}

/* The map on a phone (390 px): one scroll, named destinations, joins in words, a way back to the
   branch come from; the three outcomes of step 19 can be compared without leaving the fork. */
async function phoneMap(page) {
  const dialog = courseDialog(page);
  await page.goto(routeFor('#flowchart=LRS-15&step=order'));
  await dialog.locator('[data-flowcharts-view="map"]').tap();
  const line = (id) => dialog.locator(`.fc-outline [data-fc-line="${id}"]`);
  await expect(dialog.locator('.fc-map-scroll')).toBeHidden();
  await expect(line('order')).toHaveAttribute('aria-current', 'step');
  await expect(line('order')).toBeInViewport();
  // Each of step 14's four answers names where it leads; pressing one goes there, and there says
  // which answer brought you and offers the way back.
  await expect(line('order').locator('.fc-line-exit .fc-destination')).toHaveText([
    '→ 16 Use the formal adjudication process',
    '→ 15 What does hearing mean in this statute?',
    '→ 17 Apply the applicable informal or special procedure',
    '→ 3 Find the governing state or local procedure',
  ]);
  await line('order').locator('.fc-line-exit').first().tap();
  await expect(activeHeading(page)).toHaveText('Use the formal adjudication process');
  await expect(line('orderhearing')).toBeInViewport();
  await expect(line('orderhearing').locator('.fc-line-from')).toHaveText(
    /^2 routes meet here, from\s*14\s*15$/,
  );
  await expect(line('orderhearing').locator('.fc-line-came')).toHaveText(
    /Back to step 14.*You chose “Federal statute requires a record hearing”/s,
  );
  await line('orderhearing').locator('.fc-line-came [data-flowcharts-back]').tap();
  await expect(activeHeading(page)).toHaveText('Which adjudication statute applies?');
  await expect(line('order')).toBeInViewport();
  // A join in words, each number a way to that branch.
  await expect(line('interest').locator('.fc-line-from button')).toHaveText(['3', '5', '13', '16', '17']);
  // Step 19: the three outcomes, each under its condition with its cases, on one screen.
  await line('interest').locator('.fc-line-from button').nth(3).tap();
  await expect(activeHeading(page)).toHaveText('Use the formal adjudication process');
  await line('orderhearing').locator('.fc-line-exit').tap();
  await line('interest').locator('.fc-line-exit').first().tap();
  await expect(activeHeading(page)).toHaveText('What procedures and timing does due process require?');
  for (const outcome of ['goldberg', 'loudermill', 'mathews']) {
    await expect(line(outcome).locator('.fc-node-heading')).toBeInViewport({ ratio: 1 });
    await expect(line(outcome).locator('.fc-art-name').first()).toBeInViewport({ ratio: 1 });
  }
  await assertFits(page, line('balance'));
  await capture(page, 'flagship-phone-map-step19');
}

try {
  const desktop = await open({ width: 1440, height: 900 });
  const { page } = desktop;
  const dialog = courseDialog(page);
  await page.locator('#moreBtn').click();
  // The menu is the Library since v3.2: Flowcharts is one of its collections, with its count beside it.
  const collections = page.getByRole('group', { name: 'Collections' });
  const menuItem = page.locator('#moreMenu [data-flowcharts-menu]');
  await expect(menuItem.locator('.v32-row-label')).toHaveText('Flowcharts');
  // the count says what it counts (docs/DESIGN.md rule 8): "115 flowcharts · 975 steps"
  await expect(menuItem.locator('.v32-row-meta')).toHaveText(/^\d+ flowcharts · [\d,]+ steps$/);
  assert.equal(
    await collections.locator('[data-flowcharts-menu]').count(),
    1,
    'Flowcharts appears among the collections',
  );
  await menuItem.click();
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(routeFor('#flowcharts'));
  await capture(page, 'library-desktop');

  const search = dialog.locator('input[data-flowcharts-search]');
  await dialog.locator('[data-flowcharts-course="K"]').click();
  await expect(dialog.locator('[data-flowchart-id^="CP-"]')).toHaveCount(0);
  await search.fill('2-207');
  const battle = dialog.locator('[data-flowchart-id="K-16"]');
  await expect(battle).toBeVisible();
  await expect(dialog.locator('[data-flowchart-id="K-03"]')).toHaveCount(0);
  await battle.click();
  await expect(page).toHaveURL(routeFor('#flowchart=K-16'));

  await dialog.locator('[data-flowcharts-view="walkthrough"]').click();
  await expect(activeHeading(page)).toHaveText('Is the transaction governed by Article 2?');
  await branch(page, 'b').click();
  await expect(activeHeading(page)).toHaveText('Do the writings establish an agreement?');
  const dorton = page.locator('dialog#dklaFlowcharts .fc-side a[data-flowchart-source][href="#node=dorton"]'); // v3.1: sources sit beside the step;
  await expect(dorton).toHaveText(/Dorton/);
  await dorton.click();
  await expect(page).toHaveURL(routeFor('#node=dorton'));
  await expect(dialog).toBeHidden();
  await expect(
    page
      .getByRole('heading', { name: /Dorton/ })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await page.goBack();
  // The address follows the step being shown.
  await expect(page).toHaveURL(routeFor('#flowchart=K-16&step=b'));
  await expect(dialog).toBeVisible();
  await expect(activeHeading(page)).toHaveText('Do the writings establish an agreement?');

  await branch(page, 'c').click();
  await expect(activeHeading(page)).toHaveText('Did the offeror assent or did both sides perform?');
  await dialog.locator('.fc-walk-controls [data-flowcharts-back]').click();
  await expect(activeHeading(page)).toHaveText('Do the writings establish an agreement?');
  await dialog.locator('[data-flowcharts-view="map"]').click();
  await expect(graphNode(page, 'a')).toBeVisible();
  await expect(graphNode(page, 'k')).toBeVisible();
  const connectors = await dialog
    .locator('svg path[marker-end], svg line[marker-end], svg polyline[marker-end]')
    .count();
  assert.ok(connectors >= 10, 'the overview draws directional connectors for the Contract branches');
  await graphNode(page, 'g').click();
  await expect(activeHeading(page)).toContainText(/different|conflicting/i);
  await assertFits(page, dialog);
  await capture(page, 'chart-desktop');
  await verifyZoom(dialog);

  await dialog.locator('[data-flowcharts-view="walkthrough"]').click();
  await page.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset.testPrint = 'called';
    };
  });
  await dialog.locator('[data-flowcharts-print]').click();
  await expect(page.locator('html')).toHaveAttribute('data-test-print', 'called');
  await page.emulateMedia({ media: 'print' });
  await expect(dialog.locator('.fc-map')).toBeVisible();
  const printNotes = dialog.locator('.fc-print-notes');
  await expect(printNotes).toBeVisible();
  await expect(
    printNotes.getByRole('heading', { name: '1. Is the transaction governed by Article 2?' }),
  ).toBeVisible();
  await expect(
    printNotes.getByRole('heading', { name: '11. No contract shown through this sequence' }),
  ).toBeVisible();
  await expect(printNotes.getByText('Mutual recognition by conduct → 8')).toBeVisible();
  const pdf = await page.pdf({
    ...(output && { path: path.join(output, 'chart-print.pdf') }),
    format: 'Letter',
  });
  assert.ok(pdf.length > 10_000, 'chart print view generates a populated PDF');
  await page.emulateMedia({ media: 'screen' });
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(routeFor(''));
  await trip(page, '#flowchart=LRS-15', false);
  await trip(page, '#flowchart=LRS-15&step=order', false);
  await drawings(page, false);
  await fitted(page, false);
  await decidingSentences(page);
  assert.deepEqual(desktop.errors, []);
  await desktop.context.close();

  const mobile = await open({ width: 390, height: 844 }, '#flowchart=CP-02');
  const phone = mobile.page;
  const phoneDialog = courseDialog(phone);
  await expect(phoneDialog).toBeVisible();
  await expect(activeHeading(phone)).toHaveText('What supplies jurisdiction over this defendant?');
  await assertFits(phone, branch(phone, '2'));
  await capture(phone, 'chart-phone');
  await branch(phone, '2').tap();
  await expect(activeHeading(phone)).toHaveText('Consent or forfeiture?');
  await branch(phone, '9').tap();
  await expect(activeHeading(phone)).toHaveText('Personal jurisdiction available');
  await expect(phone.locator('#flowchartDetail [data-flowchart-branch]')).toHaveCount(0);
  await phoneDialog.locator('[data-flowcharts-reset]').tap();
  await expect(activeHeading(phone)).toHaveText('What supplies jurisdiction over this defendant?');
  await branch(phone, '11').tap();
  await expect(activeHeading(phone)).toHaveText(
    'Does the applicable statute or rule authorize jurisdiction?',
  );
  await branch(phone, '10').tap();
  await expect(activeHeading(phone)).toHaveText('This jurisdictional theory fails');
  await phoneDialog.locator('[data-flowcharts-reset]').tap();
  await phoneDialog.locator('[data-flowcharts-view="map"]').tap();
  await expect(graphNode(phone, '1')).toBeVisible();
  await assertFits(phone, phoneDialog);
  await capture(phone, 'map-phone');

  await phone.goto(routeFor('#flowchart=CP-34'));
  await expect(activeHeading(phone)).toHaveText('Did the parties agree to arbitrate?');
  await phoneDialog.locator('#flowchartDetail a[href="#flowchart=K-10"]').tap();
  await expect(phone).toHaveURL(routeFor('#flowchart=K-10'));
  await phone.goBack();
  await expect(activeHeading(phone)).toHaveText('Did the parties agree to arbitrate?');

  await phone.goto(routeFor('#flowchart=LRS-15'));
  await expect(activeHeading(phone)).toHaveText('Does the action prescribe a rule or decide a case?');
  const authority = phone.locator('#flowchartDetail a[href="https://uscode.house.gov/us/usc/t5/s551/"]');
  await expect(authority).toBeVisible();
  if (output) {
    await phoneDialog.locator('[data-flowcharts-view="map"]').tap();
    await capture(phone, 'flagship-map-phone');
    await phoneDialog.locator('[data-flowcharts-zoom="fit"]').tap();
    await capture(phone, 'flagship-fit-phone');
    await phone.pdf({ path: path.join(output, 'flagship-print.pdf'), format: 'Letter' });
  }
  await phone.goto(routeFor('#flowchart=CP-35'));
  for (const id of ['3', '4', '8', '1']) await branch(phone, id).tap();
  await expect(activeHeading(phone)).toHaveText('Identify the elements, trial burdens and requested ruling');
  await phoneDialog.locator('.fc-walk-controls [data-flowcharts-back]').tap();
  await expect(activeHeading(phone)).toHaveText('Defer, deny or permit discovery under Rule 56(d)');

  const graphSizes = await phone.evaluate(() =>
    JSON.parse(document.getElementById('dklaFlowchartsData').textContent).map(({ id, title, nodes }) => ({
      id,
      title,
      nodes: nodes.length,
      arrows: nodes.reduce((sum, node) => sum + node.edges.length, 0),
    })),
  );
  // On a phone the map is one list read downwards. On every chart: each step is there once, each
  // answer is there once, and it names the step the data says it leads to (or has that outcome
  // directly under it).
  for (const chart of graphSizes) {
    await phone.goto(routeFor('#flowchart=' + chart.id), { waitUntil: 'commit' });
    await expect(phoneDialog.locator('#flowchartsTitle')).toHaveText(chart.title);
    const listed = await phone.evaluate(() => {
      const dialog = document.querySelector('dialog#dklaFlowcharts');
      const data = JSON.parse(document.getElementById('dklaFlowchartsData').textContent).find(
        (one) => one.id === dialog.dataset.printChart,
      );
      const number = new Map(data.nodes.map((node, i) => [node.id, i + 1]));
      const label = new Map(data.nodes.map((node) => [node.id, node.label]));
      const faults = [];
      const lines = [...dialog.querySelectorAll('.fc-outline [data-fc-line]')].map(
        (line) => line.dataset.fcLine,
      );
      if (lines.length !== data.nodes.length || new Set(lines).size !== lines.length)
        faults.push(`${lines.length} lines for ${data.nodes.length} steps`);
      let answers = 0;
      for (const node of data.nodes)
        node.edges.forEach((edge, index) => {
          answers += 1;
          const exits = dialog.querySelectorAll(
            `.fc-outline .fc-line-exit[data-fc-from="${CSS.escape(node.id)}"][data-fc-map-branch="${index}"]`,
          );
          if (exits.length !== 1)
            return faults.push(`${node.id} answer ${index + 1}: ${exits.length} in the list`);
          const exit = exits[0];
          if (exit.querySelector('.fc-answer').textContent !== edge.label)
            faults.push(`${node.id}: answer words`);
          const cue = exit.querySelector('.fc-destination')?.textContent;
          const under = exit.nextElementSibling?.dataset.fcLine;
          if (cue ? cue !== `→ ${number.get(edge.to)} ${label.get(edge.to)}` : under !== edge.to)
            faults.push(`${node.id} answer ${index + 1} does not name ${edge.to}`);
        });
      return { answers, faults };
    });
    assert.equal(listed.answers, chart.arrows, chart.id + ' answers in the phone map');
    assert.deepEqual(listed.faults, [], `${chart.id}: the phone map names every answer's step`);
  }
  await trip(phone, '#flowchart=LRS-15', true);
  await trip(phone, '#flowchart=LRS-15&step=order&from=lrs-o-hearing-trigger', true);
  await drawings(phone, true);
  await phoneMap(phone);
  assert.deepEqual(mobile.errors, []);
  await mobile.context.close();

  // The wired map (wider windows): on every chart, every answer reaches the step the data names.
  const wide = await open({ width: 1440, height: 900 }, '#flowcharts');
  let answers = 0;
  for (const chart of graphSizes) {
    await wide.page.goto(routeFor('#flowchart=' + chart.id), { waitUntil: 'commit' });
    await expect(courseDialog(wide.page).locator('#flowchartsTitle')).toHaveText(chart.title);
    const drawn = await wide.page.evaluate(reach);
    assert.equal(drawn.cells, chart.nodes, chart.id + ' steps on the whole map');
    assert.equal(drawn.answers, chart.arrows, chart.id + ' answers');
    assert.equal(drawn.wires, chart.arrows, chart.id + ' wires');
    assert.deepEqual(drawn.faults, [], `${chart.id}: every answer reaches its step`);
    answers += drawn.answers;
  }
  assert.deepEqual(wide.errors, []);
  await wide.context.close();
  console.log(
    `Desktop and 390px chart navigation, source and related links, history, print passed; on ${graphSizes.length} charts every one of ${answers} answers reaches the step the data names.`,
  );
} finally {
  await browser.close();
}
