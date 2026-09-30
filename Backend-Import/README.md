# Backend-Import – ÖkoInvest-Plattform (Frappe v15)

Dieser Ordner ist das **vollständige Backend-Paket** der ÖkoInvest-Plattform. Er wird auf einen **eigenen
Backend-Server** mit Frappe v15 importiert – getrennt vom Next.js-Frontend (Website + Portal).

| Datei / Ordner | Inhalt |
|---|---|
| `oekoinvest_app/` | Frappe-App (DocTypes, API, Desk, Druck, E-Mail, Berichte, Fixtures, Patches, Übersetzungen, Tests) |
| `dienste/anlagen-daten/` | Ingest-Dienst für Messdaten (MQTT → TimescaleDB), siehe dessen README und `docs/ANLAGEN-IOT.md` |
| `dienste/…` | weitere Dienste anderer Teams (jeweils eigene README) |
| `installieren.sh` | Installation/Update auf einer Bench (idempotent, ohne Geheimnisse) |
| `site_config.beispiel.json` | alle Konfigurationsschlüssel mit Erklärung – Platzhalter, keine Geheimnisse |
| `werkzeuge/pruefen.py` | Konsistenzprüfer (ohne Frappe lauffähig) – vor jeder Auslieferung: **0 Fehler** |
| `werkzeuge/bauen.py` | Druckformate bauen (HTML + CSS → Print-Format-JSON) |
| `werkzeuge/desk_rechte.py` | Desk-Rechte-Matrix (DocPerm) – eine Quelle für alle DocType-JSONs |
| `ANLEITUNG.md` | Einrichtung Schritt für Schritt (API-Benutzer, Konten, Tests, Betrieb) |
| `GO-LIVE.md` | Checkliste für den Livegang |

## Architektur

```
 Browser ──HTTPS──▶  Website-Server (Next.js)                         Backend-Server (Frappe v15)
                     ├─ öffentliche Seiten, Portal /portal/**           ├─ oekoinvest_app (whitelisted Methoden)
                     ├─ /api/** (Sitzung, CSRF, Rate-Limit)  ──HTTPS──▶ ├─ MariaDB, Redis, Worker, Scheduler
                     └─ Sitzungen (SESSION_SECRET)    Server-zu-Server  ├─ Desk /app (Backoffice, 2FA)
                                                      Token-Auth        └─ E-Mail-Versand (Email Queue)
 Datenlogger ──MQTT/TLS──▶ Ingest-Dienst (anlagen-daten) ──HTTPS (Token)──▶ Frappe (nur dienst_*-Methoden)
```

- **Die Website ist der einzige API-Client.** Sie ruft `POST /api/method/oekoinvest_app.plattform.api.*` mit
  `Authorization: token KEY:SECRET` eines technischen Benutzers (nur Rolle `ÖkoInvest API`) auf und übergibt
  `als_benutzer`. Frappe prüft danach Rolle **und** Eigentum selbst (`plattform/kern.py`). Browser sprechen Frappe
  nie direkt an – **CORS ist nicht nötig** und bleibt aus (kein `allow_cors` in `site_config.json`).
- **Desk** (`/app`) ist nur für Mitarbeitende (Desk-Rollen, 2FA Pflicht) und idealerweise nur aus dem Firmennetz/VPN
  erreichbar.
- **Website-Funktionen von Frappe** sind abgeschaltet: Startseite = Login, keine Registrierung, kein Portal-Menü
  (`plattform/einrichtung.py`). Portal-Nutzer melden sich ausschließlich auf der Website an.

### Netzwerk und Firewall (Backend-Server)

| Richtung | Port | Quelle/Ziel | Zweck |
|---|---|---|---|
| eingehend | 443 | **nur** IP des Website-Servers (+ Ingest-Dienst) für `/api/method/oekoinvest_app.*` | Plattform-API |
| eingehend | 443 | Firmennetz/VPN für `/app`, `/login`, `/api/method/*` (Desk), `/assets`, `/files`, `/private/files`, `/socket.io` | Desk |
| eingehend | 22 | Admin-Netz | Wartung (Schlüssel, kein Passwort-Login) |
| ausgehend | 587/465 | Mailserver | E-Mail-Versand (SMTP mit TLS) |
| ausgehend | 443 | Backup-Ziel, ggf. HIBP/Updates | Betrieb |
| intern | 3306, 6379/11000/13000 | nur localhost bzw. privates Netz | MariaDB, Redis |

Beispiel nginx (vor Frappe): Plattform-API nur für den Website-Server, Desk nur aus dem Firmennetz, sonst 404.

