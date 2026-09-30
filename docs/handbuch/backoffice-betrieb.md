# Backoffice-Handbuch: Betrieb

Stand: 01.10.2026 · Unterrolle `betrieb` (Anlagen schreiben, Aufgaben schreiben, Cockpit/Nutzer lesen, Support) · Desk „ÖkoInvest Betrieb“ · Demo: `bo-betrieb@example.com`

## Tagesroutine

| Wann | Was | Wo |
|---|---|---|
| Schichtbeginn | Störungs-Leitstand nach Priorität (Schwere × 10 + Alter + unquittiert), kritische zuerst **quittieren** | `/portal/admin/anlagen` |
| | **SLA-Ampel** der offenen Störungen (rot = Reaktion/Lösung überschritten, gelb = ≥ 75 % verbraucht) | `/portal/admin/anlagen/betrieb` |
| | Offline-Anlagen (Heartbeat > 60 s fehlt, Status `offline`) | Leitstand, Filter |
| Laufend | Serviceaufträge (Termin, vor Ort, Bericht), Support-Tickets mit SLA | Betriebsführung, `/portal/admin/support` |
| Täglich (automatisch) | Fristen-Lauf: Eichgültigkeit, Garantieende, Wartungsfälligkeit, Meldefrist Versicherung, Nachbestellung → Aufgaben | Betriebsführung, `/portal/admin/aufgaben` |
| Wöchentlich | Minderleistung (Soll-Ist), fällige Wartungen, „Behoben ohne Ursache“ nacharbeiten | Betriebsführung |
| Monatlich | Zählerstände plausibilisieren und **freigeben** (vor der Contracting-Abrechnung), Einstrahlung erfassen (PR), Monatsbericht je Anlage (PDF) | Betriebsführung → Anlage |
| Jährlich | Jahresbericht je Anlage (PDF), Wartungsplan prüfen (Intervalle, Dienstleister) | Betriebsführung → Anlage |

## SLA (Standard, Vertrag geht vor)

| Schwere | Reaktion (Quittierung) | Lösung (Behebung) |
|---|---|---|
| kritisch | 2 h | 24 h |
| hoch | 4 h | 48 h |
| mittel | 24 h | 120 h |
| niedrig | 48 h | 240 h |
| info | 72 h | – |

## Ablauf: Neue Contracting-Anlage in Betrieb nehmen

1. Assistent `/portal/admin/anlagen/neu`: Name, Typ, Standort, kWp, Speicher, **Eigentümergesellschaft (Pflicht)**, Betriebsführer, Stromabnehmer (Kunde/Organisation), Dachgeber, Vertrag (Arbeitspreis, Grundgebühr, Indexierung, Mindestabnahme, Endschaft).
2. KYC des Kunden verifiziert? (Gating „contracting“).
3. **Gerät verbinden:** MQTT-Zugang erzeugen – Passwort wird **nur einmal** angezeigt, sicher an den Installateur übergeben; Topic `oekoinvest/v1/<AL>/<GZ>/…`, TLS 8883. Bei Verdacht: Zugang sperren bzw. neues Passwort (altes sofort ungültig).
4. Testnachricht → Status „verbunden“, Live-Werte prüfen.
5. Komponenten mit **Garantieende**, Messpunkte: **abrechnungsrelevant** (geeicht, Messstellenbetreiber) getrennt von Monitoring, **Eichgültigkeit** eintragen.
6. Betriebsführung → Anlage → **„Standardplan übernehmen“** (Vorlage DE/AT/CH), Intervalle und Dienstleister anpassen.
7. Status „Betrieb“ (Inbetriebnahmedatum Pflicht), Buchhaltung informieren (Aktivierung), Grundbuch-Akte Dienstbarkeit prüfen.

## Ablauf: Störung als Ticket

1. Leitstand: **quittieren** (startet die Reaktion), zuweisen. Link „Ticket“ öffnet `/portal/admin/anlagen/betrieb/stoerung/<id>`.
2. **Serviceauftrag** anlegen (Techniker, Dienstleister, Hersteller/Garantie, Netzbetreiber) → „Beauftragt“ → Auftragsschreiben (PDF) senden → **Termin** setzen (Kunde erhält automatisch „Servicetermin – bitte Zugang ermöglichen“) → „Vor Ort“ → „Erledigt“ mit Einsatzbericht.
3. Ersatzteil **entnehmen** (immer mit der Störung – Nachweis für Garantie und Kosten).
4. **Ursache und Maßnahme** erfassen, Ausfallzeitraum und betroffenen Anteil (z. B. 1 von 4 Wechselrichtern = 25 %) → **Ertragsausfall** in kWh und € (Prognose × Tagesgang; Eigenverbrauch zum Arbeitspreis, Rest zum Marktwert Solar).
5. Versicherbare Ursache (Überspannung/Blitz, Sturm/Hagel, Tierverbiss, Vandalismus, Brand) → **Versicherungsfall** anlegen, **unverzüglich melden** (interne Frist 7 Tage; DE § 30 VVG, AT § 33 VersVG, CH Art. 38 VVG), Schadennummer, Regulierung erfassen. Schadenstelle vor Freigabe des Versicherers nur zur Schadenminderung verändern.
6. **Behoben melden** – nur mit Ursache und Maßnahme, ohne offenen Auftrag. Kunde und Team werden informiert.

