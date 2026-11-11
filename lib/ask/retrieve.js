const stop = new Set(
  'a an and are as at about be been by can case compare could did differ do does explain for from had has have how i in is it its me of on or please should tell than that the their them these they this those through to under use was were what when where which who why will with would you'.split(
    ' ',
  ),
);

function terms(value) {
  return (
    value
      .normalize('NFKD')
      .toLowerCase()
      .replace(/\p{M}/gu, '')
      .match(/[a-z]+|\d+(?:[-.]\d+)*/g) || []
  )
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

// The phrases a question can use to name a record: its title without the year, the part of the
// title before a dash, middle dot or colon ("Rule 12", "28 U.S.C. § 1332"), and for a case the
// shortest start of each party's name that holds a distinctive word ("International Shoe").
// whole: the phrase is the record's full or leading title, not a party's name.
// strong: the phrase holds a distinctive word or a number, so it names this record and not
// merely a common expression ("federal court", "court rules").
function names(title, distinctive) {
  const bare = title.replace(/\s*\([^)]*\)\s*$/, '');
  const found = new Map();
  const add = (words, whole) => {
    const strong = words.some((word) => distinctive(word) || /\d/.test(word));
    const name = words.join(' ');
    if ((words.length > 1 || (strong && name.length >= 4)) && !found.has(name))
      found.set(name, { name, words, whole, strong });
  };
  add(terms(bare), true);
  const head = bare.split(/\s+[·—–|]\s+|:\s|;\s/)[0];
  if (head !== bare) add(terms(head), true);
  for (const decision of bare.split(/;\s+/)) {
    const parties = decision.split(/\s+v(?:s)?\.?\s+/i);
    if (parties.length !== 2) continue;
    for (const party of parties) {
      const words = terms(party.replace(/^in re\s+/i, '')).filter((word) => !generic.has(word));
      const end = words.findIndex(distinctive);
      if (end >= 0) add(words.slice(0, end + 1), false);
    }
  }
  return [...found.values()];
}

// Words that ask for a definition or an explanation and name nothing themselves.
const asking = new Set(
  'define definition meaning mean explain term word describe summarize summary'.split(' '),
);

export function indexCorpus(records) {
  const frequency = new Map();
  const index = records.map((record) => {
    const title = new Set(terms(record.title));
    const headings = new Set([...title, ...terms(record.aliases)]);
    const excerpts = record.excerpts.map((text) => ({ text, words: new Set(terms(text)) }));
    const summary = new Set(terms(record.summary));
    const words = new Set([...headings, ...summary]);
    for (const excerpt of excerpts) for (const word of excerpt.words) words.add(word);
    for (const word of words) frequency.set(word, (frequency.get(word) || 0) + 1);
    return {
      record,
      title,
      headings,
      excerpts,
      summary,
      words,
      phrase: terms(record.title.replace(/\s*\(\d{4}\)$/, '')).join(' '),
    };
  });
  // A word in at most about one record in a hundred can name a case on its own (Erie, Iqbal, Shoe).
  const distinctive = (word) => !/^\d/.test(word) && (frequency.get(word) || 0) <= records.length / 100;

  // explain() returns the same sources as retrieve(), plus the signals the router uses to decide
  // whether the Atlas clearly covers the question:
  //   named     records the question names by title, rule number or a party's distinctive name:
  //             { type, id, title, name, strong, defines } (see names(); defines: the question
  //             asks only for this record's title, as in "what is a veto")
  //   coverage  share (0 to 1) of the question's weighted words found in the top four titles;
  //             a word the Atlas never uses counts fully against it
  //   scoped    the open entry was retrieved
  function explain(question, node) {
    const query = terms(question);
    const recognized = new Set(query.filter((word) => frequency.has(word)));
    const empty = { sources: [], signals: { named: [], coverage: 0, scoped: false } };
    if (!node && query.length >= 3 && recognized.size * 2 < new Set(query).size) return empty;
    const phrase = ' ' + query.join(' ') + ' ';
    const weight = [...recognized]
      .slice(0, 40)
      .map((word) => [word, Math.min(5, Math.log1p(records.length / (1 + (frequency.get(word) || 0))))]);
    const weights = new Map(weight);
    const overlap = (words) =>
      weight.reduce((score, [word, value]) => score + (words.has(word) ? value : 0), 0);
    const ranked = index
      .map((entry) => {
        const { record, title, headings, words, summary } = entry;
        const scoped = record.type === 'node' && record.id === node;
        const exact = title.size > 1 && phrase.includes(' ' + entry.phrase + ' ');
        const score =
          overlap(words) + 1.2 * overlap(headings) + 1.8 * overlap(title) + 0.35 * overlap(summary);
        return { ...entry, score: score + (exact ? 10 : 0) + (scoped ? 32 : 0) };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
    if (!ranked.length) return empty;

    const chosen = ranked.filter((entry) => entry.score >= ranked[0].score * 0.24).slice(0, 9);
    const sources = chosen.map((entry) => {
      const { type, id, title, category, summary } = entry.record;
      // A short rule fits as a whole. Selecting isolated passages can omit operative subsections.
      const fullRule =
        category === 'Rule' || type === 'authority'
          ? [summary, ...entry.record.excerpts].filter(Boolean).join('\n')
          : '';
      if (fullRule && fullRule.length <= 4100) return { type, id, title, category, text: fullRule };

      const passages = entry.excerpts
        .map((excerpt, order) => ({
          ...excerpt,
          order,
          score:
            overlap(excerpt.words) +
            (/^## (?:Holding|Rule|Reasoning|Citation)\b/i.test(excerpt.text) ? 1 : 0),
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
    const named = chosen.flatMap(({ record: { type, id, title } }) => {
      const found = names(title, distinctive).filter(({ name }) => phrase.includes(' ' + name + ' '));
      if (!found.length) return [];
      const strong = found.some((name) => name.strong);
      // The question is nothing but this record's title ("what is a veto", "explain Chevron deference").
      const defines = found.some(
        ({ whole, words }) => whole && subject.length && subject.every((word) => words.includes(word)),
      );
      return [{ type, id, title, name: found[0].name, strong, defines }];
    });
    const asked = [...new Set(query)].map((word) => [word, frequency.has(word) ? weights.get(word) || 0 : 5]);
    const titles = [...new Set(chosen.slice(0, 4).flatMap((entry) => [...entry.title]))];
    // "remove" is found in "Removal": the words share all but their last two letters (at least five).
    const inTitles = (word) =>
      titles.some((other) => {
        if (other === word) return true;
        const length = Math.max(5, Math.min(word.length, other.length) - 2);
        return word.length >= 5 && other.length >= 5 && word.slice(0, length) === other.slice(0, length);
      });
    const total = asked.reduce((sum, [, value]) => sum + value, 0);
    const coverage = total
      ? asked.reduce((sum, [word, value]) => sum + (inTitles(word) ? value : 0), 0) / total
      : 0;
    const scoped = chosen.some(({ record }) => record.type === 'node' && record.id === node);
    return { sources, signals: { named, coverage: Math.round(coverage * 100) / 100, scoped } };
  }

  const retrieve = (question, node) => explain(question, node).sources;
  retrieve.explain = explain;
  return retrieve;
}
