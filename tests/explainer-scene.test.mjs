import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL} from '../model-data.js';
import {ATLAS} from '../atlas-data.js';
import {FITTED_ROUTES} from '../route-data.js';
import {buildRig, tendonSegments} from '../motion.js';

// Use the exact vendored Three.js math/geometry implementation without WebGL,
// a DOM, a browser, or screenshots. Browser rendering is a separate QA layer.
const oldWindow = globalThis.window;
globalThis.window = globalThis;
const {ExplainerScene} = await import('../explainer/scene.js');
const THREE = globalThis.THREE;
if (oldWindow === undefined) delete globalThis.window;
else globalThis.window = oldWindow;

function createSceneFixture() {
  const scene = Object.create(ExplainerScene.prototype);
  const joint = ATLAS.joints.find(j => j.dofs.some(d => d.id === 'index_MCP_flex'));
  scene.rig = buildRig(MODEL, joint, joint.dofs.find(d => d.id === 'index_MCP_flex'));
  scene.pivot = new THREE.Vector3(...scene.rig.pivot);
  const anchor = name => MODEL.joints.find(j => j.name === name).anchor_i16.map(v => v * MODEL.quant);
  const dip = anchor('md2_flexion'), pip = anchor('pm2_flexion');
  scene.tip = dip.map((v, i) => v + .72 * (v - pip[i]));
  scene.markerRest = [scene.rig.pivot, pip, dip, scene.tip];
  scene.state = {route: 'opensim', step: 'overview', phase: 0, playing: false,
    parameters: {angle: 25, scale: 1, explode: 0, noise: 0, load: 2, lever: 35,
      strength: 1, activation: .2, selectedMuscle: 'FDS2'}};
  scene.renderer = {}; // setState requires availability; no rendering is performed.
  scene.bones = MODEL.bones.map(bone => {
    const mesh = new THREE.Mesh(); mesh.name = bone.name; return mesh;
  });
  scene.ghosts = scene.bones.filter(bone => bone.name.startsWith('2')).map(bone => {
    const mesh = new THREE.Mesh(); mesh.name = bone.name; return mesh;
  });
  scene.ghostGroup = new THREE.Group();
  scene.pathGroup = new THREE.Group();
  scene.wrapGroup = new THREE.Group();
  scene.wrapAnchors = [new THREE.Mesh(), new THREE.Mesh()];
  scene.markers = Array.from({length: 4}, () => ({fitted: new THREE.Mesh(), observed: new THREE.Mesh()}));
  scene.paths = new Map();
  for (const id of ['FDS2', 'FDP2', 'EDC2']) {
    const meta = ATLAS.tendons.find(t => t.id === id);
    const segments = tendonSegments(MODEL, meta, FITTED_ROUTES[id]);
    const material = new THREE.MeshBasicMaterial();
    scene.paths.set(id, {meta, segments, material,
      mesh: new THREE.InstancedMesh(new THREE.BufferGeometry(), material, segments.length),
      endpoints: [new THREE.Mesh(), new THREE.Mesh()], posed: []});
  }
  scene.dummy = new THREE.Object3D();
  scene.up = new THREE.Vector3(0, 1, 0);
  scene.diagnostics = {};
  for (const name of ['residualLine', 'dimensionLine', 'trajectoryLine', 'axisLine', 'ringLine', 'leverLine', 'wrapPath', 'wrapLeader'])
    scene[name] = new THREE.Line(new THREE.BufferGeometry());
  scene.forceArrow = new THREE.ArrowHelper();
  scene.contactDot = new THREE.Mesh();
  scene.updateLabels = () => {};
  scene.render = () => {};
  scene.setView = () => {};
  scene.setState({});
  return scene;
}

function transforms(scene) {
  return {
    bones: scene.bones.map(bone => [...bone.matrix.elements]),
    paths: [...scene.paths.values()].map(path => [...path.mesh.instanceMatrix.array]),
    endpoints: [...scene.paths.values()].map(path => path.endpoints.map(point => point.position.toArray())),
  };
}

test('explainer display scale/explosion resets exactly without modifying source meshes or paths', () => {
  const modelBefore = JSON.stringify(MODEL), pathsBefore = JSON.stringify(FITTED_ROUTES);
  const scene = createSceneFixture(), baseline = transforms(scene);
  scene.setState({step: 'scale', parameters: {scale: 1.3, explode: 1, angle: 46}});
  assert.notDeepEqual(transforms(scene), baseline);
  assert.equal(scene.wrapGroup.visible, true);
  scene.reset();
  assert.deepEqual(transforms(scene), baseline);
  assert.equal(scene.wrapGroup.visible, false);
  assert.equal(JSON.stringify(MODEL), modelBefore);
  assert.equal(JSON.stringify(FITTED_ROUTES), pathsBefore);
});

test('IK readout matches shown marker distances and recovers the synthetic target', () => {
  const scene = createSceneFixture();
  scene.setState({step: 'ik', parameters: {angle: 0, noise: 0}});
  const displayedRms = 1000 * Math.sqrt(scene.markers.reduce((sum, marker) =>
    sum + marker.fitted.position.distanceToSquared(marker.observed.position), 0) / 4);
  assert.ok(Math.abs(displayedRms - scene.getDiagnostics().markerRmsMm) < 1e-12);
  assert.ok(Math.abs(displayedRms - 25.300728179205876) < 1e-9);
  const clean = scene.findBestIKAngle(0);
  assert.equal(clean.angle, 25);
  assert.ok(clean.markerRmsMm < 1e-9);
  const noisy = scene.findBestIKAngle(2);
  assert.ok(noisy.angle >= 0 && noisy.angle <= 75);
  assert.ok(noisy.markerRmsMm > 0);
  assert.ok(noisy.markerRmsMm < scene.getIKResidual(0, 2));
  scene.setState({parameters: {angle: noisy.angle, noise: 2}});
  assert.ok(Math.abs(scene.getDiagnostics().markerRmsMm - noisy.markerRmsMm) < 1e-9);
});

