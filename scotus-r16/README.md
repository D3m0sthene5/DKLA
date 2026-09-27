# DKLA r16 — SCOTUS History

Open `DKLA-r16.html` next to the existing `DKLA-sources/` and `added-sources/` folders. The new SCOTUS portraits and data are embedded in the HTML; no server is required for these features. Existing source-document readers still use their original relative folders.

The build adds a SCOTUS History area, historical seat lineages, an exact-date Court viewer, source-linked case vote panels, and case-to-justice ribbons. It retains Contracts orange, Civil Procedure blue, and LRS green, with restrained translucent surfaces and a central DKLA monogram. No existing legal entry, source archive, or original graph edge is rewritten.

The historical viewer uses the Supreme Court's published oath and departure dates and an end-of-day convention. Seat names are descriptive labels from the supplied succession document, not statutory seat numbers. Abolished seats, vacancies, and transitions from associate to chief justice remain distinct. The roster is a snapshot as of September 27, 2026; future composition is not invented.

Case participation is obtained from Oyez, the Supreme Court Database, and checked opinion texts. A vote for the judgment is distinct from agreement with its reasoning. Nonparticipation does not imply a particular recusal reason. When individual sides in an evenly divided decision were not published, the record preserves that fact rather than assigning sides.

The optional ideology view uses published term-specific Martin–Quinn estimates, or numeric values supplied with a specific Oyez decision. It does not derive ideology from appointing presidents or extrapolate estimates into another term. It is available only where a source supplies the required data for the entire displayed panel.

The source material for the new layer is kept separately from the original atlas. `integrity.json` records checksums and confirms preservation of the original 24 script/data blocks. `history-data.json` contains explicit per-case and per-vote sources.

Primary reference sites: Supreme Court (supremecourt.gov), Federal Judicial Center (fjc.gov), Oyez (oyez.org), Supreme Court Database (scdb.la.psu.edu), and Martin–Quinn measures (mqscores.wustl.edu).
