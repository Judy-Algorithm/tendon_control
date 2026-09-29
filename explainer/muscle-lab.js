// Deliberately pedagogical: Gaussian active force-length relation, not any native
// OpenSim constitutive class or StaticOptimization calculation.
export const MUSCLE_LAB_DEFAULTS = Object.freeze({fmaxN:150,loptMm:90,ltsMm:150});
const LIMITS = {fmaxN:[50,250],loptMm:[40,120],ltsMm:[100,180]};
const finiteBound=(value,key)=>{
  const x=Number(value),[lo,hi]=LIMITS[key];
  return Number.isFinite(x)?Math.min(hi,Math.max(lo,x)):MUSCLE_LAB_DEFAULTS[key];
};

export function computeMuscleExample(parameters={}) {
  const fmaxN=finiteBound(parameters.fmaxN??MUSCLE_LAB_DEFAULTS.fmaxN,'fmaxN');
  const loptMm=finiteBound(parameters.loptMm??MUSCLE_LAB_DEFAULTS.loptMm,'loptMm');
  const ltsMm=finiteBound(parameters.ltsMm??MUSCLE_LAB_DEFAULTS.ltsMm,'ltsMm');
  const lmtMm=250,activation=.5,fiberMm=lmtMm-ltsMm;
  const normalizedLength=fiberMm/loptMm;
  const forceLengthMultiplier=Math.exp(-(((normalizedLength-1)/.45)**2));
  return {fmaxN,loptMm,ltsMm,lmtMm,activation,fiberMm,normalizedLength,forceLengthMultiplier,
    maxActiveForceN:activation*fmaxN,forceN:activation*fmaxN*forceLengthMultiplier};
}

function geometrySVG(r) {
  const start=34,end=486,center=92,split=start+(end-start)*r.fiberMm/r.lmtMm;
  const fiberWidth=split-start;
  const dimension=(x1,x2,y)=>`<path d="M${x1} ${y+5}V${y-5}M${x1} ${y}H${x2}M${x2} ${y-5}V${y+5}" class="mlab-dimension"/>`;
  const fiberLines=[-12,-6,0,6,12].map(d=>`<path d="M${start+14} ${center+d*.25} Q${start+fiberWidth*.5} ${center+d*1.1} ${split-10} ${center+d*.25}" class="mlab-fiber-line"/>`).join('');
  return `<svg viewBox="0 0 520 174" role="img" aria-label="固定肌肉肌腱总长250毫米；纤维${r.fiberMm}毫米，刚性肌腱${r.ltsMm}毫米">
    ${dimension(start,end,30)}<text x="260" y="18" text-anchor="middle" class="mlab-svg-title">总通路长度 lMT = 250 mm</text>
    <path d="M${start} ${center} C${start+fiberWidth*.2} ${center-38},${split-fiberWidth*.18} ${center-38},${split} ${center} C${split-fiberWidth*.18} ${center+38},${start+fiberWidth*.2} ${center+38},${start} ${center}Z" class="mlab-belly"/>
    ${fiberLines}<path d="M${split} ${center-3}H${end}M${split} ${center+3}H${end}" class="mlab-tendon"/>
    <circle cx="${start}" cy="${center}" r="5" class="mlab-anchor"/><circle cx="${end}" cy="${center}" r="5" class="mlab-anchor"/>
    ${dimension(start,split,139)}${dimension(split,end,139)}
    <text x="${(start+split)/2}" y="163" text-anchor="middle" class="mlab-fiber-text">纤维 ${r.fiberMm} mm</text>
    <text x="${(split+end)/2}" y="163" text-anchor="middle" class="mlab-tendon-text">肌腱 ${r.ltsMm} mm</text>
  </svg>`;
}

function forceLengthSVG(r) {
  const left=42,right=484,top=25,bottom=157;
  const px=x=>left+x/4*(right-left),py=y=>bottom-y*(bottom-top);
  const path=Array.from({length:161},(_,i)=>{
    const x=i/40,y=Math.exp(-(((x-1)/.45)**2));
    return `${i?'L':'M'}${px(x).toFixed(2)},${py(y).toFixed(2)}`;
  }).join(' ');
  const grids=[0,.5,1].map(y=>`<path d="M${left} ${py(y)}H${right}" class="mlab-grid"/><text x="${left-8}" y="${py(y)+4}" text-anchor="end">${y.toFixed(1)}</text>`).join('');
  const ticks=[0,1,2,3,4].map(x=>`<text x="${px(x)}" y="176" text-anchor="middle">${x}</text>`).join('');
  const x=px(r.normalizedLength),y=py(r.forceLengthMultiplier);
  return `<svg viewBox="0 0 520 210" role="img" aria-label="简化归一化主动长度曲线。当前纤维长度除以最优长度为${r.normalizedLength.toFixed(2)}，产力系数为${r.forceLengthMultiplier.toFixed(3)}">
    <text x="${left}" y="13" class="mlab-svg-title">主动产力系数 fL（无量纲）</text>${grids}
    <path d="M${px(1)} ${top}V${bottom}" class="mlab-optimal"/><path d="${path}" class="mlab-curve"/>
    <path d="M${x} ${bottom}V${y}" class="mlab-current-line"/><circle cx="${x}" cy="${y}" r="5" class="mlab-current"/>
    ${ticks}<text x="${(left+right)/2}" y="201" text-anchor="middle">归一化纤维长度 lF / lopt</text>
  </svg>`;
}

