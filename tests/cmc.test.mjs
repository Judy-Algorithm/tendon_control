import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL} from '../model-data.js';
import {ATLAS} from '../atlas-data.js';
import {CONTROLS,ULNAR_CMC} from '../control-data.js';
import {createAtlasState} from '../atlas-state.js';
import {FITTED_ROUTES} from '../route-data.js';
import {buildRig,rigForBone,rigForTendon,jointAnchor,rotatePoint,routeInfluence,tendonSegments,motionRange,angleAt,sub,dot,unit} from '../motion.js';
const dof=ULNAR_CMC.dofs[0],rig=buildRig(MODEL,ULNAR_CMC,dof);
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} differs from ${b}`);
const length=p=>Math.hypot(...p);
function points(name){
 const bytes=Buffer.from(MODEL.bones.find(b=>b.name===name).vertices_i16,'base64');
 const vertices=new Int16Array(bytes.buffer,bytes.byteOffset,bytes.length/2);
 return Array.from({length:vertices.length/3},(_,i)=>Array.from(vertices.slice(i*3,i*3+3),v=>v*MODEL.quant));
}
test('the coupled control extends the catalogue without changing measured SHM data',()=>{
 assert.equal(ATLAS.joints.length,16);assert.equal(CONTROLS.joints.length,17);
 assert.equal(ATLAS.joints.flatMap(j=>j.dofs).length,23);
 assert.equal(CONTROLS.joints.flatMap(j=>j.dofs).length,24);
 assert.equal(CONTROLS.joints.flatMap(j=>j.dofs).flatMap(d=>d.directions).length,48);
 assert.equal(CONTROLS.tendons,ATLAS.tendons);
 assert.ok(CONTROLS.joints.indexOf(ULNAR_CMC)<CONTROLS.joints.findIndex(j=>j.part==='无名指'));
 const state=createAtlasState(CONTROLS);state.openJoint(ULNAR_CMC.id);
 for(const action of dof.directions){
  state.selectDirection(dof.id,action.id);assert.equal(state.action(),action);
  assert.deepEqual(state.scope(),[],'No unmeasured CMC muscle associations');
 }
 state.openJoint(null);assert.equal(state.action(),null);
 assert.ok(jointAnchor(MODEL,ULNAR_CMC).every(Number.isFinite));
});
test('CMC flexion pivots at both metacarpal bases and carries each complete finger rigidly',()=>{
 assert.deepEqual([...rig.affected],['4mc','4proxph','4midph','4distph','5mc','5proxph','5midph','5distph']);
 for(const bone of MODEL.bones){
  const component=rigForBone(rig,bone.name);
  if(!rig.affected.has(bone.name)){assert.equal(component,null);continue;}
  assert.ok(component.affected.has(bone.name));
  const rest=points(bone.name),angle=20*component.ratio;
  const posed=rest.map(p=>rotatePoint(p,component,angle));
  rest.forEach((p,i)=>near(length(sub(posed[i],component.pivot)),length(sub(p,component.pivot))));
  for(let i=1;i<rest.length;i++)near(length(sub(posed[i],posed[i-1])),length(sub(rest[i],rest[i-1])));
  rest.forEach(p=>assert.deepEqual(rotatePoint(p,component,0),p));
 }
 for(const c of rig.components){
  near(length(c.axis),1);near(dot(c.axis,c.downstream),0);
  const vertices=points([...c.affected][0]),maxY=Math.max(...vertices.map(p=>p[1]));
  assert.ok(c.pivot[1]>=maxY-.003&&c.pivot[1]<=maxY);
  assert.ok(c.pivot[1]>-.075,'Hinge belongs at wrist, not MCP');
  const distal=c.pivot.map((v,i)=>v+c.downstream[i]*.05);
  const moved=rotatePoint(distal,c,20*c.ratio);
  assert.ok(moved[0]>distal[0]+.008,'Positive flexion moves palmarly');
  const measured=Math.acos(Math.max(-1,Math.min(1,dot(unit(sub(distal,c.pivot)),unit(sub(moved,c.pivot))))))*180/Math.PI;
  near(measured,20*c.ratio);
  rotatePoint(c.pivot,c,20).forEach((v,i)=>near(v,c.pivot[i]));
 }
 assert.notDeepEqual(rig.components[0].pivot,rig.components[1].pivot);
 for(const n of ['4mc','4proxph','4midph','4distph'])assert.equal(rigForBone(rig,n),rig.components[0]);
 for(const n of ['5mc','5proxph','5midph','5distph'])assert.equal(rigForBone(rig,n),rig.components[1]);
});
test('coupled flexion and return are monotone, bounded and return to exact neutral',()=>{
 for(const action of dof.directions){
  const range=motionRange(dof,action);
  assert.equal(range.start,action.id==='positive'?0:20);
  assert.equal(range.target,action.id==='positive'?20:0);
  let previous=range.start;
  for(let i=0;i<=100;i++){
   const angle=angleAt(range,i/100);assert.ok(angle>=0&&angle<=20);
   assert.ok((angle-previous)*(range.target-range.start)>=0);previous=angle;
  }
  near(angleAt(range,1),range.target);
 }
});
test('routing uses each digit’s hinge and leaves other digits and proximal paths fixed',()=>{
 for(const meta of ATLAS.tendons){
  const c=rigForTendon(rig,meta.id);
  const digit4=meta.id.endsWith('4'),digit5=meta.id.endsWith('5')||meta.id==='EDM';
  assert.equal(c,digit4?rig.components[0]:digit5?rig.components[1]:null);
  const rest=tendonSegments(MODEL,meta,FITTED_ROUTES[meta.id]).flat();
  for(const p of rest){
   const w=routeInfluence(p,rig,meta.id);
   assert.ok(w>=0&&w<=1);
   const posed=rotatePoint(p,c,20*(c?.ratio??1)*w);
   assert.ok(posed.every(Number.isFinite));
   if(!c||p[1]>0)assert.deepEqual(posed,p);
  }
  if(c)assert.ok(rest.some(p=>routeInfluence(p,rig,meta.id)>.9));
 }
});
