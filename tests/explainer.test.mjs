import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SOURCES, OPENSIM_STEPS, MYOHAND_STEPS, MUSCLE_MODELS, GLOSSARY} from '../explainer/content.js';
import {torqueDemand, solveAllocation, activationPulse, parseRoute, polylinePath} from '../explainer/math.js';
import {computeMuscleExample, MUSCLE_LAB_DEFAULTS} from '../explainer/muscle-lab.js';
import {ATLAS} from '../atlas-data.js';
import {MODEL} from '../model-data.js';
import {OPENSIM_MUSCLES} from '../opensim-muscles.js';

const fixture = JSON.parse(fs.readFileSync(new URL('../explainer/fixtures/myohand-native.json', import.meta.url)));
const close = (a,b,tol=1e-10) => assert.ok(Math.abs(a-b)<=tol, `${a} differs from ${b} by ${Math.abs(a-b)}`);
const unique = values => assert.equal(new Set(values).size,values.length);
function finiteTree(value,path='value') {
  if(typeof value==='number') assert.ok(Number.isFinite(value),path);
  else if(Array.isArray(value)) value.forEach((v,i)=>finiteTree(v,`${path}[${i}]`));
  else if(value && typeof value==='object') Object.entries(value).forEach(([k,v])=>finiteTree(v,`${path}.${k}`));
}

test('explainer curricula have complete, unique step IDs and concise default copy',()=>{
  assert.deepEqual(OPENSIM_STEPS.map(s=>s.id),['overview','scale','ik','id','so','moco']);
  assert.deepEqual(MYOHAND_STEPS.map(s=>s.id),['overview','control','activation','geometry','force','transmission','dynamics','integration']);
  for(const curriculum of [OPENSIM_STEPS,MYOHAND_STEPS]){
    unique(curriculum.map(s=>s.id));
    for(const step of curriculum){
      assert.ok(step.title && step.question && step.summary);
      assert.ok(step.summary.length<=100,step.id);
      assert.ok(step.inputs.length && step.outputs.length && step.details.length && step.sourceIds.length);
      for(const detail of step.details) assert.ok(detail.title && detail.text);
    }
  }
});

