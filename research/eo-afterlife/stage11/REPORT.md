# Opus Stage 11 finite-endpoint / continuity status delta

Legal cutoff: October 14, 2026 (America/New_York). Codebook 2.0.0, unchanged. Built 2026-10-17.

All 1,161 worklist IDs (the 1,145 finite/continuity IDs plus the 16 recovered NRA P3 IDs) were researched and independently reviewed, except 6. Those 6 (EO 10076, 10090, 10316, 10447, 10619, 10814) were left out so that no Stage 9 work was recycled; they are listed in `UNPROCESSED_WORKLIST.jsonl`.

The owner briefly stopped the work on 2026-10-17, then had it finished in order of least tokens per order, with no more than six agents at once. This package replaces the earlier interim delta (597 accepted, 20.784078%).

## Result

| | YES | NO | UNKNOWN | Determinate | Coverage |
|---|---:|---:|---:|---:|---:|
| Prior (Stage 11 provisional ledger, sha256 c0308e00...) | 193 | 2,322 | 12,458 | 2,515 | 16.796901% |
| Stage 11 accepted | **+212** | **+632** | -844 | +844 | |
| After Stage 11 | 405 | 2,954 | 11,614 | 3,359 | **22.433714%** |

- `prior_accepted_substantive_determinate = 2,515`
- `added_ACCEPTED_YES = 212`
- `added_ACCEPTED_NO = 632`
- `substantive_UNKNOWN_remaining = 12,458 - 844 = 11,614`
- `coverage_pct = (2,515 + 844) / 14,973 * 100 = 22.433714%`
- Any-effect axis after Stage 11: 416 YES, 2,784 NO, 11,773 UNKNOWN (21.371803%).

The Stage 9 v2 results and Astra's Stage 10 results are prior work, not Stage 11 throughput, and were excluded from the Stage 11 packets.

Integrity checks:
- No earlier accepted status was overturned.
- Only the 844 accepted rows changed in `RECONCILED_STATUS_LEDGER_STAGE11_OPUS_PATCHED.jsonl`; every other row is byte-identical to the input ledger. The builder checks this, and the patched ledger's sha256 is in `ACCOUNTING.json`.
- The historical census is not proved complete.
- Historical cause and first-cessation fields stay UNKNOWN.

## By lane

| Lane | Researched and reviewed | Texts complete | Accepted YES | Accepted NO | Subagent tokens | Accepted per 100k tokens |
|---|---:|---:|---:|---:|---:|---:|
| A closed institution / named ending | 27 | 27 | 0 | 21 | 641,602 | 3.27 |
| B executed and obsolete | 136 | 110 | 0 | 67 | 2,456,715 | 2.73 |
| C temporary (own end date or report) | 171 | 167 | 0 | 155 | 2,764,289 | 5.61 |
| D authority repealed | 126 | 124 | 2 | 115 | 2,585,091 | 4.53 |
| E possible continuity (NARA 1989 codification) | 445 | 429 | 200 | 82 | 7,748,186 | 3.64 |
| F NRA P3 recovered 16 | 16 | 16 | 0 | 16 | 754,271 | 2.12 |
| G later ending event (land orders, supersessions) | 234 | 204 | 10 | 176 | 4,367,473 | 4.26 |
| **Total** | **1,155** | **1,077** | **212** | **632** | **21,317,627** | **3.96** |

Token figures are the subagent tokens the harness reported. They leave out the coordinator's own tokens, which are not exposed. A resumed agent's reported total includes its work before the pause. Per-agent lines, agent-minutes and review error rates are in `TELEMETRY.json`.

## What the review found

**Continuity (lane E).** 200 orders that NARA's 1989 codification listed as in force are confirmed still operating on 2026-10-14. Each rests on current text: eCFR as of the cutoff, the current U.S. Code, Treaties in Force 2026, or a 2024-2026 Federal Register or agency document. Reviewers moved roughly one proposed YES in five to held, applying one standard throughout: a standing delegation or designation under a live statute needs evidence that someone still acts under the order.

