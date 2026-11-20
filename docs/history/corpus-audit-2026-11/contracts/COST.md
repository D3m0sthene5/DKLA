# Worker cost and what each worker uniquely found (Classes 11–20)

Tokens are each worker's reported total. An applied correction is attributed to a worker when its old text appears in that
worker's file (`comparison.md` for the reader, `challenge.md` for the challenger). "Lead" means the correction was worded
from a finding the lead restated, or the text match failed. Teaching gaps and coverage tables, which readers produce, are
not counted as corrections; they supplied, for example, the Restatement § 201 home and most items in the open lists.

| Class | Design | Reader tokens | Challenger tokens | Applied | Reader only | Challenger only | Both | Lead |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 11 | reader + challenger | 243,030 | 264,375 | 28 | 0 | 18 | 9 | 1 |
| 12 | reader + challenger | 238,960 | 259,520 | 15 | 0 | 7 | 7 | 1 |
| 13 | reader + challenger | 248,524 | 262,501 | 22 | 0 | 17 | 4 | 1 |
| 14 | reader + challenger | 238,199 | 253,768 | 15 | 0 | 9 | 2 | 4 |
| 15 | reader + challenger | 255,828 | 265,724 | 11 | 0 | 3 | 7 | 1 |
| 16 | reader + challenger | 326,728 | 295,570 | 25 | 2 | 15 | 6 | 2 |
| 17 | one combined worker | 271,034 | — | 12 | 10 | — | — | 2 |
| 18 | reader + challenger | 272,500 | 265,039 | 21 | 1 | 11 | 7 | 2 |
| 19 | one combined worker | 265,486 | — | 19 | 14 | — | — | 5 |
| 20 | reader + challenger | 394,124 | 365,774 | 22 | 1 | 8 | 10 | 3 |
| **Total** | | **2,754,413** | **2,232,271** | **190** | | | | |

About 4.99 million worker tokens produced 190 applied corrections, roughly 26,000 tokens per correction. The lead's own
verification, editing and checks are not counted.

**What the split shows.** In the eight two-worker classes, challengers alone supplied 88 of the 159 applied corrections,
readers alone supplied 4, and 52 were found by both. The reader's distinct value is the source-first learning list and the
gap analysis. That is how missing teaching points surfaced: § 201, the oral-condition route, § 229's limit, the Nelson
measure. Duplicate detections of a defect were common (52), which is the cost of independence. The two combined workers
(Classes 17 and 19) found a comparable number per class at about half the tokens. Class 19's combined worker also found
the two largest routing errors of the wave (K-26 nodes b and e). For the easier classes, one combined worker is the better
buy. For dense doctrinal classes (13, 16, 18, 20), the separate challenger kept finding result-changing errors that the
reader's comparison missed, so independence earned its cost there.

## Classes 21–26 and 5–10

From this campaign each class also had a spec writer, who re-checked every finding against the source and wrote the edits, so the lead no longer drafted them. "Edits" counts every applied change, corrections and gap placements together. "Gaps" counts distinct teaching points the assignment teaches and no Atlas surface taught, as found and as closed (given a home). Attribution to reader or challenger was not recomputed for these batches.

| Class | Design | Reader or combined | Challenger | Spec writer | Edits | Gaps found / closed |
|---|---|---:|---:|---:|---:|---:|
| 21 | reader + challenger | 328,806 | 303,023 | 315,027 | 40 | 14 / 14 |
| 22 | combined | 297,199 | — | 255,882 | 38 | 13 / 13 |
| 23 | combined + fresh spot-check (250,469) | 284,773 | — | 281,218 | 31 | 22 / 19, plus 5 from the spot-check |
| 24 | reader + challenger | 308,778 | 315,216 | 315,482 | 36 | 19 / 17 |
| 25 | combined | 268,807 | — | 259,099 | 43 (+1 on K-32) | 16 / 16 |
| 26 | combined (spec by the lead) | 268,533 | — | — | 25 | 15 / 7 |
| 5 | reader + challenger | 310,573 | 285,370 | 349,623 | 75 | 19 / 19 |
| 6 | combined | 323,303 | — | 239,417 | 39 | 13 / 11 |
| 7 | reader + challenger | 330,705 | 332,008 | 289,103 | 62 | 12 / 12 |
| 8 | reader + challenger | 333,941 | 323,922 | 314,373 | 46 | 16 / 15 |
| 9 | combined | 344,154 | — | 241,403 | 29 | 9 / 7 |
| 10 | combined | 323,629 | — | 377,540 | 70 | 12 / 12 |

Other workers: the Consumer Contracts crosswalk (250,601).

Totals: about 4.30 million worker tokens for Classes 21–26 (214 edits; 99 gaps found, 86 closed, plus the spot-check's 5) and 4.72 million for Classes 5–10 (321 edits; 81 gaps found, 76 closed). That is roughly 20,000 and 15,000 tokens per applied edit, against 26,000 per correction for Classes 11–20, where gaps were not counted as edits.

**What these batches show.** The spec-writer stage cost about a quarter of each class's tokens and earned it in three ways: writers dropped or narrowed findings the source did not support (for example, Cosby's vote and remedy beyond supp. 128; a Bowen holding that the page image shows is only a question), they caught text that readers never see (a `plain.json` deletion), and they found the run-time chaining defect that would have silently discarded eleven corrections (fixed in `6b0e30fa`). Readers produced the gap counts; challengers and combined workers produced most result-changing errors. The one fresh spot-check of a combined class found a result-changing miss (the Peevyhouse takeaway) and five teaching points, which argues for one such check per combined batch rather than a second worker per class.
