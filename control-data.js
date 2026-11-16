import {ATLAS} from './atlas-data.js';
import {withOpenSimJoint} from './opensim-joints.js';

export const FOREARM_ROTATION=withOpenSimJoint({
  id:'joint_forearm_rotation',title:'前臂旋转',part:'手腕',location:'桡尺关节 radioulnar',anchor:'pro_sup',tendons:[],
  dofs:[{id:'forearm_rotation',action:'forearm_rotation',motion:{type:'forearm-rotation'},directions:[{id:'positive'},{id:'negative'}]}],
});

// Exact target-model coupling: CMC5_r1 = SimmSpline(4cmc_flexion),
// with endpoints (0,0) and (0.2032,0.5528) radians.
export const ULNAR_CMC=withOpenSimJoint({
  id:'joint_ulnar_cmc',title:'第4、5掌骨 CMC',part:'尺侧手掌',location:'CMC4 / CMC5',anchorBones:['4mc','5mc'],tendons:[],
  dofs:[{id:'ulnar_CMC_flex',action:'CMC 联动屈伸',angleLabel:'第4掌骨 / 第5掌骨',
    hint:'模型约束：4cmc_flexion 0–11.64°；CMC5_r1 由 SimmSpline 联动至 31.67°',
    motion:{type:'coupled-cmc',segments:[{digit:4,ratio:1},{digit:5,ratio:0.5528/0.2032}]},directions:[{id:'positive'},{id:'negative'}]}],
});

const modelJoints=ATLAS.joints.map(withOpenSimJoint);
export const JOINT_DISPLAY_ORDER=Object.freeze([
  'joint_forearm_rotation','joint_bone0','joint_bone1','joint_ulnar_cmc',
  'joint_bone2','joint_bone6','joint_bone11','joint_bone16','joint_bone21',
  'joint_bone3','joint_bone7','joint_bone12','joint_bone17','joint_bone22',
  'joint_bone8','joint_bone13','joint_bone18','joint_bone23',
]);
const jointById=new Map([...modelJoints,FOREARM_ROTATION,ULNAR_CMC].map(joint=>[joint.id,joint]));
export const CONTROLS={...ATLAS,joints:JOINT_DISPLAY_ORDER.map(id=>{
  const joint=jointById.get(id);if(!joint)throw new Error('Missing display joint '+id);return joint;
})};
