# Website pflegen

Die Seite bleibt eine statische Website mit dem bestehenden Cloudflare Worker. Node wird für den Build benötigt; es gibt keine neuen produktiven npm-Abhängigkeiten.

## Lokal bauen

```sh
node scripts/build-assets.js
node scripts/test-events.cjs
node scripts/test-contact.mjs
python3 scripts/check-links.py
```

Der Build synchronisiert zuerst `partials/header.html` und `partials/footer.html` in alle Seiten. Danach generiert er die markierten Termin-/Ergebnisbereiche aus JSON und kopiert öffentliche Dateien nach `dist`. Worker/API, Quellcode, Dokumentation und Prüfberichte werden nicht in `dist` kopiert. Bestehendes `wrangler.jsonc` und Worker-Routing gelten unverändert.

Die generierten HTML-Bereiche zwischen `EVENTS START/END`, `ARCHIVE START/END` und `RESULTS START/END` nicht manuell pflegen. Änderungen an Inhalt außerhalb dieser Bereiche bleiben erhalten. Gemeinsame Navigation ausschließlich in `partials` ändern. Nach dem Build die erzeugten HTML-Änderungen mit einchecken, damit auch ein statischer Checkout vollständig lesbar bleibt.

## Termine

`assets/data/events.json` enthält die bereits veröffentlichten manuellen Vereinstermine. Felder:

- `id`: stabile Kennung.
- `title`, `description`: Text, kein HTML.
- `startDate`, `endDate`: bei ganztägigen Veranstaltungen `YYYY-MM-DD` und `hasTime: false`; sonst ISO-Datum mit Zeitzonenoffset und `hasTime: true`.
- `category`: beispielsweise `Wettkampf`, `Vereinsleben`, `Sitzung`, `Veranstaltung`, `Ausflug`. Nur tatsächlich passende Kategorien verwenden.
- `location`: optionaler belegter Veranstaltungsort.

Abgelaufene Termine nicht löschen: Die Website ordnet sie automatisch dem Archiv zu. Für mehrtägige Ausflüge Start UND Ende eintragen. Kategorieauswahl entsteht automatisch aus den vorhandenen Daten. Die Startseite bleibt ohne Termine. Alle Termine erscheinen ausschließlich auf `events_sportbetrieb.html`.

Die App bleibt eine zweite, schon vorhandene Quelle. Nur dort explizit für die Homepage freigegebene öffentliche Termine dürfen vom Backend geliefert werden. Gleicher Titel am gleichen Berliner Starttag wird zusammengeführt; App-Inhalte haben dabei Vorrang. Der leere Livefeed löscht keine manuellen Einträge. Bei API-Fehlern bleibt der Datenbestand sichtbar. Zum dauerhaften Archivieren von App-Terminen muss der Endpunkt entsprechende vergangene Einträge liefern.

## Mitgliedsbeiträge

`assets/data/membership.json` ist die zentrale Quelle für die bereits veröffentlichten Jahresbeiträge. Änderungen dort werden beim Build in Vereins- und Mitgliedschaftsseite übernommen. Die Startseite wird weder hier noch vom Termin-Generator verändert.

## Ergebnisse

`assets/data/results.json`: `id`, `title`, `startDate`, `endDate`, `discipline`, `location`, `url`, `status`.

- `available`: nur wenn ein funktionierender Ergebnislink vorhanden ist.
- `report-pending`: Bericht wird erwartet; vor dem Veranstaltungsende wird „Bevorstehend“ angezeigt.
- `completed`: abgeschlossen, ohne angekündigten Bericht.

Keine Platzierungen aus dem Veranstaltungsnamen ableiten. Unbekannte Orte bleiben `null`. Neue Jahrgänge lassen sich derselben Datenquelle hinzufügen; eine gesonderte Jahresnavigation ist erst bei mehreren Jahrgängen sinnvoll. Die derzeitige Ausgabe ist nach Datum geordnet, die mobile Darstellung nutzt dieselben Daten wie die Tabelle.

## Bilder und Design

Original-Logo-PNGs nicht verändern. Die WebP-Derivate sind Größenvarianten derselben Originalgrafik. Header/Footer verwenden `srcset`; vorhandene Porträts werden als 480×480-WebP ausgeliefert. Keine künstlichen Porträts einsetzen.

Design Tokens stehen oben in `assets/css/styles.css`. Originalrot: `--color-primary`; kontraststärkere Variante: `--color-primary-dark`. Die ursprüngliche Schrift Exo 2 liegt als lokale WOFF2-Datei in `assets/fonts`; ihre OFL-Lizenz liegt daneben. Kein externer Font-Aufruf nötig. Bewegung wird bei `prefers-reduced-motion` abgeschaltet.

