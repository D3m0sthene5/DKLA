/* Explicit public allowlist. Source inputs and local evidence stay outside dist. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {splitBriefs} from './performance/package.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'dist');
const manifest=JSON.parse(await fs.readFile(path.join(root,'tools/public-files.json'),'utf8'));
const verified=[];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
async function copy(relative){
  if(path.isAbsolute(relative)||relative.split(/[\\/]/).some(p=>p==='..'||p==='.'||p===''))throw Error('Invalid public path: '+relative);
  const generated=new Set(['DKLA-v2.6.html','index.html','sw.js','version.json','assets/admin/catalog.js']);
  const source=path.join(root,generated.has(relative)?'work/build':'',relative), target=path.join(output,relative);
  const stat=await fs.lstat(source);
  if(stat.isSymbolicLink())throw Error('Symlink cannot be published: '+relative);
  if(stat.isDirectory()){
    for(const name of (await fs.readdir(source)).sort())await copy(relative+'/'+name);
  }else if(stat.isFile()){
    await fs.mkdir(path.dirname(target),{recursive:true});
    await fs.copyFile(source,target);
    const [before,after]=await Promise.all([fs.readFile(source),fs.readFile(target)]);
    if(!before.equals(after))throw Error('Public copy differs: '+relative);
    verified.push({path:relative,bytes:before.length,sha256:hash(before)});
  }else throw Error('Unsupported public file: '+relative);
}
// output is a fixed child of this repository, never derived from user input.
if(path.dirname(output)!==root||path.basename(output)!=='dist')throw Error('Unsafe output directory');
try{if((await fs.lstat(output)).isSymbolicLink())throw Error('dist is a symlink');}catch(error){if(error.code!=='ENOENT')throw error;}
await fs.rm(output,{recursive:true,force:true});
await fs.mkdir(output);
for(const name of [...manifest.files,...manifest.directories])await copy(name);
// Only the current hosted release is split. Every historical public file and the
// canonical work/build portable HTML remain untouched.
const hostedPath='DKLA-v2.6.html';
const canonical=await fs.readFile(path.join(root,'work/build',hostedPath),'utf8');
const split=splitBriefs(canonical);
for(const item of [...split.files,{path:hostedPath,bytes:Buffer.from(split.html)}]){
  const target=path.join(output,item.path);
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,item.bytes);
  const actual=await fs.readFile(target);
  if(!actual.equals(item.bytes))throw Error('Hosted write differs: '+item.path);
  const index=verified.findIndex(f=>f.path===item.path);
  const record={path:item.path,bytes:actual.length,sha256:hash(actual)};
  if(index<0)verified.push(record);else verified[index]=record;
}
await fs.mkdir(path.join(root,'work'),{recursive:true});
await fs.writeFile(path.join(root,'work/public-manifest.json'),JSON.stringify({files:verified},null,2)+'\n');
console.log(`Public output: ${verified.length} files, byte-verified; src/ and tools/ excluded.`);
