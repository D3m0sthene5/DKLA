/* DKLA r17: make original PDFs the primary source click, with physical pages. */
(()=>{
'use strict';
const payload=document.getElementById('dklaR17PdfRoutes');
if(!payload)return;
let catalog;
try{catalog=JSON.parse(payload.textContent);}catch(err){console.error('DKLA PDF routes cannot be read',err);return;}
if(catalog.format!=='dkla-r17-physical-pdf-routes-v1')return;
const routes=catalog.routes;
const legacy=/^#(?:book|civ|lrs|supp|mallory|civil-syllabus)=/;

function decode(value){try{return decodeURI(String(value||''));}catch{return String(value||'');}}
function route(raw){return routes[decode(raw)]||null;}
function pdfHref(entry){return encodeURI(entry.path)+'#page='+entry.page;}
function label(entry){return entry.kind==='original-opinion'?'Original opinion PDF':entry.kind==='assigned-excerpt'?'Assigned packet PDF excerpt':entry.kind==='pdf-rendering'?'PDF rendering of original Word supplement':entry.kind==='textbook'?'Original textbook PDF':entry.kind==='casebook'?'Original casebook PDF':'Assigned reading PDF';}
function unavailable(raw){if(raw.startsWith('#supp='))return 'Original Contracts supplement PDF unavailable; archived page opens';
 if(raw.startsWith('#mallory='))return 'Original Mallory PDF unavailable; archived page opens';
 if(raw.startsWith('#civil-syllabus='))return 'Original syllabus PDF unavailable; archived page opens';
 return '';
}
function upgradeAnchor(a){
 const raw=decode(a.getAttribute('href'));
 const r=route(raw);
 if(!r){
  const reason=unavailable(raw);
  if(reason&&a.classList.contains('source-link')){
   if(a.title!==reason)a.title=reason;
   const small=a.querySelector('small');if(small&&small.textContent!==reason)small.textContent=reason;
  }
  return;
 }
 a.dataset.originalSource=raw;
 a.setAttribute('href',pdfHref(r));
 a.classList.remove('book-link');a.classList.add('file-link');
 a.title=label(r)+' · physical PDF page '+r.page;
 if(a.hasAttribute('data-dkla-file'))a.dataset.dklaFile=r.path+'#page='+r.page;
 const small=a.querySelector('small');if(small&&small.textContent!==a.title)small.textContent=a.title;
 if(r.kind==='assigned-excerpt'&&a.classList.contains('source-link')){
  for(const child of a.childNodes)if(child.nodeType===Node.TEXT_NODE){
   child.textContent=child.textContent.replace(/full opinion text/i,'assigned packet excerpt');break;
  }
 }
 if(r.kind==='pdf-rendering'&&a.classList.contains('source-link')){
  for(const child of a.childNodes)if(child.nodeType===Node.TEXT_NODE){
   child.textContent=child.textContent.replace(/\(Word file\)/i,'(PDF rendering of supplied Word file)');break;
  }
 }
}
function buttonHash(b){
 if(b.hasAttribute('data-book'))return '#book='+b.dataset.book;
 if(b.hasAttribute('data-civil-page'))return '#civ='+b.dataset.civilPage;
 if(b.hasAttribute('data-lrs-source'))return '#lrs='+b.dataset.lrsSource+':'+b.dataset.lrsPage;
 if(b.hasAttribute('data-supp'))return '#supp='+b.dataset.supp;
 if(b.hasAttribute('data-mallory-page'))return '#mallory='+b.dataset.malloryPage;
 if(b.hasAttribute('data-civil-syllabus'))return '#civil-syllabus='+b.dataset.civilSyllabus;
 return null;
}
function upgradeButton(button){
 const raw=buttonHash(button),r=raw&&route(raw);
 if(!r){const reason=raw&&unavailable(raw);if(reason)button.title=reason;return;}
 const a=document.createElement('a');
 a.className=(button.className?button.className+' ':'')+'file-link source-pdf-button';
 a.href=pdfHref(r);a.textContent=button.textContent;
 a.title=label(r)+' · physical PDF page '+r.page;
 a.dataset.originalSource=raw;
 button.replaceWith(a);
}
function upgradeFileButton(button){
 const raw=decode(button.dataset.dklaFile||button.dataset.file||'');
 const r=route(raw);if(!r)return;
 if(button.hasAttribute('data-dkla-file'))button.dataset.dklaFile=r.path+'#page='+r.page;
 if(button.hasAttribute('data-file')){button.dataset.file=r.path;button.dataset.page=String(r.page);}
 button.title=label(r)+' · physical PDF page '+r.page;
 const sub=button.querySelector('small'),text='Assigned packet excerpt · PDF page '+r.page;
 if(sub&&r.kind==='assigned-excerpt'&&sub.textContent!==text)sub.textContent=text;
}
function upgrade(root){
 if(!root||!root.querySelectorAll)return;
 // A citation link can be inserted later by the reporter-citation pass; it
 // carries a .txt URL as well and must end up at the PDF like source rows.
 root.querySelectorAll('a[href^="#book="],a[href^="#civ="],a[href^="#lrs="],a[href^="#supp="],a[href^="#mallory="],a[href^="#civil-syllabus="],a[href^="added-sources/opinions/"],a[href^="added-sources/Class%2011%20-%20Slaughter%20Supplement."]').forEach(upgradeAnchor);
 root.querySelectorAll('button[data-book],button[data-civil-page],button[data-lrs-source],button[data-supp],button[data-mallory-page],button[data-civil-syllabus]').forEach(upgradeButton);
 root.querySelectorAll('[data-dkla-file],[data-search-type="file"]').forEach(upgradeFileButton);
}

// All route tables are embedded in the HTML. The viewer uses an <object> URL
// pointing straight to a relative PDF; file:// needs no fetch() or network.
// Run on each rebuilt reading panel, so anchors (including context menus) hold
// the PDF URL before the user clicks. Legacy readers survive where PDF absent.
for(const id of ['inspector','modal','searchResults','relationshipLens']){
 const element=document.getElementById(id);if(!element)continue;
 upgrade(element);
 new MutationObserver(()=>upgrade(element)).observe(element,{childList:true,subtree:true});
}

// Capture at window, before the older document-level source listeners, to
// cover a source click even when a panel was just rendered synchronously.
window.addEventListener('click',event=>{
 const target=event.target instanceof Element?event.target:null;
 if(!target)return;
 const link=target.closest('a[href]');
 const fileButton=target.closest('[data-dkla-file],[data-search-type="file"]');
 const b=target.closest('button[data-book],button[data-civil-page],button[data-lrs-source],button[data-supp],button[data-mallory-page],button[data-civil-syllabus]');
 const raw=link?decode(link.getAttribute('href')):fileButton?decode(fileButton.dataset.dklaFile||fileButton.dataset.file):b?buttonHash(b):'';
 const r=route(raw);if(!r)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey){window.open(pdfHref(r),'_blank','noopener');return;}
 window.LegalAtlas?.openFile?.(r.path,r.page,label(r));
},true);

window.DKLA=Object.assign(window.DKLA||{},{pdfRoute:raw=>route(raw)?{...route(raw)}:null,pdfRouteStats:()=>({...catalog.counts})});
})();
