/* The v3.2 "no freezes" work, in a real browser: what was moved off the critical path still does its job.

     node tools/feel/check-work.mjs http://127.0.0.1:8766/DKLA-v3.1.html

   1. Search index: built exactly once per page, in slices that each stay under a budget; a change to an
      entry updates the index without another whole build; a search made before the index is finished gets
      complete results; and for a fixed list of queries the results are those of an index built the old way
      (every document added in one go) from the same content.
   2. Typing in the search box: the results follow within a few frames (they used to wait 75 ms).
   3. Saved work: moving the map, opening an entry and scrolling the reader do not write the graph; an edit
      does; the stored graph equals the open one; leaving a moment after an edit makes the browser ask first,
      and the edit is there afterwards; an edit made right before a reload that is not stopped is saved too.
   4. Cold Call: the reader is open with its whole text in the same step that opened it; when its
      definitions are marked afterwards, the account is exactly the one marked in a single pass.
   5. Dictionary: typing in its filter keeps the same box, focus and caret, lists what the old filter listed,
      and picking a term redraws the article, not the box.
   6. Data blocks: every block parsed by the loader (in its worker) equals JSON.parse of the block's text;
      text held beside the page reads through the element, and is written into it before a browser "save".
   7. No single stretch of main-thread work longer than the budget between the atlas being shown and the
      background data being in. */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'local preview only');
// Milliseconds. Generous for a busy machine: a slice is about 6 ms of work (one large document can take 20),
// and the old build was one task of 500 ms.
const SLICE_BUDGET = 150,
  TASK_BUDGET = 350;
