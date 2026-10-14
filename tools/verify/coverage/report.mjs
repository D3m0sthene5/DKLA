/* What ran, and what did not, while the browser checks drove the app.

     pnpm coverage        runs the browser checks with recording on, then this

   Joins the raw records written by collect.cjs with the source files and with
   the override survey (tools/verify/survey.mjs), and writes
   docs/coverage-survey.md and work/coverage/functions.json. It answers two
   questions:

   1. Which parts of the app do the checks never reach? A change there is not
      protected by any browser check.
   2. For a global function that a later script replaces outright: did the
      earlier version ever run? That is evidence about whether it is dead.

   "Never ran in the checks" is a reason to look closer, not proof of anything:
   the checks exercise a sample of what a visitor can do. Report only; this
   changes no code. */
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import { root } from '../../runtime.mjs';

const dir = path.join(root, 'work/coverage');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
if (!fs.existsSync(path.join(root, 'work/survey.json')))
  throw Error('Run `node tools/verify/survey.mjs` first.');
const survey = JSON.parse(read('work/survey.json'));
const records = fs.readdirSync(dir).filter((name) => name.endsWith('.json') && name !== 'functions.json');
if (!records.length) throw Error('No coverage records in work/coverage. Run `pnpm coverage`.');

// Highest call count seen for each function of each distinct script, over all pages.
const scripts = new Map(); // hash -> Map("start:end" -> count)
for (const name of records)
  for (const entry of JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'))) {
    if (!scripts.has(entry.script)) scripts.set(entry.script, new Map());
    const seen = scripts.get(entry.script);
    for (const fn of entry.functions) {
      const { startOffset, endOffset, count } = fn.ranges[0],
        key = startOffset + ':' + endOffset;
      seen.set(key, Math.max(seen.get(key) || 0, count));
    }
  }
const sources = new Map(
  [...scripts.keys()].map((hash) => [hash, fs.readFileSync(path.join(dir, 'scripts', hash + '.js'), 'utf8')]),
);

const isFunction = (node) =>
  ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node?.type);
const children = (node) =>
  Object.entries(node)
    .filter(([key]) => key !== 'type' && key !== 'start' && key !== 'end' && key !== 'loc')
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
    .filter((value) => value && typeof value.type === 'string');

const files = [];
for (const file of survey.files) {
  const text = read(file),
    body = text.trimEnd();
  // The built page carries each source file word for word, so find it there.
  const homes = [...sources].filter(([, source]) => source.includes(body));
  const tree = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  const functions = [];
  const walk = (node, parent, depth, outer) => {
    if (isFunction(node)) {
      const name =
        node.id?.name ||
        (parent?.type === 'VariableDeclarator' && parent.id.name) ||
        (parent?.type === 'AssignmentExpression' &&
          (parent.left.name || parent.left.property?.name || parent.left.property?.value)) ||
        ((parent?.type === 'Property' || parent?.type === 'MethodDefinition') &&
          (parent.key.name || parent.key.value)) ||
        '';
      let count = null;
      for (const [hash, source] of homes) {
        const base = source.indexOf(body),
          seen = scripts.get(hash);
        // V8 starts a function at its keyword, name or parameters, depending on its kind.
        for (let start = node.start; start <= node.body.start && count === null; start++) {
          const found = seen.get(base + start + ':' + (base + node.end));
          if (found !== undefined) count = found;
        }
        if (count === null && parent?.type === 'Property' && parent.method)
          count = seen.get(base + parent.key.start + ':' + (base + node.end)) ?? null;
        if (count) break;
      }
      // The browser does not list the functions written inside a function that
      // was never called: they were never even prepared to run.
      if (count === null && outer === 0) count = 0;
      functions.push({
        name: String(name),
        line: node.loc.start.line,
        lines: node.loc.end.line - node.loc.start.line + 1,
        range: [node.start, node.end],
        depth,
        count,
      });
      depth++;
      outer = count;
    }
    for (const child of children(node)) walk(child, node, depth, outer);
  };
  walk(tree, null, 0, null);
  files.push({ file, loaded: homes.length > 0, functions });
}

const all = files.flatMap((f) => f.functions.map((fn) => ({ file: f.file, ...fn })));
const known = all.filter((fn) => fn.count !== null),
  ran = known.filter((fn) => fn.count > 0);
