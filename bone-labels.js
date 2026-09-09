// Chinese names correspond to the actual 29 meshes; the thumb has no middle phalanx.
export const BONE_NAMES=Object.freeze({
 ulna:{name:'尺骨',short:'尺骨'},radius:{name:'桡骨',short:'桡骨'},
 lunate:{name:'月骨',short:'月骨'},scaphoid:{name:'舟骨',short:'舟骨'},
 pisiform:{name:'豌豆骨',short:'豌豆骨'},triquetrum:{name:'三角骨',short:'三角骨'},
 capitate:{name:'头状骨',short:'头状骨'},trapezium:{name:'大多角骨',short:'大多角骨'},
 trapezoid:{name:'小多角骨',short:'小多角骨'},hamate:{name:'钩骨',short:'钩骨'},
 '1mc':{name:'第1掌骨',short:'拇指掌骨'},
 thumbprox:{name:'拇指近节指骨',short:'拇指近节'},thumbdist:{name:'拇指远节指骨',short:'拇指远节'},
 ...Object.fromEntries([['2','食指'],['3','中指'],['4','无名指'],['5','小指']].flatMap(([n,finger])=>[
  [n+'mc',{name:'第'+n+'掌骨',short:finger+'掌骨'}],
  [n+'proxph',{name:finger+'近节指骨',short:finger+'近节'}],
  [n+'midph',{name:finger+'中节指骨',short:finger+'中节'}],
  [n+'distph',{name:finger+'远节指骨',short:finger+'远节'}],
 ]))
});
const BONE_PARTS={
 手腕:['ulna','radius','lunate','scaphoid','pisiform','triquetrum','capitate','trapezium','trapezoid','hamate'],
 拇指:['1mc','thumbprox','thumbdist'],
 ...Object.fromEntries([['2','食指'],['3','中指'],['4','无名指'],['5','小指']].map(([n,part])=>[
  part,[n+'mc',n+'proxph',n+'midph',n+'distph']
 ]))
};
export function bonesForPart(part){return BONE_PARTS[part]??[];}
const clamp=(n,a,b)=>Math.min(Math.max(n,a),Math.max(a,b));

// Two inner name columns leave the outer colored tendon-label gutters untouched.
// A monotone vertical arrangement prevents overlaps without shuffling label order.
export function layoutBoneLabels(items,width,height,sides=new Map()){
 if(!items.length||width<=0||height<=0)return [];
 const compact=width<500,fontSize=compact?10.5:11;
 const short=width<420,rowHeight=fontSize+4,margin=(compact?87:101)+7;
 const top=12,bottom=height-(compact?48:62);
 const ranked=[...items].sort((a,b)=>a.x-b.x||a.id.localeCompare(b.id));
 const half=Math.ceil(ranked.length/2);
 const groups=[[],[]];
 ranked.forEach((item,i)=>{
  const side=sides.get(item.id)??(i<half?0:1);
  const text=short?(item.short??item.label):item.label;
  // Include a little extra width for the dark text halo.
  const w=[...text].reduce((n,c)=>n+(c.charCodeAt(0)>255?fontSize:fontSize*.62),6);
  groups[side].push({...item,text,w,h:rowHeight,side,fontSize});
 });
 const maxWidth=Math.max(...groups.flat().map(l=>l.w));
 const leftEdge=clamp(Math.min(...items.map(l=>l.x))-18,margin+maxWidth,width/2-7);
 const rightEdge=clamp(Math.max(...items.map(l=>l.x))+18,width/2+7,width-margin-maxWidth);
 const result=[];
 for(const [side,labels] of groups.entries()){
  labels.sort((a,b)=>a.y-b.y||a.id.localeCompare(b.id));
  if(!labels.length)continue;
  const gap=Math.min(compact?17:20,(bottom-top-rowHeight)/Math.max(1,labels.length-1));
  let last=top-rowHeight/2-gap;
  for(const l of labels){l.cy=Math.max(clamp(l.y,top+rowHeight/2,bottom-rowHeight/2),last+gap);last=l.cy;}
  if(last>bottom-rowHeight/2){
   let next=bottom-rowHeight/2+gap;
   for(let i=labels.length-1;i>=0;i--){labels[i].cy=Math.min(labels[i].cy,next-gap);next=labels[i].cy;}
  }
  for(const l of labels){
   const edge=side===0?leftEdge:rightEdge;
   result.push({...l,left:side===0?edge-l.w:edge,top:l.cy-rowHeight/2,
    textX:side===0?edge-3:edge+3,edge,anchorX:l.x,anchorY:l.y});
  }
 }
 return result;
}

