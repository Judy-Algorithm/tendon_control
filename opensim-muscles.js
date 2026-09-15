import {ATLAS} from './atlas-data.js';
import {ENDPOINTS} from './endpoint-data.js';

// The GeometryPath keys are the names stored in the OpenSim control-table model.
// Keep the Chinese atlas labels as secondary reading aids only.
const atlasById=new Map(ATLAS.tendons.map(tendon=>[tendon.id,tendon]));

const CONTROL_TABLE_MUSCLES=Object.keys(ENDPOINTS.tendons).map(modelName=>{
  const atlasEntry=atlasById.get(modelName);
  if(!atlasEntry)throw new Error(`OpenSim muscle is missing atlas metadata: ${modelName}`);
  return Object.freeze({...atlasEntry,modelName});
});

// APB and FPB are present in the user's ARMS OpenSim model but absent from the
// older 37-path web control table. Their default-pose GeometryPaths are aligned
// to this hand with the existing FPL/APL/EPB/EPL paths (endpoint RMS: 0.48 mm).
const ARMS_THUMB_MUSCLES=[
  Object.freeze({id:'APB',modelName:'APB',name:'拇短展肌',route:[[-.005115063,-.067011715,.004785563],[-.002626537,-.066666881,.016203645],[.013818666,-.105093612,.039643707],[.015846388,-.120334843,.046756527]]}),
  Object.freeze({id:'FPB',modelName:'FPB',name:'拇短屈肌',route:[[-.00654341,-.068236755,.001727068],[-.005927707,-.078616223,.009091466],[.003613659,-.102949967,.025813237],[.008519891,-.113461577,.033558723]]}),
];
export const OPENSIM_MUSCLES=Object.freeze([...CONTROL_TABLE_MUSCLES,...ARMS_THUMB_MUSCLES]);
