"""Private v2 FDPI wrap-domain diagnostic; never updates active model/index."""
import argparse,json
from pathlib import Path
import numpy as np
import opensim as o
from opensim_run import exact,vec,save,sha
DOMAINS=[('FDP','FDPI-P2','FDPI-P3','radius','capitate'),('2ndmcp_FDPI','FDPI-P5','FDPI-P6','secondmc','2proxph'),('2ndpm_FDPI','FDPI-P6_0','FDPI-P7','2proxph','2midph')]

def restrict(m):
    path=m.getMuscles().get('FDPI').updGeometryPath();points=path.getPathPointSet();names=[p.getName() for p in points];changes=[]
    for obj,a,b,ab,bb in DOMAINS:
        i,j=names.index(a),names.index(b)
        if j!=i+1 or [points.get(k).getParentFrame().findBaseFrame().getName() for k in [i,j]]!=[ab,bb]:raise ValueError('Native path topology mismatch')
        matches=[w for w in path.updWrapSet() if w.get_wrap_object()==obj]
        if len(matches)!=1:raise ValueError('Native wrap identity mismatch')
        w=matches[0];changes.append({'wrap':obj,'before':[w.get_range(k) for k in [0,1]],'after':[i+1,j+1],'points':[a,b],'bodies':[ab,bb]});w.set_range(0,i+1);w.set_range(1,j+1)
    return changes

def inspect(m,values):
    s=m.initSystem()
    for name,v in values.items():m.getCoordinateSet().get(name).setValue(s,v,False)
    exact(m,s);ind=[c for c in m.getCoordinateSet() if not c.isConstrained(s)];rows={}
    for muscle in m.getMuscles():rows[muscle.getName()]={'length_m':muscle.getLength(s),'momentArms_m':[muscle.computeMomentArm(s,c) for c in ind]}
    p=m.getMuscles().get('FDPI').getGeometryPath().getCurrentPath(s);nodes=[];world=[]
    for i in range(p.getSize()):
        point=p.get(i);wp=o.PathWrapPoint.safeDownCast(point);nodes.append({'point':point.getName(),'body':point.getParentFrame().findBaseFrame().getName(),'wrap':wp.getWrapObject().getName() if wp else None})
        if wp:
            samples=wp.getWrapPath(s)
            for j in range(samples.getSize()):world.append(vec(point.getParentFrame().findStationLocationInGround(s,samples.get(j))))
        world.append(vec(point.getLocationInGround(s)))
    return {'muscles':rows,'coordinateNames':[c.getName() for c in ind],'fdpiPathNodes':nodes,'fdpiPathWorld_m':world}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--right',required=True);ap.add_argument('--left-v1',required=True);ap.add_argument('--output',required=True);args=ap.parse_args();out=Path(args.output)
    if out.exists():raise ValueError('New diagnostic directory required')
    out.mkdir(parents=True);o.Logger.setLevelString('error');models={};changes={}
    for side,source in [('right',args.right),('left',args.left_v1)]:
        for version in ['v1','v2']:
            m=o.Model(source);m.finalizeConnections()
            if version=='v2':changes[side]=restrict(m)
            m.setName('FDPI_domain_diagnostic_'+side+'_'+version);m.finalizeConnections();m.initSystem();p=out/(side+'_'+version+'.osim');m.printToXML(str(p));models[side+'_'+version]=m
    recipes=[('neutral',{}),('wrist',{'flexion':.2,'deviation':.1}),('index_thumb',{'2mcp_flexion':.3,'2pm_flexion':.2,'mp_flexion':.15}),('more_flexed',{'2mcp_flexion':.7,'2pm_flexion':.5,'mp_flexion':.3})];cases=[]
    for name,values in recipes:
        sample={key:inspect(m,values) for key,m in models.items()};comparisons={}
        for version in ['v1','v2']:
            r=sample['right_'+version]['muscles'];l=sample['left_'+version]['muscles'];comparisons[version]={'maxLengthMirrorDifference_m':max(abs(r[n]['length_m']-l[n]['length_m']) for n in r),'fdpiLengthMirrorDifference_m':abs(r['FDPI']['length_m']-l['FDPI']['length_m']),'maxNativeMomentArmMirrorDifference_m':max(float(np.max(abs(np.array(r[n]['momentArms_m'])-l[n]['momentArms_m']))) for n in r)}
        cases.append({'pose':name,'values_rad':values,'comparisons':comparisons,'native':sample})
    record={'status':'DIAGNOSTIC_ONLY_NOT_ACTIVE','ruleSource':'Existing user server/path_repairs.py FDPI_DOMAINS','sourceHashes':{'right':sha(args.right),'leftV1':sha(args.left_v1)},'changes':changes,'cases':cases,'scope':'Native wrap ranges restricted to named adjacent original attachment pairs. This changes the native force-path model; neither symmetry alone nor a prettier path establishes anatomical validity. No active model/index or SO labels changed.'};save(out/'diagnostic.json',record);print(json.dumps({'status':record['status'],'cases':[{'pose':c['pose'],**c['comparisons']} for c in cases]}))
if __name__=='__main__':main()
