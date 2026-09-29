"""Pinned native MyoHand full-channel runner, model export and parameter audit.

Use a Python environment with MyoSuite 2.11.6, MuJoCo 3.3.0 and SciPy.
CLI: python myohand_runner.py --request request.json --output run.json
     python myohand_runner.py --export-model model.json
No arbitrary model path or Python expression is accepted in a request.
"""
from pathlib import Path
import argparse
import copy
import datetime
import hashlib
import importlib.metadata
import json
import math
import time
import numpy as np
import scipy.optimize
import gymnasium as gym
import mujoco as mj
import myosuite

ENV = 'myoHandPoseFixed-v0'
MODEL_ID = 'myohand-posefixed-v2-2.11.6-mj3.3.0'
SOURCE_FILES = ['envs/myo/base_v0.py', 'envs/myo/myobase/__init__.py',
 'envs/myo/myobase/pose_v0.py', 'envs/myo/assets/hand/myohand_pose.xml',
 'simhive/myo_sim/hand/assets/myohand_assets.xml', 'simhive/myo_sim/hand/assets/myohand_body.xml',
 'simhive/myo_sim/scene/myosuite_scene.xml']
CTRL_MIN = 1/(1+math.exp(7.5))
CTRL_MAX = 1/(1+math.exp(-2.5))

def sha(data): return hashlib.sha256(data).hexdigest()
def canonical(x): return json.dumps(x, sort_keys=True, separators=(',', ':'), allow_nan=False)
def values(x, decimals=None):
    a = np.asarray(x)
    return np.round(a, decimals).tolist() if decimals is not None else a.tolist()
def write(path, data):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(canonical(data)+'\n')
def names(m, typ, n): return [mj.mj_id2name(m, typ, i) or f'unnamed_{i}' for i in range(n)]
def moment(m, d):
    result = np.zeros((m.nu, m.nv)); raw = np.asarray(d.actuator_moment)
    if raw.shape == result.shape: return raw.copy()
    mj.mju_sparse2dense(result, raw.ravel(), d.moment_rownnz, d.moment_rowadr, d.moment_colind)
    return result
def new_env():
    if mj.__version__ != '3.3.0' or importlib.metadata.version('myosuite') != '2.11.6':
        raise RuntimeError('This adapter requires audited MyoSuite 2.11.6 / MuJoCo 3.3.0')
    env = gym.make(ENV); env.reset(seed=11)
    m = env.unwrapped.sim.model.ptr
    assert (m.nq, m.nv, m.nu, m.na) == (23, 23, 39, 39)
    return env, m, copy.deepcopy(env.unwrapped.sim.data.ptr)
def provenance():
    root = Path(myosuite.__file__).parent
    files = {f:sha((root/f).read_bytes()) for f in SOURCE_FILES}
    return {'sourceFiles':files, 'modelHash':sha(canonical(files).encode()),
      'myosuiteCommit':'05cb84678373f91271004f99602ebbf01e57d1a1',
      'myoSimCommit':'33f3ded946f55adbdcf963c99999587aadaf975f',
      'engine':'MuJoCo', 'engineVersion':mj.__version__, 'myosuiteVersion':'2.11.6',
      'environment':ENV, 'modelId':MODEL_ID,
      'sources':['https://github.com/MyoHub/myo_sim/tree/33f3ded946f55adbdcf963c99999587aadaf975f/hand',
       'https://github.com/google-deepmind/mujoco/blob/3.3.0/src/engine/engine_core_smooth.c#L595-L789',
       'https://mujoco.readthedocs.io/en/3.3.0/modeling.html#muscles'],
      'license':'Apache-2.0; existing LICENSE-MYOSUITE and THIRD_PARTY_NOTICES.md',
      'generatorSha256':sha(Path(__file__).read_bytes())}

