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
// whole: the phrase is the record's full or leading title, not a party's name.
// strong: the phrase holds a distinctive word or a number, so it names this record and not
// merely a common expression ("federal court", "court rules").
function names(title, distinctive) {
  const bare = title.replace(/\s*\([^)]*\)\s*$/, '');
  const found = new Map();
  const add = (words, whole, part = false) => {
    const strong = words.some((word) => distinctive(word) || /\d/.test(word));
    const name = words.join(' ');
    // A single common word is kept only as a whole title, for "what is consideration".
    // A number alone ("2015", "1983") names nothing; "Rule 12" and "§ 1983" carry their label.
    if (words.length === 1 && /^\d/.test(name)) return;
    if ((words.length > 1 || (strong && name.length >= 4) || (whole && name.length >= 3)) && !found.has(name))
      found.set(name, { name, words, whole, strong, part });
  };
  add(terms(bare), true);
  const head = bare.split(/\s+[·—–|]\s+|:\s|;\s/)[0];
  if (head !== bare) add(terms(head), true);
  // The parts of a topic title: "Battle of the forms under § 2-207" names "battle of the forms".
  if (!/\sv\.?\s/.test(bare))
    for (const part of bare.split(/\s+[·—–|]\s+|[:;,]\s+|\s+(?:and|under|in|for|from|after|before|with)\s+/i))
      if (part !== bare && part !== head) add(terms(part), true);
  // Two or three title words in a row ("strong inference" in "The PSLRA’s strong-inference
  // requirement"); they name the entry only when rare together (see indexCorpus).
  if (!/\sv\.?\s/.test(bare)) {
    const all = terms(bare);
    for (let size = 2; size <= 3; size++)
      for (let i = 0; i + size <= all.length; i++) add(all.slice(i, i + size), false, true);
  }
  for (const decision of bare.split(/;\s+/)) {
    const parties = decision.split(/\s+v(?:s)?\.?\s+/i);
    if (parties.length !== 2) continue;
    const short = parties.map((party) => {
      const words = terms(party.replace(/^in re\s+/i, '')).filter((word) => !generic.has(word));
      const end = words.findIndex(distinctive);
      // Also the next two words, so "Loper Bright" names the case as two words, not only "Loper".
      for (let more = end + 1; end >= 0 && more <= Math.min(end + 2, words.length - 1); more++)
        add(words.slice(0, more + 1), false);
      return end >= 0 ? words.slice(0, end + 1) : null;
    });
    for (const words of short) if (words) add(words, false);
    // Both parties, as in "Gustafson v. Alloyd": the case name itself.
    if (short[0] && short[1]) add([...short[0], ...short[1]], true);
  }
  return [...found.values()];
}

// Words that ask for a definition or an explanation and name nothing themselves.
const asking = new Set(
  'define definition meaning mean explain term word describe summarize summary'.split(' '),
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
  // Title words that appear together in at most one record in twenty (share 20) make a name
  // ("general jurisdiction", 4 % of records), but "federal court" (17 %) and "state court"
  // (31 %) do not. Words in a row from inside a title must be rarer, one record in 400:
  // "strong inference" (23 records) names its entry, "reform act" (69) does not.
  const rare = (words, share) => {
    const lists = [...new Set(words)]
      .map((word) => (ids.has(word) ? postings(anywhere, ids.get(word)) : new Uint32Array()))
      .sort((a, b) => a.length - b.length);
    let shared = lists[0];
    for (const list of lists.slice(1)) {
      const next = [];
      let j = 0;
      for (const r of shared) {
        while (j < list.length && list[j] < r) j++;
        if (list[j] === r) next.push(r);
      }
      shared = next;
    }
    return shared.length <= n / share;
  };
  // A party's single word names a case only when no other case or justice has it in its title:
  // "Iqbal" is one case, "Clinton" is two and "Oliver" is also a justice.
  const unambiguous = (word) => {
    const id = ids.get(word);
    if (id === undefined) return false;
    const cases = new Set();
    for (const r of postings(inTitle, id)) {
      const record = records[r];
      if (record.type === 'justice') return false;
      if (caseLike(record)) cases.add(caseKey(record.title));
    }
    return cases.size === 1;
  };

  // explain() returns the same sources as retrieve(), plus the signals the router uses to decide
  // whether the question names an Atlas entry:
  //   named     records the question names: { type, id, title, name, strong, defines, kind }.
  //             strong: by a multi-word or distinctive title phrase, a case name ("X v. Y"), a
  //             rule or section number, or one party word that names only this case. defines:
  //             the question asks only for this record's title, as in "what is a veto".
  //             phrases: the words of the question that named it. kind: 'case', 'statute' or
  //             'other'.
  //   scoped    the open entry was retrieved
  function explain(question, node) {
    const query = terms(question);
    const recognized = new Set(query.filter((word) => ids.has(word)));
    const empty = { sources: [], signals: { named: [], scoped: false } };
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
      const exact = index.titleSizes[r] > 1 && phrase.includes(' ' + index.phrases[r] + ' ');
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

    const subject = query.filter((word) => !asking.has(word));
    const named = chosen.flatMap(({ record }) => {
      const { type, id, title } = record;
      const found = names(title, distinctive).filter(({ name }) => phrase.includes(' ' + name + ' '));
      if (!found.length) return [];
      // A phrase of two or more words from a title; one distinctive word that heads a course entry
      // ("Erie: which law a federal court applies"); or one party word that names only this case.
      // A single dictionary word ("veto") names its entry only when it is the whole question.
      const strong = found.some(({ words, whole, strong, part }) =>
        part
          ? rare(words, 400)
          : words.length > 1
            ? strong || rare(words, 20)
            : strong && (whole ? type === 'node' || type === 'timeline' : unambiguous(words[0])),
      );
      // The question is nothing but this record's title ("what is a veto", "explain Chevron deference").
      const defines = found.some(
        ({ whole, words }) => whole && subject.length && subject.every((word) => words.includes(word)),
      );
      const kind = caseLike(record) ? 'case' : statuteLike(record) ? 'statute' : 'other';
      // titled: named by its title or a party's name, not only by words from inside its title.
      const titled = found.some(({ part }) => !part);
      const phrases = found.map(({ name }) => name);
      return [{ type, id, title, name: found[0].name, phrases, strong, defines, kind, titled }];
    });
    const scoped = chosen.some(({ record }) => record.type === 'node' && record.id === node);
    return { sources, signals: { named, scoped } };
  }

  const retrieve = (question, node) => explain(question, node).sources;
  retrieve.explain = explain;
  return retrieve;
}
