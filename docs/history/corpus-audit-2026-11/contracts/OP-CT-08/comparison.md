# OP-CT-08 comparison: Contracts Class 8 (Drennan, Dorton, C. Itoh; firm offers; scope of Article 2)

Sources: C&M 246–259 and 269–283 (ct08-casebook.txt; printed page = PDF page − 45 throughout this range, confirmed by running heads at pp. 250, 254, 256, 258, 268, 270, 280, 282); SUPP 9–10 (N.Y. G.O.L. §§ 5-1103 to 5-1115); SEL Restatement §§ 25, 45, 48, 62, 87, 90 and UCC §§ 2-102, 2-104, 2-105, 2-204 to 2-207 with comments; slide deck ct08-slides.txt (30 slides). The learn list is in learn-list.md.

## 0. Packet problems found before review

1. **The staged surfaces file was empty.** `ct08-surfaces.md` reads "Contracts class 08: None" because the staging script passed "08" to `tools/content-audit/session_surfaces.py`, while the corpus keys class 8 as "8". I regenerated it read-only into `ct08-surfaces-class8.md` (run from the repository with `python3 -I -B … 8`; `build_data()` writes nothing, since all writes in `tools/r19/assemble.py` are in `main()`). The surfaces files for OP-CT-05, 06, 07, 09 and 10 are the same 67-byte stub and need the same fix (pass 5, 6, 7, 9, 10).
2. **The surfaces tool applies r21 corrections but not the `tools/r19/data/plain.json` overlay**, which the app applies first (`src/features/r19/plain.js`). For this class it matters once: the surfaces show C. Itoh's map Procedural History ending "This account follows the casebook’s excerpt of the opinion (Farnsworth, seventh edition, pp. 199–201) …", but plain.json removes that sentence at run time, so I do not report it. Other packets' reviewers may report text that readers never see.
3. Concept entries that the principal-case surfaces do not include (ucc205, ny51109, rest45, rest87, option-contract, merchant, article2-scope, ucc204, ucc206, ucc207, ucc207-conduct, conditional-acceptance, problem-maine and others) are extracted, with plain.json and r21 overlays checked, in `ct08-concept-nodes.md` (raw text; overlays noted below where they change it).
4. The corpus lists the supplement as p. 9 only; the prompt says pp. 9–10. Page 10 holds only the end of § 5-1115, so nothing is lost.

## 1. Coverage

| Learn-list item | Where the Atlas teaches it | Status |
|---|---|---|
| Option contracts, § 25 | option-contract, irrevocability nodes; K-13 a, b | Covered; the option-contract node's list of routes is incomplete (E6) |
| § 87(1) signed recital | rest87 node; K-13 b; Rules & authorities restatement-87 | Covered |
| § 45 option by part performance, completion condition, preparation | rest45, problem-bridge nodes; K-13 d, f, i; firm-offers timeline step 1 | Covered |
| § 62 contrast | Rules & authorities restatement-62 only | Gap G7 |
| § 87(2) elements | rest87 node (served text names the subsection but not its elements); firm-offers timeline step 6; K-13 e | Partial, gap G3 |
| § 90 | Rules & authorities; reliance timeline; Drennan surfaces | Covered |
| Death of offeror, option exception | death-offer node | Covered; its application to the Maine problem is gap G4 |
| Baird | note-baird; firm-offers step 2; K-13 e | Covered |
| Drennan facts, holding, § 45 analogy, mistake | Drennan map, brief CTR-031, takeaway, Cold Call, timelines | Covered and accurate, with E8 and E12 |
| Drennan limits: expressly revocable bid; bid shopping; known mistake | Brief, Cold Call, timeline contexts, notes-bids | Covered in prose; missing from the flowchart branch (E4, E5) |
| Holman | note-holman | Covered |
| Drennan in New York (slide 10) | None | Gap G2 |
| § 2-205 elements | ucc205 node (served after plain.json then r21), Rules & authorities ucc-2-205, firm-offers step 4, K-13 c, K-02 h | Covered |
| § 2-205 comments 2–3 (oral firm offers; longer periods; supported options) | None | Gap G1 |
| Merchant, § 2-104 | merchant node; K-02 h; K-16 e | Covered |
| N.Y. § 5-1109 | ny51109 node; firm-offers step 3; K-13 c | Covered as text; its scope relative to § 2-205 and the absence of a Rules & authorities entry are gap G2 |
| Scope of Article 2, hybrids | article2-scope, hybrid-amendments, note-bonebrake, note-foster, note-anthony-pools; K-02 c–i | Covered (E11 minor) |
| Mirror image, last shot, Macaulay, boilerplate | mirror-image, last-shot, boilerplate, note-ardente, note-rios; K-16 j | Covered |
| § 2-204 | ucc204 node (served after overlays), Rules & authorities | Covered |
| § 2-206 | ucc206 node; K-14 d | (1)(b) covered; (2) and Comment 3 are gap G5 |
| § 2-207(1) "definite" expression (dickered terms) | boilerplate node mentions it in general terms | Gap G6 |
| § 2-207(1) "expressly made conditional" | conditional-acceptance; Dorton and Itoh surfaces; K-16 b | Covered |
| § 2-207(2) between merchants and the exceptions | additional-terms; K-16 e, f; K-17 b, e | Covered, except the express-agreement route for material terms (E2) |
| § 2-207(3) conduct and its terms | ucc207-conduct; Itoh surfaces; K-16 c, h; forms step 3 | Covered; the ucc207-conduct node misstates which terms drop out (E1) |
| Knockout and default terms | knockout, different-terms nodes; K-16 g, m; K-17 c, f | Covered, but mostly Class 9 material (C&M 284 and after) |
| Dorton holding and remand questions | Dorton surfaces; K-16 b; K-17 e | Covered and accurate |
| Itoh holding and policy | Itoh surfaces; K-16 c, h | Covered; takeaway drops the decisive condition (E3) |

