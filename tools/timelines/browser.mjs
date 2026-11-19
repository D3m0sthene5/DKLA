/* Exercise every timeline, with real source data and no visitor requests. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
const url = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
const browser = await chromium.launch();
await fs.mkdir('work/timelines', { recursive: true });
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    await context.route('**/*', (route) => {
      const target = new URL(route.request().url());
      return target.origin !== url.origin || target.pathname.startsWith('/api/')
        ? route.fulfill({ status: 204 })
        : route.continue();
    });
    await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90000 });
    const inventory = await page.evaluate(() =>
      [...DKLABriefs.data.chronologies, ...DKLATimelines.list()].map((t) => ({
        id: t.id,
        question: t.question,
        guide: t.guide,
        now: t.now,
        count: t.steps.length,
      })),
    );
    assert.equal(inventory.length, 99);
    for (const t of inventory) {
      await page.evaluate((id) => DKLATimelines.open(id), t.id);
      const state = await page.locator('#r21Body').evaluate((el) => ({
        question: el.querySelector('.r21-q')?.textContent,
        guide: el.querySelector('.r31-guide > p')?.textContent,
        takeaway: el.querySelector('.r25-timeline-synthesis')?.textContent,
        count: el.querySelectorAll('.r21-v > li').length,
        clipped: [...el.querySelectorAll('.r31-entry')].some(
          (e) => e.getBoundingClientRect().right > el.getBoundingClientRect().right + 1,
        ),
        font: parseFloat(getComputedStyle(el.querySelector('.r31-core')).fontSize),
        invalidButtons: !!el.querySelector('button button, button a, summary button'),
      }));
      assert.equal(state.question, t.question, t.id + ' question is visible');
      assert.equal(state.guide, t.guide, t.id + ' orientation is visible');
      assert.ok(state.takeaway.startsWith(t.now), t.id + ' takeaway is visible');
      assert.equal(state.count, t.count, t.id + ' no step omitted');
      assert.equal(state.clipped, false, t.id + ' no horizontal clipping');
      assert.ok(state.font >= 15, t.id + ' readable core text');
      assert.equal(state.invalidButtons, false, t.id + ' no nested controls');
    }
    await page.evaluate(() => DKLATimelines.open('consideration'));
    await expect(page.locator('.r21-v > li').first().locator('.r21-y')).toBeInViewport();
    const rail = await page
      .locator('.r21-v > li')
      .first()
      .evaluate((el) => getComputedStyle(el, '::before').width);
    assert.equal(rail, '2px', 'milestones have a continuous rail');
    await page.screenshot({ path: `work/timelines/reader-${viewport.width}.png` });
    await page.locator('.r31-guide > summary').press('Enter');
    await expect(page.locator('.r31-guide > p')).toBeVisible();
    await page.locator('.r31-guide > summary').press('Enter');
    await page.locator('[data-r31-sequence]').click();
    await expect(page.locator('.r31-sequence-head')).toBeInViewport();
    await page.screenshot({ path: `work/timelines/entries-${viewport.width}.png` });
    await page.locator('[data-r31-top]').click();
    assert.equal(await page.locator('#r21Body').evaluate((el) => el.scrollTop), 0);
    await page.locator('[data-r21-back]').click();
    const search = page.locator('[data-r31-find]');
    await search.fill('Mattei');
    assert.ok((await page.locator('.r21-card:visible').count()) > 0);
    await search.fill('zzzzz-no-topic');
    await expect(page.locator('.r21-card:visible')).toHaveCount(0);
    await expect(page.locator('.r31-result-count')).toContainText('No timelines match');
    await search.fill('');
    await page.screenshot({ path: `work/timelines/browse-${viewport.width}.png` });
    await page.evaluate(() => DKLATimelines.open('course-chronology-1'));
    await page.locator('[data-r31-cases]').fill('Semtek');
    await expect(page.locator('.r21-v > li:visible')).toHaveCount(1);
    await expect(page.locator('.r21-v > li:visible')).toContainText('Semtek');
    await page.locator('[data-r31-cases]').fill('');
    await expect(page.locator('.r21-v > li:visible')).toHaveCount(592);
    await page.evaluate(() => DKLATimelines.open('erie-rules'));
    const sources = page.locator('.r31-evidence').filter({ has: page.locator('a[href*="usrep487022.pdf"]') });
    await expect(sources).not.toHaveAttribute('open', '');
    await sources.locator('summary').click();
    await expect(sources.locator('a[href*="usrep487022.pdf"]')).toBeVisible();
    await expect(page.locator('time[datetime="2001-02-27"]')).toHaveCount(1);
    await sources.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `work/timelines/sources-${viewport.width}.png` });
    await page.locator('[data-r21-close]').click();
    await page.evaluate(() => {
      location.hash = 'node=hamer';
    });
    const preview = page.locator('#inspector .dkla-timeline[data-r21="consideration"]');
    // v3.2: the timeline is a facet of the case page. Its tab counts the entries; opening it shows an
    // axis of every entry, then the entries as rows (all of them when they fit, else this entry and its
    // neighbours, with the count on the way to the full timeline).
    const entries = Number(await preview.getAttribute('data-v32-count'));
    await expect(page.locator('#inspector .v32-tabs [data-v32-tab="timeline"]')).toHaveText(
      new RegExp('^Timeline\\s*' + entries + '$'),
    );
    await page.locator('#inspector .v32-tabs [data-v32-tab="timeline"]').click();
    await preview.waitFor();
    await expect(preview.locator('.v31-axis .v31-dot')).toHaveCount(entries);
    await expect(preview.locator('.v31-axis .v31-dot.v31-here')).toHaveCount(1);
    const sequence = preview.locator('.v31-tl-rows');
    await expect(sequence.locator('.v31-tl-step').first()).toBeVisible();
    await expect(sequence.locator('li')).toHaveCount(entries <= 12 ? entries : 7);
    await expect(sequence.locator('[aria-current="step"]')).toContainText('Hamer');
    assert.equal(await sequence.evaluate((e) => e.scrollWidth > e.clientWidth + 1), false);
    await preview.locator('[data-r21-open]').click();
    await expect(page.locator('#r21Timelines')).toHaveAttribute('open', '');
    assert.deepEqual(errors, []);
    console.log(
      `PASS all99 timelines, complete step counts, orientation, search, expandable evidence and case previews at ${viewport.width}px`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
