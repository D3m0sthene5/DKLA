/* dannykind.wiki/eo/dashboard: the Executive Orders project's production control center (Production flow,
   Mission, Overview, Workflow map, Job tiers, Blockers, Next best action, Handoffs & PRs).

   The dashboard lives in the Executive-Orders repository at research/progress/control-center/. This function
   relays the latest committed copy of its files from main, so the page follows the project without a redeploy
   here; once open, the page itself checks main every five minutes for a newer tracker generation. The files use
   relative paths and this site strips trailing slashes, so each relayed page and script gets its asset names
   rewritten to /eo/dashboard/<name>. It reads public files, stores nothing and collects nothing.
   The CDN keeps a copy for ten minutes and keeps serving the last good copy for a day if GitHub is unreachable. */
const SOURCE =
  'https://raw.githubusercontent.com/D3m0sthene5/Executive-Orders/main/research/progress/control-center/';
const BASE = '/eo/dashboard/';

const FILES = {
  'index.html': 'text/html; charset=utf-8',
  'app.js': 'text/javascript; charset=utf-8',
  'flow-core.js': 'text/javascript; charset=utf-8',
  'flow-view.js': 'text/javascript; charset=utf-8',
  'mission.js': 'text/javascript; charset=utf-8',
  'observability-core.js': 'text/javascript; charset=utf-8',
  'style.css': 'text/css; charset=utf-8',
  'mission.css': 'text/css; charset=utf-8',
  'mark.svg': 'image/svg+xml',
  'portico.svg': 'image/svg+xml',
  'snapshot.json': 'application/json; charset=utf-8',
  'atlas.json': 'application/json; charset=utf-8',
  'evidence.json': 'application/json; charset=utf-8',
  'observability.json': 'application/json; charset=utf-8',
  'orders.csv': 'text/csv; charset=utf-8',
};

// Only the page and the one script that names other files need their relative names made absolute.
const REWRITE = new Set(['index.html', 'app.js']);

function absolutize(text) {
  for (const name of Object.keys(FILES)) {
    for (const q of ['"', "'"]) text = text.split(q + name + q).join(q + BASE + name + q);
  }
  return text;
}

export default async function handler(req, res) {
  const name = typeof req.query.f === 'string' ? req.query.f : 'index.html';
  res.setHeader('X-Robots-Tag', 'noindex');
  if (!Object.hasOwn(FILES, name)) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(404).send('Not found');
    return;
  }
  try {
    const upstream = await fetch(SOURCE + name, {
      headers: { 'User-Agent': 'dannykind.wiki eo-dashboard relay' },
      signal: AbortSignal.timeout(20000),
    });
    if (!upstream.ok) throw Error(`GitHub answered ${upstream.status}`);
    let body = await upstream.text();
    if (name === 'index.html') {
      if (!body.includes('id="nav"')) throw Error('the file is not the control center page');
      body = absolutize(body).replace('<head>', '<head><meta name="robots" content="noindex">');
    } else if (REWRITE.has(name)) {
      body = absolutize(body);
    }
    res.setHeader('Content-Type', FILES[name]);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400');
    res.status(200).send(body);
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    if (name !== 'index.html') {
      res.status(503).send('');
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res
      .status(503)
      .send(
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">' +
          '<meta name="viewport" content="width=device-width, initial-scale=1">' +
          '<title>Executive Orders Dashboard</title><body style="font-family:system-ui;padding:24px;max-width:60ch">' +
          '<h1>The dashboard could not be loaded</h1><p>The page is read from the Executive-Orders project on ' +
          'GitHub, which did not answer just now. Reload in a minute.</p></body></html>',
      );
  }
}
