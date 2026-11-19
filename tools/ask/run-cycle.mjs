/* The run cycle of the Ask Dottie thinking spinner, computed offline.
 *
 *   node tools/ask/run-cycle.mjs            writes the cycle into src/features/ask/dottie.js
 *   node tools/ask/run-cycle.mjs --check    fails if dottie.js does not hold exactly this cycle
 *   node tools/ask/run-cycle.mjs --report   prints the numbers an animator would ask for
 *
 * Dottie is a rig, not a set of drawings: a body, a head, an ear, three tail pieces and four legs
 * (upper leg, lower leg, paw), each a small rigid shape that turns about its joint. This file
 * holds the rig's measurements and its artwork, describes one stride of her trot as curves, solves
 * the legs, and writes a table of 24 poses a stride for every part. dottie.js hands that table to
 * the browser's animation engine (Web Animations: transform only), which fills in every frame
 * between two poses on the compositor, at the screen's own refresh rate, with no script running.
 *
 * The world. The opossums run laps inside a ring, anticlockwise as runners do on a track, so the
 * one at the bottom is upright and heading right. The ground is the ring, a circle of radius
 * GROUND about the centre of the spinner; "up" is towards the centre. All lengths are in units of
 * one hundredth of the spinner's width. A point is kept as (angle run round the ring from six
 * o'clock, distance from the centre), and every part is placed by
 *     rotate(-angle) translate(0, distance) rotate(turn)
 * so that a paw on the ground has a constant distance and an angle that falls at a steady rate.
 * The ring carrying the opossum turns forward at exactly that rate (one stride of angle in one
 * stride of time, STRIDES strides to the lap), so a planted paw stays on its spot on the screen.
 * The browser interpolates each of the three numbers on its own, so this holds between the 24
 * poses too, not only at them.
 *
 * The gait. Virginia opossums trot: the legs work in diagonal pairs (Butcher et al. 2011, J. Exp.
 * Biol. 214: 2631). Near hind with far fore, then far hind with near fore, half a stride apart.
 * This is a running trot drawn the way a cartoon run is: each foot is down for 9 of the 24 poses
 * (a duty factor of 0.375), the fore foot of a pair lands one pose after its hind foot (so the
 * pair does not read as one twinned shape), and all four feet are off the ground for two poses in
 * each half of the stride. Per half stride the positions are the classic four: contact, down (the
 * body at its lowest and squashed, a little after contact), passing, and up (stretched, in the
 * air). The head moves less than the body and nods late; the ear and the three tail pieces follow
 * later still, each further behind than the one before. */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------- timing and the ring
export const KEYS = 24; // poses in one stride
export const STRIDES = 10; // strides in one lap of the ring
export const STRIDE_MS = 500; // one stride
const STRIDE = 360 / STRIDES; // degrees of ring in one stride
const GROUND = 46.5; // radius of the ground (where the paws land)
const STANCE = 9; // poses a foot is down
const FORE_LATE = 1; // poses by which a fore foot lands after its diagonal hind foot
const S = Number(process.env.DOTTIE_S ?? 0.95); // the size of the animal in that ring

