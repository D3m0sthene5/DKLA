// Ratings sync for the atlas. A sync code is the only credential: the server stores one small JSON
// document per code in Vercel Blob, under a path derived from the code's SHA-256, and merges every
// upload with what is already there (latest timestamp per entry wins), so two devices never clobber
// each other. Requires a Blob store connected to the project (BLOB_READ_WRITE_TOKEN).
import { createHash } from 'node:crypto';
import { list, put, del, get } from '@vercel/blob';
import { sameOrigin, body as readBody, ip, limit, fail } from '../lib/analytics/security.js';
import { configured } from '../lib/analytics/db.js';

const CODE = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const MAX_BYTES = 512 * 1024;
const KEEP = 2;

const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

export function cleanRatings(input) {
  const out = Object.create(null);
  if (!input || typeof input !== 'object') return out;
  for (const [id, value] of Object.entries(input)) {
    if (typeof id !== 'string' || id.length > 200 || ['__proto__','constructor','prototype'].includes(id) || !value || typeof value !== 'object') continue;
    const r = Number(value.r), t = Number(value.t), n = Number(value.n) || 0;
    if (![0, 1, 2, 3].includes(r) || !Number.isFinite(t) || t <= 0) continue;
    out[id] = { r, t: Math.min(t, Date.now() + 86400000), n: Math.max(0, Math.min(100000, Math.floor(n))) };
  }
  return out;
}

export function merge(a, b) {
  const out = { ...a };
  for (const [id, value] of Object.entries(b)) if (!out[id] || value.t > out[id].t) out[id] = value;
  return out;
}

async function stored(prefix) {
  const found = new Map(), cursors = new Set();
  let cursor;
  do {
    const page = await list({ prefix, limit: 50, ...(cursor ? { cursor } : {}) });
    for (const blob of page.blobs) found.set(blob.url, blob);
    if (!page.hasMore) break;
    if (!page.cursor || cursors.has(page.cursor)) throw new Error('incomplete ratings listing');
    cursor = page.cursor; cursors.add(cursor);
  } while (true);
  const blobs = [...found.values()];
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
  if (!json?.ratings || typeof json.ratings !== 'object' || Array.isArray(json.ratings)) throw new Error('stored ratings malformed');
  const ratings = cleanRatings(json.ratings);
  if (Object.keys(ratings).length !== Object.keys(json.ratings).length) throw new Error('stored ratings malformed');
  return ratings;
}

// Concurrent uploads can each start from the same older snapshot. Merge every listed immutable
// blob, including later listing pages, before acknowledging or pruning any part of that snapshot.
// If another request pruned one while we read it, fail safely; the client can retry a fresh listing.
async function readAll(blobs) {
  let base = {};
  for (const blob of blobs) base = merge(base, await read(blob));
  return base;
}

const fallbackLimits = new Map();
async function syncLimit(req) {
  if (configured()) {
    try { await limit('sync:' + ip(req), 120); return; } catch (error) { if (error.status === 429) throw error; }
  }
  // Ratings remain available if the optional analytics database is unavailable.
  const minute = Math.floor(Date.now() / 60000), key = ip(req) + ':' + minute;
  for (const [old, item] of fallbackLimits) if (item.minute < minute - 1) fallbackLimits.delete(old);
  const item = fallbackLimits.get(key) || { minute, count: 0 }; item.count++; fallbackLimits.set(key, item);
  if (item.count > 120) throw fail(429, 'rate-limited');
}
export default async function handler(req, res) {
  if (req.method === 'GET') return send(res, 410, { error: 'use-post' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return send(res, 503, { error: 'not-configured' });
  try {
    if (req.method === 'POST') {
      sameOrigin(req); await syncLimit(req);
      const body = await readBody(req, MAX_BYTES);
      const code = String(body.code || '').toUpperCase();
      if (!CODE.test(code)) return send(res, 400, { error: 'bad-code' });
      const codeDigest = createHash('sha256').update(code).digest('hex');
      const prefix = 'sync/' + codeDigest + '/';
      const blobs = await stored(prefix);
      if (body.action === 'read') {
        if (!blobs.length) return send(res, 404, { error: 'unknown-code' });
        const ratings = await readAll(blobs);
        return send(res, 200, { data: { ratings }, updatedAt: blobs[0].uploadedAt });
      }
      if (body.action && body.action !== 'write') return send(res, 400, { error: 'bad-action' });
      const incoming = cleanRatings(body.data?.ratings);
      const merged = merge(await readAll(blobs), incoming);
      const text = JSON.stringify({ v: 1, ratings: merged });
      if (Buffer.byteLength(text) > MAX_BYTES) return send(res, 413, { error: 'too-large' });
      const saved = await withAccess(mode => put(prefix + Date.now() + '.json', text, { access: mode, contentType: 'application/json', addRandomSuffix: true }));
      // These exact immutable URLs were all successfully merged into saved. Uploads that arrived
      // after our listing are not deletion candidates, so their independent updates remain safe.
      const stale = blobs.slice(KEEP - 1).map(b => b.url);
      if (stale.length) await del(stale).catch(() => {});
      return send(res, 200, { data: { ratings: merged }, updatedAt: new Date().toISOString(), id: saved.pathname });
    }
    res.setHeader('allow', 'POST');
    return send(res, 405, { error: 'method-not-allowed' });
  } catch (error) {
    return send(res, error.status || 500, { error: error.status ? error.message : 'server-error' });
  }
}
