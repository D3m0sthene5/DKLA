/* How DKLA feels: a repeatable measurement of start-up, the map, the reader, search, dialogs, background
   work and idle cost. It measures; it changes nothing in the app.

     node tools/feel/measure.mjs http://127.0.0.1:8791/DKLA-v3.1.html
          [--runs 3] [--profiles desktop,desktop-4x,ipad,ipad-4x] [--only startup,warm,background,map,case,reader,search,dialogs,idle,styles]
          [--attribute] [--out work/feel/result.json] [--label before]

   Profiles: desktop is 1440x900 with a mouse; ipad is 1180x820 with touch; -4x adds Chromium's CPU
   throttling (Emulation.setCPUThrottlingRate 4). Each run is a fresh browser profile. Numbers in the JSON
   and the table are medians over the runs. --attribute adds one extra desktop run with the CPU profiler on
   and maps the time to source files (slower, so it is kept out of the timed runs).

   Local preview only; /api/ and other origins are answered empty, so nothing is recorded anywhere. One
   browser at a time. Numbers depend on this machine: compare runs made here, one after another.
   Columns of the printed table: evt→paint is the browser's Event Timing (input to the next painted frame);
   result is input to the first frame drawn with the expected content; 1stMove is input to the first frame in
   which the map camera or scroll position moved; maxFrame, >20ms and >50ms describe the gaps between frames
   while the interaction ran; upd/s is how many times a second the camera or scroll position changed; script
   and layouts are totals for the interaction; forced is layout forced inside script; shift is layout shift
   not caused by the input; settle is when the watched part of the page last changed. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at < 0 ? fallback : argv[at + 1];
};
const target = new URL(argv.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8791/DKLA-v3.1.html');
assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname), 'local preview only');
const RUNS = Number(flag('--runs', 3));
const ALL = ['startup', 'warm', 'background', 'map', 'case', 'reader', 'search', 'dialogs', 'idle', 'styles'];
const only = new Set((flag('--only', ALL.join(',')) || '').split(','));
const KEY = new Set(['startup', 'map', 'case', 'reader', 'search']); // repeated on the iPad profile
const PROFILES = {
  desktop: { viewport: { width: 1440, height: 900 }, touch: false, cpu: 1 },
  'desktop-4x': { viewport: { width: 1440, height: 900 }, touch: false, cpu: 4 },
  ipad: { viewport: { width: 1180, height: 820 }, touch: true, cpu: 1 },
  'ipad-4x': { viewport: { width: 1180, height: 820 }, touch: true, cpu: 4 },
};
const profiles = (flag('--profiles', 'desktop,desktop-4x,ipad,ipad-4x') || '')
  .split(',')
  .filter((p) => PROFILES[p]);
const attribute = argv.includes('--attribute');
const outFile = path.resolve(
  root,
  flag('--out', 'work/feel/result' + (flag('--label') ? '-' + flag('--label') : '') + '.json'),
);
const instrument = fs.readFileSync(path.join(here, 'instrument.js'), 'utf8').trim().replace(/;$/, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.error('[feel]', ...a);

/* ---------- where a line of the built page came from ---------- */
const html = await (await fetch(target)).text();
const blocks = []; // every inline <script>: {id, line (1-based, of its first character), start, end}
{
  const lineAt = [];
  let line = 1;
  for (let i = 0, next = 0; ; ) {
    next = html.indexOf('\n', i);
    lineAt.push(i);
    if (next < 0) break;
    i = next + 1;
    line++;
  }
  const lineOf = (pos) => {
    let lo = 0,
      hi = lineAt.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineAt[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  const tag = /<script\b([^>]*)>/g;
  for (let m; (m = tag.exec(html)); ) {
    const start = m.index + m[0].length,
      end = html.indexOf('</script>', start);
    const type = /type="([^"]*)"/.exec(m[1])?.[1] || '';
    const id = /\bid="([^"]*)"/.exec(m[1])?.[1] || '';
    tag.lastIndex = end;
    if (/json|octet/.test(type)) continue;
    const text = html.slice(start, end);
    const parts = []; // feature files inside the bundle
    const marker = /\/\* ===== (\S+) ===== \*\//g;
    for (let k; (k = marker.exec(text)); )
      parts.push({ file: k[1], line: lineOf(start + k.index), pos: k.index });
    blocks.push({ id, line: lineOf(start), endLine: lineOf(end), text, parts });
  }
}
const runtimeFile = (id) =>
  fs.existsSync(path.join(root, 'src/runtime', id + '.js')) ? 'src/runtime/' + id + '.js' : null;
function fileOfLine(line, withLine = false) {
  const b = blocks.find((b) => line >= b.line && line <= b.endLine);
  if (!b) return 'page line ' + line;
  const part = [...b.parts].reverse().find((p) => line >= p.line);
  const file = part
    ? part.file
    : runtimeFile(b.id) || (b.id ? '<script id=' + b.id + '>' : 'inline script at line ' + b.line);
  // The line in the source file (within a line or two: the build adds a marker line before each feature file).
  return withLine ? file + ':~' + (part ? line - part.line : line - b.line + 1) : file;
}
// A long-animation-frame script gives only a function name and a character position inside its own script
// block. Find the block(s) where a function with that name starts at that position.
function locate(fn, pos) {
  if (!pos || pos < 0) return null;
  const found = [];
  for (const b of blocks) {
    if (pos >= b.text.length) continue;
    const at = b.text.slice(Math.max(0, pos - 80), pos + 60);
    const head = b.text.slice(pos, pos + 40);
    const named =
      fn && new RegExp('(function\\s+|\\b)' + fn.replace(/[^\w$]/g, '') + '\\s*(=|\\(|:)').test(at);
    const starts = /^(async\s+)?(function\b|\(|[\w$]+\s*=>|[\w$]+\s*\()/.test(head);
    if (fn ? named && starts : starts) {
      const part = [...b.parts].reverse().find((p) => pos >= p.pos);
      found.push(part ? part.file : runtimeFile(b.id) || '<script id=' + b.id + '>');
    }
  }
  const unique = [...new Set(found)];
  return unique.length && unique.length <= 2 ? unique.join(' or ') : null;
}
const nameScript = (s) => ({
  ms: round(s.d),
  forcedLayoutMs: round(s.forced || 0),
  invoker: s.invoker === target.href.split('#')[0] ? 'inline script (top level)' : s.invoker,
  function: s.fn || '(anonymous)',
  file: s.inline ? locate(s.fn, s.pos) || 'unresolved' : s.url,
});
const round = (n, p = 1) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 10 ** p) / 10 ** p : n;

/* ---------- browser ---------- */
const browser = await chromium.launch();
async function open(profile, { sw = false, wrap = false, hash = '' } = {}) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    hasTouch: profile.touch,
    serviceWorkers: sw ? 'allow' : 'block',
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });
  if (!sw)
    await context.route('**/*', (route) => {
      const u = new URL(route.request().url());
      return u.origin !== target.origin || u.pathname.startsWith('/api/')
        ? route.fulfill({ status: 204, body: '' })
        : route.continue();
    });
  await context.addInitScript(`(${instrument})(${JSON.stringify({ wrap })})`);
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  if (profile.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
  const S = { context, page, cdp, profile, errors, results: {} };
  await page.goto(target.href + hash, { waitUntil: 'commit', timeout: 180_000 });
  return S;
}
async function ready(S, { data = true } = {}) {
  const { page } = S;
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 180_000 });
  await page.waitForFunction(
    () => window.LegalAtlas?.ready && window.DKLAColdCall && window.DKLAStudy,
    null,
    {
      timeout: 120_000,
    },
  );
  if (data) {
    await page.waitForFunction(() => __feel.marks.dataDone && __feel.marks.searchIndex, null, {
      timeout: 240_000,
    });
    await quiet(S, 1500);
  }
  await page.evaluate(() => document.fonts.ready.then(() => __feel.wrapDraw()));
}
// Wait until no long task has ended for `ms`.
async function quiet(S, ms = 600) {
  await S.page.waitForFunction(
    (ms) => {
      const last = __feel.longtask.at(-1);
      return !last || performance.now() - (last.t + last.d) > ms;
    },
    ms,
    { timeout: 120_000, polling: 100 },
  );
  await S.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}
