/* Hosted-only split. The canonical standalone build and every JSON token survive exactly. */
import { createHash } from 'node:crypto';
export const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function splitBriefs(html) {
  const pattern = /(<script type="application\/json" id="dklaR19Full">)([\s\S]*?)(<\/script>)/;
  const match = html.match(pattern);
  if (!match) throw Error('Full brief block missing');
  const raw = match[2],
    parsed = JSON.parse(raw),
    records = {},
    files = [];
  // Values are JSON strings. Match raw tokens, never serialize legal text again.
  const token = /"(?:[^"\\]|\\.)*"/gy;
  let at = 1;
  while (at < raw.length - 1) {
    token.lastIndex = at;
    const key = token.exec(raw);
    if (!key || raw[token.lastIndex] !== ':') throw Error('Unexpected brief key boundary');
    at = token.lastIndex + 1;
    token.lastIndex = at;
    const value = token.exec(raw);
    if (!value) throw Error('Unexpected brief value boundary');
    const id = JSON.parse(key[0]),
      bytes = Buffer.from(value[0]);
    if (JSON.parse(value[0]) !== parsed[id]) throw Error('Brief value changed');
    const hash = sha(bytes),
      path = `assets/briefs/${hash}.json`;
    files.push({ path, bytes });
    records[id] = hash;
    at = token.lastIndex;
    if (raw[at] === ',') at++;
    else if (raw[at] !== '}') throw Error('Unexpected brief separator');
  }
  if (Object.keys(records).length !== Object.keys(parsed).length) throw Error('Brief count changed');
  const aggregate = sha(Buffer.from(raw));
  files.push({ path: `assets/briefs/${aggregate}.json`, bytes: Buffer.from(raw) });
  const manifest = { version: 1, aggregate, records };
  const replacement =
    match[1] +
    '{}' +
    match[3] +
    '\n<script type="application/json" id="dklaBriefManifest">' +
    JSON.stringify(manifest) +
    '</script>';
  return {
    html: html.replace(pattern, () => replacement),
    files: [...new Map(files.map((f) => [f.path, f])).values()],
    manifest,
    raw,
  };
}

/* Lazy data blocks (v3.1). Hosted packaging only: the portable work/build page keeps every block.

   For each listed id, the block <script type="application/json|application/octet-stream" ... id="ID">RAW</script>
   becomes the same tag with ` data-dkla-lazy` added and an empty body. RAW is moved, byte for byte, to
   assets/data/<sha256(RAW)>.json. One manifest block, dklaDataManifest, records each id's hash and size, in
   the order of tools/performance/lazy-blocks.json (which is also the background prefetch order). The data
   loader (src/features/performance/data-loader.js) is placed right after the manifest and right before the
   first app code in the page (the saved-work adapter, which runs before appCode), so window.DKLAData exists
   before any script reads a block. An empty list changes nothing: no manifest, no early loader.

   The transformation is proved reversible: putting every RAW back and removing the two added blocks must give
   the input page exactly. */
