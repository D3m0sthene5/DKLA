import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { body, sameOrigin, send } from '../lib/analytics/security.js';
import { citeAnswer, generateAnswer } from '../lib/ask/answer.js';
import { indexCorpus } from '../lib/ask/retrieve.js';

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

export function makeAskHandler(generate = generateAnswer) {
  return async function ask(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('allow', 'POST');
      return send(res, 405, { error: 'method-not-allowed' });
    }
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
      if (!apiKey) return send(res, 503, { error: 'not-configured' });

      const sources = await retrieve(question.trim(), node);
      if (!sources.length) return send(res, 200, { paragraphs: [], sources: [] });

      const signal = AbortSignal.timeout(20_000);
      const output = await generate({ apiKey, question: question.trim(), sources, signal });
      return send(res, 200, citeAnswer(output, sources));
    } catch (error) {
      if (error.status >= 400 && error.status < 500) return send(res, error.status, { error: error.message });
      return send(res, 502, { error: 'answer-unavailable' });
    }
  };
}

export default makeAskHandler();
