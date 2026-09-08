import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MotionController} from '../motion-controller.js';
import {MODEL} from '../model-data.js';
import {ATLAS} from '../atlas-data.js';

const nodes=new Map();
class Control {
 constructor(){this.events={};this.hidden=false;}
 addEventListener(event,fn){this.events[event]=fn;}
 setAttribute(key,value){this[key]=value;}
}
globalThis.document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Control());return nodes.get(id);},addEventListener(){}};
globalThis.matchMedia=()=>({matches:false});
let pending=new Map(),nextId=0;
globalThis.requestAnimationFrame=fn=>{const id=++nextId;pending.set(id,fn);return id;};
globalThis.cancelAnimationFrame=id=>pending.delete(id);
const setup=()=>{
 pending.clear();nodes.clear();
 const poses=[],viewer={setPose:(rig,angle)=>poses.push({rig,angle})};
 const controller=new MotionController(viewer,MODEL);
 return {controller,poses};
};
const select=(c,dofId,directionId)=>{
 const j=ATLAS.joints.find(j=>j.dofs.some(d=>d.id===dofId));
 const d=j.dofs.find(d=>d.id===dofId);
 c.select(j,d,d.directions.find(a=>a.id===directionId));
};
test('all direction switches leave one animation, stop at valid endpoint and never accumulate transforms',()=>{
 const {controller:c,poses}=setup();
 for(const j of ATLAS.joints)for(const d of j.dofs)for(const a of d.directions){
  c.select(j,d,a);assert.equal(pending.size,1);
  assert.equal(poses.at(-2).rig,null);
  let time=c.last;
  while(c.playing){pending.clear();time+=80;c.tick(time);}
  assert.equal(c.degrees,a.id==='positive'?d.range.max:d.range.min);
  assert.equal(pending.size,0);
 }
});
test('pause freezes pose and play resumes',()=>{
 const {controller:c}=setup();select(c,'middle_MCP_flex','positive');
 pending.clear();c.tick(c.last+80);const angle=c.degrees;c.pause();c.tick(c.last+80);
 assert.equal(c.degrees,angle);assert.equal(pending.size,0);
 c.resume();assert.equal(c.degrees,angle);assert.equal(pending.size,1);
});
test('one playback button pauses, resumes, and replays after completion',()=>{
 const {controller:c}=setup();select(c,'middle_MCP_flex','positive');
 const button=nodes.get('motion-play');
 assert.equal(nodes.has('motion-replay'),false);
 assert.equal(button.textContent,'暂停');
 pending.clear();c.tick(c.last+80);const angle=c.degrees;
 button.events.click();assert.equal(c.playing,false);assert.equal(button.textContent,'播放');
 button.events.click();assert.equal(c.playing,true);assert.equal(c.degrees,angle);
 while(c.playing){pending.clear();c.tick(c.last+80);}
 assert.equal(button.textContent,'重播');assert.equal(pending.size,0);
 button.events.click();assert.equal(c.progress,0);assert.equal(c.degrees,c.baseRange.start);
 assert.equal(button.textContent,'暂停');assert.equal(pending.size,1);
});
test('simplified markup removes requested hints, speed selector, and status text',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const removed of ['选择 ROM 动作，观察骨骼与肌腱随动','拖动可逐帧观察','preview-badge','motion-replay','motion-speed','motion-status'])assert.ok(!html.includes(removed));
 assert.equal((html.match(/id="motion-play"/g)||[]).length,1);
 const {controller:c}=setup();select(c,'middle_MCP_flex','positive');
 assert.equal(nodes.has('motion-speed'),false);assert.equal(nodes.has('motion-status'),false);
 pending.clear();c.tick(c.last+80);assert.ok(Math.abs(c.progress-80/2400)<1e-12);
});
test('manual observation, neutral, and replay restore the original range',()=>{
 const {controller:c}=setup();select(c,'middle_PIP_flex','negative');
 const initial=c.degrees;assert.ok(initial>0);
 nodes.get('motion-progress').value='35';nodes.get('motion-progress').events.input();
 assert.equal(c.degrees,35);assert.equal(c.playing,false);
 c.resume();assert.equal(c.degrees,35);
 c.replay();assert.equal(c.degrees,initial);
 c.neutral();assert.equal(c.degrees,0);assert.equal(c.playing,false);
 c.replay();assert.equal(c.degrees,initial);
});
test('hiding or highlighting a tendon does not restart the selected action',()=>{
 const {controller:c}=setup();select(c,'middle_MCP_flex','positive');
 pending.clear();c.tick(c.last+80);const a=c.degrees,p=c.progress;
 select(c,'middle_MCP_flex','positive');assert.equal(c.degrees,a);assert.equal(c.progress,p);
 c.select(null,null,null);assert.equal(c.rig,null);assert.equal(c.playing,false);assert.equal(nodes.get('motion-controls').hidden,true);
});
test('reduced motion waits for explicit play',()=>{
 globalThis.matchMedia=()=>({matches:true});
 const {controller:c}=setup();select(c,'middle_MCP_flex','positive');
 assert.equal(c.playing,false);assert.equal(c.degrees,0);assert.equal(pending.size,0);
 c.resume();assert.equal(c.playing,true);
 globalThis.matchMedia=()=>({matches:false});
});
