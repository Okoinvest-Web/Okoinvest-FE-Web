# Ausbaustufe 5 – Führende Plattform DACH (Auftrag vom 30.09.2026, Zeitrahmen 20 h)

Rechner: 7,6 GB RAM → Arbeit in Wellen. Stand wird hier gepflegt, damit nach Unterbrechungen weitergearbeitet werden kann.

## Laufend (Stufe 4)
- [x] Go-live-Paket Backend (Backend-Import komplett: Desk, Rollen, Druckformate, Notifications, Workflows, Reports, Installation, GO-LIVE.md)
- [x] KYC/KYB (manuelle Prüfung, Verschlüsselung, Sanktionsabgleich, Gating) – Testlauf zentral wiederholen
- [x] Projektentwicklung (Entwicklungsakte, Gantt, Risiken, Portfolio, Gutachter-Rolle)
- [x] ERPNext-Finanzen (Pacht, Contracting, Provisionsrechnung, Assets, Controlling)
- [x] Dokumente/Signatur/Termine/Helpdesk/HR
- [x] Fachprüfung A (Fläche, Landwirt, Dach, Kommune) – eigene Rolle `kommune` + Menüpunkt /portal/kommune erledigt (B1)
- [x] Fachprüfung B (Investor, Anbieter, Unternehmen, Mitglied) + Anlagen-Eigentum ÖkoInvest/SPV, Kundensicht „Mein Solarstrom“

## Welle A (sofort, überwiegend Backend – wenig Dev-Server)
- [x] **A1 Geodaten & Akquise-Engine** – Österreich zuerst: Kataster (BEV DKM, OGD), INVEKOS-Schläge (AMA, OGD), Umspannwerke/Trafos (OpenStreetMap power=substation/transformer, ODbL; ggf. Netzbetreiber-Kapazitätskarten), Geländeneigung (DGM, OGD), Schutzgebiete (Natura 2000/Nationalparks/Landschaftsschutz), Siedlungsabstand; PostGIS-Pipeline in `Backend-Import/dienste/geodaten`; Flächen-Scoring + Leitungslänge/Netzanschlusskosten zum nächsten Umspannwerk; Akquise-Cockpit mit Karte (basemap.at, Leaflet) im Backoffice; später DE/CH.
- [x] **A2 Firmen-, Bonitäts- & Identitätsdienste** – Adapter: Identitätsprüfung (IDnow/Veriff/Sumsub, Webhooks) + automatische MRZ-Prüfung (ICAO 9303) als Vorprüfung; Bonität (KSV1870, Creditreform, CRIF); Firmenbuch AT (über Verrechnungsstelle), Handelsregister DE, Zefix CH (öffentliche API); Anbindung an KYC-Fall. SPV-/GmbH-Gründungsassistent AT/DE/CH (Dokumente, Notartermin, Firmenbuch-/Handelsregister-Anmeldung, Transparenz-/WiEReG-Meldung, UID/Steuernummer, Bankkonto) – Notariate haben keine offene API: Workflow + Dokumentenpaket + Terminbuchung.

- [x] **A3 Energiebeschaffung & Versorger-Ausschreibung** – Backoffice-Handelsdesk: Spot (EPEX via Energy-Charts) und Terminmarkt (EEX Cal/Q/M – Lizenzfrage, manuelle/lizenzierte Einspielung), Beschaffungsstrategien (Tranchen, Hedge-Quote, Spot-Anteil), Lastgang-Analysen je Kunde, **Ausschreibung/Bieterwettbewerb unter Energieversorgern** (neue Rolle Lieferant/Energieversorger mit eigenem Portal; anonymisierte Lastgänge, Preisblatt, Frist, mehrere Runden, Vergleich, Zuschlag, Vertrag; Versand an Versorger ohne Portal per E-Mail mit Angebotslink), **laufende Wechselanalyse** je Kunde (Vertrag vs. Marktpreis-Forward, Kündigungsfristen-Alarm, Empfehlung), Pool-Bündelung mehrerer Kunden (Reststrom-Pool)

- [x] **A1b Akquise DE/CH + Kampagnen + Gemeinde-Screening** – DE-Scoring (EEG-Kulisse, § 35 BauGB, Moor), CH-Adapter, Demo Unterallgäu, Kampagnen (Grundbuch-Aufgaben, Serienbrief-PDF, Angebotsseite /angebot/[code], Nachfassen, Sperrliste), Gemeinde-Screening; Test `plattform-test-akquise2.mjs` 115 grün. Offen: Datenschutzerklärung (Flächenakquise per Brief/Angebotsseite), `SPERRLISTE_PFEFFER`, robots/Sitemap-Ausschluss /angebot, Bench-Tests `test_akquise_kampagne.py`