def expanded_paths(m, d):
    """Native tangent endpoints, with actual sphere/cylinder arcs densified.

    Python wraps packed C arrays as (nwrap,6)/(nwrap,2). Addresses count POINTS,
    so flatten before applying ten_wrapadr, not rows. Analytic arc lengths are
    checked against native ten_length; polyline arc discretization is separate.
    """
    positions = d.wrap_xpos.reshape(-1, 3); objects = d.wrap_obj.ravel()
    all_paths=[]; raw_paths=[]; wrap_ids=[]; max_exact=0.; max_poly=0.
    for ai in range(m.nu):
        ti=int(m.actuator_trnid[ai,0]); start=int(d.ten_wrapadr[ti]); count=int(d.ten_wrapnum[ti])
        pts=positions[start:start+count]; objs=objects[start:start+count]
        expanded=[pts[0].copy()]; length=0.; active=[]
        for i in range(1,len(pts)):
            p0,p1=pts[i-1],pts[i]; gid=int(objs[i])
            if gid>=0 and objs[i-1]==gid:
                rot=d.geom_xmat[gid].reshape(3,3); center=d.geom_xpos[gid]
                a=rot.T@(p0-center); b=rot.T@(p1-center); r=float(m.geom_size[gid,0])
                if m.geom_type[gid]==int(mj.mjtGeom.mjGEOM_SPHERE):
                    u=a/np.linalg.norm(a); v=b/np.linalg.norm(b)
                    angle=math.acos(float(np.clip(u@v,-1,1))); length+=r*angle
                    n=max(2,int(math.ceil(angle/.035)))
                    if angle<1e-10: arc=np.linspace(a,b,n+1)[1:]
                    else: arc=np.array([r*(math.sin((1-s)*angle)*u+math.sin(s*angle)*v)/math.sin(angle) for s in np.linspace(0,1,n+1)[1:]])
                elif m.geom_type[gid]==int(mj.mjtGeom.mjGEOM_CYLINDER):
                    t0=math.atan2(a[1],a[0]); t1=math.atan2(b[1],b[0]); delta=(t1-t0+math.pi)%(2*math.pi)-math.pi
                    length+=math.hypot(r*delta,float(b[2]-a[2])); n=max(2,int(math.ceil(abs(delta)/.035)))
                    arc=np.array([[r*math.cos(t0+s*delta),r*math.sin(t0+s*delta),a[2]+s*(b[2]-a[2])] for s in np.linspace(0,1,n+1)[1:]])
                else: raise RuntimeError('Unsupported native wrap geometry')
                expanded.extend(center+arc@rot.T); active.append(gid)
            else:
                length+=float(np.linalg.norm(p1-p0)); expanded.append(p1.copy())
        expanded=np.asarray(expanded)
        poly=float(np.linalg.norm(np.diff(expanded,axis=0),axis=1).sum())
        max_exact=max(max_exact,abs(length-float(d.ten_length[ti])))
        max_poly=max(max_poly,abs(poly-float(d.ten_length[ti])))
        all_paths.append(values(expanded,8)); raw_paths.append(values(pts,8)); wrap_ids.append(sorted(set(active)))
    return all_paths,raw_paths,wrap_ids,max_exact,max_poly

