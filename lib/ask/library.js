/* The shared answer library: when a first question (no follow-up history) is
   asked again, the answer given before is returned instead of researching it
   again and calling the model.

   A wrong match gives a law student a wrong answer, so only an EXACT match is
   served: the same normalised question, the same open entry (node) and the
   same answer version. Normalising only ignores case, accents, spacing and
   punctuation (and a "please" or "thanks" at the very start or end). Every
   word is kept, so "an oral contract" never matches "a contract". There is no
   near match.

   The answer version (VERSION below) is a hash of the Atlas corpus that
   api/ask.js answers from (work/build/ask-corpus.json.gz) together with
   ANSWER_VERSION. A deploy that changes the corpus makes every older answer
   unreachable; change ANSWER_VERSION whenever the prompts, the model or the
   way answers are written changes.

   Time-sensitive questions ("still good law", "overruled", "current", a
   year, ...) are never stored or served.

   Stored per entry: the normalised question, the open entry, the answer
   version, the answer (paragraphs, sources, search status) and when it was
   saved. Nothing about who asked: no IP, visitor id or analytics link. The
   library is only ever read by exact key; nothing lists it. Entries are used
   for 90 days; older ones are deleted when an answer is stored and, at most
   every few minutes, when one is looked up (and by the dashboard's storage
   housekeeping, lib/analytics/reports.js). Any database problem is
   swallowed by the caller: the library must never break Ask. */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { query, ready } from '../analytics/db.js';

export const MAX_AGE_DAYS = 90;
// Change this (any new value) when the prompts, the model or the answer
// format change, so answers written the old way are no longer served.
export const ANSWER_VERSION = 'answers-2026-11-11';
// The same corpus file api/ask.js loads (it is in the function's includeFiles).
const corpusFile = new URL('../../work/build/ask-corpus.json.gz', import.meta.url);
// How often one server instance deletes expired entries during lookups.
export const SWEEP_MINUTES = 10;

// The code that decides and writes answers: a change to any of them (routing,
// prompts, checks, the model call) also retires stored answers, so nobody has
// to remember to bump ANSWER_VERSION. They are in the function bundle anyway.
const codeFiles = ['./answer.js', './web.js', './retrieve.js', './openai.js', '../../api/ask.js'].map(
  (path) => new URL(path, import.meta.url),
);

let version;
/** The answer version: ANSWER_VERSION, the answering code and the corpus. */
export function answerVersion() {
  if (version) return version;
  // A code file missing from a bundle only weakens the version; the corpus must be there.
  const code = codeFiles.map((file) => readFile(file).catch(() => Buffer.from('missing:' + file.pathname)));
  version = Promise.all([...code, readFile(corpusFile)])
    .then((parts) => {
      const hash = createHash('sha256').update(ANSWER_VERSION);
      for (const bytes of parts) hash.update('\0').update(bytes);
      return hash.digest('hex');
    })
    .then((hash) => hash.slice(0, 32))
    .catch((error) => {
      version = undefined;
      throw error;
    });
  return version;
}

// Politeness that never changes the question: "please" opening it, and
// "please", "thanks" or "thank you" closing it after a comma, full stop,
// question mark or similar ("..., please", "...? Thanks"). Nothing else is
// ever dropped: when in doubt, a word is kept.
const leading = /^please\b[\s,]*/;
const trailing = /[,.?!;:]\s*(?:please|thanks|thank\s+you)[\s.!?]*$/;

// Questions whose answer can change with time: never stored or served.
// A number after §, "section" or "sec." is a statute section, not a year.
const timeSensitive = new RegExp(
  [
    String.raw`\b(?:today|now|nowadays|currently|current|latest|recent(?:ly)?|anymore|upcoming|pending|news)\b`,
    String.raw`\bthese\s+days\b|\bany\s+more\b|\bto\s+date\b|\bso\s+far\b|\bup\s+to\s+date\b|\bas\s+of\b`,
    String.raw`\bthis\s+(?:year|term|month|week)\b|\b(?:last|next)\s+(?:year|term)\b`,
    String.raw`\boverrul\w*|\boverturn\w*|\babrogat\w*|\bsupersed\w*|\brepeal\w*|\bamended\b|\bgood\s+law\b`,
    String.raw`\bstill\b|\byet\b|\bno\s+longer\b|\bremains?\b|\bmodern\b|\bdead\b|\bhappened\s+to\b`,
    String.raw`\brevers\w*|\bstr(?:uck|ike|iking)\s+down\b|\babolish\w*|\babandon\w*|\bvacat\w*`,
    String.raw`(?<!(?:§|\bsections?|\bsec\.?)\s*)\b(?:1\d|2[01])\d\d(?:'?s)?\b|\bfy\s*'?\d{2,4}\b|\b\d0'?s\b`,
  ].join('|'),
  'i',
);

