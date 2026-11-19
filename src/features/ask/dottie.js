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
    ms: 500, keys: 24, strides: 10, ground: 46.5, size: 0.95,
    feet: {fh:[12,9],ff:[1,9],nh:[0,9],nf:[13,9]},
    parts: [
      { id: 'fhLower', box: [-3,-9.6,6,12.2], art: '<path d="M-1.5 0.09A1.5 1.5 0 0 0 1.5 0.09L1.9 -6.69A1.9 1.9 0 1 0 -1.9 -6.69Z" fill="{legFar}"/>', still: [11.4,45.26,26.67], k: [21.121,41.723,65.37,20.367,40.957,78.08,19.289,40.443,87.98,17.903,40.274,91.83,16.242,40.463,85.56,14.396,40.967,70.38,12.552,41.794,54.4,10.817,42.824,40.67,9.322,43.885,28.16,8.222,44.798,16.1,7.643,45.267,5.4,7.723,45.249,-1.21,8.65,45.26,6.06,10.15,45.26,19.12,11.65,45.26,30.07,13.15,45.26,39.1,14.65,45.26,45.34,16.15,45.26,47.86,17.602,45.167,48.23,18.78,44.698,50.6,19.664,44.136,52.33,20.776,43.895,48.79,21.564,43.429,47.19,21.577,42.614,53.5] },
      { id: 'fhPaw', box: [-6,-4.2,9.2,5.2], art: '<path d="M-4.3 0C-4.8-2.2-2.2-3.1-.4-2.6 1.3-2.2 2.4-1.2 1.9 0Z" fill="{pawFar}"/>', still: [7.79,46.5,0], k: [19.296,44.552,40,18.226,43.676,35.87,16.707,42.966,29.59,14.868,42.529,22.3,12.838,42.42,15.16,10.743,42.638,8.9,8.712,43.135,2.13,6.874,43.825,-4.5,5.355,44.6,-9.89,4.284,45.347,-13,3.79,45.961,-10.34,4.009,46.295,-3.74,5.04,46.5,0,6.54,46.5,0,8.04,46.5,0,9.54,46.5,0,11.04,46.5,0,12.54,46.5,0,14.04,46.5,1.82,15.54,46.5,11.54,17.04,46.5,25,18.54,46.5,32,19.582,46.166,36.44,19.791,45.444,40] },
      { id: 'fhUpper', box: [-3.6,-3.6,7.2,12.9], art: '<path d="M-2.39 0.19A2.4 2.4 0 1 1 2.39 0.19L1.89 6.55A1.9 1.9 0 0 1 -1.89 6.55Z" fill="{legFar}"/>', still: [12.256,34.46,-35.02], k: [11.964,33.402,3.9,12.136,34.067,-5.5,12.364,34.824,-14.87,12.602,35.451,-26.25,12.803,35.727,-41.54,12.877,35.566,-56.23,12.755,35.197,-62.39,12.499,34.842,-61.06,12.153,34.435,-54.19,11.782,33.994,-43.49,11.558,33.569,-32.39,11.736,33.199,-25.1,11.964,33.402,-28.76,12.136,34.067,-34.81,12.364,34.824,-37.84,12.602,35.451,-37.35,12.803,35.727,-32.65,12.877,35.566,-23.72,12.755,35.197,-12.81,12.499,34.842,-4.91,12.153,34.435,1.73,11.782,33.994,13.28,11.558,33.569,20.37,11.736,33.199,14.38] },
      { id: 'ffLower', box: [-3,-9.8,6,12.4], art: '<path d="M-1.5 0.09A1.5 1.5 0 0 0 1.5 0.09L1.9 -6.79A1.9 1.9 0 1 0 -1.9 -6.79Z" fill="{legFar}"/>', still: [-8.915,45.27,-3.93], k: [-21.106,45.261,-27.07,-20.165,45.27,-38.79,-18.665,45.27,-46.48,-17.165,45.27,-49.91,-15.665,45.27,-47.57,-14.165,45.27,-39.96,-12.665,45.27,-30.34,-11.208,45.208,-20.87,-9.973,44.896,-12.67,-8.937,44.523,-5.04,-7.717,44.362,7.05,-6.875,43.883,17.23,-6.817,42.991,6.22,-7.291,41.971,-4.15,-8.142,41.04,-10.52,-9.346,40.352,-14.91,-10.848,40.022,-22.76,-12.586,40.09,-40.4,-14.464,40.536,-58.04,-16.308,41.347,-64.54,-18.023,42.397,-61.25,-19.492,43.509,-52.12,-20.573,44.494,-39.02,-21.156,45.079,-23.77] },
      { id: 'ffPaw', box: [-5.2,-4,8.2,5], art: '<path d="M-3.5 0C-4-2.1-1.8-2.9-.3-2.5 1.2-2.1 2.2-1.1 1.7 0Z" fill="{pawFar}"/>', still: [-11.682,46.5,0], k: [-23.973,46.342,-3.73,-22.932,46.5,0,-21.432,46.5,0,-19.932,46.5,0,-18.432,46.5,0,-16.932,46.5,0,-15.432,46.5,0,-13.932,46.5,1.59,-12.432,46.5,10.1,-10.932,46.5,21.88,-9.432,46.5,28,-8.39,46.12,32.33,-8.181,45.296,35.76,-8.676,44.281,36,-9.746,43.282,32.62,-11.265,42.473,27.36,-13.104,41.975,21.14,-15.134,41.851,14.87,-17.229,42.099,9.07,-19.26,42.666,2.42,-21.098,43.452,-4.28,-22.617,44.335,-9.82,-23.688,45.186,-13,-24.182,45.886,-10.34] },
      { id: 'ffUpper', box: [-3.6,-3.6,7.2,12.5], art: '<path d="M-2.39 0.2A2.4 2.4 0 1 1 2.39 0.2L1.89 6.16A1.9 1.9 0 0 1 -1.89 6.16Z" fill="{legFar}"/>', still: [-15.182,35.188,55.09], k: [-16.183,33.85,-4.14,-15.774,34.75,10.31,-15.262,35.762,24.08,-14.806,36.588,35.64,-14.561,36.922,45.27,-14.519,36.668,51.47,-14.566,36.147,54.2,-14.695,35.656,55.69,-14.93,35.095,56.61,-15.201,34.505,55.86,-15.56,33.95,50.03,-16.124,33.517,46.44,-16.183,33.85,66.71,-15.774,34.75,87.73,-15.262,35.762,106.12,-14.806,36.588,120.41,-14.561,36.922,123.91,-14.519,36.668,107.71,-14.566,36.147,80.82,-14.695,35.656,57.95,-14.93,35.095,39.44,-15.201,34.505,22.76,-15.56,33.95,6.73,-16.124,33.517,-8.03] },
      { id: 'tail3', box: [-7.5,-6.5,10,9], art: '<path d="M0,-1.2L-0.8,-1.21L-1.6,-1.36L-2.38,-1.64L-3.1,-2.05L-3.75,-2.59L-4.31,-3.24A0.85 0.85 0 0 0 -5.75,-2.34L-5.11,-1.38L-4.31,-0.54L-3.37,0.15L-2.32,0.69L-1.19,1.04L0,1.2A1.2 1.2 0 0 0 0,-1.2Z" fill="{tail}"/>', still: [40.989,39.123,-0.99], k: [39.94,39.848,-7.43,39.865,40.447,-12.66,40.265,40.621,-15.38,40.976,40.203,-13.97,41.677,39.386,-9.47,42.115,38.476,-0.41,42.124,37.867,9.09,41.811,37.748,15.74,41.356,37.918,17.9,40.797,38.204,15.04,40.302,38.563,8.28,40.179,39.095,-0.32,39.94,39.848,-7.43,39.865,40.447,-12.66,40.265,40.621,-15.38,40.976,40.203,-13.97,41.677,39.386,-9.47,42.115,38.476,-0.41,42.124,37.867,9.09,41.811,37.748,15.74,41.356,37.918,17.9,40.797,38.204,15.04,40.302,38.563,8.28,40.179,39.095,-0.32] },
      { id: 'tail2', box: [-9.5,-6,12.5,8.5], art: '<path d="M0,-1.55L-1.04,-1.54L-2.07,-1.61L-3.1,-1.78L-4.12,-2.04L-5.12,-2.39L-6.08,-2.83A1.2 1.2 0 0 0 -7.28,-0.75L-6.18,-0.11L-5.02,0.43L-3.82,0.87L-2.57,1.21L-1.3,1.44L0,1.55A1.55 1.55 0 0 0 0,-1.55Z" fill="{tail}"/>', still: [31.375,37.844,-21.38], k: [30.812,37.537,-30.94,30.931,38.016,-32.17,31.295,38.361,-30.55,31.706,38.547,-24.91,32.08,38.51,-17.84,32.29,38.245,-12.09,32.177,37.963,-9.19,31.825,37.792,-9.63,31.378,37.585,-12.9,30.897,37.353,-17.46,30.562,37.198,-22.07,30.715,37.187,-27.08,30.812,37.537,-30.94,30.931,38.016,-32.17,31.295,38.361,-30.55,31.706,38.547,-24.91,32.08,38.51,-17.84,32.29,38.245,-12.09,32.177,37.963,-9.19,31.825,37.792,-9.63,31.378,37.585,-12.9,30.897,37.353,-17.46,30.562,37.198,-22.07,30.715,37.187,-27.08] },
      { id: 'tail1', box: [-10.5,-6,14,9], art: '<path d="M0,-1.9L-1.14,-1.88L-2.28,-1.94L-3.41,-2.08L-4.54,-2.3L-5.66,-2.61L-6.75,-2.98A1.55 1.55 0 0 0 -8.01,-0.15L-6.76,0.42L-5.46,0.9L-4.13,1.29L-2.77,1.59L-1.39,1.79L0,1.9A1.9 1.9 0 0 0 0,-1.9Z" fill="{tail}"/><path d="M0,-2L-0.39,-2L-0.77,-2L-1.16,-2.02L-1.54,-2.04L-1.93,-2.07L-2.31,-2.12A1.95 1.95 0 0 0 -2.87,1.74L-2.39,1.82L-1.92,1.87L-1.44,1.92L-0.96,1.96L-0.48,1.99L0,2A2 2 0 0 0 0,-2Z" fill="{leg}"/>', still: [21.363,34.425,-35.36], k: [21.266,33.465,-41.71,21.375,34.092,-40.29,21.526,34.804,-36.75,21.705,35.399,-32.94,21.889,35.679,-30.07,21.964,35.532,-28.98,21.822,35.152,-29.81,21.536,34.776,-31.63,21.165,34.351,-33.6,20.778,33.892,-35.69,20.596,33.486,-38.08,20.966,33.226,-40.53,21.266,33.465,-41.71,21.375,34.092,-40.29,21.526,34.804,-36.75,21.705,35.399,-32.94,21.889,35.679,-30.07,21.964,35.532,-28.98,21.822,35.152,-29.81,21.536,34.776,-31.63,21.165,34.351,-33.6,20.778,33.892,-35.69,20.596,33.486,-38.08,20.966,33.226,-40.53] },
      { id: 'nhLower', box: [-3,-9.6,6,12.2], art: '<path d="M-1.5 0.09A1.5 1.5 0 0 0 1.5 0.09L1.9 -6.69A1.9 1.9 0 1 0 -1.9 -6.69Z" fill="{legNear}"/>', still: [21.166,45.26,49.22], k: [10.916,45.26,15.76,12.416,45.26,26.09,13.916,45.26,35.94,15.416,45.26,44.68,16.916,45.26,51.14,18.416,45.26,54.28,19.868,45.167,55.41,21.046,44.698,58.18,21.93,44.136,60.21,23.041,43.895,57.57,23.83,43.429,56.65,23.842,42.614,62.04,23.386,41.723,72.86,22.632,40.957,85.23,21.554,40.443,95.36,20.169,40.274,99.64,18.508,40.463,93.01,16.661,40.967,75.98,14.817,41.794,58.65,13.083,42.824,44.72,11.587,43.885,32.91,10.487,44.798,22.57,9.909,45.267,14.82,9.972,45.315,10.47] },
      { id: 'nhPaw', box: [-6,-4.2,9.2,5.2], art: '<path d="M-4.3 0C-4.8-2.2-2.2-3.1-.4-2.6 1.3-2.2 2.4-1.2 1.9 0Z" fill="{pink}"/>', still: [17.556,46.5,0], k: [7.306,46.5,0,8.806,46.5,0,10.306,46.5,0,11.806,46.5,0,13.306,46.5,0,14.806,46.5,0,16.306,46.5,1.82,17.806,46.5,11.54,19.306,46.5,25,20.806,46.5,32,21.847,46.166,36.44,22.056,45.444,40,21.562,44.552,40,20.491,43.676,35.87,18.972,42.966,29.59,17.134,42.529,22.3,15.103,42.42,15.16,13.008,42.638,8.9,10.978,43.135,2.13,9.139,43.825,-4.5,7.62,44.6,-9.89,6.55,45.347,-13,6.055,45.961,-10.34,6.264,46.362,-3.73] },
      { id: 'nhUpper', box: [-3.6,-3.6,7.2,12.9], art: '<path d="M-2.39 0.19A2.4 2.4 0 1 1 2.39 0.19L1.89 6.55A1.9 1.9 0 0 1 -1.89 6.55Z" fill="{legNear}"/>', still: [14.356,35.251,0.09], k: [14.07,34.223,-39.91,14.262,34.866,-42.53,14.507,35.597,-43.75,14.757,36.203,-42.07,14.964,36.472,-36.58,15.028,36.32,-27.25,14.879,35.965,-16.13,14.594,35.622,-7.7,14.217,35.229,-0.6,13.816,34.802,10.42,13.58,34.39,17.08,13.802,34.03,12.18,14.07,34.223,3.34,14.262,34.866,-4.58,14.507,35.597,-12.8,14.757,36.203,-23.66,14.964,36.472,-40.1,15.028,36.32,-57.75,14.879,35.965,-66.1,14.594,35.622,-65.95,14.217,35.229,-60.1,13.816,34.802,-51.07,13.58,34.39,-43.02,13.802,34.03,-38.37] },
      { id: 'nfLower', box: [-3,-9.8,6,12.4], art: '<path d="M-1.5 0.09A1.5 1.5 0 0 0 1.5 0.09L1.9 -6.79A1.9 1.9 0 1 0 -1.9 -6.79Z" fill="{legNear}"/>', still: [-14.681,45.27,-38.97], k: [-4.582,42.991,4.01,-5.057,41.971,-5.46,-5.908,41.04,-11.47,-7.112,40.352,-15.75,-8.613,40.022,-23.78,-10.351,40.09,-41.87,-12.229,40.536,-59.71,-14.074,41.347,-66.15,-15.788,42.397,-62.84,-17.258,43.509,-53.88,-18.338,44.494,-41.25,-18.922,45.079,-27.15,-18.872,45.261,-29.42,-17.931,45.27,-40.25,-16.431,45.27,-47.59,-14.931,45.27,-50.85,-13.431,45.27,-48.5,-11.931,45.27,-41.02,-10.431,45.27,-31.56,-8.973,45.208,-22.25,-7.738,44.896,-14.26,-6.702,44.523,-6.94,-5.483,44.362,4.14,-4.64,43.883,12.54] },
      { id: 'nfPaw', box: [-5.2,-4,8.2,5], art: '<path d="M-3.5 0C-4-2.1-1.8-2.9-.3-2.5 1.2-2.1 2.2-1.1 1.7 0Z" fill="{pink}"/>', still: [-17.447,46.5,0], k: [-5.946,45.296,35.76,-6.441,44.281,36,-7.512,43.282,32.62,-9.03,42.473,27.36,-10.869,41.975,21.14,-12.9,41.851,14.87,-14.994,42.099,9.07,-17.025,42.666,2.42,-18.864,43.452,-4.28,-20.382,44.335,-9.82,-21.453,45.186,-13,-21.948,45.886,-10.34,-21.738,46.342,-3.73,-20.697,46.5,0,-19.197,46.5,0,-17.697,46.5,0,-16.197,46.5,0,-14.697,46.5,0,-13.197,46.5,0,-11.697,46.5,1.59,-10.197,46.5,10.1,-8.697,46.5,21.88,-7.197,46.5,28,-6.156,46.12,32.33] },
      { id: 'nfUpper', box: [-3.6,-3.6,7.2,12.5], art: '<path d="M-2.39 0.2A2.4 2.4 0 1 1 2.39 0.2L1.89 6.16A1.9 1.9 0 0 1 -1.89 6.16Z" fill="{legNear}"/>', still: [-12.747,35.305,29.01], k: [-13.678,33.993,68.67,-13.299,34.861,88.7,-12.822,35.84,106.65,-12.393,36.639,120.63,-12.155,36.962,123.74,-12.107,36.72,106.95,-12.152,36.228,79.8,-12.284,35.765,57.06,-12.52,35.235,38.86,-12.793,34.676,22.63,-13.135,34.14,7.22,-13.637,33.691,-6.41,-13.678,33.993,-3.76,-13.299,34.861,9.8,-12.822,35.84,23.35,-12.393,36.639,34.85,-12.155,36.962,44.52,-12.107,36.72,50.95,-12.152,36.228,54.17,-12.284,35.765,56.24,-12.52,35.235,57.79,-12.793,34.676,57.75,-13.135,34.14,53.25,-13.637,33.691,51.42] },
      { id: 'body', box: [-17,-10,32.5,20.5], art: '<path d="M-9.8 7.8C-13.8 7.9-15.4 3.9-14.3-.6-13-6.2-6.6-8.3.2-8.1 6.2-7.9 11.6-5.4 12.9-.4 13.9 3.8 11.6 7.5 7.4 7.8 3 8.1-5 8.1-9.8 7.8Z" fill="{fur}"/><path d="M-8.4-2.8c2.2-1.6 4.4-2.3 7-2.5M1.6-4.6c2.3-.3 4.4.2 6.2 1.2M-10.4 2.6c1.2-1.1 2.6-1.7 4.2-1.9" fill="none" stroke="{shade}" stroke-width=".85" stroke-linecap="round"/>', still: [0,30.35,0], k: [-0.428,29.11,-1.17,-0.301,29.934,-0.21,-0.094,30.866,0.8,0.139,31.633,1.55,0.334,31.959,1.75,0.44,31.739,1.41,0.428,31.254,0.86,0.301,30.79,0.35,0.094,30.262,-0.24,-0.139,29.701,-0.85,-0.334,29.185,-1.41,-0.44,28.805,-1.7,-0.428,29.11,-1.17,-0.301,29.934,-0.21,-0.094,30.866,0.8,0.139,31.633,1.55,0.334,31.959,1.75,0.44,31.739,1.41,0.428,31.254,0.86,0.301,30.79,0.35,0.094,30.262,-0.24,-0.139,29.701,-0.85,-0.334,29.185,-1.41,-0.44,28.805,-1.7], s: [0.9895,1.0125,1.0046,0.9945,1.0209,0.9752,1.0345,0.9589,1.0418,0.9502,1.0367,0.9563,1.0207,0.9754,1.0036,0.9957,0.9855,1.0173,0.9671,1.0392,0.9577,1.0503,0.9717,1.0337,0.9895,1.0125,1.0046,0.9945,1.0209,0.9752,1.0345,0.9589,1.0418,0.9502,1.0367,0.9563,1.0207,0.9754,1.0036,0.9957,0.9855,1.0173,0.9671,1.0392,0.9577,1.0503,0.9717,1.0337] },
      { id: 'head', box: [-4,-15,24,18.5], art: '<g transform="scale(.54) translate(-82 -50)"><circle cx="84.4" cy="34" r="6" fill="{ear}"/><path d="M77.4 45.4C78.6 34.4 89.6 29.6 98.4 33.4c5.8 2.6 10 8.4 15 13.2 2 2 1.2 5-1.8 5.2-7.6.6-15.4 2.6-23.4 1.8-6.6-.6-11.2-3.4-10.8-8.2Z" fill="{face}"/><path d="M79.6 40.4C82.4 33.2 91.6 30.8 98.4 33.4c-4 2.2-7.6 5.6-9.6 10.4-3.4-1.6-6.4-2.8-9.2-3.4Z" fill="{cap}"/></g><circle cx="8.1" cy="-4.5" r="1.3" fill="{eye}"/><circle cx="8.55" cy="-4.95" r=".42" fill="#fff"/><ellipse cx="16.9" cy="-.35" rx="1.75" ry="1.5" fill="{nose}"/>', still: [-18.463,32.398,3], k: [-19.606,31.675,0.28,-19.184,31.952,0.54,-18.534,32.378,1.92,-17.88,32.805,3.6,-17.411,33.101,5.09,-17.304,33.145,5.88,-17.526,32.972,5.65,-17.888,32.734,4.82,-18.272,32.511,3.96,-18.722,32.249,3.04,-19.152,31.99,2.03,-19.509,31.754,1.08,-19.606,31.675,0.28,-19.184,31.952,0.54,-18.534,32.378,1.92,-17.88,32.805,3.6,-17.411,33.101,5.09,-17.304,33.145,5.88,-17.526,32.972,5.65,-17.888,32.734,4.82,-18.272,32.511,3.96,-18.722,32.249,3.04,-19.152,31.99,2.03,-19.509,31.754,1.08] },
      { id: 'ear', box: [-4,-7.5,8.5,9], art: '<g transform="scale(.54) translate(-91 -36.5)"><circle cx="92" cy="31.2" r="6.2" fill="{ear}"/><path d="M86.6 28.6a6.2 6.2 0 0 1 9.8-1.8" fill="none" stroke="{face}" stroke-width="1.2" stroke-linecap="round" opacity=".75"/><circle cx="92.6" cy="32" r="3" fill="{pink}" opacity=".6"/></g>', still: [-29.405,26.199,13.94], k: [-30.24,25.205,14.58,-29.762,25.503,18.5,-29.25,26.066,23.22,-28.782,26.664,24.34,-28.494,27.118,20.67,-28.524,27.249,14.99,-28.772,27.053,8.89,-29.068,26.728,4.74,-29.37,26.415,4.57,-29.735,26.058,6.76,-30.052,25.695,9.02,-30.296,25.365,11.55,-30.24,25.205,14.58,-29.762,25.503,18.5,-29.25,26.066,23.22,-28.782,26.664,24.34,-28.494,27.118,20.67,-28.524,27.249,14.99,-28.772,27.053,8.89,-29.068,26.728,4.74,-29.37,26.415,4.57,-29.735,26.058,6.76,-30.052,25.695,9.02,-30.296,25.365,11.55] },
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
  const paint = (art) => art.replace(/\{(\w+)\}/g, (_, name) => C[name]);
  const em = (units) => +(units / 100).toFixed(4) + 'em';
  // A part at pose k of the table (or standing, k < 0), as a CSS transform.
  const place = (part, k) => {
    const [turn, out, tilt] = k < 0 ? part.still : part.k.slice(k * 3, k * 3 + 3);
    const squash =
      part.s && k >= 0 ? ` scale(${part.s[k * 2]},${part.s[k * 2 + 1]})` : part.s ? ' scale(1,1)' : '';
    return `rotate(${turn}deg) translate(0,${em(out)}) rotate(${tilt}deg)${squash}`;
  };
  // The same for an SVG drawing, in units, at any phase of the stride (null: standing): each number
  // goes straight from one pose to the next, which is what the browser shows between poses.
  const placeAt = (part, phase) => {
    let row;
    let squash = [1, 1];
    if (phase === null) row = part.still;
    else {
      const x = (((phase % 1) + 1) % 1) * RUN.keys;
      const k = Math.floor(x);
      const next = (k + 1) % RUN.keys;
      const mix = (list, width, column) =>
        list[k * width + column] + (list[next * width + column] - list[k * width + column]) * (x - k);
      row = [0, 1, 2].map((column) => mix(part.k, 3, column));
      if (part.s) squash = [0, 1].map((column) => mix(part.s, 2, column));
    }
    return `rotate(${+row[0].toFixed(3)}) translate(0 ${+row[1].toFixed(3)}) rotate(${+row[2].toFixed(2)})${part.s ? ` scale(${squash.map((n) => +n.toFixed(4)).join(' ')})` : ''}`;
  };
  // One opossum as plain SVG, in spinner units about the centre of the ring, upright at the bottom.
  // For the Muybridge sheet (tools/ask/dottie-sheet.mjs) and anything else that wants a still.
  const frame = (phase) =>
    RUN.parts
      .map(
        (part) =>
          `<g transform="${placeAt(part, phase)}"><g transform="scale(${RUN.size})">${paint(part.art)}</g></g>`,
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
   * No timer and no per-frame script: two Web Animations per part (the start, then the laps), all
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
          this.stop();
        }
        sync() {
          if (!this.isConnected || !this.seen || calm.matches) return this.stop();
          if (!this.running) this.start();
          if (document.hidden) this.hold();
          else this.resume();
        }
        start() {
          const ring = this.querySelector('.dottie-ring');
          const runners = [...this.querySelectorAll('.dottie-runner')];
          if (!ring || !runners.length) return;
          const now = document.timeline.currentTime ?? 0;
          const running = (this.running = []);
          const run = (element, moves, lap, ms) => {
            for (const animation of [
              element.animate(moves, { duration: START_MS, easing: START_EASE }),
              element.animate(lap, { duration: ms, iterations: Infinity, delay: START_MS }),
            ]) {
              animation.startTime = now;
              running.push(animation);
            }
          };
          // One stride of the ring while she gets going, then a lap every LAP ms.
          const stride = 360 / RUN.strides;
          run(
            ring,
            [{ transform: 'rotate(0deg)' }, { transform: `rotate(${-stride}deg)` }],
            [{ transform: `rotate(${-stride}deg)` }, { transform: `rotate(${-stride - 360}deg)` }],
            LAP,
          );
          runners.forEach((runner, i) => {
            // Each a third of a stride further on than the one ahead of her.
            const first = Math.round((i * RUN.keys) / runners.length) % RUN.keys;
            const elements = runner.children;
            RUN.parts.forEach((part, n) => {
              const moves = keyframes(part, first);
              run(elements[n], moves, moves, RUN.ms);
            });
          });
          this.classList.add('is-running');
        }
        stop() {
          for (const animation of this.running ?? []) animation.cancel();
          this.running = null;
          this.held = false;
          this.classList.remove('is-running');
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
