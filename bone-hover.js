import {BONE_NAMES} from './bone-labels.js';

export function tooltipPosition(x,y,width,height,boxWidth,boxHeight){
 const margin=6,offset=14;
 const fit=(value,size,limit)=>Math.max(margin,Math.min(value,limit-size-margin));
 return {x:fit(x+offset+boxWidth>width-margin?x-offset-boxWidth:x+offset,boxWidth,width),
  y:fit(y+offset+boxHeight>height-margin?y-offset-boxHeight:y+offset,boxHeight,height)};
}

// One transient name for the frontmost visible bone; no leader lines or selection.
export class BoneHover {
 constructor(THREE,canvas,stage,bones,requestRender,occluders=()=>[]){
  this.canvas=canvas;this.stage=stage;this.bones=bones;this.occluders=occluders;
  this.raycaster=new THREE.Raycaster();this.ndc=new THREE.Vector2();
  this.pointer=null;this.current=null;
  this.tooltip=document.createElement('div');this.tooltip.id='bone-hover';
  this.tooltip.className='bone-hover';this.tooltip.setAttribute('role','tooltip');
  this.tooltip.hidden=true;stage.append(this.tooltip);
  const move=e=>{
   if(e.pointerType==='touch'||e.buttons){this.clear();return;}
   this.pointer={x:e.clientX,y:e.clientY};requestRender();
  };
  canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',move);
  for(const event of ['pointerdown','pointerleave','pointercancel','lostpointercapture','webglcontextlost'])canvas.addEventListener(event,()=>this.clear());
  window.addEventListener('blur',()=>this.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')this.clear();});
 }
 hide(){this.current=null;this.tooltip.hidden=true;this.tooltip.textContent='';}
 clear(){this.pointer=null;this.hide();}
 render(camera){
  if(!this.pointer)return;
  const rect=this.canvas.getBoundingClientRect(),{x,y}=this.pointer;
  if(!rect.width||!rect.height||x<rect.left||y<rect.top||x>=rect.left+rect.width||y>=rect.top+rect.height){this.clear();return;}
  this.ndc.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);
  this.raycaster.setFromCamera(this.ndc,camera);
  const candidates=[...this.bones,...this.occluders()].filter(mesh=>mesh.visible);
  const hit=this.raycaster.intersectObjects(candidates,false)[0];
  const meta=hit&&this.bones.includes(hit.object)?BONE_NAMES[hit.object.name]:null;
  if(!meta){this.hide();return;}
  this.current={id:hit.object.name,name:meta.name};
  this.tooltip.textContent=meta.name;this.tooltip.hidden=false;
  const stageRect=this.stage.getBoundingClientRect();
  const position=tooltipPosition(x-stageRect.left,y-stageRect.top,this.stage.clientWidth,this.stage.clientHeight,this.tooltip.offsetWidth,this.tooltip.offsetHeight);
  this.tooltip.style.left=position.x+'px';this.tooltip.style.top=position.y+'px';
 }
 snapshot(){return this.current?{...this.current}:null;}
}
