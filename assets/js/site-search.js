(() => {
  const form = document.getElementById('site-search-form');
  if (!form) return;
  const input = form.querySelector('input');
  const results = document.getElementById('site-search-results');
  const status = document.getElementById('site-search-status');
  const normalize = text => text.toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  let index, loading, generation = 0;
  async function search() {
    const current = ++generation;
    const query = input.value.trim().slice(0,120);
    results.replaceChildren();
    if (!query) { status.textContent = 'Gib einen Suchbegriff ein, zum Beispiel Training, Beitrag oder Anfahrt.'; return; }
    status.textContent = 'Seiten werden durchsucht …';
    try {
      if (!index) {
        if (!loading) loading = fetch('/assets/data/search-index.json', {signal:AbortSignal.timeout(10000)})
          .then(r => { if (!r.ok) throw Error(); return r.json(); })
          .then(data => { if (!Array.isArray(data)) throw Error(); index=data; }).finally(() => { loading=null; });
        await loading;
      }
      if (current !== generation) return;
      const tokens = normalize(query).split(/\s+/);
      const found = index.filter(page => tokens.every(token => normalize(page.title+' '+page.text).includes(token)))
        .sort((a,b) => Number(normalize(b.title).includes(normalize(query))) - Number(normalize(a.title).includes(normalize(query))));
      for (const page of found) {
        if (!page.url.startsWith('/') || page.url.startsWith('//')) continue;
        const li=document.createElement('li'), h=document.createElement('h2'), a=document.createElement('a'), p=document.createElement('p');
        a.href=page.url; a.textContent=page.title; h.append(a);
        const words=page.text.split(' '), at=words.findIndex(word => normalize(word).includes(tokens[0]));
        const start=Math.max(0,at-8); p.textContent=(start ? '… ' : '')+words.slice(start,start+40).join(' ')+(start+40<words.length ? ' …' : '');
        li.append(h,p); results.append(li);
      }
      status.textContent = found.length ? `${found.length} passende Seiten gefunden.` : 'Keine passende Seite gefunden. Versuche einen kürzeren Begriff oder nutze den Kontakt zum Verein.';
    } catch { if (current === generation) status.textContent='Die Suche konnte nicht geladen werden. Bitte erneut auf „Suchen“ klicken oder die Seitenlinks unten nutzen.'; }
  }
  form.addEventListener('submit', event => {
    event.preventDefault(); const url=new URL(location.href);
    if (input.value.trim()) url.searchParams.set('q',input.value.trim().slice(0,120)); else url.searchParams.delete('q');
    history.replaceState(null,'',url); search();
  });
  function restore() { input.value=new URL(location.href).searchParams.get('q')?.slice(0,120)||''; search(); }
  window.addEventListener('popstate',restore);
  restore();
})();
