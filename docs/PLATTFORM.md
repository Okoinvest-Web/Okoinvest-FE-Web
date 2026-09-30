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
| `src/lib/plattform/checkliste.js` | Dokumenten-Checklisten je Projektphase bzw. Fläche, Datenraum-Qualität |
| `src/lib/plattform/csv.js` | CSV-Export für Excel-DE (BOM, Semikolon, Formel-Schutz), Spalten je Export |
| `src/lib/plattform/server/pdf.js` | PDF-Erzeuger ohne Fremdpakete (mehrseitig, Helvetica/WinAnsi, Metriken für Zeilenumbruch) |
| `src/lib/plattform/server/expose.js` | Layout Exposé-PDF (vertraulich) und Teaser-PDF (öffentlich) |
| `src/components/Portal/**` | Portal-Rahmen mit Glocke, Status-Aktionen, Nachrichten, Dokumente, Formulare, Benachrichtigungen, Aufgaben, Checkliste, Aktivitäts-Feed, Postausgang |
| `src/components/Boerse/**` | Projektkarte, Filter-Insel, Merken, Klick-NDA |
| `src/components/Plattform/**` | Anfrageformular, Login, Registrierung, Passwort |
| `scripts/plattform-test.mjs` | End-to-End-Test gegen den laufenden Server |

## Routen

Öffentlich: `/projektboerse`, `/projektboerse/[slug]`, `/projektboerse/anbieten`, `/login`, `/registrieren` (`?rolle=`, `?vorgang=`, `?weiter=`), `/passwort-vergessen` (`?token=` setzt neues Passwort).

Portal (Sitzung Pflicht): `/portal` (Dashboard je Rolle), `/portal/anfragen[/id]`, `/portal/flaechen[/neu|/id]`, `/portal/projekte[/neu|/id]`, `/portal/boerse[/id]`, `/portal/boerse/vergleich` (Investor: 2–4 Projekte der Merkliste, `?ids=`), `/portal/benachrichtigungen` (Glocke, E-Mail-Einstellungen), `/portal/nachrichten`, `/portal/dokumente`, `/portal/profil`.
Backoffice (Rolle admin): `/portal/admin` (Cockpit mit „Meine Aufgaben“, Überfällig-Hinweis, CSV-Export), `/portal/admin/aufgaben` (Aufgaben & Wiedervorlagen, `?ansicht=`), `/portal/admin/vorgaenge[/id]`, `/portal/admin/flaechen` (Kanban), `/portal/admin/projekte` (Freigabe), `/portal/admin/interessen` (NDA & LOI), `/portal/admin/deals` (Provisionen), `/portal/admin/nutzer` (Nutzer, Protokoll, Demo-Links), `/portal/admin/postausgang` (E-Mail-Vorschau).
Detailseiten Vorgang/Fläche/Projekt zeigen dem Backoffice zusätzlich Aufgaben am Objekt und den Aktivitäts-Feed; Projekt- und Flächenseiten die Dokumenten-Checkliste mit Upload am Punkt; Exposé-PDF auf Projekt- und Börsenseite, Teaser-PDF auf der öffentlichen Exposé-Seite.

APIs: siehe `docs/API.md`, Abschnitt 6.

## Umgebungsvariablen

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `SESSION_SECRET` | **Produktion** | Schlüssel für Sitzungstoken, mindestens 32 Zeichen, zufällig (`openssl rand -base64 48`). Ohne: Middleware und APIs verweigern jede Sitzung. In Entwicklung fester, unsicherer Fallback mit Warnung im Log. Wechsel = alle abgemeldet. |
| `PLATTFORM_BACKEND` | Produktion | `frappe` für den Betrieb. Sonst Demo-Backend. |
| `PLATTFORM_DEMO` | – | `1` erlaubt das Demo-Backend auch im Production-Build (Vorführserver). Ohne `PLATTFORM_BACKEND=frappe` und ohne `PLATTFORM_DEMO=1` antwortet die Plattform in Produktion mit 503 „nicht konfiguriert“ – keine stillen Demo-Daten. |
| `SERVER`, `API_KEY`, `API_SECRET` | bei Frappe | wie `src/lib/apiBaseUrl.js`; API-Nutzer mit Rolle `ÖkoInvest API` (Einrichtung: `Backend-Import/ANLEITUNG.md`) |
| `PLATTFORM_BASIS_URL` | empfohlen | Basis für Links in E-Mails (Bestätigung, Passwort). Standard in Produktion: `NEXT_PUBLIC_SITE_URL` bzw. `https://www.oekoinvest.com`. Nie aus dem Host-Header. |
| `PLATTFORM_ORIGINS` | – | zusätzliche erlaubte Origins für Mutationen, kommagetrennt (z. B. Staging-Domain) |
| `PLATTFORM_DEMO_PASSWORT` | – | Passwort der Demo-Konten (Standard `Demo-2026!`), wirkt beim Neuanlegen der Demo-Datenbank |
| `PLATTFORM_RATE_FAKTOR` | – | nur außerhalb Produktion: Faktor für Rate-Limits (Standard 10 in Entwicklung, damit Testläufe wiederholbar sind) |
| `PLATTFORM_2FA_PFLICHT` | – | Rollen mit Pflicht zur Zwei-Faktor-Anmeldung, kommagetrennt (z. B. `admin`); ergänzt die Einstellung unter `/portal/sicherheit` |
| `PLATTFORM_2FA_SCHLUESSEL` | Produktion (Demo-Backend) | Schlüssel für die Verschlüsselung der TOTP-Geheimnisse im Demo-Backend (≥ 32 Zeichen); Standard: abgeleitet aus `SESSION_SECRET`. Frappe nutzt Password-Felder. |
| `PLATTFORM_HIBP` | – | `1` = neue Passwörter gegen „Have I Been Pwned“ prüfen (k-Anonymity, nur 5 Zeichen des SHA-1-Hashes) |

## Demo-Backend

- Datei `.data/plattform.json` (in `.gitignore`), Uploads unter `.data/uploads/`. Wird beim ersten Zugriff automatisch mit Beispieldaten befüllt.
- **Zurücksetzen:** Ordner `.data` löschen – beim nächsten Aufruf wird neu befüllt. (Das Testskript legt Testdaten an; danach für Vorführungen zurücksetzen.)
- Schreiben unter Sperrdatei, atomar über temporäre Datei + Umbenennen – nur für einen Server-Prozess gedacht.
- E-Mails werden nicht versendet: Jede Mail, die Frappe schicken würde (Bestätigung, Passwort, Benachrichtigungen je Einstellung, Suchprofil-Treffer, neue Anfragen, Aufgaben), landet im **Postausgang** (`/portal/admin/postausgang`, Vorschau im Markenstil). Bestätigungs- und Passwort-Links stehen zusätzlich im Server-Log (`[plattform-demo] …`) und unter „Nutzer & Protokoll“.
- Seit Schema 2 enthält die Demo-Datenbank Benachrichtigungen, Aufgaben (eine überfällig, eine heute fällig), Postausgang und Datenraum-Unterlagen mit Checklisten-Zuordnung. Ältere `.data`-Stände werden beim ersten Zugriff automatisch neu befüllt.
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
| `bo-projektleitung@example.com` | Backoffice (Projektleitung) | Projektentwicklung: Portfolio, Gantt, Risiken, Übergaben |
| `gutachter@example.com` | Gutachter / Planer | Zugewiesenes Artenschutzgutachten (Solarpark Mühlweg), Upload, Rückfragen |

Auf `/login` sind die Konten im Demo-Modus per Klick vorbelegbar.

## Test

```
npm run dev                      # läuft bereits auf :3100
node scripts/plattform-test.mjs  # ca. 210 Prüfungen, Exit-Code 0 = grün
```
Geprüft: Anfrage (inkl. CSRF 403/415, Einwilligung), Registrierung mit Verknüpfung, Login/Logout, manipulierte Signatur, Middleware-Weiterleitung, Flächen-Pipeline bis Vertrag, Admin-Statuswechsel mit Kommentar → Nachricht beim Nutzer, Rechteverletzungen (401/403 für fremde Objekte, falsche Rolle, Admin-APIs), Projekt einreichen (Provision Pflicht) und freigeben (Satz 1,5–3 %), öffentliche Börse ohne vertrauliche Felder, Klick-NDA, Datenraum-Upload (Magic Bytes) und Download nur mit NDA, LOI → Reservierung → Verkauf → automatische Provision, Passwort vergessen/setzen (Token einmalig, alte Sitzungen ungültig), E-Mail-Bestätigung, Kontosperre wirkt sofort. Ausbaustufe 2: Exposé-PDF (nur mit NDA/Anbieter/Admin, Empfänger im PDF, Abruf protokolliert), Teaser-PDF ohne vertrauliche Felder, Suchprofil-Alarm mit Schwelle (Benachrichtigung + Mail ohne vertrauliche Angaben), Checklisten-Upload und Datenraum-Qualität in der Börsenkarte, Benachrichtigungen (nur eigene, gelesen markieren, Thread lesen markiert mit, CSRF), E-Mail-Einstellungen wirken auf den Postausgang, Aufgaben (Rechte, Validierung, Zuweisung benachrichtigt, Wiedervorlage in der Glocke, Cockpit-Kennzahl), Aktivitäts-Feed mit geänderten Feldern, CSV-Export (BOM, Semikolon, Formel-Schutz, nur Admin, protokolliert), neue Portalseiten inkl. 404 für falsche Rollen.

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

