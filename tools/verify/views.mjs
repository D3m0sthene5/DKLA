/* Compare the main views with their recorded pictures, on their own.

     pnpm views            compare (what `pnpm verify` also does)
     pnpm views:update     record new pictures after an intended visual change

   Uses what is already built in dist/ (run `pnpm build` first) and serves it
   on this machine only. */
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import { root } from '../runtime.mjs';
const update = process.argv.includes('--update'),
  extra = process.argv.slice(2).filter((a) => a !== '--update');
const port = await new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once('error', reject);
  s.listen(0, '127.0.0.1', () => {
    const { port } = s.address();
    s.close(() => resolve(port));
  });
});
const base = `http://127.0.0.1:${port}`,
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
let status = 1;
try {
  for (let i = 0; !(await reachable()); i++) {
    if (i > 150) throw Error('The preview server did not start. Run `pnpm build` first.');
    await new Promise((r) => setTimeout(r, 100));
  }
  status =
    spawnSync(
      process.execPath,
      [
        'node_modules/@playwright/test/cli.js',
        'test',
        '-c',
        'tools/verify/views.config.mjs',
        ...(update ? ['--update-snapshots'] : []),
        ...extra,
      ],
      {
        cwd: root,
        stdio: 'inherit',
        env: {
          ...process.env,
          DKLA_VIEWS_URL: base + '/DKLA-v2.7.html',
          ...(update ? { DKLA_VIEWS_RECORD: '1' } : {}),
        },
      },
    ).status ?? 1;
} finally {
  server.kill();
}
process.exit(status);
