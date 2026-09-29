import '../../vendor/three.min.js';
import '../../vendor/orbit-controls.js';
import {validateMano,manoForward} from './mano-math.js';
const T=window.THREE;
// Memory only: navigating tabs should not require selecting the file again.
// No browser storage, telemetry, or upload of the private model.
let sessionModel=null;
const STEPS=[
  {id:'shape',name:'改手形',title:'形状决定手长什么样',text:'拖动 β，表面和关节位置一起改变。',detail:'真实 MANO 的十维形状基描述相关的形状变化。这里开放前两个 β，其余置零；它们不分别代表某一根骨头的长度。'},
  {id:'pose',name:'摆姿态',title:'关节旋转，带动手指',text:'从展开到放松，看同一只手改变姿态。',detail:'当前滑块在零轴角（flat hand）与模型自带 hands_mean 之间插值。它控制 45 个局部轴角值，不是单个关节角，也不是临床活动范围。'},
  {id:'deform',name:'看变形',title:'表面怎样跟着关节走？',text:'每个表面点，按权重跟随附近关节。',detail:'先计算形状修正与关节回归，再加入姿态修正，最后执行线性混合蒙皮。颜色显示原文件蒙皮权重的分组混合（五指＋腕），不是肌肉激活。'},
  {id:'keypoints',name:'读坐标',title:'21 个点，63 个坐标',text:'16 个关节，加上表面的 5 个指尖点。',detail:'此页使用腕→拇指→食指→中指→无名指→小指的 21 × 3 顺序。指尖顶点为 744、320、443、554、671；这是本页明确采用的接口约定，并非所有 MANO 封装的统一点序。输出单位为米。'},
];
class ManoView {
  constructor(host,model){
    this.host=host;this.model=model;this.resources=[];
    this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(34,1,.001,10);
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputEncoding=T.sRGBEncoding;
    this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.9;
    this.renderer.domElement.setAttribute('aria-label','用户本地 MANO 原生表面，可拖动旋转');host.append(this.renderer.domElement);
    this.controls=new T.OrbitControls(this.camera,this.renderer.domElement);this.controls.enablePan=false;this.controls.minDistance=.2;this.controls.maxDistance=.9;
    this.controls.addEventListener('change',()=>this.render());
    this.scene.add(new T.HemisphereLight(0xfff4de,0x243641,.42));
    [[0xfff3de,1.1,[-1,1,.6]],[0xc9e5ff,.2,[2,.3,.3]],[0x87c5b7,.7,[.3,1,-2]]].forEach(([c,i,p])=>{const l=new T.DirectionalLight(c,i);l.position.set(...p);this.scene.add(l);});
    const zero=manoForward(model),j=zero.joints,vec=a=>new T.Vector3(...a);
    this.origin=vec(zero.wrist);this.y=vec(j[4]).sub(this.origin).normalize();
    this.x=vec(j[1]).sub(vec(j[7]));this.x.addScaledVector(this.y,-this.x.dot(this.y)).normalize();this.z=new T.Vector3().crossVectors(this.x,this.y).normalize();
    this.geometry=new T.BufferGeometry();this.geometry.setIndex(model.faces);this.geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(2334),3));
    const colors=new Float32Array(2334),palette=[0xb9c5c5,0x91bdbc,0xa3b2d6,0xc5a6ca,0xddb497,0x9dbb99].map(c=>new T.Color(c).convertSRGBToLinear()),group=[0,1,1,1,2,2,2,3,3,3,4,4,4,5,5,5];
    for(let v=0;v<778;v++)for(let k=0;k<16;k++){const c=palette[group[k]],w=model.weights[v*16+k];colors[v*3]+=c.r*w;colors[v*3+1]+=c.g*w;colors[v*3+2]+=c.b*w;}
    this.geometry.setAttribute('color',new T.BufferAttribute(colors,3));
    this.material=new T.MeshStandardMaterial({color:new T.Color(0xe8d5b9).convertSRGBToLinear(),roughness:.48,metalness:.02,side:T.DoubleSide});
    this.mesh=new T.Mesh(this.geometry,this.material);this.scene.add(this.mesh);
    this.wireMaterial=new T.MeshBasicMaterial({color:0x53686b,wireframe:true,transparent:true,opacity:.22,depthWrite:false});
    this.wire=new T.Mesh(this.geometry,this.wireMaterial);this.scene.add(this.wire);
    this.pointGeometry=new T.BufferGeometry();this.pointGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array(63),3));
    this.pointMaterial=new T.PointsMaterial({color:0x8ad7ee,size:.004,depthTest:false});this.points=new T.Points(this.pointGeometry,this.pointMaterial);this.points.renderOrder=3;this.scene.add(this.points);
    this.labels=document.createElement('div');this.labels.className='mano-point-labels';this.labels.innerHTML=Array.from({length:21},(_,i)=>`<span>${i}</span>`).join('');host.append(this.labels);
    this.resources.push(this.geometry,this.material,this.wireMaterial,this.pointGeometry,this.pointMaterial);
    this.resize=new ResizeObserver(()=>{const r=host.getBoundingClientRect();this.renderer.setSize(r.width,r.height);this.camera.aspect=r.width/Math.max(1,r.height);this.camera.updateProjectionMatrix();this.render();});this.resize.observe(host);this.home();
  }
  home(){this.camera.position.set(.14,.12,.43);this.controls.target.set(0,.072,0);this.controls.update();this.render();}
  project(v){const p=new T.Vector3(...v).sub(this.origin);return [p.dot(this.x),p.dot(this.y),p.dot(this.z)];}
  update(state){
    const beta=Array(10).fill(0);beta[0]=state.beta0;beta[1]=state.beta1;
    this.output=manoForward(this.model,beta,[0,0,0,...this.model.meanPose.map(x=>x*state.pose)]);
    for(let i=0;i<778;i++)this.geometry.attributes.position.array.set(this.project(this.output.vertices.slice(i*3,i*3+3)),i*3);
    this.geometry.attributes.position.needsUpdate=true;this.geometry.computeVertexNormals();this.geometry.computeBoundingSphere();
    const deform=state.step==='deform';this.material.vertexColors=deform;this.material.color.setHex(deform?0xffffff:0xe8d5b9).convertSRGBToLinear();this.material.needsUpdate=true;this.wire.visible=deform;
    this.points.visible=state.step==='keypoints';this.labels.hidden=!this.points.visible;
    this.displayPoints=this.output.keypoints.map(p=>this.project(p));this.displayPoints.forEach((p,i)=>this.pointGeometry.attributes.position.array.set(p,i*3));this.pointGeometry.attributes.position.needsUpdate=true;this.pointGeometry.computeBoundingSphere();this.render();
  }
  render(){this.renderer.render(this.scene,this.camera);if(this.displayPoints&&!this.labels.hidden){const w=this.host.clientWidth,h=this.host.clientHeight;this.displayPoints.forEach((p,i)=>{const v=new T.Vector3(...p).project(this.camera);this.labels.children[i].style.transform=`translate(${(v.x+1)*w/2+7}px,${(1-v.y)*h/2-12}px)`;});}}
  dispose(){this.resize.disconnect();this.controls.dispose();this.resources.forEach(r=>r.dispose());this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();this.labels.remove();}
}
export function mountMano(host){
  const root=document.createElement('section');root.className='mano-principles';host.append(root);
  let view=null,disposed=false;const controller=new AbortController(),state={step:'shape',beta0:0,beta1:0,pose:.25};
  root.innerHTML=`<nav class="mano-steps" aria-label="MANO 原理步骤">${STEPS.map((s,i)=>`<button data-step="${s.id}"><span>0${i+1}</span>${s.name}</button>`).join('')}</nav><div class="mano-layout"><div class="mano-visual"><header class="mano-stage-title"><h1>真实表面，直观看懂</h1><p data-model-status>MANO · 形状与姿态</p></header><div class="mano-canvas"></div><div class="mano-empty"><div class="mano-formula"><span>β<small>手形</small></span><b>＋</b><span>θ<small>姿态</small></span><b>→</b><span>3D<small>手部表面</small></span></div><h2>载入你自己的 MANO</h2><p>模型只在浏览器本地使用，不上传。</p><label class="mano-import">选择本地模型<input type="file" accept=".json" data-file></label><p class="mano-load-status" role="status"></p></div><div class="mano-scene-tools" hidden><span>拖动旋转 · 滚轮缩放</span><button data-home>复位视角</button></div></div><aside class="mano-explain"><small data-number></small><h2 data-title></h2><p data-text></p><fieldset disabled class="mano-controls"><label for="mano-shape">形状 β₁ <output data-beta0>0.00</output></label><input id="mano-shape" data-value="beta0" type="range" min="-2" max="2" step=".05" value="0"><label for="mano-shape2">形状 β₂ <output data-beta1>0.00</output></label><input id="mano-shape2" data-value="beta1" type="range" min="-2" max="2" step=".05" value="0"><label for="mano-pose">展开 → 放松 <output data-pose>25%</output></label><input id="mano-pose" data-value="pose" type="range" min="0" max="1" step=".01" value=".25"><button type="button" data-reset>重置参数</button></fieldset><div class="mano-takeaway">MANO 描述手的形状与姿态，<br>不计算肌肉激活。</div><details><summary>深入了解</summary><p data-detail></p><p>真实模型：778 个顶点、1538 个三角面、16 个关节、10 维形状。此页在浏览器运行形状修正、姿态修正与蒙皮。</p><a href="https://mano.is.tue.mpg.de/" target="_blank" rel="noopener">MANO 官方项目 ↗</a><a href="https://github.com/vchoutas/smplx/blob/main/smplx/lbs.py" target="_blank" rel="noopener">模型前向计算实现 ↗</a></details><details><summary>加载与许可</summary><p>本地服务可自动读取已授权模型；公开网页不内置受限模型。用项目的本地转换工具生成 JSON，再选择文件。未加载时不会用示意手冒充 MANO。</p><a href="./docs/explainer/MANO_LOCAL.md" target="_blank">本地加载说明 ↗</a><a href="https://mano.is.tue.mpg.de/license.html" target="_blank" rel="noopener">官方模型许可 ↗</a><label class="mano-replace">更换本地模型<input type="file" accept=".json" data-file></label></details><div class="mano-next"><button data-prev>← 上一步</button><button data-next>下一步 →</button></div></aside></div>`;
  function render(){if(disposed)return;const s=STEPS.find(x=>x.id===state.step),i=STEPS.indexOf(s);root.querySelector('[data-title]').textContent=s.title;root.querySelector('[data-text]').textContent=s.text;root.querySelector('[data-detail]').textContent=s.detail;root.querySelector('[data-number]').textContent=`0${i+1} / 04`;root.querySelectorAll('[data-step]').forEach(b=>{b.classList.toggle('is-active',b.dataset.step===state.step);b.setAttribute('aria-current',b.dataset.step===state.step?'step':'false');});for(const k of ['beta0','beta1','pose']){root.querySelector(`[data-${k}]`).textContent=k==='pose'?Math.round(state[k]*100)+'%':state[k].toFixed(2);root.querySelector(`[data-value="${k}"]`).value=state[k];}root.querySelector('[data-prev]').disabled=i===0;root.querySelector('[data-next]').disabled=i===3;view?.update(state);}
  function setStep(step){if(STEPS.some(s=>s.id===step)){state.step=step;render();}}
  function install(data){if(disposed)return;validateMano(data);view?.dispose();view=null;view=new ManoView(root.querySelector('.mano-canvas'),data);sessionModel=data;root.querySelector('.mano-empty').hidden=true;root.querySelector('.mano-controls').disabled=false;root.querySelector('.mano-scene-tools').hidden=false;root.querySelector('[data-model-status]').textContent=`MANO ${data.hand==='right'?'右手':'左手'} · 778 顶点 · 本地模型`;root.dataset.modelLoaded='true';render();}
  root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.step){setStep(b.dataset.step);history.replaceState(null,'',`#mano/${state.step}`);}else if(b.hasAttribute('data-home'))view?.home();else if(b.hasAttribute('data-reset')){Object.assign(state,{beta0:0,beta1:0,pose:.25});render();}else if(b.hasAttribute('data-next')||b.hasAttribute('data-prev')){const i=STEPS.findIndex(s=>s.id===state.step)+(b.hasAttribute('data-next')?1:-1);setStep(STEPS[i]?.id);history.replaceState(null,'',`#mano/${state.step}`);}});
  root.addEventListener('input',e=>{const k=e.target.dataset.value;if(k){state[k]=Number(e.target.value);render();}});
  let importVersion=0;
  root.addEventListener('change',async e=>{if(!e.target.hasAttribute('data-file'))return;const file=e.target.files?.[0];if(!file)return;const version=++importVersion;try{if(file.size>15000000)throw Error('模型文件过大');const data=JSON.parse(await file.text());if(version===importVersion)install(data);}catch(err){if(!disposed)root.querySelector('.mano-load-status').textContent='载入失败：'+err.message;}finally{e.target.value='';}});
  // Only loopback auto-loads private weights. Production never fetches them.
  if(sessionModel)install(sessionModel);
  else if(['localhost','127.0.0.1'].includes(location.hostname)){const version=importVersion;fetch('/api/mano/model',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('local model unavailable');return r.json();}).then(data=>{if(version===importVersion)install(data);}).catch(()=>{});}
  render();return {setStep,dispose(){disposed=true;controller.abort();view?.dispose();root.remove();}};
}
