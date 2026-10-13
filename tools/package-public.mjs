/* Explicit public allowlist. Source inputs and local evidence stay outside dist.

   dist/ ends up holding exactly the listed files and the generated briefs,
   every one read back and compared byte for byte with what it should be.
   A file already there with the right bytes is left alone rather than written
   again (creating 1,800 files costs seconds on Windows); anything else in
   dist/ is removed. On a clean machine, such as the host's build, every file
   is written. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { splitBriefs } from './performance/package.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'tools/public-files.json'), 'utf8'));
const hash = (raw) => createHash('sha256').update(raw).digest('hex');
// Files are handled several at a time; results keep the listed order.
async function each(items, limit, work) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await work(items[index]);
      }
    }),
  );
  return results;
}
const generated = new Set([
  'DKLA-v2.6.html',
  'index.html',
  'sw.js',
  'version.json',
  'assets/admin/catalog.js',
]);
const sourceOf = (relative) => path.join(root, generated.has(relative) ? 'work/build' : '', relative);
// The allowlist in order, with each listed directory expanded to its files.
async function listed(relative) {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).some((p) => p === '..' || p === '.' || p === ''))
    throw Error('Invalid public path: ' + relative);
  const stat = await fs.lstat(sourceOf(relative));
  if (stat.isSymbolicLink()) throw Error('Symlink cannot be published: ' + relative);
  if (stat.isDirectory()) {
    const found = [];
    for (const name of (await fs.readdir(sourceOf(relative))).sort())
      found.push(...(await listed(relative + '/' + name)));
    return found;
  }
  if (stat.isFile()) return [relative];
  throw Error('Unsupported public file: ' + relative);
}
// Make dist/<relative> hold exactly `bytes`, then prove it by reading it back.
async function place(relative, bytes) {
  const target = path.join(output, relative);
  let current = null;
  try {
    const stat = await fs.lstat(target);
    if (stat.isFile()) current = await fs.readFile(target);
    else await fs.rm(target, { recursive: true, force: true }); // a symlink or folder where a file belongs
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (!current || !current.equals(bytes)) {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
    current = await fs.readFile(target);
    if (!current.equals(bytes)) throw Error('Public copy differs: ' + relative);
  }
  return { path: relative, bytes: current.length, sha256: hash(current) };
}
// output is a fixed child of this repository, never derived from user input.
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw Error('Unsafe output directory');
try {
  if ((await fs.lstat(output)).isSymbolicLink()) throw Error('dist is a symlink');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await fs.mkdir(output, { recursive: true });
// Only the current hosted release is split. Every other public file and the
// canonical work/build portable HTML remain untouched.
const hostedPath = 'DKLA-v2.6.html';
const split = splitBriefs(await fs.readFile(path.join(root, 'work/build', hostedPath), 'utf8'));
const hosted = new Map(
  [...split.files, { path: hostedPath, bytes: Buffer.from(split.html) }].map((item) => [
    item.path,
    item.bytes,
  ]),
);
const publicFiles = [];
for (const name of [...manifest.files, ...manifest.directories]) publicFiles.push(...(await listed(name)));
// Listed files first, in their listed order, then the generated briefs. The
// hosted page keeps its listed position but carries the split page's bytes.
const wanted = [...publicFiles, ...[...hosted.keys()].filter((file) => !publicFiles.includes(file))];
const verified = await each(wanted, 16, async (relative) =>
  place(relative, hosted.get(relative) ?? (await fs.readFile(sourceOf(relative)))),
);
// Nothing else may remain in dist/.
const keep = new Set(wanted);
async function prune(relative = '') {
  let remaining = 0;
  for (const entry of await fs.readdir(path.join(output, relative), { withFileTypes: true })) {
    const child = relative ? relative + '/' + entry.name : entry.name;
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      if (await prune(child)) remaining++;
      else await fs.rmdir(path.join(output, child));
    } else if (keep.has(child)) remaining++;
    else await fs.rm(path.join(output, child), { recursive: true, force: true });
  }
  return remaining;
}
await prune();
await fs.mkdir(path.join(root, 'work'), { recursive: true });
await fs.writeFile(
  path.join(root, 'work/public-manifest.json'),
  JSON.stringify({ files: verified }, null, 2) + '\n',
);
console.log(`Public output: ${verified.length} files, byte-verified; src/ and tools/ excluded.`);
