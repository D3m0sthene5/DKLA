/* Exercise the real reader's render path for every built account.
 * This DOM stand-in catches data-shape/render exceptions. It does not replace
 * browser checks for layout, focus, scrolling or interaction.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const release = JSON.parse(fs.readFileSync(path.join(root, 'work/build/version.json'))).file;
const html = fs.readFileSync(
  process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'work/build', release),
  'utf8',
);
const match = html.match(/<script\b[^>]*\bid="dklaColdCallData"[^>]*>([\s\S]*?)<\/script>/);
assert.ok(match, 'Built narrative data is missing');
const data = JSON.parse(match[1]);
const glossaryBlock = html.match(/<script\b[^>]*\bid="dklaColdCallGlossary"[^>]*>([\s\S]*?)<\/script>/);
assert.ok(glossaryBlock, 'Built Cold Call definitions are missing');
const glossary = JSON.parse(glossaryBlock[1]);
class Element {
  constructor() {
    this.dataset = {};
    this.children = new Map();
    this.events = {};
    this.scrollTop = 0;
    this.open = false;
    this.innerHTML = '';
  }
  setAttribute() {}
  addEventListener(type, listener) {
    // Several features listen on the reader; calling the event runs them all in order.
    const listeners = (this.listeners ||= {});
    (listeners[type] ||= []).push(listener);
    this.events[type] = (event) => listeners[type].forEach((l) => l(event));
  }
  querySelector(key) {
    if (!this.children.has(key)) this.children.set(key, new Element());
    return this.children.get(key);
  }
  querySelectorAll() {
    return [];
  }
  getBoundingClientRect() {
    return { top: 0 };
  }
  showModal() {
    this.open = true;
  }
  close() {
    this.open = false;
  }
  replaceChildren() {
    this.innerHTML = '';
    this.children.clear();
  }
}
const elements = [];
const document = {
  activeElement: null,
  body: {
    appendChild(element) {
      elements.push(element);
    },
  },
  createElement() {
    return new Element();
  },
  getElementById(id) {
    if (id === 'dklaColdCallData') return { textContent: match[1] };
    if (id === 'dklaColdCallGlossary') return { textContent: glossaryBlock[1] };
    return elements.find((e) => e.id === id) || null;
  },
  addEventListener() {},
};
const window = {
  LegalAtlas: { ready: true },
  DKLABriefs: {
    text: (id) => 'Full source: ' + id,
    data: { entries: [] },
    render: (text) => '<p>' + text + '</p>',
  },
};
// Async fetch/cache/race behavior is tested against the actual loader separately.
window.DKLABriefLoader = {
  fill: (target, id, render) => {
    target.innerHTML = render(window.DKLABriefs.text(id));
  },
};
// The page's own paragraph splitting (src/runtime/semesterCode.js): a paragraph over 95 words is drawn as
// several <p> chunks, each annotated with its own link budget, so the checks below see what the page draws.
const chunker = fs
  .readFileSync(path.join(root, 'src/runtime/semesterCode.js'), 'utf8')
  .match(/^function r6ReadingChunks\(text\) \{[\s\S]*?^\}$/m);
assert.ok(chunker, 'r6ReadingChunks is no longer in src/runtime/semesterCode.js');
const context = {
  window,
  document,
  localStorage: {
    getItem() {
      return null;
    },
  },
  matchMedia() {
    return { matches: true, addEventListener() {} };
  },
};
vm.createContext(context);
vm.runInContext(chunker[0], context);
const chunks = (text) => context.r6ReadingChunks(text);
assert.equal(
  typeof Intl.Segmenter,
  'function',
  'this Node has no Intl.Segmenter: long paragraphs would not be split',
);
// The definitions layer loads first, exactly as in src/features/manifest.json.
for (const file of ['glossary.js', 'reader.js'])
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '../../src/features/cold-call', file), 'utf8'),
    context,
  );
const gloss = window.DKLAColdCallGloss;
assert.ok(gloss, 'Cold Call definitions did not install');
const compiled = gloss.compile(glossary);
const maxPerParagraph = compiled.density.maxPerParagraph;
const TERM =
  /<span class="cc-term" role="button" tabindex="0" data-cc-term="([a-z0-9-]+)" aria-haspopup="dialog" aria-expanded="false" aria-describedby="ccGlossDesc-\1">([^<]*)<\/span>/g;
// The reader's text with every definition link unwrapped: it must be the narrative, unchanged.
const plain = (markup) => markup.replace(TERM, '$2');
const stats = { links: 0, paragraphsWithLinks: 0, accountsWithLinks: 0, terms: new Set(), split: 0 };
const words = (text) => String(text).trim().split(/\s+/).join(' ');
const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const dialog = document.getElementById('coldCallDialog');
for (const account of data.cases) {
  window.DKLAColdCall.open(account.id);
  assert.equal(dialog.open, true, `${account.id}: reader did not open`);
  assert.equal(
    (dialog.innerHTML.match(/class="cc-section"/g) || []).length,
    account.sections.length,
    `${account.id}: missing episode`,
  );
  const text = plain(dialog.innerHTML);
  for (const section of account.sections)
    for (const paragraph of section.paragraphs) {
      const parts = chunks(paragraph);
      // Splitting keeps every word, in order.
      assert.equal(words(parts.join(' ')), words(paragraph), `${account.id}: a split paragraph lost words`);
      if (parts.length > 1) stats.split++;
      assert.ok(
        text.includes(parts.map((part) => `<p>${escape(part)}</p>`).join('')),
        `${account.id}: missing or unescaped narrative paragraph`,
      );
    }
  for (const section of account.sections)
    if (section.followUp) {
      assert.ok(
        text.includes(`<p>${escape(section.followUp.answer)}</p>`),
        `${account.id}: missing follow-up explanation after practice removal`,
      );
    }
  // Definition links: only known terms, each at most once per episode, at most maxPerParagraph
  // per paragraph, never in headings, citations or the source list, and at least two plain words between two links.
  const used = new Set();
  const sections = dialog.innerHTML.split('<section class="cc-section"').slice(1);
  assert.equal(sections.length, account.sections.length, `${account.id}: episode markup`);
  for (const markup of sections) {
    const seen = new Set();
    for (const [, key] of markup.matchAll(TERM)) {
      assert.ok(compiled.terms.has(key), `${account.id}: unknown definition ${key}`);
      assert.ok(!seen.has(key), `${account.id}: ${key} linked twice in one episode`);
      seen.add(key);
      used.add(key);
      stats.terms.add(key);
      stats.links++;
    }
    for (const [, body] of markup.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
      const n = (body.match(TERM) || []).length;
      assert.ok(n <= maxPerParagraph, `${account.id}: ${n} definitions in one paragraph`);
      if (n) stats.paragraphsWithLinks++;
      // At least two plain words between two links.
      for (const [, between] of body.matchAll(
        /<\/span>((?:(?!<span class="cc-term")[\s\S])*?)<span class="cc-term"/g,
      ))
        assert.ok(
          (between.replace(/<[^>]*>/g, ' ').match(/[\p{L}\p{N}]+/gu) || []).length >= 2,
          `${account.id}: two links with fewer than two words between them`,
        );
    }
    for (const plainPart of markup.split(/<p>[\s\S]*?<\/p>/))
      assert.ok(!plainPart.includes('cc-term'), `${account.id}: a definition outside a paragraph`);
  }
  if (used.size) stats.accountsWithLinks++;
  for (const key of used)
    assert.ok(
      dialog.innerHTML.includes(
        `<span id="ccGlossDesc-${key}">${escape(compiled.terms.get(key).gloss)}</span>`,
      ),
      `${account.id}: ${key} has no screen-reader description`,
    );
  assert.ok(
    !/ccPractice|ccRehearsal|ccRating|cc-lead|cc-orientation/.test(dialog.innerHTML),
    `${account.id}: retired practice controls or redundant introduction rendered`,
  );
  if (account.notice)
    assert.ok(dialog.innerHTML.includes(escape(account.notice)), `${account.id}: missing source notice`);
  const limits = Array.isArray(account.limits) ? account.limits : [account.limits];
  for (const limit of limits)
    assert.ok(
      dialog.innerHTML.includes(`<p>${escape(limit)}</p>`),
      `${account.id}: missing source qualification`,
    );
  window.DKLAColdCall.close();
  assert.equal(dialog.innerHTML, '', `${account.id}: closed reader retained searchable prose`);
}
// The Garcia account, as the owner described it: "compromised" and "moved to dismiss" are defined; names and plain words are not.
{
  window.DKLAColdCallGloss.close();
  window.DKLAColdCall.open('cp-garcia');
  const links = [...dialog.innerHTML.matchAll(TERM)].map(([, key, word]) => [key, word]);
  const has = (key, word) => links.some(([k, w]) => k === key && w === word);
  assert.ok(has('compromise', 'compromised'), 'Garcia: "compromised" is not defined');
  assert.ok(has('motion-to-dismiss', 'moved to dismiss'), 'Garcia: "moved to dismiss" is not defined');
  assert.ok(has('removal', 'removed'), 'Garcia: "removed" (to federal court) is not defined');
  assert.ok(has('motion-to-strike', 'struck'), 'Garcia: "struck" is not defined');
  assert.ok(
    !links.some(([, w]) => /hilton|prostitution|puerto|roberts/i.test(w)),
    'Garcia: a name or plain word is linked',
  );
  assert.ok(compiled.terms.get('compromise').wex === 'compromise', 'compromise has no Wex entry');
  window.DKLAColdCall.close();
}
// Exercise the nested source view and return, keyboard isolation, and reopening position.
const account = data.cases.find((c) => c.sources.some((s) => s.briefId));
assert.ok(account, 'No source-brief fixture in compiled narratives');
window.DKLAColdCall.open(account.id);
const briefId = account.sources.find((s) => s.briefId).briefId;
dialog.events.click({
  target: {
    closest: () => ({
      hasAttribute: (name) => name === 'data-cc-source-brief',
      dataset: { ccSourceBrief: briefId },
    }),
  },
});
const sourceDialog = document.getElementById('ccBriefDialog');
assert.equal(sourceDialog.open, true, 'Full source brief did not open');
assert.ok(
  sourceDialog.querySelector('.cc-brief-body').innerHTML.includes('Full source: ' + briefId),
  'Source view lost source content',
);
sourceDialog.querySelector('#ccBriefClose').onclick();
assert.equal(sourceDialog.open, false, 'Source return failed');
assert.equal(dialog.open, true, 'Source return closed the narrative');
let isolated = false;
dialog.events.keydown({
  stopPropagation() {
    isolated = true;
  },
});
assert.equal(isolated, true, 'Reader shortcuts reached the map');
dialog.querySelector('#ccScroll').scrollTop = 123;
window.DKLAColdCall.close();
window.DKLAColdCall.open(account.id);
assert.equal(dialog.querySelector('#ccScroll').scrollTop, 123, 'Reopening lost reading position');
window.DKLAColdCall.close();
console.log(
  JSON.stringify({
    rendered: data.cases.length,
    followUpExplanations: data.cases.reduce((n, c) => n + c.sections.filter((s) => s.followUp).length, 0),
    arrayLimits: data.cases.filter((c) => Array.isArray(c.limits)).length,
    sourceReturn: true,
    keyboardIsolation: true,
    readingPosition: true,
    retiredPractice: true,
    definitions: {
      terms: compiled.terms.size,
      linked: stats.terms.size,
      links: stats.links,
      paragraphsWithLinks: stats.paragraphsWithLinks,
      accountsWithLinks: stats.accountsWithLinks,
      paragraphsSplitIntoChunks: stats.split,
    },
  }),
);
