"""Native geometry/export QA at neutral and three changed configurations."""
import argparse
from pathlib import Path
import json
import numpy as np
import mujoco as mj
import myohand_runner as runner

def rotation(q):
    R=np.zeros(9);mj.mju_quat2Mat(R,np.asarray(q));return R.reshape(3,3)

def main(model_file,output):
    model=json.loads(Path(model_file).read_text());env,m,d=runner.new_env();coords=runner.names(m,mj.mjtObj.mjOBJ_JOINT,m.njnt)
    poses=[{}, {'flexion':.2,'deviation':.1}, {'mcp2_flexion':.6,'pm2_flexion':.3,'md2_flexion':.2}, {'cmc_flexion':-.2,'mp_flexion':-.3,'ip_flexion':-.3}]
    results=[]
    for pose in poses:
        d.qpos[:]=0
        for name,value in pose.items():d.qpos[coords.index(name)]=value
        mj.mj_forward(m,d);paths,raw,wraps,exact,poly=runner.expanded_paths(m,d)
        geometry_error=0.;point_error=0.;native_point_error=0.
        for geom in model['geoms']:
            gid=geom['id'];body=geom['bodyId'];world_pos=d.xpos[body]+rotation(d.xquat[body])@np.asarray(geom['localPos'])
            R=rotation(d.xquat[body])@rotation(geom['localQuat']);native_R=d.geom_xmat[gid].reshape(3,3)
            geometry_error=max(geometry_error,float(np.max(np.abs(world_pos-d.geom_xpos[gid]))),float(np.max(np.abs(R-native_R))))
            if geom['meshId'] is not None:
                mesh=next(x for x in model['meshes'] if x['id']==geom['meshId']);mid=geom['meshId'];vadr=m.mesh_vertadr[mid]
                for vi in (0,len(mesh['vertices'])//2,len(mesh['vertices'])-1):
                    exported=world_pos+R@np.asarray(mesh['vertices'][vi]);native=d.geom_xpos[gid]+native_R@m.mesh_vert[vadr+vi]
                    point_error=max(point_error,float(np.max(np.abs(exported-native))))
        for i in range(39):
            ti=m.actuator_trnid[i,0];start=d.ten_wrapadr[ti];num=d.ten_wrapnum[ti]
            native=d.wrap_xpos.reshape(-1,3)[start:start+num]
            native_point_error=max(native_point_error,float(np.max(np.abs(np.asarray(raw[i])-native))))
        results.append({'pose':pose,'nativeWorldTransformMaxAbs':geometry_error,'exportedMeshWorldVertexMaxAbs_m':point_error,
          'nativePathPointMaxAbs_m':native_point_error,'analyticPathLengthMaxAbs_m':exact,'renderPolylineLengthMaxAbs_m':poly,
          'activeWrapGeomCount':len(set(g for gs in wraps for g in gs)),'pathsChecked':len(paths)})
    checks={'schemaVersion':2,'type':'author-native-geometry-check','modelHash':model['manifest']['modelHash'],
      'tolerances':{'worldTransform':1e-8,'meshWorldVertex_m':2e-8,'pathPoint_m':1e-8,'analyticPathLength_m':1e-6,'polylineLength_m':2e-6},
      'poses':results,'passed':all(x['nativeWorldTransformMaxAbs']<1e-8 and x['exportedMeshWorldVertexMaxAbs_m']<2e-8 and x['nativePathPointMaxAbs_m']<1e-8 and x['analyticPathLengthMaxAbs_m']<1e-6 and x['renderPolylineLengthMaxAbs_m']<2e-6 for x in results),
      'scope':'Native compiled transforms and engine path endpoints checked at 4 poses. Arc discretization has a separate finite chord-length error. Independent reviewer replay remains separate.'}
    runner.write(output,checks);print(json.dumps(checks,indent=2));env.close()

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--model',required=True,type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args();main(a.model,a.output)