// ---------------------------------------------------------------- small maths
const rad = Math.PI / 180;
const deg = 180 / Math.PI;
const rot = (a, [x, y]) => {
  const c = Math.cos(a * rad);
  const s = Math.sin(a * rad);
  return [x * c - y * s, x * s + y * c];
};
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (a) => Math.hypot(a[0], a[1]);
// Screen coordinates (x right, y down) with the centre of the ring at (0, 0). An angle is how far
// round the ring from six o'clock, forwards (anticlockwise).
const toPolar = ([x, y]) => [Math.atan2(x, y) * deg, Math.hypot(x, y)];
const fromPolar = (a, r) => [r * Math.sin(a * rad), r * Math.cos(a * rad)];
// The turn (clockwise, degrees) of a part that stands square on the ground at that angle.
const square = (a) => -a;
// A height above the ground, as a distance from the centre.
const up = (height) => GROUND - height;
const mod = (x, m = 1) => ((x % m) + m) % m;
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// A smooth curve through an animator's keys [phase, value] that repeats every `period`.
function cycle(knots, period = 1) {
  const n = knots.length;
  const at = (i) => {
    const turn = Math.floor(i / n);
    const k = knots[mod(i, n)];
    return [k[0] + turn * period, k[1]];
  };
  const slope = (i) => (at(i + 1)[1] - at(i - 1)[1]) / (at(i + 1)[0] - at(i - 1)[0]);
  return (x) => {
    x = mod(x - knots[0][0], period) + knots[0][0];
    let i = 0;
    while (i < n - 1 && at(i + 1)[0] <= x) i++;
    return hermite(at(i), at(i + 1), slope(i), slope(i + 1), x);
  };
}
// The same, once through, with the slopes at the two ends given.
function path(knots, slopeIn = 0, slopeOut = 0) {
  const n = knots.length;
  const slope = (i) =>
    i === 0
      ? slopeIn
      : i === n - 1
        ? slopeOut
        : (knots[i + 1][1] - knots[i - 1][1]) / (knots[i + 1][0] - knots[i - 1][0]);
  return (x) => {
    let i = 0;
    while (i < n - 2 && knots[i + 1][0] <= x) i++;
    return hermite(knots[i], knots[i + 1], slope(i), slope(i + 1), x);
  };
}
function hermite([x1, v1], [x2, v2], m1, m2, x) {
  const h = x2 - x1;
  const t = (x - x1) / h;
  return (
    (2 * t ** 3 - 3 * t ** 2 + 1) * v1 +
    (t ** 3 - 2 * t ** 2 + t) * m1 * h +
    (-2 * t ** 3 + 3 * t ** 2) * v2 +
    (t ** 3 - t ** 2) * m2 * h
  );
}

// ---------------------------------------------------------------- the gait, as curves
// Everything about the trunk repeats every half stride. h is the phase within a half stride:
// 0 = a hind foot touches down, 0.75 = it leaves, 0.83 to 1 = all four feet in the air.
const BOB = 1.55; // how far the body sinks and rises (units; about a third of a leg)
const bob = cycle(
  [
    [0.0, 0.8], // contact, already coming down
    [0.3, -1.0], // down
    [0.55, -0.4], // passing
    [0.8, 0.62], // pushing off
    [0.92, 1.0], // up, in the air
  ],
  1,
);
// Squash (negative) and stretch (positive): squashed just after the down position, stretched as
// she leaves the ground, back to her own shape at the top of the flight.
const squash = cycle(
  [
    [0.0, 0.25],
    [0.34, -1.0],
    [0.58, -0.1],
    [0.82, 1.0],
    [0.96, 0.45],
  ],
  1,
);
const SQUASH_TALL = 0.05; // 5% taller when stretched, 5% shorter when squashed
const SQUASH_LONG = 0.042; // and the opposite along her length, so her volume holds
const PITCH = 1.7; // degrees the body rocks nose down as it lands
const SURGE = 0.45; // degrees the body gains and loses along the ring within a half stride

