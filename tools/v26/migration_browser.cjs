/* Real frozen v2.5 app creates synthetic saved work; v2.6 must read it unchanged. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {chromium}=require('@playwright/test');
const args=process.argv.slice(2),option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const root=path.resolve(__dirname,'../..'),base=new URL(option('--url','http://127.0.0.1:8768'));
assert.ok(['127.0.0.1','localhost','[::1]'].includes(base.hostname),'Loopback only');
const baseline=path.resolve(option('--baseline',path.join(root,'../stage2-evidence/stage1-app.html')));
assert.equal(createHash('sha256').update(fs.readFileSync(baseline)).digest('hex'),'185dcdbbb78113a5a7ed95c702f819d59eb687417f76534e1e6807cff8001f91');
const output=path.resolve(option('--output',path.join(root,'../v26-evidence/migration')));fs.mkdirSync(output,{recursive:true});
const routing=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
const report={baselineSha256:'185dcdbbb78113a5a7ed95c702f819d59eb687417f76534e1e6807cff8001f91',checks:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
async function ready(page){await page.locator('html.dkla-boot-ready').waitFor({timeout:90000});await page.waitForFunction(()=>LegalAtlas.ready&&window.DKLAStudy&&window.DKLAColdCall);}
let browser,server;
(async()=>{
 // Stream the 82MB historical document over loopback, avoiding oversized
 // browser-protocol route.fulfill messages. Use one origin for both releases.
 server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,base).pathname;
  const redirect=routing.redirects.find(r=>r.source===pathname&&!r.has&&!r.missing);
  if(redirect){res.writeHead(307,{Location:redirect.destination});res.end();return;}
  const file=pathname==='/__frozen-v25.html'?baseline:path.resolve(root,'dist','.'+pathname);
  if(file!==baseline&&!file.startsWith(path.join(root,'dist')+path.sep)){res.writeHead(404);res.end();return;}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.json')?'application/json':'application/octet-stream'});fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base.hostname='127.0.0.1';base.port=String(server.address().port);
 browser=await chromium.launch({headless:true,executablePath:process.env.DKLA_CHROME||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.origin!==base.origin||u.pathname.startsWith('/api/'))return route.fulfill({status:204,body:''});
  return route.continue();
 });
 await context.addInitScript(()=>localStorage.setItem('dkla.guide.v1','seen'));
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.setDefaultTimeout(20000);
 await page.goto(new URL('/__frozen-v25.html',base).href,{waitUntil:'domcontentloaded',timeout:90000});await ready(page);
 assert.equal(await page.locator('.dkla-release').textContent(),'v2.5');
 const owner=await page.evaluate(()=>{const n=LegalAtlas.snapshot().nodes.find(n=>n.kind==='Note');return {id:n.id,text:n.notes+'\n\nv2.5-to-v2.6 synthetic saved annotation — preserve this exact text.'};});
 await page.evaluate(id=>nodeForm(id),owner.id);await page.locator('#editForm [name="notes"]').fill(owner.text);await page.locator('#editForm button[type="submit"]').click();await page.locator('#modal[open]').waitFor({state:'hidden'});
 const before=await page.evaluate(async()=>{
  DKLAStudy.rate('cp-pennoyer',2);
  // Cold Call is now a reader, so retain a representative legacy rating blob.
  localStorage.setItem('dkla.coldCall.v1',JSON.stringify({ratings:{'cp-pennoyer':{r:2,t:100,n:3}},marker:'synthetic legacy fixture'}));
  await LegalAtlas.flush();const snapshot=LegalAtlas.snapshot(),key='legal-atlas-v1:'+snapshot.graphId+':dkla-r8-rebuilt';
  // Preserve a small legacy recovery record alongside IndexedDB. A whole
  // current atlas exceeds localStorage's quota; this does not claim exhaustive
  // legacy recovery coverage. The actual full graph comes from old-app IDB.
  localStorage.setItem(key,JSON.stringify({format:snapshot.format,schemaVersion:snapshot.schemaVersion,graphId:snapshot.graphId,revision:snapshot.revision,updatedAt:snapshot.updatedAt,nodes:[snapshot.nodes.find(n=>n.kind==='Note')],edges:[]}));
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('LegalAtlasPortable',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const stored=await new Promise((resolve,reject)=>{const r=db.transaction('graphs').objectStore('graphs').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();
  return {key,stored,study:localStorage.getItem('dkla.study.v1'),cold:localStorage.getItem('dkla.coldCall.v1'),legacy:localStorage.getItem(key)};
 });
 assert.equal(before.stored.nodes.find(n=>n.id===owner.id).notes,owner.text);
 assert.equal(before.stored.studyMap.layoutId,'v25-curated-locked');
 fs.writeFileSync(path.join(output,'real-v25-synthetic-graph.json'),JSON.stringify(before.stored));
 const fixtureSha=createHash('sha256').update(JSON.stringify(before.stored)).digest('hex');
 await page.goto(new URL('/DKLA-v2.5.html#node=cp-pennoyer',base).href,{waitUntil:'domcontentloaded',timeout:90000});await ready(page);
 assert.ok(page.url().includes('/DKLA-v2.6.html#node=cp-pennoyer'),'Old route/hash must arrive at v2.6');
 assert.equal(await page.locator('.dkla-release').textContent(),'v2.6');
 const after=await page.evaluate(key=>({graph:LegalAtlas.snapshot(),bridge:DKLASavedWork.bridged,study:localStorage.getItem('dkla.study.v1'),cold:localStorage.getItem('dkla.coldCall.v1'),legacy:localStorage.getItem(key)}),before.key);
 assert.equal(after.bridge,true);assert.equal(after.graph.graphId,before.stored.graphId);assert.equal(after.graph.dklaRelease.contentBuild,before.stored.dklaRelease.contentBuild);
 assert.equal(after.graph.nodes.find(n=>n.id===owner.id).notes,owner.text);assert.equal(after.study,before.study);assert.equal(after.cold,before.cold);assert.equal(after.legacy,before.legacy);
 assert.equal(JSON.parse(after.study).ratings['cp-pennoyer'].r,2);
 await page.reload({waitUntil:'domcontentloaded',timeout:90000});await ready(page);
 assert.equal(await page.evaluate(id=>LegalAtlas.snapshot().nodes.find(n=>n.id===id).notes,owner.id),owner.text);
 report.checks.push({name:'Actual v2.5 UI-authored note and study rating survive v2.6 redirect and second reload',pass:true,fixtureSha,graphKey:before.key,contentBuild:after.graph.dklaRelease.contentBuild,legacyRecoveryCopyBytePreserved:true,coldCallBytePreserved:true});
 for(const viewport of [{name:'desktop',width:1440,height:900},{name:'phone-landscape',width:844,height:390},{name:'phone-portrait',width:390,height:844}]){
  await page.setViewportSize({width:viewport.width,height:viewport.height});await page.locator('#atlasHome').click();await page.waitForTimeout(700);await page.evaluate(()=>document.fonts.ready);
  const font=await page.locator('.dkla-release').evaluate(e=>({family:getComputedStyle(e).fontFamily,loaded:document.fonts.check('600 24px "DKLA Orbitron"'),rect:e.getBoundingClientRect().toJSON(),home:e.closest('#atlasHome').getBoundingClientRect().toJSON()}));
  assert.ok(font.loaded&&font.family.includes('DKLA Orbitron'));assert.ok(font.rect.x>=0&&font.rect.right<=viewport.width);assert.ok(font.rect.right<=font.home.right+1,'Version overflows home button');
  const controls=await page.locator('.study-header').evaluate(header=>[...header.children].filter(e=>getComputedStyle(e).display!=='none'&&getComputedStyle(e).position!=='absolute').map(e=>({id:e.id||e.className,...e.getBoundingClientRect().toJSON()})).filter(r=>r.width>0&&r.height>0));
  for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++)assert.ok(Math.min(controls[i].right,controls[j].right)-Math.max(controls[i].left,controls[j].left)<=1||Math.min(controls[i].bottom,controls[j].bottom)-Math.max(controls[i].top,controls[j].top)<=1,'Header controls overlap: '+controls[i].id+' / '+controls[j].id);
  await page.screenshot({path:path.join(output,viewport.name+'-header.png')});report.checks.push({name:viewport.name+' embedded version font',pass:true,headerControlsDoNotOverlap:true,controls,...font});
 }
 report.pass=report.errors.length===0;save();assert.equal(report.pass,true);await context.close();console.log(JSON.stringify(report));
})().catch(error=>{report.pass=false;report.failure=String(error.stack||error);save();console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.close();});
