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
| `SERVER`, `API_KEY`, `API_SECRET` | bei Frappe | wie `src/lib/apiBaseUrl.js`; API-Nutzer mit Rolle `ÖkoInvest API` (Einrichtung: `Import-Frappe/ANLEITUNG.md`) |
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
- Code: `src/lib/plattform/anlagen.js`, `src/lib/plattform/messdaten/**`, `backend/{anlagen,demo/anlagen,demo/anlagen-seed,frappe/anlagen}.js`, `src/app/api/{portal,admin}/anlagen/**`, `src/components/Portal/Anlagen/**`; Dienst `services/anlagen-daten/`; Frappe `plattform/api/anlagen.py`, `plattform/anlagen_kern.py`.
- Demo: einmalig unter `db.anlagen` ergänzt – 7 fiktive Anlagen (6 für „Muster Logistik GmbH (fiktiv)“, Inhaberin `unternehmen@example.com`; eine fremde nur fürs Backoffice), Szenarien offline / Wechselrichter-Teilausfall / Minderleistung, Konto `bo-betrieb@example.com` (Unterrolle Betrieb, Passwort wie alle Demo-Konten). Messdaten aus dem Simulator (deterministisch); „Testnachricht senden“ ersetzt im Assistenten den Datenlogger.

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `ANLAGEN_DATEN_URL` | Betrieb | Basis-URL der Abfrage-API des Ingest-Dienstes (HTTPS). Ohne: Simulator im Demo-Betrieb, sonst 503 für Messdaten |
| `ANLAGEN_DATEN_TOKEN` | Betrieb | Service-Token (≥ 32 Zeichen, = `DIENST_TOKEN` des Dienstes), nur serverseitig |
| `ANLAGEN_MQTT_HOST`, `ANLAGEN_MQTT_PORT` | – | Broker-Angaben im Assistenten (Demo; Frappe: `site_config` `oekoinvest_mqtt_host/port`) |
| `ANLAGEN_SIMULATOR` | – | `1` = Simulator auch mit Frappe-Stammdaten (Vorführung) |

Test: `node scripts/plattform-test-anlagen.mjs` (Sichtbarkeit, fremde Anlage → 403 auch für Messdaten/Zähler/Live, Passwort nur einmal/nur Hash, Messpunkt-/Monatswert-Regeln, Störung quittieren nur Betrieb, Unterrollen, CSRF, Seiten); Frappe `tests/test_anlagen.py`; Dienst `cd services/anlagen-daten && npm test`.
