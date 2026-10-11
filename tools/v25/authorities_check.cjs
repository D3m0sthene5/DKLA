/* Render every embedded authority through the real reader. This catches missing
 * source paragraphs, malformed source shapes and navigation exceptions. Browser
 * layout, focus and scroll QA remain separate. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const file=process.argv[2]?path.resolve(process.argv[2]):path.join(root,JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8')).file);
const html=fs.readFileSync(file,'utf8');
const embedded=html.match(/<script\b[^>]*\bid="dklaAuthoritiesData"[^>]*>([\s\S]*?)<\/script>/);
assert.ok(embedded,'Authority data missing from release');
const data=JSON.parse(embedded[1]);
class Element{
  constructor(){this.dataset={};this.events={};this.children=new Map();this.innerHTML='';this.open=false;this.value='';this.scrollTop=0;}
  setAttribute(){}
  addEventListener(type,fn){this.events[type]=fn;}
  querySelector(key){if(!this.children.has(key))this.children.set(key,new Element());return this.children.get(key);}
  querySelectorAll(){return [];}
  appendChild(el){this.children.set(el.id||String(this.children.size),el);}
  focus(){}
  showModal(){this.open=true;}
  close(){this.open=false;}
}
const els=[];
const document={body:{appendChild(e){els.push(e);}},createElement(){return new Element();},getElementById(id){return id==='dklaAuthoritiesData'?{textContent:embedded[1]}:els.find(e=>e.id===id)||null;},addEventListener(){}};
const media={matches:true,addEventListener(type,fn){this.listener=fn;}};
const window={};
const context={window,document,matchMedia(){return media;},MutationObserver:class{observe(){}},S:{scope:'Legislation and the Regulatory State'}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'authorities.js'),'utf8'),context);
const reader=document.getElementById('authorityLibrary');
const main=reader.querySelector('.authority-reading');
const index=reader.querySelector('.authority-index');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const e of data.entries){
  window.DKLAAuthorities.open(e.id);
  assert.equal(reader.open,true,e.id+': dialog failed to open');
  assert.ok(main.innerHTML.includes(escape(e.cite)),e.id+': citation missing');
  for(const line of e.lines)assert.ok(main.innerHTML.includes('>'+escape(line[1])+'<'),e.id+': missing or unescaped source paragraph');
  assert.ok(main.innerHTML.includes(escape(e.source.name)),e.id+': provenance missing');
  for(const a of e.annotations||[])if(typeof a==='object'){
    assert.ok(main.innerHTML.includes(escape(a.title)),e.id+': statutory-note title missing');
    for(const line of a.lines||[])assert.ok(main.innerHTML.includes('>'+escape(line[1])+'<'),e.id+': statutory-note paragraph missing');
  }
  assert.ok(!main.innerHTML.includes('&quot;lines&quot;:'),e.id+': raw annotation JSON reached reader');
}
// The index must remain usable after switching a mobile reader into desktop size.
window.DKLAAuthorities.open('frcp-16.1');
assert.equal(index.open,false,'Mobile index should start collapsed');
media.matches=false;media.listener();
assert.equal(index.open,true,'Desktop resize did not reopen the index');
reader.events.click({target:{closest(){return{dataset:{authorityId:'frcp-17'}};}}});
assert.ok(main.innerHTML.includes('Rule 17'),'Next-rule navigation failed');
let stopped=false;reader.events.keydown({stopPropagation(){stopped=true;}});
assert.equal(stopped,true,'Reader keyboard events leaked to map');
window.DKLAAuthorities.open(null,'constitution');
assert.ok(main.innerHTML.includes('Preamble'),'Constitution shortcut did not open first provision');
console.log(JSON.stringify({rendered:data.entries.length,sourceParagraphs:data.entries.reduce((n,e)=>n+e.lines.length,0),statutoryNotes:data.entries.reduce((n,e)=>n+(e.annotations||[]).length,0),desktopResize:true,navigation:true,keyboardIsolation:true}));
