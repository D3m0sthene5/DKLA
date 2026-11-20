# OP-CT-15 challenge: commercial context and past dealings

Sources used: `ct15-casebook.txt` (C&M printed pp. 575–599, cited "C&M") and `/home/claude/work/src/sel.txt` (cited "sel." with line numbers): Restatement § 20 (sel. 1114), §§ 200–204 (sel. 5645–5735), UCC § 1-303 (sel. 18015–18062, comments to 18160), § 2-202 (sel. 18931–18990), § 2-209 (sel. 19317–19341, used only because § 1-303(f) incorporates it). Items in `prior-corrections.json` were skipped unless the corrected text is itself wrong; two such items are challenged below and are marked as prior corrections.

Verdict key: SUPPORTED / OVERSTATED / MISSING CONDITION / CHANGES RESULT / UNSUPPORTED BY ASSIGNED SOURCES.

---

## A. Frigaliment

### A1. Burden of proof stated as a rule for whoever claims the narrower meaning
- **Surfaces:** Effective brief CT-CB-0575: rule; Chronology 'course-chronology-0' step 157 (same text); Takeaway (tools/r19/data/takeaways.json); Timeline 'trade-usage' step 2 (note).
- **Current text:** brief and chronology: "A party who asserts that an ambiguous contract term was used in the narrower of two possible senses bears the burden of proving that meaning"; takeaway: "the party claiming the narrower one has to prove it"; timeline: "The party claiming the narrower meaning of an ambiguous term must prove it".
- **Verdict:** OVERSTATED (in an inverted posture it changes the result).
- **Counterexample:** In the casebook's "slaw cabbage" problem (C&M 584), the seller Williams claims the narrower meaning (large cabbage only) as a defense, and the buyer Curtin sues for damages on the broader meaning. Under the Atlas wording the defendant seller bears the burden because it claims the narrower meaning. Friendly put the burden on the plaintiff because it was the plaintiff's "burden of persuasion" on its warranty claim (C&M 576), and his conclusion is "For plaintiff has the burden of showing that 'chicken' was used in the narrower rather than in the broader sense" (C&M 580). Nothing in the opinion makes narrowness the reason for the burden, so the Atlas wording would place the burden on the wrong party in a case like Williams. Note 1 (C&M 581) also asks whether "what is chicken?" was really the issue the court had to decide.
- **Pinpoint:** C&M 576 (lines 115–116), 580 (lines 356–358), 581 Note 1, 584 Problem.
- **Replacement (brief rule and chronology, 43 words):** "A plaintiff whose claim requires an ambiguous term's narrower meaning bears the burden of persuasion on it. Under pre-Code New York law, a usage binds a party outside the trade only if actually known or so notorious and universal that knowledge is presumed."
- **Replacement (takeaway, 68 words, two sentences):** "The buyer suing for breach had to prove that its contracts used 'chicken' in the narrower sense, and it lost because the evidence did not establish that meaning. Under the pre-Code New York rule the court applied, a usage bound the seller, a newcomer treated as outside the trade, only if it actually knew the usage or the usage was so notorious and universal that knowledge was presumed."
- **Replacement (timeline 'trade-usage' step 2 note):** "The plaintiff buyer bore, and failed to carry, the burden of proving the narrower meaning of an ambiguous term. Under pre-Code New York law, a usage binds a party outside the trade only if known or so notorious that knowledge is presumed."

### A2. Newcomer-knowledge rule stated without its pre-Code New York scope
- **Surfaces:** Effective brief CT-CB-0575: rule and Chronology step 157 ("a trade usage binds a newcomer only if actually known or so established that knowledge is chargeable"); Takeaway ("Newcomers to a trade are bound by its usage only if they knew it or it was so settled they should have."); Timeline 'trade-usage' step 2 ("a usage binds a newcomer only if known or so general as to be presumed"). In the trade-usage timeline this step follows the 1952 UCC step and is tagged "sharpens", so it reads as a refinement of the Code rule.
- **Verdict:** MISSING CONDITION (changes the result under the UCC).
- **Counterexample:** Friendly applied Wigmore and the New York rule for a party "not a member of the trade or other circle" (C&M 577–578), under New York Personal Property Law § 95 (C&M 576). Under the Code, a usage "in the vocation or trade in which they are engaged" applies without any knowledge requirement; the knowledge test ("of which they are or should be aware") applies to other usages (UCC § 1-303(d), sel. 18034–18038). Nanakuli reads the Code the same way: "A party is always held to conduct generally observed by members of his chosen trade," and is held to more general practices only to the extent of actual knowledge or inexcusable ignorance (C&M 588). A seller who has entered the poultry trade, as B.N.S. had in 1957, could therefore be bound under § 1-303 by a proved poultry-trade usage it did not know. A student who applies the Atlas rule to a UCC case would wrongly require proof of knowledge. Note 3 (C&M 584) leaves the point open: it asks whether the newcomer seller "would have been bound" by a proved usage and contrasts Foxco (a nonmember bound without knowledge) with Flower City (a neophyte had no reason to know). The Atlas states as settled a rule that the casebook treats as open.
- **Pinpoint:** C&M 576, 577–578, 584 Note 3, 588; sel. 18034–18038.
- **Replacement:** use the A1 replacements, which confine the knowledge rule to pre-Code New York law. Timeline 'trade-usage' step 2 `turn`: replace "sharpens" with "applies" (pre-Code law), or move the step ahead of the 1952 UCC step and add the context "Decided under pre-Code New York law; compare UCC § 1-303(d)".

