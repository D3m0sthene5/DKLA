// ---- r11: one continuous scene. At the floor zoom the atlas is a spiral galaxy, one arm per course; as the reader zooms in,
// every entry slides from its star to its saved home while the course blocks, subjects and subtopics fade in around it,
// and cards take over from stars when they are wide enough to read. Labels are measured with a canvas, placed in priority
// order on a screen-space grid, and faded rather than popped (after Been et al. 2006 and the Mapbox label engine).
const R11={headroom:new Map(),galaxyKey:'',galaxy:null,labelState:new Map(),fades:new Map(),measure:new Map(),ctx:document.createElement('canvas').getContext('2d'),lastT:null,focus:null,anim:false,frame:0,dt:16,lastFrame:0,districtCards:new Set(),starIndex:[],dragMoved:false};
const R11_FAMILY={sans:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',serif:'Georgia,"Times New Roman",serif'};
const ARM_COLORS={Contracts:'#daba83','Civil Procedure':'#88badd','Legislation and the Regulatory State':'#9fc8ae','Study notes':'#9fb3c4'};
const ARM_BASE={Contracts:Math.PI,'Civil Procedure':Math.PI/3,'Legislation and the Regulatory State':-Math.PI/3};
function regionCourse(r){if(!r)return null;if(r.courseKey)return r.courseKey;if(r.col<3)return 'Contracts';if(r.course)return r.course;return r.id.startsWith('cp-')||r.id==='civil-region'?'Civil Procedure':'Study notes';}
function courseBlocks(){const M=mapData();if(M.courseBlocks)return M.courseBlocks;const out={};for(const r of M.regions){const k=regionCourse(r);if(k==='Study notes')continue;const b=out[k]||(out[k]={x:r.x,y:r.y,x2:r.x+r.w,y2:r.y+r.h});b.x=Math.min(b.x,r.x);b.y=Math.min(b.y,r.y);b.x2=Math.max(b.x2,r.x+r.w);b.y2=Math.max(b.y2,r.y+r.h);}for(const b of Object.values(out)){b.w=b.x2-b.x;b.h=b.y2-b.y;}return M.courseBlocks=out;}
function galaxy(){const M=mapData(),key=data.nodes.length+':'+M.layoutId+':'+Object.keys(M.homes).length;if(R11.galaxyKey===key&&R11.galaxy)return R11.galaxy;R11.galaxyKey=key;
 const blocks=courseBlocks(),names=Object.keys(blocks),all=bounds(Object.values(blocks));const cx=all.x+all.w/2,cy=all.y+all.h/2,R1=all.w*1.35,R0=R1*.13,TWIST=1.9;
 const hash=s=>{let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return ((h>>>0)%1000)/1000;};
 const stepOf=new Map(M.regions.map((r,i)=>[r.id,r.step??(50+i)]));
 const byCourse={};for(const c of names)byCourse[c]=[];const loose=[];
 for(const n of data.nodes){const h=M.homes[n.id];if(!h)continue;const c=regionCourse(regionFor(h.region));if(byCourse[c])byCourse[c].push(n);else loose.push(n);}
 const pts=new Map(),regionLabels=[],courseLabels=[],centroid={};
 for(const c of names){const list=byCourse[c];list.sort((a,b)=>{const ha=M.homes[a.id],hb=M.homes[b.id];const ra=stepOf.get(ha.region)??99,rb=stepOf.get(hb.region)??99;if(ra!==rb)return ra-rb;if(ha.district!==hb.district)return String(ha.district).localeCompare(String(hb.district));const ka=a.kind==='Case'?0:a.kind==='Concept'||a.kind==='Rule'?1:2,kb=b.kind==='Case'?0:b.kind==='Concept'||b.kind==='Rule'?1:2;return ka-kb;});
  const n=list.length,base=ARM_BASE[c]??0;let sx=0,sy=0,segStart=0;
  list.forEach((node,i)=>{const t=i/Math.max(1,n-1),h1=hash(node.id),h2=hash(node.id+'y');const r=R0+t*(R1-R0)+(h1-.5)*R1*.1,ang=base+t*TWIST+(h2-.5)*.22;const x=cx+r*Math.cos(ang),y=cy+r*Math.sin(ang);pts.set(node.id,{x,y,c});sx+=x;sy+=y;
   const reg=M.homes[node.id].region,next=list[i+1],nreg=next?M.homes[next.id].region:null;
   if(reg!==nreg||!next){const count=i-segStart+1;if(count>=8){const mid=(segStart+i)/2/Math.max(1,n-1),rm=R0+mid*(R1-R0),am=base+mid*TWIST;regionLabels.push({id:reg,x:cx+(rm+R1*.075)*Math.cos(am),y:cy+(rm+R1*.075)*Math.sin(am),count});}segStart=i+1;}});
  centroid[c]={x:sx/Math.max(1,n),y:sy/Math.max(1,n)};const a=base+TWIST+.1,tip=R1*1.1;courseLabels.push({course:c,x:cx+tip*Math.cos(a),y:cy+tip*Math.sin(a),count:n});}
 loose.forEach(node=>{const h1=hash(node.id),h2=hash(node.id+'y');const r=R0*.8*Math.sqrt(h1),ang=h2*Math.PI*2;pts.set(node.id,{x:cx+r*Math.cos(ang),y:cy+r*Math.sin(ang),c:'Study notes'});});
 const cross=data.edges.filter(e=>{const a=pts.get(e.source),b=pts.get(e.target);return a&&b&&a.c!==b.c&&a.c!=='Study notes'&&b.c!=='Study notes';});
 const dust=[];for(let i=0;i<160;i++){const h=(i*7919%1000)/1000,k=(i*104729%1000)/1000;dust.push({x:cx+(h-.5)*R1*2.6,y:cy+(k-.5)*R1*2.3,r:.6+((i*31)%3)*.4,o:.1+((i*17)%5)*.05});}
 return R11.galaxy={cx,cy,R0,R1,pts,regionLabels,courseLabels,centroid,cross,dust,blocks,box:{x:cx-R1*1.28,y:cy-R1*1.22,w:R1*2.56,h:R1*2.44}};}
// The morph band: below z0 the scene is the galaxy, above z1 it is the map. z0 fits the galaxy; z1 fits the smallest course block.
function morphBand(){const g=galaxy(),a=safeArea();const z0=Math.min(a.w/g.box.w,a.h/g.box.h);let z1=Infinity;for(const b of Object.values(g.blocks))z1=Math.min(z1,Math.min((a.w-40)/b.w,(a.h-40)/b.h));z1=Math.min(z1*.92,.7);if(!(z1>z0*2.2))z1=z0*2.2;return {z0,z1};}
function morphT(z,band=morphBand()){const u=Math.min(1,Math.max(0,(Math.log(z)-Math.log(band.z0))/(Math.log(band.z1)-Math.log(band.z0))));return u*u*(3-2*u);}
function nodePos(id,t){const h=homeFor(id);if(!h)return null;const hx=h.x+h.w/2,hy=h.y+h.h/2,c=regionCourse(regionFor(h.region));if(t>=1)return {x:hx,y:hy,c};const g=galaxy().pts.get(id);if(!g)return {x:hx,y:hy,c};return {x:g.x+(hx-g.x)*t,y:g.y+(hy-g.y)*t,c:g.c};}
function headroom(r){const M=mapData(),key=M.layoutId+':'+r.id;let v=R11.headroom.get(key);if(v===undefined){v=Infinity;for(const id of r.districtIds||[]){const d=M.districts[id];if(d)v=Math.min(v,d.y-r.y);}R11.headroom.set(key,v);}return v;}
function coursePoint(c,t){const g=galaxy(),b=g.blocks[c],a=g.centroid[c];if(!b||!a)return null;return {x:a.x+(b.x+b.w/2-a.x)*t,y:a.y+(b.y+b.h/2-a.y)*t};}
function nearestEntryAt(p,t){let best=null,bd=Infinity;for(const [id] of galaxy().pts){const q=nodePos(id,t);if(!q)continue;const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bd){bd=d;best=id;}}return best;}
// While the reader zooms through the band, the camera rides with the entry under the pointer, so the point being zoomed on
// stays put while its star becomes its home (or the reverse), the way a fractal zoom keeps its focus.
function morphFollow(t){const prev=R11.lastT;R11.lastT=t;if(prev===null||prev===t||R11.anim)return;
 if(!R11.focus)R11.focus=nearestEntryAt(S.zoomAnchor||mapCenterVisible(),prev);if(!R11.focus)return;
 const a=nodePos(R11.focus,prev),b=nodePos(R11.focus,t);if(a&&b){S.x+=b.x-a.x;S.y+=b.y-a.y;}
 if(t<=0||t>=1)R11.focus=null;}
