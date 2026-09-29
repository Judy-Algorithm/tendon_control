"""Independent source-pinned LEFT mirror/vertex registration verification."""
import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import numpy as np
import opensim as osim

LEFT='45c45732788afd4fcc78b89c97cf7a5da51de82dcb735d480459ee4e8770207b'
RIGHT='9a88909ca27da9397abe22599e51ae9699162bdf274f65d2a83d7b02793b24cc'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def v3(v):return np.array([v.get(i) for i in range(3)])
def matrix(t):
    m=np.eye(4);m[:3,:3]=[[t.R().get(i,j) for j in range(3)] for i in range(3)];m[:3,3]=v3(t.p());return m
def impose(model,state,values):
    for name,q in values.items():model.getCoordinateSet().get(name).setValue(state,float(q),False)
    for c0 in model.getConstraintSet():
        c=osim.CoordinateCouplerConstraint.safeDownCast(c0);assert c
        names=c.getIndependentCoordinateNames();x=osim.Vector(names.getSize(),0)
        for j in range(names.getSize()):x.set(j,model.getCoordinateSet().get(names.get(j)).getValue(state))
        model.getCoordinateSet().get(c.getDependentCoordinateName()).setValue(state,c.getFunction().calcValue(x),False)
    model.realizePosition(state)

