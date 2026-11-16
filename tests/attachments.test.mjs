import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL} from '../model-data.js';
import {ATLAS} from '../atlas-data.js';
import {GENERAL_RIGHT_ROUTES} from '../general-right-routes.js';
import {GENERAL_RIGHT_MODEL_SOURCE} from '../general-right-model-data.js';
import {OPENSIM_MUSCLES} from '../opensim-muscles.js';
import {ATTACHMENT_CATALOG,endpointText} from '../attachment-catalog.js';
import {ATTACHMENT_REFERENCE} from '../attachment-reference.js';

test('native right REVIEW source supplies all 43 exact OpenSim GeometryPaths',()=>{
  assert.equal(GENERAL_RIGHT_MODEL_SOURCE.hand,'right');
  assert.equal(GENERAL_RIGHT_MODEL_SOURCE.status,'REVIEW');
  assert.equal(GENERAL_RIGHT_MODEL_SOURCE.participantScalingApplied,false);
  assert.equal(GENERAL_RIGHT_MODEL_SOURCE.sha256,'c97e610a70bab78ad3368cf5bda45f192e79e3029ad8fa9d2a7d66fb2170a5a0');
  assert.equal(Object.keys(GENERAL_RIGHT_ROUTES).length,43);
  assert.deepEqual(Object.keys(GENERAL_RIGHT_ROUTES).sort(),OPENSIM_MUSCLES.map(m=>m.id).sort());
  for(const muscle of OPENSIM_MUSCLES)assert.equal(muscle.route,GENERAL_RIGHT_ROUTES[muscle.id]);
});

test('all native routes are finite, continuous, bounded neutral-state polylines',()=>{
  let segmentCount=0;
  for(const [id,points] of Object.entries(GENERAL_RIGHT_ROUTES)){
    assert.ok(points.length>=2&&points.length<500,id);
    for(let i=0;i<points.length;i++){
      assert.equal(points[i].length,3);assert.ok(points[i].every(Number.isFinite),id);
      assert.ok(points[i].every(value=>Math.abs(value)<1),`${id} remains in metre-scale model bounds`);
      if(i){
        const distance=Math.hypot(...points[i].map((value,k)=>value-points[i-1][k]));
        assert.ok(distance>1e-10,`${id} has duplicate consecutive points`);
      }
    }
    segmentCount+=points.length-1;
  }
  assert.ok(segmentCount>43&&segmentCount<5000);
});

test('legacy display indices remain valid while canonical search uses model names',()=>{
  assert.equal(MODEL.bones.length,29);
  assert.equal(MODEL.actuator_names.length,39);
  for(const tendon of ATLAS.tendons){
    assert.equal(MODEL.actuator_names[tendon.modelIndex],tendon.id);
    assert.ok(MODEL.tendon_segments_i16[tendon.modelIndex].length);
  }
});

test('display text keeps anatomically explicit endpoint descriptions',()=>{
  assert.deepEqual(Object.keys(ATTACHMENT_CATALOG).sort(),ATLAS.tendons.map(t=>t.id).sort());
  assert.match(endpointText('FPL'),/桡骨 → 拇指远节指骨/);
  assert.match(endpointText('OP'),/大多角骨区域/);
  assert.match(endpointText('ECRL'),/肱骨外侧髁上嵴下三分之一 → 第二掌骨基底背侧/);
  assert.match(endpointText('LU_RB3'),/中指指深屈肌腱桡侧/);
  assert.match(endpointText('RI4'),/^起止位置：第四掌骨掌侧桡侧面/);
});

test('anatomical labels and reference provenance remain complete',()=>{
  for(const tendon of ATLAS.tendons){
    assert.doesNotMatch(endpointText(tendon.id),/等效|待核定|[（）()]/);
    assert.doesNotMatch(tendon.name,/等效|待核定|[（）()]/);
  }
  for(const reference of Object.values(ATTACHMENT_REFERENCE))assert.ok(reference.sources.length);
  assert.match(endpointText('RI3'),/^起止位置：第二、三掌骨相邻面.*中指近节指骨基底桡侧/);
  assert.match(endpointText('UI_UB3'),/^起止位置：第三、四掌骨相邻面.*指背腱膜尺侧束/);
  assert.equal(ATTACHMENT_CATALOG.UI_UB3.start.kind,'model-anchor');
  assert.equal(ATTACHMENT_CATALOG.RI4.start.kind,'model-anchor');
});

test('extensor descriptions preserve expansion and both insertion levels',()=>{
  for(const digit of [2,3,4,5])assert.match(endpointText('EDC'+digit),/肱骨外上髁.*指背腱膜.*中节与远节指骨基底背侧/);
  assert.match(endpointText('EDM'),/肱骨外上髁 → 小指指背腱膜/);
  assert.match(endpointText('EIP'),/尺骨远端背侧及骨间膜 → 食指指背腱膜/);
  assert.match(endpointText('ECRB'),/肱骨外上髁 → 第三掌骨基底背侧/);
  assert.match(endpointText('FCU'),/豌豆骨，经韧带连接/);
});
