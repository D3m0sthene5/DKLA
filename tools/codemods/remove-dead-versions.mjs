/* Remove earlier versions of global functions that were replaced before they
   ever ran.

     node tools/codemods/remove-dead-versions.mjs            report what would change
     node tools/codemods/remove-dead-versions.mjs --write    make the edits

   Input: the candidates in work/coverage/functions.json (`pnpm coverage`).
   A candidate is an earlier version of a global function that the next version
   replaces outright while the page loads, and that no recorded page called.

   Coverage alone is not proof, so each candidate must also pass a reading of
   the code (done on the syntax tree with ast-grep, never on text):

   - Between the old definition and its replacement, the name is only ever
     CALLED from inside a function body (`name()`), where it is looked up at
     the moment of the call, by which time the replacement is in place. Any
     other mention (`button.onclick = name`, `{ name }`, `window.name`, or any
     mention that runs as the page loads) could take hold of the old function,
     so it disqualifies. The first version of this tool allowed any mention
     inside a function and removed a function a button was still wired to;
     the browser checks caught it.
   - The edit itself must be simple: a whole top-level `function name() {}` or
     a whole top-level `name = function () {};` statement.

   The base scripts are strict, where assigning to a name nobody declared is an
   error. So when the original declaration goes, the first version that stays
   is turned from `name = function () {}` into `function name() {}`. Nothing
   else about it changes.

   Anything that fails a test is listed and left exactly as it is. */
import fs from 'node:fs';
import path from 'node:path';
import { parse, Lang } from '@ast-grep/napi';
import { root } from '../runtime.mjs';

const write = process.argv.includes('--write');
const at = (file) => path.join(root, file);
const data = JSON.parse(fs.readFileSync(at('work/coverage/functions.json'), 'utf8'));
const survey = JSON.parse(fs.readFileSync(at('work/survey.json'), 'utf8'));
const order = survey.files;

const trees = new Map();
const tree = (file) => {
  if (!trees.has(file)) trees.set(file, parse(Lang.JavaScript, fs.readFileSync(at(file), 'utf8')).root());
  return trees.get(file);
};
const FUNCTIONS = new Set([
  'function_declaration',
  'function_expression',
  'arrow_function',
  'method_definition',
  'generator_function',
  'generator_function_declaration',
]);
const within = (node, range) => node.range().start.index >= range[0] && node.range().end.index <= range[1];
const insideFunction = (node) => {
  for (let up = node.parent(); up; up = up.parent()) if (FUNCTIONS.has(up.kind())) return true;
  return false;
};
// Every mention of `name` in `file` as a variable, or as window.name / globalThis.name.
const mentions = (file, name) => {
  const escaped = name.replace(/\$/g, '\\$');
  const plain = tree(file).findAll({
    rule: { any: [{ kind: 'identifier' }, { kind: 'shorthand_property_identifier' }], regex: `^${escaped}$` },
  });
  const onWindow = tree(file)
    .findAll({ rule: { kind: 'property_identifier', regex: `^${escaped}$` } })
    .filter((node) => /^(window|self|globalThis)$/.test(node.parent()?.field('object')?.text() || ''));
  return [...plain, ...onWindow];
};
// The whole top-level statement that defines a version, or a reason it cannot be edited.
function statement(version, name) {
  const [start, end] = version.range;
  if (version.how === 'defined') {
    const node = tree(version.file)
      .findAll({ rule: { kind: 'function_declaration' } })
      .find((n) => n.range().start.index === start && n.range().end.index === end);
    if (!node || node.parent().kind() !== 'program')
      return { why: 'not a plain top-level function declaration' };
    return { node, fn: node };
  }
  const fn = tree(version.file)
    .findAll({ rule: { kind: 'function_expression' } })
    .find((n) => n.range().start.index === start && n.range().end.index === end);
  if (!fn) return { why: 'the replacement is not written as `function () {}`' };
  const assignment = fn.parent(),
    node = assignment?.parent();
  if (
    assignment?.kind() !== 'assignment_expression' ||
    assignment.field('left').text() !== name ||
    node?.kind() !== 'expression_statement' ||
    node.parent().kind() !== 'program'
  )
    return { why: 'not a plain top-level `name = function () {}` statement' };
  if (fn.field('name')) return { why: 'the function expression has its own name' };
  return { node, fn };
}

