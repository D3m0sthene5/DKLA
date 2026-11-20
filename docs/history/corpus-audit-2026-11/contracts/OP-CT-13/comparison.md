# OP-CT-13 comparison: Atlas surfaces against the assigned sources

Learn-list points are L1–L17 in learn-list.md. Pinpoints: C&M printed page; Supp. = supplement page; R2 = Restatement (Second); S = slide. The 17 November corrections in prior-corrections.json are not re-reported. Read-only checks beyond ct13-surfaces.md: tools/r19/data/timelines.json (interpretation timeline, all steps), tools/flowcharts/data/contracts.json (K-22 and K-02, all nodes), tools/r19/data/rlcc.json and tools/v25/authorities.json (for the RLCC numbering and for authority links).

## (a) Coverage

| Point | Where the Atlas teaches it (surface, field) | Status |
|---|---|---|
| L1 What the rule is: prior or contemporaneous terms; bars prior writings too; substantive law; criticism and defense | K-22 node i (prior or contemporaneous only) | Partly. Nothing says the rule is substantive, that it bars prior letters and emails, or records the Law Commission and Posner positions (C&M 529–530). |
| L2 Consequences of substantive status (no waiver by failure to object; Erie) | none | Missing |
| L3 Rationales (R2 § 213 discharge; McCormick's jury control; Masterson's credibility basis; S12 list) | Lecture notes "Policy considerations" (S12); Masterson Cold Call episode 3 | Partly. The § 213 discharge rationale and McCormick's view (C&M 535 Note 2) are absent. |
| L4 Restatement two steps; the court decides; §§ 209, 210, 213, 215, 216 | Lecture notes "Terminology and effect of integration"; R&A restatement-209; K-22 nodes b–d; Gianni brief Reasoning ("The court, not the jury") | Partly. § 216(2) (separate consideration; "might naturally be omitted") and § 210 cmt b are not stated anywhere. R&A §§ 210, 213–216 exist but have no links to this session (see Other defects). |
| L5 § 214 admissible purposes; S7 list | Lecture notes "What extrinsic evidence can and cannot do"; K-22 node a | Covered (from S7); § 214 itself is not cited. |
| L6 Gianni | Map entry, brief CT-SUP-0037, takeaway, Cold Call, timeline step 0, chronology, K-22 nodes d–e | Covered. The "appears complete, so conclusively presumed" four-corners step (Supp. 38) is not stated (gap 5). |
| L7 Mitchill as the older four-corners view | Timeline step CT-CB-0530 (three conditions) | Partly. The three conditions are on unassigned p. 531; the assigned points ("may not be proved," C&M 535 Note 1; Mitchill as the face-of-instrument example, C&M 541 Note 2) are absent. |
| L8 Masterson | Map entry, brief CT-CB-0536, takeaway, Cold Call, timeline step 4, chronology, K-22 nodes b–d, f | Covered |
| L9 Four corners versus context; the four "natural" formulations | Masterson brief Reasoning (First Restatement § 240(1)(b); UCC cmt 3); Gianni brief ("naturally and normally"); Masterson learning.topics.integration ("rejects the four-corners test") | Partly. R2 § 216(2)(b)'s "might naturally be omitted" and § 210 cmt b are missing, and no surface sets the tests side by side. |
| L10 Merger clauses: strong evidence, the split on conclusiveness, weight by sophistication | Lecture notes (S9: "relevant ... but not dispositive"); K-22 node b ("merger language"); Masterson Cold Call episode 3 | Partly. The split among courts and the sophistication factor (C&M 542) are missing. |
| L11 RLCC parol evidence section, comments, affirmations rule | Lecture notes "Contentious issues and consumer contracts"; rlcc-9 and rlcc-8 entries (outside the surfaces file) | Partly. No surface says that C&M 543 and the assigned selection number the provision § 8, and comment 2 (no four-corners test) and comment 3 (merger clauses do not control) are absent. |
| L12 Bollinger | Map entry, brief CT-CB-0543, takeaway, Cold Call, timeline step 3, chronology, K-22 node h | Covered |
| L13 Validity and fraud (sham; false recital; fraud in the inducement; fraud versus warranty; promissory fraud split; merger clause and fraud) | Lecture notes "Psenicska and fraud" (slides only); K-22 node h ("Evidence of fraud or mistake can serve a different purpose") | Partly. None of the C&M 544–545 note content is carried. |
| L14 UCC § 2-202 and comments; Dentco problem | R&A ucc-2-202 (black letter); Masterson brief (cmt 3) | Partly. Comment 1 (no ambiguity finding needed for course of dealing or usage), the point that a complete-integration finding bars only clause (b), and § 2-202's silence on fraud (§ 1-103(b)) are missing. |
| L15 Subsequent agreements and NOM clauses (common law, N.Y. GOL § 15-301, reliance, UCC § 2-209(2), (4), (5), CISG art. 29(2)) | K-22 node i (a later change is outside the rule) | Mostly missing. The ucc-2-209 R&A entry exists but links only to Class 11 material. |
| L16 CISG art. 8 and TeeVee Toons | Map entry, brief CT-SUP-0040, takeaway, Cold Call, timeline step 10, chronology, K-02 node b; lecture notes "International approaches" | Covered. Footnote 2 (writings are not presumed integrations under the CISG, Supp. 44) and art. 29(2) are absent. |
| L17 Framing slides (S2, S4–S6) | Lecture notes "Sources of terms" | Covered |

