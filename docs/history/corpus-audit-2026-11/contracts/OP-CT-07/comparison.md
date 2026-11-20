# OP-CT-07 comparison: Contracts Class 7, Offer and acceptance

Source reader's comparison of the Atlas surfaces against the assigned sources. Sources: C&M printed pages 191–192, 198–205, 213–225, 227–229, 235–242, 261–263 (ct07-casebook.txt; printed page = PDF page − 45 throughout, confirmed by the running heads on PDF 251 = 206 and PDF 307 = 262); Restatement (Second) and UCC text in /home/claude/work/src/sel.txt; the Class 7 deck (ct07-slides.txt, 15 slides). Item numbers in brackets such as [L17] refer to learn-list.md.

## 0. Surfaces file

The staged ct07-surfaces.md was a 67-byte stub ("Contracts class 07: None"): session_surfaces.py was called with "07", but the corpus keys classes as "1"–"26". I regenerated it read-only with `python3 -I tools/content-audit/session_surfaces.py 7` and wrote the output over the stub in this packet folder (110,740 bytes). Classes 05, 06, 08 and 09 have the same 67-byte stub and need the same regeneration with an unpadded number. The four principal cases in the corpus are lefkowitz, wucherpfennig, international-filter and white-corlies. Because the notes on silence, antidiscrimination, termination and the mailbox rule are also principal items for this packet, I also read the map entries for the concept and note nodes those topics use (silence, notes-silence, note-hobbs, note-american-bronze, formation-civil-rights, note-perry, problem-barfield, termination-offer, lapse, revocation, mailbox, note-adams, problem-overtaking, acceptance-notice, note-carlill, note-bishop, advertisements, note-leonard, problem-awesome and others) and charts K-01 (node g), K-11, K-12, K-13 and K-14 in full.

## 1. Coverage

| Assigned item (pages) | Atlas surfaces that teach it | Status |
|---|---|---|
| Offer defined, § 24, Corbin, medium vs. intent (191–192) | offer node; lecture note "What is an offer?" | Covered; Corbin's exclusions and the email point are not taught (minor, no gap counted) |
| Moulton v. Kershaw, quotation and quantity (198) | note-moulton; K-11 b | Covered |
| Consumer contracts introduction (198–199) | Not checked here (RLCC team) | Not assessed |
| General rule on advertisements; overselling rationale; French first-come rule (199–200) | Lefkowitz map Reasoning (attributes the rationale to the court, see E5); advertisements node | Partly covered; gap G6 |
| Lefkowitz (200–202) and notes 1–3 (203) | Map entry, brief CTR-027, takeaway, Cold Call, timeline step, K-11 c and f, lecture note | Covered; first-ad question missing (G3); Leonard's definiteness ground missing from the chart (G2) |
| Geismar and consumer-protection statutes (203) | note-geismar; slide 4 lecture note | Covered |
| Bids and auctions, UCC § 2-328, Midas Touch / Mesaros (203–205) | auctions node; K-11 e; advertisements node ("coin-allocation problem") | Covered |
| Advertised rewards, Broadnax, § 71(2), § 23 (205) | reward-knowledge, note-broadnax, K-11 d | Covered |
| Donovan, Foley (213) | note-donovan, problem-foley | Covered |
| Acceptance defined, § 50, Corbin's master-of-the-offer passage (213–214) | acceptance node; lecture note slide 6 | Covered; the silence limit on mastery needs a legal qualification (L-1) |
| Wucherpfennig (214–216) and Hill's v. Kessler note (216) | Map entry, brief CTR-028, takeaway, Cold Call, timeline step, K-14 b, lecture note; problem-kessler | Covered; K-14 b lacks the § 61 distinction (E3) |
| International Filter (217–220) and notes 1–4 (220–221) | Map entry, brief CTR-029, takeaway, Cold Call, timeline step, K-14 f and g, lecture note; note-courtney, problem-kendel | Covered; the notice rule is stated more broadly than the holding (E2) |
| Awesome Acceptance problem (221–222) | problem-awesome; lecture note | Covered; summary misdescribes the 200-a-day cap and omits the modification setting (E8) |
| White v. Corlies & Tifft (222–224) and notes (224–225) | Map entry, brief CTR-030, takeaway, Cold Call, timeline step, K-13 d, K-14 c, lecture note | Covered; casebook-spelling error (E4); Note 1's estimate-as-offer question missing (G4) |
| Ever-Tite (225, 227) | ever-tite-boundary; K-14 c; performance-preparation | Covered |
| Notification in unilateral contracts, Carlill, Bishop v. Eaton, § 54 (227–229) | acceptance-notice, note-carlill, note-bishop, K-14 f, lecture notes for slides 7, 13–15 | Covered; K-14 h mislabels the § 54(2) consequence (E7) |
| Steinberg problem; shipment of goods, § 2-206(1)(b) (229) | problem-steinberg; K-14 d; timeline step ucc206 | Covered |
| Silence, § 69, Hobbs, American Bronze, unsolicited merchandise, negative options (235–236) | silence, notes-silence, note-hobbs, note-american-bronze, K-14 e | Covered in part; § 69's closed list, its (1)(b) asymmetry and the dominion rule are not taught (G1) |
| Formation and antidiscrimination law: § 1981, Perry, 1991 amendment, Barfield (236–238) | formation-civil-rights, note-perry, problem-barfield, K-01 g | Covered |
| Termination overview, options, death (238) | termination-offer, option-contract, death-offer; lecture note slide 8 | Covered; slide 8 needs a legal qualification for the offeree's death (L-3) |
| Lapse: Akers, Loring, Carr, tardy acceptance, Newman, Courtroom Countdown (239–240) | lapse, note-akers, note-loring, note-carr, problem-newman, K-12 b and h | Covered |
| Revocation: civil-law contrast, Hoover, general offers and § 46, Carr, Shuey (241–242) | revocation, note-hoover, note-carr | Covered; civil-law contrast missing (G7); § 46 missing from K-12 b (G5) |
| Option contracts, four routes (242) | option-contract; K-13 | Covered |
| Rejection under an option, Humble Oil, firm-offer variant (261) | problem-humble; K-12 d and e | Covered |
| Mailbox rule: Adams v. Lindsell, § 63 and comment a, invited medium, § 42, overtaking rejection, estoppel (261–263) | mailbox, note-adams, problem-overtaking, K-12 | Covered; K-12 c has no branch for an uninvited medium (E1) |
| U.S. Life v. Wilson opening (263) | wilson-boundary | Covered |

