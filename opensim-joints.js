import {WSY_COORDINATES,WSY_JOINT_NAMES,WSY_MOMENT_ARMS_MM} from './wsy-model-data.js';

export const OPENSIM_JOINT_NAMES=WSY_JOINT_NAMES;
export const OPENSIM_COORDINATE_NAMES=Object.freeze(Object.fromEntries(
  Object.entries(WSY_COORDINATES).map(([id,spec])=>[id,spec.coordinate])
));

function modelDof(dof){
  const spec=WSY_COORDINATES[dof.id];
  if(!spec)return null; // The target model has no independent thumb MCP ab/adduction coordinate.
  const momentCoordinate=spec.coordinate.split(' / ')[0];
  const moments=WSY_MOMENT_ARMS_MM[momentCoordinate]??{};
  const direction=id=>({
    id,label:id==='positive'?spec.positiveLabel:spec.negativeLabel,
    tendons:Object.entries(moments).filter(([,value])=>id==='positive'?value>0:value<0).map(([name])=>name),
  });
  const order=dof.directions?.map(d=>d.id)??['positive','negative'];
  const directions=[...new Set([...order,'positive','negative'])].map(direction);
  return {...dof,modelCoordinate:spec.coordinate,
    action:`${spec.positiveLabel}／${spec.negativeLabel}`,
    rangeLabel:'模型范围',range:{min:spec.min,max:spec.max,negativeLabel:spec.negativeLabel,positiveLabel:spec.positiveLabel},
    neutralMomentArmsMm:moments,directions};
}

export function withOpenSimJoint(joint){
  const modelJoint=WSY_JOINT_NAMES[joint.id];
  if(!modelJoint)throw new Error('Missing OpenSim joint name for '+joint.id);
  const dofs=joint.dofs.map(modelDof).filter(Boolean);
  if(!dofs.length)throw new Error('No target-model coordinate for '+joint.id);
  return {...joint,modelJoint,dofs,tendons:[...new Set(dofs.flatMap(d=>d.directions.flatMap(x=>x.tendons)))]};
}

export function coordinateDisplayName(dof){return dof.modelCoordinate;}

export function jointDisplayTitle(joint){
  const chinese=joint.title.replace(/ (CMC|MCP|PIP|DIP|IP)$/,'');
  return chinese+' · '+joint.dofs.map(dof=>dof.modelCoordinate).join(' / ');
}
