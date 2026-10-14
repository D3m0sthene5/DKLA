/* Records which functions run while a browser check drives a page.

   Uses Chromium's own JavaScript coverage through Playwright
   (page.coverage). It is off unless DKLA_COVERAGE_DIR is set, which
   `pnpm coverage` does; a normal `pnpm verify` is not slowed or changed.

     const coverage = require('../verify/coverage/collect.cjs');
     await coverage.start(page);          before the page loads
     await coverage.stop(page, 'name');   when the check has finished with it

   Each page's raw record is written to DKLA_COVERAGE_DIR; tools/verify/
   coverage/report.mjs joins them. Script text is stored once per distinct
   script, since every page loads the same forty or so. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const dir = process.env.DKLA_COVERAGE_DIR;
let serial = 0;

async function start(page) {
  if (!dir) return;
  // Keep counting across reloads: the saved-work check reloads on purpose.
  await page.coverage.startJSCoverage({ resetOnNavigation: false, reportAnonymousScripts: false });
}
async function stop(page, name) {
  if (!dir) return;
  const entries = await page.coverage.stopJSCoverage();
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  const record = [];
  for (const entry of entries) {
    if (!entry.source) continue;
    const hash = createHash('sha256').update(entry.source).digest('hex').slice(0, 24);
    const file = path.join(dir, 'scripts', hash + '.js');
    if (!fs.existsSync(file)) fs.writeFileSync(file, entry.source);
    record.push({ url: entry.url, script: hash, functions: entry.functions });
  }
  const safe = String(name).replace(/[^\w.-]+/g, '-');
  fs.writeFileSync(path.join(dir, `${safe}-${process.pid}-${serial++}.json`), JSON.stringify(record));
}
module.exports = { start, stop, enabled: !!dir };
