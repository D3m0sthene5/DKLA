/* Loopback-only, disposable typography evidence; no visitor or API access. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const url=process.argv[2]||'http://127.0.0.1:8768/DKLA-v2.6.html';
const target=new URL(url);assert.ok(['127.0.0.1','localhost'].includes(target.hostname));
const output=path.resolve(process.argv[3]||'../typography-evidence/after');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.DKLA_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const report={url,views:[],errors:[]};
 try{
  for(const view of [{name:'desktop',width:1440,height:900},{name:'phone-landscape',width:844,height:390},{name:'phone-portrait',width:390,height:844}]){
   const context=await browser.newContext({viewport:{width:view.width,height:view.height},isMobile:view.name!=='desktop',hasTouch:view.name!=='desktop',serviceWorkers:'block'});
   await context.route('**/*',route=>{const u=new URL(route.request().url());return u.origin!==target.origin||u.pathname.startsWith('/api/')?route.fulfill({status:204,body:''}):route.continue();});
   await context.addInitScript(()=>localStorage.setItem('dkla.guide.v1','seen'));
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await page.locator('html.dkla-boot-ready').waitFor({timeout:90000});await page.waitForTimeout(1300);await page.evaluate(()=>document.fonts.ready);
   await page.screenshot({path:path.join(output,view.name+'-home.png')});
   const detail=await page.evaluate(()=>{
    const canvas=document.getElementById('geoCanvas');
    const seats=[...canvas.querySelectorAll('[data-sh-seat]')].map(s=>{const r=s.querySelector('rect'),t=s.querySelector('text'),box=s.getBoundingClientRect(),style=getComputedStyle(t);return{id:s.dataset.shSeat,label:s.getAttribute('aria-label'),text:s.textContent,font:style.fontFamily,size:Number.parseFloat(style.fontSize),screenSize:Number.parseFloat(style.fontSize)*t.getScreenCTM().a,rect:{x:r.getAttribute('x'),y:r.getAttribute('y'),width:r.getAttribute('width'),height:r.getAttribute('height')},box:{x:box.x,y:box.y,width:box.width,height:box.height},textFits:[...s.querySelectorAll('text')].every(n=>{const b=n.getBBox();return b.x>=Number(r.getAttribute('x'))&&b.x+b.width<=Number(r.getAttribute('x'))+Number(r.getAttribute('width'))&&b.y>=Number(r.getAttribute('y'))&&b.y+b.height<=Number(r.getAttribute('y'))+Number(r.getAttribute('height'));})};});
    const families=Object.fromEntries(['#atlasHome .dkla-wordmark','#atlasHome .dkla-wordmark small','#courseHome','#saveBtn','#moreBtn','#geoBreadcrumb','.study-header>.r18-launcher','.study-header>.sh-launcher','.authority-map-entrance>.authority-map-heading','#geoCanvas .region-title.r20-tile:not([data-dkla-display-label])','#geoCanvas [data-dkla-display-label="notes"]','#geoCanvas .r19-tile text','#geoCanvas .course-label'].map(selector=>{const el=document.querySelector(selector);return[selector,el?getComputedStyle(el).fontFamily:null];}));
    const title=canvas.querySelector('[data-sh-open]>.sh-map-label'),titleStyle=getComputedStyle(title),titleVisible=titleStyle.display!=='none'&&titleStyle.visibility!=='hidden'&&Number(titleStyle.opacity)>=.99;
    return {name:'',seats,view:LegalAtlas.geography().view,regions:LegalAtlas.geography().regions.map(({id,x,y,w,h})=>({id,x,y,w,h})),outer:[...canvas.querySelectorAll('.sh-block-bg,.authority-map-entrance>rect')].map(r=>Object.fromEntries(['x','y','width','height'].map(a=>[a,r.getAttribute(a)]))),bodyFont:getComputedStyle(document.body).fontFamily,families,titleVisible,helperHidden:document.getElementById('mapHint').hidden,courtCaptionRemoved:!canvas.querySelector('[data-sh-open] .sh-root-label'),lrsHeading:canvas.querySelector('[data-study-scope="Legislation and the Regulatory State"].course-label')?.textContent,typographyReady:!!window.DKLATypography?.ready,fonts:[...document.fonts].map(f=>({family:f.family,status:f.status}))};
   });detail.name=view.name;report.views.push(detail);assert.equal(detail.seats.length,11);assert.ok(detail.seats.every(s=>s.textFits),'Seat label exceeds its original card');
   if(detail.typographyReady){
    detail.allSeatNamesVisible=await page.locator('#geoCanvas [data-sh-seat] .dkla-seat-label').evaluateAll(nodes=>nodes.every(n=>{const s=getComputedStyle(n);return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>=.99;}));assert.ok(detail.allSeatNamesVisible,'Legacy tiny-text fade erased a fitted seat label');
    assert.ok(detail.fonts.some(f=>f.family.replace(/["']/g,'')==='DKLA Orbitron'&&f.status==='loaded'));
    assert.ok(!detail.fonts.some(f=>f.family.replace(/["']/g,'')==='DKLA Space Grotesk'&&f.status==='loaded'),'Third active font remains');
    const firstFamily=family=>family.split(',')[0].replace(/["']/g,'').trim();
    for(const [selector,family] of Object.entries(detail.families))if(family)assert.equal(firstFamily(family),selector.includes(':not([data-dkla-display-label])')?'Segoe UI':'DKLA Orbitron',selector+' has the wrong role');
    assert.ok(detail.seats.every(s=>firstFamily(s.font)==='DKLA Orbitron'),'Seat labels do not match display face');
    assert.equal(firstFamily(detail.families['.authority-map-entrance>.authority-map-heading']),'DKLA Orbitron');assert.ok(detail.titleVisible,'Native SCOTUS heading remains hidden after enlargement');
    assert.ok(detail.helperHidden&&detail.courtCaptionRemoved);assert.equal(detail.lrsHeading,'LRS');
    detail.repeatRefresh=await page.evaluate(()=>{const t=document.querySelector('[data-study-scope="Legislation and the Regulatory State"].course-label'),before=t.getAttribute('y');for(let i=0;i<5;i++)DKLATypography.refresh();return{before,after:t.getAttribute('y'),text:t.textContent};});assert.equal(detail.repeatRefresh.before,detail.repeatRefresh.after);assert.equal(detail.repeatRefresh.text,'LRS');
    if(view.name==='desktop'){
     detail.fitBands=await page.evaluate(()=>{
      const groups=[...document.querySelectorAll('#geoCanvas [data-sh-seat]')],original=groups.map(g=>g.querySelector('rect').getAttribute('height')),results=[];
      for(const height of [42,54,61,62,70]){
       for(const group of groups){const r=group.querySelector('rect'),scale=Math.hypot(r.getScreenCTM().a,r.getScreenCTM().b);r.setAttribute('height',height/scale);}
       DKLATypography.refresh();const bad=groups.filter(g=>{const r=g.querySelector('rect');return [...g.querySelectorAll('text')].some(t=>{const b=t.getBBox();return b.y<Number(r.getAttribute('y'))||b.y+b.height>Number(r.getAttribute('y'))+Number(r.getAttribute('height'));});}).map(g=>g.dataset.shSeat);results.push({height,bad});
      }
      groups.forEach((g,i)=>g.querySelector('rect').setAttribute('height',original[i]));DKLATypography.refresh();return results;
     });assert.ok(detail.fitBands.every(b=>b.bad.length===0),'Wrapped seat typography exceeds intermediate height bounds');
    }
    await page.reload({waitUntil:'domcontentloaded',timeout:90000});await page.locator('html.dkla-boot-ready').waitFor({timeout:90000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(700);
    detail.reload=await page.evaluate(()=>[...document.querySelectorAll('#geoCanvas [data-sh-seat]')].map(s=>{const t=s.querySelector('text'),r=s.querySelector('rect'),b=t.getBBox(),size=Number.parseFloat(getComputedStyle(t).fontSize)*t.getScreenCTM().a;return {id:s.dataset.shSeat,size,fits:b.x>=Number(r.getAttribute('x'))&&b.x+b.width<=Number(r.getAttribute('x'))+Number(r.getAttribute('width'))};}));
    assert.deepEqual(detail.reload.map(s=>s.id),detail.seats.map(s=>s.id));
    assert.ok(detail.reload.every((s,i)=>s.fits&&Math.abs(s.size-detail.seats[i].screenSize)<.1),'Font readiness or reload changed fitted labels');
   }
   for(const seat of detail.seats){
    await page.waitForTimeout(150);const control=page.locator('#geoCanvas [data-sh-seat="'+seat.id+'"]');await control.press('Enter');
    try{await page.locator('#shShell:not([hidden])').waitFor({timeout:5000});}catch(error){throw Error('Keyboard seat '+seat.id+' failed: '+error.message);}
    assert.equal(await page.evaluate(()=>SCOTUSHistory.state().seat),seat.id,'Keyboard seat activation changed');await page.evaluate(()=>SCOTUSHistory.close());
   }
   await page.evaluate(()=>SCOTUSHistory.open());await page.waitForTimeout(250);detail.justiceNames=await page.locator('#shShell .sh-seat-name').evaluateAll(nodes=>nodes.map(n=>({name:n.textContent,font:getComputedStyle(n).fontFamily,weight:getComputedStyle(n).fontWeight,size:getComputedStyle(n).fontSize})));if(detail.typographyReady)assert.ok(detail.justiceNames.every(n=>n.font.split(',')[0].replace(/["']/g,'').trim()==='DKLA Orbitron'),'Justice name family is inconsistent');await page.screenshot({path:path.join(output,view.name+'-scotus.png')});await page.evaluate(()=>SCOTUSHistory.close());
   await page.evaluate(()=>location.hash='node=cp-pennoyer');await page.locator('#inspector [data-cold-call="cp-pennoyer"]').waitFor();await page.waitForTimeout(700);await page.screenshot({path:path.join(output,view.name+'-case.png')});
   await page.locator('#inspector [data-cold-call="cp-pennoyer"]').click();await page.locator('#coldCallDialog[open]').waitFor();await page.screenshot({path:path.join(output,view.name+'-cold-call.png')});
   await page.locator('#ccClose').click();await page.evaluate(()=>location.hash='node=drennan');await page.locator('#inspector [data-cold-call="drennan"]').waitFor();await page.waitForTimeout(700);await page.screenshot({path:path.join(output,view.name+'-drennan.png')});detail.reading=await page.locator('#inspector h2,#inspector .reader-body').evaluateAll(nodes=>nodes.map(n=>({selector:n.tagName,class:n.className,font:getComputedStyle(n).fontFamily})));if(detail.typographyReady)assert.ok(detail.reading.every(n=>n.font.includes('Segoe UI')&&!n.font.includes('Orbitron')&&!n.font.includes('Space Grotesk')));
   if(detail.typographyReady){await page.evaluate(()=>home('Contracts',false,false));await page.waitForTimeout(250);detail.alternateHint=await page.locator('#mapHint').evaluate(n=>({hidden:n.hidden,text:n.textContent}));assert.equal(detail.alternateHint.hidden,false,'Main hint suppression leaked to another scope');}
   await context.close();
  }
  assert.equal(report.errors.length,0);report.pass=true;
 }finally{fs.writeFileSync(path.join(output,'typography-report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
 console.log(JSON.stringify({pass:report.pass,output,seatIds:report.views[0]?.seats.map(s=>s.id)}));
})().catch(e=>{console.error(e);process.exitCode=1;});