export const LAZY_MANIFEST_ID = 'dklaDataManifest';
export const LAZY_LOADER_ID = 'dklaDataLoader';
const FIRST_CODE = '<script id="dklaSavedWork">';
const NEVER_LAZY = new Set(['dklaR19Full', 'dklaBriefManifest', LAZY_MANIFEST_ID]);
const DATA_TYPE = /\btype="application\/(?:json|octet-stream)"/;
// The one script element whose id attribute is exactly `id`: its opening tag and body bounds.
function blockAt(html, id) {
  const open = new RegExp('<script\\b([^>]*)\\bid="' + id + '"([^>]*)>', 'g');
  const found = [...html.matchAll(open)];
  if (found.length !== 1)
    throw Error(`Lazy block ${id}: expected one <script id="${id}">, found ${found.length}`);
  const tag = found[0],
    attributes = tag[1] + 'id="' + id + '"' + tag[2];
  if (!DATA_TYPE.test(attributes)) throw Error(`Lazy block ${id} is not a JSON or octet-stream data block`);
  if (/\bdata-dkla-lazy\b/.test(attributes)) throw Error(`Lazy block ${id} is already split`);
  const start = tag.index + tag[0].length,
    end = html.indexOf('</script', start);
  if (end < 0 || html[end + 8] !== '>') throw Error(`Lazy block ${id}: no closing </script>`);
  return { tagStart: tag.index, tag: tag[0], start, end };
}
export function splitBlocks(html, ids) {
  if (!Array.isArray(ids)) throw Error('Lazy block list must be an array');
  if (new Set(ids).size !== ids.length) throw Error('Lazy block list repeats an id');
  if (!ids.length) return { html, files: [], manifest: null };
  const located = ids.map((id) => {
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id)) throw Error('Invalid lazy block id: ' + JSON.stringify(id));
    if (NEVER_LAZY.has(id)) throw Error(`${id} cannot be a lazy block`);
    return { id, ...blockAt(html, id) };
  });
  if (html.includes('id="' + LAZY_MANIFEST_ID + '"') || html.includes('id="' + LAZY_LOADER_ID + '"'))
    throw Error('The page already carries a lazy data manifest or loader');
  const blocks = {},
    files = [];
  for (const block of located) {
    const raw = html.slice(block.start, block.end),
      bytes = Buffer.from(raw, 'utf8');
    if (!raw.length) throw Error(`Lazy block ${block.id} is empty`);
    if (bytes.toString('utf8') !== raw) throw Error(`Lazy block ${block.id} does not survive UTF-8`);
    if (/type="application\/json"/.test(block.tag)) JSON.parse(raw); // a JSON block must parse as it is
    const hash = sha(bytes);
    blocks[block.id] = { hash, bytes: bytes.length };
    files.push({ path: `assets/data/${hash}.json`, bytes });
    block.raw = raw;
  }
  // Rebuild the page once, in document order.
  const ordered = [...located].sort((a, b) => a.start - b.start);
  const parts = [];
  let at = 0;
  for (const block of ordered) {
    parts.push(html.slice(at, block.tagStart), block.tag.slice(0, -1) + ' data-dkla-lazy>');
    at = block.end;
  }
  parts.push(html.slice(at));
  const manifest = { version: 1, blocks };
  return {
    html: parts.join(''),
    files: [...new Map(files.map((f) => [f.path, f])).values()],
    manifest,
    raws: Object.fromEntries(located.map((b) => [b.id, b.raw])),
  };
}
// The early loader and its manifest, placed before the first app code.
export function placeLoader(html, manifest, loader) {
  if (!manifest) return html;
  if (/<\/script/i.test(loader)) throw Error('The data loader would close its script tag');
  const json = JSON.stringify(manifest);
  const added =
    `<script type="application/json" id="${LAZY_MANIFEST_ID}">${json}</script>\n` +
    `<script id="${LAZY_LOADER_ID}">${loader}</script>\n`;
  const at = html.indexOf(FIRST_CODE);
  if (at < 0 || html.indexOf(FIRST_CODE, at + 1) >= 0) throw Error('Expected one saved-work adapter');
  return html.slice(0, at) + added + html.slice(at);
}
// The inverse, for verification: the lazy page with every block put back and the added blocks removed.
export function restoreBlocks(html, raws) {
  let out = html;
  const manifest = new RegExp(`<script type="application/json" id="${LAZY_MANIFEST_ID}">[^<]*</script>\\n`);
  const loader = new RegExp(`<script id="${LAZY_LOADER_ID}">[\\s\\S]*?</script>\\n`);
  out = out.replace(manifest, '').replace(loader, '');
  for (const [id, raw] of Object.entries(raws)) {
    const open = new RegExp('(<script\\b[^>]*\\bid="' + id + '"[^>]*?) data-dkla-lazy>(</script>)');
    if (!open.test(out)) throw Error(`Lazy block ${id} is not in the hosted page`);
    out = out.replace(open, (_, tag, close) => tag + '>' + raw + close);
  }
  return out;
}
// Everything the hosted page is, from the portable page: briefs split, then the listed data blocks.
export function hostedRelease(portable, { lazy = [], loader = '' } = {}) {
  const briefs = splitBriefs(portable);
  const data = splitBlocks(briefs.html, lazy);
  const html = placeLoader(data.html, data.manifest, loader);
  if (data.manifest && restoreBlocks(html, data.raws) !== briefs.html)
    throw Error('Lazy data split is not exactly reversible');
  return { html, files: [...briefs.files, ...data.files], briefs, data };
}