const METRICS = [
  'LayoutCount',
  'RecalcStyleCount',
  'LayoutDuration',
  'RecalcStyleDuration',
  'ScriptDuration',
  'TaskDuration',
  'Nodes',
  'JSEventListeners',
  'JSHeapUsedSize',
];
async function metrics(S) {
  const { metrics } = await S.cdp.send('Performance.getMetrics');
  return Object.fromEntries(metrics.filter((m) => METRICS.includes(m.name)).map((m) => [m.name, m.value]));
}
function delta(a, b) {
  return {
    layouts: b.LayoutCount - a.LayoutCount,
    styleRecalcs: b.RecalcStyleCount - a.RecalcStyleCount,
    layoutMs: (b.LayoutDuration - a.LayoutDuration) * 1000,
    styleMs: (b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000,
    scriptMs: (b.ScriptDuration - a.ScriptDuration) * 1000,
    taskMs: (b.TaskDuration - a.TaskDuration) * 1000,
    nodes: b.Nodes,
  };
}

/* ---------- CPU profile to source files (only with --attribute) ---------- */
async function profiled(S, fn) {
  if (!S.attribute) return [await fn(), null];
  await S.cdp.send('Profiler.enable');
  await S.cdp.send('Profiler.setSamplingInterval', { interval: 250 });
  await S.cdp.send('Profiler.start');
  const value = await fn();
  const { profile } = await S.cdp.send('Profiler.stop');
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  for (const n of profile.nodes) for (const c of n.children || []) byId.get(c).parent = n.id;
  const label = (n) => {
    const f = n.callFrame;
    if (!f.url) return { fn: f.functionName || '(native)', file: f.functionName ? '(browser)' : '' };
    const isPage = f.url.split('#')[0] === target.href.split('#')[0];
    const file = isPage ? fileOfLine(f.lineNumber + 1) : f.url.replace(target.origin + '/', '');
    return {
      fn: f.functionName || '(anonymous)',
      file,
      at: isPage ? fileOfLine(f.lineNumber + 1, true) : file,
    };
  };
  const self = new Map(),
    total = new Map(),
    files = new Map();
  const add = (map, key, ms) => map.set(key, (map.get(key) || 0) + ms);
  const deltas = profile.timeDeltas || [];
  profile.samples.forEach((id, i) => {
    const ms = (deltas[i] || 0) / 1000;
    let n = byId.get(id);
    const top = label(n);
    if (/^\((idle|program|root)\)$/.test(top.fn)) return;
    // Native work (JSON.parse, innerHTML, getBoundingClientRect) is charged to itself and to its caller's file.
    let owner = n;
    while (owner && !owner.callFrame.url && owner.parent) owner = byId.get(owner.parent);
    const o = owner ? label(owner) : top;
    add(
      self,
      top.file === '(browser)' || !top.file
        ? `${top.fn} [native, called from ${o.fn} in ${o.file}]`
        : `${top.fn} [${top.at}]`,
      ms,
    );
    add(files, o.file || '(browser)', ms);
    const seen = new Set();
    for (; n; n = byId.get(n.parent)) {
      const l = label(n);
      if (!l.file || l.file === '(browser)' || /^\(/.test(l.fn)) continue;
      const key = `${l.fn} [${l.at}]`;
      if (!seen.has(key)) {
        seen.add(key);
        add(total, key, ms);
      }
    }
  });
  const top = (map, n) =>
    [...map]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .filter(([, ms]) => ms >= 1)
      .map(([what, ms]) => ({ ms: round(ms), what }));
  return [value, { selfTime: top(self, 12), inclusive: top(total, 12), byFile: top(files, 8) }];
}

/* ---------- one interaction ---------- */
async function interact(S, name, { act, until, mutations, sample, after = 700, events, settle = true }) {
  const { page } = S;
  if (settle) await quiet(S, 400);
  const src = (f) => (f ? f.toString() : null);
  await page.evaluate(([u, m, s]) => __feel.begin(u, m, s), [src(until), mutations || null, src(sample)]);
  const m0 = await metrics(S);
  let actMs = 0;
  const [, cpu] = await profiled(S, async () => {
    const began = Date.now();
    await act();
    actMs = Date.now() - began;
    if (until)
      await page
        .waitForFunction(() => __feel.cur.done, null, { timeout: 60_000, polling: 50 })
        .catch(() => {});
    await sleep(after);
  });
  const m1 = await metrics(S);
  const r = await page.evaluate((e) => __feel.end(e), events || null);
  r.detail.scripts = r.detail.scripts.map(nameScript);
  Object.assign(r, delta(m0, m1), { actMs });
  if (r.distinctSamples != null && actMs > 800) r.updatesPerSecond = (r.distinctSamples / actMs) * 1000;
  if (cpu) r.detail.cpu = cpu;
  if (until && r.resultPainted == null) r.detail.note = 'the expected result never appeared';
  S.results[name] = r;
  log(
    S.label,
    name.padEnd(34),
    'event→paint',
    String(round(r.eventToPaint, 0)).padStart(5),
    'result',
    String(round(r.resultPainted, 0)).padStart(6),
    'maxFrame',
    String(round(r.frameMax, 0)).padStart(5),
    '>20ms',
    (round(r.over20 * 100, 0) + '%').padStart(4),
    r.detail.note || '',
  );
  return r;
}
// The route is changed from script: the clock starts when the hash is set.
const route = (page, hash) =>
  page.evaluate((hash) => {
    __feel.mark();
    location.hash = hash;
  }, hash);
const call = (page, body) => page.evaluate(`(()=>{__feel.mark(); ${body}})()`);
// The map replaces its elements on every draw: read a box and use it at once.
async function mapPoint(page, finder, arg) {
  const p = await page.evaluate(
    ([f, arg]) => {
      const el = new Function('arg', 'return (' + f + ')(arg)')(arg);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height };
    },
    [finder.toString(), arg],
  );
  assert.ok(p, 'map element not found: ' + finder);
  return p;
}
const mapBox = (page) =>
  page.evaluate(() => {
    const b = document.getElementById('geoCanvas').getBoundingClientRect();
    return { x: b.left, y: b.top, w: b.width, h: b.height };
  });
async function goHome(S) {
  await S.page.evaluate(() => {
    window.DKLAColdCall?.close();
    window.DKLAStudy?.close();
    if (window.SCOTUSHistory?.state().open) window.SCOTUSHistory.close();
    for (const d of document.querySelectorAll('dialog[open]')) d.close();
    const search = document.getElementById('search');
    if (search?.value) {
      search.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
    document.activeElement?.blur?.();
    const menu = document.getElementById('moreMenu');
    if (menu && !menu.hidden) document.getElementById('moreBtn')?.click();
    document.getElementById('closeInspector')?.click();
    // An unchanged address would make the next route change a no-op.
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (typeof home === 'function') home('Atlas', false, false);
  });
  await sleep(900);
  await quiet(S, 400);
}

/* ---------- 1. start-up ---------- */
async function startupNumbers(S) {
  const { page } = S;
  const raw = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const F = __feel;
    return {
      nav: {
        responseStart: nav.responseStart,
        responseEnd: nav.responseEnd,
        domInteractive: nav.domInteractive,
        domContentLoaded: nav.domContentLoadedEventEnd,
        load: nav.loadEventEnd,
        transfer: nav.transferSize,
        decoded: nav.decodedBodySize,
      },
      paint: F.paint,
      lcp: F.lcp.at(-1)?.t,
      marks: F.marks,
      longtask: F.longtask,
      loaf: F.loaf,
      json: F.json,
      lens: F.blockLengths(),
      fetches: F.fetches,
      digests: F.digests,
      dataEvents: F.dataEvents,
      nodes: document.getElementsByTagName('*').length,
      controlled: !!navigator.serviceWorker?.controller,
    };
  });
  const fp = raw.paint.find((p) => p.name === 'first-paint')?.t ?? null,
    fcp = raw.paint.find((p) => p.name === 'first-contentful-paint')?.t ?? null;
  const boot = raw.marks.bootReady,
    done = Math.max(raw.marks.dataDone || 0, raw.marks.searchIndex || 0);
  const tbt = (from, to) =>
    raw.longtask.filter((t) => t.t >= from && t.t < to).reduce((s, t) => s + Math.max(0, t.d - 50), 0);
  const lastTask = raw.longtask.at(-1);
  const idOf = (len) =>
    Object.entries(raw.lens).find(([, n]) => n === len)?.[0] ||
    `(${(len / 1e6).toFixed(2)} MB of text, not a page block)`;
  const during = (t, d) => raw.longtask.filter((x) => x.t < t + d && x.t + x.d > t).map((x) => round(x.d, 0));
  const parses = raw.json.map((j) => ({
    block: idOf(j.len),
    at: round(j.t, 0),
    ms: round(j.d),
    mb: round(j.len / 1e6, 2),
    phase: j.t < boot ? 'before the atlas is shown' : 'after',
  }));
  const loafTop = [...raw.loaf]
    .sort((a, b) => b.d - a.d)
    .slice(0, 10)
    .map((l) => ({
      at: round(l.t, 0),
      ms: round(l.d, 0),
      blockingMs: round(l.block, 0),
      renderMs: round(l.render, 0),
      phase: l.t < boot ? 'before shown' : 'after shown',
      scripts: l.scripts
        .sort((a, b) => b.d - a.d)
        .slice(0, 3)
        .map(nameScript),
    }));
  return {
    responseEnd: raw.nav.responseEnd,
    domInteractive: raw.nav.domInteractive,
    domContentLoaded: raw.nav.domContentLoaded,
    firstPaint: fp,
    firstContentfulPaint: fcp,
    atlasShown: boot,
    searchIndexReady: raw.marks.searchIndex ?? null,
    backgroundDataDone: raw.marks.dataDone ?? null,
    lastLongTaskEnds: lastTask ? lastTask.t + lastTask.d : null,
    longTasksBeforeShown: raw.longtask.filter((t) => t.t < boot).length,
    blockingBeforeShown: tbt(0, boot),
    longestTaskBeforeShown: Math.max(0, ...raw.longtask.filter((t) => t.t < boot).map((t) => t.d)),
    longTasksAfterShown: raw.longtask.filter((t) => t.t >= boot).length,
    blockingAfterShown: tbt(boot, Infinity),
    longestTaskAfterShown: Math.max(0, ...raw.longtask.filter((t) => t.t >= boot).map((t) => t.d)),
    blockingFirst5sAfterShown: tbt(boot, boot + 5000),
    jsonParseBeforeShown: raw.json.filter((j) => j.t < boot).reduce((s, j) => s + j.d, 0),
    jsonParseAfterShown: raw.json.filter((j) => j.t >= boot).reduce((s, j) => s + j.d, 0),
    domNodesHome: raw.nodes,
    servedByWorker: raw.controlled ? 1 : 0,
    detail: {
      pageBytes: raw.nav.decoded,
      jsonParses: parses.sort((a, b) => b.ms - a.ms).slice(0, 30),
      longestFrames: loafTop,
      longTasks: raw.longtask.map((t) => ({
        at: round(t.t, 0),
        ms: round(t.d, 0),
        phase: t.t < boot ? 'before shown' : 'after shown',
      })),
      background: raw.dataEvents.map((e) => {
        const f = raw.fetches.filter((x) => x.t <= e.t).at(-1);
        const g = raw.digests.filter((x) => x.t <= e.t).at(-1);
        const p = raw.json.filter((j) => j.t >= e.t - 5 && raw.lens[e.id] === j.len)[0];
        return {
          block: e.id,
          mb: round((raw.lens[e.id] || 0) / 1e6, 2),
          arrivedAt: round(e.t, 0),
          fetchToArrivedMs: f ? round(e.t - f.t, 0) : null,
          sha256Ms: g ? round(g.d) : null,
          parseMs: p ? (p.ms ?? round(p.d)) : null,
          longTasksWhileLoading: f ? during(f.t, e.t - f.t + 400) : [],
        };
      }),
      backgroundWindow: { from: round(boot, 0), to: round(done, 0) },
    },
  };
}
async function startup(profile, label) {
  const S = await open(profile);
  S.label = label;
  await ready(S);
  const r = await startupNumbers(S);
  await S.context.close();
  return r;
}
async function startupProfiled(profile) {
  // One extra load with the CPU profiler running from the first byte, to name what the start-up time is.
  const context = await browser.newContext({ viewport: profile.viewport, serviceWorkers: 'block' });
  await context.addInitScript(`(${instrument})(${JSON.stringify({})})`);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const S = { page, cdp, attribute: true, context };
  await page.goto('about:blank');
  const [, cpu] = await profiled(S, async () => {
    await page.goto(target.href, { waitUntil: 'commit', timeout: 180_000 });
    await page.locator('html.dkla-boot-ready').waitFor({ timeout: 180_000 });
    await page.waitForFunction(() => __feel.marks.dataDone && __feel.marks.searchIndex, null, {
      timeout: 240_000,
    });
    await sleep(1500);
  });
  await context.close();
  return cpu;
}
async function warm(profile, label) {
  // First visit installs the offline worker and fills the caches; then reload and measure.
  const S = await open(profile, { sw: true });
  S.label = label;
  await ready(S);
  const got = await S.page.evaluate(() =>
    Promise.race([
      navigator.serviceWorker.ready.then(() => true),
      new Promise((r) => setTimeout(() => r(false), 60000)),
    ]),
  );
  await sleep(4000);
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    await S.page.reload({ waitUntil: 'commit', timeout: 180_000 });
    await ready(S);
    const r = await startupNumbers(S);
    runs.push(r);
    log(
      label,
      'warm reload',
      i + 1,
      'shown at',
      round(r.atlasShown, 0),
      'worker',
      r.servedByWorker,
      got ? '' : '(worker never became ready)',
    );
  }
  await S.context.close();
  return runs;
}

