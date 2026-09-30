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

## 10a. ID Austria / Online-Ausweis aktivieren

Technik und Schnittstelle: `docs/EID.md`. Ohne Konfiguration bleibt die eID in Produktion ausgeblendet (Test-Sites: Simulator, als DEMO gekennzeichnet). Rücksprung-URL für beide Verfahren: `https://<Website>/api/dienste/eid/rueckkehr` (exakt so registrieren). Stand der Recherche: 30.09.2026 – mit „zu bestätigen“ markierte Punkte vor dem Antrag mit der jeweiligen Stelle klären.

**Gemeinsam**
- [ ] Pfeffer für den bPK-/Pseudonym-Hash setzen: `bench --site <site> set-config oekoinvest_eid_bpk_pepper "<zufällig, ≥ 32 Zeichen>"` (nie ändern, sonst greift der Dubletten-Hinweis nicht mehr)
- [ ] Datenschutz: Verarbeitungsverzeichnis/Datenschutzerklärung um eID ergänzen (Zweck GwG/FM-GwG-Identifizierung, Minimaldaten: Name, Geburtsdatum, Vertrauensniveau, Zeitpunkt, Transaktions-ID; bPK nur gehasht); Löschfrist wie KYC-Nachweise
- [ ] Compliance entscheidet über die Regel „eID mit hohem Vertrauensniveau = Identität bestätigt“ (Portal → eID-Einstellungen, Standard aus) und ob eID für alle Risikostufen zulässig ist (KYC-Einstellung „methoden“). Rechtlich zu bestätigen: Anerkennung der eID-Identifizierung nach FM-GwG (AT) bzw. § 12 Abs. 1 Nr. 2 GwG (DE)

