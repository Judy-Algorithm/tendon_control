"""Diagnose native acceleration residual versus small reduced torque residual."""
import argparse
import json
from pathlib import Path
import numpy as np
import opensim as o

def vec(x):return np.array([x.get(i) for i in range(x.size())])
def main(a):
    run=json.loads(Path(a.run).read_text());model=o.Model(a.model);s=model.initSystem();coords=list(model.getCoordinateSet());storage=o.Storage(a.states);splines=o.GCVSplineSet(5,storage)
    lines=Path(a.states).read_text().splitlines();end=next(i for i,x in enumerate(lines) if x.strip()=='endheader');data=np.loadtxt(lines[end+2:],ndmin=2)
    columns=[]
    for c in coords:
        names=c.getStateVariableNames();iv=storage.getStateIndex(names.get(0),0);iu=storage.getStateIndex(names.get(1),0)
        if iv<0:iv=storage.getStateIndex(c.getName()+'/value',0)
        if iu<0:iu=storage.getStateIndex(c.getSpeedName(),0)
        assert min(iv,iu)>=0;columns.append((iv,iu))
    acts=[o.ScalarActuator.safeDownCast(x) for x in model.getActuators()]
    for act in acts:act.overrideActuation(s,True)
    ids=o.InverseDynamicsSolver(model);deriv=o.StdVectorInt();deriv.append(0);results=[]
    for frameindex in [0,len(run['frames'])//2,len(run['frames'])-1]:
        f=run['frames'][frameindex];t=f['time_s'];row=data[np.argmin(abs(data[:,0]-t))];s.setTime(t)
        for c,(iv,iu) in zip(coords,columns):c.setValue(s,float(row[iv+1]),False);c.setSpeedValue(s,float(row[iu+1]))
        target=o.State(s)
        for c,(_,iu) in zip(coords,columns):c.setSpeedValue(target,splines.get(iu).calcDerivative(deriv,o.Vector(1,t)))
        desired=vec(target.getU());forces=np.r_[f['force_N'],np.array(f['reserveControls'])*.01]
        for actuator,force in zip(acts,forces):actuator.setOverrideActuation(s,float(force))
        model.realizeAcceleration(s);actual=vec(s.getUDot());delta=actual-desired
        # Native virtual-speed basis, respecting the declared coordinate couplers.
        basis=[]
        for name in run['coordinateNames']:
            base=model.getCoordinateSet().get(name);samples=[]
            for sign in [1,-1]:
                z=o.State(s);base.setValue(z,base.getValue(s)+sign*1e-6,False)
                for original in model.getConstraintSet():
                    con=o.CoordinateCouplerConstraint.safeDownCast(original);ns=con.getIndependentCoordinateNames();x=o.Vector(ns.getSize(),0)
                    for k in range(ns.getSize()):x.set(k,model.getCoordinateSet().get(ns.get(k)).getValue(z))
                    model.getCoordinateSet().get(con.getDependentCoordinateName()).setValue(z,con.getFunction().calcValue(x),False)
                samples.append(np.array([c.getValue(z) for c in coords]))
            z=o.State(s)
            for c,v in zip(coords,(samples[0]-samples[1])/(2e-6)):c.setSpeedValue(z,float(v))
            basis.append(vec(z.getU()))
        B=np.asarray(basis).T;mass=o.Matrix();model.getMatterSubsystem().calcM(s,mass);M=np.array([[mass.get(i,j) for j in range(mass.ncol())] for i in range(mass.nrow())])
        reduced=Mred=B.T@M@B;torque=B.T@vec(ids.solve(s,o.Vector(target.getU())))
        predicted=-B@np.linalg.solve(Mred,torque);values=np.linalg.eigvalsh(Mred)
        results.append({'frameIndex':frameindex,'time_s':t,'nativeAccelerationDifferenceNorm_rad_s2':float(np.linalg.norm(delta)),
          'nativeAccelerationDifferenceMax_rad_s2':float(np.max(abs(delta))),
          'reducedTorqueResidualMax_Nm':float(np.max(abs(torque))),
          'reducedMassEigenvalueMin_kgm2':float(values.min()),'reducedMassEigenvalueMax_kgm2':float(values.max()),
          'massPredictedAccelerationDifferenceMaxError_rad_s2':float(np.max(abs(predicted-delta))),
          'actualAccelerationDifference':delta.tolist(),'massPredictedDifference':predicted.tolist(),
          'sourcePrintedNorms':run['manifest']['qc'].get('nativeReportedAccelerationConstraintViolation')})
    out={'modelHash':run['manifest']['modelHash'],'method':'Fresh native force override and realized acceleration versus official-state speed-spline derivatives; native mass matrix projects reduced residual to acceleration.',
      'results':results,'interpretation':'Torque balance and acceleration consistency have different units and conditioning. No acceptance threshold is changed; numerical sensitivity does not make a nonzero acceleration residual disappear.'}
    Path(a.output).write_text(json.dumps(out,indent=2)+'\n');print(json.dumps([{k:v for k,v in r.items() if k not in ['actualAccelerationDifference','massPredictedDifference','sourcePrintedNorms']} for r in results]))
if __name__=='__main__':
    p=argparse.ArgumentParser()
    for k in ['model','run','states','output']:p.add_argument('--'+k,required=True)
    main(p.parse_args())
