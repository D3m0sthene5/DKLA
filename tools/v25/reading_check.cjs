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
    for (const a of s.matchAll(/\[data-([\w-]+)\]/g)) {
      const key = a[1].replace(/-([a-z])/g, (_, x) => x.toUpperCase());
      if (!(key in this.dataset)) return false;
    }
    return true;
  }
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
      const direct = part.trim().startsWith(':scope >');
      const sel = part
        .trim()
        .replace(/^:scope\s*>\s*/, '')
        .split(/\s+/);
      for (const e of direct ? this.children : all) {
        if (!e.matchesSimple(sel.at(-1))) continue;
        let p = e.parentElement,
          ok = true;
        for (let i = sel.length - 2; i >= 0; i--) {
          while (p && p !== this && !p.matchesSimple(sel[i])) p = p.parentElement;
          if (!p || p === this) {
            ok = false;
            break;
          }
          p = p.parentElement;
        }
        if (ok && !out.includes(e)) out.push(e);
      }
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
const caution = el('div', 'source-caution', 'Only part of the case was assigned.', body);
const chips = el('div', 'dkla-file-chips', '', body);
const sourceButton = el('button', '', 'Assigned source', chips);
sourceButton.dataset.dklaFile = 'source.pdf#page=12';
const caseBox = el('div', 'case-box', '', body);
const holding = el('section', '', '', caseBox);
el('p', '', 'Full holding and reasoning remain here.', holding);
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
assert.equal(timeline.parentElement, body);
assert.equal(track.children[0].textContent, 'Authored timeline step');
assert.equal(caseBox.children[0], holding);
assert.equal(full.parentElement, brief);
assert.equal(caption.parentElement, body.querySelector('.v25-record-header'));
assert.equal(cold.parentElement, body.querySelector('.v25-record-actions'));
assert.equal(caution.parentElement, body);
assert.equal(sourceButton.parentElement, chips);
assert.deepEqual(body.children.slice(-3), [body.querySelector('.v25-source-details'), recall, terms]);
assert.equal(termButton.parentElement, terms);
assert.equal(supporting.querySelector('.r19-rule'), null);
assert.equal(section.parentElement, supporting);
assert.equal(supportFull.parentElement, supporting);
const stable = body.querySelectorAll('*').length;
window.DKLAReading.paint();
assert.equal(body.querySelectorAll('*').length, stable);
// Noncase headings stay direct so the provision-placement observer does not fight the reading layer.
body.remove();
body = el('div', 'reader-body', '', inspector);
const ruleTitle = el('div', 'dkla-record-title', 'Rule 4', body);
el('p', 'dkla-rule-label', 'At a glance', body);
const concept = el('p', 'takeaway', 'The unique concept explanation.', body);
const provision = el('section', 'r19-prov', 'Complete source provision.', body);
window.DKLAReading.paint();
assert.equal(ruleTitle.parentElement, body);
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
    timeline: 'visible, untouched',
    caseAnalysis: 'preserved',
    supportingAnalysis: 'preserved',
    sourceAndStudyControls: 'preserved',
    repeatPaints: 21,
    noncaseProvisionContract: 'preserved',
  }),
);
