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
// Files are copied and checked several at a time; results keep the listed order.
async function each(items,limit,work){
  const results=new Array(items.length);let next=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(next<items.length){const index=next++;results[index]=await work(items[index]);}}));
  return results;
}
const sourceOf=relative=>path.join(root,new Set(['DKLA-v2.6.html','index.html','sw.js','version.json','assets/admin/catalog.js']).has(relative)?'work/build':'',relative);
// The allowlist in order, with each listed directory expanded to its files.
async function listed(relative){
  if(path.isAbsolute(relative)||relative.split(/[\\/]/).some(p=>p==='..'||p==='.'||p===''))throw Error('Invalid public path: '+relative);
  const stat=await fs.lstat(sourceOf(relative));
  if(stat.isSymbolicLink())throw Error('Symlink cannot be published: '+relative);
  if(stat.isDirectory()){const found=[];for(const name of (await fs.readdir(sourceOf(relative))).sort())found.push(...await listed(relative+'/'+name));return found;}
  if(stat.isFile())return [relative];
  throw Error('Unsupported public file: '+relative);
}
async function copy(relative){
  const source=sourceOf(relative), target=path.join(output,relative);
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.copyFile(source,target);
  const [before,after]=await Promise.all([fs.readFile(source),fs.readFile(target)]);
  if(!before.equals(after))throw Error('Public copy differs: '+relative);
  return {path:relative,bytes:before.length,sha256:hash(before)};
}
// output is a fixed child of this repository, never derived from user input.
if(path.dirname(output)!==root||path.basename(output)!=='dist')throw Error('Unsafe output directory');
try{if((await fs.lstat(output)).isSymbolicLink())throw Error('dist is a symlink');}catch(error){if(error.code!=='ENOENT')throw error;}
await fs.rm(output,{recursive:true,force:true});
await fs.mkdir(output);
const publicFiles=[];
for(const name of [...manifest.files,...manifest.directories])publicFiles.push(...await listed(name));
verified.push(...await each(publicFiles,12,copy));
// Only the current hosted release is split. Every historical public file and the
// canonical work/build portable HTML remain untouched.
const hostedPath='DKLA-v2.6.html';
const canonical=await fs.readFile(path.join(root,'work/build',hostedPath),'utf8');
const split=splitBriefs(canonical);
const hosted=[...split.files,{path:hostedPath,bytes:Buffer.from(split.html)}];
for(const directory of new Set(hosted.map(item=>path.dirname(path.join(output,item.path)))))await fs.mkdir(directory,{recursive:true});
const records=await each(hosted,24,async item=>{
  const target=path.join(output,item.path);
  await fs.writeFile(target,item.bytes);
  const actual=await fs.readFile(target);
  if(!actual.equals(item.bytes))throw Error('Hosted write differs: '+item.path);
  return {path:item.path,bytes:actual.length,sha256:hash(actual)};
});
const position=new Map(verified.map((file,index)=>[file.path,index]));
for(const record of records){
  const index=position.get(record.path);
  if(index===undefined)verified.push(record);else verified[index]=record;
}
await fs.mkdir(path.join(root,'work'),{recursive:true});
await fs.writeFile(path.join(root,'work/public-manifest.json'),JSON.stringify({files:verified},null,2)+'\n');
console.log(`Public output: ${verified.length} files, byte-verified; src/ and tools/ excluded.`);