/* ---------- 2. map ---------- */
async function wheel(S, { dy, ms, every = 50, x, y, key }) {
  const { page, cdp } = S;
  const mod = key === 'Alt' ? 1 : key === 'Control' ? 2 : 0;
  if (key) await page.keyboard.down(key);
  await page.mouse.move(x, y);
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x,
      y,
      deltaX: 0,
      deltaY: dy,
      modifiers: mod,
    });
    await sleep(every);
  }
  if (key) await page.keyboard.up(key);
}
// Gestures are paced by the clock, not by a number of steps: a slow page gets fewer inputs, not a longer gesture.
async function paced(ms, send) {
  const began = Date.now();
  for (;;) {
    const f = Math.min(1, (Date.now() - began) / ms);
    await send(f);
    if (f >= 1) break;
    await sleep(8);
  }
}
async function drag(S, from, to, ms = 1500) {
  const { page, cdp, profile } = S;
  const at = (f) => ({ x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f });
  if (profile.touch) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...from, id: 1 }] });
    await paced(ms, (f) =>
      cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...at(f), id: 1 }] }),
    );
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    return;
  }
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await paced(ms, (f) => page.mouse.move(at(f).x, at(f).y));
  await page.mouse.up();
}
async function pinch(S, centre, from, to, ms = 1200) {
  const { cdp } = S;
  const pts = (d) => [
    { x: centre.x - d / 2, y: centre.y, id: 1 },
    { x: centre.x + d / 2, y: centre.y, id: 2 },
  ];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(from) });
  await paced(ms, (f) =>
    cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(from + (to - from) * f) }),
  );
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const mapNodes = (page) =>
  page.evaluate(() => document.getElementById('geoCanvas').getElementsByTagName('*').length);
async function mapScenario(S) {
  const { page } = S;
  await goHome(S);
  const box = await mapBox(page);
  const c = { x: box.x + box.w * 0.3, y: box.y + box.h * 0.4 };
  const sizes = { home: await mapNodes(page) };
  // The camera (the page's own S: zoom, x, y) on every frame, to see whether it moves smoothly or in jumps.
  const camera = fn(
    'function(){ return typeof S === "object" && S ? [Math.round(S.z*1e4)/1e4, Math.round(S.x), Math.round(S.y)] : null }',
  );
  const G = (extra) => ({ mutations: '#geoCanvas', sample: camera, ...extra });

  await interact(
    S,
    'map: wheel in, 2 s',
    G({ act: () => wheel(S, { dy: -100, ms: 2000, ...c }), after: 900, events: [] }),
  );
  sizes.afterWheelIn = await mapNodes(page);
  await interact(
    S,
    'map: wheel out, 2 s',
    G({ act: () => wheel(S, { dy: 100, ms: 2000, ...c }), after: 900, events: [] }),
  );
  await goHome(S);
  await interact(
    S,
    'map: Alt+wheel in (continuous), 2 s',
    G({ act: () => wheel(S, { dy: -40, ms: 2000, every: 16, key: 'Alt', ...c }), after: 500, events: [] }),
  );
  await interact(
    S,
    'map: Alt+wheel out (continuous), 2 s',
    G({ act: () => wheel(S, { dy: 40, ms: 2000, every: 16, key: 'Alt', ...c }), after: 500, events: [] }),
  );
  await goHome(S);
  await interact(
    S,
    'map: pinch (Ctrl+wheel) in, 1.5 s',
    G({
      act: () => wheel(S, { dy: -12, ms: 1500, every: 16, key: 'Control', ...c }),
      after: 900,
      events: [],
    }),
  );
  await interact(
    S,
    'map: pinch (Ctrl+wheel) out, 1.5 s',
    G({ act: () => wheel(S, { dy: 12, ms: 1500, every: 16, key: 'Control', ...c }), after: 900, events: [] }),
  );
  // Pan at the course level, where the map has the most to draw.
  await page.evaluate(() => home('Contracts', false, false));
  await sleep(900);
  sizes.course = await mapNodes(page);
  const a = { x: box.x + box.w * 0.7, y: box.y + box.h * 0.6 },
    b = { x: box.x + box.w * 0.25, y: box.y + box.h * 0.35 };
  await interact(S, 'map: drag-pan a course, 1.5 s', G({ act: () => drag(S, a, b), after: 400, events: [] }));
  await interact(S, 'map: drag-pan back, 1.5 s', G({ act: () => drag(S, b, a), after: 400, events: [] }));
  if (S.profile.touch) {
    await interact(
      S,
      'map: two-finger pinch out (touch)',
      G({
        act: () => pinch(S, { x: box.x + box.w / 2, y: box.y + box.h / 2 }, 120, 420),
        after: 900,
        events: [],
      }),
    );
    await interact(
      S,
      'map: two-finger pinch in (touch)',
      G({
        act: () => pinch(S, { x: box.x + box.w / 2, y: box.y + box.h / 2 }, 420, 120),
        after: 900,
        events: [],
      }),
    );
  }
  await goHome(S);
  for (const [name, id] of [
    ['zoom-in button', '#studyZoomIn'],
    ['zoom-out button', '#studyZoomOut'],
    ['fit button', '#studyFit'],
  ])
    await interact(
      S,
      'map: ' + name,
      G({
        act: () => page.click(id),
        after: 1300,
        events: ['pointerdown', 'pointerup', 'click', 'mousedown', 'mouseup'],
      }),
    );
  await goHome(S);
  await interact(
    S,
    'map: double-click',
    G({
      act: () => page.mouse.dblclick(c.x, c.y),
      after: 1300,
      events: ['pointerdown', 'pointerup', 'click', 'dblclick'],
    }),
  );
  await goHome(S);
  // Click a subject tile on Home (the camera flies to it).
  const tile = await mapPoint(
    page,
    () =>
      [...document.querySelectorAll('#geoCanvas [data-map-region]')].find(
        (g) => g.dataset.mapRegion === 'consideration',
      ) || document.querySelector('#geoCanvas g.map-region[data-map-region]'),
  );
  await interact(
    S,
    'map: click a subject tile',
    G({
      act: () => page.mouse.click(tile.x, tile.y),
      after: 1500,
      events: ['pointerdown', 'pointerup', 'click'],
    }),
  );
  sizes.subject = await mapNodes(page);
  S.results['map: element counts'] = {
    home: sizes.home,
    course: sizes.course,
    subject: sizes.subject,
    afterWheelIn: sizes.afterWheelIn,
  };
}

