# Handbuch: Energiebeschaffung (Reststrom-Pool)

Stand: 30.09.2026 · Rolle `unternehmen` · Demo: `unternehmen@example.com`, `energie-kunde1@example.com` … `energie-kunde3@example.com`

**Worum es geht:** ÖkoInvest holt für Ihren Reststrom Angebote mehrerer Energieversorger ein – einzeln oder gebündelt im Pool –, vergleicht sie auf Ihr Verbrauchsprofil und empfiehlt einen Zuschlag. **Ohne Ihre Freigabe im Portal kommt kein Vertrag zustande.**

## Auf einen Blick

| Menü | Wofür |
|---|---|
| Energie & Lastgang (`/portal/energie`) | Abnahmestellen, Lastgang-Import und -Analyse, PV-Deckung, Pool-Ersparnis, Angebotsanfrage |
| Energiebeschaffung (`/portal/energie/beschaffung`) | Vertrag, Kündigungsfrist, Markteinschätzung, Angebotsvergleich zur Freigabe, Vollmacht, Ausschreibungsstatus, PDFs |

## Schritt für Schritt

1. **Abnahmestellen anlegen:** MaLo (DE, 11 Stellen mit Prüfziffer), MeLo (33 Zeichen), Zählpunkt AT (33 Zeichen) bzw. Messpunkt CH; Messart (RLM/SLP), Spannungsebene, Netzbetreiber, Jahresverbrauch, Spitze.
2. **Laufenden Vertrag erfassen:** Lieferant, Preisstruktur, Arbeits-/Grundpreis, Vertragsende, **Kündigungsfrist**, Verlängerung. Daraus berechnet die Plattform den Kündigungsstichtag und warnt 90/60/30/14/7 Tage vorher.
3. **Lastgang hochladen** (Viertelstundenwerte, CSV/Excel-Export des Netzbetreibers): Einheiten (W/kW/MW, Wh/kWh/MWh), Zeitumstellung, Intervallende und Lücken werden erkannt – Hinweise lesen.
4. **Beschaffungsvollmacht erteilen** (versionierter Text, Klick; auf Wunsch zusätzlich elektronische Unterschrift) und Servicevertrag bestätigen (`/bedingungen/energiebeschaffung`).
5. **Ausschreibung** startet das Backoffice (Energie). Versorger sehen nur ein anonymes Los – keinen Namen, keine Adresse, keine Lokations-IDs.
6. **Angebotsvergleich prüfen:** normierte Kosten je Produkt (Festpreis, Tranchen, Spot), Bedingungen, Sensitivität, Zuschlagsvorschlag mit Begründung.
7. **Freigeben oder ablehnen** – innerhalb der Bindefrist der Angebote. Bei Freigabe: Zuschlag, Zuschlagsschreiben, Weitergabe Ihrer Vertragsdaten an den gewählten Versorger, Aufgabe „Lieferantenwechsel einleiten“ (inkl. Kündigung des Altvertrags).
8. **Laufende Wechselanalyse:** Empfehlung ausschreiben / abwarten / verlängern mit Begründung.

## Gut zu wissen

- Verglichen wird nur der **Energiepreis**; Netzentgelte, Steuern, Abgaben sind nicht Teil des Wettbewerbs.
- DE: Technischer Wechsel binnen 24 Stunden (seit 06.06.2025), maßgeblich bleibt die Kündigungsfrist. AT: Wechselverfahren nach aktuellem Stand höchstens drei Wochen.
- Öffentliche Auftraggeber: Vergaberecht beachten – die Anfrage ist dann nur Markterkundung.

## Typische Fehler

| Problem | Lösung |
|---|---|
| Keine Ausschreibung möglich | Vollmacht fehlt oder widerrufen |
| Freigabe-Knopf fehlt | Rundenende abwarten; Vorschlag liegt noch nicht vor |
| Kündigungsfrist verpasst | Vertragsdaten früh und korrekt erfassen; Alarm-E-Mails aktivieren |
| Lastgang falsch skaliert | Einheit im Export prüfen (kW-Mittelwerte vs. kWh je Viertelstunde) |

## Recht kurz

Leistungen, Vergütung (noch Platzhalter) und Haftung: `/bedingungen/energiebeschaffung`. Empfehlungen sind Einschätzungen, keine Preisgarantie. Datenweitergabe an Versorger: Datenschutzerklärung, Abschnitt 8g.
