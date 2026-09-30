# Ausbaustufe 5 – Führende Plattform DACH (Auftrag vom 30.09.2026, Zeitrahmen 20 h)

Rechner: 7,6 GB RAM → Arbeit in Wellen. Stand wird hier gepflegt, damit nach Unterbrechungen weitergearbeitet werden kann.

## Laufend (Stufe 4)
- [ ] Go-live-Paket Backend (Backend-Import komplett: Desk, Rollen, Druckformate, Notifications, Workflows, Reports, Installation, GO-LIVE.md)
- [ ] KYC/KYB (manuelle Prüfung, Verschlüsselung, Sanktionsabgleich, Gating)
- [ ] Projektentwicklung (Entwicklungsakte, Gantt, Risiken, Portfolio, Gutachter-Rolle)
- [ ] ERPNext-Finanzen (Pacht, Contracting, Provisionsrechnung, Assets, Controlling)
- [ ] Dokumente/Signatur/Termine/Helpdesk/HR
- [ ] Fachprüfung A (Fläche, Landwirt, Dach, Kommune)
- [ ] Fachprüfung B (Investor, Anbieter, Unternehmen, Mitglied)

## Welle A (sofort, überwiegend Backend – wenig Dev-Server)
- [ ] **A1 Geodaten & Akquise-Engine** – Österreich zuerst: Kataster (BEV DKM, OGD), INVEKOS-Schläge (AMA, OGD), Umspannwerke/Trafos (OpenStreetMap power=substation/transformer, ODbL; ggf. Netzbetreiber-Kapazitätskarten), Geländeneigung (DGM, OGD), Schutzgebiete (Natura 2000/Nationalparks/Landschaftsschutz), Siedlungsabstand; PostGIS-Pipeline in `Backend-Import/dienste/geodaten`; Flächen-Scoring + Leitungslänge/Netzanschlusskosten zum nächsten Umspannwerk; Akquise-Cockpit mit Karte (basemap.at, Leaflet) im Backoffice; später DE/CH.
- [ ] **A2 Firmen-, Bonitäts- & Identitätsdienste** – Adapter: Identitätsprüfung (IDnow/Veriff/Sumsub, Webhooks) + automatische MRZ-Prüfung (ICAO 9303) als Vorprüfung; Bonität (KSV1870, Creditreform, CRIF); Firmenbuch AT (über Verrechnungsstelle), Handelsregister DE, Zefix CH (öffentliche API); Anbindung an KYC-Fall. SPV-/GmbH-Gründungsassistent AT/DE/CH (Dokumente, Notartermin, Firmenbuch-/Handelsregister-Anmeldung, Transparenz-/WiEReG-Meldung, UID/Steuernummer, Bankkonto) – Notariate haben keine offene API: Workflow + Dokumentenpaket + Terminbuchung.

## Welle B (nach Stufe 4)
- [ ] **B1 Onboarding-Assistenten je Rolle und Unterrolle** (Investor je Typ, Anbieter/Verkäufer Projekt & Bestandsanlage, Flächen-/Dach-Eigentümer, Landwirt, Contracting-Kunde, Reststrom-Kunde, Kommune, Gutachter, Backoffice je Unterrolle)
- [ ] **B2 Investor-Finanzierungscockpit** – ROI je Projekt nach Login, Finanzierungsvergleich (Eigenkapital, Annuitätenkredit, Förderkredit KfW/aws/OeKB, Leasing, Mietkauf), Förder-Check je Land (EEG/EAG/Einmalvergütung/Investitionszuschüsse), Steuern (AfA), Szenarien speichern, PDF
- [ ] **B3 Planungsdateien & Projektkosten** – DWG/DXF-Upload mit Vorschau (DXF im Browser, DWG → Konvertierungsdienst), Projektkostenkalkulation nach Gewerken inkl. Netzanschluss aus Akquise-Distanz, Anbindung Projektentwicklung/ERPNext
- [ ] **B4 Deal-Abschluss end-to-end** – Kaufvertrag-Vorlagen (SPA Asset/Share Deal), Signatur, Notartermin, Closing-Checkliste, Kaufpreiszahlung/Treuhand-Hinweis, automatische Provisionsrechnung, Übergabe

## Abschluss
- [ ] Zentrale Tests aller Testreihen, Backend-Konsistenzprüfer, Produktions-Build, Seiten-Audit, Sichtprüfung je Rolle, Commit