### A3. Interpretation timeline effect label (prior correction, itself wrong)
- **Surface:** Timeline 'interpretation' step 2, field `effect`.
- **Current text:** "Deciding what “chicken” meant"
- **Verdict:** OVERSTATED.
- **Counterexample:** A student reading this label would say Frigaliment holds that "chicken" includes stewing hens. The court held that it was "unnecessary to determine" the buyer's intent because the plaintiff had not carried its burden (C&M 580), and Note 1 (C&M 581) asks whether "what is chicken?" was the issue at all. The same step's `note` states the holding correctly, so the label contradicts it.
- **Pinpoint:** C&M 580 lines 353–358; 581 Note 1.
- **Replacement:** "Failing to prove a narrower meaning"

### A4. Map Holding says the decision determines the contracts' meaning
- **Surface:** frigaliment, Map entry: sections.Holding.
- **Current text:** "The decision determines the meaning of these contracts; it does not supply a universal definition of chicken."
- **Verdict:** OVERSTATED.
- **Counterexample:** The same point as A3. A later court relying on this sentence would treat Frigaliment as an adjudication that these contracts used the broad meaning. The judgment rests on the plaintiff's failure of proof (C&M 580).
- **Pinpoint:** C&M 580.
- **Replacement:** "The decision rests on the buyer's failure to carry that burden; it does not supply a universal definition of chicken."

### A5. Cold Call plain-English sentence on price recasts the argument as the seller's motive
- **Surface:** frigaliment, Cold Call plain-English sentences, at 3.1, `plain`.
- **Current text:** "Even if 33 cents was closer to the young-chicken price, it made no sense for the seller to agree to sell young chickens at a loss."
- **Verdict:** CHANGES RESULT.
- **Counterexample:** Friendly's point concerns what the buyer could reasonably have expected: "Plaintiff must have expected defendant to make some profit—certainly it could not have expected defendant deliberately to incur a loss" (C&M 579). He then notes that the market evidence "may not have been sufficiently brought home" to the buyer (C&M 580). The relevant question is the one Restatement § 201(2)(b) asks: what the other party knew or had reason to know (sel. 5653–5662). The plain version makes the seller's own economics the reason. It invites a student to rely on a party's undisclosed business reasons, which the court said "would not be significant if this did not coincide with an objective meaning" (C&M 580).
- **Pinpoint:** C&M 579 lines 303–308; 580 lines 347–356; sel. 5649–5662.
- **Replacement:** "Saying 33 cents was closer to the young-chicken price did not explain how the buyer could have expected the seller to sell young chickens at a deliberate loss."

### A6. Lecture notes say the government standards were "incorporated"
- **Surface:** Lecture notes record, topic "Frigaliment and Hurst on specialized meaning", body.
- **Current text:** "Frigaliment tested the disputed meaning of chicken against incorporated government standards"
- **Verdict:** OVERSTATED.
- **Counterexample:** The court did not decide that the regulations were incorporated by reference. It found "force in defendant's argument that the contract made the regulations a dictionary" (C&M 579) and described the regulations as ones "to which the contract made at least oblique reference" (C&M 580). Note 3 (C&M 581) treats incorporation by reference as its own problem (Wilcox). A student who treats the regulation as incorporated would apply it as a binding term rather than as interpretive evidence weighed against conflicting trade testimony.
- **Pinpoint:** C&M 579 lines 285–293; 580 lines 350–351; 581 Note 3.
- **Replacement:** "Frigaliment tested the disputed meaning of chicken against government classifications to which the contract made at least oblique reference, market price, communications, and evidence of trade practice."

### A7. Map notes describe a note question that is not in the excerpt
- **Surface:** frigaliment, Map entry: notes.
- **Current text:** "ask which party should bear uncertainty about unfamiliar terminology"
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES (does not change a result).
- **Basis:** Notes 1–4 (C&M 581) ask about the framing of the issue, corporate intent, incorporation by reference, and how usage was shown. Note 3 on the next pages (C&M 584) asks whether the newcomer would have been bound by a proved usage. No note in the excerpt asks this question.
- **Replacement:** "The notes ask whether Friendly framed the issue correctly, how a corporation can have an intention, how incorporated regulations are read, and how usage is proved; a later note asks whether the newcomer seller would have been bound by a proved usage."

---

## B. Hurst

### B1. Takeaway omits that the usage was alleged and that both parties were alleged to be traders who knew it
- **Surface:** hurst, Takeaway (tools/r19/data/takeaways.json).
- **Current text:** "Evidence that horse-meat traders treat 49.5 percent protein as meeting a 50 percent minimum could be used to read the written contract, even though it seemed unambiguous."
- **Verdict:** MISSING CONDITION.
- **Counterexample:** Suppose the buyer is a feed mill outside the horse-meat-scrap trade that did not know of the rounding practice. The Atlas wording suggests the rounding usage still governs. Hurst's pleading alleged that "both parties were members of a group of traders in horse meat scraps and that the defendant was aware of a usage" (C&M 582), and the appeal reviewed only a judgment on the pleadings. Under § 1-303(d), a usage binds a party outside the trade only if that party is or should be aware of it (sel. 18034–18038), and Rispens (C&M 584) shows a usage failing against a party in a different trade.
- **Pinpoint:** C&M 582 (bracketed facts), 583; 584 Note 3; sel. 18034–18038.
- **Replacement (53 words, two sentences):** "Numbers that look exact can carry a special trade meaning. Because the seller alleged that both parties were horse-meat-scrap traders and that the buyer knew of a usage treating at least 49.5 percent protein as 50 percent, the court reversed judgment on the pleadings so he could prove it, even though the written term seemed unambiguous."

