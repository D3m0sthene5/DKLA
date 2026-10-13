/* Local QA only: isolated in-memory PostgreSQL and fictional records. Never deployed as an API. */
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {setTestDatabase,ready,query} from '../../lib/analytics/db.js';
import {identityAppearance} from '../../lib/analytics/security.js';
import analytics from '../../api/analytics.js';
import admin from '../../api/admin.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
process.env.NODE_ENV='test';process.env.ANALYTICS_SECRET='local-browser-qa-only-'.repeat(3);process.env.ANALYTICS_ADMIN_PASSWORD='local-browser-qa-password';
const db=new PGlite();setTestDatabase(db);await ready();
const ids=['hamer','shoe','wwvw','lucy','cp-erie-decision','lrs-i-chevron','lrs-i-loper-bright'];
for(let p=0;p<6;p++){
  const id=randomUUID(),appearance=identityAppearance(id);await query('INSERT INTO dkla_profiles(id,handle,colour,glyph,label,watched,created_at) VALUES($1,$2,$3,$4,$5,$6,now()-interval \'80 days\')',[id,appearance.handle,appearance.colour,appearance.glyph,p===1?'Avery (QA sample)':'',p===0]);
  await query('INSERT INTO dkla_devices(id,profile_id,scoring_allowed,metadata) VALUES($1,$1,$2,$3::jsonb)',[id,p!==5,JSON.stringify({browser:'Safari',browserVersion:'18',os:'macOS',osVersion:'15',timezone:'America/Anchorage',language:'en-US',screenWidth:1440,screenHeight:900,viewportWidth:1440,viewportHeight:900,pointer:'pointer',colourScheme:'dark',reducedMotion:'no-preference',cores:8,memory:8})]);
  for(let day=0;day<60;day+=3+(p%3)){
    const sid=randomUUID(),start=new Date(Date.now()-day*86400000-(p*50+40)*60000),end=new Date(+start+35*60000),entity=ids[(p+day)%ids.length];
    await query(`INSERT INTO dkla_sessions(id,device_id,started_at,ended_at,active_seconds,ip,country,region,city,postal,asn,network,tier,build,metadata,active_now,received_at) VALUES($1,$2,$3,$4,1250,$5,'US',$6,$7,'99501','AS64510','Campus Wi-Fi (QA sample)','full','v2.5',$8::jsonb,$9,$10)`,[sid,id,start.toISOString(),end.toISOString(),'198.51.100.'+(20+p),p===5?'CA':'AK',p===5?'Sacramento':'Anchorage',JSON.stringify({browser:'Safari',browserVersion:'18',os:'macOS',timezone:'America/Anchorage',language:'en-US',referrer:'https://example.com/course',landing:'/DKLA-v2.5.html#node='+entity}),day===0&&p<3,day===0&&p<3?new Date().toISOString():end.toISOString()]);
    // Fictional locations exercise aggregation, both insets, foreign and legacy gaps.
    const locations=[['US','AK','Anchorage',61.22,-149.9],['US','NY','New York',40.71,-74.01],['US','NY','New York',40.71,-74.01],['US','HI','Honolulu',21.31,-157.86],['JP','13','Tokyo',35.68,139.69],['US','CA','Sacramento',null,null]];
    await query('UPDATE dkla_sessions SET country=$2,region=$3,city=$4,latitude=$5,longitude=$6 WHERE id=$1',[sid,...locations[p]]);
    const course=entity.startsWith('lrs-')?'Legislation and the Regulatory State':entity.startsWith('cp-')||entity==='shoe'||entity==='wwvw'?'Civil Procedure':'Contracts';
    for(const [index,kind,seconds,details]of [[0,'search',0,{query:p%2?'personal jurisdiction':'consideration',results:day%9===0?0:6}],[1,'entry_open',0,{}],[2,'camera',0,{layout:'wide',x:900,y:-200,z:.1,width:1333,height:796}],[3,'entry_close',650,{depth:85}],[4,'rating',0,{rating:1+p%3,count:3}],[5,'cold_call',0,{action:'open'}],[6,'copy',0,{section:'reasoning',length:152}],[7,'source_page',0,{source:'contracts-selections',page:284}],[8,'drill_start',0,{cram:p%2===0}],[9,'drill_complete',0,{complete:true,total:20}]])await query('INSERT INTO dkla_events(id,session_id,at,kind,entity,course,region_id,active_seconds,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)',[randomUUID(),sid,new Date(+start+index*180000).toISOString(),kind,entity,course,course==='Contracts'?'formation-region':'cp-personal-region',seconds,JSON.stringify(details)]);
  }
}
await query(`INSERT INTO dkla_anonymous_totals(day,build,region,entity,visits,opens) VALUES(current_date,'v2.5','DE','',4,0)`);
await query(`INSERT INTO dkla_privacy_requests(id,request) VALUES($1,'QA sample: please review my records.')`,[randomUUID()]);
await query(`INSERT INTO dkla_alerts(id,profile_id,session_id) SELECT $1,d.profile_id,s.id FROM dkla_sessions s JOIN dkla_devices d ON d.id=s.device_id LIMIT 1`,[randomUUID()]);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost:4318');
    req.headers['x-vercel-ip-country']='US';req.headers['x-vercel-ip-country-region']='AK';req.headers['x-vercel-ip-city']='Anchorage';
    if(url.pathname==='/api/analytics')return await analytics(req,res);
    if(url.pathname==='/api/admin')return await admin(req,res);
    if(url.pathname==='/admin'){req.url='/api/admin?action=page';return await admin(req,res);}
    const pathname=url.pathname==='/'?'/DKLA-v2.5.html':url.pathname;
    if(!/^\/(?:DKLA-v2\.5\.html|assets\/|privacy\.html|sw\.js|version\.json|manifest\.webmanifest|icons\/|tools\/analytics\/preview\/)/.test(pathname)){res.statusCode=404;return res.end('Not found');}
    const file=path.resolve(root,'.'+decodeURIComponent(pathname));if(!file.startsWith(root+path.sep))throw new Error('path-denied');
    const info=await stat(file);if(!info.isFile()){res.statusCode=404;return res.end('Not found');}
    res.setHeader('content-type',types[path.extname(file)]||'application/octet-stream');res.setHeader('cache-control','no-store');res.end(await readFile(file));
  }catch{res.statusCode=404;res.end('Not found');}
});
server.listen(4318,'127.0.0.1',()=>console.log('Local QA: http://localhost:4318/admin — isolated fictional PostgreSQL data.'));
process.on('SIGINT',()=>server.close(async()=>{await db.close();process.exit(0);}));
