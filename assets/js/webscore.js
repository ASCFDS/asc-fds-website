(() => {
 const root=document.getElementById('webscore-list');if(!root)return;
 const status=document.getElementById('webscore-status'),refresh=document.getElementById('webscore-refresh');let busy=false,loaded=false;
 const node=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
 async function load(){
  if(busy)return;busy=true;refresh.disabled=true;root.setAttribute('aria-busy','true');
  try {
   const response=await fetch('/api/webscore',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();const data=await response.json();if(!Array.isArray(data.events))throw Error();
   const cards=data.events.map(event=>{const card=node('article','');card.className='panel';const title=node('h3',event.title),meta=node('p',event.date+' · '+event.type),badge=node('p',event.status);badge.className='eyebrow';card.append(badge,title,meta);
    const url=new URL(event.url);if(url.origin==='https://webscore.disag.de'){const link=node('a','Ergebnisse bei DISAG öffnen ↗');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.className='text-link';card.append(link);}return card;});
   root.replaceChildren(...cards);if(!cards.length)root.append(node('p','Aktuell sind bei DISAG keine Wettkämpfe unter dem Vereinsnamen ASC Freudenstadt veröffentlicht.'));
   status.textContent='Quelle: DISAG WebScore · Abgerufen: '+new Date(data.checkedAt).toLocaleString('de-DE',{timeZone:'Europe/Berlin'})+' · Aktualisierung etwa jede Minute bei geöffneter Seite.';loaded=true;
  }catch{status.textContent='DISAG ist momentan nicht erreichbar. '+(loaded?'Die zuletzt geladenen Ergebnisse bleiben sichtbar. ':'')+'Bitte erneut versuchen oder den Direktlink nutzen.';}
  finally{busy=false;refresh.disabled=false;root.setAttribute('aria-busy','false');}
 }
 refresh.hidden=false;refresh.addEventListener('click',load);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});setInterval(()=>{if(!document.hidden)load();},60000);load();
})();
