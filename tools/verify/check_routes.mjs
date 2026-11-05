/* Old links must keep working: every address an earlier version of the atlas
   was published at has to redirect to the current one, and the site root has
   to serve it. Reads vercel.json; needs no build. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root } from '../runtime.mjs';
const routes = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const plain = (route) => !route.has && !route.missing;
const current = routes.rewrites.find((route) => route.source === '/' && plain(route))?.destination;
assert.match(current || '', /^\/DKLA-v[0-9.]+\.html$/, 'The site root must serve the current atlas');
// Every version that was ever the published file name.
const earlier = [
  'r8',
  'r16',
  'r17',
  'r18',
  'r19',
  'r20',
  'r21',
  'r22',
  'v22.1',
  'v23',
  'v24',
  'v25',
  'v2.4',
  'v2.5',
  'v2.6',
  'v2.7',
];
for (const version of earlier) {
  const source = `/DKLA-${version}.html`;
  if (source === current) continue;
  const redirect = routes.redirects.find((route) => route.source === source && plain(route));
  assert.ok(redirect, `No redirect for the old address ${source}`);
  assert.equal(redirect.destination, current, `${source} must redirect to ${current}`);
}
// When the atlas file is renamed for a new version, its previous name joins the list above.
for (const redirect of routes.redirects.filter(plain))
  if (/^\/DKLA-[rv][0-9.]+\.html$/.test(redirect.source))
    assert.equal(redirect.destination, current, `${redirect.source} points at an out-of-date atlas`);
const eoDoor = routes.redirects.find((route) => route.source === '/eo' && plain(route));
assert.equal(
  eoDoor?.destination,
  'https://executive-orders-production-atlas.edgyglove8.chatgpt.site',
  'The unlisted EO entrance must lead to the existing sign-in-protected control center',
);
assert.equal(eoDoor.permanent, false, 'The EO entrance must not permanently cache a destination');
assert.ok(
  routes.headers.some(
    (route) =>
      route.source === '/eo' &&
      route.headers.some((header) => header.key === 'X-Robots-Tag' && header.value.includes('noindex')),
  ),
  'The unlisted EO entrance must discourage indexing',
);
// The EO project's order cards: relayed from the project's committed page, never indexed.
const cards = routes.rewrites.find((route) => route.source === '/eo/gesner' && plain(route));
assert.equal(cards?.destination, '/api/eo-gesner', '/eo/gesner must be served by the relay function');
assert.ok(fs.existsSync(path.join(root, 'api/eo-gesner.js')), 'The /eo/gesner relay function is missing');
assert.ok(
  routes.headers.some(
    (route) =>
      route.source === '/eo/gesner' &&
      route.headers.some((header) => header.key === 'X-Robots-Tag' && header.value.includes('noindex')),
  ),
  'The EO order cards must discourage indexing',
);
console.log(JSON.stringify({ pass: true, current, oldAddresses: earlier.length }));