### B2. Trade-usage timeline origin step omits the membership condition
- **Surface:** Timeline 'trade-usage' step 0 (note).
- **Current text:** "Trade usage may give seemingly plain words or figures a special trade meaning, with no prior finding of ambiguity (Oregon)."
- **Verdict:** MISSING CONDITION (same counterexample as B1).
- **Replacement:** "Between members of a trade who know its usage, the usage may give seemingly plain words or figures a special meaning without a prior finding of ambiguity (Oregon; reversal of a judgment on the pleadings)."

---

## C. Nanakuli

### C1. The 1970–71 protections are labeled course of dealing as well as course of performance
- **Surface:** nanakuli, Map entry: learning.topics, key "course-dealing".
- **Current text:** "Shell's price protection on the 1970 and 1971 increases was treated as course of performance/course of dealing reinforcing the trade usage."
- **Verdict:** CHANGES RESULT.
- **Counterexample:** The court defined the terms differently: "Course of performance under the Code is the action of the parties in carrying out the contract at issue, whereas course of dealing consists of relations between the parties prior to signing that contract. Evidence of the latter was excluded by the District Judge; evidence of the former consisted of Shell's price protection of Nanakuli in 1970 and 1971" (C&M 589). The label matters for two reasons. First, if the conduct and an express term cannot reasonably be reconciled, course of performance prevails over course of dealing (§ 1-303(e)(2)). Second, only a course of performance can show waiver or modification under § 1-303(f) (sel. 18042–18053). A student who classifies conduct under the contract as course of dealing would apply the wrong priority and miss the waiver question that Shell actually litigated.
- **Pinpoint:** C&M 589 lines 806–810; sel. 18042–18053.
- **Replacement:** "Shell's price protection on the 1970 and 1971 increases under the 1969 contract was course of performance, not course of dealing (evidence of the parties' prior dealings was excluded at trial); the jury could treat it as reinforcing the trade usage."

### C2. Waiver preference misdescribed (Map Reasoning)
- **Surface:** nanakuli, Map entry: sections.Reasoning.
- **Current text:** "A preference for construing ambiguous acts as waivers did not require that characterization when the evidence supported a course of performance."
- **Verdict:** CHANGES RESULT.
- **Counterexample:** Suppose a seller's conduct is genuinely ambiguous between performance and waiver, and there is some evidence that it was performance. Under the Atlas wording the jury may call it course of performance whenever "the evidence supported" that reading. The court held instead that "The preference for waiver only applies, however, where acts are ambiguous," and that the jury had to decide first "whether those acts were ambiguous, and if not, whether they constituted waivers or a course of performance" (C&M 590). The jury could find the acts unambiguous because they were the only two occasions calling for protection and because Blee's memorandum spoke of the need to "bargain" over the extent of protection (C&M 589–590). For ambiguous acts the Comment's preference for waiver applies.
- **Pinpoint:** C&M 589 lines 813–834; 590 lines 835–850.
- **Replacement:** "The Comment's preference for construing conduct as waiver applies only where the acts are ambiguous; the jury could find the two protections, the only occasions calling for them, unambiguous and therefore a course of performance."

### C3. Cold Call plain-English sentence defines waiver as "a one-time favor"
- **Surface:** nanakuli, Cold Call plain-English sentences, at 4.0 (second entry), `plain`.
- **Current text:** "Courts prefer \"construing\" (interpreting) unclear conduct as a \"waiver,\" a one-time favor, which keeps parties flexible"
- **Verdict:** CHANGES RESULT.
- **Counterexample:** A seller waives the posted-price term for the remainder of a quarter, and the buyer relies on that waiver in placing orders. If a waiver were "a one-time favor," the seller could insist on the posted price at the next delivery without notice. Under UCC § 2-209(5), which § 1-303(f) incorporates, a waiver affecting an executory portion lasts until it is retracted "by reasonable notification received by the other party," and retraction is barred if it "would be unjust in view of a material change of position in reliance" (sel. 19337–19341). The Comment quoted in Nanakuli ties the preference for waiver to "the provisions on the reinstatement of rights waived" (C&M 590). The plain version also drops the condition that the preference applies only where the acts are ambiguous (see C2).
- **Pinpoint:** C&M 590 lines 837–846; sel. 18051–18053, 19337–19341.
- **Replacement:** "Where it is hard to tell whether conduct explains the agreement or \"waives\" (gives up) a contract right, the Code prefers waiver, which can later be retracted for future performance, to keep contracts flexible and prevent surprise or hardship. That preference applies only to ambiguous acts, and jurors could find these episodes unambiguous evidence of what the agreement meant."

### C4. Map Material Facts presents advance notice as an alternative to holding the price
- **Surface:** nanakuli, Map entry: sections.Material Facts.
- **Current text:** "Protection could take the form of advance notice or continued sales at the old price for a specified quantity or period."
- **Verdict:** CHANGES RESULT.
- **Counterexample:** Suppose a supplier gives six weeks' notice but refuses to hold the old price for tonnage already committed. Under the Atlas wording it has provided price protection. The opinion defines the practice as "extending the old price for a period of time after a new one went into effect or charging the old price for a specified tonnage," and adds that "In addition, several months advance notice was given" (C&M 586 n.1). It also says protection "consisted of advance notices of increases, coupled with charging the old price for work committed" (C&M 587). Notice was relevant separately to the good-faith theory (C&M 591–592); it was not an alternative form of the usage.
- **Pinpoint:** C&M 586 n.1; 587 lines 700–702; 591–592.
- **Replacement:** "Protection consisted of advance notice of increases coupled with charging the old price, either for a period of time or for a specified tonnage committed at that price."

