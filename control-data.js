import {ATLAS} from './atlas-data.js';
import {withOpenSimJoint} from './opensim-joints.js';

// Supplemental visualization controls are separate from the measured SHM atlas.
// These ranges and the fixed 1:2 coupling are demonstration parameters, not measured ROM.
export const ULNAR_CMC=withOpenSimJoint({
  id:'joint_ulnar_cmc',title:'第4、5掌骨 CMC',part:'尺侧手掌',
  location:'第4、5腕掌关节 CMC',anchorBones:['4mc','5mc'],
  supplemental:true,tendons:[],
  dofs:[{
    id:'ulnar_CMC_flex',action:'CMC 联动屈伸',rangeLabel:'示意范围（第5掌骨）',
    angleLabel:'第5掌骨',
    hint:'第4掌骨 0–10° · 第5掌骨 0–20°（联动示意）',
    motion:{type:'coupled-cmc',segments:[{digit:4,ratio:.5},{digit:5,ratio:1}]},
    range:{min:0,max:20,negativeLabel:'伸回',positiveLabel:'屈曲'},
    directions:[
      {id:'positive',label:'屈曲 Flexion',tendons:[]},
      {id:'negative',label:'伸回中立位',tendons:[]}
    ]
  }]
});
const modelJoints=ATLAS.joints.map(withOpenSimJoint);
export const JOINT_DISPLAY_ORDER=Object.freeze([
  'joint_bone0',
  'joint_bone1','joint_ulnar_cmc',
  'joint_bone2','joint_bone6','joint_bone11','joint_bone16','joint_bone21',
  'joint_bone3','joint_bone7','joint_bone12','joint_bone17','joint_bone22',
  'joint_bone8','joint_bone13','joint_bone18','joint_bone23',
]);
const jointById=new Map([...modelJoints,ULNAR_CMC].map(joint=>[joint.id,joint]));
export const CONTROLS={...ATLAS,joints:JOINT_DISPLAY_ORDER.map(id=>{
  const joint=jointById.get(id);
  if(!joint)throw new Error('Missing display joint '+id);
  return joint;
})};
