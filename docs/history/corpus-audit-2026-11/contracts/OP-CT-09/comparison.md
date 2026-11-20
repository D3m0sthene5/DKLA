# OP-CT-09 comparison: Contracts Class 9 (battle of the forms; pay now, terms later)

Reader and challenger: one worker. Sources: C&M printed pp. 284–304 (re-rendered and re-OCR'd from PDF pp. 329–349 because the staged text was unreadable on left-hand pages; renders/ in this folder), UCC § 2-207 and § 2-104 in the Selections, RLCC § 2 (2019 draft in the Selections; 2024 Official Text at `added-sources/text/Complete Restatement.txt`), ct09-slides.txt, learn-list.md.

## 0. Staging defect that the coordinator needs to know about

The staged `ct09-surfaces.md` is 67 bytes ("Contracts class 09: None"). The surfaces generator looks up `principalCases["9"]`, and the staging call passed "09". I regenerated the file read-only with `python3 -I tools/content-audit/session_surfaces.py 9` into `ct09-surfaces-regen.md` (171 KB; no repository file changed, checked with `find -newer`). Every finding below cites that regenerated file. The staged surfaces files for OP-CT-05, -06, -07 and -08 are also 67 bytes and almost certainly have the same defect.

## (a) Coverage

| Assigned item (pinpoint) | Where the Atlas teaches it | Assessment |
|---|---|---|
| § 2-207(1) formation; expressly conditional proviso (C&M 284; § 2-207(1)) | K-16 nodes b, c; Bayway brief Reasoning; Klocek episode 4 | Covered |
| § 2-207(2) first sentence (nonmerchant proposals) vs second sentence (between merchants) (C&M 284) | K-16 node e; Klocek brief | Covered, but Klocek ≈ 3.2 misstates it (E6) |
| "Between merchants," § 2-104(3) (C&M 284) | R&A authorities only | Thin (G9) |
| Burden of proving material alteration (Bayway, C&M 285–286) | Bayway map, brief, takeaway, timeline, ≈ 2.1; material-alteration node | Covered in text; missing from K-16 node f (E3) and misframed in K-17 node d (E2) |
| Per se materiality; Comment 4 examples; Air Products (C&M 284, 286) | Bayway brief and episode 4; note-materiality-sites | Covered |
| Subjective vs objective surprise; Chateaugay evidence types (C&M 286–287) | Bayway brief, ≈ 3.1 | Covered; map summary overstates trade usage (E9) |
| "Ordinarily, our inquiry into surprise would end here" (C&M 287) | Not taught | Gap (G4); causes E2 |
| Hardship reserved; Union Carbide skepticism (C&M 288–289) | Bayway brief, ≈ 4.0, note-union-carbide, material-alteration | Covered in text; K-17 node d edge treats hardship as settled (E2) |
| Union Carbide "four documents" (C&M 289) | Union Carbide brief CT-ADDITIONAL-CM-B1-085 only | Not linked to the one-form debate (G8) |
| Different vs additional; three views; Posner's preference; Illinois prediction (C&M 290–292) | Northrop map, brief, ≈, K-16 g, K-17 c | Covered |
| Rationale for the knockout rule (neutral ground, § 2-207(2)(a) self-protection, surprise incentives) (C&M 291–292) | Northrop episode 3 touches it | Gap (G3) |
| Notes: knockout, Keating, fairness, drafting, strategies (C&M 292–293) | note-gardner-keating, notes-drafting | Covered |
| Problem "Misplaced Strategies" (C&M 293) | problem-misplaced (question only) | Route works on K-16; no worked answer (G7) |
| Hill: vendor as offeror; retention as acceptance; one form; practical reasons; executory objection; box notice; return cost left open (C&M 294–297) | Hill map, brief, ≈, K-10 c–d, rolling-formation | Covered; the K-16 route cannot reach Hill's result (E4) |
| Hill Note 2: seller reneging before shipment (C&M 298; slides 5–6) | Lecture note records the question only | Gap (G2) |
| Klocek: buyer as offeror (assumed); § 2-207 applies to one form; no conditional acceptance; express assent; fn. 3–4 (C&M 298–303) | Klocek map, brief, ≈, K-10 c, e; K-16 e | Covered; K-10 node c narrows acceptance to shipment (E12) |
| Klocek Note 2, Howard v. Ferrellgas: Kansas rejects rolling formation (C&M 303) | note-howard | Reversed (E1) |
| RLCC § 2(b), (c), both editions (Selections p. 477; CR 873–889) | gap-rlcc hub (tools/r19/data/rlcc.json); lecture note topic 5 | Text covered; never applied to Hill or Klocek (G1); comment cited wrongly (E7) |
| Slides 2–9 | tools/canons/data/lectures.json class 9 | Covered; see (e) |

Atlas statements that are not in the assigned excerpt (not errors): Hill map summary "the Federal Arbitration Act forbids demanding special prominence for an arbitration clause" (the Casarotto passage is edited out); Bayway map Reasoning's list "Avedon, JOM and Comark" (the excerpt says only "almost every court"); Klocek map Procedural History "The action was later dismissed for lack of subject-matter jurisdiction and the ruling was never reviewed on appeal"; Northrop brief Reasoning "treating the contract as formed by conduct under subsection (3) would lead to the same result"; Bayway map Procedural History "Judge McKenna".

## (b) Errors in existing text (most result-changing first)

**E1. note-howard map entry: summary** (`src/data/seedData/nodes-45978ecb29/00200-note-howard-a6a016b276.json`, field `summary`; the same sentence is the `explanation` of edge `contracts-r3-0281` in `src/data/seedData/edges-f394aa7979/00369-contracts-r3-0281-68b7a11fc4.json`, and both have copies under `src/data/textbookUpdate/`)
- Current text: "The notes report a later conclusion that Kansas adopted rolling contract formation."
- Verdict: MISSTATES HOLDING (the direction is reversed).
- Source: Note 2 quotes then-Judge Gorsuch: "It's pretty clear ... that Kansas is among those states that reject the rolling theory of contract formation." Howard v. Ferrellgas Partners, 748 F.3d 975, 982 (10th Cir. 2014) (C&M 303; I checked the rendered page image, and the word is "reject").
- Counterexample: Note 2 asks whether it matters today that Klocek never chose between Kansas and Missouri law. A student relying on the Atlas would answer that Kansas follows Hill, so a Kansas buyer who keeps the computer is bound. The casebook's answer is the opposite: Kansas rejects rolling formation, which is consistent with Klocek's prediction.
- Replacement (summary): "The notes quote then-Judge Gorsuch (10th Cir. 2014) concluding that Kansas is among the states that reject the rolling theory of contract formation." Make the same change in the edge explanation. (A superseded Klocek note in `provenance.priorVersions[1].notes` contains the same reversed statement. It is not served.)

**E2. Flowchart K-17 (How do competing terms change the outcome?) node d** (Bayway route; this chart was touched by another team's review)
- Current text: label "Did trade usage remove the surprise?"; edges "No material alteration proven" → h and "Surprise or hardship proven" → g. The edge into d comes from node b: "No statutory obstacle".
- Verdict: CHANGES RESULT (the label puts the question on the proponent's trade usage rather than the opponent's burden). The "Surprise or hardship proven" edge is also OVERSTATED: it treats hardship alone as sufficient, a question Bayway left open.
- Source: the party opposing the term bears the burden (C&M 285–286). OMT showed only subjective surprise and offered nothing on objective surprise: "Ordinarily, our inquiry into surprise would end here" (C&M 287). Bayway's custom evidence confirmed a result OMT had already lost. On hardship: "We need not decide whether hardship is an independent ground" (C&M 288), and Union Carbide calls hardship "a consequence, not a criterion" (C&M 289).
- Facts entered (changed decisive fact): same as Bayway, but Bayway introduces no evidence of industry custom; OMT offers only its executives' amazement. Path: a –"New arbitration, tax, or payment clause"→ b –"No statutory obstacle"→ d "Did trade usage remove the surprise?". No trade usage is in the record, so the student cannot take "No material alteration proven" and takes "Surprise or hardship proven" → g. Displayed result: the clause stays out. Source-supported result: the clause enters, because OMT did not carry its burden on objective surprise (C&M 287).
- Second variant: a customary clause that would impose a severe but unsurprising loss. The chart goes d –"Surprise or hardship proven"→ g (excluded). Under Bayway the question is open; under Union Carbide's test the clause enters.
- Also at node b, the edge label "No statutory obstacle" leads to the node that tests material alteration, which is itself a statutory obstacle (§ 2-207(2)(b)).
- Replacement: label "Did the resisting merchant prove material alteration?" Detail: "The party opposing the clause bears the burden. Personal surprise is not enough; it must show that a reasonable merchant would not be presumed to consent. In Bayway the buyer offered nothing on that point, and the seller's proof of industry custom confirmed the result. Whether hardship alone suffices is unsettled (Bayway reserved it; Union Carbide rejects it)." Edges: "Burden not carried" → h; "Objective surprise proven (or hardship, where recognized)" → g. Relabel b → d as "No limit or objection; materiality contested".

**E3. Flowchart K-16 (Whose terms govern under UCC § 2-207?) node f, detail** (Bayway route)
- Current text: "Check whether the offer expressly limits acceptance, whether the term materially alters the bargain, and whether the offeror objected already or within a reasonable time after notice."
- Verdict: MISSING CONDITION (who bears the burden of proving the exception).
- Source: C&M 285–286; § 2-207(2).
- Counterexample: the record on surprise is empty or evenly balanced. A student at f who treats inclusion as something the proponent must establish takes "An exception applies" → l (excluded). Bayway: "if neither party introduced any evidence," the term enters (C&M 285–286).
- Replacement (add): "The party resisting the term must prove the exception (Bayway: material alteration)." Optional precision: "whether the other party objected" in place of "whether the offeror objected", because § 2-207(2)(c) also covers confirmations, where there may be no offeror (Comment 1).

**E4. Flowchart K-16 node b (and node a): no route for a single form arriving after payment**
- Current text: node b, "A definite and seasonable expression of acceptance can form a contract despite variant terms unless expressly conditional on assent to them."; edges "Effective acceptance or confirmation" → d and "Expressly conditional or writings fail" → c. Node e cites only klocek.
- Verdict: CHANGES RESULT for facts governed by Hill's approach.
- Source: Hill, C&M 296–297 ("when there is only one form, 'sec. 2-207 is irrelevant'"; "By keeping the computer beyond 30 days, the Hills accepted Gateway's offer"); Klocek, C&M 301.
- Facts entered: Hill (phone order, payment, terms in the box, 30-day return, kept). Slides 4–5 ask "Did 2-207 apply?", so this is the chart a student would naturally open. Path: a –"Article 2"→ b. "Effective acceptance or confirmation" leads to d –"Additional"→ e –"Nonmerchant, no assent"→ l, which displays the Klocek result: arbitration excluded. "Expressly conditional or writings fail" leads to c –"Mutual recognition by conduct"→ h, a § 2-207(3) contract without arbitration. Neither path reaches Hill's result, under which arbitration is part of the contract.
- Replacement: add an edge from b, "One form arriving after payment", to a new node: "First decide who offered (see K-10). Under Hill, the vendor's boxed terms are the offer and § 2-207 is irrelevant; under Klocek, the buyer offered, the box terms are an acceptance or confirmation, and you continue at d."

**E5. Bayway Cold Call plain-English sentence at 2.0**
- Current text: "It was not \"expressly conditional\" on OMT agreeing to its new terms, which would have prevented a contract."
- Verdict: MISSING CONDITION.
- Source: § 2-207(3); C. Itoh as quoted at C&M 282; Problem, C&M 293; K-16 node c.
- Counterexample (changed decisive fact): Bayway's confirmation says acceptance is expressly conditional on OMT's assent to its terms, and OMT then takes delivery. The sentence says there would be no contract. Correct answer: no contract was formed by the writings, but both parties' performance forms a § 2-207(3) contract on the terms the writings agree on plus Code supplements, so the Tax Clause drops out.
- Replacement: "... which would have kept the exchanged writings from forming a contract. A contract could then arise only from OMT's express assent or, under § 2-207(3), from both sides' conduct."

**E6. Klocek Cold Call plain-English sentence at 3.2**
- Current text: "Klocek was not a \"merchant\" (a business dealing in such goods), so § 2-207(2) did not apply."
- Verdict: MISSTATES HOLDING.
- Source: the first sentence of § 2-207(2) is "the only sentence that is applicable if either of the parties to the contract is not a merchant" (C&M 284). Klocek applied that sentence: the terms were proposals that entered only on express agreement (C&M 302).
- Counterexample: asked what § 2-207(2) does in a consumer sale, a student using this sentence says "nothing", when the subsection is the source of the rule that the box terms were mere proposals.
- Replacement: "Klocek was not a \"merchant\" (a business dealing in such goods), so the second sentence of § 2-207(2), which lets some added terms join a contract automatically between merchants, did not apply. Under its first sentence the box terms were only proposals, and they needed Klocek's express agreement."

**E7. Lecture notes record, class 9, topic "Restatement of Consumer Contracts § 2(b)", body** (`tools/canons/data/lectures.json`)
- Current text: "Comment 3 (2024 Official Text; Comment 1 in the Selections' 2019 draft)"
- Verdict: WRONG CITATION.
- Source: in the 2019 draft the core-deal-terms sentence ends Comment 2. The right-hand column at the top of printed p. 478 continues Comment 2 ("the adoption of standard contract terms can be made / either together with or separate from ...") and holds the sentence "Manifesting assent to the transaction as a whole generally involves adoption of at least some standard contract terms—the core deal terms". Comment 1 ("General") ends at "unfair outcomes" (sel 26222–26248). Slide 8's first sentence ("This Section does not address the formation of the contract ...") appears only in the 2024 text (CR 947–948).
- Counterexample: a student told to read "Comment 1" in the Selections finds the general purpose comment, not the passage the slide quotes.
- Replacement: "Comment 3 (2024 Official Text; Comment 2 in the Selections' 2019 draft, which lacks the slide's first sentence)". The same misreading of the two-column layout is in the RLCC crosswalk (`docs/history/corpus-audit-2026-11/contracts/OP-CT-RLCC/crosswalk.md`, the § 2 bullet "is in the 2019 Comment 1 (sel 26239–26248)"), which probably caused this error.

**E8. Bayway map entry: sections.Reasoning**
- Current text: "of the five competitors’ forms OMT produced"
- Verdict: MISSTATES a fact (who introduced the evidence).
- Source: "OMT cites the standard contracts of five major petroleum companies that Bayway introduced" (C&M 287). The effective brief has it right.
- Counterexample: the point of the passage is that the proponent's own evidence, read in the light most favorable to OMT, still showed custom. Attributing the forms to OMT misplaces whose evidence carried the day.
- Replacement: "of the five major oil companies’ standard contracts that Bayway introduced and OMT relied on". The same field also has a stray "registering,." that should read "registering.".

**E9. Bayway map entry: summary**
- Current text: "the latter shown by trade usage"
- Verdict: OVERSTATED.
- Source: objective surprise is what a reasonable merchant should have known. Evidence can include prior course of dealing, the number of confirmations exchanged, industry custom and conspicuousness (Chateaugay, C&M 287). The opposing party must show that consent "cannot be presumed" (C&M 286).
- Counterexample: a buyer with a contrary prior course of dealing but no trade-usage evidence. The summary implies it cannot show objective surprise.
- Replacement: "the latter judged by what a reasonable merchant should have expected, here informed by trade usage".

**E10. Northrop map entry: sections.Holding**
- Current text: "were materially different, so both dropped out"
- Verdict: OVERSTATED (it attaches a materiality step to the majority rule).
- Source: the majority view as the opinion states it: "the discrepant terms fall out and are replaced by a suitable UCC gap-filler" (C&M 291). Materiality is the test of Posner's preferred view (C&M 290–291). Editors' Note 1 frames the knockout rule as applying when the difference is material (C&M 292), so the phrase has some editorial support, but "so" makes materiality the court's reason.
- Replacement: "conflicted, so both dropped out".

**E11. Northrop map entry: sections.Procedural History**
- Current text: "He disbelieved Northrop’s claim"
- Verdict: MISSTATES a fact (low stakes).
- Source: "The magistrate judge followed this approach ... and she held that the six months ... was a reasonable time" (C&M 291).
- Replacement: "She disbelieved Northrop’s claim".

**E12. Flowchart K-10 (Did the customer assent to the terms?) node c, detail and edge** (Klocek route)
- Current text: "Under Klocek, the consumer offered and shipment completed the deal." Edge: "Buyer’s offer accepted by shipment".
- Verdict: MISSING CONDITION.
- Source: Klocek assumed that Gateway accepted "either by completing the sales transaction in person or by agreeing to ship and/or shipping" (C&M 302). Klocek himself said he bought the computer in the store.
- Facts entered: Klocek's own account, an in-store purchase with the box carried home. At c, no edge fits an in-store sale, so the student may take "Seller’s offer invited retention" → d → g ("Term may govern"). Source-supported result: under Klocek, Gateway accepted at the sale, and the box terms need express assent (h).
- Replacement: detail "Under Klocek, the court assumed the consumer offered and Gateway accepted by completing the sale in person, agreeing to ship, or shipping." Edge "Buyer’s offer accepted at sale or by shipment".

**E13. Hill map entry: learning.topics.notice**
- Current text: "the Seventh Circuit's answer that terms need not be read to bind is the case's notice holding"
- Verdict: MISSING CONDITION (it merges reading with notice).
- Source: Hill answered the notice objection with the Hills' prior knowledge that terms would come in the carton, their opportunity to inspect and return, and a holding that box-exterior notice is "functional, not legal". It left open the buyer who is first alerted on opening and deterred by shipping cost (C&M 297). "Read or unread" (C&M 295) addresses reading.
- Replacement: "the Seventh Circuit answered that the Hills knew before ordering that terms would come in the box and could read them and return the computer; unread terms in such an accept-or-return document bind."

**E14. Lecture notes record, class 9, topic "An empirical study of pay now, terms later licences", body**
- Current text: "Measured against Article 2 default rules, those licences were not worse for buyers and on average were slightly better."
- Verdict: UNSUPPORTED BY ASSIGNED SOURCES. The rewording changes what was compared.
- Source: slide 7 has two separate points: the study "Measured whether terms were more or less favorable to buyers than default rules in UCC Article 2", and "PNTL EULAs were not worse for buyers. On average, they were slightly better." The note fuses them, so it reads as if pay-now-terms-later licences beat the Article 2 defaults. The slide does not say that. From the article (not assigned, and not checked here), the comparison is with licences disclosed before purchase.
- Replacement (closer to the slide): "The study scored each licence's terms against Article 2 default rules; pay now, terms later licences were not worse for buyers and on average were slightly better."

Nit, not counted: R&A entry `ucc-2-207` puts (b) and (c) on one line, "(b) they materially alter it; or (c) notification of objection ...", although the Selections print them as separate clauses.

## (c) Teaching gaps (assigned material no surface teaches)

**G1. RLCC § 2(b) applied to Hill and Klocek, and the courts' split on the (b)(1) notice.** Slides 8–9 put § 2(b) next to the two cases. Hill found only that the Hills "knew before they ordered" that some important terms would arrive (C&M 297). It did not find advance notice of the right to review and terminate, or of the consequence of keeping the computer. The 2019 draft Comment 5 and the 2024 Comment 6 say most courts do not require every (b)(1) notice and that the Restatement adopts the stricter minority approach. Home: `rolling-formation` map entry, notes (and one sentence in K-10 node d detail). Draft: "Applied to Hill, RLCC § 2(b)(1) asks whether, before ordering, the buyers were told that terms would follow, that they could review them and return the computer, and that keeping it would adopt the terms; Hill found only that the Hills knew some important terms would come. The Restatement says most courts focus on review and termination ((b)(2)–(3)) and adopts the stricter minority rule; under the 2024 text the business must prove all three conditions."

**G2. Hill Note 2 and slides 5–6: is the seller bound before the review period ends?** Home: `rolling-formation` notes, or Hill brief Reasoning. Draft: "Note 2 (C&M 298) asks whether, if the contract forms only after 30 days, Gateway could refuse to ship at the agreed price after charging the card without breaching, and whether that fits § 2-207's policy favoring formation. Hill does not answer; the slides list this uncertainty as a cost of the approach."

**G3. Why the majority (knockout) rule.** Home: Northrop effective brief, Reasoning (after the uniformity sentence). Draft: "The court explained the majority rule: different terms show the offeree did not really accept the offeror's terms, both forms may be thoughtless boilerplate, and an offeror who wants its terms can limit acceptance to them under § 2-207(2)(a); letting the offeror's terms win would tempt offerors to hide surprises in fine print (C&M 291–292)."

**G4. Bayway: the burden decides the case when the opponent offers no objective proof.** Home: Bayway effective brief, Reasoning (third paragraph). Draft: "Because OMT offered no evidence that a reasonable merchant would be surprised, the court said its surprise inquiry would ordinarily have ended there; Bayway's custom evidence confirmed, rather than created, the result (C&M 287)." Applying E2 carries the point into K-17.

**G5. Klocek: what would have changed the result.** The narrative has it, but the chart does not. Home: K-10 node e, detail. Draft: "Klocek noted that the result could differ if Gateway had told the buyer at the time of sale either the full terms or that the sale was conditioned on terms to follow (C&M 302–303 & n.4)."

**G6. Hill: the decisive facts behind the open question have no plain-English sentence.** Home: Hill Cold Call episode 5, a new ≈ for "Because these buyers knew important terms would arrive, it did not resolve that situation." Draft ≈: "The court did not decide what happens when a buyer first learns of the terms after opening the box and is put off returning it by shipping costs, because the Hills knew before ordering that terms would come."

**G7. Problem "Misplaced Strategies" has no worked route.** Home: `problem-misplaced` notes. Draft: "Run it through K-16: the seller's invoice is expressly conditional, so the writings form no contract; shipment and receipt are conduct recognizing a contract, so § 2-207(3) supplies only the terms on which the writings agree plus Code terms. Arbitration appears only in the buyer's form, so the seller's own conditional clause keeps out the term it later wants." (This is the chart's reasoning from the casebook's statute and cases, not the cited opinion's holding.)

**G8. Union Carbide's sequence of documents and the one-form debate.** Home: `note-union-carbide` notes. Draft: "Posner called a sequence of four documents governing a single sale 'a prototypical situation for the application of UCC § 2-207' (C&M 289); compare Hill's view that one form makes § 2-207 irrelevant and Klocek's view that one confirming form is enough."

**G9. "Between merchants."** Home: K-16 node e, detail. Draft: "'Between merchants' means both parties are chargeable with a merchant's knowledge or skill (§ 2-104(3)). Hill noted that a buyer at a retail store, like Zeidenberg in ProCD, was not a merchant (C&M 296–297)."

## (d) Challenger tests of the highest-risk statements

| Statement (surface) | Test against source | Result |
|---|---|---|
| Opposing party bears the burden of material alteration (Bayway rule line, takeaway, ≈ 2.1) | C&M 285–286 | SUPPORTED |
| Subjective surprise is not enough against unrebutted custom (Bayway takeaway, ≈ 3.1) | C&M 287–288 | SUPPORTED |
| Hardship left open (Bayway brief, ≈ 4.0, notes) | C&M 288 | SUPPORTED; K-17 node d contradicts it (E2) |
| Union Carbide affirmed exclusion as material (note-union-carbide) | C&M 289 | SUPPORTED |
| Posner's preferred view would have kept Litronic's 90 days (Northrop brief, episode 3) | C&M 291 | SUPPORTED |
| Knockout is Illinois's predicted rule, not Posner's preference (Northrop takeaway, timeline) | C&M 291–292 | SUPPORTED |
| Litronic was the offeror (Northrop map) | C&M 290 bracket | SUPPORTED |
| Vendor as master of the offer; retention accepts (Hill rule line) | C&M 295, 297 | SUPPORTED |
| § 2-207 irrelevant to one form (Hill map summary) | C&M 296 (quoting ProCD) | SUPPORTED as Hill's view; disputed by Klocek, C&M 301 |
| Buyer is ordinarily the offeror (Klocek map summary) | C&M 301–302 | SUPPORTED with "ordinarily"; the holding was an assumption for the motion |
| Express assent not shown by silence or retention (Klocek holding) | C&M 302–303 | SUPPORTED |
| Expressly conditional acceptance "would have prevented a contract" (Bayway ≈ 2.0) | § 2-207(3); C&M 282, 293 | FAILS (E5) |
| "§ 2-207(2) did not apply" to a nonmerchant (Klocek ≈ 3.2) | C&M 284, 302 | FAILS (E6) |
| Kansas "adopted" rolling formation (note-howard) | C&M 303 | FAILS (E1) |
| RLCC comment is "Comment 1" in the 2019 draft (lecture note) | sel 26222–26248 | FAILS (E7) |
| The magistrate judge ("He") (Northrop map) | C&M 291 | FAILS (E11) |
| Five forms "OMT produced" (Bayway map) | C&M 287 | FAILS (E8) |

## (e) Slide comparison for the lecture notes (`tools/canons/data/lectures.json`, class 9, 9 slides)

- Slides 1–3: the title, topic list and the generic "Key questions" slide. Slide 2's topics are folded into the Klocek topic's first sentence, and slide 3 is not recorded. That is acceptable, though it makes the class overview appear under the Klocek heading.
- Slide 4 (Klocek) and slide 5 (Hill): recorded accurately as questions. No legal condition is dropped.
- Slide 6 (pros and cons): accurate.
- Slide 7 (empirical study): the note reorders the slide so that it suggests a comparison with the Article 2 defaults (E14).
- Slide 8 ("Cmt 3"): the note correctly flags the 2024 numbering but gives the wrong 2019 comment number (E7). Slide 8's first sentence exists only in the 2024 text.
- Slide 9 (§ 2(b)): the note faithfully records the slide, which quotes the 2019 wording verbatim. Proposed addition, keeping the classroom wording: "Legal qualification: In the 2024 Official Text, which the Atlas follows, a later-provided term is adopted only 'if the business demonstrates that' these three conditions were met, so the business bears the burden; the Selections' 2019 draft does not say who must prove them. Section 2(c), also assigned, keeps the contract in force without the unadopted terms."
- Assigned but not on the slides: § 2(c). The `gap-rlcc` hub teaches it. The hub's paraphrase drops "incorporated" from 2024 (c)'s "terms supplied or incorporated by law" (nit).

## (f) Required route test (one decisive fact changed per case)

| Case | Chart and path entered (original facts) | Displayed result | Changed decisive fact, path, result | Correct? | ≈ sentences preserve the distinction? |
|---|---|---|---|---|---|
| Bayway | K-16: a –Article 2→ b –Effective acceptance→ d –Additional→ e –Both merchants→ f –No exception→ i | Tax Clause incorporated (correct) | (1) OMT proves objective surprise: f –An exception applies→ l, excluded (correct). (2) Bayway's confirmation expressly conditional, then delivery: b –Expressly conditional→ c –Mutual recognition by conduct→ h, writings disagree, clause out (correct). (3) No custom evidence; OMT shows only subjective surprise: f has no burden guidance (E3) | Yes, but E3 | (2): No. ≈ 2.0 says "would have prevented a contract" (E5) |
| Bayway | K-17: a –tax clause→ b –No statutory obstacle (or Possible material alteration → e)→ d –No material alteration proven→ h | Incorporated (correct) | No custom evidence, OMT shows only subjective surprise: d "Did trade usage remove the surprise?" → "Surprise or hardship proven" → g, excluded | No: the source says incorporated (E2) | ≈ 3.1 preserves it ("OMT offered no evidence on that") |
| Northrop | K-16: a → b –Effective acceptance→ d –Different→ g –Knockout→ m | Both warranties out; reasonable time, six months (correct for the Illinois prediction) | (1) Jurisdiction follows Posner's or California's view: g –Treat like an addition→ e –Both merchants→ f –materially alters→ l, Litronic's 90 days (correct, C&M 291). (2) Leading minority: g –Offer controls→ l, 90 days (correct). (3) Lynch expressly conditions acceptance: b → c –conduct→ h, § 2-207(3) gap-fillers (consistent with the brief) | Yes | Yes (≈ 1.1, 2.0, 2.1, 3.1) |
| Northrop | K-17: a –Competing warranty durations→ c –Knockout→ f | Reasonable time (correct) | Treat as addition: c → b –Possible material alteration→ e –Material alteration→ g "Where the original term survives ... use that term", 90 days (correct) | Yes | Yes |
| Hill | K-10: a –Term arrived after order or delivery→ c –Seller's offer invited retention→ d –Valid retention acceptance→ g | Term may govern (correct) | (1) Hills return the computer within 30 days: d → h (correct). (2) Buyer first alerted on opening and deterred by shipping cost: d –"Return or inadequate notice"→ h; Hill left this open (C&M 297), and RLCC § 2(b)(1), (3) would deny adoption, so the result is defensible but not Hill's holding | Yes (with G1) | Partly: no ≈ covers the open question (G6) |
| Hill | K-16 (the natural chart for "Did 2-207 apply?"): a → b → no single-form exit; d → e → l or c → h | Arbitration excluded under every path | (same facts) | No: under Hill arbitration is part of the contract (E4) | Hill ≈ 3.1 states the one-form theory correctly; the chart does not |
| Klocek | K-10: a → c –Buyer's offer accepted by shipment→ e –Retention alone under Klocek→ h | Term did not enter (correct) | (1) In-store purchase (Klocek's own account): no edge fits at c; the student may take seller's offer → d → g. Wrong (E12). (2) Gateway tells the buyer at the sale that the sale is conditioned on terms to follow: no node mentions it; the student may reach g, which matches Klocek n.4 by chance (G5) | Partly | ≈ 3.0 preserves the conditional-acceptance distinction; ≈ 3.2 misstates § 2-207(2) (E6) |
| Klocek | K-16: a → b –Effective acceptance or confirmation→ d –Additional→ e –Nonmerchant, no assent→ l | Excluded (correct) | Buyer is a merchant: e –Both merchants→ f, materiality test (correct route) | Yes | Yes |
| Problem (C&M 293) | K-16: a → b –Expressly conditional→ c –Mutual recognition by conduct→ h | Arbitration (buyer's term only) not in the contract | n/a | Consistent with § 2-207(3) | n/a (G7) |
