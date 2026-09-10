import './vendor/three.min.js';
import './vendor/orbit-controls.js';
import {MODEL} from './model-data.js';
import {ATLAS} from './atlas-data.js';
import {CONTROLS} from './control-data.js';
import {ATTACHMENT_CATALOG,endpointText} from './attachment-catalog.js';
import {FITTED_ROUTES} from './route-data.js';
import {createAtlasState,formatRange} from './atlas-state.js';
import {tendonSegments,routeInfluence,rotatePoint,rigForBone,rigForTendon,jointAnchor} from './motion.js';
import {MotionController} from './motion-controller.js';
import {BoneLabels} from './bone-labels.js';
import {SideLabels} from './side-labels.js';

const THREE=window.THREE;
const atlas=createAtlasState(CONTROLS);
const tendonMeta=new Map(ATLAS.tendons.map(t=>[t.id,t]));
const specialColors={FDS3:'#ef6975',FDP3:'#eeb85b',EDC3:'#6aa2fa',RI3:'#57cca0',LU_RB3:'#b68af0',UI_UB3:'#61d7df'};
const colorFor=id=>specialColors[id]||`hsl(${Math.round(tendonMeta.get(id).modelIndex*137.508)%360},65%,66%)`;
const nodes={joints:new Map(),directions:new Map(),rows:[]};
let viewer,motion;
function element(tag,className,text){
  const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;
}
function key(dofId,id){return `${dofId}:${id}`;}

function buildPanel(){
  const catalog=document.getElementById('joint-list');
  for(const joint of CONTROLS.joints){
    const article=element('section','joint-item');article.dataset.jointId=joint.id;
    const trigger=element('button','joint-trigger');trigger.type='button';
    trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',`${joint.id}-detail`);
    trigger.append(element('span','title',joint.title),element('span','dof-count',`${joint.dofs.length} 自由度`),element('span','chevron'));
    trigger.addEventListener('click',()=>{atlas.openJoint(atlas.state.jointId===joint.id?null:joint.id);refresh();});
    const detail=element('div','joint-detail');detail.id=`${joint.id}-detail`;detail.hidden=true;
    const location=element('dl','location');location.append(element('dt','','部位'),element('dd','',`${joint.part} · ${joint.location.replace(/ (CMC|MCP|PIP|DIP|IP)$/,'')}`));
    detail.append(location);
    for(const dof of joint.dofs){
      const card=element('section','dof-card');card.dataset.dofId=dof.id;
      const head=element('div','dof-head');head.append(element('h3','dof-title',dof.action));
      const range=element('dl','range');range.append(element('dt','',dof.rangeLabel??'活动范围'),element('dd','',formatRange(dof.range)));head.append(range);
      card.append(head,element('p','neutral-label','中立位'));
      const directions=element('div','directions');const lists=[];
      for(const action of dof.directions){
        const actionKey=key(dof.id,action.id);
        const button=element('button','direction');button.type='button';button.dataset.actionKey=actionKey;
        button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',`${actionKey}-paths`);
        const title=element('span','direction-title',action.label);
        button.append(title,element('span','direction-codes',action.tendons.length?action.tendons.join(' · '):(joint.supplemental?'掌骨联动':'无')));
        button.addEventListener('click',()=>{
          if(atlas.state.direction&&key(atlas.state.direction.dofId,atlas.state.direction.id)===actionKey){motion?.replay();return;}
          atlas.selectDirection(dof.id,action.id);
          refresh();
        });
        const list=element('ul','path-list');list.id=`${actionKey}-paths`;list.hidden=true;
        for(const id of action.tendons){
          const meta=tendonMeta.get(id);const row=element('li','tendon-row');row.dataset.tendon=id;
          row.style.setProperty('--tendon-color',colorFor(id));
          const name=element('button','tendon-name');name.type='button';name.setAttribute('aria-label',`${id} ${meta.name}`);
          name.append(element('span','tendon-color'),element('span','tendon-code',id),element('span','tendon-cn',meta.name));
          name.append(element('span','tendon-endpoints',endpointText(id)));
          name.setAttribute('aria-label',`${id} ${meta.name}，${endpointText(id)}`);
          name.addEventListener('click',()=>{atlas.highlight(id);refresh();});
          const toggle=element('button','visibility-toggle','Hide');toggle.type='button';toggle.dataset.toggleTendon=id;
          toggle.addEventListener('click',()=>{atlas.toggleTendon(id);refresh();});
          row.append(name,toggle);list.append(row);nodes.rows.push({id,row,toggle});
        }
        if(!action.tendons.length)list.append(element('li','empty-action',joint.supplemental?'CMC 肌腱关联尚未配置':'无'));
        directions.append(button);lists.push(list);nodes.directions.set(actionKey,{jointId:joint.id,button,list});
      }
      card.append(directions,...lists);detail.append(card);
    }
    const total=element('div','total');total.append(element('span','','总关联的肌腱通道'),element('strong','',String(joint.tendons.length)));if(!joint.supplemental)detail.append(total);
    article.append(trigger,detail);catalog.append(article);nodes.joints.set(joint.id,{trigger,detail});
  }
}