## (b) Errors

E1. Timeline "interpretation", step bollinger, field turn. Category (iii) overstatement.
- Current text: `"turn": "widens"` within the step whose `"id": "bollinger"` (the string also appears in the masterson and pacific-gas steps, where it is not challenged, so match it inside the bollinger step)
- Replacement: `"turn": "applies"`
- Pinpoint: Supp. 39 (Gianni); C&M 544 (Bollinger).
- Reason: Gianni, decided by the same court in 1924, already recognized fraud, accident or mistake as grounds for evidence that would lead a chancellor to reform the writing, so Bollinger applies an existing exception rather than widening the rule.

E2. Lecture notes, topic "Terminology and effect of integration", field body. Category (iii) overstatement.
- Current text: `and cannot be supplemented.`
- Replacement: `and cannot be supplemented by consistent additional terms within its scope (§ 216(1)).`
- Pinpoint: C&M 536 Note 3; R2 § 216(1); UCC § 2-202(a)–(b) and cmt 2.
- Reason: the bar reaches only consistent additional terms within the writing's scope, and under § 2-202, which the same topic says the slide maps, a complete-integration finding bars only clause (b); course of dealing, usage and performance may still explain or supplement "any writing."

E3. Flowchart K-22, node d, field detail. Category (ii) missing condition.
- Current text: `Within a complete integration, even a consistent addition is ordinarily excluded.`
- Replacement: `Within the scope of a complete integration, even a consistent addition is ordinarily excluded.`
- Pinpoint: C&M 536 Note 3; R2 §§ 213(2), 216(1).
- Reason: exclusion applies only "to the extent that the additional term is within the scope of the written agreement," and the node's own edges turn on scope.

E4. Timeline "interpretation", step masterson, field note. Category (ii) missing condition.
- Current text: `California admits a collateral oral term the parties might naturally have made separately`
- Replacement: `California admits a consistent collateral oral term the parties might naturally have made separately`
- Pinpoint: C&M 538 (accuracy policy "adequately served by excluding parol evidence of agreements that directly contradict the writing"); C&M 537.
- Reason: Masterson's natural-separation test admits only terms that do not contradict the writing; the brief rule and the chronology note state this condition, but the timeline note drops it.

