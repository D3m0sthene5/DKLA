# Verification

`pnpm verify` builds the site and runs every check. On the owner's machine it
takes about half a minute.

| File | What it is |
|---|---|
| `tasks.mjs` | The list of steps and what each one waits for. Add checks here. |
| `run.mjs` | Runs the steps side by side, keeps each one's output, prints failures in full and reports what set the total time. Writes `work/verify-timing.json`. |
| `content.py` | No brief, opinion, PDF, dictionary record or dataset changed. |
| `release_guard.py` | The built atlas still carries the original data and code. |
| `check_public.mjs` | `dist/` holds exactly the allowed files with the recorded bytes, and the server does not serve source. |
| `check_routes.mjs` | Every earlier version's address redirects to the current atlas. |
| `browser_smoke.cjs` | 29 interactions in a real browser at three screen sizes, plus saved work surviving export, import and reload. |
| `compare_geometry.py`, `geometry/` | The map layout matches the recorded one. |
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

## Proving it after you change it

```sh
pnpm verify:teeth     # about eight minutes
```

This alters one thing at a time (a case record, a brief, a narrative, a dataset
entry, base and layer runtime code, two layout positions, two saved-work paths,
a feature, the offline worker, an old address), runs the whole pass, and
requires it to fail every time. It restores each file and finishes with a clean
pass. Run it whenever you change what runs, the order, or anything cached.

For reliability, run the pass many times in a row. A step that fails once in
twenty identical runs is a broken check, not bad luck: find the race.

## What sets the time

The last line of every run names the longest chain. At present it is:
assemble the atlas (about 4 s), package (1 to 2 s), then the browser steps
(about 20 s). The browser steps load the 68 MB atlas thirteen times in separate
pages (three screen sizes, the saved-work test, and nine Home window sizes);
that is processor-bound and scales with the number of cores.