const QUERIES = [
  'pennoyer',
  'consideration',
  'erie doctrine',
  'chevron deference',
  'personal jurisdction',
  'LRS Class 22',
  'mailbox rule',
  '12(b)(6)',
  'promissory estoppel reliance',
  'battle of the forms',
  'summary judgment standard',
  'res judicata',
  'ejusdem generis',
  'offer and acceptance',
  'xyzzy nothing',
  'the',
];
const browser = await chromium.launch();
let failures = 0;
async function check(name, run) {
  try {
    const note = await run();
    console.log('ok   ' + name + (note ? ' (' + note + ')' : ''));
  } catch (error) {
    failures++;
    console.log(
      'FAIL ' +
        name +
        '\n     ' +
        String(error?.stack || error)
          .split('\n')
          .slice(0, 6)
          .join('\n     '),
    );
  }
}
async function context(options = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: 'block',
    ...options,
  });
  await ctx.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.origin !== address.origin || url.pathname.startsWith('/api/')
      ? route.fulfill({ status: 204, body: '' })
      : route.continue();
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('dkla.guide.v1', 'seen');
    } catch {
      /* no storage */
    }
    // Every write to the graph store, and every long task, as the page sees them.
    window.__puts = [];
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'graphs') window.__puts.push(String(key));
      return put.apply(this, arguments);
    };
    window.__long = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__long.push([e.startTime, e.duration]);
      }).observe({ type: 'longtask', buffered: true });
    } catch {
      /* no long task timing */
    }
    const timer = setInterval(() => {
      if (!document.documentElement?.classList.contains('dkla-boot-ready')) return;
      window.__shown = performance.now();
      clearInterval(timer);
    }, 10);
  });
  return ctx;
}
const errors = [];
async function open(ctx, hash = '') {
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(address.href + hash, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator('html.dkla-boot-ready').waitFor({ timeout: 120_000 });
  return page;
}
// The background work is over: every block is in, the index is up to date, no save is waiting.
const settled = (page) =>
  page.waitForFunction(
    () =>
      window.DKLAData.state().lazy.length === 0 &&
      window.DKLA.searchIndexStats.ready &&
      !r7SaveTimer &&
      window.DKLAColdCallGloss.warmStats.warmed + window.DKLAColdCallGloss.warmStats.finishedInOneGo >= 2,
    null,
    { timeout: 120_000, polling: 100 },
  );
const sameHits = (a, b) => {
  // The same entries with the same scores. Entries whose scores are equal to nine figures may change places.
  const key = (h) => [Number(h.score.toPrecision(9)), h.id];
  const order = (list) => list.map(key).sort((x, y) => y[0] - x[0] || (x[1] < y[1] ? -1 : 1));
  return JSON.stringify(order(a)) === JSON.stringify(order(b));
};

/* ---------- 1, 2, 5, 6, 7: one first visit ---------- */
const first = await context();
{
  const page = await open(first);
  // A search made the moment the atlas is shown, before the background build can have finished.
  const early = await page.evaluate((q) => {
    const before = { ...window.DKLA.searchIndexStats };
    const hits = window.DKLA.searchHits(q).map((h) => ({ id: h.id, score: h.score }));
    const ref = window.DKLA.searchReference()(q).map((h) => ({ id: h.id, score: h.score }));
    return { before, hits, ref, after: { ...window.DKLA.searchIndexStats } };
  }, 'pennoyer');
  await check('a search made before the index is finished gets complete results', () => {
    assert.ok(early.hits.length > 0, 'results');
    assert.ok(sameHits(early.hits, early.ref), 'the same results as an index built in one go');
    assert.equal(early.after.builds, 1, 'one build');
    return early.before.ready ? 'the index was already finished' : 'the build was finished on demand';
  });
  await page.close();
}
const page = await open(first);
await settled(page);
const stats = await page.evaluate(() => ({
  search: { ...window.DKLA.searchIndexStats },
  gloss: { ...window.DKLAColdCallGloss.warmStats },
  long: window.__long.filter(([start]) => start >= window.__shown).map(([, d]) => Math.round(d)),
  nodes: data.nodes.length,
}));
await check('the search index is built exactly once, in slices under the budget', () => {
  assert.equal(stats.search.builds, 1, 'whole builds: ' + JSON.stringify(stats.search));
  assert.equal(stats.search.finishedInOneGo, 0, 'no part of it ran in one go');
  assert.equal(stats.search.documents, stats.nodes);
  assert.ok(stats.search.extras > 0, 'flowcharts, lectures, canons and classes are in it');
  assert.ok(stats.search.slices > 20, 'built in many slices: ' + stats.search.slices);
  assert.ok(
    stats.search.longestSlice < SLICE_BUDGET,
    `longest slice ${stats.search.longestSlice} ms, budget ${SLICE_BUDGET}`,
  );
  return `${stats.search.slices} slices, longest ${stats.search.longestSlice} ms, ${stats.search.updates} update(s)`;
});
await check(
  'the Cold Call definition tables are compiled in the background, in slices under the budget',
  () => {
    assert.ok(stats.gloss.warmed >= 2, 'both tables');
    assert.ok(stats.gloss.longestSlice < SLICE_BUDGET, `longest slice ${stats.gloss.longestSlice} ms`);
    return `${stats.gloss.slices} slices, longest ${stats.gloss.longestSlice} ms`;
  },
);
await check('no long stretch of work between the atlas being shown and the background data being in', () => {
  const longest = Math.max(0, ...stats.long);
  assert.ok(
    longest < TASK_BUDGET,
    `longest task ${longest} ms, budget ${TASK_BUDGET}: ${stats.long.join(', ')}`,
  );
  return `longest task ${longest} ms`;
});
await check('search results are those of an index built in one go', async () => {
  const result = await page.evaluate((queries) => {
    const ref = window.DKLA.searchReference();
    const pick = (list) => list.map((h) => ({ id: h.id, score: h.score }));
    return queries.map((q) => [q, pick(window.DKLA.searchHits(q)), pick(ref(q))]);
  }, QUERIES);
  let total = 0;
  for (const [q, got, want] of result) {
    assert.equal(got.length, want.length, q + ': number of results');
    assert.ok(sameHits(got, want), q + ': same entries and scores');
    total += got.length;
  }
  assert.ok(total > 500, 'the queries find something: ' + total);
  return `${QUERIES.length} queries, ${total} results`;
});
await check('a changed entry updates the index without another whole build', async () => {
  const word = 'zyzzyvaqua';
  const result = await page.evaluate(async (word) => {
    const wait = () =>
      new Promise((resolve) => {
        const tick = () => (window.DKLA.searchIndexStats.ready ? resolve() : setTimeout(tick, 20));
        tick();
      });
    const before = { ...window.DKLA.searchIndexStats };
    const node = data.nodes.find((n) => n.kind === 'Case' && typeof n.notes === 'string');
    const notes = node.notes;
    const none = window.DKLA.searchHits(word).length;
    node.notes = notes + ' ' + word;
    rebuildIndex();
    await wait();
    const middle = { ...window.DKLA.searchIndexStats };
    const found = window.DKLA.searchHits(word).map((h) => h.id);
    const ref = window.DKLA.searchReference();
    const same = ['pennoyer', 'consideration', word].map((q) => [
      window.DKLA.searchHits(q).map((h) => ({ id: h.id, score: h.score })),
      ref(q).map((h) => ({ id: h.id, score: h.score })),
    ]);
    node.notes = notes;
    rebuildIndex();
    const gone = window.DKLA.searchHits(word).length; // asked at once: the search brings the index up to date
    await wait();
    return {
      before,
      middle,
      after: { ...window.DKLA.searchIndexStats },
      id: node.id,
      none,
      found,
      same,
      gone,
    };
  }, word);
  assert.equal(result.none, 0);
  assert.deepEqual(result.found, [result.id], 'the new word finds its entry');
  for (const [got, want] of result.same) assert.ok(sameHits(got, want), 'still the results of a fresh index');
  assert.equal(result.gone, 0, 'the word is gone the moment it is removed');
  assert.equal(result.after.builds, 1, 'still one whole build');
  assert.equal(result.middle.changed - result.before.changed, 1, 'one document replaced');
  assert.ok(result.after.updates >= result.before.updates + 2, 'two updates');
});
await check('typing in the search box: results within a few frames', async () => {
  const waits = [];
  for (const q of ['pen', 'cons', 'erie', 'rule', 'offer']) {
    waits.push(
      await page.evaluate(
        (q) =>
          new Promise((resolve) => {
            const box = document.getElementById('search'),
              list = document.getElementById('searchResults');
            box.focus();
            box.value = '';
            box.dispatchEvent(new Event('input', { bubbles: true }));
            list.hidden = true;
            list.replaceChildren();
            const began = performance.now();
            const watch = new MutationObserver(() => {
              if (list.hidden || !list.querySelector('button')) return;
              watch.disconnect();
              resolve(performance.now() - began);
            });
            watch.observe(list, { childList: true, attributes: true, attributeFilter: ['hidden'] });
            box.value = q;
            box.dispatchEvent(new Event('input', { bubbles: true }));
          }),
        q,
      ),
    );
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => {
    const box = document.getElementById('search');
    box.value = '';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    box.blur();
  });
  const best = Math.min(...waits);
  assert.ok(best < 60, 'results in under 60 ms at best: ' + waits.map((w) => Math.round(w)).join(', '));
  return waits.map((w) => Math.round(w)).join(', ') + ' ms';
});
await check('data blocks parsed by the loader equal JSON.parse of their text', async () => {
  const result = await page.evaluate(async () => {
    const out = {};
    for (const id of window.DKLAData.ids()) {
      const value = await window.DKLAData.json(id),
        text = document.getElementById(id).textContent;
      out[id] = [JSON.stringify(value) === JSON.stringify(JSON.parse(text)), text.length];
    }
    return { out, state: window.DKLAData.state() };
  });
  const ids = Object.keys(result.out);
  if (!ids.length) return 'this page holds every block; nothing is fetched';
  for (const id of ids) assert.ok(result.out[id][0] && result.out[id][1] > 0, id + ' differs');
  assert.equal(result.state.helper.broken, false, 'the worker is in use');
  assert.equal(result.state.helper.fallbacks, 0, 'nothing fell back to the page');
  assert.ok(result.state.helper.used >= 4, 'the worker took the large blocks: ' + result.state.helper.used);
  return `${ids.length} blocks, ${result.state.helper.used} worker requests`;
});
await check(
  'text held beside the page reads through its element and is written in before a browser save',
  async () => {
    const result = await page.evaluate(() => {
      const held = window.DKLAData.state().held;
      const read = held.map((id) => {
        const el = document.getElementById(id);
        return [id, el.textContent.length, el.childNodes.length];
      });
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
      const written = held.map((id) => {
        const el = document.getElementById(id);
        return [
          id,
          el.childNodes.length === 1 ? el.firstChild.data.length : -1,
          Object.getOwnPropertyDescriptor(el, 'textContent') === undefined,
        ];
      });
      return { held, read, written, left: window.DKLAData.state().held };
    });
    if (!result.held.length) return 'no text is held in this page';
    for (const [id, length, nodes] of result.read) {
      assert.ok(length > 1e6, id + ' reads through its element');
      assert.equal(nodes, 0, id + ' was not yet written');
    }
    result.written.forEach(([id, length, plain], i) => {
      assert.equal(length, result.read[i][1], id + ' is written into its element, whole');
      assert.ok(plain, id + ' is an ordinary element again');
    });
    assert.deepEqual(result.left, []);
    return result.held.length + ' blocks';
  },
);

/* ---------- 5. the dictionary ---------- */
await check(
  'dictionary: the filter keeps its box, focus and caret, and lists what the old filter listed',
  async () => {
    await page.evaluate(() => window.DKLA.openTerm('consideration'));
    await page.locator('#glossaryDialog .gl-detail h2').waitFor();
    await page.evaluate(() => {
      window.__box = document.getElementById('glFind');
      window.__detail = document.querySelector('#glossaryDialog .gl-detail');
    });
    await page.locator('#glFind').click();
    const seen = [];
    for (const q of ['est', 'estop', 'res ', 'habeas corpus', 'zzzz', "attorney's"]) {
      await page.locator('#glFind').fill('');
      await page.locator('#glFind').pressSequentially(q, { delay: 15 });
      // The first rows are drawn with the keystroke; the rest of a long list follows frame by frame.
      await page.waitForFunction(() => !document.querySelector('#glossaryDialog .gl-list').dataset.filling);
      seen.push(
        await page.evaluate((q) => {
          const norm = (s) =>
            String(s || '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[̀-ͯ]/g, '')
              .replace(/[^a-z0-9 ]+/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          // The filter as it was before v3.2: everything normalised again for every query.
          const nq = norm(q),
            starts = [],
            has = [];
          for (const t of window.DKLA.glossaryTerms()) {
            const k = norm(t.term);
            if (!nq || k.startsWith(nq)) starts.push(t.slug);
            else if (k.includes(nq) || norm(t.definition).includes(nq)) has.push(t.slug);
          }
          const want = [...starts, ...has];
          const box = document.getElementById('glFind');
          return {
            q,
            sameBox: box === window.__box,
            focused: document.activeElement === box,
            value: box.value,
            caret: box.selectionStart,
            sameDetail: document.querySelector('#glossaryDialog .gl-detail') === window.__detail,
            got: [...document.querySelectorAll('#glossaryDialog .gl-list [data-term]')].map(
              (b) => b.dataset.term,
            ),
            want: want.slice(0, 400),
            more: document.querySelector('#glossaryDialog .gl-more')?.textContent || '',
            total: want.length,
          };
        }, q),
      );
    }
    for (const s of seen) {
      assert.ok(s.sameBox, s.q + ': the filter box was replaced');
      assert.ok(s.focused, s.q + ': the filter box lost focus');
      assert.equal(s.value, s.q);
      assert.equal(s.caret, s.q.length, s.q + ': caret');
      assert.ok(s.sameDetail, s.q + ': the article was redrawn');
      assert.deepEqual(s.got, s.want, s.q + ': the list');
      if (s.total > 400) assert.match(s.more, /more · narrow the search/);
      if (!s.total) assert.equal(s.more, 'No term matches.');
    }
    // Picking a term: its article, the mark in the list and the address; the box stays.
    await page.locator('#glFind').fill('estoppel');
    const pickedSlug = await page.evaluate(
      () => document.querySelector('#glossaryDialog .gl-list [data-term]').dataset.term,
    );
    await page.locator('#glossaryDialog .gl-list [data-term]').first().click();
    const picked = await page.evaluate(() => ({
      sameBox: document.getElementById('glFind') === window.__box,
      value: document.getElementById('glFind').value,
      pressed: [...document.querySelectorAll('#glossaryDialog .gl-list [aria-pressed="true"]')].map(
        (b) => b.dataset.term,
      ),
      heading: document.querySelector('#glossaryDialog .gl-detail h2')?.textContent || '',
      hash: decodeURIComponent(location.hash),
      used: document.querySelectorAll('#glossaryDialog .gl-detail [data-study-node]').length,
    }));
    assert.ok(picked.sameBox && picked.value === 'estoppel', 'the box and what was typed stay');
    assert.deepEqual(picked.pressed, [pickedSlug]);
    assert.equal(picked.hash, '#term=' + pickedSlug);
    assert.ok(picked.heading.length > 0);
    // A letter, then an entry that uses the term: the dialog closes and the entry opens.
    await page.locator('#glossaryDialog [data-letter="C"]').click();
    const letters = await page.evaluate(() =>
      [...document.querySelectorAll('#glossaryDialog .gl-list [data-term] strong')].map((s) =>
        s.textContent[0].toUpperCase(),
      ),
    );
    assert.ok(letters.length > 0 && letters.every((l) => l === 'C'), 'the letter filter');
    await page.evaluate(() => window.DKLA.openTerm('consideration'));
    const target = await page.evaluate(
      () => document.querySelector('#glossaryDialog .gl-detail [data-study-node]').dataset.studyNode,
    );
    await page.locator('#glossaryDialog .gl-detail [data-study-node]').first().click();
    await page.waitForFunction(
      (id) => !document.getElementById('glossaryDialog').open && selected?.id === id,
      target,
    );
    return seen.map((s) => `${s.q}: ${s.total}`).join(', ');
  },
);

/* ---------- 4. Cold Call ---------- */
await check(
  'Cold Call: open with its whole text at once; marked afterwards exactly as in one pass',
  async () => {
    let deferred = 0,
      ids = [];
    await page.mouse.move(2, 2); // off the text: a pointer resting on a defined word opens its card
    const cdp = await first.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); // slow enough that marking is put off
    try {
      ids = await page.evaluate(() => {
        const all = window.DKLAColdCall.cases();
        return ['cp-pennoyer', 'citoh', all[Math.floor(all.length / 2)], all[all.length - 1]].filter((id) =>
          all.includes(id),
        );
      });
      for (const id of ids) {
        const result = await page.evaluate(async (id) => {
          const dialog = document.getElementById('coldCallDialog');
          window.DKLAColdCall.markAtOnce = false;
          window.DKLAColdCall.open(id);
          // In the same step: open, every episode there, all of its text.
          const atOnce = {
            open: dialog.open,
            state: dialog.dataset.ccMarked,
            sections: dialog.querySelectorAll('.cc-section').length,
            text: document.getElementById('ccNarrative').textContent.replace(/\s+/g, ' '),
            terms: dialog.querySelectorAll('.cc-term').length,
          };
          await window.DKLAColdCall.marked();
          const later = {
            state: dialog.dataset.ccMarked,
            html: document.getElementById('ccNarrative').innerHTML,
            text: document.getElementById('ccNarrative').textContent.replace(/\s+/g, ' '),
            terms: dialog.querySelectorAll('.cc-term').length,
            plain: window.DKLAColdCallGloss.plainShown().length,
          };
          window.DKLAColdCall.close();
          window.DKLAColdCall.markAtOnce = true;
          window.DKLAColdCall.open(id);
          const whole = {
            state: dialog.dataset.ccMarked,
            html: document.getElementById('ccNarrative').innerHTML,
            plain: window.DKLAColdCallGloss.plainShown().length,
          };
          window.DKLAColdCall.close();
          window.DKLAColdCall.markAtOnce = false;
          return { atOnce, later, whole };
        }, id);
        assert.ok(result.atOnce.open, id + ': open at once');
        assert.ok(result.atOnce.sections > 0);
        assert.ok(result.atOnce.terms > 0, id + ': the first episode is marked at once');
        assert.equal(result.later.state, 'done');
        assert.equal(result.whole.state, 'done');
        // The hidden descriptions hold text too; with them the text only grows.
        {
          const a = result.atOnce.text,
            b = result.later.text;
          let i = 0;
          while (i < a.length && a[i] === b[i]) i++;
          assert.ok(
            i >= Math.min(a.length, 2000),
            `${id}: the text is there at once (differs at ${i}: "${a.slice(i - 30, i + 40)}" / "${b.slice(i - 30, i + 40)}")`,
          );
        }
        assert.equal(result.later.html, result.whole.html, id + ': marked later equals marked in one pass');
        assert.equal(result.later.plain, result.whole.plain);
        if (result.atOnce.state === 'pending') {
          deferred++;
          assert.ok(
            result.later.terms > result.atOnce.terms,
            id + ': the later episodes got their definitions',
          );
        }
      }
    } finally {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
    assert.ok(deferred > 0, 'at least one account was marked in two steps');
    return `${ids.length} accounts, ${deferred} marked in two steps`;
  },
);

/* ---------- 3. saved work ---------- */
await check('moving the map, opening an entry and scrolling the reader do not write the graph', async () => {
  await settled(page);
  const before = await page.evaluate(() => ({
    puts: window.__puts.length,
    ...window.DKLASaveStats,
    view: JSON.stringify(data.studyMap.view),
  }));
  const box = await page.locator('#geoCanvas').boundingBox();
  const cx = box.x + box.width / 2,
    cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - 180, cy - 60, { steps: 8 });
  await page.mouse.up();
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(900);
  await page.evaluate(() => (location.hash = '#node=citoh'));
  await page.waitForFunction(() => selected?.id === 'citoh' && !document.getElementById('inspector').hidden);
  await page.evaluate(() => (document.getElementById('inspector').scrollTop = 600));
  await page.waitForTimeout(1600); // past the half second of the view timer and the quarter second of a save
  const after = await page.evaluate(() => ({
    puts: window.__puts.length,
    ...window.DKLASaveStats,
    view: JSON.stringify(data.studyMap.view),
    waiting: !!r7SaveTimer,
  }));
  assert.notEqual(after.view, before.view, 'the view was stored in the open graph');
  assert.ok(after.viewOnly > before.viewOnly, 'view changes were seen: ' + JSON.stringify(after));
  assert.equal(after.puts, before.puts, 'no write to the graph store');
  assert.equal(after.writes, before.writes);
  assert.equal(after.waiting, false, 'and none waiting');
  return `${after.viewOnly - before.viewOnly} view change(s), 0 writes`;
});
const marker = 'check-work marker ' + Date.now();
await check('an edit is written, and the stored graph equals the open one', async () => {
  const result = await page.evaluate(async (marker) => {
    const before = window.__puts.length;
    const node = data.nodes.find((n) => n.id === 'citoh');
    transact('Check edit', () => {
      node.notes = (node.notes || '') + ' ' + marker;
    });
    const waiting = !!r7SaveTimer;
    await window.LegalAtlas.flush();
    const stored = await new Promise((resolve, reject) => {
      const request = r7DB.transaction('graphs', 'readonly').objectStore('graphs').get(storageKey());
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return {
      waiting,
      puts: window.__puts.length - before,
      key: window.__puts[window.__puts.length - 1] === storageKey(),
      same: JSON.stringify(stored) === JSON.stringify(data),
      has: stored.nodes.find((n) => n.id === 'citoh').notes.includes(marker),
      status: document.getElementById('saveStatus').textContent,
      copies: window.DKLASaveStats.jsonCopies,
    };
  }, marker);
  assert.ok(result.waiting, 'the edit asked for a save');
  assert.ok(result.puts >= 1 && result.key, 'the graph was written under its key');
  assert.ok(result.has, 'the stored graph holds the edit');
  assert.ok(result.same, 'the stored graph equals the open graph');
  assert.match(result.status, /Saved locally/);
  assert.equal(result.copies, 0, 'IndexedDB copied the graph itself');
});
// Leaving while the edit's write is still under way: the browser asks first; staying lets the write finish.
let reopened = page;
await check('leaving a moment after an edit: the browser asks first, and the edit is saved', async () => {
  const late = marker + ' asked';
  await settled(reopened);
  const dialogs = [];
  reopened.on('dialog', (dialog) => {
    dialogs.push(dialog.type());
    dialog.dismiss().catch(() => {});
  });
  await reopened.evaluate((late) => {
    const node = data.nodes.find((n) => n.id === 'cp-pennoyer');
    transact('Check last-moment edit', () => {
      node.notes = (node.notes || '') + ' ' + late;
    });
  }, late);
  await reopened.close({ runBeforeUnload: true });
  for (let i = 0; i < 60 && !dialogs.length && !reopened.isClosed(); i++)
    await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(dialogs, ['beforeunload'], 'the browser asked before leaving');
  assert.equal(reopened.isClosed(), false, 'and the tab stayed');
  await reopened.waitForFunction(() => !r7EditUnconfirmed() && !r7SaveTimer);
  // Now saved: leaving is not questioned, and the edit is there afterwards.
  await reopened.close({ runBeforeUnload: true });
  for (let i = 0; i < 100 && !reopened.isClosed(); i++) await new Promise((r) => setTimeout(r, 50));
  assert.ok(reopened.isClosed(), 'once saved, the tab closes without a question');
  assert.equal(dialogs.length, 1);
  reopened = await open(first);
  await reopened.waitForFunction(() => window.LegalAtlas?.ready);
  const found = await reopened.evaluate(
    ([marker, late]) => [
      data.nodes.find((n) => n.id === 'cp-pennoyer').notes.includes(late),
      data.nodes.find((n) => n.id === 'citoh').notes.includes(marker),
    ],
    [marker, late],
  );
  assert.deepEqual(found, [true, true], 'both edits are in the atlas that opens');
});
// Leaving anyway (the question answered "leave", or a browser that never asks): the write started as the tab
// went is committed explicitly and lands.
await check('an edit made right before a reload that is not stopped is still saved', async () => {
  const late = marker + ' reloaded';
  await settled(reopened);
  reopened.on('dialog', (dialog) => dialog.accept().catch(() => {}));
  const waiting = await reopened.evaluate((late) => {
    const node = data.nodes.find((n) => n.id === 'cp-pennoyer');
    transact('Check last-moment edit', () => {
      node.notes = (node.notes || '') + ' ' + late;
    });
    return !!r7SaveTimer;
  }, late);
  assert.ok(waiting, 'the save was still waiting when the tab went');
  await reopened.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await reopened.locator('html.dkla-boot-ready').waitFor({ timeout: 120_000 });
  await reopened.waitForFunction(() => window.LegalAtlas?.ready);
  const found = await reopened.evaluate(
    (late) => data.nodes.find((n) => n.id === 'cp-pennoyer').notes.includes(late),
    late,
  );
  assert.ok(found, 'the last-moment edit was lost');
});
await check('no page errors', () => assert.deepEqual(errors, []));
await first.close();
await browser.close();
if (failures) {
  console.log(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log(
  'v3.2 main-thread work: index built once in slices, searches unchanged, view changes write nothing, edits saved, Cold Call and the dictionary respond at once.',
);
