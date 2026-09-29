// Model-independent MANO linear blend skinning. No model weights are bundled.
export function validateMano(m) {
  if(!m||m.schema!=='mano-local-lbs-v1'||m.vertexCount!==778||m.jointCount!==16||m.betaCount!==10||m.units!=='m'||!['left','right'].includes(m.hand))throw Error('需要 MANO 本地转换文件（mano-local-lbs-v1）。');
  const lengths={vTemplate:2334,shapeDirs:23340,poseDirs:315090,regressor:12448,weights:12448,parents:16,meanPose:45,tips:5,order21:21};
  for(const [k,n] of Object.entries(lengths))if(!Array.isArray(m[k])||m[k].length!==n||!m[k].every(Number.isFinite))throw Error('模型数组无效：'+k);
  if(m.parents[0]!==-1||m.parents.slice(1).some((p,i)=>!Number.isInteger(p)||p<0||p>i))throw Error('关节树无效');
  if(!Array.isArray(m.faces)||m.faces.length!==1538*3||m.faces.some(x=>!Number.isInteger(x)||x<0||x>=778))throw Error('表面拓扑无效');
  if(m.tips.some(x=>!Number.isInteger(x)||x<0||x>=778)||new Set(m.order21).size!==21||m.order21.some(x=>!Number.isInteger(x)||x<0||x>20))throw Error('关键点定义无效');
  for(let v=0;v<778;v++){let sum=0;for(let j=0;j<16;j++){const w=m.weights[v*16+j];if(w<0||w>1+1e-6)throw Error('蒙皮权重无效');sum+=w;}if(Math.abs(sum-1)>1e-5)throw Error('蒙皮权重和不为一');}
  return m;
}
export function rotationVector([x,y,z]) {
  const t=Math.hypot(x,y,z);if(t<1e-12)return [1,0,0,0,1,0,0,0,1];
  x/=t;y/=t;z/=t;const c=Math.cos(t),s=Math.sin(t),d=1-c;
  return [c+x*x*d,x*y*d-z*s,x*z*d+y*s,y*x*d+z*s,c+y*y*d,y*z*d-x*s,z*x*d-y*s,z*y*d+x*s,c+z*z*d];
}
const mul=(a,b)=>Array.from({length:16},(_,i)=>{const r=i>>2,c=i%4;let s=0;for(let k=0;k<4;k++)s+=a[r*4+k]*b[k*4+c];return s;});
export function manoForward(m,betas=Array(10).fill(0),pose=Array(48).fill(0)) {
  if(betas.length!==10||pose.length!==48||![...betas,...pose].every(Number.isFinite))throw Error('MANO 输入维度或数值无效');
  const v=new Float64Array(2334),joints=new Float64Array(48),rotations=[],feature=[];
  for(let c=0;c<2334;c++){v[c]=m.vTemplate[c];for(let b=0;b<10;b++)v[c]+=m.shapeDirs[c*10+b]*betas[b];}
  for(let j=0;j<16;j++)for(let n=0;n<778;n++)for(let c=0;c<3;c++)joints[j*3+c]+=m.regressor[j*778+n]*v[n*3+c];
  for(let j=0;j<16;j++){const r=rotationVector(pose.slice(j*3,j*3+3));rotations.push(r);if(j)for(let k=0;k<9;k++)feature.push(r[k]-(k%4===0?1:0));}
  const globals=[],transforms=[],posedJoints=[];
  for(let j=0;j<16;j++){
    const r=rotations[j],p=m.parents[j],d=[0,1,2].map(c=>joints[j*3+c]-(p>=0?joints[p*3+c]:0));
    const local=[r[0],r[1],r[2],d[0],r[3],r[4],r[5],d[1],r[6],r[7],r[8],d[2],0,0,0,1];
    const g=p<0?local:mul(globals[p],local);globals.push(g);posedJoints.push([g[3],g[7],g[11]]);
    const a=g.slice();for(let c=0;c<3;c++)for(let k=0;k<3;k++)a[c*4+3]-=g[c*4+k]*joints[j*3+k];transforms.push(a);
  }
  const vertices=new Float64Array(2334);
  for(let n=0;n<778;n++){
    const p=[...v.slice(n*3,n*3+3),1];
    for(let c=0;c<3;c++)for(let k=0;k<135;k++)p[c]+=m.poseDirs[(n*3+c)*135+k]*feature[k];
    for(let j=0;j<16;j++){const w=m.weights[n*16+j];if(!w)continue;for(let c=0;c<3;c++)for(let k=0;k<4;k++)vertices[n*3+c]+=w*transforms[j][c*4+k]*p[k];}
  }
  const all=[...posedJoints,...m.tips.map(n=>Array.from(vertices.slice(n*3,n*3+3)))];
  return {vertices,joints:posedJoints,keypoints:m.order21.map(i=>all[i]),wrist:Array.from(joints.slice(0,3))};
}
