/* The v3.2 frame, in a real browser (docs/DESIGN.md; src/features/v32/chrome.js and chrome.css):

     node tools/v32/check-chrome.mjs http://127.0.0.1:8766/DKLA-v3.1.html [--shots DIR]

   1. The bar is 56 px with one hairline under it and three groups and nothing else: the mark and wordmark
      (then the breadcrumb), the command field centred on the window, and the instrument cluster (clock and
      version), Ask Dottie and the Library. Only Exo 2, Inter and the mono face are used in it.
   2. The breadcrumb is in the bar, on one line, and right at each level. A path longer than its room is
      shortened by design: a level is shown whole or folded into a "…" control that opens the whole path;
      the command field gives the last level room (down to 320 px, its right edge fixed); only then is the
      last level cut, at a word, with its whole text as its title. Held through a resize with the longest
      path in the data. A crumb and Back both navigate; the wordmark is the way Home, where the breadcrumb
      steps aside. Under 1024 px the path sits on the map.
   3. Ctrl/Cmd+K and "/" put the keyboard in the field from anywhere, but not while something is being typed
      into another field; the field shows the shortcut as this machine writes it.
   4. The empty palette has its sections: "On this entry" only when the reader offers facets, "Go to" (the
      Library's collections and classes, each count with its unit), "Recent" (the last five entries opened),
      Ask Dottie, and the keys in the footer.
   5. Up and Down move one highlight, Enter opens the highlighted row, Escape closes and hands the keyboard
      back to where it was.
   6. The Library is one dialog in four groups of at most eight; every row says how much is behind it and of
      what ("115 flowcharts · 975 steps") in the muted colour at 13 px, with a leader from its name to that
      count, and opens the right thing; a count that is not known yet shows nothing (not zero) and fills in
      when its data arrives. Under the title, what the map itself holds ("On the map 392 cases · ..."),
      counted from the open graph; in the footer, what is about the atlas (Guide, How to use this map,
      Sources and coverage, Patch notes with the version, Privacy).
   7. The splash line shows on Home only, and steps out while a dialog is open.
   8. No control in the bar, the palette or the Library is under 36 px.
   9. A fixed list of searches returns exactly the rows it returned before the frame was redrawn
      (tools/v32/search-baseline.json; see search-rows.mjs).
  10. The map's own controls: zoom is one segmented control on the 24 px gutter; the hint fades at the first
      thing done to the map and stays gone.
  11. Quiet beside the reading (docs/DESIGN.md rule 14): with a reader or a dialog open the clock does not
      flip and the fuel line and version lose their glow and their crossing band; on Home they light again.
  12. Stable places: the mark, Ask Dottie, the Library and the cluster are in the same place in every state;
      the field moves only when a path borrows room; the palette opens in one place; the Library's title
      and close button sit at the same offsets.
  13. No control without a word on it lacks a name: the few drawn-only controls (back, the three zoom
      buttons, close, and the path's "…") each carry a title and an aria-label.
  15. One instrument: from 1280 px the clock's frame holds the time and the version, the fuel gauge runs
      round both, and the small type stands on the digits' baseline.
  16. A result's name is cut only when its place would be left under 120 px; the words before a marked
      word are dropped at a word, never inside one, and the earlier ones stay in the page.
  14. The composition lint (tools/v32/composition.mjs) finds nothing in the bar, the breadcrumb, the Library
      or the palette through a resize from 1680 px to a phone. (A phone's result rows are two lines by
      design, a title over its place, which the lint reads as a wrapped label: they are not counted.) */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { BASELINE, QUERIES, ready, rowsFor } from './search-rows.mjs';
import { conformance } from './conformance.mjs';
import { composition } from './composition.mjs';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
const shotsAt = process.argv.indexOf('--shots'),
  shots = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
if (shots) await mkdir(shots, { recursive: true });
const browser = await chromium.launch();

async function open({ width = 1440, height = 900, mac = false, holdDictionary = false, init = null } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    colorScheme: 'dark',
    userAgent: mac
      ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
      : undefined,
  });
  // The lazy data blocks can be held back (a slow connection), then let through.
  let release;
  const held = new Promise((done) => (release = done));
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === address.origin && url.pathname === '/api/fuel')
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ fraction: 0.6, calibrated: true, updatedAt: '2026-11-18T12:00:00.000Z' }),
      });
    if (url.origin !== address.origin || url.pathname.startsWith('/api/'))
      return route.fulfill({ status: 204, body: '' });
    if (holdDictionary && url.pathname.startsWith('/assets/data/')) await held;
    return route.continue();
  });
  await context.addInitScript(() => localStorage.setItem('dkla.guide.v1', 'seen'));
  if (mac)
    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'MacIntel' });
      Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => undefined });
    });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(address.href, { waitUntil: 'commit', timeout: 180_000 });
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 180_000 });
  await page.waitForFunction(
    () => window.DKLAChrome && document.documentElement.classList.contains('v32-chrome'),
  );
  if (!holdDictionary) await ready(page);
  return { context, page, errors, release };
}
async function snap(page, name) {
  if (!shots) return;
  // Panels arrive over 0.2 s; a picture taken on the way shows them half there.
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(shots, name + '.png') });
}
let failures = 0;
// DKLA_CHROME_ONLY="breadcrumb,long path" runs only the checks whose names hold one of those words (for
// working on one of them; the pass itself always runs them all).
const only = (process.env.DKLA_CHROME_ONLY || '')
  .split(',')
  .map((word) => word.trim())
  .filter(Boolean);
async function check(name, run) {
  if (only.length && !only.some((word) => name.includes(word))) return;
  try {
    await run();
    console.log('ok   ' + name);
  } catch (error) {
    failures++;
    // Where in this file it stopped (a timed-out wait says nothing else about which one it was).
    const at = /check-chrome\.mjs:(\d+)/.exec(String(error.stack || ''));
    console.log(
      'FAIL ' +
        name +
        (at ? ' (line ' + at[1] + ')' : '') +
        '\n     ' +
        String(error.message || error)
          .split('\n')
          .join('\n     '),
    );
  }
}
// Shut whatever a row opened, so the next step starts from the map.
async function settle(page) {
  await page.evaluate(() => {
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    if (window.SCOTUSHistory?.state().open) window.SCOTUSHistory.close();
    if (typeof closeSearch === 'function') closeSearch();
    document.activeElement?.blur?.();
  });
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
}
const openLibraryOn = async (page) => {
  await page.locator('#moreBtn').click();
  await page.locator('#libraryDialog[open] .v32-row').first().waitFor();
  // Arrived: it scales in over 0.2 s, and a box measured on the way is a little small.
  await page.waitForFunction(() => !document.getElementById('libraryDialog').getAnimations().length);
};
const goHome = async (page) => {
  await settle(page);
  await page.evaluate(() => {
    if (typeof setReader === 'function') setReader(false);
    selected = null;
    renderInspector();
    home('Atlas');
  });
  await page.waitForFunction(() => !document.documentElement.classList.contains('dkla-off-home'));
};
// What the page says of its own frame, read in one go.
const frame = (page) =>
  page.evaluate(() => {
    const header = document.querySelector('header.study-header');
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
    };
    const shown = (el) =>
      !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const name = (el) => (el.id ? '#' + el.id : '.' + el.classList[0]);
    const inFlow = [...header.children].filter(
      (el) => shown(el) && !['absolute', 'fixed'].includes(getComputedStyle(el).position),
    );
    const faces = new Set();
    for (const el of header.querySelectorAll('*')) {
      if (el.closest('#searchResults, dialog, svg, .ask-bar-dottie') || !shown(el)) continue;
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      faces.add(getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim());
    }
    const right = header.querySelector('.v32-bar-right'),
      left = header.querySelector('.v32-bar-left'),
      field = header.querySelector('.study-search'),
      style = getComputedStyle(header);
    return {
      height: box(header).h,
      hairline: [style.borderBottomWidth, style.borderBottomStyle, style.borderTopWidth],
      groups: inFlow.map(name),
      left: [...left.children].filter(shown).map(name),
      right: [...right.children].filter(shown).map(name),
      cluster: [...right.querySelector('.v32-cluster').children]
        .filter((el) => shown(el) && getComputedStyle(el).position !== 'absolute')
        .map(name),
      field: box(field),
      placeholder: document.getElementById('search').placeholder,
      key: document.getElementById('searchKey').textContent,
      faces: [...faces].sort(),
      askLabel: header.querySelector('.ask-bar')?.textContent.trim(),
      askFace: !!header.querySelector('.ask-bar .v32-ask-face svg'),
      library: document.getElementById('moreBtn').textContent.trim(),
      window: innerWidth,
    };
  });
const trail = (page) =>
  page.evaluate(() => {
    const nav = document.querySelector('nav.map-nav'),
      crumb = document.getElementById('geoBreadcrumb'),
      shown = (el) => el.getClientRects().length > 0;
    const r = nav.getBoundingClientRect();
    const parts = [...crumb.children].filter(shown);
    // A label the browser has clipped is narrower than it would be with room to spare.
    const actual = parts.map((el) => el.getBoundingClientRect().width);
    crumb.classList.add('v32-trail-measure');
    const natural = parts.map((el) => el.getBoundingClientRect().width);
    crumb.classList.remove('v32-trail-measure');
    const field = document.querySelector('.study-header .study-search').getBoundingClientRect();
    const last = [...crumb.querySelectorAll('button')].at(-1);
    return {
      inBar: !!nav.closest('.v32-bar-left'),
      onMap: nav.parentElement.id === 'studyMain',
      shown: shown(nav),
      bottom: r.bottom,
      right: r.right,
      crumbs: [...crumb.querySelectorAll('button:not(.v32-crumb-more)')].map((b) => b.textContent.trim()),
      // what is drawn, in order: "Atlas › … › Bargained-for exchange"
      text: parts.map((el) => el.textContent.trim()).join(' '),
      lines: new Set(parts.map((el) => Math.round(el.getBoundingClientRect().top + el.offsetHeight / 2)))
        .size,
      clipped: parts.filter((el, i) => natural[i] - actual[i] > 0.01).map((el) => el.textContent.trim()),
      last: last
        ? { text: last.textContent.trim(), title: last.title, label: last.getAttribute('aria-label') }
        : null,
      cut: crumb.classList.contains('v32-trail-cut'),
      more: !!crumb.querySelector('.v32-crumb-more'),
      back: shown(document.getElementById('studyBack')),
      field: { x: field.x, w: field.width, right: field.right },
    };
  });
