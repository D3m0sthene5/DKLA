/* The shared answer library: when a first question (no follow-up history) is
   asked again, the answer given before is returned instead of researching it
   again and calling the model.

   A wrong match gives a law student a wrong answer, so matching is strict:
   - exact: the same normalised question (case, punctuation, spacing and a few
     filler phrases such as "please" or "can you explain" ignored);
   - near: almost the same content words (Jaccard >= 0.85), in the same order,
     and every number, rule or statute citation, capitalised name, question
     word, negation and legal role word (majority, dissent, plaintiff, ...)
     identical.
   Both require the same open entry (node). Time-sensitive questions ("still
   good law", "latest", "current") are never stored or served.

   Stored per entry: the normalised question, its match signature and content
   words, the answer (paragraphs, sources, search status) and when it was
   saved. Nothing about who asked: no IP, visitor id or analytics link. The
   library is only ever read by exact key or signature; nothing lists it.
   Entries expire after 90 days. Any database problem is swallowed by the
   caller: the library must never break Ask. */
import { query, ready } from '../analytics/db.js';

export const MAX_AGE_DAYS = 90;
const NEAR = 0.85;

// Phrases at the start that do not change what is being asked. Applied
// repeatedly, longest first. "can you" alone is NOT filler: "Can you appeal
// a denial of summary judgment?" is a legal question about what a party may do.
const leading = [
  /^(?:hey|hi|hello)\s+dottie\b/,
  /^dottie\b/,
  /^(?:please|kindly)\b/,
  /^(?:can|could|would|will)\s+you\s+(?:please\s+)?(?=(?:explain|define|tell\s+me)\b)/,
  /^(?:i\s+(?:want|would\s+like)|id\s+like)\s+to\s+know\b/,
  /^explain\s+to\s+me\b/,
  /^explain\b/,
  /^define\b/,
  /^tell\s+me\s+about\b/,
  /^what\s+is\s+meant\s+by\b/,
  /^what\s+is\b/,
  /^whats\b/,
];
const trailing = [/\b(?:please|thanks|thank\s+you|for\s+me)$/];

// Words that can never differ between two questions called the same.
const guarded = new Set(
  (
    'who whom whose what when where why how which whether not no nor never without except unless ' +
    'majority dissent dissenting dissents concurrence concurring concurrences plurality holding held dicta dictum ' +
    'plaintiff plaintiffs defendant defendants appellant appellee petitioner respondent ' +
    'federal state civil criminal before after first last more less most least earlier later ' +
    'overrule overrules overruled overruling affirm affirmed reverse reversed reversal'
  ).split(' '),
);
// Ignored when comparing content words (the exact key still keeps them).
const minor = new Set('a an the of about me my i please dottie'.split(' '));
// Common sentence starters: capitalised only because they begin a sentence.
const starters = new Set(
  (
    'a an the is are was were do does did can could would will should may might must has have had ' +
    'what who whom whose when where why how which whether explain define describe compare tell please ' +
    'in on of for to under if after before during under i it this that these those there give list ' +
    'summarize contrast distinguish name hey hi hello dottie'
  ).split(' '),
);
const timeSensitive =
  /\b(?:today|now|currently|current|latest|recent(?:ly)?|this (?:year|term|month|week)|still (?:good law|valid|binding|in effect)|as of|upcoming|pending|news)\b/i;

function clean(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, '-');
}

