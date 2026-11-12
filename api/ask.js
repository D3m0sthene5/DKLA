import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { body, noStore, sameOrigin, send } from '../lib/analytics/security.js';
import { citeAnswer, generateAnswer, InvalidCitations } from '../lib/ask/answer.js';
import { findAnswer, storeAnswer } from '../lib/ask/library.js';
import { corpusDigest, indexCorpus, parseIndex } from '../lib/ask/retrieve.js';
import { answerWithSearch, AtlasOnlyResearch, NoResearchAnswer, route, standsAlone } from '../lib/ask/web.js';

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
// unavailable, which gets the honest empty answer, not an error. A programming mistake (any
// other TypeError) is not a failed call: it stays an error.
const failed = (error) =>
  error?.name === 'TimeoutError' ||
  error?.name === 'AbortError' ||
  error instanceof SyntaxError ||
  (error instanceof TypeError &&
    (error.cause !== undefined || /^(?:fetch failed|terminated)$|Body is unusable/.test(error.message)));

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

// The browser can ask for progress (Accept: application/x-ndjson). The reply is then one JSON
// object per line: { progress: { step, ... } } as the work goes on, and last either
// { answer: <the JSON reply> } or { status, error }. The answer line is only written after the
// citations have been checked, exactly as in the JSON reply. Without that header the reply is
// the single JSON object it always was. Problems found before any work starts (a bad request,
// no key) keep their HTTP status in both forms, and so does an answer from the library, which
// is sent before any progress.
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

