// Optional semantic search; imported only after an explicit user request.
export async function requestSemanticMatch(question,config,container,onResult){
 const box=document.createElement('section');box.className='willi-ai-consent';
 const p=document.createElement('p');p.textContent='Für die KI-Suche wird nur diese Frage an Cloudflare Workers AI gesendet. Cloudflare prüft zum Schutz vor Missbrauch deinen Browser. Keine vertraulichen Angaben eingeben. Die Einwilligung gilt für diese eine Suche.';
 const agree=document.createElement('button');agree.type='button';agree.className='willi-chip';agree.textContent='Zustimmen und KI-Suche starten';
 const cancel=document.createElement('button');cancel.type='button';cancel.className='willi-text-button';cancel.textContent='Abbrechen';
 const message=document.createElement('p');message.setAttribute('role','status');const widget=document.createElement('div');
 box.append(p,agree,cancel,widget,message);container.append(box);let widgetId=null,closed=false;const controller=new AbortController();
 const cleanup=()=>{closed=true;controller.abort();if(widgetId!==null)window.turnstile?.remove(widgetId);box.remove();};cancel.addEventListener('click',cleanup);
 const dialog=container.closest('dialog');dialog?.addEventListener('close',cleanup,{once:true});
 agree.addEventListener('click',async()=>{agree.disabled=true;message.textContent='Sicherheitsprüfung wird geladen …';
  try{
   if(!window.turnstile){if(!document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')){const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;document.head.append(script);}await new Promise((resolve,reject)=>{let n=0;const check=()=>{if(closed)return reject(Error('cancelled'));if(window.turnstile?.render)return resolve();if(++n>100)return reject(Error('unavailable'));setTimeout(check,100)};check();});}
   if(closed)return;
   widgetId=window.turnstile.render(widget,{sitekey:config.siteKey,action:'willi',theme:'light',size:'flexible',callback:async token=>{
    message.textContent='Ich suche nach passenden Vereinsauskünften …';
    const timeout=setTimeout(()=>controller.abort(),22000);
    try{const response=await fetch('/api/willi',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,consent:true,token}),signal:controller.signal});if(!response.ok)throw Error('unavailable');const result=await response.json();if(!closed){onResult(result);cleanup();}}
    catch{if(!closed)message.textContent='Die KI-Suche ist gerade nicht verfügbar. Bitte nutze die Themenvorschläge oder kontaktiere den Verein.';}
    finally{clearTimeout(timeout);}
   },'error-callback':()=>{message.textContent='Die Sicherheitsprüfung konnte nicht abgeschlossen werden. Bitte nutze die lokale Wissenssuche.';},'expired-callback':()=>{message.textContent='Die Sicherheitsprüfung ist abgelaufen. Bitte abbrechen und erneut starten.';}});
  }catch{if(!closed)message.textContent='Die KI-Suche konnte nicht gestartet werden. Die lokale Wissenssuche bleibt verfügbar.';}
 });
}
