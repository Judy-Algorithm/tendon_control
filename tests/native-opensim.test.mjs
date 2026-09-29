import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../explainer/native-v2/data');
let aliases={};
const read=name=>JSON.parse(fs.readFileSync(path.join(base,aliases[name]||name),'utf8'));
const idx=read('opensim-index.json');
aliases=idx.fileMap||{};

test('OpenSim is the full 43-muscle native model, not the MyoHand namespace',()=>{
  const m=read(idx.modelFile);
  assert.equal(m.counts.muscles,43);assert.equal(m.counts.coordinates,26);assert.equal(m.counts.independentCoordinates,23);
  assert.equal(m.muscles.length,43);assert.equal(m.constraints.length,3);assert.equal(m.bodies.length,30);
  assert.equal(m.wrapObjects.length,37);assert.ok(m.configurationRegistry.staticOptimizationDefaults.length>0);
  for(const b of m.bodies){assert.ok(b.mass_kg>0);assert.equal(b.inertiaMoments_kg_m2.length,3);}
});

test('original 48-action denominator remains separate from native new demonstrations',()=>{
  const c=read(idx.coverageFile||'opensim-coverage.json');assert.equal(c.atlasActions,48);assert.equal(c.coverage.length,48);
  assert.equal(c.coverage.filter(x=>x.status==='mapped').length,14);
  assert.equal(c.coverage.filter(x=>x.status==='unsupported').length,26);
  assert.equal(c.coverage.filter(x=>x.status==='not_yet_verified').length,8);
  assert.equal(new Set(c.coverage.map(x=>x.actionId)).size,48);
  for(const x of c.coverage.filter(x=>x.status==='mapped')){
    assert.equal(x.mappedTrajectory.times_s.length,121);assert.equal(x.mappedTrajectory.times_s.at(-1),2.4);
    assert.ok(['solved','partial','failed','timeout'].includes(x.runStatus));
    if(x.runStatus==='timeout'){
      assert.equal(x.runFile,undefined);assert.equal(x.completedFrames,0);assert.equal(x.expectedFrames,121);
      const timeout=read(x.attemptEvidenceFile);assert.equal(timeout.status,'TIMEOUT');assert.equal(timeout.wallTimeLimit_s,900);assert.ok(timeout.elapsed_s>=900);
    }else assert.ok(x.runFile);
  }
  for(const x of c.coverage.filter(x=>x.status!=='mapped'))assert.equal(x.runStatus,'not_run');
});

test('chirality-correct original clips preserve timing and amplitude; old mappings are archived',()=>{
  const c=read(idx.coverageFile),catalog=read('action-catalog.json');assert.equal(c.mappingVersion,'opposite-hand-axial-v2');
  assert.ok(idx.supersededAtlasIndexFile);const archived=read(idx.supersededAtlasIndexFile);
  assert.equal(archived.runs.filter(r=>r.origin==='original_atlas_angle_mapping').length,5);
  const mapped=idx.runs.filter(r=>r.origin==='original_atlas_angle_mapping');
  assert.equal(mapped.length+c.coverage.filter(r=>r.status==='mapped'&&!r.runFile).length,14);
  for(const e of mapped){
    assert.equal(e.mappingVersion,'opposite-hand-axial-v2');assert.ok(!archived.runs.some(r=>r.file===e.file));
    const d=read(e.file),a=catalog.actions.find(x=>x.id===e.actionId),audit=c.coverage.find(x=>x.actionId===e.actionId);
    assert.deepEqual(d.manifest.request.trajectory.times_s,a.times_s);assert.equal(d.frames.length,121);
    const q=d.manifest.request.trajectory.q.map(x=>x[0]),offset=q[0]-audit.proposedSign*a.angles_deg[0]*Math.PI/180;
    q.forEach((x,i)=>assert.ok(Math.abs(x-offset-audit.proposedSign*a.angles_deg[i]*Math.PI/180)<1e-12));
  }
});

test('all OpenSim replay force/torque rows have explicit channel dimensions and reconciliation',()=>{
  for(const entry of idx.runs){
    const d=read(entry.file);assert.equal(d.manifest.engine,'OpenSim');assert.equal(d.muscleNames.length,43);assert.equal(d.coordinateNames.length,23);
    assert.equal(d.frames.filter(x=>x.valid).length,d.manifest.qc.acceptedFrames);
    for(const f of d.frames){
      assert.equal(f.activation.length,43);assert.equal(f.paths.length,43);assert.equal(f.torque_Nm.length,43);
      for(const row of f.torque_Nm){assert.equal(row.length,23);assert.ok(row.every(Number.isFinite));}
      for(let j=0;j<23;j++){
        const sum=f.torque_Nm.reduce((s,row)=>s+row[j],0);
        assert.ok(Math.abs(sum-f.qfrcActuator_Nm[j])<1e-9);
        assert.ok(Math.abs(f.requiredTorque_Nm[j]-sum-f.reserveTorque_Nm[j]-f.balanceResidual_Nm[j])<1e-9);
      }
      if(f.valid){assert.equal(f.nativeSolverFailed,false);assert.ok(Math.max(...f.balanceResidual_Nm.map(Math.abs))<1e-5);assert.ok(f.activation.every(a=>a>=.01-1e-6&&a<=1+1e-6));}
    }
  }
});

test('native parameter changes produce new activations while preserving requested motion',()=>{
  const b=read('opensim-finger-baseline.json');
  for(const file of ['opensim-finger-fmax110.json','opensim-finger-lopt105.json','opensim-finger-lts105.json']){
    const d=read(file);let da=0,dq=0;
    d.frames.forEach((f,i)=>{f.activation.forEach((a,j)=>{da=Math.max(da,Math.abs(a-b.frames[i].activation[j]));});f.q.forEach((q,j)=>{dq=Math.max(dq,Math.abs(q-b.frames[i].q[j]));});});
    assert.ok(da>1e-8);assert.ok(dq<1e-7);assert.notEqual(d.manifest.runtimeModelHash,b.manifest.runtimeModelHash);
  }
});

test('failed native frames and nonzero reported acceleration constraints are retained',()=>{
  const d=read('opensim-finger-overload.json');assert.ok(d.frames.some(x=>!x.valid));assert.equal(d.manifest.status,'partial');
  assert.ok(d.manifest.qc.nativeReportedAccelerationConstraintViolation.some(x=>x>1e-3));
  assert.match(d.manifest.qc.interpretation,/not zero native acceleration/);
});

test('Scale/IK selfcheck has separate geometry and real marker observations/fits',()=>{
  const e=idx.runs.find(x=>x.file===(aliases['opensim-scale-ik-roundtrip.json']||'opensim-scale-ik-roundtrip.json'));assert.ok(e);assert.notEqual(e.modelFile,idx.modelFile);assert.notEqual(e.geometryFile,idx.geometryFile);
  const d=read(e.file);assert.match(d.manifest.stages.scale,/Native Model.scale/);assert.match(d.manifest.stages.ik,/InverseKinematicsTool/);
  assert.equal(d.markerNames.length,90);assert.ok(d.manifest.scaleIKEvidence.markerMax_m<1e-4);
  for(const f of d.frames){assert.equal(f.observedMarkers_m.length,90);assert.equal(f.fittedMarkers_m.length,90);}
});
