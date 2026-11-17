# DKLA content audit — 17 November 2026

This pass improves the published content and records where independent checking
is still needed. It is not a certification that every statement in the Atlas is
true or that every brief is complete.

## Scope

The effective assembled corpus contains 1,468 full briefs, about 1.97 million
words, 96 doctrine timelines with 685 steps, and three course chronologies with
1,469 case identities. Forty-four briefs are explicitly source-limited. Review
used the assembled text, including correction overlays, rather than assuming the
raw Markdown files are what readers see.

Three parallel reviewers covered Contracts, Civil Procedure, and Legislation
and the Regulatory State (LRS). Every doctrine timeline and step received an
editorial screen. Main-map screening covered 103 Contracts compact rules and
takeaways, 134 Civil Procedure compact rules, and 154 LRS takeaways. Mechanical
inventory covered the full corpus. These counts describe different review
methods and must not be added together as independently verified cases.

Contracts primary-source work covered relevant passages in 14 opinions, one
additional date-only opinion check, eight model UCC sections, and one enacted
statute. Civil Procedure checked 145 official metadata records and 41 printed
opinion first pages, confirming 36 distinct decision dates; it also compared
targeted substantive passages. LRS compared targeted primary passages and read
the complete American Mining Congress opinion against its complete brief and
compact versions. Date checks and metadata matching are not holding verification.

## Corrections and reader improvements

The [correction register](../tools/content-audit/2026-11-17-corrections.json)
records 221 field-level operations, including replacements that supersede an
earlier correction. This is not a count of 221 different cases or legal errors.
It includes 86 effective-brief operations, 85 doctrine-timeline operations,
45 course-chronology operations, and five takeaway operations.

Examples include:

- Parker's actual replacement earnings versus hypothetical earnings from
  comparable work; Drennan's reliance protection versus automatic contract
  formation; Mattei's two satisfaction standards; and Trident's preservation of
  later summary judgment.
- Cromwell and Russell's 1877 decision year, distinct from October Term 1876;
  Stewart's federal statute analysis; Cooper's claim/issue-preclusion distinction;
  and the historical or circuit-specific limits of Conley, Mussat, and Briseno.
- American Mining Congress's missing qualifier, Kisor's limitations, Roth's
  employment-term distinction, interim procedural postures, and qualified
  treatment of the 2026 FCC v. AT&T and Learning Resources decisions.
- Fifty-six previously inert full-opinion labels now link to matched opinions.
  Eight Contracts briefs have PDF running headers, continuation debris, or a
  swallowed heading repaired without deleting substantive account text.

Every source-backed correction records the source and review depth. The timeline
reader now displays documented exact dates and direct primary-source links.
Years remain years where a day has not been established. Corrections propagate
through effective content overlays and preserve user-edited graph fields.

A downstream comparison also corrected three visible fields and added two source
links in the Cromwell and Russell supporting Cold Call narratives. These are
recorded in their narrative review records, separately from the 221-operation
register. Source fingerprints were refreshed only after reproducing each changed
brief from the recorded deltas and checking affected narrative claims. New review
records describe that limited comparison; they do not recertify entire opinions.

The [integrity checker](../tools/content-audit/check.py) verifies that registered
changes reach the effective briefs, takeaways, timelines, and chronologies. It
checks source URL safety and prevents a partial review from silently becoming a
fresh complete-opinion review flag. It does not assess legal truth.

## Remaining review

The complete corpus has not received a fresh claim-by-claim comparison with
complete primary opinions. This pass does not certify all procedural events,
quotations, separate opinions, omitted material, later treatment, or current law
in every jurisdiction. In Contracts alone, 186 timeline steps remain without an
independent primary-source check in this pass. A stable full-opinion URL for
Lacks v. Lacks remains unresolved; the assigned excerpt is retained.

The [evidence directory](../tools/content-audit/evidence/) preserves review
ledgers, precise scope statements, primary-source pinpoints, and the full baseline
case/timeline queues. Baseline queue status is an inventory, not an assertion that
subsequent corrections never occurred; use it alongside the dated correction
register and course-specific evidence. Existing older audit claims remain
distinct from this pass.

To continue, take a queued case, read its complete opinion and relevant separate
writings, compare each material claim across all effective formats, check later
treatment where the teaching rule depends on it, and record the evidence and
remaining uncertainty. Only then should that case's review depth advance.

## Verification and release status

The build passes. The final `pnpm verify` run passed 58 of 59 steps: API tests,
desktop and phone Ask Dottie flows, source/PDF navigation, complete course
chronologies, content guards, correction integrity, explanation and Cold Call
checks, saved work, search, layout, and update/offline behavior passed. The one
failure is the main-view screenshot comparison; the unchanged production commit
also fails those existing macOS snapshots. They were not blindly re-recorded.
New desktop and phone screenshots of the changed interfaces are in
`tools/content-audit/visuals/`.

Three isolated deliberate regressions were caught: using the newest answer's
context for an older answer, confusing saved explanations of different parent
questions, and hiding verified timeline dates. Clean flows passed afterward.
Ask Dottie's browser tests use mocked model responses; no paid production model
call or visitor-data inspection was performed.

The changes are committed locally. The attempted feature-branch push was blocked
by automatic approval review, which requires explicit user authorization to send
the changes to the external GitHub repository. No remote branch or live deployment
was changed by these attempts.
