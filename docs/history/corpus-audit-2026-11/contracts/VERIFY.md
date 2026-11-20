# Verification of the Contracts corrections branch

Branch `audit/contracts-opus-2026-11-19`. Run in the Opus audit workspace with Node 24, Python 3.13 and
Playwright's Chromium build 1243 standing in for the expected 1248, which the workspace could not download.

| Tip | What it contains | `pnpm verify` |
|---|---|---|
| `c3191d28` (base) | nothing changed | 76 of 76 passed |
| `e282ac9b` | OP-CT-11 and OP-CT-12 corrections | 72 of 76: the four review records below failed, as designed, because the text they pinned had changed |
| `05fa132a` | the four records re-pinned | 76 of 76 passed |
| `4f5c9c47` | OP-CT-13 corrections and their re-pinned records | 76 of 76 passed |
| `96ebee23` | OP-CT-14 corrections and their re-pinned records | 76 of 76 passed |
| `b767c567` | OP-CT-15 corrections | 74 of 76: `generated rule connections` (its ledger pins the Nanakuli rule line) and `search shows where it matched` (desktop only: a null element while the map redrew; the phone half passed) |
| `900b8ca5` | that ledger re-pinned | 76 of 76 passed, including the search check, which needed no change |
| `a3d17e4c` | cross-class fixes (`ab4819b8`) and OP-CT-16 to OP-CT-20 | 76 of 76 passed |

The records pin hashes of text that earlier passes reviewed: `tools/v25/timeline-audit.json`
(the timeline file and the compared rule lines of five steps), `tools/v25/explanation-audit.json`
(takeaways and rule lines of Watkins, Austin, Swinton, Speakers of Sport and Vokes),
`tools/cold-call/main-audit.json` (the Alaska Packers, Austin and Watkins narratives) and
`tools/v25/generated-rule-connections-review.json` (canonical case comparisons; from OP-CT-15) and
`tools/v25/geography.json` (rebuilt; only source and summary hashes changed, with no placement moved).
Each re-pinned record carries a `rereviews` note naming the 19 November register.
The regenerated `tools/v25/explanation-inventory.json` came from its own `--write`.

Visual pictures (`views.spec.mjs`) were unchanged; no picture was re-recorded. The text changes were not
inspected by eye in a browser, but the browser checks that open Cold Call, flowcharts, timelines and
case pages passed.

## Classes 21–26 and 5–10 (20 November 2026)

- `80cdf52b` (Batch 1 tip): `pnpm verify` 76 of 76.
- `d7c65eab` (Batch 2 tip): 74 of 76. "Practice filter records" failed because five problem entries corrected in Classes 7–9 changed their reviewed fingerprints; "v3.1 case page" failed because it expected K-16 to have 13 steps, and Class 8 added a fourteenth. Both fixed in `a4172843`.
- `a12b422c` (final tip, after the cross-chart edits `4970bbea` and the records): `pnpm verify` 76 of 76, all checks passed.
- Before each class commit: the correction-register integrity check, `runtime_edits_check.py` (no edit from this campaign is skipped in the browser; 8 older ones are, see CROSS-CLASS item 12), the flowchart data check, the timeline, geography, Cold Call, explanation-inventory, practice-filter, authorities and generated-rule-connection checks, and the content and data-block pins.

Not verified: the deployed site (nothing was deployed; the deploy branch was not touched); text changes read by eye in a browser; statements that rest on full opinions outside the assigned excerpts.
