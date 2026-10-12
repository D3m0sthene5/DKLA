# Preserve the live v2.5 native map

The owner rejected the replacement home page. The baseline is production commit
`023e2e30ce17b3119c6c668e4bd5fe59cdcb2144`, build `v2.5-b310cfb656`.
Retain its three colored course clusters, tiles, connecting threads, native
labels, zoom transitions, case illustrations, SCOTUS precinct, authority covers,
We the People asset, notes and dictionary. No replacement home is loaded.

`native-home.js` adds only an accessible link on the existing center mark and
rendered camera metadata for verification. The authority renderer and stylesheet
are restored to the production baseline. The older gallery files are deleted.
Existing Cold Call audits, approved vapor and private analytics are retained.

## Fit evidence and decision gate

Native Home fits `scopeBox()` including the center mark, but `setCamera()`, draw
and `clampCamera()` enforce a floor/frame based on `galaxy().box`, which omits the
mark extension. The inconsistent floor enlarges the fit without recomputing its
center. Passive resizing can also trigger native automatic course selection.

Correcting framing alone can shrink tiles enough that the existing label rules
select shorter names or smaller text. An alternative moves whole native lower
sections into a row, preserving dimensions, contents and course-relative
geography. These are local comparison prototypes, not selected implementations.
Do not implement a placement tradeoff or publish to production before the owner
chooses. On a narrow phone, all current course tiles cannot remain named and
readable in one viewport while retaining their curated internal geometry;
explicitly resolve this tradeoff rather than silently hiding names.

## Permanent rendered check

`home-audit.js` measures actual SVG screen bounds, tile names, text extents,
text/section/control collisions, six authority covers and the Constitution asset.
It accepts per-tile baseline font measurements to detect reduced readability.
`home-fit.spec.mjs` checks fresh Home, resize round trips and reset at 2000×1040,
1440×900, 1366×768, 1000×700, 390×844 and 320×568, saving full-size screenshots
and JSON evidence. Run `DKLA_HOME_TEST_URL=<explicit-preview> pnpm test:home`.
The manual `Check native Atlas home` workflow runs the same suite without
deploying. The restored baseline still has known fit failures; this test must
not be described as passing until the selected fit satisfies the contract.

Full-size browser screenshots must be personally inspected before presentation.
The owner decides appearance; model critique and mechanical checks cannot
approve the visual design on the owner's behalf. Source checks preserve the
immutable r18 blocks and curated course-relative geometry, while the browser
check establishes actual rendered fit. Neither proves legal accuracy.
