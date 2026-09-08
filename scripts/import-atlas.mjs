import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

// Preserve the original public visualization assets, without its simulator/UI.
const source=execFileSync('git',['show','0513b54:index.html'],{maxBuffer:8*1024*1024}).toString();
const scripts=[...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const model=JSON.parse(source.match(/const MODEL = (.*);/)[1]);
await fs.mkdir('vendor',{recursive:true});
await fs.writeFile('vendor/three.min.js',scripts[0].trim()+'\n');
await fs.writeFile('vendor/orbit-controls.js',scripts[1].trim()+'\n');
await fs.writeFile('model-data.js','export const MODEL = '+JSON.stringify(model)+';\n');

// The argument is an analysis artifact, not a runtime dependency or published file.
const analysis=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const names={ECRL:'桡侧腕长伸肌',ECRB:'桡侧腕短伸肌',ECU:'尺侧腕伸肌',FCR:'桡侧腕屈肌',FCU:'尺侧腕屈肌',PL:'掌长肌',
  EDM:'小指伸肌',EIP:'示指固有伸肌',EPL:'拇长伸肌',EPB:'拇短伸肌',FPL:'拇长屈肌',APL:'拇长展肌',OP:'拇对掌肌'};
const parts={'2':'食指','3':'中指','4':'无名指','5':'小指'};
for(const digit of Object.keys(parts)){
  names['FDS'+digit]=`指浅屈肌 · ${parts[digit]}支`;
  names['FDP'+digit]=`指深屈肌 · ${parts[digit]}支`;
  names['EDC'+digit]=`指总伸肌 · ${parts[digit]}支`;
  names['RI'+digit]=`${parts[digit]}桡侧骨间肌通路`;
  names['LU_RB'+digit]=`${parts[digit]}蚓状肌—桡侧腱膜通路`;
  names['UI_UB'+digit]=digit==='5'?'小指尺侧肌腱通路（模型）':`${parts[digit]}尺侧骨间肌—尺侧腱膜通路`;
}
const fingerNumber={index:2,middle:3,ring:4,pinky:5};
function directionLabels(coordinate){
  if(coordinate==='thumb_CMC_flex')return ['伸展','弯曲'];
  if(coordinate.endsWith('_flex'))return ['弯曲','伸展'];
  if(coordinate==='wrist_abd')return ['桡偏','尺偏'];
  if(coordinate==='middle_MCP_abd')return ['桡偏','尺偏'];
  if(/^(ring|pinky)_MCP_abd$/.test(coordinate))return ['内收','外展'];
  return ['外展','内收'];
}
function nativeAnchor(coordinate){
  if(coordinate.startsWith('wrist'))return 'flexion';
  if(coordinate.startsWith('thumb')){
    if(coordinate.includes('CMC'))return 'cmc_flexion';
    if(coordinate.includes('MCP'))return 'mp_flexion';
    return 'ip_flexion';
  }
  const [finger,joint]=coordinate.split('_');
  return ({MCP:'mcp',PIP:'pm',DIP:'md'}[joint])+fingerNumber[finger]+'_flexion';
}
const groups=new Map();
for(const c of analysis.coordinates){
  const [positive,negative]=directionLabels(c.coordinate);
  if(!groups.has(c.joint_id)){
    const short=c.part==='手腕'?'腕关节':`${c.part} ${c.coordinate.split('_')[1]}`;
    groups.set(c.joint_id,{id:c.joint_id,title:short,part:c.part,location:c.joint,anchor:nativeAnchor(c.coordinate),dofs:[]});
  }
  const pairData=Object.fromEntries(analysis.pairs.filter(p=>p.coordinate===c.coordinate&&p.enabled&&p.detected).map(p=>[p.tendon,p.neutral_mm]));
  const directions=[
    {id:'positive',label:positive,tendons:c.neutral_positive},
    {id:'negative',label:negative,tendons:c.neutral_negative},
  ];
  // Always put the ordinary action first, independently of numeric q sign.
  const priority=['弯曲','外展','桡偏','伸展','内收','尺偏'];
  directions.sort((a,b)=>priority.indexOf(a.label)-priority.indexOf(b.label));
  groups.get(c.joint_id).dofs.push({id:c.coordinate,
    action:c.coordinate==='middle_MCP_abd'?'桡偏／尺偏':c.action.replace('屈曲／伸展','弯曲／伸展'),
    range:{min:c.min_deg,max:c.max_deg,negativeLabel:negative,positiveLabel:positive},
    directions,neutralMomentArmsMm:pairData});
}
const joints=[...groups.values()];
for(const joint of joints){
  joint.dofs.sort((a,b)=>Number(!a.id.endsWith('_flex'))-Number(!b.id.endsWith('_flex')));
  joint.tendons=[...new Set(joint.dofs.flatMap(d=>d.directions.flatMap(a=>a.tendons)))];
}
const atlas={joints,tendons:analysis.tendons.filter(t=>t.enabled).map(t=>({id:t.id,name:names[t.id],modelIndex:model.actuator_names.indexOf(t.id)}))};
if(joints.length!==16||joints.flatMap(j=>j.dofs).length!==23||atlas.tendons.length!==37)throw Error('Unexpected atlas dimensions');
if(atlas.tendons.some(t=>!t.name||t.modelIndex<0))throw Error('Unmapped tendon');
await fs.writeFile('atlas-data.js','export const ATLAS = '+JSON.stringify(atlas,null,2)+';\n');
await fs.mkdir('docs',{recursive:true});
await fs.writeFile('docs/data-provenance.json',JSON.stringify({geometry:{repository:'https://github.com/Judy-Algorithm/EMG2Tendon',commit:'0513b54',source:'public MyoHand'},
  controlTable:{model:analysis.meta.model_file,sha256:analysis.meta.model_sha256,opensimVersion:analysis.meta.opensim_version,neutralCoordinates:0,momentArmThresholdMm:analysis.meta.threshold_mm},
  coordinateDirectionOverrides:{thumb_CMC_flex:'positive q is extension, negative q is flexion',ring_MCP_abd:'positive q is adduction toward the middle finger',pinky_MCP_abd:'positive q is adduction toward the middle finger',middle_MCP_abd:'use radial/ulnar deviation to avoid ambiguous middle-finger abduction'},
  rendering:'The public MyoHand surface and tendon paths are a visual reference. The 16-joint/23-DoF ranges and associations are from the SHM OpenSim control table. No pose simulation or native MyoHand moment-arm claims are made.',
  attachmentDisplay:'attachment-catalog.js labels the displayed MyoHand geometry and equivalent endpoints. route-data.js contains regional visual-only fits; docs/attachment-audit.json records all 74 endpoints. endpoint-data.js retains the separate original SHM body-frame mapping, not the displayed attachment labels.'},null,2)+'\n');
console.log(`${joints.length} joints, ${joints.flatMap(j=>j.dofs).length} DoFs, ${atlas.tendons.length} tendons`);
