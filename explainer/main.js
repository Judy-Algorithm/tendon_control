import {ExplainerScene} from './scene.js';
import {SOURCES,OPENSIM_STEPS,MYOHAND_STEPS,MUSCLE_MODELS,GLOSSARY} from './content.js';
import {clamp,torqueDemand,solveAllocation,parseRoute,polylinePath} from './math.js';
import {mountMuscleLab} from './muscle-lab.js';

const root=document.getElementById('explainer');
const original=document.querySelector('.layout');
const defaults={scale:1,explode:0,angle:10,load:2,lever:35,strength:1,activation:.2,noise:0,selectedMuscle:'FDS2',time:80,mocoMode:'inverse'};
let state={route:'control',step:'overview',parameters:{...defaults},phase:0,playing:false};
let scene=null,frame=0,last=0,fixture=null,fixtureError=null,opensimFixture=null,drawerReturn=null,disposeDrawer=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const steps=()=>state.route==='opensim'?OPENSIM_STEPS:MYOHAND_STEPS;
const current=()=>steps().find(s=>s.id===state.step)||steps()[0];
const sourcesFor=()=>current().sourceIds||[];

root.innerHTML=`<nav class="ex-rail" aria-label="求解步骤"></nav><div class="ex-body"><section class="ex-visual" aria-label="交互式模型"><div class="ex-scene"></div><header class="ex-hero"><div class="ex-eyebrow"></div><h1></h1><p></p></header><div class="ex-orbit-note">拖动旋转 · 滚轮缩放</div><button type="button" class="ex-presentation">演示模式</button><div class="ex-mode">三维几何示意</div><div class="ex-camera" aria-label="教学模型视角"><button data-camera="oblique">斜视</button><button data-camera="palm">掌侧</button><button data-camera="side">侧面</button></div></section><aside class="ex-panel" aria-label="当前步骤说明"></aside></div>`;
const dialog=el('dialog','ex-drawer');dialog.setAttribute('aria-labelledby','ex-drawer-title');
dialog.innerHTML='<div class="ex-drawer-head"><h2 id="ex-drawer-title"></h2><button type="button" aria-label="关闭详情">×</button></div><div class="ex-drawer-body"></div>';
document.body.append(dialog);
dialog.querySelector('button').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{disposeDrawer?.();disposeDrawer=null;drawerReturn?.focus();});
dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}});
function openDrawer(title,html){disposeDrawer?.();disposeDrawer=null;if(!dialog.open)drawerReturn=document.activeElement;dialog.querySelector('h2').textContent=title;dialog.querySelector('.ex-drawer-body').innerHTML=html;if(!dialog.open)dialog.showModal();}
function showMuscleLab(){openDrawer('三个参数，分别改变什么？','<div class="ex-muscle-lab-host"></div>');disposeDrawer=mountMuscleLab(dialog.querySelector('.ex-muscle-lab-host'),{showSources});}
function sourceMarkup(ids){return [...new Set(ids)].map(id=>{const s=SOURCES[id]||fixture?.manifest.officialSources.find(s=>s.id===id);return s?`<article class="ex-source"><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><p>${esc(s.section)}</p>${s.note?`<small>${esc(s.note)}</small>`:''}</article>`:'';}).join('');}
function showSources(ids=sourcesFor()){openDrawer('官方依据',sourceMarkup(ids)||'<p>该视觉对象是本站教学示意；具体求解原理请查看当前步骤的官方说明。</p>');}
function showPrinciples(){
  const item=current();let extra='';
  if(state.route==='opensim'&&state.step==='so')extra='<h3>浏览器中的双肌肉示例</h3><div class="ex-equation">min ½[a_f² + a_e² + (r / 0.02 Nm)²]<br>c_f a_f − c_e a_e + r = τ_req<br>0 ≤ a_f, a_e ≤ 1</div><p>c_f=1.2 s k(θ) Nm，c_e=0.8 s k(θ) Nm，k=0.6+0.4 exp(−((θ−25°)/40°)²)。这些是教学用的力矩容量，不是这只三维手的原生参数。枚举激活上下界求解二次分配，reserve 在此例中不设界限。物理平衡成立不代表辅助力矩足够小。</p>';
  if(state.route==='opensim'&&state.step==='id')extra='<h3>当前交互的假设</h3><div class="ex-equation">τ_ext = −F × d<br>τ_load-demand = −τ_ext<br>τ_req = τ_load-demand + 0.020 Nm</div><p>简化单轴、垂直加载、准静态示例。正号定义为维持姿态所需的内部力矩方向；外力矩与它相反。力方向定义在教学关节坐标系中。0.020 Nm 为指定的重力需求，未从显示网格计算。改变力臂会沿示意手指移动作用点。完整 ID 还需模型惯性、运动导数及全部外载荷。</p>';
  if(state.route==='opensim'&&state.step==='ik')extra='<h3>当前交互的假设</h3><p>用本站食指单轴几何示意，拟合四个合成代理点。固定目标为25°，可加入确定性偏移；“拟合”在0–75°搜索最小三维点误差。误差对应实际绘制的四点，不是 OpenSim IKTool 的运行结果。</p>';
  if(state.route==='myohand')extra=nativeDetails();
  openDrawer(item.title+' · 原理',(item.details||[]).map(d=>`<h3>${esc(d.title)}</h3><p>${esc(d.text)}</p>`).join('')+extra+'<h3>查阅来源</h3>'+sourceMarkup(sourcesFor()));
}
function nativeDetails(){if(!fixture)return '<p>原生数据尚未加载。</p>';const m=fixture.manifest;return `<h3>当前原生记录</h3><p>${esc(m.environment)}，MyoSuite ${esc(m.myosuiteVersion)} / MuJoCo ${esc(m.mujocoVersion)}。${m.counts.muscles} 路肌肉，${m.counts.qpos} 个关节坐标。选中肌肉 FDS2，关节 mcp2_flexion。仿真步长2 ms，控制间隔20 ms。</p><div class="ex-equation">ctrl = sigmoid(5 × (raw_action − 0.5))<br>τ_actuator = momentᵀ × actuator_force</div><p>正拉力 T = −actuator_force。原生力包含主动与被动项，显示图中分开列出。这里回放已有原生记录，不在浏览器重新仿真。三维网格沿用原站示意，未注册成该记录的完整23坐标回放。</p><p>双状态比较手动设置同一 q、零速度与不同初始 FDS2 激活，再施加相同控制；这不是从真人或自然轨迹找到的配对。当前记录无物体接触。</p><h3>原生记录校验</h3><p>力矩映射最大误差 ${fixture.checks.actuatorMappingMaxAbs_Nm} Nm；动力学对账最大误差 ${fixture.checks.dynamicsMaxAbs_Nm.toExponential(2)} Nm。完整数据与检验值可下载。</p><a href="./explainer/fixtures/myohand-native.json" target="_blank" rel="noopener">查看原生数据 JSON ↗</a>`;}
function showGlossary(){openDrawer('参数、状态与观测',`<p>参数描述模型，状态描述此刻；求解器设置描述如何选择一个解。</p>`+GLOSSARY.map(g=>`<section class="ex-glossary"><h3>${esc(g.name)} <code>${esc(g.symbol)}</code></h3><p>${esc(g.meaning)}</p><small>${esc(g.category)} · ${esc(g.unit)} · ${esc(Array.isArray(g.usedBy)?g.usedBy.join(' / '):g.usedBy)}</small>${sourceMarkup(g.sourceIds||[])}</section>`).join(''));}
function showModels(){openDrawer('肌肉模型与求解方法',`<p>整只手的解剖结构、单条肌肉的力学模型、求解算法，是三个不同的选择。下面仅比较原理，不会切换当前示例的数值模型。</p>`+MUSCLE_MODELS.map(m=>`<h3>${esc(m.name)}</h3><p>${esc(m.summary)}</p><p>${esc(Array.isArray(m.details)?m.details.join(' '):m.details)}</p>${sourceMarkup(m.sourceIds||[])}`).join(''));}
function showManifest(){openDrawer('这只手与计算模型',`<h3>视觉层</h3><p>沿用原站 MyoHand 来源的29个骨骼网格及修正通路。ROM 表有37条启用通路；原站搜索还提供43个 OpenSim 名称的显示映射。显示映射不是跨模型的精确几何配准。</p><h3>OpenSim 教学层</h3><p>Scale / IK 使用可交互的显示几何，ID / SO 滑块使用简化单轴模型。SO 的“查看原生求解”另提供真实 OpenSim 4.4.1 单关节双 Millard 肌肉记录，不是43肌肉手的验证。Moco 页面展示时间耦合的原理。</p><h3>MyoHand 原生记录</h3>${nativeDetails()}<h3>显示数据依据</h3><a href="https://github.com/Judy-Algorithm/tendon_control#数据" target="_blank" rel="noopener">原站数据来源与映射说明 ↗</a>`);}

