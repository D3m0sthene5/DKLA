/* Dottie Docket, the opossum behind Ask Dottie.
 *
 * Every pose is drawn here as a small inline SVG, so the artwork costs no
 * request, works offline and scales on any screen. The sprite sheet in
 * docs/ask-mascot/ is generated from this file (tools/ask/dottie-sheet.mjs).
 *
 * ask.js picks a pose at random from the pool for each state, never the same
 * one twice running (the pools are in ask.js):
 *   face        the Ask Dottie launcher in Atlas search
 *   empty dialog   curious, bookmark (0 to 3 joeys), hanging, carrying
 *   researching    the spinner: three opossums running laps nose to tail round her
 *                  question-mark tail (spinner() and RUN: a rig, not a pose)
 *   answer         carrying or bookmark, one joey per cited source (1 to 3)
 *   no answer, offline, busy, unavailable, failed   possum: she plays dead
 */
(() => {
  'use strict';
  const C = {
    fur: '#c9cfcc',
    shade: '#9ba5a1',
    cap: '#adb6b2',
    face: '#f6f2e9',
    ear: '#4b5856',
    pink: '#eba3ab',
    nose: '#f08f9e',
    eye: '#121a19',
    leg: '#727f7c',
    legFar: '#5f6b68',
    legNear: '#8c9895',
    pawFar: '#b98790',
    track: '#38524b',
    tail: '#ecc9c3',
    mint: '#a6e0c8',
    paper: '#f0e7d0',
    folder: '#d9b877',
  };

  // An open eye in a group, and after it the same eye shut (a flat ellipse, invisible until a blink).
  // A blink fades one into the other (ask.css) by fill-opacity alone: scaling a shape inside an
  // SVG, or changing a group's opacity, makes the browser lay the page out again.
  const eye = (x, y, r = 2.1) =>
    `<g class="dottie-eye"><circle cx="${x}" cy="${y}" r="${r}" fill="${C.eye}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.34}" fill="#fff"/></g>` +
    `<ellipse class="dottie-lid" cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.1}" fill="${C.eye}" fill-opacity="0"/>`;

  // Front-facing head for the launcher (32 x 32).
  function face() {
    return `
      <circle cx="8" cy="8.8" r="5.2" fill="${C.ear}"/><path d="M3.6 6.6a5.2 5.2 0 0 1 7.6-2" fill="none" stroke="${C.face}" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>
      <circle cx="24" cy="8.8" r="5.2" fill="${C.ear}"/><path d="M28.4 6.6a5.2 5.2 0 0 0-7.6-2" fill="none" stroke="${C.face}" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>
      <path d="M16 30.8c-2.6 0-10.4-9.4-10.4-15.2C5.6 10.2 10.2 7 16 7s10.4 3.2 10.4 8.6c0 5.8-7.8 15.2-10.4 15.2Z" fill="${C.face}"/>
      <path d="M9.6 9.4C12 7.2 20 7.2 22.4 9.4 20 10.4 17.8 12.4 16 16 14.2 12.4 12 10.4 9.6 9.4Z" fill="${C.cap}"/>
      ${eye(11.9, 16.4, 1.9)}
      ${eye(20.1, 16.4, 1.9)}
      <ellipse cx="16" cy="28.2" rx="2.3" ry="1.7" fill="${C.nose}"/>
      <path d="M13.4 25 8 23.6M13.6 26.2 8.4 27M18.6 25l5.4-1.4M18.4 26.2l5.2.8" stroke="${C.shade}" stroke-width=".6" stroke-linecap="round"/>`;
  }

  // Side-view parts, facing right, in a 120 x 90 box.
  const legs = (lift = 0) => `
    <path d="M40 70l-2 10" stroke="${C.leg}" stroke-width="6" stroke-linecap="round"/>
    <path d="M50 72l1 9" stroke="${C.leg}" stroke-width="5.5" stroke-linecap="round" opacity=".8"/>
    <path d="M77 69l${1 + lift} ${11 - lift}" stroke="${C.leg}" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M69 71l-1 10" stroke="${C.leg}" stroke-width="5" stroke-linecap="round" opacity=".8"/>
    <ellipse cx="37.6" cy="81.6" rx="3.6" ry="1.8" fill="${C.pink}"/>
    <ellipse cx="${78.6 + lift}" cy="${81.6 - lift}" rx="3.4" ry="1.7" fill="${C.pink}"/>`;

  const body = `
    <path d="M29 68C23 55 33 40 53 37.6 69 35.7 82 41 86.4 53.4c3.2 9.8-1.8 18-12.4 19.6l-34 1.4c-5 0-8.6-2.4-11-6.4Z" fill="${C.fur}"/>
    <path d="M38 47c4-3 8-4.4 13-5M44 55c3-2 6-3 10-3.4M60 45c4-.8 8 0 11 1.6M33 60c2-2 4.4-3 7-3.4" fill="none" stroke="${C.shade}" stroke-width="1.6" stroke-linecap="round"/>`;

  // The tail. "?" curls it over the back like a question mark; "flat" lets it drop.
  const tails = {
    '?': 'M31 66C21 63 16.8 52 19.4 42 22.6 29 37 21 49 25.4c10.4 3.8 10 17.6.2 19.6',
    hook: 'M31 66C20 64 15 54 17 44 19.4 32 31 25.6 41 28c8.2 2 8.6 12.4 1.6 14',
    flat: 'M31 68C22 69 13 70 6 74c-3 1.8-4 4.4-1.6 5.4',
  };
  function tail(shape) {
    const d = tails[shape];
    return `<path d="${d}" fill="none" stroke="${C.tail}" stroke-width="4.6" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="${C.leg}" stroke-width="5" stroke-linecap="round" stroke-dasharray="9 999"/>`;
  }

  // Head facing right. tilt rotates it about the neck; look sets the eye.
  function head({ tilt = 0, eyes = 'open', dx = 0, dy = 0 } = {}) {
    const eyeMark =
      eyes === 'open'
        ? eye(97, 41.6)
        : eyes === 'bright'
          ? eye(97, 41.4, 2.5)
          : eyes === 'down'
            ? `<circle cx="96.8" cy="43" r="1.7" fill="${C.eye}"/><path d="M94.2 41.2q2.6-1 5.2 0" fill="none" stroke="${C.shade}" stroke-width="1.3" stroke-linecap="round"/>`
            : eyes === 'focus'
              ? `<circle cx="97.6" cy="42.4" r="1.9" fill="${C.eye}"/><path d="M94.6 41.2q3-1.6 6 0" fill="${C.cap}" stroke="${C.cap}" stroke-width="1.6" stroke-linecap="round"/>`
              : `<path d="M94.4 41.8q2.6-2.2 5.2 0" fill="none" stroke="${C.eye}" stroke-width="1.6" stroke-linecap="round"/>`;
    return `<g transform="translate(${dx} ${dy}) rotate(${tilt} 82 50)">
      <circle cx="84.4" cy="34" r="6" fill="${C.ear}"/>
      <circle cx="92" cy="31.2" r="6.2" fill="${C.ear}"/><path d="M86.6 28.6a6.2 6.2 0 0 1 9.8-1.8" fill="none" stroke="${C.face}" stroke-width="1.2" stroke-linecap="round" opacity=".75"/><circle cx="92.6" cy="32" r="3" fill="${C.pink}" opacity=".55"/>
      <path d="M77.4 45.4C78.6 34.4 89.6 29.6 98.4 33.4c5.8 2.6 10 8.4 15 13.2 2 2 1.2 5-1.8 5.2-7.6.6-15.4 2.6-23.4 1.8-6.6-.6-11.2-3.4-10.8-8.2Z" fill="${C.face}"/>
      <path d="M79.6 40.4C82.4 33.2 91.6 30.8 98.4 33.4c-4 2.2-7.6 5.6-9.6 10.4-3.4-1.6-6.4-2.8-9.2-3.4Z" fill="${C.cap}"/>
      ${eyeMark}
      <ellipse cx="113.2" cy="49.4" rx="2.8" ry="2.3" fill="${C.nose}"/>
      <path d="M106 50.6l-6 3.2M106.4 52l-5 4.6" stroke="${C.shade}" stroke-width=".8" stroke-linecap="round"/>
    </g>`;
  }

  // A joey clinging to her back. Each carries data-joey so a hovered source can wake it.
  function joey(i, x, y, s = 1) {
    return `<g class="dottie-joey" data-joey="${i}" transform="translate(${x} ${y}) scale(${s})"><g class="dottie-joey-body">
      <path d="M-11 4C-12-3-6-8 1-8c6 0 10 3 10.6 7.6L9 6.6-7 7.4C-9.4 7.4-10.6 6-11 4Z" fill="${C.shade}"/>
      <path d="M-11 4c-4 0-6.6-2-6.6-5" fill="none" stroke="${C.tail}" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="5.6" cy="-9.6" r="3" fill="${C.ear}"/><circle cx="5.8" cy="-9.4" r="1.6" fill="${C.pink}"/>
      <path d="M3-3.6C3.4-8.6 8.4-10.8 12.4-9c2.6 1.2 4.4 3.8 6.8 6 .9.9.5 2.3-.9 2.4-3.4.3-7 1.1-10.6.8C4.6-.1 2.8-1.4 3-3.6Z" fill="${C.face}"/>
      <circle cx="11.6" cy="-5.2" r="1.2" fill="${C.eye}"/>
      <circle cx="19.2" cy="-1.6" r="1.4" fill="${C.nose}"/>
      <path d="M-2 6.4l-1.6 2.4M6 6l1.6 2.6" stroke="${C.leg}" stroke-width="2.2" stroke-linecap="round"/>
    </g></g>`;
  }

  // One, two or three joeys at the given spots, each [x, y, scale].
  const brood = (n, sets) =>
    (sets[Math.max(0, Math.min(3, n)) - 1] || []).map(([x, y, s], i) => joey(i + 1, x, y, s)).join('');

  // Opossum hanging by her tail; the tail loop sits at the top centre (46, 11).
  const dangling = () => `
        <path d="M46 34C46 24 44 16 46 11c1.6-4 7.4-4 7.4 0s-4.4 5.4-7.4 3" fill="none" stroke="${C.tail}" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M46 34C46 24 44 16 46 11" fill="none" stroke="${C.leg}" stroke-width="4.6" stroke-linecap="round" stroke-dasharray="8 999"/>
        <path d="M35 38l-9 7M57 38l9 7M37 70l-7 9M55 70l7 9" stroke="${C.leg}" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="24.6" cy="46" rx="3" ry="2" fill="${C.pink}"/><ellipse cx="67.4" cy="46" rx="3" ry="2" fill="${C.pink}"/>
        <ellipse cx="29" cy="80.4" rx="2.8" ry="2" fill="${C.pink}"/><ellipse cx="63" cy="80.4" rx="2.8" ry="2" fill="${C.pink}"/>
        <path d="M46 30c11 0 17 9 17 22s-6 24-17 24-17-10-17-24 6-22 17-22Z" fill="${C.fur}"/>
        <path d="M38 44c3-2 6-2.6 9-2.4M40 56c3-1.4 6-1.6 9-1M52 46c2 0 4 .8 5.6 2" fill="none" stroke="${C.shade}" stroke-width="1.5" stroke-linecap="round"/>
        <g transform="translate(46 72) rotate(90) translate(-80 -46)">${head({ eyes: 'bright' })}</g>`;

  const sparkle = (x, y, r) =>
    `<path class="dottie-spark" d="M${x} ${y - r}q.9 ${r - 0.9} ${r} ${r}q${-(r - 0.9)} .9 ${-r} ${r}q-.9 ${-(r - 0.9)} ${-r} ${-r}q${r - 0.9} -.9 ${r} ${-r}Z" fill="${C.mint}"/>`;

  const poses = {
    face: { box: '0 0 32 32', draw: face },
    curious: {
      box: '0 4 120 86',
      draw: () => `${tail('?')}${legs()}${body}${head({ tilt: -12, dy: -1 })}${sparkle(111, 16, 7)}`,
    },
    reading: {
      box: '0 4 128 86',
      draw: () => `${tail('hook')}${legs()}${body}${head({ tilt: 18, eyes: 'focus', dx: -2, dy: 4 })}
        <path d="M86 84.4l14-4.4 14 4.4V75l-14-4-14 4Z" fill="${C.paper}"/>
        <path d="M100 71v9" stroke="${C.shade}" stroke-width="1"/>
        <path d="M89 76.6l8-2.2M89 79.4l8-2.2M103 74.4l8 2.2M103 77.2l8 2.2" stroke="${C.shade}" stroke-width=".9" stroke-linecap="round"/>
        <g class="dottie-glass"><circle cx="110" cy="66" r="7.4" fill="${C.mint}" fill-opacity=".22" stroke="${C.mint}" stroke-width="2.6"/>
        <path d="M115.4 71.4l6 6" stroke="${C.leg}" stroke-width="3.6" stroke-linecap="round"/></g>`,
    },
    carrying: {
      box: '0 16 124 74',
      draw: (joeys = 3) => {
        const spots = [
          [[56, 35, 0.95]],
          [
            [45, 38, 0.88],
            [62, 35, 0.92],
          ],
          [
            [37, 43, 0.8],
            [52, 36, 0.88],
            [67, 37, 0.84],
          ],
        ];
        return `${tail('?')}${legs(1)}${body}${brood(Math.max(1, joeys), spots)}${head({ tilt: -4, eyes: 'bright' })}`;
      },
    },
    // Sitting up, holding a mint bookmark; joeys ride down her back.
    bookmark: {
      box: '0 6 100 90',
      draw: (joeys = 0) => `
        <path d="M34 86C22 89 10 86 8 76c-1.6-8 5-13 11.4-10.4 4.6 1.8 4.4 8-.2 8.8" fill="none" stroke="${C.tail}" stroke-width="4.6" stroke-linecap="round"/>
        <path d="M42 80l-2 7M56 82l1 6" stroke="${C.leg}" stroke-width="6" stroke-linecap="round"/>
        <path d="M30 86C24 70 27 50 40 41 52 33 66 39 69 54c2.6 13-1 27-10 33Z" fill="${C.fur}"/>
        <path d="M54 47c8 3 12 13 11 24-1 7-3.6 12-7 14-3-12-5-25-4-38Z" fill="#dfe3e0"/>
        <path d="M34 60c2-4 5-6 9-7M33 72c2-3 4-4 7-5M39 49c3-2 6-3 9-3" fill="none" stroke="${C.shade}" stroke-width="1.6" stroke-linecap="round"/>
        <ellipse cx="40" cy="88.4" rx="5.2" ry="2.2" fill="${C.pink}"/><ellipse cx="58" cy="89" rx="4.6" ry="2" fill="${C.pink}"/>
        ${brood(joeys, [
          [[37, 47, 0.8]],
          [
            [37, 46, 0.8],
            [30, 61, 0.76],
          ],
          [
            [40, 43, 0.74],
            [32, 56, 0.74],
            [27, 70, 0.7],
          ],
        ])}
        ${head({ tilt: -6, dx: -30, dy: -14 })}
        <path d="M82 40h9v32l-4.5-4L82 72Z" fill="${C.mint}"/><path d="M84.4 44h4.2" stroke="#7fbfa6" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M64 52q9 1 18-1M63 59q9 2 18 0" fill="none" stroke="${C.leg}" stroke-width="4.6" stroke-linecap="round"/>
        <circle cx="82.6" cy="50.6" r="2.6" fill="${C.pink}"/><circle cx="82" cy="58.8" r="2.6" fill="${C.pink}"/>`,
    },
    // Hanging upside down by her tail from a twig, as opossums are said to.
    hanging: {
      box: '0 0 92 112',
      draw: () => `
        <path d="M6 8h80" stroke="#b8975c" stroke-width="4" stroke-linecap="round"/>
        <path d="M70 8q6-8 15-6-4 8-15 6Z" fill="${C.mint}" opacity=".85"/>
        ${dangling()}`,
    },
    // The same, without the twig: the Ask Dottie button's top edge is her branch.
    dangle: { box: '19 3 54 108', draw: () => dangling() },
    // Dashing back with a book in her mouth: fetching a source.
    fetching: {
      box: '0 14 134 72',
      draw: () => `
        <path d="M10 30h12M3 40h11M12 68h10" stroke="${C.mint}" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>
        <path d="M31 56C21 50 13 50 5 44c-2-2-2-5 1-6" fill="none" stroke="${C.tail}" stroke-width="4.6" stroke-linecap="round"/>
        <path d="M31 56C27 53.6 24 52.4 21 51.6" fill="none" stroke="${C.leg}" stroke-width="5" stroke-linecap="round"/>
        <path d="M74 63l9 9M46 64l-8 9" stroke="${C.leg}" stroke-width="5" stroke-linecap="round" opacity=".8"/>
        <path d="M80 62l14 7M38 62l-14 6" stroke="${C.leg}" stroke-width="5.6" stroke-linecap="round"/>
        <ellipse cx="95.6" cy="69.8" rx="3.4" ry="1.8" fill="${C.pink}"/><ellipse cx="22.4" cy="68.6" rx="3.4" ry="1.8" fill="${C.pink}"/>
        <path d="M28 58C26 47 38 39 56 38c18-1 30 5 32 15 1.6 8-6 13-18 13l-30 .6C33 67 29 64 28 58Z" fill="${C.fur}"/>
        <path d="M40 47c4-2.4 8-3.4 13-3.6M47 55c3-1.6 6-2.2 10-2.4M64 45c4 0 7 1 10 2.6" fill="none" stroke="${C.shade}" stroke-width="1.6" stroke-linecap="round"/>
        ${head({ tilt: 4, eyes: 'bright', dy: -2 })}
        <g transform="rotate(-12 116 52)"><rect x="106" y="47" width="20" height="13" rx="1.6" fill="${C.folder}"/><path d="M108 49.4h16v8.4h-16Z" fill="${C.paper}"/><path d="M116 49.4v8.4" stroke="#c39c55" stroke-width="1"/></g>`,
    },
    rummaging: {
      box: '0 4 128 86',
      draw: () => `${tail('flat')}${legs()}${body}${head({ tilt: 24, eyes: 'down', dx: -4, dy: 6 })}
        <path d="M88 84h30l-3-12H91Z" fill="${C.folder}"/>
        <path d="M88 84l5-15h27l-5 15Z" fill="#e7cb92"/>
        <path d="M95 76.4h16" stroke="#c39c55" stroke-width="1" stroke-dasharray="2 2" stroke-linecap="round"/>`,
    },
    possum: {
      box: '0 18 124 72',
      draw: () => `
        <path d="M30 70C20 73 11 74 5 79" fill="none" stroke="${C.tail}" stroke-width="4.6" stroke-linecap="round"/>
        <path d="M44 60l-4-14M54 61l2-15M70 60l-2-15M80 59l4-13" stroke="${C.leg}" stroke-width="5.2" stroke-linecap="round"/>
        <ellipse cx="39.6" cy="44.4" rx="3.2" ry="1.8" fill="${C.pink}"/><ellipse cx="84.4" cy="44.4" rx="3.2" ry="1.8" fill="${C.pink}"/>
        <path d="M28 72c0-9 12-15 32-15s30 5 30 13c0 7-8 10-30 10S28 79 28 72Z" fill="${C.fur}"/>
        <path d="M40 65c6-2 12-3 18-3M64 63c5 0 9 1 13 2.4" fill="none" stroke="${C.shade}" stroke-width="1.5" stroke-linecap="round"/>
        <g transform="translate(0 140) scale(1 -1)">
          <circle cx="92" cy="61" r="5.6" fill="${C.ear}"/>
          <path d="M84 70c1-9 10-13 18-10 5 2 9 7 14 11 1.8 1.8 1 4.4-1.6 4.6-6.6.6-13.4 2.2-20.4 1.6C87 77.4 83.6 74.6 84 70Z" fill="${C.face}"/>
          <path d="M98 69.6q2.6 1.8 5.2 0" fill="none" stroke="${C.eye}" stroke-width="1.5" stroke-linecap="round"/>
          <ellipse cx="116" cy="73" rx="2.4" ry="2" fill="${C.nose}"/>
          <path d="M110 76.4c.4 2.6 2.4 3.6 3.8 2" fill="${C.pink}"/>
        </g>
        <text x="106" y="40" fill="${C.mint}" font-size="11" font-family="inherit" font-weight="700">z</text>
        <text x="114" y="31" fill="${C.mint}" font-size="8" font-family="inherit" font-weight="700" opacity=".7">z</text>`,
    },
  };

  // Returns an <svg> string. Decorative: callers mark it aria-hidden.
  function svg(pose, option) {
    const p = poses[pose];
    return `<svg class="dottie dottie-${pose}" viewBox="${p.box}" focusable="false" aria-hidden="true">${p.draw(option)}</svg>`;
  }

  /* run-cycle:begin */
  // Generated by tools/ask/run-cycle.mjs from the rig and the gait described there. Do not edit
  // by hand: change the generator and run it. prettier-ignore keeps the table on long lines.
  // prettier-ignore
  const RUN = {
    ms: 500, keys: 24, strides: 10, ground: 46.5, size: 1,
    feet: {fh:[12,9],ff:[1,9],nh:[0,9],nf:[13,9]},
    parts: [
      { id: 'fhLower', box: [-3,-9.6,6,12.2], art: '<path d="M-1.19 0.12A1.2 1.2 0 0 0 1.19 0.12L1.89 -6.6A1.9 1.9 0 1 0 -1.89 -6.6Z" fill="{legFar}"/>', still: [12.45,45.2,25.92], k: [22.107,40.948,70.72,21.393,39.907,83.33,20.367,39.177,93.07,19.032,38.882,96.5,17.406,39.053,89.32,15.571,39.643,73.17,13.723,40.649,57.02,11.97,41.918,43.48,10.448,43.243,31.34,9.32,44.405,19.86,8.719,45.063,10.21,8.765,45.22,3.84,9.7,45.2,9.18,11.2,45.2,19.39,12.7,45.2,28.42,14.2,45.2,35.99,15.7,45.2,41.36,17.2,45.2,43.84,18.65,45.102,44.77,19.812,44.607,48.01,20.665,44.015,50.91,21.755,43.76,48.98,22.535,43.18,50.24,22.547,42.126,58.54] },
      { id: 'fhPaw', box: [-6,-4.2,9.2,5.2], art: '<path d="M-4.3 0C-4.8-2.2-2.2-3.1-.4-2.6 1.3-2.2 2.4-1.2 1.9 0Z" fill="{pawFar}"/>', still: [8.645,46.5,0], k: [20.151,43.925,40,19.08,42.767,35.87,17.561,41.828,29.59,15.723,41.251,22.3,13.692,41.107,15.16,11.597,41.395,8.9,9.567,42.052,2.13,7.728,42.964,-4.5,6.209,43.989,-9.89,5.139,44.976,-13,4.644,45.788,-10.34,4.853,46.317,-3.73,5.895,46.5,0,7.395,46.5,0,8.895,46.5,0,10.395,46.5,0,11.895,46.5,0,13.395,46.5,0,14.895,46.5,1.82,16.395,46.5,11.54,17.895,46.5,25,19.395,46.5,32,20.436,46.059,36.44,20.645,45.104,40] },
      { id: 'fhUpper', box: [-3.6,-3.6,7.2,12.9], art: '<path d="M-2.39 0.19A2.4 2.4 0 1 1 2.39 0.19L1.89 6.35A1.9 1.9 0 0 1 -1.89 6.35Z" fill="{legFar}"/>', still: [13.134,33.886,-33.68], k: [12.776,33.032,-0.54,13.003,33.561,-9.04,13.289,34.164,-17.52,13.573,34.664,-28.45,13.793,34.886,-44.3,13.851,34.763,-60.1,13.692,34.474,-66.46,13.399,34.196,-64.59,13.011,33.876,-57.14,12.597,33.528,-46.26,12.34,33.188,-35.79,12.514,32.88,-28.6,12.776,33.032,-30.52,13.003,33.561,-34.1,13.289,34.164,-35.94,13.573,34.664,-35.06,13.793,34.886,-30.6,13.851,34.763,-22.25,13.692,34.474,-12.01,13.399,34.196,-5.07,13.011,33.876,0.56,12.597,33.528,11.06,12.34,33.188,16.19,12.514,32.88,9.37] },
      { id: 'ffLower', box: [-3,-9.8,6,12.4], art: '<path d="M-1.19 0.12A1.2 1.2 0 0 0 1.19 0.12L1.89 -6.71A1.9 1.9 0 1 0 -1.89 -6.71Z" fill="{legFar}"/>', still: [-9.796,45.209,-3.64], k: [-21.98,45.169,-29.85,-21.046,45.209,-37.86,-19.546,45.209,-43.57,-18.046,45.209,-45.81,-16.546,45.209,-43.23,-15.046,45.209,-36.35,-13.546,45.209,-27.77,-12.091,45.143,-19.3,-10.869,44.813,-12.26,-9.858,44.42,-5.98,-8.653,44.25,3.97,-7.818,43.673,10.34,-7.762,42.574,2.58,-8.226,41.304,-5.38,-9.05,40.131,-9.26,-10.22,39.252,-10.31,-11.686,38.809,-14.3,-13.397,38.858,-31.12,-15.263,39.375,-53.47,-17.106,40.339,-63.66,-18.829,41.596,-62.11,-20.315,42.937,-54.02,-21.413,44.138,-42.14,-22.014,44.89,-29.73] },
      { id: 'ffPaw', box: [-5.2,-4,8.2,5], art: '<path d="M-3.5 0C-4-2.1-1.8-2.9-.3-2.5 1.2-2.1 2.2-1.1 1.7 0Z" fill="{pawFar}"/>', still: [-12.713,46.5,0], k: [-25.004,46.304,-3.73,-23.963,46.5,0,-22.463,46.5,0,-20.963,46.5,0,-19.463,46.5,0,-17.963,46.5,0,-16.463,46.5,0,-14.963,46.5,1.59,-13.463,46.5,10.1,-11.963,46.5,21.88,-10.463,46.5,28,-9.421,46.026,32.33,-9.212,45,35.76,-9.707,43.735,36,-10.777,42.49,32.62,-12.296,41.482,27.36,-14.135,40.862,21.14,-16.165,40.707,14.87,-18.26,41.017,9.07,-20.291,41.723,2.42,-22.129,42.702,-4.28,-23.648,43.803,-9.82,-24.719,44.863,-13,-25.213,45.735,-10.34] },
      { id: 'ffUpper', box: [-3.6,-3.6,7.2,12.5], art: '<path d="M-2.39 0.21A2.4 2.4 0 1 1 2.39 0.21L1.89 5.96A1.9 1.9 0 0 1 -1.89 5.96Z" fill="{legFar}"/>', still: [-16.24,34.684,54.75], k: [-17.195,33.537,1.53,-16.825,34.312,12.92,-16.352,35.182,25.62,-15.926,35.891,36.49,-15.697,36.174,45.4,-15.648,35.954,50.97,-15.668,35.505,53.47,-15.769,35.084,55.06,-15.972,34.602,56.66,-16.21,34.097,57.09,-16.544,33.621,53.41,-17.11,33.248,54.69,-17.195,33.537,72.82,-16.825,34.312,93.57,-16.352,35.182,113.07,-15.926,35.891,129.79,-15.697,36.174,137.11,-15.648,35.954,123.11,-15.668,35.505,92.74,-15.769,35.084,66.33,-15.972,34.602,46.09,-16.21,34.097,28.71,-16.544,33.621,12.95,-17.11,33.248,0.83] },
      { id: 'tail3', box: [-7.5,-6.5,10,9], art: '<path d="M0,-1.2L-0.8,-1.21L-1.6,-1.36L-2.38,-1.64L-3.1,-2.05L-3.75,-2.59L-4.31,-3.24A0.85 0.85 0 0 0 -5.75,-2.34L-5.11,-1.38L-4.31,-0.54L-3.37,0.15L-2.32,0.69L-1.19,1.04L0,1.2A1.2 1.2 0 0 0 0,-1.2Z" fill="{tail}"/>', still: [43.326,39.368,-3.33], k: [41.949,40.307,-9.44,42.002,40.802,-14.79,42.589,40.843,-17.7,43.507,40.299,-16.5,44.359,39.407,-12.15,44.833,38.494,-3.13,44.778,37.928,6.43,44.36,37.869,13.19,43.764,38.121,15.49,43.049,38.5,12.79,42.409,38.951,6.17,42.175,39.57,-2.32,41.949,40.307,-9.44,42.002,40.802,-14.79,42.589,40.843,-17.7,43.507,40.299,-16.5,44.359,39.407,-12.15,44.833,38.494,-3.13,44.778,37.928,6.43,44.36,37.869,13.19,43.764,38.121,15.49,43.049,38.5,12.79,42.409,38.951,6.17,42.175,39.57,-2.32] },
      { id: 'tail2', box: [-9.5,-6,12.5,8.5], art: '<path d="M0,-1.55L-1.04,-1.54L-2.07,-1.61L-3.1,-1.78L-4.12,-2.04L-5.12,-2.39L-6.08,-2.83A1.2 1.2 0 0 0 -7.28,-0.75L-6.18,-0.11L-5.02,0.43L-3.82,0.87L-2.57,1.21L-1.3,1.44L0,1.55A1.55 1.55 0 0 0 0,-1.55Z" fill="{tail}"/>', still: [33.309,37.768,-23.31], k: [32.534,37.664,-32.67,32.775,38.019,-34.01,33.293,38.22,-32.55,33.839,38.283,-27.04,34.284,38.191,-20.04,34.477,37.954,-14.28,34.288,37.741,-11.3,33.849,37.638,-11.65,33.305,37.509,-14.83,32.723,37.36,-19.28,32.297,37.286,-23.81,32.395,37.348,-28.76,32.534,37.664,-32.67,32.775,38.019,-34.01,33.293,38.22,-32.55,33.839,38.283,-27.04,34.284,38.191,-20.04,34.477,37.954,-14.28,34.288,37.741,-11.3,33.849,37.638,-11.65,33.305,37.509,-14.83,32.723,37.36,-19.28,32.297,37.286,-23.81,32.395,37.348,-28.76] },
      { id: 'tail1', box: [-10.5,-6,14,9], art: '<path d="M0,-1.9L-1.14,-1.88L-2.28,-1.94L-3.41,-2.08L-4.54,-2.3L-5.66,-2.61L-6.75,-2.98A1.55 1.55 0 0 0 -8.01,-0.15L-6.76,0.42L-5.46,0.9L-4.13,1.29L-2.77,1.59L-1.39,1.79L0,1.9A1.9 1.9 0 0 0 0,-1.9Z" fill="{tail}"/><path d="M0,-2L-0.39,-2L-0.77,-2L-1.16,-2.02L-1.54,-2.04L-1.93,-2.07L-2.31,-2.12A1.95 1.95 0 0 0 -2.87,1.74L-2.39,1.82L-1.92,1.87L-1.44,1.92L-0.96,1.96L-0.48,1.99L0,2A2 2 0 0 0 0,-2Z" fill="{leg}"/>', still: [22.866,33.97,-36.87], k: [22.658,33.208,-43.11,22.855,33.706,-41.77,23.102,34.271,-38.33,23.355,34.746,-34.59,23.569,34.975,-31.75,23.619,34.864,-30.63,23.419,34.557,-31.41,23.076,34.25,-33.17,22.641,33.905,-35.07,22.186,33.529,-37.1,21.951,33.204,-39.43,22.307,33.013,-41.87,22.658,33.208,-43.11,22.855,33.706,-41.77,23.102,34.271,-38.33,23.355,34.746,-34.59,23.569,34.975,-31.75,23.619,34.864,-30.63,23.419,34.557,-31.41,23.076,34.25,-33.17,22.641,33.905,-35.07,22.186,33.529,-37.1,21.951,33.204,-39.43,22.307,33.013,-41.87] },
      { id: 'nhLower', box: [-3,-9.6,6,12.2], art: '<path d="M-1.19 0.12A1.2 1.2 0 0 0 1.19 0.12L1.89 -6.6A1.9 1.9 0 1 0 -1.89 -6.6Z" fill="{legNear}"/>', still: [22.362,45.2,47.77], k: [12.112,45.2,18.28,13.612,45.2,26.62,15.112,45.2,34.71,16.612,45.2,41.96,18.112,45.2,47.51,19.612,45.2,50.62,21.062,45.102,52.34,22.224,44.607,55.92,23.077,44.015,59.01,24.167,43.76,57.76,24.947,43.18,59.15,24.959,42.126,66.62,24.519,40.948,78.22,23.805,39.907,90.86,22.779,39.177,101.15,21.444,38.882,105.3,19.818,39.053,97.74,17.983,39.643,79.12,16.135,40.649,61.21,14.381,41.918,47.41,12.859,43.243,35.94,11.732,44.405,25.98,11.131,45.063,18.59,11.176,45.22,14.46] },
      { id: 'nhPaw', box: [-6,-4.2,9.2,5.2], art: '<path d="M-4.3 0C-4.8-2.2-2.2-3.1-.4-2.6 1.3-2.2 2.4-1.2 1.9 0Z" fill="{pink}"/>', still: [18.556,46.5,0], k: [8.306,46.5,0,9.806,46.5,0,11.306,46.5,0,12.806,46.5,0,14.306,46.5,0,15.806,46.5,0,17.306,46.5,1.82,18.806,46.5,11.54,20.306,46.5,25,21.806,46.5,32,22.848,46.059,36.44,23.057,45.104,40,22.562,43.925,40,21.492,42.767,35.87,19.973,41.828,29.59,18.134,41.251,22.3,16.104,41.107,15.16,14.009,41.395,8.9,11.978,42.052,2.13,10.14,42.964,-4.5,8.621,43.989,-9.89,7.55,44.976,-13,7.056,45.788,-10.34,7.265,46.317,-3.73] },
      { id: 'nhUpper', box: [-3.6,-3.6,7.2,12.9], art: '<path d="M-2.39 0.19A2.4 2.4 0 1 1 2.39 0.19L1.89 6.35A1.9 1.9 0 0 1 -1.89 6.35Z" fill="{legNear}"/>', still: [15.356,34.74,-0.39], k: [14.993,33.916,-41.12,15.249,34.423,-42.18,15.562,35.001,-42.42,15.866,35.481,-40.46,16.095,35.698,-35.29,16.141,35.582,-26.55,15.949,35.306,-16.04,15.62,35.04,-8.38,15.195,34.734,-2.02,14.743,34.398,8.32,14.469,34.071,13.79,14.685,33.773,8.26,14.993,33.916,-0.17,15.249,34.423,-7.14,15.562,35.001,-14.31,15.866,35.481,-24.54,16.095,35.698,-41.76,16.141,35.582,-61.35,15.949,35.306,-70.33,15.62,35.04,-69.62,15.195,34.734,-63.04,14.743,34.398,-53.54,14.469,34.071,-45.38,14.685,33.773,-40.9] },
      { id: 'nfLower', box: [-3,-9.8,6,12.4], art: '<path d="M-1.19 0.12A1.2 1.2 0 0 0 1.19 0.12L1.89 -6.71A1.9 1.9 0 1 0 -1.89 -6.71Z" fill="{legNear}"/>', still: [-15.42,45.209,-36.9], k: [-5.386,42.574,0.73,-5.85,41.304,-6.66,-6.674,40.131,-10.31,-7.844,39.252,-11.35,-9.31,38.809,-15.59,-11.021,38.858,-32.93,-12.887,39.375,-55.41,-14.73,40.339,-65.35,-16.454,41.596,-63.64,-17.939,42.937,-55.62,-19.038,44.138,-44.02,-19.638,44.89,-31.96,-19.604,45.169,-31.63,-18.67,45.209,-39.1,-17.17,45.209,-44.54,-15.67,45.209,-46.63,-14.17,45.209,-44.08,-12.67,45.209,-37.35,-11.17,45.209,-28.95,-9.715,45.143,-20.65,-8.493,44.813,-13.8,-7.482,44.42,-7.74,-6.278,44.25,1.57,-5.442,43.673,7.41] },
      { id: 'nfPaw', box: [-5.2,-4,8.2,5], art: '<path d="M-3.5 0C-4-2.1-1.8-2.9-.3-2.5 1.2-2.1 2.2-1.1 1.7 0Z" fill="{pink}"/>', still: [-18.337,46.5,0], k: [-6.836,45,35.76,-7.331,43.735,36,-8.401,42.49,32.62,-9.92,41.482,27.36,-11.759,40.862,21.14,-13.789,40.707,14.87,-15.884,41.017,9.07,-17.915,41.723,2.42,-19.753,42.702,-4.28,-21.272,43.803,-9.82,-22.343,44.863,-13,-22.837,45.735,-10.34,-22.628,46.304,-3.73,-21.587,46.5,0,-20.087,46.5,0,-18.587,46.5,0,-17.087,46.5,0,-15.587,46.5,0,-14.087,46.5,0,-12.587,46.5,1.59,-11.087,46.5,10.1,-9.587,46.5,21.88,-8.087,46.5,28,-7.045,46.026,32.33] },
      { id: 'nfUpper', box: [-3.6,-3.6,7.2,12.5], art: '<path d="M-2.39 0.21A2.4 2.4 0 1 1 2.39 0.21L1.89 5.96A1.9 1.9 0 0 1 -1.89 5.96Z" fill="{legNear}"/>', still: [-13.637,34.78,30.06], k: [-14.529,33.662,74.25,-14.183,34.402,94.26,-13.738,35.236,113.34,-13.335,35.915,129.74,-13.111,36.186,136.64,-13.057,35.979,121.92,-13.079,35.561,91.21,-13.186,35.171,65.07,-13.396,34.724,45.24,-13.639,34.252,28.32,-13.961,33.796,13.04,-14.465,33.407,1.16,-14.529,33.662,1.27,-14.183,34.402,12.14,-13.738,35.236,24.65,-13.335,35.915,35.43,-13.111,36.186,44.35,-13.057,35.979,50.17,-13.079,35.561,53.17,-13.186,35.171,55.35,-13.396,34.724,57.59,-13.639,34.252,58.68,-13.961,33.796,55.96,-14.465,33.407,57.61] },
      { id: 'body', box: [-17,-10,32.5,20.5], art: '<path d="M-9.8 7.8C-13.8 7.9-15.4 3.9-14.3-.6-13-6.2-6.6-8.3.2-8.1 6.2-7.9 11.6-5.4 12.9-.4 13.9 3.8 11.6 7.5 7.4 7.8 3 8.1-5 8.1-9.8 7.8Z" fill="{fur}"/><path d="M-8.4-2.8c2.2-1.6 4.4-2.3 7-2.5M1.6-4.6c2.3-.3 4.4.2 6.2 1.2M-10.4 2.6c1.2-1.1 2.6-1.7 4.2-1.9" fill="none" stroke="{shade}" stroke-width=".85" stroke-linecap="round"/>', still: [0,29.5,0], k: [-0.428,28.46,-1.17,-0.301,29.151,-0.21,-0.094,29.933,0.8,0.139,30.576,1.55,0.334,30.849,1.75,0.44,30.665,1.41,0.428,30.259,0.86,0.301,29.869,0.35,0.094,29.426,-0.24,-0.139,28.956,-0.85,-0.334,28.523,-1.41,-0.44,28.204,-1.7,-0.428,28.46,-1.17,-0.301,29.151,-0.21,-0.094,29.933,0.8,0.139,30.576,1.55,0.334,30.849,1.75,0.44,30.665,1.41,0.428,30.259,0.86,0.301,29.869,0.35,0.094,29.426,-0.24,-0.139,28.956,-0.85,-0.334,28.523,-1.41,-0.44,28.204,-1.7], s: [0.9895,1.0125,1.0046,0.9945,1.0209,0.9752,1.0345,0.9589,1.0418,0.9502,1.0367,0.9563,1.0207,0.9754,1.0036,0.9957,0.9855,1.0173,0.9671,1.0392,0.9577,1.0503,0.9717,1.0337,0.9895,1.0125,1.0046,0.9945,1.0209,0.9752,1.0345,0.9589,1.0418,0.9502,1.0367,0.9563,1.0207,0.9754,1.0036,0.9957,0.9855,1.0173,0.9671,1.0392,0.9577,1.0503,0.9717,1.0337] },
      { id: 'head', box: [-4,-15,24,18.5], art: '<g transform="scale(.54) translate(-82 -50)"><circle cx="84.4" cy="34" r="6" fill="{ear}"/><path d="M77.4 45.4C78.6 34.4 89.6 29.6 98.4 33.4c5.8 2.6 10 8.4 15 13.2 2 2 1.2 5-1.8 5.2-7.6.6-15.4 2.6-23.4 1.8-6.6-.6-11.2-3.4-10.8-8.2Z" fill="{face}"/><path d="M79.6 40.4C82.4 33.2 91.6 30.8 98.4 33.4c-4 2.2-7.6 5.6-9.6 10.4-3.4-1.6-6.4-2.8-9.2-3.4Z" fill="{cap}"/></g><circle cx="8.1" cy="-4.5" r="1.3" fill="{eye}"/><circle cx="8.55" cy="-4.95" r=".42" fill="#fff"/><ellipse cx="16.9" cy="-.35" rx="1.75" ry="1.5" fill="{nose}"/>', still: [-19.86,31.791,3], k: [-20.965,31.19,4.5,-20.558,31.42,4.17,-19.93,31.775,3.37,-19.296,32.129,2.47,-18.841,32.376,1.74,-18.736,32.412,1.44,-18.95,32.268,1.67,-19.301,32.07,2.14,-19.675,31.885,2.59,-20.112,31.667,3.11,-20.528,31.451,3.65,-20.873,31.255,4.15,-20.965,31.19,4.5,-20.558,31.42,4.17,-19.93,31.775,3.37,-19.296,32.129,2.47,-18.841,32.376,1.74,-18.736,32.412,1.44,-18.95,32.268,1.67,-19.301,32.07,2.14,-19.675,31.885,2.59,-20.112,31.667,3.11,-20.528,31.451,3.65,-20.873,31.255,4.15] },
      { id: 'ear', box: [-4,-7.5,8.5,9], art: '<g transform="scale(.54) translate(-91 -36.5)"><circle cx="92" cy="31.2" r="6.2" fill="{ear}"/><path d="M86.6 28.6a6.2 6.2 0 0 1 9.8-1.8" fill="none" stroke="{face}" stroke-width="1.2" stroke-linecap="round" opacity=".75"/><circle cx="92.6" cy="32" r="3" fill="{pink}" opacity=".6"/></g>', still: [-31.795,25.312,14.94], k: [-33.531,24.9,21.73,-32.937,25.086,25.96,-31.957,25.339,28.87,-30.953,25.583,26.64,-30.219,25.742,18.84,-30.03,25.745,10.05,-30.361,25.63,2.89,-30.91,25.489,-0.57,-31.473,25.358,1.04,-32.13,25.203,5.84,-32.773,25.056,10.92,-33.327,24.922,16.19,-33.531,24.9,21.73,-32.937,25.086,25.96,-31.957,25.339,28.87,-30.953,25.583,26.64,-30.219,25.742,18.84,-30.03,25.745,10.05,-30.361,25.63,2.89,-30.91,25.489,-0.57,-31.473,25.358,1.04,-32.13,25.203,5.84,-32.773,25.056,10.92,-33.327,24.922,16.19] },
    ],
  };
  /* run-cycle:end */

  /* The thinking spinner: three opossums run laps inside a ring round her question-mark tail,
   * anticlockwise, nose to tail. Each is the rig in RUN (tools/ask/run-cycle.mjs: 18 rigid parts,
   * 24 poses a stride). Nothing here draws a frame: every part is its own small picture, placed by
   * a transform, and the browser's compositor moves it between poses at the screen's refresh rate.
   *
   * Sizes are in em: the spinner is 1 em square, so its font-size is its size (ask.css). */
  const LAP = RUN.strides * RUN.ms;
  // Getting going: the first stride takes one and a half strides of time, from a standstill up to
  // speed (the curve ends at the running speed, so there is no jolt when the laps take over).
  const START_MS = RUN.ms * 1.5;
  const START_EASE = 'cubic-bezier(0.3333, 0, 0.6667, 0.5)';
  // Leaving: she runs on for a third of a stride, slowing to nothing as she fades (the curve
  // begins at the running speed: 300 ms for 0.36 of a 500 ms stride is a slope of 5/3).
  const LEAVE_MS = 300;
  const LEAVE_STRIDE = (LEAVE_MS / RUN.ms) * 0.6;
  const LEAVE_EASE = 'cubic-bezier(0.3, 0.5, 0.6, 1)';
  const paint = (art) => art.replace(/\{(\w+)\}/g, (_, name) => C[name]);
  const em = (units) => +(units / 100).toFixed(4) + 'em';
  // A part's place as [turn, out, tilt, long, tall]: at any phase of the stride (each number goes
  // straight from one pose of the table to the next, which is what the browser shows between
  // poses), or standing (phase null).
  const rowAt = (part, phase) => {
    if (phase === null) return [...part.still, 1, 1];
    const x = (((phase % 1) + 1) % 1) * RUN.keys;
    const k = Math.floor(x) % RUN.keys;
    const next = (k + 1) % RUN.keys;
    const mix = (list, width, column) =>
      list[k * width + column] + (list[next * width + column] - list[k * width + column]) * (x - k);
    return [
      mix(part.k, 3, 0),
      mix(part.k, 3, 1),
      mix(part.k, 3, 2),
      ...(part.s ? [mix(part.s, 2, 0), mix(part.s, 2, 1)] : [1, 1]),
    ];
  };
  // That place as a CSS transform (lengths in em: the spinner is 1 em wide)...
  const css = (part, [turn, out, tilt, long, tall]) =>
    `rotate(${+turn.toFixed(3)}deg) translate(0,${em(out)}) rotate(${+tilt.toFixed(2)}deg)` +
    (part.s ? ` scale(${+long.toFixed(4)},${+tall.toFixed(4)})` : '');
  // ...and for an SVG drawing, in units.
  const svgPlace = (part, [turn, out, tilt, long, tall]) =>
    `rotate(${+turn.toFixed(3)}) translate(0 ${+out.toFixed(3)}) rotate(${+tilt.toFixed(2)})` +
    (part.s ? ` scale(${+long.toFixed(4)} ${+tall.toFixed(4)})` : '');
  // A part at pose k of the table exactly (or standing, k < 0), as a CSS transform.
  const place = (part, k) =>
    css(
      part,
      k < 0
        ? rowAt(part, null)
        : [...part.k.slice(k * 3, k * 3 + 3), ...(part.s ? part.s.slice(k * 2, k * 2 + 2) : [1, 1])],
    );
  // One opossum as plain SVG, in spinner units about the centre of the ring, upright at the bottom.
  // For the Muybridge sheet (tools/ask/dottie-sheet.mjs) and anything else that wants a still.
  const frame = (phase) =>
    RUN.parts
      .map(
        (part) =>
          `<g transform="${svgPlace(part, rowAt(part, phase))}"><g transform="scale(${RUN.size})">${paint(part.art)}</g></g>`,
      )
      .join('');
  const curl = 'M24 29.6v-1.4c0-2 3.4-2.6 3.4-5.4 0-2.1-1.6-3.5-3.6-3.5-1.8 0-3.2 1-3.6 2.8';
  // Her question-mark tail and the track, in spinner units about the centre.
  const mark = () =>
    `<circle r="${RUN.ground + 0.8}" fill="none" stroke="${C.track}" stroke-width="1.1"/>` +
    `<g transform="scale(1.2) translate(-24 -26.4)"><path d="${curl}" fill="none" stroke="${C.tail}" stroke-width="2.6" stroke-linecap="round"/><circle cx="24" cy="33.2" r="1.5" fill="${C.mint}"/></g>`;

  // The markup: a ring that turns, an opossum every third of it (each a third of a stride on from
  // the one ahead, so they step in the same places), and each part standing until it is animated.
  // Decorative, like svg(). In a browser it is a <dottie-spinner> element, which runs it (below).
  function spinner(count = 3) {
    const parts = RUN.parts
      .map((part) => {
        const [x, y, w, h] = part.box;
        const z = RUN.size;
        return `<svg class="dottie-part" data-part="${part.id}" viewBox="${part.box.join(' ')}" focusable="false" style="left:${em(50 + x * z)};top:${em(50 + y * z)};width:${em(w * z)};height:${em(h * z)};transform-origin:${em(-x * z)} ${em(-y * z)};transform:${place(part, -1)}">${paint(part.art)}</svg>`;
      })
      .join('');
    let runners = '';
    for (let i = 0; i < count; i++)
      runners += `<span class="dottie-runner" style="transform:rotate(${+((-360 * i) / count).toFixed(3)}deg)">${parts}</span>`;
    return `<dottie-spinner class="dottie dottie-spinner" aria-hidden="true"><svg class="dottie-mark" viewBox="-50 -50 100 100" focusable="false">${mark()}</svg><span class="dottie-ring">${runners}</span></dottie-spinner>`;
  }

  window.DKLADottie = {
    name: 'Dottie Docket',
    poses: Object.keys(poses),
    svg,
    spinner,
    // The run cycle, for the Muybridge sheet and the checks: its timing, which poses each foot is
    // down for, one opossum drawn at any phase, and the ring's own drawing.
    run: {
      ms: RUN.ms,
      keys: RUN.keys,
      strides: RUN.strides,
      ground: RUN.ground,
      feet: RUN.feet,
      lap: LAP,
      start: START_MS,
      frame,
      mark,
    },
  };
  if (typeof document === 'undefined') return;

  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const html = document.documentElement;

  /* Running the spinner. A <dottie-spinner> starts its animations when it is put on the page and
   * drops every one of them when it is taken off, when it is not on screen (its dialog closed, or
   * scrolled out of sight) and under reduced motion (ask.css then shows her standing, with a slow
   * pulse). In a hidden tab they are paused where they are and go on when the tab comes back.
   * No timer and no per-frame script: one Web Animation per part (the start, then the laps), all
   * on transform, all given the same start time so the ring and the 54 parts cannot drift apart. */
  const live = new Set();
  const wake = () => live.forEach((spinner) => spinner.sync());
  const frames = new Map(); // part id + first pose -> keyframes, shared by every spinner
  const keyframes = (part, first) => {
    const name = part.id + ':' + first;
    if (!frames.has(name))
      frames.set(
        name,
        Array.from({ length: RUN.keys + 1 }, (_, i) => ({ transform: place(part, (first + i) % RUN.keys) })),
      );
    return frames.get(name);
  };
  if (typeof customElements !== 'undefined' && !customElements.get('dottie-spinner'))
    customElements.define(
      'dottie-spinner',
      class extends HTMLElement {
        connectedCallback() {
          if (!this.animate || typeof IntersectionObserver !== 'function') return;
          live.add(this);
          if (live.size === 1) {
            document.addEventListener('visibilitychange', wake);
            calm.addEventListener('change', wake);
          }
          // Where a leaving spinner is shown (ask.css gives it its place there).
          this.home = this.closest('.ask-progress');
          this.seen = true;
          this.watch = new IntersectionObserver((entries) => {
            this.seen = entries[entries.length - 1].isIntersecting;
            this.sync();
          });
          this.watch.observe(this);
          this.sync();
        }
        disconnectedCallback() {
          live.delete(this);
          if (!live.size) {
            document.removeEventListener('visibilitychange', wake);
            calm.removeEventListener('change', wake);
          }
          this.watch?.disconnect();
          this.leave();
          this.stop();
        }
        sync() {
          if (!this.isConnected || !this.seen || calm.matches) return this.stop();
          if (!this.running) this.start();
          if (document.hidden) this.hold();
          else this.resume();
        }
        // Getting going: every part plays its stride once on the start curve, and the ring turns
        // one stride with it. When that ends, laps() takes over at full speed.
        start() {
          const ring = this.querySelector('.dottie-ring');
          const runners = [...this.querySelectorAll('.dottie-runner')];
          if (!ring || !runners.length) return;
          const now = document.timeline.currentTime ?? 0;
          const stride = 360 / RUN.strides;
          this.lapping = false;
          // [element, its keyframes for a lap or a stride, how long that takes]
          const cast = (this.cast = [
            [
              ring,
              [{ transform: `rotate(${-stride}deg)` }, { transform: `rotate(${-stride - 360}deg)` }],
              LAP,
            ],
          ]);
          runners.forEach((runner, i) => {
            // Each a third of a stride further on than the one ahead of her.
            const first = Math.round((i * RUN.keys) / runners.length) % RUN.keys;
            RUN.parts.forEach((part, n) => cast.push([runner.children[n], keyframes(part, first), RUN.ms]));
          });
          const timing = { duration: START_MS, easing: START_EASE, fill: 'forwards' };
          this.running = cast.map(([element, moves], i) => {
            const animation = element.animate(
              i ? moves : [{ transform: 'rotate(0deg)' }, { transform: `rotate(${-stride}deg)` }],
              timing,
            );
            animation.startTime = now;
            return animation;
          });
          // One call when the start is over (not one per frame). Two animations of one property on
          // one element would keep both off the compositor, so the laps are only made now.
          const starting = this.running;
          starting[0].onfinish = () =>
            this.running === starting && this.laps(starting[0].startTime + START_MS);
        }
        // The laps: one endless animation per part, all counted from the same instant.
        laps(from) {
          this.lapping = true;
          for (const animation of this.running) animation.cancel();
          this.running = this.cast.map(([element, moves, ms]) => {
            const animation = element.animate(moves, { duration: ms, iterations: Infinity });
            animation.startTime = from;
            return animation;
          });
          if (this.held) {
            this.held = false;
            this.hold();
          }
        }
        /* Taken off the page while running (the answer came, or the search was cancelled): a copy
           stays where she was for LEAVE_MS, carries on from the very pose she was in, slows to
           nothing and fades. The copy is a plain element, not another spinner; it takes no clicks
           and removes itself. Nothing is left if she was not running, or the row itself is gone. */
        leave() {
          const home = this.home;
          if (!this.running || this.held || !home?.isConnected || document.hidden || calm.matches) return;
          const done = (animation) => animation.effect.getComputedTiming().progress ?? 0;
          const copy = document.createElement('span');
          copy.className = 'dottie dottie-spinner dottie-leaving';
          copy.setAttribute('aria-hidden', 'true');
          copy.innerHTML = this.innerHTML;
          const timing = { duration: LEAVE_MS, easing: LEAVE_EASE, fill: 'forwards' };
          const now = document.timeline.currentTime ?? 0;
          const go = (element, moves, how = timing) => {
            const animation = element.animate(moves, how);
            animation.startTime = now;
            return animation;
          };
          // The ring from where it is, on by the same share of a stride as the legs.
          const stride = 360 / RUN.strides;
          const turned = this.lapping
            ? -stride - 360 * done(this.running[0])
            : -stride * done(this.running[0]);
          go(copy.querySelector('.dottie-ring'), [
            { transform: `rotate(${turned}deg)` },
            { transform: `rotate(${turned - stride * LEAVE_STRIDE}deg)` },
          ]);
          const runners = [...copy.querySelectorAll('.dottie-runner')];
          runners.forEach((runner, i) => {
            const first = Math.round((i * RUN.keys) / runners.length) % RUN.keys;
            // Where this opossum is in her stride, read from her first part.
            const from = first / RUN.keys + done(this.running[1 + i * RUN.parts.length]);
            const to = from + LEAVE_STRIDE;
            // The pose she is in, every pose of the table on the way, and the pose she stops in.
            const stops = [from];
            for (let k = Math.ceil(from * RUN.keys + 1e-6); k / RUN.keys < to - 1e-6; k++)
              stops.push(k / RUN.keys);
            stops.push(to);
            RUN.parts.forEach((part, n) =>
              go(
                runner.children[n],
                stops.map((phase, at) => ({
                  transform: css(part, rowAt(part, phase)),
                  offset: at === stops.length - 1 ? 1 : (phase - from) / LEAVE_STRIDE,
                })),
              ),
            );
          });
          go(copy, [{ opacity: 1 }, { opacity: 0 }], {
            duration: LEAVE_MS,
            easing: 'ease-in',
            fill: 'forwards',
          }).onfinish = () => copy.remove();
          home.append(copy);
        }
        stop() {
          for (const animation of this.running ?? []) animation.cancel();
          this.running = this.cast = null;
          this.held = false;
        }
        // Pause every animation at the same instant (setting the time makes the pause immediate).
        hold() {
          if (this.held || !this.running) return;
          this.held = true;
          for (const animation of this.running) {
            if (animation.playState !== 'running') continue;
            const at = animation.currentTime;
            animation.pause();
            animation.currentTime = at;
          }
        }
        resume() {
          if (!this.held || !this.running) return;
          this.held = false;
          const now = document.timeline.currentTime ?? 0;
          for (const animation of this.running)
            if (animation.playState === 'paused') animation.startTime = now - animation.currentTime;
        }
      },
    );

  // Dottie blinks every 5.2 s (ask.css, html.dottie-blink). The class is on for the 0.42 s of the
  // blink only, so between blinks nothing is animating and the page is at rest (an endless CSS
  // animation that sat still 92% of the time restyled the page on every frame). No blink in a
  // hidden tab, with reduced motion, or while the map is being moved.
  setInterval(() => {
    if (document.hidden || calm.matches || html.classList.contains('dkla-moving')) return;
    html.classList.add('dottie-blink');
    setTimeout(() => html.classList.remove('dottie-blink'), 440);
  }, 5200);
})();