// ---------------------------------------------------------------- the rig (animal units; x forward, y down)
const BODY_UP = 17.0; // height of the middle of the body above the ground, standing
const NECK = [10.8, 0.4]; // where the head joins the body
const TAIL_ROOT = [-13.2, 1.8];
const HEAD_TILT = 3; // degrees nose down against the ground under the head
const EAR = [4.86, -7.29]; // where the near ear joins the head
const TAIL_DROOP = 14; // degrees the tail leaves the rump pointing down
const TAIL = [
  // Each piece is a tapering arc: its length, the bend drawn into it (+ = down, towards the
  // ground; hers lifts and curls up like a question mark), its half-width at each end, and how
  // it moves: degrees it swings against the piece before it, and how late (in half strides).
  { length: 7.6, bend: -24, wide: [1.9, 1.55], sway: 5, lag: 0.1 },
  { length: 7.0, bend: -30, wide: [1.55, 1.2], sway: 8, lag: 0.24 },
  { length: 6.0, bend: -58, wide: [1.2, 0.85], sway: 12, lag: 0.4 },
];
const LEGS = {
  // joint: hip or shoulder on the body. upper/lower: segment lengths. bend: which way the knee
  // (+1, forward) or elbow (-1, back) points. centre: where on the ground, in degrees from the
  // joint, the paw is at the middle of its time down. lift: how high the paw is carried.
  // roll: degrees the heel has risen when the toes leave the ground.
  hind: { joint: [-9.2, 4.0], upper: 6.4, lower: 6.8, bend: 1, centre: 0.3, lift: 4.3, roll: 32 },
  fore: { joint: [8.2, 4.3], upper: 6.0, lower: 6.9, bend: -1, centre: 1.2, lift: 4.9, roll: 28 },
};
const FAR = [1.5, -0.5]; // the far-side joints sit this much forward and up, so the pairs separate
const FOOT = {
  // The paw turns about the ball of the foot (its origin), which is what stays planted; the ankle
  // is behind and above it.
  hind: { ankle: [-3.0, -1.4] },
  fore: { ankle: [-2.3, -1.35] },
};
// The four feet: which leg, which side, and the pose at which it lands.
const FEET = [
  { id: 'fh', leg: 'hind', far: true, down: KEYS / 2 },
  { id: 'ff', leg: 'fore', far: true, down: FORE_LATE },
  { id: 'nh', leg: 'hind', far: false, down: 0 },
  { id: 'nf', leg: 'fore', far: false, down: KEYS / 2 + FORE_LATE },
];

// ---------------------------------------------------------------- the artwork (animal units)
/* Colours are named, not written out, so the drawing takes Dottie's palette from dottie.js.
 * Simplified for the size it is seen at (an opossum is about 22 px tall): the legs are behind the
 * body as on the mascot sheet, so only the lower leg and the pink paw show under the belly; the
 * upper legs are fur (near side) or shadow (far side) and only shape the outline. */