### C5. Interpretation timeline: the "asphalt-market" trade and a jury finding stated as an outcome
- **Surface:** Timeline 'interpretation' step 6 (note).
- **Current text:** "The Hawaii asphalt-market evidence supported price protection in this transaction."
- **Verdict:** CHANGES RESULT.
- **Counterexample:** "Asphalt market" is the trade definition Shell argued for and lost: Shell asked the court to define the trade "as the sale and purchase of asphalt in Hawaii." The court held that the judge properly defined it "as the asphaltic paving trade in Hawaii, rather than the purchase and sale of asphalt alone," which admitted evidence of aggregate suppliers' practice (C&M 586–587). A student who limits the trade to asphalt sellers would exclude the aggregate evidence on which the verdict rested. In addition, the appellate court held only that "a reasonable jury could have found" incorporation (C&M 591); it did not itself find price protection.
- **Pinpoint:** C&M 586 lines 637–663; 587 lines 694–705; 591 lines 907–911.
- **Replacement:** "Trade usage and course of performance can qualify the written price term when reasonably construed as consistent with it. Evidence from Hawaii's asphaltic paving trade, including aggregate suppliers, let the jury find price protection in this contract."

### C6. Brief rule and Chronology omit the awareness and well-settled conditions
- **Surfaces:** Effective brief CT-CB-0585: rule; Chronology 'course-chronology-0' step 278 (same text).
- **Current text:** "Under the UCC, trade usage and course of performance are part of the parties' agreement and may qualify an express term, such as a posted-price term, so long as they can reasonably be construed as consistent with it, without any showing of ambiguity."
- **Verdict:** MISSING CONDITION.
- **Counterexample:** The first of the four legal questions in Nanakuli was "how broad was the trade to whose usages Shell was bound" (C&M 587). Shell was bound by the paving trade's usage only because it "should have been aware" of it, given that it dealt "constantly and almost exclusively on Oahu with one asphalt paver" (C&M 588–589). The court also said usages "still must be well settled" (C&M 591). A supplier with no tie to the paving trade and no reason to know its practices would, under the Atlas rule, still be subject to the usage. Section 1-303(d) (sel. 18034–18038) and Rispens (C&M 584) reject that result.
- **Pinpoint:** C&M 587–589, 591; sel. 18034–18038.
- **Replacement (46 words):** "Under the UCC, a usage of the trade in which the parties are engaged, or of which they are or should be aware, and a course of performance may qualify an express posted-price term without a showing of ambiguity, if reasonably construed as consistent with it."

### C7. Takeaway states unconditionally that trade practice is part of the contract
- **Surface:** nanakuli, Takeaway (tools/r19/data/takeaways.json).
- **Current text:** "Under the Code, trade practice and the parties' own past performance are part of the contract."
- **Verdict:** OVERSTATED (same counterexample as C6). The sentence also drops the condition that the practice be reasonably construed as consistent with the express terms; without it, express terms prevail (C&M 590–591; sel. 18042–18050). The second sentence ("could be qualified") states the jury posture correctly.
- **Replacement (54 words, two sentences):** "Under the Code, a trade usage the parties knew or should have known, and their course of performance, can be part of the agreement when reasonably consistent with its express terms. A jury could find that the paving trade's price-protection practice qualified a posted-price term, with no need to first find the writing ambiguous."

### C8. Cold Call plain-English hierarchy sentences omit § 1-303(f)
- **Surfaces:** nanakuli, Cold Call plain-English sentences, at 4.1, `plain` ("\"Express terms\" (the written terms) won if they couldn't reasonably be reconciled with the practices, followed in order by"); columbia-nitrogen, Cold Call plain-English sentences, at 3.1, `plain` ("the \"express terms\" (the written words) won where custom or past dealing could not reasonably be fitted with them").
- **Verdict:** MISSING CONDITION.
- **Counterexample:** A buyer repeatedly accepts late deliveries without objection under a contract with a fixed delivery date. Under the plain version, the written date simply "wins." Section 1-303(e) opens "Except as otherwise provided in subsection (f)," and subsection (f) makes a course of performance "relevant to show a waiver or modification of any term inconsistent with the course of performance," subject to § 2-209 (sel. 18042–18053). Nanakuli treated the waiver question as one for the jury (C&M 590). The glosses "(the written terms)" and "(the written words)" are also too narrow, because § 1-303(e) speaks of "the express terms of an agreement," and those are not limited to written terms.
- **Pinpoint:** sel. 18042–18053; C&M 590.
- **Replacement (Nanakuli 4.1):** "\"Express terms\" (terms the parties actually stated) won if they couldn't reasonably be reconciled with the practices, followed in order by performance of this contract, past dealing, and trade usage; but a course of performance could still show that a party waived or modified an inconsistent term. Evidence of that context could be considered without facial ambiguity or an incomplete writing."
- **Replacement (Columbia 3.1):** "Under § 8.1-205(4), the express terms won where custom or past dealing could not reasonably be fitted with them, and the parties' own prior dealing won over general trade usage."

### C9. Cold Call limits: later protections said not to be performance of the 1969 contract
- **Surface:** nanakuli, Cold Call (tools/cold-call/narratives), `limits`; the same claim appears in narrative episode-5 ("Those episodes were not additional performance under the 1969 agreement.").
- **Current text:** "Later protections under other contracts were not additional performance episodes under the 1969 contract."
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES.
- **Basis:** The assigned excerpt does not say that the 1977 and 1978 protections arose under other contracts. It says the jury's course-of-performance interpretation "was bolstered by evidence offered by Shell that it again price protected Nanakuli on the only two occasions of post-1974 price increases, in 1977 and 1978" (C&M 590). Note 1 (C&M 593) also counts "two after 1974" in the waiver-or-performance discussion. As written, the Atlas sentence discounts evidence the court relied on.
- **Pinpoint:** C&M 590 lines 847–850; 593 Note 1.
- **Replacement:** "Shell's protection on the two post-1974 increases, in 1977 and 1978, bolstered the jury's course-of-performance reading; whether those episodes arose under the 1969 contract is not in the assigned excerpt."