Für einen echten Hero das vorhandene Hintergrundmaterial durch ein freigegebenes ASC-Foto beziehungsweise eine semantische Bildkomponente mit sinnvollem Mobile-Crop ersetzen. Das LCP-Bild nicht lazy laden; `width`, `height`, passende `srcset`/`sizes` und Alternativtext setzen. Redaktionsfreigabe für das konkrete Vereinsfoto einholen.

## Externe Inhalte

`data-external="maps|donation|membership"` definiert eine separat aktivierbare Einbindung. Die Vorlage liegt in einem inaktiven `template`; die Skripte werden erst auf Klick hinzugefügt. Der Spendenanbieter braucht nach Nachladen ausdrücklich `window.loadWidget()`. Widerruf lädt die Seite neu und stellt den inaktiven Zustand wieder her; Einwilligung wird nicht dauerhaft gespeichert.

Provider-Konfigurationen (Spendenprojekt-ID, campai-Modell) nur mit Wissen des Vereins ändern. Das campai-Modell enthält eine Altersbeschränkung; diese ist fachlich zu klären. Die CSP in `_headers` weiterhin mit echten Anbietern prüfen. Externe Formulare können eigene Barrierefreiheits-/Datenschutzanforderungen haben.

## Kontakt und Sicherheit

Das Formular behält `/api/contact`, Honeypots, Turnstile und die bestehenden Feldnamen. `?anliegen=probetraining#anfrage` wählt den Betreff vor. Backend-Secrets bleiben in Cloudflare; keine Werte in HTML/JavaScript eintragen. `SECURITY_SETUP.md` gilt weiter.

Der Servercode behält das bestehende Versandziel, begrenzt eingehende Daten auf 24 KB auch ohne Größenheader und wartet höchstens 5 Sekunden auf Turnstile sowie 10 Sekunden auf den Versanddienst. Nur dessen bestätigte Erfolgsantwort wird als Erfolg an den Browser gemeldet. Fehler löschen keine Nutzereingaben. Ein erfolgreicher Mock oder HTTP-200-GET ist kein Zustellnachweis. Dafür nach Veröffentlichung einen bewusst autorisierten Testversand mit Rückmeldung im Verein durchführen.

## Willi pflegen

Willi ist seit 04.10.2026 auf der produktiven Website eingebunden. Die lokale Wissenssuche nutzt den geprüften Katalog; externe KI bleibt deaktiviert. Quellen, Prüftermine und Betriebsgrenzen stehen in `WILLI.md`.

Bei Ladefehlern bleiben eingegebene Fragen erhalten; ein Wiederholungsbutton und der Kontaktweg stehen bereit. Auf Touch-Geräten erhält zunächst der Schließen-Button den Fokus, damit die Tastatur die Themenvorschläge nicht sofort verdeckt. Auf Geräten mit präzisem Zeiger wird das Fragenfeld fokussiert. Kleine Bildschirmhöhen verwenden einen kompakten Dialogkopf.

## Veröffentlichung

Die produktive Website läuft auf Cloudflare Pages (`asc-fds-website`), automatisch aus GitHub `main`. `wrangler.jsonc` beschreibt einen alternativen Worker-Build und ist nicht die produktive Pages-Konfiguration. Pages Functions müssen auch mit dem derzeit eingesetzten Wrangler 3.114.17 kompilieren. Bestehenden Cloudflare-Pages-Build verwenden. Die Änderungen zunächst in einem eigenen Git-Branch prüfen. Nach Merge und Deployment kontrollieren: produktive Domain, Canonicals, Sitemap, Kontakt-Konfiguration, Termindaten/CORS, Spendenwidget, campai und Maps. Kein „live“-Status allein aufgrund eines erfolgreichen lokalen Builds.

## Optionale automatisierte Browserprüfung

Die QA-Werkzeuge sind absichtlich keine Laufzeitabhängigkeiten der Vereinswebsite. In einem separaten Ordner `playwright` und `@axe-core/playwright` installieren und Chromium über Playwright bereitstellen. Anschließend die gebaute Website lokal bereitstellen, möglichst mit den Headern aus `_headers`.

```sh
NODE_PATH=/private/tmp/asc-qa/node_modules ASC_QA_BASE_URL=http://127.0.0.1:8766 node scripts/check-browser.cjs
NODE_PATH=/private/tmp/asc-qa/node_modules ASC_QA_BASE_URL=http://127.0.0.1:8766 node scripts/check-interactions.cjs
```

