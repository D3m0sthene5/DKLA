/* Runs verification steps as soon as the steps they need have passed.

     node tools/verify/run.mjs                 everything (this is `pnpm verify`)
     node tools/verify/run.mjs --group browser only one group; steps it needs from
                                               other groups are assumed already done
     node tools/verify/run.mjs --serial        one step at a time, for comparison

   Every step's output is kept and shown in full if the step fails. The pass
   fails if any step fails or could not run. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { root } from '../runtime.mjs';
import { tasks as all } from './tasks.mjs';

const argv = process.argv.slice(2),
  option = (name) => {
    const i = argv.indexOf(name);
    return i < 0 ? null : argv[i + 1];
  };
const group = option('--group'),
  serial = argv.includes('--serial');
const tasks = group ? all.filter((t) => t.group === group) : all;
if (!tasks.length) throw Error('No steps in group ' + group);
// Steps are tracked by name, so two with one name would silently run as one.
for (const [index, task] of all.entries())
  if (all.findIndex((other) => other.name === task.name) !== index)
    throw Error('Two verification steps are both named "' + task.name + '"');

// The older one-at-a-time entry points list the same scripts. If a script is
// added there and not here, the fast pass would silently cover less: refuse.
for (const file of [
  'tools/check.mjs',
  'tools/verify/check.mjs',
  'tools/build.mjs',
  'tools/build-steps.mjs',
]) {
  const named = [
    ...fs.readFileSync(path.join(root, file), 'utf8').matchAll(/'(tools\/[\w./-]+\.(?:py|cjs|mjs))'/g),
  ].map((m) => m[1]);
  for (const script of named)
    if (!all.some((t) => t.command?.[1].includes(script)))
      throw Error(`${script} is run by ${file} but is missing from tools/verify/tasks.mjs`);
}

const started = Date.now(),
  seconds = (since) => ((Date.now() - since) / 1000).toFixed(1).padStart(6) + 's';
const state = new Map(tasks.map((t) => [t.name, { task: t, status: 'waiting', output: '' }]));
const known = (name) => state.has(name);
let server = null,
  base = '',
  running = 0,
  load = 0;
// How much may run at once. Each step has a weight (roughly the processors it
// keeps busy; 1 unless tasks.mjs says otherwise) and the weights of running
// steps stay within the budget. Without this a small machine, such as a
// four-processor CI runner, is given thirteen browsers at once and steps with
// time limits fail for lack of processor time. On a large machine the budget
// is generous enough that nothing waits.
const cores = os.availableParallelism(),
  budget = cores > 8 ? cores + 4 : cores;

const freePort = () =>
  new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
const reachable = (url) =>
  new Promise((resolve) =>
    http
      .get(url, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      })
      .on('error', () => resolve(false)),
  );
async function startServer() {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['tools/preview.mjs', '--no-build', '--port', String(port)], {
    cwd: root,
    stdio: 'ignore',
  });
  for (let i = 0; !(await reachable(base + '/version.json')); i++) {
    if (i > 150) throw Error('Preview server did not start');
    await new Promise((r) => setTimeout(r, 100));
  }
}
const fill = (text) => text.replaceAll('{url}', base).replaceAll('{page}', base + '/DKLA-v2.7.html');
function execute(task) {
  if (task.server)
    return startServer().then(
      () => ({ code: 0, output: base }),
      (error) => ({ code: 1, output: String(error) }),
    );
  return new Promise((resolve) => {
    const [command, args] = task.command,
      env = { ...process.env, PYTHONUTF8: '1', FORCE_COLOR: '0' };
    for (const [key, value] of Object.entries(task.env || {})) env[key] = fill(value);
    const child = spawn(command, args.map(fill), { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    child.on('error', (error) => resolve({ code: 1, output: output + String(error) }));
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
}
const skip = (entry, why) => {
  entry.status = 'skipped';
  entry.output = 'Not run: ' + why;
  console.log(`SKIP ${''.padStart(7)}  ${entry.task.name}  (${why})`);
};
await new Promise((done) => {
  const schedule = () => {
    for (let changed = true; changed; ) {
      changed = false;
      for (const entry of state.values()) {
        if (entry.status !== 'waiting') continue;
        const needs = entry.task.needs.filter(known).map((name) => state.get(name));
        const blocker = needs.find((n) => n.status === 'failed' || n.status === 'skipped');
        if (blocker) {
          skip(entry, `it needs "${blocker.task.name}", which did not pass`);
          changed = true;
          continue;
        }
        if (!needs.every((n) => n.status === 'passed') || (serial && running)) continue;
        const weight = entry.task.weight ?? 1;
        if (load > 0 && load + weight > budget) continue; // no room yet; a step always starts when nothing else is running
        entry.status = 'running';
        entry.startedAt = Date.now();
        entry.offset = entry.startedAt - started;
        running++;
        load += weight;
        changed = true;
        execute(entry.task).then(({ code, output }) => {
          running--;
          load -= weight;
          entry.output = output;
          entry.seconds = (Date.now() - entry.startedAt) / 1000;
          entry.status = code === 0 ? 'passed' : 'failed';
          console.log(`${code === 0 ? 'ok  ' : 'FAIL'} ${seconds(entry.startedAt)}  ${entry.task.name}`);
          schedule();
        });
      }
    }
    if (running) return;
    // Nothing is running: anything still waiting can never start.
    for (const entry of state.values())
      if (entry.status === 'waiting') skip(entry, 'the steps it needs never finished');
    done();
  };
  schedule();
});
server?.kill();

const entries = [...state.values()],
  bad = entries.filter((e) => e.status !== 'passed');
for (const entry of bad) {
  console.log(`\n===== ${entry.status.toUpperCase()}: ${entry.task.name} =====`);
  console.log(entry.output.trimEnd() || '(no output)');
}
// On GitHub, also raise each failure as an annotation: those can be read from
// the run's summary page without opening (or being signed in to see) the log.
if (process.env.GITHUB_ACTIONS)
  for (const entry of bad.filter((e) => e.status === 'failed')) {
    const tail = entry.output
        .replace(/\x1b\[[0-9;]*m/g, '')
        .trimEnd()
        .slice(-3000),
      encode = (text) => text.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
    console.log(
      `::error title=${encode(entry.task.name).replaceAll(':', '%3A').replaceAll(',', '%2C')}::${encode(tail || '(no output)')}`,
    );
  }
// What set the total: follow the chain of waits back from the step that finished last.
const finish = (e) => e.offset + e.seconds * 1000,
  done = entries.filter((e) => e.seconds !== undefined);
const chain = [];
for (let current = done.sort((a, b) => finish(b) - finish(a))[0]; current; ) {
  chain.unshift(`${current.task.name} ${current.seconds.toFixed(1)}s`);
  current = current.task.needs
    .filter(known)
    .map((n) => state.get(n))
    .filter((e) => e.seconds !== undefined)
    .sort((a, b) => finish(b) - finish(a))[0];
}
fs.mkdirSync(path.join(root, 'work'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'work/verify-timing.json'),
  JSON.stringify(
    {
      total: (Date.now() - started) / 1000,
      serial,
      steps: entries.map((e) => ({
        name: e.task.name,
        group: e.task.group,
        status: e.status,
        startedAfter: e.offset === undefined ? null : +(e.offset / 1000).toFixed(1),
        seconds: e.seconds === undefined ? null : +e.seconds.toFixed(1),
      })),
    },
    null,
    1,
  ) + '\n',
);
console.log(
  `\n${entries.length - bad.length} of ${entries.length} steps passed in ${seconds(started).trim()}.`,
);
console.log('Longest chain: ' + chain.join('  ->  '));
if (bad.length) {
  console.log('FAILED: ' + bad.map((e) => e.task.name).join('; '));
  process.exit(1);
}
console.log(group ? `All ${group} checks passed.` : 'All checks passed.');
