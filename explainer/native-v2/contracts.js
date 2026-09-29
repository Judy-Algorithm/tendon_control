const MYO_FIELDS=['schemaVersion','modelId','mode','muscle','coordinate','amplitude_rad','duration_s','pulseRaw','pulseStart_s','pulseEnd_s','forceScale','activationTimeScale','muscleForceScales','muscleActivationTimeScales','initialActivation','sampleInterval_s','kp','kd','controllerMetric','actionId','targetTrajectory','initialQ','initialQvel'];
const OPENSIM_FIELDS=['schemaVersion','modelId','runId','actionId','coordinate','targetRad','duration_s','samples','parameters','loadN','trajectory'];
export function validatePreset(p,run,engine,definitions){
 if(p.schemaVersion!==1||p.engine!==engine||p.modelId!==run.manifest?.modelId||p.modelHash!==run.manifest?.modelHash)throw new Error('参数文件不属于当前模型');
 if(!p.parameters||typeof p.parameters!=='object'||Array.isArray(p.parameters))throw new Error('参数结构错误');
 for(const [k,v] of Object.entries(p.parameters)){const d=definitions.find(x=>x.key===k);if(!d||!Number.isFinite(v)||v<d.min||v>d.max)throw new Error('参数字段或数值超出支持范围');}
 if(p.request)validateRequestTypes(p.request,engine,run);
 return p;
}
export function validateRequestTypes(q,engine,run){
 const allowed=engine==='myohand'?MYO_FIELDS:OPENSIM_FIELDS;
 const fail=()=>{throw new Error('原生请求字段、类型或通道不匹配');};
 const record=x=>x&&typeof x==='object'&&!Array.isArray(x)&&!Object.keys(x).some(k=>['__proto__','constructor','prototype'].includes(k));
 const numeric=x=>typeof x==='number'&&Number.isFinite(x);
 const vector=x=>Array.isArray(x)&&x.every(numeric);
 if(!record(q)||Object.keys(q).some(k=>!allowed.includes(k)))fail();
 const special=new Set(['modelId','runId','actionId','mode','muscle','coordinate','controllerMetric','parameters','muscleForceScales','muscleActivationTimeScales','initialQ','initialQvel','trajectory','targetTrajectory']);
 for(const [k,v] of Object.entries(q))if(!special.has(k)&&!numeric(v))fail();
 for(const k of ['modelId','runId','actionId','mode','muscle','coordinate','controllerMetric'])if(q[k]!==undefined&&(typeof q[k]!=='string'||q[k].length>160||/[<>"'\u0000-\u001f]/.test(q[k])))fail();
 if(q.mode!==undefined&&!['pulse','tracking'].includes(q.mode))fail();
 if(q.muscle!==undefined&&run&&!run.muscleNames.includes(q.muscle))fail();
 if(q.coordinate!==undefined&&run&&!run.coordinateNames.includes(q.coordinate))fail();
 for(const k of ['muscleForceScales','muscleActivationTimeScales'])if(q[k]!==undefined){if(!record(q[k]))fail();for(const [n,v] of Object.entries(q[k]))if(!numeric(v)||(run&&!run.muscleNames.includes(n)))fail();}
 if(q.parameters!==undefined){if(!record(q.parameters)||Object.keys(q.parameters).some(k=>!['fmaxMultiplier','optimalFiberLengthMultiplier','tendonSlackLengthMultiplier','muscles'].includes(k)))fail();for(const [k,v] of Object.entries(q.parameters))if(k!=='muscles'&&!numeric(v))fail();if(q.parameters.muscles!==undefined){if(!record(q.parameters.muscles))fail();for(const [n,fields] of Object.entries(q.parameters.muscles)){if((run&&!run.muscleNames.includes(n))||!record(fields))fail();for(const [k,v] of Object.entries(fields))if(!['max_isometric_force','optimal_fiber_length','tendon_slack_length'].includes(k)||!numeric(v))fail();}}}
 for(const k of ['initialQ','initialQvel'])if(q[k]!==undefined&&(!vector(q[k])||(run&&q[k].length!==run.coordinateNames.length)))fail();
 for(const k of ['trajectory','targetTrajectory'])if(q[k]!==undefined){const t=q[k],times=t?.times_s||t?.time_s,rows=t?.q||t?.q_rad;if(!record(t)||!vector(times)||times.length>501||!Array.isArray(rows)||rows.length!==times.length||!rows.every(vector))fail();if(k==='trajectory'&&(!Array.isArray(t.coordinateNames)||!t.coordinateNames.every(n=>typeof n==='string'&&(!run||run.coordinateNames.includes(n)))||!rows.every(r=>r.length===t.coordinateNames.length)))fail();if(k==='targetTrajectory'&&run&&!rows.every(r=>r.length===run.coordinateNames.length))fail();}
 return q;
}
export function verifyNativeBinding(model,run,geometry=null){
 const identity=x=>x?.manifest||x;
 const m=identity(model),r=identity(run),g=geometry&&identity(geometry);
 if(!m?.modelHash||!m?.modelId||m.modelHash!==r?.modelHash||m.modelId!==r?.modelId||(g&&(g.modelHash!==m.modelHash||g.modelId!==m.modelId)))throw new Error('模型、几何与结果标识不匹配，已阻止混用');
 const muscles=model.muscleNames||model.muscles?.map(x=>x.name||x.id);
 const coords=model.coordinateNames||model.coordinates?.filter(x=>!x.constrained).map(x=>x.name||x.id);
 if(!muscles||JSON.stringify(muscles)!==JSON.stringify(run.muscleNames)||!coords||JSON.stringify(coords)!==JSON.stringify(run.coordinateNames))throw new Error('原生通道顺序不匹配，已阻止混用');
 return true;
}
export function effectiveRequest(run,engine){
 const request=run.manifest?.request||{};
 const operational=structuredClone(request);
 // Audit-only descriptions remain in manifest.request and exports, not solver inputs.
 if(engine==='opensim')for(const k of ['mappingAudit','purpose'])delete operational[k];
 return engine==='myohand'?{...Object.fromEntries(MYO_FIELDS.filter(k=>run.manifest?.effective?.[k]!==undefined).map(k=>[k,run.manifest.effective[k]])),...operational}:operational;
}
export function matchingExperiment(a,b,engine){
 if(!a||!b||a.manifest?.modelHash!==b.manifest?.modelHash||a.manifest?.modelId!==b.manifest?.modelId)return false;
 const signature=r=>{const q=effectiveRequest(r,engine);for(const k of ['runId','parameters','forceScale','activationTimeScale','muscleForceScales','muscleActivationTimeScales'])delete q[k];if(engine==='myohand'){q.controllerMetric??='torque';if(q.mode==='pulse')for(const k of ['controllerMetric','kp','kd'])delete q[k];}return JSON.stringify(sort(q));};
 return signature(a)===signature(b);
}
function sort(x){return Array.isArray(x)?x.map(sort):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;}
export function parameterValues(run,engine,definitions){const request=effectiveRequest(run,engine),source=engine==='myohand'?request:request.parameters||{};return Object.fromEntries(definitions.map(p=>[p.key,source[p.key]??p.default??1]));}
export function inspectorSummary(model){if(!model)return {};const {meshes,...fields}=model;return {...fields,meshes:meshes?.map(m=>({id:m.id,name:m.name,vertexCount:m.vertices?.length,faceCount:m.faces?.length,note:'完整几何坐标保存在可下载模型数据中'}))};}
