import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const url = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
const browser = await chromium.launch();
const question = 'How did International Shoe change Pennoyer?';
const rankingQuestion = 'Is Iqbal one of the five most cited cases ever?';
const rankingUrl =
  'https://heinonline.com/blog/2018/09/most-cited-u-s-supreme-court-cases-in-heinonline-part-iii/';
const countUrl = 'https://www.californialawreview.org/print/iqbal-evolution';
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
const rankingResponse = {
  paragraphs: [
    {
      text: 'Yes, in a published ranking of U.S. Supreme Court opinions by citations from other cases. HeinOnline placed Iqbal fifth in September 2018, with 108,107 citing decisions.',
      citations: [2, 2],
    },
    {
      text: 'The Atlas entry explains Iqbal’s importance to federal pleading. A March 2026 Westlaw count found 383,631 citing cases. Its current rank depends on the database and the opinions counted.',
      citations: [1, 3],
    },
  ],
  sources: [
    { type: 'node', id: 'cp-iqbal', title: 'Ashcroft v. Iqbal (2009)', category: 'Case' },
    { type: 'web', id: 'ranking', title: 'HeinOnline citation ranking', url: rankingUrl },
    { type: 'web', id: 'count', title: 'Iqbal & the Evolution of Procedural Scholarship', url: countUrl },
  ],
  search: 'searched',
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
    let finishCanceledRequest;
    const canceledRequest = new Promise((resolve) => {
      finishCanceledRequest = resolve;
    });
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
      if (payload.question === rankingQuestion) return route.fulfill({ json: rankingResponse });
      if (payload.question === 'Can unsafe citations appear?')
        return route.fulfill({
          json: {
            ...rankingResponse,
            sources: [
              rankingResponse.sources[0],
              { type: 'web', id: 'unsafe', title: 'Unsafe source', url: 'javascript:void(0)' },
              rankingResponse.sources[2],
            ],
          },
        });
      if (payload.question === 'A question outside the Atlas')
        return route.fulfill({ json: { paragraphs: [], sources: [], search: 'searched' } });
      if (payload.question === 'Can the Atlas answer on its own?')
        return route.fulfill({ json: { ...response, search: 'unavailable' } });
      if (payload.question === 'Can I cancel research?') {
        await canceledRequest;
        return route.abort();
      }
      return route.fulfill({ status: 503, json: { error: 'not-configured' } });
    });
    await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
    const page = await context.newPage();
    await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
    const search = page.locator('#search');
    // Dottie Docket appears once at a time, in the pose that matches the state.
    const mascot = (pose) => page.locator(`#dklaAskDialog .ask-dottie[data-pose="${pose}"]`);
    async function expectOnlyDottie(pose) {
      await expect(page.locator('#dklaAskDialog .ask-dottie')).toHaveCount(1);
      await expect(mascot(pose)).toHaveCount(1);
      await expect(mascot(pose)).toHaveAttribute('aria-hidden', 'true');
    }
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
    await expect(page.locator('#searchResults .ask-search .ask-launch-face svg')).toHaveCount(1);
    await page.getByRole('button', { name: /Ask Dottie.*AI answer/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Ask Dottie' });
    await expect(dialog.getByRole('status')).toHaveText('Answer ready.');
    assert.equal(asked, 1);
    // The signature moment: one joey per cited source, rising once the sources are in view.
    const carrier = dialog.locator('.ask-sources-heading .ask-dottie[data-pose="carrying"]');
    await expectOnlyDottie('carrying');
    await expect(carrier.locator('.dottie-joey')).toHaveCount(2);
    await expect(dialog.locator('.ask-sources-heading')).toHaveText('Sources');
    await carrier.scrollIntoViewIfNeeded();
    await expect(carrier).toHaveClass(/is-peeking/);
    await expect(dialog).toContainText('minimum contacts');
    await expect(dialog.locator('.ask-citation')).toHaveCount(2);
    await dialog.locator('.ask-citation').first().click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('#inspector')).toContainText('Pennoyer v. Neff');

    await enterSearch('');
    await page.getByRole('button', { name: /Ask Dottie.*AI answer/ }).click();
    const input = dialog.getByLabel('Your question');
    await expect(input).toBeFocused();
    await expectOnlyDottie('curious');
    await dialog.getByRole('button', { name: rankingQuestion }).click();
    await expect(input).toHaveValue(rankingQuestion);
    await expect(input).toBeFocused();
    await input.press('Enter');
    await expect(dialog.getByRole('status')).toHaveText('Answer ready. Web search completed.');
    await expect(dialog).toContainText('HeinOnline placed Iqbal fifth');
    await expect(dialog.locator('.ask-citation')).toHaveText(['2', '1', '3']);
    await expect(dialog.locator('.ask-origin')).toHaveText(['Atlas', 'Web', 'Web']);
    await expect(dialog.locator('.ask-sources li')).toHaveCount(3);
    await expect(carrier.locator('.dottie-joey')).toHaveCount(3);
    const rankingLink = dialog.locator('a.ask-citation').first();
    await expect(rankingLink).toHaveAttribute('href', rankingUrl);
    await expect(rankingLink).toHaveAttribute('target', '_blank');
    await expect(rankingLink).toHaveAttribute('rel', 'noopener noreferrer');
    const box = await dialog.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= viewport.width + 1);
    if (process.env.DKLA_ASK_SCREENSHOTS) {
      await mkdir(process.env.DKLA_ASK_SCREENSHOTS, { recursive: true });
      await page.screenshot({ path: `${process.env.DKLA_ASK_SCREENSHOTS}/ask-${viewport.width}.png` });
    }

    await input.fill('Can unsafe citations appear?');
    await input.press('Enter');
    await expect(dialog.getByRole('status')).toHaveText('Answer ready. Web search completed.');
    await expect(dialog.locator('.ask-citation')).toHaveText(['1', '3']);
    await expect(dialog.locator('.ask-sources li').last()).toHaveAttribute('value', '3');
    await expect(dialog.getByRole('link', { name: /unsafe source/i })).toHaveCount(0);

    await input.fill('A question outside the Atlas');
    await input.press('Enter');
    await expect(dialog.getByRole('status')).toContainText('did not establish an answer');
    await expectOnlyDottie('quiet');
    await input.fill('Can the Atlas answer on its own?');
    await input.press('Enter');
    await expect(dialog.getByRole('status')).toContainText('Web search was unavailable');
    await expect(dialog).toContainText('minimum contacts');

    await input.fill('Can I cancel research?');
    await input.press('Enter');
    await expect.poll(() => asked).toBe(6);
    await expect(dialog.getByRole('status')).toHaveText('Looking for relevant sources…');
    await expectOnlyDottie('reading');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    finishCanceledRequest();
    await expect(dialog.getByRole('status')).toHaveText('Search canceled.');
    await expect(dialog.locator('.ask-dottie')).toHaveCount(0);
    await expect(input).toBeFocused();

    await input.fill('Why is the model unavailable?');
    await input.press('Enter');
    await expect(dialog.getByRole('status')).toContainText('unavailable here');
    await expectOnlyDottie('possum');
    await context.setOffline(true);
    await input.fill('Can I ask while offline?');
    await input.press('Enter');
    await expect(dialog.getByRole('status')).toContainText('needs an internet connection');
    await expectOnlyDottie('possum');
    assert.equal(asked, 7);
    // With reduced motion she appears in place, without the rise.
    await context.setOffline(false);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await input.fill(question);
    await input.press('Enter');
    await expect(carrier).toHaveCount(1);
    assert.equal(await carrier.locator('svg').evaluate((svg) => getComputedStyle(svg).translate), '0px');
    assert.equal(
      await carrier.locator('svg').evaluate((svg) => getComputedStyle(svg).transitionDuration),
      '0s',
    );
    assert.equal(asked, 8);
    await input.press('Escape');
    await expect(dialog).toBeHidden();
    await context.close();
  }
  console.log('Ask DKLA desktop and phone flow passed with a mocked model response.');
} finally {
  await browser.close();
}
