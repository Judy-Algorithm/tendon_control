"""Check published mesh coordinates/scales/poses against a fresh native model."""
import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import numpy as np
import opensim as osim

def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def transform(x):
    out=np.eye(4);out[:3,:3]=[[x.R().get(i,j) for j in range(3)] for i in range(3)];out[:3,3]=[x.p().get(i) for i in range(3)];return out

def main(args):
    asset=json.loads(Path(args.asset).read_text());run=json.loads(Path(args.run).read_text())
    assert asset['modelHash']==run['manifest']['modelHash']==sha(args.model)
    model=osim.Model(args.model);s=model.initSystem();meshes={m['id']:m for m in asset['meshes']};source_vertices={};count=0;localerror=0.;scaleerror=0.
    for geom in asset['geoms']:
        mesh=meshes[geom['meshId']];path=Path(args.geometry)/mesh['sourceFile'];assert sha(path)==mesh['sourceSha256']
        points=ET.parse(path).getroot().find('.//Points/DataArray');assert points.get('format')=='ascii'
        native=np.fromstring(points.text,sep=' ').reshape(-1,3);public=np.asarray(mesh['vertices']);assert native.shape==public.shape
        localerror=max(localerror,float(np.max(np.abs(native-public))));source_vertices[mesh['id']]=native;count+=len(native)
        body=model.getBodySet().get(geom['bodyId']);candidates=[osim.Mesh.safeDownCast(body.get_attached_geometry(i)) for i in range(body.getPropertyByName('attached_geometry').size())]
        native_mesh=next(m for m in candidates if m and m.get_mesh_file()==mesh['sourceFile'])
        scale=np.eye(4);scale[:3,:3]=np.diag([native_mesh.get_scale_factors().get(i) for i in range(3)])
        scaleerror=max(scaleerror,float(np.max(abs(scale-np.asarray(geom['localMatrix']).reshape(4,4)))))
    frames=[]
    for k in [0,len(run['frames'])//2,len(run['frames'])-1]:
        f=run['frames'][k]
        for name,q in zip(run['allCoordinateNames'],f['qAll']):model.getCoordinateSet().get(name).setValue(s,q,False)
        model.realizePosition(s);worlderror=0.;transformerror=0.
        for g in asset['geoms']:
            body=model.getBodySet().get(g['bodyId']);native_t=transform(body.getTransformInGround(s));public_t=np.asarray(f['bodyTransforms'][g['bodyId']]);local=np.asarray(g['localMatrix']).reshape(4,4)
            transformerror=max(transformerror,float(np.max(abs(native_t-public_t))));v=source_vertices[g['meshId']];hom=np.c_[v,np.ones(len(v))]
            worlderror=max(worlderror,float(np.max(abs((native_t@local@hom.T)-(public_t@local@hom.T)))))
        frames.append({'frameIndex':k,'time_s':f['time_s'],'nativeBodyTransformMaxAbs':transformerror,'nativeWorldVertexMaxAbs_m':worlderror})
    result={'status':'PASS' if max([localerror,scaleerror]+[f['nativeWorldVertexMaxAbs_m'] for f in frames])<1e-9 else 'FAIL',
      'modelHash':asset['modelHash'],'assetHash':sha(args.asset),'runHash':sha(args.run),'geoms':len(asset['geoms']),'verticesPerFrame':count,
      'nativeLocalVertexMaxAbs_m':localerror,'nativeMeshScaleMaxAbs':scaleerror,'frames':frames,
      'method':'Independent fresh OpenSim model and original ASCII VTP sources. Every exported vertex checked; actual native body transforms and mesh scale used, with no alignment/fitting or cosmetic gap filling.',
      'limitations':['Verifies native registration, not anatomical truth or native wrapping uniqueness. Triangulation used only for display.']}
    Path(args.output).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

if __name__=='__main__':
    p=argparse.ArgumentParser()
    for k in ['model','asset','run','geometry','output']:p.add_argument('--'+k,required=True)
    main(p.parse_args())
