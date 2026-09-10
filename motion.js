// Geometry-only ROM demonstration. Original angles and muscle associations follow ATLAS.
// Supplemental CMC coupling is illustrative; see control-data.js and docs/cmc-coupling.md.
// This is prescribed kinematics; route blending is not a muscle-force solver.
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const unit=a=>{const n=Math.hypot(...a);if(n<1e-10)throw new Error('Degenerate joint axis');return a.map(v=>v/n);};
const fingers={index:2,middle:3,ring:4,pinky:5};
const thumbTendons=new Set(['EPL','EPB','FPL','APL','OP']);

// Estimate an unsegmented CMC hinge center from the proximal 3 mm of the metacarpal.
// Native model coordinates point proximally along +Y and palmarly along +X.
export function metacarpalBase(model,name){
  const bone=model.bones.find(b=>b.name===name);
  if(!bone)throw new Error(`Missing metacarpal ${name}`);
  const bytes=Uint8Array.from(atob(bone.vertices_i16),c=>c.charCodeAt(0));
  const vertices=new Int16Array(bytes.buffer);
  let maxY=-Infinity;
  for(let i=1;i<vertices.length;i+=3)maxY=Math.max(maxY,vertices[i]*model.quant);
  const sum=[0,0,0];let count=0;
  for(let i=0;i<vertices.length;i+=3)if(vertices[i+1]*model.quant>=maxY-.003){
    for(let j=0;j<3;j++)sum[j]+=vertices[i+j]*model.quant;
    count++;
  }
  return sum.map(v=>v/count);
}
export function jointAnchor(model,joint){
  if(joint.anchorBones){
    const points=joint.anchorBones.map(name=>metacarpalBase(model,name));
    return points[0].map((_,i)=>points.reduce((s,p)=>s+p[i],0)/points.length);
  }
  const native=model.joints.find(j=>j.name===joint.anchor);
  if(!native)throw new Error(`Missing joint ${joint.anchor}`);
  return native.anchor_i16.map(v=>v*model.quant);
}
export function rigForBone(rig,name){
  if(!rig)return null;
  if(rig.components)return rig.components.find(r=>r.affected.has(name))??null;
  return rig.affected.has(name)?rig:null;
}
export function rigForTendon(rig,id){
  if(!rig)return null;
  if(rig.components)return rig.components.find(r=>r.tendonMatches(id))??null;
  return rig.tendonMatches(id)?rig:null;
}
export function buildRig(model,joint,dof){
  if(dof.motion?.type==='coupled-cmc'){
    const components=dof.motion.segments.map(({digit,ratio})=>{
      const pivot=metacarpalBase(model,`${digit}mc`);
      const distal=model.joints.find(j=>j.name===`mcp${digit}_flexion`).anchor_i16.map(v=>v*model.quant);
      const downstream=unit(sub(distal,pivot));
      return {id:`cmc${digit}`,pivot,downstream,axis:unit(cross(downstream,[1,0,0])),ratio,inferred:true,
        affected:new Set([`${digit}mc`,`${digit}proxph`,`${digit}midph`,`${digit}distph`]),
        tendonMatches:id=>id.endsWith(String(digit))||(digit===5&&id==='EDM')};
    });
    return {id:dof.id,components,inferred:true,affected:new Set(components.flatMap(r=>[...r.affected]))};
  }
  const native=name=>{const n=model.joints.find(j=>j.name===name);if(!n)throw new Error(`Missing joint ${name}`);return n;};
  const anchor=n=>n.anchor_i16.map(v=>v*model.quant);
  const [finger,level,kind]=dof.id.split('_');
  let axisJoint,affected,distal,inferred=false;
  if(finger==='wrist'){
    axisJoint=native(level==='abd'?'deviation':'flexion');
    affected=model.bones.filter(b=>!['radius','ulna'].includes(b.name)).map(b=>b.name);
    distal=anchor(native('mcp3_flexion'));
  }else if(finger==='thumb'){
    axisJoint=native(level==='CMC'?(kind==='abd'?'cmc_abduction':'cmc_flexion'):level==='MCP'?'mp_flexion':'ip_flexion');
    affected=level==='CMC'?['1mc','thumbprox','thumbdist']:level==='MCP'?['thumbprox','thumbdist']:['thumbdist'];
    distal=level==='CMC'?anchor(native('mp_flexion')):level==='MCP'?anchor(native('ip_flexion')):[.0185,-.143,.052];
    inferred=level==='MCP'&&kind==='abd';
  }else{
    const n=fingers[finger];if(!n)throw new Error(`Unknown finger ${finger}`);
    const prefix=level==='MCP'?'mcp':level==='PIP'?'pm':'md';
    axisJoint=native(`${prefix}${n}_${kind==='abd'?'abduction':'flexion'}`);
    affected=level==='MCP'?[`${n}proxph`,`${n}midph`,`${n}distph`]:level==='PIP'?[`${n}midph`,`${n}distph`]:[`${n}distph`];
    if(level==='MCP')distal=anchor(native(`pm${n}_flexion`));
    else if(level==='PIP')distal=anchor(native(`md${n}_flexion`));
    else {const p=anchor(axisJoint),q=anchor(native(`pm${n}_flexion`));distal=p.map((v,i)=>2*v-q[i]);}
  }
  const pivot=anchor(axisJoint),downstream=unit(sub(distal,pivot));
  // The source thumb hinge axes use the opposite sign from the ATLAS action convention.
  const nativeAxis=inferred?unit(cross(axisJoint.axis,downstream)):unit(axisJoint.axis);
  const axis=finger==='thumb'?nativeAxis.map(v=>-v):nativeAxis;
  return {id:dof.id,pivot,axis,downstream,affected:new Set(affected),inferred,
    tendonMatches:id=>finger==='wrist'||(finger==='thumb'?thumbTendons.has(id):id.endsWith(String(fingers[finger]))||(finger==='index'&&id==='EIP')||(finger==='pinky'&&id==='EDM'))};
}

