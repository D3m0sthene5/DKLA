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
const plainBlock = html.match(/<script\b[^>]*\bid="dklaColdCallPlain"[^>]*>([\s\S]*?)<\/script>/);
assert.ok(plainBlock, 'Built plain-English sentences are missing');
const plainTable = JSON.parse(plainBlock[1]);
class Element {
  constructor() {
    this.dataset = {};
    this.children = new Map();
    this.events = {};
    this.scrollTop = 0;
    this.open = false;
    this.innerHTML = '';
    this.attributes = new Map();
    this.classList = { toggle() {}, add() {}, remove() {} };
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  toggleAttribute(name, on = !this.attributes.has(name)) {
    if (on) this.attributes.set(name, '');
    else this.attributes.delete(name);
  }
  hasAttribute(name) {
    return this.attributes.has(name);
  }
  focus() {}
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
    if (id === 'dklaColdCallPlain') return { textContent: plainBlock[1] };
    return elements.find((e) => e.id === id) || null;
  },
  addEventListener() {},
  querySelector() {
    return null;
  },
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
    setItem() {},
    removeItem() {},
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
// The definitions layer loads first, exactly as in src/features/manifest.json; captions are composed by
// src/features/v32/caption.js, which the reader looks for when it draws.
for (const file of [
  'cold-call/glossary.js',
  'cold-call/reader.js',
  'v32/caption.js',
  'v32/coldcall-answers.js',
])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../src/features', file), 'utf8'), context);
assert.ok(window.DKLACaption, 'the caption composer did not install');
const answers = window.DKLAColdCallAnswers?.answers;
assert.ok(answers && Object.keys(answers).length, 'the stored direct answers did not install');
const gloss = window.DKLAColdCallGloss;
assert.ok(gloss, 'Cold Call definitions did not install');
const compiled = gloss.compile(glossary);
const maxPerParagraph = compiled.density.maxPerParagraph;
const TERM =
  /<span class="cc-term" role="button" tabindex="0" data-cc-term="([a-z0-9-]+)" aria-haspopup="dialog" aria-expanded="false" aria-describedby="ccGlossDesc-\1">([^<]*)<\/span>/g;
// A plain-English marker: an empty button (its glyph is drawn by CSS) after the sentence it explains.
const MARK =
  /<span class="cc-plain" role="button" tabindex="0" data-cc-plain="(p\d+)" data-cc-plain-from="(\d+)" aria-label="In plain English" aria-haspopup="dialog" aria-expanded="false" aria-describedby="ccPlainDesc-\1"><\/span>/g;
// The reader's text with every definition link unwrapped and every plain-English marker removed: it must
// be the narrative, unchanged.
const plain = (markup) => markup.replace(TERM, '$2').replace(MARK, '');
const unescape = (s) =>
  s.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[e]);
