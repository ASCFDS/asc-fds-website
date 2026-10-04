# Willi auf der ASC-Website

Stand: 04.10.2026. Keine Änderungen an der iOS-App.

## Betriebsstand

Die lokale Wissenssuche wurde am 04.10.2026 auf `asc-fds.de` und `www.asc-fds.de` veröffentlicht. Der Pages-Buildfehler beim JSON-Import wurde behoben; Live-Dateien und Wissenszuordnung wurden geprüft. Die optionale KI ist weiterhin nicht aktiv.

Die lokale, quellenbasierte Wissenssuche ist vollständig ohne KI-Anfragen verwendbar. Sie ist eine Stichwort-/Themensuche, kein frei formulierendes Sprachmodell. Unpassende oder unbekannte Fragen werden an den Verein verwiesen. Der optionale Cloudflare-Workers-AI-Anschluss ist implementiert, aber ohne bestätigte Free-Plan-Konfiguration deaktiviert. Keine OpenAI-Verbindung, keine API-Kosten durch die lokale Suche. Es gibt keinen Anspruch, dass ein kleiner Katalog sämtliches Vereinswissen abdeckt.

## Pflege und Quellen

`assets/data/willi-knowledge.json` ist der gemeinsame, öffentlich ausgelieferte Wissenskatalog. Jeder Eintrag enthält eine ID, Suchbegriffe, redaktionellen Antworttext, Quellen, Zielaktion und einen Prüftermin. Keine personenbezogenen Mitgliederakten oder vertraulichen Unterlagen hineinkopieren. Neue Quellen erst inhaltlich prüfen; `checkedAt` nicht automatisch aktualisieren. Abgelaufene Einträge werden nicht mehr beantwortet. Änderungen an Wissenskatalog und Backend gemeinsam veröffentlichen; die KI-Antwort trägt eine Katalogversion.

Verwendete Quellen: vorhandene öffentliche Website, Beitragsordnungen vom 05.05.2023 und 02.04.2026 sowie der vom Nutzer für diesen Zweck angegebene Pressebericht „ASC Freudenstadt blickt zurück“, 28.04.2026. Die Original-PDFs bleiben unverändert in den Vereinsunterlagen und werden nicht als vollständige Dateien veröffentlicht. Aus dem Pressebericht werden nur die ASC-Sportfakten zusammengefasst, keine fremden Zeitungsartikel oder Abbildungen übernommen. Gründung: bisher belegtes Jahr 2011; vollständige Chronik noch offen. Neue Beitragskategorie für externe Leistungsschützen ausdrücklich erst ab 01.01.2027, keine vorgezogene Anwendung.

Reguläre Beitragssätze mit `assets/data/membership.json` und Beitragsordnung abgleichen. Keine persönlichen Beitragsschulden, verbindlichen Aufnahmezusagen oder unbelegten Kündigungsfristen beantworten. Termine werden zur live gepflegten Terminübersicht verlinkt, nicht als angeblich vollständige Liste dupliziert.

## Grafiken und Bedienung

Avatar aus dem vorhandenen App-Asset `willi_avatar.imageset/willi_avatar.png`, 923 × 923 Pixel. Original unverändert; WebP-Derivate 192 und 384 Pixel für scharfe kleine Darstellung ohne Hochskalierung. Keine Änderung am ASC-Logo. Statische Figur, keine behauptete 3D- oder Skelettanimation. Keine aufdringliche automatische Öffnung. Native modale Dialogbedienung, Escape und Fokus-Rückgabe, dynamische Höhe und mobil angepasste Ansicht. Verlauf nur im Arbeitsspeicher; weder localStorage noch Cookies für Fragen. Nach Neuladen ist der Verlauf gelöscht.

## Optional: KI-Suche ohne kostenpflichtigen Tarif

1. Zuerst im vorhandenen Cloudflare-Konto den **Workers Free**-Tarif bestätigen. Auf Workers Paid können über dem Freikontingent Kosten entstehen; darum ist dort diese Aktivierung nicht vorgesehen. Kein automatischer Tarifwechsel, kein Guthabenkauf, kein bezahltes Modell.
2. Das bestehende Website-Projekt mit einer Workers-AI-Bindung namens `AI` versehen. Worker: `ai: { binding: "AI" }`; Pages: entsprechende AI-Bindung in den Projekteinstellungen. Den tatsächlich verwendeten Hostingtyp prüfen, nicht durch einen zweiten Deploy ersetzen.
3. Vor Aktivierung Datenschutzhinweise zur dann tatsächlichen KI-Übermittlung ergänzen. Einwilligungstext ist im optionalen Modul vorhanden. Cloudflare-Datenbedingungen prüfen: https://developers.cloudflare.com/workers-ai/platform/data-usage/
4. Erst nach Free-Plan-Prüfung `WILLI_FREE_PLAN_CONFIRMED=true` und `WILLI_AI_ENABLED=true` setzen. Vorhandene Turnstile-Konfiguration wird verwendet, mit eigener Aktion `willi`; Kontakt-Tokens werden abgewiesen. Keine Konfiguration enthält einen KI-Schlüssel.
5. Modell fest begrenzt auf `@cf/meta/llama-3.1-8b-instruct-fp8-fast`. Die KI darf höchstens zwei Katalog-IDs auswählen, nicht frei Fakten oder URLs generieren. Server validiert jede ID. Damit bleiben Wortlaut und Aktionsziele redaktionell kontrolliert. Die KI verbessert nur die Zuordnung freier Formulierungen.
6. Aktuelles kostenloses Kontingent laut Cloudflare: 10.000 Neurons je Konto/Tag; im Free-Tarif harter Stopp statt automatischer Abrechnung. Nicht mit 10.000 Fragen gleichsetzen. Bei Fehlern, Limit oder Modellproblemen bleibt die lokale Suche nutzbar. Der zusätzliche In-Memory-Throttle ist kein globales Kostenlimit.
7. Erst echte Live-Abnahme mit gültigem Turnstile-Token, präzisen/mehrdeutigen/unbekannten Fragen, Limits, Netzfehlern und deutscher Antwortqualität. Noch NICHT erfolgt. Modellzugriff, Free-Plan und KI-Binding sind noch nicht im Konto verifiziert; `wrangler whoami` war nicht angemeldet.

Quellen: https://developers.cloudflare.com/workers-ai/platform/pricing/ und https://developers.cloudflare.com/workers-ai/configuration/bindings/ (geprüft 04.10.2026).

## Prüfungen

`node scripts/test-willi.mjs` für Wissenszuordnung, Quellen, Ablaufdatum und Server-Schutz. Browserprüfung: 320/390/1440 Pixel, Dialog, Escape, Quellen, Beiträge, unbekannte/private Frage, Löschen und keine externen Anfragen bei lokaler Nutzung; axe innerhalb des Dialogs. Keine Aussage über vollständige Screenreader-Zertifizierung. Cloud-KI-Tests verwenden Mocks und ersetzen keine Live-Abnahme.
