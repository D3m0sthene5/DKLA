# Dottie Docket, the opossum behind Ask Dottie

A docket is the list of cases a court carries. Dottie carries hers on her back.

- **Artwork:** `src/features/ask/dottie.js`, inline SVG drawn in code (about
  10 KB before compression, no image requests, works offline).
- **Sprite sheet:** `dottie-sprite-sheet.svg` / `.png` and one file per pose in
  `poses/`, all generated from the artwork above:
  `node tools/ask/dottie-sheet.mjs --png`. Regenerate after changing a pose.
- **Where she appears** (`src/features/ask/ask.js`, `setDottie`): one place at a
  time, beside the line that describes the current state. Each state has a
  pool of poses and she picks one at random, never the same pose twice running.

| Interface state | Poses (random) | Where |
|---|---|---|
| Always | dangle: hanging by her tail from the top bar's bottom edge | under the "Ask Dottie" button (wide windows); alone near the right (narrow windows and phones), hidden while a reading panel or SCOTUS History is open |
| "Ask Dottie" in search results | face | the launcher row |
| Empty dialog | curious, bookmark (0 to 3 joeys), hanging, carrying | beside "Try a question" |
| Researching | reading, rummaging, fetching; a new one every 4.5 s (not with reduced motion) | the status line |
| Answer with sources | carrying or bookmark: one joey per cited source, up to three | rises from behind the Sources list once it is in view |
| No answer, offline, busy, allowance reached, unavailable, failed | possum (always) | the status line |
| Canceled, or an answer with no cited sources | absent | |

Follow-ups: after an answer the box becomes "Ask a follow-up"; the browser
sends up to three earlier turns with the next question (`history` in
`api/ask.js`), and earlier turns fold into "Earlier in this conversation".
Nothing is stored on the server. "New question" starts over.

Pointing at a source (hover or keyboard focus) lifts the joey that stands for
it. She is decorative (`aria-hidden`); every state is still announced by the
status line. With reduced motion she appears in place without moving.

Checked by `tools/ask/browser.mjs` (step "Ask DKLA questions and source links"; the feature is still called Ask DKLA in code and file names)
and breakage 1 in `tools/verify/break.mjs`.
