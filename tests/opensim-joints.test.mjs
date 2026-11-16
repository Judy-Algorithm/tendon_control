import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTROLS,JOINT_DISPLAY_ORDER} from '../control-data.js';
import {OPENSIM_JOINT_NAMES,OPENSIM_COORDINATE_NAMES,coordinateDisplayName,jointDisplayTitle} from '../opensim-joints.js';
import {WSY_MODEL_SOURCE,WSY_COORDINATES,WSY_MOMENT_ARMS_MM} from '../wsy-model-data.js';

const EXPECTED_JOINTS=['radioulnar','radiocarpal','CMC1a / CMC1b','CMC4 / CMC5','MCP','_2MCP','_3MCP','_4MCP','_5MCP','IP','_2prox-midph_b','_3prox-midph_b','_4prox-midph_b','_5prox-midph_b','_2mid-distph','_3mid-distph','_4mid-distph','_5mid-distph'];

test('all displayed controls retain exact OpenSim joint names in anatomical groups',()=>{
  assert.equal(Object.keys(OPENSIM_JOINT_NAMES).length,18);
  assert.deepEqual(CONTROLS.joints.map(j=>j.id),JOINT_DISPLAY_ORDER);
  assert.deepEqual(CONTROLS.joints.map(j=>j.modelJoint),EXPECTED_JOINTS);
  assert.deepEqual(JOINT_DISPLAY_ORDER.slice(4,9),['joint_bone2','joint_bone6','joint_bone11','joint_bone16','joint_bone21']);
  assert.deepEqual(JOINT_DISPLAY_ORDER.slice(9,14),['joint_bone3','joint_bone7','joint_bone12','joint_bone17','joint_bone22']);
  assert.deepEqual(JOINT_DISPLAY_ORDER.slice(14),['joint_bone8','joint_bone13','joint_bone18','joint_bone23']);
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
  assert.equal(CONTROLS.joints.find(j=>j.id==='joint_bone2').dofs.some(d=>d.id==='thumb_MCP_abd'),false);
  assert.equal(coordinateDisplayName(CONTROLS.joints[0].dofs[0]),'forearm_rotation');
});

test('control definitions retain the supplied WSY model identity, ranges and moment arms',()=>{
  assert.equal(WSY_MODEL_SOURCE.sha256,'fe5b786c2e2e96228e2b07b56e71b0de20d85a4caeda017f213dd638cbf2791e');
  assert.equal(WSY_MODEL_SOURCE.muscleCount,43);
  assert.deepEqual([WSY_COORDINATES.wrist_abd.min,WSY_COORDINATES.wrist_abd.max],[-10,25]);
  assert.deepEqual([WSY_COORDINATES.ring_PIP_flex.min,WSY_COORDINATES.ring_PIP_flex.max],[0,100]);
  assert.equal(WSY_COORDINATES.ulnar_CMC_flex.max,11.642029);
  assert.equal(WSY_MOMENT_ARMS_MM.flexion.FCR,19.230254);
  assert.equal(WSY_MOMENT_ARMS_MM['4cmc_flexion'].EDCL,-34.069407);
  const displayed=CONTROLS.joints.flatMap(j=>j.dofs);
  assert.equal(displayed.length,24);
  assert.ok(displayed.every(d=>d.rangeLabel==='模型范围'));
});
