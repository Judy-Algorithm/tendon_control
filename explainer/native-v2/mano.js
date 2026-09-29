const SOURCE = {
  project:'https://mano.is.tue.mpg.de/',
  license:'https://mano.is.tue.mpg.de/license.html',
  model:'https://github.com/vchoutas/smplx/blob/main/smplx/body_models.py#L1393',
  skin:'https://github.com/vchoutas/smplx/blob/main/smplx/lbs.py#L191-L231',
};
const STEPS = [
  {id:'shape',name:'改手形',title:'同一个姿态，不同的手形',text:'形状先改变表面，也改变关节的位置。',detail:'形状混合：模板表面 + 形状基 × β。关节位置从改变后的表面回归。真实 β 是学习得到的相关变化方向，并不等于“某根骨头的长度旋钮”。'},
  {id:'pose',name:'摆姿态',title:'转动关节，带动下游',text:'姿态沿关节树传递，不是逐个移动表面点。',detail:'常见轴角配置包含 15 个手部关节的局部旋转，以及单独的手腕整体旋转。15 × 3 = 45 个局部轴角数值；PCA 模式则使用低维姿态系数，维度取决于配置。'},
  {id:'deform',name:'看表面变形',title:'关节在转，表面也在调整',text:'姿态修正与蒙皮一起，让表面随关节变形。',detail:'MANO 先加入与旋转相关的表面修正，再按顶点权重混合关节变换。下图的色带只解释混合权重；它不是 MANO 的实际权重或生物组织。'},
  {id:'keypoints',name:'读关键点',title:'表面、关节、关键点不是同一件事',text:'常见 21 点接口：16 个关节位置，加 5 个指尖点。',detail:'MANO 实现与上层封装的 joints 输出约定可能不同。常见应用再选取五个指尖表面点并重排为 21 × 3 坐标。必须核对点序、左右手、坐标系和单位；21 点并不是 21 个数值。'},
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Original procedural diagram: not learned MANO geometry, weights, or an anatomical reconstruction.
export function manoDiagramPoints({shape=0,pose=0}={}) {
  shape=clamp(Number(shape)||0,-1,1);pose=clamp(Number(pose)||0,0,80);
  const width=1+.12*shape, length=1+.09*shape;
  const bases=[[-56,42],[-29,82],[0,91],[28,84],[51,65]], lengths=[[31,24,20],[43,27,21],[47,31,23],[43,29,22],[34,23,19]];
  const points=[[0,0,0]],fingers=[];
  bases.forEach(([x,y],f)=>{
    const chain=[[x*width,y*length,0]],spread=[-.72,-.09,0,.1,.24][f];
    let flex=0;
    lengths[f].forEach((l,j)=>{flex+=(pose*Math.PI/180)*[.65,.8,.6][j];
      const p=chain.at(-1);chain.push([p[0]+Math.sin(spread)*Math.cos(flex)*l*length,p[1]+Math.cos(spread)*Math.cos(flex)*l*length,p[2]+Math.sin(flex)*l*length]);});
    const indices=[];chain.forEach(p=>{indices.push(points.length);points.push(p);});fingers.push(indices);
  });
  return {points,fingers,jointIndices:[0,...fingers.flatMap(f=>f.slice(0,3))],tipIndices:fingers.map(f=>f[3])};
}
const project=p=>[320+p[0]*2.0+p[2]*.70,450-p[1]*1.75+p[2]*.28];
const poly=points=>points.map(p=>project(p).map(v=>v.toFixed(2)).join(',')).join(' ');
function handSVG(state) {
  const data=manoDiagramPoints(state),p=data.points,step=state.step;
  const ghost=manoDiagramPoints({...state,shape:0});
  let shapes='';
  if(step==='shape') shapes+=ghost.fingers.map(f=>`<polyline points="${poly(f.map(i=>ghost.points[i]))}" fill="none" stroke="#72b6ab" stroke-opacity=".25" stroke-width="22" stroke-linecap="round"/>`).join('');
  shapes+=`<path d="M${project(p[1]).join(' ')} Q${project([-72,0,0]).join(' ')} ${project([-30,-25,0]).join(' ')} L${project([29,-25,0]).join(' ')} Q${project([68,20,0]).join(' ')} ${project(p[17]).join(' ')} L${[13,9,5,1].map(i=>project(p[i]).join(' ')).join(' L')} Z" fill="url(#manoPalm)" stroke="#d6c4ae" stroke-width="2"/>`;
  data.fingers.forEach((f,k)=>{
    const pts=f.map(i=>p[i]),width=[27,24,25,23,20][k];
    shapes+=`<polyline points="${poly(pts)}" fill="none" stroke="#9d8878" stroke-width="${width+3}" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${poly(pts)}" fill="none" stroke="url(#manoSkin)" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
    if(step==='deform')for(let j=0;j<3;j++)shapes+=`<line x1="${project(pts[j])[0]}" y1="${project(pts[j])[1]}" x2="${project(pts[j+1])[0]}" y2="${project(pts[j+1])[1]}" stroke="${['#63cab2','#b9a0ec','#efa969'][j]}" stroke-width="${width-6}" opacity=".65"/>`;
    if(step==='pose'||step==='keypoints'||step==='deform')shapes+=`<polyline points="${poly([[0,0,0],...pts])}" fill="none" stroke="#6bb1de" stroke-width="2" stroke-opacity=".9"/>`;
  });
  if(step==='keypoints'||step==='pose'||step==='deform')p.forEach((point,i)=>{
    const tip=data.tipIndices.includes(i),[x,y]=project(point);
    shapes+=`<circle cx="${x}" cy="${y}" r="${tip?5:4}" fill="${tip?'#f8b86d':'#82c1e9'}" stroke="#162b39" stroke-width="1.5"/>`;
    if(step==='keypoints')shapes+=`<text x="${x+8}" y="${y-6}" fill="${tip?'#f8b86d':'#bce5ff'}" font-size="12">${i}</text>`;
  });
  return `<svg viewBox="0 0 640 540" role="img" aria-label="程序化手形原理示意，不是 MANO 原生网格"><defs><linearGradient id="manoSkin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ede0cb"/><stop offset=".45" stop-color="#cbbb9f"/><stop offset="1" stop-color="#887b68"/></linearGradient><linearGradient id="manoPalm" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d8c8ac"/><stop offset="1" stop-color="#9e8c76"/></linearGradient><radialGradient id="manoGlow"><stop stop-color="#28474d" stop-opacity=".6"/><stop offset="1" stop-color="#142025" stop-opacity="0"/></radialGradient></defs><ellipse cx="320" cy="280" rx="270" ry="250" fill="url(#manoGlow)"/>${shapes}<text x="25" y="520" fill="#83979e" font-size="12">程序化原理示意 · 非 MANO 模型输出</text></svg>`;
}

export function mountMano(host) {
  const styleURL=new URL('./mano.css',import.meta.url).href;
  if(!document.querySelector(`link[data-mano-css]`)){const link=document.createElement('link');link.rel='stylesheet';link.href=styleURL;link.dataset.manoCss='';document.head.append(link);}
  const root=document.createElement('section');root.className='mano-principles';host.append(root);
  const state={step:'shape',shape:0,pose:15};
  const initial=location.hash.split('/').at(-1);if(STEPS.some(s=>s.id===initial))state.step=initial;
  root.innerHTML=`<header class="mano-head"><div><span class="mano-eyebrow">MANO · 形状与姿态</span><h1>一只手，两类参数</h1><p>形状参数改手形，姿态参数改关节姿态。</p></div><span class="mano-boundary">MANO 本身不计算肌肉激活</span></header><nav class="mano-steps" aria-label="MANO 原理步骤">${STEPS.map((s,i)=>`<button type="button" data-step="${s.id}"><span>0${i+1}</span>${s.name}</button>`).join('')}</nav><div class="mano-layout"><div class="mano-visual"></div><aside class="mano-explain"><span class="mano-eyebrow" data-number></span><h2 data-title></h2><p data-text></p><div class="mano-control"><label for="mano-shape">形状变化示意 <output data-shape></output></label><input id="mano-shape" type="range" min="-1" max="1" step=".02" value="0"/><small>不是实际 β 分量或个人参数估计</small></div><div class="mano-control"><label for="mano-pose">关节弯曲示意 <output data-pose></output></label><input id="mano-pose" type="range" min="0" max="80" step="1" value="15"/></div><div class="mano-flow" aria-label="形状与姿态两条分支共同生成表面"><div><b>β 形状</b><span>表面形状 + 关节位置</span></div><div><b>θ 姿态</b><span>关节旋转 + 姿态修正</span></div><strong>↓ &nbsp; 蒙皮 &nbsp; ↓</strong><p>手部表面 → 关节 / 指尖坐标</p></div><details><summary>展开原理与实现</summary><p data-detail></p><p>具体参数维度、点序与输出单位以所用版本及封装为准。此页没有执行 MANO 模型，也没有加载其网格、权重或模型文件。</p><a href="${SOURCE.model}" target="_blank" rel="noopener">官方团队实现 · MANO 类 ↗</a><a href="${SOURCE.skin}" target="_blank" rel="noopener">形状、关节回归、蒙皮顺序 ↗</a></details><details><summary>模型来源与授权</summary><p>Romero、Tzionas 与 Black，2017。MANO 官方模型需按其许可获取；此站不分发受限权重或网格。</p><a href="${SOURCE.project}" target="_blank" rel="noopener">MANO 项目页 ↗</a><a href="${SOURCE.license}" target="_blank" rel="noopener">MANO 官方许可 ↗</a></details></aside></div>`;
  const render=()=>{
    const step=STEPS.find(s=>s.id===state.step);
    root.querySelector('.mano-visual').innerHTML=handSVG(state);
    root.querySelector('[data-title]').textContent=step.title;root.querySelector('[data-text]').textContent=step.text;
    root.querySelector('[data-detail]').textContent=step.detail;root.querySelector('[data-number]').textContent=`0${STEPS.indexOf(step)+1} / 04`;
    root.querySelector('[data-shape]').textContent=state.shape.toFixed(2);root.querySelector('[data-pose]').textContent=`${state.pose}°`;
    root.querySelectorAll('[data-step]').forEach(b=>{b.classList.toggle('is-active',b.dataset.step===state.step);b.setAttribute('aria-current',b.dataset.step===state.step?'step':'false');});
  };
  const click=e=>{const b=e.target.closest('[data-step]');if(b){state.step=b.dataset.step;history.replaceState(null,'',`#/mano/${state.step}`);render();}};
  const input=e=>{if(e.target.id==='mano-shape')state.shape=Number(e.target.value);else if(e.target.id==='mano-pose')state.pose=Number(e.target.value);else return;render();};
  root.addEventListener('click',click);root.addEventListener('input',input);render();
  return {dispose(){root.removeEventListener('click',click);root.removeEventListener('input',input);root.remove();},setStep(step){if(STEPS.some(s=>s.id===step)){state.step=step;render();}}};
}
