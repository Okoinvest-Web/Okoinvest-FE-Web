# Go-live-Checkliste – ÖkoInvest-Plattform

Reihenfolge von oben nach unten. Jede Zeile abhaken und mit Datum/Kürzel versehen. Einrichtung im Detail:
`ANLEITUNG.md`, Überblick/Architektur: `README.md`, Konfiguration: `site_config.beispiel.json`.

> Grundsatz: erst **Staging** (eigene Site/Server, Testdaten) vollständig durchlaufen, dann Produktion.
> Keine Geheimnisse in Repository, Tickets oder Chat – nur im Passwortmanager bzw. in der Server-Umgebung.

## 0. Paket prüfen (vor jeder Auslieferung)

- [ ] `python Backend-Import/werkzeuge/pruefen.py` → **0 Fehler, 0 Warnungen** (prüft u. a. Rechte-Matrix `rechte.py` = `src/lib/plattform/rechte.js`,
      Guards der ERPNext-Hooks, Vollständigkeit von `site_config.beispiel.json`)
- [ ] Kern-Tests ohne Bench: `cd Backend-Import/oekoinvest_app && python -m unittest discover -s oekoinvest_app/plattform/tests -p "test_*_kern.py" -t .`
- [ ] `python Backend-Import/werkzeuge/bauen.py` → „0 Druckformat(e) aktualisiert“ (sonst Änderungen committen)
- [ ] `python Backend-Import/werkzeuge/desk_rechte.py` → „0 DocType(s) abweichend“
- [ ] Texte juristisch freigegeben: Klick-NDA (`src/lib/plattform/konstanten.js` = `plattform/druck.py`), Provisionsvereinbarung,
      Pacht-Vorvertrag (Muster), E-Mail-Vorlagen, Nutzungsbedingungen/Datenschutzerklärung der Website

## 1. Server

- [ ] Eigener Server für Frappe (getrennt vom Next.js-Frontend), Ubuntu LTS/Debian stable, mind. 4 vCPU / 8 GB RAM / 80 GB SSD
- [ ] Automatische Sicherheitsupdates, Zeitsynchronisation (chrony), Zeitzone des Systems UTC (Frappe: Europe/Vienna)
- [ ] SSH nur mit Schlüssel, root-Login aus, fail2ban; Firewall nach `README.md` („Netzwerk und Firewall“)
- [ ] Frappe-Bench v15 (Python ≥ 3.10, Node 18/20, MariaDB 10.6+, Redis) als eigener Benutzer `frappe`
- [ ] Produktions-Setup: `sudo bench setup production frappe` (nginx + supervisor/systemd), Worker: default, short, long
- [ ] Nur benötigte Apps installiert; optionale Apps (ERPNext/HRMS/Drive/Helpdesk) bewusst entscheiden

## 2. Domains und TLS

