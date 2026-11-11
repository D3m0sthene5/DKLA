# Embedded typefaces

## Active since 11 November 2026 (option F)

Exo 2 and Inter: unmodified WOFF2 files (latin subset) from the Fontsource npm
packages `@fontsource/exo-2` 5.3.0 and `@fontsource/inter` 5.3.0, retrieved
2026-11-11. Package tarball SHA-256:
82ef50ecfba884505fc37362224db4c453ffd81956354436aac491938dec83b5 (exo-2),
02034af8d41dcc67ac8eab88f642e129bb8a2e8922abf30229c32725f54d8fd6 (inter).
Upstream projects: https://github.com/googlefonts/Exo-2.0 and
https://github.com/rsms/inter.

| File | SHA-256 |
|---|---|
| exo-2-latin-400-normal.woff2 | 49c9cd329161f5c5feed3ae80a788199f2dce127c00828e027a61261cf602491 |
| exo-2-latin-600-normal.woff2 | fd2112e53440975a4885179f3d09058787b97b711e7e141c55fcaecaf48fbcb6 |
| inter-latin-400-normal.woff2 | 8909904ab6c872eb994093482a88a28eca2cd95912d7b6fecd72103b0dc07edc |
| inter-latin-500-normal.woff2 | f3779f1efccc4bdcdf9c0a02ab95bf6bd092ed09c48c08cedc725889edd1d19f |
| inter-latin-600-normal.woff2 | f9a06e79cd3a2a20951c0f0e28f66dd0e6d3fda73911d640a2125c8fcb78f21a |
| inter-latin-700-normal.woff2 | 6f56409fd3d64bb85f7d070bce20749db2d66b6d63cec586cc22d1c761be2491 |

Both are licensed under the SIL Open Font License 1.1. The package licence
files, with each project's copyright line, are Exo2-OFL.txt and Inter-OFL.txt;
both are embedded in full in src/features/v26/release-font.css, which
`node tools/v26/embed-fonts.mjs` writes from these files (only the weights the
site uses). tools/verify/data_guard.py checks that every file is embedded
byte for byte and both licences are present. No trademark asset is included.

## Earlier, kept as history (not embedded)

Orbitron variable font: unmodified upstream TTF from
https://github.com/google/fonts/tree/main/ofl/orbitron, retrieved 2026-10-13.
SHA-256: f42db2dd16e642258e35782916eceb1dcdbea06fb958d77ad71dc5963587e8fd.
Its complete SIL Open Font License is in OFL.txt. From 13 October to
11 November 2026 release-font.css embedded these exact TTF bytes as the
display font; option F replaced it with Exo 2.

Space Grotesk variable font: unmodified upstream TTF from
https://github.com/google/fonts/tree/main/ofl/spacegrotesk, retrieved 2026-10-13.
SHA-256: acad6de1fc93436f5c0f1f4137751ef04f1aea3063e7036535970ffcfbd79f72.
Its complete license is SpaceGrotesk-OFL.txt; typography-font.css retains an older
licensed wrapper locally. The owner selected Orbitron plus original readable
system sans, so Space Grotesk and that wrapper are inactive and excluded from
publication. They remain local provenance.
