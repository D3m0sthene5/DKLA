import { createHash } from 'node:crypto';

const stop = new Set(
  'a an and are as at about be been by can case compare could did differ do does explain for from had has have how i in is it its me of on or please should tell than that the their them these they this those through to under use was were what when where which who why will with would you'.split(
    ' ',
  ),
);

const ascii = /^[\x00-\x7f]*$/;
export function terms(value) {
  const text = String(value ?? '');
  // Plain ASCII needs no accent folding; the result is the same, and it is most of the corpus.
  const folded = ascii.test(text)
    ? text.toLowerCase()
    : text.normalize('NFKD').toLowerCase().replace(/\p{M}/gu, '');
  return (folded.match(/[a-z]+|\d+(?:[-.]\d+)*/g) || [])
    .filter((word) => word.length > 1 || /^\d$/.test(word))
    .filter((word) => !stop.has(word))
    .map((word) =>
      word.length > 4 ? word.replace(/(?:ies$|s$)/, (ending) => (ending === 'ies' ? 'y' : '')) : word,
    );
}

// Party words that name no particular case.
const generic = new Set(
  'united state people city county town village company co inc corp corporation ltd llc board department dept commission commissioner ex rel re matter national american federal secretary director'.split(
    ' ',
  ),
);

export const caseLike = ({ type, category, title }) =>
  type === 'scotus' || type === 'brief' || category === 'Case' || /\sv\.?\s/.test(title);
export const statuteLike = ({ type, title }) =>
  type === 'authority' || /\b(?:Act|Code|Statute|Law)\b|U\.\s?S\.\s?C\.|§/.test(title);

// A party that is only a generic word and a place ("County of Erie", "City of Chicago", "State
// of Ohio") names no case: "Erie" is Erie Railroad Co. v. Tompkins, not Kenford Co. v. County of
// Erie. A party named by two or more distinctive words ("City of New York") still names.
const place = new Set(
  'county city town village state people commonwealth borough parish township district'.split(' '),
);
const placeParty = (party) => {
  const words = terms(party).filter((word) => !generic.has(word) || place.has(word));
  return words.some((word) => place.has(word)) && words.filter((word) => !place.has(word)).length === 1;
};
// The words of a title that can name it, as one string: for a case, the parties' names without
// a generic-and-place party; for anything else, the whole title.
function namingWords(title) {
  const bare = title.replace(/\s*\([^)]*\)\s*$/, '');
  if (!/\sv(?:s)?\.?\s/i.test(bare)) return ' ' + terms(bare).join(' ') + ' ';
  const parts = bare
    .split(/;\s+/)
    .flatMap((decision) => decision.split(/\s+v(?:s)?\.?\s+/i))
    .map((party) => party.split(/\s+[—–]\s+/)[0])
    .filter((party) => !placeParty(party));
  return ' ' + parts.map((party) => terms(party).join(' ')).join(' | ') + ' ';
}

// One key per decision, so the opinion entry, its vote record and its brief count as one case.
function caseKey(title) {
  const bare = title
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+supplement$/i, '')
    .split(/\s+[—–]\s+|;\s+/)[0];
  return terms(bare)
    .filter((word) => !generic.has(word))
    .join(' ');
}

