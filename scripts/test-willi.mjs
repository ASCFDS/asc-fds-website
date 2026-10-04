import assert from 'node:assert/strict';
import fs from 'node:fs';
import {findKnowledge,actions} from '../assets/js/willi-knowledge.js';
// Inline the JSON import as the Pages bundler does; Node requires import attributes.
const handlerSource=fs.readFileSync('functions/api/willi.js','utf8').replace(
  "import knowledge from '../../assets/data/willi-knowledge.json';",
  'const knowledge='+fs.readFileSync('assets/data/willi-knowledge.json','utf8')+';'
);
const {onRequestGet,onRequestPost}=await import('data:text/javascript;base64,'+Buffer.from(handlerSource).toString('base64'));
const data=JSON.parse(fs.readFileSync('assets/data/willi-knowledge.json'));const now=new Date('2026-10-04');
for(const [q,id] of [['Wann ist Training?','training'],['Was kostet die Mitgliedschaft?','fees'],['Wie wurde der Verein gegründet?','history'],['Welche Erfolge gibt es?','success'],['Eintritt im Juli','partial-year'],['Wie bezahle ich per SEPA?','payment'],['Externe Leistungsschützen ab 2027','fees-2027'],['Wie kann ich kündigen?','exit'],['Welche Veranstaltungen gibt es?','events']])assert(findKnowledge(q,data,now).some(e=>e.id===id),q);
for(const q of ['Wie wird das Wetter?','Gib mir private Mitgliederdaten','Was ist mein IBAN Kontostand?'])assert.equal(findKnowledge(q,data,now).length,0,q);
assert.equal(findKnowledge('Training',data,new Date('2028-01-01')).length,0);
for(const e of data.entries){assert(e.sourceIds.every(id=>data.sources[id]));if(e.action)assert(actions[e.action]);}
assert.equal((await onRequestGet({env:{}}).json()).enabled,false);
assert.equal((await onRequestPost({env:{},request:new Request('https://www.asc-fds.de/api/willi',{method:'POST',headers:{Origin:'https://evil.example'}})})).status,403);
assert.equal((await onRequestPost({env:{},request:new Request('https://www.asc-fds.de/api/willi',{method:'POST',headers:{Origin:'https://www.asc-fds.de'}})})).status,503);
const original=globalThis.fetch;let calls=0;
const env={WILLI_AI_ENABLED:'true',WILLI_FREE_PLAN_CONFIRMED:'true',AI:{run:async()=>({response:'{"ids":["fees"]}'})},TURNSTILE_SECRET_KEY:'test',TURNSTILE_SITE_KEY:'test',WILLI_RATE_LIMITER:{limit:async()=>({success:true})}};
const req=()=>new Request('https://www.asc-fds.de/api/willi',{method:'POST',headers:{Origin:'https://www.asc-fds.de','Content-Type':'application/json'},body:JSON.stringify({question:'Kosten?',consent:true,token:'test'})});
globalThis.fetch=async()=>{calls++;return Response.json({success:true,action:'willi',hostname:'www.asc-fds.de'});};
assert.deepEqual((await (await onRequestPost({env,request:req()})).json()).ids,['fees']);assert.equal(calls,1);
globalThis.fetch=async()=>Response.json({success:true,action:'contact',hostname:'www.asc-fds.de'});
assert.equal((await onRequestPost({env,request:req()})).status,400);
globalThis.fetch=async()=>Response.json({success:true,action:'willi',hostname:'www.asc-fds.de'});
env.AI.run=async()=>({response:'{"ids":["invented"]}'});
assert.equal((await onRequestPost({env,request:req()})).status,502);
assert.equal((await onRequestGet({env:{...env,WILLI_FREE_PLAN_CONFIRMED:'false'}}).json()).enabled,false);
globalThis.fetch=original;
console.log('Willi: matching, private/unknown queries, expiry, sources, free-plan gate, captcha action and approved-only AI output passed. No real AI calls.');
