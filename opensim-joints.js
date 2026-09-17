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

export const OPENSIM_COORDINATE_NAMES=Object.freeze({
  wrist_flex:'flexion',wrist_abd:'deviation',
  thumb_CMC_flex:'cmc_flexion',thumb_CMC_abd:'cmc_abduction',
  thumb_MCP_flex:'mp_flexion',thumb_MCP_abd:null,
  thumb_IP_flex:'ip_flexion',
  index_MCP_flex:'2mcp_flexion',index_MCP_abd:'2mcp_abduction',
  index_PIP_flex:'2pm_flexion',index_DIP_flex:'2md_flexion',
  middle_MCP_flex:'3mcp_flexion',middle_MCP_abd:'3mcp_abduction',
  middle_PIP_flex:'3pm_flexion',middle_DIP_flex:'3md_flexion',
  ulnar_CMC_flex:'4cmc_flexion / CMC5_r1',
  ring_MCP_flex:'4mcp_flexion',ring_MCP_abd:'4mcp_abduction',
  ring_PIP_flex:'4pm_flexion',ring_DIP_flex:'4md_flexion',
  pinky_MCP_flex:'5mcp_flexion',pinky_MCP_abd:'5mcp_abduction',
  pinky_PIP_flex:'5pm_flexion',pinky_DIP_flex:'5md_flexion',
});

export function withOpenSimJoint(joint){
  const modelJoint=OPENSIM_JOINT_NAMES[joint.id];
  if(!modelJoint)throw new Error('Missing OpenSim joint name for '+joint.id);
  const dofs=joint.dofs.map(dof=>{
    if(!Object.hasOwn(OPENSIM_COORDINATE_NAMES,dof.id))throw new Error('Missing OpenSim coordinate mapping for '+dof.id);
    return {...dof,modelCoordinate:OPENSIM_COORDINATE_NAMES[dof.id]};
  });
  return {...joint,modelJoint,dofs};
}

export function coordinateDisplayName(dof){
  return dof.modelCoordinate??'\u6a21\u578b\u4e2d\u65e0\u72ec\u7acb Coordinate';
}

export function jointDisplayTitle(joint){
  const chinese=joint.title.replace(/ (CMC|MCP|PIP|DIP|IP)$/,'');
  const coordinates=joint.dofs.map(dof=>dof.modelCoordinate).filter(Boolean);
  return coordinates.length?chinese+' \u00b7 '+coordinates.join(' / '):chinese;
}
