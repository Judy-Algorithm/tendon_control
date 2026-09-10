import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL} from '../model-data.js';
import {CONTROLS as ATLAS} from '../control-data.js';
import {THREE} from '../scripts/surface-geometry.mjs';
import {BoneLabels,BONE_NAMES,layoutBoneLabels,bonesForPart} from '../bone-labels.js';
import {buildRig,rigForBone} from '../motion.js';

const overlap=(a,b)=>a.left<b.left+b.w-.001&&a.left+a.w>b.left+.001&&a.top<b.top+b.h-.001&&a.top+a.h>b.top+.001;
function assertClear(labels,w,h){
 for(const l of labels){
  assert.ok([l.left,l.top,l.w,l.h,l.anchorX,l.anchorY].every(Number.isFinite));
  assert.ok(l.left>=0&&l.left+l.w<=w+.001&&l.top>=0&&l.top+l.h<=h+.001,l.id+' outside stage');
 }
 for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)assert.ok(!overlap(labels[i],labels[j]),labels[i].id+' overlaps '+labels[j].id);
 const gutter=w<500?87:101;
 for(const l of labels)assert.ok(l.left>gutter&&l.left+l.w<w-gutter,'Bone name overlaps a tendon-name gutter');
}

test('every actual mesh has a distinct Chinese name, with exactly two thumb phalanges',()=>{
 assert.deepEqual(Object.keys(BONE_NAMES).sort(),MODEL.bones.map(b=>b.name).sort());
 assert.equal(new Set(Object.values(BONE_NAMES).map(b=>b.name)).size,29);
 assert.equal(Object.keys(BONE_NAMES).filter(id=>id.startsWith('thumb')).length,2);
 for(const n of Object.values(BONE_NAMES))assert.match(n.name,/[\u4e00-\u9fff]/);
});

test('even all 29 anchors clustered together remain legible on narrow and wide displays',()=>{
 for(const [w,h] of [[320,280],[390,320],[420,300],[600,350],[1000,600]]){
  const points=Object.entries(BONE_NAMES).map(([id,n],i)=>({id,label:n.name,short:n.short,x:w/2+(i%3-1)*2,y:h/2+(i%4-2)*2}));
  const result=layoutBoneLabels(points,w,h);
  assert.equal(result.length,29);assertClear(result,w,h);
 }
});

class SvgNode {
 constructor(){this.style={};this.attributes={};this.children=[];}
 setAttribute(k,v){this.attributes[k]=v;}
 append(...nodes){this.children.push(...nodes);}
}
globalThis.document={createElementNS:()=>new SvgNode()};
const meshes=MODEL.bones.map(b=>{
 const bytes=Buffer.from(b.vertices_i16,'base64'),q=new Int16Array(bytes.buffer,bytes.byteOffset,bytes.length/2);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(Float32Array.from(q,v=>v*MODEL.quant),3));
 const mesh=new THREE.Mesh(geo);mesh.name=b.name;mesh.updateMatrixWorld(true);return mesh;
});
const views={oblique:[.37,-.22,.24],palm:[.45,-.10,.015],side:[.05,-.10,.45]};
function camera(view,w,h){
 const c=new THREE.PerspectiveCamera(36,w/h,.002,5);c.up.set(0,-1,0);c.position.set(...views[view]);c.lookAt(0,-.10,0);
 c.updateMatrixWorld(true);return c;
}
function setPose(rig,degrees){
 for(const mesh of meshes){
  const component=rigForBone(rig,mesh.name);
  if(component){
   const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...component.axis),degrees*(component.ratio??1)*Math.PI/180);
   const pivot=new THREE.Vector3(...component.pivot);mesh.quaternion.copy(q);mesh.position.copy(pivot).sub(pivot.clone().applyQuaternion(q));
  }else{mesh.quaternion.identity();mesh.position.set(0,0,0);}
  mesh.updateMatrixWorld(true);
 }
}
test('opening, switching, and closing joints show only the current part and clear old names',()=>{
 const labels=new BoneLabels(THREE,new SvgNode(),meshes),c=camera('oblique',1000,650);
 setPose(null,0);
 const expected={
  尺侧手掌:['4mc','4proxph','4midph','4distph','5mc','5proxph','5midph','5distph'],
  拇指:['1mc','thumbprox','thumbdist'],
  食指:['2mc','2proxph','2midph','2distph'],
  中指:['3mc','3proxph','3midph','3distph'],
  无名指:['4mc','4proxph','4midph','4distph'],
  小指:['5mc','5proxph','5midph','5distph'],
  手腕:['ulna','radius','lunate','scaphoid','pisiform','triquetrum','capitate','trapezium','trapezoid','hamate']
 };
 // Exercise every accordion entry, including MCP/PIP/DIP of the same finger.
 for(const part of [null,...ATLAS.joints.map(j=>j.part),null,'中指',null]){
  labels.render(c,1000,650,part);
  const ids=expected[part]??[];
  assert.deepEqual(labels.snapshot().map(l=>l.id).sort(),[...ids].sort());
  for(const [id,n] of labels.nodes)assert.equal(n.group.style.display==='none',!ids.includes(id),id+' stale label');
 }
});
test('all standard viewpoints and ROM endpoints keep on-screen names collision-free',()=>{
 for(const [w,h] of [[320,280],[390,320],[640,470],[1000,650]])for(const view of Object.keys(views)){
  const labels=new BoneLabels(THREE,new SvgNode(),meshes),c=camera(view,w,h);
  setPose(null,0);labels.render(c,w,h,'中指');assert.ok(labels.placements.length>0);assertClear(labels.placements,w,h);
  for(const joint of ATLAS.joints)for(const dof of joint.dofs)for(const direction of dof.directions){
   const rig=buildRig(MODEL,joint,dof);setPose(rig,direction.id==='positive'?dof.range.max:dof.range.min);
   labels.render(c,w,h,joint.part);assertClear(labels.placements,w,h);
   assert.ok(labels.placements.every(l=>bonesForPart(joint.part).includes(l.id)));
  }
 }
 setPose(null,0);
});

test('selected finger leaders follow motion while its metacarpal anchor stays fixed',()=>{
 const labels=new BoneLabels(THREE,new SvgNode(),meshes),c=camera('oblique',1000,650);
 setPose(null,0);labels.render(c,1000,650,'中指');
 const before=new Map(labels.snapshot().map(l=>[l.id,l.anchor]));
 const joint=ATLAS.joints.find(j=>j.id==='joint_bone11'),rig=buildRig(MODEL,joint,joint.dofs[0]);
 setPose(rig,60);labels.render(c,1000,650,'中指');
 const after=new Map(labels.snapshot().map(l=>[l.id,l.anchor]));
 assert.ok(Math.hypot(...after.get('3proxph').map((v,i)=>v-before.get('3proxph')[i]))>1);
 assert.deepEqual(after.get('3mc'),before.get('3mc'));
 setPose(null,0);
});