// The phrases a question can use to name a record: its title without the year, the part of the
// title before a dash, middle dot or colon ("Rule 12", "28 U.S.C. § 1332"), and for a case the
// shortest start of each party's name that holds a distinctive word ("International Shoe").
// whole: the phrase is the record's full or leading title, or a part of it between punctuation.
// party: one party's name. both: the case name itself, both parties ("Gustafson v. Alloyd").
function names(title, distinctive) {
  const bare = title.replace(/\s*\([^)]*\)\s*$/, '');
  const isCase = /\sv(?:s)?\.?\s/i.test(bare);
  const found = new Map();
  const add = (words, whole, party = false, both = false) => {
    const strong = words.some((word) => distinctive(word) || /\d/.test(word));
    const name = words.join(' ');
    // A number alone ("2015", "1983") names nothing; "Rule 12" and "§ 1983" carry their label.
    if (words.length === 1 && /^\d/.test(name)) return;
    // A case name that is only generic words names no case: "Will v. United States" is
    // "united state" once the stopword "will" is gone, and "the United States" is no case.
    if (isCase && words.every((word) => generic.has(word))) return;
    if ((words.length > 1 || (strong && name.length >= 4) || (whole && name.length >= 3)) && !found.has(name))
      found.set(name, { name, words, whole, party, both });
  };
  add(terms(bare), true);
  const head = bare.split(/\s+[·—–|]\s+|:\s|;\s/)[0];
  if (head !== bare) add(terms(head), true);
  // The parts of a title between punctuation: "28 U.S.C. § 1652 — Rules of Decision Act" names
  // "Rules of Decision Act". Not parts between "and" or "under": "American Clean Energy and
  // Security Act" does not name a "Security Act".
  if (!/\sv\.?\s/.test(bare))
    for (const part of bare.split(/\s+[·—–|]\s+|[:;,]\s+/))
      if (part !== bare && part !== head) add(terms(part), true);
  // Words from inside a title ("strong inference" in "The PSLRA’s strong-inference requirement")
  // name nothing: the question must use the title, a part of it, a case name or a number.
  for (const decision of bare.split(/;\s+/)) {
    const parties = decision.split(/\s+v(?:s)?\.?\s+/i);
    if (parties.length !== 2) continue;
    const short = parties.map((party) => {
      if (placeParty(party.split(/\s+[—–]\s+/)[0])) return null;
      const words = terms(party.replace(/^in re\s+/i, '')).filter((word) => !generic.has(word));
      const end = words.findIndex(distinctive);
      // Also the next two words, so "Loper Bright" names the case as two words, not only "Loper".
      for (let more = end + 1; end >= 0 && more <= Math.min(end + 2, words.length - 1); more++)
        add(words.slice(0, more + 1), false, true);
      return end >= 0 ? words.slice(0, end + 1) : null;
    });
    for (const words of short) if (words) add(words, false, true);
    // Both parties, as in "Gustafson v. Alloyd": the case name itself.
    if (short[0] && short[1]) add([...short[0], ...short[1]], true, false, true);
  }
  return [...found.values()];
}

