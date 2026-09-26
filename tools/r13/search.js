/* DKLA r13: ranked, typo-tolerant search (MiniSearch, MIT) in place of the substring scan; matched terms highlighted in results and in the opened entry; Ctrl/Cmd+K focuses the bar. */
(()=>{
'use strict';
if(typeof MiniSearch!=='function'||typeof searchEntries!=='function')return;
const $=id=>document.getElementById(id);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const OPTS={fields:['title','shortTitle','summary','notes','body','tags'],storeFields:['title'],
 tokenize:s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[\s\u2013\u2014,;:()\[\]"“”'’.?!/]+/).filter(t=>t.length>0),
 processTerm:t=>t.replace(/^[§'’]+|[§'’]+$/g,'')||null,
 searchOptions:{boost:{title:6,shortTitle:6,summary:2},prefix:true,fuzzy:t=>t.length>4?0.2:0,combineWith:'AND'}};
let ms=null,building=false;
function build(){building=true;try{const m=new MiniSearch(OPTS);m.addAll(data.nodes.map(n=>({id:n.id,title:n.title||'',shortTitle:n.shortTitle||'',summary:n.summary||'',notes:n.notes||'',body:Object.values(n.sections||{}).map(v=>typeof v==='string'?v:JSON.stringify(v)).join(' '),tags:(n.tags||[]).join(' ')})));ms=m;}catch(err){console.warn('search index',err);ms=null;}building=false;}
if('requestIdleCallback' in window)requestIdleCallback(build,{timeout:1500});else setTimeout(build,300);
const priorRebuild=typeof rebuildIndex==='function'?rebuildIndex:null;if(priorRebuild)rebuildIndex=function(...a){const r=priorRebuild.apply(this,a);setTimeout(build,0);return r;};
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[§.,’']/g,'').replace(/\s+/g,' ').trim();
function mark(text,terms){let out=E(text);for(const t of terms){if(t.length<2)continue;out=out.replace(new RegExp('(^|[^\\w<])('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'$1<mark>$2</mark>');}return out;}
const prior=searchEntries;
searchEntries=function(){const q=$('search').value.trim();if(typeof query!=='undefined')query=q;if(!q){closeSearch();return;}if(!ms){prior();return;}
 const nq=norm(q),tokens=nq.split(' ').filter(Boolean),rows=[];
 for(const r of mapData().regions){const t=norm(r.title+' '+shortRegionTitle(r));if(tokens.every(w=>t.includes(w)))rows.push({type:'region',id:r.id,title:shortRegionTitle(r),sub:'Subject',terms:tokens});}
 for(const d of Object.values(mapData().districts)){const t=norm(d.title+' '+d.question);if(tokens.every(w=>t.includes(w)))rows.push({type:'district',id:d.id,title:d.title,sub:shortRegionTitle(regionFor(d.region)),terms:tokens});}
 let hits=ms.search(q);if(!hits.length&&tokens.length>1)hits=ms.search(q,{combineWith:'OR'});
 const total=rows.length+hits.length;
 for(const h of hits.slice(0,45)){const n=nodesById.get(h.id);if(!n)continue;let sub='';try{sub=`${(n.courses||[]).join(', ')} · ${geoDistrict(geoPlacement(n.id).district)?.title||roleLabel(n)}`;}catch{sub=(n.courses||[]).join(', ');}rows.push({type:'node',id:n.id,title:n.title,sub,terms:h.terms});}
 $('searchResults').innerHTML=`<div class="search-label">${total} result${total===1?'':'s'} across your atlas</div>`+rows.map(r=>`<button data-search-type="${r.type}" data-search-id="${E(r.id)}" data-terms="${E(r.terms.join(' '))}"><strong>${mark(r.title,r.terms)}</strong><small>${E(r.sub)}</small></button>`).join('')+(!rows.length?'<p class="search-empty">No matches. Try a case name, a rule number or a shorter phrase.</p>':total>45?'<p class="search-empty">Showing the closest 45 matches. Add a word to narrow them.</p>':'');
 S.searchOpen=true;$('searchResults').hidden=false;$('search').setAttribute('aria-expanded','true');};
// highlight the matched terms in the opened entry without touching the DOM (CSS Custom Highlight API)
function highlight(terms){if(!('highlights' in CSS))return;const body=$('inspector')?.querySelector('.reader-body');if(!body)return;const ranges=[],walker=document.createTreeWalker(body,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){const s=node.data.toLowerCase();for(const t of terms){if(t.length<3)continue;let i=0;while((i=s.indexOf(t,i))>=0){const r=new Range();r.setStart(node,i);r.setEnd(node,i+t.length);ranges.push(r);i+=t.length;if(ranges.length>400)break;}}}CSS.highlights.set('dkla-hit',new Highlight(...ranges));}
document.addEventListener('click',e=>{const b=e.target.closest('#searchResults [data-search-type="node"][data-terms]');if(!b)return;const terms=b.dataset.terms.split(' ').filter(Boolean);setTimeout(()=>highlight(terms),450);setTimeout(()=>highlight(terms),1200);},true);
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&e.key.toLowerCase()==='k'){e.preventDefault();const s=$('search');s.focus();s.select();}});
window.DKLA=Object.assign(window.DKLA||{},{searchIndex:()=>ms});
})();
