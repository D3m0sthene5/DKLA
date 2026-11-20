# Consequential findings from OP-CT-11 to OP-CT-15: owners and status

This session holds each finding until the named owner accepts it. "Fixed here" means corrected on
`audit/contracts-opus-2026-11-19`. Routes are traced from the entry a student actually uses: the chart's entry
node, or the case page, which shows each chart step that cites the case (`flowcharts.js` `stepsCiting`).

## Fixed here (commit `ab4819b8`, registered in `tools/content-audit/2026-11-19-contracts-opus.json`)

**1. K-22 sent Columbia Nitrogen's evidence to the vacated result.**
- *Facts entered:* a sale of goods on a writing the trial court held complete; the buyer offers course of
  dealing and usage of trade to show that the quantity and price terms were projections.
- *Path at `41d6d02e`:* entry a "For what purpose is the evidence offered?" offered no purpose for commercial
  context. The nearest choice, "Enforce earlier term", leads to b → "Complete integration" → d →
  "Within integrated scope" → e.
- *Result displayed:* "Earlier term excluded for this purpose." That is the trial ruling, and the judgment
  was vacated and remanded (C&M 596–599).
- *Source-supported result:* the evidence comes in to explain or supplement unless it cannot reasonably be
  construed as consistent with the express terms or is carefully negated (C&M 597–598; UCC § 2-202(a),
  § 1-303(e)).
- *Now:* a new edge "Show course of dealing, usage of trade or course of performance" leads to node j. From
  j, consistent and not negated goes to k ("may explain or supplement", with the § 1-303(e) order of
  priority); a contradicting or negated term goes to e. The Columbia case page now lists K-22 steps j and k.

**2. Restatement § 201 (whose meaning prevails) appeared on no case surface.** It is assigned for Class 15.
Its home is now K-23 node f, "Apply the meaning the evidence supports", reached by a → b → f or a → c → f.
The node states § 201(1), § 201(2)(a)–(b), and § 201(3) with § 20 (no agreement on the term), and notes that
Frigaliment was decided on the plaintiff's burden of proof instead.

**3. K-22 had no route for an oral condition on the writing's effect.**
- *Facts:* the parties agreed orally that the signed writing would take effect only if financing was obtained.
- *Path at `41d6d02e`:* "Enforce earlier term" → b → d → e (excluded).
- *Source-supported result:* the agreement is not integrated as to the oral condition (Restatement § 217;
  Class 13 slide 7).
- *Now:* edge "Show the writing takes effect only on an oral condition" → l, "The oral condition may be proved".

**4. K-23's entry confined the usage route to Article 2.** Hurst v. W.J. Lake (Or. 1932), a pre-Code usage case
on the same chart, could not reach node d. The edge now reads "Commercial context: course of dealing or usage of
trade".

## Offered to an owner (not edited here)

| # | Finding | Owner | Record and expected behavior | Accepted? |
|---|---|---|---|---|
| 5 | **"Authorities cited" lists authorities a case never cites.** The case-page box (`src/features/v25/authorities.js` `contextual()`) shows `authorities.json` `byNode`, which includes the builder's one-hop "Case connected to cited atlas rule or concept" links. Restatement § 21 reaches 55 cases through the concept `assent-consent-intent`; Frigaliment, Nanakuli and Swinton each show § 21 as their only "cited" authority. Across the atlas, 208 of 694 case-to-authority pairs in `byNode` are not citations, and 65 cases show only uncited authorities; next after § 21 come Art. III (28), § 209 and UCC § 2-202 (10 each), FRCP 12 (9). | Astra (`tools/v25/authorities_build.py` is changed on `audit/wave32-contracts`) | Build `byNode` for Case entries from links whose basis starts "Explicit citation", matching the builder's own `automaticRibbonPolicy`, or relabel the box. Context links can stay on the authority's page. Then link the assigned provisions that the briefs actually cite (Class 15: §§ 20, 201, UCC § 1-303; Class 16: § 205 for Dalton, UCC §§ 1-201, 1-302, 1-304; Class 17: § 211 for Graham; Class 20: §§ 84, 224–229, 234, 237, 240). Classes 16–20 confirmed the pattern: Dalton, Carnival, Graham, Doe, Peacock and McKenna each show § 21. **Tested patch:** `authorities-explicit-only.patch` (two lines in `link_entries` and the matching check; applies to the corrections branch, and its hunks do not touch the lines Astra changed on `audit/wave32-contracts`). After `--relink`, case-to-authority pairs fall from 694 to 486, cases showing the box fall from 322 to 257, § 21 leaves all 55 case pages, authority pages and non-case entries are unchanged, and `--check` passes. Cost to weigh: some relevant one-hop links also go, for example UCC § 2-202 and § 209 on Columbia Nitrogen, because the matcher reads the map entry's title, summary, notes and sources, not the brief. The second step (match against effective briefs) restores those. Not committed here because the builder is Astra's. | Not yet |
| 6 | **Walker ≈ 2.1 renders § 275(e) as "bad faith" and drops (c)'s "preparations".** | Astra (CT-WALKER packet) | Exact replacement in `../opus-02.md`. | Not yet |
| 7 | **CP-14 (§ 1367) does not say the anchor is judged on the operative pleading** (Royal Canin). | Astra (Civil Procedure) | Route table and expected behavior in `../opus-02.md`. | Not yet |
| 8 | **Mattei slide guide: "Slide 6 shows drafting that does".** | Astra (Class 4, `audit/wave32-contracts`) | Qualified wording in `../opus-k04-disposition.md`. | Not yet |
| 9 | **Timeline placement and turn labels.** Frigaliment sits after the 1952 UCC step marked "sharpens", though it applied pre-Code New York law. Bollinger is marked "widens", though Gianni had already recognized the mistake route. | Fable, with the timeline redesign | `OP-CT-15/handoff.md`, `OP-CT-13/handoff.md`. | Not yet |

## Still with this session (open)

Classes 16–20 add their own open items; see `WAVE-16-20.md`. Routing errors found there were fixed in those class commits (K-24, K-25, K-26, K-27, K-08).


- K-20 node a cites `ucc204` (UCC § 2-204), and the Atlas has no map entry for § 2-209. A map entry for § 2-209
  needs a run-time graph addition (OP-CT-11).
- K-21 node d routes a Swinton-type claim for avoidance to "no avoidance" despite § 161(b); node g omits the
  peculiar-knowledge exception Psenicska applied (OP-CT-12).
- K-23 node e omits § 1-303(f) (course of performance as waiver or modification); node g has no
  burden-of-proof outcome (OP-CT-15).
- Lecture notes that faithfully report a slide's shorthand where the shorthand drops a statutory condition:
  RLCC § 3 "reject or terminate" (Class 11, slide 15). Annotating a slide summary is an owner decision.
- Hall and Elliot map entry and the Class 14 hub (OP-CT-14). Glossary: the Wex contra proferentem entries say
  "always" (C&M 567: last resort). Watkins: "Burque, C.J." needs checking against the full opinion.
- **Source gaps:** no slide deck was located in the checked sources for Classes 15–20 (slide coverage stays open). Their lecture-notes records
  were checked only against the casebook and selections.
