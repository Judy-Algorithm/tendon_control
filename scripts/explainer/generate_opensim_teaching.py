"""Export actual OpenSim StaticOptimization on a synthetic one-joint teaching model.

This is not the site's hand model and not a personalized-model validation.
Run with OpenSim 4.4.1; --output keeps each native log/model/motion inspectable.
"""
from pathlib import Path
import argparse
import json
import hashlib
import math
import time
import numpy as np
import opensim as o

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def read_sto(p):
    lines=p.read_text().splitlines()
    i=next(i for i,l in enumerate(lines) if l.strip()=='endheader')
    return lines[i+1].split(),np.loadtxt(lines[i+2:],ndmin=2)

def run(output):
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    records=[]
    for force in (0.,2.,4.):
        d=output/f'load_{int(force)}N';d.mkdir(exist_ok=True)
        model=o.Model();model.setName('one_hinge_two_muscles_teaching')
        model.setGravity(o.Vec3(0,-9.81,0))
        body=o.Body('lever',1.,o.Vec3(.15,0,0),o.Inertia(.003,.01,.01,0,0,0))
        joint=o.PinJoint('hinge',model.getGround(),o.Vec3(0),o.Vec3(0),body,o.Vec3(0),o.Vec3(0))
        coord=joint.updCoordinate();coord.setName('angle');coord.setDefaultValue(0.)
        coord.setRangeMin(-1.);coord.setRangeMax(1.)
        model.addBody(body);model.addJoint(joint)
        for name,Fmax,side in [('flexor',100.,1),('extensor',80.,-1)]:
            muscle=o.Millard2012EquilibriumMuscle(name,Fmax,.1,math.sqrt(.02)-.1,0.)
            muscle.addNewPathPoint('origin',model.getGround(),o.Vec3(0,.1*side,0))
            muscle.addNewPathPoint('insertion',body,o.Vec3(.1,0,0))
            model.addForce(muscle)
        reserve=o.CoordinateActuator('angle');reserve.setName('reserve')
        reserve.setOptimalForce(.01);reserve.setMinControl(-20.);reserve.setMaxControl(20.)
        model.addForce(reserve)
        load=o.PrescribedForce('known_downward_force',body)
        load.setPointFunctions(o.Constant(.3),o.Constant(0),o.Constant(0))
        load.setForceFunctions(o.Constant(0),o.Constant(-force),o.Constant(0))
        load.setForceIsInGlobalFrame(True);load.setPointIsInGlobalFrame(False)
        model.addForce(load)
        analysis=o.StaticOptimization();analysis.setName('official_so')
        analysis.setStartTime(0);analysis.setEndTime(.2)
        analysis.setUseModelForceSet(True);analysis.setUseMusclePhysiology(True)
        analysis.setActivationExponent(2.);analysis.setConvergenceCriterion(1e-8);analysis.setMaxIterations(1000)
        model.addAnalysis(analysis);model.finalizeConnections();state=model.initSystem()
        model.printToXML(str(d/'model.osim'))
        ts=np.arange(21)*.01
        motion=d/'constant_angle.mot'
        motion.write_text('Teaching static motion\nversion=1\nnRows=21\nnColumns=2\ninDegrees=no\nendheader\ntime\tangle\n'+''.join(f'{t:.8f}\t0\n' for t in ts))
        tool=o.AnalyzeTool();tool.setName('teaching');tool.setModel(model);tool.setToolOwnsModel(False)
        tool.setInitialTime(0);tool.setFinalTime(.2);tool.setResultsDir(str(d));tool.setOutputPrecision(16)
        tool.setStatesFromMotion(state,o.Storage(str(motion)),False)
        o.Logger.addFileSink(str(d/'native.log'))
        start=time.perf_counter()
        try: success=bool(tool.run())
        finally: o.Logger.removeFileSink()
        duration=time.perf_counter()-start
        columns,values=read_sto(d/'teaching_official_so_activation.sto')
        fcols,fvalues=read_sto(d/'teaching_official_so_force.sto')
        assert success and len(values)==21 and np.isfinite(values).all()
        # Reopen untouched same teaching model; independently evaluate the
        # official SO force law (rigid/inextensible tendon active force capacity).
        fresh=o.Model(str(d/'model.osim'));s=fresh.initSystem();fresh.realizeVelocity(s)
        c=fresh.getCoordinateSet().get('angle')
        caps=[];arms=[]
        for i in range(fresh.getMuscles().getSize()):
            mus=fresh.getMuscles().get(i)
            caps.append(mus.calcInextensibleTendonActiveFiberForce(s,1.))
            arms.append(mus.computeMomentArm(s,c))
        activation=values[:,[columns.index('flexor'),columns.index('extensor')]]
        reserve_control=values[:,columns.index('reserve')]
        predicted=activation*np.asarray(caps)
        measured=fvalues[:,[fcols.index('flexor'),fcols.index('extensor')]]
        torque=predicted@np.asarray(arms)+reserve_control*.01
        required=1*9.81*.15+force*.3
        balance=float(np.max(np.abs(torque-required)))
        forceerr=float(np.max(np.abs(predicted-measured)))
        assert balance<1e-6 and forceerr<1e-6
        records.append({'load_N':force,'angle_rad':0.,'requiredTorque_Nm':required,
            'activation':activation[0].tolist(),'muscleForce_N':predicted[0].tolist(),
            'muscleTorque_Nm':(predicted[0]*arms).tolist(),'momentArms_m':arms,
            'capacity_N':caps,'reserveControl':float(reserve_control[0]),
            'reserveTorque_Nm':float(reserve_control[0]*.01),
            'balanceMaxAbs_Nm':balance,'forceReconstructionMaxAbs_N':forceerr,
            'frames':len(values),'nativeToolReturn':success,'solveWall_s':duration,
            'modelSha256':sha(d/'model.osim'),'activationFileSha256':sha(d/'teaching_official_so_activation.sto')})
    fixture={'schemaVersion':1,'computationTier':'native-replay','modelId':'one-hinge-two-Millard-teaching',
        'opensimVersion':o.GetVersionAndDate(),'muscles':['flexor','extensor'],'coordinates':['angle'],
        'modelDescription':'Synthetic one-hinge lever, two straight-path antagonistic Millard2012EquilibriumMuscle actuators; not a hand or subject model.',
        'geometry':{'leverLength_m':.3,'mass_kg':1.,'com_m':[.15,0,0],'muscleInsertion_m':[.1,0,0],'origins_m':[[0,.1,0],[0,-.1,0]],'gravity_m_s2':[0,-9.81,0]},
        'protocol':{'tool':'OpenSim AnalyzeTool + StaticOptimization','use_muscle_physiology':True,'activation_exponent':2.,'convergence_criterion':1e-8,'max_iterations':1000,'reserve_optimal_force_Nm':.01,'reserve_control_bounds':[-20,20],'motion':'21 static frames, 0–0.2 s,10ms spacing','objective':'Minimize sum of squared actuator activation/control values subject to acceleration matching; official SO implementation.'},
        'cases':records,'generator':Path(__file__).name,'generatorSha256':sha(__file__),
        'limitations':['Native SO numbers correspond only to this transparent one-joint teaching model, not the visual hand or43muscle personalized models.','No Scale or IK performed: geometry and angle were specified.','Force is prescribed externally, not a contact simulation.','SO uses its native inextensible-tendon active-force capacity; full forward muscle dynamics are not claimed.','Replay cases are discrete0/2/4N; other loads must not be presented as newly solved native results.']}
    (output/'opensim-so-native.json').write_text(json.dumps(fixture,indent=2,allow_nan=False)+'\n')
    print(json.dumps(records,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True)
    run(p.parse_args().output)
