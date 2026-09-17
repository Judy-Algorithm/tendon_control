export const OPENSIM_JOINT_NAMES=Object.freeze({
  joint_bone0:'radiocarpal',
  joint_bone1:'CMC1a / CMC1b',
  joint_bone2:'MCP',
  joint_bone3:'IP',
  joint_bone6:'_2MCP',
  joint_bone7:'_2prox-midph_b',
  joint_bone8:'_2mid-distph',
  joint_bone11:'_3MCP',
  joint_bone12:'_3prox-midph_b',
  joint_bone13:'_3mid-distph',
  joint_ulnar_cmc:'CMC4 / CMC5',
  joint_bone16:'_4MCP',
  joint_bone17:'_4prox-midph_b',
  joint_bone18:'_4mid-distph',
  joint_bone21:'_5MCP',
  joint_bone22:'_5prox-midph_b',
  joint_bone23:'_5mid-distph',
});

export function withOpenSimJoint(joint){
  const modelJoint=OPENSIM_JOINT_NAMES[joint.id];
  if(!modelJoint)throw new Error('Missing OpenSim joint name for '+joint.id);
  return {...joint,modelJoint};
}

export function jointDisplayTitle(joint){
  const chinese=joint.title.replace(/ (CMC|MCP|PIP|DIP|IP)$/,'');
  return joint.modelJoint?chinese+' \u00b7 '+joint.modelJoint:joint.title;
}