**Nachweise**: Klick-NDA (Textversion, Zeitpunkt, IP, Browser), Provisionsvereinbarung (Zeitpunkt, IP, Text), Einwilligung zur Anfrage (Zeitpunkt, IP, Text), Aktivitätsprotokoll inkl. Datenraum-Downloads, Exposé-Abrufen und CSV-Exporten.

**Exposé & Export**: Das vertrauliche Exposé-PDF nennt auf jeder Seite den Empfänger (Name, E-Mail, Zeitpunkt) und den NDA-Hinweis; erzeugt wird es serverseitig nur nach Rechteprüfung im Backend. Der Teaser wird immer ohne Nutzer aus der öffentlichen Projektion gebaut. CSV-Exporte leiten Werte, die mit `= + - @` beginnen, mit `'` ein (keine Formel-Ausführung in Excel).

**Benachrichtigungen**: Links in Benachrichtigungen sind immer interne Portal-Pfade (Server und Client prüfen). E-Mails enthalten nie Nachrichtentexte oder vertrauliche Projektdaten; welche Ereignisse per E-Mail kommen, legt jedes Konto selbst fest.

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

## KI-Assistent (optional)

Eingebauter Assistent unter `src/lib/plattform/ki/**` (Server), API `/api/portal/ki/**`, Oberfläche `src/components/Portal/Ki/**`. **Nur aktiv, wenn `ANTHROPIC_API_KEY` in der Website-Umgebung gesetzt ist** – sonst liefert jeder Anwendungsfall regelbasierte Vorschläge (nie ein Fehler). Der Schlüssel bleibt auf dem Server; der Browser spricht nur mit `/api/portal/ki/*`.

| Anwendungsfall | Wer | Wo | Ergebnis |
|---|---|---|---|
| `expose` Exposé-Assistent | Anbieter (eigenes Projekt), Backoffice | Projekt bearbeiten, Schritt „Preis & Exposé“; Projektseite (Backoffice) | Beschreibung, Highlights, Risiken, fehlende Angaben – Übernahme nur per Klick ins Formular, nie automatisch gespeichert/veröffentlicht. Keine Ortsangaben aus den vertraulichen Feldern. |
| `triage` Anfrage-Zusammenfassung | nur Backoffice | `/portal/admin/vorgaenge/[id]` | Zusammenfassung, Typ- und Prioritätsvorschlag, fehlende Angaben, nächster Schritt, Antwortentwurf (→ Antwortfeld) |
| `frage` Frag das Projekt | Investor mit freigegebenem Datenraum (NDA), Anbieter, Backoffice | `/portal/boerse/[id]` (Datenraum) | Antwort nur aus freigegebenen Projektdaten + Dokument-Metadaten, Quellen `[Q1]…`, Hinweis auf Klärung über „Nachrichten zu diesem Projekt“ |
| `flaeche` Flächen-Assistent | Flächeneigentümer, Landwirt (eigene Fläche) | `/portal/flaechen/[id]` | Status und nächste Schritte in einfacher Sprache; Fragen zu Pacht/Agri-PV aus Ratgeber (`src/content/ratgeber`) und Lexikon (`src/data/lexikon.js`) mit Links |
| `nachricht` Nachrichten-Entwurf | alle Rollen, nur eigene Threads (Backoffice alle) | jeder Nachrichtenverlauf | Entwurf in Sie-Form direkt im Antwortfeld (vorhandener Text = Stichpunkte); gesendet wird nur per Klick |

**Sicherheit & Datenschutz:** Rechte werden VOR dem Zusammenstellen des Kontexts geprüft – der Kontext-Bauer (`ki/kontext.js`) lädt ausschließlich über die Backend-Operationen im Namen des Nutzers (`projekt`, `vorgang`, `flaeche`, `boerseDetail`, `nachrichten`), fremde Objekte → 403/404 ohne Inhalte. Je Fall Positivliste der Felder (keine E-Mail, Telefonnummer, IP im Prompt). Nutzerinhalte stehen im Prompt als Daten (`<daten>`), nicht als Anweisung. Links im Ergebnis werden nur als interne Pfade gerendert. Jeder Aufruf: Rate-Limit je Konto (8/min) und IP (30/min), Tages-Kontingent je Konto, Protokoll **ohne Inhalte** (Konto, Zeitpunkt, Fall, Modus, Ergebnis, Tokens, Bezugsobjekt) – Demo: `.data/ki-nutzung.json`, Frappe: DocType `Plattform KI Nutzung` (append-only). Kennzeichnung im UI: „KI-Entwurf – bitte prüfen“ bzw. „Vorschlag – bitte prüfen“ + kurzer Datenschutzhinweis.

**Claude API:** Messages API per `fetch` (kein SDK-Paket), Modell `claude-opus-5-5` (adaptives Denken, `effort` je Fall low/medium), strukturierte Ausgabe per JSON-Schema (Exposé, Triage), Streaming (NDJSON an den Browser) für Frage/Fläche/Nachricht, Prompt-Caching der festen System-Blöcke (Wissensblock des Flächen-Assistenten), serverseitiger Ausweichmechanismus `fallbacks: "default"` bei Ablehnungen, Zeitlimit + Wiederholung mit Backoff (429/5xx/529). Fällt der Dienst aus, antwortet der Regelmodus.

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `ANTHROPIC_API_KEY` | – | Schlüssel der Claude API (nur Website-Server). Ohne: regelbasierter Modus. |
| `KI_MODELL` | – | Modell-ID, Standard `claude-opus-5-5` |
| `KI_TAGESKONTINGENT` / `KI_TAGESKONTINGENT_ADMIN` | – | Aufrufe je Konto und Tag (Standard 30 / 150; KI- und Regelmodus). In Frappe überschreibbar per site_config `oekoinvest_ki_tageskontingent`(`_admin`). |
| `KI_AUS` | – | `1` schaltet den KI-Modus sofort ab (Regeln bleiben) |
| `KI_FALLBACK` | – | `aus` deaktiviert `fallbacks: "default"` |

Test: `node scripts/plattform-test-ki.mjs` (ohne Schlüssel: Fallback ohne Fehler; fremdes Projekt/Fläche/Thread → 403 ohne Inhalte; Datenraum nur mit NDA; Kontingent → 429; Protokoll ohne Inhalte).

## Bedienung & Onboarding

„Einfach für Laien, schnell für Profis“ – Dateien unter `src/components/Portal/Bedienung/**`, `src/lib/plattform/{suche,onboarding}.js`, `src/lib/plattform/backend/{bedienung,demo/bedienung,frappe/bedienung}.js`, Frappe `plattform/api/bedienung.py`.

