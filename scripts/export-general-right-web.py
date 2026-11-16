import argparse, base64, hashlib, json, math, struct, xml.etree.ElementTree as ET
from pathlib import Path
import opensim as osim

QUANT=1e-5
VISUAL_FILES={
 'ulna':'ulna.vtp','radius':'radius.vtp','lunate':'lunate.vtp','scaphoid':'sdfastSCAPHOIDw.vtp','pisiform':'sdfastPISIFORMw.vtp','triquetrum':'sdfastTRIQUETRALw.vtp',
 'capitate':'capitate.vtp','trapezium':'trapezium.vtp','trapezoid':'trapezoid.vtp','hamate':'hamate.vtp','1mc':'1mc.vtp','thumbprox':'thumbprox.vtp','thumbdist':'thumbdist.vtp',
 '2mc':'secondmc_true_axis.vtp','3mc':'thirdmc_true_axis.vtp','4mc':'4mc_new.vtp','5mc':'fifthmc_true_axis.vtp',
 '2proxph':'2proxph.vtp','2midph':'2midph.vtp','2distph':'2distph.vtp','3proxph':'3proxph.vtp','3midph':'3midph.vtp','3distph':'3distph.vtp',
 '4proxph':'4proxph_new.vtp','4midph':'4midph_new.vtp','4distph':'4distph_new.vtp','5proxph':'5proxph_true_axis.vtp','5midph':'5midph_true_axis.vtp','5distph':'5distph_true_axis.vtp'}
WEB_JOINTS=[
 ('pro_sup','radioulnar','forearm_rotation'),('deviation','radiocarpal','deviation'),('flexion','radiocarpal','flexion'),
 ('cmc_abduction','CMC1b','cmc_abduction'),('cmc_flexion','CMC1a','cmc_flexion'),('mp_flexion','MCP','mp_flexion'),('ip_flexion','IP','ip_flexion')]
for d in range(2,6):
 WEB_JOINTS += [(f'mcp{d}_abduction',f'_{d}MCP',f'{d}mcp_abduction'),(f'mcp{d}_flexion',f'_{d}MCP',f'{d}mcp_flexion'),
  (f'pm{d}_flexion',f'_{d}prox-midph_b',f'{d}pm_flexion'),(f'md{d}_flexion',f'_{d}mid-distph',f'{d}md_flexion')]
COORD_IDS={'forearm_rotation':'forearm_rotation','wrist_flex':'flexion','wrist_abd':'deviation','thumb_CMC_flex':'cmc_flexion','thumb_CMC_abd':'cmc_abduction','thumb_MCP_flex':'mp_flexion','thumb_IP_flex':'ip_flexion','ulnar_CMC_flex':'4cmc_flexion / CMC5_r1'}
for d,f in [(2,'index'),(3,'middle'),(4,'ring'),(5,'pinky')]:
 COORD_IDS.update({f'{f}_MCP_flex':f'{d}mcp_flexion',f'{f}_MCP_abd':f'{d}mcp_abduction',f'{f}_PIP_flex':f'{d}pm_flexion',f'{f}_DIP_flex':f'{d}md_flexion'})
JOINT_NAMES={'joint_forearm_rotation':'radioulnar','joint_bone0':'radiocarpal','joint_bone1':'CMC1a / CMC1b','joint_bone2':'MCP','joint_bone3':'IP','joint_ulnar_cmc':'CMC4 / CMC5'}
for d,base in [(2,6),(3,11),(4,16),(5,21)]:
 JOINT_NAMES.update({f'joint_bone{base}':f'_{d}MCP',f'joint_bone{base+1}':f'_{d}prox-midph_b',f'joint_bone{base+2}':f'_{d}mid-distph'})
LEGACY={'FDS2':'FDSI','FDS3':'FDSM','FDS4':'FDSR','FDS5':'FDSL','FDP2':'FDPI','FDP3':'FDPM','FDP4':'FDPR','FDP5':'FDPL','EDC2':'EDCI','EDC3':'EDCM','EDC4':'EDCR','EDC5':'EDCL',
 'RI2':'1stDI_MC2','RI3':'2ndDI','RI4':'3rdDI','RI5':'4thDI','LU_RB2':'LUMI','LU_RB3':'LUMM','LU_RB4':'LUMR','LU_RB5':'LUML','UI_UB2':'1stPI','UI_UB3':'2ndPI','UI_UB4':'3rdPI','UI_UB5':'ADM','OP':'OPP'}