## Ablauf: Wiederkehrende Prüfung

1. Fällige Pläne erzeugen Aufgaben (Vorlauf). Am Plan „Auftrag für diese Wartung“ → Prüfdienst beauftragen.
2. **Prüfprotokoll** erfassen: je String Uoc, Isc, Riso; Prüfpunkte (RCD, Schutzleiter, SPD …); Thermografie-Befunde (ΔT, nur bei ≥ 600 W/m²); weitere Mängel.
3. Das Portal bewertet (Orientierung, Verantwortung bei der Elektrofachkraft): Riso < 1 MΩ (bei Uoc ≤ 120 V < 0,5 MΩ) oder RCD/Schutzleiter nicht i. O. = **nicht bestanden**; ΔT ≥ 10 K bzw. Uoc-Abweichung > 5 % = Mängel. Mängel legen automatisch eine Störung an.
4. Plan wird fortgeschrieben (nächste Fälligkeit), die Wartung erscheint in der Anlagenhistorie; Protokoll als PDF ablegen/unterschreiben lassen.

| Land | Wiederkehrende Prüfung (Vorlage) |
|---|---|
| DE | E-Check / DGUV Vorschrift 3, DIN VDE 0105-100; Richtwert 4 Jahre (Gefährdungsbeurteilung) |
| AT | ESV 2012, OVE E 8101 (PV: OVE R 11-1); in Arbeitsstätten in der Regel höchstens alle 5 Jahre |
| CH | NIV-Kontrolle mit Sicherheitsnachweis (SiNa), Kontrollperiode objektbezogen nach NIV-Anhang |

## Ablauf: Zählerablesung → Contracting-Abrechnung

1. Monatswerte vom Messstellenbetreiber bzw. Ablesung erfassen (Anlage → Zählerstände).
2. Betriebsführung → Anlage → **„Zählerablesung plausibilisieren“**: Eichfrist, Abgleich mit dem Monitoring (> 10 % prüfen, > 25 % auffällig), Prognose.
3. **Freigeben** – auffällige Werte nur mit Begründung; bei abgelaufener Eichfrist ist keine Freigabe möglich (Zählertausch veranlassen, Menge ggf. rechnerisch ermitteln).
4. Die Buchhaltung rechnet mit den freigegebenen (geprüften) Werten ab.

## Kennzahlen

- **Ist/Soll** (Performance-Index): Erzeugung gegenüber Prognose (Region, Bauart, Alterung) – ohne Wetterbereinigung.
- **Performance Ratio** (IEC 61724-1): nur mit erfasster Einstrahlung in Modulebene (kWh/m², Quelle Pflicht: Pyranometer/Referenzzelle oder Satellitendaten). PR außerhalb 50–100 % wird markiert.
- **Verfügbarkeit (energetisch)** = 1 − Ertragsausfall / Soll.

## Tastenkürzel

Leitstand `/` Suche, `v` Ansicht · `g t` Aufgaben · Befehlspalette „Betriebsführung“ · Diagramme: Zeitraum Tag/Woche/Monat/Jahr, CSV-Export.

## Typische Fehler

| Fehler | Richtig |
|---|---|
| Monitoring-Werte zur Abrechnung genutzt | nur geeichte Zähler (freigegebene Monatswerte) |
| Zählerstand mit abgelaufener Eichfrist freigegeben | blockiert (409) – Zählertausch |
| MQTT-Passwort per E-Mail im Klartext | sicherer Kanal; bei Verdacht Zugang sperren und neu erzeugen |
| Doppelt quittiert | System blockiert (409) – Status statt Quittung ändern |
| „Behoben“ ohne Ursache | blockiert (422); im Leitstand Behobenes erscheint unter „Behoben ohne Ursache“ |
| Techniker kommt unangekündigt | Termin im Auftrag setzen – Kunde wird automatisch informiert |
| Versicherungsfall zu spät gemeldet | Meldefrist-Aufgabe beachten; verspätete Meldung wird markiert |
| Entnahme ohne Bezug | blockiert (422) – Anlage bzw. Störung angeben |
| Anlage ohne Eigentümer | Speichern blockiert (422) |
| Technikdetails an Kunden gegeben | Kundensicht zeigt bewusst keine Komponenten/Finanzierung/Betriebsführung |