## 2. Errors in existing text

These are ordered with the findings that change a legal result first. Field labels follow the surfaces file; for nodes not in that file I give the file and JSON location.

### E1. K-12 node c has no exit for an acceptance sent by a medium the offer did not invite (CHANGES RESULT)

- Surface: tools/flowcharts/data/contracts.json, chart K-12 ("Which communication took effect first?"), node c, label "Was acceptance dispatched in an invited medium?", edges "Only ordinary dispatch/receipt events" → g, "Rejection sent before acceptance" → e, "Acceptance sent first but rejection arrives first" → f.
- Verdict: CHANGES RESULT. The node asks whether the medium was invited, but every edge assumes that it was. No edge handles an uninvited medium.
- Counterexample (C&M 262): Seller telegraphs an offer. Buyer mails an acceptance Monday. Seller's telegram revoking the offer reaches Buyer Tuesday, and the letter arrives Thursday. On the chart a student goes a → "Check dispatch and receipt" → c → "Only ordinary dispatch/receipt events" → g "Agreement if acceptance took effect while open". That route treats the acceptance as effective Monday and returns a contract. Under the source, § 63 "would not, therefore, ordinarily apply to acceptance by mail of an offer made by telegram, and such an acceptance would be effective only on receipt" (C&M 262). The revocation was received first, so there is no contract. Restatement § 67 is the exception: a seasonable acceptance sent by an uninvited means still counts from dispatch if it arrives within the time a properly sent acceptance would normally have taken.
- Pinpoint: C&M 262; Restatement §§ 63(a), 65, 67, 42.
- Minimal fix: add an edge from c, labelled "Medium or method not invited", to a new node: "Acceptance by an uninvited medium. Such an acceptance ordinarily takes effect only on receipt (C&M 262). Under § 67 a seasonable one counts from dispatch if it arrives when a properly sent acceptance normally would. Compare that time with any revocation or rejection received." That node should have two edges: "Received before any termination" → g and "Termination received first" → h. Chart ownership is for the coordinator to decide.

### E2. International Filter: the notice rule is stated without the condition the court relied on (MISSING CONDITION; can change an exam answer)

The court held that an offeror can dispense with notification, and does so "if the form of the offer ... shows that this was not to be required." (The OCR garbles the words between "form of th" and "shows"; "offer" is the evident reading.) It found that showing in this offer's words: the proposal "becomes a contract when accepted by the purchaser and approved by an executive officer ... at its office in Chicago," and "prompt acceptance" fixed only the time for approval (C&M 219–220). The court did not say that naming an accepting act always dispenses with notice. The editors treat the result as needing reconciliation with the rule that an offeree who accepts by promise must notify the offeror (Note 4, citing §§ 54 and 56 and Kendel v. Pontious, C&M 221; and C&M 227, which asks after stating the § 56 rule whether International Filter can be reconciled with it, though part of that OCR line is lost). Under § 56, acceptance by promise requires reasonable diligence to notify, or seasonable receipt, "except as stated in § 69 or where the offer manifests a contrary intention."