function showNativeSO(){
  if(!opensimFixture){openDrawer('原生 SO 记录','<p>数据尚未就绪，请稍后重试。</p>');return;}
  openDrawer('1关节 · 2肌肉 · 原生 SO',`<p>实际运行 OpenSim 4.4.1 的 StaticOptimization。模型为1 kg、长0.3 m的水平杆，配两条 Millard 肌肉与一个 reserve。它用于核对求解原理，不是左侧手模型。</p><label class="ex-control"><span class="ex-control-head">选择已求解的外加载荷</span><select id="native-so-case" aria-label="原生SO外加载荷"><option value="0">0 N</option><option value="1">2 N</option><option value="2">4 N</option></select></label><div id="native-so-result"></div><h3>设置与证据</h3><p>固定姿态、重力9.81 m/s²，使用肌肉生理容量，激活指数2。外力由 PrescribedForce 给定，不是接触碰撞仿真。三组分别求解，没有把插值当成重新求解。</p><a href="./explainer/fixtures/opensim-so-native.json" target="_blank" rel="noopener">查看记录与全部检查值 ↗</a><p><a href="./docs/explainer/NATIVE_SO_AUDIT.md" target="_blank" rel="noopener">生成方法与原生日志索引 ↗</a></p>`+sourceMarkup(['opensim-so','opensim-so-code']));
  const draw=()=>{const r=opensimFixture.cases[Number(dialog.querySelector('#native-so-case').value)];dialog.querySelector('#native-so-result').innerHTML=`<div class="ex-bars">${r.activation.map((v,i)=>`<div class="ex-bar-row"><span>${i?'伸肌':'屈肌'} a</span><div class="ex-bar-track"><div class="ex-bar-fill" style="width:${v*100}%"></div></div><b>${v.toFixed(4)}</b></div>`).join('')}</div>`+stat('载荷',r.load_N+' N')+stat('力矩需求',r.requiredTorque_Nm.toFixed(4)+' Nm')+stat('reserve',r.reserveTorque_Nm.toExponential(2)+' Nm')+stat('最大平衡残差',r.balanceMaxAbs_Nm.toExponential(2)+' Nm');};
  dialog.querySelector('#native-so-case').onchange=draw;draw();
}

