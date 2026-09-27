/* Date-only events use the club's calendar day, independent of visitor timezone. */
(function (root) {
  "use strict";
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" });
  function parse(value) {
    if (value == null || value === "") return null;
    const seconds =
      typeof value === "object" ? (value.seconds ?? value._seconds) : undefined;
    const d = new Date(seconds === undefined ? value : seconds * 1000);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  function normalize(row) {
    if (!row || typeof row.title !== "string" || !row.title.trim()) return null;
    const start = parse(row.startDate),
      end = parse(row.endDate) || start;
    if (
      !start ||
      end < start ||
      row.publishToHomepage === false ||
      (row.visibility && row.visibility !== "public") ||
      row.cancelled ||
      row.deleted ||
      ["cancelled", "deleted"].includes(row.status)
    )
      return null;
    return {
      ...row,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }
  function split(rows, now = new Date()) {
    const today = day.format(now),
      upcoming = [],
      past = [];
    rows
      .map(normalize)
      .filter(Boolean)
      .forEach((row) => {
        const end = parse(row.endDate);
        const expired =
          row.hasTime === false ? day.format(end) < today : end < now;
        (expired ? past : upcoming).push(row);
      });
    upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate));
    past.sort((a, b) => b.startDate.localeCompare(a.startDate));
    return { upcoming, past };
  }
  function merge(manual, live) {
    const rows = new Map();
    [...manual, ...live].forEach((raw) => {
      const row = normalize(raw);
      if (!row) return;
      const key = `${row.title.trim().toLocaleLowerCase("de-DE")}|${day.format(parse(row.startDate))}`;
      rows.set(key, row);
    });
    return [...rows.values()];
  }
  root.ASCEvents = { parse, normalize, split, merge };
})(globalThis);
