/* Dottie Docket, the Ask DKLA opossum.
 *
 * Every pose is drawn here as a small inline SVG, so the artwork costs no
 * request, works offline and scales on any screen. The sprite sheet in
 * docs/ask-mascot/ is generated from this file (tools/ask/dottie-sheet.mjs).
 *
 * Poses and the interface state that shows each one (see ask.js):
 *   face       the Ask DKLA launcher in Atlas search
 *   wink       the launcher on hover or keyboard focus
 *   curious    the empty dialog, beside "Try a question"
 *   reading    while Ask DKLA is researching
 *   carrying   an answer with sources: one joey per cited source (1 to 3)
 *   quiet      the sources did not establish an answer
 *   possum     offline, busy or unavailable: she plays possum
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
    tail: '#ecc9c3',
    mint: '#a6e0c8',
    paper: '#f0e7d0',
    folder: '#d9b877',
  };

  const eye = (x, y, r = 2.1) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.eye}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.34}" fill="#fff"/>`;

  // Front-facing head for the launcher (32 x 32).
  function face(wink) {
    return `
      <circle cx="8" cy="8.8" r="5.2" fill="${C.ear}"/><path d="M3.6 6.6a5.2 5.2 0 0 1 7.6-2" fill="none" stroke="${C.face}" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>
      <circle cx="24" cy="8.8" r="5.2" fill="${C.ear}"/><path d="M28.4 6.6a5.2 5.2 0 0 0-7.6-2" fill="none" stroke="${C.face}" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>
      <path d="M16 30.8c-2.6 0-10.4-9.4-10.4-15.2C5.6 10.2 10.2 7 16 7s10.4 3.2 10.4 8.6c0 5.8-7.8 15.2-10.4 15.2Z" fill="${C.face}"/>
      <path d="M9.6 9.4C12 7.2 20 7.2 22.4 9.4 20 10.4 17.8 12.4 16 16 14.2 12.4 12 10.4 9.6 9.4Z" fill="${C.cap}"/>
      ${eye(11.9, 16.4, 1.9)}
      ${
        wink
          ? `<path d="M18.3 16.8q1.8-1.8 3.6 0" fill="none" stroke="${C.eye}" stroke-width="1.5" stroke-linecap="round"/>`
          : eye(20.1, 16.4, 1.9)
      }
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

  const sparkle = (x, y, r) =>
    `<path class="dottie-spark" d="M${x} ${y - r}q.9 ${r - 0.9} ${r} ${r}q${-(r - 0.9)} .9 ${-r} ${r}q-.9 ${-(r - 0.9)} ${-r} ${-r}q${r - 0.9} -.9 ${r} ${-r}Z" fill="${C.mint}"/>`;

  const poses = {
    face: { box: '0 0 32 32', draw: () => face(false) },
    wink: { box: '0 0 32 32', draw: () => face(true) },
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
        const n = Math.max(1, Math.min(3, joeys));
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
        ][n - 1];
        return `${tail('?')}${legs(1)}${body}${spots
          .map(([x, y, s], i) => joey(i + 1, x, y, s))
          .join('')}${head({ tilt: -4, eyes: 'bright' })}`;
      },
    },
    quiet: {
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

  window.DKLADottie = { name: 'Dottie Docket', poses: Object.keys(poses), svg };
})();
