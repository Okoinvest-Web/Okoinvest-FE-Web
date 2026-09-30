# Backend-Import – Plattform-Backend `oekoinvest_app`

Frappe-v15-App für Portal, Projektbörse und Backoffice der ÖkoInvest-Website.
Die Website (Next.js) spricht die App ausschließlich serverseitig über `src/lib/plattform/backend/frappe.js` an.
Verbindlicher Vertrag: `docs/API.md` (Methoden, Rollen, Automaten), Betrieb der Website: `docs/PLATTFORM.md`.

> Überblick, Architektur, Rollen, Desk, Druck, E-Mail: [`README.md`](./README.md) · Checkliste Livegang: [`GO-LIVE.md`](./GO-LIVE.md)
> Automatische Installation/Update: [`installieren.sh`](./installieren.sh) · Konfiguration: [`site_config.beispiel.json`](./site_config.beispiel.json)
> Konsistenzprüfung ohne Bench: `python Backend-Import/werkzeuge/pruefen.py` (muss 0 Fehler melden)

> Vorher: **Backup** der Site: `bench --site <site> backup --with-files`.
> Tests (`run-tests`) nur auf einer **Test-Site**, nie auf der Produktiv-Site.

## Inhalt

```
Backend-Import/
  ANLEITUNG.md, README.md, GO-LIVE.md, installieren.sh, site_config.beispiel.json
  werkzeuge/                        ← pruefen.py (Konsistenz), bauen.py (Druckformate), desk_rechte.py (DocPerm-Matrix)
  oekoinvest_app/                   ← App-Repository (bench get-app)
    pyproject.toml, README.md, MANIFEST.in
    oekoinvest_app/
      __init__.py (__version__), hooks.py, modules.txt (Plattform), patches.txt
      fixtures/                     ← Rollen (16), Rollenprofile (9), Briefkopf, E-Mail-Vorlagen, Notifications,
                                      Workflows (inaktiv), Number Cards, Dashboard Charts
      templates/emails/*.html       ← E-Mails (Basis-Layout + Bestätigung, Passwort, Hinweis, Benachrichtigung, Sicherheit)
      public/js/desk_status.js      ← Statuswechsel-Knöpfe im Desk
      translations/de.csv
      plattform/
        konstanten.py, prozesse.py (Zustandsautomaten 1:1 aus prozesse.js), validierung.py,
        oeffentlich.py (Positivliste), matching.py, kern.py (Aufrufer/Rechte/Protokoll),
        ausgabe.py (JSON), ablauf.py (Statuswechsel + Nebenwirkungen), mail.py,
        benachrichtigung.py (Glocke + E-Mail je Einstellung), checkliste.py (Unterlagen je Phase, 1:1 aus checkliste.js),
        installation.py, aufgaben.py (Scheduler: Tokens, Wiedervorlagen), basis.py (Controller-Basis)
        einrichtung.py (Systemeinstellungen), aufbewahrung.py (Löschkonzept), desk.py (Desk-Statuswechsel), druck.py (Jinja-Hilfen)
        workspace/ (7 Workspaces) · report/ (7 Berichte) · print_format/ (10 Druckformate + oekoinvest_druck.css)
        api/  auth · konto · anfrage · vorgang · flaeche · projekt · boerse · interesse · prozess · nachricht · dokument · admin
              · benachrichtigung · aufgabe
        doctype/  16 DocTypes (s. u.)
        tests/    test_prozesse · test_rechte · test_provision · test_aktivitaet · test_benachrichtigung · test_aufgabe · test_checkliste
```

