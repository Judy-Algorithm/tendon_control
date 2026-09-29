import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMano,manoForward,rotationVector} from '../explainer/native-v2/mano-math.js';
// Algebra-only synthetic rig, NOT MANO data or a hand mesh.
function fixture(){
 const m={schema:'mano-local-lbs-v1',vertexCount:778,jointCount:16,betaCount:10,units:'m',hand:'right',vTemplate:Array(2334).fill(0),shapeDirs:Array(23340).fill(0),poseDirs:Array(315090).fill(0),regressor:Array(12448).fill(0),weights:Array(12448).fill(0),parents:[-1,...Array(15).fill(0)],meanPose:Array(45).fill(0),tips:[16,17,18,19,20],order21:Array.from({length:21},(_,i)=>i),faces:Array(4614).fill(0)};
 for(let v=0;v<778;v++){m.vTemplate[v*3]=v*.0001;m.vTemplate[v*3+1]=v*.00003;m.weights[v*16]=1;m.shapeDirs[v*30]=.001;}
 for(let j=0;j<16;j++)m.regressor[j*778+j]=1;
 return m;
}
test('local model validation rejects broken shape, units, topology and nonfinite values',()=>{
 const m=fixture();validateMano(m);
 for(const change of [x=>x.units='mm',x=>x.parents[3]=4,x=>x.weights[0]=2,x=>x.faces[0]=778,x=>x.shapeDirs[0]=NaN,x=>x.tips[0]=-1,x=>x.order21[1]=0]){const n=structuredClone(m);change(n);assert.throws(()=>validateMano(n));}
});
test('LBS zero-pose identity and independent shape change',()=>{
 const m=fixture(),a=manoForward(m),b=manoForward(m,[1,...Array(9).fill(0)]);
 assert.equal(a.keypoints.length,21);assert.equal(a.vertices.length,2334);
 for(let i=0;i<2334;i++){assert.ok(Math.abs(a.vertices[i]-m.vTemplate[i])<1e-12);assert.ok(Math.abs(b.vertices[i]-a.vertices[i]-(i%3===0?.001:0))<1e-12);}
});
test('axis-angle global rotation matches a rigid transform and preserves input',()=>{
 const m=fixture(),before=JSON.stringify(m),pose=Array(48).fill(0);pose[2]=Math.PI/2;const out=manoForward(m,Array(10).fill(0),pose);
 for(let i=0;i<778;i++){assert.ok(Math.abs(out.vertices[i*3]+m.vTemplate[i*3+1])<1e-12);assert.ok(Math.abs(out.vertices[i*3+1]-m.vTemplate[i*3])<1e-12);}
 assert.equal(JSON.stringify(m),before);assert.deepEqual(rotationVector([0,0,0]),[1,0,0,0,1,0,0,0,1]);assert.throws(()=>manoForward(m,[NaN],[]));
});
