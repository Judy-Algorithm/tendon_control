import fs from 'node:fs';
import vm from 'node:vm';
const context={};vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../vendor/three.min.js',import.meta.url),'utf8'),context);
export const THREE=context.THREE;
export function createSurface(bone,quant){
  const vb=Buffer.from(bone.vertices_i16,'base64'),fb=Buffer.from(bone.faces_u16,'base64');
  const vertices=Array.from({length:vb.length/6},(_,i)=>new THREE.Vector3(...[0,2,4].map(k=>vb.readInt16LE(i*6+k)*quant)));
  const center=new THREE.Vector3();vertices.forEach(v=>center.add(v));center.divideScalar(vertices.length);
  // Longitudinal PCA axis, oriented proximal-to-distal in this native hand pose.
  const axis=new THREE.Vector3(0,-1,0);
  for(let k=0;k<32;k++){
    const next=new THREE.Vector3();for(const v of vertices){const r=v.clone().sub(center);next.addScaledVector(r,r.dot(axis));}
    axis.copy(next.normalize());
  }
  if(axis.y>0)axis.negate();
  const projections=vertices.map(v=>v.clone().sub(center).dot(axis));
  const low=Math.min(...projections),high=Math.max(...projections);
  const longitudinal=p=>(p.clone().sub(center).dot(axis)-low)/(high-low);
  const radial=p=>{const r=p.clone().sub(center);return r.addScaledVector(axis,-r.dot(axis)).normalize();};
  const triangles=[];let volume=0;
  for(let i=0;i<fb.length;i+=6){
    const [a,b,c]=[0,2,4].map(k=>vertices[fb.readUInt16LE(i+k)]);
    const tri=new THREE.Triangle(a,b,c);if(tri.getArea()<1e-14)continue;
    volume+=a.dot(b.clone().cross(c));triangles.push(tri);
  }
  function closest(p,spec){
    let best=Infinity,result;
    const originalRadial=spec?.reference?radial(spec.reference):null;
    const allowed=q=>!spec||(longitudinal(q)>=spec.region[0]-1e-8&&longitudinal(q)<=spec.region[1]+1e-8&&(!spec.preserveSide||radial(q).dot(originalRadial)>=.5));
    const check=(q,tri)=>{const d=q.distanceToSquared(p);if(Number.isFinite(d)&&d<best&&allowed(q)){best=d;result={point:q.clone(),normal:tri.getNormal(new THREE.Vector3()).multiplyScalar(volume<0?-1:1),distance:Math.sqrt(d)};}};
    for(const tri of triangles){
      check(tri.closestPointToPoint(p,new THREE.Vector3()),tri);
      if(spec){check(tri.a,tri);check(tri.b,tri);check(tri.c,tri);}
    }
    if(!result)throw Error(`No surface candidate for ${bone.name}`);
    return result;
  }
  return {name:bone.name,closest,longitudinal,radial,center,axis};
}
