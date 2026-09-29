"""Independent native path-derivative virtual-work check; no exporter import.

Reconstructs fresh native geometry from the run's qAll and computes muscle
generalized torques by finite differences of path length, not ID subtraction.
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
import opensim as osim


def verify(model_path,run_path):
    source=Path(model_path);run=json.loads(Path(run_path).read_text())
    model=osim.Model(str(source));state=model.initSystem()
    coordinates=model.getCoordinateSet();muscles=model.getMuscles()
    assert muscles.getSize()==43
    assert [m.getName() for m in muscles]==run['muscleNames']
    assert hashlib.sha256(source.read_bytes()).hexdigest()==run['manifest']['runtimeModelHash']
    couplers=[]
    for constraint in model.getConstraintSet():
        c=osim.CoordinateCouplerConstraint.safeDownCast(constraint)
        assert c,'Unsupported constraint in independent checker'
        couplers.append(c)

    def realize(q):
        for name,value in zip(run['allCoordinateNames'],q):coordinates.get(name).setValue(state,float(value),False)
        for c in couplers:
            names=c.getIndependentCoordinateNames();v=osim.Vector(names.getSize(),0.)
            for j in range(names.getSize()):v.set(j,coordinates.get(names.get(j)).getValue(state))
            coordinates.get(c.getDependentCoordinateName()).setValue(state,c.getFunction().calcValue(v),False)
        model.realizePosition(state)

    findings=[]
    for k in sorted(set([0,len(run['frames'])//2,len(run['frames'])-1])):
        frame=run['frames'][k];q=np.asarray(frame['qAll']);force=np.asarray(frame['force_N']);realize(q)
        lengths=np.array([m.getLength(state) for m in muscles]);length_error=float(np.max(np.abs(lengths-frame['pathLength_m'])))
        direct_arm=np.array([[m.computeMomentArm(state,coordinates.get(name)) for name in run['coordinateNames']] for m in muscles])
        direct_torque=direct_arm*force[:,None]
        native_difference=direct_torque-np.asarray(frame['torque_Nm'])
        di,dj=np.unravel_index(np.argmax(np.abs(native_difference)),native_difference.shape)
        eps_results=[]
        for eps in [1e-5,1e-6]:
            derivative=np.zeros((43,len(run['coordinateNames'])))
            for j,name in enumerate(run['coordinateNames']):
                idx=run['allCoordinateNames'].index(name);plus=q.copy();minus=q.copy();plus[idx]+=eps;minus[idx]-=eps
                realize(plus);lp=np.array([m.getLength(state) for m in muscles])
                realize(minus);lm=np.array([m.getLength(state) for m in muscles])
                derivative[:,j]=(lp-lm)/(2*eps)
            torque=-derivative*force[:,None];difference=torque-np.asarray(frame['torque_Nm'])
            mi,ci=np.unravel_index(np.argmax(np.abs(difference)),difference.shape)
            eps_results.append({'epsilon_rad':eps,'maxAbsDifference_Nm':float(np.max(np.abs(difference))),
              'rmsDifference_Nm':float(np.sqrt(np.mean(difference**2))),
              'largestDifference':{'muscle':run['muscleNames'][mi],'coordinate':run['coordinateNames'][ci],
                'finiteDifferenceTorque_Nm':float(torque[mi,ci]),'exportedTorque_Nm':frame['torque_Nm'][mi][ci]}})
        # Diagnose the worst discrepancy without replacing its FAIL result.
        mus=muscles.get(int(mi));idx=run['allCoordinateNames'].index(run['coordinateNames'][ci]);segment_values=[]
        for sign in [1,-1]:
            perturbed=q.copy();perturbed[idx]+=sign*1e-6;realize(perturbed);path=mus.getGeometryPath().getCurrentPath(state);segs={}
            for j in range(path.getSize()-1):
                a,b=path.get(j),path.get(j+1)
                if a.getParentFrame().findBaseFrame().getName()!=b.getParentFrame().findBaseFrame().getName():continue
                if not (osim.MovingPathPoint.safeDownCast(a) or osim.MovingPathPoint.safeDownCast(b)):continue
                x,y=a.getLocationInGround(state),b.getLocationInGround(state)
                segs[a.getName()+' → '+b.getName()]=float(np.linalg.norm([x.get(z)-y.get(z) for z in range(3)]))
            segment_values.append(segs)
        omitted={name:-(value-segment_values[1][name])/(2e-6)*force[mi] for name,value in segment_values[0].items()}
        recorded=np.asarray(frame['torque_Nm']).sum(axis=0)
        sum_error=float(np.max(np.abs(recorded-frame['qfrcActuator_Nm'])))
        balance=np.asarray(frame['requiredTorque_Nm'])-recorded-np.asarray(frame['reserveTorque_Nm'])
        balance_error=float(np.max(np.abs(balance-frame['balanceResidual_Nm'])))
        findings.append({'frameIndex':k,'time_s':frame['time_s'],'pathLengthMaxAbsDifference_m':length_error,
          'directNativeMomentArmMaxAbsDifference_Nm':float(np.max(np.abs(native_difference))),
          'directNativeLargestDifference':{'muscle':run['muscleNames'][di],'coordinate':run['coordinateNames'][dj],
            'directTorque_Nm':float(direct_torque[di,dj]),'exportedTorque_Nm':frame['torque_Nm'][di][dj]},
          'worstFiniteDifferenceDiagnosis':{'muscle':run['muscleNames'][mi],'coordinate':run['coordinateNames'][ci],
            'sameBodyMovingSegmentDerivativeTorque_Nm':omitted,
            'differenceMinusSameBodySegmentTerm_Nm':float(difference[mi,ci]-sum(omitted.values())),
            'interpretation':'OpenSim4.4 GeometryPath.addInEquivalentForces skips segments whose endpoints share a mobilized body; finite total-length derivatives still include changing same-body MovingPathPoint segments.'},
          'finiteDifferenceChecks':eps_results,'muscleSumMaxAbsDifference_Nm':sum_error,'exportedBalanceIdentityMaxAbsDifference_Nm':balance_error})
    threshold=5e-5
    passed=all(x['pathLengthMaxAbsDifference_m']<1e-8 and max(e['maxAbsDifference_Nm'] for e in x['finiteDifferenceChecks'])<threshold
      and x['muscleSumMaxAbsDifference_Nm']<1e-8 and x['exportedBalanceIdentityMaxAbsDifference_Nm']<1e-8 for x in findings)
    native_pass=all(x['directNativeMomentArmMaxAbsDifference_Nm']<1e-6 for x in findings)
    return {'status':'PASS' if passed else 'FAIL','directNativeMomentArmStatus':'PASS' if native_pass else 'FAIL',
      'engine':osim.GetVersionAndDate(),'modelHash':run['manifest']['modelHash'],
      'runtimeModelHash':run['manifest']['runtimeModelHash'],'runHash':hashlib.sha256(Path(run_path).read_bytes()).hexdigest(),
      'method':'Fresh native model; geometry length finite differences with native coordinate couplers, tau=-dL/dq*force. No exporter or ID-basis implementation imported.',
      'finiteDifferenceThreshold_Nm':threshold,'frames':findings,
      'limitations':['Checks exported muscle virtual work and algebraic balance identity, not independent SO optimality or physiological reserve acceptance.',
        'Finite differences sample three saved frames, not every frame; force labels supplied by native SO are not re-solved here.']}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--model',required=True);p.add_argument('--run',required=True);p.add_argument('--output',required=True)
    a=p.parse_args();result=verify(a.model,a.run);Path(a.output).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
