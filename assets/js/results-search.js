(() => {
  'use strict';
  const tools = document.getElementById('results-tools');
  if (!tools) return;
  const search = document.getElementById('results-search');
  const available = document.getElementById('results-available');
  const reset = document.getElementById('results-reset');
  const rows = [...document.querySelectorAll('#results-body tr')];
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
  search.addEventListener('input', render);
  available.addEventListener('change', render);
  reset.addEventListener('click', () => { search.value = ''; available.checked = false; render(); search.focus(); });
  tools.hidden = false;
  render();
})();