Counterexample. A buyer signs a seller's order form that says only "subject to approval by an officer at our home office." The form does not say it becomes a contract on approval and says nothing about notice. The officer initials it, the seller sends nothing, and the buyer cancels a week later. Under the Atlas wording, approval was "a particular act" the offer authorized, so the buyer is bound without notice. Under the source, the dispensing language that decided International Filter is missing, § 56's default requires notice, and the cancellation of the unaccepted offer is effective.

- (a) Effective brief CTR-029: rule. Current: "An offeror may dispense with notice of acceptance by authorizing a particular act as sufficient acceptance; the offeree then completes the contract by performing that specified act, without separately communicating it." Replacement (41 words): "An offeror may dispense with notice of acceptance, and does so when the offer's terms show notice is not required; an order that 'becomes a contract when ... approved' by the offeree's executive is accepted by that approval without separate notice."
- (b) Chronology 'course-chronology-0' step 87, note. The current text is identical to (a); use the same replacement.
- (c) Effective brief CTR-029: Reasoning. Current: "the offeror may dispense with it by authorizing a particular act as sufficient acceptance." Replacement: "the offeror may dispense with it, and does so when the form of the offer shows that notice was not to be required."
- (d) Map entry: sections.Reasoning. Current: "the offeror may dispense with it by authorizing a particular act as sufficient acceptance;" Replacement: "the offeror may dispense with it when the form of the offer shows notice is not required;".
- (e) Timeline 'acceptance' step 2 (international-filter), note. Current: "The offeror controls the manner: an order that makes home-office approval the acceptance needs no separate notice of that approval (Texas)." Replacement: "The offeror controls the manner: an order stating that it 'becomes a contract when' approved at the home office was accepted by that approval, and its terms dispensed with separate notice (Texas)."
- (f) Flowchart K-14 node f, detail. Current: "The Chicago officer’s O.K. was the prescribed act in International Filter. Carlill invited completed performance without advance notice. Where the offeror may not promptly learn of performance, test whether reasonable notice is required." Replacement: "International Filter's order said it 'becomes a contract when' approved at Chicago, so the officer's O.K. accepted without separate notice; without such terms, an acceptance by promise needs reasonable notice (§ 56). Carlill invited completed performance without advance notice. Where the offeror may not promptly learn of performance, test notice under § 54(2)."
- (g) tools: acceptance-notice map entry, notes (node 00106). Current: "International Filter makes executive approval the accepting act without further notice, although its later letter would have sufficed." Replacement: "International Filter's order said it became a contract when approved at Chicago, so the approval accepted without further notice, although its later letter would have sufficed."
- Supported as written: the takeaway ("If it says approval by a company officer is enough, that approval completes the contract without any separate notice") and the map Holding ("The writing made that act sufficient and required no separate notice") both tie the result to what the offer says.
- Pinpoint: C&M 219–221, 227; Restatement §§ 56, 60.

### E3. K-14 node b sends an acceptance with a side request down the negotiation branch (MISSING CONDITION; changes result on a one-fact variant)

- Surface: Flowchart K-14 node b. Current detail: "Read the response as a whole. In Wucherpfennig stated readiness and financing accompanied unsettled price and valuation requests, so the exchange remained negotiation." Edge "Qualified or undecided response" → h.
- Verdict: MISSING CONDITION. The node teaches the Wucherpfennig result but not its limit, and the only edge for a response that contains a request is "Qualified or undecided."
- Counterexample: change the February 17 letter to read "Donald accepts your offer at $200 an acre, cash. Please tell me the exact dollar amount so I can prepare the papers." The court's test is whether the response is "unequivocal ... of an intent to create thereby, without more, a contract" (C&M 215). Restatement § 61 says an acceptance that requests a change or addition "is not thereby invalidated unless the acceptance is made to depend on an assent to the changed or added terms." The source-supported result is an acceptance made before the March 9 revocation. A student who follows node b's detail matches "price ... requests" and goes to h, which returns no contract. The brief, the Cold Call (episode 5 and its plain sentence 4.1) and the timeline context all state the distinction; the chart does not.
- Replacement detail: "Read the response as a whole. In Wucherpfennig, readiness and financing came with a request that Elizabeth state the amount she expected, so the exchange remained negotiation. A definite acceptance that merely asks a question or requests a change still accepts unless it is made to depend on that change (§§ 59, 61)."
- Pinpoint: C&M 215–216; Restatement §§ 58, 59, 61.

### E4. White map entry attributes the deck's spelling "Tift" to the casebook (WRONG CITATION)

