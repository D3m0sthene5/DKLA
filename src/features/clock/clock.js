/* A split-flap clock in the top bar, right of the search box, showing the
 * time and date in New York. The time comes from the visitor's device clock
 * (which phones and computers keep in step with atomic time servers),
 * converted to America/New_York, so it is right wherever the visitor is.
 * Each digit flips like a split-flap card when it changes; with reduced
 * motion it simply changes. Screen readers get the time once a minute. */
(() => {
  'use strict';
  const searchBox = document.querySelector('.study-header .study-search');
  if (!searchBox || typeof Intl === 'undefined') return;

  const format = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const spoken = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const calm = matchMedia('(prefers-reduced-motion: reduce)');

  const clock = document.createElement('div');
  clock.className = 'ny-clock';
  clock.setAttribute('role', 'img');
  const card = (kind) =>
    `<span class="flip ${kind}"><span class="half top"><span></span></span><span class="half bottom"><span></span></span>` +
    `<span class="leaf"><span class="half top front"><span></span></span><span class="half bottom back"><span></span></span></span></span>`;
  clock.innerHTML =
    '<span class="ny-row" aria-hidden="true">' +
    card('big') +
    card('big') +
    '<span class="ny-colon"></span>' +
    card('big') +
    card('big') +
    '<span class="ny-small"><span class="ny-meridiem"></span><span class="ny-seconds">' +
    card('small') +
    card('small') +
    '</span></span></span><span class="ny-date" aria-hidden="true"></span>';
  searchBox.after(clock);

  const cards = [...clock.querySelectorAll('.flip')];
  const meridiem = clock.querySelector('.ny-meridiem');
  const dateLine = clock.querySelector('.ny-date');
  const text = (el, sel) => el.querySelectorAll(sel + ' > span');

  function show(el, value) {
    if (el.dataset.value === value) return;
    const old = el.dataset.value ?? value;
    el.dataset.value = value;
    const [upper, lower] = [...text(el, ':scope > .half')];
    const [front, back] = [...text(el, '.leaf > .half')];
    upper.textContent = value;
    if (calm.matches || old === value || !clock.isConnected || clock.offsetParent === null) {
      lower.textContent = value;
      el.classList.remove('flipping');
      return;
    }
    lower.textContent = old;
    front.textContent = old;
    back.textContent = value;
    el.classList.remove('flipping');
    void el.offsetWidth; // restart the flip
    el.classList.add('flipping');
  }
  clock.addEventListener('animationend', (event) => {
    const el = event.target.closest('.flip');
    if (!el) return;
    el.classList.remove('flipping');
    text(el, ':scope > .half.bottom')[0].textContent = el.dataset.value;
  });

  let lastMinute = '';
  function tick() {
    const now = new Date();
    const part = Object.fromEntries(format.formatToParts(now).map(({ type, value }) => [type, value]));
    const digits = part.hour + part.minute + part.second;
    cards.forEach((el, i) => show(el, digits[i]));
    meridiem.textContent = part.dayPeriod;
    dateLine.textContent = `${part.weekday} · ${part.month} ${part.day} · NYC`;
    const minute = part.hour + part.minute;
    if (minute !== lastMinute) {
      lastMinute = minute;
      clock.setAttribute('aria-label', 'New York time: ' + spoken.format(now));
    }
    setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  }
  tick();
})();
