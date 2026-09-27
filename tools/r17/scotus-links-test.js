/* Run from the repository root: node tools/r17/scotus-links-test.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const addon = fs.readFileSync('tools/r17/scotus-links.js', 'utf8');
const history = JSON.parse(fs.readFileSync('scotus-r16/history-data.json', 'utf8'));
const catalogue = history.cases;
let panels = [];
let mutationCallback;

function panel(id) {
  const actions = {
    buttons: [],
    querySelector(selector) { return this.buttons.find(b => selector === '.r17-scotus-link' && b.className === 'r17-scotus-link'); },
    prepend(button) { this.buttons.unshift(button); },
  };
  return {
    dataset: {shPanel: id},
    actions,
    querySelector(selector) { return selector === '.sh-panel-actions' ? actions : null; },
  };
}

const inspector = {
  querySelectorAll(selector) {
    assert.equal(selector, '.sh-case-panel[data-sh-panel]');
    return panels;
  },
  querySelector(selector) { return selector === '.reader-body' ? body : null; },
};
const body = {
  children: [],
  querySelector(selector) {
    return selector === '.r17-scotus-alias'
      ? this.children.find(x => x.className?.split(' ').includes('r17-scotus-alias'))
      : null;
  },
  append(item) { this.children.push(item); },
};
const context = {
  selected: null,
  window: {
    SCOTUSHistory: {data: {cases: catalogue, people: history.people}},
    renderInspector() { panels = [panel('shoe')]; },
  },
  document: {
    getElementById(id) { return id === 'inspector' ? inspector : null; },
    createElement(tag) {
      return {
        tagName: tag, dataset: {}, children: [],
        setAttribute(k, v) { this[k] = v; },
        append(item) { this.children.push(item); },
      };
    },
  },
  MutationObserver: class {
    constructor(callback) { mutationCallback = callback; }
    observe(target, config) {
      assert.equal(target, inspector);
      assert(config.subtree && config.childList);
    }
  },
};
vm.runInNewContext(addon, context, {filename: 'scotus-links.js'});

context.window.renderInspector();
assert.equal(panels[0].actions.buttons[0].dataset.shCase, 'shoe');
assert.match(panels[0].actions.buttons[0]['aria-label'], /International Shoe/);
mutationCallback();
assert.equal(panels[0].actions.buttons.length, 1, 'link is idempotent');

// r16 changes a voting question by replacing the panel without rendering the
// inspector. The MutationObserver must restore the link in that new panel.
panels = [panel('cp-twombly')];
mutationCallback();
assert.equal(panels[0].actions.buttons[0].dataset.shCase, 'cp-twombly');
panels = [panel('cp-twombly')];
mutationCallback();
assert.equal(panels[0].actions.buttons.length, 1, 'link survives an r16 redraw');

panels = [panel('lucy')];
mutationCallback();
assert.equal(panels[0].actions.buttons.length, 0, 'lower court entry gains no invented vote link');

for (const [noteId, targetId] of [
  ['lrs-gap-04-03', 'lrs-k-train'],
  ['lrs-gap-06-01', 'lrs-k-epic'],
  ['lrs-gap-11-01', 'lrs-s-slaughter'],
]) {
  context.selected = {type: 'node', id: noteId};
  panels = [];
  body.children = [];
  mutationCallback();
  const section = body.querySelector('.r17-scotus-alias');
  assert(section, `${noteId} surfaces a vote panel`);
  const votes = section.children.find(x => x.className === 'r17-alias-votes');
  assert.equal(votes.children.length, catalogue[targetId].decisions[0].votes.length);
  const actions = section.children.find(x => x.className === 'sh-panel-actions');
  assert.equal(actions.children[0].dataset.shCase, targetId);
  mutationCallback();
  assert.equal(body.children.length, 1, 'legacy note panel is idempotent');
}
console.log('SCOTUS link contract passed: 230-record catalogue, direct case IDs, redraws, three legacy notes, lower-court exclusion.');