- Surface: white-corlies, Map entry: sections.Parties. Current: "the casebook spells the name Tift."
- Verdict: WRONG CITATION. The casebook heads the case "White v. Corlies & Tifft" (C&M 222) and uses "Corlies & Tifft" in its notes (C&M 224, 227). The spelling "Tift" appears in the class deck (slide 12) and in the lecture-note heading that copies it.
- Replacement: "the class slides spell the name Tift."

### E5. Lefkowitz: the overselling rationale is presented as the court's reasoning (UNSUPPORTED BY ASSIGNED SOURCES)

- Surface: lefkowitz, Map entry: sections.Reasoning. Current: "Those terms also answered the usual objection to treating advertisements as offers, that a merchant might be bound beyond its stock, because the quantity and the taker were fixed."
- Verdict: UNSUPPORTED BY ASSIGNED SOURCES, because the opinion as excerpted does not discuss supply. The casebook editors raise that objection in the introduction ("what would be a store's position if the demand for its advertised wares exceeded its supply?", C&M 200). The opinion rests on Williston's "performance was promised in positive terms" test and on the "clear, definite, and explicit, and leaves nothing open for negotiation" standard (C&M 202).
- Replacement: "The casebook's usual objection to treating advertisements as offers, that a merchant might be bound beyond its stock (C&M 200), does not arise where quantity and taker are fixed, though the opinion does not discuss it."
- Related wording: Effective brief CTR-027: Reasoning, current "though the court did not rest its holding on that point." This implies the court mentioned the point. Replacement: "though the opinion does not discuss that concern, which the casebook raises at C&M 200."

### E6. Timeline 'acceptance' "now" field narrows the any-reasonable-manner rule to goods (MISSING CONDITION in corrected text)

- Surface: tools/r19/data/timelines.json, timeline "acceptance", field "now", as corrected on 2026-11-17. Current: "Goods offers generally permit any reasonable method unless the offer clearly indicates otherwise."
- Verdict: MISSING CONDITION. Prior-corrections.json shows that this text replaced a sentence citing both UCC § 2-206 and Restatement (Second) § 30. The corrected text is itself wrong in scope. Restatement § 30(2) states the same default for every offer: "Unless otherwise indicated by the language or the circumstances, an offer invites acceptance in any manner and by any medium reasonable in the circumstances." Read as written, the sentence implies that non-goods offers lack this default, so a student working White's services offer or Wucherpfennig's land offer could conclude that only the offer's own method may be used.
- Replacement sentence: "Unless the offer indicates otherwise, any reasonable manner and medium may be used (Restatement § 30(2); for goods, UCC § 2-206(1)(a))."
- Minor, same file: step "ucc206", note "Unless the offer clearly says otherwise". The Code reads "Unless otherwise unambiguously indicated by the language or circumstances", so the circumstances count as well as the words. Suggested wording: "Unless the language or circumstances unambiguously indicate otherwise".

### E7. K-14 sends "Required notice lacking" to "Acceptance not established", which misstates § 54(2) (MISSING CONDITION; no change in liability)

- Surface: Flowchart K-14 node f, edge "Required notice lacking" → node h, label "Acceptance not established by this act".
- Verdict: MISSING CONDITION. For acceptance by performance, § 54(1) makes the acceptance effective without notice. § 54(2) then provides that "the contractual duty of the offeror is discharged unless" the offeree uses reasonable diligence to notify, the offeror learns of the performance within a reasonable time, or the offer says notice is not required. UCC § 2-206(2) lets an offeror who is not notified treat the offer as having lapsed. In both cases the offeror ends up not liable, so the result does not change. The chart nonetheless names the wrong legal consequence, and slide 7 and the lecture note state it correctly ("the offeror's duty is discharged").
- Fix: append to node h's detail: "Where a performance acceptance occurred but notice required by § 54(2) was not given, the acceptance was effective but the offeror's duty is discharged; for goods, § 2-206(2) lets the offeror treat the offer as lapsed."
- Pinpoint: Restatement § 54; UCC § 2-206(2); C&M 229 (Bishop v. Eaton).

### E8. problem-awesome summary misdescribes the contract cap and leaves out the modification setting (UNSUPPORTED BY ASSIGNED SOURCES)

- Surface: problem-awesome map entry (node 00225), summary. Current: "An electronic exchange concerning leads moves from an expected daily quantity to much higher quantities and an asserted absence of a limit."
- Verdict: UNSUPPORTED BY ASSIGNED SOURCES. The source says the parties' contract set a price of $45 per lead "subject to a limit of 200 per day," and that CX Digital argued the instant messages "had ... modified" the contract to cover an unlimited number of leads (C&M 221). The 200 figure was a contractual cap, not an "expected daily quantity," and the question is whether an existing contract was modified. Slide 10 asks the same thing: "Should it be possible to modify a contract by IM?"
- Replacement: "An instant-message exchange is offered to show that a referral contract capped at 200 leads a day was modified to remove the cap; the question is which message was the offer and whether 'awesome!' accepted it."