| DocType | Inhalt |
|---|---|
| Plattform Konto (+ Kindtabelle Plattform Konto Rolle) | Portal-Konto, 1:1 zum Frappe-User; Rollen, Sitzungsversion, Sperre, Suchprofil |
| Plattform Rolle | Stammdaten: Website-Rolle ↔ Frappe-Rolle (wird automatisch gepflegt) |
| Plattform Vorgang | Anfragen aus allen Formularen |
| Plattform Flaeche (+ Plattform Flurstueck) | Flächen der Eigentümer/Landwirte |
| Plattform Projekt | Projekte der Börse (öffentlich nur über die Positivliste) |
| Plattform Interesse | Merkliste, Klick-NDA, LOI – genau eines je Projekt und Investor |
| Plattform Provision | entsteht automatisch beim Verkauf |
| Plattform Nachricht | Threads je Objekt bzw. je Nutzer |
| Plattform Dokument | Metadaten; Datei als **privates** Frappe-File |
| Plattform Aktivitaet | Protokoll, **append-only** |
| Plattform Token | Einmal-Token (nur SHA-256-Hash) |
| Plattform Statusverlauf | Kindtabelle Statusverlauf |
| Plattform Benachrichtigung | Glocke im Portal (Statuswechsel, Nachrichten, NDA, Suchprofil-Treffer, Anfragen, Aufgaben); nach dem Anlegen nur „gelesen“ änderbar |
| Plattform Aufgabe | Backoffice-Aufgaben/Wiedervorlagen mit Fälligkeit, Zuständigem und optionalem Bezug |

Neue Felder (Ausbaustufe 2): `Plattform Konto.mail_einstellungen` (JSON: je Ereignisart E-Mail ja/nein), `Plattform Dokument.checkliste` (Schlüssel des erfüllten Checklisten-Punkts). `bench migrate` legt sie an.

Kennungen: `U-26-XXXXXX`, `V-…`, `F-…`, `P-…`, `I-…`, `PV-…`, `D-…`, `M-…`, `A-…`, `B-…` (Benachrichtigung), `AF-…` (Aufgabe) (zufällig, nicht fortlaufend).

---

## Schritt 1 – App installieren

Den Ordner `Backend-Import/oekoinvest_app` auf den Server kopieren (oder als eigenes Git-Repository bereitstellen), dann im `frappe-bench`-Ordner:

**Empfohlen:** `installieren.sh` erledigt alle Schritte dieses Abschnitts plus site_config, technische Benutzer,
erstes Desk-Konto und Scheduler (Aufruf siehe Kopf des Skripts). Von Hand:

```bash
bench get-app /home/frappe/Backend-Import/oekoinvest_app     # bzw. bench get-app <git-url>
bench --site <site> install-app oekoinvest_app
bench --site <site> migrate
bench restart
```

`install-app`/`migrate` legen an: alle DocTypes, Rollen und Rollenprofile, Briefkopf, E-Mail-Vorlagen, Notifications,
Workflows (inaktiv), Number Cards, Dashboard Charts, Workspaces, Berichte, Druckformate, die Stammdaten „Plattform Rolle“
und die Systemeinstellungen (`plattform/einrichtung.py`, siehe `README.md`). `bench build --app oekoinvest_app` danach ausführen.

| Rolle | Desk | Wer bekommt sie |
|---|---|---|
| ÖkoInvest API | nein | **nur** der technische API-Benutzer der Website (Schritt 3) |
| ÖkoInvest Admin | ja (2FA an) | Leitung: Plattform-Daten im Desk lesen/korrigieren (Rollenprofil „ÖkoInvest Leitung“) |
| ÖkoInvest Akquise / Transaktion / Buchhaltung / Betrieb / Compliance / Leser | ja (2FA an) | Desk-Bereiche laut Rechte-Matrix (`werkzeuge/desk_rechte.py`), vergeben über Rollenprofile |
| ÖkoInvest Anlagen-Dienst | nein | **nur** der technische Benutzer des Ingest-Dienstes |
| Plattform Flächeneigentümer, Landwirt, Investor, Anbieter, Unternehmen, Mitglied, Backoffice | nein | werden **automatisch** aus dem Plattform Konto gesetzt – nicht von Hand vergeben |

