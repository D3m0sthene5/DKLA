/* The v3.2 frame, in a real browser (docs/DESIGN.md; src/features/v32/chrome.js and chrome.css):

     node tools/v32/check-chrome.mjs http://127.0.0.1:8766/DKLA-v3.1.html [--shots DIR]

   1. The bar is 56 px with one hairline under it and three groups and nothing else: the mark and wordmark
      (then the breadcrumb), the command field centred on the window, and the instrument cluster (clock and
      version), Ask Dottie and the Library. Only Exo 2, Inter and the mono face are used in it.
   2. The breadcrumb is in the bar and right at each level (course, subject, topic and entry); a trail longer
      than its room drops its first crumbs and keeps the last two; a crumb and Back both navigate; the
      wordmark is the way Home, where the breadcrumb steps aside.
   3. Ctrl/Cmd+K and "/" put the keyboard in the field from anywhere, but not while something is being typed
      into another field; the field shows the shortcut as this machine writes it.
   4. The empty palette has its sections: "On this entry" only when the reader offers facets, "Go to" (the
      Library's collections with their counts), "Recent" (the last five entries opened), Ask Dottie, and the
      keys in the footer.
   5. Up and Down move one highlight, Enter opens the highlighted row, Escape closes and hands the keyboard
      back to where it was.
   6. The Library is one dialog in three groups; every row shows its count where it has one and opens the
      right thing; a count that is not known yet shows nothing (not zero) and fills in when its data arrives.
   7. The splash line shows on Home only, and steps out while a dialog is open.
   8. No control in the bar, the palette or the Library is under 36 px.
   9. A fixed list of searches returns exactly the rows it returned before the frame was redrawn
      (tools/v32/search-baseline.json; see search-rows.mjs).
  10. The map's own controls: zoom is one segmented control on the 24 px gutter; the hint fades at the first
      thing done to the map and stays gone. */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { BASELINE, QUERIES, ready, rowsFor } from './search-rows.mjs';
