/* Loopback-only preview of the exact public output, with no API proxy. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { root, run } from './runtime.mjs';
if (!process.argv.includes('--no-build')) run(process.execPath, ['tools/build.mjs']);
const output = path.join(root, 'dist');
const arg = process.argv.indexOf('--port');
const port = arg < 0 ? 8766 : Number(process.argv[arg + 1]);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid preview port');
const routes = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.css': 'text/css; charset=utf-8',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405);
    res.end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  if (pathname.startsWith('/api/')) {
    res.writeHead(503);
    res.end('API unavailable in local static preview');
    return;
  }
  const redirect = routes.redirects?.find((r) => r.source === pathname && !r.has && !r.missing);
  if (redirect) {
    res.writeHead(307, { Location: redirect.destination });
    res.end();
    return;
  }
  const rewrite = routes.rewrites?.find((r) => r.source === pathname && !r.has && !r.missing);
  if (rewrite) pathname = rewrite.destination;
  const file = path.resolve(output, '.' + pathname);
  if (!file.startsWith(output + path.sep)) {
    res.writeHead(404);
    res.end();
    return;
  }
  let stat;
  try {
    stat = fs.statSync(file);
    if (!stat.isFile() || !fs.realpathSync(file).startsWith(output + path.sep)) throw Error();
  } catch {
    res.writeHead(404);
    res.end();
    return;
  }
  let start = 0,
    end = stat.size - 1;
  if (req.headers.range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
    if (!match) {
      res.writeHead(416);
      res.end();
      return;
    }
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), end) : end;
    if (start > end || start >= stat.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      res.end();
      return;
    }
  }
  res.writeHead(req.headers.range ? 206 : 200, {
    'Content-Type': types[path.extname(file)] || 'application/octet-stream',
    'Content-Length': Math.max(0, end - start + 1),
    'Accept-Ranges': 'bytes',
    ...(req.headers.range ? { 'Content-Range': `bytes ${start}-${end}/${stat.size}` } : {}),
  });
  if (req.method === 'HEAD' || stat.size === 0) {
    res.end();
    return;
  }
  const stream = fs.createReadStream(file, { start, end });
  stream.on('error', () => res.destroy());
  stream.pipe(res);
});
server.listen(port, '127.0.0.1', () =>
  console.log(`DKLA preview: http://127.0.0.1:${port}/ (dist/, APIs disabled)`),
);