## Welle B (nach Stufe 4)
- [x] **B0 Eigenbetrieb & Bankfinanzierung** (zusammen mit B2) – Geschäftsmodelle je Projekt: Build-to-Sell (ÖKOVOLT baut für Investor, EPC-Übergabe), Eigenbetrieb durch ÖkoInvest/SPV mit **Bankfinanzierung** (Finanzierungsanfrage an mehrere Banken, Bankenpaket mit Financial Model/Ertragsgutachten/Verträgen, Term-Sheet-Vergleich, DSCR/LLCR-Covenants, Auszahlungsvoraussetzungen, Covenant-Monitoring im Betrieb aus Anlagen-Messdaten), reine Verpachtung
- [x] **B0b Dach-Contracting mit Dienstbarkeit** – Dachnutzungs-/Servitutsvertrag (AT Servitut, DE beschränkte persönliche Dienstbarkeit, CH Dienstbarkeit), Grundbuch-Eintragungsablauf (Vertrag, Beglaubigung/Notar, Grundbuchsgesuch, Rang, Rangrücktritt Bank, Eintragungsbestätigung), Fristen, Verknüpfung mit Contracting-Vertrag und Anlage
- [x] **B1 Onboarding-Assistenten je Rolle und Unterrolle** (+ eigene Rolle `kommune` mit Menü /portal/kommune) (Investor je Typ, Anbieter/Verkäufer Projekt & Bestandsanlage, Flächen-/Dach-Eigentümer, Landwirt, Contracting-Kunde, Reststrom-Kunde, Kommune, Gutachter, Backoffice je Unterrolle)
- [x] **B2 Investor-Finanzierungscockpit** – ROI je Projekt nach Login, Finanzierungsvergleich (Eigenkapital, Annuitätenkredit, Förderkredit KfW/aws/OeKB, Leasing, Mietkauf), Förder-Check je Land (EEG/EAG/Einmalvergütung/Investitionszuschüsse), Steuern (AfA), Szenarien speichern, PDF
- [x] **B3 Planungsdateien & Projektkosten** – DWG/DXF-Upload mit Vorschau (DXF im Browser, DWG → Konvertierungsdienst), Projektkostenkalkulation nach Gewerken inkl. Netzanschluss aus Akquise-Distanz, Anbindung Projektentwicklung/ERPNext
- [x] **B4 Deal-Abschluss end-to-end** – Kaufvertrag-Vorlagen (SPA Asset/Share Deal), Signatur, Notartermin, Closing-Checkliste, Kaufpreiszahlung/Treuhand-Hinweis, automatische Provisionsrechnung, Übergabe

