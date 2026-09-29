import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.env.TEST_URL||'http://127.0.0.1:4182',out=process.env.QA_OUT||'test-output/teaching-return';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[],outgoing=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))outgoing.push({url:r.url(),method:r.method()});});
const check=(name,v)=>{assert.ok(v,name);checks.push(name);};
try{
 await page.goto(url);await page.waitForFunction(()=>window.explainerLab);
 await page.locator('[data-route="opensim"]').click();await page.locator('.ex-hero h1').waitFor();
 check('OpenSim primary navigation enters teaching',page.url().endsWith('#opensim/overview'));
 check('expert tools initially collapsed',await page.locator('.ex-more').evaluate(e=>!e.open));
 check('compact heading',await page.locator('.ex-hero h1').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)<=22));
 await page.screenshot({path:out+'/opensim-overview.png'});
 for(const s of ['scale','ik','id','so']){await page.locator(`.ex-step[data-step="${s}"]`).click();await page.waitForFunction(s=>window.explainerLab.snapshot().step===s,s);check('concise OpenSim '+s,(await page.locator('.ex-summary').innerText()).length<45);}
 await page.screenshot({path:out+'/opensim-so.png'});
 await page.locator('.ex-more summary').click();await page.locator('[data-action="sources"]').click();check('official source detail opens',await page.locator('.ex-drawer[open] .ex-source a').count()>0);await page.locator('.ex-drawer-head button').click();
 await page.locator('.ex-native-entry').click();await page.waitForFunction(()=>document.querySelector('.nv-muscle')?.options.length===43);check('advanced native SO retained',true);
 await page.locator('[data-route="myohand"]').click();await page.locator('.ex-hero h1').waitFor();check('MyoHand navigation enters teaching',page.url().endsWith('#myohand/overview'));
 for(const s of ['control','activation','geometry','force','transmission','dynamics','integration']){await page.locator(`.ex-step[data-step="${s}"]`).click();await page.waitForFunction(s=>window.explainerLab.snapshot().step===s,s);check('MyoHand '+s+' available',true);}
 await page.locator('.ex-step[data-step="activation"]').click();await page.locator('.ex-chart').first().waitFor();await page.screenshot({path:out+'/myohand-activation.png'});
 await page.locator('[data-route="mano"]').click();await page.locator('.mano-steps').waitFor();
 if(process.env.MANO_QA_FILE){await page.locator('[data-file]').first().setInputFiles(process.env.MANO_QA_FILE);}
 if(process.env.MANO_QA_FILE||url.includes('4182')){
  await page.waitForFunction(()=>document.querySelector('.mano-principles')?.dataset.modelLoaded==='true');
  check('real MANO canvas loaded',await page.locator('.mano-canvas canvas').count()===1);check('procedural illustration removed',await page.locator('.mano-visual svg').count()===0);
  await page.screenshot({path:out+'/mano-real-shape.png'});
  const before=await page.locator('.mano-canvas canvas').screenshot();await page.locator('#mano-shape').fill('1.5');await page.locator('#mano-pose').fill('0.75');
  const after=await page.locator('.mano-canvas canvas').screenshot();check('shape and pose visibly change genuine mesh',!before.equals(after));
  await page.locator('[data-step="deform"]').click();await page.screenshot({path:out+'/mano-real-skinning.png'});
  await page.locator('[data-step="keypoints"]').click();check('21 visible point labels',await page.locator('.mano-point-labels span').count()===21);await page.screenshot({path:out+'/mano-real-keypoints.png'});
 }else{check('public MANO provides private import, no fake hand',await page.locator('.mano-empty').isVisible());check('controls disabled before model',await page.locator('.mano-controls').isDisabled());await page.screenshot({path:out+'/mano-public-import.png'});}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/mano-mobile.png'});check('MANO no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('[data-route="opensim"]').click();await page.locator('.ex-hero h1').waitFor();await page.screenshot({path:out+'/opensim-mobile.png'});check('teaching no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('[data-route="control"]').click();await page.locator('.joint-trigger').first().waitFor();check('original ROM atlas retained',await page.locator('.joint-trigger').count()===17);
 if(process.env.MANO_QA_FILE||url.includes('4182')){await page.locator('[data-route="mano"]').click();await page.waitForFunction(()=>document.querySelector('.mano-principles')?.dataset.modelLoaded==='true');check('private model retained in memory across tabs',true);}
 check('no data upload during MANO import or teaching',outgoing.length===0);
 check('no page errors',errors.length===0);
 await fs.writeFile(out+'/RESULTS.json',JSON.stringify({url,checks,errors,at:new Date().toISOString()},null,2));console.log(JSON.stringify({checks:checks.length,errors,out}));
}finally{await browser.close();}
