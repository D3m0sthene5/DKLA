// Ratings sync for the atlas. A sync code is the only credential: the server stores one small JSON
// document per code in Vercel Blob, under a path derived from the code's SHA-256, and merges every
// upload with what is already there (latest timestamp per entry wins), so two devices never clobber
// each other. Requires a Blob store connected to the project (BLOB_READ_WRITE_TOKEN).
import { createHash } from 'node:crypto';
import { list, put, del, get } from '@vercel/blob';

const CODE = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const MAX_BYTES = 512 * 1024;
const KEEP = 2;

const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

function cleanRatings(input) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const [id, value] of Object.entries(input)) {
    if (typeof id !== 'string' || id.length > 200 || !value || typeof value !== 'object') continue;
    const r = Number(value.r), t = Number(value.t), n = Number(value.n) || 0;
    if (![0, 1, 2, 3].includes(r) || !Number.isFinite(t) || t <= 0) continue;
    out[id] = { r, t: Math.min(t, Date.now() + 86400000), n: Math.max(0, Math.min(100000, Math.floor(n))) };
  }
  return out;
}

function merge(a, b) {
  const out = { ...a };
  for (const [id, value] of Object.entries(b)) if (!out[id] || value.t > out[id].t) out[id] = value;
  return out;
}

async function stored(prefix) {
  const { blobs } = await list({ prefix, limit: 50 });
  blobs.sort((x, y) => new Date(y.uploadedAt) - new Date(x.uploadedAt));
  return blobs;
}

// A Blob store is either private or public. Private is tried first (ratings are nobody else's
// business); a store created as public still works, and the choice is remembered for the instance.
let access = process.env.DKLA_BLOB_ACCESS === 'public' ? 'public' : 'private';
async function withAccess(run) {
  try { return await run(access); } catch (first) {
    const other = access === 'private' ? 'public' : 'private';
    try { const out = await run(other); access = other; return out; } catch { throw first; }
  }
}

// A blob that list() returned but that cannot be read or parsed is an error, never "no ratings":
// treating it as empty would let the next upload overwrite and prune real data.
async function read(blob) {
  const found = await get(blob.url, { access: blob.url.includes('.private.') ? 'private' : 'public', useCache: false });
  if (!found?.stream) throw new Error('stored ratings unreadable');
  const json = await new Response(found.stream).json();
  return cleanRatings(json?.ratings);
}

// Two devices can upload at the same moment, each from the same older blob; merging every retained
// blob (not just the newest) keeps both sets.
async function readAll(blobs) {
  let base = {};
  for (const blob of blobs.slice(0, KEEP + 2)) base = merge(base, await read(blob));
  return base;
}

export default async function handler(req, res) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return send(res, 503, { error: 'not-configured' });
  try {
    if (req.method === 'GET') {
      const code = String(new URL(req.url, 'http://localhost').searchParams.get('code') || '').toUpperCase();
      if (!CODE.test(code)) return send(res, 400, { error: 'bad-code' });
      const blobs = await stored('sync/' + createHash('sha256').update(code).digest('hex') + '/');
      if (!blobs.length) return send(res, 404, { error: 'unknown-code' });
      return send(res, 200, { data: { ratings: await readAll(blobs) }, updatedAt: blobs[0].uploadedAt });
    }
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);
      if (!body || typeof body !== 'object') return send(res, 400, { error: 'bad-body' });
      const code = String(body.code || '').toUpperCase();
      if (!CODE.test(code)) return send(res, 400, { error: 'bad-code' });
      const incoming = cleanRatings(body.data?.ratings);
      const prefix = 'sync/' + createHash('sha256').update(code).digest('hex') + '/';
      const blobs = await stored(prefix);
      const merged = merge(await readAll(blobs), incoming);
      const text = JSON.stringify({ v: 1, ratings: merged });
      if (Buffer.byteLength(text) > MAX_BYTES) return send(res, 413, { error: 'too-large' });
      const saved = await withAccess(mode => put(prefix + Date.now() + '.json', text, { access: mode, contentType: 'application/json', addRandomSuffix: true }));
      const stale = blobs.slice(KEEP - 1).map(b => b.url);
      if (stale.length) await del(stale).catch(() => {});
      return send(res, 200, { data: { ratings: merged }, updatedAt: new Date().toISOString(), id: saved.pathname });
    }
    res.setHeader('allow', 'GET, POST');
    return send(res, 405, { error: 'method-not-allowed' });
  } catch (error) {
    return send(res, 500, { error: 'server-error', detail: String(error?.message || error).slice(0, 200) });
  }
}
