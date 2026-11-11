import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { body, noStore, sameOrigin, send } from '../lib/analytics/security.js';
import { citeAnswer, generateAnswer, InvalidCitations } from '../lib/ask/answer.js';
import { corpusDigest, indexCorpus, parseIndex } from '../lib/ask/retrieve.js';
import { answerWithSearch, route } from '../lib/ask/web.js';

const corpus = new URL('../work/build/ask-corpus.json.gz', import.meta.url);
// The retrieval index the build computed from that corpus (tools/ask/build.mjs). Without it, or
// if it was built from another corpus, the index is built here, which takes about 1.5 s.
const prebuilt = new URL('../work/build/ask-index.bin.gz', import.meta.url);
let index;
function load() {
  index ??= Promise.all([readFile(corpus), readFile(prebuilt).catch(() => null)])
    .then(([bytes, saved]) => {
      let ready = null;
      try {
        ready = saved && parseIndex(gunzipSync(saved), corpusDigest(bytes));
      } catch {}
      return indexCorpus(JSON.parse(gunzipSync(bytes)), ready ?? undefined);
    })
    .catch((error) => {
      index = undefined;
      throw error;
    });
  return index;
}
async function retrieve(question, node) {
  // { sources, signals }: the Atlas excerpts, and what routing needs to know about the match.
  return (await load()).explain(question, node);
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

// A call that could not finish: a timeout, a cancelled question, or a network failure ("fetch
// failed", a connection cut, a reply cut off in the middle of its JSON). Such a call is
// unavailable, which gets the honest empty answer, not an error.
const failed = (error) =>
  error?.name === 'TimeoutError' ||
  error?.name === 'AbortError' ||
  error instanceof SyntaxError ||
  (error instanceof TypeError &&
    (error.cause !== undefined || /fetch failed|terminated|network|socket|body/i.test(error.message)));

// The browser can ask for progress (Accept: application/x-ndjson). The reply is then one JSON
// object per line: { progress: { step, ... } } as the work goes on, and last either
// { answer: <the JSON reply> } or { status, error }. The answer line is only written after the
// citations have been checked, exactly as in the JSON reply. Without that header the reply is
// the single JSON object it always was. Problems found before any work starts (a bad request,
// no key) keep their HTTP status in both forms.
function replies(req, res) {
  const stream = /\bapplication\/x-ndjson\b/i.test(String(req.headers.accept ?? ''));
  let open = false;
  const line = (data) => {
    if (!open) {
      open = true;
      noStore(res);
      res.statusCode = 200;
      res.setHeader('content-type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('x-accel-buffering', 'no');
    }
    res.write(JSON.stringify(data) + '\n');
  };
  return {
    stream,
    progress(step) {
      if (stream) line({ progress: step });
    },
    send(status, data) {
      if (!stream || !open) return send(res, status, data);
      line(status === 200 ? { answer: data } : { status, error: data.error });
      res.end();
    },
  };
}

export function makeAskHandler(generate = generateAnswer, research = answerWithSearch) {
  return async function ask(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('allow', 'POST');
      return send(res, 405, { error: 'method-not-allowed' });
    }
    const reply = replies(req, res);
    let search = 'not-needed';
    try {
      sameOrigin(req);
      if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json')
        return send(res, 415, { error: 'unsupported-content-type' });
      const payload = await body(req, 12288);
      // A warm-up, sent when the Ask dialog opens or the person starts typing: it loads the
      // corpus into this server instance so the question that follows does not wait for it.
      // It is not a question: nothing is sent to OpenAI and nothing is recorded.
      if (payload?.warm === true && Object.keys(payload).length === 1) {
        await load().catch(() => {});
        return send(res, 200, { warm: true });
      }
      // history: up to three earlier turns of this conversation, sent by the
      // browser so a follow-up can say "that case". Nothing is stored.
      const { question, node, history } = payload;
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
      const path = route(lookup, atlas, { node, signals });
      reply.progress({ step: 'atlas', entries: atlas.length, research: path.research });
      // Time budget, kept under the 30 s target (vercel.json allows 45 s). Loading the corpus on a
      // cold start takes about 0.3 s with the prebuilt index. Then one shared 26 s deadline:
      //   Atlas route:    an Atlas answer (8 s), then research only if it is not exact (18 s).
      //   Research route: research (18 s); after a failure, an Atlas answer (8 s) only when the
      //                   Atlas could answer the question (route web: false) and time remains.
      // Research is never started alongside an Atlas answer: see the README's cost note.
      // A cancelled question (Cancel, or the tab closed) stops the OpenAI calls: the connection
      // closes before the reply has ended, so nothing more is paid for.
      const gone = new AbortController();
      res.on?.('close', () => {
        if (!res.writableEnded) gone.abort();
      });
      const signal = AbortSignal.any([AbortSignal.timeout(26_000), gone.signal]);
      const unavailable = () => reply.send(200, { paragraphs: [], sources: [], search: 'unavailable' });
      const atlasAnswer = (search) =>
        generate({ apiKey, question: query, earlier, sources: atlas, search, signal });
      let draft;
      if (!path.research) {
        if (!atlas.length) return reply.send(200, { paragraphs: [], sources: [], search });
        try {
          const output = await atlasAnswer(search);
          if (!output.needsWeb) {
            reply.progress({ step: 'checking' });
            return reply.send(200, { ...citeAnswer(output, atlas), search });
          }
          draft = output;
        } catch (error) {
          // A slow, cut off or malformed Atlas answer goes on to research instead of failing.
          if (!(error instanceof InvalidCitations) && !failed(error)) throw error;
        }
      }
      if (gone.signal.aborted) return;

      try {
        const context = atlas.find((source) => source.type === 'node' && source.id === node)?.title;
        reply.progress({ step: 'searching' });
        const answer = await research({
          apiKey,
          question: query,
          earlier,
          context,
          sources: atlas.slice(0, 6),
          signal,
          // Only a browser that shows progress gets OpenAI's stream relayed.
          progress: reply.stream ? reply.progress : undefined,
          // Legislation, events, dates, people, the present: only a web-cited answer will do.
          web: path.web,
        });
        return reply.send(200, { ...answer, search: 'searched' });
      } catch (error) {
        if ([401, 402, 403].includes(error.statusCode)) throw error;
        const status = Number.isInteger(error.statusCode)
          ? error.statusCode
          : failed(error)
            ? error.name === 'TimeoutError'
              ? 'timeout'
              : 'network'
            : 'no result';
        console.warn('Ask DKLA web search unavailable:', status);
        search = 'unavailable';
      }
      // After a failed search: the Atlas draft if there is one; otherwise an Atlas answer only for
      // a question the Atlas could answer, and only while the deadline allows.
      if (!atlas.length || (!draft && (path.web || signal.aborted))) return unavailable();
      try {
        const answer = citeAnswer(draft ?? (await atlasAnswer(search)), atlas);
        return reply.send(200, { ...answer, search });
      } catch (error) {
        if (failed(error) || error instanceof InvalidCitations) return unavailable();
        throw error;
      }
    } catch (error) {
      if (error instanceof InvalidCitations) return reply.send(200, { paragraphs: [], sources: [], search });
      if (error.statusCode === 402) return reply.send(429, { error: 'usage-limit' });
      if (error.statusCode === 429) {
        console.warn('Ask DKLA OpenAI rate limit');
        return reply.send(429, { error: 'rate-limit' });
      }
      if (error.statusCode === 401 || error.statusCode === 403) {
        console.warn('Ask DKLA OpenAI authorization rejected');
        return reply.send(503, { error: 'not-configured' });
      }
      if (error.status >= 400 && error.status < 500)
        return reply.send(error.status, { error: error.message });
      return reply.send(502, { error: 'answer-unavailable' });
    }
  };
}

export default makeAskHandler();
