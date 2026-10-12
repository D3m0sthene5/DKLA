import { query,transaction } from './db.js';
import { catalog,entries } from './validate.js';
import { fail,UUID } from './security.js';
const courses=['Civil Procedure','Contracts','Legislation and the Regulatory State'];
const stamp=value=>+new Date(value);
const kinds={entry_open:'entry',entry_close:'entry_end',source_open:'source',source_page:'source',drill_start:'drill',drill_reveal:'drill',drill_complete:'drill',cold_call:'coldcall'};
export function publicEvent(e,s){const d=e.details||{},n=entries.get(e.entity);return {id:e.id,kind:kinds[e.kind]||e.kind,semanticKind:e.kind,entity:e.entity,title:n?.title||d.feature||e.entity||e.kind.replaceAll('_',' '),course:e.course,at:stamp(e.at),offset:(stamp(e.at)-stamp(s.started_at))/1000,activeSeconds:e.active_seconds,query:d.query??null,results:d.results??null,page:d.page??null,rating:d.rating??null,scrollDepth:d.depth??null,copyLength:d.length??null,section:d.section||null,details:d};}
export function range(params){
  const now=new Date(),start=new Date(params.get('start')||new Date(+now-112*86400000)),end=new Date(params.get('end')||now);
  if(!Number.isFinite(+start)||!Number.isFinite(+end)||+start>+end)throw fail(400,'bad-range');
  return {start:start.toISOString(),end:end.toISOString()};
}
export async function dataPage(params){
  const dates=range(params),sessionPage=Math.max(0,Math.floor(Number(params.get('sessionPage'))||0)),eventPage=Math.max(0,Math.floor(Number(params.get('eventPage'))||0));
  if(sessionPage>100000||eventPage>100000)throw fail(400,'bad-page');
  const profile=params.get('profile')||'',session=params.get('session')||'';
  if((profile&&!UUID.test(profile))||(session&&!UUID.test(session)))throw fail(400,'bad-id');
  const filter=`s.started_at>=$1 AND s.started_at<=$2 AND ($3='' OR d.profile_id::text=$3) AND ($4='' OR s.id::text=$4)`;
  const values=[dates.start,dates.end,profile,session],historyLimit=params.get('fullHistory')==='true'?null:200;
  const [people,devices,sessions,events,anonymous,alerts,requests,merges]=await Promise.all([
    query('SELECT p.* FROM dkla_profiles p WHERE EXISTS(SELECT 1 FROM dkla_devices d WHERE d.profile_id=p.id) ORDER BY p.last_seen DESC'),
    query('SELECT * FROM dkla_devices ORDER BY first_seen'),
    query(`SELECT s.*,d.profile_id FROM dkla_sessions s JOIN dkla_devices d ON d.id=s.device_id WHERE ${filter} ORDER BY s.started_at,s.id LIMIT 50 OFFSET $5`,[...values,sessionPage*50]),
    query(`SELECT e.* FROM dkla_events e JOIN dkla_sessions s ON s.id=e.session_id JOIN dkla_devices d ON d.id=s.device_id WHERE ${filter} ORDER BY e.at,e.id LIMIT 500 OFFSET $5`,[...values,eventPage*500]),
    query('SELECT * FROM dkla_anonymous_totals WHERE day>=$1::date AND day<=$2::date ORDER BY day',[dates.start,dates.end]),
    query('SELECT * FROM dkla_alerts ORDER BY created_at DESC LIMIT $1',[historyLimit]),
    query('SELECT r.*,d.profile_id FROM dkla_privacy_requests r LEFT JOIN dkla_devices d ON d.id=r.device_id ORDER BY created_at DESC LIMIT $1',[historyLimit]),
    query('SELECT * FROM dkla_merges ORDER BY created_at DESC LIMIT $1',[historyLimit])
  ]);
  return {now:Date.now(),courses,people,devices,sessions,events,anonymous,alerts,requests,merges,range:dates,moreSessions:sessions.length===50,moreEvents:events.length===500};
}
export async function locations(params){
  const dates=range(params),course=params.get('course')||'all';
  if(course!=='all'&&!courses.includes(course))throw fail(400,'bad-course');
  // One latest visit per currently linked profile, across every session page.
  // Packed events remain eligible through dkla_all_events.
  const rows=await query(`WITH latest AS (
    SELECT DISTINCT ON(d.profile_id) d.profile_id,s.country,s.region,s.city,s.latitude,s.longitude
    FROM dkla_sessions s JOIN dkla_devices d ON d.id=s.device_id
    WHERE s.started_at>=$1 AND s.started_at<=$2
    AND ($3='all' OR EXISTS(SELECT 1 FROM dkla_all_events e WHERE e.session_id=s.id AND e.course=$3))
    ORDER BY d.profile_id,s.started_at DESC,s.id DESC
  ) SELECT country,region,latitude,longitude,min(city) AS city,count(*)::integer AS users
    FROM latest GROUP BY country,region,latitude,longitude
    ORDER BY count(*) DESC,country,region,latitude,longitude`,[dates.start,dates.end,course]);
  const summary={total:0,us:0,foreign:0,unavailable:0},points=[];
  for(const row of rows){
    const users=Number(row.users);summary.total+=users;
    if(row.country&&row.country!=='US'){summary.foreign+=users;continue;}
    const lat=row.latitude,lon=row.longitude;
    const valid=typeof lat==='number'&&typeof lon==='number'&&Number.isFinite(lat)&&Number.isFinite(lon);
    const area=valid&&(row.region==='AK'||row.region==='ALASKA')&&lat>=50&&lat<=73&&(lon<=-129&&lon>=-180||lon>=170&&lon<=180)?'alaska':
      valid&&(row.region==='HI'||row.region==='HAWAII')&&lat>=18&&lat<=23&&lon>=-161&&lon<=-154?'hawaii':
      valid&&lat>=24&&lat<=50&&lon>=-125&&lon<=-66?'main':null;
    if(row.country!=='US'||!area){summary.unavailable+=users;continue;}
    summary.us+=users;points.push({...row,users,area});
  }
  const anonymous=await query(`SELECT coalesce(sum(visits),0)::integer AS visits FROM dkla_anonymous_totals WHERE day>=$1::date AND day<=$2::date`,[dates.start,dates.end]);
  return {range:dates,course,points,summary,anonymousVisits:course==='all'?anonymous[0].visits:0};
}
export async function storage(){
  const [{bytes}]=await query(`SELECT pg_database_size(current_database())::text AS bytes`);
  await query('INSERT INTO dkla_storage_samples(day,bytes) VALUES(current_date,$1) ON CONFLICT(day) DO UPDATE SET bytes=EXCLUDED.bytes',[bytes]);
  const samples=await query('SELECT day,bytes::text FROM dkla_storage_samples ORDER BY day DESC LIMIT 31');
  const newest=samples[0],oldest=samples.at(-1),days=oldest?Math.max(1,(stamp(newest.day)-stamp(oldest.day))/86400000):0;
  const growth=samples.length>1?Math.max(0,(Number(newest.bytes)-Number(oldest.bytes))/days*30/1048576):null;
  const own=await query(`SELECT coalesce(sum(pg_total_relation_size(oid)),0)::text AS bytes FROM pg_class WHERE relname LIKE 'dkla_%' AND relkind='r'`);
  return {usedMB:Number(bytes)/1048576,ownedMB:Number(own[0].bytes)/1048576,limitMB:Math.max(100,Number(process.env.ANALYTICS_STORAGE_LIMIT_MB)||1000),growthMB:growth,samples:samples.length,autoCompact:process.env.ANALYTICS_AUTO_COMPACT==='true'};
}
export async function housekeeping(){
  // Only anti-abuse/dedup/login bookkeeping has a fixed TTL. Visitor detail has no age-based deletion.
  await transaction([
    ['DELETE FROM dkla_rate_limits WHERE expires_at<now()'],['DELETE FROM dkla_anonymous_batches WHERE expires_at<now()'],['DELETE FROM dkla_admin_sessions WHERE expires_at<now()']
  ]);
}
export async function compactOldest(count=25){
  const result=await transaction([
    [`WITH oldest AS (SELECT id FROM dkla_sessions WHERE NOT compacted AND received_at<now()-interval '1 day' ORDER BY started_at LIMIT $1), grouped AS (SELECT s.id,jsonb_build_object('compactedAt',now(),'eventCount',count(e.id),'events',coalesce(jsonb_agg(jsonb_build_object('id',e.id,'at',e.at,'kind',e.kind,'entity',e.entity,'course',e.course,'region_id',e.region_id,'active_seconds',e.active_seconds,'details',e.details) ORDER BY e.at,e.id) FILTER(WHERE e.id IS NOT NULL),'[]'::jsonb)) AS summary FROM dkla_sessions s LEFT JOIN dkla_events e ON e.session_id=s.id WHERE s.id IN(SELECT id FROM oldest) GROUP BY s.id) UPDATE dkla_sessions s SET summary=g.summary,compacted=true FROM grouped g WHERE s.id=g.id RETURNING s.id`,[Math.max(1,Math.min(100,count))]],
    ['DELETE FROM dkla_events WHERE session_id IN(SELECT id FROM dkla_sessions WHERE compacted)']
  ]);
  // Packed per-session JSON retains the semantic path, search, rating and attention data, while removing row/index overhead.
  // PostgreSQL TOAST compresses large JSON. This operation does not reclaim allocated database pages immediately.
  return {sessions:result[0].length,physicalSpace:'Reusable PostgreSQL pages; allocated database size may fall only after maintenance.'};
}
export async function suggestions(){
  const rows=await query(`SELECT p.id,p.handle,p.label,d.metadata,s.ip,s.asn,s.network,s.city,s.country,s.region,
    (SELECT array_agg(DISTINCT course) FROM dkla_all_events e JOIN dkla_sessions es ON es.id=e.session_id JOIN dkla_devices ed ON ed.id=es.device_id WHERE ed.profile_id=p.id AND course<>'') AS courses,
    (SELECT array_agg(DISTINCT entity) FROM dkla_all_events e JOIN dkla_sessions es ON es.id=e.session_id JOIN dkla_devices ed ON ed.id=es.device_id WHERE ed.profile_id=p.id AND e.kind='entry_open') AS entries,
    (SELECT array_agg(DISTINCT extract(hour FROM es.started_at AT TIME ZONE coalesce(nullif(d.metadata->>'timezone',''),'UTC'))::integer) FROM dkla_sessions es JOIN dkla_devices ed ON ed.id=es.device_id WHERE ed.profile_id=p.id) AS hours
    FROM dkla_profiles p JOIN dkla_devices d ON d.profile_id=p.id LEFT JOIN LATERAL(SELECT * FROM dkla_sessions WHERE device_id=d.id ORDER BY started_at DESC LIMIT 1)s ON true
    WHERE NOT p.excluded AND NOT EXISTS(SELECT 1 FROM dkla_devices blocked WHERE blocked.profile_id=p.id AND NOT blocked.scoring_allowed)
    AND NOT EXISTS(SELECT 1 FROM dkla_sessions ca JOIN dkla_devices cd ON cd.id=ca.device_id WHERE cd.profile_id=p.id AND ca.country='US' AND ca.region IN('CA','CALIFORNIA')) ORDER BY p.id`);
  const reviews=await query('SELECT pair FROM dkla_reviews'),rejected=new Set(reviews.map(r=>r.pair)),pairs=new Map();
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
    const a=rows[i],b=rows[j];if(a.id===b.id)continue;const pair=[a.id,b.id].sort().join(':');if(rejected.has(pair))continue;
    const evidence=[];let score=0;const add=(condition,weight,detail)=>{if(condition){score+=weight;evidence.push({weight,detail});}};
    const am=a.metadata||{},bm=b.metadata||{};
    add(a.ip&&a.ip===b.ip,18,'Same observed IP address');add(a.asn&&a.asn===b.asn,7,'Same network ASN');add(a.city&&a.city===b.city,5,'Same city');
    add(am.browser&&am.browser===bm.browser&&am.browserVersion===bm.browserVersion,10,'Same browser and version');add(am.os&&am.os===bm.os&&am.osVersion===bm.osVersion,10,'Same OS and version');
    add(am.screenWidth&&am.screenWidth===bm.screenWidth&&am.screenHeight===bm.screenHeight,7,'Same screen size');add(am.viewportWidth&&am.viewportWidth===bm.viewportWidth&&am.viewportHeight===bm.viewportHeight,3,'Same viewport size');
    add(am.timezone&&am.timezone===bm.timezone,5,'Same time zone');add(am.language&&am.language===bm.language,5,'Same language');
    const overlap=(x,y)=>(x||[]).filter(v=>(y||[]).includes(v)).length;
    add(overlap(a.courses,b.courses)>0,5,'Overlapping courses');add(overlap(a.entries,b.entries)>=3,15,'At least three entries in common');add(overlap(a.hours,b.hours)>=2,10,'At least two shared active hours (local time)');
    if(score>=40&&(!pairs.has(pair)||pairs.get(pair).score<score))pairs.set(pair,{pair,source:a.id,target:b.id,score,evidence});
  }
  return [...pairs.values()].sort((a,b)=>b.score-a.score).slice(0,100);
}
export {catalog};
