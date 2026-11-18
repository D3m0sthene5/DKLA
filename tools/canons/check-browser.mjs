import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const url = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'local preview only');
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      serviceWorkers: 'block',
      hasTouch: width === 390,
    });
    await context.route('**/*', (route) => {
      const request = new URL(route.request().url());
      return request.origin === url.origin && !request.pathname.startsWith('/api/')
        ? route.continue()
        : route.fulfill({ status: 204 });
    });
    await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
    const page = await context.newPage();
    const loaded = async (hash = '') => {
      await page.goto(new URL(hash, url).href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90_000 });
    };
    const dialog = page.locator('#dklaCanons');
    await loaded();
    await page.locator('#moreBtn').click();
    await page.locator('[data-canons-menu]').click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-canons-query]')).toBeVisible();
    await dialog.locator('[data-canons-query]').fill('noscitur');
    await dialog.locator('a[href="#canon=noscitur-a-sociis"]').click();
    await expect(dialog.locator('#dklaCanonTitle')).toHaveText(/noscitur a sociis/i);
    await expect(dialog.getByRole('heading', { name: 'In the course' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'When to use it' })).toBeVisible();
    const source = dialog.locator('.canon-evidence a').first();
    const node = await source.getAttribute('href');
    assert.match(node, /^#node=/);
    await source.click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(new URL(node, url).href);
    await expect(page.locator('#inspector .canons-related a[href="#canon=noscitur-a-sociis"]')).toBeVisible();
    await page.goBack();
    await expect(dialog).toBeVisible();
    await loaded('#canon=rule-of-lenity');
    await expect(dialog.locator('#dklaCanonTitle')).toContainText(/lenity/i);
    const fit = await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 2);
    assert.ok(fit, 'the index stays within the viewport');
    await loaded('#lecture=lrs-13:1');
    const lecture = page.locator('#modal');
    await expect(lecture).toBeVisible();
    const point = lecture.locator('#lecture-lrs-13-1');
    await expect(point).toContainText(/Presidential authority/i);
    await expect(point).toContainText(/Slides /);
    await point.locator('a[href="#flowchart=LRS-13"]').click();
    await expect(page.locator('#dklaFlowcharts')).toBeVisible();
    await expect(page.locator('#dklaFlowcharts .lecture-related')).toContainText(/Presidential authority/i);
    await page.goBack();
    await expect(lecture).toBeVisible();
    await expect(point).toBeVisible();
    await context.close();
  }
  console.log(
    'Canon menu, search, definitions, sourced case links, Back and direct links work at both widths.',
  );
} finally {
  await browser.close();
}