function selectTendon(id){
  const joint=atlas.joint();if(!joint)return;
  if(!atlas.action()?.tendons.includes(id)){
    outer:for(const dof of joint.dofs)for(const action of dof.directions)if(action.tendons.includes(id)){
      atlas.selectDirection(dof.id,action.id);break outer;
    }
  }
  atlas.highlight(id);refresh();
}
function refresh(){
  const actionKey=atlas.state.direction?key(atlas.state.direction.dofId,atlas.state.direction.id):null;
  for(const [id,n] of nodes.joints){const open=id===atlas.state.jointId;n.trigger.setAttribute('aria-expanded',String(open));n.detail.hidden=!open;}
  for(const [id,n] of nodes.directions){const open=n.jointId===atlas.state.jointId&&id===actionKey;n.button.setAttribute('aria-expanded',String(open));n.list.hidden=!open;}
  for(const n of nodes.rows){
    const visible=!atlas.state.hidden.has(n.id);n.row.dataset.visible=String(visible);n.row.dataset.highlighted=String(n.id===atlas.state.highlighted);
    n.toggle.textContent=visible?'Hide':'Display';n.toggle.setAttribute('aria-label',`${visible?'Hide':'Display'} ${n.id}`);
    n.toggle.setAttribute('aria-pressed',String(visible));
  }
  viewer?.refresh();
  const joint=atlas.joint(),direction=atlas.action();
  const dof=joint?.dofs.find(d=>d.id===atlas.state.direction?.dofId);
  motion?.select(joint,dof,direction);
}

function decode(value,Type){
  const binary=atob(value);const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return new Type(bytes.buffer);
}

