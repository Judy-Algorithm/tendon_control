"""Versioned repair of the pinned user LEFT derivative, preserving the source.

The transformation rules are reproduced from the user's tendon_control/server/
left_adapter.py (arms-left-landmarks-1). No fitting or cosmetic alignment is used.
The separate FDPI wrap-domain adapter is NOT applied by this repair version.
"""
import argparse,hashlib,json
from pathlib import Path
import opensim as o
from opensim_run import save,sha
SOURCE_HASH='45c45732788afd4fcc78b89c97cf7a5da51de82dcb735d480459ee4e8770207b'
QUADRANTS={'Elbow_PT_ECRL':'x','EIP':'z','PL':'-z','FDS':'-z','FDP':'y','EDM':'-z','FPL':'-z','IPthumb':'-x','2ndmcp_FDSI':'y','2ndmcp_FDPI':'y','5thmcp':'-x','2ndpm_FDPI':'y','2ndpm_extI':'-y','Secondpm':'x','2ndmd_extI':'-y','Secondmd':'x','Thirdmd':'x','Fourthmd':'x','Fifthmd':'x'}

def repair(source,output,evidence):
    source=Path(source);output=Path(output)
    if sha(source)!=SOURCE_HASH:raise ValueError('Source is not the audited immutable LEFT model')
    if output.exists():raise ValueError('Repaired model output must be new')
    model=o.Model(str(source));changes=[]
    for body in model.getBodySet():
        for i in range(body.getPropertyByName('attached_geometry').size()):
            mesh=o.Mesh.safeDownCast(body.get_attached_geometry(i))
            if mesh is None:continue
            before=[mesh.get_scale_factors().get(j) for j in range(3)]
            if before!=[1.,1.,1.]:raise ValueError('Unexpected preexisting mesh scale')
            mesh.set_scale_factors(o.Vec3(1,-1,1));changes.append({'kind':'native_mesh_scale','body':body.getName(),'mesh':mesh.get_mesh_file(),'before':before,'after':[1,-1,1]})
    ground=model.getGround()
    for i in range(ground.getPropertyByName('attached_geometry').size()):
        mesh=o.Mesh.safeDownCast(ground.get_attached_geometry(i))
        if mesh is not None and mesh.get_mesh_file()=='thorax_GlobalX180.vtp':
            mesh.set_mesh_file('thorax.vtp');mesh.set_scale_factors(o.Vec3(1,1,-1));changes.append({'kind':'ground_mesh','before':'thorax_GlobalX180.vtp','after':'thorax.vtp','scale':[1,1,-1]})
    moving=[]
    for muscle in model.getMuscles():
        for point in muscle.getGeometryPath().getPathPointSet():
            mp=o.MovingPathPoint.safeDownCast(point)
            if mp is None:continue
            if mp.getName() not in ('APL-P6','FPL-P5'):raise ValueError('Unexpected moving point')
            function=o.SimmSpline.safeDownCast(mp.upd_y_location())
            if function is None:raise ValueError('Unexpected moving-point function')
            before=[function.getY(i) for i in range(function.getNumberOfPoints())]
            for i in range(function.getNumberOfPoints()):function.setY(i,-function.getY(i))
            moving.append(mp.getName());changes.append({'kind':'moving_path_y_reflection','muscle':muscle.getName(),'point':mp.getName(),'before':before,'after':[-v for v in before]})
    if sorted(moving)!=['APL-P6','FPL-P5']:raise ValueError('Unexpected moving-point inventory')
    wrap_count=0
    for body in model.getBodySet():
        for wrap in body.getWrapObjectSet():
            if wrap.getName() not in QUADRANTS:continue
            source_quadrant=QUADRANTS[wrap.getName()];target={'y':'-y','-y':'y'}.get(source_quadrant,source_quadrant);before=wrap.get_quadrant();wrap.set_quadrant(target);wrap_count+=1
            changes.append({'kind':'wrap_quadrant_reflection','body':body.getName(),'wrap':wrap.getName(),'before':before,'rightTemplateQuadrant':source_quadrant,'after':target})
    if wrap_count!=len(QUADRANTS):raise ValueError('Unexpected wrapping inventory')
    model.setName('ARMS43_left_repaired_v1');model.finalizeConnections();model.initSystem();output.parent.mkdir(parents=True,exist_ok=True);model.printToXML(str(output))
    record={'repairId':'arms-left-native-repair-v1','sourceModelHash':SOURCE_HASH,'repairedModelHash':sha(output),'repairScriptHash':sha(__file__),'changes':changes,'ruleSource':'User tendon_control server/left_adapter.py, arms-left-landmarks-1','scope':'Native geometry/moving-point/wrap-quadrant mirror consistency repair. No parameter fitting, no attachment-coordinate changes, no ROM edits; separate FDPI path-domain repair is not applied.','sourceXMLUnchanged':sha(source)==SOURCE_HASH}
    save(evidence,record);print(json.dumps({'repairId':record['repairId'],'changes':len(changes),'repairedModelHash':record['repairedModelHash']}));return record
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--output',required=True);p.add_argument('--evidence',required=True);a=p.parse_args();repair(a.source,a.output,a.evidence)
