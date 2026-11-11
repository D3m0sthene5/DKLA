/* A split-flap clock in the top bar, right of the search box, showing the
 * time and date in New York. The time comes from the visitor's device clock
 * (which phones and computers keep in step with atomic time servers),
 * converted to America/New_York, so it is right wherever the visitor is.
 *
 * Every character (hours, minutes, seconds, weekday, month, day) is its own
 * split-flap card, like the old Solari departure board at Penn Station: when
 * it changes, the top half falls over the seam, lands and settles. At the top
 * of every hour, and when the date changes, the whole board riffles left to
 * right through a few random characters before landing on the right values.
 * There is no sound. With reduced motion, or in a hidden tab, values simply
 * change. Screen readers get the time once a minute; the cards are hidden
 * from them. window.DKLAClock.cascade() runs the riffle (used by the tests). */
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
    day: '2-digit',
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
  // Flip timings in milliseconds: an ordinary change, one riffle step, the
  // riffle's final landing, and the left-to-right delay between cards.
  const TICK = 460,
    RIFFLE = 92,
    LAND = 400,
    STAGGER = 52,
    STEPS = 4;
  const DIGITS = '0123456789',
    LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const clock = document.createElement('div');
  clock.className = 'ny-clock';
  clock.setAttribute('role', 'img');
  const card = (kind, set) =>
    `<span class="flip ${kind}" data-set="${set}"><span class="half top"><span></span></span><span class="half bottom"><span></span></span>` +
    `<span class="leaf"><span class="half top front"><span></span></span><span class="half bottom back"><span></span></span></span></span>`;
  const cards = (count, kind, set) => card(kind, set).repeat(count);
  clock.innerHTML =
    '<span class="ny-time" aria-hidden="true">' +
    cards(2, 'big', DIGITS) +
    '<span class="ny-colon"></span>' +
    cards(2, 'big', DIGITS) +
    '<span class="ny-side"><span class="ny-meridiem"></span><span class="ny-seconds">' +
    cards(2, 'small', DIGITS) +
    '</span></span></span>' +
    '<span class="ny-date" aria-hidden="true">' +
    `<span class="ny-word ny-weekday">${cards(3, 'tiny', LETTERS)}</span>` +
    `<span class="ny-word ny-month">${cards(3, 'tiny', LETTERS)}</span>` +
    `<span class="ny-word ny-day">${cards(2, 'tiny', DIGITS)}</span>` +
    '<span class="ny-place"><span class="ny-dot"></span>NYC</span></span>';
  searchBox.after(clock);

  const meridiem = clock.querySelector('.ny-meridiem');
  // Each card's moving parts and state: what it shows, what it should show,
  // and any riffle characters still to pass through.
  const flaps = [...clock.querySelectorAll('.flip')].map((el) => {
    const [upper, lower, front, back] = [...el.querySelectorAll('.half > span')];
    return { el, upper, lower, front, back, shown: '', target: '', queue: [], busy: false, held: false };
  });
  const rows = [clock.querySelector('.ny-time'), clock.querySelector('.ny-date')].map((row) =>
    flaps.filter((flap) => row.contains(flap.el)),
  );

  const still = () => calm.matches || document.hidden || !clock.isConnected || clock.offsetParent === null;

  function settle(flap) {
    clearTimeout(flap.timer);
    clearTimeout(flap.impact);
    clearTimeout(flap.wait);
    flap.queue = [];
    flap.busy = flap.held = flap.riffling = false;
    flap.shown = flap.target;
    flap.el.dataset.value = flap.target;
    flap.upper.textContent = flap.lower.textContent = flap.target;
    flap.el.classList.remove('flipping', 'landing');
  }

  // One flip: the new top half shows at once, the old bottom half stays until
  // the falling leaf (old top on its front, new bottom on its back) covers it.
  function flip(flap, value, ms, land) {
    const { el } = flap,
      old = flap.shown;
    flap.busy = true;
    flap.shown = value;
    el.dataset.value = value;
    flap.upper.textContent = flap.back.textContent = value;
    flap.lower.textContent = flap.front.textContent = old;
    el.style.setProperty('--flip', ms + 'ms');
    el.classList.remove('flipping', 'landing');
    void el.offsetWidth; // restart the animation
    el.classList.add('flipping');
    el.classList.toggle('landing', land);
    // The leaf hits the bottom about two thirds of the way through a landing.
    flap.impact = setTimeout(() => (flap.lower.textContent = value), land ? ms * 0.64 : ms);
    flap.timer = setTimeout(() => next(flap), ms + 16);
  }

  function next(flap) {
    flap.el.classList.remove('flipping', 'landing');
    flap.lower.textContent = flap.shown;
    flap.busy = false;
    if (still()) return settle(flap);
    if (flap.queue.length) return flip(flap, flap.queue.shift(), RIFFLE, false);
    if (flap.shown !== flap.target) return flip(flap, flap.target, flap.riffling ? LAND : TICK, true);
    flap.riffling = false;
  }

  function show(flap, value) {
    flap.target = value;
    if (!flap.shown || still()) return settle(flap);
    if (!flap.busy && !flap.held && flap.shown !== value) flip(flap, value, TICK, true);
  }

  // The Solari riffle: each row left to right, every card passes through a
  // few random characters of its kind before landing on its value.
  function cascade() {
    if (still()) {
      flaps.forEach(settle);
      return Promise.resolve();
    }
    for (const row of rows)
      row.forEach((flap, index) => {
        const set = flap.el.dataset.set,
          queue = [];
        let last = flap.shown;
        for (let step = 0; step < STEPS; step++) {
          let pick;
          do pick = set[Math.floor(Math.random() * set.length)];
          while (pick === last || (step === STEPS - 1 && pick === flap.target));
          queue.push((last = pick));
        }
        flap.held = true;
        clearTimeout(flap.wait);
        flap.wait = setTimeout(() => {
          flap.held = false;
          flap.riffling = true;
          flap.queue = queue;
          if (!flap.busy) next(flap);
        }, index * STAGGER);
      });
    return new Promise((resolve) => {
      const done = () =>
        flaps.every((flap) => !flap.busy && !flap.held && flap.shown === flap.target)
          ? resolve()
          : setTimeout(done, 40);
      setTimeout(done, 40);
    });
  }
  document.addEventListener('visibilitychange', () => document.hidden && flaps.forEach(settle));

  let lastMinute = '',
    lastHour = '',
    lastDate = '';
  function tick() {
    const now = new Date();
    const part = Object.fromEntries(format.formatToParts(now).map(({ type, value }) => [type, value]));
    const date = (part.weekday.slice(0, 3) + part.month.slice(0, 3)).toUpperCase() + part.day;
    const chars = part.hour + part.minute + part.second + date;
    flaps.forEach((flap, i) => show(flap, chars[i]));
    meridiem.textContent = part.dayPeriod;
    const hour = part.hour + part.dayPeriod;
    if ((lastHour && hour !== lastHour) || (lastDate && date !== lastDate)) cascade();
    lastHour = hour;
    lastDate = date;
    const minute = part.hour + part.minute;
    if (minute !== lastMinute) {
      lastMinute = minute;
      clock.setAttribute('aria-label', 'New York time: ' + spoken.format(now));
    }
    setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  }
  tick();
  window.DKLAClock = Object.freeze({ cascade });
})();
