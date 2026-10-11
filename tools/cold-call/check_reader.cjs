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
const html = fs.readFileSync(path.join(root, release), 'utf8');
const match = html.match(/<script\b[^>]*\bid="dklaColdCallData"[^>]*>([\s\S]*?)<\/script>/);
assert.ok(match, 'Built narrative data is missing');
const data = JSON.parse(match[1]);
class Element {
  constructor() { this.dataset = {}; this.children = new Map(); this.scrollTop = 0; this.open = false; this.innerHTML = ''; }
  setAttribute() {}
  addEventListener() {}
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
const window = {LegalAtlas: {ready: true}};
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
  const stages = Array.isArray(account.proceedings) ? account.proceedings : [account.proceedings];
  for (const stage of stages) assert.ok(dialog.innerHTML.includes(`<li>${escape(stage)}</li>`), `${account.id}: missing court-history stage`);
  const limits = Array.isArray(account.limits) ? account.limits : [account.limits];
  for (const limit of limits) assert.ok(dialog.innerHTML.includes(`<p>${escape(limit)}</p>`), `${account.id}: missing source qualification`);
  window.DKLAColdCall.close();
  assert.equal(dialog.innerHTML, '', `${account.id}: closed reader retained searchable prose`);
}
console.log(JSON.stringify({rendered: data.cases.length, stringProceedings: data.cases.filter(c => typeof c.proceedings === 'string').length, arrayLimits: data.cases.filter(c => Array.isArray(c.limits)).length}));
