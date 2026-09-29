"""Hash all active OpenSim replay dependencies without changing their bytes."""
import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[2];data=root/'explainer/native-v2/data';index=json.loads((data/'opensim-index.json').read_text())
names={'opensim-index.json',index['modelFile'],index['geometryFile'],index['coverageFile'],index['nativeActionsFile'],index['repairEvidenceFile']}
for r in index['runs']:
    names.add(r['file'])
    for field in ['modelFile','geometryFile']:
        if r.get(field):names.add(r[field])
for r in index.get('coverage',[]):
    if r.get('attemptEvidenceFile'):names.add(r['attemptEvidenceFile'])
rows=[{'file':n,'sha256':hashlib.sha256((data/n).read_bytes()).hexdigest(),'bytes':(data/n).stat().st_size} for n in sorted(names)]
out={'scope':'Active OpenSim index and referenced native replay/model/geometry dependencies; archived raw and superseded correspondence files are separate.','files':rows,'fileCount':len(rows),'totalBytes':sum(r['bytes'] for r in rows)}
(root/'docs/native-solver-v2/OPENSIM_ASSET_HASHES.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'files':len(rows),'bytes':out['totalBytes']}))
