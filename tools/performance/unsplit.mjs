// The hosted page as it was before its data blocks were split out: every block in its manifest filled in again
// from assets/data, and the manifest and loader taken out. Checks that stand in their own late-arriving loader
// (check-lazy-a.mjs, check-lazy-b.mjs) start from this, so the blocks they do not hold are simply in the page.
import { LAZY_MANIFEST_ID, restoreBlocks } from './package.mjs';

export async function unsplit(html, pageURL) {
  const m = new RegExp(`<script type="application/json" id="${LAZY_MANIFEST_ID}">([^<]*)</script>`).exec(
    html,
  );
  if (!m) return html;
  const raws = {};
  for (const [id, { hash }] of Object.entries(JSON.parse(m[1]).blocks)) {
    const response = await fetch(new URL(`assets/data/${hash}.json`, pageURL));
    if (!response.ok) throw Error(`assets/data/${hash}.json (${id}) is not served`);
    raws[id] = await response.text();
  }
  return restoreBlocks(html, raws);
}