**ID Austria (Österreich, OpenID Connect)**
- [ ] Zugang: Die ÖkoInvest GmbH meldet sich im **Unternehmensserviceportal (USP)** an und vergibt einer Person (bzw. dem technischen Dienstleister) das Verfahrensrecht für die **ID Austria Service-Provider-Registrierung (IDA-SPR)** – Quellen: [Service Provider werden](https://www.id-austria.gv.at/de/unternehmen-service-provider/service-provider-werden), [USP: Registrierung als IDA-SP](https://www.usp.gv.at/hilfe-und-support/verfahrensrechte/registrierung-als-ida-sp.html)
- [ ] In der IDA-SPR: Service Owner (ÖkoInvest GmbH) anlegen, dann den Service Provider (Anwendung) mit Protokoll **OpenID Connect**, Redirect-URI (siehe oben) und Attributen **Vorname, Familienname, Geburtsdatum** registrieren; bPK und Vertrauensniveau werden immer geliefert – Quelle: [Personenmerkmale](https://www.id-austria.gv.at/de/developer/registrieren/personenmerkmale), [bPK](https://www.id-austria.gv.at/de/developer/registrieren/personenmerkmale/bPK). Für private Service Provider ist für ausgewählte Attribute eine Akkreditierung nötig (welche genau: zu bestätigen); bPK für private Anbieter ist ein wirtschaftsbereichsspezifisches bPK (Bereich aus der Firmenbuchnummer, FN 541505g – zu bestätigen)
- [ ] Zuerst **Referenzumgebung**: Registrierung wird dort automatisch (stündlich) akkreditiert – Quelle: [Für private SPs](https://www.id-austria.gv.at/de/developer/registrieren/private-sps). Testidentitäten über den Test Identity Manager. Konfiguration:
  `bench --site <site> set-config oekoinvest_eid_at_umgebung referenz`, `… oekoinvest_eid_at_client_id "<Client-ID = URL der Anwendung>"`, `… oekoinvest_eid_at_client_secret "<Secret>"`
- [ ] **Produktion**: Neuregistrierung erfordert eine Akkreditierung (technische und organisatorische Prüfung); Änderungen an akkreditierten Daten können eine Neuakkreditierung auslösen, ein ausgestellter SP kann nicht geändert werden (ggf. neu beantragen). Danach `oekoinvest_eid_at_umgebung produktion` und die Produktions-Zugangsdaten setzen
- [ ] Technik laut [Anbindung mit OpenID Connect](https://www.id-austria.gv.at/de/developer/anbinden/anbindung-mit-openid-connect): nur Authorization-Code-Flow, `client_secret` Pflicht (auch mit PKCE), Token-Endpunkt-Authentifizierung `client_secret_post`, PKCE S256, Scopes `openid profile`; `sub` ist transient → Personenbezug über bPK. Endpunkte sind hinterlegt: Produktion `https://idp.id-austria.gv.at` (…/auth/idp/profile/oidc/authorize | token | keyset), Referenz `https://idp.ref.id-austria.gv.at`. ID-Token nicht verschlüsseln lassen (JWE wird nicht unterstützt)
- [ ] Vertrauensniveau: Claim `urn:pvpgvat:oidc.eid_citizen_qaa_eidas_level` (eIDAS-URI, z. B. `http://eidas.europa.eu/LoA/high`) – Wertformat in der Referenzumgebung bestätigen; Minimum `oekoinvest_eid_at_loa_min` (Standard `hoch`)
- [ ] Kosten: auf den offiziellen Seiten keine Entgelte für die Anbindung gefunden – zu bestätigen
- [ ] Betrieb: Verteiler „ID Austria Betrieb“ abonnieren (Ankündigungen zu Änderungen an Endpunkten/Schlüsseln)

**Online-Ausweis (Deutschland: Personalausweis, eAT, EU-eID-Karte)**
- [ ] **Berechtigung** nach § 21 PAuswG bei der **Vergabestelle für Berechtigungszertifikate (VfB) im Bundesverwaltungsamt** beantragen (online über das Bundesportal, schriftlich oder persönlich). Voraussetzungen: Nachweis der Identität des Diensteanbieters, Darlegung des Zwecks und der je Datenfeld erforderlichen Daten (Vorname, Familienname, Geburtsdatum, dienste- und kartenspezifisches Kennzeichen/Pseudonym; ggf. Anschrift), Zusicherung des Datenschutzes, keine Anhaltspunkte für Missbrauch. Gebühren nach Recherche: **102 € Erteilung**, 80 € Ablehnung, 115 € Rücknahme/Widerruf; Gültigkeit **höchstens 3 Jahre** (Stand und Beträge zu bestätigen) – Quellen: [BVA – Vergabestelle](https://www.bva.bund.de/DE/Das-BVA/Aufgaben/P/Personalausweis/PA_VfB/PA_Vergabestelle_node.html), [Personalausweisportal – Diensteanbieter werden](https://www.personalausweisportal.de/Webs/PA/DE/verwaltung/diensteanbieter-werden/diensteanbieter-werden-node.html), [Berechtigungszertifikate](https://www.personalausweisportal.de/Webs/PA/DE/wirtschaft/technik/berechtigungszertifikate/berechtigungszertifikate-node.html). Hinweis: ÖkoInvest ist eine österreichische Gesellschaft – ob die Berechtigung für einen Sitz außerhalb Deutschlands erteilt wird bzw. welche Unterlagen dann nötig sind, bei der VfB klären (zu bestätigen)
- [ ] **eID-Service** (eID-Server als Dienst nach BSI TR-03130, zertifiziert) beauftragen, z. B. Governikus (Autent/ID Panstar), D-Trust/Bundesdruckerei (AusweisIDent, OIDC) oder andere; Anforderung: **OpenID-Connect-Schnittstelle** (Authorization-Code-Flow mit PKCE, signiertes ID-Token). Das **Berechtigungszertifikat** (CV-Zertifikat) stellt ein Berechtigungs-CA-Anbieter aus; beim eID-Service-Modell übernimmt das in der Regel der Dienstleister (zu bestätigen). Kosten: Angebot des Dienstleisters (Grundgebühr/Transaktion – nicht öffentlich)
- [ ] Vom Dienstleister erfragen und setzen: Aussteller-URL (`oekoinvest_eid_de_issuer`, Discovery unter `/.well-known/openid-configuration`, sonst `_auth_url`/`_token_url`/`_jwks_url`), Client-ID/-Secret, **Claim-Namen** für Vorname, Familienname, Geburtsdatum, Pseudonym (Restricted ID) und Vertrauensniveau (`oekoinvest_eid_de_claim_*`). Liefert der Dienst kein Niveau, darf `oekoinvest_eid_de_loa_standard hoch` nur gesetzt werden, wenn vertraglich nur hoheitliche eID-Karten (Niveau hoch) zugelassen sind – zu bestätigen
- [ ] Nutzerseite: AusweisApp (Bund) am Smartphone/PC, 6-stellige PIN; der eID-Service ruft die AusweisApp über die eID-Client-URL nach BSI TR-03124-1 auf. Nur bei direkter eID-Server-Anbindung ohne OIDC wäre ein eigener tcToken-Ablauf nötig (nicht umgesetzt; Helfer `eid_client_url()` vorhanden)

**Abnahme**
- [ ] Je Verfahren ein echter Durchlauf in der Referenz-/Testumgebung: Nachweis im Portal, Hinweis im KYC-Fall (Quelle „eID …“, ohne DEMO), Vertrauensniveau korrekt, Abweichung bei fremdem Namen erkannt, Wiederholung des Rücksprung-Links abgewiesen
- [ ] `oekoinvest_eid_demo` und `developer_mode` in Produktion NICHT gesetzt (sonst Simulator)

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
