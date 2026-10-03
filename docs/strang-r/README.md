# Strang R – Rechtstexte (ENTWÜRFE zur anwaltlichen Prüfung)

> **ENTWURF – KEINE RECHTSBERATUNG, KEINE FREIGABE.**
> Diese Texte hat ein KI-Agententeam als Arbeitsgrundlage für die Anwältinnen und Anwälte in DE, AT und CH geschrieben.
> Sie sind weder geprüft noch verbindlich. Sie dürfen erst live gehen, wenn je Land eine **schriftliche Freigabe** vorliegt
> (Masterplan, Abschnitt 11, Strang R). Bis dahin bleiben die Live-Seiten auf `noindex` und die Website ist nicht öffentlich.

Stand der Entwürfe: 3. Oktober 2026 · Grundlage: `docs/MASTERPLAN-DACH.md` (Abschnitte 3, 5, 8, 10, 11) und die Expertenbefunde
`claude-browser/armee/experten/` (Rechtsabteilung, Datenschutz, Compliance Officer, Recht & Compliance, Team Schweiz).

## Inhalt

| Datei | Zweck | Ersetzt später |
|---|---|---|
| `PRUEFPUNKTE-ANWALT.md` | **Alle Prüfpunkte** (P-01 …) mit Land, Fundstelle im Entwurf und Frage an die Kanzlei | – |
| `ZUSTIMMUNGSPROTOKOLL.md` | Fachvorgabe: Fassung und Zeitpunkt jeder Zustimmung speichern (Registrierung, Bedingungen, Einwilligungen) | Code-Paket (nicht Strang R) |
| `datenschutz/00-kern.md` | Datenschutzerklärung, gemeinsamer Kern (DSGVO, Verantwortlicher in AT) | `src/app/datenschutz/page.js` |
| `datenschutz/10-land-de.md` | Zusatz für Personen in Deutschland (TDDDG, BDSG, UWG, GBV) | Abschnitt „Deutschland“ |
| `datenschutz/20-land-at.md` | Zusatz für Personen in Österreich (DSG, TKG 2021) | Abschnitt „Österreich“ |
| `datenschutz/30-land-ch.md` | Zusatz für Personen in der Schweiz (revDSG, FMG, UWG-CH) | Abschnitt „Schweiz“ |
| `nutzungsbedingungen/00-kern.md` | Nutzungsbedingungen, gemeinsamer Kern | `src/app/nutzungsbedingungen/page.js` |
| `nutzungsbedingungen/10-land-de.md` / `20-land-at.md` / `30-land-ch.md` | Länderteil: Rechtswahl, Gerichtsstand, Verbraucherregeln | Anhang je Land |
| `bedingungen/projektboerse.md` | Besondere Bedingungen Projektbörse (mit Länderhinweisen Maklerrecht) | `src/app/bedingungen/projektboerse/page.js` |
| `bedingungen/energiebeschaffung.md` | Servicevertrag Energiebeschaffung | `src/app/bedingungen/energiebeschaffung/page.js` |
| `bedingungen/lieferanten.md` | Teilnahmebedingungen Energieversorger | `src/app/bedingungen/lieferanten/page.js` |
| `bedingungen/banken.md` | Vertraulichkeitsbedingungen Banken | `src/app/bedingungen/banken/page.js` |
| `hinweisgeber/hinweisgeber.md` | Neue Seite `/hinweisgeber` mit internen und externen Meldestellen je Land | neu `src/app/hinweisgeber/page.js` |
| `hinweisgeber/datenschutzhinweis-meldekanal.md` | Eigener Datenschutzhinweis für den Meldekanal | Unterseite bzw. Abschnitt |

## Aufbau „Kern plus Land“

Die ÖkoInvest GmbH sitzt in Österreich. Der **Kern** gilt deshalb für alle; er folgt der DSGVO bzw. dem österreichischen Vertragsrecht.
Wo das Recht im Land der Nutzerin oder des Nutzers abweicht, steht das im **Länderteil**. Die Website zeigt später den Kern und den
Länderteil, der zum Land im Konto bzw. zur Länderseite (`/de`, `/at`, `/ch`, ab Welle 2) passt. Bis zur Länderstruktur (Welle 2)
können alle drei Länderteile untereinander auf einer Seite stehen.

## Platzhalter-Regeln

| Markierung | Bedeutung | Wer füllt |
|---|---|---|
| `[[INHABER: …]]` | Angabe fehlt oder ist nicht freigegeben (Kontakt, Dienstleister, Fristen, Beträge) | Inhaber bzw. Betrieb |
| `[[PRÜFEN P-xx: …]]` | Rechtsfrage offen; Nummer verweist auf `PRUEFPUNKTE-ANWALT.md` | Kanzlei |
| `[[TECHNIK: …]]` | Aussage stimmt nur, wenn der Code so umgesetzt ist; vor Freigabe mit dem Ist-Stand abgleichen | Entwicklung |

