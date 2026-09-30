# Backoffice-Handbuch: Compliance

Stand: 30.09.2026 · Unterrolle `compliance` (KYC/KYB prüfen, Unterlagen einsehen, Sanktionsabgleich, Risiko, Bonität, Register, Protokolle) · Desk „ÖkoInvest Compliance“ · Demo: `bo-compliance@example.com`, `bo-compliance2@example.com` (Vier-Augen)

## Tagesroutine

| Wann | Was | Wo |
|---|---|---|
| Morgens | Warteschlange: eingereicht, Treffer, fällig (Ausweis-Ablauf, Wiederholungsprüfung) | `/portal/admin/compliance` |
| | Freigabe-Sperren: Wer wartet auf Datenraum/LOI/Gebot/Zuschlag/Auszahlung? | Kennzahlen im Compliance-Cockpit |
| Laufend | Fälle prüfen, Zweitfreigaben (Vier-Augen) | `/portal/admin/compliance/[id]` |
| | Bonitätsauskünfte vor LOI | `/portal/admin/bonitaet` |
| Wöchentlich | Datenschutzanfragen (Auskunft, Löschung, Widerspruch/Sperrliste), Revisionsprotokoll | Vorgänge Typ „kontakt“/„Datenschutz“, `/portal/admin/protokoll` |
| Bei neuem Listenstand | Sanktionsliste importieren → Neuabgleich | Einstellungen / Importbefehl (`docs/PLATTFORM.md`) |

## Ablauf: KYC/KYB-Fall

1. **Übernehmen.** Status `eingereicht → in_pruefung`.
2. **Prüfliste je Unterlage:** Ausweis (gültig, Kopie als Kopie erkennbar, nicht benötigte Angaben geschwärzt – Ausweisnummer, Behörde, Gültigkeit bleiben lesbar), Registerauszug ≤ 92 Tage (ggf. „Registerauszug abrufen“ – Abrufdatum wird hinterlegt), Transparenz-/WiEReG-Auszug, wirtschaftlich Berechtigte ≥ 25 % bzw. Kontrolle (sonst fiktiver wB), Vertreter und Vollmacht, Mittelherkunft (ab 1 Mio. € oder hohem Risiko mit Nachweis), IBAN-Inhaber = verifizierte Person/Firma, Eigentumsnachweis je Fläche.
3. **Externe Ergebnisse** (Online-Identifizierung, MRZ-Vorprüfung) sind **Hinweise** – nie automatische Entscheidung.
4. **Sanktionstreffer** bewerten: `ausgeschlossen` oder `bestaetigt` mit Begründung (≥ 10 Zeichen). Treffer werden dem Nutzer nie angezeigt (erscheint als „in Prüfung“). Kein Tipping-off.
5. **Risiko** (Regelvorschlag, manuell überschreibbar mit Begründung).
6. **Entscheidung:** `verifiziert` / `nachgefordert` (mit Liste) / `abgelehnt` (mit Grund). Bei Risiko hoch, nach ausgeschlossenem Treffer oder per Einstellung → `zweitpruefung` durch eine **andere** Person.
7. Nach Verifizierung: nächste Prüfung nach 36/24/12 Monaten (Risiko niedrig/mittel/hoch). Ende der Geschäftsbeziehung eintragen → Löschung ab 01.01. des sechsten Jahres.

## Ablauf: Bonitätsauskunft

Anlass (LOI, verbindliches Gebot, Vertrag mit Ausfallrisiko) dokumentieren → Betroffenen **vorab informieren** (ohne Ergebnis) → Auskunft beauftragen → Ampel prüfen → **Freigabe oder Ablehnung mit Begründung durch einen Menschen** (kein Automatismus allein nach Score, Art. 22 DSGVO) → Stellungnahme des Betroffenen ermöglichen.

## Ablauf: Datenschutzanfragen

Identität plausibilisieren → Auskunft (Datenexport im Profil als Basis, Dritte maskiert) binnen eines Monats → Löschung = Anonymisierung + Sperre (Aufbewahrungspflichten beachten) → Widerspruch gegen Akquise-Brief: **sofort Sperrvermerk** im CRM, Bestätigung an die Person.

## Ablauf: Betroffenenanfrage (DSGVO) mit Frist

`/portal/admin/compliance/datenschutz` → **Anfrage erfassen** (Art, Eingang, Kanal, Person; Konto per Kennung oder E-Mail). Frist: 1 Monat ab Eingang (Art. 12 Abs. 3 DSGVO), Schweiz 30 Tage; Ampel ≤ 7 Tage gelb, überschritten rot; Aufgabe 7 Tage vor Fristende.
1. **Identität** bestätigen (Notiz, wie plausibilisiert) oder Nachweis anfordern.
2. Auskunft/Übertragbarkeit: **Datenexport (JSON)** erzeugen, prüfen (Dritte maskiert), übermitteln – erst danach „Erledigen“.
3. Löschung: Aufbewahrungspflichten prüfen → **Anonymisieren** (Bestätigung „LÖSCHEN“) oder Ergebnis „gesperrt“ bzw. „keine Daten“.
4. Verlängerung um 2 Monate nur einmal und innerhalb der ersten Frist, mit Begründung (Person wird informiert). Ablehnung nur mit Begründung; Antwortentwurf enthält den Hinweis auf das Beschwerderecht.

Auf derselben Seite: **Verzeichnis der Verarbeitungstätigkeiten** (CSV/JSON, Entwurf zur Prüfung durch die/den Datenschutzbeauftragte/n), **Löschkonzept** mit Fristen-Lauf, **SLA der KYC-Warteschlange** (KYC 3, KYB 5, Zweitprüfung 2 Werktage; Badge in der Warteschlange).

## Ablauf: Geldwäsche-Verdacht (intern)

Jede Backoffice-Rolle gibt Hinweise vertraulich unter `/portal/admin/hinweis` (sieht die Akte danach nicht). Compliance bearbeitet unter `/portal/admin/compliance/gwg`: **Prüfung übernehmen** → **Meldung erforderlich** oder **Keine Meldung** (Begründung, Vier-Augen: nicht die erfassende Person) → nach manueller Meldung über goAML **Meldung abgegeben** mit Aktenzeichen und Datum → **Abschließen** (Aufbewahrung 5 Jahre, CH 10). Die Plattform versendet nichts an Behörden; keine Information an die betroffene Person.

## Typische Fehler

| Fehler | Richtig |
|---|---|
| Zweitfreigabe durch Erstprüfer | System blockiert (409) – andere Person |
| Unterlagen per E-Mail angenommen | nur verschlüsselt im Portal hochladen lassen |
| Treffer dem Kunden erklärt | nie – nur „in Prüfung“ bzw. Nachforderung |
| Bonitätsabfrage ohne Anlass | unzulässig – nur bei konkreter Vertragsanbahnung |
| Registerauszug zu alt | ≤ 92 Tage, sonst nachfordern |

## Rechtsrahmen (Orientierung, keine Rechtsberatung)

DE §§ 10–12 GwG (Identifizierung, wB), § 8 GwG (Aufzeichnung 5 Jahre), § 43 GwG (Verdachtsmeldung), § 47 GwG (kein Tipping-off); AT §§ 365m1 ff. GewO, WiEReG; CH GwG; AMLR ab 10.07.2027. Ob ÖkoInvest Verpflichtete ist, ist **offen** – die Plattform ist für die vollen Sorgfaltspflichten gebaut.
