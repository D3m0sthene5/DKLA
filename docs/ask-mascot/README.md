# Dottie Docket, the opossum behind Ask Dottie

A docket is the list of cases a court carries. Dottie carries hers on her back.

- **Artwork:** `src/features/ask/dottie.js`, inline SVG drawn in code (about
  10 KB before compression, no image requests, works offline).
- **Sprite sheet:** `dottie-sprite-sheet.svg` / `.png` and one file per pose in
  `poses/`, all generated from the artwork above:
  `node tools/ask/dottie-sheet.mjs --png`. Regenerate after changing a pose.
- **Where she appears** (`src/features/ask/ask.js`, `setDottie`): one place at a
  time, beside the line that describes the current state.

| Interface state | Pose | Where |
|---|---|---|
| "Ask Dottie" in Atlas search | face | the launcher row |
| Empty dialog | curious, tail curled into a "?" | beside "Try a question" |
| Researching | concentrating, magnifier over a book | the status line |
| Answer with sources | carrying the docket: one joey per cited source, up to three | rises from behind the Sources list once it is in view |
| Sources did not establish an answer | quiet, tail fallen flat, empty folder | the status line |
| Offline, busy, allowance reached, unavailable, failed | playing possum | the status line |
| Canceled, or an answer with no cited sources | absent | |

Pointing at a source (hover or keyboard focus) lifts the joey that stands for
it. She is decorative (`aria-hidden`); every state is still announced by the
status line. With reduced motion she appears in place without moving.

Checked by `tools/ask/browser.mjs` (step "Ask DKLA questions and source links"; the feature is still called Ask DKLA in code and file names)
and breakage 1 in `tools/verify/break.mjs`.
