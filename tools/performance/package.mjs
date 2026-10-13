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
