# Rules and authorities on the atlas (v2.5)

**Rules & authorities** is a rectangle beneath the Legal Dictionary. It follows the dictionary's current position in both the wide and tall course arrangements, and the atlas fit bounds include it. Clicking it opens nested rectangles on `geoCanvas`; clicking a provision opens the existing `inspector`. There is no separate authority dialog, overlay shell, or extra breadcrumb shortcut. **More → Rules & authorities** and atlas search navigate into the same map hierarchy. Case panels keep reciprocal authority links collapsed at the end of the reading panel.

The hierarchy is collection → group → provision. Constitution articles and amendments remain separate; FRCP groups use the eleven official titles. UCC groups use article and part numbers. Restatement groups are explicitly numbered reading ranges, not invented chapters. The U.S. Code exposes Titles 28, 9 and 5 directly, with other selected titles in numeric order, then retains official parts and chapters. Large indexes have labelled navigation ranges so hundreds of provisions do not crowd a single view. No authority is dropped by those subdivisions.

Authority navigation uses the existing camera, rectangular hit targets, keyboard activation, stepped zoom, breadcrumbs, Back history, reading panel and tapered ribbons. **See on map** shows up to six recorded case connections at readable scale; the complete list remains in the inspector. Link basis stays available through tooltips and accessibility descriptions. Private authority geometry is generated from the source data and is never inserted into `seedData`, `studyMap.regions`, or saved node homes.

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

The extractor also measures effective text size from the PDF text matrix: this source uses a nominal size of 1 with the real size carried in the matrix. Main blackletter is 10 points; editorial footnotes are 8 points and their superscripts are smaller. A 9.5-point minimum excludes that apparatus while preserving blackletter at the bottom of pages. Comment boundaries are recognized before the size filter because comment headings themselves can be smaller. The full pass found four affected bodies: Restatement § 344 and UCC §§ 1-201, 2-103 and 2-209. The first and last had footnotes belonging to earlier material; the two state-enactment qualifications are retained separately as dated compiler notes. `authorities-extraction-audit.json` records the full 385-Restatement/133-UCC extraction pass, all 32 excluded editorial spans and source-body fingerprints. It documents mechanical extraction scope, not a new legal merits audit of every provision.

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

The US Code collector is independent: run its own source/currency checks first, then rebuild this library to merge its entries. The combined library retains the collector’s section order, chapter, title number, source currency and effective-date annotations. The authority builder additionally uses that collector's pinned official extraction for 3 U.S.C. § 301, cited in the atlas as “Section 301 of title 3”; the verbal citation form now participates in explicit link matching. This extra provision does not alter the collector-owned `uscode.json`.

The assembler embeds `authorities.json` in `dklaAuthoritiesData`, then loads `authorities.js` and `authorities.css` from the runtime manifest. `window.DKLAAuthorities.open('const-art-3')` navigates to that provision and opens the native inspector. `.open(null, 'frcp')` opens the FRCP title rectangles; `.group('authority-root')` opens the authority entrance; `.geography()` returns a bounded diagnostic of the current hierarchy and selection. Text paragraphs, source notes and provision links stay available offline; external official links require a connection.

The render check exercises every actual authority paragraph and statutory annotation through the real inspector, validates unique hierarchy coverage, and checks native map activation attributes, ordered navigation, Back across case navigation, ribbons, and phone/desktop geometry. Browser checks remain necessary for real pointer activation, measured text, responsive wide/tall entrance placement, focus, scroll and source-dialog return.

The adapter wraps scoped map APIs rather than copying source records into the graph. `S.scope` is `Rules & authorities`, `S.region` is a private group ID, and `selected.type` is `authority`; these values survive the existing `remember()`/`restoreView()` path. The map's earlier Case/Concept decorators are followed by a final private paint callback to prevent their unrelated support tiles and tiny-text rules from altering authority geometry. Native `data-map-region` and `data-map-jump` attributes route through the wrapped `goRegion()` and `goNode()` functions, so authority controls preserve the atlas's pointer, keyboard and panning behavior.
