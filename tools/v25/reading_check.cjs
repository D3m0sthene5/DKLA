const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
// A bounded DOM stand-in exercises the real module's selectors and moves.
// Layout, focus and actual browser observers are checked by the parent browser pass.
class El {
  constructor(tag = 'div', classes = '', text = '') {
    this.tagName = tag.toUpperCase();
    this.classes = new Set(classes.split(/\s+/).filter(Boolean));
    this.children = [];
    this.parentElement = null;
    this._text = text;
    this.dataset = {};
    this.hidden = false;
    this.classList = {
      add: (...c) => c.forEach((x) => this.classes.add(x)),
      remove: (...c) => c.forEach((x) => this.classes.delete(x)),
      contains: (c) => this.classes.has(c),
      toggle: (c, on) => (on ? this.classes.add(c) : this.classes.delete(c)),
    };
  }
  get textContent() {
    return this._text + this.children.map((c) => c.textContent).join('');
  }
  set textContent(v) {
    this._text = v;
    this.children = [];
  }
  get nextElementSibling() {
    if (!this.parentElement) return null;
    return this.parentElement.children[this.parentElement.children.indexOf(this) + 1] || null;
  }
  set className(v) {
    this.classes = new Set(v.split(/\s+/).filter(Boolean));
  }
  get className() {
    return [...this.classes].join(' ');
  }
  appendChild(c) {
    c.remove();
    this.children.push(c);
    c.parentElement = this;
    return c;
  }
  before(c) {
    const p = this.parentElement;
    c.remove();
    p.children.splice(p.children.indexOf(this), 0, c);
    c.parentElement = p;
  }
  after(c) {
    const p = this.parentElement;
    c.remove();
    p.children.splice(p.children.indexOf(this) + 1, 0, c);
    c.parentElement = p;
  }
  append(...nodes) {
    nodes.forEach((n) => this.appendChild(n));
  }
  prepend(c) {
    c.remove();
    this.children.unshift(c);
    c.parentElement = this;
  }
  replaceChildren(...nodes) {
    this.children.forEach((c) => (c.parentElement = null));
    this.children = [];
    this.append(...nodes);
  }
  setAttribute(name, value) {
    (this.attributes ||= {})[name] = String(value);
  }
  removeAttribute(name) {
    if (this.attributes) delete this.attributes[name];
  }
  addEventListener() {}
  insertBefore(c, anchor) {
    c.remove();
    this.children.splice(this.children.indexOf(anchor), 0, c);
    c.parentElement = this;
  }
  remove() {
    if (this.parentElement) {
      const a = this.parentElement.children;
      a.splice(a.indexOf(this), 1);
      this.parentElement = null;
    }
  }
  matchesSimple(s) {
    let not;
    s = s.replace(/:not\(([^)]+)\)/g, (_, x) => {
      not = x;
      return '';
    });
    if (not && this.matchesSimple(not)) return false;
    const tag = s.match(/^[a-z][a-z0-9]*/i);
    if (tag && this.tagName !== tag[0].toUpperCase()) return false;
    for (const c of s.matchAll(/\.([\w-]+)/g)) if (!this.classes.has(c[1])) return false;
    for (const a of s.matchAll(/\[data-([\w-]+)(?:="([^"]*)")?\]/g)) {
      const key = a[1].replace(/-([a-z])/g, (_, x) => x.toUpperCase());
      if (!(key in this.dataset)) return false;
      if (a[2] !== undefined && this.dataset[key] !== a[2]) return false;
    }
    return true;
  }
  // Compound selectors joined by a space (descendant) or '>' (child), optionally starting at ':scope >'.
  querySelectorAll(selector) {
    const out = [],
      all = [];
    const walk = (p) =>
      p.children.forEach((c) => {
        all.push(c);
        walk(c);
      });
    walk(this);
    for (const part of selector.split(',')) {
      let text = part.trim(),
        child = false;
      if (text.startsWith(':scope')) {
        text = text.slice(6).trim();
        child = text.startsWith('>');
      }
      const steps = [];
      let next = child ? '>' : ' ';
      for (const piece of text.split(/\s+/).filter(Boolean)) {
        if (piece === '>') next = '>';
        else {
          steps.push([piece, next]);
          next = ' ';
        }
      }
      const fits = (e, i) => {
        if (!e || e === this || !e.matchesSimple(steps[i][0])) return false;
        const how = steps[i][1];
        if (i === 0) return how === '>' ? e.parentElement === this : true;
        if (how === '>') return fits(e.parentElement, i - 1);
        for (let p = e.parentElement; p && p !== this; p = p.parentElement) if (fits(p, i - 1)) return true;
        return false;
      };
      for (const e of all) if (fits(e, steps.length - 1) && !out.includes(e)) out.push(e);
    }
    return out;
  }
  querySelector(s) {
    return this.querySelectorAll(s)[0] || null;
  }
  closest(s) {
    let e = this;
    while (e) {
      if (e.matchesSimple(s)) return e;
      e = e.parentElement;
    }
    return null;
  }
  contains(e) {
    while (e) {
      if (e === this) return true;
      e = e.parentElement;
    }
    return false;
  }
  scrollIntoView() {}
  focus() {}
  // Nothing is laid out here: layout, the rail's mark and scrolling are checked in a real browser.
  getClientRects() {
    return [];
  }
}
const el = (tag, cls, text, parent) => {
  const e = new El(tag, cls, text);
  if (parent) parent.appendChild(e);
  return e;
};
const inspector = el('aside'),
  supporting = el('main');
