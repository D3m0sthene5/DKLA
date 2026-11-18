/* Set Ask Dottie's fuel gauge from OpenAI's billing page (lib/ask/fuel.js).

     DATABASE_URL=<the site's Neon database> node tools/ask/fuel-calibrate.mjs --balance 61.40 --start 79

   --balance  the credit balance OpenAI's billing page shows now, in US dollars
   --start    the credit the gauge counts as full (the ring is full at this amount)
   --note     optional words to keep with the point ("refilled $50")
   --at       optional time the balance was read, if not now (ISO 8601, e.g. 2026-11-18T15:00:00-05:00)
   --show     print the gauge's current state and change nothing

   After a refill, run it again with the new balance and the new full amount. The database comes
   from ANALYTICS_DATABASE_URL or DATABASE_URL, as the site's server reads it. Dollar figures are
   printed here for the owner; the public gauge shows only the share left. */
import { parseArgs } from 'node:util';
import { calibrate, fuelStatus } from '../../lib/ask/fuel.js';

const { values } = parseArgs({
  options: {
    balance: { type: 'string' },
    start: { type: 'string' },
    note: { type: 'string', default: '' },
    at: { type: 'string' },
    show: { type: 'boolean', default: false },
  },
});

if (!process.env.ANALYTICS_DATABASE_URL && !process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL (or ANALYTICS_DATABASE_URL) to the site database first.');
  process.exit(2);
}
const dollars = (value) => '$' + Number(value).toFixed(2);
const describe = (status) =>
  status.calibrated
    ? `${Math.round(status.fraction * 1000) / 10}% left: ${dollars(status.remainingUsd)} of ${dollars(status.startingUsd)} ` +
      `(${dollars(status.balanceUsd)} at ${status.calibratedAt}, ${dollars(status.spentUsd)} spent since)`
    : 'uncalibrated: no calibration point yet';

try {
  if (values.show) console.log(describe(await fuelStatus()));
  else {
    if (values.balance === undefined || values.start === undefined) {
      console.error('Give both --balance and --start (in US dollars), or --show.');
      process.exit(2);
    }
    const balance = values.balance.replace(/^\s*\$/, '').trim(),
      start = values.start.replace(/^\s*\$/, '').trim();
    if (Number(balance) > Number(start))
      console.warn(`Note: the balance is above --start, so the ring will show full.`);
    const point = await calibrate({ balance, start, note: values.note, at: values.at });
    console.log(`Calibration point ${point.id} saved at ${point.at}. Gauge now ${describe(point)}.`);
  }
} catch (error) {
  console.error('Calibration failed: ' + error.message);
  process.exit(1);
}
