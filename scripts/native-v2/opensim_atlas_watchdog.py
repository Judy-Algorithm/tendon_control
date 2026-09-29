"""Bound existing atlas worker attempts by their original creation time.

The old supervisor is stopped on first timeout to prevent ProcessPoolExecutor
from cascading termination to another worker that has remaining wall budget.
Only verified owned worker PIDs are signalled. No failed native solve is retried.
"""
import argparse,json,os,signal,subprocess,time
from pathlib import Path
from opensim_run import save
ap=argparse.ArgumentParser();ap.add_argument('--root',required=True);ap.add_argument('--supervisor',type=int,required=True);ap.add_argument('--workers',type=int,nargs='+',required=True);ap.add_argument('--limit',type=float,default=900);args=ap.parse_args();root=Path(args.root);paused=False;events=[]
def command(pid):
    p=subprocess.run(['ps','-p',str(pid),'-o','stat=','-o','command='],capture_output=True,text=True);parts=p.stdout.strip().split(maxsplit=1)
    return '' if len(parts)<2 or parts[0].startswith('Z') else parts[1]
def current_folder(pid):
    p=subprocess.run(['lsof','-p',str(pid),'-Fn'],capture_output=True,text=True)
    files=[Path(x[1:]) for x in p.stdout.splitlines() if x.startswith('n') and x.endswith('/official_so.log')]
    return next((p.parent for p in files if p.parent.parent==root),None)
def stop_worker(pid,reason):
    c=command(pid);assert 'multiprocessing.spawn' in c,(pid,c)
    os.kill(pid,signal.SIGTERM);time.sleep(1)
    if command(pid):os.kill(pid,signal.SIGKILL)
    events.append({'pid':pid,'event':reason,'time_epoch':time.time()})
while True:
    live=[pid for pid in args.workers if command(pid)]
    if not live:break
    attempts=[root/p.name.removesuffix('-request.json') for p in root.glob('*-request.json')]
    if paused and len(attempts)==14 and all((p/'run.json').exists() or (p/'TIMEOUT.json').exists() for p in attempts):
        for pid in live:stop_worker(pid,'all_scoped_attempts_terminal_cleanup')
        continue
    for pid in live:
        folder=current_folder(pid)
        if folder is None:continue
        req=folder/'request.json'
        if not req.exists():continue
        start=req.stat().st_birthtime;elapsed=time.time()-start
        if (folder/'run.json').exists():
            if paused:
                time.sleep(2)
                if current_folder(pid)==folder:stop_worker(pid,'finished_worker_cleanup_after_supervisor_pause')
            continue
        if elapsed<args.limit:continue
        if not paused:
            c=command(args.supervisor);assert 'opensim_atlas_v2.py' in c and str(root) in c,c
            os.kill(args.supervisor,signal.SIGSTOP);paused=True
        # Revalidate the exact attempt immediately before a scoped timeout kill.
        if current_folder(pid)!=folder or (folder/'run.json').exists():continue
        event={'status':'TIMEOUT','wallTimeLimit_s':args.limit,'elapsed_s':elapsed,'startedAtEpoch':start,'startEvidence':'request.json filesystem birth time; original attempt, not watchdog start','terminatedPid':pid,'verifiedProcessCommand':command(pid),'runId':folder.name,'partialOutputPolicy':'Logs/partial files preserved; no complete trajectory or activation result inferred.'}
        save(folder/'TIMEOUT.json',event);stop_worker(pid,'wall_time_limit');print(json.dumps(event),flush=True)
    save(root/'watchdog-status.json',{'pausedSupervisor':paused,'events':events,'checkedAtEpoch':time.time(),'livePids':live})
    time.sleep(2)
if paused and command(args.supervisor):
    c=command(args.supervisor);assert 'opensim_atlas_v2.py' in c
    os.kill(args.supervisor,signal.SIGTERM);os.kill(args.supervisor,signal.SIGCONT)
save(root/'watchdog-result.json',{'status':'DONE','pausedSupervisor':paused,'events':events,'completedAtEpoch':time.time()});print('WATCHDOG_DONE',flush=True)
