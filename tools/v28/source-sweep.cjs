/* Exhaustive original-source rendering audit. Local preview only; no live APIs.
   Optional reference JSON contains independent rasterizer dark-pixel fractions.
   Writes evidence to work/, never edits source records or grants review status. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const url = process.argv[2];
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(url).hostname));
const registry = JSON.parse(fs.readFileSync('tools/v28/source-links.json'));
const reference = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3])) : {};
const docs = new Map();
for (const links of Object.values(registry))
  for (const source of links)
    if (source.path) {
      if (!docs.has(source.path)) docs.set(source.path, new Set());
      docs.get(source.path).add(source.page);
    }
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.DKLA_CHROME ||
      (process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : undefined),
  });
  const report = { documents: [], failures: [], networkFailures: [], warnings: [], pages: 0 };
  const save = () => {
    fs.mkdirSync('work/v28-repair', { recursive: true });
    fs.writeFileSync('work/v28-repair/source-sweep.json', JSON.stringify(report, null, 2));
  };
  try {
    const pending = [...docs];
    async function checkDocuments() {
      while (pending.length) {
        const [path, pageSet] = pending.shift();
        const context = await browser.newContext({
          viewport: { width: 1000, height: 900 },
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
        page.on('response', (r) => {
          if (r.status() >= 400) report.networkFailures.push({ path, url: r.url(), status: r.status() });
        });
        page.on('console', (m) => {
          if (m.type() === 'warning' || m.type() === 'error') report.warnings.push({ path, text: m.text() });
        });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.waitForFunction(() => window.LegalAtlas?.openFile && window.LegalAtlas?.ready);
        const document = { path, pages: [] };
        report.documents.push(document);
        for (const number of [...pageSet].sort((a, b) => a - b)) {
          try {
            await page.evaluate(({ path, number }) => LegalAtlas.openFile(path, number), { path, number });
            await page.waitForFunction(
              (number) =>
                document.querySelector('#fileDialog [data-pdf-rendered]')?.dataset.pdfRendered ===
                  String(number) || document.querySelector('#fileDialog .file-notice'),
              number,
              { timeout: 90000 },
            );
            const result = await page.locator('#fileDialog').evaluate((dialog) => {
              const canvas = dialog.querySelector('canvas');
              if (!canvas) return { error: dialog.innerText };
              const small = document.createElement('canvas');
              small.width = 220;
              small.height = Math.round((220 * canvas.height) / canvas.width);
              const ctx = small.getContext('2d', { willReadFrequently: true });
              ctx.drawImage(canvas, 0, 0, small.width, small.height);
              const px = ctx.getImageData(0, 0, small.width, small.height).data;
              let dark = 0;
              for (let i = 0; i < px.length; i += 4)
                if (px[i] < 120 && px[i + 1] < 120 && px[i + 2] < 120) dark++;
              return { darkFraction: dark / (px.length / 4) };
            });
            const ref = reference[path]?.pages.find((p) => p.page === number)?.darkFraction;
            document.pages.push({ page: number, ...result, referenceDarkFraction: ref });
            assert.ok(!result.error, result.error);
            assert.ok(result.darkFraction > 0.0005, 'No readable dark page content');
            if (ref > 0.002)
              assert.ok(result.darkFraction / ref > 0.55, 'Most reference page content is missing');
          } catch (e) {
            report.failures.push({ path, page: number, error: String(e) });
          }
          report.pages++;
          if (report.pages % 100 === 0) {
            console.log('Pages checked:', report.pages);
            save();
          }
        }
        console.log(path, document.pages.length, '/', pageSet.size);
        await context.close();
        save();
      }
    }
    await Promise.all(Array.from({ length: 3 }, () => checkDocuments()));
  } finally {
    await browser.close();
    save();
  }
  console.log(
    JSON.stringify({
      documents: report.documents.length,
      pages: report.pages,
      failures: report.failures.length,
      networkFailures: report.networkFailures.length,
    }),
  );
  assert.equal(report.failures.length, 0, 'Original pages failed; inspect work/v28-repair/source-sweep.json');
  assert.equal(report.networkFailures.length, 0, 'Source or decoder requests failed');
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
