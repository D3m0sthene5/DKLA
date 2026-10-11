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
const ids=new Map(),created=[];for(const id of ['inspector','courseHome','geoBreadcrumb','studyBack','mapWelcome','studyFit','moreBtn','mapHint','search','searchResults','geoCanvas'])ids.set(id,new Element());
ids.set('dklaAuthoritiesData',{textContent:embedded[1]});
ids.set('dklaWeThePeopleAsset',{textContent:markBlock[1]});
const document={events:{},getElementById(id){return ids.get(id)||null;},createElement(tag){created.push(tag);return new Element();},querySelectorAll(){return [];},addEventListener(t,f){this.events[t]=f;}};
const S={scope:'Atlas',region:null,district:null,x:0,y:0,z:.2,panelOpen:false,history:[],paintNodes:[],paintEdges:[]};
let viewport={w:1280,h:900},lastFit=null,nativeNodes=0;
const context={window:{},document,S,selected:null,svg:ids.get('geoCanvas'),R18:{afterDraw:[]},R11:{level(){return {lvl:0};},step(){return false;}},
  MutationObserver:class{observe(){}},ResizeObserver:class{observe(){}},setTimeout,clearTimeout,
  rect(){return viewport;},regionFor(id){return id==='dictionary-region'?{x:-1700,y:2700,w:2400,h:1300}:null;},scopeBox(){return {x:0,y:0,w:100,h:100};},galaxy(){return {box:{x:-25000,y:-15000,w:50000,h:31000}};},
  home(scope){this.selected=null;S.scope=scope;S.region=null;S.panelOpen=false;},goRegion(){},goNode(id){context.remember();nativeNodes++;S.scope='Civil Procedure';S.region='cp-subject-region';context.selected={type:'node',id};},
  renderHeading(){},renderInspector(){ids.get('inspector').innerHTML='';},readerChrome(body,label){return `<div class="reader-top">${label}</div><div class="reader-body">${body}</div>`;},wireReader(){},
  remember(){S.history.push({scope:S.scope,region:S.region,district:S.district,panelOpen:S.panelOpen,selected:context.selected?{...context.selected}:null,x:S.x,y:S.y,z:S.z});if(S.history.length>70)S.history.shift();},
  back(){const v=S.history.pop();if(!v)return;Object.assign(S,v);context.selected=v.selected;context.renderInspector();context.renderHeading();context.draw();},
  setReader(open){S.panelOpen=open;ids.get('inspector').hidden=!open;},closeSearch(){},dismissMenu(){},fit(){},
  fitBox(b){lastFit=b;S.x=b.x+b.w/2;S.y=b.y+b.h/2;S.z=Math.min(viewport.w/b.w,viewport.h/b.h,.95);},
  bounds(bs){const items=bs.filter(Boolean),x=Math.min(...items.map(b=>b.x)),y=Math.min(...items.map(b=>b.y));return{x,y,w:Math.max(...items.map(b=>b.x+b.w))-x,h:Math.max(...items.map(b=>b.y+b.h))-y};},
  visibleBox(){return{x:-20000,y:-20000,w:60000,h:60000};},intersects(){return true;},homeFor(){return{x:0,y:0,w:100,h:100};},mapCenterVisible(){return{x:S.x,y:S.y};},
  edgePoint(a){return{x:a.x+a.w/2,y:a.y+a.h/2};},taperedRibbon(){return'M0 0L1 1Z';},draw(){},schedule(){},
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'authorities.js'),'utf8'),context);
const api=context.window.DKLAAuthorities,panel=ids.get('inspector');assert.ok(api,'Map adapter missing');assert.equal(created.includes('dialog'),false,'Separate authority dialog created');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sourceIds=new Set(),orderedByCollection=new Map(),sourceById=new Map(data.entries.map(e=>[e.id,e]));
api.group('authority-root',false);context.draw();
assert.equal(api.geography().children.length,6,'Related source volumes are scattered across redundant covers');
const coverMap=ids.get('geoCanvas').innerHTML;assert.equal((coverMap.match(/class="authority-map-tile authority-volume-cover/g)||[]).length,6,'Six distinct covers not painted');
assert.ok((coverMap.match(/class="authority-preview"/g)||[]).length>=20,'Collection covers lack useful nested contents');
assert.ok(coverMap.includes('authority-people-mark'),'Constitution reference identity not painted');
assert.ok(coverMap.includes('mask-type="alpha"'),'Constitution mark must use flat single-color treatment');
assert.ok(coverMap.includes('maskUnits="userSpaceOnUse"')&&coverMap.includes('maskContentUnits="userSpaceOnUse"'),'World-coordinate masthead is clipped by default mask units');
assert.ok((coverMap.match(/class="authority-title-control"/g)||[]).length===6,'Each collection needs a separate accessible title control');
function walk(group){api.group(group,false);const snapshot=api.geography();for(const c of snapshot.children){if(c.provision){assert.ok(!sourceIds.has(c.provision),'Duplicated provision in hierarchy: '+c.provision);sourceIds.add(c.provision);const col=sourceById.get(c.provision).collection;if(!orderedByCollection.has(col))orderedByCollection.set(col,[]);orderedByCollection.get(col).push(c.provision);}else walk(c.id);}}
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
}
api.open('frcp-16.1');context.draw();assert.ok(ids.get('geoCanvas').innerHTML.includes('data-map-jump="authority:frcp-16.1"'),'Provision not reachable through native map activation');
assert.ok(panel.innerHTML.includes('data-authority-open="frcp-17"'),'Ordered navigation lost Rule 17');
api.open('frcp-71A');assert.ok(panel.innerHTML.includes('data-authority-open="frcp-72"'),'Former 71A interrupts sequential reading');api.open('frcp-16.1');
const oldRegion=S.region;api.open('frcp-17');context.back();assert.equal(context.selected.id,'frcp-16.1');assert.equal(S.region,oldRegion,'Back did not restore authority group');
context.goNode('cp-gibbs');context.back();assert.equal(context.selected.id,'frcp-16.1');assert.equal(nativeNodes,1,'Case navigation failed');
api.open('usc-28-1367');const route=api.geography().route;assert.ok(route.some(r=>r.title.startsWith('Title 28')),'Title hierarchy missing');assert.ok(route.some(r=>r.title.includes('CHAPTER')),'Official chapter missing');
if(data.entries.find(e=>e.id==='usc-28-1367').links.length){document.events.click({preventDefault(){},stopPropagation(){},target:{closest(){return{dataset:{authorityConnections:''}};}}});context.draw();assert.equal(S.panelOpen,false);assert.ok(ids.get('geoCanvas').innerHTML.includes('authority-ribbon'),'Native ribbon missing');}
viewport={w:390,h:844};api.group('authority-root');context.draw();assert.ok(lastFit.w<1500&&lastFit.h<2300,'Phone should fit the first two readable volumes, not all six tiny covers');assert.ok((ids.get('geoCanvas').innerHTML.match(/class="authority-preview"/g)||[]).length>=20,'Phone volume previews disappear');
api.group('authority:constitution');context.draw();assert.ok(ids.get('geoCanvas').innerHTML.includes('data-map-region="authority:constitution/articles"'),'Constitution nesting missing');assert.ok(lastFit.w<1500,'Phone hierarchy did not adapt');
// Exercise the actual native fitter, including its array metadata, rather
// than a wrapM stub that cannot catch font-scale/textLength regressions.
context.measure=(s,size)=>String(s).length*size*.54;
context.wrapM=(s,width,size)=>{const rows=[String(s)];if(context.measure(s,size)>width)rows.squeeze=width;return rows;};
context.textLines=()=>'';
const nativeFit=fs.readFileSync(path.join(root,'tools/r19/fit.js'),'utf8').split('  // The label engine')[0]+'\n})();';
vm.runInNewContext(nativeFit,context);api.group('authority:constitution');context.draw();
const fittedMap=ids.get('geoCanvas').innerHTML,preamble=data.entries.find(e=>e.id==='const-preamble').lines[0][1];
const excerpt=[...fittedMap.matchAll(/<text\b[^>]*class="authority-preamble-excerpt"[^>]*>([^<]*)<\/text>/g)].map(m=>m[1]).join(' ');
assert.equal(excerpt.replace(/\s+/g,' ').trim(),escape(preamble).replace(/\s+/g,' ').trim(),'Fitted phone Preamble loses source words');
assert.ok(!excerpt.includes('…'),'Preamble quote must remain complete');
function assertPreambleBounds(map){
  const clip=map.match(/<clipPath id="authority-clip-authority_3aconst_2dpreamble"><rect\b([^>]*)\/>/);assert.ok(clip,'Preamble clip boundary missing');
  const attrs=s=>Object.fromEntries([...s.matchAll(/\b(y|height|font-size)="([\d.-]+)"/g)].map(m=>[m[1],Number(m[2])]));
  const box=attrs(clip[1]),lines=[...map.matchAll(/<text\b([^>]*class="authority-preamble-excerpt"[^>]*)>([^<]*)<\/text>/g)];assert.ok(lines.length,'Preamble is not rendered');
  for(const l of lines){const a=attrs(l[1]);assert.ok(a.y+a['font-size']*.3<=box.y+box.height,'Preamble descender extends below its card');assert.ok(a.y-a['font-size']*.9>=box.y,'Preamble extends above its card');}
  assert.equal(lines.map(m=>m[2]).join(' ').replace(/\s+/g,' ').trim(),escape(preamble).replace(/\s+/g,' ').trim(),'Bounding the quote removed source words');
}
assertPreambleBounds(fittedMap);
// Match the real phone's smaller safe area, and a further camera zoom-out.
for(const z of [.24,.18]){S.z=z;context.draw();assertPreambleBounds(ids.get('geoCanvas').innerHTML);}
viewport={w:2560,h:1271};api.group('authority:constitution');context.draw();
const desktopQuote=ids.get('geoCanvas').innerHTML;assertPreambleBounds(desktopQuote);
const desktopLines=[...desktopQuote.matchAll(/<text\b([^>]*class="authority-preamble-excerpt"[^>]*)>([^<]*)<\/text>/g)];
assert.ok(desktopLines.length>=2,'Wide Preamble remains a tiny one-line caption');
const desktopFont=Number(desktopLines[0][1].match(/font-size="([\d.]+)"/)[1]);
assert.ok(desktopFont*S.z>=19,'Wide Preamble quote inherits the tiny navigation-label font');
viewport={w:390,h:844};
const previewCodes=[...fittedMap.matchAll(/<text\b[^>]*class="authority-preview-code"[^>]*>([^<]*)<\/text>/g)].map(m=>m[1]);
assert.ok(previewCodes.includes('1–10')&&!previewCodes.some(s=>s.startsWith('Amendments ')),'Amendment period badges repeat their parent label');
api.group('authority:frcp');context.draw();
assert.ok(ids.get('geoCanvas').innerHTML.includes('lengthAdjust="spacingAndGlyphs"'),'Native width-fit metadata is not applied to long labels');
viewport={w:1280,h:900};api.group('authority-root');ids.get('studyFit').onclick();assert.ok(lastFit.w>1500,'Desktop Fit uses empty native membership instead of authority geometry');
context.window.DKLAScotusBox={x:-11400,y:10400,w:22800,h:4200};context.window.DKLAGeography={bounds(){return{x:-18000,y:-4000,w:46000,h:22000};}};api.group('authority-root',false);
assert.equal(api.geography().entrance.y,18900,'Authority precinct ignores final course envelope');assert.equal(api.geography().entrance.w,22800,'Authority entrance reduced to a dictionary-sized afterthought');
assert.equal(ids.get('geoBreadcrumb').innerHTML.includes('authority-shortcut'),false,'Redundant breadcrumb shortcut remains');
console.log(JSON.stringify({rendered:data.entries.length,sourceParagraphs:data.entries.reduce((n,e)=>n+e.lines.length,0),statutoryNotes:data.entries.reduce((n,e)=>n+(e.annotations||[]).length,0),hierarchy:sourceIds.size,groups:api.geography().groupCount,nativeInspector:true,back:true,ribbons:true,responsiveGeometry:true}));