`check-browser.cjs` prüft alle neun HTML-Seiten in fünf Breiten; axe läuft auf Smartphone und Desktop. `check-interactions.cjs` simuliert API und externe Skripte, sendet keine echten Nachrichten und prüft den aktuellen redaktionellen Datenbestand. Die erwarteten Eintragszahlen leitet der Integrationstest aus den aktuellen zentralen Daten ab. Ergebnisse und Screenshots werden unter `/private/tmp/asc-website-qa-*` abgelegt. Testwerkzeuge gehören nicht ins Deployment.


Kartenvorschau: assets/img/anfahrt-preview.svg ist eine lokal gerenderte OpenStreetMap-Karte (Daten © OpenStreetMap-Mitwirkende, ODbL, https://www.openstreetmap.org/copyright). Ausschnitt: 8.422,48.452 bis 8.446,48.464; Abruf 2026-10-03. Position Erlenweg 29/1: OSM-Knoten 4228846869. Keine externen Ressourcen im SVG; Quellenhinweis direkt unter der Vorschau beibehalten. Google Maps wird erst nach Aktivierung geladen.


## Funktionsverbesserungen vom 04.10.2026

Externe Einbindungen bekommen 15 Sekunden zum Laden. Bei Fehler oder Zeitüberschreitung werden eingebettete Inhalte entfernt, die Aktivierung erneut angeboten und verspätete Callbacks ignoriert. Bereits gestartete Drittanbieter-Skripte lassen sich dadurch nicht sicher rückgängig machen; der Entfernen-Button lädt weiterhin die gesamte Seite neu. Ein iframe-Load-Event beweist nicht, dass der Drittanbieter intern fehlerfrei dargestellt wird; deshalb bleibt der direkte Routenlink als Alternative verfügbar.

`NODE_PATH=<QA-Ordner>/node_modules node scripts/test-ui-recovery.cjs` prüft mit jsdom 26.1.0 die Einwilligungsschranken, Ladefehler, Zeitüberschreitung, Wiederholung, veraltete Callbacks, Fokus und Willi-Fehlerzustände. Das ist eine DOM-Funktionsprüfung, keine visuelle Browser- oder Geräteprüfung. Testabhängigkeiten bleiben außerhalb der veröffentlichten Website.


## Terminsuche, Kalenderdateien und Ergebnisfilter (06.10.2026)

Die Terminübersicht durchsucht Titel, Beschreibung, Ort, Kategorie und angezeigte Datumswerte. Kategorie und Suchtext lassen sich kombinieren; passende Archivtreffer werden aufgeklappt. Ohne JavaScript bleibt die statische Terminliste sichtbar. Die Ergebnisübersicht bietet eine Textsuche sowie den Filter „Nur mit Ergebnislink“; es werden keine fehlenden Ergebnisse ergänzt oder behauptet.

Jeder dynamisch angezeigte öffentliche Termin lässt sich lokal als `.ics` herunterladen. Der Export überträgt keine Daten an einen Kalenderdienst und legt selbst keinen Kalendereintrag an. Der Besucher importiert die Datei in seiner Kalender-App. Ganztägige Termine erhalten das exklusive Enddatum nach RFC 5545; Termine mit Uhrzeit werden in UTC exportiert. Unbekannte Orte und Dauern werden nicht erfunden. Der Import ist eine Momentaufnahme, kein automatisch aktualisiertes Abonnement.

Dateien: `assets/js/event-calendar.js`, `assets/js/public-events.js`, `assets/js/results-search.js`. Kalender- und Suchlogik: `node scripts/test-calendar.cjs`. DOM-Funktionstest mit jsdom 26.1.0 im separaten QA-Ordner: `NODE_PATH=<QA-Ordner>/node_modules node scripts/test-event-tools.cjs`. Geprüft sind auch mehrtägige Termine, Sommerzeitwechsel, Schaltjahr, sichere Textausgabe, API-Ausfall und Filter-Rücksetzung. Diese Tests ersetzen keine visuelle Geräteprüfung oder einen echten Import in Apple Kalender/Outlook.

Formatreferenz: https://www.rfc-editor.org/rfc/rfc5545

### Teilbare Suchauswahl (06.10.2026)

Termin- und Ergebnisfilter stehen in den URL-Parametern `termin`, `kategorie`, `ergebnis` und `berichte=1`. Die Schaltfläche „Link zur Auswahl kopieren“ kopiert die aktuelle Auswahl einschließlich Abschnitt. Ohne Zwischenablagezugriff erscheint ein markiertes Textfeld zum manuellen Kopieren. Zurücksetzen entfernt die jeweiligen Parameter; andere Parameter bleiben erhalten. Suchbegriffe sind dadurch Teil des Links und können beim Öffnen in Serverprotokollen erscheinen. Keine persönlichen Daten als Suchbegriff verwenden.
