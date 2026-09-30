# Handbuch: Anbieter / Verkäufer

Stand: 30.09.2026 · Rolle `anbieter` · Demo: `anbieter@example.com` (Organisation „Muster Projektentwicklung GmbH (fiktiv)“)

**Worum es geht:** Projekte oder Bestandsanlagen vertraulich und strukturiert an geprüfte Investoren verkaufen. Provision nur bei Abschluss (Verkäuferprovision laut Provisionsvereinbarung, Spanne aus `markt.js` PROVISION).

## Auf einen Blick

| Menü | Wofür |
|---|---|
| Meine Projekte (`/portal/projekte`) | Projekt anlegen (`n`), Status, Statistik, „Was ist zu tun?“ über alle Projekte (Rückfragen, LOIs, Fristen, Closing, Rechnung) |
| Projektseite → „Vermittlungsauftrag“ | Einfacher Auftrag oder Exklusivität erteilen, PDF, Exklusivität beenden |
| Projektseite → „Rückfragen & Nachbesserung“ | Prüfpunkte des Backoffice mit Frist beantworten |
| Projektseite → „Interessenten & LOIs“ | Pseudonyme Interessenten, Stellungnahme zu LOIs, Vorkenntnis melden |
| Projektseite → „Deal-Room & Cockpit“ | Trichter (Aufrufe → Merker → NDA → Datenraum → Angebote), Zugriffsprotokoll (pseudonym), Fragen beantworten |
| Finanzierungscockpit | Rendite- und Finanzierungsrechnung für das eigene Projekt |
| Deal-Abschluss (`/portal/closing`) | Closing-Raum nach Zuschlag |
| Abrechnungen | Provisionsrechnungen |
| Verifizierung | KYB – Voraussetzung für die Veröffentlichung |

## Projekt einreichen (Schritt für Schritt)

1. **Eckdaten:** Titel (anonym – kein Ortsname), Typ, Land, Bundesland, Region, MWp, Phase, Beschreibung (≥ 80 Zeichen). Der KI-Exposé-Assistent kann Beschreibung, Highlights und Risiken entwerfen – Übernahme nur per Klick, bitte prüfen.
2. **Datenblatt** (10 Bereiche, phasenabhängig): Technik, Ertrag P50/P75/P90 mit Gutachter und Datum, Netz (Zusage, Leistung, Befristung, Spannungsebene, BKZ), Genehmigung (Weg und Meilensteine), Fläche (Sicherung, Laufzeit, dingliche Sicherung), Vermarktung, Wirtschaftlichkeit (als „Anbieterangabe“ gekennzeichnet), Transaktion, Umwelt, bei Bestandsanlagen Ist-Erträge und Verfügbarkeit. Die **Plausibilitätsprüfung** zeigt Fehler/Warnungen live.
3. **Unterlagen:** Checkliste je Phase – Upload direkt am Punkt; Datenraum-Qualität = 70 % Pflichtunterlagen + 30 % Datenblatt. Personenbezogene Daten Dritter (Grundbuch, Pachtverträge) schwärzen.
4. **Vermittlungsauftrag** erteilen (Karte auf der Projektseite; ersetzt die Klick-Provisionsvereinbarung): einfacher Auftrag oder Alleinvermittlung (Exklusivität) mit Mindestlaufzeit 3–12 Monate, optional Vorbehaltsliste bereits bekannter Interessenten, Unterschrift durch Eingabe Ihres Namens. Die Exklusivität wirkt erst nach Gegenbestätigung durch ÖkoInvest. Dann **Einreichen** → Status „Prüfung“. Zurückziehen ist möglich.
5. **Prüfung:** Rückfragen des Backoffice erscheinen als Prüfpunkte mit Frist (Glocke, E-Mail). Solange eine Rückfrage offen ist, ist das Einreichen gesperrt; Pflichtpunkte müssen vor der Veröffentlichung erledigt sein. Die **Anonymisierungsprüfung** zeigt, ob Titel, Region, Beschreibung oder Highlights Gemeinde, Flurstücke, Adressen oder Kontaktdaten nennen – solche Angaben sperren die Veröffentlichung.
6. **Freigabe** durch das Backoffice (Satz wird festgelegt) → „Veröffentlicht“. Voraussetzung: KYB verifiziert.

## Nach der Veröffentlichung

