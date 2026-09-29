# ASC-Website: Audit, Umsetzung und Qualitätsprüfung

## Aktueller Stand: Startseite unverändert, Unterseiten und Technik verbessert

Die Startseite wurde auf Wunsch wieder auf ihre ursprünglichen Inhalte und Buttons zurückgeführt. Ihr Hauptinhalt stimmt mit dem Ausgangscommit überein; kein Terminbereich, kein Termin-JavaScript und kein App-Terminabruf auf der Startseite. Metadaten, lokale Schriften und allgemeine technische Verbesserungen bleiben bestehen.

Neu auf den Unterseiten: Sprungnavigation im Vereins- und Sportbereich; Probetraining-Einstieg und zentral gepflegte Jahresbeiträge vor dem Mitgliedsantrag. Beiträge werden aus `assets/data/membership.json` auf Vereins- und Mitgliedschaftsseite eingesetzt. Fehlende Bilder werden weiter durch Initialen ersetzt, bestehende Fotos optimiert ausgeliefert.

Das Kontakt-Backend hat jetzt begrenzte Wartezeiten für Turnstile und FormSubmit, eine Größenprüfung auch ohne Content-Length-Header und kontrollierte Fehlerantworten bei nicht bestätigtem Versand. Das Frontend prüft zusätzlich die Erfolgsmeldung und verhindert parallele Übermittlungen. `scripts/test-contact.mjs` prüft diese Fälle ohne reale Nachrichten.

Die folgenden Abschnitte dokumentieren auch die vorangegangenen Gestaltungsfassungen. Maßgeblich für die Startseite ist der vorstehende aktuelle Stand.

## Gestalterische Revision vom 29. September 2026

Auf ausdrücklichen Wunsch bleibt die Website jetzt deutlich näher am ursprünglichen Layout. Wiederhergestellt sind die ursprüngliche Startseitenabfolge mit Spendenbereich direkt unter dem Hero, die vertrauten Karten, Rundungen, Hintergründe, Abstände und die Schrift Exo 2. Die abstrakte Präzisionsgrafik und die stark umgestalteten Inhaltsabschnitte wurden zurückgenommen. Die bisherigen Navigationsbezeichnungen sind wieder eingesetzt. Technische Verbesserungen, Terminarchiv, responsive Ergebnisse, Zugänglichkeit und Aktivierung externer Inhalte bleiben erhalten. Die aktuellen Vorschauen zeigen diese überarbeitete Fassung.

Die unten aufgeführten Lighthouse-Werte stammen aus der ersten Gestaltungsfassung und sind keine Messung dieser Revision.

Stand: 28. September 2026. Ausgangspunkt: GitHub `ASCFDS/asc-fds-website`, Commit `6ddc92e`. Der in der Sitzung angegebene lokale Pfad `/ASCFDS/asc-fds-website` existierte nicht. Deshalb wurde eine isolierte Arbeitskopie unter `/private/tmp/asc-website-modernization` verwendet. Keine bestehenden lokalen Änderungen wurden überschrieben.

## Phase 1: Audit

| Bereich | Vorheriger Stand und Befund |
| --- | --- |
| Aktueller Stand | Acht inhaltliche Seiten, zusätzlich die alternative Spenden-HTML-Seite. Statisches HTML, ein globales Stylesheet, Vanilla JavaScript. Cloudflare Worker mit Assets-Build und `/api/contact`; keine Framework-Migration erforderlich. Die ältere Hosting-Angabe „GitHub Pages“ in der Datenschutzerklärung passte nicht zum aktuellen Worker und dem Live-Abruf. |
| Stärken | Original-Logo und Vereinsfarben vorhanden; klare Vereinsinformationen; bestehender campai-Antrag; funktionsfähiger öffentlicher App-Endpunkt; serverseitiges Kontaktformular mit Turnstile, Honeypots und Rate-Limit; keine eigenen Analysebibliotheken. |
| UX-Probleme | Hero führte zuerst zu Sportbetrieb/allgemeinem Kontakt. Anschrift für Post und Trainingsort waren nicht sauber erklärt. Große Ergebnis-Tabelle verlangte horizontales Scrollen. Fehlende Trennung künftiger und vergangener Termine. |
| Designprobleme | Sehr hoher Desktop-Header, starke Schatten, viele gleichartige Karten, kaum visuelle Abstufung. Vorstandskarten verwiesen auf drei nicht vorhandene Bilder; falsche Platzhalter-Alttexte. Vorhandenes „hero-placeholder.jpg“ ist tatsächlich eine PNG-Grafik, kein geeignetes Vereinsfoto. |
| Technische Probleme | Doppelte Termin-Sortierung/Statuslogik. Inline-onerror-Handler bei Bildern kollidierten mit der bestehenden CSP. Beim erfolgreichen Abruf einer leeren App-Liste verschwanden die manuellen Termine. Header/Footer wurden separat in neun Dateien gepflegt. |
| Content-Probleme | Keine strukturierten Medaillen-/Erfolgsdaten, keine Anlagen-/Actionfotos, keine Mitgliederzahl. Historische Ergebnisse teilweise ohne Dokument. campai enthält eine Altersvalidierung auf mindestens 18 Jahre, während die Vereinsseite auch Minderjährige anspricht. |
| SEO | Titel und Descriptions vorhanden, jedoch fast überall keine Canonicals, OpenGraph, strukturierten Daten, Sitemap oder robots.txt. |
| Performance | Externe Google Fonts auf allen Seiten; Porträts mit ca. 3,5–4,3 MB je Bild; Original-Logos in sehr hoher Auflösung. Kein dokumentierter Lighthouse-Baselinewert: Es wird keine erfundene Vorher-Nachher-Punktedifferenz behauptet. |
| Accessibility/Datenschutz | Keine Skip-Navigation, fehlende Reduced-Motion-Regel, unvollständige Tastaturbedienung des Mobilmenüs. Google Maps lud ohne Aktivierung, obwohl der Datenschutztext Zustimmung beschrieb. Spenden- und campai-Skripte wurden sofort geladen. |

