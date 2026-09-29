"""Audit all original atlas clips against native axes/ranges; run exact valid clips."""
import argparse
from pathlib import Path
import json
import re
import time
import numpy as np
import mujoco as mj
import myohand_runner as runner

def main(catalog,output,execute=False,kp=100.,kd=20.,metric='torque',suffix=''):
    catalog=Path(catalog);output=Path(output);cat=json.loads(catalog.read_text())
    env,m,d=runner.new_env();mj.mj_forward(m,d);coords=runner.names(m,mj.mjtObj.mjOBJ_JOINT,m.njnt)
    ledger=[];requests={}
    for a in cat['actions']:
        hint=a['modelCoordinateHint'] or ''
        native=re.sub(r'^([2-5])(mcp|pm|md)',lambda z:z[2]+z[1],hint)
        record={'actionId':a['id'],'label':a['label'],'origin':'original-atlas','coordinate':native or None,
          'originalClipHash':runner.sha(runner.canonical(a).encode()),'originalStart_deg':a['original']['start'],
          'originalTarget_deg':a['original']['target'],'duration_s':a['original']['duration_s'],'status':'not_run',
          'otherCoordinatePolicy':'All other native coordinates target their neutral q=0; actual deviations retained.',
          'prepositioned':a['original']['prepositioned']}
        if a['inferredAxis'] or native not in coords:
            record.update(status='unsupported',mappingStatus='unsupported_native_coordinate',reason='该模型未定义此显示附加轴；未替代成其他动作。')
        else:
            j=coords.index(native);dot=float(np.asarray(a['displayAxis'])@d.xaxis[j]);sign=1 if dot>0 else -1
            angles=np.radians(a['angles_deg'])*sign
            record.update(axisDot=dot,sign=sign,coordinateIndex=j,nativeRange_rad=runner.values(m.jnt_range[j]),requestedRange_rad=[float(angles.min()),float(angles.max())])
            if abs(dot)<.99999:
                record.update(status='blocked',mappingStatus='unverified_axis',reason='显示轴与原生轴未对齐；不假设同名等于同轴。')
            elif np.any(angles<m.jnt_range[j,0]-1e-8) or np.any(angles>m.jnt_range[j,1]+1e-8):
                record.update(status='unsupported',mappingStatus='unsupported_native_range',reason='原片段超过原生关节范围；未缩小幅度或改限位。')
            else:
                q=np.zeros((len(angles),23));q[:,j]=angles
                request={'mode':'tracking','coordinate':native,'amplitude_rad':float(angles[-1]),'duration_s':a['original']['duration_s'],
                  'sampleInterval_s':.04,'actionId':a['id'],'initialQ':runner.values(q[0]),
                  'targetTrajectory':{'time_s':a['times_s'],'q_rad':runner.values(q)}}
                if suffix:request.update(kp=kp,kd=kd,controllerMetric=metric)
                record.update(mappingStatus='verified_axis_and_range',reason='保持原2.4秒、符号、幅度与预置起始角；20ms规范轨迹线性插值到原生2ms。')
                requests[a['id']]=request
        ledger.append(record)
    # Native coordinate perturbations are additional actions, not atlas successes.
    native_actions=[]
    for i,name in enumerate(coords):
        for sign in (-1,1):
            target=.3*(m.jnt_range[i,0] if sign<0 else m.jnt_range[i,1])
            native_actions.append({'actionId':f'native-coordinate:{name}:{sign:+d}','origin':'native-coordinate-inventory',
              'coordinate':name,'nativeRange_rad':runner.values(m.jnt_range[i]),'neutral_rad':0.,'target_rad':float(target),
              'independent':True,'status':'not_run' if target!=0 else 'unsupported',
              'reason':'New demonstration recipe, not an original atlas clip.' if target!=0 else 'Native range has no excursion in this direction.'})
    env.close();runner.write(output/'myohand-action-audit.json',{'schemaVersion':2,'catalogSha256':runner.sha(catalog.read_bytes()),'atlasActions':ledger,'nativeCoordinateActions':native_actions})
    index=json.loads((output/'myohand-index.json').read_text());index['coverage']=ledger;index['nativeCoordinateCoverage']=native_actions
    for record in ledger:
        action=record['actionId']
        if action not in requests or not execute:continue
        request=requests[action];file='myohand-run-atlas-'+re.sub(r'[^a-zA-Z0-9_-]','-',action)+(('-'+suffix) if suffix else '')+'.json'
        if (output/file).exists():
            result=json.loads((output/file).read_text())
            if result['manifest']['request']!=request:raise RuntimeError('Existing request differs; preserve file and choose a new version')
        else:
            try:
                result=runner.run(request);runner.write(output/file,result)
            except Exception as error:
                record.update(status='failed',reason=str(error));runner.write(output/file,{'schemaVersion':2,'request':request,'status':'failed','reason':str(error)});continue
        qc=result['manifest']['qc'];record.update(status='solved' if qc['numericPassed'] else 'failed',file=file,
          numericalPassed=qc['numericPassed'],trackingAccepted=qc['trackingAccepted'],trackingRmsSelected_deg=qc['trackingRmsSelected_deg'])
        record['reason']+=' 实际运动由MuJoCo计算；跟踪误差不删除。'
        index['runs']=[x for x in index['runs'] if x.get('file')!=file]
        index['runs'].append({'file':file,'label':record['label']+' · 原片段'+(' · 改进控制器' if suffix else ''),'parameters':{'forceScale':1.,'activationTimeScale':1.},
          'actionId':action,'status':record['status'],'qc':qc})
        runner.write(output/'myohand-index.json',index)
        print(action,json.dumps(qc),flush=True)
    index['coverage']=ledger;index['nativeCoordinateCoverage']=native_actions
    index['coverageCounts']={'atlasActions':len(ledger),'mapped':sum(x['mappingStatus']=='verified_axis_and_range' for x in ledger),
      'attempted':sum('file' in x or x['status']=='failed' for x in ledger),'numericallySuccessful':sum(x.get('numericalPassed',False) for x in ledger),
      'trackingAccepted':sum(x.get('trackingAccepted',False) for x in ledger),'unsupported':sum(x['status']=='unsupported' for x in ledger),
      'failed':sum(x['status']=='failed' for x in ledger),'notRun':sum(x['status']=='not_run' for x in ledger),
      'nativeCoordinateActions':len(native_actions),'nativeCoordinateNotRun':sum(x['status']=='not_run' for x in native_actions)}
    runner.write(output/'myohand-index.json',index)
    runner.write(output/'myohand-action-audit.json',{'schemaVersion':2,'catalogSha256':runner.sha(catalog.read_bytes()),'counts':index['coverageCounts'],
      'atlasActions':ledger,'nativeCoordinateActions':native_actions})
    print(json.dumps(index['coverageCounts']),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--catalog',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--execute',action='store_true')
    p.add_argument('--kp',type=float,default=100.);p.add_argument('--kd',type=float,default=20.);p.add_argument('--metric',choices=['torque','diagonal','acceleration'],default='torque');p.add_argument('--suffix',default='')
    a=p.parse_args();main(a.catalog,a.output,a.execute,a.kp,a.kd,a.metric,a.suffix)
