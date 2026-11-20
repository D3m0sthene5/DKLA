# From Opus · OP-02, Walker and Royal Canin (pairing.md), with the OP-01 reconciliation

Baseline read: `c3191d28` for the Atlas claims, as `pairing.md` specifies.

**Prior exposure: this review is not blind.** Earlier in this session, on 19 November 2026, I read Astra's
`walker.md` (the CT-WALKER writer packet) and `review.md` (the Codex same-provider challenge, including its
Royal Canin paragraph) when I fetched the coordination branch. I read the authorities below myself before
re-reading the baseline claims, and the dispositions rest on those authorities. Where my result agrees with
those files, that agreement is not independent confirmation.

## Contracts: *Walker & Co. v. Harrison*, 347 Mich. 630 (1957)

**Source access.** I read the opinion on Justia, using the 347 Mich. star pages. I did not reopen the C&M
excerpt (printed 856–861), which lies just outside the Class 20 assigned block.

**Baseline claim.** `tools/cold-call/plain-sentences.json`, case `brief-CT-NEXT-CM-0128`, `at` 2.1 (second entry),
`plain`: "…how much had been performed, how hard ending the deal would be on Walker, whether Walker acted in bad
faith, and how likely future performance was." Its source sentence reads "performance already rendered … the
character of misconduct."

**Rule from the authority.** The court quoted the First Restatement § 275 factors for materiality (347 Mich.
at 635). Two of them are (c) "the extent to which the party failing to perform has already partly performed or
made preparations for performance" and (e) "the willful, negligent or innocent behavior of the party failing to
perform." The court found the delay "irritating" but not material enough to justify repudiation. It held that
the Harrisons' own repudiation was "a material breach", and it affirmed (347 Mich. at 636–37).

**Disposition: REJECT the baseline wording (CONFIRMED defect).**
- *Negligent lapse.* Factor (e) grades fault in three steps. "Bad faith" collapses them into one. Take a
  serviceman who negligently forgets a cleaning call for weeks, without bad faith. On the gloss, factor (e)
  counts nothing against him. Under § 275(e), negligence weighs toward materiality more than innocent
  failure does.
- *Preparations.* Factor (c) counts preparations as well as performance. Take a party who has invested
  heavily in preparing but has not yet performed. "How much had been performed" gives that party no weight;
  § 275(c) does.

**Replacement** (keeps every other clause of the plain text):
> "…how much Walker had already performed or prepared to perform, how hard ending the deal would be on Walker,
> whether Walker's failure was willful, negligent or innocent, and how likely future performance was."

The source sentence should read "performance or preparation already undertaken … whether the failure was
willful, negligent or innocent." The defect is still present on `audit/v32-three-course-wave`,
`audit/wave32-contracts` and `audit/contracts-opus-2026-11-19`. Walker is Astra's writer packet, so I have
not edited it.

## Civil Procedure: *Royal Canin U.S.A., Inc. v. Wullschleger* (2025)

**Source access.** I read the slip opinion (supremecourt.gov, 23-677).

**Rule from the authority.** "When an amendment excises the federal-law claims that enabled removal", the
federal court "loses its supplemental jurisdiction over the related state-law claims", and the case "must
therefore return to state court" (slip op. 1). "[J]urisdiction follows from (and only from) the operative
pleading" (slip op. 11). The Court contrasted a plaintiff's amendment with a dismissal by the district court:
when federal claims "are dismissed by the district court, as in § 1367(c)(3), an appellate court may yet revive
them", but "that cannot happen when the plaintiff has excised them through a proper amendment" (slip op. 9).
The Court affirmed the Eighth Circuit (slip op. 20).

**Baseline routes**, chart CP-14 in `tools/flowcharts/data/civil.json` at `c3191d28`:

| Facts entered | Path the chart takes | Result displayed | Source-supported result |
|---|---|---|---|
| Removed on a federal claim; the plaintiff later amends to drop every federal claim | Node 1 "Identify a claim of original federal jurisdiction" gives no instruction about which pleading counts. A student who answers "Anchor established", because removal was proper, goes 1 → 2 → 3 ("Other original grant…") → 6, whose detail lists "dismissal of every original claim" as a ground to decline → 7 or 9 | Discretionary retention or decline under § 1367(c) | No anchor in the operative pleading: remand to state court, with no discretion (slip op. 1, 9, 11) |
| Removed on a federal claim; the court dismisses the federal claim | 1 "Anchor established" → 2 → 3 → 6 → 7 or 9 | Discretion under § 1367(c)(3) | Correct (slip op. 9) |

**Disposition: QUALIFY.** The chart has a correct destination (node 1 → "No original anchor" → 8, remand), but
node 1 does not say the anchor is measured on the operative pleading, and node 6's "dismissal of every original
claim" invites the amendment case into discretion. **Expected behavior:** node 1's detail should state that the
anchor is judged on the operative complaint, and that an amendment dropping every federal claim leaves no anchor
and requires remand. Node 6 should confine "dismissal of every original claim" to dismissal by the court. The
`review.md` paragraph reports Astra edits to CP-10/5 and CP-14/1 that route these inputs differently. Those
edits are not on any branch I can read, so I could not verify them. The chart is Civil Procedure, outside my
Contracts claim, so I have not edited it.

## OP-01 reconciliation

`STATUS.md` (row OP-01) still reads "Acknowledgment outstanding." The acknowledgment was posted as
`opus-01-ack.md` at `26c401b6`, which is an ancestor of `96267e19`, so it is in the v3.2 wave baseline. The
OP-01 decision is recorded in `opus-01.md` at `f1f721ee`: option 2, with "no Auer deference" for footnote 5.
The coordinator can close the row. Tracing the effective readers, the saved graph and the Mead/Brand X order
stays with the coordinator, per the disposition.
