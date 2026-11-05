/* dannykind.wiki/eo/gesner: the Executive Orders project's order-by-order readiness cards.

   The page itself is built in the Executive-Orders repository by its gessner-cards job after every readiness
   tracker refresh, and committed to main. This function only relays the latest committed copy, so the page
   follows the project without a redeploy here. It reads a public file, stores nothing and collects nothing.
   The CDN keeps a copy for ten minutes and keeps serving the last good copy for a day if GitHub is unreachable. */
const SOURCE =
  'https://raw.githubusercontent.com/D3m0sthene5/Executive-Orders/main/jobs/gessner-cards/output/CARDS.html';

const HEAD =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
  '<meta name="robots" content="noindex">';

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex');
  try {
    const upstream = await fetch(SOURCE, {
      headers: { 'User-Agent': 'dannykind.wiki eo-gesner relay' },
      signal: AbortSignal.timeout(20000),
    });
    if (!upstream.ok) throw Error(`GitHub answered ${upstream.status}`);
    const page = await upstream.text();
    if (!page.includes('const DATA =')) throw Error('the file is not the cards page');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400');
    res.status(200).send(HEAD + page);
  } catch (error) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res
      .status(503)
      .send(
        HEAD +
          '<title>Executive Order Cards</title><body style="font-family:system-ui;padding:24px;max-width:60ch">' +
          '<h1>The order cards could not be loaded</h1><p>The page is read from the Executive-Orders project on ' +
          'GitHub, which did not answer just now. Reload in a minute.</p></body></html>',
      );
  }
}
