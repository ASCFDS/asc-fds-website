const {JSDOM}=require('jsdom');const fs=require('node:fs');const assert=require('node:assert/strict');
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const dom=new JSDOM(fs.readFileSync('suche.html','utf8'),{url:'https://asc-fds.de/suche.html?q=Training',runScripts:'outside-only'});
 const w=dom.window,d=w.document;let fail=true,calls=0;
 w.fetch=async()=>{calls++;if(fail)throw Error('offline');return {ok:true,json:async()=>JSON.parse(fs.readFileSync('assets/data/search-index.json','utf8'))};};
 w.eval(fs.readFileSync('assets/js/site-search.js','utf8'));await tick();await tick();assert(d.querySelector('[role=status]').textContent.includes('nicht geladen'));
 fail=false;const form=d.querySelector('form'),input=d.querySelector('input');const submit=q=>{input.value=q;form.dispatchEvent(new w.Event('submit',{cancelable:true}));};
 submit('Training');await tick();await tick();assert(d.querySelectorAll('#site-search-results li').length>0);assert.equal(calls,2);
 submit('Mitglied');await tick();assert(d.querySelector('#site-search-results a').href.includes('mitglied-werden'));assert.equal(calls,2);
 submit('<img src=x onerror=alert(1)>');await tick();assert.equal(d.querySelectorAll('#site-search-results img').length,0);assert(d.querySelector('[role=status]').textContent.includes('Keine passende'));
 submit('');assert.equal(d.querySelectorAll('#site-search-results li').length,0);assert.equal(new URL(w.location.href).searchParams.has('q'),false);
 w.history.pushState(null,'','?q=Anfahrt');w.dispatchEvent(new w.PopStateEvent('popstate'));await tick();assert.equal(input.value,'Anfahrt');assert(d.querySelectorAll('#site-search-results a').length>0);
 dom.window.close();console.log('PASS: search retry, query restore, title ranking, cache reuse, safe text, empty/reset, history.');
})().catch(e=>{console.error(e);process.exitCode=1;});
