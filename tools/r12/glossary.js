/* DKLA r12: the legal dictionary. A browsable box on the map, dictionary rows in search, and the terms each entry uses. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let G={terms:[],byNode:{}};try{G=JSON.parse($('dklaGlossary')?.textContent||'{"terms":[],"byNode":{}}');}catch{}
const bySlug=new Map(G.terms.map(t=>[t.slug,t]));const usedBy=new Map();for(const [nid,slugs] of Object.entries(G.byNode||{}))for(const s of slugs){if(!usedBy.has(s))usedBy.set(s,[]);usedBy.get(s).push(nid);}
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
const LII=s=>'https://www.law.cornell.edu/wex/'+encodeURIComponent(s);
window.DKLA=Object.assign(window.DKLA||{},{glossaryCount:()=>G.terms.length,openTerm:slug=>openGlossary(slug)});
// ---- the dialog
const dlg=document.createElement('dialog');dlg.id='glossaryDialog';dlg.setAttribute('aria-label','Legal dictionary');document.body.appendChild(dlg);
let cur=null,q='',letter='',ret=null;
function matches(){const nq=norm(q);let list=G.terms;if(letter)list=list.filter(t=>t.term[0].toUpperCase()===letter);if(nq){const starts=[],has=[];for(const t of list){const k=norm(t.term);if(k.startsWith(nq))starts.push(t);else if(k.includes(nq)||norm(t.definition).includes(nq))has.push(t);}list=[...starts,...has];}return list;}
function render(){const list=matches(),shown=list.slice(0,400);const t=cur&&bySlug.get(cur);
 dlg.innerHTML=`<header class="gl-header"><div><strong>Legal dictionary</strong><span>${G.terms.length.toLocaleString()} terms · Black's Law Dictionary (1910), Bouvier's maxims, the US Courts, California, Virginia and USCIS glossaries, Cornell LII Wex where mirrored, and the atlas's own concepts · each term links to its Cornell LII page</span></div><div class="gl-tools"><input id="glFind" type="search" placeholder="Find a term" value="${E(q)}" aria-label="Find a term"><button id="glClose">← Back</button></div></header>
 <nav class="gl-letters" aria-label="Browse by letter"><button data-letter="" aria-pressed="${!letter}">All</button>${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l=>`<button data-letter="${l}" aria-pressed="${letter===l}">${l}</button>`).join('')}</nav>
 <div class="gl-body"><ul class="gl-list" role="listbox">${shown.map(x=>`<li><button data-term="${E(x.slug)}" aria-pressed="${x.slug===cur}"><strong>${E(x.term)}</strong><small>${E(x.definition.slice(0,80))}${x.definition.length>80?'…':''}</small></button></li>`).join('')}${list.length>400?`<li class="gl-more">${(list.length-400).toLocaleString()} more · narrow the search</li>`:''}${!list.length?'<li class="gl-more">No term matches.</li>':''}</ul>
 <article class="gl-detail">${t?`<h2>${E(t.term)}</h2><p class="gl-def">${E(t.definition)}</p><p class="gl-meta">${E(t.source||'')}${t.source?' · ':''}<a href="${E(t.url||LII(t.slug))}" target="_blank" rel="noopener">Read on Cornell LII ↗</a></p>${(usedBy.get(t.slug)||[]).length?`<h3>Entries that use this term</h3><div class="gl-used">${(usedBy.get(t.slug)||[]).slice(0,14).map(id=>{const title=(G.titles||{})[id]||id;return `<button data-study-node="${E(id)}">${E(title)}</button>`;}).join('')}</div>`:''}`:`<p class="gl-empty">Pick a term on the left, or type to search. Each term links to its Cornell Legal Information Institute page.</p>`}</article></div>`;
 $('glClose').onclick=close;const f=$('glFind');f.oninput=()=>{q=f.value;const pos=f.selectionStart;render();const f2=$('glFind');f2.focus();f2.setSelectionRange(pos,pos);};
 dlg.querySelectorAll('[data-letter]').forEach(b=>b.onclick=()=>{letter=b.dataset.letter;render();});
 dlg.querySelectorAll('[data-term]').forEach(b=>b.onclick=()=>{cur=b.dataset.term;render();history.replaceState(null,'',`#term=${encodeURIComponent(cur)}`);});
 dlg.querySelectorAll('[data-study-node]').forEach(b=>b.onclick=()=>{close();window.LegalAtlas?.navigate?.('node',b.dataset.studyNode);});}
function openGlossary(slug){if(slug&&bySlug.has(slug)){cur=slug;q='';letter='';}if(!dlg.open){ret={active:document.activeElement};for(const id of ['modal','fileDialog']){const d=$(id);if(d?.open)d.close();}dlg.showModal();}render();if(!slug)setTimeout(()=>$('glFind')?.focus(),30);}
function close(){if(dlg.open)dlg.close();try{ret?.active?.focus?.();}catch{}ret=null;if(location.hash.startsWith('#term='))history.replaceState(null,'',location.pathname);}
dlg.addEventListener('cancel',e=>{e.preventDefault();close();});
window.addEventListener('hashchange',()=>{const m=location.hash.match(/^#term=(.+)$/);if(m)openGlossary(decodeURIComponent(m[1]));});{const m=location.hash.match(/^#term=(.+)$/);if(m)setTimeout(()=>openGlossary(decodeURIComponent(m[1])),500);}
// the dictionary box on the map opens the browser instead of zooming
document.addEventListener('click',e=>{const t=e.target.closest('[data-dkla-term]');if(t){e.preventDefault();e.stopPropagation();openGlossary(t.dataset.dklaTerm);return;}const r=e.target.closest('[data-map-region="dictionary-region"],[data-study-region="dictionary-region"]');if(r){e.preventDefault();e.stopPropagation();openGlossary();}},true);
if(typeof goRegion==='function'){const priorRegion=goRegion;goRegion=function(id,...a){if(id==='dictionary-region'){openGlossary();return;}return priorRegion(id,...a);};}
// ---- search bar: dictionary rows
const results=$('searchResults'),input=$('search');
if(results&&input){new MutationObserver(()=>{if(results.hidden||results.dataset.glossed===input.value||!G.terms.length)return;results.dataset.glossed=input.value;const nq=norm(input.value);if(nq.length<2)return;const hits=(()=>{const starts=[],has=[];for(const t of G.terms){const k=norm(t.term);if(k.startsWith(nq))starts.push(t);else if(k.includes(nq))has.push(t);if(starts.length>=6)break;}return [...starts,...has].slice(0,3);})();if(!hits.length)return;const frag=document.createElement('div');frag.className='search-glossary';frag.innerHTML=`<div class="search-label">Dictionary</div>`+hits.map(t=>`<button data-search-type="term" data-dkla-term="${E(t.slug)}"><strong>${E(t.term)}</strong><small>${E(t.definition.slice(0,90))}${t.definition.length>90?'…':''}</small></button>`).join('');const nodes=results.querySelectorAll(':scope>button');const after=nodes[Math.min(2,nodes.length-1)];if(after)after.after(frag);else results.appendChild(frag);}).observe(results,{childList:true});}
// ---- reading panel: the terms an entry uses
const insp=$('inspector');
function termChips(){if(!insp||insp.hidden||insp.querySelector('.dkla-terms'))return;const id=currentNodeId();if(!id)return;const slugs=G.byNode[id];if(!slugs?.length)return;const sec=document.createElement('section');sec.className='dkla-terms';sec.innerHTML=`<h3>Terms in this entry <span>${slugs.length}</span></h3><div class="dkla-term-chips">${slugs.map(s=>{const t=bySlug.get(s);return t?`<button type="button" data-dkla-term="${E(s)}" title="${E(t.definition.slice(0,140))}">${E(t.term)}</button>`:'';}).join('')}</div>`;const anchor=insp.querySelector('.dkla-timeline')||insp.querySelector('.dkla-rule')||insp.querySelector('.takeaway');if(anchor)anchor.after(sec);else insp.querySelector('.reader-body')?.appendChild(sec);}
function currentNodeId(){try{const v=window.LegalAtlas.geography().view;return v.selected?.type==='node'?v.selected.id:null;}catch{return null;}}
if(insp)new MutationObserver(()=>{termChips();}).observe(insp,{childList:true,subtree:true});
})();
