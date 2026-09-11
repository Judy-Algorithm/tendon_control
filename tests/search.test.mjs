import test from 'node:test';
import assert from 'node:assert/strict';
import {ATLAS} from '../atlas-data.js';
import {CONTROLS} from '../control-data.js';
import {MODEL} from '../model-data.js';
import {createAtlasState,findMuscles} from '../atlas-state.js';
import {MuscleSearch} from '../muscle-search.js';
import {MotionController} from '../motion-controller.js';

test('every enabled abbreviation resolves exactly, including case, separators and full-width input',()=>{
  for(const tendon of ATLAS.tendons){
    for(const query of [tendon.id,tendon.id.toLowerCase(),tendon.id.replaceAll('_',' '),tendon.id.replaceAll('_','-')]){
      assert.deepEqual(findMuscles(ATLAS.tendons,query),[tendon.id]);
    }
  }
  assert.deepEqual(findMuscles(ATLAS.tendons,' ｆｄｓ３ '),['FDS3']);
  assert.deepEqual(findMuscles(ATLAS.tendons,'lu rb 3'),['LU_RB3']);
  assert.deepEqual(findMuscles(ATLAS.tendons,'uiub5'),['UI_UB5']);
});
test('family prefixes return all modeled branches; blank, punctuation-only and unknown codes never show all',()=>{
  assert.deepEqual(findMuscles(ATLAS.tendons,'FDS').sort(),['FDS2','FDS3','FDS4','FDS5']);
  assert.deepEqual(findMuscles(ATLAS.tendons,'fd').sort(),['FDP2','FDP3','FDP4','FDP5','FDS2','FDS3','FDS4','FDS5']);
  for(const query of ['', '   ','__-','FDS9','PT','PQ','<script>'])assert.deepEqual(findMuscles(ATLAS.tendons,query),[]);
});
test('search reveals a hidden route independently of the selected joint and clearing restores a neutral empty scope',()=>{
  const c=createAtlasState(CONTROLS);
  c.openJoint('joint_bone11');c.selectDirection('middle_MCP_flex','positive');c.toggleTendon('FDS3');
  c.setSearch('fds3');
  assert.equal(c.joint(),null);assert.equal(c.action(),null);
  assert.deepEqual(c.visible(),['FDS3']);assert.equal(c.state.highlighted,'FDS3');
  c.setSearch('FDP5');assert.deepEqual(c.visible(),['FDP5']);assert.equal(c.state.highlighted,'FDP5');
  c.setSearch('FDS9');assert.deepEqual(c.visible(),[]);assert.equal(c.state.highlighted,null);
  c.setSearch('');assert.deepEqual(c.visible(),[]);assert.equal(c.state.search,'');
});
test('opening any ROM group exits search and restores that group’s normal tendon scope',()=>{
  const c=createAtlasState(CONTROLS);
  for(const joint of CONTROLS.joints){
    c.setSearch('FDP5');c.openJoint(joint.id);
    assert.equal(c.state.search,'');assert.deepEqual(c.state.searchIds,[]);
    assert.deepEqual(c.visible(),joint.tendons);
    for(const dof of joint.dofs)for(const action of dof.directions){
      c.selectDirection(dof.id,action.id);assert.deepEqual(c.visible(),action.tendons);
    }
  }
});
class Node {
  constructor(){this.events={};this.children=[];this.value='';this.hidden=false;}
  addEventListener(event,fn){(this.events[event]??=[]).push(fn);}
  emit(event,extra={}){for(const fn of this.events[event]??[])fn({preventDefault(){},...extra});}
  setAttribute(key,value){this[key]=value;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  focus(){document.activeElement=this;}
}
function setup(){
  const nodes=new Map();
  globalThis.document={activeElement:null,hidden:false,addEventListener(){},
    getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);},createElement:()=>new Node()};
  document.getElementById('motion-controls').hidden=true;
  globalThis.matchMedia=()=>({matches:false});
  let next=0;const frames=new Map();
  globalThis.requestAnimationFrame=fn=>{frames.set(++next,fn);return next;};
  globalThis.cancelAnimationFrame=id=>frames.delete(id);
  const state=createAtlasState(CONTROLS),viewer={pose:{rig:null,angle:0},setPose(rig,angle){this.pose={rig,angle};}};
  const motion=new MotionController(viewer,MODEL);let search;
  function refresh(){
    search.refresh();
    const joint=state.joint(),action=state.action(),dof=joint?.dofs.find(d=>d.id===state.state.direction?.dofId);
    motion.select(joint,dof,action);
  }
  search=new MuscleSearch(state,ATLAS.tendons,refresh);refresh();
  const input=document.getElementById('muscle-search-input');
  const type=value=>{input.value=value;input.emit('input');};
  return {state,viewer,motion,search,refresh,nodes,input,type,frames};
}
test('live input displays family results with Chinese names; selecting a result isolates it and focuses the input',()=>{
  const s=setup();
  assert.deepEqual(s.state.visible(),[]);assert.equal(s.frames.size,0);
  s.type('fds');assert.equal(s.search.buttons.length,4);assert.equal(s.frames.size,0);
  for(const button of s.search.buttons)assert.match(button.children[1].textContent,/[\u4e00-\u9fff]/);
  const target=s.search.buttons.find(b=>b.children[0].textContent==='FDS3');target.emit('click');
  assert.deepEqual(s.state.visible(),['FDS3']);assert.equal(s.input.value,'FDS3');
  assert.equal(s.state.state.highlighted,'FDS3');assert.equal(document.activeElement,s.input);
  assert.equal(s.search.buttons.length,1);
  assert.match(s.nodes.get('muscle-search-status').textContent,/已显示 1/);
});
test('searching during animation stops playback, resets the pose and hides motion controls; ROM remains usable',()=>{
  const s=setup();
  s.state.openJoint('joint_bone11');s.state.selectDirection('middle_MCP_flex','positive');s.refresh();
  s.frames.clear();s.motion.tick(s.motion.last+80);assert.ok(s.viewer.pose.angle>0);
  s.type('fdp5');
  assert.equal(s.motion.playing,false);assert.equal(s.frames.size,0);
  assert.deepEqual(s.viewer.pose,{rig:null,angle:0});assert.equal(s.motion.snapshot().angle,0);
  assert.equal(s.nodes.get('motion-controls').hidden,true);assert.deepEqual(s.state.visible(),['FDP5']);
  s.state.openJoint('joint_bone11');s.refresh();assert.equal(s.input.value,'');
  s.state.selectDirection('middle_MCP_flex','negative');s.refresh();
  assert.equal(s.motion.playing,true);assert.equal(s.frames.size,1);
  assert.deepEqual(s.state.visible(),['EDC3']);
});
test('clear, Escape, keyboard result access, submit and unmatched input keep UI and model scope in sync',()=>{
  const s=setup();s.type('FDS');
  s.input.emit('keydown',{key:'ArrowDown'});assert.equal(document.activeElement,s.search.buttons[0]);
  s.nodes.get('muscle-search-form').emit('submit');assert.equal(s.state.visible().length,4);
  s.input.emit('keydown',{key:'Escape'});
  assert.deepEqual(s.state.visible(),[]);assert.equal(s.input.value,'');
  assert.equal(s.nodes.get('muscle-search-results').hidden,true);assert.equal(s.nodes.get('muscle-search-clear').hidden,true);
  s.type('does-not-exist');assert.deepEqual(s.state.visible(),[]);assert.equal(s.search.buttons.length,0);
  assert.match(s.nodes.get('muscle-search-status').textContent,/未找到/);
  s.type('FDP5');s.nodes.get('muscle-search-clear').emit('click');
  assert.deepEqual(s.state.visible(),[]);assert.equal(document.activeElement,s.input);
});
test('composition waits for completed input and external ROM changes clear stale search results',()=>{
  const s=setup();s.input.value='ｆｄｓ３';s.input.emit('input',{isComposing:true});
  assert.deepEqual(s.state.visible(),[]);
  s.input.emit('compositionend');assert.deepEqual(s.state.visible(),['FDS3']);
  s.state.openJoint('joint_ulnar_cmc');s.refresh();
  assert.equal(s.input.value,'');assert.equal(s.search.buttons.length,0);assert.equal(s.search.results.hidden,true);
  assert.equal(s.state.joint().id,'joint_ulnar_cmc');
});
