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
  const BOX={x:-1700,y:4400,w:2400,h:1700};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=s=>String(s).toLowerCase().replace(/u\.?\s*s\.?\s*c\.?/g,'usc').replace(/\b(rule|restatement|ucc)(\d)/g,'$1 $2');
  const byId=new Map(D.entries.map(e=>[e.id,e])),collections=new Map(D.collections.map(c=>[c.id,c]));
  const groups=new Map(),leaves=new Map(),collectionGroups=new Map();
  const status={abrogated:'Abrogated',repealed:'Repealed',renumbered:'Renumbered',omitted:'Omitted',transferred:'Transferred',reserved:'Reserved','index-only':'Index only','deleted-model-section':'Deleted model section','article-index':'Article directory'};
  const accent=['#e7b078','#86bfff','#8dc8b1'];
  function branch(key,title,parent,description='',collection=''){
    const n={key,title,parent,description,collection,children:[],count:0};groups.set(key,n);if(parent)parent.children.push(n);return n;
  }
  function leaf(e,parent){const n={key:PREFIX+e.id,title:e.title,label:e.cite,parent,collection:e.collection,entry:e,count:1};parent.children.push(n);leaves.set(e.id,n);return n;}
  const entryName=e=>e.cite===e.title?e.cite:e.cite+' · '+e.title;
  function shortNumber(e){return e.section||e.cite.replace(/^.*(?:§ |Rule |Article |Amendment )/,'');}
  function chunk(parent,entries,size=8,label='Sections'){
    for(let i=0;i<entries.length;i+=size){const part=entries.slice(i,i+size),n=branch(parent.key+'/range-'+i,`${label} ${shortNumber(part[0])}–${shortNumber(part[part.length-1])}`,parent,'Numbered reading range',parent.collection);part.forEach(e=>leaf(e,n));}
  }
  function file(parent,entries,label='Sections'){if(entries.length>10)chunk(parent,entries,8,label);else entries.forEach(e=>leaf(e,parent));}
  function keyed(entries,key){const out=new Map();for(const e of entries){const k=key(e);if(!out.has(k))out.set(k,[]);out.get(k).push(e);}return out;}
  const root=branch(ROOT,TITLE,null);
  const titleNames={3:'The President',5:'Government Organization and Employees',9:'Arbitration',12:'Banks and Banking',15:'Commerce and Trade',18:'Crimes and Criminal Procedure',21:'Food and Drugs',26:'Internal Revenue Code',28:'Judiciary and Judicial Procedure',29:'Labor',42:'The Public Health and Welfare',46:'Shipping'};
  const ruleTitles=[
    [1,2,'I · Scope of Rules; Form of Action'],[3,6,'II · Commencing an Action; Service of Process, Pleadings, Motions, and Orders'],
    [7,16.1,'III · Pleadings and Motions'],[17,25,'IV · Parties'],[26,37,'V · Disclosures and Discovery'],[38,53,'VI · Trials'],
    [54,63,'VII · Judgment'],[64,71.1,'VIII · Provisional and Final Remedies'],[72,76,'IX · Special Proceedings'],
    [77,80,'X · District Courts and Clerks'],[81,87,'XI · General Provisions']
  ];
  const uccParts={1:['General Provisions','General Definitions and Principles of Interpretation','Territorial Applicability and General Rules'],2:['Short Title, General Construction and Subject Matter','Form, Formation and Readjustment of Contract','General Obligation and Construction of Contract','Title, Creditors and Good Faith Purchasers','Performance','Breach, Repudiation and Excuse','Remedies']};
  for(const c of D.collections){
    const es=D.entries.filter(e=>e.collection===c.id),parent=branch(PREFIX+c.id,c.title,root,c.description,c.id);collectionGroups.set(c.id,parent);
    if(c.id==='constitution'){
      es.filter(e=>e.id==='const-preamble').forEach(e=>leaf(e,parent));
      const articles=branch(parent.key+'/articles','Articles I–VII',parent,'Original constitutional articles',c.id);es.filter(e=>e.id.startsWith('const-art-')).forEach(e=>leaf(e,articles));
      const amendments=branch(parent.key+'/amendments','Amendments I–XXVII',parent,'Ratified amendments, in order',c.id);chunk(amendments,es.filter(e=>e.id.startsWith('const-amend-')),9,'Amendments');
    }else if(c.id==='frcp'){
      for(const [lo,hi,label]of ruleTitles){
        const members=es.filter(e=>{const n=Number(e.id.replace('frcp-','').replace('71A','71.05'));return n>=lo&&n<=hi;});
        if(lo===81)members.push(...es.filter(e=>e.id==='frcp-forms'));
        const n=branch(parent.key+'/title-'+lo,label,parent,'Official FRCP title',c.id);file(n,members,'Rules');
      }
    }else if(c.id==='uscode'){
      for(const [title,ts]of keyed(es,e=>e.titleNumber)){
        const tn=branch(parent.key+'/title-'+title,`Title ${title} · ${titleNames[title]||'United States Code'}`,parent,Number(title)===28||Number(title)===9?'Complete title':'Course-relevant provisions',c.id);
        for(const [part,ps]of keyed(ts,e=>e.part||'')){
          const pn=part?branch(tn.key+'/part-'+tn.children.length,part,tn,'Official statutory part',c.id):tn;
          for(const [chapter,cs]of keyed(ps,e=>e.chapter||'')){const cn=chapter?branch(pn.key+'/chapter-'+pn.children.length,chapter,pn,'Official statutory chapter',c.id):pn;file(cn,cs);}
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
      for(let start=1;start<=385;start+=40){const members=es.filter(e=>{const n=Number(e.id.replace('restatement-',''));return n>=start&&n<start+40;}),n=branch(parent.key+'/range-'+start,`Sections ${start}–${Math.min(385,start+39)}`,parent,'Numbered reading range; not an official chapter',c.id);chunk(n,members);}
    }else file(parent,es,c.id==='ucc-articles'?'Articles':'Rules');
  }
  // Index ranges are navigational subdivisions, not invented statutory chapters.
  for(const n of [...groups.values()]){
    if(n.children.length<=12||n.children.some(x=>x.entry))continue;
    const children=n.children.slice();n.children=[];
    for(let i=0;i<children.length;i+=8){const set=children.slice(i,i+8),first=set[0].title.split(' — ')[0],last=set[set.length-1].title.split(' — ')[0],a=first.match(/^CHAPTER\s+(\w+)/),b=last.match(/^CHAPTER\s+(\w+)/),label=a&&b?`Chapters ${a[1]}–${b[1]}`:`${first} – ${last}`,range=branch(n.key+'/index-'+i,label,n,'Index range',n.collection);range.children=set;set.forEach(x=>x.parent=range);}
  }
  function tally(n){n.count=n.entry?1:n.children.reduce((sum,c)=>sum+tally(c),0);return n.count;}tally(root);
  const panel=document.getElementById('inspector'),active=()=>S.scope===TITLE,current=()=>groups.get(S.region)||root;
  const selectedEntry=()=>selected?.type==='authority'?byId.get(selected.id):null;
  function ancestors(n){const out=[];while(n){out.unshift(n);n=n.parent;}return out;}
  let geometryCache=null;
  function anchor(){const dictionary=oldRegionFor('dictionary-region');if(dictionary)Object.assign(BOX,{x:dictionary.x,y:dictionary.y+dictionary.h+400,w:dictionary.w});return BOX;}
  function geometry(n=current()){
    anchor();const narrow=rect().w<700,key=n.key+':'+narrow+':'+BOX.x+':'+BOX.y;if(geometryCache?.key===key)return geometryCache;
    const leafLevel=n.children.every(c=>c.entry),cols=narrow?(leafLevel||n.children.length<=3?1:2):n.children.length<=4?2:3;
    const width=narrow?1100:2400,gap=narrow?45:70,pad=narrow?70:100,header=narrow?210:230;
    const w=(width-pad*2-gap*(cols-1))/cols,h=narrow?(leafLevel?330:500):(leafLevel?300:460);
    const cards=new Map(n.children.map((c,i)=>[c.key,{x:BOX.x+pad+(i%cols)*(w+gap),y:BOX.y+header+Math.floor(i/cols)*(h+gap),w,h,node:c}]));
    const box={x:BOX.x,y:BOX.y,w:width,h:header+Math.ceil(n.children.length/cols)*(h+gap)+pad};
    geometryCache={key,box,cards};return geometryCache;
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
    const group=D.entries.filter(x=>x.collection===e.collection),n=group.findIndex(x=>x.id===e.id);
    const anchors=e.lines.map((l,i)=>l[2]==='heading'?{i,text:l[1]}:l[0]===0&&/^\([a-z0-9]+\)\s/.test(l[1])?{i,text:l[1].match(/^\([a-z0-9]+\)/)[0]}:null).filter(Boolean);
    const links=e.links||[],li=l=>`<li><button type="button" data-study-node="${esc(l.id)}" title="${esc(l.basis)}" aria-description="${esc(l.basis)}">${esc(l.title)}</button></li>`;
    const assigned=e.filter?D.entries.filter(x=>x.id.startsWith(e.filter)):[];
    return `<article class="authority-reading"><header><h2>${esc(e.cite)}${e.title!==e.cite?`<span>${esc(e.title)}</span>`:''}</h2>${status[e.status]?`<p class="authority-status">${esc(status[e.status])}</p>`:''}${e.note?`<p class="authority-note">${esc(e.note)}</p>`:''}</header>${anchors.length?`<nav class="authority-subsections" aria-label="Sections in this provision">${anchors.map(a=>`<button type="button" data-authority-anchor="authority-line-${a.i}">${esc(a.text)}</button>`).join('')}</nav>`:''}<div class="authority-text">${e.lines.map((l,i)=>l[2]==='heading'?`<h3 id="authority-line-${i}">${esc(l[1])}</h3>`:`<p id="authority-line-${i}" style="--authority-indent:${Math.min(l[0],3)}">${esc(l[1])}</p>`).join('')}</div>${e.annotations?.length?`<details class="authority-provenance" id="authorityNotes"><summary>${e.collection==='uscode'?'Effective dates and statutory notes':'Assigned source editorial notes'}</summary>${e.annotations.map(annotation).join('')}</details>`:''}${e.related?.length?`<section class="authority-related"><h3>Read alongside</h3>${e.related.filter(x=>byId.has(x)).map(x=>`<button type="button" data-authority-open="${esc(x)}">${esc(entryName(byId.get(x)))}</button>`).join('')}</section>`:''}${assigned.length?`<button type="button" data-authority-group="${esc(collectionGroups.get('ucc').key+'/article-'+e.filter.split('-')[1])}">Explore assigned sections in this article</button>`:''}${links.length?`<section class="authority-case-links"><div class="related-heading"><h3>Connected atlas entries</h3><button type="button" data-authority-connections>See on map</button></div><ul>${links.slice(0,8).map(li).join('')}</ul>${links.length>8?`<details id="authorityAllLinks"><summary>Remaining ${links.length-8} connections</summary><ul>${links.slice(8).map(li).join('')}</ul></details>`:''}</section>`:''}${source(e)}<nav class="authority-next" aria-label="Read in order"><button type="button" data-authority-open="${esc(group[n-1]?.id||'')}"${n===0?' disabled':''}>← Previous</button><button type="button" data-authority-open="${esc(group[n+1]?.id||'')}"${n===group.length-1?' disabled':''}>Next →</button></nav></article>`;
  }
  const oldInspector=renderInspector;renderInspector=function(...args){const e=selectedEntry();if(!active()||!e)return oldInspector.apply(this,args);if(!S.panelOpen){panel.innerHTML='';return;}panel.innerHTML=readerChrome(provisionHTML(e),'Source rule');panel.scrollTop=0;wireReader();};
  function prepare(){if(window.SCOTUSHistory?.state?.().open)window.SCOTUSHistory.close();if(typeof dismissMenu==='function')dismissMenu();document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
  function openGroup(key,save=true){const n=groups.get(key);if(!n)return;prepare();if(save)remember();selected=null;S.connectionsExpanded=false;S.connectionOverview=false;S.district=null;setReader(false);closeSearch();S.scope=TITLE;S.region=n.key;geometryCache=null;renderInspector();renderHeading();fitBox(geometry(n).box,true,22,.95);}
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
    return lines.map(line=>{if(typeof measure!=='function')return line;let cut=String(line);if(measure(cut,fs,weight)<=width)return cut;while(cut.length&&measure(cut+'…',fs,weight)>width)cut=cut.slice(0,-1);return cut.trimEnd()+'…';});
  }
  function text(lines,x,y,fs,color,weight=500){return lines.map((line,i)=>`<text x="${x}" y="${y+i*fs*1.25}" font-size="${fs}" font-weight="${weight}" fill="${color}" pointer-events="none">${esc(line)}</text>`).join('');}
  function tile(card){
    const n=card.node,e=n.entry,z=S.z,pad=35,chosen=e&&selectedEntry()?.id===e.id,color=accent[collections.get(n.collection)?.course]||'#a8c5d3';
    const attrs=e?`data-map-jump="${esc(n.key)}"`:`data-map-region="${esc(n.key)}"`,fs=Math.min(48,Math.max(25,14/z)),small=fs*.83;
    const lines=rows(n.title,card.w-pad*2,fs,600,e?3:4),top=card.y+pad+(e?small:fs);
    const clip='authority-clip-'+n.key.replace(/[^a-zA-Z0-9]/g,c=>'_'+c.charCodeAt(0).toString(16));
    let out=`<g class="authority-map-tile${e?' authority-map-provision':''}${chosen?' is-selected':''}" ${attrs} role="button" tabindex="0" aria-label="${esc(e?'Read '+entryName(e):'Explore '+n.title)}"><title>${esc(e?entryName(e):n.title+' · '+n.count+' provisions')}</title><rect x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" rx="18" fill="${chosen?'#304550':'#1c2d36'}" stroke="${chosen?'#eee0bf':color}" stroke-opacity="${chosen?1:.6}" stroke-width="${(chosen?2:1)/z}"/><defs><clipPath id="${clip}"><rect x="${card.x+pad}" y="${card.y+20}" width="${card.w-pad*2}" height="${card.h-40}"/></clipPath></defs><g clip-path="url(#${clip})">`;
    if(e&&e.cite!==e.title)out+=text(rows(e.cite,card.w-pad*2,small,500,1),card.x+pad,top,small,color);
    out+=text(lines,card.x+pad,top+(e&&e.cite!==e.title?fs*1.5:0),fs,'#eeeae2',600);
    const y=top+fs*(lines.length*1.25+(e?2:1));
    if(!e&&card.h>(y-card.y)+fs*1.8){const preview=n.children.slice(0,2).map(c=>c.entry?c.label:c.title);out+=`<rect x="${card.x+pad}" y="${y-fs*.7}" width="${card.w-pad*2}" height="${Math.min(card.h-(y-card.y)-25,fs*3.3)}" rx="10" fill="#13212a" stroke="${color}" stroke-opacity=".25" stroke-width="${.7/z}"/>`;preview.forEach((p,i)=>{out+=text(rows(p,card.w-pad*3,small,400,1),card.x+pad*1.4,y+i*small*1.6,small,'#b6cad6');});}
    if(e&&status[e.status])out+=text([status[e.status]],card.x+pad,card.y+card.h-22,small*.85,'#d6b789');return out+'</g></g>';
  }
  function ribbon(a,b,color='#8dbbd1',label=''){const p=edgePoint(a,b),q=edgePoint(b,a),span=Math.max(100,Math.abs(q.x-p.x)*.44),w=7/S.z;return `<path class="authority-ribbon" d="${taperedRibbon(p.x,p.y,p.x+span,p.y,q.x-span,q.y,q.x,q.y,w*2.2,w*.35)}" fill="${color}" fill-opacity=".52" pointer-events="none"><title>${esc(label)}</title></path>`;}
  function paintMap(){
    const n=current(),g=geometry(n),z=S.z,B=visibleBox();svg.setAttribute('viewBox',`${B.x} ${B.y} ${B.w} ${B.h}`);
    const fs=Math.min(76,Math.max(38,19/z));let out=`<g class="authority-map-view" data-authority-view="${esc(n.key)}"><rect x="${g.box.x}" y="${g.box.y}" width="${g.box.w}" height="${g.box.h}" rx="50" fill="#14232c" stroke="#628391" stroke-opacity=".7" stroke-width="${1.2/z}"/>${text(rows(n.title,g.box.w-150,fs,650,2),g.box.x+75,g.box.y+95,fs,'#e6e9e6',650)}`;
    const e=selectedEntry(),source=e&&g.cards.get(PREFIX+e.id),cases=e?caseTiles(e):[];if(source)for(const c of cases)out+=ribbon(source,c,'#8dbbd1',c.link.basis);
    for(const c of g.cards.values())if(intersects(c,B,50))out+=tile(c);
    for(const c of cases)if(intersects(c,B,50)){const cfs=14/z;out+=`<g class="authority-map-case" data-map-jump="${esc(c.link.id)}" role="button" tabindex="0" aria-label="Read ${esc(c.link.title)}"><title>${esc(c.link.basis)}</title><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="22" fill="#263945" stroke="#8dbbd1" stroke-width="${1/z}"/>${text(rows(c.link.title,c.w-70,cfs,550,3),c.x+35,c.y+55,cfs,'#dce6ec',550)}</g>`;}
    svg.innerHTML=out+'</g>';S.paintNodes=[];S.paintEdges=[];R11.starIndex=[];const hint=document.getElementById('mapHint');if(hint)hint.textContent='Click to explore · Scroll between levels · Drag to pan';
  }
  function entrance(){
    if(active()||window.SCOTUSHistory?.state?.().open)return;anchor();const B=visibleBox();if(!intersects(BOX,B,80))return;const z=S.z,fs=Math.min(200,18/z);
    let out=`<g class="authority-map-entrance" data-map-region="${ROOT}" role="button" tabindex="0" aria-label="Explore rules and authorities"><title>Constitution, federal rules, codes and Restatements</title><rect x="${BOX.x}" y="${BOX.y}" width="${BOX.w}" height="${BOX.h}" rx="100" fill="#29414b" fill-opacity=".9" stroke="#8db7c9" stroke-width="${1.4/z}"/>${text(rows(TITLE,BOX.w-160,fs,600,2),BOX.x+110,BOX.y+Math.max(260,fs*1.2),fs,'#e7efee',600)}`;
    if(BOX.w*z>160)out+=text(['Constitution','Federal rules · Codes · Restatements'],BOX.x+110,BOX.y+800,Math.min(105,11/z),'#b7cfd9');out+='</g>';
    if(selected?.type==='node'&&D.byNode[selected.id]?.length){const h=homeFor(selected.id);if(h)out=ribbon(h,BOX,'#8dbbd1','Authorities cited by this atlas entry')+out;}svg.insertAdjacentHTML('beforeend',out);
  }
  const oldDraw=draw;draw=function(...args){if(active())return paintMap();return oldDraw.apply(this,args);};
  // The earlier map decorators assume Case/Concept records and would add their
  // own tiles or hide small private text. Commit private geometry last instead.
  if(typeof R18!=='undefined')R18.afterDraw.push(()=>{if(active())paintMap();else entrance();});
  const oldLevel=R11.level;R11.level=function(p){if(active())return {lvl:ancestors(current()).length,authority:current().key};return oldLevel(p);};
  const oldStep=R11.step;R11.step=function(dir,p){
    if(!active())return oldStep(dir,p);
    if(dir<0){if(S.panelOpen){remember();setReader(false);selected=null;renderInspector();renderHeading();fitBox(geometry().box,true,22,.95);return true;}const n=current();if(n.parent)openGroup(n.parent.key);else home('Atlas');return true;}
    const cards=[...geometry().cards.values()],q=p||mapCenterVisible();const hit=cards.find(c=>q.x>=c.x&&q.x<=c.x+c.w&&q.y>=c.y&&q.y<=c.y+c.h)||cards.reduce((best,c)=>!best||Math.hypot(c.x+c.w/2-q.x,c.y+c.h/2-q.y)<Math.hypot(best.x+best.w/2-q.x,best.y+best.h/2-q.y)?c:best,null);
    if(!hit)return false;if(hit.node.entry)open(hit.node.entry.id);else openGroup(hit.node.key);return true;
  };
  const oldFit=fit;fit=function(...args){if(active()){remember();fitBox(geometry().box,true,22,.95);return;}return oldFit.apply(this,args);};
  document.getElementById('studyFit').onclick=()=>fit();document.getElementById('studyBack').onclick=()=>back();
  let resizeTimer;new ResizeObserver(()=>{geometryCache=null;if(active()&&!S.drag&&!R11.anim){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(active()&&!S.panelOpen)fitBox(geometry().box,false,22,.95);else schedule();},120);}}).observe(svg);
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
