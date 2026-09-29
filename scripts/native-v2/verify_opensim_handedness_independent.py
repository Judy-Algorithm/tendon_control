"""Read-only independent chirality/axis/trajectory audit; no author-runner imports."""
import argparse, hashlib, json, subprocess
from pathlib import Path
import numpy as np
import opensim as osim

parser=argparse.ArgumentParser()
parser.add_argument('--left',required=True);parser.add_argument('--right',required=True);parser.add_argument('--output',required=True)
args=parser.parse_args();root=Path(__file__).resolve().parents[2]
osim.Logger.setLevelString('error')
catalog=json.loads((root/'explainer/native-v2/data/action-catalog.json').read_text())
candidate=json.loads((root/'docs/native-solver-v2/OPENSIM_ORIGINAL_ATLAS_CANDIDATE_V2.json').read_text())
anchors=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {MODEL} from './model-data.js';console.log(JSON.stringify(Object.fromEntries(MODEL.joints.map(j=>[j.name,j.anchor_i16.map(x=>x*MODEL.quant)]))));"],cwd=root,text=True))
def realize(model,s):
    for item in model.getConstraintSet():
        con=osim.CoordinateCouplerConstraint.safeDownCast(item)
        values=osim.Vector(con.getIndependentCoordinateNames().getSize(),0.)
        for i in range(values.size()):values.set(i,model.getCoordinateSet().get(con.getIndependentCoordinateNames().get(i)).getValue(s))
        model.getCoordinateSet().get(con.getDependentCoordinateName()).setValue(s,con.getFunction().calcValue(values),False)
    model.realizePosition(s)
def unit(v):return v/np.linalg.norm(v)
def palm(points):
    wrist,index,middle,little=points
    y=unit(middle-wrist);r=index-little;x=unit(r-y*np.dot(y,r));z=np.cross(x,y)
    return np.column_stack((x,y,z))
def skew(w):
    x,y,z=w;return np.array([[0.,-z,y],[z,0.,-x],[-y,x,0.]])
def rotation(w,t):
    k=skew(unit(w));return np.eye(3)+np.sin(t)*k+(1-np.cos(t))*(k@k)
def native(path):
    model=osim.Model(path);s=model.initSystem();realize(model,s)
    def anchor(name):
        p=model.getJointSet().get(name).getChildFrame().getPositionInGround(s)
        return np.array([p.get(i) for i in range(3)])
    return model,s,anchor
left,state,anchor=native(args.left);right,rstate,ranchor=native(args.right)
D=palm(np.array([anchors[n] for n in ['flexion','mcp2_flexion','mcp3_flexion','mcp5_flexion']]))
N=palm(np.array([anchor(n) for n in ['radiocarpal','_2MCP','_3MCP','_5MCP']]))
P=N@np.diag([1,1,-1])@D.T;A=np.linalg.det(P)*P
assert np.max(abs(P-np.array(candidate['polarRegistration'])))<1e-12
assert np.linalg.det(P)<-.999999
rows=[];status_counts={};max_cos_error=0.;max_rotation_error=0.;max_q_error=0.
lookup={x['actionId']:x for x in candidate['coverage']}
for action in catalog['actions']:
    row=lookup[action['id']];status=row['status'];status_counts[status]=status_counts.get(status,0)+1
    if action['inferredAxis'] or 'axisCosineInPalmBasis' not in row:continue
    c=left.getCoordinateSet().get(action['modelCoordinateHint']);body=c.getJoint().getChildFrame().findBaseFrame()
    matrices=[]
    for eps in [-1e-6,0.,1e-6]:
        st=osim.State(state);c.setValue(st,c.getValue(state)+eps,False);realize(left,st)
        R=body.getTransformInGround(st).R();matrices.append(np.array([[R.get(i,j) for j in range(3)] for i in range(3)]))
    omega=(matrices[2]-matrices[0])/(2e-6)@matrices[1].T
    axis=unit(np.array([omega[2,1]-omega[1,2],omega[0,2]-omega[2,0],omega[1,0]-omega[0,1]]))
    w=unit(np.array(action['displayAxis']));cos=float(np.dot(A@w,axis));max_cos_error=max(max_cos_error,abs(cos-row['axisCosineInPalmBasis']))
    # Reflection conjugation is the exact finite-rotation identity, not a name/sign guess.
    rot_error=float(np.max(abs(P@rotation(w,.37)@P.T-rotation(A@w,.37))));max_rotation_error=max(max_rotation_error,rot_error)
    sign=1 if cos>=0 else -1;q=c.getValue(state)+sign*np.deg2rad(action['angles_deg'])
    expected='not_yet_verified' if abs(cos)<.9 else 'unsupported' if q.min()<c.getRangeMin()-1e-7 or q.max()>c.getRangeMax()+1e-7 else 'mapped'
    assert expected==status and sign==row['proposedSign']
    if status=='mapped':
        assert row['mappedTrajectory']['times_s']==action['times_s'] and len(action['times_s'])==121 and action['times_s'][-1]==2.4
        err=float(np.max(abs(q-np.array(row['mappedTrajectory']['q']).ravel())));max_q_error=max(max_q_error,err);assert err<1e-12
    rows.append({'actionId':action['id'],'status':status,'axisCosine':cos,'sign':sign,'neutral_rad':c.getValue(state),'qStart_rad':float(q[0]),'qEnd_rad':float(q[-1])})
pairs={'flexion':'radiocarpal','cmc_flexion':'CMC1b','mp_flexion':'MCP','ip_flexion':'IP'}
for i in range(2,6):pairs.update({f'mcp{i}_flexion':f'_{i}MCP',f'pm{i}_flexion':f'_{i}prox-midph_b',f'md{i}_flexion':f'_{i}mid-distph'})
fits=[]
for label,get_anchor in [('canonical_left',anchor),('original_right',ranchor)]:
    X=np.array([anchors[k] for k in pairs]);Y=np.array([get_anchor(v) for v in pairs.values()]);X-=X.mean(0);Y-=Y.mean(0)
    U,_,Vt=np.linalg.svd(Y.T@X)
    for determinant in [-1,1]:
        R=U@np.diag([1,1,determinant*np.linalg.det(U@Vt)])@Vt
        Z=X@R.T;scale=np.sum(Z*Y)/np.sum(Z*Z);rms=float(np.sqrt(np.mean(np.sum((scale*Z-Y)**2,axis=1))))
        fits.append({'nativeModel':label,'determinant':determinant,'rms_m':rms,'scale':float(scale)})
assert fits[0]['rms_m']<fits[1]['rms_m'] and fits[3]['rms_m']<fits[2]['rms_m']
result={'status':'APPROVE_CANDIDATE_MAPPING_FOR_NATIVE_RERUN','scope':'Only angular correspondence; not identical fingertip paths, anatomical registration or SO success. All 48 statuses remain. Old proper-rotation mappings are superseded, not relabelled.','leftModelHash':hashlib.sha256(Path(args.left).read_bytes()).hexdigest(),'rightModelHash':hashlib.sha256(Path(args.right).read_bytes()).hexdigest(),'candidateHash':hashlib.sha256((root/'docs/native-solver-v2/OPENSIM_ORIGINAL_ATLAS_CANDIDATE_V2.json').read_bytes()).hexdigest(),'independentReviewerNoAuthorImports':True,'counts':status_counts,'maxAxisCosineDiscrepancy':max_cos_error,'finiteRotationConjugationMaxError':max_rotation_error,'mappedTrajectoryMaxError_rad':max_q_error,'landmarkFits':fits,'rows':rows}
Path(args.output).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='rows'},indent=2))
