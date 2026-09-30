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