## 2. Errors in existing text

Ordered with result-changing findings first.

### E1. ucc207-conduct map entry: the text says only conflicting terms drop out under § 2-207(3)
- **Surface and field:** map entry `ucc207-conduct` (src/data/seedData/nodes-45978ecb29/00440-ucc207-conduct-5d5f812dc5.json), `notes`. No plain.json or r21 overlay touches it, so readers see this text. K-16 nodes c and h cite this entry.
- **Current text:** "Conflicting terms in the two forms therefore drop out (the knock-out rule) and the Code’s gap-fillers take their place."
- **Verdict:** CHANGES RESULT.
- **Counterexample:** C. Itoh's own facts. Jordan's arbitration clause "had no counterpart in Itoh's purchase order" (C&M 281), so it was an additional term, not a conflicting one. A student who reads that only conflicting terms drop out would keep the arbitration clause in the subsection (3) contract, which is the opposite of the holding. The sentence also gives the name of the knockout rule, which courts apply to different terms in a contract formed under subsection (1) (slide 16; knockout node), to the statutory text of subsection (3). The served knockout node (after r21) itself warns against running the two routes together.
- **Pinpoint:** C&M 282 ("Since it is clear that the Jordan and Itoh forms do not 'agree' on arbitration …"; disputed additional terms "are necessarily excluded from a subsection (3) contract"); C&M 275; UCC § 2-207(3) and Comment 7 (SEL).
- **Replacement:** "Every term on which the writings do not agree therefore drops out, whether it is an additional term with no counterpart (as in C. Itoh) or a conflicting one, and the Code’s supplementary terms fill any resulting gaps. This follows from the text of subsection (3); it is not the knockout rule that some courts apply to different terms in a contract formed under subsection (1)."

