import {ATLAS} from './atlas-data.js';
import {ENDPOINTS} from './endpoint-data.js';

// The GeometryPath keys are the names stored in the OpenSim control-table model.
// Keep the Chinese atlas labels as secondary reading aids only.
const atlasById=new Map(ATLAS.tendons.map(tendon=>[tendon.id,tendon]));

export const OPENSIM_MUSCLES=Object.freeze(Object.keys(ENDPOINTS.tendons).map(modelName=>{
  const atlasEntry=atlasById.get(modelName);
  if(!atlasEntry)throw new Error(`OpenSim muscle is missing atlas metadata: ${modelName}`);
  return Object.freeze({...atlasEntry,modelName});
}));
