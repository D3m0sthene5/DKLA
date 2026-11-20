# OP-CT-06 comparison: Contracts Class 6, assent and intention to be legally bound

Reader and challenger: one worker. Sources: `ct06-casebook.txt` (C&M 168–192 scan; assigned 169–191), `ct06-supp.txt` (Apple EULA, supp. pp. 2–8; New York General Obligations Law, supp. pp. 9–10), `ct06-supp-balfour-ocr.txt` (my OCR of supp. pp. 11–20, which have no text layer: Balfour, [1919] 2 K.B. 571–580), `/home/claude/work/src/sel.txt` (Restatement (Second) §§ 17–24 at Selections pp. 20–21; RLCC 2019 draft § 2 at Selections pp. 477–480), the 2024 RLCC text (`added-sources/text/Complete Restatement.txt` lines 865–963), the OP-CT-RLCC crosswalk, and `ct06-slides.txt` (16 slides; no speaker notes extracted).

Printed pages: printed = PDF − 45 throughout this extract (running heads 170, 174, 176, 178, 180, 182, 184, 186, 190, 192 confirm it). Balfour pinpoints are written "Supp. p. N (K.B. page)".

**Staging defect fixed in this folder.** The staged `ct06-surfaces.md` was empty ("Contracts class 06: None") because the staging script passed "06" and the corpus keys classes as "6". I re-ran `tools/content-audit/session_surfaces.py 6` (read-only) and replaced `ct06-surfaces.md` with its output (131 KB). Packets OP-CT-05, 07, 08 and 09 have the same empty surfaces file and need the same re-run with "5", "7", "8", "9". All field labels below are the labels in the regenerated file.

**Supplement range.** This packet's assignment is supp. pp. 2–20. The syllabus line reads only "169-191; SUPP; SEL" (`syllabus.txt` line 113), and the Atlas records supplement pp. 11–20 for Class 6 (`contracts-class-06` sources and `textbookImport.supplementalRanges`; corpus `supplementalRanges["6"] = [[11, 20]]`). The Apple EULA (pp. 2–8) is tagged to Class 1 only (`gap-apple`, `assignments: [1]`). The coordinator should confirm which range is right; the teaching gap G9 assumes pp. 2–20.

**Numbering record (not an error).** The Selections print RLCC § 2 from the 2019 Tentative Draft; slide 16 and the Atlas's `gap-rlcc` hub use the 2024 Official Text. Section 2 has the same number in both. Slide 16's "Cmt 3" is the 2024 Comment 3; its quoted sentence is not in the Selections' 2019 excerpt (already recorded by OP-CT-RLCC on the lecture note).

---

## (a) Coverage

| Assigned material | Atlas surfaces that teach it | Assessment |
|---|---|---|
| Three norms: assent, consent, intent (C&M 169–171); § 3, § 17, § 22 | `assent-consent-intent` notes | Covered accurately. |
| Hand and Frank on objective and subjective theory (C&M 171–173) | `notes-objective-debate` | Covered; Frank slightly narrowed (finding E15). Hand's "twenty bishops" and Navair's line (C&M 176) are not quoted (gap G11). |
| Lucy v. Zehmer (C&M 173–176) | Map entry, brief CTR-025, takeaway, Cold Call, plain sentences, timeline `acceptance` step 4, chronology step 131, K-09 nodes b, c, f | Thorough on facts and holding. The knowledge and reason-to-know variations are handled unevenly (E1, E2, E3, G1). |
| Lucy notes: Keller, $50 price, bluff vs jest, Leonard, proving intent (C&M 176–178) | `note-keller`, `note-leonard`, `notes-objective-debate`, K-11 node c | Keller and proof covered. Leonard's result is not stated and one phrase calls it an offer (E8). Bluff vs jest absent (G2). |
| Specht v. Netscape (C&M 178–182) and notes (182–183) | Map entry, brief CTR-026, takeaway, Cold Call, plain sentences, timeline `standard-terms` step 4, chronology step 509, K-10 nodes a, b, h, `note-hancock`, `arbitration-formation` | Thorough. Jurisdiction missing from rule line and timeline (E9); K-10 node b misplaces the terms (E10) and omits actual knowledge (E11); no plain sentence renders the notice holding (G12). |
| "Intent to Be Bound" and § 21's two qualifications (C&M 183) | `assent-consent-intent`, rules entry `restatement-21`, lecture note topic 2 | First clause and family branch covered. The commercial branch (express or contextual disclaimer) has no chart route (E4, G3). Lecture note drops a condition of comment c (E7). |
| Cohen v. Cowles Media, 1990 contract ruling (C&M 183–185) | `cohen-cowles`, `notes-cohen`, `social-intent`, K-07 node e, lecture note topic 3 | Covered for promissory estoppel; K-09 has no route for the 1990 contract ruling (E4, G4). |
| Intent in social contexts; Patterson; dinner, marriage promise, Mitzel, Balfour note, Boland, ethics (C&M 186–187) | `social-intent`, `problem-social`, `note-mitzel`, `note-boland` | Covered except Patterson's freedom-to-contract/freedom-from-contract passage (G11) and Ferraro and the abolished breach-of-promise action (G13). |
| Intention not to be legally bound; Consarc, Winston, letters of intent, contracts to negotiate, Tribune I and II, deal breakers, Pennzoil (C&M 187–191) | `preliminary-agreements`, `note-consarc-winston`, `note-keystone`, `note-tribune-types`, `note-texaco`, `notes-context` | Covered (and reread in Class 10). Not tested further here. |
| Section 2 Offers opening, § 24, Corbin (C&M 191) | `offer` (Class 7) | Covered; Class 7 territory. |
| Balfour v. Balfour (Supp. pp. 11–20) | Map entry, brief CT-SUP-0011, takeaway, Cold Call, plain sentences, timelines `consideration` step 2 and `acceptance` step 1, chronology step 75, K-09 nodes d, e, `gap-balfour` | Thorough. Warrington's intention finding is dropped in the map notes (E5); takeaway overstated (E6); one plain sentence misdescribes the decree (E5b); "accepted" overstates two judges' reservations (E14). |
| Restatement (Second) §§ 18, 19, 21, 24 (SEL) | Rules entry `restatement-21`; § 19(2) paraphrased in Specht brief and plain sentence 4.1 | § 21 covered; § 19(2)–(3) and § 20 are not tied to the Lucy variations (G1). |
| RLCC § 2(a), (c) (SEL 2019; 2024 used by slides) | `gap-rlcc` hub (`tools/r19/data/rlcc.json` /hub/notes), lecture note topic 9 | Hub states both editions. Lecture note lacks the burden qualification (G7) and § 2(c) (G8); no surface applies § 2 to Specht (G6). |
| Apple EULA (Supp. pp. 2–8) | `gap-apple` (Class 1) | Accurate as a Class 1 document; nothing connects it to Class 6 assent questions (G9). |
| New York General Obligations Law (Supp. pp. 9–10) | Not checked | Within pp. 2–20 but not named in this packet's prompt and belongs to the consideration unit. |