test('WebGL fallback cannot report a bogus IK fit when marker geometry is unavailable', () => {
  const scene = Object.create(ExplainerScene.prototype);
  scene.state = {parameters: {noise: 0}};
  assert.equal(scene.getIKResidual(25, 0), null);
  assert.equal(scene.findBestIKAngle(), null);
  assert.equal(scene.findBestIKAngle(2), null);
});

test('36 signed lever cases match the displayed application point and -F*d external torque', () => {
  const scene = createSceneFixture();
  let count = 0;
  for (const angle of [0, 10, 25, 75]) for (const lever of [5, 35, 60]) for (const load of [0, 2, 12]) {
    scene.setState({route: 'opensim', step: 'id', parameters: {angle, lever, load}});
    assert.ok(Math.abs(scene.diagnostics.displayLeverMm - lever) < 1e-10);
    assert.ok(Math.abs(scene.contactDot.position.distanceTo(scene.pivot) * 1000 - lever) < 1e-10);
    assert.ok(Math.abs(scene.diagnostics.externalTorqueNm + load * lever / 1000) < 1e-12);
    assert.equal(scene.forceArrow.visible, load > 0);
    assert.equal(scene.leverLine.visible, true);
    count++;
  }
  assert.equal(count, 36);
});

test('MyoHand does not invent external contact or overwrite provided angles during playback', () => {
  const scene = createSceneFixture();
  for (const step of ['force', 'transmission', 'dynamics', 'integration']) {
    scene.setState({route: 'myohand', step, playing: true, phase: .6, parameters: {angle: 31, load: 2}});
    assert.equal(scene.forceArrow.visible, false);
    assert.equal(scene.contactDot.visible, false);
    assert.equal(scene.leverLine.visible, false);
    assert.equal(scene.wrapGroup.visible, false);
    assert.equal(scene.diagnostics.displayAngleDeg, 31);
  }
});

test('mechanics camera changes on step entry, not on every parameter update', () => {
  const scene = createSceneFixture(), views = [];
  scene.setView = view => {views.push(view); scene.automaticMechanicsView = view === 'mechanics';};
  scene.setState({route: 'opensim', step: 'id'});
  assert.deepEqual(views, ['mechanics']);
  scene.setState({parameters: {load: 5}});
  assert.deepEqual(views, ['mechanics']);
  scene.setState({route: 'opensim', step: 'so'});
  assert.deepEqual(views, ['mechanics', 'mechanics']);
  scene.setState({route: 'opensim', step: 'ik'});
  assert.deepEqual(views, ['mechanics', 'mechanics', 'oblique']);
});

test('screen-space mechanics diagram uses the same force and lever values, without zero-load arrows', () => {
  const scene = createSceneFixture();
  scene.mechanicsInset = {style: {}, attributes: {}, setAttribute(name, value) {this.attributes[name] = value;}};
  scene.updateMechanicsInset(true, 2, 35);
  assert.equal(scene.mechanicsInset.style.display, 'block');
  assert.match(scene.mechanicsInset.innerHTML, /F = 2.0 N/);
  assert.match(scene.mechanicsInset.innerHTML, /d = 35 mm/);
  assert.match(scene.mechanicsInset.innerHTML, /F × d = 0.070 N·m/);
  assert.match(scene.mechanicsInset.attributes['aria-label'], /单轴受力示意/);
  scene.updateMechanicsInset(true, 0, 35);
  assert.match(scene.mechanicsInset.innerHTML, /F × d = 0.000 N·m/);
  assert.doesNotMatch(scene.mechanicsInset.innerHTML, /stroke-width="4"/);
  assert.doesNotMatch(scene.mechanicsInset.innerHTML, /A28,28/);
  scene.updateMechanicsInset(false, 0, 35);
  assert.equal(scene.mechanicsInset.style.display, 'none');
});

test('detached wrapping schematic is only visible in exploded Scale, not a solver path', () => {
  const scene = createSceneFixture();
  for (const step of ['overview', 'ik', 'id', 'so', 'moco']) {
    scene.setState({route: 'opensim', step, parameters: {explode: 1}});
    assert.equal(scene.wrapGroup.visible, false);
  }
  scene.setState({step: 'scale', parameters: {explode: .5}});
  assert.equal(scene.wrapGroup.visible, true);
  scene.setState({parameters: {explode: 0}});
  assert.equal(scene.wrapGroup.visible, false);
});

test('hotspot meaning and source title refresh when switching between model routes', () => {
  const oldDocument = globalThis.document;
  globalThis.document = {createElement: () => ({style: {}, attributes: {},
    setAttribute(name, value) {this.attributes[name] = value;}, addEventListener() {}})};
  try {
    const scene = createSceneFixture();
    scene.overlay = {replaceChildren() {}, append() {}};
    const update = () => ExplainerScene.prototype.updateLabels.call(scene,
      {isScale: false, isIK: false, isForce: false, showPaths: true, selected: 'FDS2'});
    update();
    assert.match(scene.labels[0].button.title, /食指浅屈肌的已映射通路/);
    assert.match(scene.labels[0].button.title, /OpenSim · Workflows/);
    scene.state.route = 'myohand';
    update();
    assert.match(scene.labels[0].button.title, /MuJoCo · Muscle actuators/);
    assert.match(scene.labels[0].button.attributes['aria-label'], /MuJoCo · Muscle actuators/);
  } finally {
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});
