"""Recompute the existing recipes on versioned canonical LEFT repair.

Raw assets and private runs are not overwritten. Active index switches only
after all requested native recomputations and a separate Scale/IK rerun finish.
"""
import argparse,json,concurrent.futures,subprocess,sys
from pathlib import Path
from opensim_run import run,save,inspector,sha,o

def worker(job):
    model,request,out=job
    try:
        p=Path(out)/'run.json'
        if p.exists():result=json.loads(p.read_text())
        elif Path(out).exists():return {'status':'failed','reason':'Existing incomplete attempt retained'}
        else:result=run(model,request,out)
        return {'status':result['manifest']['status'],'result':result}
    except Exception as exc:
        failure={'status':'failed','reason':str(exc),'errorType':type(exc).__name__};save(Path(out)/'failure.json',failure);return failure

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--model',required=True);ap.add_argument('--output-root',required=True);ap.add_argument('--public-dir',required=True);args=ap.parse_args();public=Path(args.public_dir);root=Path(args.output_root);root.mkdir(parents=True,exist_ok=True)
    legacy=public/'legacy-raw-index.json'
    if not legacy.exists():save(legacy,json.loads((public/'opensim-index.json').read_text()))
    old=json.loads(legacy.read_text());index={**old,'modelFile':'opensim-canonical-model.json','geometryFile':'opensim-canonical-geometry.json','coverageFile':'opensim-canonical-coverage.json','nativeActionsFile':'opensim-canonical-native-actions.json','legacyIndexFile':legacy.name,'repairEvidenceFile':'opensim-canonical-repair.json','canonicalModelHash':sha(args.model),'runs':[],'fileMap':{}};jobs=[]
    info=inspector(o.Model(args.model),Path(args.model));save(public/index['modelFile'],info)
    for entry in old['runs']:
        if entry['file']=='opensim-scale-ik-roundtrip.json':continue
        previous=json.loads((public/entry['file']).read_text());request=previous['manifest']['request'];key=entry['file'].removesuffix('.json').replace('opensim-','opensim-canonical-',1);request={**request,'runId':key};rp=root/(key+'-request.json')
        if not rp.exists():save(rp,request)
        jobs.append((entry,key,(args.model,str(rp),str(root/key))))
    with concurrent.futures.ProcessPoolExecutor(max_workers=2) as pool:
        futures={pool.submit(worker,job):(entry,key) for entry,key,job in jobs}
        for future in concurrent.futures.as_completed(futures):
            entry,key=futures[future];outcome=future.result()
            if 'result' in outcome:
                d=outcome['result'];d['manifest']['canonicalRepair']={'id':'arms-left-native-repair-v1','evidenceFile':'opensim-canonical-repair.json','rawModelHash':'45c45732788afd4fcc78b89c97cf7a5da51de82dcb735d480459ee4e8770207b','note':'Fresh native SO on repaired geometry/moving-point/wrap-quadrant model; raw artifacts retained separately.'};filename=key+'.json';(public/filename).write_text(json.dumps(d,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n');index['runs'].append({**entry,'file':filename,'status':d['manifest']['status'],'runId':key,'qc':d['manifest']['qc']});index['fileMap'][entry['file']]=filename
            else:index.setdefault('failedAttempts',[]).append({'sourceRecipe':entry['file'],**outcome})
            save(public/'opensim-canonical-index.json',index)
    # Preserve original display ordering independent of worker completion.
    rank={e['file']:i for i,e in enumerate(old['runs'])};reverse={v:k for k,v in index['fileMap'].items()};index['runs'].sort(key=lambda e:rank[reverse[e['file']]])
    save(public/'opensim-canonical-index.json',index)
    print(json.dumps({'completed':len(index['runs']),'failed':len(index.get('failedAttempts',[])),'status':'canonical_core_ready_pending_scale_ik_and_geometry'}))
if __name__=='__main__':main()
