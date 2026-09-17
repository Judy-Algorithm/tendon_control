import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTROLS} from '../control-data.js';
import {OPENSIM_JOINT_NAMES,OPENSIM_COORDINATE_NAMES,coordinateDisplayName,jointDisplayTitle} from '../opensim-joints.js';

const EXPECTED_JOINTS=['radiocarpal','CMC1a / CMC1b','MCP','IP','_2MCP','_2prox-midph_b','_2mid-distph','_3MCP','_3prox-midph_b','_3mid-distph','CMC4 / CMC5','_4MCP','_4prox-midph_b','_4mid-distph','_5MCP','_5prox-midph_b','_5mid-distph'];

test('all displayed controls retain exact OpenSim joint names',()=>{
  assert.equal(Object.keys(OPENSIM_JOINT_NAMES).length,17);
  assert.deepEqual(CONTROLS.joints.map(j=>j.modelJoint),EXPECTED_JOINTS);
});

test('every displayed degree of freedom is mapped to its OpenSim Coordinate',()=>{
  const dofs=CONTROLS.joints.flatMap(j=>j.dofs);
  assert.equal(Object.keys(OPENSIM_COORDINATE_NAMES).length,dofs.length);
  for(const dof of dofs)assert.ok(Object.hasOwn(OPENSIM_COORDINATE_NAMES,dof.id),dof.id);
  assert.equal(CONTROLS.joints.find(j=>j.id==='joint_bone17').dofs[0].modelCoordinate,'4pm_flexion');
  assert.equal(CONTROLS.joints.find(j=>j.id==='joint_bone18').dofs[0].modelCoordinate,'4md_flexion');
  assert.equal(CONTROLS.joints.find(j=>j.id==='joint_ulnar_cmc').dofs[0].modelCoordinate,'4cmc_flexion / CMC5_r1');
});

test('headings show Coordinate names while expanded data retains Joint names',()=>{
  const titles=CONTROLS.joints.map(jointDisplayTitle);
  assert.ok(titles.includes('\u8155\u5173\u8282 \u00b7 flexion / deviation'));
  assert.ok(titles.includes('\u62c7\u6307 \u00b7 cmc_flexion / cmc_abduction'));
  assert.ok(titles.includes('\u98df\u6307 \u00b7 2pm_flexion'));
  assert.ok(titles.includes('\u65e0\u540d\u6307 \u00b7 4pm_flexion'));
  assert.ok(titles.includes('\u5c0f\u6307 \u00b7 5md_flexion'));
  const constructed=CONTROLS.joints.find(j=>j.id==='joint_bone2').dofs.find(d=>d.id==='thumb_MCP_abd');
  assert.equal(coordinateDisplayName(constructed),'\u6a21\u578b\u4e2d\u65e0\u72ec\u7acb Coordinate');
});
