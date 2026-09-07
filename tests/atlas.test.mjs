import test from 'node:test';
import assert from 'node:assert/strict';
import {ATLAS} from '../atlas-data.js';
import {MODEL} from '../model-data.js';
import {ENDPOINTS} from '../endpoint-data.js';
import fs from 'node:fs';
import {createAtlasState,formatRange} from '../atlas-state.js';

test('all enabled channels have traceable SHM model endpoints',()=>{
  const provenance=JSON.parse(fs.readFileSync(new URL('../docs/data-provenance.json',import.meta.url)));
  assert.equal(ENDPOINTS.sha256,provenance.controlTable.sha256);
  assert.deepEqual(Object.keys(ENDPOINTS.tendons).sort(),ATLAS.tendons.map(t=>t.id).sort());
  for(const [id,e] of Object.entries(ENDPOINTS.tendons)){
    assert.ok(e.start&&e.end&&e.startBody&&e.endBody);
    assert.ok(e.startPoint.startsWith(`${id}_tendon__`));
    assert.ok(e.endPoint.startsWith(`${id}_tendon__`));
    assert.notEqual(e.startPoint,e.endPoint);
  }
  assert.equal(ENDPOINTS.tendons.FPL.start,'前臂支架');
  assert.equal(ENDPOINTS.tendons.FPL.end,'拇指远节指骨');
  assert.equal(ENDPOINTS.tendons.OP.start,'腕骨合并体');
  assert.equal(ENDPOINTS.tendons.OP.end,'拇指掌骨');
  // Preserve the model's equivalent routes rather than substituting textbook origins.
  assert.equal(ENDPOINTS.tendons.LU_RB4.start,'中指掌骨');
});

test('16 physical joints, 23 DoFs and 37 uniquely mapped enabled channels',()=>{
  assert.equal(ATLAS.joints.length,16);
  assert.equal(ATLAS.joints.flatMap(j=>j.dofs).length,23);
  assert.equal(ATLAS.tendons.length,37);
  assert.equal(new Set(ATLAS.tendons.map(t=>t.id)).size,37);
  assert.equal(MODEL.bones.length,29);
  for(const t of ATLAS.tendons){assert.equal(MODEL.actuator_names[t.modelIndex],t.id);assert.ok(MODEL.tendon_segments_i16[t.modelIndex].length);}
  assert.ok(!ATLAS.tendons.some(t=>['PT','PQ'].includes(t.id)));
});

test('each action follows its measured neutral moment-arm sign and joint totals are deduplicated',()=>{
  for(const joint of ATLAS.joints){
    const union=new Set();
    assert.ok(MODEL.joints.some(j=>j.name===joint.anchor));
    for(const dof of joint.dofs){
      assert.equal(dof.directions.length,2);
      assert.ok(dof.range.min<=0&&dof.range.max>=0);
      for(const d of dof.directions)for(const id of d.tendons){
        union.add(id);assert.ok(ATLAS.tendons.some(t=>t.id===id));
        assert.ok(d.id==='positive'?dof.neutralMomentArmsMm[id]>.01:dof.neutralMomentArmsMm[id]<-.01);
      }
    }
    assert.deepEqual([...union].sort(),[...joint.tendons].sort());
  }
});

test('middle finger has six MCP channels, five PIP channels and two DIP channels',()=>{
  const mcp=ATLAS.joints.find(j=>j.id==='joint_bone11');
  const pip=ATLAS.joints.find(j=>j.id==='joint_bone12');
  const dip=ATLAS.joints.find(j=>j.id==='joint_bone13');
  assert.deepEqual([...mcp.tendons].sort(),['EDC3','FDP3','FDS3','LU_RB3','RI3','UI_UB3']);
  assert.equal(pip.tendons.length,5);
  assert.deepEqual([...dip.tendons].sort(),['EDC3','FDP3']);
  const flex=mcp.dofs.find(d=>d.id==='middle_MCP_flex');
  assert.deepEqual(flex.directions.find(a=>a.label==='伸展').tendons,['EDC3']);
});

test('thumb CMC and ulnar-finger lateral directions do not inherit a blanket positive=flexion/abduction rule',()=>{
  const all=ATLAS.joints.flatMap(j=>j.dofs);
  const thumb=all.find(d=>d.id==='thumb_CMC_flex');
  assert.equal(thumb.directions.find(a=>a.id==='positive').label,'伸展');
  assert.equal(thumb.directions.find(a=>a.id==='negative').label,'弯曲');
  assert.match(formatRange(thumb.range),/^弯曲 17.2° — 伸展 57.3°$/);
  for(const n of ['ring_MCP_abd','pinky_MCP_abd'])assert.equal(all.find(d=>d.id===n).directions.find(a=>a.id==='positive').label,'内收');
  const side=all.find(d=>d.id==='middle_MCP_abd');assert.deepEqual(side.directions.map(a=>a.label),['桡偏','尺偏']);
});

test('visibility remains synchronized across actions and reopening a joint',()=>{
  const controller=createAtlasState(ATLAS);
  assert.deepEqual(controller.visible(),[]);
  controller.openJoint('joint_bone11');assert.equal(controller.visible().length,6);
  controller.selectDirection('middle_MCP_flex','positive');assert.equal(controller.visible().length,5);
  controller.toggleTendon('FDS3');assert.ok(!controller.visible().includes('FDS3'));
  controller.selectDirection('middle_MCP_abd','negative');assert.ok(!controller.visible().includes('FDS3'));
  controller.openJoint(null);assert.deepEqual(controller.visible(),[]);
  controller.openJoint('joint_bone11');assert.equal(controller.visible().length,5);
  controller.toggleTendon('FDS3');assert.equal(controller.visible().length,6);
  controller.selectDirection('middle_MCP_flex','negative');assert.deepEqual(controller.visible(),['EDC3']);
  assert.throws(()=>controller.toggleTendon('FDS3'),/outside/);
});

test('empty thumb MCP negative lateral action stays empty',()=>{
  const c=createAtlasState(ATLAS);c.openJoint('joint_bone2');c.selectDirection('thumb_MCP_abd','negative');
  assert.deepEqual(c.scope(),[]);assert.deepEqual(c.visible(),[]);
});

test('direction and joint changes clear stale highlights',()=>{
  const c=createAtlasState(ATLAS);c.openJoint('joint_bone11');c.highlight('FDP3');assert.equal(c.state.highlighted,'FDP3');
  c.toggleTendon('FDP3');assert.equal(c.state.highlighted,null);
  c.openJoint('joint_bone12');assert.equal(c.state.direction,null);
  assert.throws(()=>c.openJoint('pro_sup'),/Unknown/);
});