const capsule = (r1, r2, length, fill) => {
  // A tapering limb from (0, 0), radius r1, to (0, length), radius r2.
  const s = (r1 - r2) / Math.abs(length);
  const c = Math.sqrt(1 - s * s);
  const y1 = Math.sign(length) * r1 * s;
  const y2 = length + Math.sign(length) * r2 * s;
  const f = (n) => +n.toFixed(2);
  const sweep = length > 0 ? 1 : 0;
  // The cap of the wider end goes more than half way round, the other less.
  const wide = s > 0 ? 1 : 0;
  return `<path d="M${f(-r1 * c)} ${f(y1)}A${r1} ${r1} 0 ${wide} ${sweep} ${f(r1 * c)} ${f(y1)}L${f(r2 * c)} ${f(y2)}A${r2} ${r2} 0 ${1 - wide} ${sweep} ${f(-r2 * c)} ${f(y2)}Z" fill="{${fill}}"/>`;
};
// A point along a tail piece (0 to 1), and the way it is heading there, in the piece's own frame.
function along(piece, t) {
  const b = piece.bend * rad * t;
  const l = piece.length * t;
  return Math.abs(b) < 1e-6 ? [[-l, 0], 0] : [[(-l * Math.sin(b)) / b, (l * (1 - Math.cos(b))) / b], b];
}
function arc(piece, fill) {
  const f = (n) => +n.toFixed(2);
  const upper = [];
  const lower = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [[x, y], b] = along(piece, t);
    const w = piece.wide[0] + (piece.wide[1] - piece.wide[0]) * t;
    // Across the piece: its heading (-cos b, sin b) turned a quarter.
    upper.push([f(x - w * Math.sin(b)), f(y - w * Math.cos(b))]);
    lower.unshift([f(x + w * Math.sin(b)), f(y + w * Math.cos(b))]);
  }
  const [w0, w1] = piece.wide;
  return `<path d="M${upper.join('L')}A${w1} ${w1} 0 0 0 ${lower[0]}L${lower.slice(1).join('L')}A${w0} ${w0} 0 0 0 ${upper[0]}Z" fill="{${fill}}"/>`;
}
const ART = {
  body: `<path d="M-9.8 7.8C-13.8 7.9-15.4 3.9-14.3-.6-13-6.2-6.6-8.3.2-8.1 6.2-7.9 11.6-5.4 12.9-.4 13.9 3.8 11.6 7.5 7.4 7.8 3 8.1-5 8.1-9.8 7.8Z" fill="{fur}"/><path d="M-8.4-2.8c2.2-1.6 4.4-2.3 7-2.5M1.6-4.6c2.3-.3 4.4.2 6.2 1.2M-10.4 2.6c1.2-1.1 2.6-1.7 4.2-1.9" fill="none" stroke="{shade}" stroke-width=".85" stroke-linecap="round"/>`,
  // The mascot's own head (dottie.js head()), about its neck, without the near ear and whiskers.
  head: `<g transform="scale(.54) translate(-82 -50)"><circle cx="84.4" cy="34" r="6" fill="{ear}"/><path d="M77.4 45.4C78.6 34.4 89.6 29.6 98.4 33.4c5.8 2.6 10 8.4 15 13.2 2 2 1.2 5-1.8 5.2-7.6.6-15.4 2.6-23.4 1.8-6.6-.6-11.2-3.4-10.8-8.2Z" fill="{face}"/><path d="M79.6 40.4C82.4 33.2 91.6 30.8 98.4 33.4c-4 2.2-7.6 5.6-9.6 10.4-3.4-1.6-6.4-2.8-9.2-3.4Z" fill="{cap}"/></g><circle cx="8.1" cy="-4.5" r="1.3" fill="{eye}"/><circle cx="8.55" cy="-4.95" r=".42" fill="#fff"/><ellipse cx="16.9" cy="-.35" rx="1.75" ry="1.5" fill="{nose}"/>`,
  ear: `<g transform="scale(.54) translate(-91 -36.5)"><circle cx="92" cy="31.2" r="6.2" fill="{ear}"/><path d="M86.6 28.6a6.2 6.2 0 0 1 9.8-1.8" fill="none" stroke="{face}" stroke-width="1.2" stroke-linecap="round" opacity=".75"/><circle cx="92.6" cy="32" r="3" fill="{pink}" opacity=".6"/></g>`,
  // Each tail piece from its joint at (0, 0) towards the tip, starting along -x; the first of
  // the tail is furred, as on the mascot.
  tail: TAIL.map(
    (piece, i) =>
      arc(piece, 'tail') +
      (i
        ? ''
        : arc({ ...piece, length: 2.6, bend: (piece.bend * 2.6) / piece.length, wide: [2, 1.95] }, 'leg')),
  ),
  // Upper legs run from the joint at (0, 0) down to the knee or elbow; lower legs from the ankle
  // at (0, 0) up to it; paws sit on the ground line y = 0 with the ball of the foot at (0, 0).
  upper: (leg, far) => capsule(2.4, 1.9, LEGS[leg].upper, far ? 'legFar' : 'legNear'),
  lower: (leg, far) => capsule(1.5, 1.9, -LEGS[leg].lower, far ? 'legFar' : 'legNear'),
  paw: (leg, far) =>
    leg === 'hind'
      ? `<path d="M-4.3 0C-4.8-2.2-2.2-3.1-.4-2.6 1.3-2.2 2.4-1.2 1.9 0Z" fill="{${far ? 'pawFar' : 'pink'}}"/>`
      : `<path d="M-3.5 0C-4-2.1-1.8-2.9-.3-2.5 1.2-2.1 2.2-1.1 1.7 0Z" fill="{${far ? 'pawFar' : 'pink'}}"/>`,
};
// The box each drawing needs, [left, top, width, height] about its joint, in animal units.
const BOX = {
  body: [-17, -10, 32.5, 20.5],
  head: [-4, -15, 24, 18.5],
  ear: [-4, -7.5, 8.5, 9],
  tail: [
    [-10.5, -6, 14, 9],
    [-9.5, -6, 12.5, 8.5],
    [-7.5, -6.5, 10, 9],
  ],
  upper: { hind: [-3.6, -3.6, 7.2, 12.9], fore: [-3.6, -3.6, 7.2, 12.5] },
  lower: { hind: [-3, -9.6, 6, 12.2], fore: [-3, -9.8, 6, 12.4] },
  paw: { hind: [-6, -4.2, 9.2, 5.2], fore: [-5.2, -4, 8.2, 5] },
};

