/* Runs inside the page before any app code (Playwright addInitScript). It only watches: observers for long
   tasks, long animation frames, event timing and layout shift, a frame-interval recorder, and (only when
   options.wrap is set, for the idle and observer census) wrappers round timers and observers. Nothing here
   changes what the app draws. Used by tools/feel/measure.mjs. */
(options) => {
  if (window.__feel) return;
  const raf = window.requestAnimationFrame.bind(window);
  const now = () => performance.now();
  const F = (window.__feel = {
    loaf: [],
    longtask: [],
    event: [],
    shift: [],
    paint: [],
    lcp: [],
    json: [],
    fetches: [],
    digests: [],
    dataEvents: [],
    marks: {},
    mo: [],
    intervals: [],
    sites: {},
    ro: 0,
    io: 0,
    draw: { calls: 0, ms: 0, max: 0 },
    cur: null,
  });
  try {
    localStorage.setItem('dkla.guide.v1', 'seen');
  } catch {
    /* private window */
  }
  const watch = (type, into, pick, extra = {}) => {
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) into.push(pick(e));
      }).observe({ type, buffered: true, ...extra });
    } catch {
      /* this entry type is not supported here */
    }
  };
  watch('longtask', F.longtask, (e) => ({ t: e.startTime, d: e.duration }));
  watch('long-animation-frame', F.loaf, (e) => ({
    t: e.startTime,
    d: e.duration,
    block: e.blockingDuration,
    render: e.renderStart ? e.startTime + e.duration - e.renderStart : 0,
    layout: e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0,
    scripts: (e.scripts || []).map((s) => ({
      d: s.duration,
      forced: s.forcedStyleAndLayoutDuration,
      invoker: s.invoker,
      type: s.invokerType,
      fn: s.sourceFunctionName,
      pos: s.sourceCharPosition,
      inline: s.sourceURL === location.href.split('#')[0],
      url: s.sourceURL,
    })),
  }));
  watch(
    'event',
    F.event,
    (e) => ({
      t: e.startTime,
      d: e.duration,
      name: e.name,
      delay: e.processingStart - e.startTime,
      proc: e.processingEnd - e.processingStart,
      id: e.interactionId,
    }),
    { durationThreshold: 16 },
  );
  watch('layout-shift', F.shift, (e) => ({
    t: e.startTime,
    v: e.value,
    input: e.hadRecentInput,
    what: (e.sources || [])
      .slice(0, 3)
      .map((s) => (s.node && s.node.nodeType === 1 ? describe(s.node) : '?')),
  }));
  watch('paint', F.paint, (e) => ({ name: e.name, t: e.startTime }));
  watch('largest-contentful-paint', F.lcp, (e) => ({ t: e.startTime, size: e.size }));

  function describe(el) {
    if (!el || el.nodeType !== 1) return el === document ? 'document' : String(el && el.nodeName);
    const cls = String(
      el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '',
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .join('.');
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '');
  }
  F.describe = describe;

  // When the atlas is shown, and when the search index and the background data are in.
  new MutationObserver((_, o) => {
    if (document.documentElement && document.documentElement.classList.contains('dkla-boot-ready')) {
      F.marks.bootReady = now();
      o.disconnect();
      const poll = () => {
        if (
          !F.marks.searchIndex &&
          window.DKLA &&
          window.DKLA.searchIndexStats &&
          window.DKLA.searchIndexStats.extras > 0
        )
          F.marks.searchIndex = now();
        if (!F.marks.dataDone && window.DKLAData && !window.DKLAData.state().lazy.length)
          F.marks.dataDone = now();
        if (!F.marks.searchIndex || !F.marks.dataDone) setTimeout(poll, 50);
      };
      poll();
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
  document.addEventListener('dkla:data', (e) => F.dataEvents.push({ id: e.detail && e.detail.id, t: now() }));

  // Which JSON blocks are parsed, when, and for how long (the native parser still does the work).
  const parse = JSON.parse;
  JSON.parse = function (text, reviver) {
    const t = now();
    const value = parse.call(this, text, reviver);
    const d = now() - t;
    if (d >= 1 || (typeof text === 'string' && text.length > 100000))
      F.json.push({ t, d, len: typeof text === 'string' ? text.length : 0 });
    return value;
  };
  F.blockLengths = () => {
    const out = {};
    for (const el of document.querySelectorAll('script[id]'))
      if (/json|octet/.test(el.type || '')) out[el.id] = el.textContent.length;
    return out;
  };
  const fetch0 = window.fetch;
  window.fetch = function (input, init) {
    const url = String((input && input.url) || input);
    const rec = /assets\/(data|briefs)\//.test(url)
      ? { url: url.split('/').slice(-2).join('/'), t: now() }
      : null;
    const p = fetch0.apply(this, arguments);
    if (rec) {
      F.fetches.push(rec);
      p.then(
        (r) => {
          rec.head = now() - rec.t;
          rec.status = r.status;
        },
        () => (rec.failed = true),
      );
    }
    return p;
  };
  if (window.crypto && crypto.subtle) {
    const digest = crypto.subtle.digest.bind(crypto.subtle);
    crypto.subtle.digest = function (alg, bytes) {
      const rec = { t: now(), bytes: bytes.byteLength };
      F.digests.push(rec);
      const p = digest(alg, bytes);
      p.then(() => (rec.d = now() - rec.t));
      return p;
    };
  }

  // ---- the census of timers and observers (only for the idle measurements) ----
  if (options && options.wrap) {
    const site = () => {
      const lines = String(new Error().stack).split('\n').slice(3, 7);
      for (const l of lines) {
        const m = /:(\d+):(\d+)\)?$/.exec(l);
        if (m && !/__feel|instrument/.test(l)) return m[1] + ':' + m[2];
      }
      return '?';
    };
    const hit = (kind, where, ms) => {
      if (!F.census) return;
      const key = kind + '@' + where;
      const s = (F.sites[key] = F.sites[key] || { kind, where, calls: 0, ms: 0 });
      s.calls++;
      s.ms += ms;
    };
    const timed = (kind, where, fn) =>
      function (...args) {
        const t = now();
        try {
          return typeof fn === 'function' ? fn.apply(this, args) : undefined;
        } finally {
          hit(kind, where, now() - t);
        }
      };
    const MO = window.MutationObserver;
    window.MutationObserver = class extends MO {
      constructor(cb) {
        const rec = { where: site(), targets: [], calls: 0, records: 0, ms: 0 };
        super((records, o) => {
          const t = now();
          cb(records, o);
          const d = now() - t;
          rec.calls++;
          rec.records += records.length;
          rec.ms += d;
          hit('MutationObserver', rec.where, d);
        });
        this.__rec = rec;
        F.mo.push(rec);
      }
      observe(target, opts) {
        this.__rec.targets.push(
          describe(target) +
            ' {' +
            Object.keys(opts || {})
              .filter((k) => opts[k])
              .join(',') +
            '}',
        );
        this.__rec.live = true;
        return super.observe(target, opts);
      }
      disconnect() {
        this.__rec.live = false;
        return super.disconnect();
      }
    };
    const RO = window.ResizeObserver;
    window.ResizeObserver = class extends RO {
      constructor(cb) {
        const where = site();
        super(timed('ResizeObserver', where, cb));
        F.ro++;
      }
    };
    const IO = window.IntersectionObserver;
    window.IntersectionObserver = class extends IO {
      constructor(cb, o) {
        const where = site();
        super(timed('IntersectionObserver', where, cb), o);
        F.io++;
      }
    };
    const si = window.setInterval;
    window.setInterval = function (fn, delay, ...rest) {
      const where = site();
      const rec = { where, delay, calls: 0 };
      F.intervals.push(rec);
      const id = si(
        timed('setInterval ' + delay + ' ms', where, function (...a) {
          rec.calls++;
          return fn.apply(this, a);
        }),
        delay,
        ...rest,
      );
      rec.id = id;
      return id;
    };
    const ci = window.clearInterval;
    window.clearInterval = function (id) {
      for (const r of F.intervals) if (r.id === id) r.cleared = true;
      return ci(id);
    };
    const st = window.setTimeout;
    window.setTimeout = function (fn, delay, ...rest) {
      if (!F.census || typeof fn !== 'function') return st(fn, delay, ...rest);
      return st(timed('setTimeout', site(), fn), delay, ...rest);
    };
    window.requestAnimationFrame = function (fn) {
      if (!F.census) return raf(fn);
      return raf(timed('requestAnimationFrame', site(), fn));
    };
  }

  // The map's draw(): how often it runs and how long it takes. Installed after start-up by the harness.
  F.wrapDraw = () => {
    if (F.drawWrapped || typeof window.draw !== 'function') return !!F.drawWrapped;
    const inner = window.draw;
    window.draw = function (...args) {
      const t = now();
      try {
        return inner.apply(this, args);
      } finally {
        const d = now() - t;
        F.draw.calls++;
        F.draw.ms += d;
        if (d > F.draw.max) F.draw.max = d;
      }
    };
    F.drawWrapped = true;
    return true;
  };

  // ---- one interaction ----
  let inputArmed = false;
  for (const type of ['pointerdown', 'keydown', 'wheel', 'input', 'touchstart'])
    window.addEventListener(
      type,
      (e) => {
        if (inputArmed && F.cur && F.cur.input == null && e.isTrusted) {
          F.cur.input = e.timeStamp;
          F.cur.inputType = type;
        }
      },
      { capture: true, passive: true },
    );
  for (const type of ['transitionrun', 'animationstart'])
    document.addEventListener(
      type,
      (e) => {
        const c = F.cur;
        if (!c || c.motion.length > 200) return;
        const el = e.target.nodeType === 1 ? e.target : e.target.parentElement;
        const cs = el ? getComputedStyle(el, e.pseudoElement || null) : null;
        c.motion.push({
          at: now() - c.t0,
          kind: type === 'transitionrun' ? 'transition' : 'animation',
          what: e.propertyName || e.animationName,
          on: describe(el) + (e.pseudoElement || ''),
          dur: cs ? (type === 'transitionrun' ? cs.transitionDuration : cs.animationDuration) : '',
          ease: cs
            ? type === 'transitionrun'
              ? cs.transitionTimingFunction
              : cs.animationTimingFunction
            : '',
          count: cs && type !== 'transitionrun' ? cs.animationIterationCount : '',
        });
      },
      true,
    );
  F.begin = (untilSrc, mutSel, sampleSrc) => {
    const c = (F.cur = {
      t0: now(),
      input: null,
      stamps: [],
      until: untilSrc ? new Function('return (' + untilSrc + ')()') : null,
      trueAt: null,
      paintedAt: null,
      done: !untilSrc,
      motion: [],
      muts: [],
      samples: [],
      draw0: { ...F.draw },
    });
    const sample = sampleSrc ? new Function('return (' + sampleSrc + ')()') : null;
    inputArmed = true;
    if (mutSel) {
      const target = document.querySelector(mutSel);
      if (target) {
        c.mo = new MutationObserver((list) => {
          let nodes = 0;
          for (const r of list) nodes += r.addedNodes.length + r.removedNodes.length;
          c.muts.push({ t: now(), n: list.length, nodes });
        });
        c.mo.observe(target, { childList: true, subtree: true });
      }
    }
    const tick = (t) => {
      if (F.cur !== c || c.stopped) return;
      c.stamps.push(t);
      if (sample) {
        try {
          c.samples.push(sample());
        } catch {
          c.samples.push(null);
        }
      }
      if (c.until && c.trueAt != null && c.paintedAt == null) {
        c.paintedAt = now();
        c.done = true;
      }
      if (c.until && c.trueAt == null) {
        let ok = false;
        try {
          ok = !!c.until();
        } catch {
          ok = false;
        }
        if (ok) c.trueAt = now();
      }
      raf(tick);
    };
    raf(tick);
    return c.t0;
  };
  // For actions started from script (a route change): the moment the action was issued.
  F.mark = () => {
    if (F.cur && F.cur.input == null) {
      F.cur.input = now();
      F.cur.inputType = 'script';
    }
  };
  F.end = (eventNames) => {
    const c = F.cur;
    c.stopped = true;
    inputArmed = false;
    if (c.mo) c.mo.disconnect();
    const from = c.input != null ? c.input : c.t0;
    const gaps = [];
    for (let i = 1; i < c.stamps.length; i++) gaps.push(c.stamps[i] - c.stamps[i - 1]);
    const share = (limit) => (gaps.length ? gaps.filter((g) => g > limit).length / gaps.length : 0);
    const sorted = [...gaps].sort((a, b) => a - b);
    const since = (list) => list.filter((e) => e.t >= c.t0 - 1);
    const events = since(F.event).filter((e) => !eventNames || eventNames.includes(e.name));
    // With a per-frame sample (the map camera, a scroll position): when it first moved, and how often.
    let firstChange = null,
      distinct = null;
    if (c.samples.length) {
      const keys = c.samples.map((s) => JSON.stringify(s));
      const i = keys.findIndex((k) => k !== keys[0]);
      // stamps[i] is the frame that drew the change; it is on screen by the next one.
      if (i > 0) firstChange = (c.stamps[i + 1] ?? c.stamps[i] + 16.7) - from;
      let moves = 0;
      for (let k = 1; k < keys.length; k++) if (keys[k] !== keys[k - 1]) moves++;
      distinct = moves;
    }
    const loaf = since(F.loaf);
    const scripts = loaf
      .flatMap((l) => l.scripts)
      .sort((a, b) => b.d - a.d)
      .slice(0, 6);
    const shifts = since(F.shift);
    const lastMut = c.muts.length ? c.muts[c.muts.length - 1].t - from : 0;
    const buckets = [];
    for (const m of c.muts) {
      const i = Math.max(0, Math.floor((m.t - from) / 250));
      buckets[i] = (buckets[i] || 0) + m.n;
    }
    return {
      inputType: c.inputType || 'none',
      // Event Timing: from the input's timestamp to the next painted frame (the browser rounds to 8 ms).
      eventToPaint: events.length ? Math.max(...events.map((e) => e.d)) : null,
      eventDelay: events.length ? Math.max(...events.map((e) => e.delay)) : null,
      eventHandlers: events.length ? Math.max(...events.map((e) => e.proc)) : null,
      // From the input to the first frame drawn with the expected result in the page.
      resultPainted: c.paintedAt != null ? c.paintedAt - from : null,
      firstChange,
      distinctSamples: distinct,
      frames: gaps.length,
      frameMedian: sorted.length ? sorted[sorted.length >> 1] : null,
      frameP95: sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : null,
      frameMax: sorted.length ? sorted[sorted.length - 1] : null,
      over16_7: share(16.7),
      over20: share(20),
      over33: share(33.4),
      over50: share(50),
      loafCount: loaf.length,
      loafMax: loaf.length ? Math.max(...loaf.map((l) => l.d)) : 0,
      loafBlocking: loaf.reduce((s, l) => s + l.block, 0),
      forcedLayout: loaf.reduce((s, l) => s + l.scripts.reduce((a, b) => a + (b.forced || 0), 0), 0),
      longTasks: since(F.longtask).length,
      shift: shifts.reduce((s, e) => s + e.v, 0),
      shiftNoInput: shifts.filter((e) => !e.input).reduce((s, e) => s + e.v, 0),
      shiftCount: shifts.length,
      mutations: c.muts.reduce((s, m) => s + m.n, 0),
      mutatedNodes: c.muts.reduce((s, m) => s + m.nodes, 0),
      lastMutation: lastMut,
      draws: F.draw.calls - c.draw0.calls,
      drawMs: F.draw.ms - c.draw0.ms,
      detail: {
        scripts,
        shiftSources: [...new Set(shifts.flatMap((e) => e.what))].slice(0, 6),
        mutationBuckets250ms: Array.from(buckets, (b) => b || 0).slice(0, 24),
        motion: c.motion.slice(0, 40),
        samples: c.samples.length ? c.samples : undefined,
        events: events.slice(0, 12),
      },
    };
  };
};
