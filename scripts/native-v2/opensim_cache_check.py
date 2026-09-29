"""Metadata-only fingerprint checks; no native solve is performed."""
import copy,hashlib,json
from pathlib import Path
from opensim_run import cache_identity,ADAPTER_SHA_AT_IMPORT,NUMERICAL_PROTOCOL,sha
request={'parameters':{'fmaxMultiplier':1.07},'coordinate':'2mcp_flexion'}
key,p=cache_identity('example-source-hash',request,'OpenSim-version')
assert p['adapterSHA256']==sha(Path(__file__).with_name('opensim_run.py'))==ADAPTER_SHA_AT_IMPORT
assert key==hashlib.sha256(json.dumps(p,sort_keys=True).encode()).hexdigest()
for field,value in [('adapterSHA256','different-adapter'),('sourceModelHash','different-model'),('engineVersion','different-engine')]:
    other=copy.deepcopy(p);other[field]=value;assert hashlib.sha256(json.dumps(other,sort_keys=True).encode()).hexdigest()!=key
other=copy.deepcopy(p);other['numericalProtocol']['maxIterations']=999;assert hashlib.sha256(json.dumps(other,sort_keys=True).encode()).hexdigest()!=key
assert NUMERICAL_PROTOCOL['reserveOptimalForce_Nm']==.01 and NUMERICAL_PROTOCOL['reserveControlBounds']==[-1000,1000]
assert NUMERICAL_PROTOCOL['activationExponent']==2 and NUMERICAL_PROTOCOL['convergenceCriterion']==1e-8 and NUMERICAL_PROTOCOL['maxIterations']==1000
print(json.dumps({'status':'PASS','cacheKeyVersion':2,'adapterSHA256':ADAPTER_SHA_AT_IMPORT,'scope':'Fingerprint metadata unit checks only; existing replay keys unchanged; no native numerical rerun.'}))