def validate_request(request,m):
    allowed={'schemaVersion','modelId','mode','muscle','coordinate','amplitude_rad','duration_s','pulseRaw','pulseStart_s','pulseEnd_s',
      'forceScale','activationTimeScale','muscleForceScales','muscleActivationTimeScales','initialActivation','sampleInterval_s',
      'kp','kd','controllerMetric','actionId','targetTrajectory','initialQ','initialQvel'}
    extra=set(request)-allowed
    if extra: raise ValueError('Unknown request fields: '+','.join(sorted(extra)))
    muscles=names(m,mj.mjtObj.mjOBJ_ACTUATOR,m.nu); coordinates=names(m,mj.mjtObj.mjOBJ_JOINT,m.njnt)
    r={'schemaVersion':1,'modelId':MODEL_ID,'mode':'pulse','muscle':'FDS2','coordinate':'mcp2_flexion','amplitude_rad':.4,
      'duration_s':.4,'pulseRaw':.5,'pulseStart_s':.04,'pulseEnd_s':.14,'forceScale':1.,'activationTimeScale':1.,
      'muscleForceScales':{},'muscleActivationTimeScales':{},'initialActivation':0.,'sampleInterval_s':.01,
      'kp':100.,'kd':20.,'controllerMetric':'torque','actionId':'native:FDS2:pulse'}
    r.update(request)
    if 'actionId' not in request:r['actionId']=f"native:{r['muscle']}:pulse" if r['mode']=='pulse' else f"native:{r['coordinate']}:demo"
    if r['schemaVersion']!=1 or r['modelId']!=MODEL_ID: raise ValueError('Incompatible request schema/model')
    if r['mode'] not in ('pulse','tracking'): raise ValueError('mode must be pulse or tracking')
    if r['muscle'] not in muscles or r['coordinate'] not in coordinates: raise ValueError('Unknown native channel/coordinate')
    for k,lo,hi in [('forceScale',.5,1.5),('activationTimeScale',.5,2.),('initialActivation',0.,1.),('duration_s',.1,5.),
        ('sampleInterval_s',.002,.1),('pulseRaw',-1.,1.),('kp',1.,1000.),('kd',1.,100.)]:
        if type(r[k]) not in (float,int) or not math.isfinite(r[k]) or not lo<=r[k]<=hi: raise ValueError('Out-of-range '+k)
    if r['controllerMetric'] not in ('torque','acceleration','diagonal'):raise ValueError('Unknown controllerMetric')
    for k in ('duration_s','sampleInterval_s'):
        if abs(r[k]/m.opt.timestep-round(r[k]/m.opt.timestep))>1e-6: raise ValueError(k+' must be a 2ms multiple')
    if any(type(r[k]) not in (int,float) or not math.isfinite(r[k]) for k in ('pulseStart_s','pulseEnd_s')):raise ValueError('Pulse times must be finite numbers')
    if not 0<=r['pulseStart_s']<=r['pulseEnd_s']<=r['duration_s']: raise ValueError('Invalid pulse time interval')
    for k,lo,hi in [('muscleForceScales',.5,1.5),('muscleActivationTimeScales',.5,2.)]:
        if not isinstance(r[k],dict): raise ValueError(k+' must be a native-muscle map')
        for name,val in r[k].items():
            if name not in muscles or type(val) not in (float,int) or not math.isfinite(val) or not lo<=val<=hi: raise ValueError('Invalid per-muscle edit')
    for global_key,muscle_key,lo,hi in [('forceScale','muscleForceScales',.5,1.5),('activationTimeScale','muscleActivationTimeScales',.5,2.)]:
        for name,val in r[muscle_key].items():
            if not lo<=r[global_key]*val<=hi:raise ValueError('Combined '+global_key+' outside effective bounds for '+name)
    for key in ('initialQ','initialQvel'):
        if key in r:
            x=np.asarray(r[key],dtype=float)
            if x.shape!=(23,) or not np.all(np.isfinite(x)): raise ValueError(key+' must have 23 finite values')
            if key=='initialQ' and np.any((x<m.jnt_range[:,0])|(x>m.jnt_range[:,1])): raise ValueError('initialQ violates native range')
            if key=='initialQvel' and np.max(np.abs(x))>20: raise ValueError('Initial speed outside supported domain')
    j=coordinates.index(r['coordinate']); amp=float(r['amplitude_rad'])
    if not math.isfinite(amp) or not m.jnt_range[j,0]<=amp<=m.jnt_range[j,1]: raise ValueError('Target angle violates native range')
    if 'targetTrajectory' in r:
        tr=r['targetTrajectory'];ts=np.asarray(tr.get('time_s'));q=np.asarray(tr.get('q_rad'))
        if ts.ndim!=1 or not 2<=len(ts)<=2501 or q.shape!=(len(ts),23) or not np.all(np.isfinite(ts)) or not np.all(np.isfinite(q)): raise ValueError('Malformed targetTrajectory')
        if abs(ts[0])>1e-10 or abs(ts[-1]-r['duration_s'])>1e-9 or np.any(np.diff(ts)<=0): raise ValueError('Trajectory timebase mismatch')
        if np.any((q<m.jnt_range[:,0]-1e-9)|(q>m.jnt_range[:,1]+1e-9)): raise ValueError('Trajectory outside native bounds; no clipping permitted')
    return r