---

## D. Columbia Nitrogen

### D1. Takeaway: "flatly cannot be squared"; no careful-negation exception
- **Surface:** columbia-nitrogen, Takeaway (tools/r19/data/takeaways.json).
- **Current text:** "Evidence of trade usage and past dealings comes in to explain a written sales contract unless it flatly cannot be squared with the express terms."
- **Verdict:** CHANGES RESULT.
- **Counterexample 1:** Suppose a usage can be reconciled with the express terms only by a strained reading. Under "flatly cannot be squared" the usage comes in. The test is whether the evidence "reasonably can be construed as consistent with the express terms" (C&M 597), and § 1-303(e) requires consistent construction only "whenever reasonable" (sel. 18042–18044).
- **Counterexample 2:** Suppose a contract states that "no ... usage of trade, or course of dealing will be recognized." The Note (C&M 599) asks about exactly that clause, and Comment 2 to § 2-202 admits usage and dealing only "unless carefully negated" (C&M 598–599 n.1; sel. 2-202 cmt. 2). The takeaway gives no route to exclusion through such a clause.
- The takeaway also says "explain" only, although the court admitted the evidence to "supplement" as well (C&M 598).
- **Pinpoint:** C&M 597 lines 1192–1210; 598 lines 1242–1267; 599 Note; sel. 18042–18050.
- **Replacement (45 words, two sentences):** "Under the Code, trade usage and course of dealing may explain or supplement even a detailed written sales contract with a merger clause, unless they cannot reasonably be construed as consistent with its express terms or are carefully negated. No preliminary finding of ambiguity is required."

### D2. Cold Call plain-English: Code said to free all "outside evidence" from the ambiguity prerequisite
- **Surface:** columbia-nitrogen, Cold Call plain-English sentences, at 3.0, `plain`.
- **Current text:** "replaced the older rule that outside evidence about a contract is allowed only if its words are ambiguous."
- **Verdict:** CHANGES RESULT.
- **Counterexample:** A buyer offers evidence of a prior oral agreement that contradicts a written quantity term in a final writing. Under the plain version, the ambiguity hurdle is gone for all outside evidence. Section 2-202 still bars contradiction "by evidence of any prior agreement or of a contemporaneous oral agreement" (sel. 18931–18936). Comment 1(c) rejects the ambiguity prerequisite only for "the type of evidence specified in paragraph (a)," meaning course of dealing, usage, and course of performance (sel. 2-202 cmt. 1(c)). Columbia itself distinguished "consistent additional terms" from usage and dealing (C&M 598).
- **Pinpoint:** C&M 597 lines 1202–1210; 598 lines 1255–1263; sel. 18931–18936 and cmt. 1(c).
- **Replacement:** "Judge Butzner held that Virginia's Uniform Commercial Code (UCC) replaced the older rule that evidence of trade usage or course of dealing may be used only if the contract's words are first found ambiguous."

### D3. Map Material Facts date
- **Surface:** columbia-nitrogen, Map entry: sections.Material Facts.
- **Current text:** "agreed in 1966 to sell Columbia"
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES (does not change a result). The excerpt says only that Royster built the plant "In the fall of 1966" and "negotiated a contract" (C&M 596). The effective brief CT-CB-0596 dates the contract May 8, 1967, so the Atlas contradicts itself.
- **Replacement:** "Royster built a phosphate plant in fall 1966 and then agreed to sell Columbia a stated minimum of 31,000 tons annually for three years."

---

## E. Figgie

### E1. Takeaway and timeline omit the condition that the usage must apply to the parties
- **Surfaces:** figgie, Takeaway (tools/r19/data/takeaways.json): "Trade custom can make a limited remedy, such as repair, replace or refund, part of a sales contract even where it is unclear that the written terms were ever delivered."; Timeline 'trade-usage' step 5 (note): "Usage can cut the other way: an unrebutted trade usage supplied an exclusive repair-or-refund remedy as part of the agreement."
- **Verdict:** MISSING CONDITION.
- **Counterexample:** In Rispens (C&M 584), a seed seller tried to exclude the implied warranty through a usage of trade. The court held that because the parties "are not in the same trade," the seller could rely on the usage only by showing the buyer "was or should have been aware" of it. Figgie applied usage "in the vocation or trade in which they are engaged or of which they are or should be aware" (C&M 595, quoting S.C. § 36-1-205(3)), and it rested on unrebutted affidavits at summary judgment (C&M 596). Read without these conditions, the takeaway would let any seller-side custom cut off a buyer's remedies. The timeline note also drops "replacement," one of the three remedies the usage supplied (C&M 596).
- **Pinpoint:** C&M 595 lines 1111–1121; 596 lines 1138–1147; 584 Note 3 (Rispens).
- **Replacement (takeaway, 60 words, two sentences):** "Proved trade custom of a trade the parties are engaged in or should know, here unrebutted affidavits about the bottle-labeling industry, can make an exclusive repair, replacement or refund remedy part of a sales contract even where delivery of the written terms is disputed. The remedy did not fail of its purpose when the refund alternative was actually carried out."
- **Replacement (timeline note):** "Usage can cut the other way: unrebutted proof of an industry usage supplied an exclusive repair, replacement, or refund remedy as part of the agreement."

