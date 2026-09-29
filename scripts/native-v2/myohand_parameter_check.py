"""Native per-muscle perturbation evidence plus bounded-request checks."""
import argparse
from pathlib import Path
import json
import numpy as np
import myohand_runner as runner

def main(output):
    output=Path(output);baseline=json.loads((output/'myohand-run-pulse.json').read_text());records=[]
    for key,value,label in [('muscleForceScales',1.1,'FDS2力量×1.1'),('muscleActivationTimeScales',1.2,'FDS2响应时间×1.2')]:
        request={key:{'FDS2':value}};file='myohand-run-pulse-'+('fds2force110' if key=='muscleForceScales' else 'fds2time120')+'.json'
        if (output/file).exists():
            run=json.loads((output/file).read_text());assert run['manifest']['request']==request
        else:run=runner.run(request);runner.write(output/file,run)
        evidence={'file':file,'label':label,'request':request,'qc':run['manifest']['qc'],'differences':{}}
        for field in ['q','activation','force_N']:
            a=np.array([f[field] for f in run['frames']]);b=np.array([f[field] for f in baseline['frames']]);evidence['differences'][field]=float(np.max(np.abs(a-b)))
        old=baseline['manifest']['effective']['muscleParameters'];new=run['manifest']['effective']['muscleParameters'];indices=[]
        for j in range(39):
            if any(not np.array_equal(np.asarray(old[k])[j],np.asarray(new[k])[j]) for k in old):indices.append(j)
        evidence['effectiveEditedMuscleIndices']=indices;evidence['onlyRequestedMuscleEdited']=indices==[run['muscleNames'].index('FDS2')]
        records.append(evidence)
    env,m,d=runner.new_env();validation=[]
    cases=[({'forceScale':1.5,'muscleForceScales':{'FDS2':1.1}},False),
      ({'activationTimeScale':2.,'muscleActivationTimeScales':{'FDS2':1.2}},False),
      ({'forceScale':.5,'muscleForceScales':{'FDS2':.5}},False),
      ({'forceScale':1.2,'muscleForceScales':{'FDS2':1.1}},True),
      ({'pulseStart_s':'nan'},False),({'duration_s':float('nan')},False),
      ({'muscleForceScales':{'NotAMuscle':1.1}},False),({'arbitraryScript':'no'},False),
      ({'initialQ':[0]*22},False),({'pulseStart_s':.3,'pulseEnd_s':.2},False)]
    cases.extend([({'modelId':'other-model'},False),({'schemaVersion':999},False),
      ({'initialQ':[float('nan')]+[0]*22},False),({'initialQ':[100]+[0]*22},False),
      ({'initialQvel':[float('inf')]+[0]*22},False),({'initialQvel':[21]+[0]*22},False)])
    for request,expected in cases:
        try:runner.validate_request(request,m);accepted=True;reason=None
        except Exception as error:accepted=False;reason=str(error)
        validation.append({'case':str(request),'expectedAccepted':expected,'accepted':accepted,'passed':expected==accepted,'reason':reason})
    env.close();runner.write(output/'myohand-parameter-check.json',{'status':'PASS' if all(x['passed'] for x in validation) and all(x['onlyRequestedMuscleEdited'] for x in records) else 'FAIL',
      'pairedPerturbations':records,'requestValidation':validation,'effectiveBounds':{'forceScale':[.5,1.5],'activationTimeScale':[.5,2]}})
    index=json.loads((output/'myohand-index.json').read_text());index.setdefault('diagnostics',{})['parameterCheck']='myohand-parameter-check.json'
    for record in records:
        if not any(x['file']==record['file'] for x in index['runs']):
            index['runs'].append({'file':record['file'],'label':record['label'],'parameters':{'forceScale':1.,'activationTimeScale':1.},
              'actionId':'native:FDS2:pulse','status':'solved','qc':record['qc']})
    scripts=Path(__file__).parent;version_files=['myohand_runner_v1.py','myohand_runner_v2.py','myohand_runner.py']
    index['generatorVersions']=[{'file':'scripts/native-v2/'+file,'sha256':runner.sha((scripts/file).read_bytes())} for file in version_files]
    runner.write(output/'myohand-index.json',index)
    print(json.dumps({'paired':records,'validationPassed':sum(x['passed'] for x in validation),'validationCount':len(validation)}))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);main(p.parse_args().output)
