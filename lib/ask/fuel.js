/* Ask Dottie's fuel gauge: how much of the OpenAI credit is left, as a share of the credit
   at the start (the ring around the top-bar clock, src/features/fuel/).

   An ordinary OpenAI API key cannot read the prepaid credit balance, and the project has no
   admin key for OpenAI's Costs API. So DKLA keeps its own ledger. After every OpenAI response
   Dottie receives (lib/ask/openai.js createResponse), recordSpend() writes what that response
   cost: its input, cached-input and output tokens (from the response's `usage`) times the
   prices below, plus its web searches times the price of a search. A response that failed or
   stopped early (status failed or incomplete) still counts when OpenAI reported its usage.

   The balance left is the latest calibration point (a balance read from OpenAI's billing page,
   at a known time) minus the ledger's spending since that time. The gauge shows
   left / starting_usd from the same calibration row, clamped to 0..1. With no calibration row
   the gauge says so ("uncalibrated") and shows no number at all.

   Set a calibration point after deploy and after every refill (either works):
     node tools/ask/fuel-calibrate.mjs --balance 61.40 --start 79
     POST /api/admin?action=fuel-calibrate {"balance": 61.40, "start": 79} (signed-in dashboard)

   What the ledger cannot see, so the gauge can read a little high (recalibrate now and then):
   - a call cancelled or timed out before OpenAI sent its final usage (a cancelled research
     stream still counts the searches that had finished);
   - anything else charged to the same OpenAI credit (other projects, the Playground,
     tools/ask/live.mjs run without a database);
   - a price change, until PRICES below is updated.

   Stored per OpenAI call: when, the model, the token counts, the number of searches and the
   cost. Nothing about the question, the answer or who asked. */
import { query, ready } from '../analytics/db.js';

// US dollars per 1 million tokens, standard tier (Dottie sets no service_tier).
// Source: OpenAI, "GPT-5.4 mini" model page, https://developers.openai.com/api/docs/models/gpt-5.4-mini
// (read 18 November 2026): input $0.75, cached input $0.075, output $4.50 per 1M tokens.
// Reasoning tokens are part of output_tokens and are billed as output.
// Every model named in lib/ask/*.js must be listed here (tools/ask/fuel.test.mjs checks).
export const PRICES = {
  'gpt-5.4-mini': { input: 0.75, cached: 0.075, output: 4.5 },
};
// The web_search tool: $10.00 per 1,000 calls, plus search content tokens billed at the model's
// rates (those arrive in the response's input tokens, so they are already counted above).
// Source: OpenAI API pricing, "Tools" table, https://developers.openai.com/api/docs/pricing
// (read 18 November 2026). Every web_search_call item in a response is counted as one call,
// including page opens, so the gauge errs toward reading low rather than high.
export const SEARCH_USD = 10 / 1000;

// A model missing from PRICES is charged at the dearest rates listed, so the gauge errs low.
const dearest = Object.values(PRICES).reduce((a, b) => (a.output >= b.output ? a : b));
export function priceOf(model) {
  const name = String(model ?? '');
  if (PRICES[name]) return PRICES[name];
  // A dated snapshot ("gpt-5.4-mini-2026-03-17") has its family's price.
  const family = Object.keys(PRICES)
    .filter((key) => name.startsWith(key + '-'))
    .sort((a, b) => b.length - a.length)[0];
  return family ? PRICES[family] : dearest;
}

const count = (value) => (Number.isFinite(value) && value > 0 ? Math.round(value) : 0);

/** What one OpenAI response cost, or null when it reports nothing billable.
    searches: for a call cut off before its final response, the searches that had finished. */
export function costOf(model, response, searches) {
  const usage = response?.usage;
  const calls =
    searches ??
    (Array.isArray(response?.output)
      ? response.output.filter((item) => item?.type === 'web_search_call').length
      : 0);
  const input = count(usage?.input_tokens);
  const cached = Math.min(input, count(usage?.input_tokens_details?.cached_tokens));
  const output = count(usage?.output_tokens);
  if (!input && !output && !calls) return null;
  const price = priceOf(model);
  const usd =
    ((input - cached) * price.input + cached * price.cached + output * price.output) / 1e6 +
    calls * SEARCH_USD;
  return {
    model: String(model ?? 'unknown').slice(0, 80),
    input_tokens: input,
    cached_tokens: cached,
    output_tokens: output,
    searches: calls,
    usd: Math.round(usd * 1e8) / 1e8,
  };
}

// The ledger is optional: a missing, slow or failing database never delays an answer by more
// than this, and never breaks it.
export const LEDGER_WAIT_MS = 1500;

