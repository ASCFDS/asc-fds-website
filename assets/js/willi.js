import {actions,findKnowledge,pageSuggestions} from './willi-knowledge.js';
const root=document.getElementById('assistant-root');
if(root) setup();
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;}
function setup(){
 const launch=el('button','willi-launch');launch.type='button';launch.setAttribute('aria-haspopup','dialog');launch.setAttribute('aria-expanded','false');launch.setAttribute('aria-controls','willi-dialog');launch.setAttribute('aria-label','Frag Willi – ASC-Vereinswissen öffnen');
 const icon=el('img');icon.src='/assets/img/willi/avatar-192.webp';icon.srcset='/assets/img/willi/avatar-192.webp 192w, /assets/img/willi/avatar-384.webp 384w';icon.sizes='92px';icon.alt='';icon.width=56;icon.height=56;launch.append(icon,el('span','','Frag Willi'));
 const dialog=el('dialog','willi-dialog');dialog.id='willi-dialog';dialog.setAttribute('aria-labelledby','willi-title');
 const header=el('header','willi-header');const portrait=icon.cloneNode();portrait.width=92;portrait.height=92;
 const titles=el('div');const title=el('h2','','Frag Willi');title.id='willi-title';titles.append(el('p','willi-eyebrow','Dein ASC-Begleiter'),title,el('p','willi-subtitle','Vereinswissen · mit Quellen'));
 const close=el('button','willi-icon-button','×');close.type='button';close.setAttribute('aria-label','Willi schließen');header.append(portrait,titles,close);
 const scroll=el('div','willi-scroll');const intro=el('p','willi-intro','Hallo, ich bin Willi. Ich helfe dir beim Einstieg und bei Fragen zum ASC. Was möchtest du wissen?');
 const suggestions=el('div','willi-suggestions');suggestions.setAttribute('aria-label','Passende Fragen zu dieser Seite');
 const log=el('div','willi-log');log.setAttribute('role','log');log.setAttribute('aria-live','polite');log.setAttribute('aria-relevant','additions');log.setAttribute('aria-label','Fragen und Antworten');
 const status=el('p','willi-status');status.setAttribute('role','status');status.id='willi-status';
 const recovery=el('div','willi-recovery');recovery.hidden=true;const retry=el('button','willi-chip','Vereinswissen erneut laden');retry.type='button';const contact=el('a','willi-action','Kontakt zum Verein →');contact.href=actions.contact[1];recovery.append(retry,contact);
 const form=el('form','willi-form');const label=el('label','', 'Deine Frage zum ASC');label.htmlFor='willi-question';const input=el('textarea');input.id='willi-question';input.name='question';input.rows=2;input.maxLength=600;input.required=true;input.setAttribute('aria-describedby','willi-status');input.placeholder='Zum Beispiel: Was kostet der Beitrag?';
 const row=el('div','willi-form-actions');const clear=el('button','willi-text-button','Gespräch löschen');clear.type='button';const send=el('button','btn btn-primary','Frage stellen');send.type='submit';row.append(clear,send);form.append(label,input,row);
 const note=el('p','willi-note','Lokale Wissenssuche: Deine Fragen werden nicht an einen KI-Dienst gesendet. Keine persönlichen oder vertraulichen Daten eingeben.');
 const privacy=el('a','willi-privacy','Datenschutz');privacy.href=actions.privacy[1];note.append(' ',privacy);
 scroll.append(intro,suggestions,log,status,recovery);dialog.append(header,scroll,form,note);root.append(launch,dialog);
 let catalog=null,loading=null,aiConfig=null;
 async function loadConfig(){try{const r=await fetch('/api/willi',{signal:AbortSignal.timeout(5000)});if(r.ok)aiConfig=await r.json();}catch{aiConfig=null;}}
 async function load(){if(catalog)return catalog;if(!loading)loading=fetch('/assets/data/willi-knowledge.json',{signal:AbortSignal.timeout(10000)}).then(r=>{if(!r.ok)throw Error('knowledge');return r.json()}).then(x=>{if(!Array.isArray(x.entries))throw Error('knowledge');catalog=x;return x;}).finally(()=>{loading=null});return loading;}
 for(const text of pageSuggestions(location.pathname)){const b=el('button','willi-chip',text);b.type='button';b.addEventListener('click',()=>{input.value=text;form.requestSubmit();});suggestions.append(b);}
 async function prepare(){
  const version=generation;recovery.hidden=true;retry.disabled=true;status.textContent='Vereinswissen wird geladen …';
  try{await load();if(version===generation&&!busy)status.textContent='';}
  catch{if(version===generation&&!busy){status.textContent='Das Vereinswissen konnte nicht geladen werden. Bitte versuche es erneut oder kontaktiere den Verein.';recovery.hidden=false;}}
  finally{retry.disabled=false;}
 }
 retry.addEventListener('click',()=>prepare());
 launch.addEventListener('click',()=>{dialog.showModal();launch.setAttribute('aria-expanded','true');if(window.matchMedia('(pointer: fine)').matches)input.focus();else close.focus();loadConfig();prepare();});
 close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{launch.setAttribute('aria-expanded','false');launch.focus();});
 let generation=0,busy=false;
 input.addEventListener('keydown', event => {
  if (event.key==='Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing) { event.preventDefault(); form.requestSubmit(); }
 });
 const shortcut=el('span','sr-only','Mit Strg oder Command und Eingabetaste absenden.');shortcut.id='willi-shortcut';form.append(shortcut);input.setAttribute('aria-describedby','willi-status willi-shortcut');

 clear.addEventListener('click',()=>{generation++;busy=false;send.disabled=false;log.replaceChildren();log.setAttribute('aria-busy','false');recovery.hidden=true;status.textContent='Gespräch gelöscht.';input.value='';input.focus();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!input.value.trim())return;const question=input.value.trim();const version=++generation;busy=true;send.disabled=true;log.setAttribute('aria-busy','true');recovery.hidden=true;status.textContent='Ich suche in den Vereinsquellen …';
  try{const data=await load();if(version!==generation)return;const found=findKnowledge(question,data);const user=el('p','willi-question',question);log.append(user);const answer=el('article','willi-answer');
   if(found.length){for(const item of found){const section=el('section');section.append(el('h3','',item.title),el('p','',item.answer));const details=el('details','willi-sources');details.append(el('summary','','Quellen und Stand'));for(const id of item.sourceIds){const source=data.sources[id];if(!source)continue;const p=el('p');if(source.url){const a=el('a','',source.title);a.href=source.url;p.append(a);}else p.textContent=source.title;p.append(` · geprüft ${new Date(source.checkedAt+'T12:00:00').toLocaleDateString('de-DE')}`);details.append(p);}section.append(details);if(actions[item.action]){const [label,url]=actions[item.action];const a=el('a','willi-action',label+' →');a.href=url;section.append(a);}answer.append(section);}}
   else{answer.append(el('h3','','Das weiß ich noch nicht sicher.'),el('p','','Dazu finde ich keine passende belegte Auskunft. Ich möchte dir nichts Falsches sagen. Der Verein hilft dir gerne weiter.'));const a=el('a','willi-action','Frage an den Verein →');a.href=actions.contact[1];answer.append(a);}
   if(!found.length && aiConfig?.enabled){const ai=document.createElement('button');ai.type='button';ai.className='willi-chip';ai.textContent='Mit KI nach passenden Auskünften suchen';answer.append(ai);ai.addEventListener('click',async()=>{ai.disabled=true;try{const {requestSemanticMatch}=await import('./willi-ai.js');await requestSemanticMatch(question,aiConfig,answer,result=>{if(version!==generation)return;if(result.version!==data.version||!Array.isArray(result.ids))return;const selected=data.entries.filter(e=>result.ids.includes(e.id)&&e.reviewAfter>=new Date().toISOString().slice(0,10));if(!selected.length){status.textContent='Auch die KI-Suche findet dazu keine belegte Auskunft.';return;}for(const item of selected){const section=el('section');section.append(el('h3','',item.title),el('p','',item.answer));for(const id of item.sourceIds){const source=data.sources[id];if(source)section.append(el('p','willi-sources',source.title+' · Stand '+source.checkedAt));}if(actions[item.action]){const a=el('a','willi-action',actions[item.action][0]+' →');a.href=actions[item.action][1];section.append(a);}answer.append(section);}});}catch{if(version===generation)status.textContent='Die KI-Suche ist nicht erreichbar.';}finally{ai.disabled=false;}});}
   const copy=el('button','willi-text-button','Antwort mit Quellen kopieren');copy.type='button';
   copy.addEventListener('click', async()=>{
    const text=[question,...[...answer.querySelectorAll('h3,p')].map(n=>n.textContent),...[...answer.querySelectorAll('a')].map(a=>a.href)].join('\n');
    try { await navigator.clipboard.writeText(text); if(version===generation)status.textContent='Antwort mit Quellen kopiert.'; }
    catch { if(version===generation)status.textContent='Kopieren ist nicht verfügbar. Du kannst den Antworttext markieren und manuell kopieren.'; }
   });answer.append(copy);
   log.append(answer);while(log.children.length>20)log.firstElementChild.remove();input.value='';status.textContent='';answer.scrollIntoView({block:'nearest',behavior:'instant'});
  }catch{if(version===generation){status.textContent='Das Vereinswissen ist gerade nicht erreichbar. Deine Frage bleibt erhalten. Versuche es erneut oder kontaktiere den Verein.';recovery.hidden=false;}}
  finally{if(version===generation){busy=false;send.disabled=false;log.setAttribute('aria-busy','false');if(dialog.open && window.matchMedia('(pointer: fine)').matches)input.focus({preventScroll:true});}}
 });
}
