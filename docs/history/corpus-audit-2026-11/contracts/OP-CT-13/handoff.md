# OP-CT-13 handoff: Contracts Class 13, the parol evidence rule

Branch `audit/contracts-opus-2026-11-19`, commit `4f5c9c47`. 22 corrections: 21 registered in
`tools/content-audit/2026-11-19-contracts-opus.json`, and one guarded run-time edit to the TeeVee Toons map
entry in `r21-audit.json`. The same commit re-pins the earlier review records for the changed text. The lead
checked each correction against the cited passage.

## Applied

| Surface | Correction | Pinpoint |
|---|---|---|
| Gianni rule CT-SUP-0037, chronology, timeline step | The rule keeps "absent fraud, accident or mistake"; without it the line would bar Bollinger's proof | Supp. 39; C&M 544 |
| Gianni brief Reasoning | Completeness judged from the writing itself, which is presumed conclusively complete if it appears complete (the contrast slide 16 asks about) | Supp. 38; slide 16; Rest. § 210 cmt. b |
| K-22 node d, label and detail | Gianni's test applied to every complete integration; the node now gives each authority's test: Masterson and § 216(2)(b), separate consideration under § 216(2)(a), UCC § 2-202 cmt. 3 | Supp. 38; C&M 536, 538–40; § 2-202 cmt. 3 |
| K-22 node h | A fraudulent representation can be proved; a prior express warranty is barred; courts divide on promissory fraud | C&M 544–45 |
| Masterson ≈ 2.2 and narrative | The UCC "certainly" test applies to consistent additional terms only (§ 2-202 bars contradiction outright); the narrative had it backwards | § 2-202 and cmt. 3; C&M 539 |
| Masterson ≈ 2.0, 4.0, 5.0; timeline step | Scope limit kept; Burke's dissent attributed; a collateral term must be consistent | C&M 536–41 |
| Bollinger ≈ 2.2, takeaway | The rule bars contradiction or in-scope supplementation only; reformation needs a mutual mistake on strong proof | C&M 536, 539, 544 |
| TeeVee Toons ≈ 2.1, takeaway, timeline step, map Reasoning | The domestic rule bars prior agreements offered to contradict, not all outside evidence; the court's CISG reading with Article 8(1)'s "could not have been unaware" | Supp. 42–44; CISG art. 8 |
| Lecture notes (integration; international approaches) | Slide 7's "within their scope", UCC § 2-202(a) commercial context, and slide 19's places-of-business and party-state conditions restored | slides 7, 19 |

## Not applied, for Astra

- **K-22 node a** has no route for an oral condition on the writing's effect (slide 7; Rest. § 217) or for
  supplementing by commercial context under § 2-202(a). Both inputs end at "excluded". Adding edges is a
  structural chart change (`challenge.md` item 6).
- **Bollinger timeline turn "widens"**: should probably be "applies", since Gianni already recognized
  the mistake route (Supp. 39). The turn labels belong to the redesign team's timeline work.
- **TeeVee brief rule line and chronology** carry the same "both parties meant it" wording as the
  corrected takeaway, but in a case-attributed context; lower risk, left as written.
- **Data defects**: the TeeVee `cisg-framework` learning topic shows an internal data note to students.
  Restatement § 21 is linked to all four cases, while the assigned §§ 210 and 213–216 have no links in
  `tools/v25/authorities.json`.
- **RLCC numbering**: the selections (2019 Tentative Draft) and C&M 543 number the parol-evidence section
  § 8; slide 11 and the Atlas use the 2024 Official Text's § 9. Nothing was changed; a note on the RLCC
  entry would help a student reading the selections.
- **Teaching gaps** (`comparison.md` (c)): no-oral-modification clauses (C&M 546–547) are almost absent;
  the split over whether merger clauses are conclusive (C&M 542); why the rule is "substantive" (no waiver;
  Erie; C&M 529–530); Rest. § 216(2) and § 210 cmt. b.

## Verification

`pnpm build`, the correction, flowchart, narrative and four record checks pass. Full `pnpm verify`: see `../VERIFY.md`.