// ---------------------------------------------------------------- one pose
// The turn (clockwise, degrees) that points a part's own "down" (0, 1) along d.
const turnDown = (d) => Math.atan2(-d[0], d[1]) * deg;

/* The whole animal at phase p (0 to 1) of the stride, or standing when p is null. Returns each
 * part as { at: [x, y] (its joint), turn (degrees clockwise), scale: [x, y] or undefined }. */
export function pose(p) {
  const standing = p === null;
  const h = standing ? 0 : mod(p * 2); // phase within the half stride
  const lift = standing ? 0 : BOB * bob(h);
  const sq = standing ? 0 : squash(h);
  const scale = [1 - SQUASH_LONG * sq, 1 + SQUASH_TALL * sq];
  const pitch = standing ? 0 : -PITCH * bob(h + 0.02);
  const surge = standing ? 0 : SURGE * Math.cos(2 * Math.PI * (h - 0.95));
  const centre = fromPolar(surge, up(S * BODY_UP + lift));
  const lean = square(surge) + pitch;
  // A point of the body, in the world.
  const onBody = ([x, y]) => add(centre, rot(lean, [S * x * scale[0], S * y * scale[1]]));
  const parts = {};
  parts.body = { at: centre, turn: lean, scale };

  // Head: it rides a calmer body (half the bob, a little late, no rocking), and nods after it.
  const calm = standing ? 0 : BOB * 0.5 * bob(h - 0.05);
  const reach = standing ? 0 : 0.5 * bob(h - 0.05);
  const lead = surge * 0.5 + reach;
  const neck = add(fromPolar(lead, up(S * BODY_UP + calm)), rot(square(lead), [S * NECK[0], S * NECK[1]]));
  const headTurn = square(toPolar(neck)[0]) + HEAD_TILT - (standing ? 0 : 2.8 * bob(h - 0.1));
  parts.head = { at: neck, turn: headTurn };
  // Ear: hinged on the head, flopping a quarter of a beat behind the body.
  parts.ear = {
    at: add(neck, rot(headTurn, [S * EAR[0], S * EAR[1]])),
    turn: headTurn + (standing ? 0 : 11 * bob(h - 0.27)),
  };

  // Tail: three pieces, each swinging later and wider than the one before.
  let joint = onBody(TAIL_ROOT);
  let turn = lean - TAIL_DROOP;
  TAIL.forEach((piece, i) => {
    turn -= standing ? 0 : piece.sway * bob(h - piece.lag);
    parts['tail' + (i + 1)] = { at: joint, turn };
    const [end] = along(piece, 1);
    joint = add(joint, rot(turn, [S * end[0], S * end[1]]));
    turn -= piece.bend;
  });
  parts.tailTip = { at: joint, turn };

  // Legs.
  for (const foot of FEET) {
    const leg = LEGS[foot.leg];
    const hip = onBody(foot.far ? add(leg.joint, FAR) : leg.joint);
    // Where the joint is when she stands: the paw's time on the ground is centred from there.
    const rest = toPolar(
      add(fromPolar(0, up(S * BODY_UP)), [S * (leg.joint[0] + (foot.far ? FAR[0] : 0)), S * leg.joint[1]]),
    )[0];
    const mid = rest + leg.centre;
    const reachDeg = (STANCE / KEYS) * STRIDE; // degrees of ground a paw covers while down
    let toe; // [angle, distance] of the ball of the foot
    let roll; // degrees the paw is turned, heel up
    if (standing) {
      // A relaxed stand: the four paws a little staggered so no two legs hide each other.
      const stagger = { nh: -3.5, fh: 4, nf: 3.5, ff: -4.5 }[foot.id];
      toe = [mid + stagger, GROUND];
      roll = 0;
    } else {
      const t = mod(p * KEYS - foot.down, KEYS); // poses since this foot landed
      if (t <= STANCE) {
        const u = t / STANCE;
        toe = [mid + (0.5 - u) * reachDeg, GROUND];
        roll = leg.roll * smooth((u - 0.58) / 0.42) ** 1.3;
      } else {
        const s = (t - STANCE) / (KEYS - STANCE);
        // Forward through the air. It leaves and arrives at the ground's own speed, so it is
        // already travelling back with the ground when it lands (no scuff, no snap).
        const ground = -STRIDE * (1 - STANCE / KEYS);
        const from = mid - reachDeg / 2;
        toe = [
          hermite([0, from], [1, from + reachDeg], ground, ground, s),
          up(S * leg.lift * Math.sin(Math.PI * s ** 0.88) ** 2),
        ];
        // Toes trail just after leaving, come through, lift ahead of the landing, land flat.
        roll = path(
          [
            [0, leg.roll],
            [0.2, leg.roll + 8],
            [0.5, 12],
            [0.8, -13],
            [1, 0],
          ],
          60,
          0,
        )(s);
      }
    }
    const footTurn = square(toe[0]) + roll;
    const ball = fromPolar(toe[0], toe[1]);
    let ankle = add(ball, rot(footTurn, [S * FOOT[foot.leg].ankle[0], S * FOOT[foot.leg].ankle[1]]));
    // Two-segment leg, hip to ankle. Never fully straight: a straight leg snaps as it bends.
    const a = S * leg.upper;
    const b = S * leg.lower;
    let d = sub(ankle, hip);
    const most = (a + b) * 0.985;
    const stretch = len(d) / (a + b);
    let slip = 0;
    if (len(d) > most) {
      // Only allowed in the air, where the paw can simply be carried closer.
      slip = len(d) - most;
      d = [(d[0] * most) / len(d), (d[1] * most) / len(d)];
      ankle = add(hip, d);
    }
    const along1 = Math.acos(Math.max(-1, Math.min(1, (a * a + len(d) ** 2 - b * b) / (2 * a * len(d)))));
    const knee = add(hip, rot(-leg.bend * along1 * deg, [(d[0] * a) / len(d), (d[1] * a) / len(d)]));
    const ballNow = sub(ankle, rot(footTurn, [S * FOOT[foot.leg].ankle[0], S * FOOT[foot.leg].ankle[1]]));
    parts[foot.id + 'Upper'] = { at: hip, turn: turnDown(sub(knee, hip)) };
    parts[foot.id + 'Lower'] = { at: ankle, turn: turnDown(sub(ankle, knee)) };
    parts[foot.id + 'Paw'] = { at: ballNow, turn: footTurn, toe, stretch, slip, knee };
  }
  return parts;
}

