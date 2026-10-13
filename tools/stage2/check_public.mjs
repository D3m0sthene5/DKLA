/* Checks the actual loopback server, including ranges and forbidden source URLs. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {splitBriefs} from '../performance/package.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=new URL(process.argv[2]||'http://127.0.0.1:8766');
if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname))throw Error('Loopback only');
const manifest=JSON.parse(await fs.readFile(path.join(root,'work/public-manifest.json'),'utf8'));
const release=JSON.parse(await fs.readFile(path.join(root,'work/build/version.json'),'utf8'));
const config=JSON.parse(await fs.readFile(path.join(root,'vercel.json'),'utf8'));
assert.equal(config.outputDirectory,'dist','Vercel must publish only dist');
const allow=JSON.parse(await fs.readFile(path.join(root,'tools/public-files.json'),'utf8'));
const split=splitBriefs(await fs.readFile(path.join(root,'work/build',release.file),'utf8'));
const generatedBriefs=new Map(split.files.map(f=>[f.path,f.bytes]));
assert.equal(await fs.readFile(path.join(root,'dist',release.file),'utf8'),split.html,'Hosted shell differs from exact transformation');
const publicFiles=[];
async function inventory(relative=''){
  for(const name of await fs.readdir(path.join(root,'dist',relative))){
    const child=relative?relative+'/'+name:name;
    const stat=await fs.lstat(path.join(root,'dist',child));
    assert.equal(stat.isSymbolicLink(),false,'Public symlink: '+child);
    if(stat.isDirectory())await inventory(child);else publicFiles.push(child);
  }
}
await inventory();
assert.deepEqual(publicFiles.sort(),manifest.files.map(f=>f.path).sort(),'Unrecorded or missing public files');
for(const item of manifest.files){
  assert.ok(allow.files.includes(item.path)||allow.directories.some(d=>item.path.startsWith(d+'/'))||generatedBriefs.has(item.path),'File is outside public allowlist: '+item.path);
  const bytes=await fs.readFile(path.join(root,'dist',item.path));
  if(generatedBriefs.has(item.path))assert.ok(bytes.equals(generatedBriefs.get(item.path)),'Brief bytes drifted: '+item.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,'Published bytes drifted: '+item.path);
}
if(!process.argv[2]){
  console.log(JSON.stringify({outputDirectory:config.outputDirectory,byteVerifiedFiles:manifest.files.length,sourceExcluded:true}));
}else{
const report=[];
for(const pathname of ['/src/manifest.json','/src/runtime/appCode.js','/tools/stage2/HANDOFF.md','/work/build/version.json']){
  const response=await fetch(new URL(pathname,base));assert.equal(response.status,404);report.push({path:pathname,status:response.status});
}
for(const prefix of ['added-sources/','DKLA-sources/','icons/']){
  const item=manifest.files.find(f=>f.path.startsWith(prefix)&&/\.(pdf|webp|png)$/.test(f.path))||manifest.files.find(f=>f.path.startsWith(prefix));assert.ok(item,'Missing source coverage '+prefix);
  const response=await fetch(new URL('/'+item.path,base),{headers:{Range:'bytes=0-1023'}});
  assert.equal(response.status,206);const bytes=Buffer.from(await response.arrayBuffer());
  const file=await fs.open(path.join(root,'dist',item.path));const expected=Buffer.alloc(Math.min(1024,item.bytes));await file.read(expected,0,expected.length,0);await file.close();
  assert.ok(bytes.equals(expected),'Source range differs');report.push({path:item.path,status:response.status,bytes:bytes.length});
}
const rootResponse=await fetch(base,{method:'HEAD'});assert.equal(rootResponse.status,200);assert.equal(Number(rootResponse.headers.get('content-length')),manifest.files.find(f=>f.path===release.file).bytes);
console.log(JSON.stringify({checks:report,root:rootResponse.status},null,2));
}
