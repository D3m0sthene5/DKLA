/* A map of how the app's scripts share and override global functions.
   Report only: it changes no code. Writes docs/code-survey.md.

     node tools/verify/survey.mjs

   The scripts are classic (no modules) and run in one shared global scope,
   in a fixed order. A later script changes behaviour by assigning a new
   function to a global name, usually keeping the old one to call. This lists
   every global that is assigned more than once, in load order, and whether
   each assignment wraps the previous function or replaces it outright. */
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import { root } from '../runtime.mjs';

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const base = JSON.parse(read('src/manifest.json'));
const layers = JSON.parse(read('src/features/manifest.json'));
// Load order: the saved-work bridge, the base app's scripts, then the feature layers.
const files = [
  ...layers.beforeAppCode,
  ...base.blocks.filter((block) => block.kind === 'runtime').map((block) => 'src/' + block.source),
  ...layers.javascript,
];

const isFunction = (node) =>
  node && ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type);
const children = (node) =>
  Object.entries(node)
    .filter(([key]) => key !== 'type' && key !== 'start' && key !== 'end')
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
    .filter((value) => value && typeof value.type === 'string');
function patternNames(pattern, out = []) {
  if (!pattern) return out;
  if (pattern.type === 'Identifier') out.push(pattern.name);
  else if (pattern.type === 'ObjectPattern')
    for (const property of pattern.properties) patternNames(property.value || property.argument, out);
  else if (pattern.type === 'ArrayPattern')
    for (const element of pattern.elements) patternNames(element, out);
  else if (pattern.type === 'AssignmentPattern') patternNames(pattern.left, out);
  else if (pattern.type === 'RestElement') patternNames(pattern.argument, out);
  return out;
}
// Names declared directly in one function (or the script's top level), not in nested functions.
function declared(body, params = []) {
  const names = new Set(params.flatMap((param) => patternNames(param)));
  const visit = (node) => {
    if (node.type === 'VariableDeclaration')
      for (const declaration of node.declarations)
        for (const name of patternNames(declaration.id)) names.add(name);
    if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
      if (node.id) names.add(node.id.name);
      if (node.type === 'FunctionDeclaration') return;
    }
    if (node.type === 'CatchClause' && node.param)
      for (const name of patternNames(node.param)) names.add(name);
    if (isFunction(node)) return;
    for (const child of children(node)) visit(child);
  };
  for (const node of Array.isArray(body) ? body : [body]) visit(node);
  return names;
}

const globals = new Map(); // name -> [{file, line, how}]
const mentions = new Map(); // identifier -> number of files mentioning it
const lines = {};
const note = (name, entry) => {
  if (!globals.has(name)) globals.set(name, []);
  globals.get(name).push(entry);
};
for (const file of files) {
  const source = read(file);
  lines[file] = source.split('\n').length;
  const tree = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  const seen = new Set();
  // Top-level declarations of a classic script are globals.
  for (const node of tree.body) {
    if (node.type === 'FunctionDeclaration')
      note(node.id.name, {
        file,
        line: node.loc.start.line,
        how: 'defined',
        size: node.loc.end.line - node.loc.start.line + 1,
      });
    if (node.type === 'VariableDeclaration')
      for (const declaration of node.declarations)
        if (declaration.id.type === 'Identifier' && isFunction(declaration.init))
          note(declaration.id.name, { file, line: node.loc.start.line, how: 'defined' });
  }
  const walk = (node, scopes, saved) => {
    if (node.type === 'Identifier') seen.add(node.name);
    let inner = scopes,
      innerSaved = saved;
    if (isFunction(node)) {
      inner = [
        ...scopes,
        declared(node.body.type === 'BlockStatement' ? node.body.body : node.body, node.params),
      ];
      innerSaved = new Set(saved);
    }
    // `const previous = draw` (or `previous = draw`) remembers a global so it can still be called.
    const remember = (target, value) => {
      if (value?.type === 'Identifier' && target?.type === 'Identifier') innerSaved.add(value.name);
    };
    if (node.type === 'VariableDeclarator') remember(node.id, node.init);
    if (node.type === 'AssignmentExpression' && node.operator === '=') {
      remember(node.left, node.right);
      const name = node.left.type === 'Identifier' ? node.left.name : null;
      const local = name && inner.some((scope, depth) => depth > 0 && scope.has(name));
      if (
        name &&
        !local &&
        isFunction(node.right) &&
        (scopes.length > 1 ||
          tree.body.every((n) => n.type !== 'FunctionDeclaration' || n.id.name !== name || true))
      )
        note(name, {
          file,
          line: node.loc.start.line,
          how: innerSaved.has(name) ? 'wraps the previous one' : 'REPLACES it outright',
        });
    }
    for (const child of children(node)) walk(child, inner, innerSaved);
  };
  walk(tree, [declared(tree.body)], new Set());
  for (const name of seen) mentions.set(name, (mentions.get(name) || 0) + 1);
}