### E9. International Filter: the estoppel remark is restated as less certain and about a different fact (MISSTATES the court's dictum; minor)

- Surface: international-filter Cold Call, episode-5, second paragraph. Current: "The court further observed that reliance on such a letter might prevent the company from later denying approval." Its plain-English sentence (at 4.1) reads: "If the buyer had acted on the letter, the company might be barred from later saying it never approved; but this was only a side comment."
- Verdict: MISSTATES the dictum in two ways. The court said that if Conroe Gin "had acted to change its position upon it as a notification of that fact, it must be plain that the filter company would have been estopped to deny its sufficiency" (C&M 220). The estoppel would have barred denying that the letter was sufficient notice, not denying approval, and the court stated it as plain, not as a possibility.
- Replacements. Narrative: "The court further observed that if Conroe Gin had changed its position in reliance on the letter as notice, International Filter would have been estopped to deny the letter's sufficiency." Plain: "If the buyer had changed its position by relying on the letter as notice, the company would have been barred from denying that the letter was enough notice; the court said this in passing."

### E10. Wucherpfennig: Restatement §§ 59 and 61 read as part of the court's reasoning (UNSUPPORTED BY ASSIGNED SOURCES as attribution; minor)

- Surface: wucherpfennig, Map entry: sections.Reasoning. Current: "Under Restatement §§ 59 and 61 a reply conditioning assent on different terms is a counteroffer".
- Verdict: UNSUPPORTED BY ASSIGNED SOURCES as attribution. The opinion relies on N.D. Cent. Code § 9-03-21 and North Dakota and Minnesota cases and does not cite the Restatement (C&M 215–216). The Cold Call's limits field correctly calls §§ 59 and 61 "comparative doctrine," but the map Reasoning reads as the court's own reasoning.
- Replacement: "The court did not cite the Restatement, but under §§ 59 and 61 a reply conditioning assent on different terms is a counteroffer".

### Checked and supported

The following were checked against the sources and are supported. Lefkowitz: rule line, takeaway, map Holding, timeline step note, K-11 c and f, and plain sentences 3.0–3.2. Wucherpfennig: rule line, Holding, takeaway (properly limited to "this land-sale offer"), timeline note and context, and plain sentences. International Filter: map summary and Holding, takeaway, Cold Call episode 4, and plain sentences 3.0–3.3. White: summary, Holding, brief Reasoning, takeaway, timeline note, K-14 c, and plain sentences. Also supported: acceptance, performance-preparation, silence (apart from G1), revocation, lapse, mailbox, formation-civil-rights, note-perry, K-01 g, and K-12 nodes b, d, e, f and i.

### Facts the Atlas states that are not in the assigned excerpt (not errors)

Lefkowitz: that Lefkowitz represented himself, the December 20, 1957 date, and the 251 Minn. 188 citation. Wucherpfennig: the July 11, 1984 date. International Filter: the December 10, 1925 date and "Section A." Wucherpfennig, map Reasoning: "and reliance was not treated as a formation argument." White: "at his own shop" (map Material Facts; the opinion says only "the purchase of lumber and beginning work thereon," C&M 223), the November 20, 1871 date, and that Justice Allen did not vote.

## 3. Teaching gaps

Each gap is assigned material that no surface teaches. Each has a proposed home and a draft.

G1. Silence: § 69's closed list, its asymmetry, and the dominion rule. The casebook states that "even as the master of the offer," the offeror cannot hold an offeree who fails to reject (C&M 235), and refers to § 69 for the exceptions. The Atlas has the general rule, Hobbs and American Bronze, but it never says that § 69(1) lists the exceptions as "the following cases only." It also omits § 69(1)(b), under which the offeror's own statement that silence will count binds the offeror when the silent offeree intends to accept, and § 69(2), the exercise of dominion. Home: silence map entry (node 00108), notes, as a new second paragraph. Draft: "Restatement § 69 lists the only cases in which silence accepts: the offeree takes offered services with a chance to reject and reason to know pay is expected; the offeror said silence may accept and the silent offeree intends to accept; or prior dealings make it reasonable to expect notice of non-acceptance. An offeree who acts inconsistently with the offeror's ownership of offered goods is bound unless the terms are manifestly unreasonable, but the unsolicited-merchandise statutes treat such goods as a gift (C&M 236)."

