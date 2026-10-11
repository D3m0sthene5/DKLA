/* Map-native authorities. Private geometry is reconstructed from source data;
 * graph records and saved homes remain untouched. S.region/selected carry the
 * route through the atlas's existing camera, inspector and Back history. */
(() => {
  'use strict';
  const block=document.getElementById('dklaAuthoritiesData');
  if(!block||typeof S==='undefined'||typeof draw!=='function')return;
  let D;try{D=JSON.parse(block.textContent);}catch{return;}
  if(!Array.isArray(D.entries)||!Array.isArray(D.collections))return;
  const TITLE='Rules & authorities',PREFIX='authority:',ROOT='authority-root';
  const BOX={x:-11400,y:15500,w:22800,h:11000};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=s=>String(s).toLowerCase().replace(/u\.?\s*s\.?\s*c\.?/g,'usc').replace(/\b(rule|restatement|ucc)(\d)/g,'$1 $2');
  const byId=new Map(D.entries.map(e=>[e.id,e])),collections=new Map(D.collections.map(c=>[c.id,c]));
  const groups=new Map(),leaves=new Map(),collectionGroups=new Map();
  const status={abrogated:'Abrogated',repealed:'Repealed',renumbered:'Renumbered',omitted:'Omitted',transferred:'Transferred',reserved:'Reserved','index-only':'Index only','deleted-model-section':'Deleted model section','article-index':'Article directory'};
  const accent=['#e7b078','#86bfff','#8dc8b1'];
  const skins={
    constitution:{ink:'#dce7cd',edge:'#afcdb8',base:'#19342f',paper:'#203d36',mark:'constitution'},
    frcp:{ink:'#b8d7fb',edge:'#769ecb',base:'#172c42',paper:'#20394f',mark:'procedure'},
    uscode:{ink:'#a9dcd8',edge:'#65aaa6',base:'#152f36',paper:'#1e3c43',mark:'code'},
    ucc:{ink:'#edc2a0',edge:'#c3926c',base:'#3a2826',paper:'#49332d',mark:'commerce'},
    restatement:{ink:'#e5c6ba',edge:'#b5827c',base:'#35242c',paper:'#45313a',mark:'restatement'},
    consumer:{ink:'#d5c5ef',edge:'#a58bc8',base:'#2b293e',paper:'#3a3450',mark:'consumer'}
  };
  let peopleAsset='';try{peopleAsset=JSON.parse(document.getElementById('dklaWeThePeopleAsset')?.textContent||'{}').uri||'';}catch{}
  // Chapter/topic boundaries follow the assigned Selections' actual TOC,
  // PDF pp.12–23. These are legal headings, not generated thematic buckets.
  const restChapters=[
    [1,8,'Meaning of Terms'],[9,16,'Formation · Parties and Capacity'],
    [17,70,'Formation · Mutual Assent',[[17,17,'In General'],[18,23,'Manifestation of Assent'],[24,34,'Making of Offers'],[35,49,'Duration of the Power of Acceptance'],[50,70,'Acceptance of Offers']]],
    [71,109,'Formation · Consideration',[[71,81,'The Requirement of Consideration'],[82,94,'Contracts Without Consideration'],[95,109,'Contracts Under Seal; Statutory Writing']]],
    [110,150,'The Statute of Frauds',[[110,110,'Classes of Contracts Covered'],[111,111,'Executor–Administrator'],[112,123,'Suretyship'],[124,124,'Marriage'],[125,129,'Land Contracts'],[130,130,'The One-Year Provision'],[131,138,'Satisfaction by a Memorandum'],[139,150,'Consequences of Non-Compliance']]],
    [151,158,'Mistake'],[159,177,'Misrepresentation, Duress and Undue Influence',[[159,173,'Misrepresentation'],[174,177,'Duress and Undue Influence']]],
    [178,199,'Unenforceability · Public Policy',[[178,185,'Unenforceability in General'],[186,188,'Restraint of Trade'],[189,191,'Impairment of Family Relations'],[192,196,'Other Protected Interests'],[197,199,'Restitution']]],
    [200,230,'The Scope of Contractual Obligations',[[200,204,'Meaning of Agreements'],[205,208,'Fairness and the Public Interest'],[209,218,'Adoption of a Writing'],[219,223,'Usage'],[224,230,'Conditions and Similar Events']]],
    [231,260,'Performance and Non-Performance',[[231,234,'Performances to Be Exchanged'],[235,249,'Effect of Performance and Non-Performance'],[250,257,'Prospective Non-Performance'],[258,260,'Application of Performances']]],
    [261,272,'Impracticability and Frustration'],
    [273,287,'Discharge by Assent or Alteration',[[273,277,'Consideration and Discharge'],[278,282,'Substituted Performance, Accord and Account'],[283,285,'Rescission, Release and Contract Not to Sue'],[286,287,'Alteration']]],
    [288,301,'Joint and Several Promisors and Promisees',[[288,296,'Joint and Several Promisors'],[297,301,'Joint and Several Promisees']]],
    [302,315,'Contract Beneficiaries'],
    [316,343,'Assignment and Delegation',[[316,316,'Scope of This Chapter'],[317,323,'What Can Be Assigned or Delegated'],[324,330,'Mode of Assignment or Delegation'],[331,333,'Assignor and Assignee'],[334,339,'The Obligor’s Duty'],[340,343,'Assignees and Adverse Claimants']]],
    [344,385,'Remedies',[[344,345,'In General'],[346,356,'Award of Damages'],[357,369,'Specific Performance and Injunction'],[370,377,'Restitution'],[378,385,'Election and Affirmance']]]
  ];
  function branch(key,title,parent,description='',collection=''){
    const n={key,title,parent,description,collection,children:[],count:0};groups.set(key,n);if(parent)parent.children.push(n);return n;
  }
  function leaf(e,parent){const n={key:PREFIX+e.id,title:e.title,label:e.cite,parent,collection:e.collection,entry:e,count:1};parent.children.push(n);leaves.set(e.id,n);return n;}
  const entryName=e=>e.cite===e.title?e.cite:e.cite+' · '+e.title;
  const ruleNumber=e=>e.id==='frcp-71A'?71.15:e.id==='frcp-forms'?Infinity:Number(e.id.replace('frcp-',''));
  function shortNumber(e){return e.section||e.cite.replace(/^.*(?:§ |Rule |Article |Amendment )/,'');}
  function chunk(parent,entries,size=8,label='Sections'){
    for(let i=0;i<entries.length;i+=size){const part=entries.slice(i,i+size),n=branch(parent.key+'/range-'+i,part[0].title,parent,'Numbered reading range',parent.collection);n.range=`${label} ${shortNumber(part[0])}–${shortNumber(part[part.length-1])}`;part.forEach(e=>leaf(e,n));}
  }
  function file(parent,entries,label='Sections'){if(entries.length>12)chunk(parent,entries,8,label);else entries.forEach(e=>leaf(e,parent));}
  function keyed(entries,key){const out=new Map();for(const e of entries){const k=key(e);if(!out.has(k))out.set(k,[]);out.get(k).push(e);}return out;}
  const root=branch(ROOT,TITLE,null);
  const titleNames={3:'The President',5:'Government Organization and Employees',8:'Aliens and Nationality',9:'Arbitration',10:'Armed Forces',12:'Banks and Banking',13:'Census',15:'Commerce and Trade',18:'Crimes and Criminal Procedure',19:'Customs Duties',20:'Education',21:'Food and Drugs',25:'Indians',26:'Internal Revenue Code',28:'Judiciary and Judicial Procedure',29:'Labor',33:'Navigation and Navigable Waters',34:'Crime Control and Law Enforcement',35:'Patents',39:'Postal Service',42:'The Public Health and Welfare',45:'Railroads',46:'Shipping',47:'Telecommunications',49:'Transportation'};
  const ruleTitles=[
    [1,2,'I · Scope of Rules; Form of Action'],[3,6,'II · Commencing an Action; Service of Process, Pleadings, Motions, and Orders'],
    [7,16.1,'III · Pleadings and Motions'],[17,25,'IV · Parties'],[26,37,'V · Disclosures and Discovery'],[38,53,'VI · Trials'],
    [54,63,'VII · Judgment'],[64,71.1,'VIII · Provisional and Final Remedies'],[72,76,'IX · Special Proceedings'],
    [77,80,'X · District Courts and Clerks'],[81,87,'XI · General Provisions']
  ];
  const uccParts={1:['General Provisions','General Definitions and Principles of Interpretation','Territorial Applicability and General Rules'],2:['Short Title, General Construction and Subject Matter','Form, Formation and Readjustment of Contract','General Obligation and Construction of Contract','Title, Creditors and Good Faith Purchasers','Performance','Breach, Repudiation and Excuse','Remedies']};
  for(const c of D.collections){
    const es=D.entries.filter(e=>e.collection===c.id),parent=branch(PREFIX+c.id,c.title,root,c.description,c.id);if(c.id==='frcp')es.sort((a,b)=>ruleNumber(a)-ruleNumber(b));if(c.id==='restatement')es.sort((a,b)=>Number(a.id.split('-')[1])-Number(b.id.split('-')[1]));collectionGroups.set(c.id,parent);
    if(c.id==='constitution'){
      es.filter(e=>e.id==='const-preamble').forEach(e=>leaf(e,parent));
      const articles=branch(parent.key+'/articles','Articles I–VII',parent,'Original constitutional articles',c.id);es.filter(e=>e.id.startsWith('const-art-')).forEach(e=>leaf(e,articles));
      const amendments=branch(parent.key+'/amendments','Amendments I–XXVII',parent,'Ratified amendments, in order',c.id);
      for(const [lo,hi,title]of [[1,10,'Bill of Rights'],[11,15,'States, Elections and Reconstruction'],[16,19,'Taxation, Senators, Prohibition and Suffrage'],[20,27,'Government, Elections and Succession']]){
        const n=branch(amendments.key+'/amendments-'+lo,title,amendments,'Chronological amendment group',c.id);n.range=`Amendments ${lo}–${hi}`;
        es.filter(e=>{const v=Number(e.id.replace('const-amend-',''));return e.id.startsWith('const-amend-')&&v>=lo&&v<=hi;}).forEach(e=>leaf(e,n));
      }
    }else if(c.id==='frcp'){
      for(const [lo,hi,label]of ruleTitles){
        const members=es.filter(e=>{const n=Number(e.id.replace('frcp-','').replace('71A','71.05'));return n>=lo&&n<=hi;});
        if(lo===81)members.push(...es.filter(e=>e.id==='frcp-forms'));
        const n=branch(parent.key+'/title-'+lo,label,parent,'Official FRCP title',c.id);file(n,members,'Rules');
      }
    }else if(c.id==='uscode'){
      for(const [title,ts]of keyed(es,e=>e.titleNumber)){
        const tn=branch(parent.key+'/title-'+title,`Title ${title} · ${titleNames[title]||'United States Code'}`,parent,Number(title)===28||Number(title)===9?'Complete title':'Course-relevant provisions',c.id);
        // These titles place parts above chapters. Other collected titles
        // place their parts within chapters; reversing them scrambles § order.
        const partFirst=new Set([5,10,18,28,35,39,49]).has(Number(title));
        const outer=partFirst?'part':'chapter',inner=partFirst?'chapter':'part';
        for(const [a,as]of keyed(ts,e=>e[outer]||'')){
          const an=a?branch(tn.key+'/'+outer+'-'+tn.children.length,a,tn,'Official statutory '+outer,c.id):tn;
          for(const [b,bs]of keyed(as,e=>e[inner]||'')){const bn=b?branch(an.key+'/'+inner+'-'+an.children.length,b,an,'Official statutory '+inner,c.id):an;file(bn,bs);}
        }
      }
      const featured=[28,9,5].map(t=>parent.children.find(n=>n.key.endsWith('/title-'+t))).filter(Boolean);
      const other=parent.children.filter(n=>!featured.includes(n)).sort((a,b)=>Number(a.key.split('/title-')[1])-Number(b.key.split('/title-')[1]));
      parent.children=featured;
      if(other.length){const more=branch(parent.key+'/other','Other course statutes',parent,'Selected provisions in numeric title order',c.id);more.children=other;other.forEach(n=>n.parent=more);}
    }else if(c.id==='ucc'){
      for(const [article,as]of keyed(es,e=>e.id.split('-')[1])){
        const an=branch(parent.key+'/article-'+article,`Article ${article}`,parent,'Assigned UCC provisions',c.id);
        for(const [part,ps]of keyed(as,e=>Math.floor(Number(e.id.split('-')[2])/100))){const name=uccParts[article]?.[part-1],pn=branch(an.key+'/part-'+part,`Part ${part}${name?' · '+name:''}`,an,'Assigned model-code section order',c.id);file(pn,ps);}
      }
    }else if(c.id==='restatement'){
      restChapters.forEach(([lo,hi,title,topics],i)=>{
        const n=branch(parent.key+'/chapter-'+(i+1),title,parent,'Assigned Restatement chapter',c.id);n.number=i+1;n.range=`§§ ${lo}–${hi}`;
        const members=es.filter(e=>{const v=Number(e.id.replace('restatement-',''));return v>=lo&&v<=hi;});
        if(topics)for(const [a,b,name]of topics){const ts=members.filter(e=>{const v=Number(e.id.replace('restatement-',''));return v>=a&&v<=b;});if(a===b)ts.forEach(e=>leaf(e,n));else{const t=branch(n.key+'/topic-'+a,name,n,'Assigned Restatement topic',c.id);t.range=`§§ ${a}–${b}`;file(t,ts);}}
        else file(n,members);
      });
    }else if(c.id==='ucc-articles')es.forEach(e=>leaf(e,parent));
    else file(parent,es,'Rules');
  }
  // Related volumes share a cover, without duplicating their source leaves.
  const civil=collectionGroups.get('frcp'),supplemental=branch(civil.key+'/supplemental','Supplemental Rules',civil,'Official supplemental rules','frcp');
  for(const id of ['admiralty','social-security']){const n=collectionGroups.get(id);root.children=root.children.filter(x=>x!==n);n.parent=supplemental;supplemental.children.push(n);}
  const commercial=collectionGroups.get('ucc'),directory=collectionGroups.get('ucc-articles'),articles=directory.children.slice(),assigned=commercial.children.slice();commercial.children=[];
  for(const overview of articles){const number=overview.entry.id.replace('ucc-article-',''),n=assigned.find(x=>x.key.endsWith('/article-'+number))||branch(commercial.key+'/article-'+number,overview.title,commercial,'UCC article directory','ucc');if(!commercial.children.includes(n))commercial.children.push(n);n.parent=commercial;n.title=overview.title;n.range=overview.label;overview.parent=n;n.children.unshift(overview);}
  directory.children=[];root.children=root.children.filter(n=>n!==directory);collectionGroups.set('ucc-articles',commercial);
  root.children.sort((a,b)=>['constitution','frcp','uscode','ucc','restatement','consumer'].indexOf(a.collection)-['constitution','frcp','uscode','ucc','restatement','consumer'].indexOf(b.collection));
  // Index ranges are navigational subdivisions, not invented statutory chapters.
  for(const n of [...groups.values()]){
    if(n.children.length<=24||n.children.some(x=>x.entry))continue;
    const children=n.children.slice();n.children=[];
    for(let i=0;i<children.length;i+=8){const set=children.slice(i,i+8),first=set[0].title.split(' — ')[0],last=set[set.length-1].title.split(' — ')[0],a=first.match(/^CHAPTER\s+(\w+)/),b=last.match(/^CHAPTER\s+(\w+)/),label=a&&b?`Chapters ${a[1]}–${b[1]}`:`${first} – ${last}`,range=branch(n.key+'/index-'+i,label,n,'Index range',n.collection);range.children=set;set.forEach(x=>x.parent=range);}
  }
  function tally(n){n.count=n.entry?1:n.children.reduce((sum,c)=>sum+tally(c),0);return n.count;}tally(root);
  const readingOrder=new Map();(function collect(n){if(n.entry){const id=n.entry.collection;if(!readingOrder.has(id))readingOrder.set(id,[]);readingOrder.get(id).push(n.entry);}else n.children.forEach(collect);})(root);
  const panel=document.getElementById('inspector'),active=()=>S.scope===TITLE,current=()=>{
    const group=groups.get(S.region);if(group?.children.length)return group;
    // Earlier releases used numbered reading ranges. Preserve a restored
    // provision's location when those private range IDs become chapters.
    if(selected?.type==='authority'&&leaves.has(selected.id))return leaves.get(selected.id).parent;
    if(S.region?.startsWith(PREFIX)){const collection=S.region.slice(PREFIX.length).split('/')[0];return collectionGroups.get(collection)||root;}
    return root;
  };
  const selectedEntry=()=>selected?.type==='authority'?byId.get(selected.id):null;
  function ancestors(n){const out=[];while(n){out.unshift(n);n=n.parent;}return out;}
  let geometryCache=null;
  function anchor(){
    const scotus=window.DKLAScotusBox||{x:-11400,y:10400,w:22800,h:4200},b=window.DKLAGeography?.bounds?.(),narrow=rect().w<700;
    const bottom=Math.max(scotus.y+scotus.h,b&&Number.isFinite(b.y+b.h)?b.y+b.h:0),w=narrow?Math.min(scotus.w,15200):scotus.w;
    Object.assign(BOX,{x:scotus.x+(scotus.w-w)/2,y:bottom+900,w,h:narrow?9900:11000});return BOX;
  }
  function geometry(n=current(),overview=false){
    anchor();const narrow=rect().w<700,key=n.key+':'+narrow+':'+overview+':'+BOX.x+':'+BOX.y+':'+BOX.w;if(geometryCache?.key===key)return geometryCache;
    const cover=n===root,mobileCover=cover&&narrow&&!overview,leafLevel=n.children.every(c=>c.entry),cols=cover?(mobileCover?1:narrow?2:3):narrow?1:n.children.length===1?1:n.children.length<=4?2:3;
    const width=mobileCover?1150:cover?BOX.w:narrow?1150:3600,unit=cover&&!mobileCover?width/3600:1,gap=(narrow?48:72)*unit,pad=(narrow?72:110)*unit;
    const header=(cover?260:n.collection==='constitution'&&n===collectionGroups.get('constitution')?430:230)*unit;
    const w=(width-pad*2-gap*(cols-1))/cols,h=(mobileCover?820:cover?600:leafLevel?360:560)*unit;
    if(n===collectionGroups.get('constitution')){
      const cards=new Map(),[preamble,articles,amendments]=n.children,contentW=width-pad*2,stripH=narrow?520:270,groupH=narrow?730:740;
      cards.set(preamble.key,{x:BOX.x+pad,y:BOX.y+header,w:contentW,h:stripH,node:preamble,unit:1});
      for(const [i,c]of [articles,amendments].entries())cards.set(c.key,{x:BOX.x+pad+(narrow?0:i*(contentW+gap)/2),y:BOX.y+header+stripH+gap+(narrow?i*(groupH+gap):0),w:narrow?contentW:(contentW-gap)/2,h:groupH,node:c,unit:1});
      const box={x:BOX.x,y:BOX.y,w:width,h:header+stripH+gap+(narrow?2*groupH+gap:groupH)+pad};geometryCache={key,box,cards,fit:{...box},unit:1,cols:narrow?1:2};return geometryCache;
    }
    const cards=new Map(n.children.map((c,i)=>[c.key,{x:BOX.x+pad+(i%cols)*(w+gap),y:BOX.y+header+Math.floor(i/cols)*(h+gap),w,h,node:c,cover,unit}]));
    const box={x:BOX.x,y:BOX.y,w:width,h:header+Math.ceil(n.children.length/cols)*(h+gap)+pad};
    const initialRows=mobileCover?2:cover?Math.ceil(n.children.length/cols):3,fit={...box,h:Math.min(box.h,header+Math.min(initialRows,Math.ceil(n.children.length/cols))*(h+gap)+pad)};
    geometryCache={key,box,cards,fit,unit,cols};return geometryCache;
  }
  function synthetic(id){const n=groups.get(id);if(!n)return null;return {...(active()&&n===current()?geometry(n).box:anchor()),id:n.key,title:n.title,color:'#597786',courseKey:TITLE,districtIds:[],special:'authority'};}
  const oldRegionFor=regionFor;regionFor=function(id){return synthetic(id)||oldRegionFor(id);};
  const oldGalaxy=galaxy;galaxy=function(...args){const g=oldGalaxy.apply(this,args),b=anchor();return {...g,box:bounds([g.box,{x:b.x-150,y:b.y-150,w:b.w+300,h:b.h+300}])};};
  const oldScopeBox=scopeBox;scopeBox=function(...args){return active()?geometry().box:oldScopeBox.apply(this,args);};
  const oldHome=home;home=function(scope,...args){if(scope===TITLE)return openGroup(ROOT);return oldHome(scope,...args);};
  const oldGoRegion=goRegion;goRegion=function(id,...args){if(groups.has(id))return openGroup(id);return oldGoRegion(id,...args);};
  const oldGoNode=goNode;goNode=function(id,...args){if(id?.startsWith(PREFIX)&&byId.has(id.slice(PREFIX.length)))return open(id.slice(PREFIX.length));return oldGoNode(id,...args);};
  const oldHeading=renderHeading;renderHeading=function(...args){
    if(!active())return oldHeading.apply(this,args);
    document.getElementById('courseHome').textContent=TITLE;
    document.getElementById('geoBreadcrumb').innerHTML='<button data-study-scope="Atlas">Atlas</button>'+ancestors(current()).map(n=>`<span>›</span><button data-authority-group="${esc(n.key)}">${esc(n.title)}</button>`).join('');
    document.getElementById('studyBack').disabled=!S.history.length;document.getElementById('mapWelcome').hidden=true;
  };
  function source(e){const s=e.source;return `<details class="authority-provenance" id="authoritySource"><summary>Source and edition</summary><p>${esc(s.name)}${s.edition?` · ${esc(s.edition)}`:''}${s.read?` · checked ${esc(s.read)}`:''}</p>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">Open source ↗</a>`:''}${s.official?` <a href="${esc(s.official)}" target="_blank" rel="noopener">${e.collection==='uscode'?'Pinned official release ↗':'Official rules volume ↗'}</a>`:''}${s.file?`<button type="button" data-dkla-file="${esc(s.file)}">Open assigned source page ↗</button>`:''}<p>Connections identify an explicit citation or an existing atlas relationship. They do not claim that every linked case decided every part of this provision.</p></details>`;}
  function annotation(a){return typeof a==='string'?`<p>${esc(a)}</p>`:`${a.title?`<h4>${esc(a.title)}</h4>`:''}${(a.lines||[]).map(l=>`<p style="--authority-indent:${Math.min(l[0],3)}">${esc(l[1])}</p>`).join('')}`;}
  function provisionHTML(e){
    const group=readingOrder.get(e.collection)||[],n=group.findIndex(x=>x.id===e.id);
    const anchors=e.lines.map((l,i)=>l[2]==='heading'?{i,text:l[1]}:l[0]===0&&/^\([a-z0-9]+\)\s/.test(l[1])?{i,text:l[1].match(/^\([a-z0-9]+\)/)[0]}:null).filter(Boolean);
    const links=e.links||[],li=l=>`<li><button type="button" data-study-node="${esc(l.id)}" title="${esc(l.basis)}" aria-description="${esc(l.basis)}">${esc(l.title)}</button></li>`;
    const assigned=e.filter?D.entries.filter(x=>x.id.startsWith(e.filter)):[];
    return `<article class="authority-reading"><header><h2>${esc(e.cite)}${e.title!==e.cite?`<span>${esc(e.title)}</span>`:''}</h2>${status[e.status]?`<p class="authority-status">${esc(status[e.status])}</p>`:''}${e.note?`<p class="authority-note">${esc(e.note)}</p>`:''}</header>${anchors.length?`<nav class="authority-subsections" aria-label="Sections in this provision">${anchors.map(a=>`<button type="button" data-authority-anchor="authority-line-${a.i}">${esc(a.text)}</button>`).join('')}</nav>`:''}<div class="authority-text">${e.lines.map((l,i)=>l[2]==='heading'?`<h3 id="authority-line-${i}">${esc(l[1])}</h3>`:`<p id="authority-line-${i}" style="--authority-indent:${Math.min(l[0],3)}">${esc(l[1])}</p>`).join('')}</div>${e.annotations?.length?`<details class="authority-provenance" id="authorityNotes"><summary>${e.collection==='uscode'?'Effective dates and statutory notes':'Assigned source editorial notes'}</summary>${e.annotations.map(annotation).join('')}</details>`:''}${e.related?.length?`<section class="authority-related"><h3>Read alongside</h3>${e.related.filter(x=>byId.has(x)).map(x=>`<button type="button" data-authority-open="${esc(x)}">${esc(entryName(byId.get(x)))}</button>`).join('')}</section>`:''}${assigned.length?`<button type="button" data-authority-group="${esc(collectionGroups.get('ucc').key+'/article-'+e.filter.split('-')[1])}">Explore assigned sections in this article</button>`:''}${links.length?`<section class="authority-case-links"><div class="related-heading"><h3>Connected atlas entries</h3><button type="button" data-authority-connections>See on map</button></div><ul>${links.slice(0,8).map(li).join('')}</ul>${links.length>8?`<details id="authorityAllLinks"><summary>Remaining ${links.length-8} connections</summary><ul>${links.slice(8).map(li).join('')}</ul></details>`:''}</section>`:''}${source(e)}<nav class="authority-next" aria-label="Read in order"><button type="button" data-authority-open="${esc(group[n-1]?.id||'')}"${n===0?' disabled':''}>← Previous</button><button type="button" data-authority-open="${esc(group[n+1]?.id||'')}"${n===group.length-1?' disabled':''}>Next →</button></nav></article>`;
  }
  const oldInspector=renderInspector;renderInspector=function(...args){const e=selectedEntry();if(!active()||!e)return oldInspector.apply(this,args);if(!S.panelOpen){panel.innerHTML='';return;}panel.innerHTML=readerChrome(provisionHTML(e),'Source rule');panel.scrollTop=0;wireReader();};
  function prepare(){if(window.SCOTUSHistory?.state?.().open)window.SCOTUSHistory.close();if(typeof dismissMenu==='function')dismissMenu();document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
  function openGroup(key,save=true){const n=groups.get(key);if(!n)return;prepare();if(save)remember();selected=null;S.connectionsExpanded=false;S.connectionOverview=false;S.district=null;setReader(false);closeSearch();S.scope=TITLE;S.region=n.key;geometryCache=null;renderInspector();renderHeading();fitBox(geometry(n).fit,true,22,.95);}
  function open(id,collection){
    if(!id||!byId.has(id))return openGroup(collectionGroups.get(collection)?.key||ROOT);
    prepare();remember();const node=leaves.get(id);if(!node)return;S.scope=TITLE;S.region=node.parent.key;S.district=null;selected={type:'authority',id};
    S.connectionsExpanded=false;S.connectionOverview=false;setReader(true);closeSearch();geometryCache=null;renderInspector();renderHeading();
    const card=geometry().cards.get(node.key);fitBox({x:card.x-50,y:card.y-140,w:card.w+100,h:card.h+250},true,22,1.05);
  }
  function caseTiles(e){
    const card=geometry().cards.get(PREFIX+e.id);if(!card)return [];const narrow=rect().w<700;
    return (e.links||[]).slice(0,6).map((link,i)=>({x:narrow?card.x:card.x+card.w+230,y:narrow?card.y+card.h+150+i*320:card.y+i*230,w:narrow?card.w:1000,h:narrow?260:190,link}));
  }
  function showConnections(){const e=selectedEntry();if(!e)return;remember();S.connectionsExpanded=true;setReader(false);renderInspector();renderHeading();fitBox(bounds([geometry().cards.get(PREFIX+e.id),...caseTiles(e)]),true,40,1.05);}
  function rows(value,width,fs,weight,max){
    const lines=typeof wrapM==='function'?wrapM(value,width,fs,weight,max):[String(value)];
    // Native fit.js attaches scale/squeeze to this array. Mapping or measuring
    // at the original font size discards that fit and cuts valid source text.
    if(typeof wrapM!=='function'&&typeof measure==='function'&&measure(lines[0],fs,weight)>width)lines.squeeze=width;
    return lines;
  }
  function text(lines,x,y,fs,color,weight=500,cls=''){
    const size=fs*(lines.scale||1);return lines.map((line,i)=>{
      const squeeze=lines.squeeze&&typeof measure==='function'&&measure(line,size,weight)>lines.squeeze?` textLength="${lines.squeeze}" lengthAdjust="spacingAndGlyphs"`:'';
      return `<text${cls?` class="${cls}"`:''} x="${x}" y="${y+i*size*1.25}" font-size="${size}" font-weight="${weight}" fill="${color}"${squeeze} pointer-events="none">${esc(line)}</text>`;
    }).join('');
  }
  function skin(n){while(n){if(skins[n.collection])return skins[n.collection];n=n.parent;}return{ink:'#d1dedb',edge:'#82aaa4',base:'#172e31',paper:'#223b3d',mark:'code'};}
  function identity(n,x,y,size){
    const s=skin(n),paths={
      constitution:'M18 6H68L84 22V92H18Z M68 6V22H84 M30 38H71 M30 50H71 M30 62H64 M30 76Q42 69 54 77T74 74',
      procedure:'M14 16H39V38H14Z M62 16H87V38H62Z M14 63H39V85H14Z M62 63H87V85H62Z M39 27H62 M75 38V63 M62 74H39',
      code:'M10 30L50 9 90 30Z M14 37H86 M19 83H81 M11 91H89 M24 42V77 M42 42V77 M60 42V77 M78 42V77',
      commerce:'M13 28L48 9 83 28 48 47Z M13 28V70L48 91 83 70V28 M48 47V91 M30 19L65 38 M89 50H97 M89 64H97',
      restatement:'M9 20Q29 10 49 20V89Q29 79 9 89Z M49 20Q69 10 89 20V89Q69 79 49 89Z M18 34H39 M59 34H80 M18 48H39 M59 48H80 M18 62H39 M59 62H80',
      consumer:'M21 8H70L83 21V92H21Z M70 8V21H83 M32 38H69 M32 51H60 M33 72L42 81 66 60'
    };
    return `<g class="authority-identity" transform="translate(${x} ${y}) scale(${size/100})" aria-hidden="true" pointer-events="none"><path d="${paths[s.mark]}" fill="none" stroke="${s.ink}" stroke-opacity=".66" stroke-width="2" stroke-linejoin="round"/></g>`;
  }
  function people(x,y,w,h,id){
    if(!peopleAsset)return text(['We the People'],x,y+h*.72,h*.58,'#c5e5d8',500,'authority-people-fallback');
    return `<defs><mask id="${id}" mask-type="alpha" style="mask-type:alpha" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><image href="${esc(peopleAsset)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/></mask></defs><rect class="authority-people-mark" x="${x}" y="${y}" width="${w}" height="${h}" fill="#c2e3d5" mask="url(#${id})" role="img" aria-label="We the People" pointer-events="none"/>`;
  }
  function display(n){return n.title.replace(/^(?:PART|Part|CHAPTER|Title)\s+[\w]+\s*[—–·-]\s*/,'').replace(/^[IVX]+\s*·\s*/,'').replace(/\s+/g,' ');}
  function code(n){if(n.entry){const e=n.entry;if(e.id==='const-preamble')return '';if(e.id.startsWith('const-'))return e.cite.replace(/^(Article|Amendment) /,'');if(e.collection==='restatement')return '§ '+e.id.split('-')[1];if(e.collection==='consumer')return '§ '+e.id.split('-')[1];if(e.collection==='uscode')return '§ '+e.section;if(e.collection==='ucc')return '§ '+e.id.replace('ucc-','');return e.cite;}
    if(n.number)return String(n.number).padStart(2,'0');return (n.range?.replace(/^Amendments /,'')||n.title.match(/^(?:Title|CHAPTER|PART)\s+([\w]+)/)?.[0]||n.title.match(/^[IVX]+\s*·/)?.[0].replace(' ·','')||'');}
  function preview(n,box,s,index){
    const z=S.z,u=box.unit||1,fs=Math.max(23*u,11.5/z),pad=16*u,codeText=code(n),badgeW=codeText?Math.min(box.w*.34,Math.max(70*u,codeText.length*fs*.55+pad)):0;
    const attrs=n.entry?`data-map-jump="${esc(n.key)}"`:`data-map-region="${esc(n.key)}"`,title=n.entry?.status==='article-index'?'Article overview':display(n),label=n.entry?'Read '+entryName(n.entry):'Explore '+n.title;
    return `<g class="authority-preview" ${attrs} role="button" tabindex="0" aria-label="${esc(label)}"><title>${esc(label)}</title><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="${9*u}" fill="${s.paper}" stroke="${s.edge}" stroke-opacity=".3" stroke-width="${.65/z}"/>${codeText?text(rows(codeText,badgeW-pad,fs*.82,550,1),box.x+pad,box.y+box.h*.6,fs*.82,s.ink,550,'authority-preview-code'):''}${text(rows(title,box.w-badgeW-pad*2-fs,fs,450,1),box.x+pad+badgeW,box.y+box.h*.62,fs,'#dce5e3',450)}<path d="m${box.x+box.w-pad-fs*.3} ${box.y+box.h*.4} ${fs*.3} ${fs*.2} -${fs*.3} ${fs*.2}" stroke="${s.ink}" stroke-width="${.8/z}" fill="none" pointer-events="none"/></g>`;
  }
  function tile(card,overview=false){
    const n=card.node,e=n.entry,z=S.z,u=card.unit||1,pad=30*u,chosen=e&&selectedEntry()?.id===e.id,s=skin(n),dense=!overview||card.w*z>210;
    const attrs=e?`data-map-jump="${esc(n.key)}"`:`data-map-region="${esc(n.key)}"`,fs=Math.max((card.cover?36:34)*u,(overview?11:16)/z),small=Math.max(22*u,(overview?9:12)/z);
    const clip='authority-clip-'+n.key.replace(/[^a-zA-Z0-9]/g,c=>'_'+c.charCodeAt(0).toString(16));
    let out=`<g class="authority-map-tile${e?' authority-map-provision':''}${card.cover?' authority-volume-cover':''}${chosen?' is-selected':''}" data-authority-collection="${esc(n.collection)}" ${attrs} role="${e?'button':'group'}"${e?' tabindex="0"':''} aria-label="${esc(e?'Read '+entryName(e):n.title)}"><title>${esc(e?entryName(e):n.title+' · '+n.count+' provisions')}</title><rect class="authority-cover-bg" x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" rx="${18*u}" fill="${chosen?s.paper:s.base}" stroke="${chosen?'#eee0bf':s.edge}" stroke-opacity=".85" stroke-width="${(chosen?2:1)/z}"/><path d="M${card.x+12*u} ${card.y+20*u}V${card.y+card.h-20*u}" stroke="${s.edge}" stroke-opacity=".65" stroke-width="${6*u}" pointer-events="none"/><path d="M${card.x+pad} ${card.y+14*u}H${card.x+card.w-pad}M${card.x+pad} ${card.y+card.h-14*u}H${card.x+card.w-pad}" stroke="${s.edge}" stroke-opacity=".25" stroke-width="${.7/z}" pointer-events="none"/><defs><clipPath id="${clip}"><rect x="${card.x+pad}" y="${card.y+20*u}" width="${card.w-pad*2}" height="${card.h-40*u}"/></clipPath></defs><g clip-path="url(#${clip})">`;
    if(!e)out+=`<g class="authority-title-control" ${attrs} role="button" tabindex="0" aria-label="${esc('Explore '+n.title)}">`;
    let y=card.y+pad,headingWidth=card.w-pad*2;
    if(card.cover&&n.collection==='constitution'){
      const h=card.h*(dense?.27:.4);out+=people(card.x+pad,y,headingWidth,h,clip+'-people');y+=h+small*1.4;
      out+=text(['U.S. Constitution'],card.x+pad,y,small,s.ink,550,'authority-document-label');y+=small*1.4;
    }else{
      const iconSize=(card.cover?100:55)*u;out+=identity(n,card.x+card.w-pad-iconSize,y,iconSize);headingWidth-=iconSize+pad*.5;
      if(code(n)&&!card.cover){out+=text(rows(code(n),headingWidth,small,550,1),card.x+pad,y+small,small,s.ink,550,'authority-preview-code');y+=small*1.55;}
      const heading=rows(display(n),headingWidth,fs,500,e?3:3);out+=text(heading,card.x+pad,y+fs,fs,'#edeae3',500,'authority-volume-title');y+=fs*(heading.length*1.25)+pad*.6;
    }
    if(!e)out+=`<rect x="${card.x+pad}" y="${card.y+20*u}" width="${card.w-pad*2}" height="${Math.max(40*u,y-card.y-20*u)}" fill="transparent" pointer-events="all"/></g>`;
    if(!dense)return out+'</g></g>';
    if(!e){
      const available=card.y+card.h-pad-y,shown=n.children.slice(0,Math.min(n.key==='authority:constitution/articles'?7:6,n.children.length)),rowGap=9*u,rowH=Math.min(74*u,(available-rowGap*(shown.length-1))/Math.max(1,shown.length));
      if(rowH>small*1.25)shown.forEach((child,i)=>{out+=preview(child,{x:card.x+pad,y:y+i*(rowH+rowGap),w:card.w-pad*2,h:rowH,unit:u},s,i);});
      if(n.children.length>shown.length)out+=text(['···'],card.x+card.w-pad-small*1.3,card.y+card.h-pad*.4,small,s.ink,450);
    }else if(e.id==='const-preamble'){
      const quote=e.lines[0]?.[1]||'',available=card.y+card.h-pad-y;out+=text(rows(quote,card.w-pad*2,small,450,Math.max(1,Math.floor(available/(small*1.25)))),card.x+pad,y+small,small,'#c5d9d0',450,'authority-preamble-excerpt');
    }
    if(e&&status[e.status])out+=text(rows(status[e.status],card.w-pad*2,small*.9,450,1),card.x+pad,card.y+card.h-pad*.6,small*.9,'#d6b789');return out+'</g></g>';
  }
  function ribbon(a,b,color='#8dbbd1',label=''){const p=edgePoint(a,b),q=edgePoint(b,a),span=Math.max(100,Math.abs(q.x-p.x)*.44),w=7/S.z;return `<path class="authority-ribbon" d="${taperedRibbon(p.x,p.y,p.x+span,p.y,q.x-span,q.y,q.x,q.y,w*2.2,w*.35)}" fill="${color}" fill-opacity=".52" pointer-events="none"><title>${esc(label)}</title></path>`;}
  function frame(n,g,overview=false){
    const u=g.unit||1,s=skin(n),z=S.z,fs=Math.max(52*u,(overview?18:22)/z),x=g.box.x,y=g.box.y,w=g.box.w,h=g.box.h;
    let out=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${40*u}" fill="${n===root?'#12282b':s.base}" fill-opacity=".92" stroke="${s.edge}" stroke-opacity=".65" stroke-width="${1.2/z}"/><path d="M${x+40*u} ${y+125*u}V${y+40*u}H${x+150*u}M${x+w-150*u} ${y+h-40*u}H${x+w-40*u}V${y+h-125*u}" fill="none" stroke="${s.ink}" stroke-opacity=".6" stroke-width="${1.2/z}" pointer-events="none"/>`;
    if(n===collectionGroups.get('constitution')){
      const markW=rect().w<700?w-140:Math.min(w*.62,2000);out+=people(x+70,y+12,markW,310,'authority-constitution-masthead');
      out+=text(['U.S. Constitution'],x+75,y+365,Math.max(27,14/z),s.ink,500,'authority-document-label');
    }else{
      out+=text(rows(display(n),w-220*u,fs,550,2),x+90*u,y+95*u,fs,n===root?'#d7e9e2':s.ink,550,'authority-map-heading');
      if(n.range)out+=text([n.range],x+90*u,y+185*u,Math.max(25*u,12/z),s.ink,500,'authority-preview-code');
    }
    return out;
  }
  function paintMap(){
    const n=current(),g=geometry(n),z=S.z,B=visibleBox();svg.setAttribute('viewBox',`${B.x} ${B.y} ${B.w} ${B.h}`);
    let out=`<g class="authority-map-view" data-authority-view="${esc(n.key)}">${frame(n,g)}`;
    if(!selectedEntry()){const origin={x:g.box.x+g.box.w/2,y:g.box.y+(n===root?210*g.unit:195),w:1,h:1};for(const c of g.cards.values())out+=`<g opacity=".36">${ribbon(origin,c,skin(c.node).edge,'')}</g>`;}
    const e=selectedEntry(),source=e&&g.cards.get(PREFIX+e.id),cases=e?caseTiles(e):[];if(source)for(const c of cases)out+=ribbon(source,c,'#8dbbd1',c.link.basis);
    for(const c of g.cards.values())if(intersects(c,B,50))out+=tile(c);
    for(const c of cases)if(intersects(c,B,50)){const cfs=14/z;out+=`<g class="authority-map-case" data-map-jump="${esc(c.link.id)}" role="button" tabindex="0" aria-label="Read ${esc(c.link.title)}"><title>${esc(c.link.basis)}</title><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="22" fill="#263945" stroke="#8dbbd1" stroke-width="${1/z}"/>${text(rows(c.link.title,c.w-70,cfs,550,3),c.x+35,c.y+55,cfs,'#dce6ec',550)}</g>`;}
    svg.innerHTML=out+'</g>';S.paintNodes=[];S.paintEdges=[];R11.starIndex=[];const hint=document.getElementById('mapHint');if(hint)hint.textContent='Click to explore · Scroll between levels · Drag to pan';
  }
  function entrance(){
    if(active()||window.SCOTUSHistory?.state?.().open)return;const g=geometry(root,true),B=visibleBox();if(!intersects(g.box,B,80))return;
    let out=`<g class="authority-map-entrance" data-map-region="${ROOT}" role="group" aria-label="Rules and authorities"><title>Constitution, federal rules, codes and Restatements</title>${frame(root,g,true)}<g class="authority-title-control" data-map-region="${ROOT}" role="button" tabindex="0" aria-label="Explore rules and authorities"><rect x="${g.box.x+60*g.unit}" y="${g.box.y+35*g.unit}" width="${g.box.w-120*g.unit}" height="${160*g.unit}" fill="transparent" pointer-events="all"/></g>`;
    for(const card of g.cards.values())out+=tile(card,true);out+='</g>';
    if(selected?.type==='node'&&D.byNode[selected.id]?.length){const h=homeFor(selected.id);if(h)out=ribbon(h,BOX,'#8dbbd1','Authorities cited by this atlas entry')+out;}svg.insertAdjacentHTML('beforeend',out);
  }
  const oldDraw=draw;draw=function(...args){if(active())return paintMap();return oldDraw.apply(this,args);};
  // The earlier map decorators assume Case/Concept records and would add their
  // own tiles or hide small private text. Commit private geometry last instead.
  if(typeof R18!=='undefined')R18.afterDraw.push(()=>{if(active())paintMap();else entrance();});
  const oldLevel=R11.level;R11.level=function(p){if(active())return {lvl:ancestors(current()).length,authority:current().key};return oldLevel(p);};
  const oldStep=R11.step;R11.step=function(dir,p){
    if(!active())return oldStep(dir,p);
    if(dir<0){if(S.panelOpen){remember();setReader(false);selected=null;renderInspector();renderHeading();fitBox(geometry().fit,true,22,.95);return true;}const n=current();if(n.parent)openGroup(n.parent.key);else home('Atlas');return true;}
    const cards=[...geometry().cards.values()],q=p||mapCenterVisible();const hit=cards.find(c=>q.x>=c.x&&q.x<=c.x+c.w&&q.y>=c.y&&q.y<=c.y+c.h)||cards.reduce((best,c)=>!best||Math.hypot(c.x+c.w/2-q.x,c.y+c.h/2-q.y)<Math.hypot(best.x+best.w/2-q.x,best.y+best.h/2-q.y)?c:best,null);
    if(!hit)return false;if(hit.node.entry)open(hit.node.entry.id);else openGroup(hit.node.key);return true;
  };
  const oldFit=fit;fit=function(...args){if(active()){remember();fitBox(geometry().fit,true,22,.95);return;}return oldFit.apply(this,args);};
  document.getElementById('studyFit').onclick=()=>fit();document.getElementById('studyBack').onclick=()=>back();
  let resizeTimer;new ResizeObserver(()=>{geometryCache=null;if(active()&&!S.drag&&!R11.anim){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(active()&&!S.panelOpen)fitBox(geometry().fit,false,22,.95);else schedule();},120);}}).observe(svg);
  document.addEventListener('click',ev=>{
    const b=ev.target.closest('[data-authority-open],[data-authority-menu],[data-authority-group],[data-authority-anchor],[data-authority-connections]');if(!b)return;ev.preventDefault();ev.stopPropagation();closeSearch();
    if('authorityConnections'in b.dataset)showConnections();else if(b.dataset.authorityAnchor)panel.querySelector('#'+b.dataset.authorityAnchor)?.scrollIntoView({block:'start'});else if(b.dataset.authorityGroup)openGroup(b.dataset.authorityGroup);else open(b.dataset.authorityOpen||null);
  },true);
  if(typeof moreMenu==='function'){const prior=moreMenu;moreMenu=function(...args){const result=prior.apply(this,args),menu=document.getElementById('moreMenu');if(menu&&!menu.hidden&&!menu.querySelector('[data-authority-menu]')){const b=document.createElement('button');b.type='button';b.dataset.authorityMenu='1';b.role='menuitem';b.textContent=TITLE;menu.appendChild(b);}return result;};document.getElementById('moreBtn').onclick=()=>moreMenu();}
  function contextual(){
    if(!panel||panel.hidden)return;const id=selected?.type==='node'?selected.id:null,ids=(D.byNode[id]||[]).filter(x=>byId.has(x));const body=panel.querySelector('.reader-body');if(!body)return;const old=body.querySelector('.authority-context');if(old?.dataset.node===id)return;old?.remove();if(!ids.length)return;
    const el=document.createElement('details');el.className='authority-context';el.dataset.node=id;el.innerHTML=`<summary>Authorities cited <small>${ids.length}</small></summary><div>${ids.map(x=>`<button type="button" data-authority-open="${esc(x)}">${esc(entryName(byId.get(x)))}</button>`).join('')}</div>`;body.appendChild(el);
  }
  if(panel)new MutationObserver(contextual).observe(panel,{childList:true,subtree:true});
  const search=document.getElementById('search'),searchResults=document.getElementById('searchResults');
  if(search&&searchResults)new MutationObserver(()=>{
    if(searchResults.hidden||searchResults.dataset.authorities===search.value)return;searchResults.dataset.authorities=search.value;searchResults.querySelector('.authority-search')?.remove();
    const q=fold(search.value.trim());if(q.length<3)return;const words=q.split(/\s+/),hits=D.entries.filter(e=>words.every(w=>fold([e.cite,e.title].join(' ')).includes(w))).slice(0,5),groupHits=D.collections.filter(c=>words.every(w=>fold(c.title).includes(w))).slice(0,2);if(!hits.length&&!groupHits.length)return;
    const box=document.createElement('div');box.className='r19-search authority-search';box.innerHTML='<div class="search-label">Rules & authorities</div>'+groupHits.map(c=>`<button type="button" data-authority-group="${esc(collectionGroups.get(c.id).key)}"><strong>${esc(c.title)}</strong><small>Explore the collection on the atlas</small></button>`).join('')+hits.map(e=>`<button type="button" data-authority-open="${esc(e.id)}"><strong>${esc(entryName(e))}</strong><small>${esc(collections.get(e.collection).title)}</small></button>`).join('');searchResults.appendChild(box);
  }).observe(searchResults,{childList:true});
  window.DKLAAuthorities={open,group:openGroup,data:D,version:2,geography:()=>({entrance:{...BOX,id:ROOT},route:ancestors(current()).map(n=>({id:n.key,title:n.title})),groupCount:groups.size,provisionCount:leaves.size,children:current().children.map(n=>({id:n.key,title:n.title,cite:n.label,count:n.count,provision:n.entry?.id||null})),view:{scope:S.scope,region:S.region,selected:selected?{...selected}:null}})};
  schedule();
})();
