"""Convert a trusted, licensed, USER-LOCAL MANO model. Never publish the output.

Requires numpy and an existing EgoPressure mano.py loader (--loader).
PKL is executable: use only your own verified model, never an uploaded pickle.
This script exports runtime arrays plus independent numpy reference vertices.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import numpy as np

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--loader', required=True)
parser.add_argument('--models', required=True)
parser.add_argument('--hand', choices=['left', 'right'], default='right')
parser.add_argument('--output', required=True)
args = parser.parse_args()
out = Path(args.output).resolve()
repo = Path(__file__).resolve().parents[2]
if repo in out.parents:
    raise SystemExit('Private MANO arrays must stay outside the public repository.')
if out.exists():
    raise SystemExit('Output exists; choose a new path to preserve provenance.')
os.environ['EGOPRESSURE_MANO_PATH'] = args.models
spec = importlib.util.spec_from_file_location('local_mano', args.loader)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
m = module.load_mano_model(args.hand)
source = Path(args.models) / f'MANO_{args.hand.upper()}.pkl'
assert m['v_template'].shape == (778, 3)
assert m['posedirs'].shape == (778, 3, 135)
assert m['weights'].shape == (778, 16)
assert np.max(np.abs(m['weights'].sum(1)-1)) < 1e-7
parents = m['kintree_table'][0].astype(np.int64).tolist()
parents[0] = -1
for j in range(1,16):
    assert 0 <= parents[j] < j
def flat(key):
    return np.asarray(m[key], dtype=float).ravel().tolist()
data = dict(schema='mano-local-lbs-v1', hand=args.hand, units='m',
    sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
    privateAsset=True, vertexCount=778, jointCount=16, betaCount=10,
    vTemplate=flat('v_template'), shapeDirs=m['shapedirs'][:,:,:10].ravel().tolist(),
    poseDirs=flat('posedirs'), regressor=flat('J_regressor'), weights=flat('weights'),
    parents=parents, faces=m['f'].astype(int).ravel().tolist(), meanPose=flat('hands_mean'),
    # Explicit application convention, matching the existing local MANO pipeline.
    tips=[744,320,443,554,671], order21=[0,13,14,15,16,1,2,3,17,4,5,6,18,10,11,12,19,7,8,9,20],
    poseConvention='flat-hand axis-angle radians; relaxed preset explicitly blends hands_mean',
    distribution='User-local only; obtain separate permission before redistribution.')
cases=[]
for beta0,beta1,blend in [(0,0,0),(0,0,1),(1.5,-.8,.6),(-2,1.2,.25)]:
    betas=np.zeros(10);betas[:2]=[beta0,beta1]
    pose=np.r_[np.zeros(3),m['hands_mean']*blend]
    vertices=module.mano_vertices(m,betas,pose)
    cases.append(dict(betas=betas.tolist(),pose=pose.tolist(),vertices=vertices.ravel().tolist()))
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(data,separators=(',',':')))
out.with_suffix('.reference.json').write_text(json.dumps(dict(cases=cases),separators=(',',':')))
print(json.dumps(dict(output=str(out),sourceSha256=data['sourceSha256'],vertices=778,faces=len(data['faces'])//3,bytes=out.stat().st_size)))