**Kontaktdaten:** Telefon, Funktionspostfach und UID sind laut Auftrag **noch nicht freigegeben**. Sie stehen deshalb überall als
`[[INHABER: …]]`. Hinweis: `src/data/site.js` enthält bereits Werte mit dem Kommentar „vom Inhaber freigegeben (Oktober 2026)“.
Das widerspricht dem Auftrag an Strang R; der Inhaber muss das klären (siehe P-01).

**Registerangaben** (Firma, Sitz, FN, Gericht, Geschäftsführung) sind aus `src/data/site.js` übernommen. Sie sind vor der Freigabe am
aktuellen Firmenbuchauszug zu prüfen (P-02).

## Wesentliche Änderungen gegenüber den Live-Seiten

1. **Entwurfsstatus ehrlich:** Jeder Text trägt den Entwurfshinweis. Die Datenschutzerklärung hat heute kein Banner und steht auf `index`.
2. **Platzhalter geschlossen oder benannt:** keine rohen `<mark>`-Texte mehr; jede offene Angabe ist `[[INHABER]]` oder `[[PRÜFEN]]`.
3. **Länderrecht:** § 25 TDDDG (DE), § 165 Abs. 3 TKG 2021 (AT), Art. 45c FMG und revDSG (CH) ergänzt.
4. **KI-Assistent:** falsche Aussagen korrigiert (Verarbeitungsort nicht nur USA; Freitexte können Kontaktdaten enthalten).
   Der KI-Modus mit personenbezogenen Daten **bleibt aus**, bis AVV und Drittlandgrundlage stehen (Masterplan S0 Nr. 5).
5. **Anfragen:** Hinweis statt Pflicht-„Einwilligung“ (lit. b); Rückruf, Werbeanruf, Newsletter und Partner getrennt (passt zu
   `src/lib/anfrage/hinweise.js`, Paket C).
6. **Nutzungsbedingungen:** § 20 (Zustimmungsfiktion) und § 16 Abs. 3 (pauschaler Haftungsausschluss) **gestrichen und neu gefasst**;
   Verbraucher und Unternehmer getrennt; Gerichtsstand und Rechtswahl je Land.
7. **Zustimmungsprotokoll:** Fassung, Hash und Zeitpunkt werden gespeichert (Vorgabe in `ZUSTIMMUNGSPROTOKOLL.md`).
8. **Hinweisgeber-Seite neu**, mit externen Meldestellen DE/AT und Lage CH. Das Portal-Menü „Hinweis an Compliance“
   soll „GwG-Verdacht melden“ heißen, damit es nicht mit dem Hinweisgebersystem verwechselt wird (Code-Änderung, nicht Strang R).

## Geprüfte Primärquellen (Abruf 3. Oktober 2026)

- § 25 TDDDG: https://www.gesetze-im-internet.de/ttdsg/__25.html
- § 7a UWG (DE, 5 Jahre Nachweis Telefon-Einwilligung): https://www.gesetze-im-internet.de/uwg_2004/__7a.html
- § 43a GBV (Grundbucheinsicht Solar ab 750 kW): https://www.gesetze-im-internet.de/gbvfg/__43a.html
- HinSchG §§ 7, 11 Abs. 5, 12, 17, 19, 21: https://www.gesetze-im-internet.de/hinschg/
- § 165 Abs. 3 und § 174 TKG 2021 (AT): https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20011678&Paragraf=174
- HSchG (AT) §§ 8 Abs. 11, 9, 11, 15: https://ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20012184
- BKA-Seite HSchG, externe Stelle BAK: https://www.bundeskanzleramt.gv.at/themen/compliance/hinweisgeberinnenschutzgesetz.html
- EDÖB, Vertretung nach Art. 14 DSG: https://www.edoeb.admin.ch/de/vertretung-nach-artikel-14-dsg · Kontakt: https://www.edoeb.admin.ch/de/kontakt
- Art. 19 DSG (Sekundärquelle mit Wortlaut, Fedlex war nicht abrufbar): https://dsg.ch/kapitel03/artikel19/
- Datenschutzbehörde AT, Kontakt: https://www.dsb.gv.at/kontakt

**Nicht am Original geprüft** (in den Texten als `[[PRÜFEN]]` markiert): Fedlex-Wortlaute (DSG, OR, UWG-CH, FMG), MaklerG,
KSchG, BGB-Verbrauchernormen ab 19.06.2026, KI-VO Art. 50, DPF-Status einzelner Anbieter, § 22 HinSchG.
