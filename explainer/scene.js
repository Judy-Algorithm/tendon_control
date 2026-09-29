import '../vendor/three.min.js';
import '../vendor/orbit-controls.js';
import {MODEL} from '../model-data.js';
import {ATLAS} from '../atlas-data.js';
import {FITTED_ROUTES} from '../route-data.js';
import {buildRig, tendonSegments, routeInfluence, rotatePoint, rigForBone} from '../motion.js';

// This adapter is a display-only kinematic illustration, not an OpenSim/MuJoCo
// solver. MODEL, its typed vertex data and all imported paths remain immutable.
// Existing display mappings: FDS2→FDSI, FDP2→FDPI, EDC2→EDCI (OpenSim aliases).
const THREE = window.THREE;
const C = {bone: 0xe8dfca, geometry: 0x60cbb6, observation: 0x77b6fa,
  activation: 0xb59aff, force: 0xf2ac63, error: 0xeec16c, muted: 0x71828b};
const DEFAULTS = {scale: 1, explode: 0, angle: 25, load: 2, lever: 35,
  strength: 1, activation: .2, noise: 0, selectedMuscle: 'FDS2'};
const ALIASES = {FDSI: 'FDS2', FDPI: 'FDP2', EDCI: 'EDC2'};
const PATH_IDS = ['FDS2', 'FDP2', 'EDC2'];
const SOURCE_IDS = {overview: ['opensim-workflows'], scale: ['opensim-scale'], ik: ['opensim-ik'], id: ['opensim-id'],
  so: ['opensim-so'], moco: ['opensim-moco'], myohand: ['mujoco-muscle']};
const SOURCE_TITLES = {overview: 'OpenSim · Workflows', scale: 'OpenSim · How Scaling Works',
  ik: 'OpenSim · How Inverse Kinematics Works', id: 'OpenSim · How Inverse Dynamics Works',
  so: 'OpenSim · How Static Optimization Works', moco: 'Moco · Theory Guide', myohand: 'MuJoCo · Muscle actuators'};
const HOTSPOT_MEANINGS = {'scale-span': '几何长度随比例调整', 'path-anchors': '路径附着随骨段移动',
  'observed-markers': '蓝点表示待匹配目标', 'fitted-markers': '绿点表示当前模型位置',
  'external-force': '作用点与方向决定外力矩', 'joint-torque': '围绕该轴投影力矩',
  'motion-trace': '示意相邻时刻的运动', 'wrap-illustration': '只演示路径如何绕开表面',
  FDS2: '食指浅屈肌的已映射通路', FDP2: '食指深屈肌的已映射通路', EDC2: '食指伸肌的已映射通路'};
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const vec = a => new THREE.Vector3(...a);
function decode(value, Type) {
  const binary = atob(value), bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Type(bytes.buffer);
}
function basic(color, extra = {}) {
  return new THREE.MeshBasicMaterial({color, toneMapped: false, ...extra});
}
function nativeAnchor(name) {
  return MODEL.joints.find(j => j.name === name).anchor_i16.map(v => v * MODEL.quant);
}