def apply_parameters(m,r):
    mus=names(m,mj.mjtObj.mjOBJ_ACTUATOR,m.nu)
    for i,name in enumerate(mus):
        f=r['forceScale']*r['muscleForceScales'].get(name,1.)
        t=r['activationTimeScale']*r['muscleActivationTimeScales'].get(name,1.)
        m.actuator_gainprm[i,2]*=f; m.actuator_biasprm[i,2]*=f; m.actuator_dynprm[i,:2]*=t
    return {'force_N':values(m.actuator_gainprm[:,2]),'activationTime_s':values(m.actuator_dynprm[:,:2]),
      'gainParameters':values(m.actuator_gainprm),'biasParameters':values(m.actuator_biasprm),'dynamicsParameters':values(m.actuator_dynprm)}

def target_state(r,m,initial,t):
    if 'targetTrajectory' in r:
        tr=r['targetTrajectory']; times=np.asarray(tr['time_s']); q=np.asarray(tr['q_rad']);
        qv=np.gradient(q,times,axis=0);qa=np.gradient(qv,times,axis=0)
        return tuple(np.array([np.interp(t,times,a[:,i]) for i in range(23)]) for a in (q,qv,qa))
    coordinates=names(m,mj.mjtObj.mjOBJ_JOINT,m.njnt);j=coordinates.index(r['coordinate'])
    # New demonstration only: smooth minimum-jerk move during first 75%, then hold.
    T=.75*r['duration_s'];s=min(1.,t/T); p=10*s**3-15*s**4+6*s**5
    v=(30*s*s-60*s**3+30*s**4)/T if t<T else 0
    a=(60*s-180*s*s+120*s**3)/T**2 if t<T else 0
    q=initial.copy();qd=np.zeros(23);qdd=np.zeros(23);diff=r['amplitude_rad']-initial[j]
    q[j]+=p*diff;qd[j]=v*diff;qdd[j]=a*diff
    return q,qd,qdd

def controller(m,d,target,r):
    q,qd,qdd=target; M=np.zeros((m.nv,m.nv));mj.mj_fullM(m,M,d.qM)
    demand=M@(qdd+r['kp']*(q-d.qpos)+r['kd']*(qd-d.qvel))+d.qfrc_bias-d.qfrc_passive-d.qfrc_applied
    gains=np.array([mj.mju_muscleGain(d.actuator_length[i],d.actuator_velocity[i],m.actuator_lengthrange[i],m.actuator_acc0[i],m.actuator_gainprm[i,:9]) for i in range(m.nu)])
    bias=np.array([mj.mju_muscleBias(d.actuator_length[i],m.actuator_lengthrange[i],m.actuator_acc0[i],m.actuator_biasprm[i,:9]) for i in range(m.nu)])
    R=moment(m,d).T; A=R*gains[np.newaxis,:]; b=demand-R@bias
    # All 39 channels jointly. Weighting is explicit, not an OpenSim SO claim.
    if r['controllerMetric']=='acceleration':AA=np.linalg.solve(M,A);bb=np.linalg.solve(M,b);reg=.03
    elif r['controllerMetric']=='diagonal':AA=A/np.diag(M)[:,None];bb=b/np.diag(M);reg=.03
    else:AA=A;bb=b;reg=.0001
    fit=scipy.optimize.lsq_linear(np.vstack([AA,reg*np.eye(39)]),np.r_[bb,np.zeros(39)],bounds=(CTRL_MIN,CTRL_MAX),tol=1e-7,max_iter=100,method='bvls')
    desired=fit.x; tau=np.where(desired>d.act,m.actuator_dynprm[:,0]*(.5+1.5*d.act),m.actuator_dynprm[:,1]/(.5+1.5*d.act))
    ctrl=np.clip(d.act+(desired-d.act)*tau/.02,CTRL_MIN,CTRL_MAX)
    return ctrl,{'optimizerSuccess':bool(fit.success),'allocationResidual_Nm':float(np.max(np.abs(A@desired-b)))}