class TendonViewer {
  constructor(){
    this.canvas=document.getElementById('canvas');this.stage=document.getElementById('stage');this.overlay=document.getElementById('path-labels');
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x111315);
    this.camera=new THREE.PerspectiveCamera(36,1,.002,5);this.camera.up.set(0,-1,0);
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));this.renderer.outputEncoding=THREE.sRGBEncoding;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.8;
    this.controls=new THREE.OrbitControls(this.camera,this.canvas);this.controls.enableDamping=false;
    this.controls.minDistance=.15;this.controls.maxDistance=1.2;this.controls.target.set(0,-.10,0);
    this.camera.position.set(.37,-.22,.24);this.controls.update();
    this.scene.add(new THREE.HemisphereLight(0xfff6df,0x303842,.85));
    const keyLight=new THREE.DirectionalLight(0xffffff,1.15);keyLight.position.set(.6,-.5,.5);this.scene.add(keyLight);
    const fill=new THREE.DirectionalLight(0xd7e7ff,.4);fill.position.set(-.4,.4,-.3);this.scene.add(fill);
    const material=new THREE.MeshStandardMaterial({color:new THREE.Color(0xe8dfca).convertSRGBToLinear(),roughness:.72,metalness:.02,side:THREE.DoubleSide});
    this.bones=[];
    for(const bone of MODEL.bones){
      const quant=decode(bone.vertices_i16,Int16Array);const vertices=Float32Array.from(quant,v=>v*MODEL.quant);
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(vertices,3));
      geo.setIndex(new THREE.BufferAttribute(decode(bone.faces_u16,Uint16Array),1));geo.computeVertexNormals();
      const mesh=new THREE.Mesh(geo,material);mesh.name=bone.name;this.bones.push(mesh);this.scene.add(mesh);
    }
    this.boneLabels=new BoneLabels(THREE,document.getElementById('bone-labels'),this.bones);
    this.sideLabels=new SideLabels(THREE,document.getElementById('side-labels'),this.bones);
    this.tendons=new Map();const cylinder=new THREE.CylinderGeometry(1,1,1,12);
    const endpointSphere=new THREE.SphereGeometry(.00072,12,8);
    for(const meta of ATLAS.tendons){
      const color=new THREE.Color(colorFor(meta.id)).convertSRGBToLinear();const material=new THREE.MeshBasicMaterial({color,toneMapped:false,depthTest:true,depthWrite:true});
      const group=new THREE.Group();group.name=meta.id;group.visible=false;
      const segments=[];
      const fitted=FITTED_ROUTES[meta.id];
      const restSegments=tendonSegments(MODEL,meta,fitted);
      const points=restSegments.flatMap(s=>s);
      for(const [a,b] of restSegments)segments.push([new THREE.Vector3(...a),new THREE.Vector3(...b)]);
      const mesh=new THREE.InstancedMesh(cylinder,material,segments.length);mesh.userData.tendonId=meta.id;mesh.renderOrder=10;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;group.add(mesh);
      const caps=[segments[0][0],segments.at(-1)[1]].map((point,index)=>{
        const cap=new THREE.Mesh(endpointSphere,material);cap.position.copy(point);
        cap.name=index?'endpoint-end':'endpoint-start';cap.userData.tendonId=meta.id;
        cap.userData.endpoint=true;group.add(cap);return cap;
      });
      this.tendons.set(meta.id,{group,material,segments,caps,mesh,points,weights:[],radius:.00072});this.scene.add(group);
    }
    this.poseRig=null;this.poseAngle=0;this.dummy=new THREE.Object3D();this.up=new THREE.Vector3(0,1,0);
    this.setPose(null,0);
    for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{
      const offsets={oblique:[.37,-.12,.24],palm:[.45,0,.015],side:[.05,0,.45]};
      this.controls.target.set(0,-.10,0);this.camera.position.copy(this.controls.target).add(new THREE.Vector3(...offsets[button.dataset.view]));this.controls.update();this.render();
    });
    this.controls.addEventListener('change',()=>this.render());
    new ResizeObserver(()=>this.resize()).observe(this.stage);
    this.raycaster=new THREE.Raycaster();let down;
    this.canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
    this.canvas.addEventListener('pointerup',e=>{
      if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>4)return;
      const rect=this.canvas.getBoundingClientRect();const pointer=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
      this.raycaster.setFromCamera(pointer,this.camera);
      const pickable=atlas.visible().flatMap(id=>this.tendons.get(id).group.children);
      const hit=this.raycaster.intersectObjects([...pickable,...this.bones],false)[0];
      if(hit?.object.userData.tendonId)selectTendon(hit.object.userData.tendonId);
      down=null;
    });
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.getElementById('model-error').hidden=false;});
    this.canvas.addEventListener('webglcontextrestored',()=>{document.getElementById('model-error').hidden=true;this.render();});
    this.resize();
  }
  resize(){
    const w=this.stage.clientWidth,h=this.stage.clientHeight;if(!w||!h)return;
    this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.render();
  }
  refresh(){
    const visible=new Set(atlas.visible());
    for(const [id,t] of this.tendons){
      t.group.visible=visible.has(id);const selected=atlas.state.highlighted===id;
      t.material.opacity=1;
      t.radius=selected?.00105:.00072;
      t.caps.forEach(cap=>cap.scale.setScalar(selected?1.05/.72:1));
    }
    this.setPose(this.poseRig,this.poseAngle);
  }
  setPose(rig,degrees){
    const changed=this.poseRig!==rig;this.poseRig=rig;this.poseAngle=degrees;
    for(const mesh of this.bones){
      const component=rigForBone(rig,mesh.name);
      if(component){
        const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...component.axis),degrees*(component.ratio??1)*Math.PI/180);
        const pivot=new THREE.Vector3(...component.pivot);mesh.quaternion.copy(q);mesh.position.copy(pivot).sub(pivot.clone().applyQuaternion(q));
      }else{mesh.quaternion.identity();mesh.position.set(0,0,0);}
    }
    for(const [id,t] of this.tendons){
      if(changed||t.weights.length!==t.points.length)t.weights=t.points.map(p=>routeInfluence(p,rig,id));
      const component=rigForTendon(rig,id);
      const posed=t.points.map((p,i)=>rotatePoint(p,component,degrees*(component?.ratio??1)*t.weights[i]));
      t.segments.forEach(([a,b],i)=>{
        a.fromArray(posed[2*i]);b.fromArray(posed[2*i+1]);
        this.dummy.position.copy(a).add(b).multiplyScalar(.5);
        this.dummy.quaternion.setFromUnitVectors(this.up,b.clone().sub(a).normalize());
        this.dummy.scale.set(t.radius,Math.max(a.distanceTo(b),1e-8),t.radius);
        this.dummy.updateMatrix();t.mesh.setMatrixAt(i,this.dummy.matrix);
      });
      t.caps[0].position.copy(t.segments[0][0]);
      t.caps[1].position.copy(t.segments.at(-1)[1]);
      t.mesh.instanceMatrix.needsUpdate=true;
    }
    this.render();
  }
  render(){
    this.renderer.render(this.scene,this.camera);this.renderLabels();
    const width=this.stage.clientWidth,height=this.stage.clientHeight;
    this.boneLabels.render(this.camera,width,height,atlas.joint()?.part??null);
    this.sideLabels.render(this.camera,width,height,[...this.boneLabels.snapshot(),...this.pathLabelBounds]);
  }
  renderLabels(){
    const ns='http://www.w3.org/2000/svg',width=this.stage.clientWidth,height=this.stage.clientHeight;
    this.pathLabelBounds=[];
    if(!width||!height)return;
    const svg=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
    this.overlay.replaceChildren();this.overlay.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const selectedJoint=atlas.joint();if(!selectedJoint)return;
    const anchor=new THREE.Vector3(...jointAnchor(MODEL,selectedJoint));
    const visible=atlas.visible();const candidates=[];
    const labelWidth=width<500?72:86, labelHeight=width<500?22:25;
    for(const [index,id]of visible.entries()){
      const segments=this.tendons.get(id).segments;
      const choices=segments.map(([a,b])=>{
        const point=a.clone().lerp(b,.35+(index%4)*.1);
        return {point,distance:point.distanceTo(anchor)};
      }).sort((a,b)=>a.distance-b.distance);
      for(const choice of choices){
        const point=choice.point.clone().project(this.camera);if(point.z<-1||point.z>1)continue;
        const x=(point.x+1)*width/2,y=(1-point.y)*height/2;
        if(x<8||x>width-8||y<10||y>height-10)continue;
        candidates.push({id,x,y,color:colorFor(id)});break;
      }
    }
    // Two ordered gutters keep names separate and avoid crossings within a gutter.
    candidates.sort((a,b)=>a.x-b.x);const half=Math.ceil(candidates.length/2);
    const sides=[candidates.slice(0,half),candidates.slice(half)];
    for(const [side,labels]of sides.entries()){
      labels.sort((a,b)=>a.y-b.y);const gap=Math.min(33,(height-54)/Math.max(1,labels.length));
      let last=16-gap;
      labels.forEach(l=>{l.labelY=Math.max(l.y,last+gap);last=l.labelY;});
      if(last>height-22){let next=height-22+gap;for(let i=labels.length-1;i>=0;i--){labels[i].labelY=Math.min(labels[i].labelY,next-gap);next=labels[i].labelY;}}
      if(labels[0]?.labelY<22){const shift=22-labels[0].labelY;labels.forEach(l=>l.labelY+=shift);}
      for(const l of labels){
        const left=side===0?15:width-labelWidth-15;
        const group=svg('g',{class:'path-callout',tabindex:0,role:'button','aria-label':`${l.id} ${tendonMeta.get(l.id).name}`,'data-tendon':l.id,'data-highlighted':atlas.state.highlighted===l.id});
        const defs=svg('defs'),marker=svg('marker',{id:`arrow-${l.id}`,viewBox:'0 0 8 8',refX:7,refY:4,markerWidth:7,markerHeight:7,orient:'auto',markerUnits:'userSpaceOnUse'});
        marker.append(svg('path',{d:'M0 0 L8 4 L0 8 Z',fill:l.color}));defs.append(marker);
        const sx=side===0?left+labelWidth:left,sy=l.labelY;
        const line=svg('path',{d:`M${sx},${sy} L${l.x},${l.y}`,fill:'none',stroke:l.color,'stroke-width':1.15,opacity:.9,'marker-end':`url(#arrow-${l.id})`,'pointer-events':'none'});
        this.pathLabelBounds.push({x:left,y:sy-labelHeight/2,width:labelWidth,height:labelHeight});
        const rect=svg('rect',{x:left,y:sy-labelHeight/2,width:labelWidth,height:labelHeight,rx:5,stroke:l.color});
        const text=svg('text',{x:left+labelWidth/2,y:sy+4,'text-anchor':'middle',fill:l.color});text.textContent=l.id;
        group.append(rect,text);group.addEventListener('click',()=>selectTendon(l.id));
        group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectTendon(l.id);}});
        this.overlay.append(defs,line,group);
      }
    }
  }
}

