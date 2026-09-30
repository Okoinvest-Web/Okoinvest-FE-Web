# Backoffice-Handbuch: Projektleitung

Stand: 30.09.2026 · Unterrolle `projektleitung` (Entwicklung schreiben, CRM/Aufgaben schreiben, Kernbereiche lesen, Grundbuch schreiben, Finanzierung/Closing lesen) · Desk „ÖkoInvest Projektleitung“ · Demo: `bo-projektleitung@example.com`

## Tagesroutine

| Wann | Was | Wo |
|---|---|---|
| Morgens | Verzugsliste, Fristen 30 Tage, eingereichte Gutachten | `/portal/admin/entwicklung` |
| | Rückfragen von Gutachtern und Eigentümern | Benachrichtigungen, Nachrichten |
| Laufend | Meilensteine aktualisieren (Ist-Termine), Dokumente mit Pflichtkennzeichen hochladen | `/portal/admin/entwicklung/[id]` |
| Wöchentlich | Risiken (Matrix 5×5), Entscheidungen, Kosten Budget vs. Ist, Behörden-Kontakte | Reiter Risiken/Entscheidungen/Kosten/Behörden |
| Monatlich | Portfolio: MWp je COD-Jahr vs. Ziel (rund 50 MWp/Jahr), Auslastung je Projektleitung | Portfolio-Kennzahlen |
| Wöchentlich | Projektampel, Optionsfristen, Dokumentenlücken, Aufgaben aus fälligen Meilensteinen | `/portal/admin/entwicklung/steuerung` |
| An jedem Gate | Entscheidungsvorlage anlegen und einreichen (Gate 1 Entwicklungsfreigabe, Gate 2 Genehmigung, Gate 3 Baureife & Verwertung, SPV, Budget, Abbruch) | Projekt → Reiter „Steuerung & Vorlagen“ |

## Ablauf: Fläche → Baureife → Börse oder Bau

1. **Neues Projekt aus Fläche** (`/portal/admin/entwicklung/neu`): Vorlage je Land × Typ (Freifläche, Agri-PV, Carport, Speicher) erzeugt Meilensteine mit Abhängigkeiten.
2. **Plan:** Soll-Termine, kritischer Pfad (Puffer ≤ 0), Gantt (Zoom Monat/Quartal/Jahr, Tasten `+`/`−`). „Plan neu berechnen“ mit Prognose.
3. **Flächensicherung:** Projektflächen mit Pachtstatus (angefragt → Verhandlung → Option → Pachtvertrag); Grundbuch-Akte anstoßen.
4. **Netz:** Netzanfrage (DE § 8 EEG), Netzzusage, Netzverträglichkeit.
5. **Genehmigung:** Vorgespräch Gemeinde, Aufstellungsbeschluss, frühzeitige Beteiligung, Offenlage, Satzungsbeschluss (DE) bzw. Umwidmung (AT) / Nutzungsplanung (CH).
6. **Gutachten:** Gutachter einladen (E-Mail, Meilensteine auswählen; Link 14 Tage). Eingereichte Gutachten prüfen → „erledigt“ (nur mit Pflichtdokument oder begründetem Verzicht ≥ 10 Zeichen).
7. **Co-Development** (optional): Freigabe je Investor/Organisation – nur externe Risiken und freigegebene Dokumente. Vorher KYC des Investors prüfen.
8. **Übergabe:**
   - **Börse** (Build-to-Sell): legt Projekt als Entwurf an → Transaktion.
   - **Bau** (ab Phase RTB, Recht Anlagen): legt Anlage „Im Bau“ an → Betrieb.
   - **Eigenbetrieb:** Finanzierungsfall mit Leitung/Buchhaltung.
9. Eigentümer sehen nur vereinfachte Meilensteine (externer Titel, Quartal) – Titel verständlich formulieren.

## Steuerung und Entscheidungsvorlagen

- **Projektampel** (Termine, Kosten, Risiken, Flächensicherung, Dokumente): rot = sofort handeln, gelb = beobachten; die Begründung steht neben der Ampel. Ohne Budget ist die Kosten-Ampel grau – Budget über eine Gate-Vorlage freigeben lassen.
- **Risikoregister**: Schadenshöhe (€), Restrisiko nach Maßnahme und nächste Überprüfung pflegen; die erwarteten Risikokosten fließen in Vorlage und Pipeline-Bericht.
- **Flächensicherung**: je Fläche Grundbuch-Stand (beantragt, Rang gesichert/vorgemerkt, eingetragen) und bei Optionsverträgen die Ausübungsfrist; 14 Tage vorher entsteht automatisch eine Aufgabe.
- **Vorlage**: Beschlussvorschlag und Sachverhalt ausformulieren, Budget bzw. empfohlene Verwertung angeben, einreichen. Beim Einreichen werden Kennzahlen, Ampel, Termine, Risiken und (bei Verwertung) der Geschäftsmodell-Vergleich eingefroren; danach ist die Vorlage unveränderlich. Entscheidung durch die Leitung, nie durch den Einreicher. Nach Genehmigung: Budgetposition, Eintrag im Entscheidungsprotokoll, Folgeaufgabe.
- **Verwertung**: Eigenbetrieb (Bankfinanzierung → Finanzierungsfall), Verkauf (Projektbörse → Übergabe Börse) oder Bau für Investor (Forward-Verkauf mit EPC durch die Gruppe). Eine SPV wird über die Vorlage „Gründung Projektgesellschaft“ und den Gründungsassistenten angelegt.

## Tastenkürzel

Portfolio `v` (Liste/Kanban/Karte) · Gantt `+`/`−` · `/` Suche · `n` neu · `g t` Aufgaben.

## Typische Fehler

| Fehler | Richtig |
|---|---|
| Meilenstein erledigt ohne Vorgänger | blockiert (409) |
| Pflichtdokument fehlt | hochladen oder Verzicht begründen (422) |
| Vorlage ohne Beschlussvorschlag/Sachverhalt/Budget eingereicht | blockiert (422) – Pflichtangaben ergänzen |
| Grundbuch „vorgemerkt“ ohne Options-/Pachtvertrag | blockiert (409) – erst Vertragsstatus setzen |
| Abhängigkeit im Kreis | blockiert (409) |
| Interne Titel für Eigentümer sichtbar | „externer Titel“ pflegen |
| Übergabe an Börse doppelt | blockiert (409) |
| Kampfmittel-/Baugrund-Gutachten vergessen | Vorlage enthält sie – nicht auf „entfällt“ setzen ohne Begründung |
