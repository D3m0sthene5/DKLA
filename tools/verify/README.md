# Verification

`pnpm verify` builds the site and runs every check. On the owner's machine it
takes about half a minute.

| File | What it is |
|---|---|
| `tasks.mjs` | The list of steps and what each one waits for. Add checks here. |
| `run.mjs` | Runs the steps side by side, keeps each one's output, prints failures in full and reports what set the total time. Writes `work/verify-timing.json`. |
| `content.py` | No brief, opinion, PDF, dictionary record or dataset changed. |
| `data_guard.py` | Every data block in the built page is exactly the approved one. Code is not pinned. |
| `check_public.mjs` | `dist/` holds exactly the allowed files with the recorded bytes, and the server does not serve source. |
| `check_routes.mjs` | Every earlier version's address redirects to the current atlas. |
| `browser_smoke.cjs` | 29 interactions in a real browser at three screen sizes, plus saved work surviving export, import and reload. |
| `compare_geometry.py`, `geometry/` | The map layout matches the recorded one. |
| `views.spec.mjs`, `views.config.mjs`, `views/` | The main views, at a desktop and a phone size, look like their recorded pictures. See "Pictures of the main views" below. |
| `views.mjs` | Runs that comparison on its own (`pnpm views`) or records new pictures (`pnpm views:update`). |
| `compare-output.mjs` | Compares the public output of two builds file by file. |
| `break.mjs` | Breaks things on purpose to prove the pass still fails. |

## How it is fast without being weaker

- **Parallel.** Steps that do not read build output start at once, alongside
  the build. Steps that read `work/build` start when the atlas is assembled,
  and the browser steps when the public files are packaged.
- **One read of the source.** A dozen steps need the 30,000 files under `src/`
  joined together. The joined copy is cached in `work/cache`, named by a
  fingerprint of the files. The step "source reassembles" re-reads every file
  on every pass and fails if the cached copy differs, so the cache is never
  trusted on its own.
- **Threads for bulk reads.** Opening files one at a time on Windows is
  sometimes about thirty times slower than usual. Reading a few at a time is
  fast either way.
- **Packaging verifies in place.** Every file in `dist/` is read back and
  compared; only files that differ are rewritten, and anything extra is removed.
- **The authority link check** tests every citation pattern against every
  account, as before, but skips accounts that cannot match (they never mention
  the collection or the section number) and shares the work among processes.
  The result is identical to the original algorithm's.

- **It scales to the machine.** Heavy steps carry a weight (about how many
  processors they keep busy) and the runner keeps the running total within
  what the machine has. A 16-thread desktop runs everything at once; a
  four-processor CI runner runs the two browser steps one after the other.
  Without this, small machines starve steps that have time limits.

Nothing is skipped. There is no quick tier.

On GitHub, each failed step is also raised as an annotation with the end of its
output, so a failure can be read from the run's summary page.

## Pictures of the main views

Fifteen views (Home, a subject, a case, its full brief, Cold Call, the
dictionary, an authority, a doctrine timeline, a source page, search, two
SCOTUS History pages, two Study tabs, the More menu) are opened at 1440 x 900
and at 390 x 844 and compared with the pictures in `views/<system>/`. Each
view also has a check that needs no picture: the panel opened and holds the
expected words. The case view is where the reading layout
(`src/features/v25/reading.js`) is confirmed to have installed.

- A failure leaves the expected picture, the actual one and the difference in
  `work/views/`. Look at them before doing anything else.
- After an **intended** visual change, run `pnpm build` and then
  `pnpm views:update`, look at what changed with `git diff --stat` and by
  opening the new pictures, and commit them with the change.
- Pictures are only comparable on the system that made them, because letters
  are drawn differently on Windows and Linux. The recorded ones are from the
  owner's Windows machine. GitHub's Linux runner has none, so there the views
  are opened and checked but not compared, and the step's output says so. On
  Windows, missing pictures fail the pass.
- The save status in the corner changes with the clock; `views.css` hides it
  while a picture is taken.

## Proving it after you change it

```sh
pnpm verify:teeth     # about twelve minutes
```

This alters one thing at a time (a case record, a brief, a narrative, a dataset
entry, base and layer runtime code, the reading layout, two looks that only a
picture can catch, two layout positions, two saved-work paths,
a feature, the offline worker, an old address), runs the whole pass, and
requires it to fail every time. It restores each file and finishes with a clean
pass. Run it whenever you change what runs, the order, or anything cached.

For reliability, run the pass many times in a row. A step that fails once in
twenty identical runs is a broken check, not bad luck: find the race.

## What sets the time

The last line of every run names the longest chain. At present it is:
assemble the atlas (about 4 s), package (1 to 2 s), then the browser steps
(about 20 s). The browser steps load the 68 MB atlas fifteen times in separate
pages (three screen sizes, the saved-work test, nine Home window sizes and the
two sizes of the picture comparison);
that is processor-bound and scales with the number of cores.