Desk-Benutzer anlegen (System User mit Rollenprofil, Einladungs-Mail zum Passwort):

```bash
bench --site <site> execute oekoinvest_app.plattform.installation.desk_benutzer_anlegen   --kwargs "{'email': '<adresse>', 'vorname': '<Vorname>', 'nachname': '<Nachname>', 'profil': 'ÖkoInvest Akquise'}"
```

Rechte-Prinzip: Die fachlichen Rollen und `ÖkoInvest API` haben **keine** DocType-Rechte. Alles läuft über die whitelisted Methoden, die Rolle **und** Eigentum selbst prüfen. `/api/resource/...` liefert dem API-Benutzer nichts.

## Schritt 2 – Site-Konfiguration

Werte stehen danach in `sites/<site>/site_config.json` – **nie** ins Git-Repository.

```bash
# Pflicht: Basis für alle Links in E-Mails (gleicher Wert wie PLATTFORM_BASIS_URL der Website).
# Wird NIE aus dem Request-Host übernommen.
bench --site <site> set-config plattform_basis_url "https://www.oekoinvest.com"

# Optional: Sammeladresse des Backoffice für Hinweise auf neue Anfragen/Nachrichten
# (sonst nur das jeweils zuständige Admin-Konto)
bench --site <site> set-config plattform_backoffice_email "<adresse-des-backoffice>"

bench restart
```

Außerdem prüfen:

- **E-Mail-Konto (ausgehend)** im Desk eingerichtet und als Standard markiert – sonst keine Bestätigungs-/Passwort-Mails. Mails laufen über die Email Queue (**Scheduler und Worker** müssen laufen: `bench doctor`).
- **System Settings → Max File Size** ≥ 10 MB (Frappe-Standard 25 MB) und, falls Dateiendungen eingeschränkt sind, `pdf, jpg, jpeg, png` erlauben.
- **nginx** `client_max_body_size` ≥ 20m (Frappe-Standard 50m): Ein Upload von 10 MB kommt als Base64 im JSON (~13,4 MB).
- Rate-Limits: Die Website begrenzt Login/Registrierung/Uploads je IP. Da alle Aufrufe vom Website-Server kommen, bringt ein IP-Limit in Frappe nichts; zusätzlich am Proxy der **Website** begrenzen (siehe `docs/PLATTFORM.md`).

## Schritt 3 – API-Benutzer für die Website

Per Skript (Rollenprofil „ÖkoInvest API-Benutzer“, Website User): `bench --site <site> execute oekoinvest_app.plattform.installation.technischer_benutzer_anlegen --kwargs "{'email': 'plattform-web@<ihre-domain>', 'art': 'api'}"` – danach nur noch die Schlüssel erzeugen. Oder von Hand im Desk → **User** → Neu:

- E-Mail z. B. `plattform-web@<ihre-domain>`, Vorname „Plattform Website“, **Benutzertyp: Website User**
- Rollen: **nur** `ÖkoInvest API` (keine weiteren Rollen, kein System Manager)
- Speichern → Abschnitt „API Access“ → **Generate Keys** → API Key und API Secret notieren (das Secret wird nur einmal angezeigt)

Alternativ in der Konsole (`bench --site <site> console`):

```python
from frappe.core.doctype.user.user import generate_keys
generate_keys("plattform-web@<ihre-domain>")   # → {'api_secret': '…'}; API Key steht im User (api_key)
```

Schlüssel regelmäßig rotieren (neu generieren → Website-Umgebung aktualisieren).

## Schritt 4 – Erstes Backoffice-Konto (Rolle „admin“ im Portal)

```bash
bench --site <site> execute oekoinvest_app.plattform.installation.admin_konto_anlegen \
  --kwargs "{'email': '<vorname.nachname@ihre-domain>', 'vorname': '<Vorname>', 'nachname': '<Nachname>'}"
```

