const SOURCE = 'https://webscore.disag.de/competitions.php';
const clean = value => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim().slice(0, 300) : '';
const club = value => /^asc freudenstadt(?: e\.?\s?v\.?)?$/i.test(clean(value).replace(/\s+/g, ' '));
export function selectCompetitions(data) {
  if (!Array.isArray(data?.data)) throw Error('Invalid feed');
  return data.data.filter(r => Array.isArray(r) && club(r[2]) && /^[A-F0-9-]{36}$/i.test(r[0]))
    .map(r => ({id:r[0],title:clean(r[1]),club:clean(r[2]),date:clean(r[3]),type:clean(r[4]),status:r[7]==='live'?'Live':r[7]==='finished'?'Abgeschlossen':'Offen',url:'https://webscore.disag.de/competition/'+encodeURIComponent(r[2].substr(0,10)+'_'+r[3].replace(/ /g,'_'))+'/'+encodeURIComponent(r[0])})).slice(-100).reverse();
}
export async function onRequestGet() {
  try {
    const response=await fetch(SOURCE,{signal:AbortSignal.timeout(10000),cf:{cacheTtl:60,cacheEverything:true}});
    if (!response.ok || !response.body) throw Error('Unavailable');
    const reader=response.body.getReader();const chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4000000){await reader.cancel();throw Error('Oversize');}chunks.push(value);}
    const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
    const events=selectCompetitions(JSON.parse(new TextDecoder().decode(bytes)));
    return Response.json({events,checkedAt:new Date().toISOString(),source:'DISAG WebScore'},{headers:{'Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
  } catch {return Response.json({error:'webscore_unavailable'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