/* ---------- 3. opening a case ---------- */
const READER = '#inspector .reader-body';
const readerShows = (title) =>
  `function(){ const h = document.querySelector('#inspector .reader-body h2'); const i = document.getElementById('inspector'); return !!h && !i.hidden && i.getBoundingClientRect().width > 100 && h.textContent.includes(${JSON.stringify(title)}) }`;
const fn = (source) => ({ toString: () => source });
async function caseScenario(S) {
  const { page } = S;
  await goHome(S);
  await page.evaluate(() => LegalAtlas.navigate('region', 'consideration'));
  await sleep(1500);
  await quiet(S);
  const card = await mapPoint(
    page,
    () =>
      [...document.querySelectorAll('#geoCanvas .node-card')].find(
        (c) =>
          (c.dataset.mapNode || c.closest('[data-map-node]')?.dataset.mapNode) === 'adequacy-consideration',
      ) || document.querySelector('#geoCanvas .node-card'),
  );
  const open = { mutations: '#inspector', after: 4000 };
  await interact(S, 'case: open from the map (click a card)', {
    ...open,
    act: () => page.mouse.click(card.x, card.y),
    until: fn(
      `function(){ const i = document.getElementById('inspector'); return !i.hidden && !!i.querySelector('.reader-body h2') && i.getBoundingClientRect().width > 100 }`,
    ),
    events: ['pointerdown', 'pointerup', 'click'],
  });
  await interact(S, 'case: close (× button)', {
    act: () => page.click('#closeInspector'),
    until: fn(
      `function(){ const i = document.getElementById('inspector'); return i.hidden || i.getBoundingClientRect().width < 5 || !i.querySelector('.reader-body') }`,
    ),
    mutations: '#inspector',
    after: 1200,
    events: ['pointerdown', 'pointerup', 'click'],
  });
  await goHome(S);
  await interact(S, 'case: open by route (#node=citoh)', {
    ...open,
    act: () => route(page, 'node=citoh'),
    until: fn(readerShows('Itoh')),
  });
  S.caseNodes = await page.evaluate(() => ({
    total: document.getElementsByTagName('*').length,
    reader: document.getElementById('inspector').getElementsByTagName('*').length,
    map: document.getElementById('geoCanvas').getElementsByTagName('*').length,
    readerHeight: document.getElementById('inspector').scrollHeight,
  }));
  await interact(S, 'case: open another (#node=cp-pennoyer)', {
    ...open,
    act: () => route(page, 'node=cp-pennoyer'),
    until: fn(readerShows('Pennoyer')),
  });
  await interact(S, 'case: back to the first (#node=citoh)', {
    ...open,
    act: () => route(page, 'node=citoh'),
    until: fn(readerShows('Itoh')),
  });
  await interact(S, 'case: open the full brief', {
    act: () => page.locator('#inspector [data-v25-full-brief]').click(),
    until: fn(
      `function(){ const f = document.querySelector('#inspector .r19-brief .r19-full:not(.r19-auditbox)'); return !!f && f.open && f.innerText.length > 1500 }`,
    ),
    mutations: '#inspector',
    after: 1500,
    events: ['pointerdown', 'pointerup', 'click'],
  });
}