const short = (file) => file.replace(/^src\/runtime\//, '').replace(/^tools\//, '');
const redefined = [...globals]
  .filter(([, entries]) => entries.length > 1)
  .sort((a, b) => b[1].length - a[1].length);
const markup = fs
  .readdirSync(path.join(root, 'src/markup'))
  .map((name) => read('src/markup/' + name))
  .join('\n');
const everything = files.map(read).join('\n');
const unused = [...globals]
  .filter(([name, entries]) => entries.length === 1 && entries[0].how === 'defined' && entries[0].size)
  .filter(
    ([name]) =>
      (everything.match(new RegExp('(?<![\\w$])' + name.replace(/\$/g, '\\$') + '(?![\\w$])', 'g')) || [])
        .length === 1 && !markup.includes(name),
  )
  .map(([name, [entry]]) => ({ name, ...entry }));
const outright = redefined.flatMap(([name, entries]) =>
  entries.filter((e) => e.how.startsWith('REPLACES')).map((e) => ({ name, ...e })),
);

const out = [];
out.push('# Code survey: shared globals and overrides', '');
out.push('Generated by `node tools/verify/survey.mjs`. Report only; no code was changed from it.', '');
out.push(
  `- Scripts, in load order: ${files.length} (${Object.values(lines)
    .reduce((a, b) => a + b, 0)
    .toLocaleString('en-US')} lines).`,
);
out.push(
  `- Global functions defined: ${[...globals].filter(([, e]) => e.some((x) => x.how === 'defined')).length}.`,
);
out.push(`- Globals assigned more than once: ${redefined.length}.`);
out.push(`- Assignments that replace a function without keeping the old one: ${outright.length}.`);
out.push(`- Global functions whose name appears nowhere else: ${unused.length}.`, '');
out.push('## The longest override chains', '');
out.push(
  'Each line is one assignment, in the order the scripts load. The last one is the version that runs.',
  '',
);
for (const [name, entries] of redefined.slice(0, 25)) {
  out.push(`### \`${name}\` — ${entries.length} versions`, '');
  for (const entry of entries) out.push(`- ${short(entry.file)}:${entry.line} — ${entry.how}`);
  out.push('');
}
out.push(
  '## Every global assigned more than once',
  '',
  '| Global | Versions | Replaced outright | Files, in order |',
  '|---|---|---|---|',
);
for (const [name, entries] of redefined)
  out.push(
    `| \`${name}\` | ${entries.length} | ${entries.filter((e) => e.how.startsWith('REPLACES')).length} | ${[...new Set(entries.map((e) => short(e.file)))].join(' → ')} |`,
  );
out.push('', '## Replaced outright', '');
out.push(
  'The earlier version of each of these is never called again, so its body is probably dead code. Check before deleting: the earlier version may still run between the two scripts loading.',
  '',
);
for (const entry of outright) out.push(`- \`${entry.name}\` at ${short(entry.file)}:${entry.line}`);
out.push('', '## Possibly unused', '');
out.push(
  'Top-level functions whose name appears exactly once across all scripts and not in the page markup. A name built from a string at run time would not be found, so treat these as candidates.',
  '',
);
for (const entry of unused.sort((a, b) => b.size - a.size))
  out.push(`- \`${entry.name}\` (${entry.size} lines) at ${short(entry.file)}:${entry.line}`);
out.push('', '## Size of each script', '', '| Script | Lines |', '|---|---|');
for (const file of files) out.push(`| ${short(file)} | ${lines[file].toLocaleString('en-US')} |`);
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/code-survey.md'), out.join('\n') + '\n');
console.log(out.slice(3, 9).join('\n'));
console.log(
  '\nTop chains: ' +
    redefined
      .slice(0, 12)
      .map(([name, entries]) => `${name} ×${entries.length}`)
      .join(', '),
);
