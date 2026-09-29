"""Publish a path-safe measured summary of the private FDPI v2 diagnostic."""
import argparse,json
from opensim_run import save
ap=argparse.ArgumentParser();ap.add_argument('--input',required=True);ap.add_argument('--output',required=True);a=ap.parse_args();d=json.load(open(a.input))
summary={'status':'DIAGNOSTIC_ONLY_NOT_ACTIVE','conclusion':'Restricting FDPI to the three declared adjacent wrap segments did not reduce the measured mirror discrepancy in these poses. No active model change was justified by this diagnostic.','sourceHashes':d['sourceHashes'],'changes':d['changes'],'cases':[{'pose':c['pose'],'values_rad':c['values_rad'],'comparisons':c['comparisons'],'fdpiNativePathNodes':{k:v['fdpiPathNodes'] for k,v in c['native'].items()}} for c in d['cases']],'scope':d['scope']};save(a.output,summary)