### E2. K-16 node f and K-17 node e: no route for a material term that the other merchant expressly agreed to
- **Surface and field:** tools/flowcharts/data/contracts.json, chart K-16 node `f` (edges "An exception applies" → `l`, "No exception" → `i`) and chart K-17 node `e` (edges "Material alteration" → `g`, "No material alteration and other conditions met" → `h`).
- **Current text:** K-16 f detail "Check whether the offer expressly limits acceptance, whether the term materially alters the bargain, and whether the offeror objected already or within a reasonable time after notice."
- **Verdict:** CHANGES RESULT.
- **Facts entered:** Dorton with one changed fact: both parties are merchants, the arbitration clause is found material, and The Carpet Mart signed and returned the acknowledgment (the form's own option (a), C&M 277) or otherwise expressly agreed to arbitration.
- **Path:** K-16 a –"Article 2"→ b –"Effective acceptance or confirmation"→ d –"Additional"→ e –"Both merchants"→ f –"An exception applies"→ l "Exclude the proposed variance". K-17 a → b –"Possible material alteration"→ e –"Material alteration"→ g "Apply the surviving terms or default".
- **Source-supported result:** the clause is part of the contract. A materially altering addition "could not become a part of the contract 'unless expressly agreed to'" (Dorton, C&M 280, quoting Comment 3); Comment 3 (SEL): material additions "will not be included unless expressly agreed to by the other party." K-16 node e already gives non-merchants an "actual assent" exit, so only merchants lack one.
- **Minimal fix:** add to K-16 f an edge "Material, but expressly agreed to" → `i`, and append to f's detail: "A materially altering addition still enters if the other party expressly agrees to it (Comment 3; Dorton)." Add to K-17 e an edge "Material, but expressly agreed to" → `h`, and change h's first sentence to: "The new clause enters under subsection (2) when merchants are involved and no exclusion applies, or when the other party expressly agreed to it."

### E3. C. Itoh takeaway drops the decisive condition, "expressly … on the buyer's assent"
- **Surface and field:** Takeaway (tools/r19/data/takeaways.json), `citoh`.
- **Current text:** "When a seller's form says the deal is conditional on its extra terms, the buyer never agrees, and both sides perform anyway, the contract is made by their conduct."
- **Verdict:** MISSING CONDITION (changes the result on Dorton's facts).
- **Counterexample:** Dorton's form said the order was "subject to all of the terms and conditions on the face and reverse side" (C&M 277). A student could fairly call that "conditional on its extra terms", apply this takeaway, send the case to subsection (3), and drop the arbitration clause. That is the district court's error, which the Sixth Circuit reversed (C&M 280 n.4). The proviso needs an acceptance "expressly made conditional on assent" (§ 2-207(1)) that reveals the offeree's unwillingness to proceed without that assent (C&M 279).
- **Pinpoint:** C&M 279–280 (Dorton), 281–282 (Itoh's form language and holding).
- **Replacement (52 words, two sentences):** "When a seller's form expressly makes its acceptance conditional on the buyer's assent to its extra terms, the buyer never assents, and both sides perform anyway, the contract is made by their conduct. Its terms are only what both forms share, plus the Code's default rules; the seller's extra terms drop out."

### E4. K-13 node e: the reliance branch omits the conditions that defeat Drennan protection
- **Surface and field:** chart K-13 node `e`, `detail`.
- **Current text:** "Drennan protected the general contractor that reasonably used a definite bid in its own bid."
- **Verdict:** MISSING CONDITION.
- **Facts entered:** Drennan with one changed fact: Star's telephoned bid said it was "revocable at any time before acceptance". Path: a –"Preparations or subcontractor bid"→ e. Nothing in e tells the student that the reservation matters, so on otherwise identical reliance facts the student takes "Reliance protection under governing rule" → g "Withdrawal cannot defeat timely acceptance".
- **Source-supported result:** no protection. "Had defendant's bid expressly stated or clearly implied that it was revocable at any time before acceptance we would treat it accordingly" (C&M 255). Likewise, if the general "had reason to believe that defendant's bid was in error, he could not justifiably rely on it" (C&M 257).
- **Replacement:** "Drennan protected the general contractor that reasonably used a definite bid in its own bid. Protection fails if the bid expressly or clearly reserved a power to revoke before acceptance, or if the general knew or had reason to know the bid was mistaken." (The node's remaining sentences stay as they are.)

### E5. K-13 node g: the protected period is not tied to prompt acceptance
- **Surface and field:** chart K-13 node `g`, `detail`.
- **Current text:** "Measure the actual protected period. Drennan gave the general a reasonable opportunity to accept after award."
- **Verdict:** MISSING CONDITION.
- **Facts entered:** Drennan with one changed fact: after the award, Drennan solicits lower paving bids for two weeks while telling Star he may still hold it to $7,131.60, and then tries to accept. Path: a → e –"Reliance protection under governing rule"→ g. The chart shows "Withdrawal cannot defeat timely acceptance" and does not tell the student that this conduct forfeits the protection.
- **Source-supported result:** no continuing right to accept. The general "is not free to delay acceptance after he has been awarded the general contract in the hope of getting a better price," nor can he "reopen bargaining with the subcontractor and at the same time claim a continuing right to accept the original offer" (C&M 256–257). The timeline contexts and the notes-bids node already say this, but the chart does not.
- **Replacement:** "Measure the actual protected period. Drennan gave the general a reasonable opportunity to accept after award; a general who delays acceptance to seek a better price, or reopens bargaining, cannot claim a continuing right to accept."

### E6. option-contract map entry: the list of routes leaves out § 87(1) and New York § 5-1109
- **Surface and field:** map entry `option-contract`, `notes` (the served text equals the raw file; the r21 edit's "old" value no longer matches, which is harmless because the raw file already holds its "new" value).
- **Current text:** "The course presents four routes: consideration for holding an offer open, a merchant firm offer, beginning performance under § 45, and qualifying reliance associated with § 87(2), illustrated by Drennan."
- **Verdict:** OVERSTATED (it states that there are four routes and omits two that the slide and the readings teach).
- **Counterexample:** a non-merchant homeowner in New York signs a letter offering to sell a used piano and stating "this offer is irrevocable for 30 days." None of the four listed routes applies (no consideration, not a merchant, no performance, no reliance), yet § 5-1109 makes the offer irrevocable for the 30 days (SUPP 9). Slide 5 lists § 5-1109 and § 87(1) separately.
- **Pinpoint:** slide 5; C&M 247–248 (Notes 2–3); § 87(1) (SEL); SUPP 9.
- **Replacement:** "The course presents several routes: consideration for holding an offer open; a signed writing that recites a purported consideration and proposes a fair exchange (§ 87(1)); a statute (UCC § 2-205 for merchants’ signed offers of goods, N.Y. G.O.L. § 5-1109 for other signed offers stating that they are irrevocable); beginning performance under § 45; and qualifying reliance under § 87(2), illustrated by Drennan."

### E7. Lecture-notes record, topic "UCC §§ 2-204 and 2-207": the paraphrase drops conditions that the slides contain
- **Surface and field:** Lecture notes record (tools/canons/data/lectures.json, Contracts class 8; the record has no `id` and a null `date`), topic heading "UCC §§ 2-204 and 2-207", `body`.
- **Current text:** "(3) lets conduct recognizing a contract establish one" and "become part of the contract unless the offer limits acceptance, they materially alter it, or objection is given".
- **Verdict:** MISSING CONDITION. This is the Atlas's own paraphrase, not classroom shorthand: slide 14 reads "Conduct by both parties which recognizes the existence of a contract … although the writings of the parties do not otherwise establish a contract", and slide 15 reads "the offer expressly limits acceptance to the terms of the offer" and "notification of objection to them has already been given or is given within a reasonable time after notice of them is received."
- **Counterexample:** the seller ships under an expressly conditional acknowledgment and the buyer rejects the goods on arrival. Only one party's conduct recognizes a contract, so § 2-207(3) forms none. The record's wording suggests the seller's conduct alone is enough.
- **Replacement (surgical, two phrases):** "(3) lets conduct by both parties recognizing a contract establish one although the writings do not" and "become part of the contract unless the offer expressly limits acceptance to its terms, they materially alter it, or objection has been or is given within a reasonable time after notice". Also change "Section 2-207(1) makes a definite and seasonable expression of acceptance an acceptance" to "Section 2-207(1) makes a definite and seasonable expression of acceptance, or a written confirmation sent within a reasonable time, an acceptance" (slide 14; Dorton's remand turns on the confirmation alternative, C&M 278, 281).

### E8. Drennan rule line and chronology note: "irrevocable for a reasonable time"
- **Surface and field:** Effective brief CTR-031, `rule`; Chronology 'course-chronology-0' step 143, `note` (same text).
- **Current text:** "making it irrevocable for a reasonable time even without bargained-for consideration."
- **Verdict:** OVERSTATED. The opinion gives the general "at least an opportunity to accept defendant's bid after the general contract has been awarded" and forbids delay to shop (C&M 256–257); the editors' Note 1 asks "Does the opinion suggest how soon?" (C&M 258). "A reasonable time" suggests a period of free deliberation, which the opinion denies.
- **Replacement rule line (36 words):** "Reasonable, foreseeable reliance producing a prejudicial change of position can support an implied subsidiary promise not to revoke an offer, giving the offeree an opportunity to accept promptly after the contemplated award, even without bargained-for consideration."

### E9. Timeline 'forms' step 1 (ucc207) note omits the proviso
- **Surface and field:** tools/r19/data/timelines.json, timeline `forms`, step with id `ucc207`, `note`. Not touched by prior corrections.
- **Current text:** "an acceptance can form a contract though it adds or changes terms."
- **Verdict:** MISSING CONDITION (low; the timeline's "now" field states the proviso).
- **Replacement:** "For sales of goods the Code drops the mirror-image rule: a definite and seasonable acceptance can form a contract though it adds or changes terms, unless it is expressly conditional on assent to them."

### E10. Drennan map entry, Reasoning: the 160 percent figure and a typo
- **Surface and field:** Drennan map entry `sections.Reasoning`.
- **Current text:** "paving quotations varied by as much as 160 percent" and "reopen bargaining while holding the bid in reserve,."
- **Verdict:** OVERSTATED (minor). The court said there "was usually a variance of 160 per cent between the highest and lowest bids for paving in the desert around Lancaster" (C&M 257). That figure is typical, not a maximum. The ",." is a typo.
- **Replacement:** "paving bids in the area usually varied by 160 percent between highest and lowest" and "reopen bargaining while holding the bid in reserve."

### E11. K-02 node e: predominant-purpose factors not in the assigned excerpt
- **Surface and field:** chart K-02 node `e`, `detail`.
- **Current text:** "Contract wording, supplier’s business and relative allocation of price help establish the predominant purpose."
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES. C&M 249 gives Bonebrake's test (services with incidental goods versus a sale with incidental labor) but lists no factors. This is not wrong, only unsupported by the assigned pages.
- **Replacement:** delete the sentence, or replace it with "The assigned note gives the test and two examples (a painting commission; installing a water heater) but not the factors courts use to apply it."

### E12. C. Itoh learning.topics: "leading application"
- **Surface and field:** C. Itoh map entry `learning.topics.ucc207-conduct`.
- **Current text:** "C. Itoh is the leading application of 2-207(3)"
- **Verdict:** UNSUPPORTED BY ASSIGNED SOURCES (low). The excerpt calls it "the classic 'battle of the forms'" (C&M 282) but does not rank it among subsection (3) cases.
- **Replacement:** "C. Itoh applies 2-207(3): performance by both parties forms the contract when the writings do not."

### Checked and supported (no change)
Drennan's map entry, brief, takeaway, Cold Call and ≈ sentences state the facts, the rejection of option and bilateral theories, the § 90 holding, the § 45 analogy, the mistake analysis and the remedy accurately (C&M 253–258). Dorton's map entry, brief CTR-032, takeaway, Cold Call and ≈ sentences state the proviso test, the remand questions (oral agreement, arbitration already agreed, material alteration) and the "unless expressly agreed" consequence accurately (C&M 276–281). C. Itoh's map entry, brief CTR-033, Cold Call and ≈ sentences state the counteroffer, the subsection (3) contract and the gap-filler limit accurately (C&M 281–283). The firm-offers and forms timeline steps for these cases, K-16 nodes b, c and h, and the Rules & authorities entries restatement-45, -87, -90 and ucc-2-201, -204, -205, -206, -207 match the Selections text.

Items that are **not in the assigned excerpt** but are not shown to be wrong: Dorton's "more than fifty-five" transactions (the editors' bracket at C&M 276 says "55 transactions"), the visiting salesman, Prima Paint and the breadth of the stay, 28 U.S.C. § 1292, and Judge Brooks; C. Itoh's Riverview Steel, the judicial-economy ground, § 2-201, the FAA written-agreement alternative and the 1974 form dates; Drennan's decision date, the unanimous panel, mitigation and the special demurrer.

Prior corrections (prior-corrections.json, 76 entries, almost all timeline redesign and PDF-furniture cleanup) are not repeated. The corrected Drennan timeline notes and contexts are accurate.

## 3. Teaching gaps (assigned material no surface teaches)

**G1. § 2-205 Comments 2 and 3.** Home: map entry `ucc205`, `notes` (append after the served r21 checklist). Draft: "Comment 2: an oral firm offer stays revocable even where trade practice relies on oral offers, because a signed writing is the essence of the section. Comment 3: a writing promising a longer period binds without consideration only for the first three months; an option supported by consideration can last as long as the parties agree." (SEL § 2-205 cmts. 2–3.)

**G2. New York § 5-1109: its scope relative to § 2-205, a Rules & authorities entry, and slide 10's New York question.** Home: map entry `ny51109`, `notes`; a new Rules & authorities entry "N.Y. Gen. Oblig. Law § 5-1109" from SUPP 9 (none exists in tools/v25/authorities.json); optionally K-13 node c detail. Draft for ny51109: "Because § 2-205 governs a merchant's offer to buy or sell goods, § 5-1109 does the work for everyone else: a non-merchant's offer, or an offer of services or land, binds without consideration if a signed writing states that it is irrevocable, for the stated period (with no three-month cap) or, if none is stated, a reasonable time. It would not have saved Drennan's telephoned bid, which was not a signed writing; whether New York protects reliance on an oral bid is not answered by the assigned materials." (SUPP 9; C&M 247–248; slide 10.)

**G3. § 87(2)'s elements.** Home: map entry `rest87`, `notes`. The served text, after plain.json, ends "The two subsections address different routes" and states neither subsection's elements, although § 87 is in the assigned Selections. Draft: "Section 87(2) binds an offer as an option only if the offeror should reasonably have expected it to induce action or forbearance of a substantial character before acceptance, and it did; the option binds only to the extent necessary to avoid injustice. Comment e adds that the reliance must be substantial as well as foreseeable." (SEL § 87(2) and cmt. e.)

**G4. The Move to Maine problem: § 45 Illustration 6 and the death rule.** Home: map entry `problem-maine`, `notes`. Draft: "Restatement § 45 Illustration 6 treats a similar letter (a farm for a daughter who gives up her home and cares for her mother) as an offer inviting performance: once the daughter gives up her home, moves and begins caring, the mother is bound by an option contract. Death ends an ordinary power of acceptance (§ 48) but not an option (C&M 259), so the death question turns on whether selling the Missouri home and business began the invited performance or was only preparation (§ 45 Comment f)." (The last step is an inference from these sources; neither the casebook nor the Selections answers the problem.)

**G5. § 2-206(2) and Comment 3.** Home: map entry `ucc206`, `notes`. Draft: "Under § 2-206(2), where beginning performance is a reasonable mode of acceptance, an offeror who is not notified of acceptance within a reasonable time may treat the offer as having lapsed; Comment 3 leaves open the common-law possibility that beginning performance temporarily bars revocation." (SEL § 2-206(2), cmt. 3.)

**G6. A "definite" expression of acceptance (dickered terms).** Home: chart K-16 node `b`, `detail`. Draft: "A response that departs from the offer in dickered terms such as price or quantity may not be an expression of acceptance at all (C&M 276, citing Koehring v. Glowacki)."

**G7. § 62 versus § 45.** Home: map entry `rest45`, `notes`. Draft: "If the offer instead lets the offeree accept either by promise or by performance, beginning the performance is an acceptance that operates as a promise to finish (§ 62), so the offeree is bound as well." (SEL §§ 45 cmt. a and d, 62; slide 5 cites "§§ 45 or 62".)

**G8. Confirmations in K-16's term comparison.** Home: chart K-16 node `d`, `detail`. The node says an additional clause "concerns a point the offer did not cover." Where the response is a written confirmation, the comparison is with the prior oral agreement (Dorton, C&M 278–279, 281; § 2-207 cmt. 1). Draft replacement for that sentence: "An additional clause concerns a point the offer, or the prior agreement being confirmed, did not cover."

## 4. Slides compared with the lecture-notes record

The record (Contracts class 8; slideCount 30, file name matching the deck) tracks the slides closely. Topic by topic:

1. **"Limits on the power of revocation" (slide 5).** Accurate to the slide. The slide's shorthand drops conditions, so keep the wording and add: "Legal qualification: § 2-205 applies only to a merchant's signed written offer to buy or sell goods that assures it will be held open, for no more than three months, with a separate signature for an assurance on the offeree's form; § 5-1109 needs a signed writing stating that the offer is irrevocable. Under § 45 beginning performance creates only an option, and the offeror's duty stays conditional on completion; under § 62 beginning performance is itself an acceptance that binds the offeree to finish. Section 87(2) applies only to reliance of a substantial character that the offeror should reasonably have expected before acceptance, and it binds the offer only to the extent necessary to avoid injustice."
2. **"Problem: The Move to Maine" (slide 6).** Accurate. See G4.
3. **"Acceptance by performance and the smoke ball" (slides 7–9).** Accurate to the slide text. The statement that these slides "repeat from Class 7" cannot be checked against this packet's sources.
4. **"Drennan v. Star Paving" (slide 10).** Accurate. The New York question has no answer anywhere in the Atlas (G2).
5. **"Battle of the forms at common law" (slide 12).** Accurate.
6. **"UCC §§ 2-204 and 2-207" (slides 13–15).** Not accurate to the slides: see E7. Edit the record itself, since the slides contain the conditions.
7. **"The § 2-207 table" (slides 16–17).** Accurate. Add: "Legal qualification: an additional term that is not incorporated because the contract is not between merchants remains a proposal the offeror may accept, and between merchants a materially altering term still enters if expressly agreed to (§ 2-207(2), Comment 3). The 'Trigger for 2-207(3)' column applies only if both parties' conduct recognizes a contract; if the offeror instead expressly assents to the conditional response, a contract forms on the response's terms (C&M 274)." The record omits slide 17's footnote ("Subject to writing requirement, which might be satisfied by the confirmation, and interpreted in light of commercial context") and its Comment 6 reference for conflicting confirmations; adding both would match the slide. The different-terms rules on these slides are developed at C&M 284 and after (Class 9).
8. **"Dorton v. Collins & Aikman" (slides 18–22).** Accurate. Slide 18 quotes the acknowledgment more fully than the casebook's bracketed excerpt (C&M 277); the record describes it correctly.
9. **"C. Itoh v. Jordan International" (slide 23).** Accurate.
10. **"Bayway", "Northrop", "Problem: Misplaced Strategies" (slides 24–29).** Accurate to the slides. Their page references (285, 290, 293) fall in Class 9's assignment (C&M 284–304), so this deck covers part of Class 9. The record could note that.
11. **"Policy considerations" (slide 30).** Accurate.

Data note: the record's `id` and `date` are null, which is why the surfaces label it "Lecture notes record (None)".

## 5. Required route test

### Drennan: chart K-13 "Can the offer still be revoked?" (the chart that cites it and the one a student would open)
- **Case facts:** telephoned paving (services) bid, definite, silent on revocation; general used it, named Star, won; Star withdrew next morning before acceptance; no reason to know of the mistake; California.
- **Path:** a –"Preparations or subcontractor bid"→ e –"Reliance protection under governing rule"→ g. **Display:** "Withdrawal cannot defeat timely acceptance … Drennan gave the general a reasonable opportunity to accept after award." **Correct** (C&M 256).
- **Changed fact 1: bid expressly revocable before acceptance.** The source says no protection (C&M 255). The chart gives a student no basis to leave the reliance branch, so the same path reaches the same display. **Wrong:** E4.
- **Changed fact 2: the general shops the bid after award, then accepts.** The source says no continuing right to accept (C&M 256–257). The chart reaches g with no warning. **Wrong:** E5.
- **Changed fact 3: the general had reason to know of the mistake.** The source says no justifiable reliance (C&M 257). The edge "No justified reliance or Baird route" → h works only if the student already knows the rule; node e does not state it (E4 fixes this).
- **Changed fact 4: the same oral bid in New York.** c: § 2-205 does not apply (services, oral) and § 5-1109 does not apply (no signed writing) → "No statutory protection". e: "under governing rule". The assigned sources do not decide New York's reliance rule, so the chart's neutrality is correct (G2).
- **Changed fact 5: a signed written bid "firm until award" in New York.** c –"Statutory requirements met"→ g. **Correct** under § 5-1109 (SUPP 9).
- **Also checked:** K-06 c → f ("Grant the relief justice requires") is consistent.
- **≈ sentences:** they keep use of the bid separate from acceptance (2.1), state the § 45 analogy (3.1), and state the limit on shopping and reopening (3.2). The express-reservation limit appears in Cold Call episode 4 but in no ≈ sentence; it is not required there.

### Dorton: charts K-16 and K-17
- **Case facts:** carpet (goods); both merchants; telephoned orders; acknowledgments "subject to" printed terms that list acts and silence as binding the buyer; arbitration clause on the reverse; delivery and payment without objection.
- **Path K-16:** a –"Article 2"→ b –"Effective acceptance or confirmation"→ d –"Additional" (if the oral orders were silent) or "Terms match" (if the oral orders already included arbitration)→ e –"Both merchants"→ f → l (material) or i (not material). K-17: a → b –"Possible material alteration"→ e "Test the specific arbitration … change … Dorton required findings on materiality". **Correct:** this matches the remand (C&M 280–281).
- **Changed fact 1: the acknowledgment expressly conditions acceptance on the buyer's assent** (Itoh's language); buyer silent; delivery and payment. b –"Expressly conditional or writings fail"→ c –"Mutual recognition by conduct"→ h: arbitration drops out. **Correct** (C&M 282).
- **Changed fact 2: the buyer is an individual, not a merchant.** e –"Nonmerchant, no assent"→ l: excluded. **Correct** (§ 2-207(2) first sentence; C&M 281 Note 2; C&M 284).
- **Changed fact 3: both merchants, arbitration material, but the buyer signed and returned the acknowledgment.** f –"An exception applies"→ l: excluded. The source includes the term (C&M 280; cmt. 3). **Wrong:** E2.
- **≈ sentences:** 2.2 keeps the "will not go ahead without … agreement" standard; 3.0 keeps the merchant rule and "unless the buyer agrees"; 3.2 keeps the three remand questions. The distinctions each changed fact turns on are preserved.

### C. Itoh: chart K-16 (also touched by another team's review)
- **Case facts:** steel (goods); purchase order without arbitration; acknowledgment "expressly conditional on Buyer's assent"; no assent; delivery and payment.
- **Path:** a –"Article 2"→ b –"Expressly conditional or writings fail"→ c –"Mutual recognition by conduct"→ h: "Retain the terms the writings agree on and add statutory supplements … the unilateral arbitration clause dropped out." **Correct** (C&M 282).
- **Changed fact 1: Itoh expressly assents to Jordan's terms.** c –"Express assent"→ i: contract on the agreed terms, arbitration included. **Correct** (C&M 274).
- **Changed fact 2: Jordan withholds delivery pending assent.** c –"Neither"→ k: no contract. **Correct** (C&M 282–283).
- **Changed fact 3: the parties are not merchants.** The path and result are unchanged. **Correct**, because subsection (3) does not depend on merchant status.
- **Changed fact 4: Jordan's form says only "subject to" its terms.** b –"Effective acceptance or confirmation"→ d … → the subsection (2) analysis. **Correct** (Dorton).
- **Entries the chart links to:** the `ucc207-conduct` entry cited by nodes c and h states that only "conflicting terms" drop out (E1), which reverses the result on Itoh's own facts for a student who reads it. The Itoh takeaway (E3) loses the condition that changed fact 4 turns on.
- **≈ sentences:** 2.1 keeps "expressly made acceptance depend on Itoh's assent"; 3.1 and 3.2 keep agreed terms plus gap-fillers. The distinction survives in the ≈ sentences but not in the takeaway.

### Scope of Article 2: chart K-02
- The three hybrid examples at C&M 248–249: the air conditioner with installation goes c → d → e → h; the radio-station assets go d → f (Foster); Anthony Pools goes d → f. Drennan's paving goes c –"Service transaction"→ i: the firm-offer and forms rules do not govern. **Correct.** The only issue is E11, which is not a branch error.

## 6. What I did not verify
- I did not check the live site. Served text was worked out from the seed files and the overlays (`tools/r19/data/plain.json`, then `r21-audit.json`), on the assumption that plain.js runs before audit.js. r21's "old" values for ucc205 and ucc204 match the plain.json "new" values, which is consistent with that order.
- Full opinions were not read. Statements beyond the casebook excerpt are marked "not in the assigned excerpt", not wrong.
- The Class 7 deck was not available, so the "repeat from Class 7" note is unchecked.
