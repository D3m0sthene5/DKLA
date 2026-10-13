/* Proof that reformatting did not change any program.

   Parses every JavaScript file to its syntax tree and records a hash of the
   tree with positions and source spelling removed. Two files with the same
   hash are the same program, whatever their spacing, line breaks, quote
   style or optional parentheses. The one structural difference ignored is a
   stray empty statement (a lone `;`) in a list of statements, which does
   nothing and which the formatter removes.

     node tools/verify/same-program.mjs record work/programs-before.json   before formatting
     node tools/verify/same-program.mjs compare work/programs-before.json  after: must report no differences */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as acorn from 'acorn';
import { root } from '../runtime.mjs';

const [mode, file] = process.argv.slice(2);
if (!['record', 'compare'].includes(mode) || !file) {
  console.error('usage: node tools/verify/same-program.mjs record|compare FILE');
  process.exit(2);
}

const SKIPPED_FOLDERS = [
  'node_modules',
  'dist',
  'work',
  'test-results',
  '.git',
  'added-sources',
  'archive',
  'docs',
];
const DATA_FOLDERS = ['src/data', 'tools/r19/data', 'tools/cold-call/narratives'];

// Every script in the repository outside output, content and data folders.
function scripts(dir = '') {
  const found = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const child = dir ? dir + '/' + entry.name : entry.name;
    if (entry.isDirectory()) {
      if (!SKIPPED_FOLDERS.includes(child) && !DATA_FOLDERS.some((folder) => child.startsWith(folder)))
        found.push(...scripts(child));
    } else if (/\.(js|mjs|cjs)$/.test(entry.name)) found.push(child);
  }
  return found;
}

// Drop where things are and how literals were spelled; keep what they are.
function strip(node) {
  if (Array.isArray(node)) return node.filter((item) => item?.type !== 'EmptyStatement').map(strip);
  if (node && typeof node === 'object') {
    if (node instanceof RegExp) return String(node);
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === 'start' || key === 'end' || key === 'loc' || key === 'range' || key === 'raw') continue;
      out[key] = typeof value === 'bigint' ? value.toString() + 'n' : strip(value);
    }
    return out;
  }
  return node;
}

function program(source, name) {
  const options = {
    ecmaVersion: 'latest',
    allowHashBang: true,
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
  };
  let tree;
  try {
    tree = acorn.parse(source, { ...options, sourceType: /\.mjs$/.test(name) ? 'module' : 'script' });
  } catch {
    tree = acorn.parse(source, { ...options, sourceType: 'module' });
  }
  return createHash('sha256')
    .update(JSON.stringify(strip(tree)))
    .digest('hex');
}

const current = {};
const unparsed = [];
for (const script of scripts().sort()) {
  try {
    current[script] = program(fs.readFileSync(path.join(root, script), 'utf8'), script);
  } catch (error) {
    unparsed.push(script + ': ' + error.message);
  }
}

if (mode === 'record') {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), JSON.stringify({ programs: current, unparsed }, null, 1));
  console.log(`Recorded ${Object.keys(current).length} programs; ${unparsed.length} could not be parsed.`);
  for (const line of unparsed) console.log('  ' + line);
} else {
  const before = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).programs;
  const changed = Object.keys(before).filter((script) => current[script] !== before[script]);
  const added = Object.keys(current).filter((script) => !(script in before));
  console.log(
    changed.length
      ? `CHANGED PROGRAMS (${changed.length}):\n  ` + changed.join('\n  ')
      : `All ${Object.keys(before).length} programs are unchanged.`,
  );
  if (added.length) console.log('New files (not compared): ' + added.join(', '));
  if (unparsed.length) console.log('Could not be parsed now:\n  ' + unparsed.join('\n  '));
  process.exit(changed.length || unparsed.length ? 1 : 0);
}
