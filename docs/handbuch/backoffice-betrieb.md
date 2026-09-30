# Backoffice-Handbuch: Betrieb

Stand: 30.09.2026 · Unterrolle `betrieb` (Anlagen schreiben, Aufgaben schreiben, Cockpit/Nutzer lesen, Support) · Desk „ÖkoInvest Betrieb“ · Demo: `bo-betrieb@example.com`

## Tagesroutine

| Wann | Was | Wo |
|---|---|---|
| Schichtbeginn | Störungs-Leitstand nach Priorität (Schwere × 10 + Alter + unquittiert), kritische zuerst **quittieren** | `/portal/admin/anlagen` |
| | Offline-Anlagen (Heartbeat > 60 s fehlt, Status `offline`) | Leitstand, Filter |
| Laufend | Support-Tickets mit SLA (kritisch 2 h Reaktion / 24 h Lösung, hoch 8/48, normal 24/120, niedrig 48/240) | `/portal/admin/support` |
| Wöchentlich | Minderleistung (Soll-Ist), Wartungstermine, Klärfälle der Buchhaltung zu fehlenden Monatswerten | Anlagen-Detail, `/portal/admin/finanzen` |
| Monatlich | Zählerstände (abrechnungsrelevant) vollständig? | Anlage → Zählerstände |

## Ablauf: Neue Contracting-Anlage in Betrieb nehmen

1. Assistent `/portal/admin/anlagen/neu`: Name, Typ, Standort, kWp, Speicher, **Eigentümergesellschaft (Pflicht)**, Betriebsführer, Stromabnehmer (Kunde/Organisation), Dachgeber, Vertrag (Arbeitspreis, Grundgebühr, Indexierung, Mindestabnahme, Endschaft).
2. KYC des Kunden verifiziert? (Gating „contracting“).
3. **Gerät verbinden:** MQTT-Zugang erzeugen – Passwort wird **nur einmal** angezeigt, sicher an den Installateur übergeben; Topic `oekoinvest/v1/<AL>/<GZ>/…`, TLS 8883.
4. Testnachricht → Status „verbunden“, Live-Werte prüfen.
5. Messpunkte anlegen: **abrechnungsrelevant** (geeicht, Messstellenbetreiber) getrennt von Monitoring.
6. Status „Betrieb“ (Inbetriebnahmedatum Pflicht), Buchhaltung informieren (Aktivierung), Grundbuch-Akte Dienstbarkeit prüfen.

## Ablauf: Störung

`offen` (quittieren, zuweisen, bearbeiten) → `behoben` · Zuweisen, Schwere anpassen, interne Kommentare (Kunde sieht sie nicht), Kundenkommentar sichtbar. Bei Bedarf Support-Ticket verknüpfen. Nach Behebung Ereignisbericht (Desk-Druckformat) und ggf. Soll-Ist-Nachweis für Covenant-Reporting.

## Tastenkürzel

Leitstand `/` Suche, `v` Ansicht · `g t` Aufgaben · Diagramme: Zeitraum Tag/Woche/Monat/Jahr, CSV-Export.

## Typische Fehler

| Fehler | Richtig |
|---|---|
| Monitoring-Werte zur Abrechnung genutzt | nur geeichte Zähler (Monatswerte) |
| MQTT-Passwort per E-Mail im Klartext | sicherer Kanal; bei Verdacht Zugang sperren und neu erzeugen |
| Doppelt quittiert | System blockiert (409) – Status statt Quittung ändern |
| Anlage ohne Eigentümer | Speichern blockiert (422) |
| Technikdetails an Kunden gegeben | Kundensicht zeigt bewusst keine Komponenten/Finanzierung |
