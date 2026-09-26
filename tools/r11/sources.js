/* DKLA r11: one viewer for every file beside the atlas, page-precise links into the two big books, and source search. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const INDEX=JSON.parse($('sourceIndex')?.textContent||'{"civ":null,"sel":null,"opinions":[],"files":[]}');
const BOOKS=[['civ','Civil Procedure supplement 2026–27'],['sel','Contracts Selections (2021)']].filter(([k])=>INDEX[k]);
function bookFor(path){for(const [k] of BOOKS)if(INDEX[k].file===path)return INDEX[k];return null;}
function kindOf(path){return /\.pdf$/i.test(path)?'pdf':/\.txt$/i.test(path)?'text':/\.html?$/i.test(path)?'html':/\.docx$/i.test(path)?'docx':'file';}
// ---- the viewer
const dlg=document.createElement('dialog');dlg.id='fileDialog';dlg.setAttribute('aria-label','Source file');document.body.appendChild(dlg);
let cur={path:'',page:1,title:''},ret=null;
function render(){const book=bookFor(cur.path),kind=kindOf(cur.path),name=cur.path.split('/').pop(),total=book?.pages||null;const src=encodeURI(cur.path)+(kind==='pdf'?`#page=${cur.page}&zoom=page-width`:'');
 const heading=book?.index.filter(e=>e.page<=cur.page).slice(-1)[0];
 dlg.innerHTML=`<header class="file-header"><div class="file-title"><strong>${E(cur.title||name)}</strong><span>${E(name)}${total?` · PDF page ${cur.page} of ${total}`:''}${heading&&heading.page===cur.page?` · ${E(heading.label.slice(0,80))}`:''}</span></div>
  <div class="file-tools">${kind==='pdf'?`<button id="filePrev" aria-label="Previous page">‹</button><label class="file-page">Page <input id="filePage" type="number" min="1" ${total?`max="${total}"`:''} value="${cur.page}"></label><button id="fileNext" aria-label="Next page">›</button>`:''}${book?`<input id="fileFind" type="search" placeholder="Find a rule, section or article" aria-label="Find in this book">`:''}<a href="${encodeURI(cur.path)}${kind==='pdf'?`#page=${cur.page}`:''}" target="_blank" rel="noopener">Open in a new tab ↗</a><button id="fileClose">← Back</button></div></header>
  <div id="fileFindResults" hidden></div>
  ${kind==='docx'?`<div class="file-note"><p>Word files cannot be shown inside the atlas. <a href="${encodeURI(cur.path)}" download>Download the file</a>${INDEX.files.includes(cur.path.replace(/\.docx$/,'.html'))?` or <button data-dkla-file="${E(cur.path.replace(/\.docx$/,'.html'))}">read the converted copy</button>`:''}.</p></div>`:`<iframe id="fileFrame" src="${src}" title="${E(cur.title||name)}"${kind==='text'?' class="is-text"':''}></iframe>`}`;
 $('fileClose').onclick=close;if($('filePrev'))$('filePrev').onclick=()=>go(cur.page-1);if($('fileNext'))$('fileNext').onclick=()=>go(cur.page+1);if($('filePage'))$('filePage').onchange=e=>go(+e.target.value||1);
 if($('fileFind'))$('fileFind').oninput=e=>{const q=e.target.value.trim().toLowerCase().replace(/§/g,'§ ').replace(/\s+/g,' ');const box=$('fileFindResults');if(!q){box.hidden=true;return;}const hits=book.index.filter(x=>(x.key+' '+x.label).toLowerCase().includes(q)).slice(0,12);box.hidden=false;box.innerHTML=hits.length?hits.map(x=>`<button data-file-page="${x.page}"><strong>${E(x.key)}</strong><small>${E(x.label.slice(0,90))} · p. ${x.page}</small></button>`).join(''):'<p class="search-empty">No heading matches.</p>';};
 dlg.querySelectorAll('[data-file-page]').forEach(b=>b.onclick=()=>go(+b.dataset.filePage));}
function go(page){const book=bookFor(cur.path);if(book)page=Math.max(1,Math.min(book.pages,page));else page=Math.max(1,page);cur.page=page;const f=$('fileFrame');if(f&&kindOf(cur.path)==='pdf'){f.src=encodeURI(cur.path)+`#page=${page}&zoom=page-width`;}render();history.replaceState(null,'',`#file=${encodeURIComponent(cur.path)}:${page}`);}
function openFile(path,page=1,title=''){if(!/^(added-sources|DKLA-sources)\/[^"'<>]+$/.test(path)){return;}const mm=path.match(/^(.*?)#page=(\d+)$/);if(mm){path=mm[1];page=+mm[2];}cur={path,page:+page||1,title};if(!dlg.open){ret={active:document.activeElement,scroll:$('inspector')?.scrollTop||0};for(const id of ['modal','bookDialog','civilSourceDialog','lrsSourceDialog']){const d=$(id);if(d?.open)d.close();}dlg.showModal();}render();try{history.replaceState(null,'',`#file=${encodeURIComponent(path)}:${cur.page}`);}catch{}}
function close(){if(dlg.open)dlg.close();if(ret?.active?.focus)try{ret.active.focus();}catch{}if(ret&&$('inspector'))$('inspector').scrollTop=ret.scroll;ret=null;if(location.hash.startsWith('#file='))history.replaceState(null,'',location.pathname);}
dlg.addEventListener('cancel',e=>{e.preventDefault();close();});
document.addEventListener('click',e=>{const a=e.target.closest('a.file-link,[data-dkla-file]');if(!a)return;if(e.metaKey||e.ctrlKey||e.shiftKey||e.button===1)return;const raw=a.dataset.dklaFile||decodeURI(a.getAttribute('href')||'');if(!/^(added-sources|DKLA-sources)\//.test(raw))return;e.preventDefault();e.stopPropagation();const mm=raw.match(/^(.*?)#page=(\d+)$/);openFile(mm?mm[1]:raw,mm?+mm[2]:1,a.closest('.source-link')?a.childNodes[0]?.textContent?.replace(/\s*↗\s*$/,'').trim():'');},true);
function fromHash(){const m=location.hash.match(/^#file=([^:]+)(?::(\d+))?$/);if(!m)return;try{openFile(decodeURIComponent(m[1]),+(m[2]||1));}catch{}}
window.addEventListener('hashchange',fromHash);fromHash();
// ---- search: headings of the two books and the opinion files answer the atlas search too
const results=$('searchResults'),input=$('search');
function sourceHits(q){const nq=q.toLowerCase().replace(/§/g,'§ ').replace(/\s+/g,' ').trim();if(nq.length<2)return [];const out=[];const rule=nq.match(/^(?:frcp|fed\.? ?r\.? ?civ\.? ?p\.?|rule)\s*(\d+(?:\.\d)?)/),usc=nq.match(/^(?:28 u\.?s\.?c\.? ?)?§?\s*(\d{4})\b/),ucc=nq.match(/^(?:ucc\s*)?§?\s*(\d-\d{3})/),rest=nq.match(/^(?:restatement|rest\.?|r2k)\s*§?\s*(\d+)/),cisg=nq.match(/^cisg\s*(?:art(?:icle|\.)?)?\s*(\d+)/);
 for(const [k,name] of BOOKS){for(const e of INDEX[k].index){const key=e.key.toLowerCase(),lab=e.label.toLowerCase();let ok=false;if(rule&&k==='civ')ok=key===`rule ${rule[1]}`;else if(usc&&k==='civ')ok=key===`§ ${usc[1]}`;else if(ucc&&k==='sel')ok=key===`ucc § ${ucc[1]}`;else if(rest&&k==='sel')ok=key===`restatement § ${rest[1]}`;else if(cisg&&k==='sel')ok=key===`cisg art. ${cisg[1]}`;else ok=nq.length>=4&&(key.includes(nq)||lab.includes(nq));if(ok)out.push({type:'file',file:INDEX[k].file,page:e.page,title:e.label.length>70?e.key+' · '+e.label.slice(0,70)+'…':e.label,sub:`${name} · page ${e.page}`});if(out.length>=8)break;}}
 for(const o of INDEX.opinions){if(nq.length>=4&&(o.title+' '+o.citation).toLowerCase().includes(nq))out.push({type:'file',file:o.file,page:1,title:o.title+' (full opinion)',sub:o.citation||'Opinion text on file'});if(out.length>=12)break;}
 return out;}
if(results&&input){const base=window.__dklaSearchEntries;new MutationObserver(()=>{if(results.hidden||results.dataset.sourced===input.value)return;const hits=sourceHits(input.value);results.dataset.sourced=input.value;if(!hits.length)return;const frag=document.createElement('div');frag.className='search-sources';frag.innerHTML=`<div class="search-label">Sources on file</div>`+hits.map(h=>`<button data-search-type="file" data-file="${E(h.file)}" data-page="${h.page}"><strong>${E(h.title)}</strong><small>${E(h.sub)}</small></button>`).join('');results.appendChild(frag);}).observe(results,{childList:true});
 results.addEventListener('click',e=>{const b=e.target.closest('[data-search-type="file"]');if(!b)return;e.preventDefault();e.stopPropagation();openFile(b.dataset.file,+b.dataset.page||1,b.querySelector('strong')?.textContent||'');results.hidden=true;},true);}
// ---- the reading panel: every file the entry cites gets a chip beside the rule line, so the source is one tap away
const insp=$('inspector');
function fileChips(){if(!insp||insp.hidden)return;const head=insp.querySelector('.dkla-rule-label')||insp.querySelector('.takeaway')||insp.querySelector('h1');if(!head||insp.querySelector('.dkla-file-chips'))return;const links=[...insp.querySelectorAll('a.file-link')];if(!links.length)return;const row=document.createElement('div');row.className='dkla-file-chips';row.setAttribute('aria-label','Sources on file');
 row.innerHTML=links.slice(0,4).map(a=>{const href=decodeURI(a.getAttribute('href')||''),mm=href.match(/#page=(\d+)$/),name=href.split('/').pop().split('#')[0];const book=bookFor(href.split('#')[0]);const short=book?(book===INDEX.civ?'Civ Pro supplement':'Contracts Selections')+(mm?' p. '+mm[1]:''):/opinions\//.test(href)?'Full opinion':name.replace(/\.(pdf|txt|html|docx)$/i,'').slice(0,34);return `<button type="button" data-dkla-file="${E(href)}" title="${E(a.childNodes[0]?.textContent?.trim()||name)}">${E(short)} <span aria-hidden="true">↗</span></button>`;}).join('');
 head.before(row);}
if(insp)new MutationObserver(()=>{fileChips();}).observe(insp,{childList:true,subtree:true});
// ---- coverage wording: an entry written from the assigned reading is not "limited"
if(typeof window.DKLA==='object'){window.DKLA.openFile=openFile;window.DKLA.sourceIndex=()=>INDEX;}
window.LegalAtlas=Object.assign(window.LegalAtlas||{},{openFile});
})();
