import {buildRig,motionRange,angleAt} from './motion.js';

export class MotionController {
  constructor(viewer,model){
    this.viewer=viewer;this.model=model;this.key=null;this.rig=null;this.progress=0;this.playing=false;this.frame=0;
    this.root=document.getElementById('motion-controls');
    this.title=document.getElementById('motion-title');this.hint=document.getElementById('motion-hint');
    this.angle=document.getElementById('motion-angle');
    this.play=document.getElementById('motion-play');this.slider=document.getElementById('motion-progress');
    this.play.addEventListener('click',()=>{if(this.playing)this.pause();else if(this.progress>=1)this.replay();else this.resume();});
    document.getElementById('motion-neutral').addEventListener('click',()=>this.neutral());
    this.slider.addEventListener('input',()=>{this.pause();const degrees=Number(this.slider.value);this.progress=null;this.apply(degrees);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.playing)this.pause();});
    this.tick=this.tick.bind(this);
  }
  select(joint,dof,direction){
    const next=direction?`${dof.id}:${direction.id}`:null;if(next===this.key)return;
    this.pause();this.key=next;this.viewer.setPose(null,0);this.rig=null;this.degrees=0;this.progress=0;
    this.root.hidden=!direction;if(!direction)return;
    this.rig=buildRig(this.model,joint,dof);this.baseRange=motionRange(dof,direction);this.range={...this.baseRange};this.progress=0;
    this.title.textContent=`${joint.title} · ${direction.label}`;
    this.hint.textContent=this.range.prepositioned?'从预屈曲位伸回 0°':`从中立位${direction.label}至 ${Math.abs(this.range.target).toFixed(1)}°`;
    if(dof.hint)this.hint.textContent=dof.hint;
    else if(this.rig.inferred)this.hint.textContent+=' · 补充示意轴';
    this.slider.min=String(dof.range.min);this.slider.max=String(dof.range.max);
    document.getElementById('motion-min').textContent=`${dof.range.min.toFixed(1)}°`;
    document.getElementById('motion-max').textContent=`${dof.range.max.toFixed(1)}°`;
    this.dof=dof;
    if(this.root.querySelector){
      let solverLinks=this.root.querySelector('.motion-solver-links');
      if(!solverLinks){solverLinks=document.createElement('div');solverLinks.className='motion-solver-links';this.root.append(solverLinks);}
      solverLinks.innerHTML=['opensim','myohand'].map(engine=>`<a href="#${engine}/native?action=${encodeURIComponent(next)}">用 ${engine==='opensim'?'OpenSim':'MyoHand'} 求解 →</a>`).join('');
      let mappingNote=this.root.querySelector('.motion-native-note');
      if(!mappingNote){mappingNote=document.createElement('details');mappingNote.className='motion-native-note';this.root.append(mappingNote);}
      mappingNote.innerHTML='<summary>通道归类与求解范围</summary><p>这里的分组来自历史图谱中立位力臂，不是肌肉激活解，也不直接等于原生 MyoHand 分组。求解链接保留原片段的起止角度与 2.4 s 时序；手动拖动仅改变显示。</p>'+(dof.id==='wrist_flex'?'<p>ECRB 在原生 MyoHand 的腕屈曲方向贡献为负；此处历史图谱归类不同，不能跨模型照搬。</p>':'');
    }
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){this.apply(this.range.start);}
    else this.resume();
  }
  resume(){
    if(!this.rig)return;
    if(this.progress===null){
      // Resume from the exact manually selected pose, even outside the action's initial interval.
      this.range={...this.range,start:this.degrees};this.progress=0;
    }
    this.pause();this.playing=true;this.last=performance.now();this.play.textContent='暂停';
    this.apply(angleAt(this.range,this.progress));this.frame=requestAnimationFrame(this.tick);
  }
  replay(){if(!this.rig)return;this.range={...this.baseRange};this.progress=0;this.resume();}
  pause(){cancelAnimationFrame(this.frame);this.frame=0;this.playing=false;this.play.textContent='播放';}
  neutral(){this.pause();this.progress=null;this.apply(0);}
  tick(now){
    if(!this.playing)return;
    const delta=Math.min(80,now-this.last);this.last=now;this.progress=Math.min(1,this.progress+delta/2400);
    this.apply(angleAt(this.range,this.progress));
    if(this.progress>=1){this.pause();this.play.textContent='重播';}
    else this.frame=requestAnimationFrame(this.tick);
  }
  apply(degrees){
    this.degrees=degrees;this.viewer.setPose(this.rig,degrees);
    const label=Math.abs(degrees)<.05?'中立位':degrees<0?this.dof.range.negativeLabel:this.dof.range.positiveLabel;
    this.angle.textContent=`${Math.abs(degrees).toFixed(1)}°`;
    this.slider.value=String(degrees);this.slider.setAttribute('aria-valuetext',`${label} ${Math.abs(degrees).toFixed(1)} 度`);
    document.getElementById('motion-angle-label').textContent=this.dof.angleLabel?`${this.dof.angleLabel} · ${label}`:label;
  }
  snapshot(){return {key:this.key,angle:this.degrees??0,playing:this.playing,progress:this.progress,affectedBones:this.rig?[...this.rig.affected]:[],inferredAxis:Boolean(this.rig?.inferred)};}
}
