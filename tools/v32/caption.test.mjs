/* The caption composer (src/features/v32/caption.js) on every Cold Call title.

     node --test tools/v32/caption.test.mjs

   A composed caption never changes a word; "v." is always tied to the first word of the party it
   introduces; consolidated cases come apart into one case each; a stage note is set apart; and the year a
   citation gives is read correctly. Reads source files only (tools/cold-call/narratives). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// The same file the page runs (a classic script that installs DKLACaption on its global).
const sandbox = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'src/features/v32/caption.js'), 'utf8'), sandbox);
const Caption = sandbox.DKLACaption;
const folder = path.join(root, 'tools/cold-call/narratives');
const accounts = fs
  .readdirSync(folder)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => {
    const data = JSON.parse(fs.readFileSync(path.join(folder, f), 'utf8'));
    return (Array.isArray(data) ? data : data.cases || [data]).filter((c) => c && c.title);
  });
const unescape = (s) =>
  s.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[e]);
const words = (markup) =>
  unescape(markup.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();

test('there are titles to compose', () => {
  assert.ok(accounts.length >= 700, `${accounts.length} titles found`);
});

test('a composed caption says the title, every word, in order', () => {
  for (const { title } of accounts) {
    const plain = title.replace(/\s+/g, ' ').trim();
    assert.equal(words(Caption.html(title)), plain, `html: ${title}`);
    assert.equal(words(Caption.inline(title)), plain, `inline: ${title}`);
  }
});

test('"v." is tied to the first word of the party it introduces, and never ends a caption', () => {
  let versus = 0;
  for (const { title } of accounts) {
    const html = Caption.html(title);
    for (const tie of html.matchAll(/<span class="cap-tie">([\s\S]*?)<\/span>\s*([^<]*)/g)) versus++;
    // Every "v." that separates parties is inside a tie, followed by a word.
    for (const v of html.matchAll(/<span class="cap-v">[^<]*<\/span>/g)) {
      const before = html.slice(0, v.index);
      assert.ok(before.endsWith('<span class="cap-tie">'), `an untied "v." in ${title}`);
      assert.match(html.slice(v.index + v[0].length), /^ \S/, `"v." ends the caption of ${title}`);
    }
    const { cases } = Caption.parse(title);
    for (const c of cases) if (c.v) assert.ok(c.first && c.second, `a party is missing in ${title}`);
  }
  assert.ok(versus >= 650, `${versus} captions have two parties`);
});

test('consolidated cases come apart, one case each, the second subordinate', () => {
  const sffa = accounts.find((a) => a.title.startsWith('Students for Fair Admissions'));
  assert.ok(sffa, 'the two Students for Fair Admissions cases are one account');
  const parsed = Caption.parse(sffa.title);
  assert.equal(parsed.cases.length, 2);
  assert.deepEqual(
    Array.from(parsed.cases, (c) => c.second),
    ['President and Fellows of Harvard College', 'University of North Carolina'],
  );
  const html = Caption.html(sffa.title);
  assert.equal((html.match(/class="cap-case/g) || []).length, 2);
  assert.match(html, /class="cap-case cap-sub"/);
  // A semicolon inside one case's name is not a second case.
  for (const { title } of accounts)
    for (const c of Caption.parse(title).cases)
      if (Caption.parse(title).cases.length > 1) assert.ok(c.v, `a "case" with one party in ${title}`);
});

test('a stage note is set apart from the parties', () => {
  const marrese = accounts.find((a) => /^Marrese v\. .* — /.test(a.title));
  assert.ok(marrese);
  const parsed = Caption.parse(marrese.title);
  assert.equal(parsed.cases[0].second, 'American Academy of Orthopaedic Surgeons');
  assert.match(parsed.note.text, /Seventh Circuit/);
  assert.match(Caption.html(marrese.title), /<span class="cap-note">/);
  // "Mark V" and the like are names, not "v."; brackets inside a name stay in the name.
  assert.equal(Caption.parse('Mark V Corp. v. Acme (Holdings) Ltd.').cases[0].first, 'Mark V Corp.');
  assert.equal(Caption.parse('Mark V Corp. v. Acme (Holdings) Ltd.').note, null);
});

test('the year a citation gives', () => {
  const cases = [
    ['552 F.2d 1228 (7th Cir. 1977)', '1977'],
    ['124 N.Y. 538 (1891)', '1891'],
    ['144 S. Ct. 2244 (2024)', '2024'],
    ['[1919] 2 K.B. 571', '1919'],
    ['2004-Ohio-786', '2004'],
    ['2022 WY 54', '2022'],
    ['457 N.W.2d 199 (Minn. 1990); 501 U.S. 663 (1991); 479 N.W.2d 387 (Minn. 1992)', '1990'],
    ['no year here', ''],
  ];
  for (const [citation, year] of cases) assert.equal(Caption.year(citation), year, citation);
  const dated = accounts.filter((a) => Caption.year(a.citation)).length;
  assert.ok(dated >= accounts.length - 12, `${dated} of ${accounts.length} citations give a year`);
});
