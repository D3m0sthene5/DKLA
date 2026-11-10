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

  return function retrieve(question, node) {
    const query = terms(question);
    const recognized = new Set(query.filter((word) => frequency.has(word)));
    if (!node && query.length >= 3 && recognized.size * 2 < new Set(query).size) return [];
    const phrase = ' ' + query.join(' ') + ' ';
    const weight = [...recognized]
      .slice(0, 40)
      .map((word) => [word, Math.min(5, Math.log1p(records.length / (1 + (frequency.get(word) || 0))))]);
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

    return ranked
      .filter((entry) => entry.score >= ranked[0].score * 0.24)
      .slice(0, 9)
      .map((entry) => {
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
        const { type, id, title, category, summary } = entry.record;
        return {
          type,
          id,
          title,
          category,
          text: [summary, ...passages.map((p) => p.text)].filter(Boolean).join('\n').slice(0, 4100),
        };
      });
  };
}
