/* The splash picker (`choose`, `record`, `migrate` in src/features/splash/splash.js), loaded from the same
   file the page runs. Simulates 10,000 clicks with seeded randomness for lists of 20, 89 and 190 lines.
     node --test tools/splash/pick.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const context = vm.createContext({
  matchMedia: () => ({ matches: false }),
  document: { getElementById: () => null },
});
context.window = context;
vm.runInContext(fs.readFileSync(path.join(root, 'src/features/splash/splash.js'), 'utf8'), context);
const { choose, record, migrate, WINDOW } = context.DKLASplashPicker;
assert.equal(WINDOW, 100);

// mulberry32: a small seeded generator, so every run of this test sees the same picks.
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const makeLines = (n, prefix = 'Line') => Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}.`);
// Clicks through `count` lines, as the page does: choose, show, record. Returns the texts shown.
function run(list, count, random, history = { recent: [], seen: {} }) {
  const shown = [];
  for (let i = 0; i < count; i++) {
    const line = list[choose(list, history, random)];
    shown.push(line);
    history = record(history, line, list);
  }
  return { shown, history };
}
// The gap before each repeat (1 = twice in a row).
function gaps(shown) {
  const last = new Map(),
    out = [];
  shown.forEach((line, t) => {
    if (last.has(line)) out.push(t - last.get(line));
    last.set(line, t);
  });
  return out;
}
const SEEDS = [1, 2, 3, 4, 5];

for (const n of [20, 89, 190]) {
  test(`${n} lines, 10,000 clicks: never twice in a row, and spread out`, () => {
    const list = makeLines(n);
    const gap = context.DKLASplashPicker.gapFor(n);
    let within = 0,
      inside = 0,
      total = 0,
      shortest = Infinity,
      longest = 0,
      spread = 0;
    for (const seed of SEEDS) {
      const { shown } = run(list, 10_000, seeded(seed));
      const g = gaps(shown);
      assert.ok(!g.includes(1), `seed ${seed}: a line came twice in a row`);
      within += g.filter((x) => x < WINDOW).length;
      inside += g.filter((x) => x < gap).length;
      total += g.length;
      shortest = Math.min(shortest, ...g);
      longest = Math.max(longest, ...g);
      // Every line is shown, and the counts stay within a few of each other.
      const counts = new Map(list.map((line) => [line, 0]));
      for (const line of shown) counts.set(line, counts.get(line) + 1);
      spread = Math.max(spread, Math.max(...counts.values()) - Math.min(...counts.values()));
      assert.ok(Math.min(...counts.values()) > 0, `seed ${seed}: every line is shown`);
    }
    console.log(
      `${n} lines (${SEEDS.length} x 10,000 clicks): shortest gap ${shortest}, longest gap ${longest}, ` +
        `repeats within 100 picks ${within} of ${total} (${((100 * within) / total).toFixed(3)}%), ` +
        `inside the least gap (${gap}) ${inside}, ` +
        `largest difference in counts ${spread}`,
    );
    if (n === 190) {
      // At most one repeat in 5,000 inside the 100-pick window (measured: see the log line above).
      assert.ok(within / total < 2e-4, `${within} of ${total} repeats inside 100 picks`);
      assert.ok(shortest >= 90, `shortest gap ${shortest}`);
    } else {
      // Short lists: as long a gap as the list allows, and every line comes round.
      assert.ok(shortest >= Math.round(n * 0.7), `shortest gap ${shortest}`);
      assert.ok(inside / total < 2e-4, `${inside} of ${total} repeats inside the least gap of ${gap}`);
      assert.ok(longest <= n * 2, `longest gap ${longest}`);
      assert.ok(spread <= 2, `counts spread by ${spread}`);
    }
  });
}

test('89 lines: every line is shown before any line is shown a third time', () => {
  const list = makeLines(89);
  for (const seed of SEEDS) {
    const { shown } = run(list, 10_000, seeded(seed));
    // In every stretch of the run, not only the first: when a line reaches its (k + 2)th showing, every
    // line has had at least k + 1.
    const counts = new Map(list.map((line) => [line, 0]));
    let least = 0,
      atLeast = new Set();
    for (const line of shown) {
      const c = counts.get(line) + 1;
      counts.set(line, c);
      if (c === least + 1) atLeast.add(line);
      if (atLeast.size === list.length) {
        least++;
        atLeast = new Set([...counts].filter(([, k]) => k > least).map(([l]) => l));
      }
      assert.ok(c <= least + 2, `seed ${seed}: "${line}" shown ${c} times while another had ${least}`);
    }
  }
});

test('lines added mid-run start unseen and come up early', () => {
  const firsts = [],
    bulk = [];
  for (const seed of SEEDS) {
    const random = seeded(seed),
      old = makeLines(89);
    let { history } = run(old, 2_000, random);
    // One new line.
    const one = [...old, 'A brand-new line.'];
    let { shown, history: after } = run(one, 100, random, history);
    firsts.push(shown.indexOf('A brand-new line.') + 1);
    // About a hundred new lines at once (the list roughly doubles).
    const added = makeLines(101, 'New'),
      big = [...one, ...added];
    ({ shown } = run(big, 400, random, after));
    const firstShowing = added.map((line) => shown.indexOf(line) + 1);
    assert.ok(Math.min(...firstShowing) > 0, `seed ${seed}: every new line is shown`);
    const newInFirst30 = shown.slice(0, 30).filter((line) => line.startsWith('New ')).length;
    bulk.push({ newInFirst30, allShownBy: Math.max(...firstShowing) });
    // The old lines are not shut out while the new ones catch up (measured: about a fifth of the clicks).
    const oldShare = shown.slice(100).filter((line) => !line.startsWith('New ')).length / 300;
    assert.ok(oldShare >= 0.1, `seed ${seed}: old lines ${oldShare} of clicks 101-400`);
    bulk.at(-1).oldShare = oldShare;
    // And the window still holds across the change.
    assert.ok(!gaps(shown).some((g) => g < 90), `seed ${seed}: a repeat inside the window after the change`);
  }
  console.log(`one new line among 89: first shown at click ${firsts.join(', ')} (one run per seed)`);
  console.log(
    `101 new lines added to 90: ${bulk.map((b) => b.newInFirst30).join(', ')} of the first 30 clicks new; ` +
      `every new line shown by click ${bulk.map((b) => b.allShownBy).join(', ')}; ` +
      `old lines at clicks 101-400: ${bulk.map((b) => Math.round(100 * b.oldShare) + '%').join(', ')}`,
  );
  assert.ok(Math.max(...firsts) <= 30, `the new line waited ${Math.max(...firsts)} clicks`);
  for (const b of bulk) assert.ok(b.newInFirst30 >= 25 && b.allShownBy <= 200, JSON.stringify(b));
});

test('the first storage format migrates without losing counts', () => {
  const list = ['Alpha.', 'Beta.', 'Gamma.', 'Delta.'];
  const old = { last: 2, seen: { 'Alpha.': 5, 'Beta.': 1, 'Gamma.': 7, 'A removed line.': 3, bad: 'x' } };
  const h = migrate(JSON.parse(JSON.stringify(old)), list);
  assert.deepEqual(Array.from(h.recent), ['Gamma.'], 'the line last shown is remembered');
  assert.deepEqual(
    { ...h.seen },
    { 'Alpha.': 5, 'Beta.': 1, 'Gamma.': 7, 'A removed line.': 3 },
    'every count kept (by text)',
  );
  // So the next pick is not the line shown last, and favours the unseen Delta.
  let delta = 0;
  const random = seeded(9);
  for (let i = 0; i < 1000; i++) {
    const next = list[choose(list, h, random)];
    assert.notEqual(next, 'Gamma.');
    if (next === 'Delta.') delta++;
  }
  assert.ok(delta > 600, `Delta (never seen) chosen ${delta} times in 1000`);
  // Showing a line adds to its count; the new format reads back the same.
  const next = record(h, 'Delta.', list);
  assert.equal(next.seen['Delta.'], 1);
  assert.equal(next.seen['Alpha.'], 5);
  assert.deepEqual(Array.from(next.recent), ['Gamma.', 'Delta.']);
  const again = migrate(JSON.parse(JSON.stringify({ last: 3, ...next })), list);
  assert.deepEqual(JSON.parse(JSON.stringify(again)), JSON.parse(JSON.stringify(next)));
  // Nothing stored, or something unreadable: an empty history.
  for (const saved of [null, undefined, 42, 'text', { seen: null }, { recent: 'x' }]) {
    const empty = migrate(saved, list);
    assert.equal(empty.recent.length, 0);
    assert.equal(Object.keys(empty.seen).length, 0);
  }
});

test('the stored history stays small', () => {
  const list = makeLines(190);
  let history = { recent: [], seen: {} };
  // 1,000 lines that come and go: counts of lines no longer listed are dropped past the cap.
  for (let i = 0; i < 1000; i++) history = record(history, `Gone ${i}.`, list);
  for (let i = 0; i < 2000; i++) history = record(history, list[choose(list, history, Math.random)], list);
  assert.equal(history.recent.length, WINDOW);
  assert.ok(Object.keys(history.seen).length <= 600);
  for (const line of list) assert.ok(history.seen[line] > 0, 'listed lines keep their counts');
  const bytes = JSON.stringify(history).length;
  assert.ok(bytes < 40_000, `${bytes} bytes`);
});

test('one line, or two', () => {
  assert.equal(choose(['Only.'], { recent: ['Only.'], seen: {} }), 0);
  const { shown } = run(['A.', 'B.'], 50, seeded(3));
  assert.ok(!gaps(shown).includes(1), 'two lines alternate');
  const three = run(['A.', 'B.', 'C.'], 3000, seeded(4)).shown;
  assert.ok(!gaps(three).includes(1));
  assert.ok(new Set(three.slice(0, 3)).size === 3, 'three lines: all three first');
});
