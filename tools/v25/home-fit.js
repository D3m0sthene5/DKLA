/* Approved native Home B: shared framing, existing lower sections side by
   side, and readable native court-seat labels. Courses keep their geometry. */
(() => {
  'use strict';
  const neutral=()=>S.scope==='Atlas'&&!S.region&&!S.district&&!selected&&!S.panelOpen;
  const wide=()=>{const v=rect();return v.w>=600&&v.w/Math.max(1,v.h)>=1.25;};
  const compact=()=>neutral()&&wide()&&rect().h<480;
  const fullLabels=()=>neutral()&&wide()&&!compact();
  const state=window.DKLAHomeFit={ready:false,refresh,wide,compact,fullLabels};
  let gestureUntil=0,resizeTimer;
  function refresh(){if(state.ready&&neutral())home('Atlas',false,false);}
  function seats(){
    if(!neutral()||!wide())return;
    const b=window.DKLAScotusBox;if(!b)return;
    const height=(b.h-1730-330-190)/2;
    document.querySelectorAll('#geoCanvas [data-sh-seat]').forEach((seat,index)=>{
      const row=Math.floor(index/6),r=seat.querySelector('rect');if(!r)return;
      const oldY=Number(r.getAttribute('y')),oldH=Number(r.getAttribute('height')),
        y=b.y+1730+row*(height+190),dy=y-oldY+(height-oldH)*.56;
      r.setAttribute('y',y);r.setAttribute('height',height);
      for(const text of seat.querySelectorAll('text'))text.setAttribute('transform',`translate(0 ${dy})`);
    });
  }
  function install(){
    if(!window.LegalAtlas?.ready||!document.documentElement.classList.contains('geography-locked')){setTimeout(install,80);return;}
    const previousGalaxy=galaxy,previousBand=morphBand,previousSafe=safeArea,
      previousFit=fitBox,previousAuto=autoScope,previousDraw=draw,previousText=textLines;
    textLines=function(rows,x,y,fs,...rest){
      if(fullLabels()&&['sh-map-label','sh-root-label'].includes(rest[2])){
        fs=Math.max(fs,(rest[2]==='sh-map-label'?9.5:8.5)/S.z);
        if(rest[2]==='sh-root-label'&&rows.join(' ').startsWith('Court membership'))y+=260;
      }
      return previousText.call(this,rows,x,y,fs,...rest);
    };
    safeArea=function(...args){const a=previousSafe.apply(this,args);if(!neutral()||!wide())return a;const v=rect();return{x:14,y:14,w:Math.max(1,v.w-28),h:Math.max(1,v.h-14-70)};};
    fitBox=function(b,animate,pad,maxZoom){return previousFit.call(this,b,animate,neutral()&&wide()?0:pad,maxZoom);};
    galaxy=function(...args){
      const g=previousGalaxy.apply(this,args);if(!neutral()||!wide())return g;
      const m=mapData(),authority=window.DKLAAuthorities.geography().entrance,
        c=window.DKLAScotusBox,tiles=Object.values(window.DKLABriefs.data.tiles||{});
      // Fit the actual Home sections, not legacy padding for hidden case cards.
      // Course and case geometry remains intact when the reader zooms closer.
      return{...g,box:bounds([...m.regions,...Object.values(m.courseBlocks||{}),...tiles,authority,c,{x:-3100,y:-5450,w:6200,h:4450}])};
    };
    morphBand=function(...args){const b=previousBand.apply(this,args);if(!neutral()||!wide())return b;const g=galaxy(),a=safeArea(),z0=Math.min(a.w/g.box.w,a.h/g.box.h);return{z0,z1:z0*1.15};};
    autoScope=function(...args){if(neutral()&&performance.now()>gestureUntil)return;return previousAuto.apply(this,args);};
    draw=function(...args){const result=previousDraw.apply(this,args);seats();return result;};
    const canvas=document.getElementById('geoCanvas'),arm=()=>gestureUntil=performance.now()+900;
    canvas.addEventListener('wheel',arm,{capture:true,passive:true});
    canvas.addEventListener('pointerdown',arm,{capture:true,passive:true});
    canvas.addEventListener('pointermove',()=>{if(S.drag)arm();},{capture:true,passive:true});
    document.querySelector('.zoom-controls')?.addEventListener('click',arm,{capture:true});
    window.addEventListener('resize',()=>{clearTimeout(resizeTimer);if(neutral()){gestureUntil=0;resizeTimer=setTimeout(refresh,340);}});
    state.ready=true;refresh();
  }
  install();
})();
