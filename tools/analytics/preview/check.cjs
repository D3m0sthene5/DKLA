const fs = require('fs'),
  vm = require('vm'),
  assert = require('assert/strict'),
  path = require('path');
const root = __dirname,
  ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'catalog.js'), 'utf8'), ctx);
const c = ctx.window.DKLA_CATALOG;
ctx.DKLA_CATALOG = c;
// data.js uses the browser global created by catalog.js.
vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), ctx);
const d = ctx.window.DKLA_DEMO,
  ids = new Set(c.nodes.map((n) => n.id));
assert.equal(c.regions.length, 43);
assert.equal(ids.size, 1043);
for (const s of d.sessions) {
  assert(s.start <= s.end);
  assert(s.activeSeconds <= (s.end - s.start) / 1000);
  for (const e of s.events) {
    assert(ids.has(e.entity));
    assert(c.homes[e.entity]);
    assert(e.at >= s.start && e.at <= s.end);
    assert(!('copiedText' in e));
  }
  assert(s.network.ip.startsWith('198.51.100.') || s.network.ip.startsWith('203.0.113.'));
}
for (const p of d.people)
  assert.equal(p.firstSeen, Math.min(...d.sessions.filter((s) => s.person === p.id).map((s) => s.start)));
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
new vm.Script(app);
assert(!/\bfetch\s*\(|sendBeacon\s*\(|XMLHttpRequest|localStorage|indexedDB/.test(app));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(html.includes('noindex'));
assert(!/<script[^>]*src="https?:/.test(html));
console.log(
  JSON.stringify({
    regions: c.regions.length,
    entries: ids.size,
    people: d.people.length,
    sessions: d.sessions.length,
    events: d.sessions.reduce((n, s) => n + s.events.length, 0),
    trackerConnected: false,
  }),
);
