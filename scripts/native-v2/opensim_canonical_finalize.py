"""Publish the completed canonical fixture index, preserving all raw assets."""
import argparse,json,subprocess,sys
from pathlib import Path
from opensim_run import save
ap=argparse.ArgumentParser();ap.add_argument('--public-dir',required=True);ap.add_argument('--scale-ik-public',required=True);ap.add_argument('--geometry',required=True);args=ap.parse_args();public=Path(args.public_dir);scale=Path(args.scale_ik_public);index=json.loads((public/'opensim-canonical-index.json').read_text());root=Path(__file__).resolve().parents[2]
if len(index['runs'])!=47 or index.get('failedAttempts'):raise ValueError('Canonical core has missing whole-run outputs; preserve evidence and diagnose before index switch')
repair=json.loads((root/'docs/native-solver-v2/OPENSIM_CANONICAL_REPAIR.json').read_text());save(public/'opensim-canonical-repair.json',repair)
warning='Native source-specific wrapping is preserved. Some flexed poses retain wrapping/path asymmetry versus the mirrored RIGHT template; no anatomical mirror-equivalence or physiological-identification claim. A separate FDPI range diagnostic did not resolve it and was not promoted.'
index['modelLimitations']=[warning]
for entry in index['runs']:
    p=public/entry['file'];d=json.loads(p.read_text());d['manifest']['limitations'].append(warning);p.write_text(json.dumps(d,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n')
p=public/index['modelFile'];model=json.loads(p.read_text());model['limitations']=[warning];save(p,model)
for suffix in ['roundtrip','model','evidence']:
    source=scale/f'opensim-scale-ik-{suffix}.json';d=json.loads(source.read_text())
    if suffix=='roundtrip':d['manifest']['canonicalRepair']={'id':repair['repairId'],'evidenceFile':'opensim-canonical-repair.json','rawModelHash':repair['sourceModelHash']};d['manifest']['artifactAlias']='opensim-canonical-scale-ik-roundtrip';d['manifest']['limitations'].append(warning)
    if suffix=='model':d['limitations']=[warning]
    (public/f'opensim-canonical-scale-ik-{suffix}.json').write_text(json.dumps(d,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n')
subprocess.run([sys.executable,str(root/'scripts/native-v2/opensim_meshes.py'),'--model-json',str(public/'opensim-canonical-scale-ik-model.json'),'--geometry',args.geometry,'--output',str(public/'opensim-canonical-scale-ik-geometry.json')],check=True)
d=json.loads((public/'opensim-canonical-scale-ik-roundtrip.json').read_text());entry={'file':'opensim-canonical-scale-ik-roundtrip.json','label':'原生Scale→IK→ID→SO · 合成标记自检','actionId':d['manifest']['request']['actionId'],'parameters':{},'status':d['manifest']['status'],'modelFile':'opensim-canonical-scale-ik-model.json','geometryFile':'opensim-canonical-scale-ik-geometry.json'};index['runs'].append(entry);index['fileMap']['opensim-scale-ik-roundtrip.json']=entry['file']
coverage=json.loads((public/'opensim-canonical-coverage.json').read_text());by_action={r['actionId']:r for r in index['runs'] if r.get('origin')=='original_atlas_angle_mapping'}
for row in coverage['coverage']:
    if row['status']=='mapped':
        e=by_action[row['actionId']];d=json.loads((public/e['file']).read_text());row.update(runFile=e['file'],runStatus=d['manifest']['status'],acceptedFrames=d['manifest']['qc']['acceptedFrames'],attemptedFrames=d['manifest']['qc']['frames'])
coverage['modelId']='opensim-arms-left-repaired-v1-full43';save(public/'opensim-canonical-coverage.json',coverage);index['coverage']=[{k:v for k,v in r.items() if k!='mappedTrajectory'} for r in coverage['coverage']]
ledger=json.loads((public/'opensim-native-actions.json').read_text())
for row in ledger['actions']+ledger.get('supplementalDemonstrations',[]):
    if row.get('runFile'):
        row['runFile']=index['fileMap'][row['runFile']];d=json.loads((public/row['runFile']).read_text());row.update(status=d['manifest']['status'],runStatus=d['manifest']['status'],acceptedFrames=d['manifest']['qc']['acceptedFrames'],attemptedFrames=d['manifest']['qc']['frames'])
ledger['modelId']='opensim-arms-left-repaired-v1-full43';save(public/'opensim-canonical-native-actions.json',ledger)
index['canonicalScope']='Repaired native LEFT model; mesh reflection, two moving-point functions and19wrapquadrants repaired before all native runs. Original raw model/results remain under legacy-raw-index.json.'
save(public/'opensim-canonical-index.json',index);save(public/'opensim-index.json',index)
print(json.dumps({'activeRuns':len(index['runs']),'canonicalHash':index['canonicalModelHash'],'legacyIndex':index['legacyIndexFile']}))
