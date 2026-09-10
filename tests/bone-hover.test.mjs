import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {THREE} from '../scripts/surface-geometry.mjs';
import {BoneHover,tooltipPosition} from '../bone-hover.js';

class Node {
 constructor(){this.events={};this.style={};this.children=[];this.clientWidth=400;this.clientHeight=300;this.offsetWidth=112;this.offsetHeight=30;}
 addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
 emit(name,event={}){for(const fn of this.events[name]??[])fn(event);}
 append(child){this.children.push(child);}
 setAttribute(name,value){this[name]=value;}
 getBoundingClientRect(){return {left:20,top:50,width:this.clientWidth,height:this.clientHeight};}
}
function setup(){
 const canvas=new Node(),stage=new Node(),doc=new Node(),win=new Node();
 doc.createElement=()=>new Node();globalThis.document=doc;globalThis.window=win;
 const camera=new THREE.PerspectiveCamera(40,4/3,.01,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 const bone=(id,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,.2));m.name=id;m.position.z=z;m.updateMatrixWorld(true);return m;};
 const front=bone('3mc',1),back=bone('3proxph',0),bones=[back,front],occluders=[];
 let renders=0;
 const hover=new BoneHover(THREE,canvas,stage,bones,()=>{renders++;hover.render(camera);},()=>occluders);
 const move=(extra={})=>canvas.emit('pointermove',{clientX:220,clientY:200,pointerType:'mouse',buttons:0,...extra});
 return {canvas,stage,doc,win,camera,front,back,occluders,hover,move,renders:()=>renders};
}
test('a single hover name identifies the nearest bone without permanent labels',()=>{
 const s=setup();assert.equal(s.stage.children.length,1);assert.equal(s.hover.tooltip.hidden,true);
 s.move();assert.deepEqual(s.hover.snapshot(),{id:'3mc',name:'第3掌骨'});
 assert.equal(s.hover.tooltip.textContent,'第3掌骨');assert.equal(s.hover.tooltip.hidden,false);
 assert.equal(s.hover.tooltip.children.length,0);
 s.move({clientX:25,clientY:55});assert.equal(s.hover.snapshot(),null);assert.equal(s.hover.tooltip.hidden,true);
 assert.equal(s.stage.children.length,1);
});
test('stationary pointer follows moving bones and does not label through tendon occlusion',()=>{
 const s=setup();s.move();s.front.position.x=2;s.front.updateMatrixWorld(true);
 s.hover.render(s.camera);assert.equal(s.hover.snapshot().id,'3proxph');
 const tendon=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.2));tendon.position.z=2;tendon.updateMatrixWorld(true);s.occluders.push(tendon);
 s.hover.render(s.camera);assert.equal(s.hover.snapshot(),null);
 tendon.visible=false;s.hover.render(s.camera);assert.equal(s.hover.snapshot().id,'3proxph');
 s.back.position.x=2;s.back.updateMatrixWorld(true);s.hover.render(s.camera);assert.equal(s.hover.snapshot(),null);
});
test('camera changes rerun picking instead of leaving a stale bone name',()=>{
 const s=setup();s.move();s.camera.lookAt(10,0,0);s.camera.updateMatrixWorld(true);
 s.hover.render(s.camera);assert.equal(s.hover.snapshot(),null);
});
test('drag, touch, pointer exit, focus loss and Escape clear the hover',()=>{
 const s=setup();
 for(const event of ['pointerdown','pointerleave','pointercancel','lostpointercapture','webglcontextlost']){
  s.move();s.canvas.emit(event);assert.equal(s.hover.snapshot(),null);assert.equal(s.hover.pointer,null);
 }
 s.move();s.move({buttons:1});assert.equal(s.hover.snapshot(),null);
 s.move();s.move({pointerType:'touch'});assert.equal(s.hover.snapshot(),null);
 s.move();s.win.emit('blur');assert.equal(s.hover.snapshot(),null);
 s.move();s.doc.hidden=true;s.doc.emit('visibilitychange');assert.equal(s.hover.snapshot(),null);
 s.move();s.doc.emit('keydown',{key:'Escape'});assert.equal(s.hover.snapshot(),null);
});
test('tooltip stays inside narrow viewports and flips away from the cursor near edges',()=>{
 for(const [w,h] of [[320,280],[1000,650]])for(const x of [0,w/2,w-1])for(const y of [0,h/2,h-1]){
  const p=tooltipPosition(x,y,w,h,140,30);
  assert.ok(p.x>=6&&p.y>=6&&p.x+140<=w-6&&p.y+30<=h-6);
 }
 assert.ok(tooltipPosition(315,275,320,280,140,30).x<315-140);
});
test('page uses hover instead of persistent bone labels and preserves existing interactions',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.ok(!html.includes('id="bone-labels"'));assert.ok(!app.includes('new BoneLabels'));
 assert.match(app,/new BoneHover/);assert.match(app,/this\.boneHover\.render\(this\.camera\)/);
 assert.match(html,/id="path-labels"/);assert.match(html,/id="side-labels"/);
 assert.match(css,/\.bone-hover\{[^}]*pointer-events:none/);
});
