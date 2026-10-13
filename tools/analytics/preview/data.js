/* Deterministic fictional activity. No requests, identifiers or atlas tracking. */
(() => {
  const now = Date.UTC(2026,9,11,18,40);
  const day = 86400000;
  const courses = ['Civil Procedure','Contracts','Legislation and the Regulatory State'];
  const pools = [['shoe','wwvw','cp-pennoyer','cp-erie-decision','cp-twombly','cp-hoffman'],['hamer','lucy','wood-lucy','jacob-youngs','hadley','plante'],['lrs-i-chevron','lrs-i-loper-bright','lrs-i-mead-note','lrs-i-independent-judgment','lrs-k-riggs','lrs-k-mcboyle']];
  const available = new Set(DKLA_CATALOG.nodes.map(n=>n.id));
  pools.forEach((p,i)=>{pools[i]=p.filter(id=>available.has(id));});
  const first = ['Amber','Cedar','Slate','Copper','Quiet','Silver','Moss','Indigo','Golden','Briar','Maple','Juniper'];
  const second = ['Finch','Heron','Fox','Wren','Otter','Lark','Robin','Crane','Owl','Hare','Sparrow','Kite'];
  const glyphs = ['◇','△','✳','○','⌘','◈','⌁','□','✧','⬡','⟐','⊙'];
  const colors = ['#e5aa70','#7cb0df','#aab8d8','#b5c49c','#b6a1cd','#d0b991','#94bdba','#9ec5a7','#d49384','#8aafcf','#adb89b','#a59ccb'];
  const people = first.map((word,i)=>({id:`demo-${String(i+1).padStart(2,'0')}`,handle:`${word} ${second[i]}`,label:i===1?'Avery (sample)':i===3?'Morgan (sample)':'',glyph:glyphs[i],color:colors[i],tier:'full',firstSeen:now-(89-i*4)*day,devices:i===0?2:i%4===0?2:1,networks:[{name:'Campus Wi-Fi (sample)',asn:64510,ip:`198.51.100.${20+i}`,city:'Anchorage',region:'AK',postal:'99501'},...(i===0?[{name:'Home broadband (sample)',asn:64511,ip:'203.0.113.42',city:'Anchorage',region:'AK',postal:'99508'}]:[])],timezone:'America/Anchorage',language:'en-US'}));
  const sessions=[];
  const kinds=['entry','entry','search','entry','source','drill','rating','coldcall','entry','copy'];
  for(let d=0;d<92;d++){
    const count=d<7?5+(d%3):2+(d%4);
    for(let k=0;k<count;k++){
      const pi=(d*3+k*2)%people.length;
      const ci=(pi+d+k)%3;
      const start=now-d*day-(k*83+35)*60000;
      const minutes=18+((d*11+k*7+pi)%45);
      const events=[];
      const length=7+((d+k)%7);
      for(let e=0;e<length;e++){
        const id=pools[ci][(e+k+d)%pools[ci].length];
        const kind=kinds[e%kinds.length];
        const node=DKLA_CATALOG.nodes.find(n=>n.id===id);
        const query=ci===0?['minimum contacts','Erie doctrine','personal jurisdiction','Rule 12(b)(6)'][((d+k+e)%4)]:ci===1?['consideration','promissory estoppel','expectation damages','mailbox rule'][((d+k+e)%4)]:['Chevron after Loper Bright','major questions','statutory interpretation','delegation'][((d+k+e)%4)];
        const active=Math.floor(minutes*60/length*(.65+((e+k)%3)*.12));
        events.push({id:`event-${d}-${k}-${e}`,kind,entity:id,title:node?.title||id,course:courses[ci],at:start+e*minutes*60000/length,offset:e*minutes*60/length,activeSeconds:active,query:kind==='search'?query:null,results:kind==='search'?((d+k)%5===0?0:3+e):null,page:kind==='source'?24+(d+k)%90:null,rating:kind==='rating'?1+((d+k)%3):null,scrollDepth:kind==='entry'||kind==='coldcall'?42+((d+k+e)%59):null,copyLength:kind==='copy'?92+(d+k)*3:null,section:kind==='copy'?'Reasoning':null});
      }
      sessions.push({id:`session-${d}-${k}`,person:people[pi].id,start,end:start+minutes*60000,activeSeconds:events.reduce((a,e)=>a+e.activeSeconds,0),events,course:courses[ci],device:(pi===0&&k%2===0)?'iPhone · Safari 18':'MacBook · Safari 18',tier:'full',network:people[pi].networks[(pi===0&&k%2===0)?1:0],build:'v2.5 · 5506bc4662',viewport:'1440 × 900',pixelRatio:2});
    }
  }
  const live=[0,1,3].map((pi,k)=>{
    const ci=k%3,id=pools[ci][k];
    const title=DKLA_CATALOG.nodes.find(n=>n.id===id).title;
    const events=[{id:`live-${pi}-search`,kind:'search',entity:id,title,course:courses[ci],at:now-13*60000,offset:0,activeSeconds:28,query:ci===0?'personal jurisdiction':ci===1?'consideration':'Loper Bright',results:6},{id:`live-${pi}-entry`,kind:'entry',entity:id,title,course:courses[ci],at:now-(3+k)*60000,offset:600,activeSeconds:(3+k)*60,scrollDepth:63}];
    const s={id:`session-live-${pi}`,person:people[pi].id,start:now-14*60000,end:now,activeSeconds:750,events,course:courses[ci],device:'MacBook · Safari 18',tier:'full',network:people[pi].networks[0],build:'v2.5 · 5506bc4662',live:true};
    sessions.push(s);return {person:s.person,session:s.id,entity:id,title,course:courses[ci],since:events[1].at,status:'active'};
  });
  people.forEach(p=>p.firstSeen=Math.min(...sessions.filter(s=>s.person===p.id).map(s=>s.start)));
  window.DKLA_DEMO={now,courses,people,sessions,live,anonymous:[{day:'2026-10-11',visits:4,opens:17,tier:'reduced'},{day:'2026-10-10',visits:2,opens:11,tier:'reduced'},{day:'2026-10-08',visits:2,opens:7,tier:'reduced'}],storage:{usedMB:184,limitMB:1000,growthMB:22.4}};
})();