/* ---------- 4. the reader ---------- */
async function readerScenario(S) {
  const { page, cdp } = S;
  await goHome(S);
  await route(page, 'node=citoh');
  await page.locator('#inspector .reader-body.v31-case .v31-chart-steps').waitFor();
  await sleep(2500);
  const box = await page.evaluate(() => {
    const b = document.getElementById('inspector').getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  const top = 'function(){ return Math.round(document.getElementById("inspector").scrollTop) }';
  await page.mouse.move(box.x, box.y);
  await interact(S, 'reader: scroll down 3 s (wheel)', {
    act: async () => {
      const end = Date.now() + 3000;
      while (Date.now() < end) {
        await cdp.send('Input.dispatchMouseEvent', {
          type: 'mouseWheel',
          x: box.x,
          y: box.y,
          deltaX: 0,
          deltaY: 60,
        });
        await sleep(16);
      }
    },
    sample: fn(top),
    mutations: '#inspector',
    after: 400,
    events: [],
  });
  await interact(S, 'reader: scroll up 3 s (wheel)', {
    act: async () => {
      const end = Date.now() + 3000;
      while (Date.now() < end) {
        await cdp.send('Input.dispatchMouseEvent', {
          type: 'mouseWheel',
          x: box.x,
          y: box.y,
          deltaX: 0,
          deltaY: -60,
        });
        await sleep(16);
      }
    },
    sample: fn(top),
    after: 400,
    events: [],
  });
  await page.evaluate(() => (document.getElementById('inspector').scrollTop = 0));
  const click = ['pointerdown', 'pointerup', 'click'];
  await interact(S, 'reader: "On this page" rail → 5 Holding', {
    act: () => page.locator('#inspector .v31-rail [data-v31-place]', { hasText: '5 Holding' }).click(),
    until: fn('function(){ return document.getElementById("inspector").scrollTop > 400 }'),
    sample: fn(top),
    after: 900,
    events: click,
  });
  await page.evaluate(() => (document.getElementById('inspector').scrollTop = 0));
  await interact(S, 'reader: open the timeline', {
    act: () => page.locator('#inspector .v31-tl [data-r21-open]').click(),
    until: fn(
      'function(){ const d = document.getElementById("r21Timelines"); return d.open && d.querySelectorAll(".r21-v > li").length > 0 }',
    ),
    mutations: '#r21Timelines',
    after: 900,
    events: click,
  });
  await interact(S, 'reader: close the timeline (Esc)', {
    act: () => page.keyboard.press('Escape'),
    until: fn('function(){ return !document.getElementById("r21Timelines").open }'),
    after: 600,
    events: ['keydown', 'keyup'],
  });
  await interact(S, 'reader: open the flowchart at a step', {
    act: () => page.locator('#inspector .v31-chart .v31-open').first().click(),
    until: fn(
      'function(){ const d = document.getElementById("dklaFlowcharts"); return d.open && !!d.querySelector("#flowchartDetail h3") }',
    ),
    mutations: '#dklaFlowcharts',
    after: 900,
    events: click,
  });
  await interact(S, 'reader: flowchart, take a branch', {
    act: () => page.locator('#dklaFlowcharts [data-flowchart-branch]').first().click(),
    until: fn(
      'function(){ window.__fcH = window.__fcH || document.querySelector("#flowchartDetail h3").textContent; return document.querySelectorAll(".fc-trail li").length >= 4 || document.querySelector("#flowchartDetail h3")?.textContent !== window.__fcH }',
    ),
    mutations: '#dklaFlowcharts',
    after: 800,
    events: click,
  });
  await interact(S, 'reader: flowchart, previous step', {
    act: () => page.locator('#dklaFlowcharts [data-flowcharts-back]').click(),
    mutations: '#dklaFlowcharts',
    after: 800,
    events: click,
  });
  await interact(S, 'reader: flowchart, whole map view', {
    act: () => page.locator('#dklaFlowcharts [data-flowcharts-view="map"]').click(),
    mutations: '#dklaFlowcharts',
    after: 1000,
    events: click,
  });
  await interact(S, 'reader: flowchart, back to the case', {
    act: async () => {
      await page.locator('#dklaFlowcharts [data-flowcharts-view="walkthrough"]').click();
      await page.locator('#dklaFlowcharts .fc-back-entry').click();
    },
    until: fn('function(){ return !document.getElementById("dklaFlowcharts").open }'),
    after: 900,
    events: click,
  });
  // The Cold Call reader, and a dictionary word in it.
  await page.locator('#inspector .reader-body.v31-case').waitFor();
  await interact(S, 'reader: open Cold Call', {
    act: () => page.locator('#inspector [data-cold-call]').first().click(),
    until: fn(
      'function(){ const d = document.getElementById("coldCallDialog"); return d.open && d.querySelectorAll("#ccNarrative .cc-section > p:not(.cc-kicker)").length > 3 }',
    ),
    mutations: '#coldCallDialog',
    after: 1500,
    events: click,
  });
  const term = page.locator('#coldCallDialog .cc-term').first();
  await term.scrollIntoViewIfNeeded();
  const tb = await term.boundingBox();
  await page.mouse.move(tb.x - 60, tb.y - 40);
  await sleep(300);
  await interact(S, 'reader: hover a dictionary word (Cold Call)', {
    act: () => page.mouse.move(tb.x + Math.min(8, tb.width / 2), tb.y + tb.height / 2, { steps: 4 }),
    until: fn('function(){ return !!document.getElementById("ccGlossCard") }'),
    after: 900,
    events: ['pointerover', 'pointerenter', 'mouseover', 'pointermove'],
  });
  // The hover has no input event the harness records as a start: measure from the pointer reaching the word.
  await interact(S, 'reader: close Cold Call', {
    act: () => page.locator('#ccClose').click(),
    until: fn('function(){ return !document.getElementById("coldCallDialog").open }'),
    after: 700,
    events: click,
  });
  await interact(S, 'reader: click a dictionary chip (opens the dictionary)', {
    act: () => page.locator('#inspector .dkla-term-chips [data-dkla-term]').first().click(),
    until: fn(
      'function(){ const d = document.getElementById("glossaryDialog"); return d.open && !!d.querySelector(".gl-detail h2") }',
    ),
    mutations: '#glossaryDialog',
    after: 1200,
    events: click,
  });
  await page.evaluate(() => document.getElementById('glossaryDialog').close());
}

/* ---------- 5. search ---------- */
async function searchScenario(S) {
  const { page } = S;
  await goHome(S);
  const QUERY = 'personal j'; // 10 characters
  await page.evaluate(() => {
    const F = __feel,
      box = document.getElementById('search'),
      list = document.getElementById('searchResults');
    F.keys = [];
    box.addEventListener(
      'input',
      (e) => F.keys.push({ value: box.value, at: e.timeStamp, first: null, last: null, n: 0, rows: 0 }),
      true,
    );
    new MutationObserver(() => {
      const k = F.keys.at(-1);
      if (!k) return;
      const t = performance.now();
      requestAnimationFrame(() => {
        // The frame in which this change is drawn.
        if (k.first == null) k.first = performance.now() - k.at;
        k.last = performance.now() - k.at;
      });
      k.n++;
      k.mutAt = t - k.at;
      k.rows = list.querySelectorAll('[data-search-key]').length;
      k.top = list.querySelector('[data-search-key] strong')?.textContent || '';
      k.matches = typeof query !== 'undefined' && query === k.value;
    }).observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  });
  await interact(S, 'search: focus the box', {
    act: () => page.click('#search'),
    after: 500,
    events: ['pointerdown', 'pointerup', 'click', 'focusin'],
  });
  await interact(S, 'search: type 10 characters (150 ms apart)', {
    act: () => page.keyboard.type(QUERY, { delay: 150 }),
    until: fn(
      `function(){ return typeof query !== 'undefined' && query === ${JSON.stringify(QUERY)} && document.querySelectorAll('#searchResults [data-search-key]').length > 0 }`,
    ),
    after: 1500,
    events: ['keydown', 'keypress', 'input', 'keyup'],
    mutations: '#searchResults',
  });
  const keys = await page.evaluate(() => __feel.keys);
  const events = await page.evaluate(() =>
    __feel.event.filter((e) => e.t >= __feel.cur.t0 && /key|input/.test(e.name)),
  );
  const r = S.results['search: type 10 characters (150 ms apart)'];
  const first = keys.map((k) => k.first).filter((v) => v != null),
    last = keys.map((k) => k.last).filter((v) => v != null);
  const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : null);
  Object.assign(r, {
    keyFirstUpdateMedian: med(first),
    keyFirstUpdateMax: first.length ? Math.max(...first) : null,
    keyLastUpdateMedian: med(last),
    keyLastUpdateMax: last.length ? Math.max(...last) : null,
    keysWithNoUpdate: keys.filter((k) => k.first == null).length,
    keyEventToPaintMax: events.length ? Math.max(...events.map((e) => e.d)) : null,
    resultsRedrawnPerKey: med(keys.map((k) => k.n)),
  });
  r.detail.perKey = keys.map((k) => ({
    text: k.value,
    firstUpdateMs: round(k.first, 0),
    lastUpdateMs: round(k.last, 0),
    listChanges: k.n,
    rows: k.rows,
    top: k.top,
  }));
  await interact(S, 'search: Enter opens the first result', {
    act: () => page.keyboard.press('Enter'),
    until: fn(
      `function(){ const r = document.getElementById('searchResults'); const i = document.getElementById('inspector'); return (r.hidden || !r.children.length) && (!i.hidden || !!document.querySelector('dialog[open]') || location.hash.length > 1) }`,
    ),
    mutations: '#inspector',
    after: 2500,
    events: ['keydown', 'keyup', 'keypress'],
  });
  // The dictionary's own filter box: 7 million characters of dictionary behind it.
  await goHome(S);
  await interact(S, 'dictionary: open by route (#term=consideration)', {
    act: () => route(page, 'term=consideration'),
    until: fn(
      'function(){ const d = document.getElementById("glossaryDialog"); return d.open && d.querySelectorAll(".gl-list li").length > 0 }',
    ),
    mutations: '#glossaryDialog',
    after: 1200,
  });
  await page.locator('#glFind').click();
  await interact(S, 'dictionary: type 6 characters in its filter', {
    act: () => page.keyboard.type('consid', { delay: 150 }),
    mutations: '#glossaryDialog',
    after: 1000,
    events: ['keydown', 'keypress', 'input', 'keyup'],
  });
  await interact(S, 'dictionary: pick a term', {
    act: () => page.locator('#glossaryDialog .gl-list [data-term][aria-pressed="false"]').first().click(),
    until: fn(
      'function(){ const h = document.querySelector(".gl-detail h2")?.textContent || ""; window.__glH = window.__glH ?? h; return h !== window.__glH }',
    ),
    mutations: '#glossaryDialog',
    after: 800,
    events: ['pointerdown', 'pointerup', 'click'],
  });
  await interact(S, 'dictionary: close (Esc)', {
    act: () => page.keyboard.press('Escape'),
    until: fn('function(){ return !document.getElementById("glossaryDialog").open }'),
    after: 600,
    events: ['keydown', 'keyup'],
  });
}

/* ---------- 6. dialogs and menus ---------- */
async function dialogScenario(S) {
  const { page } = S;
  const click = ['pointerdown', 'pointerup', 'click'];
  await goHome(S);
  await interact(S, 'menu: open', {
    act: () => page.click('#moreBtn'),
    until: fn(
      'function(){ const m = document.getElementById("moreMenu"); return !m.hidden && m.getBoundingClientRect().height > 50 }',
    ),
    after: 700,
    events: click,
  });
  await interact(S, 'menu: close (Esc)', {
    act: () => page.keyboard.press('Escape'),
    until: fn('function(){ return document.getElementById("moreMenu").hidden }'),
    after: 500,
    events: ['keydown', 'keyup'],
  });
  const viaMenu = async (name, item, until, closer, extra = {}) => {
    await page.click('#moreBtn');
    await page.locator('#moreMenu ' + item).waitFor();
    await sleep(250);
    await interact(S, name + ': open from the menu', {
      act: () => page.locator('#moreMenu ' + item).click(),
      until: fn(until),
      after: 1200,
      events: click,
      ...extra,
    });
    if (closer) await closer();
  };
  const escClose = (name, id) => () =>
    interact(S, name + ': close (Esc)', {
      act: () => page.keyboard.press('Escape'),
      until: fn(`function(){ return !document.getElementById(${JSON.stringify(id)}).open }`),
      after: 600,
      events: ['keydown', 'keyup'],
    });
  await viaMenu(
    'Doctrine timelines',
    '[data-r21-menu]',
    'function(){ const d = document.getElementById("r21Timelines"); return d.open && d.innerText.length > 100 }',
    escClose('Doctrine timelines', 'r21Timelines'),
    { mutations: '#r21Timelines' },
  );
  await viaMenu(
    'Flowcharts',
    '[data-flowcharts-menu]',
    'function(){ const d = document.getElementById("dklaFlowcharts"); return d.open && d.innerText.length > 100 }',
    escClose('Flowcharts', 'dklaFlowcharts'),
    { mutations: '#dklaFlowcharts' },
  );
  await viaMenu(
    'Canons',
    '[data-canons-menu]',
    'function(){ const d = document.getElementById("dklaCanons"); return d.open && d.innerText.length > 100 }',
    escClose('Canons', 'dklaCanons'),
    { mutations: '#dklaCanons' },
  );
  await viaMenu(
    'Recall drill',
    '[data-r18-open="drill"]',
    'function(){ const d = document.getElementById("r18Dialog"); return d.open && d.innerText.length > 50 }',
    async () => {
      await page.evaluate(() => DKLAStudy.close());
    },
    { mutations: '#r18Dialog' },
  );
  await viaMenu(
    'SCOTUS History',
    '[data-sh-open]',
    'function(){ return SCOTUSHistory.state().open && /The Court on this date/.test(document.body.innerText) }',
    async () => {
      await page.evaluate(() => SCOTUSHistory.close());
      await sleep(600);
    },
  );
  await goHome(S);
  await viaMenu(
    'Rules & authorities',
    '[data-authority-menu]',
    'function(){ return /Rules & authorities/.test(document.getElementById("geoBreadcrumb").textContent) && /United States Code/.test(document.getElementById("geoCanvas").textContent) }',
    null,
    { mutations: '#geoCanvas', after: 1500 },
  );
  const mapText = (text) =>
    mapPoint(
      page,
      (text) => {
        const all = [
          ...document.querySelectorAll('#geoCanvas [data-map-region], #geoCanvas [data-map-jump]'),
        ].filter((g) => g.textContent.replace(/\s+/g, ' ').includes(text));
        return all.sort((a, b) => a.textContent.length - b.textContent.length)[0];
      },
      text,
    );
  let p = await mapText('Judiciary and Judicial Procedure');
  const crumb = (text) =>
    `function(){ return document.getElementById("geoBreadcrumb").textContent.includes(${JSON.stringify(text)}) }`;
  await interact(S, 'Rules & authorities: open a U.S. Code title (Title 28)', {
    act: () => page.mouse.click(p.x, p.y),
    until: fn(crumb('Title 28')),
    mutations: '#geoCanvas',
    after: 1800,
    events: click,
  });
  S.results['Rules & authorities: title page'] = {
    mapElements: await mapNodes(page),
    crumb: await page.evaluate(() => document.getElementById('geoBreadcrumb').textContent),
  };
  await interact(S, 'Rules & authorities: open a rule (FRCP 4) by API', {
    act: () => call(page, 'DKLAAuthorities.open("frcp-4")'),
    until: fn(
      'function(){ const i = document.getElementById("inspector"); return !i.hidden && /Summons/.test(i.textContent) }',
    ),
    mutations: '#inspector',
    after: 2500,
  });
  await goHome(S);
  await page.click('#moreBtn');
  await page.locator('#moreMenu [data-authority-menu]').click();
  await sleep(1500);
  p = await mapText('Federal Rules of Civil Procedure');
  await interact(S, 'Rules & authorities: open a book (FRCP)', {
    act: () => page.mouse.click(p.x, p.y - p.h / 2 + 30),
    until: fn(crumb('Federal Rules')),
    mutations: '#geoCanvas',
    after: 1800,
    events: click,
  });
  await goHome(S);
  await interact(S, 'Ask Dottie: open', {
    act: () => page.click('.ask-bar'),
    until: fn('function(){ const d = document.getElementById("dklaAskDialog"); return !!d && d.open }'),
    mutations: 'body',
    after: 1500,
    events: click,
  });
  await interact(S, 'Ask Dottie: close (Esc)', {
    act: () => page.keyboard.press('Escape'),
    until: fn('function(){ return !document.getElementById("dklaAskDialog").open }'),
    after: 600,
    events: ['keydown', 'keyup'],
  });
  await goHome(S);
}

/* ---------- 8. idle ---------- */
async function idleWindow(S, name, ms = 5000) {
  const { page } = S;
  await quiet(S, 800);
  await page.evaluate(() => {
    __feel.sites = {};
    __feel.census = true;
    __feel.begin(null, '#geoCanvas', null);
  });
  const m0 = await metrics(S);
  await sleep(ms);
  const m1 = await metrics(S);
  const r = await page.evaluate(() => {
    __feel.census = false;
    const r = __feel.end(null);
    r.sites = Object.values(__feel.sites);
    r.running = document.getAnimations().map((a) => ({
      on: __feel.describe(a.effect?.target),
      name: a.animationName || a.transitionProperty || 'script',
      iterations: String(a.effect?.getTiming().iterations),
      duration: a.effect?.getTiming().duration,
      state: a.playState,
    }));
    return r;
  });
  const d = delta(m0, m1),
    per = 1000 / ms;
  const out = {
    scriptMsPerSecond: d.scriptMs * per,
    taskMsPerSecond: d.taskMs * per,
    layoutsPerSecond: d.layouts * per,
    styleRecalcsPerSecond: d.styleRecalcs * per,
    mapDrawsPerSecond: r.draws * per,
    mapDrawMsPerSecond: r.drawMs * per,
    mapNodesReplacedPerSecond: r.mutatedNodes * per,
    callbacksPerSecond: r.sites.reduce((s, x) => s + x.calls, 0) * per,
    runningAnimations: r.running.length,
    endlessAnimations: r.running.filter((a) => a.iterations === 'Infinity').length,
    frameMax: r.frameMax,
    over20: r.over20,
    detail: {
      callbacks: r.sites
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 14)
        .map((s) => {
          const [line] = s.where.split(':').map(Number);
          return {
            kind: s.kind,
            file: fileOfLine(line),
            at: s.where,
            perSecond: round(s.calls * per),
            msPerSecond: round(s.ms * per, 2),
          };
        }),
      animations: r.running.slice(0, 20),
    },
  };
  S.results[name] = out;
  log(
    S.label,
    name.padEnd(34),
    'script',
    round(out.scriptMsPerSecond),
    'ms/s  draws',
    round(out.mapDrawsPerSecond),
    '/s  callbacks',
    round(out.callbacksPerSecond),
    '/s',
  );
}
async function idleScenario(profile, label) {
  const S = await open(profile, { wrap: true });
  S.label = label;
  await ready(S);
  await goHome(S);
  await idleWindow(S, 'idle: Home');
  await S.page.mouse.move(600, 400);
  await idleWindow(S, 'idle: Home, pointer resting on the map');
  await route(S.page, 'node=citoh');
  await S.page.locator('#inspector .reader-body.v31-case .v31-chart-steps').waitFor();
  await sleep(4000);
  await idleWindow(S, 'idle: a case open');
  await S.page.evaluate(() => document.getElementById('closeInspector')?.click());
  await goHome(S);
  await S.page.click('#search');
  await S.page.keyboard.type('personal', { delay: 80 });
  await sleep(1500);
  await idleWindow(S, 'idle: search results showing');
  const census = await S.page.evaluate(() => ({
    mo: __feel.mo.map((m) => ({
      where: m.where,
      targets: m.targets,
      live: !!m.live,
      calls: m.calls,
      records: m.records,
      ms: m.ms,
    })),
    intervals: __feel.intervals.map((i) => ({
      where: i.where,
      delay: i.delay,
      calls: i.calls,
      cleared: !!i.cleared,
    })),
    ro: __feel.ro,
    io: __feel.io,
  }));
  const named = (x) => ({ file: fileOfLine(Number(x.where.split(':')[0])), ...x });
  S.results['observers and timers'] = {
    mutationObserversCreated: census.mo.length,
    mutationObserversLive: census.mo.filter((m) => m.live).length,
    mutationObserversOnWholeDocument: census.mo.filter(
      (m) => m.live && m.targets.some((t) => /^(body|html|document)\b.*subtree/.test(t)),
    ).length,
    resizeObservers: census.ro,
    intersectionObservers: census.io,
    intervalsRunning: census.intervals.filter((i) => !i.cleared).length,
    detail: {
      mutationObservers: census.mo
        .filter((m) => m.live)
        .map(named)
        .map((m) => ({
          file: m.file,
          watches: [...new Set(m.targets)].slice(0, 3),
          callbacksSoFar: m.calls,
          msSoFar: round(m.ms),
        })),
      intervals: census.intervals
        .map(named)
        .map((i) => ({ file: i.file, everyMs: i.delay, callsSoFar: i.calls, cleared: i.cleared })),
    },
  };
  const r = S.results;
  await S.context.close();
  return r;
}

