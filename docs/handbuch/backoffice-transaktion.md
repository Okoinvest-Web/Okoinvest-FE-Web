# Backoffice-Handbuch: Transaktion

Stand: 30.09.2026 · Unterrolle `transaktion` (Projektfreigabe, NDA & LOI, Deal-Room, Verkauf, Closing, CRM, Bonität lesen/beauftragen) · Desk „ÖkoInvest Transaktion“ · Demo: `bo-transaktion@example.com`

## Tagesroutine

| Wann | Was | Wo |
|---|---|---|
| Morgens | Projekte in „Prüfung“, NDA-Anfragen, neue LOIs | `/portal/admin/projekte`, `/portal/admin/interessen` |
| | Q&A-Moderation (eingereicht → freigegeben), Antworten in Prüfung | `/portal/admin/dealroom` |
| Mittags | Bieterverfahren: Fristen, Erinnerungen, Rundenwechsel | `/portal/admin/dealroom` |
| Nachmittags | Closing-Räume: CPs, Notartermine, Zahlungseingänge | `/portal/admin/closing` |
| Wöchentlich | Datenraum-Qualität der Börse, Anbieter-Cockpits, Provisionen | `/portal/admin/deals` |

## Ablauf: Projekt → Verkauf → Provision (Projektbörse)

1. **Prüfung** (`pruefung`): Datenblatt-Plausibilität, Pflichtunterlagen, **Anonymität** (Titel/Region ohne Ort), KYB des Anbieters verifiziert. Rückfrage → `entwurf` mit Kommentar; ablehnen mit Grund.
2. **Freigabe** → `veroeffentlicht` mit **Provisionssatz 1,5–3 %**. Suchprofil-Alarm läuft automatisch.
3. **NDA-Anfrage** → prüfen (Investor-KYC; Gating greift) → `nda_freigegeben` = Datenraum Stufe 1.
4. **Q&A**: moderieren, Frist für den Anbieter setzen (1–30 Tage), Antwort prüfen, „für alle“ veröffentlichen oder zurückgeben.
5. **Bonität vor LOI** (Pflicht je Einstellung, Standard Produktion „Firmen“): Auskunft beauftragen, Betroffenen informieren, Freigabe mit Begründung (`/portal/admin/bonitaet`).
6. **LOI** prüfen (Preisbasis, Struktur, Bedingungen, Finanzierung, Gültigkeit) → `loi_angenommen` → Projekt `reserviert`. Alternativ:
7. **Bieterverfahren** starten (nur bei `veroeffentlicht`, kein aktives Verfahren): Art indikativ/verbindlich, Frist, Pflichtangaben, Teilnehmer. Nach Rundenende auswerten, ggf. `naechsteRunde`, Übersicht an den Anbieter freigeben (pseudonym), **Zuschlag** (KYC Bieter) → LOI aus Gebot → `reserviert`.
8. **Kontaktfreigabe** je Interesse, wenn beide Seiten bereit sind.
9. **Closing-Raum** anlegen (aus Zuschlag/LOI): Struktur Asset/Share, Kaufpreis, Meilensteine, SPA-Muster, Signing-Checkliste (KYC beider Seiten, Bonität, Finanzierungsnachweis, Gremien, DD, SPA endverhandelt) → **Signing**.
10. CPs mit Verantwortlichen/Fristen; Meldungen der Parteien bestätigen (Nachweis Pflicht). Notartermin (.ics), Zahlungseingang (Treuhand optional).
11. **Closing** → Projekt `verkauft` (Käufer-Interesse `abgeschlossen`, alle anderen `abgelehnt`) → Provision → Provisionsrechnung (Buchhaltung). Übergabe-Checkliste, Abschlussbericht-PDF.

## Ablauf: Build-to-Sell aus eigener Entwicklung

Projektleitung übergibt an die Börse (Entwurf, Anbieter = Backoffice-Konto) → wie oben; Exposé kennzeichnet eigenes Projekt der Gruppe.

## Tastenkürzel

`g p` Projekt-Freigabe · `g v` Vorgänge · `g t` Aufgaben · `/` Suche · Listen mit Massenaktionen und CSV (Formel-Schutz).

## Typische Fehler

| Fehler | Richtig |
|---|---|
| Ortsname im öffentlichen Teaser | vor Freigabe anonymisieren |
| Frage mit Telefonnummer freigegeben | Bereinigung prüfen, notfalls kürzen/zurückweisen |
| Zuschlag vor Rundenende | System blockiert (409) – Frist abwarten oder Runde beenden |
| Gebotsmatrix an Anbieter vor Freigabe | nur über „Anbieter-Freigabe“, pseudonym |
| Signing ohne KYC beider Seiten | blockiert (Code `kyc`) – Compliance früh einbinden |
| Share Deal ohne Notartermin | Closing blockiert; DE/AT GmbH-Anteile nur notariell |
| Provision manuell angelegt | entsteht automatisch beim Verkauf |
