/* Cold vapor settles under the rim: cached soft textures and one visible-only scheduler. */
(() => {
  'use strict';
  const selector='button[data-cold-call]', motion=matchMedia('(prefers-reduced-motion: reduce), (update: slow), (forced-colors: active)'), states=new Map(), intersecting=new Set(), visible=new Set();
  const PAD_X=6, PAD_TOP=0, PAD_BOTTOM=18, FPS=1000/24, PARTICLES=14;
  let frame=0,lastFrame=0,installed=false,sprites=null,intersections,mutations;
  const rand=(a,b)=>a+Math.random()*(b-a);

  // Soft, irregular vapor textures are painted once and reused. No image download or pixel readback.
  function textures(){
    return Array.from({length:4},(_,index)=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
      const ctx=canvas.getContext('2d');if(!ctx)return null;
      const lobes=6;
      for(let i=0;i<lobes;i++){
        const angle=i/lobes*Math.PI*2+index*.7,spread=rand(7,17),x=64+Math.cos(angle)*spread,y=64+Math.sin(angle)*spread*.7,r=rand(26,35);
        const mist=ctx.createRadialGradient(x,y,0,x,y,r);
        mist.addColorStop(0,'rgba(219,237,243,.14)');mist.addColorStop(.3,'rgba(205,228,238,.08)');mist.addColorStop(.65,'rgba(197,220,233,.025)');mist.addColorStop(1,'rgba(197,220,233,0)');
        ctx.fillStyle=mist;ctx.fillRect(x-r,y-r,r*2,r*2);
      }
      // A gradual circular envelope avoids visible puff outlines or polygon edges.
      ctx.globalCompositeOperation='destination-in';
      const envelope=ctx.createRadialGradient(64,64,8,64,64,57);envelope.addColorStop(0,'#fff');envelope.addColorStop(.5,'#ffffffb0');envelope.addColorStop(1,'#ffffff00');
      ctx.fillStyle=envelope;ctx.fillRect(0,0,128,128);
      return canvas;
    }).filter(Boolean);
  }
  function particle(state,stagger=false){
    const life=rand(4.2,6.2),x=rand(6,Math.max(6,state.width-6));
    return {age:stagger?rand(0,life):0,life,x,y:state.height+rand(.5,2),drift:rand(-6,6),drop:rand(7,12),size:rand(30,46),sway:rand(.7,1.8),phase:rand(0,Math.PI*2),sprite:Math.floor(rand(0,4)),opacity:rand(.25,.38)};
  }
  function fit(state,width,height){
    state.width=width;state.height=height;
    const ratio=Math.min(devicePixelRatio||1,1.5),w=width+PAD_X*2,h=height+PAD_TOP+PAD_BOTTOM;
    state.canvas.width=Math.ceil(w*ratio);state.canvas.height=Math.ceil(h*ratio);
    state.canvas.style.width=w+'px';state.canvas.style.height=h+'px';state.ratio=ratio;
    state.particles=Array.from({length:PARTICLES},()=>particle(state,true));
    const {ctx}=state;ctx.setTransform(ratio,0,0,ratio,0,0);
    state.falloff=ctx.createLinearGradient(0,height,0,h);
    state.falloff.addColorStop(0,'#fff');state.falloff.addColorStop(.45,'#ffffff99');state.falloff.addColorStop(1,'#ffffff00');
    state.edges=ctx.createLinearGradient(0,0,w,0);
    state.edges.addColorStop(0,'#ffffff00');state.edges.addColorStop(.12,'#fff');state.edges.addColorStop(.88,'#fff');state.edges.addColorStop(1,'#ffffff00');
  }
  function initialize(state,rect){
    if(state.canvas)return;
    const canvas=document.createElement('canvas');canvas.className='cc-cold-vapor';canvas.setAttribute('aria-hidden','true');
    const ctx=canvas.getContext('2d');if(!ctx)return;
    state.canvas=canvas;state.ctx=ctx;state.button.appendChild(canvas);fit(state,rect.width,rect.height);
    if(typeof ResizeObserver==='function'){
      state.resize=new ResizeObserver(()=>{const rect=state.button.getBoundingClientRect();if(rect.width>0&&(Math.abs(rect.width-state.width)>.5||Math.abs(rect.height-state.height)>.5))fit(state,rect.width,rect.height);});
      state.resize.observe(state.button);
    }
  }
  function draw(state,delta){
    const {ctx,canvas,ratio,width,height}=state,w=width+PAD_X*2,h=height+PAD_TOP+PAD_BOTTOM;
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
    ctx.save();
    // Vapor stays outside the button face: the entire text and its opaque backing remain clear.
    ctx.beginPath();ctx.rect(0,0,w,h);ctx.roundRect(PAD_X,PAD_TOP,width,height,7);ctx.clip('evenodd');
    for(let i=0;i<state.particles.length;i++){
      let p=state.particles[i];p.age+=delta;if(p.age>=p.life)p=state.particles[i]=particle(state);
      const t=p.age/p.life,fade=Math.sin(Math.PI*t)**1.4,scale=p.size*(.8+t*.5);
      // Slow lateral eddies stay beneath the lower edge, within a six-pixel side spill.
      const x=PAD_X+p.x+p.drift*t+Math.sin(p.phase+t*4)*p.sway*t,y=PAD_TOP+p.y+p.drop*t+Math.sin(p.phase+t*3)*.35*t;
      ctx.save();ctx.translate(x,y);ctx.scale(1.15+t*.15,.34+t*.08);
      ctx.globalAlpha=fade*p.opacity;ctx.drawImage(sprites[p.sprite%sprites.length],-scale/2,-scale/2,scale,scale);ctx.restore();
    }
    ctx.restore();ctx.globalAlpha=1;
    // Feather the shallow spill before the next reading line, also avoiding clipped canvas edges.
    ctx.globalCompositeOperation='destination-in';
    ctx.fillStyle=state.falloff;ctx.fillRect(0,0,w,h);
    ctx.fillStyle=state.edges;ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='source-over';
  }
  function running(){return !motion.matches&&!document.hidden&&visible.size>0;}
  function animate(now){
    frame=0;if(!running())return;
    if(!lastFrame)lastFrame=now-FPS;
    if(now-lastFrame>=FPS-.5){const delta=Math.min(.1,(now-lastFrame)/1000);lastFrame=now;
      for(const state of visible)if(state.button.isConnected&&!state.button.disabled&&state.canvas)draw(state,delta);
    }
    frame=requestAnimationFrame(animate);
  }
  function schedule(){if(running()&&!frame){lastFrame=0;frame=requestAnimationFrame(animate);}else if(!running()&&frame){cancelAnimationFrame(frame);frame=0;lastFrame=0;}}
  function refreshVisible(){
    const foreground=document.activeElement?.closest('dialog[open]')||[...document.querySelectorAll('dialog[open]')].at(-1);
    visible.clear();for(const state of intersecting)if(!state.button.disabled&&(!foreground||foreground.contains(state.button)))visible.add(state);
    schedule();
  }
  function register(button){
    if(states.has(button))return;const state={button};states.set(button,state);intersections.observe(button);
  }
  function scan(node){if(node.nodeType!==1||node.namespaceURI!=='http://www.w3.org/1999/xhtml')return;if(node.matches(selector))register(node);for(const button of node.querySelectorAll(selector))register(button);}
  function install(){
    if(installed||motion.matches||typeof IntersectionObserver!=='function')return;
    sprites=textures();if(!sprites.length)return;installed=true;
    intersections=new IntersectionObserver(entries=>{
      for(const entry of entries){const state=states.get(entry.target);if(!state)continue;
        if(entry.isIntersecting&&entry.boundingClientRect.width>0){initialize(state,entry.boundingClientRect);if(state.canvas)intersecting.add(state);}else intersecting.delete(state);
      }refreshVisible();
    });
    scan(document.body);
    mutations=new MutationObserver(records=>{
      for(const record of records)for(const node of record.addedNodes)scan(node);
      for(const [button,state]of states)if(!button.isConnected){intersections.unobserve(button);state.resize?.disconnect();intersecting.delete(state);visible.delete(state);states.delete(button);}
      refreshVisible();
    });
    mutations.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden','disabled']});
  }
  document.addEventListener('visibilitychange',schedule,{passive:true});
  document.addEventListener('focusin',refreshVisible,{passive:true});
  motion.addEventListener('change',()=>{install();schedule();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
