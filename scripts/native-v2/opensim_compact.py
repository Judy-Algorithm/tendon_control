"""Lossless JSON serialization for generated public OpenSim assets (no rounding)."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]/'explainer/native-v2/data'
for path in root.glob('opensim*.json'):
    value=json.loads(path.read_text());path.write_text(json.dumps(value,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n')
