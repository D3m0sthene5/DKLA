import { readFileSync } from 'node:fs';
import { configured,ready,query } from '../lib/analytics/db.js';
import { noStore,send,body,sameOrigin,limit,ip,passwordMatches,randomUUID,sign,setCookie,ADMIN_COOKIE,admin,fail,digest } from '../lib/analytics/security.js';
import { undoMerge,deleteProfile } from '../lib/analytics/identity.js';
import { dataPage,locations,storage,suggestions,compactOldest,housekeeping } from '../lib/analytics/reports.js';
import { validId } from '../lib/analytics/validate.js';
const page=readFileSync(new URL('../assets/admin/index.html',import.meta.url),'utf8');
export default async function handler(req,res){
  noStore(res);
  try{
    const params=new URL(req.url,'https://localhost').searchParams,action=params.get('action')||'page';
    if(req.method==='GET'&&action==='page'){
      res.setHeader('content-type','text/html; charset=utf-8');res.setHeader('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");res.statusCode=200;return res.end(page);
    }
    if(!configured())throw fail(503,'not-configured');await ready();
    if(action==='login'&&req.method==='POST'){
      sameOrigin(req);await limit('login:'+ip(req),5,900);const input=await body(req,4096);
      if(!passwordMatches(input.password))throw fail(401,'incorrect-password');
      const id=randomUUID();await query('INSERT INTO dkla_admin_sessions(id,expires_at) VALUES($1,now()+interval \'8 hours\')',[id]);setCookie(res,ADMIN_COOKIE,sign('admin',id,8*3600),8*3600);return send(res,200,{csrf:digest('csrf:'+id)});
    }
    const auth=await admin(req,req.method==='POST');
    if(req.method==='GET'){
      if(action==='status')return send(res,200,{csrf:auth.csrf,emailEnabled:process.env.ANALYTICS_EMAIL_ENABLED==='true',configured:true});
      if(action==='data')return send(res,200,await dataPage(params));
      if(action==='locations')return send(res,200,await locations(params));
      if(action==='identity')return send(res,200,{suggestions:await suggestions()});
      if(action==='storage'){await housekeeping();const data=await storage();if(data.autoCompact&&data.usedMB>=data.limitMB*.95)data.compaction=await compactOldest();return send(res,200,data);}
      throw fail(400,'bad-action');
    }
    if(req.method!=='POST'){res.setHeader('allow','GET, POST');throw fail(405,'method-not-allowed');}
    await limit('admin:'+auth.id,120);const input=await body(req,8192);
    if(action==='logout'){await query('UPDATE dkla_admin_sessions SET revoked=true WHERE id=$1',[auth.id]);setCookie(res,ADMIN_COOKIE,'',0);return send(res,200,{ok:true});}
    if(action==='label'){const label=typeof input.label==='string'?input.label.trim().slice(0,80):'';await query('UPDATE dkla_profiles SET label=$2 WHERE id=$1',[validId(input.id),label]);}
    else if(action==='watch'||action==='exclude'){await query(`UPDATE dkla_profiles SET ${action==='watch'?'watched':'excluded'}=$2 WHERE id=$1`,[validId(input.id),Boolean(input.enabled)]);}
    else if(action==='merge'||action==='reject')throw fail(410,'browser-matching-disabled');
    else if(action==='undo'){await undoMerge(validId(input.id));}
    else if(action==='delete'){
      const [profile]=await query('SELECT handle FROM dkla_profiles WHERE id=$1',[validId(input.id)]);if(!profile||input.confirmation!==profile.handle)throw fail(400,'confirmation-must-match-handle');await deleteProfile(input.id);
    }
    else if(action==='resolve-request')await query('UPDATE dkla_privacy_requests SET resolved_at=now() WHERE id=$1',[validId(input.id)]);
    else if(action==='read-alert')await query('UPDATE dkla_alerts SET read_at=now() WHERE id=$1',[validId(input.id)]);
    else if(action==='compact')return send(res,200,await compactOldest(25));
    else throw fail(400,'bad-action');
    return send(res,200,{ok:true});
  }catch(error){return send(res,error.status||503,{error:error.status?error.message:'temporarily-unavailable'});}
}
