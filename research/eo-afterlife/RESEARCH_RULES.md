# Standing rules for the Executive Orders research (owner's instructions)

## Never give up on a blocked source (2026-10-16)

When the American Presidency Project, Cornell LII, uscode.house.gov or any
other legal source is blocked, errors, rate-limits or returns a bot page, do
not stop and do not just report it. Keep trying with increasingly creative
methods, and log each attempt:

1. Retry; other URL forms (www/bare host, APP `/node/<id>`, print views); a
   browser-like User-Agent.
2. Other tools: curl, WebFetch, the pre-installed headless Chromium
   (Playwright).
3. Archived copies: Wayback Machine (CDX API, `id_` URLs for original bytes),
   archive.today.
4. Other official copies of the same text: govinfo (Federal Register,
   Statutes at Large, U.S. Code editions, CFR), federalregister.gov API,
   NARA, Library of Congress, presidential libraries, GPO bulk XML.
5. Reputable mirrors: Justia, CourtListener, Wikisource, archive.org full
   text, Google Books, HathiTrust, GitHub mirrors of official XML.
6. WebSearch to find further copies, then fetch the document itself.

Grade every copy honestly by what it is (archived copy, hosted transcript,
official publication). Do not defeat logins, paywalls or CAPTCHAs, and do not
route traffic through paid services on the owner's accounts. If the
session's own network policy blocks every host, tell the owner which setting
to change (the gear icon next to the environment name, then Network access).
