import {ATLAS} from './atlas-data.js';

// Supplemental visualization controls are separate from the measured SHM atlas.
// These ranges and the fixed 1:2 coupling are demonstration parameters, not measured ROM.
export const ULNAR_CMC={
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
};
const insertAt=ATLAS.joints.findIndex(j=>j.part==='无名指');
export const CONTROLS={...ATLAS,joints:[
  ...ATLAS.joints.slice(0,insertAt),ULNAR_CMC,...ATLAS.joints.slice(insertAt)
]};