- **Geführter Einstieg** `/portal/willkommen` (nach der Registrierung automatisch): Profil → erstes Objekt je Rolle (Fläche / Suchprofil / Projekt / Anliegen) → E-Mail-Benachrichtigungen → fertig. Fortschrittsanzeige, jeder Schritt und die ganze Einführung überspringbar, `?schritt=objekt` springt direkt. Zustand am Konto (`onboarding`, API `/api/portal/onboarding`).
- **Checkliste „Erste Schritte“** auf der Übersicht, bis alles erledigt oder ausgeblendet ist; Punkte aus echten Daten (Fläche/Projekt/Suchprofil vorhanden, Telefon, E-Mail bestätigt) plus Merkern (Benachrichtigungen, Schnellsuche ausprobiert).
- **Befehlspalette** Strg/⌘ + K, „/“ oder Suchfeld in der Kopfzeile: Suche über eigene Flächen, Projekte, Vorgänge, Nachrichten, Börse (Investor) und Nutzer (Backoffice) über `/api/portal/suche` – serverseitig nur über die rechtegeprüften Listen-Operationen, Links nur ins Portal. Dazu Aktionen (Fläche anlegen, Projekt einreichen, Zum Backoffice, Abmelden …) und Navigation, unscharfe Suche, „Zuletzt verwendet“ (nur im Browser, je Konto). ARIA: modaler Dialog, Combobox + gruppierte Listbox, `aria-activedescendant`.
- **Tastenkürzel** `g d` Übersicht, `g b` Börse, `g f` Flächen, `g n` Nachrichten, `g h` Hilfe, Backoffice `g c`/`g t`/`g v`, `n` neu (je Rolle), `?` Übersicht der Kürzel. Einzeltasten-Kürzel abschaltbar (Hilfe-Overlay bzw. `/portal/hilfe`), greifen nie in Eingabefeldern.
- **Kontexthilfe** `<Begriff id="nda">` – „?“-Popover mit der Kurzdefinition aus `src/data/lexikon.js` (Börse, Projekt, Fläche, Hilfe). Leere Zustände mit Mini-Illustration und nächster Aktion (`LeerZustand`), Inline-Validierung (`Bedienung/pruefung.js`) im Flächenformular und im Einstieg.
- **Gemeinsame Liste** `Bedienung/Liste/DatenListe`: Sortierung, Filter-Chips, gespeicherte Ansichten (Browser), Spaltenauswahl, Mehrfachauswahl mit Massenaktionen, CSV der Auswahl (Formel-Schutz), „Mehr laden“, mobil Karten. Eingesetzt in Backoffice-Vorgänge (Massen-Zuweisung, URL-Filter wie `?status=`/`?ohne=1` bleiben gültig), Meine Anfragen, Meine Flächen und Portal-Börse (Umschalter Karten/Tabelle, Merken/Vergleichen).
- **PWA**: `public/portal.webmanifest` (start_url `/portal`, Icons 192/512/maskable, PNG aus `icon.svg` per PIL), Service Worker `public/sw-portal.js` (Scope `/portal`) cacht **nur** die statische Offline-Seite `public/portal-offline.html` und Icons – keine Portalseiten, keine APIs, keine Nutzerdaten. Hinweis „Als App installieren“ auf der Übersicht (schließbar) und in der Hilfe.
- **Barrierefreiheit & Mobil**: Fokus auf die Überschrift nach jedem Seitenwechsel (mit Ansage), Sprunglinks zu Inhalt, Navigation und Suche, Bottom-Navigation unter 1024 px mit den 4 wichtigsten Zielen je Rolle + Suche.
- Test: `node scripts/plattform-test-bedienung.mjs` (Suche nur Berechtigtes, Onboarding-Zustand, CSRF, PWA-Dateien); Frappe `tests/test_bedienung.py`.

## Backoffice: CRM, Akquise, Automationen, Berichte, Rechte

Seiten (Rolle admin, je nach Unterrolle): `/portal/admin/crm` (Kontakte/Organisationen, Suche „/“, neu „n“, Massenaktionen), `/portal/admin/crm/[id]` (Stammdaten, Beziehungen, Aktivität mit Wiedervorlage, Vorlage senden, Verlauf), `/portal/admin/crm/organisation/[id]`, `/portal/admin/crm/dubletten`, `/portal/admin/akquise` (Score, Priorität A/B/C, Tasten j/k/a/b/c, SLA-Ampel 2 Werktage, Gebiete, Zuweisung nach Gebiet), `/portal/admin/automationen` (Wenn–Und–Dann-Editor, Testlauf, Ausführungsprotokoll), `/portal/admin/vorlagen` (Platzhalter, Vorschau, Versionen), `/portal/admin/berichte` (Trichter, Quellen, Pipeline, Provision, Durchlauf, Team; CSV und Monatsbericht-PDF), `/portal/admin/protokoll` (Hash-Kette prüfen), `/portal/admin/rechte` (Unterrollen, Matrix). Vertrag: `docs/API.md`, Abschnitt 9.

- **Leads:** Jede Anfrage über `/api/anfrage` legt einen CRM-Kontakt an bzw. ordnet sie per E-Mail dem vorhandenen Kontakt zu (keine Dublette); Kommunen erhalten automatisch eine Organisation.
- **Demo:** Backoffice-Daten liegen unter `db.bo` (einmalig ergänzt, übrige Demo-Daten unverändert). Zusätzliche Demo-Konten mit Unterrollen (Passwort wie alle Demo-Konten, E-Mail-Benachrichtigungen aus): `bo-akquise@example.com`, `bo-transaktion@example.com`, `bo-buchhaltung@example.com`, `bo-lesen@example.com`. Beispielregeln aktiv: „Großfläche priorisieren“ (≥ 20 ha), „Kommunale Anfrage“, „Top-Treffer Suchprofil“ (≥ 90 %), „Datenraum-Upload markieren“; inaktiv: „SLA verletzt“, „Qualifizierte Anfrage“, „Eingangsbestätigung“.
- **Revisionssicheres Protokoll:** Aktivitäten sind per SHA-256 verkettet (`src/lib/plattform/hashkette.js`, Frappe `plattform/hashkette.py`); Prüfung unter „Revisionsprotokoll“. Einträge vor der Einführung werden einmalig nachgesiegelt und markiert.
- **Grenzen:** Unterrollen wirken auf `/api/admin/**` und `/portal/admin/**`. Portal-APIs, die das Backoffice mitbenutzt (Nachrichten, Dokumente am Objekt), prüfen weiterhin nur die Rolle `admin`.
- **Test:** `node scripts/plattform-test-backoffice.mjs` (Regel feuert/feuert nicht, Testlauf ohne Wirkung, Schleifenschutz, Unterrollen 403/404, Hash-Kette erkennt Manipulation, Dubletten, Vorlagen-Versionen, Berichte/CSV/PDF). Frappe: `plattform/tests/test_backoffice.py`.

## Vor dem Livegang

Vollständige Checkliste für das Backend (Server, TLS, Backups, E-Mail, Rollen, 2FA, Datenschutz, Test je Prozess, Umschalten auf `PLATTFORM_BACKEND=frappe`): [`Backend-Import/GO-LIVE.md`](../Backend-Import/GO-LIVE.md); Paketübersicht: [`Backend-Import/README.md`](../Backend-Import/README.md).

- [ ] Frappe-App `oekoinvest_app` nach `docs/API.md` bauen, `PLATTFORM_BACKEND=frappe` setzen.
- [ ] `SESSION_SECRET`, `PLATTFORM_BASIS_URL` setzen; HTTPS erzwingen.
- [ ] E-Mail-Versand in Frappe (Bestätigung, Passwort, optional Benachrichtigung bei neuen Nachrichten).
- [ ] Texte der Klick-NDA (`konstanten.js`) und der Provisionsvereinbarung juristisch prüfen lassen; Nutzungsbedingungen um Portal/Projektbörse ergänzen; Datenschutzerklärung um Portal, Protokollierung (IP bei NDA/Einwilligung) und Datenraum ergänzen.
- [ ] Löschkonzept (Aufbewahrungsfristen für Anfragen ohne Konto, Aktivitätsprotokoll).
- [x] Zwei-Faktor-Anmeldung (TOTP) – für das Backoffice als Pflicht setzen: `PLATTFORM_2FA_PFLICHT=admin` bzw. unter `/portal/sicherheit`.

## Deal-Room & Investoren

Seiten: `/portal/dealroom/[projektId]` (Reiter Übersicht/Cockpit, Datenraum, Q&A, Bieterverfahren, Zugriffsprotokoll – je Rolle), `/portal/pipeline` (Investor: Deal-Kanban, Notizen/Tags, Suchprofile, Kennzahlen), `/portal/boerse/karte` und `/projektboerse/karte` (DACH-Karte, Cluster je Bundesland/Kanton, Filter synchron mit der Liste; Umschalter „Liste/Karte“ auch in beiden Börsenlisten), `/portal/admin/dealroom` (Moderation, Verfahren). Einstiege: Börsen-Exposé („Deal-Room“), Projektseite des Anbieters („Deal-Room & Cockpit“), Menü „Deal-Pipeline“ bzw. „Deal-Room“.
Regeln und Vertrag: `docs/API.md`, Abschnitt 7. Demo-Daten (fiktiv, einmalig beim ersten Zugriff unter `db.dealroom` ergänzt, kein Neuaufbau der Datenbank): Q&A in allen Status, laufende indikative Runde mit Geboten fiktiver Bieter (`deal-investor1@example.com`, `deal-investor2@example.com`, Passwort wie Demo-Konten), Zugriffe, Notizen, zwei Suchprofile, Aufrufverlauf.
Test: `node scripts/plattform-test-dealroom.mjs` (Anonymität, verdeckte Gebote, Fristablauf, Zuschlag → Provision, Stufen, Zugriffsprotokoll, Pipeline, Cockpit, Seiten).

