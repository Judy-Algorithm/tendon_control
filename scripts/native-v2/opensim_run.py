"""Native full-hand SO exporter. Run with OpenSim 4.4.1, never browser math.

The source model remains local. Public replay contains generated numbers and
the embedded attribution, but not source XML, private paths, or mesh assets.
Scale and IK are explicitly bypassed when coordinates are supplied.
"""
import argparse, hashlib, json, math, os, re, time, traceback
from pathlib import Path
import xml.etree.ElementTree as ET
import numpy as np
import opensim as o

def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
ADAPTER_SHA_AT_IMPORT=sha(__file__)
NUMERICAL_PROTOCOL={
    'id':'full43-so-forcebasis-v2',
    'reserveOptimalForce_Nm':.01,'reserveControlBounds':[-1000,1000],
    'useModelForceSet':True,'useMusclePhysiology':True,'activationExponent':2,
    'convergenceCriterion':1e-8,'maxIterations':1000,'outputPrecision':16,
    'initialStatePolicy':'Native initSystem; exact declared CoordinateCouplerConstraint functions; unspecified independent coordinates retain native defaults.',
    'motionPolicy':'Explicit original angles/time unchanged, or declared quintic native demonstration; native ROM checked; no force/angle clipping.',
    'derivativePolicy':'AnalyzeTool.setStatesFromMotion(storage,inDegrees=False); native GCVSplineSet order5 on generated states; derivative of native speed splines supplies acceleration.',
    'reductionPolicy':'Native coupled-coordinate virtual-work B from central coordinate finite difference epsilon1e-6; per-muscle contribution from native inverse-dynamics force basis.',
    'validation':{'balanceMax_Nm':1e-5,'activeForceReconstructionMax_N':1e-4,'nativeControlBounds':True,'explicitNativeOptimizerFailureRejected':True},
}
def cache_identity(source_hash,request,engine_version):
    payload={'keyVersion':2,'sourceModelHash':source_hash,'request':request,'engineVersion':engine_version,'adapterSHA256':ADAPTER_SHA_AT_IMPORT,'numericalProtocol':NUMERICAL_PROTOCOL,'numpyVersion':np.__version__}
    return hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest(),payload
def arr(v): return np.array([v.get(i) for i in range(v.size())], dtype=float)
def vec(v): return [float(v.get(i)) for i in range(3)]
def transform(t):return [[float(t.R().get(i,j)) for j in range(3)]+[float(t.p().get(i))] for i in range(3)]+[[0,0,0,1]]
def save(path,obj):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    temp=path.with_name(path.name+f'.tmp-{os.getpid()}')
    temp.write_text(json.dumps(obj,ensure_ascii=False,indent=2,allow_nan=False)+'\n');temp.replace(path)
def exact(model,state):
    for raw in model.getConstraintSet():
        con=o.CoordinateCouplerConstraint.safeDownCast(raw)
        if not con: raise ValueError('Unsupported native constraint type')
        names=con.getIndependentCoordinateNames();values=o.Vector(names.getSize(),0.)
        for i in range(names.getSize()):values.set(i,model.getCoordinateSet().get(names.get(i)).getValue(state))
        model.getCoordinateSet().get(con.getDependentCoordinateName()).setValue(state,con.getFunction().calcValue(values),False)
    model.realizePosition(state)
def write_motion(path,times,names,rows):
    text=f'native_coordinate_input\nversion=1\nnRows={len(times)}\nnColumns={len(names)+1}\ninDegrees=no\nendheader\n'
    text+='\t'.join(['time',*names])+'\n'
    text+=''.join('\t'.join(f'{x:.17g}' for x in [t,*row])+'\n' for t,row in zip(times,rows))
    path.write_text(text)
def read_sto(path):
    lines=path.read_text().splitlines();idx=next(i for i,x in enumerate(lines) if x.strip()=='endheader')
    return lines[idx+1].split(),np.loadtxt(lines[idx+2:],ndmin=2)
def finite_number(value,name,lo,hi):
    value=float(value)
    if not math.isfinite(value) or not lo<=value<=hi:raise ValueError(f'{name} outside supported range [{lo},{hi}]')
    return value