G2. Leonard's definiteness grounds, which the casebook uses to distinguish Lefkowitz. The court held that the Pepsi commercial was not an offer because it "specifically reserved the details of the offer to [a separate] writing, the Catalog" (the bracketed words did not extract), did not mention the steps a potential offeree would have to take to accept, and lacked "words of limitation such as 'first come, first served'" (C&M 203). The note-leonard entry describes only the joke ground, and K-11 node c says only "A fanciful display or ordinary broad promotion may communicate no corresponding commitment." Home: K-11 node c, detail, as a second sentence. Draft: "Leonard's commercial was not an offer because it reserved the details to a separate catalog, did not say how to accept, and had no limiting words such as 'first come, first served' (C&M 203)."

G3. Lefkowitz's first advertisement. Note 1 asks why Lefkowitz was denied recovery on the coat advertisement and "What aspect of an offer was missing from the store's first ad?", citing the Ayres–Gertner criticism (C&M 203). The opinion itself rests the coat ruling on value that was speculative and uncertain (C&M 201; the OCR of that sentence is partly lost), and the Atlas teaches only that damages ground. Home: Effective brief CTR-027, Reasoning, at the end of the damages paragraph. Draft: "The casebook asks what aspect of an offer the first advertisement lacked (C&M 203); the opinion itself rests the coat ruling only on the speculative value of coats 'worth to $100' (C&M 201)."

G4. White, Note 1: whether White's estimate was an offer. The editors ask whether the estimate White left could have been an offer ("Might 'I estimate ...' constitute an offer just as well as 'we quote you Mason fruit jars'?"). They also give two readings of "Upon an agreement" (C&M 224). The Atlas covers only the second reading. Home: Effective brief CTR-030, Reasoning, final paragraph. Draft: "The casebook also asks whether White's estimate was itself an offer, which would raise whether the September 29 note, with a two-week completion term the estimate lacked, accepted it or proposed new terms (C&M 224)."

G5. Revocation of a general offer, missing from the revocation chart's termination check. K-12 node b checks "receipt of direct or reliable indirect revocation" but does not mention public offers. For an advertisement such as Lefkowitz's, the revocation rule is different: notice given publicity equal to the offer ends the power of acceptance even for an offeree who missed it (C&M 241; § 46, where no better means of notification is reasonably available). The revocation map entry has this rule, but the chart a student would use does not. Home: K-12 node b, detail, as a sentence appended. Draft: "An offer to the public is revoked by notice given publicity equal to the offer, even against an offeree who missed it, when no better means of notice is reasonably available (§ 46)."

G6. The general rule on advertisements and its stated reasons. C&M 199–200 state the general rule that an advertisement is "an invitation by the seller to the buyer to make an offer to purchase." They pose the oversupply problem and describe the French alternative, which treats the advertisement as an offer conditioned, for each offeree, on no quicker offeree having already accepted. The advertisements entry says only that "many advertisements invite further orders," and E5 moves the oversupply point out of the Lefkowitz court's reasoning. Home: advertisements map entry (node 00102), notes, as a first sentence. Draft: "The general rule treats an advertisement as an invitation to make offers; the casebook asks how a seller bound by every acceptance could meet demand exceeding supply, and notes that French law treats such a proposal as an offer conditioned on no quicker offeree having accepted (C&M 199–200)."

G7. The civil-law contrast on revocability. C&M 241 contrasts the common-law rule that offers are freely revocable with civil-law systems, which make an offer irrevocable for a reasonable time unless the offeror says otherwise, and notes the disadvantage that the offeree can speculate during that period. No surface teaches this, and the § 63 comment a rationale on C&M 262 depends on it ("In many legal systems such a basis is provided by a general rule that an offer is irrevocable"). Home: revocation map entry (node 00112), notes, as an appended sentence. Draft: "Some civil-law countries make an offer irrevocable for a reasonable time unless the offeror says otherwise; the common law lets the offeror revoke until acceptance and protects the offeree instead through the dispatch rule (C&M 241, 262)."

Gap count: 7. Two further omissions are folded into corrections rather than counted as gaps: the casebook's question how International Filter fits § 56 (C&M 221, 227) is covered by E2, and the modification setting of the Awesome problem is covered by E8.

## 4. Slide comparison for the lecture notes

The lecture-notes record for Class 7 (tools/canons/data/lectures.json, "Class 7_Offer and Acceptance - Copy (2).pptx", 10 topics) was compared slide by slide. Every topic accurately records its slide. Slides 1–2 (title and the four key questions) are not recorded, which is acceptable. Slide 14 is an image, as the Carlill topic notes. The three proposals below keep the classroom wording and add a separate sentence where the slide's shorthand drops a legal condition.

