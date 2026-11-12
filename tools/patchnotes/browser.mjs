/* Patch notes (src/features/patchnotes): the last item of the ☰ menu opens a dialog listing every version
   from v3.0 back to v9, newest first; choosing a version shows its notes; Escape closes it.

     node tools/patchnotes/browser.mjs http://127.0.0.1:8766/DKLA-v3.0.html */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const url = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'local preview only');
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    serviceWorkers: 'block',
  });
  await context.route('**/*', (route) => {
    const u = new URL(route.request().url());
    return u.origin !== url.origin || u.pathname.startsWith('/api/')
      ? route.fulfill({ status: 204, body: '' })
      : route.continue();
  });
  await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
  await page.locator('#moreBtn').click();
  const item = page.locator('#moreMenu [data-dkla-patch]');
  await item.waitFor();
  assert.equal(
    await page.evaluate(() => document.getElementById('moreMenu').lastElementChild?.textContent.trim()),
    'Patch notes',
    'Patch notes is the last item of the menu',
  );
  await item.click();
  const dialog = page.locator('#patchNotesDialog[open]');
  await dialog.waitFor();
  const names = await page.locator('#patchNotesDialog [data-pn] b').allTextContents();
  assert.equal(names[0], 'v3.0', 'newest first');
  assert.equal(names[names.length - 1], 'v9', 'back to the oldest surviving record');
  assert.match(await page.locator('#patchNotesDialog .pn-page').innerText(), /The Opossum Update/);
  await page.locator('#patchNotesDialog [data-pn]', { hasText: 'v19' }).first().click();
  const v19 = await page.locator('#patchNotesDialog .pn-page').innerText();
  assert.match(v19, /v19\.19/, 'point releases are listed under their version');
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'no sideways scrolling',
  );
  await page.keyboard.press('Escape');
  await page.locator('#patchNotesDialog[open]').waitFor({ state: 'detached' });
  assert.deepEqual(errors, []);
  console.log(`Patch notes: ${names.length} versions, v3.0 to v9, in the menu, closes with Escape.`);
} finally {
  await browser.close();
}