function words(text) {
  let value = clean(text)
    .toLowerCase()
    .replace(/\bcan't\b|\bcannot\b/g, 'can not')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/n't\b/g, ' not')
    .replace(/'s\b/g, 's')
    .replace(/'/g, '')
    .replace(/§§/g, ' sections ')
    .replace(/§/g, ' section ')
    .replace(/\bsec\.\s*(?=\d)/g, 'section ')
    .replace(/\b(?:vs?\.?|versus)(?=\s)/g, ' v ')
    .replace(/\b([a-z])\.(?=[a-z]\.)/g, '$1')
    .replace(/\b([a-z])\.(?=\s|$)/g, '$1')
    .replace(/(\d)\s+\(/g, '$1(');
  const tokens =
    value.match(/\d+[a-z]?(?:\([a-z0-9]+\))+|\d+(?:[-.:/]\d+)*[a-z]*|[\p{L}]+(?:\d+[a-z]*)?/gu) || [];
  // Strip filler from the token string, then split again.
  value = tokens.join(' ');
  for (let changed = true; changed; ) {
    changed = false;
    for (const pattern of leading) {
      const next = value.replace(pattern, '').trim();
      if (next !== value && next) {
        value = next;
        changed = true;
      }
    }
    for (const pattern of trailing) {
      const next = value.replace(pattern, '').trim();
      if (next !== value && next) {
        value = next;
        changed = true;
      }
    }
  }
  return value.split(' ').filter((word) => word && word !== 'please');
}

// Capitalised words in the question as typed (case names, acronyms such as UCC).
function names(text) {
  const found = [];
  const typed = clean(text);
  for (const { 0: word, index } of typed.matchAll(/\p{L}[\p{L}']*/gu)) {
    if (!/^\p{Lu}/u.test(word) || word.length < 2 || /^I'/.test(word)) continue;
    const lower = word.toLowerCase().replace(/'s$/, '').replace(/'/g, '');
    const sentenceStart = /(?:^|[.?!:;])\s*$/.test(typed.slice(0, index));
    if (sentenceStart && starters.has(lower)) continue;
    if (lower === 'vs') continue;
    found.push(lower);
  }
  return [...new Set(found)].sort();
}

/** The normalised form of a question and what a near match must share. */
export function normalise(question) {
  const sequence = words(question);
  const key = sequence.join(' ');
  const content = sequence.filter((word) => !minor.has(word));
  const fixed = sequence.filter((word) => /\d/.test(word) || guarded.has(word) || word === 'section').sort();
  return {
    key,
    content,
    signature: JSON.stringify([fixed, names(question)]),
  };
}

export function storable(question) {
  return !timeSensitive.test(question);
}

/** Whether two normalised questions may share an answer. */
export function sameQuestion(a, b) {
  if (a.key === b.key) return true;
  if (a.signature !== b.signature) return false;
  const left = new Set(a.content),
    right = new Set(b.content);
  if (!left.size || !right.size) return false;
  const shared = [...left].filter((word) => right.has(word));
  const union = new Set([...left, ...right]).size;
  if (shared.length / union < NEAR) return false;
  // Order matters: "Does A overrule B?" is not "Does B overrule A?".
  const common = new Set(shared);
  const order = (list) => list.filter((word) => common.has(word)).join(' ');
  return order(a.content) === order(b.content);
}

const live = `created_at > now() - interval '${MAX_AGE_DAYS} days'`;

/** A stored answer for this question, or null. */
export async function findAnswer(question, node = '') {
  if (!storable(question)) return null;
  const wanted = normalise(question);
  if (!wanted.key) return null;
  await ready();
  const exact = await query(
    `SELECT answer, created_at FROM dkla_ask_answers WHERE node=$1 AND question_key=$2 AND ${live}`,
    [node, wanted.key],
  );
  let row = exact[0];
  if (!row) {
    const near = await query(
      `SELECT question_key, content, answer, created_at FROM dkla_ask_answers
       WHERE node=$1 AND signature=$2 AND ${live} ORDER BY created_at DESC LIMIT 40`,
      [node, wanted.signature],
    );
    row = near.find((candidate) =>
      sameQuestion(wanted, {
        key: candidate.question_key,
        content: candidate.content,
        signature: wanted.signature,
      }),
    );
  }
  if (!row) return null;
  const { paragraphs, sources, search } = row.answer ?? {};
  if (!Array.isArray(paragraphs) || !paragraphs.length || !Array.isArray(sources) || !sources.length)
    return null;
  return { paragraphs, sources, search, savedAt: new Date(row.created_at).toISOString() };
}

/** Keep a fresh answer (replacing any stored for the same question). */
export async function storeAnswer(question, node = '', { paragraphs, sources, search }) {
  if (!storable(question) || !paragraphs?.length || !sources?.length) return false;
  const { key, content, signature } = normalise(question);
  if (!key) return false;
  await ready();
  await query(`DELETE FROM dkla_ask_answers WHERE NOT (${live})`);
  await query(
    `INSERT INTO dkla_ask_answers(node, question_key, signature, content, answer)
     VALUES($1,$2,$3,$4::jsonb,$5::jsonb)
     ON CONFLICT(node, question_key) DO UPDATE SET signature=EXCLUDED.signature,
       content=EXCLUDED.content, answer=EXCLUDED.answer, created_at=now()`,
    [node, key, signature, JSON.stringify(content), JSON.stringify({ paragraphs, sources, search })],
  );
  return true;
}