function autoScope(t){if(R11.anim)return;if(t<1){if(S.scope!=='Atlas'){S.scope='Atlas';S.region=null;S.district=null;renderHeading();}}else if(S.scope==='Atlas'){const c=mapCenterVisible();let best=null,bd=Infinity;for(const [name,b] of Object.entries(galaxy().blocks)){const d=Math.hypot(Math.max(b.x-c.x,0,c.x-b.x-b.w),Math.max(b.y-c.y,0,c.y-b.y-b.h));if(d<bd){bd=d;best=name;}}if(best){S.scope=best;renderHeading();}}}
function zoomFloor(){return morphBand().z0;}
function clampCamera(active){if(!data.studyMap)return;const band=morphBand();if(S.z<band.z0)S.z=band.z0;const t=morphT(S.z,band);const a=safeArea(),aw=a.w/S.z,ah=a.h/S.z,c=mapCenterVisible();
 let b;if(t<1)b=galaxy().box;else{if(S.scope==='Atlas')return;b=bounds([...scopeRegions(),...[...(active||[])].map(id=>homeFor(id))]);}
 let lo=b.x+aw/2-aw*.3,hi=b.x+b.w-aw/2+aw*.3;const cx=lo>hi?b.x+b.w/2:Math.min(hi,Math.max(lo,c.x));lo=b.y+ah/2-ah*.3;hi=b.y+b.h-ah/2+ah*.3;const cy=lo>hi?b.y+b.h/2:Math.min(hi,Math.max(lo,c.y));S.x+=cx-c.x;S.y+=cy-c.y;}
