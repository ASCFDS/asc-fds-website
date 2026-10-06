/* Local iCalendar export: no account, tracking, or calendar-provider request. */
(function (root) {
  'use strict';
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' });
  const encoder = new TextEncoder();
  const stamp = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const text = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  function fold(line) {
    let result = '', bytes = 0;
    for (const char of line) {
      const size = encoder.encode(char).length;
      if (bytes + size > 75) { result += '\r\n '; bytes = 1; }
      result += char; bytes += size;
    }
    return result;
  }
  function calendar(raw, now = new Date()) {
    const event = root.ASCEvents.normalize(raw);
    if (!event) throw new Error('Invalid public event');
    // Match the merge identity so the same event keeps its UID after a live refresh.
    const identity = event.title.trim().toLocaleLowerCase('de-DE') + '|' + day.format(new Date(event.startDate));
    const uid = Array.from(encoder.encode(identity), byte => byte.toString(16).padStart(2, '0')).join('');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ASC Freudenstadt//Vereinstermine//DE', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${uid}@asc-fds.de`, `DTSTAMP:${stamp(now)}`];
    if (event.hasTime === false) {
      const start = day.format(new Date(event.startDate));
      const end = new Date(day.format(new Date(event.endDate)) + 'T00:00:00Z');
      end.setUTCDate(end.getUTCDate() + 1); // RFC 5545: DTEND is exclusive.
      lines.push('DTSTART;VALUE=DATE:' + start.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + end.toISOString().slice(0, 10).replace(/-/g, ''));
    } else {
      lines.push('DTSTART:' + stamp(event.startDate));
      if (event.endDate !== event.startDate) lines.push('DTEND:' + stamp(event.endDate));
    }
    lines.push('SUMMARY:' + text(event.title));
    const note = 'Einmaliger Kalenderimport. Änderungen werden nicht automatisch übernommen. Aktuellen Stand auf https://www.asc-fds.de/events_sportbetrieb.html prüfen.';
    lines.push('DESCRIPTION:' + text([event.description, note].filter(Boolean).join('\n\n')));
    if (typeof event.location === 'string' && event.location.trim()) lines.push('LOCATION:' + text(event.location));
    lines.push('URL:https://www.asc-fds.de/events_sportbetrieb.html#termine', 'END:VEVENT', 'END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  root.ASCEvents.calendar = calendar;
  root.ASCEvents.matches = (query, values) => {
    const normalize = value => String(value ?? '').toLocaleLowerCase('de-DE').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    const haystack = normalize(values.join(' '));
    return normalize(query).trim().split(/\s+/).every(word => haystack.includes(word));
  };
})(globalThis);