export function makeAskHandler(
  generate = generateAnswer,
  research = answerWithSearch,
  library = { find: findAnswer, store: storeAnswer },
) {
  return async function ask(req, res) {
    // A cancelled question (Cancel, or the tab closed) stops the OpenAI calls: the connection
    // closes before the reply has ended, so nothing more is paid for. The listener is attached
    // first, so a close during a cold start (reading the body, loading the corpus) counts too.
    // Only the response side tells: a request whose body has been read is destroyed in Node 22
    // although its connection is open, and Vercel reads the body (req.body) before the handler
    // runs, so req.destroyed is true for every question there and is never a cancel.
    const gone = new AbortController();
    const closed = () => !res.writableEnded && Boolean(res.destroyed || res.socket?.destroyed);
    res.on?.('close', () => {
      if (!res.writableEnded) gone.abort();
    });
    if (closed()) gone.abort();
    // After a cancel nothing is written; the response is only ended.
    const stop = () => {
      if (!res.writableEnded) res.end?.();
    };
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
      // It is not a question: nothing is sent to OpenAI, nothing is looked up or stored in the
      // answer library, and nothing is recorded.
      if (payload?.warm === true && Object.keys(payload).length === 1) {
        await load().catch(() => {});
        return send(res, 200, { warm: true });
      }
      // history: up to three earlier turns of this conversation, sent by the
      // browser so a follow-up can say "that case". Follow-ups are never stored.
      // fresh: skip the answer library and replace its entry with a new answer.
      const { question, node, history, fresh } = payload ?? {};
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
      // A follow-up that points back ("when was it decided?") is looked up together with the question
      // before it, after a full stop, so its first word is not read as a name in mid-sentence ("… efficient
      // breach How do you …" made "How" a name outside the Atlas). One that stands alone is looked up alone.
      const lookup =
        earlier?.length && !standsAlone(query)
          ? earlier.at(-1).question.replace(/[\s.?!;:]+$/, '') + '. ' + query
          : query;
      const { sources: atlas, signals } = await retrieve(lookup, node);
      if (gone.signal.aborted) return stop();

      // The templates read the question itself; the web flags read it with the question before.
      const path = route(query, atlas, { node, signals, lookup, followUp: Boolean(earlier?.length) });

      // Only a first question can be answered from, or added to, the library:
      // a follow-up depends on the conversation before it. Nor can a question whose answer
      // changes with time (route stable: false): the present, later history, people. The
      // lookup comes before any call to OpenAI, so a question asked before costs nothing.
      const shelf = earlier?.length || !path.stable ? null : (node ?? '');
      if (shelf !== null && !fresh) {
        const kept = await quietly(() => library.find(query, shelf));
        if (gone.signal.aborted) return stop();
        if (kept)
          return reply.send(200, {
            paragraphs: kept.paragraphs,
            sources: kept.sources,
            search: kept.search ?? 'not-needed',
            cached: true,
            savedAt: kept.savedAt,
          });
      }
      // The final, checked answer. One that cites a source is kept for the next visitor who
      // asks. One written after web search failed is incomplete, so it is not kept, and
      // neither is the honest empty answer.
      // fallback: an Atlas answer given because research could not answer; never kept.
      const answered = async (answer, fallback = false) => {
        if (gone.signal.aborted) return stop();
        if (
          !fallback &&
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
        return reply.send(200, answer);
      };

      reply.progress({ step: 'atlas', entries: atlas.length, research: path.research });
      // Time budget (vercel.json allows 45 s). Loading the corpus on a cold start takes about 0.3 s with
      // the prebuilt index. Then one shared 32 s deadline (26 s until 12 November 2026, when research
      // timed out on live questions):
      //   Atlas route:    an Atlas answer (8 s), then research only if it is not exact (24 s).
      //   Research route: research (24 s); after a failure, an Atlas answer (8 s) only when the
      //                   Atlas could answer the question (route web: false) and time remains.
      //                   Research that cites only the Atlas, for a question that wanted the web, is
      //                   given rather than discarded when its answer cannot change with time.
      // Research is never started alongside an Atlas answer: see the README's cost note.
      // A question with three or more parts (several numbered questions) gets 40 s, still under the
      // 45 s the server allows: its Atlas answer gets 16 s and research 30 s (answer.js, web.js).
      const signal = AbortSignal.any([AbortSignal.timeout(path.parts >= 3 ? 40_000 : 32_000), gone.signal]);
      const unavailable = () =>
        gone.signal.aborted
          ? stop()
          : reply.send(200, { paragraphs: [], sources: [], search: 'unavailable' });
      // subjects: the entries a template resolved the question to; citing one is the right kind
      // of answer ("what is the statute of frauds" and its dictionary entry).
      const atlasAnswer = (search) =>
        generate({
          apiKey,
          question: query,
          earlier,
          sources: atlas,
          search,
          signal,
          subjects: path.subjects,
          parts: path.parts,
        });
      let draft;
      // The search ran and found nothing usable (as opposed to failing).
      let empty = false;
      if (!path.research) {
        if (!atlas.length) return reply.send(200, { paragraphs: [], sources: [], search });
        try {
          const output = await atlasAnswer(search);
          if (!output.needsWeb) {
            reply.progress({ step: 'checking' });
            return answered({ ...citeAnswer(output, atlas), search });
          }
          draft = output;
        } catch (error) {
          // A slow, cut off or malformed Atlas answer goes on to research instead of failing.
          if (!(error instanceof InvalidCitations) && !failed(error)) throw error;
        }
      }
      if (gone.signal.aborted) return stop();

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
          subjects: path.subjects,
          parts: path.parts,
          // The Atlas draft, when there is one, so research fills its gaps instead of starting over.
          // Only for a question whose answer cannot change with time, and only paragraphs whose
          // citations are all among the six excerpts research receives.
          draft: path.stable
            ? draft?.paragraphs?.filter(
                ({ citations }) => citations?.length && citations.every((n) => n >= 1 && n <= 6),
              )
            : undefined,
        });
        return answered({ ...answer, search: 'searched' });
      } catch (error) {
        if ([401, 402, 403].includes(error.statusCode)) throw error;
        // An answer from the Atlas excerpts alone, to a question that wanted web evidence: given when the
        // answer cannot change with time (route stable), never kept in the library. A question about the
        // present, later events or people still needs the web.
        if (
          error instanceof AtlasOnlyResearch &&
          path.stable &&
          error.answer.paragraphs?.length &&
          !gone.signal.aborted
        ) {
          console.warn('Ask DKLA web search unavailable:', 'answered from the Atlas only');
          return answered({ ...error.answer, search: 'searched' }, true);
        }
        const status = Number.isInteger(error.statusCode)
          ? error.statusCode
          : failed(error)
            ? error.name === 'TimeoutError'
              ? 'timeout'
              : 'network'
            : 'no result: ' + String(error.message).slice(0, 80);
        if (gone.signal.aborted) {
          console.warn('Ask DKLA web search unavailable:', 'cancelled');
          return stop();
        }
        empty = error instanceof NoResearchAnswer;
        console.warn('Ask DKLA web search unavailable:', empty ? 'nothing usable' : status);
        search = empty ? 'searched' : 'unavailable';
      }
      // After a failed or empty search: the Atlas draft if there is one; otherwise an Atlas answer
      // only for a question the Atlas could answer, and only while the deadline allows. A search
      // that ran but found nothing usable says so ('searched'); one that failed says it failed.
      const nothing = () =>
        empty && !gone.signal.aborted
          ? reply.send(200, { paragraphs: [], sources: [], search })
          : unavailable();
      if (!atlas.length || (!draft && (path.web || signal.aborted))) return nothing();
      try {
        const answer = citeAnswer(draft ?? (await atlasAnswer(search)), atlas);
        if (!answer.paragraphs.length) return nothing();
        return answered({ ...answer, search }, true);
      } catch (error) {
        if (failed(error) || error instanceof InvalidCitations) return nothing();
        throw error;
      }
    } catch (error) {
      if (gone.signal.aborted) return stop();
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