export class BoneLabels {
 constructor(THREE,overlay,bones){
  this.THREE=THREE;this.overlay=overlay;this.bones=bones;this.nodes=new Map();this.sides=new Map();this.cameraKey='';
  const ns='http://www.w3.org/2000/svg';
  const svg=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
  for(const mesh of bones){
   const meta=BONE_NAMES[mesh.name];if(!meta)throw new Error('Missing bone name: '+mesh.name);
   mesh.geometry.computeBoundingBox();
   const anchor=mesh.geometry.boundingBox.getCenter(new THREE.Vector3());
   if(mesh.name==='radius'||mesh.name==='ulna'){
    // Place forearm names near the visible wrist end, not the offscreen shaft center.
    const target=mesh.geometry.boundingBox.min.y+.025,p=mesh.geometry.getAttribute('position');
    const sum=new THREE.Vector3();let count=0;
    for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i)-target)<.003){sum.add(new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)));count++;}
    if(count)anchor.copy(sum.multiplyScalar(1/count));
   }
   const group=svg('g',{class:'bone-label','data-bone':mesh.name,'aria-label':meta.name});
   const title=svg('title');title.textContent=meta.name;
   const line=svg('path',{class:'bone-label-line',fill:'none'});
   const dot=svg('circle',{class:'bone-label-dot',r:1.25});
   const text=svg('text',{class:'bone-label-text','dominant-baseline':'central'});
   group.append(title,line,dot,text);overlay.append(group);
   this.nodes.set(mesh.name,{mesh,anchor,meta,group,line,dot,text});
  }
 }
 render(camera,width,height,part=null){
  if(!width||!height)return;
  this.overlay.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const cameraKey=camera.matrixWorld.elements.map(v=>v.toFixed(5)).join(',')+':'+width+':'+height;
  if(cameraKey!==this.cameraKey||part!==this.part){this.cameraKey=cameraKey;this.part=part;this.sides.clear();}
  const items=[],scope=new Set(bonesForPart(part));
  for(const [id,n] of this.nodes){
   if(!scope.has(id)){n.group.style.display='none';continue;}
   const p=n.anchor.clone().applyMatrix4(n.mesh.matrixWorld).project(camera);
   const x=(p.x+1)*width/2,y=(1-p.y)*height/2;
   if(p.z<-1||p.z>1||x<0||x>width||y<0||y>height){n.group.style.display='none';continue;}
   items.push({id,label:n.meta.name,short:n.meta.short,x,y});
  }
  const placements=layoutBoneLabels(items,width,height,this.sides);
  for(const l of placements){
   const n=this.nodes.get(l.id);this.sides.set(l.id,l.side);n.group.style.display='';
   n.text.textContent=l.text;n.text.setAttribute('x',l.textX);n.text.setAttribute('y',l.cy);
   n.text.setAttribute('text-anchor',l.side===0?'end':'start');n.text.style.fontSize=l.fontSize+'px';
   n.line.setAttribute('d',`M${l.edge},${l.cy} L${l.anchorX},${l.anchorY}`);
   n.dot.setAttribute('cx',l.anchorX);n.dot.setAttribute('cy',l.anchorY);
  }
  this.placements=placements;
 }
 snapshot(){return (this.placements??[]).map(l=>({id:l.id,name:BONE_NAMES[l.id].name,x:l.left,y:l.top,width:l.w,height:l.h,anchor:[l.anchorX,l.anchorY]}));}
}
