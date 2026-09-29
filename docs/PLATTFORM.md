# Plattform ÖkoInvest – Betrieb, Demo, Sicherheit

Login, Rollen-Portale, Projektbörse, Prozesse von der Anfrage bis zum Abschluss und Backoffice.
Datenvertrag für die Frappe-App: [`docs/API.md`](./API.md).

## Aufbau

```
Browser ──fetch(JSON, Origin)──▶ Next.js /api/** ──▶ src/lib/plattform/backend/index.js
                                    │                     ├─ demo.js   (JSON-Datei .data/plattform.json)
Server-Komponenten (/portal/**) ────┘                     └─ frappe.js (oekoinvest_app, whitelisted Methoden)
Middleware: /portal/** ohne gültige Sitzung → /login?weiter=…
```

| Pfad | Inhalt |
|---|---|
| `src/lib/plattform/prozesse.js` | Zustandsautomaten (Vorgang, Fläche, Projekt, Interesse, Provision) mit erlaubten Übergängen je Rolle |
| `src/lib/plattform/konstanten.js` | Rollen, Typen, Länder, NDA-Text, Upload-Regeln |
| `src/lib/plattform/sitzung.js` | signierte Sitzungstoken (HMAC-SHA256, Web Crypto) |
| `src/lib/plattform/server/route.js` | Rahmen aller APIs: CSRF, Sitzung, Rollen, Rate-Limit, Fehler |
| `src/lib/plattform/server/seite.js` | Sitzung in Server-Komponenten |
| `src/lib/plattform/backend/demo.js` | Referenz-Implementierung aller Operationen |
| `src/lib/plattform/backend/frappe.js` | Adapter zur Frappe-App |
| `src/lib/plattform/oeffentlich.js` | Positivliste öffentlicher/vertraulicher Projektfelder |
| `src/lib/plattform/matching.js` | Matching-Score Projekt ↔ Suchprofil |
| `src/components/Portal/**` | Portal-Rahmen, Status-Aktionen, Nachrichten, Dokumente, Formulare |
| `src/components/Boerse/**` | Projektkarte, Filter-Insel, Merken, Klick-NDA |
| `src/components/Plattform/**` | Anfrageformular, Login, Registrierung, Passwort |
| `scripts/plattform-test.mjs` | End-to-End-Test gegen den laufenden Server |

## Routen

Öffentlich: `/projektboerse`, `/projektboerse/[slug]`, `/projektboerse/anbieten`, `/login`, `/registrieren` (`?rolle=`, `?vorgang=`, `?weiter=`), `/passwort-vergessen` (`?token=` setzt neues Passwort).

Portal (Sitzung Pflicht): `/portal` (Dashboard je Rolle), `/portal/anfragen[/id]`, `/portal/flaechen[/neu|/id]`, `/portal/projekte[/neu|/id]`, `/portal/boerse[/id]`, `/portal/nachrichten`, `/portal/dokumente`, `/portal/profil`.
Backoffice (Rolle admin): `/portal/admin` (Cockpit), `/portal/admin/vorgaenge[/id]`, `/portal/admin/flaechen` (Kanban), `/portal/admin/projekte` (Freigabe), `/portal/admin/interessen` (NDA & LOI), `/portal/admin/deals` (Provisionen), `/portal/admin/nutzer` (Nutzer, Protokoll, Demo-Links).

APIs: siehe `docs/API.md`, Abschnitt 6.

## Umgebungsvariablen

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `SESSION_SECRET` | **Produktion** | Schlüssel für Sitzungstoken, mindestens 32 Zeichen, zufällig (`openssl rand -base64 48`). Ohne: Middleware und APIs verweigern jede Sitzung. In Entwicklung fester, unsicherer Fallback mit Warnung im Log. Wechsel = alle abgemeldet. |
| `PLATTFORM_BACKEND` | Produktion | `frappe` für den Betrieb. Sonst Demo-Backend. |
| `PLATTFORM_DEMO` | – | `1` erlaubt das Demo-Backend auch im Production-Build (Vorführserver). Ohne `PLATTFORM_BACKEND=frappe` und ohne `PLATTFORM_DEMO=1` antwortet die Plattform in Produktion mit 503 „nicht konfiguriert“ – keine stillen Demo-Daten. |
| `SERVER`, `API_KEY`, `API_SECRET` | bei Frappe | wie `src/lib/apiBaseUrl.js`; API-Nutzer mit Rolle `Plattform API` |
| `PLATTFORM_BASIS_URL` | empfohlen | Basis für Links in E-Mails (Bestätigung, Passwort). Standard in Produktion: `NEXT_PUBLIC_SITE_URL` bzw. `https://www.oekoinvest.com`. Nie aus dem Host-Header. |
| `PLATTFORM_ORIGINS` | – | zusätzliche erlaubte Origins für Mutationen, kommagetrennt (z. B. Staging-Domain) |
| `PLATTFORM_DEMO_PASSWORT` | – | Passwort der Demo-Konten (Standard `Demo-2026!`), wirkt beim Neuanlegen der Demo-Datenbank |
| `PLATTFORM_RATE_FAKTOR` | – | nur außerhalb Produktion: Faktor für Rate-Limits (Standard 10 in Entwicklung, damit Testläufe wiederholbar sind) |