## Login, Sicherheit & Teams

Seiten: `/login` (Reiter Passwort | E-Mail-Link, 2FA-Schritt mit „Gerät 30 Tage merken“ und Wiederherstellungscode), `/login/link?token=` (Anmelde-Link per Klick einlösen – Vorabrufe durch Mailprogramme verbrauchen ihn nicht), `/portal/sicherheit` (Sicherheitsstatus, Zwei-Faktor mit QR-Code als eigenes SVG, aktive Sitzungen einzeln/alle anderen beenden, bekannte Geräte, Anmeldehistorie mit Fehlversuchen, für das Backoffice die Pflicht-2FA je Rolle), `/portal/organisation` (Organisationen anlegen, Mitglieder einladen, Teamrollen Inhaber/Admin/Mitglied/Nur lesen, Inhaberschaft übertragen, eigene Objekte übernehmen, austreten/löschen), `/einladung/[token]` (Einladung ansehen und annehmen), `/portal/profil` (zusätzlich Avatarfarbe, Sprache de/en in Vorbereitung, Benachrichtigungskanäle, E-Mail ändern mit Bestätigung, Passwort mit Stärkeanzeige, Datenexport und Konto löschen). Organisationswechsel im Portal-Kopf (gilt je Sitzung).
Vertrag: `docs/API.md`, Abschnitt 8. Code: `src/lib/plattform/{totp,qr,geraet,organisation,passwortStaerke}.js`, `server/{anmeldung,leak}.js`, `backend/{sicherheit.js,demo/sicherheit.js,demo/teams.js,frappe/sicherheit.js}`, Komponenten `src/components/Portal/Sicherheit/**`.

- **Sitzungen:** Cookie-Token trägt die Sitzungskennung; jede Anfrage prüft den Sitzungseintrag (widerrufen/abgelaufen/Version). Jede Anmeldung und die 2FA-Einrichtung erzeugen eine neue Sitzung (Rotation). Letzte Aktivität höchstens alle 5 Minuten gespeichert (ohne auf die Schreibsperre zu warten); max. 30 aktive Sitzungen je Konto.
- **Zwei-Faktor (TOTP, RFC 6238):** selbst implementiert (Node-`crypto`), ±30 s Toleranz, Replay-Schutz, 10 Wiederherstellungscodes (nur Hash). Zwischenschritt über kurzlebiges, signiertes Cookie (`oi_2fa`, 5 min, SameSite=Strict); falsche Codes zählen zur Kontosperre. Passwort-Reset und E-Mail-Link ersetzen keinen zweiten Faktor.
- **Kontosperre:** ab 5 Fehlversuchen 30 s, danach jede weitere Fehleingabe doppelt so lang (max. 1 h); Meldung per Glocke und E-Mail; Anmeldung per E-Mail-Link bleibt möglich.
- **Geräte:** eigenes Cookie `oi_geraet` (zufällig, nur Hash gespeichert). Anmeldung von neuem Gerät → Glocke + E-Mail (Sicherheitsmeldungen sind nicht abschaltbar).
- **Organisationen:** Objekte (Flächen, Projekte, Interessen, Suchprofil) gehören optional einer Organisation; Rechte je Teamrolle in allen bestehenden Lese- und Schreibwegen (Backend prüft, Seiten zeigen Bearbeiten nur mit Schreibrecht). Demo: „Demo Capital GmbH (fiktiv)“ (Inhaber `investor@example.com`) und „Muster Projektentwicklung GmbH (fiktiv)“ (Inhaber `anbieter@example.com`, Backoffice nur lesen) werden beim ersten Login einmalig ergänzt – ohne bestehende Objekte umzuhängen.
- **DSGVO:** Datenexport als JSON (nur eigene Daten, Dritte maskiert, ohne Geheimnisse), Löschung = Anonymisierung + Sperre; Unterlagen mit Aufbewahrungspflicht bleiben gesperrt erhalten.
- **Kopfzeilen** (Middleware für Portal, Login, Einladung, `/api/auth`, `/api/portal`): `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'`, COOP `same-origin`, `no-referrer` auf Token-Seiten, `no-store`, HSTS in Produktion.
- Test: `node scripts/plattform-test-sicherheit.mjs` (TOTP korrekt/falsch/Replay, Wiederherstellungscode einmalig, Reset ohne 2FA-Umgehung, E-Mail-Link einmalig/abgelaufen, Sperre, Sitzung widerrufen → 401, neues Gerät, Organisationsrechte inkl. Fremdorganisation → 403, Datenexport nur eigene Daten, Komfort, E-Mail ändern, Konto löschen); Frappe `tests/test_sicherheit.py`, `tests/test_organisation.py`.

## Anlagen & Monitoring

Leitstand der Contracting-Anlagen für Kunden (Rolle `unternehmen` bzw. Mitglieder der Organisation) und den Betrieb. Architektur, MQTT-Vertrag, Ingest-Dienst: [`docs/ANLAGEN-IOT.md`](./ANLAGEN-IOT.md); Vertrag: `docs/API.md`, Abschnitt 10.

- Seiten: `/portal/anlagen` (Kacheln/Liste/Karte, Summen, Ampel, Suche „/“, Ansicht „v“), `/portal/anlagen/[id]` (Live per SSE mit „Stand vor x s“ und Veraltet-Markierung, Energiefluss, Diagramme Tag/Woche/Monat/Jahr mit Soll-Ist und CSV, Zählerstände Abrechnung/Monitoring, Störungen, Technik & Wartung, Vertrag & Kosten), Backoffice `/portal/admin/anlagen` (Störungs-Leitstand), `/portal/admin/anlagen/neu` (Assistent), `/portal/admin/anlagen/[id]` (Pflege, „Gerät verbinden“ mit einmaligem Passwort).
- Code: `src/lib/plattform/anlagen.js`, `src/lib/plattform/messdaten/**`, `backend/{anlagen,demo/anlagen,demo/anlagen-seed,frappe/anlagen}.js`, `src/app/api/{portal,admin}/anlagen/**`, `src/components/Portal/Anlagen/**`; Dienst `Backend-Import/dienste/anlagen-daten/`; Frappe `plattform/api/anlagen.py`, `plattform/anlagen_kern.py`.
- Demo: einmalig unter `db.anlagen` ergänzt – 7 fiktive Anlagen (6 für „Muster Logistik GmbH (fiktiv)“, Inhaberin `unternehmen@example.com`; eine fremde nur fürs Backoffice), Szenarien offline / Wechselrichter-Teilausfall / Minderleistung, Konto `bo-betrieb@example.com` (Unterrolle Betrieb, Passwort wie alle Demo-Konten). Messdaten aus dem Simulator (deterministisch); „Testnachricht senden“ ersetzt im Assistenten den Datenlogger.

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `ANLAGEN_DATEN_URL` | Betrieb | Basis-URL der Abfrage-API des Ingest-Dienstes (HTTPS). Ohne: Simulator im Demo-Betrieb, sonst 503 für Messdaten |
| `ANLAGEN_DATEN_TOKEN` | Betrieb | Service-Token (≥ 32 Zeichen, = `DIENST_TOKEN` des Dienstes), nur serverseitig |
| `ANLAGEN_MQTT_HOST`, `ANLAGEN_MQTT_PORT` | – | Broker-Angaben im Assistenten (Demo; Frappe: `site_config` `oekoinvest_mqtt_host/port`) |
| `ANLAGEN_SIMULATOR` | – | `1` = Simulator auch mit Frappe-Stammdaten (Vorführung) |

Test: `node scripts/plattform-test-anlagen.mjs` (Sichtbarkeit, fremde Anlage → 403 auch für Messdaten/Zähler/Live, Passwort nur einmal/nur Hash, Messpunkt-/Monatswert-Regeln, Störung quittieren nur Betrieb, Unterrollen, CSRF, Seiten); Frappe `tests/test_anlagen.py`; Dienst `cd Backend-Import/dienste/anlagen-daten && npm test`.


## Projektentwicklung

Internes Entwicklungsmanagement (Flächensicherung bis Baureife, Ziel rund 50 MWp pro Jahr) mit vereinfachten Sichten für Flächeneigentümer, Co-Development-Investoren und Gutachter/Planer. Vertrag und Regeln: `docs/API.md`, Abschnitt 11.