// ---------------------------------------------------------------- the table
// Parts from back to front.
const ORDER = [
  ...['fh', 'ff'].flatMap((id) => [id + 'Lower', id + 'Paw', id + 'Upper']),
  'tail3',
  'tail2',
  'tail1',
  ...['nh', 'nf'].flatMap((id) => [id + 'Lower', id + 'Paw', id + 'Upper']),
  'body',
  'head',
  'ear',
];
const artOf = (id) => {
  const foot = FEET.find((f) => id.startsWith(f.id));
  if (foot) {
    const kind = id.slice(2).toLowerCase();
    return [ART[kind](foot.leg, foot.far), BOX[kind][foot.leg]];
  }
  const tail = /^tail(\d)$/.exec(id);
  if (tail) return [ART.tail[tail[1] - 1], BOX.tail[tail[1] - 1]];
  return [ART[id], BOX[id]];
};
const round = (n, places) => {
  const f = 10 ** places;
  return Math.round(n * f) / f || 0;
};

/* Every part's 24 poses as [rotate, translate, rotate] (and [long, tall] for the body's squash).
 * Angles run on without wrapping, so the browser never takes the long way round between two
 * poses; a planted paw's angle is exactly a straight line across its time on the ground. */
export function build() {
  const poses = Array.from({ length: KEYS }, (_, k) => pose(k / KEYS));
  const stand = pose(null);
  // Ready for the browser: rotate(row[0]) translate(0, row[1]) rotate(row[2]).
  const row = (part) => {
    const [angle, distance] = toPolar(part.at);
    return [-angle, distance, part.turn + angle];
  };
  const unwrap = (rows, column) => {
    for (let k = 1; k < rows.length; k++)
      while (Math.abs(rows[k][column] - rows[k - 1][column]) > 180)
        rows[k][column] -= 360 * Math.sign(rows[k][column] - rows[k - 1][column]);
  };
  const parts = ORDER.map((id) => {
    const [art, box] = artOf(id);
    const rows = poses.map((at) => row(at[id]));
    const still = row(stand[id]);
    const paw = id.endsWith('Paw');
    if (paw) {
      // The ball of a planted paw: its exact line, not the line as recovered from the solved leg.
      poses.forEach((at, k) => {
        const foot = FEET.find((f) => id.startsWith(f.id));
        if (mod(k - foot.down, KEYS) <= STANCE) {
          rows[k][0] = -at[id].toe[0];
          rows[k][1] = at[id].toe[1];
          rows[k][2] = at[id].turn + at[id].toe[0];
        }
      });
    }
    // A stance that crosses the end of the table continues from the last pose.
    rows.push([...rows[0]]);
    unwrap(rows, 0);
    unwrap(rows, 2);
    const closing = rows.pop();
    for (const column of [0, 2])
      if (Math.abs(closing[column] - rows[0][column]) > 1e-6)
        throw Error(`${id} does not return to where it began (column ${column})`);
    // The first pose is the reference for the standing pose's angles.
    for (const column of [0, 2])
      while (Math.abs(still[column] - rows[0][column]) > 180)
        still[column] -= 360 * Math.sign(still[column] - rows[0][column]);
    const part = {
      id,
      box,
      art,
      k: rows.flatMap(([angle, distance, turn]) => [round(angle, 3), round(distance, 3), round(turn, 2)]),
      still: [round(still[0], 3), round(still[1], 3), round(still[2], 2)],
    };
    if (id === 'body') part.s = poses.flatMap((at) => at.body.scale.map((n) => round(n, 4)));
    return part;
  });
  return {
    ms: STRIDE_MS,
    keys: KEYS,
    strides: STRIDES,
    ground: GROUND,
    size: S,
    // For each foot: the pose at which it lands and the number of poses it stays down.
    feet: Object.fromEntries(FEET.map((f) => [f.id, [f.down, STANCE]])),
    parts,
  };
}