```nginx
location ~ ^/api/method/oekoinvest_app\. { allow <IP-Website-Server>; allow <IP-Ingest-Dienst>; deny all; proxy_pass http://frappe-bench-frappe; }
location ~ ^/(app|login|api|assets|files|private/files|socket\.io) { allow <Firmennetz/VPN>; deny all; proxy_pass http://frappe-bench-frappe; }
location / { return 404; }
client_max_body_size 20m;   # Uploads 10 MB als Base64 im JSON ≈ 13,4 MB
```

**Rate-Limits:** Frappes globales `rate_limit` zählt je IP – da alle Plattform-Aufrufe vom Website-Server kommen,
würde es die ganze Plattform drosseln und wird deshalb **nicht** gesetzt. Begrenzt wird auf der Website (je Nutzer/IP,
`src/lib/plattform/server/route.js`) und am Proxy der Website; im Desk begrenzen Login-Sperre
(`allow_consecutive_login_attempts`, `allow_login_after_fail`) und 2FA.

## Rollen und Rechte

| Rolle | Desk | DocPerm | Wer |
|---|---|---|---|
| `ÖkoInvest Admin` | ja, 2FA | Leitung: alles lesen, bearbeiten wo erlaubt, Export | Geschäftsführung/Leitung Backoffice |
| `ÖkoInvest Akquise` | ja, 2FA | Anfragen, Flächen, CRM, Gebiete bearbeiten | Flächenakquise |
| `ÖkoInvest Transaktion` | ja, 2FA | Projekte, Interessen, Deal-Room, CRM bearbeiten | Projektbörse/Deals |
| `ÖkoInvest Buchhaltung` | ja, 2FA | Provisionen bearbeiten, Verträge/Anlagen lesen | Buchhaltung |
| `ÖkoInvest Betrieb` | ja, 2FA | Anlagen, Störungen, Wartung, Zähler bearbeiten | Betriebsführung |
| `ÖkoInvest Compliance` | ja, 2FA | Protokolle, Anmeldungen, Nachweise, KYC lesen | Datenschutz/Compliance |
| `ÖkoInvest Leser` | ja, 2FA | Fachdaten lesen (ohne Sicherheitsprotokolle) | Nur lesen |
| `ÖkoInvest API` | nein | **keine** | technischer Benutzer der Website |
| `ÖkoInvest Anlagen-Dienst` | nein | **keine** | technischer Benutzer des Ingest-Dienstes |
| `Plattform …` (7 Rollen) | nein | **keine** | automatisch aus „Plattform Konto“ |

**Rollenprofile** (`fixtures/role_profile.json`): ÖkoInvest Leitung · Akquise · Transaktion · Buchhaltung · Betrieb ·
Compliance · Nur lesen · API-Benutzer · Anlagen-Dienst. Benutzer bekommen genau **ein** Profil (Frappe setzt die Rollen
dann aus dem Profil – zusätzliche Rollen gehen beim Speichern verloren).

**Desk-Rollen und Portal-Unterrollen** sind getrennte Welten: Wer im Portal-Backoffice arbeitet, braucht ein
„Plattform Konto“ mit Rolle `admin` und Unterrollen (`/portal/admin/rechte`); wer im Desk arbeitet, einen Frappe-System-User
mit Rollenprofil. Nutzen beide dieselbe E-Mail-Adresse, teilen sie sich einen Frappe-User; die Rechte im Portal ergeben
sich trotzdem ausschließlich aus dem Plattform Konto (die Website prüft keine Desk-Rollen). Konten mit `System Manager`
lassen sich nicht über die Website verwenden – Administratoren brauchen für das Portal ein eigenes Konto.

Die DocPerm aller DocTypes stammen aus `werkzeuge/desk_rechte.py`. Neue DocTypes dort eintragen und
`python werkzeuge/desk_rechte.py --anwenden` ausführen (setzt `permissions` und `modified`, sonst übernimmt
`bench migrate` die Änderung nicht). Löschen darf nur `System Manager`; append-only-Protokolle bleiben lesend.

## Desk (Backoffice im Frappe-Desk)

- **Workspaces** (`plattform/workspace/`, Modul Plattform, rollenbasiert): ÖkoInvest Cockpit · Akquise & Flächen ·
  Projektbörse & Deals · Anlagen & Betrieb · ÖkoInvest CRM · Compliance · ÖkoInvest Einstellungen – mit Number Cards,
  Dashboard Charts, Shortcuts und Links auf alle DocTypes/Berichte.
