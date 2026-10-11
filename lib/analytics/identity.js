import { query, transaction, ready, serial } from './db.js';
import { cookie, verify, sign, VISITOR_COOKIE, setCookie, identityAppearance, randomUUID, digest, fail } from './security.js';

export async function device(req, recovery = '') {
  // The HttpOnly server cookie wins over a conflicting local recovery token.
  const proof=verify(cookie(req,VISITOR_COOKIE),'visitor')||verify(recovery,'visitor');
  if(!proof)return null;
  await ready(); const rows=await query(`SELECT d.*,p.excluded,p.watched,p.handle,p.label FROM dkla_devices d JOIN dkla_profiles p ON p.id=d.profile_id WHERE d.id=$1`,[proof.id]);
  return rows[0]||null;
}
export async function bootstrap(req,res,input,collection){
  await ready(); let found=await device(req,input.token);
  if(!found&&Array.isArray(input.recoveryTokens))for(const candidate of input.recoveryTokens.slice(0,3)){found=await device(req,candidate);if(found)break;}
  if(!found){
    const id=randomUUID(),appearance=identityAppearance(id);
    await transaction([
      ['INSERT INTO dkla_profiles(id,handle,colour,glyph) VALUES($1,$2,$3,$4)',[id,appearance.handle,appearance.colour,appearance.glyph]],
      ['INSERT INTO dkla_devices(id,profile_id,scoring_allowed,metadata) VALUES($1,$1,$2,$3::jsonb)',[id,collection.scoring,JSON.stringify(input.metadata||{})]]
    ]);found={id,profile_id:id,scoring_allowed:collection.scoring,excluded:false};
  }else{
    await query('UPDATE dkla_devices SET last_seen=now(),scoring_allowed=scoring_allowed AND $2,metadata=$3::jsonb WHERE id=$1',[found.id,collection.scoring,JSON.stringify(input.metadata||{})]);
  }
  const token=sign('visitor',found.id,366*86400);setCookie(res,VISITOR_COOKIE,token,366*86400);
  return {tier:found.excluded?'none':'full',token,scoring:collection.scoring&&found.scoring_allowed,excluded:Boolean(found.excluded)};
}
export async function mergeProfiles(source,target,reason='manual'){
  if(source===target)throw fail(400,'same-profile');
  const id=randomUUID();
  const result=await serial(()=>transaction([
    [`INSERT INTO dkla_merges(id,source,target,reason,membership)
      SELECT $1,s.id,t.id,$4,jsonb_build_object('devices',(SELECT coalesce(jsonb_agg(id),'[]') FROM dkla_devices WHERE profile_id=s.id),'sync',(SELECT coalesce(jsonb_agg(digest),'[]') FROM dkla_sync_links WHERE profile_id=s.id))
      FROM dkla_profiles s,dkla_profiles t WHERE s.id=$2 AND t.id=$3 AND EXISTS(SELECT 1 FROM dkla_devices WHERE profile_id=s.id) AND EXISTS(SELECT 1 FROM dkla_devices WHERE profile_id=t.id) RETURNING id`,[id,source,target,reason]],
    ['UPDATE dkla_devices SET profile_id=$2 WHERE profile_id=$1 AND EXISTS(SELECT 1 FROM dkla_merges WHERE id=$3)',[source,target,id]],
    ['UPDATE dkla_sync_links SET profile_id=$2 WHERE profile_id=$1 AND EXISTS(SELECT 1 FROM dkla_merges WHERE id=$3)',[source,target,id]],
    ['UPDATE dkla_profiles SET watched=watched OR (SELECT watched FROM dkla_profiles WHERE id=$1),excluded=excluded OR (SELECT excluded FROM dkla_profiles WHERE id=$1),last_seen=GREATEST(last_seen,(SELECT last_seen FROM dkla_profiles WHERE id=$1)) WHERE id=$2',[source,target]]
  ]));
  if(!result[0].length)throw fail(409,'profiles-changed');return id;
}
export async function undoMerge(id){
  // Refuse an old undo after another merge touched either profile. This keeps a later verified link intact.
  const gate=alias=>`${alias}.id=$1 AND ${alias}.reason='manual' AND ${alias}.undone_at IS NULL AND NOT EXISTS (SELECT 1 FROM dkla_merges later WHERE later.created_at>${alias}.created_at AND later.undone_at IS NULL AND (later.source IN (${alias}.source,${alias}.target) OR later.target IN (${alias}.source,${alias}.target)))`;
  const result=await serial(()=>transaction([
    [`UPDATE dkla_devices d SET profile_id=m.source FROM dkla_merges m WHERE ${gate('m')} AND d.profile_id=m.target AND d.id IN (SELECT value::uuid FROM jsonb_array_elements_text(m.membership->'devices')) RETURNING d.id`,[id]],
    [`UPDATE dkla_sync_links s SET profile_id=m.source FROM dkla_merges m WHERE ${gate('m')} AND s.digest IN (SELECT value FROM jsonb_array_elements_text(m.membership->'sync'))`,[id]],
    [`UPDATE dkla_merges m SET undone_at=now() WHERE ${gate('m')} RETURNING id`,[id]]
  ]));
  if(!result[2].length)throw fail(409,'undo-conflicts-with-later-link');return result[0].length;
}
export async function verifiedSync(req,recovery,codeDigest){
  const found=await device(req,recovery);if(!found||found.excluded)return;
  await serial(()=>transaction([
    ['INSERT INTO dkla_sync_links(digest,profile_id) VALUES($1,$2) ON CONFLICT(digest) DO NOTHING',[codeDigest,found.profile_id]],
    [`INSERT INTO dkla_merges(id,source,target,reason,membership) SELECT $3,$2,l.profile_id,'sync_verified',jsonb_build_object('devices',(SELECT coalesce(jsonb_agg(id),'[]') FROM dkla_devices WHERE profile_id=$2),'sync',(SELECT coalesce(jsonb_agg(digest),'[]') FROM dkla_sync_links WHERE profile_id=$2)) FROM dkla_sync_links l WHERE l.digest=$1 AND l.profile_id<>$2`,[codeDigest,found.profile_id,randomUUID()]],
    [`UPDATE dkla_devices SET profile_id=(SELECT profile_id FROM dkla_sync_links WHERE digest=$1) WHERE profile_id=$2`,[codeDigest,found.profile_id]],
    [`UPDATE dkla_sync_links SET profile_id=(SELECT profile_id FROM dkla_sync_links WHERE digest=$1) WHERE profile_id=$2`,[codeDigest,found.profile_id]]
  ]));
}
export async function deleteProfile(id){
  const relatives=`WITH RECURSIVE relatives(id) AS (SELECT $1::uuid UNION SELECT CASE WHEN m.source=r.id THEN m.target ELSE m.source END FROM dkla_merges m JOIN relatives r ON m.source=r.id OR m.target=r.id WHERE m.undone_at IS NULL)`;
  return serial(()=>transaction([
    ['DELETE FROM dkla_privacy_requests WHERE device_id IN (SELECT id FROM dkla_devices WHERE profile_id=$1)',[id]],
    [`${relatives} DELETE FROM dkla_reviews WHERE split_part(pair,':',1) IN(SELECT id::text FROM relatives) OR split_part(pair,':',2) IN(SELECT id::text FROM relatives)`,[id]],
    [`${relatives} DELETE FROM dkla_profiles p WHERE p.id=$1 OR (p.id IN(SELECT id FROM relatives) AND NOT EXISTS(SELECT 1 FROM dkla_devices d WHERE d.profile_id=p.id)) RETURNING id`,[id]]
  ]));
}
