/* GET /api/fuel: how much of Ask Dottie's OpenAI credit is left, for the ring around the
   top-bar clock (src/features/fuel/fuel.js). Public, so it gives only the share left:
     { "fraction": 0.62, "calibrated": true, "updatedAt": "2026-11-18T20:15:00.000Z" }
   and before any calibration { "fraction": null, "calibrated": false, ... }. Never a dollar
   amount (the signed-in dashboard has those: /api/admin?action=fuel).

   It cannot spend money or write anything: it imports nothing that calls OpenAI, it only reads
   two tables (lib/ask/fuel.js fuelStatus, which never creates tables), it ignores the query
   string and any body, and it answers only GET and HEAD. Vercel's CDN keeps each reply for
   60 s and one server instance reads the database at most every 30 s, however often it is
   asked, so the route cannot be used to load the database either. */
import { fuelStatus, publicFuel } from '../lib/ask/fuel.js';

const MEMO_MS = 30_000;

function headers(res, cache) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-robots-tag', 'noindex, nofollow, noarchive');
  // Browsers ask again each time; Vercel's CDN answers for 60 s.
  res.setHeader('cache-control', cache ? 'public, max-age=0, must-revalidate' : 'no-store');
  res.setHeader('vercel-cdn-cache-control', cache ? 'max-age=60' : 'no-store');
  res.setHeader('cdn-cache-control', cache ? 'max-age=60' : 'no-store');
}

export function makeFuelHandler(status = fuelStatus, clock = () => new Date()) {
  let memo;
  return async function fuel(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('allow', 'GET, HEAD');
      headers(res, false);
      res.statusCode = 405;
      return res.end(JSON.stringify({ error: 'method-not-allowed' }));
    }
    try {
      const now = clock();
      if (!memo || now - memo.at >= MEMO_MS) {
        const pending = status().then((value) => publicFuel(value, now));
        memo = { at: now, pending };
        pending.catch(() => (memo = undefined));
      }
      const body = JSON.stringify(await memo.pending);
      headers(res, true);
      res.statusCode = 200;
      return res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      console.warn('Ask DKLA fuel gauge unavailable');
      headers(res, false);
      res.statusCode = 503;
      return res.end(JSON.stringify({ error: 'unavailable' }));
    }
  };
}

export default makeFuelHandler();
