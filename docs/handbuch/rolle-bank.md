# Handbuch: Bank / Finanzierungspartner

Stand: 01.10.2026 · Rolle `bank` (nur per Einladung) · Demo: `bank@example.com` (Leitung) und `bank-sachbearbeitung@example.com` (Sachbearbeitung), beide „Demo Regionalbank eG (fiktiv)“

**Worum es geht:** ÖkoInvest bzw. eine Projektgesellschaft fragt eine Finanzierung für ein eigenes Projekt (Eigenbetrieb) an. Sie prüfen das freigegebene Bankenpaket, fordern fehlende Unterlagen an, stellen Fragen und geben ein indikatives Term Sheet ab – und begleiten nach der Auswahl Kreditentscheidung, Auszahlung und Monitoring.

## Auf einen Blick

| Menü | Wofür |
|---|---|
| Finanzierungsanfragen (`/portal/bank`) | alle Anfragen Ihres Hauses mit Frist, Status, Zuständigkeit und offenen Punkten |
| Anfrage (`/portal/bank/[id]`) | Bankenpaket, angeforderte Unterlagen, Fragen & Antworten, Term Sheet, nach Auswahl: Kreditentscheidung, Kreditvertrag, CPs, Auszahlungen, Monitoring, Berichte |
| Team (`/portal/bank/team`) | Mitglieder Ihres Hauses, Rollen, Einladungen |

## Rollen im Team

| Rolle | Darf |
|---|---|
| Leitung / Kreditentscheidung | alles der Sachbearbeitung, dazu Kreditentscheidung, Auszahlungsfreigabe, Absage, Team verwalten |
| Sachbearbeitung | Unterlagen anfordern und prüfen, Fragen stellen, Term Sheet abgeben, CPs bestätigen, Berichte anfordern und prüfen, Zuständigkeit setzen |
| Nur lesen | sieht Anfragen und freigegebene Unterlagen (z. B. Marktfolge, Revision) |

Die erste Person, die eine Einladung von ÖkoInvest annimmt, hat die Rolle Leitung. Die Leitung lädt Kolleginnen und Kollegen mit Adressen derselben E-Mail-Domain ein (Link 7 Tage gültig, nur mit der eingeladenen Adresse). Mindestens eine Person behält die Leitung; entfernte Mitglieder verlieren den Zugang sofort.

## Schritt für Schritt

1. **Einladung** per E-Mail mit persönlichem Link (14 Tage) → `/einladung/bank/[token]`, Anmeldung mit der eingeladenen E-Mail.
2. **Vertraulichkeitsbedingungen** lesen (`/bedingungen/banken`) – sie gelten mit dem ersten Abruf.
3. **Bankenpaket prüfen:** Bausteine erscheinen erst nach Freigabe; jeder Abruf wird protokolliert.
4. **Unterlagen anfordern:** Checkliste mit Frist je Punkt, optional einem Baustein des Bankenpakets zugeordnet. ÖkoInvest liefert (Datei, Antwort oder Freigabe des Bausteins); Sie akzeptieren oder fordern mit neuer Frist nach.
5. **Fragen stellen** nach Kategorie (Technik/Ertrag, Recht, Kommerziell, Steuern). Antworten mit Anlagen erscheinen in der Anfrage.
6. **Term Sheet abgeben:** Betrag, Tenor, Zins/Marge, Tilgung (skulptiert/annuitätisch), DSCR-Sizing P50/P90, Covenants (Lock-up/Default), DSRA, Gebühren, Sicherheiten, CPs, Gültigkeit. Oder **Absage** mit Grund (Leitung).
7. **Nach der Auswahl durch ÖkoInvest:** Kreditentscheidung Ihres Gremiums melden (genehmigt, mit Auflagen, abgelehnt; Betrag höchstens 10 % über dem Term Sheet, sonst neues Term Sheet), Kreditvertrag einsehen, **Auszahlungsvoraussetzungen (CPs) bestätigen oder beanstanden** – eine Bestätigung verfällt, wenn ÖkoInvest den Punkt erneut ändert.
8. **Auszahlungen:** ÖkoInvest beantragt Ziehungen erst, wenn alle CPs erfüllt und von Ihnen bestätigt sind; die Leitung gibt frei, danach melden Sie die Auszahlung mit Valuta. Die Summe bleibt auf den Kreditbetrag begrenzt.
9. **Monitoring:** Covenant-Stand (DSCR rollierend 12 Monate aus den Zählerwerten, LLCR, Ampel) laufend einsehen; Berichte anfordern (Covenant-Report, Ertrag, Jahresabschluss, Betriebsbericht, Versicherungsnachweis) mit Fälligkeit, eingereichte Berichte prüfen oder beanstanden. Covenant-Reports stehen als PDF (Momentaufnahme bei Einreichung) bereit.

## Typische Fehler

| Problem | Lösung |
|---|---|
| Anfrage nicht sichtbar | Konto nicht Ihrem Haus zugeordnet – Leitung Ihres Hauses bzw. ÖkoInvest informieren |
| Knopf fehlt / „Rolle nötig“ | Ihre Teamrolle reicht nicht (z. B. Kreditentscheidung nur Leitung) |
| Baustein fehlt | noch nicht freigegeben – als Unterlage mit Frist anfordern |
| Kreditentscheidung nicht möglich | ÖkoInvest hat noch nicht ausgewählt oder der Kreditvertrag ist bereits erfasst |
| Link abgelaufen | neue Einladung anfordern |

## Pflichten kurz

Zweckbindung, Weitergabe nur an Gremien/Berater/Refinanzierer nach Zustimmung, keine Entfernung von Kennzeichnungen, Löschung nach Ende soweit zulässig (Nutzungsbedingungen § 12 Abs. 2, `/bedingungen/banken`). Personenbezogene Daten Dritter im Paket (z. B. Flächeneigentümer) nur für die Kreditentscheidung und Besicherung verwenden.