- **Datenraum einordnen:** Ordner, Stufe 1 (nach NDA) oder Stufe 2 (nach LOI), neue Versionen statt neuer Dateien.
- **Fragen & Antworten:** Moderierte Fragen erscheinen mit Frist (Standard 5 Tage). Antworten sachlich; „für alle“ veröffentlichen, wenn für alle relevant. Das Backoffice prüft vor der Veröffentlichung.
- **LOIs:** Unter „Interessenten & LOIs“ sehen Sie jede LOI pseudonym mit Preis, Struktur, Bedingungen, Exklusivität und Gültigkeit. Geben Sie eine **Stellungnahme** ab (Zustimmung, Verhandeln mit Gegenvorschlag, Ablehnung). Nach Ihrer Ablehnung kann ÖkoInvest die LOI nicht annehmen.
- **Vorkenntnis:** Kennen Sie einen angezeigten Interessenten für genau dieses Projekt schon, melden Sie das mit Nachweis binnen zehn Werktagen (Frist steht am Interessenten).
- **Bieterverfahren:** Übersicht der Gebote erst nach Freigabe durch das Backoffice, pseudonym. Zuschlag erteilt das Backoffice in Abstimmung mit Ihnen.
- **Kontaktfreigabe:** Namen der Interessenten erst nach Freigabe je Interesse.

## Bestandsanlage (Phase „In Betrieb“)

Karte „Bestandsanlage: Ertragshistorie, Verträge, Förderung“ auf der Projektseite:
- **Ertragshistorie** als CSV aus dem Monitoring oder Excel (`Monat; Ertrag kWh; Prognose kWh; Einstrahlung kWh/m²; Verfügbarkeit %`) – Kennzahlen je Jahr (spezifischer Ertrag, Ist/Prognose, Performance Ratio, Verfügbarkeit), Datenlücken und Rückgang werden angezeigt. Üblich sind mindestens 12, besser 24–36 Monate.
- **Verträge:** O&M, Direktvermarktung/PPA, Versicherung, Pacht/Nutzung, Netz, Monitoring, Rückbausicherheit – mit Laufzeit, Kündigungsfrist, Kosten und Übertragbarkeit (Zustimmung des Vertragspartners wird später Vollzugsbedingung im Closing).
- **Förderung & Vermarktung:** Inbetriebnahme, Register (DE: MaStR-Nummer), Vermarktungsform, anzulegender Wert, Direktvermarkter, Förderende (DE berechnet, bitte prüfen; AT/CH angeben).
- **Technische Due Diligence:** Checkliste mit Dokument aus dem Datenraum je Punkt.
Investoren sehen diese Angaben nach der NDA-Freigabe, gekennzeichnet als Angaben des Verkäufers.

## Statusfolge

Projekt: `Entwurf → Prüfung → Veröffentlicht ↔ Reserviert → Verkauft` (Abgelehnt → zurück in Entwurf; „von der Börse nehmen“ → Entwurf).
Nach „Verkauft“ entsteht die Provision → Provisionsrechnung (`/portal/abrechnungen`).

## Closing

Signing-Checkliste, CPs mit Nachweisen melden, Notartermin, Kaufpreiseingang, Übergabe-Checkliste (Unterlagen, Zugänge, Anzeigen an Netzbetreiber/Direktvermarkter/Behörden, Grundbuch). Vorkenntnis eines Interessenten binnen zehn Werktagen melden (Besondere Bedingungen Projektbörse § 4).

## Typische Fehler

| Problem | Lösung |
|---|---|
| Einreichen gesperrt | Pflichtfelder fehlen, Vermittlungsauftrag nicht erteilt oder eine Rückfrage des Backoffice ist offen |
| Veröffentlichung verzögert | Pflicht-Prüfpunkt nicht erledigt oder Teaser nennt Gemeinde/Flurstück/Kontaktdaten (Karte „Anonymisierung“) |
| Auftrag lässt sich nicht kündigen | Projekt erst von der Börse nehmen; laufende Exklusivität zuerst beenden (frühestens zum Ende der Mindestlaufzeit) |
| Freigabe hängt | KYB nicht verifiziert; Rückfrage im Nachrichtenverlauf beantworten |
| Ortsname im Titel | Backoffice anonymisiert – besser gleich neutral formulieren |
| Datenraum-Qualität niedrig | Checkliste abarbeiten und Datenblatt vervollständigen |
| Kontakt zum Investor direkt gesucht | Nicht erlaubt bis Kontaktfreigabe (Umgehungsschutz) |

## Recht kurz

Sie haften für Richtigkeit und Verfügungsbefugnis (Nutzungsbedingungen § 5). Provision und Umgehungsschutz: Nutzungsbedingungen § 17 und `/bedingungen/projektboerse`. Kaufverträge (SPA) sind Muster zur anwaltlichen/notariellen Prüfung.
