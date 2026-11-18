/* How heavy and how fast a fresh visit to the hosted atlas is.

     node tools/performance/measure-load.mjs http://127.0.0.1:8781/DKLA-v3.1.html [--runs 2] [--no-proxy]
                                              [--only throttled|unthrottled] [--latency 40] [--json out.json]

   Reports:
   - the hosted page's size, raw and gzip-compressed (level 6, as a typical server would send it);
   - for a fresh visit (new browser profile, no cache, no offline worker): the bytes transferred up to the
     moment the atlas is shown (html.dkla-boot-ready), the time to that moment, and the bytes transferred
     once the background prefetch of lazy data blocks has finished;
   - each under two conditions: throttled (Chromium's own throttling over the DevTools protocol:
     Network.emulateNetworkConditions at 10 Mbps down, 5 Mbps up and --latency ms round trip, and
     Emulation.setCPUThrottlingRate 4, i.e. a processor four times slower) and unthrottled.

   The local preview (tools/preview.mjs) sends files uncompressed, while the site's host compresses text.
   So for a loopback address this tool puts a small compressing proxy in front of it (gzip level 6 for
   HTML, JSON, JavaScript, CSS and SVG) and measures through that; --no-proxy measures the address as it
   answers. Requests to /api/ are blocked, so nothing is recorded anywhere.

   The numbers depend on this machine. Compare runs made on the same machine, one after another. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import { chromium } from '@playwright/test';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at < 0 ? fallback : argv[at + 1];
};
const target = new URL(argv.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8781/DKLA-v3.1.html');
const runs = Number(flag('--runs', 1));
const latency = Number(flag('--latency', 40));
const only = flag('--only', '');
const loopback = ['127.0.0.1', 'localhost'].includes(target.hostname);
const useProxy = loopback && !argv.includes('--no-proxy');
const gzip = promisify(zlib.gzip);
const MB = (n) => (n / 1e6).toFixed(2) + ' MB';

// A compressing proxy in front of the local preview.
const squeezable = /text\/|json|javascript|svg|manifest/;
const memo = new Map();
async function startProxy(upstream) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, upstream);
    if (url.pathname.startsWith('/api/')) return void res.writeHead(503).end();
    try {
      if (!memo.has(url.href))
        memo.set(
          url.href,
          (async () => {
            const response = await fetch(url, { redirect: 'manual' });
            const body = Buffer.from(await response.arrayBuffer());
            const type = response.headers.get('content-type') || '';
            return {
              status: response.status,
              type,
              location: response.headers.get('location'),
              body,
              gz: squeezable.test(type) && body.length > 1024 ? await gzip(body, { level: 6 }) : null,
            };
          })(),
        );
      const file = await memo.get(url.href);
      const headers = { 'cache-control': 'no-store' };
      if (file.type) headers['content-type'] = file.type;
      if (file.location) headers.location = file.location;
      const wantsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
      const payload = file.gz && wantsGzip ? file.gz : file.body;
      if (payload === file.gz) headers['content-encoding'] = 'gzip';
      headers['content-length'] = payload.length;
      res.writeHead(file.status, headers);
      res.end(req.method === 'HEAD' ? undefined : payload);
    } catch (error) {
      res.writeHead(502).end(String(error));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}

async function visit(browser, address, throttled) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: 'block',
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem('dkla.guide.v1', 'seen');
    } catch {
      /* private window */
    }
    new MutationObserver((_, watch) => {
      if (document.documentElement?.classList.contains('dkla-boot-ready')) {
        window.__readyAt = performance.now();
        watch.disconnect();
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.setBlockedURLs', { urls: ['*/api/*'] });
  if (throttled) {
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency,
      downloadThroughput: (10e6 / 8) | 0,
      uploadThroughput: (5e6 / 8) | 0,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  const requests = new Map();
  let total = 0,
    data = 0,
    page0 = 0;
  cdp.on('Network.requestWillBeSent', (e) => requests.set(e.requestId, e.request.url));
  cdp.on('Network.loadingFinished', (e) => {
    const url = requests.get(e.requestId) || '';
    total += e.encodedDataLength;
    if (url.includes('/assets/data/')) data += e.encodedDataLength;
    if (url === address) page0 += e.encodedDataLength;
  });
  // The page reads the running total when the curtain lifts.
  let readyBytes = null;
  const waitReady = page
    .waitForFunction(() => window.__readyAt !== undefined, null, { timeout: 300000, polling: 50 })
    .then(() => (readyBytes = total));
  const began = Date.now();
  await page.goto(address, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await waitReady;
  const readyAt = await page.evaluate(() => window.__readyAt);
  // Then the background prefetch, when the page has lazy blocks: until every block has arrived (or 60 s).
  const lazy = await page.evaluate(() => window.DKLAData?.ids?.() || []);
  let prefetched = null;
  if (lazy.length) {
    const t0 = Date.now();
    await page
      .waitForFunction((ids) => ids.every((id) => DKLAData.loaded(id)), lazy, {
        timeout: 60000,
        polling: 200,
      })
      .catch(() => {});
    await page.waitForTimeout(500);
    prefetched = {
      seconds: (Date.now() - t0) / 1000,
      allLoaded: await page.evaluate((ids) => ids.every((id) => DKLAData.loaded(id)), lazy),
    };
  }
  const result = {
    throttled,
    readySeconds: +(readyAt / 1000).toFixed(2),
    bytesToReady: readyBytes,
    htmlBytesTransferred: page0,
    bytesAfterPrefetch: total,
    dataFileBytes: data,
    lazyBlocks: lazy,
    prefetch: prefetched,
    wallSeconds: (Date.now() - began) / 1000,
  };
  await context.close();
  return result;
}

const proxy = useProxy ? await startProxy(target) : null;
const address = proxy
  ? new URL(target.pathname, `http://127.0.0.1:${proxy.address().port}`).href
  : target.href;
try {
  const raw = Buffer.from(await (await fetch(target)).arrayBuffer());
  assert.ok(raw.length > 0, 'the page answered');
  const html = { rawBytes: raw.length, gzipBytes: (await gzip(raw, { level: 6 })).length };
  console.log(`hosted page: ${MB(html.rawBytes)} raw, ${MB(html.gzipBytes)} gzip`);
  const browser = await chromium.launch();
  const report = { address: target.href, proxied: useProxy, latencyMs: latency, html, visits: [] };
  try {
    if (proxy) await visit(browser, address, false); // warm the proxy's compression memo; not reported
    for (const throttled of [true, false]) {
      if (only && only !== (throttled ? 'throttled' : 'unthrottled')) continue;
      for (let i = 0; i < runs; i++) {
        const r = await visit(browser, address, throttled);
        report.visits.push(r);
        console.log(
          `${throttled ? 'throttled (10 Mbps, ' + latency + ' ms, CPU 4x)' : 'unthrottled'} run ${i + 1}: ready in ${r.readySeconds} s; ` +
            `${MB(r.bytesToReady)} transferred to ready (page ${MB(r.htmlBytesTransferred)}); ` +
            `${MB(r.bytesAfterPrefetch)} after prefetch (data files ${MB(r.dataFileBytes)}` +
            (r.prefetch
              ? `, all ${r.lazyBlocks.length} lazy block(s) in ${r.prefetch.allLoaded ? 'yes' : 'NO'}`
              : '') +
            ')',
        );
      }
    }
  } finally {
    await browser.close();
  }
  const out = flag('--json', '');
  if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  else console.log(JSON.stringify(report));
} finally {
  proxy?.close();
}