export class ExplainerScene {
  constructor({host, onSelect = () => {}}) {
    if (!host) throw new Error('ExplainerScene requires a host element.');
    this.host = host;
    this.onSelect = onSelect;
    this.disposed = false;
    this.state = {route: 'opensim', step: 'overview', parameters: {...DEFAULTS}, phase: 0, playing: false};
    this.diagnostics = {};
    this.labels = [];
    this.materials = new Set();
    this.geometries = new Set();
    this.listeners = [];
    this.oldPosition = host.style.position;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'explainer-canvas';
    this.canvas.setAttribute('aria-label', '三维手部几何示意。拖动旋转，滚轮缩放；可通过标注按钮查看原理。');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;';
    this.canvas.tabIndex = 0;
    host.append(this.canvas);
    this.overlay = document.createElement('div');
    this.overlay.className = 'explainer-scene-labels';
    this.overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
    host.append(this.overlay);
    try {
      this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias: true, alpha: true});
    } catch (error) {
      this.canvas.remove();
      this.fallback = document.createElement('p');
      this.fallback.textContent = '当前设备无法显示 WebGL 三维模型。右侧步骤、计算与官方依据仍可使用。';
      this.fallback.style.cssText = 'padding:150px 32px 32px;color:#bec9cc;line-height:1.8;';
      host.append(this.fallback);
      this.error = error.message;
      return;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .86;
    this.renderer.setClearColor(0x101416, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, .002, 4);
    this.camera.up.set(0, -1, 0);
    this.controls = new THREE.OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = false;
    this.controls.minDistance = .17;
    this.controls.maxDistance = 1;
    this.controls.target.set(0, -.075, 0);
    this.scene.add(new THREE.HemisphereLight(0xfff5df, 0x344655, .95));
    const key = new THREE.DirectionalLight(0xffffff, 1.12);
    key.position.set(.6, -.5, .5); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xb4d5f6, .45);
    fill.position.set(-.4, .15, -.35); this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xb6eddf, .25);
    rim.position.set(.05, -.4, -.5); this.scene.add(rim);
    this.boneGroup = new THREE.Group();
    this.ghostGroup = new THREE.Group();
    this.pathGroup = new THREE.Group();
    this.annotationGroup = new THREE.Group();
    this.scene.add(this.boneGroup, this.ghostGroup, this.pathGroup, this.annotationGroup);
    this.bones = [];
    this.ghosts = [];
    const boneMaterial = this.ownMaterial(new THREE.MeshStandardMaterial({
      color: new THREE.Color(C.bone).convertSRGBToLinear(), roughness: .69, metalness: .025, side: THREE.DoubleSide,
    }));
    const ghostMaterial = this.ownMaterial(basic(C.geometry, {
      transparent: true, opacity: .115, depthWrite: false, wireframe: true,
    }));
    for (const bone of MODEL.bones) {
      const positions = Float32Array.from(decode(bone.vertices_i16, Int16Array), v => v * MODEL.quant);
      const geometry = this.ownGeometry(new THREE.BufferGeometry());
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setIndex(new THREE.BufferAttribute(decode(bone.faces_u16, Uint16Array), 1));
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, boneMaterial);
      mesh.name = bone.name;
      mesh.userData = {kind: 'bone', id: bone.name, label: this.boneLabel(bone.name)};
      this.bones.push(mesh); this.boneGroup.add(mesh);
      if (/^2(?:mc|proxph|midph|distph)$/.test(bone.name)) {
        const ghost = new THREE.Mesh(geometry, ghostMaterial);
        ghost.name = bone.name;
        this.ghosts.push(ghost); this.ghostGroup.add(ghost);
      }
    }
    const joint = ATLAS.joints.find(j => j.dofs.some(d => d.id === 'index_MCP_flex'));
    this.rig = buildRig(MODEL, joint, joint.dofs.find(d => d.id === 'index_MCP_flex'));
    this.pivot = vec(this.rig.pivot);
    const dip = nativeAnchor('md2_flexion'), pip = nativeAnchor('pm2_flexion');
    // Tip is a geometric proxy, not a measured or anatomically registered marker.
    this.tip = dip.map((v, i) => v + .72 * (v - pip[i]));
    this.markerRest = [this.rig.pivot, pip, dip, this.tip];
    this.pathCylinder = this.ownGeometry(new THREE.CylinderGeometry(1, 1, 1, 10));
    this.dotGeometry = this.ownGeometry(new THREE.SphereGeometry(.00135, 14, 10));
    this.paths = new Map();
    for (const id of PATH_IDS) {
      const meta = ATLAS.tendons.find(t => t.id === id);
      const segments = tendonSegments(MODEL, meta, FITTED_ROUTES[id]);
      const material = this.ownMaterial(basic(id === 'EDC2' ? C.observation : C.activation));
      const mesh = new THREE.InstancedMesh(this.pathCylinder, material, segments.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.userData = {kind: 'muscle', id, label: `${id} · ${meta.name}`};
      const endpoints = [0, 1].map(() => {
        const dot = new THREE.Mesh(this.dotGeometry, material);
        dot.userData = {...mesh.userData}; this.pathGroup.add(dot); return dot;
      });
      this.paths.set(id, {mesh, material, segments, meta, endpoints, posed: []});
      this.pathGroup.add(mesh);
    }
    this.dummy = new THREE.Object3D();
    this.up = new THREE.Vector3(0, 1, 0);
    this.fittedMaterial = this.ownMaterial(basic(C.geometry));
    this.observedMaterial = this.ownMaterial(basic(C.observation));
    this.markers = this.markerRest.map((_, i) => {
      const fitted = new THREE.Mesh(this.dotGeometry, this.fittedMaterial);
      const observed = new THREE.Mesh(this.dotGeometry, this.observedMaterial);
      fitted.scale.setScalar(1.28); observed.scale.setScalar(1.45);
      fitted.userData = {kind: 'marker', id: `fitted-${i}`, label: '模型标记点'};
      observed.userData = {kind: 'marker', id: `observed-${i}`, label: '观测目标点'};
      this.annotationGroup.add(fitted, observed); return {fitted, observed};
    });
    this.residualLine = this.line(C.error, true);
    this.dimensionLine = this.line(C.geometry, true);
    this.trajectoryLine = this.line(C.geometry);
    this.leverLine = this.line(C.force, true);
    this.axisLine = this.line(C.muted);
    this.ringLine = this.line(C.force);
    this.forceArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), this.pivot, .04, C.force, .008, .004);
    this.annotationGroup.add(this.forceArrow);
    this.forceArrow.line.material.toneMapped = false;
    this.forceArrow.cone.material.toneMapped = false;
    // These are pedagogical annotations: keep them readable through the display
    // mesh, rather than pretending they are occluded anatomical structures.
    for (const object of [this.forceArrow.line, this.forceArrow.cone, this.ringLine, this.leverLine, this.axisLine]) {
      object.material.depthTest = false; object.material.depthWrite = false;
      object.renderOrder = 30;
    }
    this.ringLine.material.opacity = 1;
    this.leverLine.material.opacity = 1;
    this.forceArrow.line.userData = {kind: 'force', id: 'external-force', label: '外力 · 作用点与方向'};
    this.forceArrow.cone.userData = {...this.forceArrow.line.userData};
    this.contactDot = new THREE.Mesh(this.dotGeometry, this.ownMaterial(basic(C.force)));
    this.contactDot.scale.setScalar(1.6);
    this.contactDot.userData = {...this.forceArrow.line.userData};
    this.annotationGroup.add(this.contactDot);
    // Detached conceptual cross-section, never used to reroute the native display paths.
    this.wrapGroup = new THREE.Group();
    this.wrapSurface = new THREE.Mesh(this.ownGeometry(new THREE.SphereGeometry(.009, 18, 12)),
      this.ownMaterial(basic(C.geometry, {transparent: true, opacity: .24, wireframe: true, depthWrite: false})));
    this.wrapSurface.userData = {kind: 'geometry', id: 'wrap-illustration', label: '包绕面示意（非原生）'};
    this.wrapGroup.add(this.wrapSurface);
    this.wrapPath = this.line(C.activation);
    this.annotationGroup.remove(this.wrapPath); this.wrapGroup.add(this.wrapPath);
    this.wrapLeader = this.line(C.muted, true);
    this.wrapAnchors = [0, 1].map(() => {
      const dot = new THREE.Mesh(this.dotGeometry, this.ownMaterial(basic(C.activation)));
      dot.scale.setScalar(1.3); dot.userData = {...this.wrapSurface.userData};
      this.wrapGroup.add(dot); return dot;
    });
    this.annotationGroup.add(this.wrapGroup);
    this.mechanicsInset = document.createElement('button');
    this.mechanicsInset.type = 'button';
    this.mechanicsInset.className = 'explainer-mechanics-inset';
    this.mechanicsInset.style.cssText = 'position:absolute;display:none;z-index:4;padding:0;overflow:hidden;border:1px solid #50636a66;border-radius:12px;background:linear-gradient(145deg,#19262cf2,#111a20ed);box-shadow:0 10px 35px #0002;color:#e3ecef;cursor:pointer;text-align:left;';
    this.mechanicsInset.title = '单轴受力示意 · 与当前力和力臂同步 · OpenSim · How Inverse Dynamics Works';
    this.mechanicsInset.addEventListener('click', () => this.onSelect({kind: 'diagram', id: 'teaching-lever',
      label: '单轴受力示意', sourceIds: ['opensim-id']}));
    this.mechanicsInset.addEventListener('focus', () => {this.mechanicsInset.style.outline = '2px solid #80c5f9';});
    this.mechanicsInset.addEventListener('blur', () => {this.mechanicsInset.style.outline = '';});
    this.host.append(this.mechanicsInset);
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line.threshold = .002;
    this.controls.addEventListener('change', this.handleOrbit = () => this.render());
    this.listen(this.canvas, 'pointerdown', event => {this.down = [event.clientX, event.clientY];});
    this.listen(this.canvas, 'pointerup', event => {
      if (!this.down || Math.hypot(event.clientX - this.down[0], event.clientY - this.down[1]) > 5) return;
      this.down = null;
      const rect = this.canvas.getBoundingClientRect();
      this.raycaster.setFromCamera(new THREE.Vector2(
        (event.clientX - rect.left) / rect.width * 2 - 1,
        -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera);
      const pickable = [...this.bones];
      if (this.pathGroup.visible) pickable.unshift(...[...this.paths.values()].map(p => p.mesh));
      const hit = this.raycaster.intersectObjects(pickable, false)[0];
      if (hit?.object.userData.kind) this.select(hit.object.userData);
    });
    this.listen(this.canvas, 'keydown', event => {
      if (event.key === 'Home') {event.preventDefault(); this.setView('oblique');}
    });
    this.listen(this.canvas, 'webglcontextlost', event => {
      event.preventDefault(); this.canvas.setAttribute('aria-label', '三维显示暂时不可用，请刷新页面。');
      this.showFailure('三维显示已中断；其他步骤与计算仍可使用。');
    });
    this.listen(this.canvas, 'webglcontextrestored', () => {this.fallback?.remove(); this.fallback = null; this.render();});
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.setView('oblique');
    this.resize();
    this.setState(this.state);
  }

  ownGeometry(geometry) {this.geometries.add(geometry); return geometry;}
  ownMaterial(material) {this.materials.add(material); return material;}
  listen(target, event, callback) {target.addEventListener(event, callback); this.listeners.push([target, event, callback]);}
  line(color, segments = false) {
    const geometry = this.ownGeometry(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    const material = this.ownMaterial(new THREE.LineBasicMaterial({color, transparent: true, opacity: .78, toneMapped: false}));
    const line = segments ? new THREE.LineSegments(geometry, material) : new THREE.Line(geometry, material);
    this.annotationGroup.add(line); return line;
  }
  setLine(line, points) {
    line.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap(p => p.toArray ? p.toArray() : p), 3));
    line.geometry.computeBoundingSphere();
  }
  boneLabel(name) {
    const labels = {radius: '桡骨', ulna: '尺骨', '2mc': '食指掌骨', '2proxph': '食指近节指骨',
      '2midph': '食指中节指骨', '2distph': '食指远节指骨'};
    return labels[name] || `骨段 · ${name}`;
  }
  select(data) {
    this.onSelect({...data, sourceIds: SOURCE_IDS[this.state.route === 'myohand' ? 'myohand' : this.state.step] || []});
  }
  showFailure(message) {
    if (!this.fallback) {this.fallback = document.createElement('p'); this.host.append(this.fallback);}
    this.fallback.textContent = message;
    this.fallback.style.cssText = 'position:absolute;left:24px;right:24px;top:40%;padding:20px;background:#192329;color:#dde8ec;border-radius:12px;';
  }

  // Rigid rotation in the reused display rig; neither source q nor mesh data change.
  markerPoints(angle, noise = 0) {
    return this.markerRest.map((point, i) => {
      const p = rotatePoint(point, this.rig, angle);
      if (noise) {
        p[0] += noise * .001 * Math.sin(i * 1.7 + .4);
        p[1] += noise * .001 * Math.cos(i * 2.3 + .9);
        p[2] += noise * .001 * Math.sin(i * 2.9 + .7);
      }
      return p;
    });
  }
  getIKResidual(angle, noise = this.state.parameters.noise) {
    if (!this.markerRest) return null;
    const target = this.markerPoints(25, finite(noise, 0));
    const fitted = this.markerPoints(finite(angle, 25));
    return 1000 * Math.sqrt(target.reduce((sum, p, i) =>
      sum + p.reduce((s, v, j) => s + (v - fitted[i][j]) ** 2, 0), 0) / target.length);
  }
  findBestIKAngle(noise = this.state.parameters.noise) {
    if (!this.markerRest) return null;
    let bestAngle = 0, best = Infinity;
    for (let angle = 0; angle <= 75; angle += .1) {
      const residual = this.getIKResidual(angle, noise);
      if (residual < best) {best = residual; bestAngle = angle;}
    }
    return {angle: Math.round(bestAngle * 10) / 10, markerRmsMm: best};
  }
  getDiagnostics() {return {...this.diagnostics, webglAvailable: !!this.renderer, tier: 'conceptual-display'};}

  explosionOffset(name, amount) {
    const digit = Number(name.match(/^[1-5]/)?.[0]) || (name.startsWith('thumb') ? 1 : 0);
    if (!digit) return new THREE.Vector3();
    // Illustrative finger-ray separation only, never used in mechanical formulas.
    return new THREE.Vector3((digit === 2 ? .018 : .005) * amount, -.008 * amount,
      (3 - digit) * .017 * amount);
  }
  transformPoint(point, angle, id = 'FDS2', scale = 1, explosion = 0) {
    const weight = routeInfluence(point, this.rig, id);
    const p = vec(rotatePoint(point, this.rig, angle * weight));
    if (point[1] <= this.rig.pivot[1]) p.y = this.pivot.y + (p.y - this.pivot.y) * scale;
    if (point[1] <= -.075) p.add(this.explosionOffset('2proxph', explosion));
    return p;
  }

  setState(next = {}) {
    if (this.disposed) return;
    const previousStepKey = `${this.state.route}/${this.state.step}`;
    this.state = {...this.state, ...next, parameters: {...this.state.parameters, ...(next.parameters || {})}};
    if (!this.renderer) return;
    const {route, step} = this.state, p = this.state.parameters;
    const phase = clamp(finite(this.state.phase, 0), 0, 1);
    let angle = clamp(finite(p.angle, 25), 0, 75);
    const isScale = route === 'opensim' && step === 'scale';
    const isIK = route === 'opensim' && step === 'ik';
    const isForce = ['id', 'so', 'force', 'transmission', 'dynamics'].includes(step);
    const showExternalForce = route === 'opensim' && ['id', 'so'].includes(step);
    if (showExternalForce && previousStepKey !== `${route}/${step}`) this.setView('mechanics');
    else if (this.automaticMechanicsView && !showExternalForce) this.setView('oblique');
    const showPaths = ['overview', 'scale', 'so', 'control', 'activation', 'geometry', 'force', 'transmission', 'dynamics', 'integration', 'moco'].includes(step);
    const scale = isScale ? clamp(finite(p.scale, 1), .7, 1.4) : 1;
    const explosion = ['overview', 'scale', 'geometry'].includes(step) ? clamp(finite(p.explode, 0), 0, 1) : 0;
    // Only Moco's explicitly conceptual timeline prescribes display motion.
    // MyoHand receives its chosen display angle from the parent/native trace.
    if (route === 'opensim' && step === 'moco' && this.state.playing) angle = 12 + 35 * (.5 - .5 * Math.cos(phase * Math.PI * 2));
    const quaternion = new THREE.Quaternion().setFromAxisAngle(vec(this.rig.axis), angle * Math.PI / 180);
    const transformBone = (mesh, angleQuaternion, relativeScale = 1, separation = 0) => {
      mesh.matrixAutoUpdate = false;
      mesh.quaternion.identity(); mesh.position.set(0, 0, 0); mesh.scale.set(1, 1, 1);
      if (rigForBone(this.rig, mesh.name)) {
        mesh.quaternion.copy(angleQuaternion);
        mesh.position.copy(this.pivot).sub(this.pivot.clone().applyQuaternion(angleQuaternion));
        // A display affine length ratio along the global finger axis, not native ScaleTool.
      }
      mesh.updateMatrix();
      if (rigForBone(this.rig, mesh.name) && relativeScale !== 1) {
        const scaleMatrix = new THREE.Matrix4().makeTranslation(0, this.pivot.y, 0)
          .multiply(new THREE.Matrix4().makeScale(1, relativeScale, 1))
          .multiply(new THREE.Matrix4().makeTranslation(0, -this.pivot.y, 0));
        mesh.matrix.premultiply(scaleMatrix);
      }
      const shift = this.explosionOffset(mesh.name, separation);
      mesh.matrix.premultiply(new THREE.Matrix4().makeTranslation(shift.x, shift.y, shift.z));
      mesh.matrixWorldNeedsUpdate = true;
    };
    for (const mesh of this.bones) transformBone(mesh, quaternion, scale, explosion);
    for (const ghost of this.ghosts) transformBone(ghost, quaternion, 1, 0);
    this.ghostGroup.visible = isScale;
    this.pathGroup.visible = showPaths;
    const selected = ALIASES[p.selectedMuscle] || p.selectedMuscle || 'FDS2';
    const activation = clamp(finite(p.activation, .2), 0, 1);
    for (const [id, path] of this.paths) {
      const isSelected = selected === id;
      const sourceColor = id === 'EDC2' ? C.observation : C.activation;
      path.material.color.setHex(sourceColor);
      if (['activation', 'control', 'force', 'so'].includes(step))
        path.material.color.lerp(new THREE.Color(0xf2c9fc), (isSelected ? activation : activation * .35) * .8);
      const radius = isSelected ? .00083 : .00055;
      path.posed = path.segments.map(([a, b], i) => {
        const first = this.transformPoint(a, angle, id, scale, explosion);
        const second = this.transformPoint(b, angle, id, scale, explosion);
        this.dummy.position.copy(first).add(second).multiplyScalar(.5);
        this.dummy.quaternion.setFromUnitVectors(this.up, second.clone().sub(first).normalize());
        this.dummy.scale.set(radius, Math.max(first.distanceTo(second), 1e-8), radius);
        this.dummy.updateMatrix(); path.mesh.setMatrixAt(i, this.dummy.matrix);
        return [first, second];
      });
      path.mesh.instanceMatrix.needsUpdate = true;
      path.endpoints[0].position.copy(path.posed[0][0]);
      path.endpoints[1].position.copy(path.posed.at(-1)[1]);
    }
    const fitted = this.markerPoints(angle), target = this.markerPoints(25, finite(p.noise, 0));
    this.markers.forEach((marker, i) => {
      marker.fitted.visible = marker.observed.visible = isIK;
      marker.fitted.position.fromArray(fitted[i]); marker.observed.position.fromArray(target[i]);
    });
    this.residualLine.visible = isIK;
    this.setLine(this.residualLine, fitted.flatMap((point, i) => [point, target[i]]));
    this.diagnostics.markerRmsMm = this.getIKResidual(angle, p.noise);
    this.diagnostics.ikTargetAngleDeg = 25;
    this.diagnostics.displayAngleDeg = angle;
    this.diagnostics.markerCount = 4;
    this.diagnostics.explosionIsDisplayOnly = true;
    this.dimensionLine.visible = isScale;
    const scaleEnd = this.transformPoint(this.tip, angle, 'FDS2', scale, explosion);
    const start = this.pivot.clone().add(this.explosionOffset('2proxph', explosion));
    const offset = new THREE.Vector3(.012, 0, .013);
    this.setLine(this.dimensionLine, [start, start.clone().add(offset), start.clone().add(offset), scaleEnd.clone().add(offset), scaleEnd.clone().add(offset), scaleEnd]);
    const lever = clamp(finite(p.lever, 35), 5, 85) * .001;
    const axis = vec(this.rig.axis).normalize();
    // Educational perpendicular-loading frame: r lies in the hinge plane and
    // F points opposite positive rotation, hence (r×F)·axis = -load*lever.
    // Changing the lever changes the actual displayed application point.
    const downstream = vec(this.rig.downstream).applyQuaternion(quaternion);
    downstream.addScaledVector(axis, -downstream.dot(axis)).normalize();
    const contact = this.pivot.clone().addScaledVector(downstream, lever);
    const forceDirection = new THREE.Vector3().crossVectors(downstream, axis).normalize();
    this.forceArrow.visible = this.contactDot.visible = showExternalForce;
    this.contactDot.position.copy(contact);
    const load = Math.max(0, finite(p.load, 2));
    const length = load > 0 ? .012 + Math.min(load, 12) * .004 : 0;
    this.forceArrow.visible = showExternalForce && load > 0;
    this.forceArrow.position.copy(contact);
    this.forceArrow.setDirection(forceDirection);
    this.forceArrow.setLength(Math.max(length, .001), Math.min(.008, length * .3), .0035);
    this.leverLine.visible = showExternalForce;
    this.setLine(this.leverLine, Array.from({length: 12}, (_, i) => [
      this.pivot.clone().lerp(contact, i / 12), this.pivot.clone().lerp(contact, (i + .55) / 12),
    ]).flat());
    this.diagnostics.displayLeverMm = this.pivot.distanceTo(contact) * 1000;
    this.diagnostics.externalTorqueNm = new THREE.Vector3().crossVectors(
      contact.clone().sub(this.pivot), forceDirection.clone().multiplyScalar(load)).dot(axis);
    this.diagnostics.externalForceFrame = 'conceptual perpendicular joint frame';
    this.updateMechanicsInset?.(showExternalForce, load, lever * 1000);
    this.ringLine.visible = isForce || step === 'geometry';
    this.axisLine.visible = this.ringLine.visible;
    this.setLine(this.axisLine, [this.pivot.clone().addScaledVector(axis, -.026), this.pivot.clone().addScaledVector(axis, .026)]);
    const basis = vec(this.rig.downstream).normalize(), tangent = new THREE.Vector3().crossVectors(axis, basis).normalize();
    this.setLine(this.ringLine, Array.from({length: 46}, (_, i) => {
      const theta = i / 45 * Math.PI * 1.6;
      return this.pivot.clone().addScaledVector(basis, Math.cos(theta) * .015).addScaledVector(tangent, Math.sin(theta) * .015);
    }));
    this.trajectoryLine.visible = ['moco', 'integration', 'dynamics'].includes(step);
    this.setLine(this.trajectoryLine, Array.from({length: 42}, (_, i) => rotatePoint(this.tip, this.rig, 10 + i)));
    this.wrapGroup.visible = this.wrapLeader.visible = isScale && explosion > .08;
    const wrapCenter = this.pivot.clone().add(new THREE.Vector3(.025, .008, -.073 - explosion * .01));
    this.wrapGroup.position.copy(wrapCenter);
    const wrapPoints = [new THREE.Vector3(0, -.025, -.009),
      ...Array.from({length: 25}, (_, i) => {
        const a = -Math.PI / 2 + Math.PI * i / 24;
        return new THREE.Vector3(0, -.0098 * Math.cos(a), .0098 * Math.sin(a));
      }), new THREE.Vector3(0, -.025, .009)];
    this.setLine(this.wrapPath, wrapPoints);
    this.wrapAnchors[0].position.copy(wrapPoints[0]);
    this.wrapAnchors[1].position.copy(wrapPoints.at(-1));
    this.setLine(this.wrapLeader, [start, wrapCenter]);
    this.updateLabels({isScale, isIK, isForce, showPaths, contact, scaleEnd, selected, angle, wrapCenter});
    this.render();
  }

  updateLabels({isScale, isIK, isForce, showPaths, contact, scaleEnd, selected, wrapCenter}) {
    const {route, step} = this.state;
    const descriptors = [];
    if (isScale) {
      descriptors.push({id: 'scale-span', text: '骨段长度比', point: scaleEnd, color: C.geometry, kind: 'parameter'});
      descriptors.push({id: 'path-anchors', text: '路径锚点', point: this.paths.get('FDS2').posed.at(-1)[1], color: C.activation, kind: 'geometry'});
      if (this.wrapGroup.visible) descriptors.push({id: 'wrap-illustration', text: '包绕示意（非原生）', point: wrapCenter, color: C.geometry, kind: 'geometry'});
    } else if (isIK) {
      descriptors.push({id: 'observed-markers', text: '观测点', point: this.markers[3].observed.position, color: C.observation, kind: 'marker'});
      descriptors.push({id: 'fitted-markers', text: '模型点', point: this.markers[1].fitted.position, color: C.geometry, kind: 'marker'});
    } else if (isForce) {
      if (route === 'opensim') descriptors.push({id: 'external-force', text: Number(this.state.parameters.load) > 0 ? '外力 F' : '外力作用点 · F = 0', point: contact, color: C.force, kind: 'force'});
      descriptors.push({id: 'joint-torque', text: '关节轴', point: this.pivot, color: C.force, kind: 'torque'});
    }
    if (showPaths && !isScale) {
      const path = this.paths.get(selected) || this.paths.get('FDS2');
      const where = path.posed[Math.floor(path.posed.length * .68)][1];
      descriptors.push({id: path.meta.id, text: `${path.meta.id} · ${path.meta.id === 'EDC2' ? '伸肌通路' : '屈肌通路'}`,
        point: where, color: path.meta.id === 'EDC2' ? C.observation : C.activation, kind: 'muscle'});
    }
    if (step === 'moco' || step === 'integration') descriptors.push({id: 'motion-trace', text: '整段运动 · 示意轨迹',
      point: vec(rotatePoint(this.tip, this.rig, 35)), color: C.geometry, kind: 'trajectory'});
    const signature = `${route}/${step}|${descriptors.map(d => `${d.id}:${d.text}`).join('|')}`;
    if (signature !== this.labelSignature) {
      this.overlay.replaceChildren(); this.labels = []; this.labelSignature = signature;
      for (const descriptor of descriptors) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'explainer-scene-hotspot';
        button.textContent = descriptor.text;
        const meaning = HOTSPOT_MEANINGS[descriptor.id] || '查看结构与求解的关系';
        const sourceTitle = SOURCE_TITLES[route === 'myohand' ? 'myohand' : step] || SOURCE_TITLES.overview;
        button.title = `${descriptor.text} · ${meaning} · ${sourceTitle}`;
        button.setAttribute('aria-label', `${button.title}：打开详细说明与依据`);
        button.style.cssText = `position:absolute;pointer-events:auto;border:1px solid #ffffff28;border-left:2px solid #${descriptor.color.toString(16).padStart(6, '0')};border-radius:6px;background:#141d22e8;color:#d9e4e8;padding:6px 9px;line-height:1.3;font:500 11px/1.3 system-ui,sans-serif;white-space:nowrap;box-shadow:0 3px 14px #0003;cursor:pointer;backdrop-filter:blur(8px);`;
        button.addEventListener('click', () => this.select({kind: descriptor.kind, id: descriptor.id, label: descriptor.text}));
        button.addEventListener('focus', () => {button.style.outline = '2px solid #80c5f9'; button.style.outlineOffset = '3px';});
        button.addEventListener('blur', () => {button.style.outline = '';});
        this.overlay.append(button); this.labels.push({button, descriptor});
      }
    }
    this.labels.forEach((label, i) => {label.descriptor = descriptors[i];});
  }

  updateMechanicsInset(visible, load, leverMm) {
    if (!this.mechanicsInset) return;
    this.mechanicsInset.style.display = visible ? 'block' : 'none';
    if (!visible) return;
    const key = `${load}:${leverMm}`;
    if (this.mechanicsInsetKey === key) return;
    this.mechanicsInsetKey = key;
    const x = 48 + leverMm * 2.3, y = 165;
    const arrowLength = 96 + Math.min(load, 12);
    const top = y - arrowLength;
    const torque = load * leverMm / 1000;
    const force = load > 0 ? `<path d="M${x},${top} V${y - 12}" stroke="#f2ac63" stroke-width="4"/><path d="M${x - 7},${y - 16} L${x},${y - 2} L${x + 7},${y - 16}" fill="#f2ac63"/>` : '';
    const torqueGlyph = load > 0 ? '<path d="M48,137 A28,28 0 0 0 20,165" fill="none" stroke="#60cbb6" stroke-width="2.5"/><path d="M15,158 L20,171 L26,159" fill="none" stroke="#60cbb6" stroke-width="2.5"/>' : '';
    this.mechanicsInset.setAttribute('aria-label', `单轴受力示意：外力 ${load.toFixed(1)} 牛顿，垂直力臂 ${leverMm.toFixed(0)} 毫米，需抵消的外力矩 ${torque.toFixed(3)} 牛顿米。点击查看官方依据。`);
    // This is a screen-space diagram, not an anatomical registration or a new
    // solver. Its force and perpendicular lever are the same teaching values.
    this.mechanicsInset.innerHTML = `<svg viewBox="0 0 300 250" role="img" aria-label="单轴杠杆受力示意" style="display:block;width:100%;height:auto;font-family:system-ui,sans-serif">
      <text x="17" y="26" fill="#a7c3c9" font-size="17" font-weight="600">单轴受力示意</text><text x="278" y="26" text-anchor="middle" fill="#7d999f" font-size="18">↗</text>
      <path d="M48,${y} H${x}" stroke="#789199" stroke-width="5" stroke-linecap="round"/>
      ${torqueGlyph}
      <circle cx="48" cy="${y}" r="9" fill="#17232a" stroke="#d0dde1" stroke-width="2"/><circle cx="48" cy="${y}" r="2.5" fill="#d0dde1"/>
      <circle cx="${x}" cy="${y}" r="5" fill="#f2ac63"/>
      ${force}<text x="${x}" y="${Math.max(52, top - 12)}" text-anchor="middle" fill="#f4bd85" font-size="21" font-weight="600">F = ${load.toFixed(1)} N</text>
      <path d="M48,187 V199 M48,193 H${x} M${x},187 V199" stroke="#89a8b2" stroke-width="1.5"/>
      <text x="${(48 + x) / 2}" y="217" text-anchor="middle" fill="#b6d0d7" font-size="19">d = ${leverMm.toFixed(0)} mm</text>
      <text x="150" y="242" text-anchor="middle" fill="#e2efef" font-size="20">F × d = ${torque.toFixed(3)} N·m</text>
    </svg>`;
  }

  setView(view = 'oblique') {
    if (!this.camera || this.disposed) return;
    const offset = {oblique: [.59, -.055, .09], palm: [.63, 0, .021], side: [.07, 0, .63], mechanics: [.59, -.055, .09]}[view]
      || [.59, -.055, .09];
    this.automaticMechanicsView = view === 'mechanics';
    this.controls.target.set(0, -.10, 0);
    this.camera.position.copy(this.controls.target).add(vec(offset));
    this.controls.update(); this.render();
  }
  reset() {
    this.setState({parameters: {...DEFAULTS}, phase: 0, playing: false});
    this.setView(this.state.route === 'opensim' && ['id', 'so'].includes(this.state.step) ? 'mechanics' : 'oblique');
  }
  resize() {
    if (!this.renderer || this.disposed) return;
    const width = this.host.clientWidth, height = this.host.clientHeight;
    if (this.mechanicsInset) {
      const narrow = width < 600;
      this.mechanicsInset.style.width = `${narrow ? Math.min(190, width * .49) : Math.min(280, width * .29)}px`;
      this.mechanicsInset.style.left = `${narrow ? 12 : 28}px`;
      this.mechanicsInset.style.bottom = `${narrow ? 75 : Math.max(110, height * .20)}px`;
    }
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    // Preserve anatomy framing on narrow screens without cropping the fingers.
    this.camera.fov = width / height < .7 ? 43 : 35;
    this.camera.updateProjectionMatrix(); this.render();
  }
  render() {
    if (!this.renderer || this.disposed || !this.host.clientWidth || !this.host.clientHeight) return;
    this.renderer.render(this.scene, this.camera);
    const width = this.host.clientWidth, height = this.host.clientHeight;
    const occupied = [];
    for (const {button, descriptor} of this.labels) {
      const projected = descriptor.point.clone().project(this.camera);
      if (projected.z < -1 || projected.z > 1) {button.hidden = true; continue;}
      button.hidden = false;
      const w = button.offsetWidth || 100, h = button.offsetHeight || 30;
      let x = clamp((projected.x * .5 + .5) * width + 15, 12, width - w - 12);
      let y = clamp((-projected.y * .5 + .5) * height - h / 2, Math.min(120, height * .2), height - 80 - h);
      if (descriptor.id === 'external-force') y = Math.max(Math.min(120, height * .2), y - 42);
      for (const box of occupied) if (x < box.x + box.w + 5 && x + w + 5 > box.x && y < box.y + box.h + 6 && y + h + 6 > box.y)
        y = clamp(box.y + box.h + 8, Math.min(120, height * .2), height - 80 - h);
      occupied.push({x, y, w, h});
      button.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.observer?.disconnect();
    this.listeners.forEach(([target, event, callback]) => target.removeEventListener(event, callback));
    this.controls?.removeEventListener('change', this.handleOrbit);
    this.controls?.dispose();
    this.materials.forEach(material => material.dispose());
    this.geometries.forEach(geometry => geometry.dispose());
    if (this.forceArrow) {
      this.forceArrow.line.geometry.dispose(); this.forceArrow.line.material.dispose();
      this.forceArrow.cone.geometry.dispose(); this.forceArrow.cone.material.dispose();
    }
    this.renderer?.dispose();
    this.canvas?.remove(); this.overlay?.remove(); this.fallback?.remove(); this.mechanicsInset?.remove();
    this.host.style.position = this.oldPosition;
  }
}
