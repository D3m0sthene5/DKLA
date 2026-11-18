import { costOf, recordSpend } from './fuel.js';

const exhausted = ['insufficient_quota', 'credit_balance_exhausted', 'billing_hard_limit_reached'];
const failure = (code, status) =>
  Object.assign(Error('OpenAI request failed'), { statusCode: exhausted.includes(code) ? 402 : status });

// onEvent: when given, the response is streamed and each server-sent event is passed to it as it
// arrives (for progress), and the call still returns the final response object, exactly as the
// non-streamed request would. Node's fetch keeps the TLS connection to OpenAI open between calls
// in a warm function instance, so a second call within a question needs no new handshake.
// Every response's cost goes to the fuel ledger (lib/ask/fuel.js) before it is returned, quietly:
// a ledger problem never breaks or noticeably delays an answer. That includes a response that
// failed or stopped early but reported its usage; a stream cut off before its final response
// counts the web searches that had finished.
export async function createResponse({ apiKey, signal, onEvent, ...request }) {
  const searched = { count: 0 };
  let result;
  try {
    result = await call({ apiKey, signal, onEvent, request, searched });
  } catch (error) {
    if (searched.count) await recordSpend(costOf(request.model, null, searched.count));
    throw error;
  }
  await recordSpend(costOf(request.model, result));
  return result;
}

async function call({ apiKey, signal, onEvent, request, searched }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ ...request, ...(onEvent && { stream: true }), store: false }),
    redirect: 'error',
    signal,
  });
  if (!response.ok) {
    const { error } = (await response.json().catch(() => null)) ?? {};
    throw failure(error?.code, response.status);
  }
  if (!onEvent || !/^text\/event-stream/i.test(response.headers.get('content-type') ?? ''))
    return response.json();
  return readEvents(response.body, onEvent, searched);
}

// The Responses API stream: "event: <type>" and "data: <json>" lines, a blank line between
// events. response.completed (or .incomplete, .failed) carries the whole final response.
async function readEvents(body, onEvent, searched) {
  const decoder = new TextDecoder();
  let buffer = '';
  let final;
  const handle = (block) => {
    const data = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data || data === '[DONE]') return;
    let event;
    try {
      event = JSON.parse(data);
    } catch {
      return;
    }
    if (event?.type === 'error') throw failure(event.code ?? event.error?.code, 502);
    if (/^response\.(?:completed|incomplete|failed)$/.test(event?.type) && event.response)
      final = event.response;
    if (event?.type === 'response.output_item.done' && event.item?.type === 'web_search_call')
      searched.count++;
    try {
      onEvent(event);
    } catch {}
  };
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n?/g, '\n');
    let end;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      handle(buffer.slice(0, end));
      buffer = buffer.slice(end + 2);
    }
  }
  handle(buffer + decoder.decode());
  if (!final) throw failure(null, 502);
  return final;
}

export function responseText(response) {
  return (response.output ?? [])
    .filter(({ type, role }) => type === 'message' && role === 'assistant')
    .flatMap(({ content }) => content ?? [])
    .filter(({ type, text }) => type === 'output_text' && typeof text === 'string');
}
