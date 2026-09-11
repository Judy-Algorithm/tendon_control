export class MuscleSearch {
  constructor(atlas,tendons,onChange){
    this.atlas=atlas;this.tendons=new Map(tendons.map(t=>[t.id,t]));this.onChange=onChange;
    this.input=document.getElementById('muscle-search-input');
    this.clear=document.getElementById('muscle-search-clear');
    this.status=document.getElementById('muscle-search-status');
    this.results=document.getElementById('muscle-search-results');
    this.signature=null;this.buttons=[];
    this.input.addEventListener('input',e=>{if(!e.isComposing)this.apply(this.input.value);});
    this.input.addEventListener('compositionend',()=>this.apply(this.input.value));
    this.input.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();this.reset();}
      else if(e.key==='ArrowDown'&&this.buttons.length){e.preventDefault();this.buttons[0].focus();}
    });
    document.getElementById('muscle-search-form').addEventListener('submit',e=>{e.preventDefault();this.apply(this.input.value);});
    this.clear.addEventListener('click',()=>this.reset());
  }
  apply(value){
    const query=value.trim();
    if(query===this.atlas.state.search)return;
    this.atlas.setSearch(query);this.onChange();
  }
  reset(){this.input.value='';this.apply('');this.input.focus();}
  refresh(){
    const {search,highlighted}=this.atlas.state;
    if(this.input.value.trim()!==search)this.input.value=search;
    const signature=JSON.stringify([search,highlighted]);
    if(signature===this.signature)return;
    this.signature=signature;this.clear.hidden=!search;this.results.hidden=!search;
    this.results.replaceChildren();this.buttons=[];
    if(!search){this.status.textContent='输入缩写，在手模上查看对应肌腱通路';return;}
    const ids=this.atlas.scope();
    this.status.textContent=ids.length===0?'未找到该缩写，请检查拼写（如 FDS3、FDP5）':
      ids.length===1?'已显示 1 条肌腱通路':`已显示 ${ids.length} 条通路，点击一项可单独查看`;
    for(const id of ids){
      const meta=this.tendons.get(id),row=document.createElement('li'),button=document.createElement('button');
      button.type='button';button.className='muscle-search-result';
      button.setAttribute('aria-label',`单独显示 ${id} ${meta.name}`);
      button.setAttribute('aria-pressed',String(id===highlighted));
      const code=document.createElement('strong'),name=document.createElement('span');
      code.textContent=id;name.textContent=meta.name;
      button.append(code,name);row.append(button);this.results.append(row);this.buttons.push(button);
      button.addEventListener('click',()=>{this.input.value=id;this.apply(id);this.input.focus();});
    }
  }
}
