import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL} from '../model-data.js';
import {ATLAS} from '../atlas-data.js';
import {CONTROLS} from '../control-data.js';
import {OPENSIM_MUSCLES} from '../opensim-muscles.js';
import {buildRig,motionRange,angleAt,rotatePoint,routeInfluence,rigForTendon,tendonSegments,sub} from '../motion.js';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} differs from ${b}`);
const length=a=>Math.hypot(...a);
const muscleById=new Map(OPENSIM_MUSCLES.map(m=>[m.id,m]));
let count=0;
for(const joint of CONTROLS.joints)for(const dof of joint.dofs){
 const rig=buildRig(MODEL,joint,dof);
 for(const action of dof.directions){
  count++;
  test(joint.title+' '+action.label,()=>{
   const range=motionRange(dof,action);
   const components=rig.components??[rig];
   for(const component of components){near(length(component.axis),1);near(length(component.downstream),1);}
   assert.ok(rig.affected.size>0);assert.ok(!rig.affected.has('ulna'));
   if(dof.id!=='forearm_rotation')assert.ok(!rig.affected.has('radius'));
   for(const name of rig.affected)assert.ok(MODEL.bones.some(b=>b.name===name));
   assert.notEqual(range.start,range.target,'Every action must visibly move, including zero-degree extension');
   near(angleAt(range,0),range.start);near(angleAt(range,1),range.target);
   let last=range.start;
   for(let i=0;i<=20;i++){
    const a=angleAt(range,i/20);
    assert.ok(a>=dof.range.min-1e-9&&a<=dof.range.max+1e-9);
    assert.ok((a-last)*(range.target-range.start)>=-1e-9);last=a;
   }
   for(const component of components){
    const p=component.pivot.map((v,i)=>v+[.01,-.025,.008][i]);
    const transformed=rotatePoint(p,component,(range.target||range.start)*(component.ratio??1));
    near(length(sub(transformed,component.pivot)),length(sub(p,component.pivot)));
    rotatePoint(component.pivot,component,range.target).forEach((v,i)=>near(v,component.pivot[i]));
    assert.ok(length(sub(transformed,p))>1e-6);
   }
   for(const id of action.tendons){
    const meta=muscleById.get(id);
    const points=tendonSegments(MODEL,meta,meta.route).flat();
    assert.ok(points.every(p=>p.every(Number.isFinite)));
    assert.ok(points.some(p=>routeInfluence(p,rig,id)>0.4),id+' needs downstream influence');
    const tendonRig=rigForTendon(rig,id);
    for(const p of points){
     const w=routeInfluence(p,rig,id);assert.ok(w>=0&&w<=1);
     assert.ok(rotatePoint(p,tendonRig,range.target*(tendonRig?.ratio??1)*w).every(Number.isFinite));
    }
   }
  });
 }
}
test('All 48 right-model ROM direction buttons are covered',()=>assert.equal(count,48));
test('MCP movement carries the full finger; PIP and DIP have the correct descendants',()=>{
 const middle=ATLAS.joints.filter(j=>j.part==='中指');
 assert.deepEqual([...buildRig(MODEL,middle[0],middle[0].dofs[0]).affected],['3proxph','3midph','3distph']);
 assert.deepEqual([...buildRig(MODEL,middle[1],middle[1].dofs[0]).affected],['3midph','3distph']);
 assert.deepEqual([...buildRig(MODEL,middle[2],middle[2].dofs[0]).affected],['3distph']);
 const rig=buildRig(MODEL,middle[0],middle[0].dofs[0]);
 assert.equal(routeInfluence([0,-.2,0],rig,'FDPI'),0);
 assert.equal(routeInfluence([0,.1,0],rig,'FDPM'),0);
 assert.equal(routeInfluence([0,-.22,0],rig,'FDPM'),1);
});
test('thumb flexion shortens the flexor route and lengthens the extensor route',()=>{
 for(const dofId of ['thumb_MCP_flex','thumb_IP_flex']){
  const j=ATLAS.joints.find(j=>j.dofs.some(d=>d.id===dofId)),d=j.dofs.find(d=>d.id===dofId);
  const rig=buildRig(MODEL,j,d);
  const routeLength=(id,angle)=>{
   const meta=muscleById.get(id);
   return tendonSegments(MODEL,meta,meta.route).reduce((sum,[p,q])=>sum+length(sub(rotatePoint(p,rig,angle*routeInfluence(p,rig,id)),rotatePoint(q,rig,angle*routeInfluence(q,rig,id)))),0);
  };
  assert.ok(routeLength('FPL',.1)<routeLength('FPL',-.1));
  assert.ok(routeLength('EPL',.1)>routeLength('EPL',-.1));
 }
});
test('Only thumb MCP abduction has a constructed axis',()=>{
 const inferred=ATLAS.joints.flatMap(j=>j.dofs.map(d=>buildRig(MODEL,j,d))).filter(r=>r.inferred);
 assert.deepEqual(inferred.map(r=>r.id),['thumb_MCP_abd']);
});
