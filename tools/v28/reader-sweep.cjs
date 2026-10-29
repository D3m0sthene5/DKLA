/* Every case account, through its real reader. Local preview only. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
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
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: 'block',
  });
  await context.route('**/*', (route) => {
    const u = new URL(route.request().url());
    return u.origin !== new URL(url).origin || u.pathname.startsWith('/api/')
      ? route.fulfill({ status: 204, body: '' })
      : route.continue();
  });
  await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const report = { cases: [], failures: [], errors };
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => LegalAtlas?.ready && window.DKLABriefs);
    const entries = await page.evaluate(() => DKLABriefs.data.entries);
    for (const e of entries) {
      const result = await page.evaluate(async (e) => {
        const [bid, , , , , , id] = e;
        for (const d of document.querySelectorAll('dialog[open]')) d.close();
        if (id) location.hash = 'node=' + id;
        else DKLABriefs.open(e[2], bid);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const body = document.querySelector(id ? '#inspector .reader-body' : '#r19Body');
        const sections = DKLABriefs.data.sections[bid]?.sections;
        const normal = (s) => s.replace(/\s+/g, ' ').trim();
        const findings = [];
        if (!body) return { bid, id, error: 'Reader missing' };
        if (sections) {
          const rows = [...body.querySelectorAll(id ? '.case-box > section' : ':scope > .r19-sec')];
          for (const [name, expected] of Object.entries(sections)) {
            const row = rows.find((x) => x.querySelector('h3')?.textContent === name);
            const actual = row ? [...row.querySelectorAll('p')].map((p) => p.textContent).join(' ') : '';
            if (normal(actual) !== normal(expected)) findings.push(name + ': missing or changed prose');
          }
        }
        const sources = body.querySelectorAll('.r28-original-sources [data-dkla-file]');
        if (!sources.length) findings.push('Original source controls missing');
        return {
          bid,
          id,
          sections: sections ? Object.keys(sections).length : 0,
          sources: sources.length,
          findings,
        };
      }, e);
      report.cases.push(result);
      if (result.error || result.findings.length) report.failures.push(result);
      if (report.cases.length % 100 === 0) console.log('Readers checked', report.cases.length);
    }
    // The translated Swiss assigned account is a map case without a separate canonical brief.
    await page.evaluate(() => {
      for (const d of document.querySelectorAll('dialog[open]')) d.close();
      location.hash = 'node=swiss-2024';
    });
    await page.waitForTimeout(100);
    const swiss = await page.locator('#inspector').evaluate((el) => ({
      id: 'swiss-2024',
      sources: el.querySelectorAll('[data-dkla-file]').length,
      headerSource: !!el.querySelector('[data-v28-source]'),
      text: el.innerText.slice(0, 250),
    }));
    report.swiss = swiss;
    assert.ok(swiss.sources > 0);
    fs.mkdirSync('work/v28-repair', { recursive: true });
    fs.writeFileSync('work/v28-repair/reader-sweep.json', JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify({ cases: report.cases.length, failures: report.failures.length, swiss, errors }),
    );
    assert.equal(report.failures.length, 0);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
