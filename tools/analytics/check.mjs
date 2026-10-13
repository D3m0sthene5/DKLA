import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const baseline=await readFile('DKLA-r18.html','utf8'),release=await readFile('DKLA-v2.5.html','utf8');
const blocks=html=>new Map([...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map(m=>[m[1].match(/\bid="([^"]+)"/)?.[1],m[2]]).filter(([id])=>id));
const original=blocks(baseline),built=blocks(release);for(const [id,contents]of original)assert.equal(built.get(id),contents,`Baseline block changed: ${id}`);
assert.ok(release.includes('First-party semantic analytics'));assert.ok(!release.includes('/assets/admin/app.js'));
const manifest=JSON.parse(await readFile('tools/v25/runtime-manifest.json','utf8'));assert.equal(manifest.javascript.filter(s=>s==='tools/analytics/tracker.js').length,1);
assert.deepEqual((await readdir('api')).filter(s=>s.endsWith('.js')).sort(),['admin.js','analytics.js','sync.js']);
const worker=await readFile('sw.js','utf8');assert.ok(!/const SHELL[^;]*admin/.test(worker));assert.ok(worker.includes("path === 'admin'"));
const tracker=await readFile('tools/analytics/tracker.js','utf8');assert.ok(tracker.includes("CACHE='atlas-analytics-identity-v1'"));assert.ok(!/getImageData|toDataURL|AudioContext|WebGLRenderingContext/.test(tracker));
const hash=createHash('sha256').update(await readFile('DKLA-r18.html')).digest('hex');assert.equal(hash,'bffd3d4469836a19eaafbd2e29eff443b08b87d496147c887f5d2589d3cb45c1');
const routing=JSON.parse(await readFile('vercel.json','utf8'));
const matchesHost=(route,host)=>!route.has||route.has.every(c=>c.type==='host'&&new RegExp('^'+c.value+'$').test(host));
for(const path of ['/','/index.html']){
 const dashboard=routing.redirects.find(r=>r.source===path&&matchesHost(r,'dkla.dev'));
 assert.equal(dashboard?.destination,'/admin',`Private entry must redirect before static index: ${path}`);
 assert.equal(dashboard.permanent,false);
 assert.ok(!routing.redirects.some(r=>r.source===path&&matchesHost(r,'www.dannykind.wiki')),'Public Atlas entry must not redirect to admin');
}
assert.equal(routing.rewrites.find(r=>r.source==='/admin')?.destination,'/api/admin?action=page');
console.log(`${original.size} original script blocks preserved; 3 API functions; own-origin collector; admin excluded from offline shell.`);
