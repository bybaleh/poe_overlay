'use strict';
const league=document.querySelector('#league'),results=document.querySelector('#results'),state=document.querySelector('#state');
function element(tag,content,cls){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=String(content??'');return e;}
function show(payload){
 results.replaceChildren();
 if(payload.error){results.append(element('div',payload.error,'warning'));state.textContent='Price unavailable';return;}
 const {item,info,candidates=[]}=payload;
 if(!item)return;
 results.append(element('h3',item.name||info.name));
 if(item.variant)results.append(element('div','Variant: '+item.variant,'muted'));
 results.append(element('div',Number(item.chaosValue).toLocaleString()+' Chaos Orb','price'));
 if(Number.isFinite(Number(item.divineValue)))results.append(element('div',Number(item.divineValue).toLocaleString()+' Divine Orb','price'));
 if(item.count!=null)results.append(element('div','Listings/sample count: '+item.count,'muted'));
 if(candidates.length>1)results.append(element('div','Other variants may have different prices. Verify the exact variant in-game.','warning'));
 if(payload.failed)results.append(element('div',payload.failed+' categories failed to load','warning'));
 state.textContent='Price loaded';
}
window.overlay.onCheck(payload=>{state.textContent='Checking '+payload.info.name;results.replaceChildren(element('div','Loading current poe.ninja prices…','muted'));});
window.overlay.onResult(show);
document.querySelector('#hide').addEventListener('click',()=>window.overlay.hide());
document.querySelector('#exit').addEventListener('click',()=>window.overlay.close());
document.querySelector('#check').addEventListener('click',()=>window.overlay.check(document.querySelector('#paste').value));
(async()=>{
 try{
  const list=await window.overlay.leagues(),current=await window.overlay.currentLeague();
  league.replaceChildren(...list.map(x=>{const option=document.createElement('option');option.value=x.id;option.textContent=x.name;option.selected=x.id===current;return option;}));
  if(!list.some(x=>x.id===current)){await window.overlay.setLeague(list[0].id);league.value=list[0].id;}
 }catch(error){state.textContent='League API error';results.replaceChildren(element('div',error.message,'warning'));}
})();
league.addEventListener('change',async()=>{try{await window.overlay.setLeague(league.value);state.textContent='League '+league.value;}catch(e){state.textContent=e.message;}});