// Sentences compared as the page matches them: any whitespace, straight or curly quotes.
const norm = (s) => s.replace(/\s+/g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim();
const plainCompiled = gloss.compilePlain(plainTable);
const plainStats = { entries: 0, placed: 0, accounts: 0, unplaced: [] };
const stats = { links: 0, paragraphsWithLinks: 0, accountsWithLinks: 0, terms: new Set(), split: 0 };
const words = (text) => String(text).trim().split(/\s+/).join(' ');
const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const dialog = document.getElementById('coldCallDialog');
const listOf = (value) => (Array.isArray(value) ? value : value ? [value] : []);
// Markup with its tags taken out and its entities read: what the words on the page are.
const wordsOf = (markup) => words(unescape(markup.replace(/<[^>]*>/g, '')));
const setup = { leads: 0, actors: 0, steps: 0, cues: 0, direct: 0 };
for (const account of data.cases) {
  window.DKLAColdCall.open(account.id);
  assert.equal(dialog.open, true, `${account.id}: reader did not open`);
  // The setup (v3.2): the caption composed without changing a word, the citation, the lead, every actor
  // with their role, every step through the courts; then each episode under its own prompt.
  {
    const html = dialog.innerHTML;
    const head = html.match(/<h2 class="cc-caption"[^>]*>([\s\S]*?)<\/h2>/);
    assert.ok(head, `${account.id}: no caption`);
    assert.equal(
      wordsOf(head[1]),
      words(account.title),
      `${account.id}: the composed caption changed the title`,
    );
    assert.ok(
      !/(^|\s)v\.?<\/span>\s*<\/span>/.test(head[1]),
      `${account.id}: "v." is not tied to the party it introduces`,
    );
    assert.ok(
      html.includes(`<span class="cc-cite">${escape(account.citation)}</span>`),
      `${account.id}: citation`,
    );
    assert.ok(
      html.includes(`<p class="cc-lead">${escape(account.lead)}</p>`),
      `${account.id}: the lead is not shown`,
    );
    setup.leads++;
    for (const actor of account.actors) {
      assert.ok(
        html.includes(`<dt>${escape(actor.name)}</dt><dd>${escape(actor.role)}</dd>`),
        `${account.id}: ${actor.name} is not in the cast`,
      );
      setup.actors++;
    }
    const steps = listOf(account.proceedings);
    for (const step of steps) {
      assert.ok(
        html.includes(
          steps.length > 1 ? `<li>${escape(step)}</li>` : `<p class="cc-path-one">${escape(step)}</p>`,
        ),
        `${account.id}: a step through the courts is missing`,
      );
      setup.steps++;
    }
    account.sections.forEach((section, i) => {
      // The episode's own title is its heading; its prompt is a paragraph (a margin note when read, the
      // thing asked when rehearsed), after the title.
      const title = `<h3 class="cc-title" id="cc-heading-${escape(section.id)}" tabindex="-1">${escape(section.title)}</h3>`,
        cue = `<p class="cc-cue" id="cc-cue-${escape(section.id)}"${section.cue.length > 80 ? ' data-cc-long' : ''} tabindex="-1"><span class="cc-cue-label">If called on</span> ${escape(section.cue)}</p>`;
      assert.ok(
        html.includes(title + cue),
        `${account.id}: episode ${i + 1} is not headed by its title, then its prompt`,
      );
      setup.cues++;
      // A stored direct answer is shown under the label its kind earns ("Answer" for tightened wording; the
      // word-for-word label only on the episode's own sentences), with the link to its passage, and every
      // sentence it is linked to is in the paragraph of this episode that it names; no other episode has one.
      const stored = answers[account.id]?.[section.id],
        at = html.indexOf(`<div class="cc-direct" id="cc-direct-${escape(section.id)}"`),
        block = at < 0 ? null : html.slice(at, html.indexOf('</div>', at));
      if (stored) {
        assert.ok(block, `${account.id} ${section.id}: its stored answer is not shown`);
        assert.ok(
          ['verbatim', 'paraphrase'].includes(stored.kind),
          `${account.id} ${section.id}: the answer does not record whether it is verbatim or paraphrased`,
        );
        assert.ok(
          block.includes(
            `<p class="cc-direct-label">${stored.kind === 'verbatim' ? 'The answer, in this episode’s own words' : 'Answer'}</p>`,
          ),
          `${account.id} ${section.id}: the answer's label does not fit its kind`,
        );
        assert.ok(stored.from?.length, `${account.id} ${section.id}: the answer is linked to no passage`);
        for (const link of stored.from)
          assert.ok(
            words(section.paragraphs[link.p] || '').includes(words(link.text)),
            `${account.id} ${section.id}: a linked sentence is not in paragraph ${link.p} of the episode`,
          );
        assert.ok(
          block.includes(`data-cc-passage="${i}">Where the episode says this</button>`),
          `${account.id} ${section.id}: the answer has no link to its passage`,
        );
        const text = words(section.paragraphs.join(' '));
        for (const sentence of stored.say) {
          if (stored.kind === 'verbatim')
            assert.ok(
              text.includes(words(sentence)),
              `${account.id} ${section.id}: a verbatim sentence is not in the episode`,
            );
          assert.ok(
            block.includes(`<p class="cc-direct-say">${escape(words(sentence))}</p>`),
            `${account.id} ${section.id}: a stored sentence is not shown`,
          );
        }
        setup.direct++;
      } else assert.ok(!block, `${account.id} ${section.id}: an answer is shown that was never stored`);
    });
    // One action at the foot, one switch, and the frost over each narration (shown only while rehearsing).
    assert.equal((html.match(/data-cc-act/g) || []).length, 1, `${account.id}: one action at the foot`);
    assert.equal((html.match(/data-cc-mode-set=/g) || []).length, 2, `${account.id}: one switch`);
    assert.equal(
      (html.match(/class="cc-cover"/g) || []).length,
      account.sections.length,
      `${account.id}: a cover for every narration`,
    );
  }
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
      // At least two plain words between two links (a plain-English marker is not a link).
      for (const [, between] of body
        .replace(MARK, '')
        .matchAll(/<\/span>((?:(?!<span class="cc-term")[\s\S])*?)<span class="cc-term"/g))
        assert.ok(
          (between.replace(/<[^>]*>/g, ' ').match(/[\p{L}\p{N}]+/gu) || []).length >= 2,
          `${account.id}: two links with fewer than two words between them`,
        );
    }
    for (const plainPart of markup.split(/<p>[\s\S]*?<\/p>/)) {
      assert.ok(!plainPart.includes('cc-term'), `${account.id}: a definition outside a paragraph`);
      assert.ok(
        !plainPart.includes('class="cc-plain"'),
        `${account.id}: a plain-English marker outside a paragraph`,
      );
    }
  }
  if (used.size) stats.accountsWithLinks++;
  // Plain-English markers: each sits right after the sentence it explains (the text from data-cc-plain-from
  // up to the marker is that sentence, plus its closing punctuation), never inside a definition link, and
  // has its screen-reader description. Every listed entry must be placed; the unplaced are listed at the end.
  {
    const shown = new Map(gloss.plainShown().map((e) => [e.id, e]));
    const markerIds = [];
    for (const [, body] of dialog.innerHTML.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
      for (const link of body.matchAll(/<span class="cc-term"[^>]*>([\s\S]*?)<\/span>/g))
        assert.ok(!link[1].includes('cc-plain'), `${account.id}: a plain-English marker inside a link`);
      const words = body.replace(TERM, '$2');
      for (const m of words.matchAll(MARK)) {
        const entry = shown.get(m[1]);
        assert.ok(entry, `${account.id}: marker ${m[1]} explains nothing`);
        markerIds.push(m[1]);
        const before = unescape(words.slice(0, m.index).replace(MARK, ''));
        const explained = norm(before.slice(+m[2]));
        const sentence = norm(entry.sentence);
        assert.ok(
          explained.startsWith(sentence) && /^[.!?…]*["'”’)\]]*$/.test(explained.slice(sentence.length)),
          `${account.id} ${entry.at}: the marker is not right after "${entry.sentence}" (found "${explained}")`,
        );
      }
    }
    assert.deepEqual(markerIds.sort(), [...shown.keys()].sort(), `${account.id}: markers and entries differ`);
    for (const [id, entry] of shown)
      assert.ok(
        dialog.innerHTML.includes(`<span id="ccPlainDesc-${id}">${escape(entry.plain)}</span>`),
        `${account.id}: plain-English entry ${id} has no screen-reader description`,
      );
    const listed = [...(plainCompiled.cases.get(account.id)?.values() || [])].flat();
    const placed = new Set([...shown.values()].map((e) => e.n));
    plainStats.entries += listed.length;
    plainStats.placed += placed.size;
    if (placed.size) plainStats.accounts++;
    for (const entry of listed)
      if (!placed.has(entry.n)) plainStats.unplaced.push(`${account.id} ${entry.at}: "${entry.sentence}"`);
  }
  for (const key of used)
    assert.ok(
      dialog.innerHTML.includes(
        `<span id="ccGlossDesc-${key}">${escape(compiled.terms.get(key).gloss)}</span>`,
      ),
      `${account.id}: ${key} has no screen-reader description`,
    );
  assert.ok(
    !/ccPractice|ccRehearsal|ccRating/.test(dialog.innerHTML),
    `${account.id}: retired practice controls rendered`,
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
// Every stored answer was met above: none is filed under a case or an episode that does not exist.
assert.equal(
  setup.direct,
  Object.values(answers).reduce((n, episodes) => n + Object.keys(episodes).length, 0),
  'a stored direct answer belongs to no episode',
);
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
// Every listed plain-English sentence was found in its paragraph. The page skips the others silently, so
// this is where a sentence that was misquoted or given the wrong "at" shows up: all of them, listed.
assert.deepEqual(
  plainStats.unplaced,
  [],
  `${plainStats.unplaced.length} plain-English sentences are not in their paragraph (or end where another listed sentence ends):\n  ` +
    plainStats.unplaced.join('\n  '),
);
// Erie, as the owner asked: the licensee sentence has its plain-English marker right after it.
{
  window.DKLAColdCall.open('cp-erie-decision');
  const licensee = 'Tompkins claimed longstanding open use made him a licensee entitled to ordinary care.';
  const entry = gloss.plainShown().find((e) => e.sentence === licensee);
  assert.ok(entry, 'Erie: the licensee sentence has no plain-English version');
  assert.ok(
    plain(dialog.innerHTML.split(`data-cc-plain="${entry.id}"`)[0]).endsWith(
      'made him a licensee entitled to ordinary care.<span class="cc-plain" role="button" tabindex="0" ',
    ),
    'Erie: the marker is not right after the licensee sentence',
  );
  window.DKLAColdCall.close();
}
// An account with fields missing draws without them and without their headings (none of the 742 lacks any
// today, so the fields are taken away here, from this copy of the data, and put back).
{
  const account = data.cases[0];
  const copy = JSON.parse(match[1]);
  const bare = copy.cases[0];
  delete bare.lead;
  bare.actors = [];
  delete bare.proceedings;
  bare.limits = '';
  bare.citation = '';
  bare.sections[0].cue = '';
  const bareContext = {
    ...context,
    window: { ...window, DKLAColdCall: undefined, DKLAColdCallGloss: undefined },
  };
  const bareElements = [];
  bareContext.document = {
    ...document,
    body: { appendChild: (element) => bareElements.push(element) },
    getElementById: (id) =>
      id === 'dklaColdCallData'
        ? { textContent: JSON.stringify(copy) }
        : id.startsWith('dkla')
          ? document.getElementById(id)
          : bareElements.find((e) => e.id === id) || null,
  };
  vm.createContext(bareContext);
  vm.runInContext(chunker[0], bareContext);
  for (const file of ['cold-call/glossary.js', 'cold-call/reader.js', 'v32/caption.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../../src/features', file), 'utf8'), bareContext);
  bareContext.window.DKLAColdCall.open(account.id);
  const html = bareElements.find((e) => e.id === 'coldCallDialog').innerHTML;
  assert.ok(html.includes('class="cc-setup"'), 'bare account: no setup');
  assert.ok(html.includes('data-cc-bare'), 'bare account: the setup still claims a whole screen');
  for (const gone of [
    'cc-lead',
    'cc-cast',
    'cc-path',
    'cc-briefing',
    'cc-cite',
    'Who is involved',
    'How it got here',
  ])
    assert.ok(!html.includes(gone), `bare account: ${gone} is drawn with nothing in it`);
  assert.ok(
    !html.includes('What this case does not decide'),
    'bare account: a heading for limits with no limits',
  );
  assert.ok(
    /<p class="cc-cue"[^>]*><span class="cc-cue-label">If called on<\/span> Episode 1<\/p>/.test(html),
    'bare account: an episode with no prompt is not told from its number',
  );
  assert.equal(
    (html.match(/class="cc-section"/g) || []).length,
    account.sections.length,
    'bare account: episodes',
  );
  bareContext.window.DKLAColdCall.close();
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
    setup,
    bareAccount: true,
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
    plainEnglish: { entries: plainStats.entries, placed: plainStats.placed, accounts: plainStats.accounts },
  }),
);
