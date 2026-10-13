/* Presentation only: the SCOTUS block's outer bounds, seat IDs, and actions survive.
   Read existing seat metadata; never mutate corpus, camera, routes, or storage. */
(() => {
 'use strict';
 if(window.DKLATypography)return;
 const state=window.DKLATypography={ready:false,refresh};
 const NS='http://www.w3.org/2000/svg',measure=document.createElement('canvas').getContext('2d');
 function text(parent,label,x,y,size,cls){
  const node=document.createElementNS(NS,'text');node.textContent=label;
  for(const [key,value] of Object.entries({x,y,'font-size':size,'text-anchor':'middle',class:cls,'pointer-events':'none'}))node.setAttribute(key,value);
  parent.appendChild(node);return node;
 }
 function fitted(label,desired,width,display=true){
  measure.font=`600 ${desired}px ${display?'"DKLA Orbitron"':'"Segoe UI"'}, Arial`;
  return Math.min(desired,desired*width/Math.max(1,measure.measureText(label).width));
 }
 function el(parent,name,attrs){
  const node=document.createElementNS(NS,name);
  for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);
  parent.appendChild(node);return node;
 }
 // Pediment figures in a unit box: feet on y=0, one unit tall, facing +x.
 // Each is [head cx,cy,r], the body outline, then the lighter detail strokes.
 const FIGURES={
  liberty:[[0,-.86,.085],'M-.15 -.75Q0 -.8 .15 -.75L.3 -.34L.34 0H-.34L-.3 -.34Z',
   'M-.36 0V-.98H.36V0M-.3 -.34H.3M0 -.72V-.34M-.46 -.6H.46M-.46 -.6l-.09 .18h.18zM.46 -.6l-.09 .18h.18zM-.15 -.86a.15 .15 0 1 0 .3 0a.15 .15 0 1 0 -.3 0'],
  guardian:[[.02,-.84,.08],'M-.12 -.74L.1 -.74L.16 -.38L.36 -.36V0H-.2L-.18 -.4Z',
   'M.42 -.95V0M.1 -.6L.42 -.55M-.3 0V-.34H-.18M.36 -.99h.12'],
  scholar:[[0,-.82,.085],'M-.14 -.72Q0 -.77 .14 -.72L.24 0H-.24Z',
   'M.12 -.56L.32 -.44M.28 -.52l.14 .04l-.04 .16l-.14 -.04zM0 -.7V0'],
  recliner:[[.5,-.8,.14],'M.66 -.58L.36 -.64L-.05 -.34L-.95 -.2V0H.7Z','M.4 -.5L.15 -.05M-.05 -.34L.1 0']
 };
 // The History block is drawn as the Court's west front: a sculpted pediment,
 // the title on the frieze, eight columns, and nine sitting justices: seven
 // between the columns and one outside each end. Outer bounds stay those of the block.
 function court(canvas){
  const data=window.SCOTUSHistory?.data,root=canvas.querySelector('[data-sh-open]'),bg=root?.querySelector('.sh-block-bg');
  const groups=[...canvas.querySelectorAll('[data-sh-seat]')];
  if(!data||!bg||!groups.length||root.dataset.dklaCourt)return;
  root.dataset.dklaCourt='1';
  const x=Number(bg.getAttribute('x')),y=Number(bg.getAttribute('y')),w=Number(bg.getAttribute('width')),h=Number(bg.getAttribute('height'));
  const P=h*.27,E=h*.12,ST=h*.085,inset=w*.008,top=y+P+E,bottom=y+h-ST,cw=w*.014,pad=inset+w*.006,pitch=(w-2*pad-cw)/9;
  for(const old of root.querySelectorAll('path,.sh-root-label'))old.remove();
  const line=(d,cls='dkla-court-line')=>el(root,'path',{d,class:cls});
  // Steps widen from the colonnade to the block's full width.
  for(let i=0;i<3;i++){
   const grow=inset*(2-i)/3;
   el(root,'rect',{x:x+grow,y:bottom+i*ST/3,width:w-2*grow,height:ST/3,class:'dkla-court-step'});
  }
  // The original rectangle stays as the block's bounds and click target.
  el(root,'rect',{x:x+inset,y:y+P,width:w-2*inset,height:h-P-ST,class:'dkla-court-body'});
  line(`M${x} ${y+P}L${x+w/2} ${y}L${x+w} ${y+P}Z`,'dkla-court-pediment');
  // Tympanum: nine abstract figures after the west pediment's sculpture group,
  // an enthroned Liberty with scales between two guardians, councillors beyond
  // them and a reclining figure in each corner. Each stands on the tympanum
  // floor, faces the centre and is sized to the slope above it.
  const mx=x+w/2,tb=y+P*.92,ta=y+P*.12,hw=w*.4,dash=`${w*.004} ${w*.004}`;
  el(root,'path',{d:`M${x+w*.05} ${y+P*.96}L${mx} ${y+P*.06}L${x+w*.95} ${y+P*.96}`,class:'dkla-court-dentils','stroke-width':P*.028,'stroke-dasharray':dash});
  line(`M${mx-hw} ${tb}L${mx} ${ta}L${mx+hw} ${tb}Z`,'dkla-court-line dkla-court-faint');
  for(const [u,pose,k] of [[-.6,'recliner',.62],[-.42,'scholar',.84],[-.29,'scholar',.84],[-.15,'guardian',.84],[0,'liberty',.86],[.15,'guardian',.84],[.29,'scholar',.84],[.42,'scholar',.84],[.6,'recliner',.62]]){
   const size=(tb-ta)*(1-Math.abs(u))*k,[head,body,detail]=FIGURES[pose];
   const figure=el(root,'g',{transform:`translate(${mx+u*hw} ${tb}) scale(${u>0?-size:size} ${size})`,class:'dkla-court-figure'+(u?'':' dkla-court-liberty')});
   el(figure,'path',{d:detail,class:'dkla-court-figure-detail'});el(figure,'path',{d:body});
   el(figure,'circle',{cx:head[0],cy:head[1],r:head[2]});
  }
  el(root,'circle',{cx:mx,cy:ta,r:h*.007,class:'dkla-court-node'});
  // Frieze: the title sits where the building carries its inscription.
  const size=E*.56,clear=size*6.4;
  line(`M${x+inset} ${top}H${x+w-inset}`);
  el(root,'path',{d:`M${x+inset+w*.02} ${y+P+E/2}H${mx-clear}M${mx+clear} ${y+P+E/2}H${x+w-inset-w*.02}`,class:'dkla-court-dentils','stroke-width':E*.2,'stroke-dasharray':dash});
  const cap=h*.016,shaftTop=top+cap,shaftBottom=bottom-cap;
  // The building has eight columns, so the two end seats sit outside them.
  for(let i=1;i<9;i++){
   const cx=x+pad+i*pitch;
   el(root,'rect',{x:cx-cw*.25,y:top,width:cw*1.5,height:cap,class:'dkla-court-column'});
   el(root,'rect',{x:cx,y:shaftTop,width:cw,height:shaftBottom-shaftTop,class:'dkla-court-column'});
   el(root,'rect',{x:cx-cw*.25,y:shaftBottom,width:cw*1.5,height:cap,class:'dkla-court-column'});
   line(`M${cx+cw/3} ${shaftTop}V${shaftBottom}M${cx+cw*2/3} ${shaftTop}V${shaftBottom}`,'dkla-court-line dkla-court-faint');
  }
  const title=root.querySelector('.sh-map-label');
  if(title){
   for(const [key,value] of Object.entries({x:mx,y:y+P+E/2+size*.36,'font-size':size}))title.setAttribute(key,value);
   for(const row of title.querySelectorAll('tspan'))row.setAttribute('x',mx);
   title.style.fontSize=size+'px';title.style.opacity='1';root.appendChild(title);
  }
  // Only seats that still exist on the roster date are shown; the History
  // view keeps all eleven lineages, including the two abolished ones.
  const sitting=seat=>seat.appointments.find(a=>a.start<=data.asOf&&(!a.end||data.asOf<a.end));
  const live=data.seats.filter(seat=>seat.created<=data.asOf&&(!seat.abolished||data.asOf<seat.abolished));
  // Bench order: the Chief Justice in the centre, the senior associate at the
  // Chief's right hand (the viewer's left), then alternating outward by seniority.
  const since=seat=>{const a=sitting(seat);return (data.people[a?.justice]?.service||[]).map(s=>s.start).sort()[0]||a?.start||'9999';};
  const chief=live.find(seat=>seat.id.startsWith('chief'))||live[0],centre=Math.floor(live.length/2),order=[];
  order[centre]=chief;
  live.filter(seat=>seat!==chief).sort((a,b)=>since(a)<since(b)?-1:since(a)>since(b)?1:0)
   .forEach((seat,rank)=>{order[centre+(rank%2?1:-1)*(Math.floor(rank/2)+1)]=seat;});
  const first=Math.max(0,Math.round((9-order.length)/2));
  // "Todd's / Seat": the name under a portrait is the seat's, not the justice's.
  const names=order.map(seat=>/ seat$/.test(seat.label)?[seat.label.replace(/^The /,'').replace(/ seat$/,'')+'\u2019s','Seat']:seat.label.split(' '));
  const bw=pitch-cw,gap=bw*.07,sprite=getComputedStyle(document.documentElement).getPropertyValue('--sh-sprite').trim().replace(/^url\(["']?|["']?\)$/g,'');
  const fs=Math.min(...names.flat().map(row=>fitted(row,bw*.185,bw-2*gap,false))),lead=fs*1.16,lines=Math.max(...names.map(rows=>rows.length));
  const pw=Math.min(bw-2*gap,(bottom-top-cap*2-lead*lines-fs*.4-gap*3)*.8),ph=pw*1.25,py=(top+bottom-ph-gap-lead*lines)/2;
  for(const group of groups){
   const index=order.findIndex(seat=>seat.id===group.dataset.shSeat),r=group.querySelector('rect');
   if(index<0||!r){group.remove();continue;}
   const bx=x+pad+cw+(first+index)*pitch,mid=bx+bw/2,person=data.people[sitting(order[index])?.justice];
   for(const old of group.querySelectorAll('text'))old.remove();
   delete group.dataset.dklaSeatType;group.classList.add('dkla-court-seat');
   for(const [key,value] of Object.entries({x:bx,y:top+cap,width:bw,height:bottom-top-cap*2,rx:gap}))r.setAttribute(key,value);
   if(person&&sprite){
    const f=person.frame,frame=el(group,'svg',{x:mid-pw/2,y:py,width:pw,height:ph,viewBox:`${f.x} ${f.y} ${f.w} ${f.h}`,preserveAspectRatio:'xMidYMid slice','pointer-events':'none'});
    el(frame,'image',{href:sprite,width:data.sprite.width,height:data.sprite.height});
    el(group,'title',{}).textContent=`${order[index].label} · ${person.name}`;
   }
   el(group,'rect',{x:mid-pw/2,y:py,width:pw,height:ph,class:'dkla-court-frame','pointer-events':'none'});
   // One text element per seat, so wrapped rows count as a single label.
   const label=text(group,'',mid,py+ph+gap+fs*.92,fs,'dkla-seat-label');
   names[index].forEach((row,i)=>{el(label,'tspan',{x:mid,dy:i?lead:0}).textContent=row;});
  }
 }
 function refresh(){
  if(typeof S==='undefined')return;
  const neutral=S.scope==='Atlas'&&!S.region&&!S.district&&!selected&&!S.panelOpen;
  const hint=document.getElementById('mapHint'),hideHint=neutral&&hint&&/^Three courses[\s·]/.test(hint.textContent.trim());
  if(hideHint){if(state.hintWasHidden===undefined)state.hintWasHidden=hint.hidden;hint.hidden=true;}
  else if(hint&&state.hintWasHidden!==undefined){hint.hidden=state.hintWasHidden;delete state.hintWasHidden;}
  const canvas=document.getElementById('geoCanvas');if(!canvas)return;
  for(const label of canvas.querySelectorAll('text[data-map-region="workbench-region"]')){
   if(label.textContent.trim()==='Notes')label.dataset.dklaDisplayLabel='notes';
   else delete label.dataset.dklaDisplayLabel;
  }
  court(canvas);
  if(!neutral)return;
  // Only the requested home presentation strings change; IDs and course data
  // retain their full original names, including in links and saved graphs.
  for(const heading of canvas.querySelectorAll('text[data-study-scope="Legislation and the Regulatory State"]')){
   if(!heading.classList.contains('course-label'))continue;
   const y=Number(heading.getAttribute('y')),rows=heading.querySelectorAll('tspan');
   if(rows.length>1)heading.setAttribute('y',y+(rows.length-1)*Number(heading.getAttribute('font-size'))*1.23/2);
   heading.textContent='LRS';
  }
  for(const group of canvas.querySelectorAll('.r19-tile')){
   const r=group.querySelector('rect'),label=group.querySelector('text');if(!r||!label)continue;
   const scale=Math.hypot(r.getScreenCTM().a,r.getScreenCTM().b),w=Number(r.getAttribute('width'))*scale,h=Number(r.getAttribute('height'))*scale;
   const size=fitted(label.textContent,Math.min(10.5,h*.5),Math.max(1,w-8),false);
   label.setAttribute('font-size',size/scale);label.style.fontSize=size/scale+'px';label.style.opacity='1';
  }
 }
 function install(){
  if(!window.DKLAHomeFit?.ready||!window.SCOTUSHistory?.data||typeof draw!=='function'){setTimeout(install,80);return;}
  const previous=draw;draw=function(...args){const result=previous.apply(this,args);refresh();return result;};
  state.ready=true;refresh();document.fonts.ready.then(()=>{if(state.ready)draw();});
 }
 install();
})();