Das Konto bekommt kein Passwort; es geht ein Link „Neues Passwort festlegen“ (24 h) an die Adresse. Weitere Backoffice-Rechte vergibt danach ein Admin im Portal (`/portal/admin/nutzer`) oder im Desk am **Plattform Konto** (Tabelle „Rollen“, Wert `admin`).

Hinweis: Frappe-Benutzer mit `System Manager` oder `ÖkoInvest API` können **nicht** als Portal-Konto verwendet werden (Schutz vor Rechteausweitung) – für das Portal eigene Konten anlegen.

## Schritt 5 – Website-Umgebung (Hosting der Next.js-Website, nicht Frappe)

```
PLATTFORM_BACKEND=frappe
SERVER=https://<frappe-host>            # ohne abschließenden Schrägstrich
API_KEY=<API Key aus Schritt 3>
API_SECRET=<API Secret aus Schritt 3>
PLATTFORM_BASIS_URL=https://www.oekoinvest.com   # gleicher Wert wie plattform_basis_url
SESSION_SECRET=<zufällig, ≥ 32 Zeichen: openssl rand -base64 48>
```

Danach neu deployen. Ohne `PLATTFORM_BACKEND=frappe` antwortet die Plattform in Produktion mit 503 (keine stillen Demo-Daten).

### Optional: KI-Assistent

Der Assistent läuft vollständig auf der **Website**; der Schlüssel der Claude API gehört **nur** in die Website-Umgebung, **nie** in `site_config.json` oder einen DocType:

```
ANTHROPIC_API_KEY=<Schlüssel aus der Anthropic Console>   # ohne: regelbasierte Vorschläge
KI_TAGESKONTINGENT=30                                      # optional, Aufrufe je Konto und Tag
```

Frappe speichert nur das Nutzungsprotokoll (DocType **Plattform KI Nutzung**, append-only, ohne Inhalte; Methoden `ki.nutzung_heute`, `ki.nutzung_protokollieren`). Optionale site_config-Schlüssel – überschreiben das Kontingent der Website:

```bash
bench --site <site> set-config oekoinvest_ki_tageskontingent 30
bench --site <site> set-config oekoinvest_ki_tageskontingent_admin 150
```

Nach dem Update: `bench --site <site> migrate` (legt den DocType an). Aufbewahrung des Protokolls: Vorschlag 12 Monate, danach löschen (Löschkonzept).

## Schritt 6 – Test

**Automatische Tests (nur Test-Site):**

```bash
bench --site <test-site> set-config allow_tests true
bench --site <test-site> run-tests --app oekoinvest_app
```

Geprüft: Zustandsautomaten (Tabelle, 409/403/Pflicht/Bedingung, Durchsetzung im Controller), Rechte (fremde Fläche → PermissionError, Admin-Methoden, Sperre wirkt sofort, admin nie selbst wählbar, öffentliche Positivliste, Datenraum erst nach NDA-Freigabe, Upload-Typprüfung), Provision (Pflicht vor Einreichung, Satz 1,5–3 %, automatische Provision und Interessen beim Verkauf, Provision unveränderlich), Aktivität append-only.

**Nach der Installation (Produktion), mit den Schlüsseln aus Schritt 3:**

```bash
# Muss 403 liefern (API-Benutzer hat keine DocType-Rechte):
curl -s -o /dev/null -w "%{http_code}\n" "https://<frappe-host>/api/resource/Plattform%20Projekt" -H "Authorization: token KEY:SECRET"

# Ohne Schlüssel: 403
curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://<frappe-host>/api/method/oekoinvest_app.plattform.api.boerse.liste" -H "Content-Type: application/json" -d '{}'

# Öffentliche Börse: 200 und {"message": {"projekte": [...], "kennzahlen": {...}, "demo": false}}
curl -s -X POST "https://<frappe-host>/api/method/oekoinvest_app.plattform.api.boerse.liste" \
  -H "Authorization: token KEY:SECRET" -H "Content-Type: application/json" -d '{}'
```

