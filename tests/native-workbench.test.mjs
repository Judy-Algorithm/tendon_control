import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {heatmap,torqueBars,responseChart,chartCSV,validFrame} from '../explainer/native-v2/charts.js';
import {effectiveRequest,matchingExperiment,validatePreset,validateRequestTypes,verifyNativeBinding} from '../explainer/native-v2/contracts.js';
const load=f=>JSON.parse(fs.readFileSync(new URL('../explainer/native-v2/data/'+f,import.meta.url),'utf8'));
const myo=load('myohand-run-pulse.json'),edited=load('myohand-run-pulse-force125.json'),so=load('opensim-finger-baseline.json');
test('native experiment comparability changes only implemented muscle parameters',()=>{
 assert.ok(matchingExperiment(myo,edited,'myohand'));
 const defaulted=structuredClone(edited);defaulted.manifest.effective.controllerMetric='torque';assert.ok(matchingExperiment(myo,defaulted,'myohand'));
 const r=structuredClone(myo);r.manifest.request={...effectiveRequest(r,'myohand'),pulseRaw:.6};assert.equal(matchingExperiment(myo,r,'myohand'),false);
 r.manifest.modelHash='different';assert.equal(matchingExperiment(myo,r,'myohand'),false);
});
test('Myo rerun uses effective default settings, not absent original request values',()=>{
 const q=effectiveRequest(myo,'myohand');assert.equal(q.muscle,'FDS2');assert.equal(q.mode,'pulse');assert.equal(q.forceScale,1);assert.equal(q.muscleParameters,undefined);
});
test('all channel torque plot uses signed native Nm, zero line, and exact contribution',()=>{
 for(const r of [myo,so]){const svg=torqueBars(r,null,3,0);for(const n of r.muscleNames)assert.ok(svg.includes(n));assert.ok(svg.includes('N·m'));assert.ok(svg.includes(String(r.frames[3].torque_Nm[0][0])));}
});
test('failed frames stay grey in maps and missing in signed bars, while CSV keeps flags',()=>{
 const r=structuredClone(so);r.frames[0].valid=false;r.frames[0].nativeSolverFailed=true;assert.equal(validFrame(r.frames[0]),false);
 assert.ok(heatmap(r).includes('#b8bcc1'));assert.ok(torqueBars(r,null,0,0).includes('缺失'));assert.ok(chartCSV(r).includes('"false","true"'));
});
test('response traces distinguish ctrl, activation, positive tension and target angle',()=>{
 const svg=responseChart(myo,null,11,8);assert.ok(svg.includes('控制 ctrl'));assert.ok(svg.includes('拉力 (N)'));assert.ok(svg.includes('黑虚线：当前控制'));
 const csv=chartCSV(myo);assert.ok(csv.includes('"signed_actuator_force"'));assert.ok(csv.includes('"tension"'));assert.ok(csv.includes('"ctrl"'));
 const sc=chartCSV(so);assert.ok(sc.includes('"reserve_torque"'));assert.ok(sc.includes('"required_torque"'));
});
test('preset import rejects other models, unknown fields and out-of-range multipliers',()=>{
 const p={schemaVersion:1,engine:'myohand',modelId:myo.manifest.modelId,modelHash:myo.manifest.modelHash,parameters:{forceScale:1.1},request:effectiveRequest(myo,'myohand')};
 const defs=[{key:'forceScale',min:.5,max:1.5}];assert.equal(validatePreset(p,myo,'myohand',defs),p);
 assert.throws(()=>validatePreset({...p,modelHash:'bad'},myo,'myohand',defs));assert.throws(()=>validatePreset({...p,parameters:{forceScale:99}},myo,'myohand',defs));assert.throws(()=>validatePreset({...p,request:{execute:'bad'}},myo,'myohand',defs));
});
test('preset and API reject attribute injection and malformed nested numeric fields',()=>{
 for(const request of [{pulseRaw:'0" autofocus onfocus="alert(1)'},{muscleForceScales:{FDS2:'bad'}},{initialQ:[0,'x']},{targetTrajectory:{time_s:[0,1],q_rad:[[0],['x']]}},{parameters:{muscles:{FDSI:{max_isometric_force:'bad'}}}}])assert.throws(()=>validateRequestTypes(request,request.parameters?'opensim':'myohand',request.parameters?so:myo));
});
test('run-level numerical failure masks all figures but preserves flagged raw CSV values',()=>{
 const r=structuredClone(myo);r.manifest.qc.numericPassed=false;assert.equal(validFrame(r.frames[3],r),false);assert.ok(heatmap(r).includes('#b8bcc1'));assert.ok(torqueBars(r,null,3,0).includes('未通过检查'));assert.ok(chartCSV(r).includes('"false","false"'));assert.ok(chartCSV(r).includes(String(r.frames[3].activation[0])));
});
test('every active native record is bound to matching model, geometry and channel order',()=>{
 const cache=new Map(),read=f=>{if(!cache.has(f))cache.set(f,load(f));return cache.get(f);};
 for(const engine of ['myohand','opensim']){const idx=read(engine+'-index.json');for(const item of idx.runs){const r=load(item.file),m=read(item.modelFile||idx.modelFile),gf=item.geometryFile||idx.geometryFile,g=gf?read(gf):null;assert.equal(verifyNativeBinding(m,r,g),true,item.file);validateRequestTypes(effectiveRequest(r,engine),engine,r);}}
 const m=read('myohand-model.json');assert.throws(()=>verifyNativeBinding(m,{...myo,manifest:{...myo.manifest,modelHash:'bad'}}));
 const r=structuredClone(myo);r.muscleNames.reverse();assert.throws(()=>verifyNativeBinding(m,r));
});
