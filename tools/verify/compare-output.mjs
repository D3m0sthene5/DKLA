/* Compare the public output of two builds, file by file.

   The build writes work/public-manifest.json: every file a visitor can load,
   with its size and SHA-256. Keep a copy from before a change, rebuild, and
   run this to see exactly what a visitor would receive differently:

     node tools/verify/compare-output.mjs work/before.json [work/public-manifest.json]

   A reorganisation that is meant to change nothing must print "identical".
   Exit code 0 means identical, 1 means differences were listed. */
import fs from 'node:fs';
const [before, after = 'work/public-manifest.json'] = process.argv.slice(2);
if (!before) {
  console.error('usage: node tools/verify/compare-output.mjs BEFORE.json [AFTER.json]');
  process.exit(2);
}
const load = (file) => new Map(JSON.parse(fs.readFileSync(file, 'utf8')).files.map((f) => [f.path, f]));
const a = load(before),
  b = load(after),
  removed = [],
  added = [],
  changed = [];
for (const [path, file] of a) {
  if (!b.has(path)) removed.push(path);
  else if (b.get(path).sha256 !== file.sha256) changed.push(path);
}
for (const path of b.keys()) if (!a.has(path)) added.push(path);
const show = (label, list) => {
  if (list.length) console.log(`${label} (${list.length}):\n  ` + list.sort().join('\n  '));
};
show('Removed from public output', removed);
show('Added to public output', added);
show('Changed bytes', changed);
const same = !removed.length && !added.length && !changed.length;
console.log(
  same
    ? `identical: ${a.size} public files, byte for byte`
    : `different: ${a.size} files before, ${b.size} after`,
);
process.exit(same ? 0 : 1);
