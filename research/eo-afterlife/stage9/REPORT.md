# Opus Stage 9 present-status delta (version 2)

Legal cutoff: October 14, 2026 (America/New_York). Codebook 2.0.0, unchanged. Built 2026-10-16. This version replaces version 1 of the same day, whose 5 retirement confirmations are carried over unchanged.

## Result

| | YES | NO | UNKNOWN | Determinate | Coverage |
|---|---:|---:|---:|---:|---:|
| Prior (Stage 8 technical merge; the 340 are **prior** work) | 191 | 2,035 | 12,747 | 2,226 | 14.866760% |
| Stage 9 accepted (provisional) | **+2** | **+47** | -49 | +49 | |
| After Stage 9 | 193 | 2,082 | 12,698 | 2,275 | **15.194016%** |

- `prior_accepted_substantive_determinate = 2,226`
- `added_ACCEPTED_YES = 2`
- `added_ACCEPTED_NO = 47`
- `substantive_UNKNOWN_remaining = 12,747 - 49 = 12,698`
- `coverage_pct = (2,226 + 49) / 14,973 * 100 = 15.194016%`

The numerator is 2,275; the denominator is 14,973 validated orders out of 15,010 ledger rows. No earlier status was overturned. The historical census is not proved complete.

**Reviewed but not counted (ownership not verified):** 131 further orders reached a reviewed determinate substantive status: 90 tax-inspection, 39 WWI eight-hour and 2 alien-property. They cannot be counted until Astra's 1,181-ID manifest shows they are outside Astra's reserved scope. If all were cleared, coverage would be 2,406 / 14,973 = 16.068924%. That figure is a ceiling, not a claim.

## What was accepted (49)

Every accepted order passed four gates:
1. Its ID was promotable: either one of the five Opus Stage 8 cases, or a lead that passed Astra's own exclusion scan and has no civil-service title.
2. It was `indeterminate` in the Stage 8 ledger and in no frozen or assigned list.
3. A producer agent read the full operative text and mapped every clause against the controlling law.
4. A separate reviewer agent re-downloaded the texts, re-checked every quote and hash, and reached the same statuses.

| Family | Accepted | YES | NO | Notes |
|---|---:|---:|---:|---|
| Retirement reviewer confirmations (EO 8256, 8497, 8904, 10225, 11619) | 5 | 0 | 5 | version 1; three concurring reviews |
| Advisory-committee continuance orders | 14 | 2 | 12 | EO 14354 (continues committees to 2027-09-30) and EO 13708 (its amendment of EO 12829 sec. 103 is still in force) are **YES** |
| Office closings and rail/airline emergency boards | 17 | 0 | 17 | dated closings spent; boards reported, panel revoked 1947 |
| Commemoration and exposition orders | 13 | 0 | 13 | EO 12001 is NO substantive but any-effect indeterminate (open-ended administration of Bicentennial contracts) |

Still held in these families: EO 3885-A and EO 3665 (no operative text after the full source ladder), and EO 8273 (civil-service title, not touched).

## Pilots and expansion (reviewed, held for ownership)

| Family | Researched | Reviewed determinate | Held indeterminate | Review result |
|---|---:|---:|---:|---|
| Tax-return inspection (14 pilot + 84 committee expansion) | 98 | 90 substantive NO (25 NO/NO, 65 NO with any-effect indeterminate) | 8 | Rule: committee permission limited to a named Congress, a resolution, a date, or a committee that ended. Counterexample: orders reaching pre-1954 (1939-Code) returns are not closed by the 1976 Tax Reform Act. |
| WWI eight-hour suspensions (10 pilot + 36 expansion) | 46 | 39 NO/NO | 7 (no text) | Rule: suspension tied to the war emergency, a date, or one project; the 1962 repeal is the outer bound. 18 reasoning corrections, 0 status changes. |
| Alien Property Custodian single sales | 10 | 2 NO/NO | 8 | **Low yield, stopped**: a grant to sell is not proof of a sale; the sale power is still law (50 U.S.C. 4312). |

## Coordinator rulings (in `rules/COORDINATOR_RULINGS.md`)

