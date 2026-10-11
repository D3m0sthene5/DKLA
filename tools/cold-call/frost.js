/* Cold vapor: one shared 30 fps scheduler, cached soft sprites, visible buttons only. */
(() => {
  'use strict';
  const selector='button[data-cold-call]', motion=matchMedia('(prefers-reduced-motion: reduce), (update: slow), (forced-colors: active)'), states=new Map(), intersecting=new Set(), visible=new Set();
  const PAD_X=34, PAD_TOP=46, PAD_BOTTOM=12, FPS=1000/30, PARTICLES=17;
  let frame=0,lastFrame=0,installed=false,sprites=null,intersections,mutations;
  const rand=(a,b)=>a+Math.random()*(b-a);

  // Soft, irregular vapor textures are painted once and reused. No image download or pixel readback.
  function textures(){
    return Array.from({length:3},(_,index)=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
      const ctx=canvas.getContext('2d');if(!ctx)return null;
      const lobes=9;
      for(let i=0;i<lobes;i++){
        const angle=i/lobes*Math.PI*2+index*.7,spread=rand(6,15),x=48+Math.cos(angle)*spread,y=48+Math.sin(angle)*spread*.62,r=rand(17,25);
        const mist=ctx.createRadialGradient(x,y,0,x,y,r);
        mist.addColorStop(0,'rgba(214,241,250,.12)');mist.addColorStop(.36,'rgba(175,215,236,.08)');mist.addColorStop(1,'rgba(175,215,236,0)');
        ctx.fillStyle=mist;ctx.fillRect(x-r,y-r,r*2,r*2);
      }
      // A feathered envelope removes hard sprite edges while keeping a little internal structure.
      ctx.lineCap='round';ctx.strokeStyle='rgba(226,247,255,.025)';ctx.lineWidth=5;
      ctx.shadowColor='rgba(193,225,244,.18)';ctx.shadowBlur=5;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(25,47+i*4);ctx.bezierCurveTo(34,32+i*5,57,66-i*5,72,43+i*4);ctx.stroke();}
      ctx.shadowBlur=0;ctx.globalCompositeOperation='destination-in';
      const envelope=ctx.createRadialGradient(48,48,10,48,48,43);envelope.addColorStop(0,'#fff');envelope.addColorStop(.65,'#ffffffc0');envelope.addColorStop(1,'#ffffff00');
      ctx.fillStyle=envelope;ctx.fillRect(0,0,96,96);
      return canvas;
    }).filter(Boolean);
  }
  function particle(state,stagger=false){
    const side=Math.random();
    return {age:stagger?rand(0,4):0,life:rand(3.4,5),x:side<.25?rand(-4,5):side>.75?state.width+rand(-5,4):rand(4,state.width-4),y:side<.25||side>.75?rand(2,state.height*.68):rand(-1,3),drift:rand(-9,9),lift:rand(28,44),size:rand(30,47),sway:rand(2,6),phase:rand(0,Math.PI*2),spin:rand(-.24,.24),sprite:Math.floor(rand(0,3)),opacity:rand(.32,.53)};
  }
  function fit(state,width,height){
    state.width=width;state.height=height;
    const ratio=Math.min(devicePixelRatio||1,1.5),w=width+PAD_X*2,h=height+PAD_TOP+PAD_BOTTOM;
    state.canvas.width=Math.ceil(w*ratio);state.canvas.height=Math.ceil(h*ratio);
    state.canvas.style.width=w+'px';state.canvas.style.height=h+'px';state.ratio=ratio;
    state.particles=Array.from({length:PARTICLES},()=>particle(state,true));
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
      const t=p.age/p.life,fade=Math.sin(Math.PI*t)**1.3,scale=p.size*(.68+t*.88);
      const x=PAD_X+p.x+p.drift*t+Math.sin(p.phase+t*4)*p.sway*t,y=PAD_TOP+p.y-p.lift*t;
      ctx.save();ctx.translate(x,y);ctx.rotate(p.phase*.12+p.spin*t);ctx.scale(1.4,.62+t*.28);
      ctx.globalAlpha=fade*p.opacity;ctx.drawImage(sprites[p.sprite%sprites.length],-scale/2,-scale/2,scale,scale);ctx.restore();
    }
    // A few tiny ice motes catch the light close to the rim, then disappear into the mist.
    for(let i=0;i<3;i++){
      const p=state.particles[i],t=p.age/p.life;
      if(t>.62)continue;ctx.globalAlpha=Math.sin(Math.PI*t/.62)*.43;ctx.fillStyle='#dbf9ff';
      ctx.beginPath();ctx.arc(PAD_X+p.x+p.drift*t,PAD_TOP-1-p.lift*t,.45,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();ctx.globalAlpha=1;
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