## Nacharbeiten aus Berichten (in der Integrationsphase erledigen)
- [x] Bottom-Navigation mobil: Einträge für Gutachter, Kommune, Lieferant, Bank
- [ ] `notFound()` im Portal liefert wegen `portal/loading.js` HTTP 200 statt 404 – prüfen, ob `loading.js` auf Unterbereiche beschränkt werden kann (Inhalt ist korrekt, Status nicht) – bewusst offen: sauber nur über Route-Groups (~30 Bereiche) oder Ladeanzeige per useLinkStatus in PortalRahmen und danach loading.js entfernen; kein SEO-/Sicherheitsrisiko (Portal noindex, APIs 403/404)
- [x] Zentral: `plattform-test-bedienung.mjs` nach Onboarding-Umbau mitlaufen lassen
- [x] Co-Development-Freigabe (Projektentwicklung) mit `kycFreigabe` absichern
- [x] Desk-Workspace-Kacheln + Role Profile „ÖkoInvest Projektleitung“, KYC- und Entwicklungs-DocTypes in Rechte-Matrix/Workspaces prüfen (`pruefen.py`)
- [x] Projektdatenblatt ins Exposé-PDF; Hinweise auf /investoren und /projektboerse/anbieten
- [x] Investorentyp aus Suchprofil in den KYC-Fall übernehmen
- [ ] Demo-Aufräumen: Testkonten `fk-test-*`, `ki-*`, `deal-*` und Vorgang V-26-SMUL97 – durch frische Demo-DB vor Vorführung
- [ ] Demo-Entwicklungsprojekte mit vollständigen Meilenstein-Vorlagen (frische Demo-DB)
- [x] `/energiegemeinschaften` und `/regionen/nordrhein-westfalen` auf ruhigem Server nachprüfen (Audit-Timeout)
- [x] KYC-Testreihe zentral grün fahren (lief nur unter Last)
- [ ] Geodaten-Test verbraucht Demo-Kandidaten (Akquise-Ziel je Lauf) → Test aufräumen lassen bzw. frische Demo-DB
- [x] Frappe: Ansichten müssen Flächen ohne Eigentümerkonto vertragen (Akquise-Übernahme)
- [x] Mobile Ansicht /portal/admin/gesellschaften nach Organigramm-Umbau prüfen
- [x] `pruefen.py`: allow_guest-Ausnahme für Identitäts-Webhook bestätigen
- [ ] Testdaten-Präfixe `dienste-test-*`, `fz-test-*`, Finanzen-Testverträge → frische Demo-DB
- [x] UI-Politur Handelsdesk: Kennzahl-Kacheln abgeschnitten, X-Achsen-Labels überlappen, Tabelle rechts abgeschnitten, Brotkrumen „Energie & Lastgang“ auf Admin-Handelsdesk falsch
- [x] `pruefen.py` Warnungen: 6 DocTypes in desk_rechte.py (Abnahmestelle, Akquise Ziel, Beteiligung Interesse, Bewertung Szenario, Lastgang, Netzkapazitaet), 106 Übersetzungen, doc_events Payment Entry Guard
- [x] Login-Seite: neue Demo-Konten (lieferant@, bank@, kommune@, gutachter@, bo-*@) in der Demo-Schnellauswahl
- [x] Frappe: `energie_quellen.historie_laden` einmalig nach Installation (GO-LIVE.md)
- [x] `rechte.py`: Spalte `projektleitung` ergänzen (finanzen=1, passend zu rechte.js)
- [ ] Steuer-/Rechtspunkte Finanzen (Backend-Import/FINANZEN-ERPNEXT.md) mit Steuerberatung klären; UID eintragen
- [x] Datenschutzerklärung: Abschnitte für Geodaten/Akquise-Direktwerbung, Energiebeschaffung (Lastgänge an Lieferanten anonymisiert), Bank-Portal, Signatur, Terminbuchung (Recht-Team, anwaltliche Prüfung offen)
- [x] Nutzungsbedingungen §§ 1–22, Besondere Bedingungen unter /bedingungen/* (Entwurf, noindex), Handbücher je Rolle und Backoffice-Unterrolle, Prozesslandkarte (docs/handbuch/)
- [ ] Nach anwaltlicher Freigabe: `FREIGEGEBEN = true` in src/app/bedingungen/_teile.js, dann /bedingungen/* in Footer (Rechtliches) und Sitemap aufnehmen; Platzhalter (Vergütung, Fristen, Anbieter, Gerichtsstand) füllen; offene Rechtsfragen (GwG-Verpflichteter, Art. 9 Online-Ident, Grundbuch-Direktansprache, Drittland KI, WAG/KWG/§ 34c GewO, MaklerG) klären

- [x] Finanzierungsmodul: `p.kostenkalkulation?.finanzierungsbedarf` aus der Projektkostenkalkulation statt Standard-Capex verwenden (fzAuswahl/eingabenAusBezug)
- [ ] CAD-Konverter: LibreDWG-Version und SHA-256/GPG gegen ftp.gnu.org prüfen, `LIBREDWG_SHA256` setzen; ODA nur nach Lizenzprüfung
- [ ] Demo-DB: Testdaten plan-test-*, T-PLAN-* entfernen
- [ ] Akquise-Kampagnen vor erstem Versand: Zweckbindung der nach § 43a GBV eingesehenen Grundbuchdaten für Werbebriefe durch Datenschutzberatung klären; Datenschutzerklärung „Flächenakquise per Brief und Angebotsseite“ prüfen; `oekoinvest_sperrliste_pfeffer` geheim setzen (nie ändern)
- [x] Zentral: plattform-test-geodaten.mjs erneut (Demo enthält jetzt DE-Kandidaten)
- [ ] Muster-Verträge Grundbuch/Closing je Land anwaltlich/notariell freigeben, Gebührentabellen (GNotKG, GGG/GebG, kantonal) aktualisieren – siehe docs/GRUNDBUCH-CLOSING.md Abschnitt 9

- [ ] Team 5 (Mitglied/Genossenschaft, Kommune): vor dem ersten echten Beitritt Prospekt-/Informationspflichten (VermAnlG/KMG/FIDLEG), Form der Beitrittserklärung, Online-GV laut Satzung, GwG-Identifizierung und Steuerabzug anwaltlich bzw. steuerlich klären; Demo-DB: Testdaten mt-test-* (Genossenschaften, Energiegemeinschaften, Testgemeinden) entfernen; Bench-Tests (FrappeTestCase) für api/mitglied.py und api/gemeinde.py ergänzen

- [x] Team 6 Gutachter/Planer und Bank: Auftragsverwaltung Gutachter (Angebot → Beauftragung → Lieferung/Mängel → Abnahme → Rechnung/Zahlung → Bewertung), Bank-Akte (Anforderungen, Q&A, Kreditentscheidung, CP-Bestätigung, Auszahlungen, Berichte) und Bank-Team; Test `plattform-test-gutachter-bank.mjs` (151 grün)
- [ ] Team 6 offen: FrappeTestCase-Tests für `api/gutachterauftrag.py`/`api/bankakte.py` auf einer Bench; Desk-Workspace-Kacheln/Druckformate für Gutachterauftrag und Bank-Akte; Termine der Gutachteraufträge optional in den Kalender (Modul Termine) spiegeln; Auftragsbestätigung optional über das Signatur-Modul; ERPNext Purchase Invoice für bezahlte Gutachter-Rechnungen (heute: Plattform Projektkosten)

## Abschluss
- [x] Zentrale Tests aller Testreihen (21 Reihen, 2.323 Prüfungen), Backend-Konsistenzprüfer (0/0), Produktions-Build, Seiten-Audit (123 öffentlich, 20 Rollen im Portal), npm audit 0, Commit