def xml_value(node):
    children=list(node)
    if not children:return {'type':node.tag,'value':(node.text or '').strip(),**node.attrib}
    return {'type':node.tag,**node.attrib,'children':[xml_value(c) for c in children]}
def native_properties(obj):
    rows=[]
    for i in range(obj.getNumProperties()):
        prop=obj.getPropertyByIndex(i)
        rows.append({'name':prop.getName(),'nativeValue':prop.toString(),'capability':'只读','reason':'当前重算接口不修改此字段；数值来自已加载原生对象（包括原生默认值）'})
    return rows
def inspector(model,source):
    state=model.initSystem();exact(model,state)
    coordinates=[{'id':c.getName(),'min':c.getRangeMin(),'max':c.getRangeMax(),'default':c.getValue(state),'unit':'rad','constrained':bool(c.isConstrained(state))} for c in model.getCoordinateSet()]
    muscles=[]
    for m in model.getMuscles():
        muscles.append({'id':m.getName(),'class':m.getConcreteClassName(),'max_isometric_force':m.getMaxIsometricForce(),'optimal_fiber_length':m.getOptimalFiberLength(),'tendon_slack_length':m.getTendonSlackLength(),'pennation_angle_at_optimal':m.getPennationAngleAtOptimalFiberLength(),'activationBounds':[m.getMinControl(),m.getMaxControl()]})
    xml=ET.fromstring(source.read_text());publication=xml.find('.//publications')
    wraps=[];mesh_entries=[];properties=[]
    for body in model.getBodySet():
        for w in body.getWrapObjectSet():
            rec={'id':w.getName(),'body':body.getName(),'class':w.getConcreteClassName(),'localTransform':transform(w.getTransform())}
            concrete=getattr(o,w.getConcreteClassName()).safeDownCast(w)
            for key in ['radius','length','dimensions','quadrant','active']:
                getter=getattr(concrete,'get_'+key,None)
                if getter:
                    value=getter();rec[key]=vec(value) if hasattr(value,'get') else value
            wraps.append(rec)
    for body in xml.findall('.//BodySet/objects/Body'):
        for mesh in body.findall('.//Mesh'):
            mesh_entries.append({'body':body.get('name'),'file':mesh.findtext('mesh_file'),'scaleFactors':[float(x) for x in mesh.findtext('scale_factors','1 1 1').split()]})
    for node in xml.findall('.//ForceSet/objects/*'):
        if node.tag.endswith('Muscle'):
            for child in node:
                if not list(child) and child.text:
                    properties.append({'muscle':node.get('name'),'field':child.tag,'value':child.text.strip(),'capability':'可调并重算' if child.tag in ['max_isometric_force','optimal_fiber_length','tendon_slack_length'] else '此流程不使用' if child.tag in ['activation_time_constant','deactivation_time_constant','ignore_activation_dynamics'] else '只读'})
    bodies=[{'id':b.getName(),'mass_kg':b.getMass(),'massCenter_m':vec(b.getMassCenter()),'inertiaMoments_kg_m2':vec(b.getInertia().getMoments()),'inertiaProducts_kg_m2':vec(b.getInertia().getProducts()),'nativeProperties':native_properties(b),'capability':'只读'} for b in model.getBodySet()]
    joints=[{'id':j.getName(),'class':j.getConcreteClassName(),'parent':j.getParentFrame().findBaseFrame().getName(),'child':j.getChildFrame().findBaseFrame().getName(),'parentFrameDefaultWorldTransform':transform(j.getParentFrame().getTransformInGround(state)),'childFrameDefaultWorldTransform':transform(j.getChildFrame().getTransformInGround(state)),'nativeProperties':native_properties(j),'capability':'只读'} for j in model.getJointSet()]
    constraints=[{'id':c.getName(),'class':c.getConcreteClassName(),'definition':xml_value(ET.fromstring(c.dump())),'nativeProperties':native_properties(c),'capability':'只读','reason':'原生耦合关系保留；不得独立改被耦合坐标'} for c in model.getConstraintSet()]
    solver=o.StaticOptimization()
    registry={'source':'Loaded native OpenSim Object property API; default states are not runtime trajectory states. Nested object native strings may be summaries, not recursive complete engine configuration.','modelProperties':native_properties(model),'coordinateProperties':[{'id':c.getName(),'motionType':int(c.getMotionType()),'nativeProperties':native_properties(c)} for c in model.getCoordinateSet()],'muscleNativeProperties':[{'id':m.getName(),'nativeProperties':native_properties(m)} for m in model.getMuscles()],'staticOptimizationDefaults':native_properties(solver),'effectiveRunSettings':'Each run manifest.effective contains the actual optimizer settings, reserve policy, load and muscle parameters. Defaults here are not claims about the active run.','sourceLinks':['https://github.com/opensim-org/opensim-core/tree/4.4/OpenSim/Simulation','https://github.com/opensim-org/opensim-core/blob/4.4/OpenSim/Analyses/StaticOptimization.cpp']}
    canonical='left_repaired_v1' in xml.find('Model').get('name','')
    return {'modelId':'opensim-arms-left-repaired-v1-full43' if canonical else 'opensim-arms-left-full43','modelHash':sha(source),'canonicalMirrorRepair':'arms-left-native-repair-v1' if canonical else None,'engineVersion':o.GetVersionAndDate(),'counts':{'muscles':len(muscles),'coordinates':len(coordinates),'independentCoordinates':sum(not c['constrained'] for c in coordinates),'bodies':model.getBodySet().getSize()},'coordinates':coordinates,'muscles':muscles,'bodyNames':[b.getName() for b in model.getBodySet()],'bodyConnections':[{'joint':j.getName(),'parent':j.getParentFrame().findBaseFrame().getName(),'child':j.getChildFrame().findBaseFrame().getName()} for j in model.getJointSet()],'bodies':bodies,'joints':joints,'constraints':constraints,'configurationRegistry':registry,'wrapObjects':wraps,'meshEntries':mesh_entries,'muscleProperties':properties,'licenseAttribution':publication.text if publication is not None else 'Unresolved: source model required locally.','parameterCapabilities':{'max_isometric_force':'可调并重算','optimal_fiber_length':'可调并重算','tendon_slack_length':'可调并重算','activation_time_constant':'此流程不使用','geometry':'只读','muscle_class':'只读'},'scope':'Native body/inertia/joint/constraint/coordinate/muscle properties plus solver defaults are enumerated. Nested object native strings can be summaries; this is not a claim to every inherited internal engine state. Effective run settings are in the selected run manifest.','sourceOrigin':'User-supplied derivative of ARMS hand/wrist template; source XML stays local; referenced ARMS geometry is separately redistributed with original non-commercial notice.','sourceUrl':'https://simtk.org/projects/arms_hand_model'}

