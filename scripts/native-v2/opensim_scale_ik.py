"""Native Scale -> synthetic marker IK -> native ID/SO self-consistency slice.

Synthetic marker triads deliberately over-observe each native body. This is not
a 21-point MANO fit, marker-placement calibration, or real-person validation.
"""
import argparse,json,math,time
from pathlib import Path
import numpy as np
import opensim as o
from opensim_run import exact,vec,save,read_sto,run,sha,inspector

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--model',required=True);ap.add_argument('--output',required=True);ap.add_argument('--public-dir',required=True);ap.add_argument('--scale',type=float,default=1.05);args=ap.parse_args()
    out=Path(args.output);public=Path(args.public_dir)
    if out.exists() and any(out.iterdir()):raise ValueError('New output directory required')
    if not .95<=args.scale<=1.05:raise ValueError('This bounded round-trip supports .95..1.05')
    out.mkdir(parents=True,exist_ok=True);m=o.Model(args.model)
    # Add three non-collinear synthetic reference points per native body.
    marker_names=[]
    for body in m.getBodySet():
        for i,p in enumerate([[.006,0,0],[0,-.009,0],[0,0,.005]]):
            name=f'synthetic_{body.getName()}_{i}';m.addMarker(o.Marker(name,body,o.Vec3(*p)));marker_names.append(name)
    m.finalizeConnections();s=m.initSystem();scale_set=o.ScaleSet()
    for body in m.getBodySet():
        sc=o.Scale();sc.setSegmentName(body.getName());sc.setScaleFactors(o.Vec3(args.scale));sc.setApply(True);scale_set.cloneAndAppend(sc)
    before={mus.getName():[mus.getOptimalFiberLength(),mus.getTendonSlackLength()] for mus in m.getMuscles()}
    scale_t=time.perf_counter();scaled=bool(m.scale(s,scale_set,True));scale_s=time.perf_counter()-scale_t
    if not scaled:raise RuntimeError('Native Model.scale returned false')
    m.finalizeConnections();s=m.initSystem();exact(m,s);scaled_model=out/'scaled_with_markers.osim';m.printToXML(str(scaled_model));scale_set.printToXML(str(out/'scales.xml'))
    coords=[c for c in m.getCoordinateSet() if not c.isConstrained(s)];names=[c.getName() for c in coords];q0=np.array([c.getValue(s) for c in coords]);times=np.linspace(0,1.5,31);truth=[];observations=[]
    for tt in times:
        h=tt/times[-1];wave=10*h**3-15*h**4+6*h**5;q=q0.copy()
        for name,target in [('2mcp_flexion',.2),('3mcp_flexion',.15),('flexion',.1)]:q[names.index(name)]+=target*wave
        for c,v in zip(coords,q):c.setValue(s,float(v),False)
        exact(m,s);truth.append(q);observations.append([vec(m.getMarkerSet().get(n).getLocationInGround(s)) for n in marker_names])
    observations=np.array(observations);trc=out/'synthetic_markers.trc';fps=1/(times[1]-times[0]);n=len(marker_names)
    trc_text='PathFileType\t4\t(X/Y/Z)\tsynthetic_markers.trc\nDataRate\tCameraRate\tNumFrames\tNumMarkers\tUnits\tOrigDataRate\tOrigDataStartFrame\tOrigNumFrames\n'
    trc_text+=f'{fps}\t{fps}\t{len(times)}\t{n}\tm\t{fps}\t1\t{len(times)}\n'
    trc_text+='Frame#\tTime\t'+'\t\t\t'.join(marker_names)+'\n\t\t'+'\t'.join(f'{axis}{i+1}' for i in range(n) for axis in 'XYZ')+'\n\n'
    for i,tt in enumerate(times):trc_text+=f'{i+1}\t{tt:.17g}\t'+'\t'.join(f'{v:.17g}' for v in observations[i].ravel())+'\n'
    trc.write_text(trc_text)
    tool=o.InverseKinematicsTool();tool.setName('native_synthetic_marker_roundtrip');tool.setModel(m);tool.setMarkerDataFileName(str(trc));tool.setStartTime(0);tool.setEndTime(float(times[-1]));tool.setOutputMotionFileName(str(out/'ik_coordinates.mot'));tool.setResultsDir(str(out))
    tasks=o.IKTaskSet()
    for name in marker_names:
        task=o.IKMarkerTask();task.setName(name);task.setWeight(1);task.setApply(True);tasks.cloneAndAppend(task)
    tool.set_IKTaskSet(tasks);tool.set_accuracy(1e-12);tool.set_report_errors(True);tool.set_report_marker_locations(True);tool.printToXML(str(out/'ik_setup.xml'))
    o.Logger.addFileSink(str(out/'native_ik.log'));tic=time.perf_counter()
    try:ik_ok=bool(tool.run())
    finally:o.Logger.removeFileSink()
    ik_s=time.perf_counter()-tic
    if not ik_ok:raise RuntimeError('Native IK failed')
    # OpenSim's Coupled-motion wrist coordinates are NOT degree-converted even
    # in an inDegrees=yes file. Let the native engine convert Rotational only.
    storage=o.Storage(str(out/'ik_coordinates.mot'));m.getSimbodyEngine().convertDegreesToRadians(storage);o.Storage.printResult(storage,'ik_coordinates_si',str(out),-1,'.sto')
    headers,rows=read_sto(out/'ik_coordinates_si.sto');qfit=rows[:,[headers.index(n) for n in names]]
    if len(qfit)!=len(times):raise RuntimeError('IK timebase differs; no interpolation accepted')
    errors=[];fitted_markers=[]
    for i,row in enumerate(qfit):
        for c,v in zip(coords,row):c.setValue(s,float(v),False)
        exact(m,s);pred=np.array([vec(m.getMarkerSet().get(n).getLocationInGround(s)) for n in marker_names]);fitted_markers.append(pred);errors.append(np.linalg.norm(pred-observations[i],axis=1))
    errors=np.array(errors);evidence={'nativeScaleReturn':scaled,'nativeIKReturn':ik_ok,'scaleFactorAllBodies':args.scale,'massPolicy':'preserveMassDist=True; body masses multiply by scale-factor product, inertia updated by native API','syntheticMarkers':n,'frames':len(times),'markerRMS_m':float(np.sqrt(np.mean(errors**2))),'markerMax_m':float(errors.max()),'qMaxError_rad':float(np.max(np.abs(qfit-np.array(truth)))),'scalingTime_s':scale_s,'ikTime_s':ik_s,'originalModelHash':sha(args.model),'scaledModelHash':sha(scaled_model),'markerFileHash':sha(trc),'ikMotionHash':sha(out/'ik_coordinates.mot'),'scope':'Native uniform scaling and over-observed noiseless synthetic-body-marker roundtrip; no subject parameter estimation, MANO21 fitting, measured marker validation, or MarkerPlacer.'}
    save(out/'scale_ik_evidence.json',evidence)
    if evidence['markerMax_m']>1e-4 or evidence['qMaxError_rad']>1e-3:raise RuntimeError('Roundtrip evidence failed fixed1e-4m/1e-3rad gates')
    request={'runId':'opensim-scale-ik-roundtrip','actionId':'native-scale-ik-synthetic-triads','parameters':{},'trajectory':{'times_s':times.tolist(),'coordinateNames':names,'q':qfit.tolist()},'loadN':0};save(out/'so-request.json',request)
    result=run(scaled_model,out/'so-request.json',out/'so')
    result['manifest']['stages']['scale']='Native Model.scale with all-body uniform factor; known factor, not inferred subject size'
    result['manifest']['stages']['ik']='Native InverseKinematicsTool on noiseless synthetic marker triads generated from scaled model'
    result['manifest']['scaleIKEvidence']=evidence;result['manifest']['limitations'].append(evidence['scope'])
    for frame,obs,fit in zip(result['frames'],observations,fitted_markers):frame['observedMarkers_m']=obs.tolist();frame['fittedMarkers_m']=fit.tolist()
    result['markerNames']=marker_names
    filename='opensim-scale-ik-roundtrip.json';(public/filename).write_text(json.dumps(result,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n')
    save(public/'opensim-scale-ik-evidence.json',evidence);save(public/'opensim-scale-ik-model.json',inspector(o.Model(str(scaled_model)),scaled_model))
    index_path=public/'opensim-index.json';index=json.loads(index_path.read_text());index['runs']=[x for x in index['runs'] if x.get('file')!=filename]+[{'file':filename,'label':'原生Scale→IK→ID→SO · 合成标记自检','actionId':request['actionId'],'parameters':{},'status':result['manifest']['status'],'modelFile':'opensim-scale-ik-model.json','geometryFile':'opensim-scale-ik-geometry.json'}];save(index_path,index)
    print(json.dumps(evidence),flush=True)
if __name__=='__main__':main()
