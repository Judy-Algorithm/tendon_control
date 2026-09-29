import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.env.TEST_URL||'http://127.0.0.1:4181';
const out=process.env.QA_OUT||'test-output/native-v2-fresh-opensim';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
async function save(selector,name){const event=page.waitForEvent('download');await page.locator(selector).click();await(await event).saveAs(`${out}/${name}`);}
try{
 await page.goto(url+'/#opensim/native');await page.waitForFunction(()=>document.querySelector('.nv-muscle')?.options.length===43);
 check('real local service available',await page.locator('.nv-solve').isEnabled());
 await page.locator('.nv-snapshot-name').fill('原生 SO 基线');await page.locator('.nv-save').click();
 await page.locator('[data-native-param="fmaxMultiplier"]').fill('1.07');await page.locator('.nv-snapshot-name').fill('全局最大等长力 ×1.07');
 const started=Date.now();await page.locator('.nv-solve').click();
 await page.waitForFunction(()=>document.querySelector('.nv-status')?.textContent.includes('原生结果已加载'),{},{timeout:920000});
 const browserJobWall_s=(Date.now()-started)/1000;
 await save('[data-export="json"]','comparison.json');
 const data=JSON.parse(await fs.readFile(out+'/comparison.json','utf8')),r=data.current,b=data.baseline;
 check('fresh Fmax multiplier1.07',r.manifest.request.parameters.fmaxMultiplier===1.07);
 check('baseline preserved',!!b&&b.manifest.request.parameters.fmaxMultiplier===1);
 check('exact model identity',r.manifest.modelHash===b.manifest.modelHash);
 check('full43 channels',r.muscleNames.length===43&&r.frames.every(f=>f.activation.length===43));
 check('same motion and load',JSON.stringify(r.frames.map(f=>f.q))===JSON.stringify(b.frames.map(f=>f.q))&&r.manifest.effective.loadN===b.manifest.effective.loadN);
 const maxActivationChange=Math.max(...r.frames.flatMap((f,i)=>f.activation.map((a,j)=>Math.abs(a-b.frames[i].activation[j]))));
 check('actual activation recomputation differs',maxActivationChange>1e-8);
 check('session result in selector',(await page.locator('.nv-runs option:checked').textContent()).includes('本会话'));
 await save('.nv-preset','parameters.json');
 const preset=JSON.parse(await fs.readFile(out+'/parameters.json','utf8'));check('exported preset exact model',preset.modelHash===r.manifest.modelHash&&preset.request.parameters.fmaxMultiplier===1.07);
 await page.locator('[data-native-param="fmaxMultiplier"]').fill('1.09');
 await page.locator('.nv-import-file').setInputFiles(out+'/parameters.json');
 await page.waitForFunction(()=>document.querySelector('[data-native-param="fmaxMultiplier"]')?.value==='1.07');check('preset import restores1.07',true);
 await page.locator('.nv-reset').click();
 for(const [chart,file] of [['activation','activation'],['torque','torque'],['balance','balance'],['sensitivity','sensitivity']]){
  await page.locator('.nv-chart-type').selectOption(chart);await save('[data-export="png"]',file+'.png');await save('[data-export="svg"]',file+'.svg');await save('[data-export="csv"]',file+'.csv');
 }
 await page.locator('.nv-comparison').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/comparison-desktop.png'});
 check('no uncaught browser errors',errors.length===0);
 const result={at:new Date().toISOString(),url,checks,errors,browserJobWall_s,maxActivationChange,runId:r.manifest.runId,modelHash:r.manifest.modelHash,nativeTiming_s:r.manifest.timing_s,qc:r.manifest.qc};
 await fs.writeFile(out+'/RESULTS.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
