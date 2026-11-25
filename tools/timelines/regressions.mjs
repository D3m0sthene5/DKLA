/* Serve deliberately broken copies in memory. Never mutate source or build files. */
import http from 'node:http';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
const html = await fs.readFile('dist/DKLA-v3.2.html', 'utf8');
const source = process.argv[2] || 'http://127.0.0.1:8877';
const mutations = [
  ['missing introduction', 'esc(t.guide)', "''", /orientation is visible/],
  [
    'dropped timeline entry',
    'const steps = t.steps.filter(live);',
    'const steps = t.steps.filter(live).slice(1);',
    /no step omitted/,
  ],
];
for (const [name, from, to, expected] of mutations) {
  if (!html.includes(from)) throw Error('Missing mutation target: ' + name);
  const mutated = html.replace(from, to);
  const server = http.createServer((req, res) => {
    if (req.url.split('?')[0] === '/DKLA-v3.2.html') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': Buffer.byteLength(mutated),
      });
      res.end(mutated);
      return;
    }
    const upstream = http.get(source + req.url, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });
    upstream.on('error', (e) => {
      res.writeHead(502);
      res.end(e.message);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/DKLA-v3.2.html`;
  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, ['tools/timelines/browser.mjs', url]);
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    const timer = setTimeout(() => child.kill('SIGTERM'), 90000);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, output });
    });
  });
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
  if (result.code === 0 || !expected.test(result.output)) {
    console.error(result.output);
    throw Error('Did not catch intended regression: ' + name);
  }
  console.log('PASS deliberately broken ' + name + ' was caught by its intended assertion');
}
