import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {CONTROLS as ATLAS} from '../control-data.js';
import {FITTED_ROUTES} from '../route-data.js';

const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
await fs.mkdir('test-output',{recursive:true});
const errors=[];
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const url=process.env.TEST_URL||'http://127.0.0.1:4173';
const snapshot=()=>page.evaluate(()=>window.tendonAtlas.snapshot());
const equalSet=(actual,expected)=>assert.deepEqual([...actual].sort(),[...expected].sort());
function trigger(joint){return page.locator(`[data-joint-id="${joint}"] .joint-trigger`);}
function action(dof,id){return page.locator(`[data-action-key="${dof}:${id}"]`);}
function toggle(id){return page.locator('.path-list:not([hidden])').locator(`[data-toggle-tendon="${id}"]`);}
async function verifyRender(expected){
  const s=await snapshot();equalSet(s.visible,expected);equalSet(s.rendered,expected);equalSet(s.labelIds,expected);
  const bounds=await page.locator('.path-callout rect').evaluateAll(rects=>rects.map(r=>{const b=r.getBBox(),svg=r.ownerSVGElement;return {x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height,w:svg.clientWidth,h:svg.clientHeight};}));
  for(const r of bounds)assert.ok(r.x>=0&&r.y>=0&&r.right<=r.w&&r.bottom<=r.h,'Arrow label exceeds the viewport');
}
try{
  await page.goto(url);await page.waitForFunction(()=>window.tendonAtlas?.snapshot().ready);
  // Return the default ROM demonstration to the neutral overview for attachment checks.
  if((await snapshot()).jointId)await trigger((await snapshot()).jointId).click();
  assert.equal(await page.locator('.joint-trigger').count(),17);
  assert.equal((await snapshot()).boneCount,29);
  const geometry=await snapshot();assert.equal(geometry.geometryRevision,2);assert.equal(geometry.endpoints.length,37);
  for(const e of geometry.endpoints){
    assert.equal(e.depthTest,true);
    if(FITTED_ROUTES[e.id]){
      assert.deepEqual(e.start,FITTED_ROUTES[e.id][0]);
      assert.deepEqual(e.end,FITTED_ROUTES[e.id].at(-1));
    }
  }
  await verifyRender([]);
  const initial=await page.locator('body').innerText();
  for(const old of ['控制仿真','随机初始','显示全部关节','旋转轴','重播动作','肌腱39'])assert.ok(!initial.includes(old));
  await page.screenshot({path:'test-output/desktop-initial.png'});

  await trigger('joint_bone11').click();
  const middle=ATLAS.joints.find(j=>j.id==='joint_bone11');
  await verifyRender(middle.tendons);
  assert.equal(await page.locator('[data-joint-id="joint_bone11"] .total strong').innerText(),'6');
  await page.screenshot({path:'test-output/desktop-middle-six.png'});
  await action('middle_MCP_flex','positive').click();
  await verifyRender(['FDS3','FDP3','RI3','LU_RB3','UI_UB3']);
  await toggle('FDS3').click();assert.equal(await toggle('FDS3').innerText(),'Display');
  await verifyRender(['FDP3','RI3','LU_RB3','UI_UB3']);
  await toggle('FDS3').click();assert.equal(await toggle('FDS3').innerText(),'Hide');
  await verifyRender(['FDS3','FDP3','RI3','LU_RB3','UI_UB3']);
  await page.screenshot({path:'test-output/desktop-flexion-controls.png'});
  await action('middle_MCP_flex','negative').click();await verifyRender(['EDC3']);
  await page.locator('.path-callout[data-tendon="EDC3"]').click();
  assert.equal((await snapshot()).highlighted,'EDC3');
  assert.ok((await page.locator('.path-list:not([hidden])').innerText()).includes('指总伸肌'));

  // Real browser checks traverse all 48 actions, including the empty side of thumb MCP.
  let actionCount=0;
  for(const joint of ATLAS.joints){
    if((await snapshot()).jointId===joint.id)await trigger(joint.id).click();
    await trigger(joint.id).click();await verifyRender(joint.tendons);
    for(const dof of joint.dofs)for(const direction of dof.directions){
      await action(dof.id,direction.id).click();await verifyRender(direction.tendons);actionCount++;
      if(direction.tendons.length){
        const id=direction.tendons[0];await toggle(id).click();
        await verifyRender(direction.tendons.filter(t=>t!==id));
        await toggle(id).click();await verifyRender(direction.tendons);
      }
    }
  }
  assert.equal(actionCount,48);
  await trigger('joint_bone2').click();await action('thumb_MCP_abd','negative').click();await verifyRender([]);
  assert.equal(await page.locator('.path-list:not([hidden])').innerText(),'无');

  await trigger('joint_bone11').click();await verifyRender(middle.tendons);
  const before=await page.locator('.path-callout rect').first().getAttribute('y');
  const canvas=await page.locator('#canvas').boundingBox();
  await page.mouse.move(canvas.x+canvas.width*.50,canvas.y+canvas.height*.60);
  await page.mouse.down();await page.mouse.move(canvas.x+canvas.width*.62,canvas.y+canvas.height*.64,{steps:8});await page.mouse.up();
  assert.notEqual(await page.locator('.path-callout rect').first().getAttribute('y'),before);
  await verifyRender(middle.tendons);

  await page.setViewportSize({width:390,height:844});await page.reload();
  await page.waitForFunction(()=>window.tendonAtlas?.snapshot().ready);
  if((await snapshot()).jointId)await trigger((await snapshot()).jointId).click();
  await trigger('joint_bone11').click();
  await verifyRender(middle.tendons);await action('middle_MCP_flex','positive').click();
  await toggle('FDS3').click();assert.equal(await toggle('FDS3').innerText(),'Display');
  await verifyRender(['FDP3','RI3','LU_RB3','UI_UB3']);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'test-output/mobile-controls.png'});
  await trigger('joint_bone0').click();await verifyRender(ATLAS.joints[0].tendons.filter(id=>id!=='FDS3'));
  await page.screenshot({path:'test-output/mobile-wrist.png'});
  assert.deepEqual(errors,[]);
  console.log(`Passed: 16 joints, ${actionCount} actions, synchronized path/arrow toggles, rotation, desktop and mobile; no browser errors.`);
}finally{await browser.close();}