const palette = (page) =>
  page.evaluate(() => {
    const list = document.getElementById('searchResults');
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    return {
      open: !list.hidden,
      sections: [...list.querySelectorAll(':scope > .v32-section')].map((section) => ({
        name: section.getAttribute('aria-label'),
        rows: [...section.querySelectorAll('button')].map((row) => ({
          id: row.dataset.v32Row || '',
          label: text(row.querySelector('.v32-row-label, strong')),
          meta: text(row.querySelector('.v32-row-meta')),
          height: row.getBoundingClientRect().height,
        })),
      })),
      keys: text(list.querySelector(':scope > .v32-keys')),
      keysLast: list.lastElementChild?.classList.contains('v32-keys') || false,
      selected: [...list.querySelectorAll('.v32-selected')].map((row) =>
        text(row.querySelector('.v32-row-label, strong')),
      ),
      current: list.querySelectorAll('[aria-current="true"]').length,
      focus: document.activeElement?.id || document.activeElement?.tagName,
    };
  });
// What each row says is behind it, worked out here from the page's data, independently of the code that
// draws it: the number and what it counts.
const expectedCounts = (page) =>
  page.evaluate(() => {
    const block = (id) => JSON.parse(document.getElementById(id).textContent);
    const say = (value, one, many) => `${value.toLocaleString('en-US')} ${value === 1 ? one : many}`;
    const charts = block('dklaFlowchartsData');
    return {
      timelines: say(window.DKLATimelines.list().length, 'timeline', 'timelines'),
      flowcharts:
        say(charts.length, 'flowchart', 'flowcharts') +
        ' · ' +
        say(
          charts.reduce((sum, chart) => sum + chart.nodes.length, 0),
          'step',
          'steps',
        ),
      canons: say(block('dklaCanonsData').length, 'canon', 'canons'),
      dictionary: say(window.DKLA.glossaryTerms().length, 'term', 'terms'),
      lectures: say(block('dklaLecturesData').length, 'lecture', 'lectures'),
      sessions: say(
        Object.keys(data.corpus.assignmentTitles).length +
          data.lrsCorpus.classes.length +
          data.nodes.filter((node) => /^cp-week-\d+$/.test(node.id)).length,
        'session',
        'sessions',
      ),
      authorities: say(window.DKLAAuthorities.data.entries.length, 'provision', 'provisions'),
      scotus: say(Object.keys(window.SCOTUSHistory.data.people).length, 'justice', 'justices'),
      supporting: say(
        window.DKLABriefs.data.entries.length - Object.keys(window.DKLABriefs.data.map).length,
        'case',
        'cases',
      ),
      textbook: say(data.corpus.sourcePageCount, 'page', 'pages'),
      drill: say(window.DKLAStudy.entries().length, 'entry', 'entries'),
      pairs: say(window.DKLAStudy.pairs().length, 'pair', 'pairs'),
    };
  });
// The collections, then the classes: the palette's "Go to" (what only the Library lists is left out there).
const GO_TO = [
  'timelines',
  'flowcharts',
  'canons',
  'dictionary',
  'authorities',
  'scotus',
  'sessions',
  'lectures',
];
const LIBRARY = {
  Collections: ['timelines', 'flowcharts', 'canons', 'dictionary', 'authorities', 'scotus', 'supporting'],
  Classes: ['sessions', 'lectures', 'textbook'],
  Study: ['drill', 'pairs', 'sheets', 'progress'],
  Yours: ['add', 'connect', 'path', 'save'],
};
// The footer: what is about the atlas itself. (Then the Privacy link.)
const ABOUT = ['guide', 'help', 'scope', 'patch'];
// The longest path in the data ("Atlas › Legislation and the Regulatory State › Legislative process and
// statutory interpretation › Katzmann: methods and legislative context", found by walking every entry),
// and the one the owner's critique named.
const LONGEST = 'lrs-k-congress',
  LONGEST_LAST = 'Katzmann: methods and legislative context';

