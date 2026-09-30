# Handbuch: Bank / Finanzierungspartner

Stand: 30.09.2026 · Rolle `bank` (nur per Einladung) · Demo: `bank@example.com`

**Worum es geht:** ÖkoInvest bzw. eine Projektgesellschaft fragt eine Finanzierung für ein eigenes Projekt (Eigenbetrieb) an. Sie prüfen das freigegebene Bankenpaket und geben ein Term Sheet ab – oder sagen ab.

## Auf einen Blick

| Menü | Wofür |
|---|---|
| Finanzierungsanfragen (`/portal/bank`) | nur Anfragen Ihres Hauses, Frist, Status |
| Anfrage (`/portal/bank/[id]`) | freigegebene Bausteine (Steckbrief, Financial Model PDF/CSV, Ertragsgutachten, Verträge …), Rückfrage, Term Sheet, Absage |

## Schritt für Schritt

1. **Einladung** per E-Mail mit persönlichem Link (14 Tage) → `/einladung/bank/[token]`, Anmeldung mit der eingeladenen E-Mail.
2. **Vertraulichkeitsbedingungen** lesen (`/bedingungen/banken`) – sie gelten mit dem ersten Abruf.
3. **Bankenpaket prüfen:** Bausteine erscheinen erst nach Freigabe; jeder Abruf wird protokolliert.
4. **Rückfragen** stellen (Portal). Antworten erscheinen in der Anfrage.
5. **Term Sheet abgeben:** Betrag, Tenor, Zins/Marge, Tilgung (skulptiert/annuitätisch), DSCR-Sizing P50/P90, Covenants (Lock-up/Default), DSRA, Gebühren, Sicherheiten, CPs, Gültigkeit. Oder **Absage** mit Grund.
6. **Nach Entscheidung** (durch die Leitung von ÖkoInvest): Kreditvertrag, CPs, Covenant-Reporting (DSCR rollierend 12 Monate aus den Zählerwerten, LLCR, Ampel) als PDF.

## Typische Fehler

| Problem | Lösung |
|---|---|
| Anfrage nicht sichtbar | Konto nicht Ihrem Haus zugeordnet – ÖkoInvest informieren |
| Baustein fehlt | noch nicht freigegeben – Rückfrage stellen |
| Link abgelaufen | neue Einladung anfordern |

## Pflichten kurz

Zweckbindung, Weitergabe nur an Gremien/Berater/Refinanzierer nach Zustimmung, keine Entfernung von Kennzeichnungen, Löschung nach Ende soweit zulässig (Nutzungsbedingungen § 12 Abs. 2, `/bedingungen/banken`). Personenbezogene Daten Dritter im Paket (z. B. Flächeneigentümer) nur für die Kreditentscheidung und Besicherung verwenden.