- **Statuswechsel** im Formular über das Menü **„Status“** (Vorgang, Fläche, Projekt, Interesse, Provision):
  `public/js/desk_status.js` → `plattform/desk.py` → derselbe Zustandsautomat wie im Portal
  (`prozesse.pruefe_uebergang` + `ablauf.uebergang_anwenden`: Statusverlauf, Nachricht an den Nutzer, Provision,
  Protokoll, Automationen). Pflichtangaben (Begründung, Pachtangebot, Provisionssatz, Käufer/Kaufpreis) fragt ein Dialog ab.
  Eigentümer-Schritte (Pachtangebot annehmen, Projekt einreichen, NDA, LOI) bleiben dem Portal vorbehalten.
- **Workflows** (`fixtures/workflow*.json`: Vorgang, Flächen-Pipeline, Projekt-Freigabe) sind bewusst **inaktiv** und
  dienen als Prozessdarstellung im Workflow-Builder. Grund: Die Website handelt per `frappe.set_user()` im Namen der
  Portal-Nutzer; ein aktiver Workflow prüft jeden Statuswechsel gegen deren Frappe-Rollen und DocType-Leserechte –
  die es absichtlich nicht gibt. Jeder Portal-Statuswechsel würde scheitern. `pruefen.py` meldet aktive Workflows als Fehler.
- **Berichte** (`plattform/report/`, Script Reports): Pipeline Flächen · Börse-Trichter · Provisionen erwartet/realisiert ·
  Anlagen-Verfügbarkeit (Schätzung aus Störungsfällen) · Offene Störungen · KYC-Übersicht (Platzhalter, nutzt
  `kyc_status(konto)`, sobald das KYC-Modul geliefert ist) · Aktivitäten je Mitarbeiter (nur Leitung).
  Interne Namen sind ASCII (Python-Module), die Anzeige kommt aus `translations/de.csv`.
- **Number Cards / Dashboard Charts** als Fixtures (`is_standard = 0`, Modul Plattform).

## Druck und Briefkopf

