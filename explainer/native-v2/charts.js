// Native-result charts: values stay in their original units, failed rows stay missing.
export const escapeXML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite = x => typeof x === 'number' && Number.isFinite(x);
export const validFrame = (f,run=null) => !!f && f.valid !== false && f.nativeSolverFailed !== true && run?.manifest?.qc?.numericPassed !== false;
export const format = x => !finite(x) ? '—' : x === 0 ? '0' : Math.abs(x)<.001 ? x.toExponential(2) : Number(x.toPrecision(4)).toString();
const colors={a:'#476fa9',b:'#b77729',ink:'#21313e',grid:'#dfe5eb'};
const text=(x,y,s,size=13,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" ${extra}>${escapeXML(s)}</text>`;
function svg(width,height,title,body,note=''){
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXML(title)}"><rect width="100%" height="100%" fill="#fff"/><g font-family="Arial, PingFang SC, sans-serif" fill="${colors.ink}">${text(24,29,title,18)}${body}${text(24,height-12,note,11)}</g></svg>`;
}
export function sameChannels(a,b){return !!a&&!!b&&a.manifest?.modelId===b.manifest?.modelId&&JSON.stringify(a.muscleNames)===JSON.stringify(b.muscleNames)&&JSON.stringify(a.coordinateNames)===JSON.stringify(b.coordinateNames);}
export function frameAtTime(run,time){return run.frames.reduce((best,f,i)=>Math.abs(f.time_s-time)<Math.abs(run.frames[best].time_s-time)?i:best,0);}
export function torqueBars(run,baseline,frameIndex=0,coordinate=0){
 const frame=run.frames[frameIndex],base=sameChannels(run,baseline)?baseline.frames[frameAtTime(baseline,frame.time_s)]:null;
 const rows=run.muscleNames.map((name,i)=>({name,value:validFrame(frame,run)?frame.torque_Nm?.[i]?.[coordinate]:null,baseline:validFrame(base,baseline)?base.torque_Nm?.[i]?.[coordinate]:null}));
 const max=Math.max(1e-8,...rows.flatMap(r=>[r.value,r.baseline]).filter(finite).map(Math.abs))*1.08;
 const left=170,w=580,top=82,rowH=25,h=top+rows.length*rowH+75,x=v=>left+w*(v/max+1)/2;
 let body=text(left,56,`${run.coordinateNames[coordinate]} · t = ${format(frame.time_s)} s`,13)+text(left+320,56,base?'蓝：基线  棕：当前':'棕：当前',13);
 for(let k=-2;k<=2;k++){const v=max*k/2;body+=`<path d="M${x(v)},${top-8}V${h-60}" stroke="${k?colors.grid:'#697988'}"/>`+text(x(v),h-40,format(v),12,'text-anchor="middle"');}
 rows.forEach((r,i)=>{const y=top+i*rowH;body+=text(left-12,y+10,`${String(i+1).padStart(2,'0')} ${r.name}`,12,'text-anchor="end"');
  for(const [value,color,offset] of [[r.baseline,colors.a,0],[r.value,colors.b,base?11:3]])if(finite(value))body+=`<rect x="${Math.min(x(0),x(value))}" y="${y+offset}" width="${Math.abs(x(value)-x(0))}" height="8" fill="${color}"><title>${escapeXML(r.name)}: ${value} N·m</title></rect>`;
  if(!finite(r.value))body+=text(x(0)+5,y+11,'缺失 / 未通过检查',11);
 });
 body+=text(left+w/2,h-22,'各肌肉的力矩贡献 (N·m)',13,'text-anchor="middle"');
 return svg(820,h,'肌肉通道 → 关节力矩',body,'全部原生肌肉通道；reserve 不计作肌肉。');
}
const mix=(a,b,t)=>'#'+a.map((v,i)=>Math.round(v+(b[i]-v)*Math.max(0,Math.min(1,t))).toString(16).padStart(2,'0')).join('');
export function heatmap(run,field='activation',baseline=null){
 const names=field==='activation'?run.muscleNames:run.coordinateNames,unit=field==='activation'?'激活 a（无量纲）':'肌肉合力矩 (N·m)';
 const runs=sameChannels(run,baseline)?[baseline,run]:[run],rowH=19,left=162,panelW=440,top=85,w=left+panelW*runs.length+45,h=top+rowH*names.length+84;
 const values=runs.flatMap(r=>r.frames.flatMap(f=>validFrame(f,r)?f[field]||[]:[])).filter(finite);
 const limit=field==='activation'?1:Math.max(1e-8,...values.map(Math.abs));
 let body=text(left,54,unit,13);
 names.forEach((n,i)=>body+=text(left-8,top+i*rowH+13,`${i+1} ${n}`,11,'text-anchor="end"'));
 runs.forEach((r,ri)=>{const l=left+panelW*ri,plotW=panelW-24,t0=r.frames[0].time_s,t1=r.frames.at(-1).time_s,span=t1-t0||1;
  body+=text(l,75,runs.length===1?'当前':ri?'当前':'基线',13);
  r.frames.forEach((f,fi)=>{const prev=r.frames[Math.max(0,fi-1)].time_s,next=r.frames[Math.min(r.frames.length-1,fi+1)].time_s;
   const start=fi?(prev+f.time_s)/2:t0,end=fi===r.frames.length-1?t1:(f.time_s+next)/2;
   names.forEach((n,i)=>{const v=validFrame(f,r)?f[field]?.[i]:null,color=!finite(v)?'#b8bcc1':field==='activation'?mix([248,248,250],[100,66,160],v):mix([247,247,247],v>=0?[183,96,37]:[48,107,154],Math.abs(v)/limit);
    body+=`<rect x="${l+(start-t0)/span*plotW}" y="${top+i*rowH}" width="${Math.max(.1,(end-start)/span*plotW)}" height="${rowH}" fill="${color}"><title>${escapeXML(n)} · ${format(f.time_s)} s: ${finite(v)?v:'缺失'}</title></rect>`;
   });
  });
  for(let k=0;k<=4;k++)body+=text(l+plotW*k/4,h-57,format(t0+(t1-t0)*k/4),11,'text-anchor="middle"');
  body+=text(l+plotW/2,h-37,'时间 (s)',13,'text-anchor="middle"');
 });
 const legendY=h-23;for(let i=0;i<100;i++){const t=i/99,v=field==='activation'?t:2*t-1;body+=`<rect x="${left+i*2}" y="${legendY}" width="2" height="7" fill="${field==='activation'?mix([248,248,250],[100,66,160],v):mix([247,247,247],v>=0?[183,96,37]:[48,107,154],Math.abs(v))}"/>`;}
 body+=text(left+208,legendY+7,field==='activation'?'0 → 1':`${format(-limit)} → 0 → ${format(limit)} N·m`,11);
 return svg(w,h,field==='activation'?'所有肌肉 · 激活随时间':'所有关节 · 肌肉合力矩随时间',body,'灰色＝缺失或未通过检查；比较使用同一色标。');
}
export function responseChart(run,baseline,muscle=0,coordinate=0){
 const runs=sameChannels(run,baseline)?[baseline,run]:[run],width=850,panelH=180,left=95,right=810;
 const definitions=[['激活 a / 控制 ctrl（无量纲）',f=>validFrame(f)?f.activation?.[muscle]:null,f=>validFrame(f)?f.ctrl?.[muscle]:null,'黑虚线：当前控制'],['拉力 (N)',f=>validFrame(f)?f.tension_N?.[muscle]??f.force_N?.[muscle]:null,null,''],['关节角 (°)',f=>validFrame(f)&&finite(f.q?.[coordinate])?f.q[coordinate]*180/Math.PI:null,f=>validFrame(f)&&finite(f.targetQ?.[coordinate])?f.targetQ[coordinate]*180/Math.PI:null,'黑虚线：目标角度']];
 let body=text(left,55,`${run.muscleNames[muscle]} / ${run.coordinateNames[coordinate]} · ${runs.length===2?'蓝：基线  棕：当前':'棕：当前'}`,13);
 definitions.forEach(([label,value,reference,referenceLabel],p)=>{const top=80+p*panelH,h=125,ref=reference?run.frames.map(f=>validFrame(f,run)?reference(f):null):[],all=[...runs.flatMap(r=>r.frames.map(f=>validFrame(f,r)?value(f):null)),...ref].filter(finite),times=runs.flatMap(r=>r.frames.map(f=>f.time_s));
  let lo=Math.min(0,...all),hi=Math.max(p===0?1:0,...all);if(hi===lo)hi=lo+1;const t0=Math.min(...times),t1=Math.max(...times),x=t=>left+(right-left)*(t-t0)/(t1-t0||1),y=v=>top+h-h*(v-lo)/(hi-lo);
  body+=text(left,top-10,label,13);
  for(let k=0;k<=4;k++){const v=lo+(hi-lo)*k/4;body+=`<path d="M${left},${y(v)}H${right}" stroke="${colors.grid}"/>`+text(left-9,y(v)+4,format(v),11,'text-anchor="end"');body+=text(x(t0+(t1-t0)*k/4),top+h+18,format(t0+(t1-t0)*k/4),11,'text-anchor="middle"');}
  runs.forEach((r,ri)=>{let d='',pen=false;r.frames.forEach(f=>{const v=validFrame(f,r)?value(f):null;if(!finite(v)){pen=false;return;}d+=`${pen?'L':'M'}${x(f.time_s).toFixed(2)},${y(v).toFixed(2)} `;pen=true;});body+=`<path d="${d}" fill="none" stroke="${runs.length===2&&ri===0?colors.a:colors.b}" stroke-width="2" ${runs.length===2&&ri===0?'stroke-dasharray="5 3"':''}/>`;});
  if(ref.some(finite)){let d='',pen=false;ref.forEach((v,i)=>{if(!finite(v)){pen=false;return;}d+=`${pen?'L':'M'}${x(run.frames[i].time_s).toFixed(2)},${y(v).toFixed(2)} `;pen=true;});body+=`<path d="${d}" fill="none" stroke="#34434d" stroke-width="1.5" stroke-dasharray="3 4"/>`+text(right,top-10,referenceLabel,11,'text-anchor="end"');}
 });
 body+=text(450,80+3*panelH-10,'时间 (s)',13,'text-anchor="middle"');
 return svg(width,80+3*panelH+20,'调参前后 · 响应曲线',body,'原生时间序列；不同量分别使用对应单位。');
}
export function chartCSV(run,baseline=null){
 const rows=[['run','time_s','kind','channel','coordinate','value','unit','frame_valid','native_solver_failed']];
 for(const [tag,r] of [['current',run],['baseline',baseline]])if(r)for(const f of r.frames){
  const push=row=>rows.push([...row,validFrame(f,r),f.nativeSolverFailed===true]);
  r.muscleNames.forEach((name,i)=>{push([tag,f.time_s,'activation',name,'',f.activation?.[i]??'','1']);push([tag,f.time_s,'signed_actuator_force',name,'',f.force_N?.[i]??'','N']);if(f.ctrl)push([tag,f.time_s,'ctrl',name,'',f.ctrl[i]??'','1']);if(f.tension_N)push([tag,f.time_s,'tension',name,'',f.tension_N[i]??'','N']);r.coordinateNames.forEach((joint,j)=>push([tag,f.time_s,'torque_contribution',name,joint,f.torque_Nm?.[i]?.[j]??'','N*m']));});
  r.coordinateNames.forEach((name,i)=>{push([tag,f.time_s,'q','',name,f.q?.[i]??'','rad']);push([tag,f.time_s,'muscle_total_torque','',name,f.qfrcActuator_Nm?.[i]??'','N*m']);if(f.targetQ)push([tag,f.time_s,'target_q','',name,f.targetQ[i]??'','rad']);if(f.reserveTorque_Nm)push([tag,f.time_s,'reserve_torque','',name,f.reserveTorque_Nm[i]??'','N*m']);if(f.requiredTorque_Nm)push([tag,f.time_s,'required_torque','',name,f.requiredTorque_Nm[i]??'','N*m']);for(const [key,kind] of [['balanceResidual_Nm','balance_residual'],['qfrcPassive_Nm','passive_torque'],['qfrcBias_Nm','gravity_coriolis_bias'],['qfrcConstraint_Nm','constraint_torque']])if(f[key])push([tag,f.time_s,kind,'',name,f[key][i]??'','N*m']);});
 }
 return rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
}
export function downloadFile(name,data,type='application/json'){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
export async function downloadPNG(name,svgMarkup){
 const blob=new Blob([svgMarkup],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();
 try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('图像渲染失败'));img.src=url;});const canvas=document.createElement('canvas');canvas.width=img.width*2;canvas.height=img.height*2;canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!png)throw new Error('PNG 导出失败');downloadFile(name,png,'image/png');}finally{URL.revokeObjectURL(url);}
}
