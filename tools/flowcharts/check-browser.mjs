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
  await expect(page).toHaveURL(routeFor('#flowchart=K-16'));
  await expect(dialog).toBeVisible();
  await expect(activeHeading(page)).toHaveText('Do the writings establish an agreement?');

  await branch(page, 'c').click();
  await expect(activeHeading(page)).toHaveText('Did the offeror assent or did both sides perform?');
  await dialog.locator('[data-flowcharts-back]').click();
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
  await verifyZoom(phoneDialog);

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
  await phoneDialog.locator('[data-flowcharts-back]').tap();
  await expect(activeHeading(phone)).toHaveText('Defer, deny or permit discovery under Rule 56(d)');

  const graphSizes = await phone.evaluate(() =>
    JSON.parse(document.getElementById('dklaFlowchartsData').textContent).map(({ id, title, nodes }) => ({
      id,
      title,
      nodes: nodes.length,
      arrows: nodes.reduce((sum, node) => sum + node.edges.length, 0),
    })),
  );
  for (const chart of graphSizes) {
    await phone.goto(routeFor('#flowchart=' + chart.id), { waitUntil: 'commit' });
    await expect(phoneDialog.locator('#flowchartsTitle')).toHaveText(chart.title);
    assert.equal(
      await phoneDialog.locator('[data-fc-cell]').count(),
      chart.nodes,
      chart.id + ' overview nodes',
    );
    // Every answer has its wire. A wire ends in an arrow on the step it leads to, or, where paths
    // meet, on the bar over that step, which carries the arrow for all of them.
    const drawn = await phoneDialog.locator('.fc-map').evaluate((map) => {
      const wires = [...map.querySelectorAll('.fc-wire')];
      const joined = wires.filter((wire) => wire.hasAttribute('data-fc-joined'));
      const bars = new Set(
        [...map.querySelectorAll('.fc-join')]
          .filter((join) => join.querySelector('path[marker-end]'))
          .map((join) => join.dataset.fcTo),
      );
      return {
        wires: wires.length,
        ended: wires.filter((wire) => wire.hasAttribute('marker-end')).length + joined.length,
        unmet: joined.filter((wire) => !bars.has(wire.dataset.fcTo)).length,
      };
    });
    assert.equal(drawn.wires, chart.arrows, chart.id + ' overview wires');
    assert.equal(drawn.ended, chart.arrows, chart.id + ' overview arrows');
    assert.equal(drawn.unmet, 0, chart.id + ': every wire that ends on a bar has a bar with an arrow');
  }
  assert.deepEqual(mobile.errors, []);
  await mobile.context.close();
  console.log(
    'Desktop and 390px chart navigation, source and related links, history, print, and every overview passed.',
  );
} finally {
  await browser.close();
}