/** Mount an independent, accessible teaching panel. Returns an idempotent disposer. */
export function mountMuscleLab(host,{showSources=()=>{}}={}) {
  if(!host) throw new Error('mountMuscleLab requires a host element');
  let state={...MUSCLE_LAB_DEFAULTS};
  const root=document.createElement('section');
  root.className='muscle-lab';
  root.innerHTML=`<div class="mlab-intro"><span class="mlab-tier">简化计算</span><p>固定总长度与激活，只动三个模型参数。先看长度如何分配，再看肌力如何变化；这里不运行 OpenSim。</p></div>
    <figure class="mlab-geometry"></figure>
    <div class="mlab-controls">
      ${[
        ['fmaxN','力量尺度','Fmax',50,250,'N','把整条产力曲线放大或缩小'],
        ['loptMm','最优纤维长度','lopt',40,120,'mm','改变“最适合发力”的参考长度'],
        ['ltsMm','肌腱松弛长度','lTS',100,180,'mm','改变总长中分给纤维的部分'],
      ].map(([key,title,symbol,min,max,unit,hint])=>`<label class="mlab-control"><span><strong>${title} <code>${symbol}</code></strong><output data-lab-output="${key}"></output></span><input type="range" min="${min}" max="${max}" step="1" value="${state[key]}" data-lab-param="${key}" aria-label="${title} ${symbol}（${unit}）"><small>${hint}</small></label>`).join('')}
    </div>
    <div class="mlab-result"><div><span>当前主动肌力</span><strong data-lab-force></strong></div><p data-lab-equation></p></div>
    <figure class="mlab-chart"></figure><div class="mlab-legend"><span><i></i>当前状态</span><span class="mlab-reference">虚线：lF = lopt</span></div>
    <details class="mlab-assumptions"><summary>这个例子简化了什么？</summary><p>lMT = 250 mm，激活 a = 0.5，羽状角为 0。假设肌腱不可伸长，lT = lTS，因此 lF = lMT − lTS。</p><div class="mlab-formula">fL = exp(−((lF / lopt − 1) / 0.45)²)<br>F = a × Fmax × fL</div><p>高斯曲线仅为教学公式，不是 Millard、Thelen 或 De Groote 的原生公式。没有被动力、速度效应、肌腱弹性或激活动力学；也没有运行 SO。</p><p>Fmax 改变实际力值，不改变归一化曲线；lopt 和 lTS 改变当前状态在曲线上的位置。这里的参数范围用于演示，不是个人生理范围。</p></details>
    <div class="mlab-actions"><button type="button" data-lab-reset>恢复默认</button><button type="button" data-lab-sources>官方参数说明 ↗</button></div>`;
  host.append(root);
  const update=()=>{
    const r=computeMuscleExample(state);
    for(const key of Object.keys(LIMITS)){
      root.querySelector(`[data-lab-output="${key}"]`).textContent=`${r[key]} ${key==='fmaxN'?'N':'mm'}`;
      root.querySelector(`[data-lab-param="${key}"]`).value=r[key];
    }
    root.querySelector('.mlab-geometry').innerHTML=geometrySVG(r);
    root.querySelector('.mlab-chart').innerHTML=forceLengthSVG(r);
    root.querySelector('[data-lab-force]').textContent=`${r.forceN<.001?r.forceN.toExponential(2):r.forceN.toFixed(2)} N`;
    const multiplier=r.forceLengthMultiplier<.001?r.forceLengthMultiplier.toExponential(2):r.forceLengthMultiplier.toFixed(3);
    root.querySelector('[data-lab-equation]').textContent=`0.5 × ${r.fmaxN} N × ${multiplier}`;
  };
  const onInput=event=>{
    const key=event.target.dataset?.labParam;
    if(!Object.hasOwn(LIMITS,key))return;
    state[key]=Number(event.target.value); update();
  };
  const onClick=event=>{
    if(event.target.closest('[data-lab-reset]')){state={...MUSCLE_LAB_DEFAULTS};update();}
    if(event.target.closest('[data-lab-sources]'))showSources(['opensim-scale','opensim-millard','opensim-so']);
  };
  root.addEventListener('input',onInput);root.addEventListener('click',onClick);update();
  let disposed=false;
  return ()=>{if(disposed)return;disposed=true;root.removeEventListener('input',onInput);root.removeEventListener('click',onClick);root.remove();};
}
