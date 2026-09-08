// Anatomical reference text is separate from the measured visualization audit.
// These descriptions do not certify or relocate the rendered endpoints.
const anatomy='https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-upper-limb/';
const correction='https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0267620';
const lumbricals='https://pmc.ncbi.nlm.nih.gov/articles/PMC11571722/';
const digits={2:'食指',3:'中指',4:'无名指',5:'小指'};
export const ATTACHMENT_REFERENCE={};
const put=(id,start,end,sources=[anatomy,correction])=>{
  ATTACHMENT_REFERENCE[id]={basis:'anatomical-reference',start,end,sources};
};
const radialOrigins={2:'第一、二掌骨相邻面',3:'第二、三掌骨相邻面',4:'第四掌骨掌侧桡侧面',5:'第五掌骨掌侧桡侧面'};
const ulnarOrigins={2:'第二掌骨掌侧尺侧面',3:'第三、四掌骨相邻面',4:'第四、五掌骨相邻面'};
for(const d of [2,3,4,5]){
  const digit=digits[d];
  // RI/UI designate a side in the model, not a universal dorsal/palmar identity.
  put('RI'+d,radialOrigins[d],`${digit}近节指骨基底桡侧及指背腱膜`);
  if(d<5)put('UI_UB'+d,ulnarOrigins[d],`${digit}指背腱膜尺侧束`);
  const origin=d<4?`${digit}指深屈肌腱桡侧`:`${digits[d-1]}、${digit}指深屈肌腱相邻面`;
  put('LU_RB'+d,origin,`${digit}指背腱膜桡侧束`,[lumbricals,anatomy]);
  put('FDS'+d,'肱骨内上髁、尺骨冠突及桡骨前缘',`${digit}中节指骨骨干两侧`,[anatomy,'https://pmc.ncbi.nlm.nih.gov/articles/PMC6025501/']);
}
put('PL','肱骨内上髁','掌腱膜',[anatomy]);
// UI_UB5 is not evidence for an anatomical "ulnar interosseous of digit 5".
// The XML explicitly anchors P1 to thirdmc and P5 to midph5. Report frames,
// not an invented bony insertion or an unverified reassignment to hypothenar muscle.
ATTACHMENT_REFERENCE.UI_UB5={basis:'model-frames',start:'第三掌骨',end:'小指中节指骨',
  sources:['MyoHand: myohand_body.xml / UI_UB5-P1 (thirdmc), UI_UB5-P5 (midph5)']};
