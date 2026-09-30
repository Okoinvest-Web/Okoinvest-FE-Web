# Handbuch: Flächen- und Dacheigentümer, Landwirte

Stand: 30.09.2026 · Rollen `flaeche` und `landwirt` · Demo: `flaeche@example.com`, `landwirt@example.com`

**Worum es geht:** Sie stellen eine Fläche (Freifläche, Agri-PV) oder ein Dach zur Verfügung. ÖkoInvest prüft, macht ein Pachtangebot, entwickelt das Projekt und zahlt die Pacht. Für Sie ist die Plattform kostenfrei.

## Auf einen Blick

| Menü | Wofür |
|---|---|
| Übersicht | Stand aller Flächen, offene Aufgaben, Checkliste „Erste Schritte“ |
| Flächen (`/portal/flaechen`) | Fläche anlegen, einreichen, Status verfolgen, Pachtangebot ansehen und annehmen |
| Projektentwicklung (`/portal/entwicklung`) | „Wo steht mein Projekt?“ – vereinfachte Meilensteine bis zur Inbetriebnahme |
| Grundbuch (`/portal/grundbuch`) | Dienstbarkeit: jeder Schritt mit „Was bedeutet das für Sie?“ |
| Abrechnungen (`/portal/abrechnungen`) | Pacht-Gutschriften, Jahresübersicht, Indexierung, nächste Zahlung |
| Unterschriften (`/portal/signatur`) | Dokumente elektronisch unterschreiben |
| Verifizierung (`/portal/verifizierung`) | Identität, Bankverbindung, Eigentumsnachweis – Voraussetzung für Auszahlungen |
| Termine, Nachrichten, Dokumente, Support | Besichtigung buchen, Rückfragen, Unterlagen |

## Erste Schritte

1. Anfrage über `/flaechencheck` bzw. `/flaeche-verpachten` stellen **oder** direkt registrieren (`/registrieren?rolle=flaeche` bzw. `landwirt`). Mit derselben E-Mail wird die frühere Anfrage automatisch zugeordnet, sobald die Adresse bestätigt ist.
2. Geführten Einstieg durchlaufen (`/portal/willkommen`): Profil → erste Fläche → E-Mail-Benachrichtigungen.
3. Unter **Sicherheit** die Zwei-Faktor-Anmeldung einrichten (empfohlen).

## Fläche anlegen und einreichen (`n` oder „Fläche anlegen“)

1. **Grunddaten:** Bezeichnung, Land, PLZ, Ort, Größe in ha, Nutzung (Acker, Grünland, Dauerkultur, Brache, Deponie, Dach …).
2. **Flurstücke je Land:**
   - DE: Gemarkung, Flur (in Bayern leer lassen), Flurstücksnummer, Grundbuchbezirk/-blatt.
   - AT: KG-Nummer (5-stellig), Grundstücksnummer (Bauflächen mit Punkt, z. B. `.123`), EZ.
   - CH: Parzelle und E-GRID.
   Die Summe darf die Katasterfläche nicht um mehr als 10 % übersteigen (sonst Einreichen gesperrt); bei Teilflächen Hinweis setzen.
3. **Eigentum:** Alleineigentum, Miteigentum, Erbengemeinschaft, Gesellschaft – bei mehreren Eigentümern ist „Wer unterschreibt“ Pflicht; eine Vollmacht wird in der Checkliste angefordert.
4. **Belastungen:** Grundschulden, Nießbrauch, Vormerkungen (DE Abt. II/III, AT C-Blatt). Grundschulden sind kein Ausschluss – die Bank muss später einen Rangrücktritt erklären.
5. **Bewirtschaftung und Förderung:** Laufende Pacht (Pächter, Ende, Kündigungsfrist – Pflicht bei „verpachtet“), GAP, AUKM/ÖPUL/BFF mit Ende.
6. **Agri-PV (nur bei Interesse):** Kategorie nach DIN SPEC 91434, Kultur (Pflicht), Arbeitsbreite, Durchfahrtshöhe, Referenzertrag.
7. **Dach:** Dachart, Asbest (Pflicht), Nutzer, Alter, Statik-Reserve, Brandwände. Asbestzement kann nicht belegt werden.
8. **Einreichen.** Status wechselt von „Entwurf“ auf „Eingegangen“.