// What the browser will show between poses: each number interpolated on its own.
export function between(data, id, phase) {
  const part = data.parts.find((p) => p.id === id);
  const x = mod(phase) * data.keys;
  const k = Math.floor(x);
  const f = x - k;
  const next = (k + 1) % data.keys;
  return [0, 1, 2].map((c) => part.k[k * 3 + c] + (part.k[next * 3 + c] - part.k[k * 3 + c]) * f);
}

// ---------------------------------------------------------------- numbers an animator asks for
export function report(data = build()) {
  const lines = [];
  const perRev = data.strides * data.ms;
  lines.push(
    `One stride ${data.ms} ms in ${data.keys} poses; ${data.strides} strides to the revolution (${perRev} ms).`,
  );
  lines.push(
    `Ground radius ${data.ground}; a stride covers ${STRIDE} degrees = ${(STRIDE * rad * data.ground).toFixed(2)} units of ground.`,
  );
  let worst = 0;
  let straightest = 0;
  let slipped = 0;
  const steps = 240;
  for (const foot of FEET) {
    const [down, stance] = data.feet[foot.id];
    // Drift of the planted ball of the foot on the screen, in units, with the ring turning under it.
    let lo = [Infinity, Infinity];
    let hi = [-Infinity, -Infinity];
    if (down + stance >= data.keys) throw Error(`${foot.id}: a stance may not cross the end of the table`);
    for (let i = 0; i <= steps; i++) {
      const phase = (down + (stance * i) / steps) / data.keys;
      const [turned, distance] = between(data, foot.id + 'Paw', phase);
      // The ring has carried her forward one stride of angle per stride of time.
      const [x, y] = fromPolar(-turned + STRIDE * phase, distance);
      lo = [Math.min(lo[0], x), Math.min(lo[1], y)];
      hi = [Math.max(hi[0], x), Math.max(hi[1], y)];
    }
    const drift = Math.hypot(hi[0] - lo[0], hi[1] - lo[1]);
    worst = Math.max(worst, drift);
    for (let k = 0; k < data.keys; k++) {
      const at = pose(k / data.keys)[foot.id + 'Paw'];
      const planted = mod(k - down, data.keys) <= stance;
      if (planted) straightest = Math.max(straightest, at.stretch);
      if (planted && at.slip > 0) throw Error(`${foot.id} cannot reach the ground at pose ${k}`);
      slipped = Math.max(slipped, at.slip);
    }
  }
  lines.push(`Planted paws drift at most ${worst.toFixed(4)} units across their stance.`);
  lines.push(
    `Straightest planted leg: ${(straightest * 100).toFixed(1)}% of its length; most a paw is pulled in while in the air: ${slipped.toFixed(2)} units.`,
  );
  let inner = Infinity;
  for (let k = 0; k < data.keys; k++) {
    const at = pose(k / data.keys);
    inner = Math.min(inner, len(at.ear.at) - S * 6.6, len(at.tailTip.at) - S);
  }
  lines.push(`Nearest she comes to the centre (ear or tail tip): ${inner.toFixed(1)} units.`);
  const bytes = JSON.stringify(data).length;
  lines.push(`${data.parts.length} parts, ${bytes} bytes of table.`);
  return { lines, worst, inner };
}

