/* Browser checks against the built site. Run after `pnpm build`.

   Serves dist/ on a loopback port, then in a real (headless) browser with
   throwaway storage:
     1. browser_smoke.cjs   29 interactions at desktop, landscape phone and
                            portrait phone: boot, a subject, a case and its
                            Cold Call, old hash routes, the dictionary,
                            authorities, an embedded source, SCOTUS History,
                            Study, export/restore and a saved Note surviving reload
     2. compare_geometry.py the Home camera and every subject's position match
                            the recorded layout in tools/verify/geometry/
     3. home-fit.spec.mjs   Home fits nine window sizes with nothing clipped,
                            overlapping or unnamed

   Nothing here touches the live site, the database or real visitor data. */
import {spawn,spawnSync} from 'node:child_process';
import http from 'node:http';
import {root,python} from '../runtime.mjs';
const port=8767,base=`http://127.0.0.1:${port}`,page=`${base}/DKLA-v2.6.html`;
const server=spawn(process.execPath,['tools/preview.mjs','--no-build','--port',String(port)],{cwd:root,stdio:'ignore'});
const up=()=>new Promise(resolve=>http.get(base+'/version.json',res=>{res.resume();resolve(res.statusCode===200);}).on('error',()=>resolve(false)));
// Unlike runtime.run, a failing step must still let the server be stopped.
function step(name,command,args,env={}){
  const result=spawnSync(command,args,{cwd:root,stdio:'inherit',env:{...process.env,PYTHONUTF8:'1',...env}});
  if(result.error||result.status!==0)throw Error('FAILED: '+name);
}
let code=0;
try{
  for(let i=0;!(await up());i++){if(i>80)throw Error('Preview server did not start');await new Promise(r=>setTimeout(r,250));}
  step('browser interactions',process.execPath,['tools/verify/browser_smoke.cjs','--url',page,'--output','work/browser-smoke']);
  step('map geometry',python,['-X','utf8','tools/verify/compare_geometry.py','tools/verify/geometry','work/browser-smoke']);
  step('Home at nine window sizes',process.execPath,['node_modules/@playwright/test/cli.js','test','tools/v25/home-fit.spec.mjs','--workers=1','--reporter=line'],{DKLA_HOME_TEST_URL:page});
  console.log('Browser checks passed.');
}catch(error){console.error(error.message||error);code=1;}
finally{server.kill();}
process.exit(code);