// ---- Measured text. Widths come from a canvas at 100 px and scale linearly, so wrapping never overflows its box.
function fam(cls){return /region-title|serif/.test(cls||'')?R11_FAMILY.serif:R11_FAMILY.sans;}
function measure(s,fs,weight=400,cls=''){const k=weight+'|'+fam(cls)+'|'+s;let w=R11.measure.get(k);if(w===undefined){R11.ctx.font=`${weight} 100px ${fam(cls)}`;w=R11.ctx.measureText(s).width;if(R11.measure.size>20000)R11.measure.clear();R11.measure.set(k,w);}return w*fs/100;}
function ellipsize(s,maxW,fs,weight,cls){if(measure(s,fs,weight,cls)<=maxW)return s;let t=s;while(t.length>1&&measure(t+'…',fs,weight,cls)>maxW)t=t.slice(0,-1).replace(/\s+$/,'');return t+'…';}
function wrapM(t,maxW,fs,weight=400,maxLines=3,cls=''){const words=String(t||'').split(/\s+/).filter(Boolean);const lines=[];let l='';for(const w of words){const cand=l?l+' '+w:w;if(l&&measure(cand,fs,weight,cls)>maxW){lines.push(l);l=w;}else l=cand;}if(l)lines.push(l);if(!lines.length)return [''];
 if(lines.length>maxLines){const rest=lines.slice(maxLines-1).join(' ');lines.length=maxLines;lines[maxLines-1]=rest;}
 return lines.map(line=>ellipsize(line,maxW,fs,weight,cls));}
function textLines(rows,x,y,fs,fill,weight,cls,anchor,halo,attrs){return `<text x="${x}" y="${y}" font-size="${fs}" font-weight="${weight}" fill="${fill}" class="${cls}"${anchor&&anchor!=='start'?` text-anchor="${anchor}"`:''}${halo?` stroke="#101820" stroke-opacity=".85" stroke-width="${halo}" paint-order="stroke" stroke-linejoin="round"`:''}${attrs?' '+attrs:''}>${rows.map((l,i)=>`<tspan x="${x}" dy="${i?fs*1.23:0}">${E(l)}</tspan>`).join('')}</text>`;}
function text(t,x,y,width,fs,fill='#dce4eb',lines=2,weight=400,cls=''){return textLines(wrapM(t,width,fs,weight,lines,cls),x,y,fs,fill,weight,cls);}
// ---- Labels compete for screen space in priority order (course > subject > subtopic > detail); losers fade out over 300 ms.
let frameLabels=[],frameZ=1,frameB={x:0,y:0,w:1,h:1};
function putLabel(o){const fs=o.fs,weight=o.weight||400,cls=o.cls||'';let box=o.box,html=o.html;
 if(!html){const rows=o.rows||wrapM(o.text,o.width??1e9,fs,weight,o.lines||1,cls);const wMax=Math.max(...rows.map(r=>measure(r,fs,weight,cls)));const anchor=o.anchor||'start';const x0=anchor==='middle'?o.x-wMax/2:anchor==='end'?o.x-wMax:o.x;box={x:(x0-frameB.x)*frameZ,y:(o.y-fs*.85-frameB.y)*frameZ,w:wMax*frameZ,h:(fs*1.2+fs*1.23*(rows.length-1))*frameZ};html=textLines(rows,o.x,o.y,fs,o.fill||'#dce4eb',weight,'map-label '+cls,anchor,o.halo===false?0:2.4/frameZ,o.attrs);o.rows=rows;}
 frameLabels.push({...o,box,html});return o;}
function resolveLabels(V){const out=[],seen=new Set(),grid=new Map(),cell=48,dt=R11.dt;
 const put=b=>{for(let gx=Math.floor(b.x/cell);gx<=Math.floor((b.x+b.w)/cell);gx++)for(let gy=Math.floor(b.y/cell);gy<=Math.floor((b.y+b.h)/cell);gy++){const k=gx+','+gy;let l=grid.get(k);if(!l)grid.set(k,l=[]);l.push(b);}};
 const hit=(b,pad)=>{for(let gx=Math.floor((b.x-pad)/cell);gx<=Math.floor((b.x+b.w+pad)/cell);gx++)for(let gy=Math.floor((b.y-pad)/cell);gy<=Math.floor((b.y+b.h+pad)/cell);gy++){const list=grid.get(gx+','+gy);if(!list)continue;for(const o of list)if(b.x-pad<o.x+o.w&&b.x+b.w+pad>o.x&&b.y-pad<o.y+o.h&&b.y+b.h+pad>o.y)return true;}return false;};
 frameLabels.sort((a,b)=>a.pri-b.pri||String(a.key).localeCompare(String(b.key)));
 for(const l of frameLabels){if(seen.has(l.key))continue;seen.add(l.key);let st=R11.labelState.get(l.key);if(!st){st={o:reducedMotion?1:0,target:1,html:null};R11.labelState.set(l.key,st);}
  if(l.box.x>V.w+120||l.box.y>V.h+120||l.box.x+l.box.w<-120||l.box.y+l.box.h<-120){st.html=null;continue;}
  const ok=l.nocollide||!hit(l.box,st.o>.5?0:2);if(ok)put(l.box);
  st.target=ok?1:0;st.html=l.sticky===false?null:l.html;
  st.o=st.target>st.o?Math.min(st.target,st.o+dt/300):Math.max(st.target,st.o-dt/300);if(st.o!==st.target)settling=true;
  const op=st.o*(l.op??1);if(op>.004)out.push(`<g opacity="${op.toFixed(3)}"${l.clickable?'':' pointer-events="none"'}>${l.html}</g>`);}
 for(const [k,st] of R11.labelState){if(seen.has(k))continue;if(!st.html||st.o<=.004){R11.labelState.delete(k);continue;}st.o=Math.max(0,st.o-dt/300);settling=true;if(st.o>.004)out.push(`<g opacity="${st.o.toFixed(3)}" pointer-events="none">${st.html}</g>`);else R11.labelState.delete(k);}
 frameLabels=[];return out.join('');}
