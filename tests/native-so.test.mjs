import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const read = path => fs.readFileSync(new URL(path, import.meta.url));
const fixture = JSON.parse(read('../explainer/fixtures/opensim-so-native.json'));
const evidence = '../docs/explainer/native-so-evidence/';
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const close = (a, b, tolerance = 1e-12) => assert.ok(Math.abs(a-b) <= tolerance, `${a} != ${b}`);
function storage(path) {
  const tail = read(path).toString().split('endheader')[1].trim().split(/\r?\n/);
  const columns = tail.shift().trim().split(/\s+/);
  return tail.filter(x => x.trim()).map(line => Object.fromEntries(line.trim().split(/\s+/).map((v, i) => [columns[i], Number(v)])));
}

test('native SO replay identifies its engine, teaching model and external-force scope', () => {
  assert.equal(fixture.computationTier, 'native-replay');
  assert.match(fixture.opensimVersion, /4\.4\.1/);
  assert.equal(fixture.modelId, 'one-hinge-two-Millard-teaching');
  assert.deepEqual(fixture.muscles, ['flexor', 'extensor']);
  assert.deepEqual(fixture.coordinates, ['angle']);
  assert.match(fixture.modelDescription, /not a hand/);
  assert.ok(fixture.limitations.some(x => /not a contact simulation/.test(x)));
  assert.ok(fixture.limitations.some(x => /No Scale or IK/.test(x)));
  assert.deepEqual(fixture.cases.map(x => x.load_N), [0, 2, 4]);
  assert.equal(fixture.protocol.use_muscle_physiology, true);
  assert.equal(fixture.protocol.activation_exponent, 2);
});

test('every native SO renderer field exists and is finite at all three selector indices', () => {
  const main = read('../explainer/main.js').toString();
  const rendering = main.slice(main.indexOf('function showNativeSO()'), main.indexOf('function range('));
  const optionIndices = [...rendering.matchAll(/<option value="(\d+)">/g)].map(m => Number(m[1]));
  assert.deepEqual(optionIndices, [0, 1, 2]);
  assert.match(main, /fetch\('\.\/explainer\/fixtures\/opensim-so-native\.json'\)/);
  for (const field of ['activation', 'load_N', 'requiredTorque_Nm', 'reserveTorque_Nm', 'balanceMaxAbs_Nm']) {
    assert.ok(rendering.includes(`r.${field}`), `renderer should consume ${field}`);
  }
  for (const i of optionIndices) {
    const r = fixture.cases[i];
    assert.equal(r.activation.length, 2);
    r.activation.forEach(a => assert.ok(Number.isFinite(a) && a >= .01 && a <= 1));
    for (const field of ['load_N', 'requiredTorque_Nm', 'reserveTorque_Nm', 'balanceMaxAbs_Nm']) assert.ok(Number.isFinite(r[field]), field);
    assert.equal(r.nativeToolReturn, true);
  }
});

test('native SO balances gravity, external load, muscle moments and scaled reserve', () => {
  const g = fixture.geometry;
  const s = fixture.protocol.reserve_optimal_force_Nm;
  for (const r of fixture.cases) {
    close(r.requiredTorque_Nm, g.mass_kg * -g.gravity_m_s2[1] * g.com_m[0] + r.load_N * g.leverLength_m);
    r.activation.forEach((a, i) => {
      close(r.muscleForce_N[i], a * r.capacity_N[i], 1e-12);
      close(r.muscleTorque_Nm[i], r.muscleForce_N[i] * r.momentArms_m[i]);
    });
    close(r.reserveTorque_Nm, r.reserveControl * s);
    const error = Math.abs(r.muscleTorque_Nm.reduce((a,b) => a+b, 0) + r.reserveTorque_Nm - r.requiredTorque_Nm);
    close(error, r.balanceMaxAbs_Nm, 1e-12);
    assert.ok(error < 1e-6);
    assert.ok(r.reserveControl >= -20 && r.reserveControl <= 20);
  }
  assert.ok(fixture.cases[0].requiredTorque_Nm > 0, 'zero external load still requires gravity support');
});

test('native SO agrees with an independently derived squared-control optimum', () => {
  const scale = fixture.protocol.reserve_optimal_force_Nm;
  for (const r of fixture.cases) {
    const [cf, ce] = r.capacity_N.map((x,i) => x * r.momentArms_m[i]);
    const extensorLowerBound = .01;
    const remaining = r.requiredTorque_Nm - ce * extensorLowerBound;
    const denominator = cf ** 2 + scale ** 2;
    close(r.activation[1], extensorLowerBound);
    close(r.activation[0], cf * remaining / denominator, 1e-7);
    close(r.reserveControl, scale * remaining / denominator, 1e-8);
  }
});

test('displayed values trace to preserved native output and immutable model/generator hashes', () => {
  close(fixture.cases.length, 3);
  assert.equal(hash(read('../scripts/explainer/generate_opensim_teaching.py')), fixture.generatorSha256);
  assert.deepEqual(JSON.parse(read(evidence + 'opensim-so-native.json')), fixture);
  for (const r of fixture.cases) {
    const prefix = `${evidence}load_${r.load_N}N/`;
    assert.equal(hash(read(prefix + 'model.osim')), r.modelSha256);
    assert.equal(hash(read(prefix + 'teaching_official_so_activation.sto')), r.activationFileSha256);
    const a = storage(prefix + 'teaching_official_so_activation.sto');
    const f = storage(prefix + 'teaching_official_so_force.sto');
    assert.equal(a.length, r.frames);
    assert.equal(f.length, r.frames);
    assert.equal(r.frames, 21);
    a.forEach((row,i) => {
      close(row.time, i * .01);
      close(row.flexor, r.activation[0]); close(row.extensor, r.activation[1]);
      close(row.reserve, r.reserveControl);
      close(f[i].flexor, r.muscleForce_N[0]); close(f[i].extensor, r.muscleForce_N[1]);
      close(f[i].reserve, r.reserveTorque_Nm);
      close(f[i].ground_known_downward_force_fy, -r.load_N);
      close(f[i].ground_known_downward_force_px, .3);
    });
    assert.match(read(prefix + 'model.osim').toString(), /PrescribedForce/);
  }
});

test('public native SO fixture does not expose local user or temporary paths', () => {
  assert.doesNotMatch(JSON.stringify(fixture), /\/Users\/|\/var\/folders\/|\/home\//);
});