import { conformance } from './conformance.mjs';

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
async function check(name, run) {
  try {
    await run();
    console.log('ok   ' + name);
  } catch (error) {
    failures++;
    console.log(
      'FAIL ' +
        name +
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
      shown = (el) => el.getClientRects().length > 0;
    const r = nav.getBoundingClientRect();
    return {
      inBar: !!nav.closest('.v32-bar-left'),
      shown: shown(nav),
      bottom: r.bottom,
      crumbs: [...nav.querySelectorAll('#geoBreadcrumb button')].map((b) => b.textContent.trim()),
      visible: [...nav.querySelectorAll('#geoBreadcrumb button')]
        .filter(shown)
        .map((b) => b.textContent.trim()),
      cut: nav.querySelector('#geoBreadcrumb').classList.contains('v32-trail-cut'),
      back: shown(document.getElementById('studyBack')),
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
// The counts, worked out here from the page's data, independently of the code that draws them.
const expectedCounts = (page) =>
  page.evaluate(() => {
    const block = (id) => JSON.parse(document.getElementById(id).textContent);
    const n = (value) => value.toLocaleString('en-US');
    return {
      timelines: n(window.DKLATimelines.list().length),
      flowcharts: n(block('dklaFlowchartsData').length),
      canons: n(block('dklaCanonsData').length),
      dictionary: n(window.DKLA.glossaryTerms().length),
      lectures: n(block('dklaLecturesData').length),
      sessions: n(
        Object.keys(data.corpus.assignmentTitles).length +
          data.lrsCorpus.classes.length +
          data.nodes.filter((node) => /^cp-week-\d+$/.test(node.id)).length,
      ),
      authorities: n(window.DKLAAuthorities.data.entries.length),
      scotus: n(Object.keys(window.SCOTUSHistory.data.people).length),
      supporting: n(window.DKLABriefs.data.entries.length - Object.keys(window.DKLABriefs.data.map).length),
      textbook: n(data.corpus.sourcePageCount),
      drill: n(window.DKLAStudy.entries().length),
      pairs: n(window.DKLAStudy.pairs().length),
    };
  });
const GO_TO = [
  'timelines',
  'flowcharts',
  'canons',
  'dictionary',
  'lectures',
  'sessions',
  'authorities',
  'scotus',
];
const LIBRARY = {
  Collections: [...GO_TO, 'supporting', 'textbook'],
  Study: ['drill', 'pairs', 'sheets', 'progress'],
  Yours: ['add', 'connect', 'path', 'save', 'guide', 'patch'],
};

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
  await check('the breadcrumb is in the bar and right at each level', async () => {
    let t = await trail(page);
    assert.ok(t.inBar, 'the trail is in the bar');
    assert.equal(t.shown, false, 'on Home it steps aside');
    assert.deepEqual(t.crumbs, ['Atlas']);
    await page.evaluate(() => home('Contracts'));
    await page.waitForFunction(() => document.querySelector('nav.map-nav').getClientRects().length > 0);
    t = await trail(page);
    assert.deepEqual(t.visible, ['Atlas', 'Contracts'], 'a course');
    assert.ok(t.bottom <= 56 && t.back, 'in the bar, with the way back: ' + JSON.stringify(t));
    assert.equal(t.cut, false);
    await snap(page, 'chrome-2-course');
    await page.evaluate(() => goRegion('consideration'));
    await page.waitForFunction(() => document.querySelectorAll('#geoBreadcrumb button').length === 3);
    t = await trail(page);
    assert.deepEqual(t.visible, ['Atlas', 'Contracts', 'Consideration'], 'a subject');
    // An entry: four levels are more than the bar has room for at 1440 px. The first crumbs step out, the
    // last two stay, and the trail says it is cut.
    await page.evaluate(() => goNode('hamer', true));
    await page.waitForFunction(() => document.querySelectorAll('#geoBreadcrumb button').length === 4);
    t = await trail(page);
    assert.deepEqual(t.crumbs, ['Atlas', 'Contracts', 'Consideration', 'Bargained-for exchange']);
    assert.deepEqual(t.visible.slice(-2), ['Consideration', 'Bargained-for exchange'], 'the last two stay');
    assert.equal(t.cut, t.visible.length < 4, 'a cut trail says so');
    const fits = await page.evaluate(() => {
      const left = document.querySelector('.v32-bar-left').getBoundingClientRect(),
        nav = document.querySelector('nav.map-nav').getBoundingClientRect(),
        last = document.querySelector('#geoBreadcrumb button:last-of-type');
      return { inside: nav.right <= left.right + 1, title: last.title };
    });
    assert.ok(fits.inside, 'the trail stays inside its group');
    assert.equal(fits.title, 'Bargained-for exchange', 'a crumb says its whole name on hover');
    await snap(page, 'chrome-3-entry');
    // The same when an entry is opened straight from Home (the trail is fitted as it comes into the bar).
    await goHome(page);
    await page.evaluate(() => goNode('hamer', true));
    await page.waitForFunction(() => document.querySelector('nav.map-nav').getClientRects().length > 0);
    const direct = await trail(page);
    assert.deepEqual(direct.visible, t.visible, 'from Home: ' + direct.visible);
    assert.equal(direct.cut, t.cut);
    await page.evaluate(() => goRegion('consideration'));
    await page.evaluate(() => goNode('hamer', true));
    await page.waitForFunction(() => selected?.id === 'hamer' && S.history.length > 0);
    // A crumb navigates; Back returns; the wordmark goes Home.
    await page.locator('#geoBreadcrumb button', { hasText: 'Consideration' }).click();
    await page.waitForFunction(() => S.region === 'consideration' && !S.district && !selected);
    await page.locator('#studyBack').click();
    await page.waitForFunction(() => selected?.id === 'hamer');
    await page.locator('#atlasHome').click();
    await page.waitForFunction(() => S.scope === 'Atlas' && !S.region && !selected);
    await goHome(page);
    assert.equal((await trail(page)).shown, false, 'Home again');
    // Nothing of it is left over the map.
    assert.equal(await page.locator('#studyMain > .map-nav').count(), 0);
  });

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
    'the empty palette: Go to with counts, Ask Dottie, the keys; no section without its data',
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
        assert.equal(row.meta, want[row.id], `${row.label}: its count`);
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
    assert.deepEqual(
      recent.rows.map((r) => r.label),
      ['Lucy v. Zehmer', 'Hamer v. Sidway'],
    );
    await page.keyboard.press('Escape');
    await goHome(page);
    await page.locator('#search').focus();
    await page.locator('#searchResults .v32-row').first().waitFor();
    recent = (await palette(page)).sections.find((s) => s.name === 'Recent');
    assert.deepEqual(
      recent.rows.map((r) => r.label),
      ['Hawkins v. McGee', 'Lucy v. Zehmer', 'Hamer v. Sidway'],
    );
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
          { id: 'timeline', label: 'Timeline', count: 6, open: () => (window.__facet = 'timeline') },
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
        ['Timeline', '6'],
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
              height: row.getBoundingClientRect().height,
            })),
          ]),
        ),
        foot: [...dialog.querySelectorAll('.v32-lib-foot .v32-quiet')].map(text),
        expanded: document.getElementById('moreBtn').getAttribute('aria-expanded'),
        menuHidden: document.getElementById('moreMenu').hidden,
      };
    });
  await check('the Library: one dialog, three groups, counts beside the rows', async () => {
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
    for (const row of Object.values(l.groups).flat()) {
      assert.equal(row.height, 36, row.label + ' is one row high');
      if (want[row.id]) assert.equal(row.meta, want[row.id], row.label + ': its count');
    }
    // The version readout beside the patch notes.
    const version = await page.evaluate(() =>
      document.querySelector('.study-header .dkla-release').textContent.trim(),
    );
    assert.equal(l.groups.Yours.find((r) => r.id === 'patch').meta, version);
    assert.deepEqual(l.foot, ['How to use this map', 'Sources and coverage', 'Privacy']);
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
      for (const id of Object.values(LIBRARY).flat()) {
        if (id === 'guide') continue; // leaves the page: checked last
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
      assert.equal((await cold.locator('.v32-row-meta').innerText()).trim(), '7');
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
        /^\d+$/,
        'what is known is shown',
      );
      slow.release();
      await slow.page.waitForFunction(
        () =>
          /^[\d,]+$/.test(
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
    [1024, 768, { right: ['.v32-cluster', '.ask-bar', '#moreBtn'], cluster: ['.dkla-release'] }],
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
  await check('a phone: the breadcrumb stays on the map, and the Library still opens', async () => {
    const phone = await open({ width: 390, height: 844 });
    try {
      const p = await phone.page.evaluate(() => {
        const nav = document.querySelector('nav.map-nav');
        return {
          bar: document.querySelector('header.study-header').getBoundingClientRect().height,
          onMap: nav.parentElement.id === 'studyMain',
          shown: nav.getClientRects().length > 0,
          crumbs: nav.textContent.trim(),
          over: document.documentElement.scrollWidth - innerWidth,
        };
      });
      assert.equal(p.bar, 56);
      assert.ok(p.onMap && p.shown, 'the trail is on the map: ' + JSON.stringify(p));
      assert.equal(p.over, 0);
      await openLibraryOn(phone.page);
      const fits = await phone.page.evaluate(() => {
        const r = document.getElementById('libraryDialog').getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
      });
      assert.ok(fits, 'the Library fits the window');
      await snap(phone.page, 'chrome-10-phone-library');
      assert.deepEqual(phone.errors, []);
    } finally {
      await phone.context.close();
    }
  });
} finally {
  await browser.close();
}
if (failures) {
  console.log(`${failures} frame check(s) failed.`);
  process.exit(1);
}
console.log(
  'The frame: a 56 px bar in three groups with the field centred; the breadcrumb in the bar at every level; Ctrl/Cmd+K and "/"; the palette’s sections, one highlight, Enter and Escape; every Library row opens its view and shows its count; the splash on Home only; no control under 36 px; search results unchanged.',
);
