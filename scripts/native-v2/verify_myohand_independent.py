"""Independent fresh-environment replay; intentionally does not import the app runner.

Replays archived control sequences, not their controller or trajectory optimizer.
Checks every saved q/qvel/activation/force/generalized-force frame and the declared
effective parameter edits. Output is evidence, not an invented new solver result.
"""
import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path
import gymnasium as gym
import myosuite
import mujoco
import numpy as np


def verify(filename):
    path = Path(filename)
    payload = json.loads(path.read_text())
    run = payload.get('current', payload)  # Browser JSON export or direct native run.
    manifest, frames = run['manifest'], run['frames']
    effective = manifest['effective']
    if mujoco.__version__ != '3.3.0' or importlib.metadata.version('myosuite') != '2.11.6':
        raise RuntimeError('Independent replay requires declared MuJoCo3.3.0 / MyoSuite2.11.6')
    if manifest['environment'] != 'myoHandPoseFixed-v0':
        raise ValueError('Unexpected environment')
    # A separate fresh gym instance; no application solver functions are used.
    env = gym.make('myoHandPoseFixed-v0')
    env.reset(seed=11)
    model, data = env.unwrapped.sim.model.ptr, env.unwrapped.sim.data.ptr
    assert (model.nq, model.nv, model.nu, model.na) == (23, 23, 39, 39)
    native_names = [mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_ACTUATOR, i) for i in range(39)]
    assert native_names == run['muscleNames']
    coordinate_names = [mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_JOINT, i) for i in range(23)]
    assert coordinate_names == run['coordinateNames']
    for i, name in enumerate(native_names):
        strength = effective['forceScale'] * effective.get('muscleForceScales', {}).get(name, 1)
        response = effective['activationTimeScale'] * effective.get('muscleActivationTimeScales', {}).get(name, 1)
        model.actuator_gainprm[i, 2] *= strength
        model.actuator_biasprm[i, 2] *= strength
        model.actuator_dynprm[i, 0:2] *= response
    parameter_errors = {}
    for key, actual in [('gainParameters', model.actuator_gainprm),
                        ('biasParameters', model.actuator_biasprm),
                        ('dynamicsParameters', model.actuator_dynprm)]:
        parameter_errors[key] = float(np.max(np.abs(actual - effective['muscleParameters'][key])))
    assert np.max(np.abs(model.opt.gravity - effective['gravity_m_s2'])) < 1e-12
    assert abs(model.opt.timestep - effective['timestep_s']) < 1e-14
    data.qpos[:] = effective['initialQ']
    data.qvel[:] = effective['initialQvel']
    data.act[:] = effective['initialActivation']
    data.ctrl[:] = 1 / (1 + np.exp(7.5))
    data.time = 0
    dt = float(model.opt.timestep)
    controls = {int(round(c['time_s'] / dt)): c for c in run['controlSequence']}
    records = {int(round(f['time_s'] / dt)): f for f in frames}
    assert len(records) == len(frames), 'Duplicate output time'
    fields = {'q': 'qpos', 'qvel': 'qvel', 'activation': 'act',
              'force_N': 'actuator_force', 'qfrcActuator_Nm': 'qfrc_actuator'}
    maxima = {key: 0.0 for key in fields}
    action_error = 0.0
    compared = 0
    for step in range(max(records) + 1):
        mujoco.mj_forward(model, data)
        if step in controls:
            control = controls[step]
            encoded = 1 / (1 + np.exp(-5 * (np.asarray(control['raw_action']) - .5)))
            action_error = max(action_error, float(np.max(np.abs(encoded - control['ctrl']))))
            data.ctrl[:] = control['ctrl']
            mujoco.mj_forward(model, data)
        if step in records:
            record = records[step]
            assert abs(float(data.time) - record['time_s']) < 1e-9
            for key, native_field in fields.items():
                actual = np.asarray(getattr(data, native_field))
                maxima[key] = max(maxima[key], float(np.max(np.abs(actual - record[key]))))
            compared += 1
        if step < max(records):
            mujoco.mj_step(model, data)
    source_root = Path(myosuite.__file__).parent
    source_checks = {name: hashlib.sha256((source_root/name).read_bytes()).hexdigest() == expected
                     for name, expected in manifest['sourceFiles'].items()}
    env.close()
    tolerance = 1e-8  # Export rounds these arrays to 10 decimal places.
    passed = (all(v <= tolerance for v in maxima.values()) and
              all(v <= 1e-12 for v in parameter_errors.values()) and
              action_error <= 1e-12 and all(source_checks.values()))
    return {'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'runId': manifest['runId'], 'framesCompared': compared,
            'muscles': len(native_names), 'coordinates': len(coordinate_names),
            'forceScale': effective['forceScale'], 'activationTimeScale': effective['activationTimeScale'],
            'maxAbsErrors': maxima, 'absoluteTolerance': tolerance,
            'parameterMaxAbsErrors': parameter_errors, 'rawActionControlMaxAbsError': action_error,
            'sourceHashChecks': source_checks, 'passed': passed}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('runs', nargs='+')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    evidence = {'verification': 'fresh independent native forward replay of archived controls',
                'scope': 'Does not validate optimization/controller optimality or physiological truth.',
                'engineVersion': mujoco.__version__,
                'myosuiteVersion': importlib.metadata.version('myosuite'),
                'results': []}
    for filename in args.runs:
        try:
            evidence['results'].append(verify(filename))
        except Exception as error:
            evidence['results'].append({'file': Path(filename).name, 'passed': False,
                                        'error': type(error).__name__ + ': ' + str(error)})
    evidence['passed'] = all(r['passed'] for r in evidence['results'])
    destination = Path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(evidence, indent=2, allow_nan=False) + '\n')
    print(json.dumps({'passed': evidence['passed'], 'runs': len(evidence['results']), 'output': str(destination)}))
    raise SystemExit(0 if evidence['passed'] else 1)
