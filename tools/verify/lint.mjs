/* Redeclared, reassigned, unused and undefined names, found by ESLint and by
   TypeScript's check-only mode. Report only: writes docs/lint-survey.md.

     pnpm lint:survey

   The app's scripts are classic scripts sharing one global scope, so checking
   them one file at a time would call every shared name "undefined" or
   "unused". Instead the scripts are joined in the order the page loads them
   (work/lint/app.js), which is what the browser effectively runs, and every
   finding is mapped back to its own file and line.

   Neither tool sees names used only from the page's markup (onclick="..."),
   from another function's string, or through window[...]: an "unused" name is
   a candidate to look at, not a verdict. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ESLint } from 'eslint';
import globals from 'globals';
import { root } from '../runtime.mjs';

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const base = JSON.parse(read('src/manifest.json')),
  layers = JSON.parse(read('src/features/manifest.json'));
const files = [
  ...layers.beforeAppCode,
  ...base.blocks.filter((block) => block.kind === 'runtime').map((block) => 'src/' + block.source),
  ...layers.javascript,
];
// Third-party code is joined in (its names are used) but its own findings are not reported.
const THIRD_PARTY = new Set(['src/runtime/dklaMiniSearch.js']);

const starts = []; // [first line in the joined file, source file]
let joined = '',
  line = 1;
for (const file of files) {
  const text = read(file).replace(/\n?$/, '\n');
  starts.push([line, file]);
  joined += text;
  line += text.split('\n').length - 1;
}
const where = (joinedLine) => {
  let found = starts[0];
  for (const start of starts) if (start[0] <= joinedLine) found = start;
  return { file: found[1], line: joinedLine - found[0] + 1 };
};
const out = path.join(root, 'work/lint');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'app.js'), joined);
const markup = fs
  .readdirSync(path.join(root, 'src/markup'))
  .map((name) => read('src/markup/' + name))
  .join('\n');

const findings = []; // {tool, rule, file, line, message}
const add = (tool, rule, joinedLine, message) => {
  const at = where(joinedLine);
  if (!THIRD_PARTY.has(at.file)) findings.push({ tool, rule, ...at, message });
};

// ESLint: only the rules about names. Style is Prettier's job.
const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ['**/*.js'],
      languageOptions: { ecmaVersion: 'latest', sourceType: 'script', globals: { ...globals.browser } },
      linterOptions: { reportUnusedDisableDirectives: 'off' },
      rules: {
        'no-redeclare': ['error', { builtinGlobals: false }],
        'no-func-assign': 'error',
        'no-unused-vars': ['error', { vars: 'all', args: 'none', caughtErrors: 'none' }],
        'no-undef': 'error',
        'no-dupe-keys': 'error',
        'no-unreachable': 'error',
        'no-shadow-restricted-names': 'error',
      },
    },
  ],
});
const [result] = await eslint.lintText(joined, { filePath: path.join(out, 'app.js') });
for (const message of result.messages)
  add('ESLint', message.ruleId || 'parse', message.line, message.message);

// TypeScript, checking only (it writes nothing). Type errors in untyped code
// are noise here; keep the codes that are about names.
const CODES = {
  2300: 'duplicate identifier',
  2451: 'redeclared block-scoped variable',
  2393: 'duplicate function implementation',
  2630: 'assignment to a function',
  2304: 'name not found',
  2552: 'name not found (did you mean ...)',
  6133: 'declared but never read',
  7027: 'unreachable code',
  7028: 'unused label',
};
const tsc = spawnSync(
  process.execPath,
  [
    'node_modules/typescript/bin/tsc',
    '--allowJs',
    '--checkJs',
    '--noEmit',
    '--noUnusedLocals',
    '--allowUnreachableCode',
    'false',
    '--target',
    'esnext',
    '--lib',
    'esnext,dom,dom.iterable',
    '--pretty',
    'false',
    '--skipLibCheck',
    'work/lint/app.js',
  ],
  { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 },
);
let typeScriptRan = false;
for (const text of (tsc.stdout + tsc.stderr).split('\n')) {
  const match = text.match(/^work[\\/]lint[\\/]app\.js\((\d+),\d+\): error TS(\d+): (.*)$/);
  if (!match) continue;
  typeScriptRan = true;
  if (CODES[match[2]]) add('TypeScript', `TS${match[2]} ${CODES[match[2]]}`, Number(match[1]), match[3]);
}
if (!typeScriptRan && tsc.status !== 0)
  console.log('TypeScript did not produce readable output:\n' + (tsc.stdout + tsc.stderr).slice(0, 800));

const short = (file) => file.replace(/^src\/runtime\//, '').replace(/^src\/features\//, 'features/');
const byRule = new Map();
for (const finding of findings) {
  const key = finding.tool + ': ' + finding.rule;
  if (!byRule.has(key)) byRule.set(key, []);
  byRule.get(key).push(finding);
}
const text = [];
text.push('# Lint survey: redeclared, reassigned, unused and undefined names', '');
text.push(
  'Generated by `pnpm lint:survey` (ESLint and TypeScript in check-only mode, over the scripts joined in load order). Report only; no code was changed from it.',
  '',
  'An "unused" or "never read" name may still be used from the page markup, a string, or `window[...]`. Names that appear in the markup are marked.',
  '',
  '| Finding | Count |',
  '|---|---|',
);
for (const [rule, list] of [...byRule].sort((a, b) => b[1].length - a[1].length))
  text.push(`| ${rule} | ${list.length} |`);
for (const [rule, list] of [...byRule].sort((a, b) => b[1].length - a[1].length)) {
  text.push('', `## ${rule} (${list.length})`, '');
  for (const finding of list.slice(0, 400)) {
    const name = finding.message.match(/'([^']+)'/)?.[1];
    const inMarkup =
      name && new RegExp('(?<![\\w$])' + name.replace(/\$/g, '\\$') + '(?![\\w$])').test(markup);
    text.push(
      `- ${short(finding.file)}:${finding.line} — ${finding.message}${inMarkup ? ' (appears in the page markup)' : ''}`,
    );
  }
  if (list.length > 400) text.push(`- ... and ${list.length - 400} more`);
}
fs.writeFileSync(path.join(root, 'docs/lint-survey.md'), text.join('\n') + '\n');
console.log(text.slice(6, 8 + byRule.size).join('\n'));