test('all steps, muscle classes and glossary entries resolve to official HTTPS source records',()=>{
  const allowed = new Set(['opensimconfluence.atlassian.net','opensim-org.github.io','github.com','myosuite.readthedocs.io','mujoco.readthedocs.io']);
  for(const item of [...OPENSIM_STEPS,...MYOHAND_STEPS,...MUSCLE_MODELS,...GLOSSARY]){
    assert.ok(item.sourceIds.length);
    for(const id of item.sourceIds) assert.ok(SOURCES[id],`Unresolved source: ${id}`);
  }
  for(const [id,s] of Object.entries(SOURCES)){
    const url=new URL(s.url);
    assert.equal(url.protocol,'https:',id);
    assert.ok(allowed.has(url.hostname),id);
    if(url.hostname==='github.com') assert.match(url.pathname,/^\/opensim-org\/opensim-core\//);
    assert.ok(s.title && s.section && s.note,id);
  }
  assert.match(SOURCES['mujoco-muscle'].url,/\/3\.3\.0\/modeling\.html#muscles$/);
  unique(GLOSSARY.map(g=>g.key));
  unique(MUSCLE_MODELS.map(m=>m.id));
  assert.equal(MUSCLE_MODELS.length,3);
  assert.ok(GLOSSARY.length>=20);
});

test('visible scientific copy explicitly distinguishes tool assumptions and quantities',()=>{
  const step=id=>OPENSIM_STEPS.find(s=>s.id===id).details.map(d=>d.text).join(' ');
  assert.match(step('scale'),/Fmax 不由 Scale 自动/);
  assert.match(step('so'),/不可伸长肌腱/);
  assert.match(step('so'),/不积分激活动力学/);
  assert.match(step('so'),/不含并联被动纤维力/);
  assert.match(step('so'),/不是 OpenSim 通用规则/);
  assert.match(step('so'),/control × optimal_force/);
  assert.match(OPENSIM_STEPS.find(s=>s.id==='moco').summary,/另一条求解路线/);
  assert.match(MUSCLE_MODELS.find(m=>m.id==='thelen').details,/实现警告/);
  assert.match(MUSCLE_MODELS.find(m=>m.id==='degroote').details,/只切换说明/);
});

test('display, search catalog and native muscle channels retain different namespaces',()=>{
  assert.equal(MODEL.bones.length,29);
  assert.equal(ATLAS.tendons.length,37);
  assert.equal(OPENSIM_MUSCLES.length,43);
  const m=fixture.manifest;
  assert.equal(m.counts.muscles,39);
  assert.equal(m.muscleNames.length,m.counts.muscles);
  assert.equal(m.jointNames.length,m.counts.qpos);
  assert.equal(m.counts.qpos,23);
  assert.equal(m.counts.activationStates,39);
  assert.equal(m.muscleNames[m.selectedMuscle.actuatorId],'FDS2');
  assert.equal(m.jointNames[m.selectedMuscle.jointId],'mcp2_flexion');
  unique(m.muscleNames); unique(m.jointNames);
  assert.notDeepEqual(m.muscleNames,OPENSIM_MUSCLES.map(x=>x.modelName));
  assert.ok(m.limitations.some(x=>/not registered/.test(x)));
});

test('torque teaching formula converts mm to m and retains gravity at zero contact',()=>{
  close(torqueDemand(2,40,0).requiredNm,.08);
  close(torqueDemand(0,35).requiredNm,.02);
  close(torqueDemand(2,40).requiredNm,.10);
  close(torqueDemand(-2,40,0).requiredNm,-.08);
  close(torqueDemand(2,-40,0).requiredNm,-.08);
});

function checkAllocation(options){
  const r=solveAllocation(options);
  finiteTree(r);
  for(const a of r.a) assert.ok(a>=-1e-10 && a<=1+1e-10);
  const s=r.reserveScale;
  close(r.contributions.reduce((sum,x)=>sum+x,0)+r.reserve,r.requiredNm,2e-14);
  close(r.reserveControl*s,r.reserve,2e-14);
  close(r.objective,.5*(r.a[0]**2+r.a[1]**2+r.reserveControl**2),1e-10);
  // Independent bound-KKT check after eliminating the equality-constrained reserve.
  // Gradient_i = a_i - c_i * (tau - c*a) / reserveScale^2.
  r.a.forEach((a,i)=>{
    const gradient=a-r.capacities[i]*r.reserve/(s*s);
    if(a<1e-9) assert.ok(gradient>=-1e-8,`lower-bound KKT ${gradient}`);
    else if(a>1-1e-9) assert.ok(gradient<=1e-8,`upper-bound KKT ${gradient}`);
    else close(gradient,0,1e-8);
  });
  return r;
}

test('SO educational active-set solution passes KKT throughout the displayed slider ranges',()=>{
  let checked=0;
  for(const load of [0,.1,2,6,12]) for(const lever of [5,35,60])
    for(const strength of [.1,.4,1,1.5]) for(const angle of [0,25,75]){
      checkAllocation({load,lever,strength,angle}); checked++;
    }
  assert.equal(checked,180);
});

test('SO active-set solution also handles extension, saturation and zero mechanical demand',()=>{
  for(const load of [-30,-2,-.02/.035,0,12,30]) checkAllocation({load,strength:.1});
  const negative=solveAllocation({load:-2});
  assert.ok(negative.a[1]>0); close(negative.a[0],0);
  const overloaded=solveAllocation({load:12,lever:60,strength:.1});
  close(overloaded.a[0],1);
  assert.ok(overloaded.reserve>.5,'unbounded reserve must not be hidden or clipped');
  const zero=solveAllocation({load:-.02/.035,lever:35});
  close(zero.requiredNm,0); close(zero.reserve,0); close(zero.a[0],0); close(zero.a[1],0);
});

test('SO optimum is no worse than an independently enumerated feasible activation grid',()=>{
  for(const options of [{},{load:12,lever:60,strength:.1},{load:-5},{load:0},{angle:75,strength:.2},{strength:1.5}]){
    const r=solveAllocation(options);
    let gridBest=Infinity;
    for(let i=0;i<=100;i++) for(let j=0;j<=100;j++){
      const a=i/100,b=j/100;
      const reserve=r.requiredNm-r.capacities[0]*a-r.capacities[1]*b;
      gridBest=Math.min(gridBest,.5*(a*a+b*b+(reserve/r.reserveScale)**2));
    }
    assert.ok(r.objective<=gridBest+1e-9);
  }
});

test('SO responds to parameter changes without erasing zero-contact demand',()=>{
  const low=solveAllocation({load:0}),high=solveAllocation({load:3});
  assert.ok(low.a[0]>0); assert.ok(high.a[0]>low.a[0]);
  assert.ok(solveAllocation({strength:1.5}).a[0]<solveAllocation({strength:.5}).a[0]);
  assert.ok(solveAllocation({angle:75}).capacityFactor<solveAllocation({angle:25}).capacityFactor);
});

test('teaching activation pulse is finite, bounded and lagged, not an instantaneous control copy',()=>{
  const rows=activationPulse(); finiteTree(rows);
  assert.equal(rows.length,301);
  const at=t=>rows.find(r=>Math.abs(r.t-t)<1e-9);
  assert.ok(at(.1).u>at(.1).a);
  assert.ok(at(.35).a>at(.35).u);
  assert.ok(rows.every(r=>r.a>=.02-1e-12 && r.a<=.6+1e-12));
  assert.ok(at(.2).a>at(.1).a);
  assert.ok(at(.5).a<at(.35).a);
});

test('native fixture timebase, action transformation, force decomposition and selected torque agree',()=>{
  const m=fixture.manifest;
  assert.equal(m.computationTier,'native-replay');
  assert.equal(m.mujocoVersion,'3.3.0');
  close(m.physicsTimestep_s,.002); close(m.controlInterval_s,m.frameSkip*m.physicsTimestep_s);
  assert.match(m.generatorSha256,/^[a-f0-9]{64}$/);
  assert.ok(m.officialSources.length>=5);
  finiteTree(fixture);
  assert.equal(fixture.pulse.length,201);
  for(const series of [fixture.pulse,...fixture.internalStateIntervention.map(x=>x.trace)]){
    series.forEach((r,i)=>{
      close(r.time_s,i*.002,1e-12);
      assert.equal(r.qpos_rad.length,m.counts.qpos);
      close(r.ctrl,1/(1+Math.exp(-5*(r.raw_action-.5))),1e-12);
      close(r.tension_N,-r.actuator_force_N,1e-10);
      close(r.tension_N,r.active_tension_N+r.passive_tension_N,1e-10);
      close(r.selected_joint_torque_Nm,r.selected_moment_m*r.actuator_force_N,1e-10);
      close(r.joint_angle_rad,r.qpos_rad[m.selectedMuscle.jointId],1e-12);
      assert.ok(r.activation>=0 && r.activation<=1);
      assert.equal(r.contact_count,0);
    });
  }
});

test('native internal-state intervention pairs identical initial positions and controls, not identical activation',()=>{
  const [a,b]=fixture.internalStateIntervention;
  assert.deepEqual(a.trace[0].qpos_rad,b.trace[0].qpos_rad);
  close(a.trace[0].joint_velocity_rad_s,0); close(b.trace[0].joint_velocity_rad_s,0);
  assert.notEqual(a.trace[0].activation,b.trace[0].activation);
  assert.equal(a.trace.length,b.trace.length);
  a.trace.forEach((r,i)=>close(r.ctrl,b.trace[i].ctrl,1e-12));
  const difference=Math.abs(a.trace.at(-1).joint_angle_rad-b.trace.at(-1).joint_angle_rad)*180/Math.PI;
  close(difference,fixture.checks.twinEndSelectedJointDifference_deg,1e-9);
  assert.ok(difference>0);
  // Full qvel is not exported: this test independently checks only the visible joint velocity.
  assert.ok(fixture.manifest.limitations.some(s=>/manually initialized/.test(s)));
});

test('route parser separates legacy control route from new direct links',()=>{
  assert.deepEqual(parseRoute(''),{route:'control',step:'overview'});
  assert.deepEqual(parseRoute('#control'),{route:'control',step:'overview'});
  assert.deepEqual(parseRoute('#opensim'),{route:'opensim',step:'overview'});
  assert.deepEqual(parseRoute('#opensim/so'),{route:'opensim',step:'so'});
  assert.deepEqual(parseRoute('#myohand/activation'),{route:'myohand',step:'activation'});
  assert.deepEqual(parseRoute('#unknown/so'),{route:'control',step:'overview'});
  // Unknown step is validated against the curriculum by main.js, not by the parser.
  assert.equal(parseRoute('#opensim/not-a-step').step,'not-a-step');
});

test('chart coordinate mapping has correct axis orientation and handles a flat numeric range',()=>{
  assert.equal(polylinePath([[0,0],[1,1]],{width:100,height:100,pad:10}),'M10.00,90.00 L90.00,10.00');
  assert.doesNotMatch(polylinePath([[0,1],[1,1]],{minY:1,maxY:1}),/NaN|Infinity/);
  assert.equal(polylinePath([]),'');
});

test('three-parameter teaching lab preserves length and declares its independent Gaussian model',()=>{
  const r=computeMuscleExample();
  assert.equal(r.fiberMm,100); assert.equal(r.lmtMm,250); assert.equal(r.activation,.5);
  close(r.fiberMm+r.ltsMm,r.lmtMm);
  close(r.normalizedLength,100/90);
  close(r.forceN,75*Math.exp(-(((100/90-1)/.45)**2)));
  assert.deepEqual(MUSCLE_LAB_DEFAULTS,{fmaxN:150,loptMm:90,ltsMm:150});
  const source=fs.readFileSync(new URL('../explainer/muscle-lab.js',import.meta.url),'utf8');
  assert.match(source,/不是 Millard、Thelen 或 De Groote 的原生公式/);
  assert.match(source,/也没有运行 SO/);
});

test('force-length teaching lab peaks at optimal fiber length and Fmax scales only actual force',()=>{
  const peak=computeMuscleExample({fmaxN:100,loptMm:100,ltsMm:150});
  assert.equal(peak.forceLengthMultiplier,1); assert.equal(peak.forceN,50);
  const doubled=computeMuscleExample({fmaxN:200,loptMm:100,ltsMm:150});
  close(doubled.forceN,2*peak.forceN);
  assert.equal(doubled.forceLengthMultiplier,peak.forceLengthMultiplier);
  for(const loptMm of [80,120]) assert.ok(computeMuscleExample({loptMm,ltsMm:150}).forceLengthMultiplier<1);
  for(const ltsMm of [130,170]) assert.ok(computeMuscleExample({loptMm:100,ltsMm}).forceLengthMultiplier<1);
});

test('teaching parameter limits keep fibers positive and all outputs finite across slider endpoints',()=>{
  for(const fmaxN of [50,150,250]) for(const loptMm of [40,80,120]) for(const ltsMm of [100,140,180]){
    const r=computeMuscleExample({fmaxN,loptMm,ltsMm});finiteTree(r);
    assert.ok(r.fiberMm>=70 && r.fiberMm<=150);
    assert.ok(r.forceLengthMultiplier>0 && r.forceLengthMultiplier<=1);
    assert.ok(r.forceN>0 && r.forceN<=.5*fmaxN);
    close(r.fiberMm+r.ltsMm,250);
  }
  const clamped=computeMuscleExample({fmaxN:-500,loptMm:1000,ltsMm:Infinity});
  assert.equal(clamped.fmaxN,50);assert.equal(clamped.loptMm,120);assert.equal(clamped.ltsMm,150);
});
