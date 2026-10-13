import { query,transaction,serial } from './db.js';
import { device } from './identity.js';
import { ip,geography,fail,randomUUID } from './security.js';
import { batch,entries } from './validate.js';
import { networkFor } from './network.js';

export async function ingest(req,input,collection){
  const clean=batch(input);
  if(collection.tier==='none')return {accepted:0,tier:'none'};
  if(collection.tier==='reduced')return anonymous(input,clean,collection.geo);
  const found=await device(req);if(!found)throw fail(401,'bootstrap-required');if(found.excluded)return {accepted:0,tier:'none',excluded:true};
  const s=clean.session,geo=geography(req),address=ip(req),network=networkFor(address);
  const statements=[
    ['UPDATE dkla_devices SET last_seen=now(),scoring_allowed=scoring_allowed AND $2 WHERE id=$1',[found.id,collection.scoring]],
    [`INSERT INTO dkla_alerts(id,profile_id,session_id) SELECT $3,p.id,$2 FROM dkla_profiles p WHERE p.id=$1 AND p.watched AND p.last_seen<now()-interval '30 minutes' AND EXISTS(SELECT 1 FROM dkla_sessions WHERE id=$2 AND device_id=$4) ON CONFLICT(session_id) DO NOTHING`,[found.profile_id,s.id,randomUUID(),found.id]]
  ];
  // Insert the session before its alert. The profile's previous last_seen is still available.
  statements.splice(1,0,[`INSERT INTO dkla_sessions(id,device_id,started_at,ended_at,active_seconds,ip,country,region,city,postal,asn,network,geo_missing,tier,build,metadata,active_now,latitude,longitude)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'full',$14,$15::jsonb,$16,$17,$18)
    ON CONFLICT(id) DO UPDATE SET ended_at=GREATEST(dkla_sessions.ended_at,EXCLUDED.ended_at),received_at=now(),active_seconds=GREATEST(dkla_sessions.active_seconds,EXCLUDED.active_seconds),active_now=CASE WHEN EXCLUDED.ended_at>=dkla_sessions.ended_at THEN EXCLUDED.active_now ELSE dkla_sessions.active_now END
    WHERE dkla_sessions.device_id=EXCLUDED.device_id RETURNING id`,[s.id,found.id,s.startedAt,s.endedAt,s.activeSeconds,address,geo.country,geo.region,geo.city,geo.postal,network.asn,network.network,geo.missing,s.build,JSON.stringify(s.metadata),Boolean(input.session.activeNow)&&+new Date(s.endedAt)>Date.now()-30000,geo.latitude,geo.longitude]]);
  if(clean.events.length){
    // A delayed offline batch can reopen a packed session. Restore its existing events atomically before adding new ones.
    statements.push([`INSERT INTO dkla_events(id,session_id,at,kind,entity,course,region_id,active_seconds,details) SELECT e.id,$1,e.at,e.kind,e.entity,e.course,e.region_id,e.active_seconds,e.details FROM dkla_sessions s CROSS JOIN LATERAL jsonb_to_recordset(s.summary->'events') AS e(id uuid,at timestamptz,kind text,entity text,course text,region_id text,active_seconds integer,details jsonb) WHERE s.id=$1 AND s.device_id=$2 AND s.compacted ON CONFLICT(id) DO NOTHING`,[s.id,found.id]]);
    statements.push(['UPDATE dkla_sessions SET compacted=false,summary=\'{}\' WHERE id=$1 AND device_id=$2 AND compacted',[s.id,found.id]]);
  }
  for(const e of clean.events)statements.push([`INSERT INTO dkla_events(id,session_id,at,kind,entity,course,region_id,active_seconds,details) SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb WHERE EXISTS(SELECT 1 FROM dkla_sessions WHERE id=$2 AND device_id=$10 AND NOT compacted) ON CONFLICT(id) DO NOTHING`,[e.id,s.id,e.at,e.kind,e.entity,e.course,e.region,e.activeSeconds,JSON.stringify(e.details),found.id]]);
  statements.push(['UPDATE dkla_profiles SET last_seen=now() WHERE id=$1',[found.profile_id]]);
  const result=await serial(()=>transaction(statements));if(!result[1].length)throw fail(409,'session-owner-conflict');
  return {accepted:clean.events.length,tier:'full',scoring:collection.scoring&&found.scoring_allowed};
}
async function anonymous(input,clean,geo){
  // These random batch ids last 48 hours for retry deduplication; there is no device id or profile.
  const id=input.batchId; if(!/^[0-9a-f-]{36}$/i.test(id||''))throw fail(400,'bad-batch-id');
  const day=clean.session.startedAt.slice(0,10),region=geo.country||'unknown',build=clean.session.build;
  const statements=[['INSERT INTO dkla_anonymous_batches(id,expires_at) VALUES($1,now()+interval \'48 hours\') ON CONFLICT DO NOTHING RETURNING id',[id]]];
  const totals=new Map();for(const e of clean.events)if(e.kind==='entry_open'&&entries.has(e.entity))totals.set(e.entity,(totals.get(e.entity)||0)+1);
  // Gating through xmax cannot distinguish an already inserted batch in a second statement.
  // A single CTE performs both deduplication and accumulation atomically.
  const rows=[{entity:'',visits:input.visit?1:0,opens:0},...[...totals].map(([entity,opens])=>({entity,opens,visits:0}))];
  const result=await query(`WITH fresh AS (INSERT INTO dkla_anonymous_batches(id,expires_at) VALUES($1,now()+interval '48 hours') ON CONFLICT DO NOTHING RETURNING id), items AS (SELECT * FROM jsonb_to_recordset($5::jsonb) AS x(entity text,visits integer,opens integer)) INSERT INTO dkla_anonymous_totals(day,build,region,entity,visits,opens) SELECT $2::date,$3,$4,entity,visits,opens FROM items WHERE EXISTS(SELECT 1 FROM fresh) ON CONFLICT(day,build,region,entity) DO UPDATE SET visits=dkla_anonymous_totals.visits+EXCLUDED.visits,opens=dkla_anonymous_totals.opens+EXCLUDED.opens RETURNING entity`,[id,day,build,region,JSON.stringify(rows)]);
  return {accepted:result.length,tier:'reduced'};
}
export async function emailAlerts(origin){
  if(process.env.ANALYTICS_EMAIL_ENABLED!=='true'||!process.env.RESEND_API_KEY||!process.env.ANALYTICS_ALERT_EMAIL_TO||!process.env.ANALYTICS_ALERT_EMAIL_FROM)return;
  const rows=await query(`UPDATE dkla_alerts SET email_status='sending' WHERE id IN(SELECT id FROM dkla_alerts WHERE email_status='disabled' ORDER BY created_at LIMIT 3) RETURNING id,profile_id`);
  for(const row of rows){
    const [person]=await query('SELECT handle,label FROM dkla_profiles WHERE id=$1',[row.profile_id]);
    try{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+process.env.RESEND_API_KEY,'content-type':'application/json','idempotency-key':'dkla-return-'+row.id},body:JSON.stringify({from:process.env.ANALYTICS_ALERT_EMAIL_FROM,to:[process.env.ANALYTICS_ALERT_EMAIL_TO],subject:(person.label||person.handle)+' returned to DKLA',text:`${person.label||person.handle} returned to DKLA.\n${origin}/admin#visitor=${row.profile_id}`}),signal:AbortSignal.timeout(5000)});await query('UPDATE dkla_alerts SET email_status=$2 WHERE id=$1',[row.id,response.ok?'sent':'failed']);}catch{await query('UPDATE dkla_alerts SET email_status=\'failed\' WHERE id=$1',[row.id]);}
  }
}
