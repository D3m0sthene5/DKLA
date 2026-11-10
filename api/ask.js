import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { body, sameOrigin, send } from '../lib/analytics/security.js';
import { citeAnswer, generateAnswer, InvalidCitations } from '../lib/ask/answer.js';
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
      const { question, node } = await body(req, 4608);
      if (
        typeof question !== 'string' ||
        !question.trim() ||
        question.length > 600 ||
        (node !== undefined && (typeof node !== 'string' || !/^[\w.-]{1,120}$/.test(node)))
      )
        return send(res, 400, { error: 'invalid-question' });

      const apiKey = process.env.DKLA_OPENAI_API_KEY?.trim();
      if (!apiKey) return send(res, 503, { error: 'not-configured' });

      const query = question.trim();
      const atlas = await retrieve(query, node);
      const signal = AbortSignal.timeout(29_000);
      let draft;
      if (!shouldSearch(query, atlas)) {
        if (!atlas.length) return send(res, 200, { paragraphs: [], sources: [], search });
        const output = await generate({ apiKey, question: query, sources: atlas, search, signal });
        if (!output.needsWeb) return send(res, 200, { ...citeAnswer(output, atlas), search });
        draft = output;
      }

      try {
        const context = atlas.find((source) => source.type === 'node' && source.id === node)?.title;
        const answer = await research({
          apiKey,
          question: query,
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
        draft ?? (await generate({ apiKey, question: query, sources: atlas, search, signal })),
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