---

## (b) Errors in existing text

Ordered by effect on an exam answer.

### E1. Lucy Cold Call plain-English sentence at 4.0 — CHANGES RESULT

- Surface and field: **Cold Call plain-English sentences** (lucy), entry `"at": "4.0"`, field `plain`.
- Current text: "A secret meaning, like 'I was only joking', does not count unless the other person knew about it."
- Verdict: CHANGES RESULT. The source sentence it renders says a private meaning "does not displace the reasonable meaning conveyed to the other party unless that party knows of the special meaning." The plain version drops "the reasonable meaning conveyed", so actual knowledge becomes the only way a joke can matter.
- Counterexample: slide 8 asks "What if Lucy did not know, but should have known, that Zehmer did not intend to sell the farm?" Note 2 asks what happens if the price had been $50. A student using the plain sentence answers "Lucy did not know, so the joke does not count, so there is a contract." The source answer is no contract: the court bars the jest defense only "when his conduct and words would warrant a reasonable person in believing that he intended a real agreement" (C&M 176), and Keller (a $300 check for a $15 watch as "frolic and banter") and Leonard ("no objective person could reasonably have concluded" the ad was an offer) found no contract (C&M 177). Restatement (Second) § 20(2)(b) reaches the same result where the other party has reason to know the first party's meaning.
- Pinpoint: C&M 175–176 (Restatement (First) § 71 quotation; "warrant a reasonable person"); C&M 177; Selections p. 20–21 (§ 20(2)(b)).
- Replacement: "A secret meaning, like 'I was only joking,' does not override what the words and actions would reasonably mean to the other person, unless that person knew of the secret meaning."

### E2. Lucy takeaway — MISSING CONDITION

- Surface and field: **Takeaway (tools/r19/data/takeaways.json)**, key `lucy`.
- Current text: "If you act like you are making a serious deal, you are, even if you thought it was a joke."
- Verdict: MISSING CONDITION. The rule the court quoted keeps an exception when the other party knows of the private meaning.
- Counterexample: Note 4 supposes "that Lucy had actually known that the Zehmers were joking even though this was not objectively apparent" (C&M 178); slide 8 asks the same. Under the quoted rule, "his undisclosed intention is immaterial except when an unreasonable meaning which he attaches to his manifestations is known to the other party" (C&M 176), so there is no contract. The takeaway says there is.
- Pinpoint: C&M 176, 178.
- Replacement (50 words, two sentences): "What counts is how your words and actions would reasonably look to the other party, not what you secretly meant. If you act like you are making a serious deal, you are bound even if you meant it as a joke, unless the other party knew it was a joke."

### E3. Flowchart K-09 has no route for a jest that a reasonable person would recognize — CHANGES RESULT

- Surface and field: **Flowchart K-09 node b** (edges) and **node c** (edges); file `tools/flowcharts/data/contracts.json`, chart K-09.
- Current text: node b edges "Serious appearance reasonably understood" → f and "Both parties understood jest" → e; node c edges "Shared jest" → e and "Serious appearance despite private intent" → f.
- Verdict: CHANGES RESULT.
- Facts entered (Leonard, C&M 177–178): a commercial shows a Harrier jet for 7,000,000 Pepsi Points; Leonard submits 15 points and $700,000 on the order form and insists the offer was serious; Pepsico says the jet was a joke.
- Path: a ("What would the parties' words and conduct convey?") → "Commercial undertaking" → b. Neither edge fits: the appearance was not reasonably serious, and Leonard did not understand it as a jest. A student who instead takes a → "Possible shared joke" → c finds "Shared jest" false (Leonard was serious) and is left with "Serious appearance despite private intent" → f, "Proceed to enforceability and terms".
- Displayed result: agreement formed; go on to consideration and defenses.
- Source-supported result: no contract. "No objective person could reasonably have concluded that the commercial actually offered consumers a Harrier Jet" (C&M 177); Lucy's own test asks whether the words "would warrant a reasonable person in believing that he intended a real agreement" (C&M 176). The same failure occurs for slide 8's "should have known" variation and Note 2's $50 price.
- Replacement: add to node b and node c a third edge, label "Reasonable person would have recognized jest", to e; add `note-leonard` to node b's sources; change node e's detail from "A shared joke or a purely domestic understanding does not supply the contract alleged. Identify which premise failed because the two cases address distinct problems." to "A shared joke, a jest that a reasonable person in the claimant's position would have recognized (Leonard), or a purely domestic understanding does not supply the contract alleged. Identify which premise failed; these situations raise distinct problems."