- [ ] DNS: `backend.<domain>` → Backend-Server; Website-Domain → Frontend
- [ ] TLS-Zertifikat (Let's Encrypt, `sudo bench setup lets-encrypt <site>`), automatische Erneuerung getestet
- [ ] HSTS am Proxy; nur TLS 1.2/1.3
- [ ] nginx: Plattform-API nur für die IP des Website-Servers (+ Ingest-Dienst), Desk nur aus Firmennetz/VPN, `client_max_body_size 20m`
- [ ] `host_name` in `site_config` = `https://backend.<domain>`

## 3. Installation

- [ ] Site anlegen: `bench new-site <site> --admin-password …` (Administrator-Passwort im Passwortmanager)
- [ ] `SITE=… BASIS_URL=… HOST_NAME=… API_EMAIL=… ANLAGEN_EMAIL=… ADMIN_EMAIL=… bash Backend-Import/installieren.sh`
- [ ] Ausgabe „Kurzbericht“ prüfen: Einrichtung-Version 1, Sprache de, Zeitzone Europe/Vienna, 2FA 1, keine Desk-Rollen ohne 2FA
- [ ] `encryption_key` aus `sites/<site>/site_config.json` getrennt sichern (ohne ihn sind TOTP-Geheimnisse und Passwort-Felder verloren)
- [ ] `developer_mode` 0, `allow_tests` false (Produktion)
- [ ] **Einmalig** nach der Installation: Spotpreis-Historie der Energiebeschaffung laden (Day-Ahead DE-LU/AT, rund 400 Tage,
      Energy-Charts, CC BY 4.0; ausgehendes HTTPS zu `api.energy-charts.info` nötig, dauert einige Minuten):
      `bench --site <site> execute oekoinvest_app.plattform.energie_quellen.historie_laden`
      (optional `--kwargs "{'tage': 400}"`). Danach übernimmt der tägliche Job `spot_taeglich`; Kontrolle: Desk → „Plattform Marktpreis Spot“
      enthält Werte beider Zonen. Nicht wiederholt ausführen (lädt alles erneut); `oekoinvest_spot_abruf: 0` schaltet den Abruf ab.

## 3a. Geheimnisse, Dienste und Sonderfälle

Alle Geheimnisse nur per `bench --site <site> set-config <schluessel> <wert>` setzen (landet in `sites/<site>/site_config.json`,
nicht im Repository), zusätzlich im Passwortmanager ablegen. `site_config.beispiel.json` enthält nur Platzhalter (`null`).

- [ ] **`oekoinvest_sperrliste_pfeffer`** (geheim, Pflicht vor der ersten Akquise-Kampagne): `openssl rand -hex 32`.
      Die Werbe-Sperrliste (Widersprüche nach Art. 21 DSGVO) speichert nur Hashes mit diesem Pfeffer – **den Wert nie ändern**,
      sonst greifen gespeicherte Widersprüche nicht mehr und Widersprechende würden erneut angeschrieben. Ohne Wert gilt ein Demo-Pfeffer.
      Nach Serververlust denselben Wert aus dem Passwortmanager wieder setzen.
- [ ] **`oekoinvest_kyc_schluessel`** (geheim): Schlüssel der verschlüsselten KYC-Ablage (64 Hex-Zeichen, z. B. `openssl rand -hex 32`),
      getrennt vom Backup sichern, nie ändern (sonst sind abgelegte Unterlagen nicht mehr lesbar). `oekoinvest_kyc_gating` = `alle`.
- [ ] **CAD-Konverter** (Planungsdateien DWG → DXF, `dienste/cad-konverter`): Dienst nur im internen Netz betreiben;
      `cad_konverter_url` (z. B. `http://cad-konverter:8080`) und `cad_konverter_token` (≥ 32 Zeichen, `openssl rand -hex 32`, gleicher Wert
      wie `KONVERTER_TOKEN` des Dienstes) setzen. Ohne beide Werte zeigt das Portal „Vorschau nach Konvertierung“.
- [ ] **LibreDWG-Prüfsumme** vor dem ersten Build: Tarball `libredwg-<version>.tar.xz` samt `.sig` von `https://ftp.gnu.org/gnu/libredwg/`
      laden, GPG-Signatur gegen den Schlüssel der GNU-Maintainer prüfen (`gpg --verify libredwg-<version>.tar.xz.sig`), dann
      `sha256sum` bilden und als `LIBREDWG_SHA256` beim Build übergeben (`LIBREDWG_SHA256=<sha256> docker compose up -d --build`).
      Ohne Wert warnt der Build nur – in Produktion nicht zulässig. ODA File Converter nur nach Lizenzprüfung.
- [ ] **Identitäts-Webhook** (Online-Identifizierung, einzige `allow_guest`-Ausnahme der App):
      `POST https://backend.<domain>/api/method/oekoinvest_app.plattform.api.dienste.webhook_identitaet?anbieter=<anbieter>`.
      Der Endpunkt prüft die **HMAC-SHA256-Signatur** über den Roh-Body zeitkonstant (Geheimnis `oekoinvest_ident_webhook_secret`,
      ≥ 16 Zeichen, beim Anbieter hinterlegen), antwortet bei falscher Signatur ohne Details mit 401, ist ratenbegrenzt
      (120/min je IP) und idempotent (Ereignis-ID), begrenzt den Body auf 256 KB und ändert **nie** den KYC-Status (Ergebnis nur als
      Hinweis am KYC-Fall; die Entscheidung trifft Compliance). nginx: nur diesen Pfad öffentlich (bzw. für die IP-Bereiche des Anbieters)
      freigeben, die übrige Plattform-API weiter nur für den Website-Server. `werkzeuge/pruefen.py` lässt `allow_guest` ausschließlich hier zu
      (mit `@rate_limit` und Signaturprüfung). Weitere Werte: `oekoinvest_ident_anbieter`, `_api_url`, `_api_key`, `_api_secret`, `_stufe`.
- [ ] Register/Bonität: Zefix-Zugang (CH), Vermittler für Firmenbuch/Handelsregister, Bonitätsanbieter – Zugangsdaten nur per `set-config`;
      `oekoinvest_dienste_demo` in Produktion `false`.
- [ ] Flächen ohne Eigentümerkonto (Akquise-Übernahme aus den Geodaten) sind vorgesehen: Ansichten, Druck und Nachrichten vertragen sie;
      Pachtverträge lassen sich erst anlegen, wenn der Eigentümer registriert und der Fläche zugeordnet ist.

## 4. Backups und Restore-Test

- [ ] Tägliche Backups mit Dateien: `bench --site <site> backup --with-files` (Cron/`bench setup backups`), Aufbewahrung festlegen
- [ ] Verschlüsselt außer Haus kopieren (z. B. restic/borg auf S3-kompatiblen Speicher), Zugangsdaten nicht auf dem Server im Klartext
- [ ] **Restore-Test** auf einer separaten Site: `bench --site restore-test restore <sql.gz> --with-public-files … --with-private-files …`,
      danach Stichproben (Konto, Projekt mit Datenraum-Datei, Aktivitätsprotokoll: Hash-Kette prüfen im Portal „Revisionsprotokoll“)
- [ ] Wiederanlaufzeit dokumentiert (RTO/RPO)
- [ ] Ingest-Dienst: Backup der TimescaleDB separat (siehe `dienste/anlagen-daten/README.md`)

## 5. E-Mail

- [ ] Absenderdomain festlegen (Kontaktadresse ist noch **nicht freigegeben** – Entscheidung einholen)
- [ ] Ausgehendes E-Mail-Konto im Desk (Email Account, „Default Outgoing“, SMTP mit TLS), Testmail
- [ ] **SPF**, **DKIM** (Selektor des Mailanbieters), **DMARC** (zunächst `p=quarantine`, Berichte auswerten)
- [ ] Rücklauf/Bounces: Postfach überwacht; Email Queue ohne Fehler (`Email Queue`-Liste im Desk)
- [ ] Testversand jeder Vorlage (Bestätigung, Passwort, Anmelde-Link, Benachrichtigung, Sicherheitshinweis) – Links zeigen auf `plattform_basis_url`

## 6. Scheduler und Worker

- [ ] `bench --site <site> enable-scheduler`; `bench doctor` ohne Fehler
- [ ] Geplante Jobs aktiv (Desk → Scheduled Job Type): Tokens, Wiedervorlagen, Fristen, Sicherheit aufräumen, Aufbewahrung (täglich),
      Bieter-Erinnerungen (stündlich)
- [ ] Nach einem Tag: Scheduled Job Log ohne Fehler

## 7. Monitoring

- [ ] Erreichbarkeit (HTTPS-Check auf `/api/method/ping`) und Zertifikatsablauf überwacht
- [ ] Error Log (Titel „ÖkoInvest: …“) täglich bzw. per Alarm; Worker/Redis/MariaDB-Prozesse überwacht
- [ ] Plattenplatz, Backup-Erfolg, E-Mail-Warteschlange (Fehlversuche) überwacht
- [ ] Ingest-Dienst: Health-Endpunkt, Broker, Datenbank (siehe Dienst-README)

## 8. Benutzer, Rollen, 2FA

- [ ] Rollenprofile vorhanden (ÖkoInvest Leitung, Akquise, Transaktion, Buchhaltung, Betrieb, Compliance, Projektleitung, Energie, Nur lesen, API-Benutzer, Anlagen-Dienst)
- [ ] Workspaces je Rollenprofil sichtbar: Cockpit, Akquise & Flächen (inkl. Geodaten, Kampagnen, Gemeinde-Screening), Projektbörse & Deals,
      Projektentwicklung (inkl. Planung & Kosten), Grundbuch & Closing, Energiebeschaffung, Finanzen & Finanzierung, Service & Team, CRM, Compliance (KYC)
- [ ] Desk-Benutzer je Person mit genau einem Rollenprofil (`installation.desk_benutzer_anlegen`), keine Sammelkonten
- [ ] 2FA: System Settings „Enable Two Factor Auth“ an, Methode OTP-App; jeder Desk-Benutzer hat die Einrichtung abgeschlossen
- [ ] `System Manager` nur für 1–2 benannte Administratoren; Administrator-Konto nicht für die Tagesarbeit
- [ ] API-Benutzer der Website: Website User, **nur** Profil „ÖkoInvest API-Benutzer“; Schlüssel erzeugt, nur in der Website-Umgebung (`API_KEY`/`API_SECRET`)
- [ ] Anlagen-Dienst-Benutzer: nur Profil „ÖkoInvest Anlagen-Dienst“; Schlüssel nur in der Umgebung des Dienstes
- [ ] Prüfung: `curl …/api/resource/Plattform%20Projekt` mit API-Schlüssel → **403**; ohne Schlüssel `…/api/method/oekoinvest_app.plattform.api.boerse.liste` → **403**
- [ ] Erstes Portal-Backoffice-Konto (`installation.admin_konto_anlegen`), Unterrollen im Portal unter `/portal/admin/rechte`, Pflicht-2FA `plattform_2fa_pflicht=admin`
- [ ] Schlüsselrotation geplant (API-Schlüssel, `SESSION_SECRET` der Website)

## 9. Rechtstexte und Datenschutz

- [ ] Impressum, Datenschutzerklärung (Portal, Protokollierung von IP bei NDA/Einwilligung, Datenraum, KI-Assistent, Monitoring), Nutzungsbedingungen (Portal, Projektbörse, Provision)
- [ ] Verzeichnis der Verarbeitungstätigkeiten ergänzt (Portal, CRM, Datenraum, Anlagen-Monitoring, KYC)
- [ ] **AV-Verträge**: Hosting Backend, Hosting Website, Mailanbieter, Backup-Speicher, ggf. Anthropic (KI, nur Website), Monitoring, KYC-Dienstleister
- [ ] **Löschkonzept** beschlossen und in `oekoinvest_loeschfristen` / `oekoinvest_log_tage` eingetragen; Archivierungskonzept für das Aktivitätsprotokoll
- [ ] Datenschutz-Folgenabschätzung geprüft (KYC, Monitoring), Betriebsrat/Mitarbeitende zu „Aktivitäten je Mitarbeiter“ informiert
- [ ] TOMs dokumentiert (Zugriff, 2FA, Verschlüsselung, Backups, Protokolle)

## 10. KYC-Prozess

- [ ] KYC/KYB-Modul des KYC-Teams installiert; `kyc_status(konto)` liefert Status (Bericht „KYC-Übersicht“ zeigt dann echte Werte)
- [ ] Freigaberegeln aktiv: Datenraum, LOI/Zuschlag, Auszahlungen nur mit gültigem KYC-Status
- [ ] Sanktions-/PEP-Prüfung, wirtschaftlich Berechtigte, Firmenbuch/Handelsregister: Verfahren und Verantwortliche festgelegt
- [ ] Aufbewahrungsfristen für KYC-Nachweise (GwG/FM-GwG) im Löschkonzept

## 11. Test-Durchlauf je Prozess (Staging, dann Produktion mit Testkonten)

- [ ] Anfrage über jedes Formular → Vorgang im Desk + Notification „Neue Anfrage“ an Akquise
- [ ] Registrierung → Bestätigungs-Mail → Login → frühere Anfrage zugeordnet
- [ ] Fläche anlegen/einreichen → Desk „Status“: Vorprüfung → Standortanalyse → Pachtangebot (Dialog) → Portal: annehmen → Druck „Pacht-Vorvertrag Muster“
- [ ] Projekt anlegen, Provisionsvereinbarung akzeptieren, einreichen → Notification an Transaktion → veröffentlichen (Satz 1,5–3 %) → Druck „Provisionsvereinbarung“, „Expose Teaser“
- [ ] Investor: Klick-NDA → Datenraum freigeben → Download → LOI → annehmen → Verkauf → Provision entsteht → Druck „Vertraulichkeitsvereinbarung NDA“, „LOI Eingang“
- [ ] Bieterverfahren mit zwei Testbietern bis Zuschlag
- [ ] Anlage anlegen, Gerät verbinden, Testnachricht, Störung erzeugen → Notification an Betrieb → quittieren → beheben → Druck „Ereignisbericht Anlage“, „Anlagen-Datenblatt“
- [ ] Passwort vergessen, Anmelde-Link, 2FA einrichten, Kontosperre, Einladung in Organisation
- [ ] Berichte und Workspaces je Rollenprofil ansehen (Akquise sieht keine Provisionen, Leser keine Sicherheitsprotokolle)
- [ ] Monatsbericht drucken (Plattform Monatsbericht → Monat → Drucken)
- [ ] Aufbewahrungsjob einmal manuell: `bench --site <site> execute oekoinvest_app.plattform.aufbewahrung.taeglich`
- [ ] Optional: `node scripts/plattform-test.mjs` gegen die **Staging**-Website mit `PLATTFORM_BACKEND=frappe`

## 12. Umschalten der Website auf Frappe

- [ ] Website-Umgebung (Produktion): `PLATTFORM_BACKEND=frappe`, `SERVER=https://backend.<domain>`, `API_KEY`, `API_SECRET`,
      `PLATTFORM_BASIS_URL` (= `plattform_basis_url`), `SESSION_SECRET` (≥ 32 Zeichen), optional `ANLAGEN_DATEN_URL`/`ANLAGEN_DATEN_TOKEN`
- [ ] `PLATTFORM_DEMO` **nicht** gesetzt; Demo-Daten (`.data/`) nicht auf dem Produktionsserver
- [ ] Website neu deployen; Stichprobe: Börse zeigt echte (keine „Vorführdaten“), Login mit echtem Konto, Anfrage kommt im Desk an
- [ ] Rückfallplan: vorheriges Deployment bereithalten; bei Fehlern Website auf Wartungsseite, **nicht** auf das Demo-Backend

## 13. Nach dem Livegang (erste Woche)

- [ ] Error Log, Email Queue, Scheduled Job Log täglich prüfen
- [ ] Erstes Produktions-Backup wiederhergestellt (Restore-Test wiederholen)
- [ ] Hash-Kette im Portal-Backoffice „Revisionsprotokoll“ geprüft
- [ ] Rückmeldungen der Mitarbeitenden zu Workspaces/Druckformaten gesammelt
