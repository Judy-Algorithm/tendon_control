"""Add freshly evaluated fitted-marker positions to an existing native replay.

Does not rerun, relabel, or modify the recorded SO arrays or acceptance results.
"""
import argparse,json
from pathlib import Path
import opensim as o
from opensim_run import vec,save
ap=argparse.ArgumentParser();ap.add_argument('--model',required=True);ap.add_argument('--run',required=True);args=ap.parse_args()
o.Logger.setLevelString('error');m=o.Model(args.model);s=m.initSystem();p=Path(args.run);d=json.loads(p.read_text())
for frame in d['frames']:
    for name,value in zip(d['allCoordinateNames'],frame['qAll']):m.getCoordinateSet().get(name).setValue(s,value,False)
    m.realizePosition(s);frame['fittedMarkers_m']=[vec(m.getMarkerSet().get(name).getLocationInGround(s)) for name in d['markerNames']]
d['manifest']['markerOverlayProvenance']='Observed: synthetic input TRC; fitted: native Marker.getLocationInGround at the exported SO coordinate state.'
save(p,d)
