# Full briefs on demand

The canonical `work/build/DKLA-v2.6.html` remains a complete standalone corpus.
`package.mjs` transforms only the current hosted `dist` HTML: its `dklaR19Full`
block becomes `{}`, followed by an explicit ID-to-content-hash manifest.
Every brief is copied as its exact raw JSON string token into
`assets/briefs/<sha256>.json`. A separate content-addressed JSON aggregate is
the exact original block, used to prepare complete portable exports. No legal
string is re-encoded, deduplicated or edited. Identical file bytes may share
the same content address, but all original IDs and values remain present.

The loader requests nothing during boot. Opening a full brief loads one small
record, verifies SHA-256 before parsing, and retains it in Cache Storage.
Already fetched briefs work offline, including after reload. Unopened briefs
need a first online load; failed reads show an explicit retry control. Missing
cache permissions/quota do not prevent online reading. Failed requests are not
memoized; disconnected reader elements never receive late updates.

Both `LegalAtlas.exportHTML()`/the Save UI and `DKLA.portableBlob()` await the
complete exact aggregate before serialization. These entry points are now
asynchronous. Failed hydration produces no incomplete download; master JSON
export remains independent. Complete standalone files read their embedded
aggregate without fetching. A serialization-only hidden legacy `layoutBtn`
allows the unchanged early script to reopen saved live DOM; geography removes
it as before. The control is removed from the current document immediately
after synchronous serialization.

The service worker retains prior installed shells. Direct successful historical
HTML responses cannot replace the current canonical offline shell. Loading full
briefs does not expand the worker's startup precache or touch visitor data.

`check_public.mjs` regenerates the transformation from the canonical artifact and
requires the exact hosted shell, precise generated asset inventory, content
addresses and original payload bytes. The release guard substitutes only pinned
reviewed runtime snippets back to their frozen v2.5 counterparts, then verifies
the complete original script/data fingerprints. The only metadata exception is
version/build plus the exact first v2.6 history entry; older history remains exact.

Checks: `node --test tools/performance/brief-loader.test.mjs` and
`node tools/performance/browser.cjs http://127.0.0.1:8772/DKLA-v2.6.html ../startup-performance`.
The browser test blocks external/API requests and uses disposable synthetic
storage. It tests main/supporting/Cold Call readers, cached and uncached offline
behavior, retry and stale closes, exact aggregate plus synthetic edit export,
file reopening and a second-generation portable export/reopen. It does not
prove offline PDF/image coverage, live sync or a new legal-content audit.

Pre-final-typography local comparison (same gzip server, fresh Chrome, 20 Mbps,
60 ms, cache and worker disabled): median visible time 12.279s baseline versus
10.842s candidate (11.7% reduction), transferred HTML 24,505,705 versus
20,230,615 bytes (17.4% reduction), three samples each, zero page errors.
This is a controlled local result, not a deployed-network performance claim.
Final combined release and Vercel measurements are recorded by the parent.
