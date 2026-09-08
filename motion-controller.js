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
    this.pause();this.key=next;this.viewer.setPose(null,0);this.rig=null;
    this.root.hidden=!direction;if(!direction)return;
    this.rig=buildRig(this.model,joint,dof);this.baseRange=motionRange(dof,direction);this.range={...this.baseRange};this.progress=0;
    this.title.textContent=`${joint.title} · ${direction.label}`;
    this.hint.textContent=this.range.prepositioned?'从预屈曲位伸回 0°':`从中立位${direction.label}至 ${Math.abs(this.range.target).toFixed(1)}°`;
    if(this.rig.inferred)this.hint.textContent+=' · 补充示意轴';
    this.slider.min=String(dof.range.min);this.slider.max=String(dof.range.max);
    document.getElementById('motion-min').textContent=`${dof.range.min.toFixed(1)}°`;
    document.getElementById('motion-max').textContent=`${dof.range.max.toFixed(1)}°`;
    this.dof=dof;
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
    document.getElementById('motion-angle-label').textContent=label;
  }
  snapshot(){return {key:this.key,angle:this.degrees??0,playing:this.playing,progress:this.progress,affectedBones:this.rig?[...this.rig.affected]:[],inferredAxis:Boolean(this.rig?.inferred)};}
}
