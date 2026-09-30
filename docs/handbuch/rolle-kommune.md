# Handbuch: Kommune / Gemeinde

Stand: 30.09.2026 · Rolle `kommune` · Demo: `kommune@example.com`

**Worum es geht:** Gemeinden begleiten Solarprojekte im Gemeindegebiet – Bauleitplanung, Beteiligung (DE § 6 EEG: bis 0,2 ct/kWh), Bürgerbeteiligung, Gewerbesteuer – und können eigene Flächen einbringen.

## Auf einen Blick

| Menü | Wofür |
|---|---|
| Gemeinde (`/portal/kommune`) | Projekte im Gemeindegebiet ab Planung (vereinfacht, ohne Eigentümer/Flurstücke/Pacht), § 6-Schätzung, Ansprechpartner |
| Termine | Gemeindetermin buchen (auch öffentlich unter `/termin?art=…`) |
| Nachrichten, Dokumente | Abstimmung, Unterlagen zur Bauleitplanung |
| Flächen | gemeindeeigene Flächen anbieten (wie Eigentümer) |

## Schritt für Schritt

1. **Strukturierte Anfrage** auf `/kommunen`: Gemeinde, Gemeindeschlüssel (DE AGS, AT Gemeindekennziffer, CH BFS-Nr.), Funktion, gemeindeeigene Flächen, Interesse an § 6, Bürgerbeteiligung, Planungsstand, Kriterienkatalog.
2. **Freischaltung:** Das Backoffice bestätigt die Berechtigung unabhängig (Rückruf über die Gemeindeverwaltung). Erst danach ist die Gemeinde-Sicht sichtbar.
3. **Projekte verfolgen:** Meilensteine der Bauleitplanung (Aufstellungsbeschluss, frühzeitige Beteiligung, Offenlage, Satzungsbeschluss bzw. AT Umwidmung, CH Nutzungsplanung).
4. **Beteiligung:** § 6 EEG-Vereinbarung (DE), Beteiligungsmodelle (Genossenschaft, Energiegemeinschaft) im Gespräch klären.

## Typische Fehler

| Problem | Lösung |
|---|---|
| Menü zeigt „Mein Solarstrom“ | Konto hat noch die alte Rolle „Unternehmen“ – Backoffice um Rolle `kommune` bitten |
| Gemeinde-Sicht leer | Noch nicht freigeschaltet oder keine Projekte ab Planung |
| Energiebeschaffung für die Gemeinde | Vergaberecht! Die Angebotsanfrage ersetzt kein Vergabeverfahren (nur Markterkundung) |

## Recht kurz

Nicht öffentliche Projektangaben nur im Rahmen gesetzlicher Pflichten weitergeben (Nutzungsbedingungen § 12 Abs. 3).
