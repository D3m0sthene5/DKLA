import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const url = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
const browser = await chromium.launch();
const question = 'How did International Shoe change Pennoyer?';
const response = {
  paragraphs: [
    {
      text: 'Pennoyer centered personal jurisdiction on territorial power. International Shoe shifted the inquiry to the defendant’s minimum contacts with the forum and whether exercising jurisdiction accords with fair play and substantial justice.',
      citations: [1, 2],
    },
  ],
  sources: [
    { type: 'node', id: 'cp-pennoyer', title: 'Pennoyer v. Neff (1878)', category: 'Case' },
    { type: 'node', id: 'shoe', title: 'International Shoe Co. v. Washington (1945)', category: 'Case' },
  ],
};

try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const phone = viewport.width === 390;
    const context = await browser.newContext({
      viewport,
      isMobile: phone,
      hasTouch: phone,
      serviceWorkers: 'block',
    });
    let asked = 0;
    await context.route('**/*', async (route) => {
      const target = new URL(route.request().url());
      if (
        target.origin !== url.origin ||
        (target.pathname.startsWith('/api/') && target.pathname !== '/api/ask')
      )
        return route.fulfill({ status: 204 });
      if (target.pathname !== '/api/ask') return route.continue();
      asked++;
      const request = route.request();
      assert.equal(request.method(), 'POST');
      const payload = request.postDataJSON();
      assert.deepEqual(Object.keys(payload), ['question']);
      if (payload.question === question) return route.fulfill({ json: response });
      if (payload.question === 'A question outside the Atlas')
        return route.fulfill({ json: { paragraphs: [], sources: [] } });
      return route.fulfill({ status: 503, json: { error: 'not-configured' } });
    });
    await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
    const page = await context.newPage();
    await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
    const search = page.locator('#search');
    async function enterSearch(value) {
      await search.focus();
      await page.keyboard.press('ControlOrMeta+A');
      if (value) await page.keyboard.insertText(value);
      else await page.keyboard.press('Backspace');
    }
    await enterSearch('International Shoe');
    await page.locator('#searchResults [data-search-id="shoe"]').waitFor();
    await search.press('Enter');
    await expect(page.locator('#inspector')).toContainText('International Shoe');
    assert.equal(asked, 0, 'Normal search must not send a paid request');

    await enterSearch(question);
    await page.getByRole('button', { name: /Ask DKLA.*AI answer/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Ask DKLA' });
    await expect(dialog.getByRole('status')).toHaveText('Answer ready.');
    assert.equal(asked, 1);
    await expect(dialog).toContainText('minimum contacts');
    await expect(dialog.locator('.ask-citation')).toHaveCount(2);
    const box = await dialog.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= viewport.width + 1);
    if (process.env.DKLA_ASK_SCREENSHOTS) {
      await mkdir(process.env.DKLA_ASK_SCREENSHOTS, { recursive: true });
      await page.screenshot({ path: `${process.env.DKLA_ASK_SCREENSHOTS}/ask-${viewport.width}.png` });
    }
    await dialog.locator('.ask-citation').first().click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('#inspector')).toContainText('Pennoyer v. Neff');

    await enterSearch('');
    await page.getByRole('button', { name: /Ask DKLA.*AI answer/ }).click();
    const input = dialog.getByLabel('Your question');
    await expect(input).toBeFocused();
    await input.fill('A question outside the Atlas');
    await input.press('Enter');
    await expect(dialog.getByRole('status')).toContainText('couldn’t find enough');
    await input.fill('Why is the model unavailable?');
    await input.press('Enter');
    await expect(dialog.getByRole('status')).toContainText('unavailable here');
    await context.setOffline(true);
    await input.fill('Can I ask while offline?');
    await input.press('Enter');
    await expect(dialog.getByRole('status')).toContainText('needs an internet connection');
    assert.equal(asked, 3);
    await input.press('Escape');
    await expect(dialog).toBeHidden();
    await context.close();
  }
  console.log('Ask DKLA desktop and phone flow passed with a mocked model response.');
} finally {
  await browser.close();
}
