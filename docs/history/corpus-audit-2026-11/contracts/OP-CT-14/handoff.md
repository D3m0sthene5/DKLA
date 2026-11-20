# OP-CT-14 handoff: Contracts Class 14, plain meaning and extrinsic evidence

Branch `audit/contracts-opus-2026-11-19`, commit `96ebee23`, after the tool fix `098e7343`. 15 corrections:
13 registered in `tools/content-audit/2026-11-19-contracts-opus.json`, and two guarded run-time map-entry
edits (Pacific Gas Reasoning, Trident notes). The same commit re-pins the earlier review records for the
changed text. The lead checked each correction against the cited passage.

## Applied

| Surface | Correction | Pinpoint |
|---|---|---|
| Pacific Gas Cold Call ≈ 0.0, 1.0 | "indemnify" no longer glossed as "repay" losses, which adopted PG&E's own-property reading, the disputed question | C&M 549; 551 n.6 |
| Pacific Gas map Reasoning | Footnote 6: exclusion "would be error" even under a facial-ambiguity rule, not merely "questionable" | C&M 551 |
| Greenfield ≈ 2.0, W.W.W. ≈ 2.0, Trident ≈ 1.2 and 2.1 | "Ambiguity" is language reasonably open to more than one meaning, not "unclear" (Greenfield's silence was unclear but not ambiguous) | C&M 558–559, 564 |
| Greenfield ≈ 3.1 | New York uses the four corners to decide *whether* the writing is ambiguous, then admits outside evidence | C&M 548, 555, 558 |
| W.W.W. rule CT-CB-0553, chronology | New York law; "on its face" | C&M 548, 555, 558 |
| Greenfield takeaway | New York law; the owner still owed the contract's royalties | C&M 559, 560 n.2 |
| Trident map notes, brief Holding | Remand for evidence of intended meaning, not evidence "to vary" the documents; the finding was "as written" | C&M 550–551, 562–563 |
| K-23 node c edge | "Not reasonably susceptible even after considering the offered evidence"; the old edge repeated the Trident district court's dismissal | C&M 551, 563 |
| Lecture notes, topic 1 | Slides 3 and 15's "within its scope" and collateral-agreement conditions restored | slides 3, 15 |

## Not applied, for Astra

- **Hall and Elliot map entry** (`00394-ai-interpretation-study`, not in the session surfaces): it describes
  the piece as being about legal interpretation rules. The piece actually reports an AI-graded clarity rubric
  applied to about 10,000 Kalshi and Polymarket resolution rules (Supp. 46–47). The class hub (`00407`) omits
  "Methods of Interpreting Ambiguous Contracts", which the syllabus lists. Both entries need rewriting, not a
  one-phrase correction.
- **K-23 node f** does not say who decides meaning (judge or jury; Parsons and Meyers v. Selznick, C&M 574).
- **Pacific Gas rule line** lacks "Under California law"; and "as expressed in the contract" is dropped in
  one paraphrase (`challenge.md` section B).
- **Glossary**: the Wex entries say contra proferentem applies without condition ("adhesion contract" says
  "always"); C&M 567 treats it as a last resort. The `frcp-11` entry linked to Trident shows the current
  Rule 11, not the 1988 text.
- **Rules & authorities**: Restatement § 21 and UCC § 2-202 attached to cases they do not govern.
- **Teaching gaps** (`comparison.md` (c)): who decides meaning and the scope of review (C&M 574–575);
  contra proferentem as a last resort among the canons (567); the two-stage rule (548); Delta Dynamics and
  the Mosk dissent (552–553); contracting out of Pacific Gas (556); vagueness versus ambiguity (564).

## Verification

Build, correction, flowchart, narrative and the four record checks pass. Full `pnpm verify`: `../VERIFY.md`.
