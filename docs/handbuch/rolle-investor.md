# Handbuch: Investor

Stand: 30.09.2026 · Rolle `investor` · Demo: `investor@example.com` (Organisation „Demo Capital GmbH (fiktiv)“)

**Worum es geht:** Projekte in allen Phasen finden, prüfen, bewerten, finanzieren und kaufen – vertraulich und strukturiert. Für Investoren ist die Plattform kostenfrei.

## Auf einen Blick

| Menü | Wofür |
|---|---|
| Projektbörse (`/portal/boerse`) | Liste/Tabelle/Karte, Filter, Merken, Vergleich (2–4 Projekte) |
| Deal-Pipeline (`/portal/pipeline`) | Kanban Ihrer Deals, Notizen, Tags, bis zu 8 Suchprofile, Kennzahlen |
| Deal-Room (`/portal/dealroom/[id]`) | Datenraum, Fragen & Antworten, Bieterverfahren |
| Finanzierungscockpit (`/portal/finanzierung`) | IRR, NPV, LCOE, DSCR; sieben Finanzierungsvarianten; Förder-Check |
| Deal-Abschluss (`/portal/closing`) | Closing-Raum nach Zuschlag bzw. angenommener LOI |
| Portfolio (`/portal/portfolio`) | Gekaufte Anlagen und Beteiligungen: Ertrag Soll/Ist, Ausschüttungen, Kapitalabrufe, Covenants, Berichte, Steuerunterlagen, Wiederverkauf |
| Profil & Suchprofil | Investorentyp, Regionen, Rendite-Ziel, Struktur, ESG, Datenraum-Mindestqualität |
| Verifizierung | KYC/KYB – Voraussetzung für Datenraum, LOI, Gebote |

## Erste Schritte

1. Registrieren (`/registrieren?rolle=investor`), Organisation anlegen und Kollegen einladen (`/portal/organisation`, Teamrollen Inhaber/Admin/Mitglied/Nur lesen).
2. **Suchprofil** pflegen – ab einem Passungswert (Standard 70) melden wir neue Projekte per Glocke und E-Mail (ohne vertrauliche Angaben).
3. **Verifizierung** früh starten (Firma, Registerauszug ≤ 92 Tage, wirtschaftlich Berechtigte, Vertreter, Ticketgröße und Mittelherkunft; Nachweis ab 1 Mio. € oder hohem Risiko). Ohne Verifizierung bleibt der Datenraum gesperrt.

## Ablauf vom Fund bis zum Kauf

1. **Finden:** Börse filtern (`/` für Suche), Karte umschalten, Projekt merken, Vergleich öffnen.
2. **NDA:** Im Exposé „Vertraulichkeitsvereinbarung abschließen“ (Klick-NDA oder elektronische Unterschrift). Das Backoffice gibt frei → Datenraum **Stufe 1**.
3. **Prüfen:** Datenblatt (Technik, Ertrag P50/P75/P90, Netz, Genehmigung, Fläche, Vermarktung, Transaktion), **Due-Diligence-Index** mit Ampel je Bereich, Unterlagen im Datenraum. „Frag das Projekt“ (KI) antwortet nur aus freigegebenen Daten mit Quellen – verbindliche Klärung über **Fragen & Antworten**.
4. **Bewerten:** `/portal/boerse/[id]/bewertung` – Vorbelegung aus dem Datenblatt, Kaufpreis → Rendite, maximaler Preis bei Ziel-IRR, Fremdkapital auf P90. Szenarien speichern; Finanzierungsvarianten im Cockpit (`?projekt=`).
5. **LOI:** Strukturierte Absichtserklärung (Preisbasis €/kWp oder gesamt bzw. EV, Asset/Share Deal, Zahlung/Earn-out, Bedingungen, Finanzierung, Exklusivität, Gültigkeit ≤ 12 Monate). Ggf. Bonitätsprüfung vorher – Sie werden informiert. Nach LOI: Datenraum **Stufe 2**.
6. **Bieterverfahren** (falls gestartet): Gebot je Runde, verdeckt; Aktualisieren erzeugt eine neue Version; nach Fristende gesperrt. Verbindliche Runden verlangen Finanzierung und Zeitplan.
7. **Zuschlag / LOI angenommen** → Projekt reserviert → **Closing-Raum**: Signing-Checkliste (KYC beider Seiten, Finanzierungsnachweis, Gremien, DD, SPA), Bedingungen (CPs) mit Nachweis melden, Notartermin (.ics), Kaufpreiszahlung (Treuhand optional), Übergabe-Checkliste.

## Nach dem Kauf: Portfolio

