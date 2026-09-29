import {SOURCES} from '../content.js';
import {escapeXML as esc} from './charts.js';
export const PARAMETER_HELP={
 fmaxMultiplier:'最大等长肌力：最优长度、等长、充分激活时的主动肌力尺度。原生单位 N。',
 optimalFiberLengthMultiplier:'最优肌纤维长度：最有利于主动产力的参考长度，不是当前纤维长度。原生单位 m。',
 tendonSlackLengthMultiplier:'肌腱松弛长度：肌腱未受拉伸的参考长度，影响肌肉与肌腱的长度分配。原生单位 m。',
 forceScale:'对当前 MyoHand 原生肌力参数乘倍率；不是直接把力、激活或骨骼尺寸乘倍率。',
 activationTimeScale:'同时缩放激活和去激活时间常数；改变控制到激活的响应速度，不直接设定激活值。'
};
export function parameterHelpHTML(engine){
 const fields=engine==='opensim'?[['max_isometric_force','N',PARAMETER_HELP.fmaxMultiplier],['optimal_fiber_length','m',PARAMETER_HELP.optimalFiberLengthMultiplier],['tendon_slack_length','m',PARAMETER_HELP.tendonSlackLengthMultiplier]]:[['actuator_gainprm / biasprm: force','N',PARAMETER_HELP.forceScale],['actuator_dynprm[0:2]','s',PARAMETER_HELP.activationTimeScale]];
 const ids=engine==='opensim'?['opensim-so-code','opensim-millard']:['mujoco-muscle','mujoco-computation','mujoco-fields'];
 return `<details class="nv-parameter-help"><summary>参数是什么意思？</summary>${fields.map(([name,unit,text])=>`<p><code>${esc(name)}</code> · ${unit}<br>${esc(text)}</p>`).join('')}<p>${engine==='opensim'?'本记录使用 Millard 肌肉。SO 不积分激活动力学；响应时间参数在此步骤不使用。':'先有控制，再有激活、肌力、力矩和运动。这些是不同的原生变量。'}</p>${ids.map(id=>{const s=SOURCES[id];return `<p><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><br><small>${esc(s.section)}</small></p>`;}).join('')}</details>`;
}
