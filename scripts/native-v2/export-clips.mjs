import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {CONTROLS} from '../../control-data.js';
import {MODEL} from '../../model-data.js';
import {motionRange,angleAt,buildRig} from '../../motion.js';

const sourceFiles=['motion-controller.js','motion.js','control-data.js','atlas-data.js'];
const hashes=Object.fromEntries(await Promise.all(sourceFiles.map(async file=>[file,createHash('sha256').update(await fs.readFile(new URL('../../'+file,import.meta.url))).digest('hex')])));
const actions=CONTROLS.joints.flatMap(joint=>joint.dofs.flatMap(dof=>dof.directions.map(direction=>{
 const range=motionRange(dof,direction),rig=buildRig(MODEL,joint,dof),duration_s=2.4;
 return {id:`${dof.id}:${direction.id}`,jointId:joint.id,dofId:dof.id,label:`${joint.title} · ${direction.label}`,direction:direction.id,
  modelCoordinateHint:dof.modelCoordinate,displayAxis:rig.axis||null,displayPivot:rig.pivot||null,inferredAxis:!!rig.inferred,
  components:rig.components?.map(r=>({id:r.id,ratio:r.ratio,axis:r.axis,pivot:r.pivot}))||[],
  displayedTendonAssociations:direction.tendons,associationMeaning:'atlas geometry association, not solved activation',
  original:{...range,unit:'degree',duration_s,easing:'p²(3−2p)',loop:false,returnSegment:false,atStart:range.prepositioned?'prepositioned':'neutral'},
  times_s:Array.from({length:121},(_,i)=>i*.02),angles_deg:Array.from({length:121},(_,i)=>angleAt(range,i/120)),
  nativeMappingStatus:'requires_engine_audit',status:'not_run'};
})));
const result={schemaVersion:1,sourceHashes:hashes,groupCount:CONTROLS.joints.length,actionCount:actions.length,notes:['Canonical 2.4 second original playback; actual wall clock may lengthen when frame time is capped at 80 ms.','Native axis/ROM/coupling validation is separate; modelCoordinateHint is not certified correspondence.','Cubic easing has nonzero endpoint acceleration; no endpoint hold has been silently appended.'],actions};
await fs.mkdir(new URL('../../explainer/native-v2/data/',import.meta.url),{recursive:true});
await fs.writeFile(new URL('../../explainer/native-v2/data/action-catalog.json',import.meta.url),JSON.stringify(result));
console.log(JSON.stringify({groups:result.groupCount,actions:result.actionCount}));
