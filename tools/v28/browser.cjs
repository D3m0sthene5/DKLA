/* Real PDF rendering and multi-timeline regression, using synthetic local sessions. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('@playwright/test');
const url = process.argv[2];
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(url).hostname));
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.DKLA_CHROME ||
      (process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : undefined),
  });
  try {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
      await context.route('**/*', (route) => {
        const target = new URL(route.request().url());
        return target.origin !== new URL(url).origin || target.pathname.startsWith('/api/')
          ? route.fulfill({ status: 204, body: '' })
          : route.continue();
      });
      await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      console.log('START ' + viewport.width);
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(url + '#node=cp-walker', { waitUntil: 'domcontentloaded', timeout: 90000 });
      console.log('LOADED ' + viewport.width);
      await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90000 });
      for (const title of [
        'Erie: which law a federal court applies',
        'Federal Rules and statutes against state law',
      ]) {
        const region = page.getByRole('region', { name: title, exact: true });
        assert.match(await region.innerText(), /Ragan/);
        assert.match(await region.innerText(), /Walker/);
      }
      console.log('OPEN source ' + viewport.width);
      await page.getByRole('button', { name: 'Original source', exact: true }).click();
      await page.locator('#fileDialog [data-pdf-rendered="260"]').waitFor({ timeout: 60000 });
      assert.equal(await page.locator('#fileDialog canvas').count(), 1);
      assert.doesNotMatch(await page.locator('#fileDialog').innerText(), /not beside|not on this computer/i);
      await page.getByRole('button', { name: 'Next page', exact: true }).click();
      await page.locator('#fileDialog [data-pdf-rendered="261"]').waitFor({ timeout: 60000 });
      const sample = await page.locator('#fileDialog canvas').evaluate((canvas) => {
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let ink = 0;
        for (let i = 0; i < pixels.length; i += 64) if (pixels[i] < 100) ink++;
        return ink / (pixels.length / 64);
      });
      assert.ok(sample > 0.001, 'Source page must contain rendered ink');
      await page.getByRole('button', { name: 'Zoom in source', exact: true }).click();
      await page.locator('#fileDialog [data-pdf-rendered]').waitFor({ timeout: 60000 });
      assert.ok(await page.locator('#fileDialog canvas').evaluate((c) => c.width > 0));
      fs.mkdirSync('work/v28', { recursive: true });
      await page.screenshot({ path: `work/v28/walker-source-${viewport.width}.png` });
      await page.getByRole('button', { name: '← Back', exact: true }).click();
      for (const [id, expected] of [
        ['bayliner', '50'],
        ['lrs-o-ashbacker', '1'],
      ]) {
        await page.evaluate((id) => {
          location.hash = 'node=' + id;
        }, id);
        console.log('OPEN source ' + viewport.width);
        await page.getByRole('button', { name: 'Original source', exact: true }).click();
        await page.locator('#fileDialog [data-pdf-rendered]').waitFor({ timeout: 60000 });
        const pageNumber = await page.locator('#fileDialog .file-pdf-page').getAttribute('data-pdf-rendered');
        assert.ok(Number(pageNumber) > 0, expected);
        await page.getByRole('button', { name: '← Back', exact: true }).click();
      }
      await page.evaluate(() => DKLATimelines.open('erie-rules'));
      const source = page
        .locator('#r21Body li')
        .filter({ hasText: 'Walker' })
        .last()
        .getByRole('button', { name: 'Read original source ↗', exact: true });
      await source.click();
      try {
        await page.locator('#fileDialog [data-pdf-rendered]').waitFor({ timeout: 12000 });
      } catch (error) {
        console.log(
          'TIMELINE SOURCE FAILURE',
          await page.locator('#fileDialog').evaluate((el) => ({ open: el.open, html: el.innerHTML })),
        );
        await page.screenshot({ path: 'work/v28/timeline-source-failure.png' });
        throw error;
      }
      await page.getByRole('button', { name: '← Back', exact: true }).click();
      for (let c = 0; c < 3; c++) {
        await page.evaluate((c) => DKLATimelines.open('course-chronology-' + c), c);
        const count = await page.locator('#r21Body .r21-v > li').count();
        assert.ok(count > 100, 'Every course chronology must include the complete case inventory');
        assert.equal(
          await page.locator('#r21Body .r28-step-source').count(),
          count,
          'Every chronology case must have an original PDF source',
        );
      }
      assert.deepEqual(errors, []);
      console.log(
        'PASS original PDF rendering, source navigation, Walker/Ragan, and all three complete chronologies at ' +
          viewport.width +
          'px',
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
