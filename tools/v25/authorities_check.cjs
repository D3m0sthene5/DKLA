/* Offline tests exercise the real map adapter and every source-rule paragraph.
 * Camera layout, real pointer activation and typography also need browser QA. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const file=process.argv[2]?path.resolve(process.argv[2]):path.join(root,JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8')).file);
const html=fs.readFileSync(file,'utf8'),embedded=html.match(/<script\b[^>]*\bid="dklaAuthoritiesData"[^>]*>([\s\S]*?)<\/script>/);
assert.ok(embedded,'Authority data missing from release');const data=JSON.parse(embedded[1]);
const markBlock=html.match(/<script\b[^>]*\bid="dklaWeThePeopleAsset"[^>]*>([\s\S]*?)<\/script>/);
assert.ok(markBlock,'Reference-derived We the People mark missing from release');
const mark=JSON.parse(markBlock[1]);assert.match(mark.uri,/^data:image\/png;base64,/,'Constitution identity is not embedded for offline use');assert.ok(mark.width>1000&&mark.height>300,'Constitution mark is not the supplied reference asset');
class Element{
  constructor(){this.dataset={};this.events={};this.children=new Map();this.innerHTML='';this.hidden=false;this.value='';this.scrollTop=0;this.attrs={};}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(t,f){this.events[t]=f;}
  querySelector(k){if(!this.children.has(k))this.children.set(k,new Element());return this.children.get(k);}
  querySelectorAll(){return [];}
  appendChild(e){this.children.set(e.id||String(this.children.size),e);}
  insertAdjacentHTML(_,s){this.innerHTML+=s;}
  remove(){}
}
const ids=new Map(),created=[];for(const id of ['inspector','closeInspector','courseHome','geoBreadcrumb','studyBack','mapWelcome','studyFit','moreBtn','mapHint','search','searchResults','geoCanvas'])ids.set(id,new Element());
ids.set('dklaAuthoritiesData',{textContent:embedded[1]});
ids.set('dklaWeThePeopleAsset',{textContent:markBlock[1]});
const document={events:{},getElementById(id){return ids.get(id)||null;},createElement(tag){created.push(tag);return new Element();},querySelectorAll(){return [];},addEventListener(t,f){this.events[t]=f;}};
const S={scope:'Atlas',region:null,district:null,x:0,y:0,z:.2,panelOpen:false,history:[],paintNodes:[],paintEdges:[]};
let viewport={w:1681,h:1128},lastFit=null,nativeNodes=0,resizeCallback=null,nextTimer=0;const timers=new Map();
const area=()=>({x:35,y:78,w:Math.max(230,viewport.w-70-(S.panelOpen&&viewport.w>700?400:0)),h:Math.max(240,viewport.h-148)});
const measure=(s,fs,weight,cls)=>String(s).length*fs*(cls==='authority-preview-code'?.60:cls==='authority-preamble-excerpt'?.51:.54);
const context={window:{},document,S,selected:null,svg:ids.get('geoCanvas'),R18:{afterDraw:[]},R11:{level(){return {lvl:0};},step(){return false;}},
  MutationObserver:class{observe(){}},ResizeObserver:class{constructor(fn){resizeCallback=fn;}observe(){}},setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},measure,safeArea:area,
  rect(){return viewport;},regionFor(id){return id==='dictionary-region'?{x:-1700,y:2700,w:2400,h:1300}:null;},scopeBox(){return {x:0,y:0,w:100,h:100};},galaxy(){return {box:{x:-25000,y:-15000,w:50000,h:31000}};},
  home(scope){this.selected=null;S.scope=scope;S.region=null;S.panelOpen=false;},goRegion(){},goNode(id){context.remember();nativeNodes++;S.scope='Civil Procedure';S.region='cp-subject-region';context.selected={type:'node',id};},
  renderHeading(){},renderInspector(){ids.get('inspector').innerHTML='';},readerChrome(body,label){return `<div class="reader-top">${label}</div><div class="reader-body">${body}</div>`;},wireReader(){ids.get('closeInspector').onclick=()=>{context.selected=null;context.setReader(false);context.renderInspector();context.draw();};},
  remember(){S.history.push({scope:S.scope,region:S.region,district:S.district,panelOpen:S.panelOpen,selected:context.selected?{...context.selected}:null,x:S.x,y:S.y,z:S.z});if(S.history.length>70)S.history.shift();},
  restoreView(v){Object.assign(S,v);context.selected=v.selected;context.renderInspector();context.renderHeading();context.draw();},back(){const v=S.history.pop();if(v)context.restoreView(v);},
  setReader(open){S.panelOpen=open;ids.get('inspector').hidden=!open;},closeSearch(){},dismissMenu(){},fit(){},
  fitBox(b,animate,pad=16,maxZoom=1){lastFit={...b};const a=area();S.z=Math.min((a.w-pad*2)/b.w,(a.h-pad*2)/b.h,maxZoom);S.x=b.x+b.w/2+(viewport.w/2-a.x-a.w/2)/S.z;S.y=b.y+b.h/2+(viewport.h/2-a.y-a.h/2)/S.z;},
  bounds(bs){const items=bs.filter(Boolean),x=Math.min(...items.map(b=>b.x)),y=Math.min(...items.map(b=>b.y));return{x,y,w:Math.max(...items.map(b=>b.x+b.w))-x,h:Math.max(...items.map(b=>b.y+b.h))-y};},
  visibleBox(){return{x:S.x-viewport.w/(2*S.z),y:S.y-viewport.h/(2*S.z),w:viewport.w/S.z,h:viewport.h/S.z};},intersects(a,b,pad=0){return a.x+a.w>=b.x-pad&&a.x<=b.x+b.w+pad&&a.y+a.h>=b.y-pad&&a.y<=b.y+b.h+pad;},homeFor(){return{x:0,y:0,w:100,h:100};},mapCenterVisible(){return{x:S.x,y:S.y};},
  edgePoint(a){return{x:a.x+a.w/2,y:a.y+a.h/2};},taperedRibbon(){return'M0 0L1 1Z';},draw(){},schedule(){},
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'authorities.js'),'utf8'),context);
const api=context.window.DKLAAuthorities,panel=ids.get('inspector');assert.ok(api,'Map adapter missing');assert.equal(created.includes('dialog'),false,'Separate authority dialog created');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const groupIds=new Set(),sourceIds=new Set(),orderedByCollection=new Map(),sourceById=new Map(data.entries.map(e=>[e.id,e]));
const safeLinks=e=>(e.links||[]).filter(l=>l.kind==='Case'&&(l.automaticRibbon??l.basis?.startsWith('Explicit citation')));
api.group('authority-root',false);context.draw();
assert.equal(api.geography().children.length,6,'Related source volumes are scattered across redundant covers');
const coverMap=ids.get('geoCanvas').innerHTML;assert.equal((coverMap.match(/class="authority-map-tile authority-volume-cover/g)||[]).length,6,'Six distinct covers not painted');
assert.ok((coverMap.match(/class="authority-preview"/g)||[]).length>=20,'Collection covers lack useful nested contents');
assert.ok(coverMap.includes('authority-people-mark'),'Constitution reference identity not painted');
assert.ok(coverMap.includes('mask-type="alpha"'),'Constitution mark must use flat single-color treatment');
assert.ok(coverMap.includes('maskUnits="userSpaceOnUse"')&&coverMap.includes('maskContentUnits="userSpaceOnUse"'),'World-coordinate masthead is clipped by default mask units');
assert.ok((coverMap.match(/class="authority-title-control"/g)||[]).length===6,'Each collection needs a separate accessible title control');
function walk(group){groupIds.add(group);api.group(group,false);const snapshot=api.geography();for(const c of snapshot.children){if(c.provision){assert.ok(!sourceIds.has(c.provision),'Duplicated provision in hierarchy: '+c.provision);sourceIds.add(c.provision);const col=sourceById.get(c.provision).collection;if(!orderedByCollection.has(col))orderedByCollection.set(col,[]);orderedByCollection.get(col).push(c.provision);}else walk(c.id);}}
walk('authority-root');assert.equal(sourceIds.size,data.entries.length,'Hierarchy loses source entries');assert.equal(api.geography().provisionCount,data.entries.length);
for(const col of ['constitution','ucc','ucc-articles','consumer','admiralty','social-security'])assert.deepEqual(orderedByCollection.get(col),data.entries.filter(e=>e.collection===col).map(e=>e.id),col+': provision order changed');
assert.deepEqual(orderedByCollection.get('restatement'),Array.from({length:385},(_,i)=>'restatement-'+(i+1)),'Restatement §§ 1–385 must follow section order, independently of data insertion order');
const ruleNumber=id=>id==='frcp-71A'?71.15:id==='frcp-forms'?Infinity:Number(id.replace('frcp-',''));
assert.deepEqual(orderedByCollection.get('frcp'),data.entries.filter(e=>e.collection==='frcp').map(e=>e.id).sort((a,b)=>ruleNumber(a)-ruleNumber(b)),'FRCP sequence lost decimal/historical rule slots');
for(const title of new Set(data.entries.filter(e=>e.collection==='uscode').map(e=>e.titleNumber)))assert.deepEqual(orderedByCollection.get('uscode').filter(id=>sourceById.get(id).titleNumber===title),data.entries.filter(e=>e.collection==='uscode'&&e.titleNumber===title).map(e=>e.id),'US Code Title '+title+': official section order changed');
api.group('authority:restatement',false);assert.equal(api.geography().children.length,16,'Restatement official chapters missing');
api.open('restatement-71');assert.ok(api.geography().route.some(r=>r.id==='authority:restatement/chapter-4'),'Consideration misplaced outside assigned Chapter 4');
api.open('restatement-286');assert.ok(api.geography().route.some(r=>r.id==='authority:restatement/chapter-12'),'Alteration misplaced into joint promises');
api.open('restatement-316');assert.ok(api.geography().route.some(r=>r.id==='authority:restatement/chapter-15'),'Assignment chapter scope misplaced');
for(const e of data.entries){
  api.open(e.id);assert.equal(S.scope,'Rules & authorities');assert.equal(context.selected.type,'authority');assert.ok(panel.innerHTML.includes(escape(e.cite)),e.id+': citation missing');
  for(const l of e.lines)assert.ok(panel.innerHTML.includes('>'+escape(l[1])+'<'),e.id+': source paragraph missing');
  assert.ok(panel.innerHTML.includes(escape(e.source.name)),e.id+': provenance missing');
  for(const a of e.annotations||[])if(typeof a==='object'){assert.ok(panel.innerHTML.includes(escape(a.title)),e.id+': statutory-note title missing');for(const l of a.lines||[])assert.ok(panel.innerHTML.includes('>'+escape(l[1])+'<'),e.id+': statutory-note paragraph missing');}
  assert.ok(!panel.innerHTML.includes('&quot;lines&quot;:'),e.id+': raw annotation JSON reached reader');
  if((e.links||[]).some(l=>!l.automaticRibbon&&l.relationship!=='explicit-citation'&&!l.basis?.startsWith('Explicit citation')))assert.ok(panel.innerHTML.includes('<summary>Related doctrine</summary>'),e.id+': contextual discovery is mixed into case connections');
}
api.open('frcp-16.1');context.draw();assert.ok(ids.get('geoCanvas').innerHTML.includes('data-map-jump="authority:frcp-16.1"'),'Provision not reachable through native map activation: '+JSON.stringify({lastFit,z:S.z,x:S.x,y:S.y,map:ids.get('geoCanvas').innerHTML.slice(0,300)}));
assert.ok(panel.innerHTML.includes('data-authority-open="frcp-17"'),'Ordered navigation lost Rule 17');
api.open('frcp-71A');assert.ok(panel.innerHTML.includes('data-authority-open="frcp-72"'),'Former 71A interrupts sequential reading');api.open('frcp-16.1');
const oldRegion=S.region;api.open('frcp-17');context.back();assert.equal(context.selected.id,'frcp-16.1');assert.equal(S.region,oldRegion,'Back did not restore authority group');
context.goNode('cp-gibbs');context.back();assert.equal(context.selected.id,'frcp-16.1');assert.equal(nativeNodes,1,'Case navigation failed');
api.open('usc-28-1367');const route=api.geography().route;assert.ok(route.some(r=>r.title.startsWith('Title 28')),'Title hierarchy missing');assert.ok(route.some(r=>r.title.includes('CHAPTER')),'Official chapter missing');
context.draw();assert.ok(!ids.get('geoCanvas').innerHTML.includes('authority-ribbon'),'Authority ribbon remains');
assert.ok(!ids.get('geoCanvas').innerHTML.includes('authority-map-case'),'Case grid replaces source hierarchy');
assert.ok(!panel.innerHTML.includes('Cases on map'),'Case-map action remains');

// Match the native safe area, actual camera projection, and ordinary word
// wrapping. These deterministic checks complement real-browser font metrics.
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const unescape=s=>s.replace(/&(amp|lt|gt|quot|#39);/g,m=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[m]));
function assertTextBounds(map,label){
  assert.ok(!/textLength=|lengthAdjust=/.test(map),label+': condensed glyphs remain');
  const stack=[{box:api.geography().layout.box,preview:false}],tokens=map.match(/<g\b[^>]*>|<\/g>|<rect\b[^>]*>|<text\b[^>]*>[^<]*<\/text>/g)||[];
  for(const token of tokens){
    if(token.startsWith('<g')){const a=attrs(token),b=a['data-authority-box']?.split(',').map(Number);stack.push({box:b?{x:b[0],y:b[1],w:b[2],h:b[3]}:stack.at(-1).box,preview:a.class==='authority-preview'||a.class==='authority-map-case'});}
    else if(token==='</g>')stack.pop();
    else if(token.startsWith('<rect')&&stack.at(-1).preview){const a=attrs(token);stack.at(-1).box={x:+a.x,y:+a.y,w:+a.width,h:+a.height};stack.at(-1).preview=false;}
    else if(token.startsWith('<text')){
      const a=attrs(token),b=stack.at(-1).box,fs=+a['font-size'],value=unescape(token.replace(/^<text\b[^>]*>|<\/text>$/g,''));
      assert.ok(+a.x>=b.x-1&&+a.x+measure(value,fs,a['font-weight'],a.class)<=b.x+b.w+2,label+': text exceeds horizontal card bounds: '+value);
      assert.ok(+a.y-fs*.9>=b.y-1&&+a.y+fs*.3<=b.y+b.h+2,label+': text exceeds vertical card bounds: '+value);
    }
  }
}
function assertProjected(b,label){
  const a=area(),x=(b.x-S.x)*S.z+viewport.w/2,y=(b.y-S.y)*S.z+viewport.h/2;
  assert.ok(x>=a.x-1&&y>=a.y-1&&x+b.w*S.z<=a.x+a.w+1&&y+b.h*S.z<=a.y+a.h+1,label+': fitted selection is cropped');
}
function overlaps(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
const sizes=[{w:1681,h:1128},{w:1280,h:800},{w:1000,h:700},{w:390,h:844},{w:844,h:390}];
for(const size of sizes){
  viewport=size;api.group('authority-root');context.draw();let g=api.geography();
  assert.equal(g.layout.cards.length,6,'All six volumes must remain identifiable');
  assert.equal(g.layout.fit.h,g.layout.box.h,'Root fits only a partial selection');
  g.layout.cards.forEach(c=>assertProjected(c,JSON.stringify(size)+' '+c.id));
  assertTextBounds(ids.get('geoCanvas').innerHTML,JSON.stringify(size)+' root');
  const ordinary=[...ids.get('geoCanvas').innerHTML.matchAll(/<text\b([^>]*class="authority-(?:volume-title|preview-label)"[^>]*)>/g)];
  for(const m of ordinary)assert.ok(+attrs(m[1])['font-size']*S.z>=13.5,JSON.stringify(size)+': root title or preview is too small');
  api.group('authority:constitution');context.draw();g=api.geography();
  assert.equal(g.layout.cards.length,3,'Constitution navigation loses a main panel');
  assert.equal(g.layout.fit.h,g.layout.box.h,'Constitution leaves main panels below the initial viewport');
  g.layout.cards.forEach(c=>assertProjected(c,JSON.stringify(size)+' '+c.id));
  assertTextBounds(ids.get('geoCanvas').innerHTML,JSON.stringify(size)+' Constitution');
  const masthead=ids.get('geoCanvas').innerHTML.match(/<mask id="authority-constitution-masthead"([^>]*)>/);assert.ok(masthead,'Centered Constitution mark missing');
  const markBox=attrs(masthead[1]);assert.ok(Math.abs(+markBox.x+(+markBox.width)/2-g.layout.box.x-g.layout.box.w/2)<1,'Constitution identity is not centered');
  if(g.layout.safe.h>=400)assert.ok(+markBox.width>=g.layout.box.w*.75,'Constitution identity is too small for its collection');
  assert.ok(!ids.get('geoCanvas').innerHTML.includes('class="authority-ribbon"'),'Decorative hierarchy self-references remain');
  assert.ok(ids.get('geoCanvas').innerHTML.includes('data-map-region="authority:constitution/amendments"'),'Amendments navigation missing');
  if(size.w<650)assert.equal((ids.get('geoCanvas').innerHTML.match(/class="authority-preview"/g)||[]).length,0,'Phone overview crams chapter previews into compact controls');
  for(const group of ['authority:frcp','authority:restatement','authority:uscode']){
    api.group(group);context.draw();const layout=api.geography().layout;
    assertProjected(layout.fit,JSON.stringify(size)+' '+group);assertTextBounds(ids.get('geoCanvas').innerHTML,JSON.stringify(size)+' '+group);
  }
}
// Every index page fits its complete cards. Paging preserves the complete
// source-defined sequence; opening a provision retains its source siblings.
for(const size of sizes){
  viewport=size;
  for(const group of groupIds){
    api.group(group);context.draw();let g=api.geography(),seen=[];
    assert.equal(g.layout.fit.h,g.layout.box.h,group+': only a prefix is fitted');
    for(;;){
      const map=ids.get('geoCanvas').innerHTML;
      assert.ok(!map.includes('authority-ribbon')&&!map.includes('authority-map-case'),group+': a source index contains a case graph');
      g.layout.cards.forEach(c=>{assertProjected(c,JSON.stringify(size)+' '+group+' '+c.id);if(size.w===390&&group!=='authority-root'&&group!=='authority:constitution')assert.ok(c.w>=250,'Phone source boxes are too narrow for ordinary legal words');});
      assertTextBounds(map,JSON.stringify(size)+' '+group);
      seen.push(...g.layout.cards.map(c=>c.id));
      const next=g.layout.pages[g.layout.page+1];if(!next)break;
      assert.ok(map.includes('aria-label="Next →"'),'Next page is inaccessible');
      context.goRegion('authority-page:'+next.start);
      context.draw();g=api.geography();
    }
    assert.equal(JSON.stringify(seen),JSON.stringify(g.children.map(c=>c.id)),group+': paging loses, duplicates or reorders source entries');
  }
}
viewport={w:1280,h:800};api.open('frcp-16.1');context.draw();
assert.ok(ids.get('geoCanvas').innerHTML.includes('data-map-jump="authority:frcp-16.1"'),'Selected provision loses its native source card');
assert.ok(api.geography().layout.cards.length>1,'Opening a provision removes its source siblings');
const beforeNative=nativeNodes;context.goNode('cp-gibbs');context.back();assert.equal(nativeNodes,beforeNative+1);assert.equal(context.selected.id,'frcp-16.1','Related entry Back loses source provision');
viewport={w:2560,h:1600};api.group('authority:constitution');context.draw();
const preamble=data.entries.find(e=>e.id==='const-preamble').lines[0][1],quote=[...ids.get('geoCanvas').innerHTML.matchAll(/<text\b[^>]*class="authority-preamble-excerpt"[^>]*>([^<]*)<\/text>/g)].map(m=>m[1]).join(' ');
assert.equal(quote.replace(/\s+/g,' ').trim(),escape(preamble).replace(/\s+/g,' ').trim(),'Desktop Preamble loses source words');
assert.ok(!quote.includes('…'),'Preamble quote must remain complete');
const periodCodes=[...ids.get('geoCanvas').innerHTML.matchAll(/<text\b[^>]*class="authority-preview-code"[^>]*>([^<]*)<\/text>/g)].map(m=>m[1]);
assert.ok(periodCodes.includes('1–10')&&!periodCodes.some(s=>s.startsWith('Amendments ')),'Amendment period badges repeat their parent');
// Close restores parent geometry, rather than leaving siblings outside a leaf fit.
api.open('frcp-16.1');const leafFit={...lastFit};ids.get('closeInspector').onclick();context.draw();
assert.equal(context.selected,null);assert.equal(S.panelOpen,false);assert.equal(JSON.stringify(lastFit),JSON.stringify(api.geography().layout.fit),'Close fails to reframe its authority parent');
function runTimer(){const pair=timers.entries().next().value;assert.ok(pair,'Expected deferred resize');timers.delete(pair[0]);pair[1]();}
api.group('authority-root');viewport={w:1000,h:700};context.R11.anim=true;resizeCallback();runTimer();
assert.ok(timers.size,'Resize during camera flight was discarded');context.R11.anim=false;runTimer();context.draw();
api.geography().layout.cards.forEach(c=>assertProjected(c,'Queued resize '+c.id));
api.group('authority:constitution');api.open('const-art-3');viewport={w:390,h:844};context.back();context.draw();
assert.equal(context.selected,null);api.geography().layout.cards.forEach(c=>assertProjected(c,'Back after viewport change '+c.id));
// World overview uses identities and headings, not compressed chapter contents.
context.home('Atlas');viewport={w:1681,h:1128};let entry=api.geography().entrance;
S.x=entry.x+entry.w/2;S.y=entry.y+entry.h/2;S.z=.055;ids.get('geoCanvas').innerHTML='';context.R18.afterDraw.at(-1)();
const world=ids.get('geoCanvas').innerHTML;assert.equal((world.match(/class="authority-map-tile authority-volume-cover/g)||[]).length,6);
assert.equal((world.match(/class="authority-preview"/g)||[]).length,0,'World overview crams provision previews');assert.ok(!/textLength=|lengthAdjust=/.test(world));
viewport={w:1280,h:900};api.group('authority-root');ids.get('studyFit').onclick();assert.equal(JSON.stringify(lastFit),JSON.stringify(api.geography().layout.fit),'Native Fit uses authority geometry');
context.window.DKLAScotusBox={x:-11400,y:10400,w:22800,h:4200};context.window.DKLAGeography={bounds(){return{x:-18000,y:-4000,w:46000,h:22000};}};api.group('authority-root',false);
assert.equal(api.geography().entrance.y,18900,'Authority precinct ignores final course envelope');assert.equal(api.geography().entrance.w,22800,'Authority entrance reduced to a dictionary-sized afterthought');
assert.equal(ids.get('geoBreadcrumb').innerHTML.includes('authority-shortcut'),false,'Redundant breadcrumb shortcut remains');
console.log(JSON.stringify({rendered:data.entries.length,sourceParagraphs:data.entries.reduce((n,e)=>n+e.lines.length,0),statutoryNotes:data.entries.reduce((n,e)=>n+(e.annotations||[]).length,0),hierarchy:sourceIds.size,groups:api.geography().groupCount,nativeInspector:true,back:true,authorityRibbons:false,responsiveViewports:sizes,naturalTextBounds:true,closeRefit:true,queuedResize:true,completeIndexPages:true,sourceHierarchyRetained:true,caseActivation:true}));
