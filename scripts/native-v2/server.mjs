// Local-only native workbench. No public tunnel, remote shell, or model-path input.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateRequestTypes} from '../../explainer/native-v2/contracts.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const port=Number(process.env.PORT||4181);
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'tendon-native-v2-'));
const runtimes={opensim:{python:process.env.OPENSIM_PYTHON,model:process.env.OPENSIM_MODEL},myohand:{python:process.env.MYOHAND_PYTHON}};
for(const [engine,cfg] of Object.entries(runtimes)){try{await fs.access(cfg.python);if(engine==='opensim')await fs.access(cfg.model);cfg.available=true;}catch{cfg.available=false;}}
if(runtimes.opensim.available)runtimes.opensim.modelHash=createHash('sha256').update(await fs.readFile(runtimes.opensim.model)).digest('hex');
if(runtimes.myohand.available){const identity=spawnSync(runtimes.myohand.python,[path.join(root,'scripts/native-v2/myohand_identity.py')],{encoding:'utf8',timeout:15000});try{const {modelHash}=JSON.parse(identity.stdout);if(identity.status!==0||!/^[0-9a-f]{64}$/.test(modelHash))throw new Error('identity');runtimes.myohand.modelHash=modelHash;}catch{runtimes.myohand.available=false;}}
const jobs=new Map();let active=null;
const sanitize=s=>String(s).replaceAll(root,'[project]').replaceAll(temp,'[job]').replace(/\/Users\/[^\s"']+/g,'[local-path]').slice(-3000);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.md':'text/plain; charset=utf-8'};
function json(res,code,data){res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(data));}
function validate(payload){
 if(!payload||!['opensim','myohand'].includes(payload.engine)||!payload.request||Array.isArray(payload.request)||typeof payload.request!=='object')throw new Error('Invalid native request');
 const allowed=payload.engine==='opensim'?new Set(['schemaVersion','modelId','runId','actionId','coordinate','targetRad','duration_s','samples','parameters','loadN','trajectory']):new Set(['schemaVersion','modelId','mode','muscle','coordinate','amplitude_rad','duration_s','pulseRaw','pulseStart_s','pulseEnd_s','forceScale','activationTimeScale','muscleForceScales','muscleActivationTimeScales','initialActivation','sampleInterval_s','kp','kd','controllerMetric','actionId','targetTrajectory','initialQ','initialQvel']);
 if(Object.keys(payload.request).some(k=>!allowed.has(k)))throw new Error('Unknown request field');
 validateRequestTypes(payload.request,payload.engine);
 if(payload.request.runId&&!/^[a-zA-Z0-9_-]{1,80}$/.test(payload.request.runId))throw new Error('Invalid runId');
 if(payload.request.samples!==undefined&&(!Number.isInteger(payload.request.samples)||payload.request.samples<3||payload.request.samples>251))throw new Error('samples outside 3–251');
 for(const tr of [payload.request.trajectory,payload.request.targetTrajectory])if(tr){const times=tr.times_s||tr.time_s;if(!Array.isArray(times)||times.length>501)throw new Error('Trajectory exceeds supported job size');}
 if(!runtimes[payload.engine].available)throw new Error('Native runtime not configured');
 if(typeof payload.modelHash!=='string'||payload.modelHash!==runtimes[payload.engine].modelHash)throw new Error('This local service requires the exact model fingerprint; no silent model substitution');
 return payload;
}
async function pump(){if(active)return;const j=[...jobs.values()].find(j=>j.status==='queued');if(!j)return;active=j.id;j.status='running';j.stage='原生引擎计算中';j.startedAt=new Date().toISOString();
 try{await fs.mkdir(j.directory);await fs.writeFile(path.join(j.directory,'request.json'),JSON.stringify(j.request));const cfg=runtimes[j.engine];
  const args=j.engine==='myohand'?[path.join(root,'scripts/native-v2/myohand_runner.py'),'--request',path.join(j.directory,'request.json'),'--output',path.join(j.directory,'result.json')]:[path.join(root,'scripts/native-v2/opensim_run.py'),'--model',cfg.model,'--request',path.join(j.directory,'request.json'),'--output',path.join(j.directory,'evidence'),'--public-output',path.join(j.directory,'result.json')];
  j.child=spawn(cfg.python,args,{cwd:root,env:{...process.env,OMP_NUM_THREADS:'1',OPENBLAS_NUM_THREADS:'1'},stdio:['ignore','pipe','pipe']});let log='';
  const collect=d=>{log=(log+d.toString()).slice(-100000);};j.child.stdout.on('data',collect);j.child.stderr.on('data',collect);
  const timer=setTimeout(()=>{j.error='原生求解超过 900 秒；日志已保留，未生成完整结果。';j.child.kill('SIGKILL');},900000);
  const code=await new Promise((resolve,reject)=>{j.child.once('error',reject);j.child.once('close',resolve);}).finally(()=>clearTimeout(timer));
  await fs.writeFile(path.join(j.directory,'native.log'),log);
  if(j.status!=='cancelled'){if(code!==0)throw new Error(j.error||sanitize(log)||'Native solver failed');j.result=JSON.parse(await fs.readFile(path.join(j.directory,'result.json'),'utf8'));if(j.result.manifest?.modelHash!==j.modelHash)throw new Error('Native output fingerprint differs from requested model; result withheld');j.status='complete';j.stage='原生结果就绪';}
 }catch(e){if(j.status!=='cancelled'){j.status='failed';j.error=sanitize(e.message);j.stage='求解失败，已保留日志';}}
 finally{j.finishedAt=new Date().toISOString();j.child=null;active=null;pump();}
}
function snapshot(j){return {id:j.id,engine:j.engine,status:j.status,stage:j.stage,error:j.error,startedAt:j.startedAt,finishedAt:j.finishedAt,...(j.status==='complete'?{result:j.result}:{})};}
const server=http.createServer(async(req,res)=>{
 try{
  const permitted=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);if(!permitted.has(req.headers.host)){json(res,403,{error:'Local host only'});return;}
  if(req.headers.origin&&!permitted.has(new URL(req.headers.origin).host)){json(res,403,{error:'Same-origin only'});return;}
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/api/mano/model'&&req.method==='GET'){
   if(!process.env.MANO_MODEL_JSON){json(res,404,{error:'User-local MANO not configured'});return;}
   const model=JSON.parse(await fs.readFile(process.env.MANO_MODEL_JSON,'utf8'));
   if(model.schema!=='mano-local-lbs-v1')throw Error('Local MANO schema mismatch');
   json(res,200,model);return;
  }
  if(url.pathname==='/api/native/capabilities'){json(res,200,{localOnly:true,engines:Object.fromEntries(Object.entries(runtimes).map(([k,v])=>[k,{available:v.available,modelHash:v.modelHash}]))});return;}
  if(url.pathname==='/api/native/jobs'&&req.method==='POST'){
   let body='';for await(const chunk of req){body+=chunk;if(body.length>300000){json(res,413,{error:'Request too large'});return;}}
   const p=validate(JSON.parse(body));if([...jobs.values()].filter(j=>['queued','running'].includes(j.status)).length>=4){json(res,429,{error:'Native queue full'});return;}
   const id=randomUUID(),job={id,engine:p.engine,modelHash:p.modelHash,request:p.request,status:'queued',stage:'等待原生计算',directory:path.join(temp,id)};jobs.set(id,job);json(res,202,{id,status:'queued'});pump();return;
  }
  const match=url.pathname.match(/^\/api\/native\/jobs\/([0-9a-f-]{36})$/);
  if(match){const j=jobs.get(match[1]);if(!j){json(res,404,{error:'Unknown job'});return;}if(req.method==='DELETE'){j.status='cancelled';j.stage='已取消';j.child?.kill('SIGKILL');json(res,200,{status:'cancelled'});return;}if(req.method==='GET'){json(res,200,snapshot(j));return;}}
  if(url.pathname.startsWith('/api/')){json(res,404,{error:'Unknown endpoint'});return;}
  if(!['GET','HEAD'].includes(req.method)){json(res,405,{error:'Method not allowed'});return;}
  const relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname),filename=path.resolve(root,'.'+relative);
  if(!filename.startsWith(root+path.sep)||relative.split('/').some(p=>p.startsWith('.'))||relative.startsWith('/node_modules/')||relative.startsWith('/scripts/')){json(res,403,{error:'Not a public asset'});return;}
  const real=await fs.realpath(filename);if(!real.startsWith(root+path.sep)){json(res,403,{error:'Asset resolves outside project'});return;}
  const data=await fs.readFile(real);res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){json(res,e.code==='ENOENT'?404:400,{error:sanitize(e.message)});}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local native workbench http://127.0.0.1:${port}\nJob evidence retained: ${temp}`));
process.on('SIGINT',()=>{for(const j of jobs.values())j.child?.kill('SIGKILL');server.close(()=>process.exit(0));});
