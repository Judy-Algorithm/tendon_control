"""Independently rebuild and execute native full43 StaticOptimization.

No exporter/repair modules imported. Reference outputs are read only for final
comparison; model construction and input motion use the declared request.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import numpy as np
import opensim as o

def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def table(path):
    lines=Path(path).read_text().splitlines();i=next(i for i,x in enumerate(lines) if x.strip()=='endheader')
    return lines[i+1].split(),np.loadtxt(lines[i+2:],ndmin=2)
def coupled(model,state):
    for original in model.getConstraintSet():
        c=o.CoordinateCouplerConstraint.safeDownCast(original);assert c
        names=c.getIndependentCoordinateNames();values=o.Vector(names.getSize(),0)
        for j in range(names.getSize()):values.set(j,model.getCoordinateSet().get(names.get(j)).getValue(state))
        model.getCoordinateSet().get(c.getDependentCoordinateName()).setValue(state,c.getFunction().calcValue(values),False)
    model.realizePosition(state)

def main(a):
    reference=json.loads(Path(a.reference).read_text());request=reference['manifest']['request'];out=Path(a.private_output)
    if out.exists():raise RuntimeError('Use a new independent evidence directory')
    out.mkdir(parents=True);assert sha(a.model)==reference['manifest']['modelHash'];assert not request.get('trajectory') and not request.get('loadN',0),'This bounded independent check covers declared zero-load demo requests only'
    (out/'request.json').write_text(json.dumps(request,indent=2))
    model=o.Model(a.model);state=model.initSystem();coupled(model,state);names=[c.getName() for c in model.getCoordinateSet()];independent=[c.getName() for c in model.getCoordinateSet() if not c.isConstrained(state)]
    assert independent==reference['coordinateNames'];muscle_names=[m.getName() for m in model.getMuscles()];assert len(muscle_names)==43
    parameters=request.get('parameters',{});assert not parameters.get('muscles'),'This check covers global perturbations only'
    for m in model.getMuscles():
        m.setMaxIsometricForce(m.getMaxIsometricForce()*parameters.get('fmaxMultiplier',1.))
        m.setOptimalFiberLength(m.getOptimalFiberLength()*parameters.get('optimalFiberLengthMultiplier',1.))
        m.setTendonSlackLength(m.getTendonSlackLength()*parameters.get('tendonSlackLengthMultiplier',1.))
    for name in independent:
        actuator=o.CoordinateActuator(name);actuator.setName('reserve_'+name);actuator.setOptimalForce(.01);actuator.setMinControl(-1000.);actuator.setMaxControl(1000.);model.addForce(actuator)
    model.finalizeConnections();state=model.initSystem();coupled(model,state);initial=np.array([c.getValue(state) for c in model.getCoordinateSet()])
    times=np.linspace(0,float(request['duration_s']),int(request['samples']));p=times/times[-1];progress=p*p*p*(10-15*p+6*p*p)
    selected=names.index(request['coordinate']);rows=[]
    for s in progress:
        q=initial.copy();q[selected]+=s*(float(request['targetRad'])-initial[selected])
        for name,value in zip(names,q):model.getCoordinateSet().get(name).setValue(state,float(value),False)
        coupled(model,state);rows.append([c.getValue(state) for c in model.getCoordinateSet()])
    motion=out/'independent_input.mot'
    header=f'independent_native_request\nversion=1\nnRows={len(times)}\nnColumns={len(names)+1}\ninDegrees=no\nendheader\n'
    motion.write_text(header+'\t'.join(['time',*names])+'\n'+''.join('\t'.join(format(x,'.17g') for x in [t,*q])+'\n' for t,q in zip(times,rows)))
    so=o.StaticOptimization();so.setName('independent_so');so.setStartTime(0);so.setEndTime(float(times[-1]));so.setUseModelForceSet(True);so.setUseMusclePhysiology(True);so.setActivationExponent(2);so.setConvergenceCriterion(1e-8);so.setMaxIterations(1000);model.addAnalysis(so)
    model.finalizeConnections();state=model.initSystem();coupled(model,state);model.printToXML(str(out/'independent_runtime_model.osim'))
    tool=o.AnalyzeTool();tool.setName('independent');tool.setModel(model);tool.setToolOwnsModel(False);tool.setInitialTime(0);tool.setFinalTime(float(times[-1]));tool.setResultsDir(str(out));tool.setOutputPrecision(16)
    tool.setStatesFromMotion(state,o.Storage(str(motion)),False);o.Storage.printResult(tool.getStatesStorage(),'independent_actual_states',str(out),-1,'.sto')
    o.Logger.addFileSink(str(out/'independent_so.log'))
    try:returned=bool(tool.run())
    finally:o.Logger.removeFileSink()
    columns,actual=table(out/'independent_independent_so_activation.sto');force_columns,forces=table(out/'independent_independent_so_force.sto')
    expected_time=np.array([f['time_s'] for f in reference['frames']]);assert len(actual)==len(expected_time)
    activation=actual[:,[columns.index(n) for n in muscle_names]];reserve_controls=actual[:,[columns.index('reserve_'+n) for n in independent]]
    native_force=forces[:,[force_columns.index(n) for n in muscle_names]]
    ref_a=np.array([f['activation'] for f in reference['frames']]);ref_r=np.array([f['reserveControls'] for f in reference['frames']]);ref_f=np.array([f['force_N'] for f in reference['frames']])
    objective=np.sum(activation**2,axis=1)+np.sum(reserve_controls**2,axis=1);ref_objective=np.sum(ref_a**2,axis=1)+np.sum(ref_r**2,axis=1)
    log=(out/'independent_so.log').read_text();failure_times=[float(x.rstrip('.')) for x in re.findall(r'could not find a solution at time = ([0-9.eE+-]+)',log)]
    errors={'activationMaxAbs':float(np.max(abs(activation-ref_a))),'reserveTorqueMaxAbs_Nm':float(np.max(abs(reserve_controls-ref_r))*.01),
      'muscleForceMaxAbs_N':float(np.max(abs(native_force-ref_f))),'timeMaxAbs_s':float(np.max(abs(actual[:,0]-expected_time))),
      'sumSquaredControlsObjectiveMaxAbs':float(np.max(abs(objective-ref_objective)))}
    thresholds={'activationMaxAbs':1e-7,'reserveTorqueMaxAbs_Nm':1e-7,'muscleForceMaxAbs_N':1e-5,'timeMaxAbs_s':1e-9,'sumSquaredControlsObjectiveMaxAbs':1e-6}
    status_match=returned==reference['manifest']['qc']['nativeToolReturn'] and failure_times==reference['manifest']['qc']['failedTimes_s']
    result={'status':'PASS' if status_match and all(errors[k]<=v for k,v in thresholds.items()) else 'FAIL','engine':o.GetVersionAndDate(),
      'modelHash':sha(a.model),'referenceHash':sha(a.reference),'request':request,'framesCompared':len(actual),'muscles':len(muscle_names),'reserves':len(independent),
      'nativeToolReturn':returned,'explicitFailureTimes_s':failure_times,'statusMatchesReference':status_match,'errors':errors,'thresholds':thresholds,
      'objectiveDefinition':'sum of squared43muscle activations and23dimensionless reserve controls, matching activation exponent2;',
      'settings':{'useMusclePhysiology':True,'activationExponent':2,'convergenceCriterion':1e-8,'maxIterations':1000,'reserveOptimalForce_Nm':.01,'reserveControlBounds':[-1000,1000]},
      'method':'Fresh independently constructed native AnalyzeTool+StaticOptimization with request-generated minimum-jerk coordinates. No exporter/repair module imported; all reference outputs used only after native solve.',
      'privateEvidenceHashes':{p.name:sha(p) for p in out.iterdir() if p.is_file()},
      'limitations':['Reproduces this native reference policy, not physiological truth or dynamic excitation replay. Native acceleration/constraint warnings and reserve magnitude remain separate acceptance issues.']}
    Path(a.output).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

if __name__=='__main__':
    p=argparse.ArgumentParser()
    for name in ['model','reference','private-output','output']:p.add_argument('--'+name,required=True)
    main(p.parse_args())