/* ---------- 9. styling ---------- */
async function styleScenario(profile) {
  const S = await open(profile);
  S.label = 'styles';
  await ready(S);
  await goHome(S);
  const { page } = S;
  const sheet = await page.evaluate(() => {
    const LAYOUT =
      /^(width|height|min-|max-|top|left|right|bottom|inset|margin|padding|grid|flex|gap|font-size|line-height|border-width|border$)/;
    const COMPOSITED = /^(transform|opacity|translate|scale|rotate)$/;
    const PAINT =
      /^(color|background|border-color|box-shadow|filter|backdrop-filter|outline|fill|stroke|text-shadow|visibility|border-radius|clip-path|mask)/;
    const kind = (p) =>
      p === 'all'
        ? 'all'
        : COMPOSITED.test(p)
          ? 'composited'
          : LAYOUT.test(p)
            ? 'layout'
            : PAINT.test(p)
              ? 'paint'
              : 'other';
    const out = {
      bytes: 0,
      sheets: 0,
      rules: 0,
      transitions: [],
      animations: [],
      keyframes: {},
      willChange: [],
      backdrop: [],
      filters: [],
      bigShadows: [],
      hover: 0,
      active: 0,
      focusVisible: 0,
      cursorPointer: 0,
      reducedMotion: [],
      reducedMotionRules: 0,
    };
    for (const s of document.querySelectorAll('style')) out.bytes += s.textContent.length;
    const walk = (rules, media) => {
      for (const r of rules) {
        if (r instanceof CSSKeyframesRule) {
          const props = new Set();
          for (const k of r.cssRules) for (const p of k.style) props.add(p);
          out.keyframes[r.name] = [...props];
          continue;
        }
        if (r.cssRules && !(r instanceof CSSStyleRule)) {
          const m = r.conditionText || r.media?.mediaText || '';
          if (/prefers-reduced-motion/.test(m))
            out.reducedMotion.push(m + ' (' + r.cssRules.length + ' rules)');
          walk(r.cssRules, (media ? media + ' and ' : '') + m);
          continue;
        }
        if (!(r instanceof CSSStyleRule)) continue;
        out.rules++;
        if (/prefers-reduced-motion/.test(media || '')) out.reducedMotionRules++;
        const st = r.style,
          sel = r.selectorText;
        if (/:hover/.test(sel)) out.hover++;
        if (/:active/.test(sel)) out.active++;
        if (/:focus-visible/.test(sel)) out.focusVisible++;
        if (st.cursor === 'pointer') out.cursorPointer++;
        const dur = st.transitionDuration;
        if (st.transitionProperty && dur && !/^0s(, 0s)*$/.test(dur) && st.transition !== 'none')
          out.transitions.push({
            selector: sel.slice(0, 90),
            properties: st.transitionProperty,
            duration: dur,
            easing: st.transitionTimingFunction,
            kinds: [...new Set(st.transitionProperty.split(',').map((p) => kind(p.trim())))],
            media: media || '',
          });
        if (st.animationName && st.animationName !== 'none')
          out.animations.push({
            selector: sel.slice(0, 90),
            name: st.animationName,
            duration: st.animationDuration,
            easing: st.animationTimingFunction,
            iterations: st.animationIterationCount,
            media: media || '',
          });
        if (st.willChange && st.willChange !== 'auto')
          out.willChange.push({ selector: sel.slice(0, 90), value: st.willChange });
        const bf = st.backdropFilter || st.webkitBackdropFilter;
        if (bf && bf !== 'none') out.backdrop.push({ selector: sel.slice(0, 90), value: bf });
        if (st.filter && st.filter !== 'none')
          out.filters.push({ selector: sel.slice(0, 90), value: st.filter.slice(0, 60) });
        if (st.boxShadow && st.boxShadow !== 'none') {
          const blur = Math.max(
            0,
            ...[...st.boxShadow.matchAll(/(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/g)].map((m) =>
              Number(m[3]),
            ),
          );
          if (blur >= 24) out.bigShadows.push({ selector: sel.slice(0, 90), blurPx: blur });
        }
      }
    };
    for (const s of document.styleSheets) {
      out.sheets++;
      try {
        walk(s.cssRules, '');
      } catch {
        /* a sheet from elsewhere */
      }
    }
    return out;
  });
  for (const a of sheet.animations) {
    const props = a.name.split(',').flatMap((n) => sheet.keyframes[n.trim()] || []);
    a.animates = [...new Set(props)];
  }
  // Which visible controls answer a pointer: a :hover rule, an :active rule, a pointer cursor, a transition.
  const audit = () =>
    page.evaluate(() => {
      const rules = { hover: [], active: [], focus: [] };
      const walk = (list) => {
        for (const r of list) {
          if (r.cssRules && !(r instanceof CSSStyleRule)) {
            if (
              !/prefers-reduced-motion|print|max-width|hover: none/.test(
                r.conditionText || r.media?.mediaText || '',
              )
            )
              walk(r.cssRules);
            continue;
          }
          if (!(r instanceof CSSStyleRule)) continue;
          for (const sel of r.selectorText.split(/,(?![^(]*\))/)) {
            for (const [key, pseudo] of [
              ['hover', ':hover'],
              ['active', ':active'],
              ['focus', ':focus-visible'],
            ])
              if (sel.includes(pseudo)) {
                // The element the pseudo-class sits on, with the pseudo-class removed.
                const cut = sel
                  .slice(0, sel.indexOf(pseudo) + pseudo.length)
                  .replaceAll(pseudo, '')
                  .trim();
                const rest = sel
                  .slice(sel.indexOf(pseudo) + pseudo.length)
                  .replace(/:{1,2}[\w-]+(\([^)]*\))?/g, '')
                  .trim();
                if (cut && !rest) rules[key].push(cut.replace(/:(not\(\s*\)|where\(\s*\))/g, ''));
              }
          }
        }
      };
      for (const s of document.styleSheets)
        try {
          walk(s.cssRules);
        } catch {
          /* skip */
        }
      const matches = (el, list) =>
        list.some((sel) => {
          try {
            return el.matches(sel);
          } catch {
            return false;
          }
        });
      const visible = (el) => {
        const b = el.getBoundingClientRect();
        return (
          b.width > 4 &&
          b.height > 4 &&
          b.bottom > 0 &&
          b.top < innerHeight &&
          getComputedStyle(el).visibility !== 'hidden'
        );
      };
      const controls = [
        ...document.querySelectorAll(
          'button, a[href], [role="button"], [role="menuitem"], [role="tab"], summary, [data-map-node], [data-map-region], [data-map-jump], input, select',
        ),
      ].filter(visible);
      const rows = controls.map((el) => {
        const cs = getComputedStyle(el);
        const svg = !!el.closest('#geoCanvas');
        return {
          what:
            __feel.describe(el) +
            ' "' +
            (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28) +
            '"',
          where: svg
            ? 'map'
            : el.closest('dialog')
              ? 'dialog'
              : el.closest('#inspector')
                ? 'reader'
                : el.closest('#moreMenu')
                  ? 'menu'
                  : 'chrome',
          hover: matches(el, rules.hover),
          active: matches(el, rules.active),
          focus: matches(el, rules.focus),
          pointer: cs.cursor === 'pointer',
          transition: !/^0s(, 0s)*$/.test(cs.transitionDuration),
          disabled: el.disabled === true,
        };
      });
      const groups = {};
      for (const r of rows) {
        if (r.disabled) continue;
        const g = (groups[r.where] = groups[r.where] || {
          controls: 0,
          hover: 0,
          active: 0,
          focusVisible: 0,
          pointerCursor: 0,
          transition: 0,
          noHover: [],
          noActive: [],
        });
        g.controls++;
        g.hover += r.hover;
        g.active += r.active;
        g.focusVisible += r.focus;
        g.pointerCursor += r.pointer;
        g.transition += r.transition;
        if (!r.hover && g.noHover.length < 8) g.noHover.push(r.what);
        if (!r.active && g.noActive.length < 5) g.noActive.push(r.what);
      }
      return groups;
    });
  const feedback = { home: await audit() };
  await page.click('#moreBtn');
  await sleep(300);
  feedback.menuOpen = (await audit()).menu;
  await page.keyboard.press('Escape');
  await route(page, 'node=citoh');
  await page.locator('#inspector .reader-body.v31-case .v31-chart-steps').waitFor();
  await sleep(3000);
  feedback.caseOpen = await audit();
  const nodes = await page.evaluate(() => ({
    total: document.getElementsByTagName('*').length,
    reader: document.getElementById('inspector').getElementsByTagName('*').length,
    map: document.getElementById('geoCanvas').getElementsByTagName('*').length,
  }));
  // Large surfaces that are costly to paint: computed, on what is on screen with a case open.
  const surfaces = await page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .map((el) => {
        const cs = getComputedStyle(el),
          b = el.getBoundingClientRect();
        const area =
          Math.max(0, Math.min(b.right, innerWidth) - Math.max(b.left, 0)) *
          Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0));
        const flags = [];
        if (cs.backdropFilter && cs.backdropFilter !== 'none')
          flags.push('backdrop-filter ' + cs.backdropFilter);
        if (cs.filter && cs.filter !== 'none') flags.push('filter ' + cs.filter.slice(0, 40));
        const blur = Math.max(
          0,
          ...[...cs.boxShadow.matchAll(/(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/g)].map((m) => Number(m[3])),
        );
        if (blur >= 24) flags.push('box-shadow blur ' + blur + 'px');
        if (cs.willChange !== 'auto') flags.push('will-change ' + cs.willChange);
        return flags.length && area > 20000
          ? {
              on: __feel.describe(el),
              screenShare: Math.round((area / (innerWidth * innerHeight)) * 100) + '%',
              flags,
            }
          : null;
      })
      .filter(Boolean)
      .slice(0, 25),
  );
  await S.context.close();
  const count = (list, k) => list.filter((t) => t.kinds.includes(k)).length;
  return {
    cssBytes: sheet.bytes,
    styleSheets: sheet.sheets,
    cssRules: sheet.rules,
    transitionRules: sheet.transitions.length,
    transitionRulesAll: count(sheet.transitions, 'all'),
    transitionRulesLayout: count(sheet.transitions, 'layout'),
    transitionRulesPaint: count(sheet.transitions, 'paint'),
    transitionRulesCompositedOnly: sheet.transitions.filter((t) => t.kinds.every((k) => k === 'composited'))
      .length,
    animationRules: sheet.animations.length,
    endlessAnimationRules: sheet.animations.filter((a) => /infinite/.test(a.iterations)).length,
    keyframeSets: Object.keys(sheet.keyframes).length,
    willChangeRules: sheet.willChange.length,
    backdropFilterRules: sheet.backdrop.length,
    filterRules: sheet.filters.length,
    bigShadowRules: sheet.bigShadows.length,
    hoverRules: sheet.hover,
    activeRules: sheet.active,
    focusVisibleRules: sheet.focusVisible,
    cursorPointerRules: sheet.cursorPointer,
    reducedMotionBlocks: sheet.reducedMotion.length,
    reducedMotionRules: sheet.reducedMotionRules,
    domNodesCaseOpen: nodes.total,
    domNodesReader: nodes.reader,
    domNodesMapBehindCase: nodes.map,
    detail: { ...sheet, feedback, surfaces },
  };
}

