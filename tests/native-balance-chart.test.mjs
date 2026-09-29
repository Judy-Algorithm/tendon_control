import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {jointBalanceSeries,jointBalanceChart} from '../explainer/native-v2/balance-chart.js';
const load=f=>JSON.parse(fs.readFileSync(new URL('../explainer/native-v2/data/'+f,import.meta.url),'utf8'));
const myo=load('myohand-run-pulse.json'),so=load('opensim-canonical-finger-baseline.json');

test('native torque components preserve exact signed values and do not invent an inertial or external term',()=>{
 for(const run of [myo,so]){const before=JSON.stringify(run),data=jointBalanceSeries(run,null,8);assert.equal(data.supported,true);
  for(const group of data.groups)for(const series of group.series)series.rows.forEach((row,i)=>assert.equal(row.value,run.frames[i][series.field][8]));
  const svg=jointBalanceChart(run,null,8);assert.match(svg,/N·m/);assert.match(svg,/时间 \(s\)/);assert.ok(svg.includes(`data-value="${run.frames[1].qfrcActuator_Nm[8]}"`));assert.equal(JSON.stringify(run),before);
 }
 const myoData=jointBalanceSeries(myo,null,8);assert.deepEqual(myoData.groups.flatMap(g=>g.fields.map(x=>x[0])),['qfrcActuator_Nm','qfrcConstraint_Nm','qfrcPassive_Nm','qfrcBias_Nm']);
 const svg=jointBalanceChart(myo,null,8);assert.match(svg,/重力 \+ 科氏\/离心/);assert.match(svg,/不能直接相加作为残差/);assert.doesNotMatch(svg,/data-field="balanceResidual_Nm"/);
});
test('failed samples break lines rather than being removed, joined or zero-filled',()=>{
 const r=structuredClone(myo);r.frames=r.frames.slice(0,3);r.frames[1].valid=false;
 const data=jointBalanceSeries(r,null,8);assert.equal(data.groups[0].series[0].rows.length,3);assert.equal(data.groups[0].series[0].rows[1].value,null);
 const svg=jointBalanceChart(r,null,8),path=svg.match(/<path data-field="qfrcActuator_Nm" data-run="current" d="([^"]*)"/)[1];assert.equal((path.match(/M/g)||[]).length,2);assert.equal((path.match(/L/g)||[]).length,0);assert.doesNotMatch(svg,/data-frame="1"/);
 r.manifest.qc.numericPassed=false;assert.ok(jointBalanceSeries(r,null,8).groups.every(g=>g.series.every(s=>s.validCount===0)));assert.match(jointBalanceChart(r,null,8),/全部记录未通过数值检查/);
});
test('missing native fields and unsupported engines are explicit; baseline shares field colors but has dashed lines',()=>{
 const r=structuredClone(so);for(const f of r.frames)delete f.reserveTorque_Nm;
 const data=jointBalanceSeries(r,so,8);assert.equal(data.hasBaseline,true);const missing=data.groups[0].series.find(s=>s.field==='reserveTorque_Nm'&&s.tag==='current');assert.equal(missing.present,false);assert.equal(missing.validCount,0);assert.ok(missing.rows.every(p=>p.value===null));
 const svg=jointBalanceChart(r,so,8);assert.match(svg,/stroke-dasharray="6 4"/);assert.match(svg,/当前有效记录：辅助 reserve 力矩 0\/51/);
 const allMissing=structuredClone(myo);for(const f of allMissing.frames)delete f.qfrcBias_Nm;assert.match(jointBalanceChart(allMissing,null,8),/偏置项：重力 \+ 科氏\/离心（未导出）/);
 assert.match(jointBalanceChart({manifest:{engine:'unknown'},coordinateNames:['q'],frames:[]}),/未支持此引擎/);
 assert.match(jointBalanceChart(myo,null,99),/所选原生关节坐标不可用/);
 const wrong=structuredClone(so);wrong.manifest.modelHash='wrong';assert.equal(jointBalanceSeries(so,wrong,8).baselineRejected,true);assert.match(jointBalanceChart(so,wrong,8),/基线模型或通道不一致/);
});
