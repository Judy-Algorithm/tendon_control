// Independent bounded review: rejected HTTP requests only; never submits a valid job.
import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validatePreset,verifyNativeBinding} from '../../explainer/native-v2/contracts.js';
import {validFrame,heatmap,responseChart,torqueBars,chartCSV} from '../../explainer/native-v2/charts.js';
const root=new URL('../../',import.meta.url), asset=name=>new URL('explainer/native-v2/data/'+name,root);
const read=url=>JSON.parse(fs.readFileSync(url));
const index=read(asset('myohand-index.json')), run=read(asset(index.runs[0].file)), model=read(asset(index.modelFile));
const checks=[];
const check=(label,fn)=>{fn();checks.push({label,status:'PASS'});};
const preset={schemaVersion:1,engine:'myohand',modelId:run.manifest.modelId,modelHash:run.manifest.modelHash,parameters:{},request:{mode:'pulse',pulseRaw:1}};
check('Legitimate preset',()=>validatePreset(preset,run,'myohand',index.parameters));
for(const [key,value] of [['pulseRaw','" autofocus onfocus="alert(1)'],['duration_s',NaN],['initialQ',[0,Infinity]],['muscle','<img onerror=alert(1)>'],['muscleForceScales',{FDS2:'1.0'}]])check('Reject malformed '+key,()=>assert.throws(()=>validatePreset({...preset,request:{[key]:value}},run,'myohand',index.parameters)));
check('Legitimate binding',()=>assert(verifyNativeBinding(model,run)));
check('Wrong model fingerprint',()=>assert.throws(()=>verifyNativeBinding({...model,manifest:{...model.manifest,modelHash:'bad'}},run)));
check('Wrong geometry fingerprint',()=>assert.throws(()=>verifyNativeBinding(model,run,{manifest:{...model.manifest,modelHash:'bad'}})));
check('Wrong ordered channels',()=>assert.throws(()=>verifyNativeBinding(model,{...run,muscleNames:[...run.muscleNames].reverse()})));
const failed=structuredClone(run);failed.manifest.qc.numericPassed=false;
check('Run-level numeric failure invalidates frame',()=>assert.equal(validFrame(failed.frames[0],failed),false));
check('Heatmap failure legend',()=>assert(heatmap(failed).includes('灰色＝缺失或未通过检查')));
check('All failed heatmap cells gray',()=>assert.equal((heatmap(failed).match(/fill="#b8bcc1"/g)||[]).length,failed.frames.length*failed.muscleNames.length));
check('Failed response has no nonempty data path',()=>assert.equal((responseChart(failed).match(/<path d="M[^\"]+" fill="none"/g)||[]).length,0));
check('Failed torque labelled',()=>assert(torqueBars(failed).includes('缺失 / 未通过检查')));
check('Failed CSV retains numeric values and invalid flags',()=>{const csv=chartCSV(failed);assert(csv.includes('"false","false"'));assert(csv.includes(String(failed.frames[0].activation[0])));});
function request(method,path,payload,headers={}){return new Promise((resolve,reject)=>{const r=http.request({hostname:'127.0.0.1',port:4181,method,path,headers:{'Content-Type':'application/json',...headers}},s=>{let body='';s.on('data',d=>body+=d);s.on('end',()=>resolve({status:s.statusCode,body}));});r.on('error',reject);r.end(payload?JSON.stringify(payload):undefined);});}
const capabilities=await request('GET','/api/native/capabilities');assert.equal(capabilities.status,200);const caps=JSON.parse(capabilities.body);
const tests=[
 ['Foreign Host','GET','/api/native/capabilities',null,{Host:'attacker.invalid'},403],
 ['Foreign Origin','GET','/api/native/capabilities',null,{Origin:'https://attacker.invalid'},403],
 ['Missing Myo hash','POST','/api/native/jobs',{engine:'myohand',request:{}},{},400],
 ['Wrong Myo hash','POST','/api/native/jobs',{engine:'myohand',modelHash:'0'.repeat(64),request:{}},{},400],
 ['Missing OpenSim hash','POST','/api/native/jobs',{engine:'opensim',request:{}},{},400],
 ['Wrong OpenSim hash','POST','/api/native/jobs',{engine:'opensim',modelHash:'0'.repeat(64),request:{}},{},400],
 ['Malicious numeric string','POST','/api/native/jobs',{engine:'myohand',modelHash:caps.engines.myohand.modelHash,request:{pulseRaw:'" autofocus onfocus="alert(1)'}},{},400],
 ['Unknown field','POST','/api/native/jobs',{engine:'myohand',modelHash:caps.engines.myohand.modelHash,request:{modelPath:'/tmp/not-a-model'}},{},400],
 ['Hidden asset','GET','/.git/config',null,{},403],
 ['Script asset','GET','/scripts/native-v2/server.mjs',null,{},403]
];
for(const [label,method,path,payload,headers,expected]of tests){const result=await request(method,path,payload,headers);assert.equal(result.status,expected,label);checks.push({label,status:'PASS',response:result});}
const files=['explainer/native-v2/contracts.js','explainer/native-v2/request-editor.js','explainer/native-v2/workbench.js','explainer/native-v2/charts.js','explainer/native-v2/native-scene.js','scripts/native-v2/server.mjs','scripts/native-v2/myohand_identity.py'];
const result={status:'PASS',timestamp:new Date().toISOString(),acceptedJobsSubmitted:0,capabilities:caps,checks,sourceHashes:Object.fromEntries(files.map(file=>[file,createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex')]))};
const output=process.argv[2];if(output)fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
