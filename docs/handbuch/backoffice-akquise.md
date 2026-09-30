# Backoffice-Handbuch: Akquise

Stand: 30.09.2026 · Unterrolle `akquise` (Anfragen, Flächen-Pipeline, Gebiete, CRM, Aufgaben, Vorlagen, Akquise-Karte) · Desk „ÖkoInvest Akquise“ · Demo: `bo-akquise@example.com`

## Tagesroutine

| Wann | Was | Wo |
|---|---|---|
| 08:00 | Neue Anfragen triagieren (KI-Zusammenfassung „triage“ als Vorschlag), zuweisen, Eingang bestätigen – **SLA 2 Werktage** | `/portal/admin/vorgaenge` (`g v`), `/portal/admin/akquise` |
| 08:30 | Aufgaben und Wiedervorlagen des Tages | `/portal/admin/aufgaben` (`g t`) |
| Vormittag | Rückrufe, Besichtigungstermine, Pachtangebote vorbereiten | `/portal/admin/kalender`, `/portal/admin/flaechen` |
| Nachmittag | Akquise-Karte: neue Kandidaten im Gebiet, Übernahme als Ziel, Grundbuchabfragen, Anschreiben | `/portal/admin/akquise/karte` |
| Freitag | Pipeline-Hygiene (Kanban), CRM-Dubletten, Gebiete/Zuständigkeiten | `/portal/admin/flaechen`, `/portal/admin/crm/dubletten` |

## Ablauf A: Anfrage → Pachtvertrag (Freifläche / Agri-PV)

1. **Vorgang** `eingegangen → in_pruefung`: Daten prüfen, CRM-Kontakt ist automatisch angelegt (keine Dublette per E-Mail).
2. Priorität per Tasten `a`/`b`/`c` (Score A ≥ 65 Punkte und ≥ 5 ha), mit `j`/`k` durch die Liste.
3. Eigentümer zur Registrierung einladen bzw. Fläche im Namen erfassen; **Fläche** `eingegangen → vorpruefung`.
4. **Vorprüfung:** Kataster/Flurstücke, Widmung, Schutzgebiete, Netzentfernung (Steckbrief aus der Akquise-Karte nutzen). Ablehnen nur mit Grund.
5. **Standortanalyse:** Besichtigung (Termin mit ICS), Netzanfrage an Projektleitung übergeben, Landpacht/Förderbindungen klären.
6. **Pachtangebot** (Pflichtangaben: €/ha/Jahr 50–50.000, Laufzeit 1–60 Jahre; empfohlen: Indexierung, Reservierung, Nichtbau, Rückbau, Dienstbarkeit/Rang, Nebenflächen, Anwaltskosten, Gültigkeit) → Eigentümer sieht den Angebotsbogen.
7. **Vertrag:** Eigentümer nimmt an; Pachtvertrag (Muster) + ggf. Pacht-Absichtserklärung zur elektronischen Unterschrift; **Grundbuch-Akte** anlegen (Dienstbarkeit).
8. Übergabe an **Projektleitung** („Neues Projekt aus Fläche“) und an **Buchhaltung** (Pachtvertrag in Finanzen).

## Ablauf B: Aktive Akquise über die Karte (Österreich zuerst)

1. Filter setzen (Mindestgröße, max. Trasse, Score, Bundesland/Bezirk/Gemeinde); Umkreis-Suche um ein Umspannwerk mit freier Kapazität.
2. Steckbrief prüfen (K.-o.-Gründe, Widmungsregel des Landes, Anschlusskosten-Spanne).
3. **Als Akquise-Ziel übernehmen** → Fläche (Entwurf, Tag „Geodaten“) + Aufgabe „Eigentümer ermitteln (Grundbuchabfrage)“ (5 Tage).
4. **Grundbuchabfrage nur nach Grundstück** (KG + Grundstücksnummer/EZ), über Verrechnungsstelle, Zweck protokollieren. Nie nach Personen suchen.
5. **Sperrliste prüfen**, dann **ein Brief** mit Vorlage (Art.-14-Information, Herkunft Grundbuch, Widerspruchshinweis). Kein Anruf/E-Mail/SMS ohne Einwilligung.
6. Keine Reaktion → keine weitere Zusendung; Löschung nach 12 Monaten. Widerspruch → **sofort Sperrvermerk im CRM**.
7. Rückmeldung mit Interesse → weiter wie Ablauf A.

## Ablauf C: Dach-Contracting (Dachgeber = Kunde)

Anfrage `/dachflaeche-verpachten` → Dachdaten (Asbest, Statik, Brandwände) prüfen → Angebot Contracting/Dachpacht mit Vertrieb → Dachnutzungsvertrag + Grundbuch-Akte (Dienstbarkeit/Servitut) → Übergabe an Betrieb (Anlage anlegen) und Buchhaltung.

## Ablauf E: Pachtakte nach Vertragsschluss (`/portal/admin/pachtakten`)

1. Neue Anliegen der Eigentümer (Kündigung, Eigentümerwechsel, Erbfall, Zahlungsaufteilung, Verlängerung) erscheinen als Aufgabe (Ziel 14 Tage) und in der Arbeitsliste, sortiert nach Bearbeitungsziel.
2. „Bearbeitung beginnen“ → Unterlagen prüfen (Grundbuchauszug, Übergabe-/Kaufvertrag, Erbnachweis je Land) → bei Bedarf „Rückfrage stellen“ (Text Pflicht).
3. „Erledigen“ wirkt sofort: Kündigung → Vertrag gekündigt zum Datum; Eigentümerwechsel/Erbfall → in der **Akte** das neue Konto wählen, Vertrag und Fläche gehen über (Gutschriften ab dann an dieses Konto, Auszahlung erst nach dessen KYC). Nie ohne geprüften Nachweis übertragen.
4. Rückbau: erst nach Kündigung bzw. in den letzten 24 Monaten ankündigen (Termin), „Zur Abnahme melden“ – der Eigentümer bestätigt oder meldet Mängel. Sicherheit erst nach Abnahme freigeben, danach „Pachtvertrag beenden“ (Löschungsbewilligung dokumentieren).
5. Agri-PV-Nachweise prüfen (66 %-Regel, Flächenverlust) und bestätigen oder Rückfrage stellen.

## Ablauf D: Kommune

Strukturierte Anfrage → CRM-Organisation → **Berechtigung unabhängig bestätigen** (Rückruf über die Gemeindeverwaltung) → Rolle `kommune` freischalten → Gemeindetermin.

## Tastenkürzel

`g v` Vorgänge · `g t` Aufgaben · `g f` Flächen · Akquise-Liste `j`/`k`/`a`/`b`/`c` · Karte `/` Suche, `m` Messen · CRM `/` Suche, `n` neu · Kalender `←`/`→`/`t`.

## Typische Fehler

| Fehler | Richtig |
|---|---|
| Grundbuchsuche nach Namen | nur nach Grundstück (§ 5 Abs. 4 GUG) |
| Zweites Anschreiben ohne Reaktion | unzulässig – einmalig |
| Telefonische Kaltakquise bei Eigentümern | nur mit vorheriger Einwilligung (§ 174 TKG 2021) |
| Widerspruch nur als Notiz | Sperrvermerk setzen, sonst erneute Ansprache |
| Pachtangebot ohne Rückbau/Nichtbau-Regel | Ampel rot im Bogen, Eigentümer springt ab |
| Fläche ohne Eigentümerkonto übersehen | Filter „ohne Eigentümer“ nach Karten-Übernahmen nutzen |
