# DKLA v2.6 release handoff

Base source commit: `345b700ce339d9a660fa8a114be82b576eb35ceb`.
The owner authorized this reviewed v2.6 release for `dannykind.wiki` and
`dkla.dev`, including the dictionary, ice, typography, demand-loaded briefs,
and simpler cookie-only analytics. This is a one-release exception. Future
rebuild stages need separate owner authorization. Preview analytics stays off;
rebuild in the production environment instead of promoting a preview artifact.
Only the owner promotes production. No commit, push, or deployment is recorded
here.

## What this release contains

The dictionary spine sits inside the existing authorities header. Cold Call
has bounded vapor and sharper ice detail. Orbitron supplies short technical
display text, including the version and SCOTUS presentation; longer reading
and the interface use the original system sans stack. The licensed Orbitron
font and complete OFL notice are embedded in the portable document. Space
Grotesk assets and an earlier wrapper remain in source history but are not
included by the active stylesheet manifest. See `TYPOGRAPHY.md` for visual
evidence and `assets/README.md` for font provenance. The original map camera,
course geography, court seat identities/actions, legal data, and PDFs remain.

The canonical `work/build/DKLA-v2.6.html` is a complete standalone corpus.
The hosted `dist/DKLA-v2.6.html` moves only the 13 MB `dklaR19Full` block to
content-addressed brief files under `assets/briefs/`. The hosted page requests
no brief at startup. Opening a full brief verifies the exact raw JSON token
hash and caches it for offline reuse. An unopened brief needs one online load;
a failed load shows Retry. The aggregate is fetched before Save UI,
`LegalAtlas.exportHTML()`, or `DKLA.portableBlob()` produces a complete
standalone copy. These export entry points are asynchronous. See
`tools/performance/README.md` for boundaries and test commands.

The collector recognizes a returning browser only from the first-party signed
cookie. It does not recover identity from localStorage, IndexedDB, Cache API,
browser resemblance, or ratings sync. Clearing the cookie creates a separate
browser identity. Prior profile links and dashboard history remain visible as
historical records; new matching and linking are disabled. There is no new
popup. Production collection follows the existing regional policy and private
dashboard controls. Preview collection remains disabled. The analytics code,
privacy text, and synthetic test boundaries are in `tools/analytics/README.md`.

The build uses the editable `src/` tree and ordered classic-script manifest,
not committed historical HTML as input. Runtime scripts still share globals;
this release does not complete the later ES-module migration. Current local
public output contains 1,840 byte-verified files: 371 previously allowlisted
files plus the generated content-addressed brief assets.
The historical HTML and public PDFs remain in that allowlist. Source-PDF and
bulk-text protection is a later stage, so no privacy protection is claimed for
those files here.

## Saved work and updates

The original storage keys `legal-atlas-v1:<graphId>:dkla-r8-rebuilt`,
`dkla.study.v1`, `dkla.coldCall.v1`, IndexedDB `LegalAtlasPortable`, graph and
sync formats, imports/exports, and old hash routes remain. The one-read saved
work adapter handles old notebook state. The service worker waits for the
user's reload action and preserves older installed caches. A regression test
covers the case where a direct historical HTML request must not poison the
current offline shell. Cached opened briefs work offline; unopened briefs,
PDFs, and images do not have a new complete offline guarantee.

The isolated migration test boots the exact frozen v2.5 artifact (SHA-256
`185dcdbbb78113a5a7ed95c702f819d59eb687417f76534e1e6807cff8001f91`),
edits a real Note through that UI, rates a study item, and captures its
IndexedDB graph. It follows the old redirect/hash into v2.6 and reloads.
Exact edited prose, study rating, legacy Cold Call blob, and representative
recovery record survive. It uses disposable browser storage; it does not
establish exhaustive legacy recovery or live cross-device sync.

## Build and checks

On Windows set `DKLA_PYTHON` to Python 3.10+ and use a writable temporary
directory under ignored `work/` if the default temp folder is restricted.
After installing the locked dependencies, run:

```sh
pnpm build
pnpm check
pnpm check:v26
node --test tools/performance/brief-loader.test.mjs
node --test tools/analytics/analytics.test.mjs tools/analytics/browser-recognition.test.mjs tools/analytics/preview.test.mjs tools/sync/sync.test.mjs
pnpm check:analytics
```

`tools/v26/content_guard.py` checks all 2,973 original paths and all
42,368,867 original source bytes (SHA-256
`bffd3d4469836a19eaafbd2e29eff443b08b87d496147c887f5d2589d3cb45c1`).
It pins 46 old executable/data blocks, substituting only the reviewed
performance runtime, the presentation module, top-level version/build, and
the exact first v2.6 changelog entry before comparison. The performance
runtime hashes are pinned in `tools/performance/approved-runtime.json`.
Generated historical files are excluded from the source publication manifest;
their checkout-only line-ending changes are not release edits.

Current combined local artifact is build `v2.6-83039be295`. Canonical HTML
SHA-256: `935d3befa5836149b57b5496104e798915cc739608aa18bb9fbc88de3f5ae878`.
Hosted HTML SHA-256:
`b21cf1f7639a3e7874170ccadf193e5761bfff26a0bae8903efc190e733338cc`.
The latest content guard checks all original paths and all 46 pinned blocks.
The full-brief browser lifecycle passed against the preceding typography
artifact with
zero page errors. It covered startup, main/supporting/Cold Call readers,
cached-offline and uncached retry, close-before-load, Save UI, direct portable
export, file reopening, and a second-generation export/reopen. Its synthetic
report is `../startup-performance/final-4489b9e84b/browser-report.json`. The
subsequent CI fit correction changes only typography and test font readiness.

The earlier controlled local comparison used the same gzip server, fresh
Chrome, 20 Mbps, 60 ms, disabled cache and worker, with three samples per
candidate: median visible time 12.279s on baseline versus 10.842s after the
brief split (11.7% lower); transferred HTML 24,505,705 versus 20,230,615
bytes (17.4% lower). A later controlled hosted comparison of v2.5 with the
preceding v2.6 typography build measured median cold visible time 12.553s versus
10.692s (14.8% lower) and transferred bytes 24,606,997 versus 20,126,204
(18.2% lower). These are controlled comparisons, not an unrestricted visitor
network speed guarantee.

The final v2.5-to-v2.6 synthetic migration passed. The parent ran all 29
browser smoke checks and exact geometry comparisons at desktop, portrait
phone, and landscape phone on the preceding typography build, with zero browser
errors. The
focused Cold Call ice check passed those viewports, reduced motion, and forced
colors. A fresh independent review found no release blocker. The current
artifact's nine-viewport home-fit retest, production build, hosted Linux CI, and
live URL checks remain deployment follow-up; local checks
do not establish a production deployment. No visitor records, live storage,
secrets, or production database were used for these checks.

Publish only source paths enumerated with SHA-256 in
`work/v26-source-files.json` when that manifest is refreshed at the final
source freeze. Do not commit generated `dist/`, `work/build/`, historical HTML,
worker, version, integrity, or catalog output. The active release uses
`tools/v26/release-font.css` and `tools/v26/typography.css`; the unused Space
Grotesk font files are retained for provenance but need not be newly published.
