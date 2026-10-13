/* Disposable local-browser lifecycle and complete portable-export verification. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto');
const address = process.argv[2] || 'http://127.0.0.1:8770/DKLA-v2.6.html',
  base = new URL(address);
if (!['127.0.0.1', 'localhost'].includes(base.hostname)) throw Error('Loopback only');
const out = path.resolve(process.argv[3] || '../startup-performance');
fs.mkdirSync(out, { recursive: true });
const canonical = fs.readFileSync('work/build/DKLA-v2.6.html', 'utf8');
const full = canonical.match(/<script type="application\/json" id="dklaR19Full">([\s\S]*?)<\/script>/)[1];
const texts = JSON.parse(full),
  sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const report = { checks: [], errors: [], briefRequests: [] };
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.DKLA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true });
    await context.route('**/*', (r) => {
      const u = new URL(r.request().url());
      return u.origin !== base.origin || u.pathname.startsWith('/api/')
        ? r.fulfill({ status: 204, body: '' })
        : r.continue();
    });
    await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
    const page = await context.newPage();
    page.on('pageerror', (e) => report.errors.push('hosted: ' + e.stack));
    page.on('request', (r) => {
      if (r.url().includes('/assets/briefs/')) report.briefRequests.push(r.url());
    });
    await page.goto(address, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90000 });
    await page.waitForTimeout(900);
    assert.equal(report.briefRequests.length, 0);
    report.checks.push('No full-brief request during startup');
    const fixture = await page.evaluate(() => {
      const d = DKLABriefs.data;
      return {
        main: Object.entries(d.map)[0],
        fallback: d.entries.find((e) => !d.sections[e[0]])?.[0],
        other: Object.values(d.map)[1],
      };
    });
    await page.evaluate((id) => LegalAtlas.navigate('node', id), fixture.main[0]);
    const detail = page
      .locator('#inspector details.r19-full')
      .filter({ has: page.locator('[data-r19-fill]') });
    await detail.locator('summary').click();
    await detail.locator('[data-done="1"]').waitFor();
    assert.equal(report.briefRequests.length, 1);
    assert.equal(await page.evaluate((id) => DKLABriefs.text(id), fixture.main[1]), texts[fixture.main[1]]);
    report.checks.push('Main reader demand-loads byte-identical brief');
    if (fixture.fallback) {
      await page.evaluate((id) => DKLABriefs.open(undefined, id), fixture.fallback);
      await page.locator('#r19Body [data-done="1"]').waitFor();
      await page.evaluate(() => document.getElementById('r19Dialog').close());
      report.checks.push('Supporting case without sections loads its full brief');
    }
    await page.evaluate((id) => DKLAColdCall.open(id), fixture.main[0]);
    await page.locator('#coldCallDialog .cc-actions [data-cc-source-brief]').click();
    await page.locator('#ccBriefDialog .cc-brief-body[data-done="1"]').waitFor();
    await page.locator('#ccBriefClose').click();
    assert.ok(await page.locator('#coldCallDialog').isVisible());
    await page.locator('#ccClose').click();
    report.checks.push('Cold Call nested source and return preserved');
    // A reload clears JS memory while retaining Cache Storage. Then disable network.
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.locator('html.dkla-boot-ready').waitFor({ timeout: 90000 });
    await context.setOffline(true);
    assert.equal(await page.evaluate((id) => DKLABriefs.text(id), fixture.main[1]), texts[fixture.main[1]]);
    await page.evaluate((id) => DKLABriefs.open(undefined, id), fixture.other);
    const retryDetail = page
      .locator('#r19Body details.r19-full')
      .filter({ has: page.locator('[data-r19-fill]') });
    await retryDetail.locator('summary').click();
    await retryDetail.getByText('Retry full brief', { exact: true }).waitFor();
    await context.setOffline(false);
    await retryDetail.getByText('Retry full brief', { exact: true }).click();
    await retryDetail.locator('[data-done="1"]').waitFor();
    await page.evaluate(() => document.getElementById('r19Dialog').close());
    await page.waitForFunction(() => document.getElementById('r19Body').innerHTML === '');
    report.checks.push('Fresh-session cached offline reading and uncached retry pass');
    // Network-delayed source is closed before completion; the detached body must stay detached.
    const unseen = await page.evaluate(() => Object.values(DKLABriefs.data.map)[2]);
    const hash = await page.evaluate(
      (id) => JSON.parse(document.getElementById('dklaBriefManifest').textContent).records[id],
      unseen,
    );
    let release;
    const gate = new Promise((r) => (release = r));
    await context.route('**/' + hash + '.json', async (r) => {
      await gate;
      await r.continue();
    });
    await page.evaluate((id) => DKLABriefs.open(undefined, id), unseen);
    await page.locator('#r19Body details.r19-full summary').first().click();
    await page.locator('#r19Body').getByText('Loading full brief…').waitFor();
    await page.evaluate(() => document.getElementById('r19Dialog').close());
    release();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('#r19Body').innerHTML(), '');
    report.checks.push('Closing a pending reader cannot repaint closed content');
    await page.evaluate(() => {
      data.nodes[0].summary += ' SYNTHETIC-PORTABLE-TEST';
    });
    await page.locator('#saveBtn').click();
    const downloadPromise = page.waitForEvent('download', { timeout: 90000 });
    await page.locator('#portableSave').click();
    const download = await downloadPromise;
    const file = path.join(out, 'portable.html');
    await download.saveAs(file);
    const saved = fs.readFileSync(file, 'utf8');
    assert.ok(saved.includes('SYNTHETIC-PORTABLE-TEST'));
    assert.equal(sha(saved.match(/<script[^>]*id="dklaR19Full"[^>]*>([\s\S]*?)<\/script>/)[1]), sha(full));
    const blobHash = await page.evaluate(async () => {
      const blob = await DKLA.portableBlob();
      const text = await blob.text();
      const raw = text.match(/<script[^>]*id="dklaR19Full"[^>]*>([\s\S]*?)<\/script>/)[1];
      return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)))]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    });
    assert.equal(blobHash, sha(full));
    report.checks.push(
      'UI/exportHTML and direct portableBlob include exact complete aggregate and current edits',
    );
    const portable = await browser.newContext({ serviceWorkers: 'block' });
    await portable.route('http**/*', (r) => r.abort());
    const local = await portable.newPage();
    local.on('pageerror', (e) => report.errors.push('portable: ' + e.stack));
    await local.goto(require('node:url').pathToFileURL(file).href, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await local.locator('html.dkla-boot-ready').waitFor({ timeout: 90000 });
    assert.equal(await local.evaluate((id) => DKLABriefs.text(id), unseen), texts[unseen]);
    report.checks.push(
      'Saved file:// portable copy boots and reads previously unrequested brief without network',
    );
    const nextDownload = local.waitForEvent('download', { timeout: 90000 });
    await local.evaluate(() => LegalAtlas.exportHTML());
    const second = await nextDownload;
    const secondFile = path.join(out, 'portable-second-generation.html');
    await second.saveAs(secondFile);
    const secondRaw = fs.readFileSync(secondFile, 'utf8');
    assert.ok(secondRaw.includes('SYNTHETIC-PORTABLE-TEST'));
    assert.equal(
      sha(secondRaw.match(/<script[^>]*id="dklaR19Full"[^>]*>([\s\S]*?)<\/script>/)[1]),
      sha(full),
    );
    await local.goto(require('node:url').pathToFileURL(secondFile).href, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await local.locator('html.dkla-boot-ready').waitFor({ timeout: 90000 });
    assert.equal(await local.evaluate((id) => DKLABriefs.text(id), unseen), texts[unseen]);
    report.checks.push(
      'Second-generation portable export/reopen preserves exact corpus, current edits and error-free boot',
    );
    await portable.close();
    await context.close();
    assert.deepEqual(report.errors, []);
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, 'browser-report.json'), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