| Slide | Lecture-note topic | Accuracy | Proposal |
|---|---|---|---|
| 3, 4 | What is an offer? | Accurate; § 24 is paraphrased ("justify another in understanding that assent is invited") without changing its meaning | None |
| 5 | Lefkowitz | Accurate | None |
| 6 | What constitutes acceptance | Accurate record of the slide | L-1 and L-2 below |
| 7, 13 | Notifying acceptance by performance: § 54 | Accurate, including "the offeror's duty is discharged" | None |
| 8 | Termination of the power of acceptance | Accurate record | L-3 below |
| 9 | Wucherpfennig | Accurate. The slide's quotation reads "Now if Donald wants"; the casebook reads "Now if Don wants" (C&M 215). The note quotes only the clause both share. | Optional L-4 below |
| 10 | Awesome Acceptance? | Accurate | None |
| 11 | International Filter | Accurate | None |
| 12 | White v. Corlies & Tift | Accurate; the heading follows the slide's spelling | None (see E4) |
| 14, 15 | Carlill | Accurate | None |

L-1. Topic "What constitutes acceptance", body, to follow "It is effective on dispatch by reasonable means (except for options), and notification of acceptance by promise is ordinarily required." Add: "Legal qualification: Under Restatement § 63, an acceptance takes effect on dispatch only if it is made in a manner and by a medium the offer invites, and only unless the offer provides otherwise; an acceptance by an uninvited medium ordinarily takes effect on receipt, and revocations and rejections take effect only on receipt (§§ 40, 42; C&M 262)."

L-2. Same topic, to follow "the offeror is “master of the offer” and may define what qualifies. Acceptance must be on the same terms and unconditional". Add: "Legal qualification: The offeror cannot make the offeree's silence an acceptance except as § 69 allows (C&M 235), and a response that accepts while merely requesting a change is still an acceptance unless it is made to depend on the change (§ 61); for goods, UCC § 2-207 changes the same-terms rule." This sentence can be split in two if the body's length requires.

L-3. Topic "Termination of the power of acceptance", body, to follow "or the offeror's death or supervening incapacity." Add: "Legal qualification: Restatement § 48 also ends the power when the offeree dies or loses capacity, and under § 37 an option survives rejection, counter-offer, revocation and the offeror's death or incapacity."

L-4 (optional). Topic "Wucherpfennig v. Dooley", after "It asks whether the first letter was an offer and whether the Feb. 17 letter was an acceptance." Add: "Legal qualification: The court did not decide the first question; the parties did not dispute that the January 4 letter was an offer (C&M 216)."

## 5. Required route test

For each case I entered the facts in every chart that cites the case and in the chart a student would naturally open. I recorded the path and the result displayed, then changed one legally decisive fact and ran the chart again.

### Lefkowitz

