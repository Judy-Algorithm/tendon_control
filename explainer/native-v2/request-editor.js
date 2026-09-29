import {escapeXML as esc,format} from './charts.js';
import {effectiveRequest} from './contracts.js';

// Edits only fields implemented by the native adapters. Other native fields stay read-only.
export function createRequestEditor(host,{engine,model,getRun,onChange}){
 let request={},selected=0;
 const input=(key,label,value,min,max,step,unit='')=>`<label>${esc(label)}<span><input data-request="${esc(key)}" type="number" value="${esc(value)}" min="${esc(min)}" max="${esc(max)}" step="any"><small>${esc(unit)}</small></span></label>`;
 function signal(){onChange();}
 function render(){
  const run=getRun();if(!run)return;
  const name=run.muscleNames[selected],m=model?.muscles?.find(m=>(m.name||m.id)===name),q=model?.coordinates?.find(c=>(c.name||c.id)===request.coordinate);
  const explicit=request.trajectory||request.targetTrajectory;
  let action='';
  if(engine==='myohand'){
   action=`<p>${request.mode==='tracking'?'给动作，求控制 · 自定义跟踪器':'给控制，看运动 · 原生前向仿真'}</p>`;
   if(request.mode!=='tracking')action+=input('pulseRaw','原始短指令',request.pulseRaw??.5,-1,1,.05)+input('pulseStart_s','开始时间',request.pulseStart_s??.04,0,5,.01,'s')+input('pulseEnd_s','结束时间',request.pulseEnd_s??.14,0,5,.01,'s')+'<p>原始指令经过 MyoSuite 的 logistic 转换成为 ctrl；−1 也不等于完全零控制。</p>';
   else action+=input('kp','跟踪增益 kp',request.kp??100,1,1000,1)+input('kd','阻尼增益 kd',request.kd??20,1,100,1);
   if(!explicit)action+=input('duration_s','物理时长',request.duration_s??.4,.1,5,.1,'s');
  }else{
   action='<p>关节角直接输入 → ID → 官方 SO</p>';
   if(!explicit)action+=input('targetRad','目标角度',request.targetRad??.25,q?.min??-1,q?.max??1,.01,'rad')+input('duration_s','物理时长',request.duration_s??2,.5,5,.1,'s');
   action+=input('loadN','食指末节外力',request.loadN??0,0,20,.1,'N')+'<p>固定作用点：末节局部 (0, −0.012, 0) m；方向：世界 +Z。</p>';
  }
  if(explicit)action+='<p>原动作的角度与时间已锁定；本页不暗中改幅度。</p>';
  let muscleFields='';
  if(engine==='myohand')muscleFields=input('muscleForceScales','此肌肉力量 ×',request.muscleForceScales?.[name]??1,.5,1.5,.05)+input('muscleActivationTimeScales','此肌肉响应时间 ×',request.muscleActivationTimeScales?.[name]??1,.5,2,.1)+`<p>与全局倍率相乘。原生力量字段：${format(m?.gainprm?.[2])} N；时间常数：${(m?.dynprm||[]).slice(0,2).map(format).join(' / ')} s。</p>`;
  else if(m){const d=request.parameters||{};for(const [field,label,scale,unit] of [['max_isometric_force','最大等长肌力','fmaxMultiplier','N'],['optimal_fiber_length','最优纤维长度','optimalFiberLengthMultiplier','m'],['tendon_slack_length','肌腱松弛长度','tendonSlackLengthMultiplier','m']])muscleFields+=input(field,label,d.muscles?.[name]?.[field]??m[field]*(d[scale]??1),m[field]*.8,m[field]*1.2,'any',unit);muscleFields+='<p>逐肌肉绝对值优先于全局倍率。范围是本演示安全编辑界限，不是人体生理范围。</p>';}
  host.innerHTML=`<details><summary>更多参数 · 当前肌肉 ${esc(name)}</summary><div class="nv-params">${muscleFields}</div><button class="nv-clear-muscle">恢复此肌肉</button></details><details><summary>动作、指令与外力</summary><div class="nv-params">${action}</div></details>`;
  host.querySelectorAll('input').forEach(el=>{el.setAttribute('aria-label',el.closest('label').textContent);el.oninput=()=>{const k=el.dataset.request,v=el.valueAsNumber;if(['muscleForceScales','muscleActivationTimeScales'].includes(k)){request[k]={...request[k],[name]:v};}else if(['max_isometric_force','optimal_fiber_length','tendon_slack_length'].includes(k)){request.parameters||={};request.parameters.muscles||={};request.parameters.muscles[name]={...request.parameters.muscles[name],[k]:v};}else{request[k]=v;}signal();};});
  host.querySelector('.nv-clear-muscle').onclick=()=>{if(engine==='myohand'){delete request.muscleForceScales?.[name];delete request.muscleActivationTimeScales?.[name];}else delete request.parameters?.muscles?.[name];render();signal();};
 }
 return {
  reset(run){request=structuredClone(effectiveRequest(run,engine));selected=Math.max(0,run.muscleNames.indexOf(request.muscle));render();},
  select(index){selected=index;render();},
  values(){return structuredClone(request);},
  import(q){request=structuredClone(q);render();signal();},
  valid(){return [...host.querySelectorAll('input')].every(i=>i.checkValidity()&&Number.isFinite(i.valueAsNumber));},
  globalChange(params){if(engine==='myohand')Object.assign(request,params);else request.parameters={...request.parameters,...params};render();},
  pulse(muscle){request={...request,mode:'pulse',muscle,actionId:`native:${muscle}:pulse`};delete request.targetTrajectory;request.duration_s=.4;request.pulseStart_s=.04;request.pulseEnd_s=.14;request.pulseRaw=.5;render();signal();},
 };
}
