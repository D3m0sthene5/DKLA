export async function createResponse({ apiKey, signal, ...request }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ ...request, store: false }),
    redirect: 'error',
    signal,
  });
  if (!response.ok) {
    const { error } = (await response.json().catch(() => null)) ?? {};
    const exhausted = [
      'insufficient_quota',
      'credit_balance_exhausted',
      'billing_hard_limit_reached',
    ].includes(error?.code);
    throw Object.assign(Error('OpenAI request failed'), { statusCode: exhausted ? 402 : response.status });
  }
  return response.json();
}

export function responseText(response) {
  return (response.output ?? [])
    .filter(({ type, role }) => type === 'message' && role === 'assistant')
    .flatMap(({ content }) => content ?? [])
    .filter(({ type, text }) => type === 'output_text' && typeof text === 'string');
}