const short = (file) => file.replace(/^src\/runtime\//, '').replace(/^src\/features\//, 'features/');
const at = (file, range) =>
  all.find((fn) => fn.file === file && fn.range[0] === range[0] && fn.range[1] === range[1]);

// Override chains: did each version run?
const chains = Object.entries(survey.globals)
  .filter(([, entries]) => entries.length > 1)
  .map(([name, entries]) => ({
    name,
    versions: entries.map((entry) => ({ ...entry, count: at(entry.file, entry.range)?.count ?? null })),
  }));
const state = (count) => (count === null ? 'not measured' : count > 0 ? 'ran' : 'NEVER RAN');
// A version that the next one replaces outright, as the page loads, and that never ran.
const candidates = [];
for (const chain of chains)
  chain.versions.forEach((version, index) => {
    const next = chain.versions[index + 1];
    if (next && next.how.startsWith('REPLACES') && next.top && version.top && version.count === 0)
      candidates.push({ name: chain.name, version, next });
  });

fs.writeFileSync(
  path.join(dir, 'functions.json'),
  JSON.stringify({ pages: records.length, files, chains, candidates }, null, 1),
);

const out = [];
out.push('# Coverage survey: what the browser checks run', '');
out.push(
  "Generated by `pnpm coverage` (Chromium's built-in JavaScript coverage, recorded through Playwright while the browser checks run). Report only; no code was changed from it.",
  '',
  '**"Never ran" means "never ran in these checks".** The checks open a sample of what a visitor can do. Treat a function that never ran as a reason to look closer: either the checks do not reach it, or nothing does.',
  '',
);
out.push(`- Pages recorded: ${records.length} (three check programs, several window sizes).`);
out.push(`- Functions in the app's scripts: ${all.length.toLocaleString('en-US')}.`);
out.push(
  `- Ran at least once: ${ran.length.toLocaleString('en-US')} of ${known.length.toLocaleString('en-US')} measured (${Math.round((100 * ran.length) / known.length)}%).`,
);
out.push(`- Not measured (the browser did not report them): ${all.length - known.length}.`);
out.push(
  `- Earlier versions of a global that the next script replaces outright while the page loads, and that never ran: ${candidates.length}.`,
  '',
);
out.push('## By script', '', '| Script | Functions | Ran | Never ran | Reached |', '|---|---|---|---|---|');
for (const f of files) {
  const measured = f.functions.filter((fn) => fn.count !== null),
    did = measured.filter((fn) => fn.count > 0).length;
  out.push(
    `| ${short(f.file)} | ${f.functions.length} | ${did} | ${measured.length - did} | ${measured.length ? Math.round((100 * did) / measured.length) + '%' : 'n/a'} |`,
  );
}
out.push('', '## Replaced before it ever ran', '');
out.push(
  'Each of these is an earlier version of a global function. The next version is assigned while the page is still loading and does not keep the old one, and the old one was not called once in any recorded page. They are the strongest candidates for deletion. Before deleting one, confirm nothing takes the function as a value (rather than calling it) before the replacement loads.',
  '',
);
for (const { name, version, next } of candidates)
  out.push(
    `- \`${name}\` at ${short(version.file)}:${version.line} (${at(version.file, version.range)?.lines ?? '?'} lines), replaced at ${short(next.file)}:${next.line}`,
  );
out.push('', '## Every override chain, with what ran', '');
for (const chain of chains.sort((a, b) => b.versions.length - a.versions.length)) {
  out.push(`### \`${chain.name}\``, '');
  for (const v of chain.versions)
    out.push(
      `- ${short(v.file)}:${v.line} — ${v.how}${v.top ? '' : ' (assigned later, from inside a function)'} — ${state(v.count)}`,
    );
  out.push('');
}
out.push('## Named functions that never ran, largest first', '');
out.push(
  'Per script, the named functions of five lines or more that no recorded page called. Long lists mark the areas the checks do not reach.',
  '',
);
for (const f of files) {
  const never = f.functions
    .filter((fn) => fn.count === 0 && fn.name && fn.lines >= 5)
    .sort((a, b) => b.lines - a.lines);
  if (!never.length) continue;
  out.push(`### ${short(f.file)} (${never.length})`, '');
  out.push(never.map((fn) => `\`${fn.name}\` :${fn.line} (${fn.lines})`).join(', '), '');
}
fs.writeFileSync(path.join(root, 'docs/coverage-survey.md'), out.join('\n') + '\n');
console.log(out.slice(6, 11).join('\n'));
