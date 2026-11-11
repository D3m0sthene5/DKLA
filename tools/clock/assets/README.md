# New York clock typeface

JetBrains Mono Bold (weight 700, latin subset, WOFF2): unmodified file
`files/jetbrains-mono-latin-700-normal.woff2` from the npm package
`@fontsource/jetbrains-mono` 5.3.0 (fontsource-jetbrains-mono-5.3.0.tgz,
SHA-256 1bbea47d1387406da5b6ccc4184cc61eae6851cc0db5c1d9bbd088ea9daa0b4a),
retrieved 2026-11-11. Upstream project: https://github.com/JetBrains/JetBrainsMono.

- `jetbrains-mono-latin-700-normal.woff2`
  SHA-256 d0d4e818808f2a0ba39b2b09d1989366f63494e295f003c7ef436697378507e8
- `OFL.txt`: the package's LICENSE file, the complete SIL Open Font License 1.1
  (SHA-256 403581b69dac5cff4079205e01c6b467e56af449ecbd7247693ddb1baafa005b).

`node tools/clock/font.mjs` writes `src/features/clock/clock-font.css`, which
embeds the exact WOFF2 bytes as base64 under the family name
`DKLA JetBrains Mono`, with the full licence in its header comment, so the
clock works offline and in the portable HTML without a third-party request.
`node tools/clock/font.mjs --check` confirms both are still there. Only the
weight the clock uses (700) is embedded; the clock is the only part of the site
that names this family. No trademark asset is included.
