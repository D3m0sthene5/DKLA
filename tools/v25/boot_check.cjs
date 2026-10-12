/* Regression checks for first-paint gating without a browser or stored corpus. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(__dirname, 'boot.js'), 'utf8');

function fixture(options = {}) {
  let now = 0, serial = 0, installed = options.installed ?? true;
  const timers = [], frames = [], listeners = new Map(), nodes = new Map();
  const classes = new Set(options.classes ?? ['r20-ready', 'geography-locked']);
  const release = {textContent:'v2.5'}, mark = {dataset:{r20:options.mark ?? '1'}};
  const S = {scope:options.scope ?? 'Atlas',region:options.region ?? null,district:null,
    history:options.history ?? [],notes:{owner:'Preserved'},x:12,y:34,z:.08};
  const selected = options.selected ?? null;
  const before = JSON.stringify({S,selected});
  const calls = {apply:0,heading:0,inspector:0,overview:0,draw:0};
  function element(tag) {
    return {tag,children:[],setAttribute(){},append(...children){this.children.push(...children);},
      remove(){nodes.delete(this.id);}};
  }
  const document = {readyState:options.parsed === false ? 'loading':'complete',hidden:false,
    documentElement:{classList:{contains:k=>classes.has(k),add:k=>classes.add(k)}},
    querySelector(selector){
      if(selector.includes('.dkla-release'))return release;
      if(selector.includes('[viewBox='))return options.legacyMark ? {}:null;
      if(selector.includes('.dkla-map-monogram'))return mark;
      return null;
    },getElementById:id=>nodes.get(id),createElement:element,
    addEventListener(name,fn){listeners.set(name,fn);},
    body:{append(el){nodes.set(el.id,el);}}
  };
  const apply = ()=>{calls.apply++;};
  const context = {document,location:{href:'https://example.test/#node=case'},S,selected,
    LegalAtlas:{ready:options.baseReady ?? true},R18:{afterDraw:[]},
    DKLABriefs:{apply,data:{version:'v2.5'}},DKLAPlain:{apply},DKLAAudit:{apply},
    DKLAPracticeFilter:{apply},DKLAGeography:{apply},
    DKLAIdentity:{ready:options.identityReady ?? true},
    DKLAOverview:{ready:options.overviewReady ?? true,refresh(){calls.overview++;}},
    renderHeading(){calls.heading++;},renderInspector(){calls.inspector++;},
    draw(){calls.draw++;if(installed)context.R18.afterDraw.forEach(fn=>fn());},
    setTimeout(fn,delay){timers.push({fn,at:now+delay,id:++serial});return serial;},
    requestAnimationFrame(fn){frames.push(fn);}
  };
  context.window = context;
  vm.runInNewContext(source,context,{filename:'boot.js'});
  return {context,classes,calls,mark,nodes,
    unchanged(){assert.equal(JSON.stringify({S,selected}),before,'Boot changed route, camera, history or notes');},
    installed(value){installed=value;},
    parsed(){document.readyState='interactive';listeners.get('DOMContentLoaded')?.();},
    frame(){frames.splice(0).forEach(fn=>fn());},
    advance(delta){const end=now+delta;let guard=0;
      while(true){timers.sort((a,b)=>a.at-b.at||a.id-b.id);if(!timers.length||timers[0].at>end)break;
        const t=timers.shift();now=t.at;t.fn();assert.ok(++guard<10000,'Timer loop');}
      now=end;},
    ready(){return !!context.DKLABoot.ready;}
  };
}

// A first draw and its following frame, not the legacy ready class, reveal UI.
let f=fixture();assert.equal(f.ready(),false);f.frame();assert.equal(f.ready(),false);
f.frame();assert.equal(f.ready(),true);assert.ok(f.classes.has('dkla-boot-ready'));
assert.equal(f.calls.apply,5);f.unchanged();

// Parsing, storage recovery, the current identity and the overview are gates.
for(const option of ['parsed','baseReady','identityReady','overviewReady']){
  f=fixture({[option]:false});f.advance(6500);f.frame();f.frame();
  assert.equal(f.ready(),false,option+' leaked an older first view');
  if(option==='parsed')f.parsed();
  else if(option==='baseReady')f.context.LegalAtlas.ready=true;
  else if(option==='identityReady')f.context.DKLAIdentity.ready=true;
  else f.context.DKLAOverview.ready=true;
  f.advance(80);f.frame();f.frame();assert.equal(f.ready(),true);f.unchanged();
}

// The legacy 200ms overlay installer must actually have wrapped draw.
f=fixture({installed:false});f.frame();f.frame();assert.equal(f.ready(),false);
f.installed(true);f.advance(80);f.frame();f.frame();assert.equal(f.ready(),true);

// A freshly recreated map mark must be shaped before exposure.
f=fixture({mark:'0'});f.frame();f.frame();assert.equal(f.ready(),false);
f.mark.dataset.r20='1';f.advance(80);f.frame();f.frame();assert.equal(f.ready(),true);
f=fixture({legacyMark:true});f.frame();f.frame();assert.equal(f.ready(),false);

// Deep links, selected cases, source-library navigation and history stay put.
for(const scope of ['Contracts','SCOTUS History','Rules & authorities']){
  f=fixture({scope,region:'kept',history:[{scope:'Atlas'}],selected:{type:'node',id:'owner-case'}});
  f.frame();f.frame();assert.equal(f.ready(),true);f.unchanged();
}

// A stalled/background boot offers recovery without exposing legacy content.
f=fixture({baseReady:false});f.context.document.hidden=true;f.advance(12000);
assert.equal(f.ready(),false);assert.equal(f.nodes.has('dklaBootNotice'),false);
f.context.document.hidden=false;f.advance(2000);assert.equal(f.nodes.has('dklaBootNotice'),true);
assert.equal(f.ready(),false);f.context.LegalAtlas.ready=true;f.advance(80);f.frame();f.frame();
assert.equal(f.ready(),true);assert.equal(f.nodes.has('dklaBootNotice'),false);

// Verify the independently generated head curtain and final module order.
const assembler=fs.readFileSync(path.join(root,'tools/r19/assemble.py'),'utf8');
assert.match(assembler,/html:not\(\.dkla-boot-ready\).*?opacity:0!important/s);
assert.doesNotMatch(assembler,/html:not\(\.r20-ready\) body/);
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'runtime-manifest.json'),'utf8'));
assert.equal(manifest.javascript.at(-1),'tools/v25/boot.js');
assert.ok(manifest.javascript.indexOf('tools/v25/identity.js')<manifest.javascript.indexOf('tools/v25/overview.js'));
assert.ok(manifest.javascript.includes('tools/v25/identity.js'));
console.log('Boot checks passed: parsing, delayed storage, legacy timers/marks, final draw, overview, routes and reload notice.');
