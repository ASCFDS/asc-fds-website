const {JSDOM}=require('jsdom');const fs=require('node:fs');const assert=require('node:assert/strict');const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const dom=new JSDOM(fs.readFileSync('events_sportbetrieb.html','utf8'),{url:'https://asc-fds.de/events_sportbetrieb.html',runScripts:'outside-only'});const w=dom.window,d=w.document;w.TextEncoder=TextEncoder;
 let mode='local-failure',calls=0;
 const event={title:'App-Testtermin',startDate:'2099-01-01',hasTime:false,category:'Sport'};
 w.fetch=async url=>{calls++;const local=url.includes('/assets/data/');if(mode==='both-failure'||(local&&mode==='local-failure'))throw Error('offline');return {ok:true,json:async()=>local?[]:{events:[event]}};};
 for(const name of ['event-model.js','event-calendar.js','public-events.js'])w.eval(fs.readFileSync('assets/js/'+name,'utf8'));
 await tick();await tick();assert.equal(calls,2);assert(d.querySelector('#events-list').textContent.includes('App-Testtermin'));assert(d.querySelector('#events-status').textContent.includes('App-Termine zuletzt geladen'));
 mode='both-failure';d.querySelector('#events-retry').click();await tick();await tick();assert(d.querySelector('#events-list').textContent.includes('App-Testtermin'));assert(d.querySelector('#events-status').textContent.includes('zuletzt geladene Stand'));assert.equal(d.querySelector('#events-retry').hidden,false);
 mode='success';d.querySelector('#events-retry').click();await tick();await tick();assert.equal(d.querySelector('#events-retry').hidden,true);assert.equal(d.querySelector('#events-list').getAttribute('aria-busy'),'false');assert.equal(calls,6);
 w.history.pushState(null,'','?kategorie=Nichtvorhanden');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(d.querySelectorAll('#events-list .timeline-item').length,0);assert.equal(d.querySelector('#event-category').value,'Nichtvorhanden');d.querySelector('#event-reset').click();assert.equal(d.querySelectorAll('#events-list .timeline-item').length,1);
 dom.window.close();console.log('PASS: independent sources, App events despite local failure, retained data on outage, successful retry of both sources.');
})().catch(e=>{console.error(e);process.exitCode=1;});
