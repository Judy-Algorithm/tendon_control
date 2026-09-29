// Generate a new, non-overwriting release inventory from the actual active indexes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),output=process.argv[2];
if(!output)throw new Error('Provide a new output directory');
await fs.mkdir(output,{recursive:false});
const read=async f=>JSON.parse(await fs.readFile(path.join(root,'explainer/native-v2/data',f),'utf8'));
const report={createdAt:new Date().toISOString(),baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),note:'Pre-commit content inventory. Publication SHA is recorded separately after push/deployment.',engines:{}};
for(const engine of ['opensim','myohand']){
 const index=await read(engine+'-index.json'),model=await read(index.modelFile),records=[];
 for(const item of index.runs){const r=await read(item.file),q=r.manifest.qc||{};records.push({file:item.file,runId:r.manifest.runId,actionId:item.actionId,status:r.manifest.status,modelHash:r.manifest.modelHash,frames:r.frames.length,numericalPassed:engine==='myohand'?q.numericPassed:q.acceptedFrames===r.frames.length,acceptedFrames:engine==='myohand'?(q.numericPassed?r.frames.length:0):q.acceptedFrames,trackingAccepted:q.trackingAccepted??null});}
 const cohort=index.coverage||[],statuses=Object.fromEntries([...new Set(cohort.map(x=>x.status))].map(s=>[s,cohort.filter(x=>x.status===s).length]));
 const props=model.configurationRegistry;
 report.engines[engine]={modelId:model.modelId||model.manifest?.modelId,modelHash:model.modelHash||model.manifest?.modelHash,muscleChannels:model.muscles.length,independentCoordinates:engine==='opensim'?model.counts.independentCoordinates:model.coordinateNames.length,atlasActions:cohort.length,atlasStatusCounts:statuses,originalAtlas:cohort,activeRunCount:records.length,activeFrameCount:records.reduce((s,r)=>s+r.frames,0),acceptedFrameCount:records.reduce((s,r)=>s+(r.acceptedFrames||0),0),fullyNumericalRuns:records.filter(x=>x.numericalPassed).length,partialOrFailedNumericalRuns:records.filter(x=>!x.numericalPassed).length,trackingPassedRuns:records.filter(x=>x.trackingAccepted===true).length,trackingRejectedRuns:records.filter(x=>x.trackingAccepted===false).length,records,editableMuscleFields:engine==='opensim'?{perMuscle:3,totalPerMuscleSlots:129,globalMultipliers:3}:{perMuscle:2,totalPerMuscleSlots:78,globalMultipliers:2},inspectable:props?{modelProperties:props.modelProperties.length,coordinatePropertyEntries:props.coordinateProperties.reduce((s,r)=>s+r.nativeProperties.length,0),musclePropertyEntries:props.muscleNativeProperties.reduce((s,r)=>s+r.nativeProperties.length,0),bodyPropertyEntries:model.bodies.reduce((s,r)=>s+r.nativeProperties.length,0),jointPropertyEntries:model.joints.reduce((s,r)=>s+r.nativeProperties.length,0),constraintPropertyEntries:model.constraints.reduce((s,r)=>s+r.nativeProperties.length,0),solverDefaultProperties:props.staticOptimizationDefaults.length,note:'Owner/property records; nested summaries and derived/default fields are not independent physiological parameters.'}:{compiledModelFields:Object.keys(model.compiledModel).length,compiledOptionsFields:Object.keys(model.compiledOptions).length,muscleRecords:model.muscles.length,note:'Large arrays summarized; not every compiled field is editable or a free physiological parameter.'}};
}
const files=[];
async function walk(relative){for(const entry of await fs.readdir(path.join(root,relative),{withFileTypes:true})){const rel=path.join(relative,entry.name);if(entry.isDirectory()){if(entry.name!=='__pycache__')await walk(rel);}else if(entry.isFile()){const bytes=await fs.readFile(path.join(root,rel));files.push({path:rel,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
for(const dir of ['explainer/native-v2','scripts/native-v2'])await walk(dir);
await fs.writeFile(path.join(output,'COUNTS.json'),JSON.stringify(report,null,2)+'\n');
await fs.writeFile(path.join(output,'SHA256.json'),JSON.stringify(files,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(report.engines).map(([k,e])=>[k,{runs:e.activeRunCount,frames:e.activeFrameCount,accepted:e.acceptedFrameCount,atlas:e.atlasStatusCounts}]))));