export function rotatePoint(point,rig,degrees){
  if(!rig||Math.abs(degrees)<1e-10)return [...point];
  const p=sub(point,rig.pivot),angle=degrees*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),v=cross(rig.axis,p),d=dot(rig.axis,p);
  return p.map((x,i)=>rig.pivot[i]+x*c+v[i]*s+rig.axis[i]*d*(1-c));
}

export function routeInfluence(point,rig,tendonId){
  rig=rigForTendon(rig,tendonId);
  if(!rig)return 0;
  const s=dot(sub(point,rig.pivot),rig.downstream);
  const t=Math.max(0,Math.min(1,(s+.004)/.008));
  return t*t*(3-2*t);
}

export function resampleRoute(points){
  const out=[[...points[0]]];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],step=(a[1]>0&&b[1]>0)?.012:.0025;
    const count=Math.max(1,Math.ceil(Math.hypot(...sub(b,a))/step));
    for(let k=1;k<=count;k++)out.push(a.map((v,j)=>v+(b[j]-v)*k/count));
  }
  return out;
}

export function tendonSegments(model,meta,fitted){
  const raw=model.tendon_segments_i16[meta.modelIndex].map(s=>s.map(v=>v*model.quant));
  const routes=fitted?[fitted]:raw.map(s=>[s.slice(0,3),s.slice(3,6)]);
  return routes.flatMap(route=>{
    const points=resampleRoute(route);
    return points.slice(1).map((p,i)=>[points[i],p]);
  });
}

export function motionRange(dof,direction){
  const target=direction.id==='positive'?dof.range.max:dof.range.min;
  // Zero-range extension needs a flexed starting pose, then moves monotonically to 0.
  const fraction=dof.motion?.type==='coupled-cmc'?1:.65;
  const start=Math.abs(target)<1e-8?(direction.id==='negative'?dof.range.max:dof.range.min)*fraction:0;
  return {start,target,prepositioned:Math.abs(start)>1e-8};
}

export function angleAt(range,progress){
  const t=Math.max(0,Math.min(1,progress)),smooth=t*t*(3-2*t);
  return range.start+(range.target-range.start)*smooth;
}
