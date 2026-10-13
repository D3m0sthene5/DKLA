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
console.log(JSON.stringify({ pass: true, scripts: Object.keys(pack.scripts).length }));
