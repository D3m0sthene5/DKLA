/* Patch notes (src/features/patchnotes): the last of the links in the Library's footer opens a dialog
   listing every version from v3.1 back to v9, newest first; choosing a version shows its notes; Escape
   closes it.

     node tools/patchnotes/browser.mjs http://127.0.0.1:8766/DKLA-v3.1.html */
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
  // Since v3.2 the menu is the Library, a dialog of four short groups that fits the window (owner: the
  // long list was unusable). Patch notes is the last of the footer's own links (it is about the atlas,
  // not a tool for studying), with the version beside it.
  await page.waitForFunction(() => !document.getElementById('libraryDialog').getAnimations().length);
  const last = await page.evaluate(() => {
    const link = [...document.querySelectorAll('#moreMenu .v32-lib-foot button.v32-quiet')].pop();
    return [link?.firstChild?.textContent.trim(), link?.querySelector('.v32-quiet-meta')?.textContent.trim()];
  });
  assert.deepEqual(last, ['Patch notes', 'v3.1'], "Patch notes is the last of the Library footer's links");
  const panel = await page.evaluate(() => {
    const dialog = document.getElementById('libraryDialog'),
      m = document.getElementById('moreMenu'),
      r = dialog.getBoundingClientRect();
    return {
      columns: [...m.querySelectorAll('.v32-lib-group')].map((c) => c.getAttribute('aria-label')),
      fits:
        r.top >= 0 &&
        r.bottom <= innerHeight &&
        r.left >= 0 &&
        dialog.scrollHeight <= dialog.clientHeight + 1,
      saves: [...m.querySelectorAll('button')].filter((b) => /save/i.test(b.textContent)).length,
      drills: m.querySelectorAll('[data-r18-open="drill"]').length,
    };
  });
  assert.deepEqual(panel.columns, ['Collections', 'Classes', 'Study', 'Yours']);
  assert.ok(panel.fits, 'the Library fits the window without scrolling');
  assert.equal(panel.saves, 1, 'one save entry');
  assert.equal(panel.drills, 1, 'one drill entry');
  await item.click();
  const dialog = page.locator('#patchNotesDialog[open]');
  await dialog.waitFor();
  const names = await page.locator('#patchNotesDialog [data-pn] b').allTextContents();
  assert.equal(names[0], 'v3.1', 'newest first');
  assert.equal(names[names.length - 1], 'v9', 'back to the oldest surviving record');
  assert.match(await page.locator('#patchNotesDialog .pn-page').innerText(), /The Reading Room Update/);
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
  console.log(
    `Library: four groups that fit the window. Patch notes: ${names.length} versions, v3.1 to v9, closes with Escape.`,
  );
} finally {
  await browser.close();
}
