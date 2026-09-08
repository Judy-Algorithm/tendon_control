import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {MODEL} from '../model-data.js';
import {ATLAS} from '../atlas-data.js';
import {FITTED_ROUTES} from '../route-data.js';
import {THREE,createSurface} from '../scripts/surface-geometry.mjs';
import {POLICY} from '../scripts/attachment-policy.mjs';
import {ATTACHMENT_CATALOG,endpointText} from '../attachment-catalog.js';
import {ATTACHMENT_REFERENCE} from '../attachment-reference.js';
const report=JSON.parse(fs.readFileSync(new URL('../docs/attachment-audit.json',import.meta.url)));
const surfaces=new Map(MODEL.bones.map(b=>[b.name,createSurface(b,MODEL.quant)]));
const v=a=>new THREE.Vector3(...a);

test('all 74 endpoints are audited; 40 surface fits and 34 explicitly classified exceptions',()=>{
  assert.deepEqual(report.channels.map(c=>c.id).sort(),ATLAS.tendons.map(t=>t.id).sort());
  assert.equal(Object.keys(FITTED_ROUTES).length,28);
  assert.equal(report.channels.filter(c=>c.status==='preserved').length,9);
  assert.equal(report.channels.flatMap(c=>c.attachments||[]).length,40);
  const endpoints=report.channels.flatMap(c=>c.endpointAudit);
  assert.equal(endpoints.length,74);
  assert.equal(endpoints.filter(e=>e.status==='surface-fitted').length,40);
  assert.equal(endpoints.filter(e=>e.status==='outside-mesh').length,13);
  assert.equal(endpoints.filter(e=>e.status==='soft-tissue-equivalent').length,13);
  assert.equal(endpoints.filter(e=>e.status==='model-anchor').length,8);
  for(const e of endpoints){
    assert.ok(e.label&&e.positionM.every(Number.isFinite));
    assert.ok(Number.isFinite(e.nearestVisibleSurface.gapMm));
    if(e.kind==='bone')assert.ok(e.status==='surface-fitted'&&e.targetGapMm<.001);
    else assert.equal(e.targetGapMm,null);
    if(e.kind==='model-anchor')assert.match(e.label,/待核定/);
  }
  assert.equal(report.sourceGeometrySha256,crypto.createHash('sha256').update(fs.readFileSync(new URL('../model-data.js',import.meta.url))).digest('hex'));
  for(const c of report.channels.filter(c=>c.status==='preserved'))assert.ok(!FITTED_ROUTES[c.id]&&c.reason);
});
test('all 40 bone endpoints lie on the reviewed bone, inside the selected broad region and original side',()=>{
  for(const c of report.channels)for(const a of c.attachments||[]){
    const points=FITTED_ROUTES[c.id],p=v(a.side==='start'?points[0]:points.at(-1)),surface=surfaces.get(a.bone),spec=POLICY[c.id][a.side];
    assert.ok(surface.closest(p).distance<1e-7,`${c.id} ${a.side} surface gap`);
    const t=surface.longitudinal(p);assert.ok(t>=spec.region[0]-1e-6&&t<=spec.region[1]+1e-6);
    if(spec.preserveSide)assert.ok(surface.radial(p).dot(surface.radial(v(a.originalM)))>=.5-1e-5,`${c.id} changed side`);
    assert.ok(a.displacementMm<8,`${c.id} excessive local displacement`);
  }
});
test('display text distinguishes native visual geometry from old SHM frame names',()=>{
  assert.deepEqual(Object.keys(ATTACHMENT_CATALOG).sort(),ATLAS.tendons.map(t=>t.id).sort());
  assert.match(endpointText('FPL'),/桡骨 → 拇指远节指骨/);
  assert.match(endpointText('OP'),/大多角骨区域/);
  assert.match(endpointText('ECRL'),/骨骼未显示/);
  assert.match(endpointText('LU_RB3'),/中指指深屈肌腱桡侧/);
  assert.match(endpointText('RI4'),/^起止位置：第四掌骨掌侧桡侧面/);
  assert.ok(!POLICY.RI4.start&&!POLICY.RI5.start,'No unsupported origin reassignment');
});
test('anatomical labels remain distinct from unchanged geometry verification',()=>{
  for(const tendon of ATLAS.tendons){
    assert.doesNotMatch(endpointText(tendon.id),/等效|待核定|（解剖参考）/);
    assert.doesNotMatch(tendon.name,/等效|待核定/);
  }
  for(const reference of Object.values(ATTACHMENT_REFERENCE))assert.ok(reference.sources.length);
  assert.match(endpointText('RI3'),/^起止位置：第二、三掌骨相邻面.*中指近节指骨基底桡侧/);
  assert.match(endpointText('UI_UB3'),/^起止位置：第三、四掌骨相邻面.*指背腱膜尺侧束/);
  assert.match(endpointText('UI_UB5'),/模型坐标系.*第三掌骨.*小指中节指骨/);
  assert.equal(ATTACHMENT_CATALOG.UI_UB3.start.kind,'model-anchor');
  assert.equal(ATTACHMENT_CATALOG.RI4.start.kind,'model-anchor');
  assert.equal(ATTACHMENT_CATALOG.LU_RB3.start.kind,'soft-tissue-equivalent');
});
test('routes are finite, continuous polylines, bounded in size and retain unfitted proximal endpoints',()=>{
  let segments=0;
  for(const [id,points] of Object.entries(FITTED_ROUTES)){
    assert.ok(points.length>=2&&points.length<100);segments+=points.length-1;
    for(let i=0;i<points.length;i++){
      assert.equal(points[i].length,3);assert.ok(points[i].every(Number.isFinite));
      if(i)assert.ok(v(points[i]).distanceTo(v(points[i-1]))>1e-9);
    }
    if(!POLICY[id].start){
      const raw=MODEL.tendon_segments_i16[MODEL.actuator_names.indexOf(id)][0].slice(0,3).map(n=>n*MODEL.quant);
      assert.ok(v(raw).distanceTo(v(points[0]))<1e-8);
    }
  }
  assert.ok(segments<1100,'Unnecessary subdivision would cause excessive draw calls');
});
test('OP uses trapezium and first-metacarpal shaft, not global nearest-bone snapping',()=>{
  const op=report.channels.find(c=>c.id==='OP');
  assert.deepEqual(op.attachments.map(a=>a.bone),['trapezium','1mc']);
  assert.ok(op.attachments[0].originalSurfaceGapMm>5);
  assert.deepEqual(POLICY.OP.end.region,[.2,.8]);
});
test('sampled final 10 mm of fitted approaches do not penetrate their target bone',()=>{
  for(const [id,points] of Object.entries(FITTED_ROUTES))for(const side of ['start','end']){
    const spec=POLICY[id][side];if(!spec)continue;
    const surface=surfaces.get(spec.bone),route=side==='start'?points:[...points].reverse();let travelled=0;
    for(let i=1;i<route.length&&travelled<.010;i++){
      const a=v(route[i-1]),b=v(route[i]),length=a.distanceTo(b);
      for(let k=1;k<10;k++){
        if(travelled+length*k/10>.010)break;
        const point=a.clone().lerp(b,k/10),hit=surface.closest(point);
        assert.ok(point.clone().sub(hit.point).dot(hit.normal)>-.0001,`${id} ${side} target-bone penetration`);
      }
      travelled+=length;
    }
  }
});
