# DKLA legal dictionary

`glossary.json` is the dictionary behind the atlas's search bar, the "Legal dictionary" box and the
"Terms in this entry" chips on every case page. Since 27 September 2026 it is **Cornell LII Wex and
nothing else**: the owner's compilation `../Cornell_Wex_Dictionary_2026-09-26.pdf` (1,671 pages; the
full text of 5,635 of the 5,654 Wex catalogue articles as of 26 September 2026; Cornell returned HTTP 404
for 19 pages, listed on page 2 of the PDF) parsed by `tools/r14/wex_extract.py` (page text and link
annotations) and `tools/r14/wex_dictionary.py`. Wex is CC BY-SA 4.0. The 1910 Black's, Bouvier's maxims,
the court glossaries and the editorial entries of the first build (revision 12) were removed.

Shape:

```json
{"source": "...", "built": "2026-09-27",
 "terms": [{"term": "consideration", "slug": "consideration",
            "definition": "the Wex article text (capped at 2,200 characters at a sentence boundary)",
            "source": "LII Wex", "url": "https://www.law.cornell.edu/wex/consideration",
            "liiVerified": true, "urlVerified": true, "kind": "case"?}, ...]}
```

- `term` is the Wex heading (headings that wrapped across PDF lines were rejoined using the article link).
- `url` is the article's own Cornell link from the PDF's link annotations (`urlVerified: true`, 5,513
  articles); the few headings without an annotation use the lookup URL built from the heading.
- `slug` is the path of that URL (Wex slugs keep parentheses and periods, e.g. `401(k)`).
- `kind: "case"` marks the 79 Wex articles about decided cases that the atlas does not teach and that were
  kept because the article is substantive (500 characters or more); one stub was dropped.
- Wex articles about cases the atlas **does** teach are not in the dictionary. They are in
  `wex-cases.json` (node id → term, url, text) and `tools/r14_wex_cases.py` attaches them to the case entry
  itself as a source chip and a notes paragraph, on the same footing as the other verified case sources.

Counts: 5,565 terms, all `LII Wex`.
