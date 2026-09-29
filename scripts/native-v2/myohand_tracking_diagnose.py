"""Bounded controller diagnostics. Preserves candidate traces outside public index."""
import argparse
import json
from pathlib import Path
import numpy as np
import scipy.optimize
import mujoco as mj
import myohand_runner_v1 as runner

def custom_controller(m,d,target,r):
    q,qd,qdd=target;M=np.zeros((23,23));mj.mj_fullM(m,M,d.qM)
    b=M@(qdd+r['kp']*(q-d.qpos)+r['kd']*(qd-d.qvel))+d.qfrc_bias-d.qfrc_passive-d.qfrc_applied
    gains=np.array([mj.mju_muscleGain(d.actuator_length[i],d.actuator_velocity[i],m.actuator_lengthrange[i],m.actuator_acc0[i],m.actuator_gainprm[i,:9]) for i in range(39)])
    biases=np.array([mj.mju_muscleBias(d.actuator_length[i],m.actuator_lengthrange[i],m.actuator_acc0[i],m.actuator_biasprm[i,:9]) for i in range(39)])
    R=runner.moment(m,d).T;A=R*gains;b-=R@biases
    if MODE=='acceleration':AA=np.linalg.solve(M,A);bb=np.linalg.solve(M,b);reg=.03
    elif MODE=='diagonal':AA=A/np.diag(M)[:,None];bb=b/np.diag(M);reg=.03
    else:AA=A;bb=b;reg=.0001
    fit=scipy.optimize.lsq_linear(np.vstack([AA,reg*np.eye(39)]),np.r_[bb,np.zeros(39)],bounds=(runner.CTRL_MIN,runner.CTRL_MAX),tol=1e-7,max_iter=100,method='bvls')
    desired=fit.x;tau=np.where(desired>d.act,m.actuator_dynprm[:,0]*(.5+1.5*d.act),m.actuator_dynprm[:,1]/(.5+1.5*d.act))
    ctrl=np.clip(d.act+(desired-d.act)*tau/.02,runner.CTRL_MIN,runner.CTRL_MAX)
    return ctrl,{'optimizerSuccess':bool(fit.success),'allocationResidual_Nm':float(np.max(np.abs(A@desired-b)))}

def main(data,output):
    global MODE
    output=Path(output);data=Path(data);rows=[]
    for case in ['index_PIP_flex-negative','middle_PIP_flex-negative','thumb_CMC_flex-negative']:
        original=json.loads((data/f'myohand-run-atlas-{case}.json').read_text());request=original['manifest']['request']
        for mode,kp,kd in [('torque',100,20),('acceleration',100,20),('diagonal',100,20),('acceleration',300,35),('diagonal',300,35)]:
            MODE=mode;runner.controller=custom_controller
            result=runner.run({**request,'kp':kp,'kd':kd});name=f'{case}-{mode}-{kp}'
            result['manifest']['diagnosticController']={'mode':mode,'kp':kp,'kd':kd,'generator':'myohand_tracking_diagnose.py'}
            runner.write(output/(name+'.json'),result)
            row={'case':case,'mode':mode,'kp':kp,'kd':kd,'qc':result['manifest']['qc']};rows.append(row);print(json.dumps(row),flush=True)
    runner.write(output/'diagnostic-summary.json',rows)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--data',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();main(a.data,a.output)
