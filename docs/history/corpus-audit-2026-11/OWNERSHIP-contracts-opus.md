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
| OP-CT-11 | Class 11, Contract modifications (C&M 470–484, 487–492; Supp. 9; Rest. §§ 89, 175, 176; UCC § 2-209; RLCC § 3; N.Y. G.O.L. § 5-1103) | **done**: `cce8e4b8` (28 corrections), records re-pinned `05fa132a`; [handoff](contracts/OP-CT-11/handoff.md) on the corrections branch | casebook, supplement, selections, slides |
| OP-CT-12 | Class 12, Fraud and misrepresentation (C&M 508–526; Supp. 22–36) | **done**: `e282ac9b` (15 corrections); [handoff](contracts/OP-CT-12/handoff.md) on the corrections branch | casebook, supplement, slides |
| OP-CT-13 | Class 13, Parol evidence rule (C&M 527–530, 535–547; Supp. 37–45) | **done**: `4f5c9c47` (22 corrections); [handoff](contracts/OP-CT-13/handoff.md) on the corrections branch | casebook, supplement, slides |
| OP-CT-14 | Class 14, Plain meaning and extrinsic evidence (C&M 548–569, 574–575; Supp. 46–52) | **done**: `96ebee23` (15 corrections); [handoff](contracts/OP-CT-14/handoff.md) on the corrections branch | casebook, supplement, slides |
| OP-CT-15 | Class 15, Extrinsic evidence of past dealings (C&M 575–599) | **done**: `b767c567` (11 corrections); [handoff](contracts/OP-CT-15/handoff.md) on the corrections branch; slides missing | casebook, selections; deck K-15-DECK-01 absent from `added-sources/` |
| OP-CT-16 | Class 16, Performing in good faith (C&M 719–744; Supp. 53–75) | **in progress** | casebook, supplement; deck K-16-DECK-01 absent |
| OP-CT-17 | Class 17, Standard form and adhesion contracts (C&M 653–655, 661–679; Supp. 76–93) | **in progress** | casebook, supplement; deck K-17-DECK-01 absent |
| OP-CT-18 | Class 18, Unconscionability (C&M 679–706; Supp. 94–101) | **in progress** | casebook, supplement; deck K-18-DECK-01 absent |
| OP-CT-19 | Class 19, Public policy (C&M 744–764, 769–780; Supp. 102–107) | **in progress** | casebook, supplement; deck K-19-DECK-01 absent |
| OP-CT-20 | Class 20, Express and constructive conditions (C&M 805–809, 814–824, 828–832, 846–855, 871–875, 883–893) | **in progress** | casebook; deck K-20-DECK-01 absent |

Claimed 19 November 2026, 20:30 ET, after checking `STATUS.md`, `v32-wave.md` and Astra's wave branches
(Contracts assignments 1–4 are Astra's). Open after this wave: Classes 21–26 and 5–10. This session also holds
the cross-class findings from Classes 11–15 until an owner accepts each one; see
`contracts/CROSS-CLASS.md` on the corrections branch. Astra may assign any Contracts session not marked in progress or done,
and may move a queued session to another worker by editing its row.

Corrections branch `audit/contracts-opus-2026-11-19` passes `pnpm verify` (76 of 76) at `41d6d02e` (91 corrections across Classes 11–15).
It also extends `tools/content-audit/check.py` (`a5bbc289`) so that registered edits to Cold Call,
flowchart and lecture files are checked, and adds the read-only `tools/content-audit/session_surfaces.py`.

## Evidence and handoffs

Each packet's evidence is in `docs/history/corpus-audit-2026-11/contracts/<packet>/`:
`sources.md` (what was read, with page ranges and anything missing), `learn-list.md`,
`comparison.md`, `challenge.md`, and `handoff.md` (short: what changed, with commit ids and
pinpoints, and what is left for Astra).
