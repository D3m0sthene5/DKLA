/* Presentation only: native SCOTUS card bounds, seat IDs, and actions survive.
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
  if(!neutral)return;
  const data=window.SCOTUSHistory?.data;if(!data)return;
  const byId=new Map(data.seats.map(seat=>[seat.id,seat]));
  for(const group of canvas.querySelectorAll('[data-sh-seat]')){
   const record=byId.get(group.dataset.shSeat),r=group.querySelector('rect');if(!record||!r)continue;
   const matrix=r.getScreenCTM(),scale=matrix?Math.hypot(matrix.a,matrix.b):0;if(!scale)continue;
   const x=Number(r.getAttribute('x')),y=Number(r.getAttribute('y')),w=Number(r.getAttribute('width')),h=Number(r.getAttribute('height'));
   const width=w*scale,height=h*scale,roomy=width>=80&&height>=62;
   // Short names describe the same seat lineage in compact whole-map views.
   // The untouched full aria-label keeps the original accessible seat name.
   const full=record.label.replace(/^The /,''),label=roomy?full:full==='Chief Justice'&&height<20?'Chief':full.replace(/ seat$/,'');
   for(const old of group.querySelectorAll('text'))old.remove();
   group.dataset.dklaSeatType=roomy?'full':'compact';
   const desired=roomy?14:Math.min(10.5,height*.57),available=Math.max(1,width-(roomy?8:4));
   if(roomy&&fitted(label,desired,available)<13){
    const rows=label.split(/\s+/),size=Math.min(...rows.map(row=>fitted(row,14,available)));
    rows.forEach((row,index)=>text(group,row,x+w/2,y+h/2+(-11+index*17)/scale,size/scale,'dkla-seat-label'));
   }else if(!roomy&&label==='Chief Justice'&&height>=20){
    let size=Math.min(fitted('Chief',9.5,available),fitted('Justice',9.5,available));
    const lines=['Chief','Justice'].map(row=>text(group,row,x+w/2,0,size/scale,'dkla-seat-label'));
    let boxes=lines.map(line=>line.getBBox());
    const gap=1.5/scale,availableHeight=h-2/scale;
    let inkHeight=boxes.reduce((sum,box)=>sum+box.height,0);
    if(inkHeight+gap>availableHeight){
     size*=Math.max(0,(availableHeight-gap)/inkHeight);
     lines.forEach(line=>line.setAttribute('font-size',size/scale));
     boxes=lines.map(line=>line.getBBox());inkHeight=boxes.reduce((sum,box)=>sum+box.height,0);
    }
    let top=y+(h-inkHeight-gap)/2;
    lines.forEach((line,index)=>{line.setAttribute('y',top-boxes[index].y);top+=boxes[index].height+gap;});
   }else{
    text(group,label,x+w/2,y+h/2+(roomy?-5:Math.min(3,height*.24))/scale,fitted(label,desired,available)/scale,'dkla-seat-label');
   }
   if(roomy){
    const meta='Created '+record.created.slice(0,4);
    const wrapped=group.querySelectorAll('.dkla-seat-label').length>1;
    const baseline=Math.min(wrapped?27:17,height/2-5);
    text(group,meta,x+w/2,y+h/2+baseline/scale,fitted(meta,11.5,width-10,false)/scale,'dkla-seat-meta');
   }
  }
  const root=canvas.querySelector('[data-sh-open]'),r=root?.querySelector('.sh-block-bg');
  if(r){
   const scale=Math.hypot(r.getScreenCTM().a,r.getScreenCTM().b),height=Number(r.getAttribute('height'))*scale;
   const title=root.querySelector('.sh-map-label'),sub=root.querySelector('.sh-root-label');
   if(title){
    title.style.fontSize=(height>=100?18:Math.min(10,height*.26))/scale+'px';
    title.setAttribute('font-size',parseFloat(title.style.fontSize));title.style.opacity='1';
    if(height<100)title.setAttribute('y',Number(r.getAttribute('y'))+10/scale);
   }
   if(sub)sub.remove();
  }
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
