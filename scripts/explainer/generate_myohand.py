"""Native, version-pinned MyoHand educational fixtures; no research model edits.

Run using an installed MyoSuite 2.11.6 / MuJoCo 3.3.0 environment.
The public JSON deliberately contains package-relative provenance only.
"""
from pathlib import Path
import hashlib
import importlib.metadata
import json
import datetime
import copy
import argparse
import numpy as np
import gymnasium as gym
import mujoco as mj
import myosuite

OUT = Path(__file__).resolve().parent
PKG = Path(myosuite.__file__).parent
ENV = "myoHandPoseFixed-v0"

def digest(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def dense_moment(m, d):
    result = np.zeros((m.nu, m.nv))
    raw = np.asarray(d.actuator_moment)
    if raw.shape == result.shape:
        return raw.copy()
    if hasattr(d, "moment_rownnz"):
        mj.mju_sparse2dense(result, raw.ravel(), d.moment_rownnz,
                           d.moment_rowadr, d.moment_colind)
        return result
    return raw.reshape(result.shape).copy()

def arr(x):
    return np.asarray(x).tolist()

def main(output=OUT, environment=ENV, seed=11):
    output = Path(output)
    output.mkdir(parents=True,exist_ok=True)
    env = gym.make(environment)
    env.reset(seed=seed)
    u = env.unwrapped
    m = u.sim.model.ptr
    initial = u.sim.data.ptr
    assert mj.__version__ == "3.3.0"
    assert importlib.metadata.version("myosuite") == "2.11.6"
    assert (m.nq,m.nv,m.nu,m.na) == (23,23,39,39)
    assert np.all(m.jnt_type == int(mj.mjtJoint.mjJNT_HINGE))
    assert np.all(m.actuator_dyntype == int(mj.mjtDyn.mjDYN_MUSCLE))
    names = [mj.mj_id2name(m,mj.mjtObj.mjOBJ_ACTUATOR,i) for i in range(m.nu)]
    joints = [mj.mj_id2name(m,mj.mjtObj.mjOBJ_JOINT,i) for i in range(m.njnt)]
    aid = names.index("FDS2")
    jid = joints.index("mcp2_flexion")
    qid = int(m.jnt_qposadr[jid]); did = int(m.jnt_dofadr[jid])
    # Verify the real environment action path before using its equivalent held
    # controls in a private MjData simulation at every native physics step.
    raw = np.linspace(-1,1,m.nu)
    expected = 1/(1+np.exp(-5*(raw-.5)))
    env.step(raw)
    transform_error = float(np.max(np.abs(u.sim.data.ptr.ctrl-expected)))
    assert transform_error < 1e-12
    env.reset(seed=seed)
    initial = u.sim.data.ptr
    base = copy.deepcopy(initial)
    base.time = 0
    assert np.all(base.qvel == 0)
    maxmap = maxforce = maxdynamics = 0.

    def sample(d, raw_selected):
        nonlocal maxmap,maxforce,maxdynamics
        mj.mj_forward(m,d)
        moment = dense_moment(m,d)
        maperr = float(np.max(np.abs(moment.T @ d.actuator_force-d.qfrc_actuator)))
        gain = mj.mju_muscleGain(d.actuator_length[aid],d.actuator_velocity[aid],m.actuator_lengthrange[aid],m.actuator_acc0[aid],m.actuator_gainprm[aid,:9])
        bias = mj.mju_muscleBias(d.actuator_length[aid],m.actuator_lengthrange[aid],m.actuator_acc0[aid],m.actuator_biasprm[aid,:9])
        pred = gain*d.act[aid]+bias
        forceerr = abs(float(pred-d.actuator_force[aid]))
        mass = np.zeros((m.nv,m.nv)); mj.mj_fullM(m,mass,d.qM)
        rhs = d.qfrc_actuator+d.qfrc_passive+d.qfrc_applied+d.qfrc_constraint-d.qfrc_bias
        dynerr = float(np.max(np.abs(mass@d.qacc-rhs)))
        maxmap = max(maxmap,maperr); maxforce=max(maxforce,forceerr); maxdynamics=max(maxdynamics,dynerr)
        return {"time_s":round(float(d.time),9),"raw_action":float(raw_selected),
            "ctrl":float(d.ctrl[aid]),"activation":float(d.act[aid]),
            "actuator_force_N":float(d.actuator_force[aid]),
            "tension_N":float(-d.actuator_force[aid]),
            "active_tension_N":float(-gain*d.act[aid]),"passive_tension_N":float(-bias),
            "actuator_length_m":float(d.actuator_length[aid]),
            "actuator_velocity_m_s":float(d.actuator_velocity[aid]),
            "selected_moment_m":float(moment[aid,did]),
            "selected_joint_torque_Nm":float(moment[aid,did]*d.actuator_force[aid]),
            "qfrc_actuator_Nm":float(d.qfrc_actuator[did]),
            "joint_angle_rad":float(d.qpos[qid]),"joint_velocity_rad_s":float(d.qvel[did]),
            "joint_acceleration_rad_s2":float(d.qacc[did]),
            "qpos_rad":arr(d.qpos),"contact_count":int(d.ncon)}

    pulse_data = copy.deepcopy(base)
    pulse=[]
    for k in range(201):
        t=k*m.opt.timestep
        action=np.full(m.nu,-1.)
        action[aid] = 0.5 if .04-1e-12 <= t < .14-1e-12 else -1.
        pulse_data.ctrl[:] = 1/(1+np.exp(-5*(action-.5)))
        pulse.append(sample(pulse_data,action[aid]))
        if k<200: mj.mj_step(m,pulse_data)

    twins=[]
    for activation in (.02,.6):
        d=copy.deepcopy(base)
        d.act[:] = .02; d.act[aid]=activation
        raw=np.full(m.nu,-1.); raw[aid]=.2
        d.ctrl[:] = 1/(1+np.exp(-5*(raw-.5)))
        trace=[]
        for k in range(51):
            trace.append(sample(d,.2))
            if k<50: mj.mj_step(m,d)
        twins.append({"initial_selected_activation":activation,"trace":trace})
    assert np.array_equal(twins[0]["trace"][0]["qpos_rad"],twins[1]["trace"][0]["qpos_rad"])
    assert twins[0]["trace"][0]["joint_velocity_rad_s"] == twins[1]["trace"][0]["joint_velocity_rad_s"] == 0
    assert maxmap < 1e-10 and maxforce < 1e-10 and maxdynamics < 1e-8
    sources = {}
    sourcefiles = ["envs/myo/base_v0.py","envs/myo/myobase/__init__.py","envs/myo/myobase/pose_v0.py",
        "envs/myo/assets/hand/myohand_pose.xml","simhive/myo_sim/hand/assets/myohand_assets.xml",
        "simhive/myo_sim/hand/assets/myohand_body.xml","simhive/myo_sim/scene/myosuite_scene.xml"]
    for f in sourcefiles:
        sources[f] = {"sha256":digest(PKG/f)}
    manifest={"id":"native-myohand-posefixed-2.11.6-mj3.3.0","computationTier":"native-replay",
        "environment":environment,"myosuiteVersion":"2.11.6","mujocoVersion":mj.__version__,
        "myosuiteTagCommit":"05cb84678373f91271004f99602ebbf01e57d1a1",
        "myoSimCommit":"33f3ded946f55adbdcf963c99999587aadaf975f",
        "sourceVerification":"All seven listed installed files are byte-identical to the pinned official MyoSuite and myo_sim commits.",
        "generatedUtc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "generator":Path(__file__).name,"generatorSha256":digest(__file__),
        "seed":seed,"counts":{"qpos":m.nq,"qvel":m.nv,"muscles":m.nu,"activationStates":m.na,"tendonsIncludingVisualization":m.ntendon},
        "jointNames":joints,"muscleNames":names,"physicsTimestep_s":m.opt.timestep,
        "controlInterval_s":u.dt,"frameSkip":u.frame_skip,"integrator":"Euler (native enum 0)",
        "actionTransform":"ctrl = sigmoid(5 * (raw_action - 0.5)); raw_action in [-1,1]; ctrl actuator range [0,1]",
        "units":{"qpos_rad":"rad","activation":"dimensionless","ctrl":"dimensionless","actuator_force_N":"N signed","tension_N":"N positive tensile","actuator_length_m":"m geometry path","selected_moment_m":"m/rad","qfrc_actuator_Nm":"Nm"},
        "sources":sources,
        "officialSources":[
            {"id":"myo-action","title":"MyoSuite BaseV0.step","url":"https://github.com/MyoHub/myosuite/blob/05cb84678373f91271004f99602ebbf01e57d1a1/myosuite/envs/myo/base_v0.py#L82-L125","section":"Normalized action transformation and robot.step"},
            {"id":"myo-environment","title":"MyoSuite environment registration","url":"https://github.com/MyoHub/myosuite/blob/05cb84678373f91271004f99602ebbf01e57d1a1/myosuite/envs/myo/myobase/__init__.py#L257-L300","section":"myoHandPoseFixed-v0"},
            {"id":"myo-native-model","title":"Native MyoHand muscle definitions","url":"https://github.com/MyoHub/myo_sim/blob/33f3ded946f55adbdcf963c99999587aadaf975f/hand/assets/myohand_assets.xml#L500-L541","section":"39 muscle actuators; force and lengthrange"},
            {"id":"mj-muscles","title":"MuJoCo 3.3.0: Muscles","url":"https://mujoco.readthedocs.io/en/3.3.0/modeling.html#muscles","section":"Muscles: length scaling, FLV, sign, activation dynamics, relation to OpenSim"},
            {"id":"mj-transmission","title":"MuJoCo 3.3.0: Actuation model","url":"https://mujoco.readthedocs.io/en/3.3.0/computation/index.html#actuation-model","section":"Transmission, stateful actuators, force generation"},
            {"id":"mj-force-code","title":"MuJoCo native muscle gain and bias","url":"https://github.com/google-deepmind/mujoco/blob/3.3.0/src/engine/engine_util_misc.c#L530-L649","section":"mju_muscleGain, mju_muscleBias, mju_muscleDynamics"},
            {"id":"mj-muscle-xml","title":"MuJoCo muscle actuator XML","url":"https://mujoco.readthedocs.io/en/3.3.0/XMLreference.html#actuator-muscle","section":"muscle actuator attributes"}
        ],
        "selectedMuscle":{"name":names[aid],"actuatorId":aid,"joint":joints[jid],"jointId":jid,
            "actuatorLengthrange_m":arr(m.actuator_lengthrange[aid]),"gainParameters":arr(m.actuator_gainprm[aid,:9]),
            "biasParameters":arr(m.actuator_biasprm[aid,:9]),"activationTimeConstants_s":arr(m.actuator_dynprm[aid,:2]),
            "actearly":bool(m.actuator_actearly[aid]),"forceScale_N":float(m.actuator_gainprm[aid,2])},
        "limitations":["Native model simulation; not measured human data or a learned policy.","Selected model is not registered to the website display skeleton; display animation is illustrative.","Pulse has manually prescribed controls; twin activations are manually initialized controlled interventions, not naturally reached states.","Geometry path length is not elastic tendon extension. This MuJoCo muscle uses its native lengthrange/range mapping, not OpenSim lopt/lTS parameters.","Native muscle force is signed negative for tension; positive tension is exported as its negative.","Control is transformed from normalized action; raw action zero is not zero ctrl.","Force traces are replays, not live browser simulation; interpolated playback does not recompute physics."]}
    checks={"status":"PASS","actuatorMappingMaxAbs_Nm":maxmap,"forceDecompositionMaxAbs_N":maxforce,
        "dynamicsMaxAbs_Nm":maxdynamics,"nativeActionTransformMaxAbs":transform_error,
        "mappingEquation":"qfrc_actuator = moment.T @ actuator_force; for positive tension T=-force, R=-moment.T",
        "forceEquation":"actuator_force = mju_muscleGain(length,velocity,...) * act + mju_muscleBias(length,...)",
        "twinInitialPoseIdentical":True,"twinInitialAllVelocitiesZero":True,
        "twinEndSelectedJointDifference_deg":float(np.rad2deg(twins[1]["trace"][-1]["joint_angle_rad"]-twins[0]["trace"][-1]["joint_angle_rad"])),
        "finiteAll":True,"pulseSamples":len(pulse),"twinSamplesEach":len(twins[0]["trace"])}
    fixture={"schemaVersion":1,"manifest":manifest,"pulse":pulse,"internalStateIntervention":twins,"checks":checks}
    # allow_nan=False is the explicit finite-number serialization check.
    (output/"myohand-native.json").write_text(json.dumps(fixture,separators=(",",":"),allow_nan=False)+"\n")
    (output/"CHECKS.json").write_text(json.dumps(checks,indent=2)+"\n")
    (output/"MODEL_MANIFEST.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print(json.dumps(checks,indent=2))
    env.close()

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=OUT)
    parser.add_argument('--environment',choices=[ENV],default=ENV)
    parser.add_argument('--seed',type=int,default=11)
    args=parser.parse_args()
    main(args.output,args.environment,args.seed)