LEGACY_INDEX={'ECRL':0,'ECRB':1,'ECU':2,'FCR':3,'FCU':4,'PL':5,'FDS5':8,'FDS4':9,'FDS3':10,'FDS2':11,
 'FDP5':12,'FDP4':13,'FDP3':14,'FDP2':15,'EDC5':16,'EDC4':17,'EDC3':18,'EDC2':19,'EDM':20,'EIP':21,
 'EPL':22,'EPB':23,'FPL':24,'APL':25,'OP':26,'RI2':27,'LU_RB2':28,'UI_UB2':29,'RI3':30,'LU_RB3':31,
 'UI_UB3':32,'RI4':33,'LU_RB4':34,'UI_UB4':35,'RI5':36,'LU_RB5':37,'UI_UB5':38}

def v3(v): return [float(v[i]) for i in range(3)]
def display(v): return [-v[1],-v[0],-v[2]]
def enc(values,code): return base64.b64encode(struct.pack('<'+str(len(values))+code,*values)).decode()
def q3(points): return [[round((p[i])/QUANT) for i in range(3)] for p in points]
def js(name,obj): return f'export const {name}=Object.freeze('+json.dumps(obj,separators=(',',':'),ensure_ascii=False)+');\n'
def write(path,text): path.write_bytes(text.encode('utf-8'))

def vtp(path):
 root=ET.parse(path).getroot(); pts=[float(x) for x in root.find('.//Points/DataArray').text.split()]
 conn=[int(x) for x in root.find(".//Polys/DataArray[@Name='connectivity']").text.split()]; offs=[int(x) for x in root.find(".//Polys/DataArray[@Name='offsets']").text.split()]
 faces=[]; start=0
 for end in offs:
  poly=conn[start:end]; start=end
  for i in range(1,len(poly)-1): faces += [poly[0],poly[i],poly[i+1]]
 return [pts[i:i+3] for i in range(0,len(pts),3)],faces

def current_route(muscle,state,origin):
 path=muscle.getGeometryPath().getCurrentPath(state); points=[]
 for i in range(path.getSize()):
  point=path.get(i); wrap=osim.PathWrapPoint.safeDownCast(point)
  if wrap:
   samples=wrap.getWrapPath(state)
   for j in range(samples.getSize()):
    p=v3(point.getParentFrame().findStationLocationInGround(state,samples.get(j))); p=display([p[k]-origin[k] for k in range(3)])
    if not points or math.dist(points[-1],p)>1e-10: points.append(p)
  p=v3(point.getLocationInGround(state)); p=display([p[k]-origin[k] for k in range(3)])
  if not points or math.dist(points[-1],p)>1e-10: points.append(p)
 return points