E5. Map entry gianni, field notes (second paragraph). Category (ii) missing condition.
- Current text: `The test the court applied: if the subject of the alleged oral agreement is one that would naturally and normally have been included in the written contract`
- Replacement: `The test the court applied: if the writing appears to be the parties' complete contract and the subject of the alleged oral agreement is one that would naturally and normally have been included in it`
- Pinpoint: Supp. 38.
- Reason: Gianni first requires that "the writing must be the entire contract between the parties if parol evidence is to be excluded," and only then compares the two agreements.

E6. Map entry teevee-toons, field learning.topics.integration. Category (i) misstatement of what the court did.
- Current text: `The dispute turned on whether the printed merger clause made the quotation a final, complete writing`
- Replacement: `The dispute turned on whether both parties intended to be bound by the printed Terms and Conditions and their merger clause`
- Pinpoint: Supp. 43–44 and n.2.
- Reason: the court did not ask the domestic integration question; under art. 8 it asked whether TVT and Schubert shared the intent to be bound by the Terms and Conditions or the merger clause, and it noted that under the CISG writings are not presumed to be integrations.

E7. Map entry teevee-toons, field sections.Reasoning. Category (iii) overstatement (low priority).
- Current text: `could support a finding that the seller’s agent knew the buyer understood`
- Replacement: `could support a finding that the seller’s agent could not have been unaware that the buyer understood`
- Pinpoint: Supp. 43.
- Reason: the court held only that the evidence raised a genuine question whether Schubert's agent "could not have been unaware" of TVT's interpretation, which is the Article 8(1) standard; the excerpt makes no finding of actual knowledge.

Other defects (not legal misstatements):
- Map entry teevee-toons, field learning.topics."cisg-framework": the text `The entry's existing link uses the id 'cisg', which does not appear in the concept list` is an internal data note shown as student content. Replace it with a substantive sentence, for example: "TeeVee Toons applies the CISG because the parties had places of business in different Contracting States (art. 1(1)(a)) (Supp. 41)."
- Rules & authorities links (tools/v25/authorities.json): Restatement (Second) § 21 (Intention to Be Legally Bound) is linked to all four principal cases and appears on each case's surface, while §§ 210, 213, 214, 215 and 216, all assigned, have no links. The § 21 link appears to be an artifact; the assigned sections should be linked to the session.

Atlas statements not in the assigned excerpts (not errors; verify before relying on them): Gianni's $3,694 verdict, the judgment n.o.v. motion, and the "immediate forfeiture" wording (these Supp. 37–38 passages are OCR gaps); Masterson's decision and rehearing dates, Burke's escrow and attorney facts and his "unpredictable" criticism, and majority nn.2–3; Bollinger's date, the Bell dissent, Cohen's non-participation, and the after-discovered-evidence ruling; TeeVee's rulings on SGI standing, fraud, negligence, Article 39 and damages, and Neuber's affiliation with Rodico. The lecture-note claim that "Slide 8's table maps Restatement and UCC § 2-202 terms" cannot be checked because the extracted slide 8 has only its title.

## (c) Teaching gaps, ranked by exam importance

