# Opus Stage 11 finite-endpoint / continuity status delta

Legal cutoff: October 14, 2026 (America/New_York). Codebook 2.0.0, unchanged. Built 2026-10-17.

The owner stopped new research on 2026-10-17 to limit token use. This package holds every reviewed result up to that point.

- Every review that was running finished and is included.
- Eight producer batches were stopped before they had written any status proposal. Their downloads stay in the evidence folder but count for nothing.
- The 414 IDs that the stopped batches and the never-packeted part of the executed lane would have covered are in `UNPROCESSED_WORKLIST.jsonl`.

## Result

| | YES | NO | UNKNOWN | Determinate | Coverage |
|---|---:|---:|---:|---:|---:|
| Prior (Stage 11 provisional ledger, sha256 c0308e00...) | 193 | 2,322 | 12,458 | 2,515 | 16.796901% |
| Stage 11 accepted | **+116** | **+481** | -597 | +597 | |
| After Stage 11 | 309 | 2,803 | 11,861 | 3,112 | **20.784078%** |

- `prior_accepted_substantive_determinate = 2,515`
- `added_ACCEPTED_YES = 116`
- `added_ACCEPTED_NO = 481`
- `substantive_UNKNOWN_remaining = 12,458 - 597 = 11,861`
- `coverage_pct = (2,515 + 597) / 14,973 * 100 = 20.784078%`
- Any-effect axis after Stage 11: 321 YES, 2,639 NO, 12,013 UNKNOWN (19.768917%).

The Stage 9 v2 results and Astra's Stage 10 results are prior work, not Stage 11 throughput. They were excluded from Stage 11 packets.

Checks:
- No earlier accepted status was overturned.
- Only the 597 accepted rows changed in `RECONCILED_STATUS_LEDGER_STAGE11_OPUS_PATCHED.jsonl`. Every other row is byte-identical to the input ledger. The builder checks this, and the patched ledger's sha256 is in `ACCOUNTING.json`.
- The historical census is not proved complete.
- Historical cause and first-cessation fields stay UNKNOWN.

## By lane

| Lane | Researched | Reviewed | Texts complete | Accepted YES | Accepted NO | Subagent tokens | Accepted per 100k tokens |
|---|---:|---:|---:|---:|---:|---:|---:|
| A closed institution / named ending | 27 | 27 | 27 | 0 | 21 | 641,602 | 3.27 |
| B executed and obsolete (stopped early: lowest yield) | 52 | 52 | 40 | 0 | 24 | 1,244,824 | 1.93 |
| C temporary (own end date or report) | 171 | 171 | 167 | 0 | 155 | 2,764,289 | 5.61 |
| D authority repealed | 126 | 126 | 124 | 2 | 115 | 2,585,091 | 4.53 |
| E possible continuity (NARA 1989 codification) | 210 | 210 | 204 | 107 | 47 | 3,968,853 | 3.88 |
| F NRA P3 recovered 16 | 16 | 16 | 16 | 0 | 16 | 754,271 | 2.12 |
| G later ending event (land orders, supersessions) | 145 | 145 | 121 | 7 | 103 | 2,946,874 | 3.73 |
| **Total** | **747** | **747** | **699** | **116** | **481** | **14,905,804** | **4.01** |

Token figures are the subagent tokens the harness reported for completed agents. They leave out the coordinator's own tokens, which are not exposed, and the eight stopped producers, which reported no usage. Per-agent lines, agent-minutes and review error rates are in `TELEMETRY.json`.

## What the review found

- **Continuity (lane E).**
  - 107 orders listed as in force in 1989 are confirmed still operating on 2026-10-14. Each rests on current text: eCFR as of the cutoff, the current U.S. Code, or a 2024-2026 Federal Register document.
  - Reviewers moved about one YES in five to held. The common reason was a standing delegation with no recent evidence that anyone still acts under it.
- **EO 11887, 12021, 11839.** An OPM rule (FR Doc 2026-16630, 91 FR 52475, issued under EO 14410) removed the text these orders had put in 5 CFR 6.8, effective 2026-10-13, one day before the cutoff. The reviewer confirmed the rule, the order and the eCFR change.
- **Land (lane G).** Refuge and withdrawal orders whose land status still rests on the order are YES under CR-9. Examples: EO 7509 (Charles M. Russell), 7655, 7724, 7993, 8065, 8854.
- **Reviewer outcomes.** Reviewers re-fetched every order proposed NO and every YES bridge themselves. Statuses changed for roughly 5-15% of records per batch. Every change made a status stricter except three, where the reviewer reached a different status (`reject_other`): EO 11404, EO 12197 and row:7. Under the per-axis rule those stay held.

## Held (474)

`STAGE11_HELD_QUEUE.jsonl` names each blocker and the source that would settle it. Questions for the next stage:
- Whether a dormant standing authority with a live statute can be YES. Affected: EO 12166, 12116, 11918, 11874, 11893 and the six 1974-79 delegations.
- CR-10: EO 8278 and the 1975 PLO 5550.
- The FAM pages that could not be obtained: EO 12142, 12068, 12027, 11967.
- The three `reject_other` cases above.

## Coordinator rulings

`rules/COORDINATOR_RULINGS.md` holds CR-1 to CR-10. Overrides may only make an axis stricter. CR-10 (land described "by reference to" a revoked order) is guidance and is not applied here.

## Method and limits

- Each status is one AI agent's proposal checked by a separate AI agent with its own context. The reviewer agent re-downloaded the sources. Neither is a human reviewer.
- Quotes are exact substrings of stored text extractions. Originals carry a sha256 and a real retrieval time.
- The standing rule on blocked sources was followed: every attempt is logged in each shard's report.
- Still unreachable:
  - the Wayback Machine (connections dropped);
  - HathiTrust and Google Books (CAPTCHA; not bypassed);
  - NARA disposition tables for 1979, 1989 and 1993 (404);
  - the State Department FAM site.
- Identity conflicts are in `CONFLICT_LOG.jsonl` and were never corrected in the ledger.

## Files

- `ACCOUNTING.json`
- `STAGE11_STATUS_RECORDS.jsonl`
- `STAGE11_ACCEPTED.jsonl`
- `STAGE11_NEW_YES.jsonl`
- `PENDING_CLAUDE_NEW_NO_STAGE11.jsonl`: the 481 new NO, for Claude.
- `STAGE11_HELD_QUEUE.jsonl`
- `UNPROCESSED_WORKLIST.jsonl`
- `RECONCILED_STATUS_LEDGER_STAGE11_OPUS_PATCHED.jsonl`
- `TELEMETRY.json`
- `CONFLICT_LOG.jsonl`
- `rules/`
- `packets/`
- `evidence/`: shard and review records, text extractions and metadata.
- `code/`
- `MANIFEST.json`

PDFs and images are in the companion `OPUS_STAGE11_EVIDENCE_ORIGINALS.zip`.
