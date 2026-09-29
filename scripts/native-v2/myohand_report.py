"""Read native runs, audit moment-arm signs, and publish compact factual ledgers."""
import argparse
import json
from pathlib import Path
import numpy as np
import mujoco as mj
import myohand_runner as runner


def main(output):
    output=Path(output);index=json.loads((output/'myohand-index.json').read_text())
    comparisons=[]
    for record in index['coverage']:
        if not record.get('file'):continue
        latest=json.loads((output/record['file']).read_text())
        original_file=record['file'].replace('-tuned.json','.json')
        original=json.loads((output/original_file).read_text())
        frames=latest['frames'];err=np.abs(np.array([f['q'] for f in frames])-np.array([f['targetQ'] for f in frames]))
        frame,j=np.unravel_index(np.argmax(err),err.shape)
        ctrl=np.array([x['ctrl'] for x in latest['controlSequence']])
        comparisons.append({'actionId':record['actionId'],'originalFile':original_file,'tunedFile':record['file'],
          'originalQC':original['manifest']['qc'],'tunedQC':latest['manifest']['qc'],
          'largestSavedError':{'coordinate':latest['coordinateNames'][j],'time_s':frames[frame]['time_s'],
            'target_rad':frames[frame]['targetQ'][j],'actual_rad':frames[frame]['q'][j]},
          'controlUpperBoundFraction':float(np.mean(ctrl>=runner.CTRL_MAX-1e-9)),
          'controlLowerBoundFraction':float(np.mean(ctrl<=runner.CTRL_MIN+1e-9))})
    pulse=[]
    baseline=json.loads((output/'myohand-run-pulse.json').read_text())
    for name in ['myohand-run-pulse-force125.json','myohand-run-pulse-time150.json']:
        run=json.loads((output/name).read_text())
        row={'file':name,'effectiveGlobalParameters':{k:run['manifest']['effective'][k] for k in ['forceScale','activationTimeScale']}}
        for key in ['q','activation','force_N']:
            a=np.array([f[key] for f in run['frames']]);b=np.array([f[key] for f in baseline['frames']])
            row[key+'_maxAbsDifference']=float(np.max(np.abs(a-b)))
        pulse.append(row)
    env,m,d=runner.new_env();coords=runner.names(m,mj.mjtObj.mjOBJ_JOINT,m.njnt);muscles=runner.names(m,mj.mjtObj.mjOBJ_ACTUATOR,m.nu)
    cases=[]
    for angles in [{},{'flexion':-.5},{'flexion':.5},{'deviation':-.2},{'deviation':.2}]:
        d.qpos[:]=0
        for name,v in angles.items():d.qpos[coords.index(name)]=v
        mj.mj_forward(m,d);moment=runner.moment(m,d).copy();fd=np.empty_like(moment);eps=1e-6
        for j in range(23):
            q=float(d.qpos[j]);d.qpos[j]=q+eps;mj.mj_forward(m,d);plus=d.actuator_length.copy()
            d.qpos[j]=q-eps;mj.mj_forward(m,d);minus=d.actuator_length.copy()
            d.qpos[j]=q;fd[:,j]=(plus-minus)/(2*eps)
        mj.mj_forward(m,d)
        cases.append({'q_rad':runner.values(d.qpos),'moment_dL_dq_m':runner.values(moment,10),
          'torquePerPositiveTension_Nm_per_N':runner.values(-moment,10),
          'finiteDifferenceMaxAbs_m':float(np.max(np.abs(fd-moment))),
          'wristMuscles':[{ 'name':name,'flexionTorquePerN':float(-moment[muscles.index(name),coords.index('flexion')]),
            'deviationTorquePerN':float(-moment[muscles.index(name),coords.index('deviation')])}
            for name in ['ECRL','ECRB','ECU','FCR','FCU','PL']]})
    env.close()
    runner.write(output/'myohand-moment-audit.json',{'modelHash':runner.provenance()['modelHash'],'muscleNames':muscles,'coordinateNames':coords,
      'convention':'MuJoCo moment=d(length)/d(q). Tensile actuator_force is negative; torque per positive N is -moment.',
      'caseCount':len(cases),'cases':cases,'scope':'Native MyoHand only; no assertion that legacy display axis labels are anatomically registered.'})
    runner.write(output/'myohand-tracking-report.json',{'coverageCounts':index['coverageCounts'],'comparisons':comparisons,
      'parameterComparisons':pulse,'selectionPolicy':'One common controller kp=800,kd=60,torque metric across all 12 valid atlas clips. No target/model/QC changes.',
      'trackingVsLimits':'Tracking acceptance is not strict anatomical-limit acceptance. Native soft-limit overshoots are reported separately.'})
    default='myohand-run-pulse.json'
    index['defaultRunFile']=default
    first=['myohand-run-pulse.json','myohand-run-pulse-force125.json','myohand-run-pulse-time150.json',
      'myohand-run-atlas-index_PIP_flex-negative-tuned.json']
    index['runs'].sort(key=lambda x:first.index(x['file']) if x['file'] in first else (4 if '-tuned.json' in x['file'] else 5))
    index.setdefault('diagnostics',{}).update({'trackingReport':'myohand-tracking-report.json','momentAudit':'myohand-moment-audit.json','geometryCheck':'myohand-geometry-check.json'})
    runner.write(output/'myohand-index.json',index)
    print(json.dumps({'trackingAccepted':index['coverageCounts']['trackingAccepted'],'momentCases':len(cases),
      'maxMomentFiniteDifferenceError_m':max(x['finiteDifferenceMaxAbs_m'] for x in cases),'neutralWrist':cases[0]['wristMuscles']}))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);main(p.parse_args().output)
