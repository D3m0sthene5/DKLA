import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { body, sameOrigin, send } from '../lib/analytics/security.js';
import { citeAnswer, generateAnswer, InvalidCitations } from '../lib/ask/answer.js';
import { findAnswer, storeAnswer } from '../lib/ask/library.js';
import { indexCorpus } from '../lib/ask/retrieve.js';
import { answerWithSearch, shouldSearch } from '../lib/ask/web.js';

const corpus = new URL('../work/build/ask-corpus.json.gz', import.meta.url);
let index;
async function retrieve(question, node) {
  index ??= readFile(corpus)
    .then((bytes) => JSON.parse(gunzipSync(bytes)))
    .then(indexCorpus)
    .catch((error) => {
      index = undefined;
      throw error;
    });
  return (await index)(question, node);
}

function validHistory(history) {
  return (
    Array.isArray(history) &&
    history.length <= 3 &&
    history.every(
      (turn) =>
        turn &&
        typeof turn === 'object' &&
        Object.keys(turn).every((key) => key === 'question' || key === 'answer') &&
        typeof turn.question === 'string' &&
        typeof turn.answer === 'string' &&
        turn.question.trim() &&
        turn.answer.trim() &&
        turn.question.length <= 600 &&
        turn.answer.length <= 2000,
    )
  );
}

// The shared answer library (lib/ask/library.js) is optional: when the
// database is missing, slow or failing, Ask answers exactly as before.
async function quietly(work, ms = 2500) {
  let timer;
  try {
    return await Promise.race([
      work(),
      new Promise((resolve) => {
        timer = setTimeout(resolve, ms, null);
      }),
    ]);
  } catch (error) {
    if (error.message !== 'not-configured') console.warn('Ask DKLA answer library unavailable');
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function makeAskHandler(
  generate = generateAnswer,
  research = answerWithSearch,
  library = { find: findAnswer, store: storeAnswer },
) {
  return async function ask(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('allow', 'POST');
      return send(res, 405, { error: 'method-not-allowed' });
    }
    let search = 'not-needed';
    try {
      sameOrigin(req);
      if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json')
        return send(res, 415, { error: 'unsupported-content-type' });
      // history: up to three earlier turns of this conversation, sent by the
      // browser so a follow-up can say "that case". Follow-ups are never stored.
      // fresh: skip the answer library and replace its entry with a new answer.
      const { question, node, history, fresh } = await body(req, 12288);
      if (
        typeof question !== 'string' ||
        !question.trim() ||
        question.length > 600 ||
        (node !== undefined && (typeof node !== 'string' || !/^[\w.-]{1,120}$/.test(node))) ||
        (history !== undefined && !validHistory(history)) ||
        (fresh !== undefined && typeof fresh !== 'boolean')
      )
        return send(res, 400, { error: 'invalid-question' });
      const earlier = history?.map((turn) => ({
        question: turn.question.trim(),
        answer: turn.answer.trim(),
      }));

      const apiKey = process.env.DKLA_OPENAI_API_KEY?.trim();
      if (!apiKey) return send(res, 503, { error: 'not-configured' });

      const query = question.trim();
      // Only a first question can be answered from, or added to, the library:
      // a follow-up depends on the conversation before it.
      const shelf = earlier?.length ? null : (node ?? '');
      if (shelf !== null && !fresh) {
        const kept = await quietly(() => library.find(query, shelf));
        if (kept)
          return send(res, 200, {
            paragraphs: kept.paragraphs,
            sources: kept.sources,
            search: kept.search ?? 'not-needed',
            cached: true,
            savedAt: kept.savedAt,
          });
      }
      // A new answer that cites a source is kept for the next visitor who asks.
      // One written after web search failed is incomplete, so it is not kept.
      const answered = async (answer) => {
        if (
          shelf !== null &&
          answer.paragraphs?.length &&
          answer.sources?.length &&
          answer.search !== 'unavailable'
        )
          await quietly(() =>
            library.store(query, shelf, {
              paragraphs: answer.paragraphs,
              sources: answer.sources,
              search: answer.search,
            }),
          );
        return send(res, 200, answer);
      };
      // A follow-up is looked up together with the question before it.
      const lookup = earlier?.length ? earlier.at(-1).question + ' ' + query : query;
      const atlas = await retrieve(lookup, node);
      const signal = AbortSignal.timeout(29_000);
      let draft;
      if (!shouldSearch(lookup, atlas)) {
        if (!atlas.length) return send(res, 200, { paragraphs: [], sources: [], search });
        const output = await generate({ apiKey, question: query, earlier, sources: atlas, search, signal });
        if (!output.needsWeb) return answered({ ...citeAnswer(output, atlas), search });
        draft = output;
      }

      try {
        const context = atlas.find((source) => source.type === 'node' && source.id === node)?.title;
        const answer = await research({
          apiKey,
          question: query,
          earlier,
          context,
          sources: atlas.slice(0, 6),
          signal,
        });
        return answered({ ...answer, search: 'searched' });
      } catch (error) {
        if ([401, 402, 403].includes(error.statusCode)) throw error;
        const status = Number.isInteger(error.statusCode)
          ? error.statusCode
          : error.name === 'TimeoutError' || error.name === 'AbortError'
            ? 'timeout'
            : 'no result';
        console.warn('Ask DKLA web search unavailable:', status);
        search = 'unavailable';
      }
      if (!atlas.length) return send(res, 200, { paragraphs: [], sources: [], search });
      const answer = citeAnswer(
        draft ?? (await generate({ apiKey, question: query, earlier, sources: atlas, search, signal })),
        atlas,
      );
      return answered({ ...answer, search });
    } catch (error) {
      if (error instanceof InvalidCitations) return send(res, 200, { paragraphs: [], sources: [], search });
      if (error.statusCode === 402) return send(res, 429, { error: 'usage-limit' });
      if (error.statusCode === 429) {
        console.warn('Ask DKLA OpenAI rate limit');
        return send(res, 429, { error: 'rate-limit' });
      }
      if (error.statusCode === 401 || error.statusCode === 403) {
        console.warn('Ask DKLA OpenAI authorization rejected');
        return send(res, 503, { error: 'not-configured' });
      }
      if (error.status >= 400 && error.status < 500) return send(res, error.status, { error: error.message });
      return send(res, 502, { error: 'answer-unavailable' });
    }
  };
}

export default makeAskHandler();
