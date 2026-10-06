(() => {
  'use strict';
  const tools = document.getElementById('results-tools');
  if (!tools) return;
  const search = document.getElementById('results-search');
  const available = document.getElementById('results-available');
  const reset = document.getElementById('results-reset');
  const rows = [...document.querySelectorAll('#results-body tr')];
  function restore() {
    const params = new URL(location.href).searchParams;
    search.value = params.get('ergebnis') || '';
    available.checked = params.get('berichte') === '1';
  }
  restore();
  function saveSelection() {
    const url = new URL(location.href);
    for (const [key, value] of [['ergebnis', search.value], ['berichte', available.checked ? '1' : '']]) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    history.replaceState(null, '', url);
    render();
  }
  window.addEventListener('popstate', () => { restore(); render(); });
  function render() {
    let count = 0;
    for (const row of rows) {
      const matches = globalThis.ASCEvents.matches(search.value, [row.textContent]);
      row.hidden = !matches || (available.checked && !row.querySelector('a.result-link'));
      if (!row.hidden) count++;
    }
    document.getElementById('results-count').textContent = `${count} von ${rows.length} Wettkämpfen`;
    document.getElementById('results-empty').hidden = count > 0;
    reset.hidden = !search.value && !available.checked;
  }
  search.addEventListener('input', saveSelection);
  available.addEventListener('change', saveSelection);
  reset.addEventListener('click', () => { search.value = ''; available.checked = false; saveSelection(); search.focus(); });
  for (const [target, anchor] of [[document.getElementById('event-tools'), 'termine'], [tools, 'ergebnisse']]) {
    if (!target) continue;
    const share = document.createElement('button');
    share.type = 'button'; share.className = 'text-button'; share.textContent = 'Link zur Auswahl kopieren';
    const feedback = document.createElement('span'); feedback.setAttribute('role', 'status');
    const fallback = document.createElement('input'); fallback.type = 'text'; fallback.readOnly = true; fallback.hidden = true;
    fallback.setAttribute('aria-label', 'Link zur Auswahl zum Kopieren');
    share.addEventListener('click', async () => {
      const url = new URL(location.href); url.hash = anchor;
      try {
        await navigator.clipboard.writeText(url.href);
        fallback.hidden = true; feedback.textContent = 'Link kopiert.';
      } catch {
        fallback.value = url.href; fallback.hidden = false; fallback.focus(); fallback.select();
        feedback.textContent = 'Bitte den markierten Link kopieren.';
      }
    });
    target.append(share, feedback, fallback);
  }
  tools.hidden = false;
  render();
})();
