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
 // Sculpture in a unit box: feet on y=0, one unit tall, facing +x.
 // Each is [circles as cx,cy,r], the solid outline, then the lighter detail strokes.
 // East pediment, "Justice, the Guardian of Liberty" (Hermon MacNeil), in the
 // order of the Court's own information sheet and its photograph, left to
 // right: the hare; study and pondering of judgments; a shield (disputes
 // between states); the means of enforcing the law, a man and a youth bearing
 // the fasces; Confucius; Moses with a tablet in each hand; Solon; justice
 // tempered with mercy, with a youth; a shield (the Court's maritime and other
 // functions); a tribute to the Court's supreme character; the tortoise.
 const FIGURES={
  moses:[[[0,-.85,.09]],'M-.2 -.73Q0 -.79 .2 -.73L.3 -.36L.34 0H-.34L-.3 -.36ZM-.6 -.18L-.56 -.66H-.34L-.32 -.18ZM.32 -.18L.34 -.66H.56L.6 -.18Z',
   'M-.07 -.79L0 -.58L.07 -.79M-.3 -.36H.3M-.2 -.68L-.36 -.62M.2 -.68L.36 -.62M-.52 -.54h.15M-.53 -.43h.17M-.54 -.32h.19M.37 -.54h.15M.36 -.43h.17M.35 -.32h.19'],
  confucius:[[[0,-.87,.075],[0,-.975,.032]],'M-.13 -.77Q0 -.82 .13 -.77L.21 -.5L.17 0H-.17L-.21 -.5Z',
   'M-.21 -.5Q0 -.34 .21 -.5M-.04 -.79L0 -.58L.04 -.79M0 -.34V0'],
  solon:[[[0,-.87,.075]],'M-.14 -.77Q0 -.82 .14 -.77L.18 -.3L.15 0H-.15L-.18 -.3Z',
   'M.14 -.77L-.17 -.32M-.1 -.55L.12 -.1M.16 -.52h.16v.07h-.16z'],
  enforcer:[[[.02,-.84,.08],[-.42,-.5,.055]],'M-.12 -.74L.1 -.74L.16 -.38L.34 -.36V0H-.2L-.18 -.4ZM-.49 -.44h.14l.04 .44h-.22Z',
   'M-.56 -1h.98v.1h-.98ZM-.36 -1v.1M-.14 -1v.1M.08 -1v.1M.3 -1v.1M.1 -.72L.3 -.9M-.42 -.56V-.9'],
  mercy:[[[.02,-.82,.08],[-.42,-.5,.055]],'M-.12 -.72L.1 -.72L.16 -.38L.34 -.32V0H-.2L-.18 -.4ZM-.49 -.44h.14l.04 .44h-.22Z',
   'M-.1 -.62L-.36 -.54M.1 -.6L.3 -.46'],
  shield:[[[-.14,-.8,.08],[.2,-.3,.27],[.2,-.3,.12]],'M-.26 -.7L-.02 -.7L.06 -.3L-.1 0H-.7L-.42 -.3Z','M.2 -.57V-.03M-.07 -.3H.47'],
  study:[[[.5,-.8,.14]],'M.66 -.58L.36 -.64L-.05 -.34L-.95 -.2V0H.7Z','M.4 -.5L.15 -.05M.05 -.32h.24v.14h-.24z'],
  tribute:[[[.5,-.8,.14]],'M.66 -.58L.36 -.64L-.05 -.34L-.95 -.2V0H.7Z','M.4 -.5L.15 -.05M-.05 -.34L.1 0'],
  hare:[[[.42,-.42,.17]],'M-.5 0Q-.52 -.5 0 -.52Q.36 -.5 .5 -.2V0ZM.34 -.56L.26 -1L.44 -.58ZM.46 -.56L.5 -.96L.58 -.5Z','M-.5 -.1q-.1 -.02 -.1 -.1'],
  tortoise:[[[.74,-.2,.14]],'M-.6 0Q-.6 -.78 0 -.78Q.6 -.78 .6 0Z','M-.3 -.62L-.18 0M.3 -.62L.18 0M-.56 -.36H.56'],
  // The two seated statues beside the steps (James Earle Fraser), seen from
  // the front. Contemplation of Justice rests her left arm on a book of laws
  // and holds a small figure of Justice; Authority of Law holds the tablet of
  // laws with the sheathed sword behind it.
  contemplation:[[[0,-.86,.085],[-.36,-.6,.035]],'M-.2 -.74Q0 -.82 .2 -.74L.27 -.42L.34 -.36L.3 0H-.3L-.34 -.36L-.27 -.42ZM-.41 -.56h.1l.03 .2h-.16ZM.26 -.5h.26v.12h-.26Z',
   'M-.11 -.82Q0 -1 .11 -.82M-.38 0V-.62M.38 0V-.62M-.38 -.62H-.2M.38 -.62H.2M-.3 -.36H.3M-.1 -.36L-.14 0M.1 -.36L.14 0'],
  authority:[[[0,-.87,.085]],'M-.24 -.75Q0 -.81 .24 -.75L.28 -.42L.34 -.36L.3 0H-.3L-.34 -.36L-.28 -.42ZM.26 -.64h.24v.56h-.24Z',
   'M.38 -.64V-.98M.3 -.86h.16M.31 -.5h.14M.31 -.4h.14M.31 -.3h.14M-.38 0V-.62M-.38 -.62H-.22M-.3 -.36H.26']
 };
 // What each figure is, and what a click opens: a Wikipedia article by name,
 // or a full address. The allegorical groups have no article of their own, so
 // they open the building's; the two statues open the Court's own sheets.
 const BUILDING='United_States_Supreme_Court_Building',SUBJECTS={
  moses:['Moses','Moses'],confucius:['Confucius','Confucius'],solon:['Solon','Solon'],
  enforcer:['The means of enforcing the law',BUILDING],mercy:['Justice tempered with mercy',BUILDING],
  shield:['The settlement of disputes between states',BUILDING],'shield-right':['The maritime and other functions of the Court',BUILDING],
  study:['Study and pondering of judgments',BUILDING],tribute:['The supreme character of the Court',BUILDING],
  hare:['The Hare','The_Tortoise_and_the_Hare'],tortoise:['The Tortoise','The_Tortoise_and_the_Hare'],
  contemplation:['Contemplation of Justice','https://www.supremecourt.gov/about/infosheets/ContemplationOfJustice.html'],
  authority:['Authority of Law','https://www.supremecourt.gov/about/infosheets/authorityOfLawt.html']
 };
 // A Corinthian capital in a unit square: abacus and bell, then acanthus leaves.
 const CAPITAL=['M-.06 0H1.06V.13H-.06ZM.15 1C.15 .62 .02 .46 -.02 .13H1.02C.98 .46 .85 .62 .85 1Z',
  'M.2 1Q.14 .74 .3 .68Q.27 .84 .36 1M.42 1Q.4 .66 .5 .6Q.6 .66 .58 1M.64 1Q.73 .84 .7 .68Q.86 .74 .8 1M.1 .6Q.1 .4 .26 .36M.9 .6Q.9 .4 .74 .36M.36 .56Q.38 .34 .5 .3Q.62 .34 .64 .56',
  [[.06,.27,.09],[.94,.27,.09],[.5,.2,.05]]];
 // The History block is drawn as the Court building, joining its two fronts:
 // the east pediment's sculpture, the title on the frieze, eight Corinthian
 // columns, the west steps with their two statues, and nine sitting justices,
 // seven between the columns and one outside each end. Outer bounds stay
 // those of the block.
 function court(canvas){
  const data=window.SCOTUSHistory?.data,root=canvas.querySelector('[data-sh-open]'),bg=root?.querySelector('.sh-block-bg');
  const groups=[...canvas.querySelectorAll('[data-sh-seat]')];
  if(!data||!bg||!groups.length||root.dataset.dklaCourt)return;
  root.dataset.dklaCourt='1';
  const x=Number(bg.getAttribute('x')),y=Number(bg.getAttribute('y')),w=Number(bg.getAttribute('width')),h=Number(bg.getAttribute('height'));
  // The walls stand in from the block's edges to leave room for the statues;
  // the roof overhangs the walls by the eave.
  const P=h*.28,E=h*.11,ST=h*.085,side=w*.052,eave=side*.4,top=y+P+E,bottom=y+h-ST,cw=w*.0125,pad=side+w*.004,pitch=(w-2*pad-cw)/9;
  const mx=x+w/2,hb=w/2-side+eave;
  for(const old of root.querySelectorAll('path,.sh-root-label'))old.remove();
  const line=(d,cls='dkla-court-line')=>el(root,'path',{d,class:cls});
  // Each figure is a link to its Wikipedia article. The links sit in their own
  // layer above the block, outside its click target, so a click on a figure
  // opens the article instead of SCOTUS History.
  const layer=el(canvas,'g',{class:'dkla-court-links'});
  function sculpt(pose,cx,base,size,mirror,cls){
   const [name,article]=SUBJECTS[pose+(mirror?'-right':'')]||SUBJECTS[pose];
   const site=article.startsWith('https://')?'supremecourt.gov':'Wikipedia';
   const link=el(layer,'a',{href:site==='Wikipedia'?'https://en.wikipedia.org/wiki/'+article:article,target:'_blank',rel:'noopener','aria-label':name+' ('+site+')',class:'dkla-court-link'});
   for(const type of ['click','pointerdown'])link.addEventListener(type,event=>event.stopPropagation());
   el(link,'title',{}).textContent=name+' · '+site;
   const [circles,body,detail]=FIGURES[pose],figure=el(link,'g',{transform:`translate(${cx} ${base}) scale(${mirror?-size:size} ${size})`,class:cls});
   el(figure,'rect',{x:-.6,y:-1,width:1.2,height:1,class:'dkla-court-hit'});
   el(figure,'path',{d:detail,class:'dkla-court-figure-detail'});el(figure,'path',{d:body});
   for(const [ccx,cy,r] of circles)el(figure,'circle',{cx:ccx,cy,r});
  }
  // Steps widen from the walls to the roof line.
  for(let i=0;i<3;i++){
   const out=eave*(i+1)/3;
   el(root,'rect',{x:x+side-out,y:bottom+i*ST/3,width:w-2*(side-out),height:ST/3,class:'dkla-court-step'});
  }
  // The original rectangle stays as the block's bounds and click target.
  el(root,'rect',{x:x+side,y:y+P,width:w-2*side,height:h-P-ST,class:'dkla-court-body'});
  // A statue on its pedestal at each end of the steps, as on the west front:
  // Contemplation of Justice on the left, Authority of Law on the right.
  const pedW=side*.8,pedH=ST*1.5,statue=h*.21;
  for(const [pose,px] of [['contemplation',x],['authority',x+w-pedW]]){
   el(root,'rect',{x:px,y:y+h-pedH,width:pedW,height:pedH,class:'dkla-court-step'});
   el(root,'rect',{x:px-pedW*.04,y:y+h-pedH,width:pedW*1.08,height:pedH*.14,class:'dkla-court-step'});
   sculpt(pose,px+pedW/2,y+h-pedH,statue,false,'dkla-court-figure dkla-court-statue');
  }
  line(`M${mx-hb} ${y+P}L${mx} ${y}L${mx+hb} ${y+P}Z`,'dkla-court-pediment');
  // Tympanum: each figure stands on its floor, faces the centre and is sized
  // to the slope above it.
  const tb=y+P*.93,ta=y+P*.1,hw=hb*.83,dash=`${w*.004} ${w*.004}`;
  el(root,'path',{d:`M${mx-hb*.9} ${y+P*.96}L${mx} ${y+P*.06}L${mx+hb*.9} ${y+P*.96}`,class:'dkla-court-dentils','stroke-width':P*.028,'stroke-dasharray':dash});
  line(`M${mx-hw} ${tb}L${mx} ${ta}L${mx+hw} ${tb}Z`,'dkla-court-line dkla-court-faint');
  for(const [u,pose,k] of [[-.76,'hare',.78],[-.6,'study',.74],[-.45,'shield',.9],[-.3,'enforcer',.92],[-.145,'confucius',.92],[0,'moses',.95],[.145,'solon',.92],[.3,'mercy',.92],[.45,'shield',.9],[.6,'tribute',.74],[.76,'tortoise',.66]])
   sculpt(pose,mx+u*hw,tb,(tb-ta)*(1-Math.abs(u))*k,u>0,'dkla-court-figure'+(u?'':' dkla-court-liberty'));
  // Frieze: the title sits where the building carries its inscription.
  const size=E*.56,clear=size*6.4;
  line(`M${mx-hb} ${top}H${mx+hb}`);
  el(root,'path',{d:`M${x+side+w*.02} ${y+P+E/2}H${mx-clear}M${mx+clear} ${y+P+E/2}H${x+w-side-w*.02}`,class:'dkla-court-dentils','stroke-width':E*.2,'stroke-dasharray':dash});
  const cap=h*.016,capital=h*.05,shaftTop=top+capital,shaftBottom=bottom-cap;
  // The building has eight columns, so the two end seats sit outside them.
  // As built, the two at each end are square piers and the middle four are
  // round: piers are wider with flat, even flutes and a sharp base; round
  // shafts taper upward, crowd their flutes toward the edges and stand on a
  // rounded base. All eight carry Corinthian capitals.
  for(let i=1;i<9;i++){
   const round=i>2&&i<7,sw=round?cw:cw*1.3,cx=x+pad+i*pitch+(cw-sw)/2,block=sw*1.5;
   el(root,'rect',{x:cx+(sw-block)/2,y:shaftBottom,width:block,height:cap,rx:round?cap*.5:0,class:'dkla-court-column'});
   if(round){
    const t=sw*.08,at=f=>`M${cx+t+(sw-2*t)*f} ${shaftTop}L${cx+sw*f} ${shaftBottom}`;
    line(`M${cx+t} ${shaftTop}H${cx+sw-t}L${cx+sw} ${shaftBottom}H${cx}Z`,'dkla-court-column');
    line([.13,.3,.5,.7,.87].map(at).join(''),'dkla-court-line dkla-court-faint');
   }else{
    el(root,'rect',{x:cx,y:shaftTop,width:sw,height:shaftBottom-shaftTop,class:'dkla-court-column'});
    line([.25,.5,.75].map(f=>`M${cx+sw*f} ${shaftTop}V${shaftBottom}`).join(''),'dkla-court-line dkla-court-faint');
   }
   const crown=el(root,'g',{transform:`translate(${cx+(sw-block)/2} ${top}) scale(${block} ${capital})`,class:'dkla-court-capital'});
   el(crown,'path',{d:CAPITAL[0]});el(crown,'path',{d:CAPITAL[1],class:'dkla-court-figure-detail'});
   for(const [ccx,cy,r] of CAPITAL[2])el(crown,'ellipse',{cx:ccx,cy,rx:r,ry:r*block/capital});
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
  const pw=Math.min(bw-2*gap,(shaftBottom-shaftTop-lead*lines-fs*.4-gap*3)*.8),ph=pw*1.25,py=(shaftTop+shaftBottom-ph-gap-lead*lines)/2;
  for(const group of groups){
   const index=order.findIndex(seat=>seat.id===group.dataset.shSeat),r=group.querySelector('rect');
   if(index<0||!r){group.remove();continue;}
   const bx=x+pad+cw+(first+index)*pitch,mid=bx+bw/2,person=data.people[sitting(order[index])?.justice];
   for(const old of group.querySelectorAll('text'))old.remove();
   delete group.dataset.dklaSeatType;group.classList.add('dkla-court-seat');
   for(const [key,value] of Object.entries({x:bx,y:shaftTop,width:bw,height:shaftBottom-shaftTop,rx:gap}))r.setAttribute(key,value);
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
