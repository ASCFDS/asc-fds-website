# Security setup

Das Kontaktformular sendet nicht mehr direkt an FormSubmit, sondern an `/api/contact`.
Dieser Endpoint ist als Cloudflare-Pages-Function unter `functions/api/contact.js` umgesetzt.

## Pflichtkonfiguration

In Cloudflare Pages muessen fuer Production und Preview diese Umgebungsvariablen gesetzt werden:

```text
TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
```

Optional kann der Weiterleitungs-Endpunkt ueberschrieben werden:

```text
FORMSUBMIT_ENDPOINT=https://formsubmit.co/ajax/info@asc-fds.de
```

Ohne Turnstile-Keys bleibt das Formular absichtlich blockiert, damit keine ungeschuetzten Anfragen versendet werden.
Die Datei `.dev.vars.example` ist nur eine Vorlage. Echte Werte gehoeren in Cloudflare Pages oder lokal in `.dev.vars`;
`.dev.vars` wird per `.gitignore` nicht versioniert.

## Rate Limiting

Der Function-Code blockiert bestmoeglich mehr als drei Anfragen pro Minute und IP.
Fuer ein dauerhaftes, globales Limit sollte zusaetzlich in Cloudflare eine Rate-Limiting-Regel angelegt werden:

```text
Expression:
(http.request.uri.path eq "/api/contact" and http.request.method eq "POST")

Characteristics:
IP

Threshold:
3 Requests pro 1 Minute

Action:
Block fuer 1 Minute
```

Wichtig: Nicht `URI Path contains /api/contact` verwenden, weil sonst auch der Konfigurationsaufruf `GET /api/contact`
beim Laden des Formulars mitgezaehlt wird. Das Rate Limit soll nur echte Formular-Submits (`POST`) begrenzen.

## WAF / Challenge-Regeln

Cloudflare darf `/api/contact` nicht mit einer interaktiven Managed Challenge beantworten, weil das Formular den
Endpoint per `fetch()` aufruft. Eine vorgeschaltete Challenge wuerde vom Browser als HTML statt JSON zurueckkommen
und das Kontaktformular blockieren.

Auf dem Cloudflare Free-Plan kann der normale Bot Fight Mode nicht per Skip-Regel fuer einzelne Pfade ausgenommen
werden. Wenn Bot Fight Mode aktiv ist, kann er daher `/api/contact` blockieren, bevor die Pages Function ueberhaupt
ausgefuehrt wird. Fuer diese Website sollte Bot Fight Mode deaktiviert werden; der Schutz des Kontaktformulars laeuft
stattdessen ueber Turnstile, Honeypot, Origin-Check, serverseitige Validierung und Rate Limiting.

Falls spaeter ein Plan mit Super Bot Fight Mode und Skip-Moeglichkeit genutzt wird, kann alternativ eine Skip-Regel
fuer `http.request.uri.path eq "/api/contact"` angelegt werden.

Der Spam-Schutz fuer diesen Endpoint passiert danach in der Pages Function durch Turnstile, Honeypot, Origin-Check,
Validierung und Rate Limiting. Allgemeine Challenges fuer normale HTML-Seiten sollten nur so scharf gesetzt werden,
dass echte Besucher nicht vor jeder Seite eine Challenge sehen.

## Security Header

Die Datei `_headers` ist fuer Hosts gedacht, die dieses Format unterstuetzen, zum Beispiel Cloudflare Pages oder Netlify.
Bei GitHub Pages wird diese Datei nicht als Response-Header-Konfiguration angewendet; dort muessen die Header extern,
zum Beispiel ueber Cloudflare, gesetzt werden.

## Cloudflare-Projekt

Wenn die Konfiguration mit Wrangler aus dem Dashboard ins Repository gezogen werden soll, empfiehlt Cloudflare den
Download der bestehenden Projektkonfiguration:

```text
npx wrangler pages download config <PROJECT_NAME>
```

Ein handgeschriebenes `wrangler.toml` sollte erst committed werden, wenn Projektname, Build-Output-Directory und
Dashboard-Konfiguration abgeglichen sind, weil die Datei danach als Konfigurationsquelle fuer Pages gilt.