- Seiten: `/portal/admin/entwicklung` (Portfolio mit Kennzahlen, MWp je COD-Jahr und Ziellinie, Summen je Phase/Land, Liste/Kanban/Karte – Taste „v“, Verzugsliste, Fristen 30 Tage, Auslastung je Projektleitung), `/portal/admin/entwicklung/neu` (Vorlage-Assistent „Neues Projekt aus Fläche“), `/portal/admin/entwicklung/[id]` (Reiter Übersicht, Plan & Gantt – Zoom Monat/Quartal/Jahr, Tasten +/−, kritischer Pfad, Verzug rot –, Flächen, Risiken mit Matrix, Behörden & Stakeholder aus dem CRM, Entscheidungen, Kosten, Freigaben & Gutachter, Übergabe an Börse bzw. Bau), `/portal/admin/entwicklung/[id]/steckbrief` (Druck), `/portal/entwicklung[/id]` („Wo steht mein Projekt?“, Co-Development, Gutachten-Aufträge), `/einladung/gutachter/[token]`.
- Code: `src/lib/plattform/entwicklung.js` (Vorlagen, Planung, kritischer Pfad, Pipeline), `backend/{entwicklung,demo/entwicklung,demo/entwicklung-seed,frappe/entwicklung}.js`, `src/app/api/{admin,portal}/entwicklung/**`, `src/components/Portal/Entwicklung/**`; Frappe `plattform/api/entwicklung.py`, `plattform/entwicklung_kern.py`, `plattform/entwicklung_vorlagen.py` (aus der JS-Vorlage generiert), Bericht „Entwicklungspipeline“, Druckformat „Projektsteckbrief“.
- Rollen: Backoffice-Unterrolle **Projektleitung** (Rechte-Matrix, Frappe-Desk-Rolle „ÖkoInvest Projektleitung“), externe Rolle **Gutachter/Planer** (`gutachter`, „ÖkoInvest Gutachter“, nur per Einladung). Benachrichtigungsart `entwicklung` (abbestellbar).
- Demo (fiktiv, einmalig unter `db.entwicklung` ergänzt): 7 Projekte DE/AT/CH von Akquise bis Baureife, verknüpft mit „Acker am Mühlweg (Demo)“ (`flaeche@example.com`) und „Agri-PV Schlag Nord (Demo)“ (`landwirt@example.com`), Co-Development-Freigabe für `investor@example.com`, Konten `bo-projektleitung@example.com` (Unterrolle Projektleitung) und `gutachter@example.com` (Gutachter, Artenschutzgutachten Mühlweg), Behörden-Kontakte im CRM. ERPNext-Abgleich im Demo-Betrieb nicht verfügbar (Ist-Kosten „Demo“/manuell).
- ERPNext optional: `site_config` `"oekoinvest_erpnext_entwicklung": 1` (Project/Task in beide Richtungen, Ist aus Timesheets/Einkauf).
- Test: `node scripts/plattform-test-entwicklung.mjs` (Portfolio und Pipeline-Werte, Abhängigkeiten/Kreis/Dokumentenpflicht, Eigentümer sieht nur die vereinfachte Sicht seiner Fläche, Gutachter nur Zugewiesenes, Co-Investor nur Freigegebenes, fremde → 403, Übergabe an Börse erzeugt Projekt, Unterrollen, CSRF, Seiten); Frappe `tests/test_entwicklung.py`, ohne Frappe `python -m unittest oekoinvest_app.plattform.tests.test_entwicklung_kern` (inkl. Vorlagen aller Länder/Typen).

## KYC/KYB – Identitäts- und Firmenprüfung

Geführte Verifizierung unter `/portal/verifizierung` (Kontotyp → Person → Ausweis → Unternehmen → Berechtigte & Vertreter → Erklärungen → Auszahlung & Eigentum → Einreichen; Fortschritt, fehlende Unterlagen, Ausweis-Ablauf, erneute Prüfung), Backoffice `/portal/admin/compliance` (Warteschlange, Kennzahlen, Freigabe-Sperren, Einzelabgleich, Fristen) und `/portal/admin/compliance/[id]` (Prüfliste je Unterlage, Sanktionstreffer bewerten, Risiko, Entscheidung, Vier-Augen, Zugriffsprotokoll, externe Prüfergebnisse). Vertrag: `docs/API.md`, Abschnitt „KYC/KYB“.

- Code: `src/lib/plattform/{kyc,sanktionsliste}.js`, `server/{kycKrypto,kycDatei}.js`, `backend/{kyc,demo/kyc,demo/kycRegeln,demo/kyc-seed,frappe/kyc}.js`, `src/app/api/portal/kyc/**`, `src/app/api/admin/compliance/**`, `src/components/Portal/Kyc/**`; Frappe `plattform/{kyc_kern,kyc_aufgaben}.py`, `plattform/api/kyc.py`, DocTypes `KYC *`, Druckformat „KYC Pruefprotokoll“, Notification „KYC Status an Nutzer“ (E-Mail ohne Inhalte), Workflow „KYC Prüfung“ (inaktiv, Prozessdarstellung), Bericht „KYC Uebersicht“ (nutzt `kyc_kern.kyc_status`), Scheduler `kyc_aufgaben.fristen_taeglich`.
- **Ablage:** Unterlagen nie im Klartext auf der Platte – Demo `.data/kyc/*.bin` (AES-256-GCM, Dokument-ID als AAD, Kopf `OIKYC1`), Frappe privates File mit gleichem Format. Download nur für die Person selbst und die Backoffice-Unterrolle „Compliance“, `no-store`, `nosniff`, Sandbox-CSP; jeder Zugriff in der Hash-Kette.
- **Sanktionsliste:** lokal gespeichert, Import nur manuell (kein Download im Code). Offizielle Quelle: konsolidierte Finanzsanktionsliste der EU (Financial Sanctions Files, `https://webgate.ec.europa.eu/fsd/fsf`, XML/CSV v1.1). Demo: `node scripts/kyc-sanktionsliste-import.mjs <datei> [--stand JJJJ-MM-TT] [--pruefen]` → `.data/kyc-sanktionsliste.json`; ohne Datei eine kleine **fiktive** Testliste. Frappe: `bench --site <site> execute oekoinvest_app.plattform.kyc_aufgaben.sanktionsliste_importieren --kwargs "{'pfad': '…', 'stand': 'JJJJ-MM-TT'}"`. Unscharfer Abgleich (Jaro-Winkler, Reihenfolge egal, Geburtsdatum gleich/Jahr/abweichend, Schwelle 0,88) für Person, Firma, wirtschaftlich Berechtigte und Vertreter; Treffer → immer manuelle Prüfung, nie automatische Entscheidung. Aufbau der EU-Dateien vor dem Produktiveinsatz gegen eine aktuelle Datei prüfen; ggf. weitere Listen (z. B. nationale Listen AT/CH, UN) ergänzen.
- **Demo:** Konten `bo-compliance@example.com` und `bo-compliance2@example.com` (Unterrolle Compliance, Vier-Augen), Fälle für investor@/anbieter@ (verifiziert), flaeche@ (eingereicht), landwirt@ (nachgefordert), mitglied@ (möglicher Sanktionstreffer + PEP). Freigabe-Sperren im Entwicklungsbetrieb nur für Pilot-Konten (flaeche@, landwirt@ und die Testkonten), damit laufende Tests anderer Teams unberührt bleiben.
- **Fristen:** Erinnerung 30 Tage vor Ausweis-Ablauf, Wiederholungsprüfung nach 36/24/12 Monaten (Risiko niedrig/mittel/hoch; 30 Tage vorher Erinnerung, bei Fälligkeit Status „Erneute Prüfung nötig“), Neuabgleich bei neuem Listenstand, Löschung der Unterlagen und Personenangaben ab 01.01. des sechsten Jahres nach Ende der Geschäftsbeziehung (Compliance trägt das Ende ein; abgelehnte Fälle ab Ablehnung).
- Test: `node scripts/plattform-test-kyc.mjs`; Frappe `tests/test_kyc.py` (Bench), `tests/test_kyc_kern.py` (auch ohne Bench: `cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_kyc_kern`).

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `PLATTFORM_KYC_SCHLUESSEL` | **Produktion (Demo-Backend)** | Schlüssel der KYC-Ablage: 32 Byte hex/Base64 (`openssl rand -base64 32`) oder Passphrase ≥ 32 Zeichen. Ohne: in Produktion 503, in Entwicklung unsicherer Fallback mit Warnung. Nie ändern ohne `…_ALT`. |
| `PLATTFORM_KYC_SCHLUESSEL_ALT` | – | frühere Schlüssel (kommagetrennt) zum Lesen alter Dateien nach einem Wechsel |
| `PLATTFORM_KYC_GATING` | – | `alle` \| `pilot` \| `aus` – Geltung der Freigabe-Sperren (Standard: Produktion `alle`, Entwicklung `pilot`); die Einstellung im Backoffice hat Vorrang |
| site_config `oekoinvest_kyc_schluessel` | empfohlen (Frappe) | Schlüssel für die Frappe-Ablage (sonst aus dem Frappe-Verschlüsselungsschlüssel abgeleitet); zusätzlich Dateisystem-/Backup-Verschlüsselung |
| site_config `oekoinvest_kyc_gating` | – | wie `PLATTFORM_KYC_GATING` (Standard `alle`) |

