# OP-CT-15 handoff: Contracts Class 15, commercial context and past dealings

Branch `audit/contracts-opus-2026-11-19`, commit `b767c567`. 11 corrections: 10 registered in
`tools/content-audit/2026-11-19-contracts-opus.json`, and one guarded run-time edit to a Nanakuli map-entry
topic. The same commit re-pins the earlier review records for the changed text. The slide deck for this class
is missing from `added-sources/`, so the lecture-notes record was not changed.

## Applied

| Surface | Correction | Pinpoint |
|---|---|---|
| Frigaliment rule CT-CB-0575, chronology, trade-usage step, takeaway | The burden was the plaintiff's. The newcomer rule is New York law: actual knowledge, or a usage so generally known that knowledge may be inferred (the takeaway had "so settled they should have", the looser Code idea) | C&M 577–578, 580, 583 Note 2 |
| Nanakuli rule CT-CB-0585, chronology, takeaway | A usage counts when the parties are or should be aware of it, and only if reasonably consistent with the express term | C&M 587–588; UCC § 1-303(d)–(e) |
| Nanakuli map topic `course-dealing` | The 1970–71 price protection was course of performance; course-of-dealing evidence had been excluded at trial | C&M 589 |
| Columbia Nitrogen takeaway, trade-usage step | "Reasonably be construed as consistent", unless carefully negated; not "flatly cannot be squared" or "irreconcilable" | C&M 596–598 |
| K-23 node d | Asks whether the usage binds the party charged: § 1-303(d) for the Code, the New York newcomer test in Frigaliment | C&M 577–578, 588; § 1-303(d) |

## Not applied, for Astra

- **Rules & authorities**: all five cases link only Restatement § 21 (intention to be legally bound) in
  `tools/v25/authorities.json` `byNode`. The assigned §§ 20, 201–204 and UCC § 1-303 have entries but no
  links to these cases. Fixing the links is a dataset change that the authorities check governs.
- **Frigaliment's position on the trade-usage timeline**: it sits after the 1952 UCC step and is marked
  "sharpens", which implies it refined the Code rule. It applied pre-Code New York law, and Note 2 (C&M 583)
  asks whether the Code would change the result. Ordering and turn labels belong to the timeline redesign.
- **Flowchart K-23**: node e omits § 1-303(f) and careful negation. Node g has no burden-of-proof outcome
  and no §§ 20/201(3) "no agreement" outcome. Node a confines the usage route to Article 2, so Hurst
  cannot reach it. **K-22** routes course-of-dealing evidence against a complete integration to
  exclusion, which is the trial ruling Columbia vacated. All are structural chart changes; see
  `challenge.md`.
- **Smaller map-entry facts**: Frigaliment Material Facts credits "the intermediary's account" where the
  evidence was Bauer's testimony about Stovicek (C&M 577). Nanakuli Material Facts treats advance notice
  as an alternative to holding the old price, though the opinion couples them (586 n.1, 587). Columbia
  dates the agreement to 1966, but the casebook dates only the plant. The Nanakuli waiver Cold Call
  sentence ("a one-time favor") understates § 2-209(5).
- **Figgie**: statements resting on the essential-purpose discussion (C&M 1044) need checking in the
  Class 25 packet.
- **Teaching gaps** (`comparison.md` (c)): Restatement § 201(1)–(2), whose meaning prevails, is on no case
  surface. Also missing: § 204 omitted terms; the Note 3 non-member cases (Foxco, Flower City, Rispens);
  and the notice rule of § 1-303(g).

## Verification

Build, correction, flowchart, narrative and the four record checks pass. Full `pnpm verify`: `../VERIFY.md`.