### E4. Flowchart K-09 has no route for a serious promise made without intent to be legally bound in a professional or commercial setting — CHANGES RESULT

- Surface and field: **Flowchart K-09 node a** (edges) and **node d** (label, detail, sources).
- Current text: node a edges "Commercial undertaking" → b, "Possible shared joke" → c, "Domestic or social undertaking" → d; node d detail "Balfour treated the temporary allowance between amicable spouses as domestic. An agreement with evidence of an exchange and an intention to bind, including in a personal relationship, requires its own analysis."
- Verdict: CHANGES RESULT.
- Facts entered (Cohen, C&M 183–185): reporters promise a political source anonymity in exchange for documents; editors break the promise; the source sues in contract.
- Path: a → "Commercial undertaking" (documents exchanged for a promise; the court said "we seemingly have all three" elements, C&M 184) → b "Was the alleged joke apparent?" → "Serious appearance reasonably understood" → f.
- Displayed result: agreement; proceed to enforceability.
- Source-supported result: the Minnesota Supreme Court held "a contract cause of action is inappropriate for these particular circumstances" because the parties did not intend a legally binding contract (C&M 185). Restatement (Second) § 21's second clause and the editors' second qualification (an agreement that would otherwise be treated as enforceable may be denied enforcement because of the parties' manifested intent, C&M 183; the OCR of that sentence is too degraded to quote) reach the same result for an express disclaimer, such as the letter-of-intent sentence "This letter is not intended to create nor should it be construed as creating any legal obligation" (C&M 189). None of K-09's nodes asks this question.
- Replacement: change the a → d edge label to "Domestic, social or professional undertaking, or a stated disclaimer of legal effect"; change node d's label to "Did the parties manifest an intention to be legally bound?"; append to node d's detail: "Restatement (Second) § 21: a manifested intention that a promise shall not affect legal relations may prevent formation even in a business setting. Cohen (Minn. 1990) found no contract in a reporter's promise to a source." Add `cohen-cowles`, `notes-cohen` and `restatement-21` to node d's sources.

### E5. Balfour map entry notes understate Warrington L.J.'s reasoning — OVERSTATED

- Surface and field: **Map entry: notes** (balfour).
- Current text: "Warrington L.J. rested on the absence of any bargain by the wife"
- Verdict: OVERSTATED (it overstates the difference between the judges). Warrington also found that the spouses lacked the intention to create legal relations.
- Counterexample: asked which judges in Balfour relied on the absence of an intention to create legal relations, a student using this note answers "Atkin only". The source shows two of three: Warrington said "These two people never intended to make a bargain which could be enforced in law" (Supp. p. 15 (575)). The casebook states the court's ground in those intention terms (C&M 187).
- Pinpoint: Supp. pp. 14–15 (574–575); C&M 187.
- Replacement: "Warrington L.J. found no bargain by the wife and said the spouses never intended a bargain enforceable in law"
- The same omission appears in **Effective brief CT-SUP-0011: Reasoning** (Warrington paragraph) and Cold Call episode-3 paragraph 2 ("Warrington regarded the husband's undertaking as an expression of intention and obligation of honour without a corresponding bargain by the wife."). Suggested insertion in both: "He said the two never intended to make a bargain enforceable in law."

### E5b. Balfour plain-English sentence at 1.0 misdescribes the decree nisi — UNSUPPORTED BY ASSIGNED SOURCES

- Surface and field: **Cold Call plain-English sentences** (balfour), entry `"at": "1.0"`, field `plain`.
- Current text: "She won a \"decree nisi\" (a provisional divorce decree that becomes final later unless cause is shown) on July 30"
- Verdict: UNSUPPORTED BY ASSIGNED SOURCES; the source contradicts it. The decree was "a decree nisi for restitution of conjugal rights" (headnote, Supp. p. 11 (571)), not a divorce decree.
- Counterexample: the plain sentence tells a reader that the spouses were divorcing. Balfour's decisive facts are that the spouses were in amity when the promise was made and that no separation agreement existed (Supp. pp. 12, 16 (572, 576)). A reader who believes a divorce was under way can misread the later breakdown as evidence of a separation bargain.
- Pinpoint: Supp. pp. 11–12 (571–572).
- Replacement: "She won a \"decree nisi\" (a provisional court order that becomes final later unless cause is shown against it) in her suit for \"restitution of conjugal rights\" on July 30, and an alimony (spousal support) order on December 16. Those family-court steps were separate from the contract lawsuit here." (If a definition of restitution of conjugal rights is wanted, it comes from general legal knowledge, not the assigned excerpt: a proceeding asking the court to order the other spouse to resume married life.)

### E6. Balfour takeaway — OVERSTATED

- Surface and field: **Takeaway (tools/r19/data/takeaways.json)**, key `balfour`.
- Current text: "Everyday arrangements between a husband and wife living together, like a promised allowance, are not contracts."
- Verdict: OVERSTATED. Atkin said such agreements, "or many of them, do not result in contracts" (Supp. p. 18 (578)); Warrington did "not for a moment say" that a spousal contract is impossible (Supp. p. 14 (574)); Duke did not dissent from the proposition that these spouses "might have made an agreement which would have given the plaintiff a cause of action" and said a separation agreement "does involve mutual considerations" (Supp. p. 16 (576)). Restatement (Second) § 21 comment c requires "some unusual manifestation of intention", not impossibility.
- Counterexample: spouses who sign an allowance agreement as part of an agreed separation, or who state clearly that the arrangement is to be legally binding. The takeaway's first sentence says no contract; the sources leave a contract possible.
- Pinpoint: Supp. pp. 14, 16, 18–20 (574, 576, 578–580); Selections p. 21 (§ 21 cmt. c); C&M 187.
- Replacement (55 words, two sentences): "Everyday arrangements between spouses living in harmony, like a promised allowance, are ordinarily not contracts, because courts assume the couple did not intend legal consequences. The spouse suing must prove that both intended a legally binding deal, as may be shown by a separation agreement or an unusually clear statement of intent to be bound."

### E7. Lecture note on slide 5 drops the condition in § 21 comment c — MISSING CONDITION

- Surface and field: **Lecture notes record**, topic "Restatement § 21: intention to be legally bound", field `body` (`tools/canons/data/lectures.json` /27/topics/1/body).
- Current text: "Comment c says that for social engagements and agreements within a family the normal understanding is that no legal obligation arises."
- Verdict: MISSING CONDITION. Slide 5 and comment c continue: "and some unusual manifestation of intention is necessary to create a contract." The note records the slide inaccurately, so this is a correction to the note, not a "Legal qualification" addition.
- Counterexample: a family member promises a relative an allowance in a signed writing stating that it is legally binding. The note implies no obligation arises; comment c says an unusual manifestation of intention can create a contract.
- Pinpoint: slide 5; Selections p. 21 (§ 21 cmt. c).
- Replacement: "Comment c says that for social engagements and agreements within a family the normal understanding is that no legal obligation arises, and some unusual manifestation of intention is necessary to create a contract."

### E8. `note-leonard` calls the ad an offer and relies on facts outside the excerpt — MISSTATES HOLDING

- Surface and field: node `note-leonard`, field `notes` (`src/data/seedData/nodes-45978ecb29/00158-note-leonard-0f926c9cec.json`).
- Current text: "The Harrier offer was treated as a joke in its presentation. The notes compare its context, extreme disparity, catalog, and later changes to the advertisement with the farm-sale dispute."
- Verdict: MISSTATES HOLDING for "The Harrier offer" (the court held that no objective person could conclude the commercial "actually offered consumers a Harrier Jet"); UNSUPPORTED BY ASSIGNED SOURCES for "catalog, and later changes to the advertisement", which are not in the C&M note. The entry also never states the result ("Held: For Pepsico").
- Counterexample: a student cites `note-leonard` for the proposition that Pepsico made an offer that a jest defense then defeated. The court found no offer at all.
- Pinpoint: C&M 177–178.
- Replacement: "The court held for Pepsico: no objective person could reasonably have concluded that the commercial actually offered a Harrier Jet, given its \"zany humor\" and the jet's military function. The notes compare that context and the extreme price disparity (a jet costing about $23 million for $700,000) with the farm-sale dispute."

### E9. Specht rule line and timeline note omit the governing law — MISSING CONDITION

- Surface and field: **Effective brief CTR-026: rule**; **Timeline 'standard-terms' step 4**, field `note`.
- Current text (rule): "An online user's click manifests assent to contract terms only when the interface reasonably alerts the user that terms exist and that the click signifies agreement to them."
- Current text (timeline): "Online terms bind only if the screen reasonably shows they exist and that clicking means assent; terms hidden below a download button did not."
- Verdict: MISSING CONDITION (jurisdiction). The court applied California formation law, unchallenged on appeal (C&M 180). The same timeline labels other steps "(New York)" and "(California law)", and the acceptance timeline labels Lucy "(Virginia)".
- Counterexample: a Massachusetts registration screen. The Atlas's own Kauders brief (C&M 304–314) records that the First Circuit in Cullinane applied Massachusetts law to Uber's screen; a student treating Specht's rule as jurisdiction-free may skip the choice-of-law step.
- Pinpoint: C&M 180, 182.
- Replacement (rule, 37 words): "Under California law, as the Second Circuit applied it, an online user's click manifests assent to contract terms only when the interface gives reasonably conspicuous notice that terms exist and the click unambiguously signifies agreement to them."
- Replacement (timeline): append " (Second Circuit, California law)" after "did not".

### E10. K-10 node b says the terms sat below the button — OVERSTATED

- Surface and field: **Flowchart K-10 node b**, field `detail`.
- Current text: "Specht’s license terms sat below the download button and the user had no clear reason to scroll."
- Verdict: OVERSTATED. Only a one-sentence reference inviting review sat below the button; the terms were on a separate "License & Support Agreements" page reached by a hyperlink (C&M 180).
- Counterexample: a screen that puts the full terms in a scroll box directly beneath the button. A student who believes Specht's terms were in that position treats that screen as identical to Specht. The court's analysis turned on "a reference to the existence of license terms on a submerged screen" (C&M 182).
- Pinpoint: C&M 180, 182.
- Replacement: "Specht’s only reference to the license sat below the download button, visible only after scrolling, and the terms themselves were on a linked page; the user had no clear reason to scroll."

### E11. K-10 node b asks only about the interface, not about what the user knew — MISSING CONDITION

- Surface and field: **Flowchart K-10 node b**, label and edges ("Reasonable notice and assent" → g; "Hidden display or ambiguous act" → h).
- Verdict: MISSING CONDITION (route).
- Facts entered: same page as Specht, but this user scrolled, read "Please review and agree to the terms ... before downloading and using the software", and then clicked "Download".
- Path: a → "Term shown during enrollment" → b → "Hidden display or ambiguous act" → h, "Disputed term did not enter on this route".
- Source position: not decided. The court relied on plaintiffs' unrefuted testimony that they "were in fact unaware" of the terms (C&M 182); the California rule it quoted protects an offeree from inconspicuous provisions "of which he is unaware" (C&M 180); Restatement (Second) § 19(2) asks whether the actor "knows or has reason to know" that the other party may infer assent. The chart closes a question the source leaves open.
- Replacement: append to node b's detail: "Also ask what this user actually saw. Specht's users testified without contradiction that they were unaware of the terms, and the California rule the court quoted protects an offeree only from inconspicuous terms \"of which he is unaware.\""

### E12. Lucy map entry Material Facts: ambiguous concession — SUPPORTED, wording ambiguous

- Surface and field: **Map entry: sections.Material Facts** (lucy).
- Current text: "and counsel conceded that defense at argument"
- Verdict: SUPPORTED in substance, but "conceded that defense" can be read as admitting that the intoxication defense was valid. The record is the reverse: defendants' counsel conceded that Zehmer "was not too drunk to make a valid contract" (C&M 174).
- Replacement: "and defense counsel conceded at argument that Zehmer was not too drunk to make a valid contract"

### E13. Lucy Cold Call episode-3 answers its own cue with the wrong refusal date — MISSING CONDITION (facts)

- Surface and field: **Cold Call** (lucy), episode-3, cue "How did Lucy act on the writing, and when did Zehmer refuse to sell?", paragraph 2.
- Current text: "Zehmer replied in a letter mailed January 13 that he had never agreed or intended to sell. That refusal created the need for legal enforcement."
- Verdict: MISSING CONDITION. By Zehmer's own account he told Lucy the matter was a joke immediately after Lucy offered the $5 (C&M 174), and Lucy testified that Zehmer told him "for the first time" on the following night that he would not sell (C&M 175). The January 13 letter is not in the assigned excerpt.
- Replacement for the first sentence: "Lucy testified that Zehmer told him, the night after he hired the lawyer, that he would not sell; Zehmer later wrote, in a letter mailed January 13, that he had never agreed or intended to sell."

### E14. Balfour: two judges' reservations described as acceptance — OVERSTATED

- Surface and field: **Effective brief CT-SUP-0011: Holding**; Cold Call (balfour) episode-3 paragraph 1.
- Current text: "Warrington and Duke both accepted that they can." and "Warrington L.J. accepted that spouses could make a contract of this kind."
- Verdict: OVERSTATED. Warrington: "It may be, and I do not for a moment say that it is not, possible" (Supp. p. 14 (574)); Duke: "I do not dissent, as at present advised" (Supp. p. 16 (576)). Neither affirmatively accepted the proposition.
- Replacements: "Warrington and Duke both declined to rule out that they can." and "Warrington L.J. did not rule out that spouses could make a contract of this kind."

### E15. `notes-objective-debate`: Frank's objection narrowed to shared intent — OVERSTATED (minor)

- Surface and field: node `notes-objective-debate`, field `notes`.
- Current text: "Frank’s response resists excluding actual shared intent."
- Verdict: OVERSTATED. Frank objected to excluding "the actual intention of the parties or either of them" (C&M 172).
- Replacement: "Frank’s response resists excluding the parties’ actual intention, whether shared or held by one party."

### Not in the assigned excerpt (recorded, not errors)

Lucy Cold Call episode 1 (the earlier $20,000 offer; Zehmer's $11,000 purchase price), the brief's January 2 letter and December 31 title report, "liquor talking"; Specht Cold Call episode 2's screenshot details and episodes 3 and 7 (Fagan's ZDNet route, Specht's commissions, direct-benefit estoppel, the Communicator clause's scope), and episode 6 (FAA § 4 hearing). These come from the full opinions. The Specht map entry says so ("The assigned excerpt focuses on assent to SmartDownload’s license").

### Checked and supported (no change)

Lucy map summary, Issue, Holding and Reasoning (the knowledge exception at "a party who knows the other’s unusual meaning cannot simply insist on the ordinary meaning"); Lucy brief rule line (its first clause carries the reasonable-meaning test); acceptance timeline Lucy step; K-09 nodes b, c (Keller) and f for the actual Lucy facts. Specht map entry in all sections; Specht takeaway; K-10 node h. Balfour brief rule, Parties, Procedural History, Material Facts and the Duke and Atkin reasoning; timeline steps; `social-intent`; `assent-consent-intent`; `objective-assent`; `note-keller`; `notes-cohen`. Prior corrections to the `consideration`, `acceptance` and `standard-terms` timelines were read and are not re-reported.

---

## (c) Teaching gaps

**G1. Answers to slide 8's variations, tied to §§ 19–20.** No surface states what follows if Lucy knew, or should have known, of the joke, or why Lucy's honest belief alone would not suffice (Note 1, C&M 176). Home: Lucy map entry, `sections.Reasoning`, appended as a final paragraph. Draft: "The court's test settles the classroom variations. If Lucy had known of the joke, the quoted rule's exception applies and there is no contract. If he did not know but a reasonable person in his position would have recognized a joke, Zehmer's words would not 'warrant a reasonable person in believing that he intended a real agreement', so there is again no contract; Restatement (Second) § 20(2)(b) reaches the same result. Lucy's honest belief mattered only because it was also warranted (C&M 175–176)."

**G2. Jest compared with bluff or dare.** Note 2 asks whether a bluff or dare differs from a jest and what follows if Lucy, knowing it was a bluff, had "called their bluff" (C&M 177). No surface mentions it. Home: `note-keller`, field `notes`, new final sentence. Draft: "The notes also ask whether a bluff or dare differs from a jest: the Zehmers said the writing was meant to make Lucy admit he lacked $50,000, and the casebook asks, without answering, what result follows if Lucy had known this and called the bluff by raising the money."

**G3. Section 21's second clause in business settings.** The editors' two qualifications (C&M 183) and Consarc's rule that "absent an expressed intent that no contract shall exist" informal assent binds (C&M 188) have no route in K-09 and no sentence in `assent-consent-intent`. Home: K-09 node d (see E4) and `assent-consent-intent` notes. Draft for the notes: "The editors draw two qualifications from § 21: social and family agreements need more to show intended legal effect, and a business agreement that would otherwise bind can be denied effect by a manifested intent not to be bound, as in a letter of intent that disclaims any legal obligation (C&M 183, 189)."

**G4. Slide 6's contract and promissory-estoppel contrast.** K-09's end node e does not say that a promise outside contract may still be enforceable. Home: K-09 node e detail, appended. Draft: "A promise that fails as a contract because legal effect was not intended may still be enforced through promissory estoppel; Minnesota did so in Cohen after the 1990 contract ruling (C&M 183; see K-07)."

**G5. Balfour's separation-agreement distinction in the chart.** Duke L.J. distinguished an agreement made on separation, which "does involve mutual considerations" (Supp. p. 16 (576)), and counsel's authorities concerned spouses living apart (Supp. p. 13 (573)). K-09 node d does not name the fact that decides Balfour. Home: K-09 node d detail, appended. Draft: "The decisive facts were amity and expected reunion when the promise was made; Duke L.J. distinguished an agreement made on separation, which can supply consideration."

**G6. RLCC § 2 applied to Specht.** No surface connects Specht with § 2(a) and (c), although Note 1 frames Specht as a term-inclusion question within an agreed deal (C&M 182–183). Home: Specht map entry `learning.topics.standard-forms`, or K-10 node h detail (add `gap-rlcc` to its sources). Draft: "Restatement of Consumer Contracts § 2 states the same split: a standard term is adopted only after reasonable notice of it and of the intent to include it, plus a reasonable opportunity to review, and under § 2(c) a contract can exist without unadopted terms. The Selections' 2019 draft adds that a consumer who reasonably thinks an act creates no legal obligations does not manifest assent at all (Comment 3)."

**G7. Burden of proof under the 2024 § 2(a).** Home: lecture note topic "Restatement of Consumer Contracts § 2", appended after the slide record. Draft: "Legal qualification: The 2024 Official Text adds that the business must demonstrate these facts ('if the business demonstrates that the consumer manifested assent'); the 2019 draft in the Selections, which the slide's black letter matches, does not say who bears the burden."

**G8. Subsection (c) is assigned but absent from the Class 6 record.** Slide 16 quotes only (a). Home: same lecture note topic. Draft: "Subsection (c), also assigned, provides that if the consumer assents to the transaction a contract exists (2019 draft) or is not rendered unenforceable (2024 text) even though some standard terms were not adopted; the contract then consists of the adopted terms, any unadopted standard terms the consumer elects, and terms supplied by law (the 2024 text adds terms both parties agreed to and terms incorporated by law)."

**G9. The Apple EULA's Class 6 lessons.** `gap-apple` is tagged Class 1 and says nothing about how the document bears on assent. Home: `gap-apple` notes (new paragraph; add `class-06` to tags if the coordinator confirms the range). Draft: "Read with Class 6, the agreement shows a drafter reciting assent rather than securing it: it says the license 'is subject to your prior acceptance' and that 'by using this software in connection with an iTunes Store account, you agree to the latest iTunes Store Terms and Conditions.' Whether a user adopted those terms depends on how they were presented (Specht; RLCC § 2(a)), not on the recitals. Its California choice-of-law clause is the law Specht applied, and its consent to data collection mirrors the subject of the Specht plaintiffs' claims."

**G10. Leonard's result and its question about price.** Besides E8, no surface answers "Is a price too good to be true always an indication that no offer has been made?" (C&M 178). Home: `note-leonard` notes. Draft: "The casebook asks whether a price too good to be true always means no offer was made; Leonard treats the disparity as one piece of evidence of how a reasonable viewer would read the commercial."

**G11. Formulations of the objective theory not quoted anywhere.** Hand's "twenty bishops" (C&M 171–172), Navair's "contracts are not formed by comparing mental states; they are formed by what the parties communicate" (C&M 176), and Patterson's "freedom to contract" and "freedom from contract" (C&M 186) appear in no node. Home: `notes-objective-debate` notes for the first two; `assent-consent-intent` notes for Patterson. Draft (Patterson): "Professor Patterson's test for a good enforceability rule is that it lets non-lawyers who clarify what they want make contracts ('freedom to contract') without hooking 'the unwary signer or the casual promisor' ('freedom from contract') (C&M 186)."

**G12. No plain-English sentence for Specht's notice holding.** Specht's twelve plain sentences cover arbitration procedure, standard of review and estoppel; none renders the scroll-bar holding on which the case turns. Home: Cold Call plain-English sentences (specht), new entry at "4.2" for "A scroll bar showed that more page content existed, not that important contractual notice lay below the apparent endpoint of the transaction." Draft plain: "The scroll bar showed only that the page went on. It did not tell users that notice of license terms lay below the download button, so a reasonably careful user had no reason to look there."

**G13. The broken promise to marry.** Note 1's Ferraro question (wedding dress and hall rental, C&M 186) and Cohen's citation of Minnesota's statute abolishing the action for breach of promise to marry (C&M 185) are not in `problem-social`. Home: `problem-social` notes. Draft: "The notes extend the question to a broken promise to marry after the plaintiff paid for a wedding dress and a reception hall (Ferraro v. Singh); Cohen notes that Minnesota abolished the action for breach of promise to marry by statute."

---

## (d) Challenger tests of the highest-risk statements

Each statement was tested against a fact pattern from the cases, notes or slides.

| # | Statement (surface) | Test | Result |
|---|---|---|---|
| 1 | "A secret meaning ... does not count unless the other person knew about it." (Lucy plain 4.0) | Slide 8 "should have known"; Note 2's $50 price; Leonard | Fails: yields a contract where the source yields none (E1). |
| 2 | "a secret intent to jest is immaterial unless the other party knows of it" (Lucy brief rule; chronology step 131) | Same | Passes: the rule's first clause ("reasonable meaning of a party's communicated words and acts") carries the reasonable-person test, so a joke a reasonable person would see is not "secret". |
| 3 | "If you act like you are making a serious deal, you are, even if you thought it was a joke." (Lucy takeaway) | Note 4: Lucy actually knew | Fails (E2). |
| 4 | "Nor would an obviously absurd or mutually understood joke necessarily be enforceable." (Lucy map Reasoning) | Keller, Leonard | Passes as an inference from the opinion's reasonable-person language. The opinion itself does not say it; the casebook notes supply the examples. Optional wording: "The casebook notes (Keller, Leonard) show that an obviously absurd or mutually understood joke is not enforceable." |
| 5 | K-09 b and c edges | Leonard facts | Fails (E3). |
| 6 | K-09 a → b for a commercial promise | Cohen facts; letter of intent disclaiming obligation | Fails (E4). |
| 7 | "Everyday arrangements between a husband and wife living together ... are not contracts." (Balfour takeaway) | Separation agreement (Duke, Supp. p. 16 (576)) | Fails (E6). |
| 8 | "Warrington L.J. rested on the absence of any bargain by the wife" (Balfour map notes) | Warrington's text, Supp. p. 15 (575) | Fails (E5). |
| 9 | "Atkin L.J. reasoned that agreements between spouses living in amity are presumed not to be intended to create legal relations" (Balfour map notes) | Atkin, Supp. pp. 18–20 (578–580) | Passes in substance. "Presumed" is the casebook's and the Restatement's framing (C&M 183; § 21 cmt. c); Atkin's own words are "many of them, do not result in contracts" and "the onus was upon the plaintiff". |
| 10 | "An online user's click manifests assent ... only when the interface reasonably alerts the user ..." (Specht rule) | Communicator clickwrap (C&M 179) gives assent; SmartDownload page (C&M 180–182) does not | Passes on the facts; missing governing law (E9). "Only when" matches "essential" (C&M 182). |
| 11 | "Clicking a button only agrees to terms you were fairly warned about. If the terms sit below the visible screen and nothing tells you the click means agreement, you have not agreed." (Specht takeaway) | Hancock-style screen with "I Accept" and terms displayed (C&M 183) | Passes: the second sentence is conjunctive and does not say terms below the fold never bind. |
| 12 | "The duty to read does not answer the prior question whether the recipient received reasonable notice that terms were being proposed." (Specht map Reasoning) | C&M 181 duty-to-read exception | Passes. |
| 13 | K-10 node b "Specht’s license terms sat below the download button" | C&M 180 | Fails as to location of the terms (E10). |
| 14 | K-10 node b edges | User who actually read the notice | Fails to ask the question (E11). |
| 15 | Lecture note on § 21 comment c | Slide 5 text | Fails (E7). |
| 16 | "Restatement § 21 does not generally require an affirmative intention to incur legal obligation, but manifested intention not to be legally bound can matter." (`assent-consent-intent`) | § 21 black letter | Passes. |
| 17 | "Cohen rejects the contract claim in its journalistic setting but later allows recovery through promissory estoppel." (`social-intent`) | C&M 183, 185 | Passes. |
| 18 | RLCC hub § 2(c): "... any unadopted standard terms the consumer elects, terms both parties agreed to, and terms supplied by law." (`tools/r19/data/rlcc.json` /hub/notes) | 2024 § 2(c), CR 884–889 | Passes with a small omission: the 2024 text reads "terms supplied or incorporated by law". This is OP-CT-RLCC territory; noted for the coordinator, not counted as a Class 6 finding. |

---

## (e) Slide comparison for the lecture notes

The lecture-notes record (`tools/canons/data/lectures.json` index 27) has nine topics covering all 16 slides. The deck has no extracted speaker notes, so every comparison is between slide text and note text.

| Slide(s) | Lecture note | Comparison | Proposal |
|---|---|---|---|
| 1–3 | Topic 1 opening sentence | Accurate summary of slide 3's topics. | None. |
| 4 (Balfour questions) | Topic 1 | Accurate, but omits the slide's question "What are the pros and cons of legally enforceable promises?" | Add ", what the pros and cons of legally enforceable promises are," after "what the effects of unenforceable promises are". |
| 5 (§ 21 and cmt. c) | Topic 2 | The note drops the slide's "and some unusual manifestation of intention is necessary to create a contract". | Correct the note (E7). |
| 6 (Cohen) | Topic 3 | Accurate. The slide cites "50 U.S. 663, 672"; the casebook gives 501 U.S. 663 (C&M 169 n.a). The slide quotes the U.S. Supreme Court, whose decision concerned the First Amendment and promissory estoppel, while the casebook's Cohen excerpt is the Minnesota court's 1990 contract ruling. | Keep the classroom wording and add: "Legal qualification: Justice White's sentence is from the U.S. Supreme Court's 1991 decision reversing the Minnesota court (501 U.S. 663; the slide prints '50 U.S.'). The Minnesota Supreme Court's earlier holding that the reporters' promise was not a contract, because the parties did not intend legal enforceability (C&M 183–185), is the part of Cohen this class's reading covers." |
| 7–8 (Lucy) | Topic 4 | Accurate record of the questions. The Atlas nowhere answers the three variations. | Add the answers to the Lucy map entry (G1), not to the lecture note. |
| 9 (justifications) | Topic 5 | Accurate. The justifications are the professor's; the casebook does not list them. | None. |
| 10–11 (Leonard; factors) | Topic 6 | Accurate. The factor list is the professor's. | None; fix `note-leonard` (E8). |
| 12 (Specht) | Topic 7 | Accurate. | None. |
| 13–15 (Uber screens) | Topic 8 | Accurate; it correctly says the screens are images. The slide gives Cullinane's year but not its court. | Keep the wording and add: "Legal qualification: Cullinane is a First Circuit decision that applied Massachusetts law and found that Uber's registration process did not give adequate notice; Meyer, applying California law, found that the sign-up screen did (see the Atlas's Kauders brief, C&M 304–314, and its Meyer entry). Neither result is in the Class 6 readings." (Basis: the Atlas's own Class 9 entries, which I did not check against their sources.) |
| 16 (RLCC § 2) | Topic 9 | Accurate; the edition note was added by OP-CT-RLCC. The slide's black letter matches the 2019 draft and omits the 2024 burden; it omits (c). | Add the G7 "Legal qualification:" sentence and the G8 sentence on (c). |

---

## (f) Required route test

One decisive fact changed per run. "Correct" means the displayed result matches the source-supported result.

### Lucy v. Zehmer: K-09 (cites lucy at nodes b, c, f)

| Run | Facts | Path | Displayed result | Source result | Verdict |
|---|---|---|---|---|---|
| L1 (actual) | Signed writing after 40 minutes of negotiation, redrafted for both signatures; Zehmer's whispered joke kept from Lucy; Lucy believes it serious (C&M 174–176) | a → "Commercial undertaking" → b → "Serious appearance reasonably understood" → f | Agreement; proceed to consideration, form, defenses | Contract; specific performance (C&M 176) | Correct |
| L2 (Lucy knew of the joke) | Same, but Lucy knew Zehmer was joking (Note 4, C&M 178; slide 8) | a → b → "Both parties understood jest" → e | No binding undertaking | No contract (quoted § 71 exception, C&M 176) | Correct, though the edge label says "understood jest" rather than "knew of the private meaning" |
| L3 (Lucy should have known) | Same, but the price is $50 for the 471-acre farm (Note 2, C&M 176–177) or the offer is a Leonard-type spoof | a → b: no edge fits; via c → "Serious appearance despite private intent" → f | Agreement | No contract (C&M 176 "warrant a reasonable person"; C&M 177 Keller, Leonard) | **Wrong** (E3) |

Plain-English check: plain 4.0 preserves the L1/L2 distinction (actual knowledge) but erases L3 (E1). The takeaway erases L2 (E2). The Cold Call narrative itself is accurate ("A joke can matter when its context communicates that character").

### Balfour v. Balfour: K-09 (cites balfour at nodes d, e)

| Run | Facts | Path | Displayed result | Source result | Verdict |
|---|---|---|---|---|---|
| B1 (actual) | Allowance promised while spouses were in amity and reunion was expected; no separation agreement (Supp. pp. 11–12, 16 (571–572, 576)) | a → "Domestic or social undertaking" → d → "Only a social or domestic understanding" → e | No binding undertaking | No contract (Supp. pp. 15, 18–20 (575, 578–580)) | Correct |
| B2 (separation agreement) | Same allowance, but agreed as the terms on which the spouses separated by mutual consent (Duke, Supp. p. 16 (576); counsel's authorities, Supp. p. 13 (573)) | a → d → "Evidence of legal undertaking" → f | Agreement; proceed to consideration and terms | Can be a contract: a separation agreement "does involve mutual considerations" (Supp. p. 16 (576)); the court did not decide such a case | Correct direction; node d does not name the decisive fact (G5) |
| B3 (professional setting) | Cohen: reporters' promise of anonymity to a source (C&M 183–185) | a → "Commercial undertaking" → b → "Serious appearance reasonably understood" → f | Agreement | No contract (Minn. 1990, C&M 185) | **Wrong** (E4) |

Plain-English check: plain 1.2 preserves the decisive distinction ("her cases, which involved separated couples" versus "spouses still living amicably"), and plain 4.0 states Atkin's intention ground. Plain 1.0 misdescribes the decree as a divorce decree (E5b), which works against the amity distinction.

### Specht v. Netscape: K-10 (cites specht at nodes a, b, h)

| Run | Facts | Path | Displayed result | Source result | Verdict |
|---|---|---|---|---|---|
| S1 (actual) | Free download by a visible button; the only license reference is on the next screen after scrolling and links to a separate page; users unaware (C&M 180–182) | a → "Term shown during enrollment" (closest edge; the term was not in fact shown) → b → "Hidden display or ambiguous act" → h | Term did not enter | No assent to the arbitration term (C&M 182) | Correct; the a-edge label assumes the disputed fact |
| S2 (clickwrap) | License displayed in a scrollable box and installation blocked until "Yes" is clicked, as for Communicator (C&M 179) | a → b → "Reasonable notice and assent" → g | Term may govern; test scope and defenses | Users "expressly agreed" to Communicator's terms (C&M 179) | Correct |
| S3 (actual knowledge) | Specht's page, but the user scrolled and read the notice before clicking | a → b → "Hidden display or ambiguous act" → h | Term did not enter | Open: the court relied on unrefuted unawareness (C&M 182) and a rule protecting offerees from terms "of which he is unaware" (C&M 180); § 19(2) asks what the actor knew or had reason to know | Chart forecloses an open question (E11) |

Plain-English check: plain 4.1 preserves the § 19(2) knowledge condition for conduct as assent. No plain sentence renders the notice holding that S1 and S2 turn on (G12).

Suggested relabel for K-10 node a's first edge, so S1 does not assume the disputed fact: "Term or notice available before the act claimed as assent".
