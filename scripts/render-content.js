/* Generate crawlable HTML from the same sources used for live enhancement. */
import { readFileSync, writeFileSync } from "node:fs";
import "../assets/js/event-model.js";
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const events = JSON.parse(readFileSync("assets/data/events.json", "utf8"));
const results = JSON.parse(readFileSync("assets/data/results.json", "utf8"));
const fmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeZone: "Europe/Berlin",
});
const date = (d) => fmt.format(new Date(d));
const range = (r) =>
  date(r.startDate) +
  (r.endDate !== r.startDate ? " – " + date(r.endDate) : "");
const card = (r) =>
  `<article class="timeline-item"><time class="timeline-date" datetime="${escape(r.startDate)}">${range(r)}</time><div class="timeline-content"><span class="event-category">${escape(r.category)}</span><h3>${escape(r.title)}</h3><p>${escape(r.description)}</p></div></article>`;
function replaceBlock(s, kind, content) {
  const re = new RegExp(
    `<!-- ${kind}(?: START)? -->[\\s\\S]*?<!-- ${kind} END -->|<!-- ${kind} -->`,
  );
  return s.replace(
    re,
    `<!-- ${kind} START -->\n${content}\n<!-- ${kind} END -->`,
  );
}
const split = globalThis.ASCEvents.split(events);
for (const file of ["index.html", "events_sportbetrieb.html"]) {
  let s = readFileSync(file, "utf8");
  s = replaceBlock(
    s,
    "EVENTS",
    (file === "index.html" ? split.upcoming.slice(0, 3) : split.upcoming)
      .map(card)
      .join("\n") ||
      "<p>Aktuell sind keine kommenden Vereinstermine veröffentlicht.</p>",
  );
  if (file === "events_sportbetrieb.html") {
    s = s.replace(
      '<div class="timeline" id="events-archive"></div>',
      '<div class="timeline" id="events-archive"><!-- ARCHIVE --></div>',
    );
    s = replaceBlock(s, "ARCHIVE", split.past.map(card).join("\n"));
    const rows = results
      .slice()
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      .map((r) => {
        const future =
          globalThis.ASCEvents.split([{ ...r, hasTime: false }]).upcoming
            .length > 0;
        const status = r.url
          ? "Ergebnisse verfügbar"
          : future
            ? "Bevorstehend"
            : r.status === "report-pending"
              ? "Bericht folgt"
              : "Abgeschlossen";
        return `<tr data-result-start="${escape(r.startDate)}" data-result-end="${escape(r.endDate)}" data-result-status="${escape(r.status)}"><td data-label="Datum">${range(r)}</td><td data-label="Wettkampf">${escape(r.title)}</td><td data-label="Disziplin">${escape(r.discipline)}</td><td data-label="Ort">${escape(r.location || "Nicht angegeben")}</td><td data-label="Status"><span class="result-badge">${status}</span></td><td data-label="Dokument">${r.url ? `<a class="result-link" href="${escape(r.url)}" target="_blank" rel="noopener noreferrer">Ergebnisse ansehen ↗</a>` : "Noch kein Ergebnislink"}</td></tr>`;
      });
    s = replaceBlock(s, "RESULTS", rows.join("\n"));
  }
  if (file === "events_sportbetrieb.html") {
    const schemas = events.map((r) => ({
      "@context": "https://schema.org",
      "@type": "Event",
      name: r.title,
      startDate: r.startDate,
      endDate: r.endDate,
      description: r.description,
      organizer: {
        "@type": "SportsOrganization",
        name: "ASC Freudenstadt e.V.",
        url: "https://www.asc-fds.de/",
      },
    }));
    s = s.replace(
      /\s*<script type="application\/ld\+json" data-event-schema>[\s\S]*?<\/script>/,
      "",
    );
    s = s.replace(
      "</head>",
      `  <script type="application/ld+json" data-event-schema>${JSON.stringify(schemas).replace(/</g, "\\u003c")}</script>\n</head>`,
    );
  }
  writeFileSync(file, s);
}