Danach auf der Website durchklicken: Anfrage stellen → Registrieren (Bestätigungs-Mail kommt) → Login → Fläche anlegen und einreichen → im Backoffice Status weiterschalten (Nutzer bekommt Nachricht + Hinweis-Mail) → Projekt anlegen, Provision akzeptieren, einreichen → im Backoffice veröffentlichen → als Investor NDA → Datenraum-Freigabe → LOI → Verkauf (Provision erscheint unter `/portal/admin/deals`) → Passwort vergessen.
Optional das End-to-End-Skript der Website gegen einen Server mit `PLATTFORM_BACKEND=frappe` und **Test-Site** laufen lassen: `node scripts/plattform-test.mjs`.

## Betrieb

- **Statuswechsel** im Portal-Backoffice oder im Desk über das Menü **„Status“** im Formular (Vorgang, Fläche, Projekt, Interesse, Provision). Beide Wege nutzen denselben Automaten mit Nachricht an den Nutzer, Provision und Protokoll; Pflichtangaben fragt der Desk per Dialog ab. Das Status-Feld direkt zu ändern erlaubt der Controller nur für Admin-Schritte ohne Pflichtangaben (dann ohne Nachricht an den Nutzer) – bitte die Knöpfe verwenden. Frappe-Workflows sind absichtlich inaktiv (siehe `README.md`).
- **Druck**: Briefkopf „ÖkoInvest“ ist Standard; Druckformate je DocType im Druckmenü (z. B. „Vertraulichkeitsvereinbarung NDA“ am Interesse). Monatsbericht: „Plattform Monatsbericht“ öffnen, Monat eintragen, speichern, drucken.
- **Sperren** eines Kontos (Portal oder Desk: „Aktiv“ aus) beendet alle Website-Sitzungen sofort und deaktiviert den Frappe-User.
- **Tokens** (E-Mail/Passwort) werden täglich aufgeräumt (`aufgaben.tokens_aufraeumen`).
- **Wiedervorlagen**: täglich meldet `aufgaben.wiedervorlagen_erinnern` fällige offene Aufgaben einmalig in der Glocke des Zuständigen (und per E-Mail, falls nicht abbestellt); beim Öffnen der Glocke geschieht das zusätzlich sofort. Verschieben oder Neuzuweisen setzt die Erinnerung zurück.
- **Benachrichtigungen/E-Mails**: Jede Nachricht bzw. jeder Statuswechsel erzeugt eine Benachrichtigung für die Seite, die sie noch nicht gelesen hat. Ob zusätzlich eine E-Mail (Vorlage `oekoinvest_benachrichtigung`, ohne Inhalte) versendet wird, legt jedes Konto im Portal unter „Benachrichtigungen“ fest. Suchprofil-Treffer nennen nur den öffentlichen Projekttitel und die Passung.
- **Exposé-PDF**: Die Website erzeugt das PDF aus `boerse.expose` (Rechte: Backoffice, Anbieter, Investor mit freigegebenem Datenraum); jeder Abruf steht im Aktivitätsprotokoll (Aktion `expose`).
- **CSV-Export** im Backoffice: die Website baut die Datei aus den Listen-Methoden und meldet jeden Export über `admin.protokoll_eintrag` (Aktion `export`).
- **Dateien** liegen privat unter `sites/<site>/private/files`; Download im Portal nur für Berechtigte, jeder Zugriff wird protokolliert.

## Offene Punkte vor dem Livegang