## Phase 2: Zielarchitektur

- Vorhandene Seitenadressen und Cloudflare-Deployment bleiben bestehen.
- Startseite: ursprünglicher Hero → Spenden → Kennzahlen → Verein/Probetraining → Disziplinen → nächste Termine → Instagram → Kontakt.
- Navigation: Über uns, Events & Sportbetrieb, Spenden, Kontakt & Anfahrt; Mitglied werden als Header-Aktion. Primäre Hero-Aktion: Probetraining.
- Header/Footer: `partials/`, beim bestehenden Build in statisches HTML eingesetzt. Kein clientseitig nachgeladenes Menü, kein CMS und keine Runtime-Dependency.
- Termine/Ergebnisse: zwei zentrale JSON-Dateien, statisch generierter Inhalt als Basis; App-Termine werden ergänzend sicher gerendert.
- Design: Originalrot `#dd2a1b`, am Logo per Pixelanalyse bestätigt. Dunklere Rotvariante für Text/Buttons, bestehende Flächen und Karten; ursprüngliche Schrift Exo 2 wird lokal als WOFF2 ausgeliefert, ohne Google-Fonts-Verbindung.
- Willi: leerer `#assistant-root` als gemeinsamer Integrationspunkt, noch keine Scripte, Datenübertragung oder Chatfunktion. Eine spätere produktive Integration braucht Backend, geprüfte Vereinsquellen, Fehler-/Offlineverhalten und zugängliche Bedienung. Details in `PFLEGE.md`.

## Phase 3: Umgesetzt

