# Contracts source-first audit: packet ownership (Opus)

Owner of this file: the Opus session leading the Contracts audit (owner's brief, 19 November 2026).
Astra assigns complementary work from it. A session is claimed only when it is listed here
as **in progress** or **done**; anything else is open.

## Branches

- Coordination and reviews: `audit/corpus-2026-11-19` (this branch).
- Corrections: `audit/contracts-opus-2026-11-19`, branched from this branch. It does not
  deploy (only `claude/atlas-design-content-audit-m1cw9x` deploys). One commit per
  correction group, each with pinpoints, for Astra's review.

## Method for every packet

1. Workers read the assigned C&M range, the supplement and selections for the session, and
   the class slides where they exist, before reading any Atlas content.
2. From those sources alone they list what a student needs to learn in that session.
3. That list is compared with what the Atlas actually serves for the session: map entries,
   effective briefs, takeaways, Cold Calls and their plain-English sentences, doctrine
   timelines, chronologies, flowcharts, and rules-and-authorities entries.
4. A different worker, in parallel, challenges selected explanations for overstatement,
   missing conditions, and plain-English wording that changes the legal result.
5. Only source-supported corrections are made. Precise legal terms and the reader's saved
   annotations are preserved: map-entry corrections are run-time edits that apply only while a
   field still holds its old value; brief corrections are exact-value overlays.

Already covered elsewhere and not repeated: the 17 November redesign registers in
`tools/content-audit/` (readability review of every timeline; primary-passage review of
Mattei, Drennan, Parker, Luttinger, Trident, Hassler, Peevyhouse, Anderson, Hill, Market
Street and Ricketts). Findings already in those registers are not re-reported.

## Packets

Rows in `source-worklist.tsv` covered by each packet are `K-<class>-CM-*`, `K-<class>-SUPP-*`,
`K-<class>-ITEM-*` and `K-<class>-DECK-*`. Astra's K-A reader holds assignment 1; this
file does not claim it.

| Packet | Session | Status | Sources on file |
|---|---|---|---|
| OP-CT-11 | Class 11, Contract modifications (C&M 470–484, 487–492; Supp. 9; Rest. §§ 89, 175, 176; UCC § 2-209; RLCC § 3; N.Y. G.O.L. § 5-1103) | **in progress** | casebook, supplement, selections, slides |
| OP-CT-12 | Class 12, Fraud and misrepresentation (C&M 508–526; Supp. 22–36) | queued next | casebook, supplement, slides |
| OP-CT-13 | Class 13, Parol evidence rule (C&M 527–530, 535–547; Supp. 37–45) | queued | casebook, supplement, slides |
| OP-CT-14 | Class 14, Plain meaning and extrinsic evidence (C&M 548–569, 574–575; Supp. 46–52) | queued | casebook, supplement, slides |
| OP-CT-15 | Class 15, Extrinsic evidence of past dealings (C&M 575–599) | queued | casebook, selections; deck K-15-DECK-01 absent from `added-sources/` |

After OP-CT-15 this session continues with Classes 16 to 26, then 1 to 10, claiming each
here before starting. Astra may assign any Contracts session not marked in progress or done,
and may move a queued session to another worker by editing its row.

## Evidence and handoffs

Each packet's evidence is in `docs/history/corpus-audit-2026-11/contracts/<packet>/`:
`sources.md` (what was read, with page ranges and anything missing), `learn-list.md`,
`comparison.md`, `challenge.md`, and `handoff.md` (short: what changed, with commit ids and
pinpoints, and what is left for Astra).
