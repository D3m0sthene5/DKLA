# Corpus audit 2026-11, packet OP-01 r1 — Opus reviewer

Branch `audit/corpus-2026-11-19`, base `c3191d2`. Reply to Astra.

**Displayed model and effort.** Model: Claude Opus 5.5 (`claude-opus-5-5`), as
the runtime reports it to me. Effort: the setting passed to me for this run was
15, on a scale I cannot see; I cannot see what label, if any, the interface
displays to the owner, so Astra should take the displayed label from the
owner's screen, not from this line.

**Question audited.** The deference timeline
(`src/data/seedData/timelines-d29894cc2d/00011-deference-66e3766ed9.json`) asks
"How much weight does an agency's reading of a statute get?" and lists
`lrs-i-kisor` (2019) as a step, with the note "Auer deference narrowed: genuine
ambiguity, reasonable reading, authoritative and expert."

## Conclusion

The question does not fit `lrs-i-kisor`. Kisor decides how much weight a court
gives an agency's reading of the agency's **own regulation** (Auer deference,
the doctrine of Auer v. Robbins (1997) and Bowles v. Seminole Rock (1945)). It
does not decide how much weight an agency's reading of a **statute** gets; that
was the Chevron question in 2019, and Kisor treats Chevron as a separate,
parallel doctrine that it cites by analogy. The step note itself is accurate
about Kisor. The mismatch is between the timeline's question and this step, so
a reader who takes the step as an answer to the question will attribute Kisor's
regulatory test to statutory interpretation.

## Pinpoint

Read independently in the official preliminary print, 588 U.S. Part 2
(supremecourt.gov, `588us2r69_g3bi.pdf`), pages 573–80, which are Part II-B of
the opinion of the Court (five Justices) and the first lines of Part III.

- **573–74.** Part II-B opens: "But all that said, Auer deference is not the
  answer to every question of interpreting an agency's rules. Far from it." The
  object throughout is the agency's rules. At 574: "First and foremost, a court
  should not afford Auer deference unless the regulation is genuinely
  ambiguous."
- **574–75.** The statutory cases appear only as comparisons: Mead is cited as
  "adopting a similar approach to Chevron deference," and Chevron's footnote 9
  is cited as "adopting the same approach for ambiguous statutes."
- **576.** "Under Auer, as under Chevron, the agency's reading must fall
  'within the bounds of reasonable interpretation.'" The Court also rejects the
  view of some lower courts that agency constructions of rules get more
  deference than agency constructions of statutes ("But that is not so"). Both
  passages compare two doctrines; neither applies Kisor's test to a statute.
- **576–79.** The "character and context" inquiry (authoritative position,
  substantive expertise, fair and considered judgment) rests on the premise
  that "Congress has delegated rulemaking power, and all that typically goes
  with it, to the agency alone" (577), that is, on the agency's authority over
  its own rule.
- **578–79, footnote 5.** The Court "has denied Auer deference when an agency
  interprets a rule that parrots the statutory text," because the agency gets
  no special authority to interpret its own words when it "has elected merely
  to paraphrase the statutory language."
- **580.** "When it applies, Auer deference gives an agency significant leeway
  to say what its own rules mean."

## Counterexample

Footnote 5 (578–79) is the counterexample. It is the one place in 573–80 where
the agency's reading is, in substance, a reading of statutory words, and there
Kisor says Auer deference does not apply. If the step answered the timeline's
question, the agency's reading in that situation would get Kisor's conditional
controlling weight; Kisor says it gets none under Auer. The answer to that
situation in 2019 came from the statutory line (Chevron, limited by Mead), which
the timeline already carries as separate steps.

The strongest argument for a fit is that 574–76 borrows from Chevron and Mead
and calls the inquiries "similar" and "analogous though not identical." That
shows Kisor sits beside the statutory line; it does not make Kisor an answer to
the statutory question.

## Options for the owner (not applied)

The rule in the owner's brief is that placement follows the sourced
relationship. The sourced relationships between Kisor and this timeline are
analogy (574–76) and, later, contrast with Loper Bright on stare decisis (the
existing edge `lrs-i-kisor` → `lrs-i-statutory-stare-decisis`). Either of these
fixes would match them:

1. Broaden the question to cover both objects, for example "How much weight
   does an agency's reading of a statute, or of its own rule, get?", and mark
   Kisor's step as the parallel regulatory line.
2. Keep the statutory question and show Kisor as a side marker labelled as the
   regulatory counterpart, off the main sequence.

Any change to the timeline is a content edit under AGENTS.md rule 2 and needs
the owner's say-so; I made none.

## Side observation

The same timeline lists Brand X (2005) before Mead (2001). If the steps are
meant to run in date order, Mead should come first. I did not check whether the
order is intentional.

## What I verified and what I did not

- Verified: the timeline record and the `lrs-i-kisor` node at `c3191d2`; the
  remote branch still pointed at `c3191d2` when I started (18:20 ET).
- Verified: the text of 588 U.S. 573–80 in the official preliminary print.
  The shell could not download the PDF (the proxy refused the connection), so I
  read it through a web-fetch text extraction. Quotations above are as that
  extraction returned them; spot-check against the PDF before quoting them in
  the Atlas. Preliminary-print pagination can change in the bound volume.
- Not verified: Chief Justice Roberts's concurrence, which the node says
  distinguishes the Chevron question about statutes. It is outside 573–80 and I
  did not open it.
- Not run: `pnpm verify`. This commit adds one Markdown file under
  `docs/history/` and touches no code or data.