def main():
 ap=argparse.ArgumentParser(); ap.add_argument('package'); ap.add_argument('repo'); a=ap.parse_args(); package=Path(a.package); repo=Path(a.repo); model_path=package/'General_right_native_REVIEW.osim'
 osim.Logger.setLevelString('error'); model=osim.Model(str(model_path)); state=model.initSystem(); model.realizePosition(state)
 origin=v3(model.getJointSet().get('radiocarpal').getParentFrame().getPositionInGround(state))
 xml=ET.parse(model_path).getroot(); mesh_info={}
 for body in xml.iter('Body'):
  for mesh in body.findall('./attached_geometry/Mesh'):
   file=Path(mesh.findtext('mesh_file')).name; scale=[float(x) for x in mesh.findtext('scale_factors','1 1 1').split()]; mesh_info[file]=(body.attrib['name'],scale)
 bones=[]; world_bounds=[[float('inf')]*3,[float('-inf')]*3]
 for visual,file in VISUAL_FILES.items():
  body_name,scale=mesh_info[file]; raw,faces=vtp(package/'Geometry'/file); body=model.getBodySet().get(body_name); points=[]
  for p in raw:
   ground=v3(body.findStationLocationInGround(state,osim.Vec3(*[p[i]*scale[i] for i in range(3)]))); centered=display([ground[i]-origin[i] for i in range(3)]); points.append(centered)
   for i in range(3): world_bounds[0][i]=min(world_bounds[0][i],ground[i]); world_bounds[1][i]=max(world_bounds[1][i],ground[i])
  qi=[x for p in q3(points) for x in p]
  if max(map(abs,qi))>32767: raise ValueError((visual,max(map(abs,qi))))
  bones.append({'name':visual,'vertex_count':len(points),'vertices_i16':enc(qi,'h'),'face_count':len(faces)//3,'faces_u16':enc(faces,'H')})
 joints=[]
 for index,(web,jname,cname) in enumerate(WEB_JOINTS):
  joint=osim.CustomJoint.safeDownCast(model.getJointSet().get(jname)); frame=joint.getParentFrame(); anchor=display([x-origin[i] for i,x in enumerate(v3(frame.getPositionInGround(state)))])
  transform=joint.getSpatialTransform(); found=None
  for attr in ['get_rotation1','get_rotation2','get_rotation3']:
   ta=getattr(transform,attr)(); coordinate_names=ta.getCoordinateNamesInArray(); names=[str(coordinate_names.get(i)) for i in range(coordinate_names.getSize())]
   if cname in names: found=ta; break
  if found is None: raise ValueError((jname,cname))
  axis=display(v3(frame.expressVectorInGround(state,found.getAxis()))); n=math.sqrt(sum(x*x for x in axis)); axis=[x/n for x in axis]
  c=model.getCoordinateSet().get(cname); joints.append({'index':index,'name':web,'qpos_adr':index,'type':3,'anchor_i16':[round(x/QUANT) for x in anchor],'axis':axis,'range_deg':[c.getRangeMin()*180/math.pi,c.getRangeMax()*180/math.pi]})
 routes={m.getName():current_route(m,state,origin) for m in model.getMuscles()}
 segments=[[] for _ in range(max(LEGACY_INDEX.values())+1)]
 for old,index in LEGACY_INDEX.items():
  pts=q3(routes[LEGACY.get(old,old)]); segments[index]=[pts[i]+pts[i+1] for i in range(len(pts)-1)]
 actuator_names=['' for _ in segments]
 for old,index in LEGACY_INDEX.items(): actuator_names[index]=old
 model_data={'quant':QUANT,'center_world':origin,'bounds_world':world_bounds,'bones':bones,'joints':joints,'actuator_names':actuator_names,'tendon_segments_i16':segments}
 write(repo/'model-data.js','export const MODEL = '+json.dumps(model_data,separators=(',',':'))+';\n')
 write(repo/'general-right-routes.js','export const GENERAL_RIGHT_ROUTES=Object.freeze('+json.dumps(routes,separators=(',',':'))+');\n')
 coords=model.getCoordinateSet(); muscles=model.getMuscles(); ids=[v.split(' / ')[0] for v in COORD_IDS.values()]; moments={}
 for cname in dict.fromkeys(ids):
  c=coords.get(cname); vals={}
  for m in muscles:
   ma=m.computeMomentArm(state,c)*1000
   if abs(ma)>=.01: vals[m.getName()]=round(ma,6)
  moments[cname]=vals
 ranges={}
 labels={'forearm_rotation':('负方向','正方向'),'deviation':('桡偏','尺偏')}
 for control,cdisplay in COORD_IDS.items():
  cname=cdisplay.split(' / ')[0]; c=coords.get(cname); negative,positive=labels.get(cname,('伸展','屈曲'))
  if control!='wrist_abd' and 'abd' in control.lower(): negative,positive=('内收','外展')
  if control=='middle_MCP_abd': negative,positive=('尺偏','桡偏')
  if control in ('ring_MCP_abd','pinky_MCP_abd'): negative,positive=('外展','内收')
  if control=='ulnar_CMC_flex': negative,positive=('伸回中立位','屈曲')
  ranges[control]={'coordinate':cdisplay,'min':c.getRangeMin()*180/math.pi,'max':c.getRangeMax()*180/math.pi,'negativeLabel':negative,'positiveLabel':positive}
 source={'name':model.getName(),'file':model_path.name,'sha256':hashlib.sha256(model_path.read_bytes()).hexdigest(),'muscleCount':muscles.getSize(),'bodyCount':model.getBodySet().getSize(),'jointCount':model.getJointSet().getSize(),'coordinateCount':coords.getSize(),'hand':'right','status':'REVIEW','participantScalingApplied':False}
 bodies={'ulna':'ulna','radius':'radius','lunate':'proximal_row','scaphoid':'proximal_row','pisiform':'proximal_row','triquetrum':'proximal_row','capitate':'capitate','trapezium':'trapezium','trapezoid':'trapezoid','hamate':'hamate','1mc':'firstmc','thumbprox':'proximal_thumb','thumbdist':'distal_thumb','2mc':'secondmc','3mc':'thirdmc','4mc':'fourthmc','5mc':'fifthmc'}
 for d in range(2,6):
  for part in ['proxph','midph','distph']: bodies[f'{d}{part}']=f'{d}{part}'
 out='// Generated from the General_right_native_20261116 REVIEW package.\n'+js('GENERAL_RIGHT_MODEL_SOURCE',source)+js('GENERAL_RIGHT_COORDINATES',ranges)+js('GENERAL_RIGHT_JOINT_NAMES',JOINT_NAMES)+js('GENERAL_RIGHT_MOMENT_ARMS_MM',moments)+js('GENERAL_RIGHT_BODY_FOR_VISUAL_BONE',bodies)
 write(repo/'general-right-model-data.js',out)
 print(json.dumps({'source':source,'origin':origin,'bones':len(bones),'routes':len(routes),'modelBytes':(repo/'model-data.js').stat().st_size},indent=2))
if __name__=='__main__': main()
