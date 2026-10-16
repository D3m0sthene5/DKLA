# Opus Stage 9 present-status delta

Legal cutoff: October 14, 2026 (America/New_York). Codebook 2.0.0, unchanged. Built 2026-10-16.

## Result

| | YES | NO | UNKNOWN | Determinate | Coverage |
|---|---:|---:|---:|---:|---:|
| Prior (Stage 8 technical merge; the 340 are **prior** work) | 191 | 2,035 | 12,747 | 2,226 | 14.866760% |
| Stage 9 added | 0 | **5** | -5 | +5 | |
| After Stage 9 (provisional) | 191 | 2,040 | 12,742 | 2,231 | **14.900154%** |

- `prior_accepted_substantive_determinate = 2,226`
- `added_ACCEPTED_YES = 0`
- `added_ACCEPTED_NO = 5`
- `substantive_UNKNOWN_remaining = 12,747 - 5 = 12,742`
- `coverage_pct = (2,226 + 5) / 14,973 * 100 = 14.900154%`; numerator 2,231, denominator 14,973 validated orders (15,010 ledger rows). No earlier status was overturned.

The historical census is not proved complete.

## What was accepted

The five Stage 8 reviewer-only cases, each now with three concurring NO/NO judgments: the Stage 8 reviewer V8_RET, a Stage 9 coordinator check, and a separately instantiated Stage 9 reviewer subagent (V9_RET_CONFIRM). The subagent read only copied input files and did not see the coordinator's verdict.

| EO | Person | Rule | Why NO/NO at the cutoff | Confidence |
|---|---|---|---|---|
| 8256, 8497, 8904 | Maurice C. Latta | RET-CHAIN-C | Each grant ran to a stated date (1940-10-31, 1941-10-31, 1942-10-31). As a fresh grant, each order ended on its own date. As an extension, each follows EO 9238, which is already accepted NO (RET-R2, no later than 1978-09-30). Both readings give NO. | high |
| 10225 | Bernice Pyke | RET-CHAIN-C | Grant "not extending beyond March 31, 1952". Under the extension reading it follows EO 10333, which is already accepted NO. | high |
| 11619 | Rose A. Conway | RET-R2/NONLIMIT | The exemption was open-ended under 5 U.S.C. 8335. Pub. L. 95-256 struck the general mandatory-separation rule effective 1978-09-30, and her position falls in none of the categories that kept mandatory separation. The "nothing in this Order shall be deemed to limit" clause is a rule of construction, as for EO 11378 (already accepted). | medium |

**Limits.**
- The order texts are hosted transcripts (American Presidency Project) cached by Stage 8 through WebFetch, not original bytes. "No other provision" in those caches is the fetch tool's statement, not the order's own words.
- The Pub. L. 95-256 and 8335 renderings are partial, and 8335 is the 2011 edition.
- The extension reading for the Latta and Pyke orders relies on the Stage 8 acceptances of EO 9238 and 10333, which are a technical integration rather than a fresh audit. The fresh-grant reading does not depend on them.
- One dissent is recorded on EO 11619: if the non-limitation clause were operative, any-effect would be indeterminate.
- The 26 quotes used for these decisions are exact substrings of SHA-256-hashed local files (`evidence/STAGE9_EVIDENCE.jsonl`), and the reviewer verified its 70 quotes the same way.
- Counterevidence searches found no later order for any of the three people. These were WebSearch summaries, used only as leads.

## What could not be done, and why

