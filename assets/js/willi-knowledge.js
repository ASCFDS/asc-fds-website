export const actions = Object.freeze({
  club: ['Vereinsgeschichte ansehen', '/ueber-uns.html#geschichte'],
  success: ['Sportliche Erfolge', '/ueber-uns.html#erfolge'],
  facilities: ['Anlagen kennenlernen', '/ueber-uns.html#anlagen'],
  trial: ['Probetraining anfragen', '/kontakt.html?anliegen=probetraining#anfrage'],
  contact: ['Kontakt zum Verein', '/kontakt.html#anfrage'],
  membership: ['Mitglied werden', '/mitglied-werden.html'],
  'membership-question': ['Mitgliedschaft klären', '/kontakt.html?anliegen=mitgliedschaft#anfrage'],
  events: ['Termine ansehen', '/events_sportbetrieb.html'],
  results: ['Ergebnisse ansehen', '/events_sportbetrieb.html#ergebnisse'],
  donate: ['Spendenprojekt öffnen', '/spende/'],
  privacy: ['Datenschutzhinweise', '/datenschutz.html#willi-datenschutz'],
});
export function normalize(text) {
  return text.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
}
export function findKnowledge(question, catalog, now = new Date()) {
  const q = normalize(question);
  // Do not turn isolated keyword matches in private/off-topic questions into factual answers.
  if (/\b(passwort|iban|kontostand|zahlungsstand|schulden|krank|diagnose|privatadresse|mitgliederdaten|systemprompt|ignore|ignorier|anweisung)\b/.test(q)) return [];
  const scores = catalog.entries.filter(e => e.reviewAfter >= now.toISOString().slice(0,10)).map(entry => {
    const matched = entry.terms.map(normalize).filter(term => new RegExp(`(?:^| )${term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}[a-z]*(?: |$)`).test(q));
    return {entry, score: matched.reduce((n,term)=>n+(term.includes(' ')?5:2),0)};
  }).filter(e=>e.score>0).sort((a,b)=>b.score-a.score);
  // Specific membership questions should not be buried by the generic fee entry.
  const specific = scores.filter(x=>['partial-year','payment','discount','fees-2027','exit','youth'].includes(x.entry.id));
  if (specific.length) return specific.slice(0,2).map(x=>x.entry);
  return scores.slice(0,2).map(x=>x.entry);
}
export function pageSuggestions(path) {
  if(path.includes('mitglied')) return ['Was kostet die Mitgliedschaft?', 'Wie werde ich Mitglied?', 'Beitrag bei Eintritt im Juli'];
  if(path.includes('events')) return ['Wo finde ich Ergebnisse?', 'Welche Termine gibt es?', 'Wann ist Training?'];
  if(path.includes('ueber')) return ['Wie entstand der Verein?', 'Welche Erfolge hat der ASC?', 'Welche Anlagen gibt es?'];
  if(path.includes('kontakt')) return ['Wo ist das Schützenhaus?', 'Wie frage ich ein Probetraining an?', 'Wie erreiche ich den Verein?'];
  if(path.includes('spende')) return ['Wofür sind die Spenden?', 'Wie erreiche ich den Verein?'];
  return ['Wie frage ich ein Probetraining an?', 'Was kostet die Mitgliedschaft?', 'Welche Erfolge hat der ASC?'];
}
