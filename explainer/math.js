// Small transparent teaching models. None of these functions is OpenSim or MuJoCo.
export const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
export function torqueDemand(loadN=2,leverMm=35,gravityNm=.02){
  return {contactNm:loadN*leverMm/1000,gravityNm,requiredNm:loadN*leverMm/1000+gravityNm};
}
/** Exact active-set enumeration for two bounded activations and unbounded reserve.
 * min .5(a_f²+a_e²+(r/reserveScale)²), cf*a_f-ce*a_e+r=tau.
 * Capacities are illustrative Nm at full activation; not native muscle parameters.
 */
export function solveAllocation({load=2,lever=35,strength=1,angle=25,reserveScale=.02}={}){
  const demand=torqueDemand(load,lever),capacityFactor=.6+.4*Math.exp(-(((angle-25)/40)**2));
  const c=[1.2*strength*capacityFactor,-.8*strength*capacityFactor];
  let best=null;
  for(const s0 of [-1,0,1])for(const s1 of [-1,0,1]){
    const status=[s0,s1],a=[0,0],free=[];let rhs=demand.requiredNm;
    status.forEach((s,i)=>{if(s===-1)free.push(i);else{a[i]=s;rhs-=c[i]*s;}});
    const denom=reserveScale**2+free.reduce((sum,i)=>sum+c[i]**2,0);
    free.forEach(i=>a[i]=c[i]*rhs/denom);
    if(a.some(v=>v< -1e-10||v>1+1e-10))continue;
    const reserve=demand.requiredNm-c.reduce((sum,v,i)=>sum+v*a[i],0);
    const objective=.5*(a.reduce((sum,v)=>sum+v*v,0)+(reserve/reserveScale)**2);
    if(!best||objective<best.objective)best={a,reserve,objective,capacities:c,contributions:c.map((v,i)=>v*a[i]),...demand};
  }
  return {...best,balanceResidual:Math.abs(best.contributions.reduce((a,b)=>a+b,0)+best.reserve-best.requiredNm),reserveControl:best.reserve/reserveScale,reserveScale,capacityFactor};
}
export function activationPulse({amplitude=.6,tau=.04,duration=.6,dt=.002}={}){
  let a=.02;const rows=[];
  for(let i=0;i<=Math.round(duration/dt);i++){
    const t=i*dt,u=t>=.1&&t<.35?amplitude:.02;
    rows.push({t,u,a,force:100*a});
    a=u+(a-u)*Math.exp(-dt/(u>a?tau:tau*1.8));
  }
  return rows;
}
export function parseRoute(hash){
  const [route,step]=hash.replace(/^#\/?/,'').split('/');
  return ['opensim','myohand','mano'].includes(route)?{route,step:step||'overview'}:{route:'control',step:'overview'};
}
export function polylinePath(values,{width=420,height=130,minY=0,maxY=1,minX=0,maxX=1,pad=20}={}){
  return values.map(([x,y],i)=>`${i?'L':'M'}${(pad+(x-minX)/(maxX-minX||1)*(width-pad*2)).toFixed(2)},${(height-pad-(y-minY)/(maxY-minY||1)*(height-pad*2)).toFixed(2)}`).join(' ');
}
