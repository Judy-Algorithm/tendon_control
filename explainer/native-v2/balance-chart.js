import {escapeXML as esc,format,validFrame} from './charts.js';

const finite=x=>typeof x==='number'&&Number.isFinite(x);
const DEFINITIONS={
  opensim:[
    {title:'力矩需求与分担',fields:[['requiredTorque_Nm','所需力矩','#34434d'],['qfrcActuator_Nm','肌肉合力矩','#476fa9'],['reserveTorque_Nm','辅助 reserve 力矩','#b77729']]},
    {title:'原生平衡残差（独立纵轴）',fields:[['balanceResidual_Nm','平衡残差','#8262a5']]}
  ],
  myohand:[
    {title:'执行器与约束',fields:[['qfrcActuator_Nm','执行器力矩','#476fa9'],['qfrcConstraint_Nm','约束力矩','#b77729']]},
    {title:'被动与偏置项（独立纵轴）',fields:[['qfrcPassive_Nm','被动力矩','#4f8175'],['qfrcBias_Nm','偏置项：重力 + 科氏/离心','#8262a5']]}
  ]
};
const text=(x,y,s,size=13,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" ${extra}>${esc(s)}</text>`;
const engineOf=run=>/opensim/i.test(run?.manifest?.engine||'')?'opensim':/mujoco|myo/i.test((run?.manifest?.engine||'')+' '+(run?.manifest?.modelId||''))?'myohand':null;
const compatible=(a,b)=>Boolean(a?.manifest?.modelHash&&a.manifest.modelHash===b?.manifest?.modelHash&&a.manifest.modelId===b.manifest.modelId&&JSON.stringify(a.coordinateNames)===JSON.stringify(b.coordinateNames)&&JSON.stringify(a.muscleNames)===JSON.stringify(b.muscleNames));

/** Chart-ready native values. Missing/failed observations remain null, never zero-filled. */
export function jointBalanceSeries(run,baseline=null,coordinate=0){
  const engine=engineOf(run),name=run?.coordinateNames?.[coordinate];
  if(!engine||!Number.isInteger(coordinate)||!name||!Array.isArray(run?.frames))return {supported:false,reason:!engine?'未支持此引擎的力矩字段':'所选原生关节坐标不可用',groups:[]};
  const useBaseline=baseline&&compatible(run,baseline)&&engineOf(baseline)===engine;
  const runs=useBaseline?[['baseline',baseline],['current',run]]:[['current',run]];
  const groups=DEFINITIONS[engine].map(def=>({...def,series:def.fields.flatMap(([field,label,color])=>runs.map(([tag,r])=>{
    const rows=r.frames.map((f,index)=>{const raw=f[field]?.[coordinate],time_s=f.time_s,value=validFrame(f,r)&&finite(time_s)&&finite(raw)?raw:null;return {index,time_s,value};});
    return {field,label,color,tag,rows,present:r.frames.some(f=>finite(f[field]?.[coordinate])),validCount:rows.filter(p=>p.value!==null).length,total:rows.length};
  }))}));
  return {supported:true,engine,coordinate,name,groups,baselineRejected:Boolean(baseline&&!useBaseline),hasBaseline:Boolean(useBaseline)};
}

/** Scientific SVG for existing native workbench / SVG and PNG exports. */
export function jointBalanceChart(run,baseline=null,coordinate=0){
  const data=jointBalanceSeries(run,baseline,coordinate),width=900,height=740,left=105,right=865,plotH=155;
  const title=data.engine==='opensim'?'关节力矩 · 需求、分担与残差':'关节力矩 · 原生分项';
  let body=text(24,31,title,19);
  if(!data.supported)return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="180" viewBox="0 0 900 180" role="img" aria-label="${esc(title)}"><rect width="900" height="180" fill="white"/><g font-family="Arial, PingFang SC, sans-serif" fill="#21313e">${body}${text(24,90,data.reason,16)}</g></svg>`;
  const allTimes=data.groups.flatMap(g=>g.series.flatMap(s=>s.rows.map(p=>p.time_s))).filter(finite);
  const t0=allTimes.length?Math.min(...allTimes):0,t1=allTimes.length?Math.max(...allTimes):0,span=t1-t0||1;
  const x=t=>left+(right-left)*(t-t0)/span;
  body+=text(24,56,`${data.name} · 力矩单位 N·m · ${data.hasBaseline?'实线：当前；虚线：基线':'实线：当前'}`,13);
  if(data.baselineRejected)body+=text(24,76,'基线模型或通道不一致，未叠加。',12,'fill="#986221"');
  data.groups.forEach((group,gi)=>{
    const top=gi===0?139:445,bottom=top+plotH,values=group.series.flatMap(s=>s.rows.map(p=>p.value)).filter(finite);
    body+=text(left,top-43,group.title,15);
    // One legend entry per physical field, not one ambiguous color per run.
    group.fields.forEach(([field,label,color],i)=>{
      const legendX=left+(i===0?0:i===1?205:465),members=group.series.filter(s=>s.field===field),present=members.some(s=>s.present);
      body+=`<path d="M${legendX},${top-22}h20" stroke="${present?color:'#9ca6ae'}" stroke-width="2"/>`+text(legendX+27,top-18,label+(present?'':'（未导出）'),12);
    });
    const missing=group.series.filter(s=>!s.present).map(s=>(s.tag==='baseline'?'基线':'当前')+' '+s.label);
    if(!values.length){body+=text(left,top+65,'无有效数值；缺失或失败未画成零。',14,'fill="#7b8791"');body+=text(left,top+89,missing.length?'未导出：'+missing.join('、'):'全部记录未通过数值检查。',12,'fill="#7b8791"');return;}
    let lo=Math.min(0,...values),hi=Math.max(0,...values);const range=hi-lo||Math.max(Math.abs(hi),1e-6);lo-=range*.06;hi+=range*.06;
    const y=v=>bottom-(v-lo)/(hi-lo)*plotH;
    for(let k=0;k<=4;k++){const v=lo+(hi-lo)*k/4,t=t0+(t1-t0)*k/4;body+=`<path d="M${left},${y(v)}H${right}" stroke="#e4e9ee"/>`+text(left-10,y(v)+4,format(v),11,'text-anchor="end"');if(t1!==t0||k===0)body+=text(x(t),bottom+20,format(t),11,'text-anchor="middle"');}
    body+=`<path d="M${left},${top}V${bottom}H${right}" fill="none" stroke="#778692"/><path d="M${left},${y(0)}H${right}" stroke="#9ba7af" stroke-dasharray="2 3"/>`;
    body+=text(22,top+plotH/2,'力矩 (N·m)',12,`text-anchor="middle" transform="rotate(-90 22 ${top+plotH/2})"`)+text((left+right)/2,bottom+41,'时间 (s)',13,'text-anchor="middle"');
    group.series.forEach(series=>{
      let path='',pen=false;
      for(const p of series.rows){if(p.value===null){pen=false;continue;}path+=`${pen?'L':'M'}${x(p.time_s).toFixed(3)},${y(p.value).toFixed(3)} `;pen=true;}
      const dash=series.tag==='baseline'?'stroke-dasharray="6 4"':'';
      body+=`<path data-field="${series.field}" data-run="${series.tag}" d="${path}" fill="none" stroke="${series.color}" stroke-width="2" ${dash}><title>${esc(series.label)} · ${series.tag==='baseline'?'基线':'当前'} · ${series.validCount}/${series.total} 有效记录</title></path>`;
      for(const p of series.rows)if(p.value!==null)body+=`<circle data-field="${series.field}" data-run="${series.tag}" data-frame="${p.index}" data-time="${p.time_s}" data-value="${p.value}" cx="${x(p.time_s).toFixed(3)}" cy="${y(p.value).toFixed(3)}" r="1.7" fill="${series.tag==='baseline'?'white':series.color}" stroke="${series.color}" stroke-width=".7"><title>${esc(series.label)} · ${series.tag==='baseline'?'基线':'当前'} · ${p.time_s} s: ${p.value} N·m</title></circle>`;
    });
    let noteRow=0;for(const tag of ['current','baseline']){const countNote=group.series.filter(s=>s.tag===tag&&s.validCount<s.total).map(s=>`${s.label} ${s.validCount}/${s.total}`).join('；');
      if(countNote)body+=text(left,bottom+60+(noteRow++)*14,`${tag==='baseline'?'基线':'当前'}有效记录：`+countNote,11,'fill="#687680"');}
  });
  const note=data.engine==='opensim'?'直接读取原生分项与残差；reserve 是辅助力矩，不是肌肉。':'偏置项包含重力与科氏/离心项；本图不是惯性、外力齐全的平衡分解，不能直接相加作为残差。';
  body+=text(24,height-39,note,12)+text(24,height-17,'失败 / 缺失形成断点；仅画已导出的字段。比较共用各面板坐标范围，不改变原生数值。',11,'fill="#687680"');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="min-width:900px" role="img" aria-label="${esc(title+' '+data.name)}"><rect width="100%" height="100%" fill="white"/><g font-family="Arial, PingFang SC, sans-serif" fill="#21313e">${body}</g></svg>`;
}