**Rechtsrahmen (vorsichtig, keine Rechtsberatung):** DE – Immobilienmakler sind Verpflichtete (§ 2 Abs. 1 Nr. 14 GwG; Definition § 1 Abs. 11: gewerbliche Vermittlung von Kauf-, Pacht- oder Mietverträgen über Grundstücke/grundstücksgleiche Rechte). Ob die Vermittlung von PV-Projektrechten, Projektgesellschaften (Share Deals) oder Flächenpachten darunterfällt, ist eine Auslegungsfrage – die Plattform ist deshalb für die vollen Sorgfaltspflichten gebaut. Identifizierung natürlicher Personen nach § 12 Abs. 1 GwG (gültiger amtlicher Lichtbildausweis, eID, qualifizierte elektronische Signatur, notifiziertes eID-System), juristischer Personen nach § 12 Abs. 2 (Registerauszug, Gründungsdokumente); wirtschaftlich Berechtigte > 25 % bzw. Kontrolle, sonst fiktiver wirtschaftlich Berechtigter; Aufzeichnung und Aufbewahrung 5 Jahre (§ 8 Abs. 4 GwG, Frist ab Schluss des Kalenderjahres; Recht/Pflicht zur Kopie des Ausweises § 8 Abs. 2). Video-/Online-Identifizierung nur über zugelassene Anbieter (Schnittstelle für das Team „Dienste“ vorhanden) – die Plattform selbst behauptet keine. AT – Immobilienmakler: §§ 365m1 ff. GewO (Sorgfaltspflichten, Register der wirtschaftlichen Eigentümer nach WiEReG); FM-GwG betrifft Kredit-/Finanzinstitute. CH – Finanzintermediäre nach GwG; mit der Revision (Inkrafttreten nach aktuellem Stand 01.10.2026) Beraterpflichten nach Art. 2 Abs. 3bis GwG u. a. bei konkreten Immobilienkäufen/-verkäufen und neues Transparenzregister (TJPG) – Anwendbarkeit prüfen lassen. Sanktionen: EU-Finanzsanktionen gelten unmittelbar (Bereitstellungsverbot); Verdachtsmeldung DE § 43 GwG, kein „Tipping-off“ (§ 47 GwG). DSGVO: Rechtsgrundlage Art. 6 Abs. 1 lit. c i. V. m. GwG, soweit Verpflichtung besteht, sonst lit. b/f; Datenminimierung (Schwärzung der Zugangsnummer CAN und nicht benötigter Angaben; Ausweisnummer, Behörde, Gültigkeit bleiben lesbar, da nach § 8 Abs. 2 GwG aufzuzeichnen), § 20 Abs. 2 PAuswG (Kopie als Kopie erkennbar). eIDAS: qualifizierte Signaturen/notifizierte eID als künftige Identifizierungswege. **Vor dem Livegang:** Verpflichteten-Status und Verfahren (Risikoanalyse, Geldwäschebeauftragter, interne Sicherungsmaßnahmen, Hochrisikoländer-Liste, Wiederholungsfristen) juristisch prüfen lassen; Datenschutzerklärung um KYC ergänzen (Textbausteine im Abschlussbericht des KYC-Teams).


## Finanzen & Abrechnung

Pachtabrechnung (Gutschrift), Contracting-Rechnungen aus den geeichten Zählerstand-Monatswerten, Provisionsrechnungen, offene Posten, Klärfälle, Auszahlungen per SEPA-Datei (pain.001), Anlagenbuchhaltung (AfA) und Projektcontrolling. ERPNext optional (Frappe: installiert + `oekoinvest_erpnext`); sonst Eigenbetrieb. Vertrag: `docs/API.md`, Abschnitt „Finanzen & Abrechnung“; Betrieb, Steuervorlagen und Pflichtangaben-Checkliste: [`Backend-Import/FINANZEN-ERPNEXT.md`](../Backend-Import/FINANZEN-ERPNEXT.md).

- Seiten: `/portal/abrechnungen` (Eigentümer: Gutschriften, Jahresübersicht, Indexierung erklärt, nächste Zahlung, Hinweis bei fehlender Verifizierung · Contracting-Kunden: Rechnungen, Verbrauch je Monat · Anbieter: Provisionsrechnungen; PDF je Beleg) · `/portal/admin/finanzen` (Reiter Übersicht mit Abrechnungslauf/Mahnvorschlägen/Je Gesellschaft, Belege & offene Posten mit CSV, Klärfälle, Auszahlungen & SEPA, Pachtverträge, Index (VPI), Anlagen & Projekte).
- Code: `src/lib/plattform/finanzen/**` (reine Logik, `node --test src/lib/plattform/finanzen/finanzen.test.mjs`), `finanzen/beleg-pdf.js` (PDF), `backend/{finanzen,demo/finanzen*,frappe/finanzen}.js`, `src/app/api/{portal,admin}/finanzen/**`, `src/components/Portal/Finanzen/**`.
- Demo: einmalig unter `db.finanzen` ergänzt (Schema `FIN_SCHEMA`) – vier fiktive Pachtverträge (indexiert, Dachpacht monatlich, Umsatzbeteiligung mit Mindestpacht an der Demo-Freiflächenanlage, Agri-PV in der Reservierungsphase), Gutschriften-Historie, Contracting-Rechnungen der letzten drei Monate (eine überfällig), Provisionsrechnungen, Klärfälle für Anlagen ohne Monatswerte, Kostenträger der Entwicklung. VPI-Startwerte sind gerundete Beispielwerte. Auszahlungen prüfen den KYC-Status des KYC-Moduls; ohne dessen Daten gelten Demo-Stammdaten.
- Rechnungsaussteller Contracting = Eigentümergesellschaft der Anlage (Feld der Fachprüfung, Gesellschaftsverzeichnis); Belege tragen `gesellschaftId` (Auswertung je Gesellschaft, später Bankfinanzierung).
- Umgebungsvariablen (nur Demo/Vorführung): `FINANZEN_UID`, `FINANZEN_IBAN`, `FINANZEN_BIC` – Aussteller-UID und Geschäftskonto; ohne Angabe erscheint eine offensichtliche Beispiel-IBAN mit Hinweis. Im Betrieb: Frappe „Plattform Finanzen Einstellungen“.
- Test: `node scripts/plattform-test-finanzen.mjs` (Indexierung, Mindestpacht, nur eigene Belege/403, keine Auszahlung ohne KYC, SEPA-Struktur nach Verifizierung, Provision → Rechnung → bezahlt, Contracting-Klärfall, Unterrollen, CSRF, Seiten); Frappe `plattform/finanzen/test_logik.py` (ohne Bench) und `plattform/tests/test_finanzen.py`.
- **Vor dem Livegang:** Steuervorlagen, Kontenplan, Gutschriftsverfahren (Vereinbarung im Pachtvertrag), Wertsicherungsklausel und AfA mit Steuerberatung/Rechtsberatung abstimmen; UID und Geschäftskonto eintragen; VPI-Werte gegen die amtliche Veröffentlichung prüfen; SEPA-Testeinreichung mit der Hausbank.

## Fachprüfung Kapitalseite (Investor, Anbieter, Unternehmen, Mitglied)