Briefkopf „ÖkoInvest“ (Registerdaten FN 541505g, LG Ried im Innkreis, Gewerbegebiet 10, 5121 Ostermiething;
Telefon/E-Mail/Web/UID nur aus `site_config`, sonst nicht gedruckt). Druckformate (Jinja, Markenstil Grün #669933 /
Navy #003473, Manrope/Inter mit Systemschrift-Fallback, keine externen Fonts):

| Druckformat | DocType | Hinweis |
|---|---|---|
| Provisionsvereinbarung | Plattform Projekt | mit Annahme-Protokoll (Zeit, IP, Textfassung); Entwurf zur anwaltlichen Prüfung |
| Vertraulichkeitsvereinbarung NDA | Plattform Interesse | Klick-NDA + Protokollanhang (Zeitstempel, IP, User-Agent, Statusverlauf) |
| Pacht-Vorvertrag Muster | Plattform Flaeche | Absichtserklärung, **Muster zur anwaltlichen Prüfung**, länderspezifisch anpassen |
| Expose vertraulich / Expose Teaser | Plattform Projekt | Teaser ausschließlich über die Positivliste (`oeffentlich.py`) |
| LOI Eingang | Plattform Interesse | Eingangsbestätigung einer Absichtserklärung |
| Ereignisbericht Anlage | Plattform Stoerungsfall | Störungsbericht inkl. Kommentare/Verlauf (intern) |
| Monatsbericht Backoffice | Plattform Monatsbericht (Single) | Kennzahlen mit Vormonatsvergleich, keine personenbezogenen Daten |
| Anlagen-Datenblatt | Plattform Anlage | Komponenten, Messpunkte, Vertrag, Wartung, offene Störungen |
| Vorgangsblatt | Plattform Vorgang | Vorgangsübersicht mit Einwilligungsnachweis (enthält personenbezogene Daten) |

Quelle je Format: `plattform/print_format/<ordner>/<ordner>.html` + gemeinsames `oekoinvest_druck.css`; nach Änderungen
`python werkzeuge/bauen.py` (aktualisiert JSON und `modified`). Jinja-Hilfen: `plattform/druck.py` (in `hooks.jinja`).

## E-Mail

- **Dateivorlagen** der App (`templates/emails/*.html`) erben alle von `oekoinvest_basis.html` (ein Layout).
- **E-Mail-Vorlagen** (`fixtures/email_template.json`, Präfix „ÖkoInvest:“) für alle Ereignisse: neue Anfrage,
  Statuswechsel, NDA angefragt/freigegeben, LOI eingegangen/angenommen, Zuschlag, Projekt zur Prüfung, Störung, Aufgabe
  fällig, Einladung, Passwort, Anmelde-Link, E-Mail bestätigen, KYC-Status, Sicherheitshinweis, Benachrichtigung.
  Versand aus dem Code: `mail.vorlage_senden("ÖkoInvest: …", empfaenger, {…, "pfad": "/portal/…"})`.
- **Notifications** (`fixtures/notification.json`) informieren **nur Desk-Rollen** (neue Anfrage, Fläche eingereicht,
  Projekt zur Prüfung, NDA, LOI, Zuschlag, Provision, Störung ab „mittel“, Aufgabe überfällig, Wartung in 7 Tagen).
  Portal-Nutzer benachrichtigt die App selbst (Glocke + E-Mail je Einstellung).
- Grundsatz: **keine vertraulichen Inhalte** in E-Mails – nur Hinweis, öffentliche Kennungen/Titel und Link.
- Fixtures werden bei jedem `bench migrate` neu eingespielt: Textänderungen im Repository vornehmen, nicht im Desk.

## Einrichtung beim Installieren/Migrieren

`plattform/einrichtung.py` (after_install + after_migrate, idempotent): Sprache de, Zeitzone Europe/Vienna,
Formate dd.mm.yyyy / #.###,##, Sitzungsdauer 8 h, Passwort-Richtlinie (Score ≥ 3), 2FA (OTP-App) für alle Desk-Rollen,
Login-Sperre, Abmelden nach Passwort-Reset, Uploadgröße ≤ 25 MB, Website nur Login, Standard-Briefkopf,
Protokoll-Aufbewahrung (Log Settings). Grundeinstellungen einmalig, Sicherheitswerte bei jedem Migrate
(nur anheben). Überschreibungen: `oekoinvest_system_settings`, `oekoinvest_website_settings`, `oekoinvest_log_tage`.
Kurzbericht: `bench --site <site> execute oekoinvest_app.plattform.einrichtung.pruefen`.

**Löschkonzept** (`plattform/aufbewahrung.py`, täglich): gelesene Benachrichtigungen, KI-/Automationsprotokolle,
Aufrufzähler, Papierkorb der Plattform-DocTypes; Anfragen ohne Konto im Endstatus werden nach Frist anonymisiert.
Fristen in `oekoinvest_loeschfristen` (Tage, 0 = nie). Nicht gelöscht: Aktivitätsprotokoll (Hash-Kette),
Datenraum-Zugriffe, Provisionen/Projekte/Verträge (Aufbewahrungspflichten).

## Optionale Apps (ERPNext, HRMS, Drive, Helpdesk)

Keine harte Abhängigkeit (`required_apps = ["frappe"]`, `pyproject.toml` ohne Abhängigkeiten). Integrationen sind nur
aktiv, wenn die App installiert **und** der Schalter `oekoinvest_<app>` in `site_config` gesetzt ist. Custom Fields
für diese Apps gehören in `plattform/einrichtung.py → OPTIONALE_FELDER` (nicht in Fixtures – ein Fixture auf einen
fehlenden DocType bricht den Import ab).

## Für andere Teams: wo eintragen?

| Was | Wo | Danach |
|---|---|---|
| Rolle | `hooks.ROLLEN_FIXTURES` + `fixtures/role.json` | `pruefen.py` |
| DocPerm neuer DocTypes | `werkzeuge/desk_rechte.py → MATRIX` | `desk_rechte.py --anwenden` |
| Scheduler-Job, after_migrate, doc_events, Jinja-Methode | markierte Listen in `hooks.py` | `pruefen.py` |
| Patch | `patches.txt` (+ `patches/<modul>.py` mit `execute()`) | `pruefen.py` |
| E-Mail-Vorlage / Notification | `fixtures/email_template.json` / `fixtures/notification.json` (Präfix „ÖkoInvest:“) | `pruefen.py` |
| Workspace-Link | passende Karte in `plattform/workspace/<ws>/<ws>.json` (+ `link_count`) | `pruefen.py` |
| Übersetzung | `translations/de.csv` | `pruefen.py` meldet fehlende Begriffe |

Prüfen (ohne Bench): `python Backend-Import/werkzeuge/pruefen.py` – Jinja-Syntax vollständig, wenn `jinja2`
importierbar ist (`pip install --target <ordner> jinja2` und `PYTHONPATH=<ordner>`).
