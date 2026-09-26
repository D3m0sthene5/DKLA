# DKLA legal glossary

`glossary.json` is a dictionary of legal terms for the atlas's search bar and case pages.
Built 26 September 2026. Shape:

```json
{"source": "...", "built": "2026-09-26",
 "terms": [{"term": "consideration", "slug": "consideration",
            "definition": "plain prose, 1–4 sentences",
            "source": "LII Wex", "url": "https://www.law.cornell.edu/wex/consideration",
            "liiVerified": true}, ...]}
```

Terms are sorted alphabetically (case-insensitive), deduplicated case-insensitively, and every
definition is at least 40 characters of plain text (HTML, markdown links, "See also" tails,
Wex "[Last updated …]" footers and page furniture stripped). `url` is always the LII Wex lookup
URL for the term (`slug` = lowercase, spaces to hyphens, punctuation stripped; for entries copied
from a Wex page the slug is the one the page actually used, which may contain underscores), so
the reader can open Cornell's own entry even where the definition here came from elsewhere.
`liiVerified` is true only when the definition text itself was copied from a Wex page.

## Counts by source (13,836 terms)

| Count | `source` value | What it is |
|---:|---|---|
| 73 | `LII Wex` | Verbatim Wex definitions (first paragraphs, trimmed to four sentences) recovered from two public GitHub repositories that had saved Wex pages: `mattshuttle/bar-exam-mcp` (`content/*/rules/*.md`, 46 bar-topic entries retrieved March 2026 with source URL and date) and `fhk/law_cards` (`Input_Data.json`, entries from the short letters of the Wex index). Wex is CC BY-SA 4.0. **These are the only entries marked `liiVerified: true`.** |
| 194 | `DKLA editorial` | A curated first-year core written for this file: contract formation and remedies, UCC Article 2 terms, personal and subject-matter jurisdiction, pleading, joinder, discovery, Erie, preclusion, appeals, the canons of construction, delegation, deference doctrines (Chevron/Loper Bright, Skidmore, Auer/Kisor, Mead), APA rulemaking and review, removal and appointments. Short, checked against the standard rules and cases named in each entry; not copied from any dictionary. Used only where no Wex text or modern public glossary entry existed. |
| 225 | `US Courts glossary` | The federal judiciary's Glossary of Legal Terms (uscourts.gov/glossary), public domain, from `public-law/datasets` and `statedecoded/legal-dictionary`. |
| 64 | `California Courts glossary` | California Courts criminal-procedure glossary, from `public-law/datasets`. |
| 236 | `Virginia courts glossary` | Virginia Judicial System glossaries (Journey Through Justice; Circuit Court civil and criminal), from `statedecoded/legal-dictionary`. |
| 244 | `USCIS glossary` | U.S. Citizenship and Immigration Services glossary (immigration terms), public domain, from `public-law/datasets`. |
| 49 | `ODIA lexicon (Wex-derived paraphrase)` | `SynTechRev/ODIA` `legal/lexicon/wex_cornell.json`: modern definitions of civil-rights, surveillance and transparency terms described as drawn from Wex but paraphrased; not verbatim, so `liiVerified: false`. |
| 262 | `DKLA atlas concept entry` | The one-paragraph summaries of the atlas's own Concept and Rule entries (`seedData` nodes with titles of six words or fewer). They define the doctrines the way the three courses teach them. |
| 11,483 | `Black's Law Dictionary 2nd ed. (1910)` | Henry Campbell Black, *A Law Dictionary*, 2nd ed. (West, 1910), public domain, from the OCR text in `digitallawyer/openlegaldictionary` (`_data/bld.json`, same text as `raydendi/kamus-hukum` and `LexPredict/lexpredict-legal-dictionary`). First sense only, trimmed to four sentences; OCR line-break hyphens rejoined where the joined word occurs elsewhere in the text; stray symbols removed. Every definition is prefixed **"Black's Law Dictionary (2nd ed. 1910): "** because the text is a century old and the OCR still has errors (e.g. "lnltlal" for "initial"). Headwords were lowercased in Wex style. |
| 1,006 | `Bouvier's Law Dictionary (1856) maxims` | The Latin maxims section of John Bouvier, *A Law Dictionary*, 6th rev. ed. (1856), public domain, from `pavoltravnik/maxims-of-law`. Term = the maxim, definition = Bouvier's English rendering (citations stripped), prefixed **"Bouvier's Law Dictionary (1856), maxim: "**. |

Priority when the same term appeared in several sources: LII Wex, then DKLA editorial, then the
US Courts, California, Virginia and USCIS glossaries, ODIA, the atlas's concept entries, Black's,
Bouvier. About 750 duplicates were dropped that way (for example the US Courts glossary appears in
two of the repositories used).

## What could not be obtained

- **The Wex glossary itself.** The owner asked for all ~6,000 Wex terms. `www.law.cornell.edu`
  is blocked by the build sandbox's egress proxy (as are the Wayback Machine, Wikipedia/Wiktionary,
  Hugging Face, Project Gutenberg, archive.org, uscourts.gov, nolo.com, thelawdictionary.org and
  every other dictionary host tried). No complete mirror of Wex exists on GitHub, npm or PyPI:
  code search for Wex's own footer phrase ("by the Wex Definitions Team") finds only the ~120
  saved pages used above, plus RAG-benchmark snippets. The two Wex MCP servers on GitHub fetch
  live and keep no data. So only 73 entries are verbatim Wex; the other 13,763 carry the Wex URL
  for lookup but their text comes from the sources listed. **To complete the job on a machine with
  normal internet access:** the Wex index pages are `https://www.law.cornell.edu/wex/all/<letter>`
  and each entry is `https://www.law.cornell.edu/wex/<slug>`; a scraper of ~6,000 pages at a polite
  rate takes under an hour, and each fetched definition can replace the entry here and flip
  `liiVerified` to true.
- **Bouvier's main dictionary (1856).** Only the maxims section was available on GitHub; the full
  text lives on constitution.org and in the Debian `dict-bouvier` package, both unreachable.
  Black's 2nd edition covers the same ground and is 54 years newer, so this was not pursued.
- **Black's Law Dictionary, current (12th) edition** is copyrighted and was not used.
- **FindLaw / Merriam-Webster's Dictionary of Law.** A 4.6 MB scrape (`brightdude/LegalDictionaryScraperParser`)
  exists on GitHub with modern definitions of ~10,000 terms, but the text is Merriam-Webster's
  copyright, so it was deliberately not included.
- **Showalter's Law Dictionary** (`michaeljshowalter/showalters-law-dictionary`) has ~2,000
  court-language definitions but its own README marks every entry as AI-generated and not
  cite-checked, so it was excluded.
- Roughly 1,470 Black's entries whose whole text is under 28 characters (abbreviations, pure
  cross-references such as "See Abatement") were dropped, as were ~300 duplicates within Black's.

## Rebuilding

The build script (`build_glossary.py`, with the editorial core in `editorial.py`) was run from
the session scratchpad against shallow clones of the repositories named above and the atlas's
`seedData` block; it is not part of the repository. Nothing else in the repository was changed.
