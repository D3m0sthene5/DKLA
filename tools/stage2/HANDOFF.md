# Stage 2a: exact editable source tree and public build

Base: stage 1 commit 91f5764f9a7dc1722fbd756481ffbb2d31c8382e,
branch codex/source-tree-preview. Parent owns publication and fresh review.
Production promotion remains exclusively the owner's decision.

## What is complete

The current assembler and bounded audit tools read src/, not DKLA-r18.html.
The source tree reproduces all 42,368,867 original bytes, SHA-256
bffd3d4469836a19eaafbd2e29eff443b08b87d496147c887f5d2589d3cb45c1.
It has 30,184 files totaling 47,862,028 bytes including container metadata:
20 named early classic JS bodies, 17 styles, 14 JSON blocks and one encoded
sprite body. Source records remain their exact original UTF-8 JSON slices.
Container manifests retain original separators/keys/whitespace. No legal data
was deleted, regenerated, normalized, deduplicated or re-encoded.
Repeated dictionary slugs, source page labels and node-reference IDs were found
and preserved as separate indexed records. Ambiguous /@ID lookup fails and
requires an exact numeric pointer; duplicates are not resolved by this work.

The built app is exactly the approved stage 1 app: 81,867,705 bytes, build
v2.5-92cdcbdf80, SHA-256
185dcdbbb78113a5a7ed95c702f819d59eb687417f76534e1e6807cff8001f91.
It has the same globals, runtime order, storage adapter and behavior. No faster
visitor-load claim is made: hosted payload is unchanged. Earlier stage 1's noisy
localhost sample was 3.47s before / 3.55s after; this is not a network benchmark.

Build orchestration has explicit reusable Python and Node imports/exports.
`pnpm build`, `pnpm check` and `pnpm preview` use Node plus Python 3.10+ on
Windows/macOS; DKLA_PYTHON can select the executable and UTF-8 is explicit.
Windows was executed here; macOS was not available for live verification.
Browser smoke uses the declared @playwright/test dependency and an installed
Chrome selected by platform or DKLA_CHROME/--chrome.

New generated HTML/worker/version/index/integrity/admin catalog outputs go to
ignored work/build and dist. All historical tracked outputs stay unchanged
in Git. The explicit 370-file tools/public-files.json allowlist preserves existing public
root releases, PDFs, manifests, portraits/icons and other existing asset folders.
New src/, tools/ and work/ URLs return 404 in the local public preview. Existing
API functions remain Vercel functions. Vercel outputDirectory must be dist;
its assembler/checker reject duplicate JSON configuration keys. Runtime check
validates exact output inventory and file hashes. Historical full HTML and source
PDFs are still public: source-file protection is a later stage, not achieved here.

Agent-facing AGENTS, README and architecture guide are short and current.
Their full original checkout bytes are preserved in named tools/history archives
and checked against the frozen stage 1 checksum manifest. Original checkout
newlines differ from Git canonical newlines, so archives intentionally preserve
the recorded checkout bytes rather than rewriting them.

## Separately reviewed preservation fix

The security audit reproduced an existing sync loss bug: successful overlapping
uploads could be pruned without being merged because only four snapshots were
read. api/sync.js now paginates/merges all retained snapshots, fails before any
replacement/pruning on unreadable or corrupt data, and only prunes listed files
whose data was successfully read. No sync format/key changes. Optional identity
linkage is skipped on preview reads and writes. 13 isolated tests use mocked
Blob/identity operations; no visitor data, credentials, live Blob, Neon or paid
service was accessed. Real concurrent Blob integration remains untested.