/* ---------- running it ---------- */
function median(values) {
  const v = values.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return values.find((x) => x != null) ?? null;
  return v.length % 2 ? v[v.length >> 1] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
}
// Median of every number at the top level of each result; `detail` is kept from the median-most run (the first).
function combine(runs) {
  const out = {};
  for (const name of Object.keys(runs[0] || {})) {
    const list = runs.map((r) => r[name]).filter(Boolean);
    const m = {};
    for (const key of Object.keys(list[0])) {
      if (key === 'detail') m.detail = list[0].detail;
      else if (list.every((x) => typeof x[key] === 'number' || x[key] == null)) {
        m[key] = round(median(list.map((x) => x[key])), 3);
        const nums = list.map((x) => x[key]).filter((x) => typeof x === 'number');
        if (nums.length > 1)
          (m.range = m.range || {})[key] = [round(Math.min(...nums), 1), round(Math.max(...nums), 1)];
      } else m[key] = list[0][key];
    }
    m.runs = list.length;
    out[name] = m;
  }
  return out;
}
const result = {
  page: target.href,
  when: new Date().toISOString(),
  runs: RUNS,
  machine: {
    cores: (await import('node:os')).cpus().length,
    chromium: browser.version(),
    note: 'headless Chromium with software drawing (no graphics card): script, style and layout times transfer to other machines in proportion, drawing costs do not',
  },
  pageBytes: html.length,
  profiles: {},
};
const save = () => {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(result, null, 1));
};
try {
  for (const name of profiles) {
    const profile = PROFILES[name];
    const wanted = (s) => only.has(s) && (!profile.touch || KEY.has(s));
    const P = (result.profiles[name] = {});
    if (wanted('startup')) {
      const runs = [];
      for (let i = 0; i < RUNS; i++) {
        const r = await startup(profile, name);
        log(
          name,
          'cold start',
          i + 1,
          'first paint',
          round(r.firstPaint, 0),
          'shown',
          round(r.atlasShown, 0),
          'data done',
          round(r.backgroundDataDone, 0),
          'blocking before/after',
          round(r.blockingBeforeShown, 0),
          round(r.blockingAfterShown, 0),
        );
        runs.push({ 'start-up: first visit': r });
      }
      Object.assign(P, combine(runs));
      save();
    }
    if (wanted('warm')) {
      const runs = (await warm(profile, name)).map((r) => ({
        'start-up: repeat visit (offline worker and caches warm)': r,
      }));
      Object.assign(P, combine(runs));
      save();
    }
    const scenarios = [
      ['map', mapScenario],
      ['case', caseScenario],
      ['reader', readerScenario],
      ['search', searchScenario],
      ['dialogs', dialogScenario],
    ].filter(([s]) => wanted(s));
    if (scenarios.length) {
      const runs = [];
      for (let i = 0; i < RUNS; i++) {
        const S = await open(profile);
        S.label = name + ' run ' + (i + 1);
        await ready(S);
        for (const [key, scenario] of scenarios) {
          try {
            await scenario(S);
          } catch (error) {
            log(S.label, key, 'FAILED:', String(error.message || error).split('\n')[0]);
            S.results[key + ': failed'] = { error: String(error.message || error).split('\n')[0] };
          }
        }
        if (S.caseNodes) S.results['case: element counts'] = S.caseNodes;
        if (S.errors.length) S.results['page errors'] = { count: S.errors.length, first: S.errors[0] };
        runs.push(S.results);
        await S.context.close();
      }
      Object.assign(P, combine(runs));
      save();
    }
    if (wanted('idle')) {
      const runs = [];
      for (let i = 0; i < RUNS; i++) runs.push(await idleScenario(profile, name + ' run ' + (i + 1)));
      Object.assign(P, combine(runs));
      save();
    }
  }
  if (only.has('styles')) {
    result.styles = await styleScenario(PROFILES.desktop);
    save();
  }
  if (attribute) {
    log('attribution run (CPU profiler on)');
    const A = (result.attribution = {});
    if (only.has('startup')) A['start-up: first visit'] = await startupProfiled(PROFILES.desktop);
    const S = await open(PROFILES.desktop);
    S.label = 'attribute';
    await ready(S);
    S.attribute = true;
    for (const [key, scenario] of [
      ['map', mapScenario],
      ['case', caseScenario],
      ['reader', readerScenario],
      ['search', searchScenario],
      ['dialogs', dialogScenario],
    ])
      if (only.has(key))
        try {
          await scenario(S);
        } catch (error) {
          log('attribute', key, 'FAILED:', String(error.message || error).split('\n')[0]);
        }
    for (const [name, r] of Object.entries(S.results)) if (r.detail?.cpu) A[name] = r.detail.cpu;
    await S.context.close();
    save();
  }
} finally {
  save();
  await browser.close();
}

