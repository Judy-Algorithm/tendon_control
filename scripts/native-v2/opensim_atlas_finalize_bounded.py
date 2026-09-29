"""Finish only unattempted clips, and publish successful replays plus timeout ledger."""
import argparse,json,subprocess,sys,time
from pathlib import Path
from opensim_run import save,sha
ap=argparse.ArgumentParser();ap.add_argument('--model',required=True);ap.add_argument('--output-root',required=True);ap.add_argument('--public-dir',required=True);ap.add_argument('--limit',type=float,default=900);args=ap.parse_args()
root=Path(__file__).resolve().parents[2];out=Path(args.output_root);public=Path(args.public_dir)
watch=json.loads((out/'watchdog-result.json').read_text());assert watch['status']=='DONE'
candidate_path=root/'docs/native-solver-v2/OPENSIM_ORIGINAL_ATLAS_CANDIDATE_V2.json';coverage=json.loads(candidate_path.read_text());review=json.loads((root/'docs/native-solver-v2/OPENSIM_HANDEDNESS_INDEPENDENT.json').read_text());assert review['candidateHash']==sha(candidate_path);assert coverage['modelHash']==sha(args.model)
archive='opensim-canonical-index-before-atlas-v2.json';old=json.loads((public/archive).read_text());index={**old,'runs':[r for r in old['runs'] if r.get('origin')!='original_atlas_angle_mapping'],'mappingVersion':'opposite-hand-axial-v2','supersededAtlasIndexFile':archive,'coverageFile':'opensim-canonical-coverage-v2.json'};assert len(index['runs'])==43
for row in coverage['coverage']:
    row.pop('candidateOnly',None)
    if row['status']!='mapped':continue
    key='opensim-canonical-atlas-v2-'+row['actionId'].replace(':','-').replace('_','-').lower();folder=out/key;rp=out/(key+'-request.json')
    if not folder.exists():
        started=time.time()
        with (out/(key+'-process.log')).open('w') as log:
            try:
                p=subprocess.run([sys.executable,str(root/'scripts/native-v2/opensim_run.py'),'--model',args.model,'--request',str(rp),'--output',str(folder)],stdout=log,stderr=subprocess.STDOUT,timeout=args.limit)
                if p.returncode:save(folder/'FAILED.json',{'status':'FAILED','returncode':p.returncode,'elapsed_s':time.time()-started})
            except subprocess.TimeoutExpired:
                save(folder/'TIMEOUT.json',{'status':'TIMEOUT','wallTimeLimit_s':args.limit,'elapsed_s':time.time()-started,'startedAtEpoch':started,'startEvidence':'actual subprocess start','runId':key,'partialOutputPolicy':'Logs/partial files preserved; no complete activation result inferred.'})
    if (folder/'run.json').exists():
        d=json.loads((folder/'run.json').read_text());filename=key+'.json'
        if (public/filename).exists():assert json.loads((public/filename).read_text())['frames']==d['frames']
        else:
            d['manifest']['canonicalRepair']={'id':'arms-left-native-repair-v1','evidenceFile':'opensim-canonical-repair.json','note':'Fresh native SO with independently reviewed opposite-hand axial mapping v2.'};d['manifest']['limitations'].extend(old.get('modelLimitations',[]));(public/filename).write_text(json.dumps(d,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n')
        row.update(runStatus=d['manifest']['status'],runFile=filename,acceptedFrames=d['manifest']['qc']['acceptedFrames'],attemptedFrames=d['manifest']['qc']['frames'],reason='异侧手轴向量变换经独立审核；原始幅度时间不变，已完成原生求解尝试')
        index['runs'].append({'file':filename,'label':'原动作 · '+row['label'],'actionId':row['actionId'],'parameters':{},'origin':'original_atlas_angle_mapping','mappingVersion':'opposite-hand-axial-v2','status':d['manifest']['status'],'qc':d['manifest']['qc']})
    else:
        timed=(folder/'TIMEOUT.json').exists();evidence=json.loads((folder/('TIMEOUT.json' if timed else 'FAILED.json')).read_text()) if timed or (folder/'FAILED.json').exists() else {'status':'INCOMPLETE_RETAINED'}
        filename=key+'-attempt.json';public_evidence={k:v for k,v in evidence.items() if k not in ['verifiedProcessCommand','terminatedPid']};public_evidence['scope']='Exact process identity and partial native logs retained in local attempt; no complete replay exported.';save(public/filename,public_evidence);row.update(runStatus='timeout' if timed else 'failed',attemptEvidenceFile=filename,expectedFrames=121,completedFrames=0,acceptedFrames=0,reason='原始角度映射有效；原生求解达到900秒上限，日志保留，未提供伪造完整轨迹' if timed else '原始角度映射有效；求解未完成，保留失败证据')
coverage.update(status='INDEPENDENTLY_REVIEWED_ALL14_ATTEMPTS_TERMINAL',reviewFile='OPENSIM_HANDEDNESS_INDEPENDENT.json',solverWallTimeLimit_s=args.limit,solverCounts={k:sum(r.get('runStatus')==k for r in coverage['coverage'] if r['status']=='mapped') for k in ['solved','partial','timeout','failed']});save(public/index['coverageFile'],coverage)
index['coverage']=[{k:v for k,v in r.items() if k!='mappedTrajectory'} for r in coverage['coverage']];index['fileMap']={k:v for k,v in old.get('fileMap',{}).items() if not k.startswith('opensim-atlas-')};index['supersededAtlasNote']='Previous five original-atlas mappings omitted opposite-hand axial-vector transformation. Native numeric outputs remain archived but are not valid correspondences to the original actions.';index['atlasV2SolverCounts']=coverage['solverCounts'];save(public/'opensim-canonical-index-v2.json',index);save(public/'opensim-index.json',index)
print(json.dumps({'activeRuns':len(index['runs']),'solverCounts':coverage['solverCounts']}))