## Checks and evidence

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm check
pnpm source --original
pnpm check:stage2 ../stage2-evidence/browser
pnpm preview --no-build --port 8768
node tools/stage2/check_public.mjs http://127.0.0.1:8768
node tools/stage1/browser_smoke.cjs --url http://127.0.0.1:8768/DKLA-v2.5.html --output ../stage2-evidence/browser
```

Use the browser command before geometry comparison on a fresh checkout. Evidence
stays outside Git. Local checks require loopback permission; a sandbox EACCES or
network denial is not an application failure. Preview is static and local only;
its /api/ routes return unavailable rather than proxying to production.

Build/release/source checks pass, all 22 executable classic blocks and all 23
application/json blocks parse without executing code, four parser regression
fixtures and three byte-preservation/path tests pass, 13 sync tests pass, 12 saved-work adapter checks
pass, seven content-guard regressions pass, and all 2,973 original production
files pass the exact approved-source/configuration/doc exception gate. Archive
hashes and all original extracted bytes pass. The saved-work/current approved
runtime source changes are already stage 1 exceptions, not new legal exceptions.
The generated app SHA equals stage 1 exactly. All 29 browser smoke assertions
pass with zero page errors; desktop 1440x900, landscape phone 844x390 and portrait
phone 390x844 all have exact original camera/region/other-section geometry.
The allowlisted 370 public files are copied byte-for-byte; recursive public
directory expansion is disabled, so future files require an explicit allowlist
edit and cannot silently ship. real localhost tests
confirm root rendering, new-source exclusion and exact 1KB PDF/icon/manifest
ranges. DKLA-sources currently contains only its manifest, not restored page
images: that inherited limitation was not changed or claimed fixed.

The parent session holds ../stage2-evidence build/check/content guard/identity,
route reports, browser screenshots/exports and publication manifest. Fresh
independent review found an early-script validation gap: appCode syntax errors
could pass the old release checker. It now parses every executable rebuilt inline
script (including unnamed scripts) and every JSON data body. Regression fixtures
cover invalid early/nonnamed JS, malformed non-seed JSON and a valid authorized
comment edit. The independent reviewer confirmed a valid comment edit builds/checks, an
invalid appCode fixture fails the actual checker, and the explicit 370-file
allowlist/inventory/hashes all pass. No review blocker remained. The parent also caught duplicate Vercel outputDirectory
configuration before the fresh review; the obsolete property was removed and
strict configuration-key checks added. Deployed preview checks are performed by
the parent.
Do not describe those as passed until the parent records their actual results.

## Typical bounded edits

`pnpm source --record seedData /nodes/@cp-gibbs --chars 4000` locates a 4,844-byte
seed record without assembling the whole corpus. The internal node container
manifest is 174,340 bytes and helper output is capped; an agent need only read the
selected record. `tools/atlas.py entry` identifies the later brief/correction/
narrative sources that determine the displayed case, so editing seed text alone
may not change the effective full brief. Canonical full briefs and authored
narratives already have individual files. A rule correction uses its relevant
record and recorded source review. Adding a main case still requires brief,
converted sections, narrative, layout, relationships and source routing checks.
Adding a feature uses a named JS/CSS file and the small ordered runtime manifest;
it still depends on legacy globals until the next runtime boundary stage.

The source origin hashes remain provenance. An explicitly reviewed future leaf
edit changes the dynamic source SHA/build token and can build/check normally.
Only this stage's frozen original/app identity gate deliberately fails content
changes. Never refresh that gate to conceal drift or regenerate originals.

## Next fresh session

This is stage 2a, not completed browser module conversion. Start with this note,
current AGENTS and architecture guide. Keep the byte-preserving tree and guards.
Stage 2b should introduce real browser imports/exports and explicit lifecycle /
storage boundaries in small groups. appCode (62,445 bytes) and studyCode
(105,925 bytes) still share globals and accept later wrappers; keep their exact
execution until a tested explicit boundary replaces it. The one-read saved-work
adapter is temporary. Add real old-recovery fixtures before replacing storage;
full legacy localStorage graph recovery remains untested.

Then demand-load small course/book/dictionary/feature payloads with visible
loading polish, measure cold/repeat loads, and keep already-loaded content offline.
Do not discard old service-worker caches before a safe migration. The original
portable export clones the whole document, so a lazy hosted shell needs deliberate
hydration or a separate complete portable build. Preserve sync/export/hash routes,
ratings and old recovery. Source protection must address historical embedded
HTML text as well as PDF downloads; complete portable corpora can remain owner /
local outputs rather than public bulk paths when that stage is chosen.
Cross-device sync, exhaustive source pages/routes, offline cache migration,
portable-file reopening, every keyboard/accessibility path, full legacy graph
recovery and a fresh legal audit remain outside the evidence here. Production,
visitor records, secrets, repo visibility/history and paid provisioning were not
accessed or changed.
