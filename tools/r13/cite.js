/* DKLA r13: reporter citations in any brief become links: to the full opinion on file, or to Justia (U.S. Reports) and CourtListener (other reporters). */
(()=>{
'use strict';
const REP="U\\.\\s?S\\.|S\\.\\s?Ct\\.|L\\.\\s?Ed\\.(?:\\s?2d)?|F\\.(?:\\s?[23]d|\\s?4th)?|F\\.\\s?Supp\\.(?:\\s?[23]d)?|N\\.\\s?E\\.(?:\\s?[23]d)?|N\\.\\s?W\\.(?:\\s?2d)?|A\\.(?:\\s?[23]d)?|P\\.(?:\\s?[23]d)?|So\\.(?:\\s?[23]d)?|S\\.\\s?W\\.(?:\\s?[23]d)?|N\\.\\s?Y\\.(?:\\s?[23]d)?|Cal\\.(?:\\s?[2345]th|\\s?[23]d|\\s?App\\.(?:\\s?[2345]th)?)?|Wis\\.(?:\\s?2d)?|Mass\\.|N\\.\\s?J\\.|Minn\\.|Iowa|Ill\\.(?:\\s?2d)?|Va\\.|Mich\\.|Wash\\.(?:\\s?2d)?|Ohio\\s?St\\.(?:\\s?[23]d)?|N\\.\\s?H\\.|Conn\\.|Md\\.|Pa\\.|Tex\\.|Ariz\\.|Del\\.|Colo\\.|Or\\.|Vt\\.|Neb\\.";
const CITE=new RegExp("\\b(\\d{1,3})\\s("+REP+")\\s(\\d{1,4})\\b","g");
let INDEX={opinions:[]};try{INDEX=JSON.parse(document.getElementById('sourceIndex')?.textContent||'{"opinions":[]}');}catch{}
const key=(v,r,p)=>`${v} ${r.replace(/\s+/g,'')} ${p}`;
const onFile=new Map();for(const o of INDEX.opinions||[]){const m=String(o.citation||'').match(CITE);if(m){const mm=new RegExp(CITE.source).exec(m[0]);if(mm)onFile.set(key(mm[1],mm[2],mm[3]),o);}}
function target(v,r,p){const op=onFile.get(key(v,r,p));if(op)return {href:op.file,cls:'file-link cite-link',title:`Full opinion on file: ${op.title}`};const rep=r.replace(/\s+/g,' ');if(/^U\.\s?S\.$/.test(rep))return {href:`https://supreme.justia.com/cases/federal/us/${v}/${p}/`,cls:'cite-link',title:'Read on Justia'};return {href:`https://www.courtlistener.com/c/${encodeURIComponent(rep)}/${v}/${p}/`,cls:'cite-link',title:'Look up on CourtListener'};}
function linkify(root){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement&&n.parentElement.closest('a,button,input,textarea,script,style,.cite-done')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});const nodes=[];let n;while(n=walker.nextNode()){CITE.lastIndex=0;if(CITE.test(n.data))nodes.push(n);}
 for(const t of nodes){const frag=document.createDocumentFragment();let last=0;const s=t.data;CITE.lastIndex=0;let m;while((m=CITE.exec(s))){frag.append(s.slice(last,m.index));const a=document.createElement('a');const h=target(m[1],m[2],m[3]);a.href=h.href;a.className=h.cls;a.title=h.title;if(!h.cls.includes('file-link')){a.target='_blank';a.rel='noopener';}a.textContent=m[0];frag.append(a);last=m.index+m[0].length;}frag.append(s.slice(last));t.replaceWith(frag);}
 root.classList.add('cite-done');}
const insp=document.getElementById('inspector');
if(insp)new MutationObserver(()=>{const b=insp.querySelector('.reader-body:not(.cite-done)');if(b)linkify(b);}).observe(insp,{childList:true,subtree:true});
window.DKLA=Object.assign(window.DKLA||{},{citationsOnFile:()=>onFile.size});
})();
