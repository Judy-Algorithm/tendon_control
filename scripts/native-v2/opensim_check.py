"""Deterministic export invariant checks; not independent engine validation."""
import json,math,hashlib
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[2];data=root/'explainer/native-v2/data';index=json.loads((data/'opensim-index.json').read_text());rows=[];saved={}
for entry in index['runs']:
    d=json.loads((data/entry['file']).read_text());saved[entry['file']]=d;f=d['frames'];model=json.loads((data/entry.get('modelFile',index['modelFile'])).read_text());assert len(d['muscleNames'])==43 and len(d['coordinateNames'])==23
    manifest=d['manifest'];version=manifest.get('cacheKeyVersion',1)
    if version==1:expected_key=hashlib.sha256((manifest['modelHash']+json.dumps(manifest['request'],sort_keys=True)+manifest['engineVersion']).encode()).hexdigest()
    elif version==2:
        payload=manifest['cacheIdentity'];assert payload['keyVersion']==2 and payload['sourceModelHash']==manifest['modelHash'] and payload['request']==manifest['request'] and payload['engineVersion']==manifest['engineVersion'];expected_key=hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest()
    else:raise AssertionError('Unknown cache key version')
    assert manifest['cacheKey']==expected_key,(entry['file'],'request/cache identity mismatch')
    lower=np.array([x['activationBounds'][0] for x in model['muscles']]);upper=np.array([x['activationBounds'][1] for x in model['muscles']]);max_sum_error=0.;bad=[]
    for k,x in enumerate(f):
        activation=np.asarray(x['activation']);torque=np.asarray(x['torque_Nm']);assert activation.shape==(43,) and torque.shape==(43,23) and len(x['paths'])==43
        for key in ['q','qAll','activation','force_N','torque_Nm','qfrcActuator_Nm','requiredTorque_Nm','reserveTorque_Nm','balanceResidual_Nm']:assert np.isfinite(np.asarray(x[key])).all(),(entry['file'],k,key)
        discrepancy=np.asarray(x['requiredTorque_Nm'])-np.asarray(x['qfrcActuator_Nm'])-np.asarray(x['reserveTorque_Nm'])-np.asarray(x['balanceResidual_Nm']);max_sum_error=max(max_sum_error,float(abs(discrepancy).max()))
        assert np.max(abs(torque.sum(axis=0)-x['qfrcActuator_Nm']))<1e-10
        if x['valid']:
            assert not x['nativeSolverFailed'];assert np.max(np.abs(x['balanceResidual_Nm']))<1e-5;assert (activation>=lower-1e-6).all() and (activation<=upper+1e-6).all();assert np.max(np.abs(x['reserveControls']))<=1000+1e-4
        else:bad.append(k)
    assert max_sum_error<1e-9
    assert sum(x['valid'] for x in f)==d['manifest']['qc']['acceptedFrames']
    rows.append({'file':entry['file'],'frames':len(f),'valid':sum(x['valid'] for x in f),'failedFrameIndices':bad,'maxBalanceIdentityError_Nm':max_sum_error,'scope':'Serialization/bounds/reconciliation invariant check; not separate native solver reproduction'})
resolve=lambda name:index.get('fileMap',{}).get(name,name)
baseline=saved[resolve('opensim-finger-baseline.json')];contrasts=[]
for name in ['opensim-finger-fmax110.json','opensim-finger-lopt105.json','opensim-finger-lts105.json']:
    d=saved[resolve(name)];dq=float(np.max(np.abs(np.array([f['q'] for f in d['frames']])-np.array([f['q'] for f in baseline['frames']]))));da=float(np.max(np.abs(np.array([f['activation'] for f in d['frames']])-np.array([f['activation'] for f in baseline['frames']]))));assert dq<1e-7 and da>1e-8
    contrasts.append({'file':resolve(name),'sameMotionMaxDifference_rad':dq,'activationMaxDifference':da})
result={'status':'PASS','runs':rows,'parameterContrasts':contrasts,'parameterMotionComparisonTolerance_rad':1e-7,'parameterMotionNote':'Requested motion identical; native initial assembly differs by up to5e-9rad, so not bitwise-equal trajectories.','totalFrames':sum(r['frames'] for r in rows),'totalValidFrames':sum(r['valid'] for r in rows),'scope':'Author-side serialized export checks, not independent native review'}
(root/'docs/native-solver-v2/OPENSIM_EXPORT_CHECKS.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='runs'}))
