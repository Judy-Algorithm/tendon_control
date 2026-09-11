export function normalizeMuscleCode(value){return value.normalize('NFKC').toUpperCase().replace(/[\s_-]+/g,'');}
export function findMuscles(tendons,query){
  const code=normalizeMuscleCode(query);
  if(!code)return [];
  const exact=tendons.find(t=>normalizeMuscleCode(t.id)===code);
  return exact?[exact.id]:tendons.filter(t=>normalizeMuscleCode(t.id).startsWith(code)).map(t=>t.id);
}

export function createAtlasState(atlas) {
  const joints=new Map(atlas.joints.map(j=>[j.id,j]));
  const tendons=new Set(atlas.tendons.map(t=>t.id));
  const state={jointId:null,direction:null,search:'',searchIds:[],hidden:new Set(),highlighted:null};
  function joint(){return joints.get(state.jointId)||null;}
  function action(){
    if(!state.direction)return null;
    return joint()?.dofs.find(d=>d.id===state.direction.dofId)?.directions.find(d=>d.id===state.direction.id)||null;
  }
  function scope(){return state.search?state.searchIds:action()?.tendons??joint()?.tendons??[];}
  return {
    state,joint,action,scope,
    visible(){return scope().filter(id=>!state.hidden.has(id));},
    setSearch(query){
      state.search=query.trim();state.searchIds=findMuscles(atlas.tendons,state.search);
      state.jointId=null;state.direction=null;
      state.highlighted=state.searchIds.length===1?state.searchIds[0]:null;
      // A direct search explicitly reveals matching paths even if they were hidden in ROM.
      for(const id of state.searchIds)state.hidden.delete(id);
    },
    openJoint(id){
      if(id!==null&&!joints.has(id))throw new Error('Unknown joint');
      state.search='';state.searchIds=[];
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