def run(request):
    wall=time.perf_counter(); env,m,d=new_env();r=validate_request(request,m);p=provenance();baselineQ=d.qpos.copy()
    if 'initialQ' in r:d.qpos[:]=r['initialQ']
    if 'initialQvel' in r:d.qvel[:]=r['initialQvel']
    initialQ=d.qpos.copy();d.act[:]=r['initialActivation'];d.ctrl[:]=CTRL_MIN;d.time=0
    effective=apply_parameters(m,r);mj.mj_forward(m,d)
    muscles=names(m,mj.mjtObj.mjOBJ_ACTUATOR,m.nu);coordinates=names(m,mj.mjtObj.mjOBJ_JOINT,m.njnt)
    ai=muscles.index(r['muscle']);frames=[];controls=[];numeric=0.;dynerr=0.;patherr=0.;polyerr=0.;limiterr=0.;controller_fail=0
    control_step=10;sample_step=int(round(r['sampleInterval_s']/m.opt.timestep));steps=int(round(r['duration_s']/m.opt.timestep));solver_start=time.perf_counter()
    target_errors=[];allocation=[]
    for k in range(steps+1):
        t=k*float(m.opt.timestep);mj.mj_forward(m,d)
        tar=target_state(r,m,initialQ,t)
        if k%control_step==0:
            if r['mode']=='pulse':
                raw=np.full(m.nu,-1.);raw[ai]=r['pulseRaw'] if r['pulseStart_s']-1e-10<=t<r['pulseEnd_s']-1e-10 else -1.
                d.ctrl[:]=1/(1+np.exp(-5*(raw-.5)))
            else:
                d.ctrl[:],status=controller(m,d,tar,r);controller_fail+=not status['optimizerSuccess'];allocation.append(status['allocationResidual_Nm'])
                raw=.5+np.log(d.ctrl/(1-d.ctrl))/5
            controls.append({'time_s':round(t,9),'raw_action':values(raw),'ctrl':values(d.ctrl)})
            mj.mj_forward(m,d)
        R=moment(m,d);tau=R*d.actuator_force[:,None]
        numeric=max(numeric,float(np.max(np.abs(tau.sum(axis=0)-d.qfrc_actuator))))
        M=np.zeros((m.nv,m.nv));mj.mj_fullM(m,M,d.qM)
        dynerr=max(dynerr,float(np.max(np.abs(M@d.qacc-(d.qfrc_actuator+d.qfrc_passive+d.qfrc_applied+d.qfrc_constraint-d.qfrc_bias)))))
        limiterr=max(limiterr,float(np.max(np.maximum(m.jnt_range[:,0]-d.qpos,d.qpos-m.jnt_range[:,1]))))
        target_errors.append(d.qpos-tar[0])
        if k%sample_step==0 or k==steps:
            paths,rawpaths,wraps,pe,poly=expanded_paths(m,d);patherr=max(patherr,pe);polyerr=max(polyerr,poly)
            gains=np.array([mj.mju_muscleGain(d.actuator_length[i],d.actuator_velocity[i],m.actuator_lengthrange[i],m.actuator_acc0[i],m.actuator_gainprm[i,:9]) for i in range(m.nu)])
            frames.append({'time_s':round(t,9),'q':values(d.qpos,10),'qvel':values(d.qvel,10),'qacc':values(d.qacc,10),
             'ctrl':values(d.ctrl,10),'activation':values(d.act,10),'force_N':values(d.actuator_force,10),'tension_N':values(-d.actuator_force,10),
             'activeTension_N':values(-gains*d.act,10),'passiveTension_N':values(-d.actuator_force+gains*d.act,10),
             'pathLength_m':values(d.actuator_length,10),'torque_Nm':values(tau,10),'qfrcActuator_Nm':values(d.qfrc_actuator,10),
             'qfrcPassive_Nm':values(d.qfrc_passive,10),'qfrcBias_Nm':values(d.qfrc_bias,10),'qfrcConstraint_Nm':values(d.qfrc_constraint,10),
             'bodyPos':values(d.xpos,8),'bodyQuat':values(d.xquat,10),'jointPos':values(d.xanchor,8),'jointAxis':values(d.xaxis,10),
             'paths':paths,'nativePathPoints':rawpaths,'activeWrapGeomIds':wraps,'targetQ':values(tar[0],10) if r['mode']=='tracking' else None,
             'contactCount':int(d.ncon)})
        if k<steps:mj.mj_step(m,d)
    duration=time.perf_counter()-solver_start;error=np.asarray(target_errors);j=coordinates.index(r['coordinate'])
    qc={'torqueMappingMaxAbs_Nm':numeric,'dynamicsMaxAbs_Nm':dynerr,'nativePathAnalyticLengthMaxAbs_m':patherr,
      'renderPolylineLengthMaxAbs_m':polyerr,'nativeJointLimitMaxViolation_rad':max(0.,limiterr),'controllerFailedUpdates':controller_fail,
      'trackingRmsAll_deg':float(np.sqrt(np.mean(error**2))*180/np.pi) if r['mode']=='tracking' else None,
      'trackingRmsSelected_deg':float(np.sqrt(np.mean(error[:,j]**2))*180/np.pi) if r['mode']=='tracking' else None,
      'trackingTerminalSelected_deg':float(abs(error[-1,j])*180/np.pi) if r['mode']=='tracking' else None,
      'trackingMaxAll_deg':float(np.max(np.abs(error))*180/np.pi) if r['mode']=='tracking' else None,
      'controllerAllocationMaxResidual_Nm':max(allocation) if allocation else None,
      'trackingAcceptanceThreshold_deg':5.,'trackingMaxAllThreshold_deg':10.,
      'trackingAccepted':bool(np.sqrt(np.mean(error[:,j]**2))*180/np.pi<5 and np.max(np.abs(error))*180/np.pi<10) if r['mode']=='tracking' else None,
      'numericPassed':bool(numeric<1e-8 and dynerr<1e-7 and patherr<1e-6)}
    result={'schemaVersion':2,'muscleNames':muscles,'coordinateNames':coordinates,'frames':frames,'controlSequence':controls,
     'manifest':{**p,'runId':'myohand-'+sha(canonical({'request':r,'source':p['modelHash'],'generator':p['generatorSha256']}).encode())[:16],
      'computationTier':'native-replay','mode':r['mode'],'status':'solved' if qc['numericPassed'] else 'failed-qc',
      'request':request,'effective':{**r,'muscleParameters':effective,'initialQ':values(initialQ),'initialQvel':r.get('initialQvel',[0.]*23),
        'gravity_m_s2':values(m.opt.gravity),'timestep_s':float(m.opt.timestep),'controlInterval_s':.02,'integrator':'Euler'},
      'qc':qc,'timing':{'rolloutAndExport_s':duration,'wall_s':time.perf_counter()-wall,'cache':False},
      'units':{'q':'rad','qvel':'rad/s','ctrl':'dimensionless','activation':'dimensionless','force_N':'signed N','tension_N':'positive N','torque_Nm':'Nm','paths':'m world','bodyQuat':'wxyz'},
      'controller':'All-39 bounded least-squares muscle allocation plus activation-lag compensation and computed-torque PD; custom controller, not OpenSim SO.' if r['mode']=='tracking' else None,
      'trajectoryOrigin':'supplied canonical atlas trajectory' if 'targetTrajectory' in r else ('new minimum-jerk demonstration, not original atlas clip' if r['mode']=='tracking' else 'manual control pulse'),
      'limitations':['Native model template, not a personalized human.', 'Recorded paths and body transforms are native world-space outputs.',
       'Tracking is evaluated separately from numerical forward correctness; target is not substituted for actual motion.',
       'Editable parameter ranges are bounded engineering experiments, not physiological population ranges.']}}
    canonical(result);env.close();return result