1. No-oral-modification clauses (L15). Surface: K-22 node i, detail. Draft: "The parol evidence rule does not bar proof of a later oral modification. At common law a no-oral-modification clause traditionally does not prevent one, because the parties can modify the clause itself (Wagner; Beatty v. Guggenheim). N.Y. Gen. Oblig. Law § 15-301(1) and UCC § 2-209(2) enforce such clauses, but reliance can still defeat them (Universal Builders), and under § 2-209(4)–(5) a failed modification can operate as a waiver that cannot be retracted after a material change of position (C&M 546–547)."
2. Fraud and validity (L13). Surface: K-22 node h, detail. Draft: "The rule assumes a valid writing, so it does not bar evidence that the writing was a sham, that a recital of consideration is false, or that a party was fraudulently induced (R2 § 214(d); C&M 544). A claim of a fraudulent representation made during negotiations is not barred, but a claim of an express warranty made during negotiations is. Courts divide on promissory fraud that contradicts the writing (Lovejoy; contra Alling) (C&M 545)."
3. Merger clause weight (L10). Surface: K-22 node b, detail, or the lecture-note topic on merger clauses. Draft: "A merger clause is strong evidence of complete integration. Some courts treat it as conclusive (Howard v. Perry), others as highly persuasive but not dispositive (Jenkins; Behrens; Bellman). It carries great weight between sophisticated parties who negotiated with counsel (Telecom Int'l v. AT&T) and little weight when inconspicuous in a form given to an unsophisticated buyer (Seibel) (C&M 542)."
4. How complete integration is shown and rebutted (L4, L9). Surface: lecture-note topic "Terminology and effect of integration," or K-22 node b. Draft: "The court decides whether a writing is integrated and whether completely (R2 §§ 209(2), 210(3)). A writing cannot prove its own completeness, and the court may look widely at the surrounding circumstances (§ 210 cmt b). A writing is not completely integrated if it omits a consistent term agreed for separate consideration or one that 'might naturally be omitted from the writing' (§ 216(2))."
5. The competing tests side by side (L9, L7). Surface: interpretation timeline guide, or the Gianni and Masterson map notes. Draft: "Older cases decided integration from the face of the writing: Gianni conclusively presumed that a writing appearing complete contained the whole engagement (Supp. 38), and C&M offers Mitchill as an example of that view (C&M 541 Note 2). Masterson asked whether the term 'might naturally be made as a separate agreement' (C&M 538). The UCC excludes a term only if it 'would certainly have been included' (§ 2-202 cmt 3)."
6. UCC § 2-202 specifics (L14). Surface: R&A ucc-2-202, or the lecture notes. Draft: "Under § 2-202 a final writing cannot be contradicted by a prior agreement or a contemporaneous oral agreement. It can always be explained or supplemented by course of dealing, usage of trade and course of performance, with no prior finding of ambiguity (cmt 1(c)). A complete-and-exclusive finding bars only consistent additional terms (clause (b)). The section says nothing about fraud, so common law applies through § 1-103(b) (C&M 545)."
7. What "substantive" means (L1, L2). Surface: concept or lecture notes. Draft: "The rule bars prior writings as well as oral statements, and it is substantive law, not a rule of evidence: failure to object does not waive it (Gajewski), and a federal court applies the state's rule under Erie (Betz Labs.) (C&M 529–530)."
8. Rationales (L3). Surface: lecture-note topic "Policy considerations." Draft: "One rationale is that a later integrated agreement discharges earlier ones (R2 § 213). Another is McCormick's: the rule lets judges control juries inclined to side with the economic underdog who relies on the spoken word (C&M 535 Note 2)."
9. RLCC numbering and comments (L11). Surface: lecture-note topic "Contentious issues and consumer contracts" and rlcc-9. Draft: "C&M 543 and the assigned selection number this provision § 8 (the selection prints the 2019 Tentative Draft; C&M quotes Tent. Draft No. 2, 2022); the slide and the Official Text number it § 9. In consumer contracts the four-corners test does not apply, and a merger clause does not control whether standard terms are a final expression (cmts 2–3)."
10. TeeVee footnote 2 and CISG art. 29(2) (L15, L16). Surface: TeeVee map notes. Draft: "Under the CISG writings are not presumed to be integrations (Supp. 44 n.2), but art. 29(2) does enforce a clause requiring modifications to be in writing, subject to a reliance exception (C&M 547)."

Unresolved in the sources (see learn-list): whether merger clauses are conclusive; whether context may inform integration; the promissory-fraud split; whether a merger clause bars fraud evidence; the Dentco, Ballard and New York-law questions; the competing readings of § 2-209(5); and the RLCC numbering, which decides whether the assigned "§ 9" is the parol evidence section or the derogation rule.
