import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTROLS} from '../control-data.js';
import {OPENSIM_JOINT_NAMES,jointDisplayTitle} from '../opensim-joints.js';

const EXPECTED=['radiocarpal','CMC1a / CMC1b','MCP','IP','_2MCP','_2prox-midph_b','_2mid-distph','_3MCP','_3prox-midph_b','_3mid-distph','CMC4 / CMC5','_4MCP','_4prox-midph_b','_4mid-distph','_5MCP','_5prox-midph_b','_5mid-distph'];

test('all displayed controls use exact OpenSim joint names',()=>{
  assert.equal(Object.keys(OPENSIM_JOINT_NAMES).length,17);
  assert.deepEqual(CONTROLS.joints.map(j=>j.modelJoint),EXPECTED);
});

test('joint headings replace generic English abbreviations with model names',()=>{
  const titles=CONTROLS.joints.map(jointDisplayTitle);
  assert.ok(titles.includes('\u8155\u5173\u8282 \u00b7 radiocarpal'));
  assert.ok(titles.includes('\u62c7\u6307 \u00b7 CMC1a / CMC1b'));
  assert.ok(titles.includes('\u98df\u6307 \u00b7 _2prox-midph_b'));
  assert.ok(titles.includes('\u7b2c4\u30015\u638c\u9aa8 \u00b7 CMC4 / CMC5'));
  assert.ok(titles.includes('\u5c0f\u6307 \u00b7 _5mid-distph'));
});
