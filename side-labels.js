const clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
const intersects=(a,b)=>a.x<b.x+b.width+4&&a.x+a.width>b.x-4&&a.y<b.y+b.height+4&&a.y+a.height>b.y-4;

// Choose nearby free space instead of assigning anatomical sides to fixed screen edges.
export function layoutSideLabels(points,width,height,obstacles=[]){
 if(width<120||height<100)return [];
 const labelWidth=width<500?88:94,labelHeight=22,bottom=height-(width<500?48:62);
 const occupied=[...obstacles,...points.map(p=>({x:p.x-5,y:p.y-5,width:10,height:10}))],result=[];
 for(const [i,p] of points.entries()){
  const other=points.find(q=>q.id!==p.id);
  const dx=p.x-(other?.x??width/2),dy=p.y-(other?.y??height/2);
  const theta=Math.hypot(dx,dy)>1?Math.atan2(dy,dx):(i?0:Math.PI);
  const candidates=[];
  const add=(cx,cy)=>{
   const box={x:clamp(cx-labelWidth/2,8,width-labelWidth-8),y:clamp(cy-labelHeight/2,8,bottom-labelHeight),width:labelWidth,height:labelHeight};
   if(occupied.some(o=>intersects(box,o)))return;
   const vx=box.x+labelWidth/2-p.x,vy=box.y+labelHeight/2-p.y;
   const backwards=Math.max(0,-vx*Math.cos(theta)-vy*Math.sin(theta));
   candidates.push({...box,score:Math.hypot(vx,vy)+backwards*3});
  };
  for(const radius of [65,90,120,160])for(const offset of [0,-.4,.4,-.8,.8,-1.3,1.3,Math.PI]){
   add(p.x+Math.cos(theta+offset)*radius,p.y+Math.sin(theta+offset)*radius);
  }
  if(!candidates.length)for(let y=19;y<=bottom-labelHeight/2;y+=12)for(let x=8+labelWidth/2;x<=width-labelWidth/2-8;x+=16)add(x,y);
  const best=candidates.sort((a,b)=>a.score-b.score)[0];
  if(best){result.push({...p,...best});occupied.push(best);}
 }
 return result;
}

export class SideLabels {
 constructor(THREE,overlay,bones){
  this.overlay=overlay;this.nodes=new Map();this.placements=[];
  const ns='http://www.w3.org/2000/svg';
  const svg=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
  for(const [id,name,bone,sign] of [['radial','桡侧（拇指侧）','2mc',1],['ulnar','尺侧（小指侧）','5mc',-1]]){
   const mesh=bones.find(b=>b.name===bone);mesh.geometry.computeBoundingBox();
   const box=mesh.geometry.boundingBox,anchor=box.getCenter(new THREE.Vector3());
   // In the source hand frame +Z is radial. Use the palm edges, so thumb opposition
   // cannot carry the radial direction label across the palm with the thumb.
   anchor.z=(sign>0?box.max.z:box.min.z)+sign*.006;
   const group=svg('g',{class:'side-label','data-side':id,'aria-label':name});
   const line=svg('path',{class:'side-label-line',fill:'none'});
   const rect=svg('rect',{class:'side-label-bg',rx:4});
   const text=svg('text',{class:'side-label-text','text-anchor':'middle','dominant-baseline':'central'});text.textContent=name;
   group.append(line,rect,text);overlay.append(group);
   this.nodes.set(id,{mesh,anchor,name,group,line,rect,text});
  }
 }
 render(camera,width,height,obstacles=[]){
  this.overlay.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const points=[];
  for(const [id,n] of this.nodes){
   n.group.style.display='none';
   const p=n.anchor.clone().applyMatrix4(n.mesh.matrixWorld).project(camera);
   const x=(p.x+1)*width/2,y=(1-p.y)*height/2;
   if(p.z>=-1&&p.z<=1&&x>=0&&x<=width&&y>=0&&y<=height)points.push({id,x,y,name:n.name});
  }
  this.placements=layoutSideLabels(points,width,height,obstacles);
  for(const l of this.placements){
   const n=this.nodes.get(l.id),anchor=points.find(p=>p.id===l.id);
   n.group.style.display='';
   for(const [k,v] of Object.entries({x:l.x,y:l.y,width:l.width,height:l.height}))n.rect.setAttribute(k,v);
   n.text.setAttribute('x',l.x+l.width/2);n.text.setAttribute('y',l.y+l.height/2);
   n.text.style.fontSize=width<500?'10.5px':'11px';
   const sx=clamp(anchor.x,l.x,l.x+l.width),sy=clamp(anchor.y,l.y,l.y+l.height);
   const angle=Math.atan2(anchor.y-sy,anchor.x-sx),ux=Math.cos(angle),uy=Math.sin(angle);
   n.line.setAttribute('d',`M${sx},${sy} L${anchor.x},${anchor.y} M${anchor.x-4*ux+2*uy},${anchor.y-4*uy-2*ux} L${anchor.x},${anchor.y} L${anchor.x-4*ux-2*uy},${anchor.y-4*uy+2*ux}`);
  }
 }
 snapshot(){return this.placements.map(({id,name,x,y,width,height})=>({id,name,x,y,width,height}));}
}