try {
  const { context, page, errors } = await open();
  const openLibrary = () => openLibraryOn(page);

  /* ---------- 1. the bar ---------- */
  await check('the bar is 56 px, one hairline, three groups and nothing else', async () => {
    const f = await frame(page);
    assert.equal(f.height, 56, 'bar height');
    assert.deepEqual(f.hairline, ['1px', 'solid', '0px'], 'one hairline, under the bar');
    assert.deepEqual(f.groups, ['.v32-bar-left', '.study-search', '.v32-bar-right']);
    // Home: the mark and wordmark, and the splash line (checked below); no breadcrumb.
    assert.equal(f.left[0], '#atlasHome');
    assert.ok(!f.left.includes('.map-nav'), 'no breadcrumb on Home: ' + f.left);
    assert.deepEqual(f.right, ['.v32-cluster', '.ask-bar', '#moreBtn']);
    assert.deepEqual(f.cluster, ['.ny-clock', '.dkla-release'], 'the clock, then the version');
    assert.equal(f.field.h, 36, 'the field is one control high');
    assert.ok(f.field.w >= 440 && f.field.w <= 520, `the field is ${f.field.w}px wide`);
    assert.ok(
      Math.abs(f.field.x + f.field.w / 2 - f.window / 2) <= 2,
      `the field is centred on the window: ${f.field.x + f.field.w / 2} of ${f.window}`,
    );
    assert.equal(f.placeholder, 'Search or jump to…');
    assert.equal(f.key, 'Ctrl K');
    assert.equal(f.askLabel, 'Ask Dottie');
    assert.ok(f.askFace, "Ask Dottie's button carries her face");
    assert.equal(f.library, 'Library');
    for (const face of f.faces)
      assert.match(face, /Exo 2|Inter|JetBrains Mono/, 'a fourth typeface in the bar: ' + f.faces.join(', '));
    await snap(page, 'chrome-1-home');
  });
  await check('nothing in the bar, the palette or the Library is under 36 px', async () => {
    const small = async (root) => {
      const c = await conformance(page, root);
      return Object.entries(c.small || {}).map(([size, hit]) => `${size} ${hit.examples.join(' ')}`);
    };
    assert.deepEqual(await small('header.study-header'), [], 'the bar');
    await page.locator('#search').focus();
    await page.locator('#searchResults .v32-row').first().waitFor();
    assert.deepEqual(await small('#searchResults'), [], 'the empty palette');
    await rowsFor(page, 'hamer');
    assert.deepEqual(await small('#searchResults'), [], 'search results');
    await settle(page);
    await openLibrary();
    const library = await small('#libraryDialog');
    await settle(page);
    assert.deepEqual(library, [], 'the Library');
    assert.deepEqual(await small('.study-zoom'), [], 'the zoom control');
  });

  /* ---------- 15. one instrument ---------- */
  await check(
    'the instrument: one frame holds the time and the version, and the gauge runs round both',
    async () => {
      await page.waitForFunction(() => document.querySelector('.ny-clock .ny-fuel-track')?.getAttribute('d'));
      const i = await page.evaluate(() => {
        const box = (selector) => document.querySelector(selector).getBoundingClientRect();
        const clock = box('.study-header .ny-clock'),
          time = box('.ny-clock .ny-time'),
          version = box('.study-header .dkla-release'),
          gauge = box('.ny-clock .ny-fuel-track'),
          cluster = box('.v32-cluster'),
          // where a line of type stands: the bottom of a box as tall as its capitals would be
          base = (selector) => {
            const el = document.querySelector(selector),
              range = document.createRange();
            range.selectNodeContents(el);
            const r = range.getBoundingClientRect(),
              style = getComputedStyle(el),
              // JetBrains Mono: ascent 1.02, descent 0.3 of the size, set in a line of its line-height
              size = parseFloat(style.fontSize);
            return r.top + (r.height - 1.32 * size) / 2 + 1.02 * size;
          };
        return {
          frame: [clock.left, clock.right].map(Math.round),
          cluster: [cluster.left, cluster.right].map(Math.round),
          gauge: [gauge.left, gauge.right].map(Math.round),
          height: clock.height,
          timeIn: time.left > clock.left && time.right < version.left,
          versionIn: version.left > clock.left && version.right < clock.right && version.top > clock.top,
          rule: getComputedStyle(document.querySelector('.study-header .ny-clock'), '::after').width,
          baselines: [
            '.ny-clock .ny-time .flip .half.top',
            '.ny-clock .ny-meridiem',
            '.study-header .dkla-release',
          ].map((selector) => Math.round(base(selector) * 10) / 10),
        };
      });
      assert.deepEqual(i.frame, i.cluster, 'the frame is the whole cluster');
      assert.equal(i.height, 36, 'the frame is one control high');
      assert.ok(i.timeIn, 'the time stands left of the version, inside the frame');
      assert.ok(i.versionIn, 'the version stands inside the frame: ' + JSON.stringify(i));
      assert.equal(i.rule, '1px', 'a hairline between the time and the version');
      assert.ok(
        Math.abs(i.gauge[0] - i.frame[0]) <= 1 && Math.abs(i.gauge[1] - i.frame[1]) <= 1,
        `the gauge runs round the whole frame: ${i.gauge} of ${i.frame}`,
      );
      const [, meridiem, version] = i.baselines;
      assert.ok(
        Math.abs(meridiem - version) <= 1,
        `"PM" and the version stand on one line: ${i.baselines.join(', ')}`,
      );
    },
  );

  /* ---------- 16. a result's name and the words before its match ---------- */
  await check(
    "a result's name is whole wherever it fits; the words before a match are cut at a word",
    async () => {
      const rows = async (words) => {
        await rowsFor(page, words);
        await page.locator('#searchResults .search-snippet').first().waitFor();
        return page.evaluate(() =>
          [...document.querySelectorAll('#searchResults button[data-result-type]')].map((row) => {
            const name = row.querySelector('strong'),
              style = getComputedStyle(row),
              room = row.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
              far = row.querySelector('.search-lead-far'),
              lead = row.querySelector('.search-lead');
            return {
              name: name.textContent,
              cut: name.scrollWidth > name.clientWidth,
              width: name.getBoundingClientRect().width,
              room,
              lead: lead
                ? {
                    far: far ? far.textContent : '',
                    farWidth: far ? far.getBoundingClientRect().width : 0,
                    shown: [...lead.childNodes]
                      .filter((node) => node.nodeType === 3)
                      .map((node) => node.textContent)
                      .join(''),
                    mark: getComputedStyle(lead, '::before').content,
                  }
                : null,
            };
          }),
        );
      };
      const chevron = await rows('chevron');
      assert.ok(chevron.length > 8, 'results for "chevron"');
      for (const row of chevron)
        if (row.cut)
          assert.ok(
            row.width >= row.room - 133,
            `"${row.name}" is cut at ${Math.round(row.width)}px of ${Math.round(row.room)}px: its place took more than 120px`,
          );
      const whole = chevron.find(
        (row) => row.name === 'What the assigned empirical studies say about Chevron',
      );
      assert.ok(whole && !whole.cut, 'a name of 53 letters is shown whole in a wide window');
      const leads = (await rows('redundant, imperti')).concat(chevron).filter((row) => row.lead?.far);
      assert.ok(leads.length > 0, 'a passage with more words before its match than a row can show');
      for (const { name, lead } of leads) {
        assert.match(lead.far, /\s$/, `${name}: the words out of sight end inside a word: "${lead.far}"`);
        assert.match(lead.shown, /^\S/, `${name}: the words in sight start mid-way: "${lead.shown}"`);
        assert.ok(lead.shown.length <= 18, `${name}: ${lead.shown.length} letters before the match`);
        assert.ok(lead.farWidth <= 1, name + ': the earlier words are in sight');
        assert.match(lead.mark, /…/, name + ': an ellipsis says words were left out');
      }
      await settle(page);
      await page.evaluate(() => {
        const field = document.getElementById('search');
        field.value = '';
        field.dispatchEvent(new Event('input', { bubbles: true }));
      });
    },
  );

  /* ---------- 7. the splash line ---------- */
  await check(
    'the splash line shows on Home only, beside the wordmark, and steps out for a dialog',
    async () => {
      const splash = () =>
        page.evaluate(() => {
          const el = document.querySelector('.dkla-splash'),
            brand = document.getElementById('atlasHome').getBoundingClientRect(),
            r = el.getBoundingClientRect();
          return {
            inLeft: !!el.closest('.v32-bar-left'),
            shown: el.dataset.shown,
            drawn: el.getClientRects().length > 0 && Number(getComputedStyle(el).opacity) > 0.99,
            afterBrand: r.left >= brand.right - 1,
            inBar: r.top >= 0 && r.bottom <= 56,
            text: el.textContent.trim(),
            why: el.dataset.hiddenBy || '',
          };
        });
      await page.waitForFunction(() => document.querySelector('.dkla-splash')?.dataset.shown === 'true');
      await page.waitForFunction(
        () => Number(getComputedStyle(document.querySelector('.dkla-splash')).opacity) > 0.99,
      );
      let s = await splash();
      assert.ok(s.inLeft && s.drawn && s.afterBrand && s.inBar, 'on Home: ' + JSON.stringify(s));
      assert.ok(s.text.length > 3, 'a line is shown');
      // A dialog over the page: it steps out, and comes back when the dialog closes.
      await page.locator('#moreBtn').click();
      await page.waitForFunction(() => document.querySelector('.dkla-splash').dataset.shown === 'false');
      assert.equal((await splash()).why, 'dialog');
      await settle(page);
      await page.waitForFunction(() => document.querySelector('.dkla-splash').dataset.shown === 'true');
      // A course: gone, and the breadcrumb is where it was.
      await page.evaluate(() => home('Contracts'));
      await page.waitForFunction(() => document.querySelector('.dkla-splash').dataset.shown === 'false');
      await page.waitForFunction(() => !document.querySelector('.dkla-splash').getClientRects().length);
      assert.equal((await splash()).why, 'not home');
      // An entry open: still gone.
      await page.evaluate(() => goNode('hamer', true));
      await page.waitForFunction(() => !document.getElementById('inspector').hidden);
      assert.equal((await splash()).shown, 'false');
      await goHome(page);
      await page.waitForFunction(() => document.querySelector('.dkla-splash').dataset.shown === 'true');
    },
  );

  /* ---------- 2. the breadcrumb ---------- */
  await check('the breadcrumb is in the bar, on one line, and right at each level', async () => {
    let t = await trail(page);
    assert.ok(t.inBar, 'the trail is in the bar');
    assert.equal(t.shown, false, 'on Home it steps aside');
    assert.deepEqual(t.crumbs, ['Atlas']);
    const rest = t.field;
    await page.evaluate(() => home('Contracts'));
    await page.waitForFunction(() => document.querySelector('nav.map-nav').getClientRects().length > 0);
    t = await trail(page);
    assert.equal(t.text, 'Atlas › Contracts', 'a course');
    assert.ok(t.bottom <= 56 && t.back, 'in the bar, with the way back: ' + JSON.stringify(t));
    assert.equal(t.cut, false);
    await snap(page, 'chrome-2-course');
    await page.evaluate(() => goRegion('consideration'));
    await page.waitForFunction(() => document.querySelectorAll('#geoBreadcrumb button').length === 3);
    t = await trail(page);
    assert.equal(t.text, 'Atlas › Contracts › Consideration', 'a subject');
    assert.deepEqual(t.field, rest, 'a path that fits leaves the field where it was');
    // An entry: four levels are more than the bar has room for at 1440 px. The middle folds into "…",
    // the first level and the last stay whole, and the field has not moved.
    await page.evaluate(() => goNode('hamer', true));
    await page.waitForFunction(
      () => document.querySelectorAll('#geoBreadcrumb button:not(.v32-crumb-more)').length === 4,
    );
    t = await trail(page);
    assert.deepEqual(t.crumbs, ['Atlas', 'Contracts', 'Consideration', 'Bargained-for exchange']);
    assert.equal(t.text, 'Atlas › … › Bargained-for exchange', 'the middle folds; the ends stay');
    assert.ok(t.cut && t.more, 'a folded trail says so and offers the whole path');
    assert.equal(t.lines, 1, 'one line');
    assert.deepEqual(t.clipped, [], 'nothing is clipped by the browser');
    assert.equal(t.last.title, 'Bargained-for exchange', 'a crumb says its whole name on hover');
    assert.deepEqual(t.field, rest, 'folding was enough: the field has not moved');
    await snap(page, 'chrome-3-entry');
    // The same when an entry is opened straight from Home (the trail is fitted as it comes into the bar).
    await goHome(page);
    await page.evaluate(() => goNode('hamer', true));
    await page.waitForFunction(() => document.querySelector('nav.map-nav').getClientRects().length > 0);
    const direct = await trail(page);
    assert.equal(direct.text, t.text, 'from Home: ' + direct.text);
    await page.evaluate(() => goRegion('consideration'));
    await page.evaluate(() => goNode('hamer', true));
    await page.waitForFunction(() => selected?.id === 'hamer' && S.history.length > 0);
    // "…" opens the whole path, every level by its whole name, where you are marked; a level in it navigates.
    await page.locator('#geoBreadcrumb .v32-crumb-more').click();
    const whole = page.locator('#v32Path button');
    await whole.first().waitFor();
    assert.deepEqual(await whole.allInnerTexts(), [
      'Atlas',
      'Contracts',
      'Consideration',
      'Bargained-for exchange',
    ]);
    assert.equal(await whole.last().getAttribute('aria-current'), 'location');
    await whole.nth(2).click();
    await page.waitForFunction(() => S.region === 'consideration' && !S.district && !selected);
    assert.equal(await page.locator('#v32Path').isVisible(), false, 'and the path closes');
    // Back returns; a crumb navigates; the wordmark goes Home.
    await page.locator('#studyBack').click();
    await page.waitForFunction(() => selected?.id === 'hamer');
    await page.evaluate(() => goRegion('consideration'));
    await page.waitForFunction(() => S.region === 'consideration' && !selected);
    await page.locator('#geoBreadcrumb button', { hasText: 'Contracts' }).click();
    await page.waitForFunction(() => S.scope === 'Contracts' && !S.region);
    await page.locator('#atlasHome').click();
    await page.waitForFunction(() => S.scope === 'Atlas' && !S.region && !selected);
    await goHome(page);
    assert.equal((await trail(page)).shown, false, 'Home again');
    // Nothing of it is left over the map.
    assert.equal(await page.locator('#studyMain > .map-nav').count(), 0);
  });
  await check(
    'a long path: a course by its short name, the field gives the last level room, its right edge fixed',
    async () => {
      await goHome(page);
      const rest = (await trail(page)).field;
      await page.evaluate((id) => goNode(id, true), LONGEST);
      await page.waitForFunction(() => document.querySelector('nav.map-nav').getClientRects().length > 0);
      const t = await trail(page);
      assert.equal(t.crumbs[1], 'LRS', 'the course by the name Home gives it');
      assert.equal(
        await page.locator('#geoBreadcrumb [data-study-scope]').nth(1).getAttribute('title'),
        'Legislation and the Regulatory State',
        'its whole name is its title',
      );
      // 1440 px: the last level is whole because the field gave up some of its width.
      assert.equal(t.text, 'Atlas › … › ' + LONGEST_LAST);
      assert.deepEqual(t.clipped, []);
      assert.equal(t.lines, 1);
      assert.ok(t.field.w < rest.w && t.field.w >= 320, `the field gave room: ${rest.w} to ${t.field.w}`);
      assert.ok(Math.abs(t.field.right - rest.right) < 0.5, "the field's right edge has not moved");
      assert.ok(t.right <= t.field.x - 8, 'the path ends before the field starts');
      await snap(page, 'chrome-3b-long-path');
      // The whole path names the course in full.
      await page.locator('#geoBreadcrumb .v32-crumb-more').click();
      assert.deepEqual(await page.locator('#v32Path button').allInnerTexts(), [
        'Atlas',
        'Legislation and the Regulatory State',
        'Legislative process and statutory interpretation',
        LONGEST_LAST,
      ]);
      await page.keyboard.press('Escape');
      // Back on Home the field is where it was.
      await goHome(page);
      assert.deepEqual((await trail(page)).field, rest, 'Home: the field is back');
    },
  );
  await check(
    'the longest path through a resize: one line, whole or folded, cut only at a word and only last',
    async () => {
      const wrong = [];
      const seen = new Set();
      for (let width = 1680; width >= 600; width -= 60) {
        await page.setViewportSize({ width, height: 900 });
        // Up to 860 px a reader leaves no room for a path on the map: looked at without one there.
        await page.evaluate(
          ([id, bare]) => {
            goNode(id, true);
            if (bare) setReader(false);
          },
          [LONGEST, width <= 860],
        );
        // (the path changes places when the window crosses 1024 px, a moment after the resize)
        await page.waitForFunction((bar) => {
          const nav = document.querySelector('nav.map-nav');
          return nav.getClientRects().length > 0 && !!nav.closest('.v32-bar-left') === bar;
        }, width >= 1024);
        const t = await trail(page);
        const say = (what) => wrong.push(`${width}px: ${what} [${t.text}]`);
        seen.add(t.text);
        if (t.inBar !== width >= 1024) say(width >= 1024 ? 'not in the bar' : 'not on the map');
        if (t.lines !== 1) say(t.lines + ' lines');
        if (t.clipped.length) say('clipped by the browser: ' + t.clipped.join(' | '));
        if (/^›|›$|› ›/.test(t.text)) say('a separator without its label');
        // The last level: whole, or cut at a word with "…" and its whole text as title and name.
        if (t.last.text !== LONGEST_LAST) {
          const kept = t.last.text.replace(/…$/, '');
          if (!t.last.text.endsWith('…')) say('the last level is cut without saying so');
          if (!(LONGEST_LAST.startsWith(kept) && /^[\s:,]/.test(LONGEST_LAST.slice(kept.length))))
            say('the last level is cut inside a word');
          if (/\b(and|of|the)$/.test(kept)) say('the cut ends on a loose word');
          if (t.last.title !== LONGEST_LAST || t.last.label !== LONGEST_LAST)
            say('a cut level does not carry its whole text');
          if (t.inBar && t.field.w > 321) say(`cut while the field is still ${t.field.w}px wide`);
        }
        if (t.inBar && t.right > t.field.x - 8) say('the path runs into the field');
        if (!t.inBar && t.right > width - 23) say('the path runs past the map');
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await goHome(page);
      assert.deepEqual(wrong, []);
      assert.ok(seen.size >= 3, 'the path took several shapes on the way: ' + [...seen].join(' | '));
    },
  );

  /* ---------- 3. the shortcuts ---------- */
  await check('Ctrl+K and "/" put the keyboard in the field, but not while typing elsewhere', async () => {
    const at = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
    await page.keyboard.press('Control+k');
    assert.equal(await at(), 'search', 'Ctrl+K');
    assert.ok((await palette(page)).open, 'and the palette opens');
    await page.keyboard.press('Escape');
    assert.notEqual(await at(), 'search', 'Escape leaves the field');
    assert.equal((await palette(page)).open, false);
    await page.keyboard.press('/');
    assert.equal(await at(), 'search', 'slash');
    assert.equal(await page.locator('#search').inputValue(), '', 'the slash is not typed into the field');
    await page.keyboard.press('Escape');
    // Typing into another field (the dictionary's): the keys stay there.
    await page.evaluate(() => window.DKLA.openTerm());
    const box = page.locator('#glossaryDialog[open] input').first();
    await box.waitFor();
    await box.focus();
    await page.keyboard.type('a/b');
    await page.keyboard.press('Control+k');
    assert.equal(await box.inputValue(), 'a/b', 'the slash was typed where the keyboard was');
    assert.ok(await box.evaluate((el) => el === document.activeElement), 'Ctrl+K did not take the keyboard');
    await settle(page);
  });

  /* ---------- 4. the empty palette ---------- */
  await check(
    'the empty palette: Go to with counts and their units, Ask Dottie, the keys; no section without its data',
    async () => {
      const want = await expectedCounts(page);
      await page.locator('#search').focus();
      await page.locator('#searchResults .v32-row').first().waitFor();
      const p = await palette(page);
      const names = p.sections.map((s) => s.name);
      // (Recent has its own check below; entries were opened above.)
      assert.deepEqual(
        names.filter((name) => name !== 'Recent'),
        ['Go to', 'Ask'],
        'sections on Home: ' + names,
      );
      const go = p.sections[0].rows;
      assert.deepEqual(
        go.map((r) => r.id),
        GO_TO,
      );
      for (const row of go) {
        assert.equal(row.meta, want[row.id], `${row.label}: its count, and what it counts`);
        assert.equal(row.height, 36, `${row.label}: one row high`);
      }
      assert.match(p.sections.at(-1).rows[0].label, /^Ask Dottie/);
      assert.match(p.keys, /move.*open.*esc ?close/);
      assert.ok(p.keysLast, 'the keys are the footer');
      assert.deepEqual(p.selected, [], 'nothing is highlighted until a key says so');
      await snap(page, 'chrome-4-palette');
      await page.keyboard.press('Escape');
    },
  );
  await check('the empty palette: Recent lists the last entries opened, newest first', async () => {
    for (const id of ['hamer', 'lucy', 'hawkins']) {
      await page.evaluate((id) => goNode(id, true), id);
      await page.waitForFunction((id) => window.DKLAChrome.recent()[0] === id, id);
    }
    // With an entry open, that entry is not offered to itself.
    await page.locator('#search').focus();
    await page.locator('#searchResults .v32-row').first().waitFor();
    let recent = (await palette(page)).sections.find((s) => s.name === 'Recent');
    // (entries opened by the checks above come after these)
    assert.deepEqual(recent.rows.map((r) => r.label).slice(0, 2), ['Lucy v. Zehmer', 'Hamer v. Sidway']);
    await page.keyboard.press('Escape');
    await goHome(page);
    await page.locator('#search').focus();
    await page.locator('#searchResults .v32-row').first().waitFor();
    recent = (await palette(page)).sections.find((s) => s.name === 'Recent');
    assert.deepEqual(recent.rows.map((r) => r.label).slice(0, 3), [
      'Hawkins v. McGee',
      'Lucy v. Zehmer',
      'Hamer v. Sidway',
    ]);
    assert.ok(recent.rows.length <= 5, 'the last five at most');
    // A recent row opens its entry.
    await page.locator('#searchResults .v32-row', { hasText: 'Lucy v. Zehmer' }).click();
    await page.waitForFunction(() => selected?.id === 'lucy');
    assert.equal((await palette(page)).open, false, 'and the palette closes');
    await goHome(page);
  });
  await check('the empty palette: "On this entry" appears only when the reader offers facets', async () => {
    await page.evaluate(() => goNode('hamer', true));
    await page.waitForFunction(() => selected?.id === 'hamer');
    await page.locator('#search').focus();
    await page.locator('#searchResults .v32-row').first().waitFor();
    const has = async () => (await palette(page)).sections.some((s) => s.name === 'On this entry');
    // The reader's own pass adds window.DKLAReader.facets; until it does, there is no such section.
    if (!(await page.evaluate(() => typeof window.DKLAReader?.facets === 'function')))
      assert.equal(await has(), false, 'no API, no section');
    await page.keyboard.press('Escape');
    // With the API (stood in for here): its rows, with counts, and a row runs its own action.
    await page.evaluate(() => {
      window.__realReader = window.DKLAReader;
      window.DKLAReader = {
        ...(window.DKLAReader || {}),
        facets: () => [
          { id: 'cold', label: 'Cold Call', open: () => (window.__facet = 'cold') },
          { id: 'brief', label: 'Brief', open: () => (window.__facet = 'brief') },
          {
            id: 'timeline',
            label: 'Timeline',
            count: 6,
            unit: ['entry', 'entries'],
            open: () => (window.__facet = 'timeline'),
          },
          { id: 'flowchart', label: 'Flowchart steps', count: 1, unit: 'step', open: () => {} },
          // a number with nothing to say what it counts is not shown
          { id: 'rule', label: 'The rule', count: 3, open: () => {} },
          { label: 'No action: left out' },
        ],
      };
    });
    await page.locator('#search').focus();
    await page.locator('#searchResults [data-v32-facet]').first().waitFor();
    const p = await palette(page);
    assert.equal(p.sections[0].name, 'On this entry', 'it comes first');
    assert.deepEqual(
      p.sections[0].rows.map((r) => [r.label, r.meta]),
      [
        ['Cold Call', ''],
        ['Brief', ''],
        ['Timeline', '6 entries'],
        ['Flowchart steps', '1 step'],
        ['The rule', ''],
      ],
    );
    await snap(page, 'chrome-5-palette-entry');
    await page.locator('#searchResults [data-v32-facet]', { hasText: 'Timeline' }).click();
    assert.equal(await page.evaluate(() => window.__facet), 'timeline');
    assert.equal((await palette(page)).open, false);
    await page.evaluate(() => {
      if (window.__realReader) window.DKLAReader = window.__realReader;
      else delete window.DKLAReader;
    });
    await goHome(page);
  });

  /* ---------- 5. the keyboard ---------- */
  await check('Up and Down move one highlight; Enter opens it; the keyboard stays in the field', async () => {
    await page.keyboard.press('Control+k');
    await page.locator('#searchResults .v32-row').first().waitFor();
    await page.keyboard.press('ArrowDown');
    let p = await palette(page);
    assert.deepEqual(p.selected, ['Doctrine timelines']);
    assert.equal(p.current, 1, 'the highlighted row is marked for assistive technology');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    assert.deepEqual((await palette(page)).selected, ['Canons of construction']);
    await page.keyboard.press('ArrowUp');
    p = await palette(page);
    assert.deepEqual(p.selected, ['Flowcharts']);
    assert.equal(p.focus, 'search', 'the keyboard is still in the field');
    // The pointer moves the same highlight: there is only ever one.
    await page.locator('#searchResults .v32-row', { hasText: 'Dictionary' }).hover();
    assert.deepEqual((await palette(page)).selected, ['Dictionary']);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await snap(page, 'chrome-6-palette-selected');
    await page.keyboard.press('Enter');
    await page.locator('dialog#dklaFlowcharts[open]').waitFor();
    assert.equal((await palette(page)).open, false);
    // Closing what it opened does not hand the keyboard back to the field (which would reopen the list).
    await page.keyboard.press('Escape');
    await page.locator('dialog#dklaFlowcharts').waitFor({ state: 'hidden' });
    await page.waitForTimeout(300);
    p = await palette(page);
    assert.equal(p.open, false, 'the list stays shut');
    assert.notEqual(p.focus, 'search');
    await settle(page);
  });
  await check('a search: the first result is highlighted, Down moves, Enter opens that row', async () => {
    await rowsFor(page, 'hamer');
    let p = await palette(page);
    assert.deepEqual(p.selected, ['Hamer v. Sidway'], 'the first result');
    assert.ok(p.keysLast, 'the keys stay the footer under results');
    await page.keyboard.press('ArrowDown');
    p = await palette(page);
    assert.equal(p.selected.length, 1);
    assert.notEqual(p.selected[0], 'Hamer v. Sidway');
    const second = await page.evaluate(() => window.DKLAChrome.selected().dataset.searchId);
    await snap(page, 'chrome-7-results-selected');
    await page.keyboard.press('Enter');
    await page.waitForFunction((id) => selected?.id === id, second);
    assert.equal((await palette(page)).open, false);
    // Enter with nothing moved opens the first result, as it always did.
    await rowsFor(page, 'lucy v. zehmer');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => selected?.id === 'lucy');
    await page.evaluate(() => (document.getElementById('search').value = ''));
    await goHome(page);
  });
  await check('Escape closes the palette and hands the keyboard back', async () => {
    await page.locator('#studyFit').focus();
    await page.keyboard.press('Control+k');
    await page.locator('#searchResults .v32-row').first().waitFor();
    await page.keyboard.press('Escape');
    assert.equal((await palette(page)).open, false);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'studyFit');
  });

  /* ---------- 6. the Library ---------- */
  const library = () =>
    page.evaluate(() => {
      const dialog = document.getElementById('libraryDialog');
      const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
      const style = getComputedStyle(dialog),
        title = dialog.querySelector('h2');
      return {
        open: dialog.open,
        modal: dialog.matches(':modal'),
        radius: style.borderTopLeftRadius,
        title: text(title),
        titleFace: getComputedStyle(title).fontFamily.split(',')[0].replace(/["']/g, ''),
        titleSize: getComputedStyle(title).fontSize,
        closeButtons: dialog.querySelectorAll('.v32-shell-head button').length,
        scrim: getComputedStyle(dialog, '::backdrop').backgroundColor,
        blur: getComputedStyle(dialog, '::backdrop').backdropFilter,
        groups: Object.fromEntries(
          [...dialog.querySelectorAll('.v32-lib-group')].map((group) => [
            group.getAttribute('aria-label'),
            [...group.querySelectorAll('.v32-row')].map((row) => ({
              id: row.dataset.v32Row,
              label: text(row.querySelector('.v32-row-label')),
              meta: text(row.querySelector('.v32-row-meta')),
              metaSize: parseFloat(getComputedStyle(row.querySelector('.v32-row-meta')).fontSize),
              metaInk: getComputedStyle(row.querySelector('.v32-row-meta')).color,
              height: row.getBoundingClientRect().height,
              // the leader: how long it is drawn, and whether it lies between the name and the count
              leader: (() => {
                const lead = row.querySelector('.v32-row-lead');
                if (!lead || getComputedStyle(lead).visibility === 'hidden' || !lead.getClientRects().length)
                  return null;
                const box = lead.getBoundingClientRect(),
                  before = row.querySelector('.v32-row-note:not(:empty), .v32-row-label'),
                  note = row.querySelector('.v32-row-note:not(:empty)') || before,
                  meta = row.querySelector('.v32-row-meta').getBoundingClientRect();
                return {
                  width: box.width,
                  between: note.getBoundingClientRect().right <= box.left && box.right <= meta.left,
                };
              })(),
            })),
          ]),
        ),
        fill: style.backgroundColor,
        sum: text(dialog.querySelector('.v32-shell-sum')),
        sumSize: parseFloat(getComputedStyle(dialog.querySelector('.v32-shell-sum-counts')).fontSize),
        sumInk: getComputedStyle(dialog.querySelector('.v32-shell-sum-counts')).color,
        about: [...dialog.querySelectorAll('.v32-lib-foot [data-v32-row]')].map((el) => el.dataset.v32Row),
        foot: [...dialog.querySelectorAll('.v32-lib-foot .v32-quiet')].map(text),
        expanded: document.getElementById('moreBtn').getAttribute('aria-expanded'),
        menuHidden: document.getElementById('moreMenu').hidden,
      };
    });
  // Contrast of one colour on another (WCAG): both as the page computes them, "rgb(r, g, b)".
  const contrast = (ink, ground) => {
    const lum = (rgb) => {
      const [r, g, b] = rgb
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [hi, lo] = [lum(ink), lum(ground)].sort((a, b) => b - a);
    return (hi + 0.05) / (lo + 0.05);
  };
  await check('the Library: one dialog, four groups, each count with what it counts', async () => {
    const want = await expectedCounts(page);
    await openLibrary();
    const l = await library();
    assert.ok(l.open && l.modal, 'a modal dialog');
    assert.equal(l.radius, '12px');
    assert.equal(l.title, 'Library');
    assert.match(l.titleFace, /Exo 2/);
    assert.equal(l.titleSize, '22px');
    assert.equal(l.closeButtons, 1, 'one close button');
    assert.equal(l.blur, 'none', 'a flat scrim');
    assert.equal(l.expanded, 'true');
    assert.equal(l.menuHidden, false);
    assert.deepEqual(Object.keys(l.groups), Object.keys(LIBRARY));
    for (const [name, ids] of Object.entries(LIBRARY))
      assert.deepEqual(
        l.groups[name].map((r) => r.id),
        ids,
        name,
      );
    assert.ok(Object.keys(l.groups).length >= 4 && Object.keys(l.groups).length <= 6, 'four to six groups');
    for (const [name, rows] of Object.entries(l.groups))
      assert.ok(rows.length <= 8, `${name} has ${rows.length} rows: at most eight`);
    for (const row of Object.values(l.groups).flat()) {
      assert.equal(row.height, 36, row.label + ' is one row high');
      if (want[row.id]) assert.equal(row.meta, want[row.id], row.label + ': its count, and what it counts');
      // Never a bare number, never small and faint (docs/DESIGN.md rule 8).
      // A leader runs from the name to the count, and only where there is a count.
      if (row.meta) {
        assert.ok(row.leader, row.label + ': no leader to its count');
        assert.ok(row.leader.width >= 16, `${row.label}: its leader is ${row.leader.width}px`);
        assert.ok(row.leader.between, row.label + ': its leader is not between the name and the count');
      } else assert.equal(row.leader, null, row.label + ': a leader to nothing');
      if (row.meta) {
        assert.doesNotMatch(row.meta, /^[\d,]+$/, row.label + ': a bare number');
        assert.ok(row.metaSize >= 13, `${row.label}: its count is ${row.metaSize}px`);
        assert.ok(
          contrast(row.metaInk, l.fill) >= 4.5,
          `${row.label}: its count is ${contrast(row.metaInk, l.fill).toFixed(2)}:1`,
        );
      }
    }
    // The button says what is inside before it is pressed.
    const hint = await page.locator('#moreBtn').getAttribute('title');
    for (const word of ['timelines', 'flowcharts', 'dictionary', 'class sessions'])
      assert.ok(hint.includes(word), 'the Library button names ' + word + ': ' + hint);
    // The version readout beside the patch notes.
    const version = await page.evaluate(() =>
      document.querySelector('.study-header .dkla-release').textContent.trim(),
    );
    assert.deepEqual(l.about, ABOUT);
    assert.deepEqual(l.foot, [
      'Guide',
      'How to use this map',
      'Sources and coverage',
      'Patch notes ' + version,
      'Privacy',
    ]);
    // Under the title: what the map holds, counted here from the open graph.
    const onMap = await page.evaluate(() =>
      [
        ['Case', 'cases'],
        ['Concept', 'concepts'],
        ['Rule', 'rules'],
        ['Note', 'notes'],
        ['Hypothetical', 'hypotheticals'],
      ]
        .map(([kind, many]) => [data.nodes.filter((node) => node.kind === kind).length, many])
        .filter(([n]) => n > 1)
        .map(([n, many]) => `${n.toLocaleString('en-US')} ${many}`)
        .join(' · '),
    );
    assert.match(onMap, /^\d+ cases · \d+ concepts · \d+ rules/);
    assert.equal(l.sum, 'On the map ' + onMap);
    assert.ok(l.sumSize >= 13, `the readout under the title is ${l.sumSize}px`);
    assert.ok(contrast(l.sumInk, l.fill) >= 4.5, 'the readout under the title is too faint');
    // Nothing that only repeats the map.
    const labels = Object.values(l.groups)
      .flat()
      .map((r) => r.label);
    for (const gone of ['Choose a course', 'Browse subjects']) assert.ok(!labels.includes(gone), gone);
    await snap(page, 'chrome-8-library');
    // Up and Down walk the rows; Escape closes and the button gets the keyboard back.
    await page.locator('#libraryDialog .v32-row').first().focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(
      await page.evaluate(() => document.activeElement.dataset.v32Row),
      'flowcharts',
      'Down moves to the next row',
    );
    await page.keyboard.press('Escape');
    await page.locator('#libraryDialog').waitFor({ state: 'hidden' });
    const after = await library();
    assert.equal(after.expanded, 'false');
    assert.equal(after.menuHidden, true);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'moreBtn');
    // The scrim closes it too.
    await openLibrary();
    await page.mouse.click(40, 500);
    await page.locator('#libraryDialog').waitFor({ state: 'hidden' });
  });
  // What each row must have done once it is pressed. Each returns true when the right thing is on screen.
  const OPENS = {
    timelines: () => document.getElementById('r21Timelines').open,
    flowcharts: () => document.getElementById('dklaFlowcharts').open,
    canons: () => document.getElementById('dklaCanons').open,
    dictionary: () => document.getElementById('glossaryDialog').open,
    lectures: () =>
      document.getElementById('modal').open &&
      document.getElementById('modalTitle').textContent === 'Lecture notes' &&
      document.querySelectorAll('#modalBody .v32-index a.v32-row').length ===
        JSON.parse(document.getElementById('dklaLecturesData').textContent).length,
    sessions: () =>
      document.getElementById('modal').open &&
      /^(Assignment|Week|Class) \d+/.test(document.getElementById('modalTitle').textContent),
    authorities: () => /Rules & authorities/.test(document.getElementById('geoBreadcrumb').textContent),
    scotus: () => window.SCOTUSHistory.state().open === true,
    supporting: () => document.getElementById('r19Dialog').open,
    textbook: () => document.getElementById('bookDialog').open,
    drill: () => document.getElementById('r18Dialog').open && window.DKLAStudy.state().tab === 'drill',
    pairs: () => document.getElementById('r18Dialog').open && window.DKLAStudy.state().tab === 'pairs',
    sheets: () => document.getElementById('r18Dialog').open && window.DKLAStudy.state().tab === 'sheets',
    progress: () => document.getElementById('r18Dialog').open && window.DKLAStudy.state().tab === 'progress',
    add: () =>
      document.getElementById('modal').open &&
      /entry/i.test(document.getElementById('modalTitle').textContent),
    connect: () =>
      document.getElementById('modal').open &&
      /connection/i.test(document.getElementById('modalTitle').textContent),
    path: () =>
      document.getElementById('modal').open &&
      /path|trail|connection/i.test(document.getElementById('modalTitle').textContent),
    save: () =>
      document.getElementById('modal').open &&
      !!document.querySelector('#modalBody #portableSave, #modalBody #jsonSave'),
    patch: () => document.getElementById('patchNotesDialog').open,
  };
  await check(
    'the Library: every row opens the right thing, and the Library is gone when it does',
    async () => {
      const wrong = [];
      for (const id of [...Object.values(LIBRARY).flat(), 'patch']) {
        await goHome(page);
        await openLibrary();
        await page.locator(`#libraryDialog [data-v32-row="${id}"]`).click();
        try {
          await page.waitForFunction(OPENS[id], null, { timeout: 8000 });
        } catch {
          wrong.push(id + ' did not open');
          continue;
        }
        if (await page.evaluate(() => document.getElementById('libraryDialog').open))
          wrong.push(id + ' left the Library open');
        if (id === 'authorities') await page.evaluate(() => home('Atlas'));
      }
      assert.deepEqual(wrong, []);
      await goHome(page);
      // The lecture notes index: a row opens that class's notes.
      await openLibrary();
      await page.locator('#libraryDialog [data-v32-row="lectures"]').click();
      await page.locator('#modalBody .v32-index a.v32-row').first().click();
      await page.waitForFunction(() => /Class \d+$/.test(document.getElementById('modalTitle').textContent));
      assert.match(new URL(page.url()).hash, /^#lecture=/);
      await settle(page);
      await page.evaluate(() => history.replaceState(null, '', location.pathname));
      // The footer: two dialogs and a link.
      for (const [label, title] of [
        ['How to use this map', /./],
        ['Sources and coverage', /./],
      ]) {
        await openLibrary();
        await page.locator('#libraryDialog .v32-quiet', { hasText: label }).click();
        await page.locator('#modal[open]').waitFor();
        assert.match(await page.locator('#modalTitle').innerText(), title);
        assert.equal(await page.evaluate(() => document.getElementById('libraryDialog').open), false, label);
        await settle(page);
      }
      await openLibrary();
      const privacy = page.locator('#libraryDialog a.v32-quiet', { hasText: 'Privacy' });
      assert.equal(await privacy.getAttribute('href'), '/privacy.html');
      assert.equal(await privacy.getAttribute('target'), '_blank');
      await settle(page);
    },
  );
  await check(
    'the Library: Undo and Cold Calls appear only when there is something behind them',
    async () => {
      await openLibrary();
      const ids = async () =>
        page.evaluate(() =>
          [...document.querySelectorAll('#libraryDialog .v32-row')].map((r) => r.dataset.v32Row),
        );
      assert.ok(!(await ids()).includes('undo'), 'nothing to undo: no row');
      assert.ok(!(await ids()).includes('coldcalls'), 'no Cold Call index yet: no row');
      await settle(page);
      await page.evaluate(() => {
        undoStack.push(JSON.stringify(data));
        window.DKLAColdCallIndex = { count: 7, open: () => (window.__cold = 'opened') };
      });
      await openLibrary();
      assert.ok((await ids()).includes('undo'));
      const cold = page.locator('#libraryDialog [data-v32-row="coldcalls"]');
      assert.equal((await cold.locator('.v32-row-meta').innerText()).trim(), '7 cases');
      await cold.click();
      assert.equal(await page.evaluate(() => window.__cold), 'opened');
      await page.evaluate(() => {
        undoStack.pop();
        delete window.DKLAColdCallIndex;
      });
      await settle(page);
    },
  );

  /* ---------- 10. the map's own controls ---------- */
  await check(
    'zoom is one segmented control on the gutter; the hint fades at first use and stays gone',
    async () => {
      const zoom = await page.evaluate(() => {
        const el = document.querySelector('.study-zoom'),
          r = el.getBoundingClientRect(),
          main = document.getElementById('studyMain').getBoundingClientRect();
        return {
          left: r.left,
          fromBottom: main.bottom - r.bottom,
          height: r.height,
          buttons: [...el.querySelectorAll('button')].map((b) => ({
            label: b.getAttribute('aria-label'),
            title: b.title,
            icon: !!b.querySelector('svg'),
            text: b.textContent.trim(),
            w: b.getBoundingClientRect().width,
            h: b.getBoundingClientRect().height,
          })),
        };
      });
      assert.equal(zoom.left, 24, 'on the 24 px gutter');
      assert.equal(zoom.fromBottom, 24);
      assert.equal(zoom.height, 36);
      assert.deepEqual(
        zoom.buttons.map((b) => b.label),
        ['Zoom out', 'Fit this area', 'Zoom in'],
      );
      for (const b of zoom.buttons) {
        assert.ok(b.icon && !b.text, b.label + ' is a drawn icon, not a typed character');
        assert.ok(b.title, b.label + ' has a title');
        assert.deepEqual([b.w, b.h], [36, 36], b.label);
      }
      // The hint: there on a course in a tab that has not touched the map; gone after the first press.
      const fresh = await open();
      try {
        await fresh.page.evaluate(() => home('Contracts'));
        const hint = fresh.page.locator('#mapHint');
        await hint.waitFor({ state: 'visible' });
        const look = await hint.evaluate((el) => {
          const s = getComputedStyle(el),
            zoom = document.querySelector('.study-zoom').getBoundingClientRect(),
            r = el.getBoundingClientRect();
          return {
            border: s.borderTopWidth,
            fill: s.backgroundColor,
            centred: Math.abs(r.top + r.height / 2 - (zoom.top + zoom.height / 2)),
            text: el.textContent.trim(),
          };
        });
        assert.equal(look.border, '0px', 'quiet text, not a card');
        assert.equal(look.fill, 'rgba(0, 0, 0, 0)');
        assert.ok(look.centred <= 1, "on the zoom control's centre line");
        assert.ok(look.text.length > 8);
        // (The map's own box moves while the camera flies to the course; the area it sits in does not.)
        const area = await fresh.page.locator('#studyMain').boundingBox();
        await fresh.page.mouse.click(area.x + area.width - 30, area.y + 30);
        await hint.waitFor({ state: 'hidden' });
        await fresh.page.evaluate(() => home('Atlas'));
        await fresh.page.evaluate(() => home('Contracts'));
        await fresh.page.waitForTimeout(600);
        assert.equal(await hint.isVisible(), false, 'it does not come back');
        await fresh.page.reload({ waitUntil: 'commit' });
        await fresh.page.locator('html.dkla-boot-ready').waitFor({ timeout: 180_000 });
        await fresh.page.waitForFunction(() => window.DKLAChrome);
        await fresh.page.evaluate(() => home('Contracts'));
        await fresh.page.waitForTimeout(600);
        assert.equal(await hint.isVisible(), false, 'nor after a reload in the same tab');
        assert.deepEqual(fresh.errors, []);
      } finally {
        await fresh.context.close();
      }
    },
  );

  /* ---------- 9. search is unchanged ---------- */
  await check(
    `${QUERIES.length} searches return the rows they returned before the frame was redrawn`,
    async () => {
      const before = JSON.parse(await readFile(BASELINE, 'utf8'));
      const different = [];
      for (const q of QUERIES) {
        const now = await rowsFor(page, q);
        try {
          assert.deepEqual(now, before[q]);
        } catch (error) {
          different.push(`"${q}": ` + String(error.message).split('\n').slice(0, 12).join('\n       '));
        }
      }
      assert.deepEqual(different, []);
      await page.evaluate(() => (document.getElementById('search').value = ''));
      await settle(page);
    },
  );

  /* ---------- the Guide leaves the page ---------- */
  await check('the Library: Guide opens the guide', async () => {
    await context.route('**/how-to-use.html', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<title>guide</title>' }),
    );
    await goHome(page);
    await openLibrary();
    await Promise.all([
      page.waitForURL(/\/how-to-use\.html$/, { timeout: 15_000 }),
      page.locator('#libraryDialog [data-v32-row="guide"]').click(),
    ]);
  });
  if (errors.length) {
    failures++;
    console.log('FAIL page errors\n     ' + errors.join('\n     '));
  }
  await context.close();

  /* ---------- a count that arrives late ---------- */
  await check('a count that is not known yet shows nothing, and fills in when its data arrives', async () => {
    const slow = await open({ holdDictionary: true });
    try {
      const known = await slow.page.evaluate(() => window.DKLA.glossaryCount());
      if (known > 0) {
        // This build carries the dictionary in the page: there is no "before" to look at.
        console.log('     (the dictionary is in the page in this build: nothing to hold back)');
        return;
      }
      await slow.page.locator('#moreBtn').click();
      const meta = slow.page.locator('#libraryDialog [data-v32-row="dictionary"] .v32-row-meta');
      await meta.waitFor({ state: 'attached' });
      assert.equal((await meta.textContent()).trim(), '', 'nothing, not zero');
      assert.match(
        (
          await slow.page.locator('#libraryDialog [data-v32-row="flowcharts"] .v32-row-meta').textContent()
        ).trim(),
        /^\d+ flowcharts · [\d,]+ steps$/,
        'what is known is shown',
      );
      slow.release();
      await slow.page.waitForFunction(
        () =>
          /^[\d,]+ terms$/.test(
            document
              .querySelector('#libraryDialog [data-v32-row="dictionary"] .v32-row-meta')
              .textContent.trim(),
          ),
        null,
        { timeout: 60_000 },
      );
      assert.deepEqual(slow.errors, []);
    } finally {
      slow.release();
      await slow.context.close();
    }
  });

  /* ---------- a Mac ---------- */
  await check('on a Mac the field shows ⌘K, and Cmd+K puts the keyboard in it', async () => {
    const mac = await open({ mac: true });
    try {
      assert.equal(await mac.page.locator('#searchKey').innerText(), '⌘K');
      await mac.page.keyboard.press('Meta+k');
      assert.equal(await mac.page.evaluate(() => document.activeElement?.id), 'search');
      assert.deepEqual(mac.errors, []);
    } finally {
      await mac.context.close();
    }
  });

  /* ---------- narrower windows ---------- */
  for (const [width, height, want] of [
    [1180, 820, { right: ['.v32-cluster', '.ask-bar', '#moreBtn'], cluster: ['.dkla-release'] }],
    // (the version readout joins from 1100 px, so a path has room beside the field below that)
    [1024, 768, { right: ['.ask-bar', '#moreBtn'], cluster: [] }],
    [
      1920,
      1080,
      { right: ['.v32-cluster', '.ask-bar', '#moreBtn'], cluster: ['.ny-clock', '.dkla-release'] },
    ],
  ])
    await check(`${width} px: the same three groups, the field still centred`, async () => {
      const at = await open({ width, height });
      try {
        const f = await frame(at.page);
        assert.equal(f.height, 56);
        assert.deepEqual(f.groups, ['.v32-bar-left', '.study-search', '.v32-bar-right']);
        assert.deepEqual(f.right, want.right);
        assert.deepEqual(f.cluster, want.cluster);
        assert.ok(
          Math.abs(f.field.x + f.field.w / 2 - width / 2) <= 2,
          `centred: ${f.field.x + f.field.w / 2} of ${width}`,
        );
        assert.ok(f.field.w >= 320, `the field is ${f.field.w}px wide`);
        if (width === 1920) {
          assert.equal(f.field.w, 520);
          assert.ok(await at.page.locator('.ny-clock .ny-date').isVisible(), 'the date joins the clock');
        }
        const over = await at.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert.equal(over, 0, 'nothing runs past the window');
        await snap(at.page, 'chrome-9-home-' + width);
        assert.deepEqual(at.errors, []);
      } finally {
        await at.context.close();
      }
    });
  await check(
    'a phone: the path sits on the map, the Library keeps its label and cuts no name, a result takes two lines',
    async () => {
      const phone = await open({ width: 390, height: 844 });
      try {
        const p = await phone.page.evaluate(() => {
          const nav = document.querySelector('nav.map-nav');
          const more = document.getElementById('moreBtn');
          return {
            bar: document.querySelector('header.study-header').getBoundingClientRect().height,
            onMap: nav.parentElement.id === 'studyMain',
            shown: nav.getClientRects().length > 0,
            over: document.documentElement.scrollWidth - innerWidth,
            library: more.innerText.trim(),
            libraryRight: innerWidth - more.getBoundingClientRect().right,
            brandLeft: document.getElementById('atlasHome').getBoundingClientRect().left,
          };
        });
        assert.equal(p.bar, 56);
        assert.ok(p.onMap && !p.shown, 'on Home there is no path: ' + JSON.stringify(p));
        assert.equal(p.over, 0);
        assert.equal(p.library, 'Library', 'the Library button keeps its word');
        assert.deepEqual([p.brandLeft, p.libraryRight], [24, 24], 'the same 24 px gutters as a wide window');
        // A course: the path, on the map, on one line inside the gutters.
        await phone.page.evaluate(() => home('Contracts'));
        await phone.page.waitForFunction(
          () => document.querySelector('nav.map-nav').getClientRects().length > 0,
        );
        let t = await trail(phone.page);
        assert.ok(t.onMap && t.shown, 'the trail is on the map');
        assert.equal(t.text, 'Atlas › Contracts');
        // The longest path: folded, never clipped, inside the window.
        await phone.page.evaluate((id) => {
          goNode(id, true);
          setReader(false);
        }, LONGEST);
        await phone.page.waitForFunction(() => document.querySelectorAll('#geoBreadcrumb button').length > 3);
        t = await trail(phone.page);
        assert.equal(t.lines, 1);
        assert.deepEqual(t.clipped, []);
        assert.ok(t.right <= 390 - 23, 'inside the gutter: ' + t.right);
        assert.ok(t.more, 'with the whole path one press away: ' + t.text);
        await snap(phone.page, 'chrome-10-phone-path');
        // The Library fits, and no row's name is cut.
        await phone.page.evaluate(() => home('Atlas'));
        await openLibraryOn(phone.page);
        const lib = await phone.page.evaluate(() => {
          const d = document.getElementById('libraryDialog'),
            r = d.getBoundingClientRect();
          return {
            fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
            cut: [...d.querySelectorAll('.v32-row-label, .v32-row-meta')]
              .filter((el) => el.getClientRects().length && el.scrollWidth > el.clientWidth + 1)
              .map((el) => el.textContent.trim()),
            flowcharts: d.querySelector('[data-v32-row="flowcharts"] .v32-row-meta').innerText.trim(),
          };
        });
        assert.ok(lib.fits, 'the Library fits the window');
        assert.deepEqual(lib.cut, [], 'no name or count is cut');
        assert.match(lib.flowcharts, /^\d+ flowcharts$/, 'the second count steps out before a name is cut');
        await snap(phone.page, 'chrome-10-phone-library');
        await settle(phone.page);
        // Search: a panel; a result is its title over where it sits.
        await phone.page.locator('button.search-open').click();
        await phone.page.locator('#searchResults .v32-row').first().waitFor();
        await phone.page.keyboard.type('consideration');
        await phone.page.waitForFunction(
          () => document.querySelectorAll('#searchResults button[data-search-type="node"]').length > 3,
        );
        const row = await phone.page.evaluate(() => {
          const b = document.querySelector('#searchResults button[data-search-type="node"]'),
            title = b.querySelector('strong').getBoundingClientRect(),
            sub = b.querySelector('.search-sub').getBoundingClientRect();
          return {
            below: sub.top >= title.bottom - 1,
            left: Math.abs(sub.left - title.left),
            h: b.offsetHeight,
          };
        });
        assert.ok(row.below && row.left < 1 && row.h >= 48, 'two lines, one edge: ' + JSON.stringify(row));
        assert.equal(
          await phone.page.locator('#searchResults .v32-keys').isVisible(),
          false,
          'no list of keys where there is no keyboard',
        );
        await snap(phone.page, 'chrome-10-phone-results');
        assert.deepEqual(phone.errors, []);
      } finally {
        await phone.context.close();
      }
    },
  );

  /* ---------- 11 to 14: quiet, stable, named, composed ---------- */
  const calm = await open();
  try {
    const page = calm.page;
    const cluster = () =>
      page.evaluate(() => {
        const css = (selector, property) => {
          const el = document.querySelector(selector);
          return el ? getComputedStyle(el)[property] : null;
        };
        return {
          reading: document.documentElement.classList.contains('v32-reading'),
          fuelGlow: css('.ny-clock .ny-fuel-lit', 'filter'),
          fuelBand: css('.ny-clock .ny-fuel-shine', 'display'),
          versionGlow: css('.study-header .dkla-release', 'filter'),
          versionInk: css('.study-header .dkla-release', 'color'),
          versionBand: css('.study-header .dkla-release-shine', 'display'),
          digits: css('.ny-clock .ny-time .flip', 'color'),
        };
      });
    // Does any card of the clock fall in the next two and a half seconds? (Its seconds change every one.)
    const flips = () =>
      page.evaluate(
        () =>
          new Promise((done) => {
            let seen = 0,
              turns = 0;
            const look = setInterval(() => {
              if (document.querySelector('.ny-clock .flipping')) seen++;
              if (++turns >= 25) {
                clearInterval(look);
                done(seen);
              }
            }, 100);
          }),
      );
    await check(
      'quiet beside the reading: the cluster is lit on Home, still and unlit beside a reader or a dialog',
      async () => {
        await page.waitForFunction(() => document.querySelector('.ny-clock .ny-fuel-lit'));
        const home = await cluster();
        assert.equal(home.reading, false);
        assert.notEqual(home.fuelGlow, 'none', 'Home: the fuel line glows');
        assert.notEqual(home.versionGlow, 'none', 'Home: the version glows');
        assert.notEqual(home.fuelBand, 'none');
        assert.ok((await flips()) > 0, 'Home: the clock flips');
        const quiet = async (where) => {
          await page.waitForFunction(() => document.documentElement.classList.contains('v32-reading'));
          const c = await cluster();
          assert.equal(c.fuelGlow, 'none', where + ': no glow on the fuel line');
          assert.equal(c.fuelBand, 'none', where + ': no band crossing the fuel line');
          assert.equal(c.versionGlow, 'none', where + ': no glow on the version');
          assert.equal(c.versionBand, 'none', where + ': no band crossing the version');
          assert.notEqual(c.versionInk, home.versionInk, where + ': the version drops to the muted grey');
          assert.notEqual(c.digits, home.digits, where + ': the digits drop to the muted grey');
          const seconds = () =>
            page.evaluate(() =>
              [...document.querySelectorAll('.ny-clock .ny-seconds .flip')]
                .map((el) => el.dataset.value)
                .join(''),
            );
          const before = await seconds();
          assert.equal(await flips(), 0, where + ': no card falls');
          assert.notEqual(await seconds(), before, where + ': the clock still tells the time, in place');
        };
        await page.evaluate(() => goNode('hamer', true));
        await quiet('beside a reader');
        await snap(page, 'chrome-11-quiet');
        await goHome(page);
        await page.waitForFunction(() => !document.documentElement.classList.contains('v32-reading'));
        assert.notEqual((await cluster()).fuelGlow, 'none', 'Home again: lit');
        await openLibraryOn(page);
        await quiet('behind a dialog');
        await settle(page);
        await page.waitForFunction(() => !document.documentElement.classList.contains('v32-reading'));
        assert.ok((await flips()) > 0, 'Home again: the clock flips');
      },
    );
    await check(
      'stable places: the mark, the cluster, Ask Dottie and the Library never move; the palette opens in one place',
      async () => {
        const places = () =>
          page.evaluate(() => {
            const box = (selector) => {
              const el = document.querySelector(selector);
              if (!el || !el.getClientRects().length) return null;
              const r = el.getBoundingClientRect();
              return [r.left, r.top, r.width, r.height].map((n) => Math.round(n * 10) / 10).join(' ');
            };
            const dialog = document.querySelector('#libraryDialog[open]');
            let shell = null;
            if (dialog) {
              const r = dialog.getBoundingClientRect(),
                title = dialog.querySelector('h2').getBoundingClientRect(),
                close = dialog.querySelector('.v32-close').getBoundingClientRect();
              shell = [title.left - r.left, title.top - r.top, r.right - close.right, close.top - r.top]
                .map(Math.round)
                .join(' ');
            }
            return {
              fixed: [
                '#atlasHome',
                '.v32-cluster',
                '.study-header .ask-bar',
                '#moreBtn',
                'header.study-header',
              ]
                .map(box)
                .join(' | '),
              field: box('.study-header .study-search'),
              palette: box('#searchResults'),
              shell,
            };
          });
        await goHome(page);
        const home = await places();
        const same = async (where, { field = true } = {}) => {
          const now = await places();
          assert.equal(now.fixed, home.fixed, where + ': something in the bar moved');
          if (field) assert.equal(now.field, home.field, where + ': the field moved');
          return now;
        };
        await page.evaluate(() => home('Contracts'));
        await page.waitForFunction(() => document.querySelector('nav.map-nav').getClientRects().length > 0);
        await same('a course');
        await page.evaluate(() => goNode('hamer', true));
        await page.waitForFunction(() => selected?.id === 'hamer');
        await same('a reader');
        // The longest path borrows room from the field, and from nothing else.
        await page.evaluate((id) => goNode(id, true), LONGEST);
        await page.waitForFunction(
          () => !!document.querySelector('.study-header').style.getPropertyValue('--v32c-push'),
        );
        await same('the longest path', { field: false });
        // (the panel arrives over 0.2 s; its place is where it comes to rest)
        const arrived = async () => {
          await page.locator('#searchResults .v32-row').first().waitFor();
          await page.waitForFunction(() => !document.getElementById('searchResults').getAnimations().length);
        };
        await page.keyboard.press('Control+k');
        await arrived();
        const pushed = (await places()).palette;
        await page.keyboard.press('Escape');
        await goHome(page);
        await page.keyboard.press('Control+k');
        await arrived();
        const rest = await same('the palette open');
        // (its height depends on what it lists; its left edge, top and width are its place)
        const place = (box) =>
          box
            .split(' ')
            .filter((_, i) => i !== 3)
            .join(' ');
        assert.equal(place(pushed), place(rest.palette), 'the palette opens in one place, whatever the path');
        await page.keyboard.press('Escape');
        await openLibraryOn(page);
        const wide = await same('the Library open');
        await settle(page);
        // The Library's title and close button: the same offsets in a smaller window.
        await page.setViewportSize({ width: 1024, height: 700 });
        await openLibraryOn(page);
        assert.equal((await places()).shell, wide.shell, "the Library's title and close button");
        await settle(page);
        await page.setViewportSize({ width: 1440, height: 900 });
      },
    );
    await check('every control without a word on it has a name and a tooltip', async () => {
      const wordless = () =>
        page.evaluate(() =>
          [
            ...document.querySelectorAll(
              'header.study-header button, .study-zoom button, #libraryDialog button, #v32Path button, nav.map-nav button',
            ),
          ]
            .filter((b) => b.getClientRects().length && !b.closest('#searchResults'))
            .filter((b) => !/[\p{L}\p{N}]/u.test(b.innerText))
            .map((b) => ({ name: b.getAttribute('aria-label') || '', title: b.title || '' })),
        );
      const seen = new Map();
      const gather = async () => {
        for (const b of await wordless()) seen.set(b.name || '(no name)', b);
      };
      await goHome(page);
      await gather();
      await page.evaluate((id) => goNode(id, true), LONGEST);
      await page.locator('#geoBreadcrumb .v32-crumb-more').waitFor();
      await gather();
      await goHome(page);
      await openLibraryOn(page);
      await gather();
      await settle(page);
      for (const [name, b] of seen) {
        assert.notEqual(name, '(no name)', 'a control with no word and no name');
        assert.ok(b.title, name + ' has no tooltip');
      }
      // Five drawn-only controls (docs/DESIGN.md), and the path's "…".
      const kinds = [...seen.keys()].map((name) => name.replace(/ \(.*$/, '')).sort();
      assert.deepEqual(kinds, [
        'Back to previous view',
        'Close Library',
        'Fit this area',
        'Show the whole path',
        'Zoom in',
        'Zoom out',
      ]);
    });
    await check(
      'the composition lint finds nothing in the bar, the breadcrumb, the Library or the palette through a resize',
      async () => {
        const found = [];
        const lint = async (width, where, root) => {
          const result = await composition(page, root);
          assert.ok(!result.error, `${where}: ${result.error}`);
          for (const [kind, list] of Object.entries(result))
            if (Array.isArray(list))
              for (const item of list)
                found.push(
                  `${width}px ${where}: ${kind} ${item.el || ''} ${JSON.stringify(item.lines || item.px)}`,
                );
        };
        const widths = [1440, 1024, 1023, 851, 850];
        for (let width = 1680; width >= 390; width -= 86) widths.push(width);
        widths.push(390);
        for (const width of [...new Set(widths)].sort((a, b) => b - a)) {
          await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
          await goHome(page);
          await page.evaluate(() => document.querySelector('.search-close')?.click());
          await lint(width, 'Home', 'header.study-header');
          await page.evaluate(() => home('Legislation and the Regulatory State'));
          await page.waitForFunction(() => document.querySelector('nav.map-nav').getClientRects().length > 0);
          await lint(width, 'a course', 'header.study-header');
          await lint(width, 'a course', 'nav.map-nav');
          await page.evaluate((id) => goNode(id, true), LONGEST);
          await page.waitForFunction(() => document.querySelectorAll('#geoBreadcrumb button').length > 3);
          await lint(width, 'the longest path', 'header.study-header');
          if (await page.evaluate(() => document.querySelector('nav.map-nav').getClientRects().length > 0))
            await lint(width, 'the longest path', 'nav.map-nav');
          await goHome(page);
          await openLibraryOn(page);
          await lint(width, 'the Library', '#libraryDialog');
          await settle(page);
          if (width <= 850) await page.locator('button.search-open').click();
          else await page.keyboard.press('Control+k');
          await page.locator('#searchResults .v32-row').first().waitFor();
          await lint(width, 'the empty palette', '#searchResults');
          // A phone's result rows are two lines by design (a title over its place); the lint reads any
          // two-line button as a wrapped label, so results are judged from 851 px up, where a row is one line.
          if (width > 850) {
            await page.keyboard.type('consideration');
            await page.waitForFunction(() => document.querySelectorAll('#searchResults button').length > 8);
            await lint(width, 'results', '#searchResults');
          }
          await page.keyboard.press('Escape');
          await page.evaluate(() => {
            const field = document.getElementById('search');
            field.value = '';
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.blur();
            document.querySelector('.search-close')?.click();
          });
        }
        assert.deepEqual(found, []);
        await page.setViewportSize({ width: 1440, height: 900 });
      },
    );
    if (calm.errors.length) {
      failures++;
      console.log('FAIL page errors (quiet, stable, named, composed)\n     ' + calm.errors.join('\n     '));
    }
  } finally {
    await calm.context.close();
  }
} finally {
  await browser.close();
}
if (failures) {
  console.log(`${failures} frame check(s) failed.`);
  process.exit(1);
}
if (only.length) {
  console.log('Only the checks named ' + only.join(', ') + ' were run.');
  process.exit(0);
}
console.log(
  'The frame: a 56 px bar in three groups with the field centred; the breadcrumb on one line at every level, whole or folded, with the field giving it room; Ctrl/Cmd+K and "/"; the palette’s sections, one highlight, Enter and Escape; every Library row opens its view and says what its count counts; the splash on Home only; the cluster still and unlit beside a reader or a dialog; nothing in the bar moves between states; no control under 36 px or without a name; the composition lint finds nothing through a resize; search results unchanged.',
);
