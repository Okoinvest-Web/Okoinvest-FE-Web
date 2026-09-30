# Backoffice-Handbuch: Energie

Stand: 30.09.2026 · Unterrolle `energie` (Handelsdesk, Terminkurve, Pool-Portfolio, Kundenanalyse, Ausschreibungen, Lieferantenstamm) · Desk „ÖkoInvest Energie“ · Demo: `bo-energie@example.com`

Fachgrundlage: `docs/ENERGIEBESCHAFFUNG.md`.

## Tagesroutine

| Wann | Was | Wo |
|---|---|---|
| 09:00 | Spot DE-LU/AT (Day-Ahead, 15-min), Tages-/Monatsmittel Base/Peak, negative Stunden, Spread AT−DE | `/portal/admin/energie?tab=uebersicht` |
| | Terminkurve Cal/Q/M einspielen (nur lizenzierte Quelle, **Quelle + Handelstag Pflicht**) | `?tab=termin` |
| Vormittag | Fristen-Alarme (90/60/30/14/7 Tage vor Kündigungsstichtag), Wechselanalyse-Empfehlungen | `/portal/admin/energie/kunden` |
| Laufend | Ausschreibungen: Fragen beantworten, Erinnerung 48 h vor Frist, Rundenende auswerten | `/portal/admin/energie/ausschreibungen` |
| Wöchentlich | Pool-Portfolio: Bedarf je Quartal, Tranchen, Hedge-Quote, Mark-to-Market, Risiko | `?tab=portfolio` |

## Ablauf: Kunde → Zuschlag → Lieferbeginn

1. **Kunde qualifizieren:** Vorgang „reststrom“ bzw. Lastgang-Analyse des Kunden (`/portal/energie`), Abnahmestellen und Vertrag vollständig (Kündigungsfrist!).
2. **Vollmacht** aktiv? (Klick-Zustimmung; optional „Zur elektronischen Unterschrift senden“). Servicevertrag bestätigt.
3. **Wechselanalyse:** ausschreiben / abwarten / verlängern – Begründung dem Kunden zeigen.
4. **Ausschreibung anlegen:** ein Kunde oder Pool, Zone, Lieferbeginn, Produkte (Festpreis, Tranchen, Spot; Laufzeit; grün), mindestens **2 Versorger**, Bestpreis-Regel, Schalter „Öffentlicher Auftraggeber“ bei Kommunen, Frist.
5. **Einladen:** Portal-Konto oder E-Mail-Link; Los ist anonym (gerundete Kennzahlen, normiertes Profil – keine Namen/Orte/IDs/Zeitreihe).
6. **Runde auswerten:** normierter Vergleich (Festpreis = Menge × Arbeitspreis; Spot/Tranchen = Menge × lastgewichteter Terminpreis + Aufschlag; + Grundpreis + HKN), Sensitivität. Ggf. **Runde 2** nur mit Bietern mit Angebot, Hinweis ohne Namen.
7. **Zuschlagsvorschlag** mit Begründung → **Freigabe aller Kunden** des Loses → Zuschlag (KYB des Versorgers), Zuschlagsschreiben, Absagen, Verträge, Aufgabe „Lieferantenwechsel einleiten“.
8. Nachlauf: Vertrag beim Kunden hinterlegt, Tranchen buchen, Wechselanalyse läuft wöchentlich weiter.

## Lieferantenstamm

Stammdaten DE/AT, Ansprechpartner, Bewertung (Reaktionszeit, Vollständigkeit, Umsetzung), Teilnahmehistorie, KYB-Status, Einladungen. Bewertungen sachlich formulieren (Auskunftsrecht!).

## Typische Fehler

| Fehler | Richtig |
|---|---|
| EEX-Werte ohne Lizenz/Quelle | nur lizenzierter Feed oder zitierter Schlusskurs mit Quelle |
| Kunde ohne Vollmacht in Ausschreibung | blockiert (409) |
| Kundendaten vor Zuschlag an Versorger | nie – erst nach Freigabe |
| Kommune wie Privatkunde behandelt | Vergaberecht: nur Markterkundung, Warnhinweis aktiv |
| Vorschlag vor Rundenende | blockiert (409) |
| Gesamtpreis mit Energiepreis verglichen | Preisart „gesamt“ setzen – feste Bestandteile werden abgezogen |
