/* Source checks run without a browser. Pass an assembled release URL to check
   actual fit, native routes, Back, keyboard/zoom and preserved course homes. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'overview.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'overview.css'),'utf8');
new vm.Script(source,{filename:'overview.js'});
const keys=['contracts','civil','lrs','authorities','history','notes','dictionary'];
for(const key of keys)assert(source.includes("key: '"+key+"'"),'Missing destination '+key);
assert.equal((source.match(/key: '/g)||[]).length,7,'Home must have exactly seven destinations');
assert(source.includes(".dkla-letter-d[data-r21-shaped]"),'Overview must wait for the current glyph');
assert(source.includes("copy.removeAttribute('id')")&&source.includes("'url(#' + oldId"),'Cloned clip IDs must be isolated');
assert(!/\b(?:data|M)\.(?:studyMap|nodes|geography)\s*=/.test(source),'Overview must not rewrite source or geography');
assert(css.includes('body.atlas-overview-active #geoCanvas'),'The large map must be hidden only on Atlas home');
assert(css.includes('@media(max-width:700px)')&&css.includes('minmax(0'),'Phone layout must allow bounded cards');
// Execute the actual installed wrapper: a resize draw must not let the hidden
// camera choose a course, while detailed views retain native scope behavior.
const scopeGuard=source.match(/const previousAutoScope\s*=\s*autoScope;\s*autoScope\s*=\s*function\s*\([^)]*\)\s*\{[\s\S]*?\};/);
assert(scopeGuard,'Compact home must guard native autoScope');
const view={home:true,scope:'Atlas'},scopeCalls=[],receiver={},argument={},nativeResult={};
const scopeContext=vm.createContext({active:()=>view.home,autoScope:function(...args){scopeCalls.push({receiver:this,args});view.scope='Contracts';return nativeResult;}});
new vm.Script(scopeGuard[0],{filename:'overview-autoScope-guard.js'}).runInContext(scopeContext);
assert.equal(scopeContext.autoScope.call(receiver,argument,42),undefined);
assert.equal(scopeCalls.length,0,'Home must skip native course selection');
assert.equal(view.scope,'Atlas','Home resize must preserve Atlas');
view.home=false;view.scope='Civil Procedure';
assert.equal(scopeContext.autoScope.call(receiver,argument,42),nativeResult,'Course view must retain native return value');
assert.equal(scopeCalls.length,1,'Course view must delegate exactly once');
assert.equal(scopeCalls[0].receiver,receiver,'Course view must preserve native receiver');
assert.deepEqual(scopeCalls[0].args,[argument,42],'Course view must preserve native arguments');
view.home=true;view.scope='Atlas';scopeContext.autoScope();
assert.equal(scopeCalls.length,1,'Returning home must suppress native scope selection again');
assert.equal(view.scope,'Atlas');
const url=process.argv[2];
if(!url){console.log(JSON.stringify({ok:true,sourceSyntax:true,destinations:7,currentGlyphRequired:true,isolatedClipIds:true,presentationOnly:true,homeResizeGuard:true,browserFitChecked:false}));}
else (async()=>{
  let playwright;try{playwright=require('playwright');}catch{playwright=require(path.join(process.env.LOCALAPPDATA||path.join(process.env.USERPROFILE||'','AppData','Local'),'..','..','.cache','codex-runtimes','codex-primary-runtime','dependencies','node','node_modules','playwright'));}
  const browser=await playwright.chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  try{
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.DKLAOverview?.ready&&window.LegalAtlas?.ready,null,{timeout:30000});
    const reset=async()=>{await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(window.SCOTUSHistory?.state().open)window.SCOTUSHistory.close();window.LegalAtlas.navigate('scope','Atlas');window.DKLAOverview.refresh();});await page.locator('#atlasOverview').waitFor({state:'visible'});};
    const fits=[];
    for(const [width,height] of [[1440,900],[1000,680],[390,844],[360,640],[320,568],[844,390]]){
      await reset();await page.setViewportSize({width,height});
      await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,500)));
      assert.equal(await page.evaluate(()=>S.scope),'Atlas','Resize must preserve the home route at '+width+'x'+height);
      assert(await page.locator('#atlasOverview').isVisible(),'Resize must preserve the home surface');
      const result=await page.evaluate(()=>{
        const home=document.getElementById('atlasOverview'),composition=home.querySelector('nav'),brand=home.querySelector('.atlas-overview-brand'),b=brand.getBoundingClientRect(),c=composition.getBoundingClientRect();
        const portals=[...home.querySelectorAll('[data-atlas-destination]')].map(el=>{const r=el.getBoundingClientRect(),title=el.querySelector('strong'),t=title.getBoundingClientRect();return{key:el.dataset.atlasDestination,title:title.innerText,font:parseFloat(getComputedStyle(title).fontSize),box:r.toJSON(),titleBox:t.toJSON()};});
        return{portals,brandCentered:Math.abs(b.x+b.width/2-c.x-c.width/2)<2&&Math.abs(b.y+b.height/2-c.y-c.height/2)<2,visibleMap:getComputedStyle(document.getElementById('geoCanvas')).visibility,scroll:home.scrollHeight-home.clientHeight};
      });
      assert.equal(result.portals.length,7);assert(result.brandCentered,'Glyph is not centered at '+width+'x'+height);assert.equal(result.visibleMap,'hidden');
      for(const p of result.portals){assert(p.box.x>=-1&&p.box.y>=-1&&p.box.right<=width+1&&p.box.bottom<=height+1,'Offscreen portal '+p.key+' at '+width+'x'+height);assert(p.font>=13,'Unreadable title '+p.key);assert(p.titleBox.top>=p.box.top-1&&p.titleBox.bottom<=p.box.bottom+1,'Clipped title '+p.key+' at '+width+'x'+height);}
      fits.push({width,height,sevenVisible:true,centered:true});
    }
    await page.setViewportSize({width:1440,height:900});await reset();
    const homeLabel=await page.locator('#courseHome').innerText();
    await page.keyboard.press('Control+0');
    assert.equal(await page.evaluate(()=>S.scope),'Atlas','Browser zoom reset must preserve home');
    assert.equal(await page.locator('#courseHome').innerText(),homeLabel,'Browser zoom reset must preserve the heading');
    assert(await page.locator('#atlasOverview').isVisible(),'Browser zoom reset must preserve the home surface');
    const before=await page.evaluate(()=>JSON.stringify(data.studyMap.homes));
    for(const [key,scope] of [['contracts','Contracts'],['civil','Civil Procedure'],['lrs','Legislation and the Regulatory State']]){
      await page.locator('[data-atlas-destination="'+key+'"]').click();
      assert.equal(await page.evaluate(()=>S.scope),scope);assert.equal(await page.locator('#atlasOverview').isVisible(),false);
      await page.locator('#studyBack').click();await page.locator('#atlasOverview').waitFor({state:'visible'});
    }
    await page.locator('[data-atlas-destination="authorities"]').click();assert.equal(await page.evaluate(()=>S.scope),'Rules & authorities');await reset();
    await page.locator('[data-atlas-destination="history"]').click();assert(await page.evaluate(()=>window.SCOTUSHistory.state().open));await reset();
    await page.locator('[data-atlas-destination="notes"]').click();assert.equal(await page.evaluate(()=>S.region),'workbench-region');await reset();
    await page.locator('[data-atlas-destination="dictionary"]').click();assert(await page.locator('#glossaryDialog').evaluate(d=>d.open));await page.keyboard.press('Escape');await reset();
    await page.locator('[data-atlas-destination="civil"]').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>S.scope),'Civil Procedure');await reset();
    await page.locator('[data-atlas-destination="lrs"]').hover();await page.locator('#studyZoomIn').click();assert.equal(await page.evaluate(()=>S.scope),'Legislation and the Regulatory State');await reset();
    assert.equal(await page.evaluate(()=>JSON.stringify(data.studyMap.homes)),before,'Native navigation changed course homes');
    assert.deepEqual(errors,[],'Browser errors');
    console.log(JSON.stringify({ok:true,viewports:fits,homeResizeGuard:true,browserZoomReset:true,nativeRoutes:7,nativeBack:true,keyboard:true,zoom:true,courseHomesPreserved:true,browserErrors:0}));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
