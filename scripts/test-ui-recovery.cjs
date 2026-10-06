// DOM behavior checks; run with jsdom 26 in the separate QA environment.
const {JSDOM}=require('jsdom');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function page(html){
 const dom=new JSDOM(html,{url:'https://asc-fds.de/',runScripts:'outside-only'});
 await tick();return dom;
}
(async()=>{
 for(const provider of ['maps','donation','membership']){
  const dom=await page(`<div class="external-content" data-external="${provider}"><button data-external-load>Aktivieren</button><button data-external-revoke hidden>Entfernen</button><p data-external-status></p><div data-external-slot><template><p>Provider</p></template></div></div>`);
  const w=dom.window,d=w.document;let timeout;
  const original=w.setTimeout.bind(w);
  w.setTimeout=(fn,ms)=>ms===15000?(timeout=fn,123):original(fn,ms);
  w.eval(fs.readFileSync('assets/js/main.js','utf8'));d.dispatchEvent(new w.Event('DOMContentLoaded'));
  const load=d.querySelector('[data-external-load]'),slot=d.querySelector('[data-external-slot]');
  assert.equal(slot.querySelector('script,iframe'),null,'No provider before consent');
  load.focus();load.click();const old=slot.querySelector('script,iframe');const late=old.onload;
  assert.equal(slot.getAttribute('aria-busy'),'true');timeout();
  assert.equal(load.disabled,false);assert.equal(slot.children.length,0);assert.equal(slot.getAttribute('aria-busy'),'false');
  load.click();late();assert.equal(load.hidden,false,'Old callback must not finish new attempt');
  const current=slot.querySelector('script,iframe');current.onload();
  assert.equal(load.hidden,true);assert.equal(slot.getAttribute('aria-busy'),'false');
  assert.equal(d.activeElement,d.querySelector('[data-external-revoke]'));
  dom.window.close();
 }
 const {actions,findKnowledge,pageSuggestions}=await import('../assets/js/willi-knowledge.js');
 const data=JSON.parse(fs.readFileSync('assets/data/willi-knowledge.json','utf8'));
 const dom=await page('<div id="assistant-root"></div>');const w=dom.window,d=w.document;
 Object.assign(w,{actions,findKnowledge,pageSuggestions});w.matchMedia=()=>({matches:false});
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 let fail=true,deferred=null,calls=0;
 w.fetch=async url=>{if(url==='/api/willi')return {ok:true,json:async()=>({enabled:false})};calls++;if(deferred)return deferred;if(fail)throw Error('offline');return {ok:true,json:async()=>data};};
 w.eval(fs.readFileSync('assets/js/willi.js','utf8').replace(/^import .*\n/,''));
 const launch=d.querySelector('.willi-launch'),input=d.querySelector('textarea'),status=d.querySelector('[role=status]');
 launch.click();await tick();
 assert.equal(launch.getAttribute('aria-expanded'),'true');assert.equal(d.activeElement,d.querySelector('.willi-icon-button'),'Touch opening must not open keyboard');
 assert.equal(d.querySelector('.willi-recovery').hidden,false);assert(d.querySelector('.willi-recovery a').href.includes('/kontakt.html'));
 // A failed request that resolves after clearing must not replace the cleared state.
 let reject;deferred=new Promise((_,r)=>reject=r);input.value='Wann ist Training?';d.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));
 d.querySelector('.willi-text-button').click();reject(Error('offline'));await tick();
 assert.equal(status.textContent,'Gespräch gelöscht.');assert.equal(d.querySelector('.willi-recovery').hidden,true);
 deferred=null;fail=false;d.querySelector('.willi-recovery button').click();await tick();
 assert.equal(status.textContent,'');input.value='Wann ist Training?';d.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
 assert(d.querySelector('.willi-answer').textContent.includes('18:30'));assert.equal(d.querySelector('[role=log]').getAttribute('aria-busy'),'false');
 let copied='';Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{copied=text;}}});
 d.querySelector('.willi-answer button').click();await tick();assert(copied.includes('18:30'));assert(copied.includes('https://'));assert(status.textContent.includes('kopiert'));
 w.navigator.clipboard.writeText=async()=>{throw Error('blocked');};d.querySelector('.willi-answer button').click();await tick();assert(status.textContent.includes('manuell'));
 const before=d.querySelectorAll('.willi-answer').length;
 input.value='Wann ist Training?';input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true,cancelable:true}));await tick();assert.equal(d.querySelectorAll('.willi-answer').length,before+1);
 const loadedCalls=calls;d.querySelector('.willi-icon-button').click();assert.equal(launch.getAttribute('aria-expanded'),'false');assert.equal(d.activeElement,launch);
 launch.click();await tick();assert.equal(calls,loadedCalls,'Reuse loaded knowledge');
 dom.window.close();console.log('PASS: consent, timeout, retry, stale callbacks, focus, touch opening, Willi offline/recovery and clear-during-request.');
})().catch(error=>{console.error(error);process.exitCode=1;});