/** The normalised form of a question: its exact lookup key. The browser
    has a copy (src/features/ask/saved.js); tools/ask/browser.mjs checks that
    the two agree. */
export function normalise(question) {
  let value = String(question)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, '-')
    .toLowerCase()
    .trim();
  for (let changed = true; changed; ) {
    changed = false;
    for (const pattern of [leading, trailing]) {
      const next = value.replace(pattern, '').trim();
      if (next !== value && next) {
        value = next;
        changed = true;
      }
    }
  }
  value = value
    .replace(/\bcan't\b|\bcannot\b/g, 'can not')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/n't\b/g, ' not')
    .replace(/§/g, ' section ')
    .replace(/\bsec\.\s*(?=\d)/g, 'section ')
    .replace(/\b(?:vs?\.?|versus)(?=\s)/g, ' v ')
    .replace(/(\d)\s+\(/g, '$1(');
  // Words, numbers (with their own dots, dashes and commas, such as 2-207 or
  // 1,000), rule citations such as 12(b)(6), and symbols that carry meaning.
  // Everything else (spaces, punctuation, apostrophes) only separates words.
  const tokens = value.match(
    /\d+[a-z]?(?:\([a-z0-9]+\))+|\d+(?:[-.:/,]\d+)*[a-z]*|\p{L}+(?:\d+[a-z]*)?|[$%&+<>=≤≥#]/gu,
  );
  return { key: (tokens || []).join(' ') };
}

// Characters a reader cannot see (format, private-use, unassigned and
// surrogate code points, variation selectors) or combining marks left after
// NFC. The key ignores them but the model would read them, so a question
// containing any is neither stored nor served.
const hidden = /[\p{Cf}\p{Co}\p{Cn}\p{Cs}\p{M}\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/u;

export function storable(question) {
  const text = String(question).normalize('NFC');
  if (hidden.test(text)) return false;
  // Checked as typed and as normalised (so "still-good-law" or extra spaces count too).
  return !timeSensitive.test(text) && !timeSensitive.test(normalise(question).key);
}

const live = `created_at > now() - interval '${MAX_AGE_DAYS} days'`;
const sweep = () => query(`DELETE FROM dkla_ask_answers WHERE NOT (${live})`);
let sweptAt = 0;

/** A stored answer for this question, or null. */
export async function findAnswer(question, node = '') {
  if (!storable(question)) return null;
  const { key } = normalise(question);
  if (!key) return null;
  const [current] = await Promise.all([answerVersion(), ready()]);
  // Expired entries are also deleted on lookups, at most every few minutes
  // per instance, alongside the lookup so it adds no waiting.
  const due = Date.now() - sweptAt >= SWEEP_MINUTES * 60_000;
  if (due) sweptAt = Date.now();
  const [rows] = await Promise.all([
    query(
      `SELECT answer, created_at FROM dkla_ask_answers
       WHERE node=$1 AND question_key=$2 AND version=$3 AND ${live}`,
      [node, key, current],
    ),
    due
      ? sweep().catch((error) => {
          sweptAt = 0;
          throw error;
        })
      : null,
  ]);
  const row = rows[0];
  if (!row) return null;
  const { paragraphs, sources, search } = row.answer ?? {};
  if (!Array.isArray(paragraphs) || !paragraphs.length || !Array.isArray(sources) || !sources.length)
    return null;
  return { paragraphs, sources, search, savedAt: new Date(row.created_at).toISOString() };
}

/** Keep a fresh answer (replacing any stored for the same question). */
export async function storeAnswer(question, node = '', { paragraphs, sources, search }) {
  if (!storable(question) || !paragraphs?.length || !sources?.length) return false;
  const { key } = normalise(question);
  if (!key) return false;
  const [current] = await Promise.all([answerVersion(), ready()]);
  await sweep();
  sweptAt = Date.now();
  await query(
    `INSERT INTO dkla_ask_answers(node, question_key, version, answer)
     VALUES($1,$2,$3,$4::jsonb)
     ON CONFLICT(node, question_key) DO UPDATE SET version=EXCLUDED.version,
       answer=EXCLUDED.answer, created_at=now()`,
    [node, key, current, JSON.stringify({ paragraphs, sources, search })],
  );
  return true;
}