## Demo-Backend

- Datei `.data/plattform.json` (in `.gitignore`), Uploads unter `.data/uploads/`. Wird beim ersten Zugriff automatisch mit Beispieldaten befüllt.
- **Zurücksetzen:** Ordner `.data` löschen – beim nächsten Aufruf wird neu befüllt. (Das Testskript legt Testdaten an; danach für Vorführungen zurücksetzen.)
- Schreiben unter Sperrdatei, atomar über temporäre Datei + Umbenennen – nur für einen Server-Prozess gedacht.
- E-Mails werden nicht versendet: Bestätigungs- und Passwort-Links stehen im Server-Log (`[plattform-demo] …`) und im Backoffice unter „Nutzer & Protokoll“.
- Alle Daten sind **fiktiv**: Namen mit „(Demo)“, Adressen unter `example.com`, Projekte mit Kennzeichen „Demo“. Die öffentliche Börse zeigt im Demo-Modus einen Hinweis „Vorführdaten“. Demo-Exposés stehen auf `noindex`. Preise der Demo-Projekte = Mitte der Phasenspannen aus `src/lib/invest/markt.js`.

### Demo-Konten (Passwort für alle: `Demo-2026!`)

| E-Mail | Rolle(n) | Inhalt |
|---|---|---|
| `admin@example.com` | Backoffice | Cockpit, alle Vorgänge, Freigaben |
| `flaeche@example.com` | Flächeneigentümer | Fläche mit offenem Pachtangebot, Fläche in Vorprüfung |
| `landwirt@example.com` | Landwirt, Mitglied | Agri-PV-Fläche in Standortanalyse, Genossenschaftsanfrage |
| `investor@example.com` | Investor | Suchprofil, Merkliste, Datenraum frei, LOIs, abgeschlossener Kauf |
| `anbieter@example.com` | Anbieter | 9 Projekte in allen Status, Statistik, verkauftes Projekt mit Provision |
| `unternehmen@example.com` | Unternehmen | Reststrom-Angebot, Carport-Anfrage |
| `mitglied@example.com` | Mitglied | Energiegemeinschaft |

Auf `/login` sind die Konten im Demo-Modus per Klick vorbelegbar.

## Test

```
npm run dev                      # läuft bereits auf :3100
node scripts/plattform-test.mjs  # 96 Prüfungen, Exit-Code 0 = grün
```
Geprüft: Anfrage (inkl. CSRF 403/415, Einwilligung), Registrierung mit Verknüpfung, Login/Logout, manipulierte Signatur, Middleware-Weiterleitung, Flächen-Pipeline bis Vertrag, Admin-Statuswechsel mit Kommentar → Nachricht beim Nutzer, Rechteverletzungen (401/403 für fremde Objekte, falsche Rolle, Admin-APIs), Projekt einreichen (Provision Pflicht) und freigeben (Satz 1,5–3 %), öffentliche Börse ohne vertrauliche Felder, Klick-NDA, Datenraum-Upload (Magic Bytes) und Download nur mit NDA, LOI → Reservierung → Verkauf → automatische Provision, Passwort vergessen/setzen (Token einmalig, alte Sitzungen ungültig), E-Mail-Bestätigung, Kontosperre wirkt sofort.

## Sicherheitskonzept

**Sitzung**
- Eigenes Token `v1.<payload>.<HMAC-SHA256>`; Signatur mit `crypto.subtle.verify` (zeitkonstant). Payload nur Nutzer-ID, Sitzungsversion, Ablauf (7 Tage) – keine Rollen.
- Cookie HttpOnly, SameSite=Lax, Secure und `__Host-`-Präfix in Produktion.
- Rollen, Sperre und Sitzungsversion werden bei **jeder** Anfrage frisch aus dem Backend gelesen. Passwortänderung, -reset und Sperre erhöhen die Version → alle alten Sitzungen sofort ungültig.
- Middleware schützt `/portal/**` (nur Signatur/Ablauf), Seiten und APIs prüfen vollständig.

