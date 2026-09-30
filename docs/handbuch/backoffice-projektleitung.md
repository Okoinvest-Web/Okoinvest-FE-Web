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

## Tastenkürzel

Portfolio `v` (Liste/Kanban/Karte) · Gantt `+`/`−` · `/` Suche · `n` neu · `g t` Aufgaben.

## Typische Fehler

| Fehler | Richtig |
|---|---|
| Meilenstein erledigt ohne Vorgänger | blockiert (409) |
| Pflichtdokument fehlt | hochladen oder Verzicht begründen (422) |
| Abhängigkeit im Kreis | blockiert (409) |
| Interne Titel für Eigentümer sichtbar | „externer Titel“ pflegen |
| Übergabe an Börse doppelt | blockiert (409) |
| Kampfmittel-/Baugrund-Gutachten vergessen | Vorlage enthält sie – nicht auf „entfällt“ setzen ohne Begründung |
