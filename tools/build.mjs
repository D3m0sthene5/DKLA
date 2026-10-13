/* Rebuild the existing standalone release from reviewed source on every deploy. */
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const choices=process.env.DKLA_PYTHON?[process.env.DKLA_PYTHON]:process.platform==='win32'?['python','python3']:['python3','python'];
const python=choices.find(command=>{
  const result=spawnSync(command,['-X','utf8','-c','import sys; assert sys.version_info >= (3,10)'],{cwd:root,stdio:'ignore',timeout:10000});
  return !result.error&&result.status===0;
});
if(!python)throw new Error('Python 3.10+ is required. Set DKLA_PYTHON to its executable path.');
function run(command,args){
  const result=spawnSync(command,args,{cwd:root,stdio:'inherit',env:{...process.env,PYTHONUTF8:'1'}});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
run(python,['-X','utf8','tools/r19/assemble.py']);
run(python,['-X','utf8','tools/r19/check.py']);
// Untracked local/preview sessions do not need the analytics network database.
run(process.execPath,['tools/analytics/prepare.mjs',...(process.env.VERCEL_ENV==='production'?[]:['--catalog-only'])]);
