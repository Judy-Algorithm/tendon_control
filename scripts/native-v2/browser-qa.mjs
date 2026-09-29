import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.env.TEST_URL||'http://127.0.0.1:4181';
const out=process.env.QA_OUT||'test-output/native-v2';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const checks=[];const check=(n,v)=>{assert.ok(v,n);checks.push(n);};
async function loaded(engine){await page.goto(url+'/#'+engine+'/native');await page.waitForFunction(()=>document.querySelector('.nv-muscle')?.options.length>0);await page.locator('.nv-chart svg').waitFor();}
async function download(selector,name){const event=page.waitForEvent('download');await page.locator(selector).click();const d=await event;await d.saveAs(`${out}/${name}`);check(name+' nonempty',(await fs.stat(`${out}/${name}`)).size>100);}
try{
 await loaded('myohand');check('39 Myo muscles',await page.locator('.nv-muscle option').count()===39);check('23 Myo coordinates',await page.locator('.nv-coordinate option').count()===23);
 await page.screenshot({path:out+'/myohand-desktop.png'});
 await page.locator('.nv-save').click();await page.locator('[data-native-param="forceScale"]').fill('1.13');check('edited settings mark stale',(await page.locator('.nv-status').innerText()).includes('参数已改'));
 const live=await page.locator('.nv-solve').isEnabled();
 if(live){await page.locator('[data-native-param="activationTimeScale"]').fill('1.3');await page.locator('.nv-solve').click();await page.waitForFunction(()=>document.querySelector('.nv-status')?.textContent.includes('原生结果已加载'),{},{timeout:120000});check('new native parameters retained',await page.locator('[data-native-param="forceScale"]').inputValue()==='1.13');await download('[data-export="json"]','live-result.json');const result=JSON.parse(await fs.readFile(out+'/live-result.json','utf8'));check('fresh run force1.13',result.current.manifest.effective.forceScale===1.13);check('matched baseline retained',!!result.baseline);}
 await page.locator('.nv-chart-type').selectOption('response');await download('[data-export="png"]','response.png');await download('[data-export="svg"]','response.svg');await download('[data-export="csv"]','response.csv');
 check('CSV control and signed force units',(await fs.readFile(out+'/response.csv','utf8')).includes('signed_actuator_force'));
 await page.locator('.nv-chart-type').selectOption('torque');await download('[data-export="svg"]','channel-torque.svg');check('all channels in SVG',(await fs.readFile(out+'/channel-torque.svg','utf8')).includes('UI_UB5'));
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.querySelector('.explainer').scrollTop=0);await page.screenshot({path:out+'/myohand-mobile.png'});check('no page horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.setViewportSize({width:1440,height:1100});await loaded('opensim');check('43 SO muscles',await page.locator('.nv-muscle option').count()===43);await page.screenshot({path:out+'/opensim-desktop.png'});
 await page.locator('.nv-save').click();await page.locator('[data-native-param="fmaxMultiplier"]').fill('1.1');await page.locator('.nv-read-existing').click();
 await page.waitForFunction(()=>document.querySelector('.nv-run-note')?.textContent.includes('Fmax ×1.10'));
 check('OpenSim exact existing parameter result found',(await page.locator('.nv-comparison').isVisible()));
 await download('.nv-preset','opensim-fmax110-preset.json');
 const preset=JSON.parse(await fs.readFile(out+'/opensim-fmax110-preset.json','utf8'));
 check('preset contains native units and model hash',preset.units.q==='rad'&&/^[a-f0-9]{64}$/.test(preset.modelHash));
 await page.locator('.nv-chart-type').selectOption('balance');await download('[data-export="png"]','opensim-balance.png');
 await download('[data-export="json"]','opensim-fmax110-comparison.json');
 const pair=JSON.parse(await fs.readFile(out+'/opensim-fmax110-comparison.json','utf8'));
 check('comparison binds full43 native baseline and edited outputs',pair.current.muscleNames.length===43&&pair.baseline.muscleNames.length===43&&pair.comparison.changes.length===1);
 const scaled=await page.locator('.nv-runs option').evaluateAll(options=>options.find(o=>o.textContent.includes('Scale→IK'))?.value);if(scaled!==undefined){await page.locator('.nv-runs').selectOption(scaled);await page.waitForFunction(()=>document.querySelector('.nv-run-note')?.textContent.includes('Scale→IK'));await page.screenshot({path:out+'/opensim-scale-ik.png'});}
 await page.goto(url+'/#mano/shape');await page.locator('.mano-steps').waitFor();check('independent MANO page',await page.locator('.mano-steps button').count()===4);await page.locator('[data-step="keypoints"]').click();check('MANO 21 × 3 convention',(await page.locator('[data-detail]').textContent()).includes('21 × 3'));await page.screenshot({path:out+'/mano-keypoints.png'});
 await page.goto(url+'/#control');await page.locator('.joint-trigger').first().waitFor();check('atlas restored',await page.locator('.joint-trigger').count()===17);
 check('no uncaught JS errors',errors.length===0);
 await fs.writeFile(out+'/RESULTS.json',JSON.stringify({url,checks,errors,live,at:new Date().toISOString()},null,2));console.log(JSON.stringify({checks:checks.length,errors,live,out}));
}finally{await browser.close();}
