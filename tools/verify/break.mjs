/* Proof that the checks have teeth: `pnpm verify:teeth`.

   Breaks one thing at a time (a case record, a brief, runtime code, a layout
   position, the saved-work path, ...), runs the whole verification pass, and
   requires it to FAIL each time. Every file is put back exactly as it was,
   and a final clean pass must succeed. Takes about eight minutes.

   Run this after changing how verification works (what runs, in what order,
   what is cached or skipped). A change that makes the pass faster must still
   catch every one of these.

     node tools/verify/break.mjs          all breakages
     node tools/verify/break.mjs 4,6      only those numbers (see the list printed) */
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {root} from '../runtime.mjs';
const at=file=>path.join(root,file);
const edit=(file,from,to)=>{const text=fs.readFileSync(at(file),'utf8');if(!text.includes(from))throw Error(`Cannot break ${file}: "${from}" is no longer there. Update tools/verify/break.mjs.`);fs.writeFileSync(at(file),text.replace(from,to));};
const append=(file,text)=>fs.appendFileSync(at(file),text);
// Change one lower-case letter near the middle of a file.
const flip=file=>{const bytes=fs.readFileSync(at(file));let i=bytes.length>>1;while(bytes[i]<97||bytes[i]>121)i++;bytes[i]++;fs.writeFileSync(at(file),bytes);};
const first=(folder,extension)=>{const walk=dir=>{for(const entry of fs.readdirSync(at(dir),{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1)){const child=dir+'/'+entry.name;if(entry.isDirectory()){const found=walk(child);if(found)return found;}else if(child.endsWith(extension)&&fs.statSync(at(child)).size>400)return child;}};return walk(folder);};
const record=first('src/data/seedData','.json'),brief=first('tools/r19/data/briefs','.md'),narrative=first('tools/cold-call/narratives','.json');
const TYPOGRAPHY='tools/v26/typography.js',STRICT="'use strict';";

const breakages=[
  ['a case record in the atlas data',record,()=>flip(record)],
  ['a case brief',brief,()=>flip(brief)],
  ['a Cold Call narrative',narrative,()=>flip(narrative)],
  ['an entry in the authorities dataset','tools/v25/authorities.json',()=>edit('tools/v25/authorities.json','"basis": "Explicit citation in atlas entry"','"basis": "Explicit citation in atlas entri"')],
  ['runtime code in the base app','src/runtime/dklaUI.js',()=>flip('src/runtime/dklaUI.js')],
  ['runtime code in a feature layer','tools/v25/reading.js',()=>edit('tools/v25/reading.js',STRICT,STRICT+'window.__changed=1;')],
  ['a layout position: the History block moved',TYPOGRAPHY,()=>edit(TYPOGRAPHY,"root.dataset.dklaCourt='1';","root.dataset.dklaCourt='1';bg.setAttribute('x',Number(bg.getAttribute('x'))+3000);")],
  ['a layout position: a subject moved in the map data','tools/v25/geography.json',()=>{const text=fs.readFileSync(at('tools/v25/geography.json'),'utf8'),found=text.match(/"x":\s*(-?\d+(?:\.\d+)?)/);if(!found)throw Error('No x coordinate found in geography.json');fs.writeFileSync(at('tools/v25/geography.json'),text.replace(found[0],found[0].replace(found[1],String(Number(found[1])+900))));}],
  ['saved work: study ratings wiped when the atlas loads',TYPOGRAPHY,()=>edit(TYPOGRAPHY,STRICT,STRICT+"try{localStorage.removeItem('dkla.study.v1');}catch{}")],
  ['saved work: saved notes not read back after a reload',TYPOGRAPHY,()=>edit(TYPOGRAPHY,STRICT,STRICT+"try{const store=IDBObjectStore.prototype,get=store.get;store.get=function(...a){return this.name==='graphs'?get.call(this,'missing'):get.apply(this,a);};}catch{}")],
  ['a feature: the dictionary hidden by a style','tools/v26/typography.css',()=>append('tools/v26/typography.css','\n#glossaryDialog[open]{display:none!important}\n')],
  ['offline use: the worker stops caching the atlas','tools/r19/sw.template.js',()=>edit('tools/r19/sw.template.js','cache.addAll(SHELL)','cache.addAll([])')],
  ['an old link: one earlier address no longer redirects','vercel.json',()=>edit('vercel.json','"source": "/DKLA-r17.html"','"source": "/DKLA-r17x.html"')],
];

const pass=()=>{const began=Date.now(),result=spawnSync(process.execPath,['tools/verify/run.mjs'],{cwd:root,encoding:'utf8',maxBuffer:1<<28});
  return {failed:result.status!==0,seconds:Math.round((Date.now()-began)/1000),by:[...result.stdout.matchAll(/^FAIL\s+[\d.]+s\s+(.+)$/gm)].map(match=>match[1].trim()),tail:result.stdout.trim().split('\n').slice(-3).join(' | ')};};
const chosen=process.argv[2]?process.argv[2].split(',').map(Number):breakages.map((_,index)=>index+1);
let missed=0;
for(const number of chosen){
  const [name,file,apply]=breakages[number-1],original=fs.readFileSync(at(file));
  let result;
  try{apply();result=pass();}finally{fs.writeFileSync(at(file),original);}
  if(!result.failed)missed++;
  console.log(`${String(number).padStart(2)}. ${result.failed?'caught':'MISSED'}  ${name}  (${result.seconds}s)\n      ${result.failed?'by: '+result.by.join('; '):'the pass succeeded although '+file+' was altered'}`);
}
const clean=pass();
console.log(`\nWith everything restored: ${clean.failed?'THE PASS FAILS: '+clean.tail:'the pass succeeds ('+clean.seconds+'s).'}`);
if(missed||clean.failed){console.log(missed?`${missed} breakage(s) were not caught.`:'');process.exit(1);}
console.log(`All ${chosen.length} breakages were caught.`);