// Whole groups (subtopics, cards) fade in when they first qualify and fade out from their last drawing when they stop.
function fadeIn(key,html,sticky=true){let st=R11.fades.get(key);if(!st){st={o:reducedMotion?1:0};R11.fades.set(key,st);}st.seen=R11.frame;st.html=sticky?html:null;if(st.o<1){st.o=Math.min(1,st.o+R11.dt/300);settling=true;}return {o:st.o,html:st.o<1?`<g opacity="${st.o.toFixed(3)}">${html}</g>`:html};}
function fadeOuts(){const out=[];for(const [k,st] of R11.fades){if(st.seen===R11.frame)continue;if(!st.html){R11.fades.delete(k);continue;}st.o-=R11.dt/300;if(st.o<=.004){R11.fades.delete(k);continue;}settling=true;out.push(`<g opacity="${st.o.toFixed(3)}" pointer-events="none">${st.html}</g>`);}return out.join('');}
function nearestStar(clientX,clientY,maxPx=9){const v=rect(),x=S.x+(clientX-v.x-v.w/2)/S.z,y=S.y+(clientY-v.y-v.h/2)/S.z;let best=null,bd=maxPx/S.z;for(const s of R11.starIndex){const d=Math.hypot(s.x-x,s.y-y);if(d<bd){bd=d;best=s.id;}}return best;}
function draw(){
 if(!data.studyMap)return;const now=performance.now();R11.dt=reducedMotion?1e9:Math.min(100,Math.max(1,now-(R11.lastFrame||now-16)));R11.lastFrame=now;R11.frame++;
 const activeEdges=shownEdges(),active=new Set();for(const e of activeEdges){active.add(e.source);active.add(e.target);}if(selected?.type==='node')active.add(selected.id);
 const band=morphBand();if(S.z<band.z0)S.z=band.z0;const t=morphT(S.z,band);morphFollow(t);autoScope(t);clampCamera(active);
 const B=visibleBox(),z=S.z,V=rect();frameB=B;frameZ=z;svg.setAttribute('viewBox',`${B.x} ${B.y} ${B.w} ${B.h}`);settling=false;appearSeq=0;seenNow=new Set();
 const G=galaxy(),M=mapData(),regions=M.regions,inScope=new Set(scopeRegions().map(r=>r.id)),wasVisible=new Set(S.paintNodes||[]);const activeRegions=new Set([...active].map(id=>homeFor(id)?.region));
 const parts=[],starParts=[],cardParts=[],edgeParts=[],visible=new Set(),cardO=new Map();let anyClose=false;
 const defs=`<defs><pattern id="mapDots" width="${26/z}" height="${26/z}" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="${.7/z}" fill="#879cab" opacity=".07"/></pattern><radialGradient id="galaxyCore"><stop offset="0" stop-color="#e8d9b8" stop-opacity=".5"/><stop offset=".35" stop-color="#7a6a4a" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient><marker id="arrowHead" viewBox="0 0 9 9" refX="8" refY="4.5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1 L8 4.5 L1 8" fill="none" stroke="#b9bec0" stroke-width="1.3"/></marker></defs>`;
 parts.push(`<rect x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" fill="url(#mapDots)" opacity="${t.toFixed(3)}"/>`);
 if(t<1){parts.push(`<g opacity="${(1-t).toFixed(3)}" pointer-events="none"><circle cx="${G.cx}" cy="${G.cy}" r="${G.R1*.42}" fill="url(#galaxyCore)"/>`);for(const d of G.dust)parts.push(`<circle cx="${d.x.toFixed(0)}" cy="${d.y.toFixed(0)}" r="${(d.r/z).toFixed(1)}" fill="#9fb3c4" opacity="${d.o}"/>`);
  for(const e of G.cross){const a=nodePos(e.source,t),b=nodePos(e.target,t);if(!a||!b)continue;parts.push(`<path d="M${a.x.toFixed(0)},${a.y.toFixed(0)} Q${G.cx.toFixed(0)},${G.cy.toFixed(0)} ${b.x.toFixed(0)},${b.y.toFixed(0)}" fill="none" stroke="#c9d3dc" stroke-opacity=".1" stroke-width="${1/z}"/>`);}parts.push('</g>');}
 if(t>0)for(const [c,b] of Object.entries(G.blocks)){const col=ARM_COLORS[c]||'#9fb3c4';parts.push(`<rect x="${b.x-90}" y="${b.y-90}" width="${b.w+180}" height="${b.h+180}" rx="140" fill="${col}" fill-opacity="${(.016*t).toFixed(3)}" stroke="${col}" stroke-opacity="${(.2*t).toFixed(3)}" stroke-width="${1.2/z}" pointer-events="none"/>`);}
 for(const cl of G.courseLabels){const b=G.blocks[cl.course],col=ARM_COLORS[cl.course]||'#dce4eb';const fs=Math.min(34,(t<1?20:18+b.w*z*.012))/z;const mx=b.x+40,my=b.y-40/z;const x=cl.x+(mx-cl.x)*t,y=cl.y+(my-cl.y)*t;const subjects=regions.filter(r=>regionCourse(r)===cl.course&&r.step).length;
  putLabel({key:'course:'+cl.course,pri:0,x,y,fs,text:V.w<760&&cl.course.length>20?'Legislation & Reg. State':cl.course,fill:col,weight:500,cls:'region-title course-label',clickable:true,attrs:`data-study-scope="${E(cl.course)}" role="button" tabindex="0"`});
  putLabel({key:'coursen:'+cl.course,pri:.5,x,y:y+fs*.7,fs:fs*.46,text:`${cl.count} entries · ${subjects||regions.filter(r=>regionCourse(r)===cl.course).length} subjects`,fill:'#93a7b7',weight:500});}
 const armLabel=new Map(G.regionLabels.map(l=>[l.id,l]));
 for(const r of regions){const course=regionCourse(r),isCourse=course!=='Study notes',scoped=inScope.has(r.id)||activeRegions.has(r.id);const pw=r.w*z,mode=pw<200?'star':pw<470?'mid':'full',focusHere=S.region===r.id,weight=isCourse?regionWeight(r.id):.5,col=r.color;
  const al=armLabel.get(r.id),near=intersects(r,B,200);if(!al&&!near)continue;
  const dim=(selected&&S.region&&S.region!==r.id&&!activeRegions.has(r.id)?.54:1)*(scoped?1:.45);
  let tpx=Math.min(30,9+5*weight+pw*.022);const hr=headroom(r);if(isFinite(hr)){const cap=Math.max(11,(hr*z-12)/1.2),u=Math.min(1,Math.max(0,(pw-300)/170)),w2=u*u*(3-2*u);tpx+=(Math.min(tpx,cap)-tpx)*w2;}const tfs=tpx/z,tx0=r.x+40+(r.step?30/z:0),ty0=isFinite(hr)&&mode==='full'?Math.min(r.y+22/z+tfs,r.y+hr-6/z-tfs*.35):r.y+22/z+tfs;const lx=al?al.x+(tx0-al.x)*t:tx0,ly=al?al.y+(ty0-al.y)*t:ty0;
  if(t>0&&intersects(r,B,80)){parts.push(`<g class="map-region" opacity="${dim.toFixed(3)}"><path d="${regionPath(r)}" fill="${col}" fill-opacity="${((focusHere?.09:.028+.075*weight)*t).toFixed(3)}" stroke="${col}" stroke-opacity="${((focusHere?.5:.18+.3*weight)*t).toFixed(3)}" stroke-width="${1/z}" data-map-region="${E(r.id)}" class="territory-hit" role="button" tabindex="0" aria-label="Explore ${E(shortRegionTitle(r))}"${t<.5?' pointer-events="none"':''}><title>${E(shortRegionTitle(r))}</title></path>`);
   if(r.step&&t>=.5)parts.push(`<g opacity="${((t-.5)*2).toFixed(3)}" pointer-events="none"><circle cx="${r.x+40+9.5/z}" cy="${ty0-tfs*.34}" r="${9.5/z}" fill="${col}" fill-opacity=".92"/><text x="${r.x+40+9.5/z}" y="${ty0-tfs*.34+3.7/z}" font-size="${10.5/z}" font-weight="600" fill="#101820" text-anchor="middle">${r.step}</text></g>`);
   parts.push('</g>');}
  const titleW=t<1?210/z:mode==='star'?Math.max(r.w-80,150/z):r.w-120,titleLines=t<1||mode==='star'&&r.h*z<48?1:2,titleRows=wrapM(shortRegionTitle(r),titleW,tfs,500,titleLines,'region-title');
  const labelOp=(al?1:t)*dim;if(labelOp>.02)putLabel({key:'rt:'+r.id,pri:1+(1-weight)*.5,x:lx,y:ly,fs:tfs,rows:titleRows,fill:'#e6e3dc',weight:500,cls:'region-title',op:labelOp,clickable:t>=.5,attrs:`data-map-region="${E(r.id)}" role="button" tabindex="0"`});
  if(t<1||!near)continue;
  let yy=ty0+(titleRows.length-1)*tfs*1.23+tfs*1.55;const bottom=r.y+r.h-12/z;
  if(mode==='full'&&r.routeLabel){const tw=Math.max(...titleRows.map(l=>measure(l,tfs,500,'region-title')));const room=r.x+r.w-40-(tx0+tw+18/z);if(room>120/z)putLabel({key:'rk:'+r.id,pri:3,x:tx0+tw+18/z,y:ty0,fs:11/z,text:r.routeLabel,fill:col,weight:550,width:room,lines:1,op:dim});}
  else if(mode==='mid'&&r.routeLabel){putLabel({key:'rk:'+r.id,pri:3,x:r.x+40,y:yy,fs:11/z,text:r.routeLabel,fill:col,weight:550,width:r.w-100,lines:1,op:dim});yy+=11/z*2;}
  if(mode==='mid'){const localFocus=[...active].filter(id=>homeFor(id)?.region===r.id).map(id=>nodesById.get(id)).filter(Boolean);const description=localFocus.length?localFocus.slice(0,4).map(displayName).join(' · '):(r.description||'');
   if(description&&yy+11/z*3.7<bottom){const rows=wrapM(description,r.w-100,11/z,400,3);putLabel({key:'rd:'+r.id,pri:3.5,x:r.x+40,y:yy,fs:11/z,rows,fill:localFocus.length?col:'#a4b6c5',op:dim});yy+=11/z*1.23*rows.length+11/z*.9;}
   const tally=regionTally(r.id);if(tally.total&&yy+10.5/z<bottom){putLabel({key:'rc:'+r.id,pri:3,x:r.x+40,y:yy,fs:10.5/z,text:`${tally.cases} case${tally.cases===1?'':'s'} · ${tally.concepts} concept${tally.concepts===1?'':'s'}${tally.notes?` · ${tally.notes} note${tally.notes===1?'':'s'}`:''}`,fill:'#93a7b7',weight:550,op:dim});yy+=10.5/z*2;}
   const names=data.nodes.filter(n=>homeFor(n.id)?.region===r.id&&geoPlacement(n.id).role==='Principal case').slice(0,4).map(n=>displayName(n));
   if(names.length&&yy+10.5/z*2.5<bottom)putLabel({key:'rn:'+r.id,pri:4,x:r.x+40,y:yy,fs:10.5/z,text:names.join(' · '),fill:col,width:r.w-100,lines:2,op:dim});
  }else if(mode==='full'){
   for(const id of r.districtIds){const d=districtFor(id);if(!d||!intersects(d,B,45))continue;const sample=Object.values(M.homes).find(c=>c.district===d.id&&c.core);const was=R11.districtCards.has(d.id),hy=was?.85:1;const showCards=d.w*z>=310*hy&&(!sample||sample.h*z>=38*hy),full=d.w*z>=595*hy&&(!sample||sample.h*z>=53*hy);anyClose||=full;if(showCards)R11.districtCards.add(d.id);else R11.districtCards.delete(d.id);
    const dIn=entrance('d:'+d.id,d.x+d.w/2,d.y+d.h/2,now);const g=[];g.push(`<g class="map-district" opacity="${(dIn.o*dim).toFixed(3)}"${dIn.tr}><rect x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" rx="16" fill="#17232d" fill-opacity=".76" stroke="${col}" stroke-opacity="${S.district===d.id?.38:.15}" stroke-width="${.8/z}" class="district-hit" data-map-district="${E(d.id)}" role="button" tabindex="0" aria-label="Explore ${E(d.title)}"><title>${E(d.question)}</title></rect>`);
    const tfs2=Math.min((d.headerH||91)*.72,14/z),tRows=wrapM(d.title,d.w-48,tfs2,550,2),tY=d.y+Math.max(Math.min(48,(d.headerH||91)*.55),tfs2*.95+4/z);putLabel({key:'dt:'+d.id,pri:2,x:d.x+24,y:tY,fs:tfs2,rows:tRows,fill:col,weight:550,op:dIn.o*dim,clickable:true,attrs:`data-map-district="${E(d.id)}" role="button" tabindex="0"`});
    if(!showCards&&!S.connectionOverview){const qy=Math.max(d.y+(d.headerH||91)+36,tY+tRows.length*tfs2*1.23+14/z);g.push(text(d.question,d.x+26,qy,d.w-52,13/z,'#c4d1dc',2));let yy2=qy+49/z;const all=geoMembers(id),principal=all.filter(n=>geoPlacement(n.id).role==='Principal case'),lead=nodesById.get(d.lead);const ns=[...principal,...(lead&&!principal.includes(lead)?[lead]:[])];const max=Math.max(0,Math.min(3,Math.floor((d.y+d.h-20/z-yy2)/(28/z))+1));for(const n of ns.slice(0,max)){g.push(`<g data-map-jump="${E(n.id)}" role="button" tabindex="0" style="cursor:pointer" aria-label="Read ${E(n.title)}"><rect x="${d.x+24}" y="${yy2-17/z}" width="${d.w-48}" height="${24/z}" rx="5" fill="#ffffff" fill-opacity=".02"/>`+text(displayName(n)+' →',d.x+33,yy2,d.w-67,12/z,n.kind==='Case'?col:'#95a9bc',1)+`</g>`);yy2+=28/z;}
    }else{const sub=Object.entries(M.homes).filter(([nid,c])=>nodesById.has(nid)&&c.district===id&&c.support),count=sub.length;
     if(count&&!full){const fs=13/z;g.push(text(`${count} related notes & questions`,d.x+25,d.supportStart+fs*1.5,d.w-50,fs,'#99adbf',1));g.push(text('Zoom in to read them.',d.x+25,d.supportStart+fs*3.1,d.w-50,11/z,'#6f879e',1));}}
    g.push('</g>');parts.push(fadeIn('dg:'+d.id,g.join('')).html);}
  }
 }
 // Cards at their homes. Thresholds relax by 15% for cards already on screen, so nothing flickers at the boundary.
 if(t>=1)for(const [id]of Object.entries(M.homes)){const c=homeFor(id),n=nodesById.get(id);if(!n||!intersects(c,B,40))continue;const d=districtFor(c.district),r=regionFor(c.region),isActive=active.has(id),chosen=selected?.type==='node'&&selected.id===id,force=chosen||selected?.type==='edge'&&isActive||S.connectionOverview&&isActive;
  const hy=wasVisible.has(id)?.85:1,standard=(d?.w||750)*z>=310*hy&&c.h*z>=38*hy,full=(d?.w||750)*z>=595*hy&&c.h*z>=49*hy;
  if(!inScope.has(c.region)&&!isActive)continue;if(!standard&&!force)continue;if(force&&(c.w*z<85||c.h*z<16))continue;if(c.support&&!full&&!force&&!isActive)continue;
  if(c.support&&!full&&isActive&&!force&&c.w*z<185)continue;
  visible.add(id);const col=r?.color||'#9faec0',dimc=selected&&active.size&&!isActive?.24:1,fs=Math.min(c.h/2.4,Math.min(17,Math.max(9,6+c.h*z*.16))/z),x=c.x+17;
  const label=displayName(n),lineLimit=c.h<fs*2.9?1:2,rows=wrapM(label,c.w-34,fs,c.core?500:400,lineLimit);const titleY=c.y+c.h/2-fs*(rows.length>1?.28:-.16);
  const cIn=entrance('n:'+id,c.x+c.w/2,c.y+c.h/2,now);if(chosen){if(pulseId!==id){pulseId=id;pulseAt=now;}const pf=Math.min(1,(now-pulseAt)/720);if(pf<1&&!reducedMotion){settling=true;const gf=1+pf*.16,cx=c.x+c.w/2,cy=c.y+c.h/2;cardParts.push(`<rect x="${cx-c.w/2*gf}" y="${cy-c.h/2*gf}" width="${c.w*gf}" height="${c.h*gf}" rx="${9*gf}" fill="none" stroke="#eed6b4" stroke-width="${2/z}" stroke-opacity="${(.85*(1-pf)).toFixed(3)}" pointer-events="none"/>`);}}
  let card=`<g class="node-card" opacity="${(dimc*cIn.o).toFixed(3)}"${cIn.tr} data-map-node="${E(id)}" role="button" tabindex="0" aria-label="${E(n.title)}. ${E(roleLabel(n))}. Click to read; drag to move."><title>${E(n.title)} — ${E(n.summary)}</title><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="7" fill="${chosen?'#303c45':isActive?'#24313d':c.core?'#1e2c37':'#18242f'}" stroke="${chosen?'#eed6b4':col}" stroke-width="${(chosen?2:1)/z}" stroke-opacity="${chosen?1:isActive?.8:c.core?.4:.25}"/>`;
  if(n.kind==='Case')card+=`<path d="M${c.x+7} ${c.y+15} V${c.y+c.h-15}" stroke="${col}" stroke-width="${2/z}" opacity=".8"/>`;
  card+=textLines(rows,x,titleY,fs,chosen?'#f7e7cb':c.core?'#dce5ec':'#abbccb',c.core?500:400,'')+'</g>';
  const f=fadeIn('n:'+id,card);cardO.set(id,f.o);cardParts.push(f.html);
 }
 // Stars: every entry that is not a readable card. They are the galaxy at the floor and the texture of each subject above it.
 R11.starIndex=[];const pad=60/z,selDim=selected&&active.size,regionById=new Map(regions.map(r=>[r.id,r]));
 for(const [id] of G.pts){const n=nodesById.get(id);if(!n)continue;const co=cardO.get(id)||0;if(co>=.98)continue;const p=nodePos(id,t);if(!p||p.x<B.x-pad||p.x>B.x+B.w+pad||p.y<B.y-pad||p.y>B.y+B.h+pad)continue;
  const isCase=n.kind==='Case',isConcept=n.kind==='Concept'||n.kind==='Rule',isActive=active.has(id),chosen=selected?.type==='node'&&selected.id===id;
  let op=(isCase?.95:isConcept?.7:.3)*(1-co);if(selDim&&!isActive)op*=.4;const hr0=homeFor(id);if(t>=1&&!isActive){if(!inScope.has(hr0.region))op*=.5;const rpw=(regionById.get(hr0.region)?.w||2400)*z;op*=rpw<200?.62:Math.max(.35,1-(rpw-200)/400);}if(op<.02)continue;
  const rad=((isCase?2.1:isConcept?1.5:.9)*(1+.35*(1-t))+(isActive?1.6:0))/z,col=chosen?'#f4dfb8':isActive?'#eed6b4':ARM_COLORS[p.c]||'#9fb3c4';R11.starIndex.push({id,x:p.x,y:p.y});
  if(chosen&&!reducedMotion)starParts.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(rad*2.2).toFixed(2)}" fill="none" stroke="#eed6b4" stroke-width="${1.2/z}" class="star-pulse" pointer-events="none"/>`);
  starParts.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${rad.toFixed(2)}" fill="${col}" opacity="${op.toFixed(3)}" class="dkla-star${isCase?' is-case':''}" data-map-node="${E(id)}" data-star="1"/>`);}
 const painted=[];
 for(const e of activeEdges){const a0=homeFor(e.source),b0=homeFor(e.target);if(!a0||!b0)continue;const pa=nodePos(e.source,t),pb=nodePos(e.target,t);const bw=w=>w*t+14/z*(1-t);const a={x:pa.x-bw(a0.w)/2,y:pa.y-bw(a0.h)/2,w:bw(a0.w),h:bw(a0.h)},b={x:pb.x-bw(b0.w)/2,y:pb.y-bw(b0.h)/2,w:bw(b0.w),h:bw(b0.h)};
  const ax=a.x+a.w/2,ay=a.y+a.h/2,bx=b.x+b.w/2,by=b.y+b.h/2;const lineB={x:Math.min(ax,bx),y:Math.min(ay,by),w:Math.abs(ax-bx),h:Math.abs(ay-by)};if(!intersects(lineB,B))continue;
  const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy);if(len<.001)continue;const toBoundary=r=>Math.min(Math.abs(dx)>.001?r.w/2/Math.abs(dx):Infinity,Math.abs(dy)>.001?r.h/2/Math.abs(dy):Infinity)*len+4/z,offset=toBoundary(a),offsetb=toBoundary(b);const sx=ax+dx/len*offset,sy=ay+dy/len*offset,tx=bx-dx/len*offsetb,ty=by-dy/len*offsetb;
  const cc=Math.min(180/Math.max(.2,z*3),Math.max(30,Math.abs(dy)*.25)),path=`M${sx},${sy} C${sx+cc},${sy} ${tx-cc},${ty} ${tx},${ty}`,color=e.status==='Disputed'?'#d895a3':e.status==='Reviewed'?'#e6d2ab':'#c3cbcc',w=Math.min(3.4,1.2+strength(e).width*.42)/z;
  let t0=edgeAppear.get(e.id);if(t0===undefined){t0=now+painted.length*70;edgeAppear.set(e.id,t0);}const ep=reducedMotion?1:Math.min(1,Math.max(0,(now-t0)/480));if(ep<1)settling=true;const eu=1-Math.pow(1-ep,3);
  for(const [end,box,ex,ey] of [[e.source,a,sx,sy],[e.target,b,tx,ty]]){if(visible.has(end))continue;const en=nodesById.get(end);if(!en)continue;const fs=Math.max(11/z,Math.min(15/z,box.h*.32)),lbl=ellipsize(displayName(en),230/z,fs,500),pw=measure(lbl,fs,500)+20/z,ph=fs*1.9,px=ex-pw/2,py=(ey<box.y+box.h/2?box.y-ph-6/z:box.y+box.h+6/z);
   putLabel({key:'re:'+e.id+':'+end,pri:1.5,box:{x:(px-B.x)*z,y:(py-B.y)*z,w:pw*z,h:ph*z},html:`<g class="ribbon-end" data-map-node="${E(end)}" role="button" tabindex="0" aria-label="${E(en.title)}"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="${ph/2}" fill="#1b2731" stroke="${color}" stroke-opacity=".7" stroke-width="${1/z}"/>${textLines([lbl],px+10/z,py+ph*.68,fs,'#dbe3ea',500,'',null,0)}</g>`,clickable:true,sticky:false});}
  edgeParts.push(`<path d="${taperedRibbon(sx,sy,sx+cc,sy,tx-cc,ty,tx,ty,w*2.3,w*.35,28,Math.max(.02,eu))}" fill="${color}" fill-opacity="${e.status==='Disputed'?.45:.58}" pointer-events="none"/><circle cx="${sx}" cy="${sy}" r="${w*1.15}" fill="${color}" fill-opacity=".6" pointer-events="none"/><path d="${path}" stroke="transparent" stroke-width="${12/z}" fill="none" data-map-edge="${E(e.id)}" role="button" tabindex="0" aria-label="${E(e.label)}: ${E(e.explanation)}"><title>${E(e.explanation||e.label)}</title></path>`);painted.push(e.id);
 }
 svg.innerHTML=defs+parts.join('')+starParts.join('')+edgeParts.join('')+cardParts.join('')+fadeOuts()+resolveLabels(V);S.paintNodes=[...visible];S.paintEdges=painted;
 for(const k of appear.keys())if(!seenNow.has(k))appear.delete(k);for(const k of edgeAppear.keys())if(!painted.includes(k))edgeAppear.delete(k);if(settling)schedule();
 const center=mapCenterVisible(),nr=nearestRegion(center.x,center.y);const zoomOverview=(!nr||nr.w*z<470)&&!selected&&t>=1;if(!S.region&&S.scope==='Contracts'&&!selected)$('mapWelcome').hidden=!zoomOverview;if(t<1)$('mapWelcome').hidden=true;
 if(!mapTip.hidden&&!R11.starIndex.some(s=>s.id===mapTip.dataset.id))mapTip.hidden=true;
 $('mapHint').textContent=t<1?'Scroll in on a course to open it · Click a star to read':selected?.type==='node'?'Drag an entry to save a new map position':anyClose?'All nearby notes are visible · Click to read':'Scroll to explore · Drag the map to pan';
}
// Hover names for stars, and a forgiving click target: the nearest star within nine pixels.
const mapTip=document.createElement('div');mapTip.id='mapTip';mapTip.hidden=true;svg.parentElement.appendChild(mapTip);
svg.addEventListener('pointermove',e=>{if(S.pointers.size||e.pointerType==='touch'){mapTip.hidden=true;return;}const id=e.target.dataset?.star?e.target.dataset.mapNode:nearestStar(e.clientX,e.clientY,9);const n=id&&nodesById.get(id);if(!n){mapTip.hidden=true;return;}const h=mapData().homes[n.id],d=h&&districtFor(h.district),r=h&&regionFor(h.region);mapTip.hidden=false;mapTip.dataset.id=n.id;mapTip.innerHTML=`<strong>${E(n.title)}</strong><span>${E(n.kind)}${d?' · '+E(d.title):r?' · '+E(shortRegionTitle(r)):''}</span>`;const w=svg.parentElement.getBoundingClientRect();mapTip.style.left=Math.min(w.width-270,e.clientX-w.left+14)+'px';mapTip.style.top=(e.clientY-w.top+16)+'px';});
svg.addEventListener('pointerleave',()=>{mapTip.hidden=true;});svg.addEventListener('pointerdown',()=>{mapTip.hidden=true;},{capture:true});
svg.addEventListener('click',e=>{if(R11.dragMoved||e.target.closest('[data-map-node],[data-map-district],[data-map-region],[data-map-edge],[data-map-jump],[data-study-scope]'))return;const id=nearestStar(e.clientX,e.clientY,10);if(id)goNode(id,false);});
