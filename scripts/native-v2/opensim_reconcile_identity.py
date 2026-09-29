"""Restore executed request identity after a public filename-only alias change."""
import argparse,json,hashlib
from pathlib import Path
ap=argparse.ArgumentParser();ap.add_argument('--public-run',required=True);ap.add_argument('--recorded-run',required=True);args=ap.parse_args();p=Path(args.public_run);d=json.loads(p.read_text());native=json.loads(Path(args.recorded_run).read_text())
assert len(d['frames'])==len(native['frames'])
for a,b in zip(d['frames'],native['frames']):
    for field in ['time_s','q','qAll','activation','force_N','torque_Nm','balanceResidual_Nm']:assert a[field]==b[field]
d['manifest']['artifactAlias']=p.stem
for field in ['runId','request','cacheKey']:d['manifest'][field]=native['manifest'][field]
expected=hashlib.sha256((d['manifest']['modelHash']+json.dumps(d['manifest']['request'],sort_keys=True)+d['manifest']['engineVersion']).encode()).hexdigest();assert d['manifest']['cacheKey']==expected
p.write_text(json.dumps(d,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n')
