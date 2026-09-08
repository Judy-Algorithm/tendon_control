// Descriptions of the geometry actually displayed, not SHM body-frame labels.
// The source SHM mapping remains separately preserved in endpoint-data.js.
const site=(label,bone,kind='bone')=>({label:kind==='model-anchor'?`${label}（待核定）`:label,bone,kind});
const outside=()=>site('上臂起点（骨骼未显示）',null,'outside-mesh');
export const ATTACHMENT_CATALOG={};
const catalog=ATTACHMENT_CATALOG;
const digits={2:'食指',3:'中指',4:'无名指',5:'小指'};
const put=(id,start,end)=>{catalog[id]={start,end};};
for(const [id,d]of [['ECRL',2],['ECRB',3],['ECU',5],['FCR',2],['FCU',5]])put(id,outside(),site(`${digits[d]}掌骨基底`,d+'mc'));
put('PL',outside(),site('掌腱膜区域（等效）',null,'soft-tissue-equivalent'));
for(const d of [2,3,4,5]){
  const name=digits[d];
  put('FDS'+d,d>3?outside():site('前臂等效起点',null,'model-anchor'),site(`${name}中节指骨骨干`,d+'midph'));
  put('FDP'+d,site('尺骨', 'ulna'),site(`${name}远节指骨基底`,d+'distph'));
  put('EDC'+d,outside(),site(`${name}远节指骨（腱膜终末支）`,d+'distph'));
  put('RI'+d,d<4?site(`${name}掌骨（等效骨性支）`,d+'mc'):site('骨间肌等效起点',null,'model-anchor'),site(`${name}近节指骨（等效骨性支）`,d+'proxph'));
  put('LU_RB'+d,site('软组织等效起点',null,'soft-tissue-equivalent'),site(`${name}桡侧腱膜等效末端`,null,'soft-tissue-equivalent'));
  put('UI_UB'+d,site('骨间肌等效起点',null,'model-anchor'),site(`${name}尺侧腱膜等效末端`,null,'soft-tissue-equivalent'));
}
put('EDM',outside(),site('小指远节指骨（腱膜终末支）','5distph'));
put('EIP',site('尺骨','ulna'),site('食指远节指骨（腱膜终末支）','2distph'));
put('EPL',site('尺骨','ulna'),site('拇指远节指骨基底','thumbdist'));
put('EPB',site('桡骨','radius'),site('拇指近节指骨基底','thumbprox'));
put('FPL',site('桡骨','radius'),site('拇指远节指骨基底','thumbdist'));
put('APL',site('桡骨','radius'),site('拇指掌骨基底','1mc'));
put('OP',site('大多角骨区域','trapezium'),site('拇指掌骨骨干','1mc'));
export function endpointText(id){const {start,end}=catalog[id];return `起止位置：${start.label} → ${end.label}`;}
