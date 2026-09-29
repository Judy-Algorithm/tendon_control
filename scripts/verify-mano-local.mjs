// Compare all raw-coordinate vertices with the independently computed local
// numpy reference. Output metrics only; never publish input arrays.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {validateMano,manoForward} from '../explainer/native-v2/mano-math.js';
const [modelPath,referencePath,reportPath]=process.argv.slice(2);
if(!modelPath||!referencePath||!reportPath)throw Error('Usage: node verify-mano-local.mjs MODEL REFERENCE REPORT');
const model=validateMano(JSON.parse(await fs.readFile(modelPath,'utf8'))),reference=JSON.parse(await fs.readFile(referencePath,'utf8'));
const errors=reference.cases.map(c=>{const result=manoForward(model,c.betas,c.pose);assert.equal(c.vertices.length,result.vertices.length);return Math.max(...result.vertices.map((x,i)=>Math.abs(x-c.vertices[i])));});
assert.ok(errors.every(e=>e<1e-10));
const report={status:'PASS',modelSha256:model.sourceSha256,hand:model.hand,vertices:model.vertexCount,cases:errors.length,maxAbsVertexError_m:Math.max(...errors),perCaseMaxAbsError_m:errors,reference:'independent local EgoPressure numpy LBS',boundary:'Numerical forward-pass equivalence; not anatomical or musculoskeletal validation.',at:new Date().toISOString()};
await fs.writeFile(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