1. **Übernahme:** Nach dem Closing erscheint die Position automatisch im Portfolio („Übernahme läuft“). Sobald die Übergabe-Checkliste im Closing-Raum vollständig ist, wechselt sie auf „In Betrieb“ (Bestand) bzw. „Im Bau“ (Projektkauf).
2. **Ertrag Soll/Ist:** Monatlich meldet die Betriebsführung die Erzeugung. Soll ist der P50-Wert, verteilt auf die Monate und um die Degradation bereinigt. Ampel: bis −5 % grün, bis −10 % gelb, darunter rot.
3. **Covenants:** Bei Bankfinanzierung sehen Sie den DSCR der letzten 12 Monate. Unter der Lock-up-Grenze sind Ausschüttungen nach üblichen Kreditverträgen gesperrt (nur mit Zustimmung der Bank).
4. **Ausschüttungen:** Jede Buchung (Gewinnausschüttung, Entnahme, Zinsen/Tilgung Gesellschafterdarlehen, Kapitalrückzahlung, Verkaufserlös) meldet Ihnen die Glocke; bei Gewinnausschüttungen steht ein Hinweis zur Quellensteuer (DE KapESt + Soli, AT KESt, CH Verrechnungssteuer).
5. **Kapitalabrufe (Co-Development, Projektkauf mit Zusage):** Abruf mit Betrag, Zweck und Frist (mindestens 10 Tage). Nach der Überweisung „Zahlung angewiesen“ klicken; ÖkoInvest bestätigt den Eingang. Erinnerung drei Tage vor Fälligkeit, Hinweis bei Verzug.
6. **Berichte:** Quartals- und Jahresbericht als PDF (Ertrag, Covenants, Ausschüttungen, Kapitalabrufe, Kapitalfluss mit DPI). Der Jahresbericht enthält Steuerhinweise und die Liste der üblichen Unterlagen (Jahresabschluss, Steuerbescheinigung der Gesellschaft, Feststellungsmitteilung bei Personengesellschaften).
7. **Dokumente:** Jahresabschlüsse, Steuerbescheinigungen und Verträge stellt ÖkoInvest je Position bereit; jeder Abruf wird protokolliert.
8. **Wiederverkauf:** „Wiederverkauf über die Börse anfragen“ (Preisvorstellung optional, Zeitpunkt, Share/Asset Deal, Anteil). ÖkoInvest legt den Börsen-Entwurf mit Ihnen als Anbieter an; Sie nehmen die Verkäuferprovision im Portfolio an, danach folgen Prüfung und Veröffentlichung wie bei jedem Projekt.

Teamrolle „Nur lesen“ sieht alles, kann aber keine Zahlung melden und keinen Wiederverkauf anfragen.

## Regeln im Deal-Room (wichtig)

- Sie erscheinen für den Anbieter als Pseudonym („Investor A“), der Anbieter für Sie als „Anbieter“ – bis zur Kontaktfreigabe. **Keine** Kontaktdaten, Links oder Namen in Fragen und Geboten (werden entfernt).
- Exposé-PDF und Downloads tragen Ihren Namen und das Datum; jeder Abruf wird protokolliert.
- Umgehungsschutz: Kontakte aus der Plattform nicht zur Umgehung nutzen (24 Monate, Nutzungsbedingungen § 17).

## Tastenkürzel

`g b` Börse · `/` Suche · `n` neues Suchprofil (je nach Seite) · `?` alle Kürzel · in der Pipeline Karten per Ziehen verschieben.

## Typische Fehler

| Problem | Lösung |
|---|---|
| „Um den Datenraum zu öffnen, bitte Verifizierung abschließen“ (409) | KYC/KYB einreichen; Status unter „Verifizierung“ |
| LOI abgelehnt „Bonität erforderlich“ | Backoffice holt eine Auskunft ein – Finanzierungsnachweis beilegen beschleunigt |
| Gebot nicht möglich | Nicht zur Runde zugelassen oder Frist abgelaufen |
| Stufe-2-Dokumente gesperrt | Erst nach LOI bzw. Zulassung zur verbindlichen Runde |
| Kollege sieht Deal nicht | Objekt gehört Ihrem Konto statt der Organisation – unter „Organisation“ übernehmen |
| Position fehlt im Portfolio | Erscheint nach vollzogenem Closing; Co-Development-Beteiligungen legt ÖkoInvest nach Unterzeichnung an |
| „Zahlung angewiesen“ nicht möglich | Abruf ist bereits gemeldet/bezahlt oder Ihre Teamrolle ist „Nur lesen“ |

## Recht kurz

Bewertungen und Rechner sind Orientierung, keine Anlage-, Steuer- oder Rechtsberatung; eigene Due Diligence mit Beratern bleibt nötig. Der Kaufvertrag kommt nur zwischen Ihnen und dem Anbieter zustande, beim Anteilskauf in notarieller Form (DE/AT).