Befunde, Felder und Fachhinweise: [`docs/fachpruefung/kapitalseite.md`](./fachpruefung/kapitalseite.md); Vertrag: `docs/API.md`, Abschnitt 13 (und Abschnitt 10 „Eigentum & Betrieb“).
- Seiten: Projektformular mit Schritt „Datenblatt“ (Anbieter), Datenblatt + Due-Diligence-Index + „Bewerten“ im Exposé nach NDA, `/portal/boerse/[id]/bewertung` (Bewertungswerkzeug mit Szenarien), strukturierte LOI im Exposé, erweitertes Suchprofil (`/portal/profil`), `/portal/energie` (Unternehmen: Abnahmestellen, Lastgang-Analyse, Angebotsanfrage), `/portal/beteiligung` (Mitglied: Genossenschaft im Aufbau, Energiegemeinschaft), „Mein Solarstrom“ statt „Meine Anlagen“ (Anlagen im Eigentum von ÖkoInvest/SPV).
- Code: `src/lib/plattform/fach/**` (reine Logik, Node-testbar), `backend/{fach,demo/fach,frappe/fach}.js`, `backend/demo/anlagen-eigentum.js`, `src/app/api/portal/fach/**`, `src/components/Portal/Fach/**`; Frappe `plattform/fach/**`, `plattform/api/fach.py`, DocTypes Abnahmestelle/Lastgang/Bewertung Szenario/Beteiligung Interesse, Patch `anlage_eigentuemer`.
- Demo: einmalig unter `db.fach` ergänzt (Datenblätter der Demo-Projekte, eine Abnahmestelle für `unternehmen@example.com`); Lastgang-Zeitreihen als Datei unter `.data/uploads`. Anlagen erhalten einmalig Eigentümer, Betriebsführer, Dachgeber, Dienstbarkeit und Vertragsdetails (`db.anlagen.eigentum`).
- Test: `node scripts/plattform-test-fach-kapital.mjs` (`--nur-logik` ohne Server); Frappe `python -m unittest oekoinvest_app.plattform.tests.test_fach_kapital`.

## Geodaten & Akquise-Karte

Backoffice-Seite `/portal/admin/akquise/karte` (Unterrollen Leitung/Akquise, Bereich `geodaten`): Karte mit basemap.at (Grau/Orthofoto, Leaflet), Kandidatenflächen mit Score (Größe, Form, Neigung, Nutzung, Siedlungsabstand, Trasse und Netzanschlusskosten zum günstigsten Umspannwerk/Trafo, Widmungslage je Bundesland, Einstrahlung, Schutzgebiete), Filter, Suche (Ort, KG, Grundstücksnummer, Umspannwerk), Umkreis-Suche, Steckbrief, Übernahme als Akquise-Ziel (Fläche + Aufgabe „Eigentümer ermitteln (Grundbuchabfrage)“), Anschreiben-Vorlage mit Datenschutzinformation, Export CSV/GeoJSON, Messwerkzeug, Kapazitätspflege mit Quelle. Demo: OSM-Umspannwerke OÖ/Salzburg + synthetische Parzellen im Innviertel. Dienst: `Backend-Import/dienste/geodaten` (PostGIS, Python). Doku: [`docs/AKQUISE-GEODATEN.md`](./AKQUISE-GEODATEN.md). Test: `node scripts/plattform-test-geodaten.mjs`; Dienst `python -m unittest discover -s tests`; Frappe `tests/test_geodaten.py`.

## Dienste: Identität, Register, Bonität, SPV-Gründung

Anbieter-Recherche, Kosten, Vertragspflichten und Rechtsrahmen: [`docs/DIENSTE-EXTERN.md`](./DIENSTE-EXTERN.md); Vertrag: `docs/API.md`, Abschnitt „Dienste“.

- **Seiten:** `/portal/verifizierung` (zusätzlich „Online identifizieren“ und „Ausweis automatisch vorprüfen“ – MRZ mit Live-Prüfziffern im Browser), `/portal/verifizierung/identitaet?sitzung=` (Demo-Simulator des Anbieters), `/portal/admin/bonitaet` (Leitung, Transaktion, Compliance: offene LOI-Voraussetzungen, Auskünfte mit Ampel, Beauftragung mit Information des Betroffenen, Freigabe mit Begründung, Pflicht-Einstellung, Registersuche), `/portal/admin/gesellschaften` (Verzeichnis, Organigramm als SVG, Fristen), `/portal/admin/gesellschaften/neu[?projekt=EP-…]` (Gründungsassistent), `/portal/admin/gesellschaften/[id]` (Checkliste, Dokumentenpaket, Fristen, ERPNext). Im KYC-Fall (Compliance, KYB) zusätzlich „Registerauszug abrufen“ – der Abruf wird mit Abrufdatum als Prüfergebnis hinterlegt.
- **Code:** `src/lib/plattform/dienste/**` (MRZ ICAO 9303, Anbieter-Schnittstelle mit HMAC, Register-/Bonitäts-Adapter, Rechtsformen/Schritte/Fristen, Dokumentenpaket, PDF-Satz), `backend/{dienste,demo/dienste,demo/diensteRegeln,frappe/dienste}.js`, `src/app/api/{dienste,portal/dienste,admin/register,admin/bonitaet,admin/gesellschaften}/**`, `src/components/Portal/Dienste/**`; Frappe `plattform/api/dienste.py`, `plattform/dienste_kern.py`, 5 DocTypes, 2 Druckformate, 2 Notifications.
- **Demo:** einmalig unter `db.dienste` ergänzt – Bestandsgesellschaften der Gruppe (ÖkoInvest GmbH, GFL – PV-Kraftwerk GmbH, HIL PV Kraftwerk GmbH mit öffentlichen Registernummern) und eine fiktive Gründung „Solarpark Innviertel Nord GmbH (Demo)“. Identitätsanbieter, Register (außer Zefix mit Zugang) und Auskunftei sind Simulatoren; Pflicht „Bonität vor LOI“ gilt in der Entwicklung nur für Pilot-Konten.

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `IDENT_ANBIETER`, `IDENT_API_URL`, `IDENT_API_KEY`, `IDENT_API_SECRET`, `IDENT_WEBHOOK_SECRET` (≥ 16 Zeichen), `IDENT_STUFE` | für Online-Identifizierung | Identitätsanbieter (Empfehlung Veriff); Webhook-URL beim Anbieter: `https://<domain>/api/dienste/identitaet/webhook/<anbieter>` |
| `ZEFIX_BENUTZER`, `ZEFIX_PASSWORT`, `ZEFIX_API_URL` | – | Zefix PublicREST (Zugang kostenlos auf Antrag); ohne: Demo-Register |
| `FIRMENBUCH_API_URL`/`_KEY`, `HANDELSREGISTER_API_URL`/`_KEY` | – | Dienstleister mit neutralem JSON-Vertrag (`/suche`, `/firma`) |
| `BONITAET_ANBIETER`, `BONITAET_API_URL`, `BONITAET_API_KEY`, `BONITAET_PRODUKT` | für Bonität im Betrieb | Auskunftei (Vertrag nötig) über neutralen Vertrag `POST /auskunft` |
| `PLATTFORM_BONITAET_VOR_LOI` | – | `alle` \| `firmen` \| `pilot` \| `aus` (Standard Produktion `firmen`) |

Test: `node scripts/plattform-test-dienste.mjs` (MRZ-Prüfziffern mit ICAO-Beispiel, Webhook-Signatur falsch → 401, Wiederholung idempotent, Bonität nur berechtigte Unterrollen, LOI ohne Bonität → 409, Information ohne Ergebnis, SPV-Checkliste/Reihenfolge/Dokumentenpaket, Seiten); Frappe `python -m unittest oekoinvest_app.plattform.tests.test_dienste_kern`.

## Dokumente, Signatur, Termine, Service & HR

Vertrag: `docs/API.md`, Abschnitt „Dokumente, Signatur, Termine, Service & HR“. Code: `src/lib/plattform/{signatur,termine,tickets,hr}/**`, `backend/{service.js,demo/service*.js,frappe/service.js}`, `server/png.js` (PNG lesen) und `server/pdf.js` (Bilder), APIs `src/app/api/{portal,admin}/{signatur,termine,support,hr,wissen}/**`, Komponenten `src/components/Portal/{Signatur,Termine,Support,Team}/**`; Frappe `plattform/api/{signatur,termine,support,hr}.py`, `plattform/{signatur,termine,hr,service}/`.

