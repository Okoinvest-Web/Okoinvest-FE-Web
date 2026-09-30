# Handbuch: Energieversorger / Lieferant

Stand: 30.09.2026 · Rolle `lieferant` (nur per Einladung) · Demo: `lieferant@example.com` … `lieferant6@example.com`

**Worum es geht:** Sie geben verdeckte Angebote für die Stromlieferung an Unternehmen ab, die ÖkoInvest (einzeln oder im Pool) beauftragt haben.

## Auf einen Blick

| Menü | Wofür |
|---|---|
| Angebotsanfragen (`/portal/ausschreibungen`) | eingeladene Lose, Fristen, eigene Angebote, Ergebnis |
| Anfrage (`/portal/ausschreibungen/[id]`) | anonymes Profil, Preisblatt, Fragen, Zuschlagsschreiben |
| Verifizierung | Firmenprüfung (KYB) – Voraussetzung für Angebot und Zuschlag |

## Schritt für Schritt

1. **Einladung annehmen** (`/einladung/lieferant/[token]`) oder Angebotslink aus der E-Mail nutzen; die E-Mail-Adresse muss zur Einladung passen.
2. **Teilnahmebedingungen** lesen (`/bedingungen/lieferanten`).
3. **Los prüfen:** Los-Kennzeichen, Jahresmenge (gerundet), Lastspitze, normiertes Wochenprofil, Monatsanteile, Land/Gebotszone, Spannungsebene, Messart, Produkte (Festpreis, Tranchen, Spot-Index), Lieferzeitraum.
4. **Fragen** über das Portal stellen – Antworten gehen anonymisiert an alle Bieter.
5. **Preisblatt ausfüllen:** Arbeitspreis bzw. Aufschlag, Grundpreis, HKN, Mengentoleranz, **Bindefrist**, Zahlungsziel, Sicherheit; Abweichungen ausdrücklich nennen.
6. **Abgeben.** Bis Fristende beliebig oft aktualisierbar (neue Version, die letzte zählt) oder zurückziehbar. Danach gesperrt.
7. **Folgerunde:** ggf. Einladung mit Hinweis (Rang, Abstand oder Bestpreis – nie Namen).
8. **Ergebnis:** Zuschlag erst nach Kundenfreigabe → Zuschlagsschreiben und **Vertragsdatenblatt** (Firma, Ansprechpartner, Abnahmestellen mit MaLo/MeLo bzw. Zählpunkt, Menge, Konditionen; auch als PDF) direkt in der Anfrage; sonst Absage. Jeder Abruf der Kundendaten wird protokolliert; die Daten sind zweckgebunden.
9. **Lieferantenwechsel:** In der Anfrage bestätigen Sie „Liefervertrag bereitgestellt“, „Anmeldung beim Netzbetreiber“ und „Belieferung begonnen“ (optional mit Bemerkung, z. B. Vertragsnummer). Kunde und ÖkoInvest bestätigen ihre Schritte selbst; Sie werden benachrichtigt.

## Typische Fehler

| Problem | Lösung |
|---|---|
| Angebot abgelehnt (409) | Frist abgelaufen oder nicht für die Runde zugelassen |
| Angebot gesperrt „Verifizierung“ | KYB abschließen |
| Keine Kundendaten nach Angebot | Normal – erst nach Zuschlag |
| Einladung ungültig | Link abgelaufen/genutzt oder andere E-Mail angemeldet |

## Regeln kurz

Verdeckt, gleichbehandelt, Daten nur für dieses Angebot, keine Re-Identifizierung, keine Absprachen mit anderen Versorgern, Bindefrist ist verbindlich.
