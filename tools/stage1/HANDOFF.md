# Stage 1: dictionary, cold vapor, and preservation checks

Base: production commit `abb6aa459d66abef07104883d5d38d77fe7496e8`, branch
`claude/atlas-design-content-audit-m1cw9x`. The public deployed HTML was fetched
without executing it and exactly matched its Git blob: 81,862,228 bytes,
SHA-256 `8a9884c008dde346cddf940d56c0a27c2d8adf4701c623c2d37e060fda8be158`.
Production promotion remains exclusively the owner's decision.

## Changes

- Dictionary entrance is a horizontal book spine inside the authorities header.
  Original graph records, navigation IDs, camera and other section bounds remain.
- Cold Call has fine crystal edging and low, soft vapor, limited to six pixels
  sideways and eighteen downward. The visible-only scheduler caps at 24fps.
- Preview analytics stops before reading request identity or touching storage.
  Local/preview client sessions do not collect, queue or replay telemetry.
- `pnpm build` runs the existing assembler and checker before the analytics
  catalog preparation. Vercel uses that same command path; new generated HTML
  does not need to be committed. Historical artifacts remain untouched in Git.
- `.gitattributes` prevents checkout newline conversion of committed bytes.

## Evidence and checks

See `README.md` in this directory for the commands and precise coverage limits.
The committed baseline has hashes of all 2,973 original tracked files and all
340 embedded script bodies across historical HTML, plus three viewport geometry
captures. `compare-html` requires all 45 shipping script blocks in order; only
the named approved runtime module bodies and the explicit release-build token
may change. All legal datasets are otherwise byte-identical.

The saved-work fix adds one separately checked script immediately before the
original `appCode`; its bytes must exactly match `tools/v25/saved-work.js`.
Every original script remains intact apart from the explicitly approved runtime
modules and the single generated release-build metadata token.

The existing release checker, worker checks, authorities checks, boot checks,
reading checks and Cold Call reader checks passed. The 32 existing analytics
tests passed with an isolated local database; the added preview-guard test
confirms the endpoint returns before inspecting the request. No visitor records
or production credentials were read. Cross-device sync was not exercised.

The fresh Astra reviewer found the geometry checker could accept desktop-only
evidence. It now requires desktop, landscape phone and portrait phone captures,
with a regression test for missing evidence. Final browser/storage results and
preview identity are recorded in the stage result supplied with the PR.

The stronger actual-form persistence check found a production defect: saving an
edited existing Note exported the correct prose, but reload discarded it. The
saved graph used `v25-curated-locked`, while the immutable legacy reader required
the seed marker `r14-packed-clusters`. The frozen production baseline therefore
passes 28 of 29 browser checks. The corrected candidate passes all 29, with zero
page errors, across desktop 1440×900, landscape phone 844×390 and portrait phone
390×844. All original camera/region/other-section geometry matches exactly.

The temporary adapter is a narrow one-read compatibility boundary: only the
`LegalAtlasPortable` database, `graphs` store and exact existing graph key are
intercepted. A matching graph/content build and known curated layout are required.
Its listener changes only the returned structured clone's layout marker before
the legacy handler runs. It restores the native method after that boot read;
the old revision/timestamp checks, normal persistence, and curated geography
remain responsible for restore and saving. It creates no new key or write path.
Twelve synthetic checks cover mismatches, unrelated calls, callback order,
one-shot installation, unchanged revision and idempotence. The adapter never
accesses localStorage; full legacy localStorage graph recovery remains untested.
Replace this boundary with an explicit storage service in the modular stage.

## What the initial brief got wrong

The deployed branch is newer than `codex/v2.5-hotfix`. Much of the content already
has separate canonical files, and the assembler has an ordered module manifest.
It still embeds the complete corpus in the shipping page and wraps old globals.
The analytics branch is already merged; a `dkla-analytics` Neon project exists,
and `dkla.dev` routes its root to the private dashboard. Treat analytics as an
existing feature awaiting the owner's current policy decision, not a new feature
to enable. Vercel team billing/plan inspection was unavailable to this connection.

## Next stage

Start a fresh session from this note and the safety README. Extract the remaining
immutable HTML source into a reproducible source tree, retaining byte-exact
reassembly and existing globals first. Then introduce demand loading in small
feature groups, measuring cold/repeat load and testing offline cache behavior.
Do not combine that migration with an interface redesign or legal-text edits.

The page remains about 81.9 MB before compression; this stage makes no claim of
a faster initial download. One local cold-load sample reached load in 3.47s
before and 3.55s after; these noisy localhost samples are not network benchmarks.
The major payload work is still outstanding.

Source PDFs/inline texts are still public. Private storage, bounded page delivery,
rate limiting, a CSP, and fuller sync/security review remain future stages.
Do not delete content, rewrite Git history, change visibility, provision paid
services or collect additional visitor data without the owner's decision.