- **CR-1.** Committee text in an unrevoked host order, where the committee ended under an operative termination rule, is not a "dormant" effect. This holds only if bringing it back would need a new presidential act and no standing power remains.
- **CR-2.** WWI suspensions whose own text ties them to the war emergency ended with it (7 Comp. Gen. 73, 76-77 (1927)). Limit: such rulings bind accounting officers, not courts. Records that rest on CR-2 alone are marked medium confidence.
- **CR-3.** Committee tax orders reaching 1939-Code returns carry a Treasury "held confidential" term whose removal was not found. The two reviewers split on whether that term is part of the order, so the stricter view applies: substantive NO, any-effect indeterminate (65 orders). It would be settled by finding the removal of 26 CFR 458.324; a full govinfo search with an api.data.gov key would do it.
- **CR-4.** The 1946 savings clause in EO 9801 keeps only claims that are now time-barred, so it is not a present effect.

## Quality and limits

- **Review outcome.** Reviewers changed no determinate status to a different determinate status. Of the 200 shard records reviewed, 89 were accepted as proposed and 77 were "accept with correction" (reasoning, dates or evidence fixed). The 34 tax-expansion records the reviewer rejected to indeterminate affected any-effect only (CR-3).
- **Independence.** Producers and reviewers are separately instantiated agents of the same model, each with its own context, and the reviewers re-fetched sources themselves. They are not human reviewers.
- **Text grades.**
  - Most texts are official publications: Federal Register issues on govinfo, and Official U.S. Bulletin scans on archive.org.
  - Many are American Presidency Project transcripts, graded `hosted_transcript`.
  - Six closing orders come from 1904-1928 newspaper printings (Library of Congress Chronicling America); five of these were checked against page images.
- **Unreachable sources.** HathiTrust and Google Books full text (CAPTCHAs, not bypassed), the Wayback Machine (the archive drops connections from this environment), federalregister.gov full-text pages (CAPTCHA), and some NARA disposition-table years (404). Every attempt is logged in each shard's report and attempts log.
- **Identity conflicts.** Logged in `CONFLICT_LOG.jsonl` and never corrected in the ledger. Examples: EO 2858 and EO 2814 dates; EO 3016C and EO 3016N are orders by Frank L. Polk under a delegation, not presidential signatures; EO 7700 numbering.
- **Unchanged fields.** Historical causes stay UNKNOWN. No first-cessation, housekeeping, identity or formal-disposition field was changed.

## Yield and cost (subagent tokens as reported; coordinator tokens not exposed)

See `TELEMETRY.json` for each family's tokens, agent-minutes, review error and correction rates, and reviewed determinate statuses per 100,000 tokens. Measured yield per 100k tokens: tax inspection 5.7, office closings and boards 5.4, advisory 2.7, commemoration 2.5, WWI 2.1, alien property 0.4.

## Blockers and next steps

1. **Upload Astra's manifest.** The file is `ASTRA_STAGE7_CIVIL_STATUS_DELTA_2026-10-15.zip`, which contains `FROZEN_STAGE7_ASSIGNMENT_SPLIT_ORIGINAL.zip` (sha256 5b553c02...). With it, the 131 reviewed results can be checked and, where outside Astra's scope, promoted without new research.
2. **CR-3 (65 tax any-effects).** Settle it with an api.data.gov key, or by locating the removal of 26 CFR 458.324.
3. **Next families.** These are ranked in `NEXT_FAMILY_CANDIDATES.json` from the current ledger; Indian trust-period orders must never be bulk-expired by date.
4. **NRA P3.** The 16 NRA P3 IDs remain unrecoverable from the bundled files.

## Files

- `STAGE9_STATUS_RECORDS.jsonl`: one record for each of the 205 researched orders.
- `STAGE9_ACCEPTED.jsonl`
- `CLAUDE_NEW_NO_V7_OPUS_PROVISIONAL.jsonl`: the 47 accepted NO only.
- `STAGE9_NEW_YES_PROVISIONAL.jsonl`
- `STAGE9_REVIEWED_DETERMINATE_HELD_FOR_OWNERSHIP.jsonl`
- `STAGE9_HELD_QUEUE.jsonl`
- `ACCOUNTING.json`
- `TELEMETRY.json`
- `CONFLICT_LOG.jsonl`
- `checks/OWNER_AND_BASELINE_CHECKS.jsonl`
- `rules/`: shard rules, coordinator rulings, and the producer and reviewer protocols.
- `evidence/`: every shard's and reviewer's records, text extractions, metadata with original-byte SHA-256, and code. Large originals are listed in `evidence/UNPACKAGED_LARGE_ORIGINALS.jsonl` with their hashes. Very large text extractions are packaged as quote windows.
- `MANIFEST.json`
- `code/build_stage9_v2.py`

Page images and PDF page excerpts are in the companion `OPUS_STAGE9_EVIDENCE_IMAGES.zip`.
