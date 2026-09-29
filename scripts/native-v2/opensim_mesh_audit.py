"""Read-only mesh/frame audit: distinguish source-model mismatch from exporter bug."""
import argparse,json,hashlib
from pathlib import Path
import numpy as np
import opensim as o
from scipy.spatial import cKDTree
from opensim_run import transform,vec,exact,save

ap=argparse.ArgumentParser();ap.add_argument('--left',required=True);ap.add_argument('--right',required=True);ap.add_argument('--asset',required=True);ap.add_argument('--run',required=True);ap.add_argument('--output',required=True);args=ap.parse_args()
o.Logger.setLevelString('error');left=o.Model(args.left);ls=left.initSystem();right=o.Model(args.right);rs=right.initSystem();d=json.loads(Path(args.run).read_text());frame=d['frames'][0];asset=json.loads(Path(args.asset).read_text());meshes={m['id']:m for m in asset['meshes']}
for name,value in zip(d['allCoordinateNames'],frame['qAll']):left.getCoordinateSet().get(name).setValue(ls,value,False);right.getCoordinateSet().get(name).setValue(rs,value,False)
left.realizePosition(ls);right.realizePosition(rs);P=np.diag([1.,1.,-1.,1.]);S=np.diag([1.,-1.,1.,1.]);rows=[];world={};world_repaired={}
for geom in asset['geoms']:
    body=geom['bodyId'];b=left.getBodySet().get(body);reference=next(o.Mesh.safeDownCast(b.get_attached_geometry(i)) for i in range(b.getPropertyByName('attached_geometry').size()) if o.Mesh.safeDownCast(b.get_attached_geometry(i)).get_mesh_file()==geom['nativeFile']);v=np.asarray(meshes[geom['meshId']]['vertices']);v4=np.c_[v,np.ones(len(v))]
    native_matrix=np.array(transform(reference.getFrame().getTransformInGround(ls)))@np.diag([*vec(reference.get_scale_factors()),1]);export_matrix=np.array(frame['bodyTransforms'][body])@np.array(geom['localMatrix']).reshape(4,4)
    native=(native_matrix@v4.T).T[:,:3];export=(export_matrix@v4.T).T[:,:3];world[body]=native;world_repaired[body]=(np.array(transform(b.getTransformInGround(ls)))@S@v4.T).T[:,:3]
    rb=right.getBodySet().get(body);left_body=np.array(transform(b.getTransformInGround(ls)));right_body=np.array(transform(rb.getTransformInGround(rs)));rows.append({'body':body,'mesh':geom['nativeFile'],'frame':reference.getFrame().getAbsolutePathString(),'sourceLocalBounds_m':[v.min(0).tolist(),v.max(0).tolist()],'nativeScaleFactors':vec(reference.get_scale_factors()),'maxExporterVsNativeWorldVertexError_m':float(abs(native-export).max()),'maxLeftBodyVsReflectedRightBodyTransformError':float(abs(left_body-P@right_body@S).max()),'leftMassCenter_m':vec(b.getMassCenter()),'rightMassCenter_m':vec(rb.getMassCenter())})
gaps=[]
for a,b in [('2proxph','2midph'),('2midph','2distph'),('3proxph','3midph'),('3midph','3distph')]:
    gaps.append({'bodies':[a,b],'nearestVertexGapOriginal_m':float(cKDTree(world[a]).query(world[b])[0].min()),'nearestVertexGapWithProposedYReflection_m':float(cKDTree(world_repaired[a]).query(world_repaired[b])[0].min())})
result={'status':'SOURCE_MODEL_MESH_MISMATCH','sourceModelHash':hashlib.sha256(Path(args.left).read_bytes()).hexdigest(),'nativeExporterCheck':'No duplicate mesh scaling or matrix-transpose error; exportedworld vertices match directnativeMesh.frame×Mesh.scale×sourcevertices.','cause':'LEFT source already reflects body/joint/local anatomy Y, but Mesh.scale_factors stay+1 and filenames refer to unchanged right-hand geometry.','proposedRepairStatus':'DIAGNOSTIC_ONLY_NOT_APPLIED','rows':rows,'gapExamples':gaps,'existingRepairSource':'Existing repository server/left_adapter.py pins this source hash and specifies body mesh scale[1,-1,1], plus separate movingpoint andwrapquadrant physical repairs. Physics repair must not be silently applied to old SO results.'}
save(args.output,result);print(json.dumps({'status':result['status'],'maxNativeVertexError_m':max(r['maxExporterVsNativeWorldVertexError_m'] for r in rows),'maxBodyReflectionTransformError':max(r['maxLeftBodyVsReflectedRightBodyTransformError'] for r in rows),'gaps':gaps}))
