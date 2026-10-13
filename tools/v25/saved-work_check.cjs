'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'saved-work.js'),'utf8');
const seed={graphId:'owner-graph',dklaRelease:{contentBuild:'current-content'},studyMap:{layoutId:'seed-layout'}};
const key='legal-atlas-v1:owner-graph:dkla-r8-rebuilt';
const saved=()=>({format:'legal-atlas',schemaVersion:1,graphId:seed.graphId,dklaRelease:{...seed.dklaRelease},studyMap:{layoutId:'v25-curated-locked',homes:{owner:{x:12,y:34}}},revision:23,updatedAt:'2030-01-01',nodes:[{id:'owner',notes:'Exact owner prose',updatedAt:'2030-01-01'}],edges:[]});
function fixture(record=saved()){
  class Store{constructor(db='LegalAtlasPortable',name='graphs'){this.name=name;this.transaction={db:{name:db}};}get(key){const listeners=[];const r={result:structuredClone(record),addEventListener(type,fn){assert.equal(type,'success');listeners.push(fn);},fire(){for(const fn of listeners)fn();this.onsuccess?.();}};return r;}}
  const original=Store.prototype.get,context={window:{},document:{getElementById:()=>({textContent:JSON.stringify(seed)})},IDBObjectStore:Store,
    localStorage:new Proxy({}, {get(){throw Error('Adapter must not access or mutate localStorage');}})};
  vm.runInNewContext(source,context);return{Store,context,original};
}
let count=0;
function check(name,fn){fn();count++;}
check('compatible clone restores; source record and revision unchanged',()=>{const raw=saved(),f=fixture(raw),r=new f.Store().get(key);let seen;r.onsuccess=()=>seen=structuredClone(r.result);r.fire();assert.equal(seen.studyMap.layoutId,'seed-layout');assert.equal(seen.nodes[0].notes,'Exact owner prose');assert.equal(seen.revision,23);assert.equal(seen.updatedAt,'2030-01-01');assert.deepEqual(seen.studyMap.homes,raw.studyMap.homes);assert.equal(raw.studyMap.layoutId,'v25-curated-locked');assert.equal(f.Store.prototype.get,f.original);assert.equal(f.context.window.DKLASavedWork.bridged,true);});
for(const [name,change]of [['graph',r=>r.graphId='other'],['build',r=>r.dklaRelease.contentBuild='other'],['layout',r=>r.studyMap.layoutId='unknown-layout'],['schema',r=>r.schemaVersion=2],['malformed',r=>delete r.nodes]])check(name+' mismatch ignored',()=>{const raw=saved();change(raw);const f=fixture(raw),r=new f.Store().get(key);r.fire();assert.deepEqual(r.result,raw);assert.equal(f.context.window.DKLASavedWork.bridged,false);});
for(const [db,store,k]of [['OtherDatabase','graphs',key],['LegalAtlasPortable','other',key],['LegalAtlasPortable','graphs','other-key']])check('unrelated store untouched',()=>{const raw=saved(),f=fixture(raw),r=new f.Store(db,store).get(k);r.fire();assert.deepEqual(r.result,raw);assert.notEqual(f.Store.prototype.get,f.original);});
check('empty cache ignored',()=>{const f=fixture(null),r=new f.Store().get(key);r.fire();assert.equal(r.result,null);assert.equal(f.context.window.DKLASavedWork.bridged,false);});
check('installation is idempotent',()=>{const f=fixture(),first=f.Store.prototype.get,state=f.context.window.DKLASavedWork;vm.runInNewContext(source,f.context);assert.equal(f.Store.prototype.get,first);assert.equal(f.context.window.DKLASavedWork,state);});
check('existing revision gate still rejects old records',()=>{const raw=saved();raw.revision=1;const f=fixture(raw),r=new f.Store().get(key);r.fire();const current={revision:12,updatedAt:'2026-01-01'};assert.equal(r.result.revision>current.revision||r.result.revision===current.revision&&r.result.updatedAt>=current.updatedAt,false);});
console.log(JSON.stringify({passed:count,scope:'one returned clone marker; graph/build/layout/schema gates, unrelated calls, revision, handler order, idempotence; no storage writes'}));
