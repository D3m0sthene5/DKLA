/* Exercise the real reader's render path for every built account.
 * This DOM stand-in catches data-shape/render exceptions. It does not replace
 * browser checks for layout, focus, scrolling or interaction.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const release = JSON.parse(fs.readFileSync(path.join(root, 'version.json'))).file;
const html = fs.readFileSync(process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, release), 'utf8');
const match = html.match(/<script\b[^>]*\bid="dklaColdCallData"[^>]*>([\s\S]*?)<\/script>/);
assert.ok(match, 'Built narrative data is missing');
const data = JSON.parse(match[1]);
class Element {
  constructor() { this.dataset = {}; this.children = new Map(); this.events = {}; this.scrollTop = 0; this.open = false; this.innerHTML = ''; }
  setAttribute() {}
  addEventListener(type, listener) { this.events[type] = listener; }
  querySelector(key) { if (!this.children.has(key)) this.children.set(key, new Element()); return this.children.get(key); }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return {top: 0}; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  replaceChildren() { this.innerHTML = ''; this.children.clear(); }
}
const elements = [];
const document = {
  activeElement: null,
  body: {appendChild(element) { elements.push(element); }},
  createElement() { return new Element(); },
  getElementById(id) { return id === 'dklaColdCallData' ? {textContent: match[1]} : elements.find(e => e.id === id) || null; },
  addEventListener() {},
};
const window = {LegalAtlas: {ready: true}, DKLABriefs: {text: id => 'Full source: ' + id, data: {entries: []}, render: text => '<p>' + text + '</p>'}};
const context = {window, document, localStorage: {getItem() { return null; }}, matchMedia() { return {matches: true, addEventListener() {}}; }};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'reader.js'), 'utf8'), context);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const dialog = document.getElementById('coldCallDialog');
for (const account of data.cases) {
  window.DKLAColdCall.open(account.id);
  assert.equal(dialog.open, true, `${account.id}: reader did not open`);
  assert.equal((dialog.innerHTML.match(/class="cc-section"/g) || []).length, account.sections.length, `${account.id}: missing episode`);
  for (const section of account.sections) for (const paragraph of section.paragraphs) {
    assert.ok(dialog.innerHTML.includes(`<p>${escape(paragraph)}</p>`), `${account.id}: missing or unescaped narrative paragraph`);
  }
  for (const section of account.sections) if (section.followUp) {
    assert.ok(dialog.innerHTML.includes(`<p>${escape(section.followUp.answer)}</p>`), `${account.id}: missing follow-up explanation after practice removal`);
  }
  assert.ok(!/ccPractice|ccRehearsal|ccRating|cc-lead|cc-orientation/.test(dialog.innerHTML), `${account.id}: retired practice controls or redundant introduction rendered`);
  if (account.notice) assert.ok(dialog.innerHTML.includes(escape(account.notice)), `${account.id}: missing source notice`);
  const limits = Array.isArray(account.limits) ? account.limits : [account.limits];
  for (const limit of limits) assert.ok(dialog.innerHTML.includes(`<p>${escape(limit)}</p>`), `${account.id}: missing source qualification`);
  window.DKLAColdCall.close();
  assert.equal(dialog.innerHTML, '', `${account.id}: closed reader retained searchable prose`);
}
// Exercise the nested source view and return, keyboard isolation, and reopening position.
const account = data.cases.find(c => c.sources.some(s => s.briefId));
assert.ok(account, 'No source-brief fixture in compiled narratives');
window.DKLAColdCall.open(account.id);
const briefId = account.sources.find(s => s.briefId).briefId;
dialog.events.click({target: {closest: () => ({hasAttribute: name => name === 'data-cc-source-brief', dataset: {ccSourceBrief: briefId}})}});
const sourceDialog = document.getElementById('ccBriefDialog');
assert.equal(sourceDialog.open, true, 'Full source brief did not open');
assert.ok(sourceDialog.innerHTML.includes('Full source: ' + briefId), 'Source view lost source content');
sourceDialog.querySelector('#ccBriefClose').onclick();
assert.equal(sourceDialog.open, false, 'Source return failed');
assert.equal(dialog.open, true, 'Source return closed the narrative');
let isolated = false;
dialog.events.keydown({stopPropagation() { isolated = true; }});
assert.equal(isolated, true, 'Reader shortcuts reached the map');
dialog.querySelector('#ccScroll').scrollTop = 123;
window.DKLAColdCall.close();
window.DKLAColdCall.open(account.id);
assert.equal(dialog.querySelector('#ccScroll').scrollTop, 123, 'Reopening lost reading position');
window.DKLAColdCall.close();
console.log(JSON.stringify({rendered: data.cases.length, followUpExplanations: data.cases.reduce((n,c) => n + c.sections.filter(s => s.followUp).length, 0), arrayLimits: data.cases.filter(c => Array.isArray(c.limits)).length, sourceReturn: true, keyboardIsolation: true, readingPosition: true, retiredPractice: true}));
