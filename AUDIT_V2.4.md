# DKLA v2.4 accuracy audit — October 11, 2026

The audit found and corrected substantive errors and a Cold Call attribution bug. It does **not** certify every legal statement in the approximately 1.97-million-word corpus. All 1,468 full briefs received the inventory and consistency checks described below; fresh primary-source comparisons covered eight specified accounts, including one complete new comparison of Hurn. Earlier source-review records were retained as prior evidence, not counted as reviews newly performed in this audit.

## Corrections

| Account | Correction and evidence |
|---|---|
| Calder v. Jones | The full brief still called the editor John Calder although the compact brief had been repaired. The [opinion caption](https://www.law.cornell.edu/supremecourt/text/465/783) identifies Iain Calder and John South. |
| Exxon Mobil v. Allapattah | The full brief still placed the filing in the Northern District of Florida. The [Eleventh Circuit opinion, pp. 2, 5](https://media.ca11.uscourts.gov/opinions/pub/files/200115575.pdf) establishes the Southern District and May 1991 filing. |
| Republic of Philippines v. Pimentel | The full-brief paraphrase now uses the agency’s canonical name, Presidential Commission on Good Government, consistent with [Swezey, 19 N.Y.3d 543, 547](https://www.nycourts.gov/reporter/3dseries/2012/2012_05093.htm). This is a clarification: Pimentel itself calls it Good Governance at 553 U.S. 855. The differing names do not identify different agencies. |
| Ohio v. EPA | An earlier correction incorrectly changed four later proposed disapprovals to two in the compact account. The [official opinion, slip pp. 4–5 and nn. 1–3](https://www.supremecourt.gov/opinions/23pdf/23a349_0813.pdf) identifies four: California, Utah, Nevada and Wyoming. Final federal-plan coverage is a different set; the summary no longer conflates the counts. |
| Hurn v. Oursler | Compared the whole [Hurn opinion](https://www.law.cornell.edu/supremecourt/text/289/238), including the judicial footnote, with the full brief. Its facts, two distinct claims, modified affirmance and Brandeis–Stone position agree. The rule line now identifies its historical pre-Gibbs test. The later-history wording now says Gibbs reaffirmed discretion and criticizes the restrictive application of Hurn. Replaced unsupported “general knowledge” provenance with [Gibbs, 383 U.S. 724–727](https://www.law.cornell.edu/supremecourt/text/383/715), [§ 1338(b)](https://www.law.cornell.edu/uscode/text/28/1338) and [§ 1367](https://www.law.cornell.edu/uscode/text/28/1367). |

There are nine recorded text changes across these five accounts, including factual corrections, precision edits, source support and review-status wording. [Exact changes and evidence](tools/r19/data/accuracy24.json) are applied during every build. A changed full brief now invalidates its narrative fingerprint and requires comparison before release. Archived compilation PDFs remain source artifacts and are labelled accordingly; use the in-app full brief for current corrections.

## Cold Call

The initial audit repaired a sorter that treated nested headings as independent sections. A heading about procedural injury could move out of the reasoning, and a separate opinion’s subsection could move away from its author. It identified 62 misclassified headings in 15 briefs. Retaining these headings in context repaired attribution in that indexed format, but did not turn the original briefs into chronological narratives.

The owner rejected that format. The subsequent narrative correction removes the indexed-brief fallback from compilation and rendering. Each additional narrative is individually written after reading its whole canonical brief, with introduced participants, chronological episodes, correctly attributed court stages and explicit source limits. Swiss uses its assigned translated excerpt because it has no separate full brief. This authoring comparison does not repeat the original primary-source legal audit.

The inventory is 392 map cases and 1,077 supporting entries. [The narrative coverage report](tools/cold-call/coverage.json) gives exact authored and pending counts and source fingerprints. A Cold Call button requires an authored narrative; production completeness requires zero pending entries. Original full briefs remain available. Schema checks reject the old source-span fallback and generic brief headings, but cannot establish the accuracy or clarity of every sentence.

## Checks and source comparisons

- Validated all 1,468 brief identities, mappings and nonempty texts. The initial span checks preserved source prose; the narrative correction replaces those checks with authored/pending inventory and source-fingerprint checks.
- Checked 219 previously recorded conversion corrections for regression; none remained in their rejected form.
- Scanned all 1,464 compact accounts for literal year and dollar amounts absent from their full briefs. The only two candidates were resolved: Tuazon’s $145–240 million range and Catrett’s death in the year preceding a 1980 filing.
- Compared numeric vote candidates against the full briefs: Merrell Dow’s five-to-four and Dolan’s seven-to-one descriptions support the compact figures.
- Checked the quoted policymaking-appointee wording in Gregory against [29 U.S.C. § 630(f)](https://www.law.cornell.edu/uscode/text/29/630).
- Rechecked Berk’s Rule 8 holding and Jackson’s Rule 3/12 concurrence against the [January 2026 official opinion](https://www.supremecourt.gov/opinions/25pdf/24-440_1b82.pdf).
- Rechecked Slaughter’s June 2026 holding, vote alignment, treatment of Humphrey’s Executor and reserved questions against the [official opinion](https://www.supremecourt.gov/opinions/25pdf/25-332_qn12.pdf). These points agree with the brief.
- Preserved all 35 immutable r18 script blocks; checked release metadata, routes, JavaScript syntax and content fingerprints.

## Remaining limits

Forty-four briefs retain recorded source limitations. Thirty-eight compact accounts have no separate conversion-review record in the available repository; that is a documentation gap, not proof that their legal statements are wrong. A fresh claim-by-claim primary-source review of the remaining corpus has not been performed. This audit is not a current-law citator check. User-edited browser copies are preserved by the atlas and may differ from the corrected canonical text.

The [per-brief audit inventory](tools/r19/data/accuracy24-inventory.json) records every brief’s text fingerprint, inherited review status, source limitation, conversion-review record and the precise scope of any fresh source check. It explicitly marks every record as **not** receiving a new blanket accuracy certification. Regenerate with `python3 tools/r19/audit24.py`; validate with `python3 tools/r19/audit24.py --check`.
