/* Local-only, disposable-profile interaction evidence. No production writes. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const args = process.argv.slice(2);
const option = (name, fallback) => { const i=args.indexOf(name); return i<0?fallback:args[i+1]; };
const url = option('--url', 'http://127.0.0.1:8766/DKLA-v2.6.html');
const target = new URL(url);
if (!['127.0.0.1','localhost','[::1]'].includes(target.hostname)) throw Error('Only a loopback preview is allowed.');
const output = path.resolve(option('--output', 'work/browser-smoke'));
fs.mkdirSync(output,{recursive:true});
const report = {url, startedAt:new Date().toISOString(), checks:[], blockedRequests:[], pageErrors:[], screenshots:[],
  coverage:'Representative real-browser smoke checks, not a complete legal/content/accessibility audit. Storage fixtures are synthetic and isolated.',
  gaps:['Full portable-HTML export and file:// reopening', 'Every source page and legacy route', 'Cross-device sync', 'Exhaustive keyboard and screen-reader audit', 'Offline cached PDF/image coverage']};
const writeReport=()=>fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
let browser;
async function check(name,fn){const began=Date.now();try{const detail=await fn();report.checks.push({name,pass:true,ms:Date.now()-began,detail});console.log('PASS '+name);}catch(error){report.checks.push({name,pass:false,ms:Date.now()-began,error:String(error.stack||error)});console.log('FAIL '+name+': '+error.message);}writeReport();}
async function shot(page,name){const began=Date.now(),file=path.join(output,name+'.png');await page.screenshot({path:file,fullPage:false});report.screenshots.push(file);report.screenshotMs=(report.screenshotMs||0)+Date.now()-began;}
async function ready(page){await page.locator('html.dkla-boot-ready').waitFor({timeout:90000});await page.waitForFunction(()=>window.LegalAtlas?.ready&&window.DKLAColdCall&&window.DKLAStudy);}
async function closeDialogs(page){await page.evaluate(()=>{window.DKLAColdCall?.close();window.DKLAStudy?.close();for(const d of document.querySelectorAll('dialog[open]'))d.close();});}
// The map redraws itself several times a second, replacing its elements. A box
// read in the instant between two draws comes back empty, so ask again until
// the element is there. A control that is really missing still fails.
async function boxOf(locator,timeout=8000){const end=Date.now()+timeout;for(;;){const box=await locator.first().boundingBox({timeout:1000}).catch(()=>null);if(box&&box.width>0&&box.height>0)return box;if(Date.now()>end)throw Error('No visible box for '+locator);await new Promise(r=>setTimeout(r,60));}}
// A key press is lost if the focused element is replaced by a redraw first.
// Focus and press again until the result shows; a dead control still fails.
async function pressUntil(page,locator,key,result,attempts=6){for(let i=0;;i++){try{await locator.first().focus({timeout:1500});await page.keyboard.press(key);await result.waitFor({timeout:1500});return i+1;}catch(error){if(i+1>=attempts)throw error;}}}
async function route(page,hash){await closeDialogs(page);await page.evaluate(hash=>{location.hash=hash;},hash);}
(async()=>{
  const installedChrome=process.env.DKLA_CHROME||(process.platform==='win32'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
  browser=await chromium.launch({headless:true,executablePath:option('--chrome',installedChrome)});
  // The three screen sizes run side by side, each in its own isolated browser context.
  await Promise.all([{name:'desktop',width:1440,height:900},{name:'phone-landscape',width:844,height:390},{name:'phone-portrait',width:390,height:844},
    // The saved-work round trip gets a desktop context of its own, so it does not queue behind the desktop interactions.
    {name:'desktop',width:1440,height:900,storage:true}].map(async viewport=>{
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},isMobile:viewport.name!=='desktop',hasTouch:viewport.name!=='desktop',acceptDownloads:true,serviceWorkers:'block'});
    await context.route('**/*',async route=>{
      const request=route.request(),u=new URL(request.url());
      if(u.origin!==target.origin||u.pathname.startsWith('/api/')){
        // Do not record query strings, bodies, visitor identifiers, or credentials.
        report.blockedRequests.push({origin:u.origin,path:u.pathname,method:request.method()});
        return route.fulfill({status:204,body:''});
      }
      return route.continue();
    });
    await context.addInitScript(()=>{localStorage.setItem('dkla.guide.v1','seen');});
    const page=await context.newPage();page.setDefaultTimeout(12000);
    page.on('pageerror',e=>report.pageErrors.push({viewport:viewport.name,error:e.message}));
    if(!viewport.storage){
    await check(viewport.name+': boot and home',async()=>{await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await ready(page);await page.waitForTimeout(900);assert.ok(await page.locator('#geoCanvas').isVisible());await shot(page,viewport.name+'-home');
      const geometry=await page.evaluate(()=>({view:LegalAtlas.geography().view,regions:LegalAtlas.geography().regions.map(({id,x,y,w,h})=>({id,x,y,w,h})),rendered:[...document.querySelectorAll('#geoCanvas g.map-region path[data-map-region],#geoCanvas .sh-block-bg,#geoCanvas .authority-map-entrance > rect')].map(e=>({id:e.getAttribute('data-map-region')||e.getAttribute('class'),d:e.getAttribute('d'),x:e.getAttribute('x'),y:e.getAttribute('y'),w:e.getAttribute('width'),h:e.getAttribute('height')}))}));
      fs.writeFileSync(path.join(output,viewport.name+'-geometry.json'),JSON.stringify(geometry,null,2)+'\n');
      return {title:await page.title(),scope:geometry.view.scope};});
    await check(viewport.name+': dictionary home pointer and keyboard',async()=>{
      const spine=page.locator('[data-dictionary-spine]'),hasSpine=await spine.count();
      const control=hasSpine?spine:page.locator('#geoCanvas path[data-map-region="dictionary-region"]');
      const box=await boxOf(control);await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
      await page.locator('#glossaryDialog[open]').waitFor();await page.locator('#glClose').click();
      if(hasSpine){await pressUntil(page,spine,'Enter',page.locator('#glossaryDialog[open]'));await page.locator('#glClose').click();
        const ghost=await page.locator('#geoCanvas text').evaluateAll(elements=>elements.filter(e=>/legal\s*dictionary/i.test(e.textContent)&&!e.closest('[data-dictionary-spine]')).length);assert.equal(ghost,0,'Old dictionary label remains outside the spine');}
      return {pointer:true,keyboard:!!hasSpine,spine:!!hasSpine};
    });
    await check(viewport.name+': native region activation',async()=>{const box=await boxOf(page.locator('#geoCanvas path[data-map-region="consideration"]'));await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(800);assert.match(await page.locator('#geoBreadcrumb').innerText(),/Consideration/i);await shot(page,viewport.name+'-region');});
    await check(viewport.name+': legacy case route and narrative',async()=>{
      await route(page,'node=cp-pennoyer');await page.locator('#inspector [data-cold-call="cp-pennoyer"]').waitFor();
      assert.match(await page.locator('#inspector').innerText(),/Pennoyer/);await shot(page,viewport.name+'-case');
      await page.locator('#inspector [data-cold-call="cp-pennoyer"]').click();await page.locator('#coldCallDialog[open]').waitFor();
      const paragraphs=await page.locator('#ccNarrative .cc-section > p:not(.cc-kicker)').count();assert.ok(paragraphs>5);await shot(page,viewport.name+'-cold-call');
      // Pennoyer's source is an external opinion; use an account that actually
      // carries an embedded full-brief source for the nested return check.
      await page.locator('#ccClose').click();await route(page,'node=alaska-packers');await page.locator('#inspector [data-cold-call="alaska-packers"]').click();
      await page.locator('#coldCallDialog [data-cc-source-brief]').first().click();await page.locator('#ccBriefDialog[open]').waitFor();await page.waitForFunction(()=>document.querySelector('.cc-brief-body')?.innerText.length>500);assert.ok((await page.locator('.cc-brief-body').innerText()).length>500);await page.locator('#ccBriefClose').click();
      assert.ok(await page.locator('#coldCallDialog').evaluate(d=>d.open));await page.locator('#ccClose').click();assert.ok(await page.locator('#inspector').isVisible());return {paragraphs,nestedSourceReturn:true};
    });
    await check(viewport.name+': dictionary legacy route and search',async()=>{
      await route(page,'term=consideration');await page.locator('#glossaryDialog[open]').waitFor();await page.locator('#glFind').fill('consideration');
      await page.locator('#glossaryDialog [data-term="consideration"]').click();assert.match(await page.locator('.gl-detail').innerText(),/consideration/i);await shot(page,viewport.name+'-dictionary');await page.locator('#glClose').click();
    });
    await check(viewport.name+': authorities source and return',async()=>{
      await closeDialogs(page);await page.evaluate(()=>DKLAAuthorities.open('frcp-4'));await page.locator('#inspector').waitFor();assert.match(await page.locator('#inspector').innerText(),/Summons/i);await shot(page,viewport.name+'-authority');
      const before=await page.evaluate(()=>LegalAtlas.geography().view.selected.id);await page.evaluate(()=>LegalAtlas.navigate('node','cp-pennoyer'));await page.evaluate(()=>LegalAtlas.back());assert.equal(await page.evaluate(()=>LegalAtlas.geography().view.selected.id),before);
    });
    await check(viewport.name+': legacy embedded book source',async()=>{
      await route(page,'book=1');await page.locator('#bookDialog[open]').waitFor();assert.ok((await page.locator('#bookDialog').innerText()).length>30);await shot(page,viewport.name+'-source');await closeDialogs(page);
    });
    await check(viewport.name+': SCOTUS history',async()=>{await closeDialogs(page);await page.evaluate(()=>SCOTUSHistory.open());await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>SCOTUSHistory.state().open),true);await shot(page,viewport.name+'-scotus');await page.evaluate(()=>SCOTUSHistory.close());});
    await check(viewport.name+': study interaction',async()=>{await closeDialogs(page);await page.evaluate(()=>DKLAStudy.open('drill'));await page.locator('#r18Dialog[open]').waitFor();await page.locator('[data-r18-tab="progress"]').click();assert.equal(await page.locator('#r18Dialog').getAttribute('data-tab'),'progress');await shot(page,viewport.name+'-study');await page.evaluate(()=>DKLAStudy.close());});
    }
    if(viewport.storage){
      let ownerProseResult;
      await check('synthetic storage, master JSON export and restore',async()=>{
        await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await ready(page);await page.waitForTimeout(900);
        await closeDialogs(page);
        const ownerFixture=await page.evaluate(()=>{const n=LegalAtlas.snapshot().nodes.find(n=>n.kind==='Note');return {id:n.id,oldUpdatedAt:n.updatedAt,text:n.notes+'\n\nStage 1 synthetic owner annotation: preserve these exact words.'};});
        await page.evaluate(id=>nodeForm(id),ownerFixture.id);
        await page.locator('#editForm [name="notes"]').fill(ownerFixture.text);
        await page.locator('#editForm button[type="submit"]').click();
        await page.locator('#modal[open]').waitFor({state:'hidden'});
        const fixtures=await page.evaluate(async()=>{
          const snap=LegalAtlas.snapshot(),key='legal-atlas-v1:'+snap.graphId+':dkla-r8-rebuilt';
          const fixture={marker:'stage1 synthetic fixture',ratings:{'cp-pennoyer':{r:2,t:1,n:1}}};
          localStorage.setItem('dkla.coldCall.v1',JSON.stringify(fixture));
          const ownerNode=snap.nodes.find(n=>n.kind==='Note');
          if(!ownerNode)throw Error('No existing Note available for owner-edit fixture');
          const ownerText=ownerNode.notes;
          DKLAStudy.rate('cp-pennoyer',2);await LegalAtlas.flush();
          const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('LegalAtlasPortable',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
          const stored=await new Promise((resolve,reject)=>{const r=db.transaction('graphs').objectStore('graphs').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();
          return {key,graphId:snap.graphId,nodeCount:snap.nodes.length,edgeCount:snap.edges.length,indexedGraphId:stored.graphId,cold:localStorage.getItem('dkla.coldCall.v1'),legacy:localStorage.getItem(key),ownerNode:ownerNode.id,ownerText,ownerUpdatedAt:ownerNode.updatedAt};
        });
        assert.equal(fixtures.ownerText,ownerFixture.text,'UI save lost edited text');assert.notEqual(fixtures.ownerUpdatedAt,ownerFixture.oldUpdatedAt,'UI save did not advance node timestamp');
        assert.equal(fixtures.indexedGraphId,fixtures.graphId);
        const downloadPromise=page.waitForEvent('download');await page.evaluate(()=>LegalAtlas.exportMaster());const download=await downloadPromise;const exportPath=path.join(output,'synthetic-master.json');await download.saveAs(exportPath);
        const exported=JSON.parse(fs.readFileSync(exportPath,'utf8'));assert.equal(exported.graphId,fixtures.graphId);assert.equal(exported.nodes.length,fixtures.nodeCount);assert.equal(exported.edges.length,fixtures.edgeCount);
        assert.equal(exported.nodes.find(n=>n.id===fixtures.ownerNode).notes,fixtures.ownerText,'Export lost owner-edited prose');
        // Exercise the actual import UI in this disposable browser context.
        await page.locator('#importFile').setInputFiles(exportPath);await page.locator('#r8ImportMode').waitFor();await page.locator('#r8ImportMode').selectOption('replace');
        const importButton=page.locator('#modal button').filter({hasText:/Import|Replace|Apply/}).last();await importButton.click();
        await page.evaluate(()=>LegalAtlas.flush());await page.reload({waitUntil:'domcontentloaded',timeout:90000});await ready(page);
        const after=await page.evaluate(key=>({cold:localStorage.getItem('dkla.coldCall.v1'),legacy:localStorage.getItem(key),study:JSON.parse(localStorage.getItem('dkla.study.v1')),graph:LegalAtlas.snapshot().graphId,nodes:LegalAtlas.snapshot().nodes.length}),fixtures.key);
        assert.equal(after.cold,fixtures.cold);assert.equal(after.legacy,fixtures.legacy);assert.equal(after.study.ratings['cp-pennoyer'].r,2);assert.equal(after.graph,fixtures.graphId);assert.equal(after.nodes,fixtures.nodeCount);
        const ownerAfter=await page.evaluate(id=>LegalAtlas.snapshot().nodes.find(n=>n.id===id).notes,fixtures.ownerNode);
        ownerProseResult={node:fixtures.ownerNode,preserved:ownerAfter===fixtures.ownerText};
        return {graphKey:fixtures.key,database:'LegalAtlasPortable',nodeCount:fixtures.nodeCount,edgeCount:fixtures.edgeCount,studyRating:after.study.ratings['cp-pennoyer'].r,coldCallKeyPreserved:true,legacyKeyUnchanged:after.legacy===fixtures.legacy,legacyKeyInitiallyPresent:fixtures.legacy!==null,ownerEditedThroughForm:true,ownerUpdatedAt:fixtures.ownerUpdatedAt,exportRestore:true};
      });
      await check('owner-edited existing Note survives reload',async()=>{assert.ok(ownerProseResult,'Storage fixture did not complete');assert.ok(ownerProseResult.preserved,'Reload lost owner-edited prose on '+ownerProseResult.node);return ownerProseResult;});
    }
    await context.close();
  }));
  report.finishedAt=new Date().toISOString();report.pass=report.checks.every(c=>c.pass)&&report.pageErrors.length===0;writeReport();
  console.log(JSON.stringify({pass:report.pass,checks:report.checks.length,failures:report.checks.filter(c=>!c.pass).map(c=>c.name),pageErrors:report.pageErrors,report:path.join(output,'report.json')}));
  process.exitCode=report.pass?0:1;
})().catch(error=>{report.fatal=String(error.stack||error);writeReport();console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