- [ ] Auf einer **Test-Bench** installieren und `run-tests` grün laufen lassen (hier ohne Bench nur statisch geprüft: `py_compile`, `json.tool`, pyflakes, Logik-Smoke-Test der Automaten/Validierung/Matching).
- [ ] `plattform_basis_url`, ausgehendes E-Mail-Konto, ggf. `plattform_backoffice_email` setzen; Texte der E-Mails (templates/emails) fachlich/juristisch freigeben.
- [ ] **Löschkonzept**: Fristen beschließen und in `oekoinvest_loeschfristen`/`oekoinvest_log_tage` eintragen (Job `aufbewahrung.taeglich` und Log Settings sind eingerichtet). Aktivitätsprotokoll ist append-only (Hash-Kette) – kontrollierte Archivierung noch offen.
- [x] 2FA für alle Desk-Rollen: Rollen mit „Two Factor Auth“, System Settings „Enable Two Factor Auth“ setzt `einrichtung.anwenden` automatisch.
- [ ] Vollständige Checkliste: [`GO-LIVE.md`](./GO-LIVE.md).
- [ ] Kontaktadresse/Absender der E-Mails festlegen (noch nicht freigegeben – das Standard-E-Mail-Konto von Frappe wird verwendet).
- [ ] Monitoring: Error Log (Titel „ÖkoInvest: …“) beobachten – dort landen fehlgeschlagene E-Mails ohne Inhalte.

## Login, Sicherheit & Teams

- **Module:** `plattform/api/sicherheit.py` (Sitzungen, Geräte, Anmeldehistorie, Zwei-Faktor/TOTP, E-Mail-Link, E-Mail ändern, Pflicht-2FA, Komfort, Datenexport, Konto löschen) und `plattform/api/organisation.py` (Organisationen, Einladungen, Teamrollen, Organisationswechsel, Objekt-Zuordnung). Helfer: `plattform/totp.py`, `plattform/geraet.py`, `plattform/sicherheit.py`, `plattform/organisation.py`. Tests: `test_sicherheit.py`, `test_organisation.py`.
- **Neue DocTypes:** Plattform Organisation, Mitgliedschaft, Einladung, Sitzung, Geraet, Anmeldung (append-only), Zwei Faktor. Nach dem Einspielen `bench --site <site> migrate`.
- **TOTP-Schlüssel** liegen in Password-Feldern (verschlüsselt mit `encryption_key` der `site_config.json` – diesen Schlüssel sichern, sonst sind alle 2FA-Einrichtungen verloren). Wiederherstellungscodes, Einladungs-, Geräte- und Link-Tokens nur als SHA-256.
- **Pflicht-2FA je Rolle:** im Backoffice (Default `oekoinvest_2fa_pflicht`) und/oder fest in der `site_config.json`: `"plattform_2fa_pflicht": "admin"` (kommagetrennt oder Liste).
- **Kontosperre:** ab 5 Fehlversuchen 30 s · 2^(n−5), höchstens 1 h (HTTP 429). Zurückgesetzt durch eine erfolgreiche Anmeldung (`sicherheit.sitzung_anlegen`) oder im Desk (Konto: „Fehlversuche“/„Anmeldung gesperrt bis“ – Felder sind schreibgeschützt, Zurücksetzen per `bench execute` bzw. Konsole).
- **Sicherheitsmails** (neues Gerät, 2FA, E-Mail-Änderung, Sperre) gehen immer, unabhängig von Benachrichtigungs-Einstellungen (Vorlage `oekoinvest_sicherheit`); Links nur mit `plattform_basis_url`.
- **Aktive Organisation:** Die Website sendet bei jedem Aufruf mit Nutzer `als_organisation`; `kern.nutzer()` prüft die Mitgliedschaft (ohne Mitgliedschaft still kein Kontext).
- **Aufräumjob** (täglich, `sicherheit.aufraeumen`): widerrufene/abgelaufene Sitzungen und abgelaufene Einladungen nach 30 Tagen, Anmeldehistorie nach 180 Tagen.
- **E-Mail ändern / Konto löschen** benennen den Frappe-User um (`User.name` = E-Mail); beim Löschen wird das Konto anonymisiert (`geloescht-<id>@geloescht.invalid`), Passwort entfernt, User deaktiviert.
