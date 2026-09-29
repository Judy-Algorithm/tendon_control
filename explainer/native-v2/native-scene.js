import '../../vendor/three.min.js';
import '../../vendor/orbit-controls.js';

const T = window.THREE;
const finitePoint = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
export const nativeFrameValid = (frame,run=null) => !!frame && frame.valid !== false && frame.nativeSolverFailed !== true && run?.manifest?.qc?.numericPassed !== false;
export function activationColor(value, valid=true) {
  if(!valid||!Number.isFinite(value)||value<0||value>1)return 0x81878d;
  const low=[62,119,133],middle=[174,133,213],high=[250,121,105];
  const a=value<.5?low:middle,b=value<.5?middle:high,t=value<.5?value*2:(value-.5)*2;
  return a.reduce((rgb,v,i)=>rgb|(Math.round(v+(b[i]-v)*t)<<(16-i*8)),0);
}
export function markerResiduals(frame){
  const observed=frame?.observedMarkers_m||[],fitted=frame?.fittedMarkers_m||[],pairs=[];
  const total=Math.max(observed.length,fitted.length);let sum=0,max=0;
  for(let i=0;i<total;i++)if(finitePoint(observed[i])&&finitePoint(fitted[i])){const distance=Math.hypot(...observed[i].map((v,j)=>v-fitted[i][j]));pairs.push({observed:observed[i],fitted:fitted[i],distance});sum+=distance*distance;max=Math.max(max,distance);}
  return {pairs,missingCount:total-pairs.length,rms_m:pairs.length?Math.sqrt(sum/pairs.length):null,max_m:pairs.length?max:null};
}
export function pathLength(points) {
  if (!Array.isArray(points) || points.some(p => !finitePoint(p))) return null;
  return points.slice(1).reduce((sum, p, i) => sum + Math.hypot(...p.map((v, j) => v - points[i][j])), 0);
}
export function inspectNativeFrame(run, index = 0) {
  const frame = run?.frames?.[index];
  if (!frame) throw new Error('Native frame is unavailable.');
  const names = run.muscleNames || [];
  const paths = names.map((_, i) => {
    const points = frame.paths?.[i];
    return Array.isArray(points) && points.length >= 2 && points.every(finitePoint) ? points : null;
  });
  return {frame, paths, names, missingPathIndices: paths.flatMap((p, i) => p ? [] : [i]),
    sampledLengths_m: paths.map(p => p ? pathLength(p) : null)};
}
export function inspectNativeOverlay(current, baseline, currentIndex=0, explicitFrame=null) {
  if(!current||!baseline)return null;
  const a=current.manifest,b=baseline.manifest;
  if(!a?.modelId||!a?.modelHash||a.modelId!==b?.modelId||a.modelHash!==b?.modelHash||JSON.stringify(current.muscleNames)!==JSON.stringify(baseline.muscleNames)||JSON.stringify(current.coordinateNames)!==JSON.stringify(baseline.coordinateNames))throw new Error('叠加需要相同模型标识、原生坐标系与通道顺序');
  const time=current.frames?.[currentIndex]?.time_s,frames=baseline.frames;
  if(!Array.isArray(frames)||!frames.length)throw new Error('基线没有原生记录帧');
  let index=explicitFrame;
  if(index!==null&&index!==undefined){if(!Number.isInteger(index)||index<0||index>=frames.length)throw new Error('基线帧索引无效');}
  else{
    if(!Number.isFinite(time)||!Number.isFinite(frames[0].time_s)||!Number.isFinite(frames.at(-1).time_s)||time<frames[0].time_s-1e-10||time>frames.at(-1).time_s+1e-10)return {available:false,time_s:time,reason:'当前时间超出基线记录范围'};
    index=0;for(let i=1;i<frames.length;i++)if(Math.abs(frames[i].time_s-time)<Math.abs(frames[index].time_s-time))index=i;
  }
  const info=inspectNativeFrame(baseline,index);
  return {...info,available:true,index,time_s:info.frame.time_s,currentTime_s:time,timeDifference_s:info.frame.time_s-time,explicitFrame:explicitFrame!==null&&explicitFrame!==undefined,valid:nativeFrameValid(info.frame,baseline)};
}
export function wxyzQuaternion(q = [1, 0, 0, 0]) { return new T.Quaternion(q[1], q[2], q[3], q[0]); }
export function composeNativeTransform(position, quaternion) {
  return new T.Matrix4().compose(new T.Vector3(...position), wxyzQuaternion(quaternion), new T.Vector3(1, 1, 1));
}
/** External-load INPUT, not a muscle force or inferred contact. Only exported
 * OpenSim body-local point + body-to-ground transform + ground force are used. */
