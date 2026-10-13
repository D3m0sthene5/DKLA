import { configured,ready,query } from '../lib/analytics/db.js';
import { policy,isBot,body,sameOrigin,send,limit,ip,randomUUID,admin,fail } from '../lib/analytics/security.js';
import { bootstrap,device } from '../lib/analytics/identity.js';
import { metadata } from '../lib/analytics/validate.js';
import { ingest,emailAlerts } from '../lib/analytics/collect.js';

export default async function handler(req,res){
  try{
    // Preview visitors are test traffic, and this rebuild has no authorization
    // to collect new visitor data. Stop before parsing identity or touching DB.
    if(process.env.VERCEL_ENV==='preview')return send(res,200,{tier:'none',scoring:false,configured:false,accepted:0});
    const action=new URL(req.url,'https://localhost').searchParams.get('action')||'ingest';
    const collection=policy(req);
    if(action==='policy'&&req.method==='GET')return send(res,200,{tier:isBot(req)||!configured()?'none':collection.tier,scoring:collection.scoring,configured:configured()});
    if(req.method!=='POST'){res.setHeader('allow','GET, POST');return send(res,405,{error:'method-not-allowed'});}
    sameOrigin(req);const input=await body(req);
    if(!configured())return send(res,503,{error:'not-configured',tier:'none'});
    await ready();await limit('analytics-ip:'+ip(req),300);
    if(action==='request'){
      await limit('privacy:'+ip(req),5,3600);
      const request=typeof input.request==='string'?input.request.trim():'';if(!request||request.length>1500)throw fail(400,'request-must-be-1-to-1500-characters');
      const id=randomUUID(),found=collection.tier==='full'?await device(req):null;
      await query('INSERT INTO dkla_privacy_requests(id,device_id,request) VALUES($1,$2,$3)',[id,found?.id||null,request]);return send(res,201,{reference:id});
    }
    if(action==='exclude-own'){
      await admin(req,true);const found=await device(req);if(!found)throw fail(409,'visit-atlas-first');
      await query('UPDATE dkla_profiles SET excluded=true WHERE id=$1',[found.profile_id]);return send(res,200,{excluded:true});
    }
    if(isBot(req)||collection.tier==='none')return send(res,200,{tier:'none',accepted:0});
    if(action==='bootstrap'){
      if(collection.tier!=='full')return send(res,200,{tier:collection.tier,scoring:false});
      await limit('bootstrap:'+ip(req),120,3600);return send(res,200,await bootstrap(req,res,{metadata:metadata(input.metadata)},collection));
    }
    if(action!=='ingest')throw fail(400,'bad-action');
    const result=await ingest(req,input,collection);await emailAlerts('https://'+req.headers.host);
    return send(res,200,result);
  }catch(error){return send(res,error.status||503,{error:error.status?error.message:'temporarily-unavailable'});}
}
