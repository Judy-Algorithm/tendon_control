"""Register the separately labelled supplemental CMC4 native replay."""
import json
from pathlib import Path
from opensim_run import save
root=Path(__file__).resolve().parents[2]/'explainer/native-v2/data';name='opensim-native-cmc4-midrange.json';d=json.loads((root/name).read_text());p=root/'opensim-index.json';index=json.loads(p.read_text())
entry={'file':name,'label':'原生新示范 · CMC4 半范围0.1016rad','actionId':d['manifest']['request']['actionId'],'parameters':{},'origin':'supplemental_native_midrange_not_original_atlas','group':'native-independent-coordinate','status':d['manifest']['status']}
index['runs']=[x for x in index['runs'] if x.get('file')!=name]+[entry];save(p,index)
p=root/'opensim-native-actions.json';ledger=json.loads(p.read_text());ledger['supplementalDemonstrations']=[{'coordinate':'4cmc_flexion','targetRad':.1016,'runFile':name,'status':d['manifest']['status'],'acceptedFrames':d['manifest']['qc']['acceptedFrames'],'attemptedFrames':d['manifest']['qc']['frames'],'reason':'另设半范围示范；固定±0.25rad请求仍保留为该幅度不支持，并未被替换'}]
for row in ledger['actions']:
    if row['status']=='unsupported':row['reason']='固定±0.25rad幅度超出该原生坐标范围；坐标本身存在，未缩短请求'
save(p,ledger)
