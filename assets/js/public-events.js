/* Public endpoint must expose only homepage-approved events and allow CORS. */
(() => {
  'use strict';
  const list = document.getElementById('events-list');
  const status = document.getElementById('events-status');
  const retry = document.getElementById('events-retry');
  if (!list || !status || !retry) return;
  const endpoint = 'https://europe-west3-asc-app-e25d6.cloudfunctions.net/publicEvents?limit=20';
  const dateFormat = new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin'
  });
  const dayFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' });
  const dateOnlyFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeZone: 'Europe/Berlin' });
  let busy = false;
  let loaded = false;
  function date(value) {
    if (value == null || value === '') return null;
    const seconds = typeof value === 'object' ? (value.seconds ?? value._seconds) : undefined;
    const result = new Date(seconds !== undefined ? seconds * 1000 : value);
    return Number.isFinite(result.getTime()) ? result : null;
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }
  async function refresh() {
    if (busy) return;
    busy = true;
    retry.hidden = true;
    list.setAttribute('aria-busy', 'true');
    status.textContent = 'Aktuelle Termine werden geladen …';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(endpoint, {
        signal: controller.signal, credentials: 'omit', cache: 'no-store'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      const rows = Array.isArray(body) ? body : body.events;
      if (!Array.isArray(rows)) throw new Error('Invalid events response');
      const events = rows.map(row => {
        if (!row || typeof row !== 'object') throw new Error('Invalid event');
        const start = date(row.startDate);
        const end = date(row.endDate) || start;
        if (!start || typeof row.title !== 'string' || !row.title.trim()) {
          throw new Error('Invalid event fields');
        }
        return { ...row, start, end };
      }).filter(row => row.publishToHomepage !== false &&
        (row.visibility == null || row.visibility === 'public') &&
        dayFormat.format(row.end) >= dayFormat.format(new Date())).sort((a, b) => a.start - b.start);
      const fragment = document.createDocumentFragment();
      for (const event of events) {
        const article = element('article', 'timeline-item', '');
        const format = event.hasTime === false ? dateOnlyFormat : dateFormat;
        const when = format.format(event.start) +
          (event.end > event.start ? ` – ${format.format(event.end)}` : '');
        article.append(element('div', 'timeline-date', when));
        const content = element('div', 'timeline-content', '');
        content.append(element('h2', '', event.title));
        for (const field of ['description', 'location']) {
          if (typeof event[field] === 'string' && event[field].trim()) {
            content.append(element('p', '', event[field]));
          }
        }
        article.append(content);
        fragment.append(article);
      }
      list.replaceChildren(fragment);
      loaded = true;
      status.textContent = events.length ? 'Aktuelle Termine aus der ASC-App.' :
        'Aktuell sind keine kommenden öffentlichen Termine vorhanden.';
    } catch (error) {
      status.textContent = loaded ?
        'Die Aktualisierung ist momentan nicht möglich. Die zuletzt geladenen Termine bleiben sichtbar.' :
        'Aktuelle App-Termine sind momentan nicht erreichbar. Angezeigt werden die manuell gepflegten Termine; diese können veraltet sein.';
      retry.hidden = false;
    } finally {
      clearTimeout(timeout);
      busy = false;
      list.setAttribute('aria-busy', 'false');
    }
  }
  retry.addEventListener('click', refresh);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
  setInterval(() => { if (!document.hidden) refresh(); }, 300000);
  // main.js finishes its static fallback sorting before the first request starts.
  document.addEventListener('DOMContentLoaded', refresh);
})();