- **Elektronische Unterschrift** `/portal/signatur`, `/portal/signatur/[id]`: Backoffice stellt ein PDF bereit (NDA, Provisionsvereinbarung, Pacht-Absichtserklärung, Gutachterauftrag …), Unterzeichner in fester Reihenfolge, Unterschrift gezeichnet (Canvas → PNG) oder getippt, Bestätigungscode per E-Mail, Zustimmungstext, Protokoll (Zeit, IP, Browser, SHA-256 vorher/nachher), Erinnern, Widerruf vor Abschluss, Ablehnen mit Grund. Nach der letzten Unterschrift: **signiertes PDF = unverändertes Original + angehängte Prüfseite** (inkrementelles PDF-Update, ohne Fremdpakete; Frappe akzeptiert nur Dateien, die byte-genau mit dem Original beginnen). Druckformat „Signaturprotokoll“ im Desk. Einstellung „Klick oder Unterschrift“ für Klick-NDA und Provisionsvereinbarung (Standard: Klick bleibt).
- **Rechtlicher Rahmen:** einfache elektronische Signatur (EES) nach Art. 3 Nr. 10 eIDAS – ausdrücklich keine fortgeschrittene/qualifizierte Signatur; überall so gekennzeichnet. Erfüllt keine gesetzliche Schriftform (z. B. § 126 BGB) und keine notarielle Form; für formfreie Erklärungen gedacht. Texte vor Livegang juristisch prüfen lassen.
- **Termine** `/portal/termine`, öffentlich `/termin` (`?art=`, `?herkunft=kontakt|flaechencheck`, `?plz=&ort=`) und `/termin/verwalten?token=` (Umbuchen/Absagen per Link, `noindex`, kein Referrer); Backoffice `/portal/admin/kalender` (Woche/Monat, Filter je Mitarbeiter, Tasten ← → t, Verfügbarkeiten). Terminarten Flächenbesichtigung, Beratung Telefon/Video, Gemeindetermin, Datenraum-Session (nur Investoren). Doppelbuchung verhindert (Prüfung unter Sperre), Abwesenheiten/Feiertage sperren Slots, Zuständigkeit über Gebiete der Akquise, ICS-Einladung per E-Mail, Erinnerung 24 h vorher, optional Frappe „Event“.
- **Support** `/portal/support`, `/portal/support/[id]`, Backoffice `/portal/admin/support`: Tickets mit SLA (Reaktion/Lösung), interne Notizen, Anhänge, Tickets aus Anlagen-Störungen, optional Frappe Helpdesk.
- **Team & HR** `/portal/admin/team` (Mitarbeiter ↔ Employee, Gebiete, Auslastung, Abwesenheit → automatische Vertretung für Aufgaben/Termine/Tickets, Zeiterfassung auf Projekte mit Auswertung für Projektentwicklung/Finanzen) und interne **Wissensdatenbank** `/portal/admin/wissen` (Suche „/“, Kategorien, Versionen; für Kunden nie sichtbar).
- **Frappe Drive** (optional): Plattform-Dokumente werden für das interne Team gespiegelt; Rechte bleiben in der Plattform; KYC nur mit eigenem Schalter, verschlüsselt und abgeschottet. Drive-/Helpdesk-DocTypes vor Einsatz gegen die installierte Version prüfen.
- **Demo:** einmalig unter `db.service` ergänzt – Mitarbeiter mit Verfügbarkeiten, Urlaub von `bo-akquise@example.com` (Vertretung Leitung), Termine, Tickets (u. a. aus einer Störung), zwei laufende und ein abgeschlossener Signaturvorgang mit signiertem PDF, Zeiteinträge, sechs Wissensartikel. E-Mails (Bestätigungscode, ICS-Einladungen) im Postausgang.
- Test: `node scripts/plattform-test-service.mjs` (Signatur: Hash-Prüfung, Reihenfolge, fremde → 403, signiertes PDF mit Prüfseite; Termine: Doppelbuchung, Abwesenheit → Vertretung; Tickets: Rechte; Wissen nur intern); Frappe `tests/test_service_rein.py` (ohne Bench: `python -m unittest oekoinvest_app.plattform.tests.test_service_rein`) und `tests/test_service.py`.

## Energiebeschaffung & Versorger-Ausschreibung

Handelsdesk, Wechselanalyse und Bieterwettbewerb unter Energieversorgern für den Reststrom-Pool – Fachkonzept, Quellen und Rechtsrahmen: [`docs/ENERGIEBESCHAFFUNG.md`](./ENERGIEBESCHAFFUNG.md); Vertrag: `docs/API.md`, Abschnitt „Energiebeschaffung“.

- Seiten: `/portal/admin/energie` (Handelsdesk: Spot, Termin, Pool-Portfolio, Annahmen), `/portal/admin/energie/kunden[/id]`, `/portal/admin/energie/ausschreibungen[/id]`, `/portal/admin/energie/lieferanten`, Kunde `/portal/energie/beschaffung`, Versorger `/portal/ausschreibungen[/id]`, Einladung `/einladung/lieferant/[token]`.
- Code: `src/lib/plattform/energie/{markt,beschaffung,ausschreibung,los,auswertung,quellen,pdf,texte}.js`, `backend/{energie,demo/energie,demo/energie-seed,frappe/energie}.js`, `src/app/api/{admin,portal}/energie/**`, `src/app/api/portal/ausschreibungen/**`, `src/components/Portal/Energie/**`; Frappe `plattform/api/energie.py`, `plattform/energie_{kern,quellen,texte,druck}.py`.
- Neue Rolle `lieferant` (nur per Einladung), Backoffice-Unterrolle `energie`. Demo-Konten: `lieferant@example.com`, `lieferant2@example.com` … `lieferant6@example.com`, `bo-energie@example.com`, `energie-kunde1@example.com` … `energie-kunde3@example.com` (Passwort wie alle Demo-Konten).
- Spotpreise: Energy-Charts (CC BY 4.0, Bundesnetzagentur | SMARD.de) mit 6-h-Cache; Terminmarkt nur mit Quelle (EEX lizenzpflichtig), Demo-Kurve gekennzeichnet und in den Einstellungen abschaltbar.
- Test: `node scripts/plattform-test-energie.mjs` (`--logik` ohne Server); Frappe `tests/test_energie_kern.py` (ohne Bench), `tests/test_energie.py`.

## Finanzierung: Investoren-Cockpit & Bankfinanzierung Eigenbetrieb

Recherche und Methodik: [`docs/FINANZIERUNG.md`](./FINANZIERUNG.md); Vertrag: `docs/API.md`, Abschnitt „Finanzierung“.

- **Investoren-Finanzierungscockpit** `/portal/finanzierung` (Menü „Finanzierungscockpit“ für Investor/Anbieter; Knopf „Finanzierung“ im Exposé der Portal-Börse): freies Werkzeug oder `?projekt=` mit Vorbelegung aus Datenblatt/Exposé (angedockt an das Bewertungswerkzeug `fach/bewertung.js`; nur mit freigegebenem Datenraum). Projekt-IRR, NPV, LCOE, Amortisation, ROI; sieben Finanzierungsvarianten nebeneinander (100 % EK, Annuität, DSCR-skulptierte Projektfinanzierung, Förderkredit, Leasing, Mietkauf, Mischform) mit EK-Bedarf, Schuldendienst, DSCR min/Ø (P50/P90), LLCR, EK-IRR vor/nach Steuern (Näherung), Kosten, Liquiditätsverlauf (SVG, Tooltip); Stresstest; Förder-Check je Land mit Quellen; Szenarien speichern/vergleichen/PDF.
- **Bankfinanzierung** `/portal/admin/finanzierung` (Bereich `finanzierung`: Leitung/Transaktion/Buchhaltung schreiben, Lesen/Projektleitung lesen; Bankentscheidung und Geschäftsmodell nur Leitung): Fall aus Entwicklungsprojekt oder Anlage, Bankenstamm, Anfrage an mehrere Banken per E-Mail mit persönlichem 14-Tage-Link, Bankenpaket mit Freigabe je Baustein (Steckbrief und Financial Model PDF/CSV automatisch), Term-Sheet-Vergleich, Entscheidung, Kreditvertrag, CPs, Covenant-Monitoring (DSCR rollierend 12 Monate aus den Zählerwerten der Anlage, LLCR, Ampel, Frühwarnung, täglich), Bank-Reporting-PDF, Geschäftsmodell-Vergleich (Build-to-Sell / Eigenbetrieb / Contracting / Verpachtung).
- **Bank-Portal** `/portal/bank` (externe Rolle `bank`, nur per Einladung `/einladung/bank/[token]` mit der eingeladenen E-Mail): nur Anfragen der eigenen Bank, nur freigegebene Unterlagen (Abrufe protokolliert), Term Sheet abgeben, Rückfrage, Absage.
- Demo (einmalig unter `db.finanzierung`, fiktiv): drei Banken, Konto `bank@example.com` (Passwort wie alle Demo-Konten), Fall im Eigenbetrieb mit zwei Term Sheets und einer Absage, zwei Anlagen mit Kreditvertrag (Covenant grün bzw. Frühwarnung), ein Szenario des Demo-Investors.
- Test: `node scripts/plattform-test-finanzierung.mjs` (`--nur-logik` ohne Server); Frappe `tests/test_finanzierung.py`, `tests/test_finanzierung_kern.py`.
