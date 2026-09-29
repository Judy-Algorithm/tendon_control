"""Bounded replay batch. No failed run is repaired by changing its request."""
import argparse,json,sys,traceback
from pathlib import Path
from opensim_run import run,save

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--model',required=True);ap.add_argument('--output',required=True);ap.add_argument('--public-dir',required=True);a=ap.parse_args()
    output=Path(a.output);public=Path(a.public_dir);output.mkdir(parents=True,exist_ok=True);public.mkdir(parents=True,exist_ok=True)
    base={'actionId':'native-index-flexion-demo','coordinate':'2mcp_flexion','targetRad':.25,'duration_s':2,'samples':51,'parameters':{'fmaxMultiplier':1,'optimalFiberLengthMultiplier':1,'tendonSlackLengthMultiplier':1}}
    cases=[('finger-baseline','食指 · 原参数',{}),('finger-fmax110','食指 · Fmax ×1.10',{'parameters':{**base['parameters'],'fmaxMultiplier':1.1}}),('finger-lopt105','食指 · lopt ×1.05',{'parameters':{**base['parameters'],'optimalFiberLengthMultiplier':1.05}}),('finger-lts105','食指 · lTS ×1.05',{'parameters':{**base['parameters'],'tendonSlackLengthMultiplier':1.05}}),('wrist-baseline','腕屈曲 · 原参数',{'actionId':'native-wrist-flexion-demo','coordinate':'flexion','targetRad':.2}),('finger-overload','食指 · 已声明20N外载荷',{'loadN':20})]
    rows=[]
    for key,label,changes in cases:
        request={**base,**changes,'runId':'opensim-'+key};directory=output/key;request_path=output/(key+'-request.json');save(request_path,request)
        try:
            existing=directory/'run.json'
            result=json.loads(existing.read_text()) if existing.exists() else run(a.model,request_path,directory)
            filename='opensim-'+key+'.json';(public/filename).write_text(json.dumps(result,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n')
            rows.append({'file':filename,'label':label,'parameters':request['parameters'],'actionId':request['actionId'],'status':result['manifest']['status'],'runId':request['runId'],'qc':result['manifest']['qc']})
            if key=='finger-baseline':save(public/'opensim-model.json',json.loads((directory/'inspector.json').read_text()))
        except Exception as e:
            failure={'request':request,'status':'failed','error':str(e),'traceback':traceback.format_exc()};save(output/(key+'-FAILURE.json'),failure)
            rows.append({'label':label,'parameters':request['parameters'],'actionId':request['actionId'],'status':'failed','reason':str(e)})
        previous=json.loads((public/'opensim-index.json').read_text()) if (public/'opensim-index.json').exists() else {}
        preserved=[r for r in previous.get('runs',[]) if r.get('file') not in {x.get('file') for x in rows}]
        save(public/'opensim-index.json',{**previous,'modelFile':'opensim-model.json','runs':rows+preserved,'parameters':[{'key':'fmaxMultiplier','label':'最大等长肌力倍率','min':.8,'max':1.2,'step':.01,'default':1},{'key':'optimalFiberLengthMultiplier','label':'最优肌纤维长度倍率','min':.8,'max':1.2,'step':.01,'default':1},{'key':'tendonSlackLengthMultiplier','label':'肌腱松弛长度倍率','min':.8,'max':1.2,'step':.01,'default':1}],'coverage':previous.get('coverage',[])})

if __name__=='__main__':main()
