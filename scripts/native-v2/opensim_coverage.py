"""Audit all original atlas actions against the native OpenSim hand.

Axis agreement is measured in each model's declared palm basis. It is a
coordinate correspondence diagnostic, not a mesh/marker registration proof.
"""
import argparse,json,subprocess
from pathlib import Path
import numpy as np
import opensim as o
from opensim_run import exact,vec,save
def unit(v):return v/np.linalg.norm(v)
def basis(wrist,index,middle,pinky):
    y=unit(middle-wrist);z=unit(np.cross(index-pinky,y));x=unit(np.cross(y,z));return np.c_[x,y,z]
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--model',required=True);ap.add_argument('--catalog',required=True);ap.add_argument('--output',required=True);ap.add_argument('--index');args=ap.parse_args()
    o.Logger.setLevelString('error');model=o.Model(args.model);s=model.initSystem();exact(model,s);catalog=json.loads(Path(args.catalog).read_text())
    text=subprocess.check_output(['node','--input-type=module','-e',"import{MODEL}from'./model-data.js';console.log(JSON.stringify(MODEL.joints.map(j=>({name:j.name,p:j.anchor_i16.map(v=>v*MODEL.quant)}))));"],text=True)
    display={j['name']:np.array(j['p']) for j in json.loads(text)};D=basis(display['flexion'],display['mcp2_flexion'],display['mcp3_flexion'],display['mcp5_flexion'])
    jp=lambda name:np.array(vec(model.getJointSet().get(name).getChildFrame().getPositionInGround(s)))
    N=basis(jp('radiocarpal'),jp('_2MCP'),jp('_3MCP'),jp('_5MCP'))
    coordinates={c.getName():c for c in model.getCoordinateSet()};native=[];axes={}
    for c in model.getCoordinateSet():
        if c.isConstrained(s):continue
        joint=c.getJoint();body=joint.getChildFrame().findBaseFrame();eps=1e-6;sp=o.State(s);sm=o.State(s);c.setValue(sp,c.getValue(s)+eps,False);c.setValue(sm,c.getValue(s)-eps,False);exact(model,sp);exact(model,sm)
        matrix=lambda st:np.array([[body.getTransformInGround(st).R().get(i,j) for j in range(3)] for i in range(3)])
        r=matrix(s);dr=(matrix(sp)-matrix(sm))/(2*eps);omega=dr@r.T;axis=np.array([omega[2,1],omega[0,2],omega[1,0]])
        if np.linalg.norm(axis)>1e-8:axes[c.getName()]=unit(axis)
        native.append({'coordinate':c.getName(),'range_rad':[c.getRangeMin(),c.getRangeMax()],'default_rad':c.getValue(s),'nativeAxisWorld':axis.tolist(),'nativeAxisPalm':(N.T@unit(axis)).tolist(),'origin':'native_independent_coordinate','directions':[{'direction':sign,'targetRad':c.getValue(s)+sign*.2,'status':'available' if c.getRangeMin()<=c.getValue(s)+sign*.2<=c.getRangeMax() else 'outside_native_range'} for sign in [-1,1]]})
    coverage=[]
    for action in catalog['actions']:
        hint=action['modelCoordinateHint'];record={'actionId':action['id'],'label':action['label'],'coordinate':hint,'origin':'original_atlas','runStatus':'not_run','status':'not_yet_verified','reason':'尚未完成原生坐标对应审计'}
        if action['inferredAxis'] or hint not in axes:
            record.update(status='unsupported',reason='显示层构造轴或耦合动作，没有直接等价的原生独立坐标')
        else:
            dot=float(np.dot(D.T@unit(np.array(action['displayAxis'])),N.T@axes[hint]));sign=1 if dot>=0 else -1;c=coordinates[hint]
            angles=c.getValue(s)+sign*np.array(action['angles_deg'])*np.pi/180;bounds=[c.getRangeMin(),c.getRangeMax()];record.update(axisCosineInPalmBasis=dot,proposedSign=sign,nativeRange_rad=bounds,requestedRange_rad=[float(angles.min()),float(angles.max())])
            if abs(dot)<.9:record.update(status='not_yet_verified',reason='模型间关节轴方向差异，需额外配准，不能只按名字映射')
            elif angles.min()<bounds[0]-1e-7 or angles.max()>bounds[1]+1e-7:record.update(status='unsupported',reason='原始片段幅度超出当前原生关节范围；未缩小幅度制造通过')
            else:record.update(status='mapped',reason='原生坐标/方向/范围已核对；为角度轨迹映射，不代表两种网格的逐点动作相同',mappedTrajectory={'times_s':action['times_s'],'coordinateNames':[hint],'q':[[float(x)] for x in angles]})
        coverage.append(record)
    result={'modelId':'opensim-arms-left-full43','atlasActions':len(coverage),'axisAudit':'Finite native child-body angular response vs atlas rotation axis, in each models wrist-to-middle/index-to-pinky orthonormal palm basis;abs cosine>=.9 required for provisional angular mapping. This is not full spatial landmark registration.','coverage':coverage,'nativeCoordinateActions':native,'counts':{key:sum(x['status']==key for x in coverage) for key in ['mapped','unsupported','not_yet_verified']}}
    save(args.output,result)
    if args.index:
        path=Path(args.index);idx=json.loads(path.read_text());idx['coverage']=[{k:v for k,v in r.items() if k!='mappedTrajectory'} for r in coverage];idx['coverageFile']=Path(args.output).name;idx['geometryFile']='opensim-geometry.json';save(path,idx)
    print(result['counts'])
if __name__=='__main__':main()
