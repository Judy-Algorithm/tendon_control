"""Native independent-coordinate +/-0.25rad demos, distinct from atlas clips."""
import argparse,json,concurrent.futures
from pathlib import Path
from opensim_run import run,save

def worker(job):
    model,request_path,out=job
    try:
        path=Path(out)/'run.json'
        if path.exists():result=json.loads(path.read_text())
        elif Path(out).exists():return {'status':'failed','reason':'Existing incomplete run retained'}
        else:result=run(model,request_path,out)
        return {'status':result['manifest']['status'],'result':result}
    except Exception as exc:
        failure={'status':'failed','reason':str(exc),'errorType':type(exc).__name__};save(Path(out)/'failure.json',failure);return failure

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--model',required=True);ap.add_argument('--output-root',required=True);ap.add_argument('--public-dir',required=True);args=ap.parse_args()
    root=Path(args.output_root);root.mkdir(parents=True,exist_ok=True);public=Path(args.public_dir);model=json.loads((public/'opensim-model.json').read_text());rows=[];jobs=[]
    for c in model['coordinates']:
        if c['constrained']:continue
        for sign in [-1,1]:
            direction='negative' if sign<0 else 'positive';key='opensim-native-'+c['id'].replace('_','-')+'-'+direction;target=c['default']+sign*.25
            row={'actionId':'native:'+c['id']+':'+direction,'coordinate':c['id'],'direction':sign,'origin':'new_native_coordinate_demo_not_original_atlas','amplitude_rad':sign*.25,'targetRad':target,'nativeRange_rad':[c['min'],c['max']],'status':'not_run','runStatus':'not_run'}
            rows.append(row)
            if not c['min']-1e-7<=target<=c['max']+1e-7:row.update(status='unsupported',runStatus='not_run',reason='Fixed +/-0.25rad request is outside native range; not shortened');continue
            request={'runId':key,'actionId':row['actionId'],'coordinate':c['id'],'targetRad':target,'duration_s':2,'samples':51,'parameters':{}}
            request_file=root/(key+'-request.json')
            if not request_file.exists():save(request_file,request)
            jobs.append((row,key,(args.model,str(request_file),str(root/key))))
    save(public/'opensim-native-actions.json',{'actions':rows,'scope':'23 independent coordinates × 2 signs, fixed0.25rad; new native demonstrations, not original atlas coverage'})
    with concurrent.futures.ProcessPoolExecutor(max_workers=2) as pool:
        futures={pool.submit(worker,job):(row,key) for row,key,job in jobs}
        for future in concurrent.futures.as_completed(futures):
            row,key=futures[future];outcome=future.result();row.update(status=outcome['status'],runStatus=outcome['status'])
            if 'result' in outcome:
                d=outcome['result'];filename=key+'.json';(public/filename).write_text(json.dumps(d,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n');row.update(runFile=filename,acceptedFrames=d['manifest']['qc']['acceptedFrames'],attemptedFrames=d['manifest']['qc']['frames'])
                ip=public/'opensim-index.json';index=json.loads(ip.read_text());index['runs']=[x for x in index['runs'] if x.get('file')!=filename]+[{'file':filename,'label':'原生新示范 · '+row['coordinate']+(' −' if row['direction']<0 else ' +'),'actionId':row['actionId'],'parameters':{},'origin':row['origin'],'group':'native-independent-coordinate','status':row['status']}];index['nativeActionsFile']='opensim-native-actions.json';save(ip,index)
            else:row['reason']=outcome['reason']
            save(public/'opensim-native-actions.json',{'actions':rows,'scope':'23 independent coordinates × 2 signs, fixed0.25rad; new native demonstrations, not original atlas coverage'})
    print(json.dumps({'attempted':len(jobs),'total':len(rows),'statusCounts':{s:sum(r['status']==s for r in rows) for s in ['solved','partial','failed','unsupported','not_run']}}))
if __name__=='__main__':main()
