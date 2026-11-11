import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { body, sameOrigin, send } from '../lib/analytics/security.js';
import { citeAnswer, generateAnswer, InvalidCitations } from '../lib/ask/answer.js';
import { indexCorpus } from '../lib/ask/retrieve.js';
import { answerWithSearch, route } from '../lib/ask/web.js';

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
  // { sources, signals }: the Atlas excerpts, and what routing needs to know about the match.
  return (await index).explain(question, node);
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

export function makeAskHandler(generate = generateAnswer, research = answerWithSearch) {
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
      // browser so a follow-up can say "that case". Nothing is stored.
      const { question, node, history } = await body(req, 12288);
      if (
        typeof question !== 'string' ||
        !question.trim() ||
        question.length > 600 ||
        (node !== undefined && (typeof node !== 'string' || !/^[\w.-]{1,120}$/.test(node))) ||
        (history !== undefined && !validHistory(history))
      )
        return send(res, 400, { error: 'invalid-question' });
      const earlier = history?.map((turn) => ({
        question: turn.question.trim(),
        answer: turn.answer.trim(),
      }));

      const apiKey = process.env.DKLA_OPENAI_API_KEY?.trim();
      if (!apiKey) return send(res, 503, { error: 'not-configured' });

      const query = question.trim();
      // A follow-up is looked up together with the question before it.
      const lookup = earlier?.length ? earlier.at(-1).question + ' ' + query : query;
      const { sources: atlas, signals } = await retrieve(lookup, node);
      // Time budget, kept under the 30 s function limit. Loading the corpus on a cold start takes
      // about 2 s. Then either an Atlas answer (8 s) and research (18 s), reusing the Atlas answer
      // if research fails, or research (18 s) and an Atlas answer after a failure (8 s): 26 s at
      // most, and every call also stops at this shared 26 s deadline. Worst case about 28 s.
      const signal = AbortSignal.timeout(26_000);
      let draft;
      // Dottie researches unless the Atlas clearly covers the question (lib/ask/web.js route).
      if (!route(lookup, atlas, { node, signals }).research) {
        if (!atlas.length) return send(res, 200, { paragraphs: [], sources: [], search });
        try {
          const output = await generate({ apiKey, question: query, earlier, sources: atlas, search, signal });
          if (!output.needsWeb) return send(res, 200, { ...citeAnswer(output, atlas), search });
          draft = output;
        } catch (error) {
          // A slow or malformed Atlas answer goes on to research instead of failing the question.
          if (!(error instanceof InvalidCitations) && error.name !== 'TimeoutError') throw error;
        }
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
        return send(res, 200, { ...answer, search: 'searched' });
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
      return send(res, 200, { ...answer, search });
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
