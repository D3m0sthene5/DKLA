# DKLA: current agent instructions

Start with `tools/v26/HANDOFF.md`, then `tools/stage2/HANDOFF.md` and `tools/v25/ARCHITECTURE.md`.
The latest owner brief takes precedence. Work in bounded stages and branches;
only the owner promotes production. Preview analytics must stay disabled.
One explicit owner-authorized exception applies to the reviewed v2.6 release:
the dictionary, ice, typography/version, full-brief demand loading, reviewed
cookie-only analytics, and tested source/build/preservation
changes may be published to dannykind.wiki and dkla.dev. Build again in the
production environment; do not promote the collector-disabled preview artifact.
Future rebuild stages remain preview-only without further owner authorization.
Never inspect visitor records, secrets, production storage, or paid services.

## Source and commands

Use Node, pnpm and Python 3.10+. On Windows set DKLA_PYTHON if Python is not
on PATH. `pnpm build` creates `work/build/` and byte-verified `dist/`;
`pnpm check` checks that build; `pnpm preview` builds and serves dist on
127.0.0.1:8766. `pnpm preview --no-build` serves an existing build.
Run `pnpm install --frozen-lockfile` first on a new checkout.

`src/manifest.json` orders exact markup, early JS/CSS, and JSON records. It
replaces the historical HTML as editable input. `src/runtime/` still executes
as ordered classic scripts with shared globals. Extraction is not a completed
ES-module migration. Later feature inputs remain in tools/r19, tools/v25 and
tools/cold-call; `tools/v25/runtime-manifest.json` is their ordered list.
Never edit or newly commit generated HTML, worker, version, integrity or catalog
outputs. Historical tracked artifacts stay unchanged; they are not build inputs.
`tools/public-files.json` explicitly defines public output. Source code, tools,
local evidence and work/ are excluded. Existing PDFs and embedded historical
HTML are still public until the separately reviewed protection stage.

Find a single seed case with
`pnpm source --record seedData /nodes/@cp-gibbs --chars 4000`.
Array numeric JSON pointers also work; repeated IDs remain separate records.
`python tools/atlas.py entry cp-gibbs --chars 12000` explains later canonical
brief/correction/narrative ownership. Use bounded searches, not full HTML/JSON
prints. Each record is an exact raw JSON slice; preserve escaping and legal text.
Do not run historical release assemblers as the current build.

## Preservation requirements

Preserve every PDF, brief, opinion, dictionary record, dataset and source byte.
Do not delete, re-encode, deduplicate or regenerate legal content as a side effect.
A content edit needs its stated source/evidence and deliberate review; structural
checks are not legal certification. All 392 main cases need authored Cold Call
narratives; supporting narratives are optional and completed ones stay intact.

Keep the original v2.5 native map geometry, colored course clusters, lower
precincts, zoom and labels. The approved authorities-header dictionary spine, bounded downward Cold Call
frost/vapor polish, and v2.6 typography/SCOTUS internal readability refresh differ
from the frozen baseline.
No redesign. Curated placement stays locked while the camera pans and zooms.
A case has one unlabeled plain-English introduction; timelines are visible with
one synthesis. Cold Call opens its authored narrative without practice controls.

Retain localStorage keys `legal-atlas-v1:<graphId>:dkla-r8-rebuilt`,
`dkla.study.v1` and `dkla.coldCall.v1`; IndexedDB `LegalAtlasPortable`;
existing graph/import/export formats, sync shapes and all old hash routes.
Keep recovery code. The one-read saved-work adapter is a temporary boundary,
not an explicit storage service; see tools/v25/saved-work.js and its tests.

## Stage gate

Run the source identity check, release checks, v2.6 content guard, the full-brief
lifecycle check, and all 29 browser smoke checks plus geometry comparisons at
all three viewports.
Use synthetic disposable browser storage; block external requests and APIs.
Extend coverage for changed behavior. Obtain a fresh independent review before
publishing each stage preview. Handoff notes must distinguish proved checks from
untested offline, sync, legacy recovery and legal/source accuracy claims.

Full earlier instructions are preserved verbatim in
`tools/history/AGENTS-through-stage1.md`; they are history, not the current brief.