- Startseite im vertrauten ursprünglichen Layout; zwei klare Hero-CTAs und ergänzte nächste Termine. Kein fremdes oder erfundenes Sportfoto.
- Kennzahlen ausschließlich aus vorhandenen Vereinsinhalten: 2011, Trainingsdistanzen, WM-/EM-Hinweis. Keine erfundenen Mitglieder-/Titelzahlen.
- Niedrigschwelliger Einstieg und Probetraining-Verlinkung; Anliegen im Kontaktformular wird automatisch vorausgewählt. Backend-Feldvertrag und Schutzmechanismen bleiben erhalten; Übermittlung und Serverdienste erhalten Zeitlimits.
- Eindeutige Postanschrift (Gerhart-Hauptmann-Weg 8) und Trainingsort (Erlenweg 29/1).
- Aufsteigend sortierte kommende Termine; abgelaufene Termine im aufklappbaren Archiv; Kategorien aus tatsächlich verfügbaren Daten. Ganztägige Veranstaltungen bleiben bis zum Ende ihres Berliner Kalendertags sichtbar. Keine Termine auf der Startseite; Anzeige ausschließlich im Sport-/Terminbereich.
- Manueller Datenbestand bleibt auch bei leerer oder fehlgeschlagener App-Antwort erhalten. App-Inhalte werden mit `textContent` ausgegeben; keine HTML-Injektion. Zeitlimit, Wiederholung, Aktualisierung alle fünf Minuten und beim Zurückkehren zur Seite.
- Strukturierte Ergebnisdaten mit Datum, Wettkampf, Disziplin, vorhandenem Ort, Status und Dokumentlink. Status aktualisiert sich anhand des Datums; mobile Darstellung als beschriftete Karten.
- Vorhandene Vorstandsporträts als kleinere WebP-Dateien; fehlende Porträts als Initialen. Originalbilder und Original-Logodateien bleiben unverändert im Repository. Responsive Logo-Derivate.
- Maps, Spendenwidget und Mitgliedsantrag hinter separaten Aktivierungsschaltflächen, mit Datenschutzhinweis und Möglichkeit, die Einbindung durch Neuladen zu beenden. Keine dauerhafte Zustimmungsspeicherung. Links und Kontaktalternativen bleiben nutzbar.
- Der Spendenzweck wurde auf der bestehenden Projektseite verifiziert: Erneuerung der Schießstandtechnik und begleitende Modernisierung. Keine fest eingetragenen Spendenstände. Quelle: [bestehendes ASC-Projekt](https://www.viele-schaffen-mehr.de/projekte/ascfds).
- Nachladestart des echten Spendenwidgets repariert: Der Anbieter initialisiert standardmäßig bei `DOMContentLoaded`; bei Aktivierung wird seine vorhandene Funktion `loadWidget()` explizit aufgerufen.
- Datenschutztexte an die technisch beobachtete Einbindung angepasst: Cloudflare, campai-Aktivierung, FormSubmit, Firebase-Terminabruf und lokales Spam-Limit. Das ist keine abschließende juristische Prüfung sämtlicher Dienstleisterverträge.
- Skip-Link, Fokuszustände, Escape-/Fokusverhalten im Mobilmenü, sichtbare Navigation ohne JavaScript, Reduced Motion, Touch-Ziele und korrigierte Kontraste.
- Canonicals, OpenGraph, Twitter-Metadaten, SportsOrganization/PostalAddress, BreadcrumbList und Event-Markup aus vorhandenen Daten, Sitemap, robots.txt. Event-Markup enthält bewusst keine erfundenen Orte/Preise; daraus folgt kein Anspruch auf Google-Rich-Results.
- Kein zusätzlicher Trackingdienst, keine Frontend-Secrets, keine neue Runtime-Bibliothek.

## Phase 4: Prüfung

| Prüfung | Ergebnis / Grenze |
| --- | --- |
| Build | `node scripts/build-assets.js` erfolgreich; ursprünglicher Worker-Routing und Deployment-Befehl bleiben erhalten. |
| Terminregressionen | `node scripts/test-events.cjs`: 11 Prüfungen, einschließlich Berliner Tagesgrenze, Sommerzeitwechsel, mehrtägiger Termine, privater/stornierter Einträge und Duplikate. |
| Browser | Chromium: alle neun HTML-Seiten in 320, 390, 768, 1024 und 1440 px, kein horizontaler Dokumentüberlauf, keine defekten Bilder, keine JavaScript-Laufzeit-Ausnahmen. |
| Automatisierte Accessibility | axe: keine gemeldeten WCAG-A/AA-Verstöße auf allen neun Seiten in 390 und 1440 px. Dies ersetzt weder einen vollständigen Screenreader-Test noch eine WCAG-Zertifizierung. |
| Interne Links | Alle neun HTML-Dokumente: lokale Dateien, Sprungziele, eindeutige IDs und jeweils genau eine H1 geprüft. |
| Funktionsprüfungen | Mobilmenü/Escape/Fokus, Archiv, Kategorie, Zusammenführen und Limitieren der Termine, sichere Textausgabe, drei Einwilligungsschranken mit Widerruf und Fallback ohne JavaScript bestanden. |
| Formular | Vorauswahl, erfolgreiche Übermittlung und Serverfehler mit Mock geprüft. Eingaben bleiben bei Fehlern erhalten. Keine echten Nachrichten versandt. Produktions-GET `/api/contact` antwortet HTTP 200; tatsächliche Mailzustellung noch nicht durch Versand bestätigt. |
| Echte Anbieter | Maps-Iframe nach Aktivierung geladen; Spendenwidget liefert Projektinhalt; campai-Skript HTTP 200 und reales Formular visuell dargestellt. Prüfung auch unter der vorhandenen CSP. Kein Antrag und keine Spende abgesendet. |
| App-Endpunkt | Öffentlicher Endpunkt antwortet HTTP 200 und zum Prüfzeitpunkt mit leerem `events`-Array. Lokale Herkunft ist vom produktiven CORS absichtlich nicht freigegeben; Die CORS-Antwort für `https://www.asc-fds.de` wurde mit passendem Origin-Header bestätigt. Live-App-Integration nach Veröffentlichung auf der echten Domain nochmals prüfen. |
| Performance-Labor | Lokale mobile Lighthouse-Messung: Performance 95, Accessibility 100, Best Practices 96, SEO 100. FCP 1,2 s; LCP 2,9 s; CLS 0; Total Blocking Time 0 ms. Best-Practices-Abzug wegen CORS auf localhost. Keine Behauptung über bereits veröffentlichte Werte oder reale INP-Felddaten. |
| Bilder | Vier ausgelieferte WebP-Porträts zusammen ca. 176 KB statt zusammen ca. 15 MB Originaldateien. Google-Fonts-Requests auf den Vereinsseiten entfernt. |

Messwerte sind lokale Momentaufnahmen. Die Änderungen sind nicht automatisch ein Nachweis für Live-Deployment, tatsächliche Mailzustellung, Zahlung oder ein abgeschlossenes Vereinsformular.

## Geänderte und neue Dateien

- Seiten: `index.html`, `ueber-uns.html`, `events_sportbetrieb.html`, `kontakt.html`, `mitglied-werden.html`, `spende.html`, `spende/index.html`, `impressum.html`, `datenschutz.html`.
- Design/Verhalten: `assets/css/styles.css`, `assets/js/main.js`, `assets/js/public-events.js`, neu `assets/js/event-model.js`.
- Pflege: neu `assets/data/events.json`, `assets/data/results.json`, `partials/header.html`, `partials/footer.html`, `scripts/render-content.js`, `scripts/render-shell.js`; bestehendes `scripts/build-assets.js` erweitert.
- SEO/Caching: `robots.txt`, `sitemap.xml`, `_headers`.
- Bildauslieferung: neue `logo-*-320.webp`, `logo-*-640.webp`, `vorstand-{2,4,6,7}.webp`.
- Qualität/Dokumentation: `scripts/test-events.cjs`, zusätzliche Prüfskripte und diese Dokumentation.

## Fehlende Inhalte und nächste Schritte

1. Belegte Erfolgsliste mit Name, Jahr, Wettbewerb, Disziplin und Platzierung. Aktuell bleibt es beim bereits vorhandenen WM-/EM-Hinweis; keine erfundene Hall of Fame.
2. Fehlende Ergebnisdokumente beziehungsweise Berichte ergänzen. Das Datum allein belegt kein Resultat.
3. campai-Altersbeschränkung mit dem Vereinsprozess für Minderjährige abstimmen. Bestehendes Antragsmodell wurde unverändert übernommen.
4. Nach Veröffentlichung: echter Kontaktversand mit Zustellkontrolle, App-Ereignis auf der echten Domain, mobile Safari-Prüfung und erneute Lighthouse-Messung. Zahlungs-/Antragsabschluss nur mit entsprechend autorisierter realer Transaktion.
5. Datenschutzhinweise um organisatorische Angaben, Auftragsverarbeitung, Löschfristen und Drittlandtransfers der tatsächlich beauftragten Anbieter prüfen lassen. Technische Einwilligungsschalter allein beweisen keine vollständige DSGVO-Konformität.
6. App-Archiv: Der Browser kann nur vom Endpunkt gelieferte Ereignisse archivieren. Für eine dauerhafte vollständige App-Historie muss der Endpunkt diese auch liefern; manuelle Termine bleiben dauerhaft in der JSON-Datei.

## Diese Fotos sollten wir für die Website noch aufnehmen

- Ein echtes ASC-Actionfoto als Hero: Querformat mit freiem Textbereich, zusätzlich geeigneter mobiler Ausschnitt.
- Match-Armbrust im Training und Feldarmbrust im Training: für die beiden Sportbereiche.
- 10-m-Stand und Feldarmbrust-Außenanlage: tatsächliche Trainingsumgebung zeigen.
- Gemeinschaft/Mannschaft beim Training oder Vereinsleben: für den Vereins-/Einstiegsbereich.
- Fehlende Porträts: Andreas Henne, Roland Schmid und David Wälde, passend zu den vorhandenen Vorstandsfotos.

Jugendfotos nur bei passender Freigabe; kein zusätzlicher Bildbestand allein für dekorative Karten nötig. Die aktuellen Initialen und das grafische Hero funktionieren bis zur Ergänzung ohne sichtbares „Bild folgt“.

## Vorschauen und Prüfartefakte

- [Terminseite mobil](vorschau-termine-mobil.png)
- [Mitgliedschaft mobil](vorschau-mitgliedschaft-mobil.png)
- [Vereinsseite](vorschau-verein.png)
- [Desktop-Vorschau](vorschau-desktop.png)
- [Smartphone-Vorschau](vorschau-mobil.png)
- [Automatisierte Browserresultate](qa-browser.json)
- [Funktionsprüfungen mit simulierten Diensten](qa-interactions.json)
- [Lighthouse-Messung im lokalen Labor](lighthouse.json)
