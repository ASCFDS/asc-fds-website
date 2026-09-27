(() => {
  "use strict";
  const list = document.getElementById("events-list");
  if (!list) return;
  const status = document.getElementById("events-status");
  const retry = document.getElementById("events-retry");
  const archive = document.getElementById("events-archive");
  const filter = document.getElementById("event-category");
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
    article.append(date, content);
    return article;
  }
  function render() {
    const rows = model.merge(manual, live);
    if (filter) {
      const selected = filter.value;
      const options = [
        ...new Set(rows.map((r) => r.category).filter(Boolean)),
      ].sort();
      filter.replaceChildren(
        new Option("Alle Kategorien", ""),
        ...options.map((c) => new Option(c, c)),
      );
      filter.value = options.includes(selected) ? selected : "";
    }
    const { upcoming, past } = model.split(
      rows.filter((r) => !filter?.value || r.category === filter.value),
    );
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
  async function refresh() {
    if (busy) return;
    busy = true;
    retry.hidden = true;
    list.setAttribute("aria-busy", "true");
    try {
      if (!manualLoaded) {
        const data = await getJSON("/assets/data/events.json");
        if (!Array.isArray(data)) throw new Error("Invalid local data");
        manual = data;
        manualLoaded = true;
        render();
      }
      const data = await getJSON(
        "https://europe-west3-asc-app-e25d6.cloudfunctions.net/publicEvents?limit=100",
      );
      const rows = Array.isArray(data) ? data : data.events;
      if (!Array.isArray(rows) || rows.some((r) => !model.normalize(r)))
        throw new Error("Invalid event response");
      live = rows;
      render();
      status.textContent =
        "Vereinstermine und öffentlich freigegebene Termine aus der ASC-App.";
    } catch {
      status.textContent =
        "Die App-Termine sind momentan nicht erreichbar. Vorhandene Vereinstermine bleiben sichtbar; kurzfristige Änderungen bitte beim Verein erfragen.";
      retry.hidden = false;
    } finally {
      busy = false;
      list.setAttribute("aria-busy", "false");
    }
  }
  filter?.addEventListener("change", render);
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