export function nativeExternalLoad(run,frame){
  const e=run?.manifest?.effective;
  if(!/^opensim$/i.test(run?.manifest?.engine||'')||!e||!finitePoint(e.loadPointBody_m)||!finitePoint(e.loadVectorGround_N)||typeof e.loadBody!=='string')return null;
  const matrix=frame?.bodyTransforms?.[e.loadBody]?.flat();
  if(matrix?.length!==16||!matrix.every(Number.isFinite)||matrix.slice(12).some((v,i)=>Math.abs(v-(i===3?1:0))>1e-10))return null;
  const magnitude_N=Math.hypot(...e.loadVectorGround_N);if(!(magnitude_N>0))return null;
  const point=e.loadPointBody_m;
  const pointGround_m=[0,1,2].map(row=>matrix[row*4+3]+point.reduce((sum,v,j)=>sum+matrix[row*4+j]*v,0));
  return {body:e.loadBody,pointBody_m:[...point],pointGround_m,forceGround_N:[...e.loadVectorGround_N],directionGround:e.loadVectorGround_N.map(v=>v/magnitude_N),magnitude_N};
}

/** Read-only display adapter. No forward kinematics, muscle solve, rescaling or fabricated wraps. */
export class NativeScene {
  constructor({host, onSelect = () => {}}) {
    this.host = host; this.onSelect = onSelect; this.disposed = false; this.resources = new Set();
    this.oldPosition = host.style.position; if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;';
    this.canvas.setAttribute('aria-label', '原生模型三维回放；拖动旋转、滚轮缩放，点击肌肉路径选择通道。');
    this.canvas.tabIndex = 0; host.append(this.canvas);
    this.caption = document.createElement('div');
    this.caption.style.cssText = 'position:absolute;bottom:12px;left:12px;right:12px;pointer-events:none;color:#c4d2d7;font:12px/1.6 system-ui;background:#11191cdb;border:1px solid #ffffff18;border-radius:8px;padding:8px 10px;';
    host.append(this.caption);
    this.forceLabel=document.createElement('div');this.forceLabel.tabIndex=0;this.forceLabel.setAttribute('role','note');this.forceLabel.style.cssText='display:none;position:absolute;max-width:190px;padding:4px 7px;border:1px solid #efb16688;border-radius:5px;background:#162024ee;color:#ffd09a;font:11px/1.4 system-ui;';host.append(this.forceLabel);
    this.legend=document.createElement('div');
    this.legend.style.cssText='position:absolute;top:12px;right:12px;padding:7px 10px;pointer-events:none;background:#11191cdb;border:1px solid #ffffff18;border-radius:8px;color:#d3e0e4;font:11px/1.5 system-ui;';
    this.legend.innerHTML='<span>激活 a · 统一色标</span><div style="height:5px;width:126px;margin:5px 0;background:linear-gradient(90deg,#3e7785,#ae85d5,#fa7969)"></div><div style="display:flex;justify-content:space-between"><span>0</span><span>0.5</span><span>1</span></div>';
    this.legend.title='所有肌肉与比较视图共用 0–1 激活色标；灰色表示失败、缺失或越界值。选中路径加粗仅用于高亮，不表示肌腱直径。';host.append(this.legend);
    this.overlayLegend=document.createElement('div');this.overlayLegend.style.cssText='display:none;margin-top:7px;padding-top:6px;border-top:1px solid #ffffff25;max-width:175px;';this.legend.append(this.overlayLegend);
    try { this.renderer = new T.WebGLRenderer({canvas:this.canvas, antialias:true, alpha:true}); }
    catch { this.caption.textContent = '此设备不支持 WebGL；原生数值与图表仍可查看。'; return; }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputEncoding = T.sRGBEncoding;
    this.renderer.setClearColor(0x101619, 0);
    this.scene = new T.Scene(); this.camera = new T.PerspectiveCamera(35, 1, .001, 100);
    this.controls = new T.OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = false;
    this.onCameraChange = () => { this.render(); if(!this.applyingCamera) this.cameraListener?.(this.getCameraState()); };
    this.controls.addEventListener('change', this.onCameraChange);
    this.scene.add(new T.HemisphereLight(0xfff7e8, 0x425b68, 1.3));
    const light = new T.DirectionalLight(0xffffff, 1); light.position.set(1, 1, 2); this.scene.add(light);
    this.pathGroup = new T.Group(); this.bodyGroup = new T.Group(); this.wrapGroup=new T.Group();this.scene.add(this.bodyGroup, this.pathGroup,this.wrapGroup);
    this.overlayGroup=new T.Group();this.scene.add(this.overlayGroup);
    this.markerGroup=new T.Group();this.scene.add(this.markerGroup);
    this.axisLine=new T.Line(this.own(new T.BufferGeometry()),this.own(new T.LineBasicMaterial({color:0x88bfe9,transparent:true,opacity:.85})));this.axisLine.visible=false;this.scene.add(this.axisLine);
    this.raycaster = new T.Raycaster(); this.raycaster.params.Line.threshold = .002;
    this.pointerStart = null;
    this.pointerDown = e => { this.pointerStart = [e.clientX, e.clientY]; };
    this.pointerUp = e => {
      if (!this.pointerStart || Math.hypot(e.clientX-this.pointerStart[0],e.clientY-this.pointerStart[1]) > 6) return;
      const r = this.canvas.getBoundingClientRect();
      this.raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),this.camera);
      const hit = this.raycaster.intersectObjects(this.pathGroup.children, true)[0];
      if (hit) this.onSelect({kind:'muscle',index:hit.object.userData.muscleIndex,muscleIndex:hit.object.userData.muscleIndex,name:this.run.muscleNames[hit.object.userData.muscleIndex]});
    };
    this.canvas.addEventListener('pointerdown', this.pointerDown); this.canvas.addEventListener('pointerup', this.pointerUp);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize();
  }
  own(resource) { this.resources.add(resource); return resource; }
  clearGroup(group) {
    if (!group) return;
    for (const child of [...group.children]) {
      child.traverse(o => { if (o.geometry) { o.geometry.dispose(); this.resources.delete(o.geometry); }
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of materials) if (m) {m.dispose();this.resources.delete(m);} });
      group.remove(child);
    }
  }
  setModel(model) {
    this.model = model; if (!this.renderer) return;
    this.clearGroup(this.bodyGroup);this.clearGroup(this.wrapGroup); this.meshes = [];this.wraps=[];
    const sourceMeshes = new Map((model?.meshes || []).map(m => [m.id, m]));
    for (const geom of model?.geoms || []) {
      if (geom.display === false || geom.defaultVisible === false) continue;
      const source = sourceMeshes.get(geom.meshId);
      if(!source&&geom.isWrap){
        let shape=null;
        if(geom.type==='mjGEOM_SPHERE')shape=new T.SphereGeometry(geom.size[0],20,12);
        if(geom.type==='mjGEOM_CYLINDER'){shape=new T.CylinderGeometry(geom.size[0],geom.size[0],2*geom.size[1],24);shape.rotateX(Math.PI/2);}
        if(shape){const wrap=new T.Mesh(this.own(shape),this.own(new T.MeshBasicMaterial({color:0x6ab7af,wireframe:true,transparent:true,opacity:.26,depthWrite:false})));wrap.matrixAutoUpdate=false;wrap.userData={geom,local:composeNativeTransform(geom.localPos,geom.localQuat)};this.wrapGroup.add(wrap);this.wraps.push(wrap);}
      }
      if (!source) continue;
      const geometry = this.own(new T.BufferGeometry());
      geometry.setAttribute('position', new T.Float32BufferAttribute(source.vertices.flat(), 3));
      geometry.setIndex(source.faces.flat()); geometry.computeVertexNormals();
      const material = this.own(new T.MeshStandardMaterial({color:0xe5ddc8, roughness:.7, metalness:.03, side:T.DoubleSide}));
      const mesh = new T.Mesh(geometry, material); mesh.matrixAutoUpdate = false;
      const local=geom.localMatrix?new T.Matrix4().set(...geom.localMatrix):composeNativeTransform(geom.localPos || [0,0,0], geom.localQuat || [1,0,0,0]);
      if(geom.scaleFactors)local.multiply(new T.Matrix4().makeScale(...geom.scaleFactors));
      mesh.userData = {geom, local};
      this.bodyGroup.add(mesh); this.meshes.push(mesh);
    }
    // OpenSim native wrapping objects: radius/length and ellipsoid semi-axes,
    // transformed by the exact exported body-local matrix. Unexported torus
    // dimensions are not guessed or replaced by spheres.
    for(const source of model?.wrapObjects||[]){
      if(source.active===false)continue;let shape=null;
      if(source.class==='WrapEllipsoid'&&finitePoint(source.dimensions)&&source.dimensions.every(v=>v>0)){shape=new T.SphereGeometry(1,24,16);shape.scale(...source.dimensions);}
      if(source.class==='WrapCylinder'&&source.radius>0&&source.length>0){shape=new T.CylinderGeometry(source.radius,source.radius,source.length,24);shape.rotateX(Math.PI/2);}
      if(!shape)continue;
      const wrap=new T.Mesh(this.own(shape),this.own(new T.MeshBasicMaterial({color:0x6ab7af,wireframe:true,transparent:true,opacity:.3,depthWrite:false})));
      wrap.matrixAutoUpdate=false;wrap.userData={geom:{bodyId:source.body,isWrap:true,id:source.id,openSimWrap:true},local:new T.Matrix4().set(...source.localTransform.flat())};
      this.wrapGroup.add(wrap);this.wraps.push(wrap);
    }
    if (this.run) this.setFrame(this.index || 0, this.selected || 0, this.coordinate || 0);
  }
  setRun(run) {
    if (!Array.isArray(run?.muscleNames) || !Array.isArray(run?.frames) || !run.frames.length) throw new Error('A native run needs named muscles and recorded frames.');
    this.clearOverlay();
    this.run = run; this.fitted = false;
    if (this.renderer) this.clearGroup(this.pathGroup);
    this.selectionPath=null;
    this.paths = run.muscleNames.map((name, i) => {
      if (!this.renderer) return null;
      const geometry = this.own(new T.BufferGeometry());
      const material = this.own(new T.LineBasicMaterial({color:0x559d95,transparent:true,opacity:.55}));
      const line = new T.Line(geometry, material); line.userData = {muscleIndex:i}; this.pathGroup.add(line); return line;
    });
    this.setFrame(0, 0, 0);
  }
  setFrame(index, selectedMuscleIndex = 0, coordinateIndex = 0) {
    if (!this.run) return;
    index = Math.max(0,Math.min(this.run.frames.length-1,Math.round(index)));
    const info = inspectNativeFrame(this.run,index); this.info = info; this.index=index;
    this.selected = Math.max(0,Math.min(info.names.length-1,Number(selectedMuscleIndex)||0)); this.coordinate=coordinateIndex;
    const activation = info.frame.activation?.[this.selected];
    const positiveTension=info.frame.tension_N?.[this.selected];
    const force = Number.isFinite(positiveTension)?positiveTension:info.frame.force_N?.[this.selected];
    const valid=nativeFrameValid(info.frame,this.run);
    const fmt = x => Number.isFinite(x) ? x.toFixed(3) : '未记录';
    this.caption.textContent = `${this.renderer?'':'WebGL 不可用 · '}${valid?'':'此帧求解失败 · '}${info.names[this.selected]} · 激活 ${valid?fmt(activation):'无有效结果'} · ${Number.isFinite(positiveTension)?'张力':'肌力'} ${valid?fmt(force):'—'} N · ${fmt(info.frame.time_s)} s · 原生路径 ${info.names.length-info.missingPathIndices.length}/${info.names.length}${this.model?'':' · 未提供表面网格'}`;
    this.updateExternalLoad(info.frame);
    if (!this.renderer) {this.updateOverlay();return;}
    info.paths.forEach((points,i) => {
      const line=this.paths[i]; line.visible=Boolean(points); if(!points)return;
      let attribute=line.geometry.getAttribute('position');
      if(!attribute||attribute.count!==points.length){line.geometry.dispose();this.resources.delete(line.geometry);line.geometry=this.own(new T.BufferGeometry());attribute=new T.Float32BufferAttribute(points.flat(),3);line.geometry.setAttribute('position',attribute);}
      else {points.forEach((p,j)=>attribute.setXYZ(j,...p));attribute.needsUpdate=true;}
      line.geometry.computeBoundingSphere();
      line.material.color.setHex(activationColor(info.frame.activation?.[i],valid));
      line.material.opacity=i===this.selected?1:.82; line.renderOrder=i===this.selected?2:1;
    });
    const selectedPoints=info.paths[this.selected],count=Math.max(0,(selectedPoints?.length||0)-1);
    if(count){
      if(!this.selectionPath||this.selectionPath.count!==count){
        if(this.selectionPath){this.pathGroup.remove(this.selectionPath);this.selectionPath.geometry.dispose();this.selectionPath.material.dispose();this.resources.delete(this.selectionPath.geometry);this.resources.delete(this.selectionPath.material);}
        this.selectionPath=new T.InstancedMesh(this.own(new T.CylinderGeometry(1,1,1,8)),this.own(new T.MeshBasicMaterial({color:activationColor(activation,valid)})),count);this.selectionPath.frustumCulled=false;this.pathGroup.add(this.selectionPath);
      }
      this.selectionPath.visible=true;this.selectionPath.userData.muscleIndex=this.selected;this.selectionPath.material.color.setHex(activationColor(activation,valid));
      const dummy=new T.Object3D(),up=new T.Vector3(0,1,0);
      for(let i=0;i<count;i++){const a=new T.Vector3(...selectedPoints[i]),b=new T.Vector3(...selectedPoints[i+1]),delta=b.clone().sub(a),length=delta.length();dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,length?delta.divideScalar(length):up);dummy.scale.set(.00065,length,.00065);dummy.updateMatrix();this.selectionPath.setMatrixAt(i,dummy.matrix);}
      this.selectionPath.instanceMatrix.needsUpdate=true;
    }else if(this.selectionPath)this.selectionPath.visible=false;
    for(const mesh of [...(this.meshes || []),...(this.wraps||[])]) {
      const body=mesh.userData.geom.bodyId, p=info.frame.bodyPos?.[body], q=info.frame.bodyQuat?.[body];
      const matrix=info.frame.bodyTransforms?.[body]?.flat();
      mesh.visible=(finitePoint(p)&&Array.isArray(q)&&q.length===4&&q.every(Number.isFinite))||(matrix?.length===16&&matrix.every(Number.isFinite));
      if(mesh.visible) mesh.matrix.multiplyMatrices(matrix?new T.Matrix4().set(...matrix):composeNativeTransform(p,q),mesh.userData.local);
      if(mesh.userData.geom.isWrap){const active=mesh.userData.geom.openSimWrap?info.frame.activeWrapNames||[]:info.frame.activeWrapGeomIds?.[this.selected]||[];mesh.visible=Boolean(mesh.visible&&this.showWraps&&active.includes(mesh.userData.geom.id));}
    }
    if(this.showWraps){const active=info.frame.activeWrapNames||info.frame.activeWrapGeomIds?.[this.selected]||[],shown=(this.wraps||[]).filter(w=>w.visible).length;
      this.caption.textContent+=active.length?` · 活跃包绕面 ${shown}/${active.length}${shown<active.length?'（其余类型未接入显示）':''}`:' · 本帧未记录活跃包绕面';}
    this.updateMarkers(info.frame);
    this.updateOverlay();
    if(this.axisLine){const p=info.frame.jointPos?.[this.coordinate],axis=info.frame.jointAxis?.[this.coordinate];this.axisLine.visible=finitePoint(p)&&finitePoint(axis)&&Math.hypot(...axis)>0;
      if(this.axisLine.visible){const origin=new T.Vector3(...p),direction=new T.Vector3(...axis).normalize();this.axisLine.geometry.setFromPoints([origin.clone().addScaledVector(direction,-.014),origin.clone().addScaledVector(direction,.014)]);}}
    this.scene.updateMatrixWorld(true);
    if(!this.fitted){this.fitCamera();this.fitted=true;}
    this.render();
  }
  setWrappingVisible(visible){this.showWraps=Boolean(visible);if(this.run)this.setFrame(this.index,this.selected,this.coordinate);}
  updateExternalLoad(frame){
    const load=nativeExternalLoad(this.run,frame);this.externalLoad=load;
    if(this.forceArrow)this.forceArrow.visible=Boolean(load);if(this.forceOrigin)this.forceOrigin.visible=Boolean(load);
    if(this.forceLabel)this.forceLabel.style.display=load&&this.renderer?'block':'none';
    if(!load)return;
    this.caption.textContent+=` · 输入外力 ${load.magnitude_N.toFixed(2)} N → ${load.body}（Ground方向）`;
    if(this.forceLabel){this.forceLabel.textContent=`输入外力 ${Number(load.magnitude_N.toPrecision(4))} N · ${load.body}`;this.forceLabel.title=`作用点：${load.body} 局部 [${load.pointBody_m.join(', ')}] m；力：Ground [${load.forceGround_N.join(', ')}] N。箭头显示比例 4 mm/N，不代表位移；未添加接触面。`;}
    if(!this.renderer)return;
    if(!this.forceArrow){
      this.forceArrow=new T.ArrowHelper(new T.Vector3(0,1,0),new T.Vector3(),.01,0xffb765);this.scene.add(this.forceArrow);
      for(const part of [this.forceArrow.line,this.forceArrow.cone]){this.own(part.material);part.material.depthTest=false;part.material.depthWrite=false;part.renderOrder=20;}
      this.forceOrigin=new T.Mesh(this.own(new T.SphereGeometry(.0015,12,8)),this.own(new T.MeshBasicMaterial({color:0xffb765,depthTest:false,depthWrite:false})));this.forceOrigin.renderOrder=21;this.scene.add(this.forceOrigin);
    }
    const direction=new T.Vector3(...load.directionGround),origin=new T.Vector3(...load.pointGround_m),length=load.magnitude_N*.004;
    this.forceArrow.visible=this.forceOrigin.visible=true;this.forceArrow.position.copy(origin);this.forceArrow.setDirection(direction);this.forceArrow.setLength(length,Math.min(length*.3,.009),Math.min(length*.16,.005));this.forceOrigin.position.copy(origin);
    this.forceLabelPoint=origin.clone().addScaledVector(direction,length);
  }
  clearOverlay(){
    this.overlayRun=null;this.overlayInfo=null;this.overlayFrame=null;this.overlayPaths=[];this.clearGroup(this.overlayGroup);
    if(this.overlayLegend)this.overlayLegend.style.display='none';
  }
  setOverlayRun(run,{frame=null}={}){
    if(run&&!this.run)throw new Error('请先加载当前原生记录，再设置基线叠加');
    if(run)inspectNativeOverlay(this.run,run,this.index||0,frame);
    this.clearOverlay();
    if(run){
      this.overlayRun=run;this.overlayFrame=frame;
      if(this.renderer){
        this.overlayGroup||=new T.Group();if(!this.overlayGroup.parent)this.scene.add(this.overlayGroup);
        this.overlayPaths=run.muscleNames.map((_,i)=>{const line=new T.Line(this.own(new T.BufferGeometry()),this.own(new T.LineDashedMaterial({color:0x74e4cf,transparent:true,opacity:.4,dashSize:.0025,gapSize:.0015,depthWrite:false})));line.userData={overlay:true,muscleIndex:i};line.renderOrder=3;this.overlayGroup.add(line);return line;});
      }
    }
    if(this.run)this.setFrame(this.index||0,this.selected||0,this.coordinate||0);
  }
  updateOverlay(){
    if(!this.overlayRun)return;
    const info=inspectNativeOverlay(this.run,this.overlayRun,this.index,this.overlayFrame);this.overlayInfo=info;
    if(this.overlayLegend){this.overlayLegend.style.display='block';this.overlayLegend.textContent=info.available?(info.valid?'青色虚线：基线路径 · 当前：激活色':'灰色虚线：基线帧未通过检查'):'基线：当前时刻无记录';this.overlayLegend.style.color=info.valid?'#74e4cf':'#b1b7bc';this.overlayLegend.title='相同原生世界坐标，位置不平移、不缩放、不放大差异；只叠加基线路径，不添加第二套表面。'+(info.explicitFrame?'使用指定记录帧。':'使用最近的已记录帧，不做运动插值。');}
    if(this.overlayGroup)this.overlayGroup.visible=Boolean(info.available);
    if(!info.available){this.caption.textContent+=' · 叠加不可用：'+info.reason;return;}
    this.caption.textContent+=` · 基线 ${Number(info.time_s).toFixed(3)} s（原坐标${info.explicitFrame?'，指定帧':Math.abs(info.timeDifference_s)>1e-9?'，最近记录帧':''}）${info.valid?'':' · 基线帧失败'}${info.missingPathIndices.length?` · 基线路径缺失${info.missingPathIndices.length}`:''}`;
    if(!this.renderer)return;
    info.paths.forEach((points,i)=>{const line=this.overlayPaths[i];line.visible=Boolean(points);if(!points)return;
      let attribute=line.geometry.getAttribute('position');
      if(!attribute||attribute.count!==points.length){line.geometry.dispose();this.resources.delete(line.geometry);line.geometry=this.own(new T.BufferGeometry());attribute=new T.Float32BufferAttribute(points.flat(),3);line.geometry.setAttribute('position',attribute);}
      else{points.forEach((p,j)=>attribute.setXYZ(j,...p));attribute.needsUpdate=true;}
      let distances=line.geometry.getAttribute('lineDistance');if(!distances||distances.count!==points.length){distances=new T.Float32BufferAttribute(new Float32Array(points.length),1);line.geometry.setAttribute('lineDistance',distances);}
      let distance=0;points.forEach((p,j)=>{if(j)distance+=Math.hypot(...p.map((v,k)=>v-points[j-1][k]));distances.setX(j,distance);});distances.needsUpdate=true;
      line.geometry.computeBoundingSphere();line.material.color.setHex(info.valid?0x74e4cf:0x81878d);line.material.opacity=(i===this.selected)? .85:.4;
    });
  }
  setMarkersVisible(visible){this.showMarkers=Boolean(visible);if(this.run)this.setFrame(this.index,this.selected,this.coordinate);}
  updateMarkers(frame){
    if(!this.markerGroup)return;this.markerGroup.visible=Boolean(this.showMarkers);if(!this.showMarkers)return;
    const result=markerResiduals(frame);this.markerDiagnostics=result;const count=result.pairs.length;
    if(!count){this.clearGroup(this.markerGroup);this.markerObserved=null;this.markerFit=null;this.markerResidualLine=null;this.caption.textContent+=' · 本记录未导出成对标记点';return;}
    if(this.markerObserved?.count!==count){
      this.clearGroup(this.markerGroup);
      this.markerObserved=new T.InstancedMesh(this.own(new T.SphereGeometry(.0015,8,6)),this.own(new T.MeshBasicMaterial({color:0x6bbaff,wireframe:true,depthTest:false})),count);
      this.markerFit=new T.InstancedMesh(this.own(new T.SphereGeometry(.0008,8,6)),this.own(new T.MeshBasicMaterial({color:0xf1bd6e,depthTest:false})),count);
      this.markerObserved.frustumCulled=this.markerFit.frustumCulled=false;this.markerObserved.renderOrder=10;this.markerFit.renderOrder=11;
      this.markerResidualLine=new T.LineSegments(this.own(new T.BufferGeometry()),this.own(new T.LineBasicMaterial({color:0xf4d69b,depthTest:false})));
      this.markerGroup.add(this.markerObserved,this.markerFit,this.markerResidualLine);
    }
    const dummy=new T.Object3D(),segments=[];result.pairs.forEach((pair,i)=>{dummy.position.fromArray(pair.observed);dummy.updateMatrix();this.markerObserved.setMatrixAt(i,dummy.matrix);dummy.position.fromArray(pair.fitted);dummy.updateMatrix();this.markerFit.setMatrixAt(i,dummy.matrix);segments.push(new T.Vector3(...pair.observed),new T.Vector3(...pair.fitted));});
    this.markerObserved.instanceMatrix.needsUpdate=true;this.markerFit.instanceMatrix.needsUpdate=true;this.markerResidualLine.geometry.setFromPoints(segments);
    this.caption.textContent+=` · 蓝观测 / 金拟合 ${count}点 · RMS ${(result.rms_m*1e6).toFixed(2)} µm（原比例）${result.missingCount?` · 缺失${result.missingCount}`:''}`;
  }
  fitCamera(mode='hand') {
    if(!this.renderer)return;
    const bounds=new T.Box3();
    const bodyByName=new Map((this.model?.bodies||[]).map(b=>[b.name,b.id]));
    const positions=this.info?.frame?.bodyPos;
    const bodyPoint=name=>{const point=positions?.[bodyByName.get(name)];if(finitePoint(point))return point;const matrix=this.info?.frame?.bodyTransforms?.[name]?.flat();return matrix?.length===16?[matrix[3],matrix[7],matrix[11]]:null;};
    const wrist=bodyPoint('lunate')||bodyPoint('proximal_row'),index=bodyPoint('proxph2')||bodyPoint('2proxph'),little=bodyPoint('proxph5')||bodyPoint('5proxph'),middle=bodyPoint('midph3')||bodyPoint('3midph');
    const handView=mode==='hand'&&[wrist,index,little,middle].every(finitePoint);
    if(handView){
      for(const mesh of this.meshes||[]){const name=typeof mesh.userData.geom.bodyId==='string'?mesh.userData.geom.bodyId:this.model.bodies.find(b=>b.id===mesh.userData.geom.bodyId)?.name;
        if(mesh.visible&&!['ulna','radius','humerus'].includes(name)){mesh.geometry.computeBoundingBox();bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix));}}
    }
    if(bounds.isEmpty())for(const points of this.info?.paths || []) if(points) for(const p of points)bounds.expandByPoint(new T.Vector3(...p));
    if(bounds.isEmpty()) return;
    const center=bounds.getCenter(new T.Vector3()), size=bounds.getSize(new T.Vector3());
    const radius=Math.max(.025,size.length()/2), distance=radius/Math.sin(T.MathUtils.degToRad(17.5))*1.10/Math.min(1,this.camera.aspect);
    this.controls.target.copy(center);
    const view=this.model?.view || this.run?.manifest?.view;
    let direction=new T.Vector3(...(view?.direction || [1,.3,1])).normalize(),up=new T.Vector3(...(view?.up||[0,1,0]));
    if(handView&&!view){const along=new T.Vector3(...middle).sub(new T.Vector3(...wrist)).normalize();
      const across=new T.Vector3(...index).sub(new T.Vector3(...little)).normalize();
      direction=new T.Vector3().crossVectors(across,along).normalize().addScaledVector(across,.22).addScaledVector(along,.12).normalize();up=along;}
    this.camera.up.copy(up); this.camera.position.copy(center).addScaledVector(direction,distance);
    this.camera.near=Math.max(.0001,radius/100);this.camera.far=Math.max(10,distance*20);this.camera.updateProjectionMatrix();
    this.controls.minDistance=radius*.5;this.controls.maxDistance=distance*6;this.controls.update();
  }
  setView(mode='hand'){this.fitCamera(mode);this.render();}
  getDiagnostics() { return this.info ? {frame:this.index, muscleCount:this.info.names.length,externalLoad:this.externalLoad?structuredClone(this.externalLoad):null, missingPathIndices:[...this.info.missingPathIndices],sampledLengths_m:[...this.info.sampledLengths_m],renderedMeshCount:(this.meshes||[]).filter(m=>m.visible).length,overlay:this.overlayInfo?{available:this.overlayInfo.available,frame:this.overlayInfo.index,time_s:this.overlayInfo.time_s,valid:this.overlayInfo.valid,missingPathIndices:this.overlayInfo.missingPathIndices||[]}:null} : null; }
  getCameraState() { return {position:this.camera.position.toArray(),target:this.controls.target.toArray(),up:this.camera.up.toArray()}; }
  setCameraState(state) { if(!this.renderer)return;this.applyingCamera=true;this.camera.position.fromArray(state.position);this.controls.target.fromArray(state.target);this.camera.up.fromArray(state.up);this.controls.update();this.render();this.applyingCamera=false; }
  onCameraChangeSubscribe(listener) {this.cameraListener=listener;return()=>{this.cameraListener=null;};}
  resize(){if(!this.renderer||this.disposed)return;const w=Math.max(1,this.host.clientWidth),h=Math.max(1,this.host.clientHeight);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.render();}
  render(){if(!this.disposed&&this.renderer){this.renderer.render(this.scene,this.camera);if(this.forceLabel&&this.externalLoad&&this.forceLabelPoint){const p=this.forceLabelPoint.clone().project(this.camera),w=this.host.clientWidth,h=this.host.clientHeight;this.forceLabel.style.display=p.z<1?'block':'none';this.forceLabel.style.left=Math.max(8,Math.min(w-(this.forceLabel.offsetWidth||180)-8,(p.x+1)*w/2+8))+'px';this.forceLabel.style.top=Math.max(8,Math.min(h-95,(1-p.y)*h/2-8))+'px';}}}
  dispose(){this.disposed=true;this.observer?.disconnect();this.controls?.removeEventListener('change',this.onCameraChange);this.controls?.dispose();this.canvas.removeEventListener('pointerdown',this.pointerDown);this.canvas.removeEventListener('pointerup',this.pointerUp);for(const r of this.resources)r.dispose();this.resources.clear();this.renderer?.dispose();this.canvas.remove();this.caption.remove();this.legend.remove();this.forceLabel?.remove();this.host.style.position=this.oldPosition;}
}
export default NativeScene;
