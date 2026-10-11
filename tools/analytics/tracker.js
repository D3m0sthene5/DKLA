/* First-party semantic analytics. Appended by the release assembler; never modifies the r18 baseline. */
(() => {
  'use strict';
  if (!/^https?:$/.test(location.protocol) || window.DKLAAnalytics) return;
  const originalFetch=window.fetch.bind(window), STORE='dkla-analytics-v1', KEY='dkla.analytics.recovery', CACHE='atlas-analytics-identity-v1';
  const uuid=()=>crypto.randomUUID(), iso=()=>new Date().toISOString(), clean=s=>String(s||'').slice(0,200).replace(/\b[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}\b/gi,'[sync code]');
  let tier='pending',token='',candidates=[],db,queue=[],buffer=[],flushing=false,readyResolve,active=0,lastTick=Date.now(),lastAction=Date.now(),lastVisible=document.visibilityState==='visible',lastState='',current='',modalEntry='',attention=0,sectionAttention=0,section='reading',search=null,scrollDepth=0,lastScroll=0,lastCamera='',lastFeature='',lastRatings={},ratingsInitialized=false,cleanStreak=0,lastStudy='',lastHistory='',lastSource='',repeats=new Map(),clicks=[];
  const startup=new Promise(resolve=>readyResolve=resolve);
  const session={id:uuid(),startedAt:iso(),endedAt:iso(),activeSeconds:0,activeNow:false,build:window.DKLABriefs?.data?.build||'v2.5',metadata:{}};
  function browserMetadata(){
    const ua=navigator.userAgent,match=ua.match(/(Edg|Firefox|Chrome|Version)\/([\d.]+)/),os=ua.match(/Windows NT ([\d.]+)|(?:CPU (?:iPhone )?OS|Mac OS X) ([\d_]+)|Android ([\d.]+)/);
    const params=new URLSearchParams(location.search),connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
    return {browser:match?.[1]==='Version'?'Safari':match?.[1]==='Edg'?'Edge':match?.[1]||'Unknown',browserVersion:match?.[2]||'',os:os?.[1]?'Windows':/iPhone|iPad/.test(ua)?'iOS':os?.[2]?'macOS':os?.[3]?'Android':'Other',osVersion:(os?.[1]||os?.[2]||os?.[3]||'').replaceAll('_','.'),platform:navigator.platform,language:navigator.language,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,viewportWidth:innerWidth,viewportHeight:innerHeight,screenWidth:screen.width,screenHeight:screen.height,pixelRatio:devicePixelRatio,touchPoints:navigator.maxTouchPoints,pointer:matchMedia('(pointer:coarse)').matches?'touch':'pointer',colourScheme:matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light',reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches?'reduce':'no-preference',connection:connection?.type||'',effectiveType:connection?.effectiveType||'',memory:navigator.deviceMemory,cores:navigator.hardwareConcurrency,downlink:connection?.downlink,rtt:connection?.rtt,saveData:connection?.saveData,displayMode:matchMedia('(display-mode:standalone)').matches?'standalone':'browser',referrer:document.referrer,landing:location.pathname+clean(location.hash),utm:Object.fromEntries(['source','medium','campaign','term','content'].map(k=>[k,clean(params.get('utm_'+k))]))};
  }
  function openDatabase(){return new Promise(resolve=>{
    try{const req=indexedDB.open(STORE,1);req.onupgradeneeded=()=>{req.result.createObjectStore('identity');req.result.createObjectStore('queue',{keyPath:'batchId'});};req.onsuccess=()=>{db=req.result;resolve(db);};req.onerror=()=>resolve(null);}catch{resolve(null);}
  });}
  function storage(op,store,key,value){return new Promise(resolve=>{
    if(!db)return resolve(null);try{const tx=db.transaction(store,op==='get'||op==='getAll'?'readonly':'readwrite'),os=tx.objectStore(store),r=op==='getAll'?os.getAll():op==='put'?os.put(value,key):op==='delete'?os.delete(key):os.get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null);}catch{resolve(null);}
  });}
  async function recovery(){
    await openDatabase();let local='',indexed='',cached='';try{local=localStorage.getItem(KEY)||'';}catch{}
    indexed=await storage('get','identity','token');try{const response=await(await caches.open(CACHE)).match(new URL('/__analytics_identity',location.origin).href);cached=response?await response.text():'';}catch{}
    candidates=[local,indexed,cached].filter(Boolean);return candidates[0]||'';
  }
  async function saveToken(value){
    token=value;candidates=[value];if(!value)return;try{localStorage.setItem(KEY,value);}catch{}
    await storage('put','identity','token',value);try{await(await caches.open(CACHE)).put(new URL('/__analytics_identity',location.origin).href,new Response(value,{headers:{'content-type':'text/plain'}}));}catch{}
  }
  async function clearPending(){queue=[];buffer=[];if(db){const old=await storage('getAll','queue');for(const item of old||[])await storage('delete','queue',item.batchId);}}
  function emit(kind,entity=current,details={},seconds=0){
    if(tier==='none'||tier==='pending')return;
    if(tier==='reduced'&&!['visit','entry_open'].includes(kind))return;
    buffer.push({id:uuid(),at:iso(),kind,entity:clean(entity),activeSeconds:Math.floor(seconds),details});
    if(buffer.length>=60)flush();
  }
  function snapshot(){tick();return {...session,endedAt:iso(),activeSeconds:Math.floor(active),activeNow:lastVisible&&Date.now()-lastAction<60000,metadata:tier==='full'?session.metadata:{}};}
  function closeAttention(){if(current&&attention>0){emit('entry_close',current,{section,depth:scrollDepth},attention);attention=0;}if(current&&sectionAttention>0){emit('read_section',current,{section},sectionAttention);sectionAttention=0;}}
  async function enqueue(){
    if(tier==='none'||tier==='pending')return;
    closeAttention();emit('presence',current,{active:lastVisible&&Date.now()-lastAction<60000,visible:lastVisible});
    while(buffer.length){const events=buffer.splice(0,60),item={batchId:uuid(),session:snapshot(),events,visit:events.some(e=>e.kind==='visit')};queue.push(item);if(tier==='full')await storage('put','queue',undefined,item);}
    if(!queue.length&&tier==='full'){const item={batchId:uuid(),session:snapshot(),events:[],visit:false};queue.push(item);await storage('put','queue',undefined,item);}
  }
  async function flush(beacon=false){
    if(flushing||tier==='none'||tier==='pending'||(Date.now()-lastAction>1800000&&!buffer.length&&!queue.length))return;flushing=true;
    try{
      await enqueue();if(!navigator.onLine)return;
      if(tier==='full'&&!token){await connect();if(!token)return;}
      for(const item of [...queue]){
        const payload=JSON.stringify({...item,token:tier==='full'?token:undefined});
        if(beacon){navigator.sendBeacon('/api/analytics',new Blob([payload],{type:'application/json'}));continue;}
        const response=await originalFetch('/api/analytics',{method:'POST',headers:{'content-type':'application/json'},body:payload,credentials:'same-origin',cache:'no-store'});
        if(response.status===401){token='';await connect();break;}
        if(!response.ok)break;const result=await response.json();
        if(result.tier==='none'){tier='none';await clearPending();break;}
        if(result.tier==='reduced'&&tier==='full'){tier='reduced';await clearPending();break;}
        queue=queue.filter(q=>q.batchId!==item.batchId);if(db)await storage('delete','queue',item.batchId);
      }
    }catch{}finally{flushing=false;}
  }
  function beaconFlush(){
    if(tier==='pending'||tier==='none')return;finishSearch();closeAttention();
    do {const events=buffer.splice(0,60),item={batchId:uuid(),session:snapshot(),events,visit:events.some(e=>e.kind==='visit')};queue.push(item);if(tier==='full')storage('put','queue',undefined,item);if(navigator.onLine&&(tier!=='full'||token))navigator.sendBeacon('/api/analytics',new Blob([JSON.stringify({...item,token:tier==='full'?token:undefined})],{type:'application/json'}));}while(buffer.length);
  }
  async function connect(){
    const response=await originalFetch('/api/analytics?action=bootstrap',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({token,recoveryTokens:candidates,metadata:session.metadata})});
    if(!response.ok)return;const result=await response.json();tier=result.tier;if(tier==='full')await saveToken(result.token);else await clearPending();
  }
  // Change legacy reads into POST before a raw sync credential can enter a request URL.
  window.fetch=async function(input,options){
    let url;try{url=new URL(typeof input==='string'?input:input.url,location.href);}catch{return originalFetch(input,options);}
    if(url.origin!==location.origin||url.pathname!=='/api/sync')return originalFetch(input,options);
    const method=String(options?.method||input?.method||'GET').toUpperCase();let payload;
    if(method==='GET'){payload={action:'read',code:url.searchParams.get('code')};url.search='';}
    else{try{payload=JSON.parse(options?.body||'{}');payload.action='write';}catch{return originalFetch(input,options);}}
    await Promise.race([startup,new Promise(r=>setTimeout(r,800))]);if(tier==='full'&&token)payload.analyticsToken=token;
    const response=await originalFetch(url.pathname,{...options,method:'POST',headers:{...options?.headers,'content-type':'application/json'},body:JSON.stringify(payload)});
    if(response.ok)emit(method==='GET'?'sync_linked':'sync_created','',{success:true});return response;
  };
  function tick(){
    const now=Date.now(),delta=Math.min(2,(now-lastTick)/1000);lastTick=now;
    if(lastVisible&&now-lastAction<60000){active+=Math.max(0,delta);if(current){attention+=Math.max(0,delta);sectionAttention+=Math.max(0,delta);}}
  }
  function rotateSession(){
    if(tier==='pending'||tier==='none')return;
    const end=Math.min(Date.now(),+new Date(session.startedAt)+86400000);closeAttention();
    while(buffer.length){const events=buffer.splice(0,60).map(e=>({...e,at:new Date(Math.min(+new Date(e.at),end)).toISOString()})),item={batchId:uuid(),session:{...snapshot(),endedAt:new Date(end).toISOString(),activeNow:false},events,visit:events.some(e=>e.kind==='visit')};queue.push(item);if(tier==='full')storage('put','queue',undefined,item);}
    Object.assign(session,{id:uuid(),startedAt:iso(),endedAt:iso(),activeSeconds:0,activeNow:false,metadata:browserMetadata()});active=0;current='';lastState='';lastCamera='';scrollDepth=0;emit('visit','');
  }
  function selectedId(){try{if(document.querySelector('#coldCallDialog[open],#ccBriefDialog[open],#r19Dialog[open]')&&modalEntry)return modalEntry;return !document.getElementById('inspector')?.hidden&&typeof selected!=='undefined'&&selected?.type==='node'?selected.id:'';}catch{return '';}}
  function poll(){
    tick();if(tier==='pending'||tier==='none')return;if(Date.now()-+new Date(session.startedAt)>=86400000&&lastVisible&&Date.now()-lastAction<60000)rotateSession();
    const next=selectedId();if(next!==current){closeAttention();if(next){if(repeats.has(next)&&Date.now()-repeats.get(next)<300000)emit('repeat_open',next);repeats.set(next,Date.now());}current=next;scrollDepth=0;section='reading';if(current)emit('entry_open',current);}
    try{
      if(typeof S!=='undefined'){
        const v=typeof rect==='function'?rect():{w:innerWidth,h:innerHeight};
        const mode=v.w>=900&&v.w/Math.max(1,v.h)>=1.7?'wide':'tall';
        let level='';try{level=typeof R11!=='undefined'?String(R11.level().lvl):'';}catch{}
        const state=[S.scope,S.region,S.district,level].join('|');if(state!==lastState){lastState=state;emit('map_level',current,{level,feature:S.scope,section:S.region||'',action:S.district||''});}
        const pose=[Math.round(S.x||0),Math.round(S.y||0),Number((S.z||0).toFixed(4)),v.w,v.h,mode].join('|');
        if(pose!==lastCamera&&Date.now()-lastAction<1500){lastCamera=pose;emit('camera',current,{x:S.x||0,y:S.y||0,z:S.z||0,width:v.w,height:v.h,layout:mode});}
      }
      const study=window.DKLAStudy,st=study?.state(),dialog=document.querySelector('#r18Dialog');
      const studyOpen=dialog?.open||document.querySelector('dialog.r18-study[open]')||document.querySelector('#r18Body')?.closest('dialog')?.open;
      const key=studyOpen?[st?.tab,st?.view,st?.revealed,st?.session?.i,st?.session?.queue?.length].join('|'):'';
      if(key!==lastStudy){lastStudy=key;if(studyOpen){emit('study_open',current,{tab:st?.tab,view:st?.view});if(st?.view==='card')emit('drill_reveal',st?.session?.queue?.[st.session.i]||current,{index:st?.session?.i||0,count:st?.revealed||0,cram:Boolean(st?.session?.cram)});if(st?.view==='summary')emit('drill_complete',current,{complete:true,total:st?.session?.queue?.length||0,cram:Boolean(st?.session?.cram)});}}
      const ratings=study?.ratings();if(ratings){for(const [id,r]of Object.entries(ratings)){if(ratingsInitialized&&r.t!==lastRatings[id]?.t){emit('rating',id,{rating:r.r,count:r.n});cleanStreak=r.r===3?cleanStreak+1:0;if(cleanStreak>=2)emit('streak',id,{streak:cleanStreak,feature:'consecutive-clean-ratings'});}lastRatings[id]={t:r.t};}ratingsInitialized=true;}
      const hs=window.SCOTUSHistory?.state();const hk=hs?.open?[hs.mode,hs.date,hs.seat,hs.justice,hs.case].join('|'):'';if(hk!==lastHistory){lastHistory=hk;if(hk)emit('scotus',clean(hs.case||hs.justice||hs.seat),{action:hs.mode,section:hs.date});}
      for(const [id,feature]of [['coldCallDialog','cold_call'],['ccBriefDialog','cold_call'],['bookDialog','source_open'],['lrsDialog','source_open']]){const open=document.getElementById(id)?.open;if(open&&lastFeature!==id){lastFeature=id;emit(feature,current,{feature:id});}}
      const page=Number(document.getElementById('bookPageInput')?.value);if(page&&document.getElementById('bookPageInput')?.offsetParent){const key='contracts:'+page;if(key!==lastSource){lastSource=key;emit('source_page',current,{page,source:'contracts-selections'});}}
    }catch{}
  }
  function sectionOf(node){
    const el=node?.nodeType===1?node:node?.parentElement;
    const host=el?.closest('[data-section],.takeaway,.r19-section,.brief-section,.cc-section,.entry-notes');
    if(host?.matches('.entry-notes'))return 'notes';
    if(host?.dataset.ccSection!==undefined)return 'cold-call-section-'+host.dataset.ccSection;
    const key=host?.dataset.section;return /^(facts|issue|holding|rule|reasoning|disposition|dissent|concurrence|takeaway|context|timeline|connections)$/i.test(key||'')?key.toLowerCase():host?.classList.contains('takeaway')?'takeaway':'reading';
  }
  const activity=()=>{tick();if(Date.now()-lastAction>1800000||Date.now()-+new Date(session.startedAt)>=86400000)rotateSession();lastAction=Date.now();};
  for(const name of ['pointerdown','pointermove','wheel','keydown','touchstart'])document.addEventListener(name,activity,{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{tick();lastVisible=document.visibilityState==='visible';if(lastVisible){activity();poll();flush();}else beaconFlush();});
  addEventListener('pagehide',()=>{tick();lastVisible=false;beaconFlush();});
  addEventListener('online',async()=>{try{if(tier==='full')await connect();emit('online','');flush();}catch{}});
  addEventListener('offline',()=>{emit('offline','');flush();});
  addEventListener('beforeinstallprompt',()=>emit('install_available',''));addEventListener('appinstalled',()=>emit('install',''));
  addEventListener('beforeprint',()=>emit('print',current));
  addEventListener('error',e=>{
    if(e.target instanceof HTMLImageElement){try{const u=new URL(e.target.currentSrc||e.target.src);if(u.origin===location.origin&&/DKLA-sources|added-sources/.test(u.pathname))emit('missing_source',current,{source:clean(u.pathname)});}catch{}return;}
    let file='';try{file=new URL(e.filename).pathname;}catch{}
    emit('js_error',current,{errorName:e.error?.name||'Error',file:clean(file),line:e.lineno||0,column:e.colno||0});
  },true);
  addEventListener('unhandledrejection',e=>emit('js_error',current,{errorName:clean(e.reason?.name||'UnhandledRejection')}));
  document.addEventListener('copy',()=>{
    const sel=getSelection(),node=sel?.anchorNode,host=node?.parentElement?.closest('#inspector,#coldCallDialog,#ccBriefDialog,#r19BriefDialog,#r18Body');
    if(host)emit('copy',current,{section:sectionOf(node),length:sel?.toString().length||0});
  },true);
  document.addEventListener('scroll',e=>{
    const el=e.target;if(!(el instanceof Element)||!el.closest('#inspector,#coldCallDialog,#ccBriefDialog,#r19BriefDialog,#r18Body'))return;
    activity();const depth=Math.round((el.scrollTop+el.clientHeight)/Math.max(el.scrollHeight,1)*100);scrollDepth=Math.max(scrollDepth,Math.min(100,depth));
    if(Date.now()-lastScroll>1500){lastScroll=Date.now();emit('scroll',current,{depth:scrollDepth,section});}
  },{capture:true,passive:true});
  document.addEventListener('pointerover',e=>{const next=sectionOf(e.target);if(next!==section){if(current&&sectionAttention>0)emit('read_section',current,{section},sectionAttention);sectionAttention=0;section=next;}},{passive:true});
  function finishSearch(){if(search&&!search.clicked)emit('search_abandon','',{query:search.query,results:search.results,clicked:false});search=null;}
  let searchTimer;
  document.addEventListener('input',e=>{
    if(!['search','shCaseSearch','r19Search','glSearch','dictionarySearch','dictSearch','glossarySearch'].includes(e.target.id))return;
    clearTimeout(searchTimer);const query=clean(e.target.value),feature=e.target.id;
    searchTimer=setTimeout(()=>{finishSearch();const ids=[...document.querySelectorAll('#searchResults [data-search-id],#searchResults [data-r19-open],#searchResults [data-dkla-term]')].map(el=>el.dataset.searchId||el.dataset.r19Open||el.dataset.dklaTerm).filter(Boolean).slice(0,30);const results=feature==='r19Search'?document.querySelectorAll('#r19Dialog .r19-row').length:feature==='shCaseSearch'?document.querySelectorAll('#shCaseResults button').length:ids.length;search={query,results,clicked:false};if(query)emit('search','',{query,results,ids,feature});},550);
  },true);
  document.addEventListener('click',e=>{
    const el=e.target.closest('button,a,[data-map-node],[data-map-jump],[data-jump-node],[data-cold-call],[data-authority-open],[data-sh-case]');
    if(!el){const now=Date.now();clicks=clicks.filter(c=>now-c.t<1500);clicks.push({x:e.clientX,y:e.clientY,t:now});if(clicks.length>=3&&clicks.every(c=>Math.abs(c.x-e.clientX)<20&&Math.abs(c.y-e.clientY)<20)){emit('possible_dead_click',current,{count:clicks.length});clicks=[];}return;}
    if(el.closest('#searchResults')&&search){search.clicked=true;emit('search_click',el.dataset.searchId||el.dataset.r19Open||el.dataset.dklaTerm||current,{query:search.query,results:search.results,clicked:true});}
    const d=el.dataset;
    if(d.coldCall){modalEntry=d.coldCall;emit('cold_call',d.coldCall,{action:'open'});}
    if(d.r19Open){modalEntry=d.r19Open;emit('entry_open',d.r19Open,{feature:'supporting-brief'});}
    if(d.authorityOpen||d.authorityGroup||d.authorityMenu||d.authorityConnections)emit('authority',d.authorityOpen||d.authorityGroup||current,{action:'open',feature:d.authorityMenu||d.authorityConnections||''});
    if(d.r21Open)emit('timeline',current,{feature:d.r21Open});
    if(d.r18Tab){emit('study_open',current,{tab:d.r18Tab});if(['pairs','sheets','progress'].includes(d.r18Tab))emit(d.r18Tab,current);}
    if(d.r18Do){const action=d.r18Do;if(/start|again|cram/.test(action))emit('drill_start',current,{action,cram:/cram/.test(action)});if(/export|backup|sheet|print/.test(action))emit(action.includes('print')?'print':'export',current,{action});}
    if(el.id==='helpBtn'||el.id==='help'||/help/i.test(el.id))emit('help',current);
    if(el.id==='r18Install')emit('install_available','',{action:'requested'});
    if(d.dklaTerm||d.term||d.dictionaryTerm||d.glossaryTerm)emit('dictionary',clean(d.dklaTerm||d.term||d.dictionaryTerm||d.glossaryTerm));
    if(d.dklaFile||d.ccSourceBrief)emit('source_open',current,{source:clean(d.dklaFile||d.ccSourceBrief)});
    if(el.tagName==='A'){try{const u=new URL(el.href,location.href);if(u.origin===location.origin&&/DKLA-sources|added-sources/.test(u.pathname))emit('source_open',current,{source:clean(u.pathname),page:Number(new URLSearchParams(u.hash.slice(1)).get('page'))||0});}catch{}}
    setTimeout(poll,80);
  },true);
  for(const name of ['openBook','openLRS','renderSource','help']){
    try{
      const original=window[name];if(typeof original!=='function')continue;
      window[name]=function(...args){const result=original.apply(this,args);if(name==='help')emit('help',current);else if(name==='renderSource'){const page=Number(document.getElementById('bookPageInput')?.value);if(page)emit('source_page',current,{page,source:'contracts-selections'});}else emit('source_open',current,{page:typeof args[0]==='number'?args[0]:Number(args[1])||0,source:name==='openBook'?'contracts-selections':clean(args[0])});return result;};
    }catch{}
  }
  function footer(){const target=document.getElementById('courseHome')?.parentElement||document.querySelector('footer');if(target&&!document.getElementById('dklaPrivacyLink')){const a=document.createElement('a');a.id='dklaPrivacyLink';a.className='dkla-privacy-link';a.href='/privacy.html';a.textContent='Privacy';target.appendChild(a);}}
  async function start(){
    session.metadata=browserMetadata();
    try{
      const response=await originalFetch('/api/analytics?action=policy',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok){tier='none';footer();readyResolve();return;}const result=await response.json();tier=result.tier;
    }catch{tier='full';} // Offline location is unknown; the server re-evaluates it before any storage write.
    if(tier==='full'){
      token=await recovery();queue=await storage('getAll','queue')||[];
      if(navigator.onLine)try{await connect();}catch{}
    }
    readyResolve();footer();if(tier==='none')return;
    emit('visit','');poll();flush();setInterval(poll,1000);setInterval(()=>flush(),15000);
  }
  window.DKLAAnalytics={version:1,flush,ready:startup};
  start();
})();
