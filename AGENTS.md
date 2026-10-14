# DKLA: instructions for coding agents

Read `README.md` first: it says what each folder is, how to build, and how to
check. This file adds the rules.

The owner is not a programmer and cannot review code. Safety rests on you:
do not make a change you cannot verify, and say plainly what you did not check.

## Rules

1. **The latest owner brief wins** over anything written here.
2. **Never alter or delete legal content**: briefs, opinions, PDFs, dictionary
   records and datasets (`added-sources/`, `src/data/`, `tools/r19/data/`,
   `tools/cold-call/narratives/`, the JSON datasets in `tools/v25/`,
   `tools/cold-call/` and `tools/sessions/`). A content edit needs a stated source and the owner's
   say-so. Passing checks is not legal accuracy.
3. **Saved work must survive.** Keep the storage keys
   `legal-atlas-v1:<graphId>:dkla-r8-rebuilt`, `dkla.study.v1`,
   `dkla.coldCall.v1`, the IndexedDB database `LegalAtlasPortable`, the
   export/import and sync formats, old version addresses (redirects in
   `vercel.json`) and old `#` routes.
4. **Only the owner publishes.** A push to
   `claude/atlas-design-content-audit-m1cw9x` deploys to dannykind.wiki and
   dkla.dev. Do not push it, deploy, or rewrite history unless the owner asks
   in that session. Work on a branch and commit in small steps.
5. **Hands off live data.** Never inspect visitor records, secrets, the
   production database or paid services. Ask the owner before any change to
   `api/` or `lib/` that alters what is stored or collected.
6. **Never commit build output**: `dist/`, `work/`, `test-results/`.
7. **Run `pnpm verify` before you call anything done**, and look at the
   result in a browser when the change is visual. Report what passed, what you
   did not run, and what you only inferred.

## Working with the files

Some files are enormous. `src/data/` holds about 30,000 JSON records and some
single lines are megabytes long. Search and read bounded slices; never print a
whole data file. To read one record:

```sh
pnpm source --record seedData /nodes/@cp-gibbs --chars 4000
python tools/atlas.py entry cp-gibbs --chars 12000
```

The app is not modular. `src/runtime/*.js` are classic scripts loaded in the
order given by `src/manifest.json`; later layers (listed in
`src/features/manifest.json`) replace earlier functions by reassigning
shared globals such as `draw`. Read how a function is wrapped before you
change it: the version that runs is the last one assigned, which may be
several layers after the one you are reading.

## Data is pinned; code is free

Until October 2026 every byte of code was frozen and features had to be added
as new layers on top. That is over. The rule now:

- **Code and styles may be edited in place**, anywhere: `src/runtime/`,
  `src/styles/`, the feature folders under `src/features/`. Fix a function where it
  is defined instead of wrapping it in another layer.
- **Nothing proves a code change is safe except what it does.** No guard
  compares code bytes any more. A change is only as safe as the checks that
  exercise it, so: run `pnpm verify`, look at the result in a browser, and if
  the thing you changed is not covered by a browser check, add one (and a
  breakage for it in `tools/verify/break.mjs`) in the same change.
- **A visual change needs new pictures.** `tools/verify/views.spec.mjs` compares
  the main views with recorded pictures. If you meant to change how a view
  looks, check the differences in `work/views/`, run `pnpm views:update` and
  commit the new pictures with the change. Never re-record to make an
  unexplained difference go away.
- **Look before you remove, and edit structure, not text.** `pnpm coverage`
  records which functions run in the browser checks; `pnpm lint:survey` lists
  reassigned, unused and undefined names. Never-ran is a reason to look
  closer, not proof. Make removals and renames with ast-grep (see
  `tools/codemods/`), not find-and-replace.
- **Data stays pinned twice.** `tools/verify/content.py` pins every content
  file. `tools/verify/data_guard.py` pins every data block in the built page.
  After a reviewed, intended content change, run both with `--update`
  (`data_guard.py` after `pnpm build`) and commit the two record files.
- **A correction to the graph is a run-time edit, not an edit to `src/data`.**
  A visitor who has opened the atlas before has a saved copy of the whole
  graph in the browser, and that copy opens instead of the seed, so a change
  made only to `src/data/seedData` never reaches them (and it would break the
  hash check described next). Corrections are lists of edits applied over
  whichever graph is open, only where a field still holds its old value:
  `src/features/r19/audit.js` (the October 2026 audit) and
  `src/features/sessions/civil-syllabus.js` (the October 1 Civil Procedure
  syllabus, weeks 6 to 9). Follow that pattern.
- Records that name the original page by its hash (the map geography's audit,
  the analytics check) use `origin_identity()` in `tools/source/tree.py`,
  which confirms the source data is still that page's data.

Adding a file to the website means adding its path to
`tools/public-files.json`. Renaming the app file for a new version means adding
a redirect for the old name in `vercel.json`.

## Adding or changing a check

Every step of `pnpm verify` is one line in `tools/verify/tasks.mjs`, with the
steps it must wait for. Steps run in parallel, so:

- Give a new step a unique name (the runner refuses duplicates) and say what
  it needs. If it reads `work/build` it needs the assembled atlas; if it reads
  `dist/` it needs packaging; if it needs a web server, use `{url}` or
  `{page}` and wait for the preview server. If unsure, wait for packaging.
- A step must not write into the repository or depend on another step's
  scratch files. Two steps must never write the same file.
- Scripts that read thousands of files should read them through a thread pool
  (see `tools/source/tree.py`). Opening files one at a time on Windows is
  sometimes thirty times slower.
- Browser steps: the map redraws itself several times a second, replacing its
  elements. Never read a position once and assume the element is still there;
  use `boxOf` and `pressUntil` in `tools/verify/browser_smoke.cjs`.
- A speed-up must not make a check weaker. Prove it the way
  `tools/verify/README.md` describes: break something on purpose and see the
  pass fail.

## The Home map

The map's layout is fixed and checked: course positions, the two lower blocks
at equal height, every tile named, nothing clipped at nine window sizes
(`tools/v25/home-fit.spec.mjs`, `tools/verify/geometry/`). The 70 pixels below
the map are kept clear for the zoom controls, the save status and the
first-visit note. `tools/v26/TYPOGRAPHY.md` records the owner's decisions on
fonts and on the SCOTUS building.

## This machine (the owner's Windows PC)

Nothing is on PATH. Node 24 and pnpm are in `%LOCALAPPDATA%\dkla-tools\node`;
Python 3.12 is at `%LOCALAPPDATA%\Programs\Python\Python312\python.exe` (set
`DKLA_PYTHON` to it); git is inside the GitHub Desktop installation. Git here
has no stored GitHub login, so the owner pushes with GitHub Desktop.

## History

`docs/history/` holds earlier agents' instructions, handoffs and audits. They
describe how the project got here and are not current instructions. Files
removed in the October 2026 cleanup are in git history under the tag
`pre-cleanup-2026-10-13`.
