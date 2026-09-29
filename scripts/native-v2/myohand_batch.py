"""Generate bounded native MyoHand public replays; preserves failed cases."""
from pathlib import Path
import argparse
import json
import time
import myohand_runner as runner

def main(output):
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    cases=[('pulse','FDS2 · 原参数',{}),
      ('pulse-force125','FDS2 · 全肌肉力量×1.25',{'forceScale':1.25}),
      ('pulse-time150','FDS2 · 响应时间×1.5',{'activationTimeScale':1.5}),
      ('track-wrist','腕屈曲 · 新示范目标',{'mode':'tracking','coordinate':'flexion','amplitude_rad':.25,'duration_s':2.,'sampleInterval_s':.02,'actionId':'native:flexion:demo'}),
      ('track-index','食指MCP屈曲 · 新示范目标',{'mode':'tracking','coordinate':'mcp2_flexion','amplitude_rad':.5,'duration_s':2.,'sampleInterval_s':.02,'actionId':'native:mcp2_flexion:demo'})]
    index={'schemaVersion':2,'modelFile':'myohand-model.json','runs':[],'failures':[],
      'parameters':[{'key':'forceScale','label':'全部肌肉力量倍率','min':.5,'max':1.5,'step':.05,'default':1},
        {'key':'activationTimeScale','label':'响应时间倍率','min':.5,'max':2.,'step':.1,'default':1}], 'coverage':[]}
    for key,label,request in cases:
        file=f'myohand-run-{key}.json';start=time.perf_counter()
        try:
            result=runner.run(request);runner.write(output/file,result)
            index['runs'].append({'file':file,'label':label,'parameters':{'forceScale':result['manifest']['effective']['forceScale'],
              'activationTimeScale':result['manifest']['effective']['activationTimeScale']},'actionId':result['manifest']['effective']['actionId'],
              'status':result['manifest']['status'],'qc':result['manifest']['qc']})
            print(key,json.dumps(result['manifest']['qc']),time.perf_counter()-start,flush=True)
        except Exception as e:
            failure={'file':file,'label':label,'request':request,'status':'failed','error':str(e)}
            index['failures'].append(failure);runner.write(output/f'myohand-failed-{key}.json',failure);print('FAILED',key,str(e),flush=True)
        runner.write(output/'myohand-index.json',index)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',required=True,type=Path);a=p.parse_args();main(a.output)