let body = el('div', 'reader-body', '', inspector);
const title = el('div', 'dkla-record-title', '', body);
el('h2', '', 'Pennoyer v. Neff', title);
const caption = el('p', 'dkla-icon-caption', 'Property sold while its owner was absent', body);
const cold = el('button', 'cc-launch', 'Cold call', body);
cold.dataset.coldCall = 'cp-pennoyer';
el('p', 'dkla-rule-label', 'In plain English', body);
const intro = el('div', 'takeaway dkla-rule r22-plain', '', body);
const plain = el('p', 'r22-plain-text', 'A court needs a valid basis to bind a defendant.', intro);
const legacy = el('details', 'v25-legal-rule', '', intro);
el('summary', '', 'Legal rule', legacy);
el('div', 'r22-rule-sub', 'Repeated formal summary', legacy);
const timeline = el('section', 'dkla-timeline', '', body);
const track = el('ol', '', '', timeline);
el('li', '', 'Authored timeline step', track);
const secondTimeline = el('section', 'dkla-timeline', 'Another complete timeline', body);
const caution = el('div', 'source-caution', 'Only part of the case was assigned.', body);
const chips = el('div', 'dkla-file-chips', '', body);
const sourceButton = el('button', '', 'Assigned source', chips);
sourceButton.dataset.dklaFile = 'source.pdf#page=12';
const caseBox = el('div', 'case-box', '', body);
const parties = el('section', '', '', caseBox);
el('h3', '', 'Parties', parties);
el('p', '', 'The parties remain here.', parties);
const holding = el('section', '', '', caseBox);
el('h3', '', 'Holding', holding);
el('p', '', 'Full holding and reasoning remain here.', holding);
el('h3', '', 'Notes', body);
const caseNotes = el('div', 'note-text', 'Qualifications remain here.', body);
const editingDrawer = el('details', 'quiet-details', '', body);
el('summary', '', 'Your notes and editing', editingDrawer);
const votes = el('section', 'sh-case-panel', 'The Court voted.', editingDrawer);
const actions = el('div', 'reading-actions', 'Edit entry', editingDrawer);
const record = el('details', 'quiet-details', '', body);
el('summary', '', 'Record details', record);
el('dl', 'metadata-grid', 'Record ID', record);
const brief = el('section', 'r19-brief', '', body);
const full = el('details', 'r19-full', '', brief);
el('div', 'r19-text', 'Canonical full brief remains here.', full);
const oldStudy = el('details', 'v25-study-tools', '', body);
el('summary', '', 'Study tools', oldStudy);
const recall = el('div', 'r18-recall', 'Recall choices', oldStudy);
const oldTerms = el('details', 'v25-term-details', '', body);
el('summary', '', 'Legal terms', oldTerms);
const terms = el('section', 'dkla-terms', '', oldTerms);
el('h3', '', 'Terms in this entry', terms);
const termButton = el('button', '', 'Personal jurisdiction', terms);
termButton.dataset.dklaTerm = 'personal_jurisdiction';
const line = el('div', 'r19-line', '', supporting);
const supportCold = el('button', '', 'Cold call', line);
supportCold.dataset.coldCall = 'sup';
el('span', '', 'Source review and edition', line);
el('div', 'r19-rule', 'Duplicate one-line rule', supporting);
const section = el('section', 'r19-sec', '', supporting);
el('p', '', 'Entire authored supporting holding.', section);
const supportFull = el('details', 'r19-full', 'Full supporting brief', supporting);
const document = {
  getElementById: (id) => ({ inspector, r19Body: supporting })[id] || null,
  createElement: (tag) => el(tag),
  addEventListener() {},
};
const window = {};
const context = {
  document,
  window,
  MutationObserver: class {
    observe() {}
  },
  queueMicrotask: (fn) => fn(),
};
vm.runInNewContext(fs.readFileSync('src/features/v25/reading.js', 'utf8'), context);
for (let i = 0; i < 20; i++) window.DKLAReading.paint();
assert.equal(intro.children.length, 1);
assert.equal(intro.children[0], plain);
assert.equal(body.querySelector('.dkla-rule-label'), null);
assert.equal(body.querySelector('.v25-legal-rule'), null);
assert.equal(body.querySelector('.v25-study-tools'), null);
assert.equal(body.querySelector('.v25-term-details'), null);
assert.equal(timeline.parentElement.className, 'v28-case-timelines');
assert.equal(timeline.parentElement.parentElement, body);
assert.equal(secondTimeline.parentElement, timeline.parentElement);
assert.deepEqual(timeline.parentElement.children, [timeline, secondTimeline]);
assert.equal(track.children[0].textContent, 'Authored timeline step');
assert.deepEqual(caseBox.children, [parties, holding]);
assert.equal(full.parentElement, brief);
// v3.2: one order and one facet per block. The header (name, citation line, the line under its picture),
// the facet bar with the Cold Call button's place, the rail, then every block marked with its facet.
const names = (list) => list.map((x) => x.className.split(' ').pop());
assert.deepEqual(names(body.children.slice(0, 4)), ['v32-head', 'v32-bar', 'v32-panel', 'v31-rail']);
const head = body.children[0];
assert.deepEqual(names(head.children), ['dkla-record-title', 'v32-meta', 'v32-tag']);
assert.equal(caption.parentElement, head.querySelector('.v32-tag'));
assert.equal(cold.parentElement, body.querySelector('.v32-cc'));
assert.equal(body.querySelector('.v32-tabs').attributes.role, 'tablist');
const facets = body.children.slice(4).map((x) => [x.className.split(' ')[0], x.dataset.v32Facet]);
assert.deepEqual(facets, [
  ['source-caution', 'brief'],
  ['v32-brief-head', 'brief'],
  ['takeaway', 'brief'],
  ['case-box', 'brief'],
  ['r19-brief', 'brief'],
  ['dkla-terms', 'brief'],
  ['v32-fh', 'timeline'],
  ['v28-case-timelines', 'timeline'],
  ['v32-fh', 'court'],
  ['sh-case-panel', 'court'],
  ['v32-fh', 'sources'],
  ['v25-disclosure', 'sources'],
  ['quiet-details', 'sources'],
  ['v32-fh', 'study'],
  ['r18-recall', 'study'],
  ['v32-notes', 'study'],
  ['reading-actions', 'study'],
]);
// Nothing is lost on the way: the notes are a section of Study, the editing drawer gave up its buttons
// and the Court's vote, and the record drawer closes Sources.
assert.equal(caseNotes.parentElement.className, 'v32-notes');
assert.equal(editingDrawer.parentElement, null);
assert.equal(votes.parentElement, body);
assert.equal(actions.parentElement, body);
assert.equal(record.parentElement, body);
// The rail lists the rule and the parts of the brief.
const railRows = body.querySelectorAll('.v31-rail button').map((b) => b.textContent);
assert.deepEqual(railRows, ['The rule', '1 Parties', '2 Holding']);
assert.equal(caution.parentElement, body);
assert.equal(sourceButton.parentElement, chips);
assert.equal(chips.parentElement, body.querySelector('.v25-source-details'));
assert.equal(termButton.parentElement, terms);
assert.equal(supporting.querySelector('.r19-rule'), null);
assert.equal(section.parentElement, supporting);
assert.equal(supportFull.parentElement, supporting);
const stable = body.querySelectorAll('*').length;
window.DKLAReading.paint();
assert.equal(body.querySelectorAll('*').length, stable);
// A rule or concept has the same header and facets; the provision's text is ordered by the reader (the
// provision layer only draws it: src/features/r19/provisions.js).
body.remove();
body = el('div', 'reader-body', '', inspector);
const ruleTitle = el('div', 'dkla-record-title', 'Rule 4', body);
el('p', 'dkla-rule-label', 'At a glance', body);
const provision = el('section', 'r19-prov', 'Complete source provision.', body);
const concept = el('p', 'takeaway', 'The unique concept explanation.', body);
for (let i = 0; i < 3; i++) window.DKLAReading.paint();
assert.equal(ruleTitle.parentElement, body.children[0]);
assert.equal(body.children[0].className, 'v25-record-header v32-head');
assert.equal(provision.parentElement, body);
assert.equal(concept.nextElementSibling, provision);
assert.equal(provision.dataset.v32Facet, 'brief');
assert.equal(body.querySelector('.v31-rail'), null);
assert.equal(concept.textContent, 'The unique concept explanation.');
assert.equal(provision.textContent, 'Complete source provision.');
assert.equal(body.querySelector('.dkla-rule-label'), null);
// Remove only a repeated opening definition; preserve unique continuation and blackletter.
const entrySections = el('div', 'entry-sections', '', body);
const meaning = el('section', '', '', entrySections);
el('h3', '', 'Meaning', meaning);
el('p', '', 'The unique concept explanation.', meaning);
const continuation = el('p', '', 'A distinct qualification follows.', meaning);
const later = el('section', '', '', entrySections);
el('h3', '', 'Explanation', later);
el('p', '', 'A different doctrinal explanation.', later);
el('h3', '', 'Explanation', body);
const notes = el('div', 'note-text', '', body);
el('p', '', 'The unique concept explanation.', notes);
const uniqueNote = el('p', '', 'Unique context and exception.', notes);
window.DKLAReading.paint();
assert.deepEqual(
  meaning.children.map((x) => x.textContent),
  ['Meaning', 'A distinct qualification follows.'],
);
assert.equal(later.children.length, 2);
assert.equal(continuation.parentElement, meaning);
assert.deepEqual(notes.children, [uniqueNote]);
assert.equal(provision.textContent, 'Complete source provision.');
const onlyRepeat = el('div', 'entry-sections', '', body);
const onlySection = el('section', '', '', onlyRepeat);
el('h3', '', 'Meaning', onlySection);
el('p', '', 'The unique concept explanation.', onlySection);
entrySections.remove();
window.DKLAReading.paint();
assert.equal(onlyRepeat.parentElement, null);
const different = el('div', 'entry-sections', '', body);
const differentSection = el('section', '', '', different);
el('h3', '', 'Meaning', differentSection);
const differentParagraph = el(
  'p',
  '',
  'The unique concept explanation, with a substantive change.',
  differentSection,
);
window.DKLAReading.paint();
assert.equal(differentParagraph.parentElement, differentSection);
for (const label of ['Role in the course', 'Reading plan']) {
  different.remove();
  const block = el('div', 'entry-sections', '', body);
  const unit = el('section', '', '', block);
  el('h3', '', label, unit);
  el('p', '', 'The unique concept explanation.', unit);
  const preserved = el('p', '', 'A unique continuation for ' + label + '.', unit);
  window.DKLAReading.paint();
  assert.deepEqual(
    unit.children.map((x) => x.textContent),
    [label, preserved.textContent],
  );
  block.remove();
}
console.log(
  JSON.stringify({
    dedupe: 'exact opening paragraphs only; unique context and source text preserved',
    intro: 'one unlabeled explanation',
    timeline: 'its own facet, untouched',
    facets: 'brief, timeline, court, sources, study in one order',
    caseAnalysis: 'preserved',
    supportingAnalysis: 'preserved',
    sourceAndStudyControls: 'preserved',
    repeatPaints: 21,
    noncaseProvision: 'drawn once, ordered by the reader',
  }),
);
