/* The lazy data blocks in dist/ are exactly the portable atlas's blocks.

     node tools/performance/check-lazy-files.mjs

   Reads work/build/DKLA-v3.1.html (the portable atlas, which the data guard and content pins check) and
   dist/ (what the site serves). For every block in the hosted page's dklaDataManifest:
   - the list is tools/performance/lazy-blocks.json, in its order;
   - the hosted element is the portable element's tag plus data-dkla-lazy, with an empty body;
   - dist/assets/data/<hash>.json exists, hashes to the manifest entry, has its size, and its bytes equal
     the portable block's body byte for byte;
   - dist/assets/data holds no other file;
   - putting every file back into the hosted page and removing the manifest and the early loader gives the
     page with only the briefs split, exactly. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { restoreBlocks, sha, splitBriefs, LAZY_MANIFEST_ID, LAZY_LOADER_ID } from './package.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const release = JSON.parse(fs.readFileSync(path.join(root, 'work/build/version.json'), 'utf8'));
const portable = fs.readFileSync(path.join(root, 'work/build', release.file), 'utf8');
const hosted = fs.readFileSync(path.join(root, 'dist', release.file), 'utf8');
const listed = JSON.parse(
  fs.readFileSync(path.join(root, 'tools/performance/lazy-blocks.json'), 'utf8'),
).blocks;

function block(html, id) {
  const found = [...html.matchAll(new RegExp('<script\\b[^>]*\\bid="' + id + '"[^>]*>', 'g'))];
  assert.equal(found.length, 1, `one <script id="${id}"> in the page`);
  const start = found[0].index + found[0][0].length;
  return { tag: found[0][0], body: html.slice(start, html.indexOf('</script>', start)) };
}
const marker = hosted.match(
  new RegExp(`<script type="application/json" id="${LAZY_MANIFEST_ID}">([^<]*)</script>`),
);
if (!listed.length) {
  assert.equal(marker, null, 'an empty list adds no manifest');
  assert.ok(!hosted.includes(`id="${LAZY_LOADER_ID}"`), 'an empty list adds no early loader');
  assert.ok(!/\sdata-dkla-lazy[\s>]/.test(hosted), 'an empty list splits nothing');
  console.log(JSON.stringify({ pass: true, lazyBlocks: 0 }));
  process.exit(0);
}
assert.ok(marker, 'the hosted page carries dklaDataManifest');
const manifest = JSON.parse(marker[1]);
assert.equal(manifest.version, 1);
assert.deepEqual(
  Object.keys(manifest.blocks),
  listed,
  'the manifest lists tools/performance/lazy-blocks.json, in order',
);
// The early loader sits right after the manifest and before the first app code.
const loaderAt = hosted.indexOf(`<script id="${LAZY_LOADER_ID}">`),
  firstCode = hosted.indexOf('<script id="dklaSavedWork">');
assert.ok(marker.index < loaderAt && loaderAt < firstCode, 'manifest, then loader, then the first app code');
assert.equal(
  hosted.slice(loaderAt).match(/^<script id="dklaDataLoader">([\s\S]*?)<\/script>/)[1],
  fs.readFileSync(path.join(root, 'src/features/performance/data-loader.js'), 'utf8'),
  'the early loader is src/features/performance/data-loader.js',
);
const raws = {};
let bytes = 0;
for (const [id, entry] of Object.entries(manifest.blocks)) {
  const before = block(portable, id),
    after = block(hosted, id);
  assert.equal(after.body, '', `${id} is empty in the hosted page`);
  assert.equal(after.tag, before.tag.slice(0, -1) + ' data-dkla-lazy>', `${id} keeps its tag`);
  const file = fs.readFileSync(path.join(root, 'dist/assets/data', entry.hash + '.json'));
  assert.equal(sha(file), entry.hash, `${id}: the file hashes to its manifest entry`);
  assert.equal(file.length, entry.bytes, `${id}: the file has the manifest size`);
  assert.ok(
    file.equals(Buffer.from(before.body, 'utf8')),
    `${id}: the file is the portable block, byte for byte`,
  );
  raws[id] = before.body;
  bytes += file.length;
}
const files = fs.readdirSync(path.join(root, 'dist/assets/data')).sort();
assert.deepEqual(
  files,
  [...new Set(Object.values(manifest.blocks).map((e) => e.hash + '.json'))].sort(),
  'dist/assets/data holds exactly the manifest files',
);
assert.equal(restoreBlocks(hosted, raws), splitBriefs(portable).html, 'the split is exactly reversible');
console.log(
  JSON.stringify({ pass: true, lazyBlocks: listed.length, bytesMoved: bytes, files: files.length }),
);
