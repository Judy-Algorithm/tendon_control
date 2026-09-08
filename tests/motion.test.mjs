import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL} from '../model-data.js';
import {ATLAS} from '../atlas-data.js';
import {FITTED_ROUTES} from '../route-data.js';
import {buildRig,motionRange,angleAt,rotatePoint,routeInfluence,tendonSegments,sub} from '../motion.js';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} differs from ${b}`);
const length=a=>Math.hypot(...a);
let count=0;
for(const joint of ATLAS.joints)for(const dof of joint.dofs){
 const rig=buildRig(MODEL,joint,dof);
 for(const action of dof.directions){
  count++;
  test(joint.title+' '+action.label,()=>{
   const range=motionRange(dof,action);
   near(length(rig.axis),1);near(length(rig.downstream),1);
   assert.ok(rig.affected.size>0);assert.ok(!rig.affected.has('radius'));assert.ok(!rig.affected.has('ulna'));
   for(const name of rig.affected)assert.ok(MODEL.bones.some(b=>b.name===name));
   assert.notEqual(range.start,range.target,'Every action must visibly move, including zero-degree extension');
   near(angleAt(range,0),range.start);near(angleAt(range,1),range.target);
   let last=range.start;
   for(let i=0;i<=20;i++){
    const a=angleAt(range,i/20);
    assert.ok(a>=dof.range.min-1e-9&&a<=dof.range.max+1e-9);
    assert.ok((a-last)*(range.target-range.start)>=-1e-9);last=a;
   }
   const p=rig.pivot.map((v,i)=>v+[.01,-.025,.008][i]);
   const transformed=rotatePoint(p,rig,range.target||range.start);
   near(length(sub(transformed,rig.pivot)),length(sub(p,rig.pivot)));
   rotatePoint(rig.pivot,rig,range.target).forEach((v,i)=>near(v,rig.pivot[i]));
   assert.ok(length(sub(transformed,p))>1e-6);
   for(const id of action.tendons){
    const meta=ATLAS.tendons.find(t=>t.id===id);
    const points=tendonSegments(MODEL,meta,FITTED_ROUTES[id]).flat();
    assert.ok(points.every(p=>p.every(Number.isFinite)));
    assert.ok(points.some(p=>routeInfluence(p,rig,id)>0.5),id+' needs downstream influence');
    for(const p of points){
     const w=routeInfluence(p,rig,id);assert.ok(w>=0&&w<=1);
     assert.ok(rotatePoint(p,rig,range.target*w).every(Number.isFinite));
    }
   }
  });
 }
}
test('All 46 ROM direction buttons are covered',()=>assert.equal(count,46));
test('MCP movement carries the full finger; PIP and DIP have the correct descendants',()=>{
 const middle=ATLAS.joints.filter(j=>j.part==='中指');
 assert.deepEqual([...buildRig(MODEL,middle[0],middle[0].dofs[0]).affected],['3proxph','3midph','3distph']);
 assert.deepEqual([...buildRig(MODEL,middle[1],middle[1].dofs[0]).affected],['3midph','3distph']);
 assert.deepEqual([...buildRig(MODEL,middle[2],middle[2].dofs[0]).affected],['3distph']);
 const rig=buildRig(MODEL,middle[0],middle[0].dofs[0]);
 assert.equal(routeInfluence([0,-.2,0],rig,'FDP2'),0);
 assert.equal(routeInfluence([0,.1,0],rig,'FDP3'),0);
 assert.equal(routeInfluence([0,-.22,0],rig,'FDP3'),1);
});
test('thumb flexion shortens the flexor route and lengthens the extensor route',()=>{
 for(const dofId of ['thumb_MCP_flex','thumb_IP_flex']){
  const j=ATLAS.joints.find(j=>j.dofs.some(d=>d.id===dofId)),d=j.dofs.find(d=>d.id===dofId);
  const rig=buildRig(MODEL,j,d);
  const routeLength=(id,angle)=>{
   const meta=ATLAS.tendons.find(t=>t.id===id);
   return tendonSegments(MODEL,meta,FITTED_ROUTES[id]).reduce((sum,[p,q])=>sum+length(sub(rotatePoint(p,rig,angle*routeInfluence(p,rig,id)),rotatePoint(q,rig,angle*routeInfluence(q,rig,id)))),0);
  };
  assert.ok(routeLength('FPL',.1)<routeLength('FPL',-.1));
  assert.ok(routeLength('EPL',.1)>routeLength('EPL',-.1));
 }
});
test('Only thumb MCP abduction has a constructed axis',()=>{
 const inferred=ATLAS.joints.flatMap(j=>j.dofs.map(d=>buildRig(MODEL,j,d))).filter(r=>r.inferred);
 assert.deepEqual(inferred.map(r=>r.id),['thumb_MCP_abd']);
});
