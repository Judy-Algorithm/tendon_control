export function createAtlasState(atlas) {
  const joints=new Map(atlas.joints.map(j=>[j.id,j]));
  const tendons=new Set(atlas.tendons.map(t=>t.id));
  const state={jointId:null,direction:null,hidden:new Set(),highlighted:null};
  function joint(){return joints.get(state.jointId)||null;}
  function action(){
    if(!state.direction)return null;
    return joint()?.dofs.find(d=>d.id===state.direction.dofId)?.directions.find(d=>d.id===state.direction.id)||null;
  }
  function scope(){return action()?.tendons??joint()?.tendons??[];}
  return {
    state,joint,action,scope,
    visible(){return scope().filter(id=>!state.hidden.has(id));},
    openJoint(id){
      if(id!==null&&!joints.has(id))throw new Error('Unknown joint');
      state.jointId=id;state.direction=null;state.highlighted=null;
    },
    selectDirection(dofId,id){
      if(!joint()?.dofs.find(d=>d.id===dofId)?.directions.some(d=>d.id===id))throw new Error('Unknown direction');
      state.direction={dofId,id};state.highlighted=null;
    },
    clearDirection(){state.direction=null;state.highlighted=null;},
    toggleTendon(id){
      if(!tendons.has(id)||!scope().includes(id))throw new Error('Tendon outside selected action');
      state.hidden.has(id)?state.hidden.delete(id):state.hidden.add(id);
      if(state.hidden.has(id)&&state.highlighted===id)state.highlighted=null;
    },
    highlight(id){
      if(id!==null&&!scope().includes(id))return;
      state.highlighted=id;
    },
  };
}

export function formatRange(range){
  const degrees=n=>`${Math.abs(n).toFixed(1).replace(/\.0$/,'')}°`;
  const low=Math.abs(range.min)<1e-8?'0°':`${range.negativeLabel} ${degrees(range.min)}`;
  const high=Math.abs(range.max)<1e-8?'0°':`${range.positiveLabel} ${degrees(range.max)}`;
  return `${low} — ${high}`;
}