**Passwörter** (Demo-Backend): scrypt (N=16384, r=8, p=1, 64 Byte) mit 16 Byte Salt, Vergleich mit `timingSafeEqual`; bei unbekannter E-Mail wird trotzdem gerechnet (gleiche Antwortzeit). Regel: ≥ 10 Zeichen, Buchstabe + Ziffer/Sonderzeichen. Frappe nutzt sein eigenes Hashing.

**CSRF**: Mutationen nur mit Origin der eigenen Seite und `Content-Type: application/json` (fremde Formulare können kein JSON senden; fremde Skripte scheitern an Origin/CORS). Uploads zusätzlich mit Kopfzeile `X-Plattform-Upload: 1`.

**Rechte**: Jede API prüft Rolle (Route) UND Eigentum (Backend). Statuswechsel ausschließlich über die Zustandsautomaten, serverseitig erzwungen; Pflichtangaben (Begründung, Pachtangebot, Provisionssatz, Kaufpreis, LOI) werden serverseitig validiert. Fremde Objekte → 403 bzw. auf Seiten 404 (keine Existenz verraten).

**Vertraulichkeit Projektbörse**: Öffentliche Ausgabe ausschließlich über eine Positivliste (`oeffentlich.js`). Vertrauliche Felder und Datenraum nur für Anbieter, Admin und Investoren mit freigegebenem NDA. Das gesperrte Feld im öffentlichen Exposé ist ein Platzhalter – echte Werte werden nie ausgeliefert. Titel und Region anonym (Hinweis im Formular, Prüfung im Backoffice).

**Nachweise**: Klick-NDA (Textversion, Zeitpunkt, IP, Browser), Provisionsvereinbarung (Zeitpunkt, IP, Text), Einwilligung zur Anfrage (Zeitpunkt, IP, Text), Aktivitätsprotokoll inkl. Datenraum-Downloads.

**Konto-Verknüpfung**: Anfragen werden einem Konto nur zugeordnet, wenn (a) bei der Registrierung Vorgangsnummer **und** E-Mail übereinstimmen oder (b) die E-Mail-Adresse bestätigt wurde. So kann niemand fremde Anfragen durch Registrierung mit fremder Adresse einsehen.

**Uploads**: nur PDF/JPG/PNG, Typ an den ersten Bytes erkannt (nicht am Dateinamen), ≤ 10 MB, zufällige Dateinamen außerhalb von `public/`, Download mit `Content-Disposition`, `nosniff` und restriktiver CSP (sandbox).

**Eingaben**: Positivlisten und Bereinigung aller Felder (`validierung.js`), Längenbegrenzungen, Body-Limit (64–96 KB), Honeypot in Anfrage/Registrierung, keine HTML-Ausgabe von Nutzertext (React-Escaping).

**Rate-Limits** (in-memory je Prozess): Login 10/15 min je IP + 8/15 min je E-Mail, Registrierung 5/h, Anfrage 10/h, Passwort 5/h, Uploads 60/h und Nachrichten 120/h je Nutzer. Bei mehreren Instanzen zusätzlich am Proxy begrenzen, z. B. nginx:
```nginx
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;
location ~ ^/api/(auth|anfrage) { limit_req zone=auth burst=10 nodelay; proxy_pass http://127.0.0.1:3000; }
```

**Enumeration**: Passwort-vergessen antwortet immer gleich. Die Registrierung meldet eine vergebene Adresse (409) – bewusst für die Nutzerführung, durch Rate-Limit begrenzt.

**Keine Geheimnisse im Code**: Schlüssel nur über Umgebungsvariablen; der Entwicklungs-Fallback für `SESSION_SECRET` greift in Produktion nie.

## Vor dem Livegang

- [ ] Frappe-App `oekoinvest_app` nach `docs/API.md` bauen, `PLATTFORM_BACKEND=frappe` setzen.
- [ ] `SESSION_SECRET`, `PLATTFORM_BASIS_URL` setzen; HTTPS erzwingen.
- [ ] E-Mail-Versand in Frappe (Bestätigung, Passwort, optional Benachrichtigung bei neuen Nachrichten).
- [ ] Texte der Klick-NDA (`konstanten.js`) und der Provisionsvereinbarung juristisch prüfen lassen; Nutzungsbedingungen um Portal/Projektbörse ergänzen; Datenschutzerklärung um Portal, Protokollierung (IP bei NDA/Einwilligung) und Datenraum ergänzen.
- [ ] Löschkonzept (Aufbewahrungsfristen für Anfragen ohne Konto, Aktivitätsprotokoll).
- [ ] Optional: Zwei-Faktor-Anmeldung für Backoffice-Konten.
