/* The configuration files the host and the package manager read must be valid
   JSON, and the commands the host runs must exist. A stray comma in
   package.json once passed every other check here (they are started without
   the package manager) and then failed the real deployment. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root } from '../runtime.mjs';

const json = (file) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  } catch (error) {
    throw Error(`${file} is not valid JSON: ${error.message}`);
  }
};
const pack = json('package.json');
const host = json('vercel.json');
for (const file of [
  'tools/public-files.json',
  'src/features/manifest.json',
  'src/manifest.json',
  '.prettierrc.json',
])
  json(file);
// Every script names a file that exists.
for (const [name, command] of Object.entries(pack.scripts)) {
  const file = command.split(' ').find((word) => /^tools\//.test(word));
  if (file)
    assert.ok(
      fs.existsSync(path.join(root, file)),
      `package.json script "${name}" runs a missing file: ${file}`,
    );
}
for (const name of ['build', 'verify', 'verify:teeth', 'format'])
  assert.ok(pack.scripts[name], `package.json has no "${name}" script`);
// The host builds with this command and publishes this folder.
const built = host.buildCommand.split(' ').find((word) => /^tools\//.test(word));
assert.ok(built && fs.existsSync(path.join(root, built)), 'vercel.json buildCommand runs a missing file');
assert.equal(host.outputDirectory, 'dist');
// Every data file an API function reads at run time (new URL('./file',
// import.meta.url) in it or in a module it imports) must be in its bundle:
// matched by that function's includeFiles glob in vercel.json. api/ask.js
// once listed only the Ask corpus after it started importing the analytics
// database module, which reads lib/analytics/schema.sql when it loads.
function dataFiles(file, seen = new Set(), found = new Set()) {
  if (seen.has(file)) return found;
  seen.add(file);
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  for (const [, from, dynamic] of text.matchAll(
    /\bfrom\s+'(\.{1,2}\/[^']+)'|\bimport\(\s*'(\.{1,2}\/[^']+)'\s*\)/g,
  ))
    dataFiles(path.posix.join(path.posix.dirname(file), from || dynamic), seen, found);
  for (const [, spec] of text.matchAll(/new URL\(\s*'(\.{1,2}\/[^']+)'/g))
    if (!spec.endsWith('.js')) found.add(path.posix.join(path.posix.dirname(file), spec));
  return found;
}
let bundled = 0;
for (const name of fs.readdirSync(path.join(root, 'api')).filter((file) => file.endsWith('.js'))) {
  const glob = host.functions?.[`api/${name}`]?.includeFiles;
  for (const file of dataFiles(`api/${name}`)) {
    // A directory read file by file (such as lib/analytics/asn/) needs its contents.
    const sample = file.endsWith('/') ? file + 'any' : file;
    assert.ok(
      typeof glob === 'string' && path.matchesGlob(sample, glob),
      `vercel.json: api/${name} reads ${file} at run time, but its includeFiles (${glob ?? 'none'}) leaves it out`,
    );
    bundled++;
  }
}
console.log(JSON.stringify({ pass: true, scripts: Object.keys(pack.scripts).length, bundled }));