// ---------------------------------------------------------------- write it into dottie.js
const BEGIN = '/* run-cycle:begin */';
const END = '/* run-cycle:end */';
export function block(data = build()) {
  const parts = data.parts
    .map((part) => {
      const fields = [
        `id: '${part.id}'`,
        `box: [${part.box}]`,
        `art: '${part.art}'`,
        `still: [${part.still}]`,
        `k: [${part.k}]`,
      ];
      if (part.s) fields.push(`s: [${part.s}]`);
      return `      { ${fields.join(', ')} },`;
    })
    .join('\n');
  return `${BEGIN}
  // Generated by tools/ask/run-cycle.mjs from the rig and the gait described there. Do not edit
  // by hand: change the generator and run it. prettier-ignore keeps the table on long lines.
  // prettier-ignore
  const RUN = {
    ms: ${data.ms}, keys: ${data.keys}, strides: ${data.strides}, ground: ${data.ground}, size: ${data.size},
    feet: ${JSON.stringify(data.feet).replace(/"/g, '')},
    parts: [
${parts}
    ],
  };
  ${END}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('../../src/features/ask/dottie.js', import.meta.url);
  const data = build();
  const { lines } = report(data);
  if (process.argv.includes('--report')) {
    console.log(lines.join('\n'));
  } else {
    const source = await readFile(file, 'utf8');
    const from = source.indexOf(BEGIN);
    const to = source.indexOf(END);
    if (from < 0 || to < 0) throw Error('dottie.js has no run-cycle block to fill');
    const next = source.slice(0, from) + block(data) + source.slice(to + END.length);
    if (process.argv.includes('--check')) {
      if (next !== source) {
        console.error(
          'dottie.js does not hold the cycle this generator makes. Run: node tools/ask/run-cycle.mjs',
        );
        process.exit(1);
      }
      console.log('Run cycle: dottie.js holds exactly what the generator makes. ' + lines[2]);
    } else {
      await writeFile(file, next);
      console.log(lines.join('\n'));
      console.log('Written to src/features/ask/dottie.js.');
    }
  }
}
