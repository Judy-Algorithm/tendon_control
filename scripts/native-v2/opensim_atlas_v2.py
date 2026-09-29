"""Approved chirality-correct original atlas rerun, preserving previous assets."""
import argparse,json,concurrent.futures
from pathlib import Path
from opensim_run import save,sha
from opensim_canonical_batch import worker

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--model',required=True);ap.add_argument('--output-root',required=True);ap.add_argument('--public-dir',required=True);args=ap.parse_args()
    root=Path(__file__).resolve().parents[2];public=Path(args.public_dir);output=Path(args.output_root);output.mkdir(parents=True,exist_ok=True)
    review=json.loads((root/'docs/native-solver-v2/OPENSIM_HANDEDNESS_INDEPENDENT.json').read_text())
    # Reviewer output is retained verbatim; caller additionally has explicit leader approval.
    candidate=json.loads((root/'docs/native-solver-v2/OPENSIM_ORIGINAL_ATLAS_CANDIDATE_V2.json').read_text())
    assert review['status']=='APPROVE_CANDIDATE_MAPPING_FOR_NATIVE_RERUN'
    assert review['candidateHash']==sha(root/'docs/native-solver-v2/OPENSIM_ORIGINAL_ATLAS_CANDIDATE_V2.json')
    assert candidate['modelHash']==sha(args.model)
    assert candidate['counts']=={'mapped':14,'unsupported':26,'not_yet_verified':8}
    archive=public/'opensim-canonical-index-before-atlas-v2.json'
    if not archive.exists():save(archive,json.loads((public/'opensim-index.json').read_text()))
    old=json.loads(archive.read_text());index={**old,'runs':[x for x in old['runs'] if x.get('origin')!='original_atlas_angle_mapping'],'mappingVersion':'opposite-hand-axial-v2','supersededAtlasIndexFile':archive.name,'coverageFile':'opensim-canonical-coverage-v2.json'}
    assert len(index['runs'])==43
    coverage={**candidate,'status':'INDEPENDENTLY_REVIEWED_NATIVE_RERUN_IN_PROGRESS','reviewFile':'OPENSIM_HANDEDNESS_INDEPENDENT.json'}
    jobs=[]
    for row in coverage['coverage']:
        row.pop('candidateOnly',None)
        if row['status']!='mapped':continue
        key='opensim-canonical-atlas-v2-'+row['actionId'].replace(':','-').replace('_','-').lower()
        request={'runId':key,'actionId':row['actionId'],'trajectory':row['mappedTrajectory'],'parameters':{},'loadN':0,'mappingAudit':{k:v for k,v in row.items() if k!='mappedTrajectory'}}
        rp=output/(key+'-request.json')
        if not rp.exists():save(rp,request)
        jobs.append((row,key,(args.model,str(rp),str(output/key))))
    with concurrent.futures.ProcessPoolExecutor(max_workers=2) as pool:
        futures={pool.submit(worker,job):(row,key) for row,key,job in jobs}
        for fut in concurrent.futures.as_completed(futures):
            row,key=futures[fut];result=fut.result()
            if 'result' in result:
                d=result['result'];d['manifest']['canonicalRepair']={'id':'arms-left-native-repair-v1','evidenceFile':'opensim-canonical-repair.json','note':'Fresh native SO using independently reviewed opposite-hand axial mapping v2.'};d['manifest']['limitations'].extend(old.get('modelLimitations',[]))
                filename=key+'.json';(public/filename).write_text(json.dumps(d,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n')
                row.update(runStatus=d['manifest']['status'],runFile=filename,acceptedFrames=d['manifest']['qc']['acceptedFrames'],attemptedFrames=d['manifest']['qc']['frames'],reason='异侧手轴向量变换经独立审核；原始角度和时间不变，已实际原生求解')
                index['runs'].append({'file':filename,'label':'原动作 · '+row['label'],'actionId':row['actionId'],'parameters':{},'origin':'original_atlas_angle_mapping','mappingVersion':'opposite-hand-axial-v2','status':d['manifest']['status'],'qc':d['manifest']['qc']})
            else:row.update(runStatus='failed',runReason=result.get('reason','Native run failed'));index.setdefault('atlasV2FailedAttempts',[]).append({'actionId':row['actionId'],**result})
            save(output/'progress.json',{'completedRuns':len(index['runs'])-43,'coverage':coverage['coverage']})
    if len(index['runs'])!=57:raise RuntimeError('Incomplete native rerun; active index unchanged; private progress retained')
    ordering={r['actionId']:i for i,r in enumerate(coverage['coverage'])};index['runs'][43:]=sorted(index['runs'][43:],key=lambda r:ordering[r['actionId']])
    coverage['status']='INDEPENDENTLY_REVIEWED_NATIVE_RUNS_COMPLETE';save(public/index['coverageFile'],coverage)
    index['coverage']=[{k:v for k,v in r.items() if k!='mappedTrajectory'} for r in coverage['coverage']]
    # Old mapping aliases remain archive-only; never silently point to new-sign results.
    index['fileMap']={k:v for k,v in index.get('fileMap',{}).items() if not k.startswith('opensim-atlas-')}
    index['supersededAtlasNote']='Previous five original-atlas mappings used an incorrect proper rotation across opposite handedness. Their native numeric outputs remain archived but are not valid correspondences to the original actions.'
    save(public/'opensim-canonical-index-v2.json',index);save(public/'opensim-index.json',index)
    print(json.dumps({'activeRuns':len(index['runs']),'newAtlasRuns':14,'counts':coverage['counts'],'frames':sum(r.get('qc',{}).get('frames',0) for r in index['runs'])}))

if __name__=='__main__':main()
