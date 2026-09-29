import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.window=globalThis;
const {pathLength,inspectNativeFrame,inspectNativeOverlay,composeNativeTransform,NativeScene,activationColor,nativeFrameValid,markerResiduals,nativeExternalLoad}=await import('../explainer/native-v2/native-scene.js');
const {manoDiagramPoints}=await import('../explainer/native-v2/mano.js');
const load=name=>JSON.parse(fs.readFileSync(new URL(`../explainer/native-v2/data/${name}`,import.meta.url)));

test('native adapter preserves every muscle channel and reports invalid paths, not zero lengths',()=>{
 const run={muscleNames:['a','b','c'],frames:[{paths:[[[0,0,0],[.03,.04,0]],null,[[0,0,0],[NaN,0,0]]]}]};
 const info=inspectNativeFrame(run);assert.equal(info.paths.length,3);assert.deepEqual(info.missingPathIndices,[1,2]);assert.deepEqual(info.sampledLengths_m,[.05,null,null]);
 assert.equal(pathLength([[0,0,0],[Infinity,0,0]]),null);
});
test('external load uses the native body transform once and preserves Ground force sign',()=>{
 const run={manifest:{engine:'OpenSim',effective:{loadBody:'finger',loadPointBody_m:[.01,.02,.03],loadVectorGround_N:[-3,4,0]}}};
 const frame={bodyTransforms:{finger:[[0,-1,0,1],[1,0,0,2],[0,0,1,3],[0,0,0,1]]}};
 const before=JSON.stringify({run,frame}),load=nativeExternalLoad(run,frame);
 assert.deepEqual(load.pointGround_m,[.98,2.01,3.03]);assert.deepEqual(load.forceGround_N,[-3,4,0]);assert.deepEqual(load.directionGround,[-.6,.8,0]);assert.equal(load.magnitude_N,5);assert.equal(JSON.stringify({run,frame}),before);
 assert.equal(nativeExternalLoad({...run,manifest:{...run.manifest,engine:'MuJoCo'}},frame),null);
 assert.equal(nativeExternalLoad(run,{bodyTransforms:{}}),null);
 for(const key of ['loadBody','loadPointBody_m','loadVectorGround_N']){const missing=structuredClone(run);delete missing.manifest.effective[key];assert.equal(nativeExternalLoad(missing,frame),null);}
 const zero=structuredClone(run);zero.manifest.effective.loadVectorGround_N=[0,0,0];assert.equal(nativeExternalLoad(zero,frame),null);
});
test('canonical native external-load glyph follows each body pose without invented contact surfaces',()=>{
 const scene=nativeSceneFixture(),run=load('opensim-canonical-finger-overload.json');scene.setRun(run);
 for(const i of [0,25,50]){scene.setFrame(i,13,0);const e=run.manifest.effective,m=run.frames[i].bodyTransforms[e.loadBody].flat(),expected=new THREE.Vector3(...e.loadPointBody_m).applyMatrix4(new THREE.Matrix4().set(...m));assert.ok(scene.forceOrigin.position.distanceTo(expected)<1e-12);assert.ok(scene.forceArrow.position.distanceTo(expected)<1e-12);assert.deepEqual(scene.externalLoad.forceGround_N,e.loadVectorGround_N);assert.match(scene.caption.textContent,/输入外力 20.00 N/);}
 scene.setRun(load('opensim-canonical-finger-baseline.json'));assert.equal(scene.forceArrow.visible,false);assert.equal(scene.forceOrigin.visible,false);assert.equal(scene.externalLoad,null);
 scene.setRun(load('myohand-run-pulse.json'));assert.equal(scene.forceArrow.visible,false);assert.equal(scene.externalLoad,null);for(const r of scene.resources)r.dispose();
});
test('all native MyoHand sampled paths agree with exported native lengths within export tolerance',()=>{
 const run=load('myohand-run-pulse.json'),before=JSON.stringify(run);let max=0;
 assert.equal(run.muscleNames.length,39);
 for(let i=0;i<run.frames.length;i++){const info=inspectNativeFrame(run,i);assert.deepEqual(info.missingPathIndices,[]);info.sampledLengths_m.forEach((l,j)=>{max=Math.max(max,Math.abs(l-run.frames[i].pathLength_m[j]));});}
 assert.ok(max<2e-6,`polyline-native max error ${max}m`);assert.equal(JSON.stringify(run),before);
});
test('OpenSim paths retain all 43 channels and reconcile native curved-length versus sampled-polyline error',()=>{
 const run=load('opensim-finger-baseline.json');assert.equal(run.muscleNames.length,43);
 for(let i=0;i<run.frames.length;i++){const info=inspectNativeFrame(run,i);assert.deepEqual(info.missingPathIndices,[]);info.sampledLengths_m.forEach((l,j)=>{
  const error=Math.abs(l-run.frames[i].pathLength_m[j]),declared=run.frames[i].pathPolylineApproximationError_m[j];
  assert.ok(Number.isFinite(declared));assert.ok(Math.abs(error-declared)<1e-10);
  // Native exporter samples the actual wrapping arc; this checks its declared
  // geometric approximation, not a false claim that chords equal arc length.
 });}
});
test('native body and geom wxyz composition maps local vertices correctly',()=>{
 const r=Math.sqrt(.5),body=composeNativeTransform([1,2,3],[r,0,0,r]);
 const local=composeNativeTransform([.1,0,0],[1,0,0,0]);
 const point=new THREE.Vector3(.2,0,0).applyMatrix4(body.clone().multiply(local));
 assert.ok(point.distanceTo(new THREE.Vector3(1,2.3,3))<1e-12);
});
test('native model geoms reference real compiled meshes and valid body transforms',()=>{
 const model=load('myohand-model.json'),run=load('myohand-run-pulse.json'),meshes=new Map(model.meshes.map(m=>[m.id,m]));let count=0;
 for(const g of model.geoms){if(g.type!=='mjGEOM_MESH')continue;count++;assert.ok(meshes.has(g.meshId));for(const frame of [run.frames[0],run.frames.at(-1)]){assert.equal(frame.bodyPos[g.bodyId].length,3);assert.equal(frame.bodyQuat[g.bodyId].length,4);}}
 assert.equal(count,29);
});
test('MANO explanatory shape and pose remain separate, with 16 joints plus five distinct tips',()=>{
 const base=manoDiagramPoints(),shape=manoDiagramPoints({shape:1}),pose=manoDiagramPoints({pose:60});
 assert.equal(base.points.length,21);assert.equal(base.jointIndices.length,16);assert.equal(base.tipIndices.length,5);
 assert.equal(new Set([...base.jointIndices,...base.tipIndices]).size,21);
 assert.notDeepEqual(shape.points,base.points);assert.notDeepEqual(pose.points,base.points);
 for(const f of base.fingers)for(let j=1;j<4;j++){
  const dist=(d,a,b)=>Math.hypot(...d.points[a].map((v,k)=>v-d.points[b][k]));
  assert.ok(Math.abs(dist(base,f[j],f[j-1])-dist(pose,f[j],f[j-1]))<1e-10);
 }
});
test('native replay never imports illustrative atlas geometry or performs pose synthesis',()=>{
 const source=fs.readFileSync(new URL('../explainer/native-v2/native-scene.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/model-data|route-data|buildRig|rotatePoint/);
 assert.equal(typeof NativeScene.prototype.setFrame,'function');
});

test('activation mapping is globally fixed and invalid frames cannot appear as valid activation',()=>{
 assert.equal(activationColor(0),0x3e7785);assert.equal(activationColor(.5),0xae85d5);assert.equal(activationColor(1),0xfa7969);
 for(const value of [null,undefined,NaN,-.1,1.1])assert.equal(activationColor(value),0x81878d);
 assert.equal(nativeFrameValid({valid:false}),false);assert.equal(nativeFrameValid({nativeSolverFailed:true}),false);
 assert.equal(activationColor(.8,false),0x81878d);
});

function nativeSceneFixture(){
 const scene=Object.create(NativeScene.prototype);scene.renderer={};scene.resources=new Set();scene.caption={textContent:''};
 scene.pathGroup=new THREE.Group();scene.bodyGroup=new THREE.Group();scene.wrapGroup=new THREE.Group();scene.scene=new THREE.Scene();scene.scene.add(scene.pathGroup,scene.bodyGroup,scene.wrapGroup);
 scene.camera=new THREE.PerspectiveCamera(35,1.5,.001,100);scene.controls={target:new THREE.Vector3(),update(){}};scene.render=()=>{};return scene;
}
test('native IK marker residuals use actual world points with no display exaggeration',()=>{
 const sample={observedMarkers_m:[[0,0,0],[0,0,0]],fittedMarkers_m:[[3e-6,4e-6,0],[0,0,0]]};
 const result=markerResiduals(sample);assert.ok(Math.abs(result.rms_m-5e-6/Math.sqrt(2))<1e-15);assert.ok(Math.abs(result.max_m-5e-6)<1e-15);
 assert.equal(markerResiduals({}).rms_m,null);assert.equal(markerResiduals({observedMarkers_m:[[0,0,0]]}).missingCount,1);
 const run=load('opensim-scale-ik-roundtrip.json');for(const frame of run.frames){const d=markerResiduals(frame);assert.equal(d.pairs.length,90);assert.ok(Number.isFinite(d.rms_m));}
});
test('OpenSim native geometry, hand framing, activation paths and available wrapping surfaces agree with frame metadata',()=>{
 const scene=nativeSceneFixture(),model={...load('opensim-model.json'),...load('opensim-geometry.json')},run=load('opensim-finger-baseline.json');
 scene.setModel(model);scene.setRun(run);scene.setWrappingVisible(true);
 assert.equal(scene.paths.length,43);assert.ok(scene.meshes.length>20);
 const active=run.frames[0].activeWrapNames;
 const supported=model.wrapObjects.filter(w=>w.active!==false&&['WrapEllipsoid','WrapCylinder'].includes(w.class)&&active.includes(w.id));
 assert.deepEqual(scene.wraps.filter(w=>w.visible).map(w=>w.userData.geom.id).sort(),supported.map(w=>w.id).sort());
 scene.paths.forEach((line,i)=>assert.equal(line.material.color.getHex(),activationColor(run.frames[0].activation[i])));
 const handTarget=scene.controls.target.clone();scene.setView('all');assert.ok(scene.controls.target.distanceTo(handTarget)>.02);
 const failed=structuredClone(run);failed.frames[0].valid=false;scene.setRun(failed);
 assert.match(scene.caption.textContent,/此帧求解失败/);scene.paths.forEach(line=>assert.equal(line.material.color.getHex(),0x81878d));
 for(const r of scene.resources)r.dispose();
});

test('native overlay requires identical model and channel frames and never interpolates or clamps time',()=>{
 const current=load('myohand-run-pulse-force125.json'),baseline=load('myohand-run-pulse.json');
 const info=inspectNativeOverlay(current,baseline,17);assert.equal(info.index,17);assert.equal(info.timeDifference_s,0);assert.equal(info.paths[0],baseline.frames[17].paths[0]);
 const explicit=inspectNativeOverlay(current,baseline,17,0);assert.equal(explicit.index,0);assert.equal(explicit.explicitFrame,true);
 const later=structuredClone(current);later.frames[0].time_s=10;assert.equal(inspectNativeOverlay(later,baseline,0).available,false);
 assert.throws(()=>inspectNativeOverlay(current,baseline,0,999));
 for(const change of [r=>r.manifest.modelHash='other',r=>r.muscleNames.reverse(),r=>r.coordinateNames.reverse()]){const wrong=structuredClone(baseline);change(wrong);assert.throws(()=>inspectNativeOverlay(current,wrong));}
});
test('overlay draws exact baseline world paths while retaining current colors, failure masks and immutable inputs',()=>{
 const scene=nativeSceneFixture(),current=load('myohand-run-pulse-force125.json'),baseline=load('myohand-run-pulse.json'),before=JSON.stringify([current,baseline]);
 scene.setRun(current);const resourceCount=scene.resources.size;scene.setOverlayRun(baseline);scene.setFrame(20,11,8);
 assert.equal(scene.overlayPaths.length,39);assert.equal(scene.overlayInfo.index,20);
 scene.overlayPaths.forEach((line,i)=>{assert.equal(line.material.color.getHex(),0x74e4cf);const a=line.geometry.getAttribute('position');baseline.frames[20].paths[i].forEach((p,j)=>p.forEach((v,k)=>assert.ok(Math.abs(a.array[j*3+k]-v)<1e-7)));});
 scene.paths.forEach((line,i)=>assert.equal(line.material.color.getHex(),activationColor(current.frames[20].activation[i])));
 assert.equal(JSON.stringify([current,baseline]),before);
 const failed=structuredClone(baseline);failed.manifest.qc.numericPassed=false;scene.setOverlayRun(failed);scene.overlayPaths.forEach(line=>assert.equal(line.material.color.getHex(),0x81878d));assert.match(scene.caption.textContent,/基线帧失败/);
 scene.setOverlayRun(null);assert.equal(scene.overlayGroup.children.length,0);assert.equal(scene.overlayRun,null);assert.equal(scene.resources.size,resourceCount);
 scene.setOverlayRun(baseline);scene.setRun(current);assert.equal(scene.overlayRun,null);assert.equal(scene.overlayGroup.children.length,0);
 for(const r of scene.resources)r.dispose();
});
