/* v2.5 authority library. Text lives in dklaAuthoritiesData; nothing is fetched at runtime.
   This layer adds discovery and reciprocal links, without creating map nodes. */
(() => {
  'use strict';
  const block = document.getElementById('dklaAuthoritiesData');
  if (!block) return;
  let D; try { D = JSON.parse(block.textContent); } catch { return; }
  if (!Array.isArray(D.entries) || !Array.isArray(D.collections)) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byId = new Map(D.entries.map(e => [e.id, e]));
  const collections = new Map(D.collections.map(c => [c.id, c]));
  const courseNames = ['Contracts', 'Civil Procedure', 'Legislation and the Regulatory State'];
  const state = { collection: '', query: '', id: null, prefix: '' };
  const dialog = document.createElement('dialog');
  dialog.id = 'authorityLibrary'; dialog.setAttribute('aria-labelledby', 'authorityLibraryTitle');
  dialog.innerHTML = `<header class="authority-header"><div><button class="authority-home" type="button" data-authority-home>Rules & authorities</button><h2 id="authorityLibraryTitle">Read the source rule</h2></div><button type="button" class="authority-close" data-authority-close aria-label="Close rules and authorities">Close</button></header><div class="authority-layout"><details class="authority-index"><summary>Browse provisions</summary><aside><label for="authorityQuery">Find a provision</label><input id="authorityQuery" type="search" placeholder="Rule 12, Article III, Restatement 90…" autocomplete="off"><label for="authorityCollection">Collection</label><select id="authorityCollection"><option value="">All authorities</option>${D.collections.map(c=>`<option value="${esc(c.id)}">${esc(c.title)}</option>`).join('')}</select><p class="authority-results-count" aria-live="polite"></p><nav class="authority-results" aria-label="Provisions"></nav></aside></details><main class="authority-reading" tabindex="-1"></main></div>`;
  document.body.appendChild(dialog);
  const main = dialog.querySelector('.authority-reading');
  const results = dialog.querySelector('.authority-results');
  const query = dialog.querySelector('#authorityQuery');
  const select = dialog.querySelector('#authorityCollection');
  const index = dialog.querySelector('.authority-index');
  const mobileLayout=matchMedia('(max-width: 720px)');
  mobileLayout.addEventListener('change',()=>{if(dialog.open)index.open=!mobileLayout.matches;});
  const fold=s=>String(s).toLowerCase().replace(/u\.?\s*s\.?\s*c\.?/g,'usc').replace(/\b(rule|restatement|ucc)(\d)/g,'$1 $2');
  const hay = new Map(D.entries.map(e=>[e.id,fold([e.cite,e.title,e.titleNumber?'Title '+e.titleNumber:'',e.chapter||'',...e.lines.map(l=>l[1])].join(' '))]));
  const status = {'abrogated':'Abrogated','repealed':'Repealed','renumbered':'Renumbered','omitted':'Omitted','transferred':'Transferred','reserved':'Reserved','index-only':'Index only','deleted-model-section':'Deleted model section','article-index':'Article directory'};
  function currentCourse() {
    return typeof S !== 'undefined' ? courseNames.indexOf(S.scope) : -1;
  }
  function filtered() {
    const terms=fold(state.query).trim().split(/\s+/).filter(Boolean);
    return D.entries.filter(e=>(!state.collection || e.collection===state.collection) && (!state.prefix||e.id.startsWith(state.prefix)) && terms.every(w=>hay.get(e.id).includes(w))).sort((a,b)=>Number(terms.every(w=>fold(b.cite+' '+b.title).includes(w)))-Number(terms.every(w=>fold(a.cite+' '+a.title).includes(w))));
  }
  function list() {
    const hits=filtered();
    dialog.querySelector('.authority-results-count').textContent=`${hits.length} ${hits.length===1?'provision':'provisions'}`;
    let chapter='';
    results.innerHTML=hits.length?hits.map(e=>{const group=e.chapter&&e.chapter!==chapter?`<p class="authority-chapter">${esc(e.titleNumber?'Title '+e.titleNumber+' · ':'')}${esc(e.chapter)}</p>`:'';chapter=e.chapter;return group+`<button type="button" data-authority-id="${esc(e.id)}"${e.id===state.id?' aria-current="true"':''}><b>${esc(e.cite)}</b><span>${esc(e.title)}</span>${status[e.status]?`<small>${esc(status[e.status])}</small>`:''}</button>`;}).join(''):'<p>No matching provision. Try a number or a shorter phrase.</p>';
  }
  function home() {
    const course=currentCourse();
    const ordered=[...D.collections].sort((a,b)=>Number(b.course===course)-Number(a.course===course));
    main.innerHTML=`<div class="authority-intro"><p class="authority-eyebrow">Source texts, in order</p><h2>Start with the rule</h2><p>Read a provision, move to the next one, and follow its connections into the atlas. The text stays available offline with your saved atlas.</p></div><div class="authority-collections">${ordered.map(c=>`<button type="button" data-authority-collection="${esc(c.id)}"><b>${esc(c.title)}</b><span>${esc(c.description)}</span><small>${D.entries.filter(e=>e.collection===c.id).length} entries · ${c.course===2?'LRS':esc(courseNames[c.course])}</small></button>`).join('')}</div>`;
  }
  function source(e) {
    const s=e.source;
    return `<details class="authority-provenance"><summary>Source and edition</summary><p>${esc(s.name)}${s.edition?` · ${esc(s.edition)}`:''}${s.read?` · checked ${esc(s.read)}`:''}</p>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">Open source ↗</a>`:''}${s.official?` <a href="${esc(s.official)}" target="_blank" rel="noopener">${e.collection==='uscode'?'Pinned official release ↗':'Official rules volume ↗'}</a>`:''}${s.file?`<button type="button" data-dkla-file="${esc(s.file)}">Open assigned source page ↗</button>`:''}<p class="authority-source-note">Connections identify an explicit citation or an existing atlas relationship. They do not claim that every linked case decided every part of this provision.</p></details>`;
  }
  function annotation(a){
    if(typeof a==='string')return `<p>${esc(a)}</p>`;
    return `${a.title?`<h4>${esc(a.title)}</h4>`:''}${(a.lines||[]).map(l=>`<p style="--authority-indent:${Math.min(l[0],3)}">${esc(l[1])}</p>`).join('')}`;
  }
  function read(id) {
    const e=byId.get(id); if (!e) { home(); return; }
    if(state.collection!==e.collection){state.collection=e.collection;select.value=e.collection;state.prefix='';}
    state.id=id;
    const c=collections.get(e.collection);
    const group=D.entries.filter(x=>x.collection===e.collection);
    const n=group.findIndex(x=>x.id===id);
    const anchors=e.lines.map((l,i)=>l[2]==='heading'?{i,text:l[1]}:l[0]===0&&/^\([a-z0-9]+\)\s/.test(l[1])?{i,text:l[1].match(/^\([a-z0-9]+\)/)[0]}:null).filter(Boolean);
    const links=e.links||[];
    const linked=links.map(l=>`<li><button type="button" data-authority-node="${esc(l.id)}">${esc(l.title)}</button><small>${esc(l.basis)}</small></li>`).join('');
    main.innerHTML=`<article><header class="authority-provision-header"><p class="authority-eyebrow">${esc(c.title)}${e.chapter?` · ${esc(e.chapter)}`:''}</p><h2>${esc(e.cite)}<span>${esc(e.title)}</span></h2><p class="authority-edition">${esc(e.source.edition||'Source transcription')}${status[e.status]?` · ${esc(status[e.status])}`:''}</p>${e.note?`<p class="authority-note">${esc(e.note)}</p>`:''}</header>${anchors.length?`<nav class="authority-subsections" aria-label="Sections in this provision">${anchors.map(a=>`<button type="button" data-authority-anchor="authority-line-${a.i}">${esc(a.text)}</button>`).join('')}</nav>`:''}<div class="authority-text">${e.lines.map((l,i)=>l[2]==='heading'?`<h3 id="authority-line-${i}">${esc(l[1])}</h3>`:`<p id="authority-line-${i}" style="--authority-indent:${Math.min(l[0],3)}">${esc(l[1])}</p>`).join('')}</div>${e.annotations?.length?`<details class="authority-provenance"><summary>Effective dates and statutory notes</summary>${e.annotations.map(annotation).join('')}</details>`:''}${e.related?.length?`<div class="authority-related"><h3>Read alongside</h3>${e.related.filter(x=>byId.has(x)).map(x=>`<button type="button" data-authority-id="${esc(x)}">${esc(byId.get(x).cite)} · ${esc(byId.get(x).title)}</button>`).join('')}</div>`:''}${e.filter?`<button type="button" data-authority-prefix="${esc(e.filter)}">Browse assigned sections in this article</button>`:''}<section class="authority-case-links"><h3>Connected atlas entries${links.length?` <small>${links.length}</small>`:''}</h3>${links.length?`<ul>${links.slice(0,8).map(l=>`<li><button type="button" data-authority-node="${esc(l.id)}">${esc(l.title)}</button><small>${esc(l.basis)}</small></li>`).join('')}</ul>${links.length>8?`<details><summary>All ${links.length} connections</summary><ul>${linked}</ul></details>`:''}`:'<p>No explicit citation or direct rule connection is currently indexed in the atlas.</p>'}</section>${source(e)}<nav class="authority-next" aria-label="Read in order"><button type="button" data-authority-id="${esc(group[n-1]?.id||'')}"${n===0?' disabled':''}>← Previous</button><span>${n+1} / ${group.length}</span><button type="button" data-authority-id="${esc(group[n+1]?.id||'')}"${n===group.length-1?' disabled':''}>Next →</button></nav></article>`;
    list(); main.scrollTop=0;
  }
  function open(id, collection) {
    if (typeof dismissMenu==='function') dismissMenu();
    if (id && byId.has(id)) state.collection=byId.get(id).collection;
    else state.collection=collection||'';
    state.query=''; state.prefix='';query.value=''; select.value=state.collection;
    state.id=id&&byId.has(id)?id:collection?D.entries.find(e=>e.collection===collection)?.id||null:null;
    if (!dialog.open) dialog.showModal();
    index.open=!matchMedia('(max-width: 720px)').matches;
    list(); if (state.id) read(state.id); else home(); main.focus({preventScroll:true});
  }
  query.addEventListener('input',()=>{state.query=query.value;state.prefix='';list();});
  select.addEventListener('change',()=>{state.collection=select.value;state.prefix='';list();state.id=null;home();});
  dialog.addEventListener('keydown',ev=>ev.stopPropagation());
  dialog.addEventListener('click',ev=>{
    const b=ev.target.closest('button'); if (!b) {if(ev.target===dialog)dialog.close();return;}
    const d=b.dataset;
    if ('authorityClose' in d) dialog.close();
    else if ('authorityHome' in d) {state.id=null;home();main.scrollTop=0;}
    else if (d.authorityId) {if (!state.collection) {state.collection=byId.get(d.authorityId)?.collection||'';select.value=state.collection;}read(d.authorityId);if(matchMedia('(max-width: 720px)').matches)index.open=false;main.focus({preventScroll:true});}
    else if (d.authorityCollection) {state.collection=d.authorityCollection;select.value=state.collection;state.query='';state.prefix='';query.value='';list();const first=filtered()[0];if(first)read(first.id);}
    else if (d.authorityAnchor) main.querySelector('#'+d.authorityAnchor)?.scrollIntoView({block:'start'});
    else if (d.authorityNode) {dialog.close();if(typeof goNode==='function')goNode(d.authorityNode,true);}
    else if (d.authorityPrefix) {state.collection='ucc';select.value='ucc';state.query='';state.prefix=d.authorityPrefix;query.value='';list();index.open=true;}
  });
  document.addEventListener('click',ev=>{
    const b=ev.target.closest('[data-authority-open],[data-authority-menu],[data-authority-shortcut]'); if(!b)return;
    ev.preventDefault();ev.stopPropagation();
    if(typeof closeSearch==='function')closeSearch();
    if(b.dataset.authorityOpen)open(b.dataset.authorityOpen);
    else if('authorityShortcut' in b.dataset){const c=currentCourse();open(null,c===2?'constitution':c===1?'frcp':c===0?'restatement':'');}
    else open(null);
  },true);
  if(typeof moreMenu==='function'){
    const prior=moreMenu;
    moreMenu=function(...args){const out=prior.apply(this,args),menu=document.getElementById('moreMenu');if(menu&&!menu.hidden&&!menu.querySelector('[data-authority-menu]')){const b=document.createElement('button');b.type='button';b.dataset.authorityMenu='1';b.role='menuitem';b.textContent='Rules & authorities';menu.appendChild(b);}return out;};
    const more=document.getElementById('moreBtn');if(more)more.onclick=()=>moreMenu();
  }
  const panel=document.getElementById('inspector');
  function contextual(){
    if(!panel||panel.hidden)return;
    const id=typeof selected!=='undefined'&&selected?.type==='node'?selected.id:null;
    const ids=(D.byNode[id]||[]).filter(x=>byId.has(x));
    const body=panel.querySelector('.reader-body');if(!body)return;
    const old=body.querySelector('.authority-context');
    if(old?.dataset.node===id)return;
    old?.remove();if(!ids.length)return;
    const el=document.createElement('details');el.className='authority-context';el.dataset.node=id;
    el.innerHTML=`<summary>Authorities cited <small>${ids.length}</small></summary><div>${ids.map(x=>`<button type="button" data-authority-open="${esc(x)}">${esc(byId.get(x).cite)} · ${esc(byId.get(x).title)}</button>`).join('')}</div>`;
    body.appendChild(el);
  }
  if(panel)new MutationObserver(contextual).observe(panel,{childList:true,subtree:true});
  const breadcrumb=document.getElementById('geoBreadcrumb');
  function shortcut(){
    const nav=breadcrumb?.parentElement;if(!nav)return;
    let b=nav.querySelector('[data-authority-shortcut]');if(!b){b=document.createElement('button');b.type='button';b.dataset.authorityShortcut='1';b.className='authority-shortcut';nav.appendChild(b);}
    const c=currentCourse();const text=c===2?'Constitution':c===1?'Federal rules':c===0?'Contracts authorities':'Rules & authorities';
    if(b.textContent!==text)b.textContent=text;
    b.setAttribute('aria-label',`Open ${text.toLowerCase()} library`);
  }
  if(breadcrumb)new MutationObserver(shortcut).observe(breadcrumb,{childList:true,subtree:true});
  const search=document.getElementById('search'), searchResults=document.getElementById('searchResults');
  if(search&&searchResults)new MutationObserver(()=>{
    if(searchResults.hidden||searchResults.dataset.authorities===search.value)return;
    searchResults.dataset.authorities=search.value;
    searchResults.querySelector('.authority-search')?.remove();
    const q=fold(search.value.trim());if(q.length<3)return;
    const words=q.split(/\s+/);
    const hits=D.entries.filter(e=>words.every(w=>fold([e.cite,e.title].join(' ')).includes(w))).slice(0,4);
    const groupHits=D.collections.filter(c=>words.every(w=>fold(c.title).includes(w))).slice(0,2);
    if(!hits.length&&!groupHits.length)return;
    const box=document.createElement('div');box.className='r19-search authority-search';box.innerHTML='<div class="search-label">Rules & authorities</div>'+groupHits.map(c=>`<button type="button" data-authority-open="${esc(D.entries.find(e=>e.collection===c.id)?.id)}"><strong>${esc(c.title)}</strong><small>Read the ordered collection</small></button>`).join('')+hits.map(e=>`<button type="button" data-authority-open="${esc(e.id)}"><strong>${esc(e.cite)} · ${esc(e.title)}</strong><small>${esc(collections.get(e.collection).title)}</small></button>`).join('');searchResults.appendChild(box);
  }).observe(searchResults,{childList:true});
  shortcut();contextual();
  window.DKLAAuthorities={open,data:D,version:1};
})();