def main(args):
    assert sha(args.source)==LEFT and sha(args.right)==RIGHT,'Unknown source; independent audit must be repinned'
    right=osim.Model(args.right);raw=osim.Model(args.source);left=osim.Model(args.canonical)
    rs=right.initSystem();raws=raw.initSystem();ls=left.initSystem();P=np.diag([1.,1.,-1.,1.]);S=np.diag([1.,-1.,1.,1.])
    baseline={c.getName():c.getValue(rs) for c in right.getCoordinateSet()}
    parameter_errors=[];mesh_scales=[];quadrants=[]
    for rm in raw.getMuscles():
        lm=left.getMuscles().get(rm.getName())
        for method in ['getMaxIsometricForce','getOptimalFiberLength','getTendonSlackLength','getPennationAngleAtOptimalFiberLength']:
            parameter_errors.append(abs(getattr(rm,method)()-getattr(lm,method)()))
    for rb in right.getBodySet():
        lb=left.getBodySet().get(rb.getName())
        for i in range(lb.getPropertyByName('attached_geometry').size()):
            mesh=osim.Mesh.safeDownCast(lb.get_attached_geometry(i))
            if mesh:mesh_scales.append({'body':lb.getName(),'file':mesh.get_mesh_file(),'scale':v3(mesh.get_scale_factors()).tolist()})
        for rw in rb.getWrapObjectSet():
            lw=lb.getWrapObjectSet().get(rw.getName());right_quadrant=rw.get_quadrant().lower();expected={'y':'-y','-y':'y'}.get(right_quadrant,right_quadrant)
            quadrants.append({'wrap':rw.getName(),'right':rw.get_quadrant(),'canonical':lw.get_quadrant(),'expected':expected,'pass':lw.get_quadrant().lower()==expected})
    cases=[]
    for offsets in [{},{'flexion':.2,'deviation':.1},{'2mcp_flexion':.3,'2pm_flexion':.2,'mp_flexion':.15}]:
        values=dict(baseline)
        for k,v in offsets.items():values[k]=v
        for m,s in [(right,rs),(raw,raws),(left,ls)]:impose(m,s,values)
        bodyerr=0.;rawbodyerr=0.;point_error=0.;rawpoint_error=0.;mesh_error=0.;wrap_error=0.;lengths=[];vertex_count=0
        for rb in right.getBodySet():
            lb=left.getBodySet().get(rb.getName());ob=raw.getBodySet().get(rb.getName());tr=matrix(rb.getTransformInGround(rs));tl=matrix(lb.getTransformInGround(ls))
            bodyerr=max(bodyerr,float(np.max(abs(tl-P@tr@S))))
            rawbodyerr=max(rawbodyerr,float(np.max(abs(tl-matrix(ob.getTransformInGround(raws))))))
            for rw in rb.getWrapObjectSet():
                lw=lb.getWrapObjectSet().get(rw.getName());wrap_error=max(wrap_error,float(np.max(abs(tl@matrix(lw.getTransform())-P@tr@matrix(rw.getTransform())@S))))
            for i in range(lb.getPropertyByName('attached_geometry').size()):
                mesh=osim.Mesh.safeDownCast(lb.get_attached_geometry(i))
                if not mesh:continue
                path=Path(args.geometry)/mesh.get_mesh_file();root=ET.parse(path).getroot();data=root.find('.//Points/DataArray');assert data.get('format')=='ascii'
                xyz=np.fromstring(data.text,sep=' ').reshape(-1,3);selected=xyz[[0,len(xyz)//2,len(xyz)-1]];hom=np.c_[selected,np.ones(3)]
                scale=np.eye(4);scale[:3,:3]=np.diag(v3(mesh.get_scale_factors()))
                mesh_error=max(mesh_error,float(np.max(abs((tl@scale@hom.T)-(P@tr@hom.T)))));vertex_count+=3
        for rm in right.getMuscles():
            lm=left.getMuscles().get(rm.getName());om=raw.getMuscles().get(rm.getName());rp=rm.getGeometryPath().getPathPointSet();lp=lm.getGeometryPath().getPathPointSet();op=om.getGeometryPath().getPathPointSet()
            for j in range(rp.getSize()):
                expected=P[:3,:3]@v3(rp.get(j).getLocationInGround(rs));point_error=max(point_error,float(np.max(abs(v3(lp.get(j).getLocationInGround(ls))-expected))))
                rawpoint_error=max(rawpoint_error,float(np.max(abs(v3(op.get(j).getLocationInGround(raws))-expected))))
            lengths.append({'muscle':rm.getName(),'right_m':rm.getLength(rs),'rawLeft_m':om.getLength(raws),'canonicalLeft_m':lm.getLength(ls)})
        cases.append({'pose':offsets,'bodyTransformMirrorMaxAbs':bodyerr,'canonicalVsRawBodyTransformMaxAbs':rawbodyerr,
          'wrapTransformMirrorMaxAbs':wrap_error,'attachmentMirrorMaxAbs_m':point_error,'rawAttachmentMirrorMaxAbs_m':rawpoint_error,
          'nativeMeshVertexMirrorMaxAbs_m':mesh_error,'nativeVerticesChecked':vertex_count,
          'maxCanonicalRightPathLengthDifference_m':max(abs(x['canonicalLeft_m']-x['right_m']) for x in lengths),'pathLengths':lengths})
    core=all(c['bodyTransformMirrorMaxAbs']<1e-9 and c['canonicalVsRawBodyTransformMaxAbs']<1e-12 and c['attachmentMirrorMaxAbs_m']<1e-9 and c['nativeMeshVertexMirrorMaxAbs_m']<1e-9 for c in cases)
    repair_pass=core and max(parameter_errors)==0 and all(x['pass'] for x in quadrants)
    paths_pass=all(x['maxCanonicalRightPathLengthDifference_m']<1e-6 for x in cases)
    result={'status':('PASS' if paths_pass else 'PARTIAL') if repair_pass else 'FAIL',
      'repairRulesAndRegistrationStatus':'PASS' if repair_pass else 'FAIL','allSampledPathMirrorStatus':'PASS' if paths_pass else 'FAIL',
      'quadrantCasePolicy':'Native quadrant strings compared case-insensitively; right template contains capital Y aliases.',
      'sourceHash':sha(args.source),'rightHash':sha(args.right),'canonicalHash':sha(args.canonical),'engine':osim.GetVersionAndDate(),
      'method':'Fresh native right/raw-left/canonical-left models; no repair/exporter module imported. Native VTP vertices transformed through actual body and mesh-scale matrices; no fitted alignment.',
      'unchangedMuscleScalarMaxAbs':max(parameter_errors),'bodyMeshScales':mesh_scales,'wrapQuadrantChecks':quadrants,'cases':cases,
      'limitations':['Canonical wrapping path length differences versus right are reported, not silently repaired with separate FDPI path-domain edits.',
        'Mesh checks use three native vertices per attached body mesh at three poses; rendering/triangulation is not the solver geometry.']}
    Path(args.output).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['cases','wrapQuadrantChecks','bodyMeshScales']}));print(json.dumps([{k:v for k,v in c.items() if k!='pathLengths'} for c in cases]))

if __name__=='__main__':
    p=argparse.ArgumentParser()
    for k in ['source','right','canonical','geometry','output']:p.add_argument('--'+k,required=True)
    main(p.parse_args())
