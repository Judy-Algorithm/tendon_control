"""Read-only audit: axial rotation vectors under RIGHT-to-LEFT registration.

Does not modify any active coverage, trajectories, model or native replay.
"""
import argparse,json,subprocess,hashlib
from pathlib import Path
import numpy as np
import opensim as o
from opensim_run import exact,vec,save
from opensim_coverage import basis,unit
ap=argparse.ArgumentParser();ap.add_argument('--model',required=True);ap.add_argument('--output',required=True);ap.add_argument('--candidate-output');args=ap.parse_args()
o.Logger.setLevelString('error');model=o.Model(args.model);s=model.initSystem();exact(model,s)
root=Path(__file__).resolve().parents[2];data=root/'explainer/native-v2/data'
catalog=json.loads((data/'action-catalog.json').read_text());old=json.loads((data/'opensim-canonical-coverage.json').read_text());old={r['actionId']:r for r in old['coverage']}
text=subprocess.check_output(['node','--input-type=module','-e',"import{MODEL}from'./model-data.js';console.log(JSON.stringify(MODEL.joints.map(j=>({name:j.name,p:j.anchor_i16.map(v=>v*MODEL.quant)}))));"],text=True,cwd=root)
display={j['name']:np.array(j['p']) for j in json.loads(text)}
jp=lambda name:np.array(vec(model.getJointSet().get(name).getChildFrame().getPositionInGround(s)))
D=basis(display['flexion'],display['mcp2_flexion'],display['mcp3_flexion'],display['mcp5_flexion'])
N=basis(jp('radiocarpal'),jp('_2MCP'),jp('_3MCP'),jp('_5MCP'))
P=N@np.diag([1.,1.,-1.])@D.T
axial=np.linalg.det(P)*P
coordinates={c.getName():c for c in model.getCoordinateSet()};axes={}
for c in model.getCoordinateSet():
    if c.isConstrained(s):continue
    body=c.getJoint().getChildFrame().findBaseFrame();eps=1e-6
    sp=o.State(s);sm=o.State(s);c.setValue(sp,c.getValue(s)+eps,False);c.setValue(sm,c.getValue(s)-eps,False);exact(model,sp);exact(model,sm)
    matrix=lambda st:np.array([[body.getTransformInGround(st).R().get(i,j) for j in range(3)] for i in range(3)])
    omega=((matrix(sp)-matrix(sm))/(2*eps))@matrix(s).T;axes[c.getName()]=unit(np.array([omega[2,1],omega[0,2],omega[1,0]]))
rows=[];candidates=[]
for a in catalog['actions']:
    hint=a['modelCoordinateHint'];r={'actionId':a['id'],'label':a['label'],'coordinate':hint,'oldStatus':old[a['id']]['status']}
    if a['inferredAxis'] or hint not in axes:
        r.update(status='unsupported_constructed_or_coupled_axis');rows.append(r);candidates.append({'actionId':a['id'],'label':a['label'],'coordinate':hint,'origin':'original_atlas','status':'unsupported','runStatus':'not_run','reason':'显示层构造轴或耦合动作，没有直接等价的原生独立坐标','candidateOnly':True});continue
    w=unit(np.array(a['displayAxis']));dot=float(np.dot(axial@w,axes[hint]));sign=1 if dot>=0 else -1;c=coordinates[hint];q=c.getValue(s)+sign*np.asarray(a['angles_deg'])*np.pi/180
    # The axial transform is separately checked against a polar cross-product identity.
    test_v=unit(np.array([.3,.4,.7]));err=float(np.max(abs(P@np.cross(w,test_v)-np.cross(axial@w,P@test_v))))
    r.update(oldAxisCosine=old[a['id']].get('axisCosineInPalmBasis'),oldSign=old[a['id']].get('proposedSign'),correctedAxisCosine=dot,correctedSign=sign,requestedRange_rad=[float(q.min()),float(q.max())],nativeRange_rad=[c.getRangeMin(),c.getRangeMax()],crossProductIdentityMaxError=err)
    r['status']='axis_registration_pending' if abs(dot)<.9 else 'out_of_original_amplitude_range' if q.min()<c.getRangeMin()-1e-7 or q.max()>c.getRangeMax()+1e-7 else 'candidate_mapping_requires_independent_review'
    rows.append(r)
    status={'axis_registration_pending':'not_yet_verified','out_of_original_amplitude_range':'unsupported','candidate_mapping_requires_independent_review':'mapped'}[r['status']]
    entry={'actionId':a['id'],'label':a['label'],'coordinate':hint,'origin':'original_atlas','status':status,'runStatus':'not_run','candidateOnly':True,'axisCosineInPalmBasis':dot,'proposedSign':sign,'nativeRange_rad':r['nativeRange_rad'],'requestedRange_rad':r['requestedRange_rad'],'mappingVersion':'opposite-hand-axial-v2','reason':{'mapped':'异侧手极向量/轴向量变换已修正；候选角度对应，等待独立审核及实际求解','not_yet_verified':'异侧手变换后轴向仍未达到既定阈值；需要进一步配准','unsupported':'原始动作幅度超出当前原生范围；未更改幅度'}[status]}
    if status=='mapped':entry['mappedTrajectory']={'times_s':a['times_s'],'coordinateNames':[hint],'q':[[float(x)] for x in q]}
    candidates.append(entry)