buildPanel();
try{viewer=new TendonViewer();motion=new MotionController(viewer,MODEL);}catch(error){document.getElementById('model-error').hidden=false;console.error(error);}
atlas.openJoint('joint_bone11');
atlas.selectDirection('middle_MCP_flex','positive');
refresh();
// Read-only inspection lets integration checks verify actual rendered visibility.
window.tendonAtlas=Object.freeze({snapshot:()=>({jointId:atlas.state.jointId,direction:atlas.state.direction,
  scope:[...atlas.scope()],visible:atlas.visible(),highlighted:atlas.state.highlighted,
  rendered:viewer?[...viewer.tendons].filter(([,t])=>t.group.visible).map(([id])=>id):[],
  boneCount:viewer?.bones.length||0,labelIds:[...document.querySelectorAll('.path-callout')].map(n=>n.dataset.tendon),
  boneLabels:viewer?.boneLabels.snapshot()??[],
  sideLabels:viewer?.sideLabels.snapshot()??[],
  geometryRevision:2,
  endpoints:viewer?[...viewer.tendons].map(([id,t])=>({id,start:t.caps[0].position.toArray(),end:t.caps[1].position.toArray(),
    depthTest:t.material.depthTest,catalog:ATTACHMENT_CATALOG[id]})):[],
  motion:motion?.snapshot(),ready:Boolean(viewer)})});