function range(key,label,min,max,step,unit,digits=0){return `<label class="ex-control"><span class="ex-control-head"><span>${label}</span><output data-output="${key}">${Number(state.parameters[key]).toFixed(digits)} ${unit}</output></span><input data-param="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${state.parameters[key]}" aria-label="${label}" data-unit="${unit}" data-digits="${digits}"></label>`;}
function select(key,label,options){return `<label class="ex-control"><span class="ex-control-head">${label}</span><select data-param="${key}" aria-label="${label}">${options.map(([v,t])=>`<option value="${v}" ${state.parameters[key]===v?'selected':''}>${t}</option>`).join('')}</select></label>`;}
function controls(){const s=state.step,p=state.parameters;
  if(s==='overview')return range('explode','分层观察',0,1,.01,'',2)+'<p class="ex-mini-note">分层仅改变显示位置，不改变物理模型。</p>';
  if(state.route==='opensim'){
    if(s==='scale')return range('scale','食指骨段比例',.8,1.2,.01,'×',2)+range('explode','分层观察',0,1,.01,'',2)+'<p class="ex-mini-note">青色为原始几何参照；肌力不能只由骨长确定。</p>';
    if(s==='ik')return range('angle','拟合角度',0,75,.1,'°',1)+range('noise','标志点偏移',0,5,.1,'mm',1)+'<div class="ex-buttons"><button class="ex-btn primary" data-action="fit">拟合这组关键点</button></div>';
    if(s==='id')return range('load','接触力',0,12,.1,'N',1)+range('lever','垂直力臂',5,60,1,'mm')+'<p class="ex-mini-note">准静态单轴示例，保留0.020 Nm重力需求。</p>';
    if(s==='so')return range('load','接触力',0,12,.1,'N',1)+range('strength','力量尺度',.1,1.5,.05,'×',2)+range('angle','关节角度',0,75,1,'°')+'<p class="ex-mini-note">双肌肉教学分配；下方结果实时重算。</p><div class="ex-buttons"><button class="ex-btn" data-action="native-so">查看原生 OpenSim 求解</button></div>';
    if(s==='moco')return select('mocoMode','问题类型',[['inverse','MocoInverse · 已知运动'],['track','MocoTrack · 跟踪运动'],['predict','预测 · 给定任务']])+range('time','轨迹位置',0,400,2,'ms')+'<p class="ex-mini-note">节点展示整段问题的耦合，不代表一次真实求解。</p>';
  }
  return range('time','回放时间',0,400,2,'ms')+(s==='geometry'?range('angle','示意关节角',0,75,1,'°'):'')+'<div class="ex-buttons"><button class="ex-btn primary" data-action="play">播放记录</button><button class="ex-btn quiet" data-action="twins">相同姿态，不同激活</button></div><p class="ex-mini-note">FDS2 原生脉冲记录；三维手为几何示意。</p>';
}
function chart(series,{minY=0,maxY=1,maxX=.4,yLabel='激活 / 控制',xLabel='时间 (s)',cursor=null}={}){
  const w=340,h=150,pad=24;const lines=[0,.5,1].map(f=>`<line x1="${pad}" y1="${h-pad-f*(h-2*pad)}" x2="${w-pad}" y2="${h-pad-f*(h-2*pad)}" class="chart-grid"/><text x="${pad-5}" y="${h-pad-f*(h-2*pad)+3}" text-anchor="end">${(minY+f*(maxY-minY)).toFixed(maxY<=1?1:0)}</text>`).join('');
  return `<svg class="ex-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(yLabel)}随${esc(xLabel)}变化"><text x="${pad}" y="12">${esc(yLabel)}</text>${lines}<line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" class="chart-axis"/>${series.map(s=>`<path d="${polylinePath(s.values,{width:w,height:h,minY,maxY,maxX,pad})}" fill="none" stroke="${s.color}" stroke-width="2" ${s.dash?'stroke-dasharray="4 4"':''}/>`).join('')}${cursor!==null?`<line x1="${pad+clamp(cursor/maxX,0,1)*(w-pad*2)}" x2="${pad+clamp(cursor/maxX,0,1)*(w-pad*2)}" y1="20" y2="${h-pad}" stroke="#81939d" stroke-dasharray="2 3"/>`:''}<text x="${pad}" y="${h-5}">0</text><text x="${w-pad}" y="${h-5}" text-anchor="end">${maxX}</text><text x="${w/2}" y="${h-5}" text-anchor="middle">${esc(xLabel)}</text></svg>`;
}
const stat=(label,value)=>`<div class="ex-stat-line"><span>${label}</span><b>${value}</b></div>`;
function nativeSample(){if(!fixture)return null;return fixture.pulse[Math.round(clamp(state.parameters.time/2,0,fixture.pulse.length-1))];}
function renderReadout(){const target=root.querySelector('.ex-results');if(!target)return;const s=state.step,p=state.parameters;
  if(s==='moco'&&target.dataset.mocoMode===p.mocoMode&&target.querySelector('.ex-timeline')){target.querySelectorAll('.ex-time-node').forEach((node,i)=>node.classList.toggle('active',Math.round(p.time/400*6)===i));return;}
  if(s==='moco')target.dataset.mocoMode=p.mocoMode;
  if(s==='overview'){
    const list=steps().slice(1);target.innerHTML=`<div class="ex-overview-links">${list.map(x=>`<a href="#${state.route}/${x.id}"><small>${esc(x.number||x.id.toUpperCase())}</small>${esc(x.question||x.title)}</a>`).join('')}</div>`;return;
  }
  if(state.route==='opensim'){
    if(s==='scale'){target.innerHTML=`<div class="ex-readout"><strong>${p.scale.toFixed(2)}×</strong><span>几何比例</span></div>`+stat('一起变化','骨段 / 关节位置 / 路径')+stat('另需设定','力量与组织参数');return;}
    if(s==='ik'){const rms=scene?.getDiagnostics().markerRmsMm;target.innerHTML=`<div class="ex-readout"><strong>${Number.isFinite(rms)?rms.toFixed(2):'—'} <small>mm</small></strong><span>四点三维 RMS</span></div><div class="ex-legend"><span style="--c:var(--blue)">合成观测点</span><span style="--c:var(--teal)">模型代理点</span></div><p class="ex-mini-note">同一组点的实际绘制误差。单轴简化拟合。</p>`;return;}
    if(s==='id'){const r=torqueDemand(p.load,p.lever);target.innerHTML=`<div class="ex-readout"><strong>${r.requiredNm.toFixed(3)} <small>Nm</small></strong><span>所需净力矩</span></div>`+stat('接触引起的需求',r.contactNm.toFixed(3)+' Nm')+stat('重力需求',r.gravityNm.toFixed(3)+' Nm')+`<div class="ex-equation">${p.load.toFixed(1)} N × ${(p.lever/1000).toFixed(3)} m + 0.020 Nm</div>`;return;}
    if(s==='so'){const r=solveAllocation(p);target.innerHTML=`<div class="ex-bars">${[['屈肌',r.a[0]],['伸肌',r.a[1]]].map(([name,v])=>`<div class="ex-bar-row"><span>${name} a</span><div class="ex-bar-track"><div class="ex-bar-fill" style="width:${v*100}%"></div></div><b>${v.toFixed(3)}</b></div>`).join('')}</div>`+stat('所需力矩',r.requiredNm.toFixed(3)+' Nm')+stat('肌肉贡献',r.contributions.reduce((a,b)=>a+b,0).toFixed(3)+' Nm')+stat('辅助力矩 reserve',r.reserve.toFixed(5)+' Nm')+stat('平衡残差',r.balanceResidual.toExponential(1)+' Nm')+'<p class="ex-mini-note">屈肌/伸肌为简化力矩执行器，数值不对应手模的某条原生肌肉。</p>';return;}
    if(s==='moco'){const modes={inverse:['已知 q(t)','求控制与内部状态'],track:['参考运动','联合优化运动和控制'],predict:['目标与约束','预测运动和控制']};target.innerHTML=`<div class="ex-timeline">${Array.from({length:7},(_,i)=>`<div class="ex-time-node ${Math.round(p.time/400*6)===i?'active':''}"><i></i><span>t${i}</span></div>`).join('')}</div><div class="ex-equation">ẋ = f(x, u)<br>每个节点都受动力学与边界约束</div>`+stat('提供',modes[p.mocoMode][0])+stat('求解',modes[p.mocoMode][1])+'<div class="ex-buttons"><button class="ex-btn" data-action="play">播放时间示意</button></div>';target.querySelector('[data-action="play"]').onclick=togglePlay;return;}
  }
  if(!fixture){target.innerHTML=`<p class="ex-mini-note">${fixtureError?'原生记录加载失败。原理与三维示意仍可使用。':'正在读取原生 MuJoCo 记录…'}</p>`;return;}
  const r=nativeSample(),time=r.time_s;
  if(['control','activation'].includes(s))target.innerHTML=`<div class="ex-legend"><span style="--c:var(--blue)">控制 ctrl</span><span style="--c:var(--purple)">激活 a</span></div>`+chart([{values:fixture.pulse.map(x=>[x.time_s,x.ctrl]),color:'#7caef5',dash:true},{values:fixture.pulse.map(x=>[x.time_s,x.activation]),color:'#b49af5'}],{cursor:time})+stat('原始 action',r.raw_action.toFixed(3))+stat('实际 ctrl',r.ctrl.toFixed(3))+stat('内部激活 a',r.activation.toFixed(3));
  else if(s==='geometry')target.innerHTML=`<div class="ex-readout"><strong>${(r.actuator_length_m*1000).toFixed(1)} <small>mm</small></strong><span>记录中的通路长度</span></div>`+stat('长度变化速度',(r.actuator_velocity_m_s*1000).toFixed(1)+' mm/s')+'<p class="ex-mini-note">读数来自当前回放时刻，不随“示意关节角”重算。通路长度不是弹性肌腱伸长。</p>';
  else if(s==='force')target.innerHTML=`<div class="ex-legend"><span style="--c:var(--orange)">总拉力</span><span style="--c:var(--purple)">主动拉力</span></div>`+chart([{values:fixture.pulse.map(x=>[x.time_s,x.tension_N]),color:'#efa86a'},{values:fixture.pulse.map(x=>[x.time_s,x.active_tension_N]),color:'#b49af5',dash:true}],{maxY:Math.max(1,...fixture.pulse.map(x=>x.tension_N))*1.05,yLabel:'拉力 (N)',cursor:time})+stat('主动',r.active_tension_N.toFixed(2)+' N')+stat('被动',r.passive_tension_N.toFixed(2)+' N')+stat('总拉力',r.tension_N.toFixed(2)+' N');
  else if(s==='transmission')target.innerHTML=`<div class="ex-readout"><strong>${r.selected_joint_torque_Nm.toFixed(3)} <small>Nm</small></strong><span>FDS2 对 MCP2 的贡献</span></div>`+stat('FDS2 拉力',r.tension_N.toFixed(2)+' N')+stat('拉力正号下力臂',(-r.selected_moment_m*1000).toFixed(2)+' mm')+stat('全部执行器合力矩',r.qfrc_actuator_Nm.toFixed(3)+' Nm')+'<p class="ex-mini-note">同一肌肉可跨多个关节；上面只取 MCP2 一列。</p>';
  else target.innerHTML=chart([{values:fixture.pulse.map(x=>[x.time_s,x.joint_angle_rad*180/Math.PI]),color:'#7cd8c6'}],{minY:Math.min(0,...fixture.pulse.map(x=>x.joint_angle_rad*180/Math.PI))-2,maxY:Math.max(1,...fixture.pulse.map(x=>x.joint_angle_rad*180/Math.PI))+2,yLabel:'食指 MCP 角度 (°)',cursor:time})+stat('关节角',(r.joint_angle_rad*180/Math.PI).toFixed(2)+' °')+stat('角速度',r.joint_velocity_rad_s.toFixed(2)+' rad/s')+stat('角加速度',r.joint_acceleration_rad_s2.toFixed(2)+' rad/s²')+stat('本条记录接触数',String(r.contact_count))+'<p class="ex-mini-note">当前示例没有接触；接触约束的作用可在原理中展开。</p>';
}
function showTwins(){if(!fixture){openDrawer('原生数据未就绪','<p>请稍后重试，或检查数据文件是否可访问。</p>');return;}
  const sets=fixture.internalStateIntervention,vs=sets.flatMap(x=>x.trace.map(r=>r.joint_angle_rad*180/Math.PI));
  openDrawer('相同姿态，为什么反应不同？',`<p>固定初始姿态、速度与后续控制，只把 FDS2 初始激活设为0.02或0.60。下面回放两次真实 MuJoCo 仿真。</p><div class="ex-legend"><span style="--c:#7caef5">a₀ = 0.02</span><span style="--c:#b49af5">a₀ = 0.60</span></div>`+chart(sets.map((x,i)=>({values:x.trace.map(r=>[r.time_s,r.joint_angle_rad*180/Math.PI]),color:i?'#b49af5':'#7caef5'})),{minY:Math.min(...vs)-1,maxY:Math.max(...vs)+1,maxX:.1,yLabel:'食指 MCP 角度 (°)'})+`<p>100 ms 后角度相差 <strong>${fixture.checks.twinEndSelectedJointDifference_deg.toFixed(2)}°</strong>。这是手动初始化的受控仿真，说明激活属于内部状态，不是自然人群统计结果。</p>`+sourceMarkup(['myo-native-model','mj-transmission']));
}
function renderPanel(){const item=current(),index=steps().indexOf(item);root.querySelector('.ex-panel').innerHTML=`<h2>${esc(item.title)}</h2><p class="ex-summary">${esc(item.summary)}</p><div class="ex-io"><div><small>输入</small><span>${(item.inputs||[]).map(esc).join('<br>')}</span></div><span class="io-arrow">→</span><div><small>输出</small><span>${(item.outputs||[]).map(esc).join('<br>')}</span></div></div><div class="ex-controls">${controls()}</div><div class="ex-results" aria-live="off"></div><div class="ex-understanding"><button data-action="principles">原理与假设</button><button data-action="sources" title="查看官方说明的具体章节">官方依据</button><button data-action="glossary">参数、状态与观测</button>${state.route==='opensim'?'<button data-action="models">肌肉模型有什么区别？</button>':''}<button data-action="manifest">当前模型与数据来源</button></div><div class="ex-next"><button class="ex-btn quiet" data-action="previous" ${index===0?'disabled':''}>← 上一步</button><button class="ex-btn quiet" data-action="reset">重置</button><button class="ex-btn" data-action="next" ${index===steps().length-1?'disabled':''}>下一步 →</button></div>`;
  root.querySelectorAll('[data-param]').forEach(input=>input.addEventListener('input',()=>{pause();state.parameters[input.dataset.param]=input.tagName==='SELECT'?input.value:Number(input.value);sync();}));
  const actions={principles:showPrinciples,sources:()=>showSources(),glossary:showGlossary,models:showModels,manifest:showManifest,'native-so':showNativeSO,twins:showTwins,reset:reset,play:togglePlay,fit:()=>{const fit=scene?.findBestIKAngle(state.parameters.noise);if(fit){state.parameters.angle=fit.angle;sync();}},previous:()=>navigate(index-1),next:()=>navigate(index+1)};
  root.querySelectorAll('[data-action]').forEach(button=>button.onclick=actions[button.dataset.action]);
  const fitButton=root.querySelector('[data-action="fit"]');if(fitButton&&(!scene||!scene.getDiagnostics().webglAvailable)){fitButton.disabled=true;fitButton.textContent='三维不可用，暂不能拟合';}
  if(state.route==='opensim'&&state.step==='so')root.querySelector('[data-action="next"]').textContent='Moco 另一条路线 ↗';
  if(state.route==='opensim'){const button=el('button','','Fmax、lopt、lTS 参数实验');button.onclick=showMuscleLab;root.querySelector('.ex-understanding').prepend(button);}
  sync();
}
function sync(){
  const sample=nativeSample();const p={...state.parameters};
  if(state.route==='myohand'&&sample){p.activation=sample.activation;if(state.step!=='geometry')p.angle=sample.joint_angle_rad*180/Math.PI;}
  if(state.route==='opensim'&&state.step==='so')p.activation=solveAllocation(p).a[0];
  scene?.setState({...state,parameters:p,phase:state.parameters.time/400});
  root.querySelectorAll('input[data-param]').forEach(input=>{let value=state.parameters[input.dataset.param];if(input.dataset.param==='time'&&state.route==='myohand'&&sample)value=sample.time_s*1000;input.value=value;const output=root.querySelector(`[data-output="${input.dataset.param}"]`);if(output)output.textContent=Number(value).toFixed(Number(input.dataset.digits))+' '+input.dataset.unit;});
  renderReadout();
  const playButton=root.querySelector('[data-action="play"]');if(playButton)playButton.textContent=state.playing?'暂停':state.route==='myohand'?'播放记录':'播放时间示意';
}
function pause(){cancelAnimationFrame(frame);frame=0;state.playing=false;const b=root.querySelector('[data-action="play"]');if(b)b.textContent=state.route==='myohand'?'播放记录':'播放时间示意';}
function tick(now){if(!state.playing)return;const dt=Math.min(80,now-last);last=now;state.parameters.time=Math.min(400,state.parameters.time+dt*.1);sync();if(state.parameters.time>=400){pause();return;}frame=requestAnimationFrame(tick);}
function togglePlay(){if(state.playing){pause();return;}if(state.parameters.time>=400)state.parameters.time=0;state.playing=true;last=performance.now();const b=root.querySelector('[data-action="play"]');if(b)b.textContent='暂停';frame=requestAnimationFrame(tick);}
function reset(){pause();state.parameters={...defaults};scene?.reset();renderPanel();}
function navigate(i){const s=steps()[i];if(s)location.hash=`${state.route}/${s.id}`;}
function route(){
  pause();const parsed=parseRoute(location.hash);const changed=state.route!==parsed.route;state={...state,...parsed};
  const active=state.route!=='control';root.hidden=!active;original.hidden=active;
  document.querySelectorAll('[data-route]').forEach(a=>{if(a.dataset.route===state.route)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  window.dispatchEvent(new CustomEvent('explainer:route',{detail:state.route}));
  if(!active){scene?.dispose();scene=null;return;}
  if(!steps().some(s=>s.id===state.step))state.step='overview';
  if(changed)state.parameters={...defaults};
  if(!scene)try{scene=new ExplainerScene({host:root.querySelector('.ex-scene'),onSelect:data=>{openDrawer(data.label||data.id,`<p>选中的是教学三维模型中的${data.kind==='muscle'?'肌腱通路':'结构'}。它帮助定位当前原理，不代表个人解剖标定。</p>`+sourceMarkup(data.sourceIds||sourcesFor()));}});}catch(e){root.querySelector('.ex-scene').innerHTML='<div class="ex-fallback"><p>三维视图暂不可用。右侧原理、计算与官方依据仍可使用。</p></div>';console.error(e);}
  const item=current();root.querySelector('.ex-rail').innerHTML=steps().map((s,i)=>`<button class="ex-step" data-step="${s.id}" ${s.id===state.step?'aria-current="step"':''}><span class="step-num">${String(i).padStart(2,'0')}</span>${esc(s.id==='overview'?'总览':s.id==='moco'?'Moco':state.route==='opensim'?s.id.toUpperCase():s.title)}</button>`).join('');
  root.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>location.hash=`${state.route}/${b.dataset.step}`);
  if(state.route==='opensim'){const alternate=root.querySelector('[data-step="moco"]');alternate.classList.add('ex-alternative');alternate.querySelector('.step-num').textContent='↗';alternate.title='Moco：另一条求解路线，不是 SO 的必需后续步骤';}
  root.querySelector('.ex-eyebrow').textContent=state.route==='opensim'?'OPENSIM / INVERSE ANALYSIS':'MYOHAND / FORWARD SIMULATION';
  root.querySelector('.ex-hero h1').textContent=item.question||item.title;
  root.querySelector('.ex-hero p').textContent=state.route==='opensim'?'从观测动作理解内部发力':'从控制指令理解下一刻的运动';
  root.querySelector('.ex-mode').textContent=state.route==='myohand'&&state.step!=='overview'?'三维示意 · 曲线为原生回放':state.step==='id'||state.step==='so'?'三维示意 · 数值为简化计算':'交互式几何示意';
  if(state.step==='moco')root.querySelector('.ex-mode').textContent='时间耦合概念示意';
  root.querySelector('.ex-panel').scrollTop=0;root.querySelector('.ex-body').scrollTop=0;renderPanel();scene?.resize();
}
root.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>scene?.setView(b.dataset.camera));
root.querySelector('.ex-presentation').onclick=()=>{root.classList.toggle('presentation');root.querySelector('.ex-presentation').textContent=root.classList.contains('presentation')?'退出演示':'演示模式';scene?.resize();};
window.addEventListener('hashchange',route);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
fetch('./explainer/fixtures/myohand-native.json').then(r=>{if(!r.ok)throw new Error('fixture HTTP '+r.status);return r.json();}).then(data=>{fixture=data;if(state.route==='myohand')sync();}).catch(e=>{fixtureError=e.message;if(state.route==='myohand')renderReadout();});
fetch('./explainer/fixtures/opensim-so-native.json').then(r=>{if(!r.ok)throw new Error('fixture HTTP '+r.status);return r.json();}).then(data=>{opensimFixture=data;}).catch(()=>{opensimFixture=null;});
route();
// Read-only diagnostics for reproducible integration checks.
window.explainerLab=Object.freeze({snapshot:()=>({route:state.route,step:state.step,parameters:{...state.parameters},playing:state.playing,fixtureLoaded:!!fixture,fixtureError,scene:scene?.getDiagnostics()||null})});