/* ---------- the printed table ---------- */
const ms = (v) => (v == null ? '   –' : String(Math.round(v)).padStart(4));
const pct = (v) => (v == null ? '  –' : String(Math.round(v * 100)).padStart(3) + '%');
const names = Object.keys(result.profiles);
console.log(
  `\nDKLA feel benchmark  ${result.page}  ${result.runs} runs, medians  →  ${path.relative(root, outFile)}`,
);
for (const name of names) {
  const P = result.profiles[name];
  console.log(`\n== ${name} ==`);
  for (const key of Object.keys(P).filter((k) => k.startsWith('start-up'))) {
    const s = P[key];
    console.log(
      `${key}: first paint ${ms(s.firstPaint)} ms · atlas shown ${ms(s.atlasShown)} ms · search ready ${ms(s.searchIndexReady)} ms · background data done ${ms(s.backgroundDataDone)} ms`,
    );
    console.log(
      `   blocking time before shown ${ms(s.blockingBeforeShown)} ms (longest task ${ms(s.longestTaskBeforeShown)}) · after shown ${ms(s.blockingAfterShown)} ms in ${s.longTasksAfterShown} long tasks (longest ${ms(s.longestTaskAfterShown)})`,
    );
  }
  const rows = Object.entries(P).filter(([, r]) => 'frameMax' in r && !('scriptMsPerSecond' in r));
  if (rows.length) {
    console.log(
      'interaction'.padEnd(54) +
        ' evt→paint  result  1stMove  maxFrame  >20ms  >50ms  upd/s  script  layouts  forced  shift   settle',
    );
    for (const [key, r] of rows)
      console.log(
        key.slice(0, 53).padEnd(54) +
          `   ${ms(r.eventToPaint)}    ${ms(r.resultPainted)}     ${ms(r.firstChange)}      ${ms(r.frameMax)}   ${pct(r.over20)}   ${pct(r.over50)}   ${ms(r.updatesPerSecond)}   ${ms(r.scriptMs)}     ${ms(r.layouts)}    ${ms(r.forcedLayout)}  ${(r.shiftNoInput ?? 0).toFixed(3)}  ${ms(r.lastMutation)}`,
      );
  }
  const idle = Object.entries(P).filter(([, r]) => 'scriptMsPerSecond' in r);
  if (idle.length) {
    console.log(
      'idle (per second)'.padEnd(54) +
        ' script ms  task ms  map draws  nodes replaced  callbacks  layouts  endless animations',
    );
    for (const [key, r] of idle)
      console.log(
        key.padEnd(54) +
          `   ${String(round(r.scriptMsPerSecond)).padStart(6)}  ${String(round(r.taskMsPerSecond)).padStart(7)}  ${String(round(r.mapDrawsPerSecond)).padStart(9)}  ${String(round(r.mapNodesReplacedPerSecond, 0)).padStart(14)}  ${String(round(r.callbacksPerSecond)).padStart(9)}  ${String(round(r.layoutsPerSecond)).padStart(7)}  ${String(r.endlessAnimations).padStart(8)}`,
      );
  }
}
if (result.styles) {
  const s = result.styles;
  console.log(
    `\n== styling ==\nCSS ${(s.cssBytes / 1e6).toFixed(2)} MB in ${s.styleSheets} sheets, ${s.cssRules} rules · ${s.transitionRules} transition rules (${s.transitionRulesAll} "all", ${s.transitionRulesLayout} layout, ${s.transitionRulesCompositedOnly} transform/opacity only) · ${s.animationRules} animation rules (${s.endlessAnimationRules} endless) · will-change ${s.willChangeRules} · backdrop-filter ${s.backdropFilterRules} · big shadows ${s.bigShadowRules} · reduced-motion blocks ${s.reducedMotionBlocks}`,
  );
  console.log(
    `DOM elements: case open ${s.domNodesCaseOpen} (reader ${s.domNodesReader}, map ${s.domNodesMapBehindCase})`,
  );
}
