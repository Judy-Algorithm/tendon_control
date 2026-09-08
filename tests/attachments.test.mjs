import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {MODEL} from '../model-data.js';
import {ATLAS} from '../atlas-data.js';
import {FITTED_ROUTES} from '../route-data.js';
import {THREE,createSurface} from '../scripts/surface-geometry.mjs';
import {POLICY} from '../scripts/attachment-policy.mjs';
const report=JSON.parse(fs.readFileSync(new URL('../docs/attachment-audit.json',import.meta.url)));
const surfaces=new Map(MODEL.bones.map(b=>[b.name,createSurface(b,MODEL.quant)]));
const v=a=>new THREE.Vector3(...a);

test('all 37 channels are audited; 24 fits and 13 explicit soft-tissue/equivalent exceptions',()=>{
  assert.deepEqual(report.channels.map(c=>c.id).sort(),ATLAS.tendons.map(t=>t.id).sort());
  assert.equal(Object.keys(FITTED_ROUTES).length,24);
  assert.equal(report.channels.filter(c=>c.status==='preserved').length,13);
  assert.equal(report.channels.flatMap(c=>c.attachments||[]).length,25);
  assert.equal(report.sourceGeometrySha256,crypto.createHash('sha256').update(fs.readFileSync(new URL('../model-data.js',import.meta.url))).digest('hex'));
  for(const c of report.channels.filter(c=>c.status==='preserved'))assert.ok(!FITTED_ROUTES[c.id]&&c.reason);
});
test('all 25 endpoints lie on the reviewed bone, inside the selected broad region and original side',()=>{
  for(const c of report.channels)for(const a of c.attachments||[]){
    const points=FITTED_ROUTES[c.id],p=v(a.side==='start'?points[0]:points.at(-1)),surface=surfaces.get(a.bone),spec=POLICY[c.id][a.side];
    assert.ok(surface.closest(p).distance<1e-7,`${c.id} ${a.side} surface gap`);
    const t=surface.longitudinal(p);assert.ok(t>=spec.region[0]-1e-6&&t<=spec.region[1]+1e-6);
    if(spec.preserveSide)assert.ok(surface.radial(p).dot(surface.radial(v(a.originalM)))>=.5-1e-5,`${c.id} changed side`);
    assert.ok(a.displacementMm<8,`${c.id} excessive local displacement`);
  }
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
