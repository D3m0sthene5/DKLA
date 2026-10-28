/* `pnpm coverage`: run the three browser checks with Chromium's JavaScript
   coverage recording on, then write the report (see report.mjs).

   Uses what is already built in dist/ (run `pnpm build` first). The checks run
   one after another with generous time limits, because recording slows each
   page; their pass or fail is reported but the point here is the record. */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { root } from '../../runtime.mjs';

const out = path.join(root, 'work/coverage');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const port = await new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once('error', reject);
  s.listen(0, '127.0.0.1', () => {
    const { port } = s.address();
    s.close(() => resolve(port));
  });
});
const base = `http://127.0.0.1:${port}`,
  page = base + '/DKLA-v2.8.html',
  server = spawn(process.execPath, ['tools/preview.mjs', '--no-build', '--port', String(port)], {
    cwd: root,
    stdio: 'ignore',
  });
const reachable = () =>
  new Promise((resolve) =>
    http
      .get(base + '/version.json', (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      })
      .on('error', () => resolve(false)),
  );
const env = {
  ...process.env,
  DKLA_COVERAGE_DIR: out,
  DKLA_HOME_TEST_URL: page,
  DKLA_VIEWS_URL: page,
  FORCE_COLOR: '0',
};
const playwright = 'node_modules/@playwright/test/cli.js';
const checks = [
  ['29 interactions', ['tools/verify/browser_smoke.cjs', '--url', page, '--output', 'work/coverage/smoke']],
  ['main views', [playwright, 'test', '-c', 'tools/verify/views.config.mjs', '--workers=2']],
  [
    'Home at nine window sizes',
    [playwright, 'test', 'tools/v25/home-fit.spec.mjs', '--workers=3', '--timeout=120000', '--reporter=line'],
  ],
];
let failed = 0;
try {
  for (let i = 0; !(await reachable()); i++) {
    if (i > 150) throw Error('The preview server did not start. Run `pnpm build` first.');
    await new Promise((r) => setTimeout(r, 100));
  }
  for (const [name, args] of checks) {
    const result = spawnSync(process.execPath, args, {
      cwd: root,
      env,
      encoding: 'utf8',
      maxBuffer: 1 << 28,
    });
    console.log(`${result.status === 0 ? 'ok  ' : 'FAIL'}  ${name}`);
    if (result.status !== 0) {
      failed++;
      console.log((result.stdout + result.stderr).trimEnd().split('\n').slice(-25).join('\n'));
    }
  }
} finally {
  server.kill();
}
for (const script of ['tools/verify/survey.mjs', 'tools/verify/coverage/report.mjs']) {
  const result = spawnSync(process.execPath, [script], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (failed) {
  console.log(`\n${failed} check(s) failed while recording; the report covers only what did run.`);
  process.exit(1);
}
