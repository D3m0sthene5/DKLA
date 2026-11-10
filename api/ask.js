import { NoObjectGeneratedError } from 'ai';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { body, sameOrigin, send } from '../lib/analytics/security.js';
import { citeAnswer, generateAnswer, InvalidCitations } from '../lib/ask/answer.js';
import { indexCorpus } from '../lib/ask/retrieve.js';
import { searchWeb, shouldSearch } from '../lib/ask/web.js';

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

export function makeAskHandler(generate = generateAnswer, research = searchWeb) {
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

      const apiKey = process.env.DKLA_ASK_GATEWAY_API_KEY;
      const projectAuth =
        process.env.DKLA_ASK_GATEWAY_OIDC === 'true' &&
        process.env.VERCEL_ENV === 'production' &&
        !process.env.AI_GATEWAY_API_KEY;
      if (!apiKey && !projectAuth) return send(res, 503, { error: 'not-configured' });

      const query = question.trim();
      const atlas = await retrieve(query, node);
      const signal = AbortSignal.timeout(41_000);
      if (!shouldSearch(query, atlas)) {
        if (!atlas.length) return send(res, 200, { paragraphs: [], sources: [], search });
        const output = await generate({ apiKey, question: query, sources: atlas, search, signal });
        if (!output.needsWeb) return send(res, 200, { ...citeAnswer(output, atlas), search });
      }

      let web = [];
      try {
        const context = atlas.find((source) => source.type === 'node' && source.id === node)?.title;
        web = await research({
          apiKey,
          question: query,
          context,
          signal,
        });
        search = 'searched';
      } catch (error) {
        if (error.statusCode === 402) throw error;
        const status = Number.isInteger(error.statusCode)
          ? error.statusCode
          : error.name === 'TimeoutError' || error.name === 'AbortError'
            ? 'timeout'
            : 'no result';
        console.warn('Ask DKLA web search unavailable:', status);
        search = 'unavailable';
      }
      const sources = [...atlas.slice(0, web.length ? 6 : 9), ...web];
      if (!sources.length) return send(res, 200, { paragraphs: [], sources: [], search });
      const answer = citeAnswer(
        await generate({ apiKey, question: query, sources, search, signal }),
        sources,
      );
      return send(res, 200, { ...answer, search });
    } catch (error) {
      if (error instanceof InvalidCitations || NoObjectGeneratedError.isInstance(error))
        return send(res, 200, { paragraphs: [], sources: [], search });
      if (error.statusCode === 402) return send(res, 429, { error: 'usage-limit' });
      if (error.statusCode === 429) {
        console.warn('Ask DKLA Gateway rate limit');
        return send(res, 429, { error: 'rate-limit' });
      }
      if (error.statusCode === 403) {
        // Keep the provider error out of the browser and the question out of the logs.
        const text = String(error.message || '');
        const reason = /zero data retention|\bZDR\b/i.test(text)
          ? 'privacy'
          : /free.tier|requires purchased credits/i.test(text)
            ? 'free-tier'
            : /customer_verification_required|payment method/i.test(text)
              ? 'verification'
              : 'access';
        console.warn('Ask DKLA Gateway denied:', reason);
      }
      if (error.status >= 400 && error.status < 500) return send(res, error.status, { error: error.message });
      return send(res, 502, { error: 'answer-unavailable' });
    }
  };
}

export default makeAskHandler();