def run(model_path,request_path,output,public_output=None):
    started=time.perf_counter();source=Path(model_path).resolve();request=json.loads(Path(request_path).read_text());out=Path(output).resolve()
    if out.exists() and any(out.iterdir()):raise ValueError('Output must be a new or empty directory; prior runs are immutable')
    out.mkdir(parents=True,exist_ok=True);save(out/'request.json',request)
    model=o.Model(str(source));model.setName('ARMS43_native_runtime');initial=model.initSystem();exact(model,initial)
    info=inspector(model,source);coordinate_names=[x['id'] for x in info['coordinates']];ind_names=[x['id'] for x in info['coordinates'] if not x['constrained']]
    muscle_names=[m.getName() for m in model.getMuscles()]
    if len(muscle_names)!=43:raise ValueError('This adapter requires the audited full 43-muscle hand')
    p=request.get('parameters',{});allowed={'fmaxMultiplier','optimalFiberLengthMultiplier','tendonSlackLengthMultiplier','muscles'}
    if set(p)-allowed:raise ValueError('Unknown parameter field')
    scales={key:finite_number(p.get(key,1),key,.8,1.2) for key in allowed if key!='muscles'}
    fields={'max_isometric_force':('getMaxIsometricForce','setMaxIsometricForce','fmaxMultiplier'), 'optimal_fiber_length':('getOptimalFiberLength','setOptimalFiberLength','optimalFiberLengthMultiplier'),'tendon_slack_length':('getTendonSlackLength','setTendonSlackLength','tendonSlackLengthMultiplier')}
    for name in p.get('muscles',{}):
        if name not in muscle_names:raise ValueError('Unknown muscle '+name)
    effective=[]
    for m in model.getMuscles():
        edits=p.get('muscles',{}).get(m.getName(),{})
        if set(edits)-set(fields):raise ValueError('Unsupported per-muscle parameter')
        values={'id':m.getName()}
        for field,(getter,setter,scale) in fields.items():
            baseline=float(getattr(m,getter)());value=finite_number(edits.get(field,baseline*scales[scale]),field,.8*baseline,1.2*baseline)
            getattr(m,setter)(value);values[field]=value
        effective.append(values)
    for name in ind_names:
        reserve=o.CoordinateActuator(name);reserve.setName('reserve_'+name);reserve.setOptimalForce(.01);reserve.setMinControl(-1000);reserve.setMaxControl(1000);model.addForce(reserve)
    load=finite_number(request.get('loadN',0),'loadN',0,20)
    if load:
        body=model.getBodySet().get('2distph');force=o.PrescribedForce('declared_index_external',body)
        force.setPointFunctions(o.Constant(0),o.Constant(-.012),o.Constant(0));force.setForceFunctions(o.Constant(0),o.Constant(0),o.Constant(load))
        force.setForceIsInGlobalFrame(True);force.setPointIsInGlobalFrame(False);model.addForce(force)
    model.finalizeConnections();s=model.initSystem();exact(model,s);coords=list(model.getCoordinateSet());ind=[model.getCoordinateSet().get(n) for n in ind_names]
    q0=np.array([c.getValue(s) for c in coords]);trajectory=request.get('trajectory')
    if trajectory:
        times=np.asarray(trajectory['times_s'],float);input_names=trajectory['coordinateNames'];values=np.asarray(trajectory['q'],float)
        if len(times)<7 or len(times)>501 or values.shape!=(len(times),len(input_names)) or len(set(input_names))!=len(input_names) or not set(input_names)<=set(ind_names):raise ValueError('Invalid explicit trajectory dimensions or dependent coordinate assignment')
        if not np.isfinite(times).all() or not np.isfinite(values).all() or times[0]!=0 or not (np.diff(times)>0).all() or times[-1]>10:raise ValueError('Invalid explicit timebase')
        motion_origin='explicit_input_trajectory';qrows=np.repeat(q0[None],len(times),axis=0)
        for j,name in enumerate(input_names):qrows[:,coordinate_names.index(name)]=values[:,j]
    else:
        duration=finite_number(request.get('duration_s',2),'duration_s',.5,5);samples=int(request.get('samples',51))
        if not 7<=samples<=201:raise ValueError('samples outside supported [7,201]')
        times=np.linspace(0,duration,samples);qrows=np.repeat(q0[None],samples,axis=0);name=request.get('coordinate','2mcp_flexion')
        if name not in ind_names:raise ValueError('Coordinate unavailable or coupled; cannot independently prescribe '+name)
        coord=model.getCoordinateSet().get(name);target=finite_number(request.get('targetRad',.25),'targetRad',coord.getRangeMin(),coord.getRangeMax())
        h=times/duration;wave=10*h**3-15*h**4+6*h**5;idx=coordinate_names.index(name);qrows[:,idx]=q0[idx]+wave*(target-q0[idx]);motion_origin='smooth_native_demonstration_not_original_atlas_clip'
    for k,row in enumerate(qrows):
        for c,value in zip(coords,row):
            if c.getName() in ind_names and not c.getRangeMin()-1e-7<=value<=c.getRangeMax()+1e-7:raise ValueError('Requested trajectory violates native coordinate range: '+c.getName())
            c.setValue(s,float(value),False)
        exact(model,s);qrows[k]=[c.getValue(s) for c in coords]
    # Validate native initialization/lengths without changing requested parameters.
    model.realizeVelocity(s)
    for m in model.getMuscles():
        if not math.isfinite(m.getLength(s)) or m.getLength(s)<=0:raise ValueError('Invalid path length '+m.getName())
    motion=out/'input.mot';write_motion(motion,times,coordinate_names,qrows)
    analysis=o.StaticOptimization();analysis.setName('official_so');analysis.setStartTime(0);analysis.setEndTime(float(times[-1]));analysis.setUseModelForceSet(True);analysis.setUseMusclePhysiology(True);analysis.setActivationExponent(2);analysis.setConvergenceCriterion(1e-8);analysis.setMaxIterations(1000)
    model.addAnalysis(analysis);model.finalizeConnections();s=model.initSystem();exact(model,s);model.printToXML(str(out/'runtime_model.osim'))
    tool=o.AnalyzeTool();tool.setName('fullhand');tool.setModel(model);tool.setToolOwnsModel(False);tool.setInitialTime(0);tool.setFinalTime(float(times[-1]));tool.setResultsDir(str(out));tool.setOutputPrecision(16);tool.setStatesFromMotion(s,o.Storage(str(motion)),False)
    states=tool.getStatesStorage();o.Storage.printResult(states,'actual_states',str(out),-1,'.sto');splines=o.GCVSplineSet(5,states);statecols,statevals=read_sto(out/'actual_states.sto')
    qcols=[];ucols=[];speed_splines=[]
    for c in coords:
        names=c.getStateVariableNames();iq=states.getStateIndex(names.get(0),0);iu=states.getStateIndex(names.get(1),0)
        if iq<0:iq=states.getStateIndex(c.getName()+'/value',0)
        if iu<0:iu=states.getStateIndex(c.getSpeedName(),0)
        if min(iq,iu)<0:raise ValueError('Native state mapping missing')
        qcols.append(iq+1);ucols.append(iu+1);speed_splines.append(splines.get(iu))
    o.Logger.addFileSink(str(out/'official_so.log'));tic=time.perf_counter()
    try:tool_return=bool(tool.run())
    finally:o.Logger.removeFileSink()
    so_s=time.perf_counter()-tic;actcols,actrows=read_sto(out/'fullhand_official_so_activation.sto');forcecols,forcerows=read_sto(out/'fullhand_official_so_force.sto')
    log=(out/'official_so.log').read_text();failure_times=[float(v.rstrip('.')) for v in re.findall(r'could not find a solution at time = ([0-9.eE+-]+)',log)]
    reported_violation=[float(v) for v in re.findall(r'Constraint violation = ([0-9.eE+-]+)',log)]
    s=model.initSystem();coords=list(model.getCoordinateSet());ind=[model.getCoordinateSet().get(n) for n in ind_names];acts=[o.ScalarActuator.safeDownCast(a) for a in model.getActuators()]
    for a in acts:a.overrideActuation(s,True)
    derivative=o.StdVectorInt();derivative.append(0);ids=o.InverseDynamicsSolver(model);frames=[];maxbalance=0;maxforce=0;exporttic=time.perf_counter()
    for row,frow in zip(actrows,forcerows):
        tt=float(row[0]);k=int(np.argmin(abs(statevals[:,0]-tt)))
        if abs(statevals[k,0]-tt)>1e-7:raise ValueError('Official state/output time mismatch')
        for c,value in zip(coords,statevals[k,qcols]):c.setValue(s,float(value),False)
        for c,value in zip(coords,statevals[k,ucols]):c.setSpeedValue(s,float(value))
        s.setTime(tt);model.realizeVelocity(s);target=o.State(s)
        for c,func in zip(coords,speed_splines):c.setSpeedValue(target,func.calcDerivative(derivative,o.Vector(1,tt)))
        udot=o.Vector(target.getU());B=[]
        for c in ind:
            sp=o.State(s);sm=o.State(s);eps=1e-6;c.setValue(sp,c.getValue(s)+eps,False);c.setValue(sm,c.getValue(s)-eps,False);exact(model,sp);exact(model,sm);st=o.State(s)
            for cc in coords:cc.setSpeedValue(st,(cc.getValue(sp)-cc.getValue(sm))/(2*eps))
            B.append(arr(st.getU()))
        B=np.array(B).T
        def residual(force_values):
            for a,value in zip(acts,force_values):a.setOverrideActuation(s,float(value))
            model.realizeAcceleration(s);return B.T@arr(ids.solve(s,udot))
        zero=np.zeros(len(acts));required=residual(zero);muscle_forces=np.array([frow[forcecols.index(name)] for name in muscle_names]);activation=np.array([row[actcols.index(name)] for name in muscle_names]);reserve=np.array([row[actcols.index('reserve_'+name)]*.01 for name in ind_names]);force_values=np.r_[muscle_forces,reserve]
        # Force basis identifies exact native coupled-coordinate torque mapping.
        contributions=[]
        for j in range(43):
            e=zero.copy();e[j]=muscle_forces[j];contributions.append(required-residual(e))
        contributions=np.array(contributions);balance=residual(force_values);muscle_total=contributions.sum(axis=0);reserve_effect=required-residual(np.r_[np.zeros(43),reserve]);maxbalance=max(maxbalance,float(abs(balance).max()))
        model.realizeVelocity(s);paths=[];lengths=[];capacities=[];body_positions={};active_wrap_names=set();path_errors=[]
        for m in model.getMuscles():
            path=m.getGeometryPath().getCurrentPath(s);points=[]
            for i in range(path.getSize()):
                point=path.get(i);wrap_point=o.PathWrapPoint.safeDownCast(point)
                if wrap_point:
                    active_wrap_names.add(wrap_point.getWrapObject().getName());samples=wrap_point.getWrapPath(s)
                    for j in range(samples.getSize()):
                        world=vec(point.getParentFrame().findStationLocationInGround(s,samples.get(j)))
                        if not points or np.linalg.norm(np.array(points[-1])-world)>1e-10:points.append(world)
                world=vec(point.getParentFrame().findStationLocationInGround(s,point.getLocation(s)))
                if not points or np.linalg.norm(np.array(points[-1])-world)>1e-10:points.append(world)
            paths.append(points);length=m.getLength(s);lengths.append(length);capacities.append(m.calcInextensibleTendonActiveFiberForce(s,1.))
            path_errors.append(abs(float(np.linalg.norm(np.diff(np.array(points),axis=0),axis=1).sum())-length))
        body_transforms={}
        for b in model.getBodySet():body_positions[b.getName()]=vec(b.getPositionInGround(s));body_transforms[b.getName()]=transform(b.getTransformInGround(s))
        force_error=float(abs(activation*np.array(capacities)-muscle_forces).max());maxforce=max(maxforce,force_error)
        failed=any(abs(tt-t)<1e-7 for t in failure_times)
        lower=np.array([m.getMinControl() for m in model.getMuscles()]);upper=np.array([m.getMaxControl() for m in model.getMuscles()])
        bounded=bool(np.isfinite(activation).all() and (activation>=lower-1e-6).all() and (activation<=upper+1e-6).all())
        reserve_bounded=bool(np.isfinite(reserve).all() and (abs(reserve)<=10+1e-6).all())
        valid=bool(tool_return and not failed and bounded and reserve_bounded and abs(balance).max()<1e-5 and force_error<1e-4)
        frames.append({'time_s':tt,'q':[c.getValue(s) for c in ind],'activation':activation.tolist(),'force_N':muscle_forces.tolist(),'paths':paths,'pathLength_m':lengths,'pathPolylineApproximationError_m':path_errors,'activeWrapNames':sorted(active_wrap_names),'torque_Nm':contributions.tolist(),'qfrcActuator_Nm':muscle_total.tolist(),'requiredTorque_Nm':required.tolist(),'reserveTorque_Nm':reserve_effect.tolist(),'reserveControls':(reserve/.01).tolist(),'balanceResidual_Nm':balance.tolist(),'bodyPositions_m':body_positions,'bodyTransforms':body_transforms,'qAll':[c.getValue(s) for c in coords],'valid':valid,'nativeSolverFailed':failed,'forceReconstructionMaxAbs_N':force_error})
    valid_count=sum(f['valid'] for f in frames);status='solved' if valid_count==len(frames) else 'partial' if valid_count else 'failed';fingerprint,cache_payload=cache_identity(sha(source),request,o.GetVersionAndDate())
    result={'schemaVersion':2,'muscleNames':muscle_names,'coordinateNames':ind_names,'allCoordinateNames':coordinate_names,'manifest':{'runId':request.get('runId',fingerprint[:16]),'engine':'OpenSim','engineVersion':o.GetVersionAndDate(),'modelId':info['modelId'],'modelHash':sha(source),'runtimeModelHash':sha(out/'runtime_model.osim'),'request':request,'effective':{'muscles':effective,'gravity_m_s2':vec(model.getGravity()),'reserveOptimalForce_Nm':.01,'reserveControlBounds':[-1000,1000],'reserveTorqueBounds_Nm':[-10,10],'loadN':load,'loadPointBody_m':[0,-.012,0],'loadBody':'2distph','loadVectorGround_N':[0,0,load],'useMusclePhysiology':True,'activationExponent':2,'convergenceCriterion':1e-8,'maxIterations':1000},'status':status,'qc':{'nativeToolReturn':tool_return,'frames':len(frames),'acceptedFrames':valid_count,'failedTimes_s':failure_times,'maxBalanceResidual_Nm':maxbalance,'maxForceReconstruction_N':maxforce,'reserveRule':'No project5percent gate imposed; absolute native reserve is always reported.'},'units':{'q':'rad','activation':'dimensionless','force_N':'N','torque_Nm':'N m','paths':'m','time_s':'s'},'stages':{'scale':'BYPASSED: selected local native model geometry unchanged','ik':'BYPASSED: native joint coordinates supplied','id':'Native InverseDynamicsSolver on official SO state derivatives; reduced virtual-work coordinates','so':'Native AnalyzeTool StaticOptimization, all43muscles jointly'},'motionOrigin':motion_origin,'computationMode':'native-replay','timing_s':{'officialSO':so_s,'nativeExportAndBalance':time.perf_counter()-exporttic,'total':time.perf_counter()-started},'cacheKey':fingerprint,'licenseAttribution':info['licenseAttribution'],'limitations':['User-supplied ARMS derivative; no personal physiological identification.','Body origins and actual native paths are exported; original mesh assets are not included.','Generated-coordinate input bypasses Scale and IK.','Reserve size is visible; convergence does not imply physiologically acceptable reserve.','These SO forces are native active inextensible-tendon forces, not excitation-driven forward replay.']},'frames':frames}
    result['manifest']['cacheKeyVersion']=2;result['manifest']['cacheIdentity']=cache_payload
    result['manifest']['qc']['nativeReportedAccelerationConstraintViolation']=reported_violation
    result['manifest']['qc']['interpretation']='valid means native output present, no explicit native failure, activation bounds and reduced Nm/force reconstruction checks; not zero native acceleration-constraint norm or physiological reserve acceptance.'
    result['manifest']['qc']['maxNativePathPolylineApproximationError_m']=max(max(f['pathPolylineApproximationError_m']) for f in frames)
    result['manifest']['limitations'].append('Native wrapping samples are exported; rendered polylines approximate curved path length, with measured approximation error.')
    save(out/'run.json',result);save(out/'inspector.json',info)
    if public_output:save(public_output,result)
    print(json.dumps({'status':status,'frames':len(frames),'accepted':valid_count,'SO_s':so_s,'balance':maxbalance,'output':str(out/'run.json')}),flush=True)
    return result

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--model',required=True);parser.add_argument('--request',required=True);parser.add_argument('--output',required=True);parser.add_argument('--public-output');args=parser.parse_args()
    prior_output=Path(args.output);prior_nonempty=prior_output.exists() and any(prior_output.iterdir())
    try:run(args.model,args.request,args.output,args.public_output)
    except Exception as error:
        failure={'status':'failed','errorType':type(error).__name__,'message':str(error),'traceback':traceback.format_exc()}
        # Private debug artifact retains native diagnostics. No failed request is retried with easier inputs.
        destination=Path(args.output);destination.mkdir(parents=True,exist_ok=True)
        if not prior_nonempty and not (destination/'failure.json').exists():save(destination/'failure.json',failure)
        raise
