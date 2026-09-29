import {effectiveRequest,matchingExperiment} from './contracts.js';
import {escapeXML as esc,format,frameAtTime,validFrame} from './charts.js';

const definitions={fmaxMultiplier:['全肌肉最大等长力倍率','倍'],optimalFiberLengthMultiplier:['全肌肉最优纤维长度倍率','倍'],tendonSlackLengthMultiplier:['全肌肉肌腱松弛长度倍率','倍'],forceScale:['全肌肉力量倍率','倍'],activationTimeScale:['全肌肉响应时间倍率','倍']};
const flatten=(x,p='',out={})=>{if(x&&typeof x==='object'){for(const [k,v] of Object.entries(x))flatten(v,p?p+'.'+k:k,out);}else out[p]=x;return out;};
const sorted=x=>JSON.stringify(Object.entries(x).sort(([a],[b])=>a.localeCompare(b)));
function params(run,engine){const q=effectiveRequest(run,engine);return engine==='opensim'?{fmaxMultiplier:1,optimalFiberLengthMultiplier:1,tendonSlackLengthMultiplier:1,muscles:{},...q.parameters}:{forceScale:q.forceScale??1,activationTimeScale:q.activationTimeScale??1,muscleForceScales:q.muscleForceScales||{},muscleActivationTimeScales:q.muscleActivationTimeScales||{}};}
export function comparisonManifest(baseline,current,engine,{baselineName='基线',currentName='当前'}={}){
 if(!matchingExperiment(baseline,current,engine))return null;
 const a=flatten(params(baseline,engine)),b=flatten(params(current,engine));
 const changes=[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>a[k]!==b[k]).map(k=>({field:k,label:definitions[k]?.[0]||k,unit:definitions[k]?.[1]||(k.includes('max_isometric_force')?'N':/fiber_length|slack_length/.test(k)?'m':'倍'),before:a[k]??'模型默认值',after:b[k]??'模型默认值'}));
 const ea=flatten(baseline.manifest.effective||{}),eb=flatten(current.manifest.effective||{});
 const effectiveChanges=[...new Set([...Object.keys(ea),...Object.keys(eb)])].filter(k=>ea[k]!==eb[k]).map(k=>({field:k,before:ea[k]??null,after:eb[k]??null}));
 return {schemaVersion:1,engine,modelId:current.manifest.modelId,modelHash:current.manifest.modelHash,baseline:{name:baselineName,runId:baseline.manifest.runId},current:{name:currentName,runId:current.manifest.runId},protocol:engine==='opensim'?'相同运动与载荷，重新求肌肉分配':effectiveRequest(current,engine).mode==='tracking'?'相同目标与初态，重新求控制':'相同指令与初态，比较运动',changes,effectiveChanges,fixedInputsVerified:true};
}
export function matchingRequestedParameters(candidate,current,engine,request){
 const pending={...current,manifest:{...current.manifest,request}};
 return matchingExperiment(candidate,pending,engine)&&sorted(flatten(params(candidate,engine)))===sorted(flatten(params(pending,engine)));
}
export function sensitivityData(current,baseline,engine,{frame=0,muscle=0,coordinate=0,metric='activation'}={}){
 const comparison=comparisonManifest(baseline,current,engine);
 if(!comparison||comparison.changes.length!==1||!definitions[comparison.changes[0].field])return {available:false,reason:'先保存基线，再选择只改变一个全局肌肉参数的实际结果。'};
 const change=comparison.changes[0],time=current.frames[frame].time_s;
 const definitionsY={activation:['激活 a','无量纲',f=>f.activation?.[muscle]],force:['肌肉拉力','N',f=>f.tension_N?.[muscle]??f.force_N?.[muscle]],angle:['实际关节角','°',f=>f.q?.[coordinate]*180/Math.PI],reserve:['辅助力矩','N·m',f=>f.reserveTorque_Nm?.[coordinate]]};
 const [label,unit,value]=definitionsY[metric]||definitionsY.activation;
 const samples=[baseline,current].map((r,i)=>{const f=r.frames[frameAtTime(r,time)],y=value(f),valid=validFrame(f,r)&&typeof y==='number'&&Number.isFinite(y);return {runId:r.manifest.runId,x:i?change.after:change.before,y:valid?y:null,time_s:f.time_s,valid,rawValue:Number.isFinite(y)?y:null,status:valid?'accepted':'missing_or_failed',name:i?'当前':'基线'};});
 return {available:true,comparison,parameter:change,metric:{name:metric,label,unit,channel:metric==='angle'||metric==='reserve'?current.coordinateNames[coordinate]:current.muscleNames[muscle]},selectedTime_s:time,samples,note:'两个真实计算点，不插值，不表示最优参数；失败点不填补。'};
}
export function sensitivityChart(data){
 const width=850,height=410,text=(x,y,s,size=13)=>`<text x="${x}" y="${y}" font-size="${size}" fill="#21313e">${esc(s)}</text>`;
 let body=text(28,30,'参数变化 → 响应',18);
 if(!data.available)body+=text(30,90,data.reason);
 else{const left=110,right=770,top=95,bottom=315,points=data.samples,values=points.filter(p=>p.valid).map(p=>p.y),xmin=Math.min(...points.map(p=>p.x)),xmax=Math.max(...points.map(p=>p.x)),xp=(xmax-xmin)*.3||.1,lo=Math.min(0,...values),hi=Math.max(data.metric.name==='activation'?1:0,...values),span=hi-lo||1,x=v=>left+(right-left)*(v-xmin+xp)/(xmax-xmin+2*xp),y=v=>bottom-(bottom-top)*(v-lo)/span;
  body+=text(28,58,`${data.metric.channel} · t = ${format(data.selectedTime_s)} s · ${data.metric.label} (${data.metric.unit})`);
  for(let k=0;k<=4;k++){const v=lo+span*k/4;body+=`<path d="M${left},${y(v)}H${right}" stroke="#dfe5eb"/>`+text(26,y(v)+4,format(v),11);}
  for(const p of points){body+=text(x(p.x)-28,bottom+24,String(p.x),12);body+=p.valid?`<circle cx="${x(p.x)}" cy="${y(p.y)}" r="6" fill="${p.name==='基线'?'#476fa9':'#b77729'}"><title>${esc(p.runId)}: ${p.x}, ${p.y}</title></circle>`+text(x(p.x)+10,y(p.y)-8,`${p.name} ${format(p.y)}`,12):text(x(p.x)-30,top+25,'× 未通过检查',12);}
  body+=text(left+130,bottom+53,`${data.parameter.label} (${data.parameter.unit})`)+text(28,height-16,data.note,11);
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="参数敏感性"><rect width="100%" height="100%" fill="white"/><g font-family="Arial, PingFang SC, sans-serif">${body}</g></svg>`;
}
export function sensitivityCSV(data){
 const rows=[['run_id','parameter','parameter_value','parameter_unit','metric','channel','value','unit','time_s','valid']];
 if(data.available)for(const p of data.samples)rows.push([p.runId,data.parameter.field,p.x,data.parameter.unit,data.metric.name,data.metric.channel,p.y??'',data.metric.unit,p.time_s,p.valid]);
 return rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
}
