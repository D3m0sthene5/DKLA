# Current source and bounded editing

The current build does not read any historical HTML. `src/manifest.json` orders
markup fragments, 20 early classic JavaScript bodies, CSS, an encoded sprite,
and byte-preserving JSON container manifests. JSON leaves are exact original
UTF-8 slices: no parsing/serialization changes their legal text, escaping, order
or whitespace. Container manifests preserve the bytes between leaves.
`pnpm source --original` proves the initial tree recreates the approved
42,368,867-byte r18 artifact exactly. The historical file stays unchanged in Git.

## Ownership

| Task | Editable source | Main validation |
| --- | --- | --- |
| Early map/storage/study engine | src/runtime/appCode.js, studyCode.js and other named bodies | current release checker, saved-work and browser tests |
| Original node or edge | src/data/seedData/ record resolved by helper | exact source reconstruction, geometry/persistence checks |
| Book page/source extraction/dictionary term | src/data/bookArchive, civilArchive, lrsArchive, sourceTexts, dklaGlossary | source/content hashes; source comparison for deliberate edits |
| Canonical full case brief | tools/r19/data/briefs or audited, accuracy24 exact corrections | build_data and source/narrative fingerprint review |
| Converted case sections | tools/r19/data/sections.json, plain-sections.json and recorded patches | tools/r19/check.py |
| Authored Cold Call | tools/cold-call/narratives/<id>.json; three pilots in cases.json | validate, check_narratives, reader and browser checks |
| Timeline | tools/r19/data/timelines.json and timeline-audit.json | check_timeline_audit; recorded legal review scope |
| Authorities/geography/reading | existing tools/v25 JS/CSS/data and source ledgers | named checks and browser geometry |
| Later feature order | tools/v25/runtime-manifest.json | hashes/source ranges in work/build/integrity.json |
| Public files | tools/public-files.json | byte-verified copying into dist, route/API preview checks |

## Small queries

```sh
pnpm source --record seedData /nodes/@cp-gibbs --chars 4000
pnpm source --record bookArchive /353 --chars 4000
pnpm source --record dklaGlossary /terms/@consideration --chars 4000
python tools/atlas.py entry cp-gibbs --chars 12000
python tools/atlas.py authority usc-28-1367 --chars 12000
python tools/atlas.py page "#lrs=lrs-november-a:34" --chars 4000
python tools/atlas.py catalog november --limit 4
```

The source helper follows only relevant container manifests and reads one record.
Use /@ID for uniquely identified array records or a numeric JSON pointer. Repeated
inherited IDs/slugs stay in separate files; ambiguous ID selection fails and
requires a numeric pointer. Array filenames include their original index and ID.
An ID is navigation, not a new canonical legal claim.

The atlas helper explains effective brief/correction/narrative layers; reading
the original seed alone does not establish the current displayed case text.
LRS links use physical PDF pages and separately report printed labels. Inspect
the actual assigned PDF or opinion whenever OCR, attribution or pinpoint matters.

## Build boundaries and remaining coupling

`tools/source/` has explicit Python imports/exports for extraction and assembly.
`tools/runtime.mjs` supplies shared cross-platform process handling to build,
check, source and preview commands. Browser JS remains classic ordered scripts;
appCode (~62 KB) and studyCode (~106 KB) still share globals, poll readiness and
accept later wrappers. These files are addressable source, not yet independent
ES modules. Do not reorder or wrap them without a new regression-tested stage.
The saved-work adapter still normalizes exactly one known boot clone before the
legacy reader; replacing it with a storage service requires recovery fixtures.

Builds generate work/build HTML, worker, version, index and integrity metadata;
Vercel and local preview serve the allowlisted dist copy. Historical tracked
outputs remain byte-unchanged. No generated file is an editing source.
The optional standalone HTML is already produced, with its original export behavior.
Existing source PDFs/scans still accompany it for linked readings.

Demand loading is next: small shell, feature/course/book/dictionary boundaries,
cache only loaded content offline, preserve old caches during migration and make
portable export hydrate the full corpus deliberately. Future public source
protection must address historical HTML's embedded text as well as PDF URLs.
No current-load speed, private-source delivery, complete offline coverage or
fully modular runtime claim is made here. Historical architecture prose is
preserved verbatim in tools/history/ARCHITECTURE-through-stage1.md.

## Intended later edits

The manifest's origin hashes describe the untouched extraction, not a permanent
ban on editing. A deliberately reviewed leaf edit changes the dynamic source hash
and resulting build token; `pnpm build` and `pnpm check` still work. Stage 2's
`pnpm check:stage2` intentionally fails any such edit because its gate pins this
specific no-content-change stage. Do not update that golden gate automatically.
Establish the next reviewed stage's scope and evidence instead. Preserve the
original release artifacts and provenance hashes. Changes to a full brief also
require source comparison and a deliberate narrative fingerprint review.

Adding a case is larger than correcting one record: add the canonical brief,
converted sections and main-case narrative, map placement/relationships, relevant
source routes and geography review. Small seed record files do not eliminate
those coordinated invariants. Later compact data files are still in historical
aggregate JSON inputs; use the bounded atlas helper and defer their own exact
record extraction to a separate substage.
