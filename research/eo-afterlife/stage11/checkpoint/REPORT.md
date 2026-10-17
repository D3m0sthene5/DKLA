# Opus Stage 11 finite-endpoint / continuity delta: interim checkpoint 2

Legal cutoff: October 14, 2026 (America/New_York). Codebook 2.0.0, unchanged. Built 2026-10-17.

**This is a progress checkpoint, not the final Stage 11 delivery.** It counts only orders where a producer agent and a separate reviewer agent reached the same status. Ten agents were still running when it was built. Their partial work is in the evidence folder but counts toward nothing.

## Result

| | YES | NO | UNKNOWN | Determinate | Coverage |
|---|---:|---:|---:|---:|---:|
| Prior (Stage 11 provisional ledger, sha256 c0308e00...) | 193 | 2,322 | 12,458 | 2,515 | 16.796901% |
| Stage 11 accepted so far | **+75** | **+465** | -540 | +540 | |
| After this checkpoint | 268 | 2,787 | 11,918 | 3,055 | **20.403393%** |

- `prior_accepted_substantive_determinate = 2,515`
- `added_ACCEPTED_YES = 75`
- `added_ACCEPTED_NO = 465`
- `substantive_UNKNOWN_remaining = 12,458 - 540 = 11,918`
- `coverage_pct = (2,515 + 540) / 14,973 * 100 = 20.403393%`
- Any-effect axis after this checkpoint: 280 YES, 2,623 NO, 12,070 UNKNOWN (19.388232%).

Checks:
- No earlier accepted status was overturned.
- Only the 540 accepted rows changed in the patched ledger. Every other row is byte-identical to the input ledger.
- The patched ledger's sha256 is in `ACCOUNTING.json`.
- The historical census is not proved complete.
- Historical cause fields stay UNKNOWN.

## By lane (reviewed work only)

| Lane | Researched | Reviewed | Texts complete | Accepted YES | Accepted NO | Subagent tokens | Accepted per 100k tokens |
|---|---:|---:|---:|---:|---:|---:|---:|
| A closed institution / named ending | 27 | 27 | 27 | 0 | 21 | 641,602 | 3.27 |
| B executed and obsolete (stopped: low yield) | 52 | 52 | 40 | 0 | 24 | 1,244,824 | 1.93 |
| C temporary (own end date or report) | 171 | 171 | 167 | 0 | 155 | 2,764,289 | 5.61 |
| D authority repealed | 126 | 126 | 124 | 2 | 115 | 2,585,091 | 4.53 |
| E possible continuity (1989 codification still in force) | 210 | 130 | 204 | 66 | 31 | 3,321,472 | 2.92 |
| F NRA P3 recovered 16 | 16 | 16 | 16 | 0 | 16 | 754,271 | 2.12 |
| G later ending event (land orders, supersessions) | 145 | 145 | 121 | 7 | 103 | 2,946,874 | 3.73 |

The token figures are subagent tokens as the harness reported them. The coordinator's own tokens are not exposed. `TELEMETRY.json` has every agent's log line, plus agent-minutes and review error rates.

## Still in progress at build time (not counted)

- Two continuity batches (E X4, E X5; 80 orders, 1974-79) are produced and under review. Their producers propose 53 YES, 16 NO and 11 held.
- Producers still running:
  - continuity E X6-X11: 234 orders, 1933-1973;
  - land and other events G X4-X5: 89 orders, 1937-1992.
- 84 "executed and obsolete" orders were never packeted, because that lane's yield was the lowest.

## Held

`STAGE11_HELD_QUEUE.jsonl` lists 531 held orders. Each names its blocker and the source that would settle it. Common blockers:
- No proof that a standing delegation is still used.
- A State Department Foreign Affairs Manual page that could not be obtained.
- Partial land revocations.
- A savings clause for pre-repeal beneficiaries.
- A reviewer who reached a different status (`reject_other`). Under the per-axis rule this makes both axes indeterminate: EO 11404, EO 12197 and row:7 moved toward NO this way.

## Coordinator rulings

`rules/COORDINATOR_RULINGS.md` holds CR-1 to CR-10.

CR-10 (new) concerns a later instrument that describes land "by reference to" a revoked order. It is guidance only. Overrides may only make a status stricter, so EO 8278 stays held.

## Method and limits

- Each status is a proposal by one AI agent and an independent check by another. The reviewer re-fetched the order texts and every YES bridge itself. They are not human reviewers.
- Quotes are exact substrings of stored text extractions. Each original carries a sha256 and a real retrieval time.
- Sources that could not be reached are logged in each shard's report: the Wayback Machine (drops connections), HathiTrust and Google Books (CAPTCHA), some NARA 1979/1989/1993 disposition tables (404) and the State FAM site. No login, paywall or CAPTCHA was bypassed.
- Identity conflicts are in `CONFLICT_LOG.jsonl` and were never corrected in the ledger.

## Files

- `ACCOUNTING.json`
- `STAGE11_STATUS_RECORDS.jsonl`
- `STAGE11_ACCEPTED.jsonl`
- `STAGE11_NEW_YES.jsonl`
- `PENDING_CLAUDE_NEW_NO_STAGE11.jsonl`: the 465 new NO, for Claude.
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

PDFs and images are in the companion `OPUS_STAGE11_CHECKPOINT2_EVIDENCE_ORIGINALS.zip`.