## Statusfolge Ihrer Fläche

`Entwurf → Eingegangen → Vorprüfung → Standortanalyse → Pachtangebot → Vertrag → Planung → Bau → Betrieb`
Unter dem Stepper erklärt die Plattform je Status und Land, was passiert und wie lange es erfahrungsgemäß dauert (keine Zusage).

## Pachtangebot prüfen und annehmen

1. Im Status **Pachtangebot** öffnet sich der **Angebotsbogen**: Pacht (fest, indexiert oder Umsatzbeteiligung mit Mindestpacht), Reservierungsprämie, Laufzeit und Verlängerung, späteste Frist bis Baubeginn, Nichtbau-Regel, Rückbausicherheit, Dienstbarkeit und Rang, Nebenflächen, Anwaltskosten, Steuerhinweis, Gültigkeit.
2. Jede Zeile hat eine Ampel; „nicht geregelt“ ist markiert. Nutzen Sie die **Fragenliste** für das Gespräch mit Ihrem Anwalt oder Steuerberater.
3. Rückfragen über „Nachrichten“ zur Fläche. Angebot annehmen → Status „Vertrag“. Der eigentliche Pachtvertrag wird gesondert unterzeichnet; eine Pacht-Absichtserklärung kann elektronisch unterschrieben werden.

## Dienstbarkeit im Grundbuch (`/portal/grundbuch`)

Banken verlangen, dass das Nutzungsrecht im Grundbuch steht – vor Grundschulden. Die Akte zeigt die Schritte je Land (z. B. DE: Vertrag → Unterschrift → **notarielle Beglaubigung** → Rangrücktritt der Bank → Antrag → Eintragung). Die elektronische Unterschrift ersetzt die Beglaubigung **nicht** – dafür gibt es einen Notartermin. Nach der Eintragung finden Sie den Grundbuchauszug in der Akte.

## Pacht erhalten (`/portal/abrechnungen`)

1. **Verifizierung abschließen:** Ausweis, Bankverbindung (IBAN), Eigentumsnachweis für die Fläche. Ohne Verifizierung werden Gutschriften erstellt, aber nicht ausgezahlt (Hinweis im Portal).
2. Gutschriften erscheinen je Periode mit PDF. Indexierung wird zum 1.1. mit dem Jahresdurchschnitt des Vorjahres angepasst und erklärt.

## Typische Fehler

| Problem | Lösung |
|---|---|
| „Einreichen“ gesperrt | Pflichtfelder rot markiert; häufig: Flurstücksformat, Größe > 110 % Kataster, Vertretung bei Miteigentum fehlt |
| Flurstück in Bayern mit Flur | Feld „Flur“ leer lassen |
| Keine Auszahlung trotz Gutschrift | Verifizierung unvollständig oder IBAN-Inhaber ≠ verifizierte Person |
| Unterschrift nicht möglich | Sie sind noch nicht an der Reihe (feste Reihenfolge) oder der Code ist abgelaufen (10 Minuten) – neuen Code anfordern |
| Anfrage nicht im Konto | E-Mail-Adresse noch nicht bestätigt |

## Recht und Datenschutz kurz

- Kostenfrei für Eigentümer. Steuerliche Folgen (Einkommen-, Grund-, Erbschaftsteuer) mit Ihrer Steuerberatung klären – die Hinweise im Portal sind vorsichtige Orientierung.
- Wurden Sie per Brief angeschrieben, stammen Ihre Daten aus dem Grundbuch; Sie können jederzeit widersprechen (Datenschutzerklärung, Abschnitt 8f).
- Dokumente mit Daten Dritter (z. B. Miterben) nur mit deren Einverständnis hochladen.
