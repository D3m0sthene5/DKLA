# DKLA private analytics

This extends the approved dashboard preview on `codex/analytics-dashboard-preview`. The atlas collector is appended through the v2.5 runtime manifest; the 35 r18 baseline blocks and the saved notebook, study ratings and legal content are preserved. There are exactly three serverless functions: ratings sync, analytics, and private admin.

## Private deployment setup

1. Create or select an owner-controlled Neon database. Use an isolated Neon branch for the Vercel Preview environment. Put its connection string in Vercel's private `DATABASE_URL` setting. Never paste it into a GitHub issue, pull request or chat.
2. Set `ANALYTICS_SECRET` to a cryptographically random value of at least 32 characters. This signs visitor recovery proofs, admin cookies and CSRF tokens. Keep it stable; changing it invalidates existing proofs. A lost proof cannot be reconstructed from passive similarities.
3. Set a private `ANALYTICS_ADMIN_PASSWORD` of at least 16 characters, or set `ANALYTICS_ADMIN_PASSWORD_HASH` to `scrypt:<32 hex character salt>:<128 hex character digest>`. Only the server receives these values. There is no default production password. Password entry/configuration belongs to the owner; do not put real credentials in source or the sample preview.
4. Set `ANALYTICS_STORAGE_LIMIT_MB` to the actual database capacity (default 1000 MB). The dashboard measures database size and its own table/index footprint. A growth forecast appears after at least two daily observations. Upgrade storage before exhaustion. `ANALYTICS_AUTO_COMPACT=true` permits packing 25 oldest inactive sessions when the authenticated capacity check reaches 95%; it is off by default to favour upgrades. Manual packing is available in Settings and has no fixed-age retention deadline.
5. Redeploy the preview after setting variables. Schema setup runs idempotently on the first configured request. Verify login, policy, collection, sync, exports and the privacy inbox using this isolated preview database before copying settings to Production and deploying.

Without a database and signing secret, public policy reports `none`, ingestion fails closed, and admin sign-in reports that setup is pending. The public design preview remains fictional and separate. No real visitor records or admin credentials are included in this repository.

