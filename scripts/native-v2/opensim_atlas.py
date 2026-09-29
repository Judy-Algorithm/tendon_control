"""Run the original atlas clips that passed the explicit axis/ROM audit.

Coverage remains separate from solver acceptance. Other actions are never
silently assigned smaller amplitudes or re-labelled as native successes.
"""
import argparse,json
from pathlib import Path
from opensim_run import run,save

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--model',required=True);ap.add_argument('--output-root',required=True);ap.add_argument('--public-dir',required=True);args=ap.parse_args()
    root=Path(args.output_root);root.mkdir(parents=True,exist_ok=True);public=Path(args.public_dir)
    coverage=json.loads((public/'opensim-coverage.json').read_text());index=json.loads((public/'opensim-index.json').read_text())
    for row in coverage['coverage']:
        if row['status']!='mapped':continue
        key='opensim-atlas-'+row['actionId'].replace(':','-').replace('_','-').lower();destination=root/key
        request={'runId':key,'actionId':row['actionId'],'trajectory':row['mappedTrajectory'],'parameters':{},'loadN':0,'mappingAudit':{k:v for k,v in row.items() if k not in ['mappedTrajectory']}}
        request_file=root/(key+'-request.json')
        if not request_file.exists():save(request_file,request)
        try:
            if (destination/'run.json').exists():result=json.loads((destination/'run.json').read_text())
            elif destination.exists():row.update(runStatus='failed',runReason='Existing incomplete attempt preserved; not overwritten');continue
            else:result=run(args.model,request_file,destination)
            # Public assets are generated derivations, not private diagnostics.
            save(public/(key+'.json'),result);row.update(runStatus=result['manifest']['status'],acceptedFrames=result['manifest']['qc']['acceptedFrames'],attemptedFrames=result['manifest']['qc']['frames'],runFile=key+'.json')
            entry={'file':key+'.json','label':'原动作 · '+row['label'],'actionId':row['actionId'],'parameters':{},'origin':'original_atlas_angle_mapping','status':row['runStatus']}
            index['runs']=[r for r in index['runs'] if r['file']!=entry['file']]+[entry]
        except Exception as exc:
            row.update(runStatus='failed',runReason=str(exc));save(root/(key+'-failure.json'),{'actionId':row['actionId'],'exception':type(exc).__name__,'message':str(exc)})
        save(public/'opensim-coverage.json',coverage)
        index['coverage']=[{k:v for k,v in r.items() if k!='mappedTrajectory'} for r in coverage['coverage']];save(public/'opensim-index.json',index)
    print(json.dumps([{k:r[k] for k in ['actionId','status','runStatus']} for r in coverage['coverage']],ensure_ascii=False))
if __name__=='__main__':main()