1. **No network access to primary sources.** Every primary host failed: the shell got a proxy policy 403 for presidency.ucsb.edu, govinfo.gov, archives.gov, law.cornell.edu, uscode.house.gov, HathiTrust, loc.gov, archive.org, federalregister.gov and others, and WebFetch could not resolve them. WebSearch works but returns summaries only, which gate 3 forbids as a basis for NO. As a result, none of the 44 pilot orders (14 tax inspection, 10 WWI eight-hour, 10 alien property, 10 secondary) had its operative text obtained. All 44 are **held, not decided**, each with its blockers and the law to retrieve. This is unmeasured yield, not a failed rule.
2. **The Astra 1,181-ID manifest is missing.** It is in neither bundled archive. All tax, WWI and alien-property leads are therefore `OWNERSHIP_NOT_VERIFIED` and could not be promoted even if decided. Only the 49 Astra-screened leads and the five Opus Stage 8 cases are promotable. This is recorded as a blocker, not as proof of non-overlap. Three leads have civil-service titles (EO 3441, 8273, 8975) and are flagged as do-not-touch.
3. **The 16 NRA P3 IDs are not in any bundled file.** They were in the unbundled Stage 7 split package, so they were left untouched as instructed.

## New legal blockers found (leads only, to verify with primary text)

- **Tax returns (TAX-B1).** 26 CFR 301.6103(a)-1 appears to allow continued use, after 1976, of returns disclosed before 1977 "for purposes permitted by the prior authority". For agency-recipient orders (FTC, HEW, SEC, Renegotiation Board) this is a candidate saved residual of the order's own terms, so any-effect NO is blocked until the regulation is read. Congressional-committee orders look more tractable: about 70 share one transition, Tax Reform Act of 1976 sec. 1202(i), effective 1977-01-01.
- **WWI eight-hour (WWI-B1).** The 1917 suspension power was still cited in 1939 (EO 8198, 40 U.S.C. 326), so it did not lapse with the war. Each order's end trigger ("pending emergency", contract completion) and the 1962 repeal's savings clause must be read.
- **Alien property (APC-B1 to B3).** A grant to sell is not proof of a sale, and execution records (APC annual reports) are needed. EO 3639A's perpetual lease is a continuing-interest counterexample. Triage by title of the 196 leads: 155 single identified sales or dispositions, 16 continuing delegations, 9 institutional, 5 class authorizations, 1 perpetual lease, 10 other or misfiled.

## Telemetry

The reviewer subagent used 96,854 tokens, 14 tool uses and 3.3 minutes. Coordinator tokens are not exposed. The coordinator's elapsed time ran from about 15:55Z to packaging. See `TELEMETRY.json`.

## Recommended next step

Rerun Stage 9 production in a session that has (a) the Astra 1,181-ID manifest (`EO_Stage7_Astra_Opus_Split_2026-10-15.zip`) and (b) network access to presidency.ucsb.edu, govinfo.gov, ecfr.gov, uscode.house.gov and babel.hathitrust.org. The pilot packets in `STAGE9_HELD_QUEUE.jsonl` are ready to run. The suggested order is in `NEXT_FAMILY_CANDIDATES.json`: WWI single-project orders first, then the tax congressional-committee stratum, then one-day closings, and alien property last.

## Files

- `STAGE9_STATUS_RECORDS.jsonl`: one record for each of the 49 researched IDs.
- `STAGE9_ACCEPTED.jsonl`
- `STAGE9_HELD_QUEUE.jsonl`
- `CLAUDE_NEW_NO_V7_OPUS_PROVISIONAL.jsonl`: the 5 new NO only.
- `ACCOUNTING.json`
- `checks/OWNER_AND_BASELINE_CHECKS.jsonl`: all 397 leads and cases, with ledger status and exclusion hits.
- `rules/STAGE9_RULES.jsonl`: applied rules plus untested family hypotheses.
- `reviews/`: the coordinator checks and the independent reviewer's records and summary.
- `evidence/`: quote ledger and hashed source copies.
- `leads/`: WebSearch lead log, graded search_summary_only.
- `CONFLICT_LOG.jsonl`
- `TELEMETRY.json`
- `NEXT_FAMILY_CANDIDATES.json`: computed from the current Stage 8 ledger.
- `MANIFEST.json`: SHA-256 for every file.
- `code/build_stage9.py`: rebuilds everything from the handoff.

Historical causes stay UNKNOWN. No first-cessation, housekeeping, identity or formal-disposition field was changed.
