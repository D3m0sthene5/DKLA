# OP-CT-11 handoff: Contracts Class 11, contract modifications

Branch `audit/contracts-opus-2026-11-19`. Corrections commit `cce8e4b8`, on top of the check
extension `a5bbc289`. 28 exact-value corrections, all in `tools/content-audit/2026-11-19-contracts-opus.json`
and in `corrections.json` here, each with its pinpoint. Found by the source reader (`comparison.md`) or the
challenger (`challenge.md`). The lead checked each one against the cited passage before applying it.

## Applied (result-changing first)

| Surface | Correction | Pinpoint |
|---|---|---|
| Austin Cold Call episode 7 ¶2, ≈ 6.1 | § 176(1)(d) needs a threat that is itself a breach of the duty of good faith and fair dealing, not any threatened breach | Rest. § 176(1)(d); slides 13–14 |
| Austin rule CTR-036, chronology | Duress requires a wrongful threat precluding free will that forces agreement to a further demand; the rule kept no-alternative-source and inadequate-remedy | C&M 489 |
| K-20 node b edges and detail | "Same duty only" sent the Watkins facts and § 89 Illus. 1 to "apply the original obligation"; edges now read "New consideration or a recognized alternative" / "Same duty, no recognized alternative"; detail states § 89(a)–(c) | C&M 477–480; Rest. § 89 cmt. a, Illus. 1 |
| K-20 node h, Austin ≈ 4.3 | Loral protested at once (July 22); the three days concern its refund demand; disaffirmance must be prompt once the pressure ends | C&M 488, 491 |
| K-20 node e | Adds the inadequate-breach-remedy element | C&M 489–491 |
| K-20 node g | Adds § 89(c) reliance | Rest. § 89(c), cmt. d |
| Alaska Packers Cold Call episode 6, ≈ 5.1 | § 89(a) is "fair and equitable in view of circumstances not anticipated", and comment b counts a remote, uncovered risk | Rest. § 89(a), cmt. b; C&M 476 |
| Alaska ≈ 5.1, timeline step `ny51103`, timeline `now` | § 5-1103 needs a writing signed by the party against whom it is enforced or that party's agent; § 2-209 good faith is a requirement | Supp. 9; C&M 473; UCC § 2-209 cmt. 2 |
| Alaska ≈ 4.0 | Rescission needs both parties | C&M 472, 475, 479 |
| Watkins rule CTR-035, chronology, takeaway, timeline step, Cold Call ≈ 5.1 | New Hampshire law, tied to an unexpectedly burdensome obligation and a fair special price; § 89 comment b *rejects* the rescission theory | C&M 478; Rest. § 89 cmt. b |
| Austin ≈ 3.0 | "only because" replaced: the threat must force agreement, not be the sole reason | C&M 489; Rest. § 175 cmt. c |
| Lecture notes, "The pre-existing duty rule" | Slide 5's qualifier "under the pre-existing duty rule" restored | slide 5 |

## Not applied, for Astra

- **K-20 node a** cites `ucc204` (UCC § 2-204, formation). The Atlas has no map entry for § 2-209
  (only the timeline step `ucc2209`), so there is nothing correct to point to. Needs an Atlas entry for
  § 2-209 or removal of the tag; a structural choice left to the coordinator.
- **Lecture notes that faithfully report a slide whose shorthand drops statutory conditions** (`challenge.md`
  A-08, A-25, A-26, A-27): slides 11–13 and 15. A-27 matters most: the RLCC § 3 note says "reject or
  terminate", but § 3(a)(2) requires an opportunity to reject and continue, and termination replaces it
  only under an agreed procedure (§ 3(b), Illus. 15). Slide 15 also quotes a "fair and equitable" clause
  that is not in the assigned § 3(c) text. Whether to annotate the slide summary is an owner decision.
- **Alaska Packers rule and `legal-detriment` topic** (A-01, A-02, A-04): add § 73's "neither doubtful
  nor the subject of honest dispute" and the limit to duties owed to the promisor (C&M 470, 485). A map-entry
  topic, which needs a run-time edit.
- **Teaching gaps** (`comparison.md` (c)): § 89 cmt. b and Illus. 1, 5; § 5-1103 compared with § 2-209;
  an RLCC § 3 entry (the map has none; its node is marked "gap-rlcc"); § 175 cmt. c; waiver and
  no-oral-modification mechanics under § 2-209(2)–(5); Foakes v. Beer; Posner's "temporary monopoly" note.
- **Open fact check:** the Watkins brief and Cold Call call Burque a justice who did not sit; the excerpt
  names "Burque, C.J." only as the judge who transferred the case. Check against the full opinion.

## Verification

`pnpm build`, `tools/content-audit/check.py`, `tools/flowcharts/check-data.mjs` and
`tools/cold-call/check_narratives.py` pass. Both content pins were updated for this reviewed change.
The full `pnpm verify` result for the branch tip is recorded in `../VERIFY.md`.
