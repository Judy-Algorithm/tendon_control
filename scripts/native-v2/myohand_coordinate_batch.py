"""Additional native-coordinate demonstrations; never atlas coverage credit."""
import argparse
import json
from pathlib import Path
import re
import numpy as np
import mujoco as mj
import myohand_runner as runner


def main(output):
    output=Path(output);env,m,d=runner.new_env();coords=runner.names(m,mj.mjtObj.mjOBJ_JOINT,m.njnt)
    ranges=np.array(m.jnt_range);env.close()
    index=json.loads((output/'myohand-index.json').read_text());ledger=[]
    for j,name in enumerate(coords):
        for sign in [-1,1]:
            target=float(.25*ranges[j,0 if sign<0 else 1]);action=f'native-coordinate:{name}:{sign:+d}'
            record={'actionId':action,'origin':'new-native-coordinate-demo-v2','coordinate':name,
              'nativeRange_rad':runner.values(ranges[j]),'neutral_rad':0.,'target_rad':target,'independent':True,
              'duration_s':2.,'recipe':'Minimum-jerk first1.5s,hold0.5s;25% of available native range; not original atlas.',
              'status':'not_run'}
            if target==0:
                record.update(status='unsupported',reason='Native neutral-to-bound interval is zero in this direction.');ledger.append(record);continue
            request={'mode':'tracking','coordinate':name,'amplitude_rad':target,'duration_s':2.,'sampleInterval_s':.1,
              'kp':800.,'kd':60.,'controllerMetric':'torque','actionId':action}
            file='myohand-run-native-'+re.sub(r'[^a-zA-Z0-9_-]','-',name)+('-negative' if sign<0 else '-positive')+'.json'
            try:
                if (output/file).exists():
                    run=json.loads((output/file).read_text())
                    if run['manifest']['request']!=request:raise ValueError('Existing immutable run request differs')
                else:
                    run=runner.run(request);runner.write(output/file,run)
                qc=run['manifest']['qc'];record.update(file=file,status='solved' if qc['numericPassed'] else 'failed-qc',
                  numericalPassed=qc['numericPassed'],trackingAccepted=qc['trackingAccepted'],qc=qc,
                  reason='Native physics retained, including tracking errors and soft-limit excursions.')
                if not any(x['file']==file for x in index['runs']):
                    index['runs'].append({'file':file,'label':f'原生新演示 · {name} {"−" if sign<0 else "+"}',
                      'parameters':{'forceScale':1.,'activationTimeScale':1.},'actionId':action,'status':record['status'],
                      'origin':'new-native-coordinate-demo-v2','qc':qc})
            except Exception as error:
                record.update(status='failed',reason=str(error))
                failure=output/(file.replace('.json','-failure.json'))
                if not failure.exists():runner.write(failure,{'request':request,'status':'failed','error':str(error)})
            ledger.append(record);index['nativeCoordinateCoverage']=ledger
            runner.write(output/'myohand-index.json',index)
            runner.write(output/'myohand-native-coordinate-report.json',{'status':'running','records':ledger})
            print(json.dumps({'actionId':action,'status':record['status'],'trackingAccepted':record.get('trackingAccepted'),
              'selectedRMSE_deg':record.get('qc',{}).get('trackingRmsSelected_deg'),'maxAll_deg':record.get('qc',{}).get('trackingMaxAll_deg')}),flush=True)
    counts={'declaredDirections':len(ledger),'attempted':sum('file' in x or x['status']=='failed' for x in ledger),
      'numericPassed':sum(x.get('numericalPassed',False) for x in ledger),'trackingAccepted':sum(x.get('trackingAccepted',False) for x in ledger),
      'unsupported':sum(x['status']=='unsupported' for x in ledger),'failed':sum(x['status']=='failed' for x in ledger)}
    index['nativeCoordinateCoverage']=ledger;index['nativeCoordinateCoverageCounts']=counts
    index['coverageCounts']['nativeCoordinateNotRun']=0
    index.setdefault('diagnostics',{})['nativeCoordinateReport']='myohand-native-coordinate-report.json'
    runner.write(output/'myohand-index.json',index)
    runner.write(output/'myohand-native-coordinate-report.json',{'status':'complete','counts':counts,'records':ledger,
      'scope':'Additional demonstrations using native ranges, not successful reproduction of the original48atlas actions.',
      'sampling':'Physics and QC2ms;controls20ms;publicplayback100ms(21frames). Full39channel outputs retained.'})
    print(json.dumps(counts),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);main(p.parse_args().output)
