(() => {
  "use strict";
  const list = document.getElementById("events-list");
  if (!list) return;
  const status = document.getElementById("events-status");
  const retry = document.getElementById("events-retry");
  const archive = document.getElementById("events-archive");
  const filter = document.getElementById("event-category");
  const search = document.getElementById("event-search");
  const reset = document.getElementById("event-reset");
  const count = document.getElementById("events-count");
  const tools = document.getElementById("event-tools");
  const limit = Number(list.dataset.limit) || Infinity;
  const model = globalThis.ASCEvents;
  const dateOnly = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeZone: "Europe/Berlin",
  });
  const timed = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });
  let manual = [],
    live = [],
    busy = false,
    manualLoaded = false;
  function node(tag, cls, text) {
    const n = document.createElement(tag);
    n.className = cls;
    n.textContent = text;
    return n;
  }
  function card(event) {
    const article = node("article", "timeline-item", "");
    const format = event.hasTime === false ? dateOnly : timed;
    const date = node(
      "time",
      "timeline-date",
      format.format(new Date(event.startDate)) +
        (event.endDate !== event.startDate
          ? " – " + format.format(new Date(event.endDate))
          : ""),
    );
    date.dateTime = event.startDate;
    const content = node("div", "timeline-content", "");
    if (event.category)
      content.append(node("span", "event-category", event.category));
    content.append(node("h3", "", event.title));
    for (const field of ["description", "location"])
      if (typeof event[field] === "string" && event[field].trim())
        content.append(node("p", "", event[field]));
    const download = node("button", "text-button event-download", "Im Kalender speichern (.ics)");
    download.type = "button";
    download.setAttribute("aria-label", `${event.title}: im Kalender speichern`);
    download.addEventListener("click", () => {
      const url = URL.createObjectURL(new Blob([model.calendar(event)], { type: "text/calendar;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = 'asc-' + event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80) + '.ics';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
    content.append(download);
    article.append(date, content);
    return article;
  }
  let requestedCategory = new URL(location.href).searchParams.get("kategorie") || "";
  if (search) search.value = new URL(location.href).searchParams.get("termin") || "";
  function render() {
    const rows = model.merge(manual, live);
    if (filter) {
      const selected = requestedCategory;
      const options = [
        ...new Set(rows.map((r) => r.category).filter(Boolean)),
      ].sort();
      filter.replaceChildren(
        new Option("Alle Kategorien", ""),
        ...options.map((c) => new Option(c, c)),
        ...(selected && !options.includes(selected) ? [new Option(selected + " (aktuell keine Termine)", selected)] : []),
      );
      filter.value = selected;
    }
    const { upcoming, past } = model.split(
      rows.filter((r) => (!filter?.value || r.category === filter.value) && model.matches(search?.value || '', [r.title, r.description, r.location, r.category, dateOnly.format(new Date(r.startDate)), dateOnly.format(new Date(r.endDate))])),
    );
    if (tools) tools.hidden = false;
    if (count) count.textContent = `${upcoming.length} kommende · ${past.length} vergangene Termine`;
    if (reset) reset.hidden = !search?.value && !filter?.value;
    if (search?.value.trim() && archive?.parentElement.tagName === 'DETAILS') archive.parentElement.open = past.length > 0;
    list.replaceChildren(...upcoming.slice(0, limit).map(card));
    if (!upcoming.length)
      list.append(
        node(
          "p",
          "empty-state",
          "Aktuell sind keine kommenden Termine in dieser Auswahl veröffentlicht. Unser Regeltraining findet mittwochs ab 18:30 Uhr statt.",
        ),
      );
    if (archive) {
      archive.replaceChildren(...past.map(card));
      if (!past.length)
        archive.append(
          node("p", "", "Keine vergangenen Termine in dieser Auswahl."),
        );
    }
  }
  async function getJSON(url) {
    const response = await fetch(url, {
      credentials: "omit",
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("Termine nicht erreichbar");
    return response.json();
  }
  let lastLiveUpdate = null;
  const refreshButton = node('button', 'text-button', 'Termine aktualisieren');
  refreshButton.type = 'button';
  if (tools) tools.append(refreshButton);
  async function refresh() {
    if (busy) return;
    busy = true;
    retry.hidden = true;
    refreshButton.disabled = true;
    refreshButton.textContent = 'Wird aktualisiert …';
    list.setAttribute('aria-busy', 'true');
    const outcomes = await Promise.allSettled([
      getJSON('/assets/data/events.json').then(data => {
        if (!Array.isArray(data) || data.some(r => !model.normalize(r))) throw Error('Invalid local data');
        manual = data; manualLoaded = true; render();
      }),
      getJSON('https://europe-west3-asc-app-e25d6.cloudfunctions.net/publicEvents?limit=100').then(data => {
        const rows = Array.isArray(data) ? data : data.events;
        if (!Array.isArray(rows) || rows.some(r => !model.normalize(r))) throw Error('Invalid event response');
        live = rows; lastLiveUpdate = new Date(); render();
      }),
    ]);
    const localOK = outcomes[0].status === 'fulfilled';
    const liveOK = outcomes[1].status === 'fulfilled';
    if (localOK && liveOK) status.textContent = 'Vereinstermine und öffentlich freigegebene Termine aus der ASC-App.';
    else if (!localOK && liveOK) status.textContent = 'Die Vereinsliste konnte nicht aktualisiert werden. Öffentliche App-Termine sind verfügbar; zuvor geladene Vereinstermine bleiben sichtbar.';
    else if (localOK) status.textContent = 'Die App-Termine sind momentan nicht erreichbar. Vorhandene Termine bleiben sichtbar; kurzfristige Änderungen bitte beim Verein erfragen.';
    else status.textContent = manualLoaded || lastLiveUpdate
      ? 'Die Termine konnten nicht aktualisiert werden. Der zuletzt geladene Stand bleibt sichtbar.'
      : 'Die Terminliste konnte nicht geladen werden. Bitte erneut versuchen oder beim Verein nachfragen.';
    if (lastLiveUpdate) status.textContent += ' App-Termine zuletzt geladen: ' + timed.format(lastLiveUpdate) + ' Uhr.';
    retry.hidden = localOK && liveOK;
    busy = false;
    refreshButton.disabled = false;
    refreshButton.textContent = 'Termine aktualisieren';
    list.setAttribute('aria-busy', 'false');
  }
  refreshButton.addEventListener('click', refresh);
  function saveSelection() {
    const url = new URL(location.href);
    for (const [key, value] of [["termin", search?.value], ["kategorie", requestedCategory]]) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    history.replaceState(null, "", url);
    render();
  }
  window.addEventListener("popstate", () => {
    const params = new URL(location.href).searchParams;
    if (search) search.value = params.get("termin") || "";
    requestedCategory = params.get("kategorie") || "";
    render();
  });
  filter?.addEventListener("change", () => { requestedCategory = filter.value; saveSelection(); });
  search?.addEventListener("input", saveSelection);
  reset?.addEventListener("click", () => { if (search) search.value = ''; if (filter) filter.value = ''; requestedCategory = ''; saveSelection(); search?.focus(); });
  retry.addEventListener("click", refresh);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });
  setInterval(() => {
    if (!document.hidden) {
      if (manualLoaded) render();
      refresh();
    }
  }, 300000);
  refresh();
})();
