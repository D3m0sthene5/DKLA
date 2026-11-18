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
 *   researching    the spinner: three tiny opossums trotting nose to tail round her
 *                  question-mark tail, 8 frames each (spinner() and TROT, not a pose)
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
    legFar: '#5b6764',
    tail: '#ecc9c3',
    mint: '#a6e0c8',
    paper: '#f0e7d0',
    folder: '#d9b877',
  };

  // An open eye, in a group so CSS can make Dottie blink (ask.css, .dottie-eye).
  const eye = (x, y, r = 2.1) =>
    `<g class="dottie-eye"><circle cx="${x}" cy="${y}" r="${r}" fill="${C.eye}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.34}" fill="#fff"/></g>`;

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

  /* The spinner opossum's running trot: 8 frames of one stride, drawn once in a straight side
   * view and shared by spinner() and the Muybridge sheet (docs/ask-mascot/possum-trot.svg, made
   * by tools/ask/dottie-sheet.mjs), so the two cannot drift.
   *
   * Gait, from the gait spec of 18 November 2026: Virginia opossums trot and do not bound
   * (Butcher et al. 2011, J. Exp. Biol. 214: 2631; Parchman et al. 2003 on the related
   * Monodelphis). The legs move in diagonal pairs, left hind with right fore, then right hind
   * with left fore; each foot is down for 3 frames of 8, so all four feet are up in frames 4
   * and 8. The body is 1 px low at mid-stance and 1 px high in flight (about 3 times the real
   * bob, so it shows); the back keeps one gentle arch; the head is low and the tail low and
   * trailing, both following the body one frame late. 90 ms a frame, 720 ms a stride.
   *
   * Units are pixels at the 56 px spinner: x forward (she faces right), y up, ground at y = 0.
   * Leg angles are the spec's keyframe table, in degrees from vertical, + = foot forward. Each
   * foot on the ground is planted 2 px further back every frame (TROT.step), so the body moves
   * 2 px a frame and ask.css can turn the ring at exactly that speed: the feet do not skate.
   * Feet in the air are kept at least 1 px off the ground. Far-side legs are a darker shade so
   * the diagonal pairs read. */
  const TROT = (() => {
    const rad = Math.PI / 180;
    const step = 2;
    // Body offset per frame (px): 0 at touch-down, -1 at mid-stance and push-off, +1 in flight.
    const bob = [0, -1, -1, 1, 0, -1, -1, 1];
    // How far the tail tip hangs below its root (px): the spec's tail angles of -15, -20, -25
    // and -20 degrees over the tail's 8 px reach.
    const tailDrop = [2, 3, 4, 3, 2, 3, 4, 3];
    // Hip or shoulder (x, height), segment lengths (thigh 1 : shin 1 : upper arm 0.85 :
    // forearm 0.95), which way the middle joint points (knee forward, elbow back), where the
    // foot is planted in its 3 frames on the ground (2.5 px ahead of the joint at touch-down,
    // 20% more reach and push-off than the spec's table), and the spec's angles for its 5
    // frames in the air.
    const limbs = {
      hind: {
        x: -4.5,
        y: 5.2,
        a: 3.2,
        b: 3.2,
        bend: 1,
        plant: [2.5, 0.5, -1.5],
        swing: [
          [15, -70],
          [25, -80],
          [50, -75],
          [80, -45],
          [80, -25],
        ],
      },
      fore: {
        x: 4.5,
        y: 5.8,
        a: 2.7,
        b: 3.05,
        bend: -1,
        plant: [2.5, 0.5, -1.5],
        swing: [
          [-60, 0],
          [-60, 15],
          [-60, 40],
          [-35, 60],
          [-10, 55],
        ],
      },
    };
    // Where the toes point from the ankle or wrist, by frame of the foot's own cycle (0 =
    // touch-down): hind soles flat on the ground, the hind toes trailing just after lift-off,
    // then swinging forward. A forefoot is just the round end of the leg at this size, and the
    // spec's 1 px heel lift at push-off is left out: it folded the leg flat at 56 px.
    const toes = {
      hind: [
        [1, 0],
        [1, 0],
        [1, 0],
        [-1, -1],
        [0, -1],
        [1, 0],
        [1, 0],
        [1, 0],
      ],
      fore: [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
      ],
    };
    const solve = (L, dx, dy) => {
      // Two-segment leg from the joint to the foot (dx, dy): returns the knee or elbow.
      const d = Math.min(Math.hypot(dx, dy), L.a + L.b - 1e-6);
      const c = Math.max(-1, Math.min(1, (L.a * L.a + d * d - L.b * L.b) / (2 * L.a * d)));
      const t = Math.atan2(dx, -dy) + L.bend * Math.acos(c);
      return [L.a * Math.sin(t), -L.a * Math.cos(t)];
    };
    // One leg in frame k; lag 0 for the pair that lands in frame 1, 4 for the other pair.
    const leg = (kind, k, lag) => {
      const L = limbs[kind];
      const j = (k - lag + 8) % 8;
      const hy = L.y + bob[k];
      let fx, fy;
      if (j < 3) {
        fx = L.x + L.plant[j];
        fy = 0;
      } else {
        const [s, t] = L.swing[j - 3];
        fx = L.x + L.a * Math.sin(s * rad) + L.b * Math.sin(t * rad);
        fy = Math.max(1, hy - L.a * Math.cos(s * rad) - L.b * Math.cos(t * rad));
      }
      fx = Math.round(fx);
      fy = Math.round(fy);
      const [kx, ky] = solve(L, fx - L.x, fy - hy);
      const [tx, ty] = toes[kind][j];
      // Knees and elbows snap to half pixels: whole pixels bend the short legs out of shape.
      const half = (n) => Math.round(n * 2) / 2;
      const p = [
        [L.x, hy],
        [half(L.x + kx), half(hy + ky)],
        [fx, fy],
      ];
      return tx || ty ? [...p, [fx + tx, fy + ty]] : p;
    };
    // Smooth path through points (Catmull-Rom as cubic Beziers).
    const smooth = (p) =>
      p.reduce((d, q, i) => {
        if (!i) return `M${q}`;
        const a = p[i - 2] || p[i - 1];
        const b = p[i - 1];
        const c = p[i + 1] || q;
        const c1 = [b[0] + (q[0] - a[0]) / 6, b[1] + (q[1] - a[1]) / 6];
        const c2 = [q[0] - (c[0] - b[0]) / 6, q[1] - (c[1] - b[1]) / 6];
        return `${d}C${c1} ${c2} ${q}`;
      }, '');
    // Frame k (0 to 7) as SVG, through a map from side-view pixels to the drawing:
    //   map.pt(x, y) -> [X, Y];  map.at(x, y, pitch) -> a transform for a rigid part
    //   (drawn in pixels, y down, facing right);  map.w(px) -> a stroke width.
    function frame(k, map) {
      const b = bob[k];
      const lagged = bob[(k + 7) % 8];
      const pts = (list) => list.map(([x, y]) => map.pt(x, y).map((n) => +n.toFixed(2)));
      const line = (list, color, width) =>
        `<path d="${smooth(pts(list))}" fill="none" stroke="${color}" stroke-width="${map.w(width)}" stroke-linecap="round" stroke-linejoin="round"/>`;
      const limb = (kind, lag, color) => {
        const p = pts(leg(kind, k, lag));
        return `<path d="M${p.join('L')}" fill="none" stroke="${color}" stroke-width="${map.w(1.9)}" stroke-linecap="round" stroke-linejoin="round"/>`;
      };
      // Tail: root in the rump, moving with the body; the tip hangs by the spec's angle.
      const ty = 7 + b;
      const drop = tailDrop[k];
      const tail = line(
        [
          [-8, ty],
          [-11, ty - drop * 0.45],
          [-14, ty - drop * 0.85],
          [-16, ty - drop],
          [-17.4, ty - drop + 1.1],
        ],
        C.tail,
        1.7,
      );
      // Trunk: a thick stroke along a gently arched back line.
      const trunk = line(
        [
          [-6.5, 6.8 + b],
          [-3, 7.7 + b],
          [0.5, 7.8 + b],
          [4, 7.3 + b],
          [6.5, 6.6 + b],
        ],
        C.fur,
        5,
      );
      // Head: snout forward and 15 degrees down, bobbing one frame after the body.
      const head = `<g transform="${map.at(8.5, 7.2 + lagged, 15)}"><g transform="scale(.9)">
        <circle cx="-.8" cy="-3.2" r="2" fill="${C.ear}"/>
        <path d="M-3 .8C-3.3-2.4-.5-4 2.4-3.4c2 .4 3.8 2 5.7 3.4.6.5.4 1.3-.4 1.4-2.4.4-5 1-7.5.7C-1.6 2-2.9 1.7-3 .8Z" fill="${C.face}"/>
        <circle cx="2.5" cy="-1.3" r=".8" fill="${C.eye}"/><circle cx="8.2" cy=".3" r="1.05" fill="${C.nose}"/></g></g>`;
      // Far-side (right) legs behind the body, darker; near-side (left) legs over it, so the
      // thigh's swing shows against the fur.
      return (
        tail +
        limb('hind', 4, C.legFar) +
        limb('fore', 0, C.legFar) +
        trunk +
        limb('hind', 0, C.leg) +
        limb('fore', 4, C.leg) +
        head
      );
    }
    // A straight side view: (x, y) pixels drawn at scale s with ground at (ox, oy).
    const straight = (ox, oy, s) => ({
      pt: (x, y) => [ox + x * s, oy - y * s],
      at: (x, y, pitch) =>
        `translate(${+(ox + x * s).toFixed(2)} ${+(oy - y * s).toFixed(2)}) scale(${s}) rotate(${pitch})`,
      w: (px) => +(px * s).toFixed(2),
    });
    return { frames: 8, ms: 90, step, stride: 8 * step, frame, straight };
  })();

  // The thinking spinner (48 x 48): three tiny opossums trot nose to tail round a ring,
  // clockwise, with Dottie's question-mark tail curled at the centre. Each is drawn in the 8
  // frames of TROT; ask.css shows one frame at a time (90 ms each) and turns the ring. With
  // reduced motion nothing moves and each shows frame 1 (touch-down, legs spread). Decorative,
  // like svg().
  function spinner() {
    const u = 48 / 56; // drawing units per pixel at 56 px
    // A revolution is exactly 7 strides (7 x 720 ms = 5.04 s, the dottie-spin period in
    // ask.css): side-view x maps to an angle through radius R, so the ring turns 2 px of x a
    // frame, the distance a planted foot moves back. The feet run on a circle of radius 12,
    // clear of the curl; up is outwards, so the feet are on the inside of the wheel.
    const R = (7 * TROT.stride * u) / (2 * Math.PI);
    const ground = 11.4;
    const still = 0;
    const ring = (turn) => {
      const a0 = (turn * Math.PI) / 180;
      const angle = (x) => a0 + (x * u) / R;
      return {
        pt: (x, y) => {
          const a = angle(x);
          const r = ground + y * u;
          return [24 + r * Math.sin(a), 24 - r * Math.cos(a)];
        },
        at: (x, y, pitch) => {
          const a = angle(x);
          const r = ground + y * u;
          return `translate(${+(24 + r * Math.sin(a)).toFixed(2)} ${+(24 - r * Math.cos(a)).toFixed(2)}) rotate(${+((a * 180) / Math.PI + pitch).toFixed(2)}) scale(${+u.toFixed(4)})`;
        },
        w: (px) => +(px * u).toFixed(2),
      };
    };
    const loop = TROT.frames * TROT.ms;
    // Each opossum is a third of a stride ahead of the one behind her: 120 degrees is 7/3
    // strides, so all three put their feet on the same spots of the ring.
    const possum = (turn, i) => {
      const map = ring(turn);
      const lead = (i * loop) / 3;
      let frames = '';
      for (let k = 0; k < TROT.frames; k++) {
        const delay = Math.round(((((k * TROT.ms - lead) % loop) + loop) % loop) - loop);
        frames += `<g class="dottie-trot"${k === still ? '' : ' opacity="0"'} style="animation-delay:${delay}ms">${TROT.frame(k, map)}</g>`;
      }
      return `<g class="dottie-runner">${frames}</g>`;
    };
    const curl = 'M24 29.6v-1.4c0-2 3.4-2.6 3.4-5.4 0-2.1-1.6-3.5-3.6-3.5-1.8 0-3.2 1-3.6 2.8';
    return (
      `<svg class="dottie dottie-spinner" viewBox="0 0 48 48" focusable="false" aria-hidden="true">
      <g class="dottie-ring">${[0, 120, 240].map(possum).join('')}</g>
      <path d="${curl}" fill="none" stroke="${C.tail}" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="24" cy="33.2" r="1.5" fill="${C.mint}"/></svg>`
        .replace(/>\s+</g, '><')
        // Two decimals is a hundredth of a 48-unit box: invisible, and it halves the markup.
        .replace(/(\d+\.\d\d)\d+/g, '$1')
    );
  }

  // trot: the spinner's 8 running frames, for the Muybridge sheet (TROT.frame with
  // TROT.straight draws one frame in plain side view).
  window.DKLADottie = { name: 'Dottie Docket', poses: Object.keys(poses), svg, spinner, trot: TROT };
})();
