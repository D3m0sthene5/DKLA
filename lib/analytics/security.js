import { createHmac, timingSafeEqual, randomUUID, scryptSync } from 'node:crypto';
import { isIP } from 'node:net';
import { query, ready } from './db.js';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const VISITOR_COOKIE = '__Host-dkla_visitor', ADMIN_COOKIE = '__Host-dkla_admin';
export const fail = (status, message) => Object.assign(new Error(message), { status });
function secret() { const key = process.env.ANALYTICS_SECRET; if (!key || key.length < 32) throw fail(503, 'not-configured'); return key; }
export const digest = value => createHmac('sha256', secret()).update(String(value)).digest('hex');
export function sign(type, id, ttl) {
  const data = Buffer.from(JSON.stringify({ type, id, exp: Math.floor(Date.now() / 1000) + ttl })).toString('base64url');
  return data + '.' + digest(data);
}
export function verify(token, type) {
  if (typeof token !== 'string' || token.length > 512) return null;
  const [data, mac, extra] = token.split('.');
  if (extra || !data || !/^[a-f0-9]{64}$/.test(mac || '')) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(digest(data)))) return null;
  try { const result = JSON.parse(Buffer.from(data, 'base64url').toString()); return result.type === type && UUID.test(result.id) && result.exp > Date.now() / 1000 ? result : null; } catch { return null; }
}
export function cookie(req, name) {
  const item = String(req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
  return item ? item.slice(name.length + 1) : '';
}
export function setCookie(res, name, token, seconds) {
  const value = `${name}=${token}; Path=/; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Lax`;
  const old = res.getHeader?.('set-cookie'); res.setHeader('set-cookie', old ? [].concat(old, value) : value);
}
export function noStore(res) {
  res.setHeader('cache-control', 'private, no-store, max-age=0'); res.setHeader('cdn-cache-control', 'no-store');
  res.setHeader('vercel-cdn-cache-control', 'no-store'); res.setHeader('x-robots-tag', 'noindex, nofollow, noarchive');
  res.setHeader('x-content-type-options', 'nosniff'); res.setHeader('referrer-policy', 'no-referrer');
}
export function send(res, status, data) { noStore(res); res.statusCode = status; res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); }
export function sameOrigin(req) {
  const host = String(req.headers.host || '');
  const origin = req.headers.origin;
  if (origin) { try { const u = new URL(origin); if (u.host === host && (u.protocol === 'https:' || (process.env.NODE_ENV === 'test' && u.protocol === 'http:'))) return; } catch {} }
  else if (req.headers['sec-fetch-site'] === 'same-origin') return;
  throw fail(403, 'origin-denied');
}
export function ip(req) {
  // Vercel overwrites x-vercel-forwarded-for. Never trust the client-supplied generic x-forwarded-for.
  const value = String(process.env.VERCEL ? req.headers['x-vercel-forwarded-for'] || '' : req.socket?.remoteAddress || '').split(',')[0].trim().replace(/^::ffff:/, '');
  return isIP(value) ? value : '';
}
const decoded = value => { try { return decodeURIComponent(String(value || '')).slice(0, 180); } catch { return ''; } };
export function geography(req) {
  const headers = req.headers, country = decoded(headers['x-vercel-ip-country']).toUpperCase(), region = decoded(headers['x-vercel-ip-country-region']).toUpperCase();
  return { country: /^[A-Z]{2}$/.test(country) ? country : '', region, city: decoded(headers['x-vercel-ip-city']), postal: decoded(headers['x-vercel-ip-postal-code']), timezone: decoded(headers['x-vercel-ip-timezone']), missing: !country };
}
const reducedCountries = new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IS IE IT LV LI LT LU MT NL NO PL PT RO SK SI ES SE GB'.split(' '));
export function policy(req) {
  const geo = geography(req);
  const none = new Set(String(process.env.ANALYTICS_NONE_COUNTRIES || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean));
  const extra = new Set(String(process.env.ANALYTICS_REDUCED_COUNTRIES || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean));
  const tier = none.has(geo.country) ? 'none' : reducedCountries.has(geo.country) || extra.has(geo.country) ? 'reduced' : 'full';
  return { tier, scoring: tier === 'full' && !(geo.country === 'US' && (geo.region === 'CA' || geo.region === 'CALIFORNIA')), geo };
}
export function isBot(req) { return /bot\b|crawler|spider|headless|lighthouse|preview|vercel-screenshot/i.test(String(req.headers['user-agent'] || '')); }
export async function body(req, max = 98304) {
  if (Number(req.headers['content-length'] || 0) > max) throw fail(413, 'too-large');
  let value = req.body;
  if (value === undefined) { const chunks = []; let bytes = 0; for await (const chunk of req) { bytes += chunk.length; if (bytes > max) throw fail(413, 'too-large'); chunks.push(chunk); } value = Buffer.concat(chunks).toString(); }
  if (Buffer.isBuffer(value)) value = value.toString();
  if (typeof value === 'string') { if (Buffer.byteLength(value) > max) throw fail(413, 'too-large'); try { value = JSON.parse(value); } catch { throw fail(400, 'bad-body'); } }
  if (!value || typeof value !== 'object' || Array.isArray(value) || Buffer.byteLength(JSON.stringify(value)) > max) throw fail(400, 'bad-body');
  return value;
}
export async function limit(key, count = 60, seconds = 60) {
  await ready();
  const bucket = Math.floor(Date.now() / (seconds * 1000)), expires = new Date((bucket + 2) * seconds * 1000).toISOString();
  const rows = await query(`INSERT INTO dkla_rate_limits(key,expires_at) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET count=dkla_rate_limits.count+1 RETURNING count`, [digest(key + ':' + bucket), expires]);
  if (rows[0].count > count) throw fail(429, 'rate-limited');
}
export function passwordMatches(value) {
  if (typeof value !== 'string' || value.length > 300) return false;
  const encoded = process.env.ANALYTICS_ADMIN_PASSWORD_HASH || '';
  if (encoded) {
    const [kind, salt, expected] = encoded.split(':');
    if (kind !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(expected || '')) return false;
    return timingSafeEqual(scryptSync(value, salt, 64), Buffer.from(expected, 'hex'));
  }
  const expected = process.env.ANALYTICS_ADMIN_PASSWORD;
  return Boolean(expected && expected.length >= 16 && timingSafeEqual(Buffer.from(digest(value)), Buffer.from(digest(expected))));
}
export async function admin(req, mutation = false) {
  const auth = verify(cookie(req, ADMIN_COOKIE), 'admin'); if (!auth) throw fail(401, 'sign-in-required');
  await ready(); const rows = await query('SELECT id FROM dkla_admin_sessions WHERE id=$1 AND NOT revoked AND expires_at>now()', [auth.id]);
  if (!rows.length) throw fail(401, 'sign-in-required');
  if (mutation) { sameOrigin(req); if (req.headers['x-dkla-csrf'] !== digest('csrf:' + auth.id)) throw fail(403, 'csrf-denied'); }
  return { id: auth.id, csrf: digest('csrf:' + auth.id) };
}
export function identityAppearance(id) {
  const a = ['Amber','Quiet','Copper','Silver','Cedar','Indigo','Golden','Blue','Moss','Swift','Warm','Bright','Deep','Calm','Scarlet','Ivory'];
  const b = ['Heron','Oak','Fox','Finch','River','Harbor','Birch','Wren','Pine','Otter','Hill','Sparrow','Cove','Maple','Reed','Raven'];
  const bytes = Buffer.from(id.replaceAll('-', ''), 'hex');
  return { handle: `${a[bytes[0] % a.length]} ${b[bytes[1] % b.length]}`, colour: ['#e5aa70','#7cb0df','#9ec5a7','#bca4d8','#dba7b3','#d2c78b'][bytes[2] % 6], glyph: ['◈','✦','◉','◇','⬡','✧'][bytes[3] % 6] };
}
export { randomUUID };