### E2. Essential-purpose, waiver and new-contract holdings are outside the assigned pages
- **Surfaces:** Effective brief CT-CB-0593: rule (second clause), Holding ("Figgie's repair assurances created no new contract, modification, or waiver"), Reasoning paras. 2–4; Map summary ("the completed refund prevented that remedy from failing"), Map Holding second sentence, Map Reasoning para. 2; Chronology step 481 (second clause); Cold Call plain sentences at 3.0, 3.1, 4.0, 4.1; Lecture notes topic "When trade practice qualifies price, quantity, or remedies" ("and the refund fulfilled that remedy"); Flowchart K-23 node f ("which the seller provided" is supported; the remedy's continued validity is not).
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES. This is not a finding that the statements are wrong. The casebook says the enforceability section "may be found in Chapter 8, p. 1044" (C&M 595), so these statements cannot be tested against the class-15 pages. Map notes on consequential-damages questions are in the same position.
- **Pinpoint:** C&M 595 lines 1091–1092.
- **Replacement:** none proposed. Keep the text and verify it against C&M 1043–1046 in the packet that covers that chapter.

---

## F. Flowchart K-23 (tools/flowcharts/data/contracts.json, chart "K-23")

### F1. Node a: the commercial-context route is limited to Article 2
- **Location:** K-23 node "a", edge `{"label": "Article 2 commercial context", "to": "d"}` (not shown in ct15-surfaces.md).
- **Verdict:** MISSING CONDITION.
- **Counterexample:** Hurst was decided under the Oregon statutes and the common law, not the UCC, and Frigaliment under pre-Code New York law (C&M 576, 582–583). Both are cited in node d. A student with a non-sales contract and trade-usage evidence would take the "Text-first" or "Contextual" branch and never reach the usage node. Yet Restatement § 202(5) requires consistent construction with "any relevant course of performance, course of dealing, or usage of trade," § 202(3)(b) gives technical terms their technical meaning, and § 203(b) ranks these sources the same way (sel. 5699–5717).
- **Replacement (edge label):** "Commercial context (UCC § 1-303; Restatement §§ 202(3)(b), 202(5), 203(b))"

### F2. Node d: any "proved" usage reaches node e
- **Surface:** Flowchart K-23 node d, `detail` and edge `"Proved usage or practice"`.
- **Current text:** "Identify this contract’s repeated performance, prior dealings, and sufficiently established trade usage."
- **Verdict:** CHANGES RESULT.
- **Counterexample:** Return to Frigaliment's Note 3 hypothetical (C&M 584). Suppose the buyer proves that the poultry trade uses "chicken" to mean broilers, and the seller is outside that trade with no reason to know the usage. The chart sends "Proved usage" straight to node e and then to "Apply the meaning." Under § 1-303(d), the usage must belong to the trade "in which they are engaged or of which they are or should be aware" (sel. 18034–18038). Rispens (C&M 584) and Nanakuli's scope-of-trade holding (C&M 587–589) apply that condition. The chart also omits § 1-303(g): usage evidence is inadmissible unless the proponent gave notice sufficient to prevent unfair surprise (sel. 18058–18060).
- **Replacement (detail):** "Identify this contract’s repeated performance, prior dealings between the parties, and any usage proved as a fact that belongs to a trade the parties are engaged in or of which they are or should be aware (§ 1-303(c)–(d)); usage evidence also requires notice sufficient to prevent unfair surprise (§ 1-303(g)). The buyer in Frigaliment failed to prove the narrow meaning of chicken. The rounding practice alleged in Hurst, pleaded as known to both traders, could explain an apparently exact number."
- **Replacement (edge label):** "Proved and applicable to the party charged"

### F3. Node e: priority stated without § 1-303(f) or careful negation
- **Surface:** Flowchart K-23 node e, `detail`.
- **Current text:** "If an inconsistency remains, rank express terms, then course of performance, prior dealing, and usage."
- **Verdict:** MISSING CONDITION.
- **Counterexample 1:** A course of performance that is inconsistent with an express term can still show waiver or modification (§ 1-303(f), subject to § 2-209; sel. 18051–18053). Shell's waiver argument in Nanakuli raised this question (C&M 586, 590). The chart would apply the express term automatically.
- **Counterexample 2:** A clause that specifically negates usage or dealing (C&M 599 Note; § 2-202 cmt. 2) has no place in the chart.
- **Counterexample 3:** "Columbia Nitrogen required consideration of explanatory usage" understates the case, which required admission of usage and course of dealing to "supplement and explain" (C&M 598).
- **Replacement (detail):** "First construe the express terms and the applicable practices as consistent whenever reasonable. Nanakuli let a jury find that usage and performance qualified a posted-price term; Columbia Nitrogen required admission of usage and course of dealing to explain or supplement a detailed writing whose merger clause did not carefully negate them. If consistent construction is unreasonable, express terms prevail over course of performance, which prevails over course of dealing, which prevails over usage; but a course of performance may still show waiver or modification of an inconsistent term, subject to § 2-209."

### F4. Node g: no burden-of-proof or failure-of-assent outcome
- **Surface:** Flowchart K-23 node g, `detail`.
- **Current text:** "Where the governing rule excludes a proffer, the text cannot bear it, or claimed usage is unproved, use the reading otherwise established."
- **Verdict:** MISSING CONDITION (changes the result for an ambiguous term).
- **Counterexample 1:** Frigaliment is cited in node g, but in Frigaliment no reading was "otherwise established." The word "standing alone is ambiguous" (C&M 576), and the case ended on the plaintiff's burden of persuasion, with the court finding it "unnecessary to determine" the buyer's intent (C&M 580). A student at node g with an ambiguous term has no outcome to apply.
- **Counterexample 2:** Neither K-23 nor K-09 provides the Restatement outcome in which there is no mutual assent. That outcome arises when the parties attach materially different meanings and either neither or each knows or has reason to know the other's meaning (§ 20(1), sel. 1116–1122; § 201(3), sel. 5663–5664), as the class-15 lecture topic "Apply each party’s knowledge at formation" states.
- **Replacement (detail):** "Where the governing rule excludes a proffer, the text cannot bear it, or claimed usage is unproved, use the reading otherwise established. If the remaining evidence leaves an ambiguous term unresolved, the party with the burden of persuasion loses on that point (Frigaliment's plaintiff buyer). If the parties attached materially different meanings and neither or each knew or had reason to know the other's, Restatement §§ 20(1) and 201(3) may yield no agreement."

### F5. Flowchart K-22 (touched by lecture topic "Commercial context and a final writing"): no route for usage or dealing against a complete integration
- **Location:** tools/flowcharts/data/contracts.json, K-22 node "a" edges and node "d" detail ("Within a complete integration, even a consistent addition within its scope is excluded.").
- **Verdict:** CHANGES RESULT.
- **Counterexample:** Columbia Nitrogen offered six years of prior dealings and trade usage to supplement a detailed writing with a merger clause. In K-22, prior dealings look like "Enforce earlier term," which leads to node b, then "Complete integration," then node d, then node e ("Earlier term excluded"). That is the district court's exclusion, which the Fourth Circuit vacated. Section 2-202 places "no similar limitation" on course of dealing or usage (C&M 598), and paragraph (a) is not subject to the complete-and-exclusive qualifier that limits paragraph (b) (sel. 18936–18940).
- **Replacement:** add to node a the edge `{"label": "Course of dealing, usage or performance to explain or supplement", "to": "g"}` and append to node g's detail: "Under UCC § 2-202(a), course of dealing, usage of trade and course of performance may explain or supplement even a complete and exclusive writing unless they cannot reasonably be construed as consistent with it or are carefully negated (Columbia Nitrogen)."

---

## G. Lecture notes (class 15; checked against casebook and selections only)

### G1. § 1-303(f) stated without "Subject to Section 2-209"
- **Surface:** Lecture notes record, topic "Interpretation, waiver, and modification", body.
- **Current text:** "Under UCC § 1-303(f), even inconsistent conduct can support waiver or modification."
- **Verdict:** MISSING CONDITION.
- **Counterexample:** Suppose a signed agreement excludes modification except by a signed writing. Section 2-209(2) bars any other modification, though under § 2-209(4) the attempted modification "can operate as a waiver." Section 2-209(3) also requires the modified contract to satisfy § 2-201 where applicable (sel. 19328–19336). A student told that inconsistent conduct supports "modification" without qualification would enforce a modification that the Code blocks.
- **Pinpoint:** sel. 18051–18053, 19328–19336.
- **Replacement:** "Under UCC § 1-303(f), subject to § 2-209, a course of performance inconsistent with a term can show waiver or modification; a signed no-oral-modification clause or the statute of frauds can block modification, although the conduct may still operate as a waiver."

### G2. Davis
- **Surface:** Lecture notes record, topic "Drafting around commercial practices", body.
- **Current text:** "Davis compares a targeted no-waiver provision with an express exclusion of course of performance, course of dealing, and usage of trade."
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES. Davis does not appear in C&M 575–599 (not in assigned excerpt). The rest of the topic ("Ask what a merger clause excludes and whether the parties carefully negated the specific practice asserted") is supported by C&M 598–599 and § 2-202 cmt. 2.
- **Replacement:** cite the source of the Davis material, or replace the sentence with: "Compare a general merger clause, which did not negate usage and dealing in Columbia Nitrogen, with a clause that names usage of trade and course of dealing (C&M 599 Note)."

### G3. Hurst in the lecture notes
- **Surface:** Lecture notes record, topic "Frigaliment and Hurst on specialized meaning".
- **Current text:** "Hurst allowed evidence that the trade rounded protein measurements"
- **Verdict:** MISSING CONDITION (minor). The usage was alleged, both parties were alleged to be trade members, and the buyer was alleged to know of it (C&M 582); the court reversed a judgment on the pleadings.
- **Replacement:** "Hurst held that the seller could prove an alleged usage, known to both horse-meat-scrap traders, that treated at least 49.5 percent protein as 50 percent, even though the percentage in the written specification appeared exact."

---

## H. Rules & authorities linkage and timeline context

### H1. Restatement § 21 is the only Restatement entry linked to all five principal cases
- **Location:** tools/v25/authorities.json `byNode`: frigaliment, hurst and nanakuli each link only `restatement-21`; figgie links `restatement-21` and `ucc-2-719`; columbia-nitrogen links `restatement-21`, `restatement-209` and `ucc-2-202`. The surfaces file shows "Rules & authorities entry restatement-21" under every case.
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES (as a connection). The § 21 text is verbatim (sel. 1177–1180), but none of the five cases concerns intention to be legally bound. The assigned provisions that govern these cases are not linked: § 20 (misunderstanding), §§ 201–203 (whose meaning prevails, usage and course of performance, priority), and UCC § 1-303 (the provision Nanakuli, Figgie and Columbia apply in its former §§ 1-205 and 2-208 form; C&M 588 n.i, 589 n.j). Those entries exist and are accurate (restatement-20, -200 to -204, ucc-1-303).
- **Replacement:** for these five nodes, replace `restatement-21` with `restatement-20`, `restatement-201`, `restatement-202`, `restatement-203` and `ucc-1-303`; add `ucc-2-202` to nanakuli and figgie.

### H2. trade-usage timeline, step ucc1303 `context` (prior correction, incomplete)
- **Current text:** "The 1952 provisions were §§ 1-205 and 2-202."
- **Verdict:** OVERSTATED (minor; does not change a result). Course of performance came from former § 2-208, which § 1-303 absorbed (C&M 589 n.j; sel. 1-303 "Source: Former Sections 1–205, 2–208"). The year 1952 is not in the assigned excerpt.
- **Replacement:** "The earlier provisions were §§ 1-205, 2-202 and 2-208."

---

## Statements checked and found supported

- Frigaliment Map summary ("The buyer failed to prove that “chicken” in these contracts meant only young broilers"): C&M 580.
- Frigaliment Map Issue, Parties, Procedural History, Material Facts: C&M 576–580.
- Frigaliment Map Reasoning, both paragraphs (dictionary, size argument, conflicting witnesses, regulations, price, objective test, burden): C&M 576–580.
- Frigaliment learning.topics (assent, interpretation, trade-usage, governing-law): C&M 576–580.
- CT-CB-0575 Issue, Holding ("had not carried that burden"; "not a universal definition of chicken"): C&M 576, 580.
- CT-CB-0575 Reasoning, all paragraphs: C&M 576–580. The newcomer test is correctly described there as the test the buyer "had to show" under New York law.
- Frigaliment Cold Call plain sentences at 0.0, 0.2 (statutory warranty; New York law), 1.2 (both), 2.0, 2.2, 3.0 (both), 3.2 (both), 4.0, 4.1: C&M 576–580 and fn. h. The plain sentence at 0.2 on arbitration is not in the assigned excerpt.
- Timeline 'interpretation' step 2 note and context (prior corrections): C&M 576–580.
- Hurst brief rule CT-CB-0582 and Chronology step 102 ("parties in the trade"): C&M 582–583.
- Hurst Map summary, Holding, Reasoning, Material Facts, Issue, Procedural History: C&M 582–583.
- Hurst CT-CB-0582 Issue, Holding (no award; posture), Procedural History, Reasoning paras. 1–2: C&M 582–583. The statutory paragraph is not in the assigned excerpt.
- Hurst Cold Call plain sentences at 1.0, 1.1 (both), 2.2 (both), 4.1 (first): C&M 582–583. The sentences at 3.1 and 4.1 (vote count) are not in the assigned excerpt.
- Nanakuli Map summary, Issue, Holding, Procedural History, and Reasoning paras. 1 and 3: C&M 585–592.
- Nanakuli CT-CB-0585 Issue, Holding (jury could find; limited exception reconciled): C&M 585, 591–592.
- Nanakuli CT-CB-0585 Reasoning on consistency and good faith, and the Kennedy paragraph (correctly labeled a concurrence): C&M 590–592.
- Timeline 'trade-usage' step 4 (Nanakuli; "if reasonably consistent"): C&M 591.
- Nanakuli Cold Call plain sentences at 2.1, 2.2 (both), 3.0, 3.3, 4.0 (first), 4.2, 5.1, 6.0: C&M 586–592, sel. 18015–18038.
- Columbia Map summary, notes (test quote), Procedural History, Issue, Holding, Reasoning, and learning.topics (other than date): C&M 596–599.
- Columbia brief rule CT-CB-0596 and Chronology step 214 ("unless ... carefully negated"): C&M 597–599; § 2-202 cmt. 2.
- CT-CB-0596 Holding ("did not hold that Columbia had no purchase obligation") and Reasoning paras. 1–3: C&M 597–599.
- Timeline 'trade-usage' step 3 (Columbia; "a merger clause must expressly negate them" read as a necessary condition): C&M 598–599.
- Columbia Cold Call plain sentences at 1.0, 1.1 (first), 4.1: C&M 596–599. The antitrust, § 8.2-207 and § 8.2-706 sentences are not in the assigned excerpt.
- Figgie Map Holding first sentence, Reasoning para. 1, Parties, Material Facts, Procedural History: C&M 593–596.
- CT-CB-0593 Material Facts and Reasoning para. 1 (usage supplied the limitation on uncontroverted affidavits): C&M 594–596.
- Figgie Cold Call plain sentences at 0.1, 1.0, 1.1, 2.0 (both), 2.2: C&M 593–596; sel. 2-719.
- K-23 node f (Figgie "proved exclusive remedy that included refund, which the seller provided"): C&M 593, 596.
- Timeline 'trade-usage' `now` and `guide` (prior corrections): sel. 18042–18053; § 2-202 cmt. 1(c).
- Lecture notes topics "Commercial context and a final writing" and "Identify the source of the practice" (topic 3 covers § 1-303(f), subject to G1): sel. 18015–18060, 18931–18940.
- Lecture notes waiver-retraction sentence ("can ordinarily be retracted by reasonable notice unless reliance would make retraction unjust"): sel. 19337–19341.
- Lecture notes topic "Apply each party’s knowledge at formation" (§§ 20 and 201 knowledge conditions, failure of assent): sel. 1114–1130, 5649–5664.
- Lecture notes Nanakuli and Columbia sentences in topic "When trade practice qualifies price, quantity, or remedies": C&M 591, 597–598.
- Lecture notes `conflicts` entry (no ambiguity prerequisite under §§ 1-303 and 2-202): § 2-202 cmt. 1(c).
- Rules & authorities text of restatement-20, -21, -200 to -204, -209, ucc-1-303, ucc-2-202 and ucc-2-719: verbatim against sel. 1114–1130, 1177–1180, 5645–5735, 5970–5980, 18015–18060, 18931–18940, 22826–22841.
