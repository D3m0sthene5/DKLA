# Danny Kind Legal Atlas (DKLA)

A law-study web app: three first-year courses (Contracts, Civil Procedure,
Legislation and the Regulatory State) as one zoomable map, with a brief for
every case, the source readings, a legal dictionary, Cold Call narratives,
study drills and Supreme Court history. It works offline after the first load.

Live at dannykind.wiki. The private analytics dashboard is at dkla.dev.

## What is in this repository

| Path | What it is |
|---|---|
| `src/` | **Source of the base app.** The original atlas split into editable parts: `runtime/` (JavaScript), `styles/`, `markup/`, and `data/` (about 30,000 small JSON records: the map, the archives, the dictionary, SCOTUS records). `src/manifest.json` lists the parts in order. |
| `tools/r19/` | **Source.** Briefs and their data (`data/`), the assembler that builds the app (`assemble.py`), and feature code for briefs, timelines and takeaways. |
| `tools/cold-call/` | **Source.** Cold Call narratives (`narratives/`), the reader and the frosted button. |
| `tools/v25/` | **Source.** Rules and authorities, the map geography, the reading panel, the Home layout, and their datasets. |
| `tools/v26/` | **Source.** Typography, the embedded font, and the SCOTUS building drawn on the map (`typography.js`). |
| `tools/performance/`, `tools/sync/`, `tools/analytics/` | **Source.** Loading briefs on demand, ratings sync, and the visitor analytics client. |
| `tools/r12/` | Three course layout designs still read by the geography check. |
| `tools/verify/` | **Checks.** See "How to know it still works". |
| `tools/*.mjs`, `tools/source/` | The build, the local preview server, and tools for reading single records out of `src/data`. |
| `api/`, `lib/` | **Server.** Three Vercel functions (analytics, the admin dashboard, ratings sync) and their library. |
| `assets/admin/` | The private dashboard's page, script and styles. |
| `added-sources/` | **Content.** The assigned readings, opinions, briefs and dictionary source (660 MB of PDFs and text). Published as-is. |
| `DKLA-sources/` | Manifest of the scanned casebook pages (the images themselves are not in the repository). |
| `how-to-use.html`, `guide/`, `privacy.html`, `restore-page-images.html`, `icons/`, `manifest.webmanifest` | Small published pages and assets, served as they are. |
| `tools/public-files.json` | The exact list of files that get published. Nothing else leaves the repository. |
| `vercel.json` | Hosting: the build command, redirects from every old version's address to the current one, and cache rules. |
| `docs/history/` | Old handoffs and audit notes from earlier agent sessions. History, not instructions. |
| `archive/` | The retired pipeline that first built the SCOTUS data, and one old verification record. Not used by the build. |
| `dist/`, `work/`, `test-results/`, `node_modules/` | **Output and scratch.** Created by the build and the checks. Never committed. |

The shipped code lives partly under `tools/` for historical reasons: later
features were added as layers on top of the base app, each in the folder of the
revision that introduced it. `tools/v25/runtime-manifest.json` is the ordered
list of those layers.

## How to build it

You need Node 24, pnpm 11 and Python 3.10 or newer. On Windows, if Python is
not on PATH, set `DKLA_PYTHON` to its `python.exe`.

```sh
pnpm install --frozen-lockfile
pnpm build       # writes work/build/ and the public dist/
pnpm preview     # builds, then serves dist/ at http://127.0.0.1:8766/
```

`work/build/DKLA-v2.6.html` is a complete single-file copy of the atlas.
`dist/` is exactly what the website serves: the same page with the full
briefs split out so they load when opened.

Pushing to the branch `claude/atlas-design-content-audit-m1cw9x` makes Vercel
run the same build and publish it to both domains. Nothing else deploys.

## How to know it still works

```sh
pnpm verify      # builds and runs everything below; about half a minute
```

The steps run side by side as soon as what each one needs is ready. The list,
with what every step waits for, is `tools/verify/tasks.mjs`. A failed step
prints its full output at the end, and the last line names the chain of steps
that set the total time. `node tools/verify/run.mjs --serial` runs the same
steps one at a time.

1. **Content.** `tools/verify/content.py` confirms that no brief, opinion,
   PDF, dictionary record or dataset was added, removed or altered.
2. **Data in the built page.** `tools/verify/data_guard.py` confirms every
   data block in the built atlas is exactly the approved one. Code is not
   pinned: it is free to change and is judged by the checks below.
3. **Features and data.** `pnpm check`, the analytics tests and the dataset
   checks under `tools/v25/` and `tools/cold-call/`.
4. **Old addresses.** `tools/verify/check_routes.mjs` confirms every earlier
   version's address still redirects to the current atlas.
5. **A real browser.** `pnpm smoke` drives the built site at desktop, landscape
   phone and portrait phone sizes: opening a subject, a case and its Cold
   Call, old links, the dictionary, authorities, SCOTUS History, Study,
   export and restore, and a saved note surviving a reload. It also checks
   that the map layout has not moved, that Home fits nine window sizes, and
   that fifteen main views still look like their recorded pictures
   (`pnpm views`; see `tools/verify/README.md`).

To see exactly what a change would alter for a visitor, keep a copy of
`work/public-manifest.json` from before, rebuild, and run
`node tools/verify/compare-output.mjs before.json`. A change meant to alter
nothing must report "identical".

None of this touches the live site, the database or visitor data.

Two things keep it fast, and neither is taken on trust. The source under
`src/` is 30,000 files that a dozen steps need joined together, so the joined
copy is kept in `work/cache`; every pass re-reads all the files and fails if
the copy differs. Packaging leaves a file in `dist/` alone when it already has
the right bytes, but still reads every file back and compares it. Deleting
`work/` and `dist/` is always safe; the next pass rebuilds them (a few seconds
slower).

## Things that must not break

- Saved work. The browser storage keys `legal-atlas-v1:<graphId>:dkla-r8-rebuilt`,
  `dkla.study.v1` and `dkla.coldCall.v1`, and the IndexedDB database
  `LegalAtlasPortable`.
- The export, import and sync formats.
- Old links: every earlier version's address redirects to the current atlas,
  and old `#` routes still open the right entry.
- Offline use.
- The legal content: briefs, opinions, PDFs, dictionary records and datasets.

## Recovering anything that was removed

The October 2026 cleanup removed nine old committed builds, the patch scripts
of revisions 9 to 14 and other leftovers. They remain in git history; the tag
`pre-cleanup-2026-10-13` marks the last commit that had them all.
