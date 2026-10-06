import assert from 'node:assert/strict';
import {selectCompetitions,onRequestGet} from '../functions/api/webscore.js';
const row=['A2B6CDC8-6119-4E5A-BDE5-3F2BEA542DA8','<b>Test</b>','ASC Freudenstadt','07.10.2026 18:30','<span>Einzel</span>','','','live'];
assert.equal(selectCompetitions({data:[row,{bad:true},[...row.slice(0,2),'Anderer Verein',...row.slice(3)]]}).length,1);
assert.equal(selectCompetitions({data:[row]})[0].title,'Test');
assert(selectCompetitions({data:[row]})[0].url.startsWith('https://webscore.disag.de/competition/'));
const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({data:[row]});let r=await onRequestGet();assert.equal(r.status,200);assert.equal((await r.json()).events.length,1);
globalThis.fetch=async()=>{throw Error('offline');};assert.equal((await onRequestGet()).status,502);globalThis.fetch=original;console.log('PASS: club isolation, sanitized fields, fixed source/link origin, response and outage.');