- K-11 (cites the case at c and f). Facts: the stole advertisement, "first come first served"; Lefkowitz arrives first and tenders $1. Path: a "Who retains the power to decide?" → edge "Advertisement" → c "Does the advertisement define the taker and performance?" → "Clear definite call for performance" → f "Identify the act that formed the agreement". The chart displays agreement formed by the first qualified customer's tender. Source: contract (C&M 202). The chart and source agree.
- Changed fact: the advertisement reserves its details to a separate catalog, does not say how to accept, and has no limiting words (Leonard's facts, C&M 203). Path: a → "Advertisement" → c → "Promotion invites further orders" → g "No agreement from this response alone". Source: not an offer. The chart and source agree, but c's detail does not name the features that decide the case, so the right branch depends on the student already knowing Leonard (G2).
- Changed fact: before Saturday, the store publishes an equally prominent notice withdrawing the stole offer. Source: the advertiser may modify the offer before acceptance (C&M 202), and an offer to the public is revoked by equal publicity (§ 46; C&M 241). K-11 has no revocation step. The natural chart, K-12, goes a → "Check deadline and ordinary termination" → b, whose detail speaks only of "receipt" of revocation. A student could wrongly require that Lefkowitz personally receive the revocation (G5).
- The ≈ sentences preserve the decisive distinction. Plain 3.2 keeps the line between changing an open offer before acceptance and adding a condition after formation, and plain 3.1 keeps "sufficiently definite."

### Wucherpfennig

- K-14 (cites the case at b). Path: a "What response did the offer invite?" → "Return promise" → b "Was a clear commitment communicated?" → "Qualified or undecided response" → h "Acceptance not established by this act". Source: no acceptance (C&M 216). The chart and source agree.
- K-12 (the natural chart for the March 9 revocation). Path: a → "Check deadline and ordinary termination" → b → "Ended before possible assent" → h. Source: the revocation preceded any acceptance (C&M 216). The chart and source agree.
- Changed fact: the February 17 letter says "Donald accepts your offer at $200 an acre, cash; please tell me the exact amount so I can prepare the papers." Source-supported result: acceptance, because the letter is unequivocal and the request does not condition it (C&M 215; § 61). On the chart, b's detail ties "price ... requests" to negotiation, so the likely path is → "Qualified or undecided response" → h, which displays no contract. The chart reaches the wrong result (E3).
- The ≈ sentences preserve the distinction. Plain 4.1 distinguishes "I accept only if..." from "I accept; could you also...", and the timeline context warns against treating every question as a rejection.

### International Filter

- K-14 (cites the case at f and g). Path: a → "Specified approval or notice" → f "Did the offer dispense with separate notice?" → "Notice sufficient, excused or unnecessary" → g "Agreement formed by the invited act". Source: contract on the officer's approval; notice was not required, and the February 14 letter would have sufficed if it were (C&M 219–220). The chart and source agree.
- Changed fact: the order says only "subject to approval by an officer at Chicago," without "becomes a contract when ... approved." The officer writes "O.K.," nothing is sent, and the buyer countermands. Source-supported result: § 56 requires notice of an acceptance by promise unless the offer manifests a contrary intention, and International Filter found that intention in the "becomes a contract when" language (C&M 219–221, 227). No contract. On the chart, the path goes to f, where the detail says only that "the Chicago officer’s O.K. was the prescribed act in International Filter," so a student likely chooses "Notice sufficient, excused or unnecessary" → g and gets a contract. The timeline note and the rule line point the same way. The chart reaches the wrong result (E2).
- The ≈ sentences mostly preserve the distinction. Plain 3.2 ties the result to the parties' agreed time and place of formation. Plain 4.1 understates the estoppel remark (E9).

### White v. Corlies & Tifft

- K-14 (cites the case at c). The casebook reads the September 29 note as an offer seeking a promise (C&M 227: "if an offer[or proposes a] 'bilateral' contract and invites acceptance by means of a promise ... the offeree must take steps to notify"). Path 1: a → "Return promise" → b → "Qualified or undecided response" → h. Path 2, the branch where the chart cites White: a → "Performance" → c "Did the offeree actually begin or complete the invited work?" → "Only preparation or incomplete required act" → h. Both paths display no acceptance. Source: no contract; the jury charge was erroneous and a new trial was ordered (C&M 224). The chart and source agree.
- K-13 (cites the case at d). Path: a → "Beginning invited performance" → d → "Only preparation" → e "Was there foreseeable and reasonable reliance?" The route then turns on § 87(2) reliance, which the assigned White materials do not raise (§ 87 and Drennan are Class 8). If a student finds reliance, the chart goes to g, "Withdrawal cannot defeat timely acceptance," which presupposes a timely acceptance that White never made. The source-supported Class 7 answer is that the countermand was effective. Because § 87(2) is outside this class's sources, I record this as an observation for the Class 8 reader, not as an error.
- Changed fact: White mails "I agree to finish in two weeks" before the countermand is sent. Source: the court's own example says that a mailed acceptance concludes the contract when the letter is mailed (C&M 223); § 63(a); and the countermand takes effect only on receipt (§ 42). Result: contract. K-14 path: a → "Return promise" → b → "Definite assent by invited method" → g. K-12 path: a → "Check dispatch and receipt" → c → "Only ordinary dispatch/receipt events" → g. The charts and source agree. If the offer had prescribed another medium, K-12 c has no branch (E1).
- Changed fact: White starts work on site at 57 Broadway, unmistakably on this job. Source: unresolved. Note 2 asks whether some activity could have accepted (C&M 224), and the Ever-Tite note asks for "the critical language of the offer" (C&M 227). K-14 c treats the question as depending on what the offer invited, which matches the source.
- The ≈ sentences preserve the distinction. Plain 3.0 keeps "need not always know" together with "sent through a proper channel," and plain 3.2 keeps the "begin at once" argument.

## 6. Items for other owners

- Rules & authorities links (tools/v25/authorities.json is owned by the builder team). The class's case pages list § 21 for all four cases and § 45 for Lefkowitz and White. Neither is the operative authority in the assigned pages. Missing links: § 26 (preliminary negotiations) and § 29 (to whom an offer is addressed) for Lefkowitz; § 61 for Wucherpfennig; §§ 56 and 60 for International Filter; § 50 for all four; and § 56 and § 63 for White, whose opinion states the dispatch rule.
- Chart ownership. E1 and G5 concern K-12; E2(f), E3 and E7 concern K-14; the K-13 observation under White belongs to the Class 8 reader.
- Surfaces generator. The OP-CT-05, 06, 08 and 09 surfaces files are 67-byte stubs for the same reason as this one (§ 0).