**EO 11887, 12021, 11839.** An OPM rule (FR Doc 2026-16630, 91 FR 52475, issued under EO 14410) removed the text these orders had put in 5 CFR 6.8, effective 2026-10-13, one day before the cutoff. The reviewer confirmed the rule, the order and the eCFR change.

**Land (lane G).**
- Refuge orders whose land status still rests on the order are YES under CR-9: Havasu (EO 8647), Imperial (8685), Kenai (8979), Charles M. Russell (7509), 7655, 7724, 7993, 8065 and 8854.
- Each NO rests on a revoking Public Land Order that was read in full and covers every tract.
- Several NARA "(in part)" notes and PLO numbers were found to be wrong. They are logged in `CONFLICT_LOG.jsonl` and were not changed in the ledger.

**Executed and obsolete (lane B).** This lane had the lowest yield per token. Many of its orders were never printed and have no obtainable text, and some are standing authorities.
- Riot and strike troop orders are NO only where every clause is tied to one disorder and relief of all forces is documented: EO 11364 Detroit, 11405 Baltimore, 12616 Atlanta.
- EO 10730, 11403 and 11519 contain a standing clause and stay held.

**Reviewer outcomes.** Reviewers re-fetched every order proposed NO and every YES bridge themselves. Every status change made a status stricter, except three cases where the reviewer reached a different status (`reject_other`: EO 11404, EO 12197, row:7). Under the per-axis rule those three stay held.

## Held (311)

`STAGE11_HELD_QUEUE.jsonl` names each blocker and the source that would settle it. Open questions for the next stage:
- **Dormant authority.** Can a dormant standing authority under a live statute be YES? This affects most continuity holds (e.g. EO 12166, 12116, 11918, 10624, 10028).
- **Near-verbatim rewrites.** Does a host text rewritten in nearly the same words still count as the order's text (CR-8(b))? Affected: EO 10277, 12125.
- **Suspended reservations.** Reservations listed as "suspended but reinstatable" (32 CFR 761): EO 8597, 8680.
- **CR-10.** EO 8278 and the 1975 PLO 5550.
- **Blocked sources.** Sources blocked to this environment: the DoD awards manual (several medal orders), the State Department FAM and some .mil sites.
- **Unprinted orders.** Orders never printed in the Federal Register for which no text was found.
- **The three `reject_other` cases** above.

## Coordinator rulings

`rules/COORDINATOR_RULINGS.md` holds CR-1 to CR-10. Overrides may only make an axis stricter. CR-10 (land described "by reference to" a revoked order) is guidance only and is not applied.

## Method and limits

- **Who decided.** Each status is one AI agent's proposal, checked by a separate AI agent with its own context that re-downloaded the sources. Neither is a human reviewer.
- **Quotes and hashes.** Every quote is an exact substring of a stored text extraction. Each original carries a sha256 and a real retrieval time.
- **Blocked sources.** The standing rule on blocked sources was followed, and every attempt is logged in each shard's report. Still unreachable:
  - the Wayback Machine (connections dropped);
  - HathiTrust and Google Books (CAPTCHA; not bypassed);
  - some NARA disposition-table years (404);
  - the State FAM site;
  - several .mil hosts.
- **Identity conflicts** are in `CONFLICT_LOG.jsonl` and were never corrected in the ledger.

## Files

- `ACCOUNTING.json`
- `STAGE11_STATUS_RECORDS.jsonl`
- `STAGE11_ACCEPTED.jsonl`
- `STAGE11_NEW_YES.jsonl`
- `PENDING_CLAUDE_NEW_NO_STAGE11.jsonl`: the 632 new NO, for Claude
- `STAGE11_HELD_QUEUE.jsonl`
- `UNPROCESSED_WORKLIST.jsonl`
- `RECONCILED_STATUS_LEDGER_STAGE11_OPUS_PATCHED.jsonl`
- `TELEMETRY.json`
- `CONFLICT_LOG.jsonl`
- `rules/`
- `packets/`
- `evidence/`: shard and review records, text extractions and metadata
- `code/`
- `MANIFEST.json`

PDFs and images are in the companion `OPUS_STAGE11_EVIDENCE_ORIGINALS.zip`.
