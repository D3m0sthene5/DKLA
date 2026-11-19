/* A split-flap clock in the top bar's instrument cluster (src/features/v32/chrome.js puts it
 * there), showing the time in New York, and the date where the bar is wide enough. The time comes
 * from the visitor's device clock (which phones and computers keep in step with atomic time
 * servers), converted to America/New_York, so it is right wherever the visitor is.
 *
 * Every character (hours, minutes, seconds, weekday, month, day) is its own
 * split-flap card, like the old Solari departure board at Penn Station: when
 * it changes, the top half falls over the seam, lands and settles. At the top
 * of every hour, and when the date changes, the whole board riffles left to
 * right through a few random characters before landing on the right values.
 * There is no sound. With reduced motion, or in a hidden tab, values simply
 * change. Screen readers get the time once a minute; the cards are hidden
 * from them. window.DKLAClock.cascade() runs the riffle (used by the tests).
 *
 * At rest the clock costs no layout (v3.2): every half-card holds a strip of
 * all its characters, one per line, and shows one by sliding the strip
 * (a transform), so a change of digit restyles two small elements and lays
 * nothing out. The falling leaf is always in the page, invisible between
 * flips. While a dialog is open, the map is moving or the tab is hidden the
 * digits change without flipping, and a hidden tab stops the ticking. */
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
  const strip = (set) => `<span><i class="ny-strip">${[...set].join('\n')}</i></span>`;
  const card = (kind, set) =>
    `<span class="flip ${kind}" data-set="${set}"><span class="half top">${strip(set)}</span><span class="half bottom">${strip(set)}</span>` +
    `<span class="leaf"><span class="half top front">${strip(set)}</span><span class="half bottom back">${strip(set)}</span></span></span>`;
  const cards = (count, kind, set) => card(kind, set).repeat(count);
  // One row (v3.2): the time, then the date and NYC where the bar has room for them (clock.css).
  clock.innerHTML =
    '<span class="ny-time" aria-hidden="true">' +
    cards(2, 'big', DIGITS) +
    '<span class="ny-colon"></span>' +
    cards(2, 'big', DIGITS) +
    '<span class="ny-colon"></span>' +
    `<span class="ny-seconds">${cards(2, 'big', DIGITS)}</span>` +
    '<span class="ny-meridiem"></span></span>' +
    '<span class="ny-date" aria-hidden="true">' +
    `<span class="ny-word ny-weekday">${cards(3, 'tiny', LETTERS)}</span>` +
    `<span class="ny-word ny-month">${cards(3, 'tiny', LETTERS)}</span>` +
    `<span class="ny-word ny-day">${cards(2, 'tiny', DIGITS)}</span>` +
    '<span class="ny-place">NYC</span></span>';
  searchBox.after(clock);

  const meridiem = clock.querySelector('.ny-meridiem');
  // Each card's moving parts and state: what it shows, what it should show,
  // and any riffle characters still to pass through.
  const flaps = [...clock.querySelectorAll('.flip')].map((el) => {
    const [upper, lower, front, back] = [...el.querySelectorAll('.ny-strip')];
    return { el, upper, lower, front, back, shown: '', target: '', queue: [], busy: false, held: false };
  });
  // Show one character of a strip: slide it up by that character's line. No text changes, so
  // nothing is laid out. A character outside the card's set (never expected) is added to it.
  function put(flap, part, value) {
    let set = flap.el.dataset.set,
      at = set.indexOf(value);
    if (at < 0) {
      set = flap.el.dataset.set = set + value;
      at = set.length - 1;
      for (const each of [flap.upper, flap.lower, flap.front, flap.back])
        each.textContent = [...set].join('\n');
    }
    if (part.dataset.at !== String(at)) {
      part.dataset.at = at;
      part.style.setProperty('--at', at);
    }
  }
  const rows = [clock.querySelector('.ny-time'), clock.querySelector('.ny-date')].map((row) =>
    flaps.filter((flap) => row.contains(flap.el)),
  );

  // Still also beside the reading: with a reader or a dialog open (html.v32-reading, set by
  // src/features/v32/chrome.js) the digits change in place, with no flap falling.
  const still = () =>
    calm.matches ||
    document.hidden ||
    window.DKLACalm?.quiet() ||
    document.documentElement.classList.contains('v32-reading') ||
    !clock.isConnected ||
    clock.offsetParent === null;

  function settle(flap) {
    clearTimeout(flap.timer);
    clearTimeout(flap.impact);
    clearTimeout(flap.wait);
    flap.queue = [];
    flap.busy = flap.held = flap.riffling = false;
    flap.shown = flap.target;
    flap.el.dataset.value = flap.target;
    put(flap, flap.upper, flap.target);
    put(flap, flap.lower, flap.target);
    if (flap.el.classList.contains('flipping')) flap.el.classList.remove('flipping', 'landing');
  }

  // One flip: the new top half shows at once, the old bottom half stays until
  // the falling leaf (old top on its front, new bottom on its back) covers it.
  function flip(flap, value, ms, land) {
    const { el } = flap,
      old = flap.shown;
    flap.busy = true;
    flap.shown = value;
    el.dataset.value = value;
    put(flap, flap.upper, value);
    put(flap, flap.back, value);
    put(flap, flap.lower, old);
    put(flap, flap.front, old);
    el.style.setProperty('--flip', ms + 'ms');
    el.classList.remove('flipping', 'landing');
    void el.offsetWidth; // restart the animation
    el.classList.add('flipping');
    el.classList.toggle('landing', land);
    // The leaf hits the bottom about two thirds of the way through a landing.
    flap.impact = setTimeout(() => put(flap, flap.lower, value), land ? ms * 0.64 : ms);
    flap.timer = setTimeout(() => next(flap), ms + 16);
  }

  function next(flap) {
    flap.el.classList.remove('flipping', 'landing');
    put(flap, flap.lower, flap.shown);
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
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flaps.forEach(settle);
    else tick();
  });
  // A dialog opening stops any flip in mid-air; the digits then change without flipping.
  document.addEventListener('dkla:ambient', (event) => event.detail?.off && flaps.forEach(settle));

  let timer = 0,
    lastMinute = '',
    lastHour = '',
    lastDate = '';
  function tick() {
    const now = new Date();
    const part = Object.fromEntries(format.formatToParts(now).map(({ type, value }) => [type, value]));
    const date = (part.weekday.slice(0, 3) + part.month.slice(0, 3)).toUpperCase() + part.day;
    const chars = part.hour + part.minute + part.second + date;
    flaps.forEach((flap, i) => show(flap, chars[i]));
    if (meridiem.textContent !== part.dayPeriod) meridiem.textContent = part.dayPeriod;
    const hour = part.hour + part.dayPeriod;
    if ((lastHour && hour !== lastHour) || (lastDate && date !== lastDate)) cascade();
    lastHour = hour;
    lastDate = date;
    const minute = part.hour + part.minute;
    if (minute !== lastMinute) {
      lastMinute = minute;
      clock.setAttribute('aria-label', 'New York time: ' + spoken.format(now));
    }
    // One timer at a time, and none in a hidden tab (it starts again when the tab is shown).
    clearTimeout(timer);
    if (!document.hidden) timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  }
  tick();
  window.DKLAClock = Object.freeze({ cascade });
})();