The Vercel build runs `node tools/analytics/prepare.mjs`: it generates the current catalogue and downloads IPv4/IPv6 ASN tables from [IPtoASN](https://iptoasn.com), licensed [PDDL 1.0](https://opendatacommons.org/licenses/pddl/1-0/). Network lookups run inside the owner's function. Visitor IPs are never sent to an external IP lookup API. ASN data refreshes with builds; unknown or unrouted addresses keep an empty network field.

## Approximate visitor map

Configured full collection records Vercel's server-supplied `x-vercel-ip-latitude` and `x-vercel-ip-longitude`, rounded to two decimal places, alongside the existing city/state metadata. [Vercel documents these as public-IP locations](https://vercel.com/docs/headers/request-headers); they can describe a VPN or network provider and do not establish a person's physical position. Browser GPS is never requested. Coordinates and other Vercel geography headers are trusted only when the server's `VERCEL=1` environment confirms this runtime; isolated tests use fictional headers. Do not put another untrusted proxy in front of the collection API.

The Overview map reads the authenticated, no-store `locations` admin action. Its SQL considers all sessions in the selected start-date range and course, including packed events, and uses the latest session per currently linked profile. Each profile counts once; shared approximate coordinates are grouped with distinct-visitor totals. Alaska and Hawaii have labeled insets. Foreign visitors, visitors with missing or unsupported US coordinates, and anonymous visits are counted separately. Historical sessions have nullable coordinates and cannot be retroactively placed from retained IPs. No location or visitor data is embedded in map assets.

The schema initializer adds nullable checked `latitude` / `longitude` columns idempotently. Validate this additive migration and the dashboard against an isolated preview Neon branch before production rollout. Existing session rows and original observed locations are preserved; an offline retry does not replace them.

The local boundary asset comes from the [US Census Bureau 2024 state cartographic boundaries, 1:20,000,000](https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_20m.zip), described in the [Census boundary catalogue](https://www.census.gov/geographies/mapping-files/2024/geo/carto-boundary-file.html). It includes the 50 states and DC, uses Albers equal-area projections, and makes no external map requests. Download and extract that public archive into a local scratch directory, then regenerate with `node tools/analytics/build-us-map.mjs <extracted-directory>`. The generated asset records its source and shapefile SHA-256. The map is bundled in source and does not require a download during deployment.

## Collection and identity

Collection is default-on when configured. California is `full`, with passive same-person scoring disabled on the server. Once any device visits from California, that device remains ineligible for scoring. A profile is ineligible while it contains any such device or California session. This applies to merged profiles too. Verified sync-code links and explicit owner links remain available. EEA and UK requests are reduced to anonymous visits/build/country/entry totals, without persistent storage reads, cookies or profiles. Unknown geography defaults to full; missing headers are counted in session metadata rather than assumed rare. Additional countries can be reduced or disabled using the optional lists in `.env.example`.

The server's `__Host-dkla_visitor` cookie is HttpOnly, Secure, SameSite=Lax and rolls for 366 days. Signed recovery proofs are copied only to this origin's localStorage, IndexedDB and Cache API. The cache name deliberately does not start with `dkla-`, so existing service-worker upgrades preserve it. A valid server cookie takes precedence. Recovery checks other stores when a copy is missing or invalid. Clearing all site data removes recovery copies. Storage restrictions, private browsing and browser policies can still prevent durable identity; no browser identifier proves a person's real-world identity.

Only successful Blob reads/writes can verify a sync code for analytics linking. Clear sync codes travel in POST request bodies solely for the existing ratings service; only their SHA-256 digests enter the analytics database. Legacy GET reads are converted to POST by the appended module; the server rejects GET. Ratings continue to work if the optional analytics database fails. Existing Blob access mode and latest-timestamp merges are retained.

The tracker records semantic actions and camera centres/zoom, rather than DOM recordings or screenshots. It accounts for foreground time with a 60-second idle threshold, starts a new session after 30 minutes away, and rotates long sessions. Queue batches are deduplicated by event UUID, stored in IndexedDB for offline delivery, and flushed on reconnect, visibility change and pagehide. Regional policy is checked again before storing queued events. Reduced batches contain only anonymous visit/open totals, and their retry markers expire after 48 hours. `file://` copies do not run the collector.

Feature attention follows the foreground Cold Call, source reader, timeline, dictionary, study card or SCOTUS view. Map dwell includes course, subject, subtopic and zoom level. Delivery intervals carry `action: attention`, while actual reader exits carry `action: close`, so a periodic flush does not become a quick exit. Supporting Cold Call ids resolve to their canonical case; authority ids have a separate namespace. Reports distinguish reading from map time, and show weekly first-seen retention cohorts plus each visitor's latest recall ratings, repeat reading, drill time and observed streaks.

Event validation accepts a fixed catalogue and bounded fields. It excludes notes, copied text, raw credentials and arbitrary typed input. Search text is the explicit exception. Error records contain error type, source path, line and column, without arbitrary error messages. Copy records contain only entry/section/character count. URL metadata strips credential parameters and redacts sync codes. No canvas, audio, font, WebGL or high-entropy permission probes are used.

## Access, history and management

`/admin` uses a server-only password, expiring/revocable HttpOnly admin sessions, origin checks and CSRF checks for every mutation. APIs and admin assets use no-store/noindex; admin routes and assets are excluded from the atlas offline worker and install manifest. The atlas's center logo links to `/admin?reauth=1`: it revokes any existing browser session with the normal authenticated CSRF-protected logout before reading private data, then requires a fresh password. Direct dashboard reloads retain the normal eight-hour session. The static shell contains no private records. Public endpoints have shared PostgreSQL rate limits and bounded request bodies; bots are suppressed. Own-browser exclusion is available after an atlas visit on the same origin.

Manual profile links preserve original device ids on sessions and save a membership snapshot. Undo refuses a conflicting later link instead of corrupting membership. Deleting a visitor removes its currently linked devices, sessions, events, sync links, return alerts and linked privacy requests; old recovery tokens cannot restore that deleted id. A later visit creates a new id. Shared ratings Blob documents are separate from analytics deletion and are not erased by this action.

Packing moves semantic event rows into compressed per-session JSON and removes row/index overhead. Reading, searches, paths, ratings, replay and exports continue from those retained summaries. A delayed offline batch atomically restores a packed session before adding events. PostgreSQL may reuse freed pages without decreasing `pg_database_size`; compaction is not a substitute for increasing a physically exhausted database. Only rate-limit, anonymous retry and expired admin-session bookkeeping has a TTL. Raw IPs and derived fields have no fixed deletion deadline.

CSV/JSON exports cover the chosen visitor, session or report, with complete pagination. Full-history JSON is available on a visitor, and Settings offers a complete backup before packing. CSV cells are escaped against spreadsheet formulas. Anonymous totals are exported separately in JSON because they do not have a visitor or session.

Return alerts appear after a watched visitor comes back following 30 minutes away. Optional email requires a Resend account/API key, a verified sender/domain, an owner recipient, and all email variables plus `ANALYTICS_EMAIL_ENABLED=true`. It remains disabled until those settings are deliberately configured. Emails contain the handle/label and an admin link, without IP or study details. Failed delivery is shown in the dashboard. The privacy form sends requests to the same-origin API and private inbox; no email address is required.

## Verification

```sh
pnpm install --frozen-lockfile
node tools/analytics/prepare.mjs --catalog-only
pnpm test:analytics
python3 tools/r19/assemble.py
pnpm check:analytics
python3 tools/r19/check.py
```

Use `node tools/analytics/qa-server.mjs` only for isolated local browser QA. It creates fictional records in an in-memory PostgreSQL engine; it is not a deployed function or a production database. The fixture password in that script authenticates only this disposable test server. Verify the actual Neon connection and Vercel cookie/routing behavior separately on the configured preview.