const byName = new Map();
for (const candidate of data.candidates) {
  if (!byName.has(candidate.name)) byName.set(candidate.name, []);
  byName.get(candidate.name).push(candidate);
}
const edits = new Map(); // file -> [{start, end, text}]
const edit = (file, node, text) => {
  if (!edits.has(file)) edits.set(file, []);
  const source = tree(file).text(),
    range = node.range();
  let end = range.end.index;
  // A removed statement takes its line break with it.
  if (text === '' && source[end] === '\n') end++;
  edits.get(file).push({ start: range.start.index, end, text });
};
const done = [],
  skipped = [];

for (const [name, candidates] of byName) {
  const chain = data.chains.find((c) => c.name === name).versions;
  const dead = new Set(
    candidates.map((c) => chain.findIndex((v) => v.file === c.version.file && v.line === c.version.line)),
  );
  const refuse = (why) => skipped.push({ name, why });
  // Work on each run of consecutive dead versions and the version that follows it.
  const planned = [];
  let ok = true;
  for (let i = 0; i < chain.length && ok; i++) {
    if (!dead.has(i)) continue;
    let j = i;
    while (dead.has(j + 1)) j++;
    const survivor = chain[j + 1];
    const removals = chain.slice(i, j + 1).map((version) => ({ version, ...statement(version, name) }));
    const kept = { version: survivor, ...statement(survivor, name) };
    const bad = [...removals, kept].find((item) => item.why);
    if (bad) {
      refuse(`${bad.version.file}:${bad.version.line}: ${bad.why}`);
      ok = false;
      break;
    }
    // Any mention between the first dead definition and the surviving one that
    // runs as the page loads, other than the statements being edited.
    const first = order.indexOf(removals[0].version.file),
      last = order.indexOf(survivor.file);
    const edited = [...removals, kept];
    const loadTime = [];
    for (let f = first; f <= last; f++) {
      const file = order[f];
      for (const mention of mentions(file, name)) {
        const index = mention.range().start.index;
        if (f === first && index < removals[0].node.range().start.index) continue;
        if (f === last && index > kept.node.range().end.index) continue;
        if (
          edited.some(
            (item) =>
              item.version.file === file &&
              within(mention, [item.node.range().start.index, item.node.range().end.index]),
          )
        )
          continue;
        // Inside a function body only a CALL is safe: `name()` looks the name up
        // when it runs. Anything else (`button.onclick = name`, `{ name }`,
        // `const old = name`) takes hold of whichever version exists at that
        // moment, and the function holding it may run while the page loads.
        const parent = mention.parent();
        const called =
          parent?.kind() === 'call_expression' && parent.field('function')?.range().start.index === index;
        if (!insideFunction(mention) || !called) loadTime.push(`${file}:${mention.range().start.line + 1}`);
      }
    }
    if (loadTime.length) {
      refuse(
        `mentioned other than as a call inside a function, before the replacement: ${loadTime.join(', ')}`,
      );
      ok = false;
      break;
    }
    planned.push({ removals, kept, declares: removals[0].version.how === 'defined' });
    i = j;
  }
  if (!ok) continue;
  for (const { removals, kept, declares } of planned) {
    for (const removal of removals) edit(removal.version.file, removal.node, '');
    if (declares) {
      const fn = kept.fn,
        text = fn.text(),
        head = text.slice(0, fn.field('parameters').range().start.index - fn.range().start.index);
      // `async function (` / `function (` / `function* (` keep their keywords; the name goes before the parameters.
      const keywords = head.trimEnd();
      edit(
        kept.version.file,
        kept.node,
        `${keywords} ${name}${text.slice(head.length)}`.replace(/^(async )?function\* /, '$1function* '),
      );
    }
    done.push({
      name,
      removed: removals.map(
        (r) =>
          `${r.version.file}:${r.version.line} (${r.fn.range().end.line - r.fn.range().start.line + 1} lines)`,
      ),
      kept: `${kept.version.file}:${kept.version.line}`,
      redeclared: declares,
    });
  }
}

let removedLines = 0;
for (const [file, list] of edits) {
  let source = tree(file).text();
  for (const { start, end, text } of list.sort((a, b) => b.start - a.start)) {
    removedLines += source.slice(start, end).split('\n').length - text.split('\n').length;
    source = source.slice(0, start) + text + source.slice(end);
  }
  if (write) fs.writeFileSync(at(file), source);
}
for (const item of done)
  console.log(
    `${write ? 'removed' : 'would remove'}  ${item.name}: ${item.removed.join('; ')}  ->  ${item.redeclared ? 'now declared at' : 'still replaced at'} ${item.kept}`,
  );
for (const item of skipped) console.log(`left alone    ${item.name}: ${item.why}`);
console.log(
  `\n${done.length} global(s) ${write ? 'cleaned' : 'can be cleaned'}, about ${removedLines} lines; ${skipped.length} left alone.`,
);
