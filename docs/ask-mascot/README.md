# Dottie Docket, the opossum behind Ask Dottie

A docket is the list of cases a court carries. Dottie carries hers on her back.

- **Artwork:** `src/features/ask/dottie.js`, inline SVG drawn in code (about
  15 KB compressed, the run's table of poses included; no image requests, works offline).
- **Sprite sheet:** `dottie-sprite-sheet.svg` / `.png` and one file per pose in
  `poses/`, all generated from the artwork above:
  `node tools/ask/dottie-sheet.mjs --png`. Regenerate after changing a pose.
- **The run** (the thinking spinner): three opossums run laps nose to tail inside a ring round
  her question-mark tail, anticlockwise like runners on a track, so the one at the bottom is
  upright and heading right. 96 px (80 px on a phone); a lap takes 5 s and 10 strides.
  - It is a rig, not drawn frames: each opossum is 18 small pictures (body, head, ear, three tail
    pieces, four legs of upper leg, lower leg and paw), each turning about its joint.
    `tools/ask/run-cycle.mjs` holds the rig, the artwork and the gait (a running trot: diagonal
    pairs, each foot down for 9 of 24 poses, a moment in the air in each half stride; body bob,
    squash and stretch, a steady head, the ear and tail following late), solves the legs and
    writes the table of 24 poses a stride into `dottie.js` (the block marked `run-cycle`).
    After changing the generator: `node tools/ask/run-cycle.mjs`, then the sheet below. Never
    edit the table by hand (`--check` and the browser check refuse it).
  - `dottie.js` gives the table to the browser's animation engine (Web Animations, transform
    only), so the compositor draws every frame at the screen's refresh rate and no script runs
    while she does. A planted paw stays on its spot on the screen: the ring turns one stride of
    angle in one stride of time.
  - She starts from a standstill (the first stride takes 750 ms), and when she is sent away a
    copy slows and fades for 300 ms. Hidden tab: paused. Dialog closed or spinner off the page:
    nothing running. Reduced motion: the three stand on all four paws and the spinner pulses.
  - Pictures of the real animation: `node tools/ask/run-film.mjs` (a 16-frame filmstrip at 8x,
    and the spinner at 1x, 2x and 4x). Check: `tools/ask/trot-browser.mjs` (add `--source` to
    run it on the source files without a build).
- **Running sheet:** `possum-trot.svg` / `.png`, one stride as a Muybridge plate (12 phases,
  42 ms apart, over a measured ground that is fixed to the track) with a footfall diagram, drawn
  by the same script from the spinner's own rig (`DKLADottie.run.frame`).
- **Where she appears** (`src/features/ask/ask.js`, `setDottie`): one place at a
  time, beside the line that describes the current state. Each state has a
  pool of poses and she picks one at random, never the same pose twice running.

| Interface state | Poses (random) | Where |
|---|---|---|
| Always | dangle: hanging by her tail from the top bar's bottom edge | under the "Ask Dottie" button (wide windows); alone near the right (narrow windows and phones), hidden while a reading panel or SCOTUS History is open |
| "Ask Dottie" in search results | face | the launcher row |
| Empty dialog | curious, bookmark (0 to 3 joeys), hanging, carrying | beside "Try a question" |
| Researching | the spinner: three opossums running laps round her question-mark tail (standing, with a slow pulse, under reduced motion) | the status line |
| Answer with sources | carrying or bookmark: one joey per cited source, up to three | rises from behind the Sources list once it is in view |
| No answer, offline, busy, allowance reached, unavailable, failed | possum (always) | the status line |
| Canceled, or an answer with no cited sources | absent | |

Follow-ups: after an answer the box becomes "Ask a follow-up"; the browser
sends up to three earlier turns with the next question (`history` in
`api/ask.js`), and earlier turns fold into "Earlier in this conversation".
Follow-ups are never stored on the server. "New question" starts over.

Saved answers (`src/features/ask/saved.js`, `saved.css`):

- **Save answer** under each answer (toggles to "✓ Saved") keeps the question
  and the answer as shown, with its numbered sources, in this browser only
  (`localStorage` key `dkla.askSaved.v1`). Not a cookie: cookies go to the
  server with every request and hold about 4 KB. One saved answer per
  question; saving a newer answer replaces the older one.
- **Saved answers (N)** beside the close button (hidden while there are none)
  lists them newest first, with a filter. Opening one shows it again with
  working citations and Dottie as for any answer; follow-ups continue from it.
  There is no limit on how many are kept; if the browser's storage is full,
  saving says so and nothing is dropped.
- A first question that matches a saved one (same normalised question, same
  open entry) is shown at once without asking the server: "From your saved
  answers · Ask again". Ask again requests a new answer (`fresh: true`) about
  the saved answer's own entry, not whatever entry is open now. A saved
  follow-up shows "follow-up to “...”" instead: asked again on its own it
  would lose its conversation, so it has no Ask again.
- **Shared answer library** (`lib/ask/library.js`): a first question asked
  before comes back from the server with `cached: true` and shows "Saved
  answer from <date> · Ask fresh"; Ask fresh sends `fresh: true`, which skips
  the library and replaces its entry. Only an exact match is served (same
  normalised question, same entry, same corpus and `ANSWER_VERSION`; see the
  comment at the top of `lib/ask/library.js`); time-sensitive questions are
  never kept; entries are used for 90 days and then deleted; a library
  answer never calls OpenAI, so it never spends AI credit.

Dottie behaves the same for saved and library answers as for a new one.

Pointing at a source (hover or keyboard focus) lifts the joey that stands for
it. She is decorative (`aria-hidden`); every state is still announced by the
status line. With reduced motion she appears in place without moving.

Checked by `tools/ask/browser.mjs` (step "Ask DKLA questions and source links"; the feature is still called Ask DKLA in code and file names)
and `tools/ask/trot-browser.mjs` (step "Ask Dottie trotting opossums": the run), with breakages
in `tools/verify/break.mjs` (search it for "Ask Dottie").