/** Write one call's cost to the ledger, quietly. Resolves true when it was written. */
export async function recordSpend(entry) {
  if (!entry) return false;
  let timer;
  try {
    return await Promise.race([
      (async () => {
        await ready();
        await query(
          `INSERT INTO dkla_ask_spend(model, input_tokens, cached_tokens, output_tokens, searches, usd)
           VALUES($1,$2,$3,$4,$5,$6)`,
          [
            entry.model,
            entry.input_tokens,
            entry.cached_tokens,
            entry.output_tokens,
            entry.searches,
            entry.usd,
          ],
        );
        return true;
      })(),
      new Promise((resolve) => {
        timer = setTimeout(resolve, LEDGER_WAIT_MS, false);
      }),
    ]);
  } catch (error) {
    if (error?.message !== 'not-configured') console.warn('Ask DKLA fuel ledger unavailable');
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const clamp = (value) => Math.min(1, Math.max(0, value));
const UNCALIBRATED = Object.freeze({ calibrated: false, fraction: null });

/** The gauge's state, with the dollar figures (for the owner only; the public route drops them).
    Only reads: it never creates tables (no ready()), so the public route writes nothing.
    Before the tables exist, or with no calibration row, it is uncalibrated. */
// A calibration point can also come from the project's environment (set in Vercel, no database
// access needed): DKLA_FUEL_BALANCE_USD, DKLA_FUEL_START_USD and DKLA_FUEL_AT (ISO time the balance
// was read). The newer of it and the latest database row is used.
export function envCalibration(env = process.env) {
  const balance = Number(env.DKLA_FUEL_BALANCE_USD);
  const starting = Number(env.DKLA_FUEL_START_USD);
  const at = new Date(env.DKLA_FUEL_AT || '');
  if (!(balance >= 0) || !(starting > 0) || Number.isNaN(at.getTime())) return null;
  return { at, balance, starting };
}
async function spentSince(at) {
  try {
    const rows = await query(
      'SELECT COALESCE(sum(usd), 0)::float8 AS spent FROM dkla_ask_spend WHERE at > $1',
      [at.toISOString()],
    );
    return Number(rows[0]?.spent) || 0;
  } catch (error) {
    if (error?.code === '42P01' || error?.message === 'not-configured') return 0;
    throw error;
  }
}
function statusFrom({ at, balance, starting, spent }) {
  const remaining = Number(balance) - Number(spent);
  return {
    calibrated: true,
    // To a tenth of a percent: smooth enough for the ring, and no per-question detail.
    fraction: Math.round(clamp(remaining / Number(starting)) * 1000) / 1000,
    calibratedAt: new Date(at).toISOString(),
    balanceUsd: Number(balance),
    startingUsd: Number(starting),
    spentUsd: Math.round(Number(spent) * 1e6) / 1e6,
    remainingUsd: Math.round(remaining * 1e6) / 1e6,
  };
}
export async function fuelStatus(env = process.env) {
  const fromEnv = envCalibration(env);
  let rows;
  try {
    rows = await query(
      `SELECT c.at, c.balance_usd::float8 AS balance, c.starting_usd::float8 AS starting,
         (SELECT COALESCE(sum(s.usd), 0)::float8 FROM dkla_ask_spend s WHERE s.at > c.at) AS spent
       FROM dkla_ask_fuel_calibration c ORDER BY c.at DESC, c.id DESC LIMIT 1`,
    );
  } catch (error) {
    // 42P01: the tables do not exist yet (no answer or calibration since the deploy).
    if (error?.code === '42P01' || error?.message === 'not-configured') rows = [];
    else throw error;
  }
  const row = rows[0] && Number(rows[0].starting) > 0 ? rows[0] : null;
  if (fromEnv && (!row || fromEnv.at > new Date(row.at)))
    return statusFrom({ ...fromEnv, spent: await spentSince(fromEnv.at) });
  if (!row) return { ...UNCALIBRATED };
  return statusFrom(row);
}

/** What the public route may show: the share left, never a dollar amount. */
export function publicFuel(status, now = new Date()) {
  return {
    fraction: status.calibrated ? status.fraction : null,
    calibrated: Boolean(status.calibrated),
    updatedAt: now.toISOString(),
  };
}

const invalid = (message) => Object.assign(new Error(message), { status: 400 });

/** Add a calibration point: the balance OpenAI's billing page showed (balance) and the credit
    the gauge counts as full (start), at `at` (default now). */
export async function calibrate({ balance, start, note = '', at } = {}) {
  const balanceUsd = Number(balance),
    startingUsd = Number(start);
  if (
    balance === '' ||
    balance === null ||
    !Number.isFinite(balanceUsd) ||
    balanceUsd < 0 ||
    balanceUsd > 1e6
  )
    throw invalid('invalid-balance');
  if (
    start === '' ||
    start === null ||
    !Number.isFinite(startingUsd) ||
    startingUsd <= 0 ||
    startingUsd > 1e6
  )
    throw invalid('invalid-start');
  if (typeof note !== 'string') throw invalid('invalid-note');
  let when = null;
  if (at !== undefined && at !== null && at !== '') {
    when = new Date(at);
    if (Number.isNaN(when.getTime()) || when.getTime() > Date.now() + 60_000) throw invalid('invalid-at');
  }
  await ready();
  const [row] = await query(
    `INSERT INTO dkla_ask_fuel_calibration(at, balance_usd, starting_usd, note)
     VALUES(COALESCE($1::timestamptz, now()), $2, $3, $4) RETURNING id, at`,
    [when?.toISOString() ?? null, balanceUsd, startingUsd, note.trim().slice(0, 200)],
  );
  return { id: Number(row.id), at: new Date(row.at).toISOString(), ...(await fuelStatus()) };
}