// Rule and section numbers. Each rule or statute record gets keys such as "frcp 12",
// "usc 28 1332", "ucc 2-207" or "rest 90", and a question's citations, in any common spelling,
// are reduced to the same keys: "12(b)(6)", "rule 12(b)(6)", "FRCP 12" and "Fed. R. Civ. P. 12"
// are "frcp 12"; "28 usc 1332" and "28 U.S.C. § 1332" are "usc 28 1332". A bare "§ 1983" or
// "section 1983" is only a section number; it names a record when one key has that number.
export function recordCites({ type, category, id, title }) {
  if (type !== 'authority' && !(type === 'node' && category === 'Rule')) return [];
  const keys = [];
  let m;
  if ((m = id.match(/^(?:cp-)?frcp-(\d+(?:\.\d+)?)$/))) keys.push('frcp ' + m[1]);
  if ((m = title.match(/^(\d+)\s*U\.\s?S\.\s?C\.\s*§+\s*(\d+[a-z]?)\b/i)))
    keys.push(`usc ${m[1]} ${m[2].toLowerCase()}`);
  if ((m = title.match(/^UCC\s*§+\s*(\d[a-z]?-\d+[a-z]?)\b/i))) keys.push('ucc ' + m[1].toLowerCase());
  if ((m = title.match(/^Restatement(?:\s*\(Second\))?\s*§\s*(\d+)\b/i))) keys.push('rest ' + m[1]);
  if ((m = title.match(/^APA\s*§\s*(\d+)\b/i))) keys.push('usc 5 ' + m[1]);
  return keys;
}
export function questionCites(question) {
  const keys = new Set();
  const sections = new Set();
  let rest = ' ' + String(question).toLowerCase() + ' ';
  const take = (pattern, found) => {
    rest = rest.replace(pattern, (...groups) => {
      found(...groups.slice(1));
      return ' ';
    });
  };
  // 28 U.S.C. § 1332, 28 USC 1332, 42 U.S.C. 1983
  take(
    /\b(\d{1,2})\s*u\.?\s?s\.?\s?c\.?\s*(?:a\.?\s*)?(?:§+|sec(?:tion|s?\.)?)?\s*(\d+[a-z]?)(?![\w-])/g,
    (title, section) => keys.add(`usc ${title} ${section}`),
  );
  // UCC 2-207, UCC § 2-207
  take(/\bucc\s*(?:§+|sec(?:tion|\.)?)?\s*(\d[a-z]?-\d+[a-z]?)(?![\w-])/g, (section) =>
    keys.add('ucc ' + section),
  );
  // Restatement § 90, Restatement (Second) of Contracts § 90
  take(
    /\brestatement(?:\s*\(?(?:second|2d)\)?)?(?:\s+of\s+contracts)?\s*(?:§+|sec(?:tion|\.)?)?\s*(\d+)(?![\w-])/g,
    (section) => keys.add('rest ' + section),
  );
  // APA § 553, APA 706: sections of title 5.
  take(/\bapa\s*(?:§+|sec(?:tion|\.)?)?\s*(\d{3})(?![\w-]|\.\d)/g, (section) => keys.add('usc 5 ' + section));
  // Rule 12(b)(6), FRCP 56, Fed. R. Civ. P. 56, Federal Rule 23. Not "Florida Rule 1.442".
  take(
    /\b(?:f\.?\s?r\.?\s?c\.?\s?p\.?|fed\.?\s*r\.?\s*civ\.?\s*p(?:roc)?\.?|federal\s+rules?(?:\s+of\s+civil\s+procedure)?|rules?)\s*(\d{1,2}(?:\.\d)?)(?![\w-]|\.\d)((?:\([a-z0-9]{1,3}\))*)/g,
    (rule, subdivisions) => keys.add('frcp ' + rule),
  );
  // § 1983, section 1983, sec. 1983, § 2-207
  take(/(?:§+|\bsec(?:tion|s?\.)?)\s*(\d+[a-z]?(?:-\d+[a-z]?)?)(?![\w-])/g, (section) =>
    sections.add(section),
  );
  // A bare rule number with its subdivisions, only where it is a motion or defense: "a 12(b)(6)
  // motion", "dismiss under 12(b)(6)". "A 10(b) claim" is the Exchange Act, not Rule 10.
  take(
    /(?<![\w§.-])(\d{1,2})((?:\((?:[a-z]|\d{1,2})\))+)(?=\s*(?:motions?|dismiss\w*|defen[cs]es?)\b)/g,
    (rule) => keys.add('frcp ' + rule),
  );
  take(
    /\b(?:dismiss\w*|motions?|defen[cs]es?)\s+(?:under|pursuant to|for)\s+(\d{1,2})((?:\((?:[a-z]|\d{1,2})\))+)/g,
    (rule) => keys.add('frcp ' + rule),
  );
  // "12(b)(6)" on its own is always the motion to dismiss ("what is 12(b)(6)", "the 12(b)(6)
  // standard"); no statute section is commonly cited that way.
  take(/(?<![\w§.-])(12)\(b\)(?:\(\d\))?(?![\w(-])/g, (rule) => keys.add('frcp ' + rule));
  // rest: the question with every citation taken out.
  return { keys, sections, rest };
}

// "what is a filibuster", "define res judicata", "consideration?": the question is nothing but a
// dictionary headword, alone or after "what is", "define" or "meaning of". headword() returns
// the words such a question names, in a form a title can be compared with.
const defining =
  /^\s*(?:wh?att?(?:\s*['’]\s*s|\s+(?:is|are|was|were))|whats|define|definition(?:\s+of)?|meaning(?:\s+of)?|what\s+(?:does|do))\s+/i;
export const headwordOf = (text) =>
  (
    String(text)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .match(/[a-z0-9]+/g) || []
  )
    .filter((word) => word !== 'a' && word !== 'an' && word !== 'the')
    .map((word) => (word.length > 3 ? word.replace(/s$/, '') : word))
    .join(' ');
export const headword = (question) =>
  headwordOf(
    String(question)
      .replace(defining, '')
      .replace(/\s+mean\s*[?.!]*\s*$/i, ''),
  );

// The retrieval index: for each word, the records that use it in their title, their headings
// (title and aliases), their summary, and anywhere (with the excerpts). Building it reads every
// excerpt, about 1.5 s for the published corpus, so the build stores it beside the corpus
// (tools/ask/build.mjs) and a server cold start only loads it.
const FIELDS = ['words', 'headings', 'title', 'summary'];
export function buildIndex(records) {
  const ids = new Map();
  const vocab = [];
  const lists = Object.fromEntries(FIELDS.map((field) => [field, []]));
  const phrases = [];
  const titleSizes = [];
  records.forEach((record, r) => {
    const title = new Set(terms(record.title));
    const headings = new Set([...title, ...terms(record.aliases)]);
    const summary = new Set(terms(record.summary));
    const words = new Set([...headings, ...summary]);
    for (const text of record.excerpts) for (const word of terms(text)) words.add(word);
    for (const word of words)
      if (!ids.has(word)) {
        ids.set(word, vocab.length);
        vocab.push(word);
        for (const field of FIELDS) lists[field].push(null);
      }
    for (const [field, set] of [
      ['words', words],
      ['headings', headings],
      ['title', title],
      ['summary', summary],
    ])
      for (const word of set) (lists[field][ids.get(word)] ??= []).push(r);
    phrases.push(terms(record.title.replace(/\s*\(\d{4}\)$/, '')).join(' '));
    titleSizes.push(title.size);
  });
  const fields = {};
  for (const field of FIELDS) {
    const offsets = new Uint32Array(vocab.length + 1);
    let total = 0;
    lists[field].forEach((list, id) => {
      offsets[id] = total;
      total += list?.length ?? 0;
    });
    offsets[vocab.length] = total;
    const postings = new Uint32Array(total);
    lists[field].forEach((list, id) => list && postings.set(list, offsets[id]));
    fields[field] = { offsets, postings };
  }
  return { records: records.length, vocab, phrases, titleSizes, fields };
}

// File format: "DKLAIDX1", a 4-byte header length, the JSON header, padding to 4 bytes, then
// each field's offsets and postings as little-endian 32-bit integers. corpus is the SHA-256 of
// the gzipped corpus file it was built from; a stale or foreign index is ignored.
const MAGIC = 'DKLAIDX1';
export const corpusDigest = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function serializeIndex(index, corpus) {
  const header = Buffer.from(
    JSON.stringify({
      corpus,
      records: index.records,
      vocab: index.vocab,
      phrases: index.phrases,
      titleSizes: index.titleSizes,
      sizes: FIELDS.map((field) => index.fields[field].postings.length),
    }),
  );
  const start = Math.ceil((12 + header.length) / 4) * 4;
  const arrays = FIELDS.flatMap((field) => [index.fields[field].offsets, index.fields[field].postings]);
  const out = Buffer.alloc(start + arrays.reduce((sum, array) => sum + array.byteLength, 0));
  out.write(MAGIC, 0, 'latin1');
  out.writeUInt32LE(header.length, 8);
  header.copy(out, 12);
  let at = start;
  for (const array of arrays) {
    Buffer.from(array.buffer, array.byteOffset, array.byteLength).copy(out, at);
    at += array.byteLength;
  }
  return out;
}
export function parseIndex(bytes, corpus) {
  if (bytes.length < 12 || bytes.toString('latin1', 0, 8) !== MAGIC) return null;
  const length = bytes.readUInt32LE(8);
  const header = JSON.parse(bytes.toString('utf8', 12, 12 + length));
  if (header.corpus !== corpus) return null;
  // One aligned copy, so the integer views need no per-field copies.
  let at = Math.ceil((12 + length) / 4) * 4;
  const data = new Uint32Array((bytes.length - at) >> 2);
  Buffer.from(data.buffer).set(bytes.subarray(at, at + data.byteLength));
  at = 0;
  const take = (count) => data.subarray(at, (at += count));
  const fields = {};
  FIELDS.forEach((field, i) => {
    const offsets = take(header.vocab.length + 1);
    fields[field] = { offsets, postings: take(header.sizes[i]) };
  });
  return {
    records: header.records,
    vocab: header.vocab,
    phrases: header.phrases,
    titleSizes: header.titleSizes,
    fields,
  };
}

export function indexCorpus(records, prebuilt) {
  const index = prebuilt?.records === records.length ? prebuilt : buildIndex(records);
  const ids = new Map(index.vocab.map((word, id) => [word, id]));
  const { words: anywhere, title: inTitle } = index.fields;
  const n = records.length;
  const postings = (field, id) => field.postings.subarray(field.offsets[id], field.offsets[id + 1]);
  const frequency = (word) => {
    const id = ids.get(word);
    return id === undefined ? 0 : anywhere.offsets[id + 1] - anywhere.offsets[id];
  };
  // A word in at most about one record in a hundred can name a case on its own (Erie, Iqbal, Shoe).
  const distinctive = (word) => !/^\d/.test(word) && frequency(word) <= n / 100;
  // A party's name names a case only when no other case or justice has it in its title:
  // "Iqbal" and "International Shoe" are one case each, "Clinton" is two and "Oliver" is also
  // a justice. The opinion entry, its vote record and its brief count as one case (caseKey).
  const unambiguous = (words) => {
    const lists = words
      .map((word) => (ids.has(word) ? postings(inTitle, ids.get(word)) : new Uint32Array()))
      .sort((a, b) => a.length - b.length);
    const phrase = ' ' + words.join(' ') + ' ';
    const cases = new Set();
    for (const r of lists[0]) {
      if (!lists.every((list) => list.includes(r))) continue;
      const record = records[r];
      if (!namingWords(record.title).includes(phrase)) continue;
      if (record.type === 'justice') return false;
      // Case records only: a timeline titled "from Gray v. Powell to Loper Bright" is no case.
      if (caseLike(record) && record.type !== 'timeline') cases.add(caseKey(record.title));
    }
    return cases.size === 1;
  };
  // Which statute keys have each section number, for a bare "§ 1983". Court rules are not
  // sections: "§ 12" never names Rule 12. Nor does a bare number name a Restatement section
  // ("section 230" is the Communications Decency Act to most people, not Restatement § 230) or
  // an APA section ("section 702" may be FISA): those need "Restatement", "APA" or "5 U.S.C."
  // (bareSection). They still make a number ambiguous: "section 90" is not 28 U.S.C. § 90.
  const bareSection = (key) => !/^(?:rest|usc 5) /.test(key);
  const sections = new Map();
  for (const record of records)
    for (const key of recordCites(record)) {
      if (key.startsWith('frcp ')) continue;
      const section = key.split(' ').at(-1);
      if (!sections.has(section)) sections.set(section, new Set());
      sections.get(section).add(key);
    }

  // explain() returns the same sources as retrieve(), plus the signals the router uses to decide
  // whether the question names an Atlas entry:
  //   named     retrieved records the question names: { type, id, title, kind, by, phrases }.
  //             by: 'cite' (a rule or section number), 'case' (a case name or one party's name
  //             that no other case has), 'act' (a statute's own title with "Act" or "Code"),
  //             'headword' (the whole question is a dictionary headword, "what is a veto") or
  //             'title' (the open entry by its title). Nothing else names an entry: a topic
  //             phrase that happens to be in a title does not. kind: 'case', 'statute' or
  //             'other'. phrases: title phrases found in the question. naming: the phrases
  //             among them that name the record (the router checks a template's subject against
  //             them). cites: the citation keys that named it. words: the words of its title.
  //   scoped    the open entry was retrieved
  //   cites     { keys, unresolved }: every citation key in the question, and the bare section
  //             numbers that name no single statute
  function explain(question, node) {
    const query = terms(question);
    const recognized = new Set(query.filter((word) => ids.has(word)));
    const empty = { sources: [], signals: { named: [], scoped: false, cites: { keys: [], unresolved: [] } } };
    if (!node && query.length >= 3 && recognized.size * 2 < new Set(query).size) return empty;
    const phrase = ' ' + query.join(' ') + ' ';
    const weight = [...recognized]
      .slice(0, 40)
      .map((word) => [word, Math.min(5, Math.log1p(n / (1 + frequency(word))))]);
    const overlap = (words) =>
      weight.reduce((score, [word, value]) => score + (words.has(word) ? value : 0), 0);
    // The same sums as adding each matched word's weight in order, record by record.
    const field = (name) => {
      const score = new Float64Array(n);
      for (const [word, value] of weight)
        for (const r of postings(index.fields[name], ids.get(word))) score[r] += value;
      return score;
    };
    const [inWords, inHeadings, inTitles, inSummary] = FIELDS.map(field);
    const ranked = [];
    for (let r = 0; r < n; r++) {
      const record = records[r];
      const scoped = record.type === 'node' && record.id === node;
      // The title as a phrase of the question; a one-word title only when it is the whole
      // question ("what is consideration"), so the dictionary entry itself is retrieved.
      const exact =
        (index.titleSizes[r] > 1 && phrase.includes(' ' + index.phrases[r] + ' ')) ||
        (index.titleSizes[r] === 1 && query.length === 1 && index.phrases[r] === query[0]);
      const score =
        inWords[r] +
        1.2 * inHeadings[r] +
        1.8 * inTitles[r] +
        0.35 * inSummary[r] +
        (exact ? 10 : 0) +
        (scoped ? 32 : 0);
      if (score > 0) ranked.push({ record, score });
    }
    ranked.sort((a, b) => b.score - a.score);
    if (!ranked.length) return empty;

    const chosen = ranked.filter((entry) => entry.score >= ranked[0].score * 0.24).slice(0, 9);
    const sources = chosen.map(({ record }) => {
      const { type, id, title, category, summary } = record;
      // A short rule fits as a whole. Selecting isolated passages can omit operative subsections.
      const fullRule =
        category === 'Rule' || type === 'authority'
          ? [summary, ...record.excerpts].filter(Boolean).join('\n')
          : '';
      if (fullRule && fullRule.length <= 4100) return { type, id, title, category, text: fullRule };

      const passages = record.excerpts
        .map((text, order) => ({
          text,
          order,
          score:
            overlap(new Set(terms(text))) + (/^## (?:Holding|Rule|Reasoning|Citation)\b/i.test(text) ? 1 : 0),
        }))
        .sort((a, b) => b.score - a.score || a.order - b.order)
        .slice(0, 3)
        .sort((a, b) => a.order - b.order);
      return {
        type,
        id,
        title,
        category,
        text: [summary, ...passages.map((p) => p.text)].filter(Boolean).join('\n').slice(0, 4100),
      };
    });

    // The rule and section numbers the question cites, as keys; a bare section number counts when
    // only one key has it.
    const cited = questionCites(question);
    const single = (section) => {
      const keys = sections.get(section);
      return keys?.size === 1 && bareSection([...keys][0]) ? [...keys][0] : null;
    };
    for (const section of cited.sections) if (single(section)) cited.keys.add(single(section));
    const asked = headword(question);
    const named = chosen.flatMap(({ record }) => {
      const { type, id, title } = record;
      const kind = caseLike(record) ? 'case' : statuteLike(record) ? 'statute' : 'other';
      const found = names(title, distinctive).filter(({ name }) => phrase.includes(' ' + name + ' '));
      const phrases = found.map(({ name }) => name);
      // naming: the phrases that name this record (the router checks that a question's subject
      // is exactly one of them). cites: the citation keys the question used for it.
      // words: the words of the title, so a subject can be checked to use nothing else.
      const words = [...new Set(terms(title.replace(/\s*\([^)]*\)\s*$/, '')))];
      const entry = (by, naming = [], cites = []) => [
        { type, id, title, kind, by, phrases, naming, cites, words },
      ];
      // A rule or section number in any common spelling ("12(b)(6)", "28 usc 1332", "§ 1983").
      const keys = recordCites(record).filter((key) => cited.keys.has(key));
      if (keys.length) return entry('cite', [], keys);
      // A case name: both parties ("Gustafson v. Alloyd"), the full title, or one party's name
      // that no other case or justice has ("Iqbal", "International Shoe"; not "Gustafson").
      const casing =
        kind === 'case'
          ? found.filter(
              ({ words, whole, party, both }) =>
                both || (whole && words.length > 1) || (party && unambiguous(words)),
            )
          : [];
      if (casing.length)
        return entry(
          'case',
          casing.map(({ name }) => name),
        );
      // A statute by its own title with "Act" or "Code" ("the Securities Act of 1933").
      const acting = /\b(?:Act|Code)\b/.test(title)
        ? found.filter(
            ({ words, whole }) =>
              whole && words.length > 1 && (words.includes('act') || words.includes('code')),
          )
        : [];
      if (acting.length)
        return entry(
          'act',
          acting.map(({ name }) => name),
        );
      // The whole question is a dictionary headword ("what is a filibuster", "define res judicata").
      if (type === 'term' && asked && headwordOf(title) === asked) return entry('headword');
      // The open entry, by its own title.
      const titled = found.filter(({ whole }) => whole);
      if (type === 'node' && id === node && titled.length)
        return entry(
          'title',
          titled.map(({ name }) => name),
        );
      return [];
    });
    const scoped = chosen.some(({ record }) => record.type === 'node' && record.id === node);
    // cites: every citation key in the question, and the bare section numbers no single statute
    // has ("§ 12": several), which name nothing.
    const unresolved = [...cited.sections].filter((section) => !single(section));
    return { sources, signals: { named, scoped, cites: { keys: [...cited.keys], unresolved } } };
  }

  const retrieve = (question, node) => explain(question, node).sources;
  retrieve.explain = explain;
  return retrieve;
}