def export_model(path):
    env,m,d=new_env();mj.mj_forward(m,d);p=provenance()
    body_names=names(m,mj.mjtObj.mjOBJ_BODY,m.nbody);muscles=names(m,mj.mjtObj.mjOBJ_ACTUATOR,m.nu)
    geoms=[];mesh_ids=set()
    wrap_geoms=set(int(m.wrap_objid[i]) for i in range(m.nwrap) if m.wrap_type[i] in (4,5))
    for i in range(m.ngeom):
        if not (m.geom_bodyid[i]>=10 or i in wrap_geoms):continue
        mid=int(m.geom_dataid[i]) if m.geom_type[i]==7 else None
        if mid is not None:mesh_ids.add(mid)
        geoms.append({'id':i,'name':mj.mj_id2name(m,mj.mjtObj.mjOBJ_GEOM,i),'bodyId':int(m.geom_bodyid[i]),
          'type':mj.mjtGeom(int(m.geom_type[i])).name,'meshId':mid,'localPos':values(m.geom_pos[i],10),'localQuat':values(m.geom_quat[i],10),
          'size':values(m.geom_size[i]),'rgba':values(m.geom_rgba[i]),'isWrap':i in wrap_geoms})
    meshes=[]
    for i in sorted(mesh_ids):
        v=int(m.mesh_vertadr[i]);nv=int(m.mesh_vertnum[i]);f=int(m.mesh_faceadr[i]);nf=int(m.mesh_facenum[i])
        meshes.append({'id':i,'name':mj.mj_id2name(m,mj.mjtObj.mjOBJ_MESH,i),
          'vertices':values(m.mesh_vert[v:v+nv],8),'faces':values(m.mesh_face[f:f+nf])})
    definitions=[]
    for i,name in enumerate(muscles):
        ti=int(m.actuator_trnid[i,0]);a=int(m.tendon_adr[ti]);n=int(m.tendon_num[ti])
        definitions.append({'id':i,'name':name,'tendonId':ti,'tendonName':mj.mj_id2name(m,mj.mjtObj.mjOBJ_TENDON,ti),
          'gainprm':values(m.actuator_gainprm[i]),'biasprm':values(m.actuator_biasprm[i]),'dynprm':values(m.actuator_dynprm[i]),
          'lengthrange_m':values(m.actuator_lengthrange[i]),'gear':values(m.actuator_gear[i]),'ctrlrange':values(m.actuator_ctrlrange[i]),
          'pathDefinition':[{'type':int(m.wrap_type[k]),'objectId':int(m.wrap_objid[k]),'parameter':float(m.wrap_prm[k])} for k in range(a,a+n)]})
    # All exposed numeric compiled model fields, with bulky mesh arrays referred
    # to the asset above rather than repeated. Private source paths are excluded.
    effective={}
    for key in dir(m):
        if key.startswith('_') or key in ('names','paths','buffer'):continue
        try:v=getattr(m,key)
        except Exception:continue
        if isinstance(v,np.ndarray):
            if v.dtype.kind not in 'biuf':continue
            if v.size>12000:effective[key]={'shape':list(v.shape),'dtype':str(v.dtype),'sha256':sha(v.tobytes()),'valueOmitted':'large compiled array; model source hash and explicit mesh export bind this field'}
            else:effective[key]=values(v)
        elif type(v) in (int,float,bool):effective[key]=v
    options={k:values(getattr(m.opt,k)) if isinstance(getattr(m.opt,k),np.ndarray) else getattr(m.opt,k) for k in dir(m.opt) if not k.startswith('_') and (isinstance(getattr(m.opt,k),np.ndarray) or type(getattr(m.opt,k)) in (int,float,bool))}
    parameters=[{'key':'forceScale','label':'全部肌肉力量倍率','nativeField':'actuator_gainprm[:,2] and actuator_biasprm[:,2]','unit':'multiplier','baseline':1,'bounds':[.5,1.5],'capability':'可调并重算'},
      {'key':'activationTimeScale','label':'全部肌肉响应时间倍率','nativeField':'actuator_dynprm[:,:2]','unit':'multiplier','baseline':1,'bounds':[.5,2],'capability':'可调并重算'},
      {'key':'muscleForceScales','label':'逐肌肉力量倍率','nativeField':'actuator_gainprm[id,2] and actuator_biasprm[id,2]','unit':'multiplier','baseline':1,'bounds':[.5,1.5],'scope':'each native muscle','capability':'可调并重算'},
      {'key':'muscleActivationTimeScales','label':'逐肌肉响应时间倍率','nativeField':'actuator_dynprm[id,:2]','unit':'multiplier','baseline':1,'bounds':[.5,2],'scope':'each native muscle','capability':'可调并重算'}]
    paths,raw,wraps,pe,poly=expanded_paths(m,d)
    result={'schemaVersion':2,'manifest':{**p,'handedness':'right-hand native MyoHand template; source joint/site convention retained',
      'counts':{'bodies':m.nbody,'geoms':m.ngeom,'sites':m.nsite,'muscles':m.nu,'coordinates':m.nq,'tendonsIncludingVisualization':m.ntendon,'exportedBoneMeshes':len(meshes)},
      'units':{'position':'m','angle':'rad','force':'N','torque':'Nm','quat':'wxyz'},
      'nativePathAnalyticLengthMaxAbs_m':pe,'renderPolylineLengthMaxAbs_m':poly,
      'largeFieldsPolicy':'Numeric model fields enumerated; >12000 elements summarized by shape/type/hash; meshes exported separately. Not all inspector fields are editable.'},
      'muscleNames':muscles,'coordinateNames':names(m,mj.mjtObj.mjOBJ_JOINT,m.njnt),
      'bodies':[{'id':i,'name':name,'parentId':int(m.body_parentid[i]),'mass_kg':float(m.body_mass[i]),'inertia_kgm2':values(m.body_inertia[i])} for i,name in enumerate(body_names)],
      'coordinates':[{'id':i,'name':mj.mj_id2name(m,mj.mjtObj.mjOBJ_JOINT,i),'bodyId':int(m.jnt_bodyid[i]),'axis':values(m.jnt_axis[i]),'pos':values(m.jnt_pos[i]),'range_rad':values(m.jnt_range[i]),'type':'hinge','independent':True} for i in range(m.njnt)],
      'meshes':meshes,'geoms':geoms,'muscles':definitions,'parameterDefinitions':parameters,
      'compiledModel':effective,'compiledOptions':options,'readOnlyPolicy':'All compiled fields except listed supported parameter edits are 只读; topology/class edits 尚未接入.',
      'initialFrame':{'bodyPos':values(d.xpos,8),'bodyQuat':values(d.xquat,10),'paths':paths,'nativePathPoints':raw,'activeWrapGeomIds':wraps}}
    write(path,result);env.close();return result

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--request',type=Path);parser.add_argument('--output',type=Path);parser.add_argument('--export-model',type=Path)
    args=parser.parse_args()
    if args.export_model:
        model=export_model(args.export_model);print(canonical(model['manifest']))
    elif args.request and args.output:
        req=json.loads(args.request.read_text());result=run(req);write(args.output,result);print(canonical(result['manifest']))
    else:parser.error('Use --export-model or both --request and --output')
