document.getElementById('privacyForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.getElementById('privacyStatus'),
    button = event.target.querySelector('button');
  button.disabled = true;
  status.textContent = 'Submitting…';
  try {
    const response = await fetch('/api/analytics?action=request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ request: document.getElementById('request').value }),
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    status.textContent = 'Request received. Keep this reference: ' + result.reference;
    document.getElementById('request').value = '';
  } catch (error) {
    status.textContent =
      error.message === 'not-configured'
        ? 'The request service is not configured yet. Please try again later.'
        : 'The request could not be submitted. Please try again later.';
  } finally {
    button.disabled = false;
  }
});