pairs={'flexion':'radiocarpal','cmc_flexion':'CMC1b','mp_flexion':'MCP','ip_flexion':'IP'}
for i in range(2,6):pairs.update({f'mcp{i}_flexion':f'_{i}MCP',f'pm{i}_flexion':f'_{i}prox-midph_b',f'md{i}_flexion':f'_{i}mid-distph'})
X=np.array([display[k] for k in pairs]);Y=np.array([jp(v) for v in pairs.values()]);X-=X.mean(axis=0);Y-=Y.mean(axis=0)
u,sv,vt=np.linalg.svd(X.T@Y);fit=[]
for det in [-1,1]:
    corr=np.diag([1.,1.,det*np.linalg.det(u@vt)]);R=u@corr@vt;scale=np.sum((X@R)*Y)/np.sum(X*X);fit.append({'determinant':det,'scale':float(scale),'rms_m':float(np.sqrt(np.mean(np.sum((scale*X@R-Y)**2,axis=1))))})
result={'status':'MAPPING_SIGN_BUG_FOUND_NOT_APPLIED','scope':'Read-only diagnostic, no active fixture or mapping changed. Axial correction depends on verified opposite handedness of display MyoHand RIGHT and canonical OpenSim LEFT. Axis similarity remains a separate requirement.','sourceModelHash':hashlib.sha256(Path(args.model).read_bytes()).hexdigest(),'displaySource':'docs/data-provenance.json: public MyoHand geometry; native MyoHand manifest declares RIGHT','polarRegistrationDeterminant':float(np.linalg.det(P)),'polarRegistration':P.tolist(),'axialRegistration':axial.tolist(),'explanation':'A right-handed cross-product palm basis on both hands silently chooses a proper rotation. Opposite-hand anatomy requires polar map P with det(P)=-1; an angular velocity is axial and transforms as det(P)P omega. Neglecting chirality reverses flexion signs for in-plane axes.','landmarkSimilarityFits':fit,'counts':{k:sum(r['status']==k for r in rows) for k in sorted(set(r['status'] for r in rows))},'rows':rows}
save(args.output,result);print(json.dumps({'counts':result['counts'],'fits':fit,'candidates':[r['actionId'] for r in rows if r['status']=='candidate_mapping_requires_independent_review'],'maxCrossProductError':max(r.get('crossProductIdentityMaxError',0) for r in rows)},indent=2))
if args.candidate_output:
    assert len(candidates)==48 and len(set(x['actionId'] for x in candidates))==48
    save(args.candidate_output,{'modelId':'opensim-arms-left-repaired-v1-full43','modelHash':result['sourceModelHash'],'mappingVersion':'opposite-hand-axial-v2','status':'CANDIDATE_NOT_ACTIVE_AWAITING_INDEPENDENT_REVIEW','axisAudit':result['explanation']+' Absolute cosine threshold remains0.9. This is angular correspondence, not full landmark equivalence.','polarRegistration':P.tolist(),'axialRegistration':axial.tolist(),'atlasActions':48,'coverage':candidates,'counts':{k:sum(x['status']==k for x in candidates) for k in ['mapped','unsupported','not_yet_verified']}})
