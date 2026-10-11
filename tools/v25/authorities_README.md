# Rules and authorities library (v2.5)

This is a reader and citation index, not an expansion of the map. Its entry point sits beside the course breadcrumb: **Constitution** in LRS, **Federal rules** in Civil Procedure and **Contracts authorities** in Contracts. **More → Rules & authorities** opens all collections. Atlas search includes collection titles and provision citations. Case panels keep reciprocal authority links collapsed at the end of the reading panel.

## Coverage and source status

| Collection | Embedded scope | Source |
|---|---|---|
| Constitution | Preamble, all 7 articles and all 27 amendments; article sections retain jump anchors | [National Archives articles](https://www.archives.gov/founding-docs/constitution-transcript), [Bill of Rights](https://www.archives.gov/founding-docs/bill-of-rights-transcript), [amendments 11–27](https://www.archives.gov/founding-docs/amendments-11-27) |
| FRCP | All numbered rules 1–87, decimal rules including new 16.1; abrogated 74–76 and 84, former 71A and former forms index | [Official December 1, 2025 volume](https://www.uscourts.gov/sites/default/files/document/federal-rules-of-civil-procedure.pdf); structured [LII transcription](https://www.law.cornell.edu/rules/frcp) |
| Supplemental civil rules | Admiralty A–G and Social Security 1–8 | Same official volume and LII transcription; the LII contents link says “1–7” but the linked text includes Rule 8 |
| Restatement (Second) of Contracts | All §§ 1–385 black letter and complete section titles, from the owner’s assigned source | `added-sources/Contracts- Selections.pdf` (2021 Selections); comments remain in the source |
| UCC | All 104 Article 2 section slots, plus other assigned UCC black letter (133 entries total); 12-article directory | Same assigned Selections; [ULC directory](https://www.uniformlaws.org/acts/ucc) for all articles, including Article 12 |
| Consumer Restatement | All 10 sections of the assigned 2024 official text, black letter | `added-sources/Complete Restatement.pdf` and its existing page index |
| United States Code | Full Title 28, full Title 9 and course-relevant provisions from other titles; historical statuses and effective-date notes retained | `uscode.json`, collected separately by `uscode_build.py` from pinned official OLRC USLM; see that file’s exact coverage and currency |

Original constitutional article text is preserved; it is not presented as a silently consolidated current text. Related amendments link back to changed language, including the Eleventh, Twelfth, Fourteenth and Twenty-first Amendments. Amendment XVIII is labelled repealed.

The civil rules are effective December 1, 2025. The official current-rules page identifies those rules as current; amendments scheduled for December 2026 must not be substituted before their effective date. The library includes Rule 16.1, not a 2024 rule inventory.

Restatements describe common law and can be persuasive; they are not enacted statutes. UCC text is model/assigned language. State adoption, amendments and effective dates control. The assigned Selections omit former § 2-208’s black letter and explain its deletion from the 2003 Official Text in light of § 1-303; the library preserves that deletion note and links to § 1-303. The article directory does not pretend to embed full unassigned Articles 2A–12. All assigned Article 2 section slots are present.

## Extraction and audit boundaries

`authorities_build.py` uses the assigned PDF’s bold numbered headings to locate Restatement and UCC black letter, then stops at comments and apparatus. It preserves full titles that the inherited flattened index truncated. Two inherited index entries (§§ 363 and 375) pointed to earlier comment cross-references; the builder instead uses their actual headings at PDF pages 218 and 221. The Consumer Restatement index also contains a comment reference to statutory § 8401; it is excluded rather than invented as a Consumer Restatement section.

Every text entry records its source, edition/read date, source URL or assigned PDF page, and a text fingerprint. Raw official fetch hashes and source-index/PDF hashes are recorded in the dataset. Constitutional transcription coverage, operative/historical rule slots, complete R2 section coverage, reciprocal links and source paragraph shapes are checked mechanically. These are extraction, currency and citation checks; they do not amount to a new legal audit of every linked case.

Links use explicit citations in the atlas or canonical mapped case brief. A single existing graph edge may connect a cited rule/concept to its case. Each link states which basis was used. Mere shared keywords and arbitrary transitive links are excluded. The index is useful discovery, not a claim that every possible legal relationship has been exhausted or that a case decided every subsection.

## Maintenance

Run from the repository root:

```text
python tools/v25/authorities_build.py --refresh
python tools/v25/authorities_build.py --check
node tools/v25/authorities_check.cjs [built-atlas.html]
```

Refresh regenerates the dataset using cached official source pages. Raw pages/PDFs are cached outside the repository checkout in the workspace `work/authorities-cache`; refreshing those fetches requires deleting the particular cache files deliberately after checking the new edition and effective date. `--check` and the normal atlas build are offline. PDF re-extraction requires `pypdf`; release checking uses only Python’s standard library.

The US Code collector is independent: run its own source/currency checks first, then rebuild this library to merge its entries. The combined library retains the collector’s section order, chapter, title number, source currency and effective-date annotations.

The assembler embeds `authorities.json` in `dklaAuthoritiesData`, then loads `authorities.js` and `authorities.css` from the runtime manifest. `window.DKLAAuthorities.open('const-art-3')` opens a provision; `.open(null, 'frcp')` opens Rule 1. No map nodes or homes are added. Text paragraphs, source notes and provision links stay available offline; external official links require a connection.

The render check exercises every actual authority paragraph and statutory annotation through the real reader, plus navigation, keyboard isolation and the mobile-to-desktop sidebar regression. Browser checks remain necessary for layout, focus, scroll and source-dialog return.
