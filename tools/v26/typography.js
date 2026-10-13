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
 // The History block is drawn as the Court's west front: a pediment carrying
 // the title, ten columns, and one sitting justice in each of the nine bays
 // with the Chief Justice in the centre. Outer bounds stay those of the block.
 function court(canvas){
  const data=window.SCOTUSHistory?.data,root=canvas.querySelector('[data-sh-open]'),bg=root?.querySelector('.sh-block-bg');
  const groups=[...canvas.querySelectorAll('[data-sh-seat]')];
  if(!data||!bg||!groups.length||root.dataset.dklaCourt)return;
  root.dataset.dklaCourt='1';
  const x=Number(bg.getAttribute('x')),y=Number(bg.getAttribute('y')),w=Number(bg.getAttribute('width')),h=Number(bg.getAttribute('height'));
  const P=h*.3,E=h*.05,ST=h*.085,inset=w*.008,top=y+P+E,bottom=y+h-ST,cw=w*.014,pad=inset+w*.006,pitch=(w-2*pad-cw)/9;
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
  line(`M${x+w*.12} ${y+P*.9}L${x+w/2} ${y+P*.14}L${x+w*.88} ${y+P*.9}Z`,'dkla-court-line dkla-court-faint');
  line(`M${x+inset} ${top}H${x+w-inset}`);
  el(root,'path',{d:`M${x+inset+w*.004} ${y+P+E/2}H${x+w-inset}`,class:'dkla-court-dentils','stroke-width':E*.3,'stroke-dasharray':`${w*.004} ${w*.004}`});
  el(root,'circle',{cx:x+w/2,cy:y+P*.14,r:h*.008,class:'dkla-court-node'});
  const cap=h*.016,shaftTop=top+cap,shaftBottom=bottom-cap;
  for(let i=0;i<10;i++){
   const cx=x+pad+i*pitch;
   el(root,'rect',{x:cx-cw*.25,y:top,width:cw*1.5,height:cap,class:'dkla-court-column'});
   el(root,'rect',{x:cx,y:shaftTop,width:cw,height:shaftBottom-shaftTop,class:'dkla-court-column'});
   el(root,'rect',{x:cx-cw*.25,y:shaftBottom,width:cw*1.5,height:cap,class:'dkla-court-column'});
   line(`M${cx+cw/3} ${shaftTop}V${shaftBottom}M${cx+cw*2/3} ${shaftTop}V${shaftBottom}`,'dkla-court-line dkla-court-faint');
  }
  const title=root.querySelector('.sh-map-label');
  if(title){
   const size=P*.27;
   for(const [key,value] of Object.entries({x:x+w/2,y:y+P*.8,'font-size':size}))title.setAttribute(key,value);
   title.style.fontSize=size+'px';title.style.opacity='1';root.appendChild(title);
  }
  // Only seats that still exist on the roster date are shown; the History
  // view keeps all eleven lineages, including the two abolished ones.
  const sitting=seat=>seat.appointments.find(a=>a.start<=data.asOf&&(!a.end||data.asOf<a.end));
  const live=data.seats.filter(seat=>seat.created<=data.asOf&&(!seat.abolished||data.asOf<seat.abolished));
  const chief=live.find(seat=>seat.id.startsWith('chief'))||live[0],rest=live.filter(seat=>seat!==chief),half=Math.ceil(rest.length/2);
  const order=[...rest.slice(0,half),chief,...rest.slice(half)],first=Math.max(0,Math.round((9-order.length)/2));
  const names=order.map(seat=>seat.label.replace(/^The /,'').replace(/ seat$/,''));
  const bw=pitch-cw,gap=bw*.07,sprite=getComputedStyle(document.documentElement).getPropertyValue('--sh-sprite').trim().replace(/^url\(["']?|["']?\)$/g,'');
  const fs=Math.min(...names.map(name=>fitted(name,bw*.2,bw-2*gap,false)));
  const pw=Math.min(bw-2*gap,(bottom-top-cap*2-fs*1.5-gap*3)*.8),ph=pw*1.25,py=(top+bottom-ph-gap-fs*1.2)/2;
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
   text(group,names[index],mid,py+ph+gap+fs*.92,fs,'dkla-seat-label');
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
   const size=fitted(label.textContent,Math.min(9.5,h*.46),Math.max(1,w-8));
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
